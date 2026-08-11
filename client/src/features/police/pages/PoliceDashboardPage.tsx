import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Building, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import PageNavigation from '../../../components/common/PageNavigation';

interface Item {
  _id: string;
  title: string;
  category: string;
  date: string;
  status: string;
  createdBy: { username: string };
  createdAt: string;
  policeStationName?: string;
  verificationHistory?: {
    verifierId?: string;
    verifyingType?: string;
    overallStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'NOT_VERIFIED';
    scorePercentage: number;
    verifiedCount: number;
    totalProofs: number;
    timestamp: string;
  }[];
}

const PoliceDashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'police') {
        toast.error('Unauthorized Access');
        navigate('/');
        return;
      }
      fetchInventory();
    }
  }, [user, loading, navigate]);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/items/police-inventory');
      setItems(res.data.items);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      toast.error('Failed to load police inventory');
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await api.patch(`/items/${id}/police-resolve`);
      toast.success('Item marked as successfully resolved/claimed!');
      fetchInventory(); // Refresh list
    } catch (error) {
      console.error('Failed to resolve item:', error);
      toast.error('Failed to resolve item');
    }
  };

  if (loading || isLoadingItems) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageNavigation />
      <div className="bg-blue-900 rounded-2xl p-8 text-white shadow-xl mb-8 border border-blue-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <ShieldCheck className="w-64 h-64 -mt-10 -mr-10" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <Building className="w-8 h-8 text-blue-300" />
            <h1 className="text-3xl font-bold tracking-tight">National Police Dashboard</h1>
          </div>
          <p className="text-blue-100 text-lg max-w-2xl">
            Welcome to the official portal for the <span className="font-bold text-white">Sri Lanka Police Force</span>. 
            Here you can view and manage all physical items that citizens have dropped off at any station nationwide.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Current Station Inventory</h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
            {items.length} Items Registered
          </span>
        </div>
        
        {items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No items currently in inventory.</p>
            <p className="text-sm mt-1">Items that users physically hand over to your station will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                  <th className="p-4 font-semibold">Item Details</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Station Location</th>
                  <th className="p-4 font-semibold">Dropped Off By</th>
                  <th className="p-4 font-semibold">Digital Verification</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-900 dark:text-gray-100">{item.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Added: {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-md font-medium border border-gray-200 dark:border-slate-600">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100 font-bold flex items-center">
                        <Building className="w-4 h-4 mr-1.5 text-blue-600" />
                        {item.policeStationName || 'Unknown Station'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {item.createdBy.username}
                      </div>
                    </td>
                    <td className="p-4">
                      {item.verificationHistory && item.verificationHistory.length > 0 ? (
                        (() => {
                          const latest = item.verificationHistory[item.verificationHistory.length - 1];
                          let colorClass = 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-600';
                          if (latest.overallStatus === 'VERIFIED') {
                            colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                          } else if (latest.overallStatus === 'PARTIALLY_VERIFIED') {
                            colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
                          } else if (latest.overallStatus === 'NOT_VERIFIED') {
                            colorClass = 'text-rose-700 bg-rose-50 border-rose-200';
                          }
                          return (
                            <div className="flex flex-col">
                              <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${colorClass} w-fit`}>
                                {latest.overallStatus === 'VERIFIED' ? '✅ Verified' : latest.overallStatus === 'PARTIALLY_VERIFIED' ? '⚠️ Partial Match' : '❌ Failed'} ({latest.scorePercentage}%)
                              </span>
                              <span className="text-[10px] text-gray-400 mt-1">
                                {latest.verifiedCount} of {latest.totalProofs} fields matched
                              </span>
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">No Digital Claim</span>
                      )}
                    </td>
                    <td className="p-4">
                      {item.status === 'Claimed' ? (
                        <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Resolved (Returned)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          At Station
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {item.status !== 'Claimed' && (
                        <button
                          onClick={() => handleResolve(item._id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                        >
                          Mark as Returned
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoliceDashboardPage;
