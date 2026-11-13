const adminRepository = require('../../data-access/repositories/admin.repository');
const items = require('../../data-access/repositories/item.repository');
const users = require('../../data-access/repositories/user.repository');

const getAdminStats = () => adminRepository.getAdminStats();

const getAdminItems = async filters => {
  const { items, totalItems } = await adminRepository.listAdminItems(filters);
  return { items, totalPages: Math.ceil(totalItems / filters.limit), currentPage: filters.page, totalItems };
};

const getAdminUsers = async filters => {
  const { users, totalUsers } = await adminRepository.listAdminUsers(filters);
  return { users, totalPages: Math.ceil(totalUsers / filters.limit), currentPage: filters.page, totalUsers };
};

const updateAdminItem = async (id, { status, archiveStatus }) => {
  const item = await items.findItemById(id);
  if (!item) return null;
  if (status) item.status = status;
  if (archiveStatus) item.archiveStatus = archiveStatus;
  await items.saveItem(item);
  return adminRepository.findAdminItemById(id);
};

const deleteAdminItem = async id => Boolean(await items.deleteItemById(id));

const updateAdminUserRole = async (id, { role, policeStationName }) => {
  if (!['user', 'police', 'admin'].includes(role)) return { error: 'INVALID_ROLE' };
  const user = await users.findUserById(id);
  if (!user) return { error: 'USER_NOT_FOUND' };

  user.role = role;
  if (role === 'police' && policeStationName !== undefined) {
    user.policeStationName = policeStationName;
  }
  await users.saveUser(user);
  return { user: await users.findPublicUserById(id) };
};

const deleteAdminUser = async (adminId, userId) => {
  if (adminId === userId.toLowerCase()) return { error: 'SELF_DELETE' };
  if (!await users.deleteUserById(userId)) return { error: 'USER_NOT_FOUND' };
  return {};
};

module.exports = {
  getAdminStats, getAdminItems, getAdminUsers, updateAdminItem, deleteAdminItem, updateAdminUserRole, deleteAdminUser,
};
