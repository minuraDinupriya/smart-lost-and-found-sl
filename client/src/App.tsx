import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ProfilePage from './features/auth/pages/ProfilePage';
import LeaderboardPage from './features/auth/pages/LeaderboardPage';

import DashboardPage from './features/items/pages/DashboardPage';
import QRTagsPage from './features/items/pages/QRTagsPage';
import PostItemPage from './features/items/pages/PostItemPage';
import EditItemPage from './features/items/pages/EditItemPage';
import ItemDetailPage from './features/items/pages/ItemDetailPage';
import AnalyticsPage from './features/items/pages/AnalyticsPage';
import HotspotMapPage from './features/items/pages/HotspotMapPage';
import ArchivedItemsPage from './features/items/pages/ArchivedItemsPage';
import PoliceDashboardPage from './features/police/pages/PoliceDashboardPage';
import AdminDashboardPage from './features/admin/pages/AdminDashboardPage';
import ChatPage from './features/chat/pages/ChatPage';
import InboxPage from './features/chat/pages/InboxPage';
// Reward Tip Pages
import NewTipPage from './features/tips/pages/NewTipPage';
import PaymentPage from './features/tips/pages/PaymentPage';
import SuccessPage from './features/tips/pages/SuccessPage';
import FailedPage from './features/tips/pages/FailedPage';
import TipHistoryPage from './features/tips/pages/TipHistoryPage';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 font-sans flex flex-col tracking-tight antialiased transition-colors duration-200">
      {/* Global Hot Toast Configuration */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'rounded-xl shadow-lg font-medium border border-gray-100',
          duration: 4000,
        }}
      />

      {/* Top Navigation */}
      <Navbar />

      {/* Main Routing View */}
      <main className="flex-grow container mx-auto px-4 py-8">
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
      </main>
    </div>
  );
};

export default App;
