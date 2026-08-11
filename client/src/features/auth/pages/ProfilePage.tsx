import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import Swal from 'sweetalert2';
import { Camera, User, Award, Shield, ArrowLeft, Check, Loader2, History, Gift, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ProfilePage: React.FC = () => {
  const { user, fetchMe } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'claimed' | 'returned' | 'bank'>('profile');
  const [claimedHistory, setClaimedHistory] = useState<any[]>([]);
  const [returnedHistory, setReturnedHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      if (user.profilePicture) {
        const fullUrl = user.profilePicture.startsWith('http')
          ? user.profilePicture
          : `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000'}${user.profilePicture}`;
        setPreviewUrl(fullUrl);
      }
      if (user.bankDetails) {
        setBankName(user.bankDetails.bankName || '');
        setBranchName(user.bankDetails.branchName || '');
        setAccountName(user.bankDetails.accountName || '');
        setAccountNumber(user.bankDetails.accountNumber || '');
      }
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'claimed' && claimedHistory.length === 0) {
      fetchClaimedHistory();
    } else if (activeTab === 'returned' && returnedHistory.length === 0) {
      fetchReturnedHistory();
    }
  }, [activeTab]);

  const fetchClaimedHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get('/history/owner');
      setClaimedHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchReturnedHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get('/history/finder');
      setReturnedHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          title: 'Invalid File Type',
          text: 'Please select an image file (PNG, JPG, JPEG).',
          icon: 'error',
          confirmButtonColor: '#800000',
        });
        return;
      }
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      Swal.fire({ title: 'Error', text: 'Username cannot be empty.', icon: 'error', confirmButtonColor: '#800000' });
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('username', username.trim());
    if (profilePic) {
      formData.append('profilePicture', profilePic);
    }

    try {
      const response = await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchMe();
      Swal.fire({ title: 'Success!', text: response.data.message, icon: 'success', confirmButtonColor: '#800000', timer: 2000, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire({ title: 'Update Failed', text: error.response?.data?.message || 'Failed to update profile.', icon: 'error', confirmButtonColor: '#800000' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.put('/auth/profile/bank', {
        bankName,
        branchName,
        accountName,
        accountNumber
      });
      await fetchMe();
      Swal.fire({ title: 'Success!', text: response.data.message, icon: 'success', confirmButtonColor: '#800000', timer: 3000, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire({ title: 'Update Failed', text: error.response?.data?.message || 'Failed to update bank details.', icon: 'error', confirmButtonColor: '#800000' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto my-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-5 h-5 mr-1.5 transition-transform group-hover:-translate-x-1" />
        <span className="font-semibold text-sm">Back</span>
      </button>

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-[#800000] to-[#500000] relative">
          <div className="absolute right-6 top-6 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center text-white space-x-1.5 shadow-sm">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-extrabold tracking-wider uppercase">{user.role}</span>
          </div>
        </div>

        <div className="px-6 pb-6 relative flex flex-col md:flex-row md:items-end justify-between">
          <div className="flex items-end -mt-16 mb-4 md:mb-0">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white bg-slate-100 shadow-lg relative flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-[#800000] text-white flex items-center justify-center font-bold text-4xl">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#800000] text-white p-2 rounded-2xl border-4 border-white shadow-md group-hover:bg-[#600000] transition-colors">
                <Camera className="w-4 h-4" />
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>

          {user.role !== 'police' && (
            <div className="bg-yellow-50/60 border border-yellow-200/80 rounded-2xl p-4 flex items-center space-x-3.5 shadow-sm max-w-[200px]">
              <div className="p-2.5 bg-yellow-100/80 rounded-xl text-yellow-700">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-yellow-600 font-bold uppercase tracking-wider">Trust Score</p>
                <p className="text-xl font-black text-yellow-700">{user.karmaPoints || 0} pts</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-2 mb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-6 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'profile' ? 'bg-[#800000] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Personal Info</span>
        </button>
        {user.role !== 'police' && (
          <>
            <button
              onClick={() => setActiveTab('claimed')}
              className={`flex items-center space-x-2 px-6 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${
                activeTab === 'claimed' ? 'bg-[#800000] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Box className="w-5 h-5" />
              <span>Claimed Item History</span>
            </button>
            <button
              onClick={() => setActiveTab('returned')}
              className={`flex items-center space-x-2 px-6 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${
                activeTab === 'returned' ? 'bg-[#800000] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Gift className="w-5 h-5" />
              <span>Found & Returned History</span>
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex items-center space-x-2 px-6 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${
                activeTab === 'bank' ? 'bg-[#800000] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Award className="w-5 h-5" />
              <span>Bank Details (Payouts)</span>
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 pointer-events-none">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#800000]/15 focus:border-[#800000] focus:bg-white transition-all font-medium text-gray-800"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 font-medium">Changing your username will affect how you appear on items posted and messages.</p>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center space-x-2 bg-[#800000] hover:bg-[#600000] text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg w-full sm:w-auto"
              >
                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Saving...</span></> : <><Check className="w-5 h-5" /><span>Save Changes</span></>}
              </button>
            </div>
          </form>
        )}

        {/* BANK DETAILS TAB */}
        {activeTab === 'bank' && (
          <form onSubmit={handleBankSubmit} className="space-y-6 max-w-xl mx-auto">
            <div>
              <p className="text-gray-500 font-medium mb-6 text-sm">
                If you successfully return a lost item, the owner has the option to send you a monetary reward. Add your bank account details here so that we can directly transfer any rewards you receive!
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Commercial Bank"
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#800000]/15 focus:border-[#800000] focus:bg-white transition-all font-medium text-gray-800"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">Branch</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Nugegoda"
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#800000]/15 focus:border-[#800000] focus:bg-white transition-all font-medium text-gray-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700">Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. J. Doe"
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#800000]/15 focus:border-[#800000] focus:bg-white transition-all font-medium text-gray-800"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 1029384756"
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#800000]/15 focus:border-[#800000] focus:bg-white transition-all font-medium text-gray-800"
                required
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center space-x-2 bg-[#800000] hover:bg-[#600000] text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg w-full sm:w-auto"
              >
                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Saving...</span></> : <><Check className="w-5 h-5" /><span>Save Bank Details</span></>}
              </button>
            </div>
          </form>
        )}

        {/* CLAIMED ITEM HISTORY TAB (OWNER) */}
        {activeTab === 'claimed' && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Claimed Item History</h2>
            {isLoadingHistory ? (
              <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 text-[#800000] animate-spin" /></div>
            ) : claimedHistory.length === 0 ? (
              <div className="text-center py-16 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                <Box className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-800">No Claimed Items Yet</h3>
                <p className="text-gray-500 mt-2">Items that you successfully recover will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b-2 border-gray-100 text-gray-500 text-sm">
                      <th className="pb-4 font-bold">Item</th>
                      <th className="pb-4 font-bold">Finder</th>
                      <th className="pb-4 font-bold">Date</th>
                      <th className="pb-4 font-bold">Status</th>
                      <th className="pb-4 font-bold text-right">Tip / Reward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {claimedHistory.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4">
                          <div className="font-bold text-gray-900">{record.itemId?.title || 'Unknown Item'}</div>
                          <div className="text-gray-500 text-xs">{record.itemId?.category}</div>
                        </td>
                        <td className="py-4 font-medium text-gray-700">{record.finderId?.username}</td>
                        <td className="py-4 text-gray-500">{new Date(record.createdAt).toLocaleDateString()}</td>
                        <td className="py-4">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold text-xs uppercase tracking-wider">{record.status}</span>
                        </td>
                        <td className="py-4 text-right">
                          {record.tip && (record.tip.paymentStatus === 'paid' || record.tip.paymentStatus === 'completed') ? (
                            <div className="inline-flex items-center space-x-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl font-bold">
                              <Check className="w-4 h-4" />
                              <span>Tip Sent ✓ (Rs. {record.tip.amount})</span>
                            </div>
                          ) : record.tip && record.tip.paymentStatus === 'skipped' ? (
                            <span className="text-gray-400 font-bold italic">No Tip Given</span>
                          ) : (
                            <button
                              onClick={() => navigate(`/tips/new/${record._id}`)}
                              className="bg-[#800000] hover:bg-[#600000] text-white px-4 py-2 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs inline-flex items-center space-x-1"
                            >
                              <Gift className="w-4 h-4" />
                              <span>Give Tip</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* FOUND & RETURNED HISTORY TAB (FINDER) */}
        {activeTab === 'returned' && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Found & Returned History</h2>
            {isLoadingHistory ? (
              <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 text-[#800000] animate-spin" /></div>
            ) : returnedHistory.length === 0 ? (
              <div className="text-center py-16 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-800">No Returned Items Yet</h3>
                <p className="text-gray-500 mt-2">Items you successfully return to their owners will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b-2 border-gray-100 text-gray-500 text-sm">
                      <th className="pb-4 font-bold">Item</th>
                      <th className="pb-4 font-bold">Owner</th>
                      <th className="pb-4 font-bold">Date</th>
                      <th className="pb-4 font-bold">Status</th>
                      <th className="pb-4 font-bold text-right">Reward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {returnedHistory.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4">
                          <div className="font-bold text-gray-900">{record.itemId?.title || 'Unknown Item'}</div>
                          <div className="text-gray-500 text-xs">{record.itemId?.category}</div>
                        </td>
                        <td className="py-4 font-medium text-gray-700">{record.ownerId?.username}</td>
                        <td className="py-4 text-gray-500">{new Date(record.createdAt).toLocaleDateString()}</td>
                        <td className="py-4">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold text-xs uppercase tracking-wider">{record.status}</span>
                        </td>
                        <td className="py-4 text-right">
                          {record.tip && (record.tip.paymentStatus === 'paid' || record.tip.paymentStatus === 'completed') ? (
                            record.tip.payoutStatus === 'completed' ? (
                              <div className="inline-flex items-center space-x-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl font-bold text-xs">
                                <Check className="w-4 h-4" />
                                <span>Paid to Bank ✓ (Rs. {record.tip.amount})</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center space-x-1 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => setActiveTab('bank')}>
                                <Award className="w-4 h-4 animate-pulse" />
                                <span>Payout Pending (Add Bank)</span>
                              </div>
                            )
                          ) : record.tip && record.tip.paymentStatus === 'skipped' ? (
                            <span className="text-gray-400 font-bold italic text-xs">No Tip</span>
                          ) : (
                            <span className="text-gray-400 font-bold text-xs">Tip Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
