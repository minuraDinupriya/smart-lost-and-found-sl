import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { Gift, ArrowLeft, Heart, Coins } from 'lucide-react';
import Swal from 'sweetalert2';

const NewTipPage: React.FC = () => {
  const { returnRecordId } = useParams<{ returnRecordId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [returnRecord, setReturnRecord] = useState<any>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500); // Default predefined
  const [customAmount, setCustomAmount] = useState<string>('');
  const [thankYouMessage, setThankYouMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchReturnRecord = async () => {
      try {
        const res = await api.get(`/tips/return-record/${returnRecordId}`);
        setReturnRecord(res.data);
      } catch (error: any) {
        console.error('Failed to fetch return record:', error);
        Swal.fire({
          title: 'Error',
          text: error.response?.data?.message || 'Failed to load return details.',
          icon: 'error',
          confirmButtonColor: '#800000',
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    if (returnRecordId) {
      fetchReturnRecord();
    }
  }, [returnRecordId, navigate]);

  if (loading) {
    return <div className="flex justify-center p-20 text-gray-500 font-medium animate-pulse">Loading return details...</div>;
  }

  if (!returnRecord) {
    return (
      <div className="max-w-md mx-auto text-center p-10 bg-white rounded-2xl border border-gray-100 shadow-sm mt-10">
        <p className="text-gray-500 font-semibold">Return details could not be found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-[#800000] font-bold hover:underline">Go Home</button>
      </div>
    );
  }

  const { itemId, finderId } = returnRecord;
  const isOwner = returnRecord.ownerId._id === user?._id || returnRecord.ownerId === user?._id;

  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto text-center p-10 bg-white rounded-2xl border border-gray-100 shadow-sm mt-10">
        <p className="text-red-600 font-bold">Unauthorized Access</p>
        <p className="text-gray-500 text-sm mt-2">Only the rightful owner of this item can send a reward tip.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-[#800000] font-bold hover:underline">Go Home</button>
      </div>
    );
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = selectedAmount !== null ? selectedAmount : parseFloat(customAmount);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      Swal.fire({
        title: 'Invalid Amount',
        text: 'Please enter or select a valid tip amount greater than zero.',
        icon: 'warning',
        confirmButtonColor: '#800000',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/tips', {
        returnRecordId,
        amount: finalAmount,
        thankYouMessage,
      });

      const { checkoutUrl } = response.data;
      if (checkoutUrl) {
        // Redirect the window to Stripe checkout page or Mock checkout page
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout session URL received.');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      Swal.fire({
        title: 'Payment Error',
        text: error.response?.data?.message || 'Failed to initialize payment checkout.',
        icon: 'error',
        confirmButtonColor: '#800000',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectPredefined = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedAmount(null);
    setCustomAmount(e.target.value);
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header Banner */}
      <div className="bg-[#800000] text-white p-8 relative overflow-hidden">
        <button
          onClick={() => navigate(`/items/${itemId._id}`)}
          className="absolute top-6 left-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center text-center mt-4">
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Finder Reward Tip</h1>
          <p className="text-white/85 text-sm mt-1 max-w-sm">
            Show your gratitude to <span className="font-bold">@{finderId?.username}</span> for successfully returning your item.
          </p>
        </div>
      </div>

      <form onSubmit={handlePay} className="p-8 space-y-6">
        {/* Item Card Context */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          {itemId?.imageUrl ? (
            <img
              src={itemId.imageUrl.startsWith('http') ? itemId.imageUrl : `http://localhost:5000/uploads/${itemId.imageUrl}`}
              alt={itemId.title}
              className="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
              <Gift className="w-6 h-6" />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Returned Item</p>
            <h4 className="font-bold text-gray-900 line-clamp-1">{itemId?.title}</h4>
            <p className="text-xs text-emerald-600 font-medium flex items-center mt-0.5">
              <Coins className="w-3.5 h-3.5 mr-1" /> Returns marked Completed
            </p>
          </div>
        </div>

        {/* Tip Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-700">Select Reward Amount (LKR)</label>
          <div className="grid grid-cols-3 gap-3">
            {[200, 500, 1000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleSelectPredefined(amt)}
                className={`py-3.5 px-4 rounded-xl border-2 font-bold transition-all text-center focus:outline-none ${
                  selectedAmount === amt
                    ? 'border-[#800000] bg-[#800000]/5 text-[#800000] shadow-sm'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Rs. {amt}
              </button>
            ))}
          </div>

          <div className="relative mt-2">
            <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 font-bold text-sm">
              Rs.
            </span>
            <input
              type="number"
              value={customAmount}
              onChange={handleCustomChange}
              placeholder="Or enter a custom amount..."
              className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none transition-colors text-sm font-medium ${
                selectedAmount === null
                  ? 'border-[#800000] focus:ring-1 focus:ring-[#800000]'
                  : 'border-gray-200 focus:border-[#800000]'
              }`}
              min="1"
            />
          </div>
        </div>

        {/* Thank You Note */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700 flex items-center">
            <Heart className="w-4 h-4 mr-1.5 text-rose-500 fill-rose-500" />
            Thank-You Message (Optional)
          </label>
          <textarea
            value={thankYouMessage}
            onChange={(e) => setThankYouMessage(e.target.value)}
            placeholder="Write a short message to thank the finder..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#800000] focus:outline-none transition-colors text-sm placeholder-gray-400"
            maxLength={300}
          />
          <div className="text-right text-xs text-gray-400 font-medium">
            {thankYouMessage.length}/300 characters
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-[#800000] text-white font-bold rounded-2xl hover:bg-[#600000] transition-colors focus:outline-none focus:ring-4 focus:ring-[#800000]/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#800000]/15 flex items-center justify-center"
        >
          {submitting ? 'Redirecting to Payment...' : 'Proceed to Payment'}
        </button>
      </form>
    </div>
  );
};

export default NewTipPage;
