const Item = require('../models/Item');
const User = require('../models/User');

const getAdminStats = async () => {
  const [
    totalItems, activeItems, claimedItems, lostItems, foundItems, smartTags,
    totalUsers, policeUsers, adminUsers, regularUsers,
  ] = await Promise.all([
    Item.countDocuments(),
    Item.countDocuments({ archiveStatus: 'active' }),
    Item.countDocuments({ status: 'Claimed' }),
    Item.countDocuments({ type: 'LOST' }),
    Item.countDocuments({ type: 'FOUND' }),
    Item.countDocuments({ type: 'SMART_TAG' }),
    User.countDocuments(),
    User.countDocuments({ role: 'police' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'user' }),
  ]);
  return {
    totalItems, activeItems, claimedItems, lostItems, foundItems, smartTags,
    totalUsers, policeUsers, adminUsers, regularUsers,
  };
};

const itemCreatorFields = 'username email role profilePicture';
const findAdminItemById = id => Item.findById(id).populate('createdBy', itemCreatorFields);

const searchFields = (search, fields) => {
  // The dashboard accepts literal search text, including regular-expression punctuation.
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return fields.map(field => ({ [field]: { $regex: escapedSearch, $options: 'i' } }));
};

const listAdminItems = async ({ page, limit, search, type, status, archiveStatus }) => {
  const query = {};
  if (type && type !== 'ALL') query.type = type;
  if (status && status !== 'ALL') query.status = status;
  if (archiveStatus && archiveStatus !== 'ALL') query.archiveStatus = archiveStatus;
  if (search) query.$or = searchFields(search, ['title', 'description', 'city', 'district', 'category']);

  const [totalItems, items] = await Promise.all([
    Item.countDocuments(query),
    Item.find(query)
      .populate('createdBy', itemCreatorFields)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  return { totalItems, items };
};

const listAdminUsers = async ({ page, limit, search, role }) => {
  const query = {};
  if (role && role !== 'ALL') query.role = role;
  if (search) query.$or = searchFields(search, ['username', 'email', 'policeStationName']);

  const [totalUsers, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  return { totalUsers, users };
};

module.exports = { getAdminStats, findAdminItemById, listAdminItems, listAdminUsers };
