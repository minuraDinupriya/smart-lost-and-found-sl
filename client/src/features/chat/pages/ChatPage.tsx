import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { Send, FileText, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ItemLinkPreview from '../components/ItemLinkPreview';

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

const ChatPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const initChat = async () => {
      try {
        // Fetch Item data containing the original createdBy poster ID
        const itemRes = await api.get(`/items/${itemId}`);
        const posterId = itemRes.data.createdBy._id || itemRes.data.createdBy;
        setReceiverId(posterId);

        // Fetch historical logs from MongoDB
        const msgRes = await api.get(`/messages/${itemId}`);
        const fetchedMessages = msgRes.data;
        setMessages(fetchedMessages);

        // Dynamically determine the correct receiverId!
        // If we have chat history, find the OTHER user involved in this conversation
        let computedReceiverId = posterId;
        if (user && fetchedMessages.length > 0) {
           const relevantMsg = fetchedMessages.find((m: any) => m.senderId === user._id || m.receiverId === user._id);
           if (relevantMsg) {
             computedReceiverId = relevantMsg.senderId === user._id ? relevantMsg.receiverId : relevantMsg.senderId;
           }
        }
        setReceiverId(computedReceiverId);
      } catch (error) {
        console.error("Failed to load chat data", error);
      } finally {
        setLoading(false);
      }
    };
    if (itemId) initChat();
  }, [itemId]);

  // Hook into WebSocket Real-Time Broadcasts
  useEffect(() => {
    if (socket && itemId) {
      // Fire immediately (will buffer if not connected)
      socket.emit('join_room', itemId);

      // Crucial: Re-join room automatically if socket drops and reconnects
      const onConnect = () => socket.emit('join_room', itemId);
      socket.on('connect', onConnect);

      socket.on('receive_message', (newMessage: Message) => {
        setMessages((prev) => {
          // Prevent duplicates by checking if message already exists
          if (prev.some(msg => msg._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
      });

      return () => {
        socket.off('connect', onConnect);
        socket.off('receive_message');
      };
    }
  }, [socket, itemId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && socket && itemId && receiverId) {
      const messageData = {
        itemId,
        receiverId,
        text: inputText
      };
      
      // Dispatch securely over Socket connection
      socket.emit('send_message', messageData);
      setInputText('');
    }
  };

  const downloadPolicePDF = async () => {
    try {
      // Trigger express PDF generation endpoint returning a Blob
      const response = await api.get(`/items/${itemId}/download-pdf`, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Handover_Declaration_${itemId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Failed to download PDF", error);
    }
  };

  if (loading) return <div className="flex justify-center p-10 text-gray-500 font-medium">Initializing Secure Room...</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-10rem)]">
      {/* Header & Warning Context */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200">
             <AlertCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">Secure Negotiation Room</h2>
            <p className="text-xs text-gray-500 font-medium">Blind Claim Protocol Active - Verify ownership proof.</p>
          </div>
        </div>

        <button 
          onClick={downloadPolicePDF}
          className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm active:scale-95"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:block">Export Police PDF</span>
        </button>
      </div>

      {/* Message Feed Canvas */}
      <div className="flex-grow p-6 overflow-y-auto bg-[#F9FAFB]/60 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-20 text-sm font-medium">
            No messages yet. Send a message to initiate the claim!
          </div>
        ) : (
          messages.map((msg, index) => {
            // Correct alignment logic mapping for UI
            const alignRight = msg.senderId === user?._id; 
            
            // Detect Item Links (e.g., /items/6a1409a94e364baf912eb68b)
            const itemRegex = /\/items\/([a-fA-F0-9]{24})/;
            const match = msg.text.match(itemRegex);
            const extractedItemId = match ? match[1] : null;

            return (
              <motion.div 
                key={msg._id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-[75%] px-5 py-3.5 shadow-sm text-sm ${
                  alignRight 
                    ? 'bg-[#800000] text-white rounded-2xl rounded-br-sm' 
                    : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'
                }`}>
                  {/* Render Text */}
                  <span className="whitespace-pre-wrap">{msg.text}</span>
                  
                  {/* WhatsApp-style Rich Link Preview */}
                  {extractedItemId && (
                    <ItemLinkPreview itemId={extractedItemId} alignRight={alignRight} />
                  )}

                  <div className={`text-[10px] mt-1.5 text-right font-medium ${alignRight ? 'text-white/60' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Persistent Message Input Engine */}
      <div className="p-4 bg-white border-t border-gray-100 rounded-b-2xl">
        <form onSubmit={sendMessage} className="flex space-x-3 items-end">
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder="Type your message securely..."
            className="flex-grow resize-none rounded-xl border border-gray-200 px-5 py-3.5 text-sm focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none bg-gray-50 focus:bg-white transition-all shadow-inner"
            rows={2}
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-[#800000] text-white rounded-xl hover:bg-[#600000] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#800000]/20 flex items-center justify-center h-12 w-12 flex-shrink-0 active:scale-95"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
