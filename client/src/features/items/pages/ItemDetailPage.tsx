import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { Package, MapPin, Calendar, Tag, User, MessageCircle, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const ItemDetailPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, fetchMe } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await api.get(`/items/${itemId}`);
        setItem(res.data);
      } catch (error) {
        console.error('Failed to fetch item', error);
      } finally {
        setLoading(false);
      }
    };
    if (itemId) fetchItem();
  }, [itemId]);

  if (loading) {
    return <div className="flex justify-center p-20 text-gray-500 font-medium animate-pulse">Loading item details...</div>;
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Item Not Found</h2>
        <button onClick={() => navigate('/')} className="mt-4 text-[#800000] font-medium hover:underline">Return to Dashboard</button>
      </div>
    );
  }

  const isOwner = item.createdBy?._id === user?._id || item.createdBy === user?._id;
  const isFound = item.type === 'FOUND';
  const isSmartTag = item.type === 'SMART_TAG';

  const handleClaimOrChat = () => {
    if (isOwner) {
      navigate(`/edit/${item._id}`);
      return;
    }
    
    if (isFound) {
      Swal.fire({
        title: 'Initiate Blind Claim',
        text: 'To claim this found item, you must correctly answer the security question in the secure chat room.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#800000',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Proceed to Chat'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate(`/chat/${item._id}`);
        }
      });
    } else {
      navigate(`/chat/${item._id}`);
    }
  };

  const handleMarkAsClaimed = async () => {
    try {
      await api.put(`/items/${item._id}/claim`);
      // Update local state
      setItem((prev: any) => ({ ...prev, status: 'Claimed' }));
      
      if (item.type === 'FOUND') {
        Swal.fire({
          title: 'Thank You Hero!',
          text: 'You successfully returned this item and earned +50 Trust Score!',
          icon: 'success',
          confirmButtonColor: '#10b981'
        });
        fetchMe(); // Refresh Karma Points in Navbar
      } else {
        Swal.fire({
          title: 'Resolved!',
          text: 'This lost item has been marked as claimed.',
          icon: 'success',
          confirmButtonColor: '#800000'
        });
      }
    } catch (error: any) {
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'Failed to claim item.',
        icon: 'error'
      });
    }
  };

  const imgUrl = item.imageUrl 
    ? (item.imageUrl.startsWith('http') ? item.imageUrl : `http://localhost:5000/uploads/${item.imageUrl}`)
    : null;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header Image Area */}
      <div className="h-64 bg-gray-100 relative flex items-center justify-center overflow-hidden">
        {imgUrl ? (
          <img src={imgUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center text-gray-400">
            <Package className="w-16 h-16 mb-2 opacity-50" />
            <span className="font-medium">No Image Provided</span>
          </div>
        )}
        
        {/* Floating Badges */}
        <div className="absolute top-4 left-4 flex space-x-2">
          <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm tracking-wider ${isFound ? 'bg-emerald-100 text-emerald-800' : isSmartTag ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
            {isSmartTag ? 'SECURE SMART TAG' : item.type}
          </span>
          {!isSmartTag && (
            <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm bg-white/90 text-gray-700 backdrop-blur-sm">
              {item.status || 'Available'}
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{item.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-500">
              <span className="flex items-center"><Tag className="w-4 h-4 mr-1.5" /> {item.category}</span>
              {!isSmartTag && (
                <>
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {item.city}, {item.district}</span>
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {new Date(item.date).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="prose prose-sm sm:prose lg:prose-lg text-gray-700 mb-8 bg-gray-50 p-5 rounded-xl border border-gray-100">
          <p className="leading-relaxed whitespace-pre-wrap">{item.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm">
          <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
            <User className="w-5 h-5 text-gray-400 mr-3" />
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Owner / Poster</p>
              <p className="font-medium text-gray-900">{item.createdBy?.username || 'System User'}</p>
            </div>
          </div>
          {!isSmartTag && (
            <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
              <MessageCircle className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Contact</p>
                <p className="font-medium text-gray-900">{item.contactNumber}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex space-x-4 pt-4 border-t border-gray-100">
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all focus:outline-none focus:ring-4 focus:ring-gray-100"
          >
            Back
          </button>
          
          <button 
            onClick={handleClaimOrChat}
            className={`flex-grow px-6 py-3 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center focus:outline-none focus:ring-4 ${
              isSmartTag ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600/20 shadow-blue-600/20' : 'bg-[#800000] hover:bg-[#600000] focus:ring-[#800000]/20 shadow-[#800000]/20'
            }`}
          >
            {isOwner ? 'Edit Your Post' : (isSmartTag ? 'Scan Successful: Contact Owner' : (isFound ? 'I Have This Item' : 'I Found This Item'))}
          </button>

          {isOwner && item.status !== 'Claimed' && (
            <button 
              onClick={handleMarkAsClaimed}
              className="flex-grow px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-md shadow-emerald-500/20 flex items-center justify-center"
            >
              Mark as Claimed
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemDetailPage;
