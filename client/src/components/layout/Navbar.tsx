import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  BarChart3,
  Building,
  ChevronDown,
  Globe,
  LogOut,
  MapPin,
  MessageSquare,
  Monitor,
  Moon,
  PackageSearch,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Sun,
  Trophy,
  User,
  Wallet,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const userId = user?._id;
  const { socket } = useSocket();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    let active = true;
    api
      .get('/messages/unread-count')
      .then((response) => {
        if (active) setUnreadCount(response.data.count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);
  useEffect(() => {
    if (!socket) return;
    const onNotification = (data: any) => {
      if (data?.type === 'TIP_RECEIVED' || data?.type === 'TIP_SENT')
        toast.success(data.text || data.message || 'Reward update');
      else setUnreadCount((count) => count + 1);
    };
    socket.on('global_notification', onNotification);
    return () => {
      socket.off('global_notification', onNotification);
    };
  }, [socket]);
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const menuLinks = [
    { to: '/profile', label: t('nav.profile'), icon: User },
    ...(user?.role === 'police'
      ? [{ to: '/police-dashboard', label: t('nav.stationDashboard'), icon: Building }]
      : [
          { to: '/smart-tags', label: t('nav.smartTags'), icon: ShieldCheck },
          { to: '/analytics', label: t('nav.analytics'), icon: BarChart3 },
          { to: '/hotspots', label: t('ui.hotspots'), icon: MapPin },
          { to: '/leaderboard', label: t('ui.leaderboard'), icon: Trophy },
          { to: '/tips/history', label: t('ui.tipHistory'), icon: Wallet },
        ]),
    { to: '/archived', label: t('nav.archivedItems'), icon: Archive },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: t('ui.admin'), icon: ShieldAlert }] : []),
  ];
  const navigationClass = ({ isActive }: { isActive: boolean }) =>
    'ui-quiet ' + (isActive ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : '');

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-1 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 rounded-lg"
            aria-label="Smart Lost and Found home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              <PackageSearch className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="hidden text-lg font-bold tracking-tight sm:block">
              Smart Lost <span className="text-brand-700 dark:text-brand-300">&</span> Found
            </span>
          </Link>
          <nav aria-label={t('ui.mainNavigation')} className="hidden items-center gap-1 lg:flex">
            <NavLink to="/" end className={navigationClass}>
              {t('ui.browse')}
            </NavLink>
            {user && (
              <NavLink to="/inbox" className={navigationClass} onClick={() => setUnreadCount(0)}>
                {t('nav.inbox')}
                {unreadCount > 0 && (
                  <span className="rounded-full bg-brand-700 px-1.5 py-0.5 text-xs text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                    <span className="sr-only"> {t('ui.unread')}</span>
                  </span>
                )}
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {user?.role !== 'police' && (
            <Link to="/post" className="ui-primary mr-1 hidden xl:inline-flex">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('ui.reportItem')}
            </Link>
          )}
          {user && (
            <Link
              to="/inbox"
              className="ui-quiet relative h-11 w-11 px-0 lg:hidden"
              aria-label={
                t('nav.inbox') +
                (unreadCount ? ' (' + unreadCount + ' ' + t('ui.unread') + ')' : '')
              }
              onClick={() => setUnreadCount(0)}
            >
              <MessageSquare className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-600" />
              )}
            </Link>
          )}
          <div className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 px-2 dark:border-slate-700">
            <Globe className="hidden h-4 w-4 text-slate-500 sm:block" aria-hidden="true" />
            <select
              aria-label={t('ui.language')}
              value={i18n.language.split('-')[0]}
              onChange={(event) => {
                i18n.changeLanguage(event.target.value);
                localStorage.setItem('app_language', event.target.value);
              }}
              className="min-h-[42px] w-14 cursor-pointer sm:w-auto rounded-lg bg-transparent pr-1 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="en">EN</option>
              <option value="si">සිං</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>
          <button
            type="button"
            aria-label={t('ui.changeTheme', { theme: t('nav.' + theme) })}
            title={t('ui.changeTheme', { theme: t('nav.' + theme) })}
            className="ui-quiet h-11 w-11 px-0"
            onClick={() =>
              setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
            }
          >
            {theme === 'light' ? (
              <Sun className="h-5 w-5" />
            ) : theme === 'dark' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
          </button>
          {user ? (
            <div
              ref={menuRef}
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setMenuOpen(false);
              }}
            >
              <button
                ref={triggerRef}
                type="button"
                aria-label={t('ui.accountMenu')}
                aria-expanded={menuOpen}
                aria-controls="account-navigation"
                onClick={() => setMenuOpen((value) => !value)}
                className="ui-secondary gap-2 px-2 sm:px-3"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                  aria-hidden="true"
                >
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="hidden max-w-[110px] truncate text-sm xl:block">
                  {user.username}
                </span>
                <ChevronDown className="hidden h-4 w-4 sm:block" aria-hidden="true" />
              </button>
              {menuOpen && (
                <nav
                  id="account-navigation"
                  aria-label={t('ui.accountMenu')}
                  className="ui-panel absolute right-0 top-full mt-3 max-h-[calc(100dvh-6rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-2 shadow-lg"
                >
                  <div className="mb-2 border-b border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{user.username}</p>
                      <button
                        type="button"
                        className="ui-quiet h-9 min-h-9 w-9 px-0"
                        aria-label={t('ui.closeMenu')}
                        onClick={() => {
                          setMenuOpen(false);
                          triggerRef.current?.focus();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {user.role !== 'police' && (
                      <p className="ui-muted mt-1 text-sm">
                        {user.karmaPoints || 0} {t('nav.trustScore')}
                      </p>
                    )}
                  </div>
                  <Link to="/" className="ui-quiet w-full justify-start">
                    <PackageSearch className="h-4 w-4" />
                    {t('ui.browse')}
                  </Link>
                  {user.role !== 'police' && (
                    <Link to="/post" className="ui-quiet w-full justify-start">
                      <Plus className="h-4 w-4" />
                      {t('ui.reportItem')}
                    </Link>
                  )}
                  {menuLinks.map(({ to, label, icon: Icon }) => (
                    <Link key={to} to={to} className="ui-quiet w-full justify-start">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </Link>
                  ))}
                  <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="ui-quiet w-full justify-start text-red-700 dark:text-red-300"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav.logout')}
                    </button>
                  </div>
                </nav>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link to="/login" className="ui-quiet">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="ui-primary hidden md:inline-flex">
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default Navbar;
