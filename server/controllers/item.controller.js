const Item = require('../models/Item');
const Message = require('../models/Message');
const path = require('path');
const { generateImageHash, calculateHammingDistance } = require('../utils/imageHash');

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
    
    // Scan for visual matches using Hamming Distance asynchronously
    if (savedItem.imageHash) {
      const oppositeType = savedItem.type === 'LOST' ? 'FOUND' : 'LOST';
      // Fetch potential matches in the same category
      Item.find({
        type: oppositeType,
        category: savedItem.category,
        imageHash: { $exists: true, $ne: null, $ne: '' }
      }).then(potentialMatches => {
        for (const match of potentialMatches) {
          const distance = calculateHammingDistance(savedItem.imageHash, match.imageHash);
          if (distance !== null && distance <= 10) {
            console.log(`\n🚨 VISUAL MATCH DETECTED! Images are visually similar (Distance: ${distance})`);
            console.log(`- New Item: [${savedItem.type}] ${savedItem.title} (${savedItem._id})`);
            console.log(`- Matched Item: [${match.type}] ${match.title} (${match._id})\n`);

            // Inject System Alert into original item owner's inbox (pointing to new item)
            Message.create({
              itemId: savedItem._id,
              senderId: savedItem.createdBy,
              receiverId: match.createdBy,
              text: `🤖 AUTOMATIC SMART MATCH DETECTED! We found a highly similar listing matching your item. Click here to view it: /items/${savedItem._id}`
            }).catch(e => console.error('Failed to send alert to original owner:', e));

            // Inject System Alert into new item poster's inbox (pointing to old item)
            Message.create({
              itemId: match._id,
              senderId: match.createdBy,
              receiverId: savedItem.createdBy,
              text: `🤖 AUTOMATIC SMART MATCH DETECTED! We found a highly similar listing already on the network. Click here to view it: /items/${match._id}`
            }).catch(e => console.error('Failed to send alert to new poster:', e));
          }
        }
      }).catch(err => console.error('Error during visual matching:', err));
    }

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
      
    res.status(200).json(items);
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
