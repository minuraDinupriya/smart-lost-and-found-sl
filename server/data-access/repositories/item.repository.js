const Item = require('../models/Item');

const findItemById = itemId => Item.findById(itemId);
const findItemDetails = itemId => Item.findById(itemId)
  .select('+ownershipProofs')
  .populate('createdBy', 'username')
  .lean();
const createItem = data => new Item(data).save();
const saveItem = item => item.save();
const updateItemById = (itemId, data) => Item.findByIdAndUpdate(itemId, { $set: data }, { new: true });
const deleteItemById = itemId => Item.findByIdAndDelete(itemId);

const findPublicReports = filter => Item.find({
  ...filter,
  status: { $ne: 'Claimed' },
  archiveStatus: { $ne: 'archived' },
})
  .select('-verificationHistory')
  .sort({ createdAt: -1 })
  .populate('createdBy', 'username')
  .lean();

const findSmartTags = createdBy => Item.find({ type: 'SMART_TAG', createdBy }).sort({ createdAt: -1 });

const findPoliceInventory = () => Item.find({
  handedToPolice: true,
  status: { $in: ['At Police Station', 'Claimed'] },
})
  .sort({ createdAt: -1 })
  .populate('createdBy', 'username');

const findArchivedItems = createdBy => Item.find({
  archiveStatus: 'archived',
  ...(createdBy ? { createdBy } : {}),
}).sort({ createdAt: -1 });

const findLocatedReports = (type, { category, createdSince }) => Item.find({
  type,
  status: { $ne: 'Claimed' },
  archiveStatus: { $ne: 'archived' },
  latitude: { $exists: true, $ne: null },
  longitude: { $exists: true, $ne: null },
  ...(category ? { category } : {}),
  ...(createdSince ? { createdAt: { $gte: createdSince } } : {}),
}).select('latitude longitude category').lean();

const getReportStatistics = async () => {
  const allReports = { type: { $ne: 'SMART_TAG' } };
  const countBy = (field, sort) => Item.aggregate([
    { $match: allReports },
    { $group: { _id: field, count: { $sum: 1 } } },
    { $sort: sort },
  ]);
  const [
    totalItems, totalRecovered, totalLost, totalFound, itemsByCategory, itemsByProvince, timelineData,
  ] = await Promise.all([
    Item.countDocuments(allReports),
    Item.countDocuments({ ...allReports, status: 'Claimed' }),
    Item.countDocuments({ type: 'LOST' }),
    Item.countDocuments({ type: 'FOUND' }),
    countBy('$category', { count: -1 }),
    countBy('$province', { count: -1 }),
    countBy({ $month: '$date' }, { _id: 1 }),
  ]);
  return { totalItems, totalRecovered, totalLost, totalFound, itemsByCategory, itemsByProvince, timelineData };
};

const findMatchCandidates = (type, category) => Item.find({ type, category });

const archiveExpiredReports = now => Item.updateMany(
  { archiveStatus: 'active', expiresAt: { $lte: now }, type: { $ne: 'SMART_TAG' } },
  { $set: { archiveStatus: 'archived' } }
);

module.exports = {
  findItemById, findItemDetails, createItem, saveItem, updateItemById, deleteItemById,
  findPublicReports, findSmartTags, findPoliceInventory, findArchivedItems,
  findLocatedReports, getReportStatistics, findMatchCandidates, archiveExpiredReports,
};
