const { validateProofs } = require('../../utils/ownershipProofs');
const itemService = require('../../business/services/item.service');
const ownershipService = require('../../business/services/ownership.service');
const { claimDirect } = require('../../business/services/return.service');
const { verifyTokenIdentity } = require('../../business/services/session.service');
const { ItemInputError, isItemId, readReport, isCoordinate, readBrowseFilters, readBrowsePage } = require('../validation/item.validation');

const sendError = (res, error, fallback) => {
  if (error instanceof ItemInputError || error instanceof itemService.ItemServiceError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
};

const readItemId = itemId => {
  if (!isItemId(itemId)) throw new ItemInputError('Invalid item ID.');
  return itemId;
};

const readViewerId = headers => {
  const authorization = headers.authorization || headers.Authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return null;
  try {
    return verifyTokenIdentity(authorization.split(' ')[1]);
  } catch {
    return null;
  }
};

const createItem = async (req, res) => {
  try {
    const input = readReport(req.body, { creating: true });
    const savedItem = await itemService.createItem(input, req.userId, req.file?.path);
    return res.status(201).json(savedItem);
  } catch (error) {
    return sendError(res, error, 'Server error while creating item.');
  }
};

const getAllItems = async (req, res) => {
  try {
    const { province, district, city, type, createdBy } = req.query;
    const fields = { province, district, city, type, createdBy };
    if (Object.values(fields).some(value => value !== undefined && typeof value !== 'string')) {
      throw new ItemInputError('Item filters must be text.');
    }
    if (createdBy) readItemId(createdBy);
    const items = await itemService.listItems(fields);
    return res.status(200).json(items);
  } catch (error) {
    return sendError(res, error, 'Server error while fetching items.');
  }
};

const getMySmartTags = async (req, res) => {
  try {
    return res.status(200).json(await itemService.getSmartTags(req.userId));
  } catch (error) {
    return sendError(res, error, 'Server error while fetching smart tags.');
  }
};

const getBrowseItems = async (req, res) => {
  try {
    const filters = readBrowseFilters(req.query);
    const pagination = readBrowsePage(req.query);
    const result = await itemService.browseItems(filters, pagination, filters.mine ? readViewerId(req.headers) : null);
    return res.json(result);
  } catch (error) {
    return sendError(res, error, 'Server error while fetching reports.');
  }
};

const getBrowseLocations = async (req, res) => {
  try {
    const filters = readBrowseFilters(req.query);
    const result = await itemService.browseItemLocations(filters, filters.mine ? readViewerId(req.headers) : null);
    return res.json(result);
  } catch (error) {
    return sendError(res, error, 'Server error while fetching report locations.');
  }
};

const getAnalytics = async (req, res) => {
  try {
    return res.status(200).json(await itemService.getAnalytics());
  } catch (error) {
    return sendError(res, error, 'Server error while fetching analytics.');
  }
};

const getItemById = async (req, res) => {
  try {
    const itemId = readItemId(req.params.itemId);
    const item = await itemService.getItemDetails(itemId, readViewerId(req.headers));
    return res.status(200).json(item);
  } catch (error) {
    return sendError(res, error, 'Server error while fetching item.');
  }
};

const updateItem = async (req, res) => {
  try {
    const itemId = readItemId(req.params.itemId);
    const input = readReport(req.body);
    const item = await itemService.updateItem(itemId, req.userId, input, req.file?.path);
    return res.status(200).json(item);
  } catch (error) {
    return sendError(res, error, 'Server error while updating item.');
  }
};

const deleteItem = async (req, res) => {
  try {
    const itemId = readItemId(req.params.itemId);
    await itemService.deleteItem(itemId, req.userId);
    return res.status(200).json({ message: 'Item successfully deleted' });
  } catch (error) {
    return sendError(res, error, 'Server error while deleting item.');
  }
};

const claimItem = async (req, res) => {
  try {
    const itemId = readItemId(req.params.itemId);
    const item = await claimDirect(itemId.toLowerCase(), req.userId);
    return res.status(200).json({ message: 'Item successfully marked as Claimed', item });
  } catch (error) {
    if ([403, 404].includes(error.status)) return res.status(error.status).json({ message: error.message });
    return sendError(res, error, 'Server error while claiming item.');
  }
};

const getNearestPolice = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) throw new ItemInputError('Latitude and Longitude are required');
    if (!isCoordinate(lat, 90) || !isCoordinate(lng, 180)) {
      throw new ItemInputError('Invalid latitude or longitude.');
    }
    const stations = await itemService.getNearestPolice(Number(lat), Number(lng));
    return res.status(200).json(stations);
  } catch (error) {
    return sendError(res, error, 'Server error fetching police stations');
  }
};

const getPoliceInventory = async (req, res) => {
  try {
    const items = await itemService.getPoliceInventory();
    return res.status(200).json({ items });
  } catch (error) {
    return sendError(res, error, 'Server Error fetching inventory.');
  }
};

const resolvePoliceItem = async (req, res) => {
  try {
    const item = await itemService.resolvePoliceItem(readItemId(req.params.id));
    return res.status(200).json({ message: 'Item successfully marked as resolved/claimed.', item });
  } catch (error) {
    return sendError(res, error, 'Server Error resolving item.');
  }
};

const getArchivedItems = async (req, res) => {
  try {
    return res.json(await itemService.getArchivedItems(req.userId));
  } catch (error) {
    return sendError(res, error, 'Failed to fetch archived items');
  }
};

const identifyItem = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded for identification.' });
    }
    const { path, originalname, mimetype } = req.file;
    const result = await itemService.identifyItem({ path, originalName: originalname, mimeType: mimetype });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Item identification failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to process AI item identification.' });
  }
};

const analyzeVoiceReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file uploaded.' });
    }
    const { path, mimetype } = req.file;
    const result = await itemService.analyzeItemVoice({ path, mimeType: mimetype });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Voice analysis failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to process voice report.' });
  }
};

const listIdentificationModels = async (req, res) => {
  try {
    return res.json(await itemService.listIdentificationModels());
  } catch (error) {
    console.error('Unable to list AI models:', error);
    return res.json({ error: 'Unable to list AI models' });
  }
};

const verifyOwnership = async (req, res) => {
  try {
    const itemId = readItemId(req.params.itemId);
    const { submittedProofs } = req.body || {};
    if (!validateProofs(submittedProofs)) {
      return res.status(400).json({ message: 'Provide 1–20 proofs with a non-empty type and value; custom proofs also require a label.' });
    }

    const result = await ownershipService.verifyOwnership({ itemId, verifierId: req.userId, submittedProofs });
    if (result.error === 'ITEM_NOT_FOUND') return res.status(404).json({ message: 'Item not found.' });
    if (result.error === 'NO_REGISTERED_PROOFS') {
      return res.status(400).json({ message: 'This item does not have any registered ownership proofs to verify against.' });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ItemInputError) return res.status(400).json({ message: error.message });
    console.error('Error verifying ownership:', error);
    return res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

module.exports = {
  createItem, getAllItems, getBrowseItems, getBrowseLocations, verifyOwnership, getItemById, updateItem, deleteItem, claimItem,
  getMySmartTags, getAnalytics, getNearestPolice, getPoliceInventory, resolvePoliceItem, getArchivedItems,
  identifyItem, analyzeVoiceReport, listIdentificationModels,
};
