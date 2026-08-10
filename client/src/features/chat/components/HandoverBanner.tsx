import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import Swal from 'sweetalert2';
import { ShieldCheck, CheckCircle2, Gift, Loader2, Handshake, AlertTriangle } from 'lucide-react';

interface HandoverBannerProps {
  itemId: string;
  otherUserId: string;
}

const HandoverBanner: React.FC<HandoverBannerProps> = ({ itemId, otherUserId }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchState = async () => {
    try {
      const res = await api.get(`/handovers/${itemId}/${otherUserId}`);
      setState(res.data);
    } catch (err) {
      console.error('Failed to fetch handover state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (itemId && otherUserId) {
      fetchState();
    }
  }, [itemId, otherUserId]);

  const handleConfirmFinder = async () => {
    setActionLoading(true);
    try {
      await api.post(`/handovers/${itemId}/${otherUserId}/confirm-finder`);
      await fetchState();
    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to confirm', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmOwner = async () => {
    setActionLoading(true);
    try {
      await api.post(`/handovers/${itemId}/${otherUserId}/confirm-owner`);
      await fetchState();
    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to confirm', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    const result = await Swal.fire({
      title: 'Confirm Item Received',
      text: "Please confirm that you have physically received your lost item from this person.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, I Received It',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10B981',
    });

    if (result.isConfirmed) {
      setActionLoading(true);
      try {
        await api.post(`/handovers/${itemId}/${otherUserId}/confirm-receipt`);
        await fetchState();
        Swal.fire('Success', 'Item marked as successfully returned!', 'success');
      } catch (err: any) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to confirm receipt', 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  if (loading || !state) {
    return (
      <div className="bg-white border-b border-gray-100 p-4 flex justify-center items-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const { record, isOwner, isFinder } = state;
  const status = record?.status;

  return (
    <div className="bg-slate-50 border-b border-gray-200 p-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* State Information */}
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            {status === 'RETURN_COMPLETED' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            ) : status === 'OWNER_FINDER_VERIFIED' ? (
              <Handshake className="w-6 h-6 text-blue-500" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              Handover Verification Status
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              {!record && "Not Initiated"}
              {status === 'FINDER_CONFIRMED' && "Finder Confirmed. Waiting for Owner."}
              {status === 'OWNER_FINDER_VERIFIED' && "Mutual Verification Complete ✓"}
              {status === 'RETURN_COMPLETED' && "Item Successfully Returned ✓"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          
          {/* FINDER ACTIONS */}
          {isFinder && (
            <>
              {!record && (
                <button 
                  onClick={handleConfirmFinder} 
                  disabled={actionLoading}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex justify-center items-center gap-2 transition-all active:scale-95"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Handshake className="w-4 h-4" />}
                  I Found This Item
                </button>
              )}
              {status === 'FINDER_CONFIRMED' && (
                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 flex items-center gap-2 w-full sm:w-auto">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Waiting for Owner...
                </div>
              )}
            </>
          )}

          {/* OWNER ACTIONS */}
          {isOwner && (
            <>
              {status === 'FINDER_CONFIRMED' && (
                <button 
                  onClick={handleConfirmOwner} 
                  disabled={actionLoading}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex justify-center items-center gap-2 transition-all active:scale-95"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Yes, This Is My Item
                </button>
              )}

              {status === 'OWNER_FINDER_VERIFIED' && (
                <button 
                  onClick={handleConfirmReceipt} 
                  disabled={actionLoading}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex justify-center items-center gap-2 transition-all active:scale-95"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  I Received My Item
                </button>
              )}

              {status === 'RETURN_COMPLETED' && (
                <button 
                  onClick={() => navigate(`/tips/new/${record._id}`)}
                  className="w-full sm:w-auto bg-[#800000] hover:bg-[#600000] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-[#800000]/20 flex justify-center items-center gap-2 transition-all active:scale-95 animate-pulse-slow"
                >
                  <Gift className="w-4 h-4" />
                  Give Tip
                </button>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default HandoverBanner;
