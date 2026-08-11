const express = require('express');
const router = express.Router();
const { verifyToken, verifyPolice } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { createItem, getAllItems, getItemById, updateItem, deleteItem, claimItem, getMySmartTags, getAnalytics, getNearestPolice, getPoliceInventory, resolvePoliceItem, getArchivedItems, identifyItem, analyzeVoiceReport, verifyOwnership } = require('../controllers/item.controller');
const { getHotspots } = require('../controllers/hotspot.controller');


// @route   GET /api/items/debug-ai
// @desc    Debug AI models available to the API key
// @access  Public
router.get('/debug-ai', async (req, res) => {
  const apiKey = process.env.ITEM_IDENTIFICATION_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ error: 'No API key' });
  try {
    const fetch = require('node-fetch') || global.fetch;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// @route   POST /api/items/identify
// @desc    Analyze uploaded item image with AI and suggest attributes
// @access  Private
router.post('/identify', verifyToken, upload.single('image'), identifyItem);

// @route   POST /api/items/voice-analyze
// @desc    Analyze uploaded voice report with AI and extract structured data
// @access  Private
router.post('/voice-analyze', verifyToken, upload.single('audio'), analyzeVoiceReport);

// @route   POST /api/items/:itemId/verify-ownership
// @desc    Verify digital ownership proofs for an item
// @access  Private
router.post('/:itemId/verify-ownership', verifyToken, verifyOwnership);

// @route   GET /api/items/hotspots
// @desc    Get aggregated hotspots for high-frequency lost items
// @access  Public
router.get('/hotspots', getHotspots);

// @route   POST /api/items
// @desc    Create a new item (requires authentication)
// @access  Private
router.post('/', verifyToken, upload.single('image'), createItem);

// @route   GET /api/items
// @desc    Fetch items (supports ?province=X&district=Y&city=Z filtering)
// @access  Public
router.get('/', getAllItems);

// @route   GET /api/items/my/smart-tags
// @desc    Fetch smart tags created by logged in user
// @access  Private
router.get('/my/smart-tags', verifyToken, getMySmartTags);

// @route   GET /api/items/analytics
// @desc    Get aggregated statistics for National Dashboard
// @access  Public
router.get('/analytics', getAnalytics);

// @route   GET /api/items/nearest-police
// @desc    Get nearest police stations via Overpass API proxy
// @access  Public
router.get('/nearest-police', getNearestPolice);

// @route   GET /api/items/police-inventory
// @desc    Get inventory for the logged-in police station
// @access  Private (Police only)
router.get('/police-inventory', verifyToken, verifyPolice, getPoliceInventory);

// @route   PATCH /api/items/:id/police-resolve
// @desc    Resolve an item at the police station
// @access  Private (Police only)
router.patch('/:id/police-resolve', verifyToken, verifyPolice, resolvePoliceItem);

// @route   GET /api/items/archived
// @desc    Get archived items created by the logged-in user
// @access  Private
router.get('/archived', verifyToken, getArchivedItems);

// @route   GET /api/items/:itemId
// @desc    Get a single item by ID
// @access  Public
router.get('/:itemId', getItemById);

// @route   PUT /api/items/:itemId
// @desc    Update an item (requires authentication & ownership)
// @access  Private
router.put('/:itemId', verifyToken, upload.single('image'), updateItem);

// @route   DELETE /api/items/:itemId
// @desc    Delete an item (requires authentication & ownership)
// @access  Private
router.delete('/:itemId', verifyToken, deleteItem);

// @route   PUT /api/items/:itemId/claim
// @desc    Mark an item as Claimed (Awards Karma Points)
// @access  Private (Creator only)
router.put('/:itemId/claim', verifyToken, claimItem);

// @route   POST /api/items/:itemId/verify-ownership
// @desc    Verify ownership proof fields
// @access  Private (Authenticated users only)
router.post('/:itemId/verify-ownership', verifyToken, verifyOwnership);

module.exports = router;
