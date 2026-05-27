import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';

import DashboardPage from './features/items/pages/DashboardPage';
import QRTagsPage from './features/items/pages/QRTagsPage';
import PostItemPage from './features/items/pages/PostItemPage';
import EditItemPage from './features/items/pages/EditItemPage';
import ItemDetailPage from './features/items/pages/ItemDetailPage';
import AnalyticsPage from './features/items/pages/AnalyticsPage';
import ChatPage from './features/chat/pages/ChatPage';
import InboxPage from './features/chat/pages/InboxPage';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50/50 text-gray-900 font-sans flex flex-col tracking-tight antialiased">
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

          {/* Analytics Route */}
          <Route path="/analytics" element={<AnalyticsPage />} />

          <Route path="/chat/:itemId" element={<ChatPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
