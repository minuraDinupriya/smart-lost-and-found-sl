const Item = require('../models/Item');
const Message = require('../models/Message');
const path = require('path');
const { generateImageHash, calculateHammingDistance } = require('../utils/imageHash');
const { calculateTextSimilarity } = require('../utils/textMatch');
const { emitGlobalNotification } = require('../services/socket.service');

const createItem = async (req, res) => {
  try {
    const itemData = req.body;

    // Instantiate new Item, enforcing the createdBy user mapping from auth middleware
    const newItem = new Item({
      ...itemData,
      createdBy: req.userId,
    });

    if (req.file) {
      newItem.imageUrl = req.file.filename;
      
      // Generate perceptual hash fingerprint
      const hash = await generateImageHash(req.file.path);
      if (hash) {
        newItem.imageHash = hash;
      }
    }

    const savedItem = await newItem.save();
    
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

    res.status(201).json(savedItem);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Server error while creating item.', error: error.message });
  }
};

const getAllItems = async (req, res) => {
  try {
    const { province, district, city } = req.query;
    
    // Construct dynamic geographic filter
    const filter = {};
    if (province) filter.province = province;
    if (district) filter.district = district;
    if (city) filter.city = city;

    // Fetch items with filter, sort descending (newest first)
    const items = await Item.find(filter)
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
      updateData.imageUrl = req.file.filename;
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

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
};
