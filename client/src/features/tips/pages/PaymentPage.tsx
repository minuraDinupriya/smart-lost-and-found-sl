import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { CreditCard, Shield, Lock, ArrowRight } from 'lucide-react';
import Swal from 'sweetalert2';

const PaymentPage: React.FC = () => {
  const { tipId } = useParams<{ tipId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reference = searchParams.get('reference') || '';
  const isMock = searchParams.get('mock') === 'true';

  const [loading, setLoading] = useState(true);
  const [tip, setTip] = useState<any>(null);
  const [paying, setPaying] = useState(false);

  // Form states
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('•••');
  const [name, setName] = useState('Jane Doe');

  useEffect(() => {
    // If not mock or reference is missing, redirect
    if (!isMock || !reference) {
      Swal.fire('Error', 'Invalid payment session.', 'error');
      navigate('/');
      return;
    }

    const fetchTip = async () => {
      try {
        const res = await api.get(`/tips/${tipId}`);
        setTip(res.data);
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to retrieve tip details.', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    if (tipId) {
      fetchTip();
    }
  }, [tipId, isMock, reference, navigate]);

  if (loading) {
    return <div className="flex justify-center p-20 text-gray-500 font-medium animate-pulse">Loading mock payment portal...</div>;
  }

  const handleMockPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaying(true);
    // Simulate network latency
    setTimeout(async () => {
      try {
        const res = await api.put('/tips/payment-status', {
          paymentReference: reference,
        });

        if (res.status === 200 && res.data.tip.paymentStatus === 'paid') {
          Swal.fire({
            title: 'Mock Payment Success',
            text: 'Sandbox payment completed successfully!',
            icon: 'success',
            confirmButtonColor: '#10b981',
          }).then(() => {
            navigate(`/tips/success?session_id=${reference}`);
          });
        } else {
          navigate(`/tips/failed?tip_id=${tipId}`);
        }
      } catch (err: any) {
        console.error(err);
        Swal.fire('Payment Failed', err.response?.data?.message || 'Transaction was rejected.', 'error');
        navigate(`/tips/failed?tip_id=${tipId}`);
      } finally {
        setPaying(false);
      }
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 text-white rounded-3xl shadow-xl border border-slate-800 overflow-hidden mt-6">
      {/* Top Secure Header */}
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Smart Gateway Sandbox</span>
        </div>
        <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>SSL Secured</span>
        </div>
      </div>

      <div className="p-8">
        {/* Payment Summary */}
        <div className="text-center mb-8">
          <p className="text-slate-400 text-sm font-medium">Paying Reward Tip to @{tip?.finderId?.username}</p>
          <h2 className="text-4xl font-extrabold mt-1 text-white">Rs. {tip?.amount?.toLocaleString()}</h2>
          <p className="text-slate-500 text-xs mt-1.5">For returning: <span className="font-semibold text-slate-300">"{tip?.returnRecordId?.itemId?.title}"</span></p>
        </div>

        {/* Credit Card Graphic */}
        <div className="bg-gradient-to-br from-red-800 to-rose-950 p-6 rounded-2xl shadow-lg border border-red-700/30 relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-8 -translate-y-8 pointer-events-none" />
          <div className="flex justify-between items-start mb-10">
            <CreditCard className="w-10 h-10 text-white/80" />
            <span className="text-xs font-black tracking-widest text-white/60">VISA MOCK</span>
          </div>
          <div className="space-y-4">
            <p className="text-lg font-mono tracking-widest">{cardNumber}</p>
            <div className="flex justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/40">Card Holder</p>
                <p className="text-xs font-semibold tracking-wide">{name}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-white/40">Expires</p>
                <p className="text-xs font-semibold tracking-wide">{expiry}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <form onSubmit={handleMockPay} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Card Number</label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-[#800000] focus:ring-0 rounded-xl px-4 py-3 text-sm text-white font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry Date</label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="MM/YY"
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#800000] focus:ring-0 rounded-xl px-4 py-3 text-sm text-white font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CVC</label>
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#800000] focus:ring-0 rounded-xl px-4 py-3 text-sm text-white font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 pb-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Holder Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-[#800000] focus:ring-0 rounded-xl px-4 py-3 text-sm text-white font-semibold"
              required
            />
          </div>

          <button
            type="submit"
            disabled={paying}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 transition-all rounded-xl text-slate-950 font-bold text-base flex items-center justify-center space-x-2 focus:outline-none"
          >
            <span>{paying ? 'Processing Sandbox Payment...' : `Authorize Payment of Rs. ${tip?.amount}`}</span>
            {!paying && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentPage;
