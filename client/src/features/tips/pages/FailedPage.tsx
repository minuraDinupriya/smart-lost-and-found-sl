import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, ShoppingBag } from 'lucide-react';

const FailedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tipId = searchParams.get('tip_id') || '';

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-center mt-10">
      {/* Top Graphic */}
      <div className="bg-red-50/50 p-8 flex flex-col items-center border-b border-red-50">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Payment Cancelled</h1>
        <p className="text-sm font-semibold text-red-600 mt-1">Transaction Failed</p>
      </div>

      <div className="p-8 space-y-6">
        <p className="text-gray-500 text-sm leading-relaxed">
          The payment checkout session was cancelled or could not be processed. No funds have been deducted. If this is unexpected, please try again.
        </p>

        <div className="flex flex-col space-y-3">
          {tipId && (
            <button
              onClick={() => navigate(`/tips/new/${tipId}`)}
              className="w-full py-3.5 bg-[#800000] text-white font-bold rounded-xl hover:bg-[#600000] transition-colors flex items-center justify-center space-x-2 shadow-md shadow-[#800000]/15"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Payment</span>
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <ShoppingBag className="w-4 h-4 text-gray-500" />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FailedPage;
