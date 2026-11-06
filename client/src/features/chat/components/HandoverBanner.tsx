import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import Swal from 'sweetalert2';
import { ShieldCheck, CheckCircle2, Gift, Clock, Loader2, ThumbsUp, AlertTriangle } from 'lucide-react';

interface HandoverBannerProps {
  itemId: string;
  otherUserId: string;
}

const HandoverBanner: React.FC<HandoverBannerProps> = ({ itemId, otherUserId }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchState = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/handovers/${itemId}/${otherUserId}`);
      setState(res.data);
    } catch (err) {
      setError(true);
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

  if (error) return <div role="alert" className="border-b border-slate-200 p-4 dark:border-slate-700"><p className="ui-muted">Return status could not be loaded.</p><button onClick={fetchState} className="ui-secondary mt-2">Try again</button></div>;
  if (loading || !state) {
    return (
      <div className="bg-white border-b border-gray-100 p-4 flex justify-center items-center dark:bg-slate-800 dark:border-slate-700">
        <span role="status" className="ui-muted">Loading return status…</span>
      </div>
    );
  }

  const { record, isOwner, isFinder } = state;
  const status = record?.status;

  return (
    <div className="bg-slate-50 border-b border-gray-200 p-4 sm:px-6 dark:bg-slate-900/50 dark:border-slate-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

        {/* State Information */}
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 dark:bg-slate-800 dark:border-slate-700">
            {status === 'RETURN_COMPLETED' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-300" />
            ) : status === 'OWNER_FINDER_VERIFIED' ? (
              <ThumbsUp className="w-6 h-6 text-blue-500 dark:text-blue-300" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-gray-400 dark:text-slate-400" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm dark:text-slate-100">
              Return progress
            </h3>
            <p className="text-xs text-gray-500 font-medium dark:text-slate-400">
              {!record && "Confirm who found the item to begin."}
              {status === 'FINDER_CONFIRMED' && "Finder confirmed · Waiting for owner"}
              {status === 'OWNER_FINDER_VERIFIED' && "Both people confirmed · Ready to return"}
              {status === 'RETURN_COMPLETED' && "Item returned"}
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
                  className="ui-primary w-full sm:w-auto"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  I found this item
                </button>
              )}
              {status === 'FINDER_CONFIRMED' && (
                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 flex items-center gap-2 w-full sm:w-auto dark:bg-blue-900/25 dark:text-blue-300 dark:border-blue-800">
                  <Clock className="h-4 w-4" />
                  Waiting for owner
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
                  className="ui-primary w-full sm:w-auto"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  This is my item
                </button>
              )}

              {status === 'OWNER_FINDER_VERIFIED' && (
                <button
                  onClick={handleConfirmReceipt}
                  disabled={actionLoading}
                  className="ui-primary w-full sm:w-auto"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  I received my item
                </button>
              )}

              {status === 'RETURN_COMPLETED' && (
                <button
                  onClick={() => navigate(`/tips/new/${record._id}`)}
                  className="ui-primary w-full sm:w-auto"
                >
                  <Gift className="w-4 h-4" />
                  Send a thank-you tip (optional)
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
