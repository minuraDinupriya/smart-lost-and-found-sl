const fs = require('node:fs/promises');
const items = require('../../data-access/repositories/item.repository');
const { findUserRole } = require('../../data-access/repositories/user.repository');
const { findReturnRecordForItem } = require('../../data-access/repositories/return.repository');
const { findPaidTipByReturnRecordId } = require('../../data-access/repositories/tip.repository');
const { hasItemConversation } = require('../../data-access/repositories/chat.repository');
const { uploadImage } = require('../../data-access/integrations/image-storage');
const { findNearbyPolice } = require('../../data-access/integrations/police-stations');
const { translateReport } = require('../../data-access/integrations/report-translation');
const { listIdentificationModels } = require('../../data-access/integrations/gemini-models');
const { generateImageHash } = require('../../utils/imageHash');
const { identifyItemFromImage } = require('../../data-access/integrations/gemini-identification');
const { analyzeVoiceReport } = require('../../data-access/integrations/gemini-voice');
const { runAutonomousMatching } = require('./matching.service');

class ItemServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const reportFields = [
  'title', 'description', 'type', 'category', 'color', 'brand', 'model',
  'aiIdentified', 'aiIdentification', 'date', 'province', 'district', 'city', 'latitude', 'longitude',
  'contactNumber', 'securityQuestion', 'handedToPolice', 'policeStationName', 'ownershipProofs',
];

const reportData = input => Object.fromEntries(
  reportFields.filter(field => Object.hasOwn(input, field)).map(field => [field, input[field]])
);

const removeTempFile = async filePath => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to clean up temporary upload:', error);
  }
};

const storeReportImage = async filePath => {
  if (!filePath) return {};
  try {
    const hash = await generateImageHash(filePath);
    const imageUrl = await uploadImage(filePath);
    return { imageUrl, ...(hash ? { imageHash: hash } : {}) };
  } finally {
    await removeTempFile(filePath);
  }
};

const createItem = async (input, creatorId, imagePath) => {
  const translations = await translateReport(input);
  const image = await storeReportImage(imagePath);
  const item = await items.createItem({
    ...reportData(input),
    ...translations,
    ...image,
    aiIdentified: input.aiIdentified === 'true' || input.aiIdentified === true,
    status: input.handedToPolice === 'true' || input.handedToPolice === true ? 'At Police Station' : 'Available',
    createdBy: creatorId,
  });

  if (item.type !== 'SMART_TAG') {
    runAutonomousMatching(item).catch(error => console.error('Matching failed on create:', error));
  }
  return item;
};

const listItems = async ({ province, district, city, type, createdBy }) => {
  const filter = { type: type === 'SMART_TAG' ? 'SMART_TAG' : { $ne: 'SMART_TAG' } };
  if (createdBy) filter.createdBy = createdBy;
  if (province) filter.province = province;
  if (district) filter.district = district;
  if (city) filter.city = city;

  const reports = await items.findPublicReports(filter);
  return reports.map(obscureFoundLocation);
};

const obscureFoundLocation = report => {
  if (report.type !== 'FOUND' || !Number.isFinite(report.latitude) || !Number.isFinite(report.longitude)) return report;
  // Round to a stable grid so repeated requests do not reveal a more precise average.
  return {
    ...report,
    latitude: Number(report.latitude.toFixed(2)),
    longitude: Number(report.longitude.toFixed(2)),
    isFuzzy: true,
  };
};

const publicBrowseFilters = ({ q, province, district, city, type, category, mine }, viewerId) => {
  if (mine && !viewerId) throw new ItemServiceError(401, 'Sign in to view your reports.');
  return {
    type: type || { $in: ['LOST', 'FOUND'] },
    ...(q && { q }),
    ...(province && { province }),
    ...(district && { district }),
    ...(city && { city }),
    ...(category && { category }),
    ...(mine && { createdBy: viewerId }),
  };
};

const browseItems = (filters, pagination, viewerId) => items.browseReports(publicBrowseFilters(filters, viewerId), pagination);

const browseItemLocations = async (filters, viewerId) => {
  const locationLimit = 250;
  const locations = await items.findBrowseLocations(publicBrowseFilters(filters, viewerId), locationLimit + 1);
  return { locations: locations.slice(0, locationLimit).map(obscureFoundLocation), truncated: locations.length > locationLimit };
};

