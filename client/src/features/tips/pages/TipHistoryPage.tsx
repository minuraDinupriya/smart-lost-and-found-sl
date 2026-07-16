import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { Wallet, ArrowUpRight, ArrowDownLeft, Gift, Calendar, User, MessageCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const TipHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [sentTips, setSentTips] = useState<any[]>([]);
  const [receivedTips, setReceivedTips] = useState<any[]>([]);

  useEffect(() => {
    if (!user?._id) return;

    const fetchTipHistory = async () => {
      try {
        const res = await api.get(`/tips/user/${user._id}`);
        setSentTips(res.data.sent || []);
        setReceivedTips(res.data.received || []);
      } catch (err: any) {
        console.error('Failed to load tips history:', err);
        Swal.fire({
          title: 'Error',
          text: err.response?.data?.message || 'Failed to load tip history.',
          icon: 'error',
          confirmButtonColor: '#800000',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchTipHistory();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center p-20 text-gray-500 font-medium animate-pulse">Loading tip logs...</div>;
  }

  const currentTips = activeTab === 'sent' ? sentTips : receivedTips;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
            <Wallet className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reward Tip History</h1>
            <p className="text-gray-500 text-sm font-medium">View the record of monetary tips sent and received.</p>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="flex items-center space-x-6 text-sm bg-gray-50 border border-gray-100 px-5 py-3 rounded-2xl">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Sent</p>
            <p className="font-extrabold text-gray-900 mt-0.5">
              Rs. {sentTips.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
            </p>
          </div>
          <div className="border-l border-gray-200 h-8" />
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Received</p>
            <p className="font-extrabold text-emerald-600 mt-0.5">
              Rs. {receivedTips.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200/50 max-w-sm">
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-grow py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 focus:outline-none ${
            activeTab === 'sent'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-red-500" />
          <span>Tips Sent ({sentTips.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-grow py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 focus:outline-none ${
            activeTab === 'received'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-500 hover:text-emerald-600'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          <span>Tips Received ({receivedTips.length})</span>
        </button>
      </div>

      {/* List Feed */}
      <div className="space-y-4">
        {currentTips.length === 0 ? (
          <div className="text-center p-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No transactions found.</p>
            <p className="text-gray-400 text-xs mt-1">Tips sent or received will appear here after a successful payment verification.</p>
          </div>
        ) : (
          currentTips.map((tip) => {
            const item = tip.returnRecordId?.itemId;
            const targetUser = activeTab === 'sent' ? tip.finderId : tip.ownerId;
            const formattedDate = new Date(tip.createdAt).toLocaleDateString([], {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={tip._id}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:border-gray-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Left side details */}
                <div className="flex items-start space-x-4">
                  {item?.imageUrl ? (
                    <img
                      src={item.imageUrl.startsWith('http') ? item.imageUrl : `http://localhost:5000/uploads/${item.imageUrl}`}
                      alt={item.title}
                      className="w-14 h-14 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-base">{item?.title || 'Returned Item'}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        {formattedDate}
                      </span>
                      <span className="flex items-center">
                        <User className="w-3.5 h-3.5 mr-1" />
                        {activeTab === 'sent' ? 'To: ' : 'From: '}
                        <span className="font-bold text-gray-700">@{targetUser?.username}</span>
                      </span>
                    </div>
                    {tip.thankYouMessage && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-start max-w-lg mt-2">
                        <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="italic">"{tip.thankYouMessage}"</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side amount */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider md:hidden">Amount</span>
                  <div className="flex flex-col items-end">
                    <span className={`text-xl font-black ${activeTab === 'sent' ? 'text-gray-900' : 'text-emerald-600'}`}>
                      {activeTab === 'sent' ? '-' : '+'} Rs. {tip.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full mt-1 border border-emerald-100">
                      Paid
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TipHistoryPage;
