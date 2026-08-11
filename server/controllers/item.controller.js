const Item = require('../models/Item');
const Message = require('../models/Message');
const translate = require('google-translate-api-x');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { generateImageHash } = require('../utils/imageHash');
const { identifyItemFromImage } = require('../services/itemIdentification.service');
const { analyzeVoiceReport } = require('../services/voiceReporting.service');
const { runAutonomousMatching } = require('../services/matching.service');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const { emitGlobalNotification } = require('../services/socket.service');

const createItem = async (req, res) => {
  try {
    const itemData = req.body;

    let aiIdentificationParsed = null;
    if (itemData.aiIdentification && typeof itemData.aiIdentification === 'string') {
      try {
        aiIdentificationParsed = JSON.parse(itemData.aiIdentification);
      } catch (e) {
        aiIdentificationParsed = null;
      }
    } else if (itemData.aiIdentification && typeof itemData.aiIdentification === 'object') {
      aiIdentificationParsed = itemData.aiIdentification;
    }

    let ownershipProofsParsed = [];
    if (itemData.ownershipProofs && typeof itemData.ownershipProofs === 'string') {
      try {
        ownershipProofsParsed = JSON.parse(itemData.ownershipProofs);
      } catch (e) {
        ownershipProofsParsed = [];
      }
    } else if (itemData.ownershipProofs && Array.isArray(itemData.ownershipProofs)) {
      ownershipProofsParsed = itemData.ownershipProofs;
    }

    let titleSi, titleTa, descriptionSi, descriptionTa;
    try {
       if (itemData.title) {
         titleSi = (await translate(itemData.title, { to: 'si' })).text;
         titleTa = (await translate(itemData.title, { to: 'ta' })).text;
       }
       if (itemData.description) {
         descriptionSi = (await translate(itemData.description, { to: 'si' })).text;
         descriptionTa = (await translate(itemData.description, { to: 'ta' })).text;
       }
    } catch (translateErr) {
       console.error("Translation failed:", translateErr);
    }

    // Instantiate new Item, enforcing the createdBy user mapping from auth middleware
    const newItem = new Item({
      ...itemData,
      ownershipProofs: ownershipProofsParsed,
      aiIdentified: itemData.aiIdentified === 'true' || itemData.aiIdentified === true,
      aiIdentification: aiIdentificationParsed || undefined,
      ownershipProofs: ownershipProofsParsed,
      titleSi,
      titleTa,
      descriptionSi,
      descriptionTa,
      status: (itemData.handedToPolice === 'true' || itemData.handedToPolice === true) ? 'At Police Station' : 'Available',
      createdBy: req.userId,
    });

    if (req.file) {
      // Generate perceptual hash fingerprint locally first
      const hash = await generateImageHash(req.file.path);
      if (hash) {
        newItem.imageHash = hash;
      }
      
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);
      newItem.imageUrl = result.secure_url;
      
      // Clean up the temporary local file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Failed to clean up temporary local file:", err);
      }
    }

    const savedItem = await newItem.save();
    
    // Skip matching engine for Smart Tags
    if (savedItem.type !== 'SMART_TAG') {
      // Run autonomous AI matching asynchronously
      runAutonomousMatching(savedItem).catch(err => console.error('Error running matching engine on create:', err));
    }

    res.status(201).json(savedItem);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Server error while creating item.', error: error.message });
  }
};

