import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { CheckCircle2, ChevronRight, ShoppingBag, History } from 'lucide-react';
import Swal from 'sweetalert2';

const SuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id') || '';

  const [loading, setLoading] = useState(true);
  const [tip, setTip] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) {
      Swal.fire('Error', 'Missing transaction identifier.', 'error');
      navigate('/');
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await api.put('/tips/payment-status', {
          paymentReference: sessionId,
        });
        setTip(res.data.tip);
      } catch (err: any) {
        console.error('Payment verification failed:', err);
        Swal.fire({
          title: 'Verification Failed',
          text: err.response?.data?.message || 'Could not verify transaction status.',
          icon: 'error',
          confirmButtonColor: '#800000',
        });
      } finally {
        setLoading(false);
      }
    };
    verifyPayment();
  }, [sessionId, navigate]);

  if (loading) {
    return <div className="flex justify-center p-20 text-gray-500 font-medium animate-pulse">Verifying payment transaction...</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-center mt-10">
      {/* Top Graphic */}
      <div className="bg-emerald-50/50 p-8 flex flex-col items-center border-b border-emerald-50">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Payment Successful</h1>
        <p className="text-sm font-semibold text-emerald-600 mt-1">Transaction Completed</p>
      </div>

      <div className="p-8 space-y-6">
        {/* Payment details */}
        {tip && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3.5 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-gray-400 font-semibold uppercase text-xs">Payment Reference</span>
                <span className="font-mono text-xs font-bold text-gray-800 break-all ml-4 max-w-[200px] text-right">
                  {tip.paymentReference}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <span className="text-gray-400 font-semibold uppercase text-xs">Amount Sent</span>
                <span className="font-bold text-gray-900">Rs. {tip.amount?.toLocaleString()}</span>
              </div>
              {tip.thankYouMessage && (
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-gray-400 font-semibold uppercase text-xs block mb-1">Your Message</span>
                  <p className="text-gray-700 italic bg-white p-3 rounded-lg border border-gray-100 text-xs">
                    "{tip.thankYouMessage}"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-3">
          <button
            onClick={() => navigate('/tips/history')}
            className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 shadow-sm"
          >
            <History className="w-4 h-4" />
            <span>View Tip History</span>
            <ChevronRight className="w-4 h-4 opacity-55" />
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <ShoppingBag className="w-4 h-4 text-gray-500" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
