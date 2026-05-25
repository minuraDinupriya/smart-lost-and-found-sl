import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, ImageOff, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

interface ThreadProps {
  _id: string;
  itemId: {
    _id: string;
    title: string;
    imageUrl: string;
    type: string;
  } | null;
  senderId: {
    _id: string;
    username: string;
  };
  receiverId: {
    _id: string;
    username: string;
  };
  text: string;
  createdAt: string;
}

const InboxPage: React.FC = () => {
  const [threads, setThreads] = useState<ThreadProps[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const response = await api.get('/messages/inbox');
        setThreads(response.data);
      } catch (error) {
        console.error("Failed to fetch inbox:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
  }, []);

  // Helper function to detect AI System Alerts
  const isSystemAlert = (text: string) => text.includes('🤖 AUTOMATIC SMART MATCH DETECTED');

  // Interactive Message Parser
  const renderMessageText = (text: string) => {
    const itemPathRegex = /\/items\/([a-zA-Z0-9_]+)/g;
    
    if (!itemPathRegex.test(text)) return text;
    
    const parts = text.split(itemPathRegex);
    const matches = text.match(itemPathRegex);
    
    return (
      <span className="block mt-2">
        {parts[0]}
        {matches && matches[0] && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // Extract ID from the /items/[ID] string and redirect to chat room
              const id = matches[0].split('/').pop();
              navigate(`/chat/${id}`);
            }}
            className="inline-flex items-center text-xs font-bold text-[#800000] bg-white px-3 py-1.5 rounded-lg shadow-sm border border-red-100 hover:bg-red-50 hover:shadow transition-all ml-1"
          >
            Review Match <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        )}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-[#800000]/10 rounded-2xl">
          <MessageSquare className="w-8 h-8 text-[#800000]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Active Inquiries</h1>
          <p className="text-slate-500">Manage your private negotiations and system alerts.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex p-4 bg-white rounded-2xl border border-slate-100 h-28">
              <div className="w-20 h-20 bg-slate-200 rounded-xl mr-4 flex-shrink-0"></div>
              <div className="flex-grow space-y-3 py-2">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Your inbox is empty</h3>
          <p className="text-slate-500">You don't have any active messages or system alerts yet.</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {threads.map((thread) => {
            const isAlert = isSystemAlert(thread.text);
            const otherUser = thread.senderId._id === user?._id ? thread.receiverId : thread.senderId;
            
            return (
              <div 
                key={thread._id}
                onClick={() => thread.itemId && navigate(`/chat/${thread.itemId._id}`)}
                className={`flex items-start p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isAlert 
                    ? 'bg-amber-50/60 border-l-4 border-amber-400 shadow-sm hover:bg-amber-50' 
                    : 'bg-white border border-slate-100 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Item Thumbnail */}
                <div className="w-20 h-20 bg-slate-100 rounded-xl mr-5 flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-200/60">
                  {thread.itemId && thread.itemId.imageUrl ? (
                    <img 
                      src={`http://localhost:5000/uploads/${thread.itemId.imageUrl}`} 
                      alt="Item Thumbnail" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageOff className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-900 text-lg">
                      {thread.itemId ? thread.itemId.title : 'Deleted Item'}
                    </h4>
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap ml-4">
                      {new Date(thread.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className="text-sm font-medium text-[#800000] mb-1.5 flex items-center">
                    {isAlert ? '🤖 SYSTEM_BOT' : `From: ${otherUser.username}`}
                  </div>

                  <p className={`text-sm leading-relaxed ${isAlert ? 'text-amber-900 font-medium' : 'text-slate-600 line-clamp-2'}`}>
                    {renderMessageText(thread.text)}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default InboxPage;
