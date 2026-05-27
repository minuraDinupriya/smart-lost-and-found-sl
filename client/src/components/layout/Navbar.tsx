import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { Search, LogOut, PackageSearch, MessageSquare, ShieldCheck, BarChart3, Globe, Menu, X, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { t, i18n } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('app_language', lng);
  };

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
    <nav className="backdrop-blur-md bg-white/90 border-b border-slate-100 sticky top-0 z-50">
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

          {/* Right Side: Lang + Auth + Desktop Links + Hamburger */}
          <div className="flex items-center space-x-3">
            
            {/* Language Switcher */}
            <div className="relative flex items-center bg-gray-100 rounded-full px-2 py-1 border border-gray-200">
              <Globe className="w-4 h-4 text-gray-500 mr-1" />
              <select 
                value={i18n.language} 
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="en">English</option>
                <option value="si">සිංහල</option>
                <option value="ta">தமிழ்</option>
              </select>
            </div>

            {user ? (
              <div className="flex items-center space-x-4 pl-2 sm:pl-4 border-l border-gray-100">
                {/* Desktop Navigation (Hidden on Mobile) */}
                <div className="hidden lg:flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full border border-yellow-200">
                    <span className="text-sm font-bold">🏆 {user.karmaPoints || 0} {t('nav.trustScore')}</span>
                  </div>
                  <Link
                    to="/smart-tags"
                    className="relative flex items-center text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 hover:border-emerald-200 border border-emerald-200/60 transition-colors shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    <span>{t('nav.smartTags')}</span>
                  </Link>
                  <Link
                    to="/analytics"
                    className="relative flex items-center text-sm font-medium text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 hover:border-indigo-200 border border-indigo-200/60 transition-colors shadow-sm"
                  >
                    <BarChart3 className="w-4 h-4 mr-1.5" />
                    <span>{t('nav.analytics')}</span>
                  </Link>
                  <Link
                    to="/inbox"
                    className="relative flex items-center text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200/60 transition-colors shadow-sm"
                    title={t('nav.inbox')}
                    onClick={() => setUnreadCount(0)}
                  >
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    <span>{t('nav.inbox')}</span>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[9px] font-bold items-center justify-center ring-2 ring-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      </span>
                    )}
                  </Link>
                  <Link to="/post" className="bg-[#800000] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#600000] transition shadow-md shadow-[#800000]/20 whitespace-nowrap">
                    {t('nav.postItem')}
                  </Link>
                  
                  {/* User Dropdown (Desktop Only) */}
                  <div className="relative group">
                    <button className="flex items-center space-x-2 bg-white border border-gray-200 rounded-full py-1.5 px-3 hover:bg-gray-50 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20">
                      <div className="w-7 h-7 bg-[#800000] text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-700 text-sm max-w-[100px] truncate">{user.username}</span>
                    </button>
                    
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                      <div className="p-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
                        <p className="text-xs text-gray-500 font-bold">🏆 {user.karmaPoints || 0} {t('nav.trustScore')}</p>
                      </div>
                      <div className="p-1">
                        <button 
                          onClick={logout}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-semibold hover:bg-red-50 rounded-lg flex items-center transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Menu Button (Hamburger) */}
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 text-gray-600 hover:text-[#800000] hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
                
              </div>
            ) : (
              <div className="flex items-center space-x-3 pl-2 sm:pl-4 border-l border-gray-100">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-[#800000] px-2 sm:px-3 py-2 rounded-xl transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium bg-[#800000] text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-[#600000] transition-all shadow-lg shadow-[#800000]/20 active:scale-95 whitespace-nowrap"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {user && isMobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-200 shadow-xl z-40 px-4 py-4 space-y-4">
          <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-10 h-10 bg-[#800000] text-white rounded-full flex items-center justify-center font-bold text-lg">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{user.username}</p>
              <p className="text-xs text-yellow-600 font-bold">🏆 {user.karmaPoints || 0} {t('nav.trustScore')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link to="/smart-tags" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <ShieldCheck className="w-6 h-6 mb-1" />
              <span className="text-sm font-semibold">{t('nav.smartTags')}</span>
            </Link>
            <Link to="/analytics" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <BarChart3 className="w-6 h-6 mb-1" />
              <span className="text-sm font-semibold">{t('nav.analytics')}</span>
            </Link>
            <Link to="/inbox" onClick={() => { setIsMobileMenuOpen(false); setUnreadCount(0); }} className="relative flex flex-col items-center justify-center p-3 bg-slate-50 text-slate-700 rounded-xl border border-slate-200">
              <MessageSquare className="w-6 h-6 mb-1" />
              <span className="text-sm font-semibold">{t('nav.inbox')}</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-6 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link to="/post" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-3 bg-[#800000]/10 text-[#800000] rounded-xl border border-[#800000]/20">
              <PlusCircle className="w-6 h-6 mb-1" />
              <span className="text-sm font-bold">{t('nav.postItem')}</span>
            </Link>
          </div>

          <button 
            onClick={() => { setIsMobileMenuOpen(false); logout(); }}
            className="w-full flex items-center justify-center space-x-2 mt-4 p-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 active:scale-95 transition-transform"
          >
            <LogOut className="w-5 h-5" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
