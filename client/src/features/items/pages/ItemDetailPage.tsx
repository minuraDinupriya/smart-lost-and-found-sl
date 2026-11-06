import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import {
  Package,
  MapPin,
  Calendar,
  Tag,
  User,
  MessageCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import PageNavigation from '../../../components/common/PageNavigation';

const ItemDetailPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, fetchMe } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

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
    return (
      <div className="flex justify-center p-20 text-gray-500 font-medium animate-pulse dark:text-slate-400">
        Loading item details...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <AlertCircle className="w-16 h-16 text-gray-300 mb-4 dark:text-slate-400" />
        <h2 className="text-xl font-bold text-gray-700 dark:text-slate-300">Item Not Found</h2>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-brand-700 font-medium hover:underline dark:text-brand-300"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isOwner = item.createdBy?._id === user?._id || item.createdBy === user?._id;
  const isFound = item.type === 'FOUND';
  const isSmartTag = item.type === 'SMART_TAG';

  const handleClaimOrChat = () => {
    if (!user) {
      navigate('/login', {
        state: { from: '/chat/' + item._id + '/' + (item.createdBy._id || item.createdBy) },
      });
      return;
    }
    if (isOwner) {
      navigate(`/edit/${item._id}`);
      return;
    }

    if (isFound) {
      Swal.fire({
        title: 'Contact the person who found this item',
        text: 'Describe the item and answer any ownership questions before arranging a return.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#800000',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Proceed to Chat',
      }).then((result) => {
        if (result.isConfirmed) {
          navigate(`/chat/${item._id}/${item.createdBy._id || item.createdBy}`);
        }
      });
    } else {
      navigate(`/chat/${item._id}/${item.createdBy._id || item.createdBy}`);
    }
  };

  const handleMarkAsClaimed = async () => {
    const confirmation = await Swal.fire({
      title: 'Has this item been returned?',
      text: 'Confirm only after the item has reached its owner.',
      icon: 'question',
      showCancelButton: true,
      focusCancel: true,
      confirmButtonText: 'Confirm return',
    });
    if (!confirmation.isConfirmed) return;
    try {
      await api.put(`/items/${item._id}/claim`);
      // Update local state
      setItem((prev: any) => ({ ...prev, status: 'Claimed' }));

      if (item.type === 'FOUND') {
        Swal.fire({
          title: 'Item returned',
          text: 'The report is now marked as returned.',
          icon: 'success',
          confirmButtonColor: '#10b981',
        });
        fetchMe(); // Refresh Karma points in Navbar
      } else {
        Swal.fire({
          title: 'Resolved!',
          text: 'This report is now marked as returned.',
          icon: 'success',
          confirmButtonColor: '#800000',
        });
      }
    } catch (error: any) {
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'Failed to claim item.',
        icon: 'error',
      });
    }
  };

  const handleVerifyOwnership = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/items/' + item._id } });
      return;
    }
    const { value: formValues } = await Swal.fire({
      title: 'Verify ownership details',
      html: `
        <div class="mb-4 text-left text-sm">
          If the original poster added private digital proofs (like an IMEI, Serial Number, or custom mark), you can verify your ownership here.
        </div>
        <label for="swal-proof-type">Ownership detail</label><select id="swal-proof-type" class="swal2-select"></select>
        <label for="swal-proof-value">Proof value</label><input id="swal-proof-value" class="swal2-input" placeholder="Proof Value (e.g. 123456789)" style="width: 80%;">
      `,
      didOpen: () => {
        const select = document.getElementById('swal-proof-type') as HTMLSelectElement;
        item.ownershipProofs.forEach((proof: any, index: number) => {
          const option = document.createElement('option');
          option.value = String(index);
          option.textContent =
            proof.proofType === 'custom'
              ? proof.customLabel
              : proof.proofType
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (letter: string) => letter.toUpperCase());
          select.appendChild(option);
        });
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#800000',
      confirmButtonText: 'Verify Proof',
      preConfirm: () => {
        const typeInput = document.getElementById('swal-proof-type') as HTMLSelectElement;
        const valInput = document.getElementById('swal-proof-value') as HTMLInputElement;
        if (!typeInput.value || !valInput.value) {
          Swal.showValidationMessage('Both fields are required');
          return false;
        }
        return {
          proofType: item.ownershipProofs[Number(typeInput.value)].proofType,
          customLabel: item.ownershipProofs[Number(typeInput.value)].customLabel,
          proofValue: valInput.value,
        };
      },
    });

    if (formValues) {
      try {
        const res = await api.post(`/items/${item._id}/verify-ownership`, {
          submittedProofs: [formValues],
        });

        if (res.data.status === 'VERIFIED') {
          Swal.fire({
            title: 'Verified!',
            text: 'Ownership successfully verified! You provided a matching proof.',
            icon: 'success',
            confirmButtonColor: '#800000',
          });
        } else if (res.data.status === 'PARTIALLY_VERIFIED') {
          Swal.fire({
            title: 'Partially Verified',
            text: 'You provided a valid proof, but there are other proofs on this item.',
            icon: 'info',
            confirmButtonColor: '#800000',
          });
        } else {
          Swal.fire({
            title: 'Not Verified',
            text: 'The proof provided does not match any registered proofs for this item.',
            icon: 'error',
            confirmButtonColor: '#800000',
          });
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Verification Failed',
          text: error.response?.data?.message || 'Could not verify ownership.',
          icon: 'error',
          confirmButtonColor: '#800000',
        });
      }
    }
  };

  const imgUrl = item.imageUrl
    ? item.imageUrl.startsWith('http')
      ? item.imageUrl
      : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}/uploads/${item.imageUrl}`
    : null;

  return (
    <>
      <PageNavigation />
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        {/* Header Image Area */}
        <div className="h-64 bg-gray-100 relative flex items-center justify-center overflow-hidden dark:bg-slate-700">
          {imgUrl ? (
            <img src={imgUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-gray-400 dark:text-slate-400">
              <Package className="w-16 h-16 mb-2 opacity-50" />
              <span className="font-medium">No Image Provided</span>
            </div>
          )}

          {/* Floating Badges */}
          <div className="absolute top-4 left-4 flex space-x-2">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm tracking-wider ${isFound ? 'bg-emerald-100 text-emerald-800' : isSmartTag ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}
            >
              {isSmartTag ? 'Smart tag' : isFound ? 'Found' : 'Lost'}
            </span>
            {!isSmartTag && (
              <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm bg-white/90 text-gray-700 backdrop-blur-sm dark:bg-slate-800/90 dark:text-slate-300">
                {item.status === 'Claimed' ? 'Returned' : item.status || 'Available'}
              </span>
            )}
            {item.handedToPolice && item.status === 'At Police Station' && (
              <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm bg-blue-600/90 text-white backdrop-blur-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                At Police Station
              </span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight dark:text-slate-100">
                {i18n.language === 'si' && item.titleSi
                  ? item.titleSi
                  : i18n.language === 'ta' && item.titleTa
                    ? item.titleTa
                    : item.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-500 dark:text-slate-400">
                <span className="flex items-center">
                  <Tag className="w-4 h-4 mr-1.5" />{' '}
                  {t(`categories.${item.category}`, { defaultValue: item.category })}
                </span>
                {!isSmartTag && (
                  <>
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1.5" /> {item.city}, {item.district}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1.5" />{' '}
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="prose prose-sm sm:prose lg:prose-lg text-gray-700 mb-8 bg-gray-50 p-5 rounded-xl border border-gray-100 dark:text-slate-300 dark:bg-slate-900/50 dark:border-slate-700">
            <p className="leading-relaxed whitespace-pre-wrap">
              {i18n.language === 'si' && item.descriptionSi
                ? item.descriptionSi
                : i18n.language === 'ta' && item.descriptionTa
                  ? item.descriptionTa
                  : item.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm">
            <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100 dark:bg-slate-900/50 dark:border-slate-700">
              <User className="w-5 h-5 text-gray-400 mr-3 dark:text-slate-400" />
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider dark:text-slate-400">
                  Reported by
                </p>
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {item.createdBy?.username || 'System User'}
                </p>
              </div>
            </div>
            {item.handedToPolice && item.policeStationName ? (
              <div className="flex items-center p-4 bg-blue-50 rounded-xl border border-blue-100 dark:bg-blue-900/25 dark:border-blue-800">
                <MapPin className="w-5 h-5 text-blue-600 mr-3 dark:text-blue-300" />
                <div>
                  <p className="text-blue-600 text-xs font-bold uppercase tracking-wider dark:text-blue-300">
                    Available For Pickup At
                  </p>
                  <p className="font-bold text-blue-900 dark:text-blue-300">
                    {item.policeStationName}
                  </p>
                </div>
              </div>
            ) : !isSmartTag ? (
              <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100 dark:bg-slate-900/50 dark:border-slate-700">
                <MessageCircle className="w-5 h-5 text-gray-400 mr-3 dark:text-slate-400" />
                <div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wider dark:text-slate-400">
                    Contact
                  </p>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {item.contactNumber}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-slate-700">
            <button onClick={() => navigate('/')} className="ui-secondary">
              Back
            </button>

            {user?.role !== 'police' && (
              <>
                <button onClick={handleClaimOrChat} className="ui-primary flex-1">
                  {isOwner ? 'Edit report' : 'Contact poster'}
                </button>

                {!isOwner && item.ownershipProofs?.length > 0 && (
                  <button onClick={handleVerifyOwnership} className="ui-secondary">
                    <ShieldCheck className="w-5 h-5 mr-2" />
                    Verify details
                  </button>
                )}
              </>
            )}

            {isOwner && item.status !== 'Claimed' && (
              <button onClick={handleMarkAsClaimed} className="ui-primary flex-1">
                Mark as returned
              </button>
            )}

            {isOwner &&
              item.status === 'Claimed' &&
              item.returnRecord &&
              (item.tipPaid ? (
                <span className="flex-grow px-6 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl border border-gray-200 flex items-center justify-center text-sm cursor-not-allowed dark:bg-slate-700 dark:text-slate-400 dark:border-slate-700">
                  🏆 Tip Sent Successfully
                </span>
              ) : (
                <button
                  onClick={() => navigate(`/tips/new/${item.returnRecord._id}`)}
                  className="ui-primary flex-1"
                >
                  🏆 Send Reward Tip
                </button>
              ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ItemDetailPage;
