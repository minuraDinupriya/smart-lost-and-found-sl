require('dotenv').config();
const mongoose = require('mongoose');
const { confirmFinder } = require('./presentation/controllers/handover.controller');
const Item = require('./data-access/models/Item');
const User = require('./data-access/models/User');

const dbConfig = require('./config/db');

async function debug() {
  await dbConfig();
  
  try {
    const item = await Item.findOne({ type: 'LOST' });
    if (!item) {
      console.log('No item found');
      process.exit(1);
    }
    
    console.log('Testing with item:', item._id);
    
    // Simulate req and res
    const req = {
      params: {
        itemId: item._id.toString(),
        otherUserId: item.createdBy.toString()
      },
      // Assume current user is NOT the creator, so they are the finder
      userId: new mongoose.Types.ObjectId().toString()
    };
    
    const res = {
      status: (code) => {
        console.log('Status:', code);
        return {
          json: (data) => {
            console.log('Response JSON:', data);
          }
        };
      }
    };
    
    await confirmFinder(req, res);
    
  } catch (error) {
    console.error('CRASH:', error);
  } finally {
    process.exit(0);
  }
}

debug();
