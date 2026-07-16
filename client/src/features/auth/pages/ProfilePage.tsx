import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import Swal from 'sweetalert2';
import { Camera, User, Award, Shield, ArrowLeft, Check, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      if (user.profilePicture) {
        const fullUrl = user.profilePicture.startsWith('http')
          ? user.profilePicture
          : `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000'}${user.profilePicture}`;
        setPreviewUrl(fullUrl);
      }
    } else {
      // Redirect to login if not logged in
      navigate('/login');
    }
  }, [user, navigate]);

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
      Swal.fire({
        title: 'Error',
        text: 'Username cannot be empty.',
        icon: 'error',
        confirmButtonColor: '#800000',
      });
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await fetchMe(); // Refresh profile state in Context

      Swal.fire({
        title: 'Success!',
        text: response.data.message || 'Profile updated successfully.',
        icon: 'success',
        confirmButtonColor: '#800000',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Failed to update profile.';
      Swal.fire({
        title: 'Update Failed',
        text: errMsg,
        icon: 'error',
        confirmButtonColor: '#800000',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto my-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-5 h-5 mr-1.5 transition-transform group-hover:-translate-x-1" />
        <span className="font-semibold text-sm">Back</span>
      </button>

      {/* Profile Card Container */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header decoration */}
        <div className="h-32 bg-gradient-to-r from-[#800000] to-[#500000] relative">
          <div className="absolute right-6 top-6 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center text-white space-x-1.5 shadow-sm">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-extrabold tracking-wider uppercase">{user.role}</span>
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="px-6 pb-8 relative">
          {/* Avatar Container */}
          <div className="flex justify-between items-end -mt-16 mb-6">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white bg-slate-100 shadow-lg relative flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-[#800000] text-white flex items-center justify-center font-bold text-4xl">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Overlay Edit Button */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#800000] text-white p-2 rounded-2xl border-4 border-white shadow-md group-hover:bg-[#600000] transition-colors">
                <Camera className="w-4 h-4" />
              </div>
            </div>

            {/* Hidden Input File */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Trust Score / Karma Badge */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <p className="text-xs text-gray-400 mt-2 font-medium">
                Changing your username will affect how you appear on items posted and messages.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center space-x-2 bg-[#800000] hover:bg-[#600000] text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg shadow-[#800000]/20 hover:shadow-xl hover:shadow-[#800000]/30 transition-all duration-150 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
