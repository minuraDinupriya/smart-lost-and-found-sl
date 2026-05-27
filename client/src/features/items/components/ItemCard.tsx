import React from 'react';
import { MapPin, Calendar, Phone, ShieldQuestion, ImageOff } from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

export interface ItemProps {
  _id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  imageUrl?: string;
  date: string;
  province: string;
  district: string;
  city: string;
  contactNumber: string;
  securityQuestion?: string;
  status: string;
  createdBy: any;
}

const ItemCard: React.FC<{ item: ItemProps }> = ({ item }) => {
  const isLost = item.type === 'LOST';
  const navigate = useNavigate();
  const { user, fetchMe } = useAuth();

  const createdById = typeof item.createdBy === 'object' ? item.createdBy?._id : item.createdBy;
  const isOwner = user?._id === createdById;

  const handleDelete = () => {
    Swal.fire({
      title: 'Delete Item?',
      text: 'Are you sure you want to permanently delete this report?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#800000',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/items/${item._id}`);
          Swal.fire('Deleted!', 'Your item has been removed from the national network.', 'success').then(() => {
            window.location.reload();
          });
        } catch (error: any) {
          Swal.fire('Error', error.response?.data?.message || 'Failed to delete item.', 'error');
        }
      }
    });
  };

  const handleClaimInitiation = () => {
    Swal.fire({
      title: 'Initiate Blind Claim',
      text: 'To claim this item, you must initiate verification to prove ownership. Do you wish to proceed?',
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#800000',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, proceed to verification',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Verification Room Initiated',
          text: 'You will now be connected to a secure Socket.io chat room to communicate with the poster.',
          icon: 'success',
          confirmButtonColor: '#800000'
        }).then(() => {
          navigate(`/chat/${item._id}`);
        });
      }
    });
  };

  const handleMarkAsClaimed = async () => {
    try {
      await api.put(`/items/${item._id}/claim`);
      
      if (item.type === 'FOUND') {
        Swal.fire({
          title: 'Thank You Hero!',
          text: 'You successfully returned this item and earned +50 Trust Score!',
          icon: 'success',
          confirmButtonColor: '#10b981'
        }).then(() => {
          fetchMe();
          window.location.reload();
        });
      } else {
        Swal.fire({
          title: 'Resolved!',
          text: 'This lost item has been marked as claimed.',
          icon: 'success',
          confirmButtonColor: '#800000'
        }).then(() => {
          window.location.reload();
        });
      }
    } catch (error: any) {
      Swal.fire('Error', error.response?.data?.message || 'Failed to claim item.', 'error');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      {/* Image Banner & Dynamic Type Badge */}
      <div className="relative h-56 bg-gray-100 flex-shrink-0 overflow-hidden group">
        {item.imageUrl ? (
          <img src={`http://localhost:5000/uploads/${item.imageUrl}`} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50 border-b border-slate-100">
            <ImageOff className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-sm font-medium opacity-75">No Image Provided</span>
          </div>
        )}
        <div className={`absolute top-4 left-4 px-2.5 py-0.5 text-xs font-medium rounded-full shadow-sm tracking-wide ${
          isLost ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
        }`}>
          {isLost ? 'LOST' : 'FOUND'}
        </div>
        
        {isOwner && (
          <div className="absolute top-4 right-4 bg-slate-900 text-white font-medium text-xs tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center">
            <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse"></span>
            YOUR POST
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1 pr-2">{item.title}</h3>
          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-md font-semibold whitespace-nowrap">
            {item.category}
          </span>
        </div>
        
        <p className="text-gray-500 text-sm mb-5 line-clamp-2 flex-grow leading-relaxed">{item.description}</p>

        {/* Structured Metadata block */}
        <div className="space-y-2.5 mb-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="flex items-center text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4 mr-2.5 text-[#800000]" />
            <span className="truncate">{item.city}, {item.district}</span>
          </div>
          <div className="flex items-center text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4 mr-2.5 text-[#800000]" />
            <span>{new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center text-sm font-medium text-gray-700">
            <Phone className="w-4 h-4 mr-2.5 text-[#800000]" />
            <span>{item.contactNumber}</span>
          </div>
        </div>
        
        {/* Blind Claim Indicator Banner */}
        {item.securityQuestion && !isLost && (
           <div className="mb-5 flex items-center text-xs font-bold tracking-wide text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200/60">
             <ShieldQuestion className="w-4 h-4 mr-2" />
             BLIND CLAIM VERIFICATION REQUIRED
           </div>
        )}

        {/* Contextual Action Button */}
        {isOwner ? (
          <div className="mt-auto flex flex-col gap-2">
            {item.status !== 'Claimed' && (
              <button 
                onClick={handleMarkAsClaimed}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Mark as Claimed
              </button>
            )}
            <div className="flex gap-2">
              <button 
                onClick={() => navigate(`/edit/${item._id}`)}
                className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm"
              >
                Edit Details
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors text-sm"
              >
                Delete Post
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleClaimInitiation}
            className="w-full mt-auto py-3 rounded-xl border-2 border-[#800000] text-[#800000] font-bold hover:bg-[#800000] hover:text-white transition-colors active:scale-[0.98]"
          >
            {isLost ? 'I Have This Item' : 'Claim This Item'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
