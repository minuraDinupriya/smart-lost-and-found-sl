import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  getAdminStats,
  getAdminItems,
  updateAdminItemStatus,
  deleteAdminItem,
  getAdminUsers,
  updateAdminUserRole,
  deleteAdminUser,
  AdminStats,
  AdminItem,
  AdminUser,
} from '../../../services/adminService';
import api from '../../../services/api';
import {
  ShieldAlert,
  LayoutDashboard,
  FileText,
  Users,
  Search,
  Trash2,
  Edit,
  CheckCircle,
  AlertTriangle,
  Archive,
  RefreshCw,
  Eye,
  Filter,
  UserCheck,
  Shield,
  Building,
  Tag,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'users'>('overview');

  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Posts Control State
  const [items, setItems] = useState<AdminItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState<boolean>(false);
  const [itemSearch, setItemSearch] = useState<string>('');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('ALL');
  const [itemStatusFilter, setItemStatusFilter] = useState<string>('ALL');
  const [itemArchiveFilter, setItemArchiveFilter] = useState<string>('ALL');
  const [itemPage, setItemPage] = useState<number>(1);
  const [itemTotalPages, setItemTotalPages] = useState<number>(1);
  const [itemTotalCount, setItemTotalCount] = useState<number>(0);

  // User Management State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userPage, setUserPage] = useState<number>(1);
  const [userTotalPages, setUserTotalPages] = useState<number>(1);
  const [userTotalCount, setUserTotalCount] = useState<number>(0);

  // Selected Item for Detail Modal
  const [selectedItem, setSelectedItem] = useState<AdminItem | null>(null);

  // Check admin authorization
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch Stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      toast.error('Failed to load system statistics.');
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Items
  const fetchItems = async () => {
    setItemsLoading(true);
    try {
      const data = await getAdminItems(
        itemPage,
        15,
        itemSearch,
        itemTypeFilter,
        itemStatusFilter,
        itemArchiveFilter
      );
      setItems(data.items);
      setItemTotalPages(data.totalPages);
      setItemTotalCount(data.totalItems);
    } catch (error) {
      console.error('Failed to fetch admin items:', error);
      toast.error('Failed to load posts.');
    } finally {
      setItemsLoading(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await getAdminUsers(userPage, 15, userSearch, userRoleFilter);
      setUsers(data.users);
      setUserTotalPages(data.totalPages);
      setUserTotalCount(data.totalUsers);
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
      toast.error('Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin' && activeTab === 'posts') {
      fetchItems();
    }
  }, [user, activeTab, itemPage, itemTypeFilter, itemStatusFilter, itemArchiveFilter]);

  useEffect(() => {
    if (user?.role === 'admin' && activeTab === 'users') {
      fetchUsers();
    }
  }, [user, activeTab, userPage, userRoleFilter]);

  // Handle Post Deletion
  const handleDeletePost = (id: string, title: string) => {
    Swal.fire({
      title: 'Remove Post?',
      html: `Are you sure you want to permanently delete post <strong>"${title}"</strong>?<br/><span class="text-red-500 text-sm">This action cannot be undone!</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete Post!',
      cancelButtonText: 'Cancel',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteAdminItem(id);
          toast.success('Post removed successfully.');
          fetchItems();
          fetchStats();
          if (selectedItem?._id === id) setSelectedItem(null);
        } catch (error) {
          toast.error('Failed to delete post.');
        }
      }
    });
  };

  // Handle Post Status Update
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateAdminItemStatus(id, { status: newStatus });
      toast.success(`Post status updated to "${newStatus}"`);
      fetchItems();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update status.');
    }
  };

  // Handle Post Archive Toggle
  const handleToggleArchive = async (id: string, currentArchiveStatus: string) => {
    const newStatus = currentArchiveStatus === 'active' ? 'archived' : 'active';
    try {
      await updateAdminItemStatus(id, { archiveStatus: newStatus });
      toast.success(`Post is now ${newStatus}`);
      fetchItems();
      fetchStats();
    } catch (error) {
      toast.error('Failed to toggle archive status.');
    }
  };

  // Handle User Role Change
  const handleChangeRole = (u: AdminUser) => {
    Swal.fire({
      title: `Update Role for ${u.username}`,
      input: 'select',
      inputOptions: {
        user: 'Regular User',
        police: 'Police Station Officer',
        admin: 'System Administrator',
      },
      inputValue: u.role,
      showCancelButton: true,
      confirmButtonColor: '#800000',
      confirmButtonText: 'Save Role',
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        const newRole = result.value as 'user' | 'police' | 'admin';
        let policeStationName = u.policeStationName || '';

        if (newRole === 'police') {
          const stationPrompt = await Swal.fire({
            title: 'Police Station Name',
            input: 'text',
            inputLabel: 'Enter Police Station Name (e.g. Maharagama Police)',
            inputValue: policeStationName,
            showCancelButton: true,
            inputValidator: (value) => {
              if (!value) return 'Police station name is required for Police role!';
            },
          });
          if (!stationPrompt.isConfirmed) return;
          policeStationName = stationPrompt.value;
        }

        try {
          await updateAdminUserRole(u._id, newRole, policeStationName);
          toast.success(`Updated ${u.username}'s role to ${newRole}`);
          fetchUsers();
          fetchStats();
        } catch (error) {
          toast.error('Failed to update user role.');
        }
      }
    });
  };

  // Handle User Deletion
  const handleDeleteUser = (u: AdminUser) => {
    if (u._id === user?._id) {
      toast.error('You cannot delete your own admin account from here.');
      return;
    }

    Swal.fire({
      title: `Delete User ${u.username}?`,
      text: 'This will permanently remove the user account from the system.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, Delete User',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteAdminUser(u._id);
          toast.success(`User ${u.username} deleted.`);
          fetchUsers();
          fetchStats();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to delete user.');
        }
      }
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">You must be logged in as an Administrator to view this page.</p>
        <Link to="/" className="bg-[#800000] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#600000] transition">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#800000] via-[#900000] to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 transform pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-red-950/60 border border-red-500/30 text-red-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Control Center</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">System Administration</h1>
            <p className="text-red-100 text-sm mt-1">
              Control posts, moderate content, monitor analytics, and manage user authorizations.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                fetchStats();
                if (activeTab === 'posts') fetchItems();
                if (activeTab === 'users') fetchUsers();
              }}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl text-sm font-semibold transition backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center space-x-2 mt-6 border-t border-white/10 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-[#800000] shadow-md'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview & Stats</span>
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'posts'
                ? 'bg-white text-[#800000] shadow-md'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Post Control & Moderation</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-white text-[#800000] shadow-md'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Items</p>
                      <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalItems}</h3>
                    </div>
                    <div className="p-3 bg-red-50 text-[#800000] rounded-xl">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 font-medium">
                    <span className="text-emerald-600 font-bold">{stats.activeItems} Active</span> | {stats.totalItems - stats.activeItems} Archived
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Claimed Posts</p>
                      <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.claimedItems}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 font-medium">
                    {stats.totalItems > 0
                      ? `${Math.round((stats.claimedItems / stats.totalItems) * 100)}% resolution rate`
                      : 'No items recorded'}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lost / Found</p>
                      <h3 className="text-3xl font-extrabold text-amber-600 mt-1">
                        {stats.lostItems} <span className="text-xs text-gray-400 font-normal">/ {stats.foundItems}</span>
                      </h3>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <Tag className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 font-medium">
                    {stats.lostItems} Lost reports, {stats.foundItems} Found reports
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Users</p>
                      <h3 className="text-3xl font-extrabold text-indigo-600 mt-1">{stats.totalUsers}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 font-medium">
                    {stats.policeUsers} Police Stations | {stats.adminUsers} Admins
                  </p>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 text-[#800000] mr-2" />
                    System Status Distribution
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-1">
                        <span className="text-gray-700">Lost Items Ratio</span>
                        <span className="text-gray-900">{stats.lostItems}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full"
                          style={{
                            width: `${stats.totalItems ? (stats.lostItems / stats.totalItems) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-1">
                        <span className="text-gray-700">Found Items Ratio</span>
                        <span className="text-gray-900">{stats.foundItems}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{
                            width: `${stats.totalItems ? (stats.foundItems / stats.totalItems) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-1">
                        <span className="text-gray-700">Smart Tags Active</span>
                        <span className="text-gray-900">{stats.smartTags}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{
                            width: `${stats.totalItems ? (stats.smartTags / stats.totalItems) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                      <Shield className="w-5 h-5 text-[#800000] mr-2" />
                      Admin Quick Actions
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Quickly navigate to post moderation or manage user role permissions.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setActiveTab('posts')}
                      className="w-full flex items-center justify-center space-x-2 bg-[#800000] hover:bg-[#600000] text-white p-3 rounded-xl font-bold transition shadow-sm"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Moderate Posts</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('users')}
                      className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl font-bold transition shadow-sm"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Manage Users</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Tab 2: Post Control & Moderation */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]/20"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center">
                <select
                  value={itemTypeFilter}
                  onChange={(e) => {
                    setItemTypeFilter(e.target.value);
                    setItemPage(1);
                  }}
                  className="bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 px-3 py-2.5 rounded-xl focus:outline-none"
                >
                  <option value="ALL">All Types</option>
                  <option value="LOST">Lost Only</option>
                  <option value="FOUND">Found Only</option>
                  <option value="SMART_TAG">Smart Tags Only</option>
                </select>

                <select
                  value={itemStatusFilter}
                  onChange={(e) => {
                    setItemStatusFilter(e.target.value);
                    setItemPage(1);
                  }}
                  className="bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 px-3 py-2.5 rounded-xl focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Claimed">Claimed</option>
                  <option value="At Police Station">At Police Station</option>
                </select>

                <select
                  value={itemArchiveFilter}
                  onChange={(e) => {
                    setItemArchiveFilter(e.target.value);
                    setItemPage(1);
                  }}
                  className="bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 px-3 py-2.5 rounded-xl focus:outline-none"
                >
                  <option value="ALL">All Archive States</option>
                  <option value="active">Active Only</option>
                  <option value="archived">Archived Only</option>
                </select>

                <button
                  onClick={() => fetchItems()}
                  className="bg-[#800000] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#600000] transition"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Posts Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {itemsLoading ? (
              <div className="p-8 text-center text-gray-500 flex justify-center items-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#800000]" />
                <span>Loading system posts...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-3">
                <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                <p className="font-semibold text-gray-700">No matching posts found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Post Info</th>
                      <th className="py-3.5 px-4">Type / Category</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Author</th>
                      <th className="py-3.5 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {items.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            {item.imageUrl ? (
                              <img
                                src={
                                  item.imageUrl.startsWith('http')
                                    ? item.imageUrl
                                    : `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000'}${item.imageUrl}`
                                }
                                alt={item.title}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                <Tag className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900 max-w-[200px] truncate">{item.title}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                item.type === 'LOST'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.type === 'FOUND'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {item.type}
                            </span>
                            <p className="text-xs text-gray-500 font-medium">{item.category}</p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-xs font-semibold text-gray-700">{item.city || 'N/A'}</p>
                          <p className="text-xs text-gray-400">{item.district}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={item.status}
                            onChange={(e) => handleUpdateStatus(item._id, e.target.value)}
                            className="bg-white border border-gray-200 text-xs font-semibold text-gray-700 px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                          >
                            <option value="Available">Available</option>
                            <option value="Pending Verification">Pending Verification</option>
                            <option value="Claimed">Claimed</option>
                            <option value="At Police Station">At Police Station</option>
                          </select>
                          {item.archiveStatus === 'archived' && (
                            <span className="block mt-1 text-[10px] font-bold text-red-500 uppercase">
                              [Archived]
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-xs font-bold text-gray-800">
                            {item.createdBy?.username || 'Unknown'}
                          </p>
                          <span className="text-[10px] text-gray-500 capitalize">
                            {item.createdBy?.role || 'user'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <Link
                              to={`/items/${item._id}`}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            <button
                              onClick={() => handleToggleArchive(item._id, item.archiveStatus)}
                              className={`p-1.5 rounded-lg transition ${
                                item.archiveStatus === 'archived'
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-amber-600 hover:bg-amber-50'
                              }`}
                              title={item.archiveStatus === 'archived' ? 'Unarchive Post' : 'Archive Post'}
                            >
                              <Archive className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeletePost(item._id, item.title)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                              title="Delete / Remove Post"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {itemTotalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  Showing page {itemPage} of {itemTotalPages} ({itemTotalCount} total posts)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={itemPage === 1}
                    onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                    className="p-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={itemPage >= itemTotalPages}
                    onClick={() => setItemPage((p) => p + 1)}
                    className="p-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: User Management */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Controls */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]/20"
                />
              </div>

              {/* Role Filter */}
              <div className="flex gap-2.5 w-full md:w-auto items-center">
                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 px-3 py-2.5 rounded-xl focus:outline-none"
                >
                  <option value="ALL">All Roles</option>
                  <option value="user">Regular Users</option>
                  <option value="police">Police Stations</option>
                  <option value="admin">Administrators</option>
                </select>

                <button
                  onClick={() => fetchUsers()}
                  className="bg-[#800000] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#600000] transition"
                >
                  Filter Users
                </button>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {usersLoading ? (
              <div className="p-8 text-center text-gray-500 flex justify-center items-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#800000]" />
                <span>Loading registered users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-3">
                <Users className="w-12 h-12 text-gray-300 mx-auto" />
                <p className="font-semibold text-gray-700">No users found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Station / Detail</th>
                      <th className="py-3.5 px-4">Karma Score</th>
                      <th className="py-3.5 px-4">Joined Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            {u.profilePicture ? (
                              <img
                                src={
                                  u.profilePicture.startsWith('http')
                                    ? u.profilePicture
                                    : `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000'}${u.profilePicture}`
                                }
                                alt={u.username}
                                className="w-9 h-9 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-9 h-9 bg-[#800000] text-white rounded-full flex items-center justify-center font-bold text-sm">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900">{u.username}</p>
                              <p className="text-xs text-gray-400">{u.email || 'No email registered'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : u.role === 'police'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {u.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            {u.role === 'police' && <Building className="w-3 h-3 mr-1" />}
                            <span>{u.role}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-medium text-gray-600">
                          {u.role === 'police' ? u.policeStationName || 'Station Name Unset' : '-'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center space-x-1 bg-yellow-50 text-yellow-700 font-bold px-2.5 py-1 rounded-full text-xs border border-yellow-200">
                            <Award className="w-3.5 h-3.5" />
                            <span>{u.karmaPoints || 0} pts</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleChangeRole(u)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                            >
                              Edit Role
                            </button>

                            {u._id !== user._id && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* User Pagination */}
            {userTotalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  Showing page {userPage} of {userTotalPages} ({userTotalCount} total users)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={userPage === 1}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    className="p-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={userPage >= userTotalPages}
                    onClick={() => setUserPage((p) => p + 1)}
                    className="p-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
