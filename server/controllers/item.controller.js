const Item = require('../models/Item');
const Message = require('../models/Message');
const translate = require('google-translate-api-x');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { generateImageHash, calculateHammingDistance } = require('../utils/imageHash');
const { calculateTextSimilarity } = require('../utils/textMatch');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const { emitGlobalNotification } = require('../services/socket.service');

const createItem = async (req, res) => {
  try {
    const itemData = req.body;

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
      // Scan for visual and text matches asynchronously
      const oppositeType = savedItem.type === 'LOST' ? 'FOUND' : 'LOST';
    
    // Fetch potential matches in the same category
    Item.find({
      type: oppositeType,
      category: savedItem.category
    }).then(potentialMatches => {
      console.log(`\n=========================================================`);
      console.log(`🧠 [AI MATCHING ENGINE] - STARTING ANALYSIS...`);
      console.log(`=========================================================`);
      console.log(`Target Item: "${savedItem.title}" (${savedItem.type})`);
      console.log(`Scanning against: ${potentialMatches.length} ${oppositeType} items...\n`);

      for (const match of potentialMatches) {
        // PREVENT SELF-MATCHING: Do not match a user's newly posted item against their own previously posted items
        if (savedItem.createdBy.toString() === match.createdBy.toString()) {
          console.log(`-> Skipping "${match.title}": Created by the same user.\n`);
          continue;
        }

        let isMatch = false;
        let matchReason = '';
        let matchPhase = ''; // 'VISUAL' or 'NLP'

        console.log(`[Phase 1] 📷 Image Perceptual Hashing (pHash) Algorithm:`);
        console.log(`-> Comparing Bitwise Hamming Distance against: "${match.title}"`);
        // 1. Evaluate Image Similarity (if both have images)
        if (savedItem.imageHash && match.imageHash) {
          const distance = calculateHammingDistance(savedItem.imageHash, match.imageHash);
          if (distance !== null && distance <= 10) {
            isMatch = true;
            matchReason = `Visual Match (Distance: ${distance})`;
            matchPhase = 'VISUAL';
            console.log(`-> Result: Distance = ${distance} (Threshold: <= 10) - 🟢 VISUAL MATCH FOUND!\n`);
          } else {
             console.log(`-> Result: Distance = ${distance} (Threshold: <= 10) - NO VISUAL MATCH\n`);
          }
        } else {
           console.log(`-> Result: SKIPPED (Missing Image Data)\n`);
        }

        console.log(`[Phase 2] 📝 Natural Language Processing (NLP) Engine:`);
        console.log(`-> Algorithm: Dice's Coefficient (String Similarity)`);
        // 2. Evaluate Text Similarity (if visual match failed or was skipped)
        if (!isMatch) {
          const textScore = calculateTextSimilarity(savedItem, match);
          if (textScore >= 0.60) {
            isMatch = true;
            matchReason = `Text Similarity Match (Score: ${(textScore * 100).toFixed(1)}%)`;
            matchPhase = 'NLP';
            console.log(`-> Result: Score = ${(textScore * 100).toFixed(1)}% (Threshold: >= 60%) - 🟢 NLP MATCH FOUND!\n`);
          } else {
            console.log(`-> Result: Score = ${(textScore * 100).toFixed(1)}% (Threshold: >= 60%) - NO MATCH\n`);
          }
        } else {
          console.log(`-> Result: SKIPPED (Visual Match already confirmed)\n`);
        }

        if (isMatch) {
          console.log(`🚨 SMART MATCH CONFIRMED!`);
          console.log(`-> Triggering Global Inboxes...`);
          console.log(`=========================================================\n`);

          // Dynamically generate the message based on the AI engine that triggered it
          let alertMessage = '';
          if (matchPhase === 'VISUAL') {
            alertMessage = `🤖 AI VISUAL MATCH: Our Image Recognition engine detected a structural match between your photos! Click here to view the potential match: /items/${savedItem._id}`;
          } else {
            alertMessage = `🤖 AI NLP MATCH: Our Text Analysis engine detected highly similar keyword overlap between your descriptions! Click here to view the potential match: /items/${savedItem._id}`;
          }

          // Professionally drop exactly ONE message into the original item's chat room connecting both users
          Message.create({
            itemId: match._id,
            senderId: savedItem.createdBy,
            receiverId: match.createdBy,
            text: alertMessage
          }).then(msg => {
            emitGlobalNotification(match.createdBy, msg);
            emitGlobalNotification(savedItem.createdBy, msg);
          }).catch(e => console.error('Failed to send smart match alert:', e));
        }
      }
    }).catch(err => console.error('Error during autonomous matching:', err));
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

    // Fetch items with filter, sort descending (newest first), EXCLUDE claimed items
    const items = await Item.find({ ...filter, status: { $ne: 'Claimed' } })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username'); // Helpful to display the reporter's username
      
    // Apply Fuzzy Geolocation to FOUND items to prevent scammers from knowing exact spots
    const obfuscatedItems = items.map(item => {
      const doc = item.toObject();
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
    res.status(200).json(item);
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
    
    if (req.file) {
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

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  claimItem,
  getMySmartTags,
  getAnalytics,
  getNearestPolice,
  getPoliceInventory,
  resolvePoliceItem,
};