const getAllItems = async (req, res) => {
  try {
    const { province, district, city, type, createdBy } = req.query;
    
    // Construct dynamic geographic filter
    const filter = {};
    
    if (type === 'SMART_TAG') {
      filter.type = 'SMART_TAG';
    } else {
      // Hide SMART_TAGs from the public feed
      filter.type = { $ne: 'SMART_TAG' };
    }
    
    if (createdBy) filter.createdBy = createdBy;
    if (province) filter.province = province;
    if (district) filter.district = district;
    if (city) filter.city = city;

    // Fetch items with filter, sort descending (newest first), EXCLUDE claimed items and archived items
    const items = await Item.find({ ...filter, status: { $ne: 'Claimed' }, archiveStatus: { $ne: 'archived' } })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username'); // Helpful to display the reporter's username
      
    // Apply Fuzzy Geolocation to FOUND items to prevent scammers from knowing exact spots
    const obfuscatedItems = items.map(item => {
      const doc = item.toObject();
      
      // Remove private ownership and verification history details from public feed
      delete doc.ownershipProofs;
      delete doc.verificationHistory;

      if (doc.type === 'FOUND' && doc.latitude && doc.longitude) {
        // Obfuscate coordinates with a ~1km random offset (+/- ~0.009 degrees)
        doc.latitude += (Math.random() - 0.5) * 0.018;
        doc.longitude += (Math.random() - 0.5) * 0.018;
        doc.isFuzzy = true; // Flag for the frontend to render a circle instead of a sharp pin
      }
      return doc;
    });

    res.status(200).json(obfuscatedItems);
  } catch (error) {
    console.error('Fetch items error:', error);
    res.status(500).json({ message: 'Server error while fetching items.' });
  }
};

