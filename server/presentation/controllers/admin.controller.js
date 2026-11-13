const adminService = require('../../business/services/admin.service');

const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const validOptionalText = value => value == null || typeof value === 'string';

const parseFilters = (query, fields) => {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 15 : Number(query.limit);
  if ([query.page, query.limit].some(value => value !== undefined && typeof value !== 'string') ||
      !Number.isSafeInteger(page) || page < 1 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
      !Number.isSafeInteger((page - 1) * limit)) {
    return null;
  }

  const filters = { page, limit };
  for (const field of fields) {
    const value = query[field];
    if (!validOptionalText(value) || value?.length > 200) return null;
    filters[field] = value;
  }
  return filters;
};

const getAdminStats = async (req, res) => {
  try {
    return res.status(200).json({ stats: await adminService.getAdminStats() });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ message: 'Failed to retrieve admin stats.' });
  }
};

const getAllItemsAdmin = async (req, res) => {
  const filters = parseFilters(req.query, ['search', 'type', 'status', 'archiveStatus']);
  if (!filters) return res.status(400).json({ message: 'Invalid item filters or pagination.' });

  try {
    return res.status(200).json(await adminService.getAdminItems(filters));
  } catch (error) {
    console.error('Get all items admin error:', error);
    return res.status(500).json({ message: 'Failed to fetch items.' });
  }
};

const updateItemStatusAdmin = async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return res.status(400).json({ message: 'Invalid item ID.' });
  const { status, archiveStatus } = req.body || {};
  if (status && !['Available', 'Pending Verification', 'Claimed', 'At Police Station'].includes(status)) {
    return res.status(400).json({ message: 'Invalid item status.' });
  }
  if (archiveStatus && !['active', 'archived'].includes(archiveStatus)) {
    return res.status(400).json({ message: 'Invalid archive status.' });
  }

  try {
    const item = await adminService.updateAdminItem(id, { status, archiveStatus });
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    return res.status(200).json({ message: 'Post updated successfully.', item });
  } catch (error) {
    console.error('Update item status admin error:', error);
    return res.status(500).json({ message: 'Failed to update item.' });
  }
};

const deleteItemAdmin = async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return res.status(400).json({ message: 'Invalid item ID.' });

  try {
    if (!await adminService.deleteAdminItem(id)) return res.status(404).json({ message: 'Item not found.' });
    return res.status(200).json({ message: 'Post successfully deleted by admin.' });
  } catch (error) {
    console.error('Delete item admin error:', error);
    return res.status(500).json({ message: 'Failed to delete post.' });
  }
};

const getAllUsersAdmin = async (req, res) => {
  const filters = parseFilters(req.query, ['search', 'role']);
  if (!filters) return res.status(400).json({ message: 'Invalid user filters or pagination.' });

  try {
    return res.status(200).json(await adminService.getAdminUsers(filters));
  } catch (error) {
    console.error('Get all users admin error:', error);
    return res.status(500).json({ message: 'Failed to fetch users.' });
  }
};

const updateUserRoleAdmin = async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return res.status(400).json({ message: 'Invalid user ID.' });
  const { role, policeStationName } = req.body || {};
  if (!validOptionalText(policeStationName)) {
    return res.status(400).json({ message: 'Police station name must be a string.' });
  }

  try {
    const result = await adminService.updateAdminUserRole(id, { role, policeStationName });
    if (result.error === 'INVALID_ROLE') return res.status(400).json({ message: 'Invalid user role.' });
    if (result.error === 'USER_NOT_FOUND') return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ message: 'User role updated successfully.', user: result.user });
  } catch (error) {
    console.error('Update user role admin error:', error);
    return res.status(500).json({ message: 'Failed to update user role.' });
  }
};

const deleteUserAdmin = async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return res.status(400).json({ message: 'Invalid user ID.' });

  try {
    const result = await adminService.deleteAdminUser(req.userId, id);
    if (result.error === 'SELF_DELETE') {
      return res.status(400).json({ message: 'Admin cannot delete their own account via admin dashboard.' });
    }
    if (result.error === 'USER_NOT_FOUND') return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ message: 'User account successfully deleted.' });
  } catch (error) {
    console.error('Delete user admin error:', error);
    return res.status(500).json({ message: 'Failed to delete user.' });
  }
};

module.exports = {
  getAdminStats,
  getAllItemsAdmin,
  updateItemStatusAdmin,
  deleteItemAdmin,
  getAllUsersAdmin,
  updateUserRoleAdmin,
  deleteUserAdmin,
};
