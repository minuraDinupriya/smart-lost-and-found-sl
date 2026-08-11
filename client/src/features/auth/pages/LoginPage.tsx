import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

const LoginPage: React.FC = () => {
  const { loginUser, loginWithGoogle } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please fill in all fields', { id: 'login-error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await loginUser(username, password);
    } catch (error) {
      // API errors handled by SweetAlert in the AuthContext globally
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-8 sm:p-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#800000]/10 rounded-2xl flex items-center justify-center mx-auto mb-5 rotate-3 hover:rotate-0 transition-transform">
            <LogIn className="w-7 h-7 text-[#800000]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Welcome Back</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm font-medium">Sign in to access your portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] transition-all outline-none text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] transition-all outline-none text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800"
              placeholder="••••••••"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400" htmlFor="showPassword">
              <input
                id="showPassword"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="h-4 w-4 accent-[#800000]"
              />
              Show password
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#800000] text-white font-medium py-3 rounded-xl hover:bg-[#600000] transition-all shadow-lg shadow-[#800000]/20 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 mt-2"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="relative mt-8 mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-slate-600"></div>
          </div>
          <div className="relative flex justify-center text-sm font-medium">
            <span className="px-4 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400">Or continue with</span>
          </div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={credentialResponse => {
              if (credentialResponse.credential) {
                loginWithGoogle(credentialResponse.credential);
              }
            }}
            onError={() => {
              toast.error('Google Login Failed', { id: 'google-error' });
            }}
            theme="outline"
            size="large"
            shape="rectangular"
            width="100%"
          />
        </div>

        <p className="text-center mt-8 text-sm font-medium text-gray-500 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#800000] hover:text-[#600000] hover:underline transition-colors">
            Register here
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