const getMySmartTags = async (req, res) => {
  try {
    const items = await Item.find({ type: 'SMART_TAG', createdBy: req.userId })
      .sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error('Fetch smart tags error:', error);
    res.status(500).json({ message: 'Server error while fetching smart tags.' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    // Basic Counts
    const totalItems = await Item.countDocuments({ type: { $ne: 'SMART_TAG' } });
    const totalRecovered = await Item.countDocuments({ type: { $ne: 'SMART_TAG' }, status: 'Claimed' });
    const totalLost = await Item.countDocuments({ type: 'LOST' });
    const totalFound = await Item.countDocuments({ type: 'FOUND' });

    // Category Distribution
    const itemsByCategory = await Item.aggregate([
      { $match: { type: { $ne: 'SMART_TAG' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Provincial Heatmap Data
    const itemsByProvince = await Item.aggregate([
      { $match: { type: { $ne: 'SMART_TAG' } } },
      { $group: { _id: '$province', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Monthly Timeline Data
    const timelineData = await Item.aggregate([
      { $match: { type: { $ne: 'SMART_TAG' } } },
      { 
        $group: { 
          _id: { $month: "$date" }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      totalItems,
      totalRecovered,
      totalLost,
      totalFound,
      itemsByCategory: itemsByCategory.map(i => ({ name: i._id, value: i.count })),
      itemsByProvince: itemsByProvince.map(i => ({ name: i._id, value: i.count })),
      timelineData: timelineData.map(i => ({ name: `Month ${i._id}`, value: i.count }))
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching analytics.' });
  }
};

const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId).populate('createdBy', 'username');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    // Fetch associated return record (if exists) populated with usernames
    const ReturnRecord = require('../models/ReturnRecord');
    const returnRecord = await ReturnRecord.findOne({ itemId: item._id })
      .populate('ownerId', 'username')
      .populate('finderId', 'username');

    // Security check to filter private ownership details and verification history
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const Message = require('../models/Message');

    const authHeader = req.headers.authorization || req.headers.Authorization;
    let isCreator = false;
    let hasHistoryAccess = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const secret = process.env.JWT_SECRET || 'fallback_secret_for_usjp_lost_and_found_dev';
        const decoded = jwt.verify(token, secret);
        const currentUserId = decoded.userId || decoded.id;

        if (item.createdBy && item.createdBy._id.toString() === currentUserId.toString()) {
          isCreator = true;
          hasHistoryAccess = true;
        } else {
          // Check if user has role 'police'
          const currentUser = await User.findById(currentUserId);
          if (currentUser && currentUser.role === 'police') {
            hasHistoryAccess = true;
          } else {
            // Check if user is participant in chat room for this item
            const isChatParticipant = await Message.exists({
              itemId: item._id,
              $or: [{ senderId: currentUserId }, { receiverId: currentUserId }]
            });
            if (isChatParticipant) {
              hasHistoryAccess = true;
            }
          }
        }
      } catch (err) {
        // Ignore token errors and treat as public user
      }
    }

    const itemObj = item.toObject();
    itemObj.returnRecord = returnRecord;

    if (returnRecord) {
      const Tip = require('../models/Tip');
      const tip = await Tip.findOne({ returnRecordId: returnRecord._id, paymentStatus: 'paid' });
      itemObj.tipPaid = !!tip;
    } else {
      itemObj.tipPaid = false;
    }

    // Strict Privacy enforcement: Strip actual proofValue for anyone except the creator
    if (!isCreator) {
      if (itemObj.ownershipProofs) {
        itemObj.ownershipProofs = itemObj.ownershipProofs.map(p => ({
          _id: p._id,
          proofType: p.proofType,
          customLabel: p.customLabel,
          createdAt: p.createdAt
        }));
      }
    }

    // Limit history visibility to creator, police, and chat participants
    if (!hasHistoryAccess) {
      delete itemObj.verificationHistory;
    }

    res.status(200).json(itemObj);
  } catch (error) {
    console.error('Fetch item by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching item.' });
  }
};

const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findById(itemId);
    
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    // Authorization: Ensure the requester is the original creator
    if (item.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized to edit this item' });
    }

    // Update fields
    const updateData = req.body;

    let ownershipProofsParsed = [];
    if (updateData.ownershipProofs && typeof updateData.ownershipProofs === 'string') {
      try {
        ownershipProofsParsed = JSON.parse(updateData.ownershipProofs);
      } catch (e) {
        ownershipProofsParsed = [];
      }
    } else if (updateData.ownershipProofs && Array.isArray(updateData.ownershipProofs)) {
      ownershipProofsParsed = updateData.ownershipProofs;
    }

    if (updateData.ownershipProofs) {
      updateData.ownershipProofs = ownershipProofsParsed;
    }
    
    if (updateData.ownershipProofs && typeof updateData.ownershipProofs === 'string') {
      try {
        updateData.ownershipProofs = JSON.parse(updateData.ownershipProofs);
      } catch (e) {
        delete updateData.ownershipProofs;
      }
    }

    if (req.file) {
      // Generate perceptual hash fingerprint locally for the newly uploaded image
      const hash = await generateImageHash(req.file.path);
      if (hash) {
        updateData.imageHash = hash;
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);
      updateData.imageUrl = result.secure_url;
      
      // Clean up the temporary local file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Failed to clean up temporary local file:", err);
      }
    }
    
    const updatedItem = await Item.findByIdAndUpdate(
      itemId,
      { $set: updateData },
      { new: true }
    );
    
    // Trigger AI matching engine upon update (e.g. if category or image changed)
    if (updatedItem.type !== 'SMART_TAG' && updatedItem.status !== 'Claimed') {
      runAutonomousMatching(updatedItem).catch(err => console.error('Error running matching engine on update:', err));
    }
    
    res.status(200).json(updatedItem);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Server error while updating item.' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findById(itemId);
    
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // Authorization: Ensure the requester is the original creator
    if (item.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this item' });
    }

    await Item.findByIdAndDelete(itemId);
    res.status(200).json({ message: 'Item successfully deleted' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error while deleting item.' });
  }
};

const claimItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findById(itemId);
    
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.status === 'Claimed') return res.status(400).json({ message: 'Item is already claimed' });
    
    // Authorization: Ensure the requester is the original creator of the post
    if (item.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized to claim this item' });
    }

    item.status = 'Claimed';
    await item.save();

    // The Good Samaritan Karma System
    // If the user posted a FOUND item and successfully returned it, award them 50 Karma points
    if (item.type === 'FOUND') {
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.userId, { $inc: { karmaPoints: 50 } });
    }

    res.status(200).json({ message: 'Item successfully marked as Claimed', item });
  } catch (error) {
    console.error('Claim item error:', error);
    res.status(500).json({ message: 'Server error while claiming item.' });
  }
};

// @desc    Get nearest police via Overpass API proxy
// @route   GET /api/items/nearest-police
// @access  Public
const getNearestPolice = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and Longitude are required' });
    }

    const query = `[out:json];nwr["amenity"="police"](around:15000,${lat},${lng});out center;`;
    const url = `https://overpass-api.de/api/interpreter`;

    // Using POST from the backend to bypass WAF and caching issues safely
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'LostAndFoundApp/1.0 Node.js'
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Overpass API Error:", response.status, errorText);
      return res.status(502).json({ message: 'Failed to fetch from Overpass API' });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('getNearestPolice error:', error);
    res.status(500).json({ message: 'Server error fetching police stations' });
  }
};

// @desc    Get inventory for all police stations
// @route   GET /api/items/police-inventory
// @access  Private (Police only)
const getPoliceInventory = async (req, res) => {
  try {
    const items = await Item.find({
      handedToPolice: true,
      status: { $in: ['At Police Station', 'Claimed'] }
    }).sort({ createdAt: -1 }).populate('createdBy', 'username');

    res.status(200).json({ items });
  } catch (error) {
    console.error('getPoliceInventory error:', error);
    res.status(500).json({ message: 'Server Error fetching inventory.' });
  }
};

// @desc    Resolve an item at any police station
// @route   PATCH /api/items/:id/police-resolve
// @access  Private (Police only)
const resolvePoliceItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.status = 'Claimed';
    await item.save();

    res.status(200).json({ message: 'Item successfully marked as resolved/claimed.', item });
  } catch (error) {
    console.error('resolvePoliceItem error:', error);
    res.status(500).json({ message: 'Server Error resolving item.' });
  }
};
/**
 * @desc    Get archived items created by the logged-in user
 * @route   GET /api/items/archived
 * @access  Private
 */
