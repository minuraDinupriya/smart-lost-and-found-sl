import React, { lazy, Suspense } from 'react';
import { MotionConfig } from 'framer-motion';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Navbar from './components/layout/Navbar';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ProfilePage from './features/auth/pages/ProfilePage';
import LeaderboardPage from './features/auth/pages/LeaderboardPage';

import DashboardPage from './features/items/pages/DashboardPage';
import PostItemPage from './features/items/pages/PostItemPage';
import EditItemPage from './features/items/pages/EditItemPage';
import ItemDetailPage from './features/items/pages/ItemDetailPage';
import HotspotMapPage from './features/items/pages/HotspotMapPage';
import ArchivedItemsPage from './features/items/pages/ArchivedItemsPage';
import ChatPage from './features/chat/pages/ChatPage';
import InboxPage from './features/chat/pages/InboxPage';
// Reward Tip Pages
import NewTipPage from './features/tips/pages/NewTipPage';
import PaymentPage from './features/tips/pages/PaymentPage';
import SuccessPage from './features/tips/pages/SuccessPage';
import FailedPage from './features/tips/pages/FailedPage';
import TipHistoryPage from './features/tips/pages/TipHistoryPage';

const QRTagsPage = lazy(() => import('./features/items/pages/QRTagsPage'));
const AnalyticsPage = lazy(() => import('./features/items/pages/AnalyticsPage'));
const PoliceDashboardPage = lazy(() => import('./features/police/pages/PoliceDashboardPage'));
const AdminDashboardPage = lazy(() => import('./features/admin/pages/AdminDashboardPage'));

const App: React.FC = () => {
  const { t } = useTranslation();

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col antialiased transition-colors duration-200">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-brand-700 focus:px-4 focus:py-3 focus:text-white">{t('skipToContent')}</a>
      {/* Global Hot Toast Configuration */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'rounded-xl shadow-lg font-medium border border-slate-200 dark:border-slate-700 dark:!bg-slate-800 dark:!text-slate-100',
          duration: 4000,
        }}
      />

      {/* Top Navigation */}
      <Navbar />

      {/* Main Routing View */}
      <main id="main-content" tabIndex={-1} className="flex-grow w-full max-w-7xl mx-auto [overflow-wrap:anywhere] px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <Suspense
          fallback={<p role="status" className="ui-muted p-8 text-center">{t('common.loading')}</p>}
        >
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/post" element={<PostItemPage />} />
            <Route path="/edit/:itemId" element={<EditItemPage />} />
            <Route path="/items/:itemId" element={<ItemDetailPage />} />

            {/* Protected Smart Tags Route */}
            <Route path="/smart-tags" element={<QRTagsPage />} />

            {/* Archived Items Route */}
            <Route path="/archived" element={<ArchivedItemsPage />} />

            {/* Analytics Route */}
            <Route path="/analytics" element={<AnalyticsPage />} />

            {/* Hotspots Route */}
            <Route path="/hotspots" element={<HotspotMapPage />} />

            {/* Gamification Route */}
            <Route path="/leaderboard" element={<LeaderboardPage />} />

            {/* Police Dashboard */}
            <Route path="/police-dashboard" element={<PoliceDashboardPage />} />

            {/* Admin Dashboard */}
            <Route path="/admin" element={<AdminDashboardPage />} />

            <Route path="/chat/:itemId/:otherUserId" element={<ChatPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Reward Tip Routes */}
            <Route path="/tips/new/:returnRecordId" element={<NewTipPage />} />
            <Route path="/tips/payment/:tipId" element={<PaymentPage />} />
            <Route path="/tips/success" element={<SuccessPage />} />
            <Route path="/tips/failed" element={<FailedPage />} />
            <Route path="/tips/history" element={<TipHistoryPage />} />

          </Routes>
        </Suspense>
      </main>
    </div>
    </MotionConfig>
  );
};

export default App;
