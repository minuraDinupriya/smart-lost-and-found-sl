import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Lock, Camera, Shield, Building, Save, Trophy, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, fetchMe } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [policeStationName, setPoliceStationName] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPoliceStationName(user.policeStationName || '');
      
      if (user.profilePicture) {
        if (user.profilePicture.startsWith('http')) {
          setPreviewUrl(user.profilePicture);
        } else {
          const baseUrl = import.meta.env.VITE_API_URL 
            ? import.meta.env.VITE_API_URL.replace('/api', '') 
            : 'http://localhost:5000';
          setPreviewUrl(`${baseUrl}/uploads/${user.profilePicture}`);
        }
      }
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Trophy className="w-12 h-12 text-[#800000] animate-bounce" />
        <h2 className="text-xl font-bold text-gray-800">Please sign in to view your profile</h2>
        <button 
          onClick={() => navigate('/login')} 
          className="px-6 py-2.5 bg-[#800000] text-white font-bold rounded-xl hover:bg-[#600000] transition shadow-md"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error('Username is required', { id: 'profile-val-error' });
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match', { id: 'profile-val-error' });
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    
    if (password) {
      formData.append('password', password);
    }
    
    if (user.role === 'police') {
      formData.append('policeStationName', policeStationName);
    }
    
    if (profilePicture) {
      formData.append('profilePicture', profilePicture);
    }

    try {
      const response = await api.put('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update localStorage cached values if username changes
      localStorage.setItem('username', response.data.user.username);
      
      // Update global context state
      await fetchMe();

      toast.success(response.data.message || 'Profile updated successfully!', { id: 'profile-success' });
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to update profile. Please try again.';
      toast.error(msg, { id: 'profile-error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium mb-6 group text-sm"
        id="profile-back-btn"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Summary Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 flex flex-col items-center text-center space-y-5"
        >
          {/* Avatar Container with Upload Icon overlay */}
          <div className="relative group w-32 h-32 rounded-full overflow-hidden border-4 border-[#800000]/10 shadow-inner flex items-center justify-center bg-slate-50">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt={user.username} 
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                id="profile-avatar-img"
              />
            ) : (
              <div className="w-full h-full bg-[#800000]/5 text-[#800000] flex items-center justify-center text-4xl font-extrabold">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <label 
              htmlFor="avatar-upload" 
              className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
            >
              <Camera className="w-6 h-6 mb-1 transform translate-y-2 group-hover:translate-y-0 transition-transform" />
              <span className="text-[10px] font-bold">Change Photo</span>
            </label>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900" id="profile-summary-username">{user.username}</h2>
            <div className="flex items-center justify-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-[#800000]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {user.role}
              </span>
            </div>
          </div>

          {/* Karma points metric */}
          {user.role !== 'police' && (
            <div className="w-full bg-amber-50/70 border border-amber-200/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-yellow-100/80 rounded-xl">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-amber-700 font-bold">Karma Points</p>
                  <p className="text-[10px] text-amber-500 font-medium">Your helper reputation</p>
                </div>
              </div>
              <span className="text-2xl font-black text-amber-700" id="profile-karma-points">
                {user.karmaPoints || 0}
              </span>
            </div>
          )}

          {user.role === 'police' && user.policeStationName && (
            <div className="w-full bg-blue-50/70 border border-blue-200/50 rounded-2xl p-4 flex items-center space-x-3 shadow-sm text-left">
              <div className="p-2 bg-blue-100/80 rounded-xl">
                <Building className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-700 font-bold">Station Assignment</p>
                <p className="text-sm font-extrabold text-blue-900 mt-0.5" id="profile-summary-station">
                  {user.policeStationName}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Right Side: Settings Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 sm:p-8"
        >
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h1 className="text-xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-xs text-slate-500 mt-1">Update your account credentials and personal details</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Username Field */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" htmlFor="username-input">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] transition-all outline-none text-sm text-gray-900 bg-gray-50 focus:bg-white"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" htmlFor="email-input">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] transition-all outline-none text-sm text-gray-900 bg-gray-50 focus:bg-white"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" htmlFor="password-input">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] transition-all outline-none text-sm text-gray-900 bg-gray-50 focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" htmlFor="confirm-password-input">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="confirm-password-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] transition-all outline-none text-sm text-gray-900 bg-gray-50 focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Police Station name if police */}
            {user.role === 'police' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" htmlFor="police-station-input">
                  Police Station Name
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="police-station-input"
                    type="text"
                    value={policeStationName}
                    onChange={(e) => setPoliceStationName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] transition-all outline-none text-sm text-gray-900 bg-gray-50 focus:bg-white"
                    placeholder="Enter assigned police station"
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="border-t border-slate-100 pt-5 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center px-6 py-3 bg-[#800000] hover:bg-[#600000] text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-[#800000]/10 hover:shadow-[#800000]/25 active:scale-95 disabled:opacity-75 disabled:active:scale-100"
                id="profile-save-btn"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

      </div>
    </div>
  );
};

export default ProfilePage;