const getAnalytics = async () => {
  const { itemsByCategory, itemsByProvince, timelineData, ...totals } = await items.getReportStatistics();
  return {
    ...totals,
    itemsByCategory: itemsByCategory.map(entry => ({ name: entry._id, value: entry.count })),
    itemsByProvince: itemsByProvince.map(entry => ({ name: entry._id, value: entry.count })),
    timelineData: timelineData.map(entry => ({ name: `Month ${entry._id}`, value: entry.count })),
  };
};

const getItemDetails = async (itemId, viewerId) => {
  const item = await items.findItemDetails(itemId);
  if (!item) throw new ItemServiceError(404, 'Item not found');

  const isCreator = Boolean(viewerId && item.createdBy?._id?.toString() === viewerId);
  let hasHistoryAccess = isCreator;
  if (viewerId && !isCreator) {
    try {
      const user = await findUserRole(viewerId);
      hasHistoryAccess = user?.role === 'police' || Boolean(await hasItemConversation(item._id, viewerId));
    } catch {
      // Access checks fail closed so the public report is still available.
    }
  }

  const returnRecord = await findReturnRecordForItem(item._id);
  const tipPaid = Boolean(returnRecord && await findPaidTipByReturnRecordId(returnRecord._id));

  if (!isCreator && item.ownershipProofs) {
    item.ownershipProofs = item.ownershipProofs.map(({ _id, proofType, customLabel, createdAt }) => ({
      _id, proofType, customLabel, createdAt,
    }));
  }
  if (!hasHistoryAccess) delete item.verificationHistory;

  return { ...item, returnRecord, tipPaid };
};

const getOwnedItem = async (itemId, userId, action) => {
  const item = await items.findItemById(itemId);
  if (!item) throw new ItemServiceError(404, 'Item not found');
  if (item.createdBy.toString() !== userId) throw new ItemServiceError(403, `Unauthorized to ${action} this item`);
  return item;
};

const updateItem = async (itemId, userId, input, imagePath) => {
  await getOwnedItem(itemId, userId, 'edit');
  const image = await storeReportImage(imagePath);
  const updatedItem = await items.updateItemById(itemId, { ...reportData(input), ...image });
  if (!updatedItem) throw new ItemServiceError(404, 'Item not found');

  if (updatedItem.type !== 'SMART_TAG' && updatedItem.status !== 'Claimed') {
    runAutonomousMatching(updatedItem).catch(error => console.error('Matching failed on update:', error));
  }
  return updatedItem;
};

const deleteItem = async (itemId, userId) => {
  await getOwnedItem(itemId, userId, 'delete');
  await items.deleteItemById(itemId);
};

const getArchivedItems = async userId => {
  const user = await findUserRole(userId);
  return items.findArchivedItems(user?.role === 'admin' ? null : userId);
};

const resolvePoliceItem = async itemId => {
  const item = await items.findItemById(itemId);
  if (!item) throw new ItemServiceError(404, 'Item not found');
  item.status = 'Claimed';
  return items.saveItem(item);
};

const identifyItem = async ({ path, originalName, mimeType }) => {
  try {
    return await identifyItemFromImage(path, originalName, mimeType);
  } finally {
    await removeTempFile(path);
  }
};

const analyzeItemVoice = async ({ path, mimeType }) => {
  try {
    return await analyzeVoiceReport(path, mimeType);
  } finally {
    await removeTempFile(path);
  }
};

const getNearestPolice = async (latitude, longitude) => {
  const stations = await findNearbyPolice(latitude, longitude);
  if (!stations) throw new ItemServiceError(502, 'Failed to fetch from all Overpass API endpoints');
  return stations;
};

module.exports = {
  createItem, listItems, browseItems, browseItemLocations, getItemDetails, updateItem, deleteItem, getAnalytics,
  getSmartTags: items.findSmartTags, getArchivedItems, getPoliceInventory: items.findPoliceInventory,
  resolvePoliceItem, identifyItem, analyzeItemVoice, getNearestPolice, listIdentificationModels,
  ItemServiceError,
};