const getArchivedItems = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId);

    const query = { archiveStatus: 'archived' };

    // If not admin, only show items created by the user
    if (!user || user.role !== 'admin') {
      query.createdBy = req.userId;
    }

    const items = await Item.find(query).sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    console.error('Get archived items error:', error);
    res.status(500).json({
      message: 'Failed to fetch archived items',
    });
  }
};
const identifyItem = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded for identification.'
      });
    }

    const result = await identifyItemFromImage(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    // Clean up temporary upload file if not being retained
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupErr) {
      console.error('Failed to cleanup temp upload file:', cleanupErr);
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Identify item controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process AI item identification.'
    });
  }
};

const analyzeVoiceReportController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file uploaded.' });
    }

    const result = await analyzeVoiceReport(
      req.file.path,
      req.file.mimetype
    );

    // Clean up temporary upload file
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupErr) {
      console.error('Failed to cleanup temp voice file:', cleanupErr);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Voice analyze controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process voice report. ' + error.message
    });
  }
};
const verifyOwnership = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { submittedProofs } = req.body;
    
    if (!submittedProofs || !Array.isArray(submittedProofs)) {
      return res.status(400).json({ message: 'Submitted proofs array is required.' });
    }

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    const storedProofs = item.ownershipProofs || [];

    if (storedProofs.length === 0) {
      return res.status(400).json({ message: 'This item does not have any registered ownership proofs to verify against.' });
    }

    const stringSimilarity = require('string-similarity');

    const compareValues = (val1, val2) => {
      if (!val1 || !val2) return 0;

      const norm1 = val1.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const norm2 = val2.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

      // Exact match after normalization
      if (norm1 === norm2 && norm1.length > 0) {
        return 1.0;
      }

      // Substring match for description/custom details
      if (norm1.length >= 6 && norm2.length >= 6) {
        if (norm1.includes(norm2) || norm2.includes(norm1)) {
          return 0.9;
        }
      }

      // String similarity using Dice's coefficient
      const sim = stringSimilarity.compareTwoStrings(val1.toLowerCase().trim(), val2.toLowerCase().trim());
      return sim;
    };

    let verifiedCount = 0;
    const details = [];

    for (const stored of storedProofs) {
      let matched = false;
      let bestScore = 0;
      
      for (const submitted of submittedProofs) {
        // Match by proofType, or by customLabel if custom
        const typeMatches = 
          stored.proofType?.toLowerCase() === submitted.proofType?.toLowerCase() ||
          (stored.proofType === 'custom' && stored.customLabel?.toLowerCase() === submitted.customLabel?.toLowerCase());

        if (typeMatches) {
          const score = compareValues(stored.proofValue, submitted.proofValue);
          if (score > bestScore) {
            bestScore = score;
          }
        }
      }

      // If the match confidence is high (e.g. >= 0.8), we count it as verified
      if (bestScore >= 0.8) {
        verifiedCount++;
        matched = true;
      }

      details.push({
        _id: stored._id,
        proofType: stored.proofType,
        customLabel: stored.customLabel,
        matched,
        score: bestScore
      });
    }

    const scorePercentage = Math.round((verifiedCount / storedProofs.length) * 100);
    
    let overallStatus = 'NOT_VERIFIED';
    if (scorePercentage === 100) {
      overallStatus = 'VERIFIED';
    } else if (scorePercentage >= 50) {
      overallStatus = 'PARTIALLY_VERIFIED';
    }

    // Add to verificationHistory
    const verificationRecord = {
      verifierId: req.userId,
      verifyingType: 'CLAIM_VERIFICATION',
      overallStatus,
      scorePercentage,
      verifiedCount,
      totalProofs: storedProofs.length,
      timestamp: new Date()
    };

    item.verificationHistory.push(verificationRecord);

    // If verification was successful (VERIFIED or PARTIALLY_VERIFIED), and the item status is 'Available',
    // update status to 'Pending Verification'.
    if (overallStatus !== 'NOT_VERIFIED' && item.status === 'Available') {
      item.status = 'Pending Verification';
    }

    await item.save();

    // Automatically drop a system message in the secure chat room
    try {
      const User = require('../models/User');
      const verifierUser = await User.findById(req.userId);
      const verifierName = verifierUser ? verifierUser.username : 'A claimant';
      
      let systemAlertMessage = `🤖 DIGITAL OWNERSHIP VERIFICATION RESULT:\nUser @${verifierName} has completed verification.\nMatch Result: ${overallStatus} (${scorePercentage}% score)\nVerified fields: ${verifiedCount} of ${storedProofs.length}.`;
      
      // Let's find if a chat partner exists to send message to
      const Message = require('../models/Message');
      const { emitGlobalNotification } = require('../services/socket.service');
      
      const senderId = req.userId;
      const receiverId = item.createdBy.toString();

      if (senderId !== receiverId) {
        const systemMsg = await Message.create({
          itemId: item._id,
          senderId,
          receiverId,
          text: systemAlertMessage
        });
        emitGlobalNotification(receiverId, systemMsg);
        emitGlobalNotification(senderId, systemMsg);
      }
    } catch (msgErr) {
      console.error('Failed to send verification system message:', msgErr);

    }

    res.status(200).json({
      success: true,
      status: overallStatus,
      scorePercentage
    });
  } catch (error) {
    console.error('Error verifying ownership:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

module.exports = {
  createItem,
  getAllItems,
  verifyOwnership,
  getItemById,
  updateItem,
  deleteItem,
  claimItem,
  getMySmartTags,
  getAnalytics,
  getNearestPolice,
  getPoliceInventory,
  resolvePoliceItem,
  getArchivedItems,
  identifyItem,
<<<<<<< HEAD
  analyzeVoiceReport: analyzeVoiceReportController
=======
  verifyOwnership,
>>>>>>> 1574f35b4a3d9a5927d1ab4c820eeb51367fe785
};
