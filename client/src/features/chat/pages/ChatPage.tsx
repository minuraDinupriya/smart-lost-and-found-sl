import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { Send, FileText, AlertCircle, ShieldCheck, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import ItemLinkPreview from '../components/ItemLinkPreview';
import HandoverBanner from '../components/HandoverBanner';
import PageNavigation from '../../../components/common/PageNavigation';
interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

const ChatPage: React.FC = () => {
  const { itemId, otherUserId } = useParams<{ itemId: string, otherUserId: string }>();
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Digital Proof of Ownership Claim States
  const [item, setItem] = useState<any>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationInputs, setVerificationInputs] = useState<Record<string, string>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const initChat = async () => {
      try {
        // Fetch Item data containing the original createdBy poster ID
        const itemRes = await api.get(`/items/${itemId}`);
        setItem(itemRes.data);
        const posterId = itemRes.data.createdBy._id || itemRes.data.createdBy;
        setReceiverId(posterId);

        // Fetch historical logs from MongoDB
        const msgRes = await api.get(`/messages/${itemId}/${otherUserId}`);
        const fetchedMessages = msgRes.data;
        setMessages(fetchedMessages);

        setReceiverId(otherUserId || null);
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
    if (socket && itemId && otherUserId && user) {
      // Create deterministic room ID sorting both user IDs so both users join the same channel
      const roomId = [user._id, otherUserId].sort().join('_') + '_' + itemId;
      
      // Fire immediately (will buffer if not connected)
      socket.emit('join_room', roomId);

      // Crucial: Re-join room automatically if socket drops and reconnects
      const onConnect = () => socket.emit('join_room', roomId);
      socket.on('connect', onConnect);

      socket.on('receive_message', (newMessage: Message) => {
        setMessages((prev) => {
          // Prevent duplicates or misdirected messages from other rooms
          if (newMessage.senderId !== otherUserId && newMessage.senderId !== user._id) return prev;
          if (newMessage.receiverId !== otherUserId && newMessage.receiverId !== user._id) return prev;
          if (prev.some(msg => msg._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
      });

      return () => {
        socket.off('connect', onConnect);
        socket.off('receive_message');
      };
    }
  }, [socket, itemId, otherUserId, user]);

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

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !item.ownershipProofs) return;
    
    setIsVerifying(true);
    try {
      const submittedProofs = item.ownershipProofs.map((p: any) => ({
        proofType: p.proofType,
        customLabel: p.customLabel,
        proofValue: verificationInputs[p._id] || ''
      }));

      const res = await api.post(`/items/${itemId}/verify-ownership`, { submittedProofs });
      
      const { overallStatus, scorePercentage, verifiedCount, totalProofs } = res.data;

      Swal.fire({
        title: overallStatus === 'VERIFIED' ? 'Verification Successful!' : overallStatus === 'PARTIALLY_VERIFIED' ? 'Partial Verification' : 'Verification Failed',
        text: `Match score: ${scorePercentage}% (${verifiedCount} of ${totalProofs} fields matched).`,
        icon: overallStatus === 'VERIFIED' ? 'success' : overallStatus === 'PARTIALLY_VERIFIED' ? 'warning' : 'error',
        confirmButtonColor: '#800000'
      });

      setIsVerificationModalOpen(false);
      setVerificationInputs({});
      
      // Re-fetch item data and messages
      const itemRes = await api.get(`/items/${itemId}`);
      setItem(itemRes.data);

      const msgRes = await api.get(`/messages/${itemId}`);
      setMessages(msgRes.data);
    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.message || 'Verification failed.', 'error');
    } finally {
      setIsVerifying(false);
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

  const isClaimant = item && (
    (item.type === 'LOST' && ((item.createdBy?._id || item.createdBy) === user?._id)) ||
    (item.type === 'FOUND' && ((item.createdBy?._id || item.createdBy) !== user?._id))
  );

  if (loading) return <div className="flex justify-center p-10 text-gray-500 font-medium">Initializing Secure Room...</div>;

  return (
    <>
    <PageNavigation />
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

      {/* Verification status banner */}
      {item && item.ownershipProofs && item.ownershipProofs.length > 0 && (
        <div className="bg-[#800000]/5 border-b border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div className="text-xs text-gray-700">
            <span className="font-bold uppercase text-[#800000] block mb-1">Digital Proof of Ownership:</span>
            This item has {item.ownershipProofs.length} private ownership proof fields registered.
            {item.verificationHistory && item.verificationHistory.length > 0 ? (
              <span className="text-gray-500 block mt-1">
                Last verification attempt: <strong className="text-[#800000]">{item.verificationHistory[item.verificationHistory.length - 1].overallStatus} ({item.verificationHistory[item.verificationHistory.length - 1].scorePercentage}% Match)</strong>
              </span>
            ) : (
              <span className="text-gray-500 block mt-1">No verification attempts have been made yet.</span>
            )}
          </div>
          {isClaimant && (
            <button
              onClick={() => setIsVerificationModalOpen(true)}
              className="bg-[#800000] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#600000] transition active:scale-95 shadow-sm"
            >
              Verify Ownership Proof
            </button>
          )}
        </div>
      )}

      {/* Handover Verification Engine */}
      {receiverId && itemId && (
        <HandoverBanner itemId={itemId} otherUserId={receiverId} />
      )}

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

      {/* Verification Modal */}
      {isVerificationModalOpen && item && item.ownershipProofs && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100"
          >
            <button 
              onClick={() => setIsVerificationModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-4">
              <div className="bg-[#800000]/10 p-2 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-[#800000]" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Verify Ownership</h3>
                <p className="text-xs text-gray-500">Provide details matching the registered proofs</p>
              </div>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3.5">
                {item.ownershipProofs.map((proof: any) => {
                  const label = proof.proofType === 'custom' 
                    ? proof.customLabel 
                    : proof.proofType.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase());
                  return (
                    <div key={proof._id} className="space-y-1">
                      <label className="block text-xs font-bold text-gray-700">{label}</label>
                      <input
                        required
                        type="text"
                        placeholder={`Enter ${label.toLowerCase()}...`}
                        value={verificationInputs[proof._id] || ''}
                        onChange={(e) => setVerificationInputs(prev => ({ ...prev, [proof._id]: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 px-4 py-2.5 bg-[#800000] text-white rounded-xl hover:bg-[#600000] transition text-sm font-semibold disabled:opacity-75"
                >
                  {isVerifying ? 'Verifying...' : 'Submit Proof'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
    </>
  );
};

export default ChatPage;
