import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { Search, LogOut, PackageSearch, MessageSquare, ShieldCheck, BarChart3, Globe, Menu, X, PlusCircle, Building, Wallet, User as UserIcon, Archive, ShieldAlert, Map as MapIcon, Filter, ChevronLeft, Home, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [navSearch, setNavSearch] = useState(searchParams.get('q') || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (navSearch) {
      newParams.set('q', navSearch);
    } else {
      newParams.delete('q');
    }
    navigate(`/?${newParams.toString()}`);
  };

  const handleFilterClick = () => {
    const newParams = new URLSearchParams(searchParams);
    if (navSearch) {
      newParams.set('q', navSearch);
    } else {
      newParams.delete('q');
    }
    
    if (newParams.get('openFilter') === 'true') {
      newParams.delete('openFilter');
    } else {
      newParams.set('openFilter', 'true');
    }
    
    navigate(`/?${newParams.toString()}`);
  };

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
      const handleGlobalNotification = (data: any) => {
        if (data && (data.type === 'TIP_RECEIVED' || data.type === 'TIP_SENT')) {
          toast.success(data.text || data.message || 'Reward Tip Notification!', {
            icon: '🏆',
            duration: 6000,
          });
        } else {
          setUnreadCount(prev => prev + 1);
        }
      };
      socket.on('global_notification', handleGlobalNotification);
      return () => {
        socket.off('global_notification', handleGlobalNotification);
      };
    }
  }, [socket]);

  return (
    <>
      <nav className="backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Navigation Controls & Logo */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {location.pathname !== '/' && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-gray-50 text-gray-600 hover:text-[#800000] hover:bg-red-50 rounded-xl transition-colors border border-gray-100 shadow-sm mr-2"
                title="Go Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            
            {/* Logo & Brand */}
            <a href="/" className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity">
            <div className="p-1.5 bg-[#800000]/5 rounded-xl">
              <PackageSearch className="w-7 h-7 text-[#800000]" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-gray-100 hidden sm:block">
              Smart Lost <span className="text-[#800000] dark:text-red-400">&</span> Found
            </span>
            </a>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-6 lg:mx-10">
            <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by item name or description..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                className="w-full pl-12 pr-14 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-all bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-sm shadow-sm"
              />
              <button
                type="button"
                onClick={handleFilterClick}
                className="absolute right-2 p-1.5 text-gray-400 hover:text-[#800000] hover:bg-red-50 rounded-full transition-colors"
                title="Search & Filter"
              >
                <Filter className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Right Side: Lang + Auth + Desktop Links + Hamburger */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            
            {/* Language Switcher */}
            <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 transition-colors shadow-sm">
              <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-1.5" />
              <select 
                value={i18n.language} 
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="en" className="dark:bg-slate-800 text-gray-900 dark:text-gray-100">EN</option>
                <option value="si" className="dark:bg-slate-800 text-gray-900 dark:text-gray-100">SI</option>
                <option value="ta" className="dark:bg-slate-800 text-gray-900 dark:text-gray-100">TA</option>
              </select>
            </div>





            {user ? (
              <div className="flex items-center space-x-3 sm:space-x-5">
                {/* Desktop Navigation (Hidden on Mobile) */}
                <div className="hidden lg:flex items-center space-x-4">
                  
                  {/* Inbox Section */}
                  <Link
                    to="/inbox"
                    className="relative flex items-center justify-center p-2 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full border border-gray-200 dark:border-slate-700 transition-colors shadow-sm"
                    title={t('nav.inbox')}
                    onClick={() => setUnreadCount(0)}
                  >
                    <MessageSquare className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[9px] font-bold items-center justify-center ring-2 ring-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      </span>
                    )}
                  </Link>



                  {/* Post Item Section */}
                  {user.role !== 'police' && (
                    <>
                      <Link to="/post" className="flex items-center bg-[#800000] text-white px-5 py-2 rounded-full font-bold hover:bg-[#600000] transition-all shadow-md shadow-[#800000]/20 whitespace-nowrap">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        {t('nav.postItem')}
                      </Link>
                      
                    </>
                  )}
                  
                  {/* Profile Section */}
                  <div className="relative group">
                    <button className="flex items-center space-x-2.5 bg-white border border-gray-200 rounded-full py-1.5 pl-1.5 pr-4 hover:bg-gray-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20">
                      {user.profilePicture ? (
                        <img 
                          src={user.profilePicture.startsWith('http') ? user.profilePicture : `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000'}${user.profilePicture}`} 
                          alt="Profile" 
                          className="w-7 h-7 rounded-full object-cover border border-gray-200" 
                        />
                      ) : (
                        <div className="w-7 h-7 bg-[#800000] text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-gray-700 text-sm max-w-[120px] truncate hidden xl:block">{user.username}</span>
                    </button>
                    
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                      <div className="p-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                        <p className="text-sm font-bold text-gray-900 truncate">{user.username}</p>
                        {user.role !== 'police' && (
                          <p className="text-xs text-amber-600 font-bold mt-1">🏆 {user.karmaPoints || 0} {t('nav.trustScore')}</p>
                        )}
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        {user.role !== 'police' && (
                          <Link 
                            to="/tips/history" 
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 font-semibold hover:bg-gray-50 rounded-lg flex items-center transition-colors"
                          >
                            <Wallet className="w-4 h-4 mr-2 text-amber-500" />
                            Tip History
                          </Link>
                        )}
                        <Link
                          to="/profile"
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 font-semibold hover:bg-gray-50 rounded-lg flex items-center transition-colors"
                        >
                          <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
                          Profile
                        </Link>
                        <Link
                          to="/archived"
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 font-semibold hover:bg-gray-50 rounded-lg flex items-center transition-colors"
                        >
                          <Archive className="w-4 h-4 mr-2 text-gray-500" />
                          {t('nav.archivedItems')}
                        </Link>
                        {user.role !== 'police' && (
                          <Link
                            to="/hotspots"
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 font-semibold hover:bg-gray-50 rounded-lg flex items-center transition-colors"
                          >
                            <MapIcon className="w-4 h-4 mr-2 text-gray-500" />
                            Hotspots Map
                          </Link>
                        )}
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button 
                          onClick={logout}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 font-bold hover:bg-red-50 rounded-lg flex items-center transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Universal Hamburger Menu Button */}
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 text-gray-600 hover:text-[#800000] hover:bg-gray-100 rounded-xl transition-all focus:outline-none border border-transparent hover:border-gray-200 shadow-sm"
                >
                  <Menu className="w-6 h-6" />
                </button>
                
              </div>
            ) : (
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Link
                  to="/login"
                  className="text-sm font-bold text-gray-600 hover:text-[#800000] px-4 py-2 rounded-xl transition-colors hover:bg-gray-50"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-bold bg-[#800000] text-white px-5 py-2.5 rounded-full hover:bg-[#600000] transition-all shadow-md shadow-[#800000]/20 active:scale-95 whitespace-nowrap"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      </nav>

      {/* Side Drawer Overlay */}
      {user && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Universal Side Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-80 sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto flex flex-col`}
      >
        {user && (
          <>
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 sticky top-0 z-10">
              <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">Menu</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-5 flex-1">
              {/* User Profile Summary */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture.startsWith('http') ? user.profilePicture : `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000'}${user.profilePicture}`} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-slate-600" 
                  />
                ) : (
                  <div className="w-12 h-12 bg-[#800000] text-white rounded-full flex items-center justify-center font-bold text-xl">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 truncate text-base">{user.username}</p>
                  {user.role !== 'police' && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-500 font-bold bg-yellow-100/50 dark:bg-yellow-900/30 inline-block px-2 py-0.5 rounded-full mt-1">🏆 {user.karmaPoints || 0} {t('nav.trustScore')}</p>
                  )}
                </div>
              </div>

              {/* Theme Selection */}
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center">
                    <Moon className="w-4 h-4 mr-2" /> Theme
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setTheme('light')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex justify-center items-center transition-colors ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-[#800000] dark:text-red-400 shadow-sm border border-gray-200 dark:border-slate-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>Light</button>
                  <button onClick={() => setTheme('dark')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex justify-center items-center transition-colors ${theme === 'dark' ? 'bg-white dark:bg-slate-700 text-[#800000] dark:text-red-400 shadow-sm border border-gray-200 dark:border-slate-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>Dark</button>
                  <button onClick={() => setTheme('system')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex justify-center items-center transition-colors ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-[#800000] dark:text-red-400 shadow-sm border border-gray-200 dark:border-slate-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>System</button>
                </div>
              </div>

              {/* Navigation Grid */}
              <div className="grid grid-cols-2 gap-3">
                {user.role !== 'police' && (
                  <Link to="/smart-tags" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors">
                    <ShieldCheck className="w-6 h-6 mb-2" />
                    <span className="text-sm font-semibold text-center">{t('nav.smartTags')}</span>
                  </Link>
                )}
                {user.role === 'police' && (
                  <Link to="/police-dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors">
                    <Building className="w-6 h-6 mb-2" />
                    <span className="text-sm font-semibold text-center">Station Dashboard</span>
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition-colors">
                    <ShieldAlert className="w-6 h-6 mb-2 text-red-600" />
                    <span className="text-sm font-bold text-center">Admin Panel</span>
                  </Link>
                )}
                {user.role !== 'police' && (
                  <Link to="/analytics" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors">
                    <BarChart3 className="w-6 h-6 mb-2" />
                    <span className="text-sm font-semibold text-center">{t('nav.analytics')}</span>
                  </Link>
                )}
                {user.role !== 'police' && (
                  <Link to="/hotspots" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors">
                    <MapIcon className="w-6 h-6 mb-2" />
                    <span className="text-sm font-semibold text-center">Hotspots Map</span>
                  </Link>
                )}
                
                {/* On mobile devices, we show inbox & post item in the drawer since they are hidden in the nav. On desktop they are redundant but harmless. */}
                <Link to="/inbox" onClick={() => { setIsMobileMenuOpen(false); setUnreadCount(0); }} className="relative flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors lg:hidden">
                  <MessageSquare className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold text-center">{t('nav.inbox')}</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-3 right-8 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                
                <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                  <UserIcon className="w-6 h-6 mb-2 text-slate-500" />
                  <span className="text-sm font-semibold text-center">Profile</span>
                </Link>
                <Link to="/archived" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-red-50/50 text-[#800000] rounded-xl border border-red-100 hover:bg-red-50 transition-colors">
                  <Archive className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold text-center">{t('nav.archivedItems')}</span>
                </Link>
                
                {user.role !== 'police' && (
                  <Link to="/post" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-[#800000]/10 text-[#800000] rounded-xl border border-[#800000]/20 hover:bg-[#800000]/20 transition-colors lg:hidden">
                    <PlusCircle className="w-6 h-6 mb-2" />
                    <span className="text-sm font-bold text-center">{t('nav.postItem')}</span>
                  </Link>
                )}
                {user.role !== 'police' && (
                  <Link to="/tips/history" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors col-span-2">
                    <Wallet className="w-6 h-6 mb-2" />
                    <span className="text-sm font-semibold text-center">Tip History</span>
                  </Link>
                )}
              </div>

              <div className="pt-4 mt-auto">
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                  className="w-full flex items-center justify-center space-x-2 p-3.5 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-100 active:scale-95 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Navbar;
