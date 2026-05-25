import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const { registerUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !confirmPassword) {
      toast.error('Please fill in all fields', { id: 'reg-error-fields' });
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match!', { id: 'reg-error-match' });
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser(username, password);
    } catch (error) {
      // Backend validation/errors handled globally via SweetAlert
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
        className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#800000]/10 rounded-2xl flex items-center justify-center mx-auto mb-5 rotate-3 hover:rotate-0 transition-transform">
            <UserPlus className="w-7 h-7 text-[#800000]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create an Account</h2>
          <p className="text-gray-500 mt-2 text-sm font-medium">Join the SL-SLFMS portal today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] transition-all outline-none text-gray-900 bg-gray-50 focus:bg-white"
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] transition-all outline-none text-gray-900 bg-gray-50 focus:bg-white"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] transition-all outline-none text-gray-900 bg-gray-50 focus:bg-white"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#800000] text-white font-medium py-3 rounded-xl hover:bg-[#600000] transition-all shadow-lg shadow-[#800000]/20 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 mt-6"
          >
            {isSubmitting ? 'Registering...' : 'Register Account'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm font-medium text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-[#800000] hover:text-[#600000] hover:underline transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
