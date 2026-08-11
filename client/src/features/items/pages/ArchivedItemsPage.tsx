import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Archive, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import PageNavigation from '../../../components/common/PageNavigation';
import ItemCard, { ItemProps } from '../components/ItemCard';

const ArchivedItemsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<ItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication protection
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const fetchArchivedItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/items/archived');
      setItems(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch archived items:', err);
      setError(err.response?.data?.message || 'Failed to retrieve archived items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchArchivedItems();
    }
  }, [user]);

  if (authLoading || (!user && loading)) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <PageNavigation />
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#800000] to-[#500000] rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <Archive className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 flex items-center">
            {t('nav.archivedItems')} <Archive className="ml-3 w-8 h-8 text-yellow-400" />
          </h1>
          <p className="text-red-100 text-lg leading-relaxed">
            Manage your posts that have expired or been automatically archived. Archived items are kept in a read-only state for your history, but can still be deleted if no longer needed.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        /* Loading Skeleton Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl h-[28rem] border border-gray-100 overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded-md w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded-md w-full"></div>
                <div className="h-4 bg-gray-200 rounded-md w-5/6"></div>
                <div className="pt-4 mt-auto">
                  <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="bg-white rounded-3xl p-10 text-center border border-red-100 shadow-sm max-w-lg mx-auto space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
          <h3 className="text-xl font-bold text-gray-900">Something Went Wrong</h3>
          <p className="text-gray-500">{error}</p>
          <button
            onClick={fetchArchivedItems}
            className="inline-flex items-center px-5 py-2.5 bg-[#800000] text-white font-bold rounded-xl hover:bg-[#600000] transition shadow-md shadow-[#800000]/20 whitespace-nowrap active:scale-95"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm max-w-lg mx-auto space-y-4">
          <Archive className="w-16 h-16 mx-auto text-gray-300" />
          <h3 className="text-xl font-bold text-gray-900">No Archived Items</h3>
          <p className="text-gray-500">
            You don't have any expired or auto-archived items at the moment. Active reports will appear here once they reach their expiration limit.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition active:scale-95 shadow-md"
          >
            Return to Dashboard
          </button>
        </div>
      ) : (
        /* Archived Items Grid */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {items.map((item) => (
            <div key={item._id}>
              <ItemCard item={item} />
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ArchivedItemsPage;
