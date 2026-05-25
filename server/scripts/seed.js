require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Item = require('../models/Item');
const connectDB = require('../config/db');

const seedDB = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await connectDB();
    
    console.log('Injecting test user...');
    let user = await User.findOne({ username: 'system_tester' });
    if (!user) {
      user = new User({ username: 'system_tester', password: 'secure_mock_password' });
      await user.save();
    }

    console.log('Injecting sample items...');
    const items = [
      {
        title: 'Lost iPhone 13 Pro',
        description: 'Black iPhone 13 Pro with a matte blue case. Lost near the main university library.',
        type: 'LOST',
        category: 'Electronics',
        date: new Date('2023-10-01'),
        province: 'Western',
        district: 'Colombo',
        city: 'Nugegoda',
        contactNumber: '0712345678',
        securityQuestion: 'What is the lock screen wallpaper image?',
        createdBy: user._id
      },
      {
        title: 'Found Car Keys',
        description: 'A bunch of 3 keys attached to a red Honda motorcycle keychain.',
        type: 'FOUND',
        category: 'Keys',
        date: new Date('2023-10-05'),
        province: 'Western',
        district: 'Colombo',
        city: 'Maharagama',
        contactNumber: '0778765432',
        createdBy: user._id
      },
      {
        title: 'Brown Leather Wallet',
        description: 'Lost wallet containing my National Identity Card, driving license, and some cash.',
        type: 'LOST',
        category: 'Wallets',
        date: new Date('2023-10-02'),
        province: 'Central',
        district: 'Kandy',
        city: 'Peradeniya',
        contactNumber: '0723334444',
        securityQuestion: 'What is the full name and address on the NIC?',
        createdBy: user._id
      },
      {
        title: 'Found Golden Retriever Puppy',
        description: 'Very friendly 3-month old puppy found wandering near the beach park.',
        type: 'FOUND',
        category: 'Pets',
        date: new Date('2023-10-06'),
        province: 'Southern',
        district: 'Galle',
        city: 'Hikkaduwa',
        contactNumber: '0709998888',
        createdBy: user._id
      }
    ];

    await Item.insertMany(items);
    console.log('Successfully injected 4 sample items into the database!');
    process.exit(0);
  } catch (error) {
    console.error('Seed Injection Error:', error);
    process.exit(1);
  }
};

seedDB();
