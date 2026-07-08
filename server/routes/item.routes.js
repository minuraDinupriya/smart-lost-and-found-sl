const express = require('express');
const router = express.Router();
const { verifyToken, verifyPolice } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { createItem, getAllItems, getItemById, updateItem, deleteItem, claimItem, getMySmartTags, getAnalytics, getNearestPolice, getPoliceInventory, resolvePoliceItem, getArchivedItems } = require('../controllers/item.controller');

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

module.exports = router;
