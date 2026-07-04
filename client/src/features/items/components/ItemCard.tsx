import React from 'react';
import { MapPin, Calendar, Phone, Image as ImageIcon, CheckCircle, ShieldCheck, ImageOff, ShieldQuestion } from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { useTranslation } from 'react-i18next';

export interface ItemProps {
  _id: string;
  title: string;
  titleSi?: string;
  titleTa?: string;
  description: string;
  descriptionSi?: string;
  descriptionTa?: string;
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
  handedToPolice?: boolean;
  policeStationName?: string;
  createdBy: any;
}

const ItemCard: React.FC<{ item: ItemProps }> = ({ item }) => {
  const { t, i18n } = useTranslation();
  const isLost = item.type === 'LOST';
  const isSmartTag = item.type === 'SMART_TAG';
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
          <img src={item.imageUrl.startsWith('http') ? item.imageUrl : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}/uploads/${item.imageUrl}`} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50 border-b border-slate-100">
            <ImageOff className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-sm font-medium opacity-75">{t('item.noImage')}</span>
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex gap-2">
          {item.status === 'Claimed' && (
            <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border border-emerald-400/50 shadow-sm flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              {t('item.claimed')}
            </span>
          )}
          {isSmartTag ? (
            <span className="bg-indigo-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border border-indigo-400/50 shadow-sm flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1" />
              {t('item.smartTag')}
            </span>
          ) : (
            <span className={`text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border shadow-sm ${
              isLost ? 'bg-rose-500/90 border-rose-400/50' : 'bg-emerald-500/90 border-emerald-400/50'
            }`}>
              {isLost ? t('item.lost') : t('item.found')}
            </span>
          )}
          {item.handedToPolice && item.status === 'At Police Station' && (
            <span className="bg-blue-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border border-blue-400/50 shadow-sm flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1" />
              At Police Station
            </span>
          )}
        </div>
        
        {isOwner && (
          <div className="absolute top-4 right-4 bg-slate-900 text-white font-medium text-xs tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center">
            <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse"></span>
            {t('item.yourPost')}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1 pr-2">
            {i18n.language === 'si' && item.titleSi ? item.titleSi : (i18n.language === 'ta' && item.titleTa ? item.titleTa : item.title)}
          </h3>
          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-md font-semibold whitespace-nowrap">
            {t(`categories.${item.category}`, { defaultValue: item.category })}
          </span>
        </div>
        
        <p className="text-gray-500 text-sm mb-5 line-clamp-2 flex-grow leading-relaxed">
          {i18n.language === 'si' && item.descriptionSi ? item.descriptionSi : (i18n.language === 'ta' && item.descriptionTa ? item.descriptionTa : item.description)}
        </p>

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
          {item.handedToPolice && item.policeStationName && (
            <div className="flex items-center text-sm font-bold text-blue-800 bg-blue-50 p-2 rounded-lg mt-2">
              <ShieldCheck className="w-4 h-4 mr-2 text-blue-600" />
              Available to pick up at {item.policeStationName}
            </div>
          )}
        </div>
        
        {/* Blind Claim Indicator Banner */}
        {item.securityQuestion && !isLost && (
           <div className="mb-5 flex items-center text-xs font-bold tracking-wide text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200/60">
             <ShieldQuestion className="w-4 h-4 mr-2" />
             {t('item.blindClaimVerification')}
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
                {t('item.markAsClaimed')}
              </button>
            )}
            <div className="flex gap-2">
              <button 
                onClick={() => navigate(`/edit/${item._id}`)}
                className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm"
              >
                {t('common.edit')}
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors text-sm"
              >
                Delete Post
              </button>
            </div>
          </div>
        ) : user?.role !== 'police' ? (
          <button 
            onClick={handleClaimInitiation}
            className="w-full mt-auto py-3 rounded-xl border-2 border-[#800000] text-[#800000] font-bold hover:bg-[#800000] hover:text-white transition-colors active:scale-[0.98]"
          >
            {isLost ? 'I Have This Item' : 'Claim This Item'}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ItemCard;
