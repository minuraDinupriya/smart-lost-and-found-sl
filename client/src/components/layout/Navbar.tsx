import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { Search, User, LogOut, PackageSearch, MessageSquare } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        try {
          const res = await api.get('/messages/unread-count');
          setUnreadCount(res.data.count);
        } catch (error) {
          console.error("Failed to fetch unread count:", error);
        }
      };
      fetchUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      const handleGlobalNotification = () => {
        setUnreadCount(prev => prev + 1);
      };
      socket.on('global_notification', handleGlobalNotification);
      return () => {
        socket.off('global_notification', handleGlobalNotification);
      };
    }
  }, [socket]);

  return (
    <nav className="backdrop-blur-md bg-white/75 border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo & Brand */}
          <a href="/" className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity">
            <div className="p-1.5 bg-[#800000]/5 rounded-xl">
              <PackageSearch className="w-7 h-7 text-[#800000]" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">
              Smart Lost <span className="text-[#800000]">&</span> Found
            </span>
          </a>

          {/* Navigation Links & Auth Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Icon Placeholder */}
            <button className="p-2 text-gray-500 hover:text-[#800000] transition-colors rounded-full hover:bg-gray-50 hidden sm:block">
              <Search className="w-5 h-5" />
            </button>

            {user ? (
              <div className="flex items-center space-x-4 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-gray-100">
                <div className="flex items-center space-x-2 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full border border-yellow-200">
                  <span className="text-sm font-bold">🏆 {user.karmaPoints || 0} Trust Score</span>
                </div>
                <Link
                  to="/inbox"
                  className="relative flex items-center text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200/60 transition-colors shadow-sm mr-2"
                  title="Inbox"
                  onClick={() => setUnreadCount(0)} // Optimistically clear badge when opened
                >
                  <MessageSquare className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:block">Inbox</span>
                  
                  {/* WhatsApp-style pulsating unread badge */}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[9px] font-bold items-center justify-center ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </span>
                  )}
                </Link>
                <Link
                  to="/post"
                  className="hidden md:flex items-center text-sm bg-gradient-to-r from-[#800000] to-[#b30000] hover:shadow-lg hover:shadow-red-900/20 transition-all duration-300 transform hover:-translate-y-0.5 text-white shadow-md font-semibold px-4 py-2 rounded-xl"
                >
                  + Post Item
                </Link>
                <div className="flex items-center space-x-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 rounded-full px-4 py-1.5 transition-colors">
                  <User className="w-4 h-4 text-[#800000]" />
                  <span className="max-w-[100px] truncate">{user.username}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:block ml-1">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-gray-100">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-[#800000] px-3 py-2 rounded-xl transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium bg-[#800000] text-white px-5 py-2.5 rounded-xl hover:bg-[#600000] transition-all shadow-lg shadow-[#800000]/20 active:scale-95"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
