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

const activeReportFilter = filter => ({
  ...filter,
  status: { $ne: 'Claimed' },
  archiveStatus: { $ne: 'archived' },
});

const findPublicReports = filter => Item.find(activeReportFilter(filter))
  .select('-verificationHistory')
  .sort({ createdAt: -1 })
  .populate('createdBy', 'username')
  .lean();

const reportOrder = { createdAt: -1, _id: -1 };
const searchableFields = ['title', 'description', 'titleSi', 'descriptionSi', 'titleTa', 'descriptionTa'];
const browseReportFilter = ({ q, ...filters }) => {
  if (!q) return activeReportFilter(filters);
  // Interpret user input as literal text across the original and translated report fields.
  const textPattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return activeReportFilter({ ...filters, $or: searchableFields.map(field => ({ [field]: textPattern })) });
};

const browseReports = async (filters, { page, pageSize, highlight }) => {
  const filter = browseReportFilter(filters);
  const [total, highlighted] = await Promise.all([
    Item.countDocuments(filter),
    highlight && Item.findOne({ ...filter, _id: highlight }).select('createdAt').lean(),
  ]);

  if (highlighted) {
    // Count the matching rows that sort before this report using the same tie breaker as the list.
    const before = highlighted.createdAt ? {
      $or: [
        { createdAt: { $gt: highlighted.createdAt } },
        { createdAt: highlighted.createdAt, _id: { $gt: highlighted._id } },
      ],
    } : {
      $or: [
        { createdAt: { $type: 'date' } },
        { createdAt: null, _id: { $gt: highlighted._id } },
      ],
    };
    const earlier = await Item.countDocuments({ $and: [filter, before] });
    page = Math.floor(earlier / pageSize) + 1;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = await Item.find(filter)
    .select('title titleSi titleTa description descriptionSi descriptionTa type category imageUrl date city district status handedToPolice policeStationName createdBy')
    .sort(reportOrder)
    .skip((currentPage - 1) * pageSize)
    .limit(pageSize)
    .populate('createdBy', 'username')
    .lean();

  return { items: rows, total, page: currentPage, totalPages };
};

const findBrowseLocations = (filters, limit) => Item.find({
  ...browseReportFilter(filters),
  latitude: { $gte: -90, $lte: 90 },
  longitude: { $gte: -180, $lte: 180 },
})
  .select('title type city district latitude longitude')
  .sort(reportOrder)
  .limit(limit)
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
  findPublicReports, browseReports, findBrowseLocations, findSmartTags, findPoliceInventory, findArchivedItems,
  findLocatedReports, getReportStatistics, findMatchCandidates, archiveExpiredReports,
};
