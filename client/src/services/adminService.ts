import api from './api';

export interface AdminStats {
  totalItems: number;
  activeItems: number;
  claimedItems: number;
  lostItems: number;
  foundItems: number;
  smartTags: number;
  totalUsers: number;
  policeUsers: number;
  adminUsers: number;
  regularUsers: number;
}

export interface AdminItem {
  _id: string;
  title: string;
  description: string;
  type: 'LOST' | 'FOUND' | 'SMART_TAG';
  category: string;
  imageUrl?: string;
  province?: string;
  district?: string;
  city?: string;
  status: 'Available' | 'Pending Verification' | 'Claimed' | 'At Police Station';
  archiveStatus: 'active' | 'archived';
  createdBy?: {
    _id: string;
    username: string;
    email?: string;
    role?: string;
    profilePicture?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  _id: string;
  username: string;
  email?: string;
  role: 'user' | 'police' | 'admin';
  policeStationName?: string;
  karmaPoints: number;
  profilePicture?: string;
  createdAt: string;
}

export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await api.get('/admin/stats');
  return response.data.stats;
};

export const getAdminItems = async (
  page: number = 1,
  limit: number = 15,
  search: string = '',
  type: string = 'ALL',
  status: string = 'ALL',
  archiveStatus: string = 'ALL'
): Promise<{ items: AdminItem[]; totalPages: number; currentPage: number; totalItems: number }> => {
  const response = await api.get('/admin/items', {
    params: { page, limit, search, type, status, archiveStatus },
  });
  return response.data;
};

export const updateAdminItemStatus = async (
  id: string,
  updates: { status?: string; archiveStatus?: string }
): Promise<AdminItem> => {
  const response = await api.patch(`/admin/items/${id}/status`, updates);
  return response.data.item;
};

export const deleteAdminItem = async (id: string): Promise<void> => {
  await api.delete(`/admin/items/${id}`);
};

export const getAdminUsers = async (
  page: number = 1,
  limit: number = 15,
  search: string = '',
  role: string = 'ALL'
): Promise<{ users: AdminUser[]; totalPages: number; currentPage: number; totalUsers: number }> => {
  const response = await api.get('/admin/users', {
    params: { page, limit, search, role },
  });
  return response.data;
};

export const updateAdminUserRole = async (
  id: string,
  role: 'user' | 'police' | 'admin',
  policeStationName?: string
): Promise<AdminUser> => {
  const response = await api.patch(`/admin/users/${id}/role`, { role, policeStationName });
  return response.data.user;
};

export const deleteAdminUser = async (id: string): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};
