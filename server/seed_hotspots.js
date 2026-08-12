const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Item = require('./models/Item');
const User = require('./models/User');

dotenv.config();

const seedHotspots = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find any user to assign these items to
    const user = await User.findOne();
    if (!user) {
      console.error('No users found in the database. Please register a user first.');
      process.exit(1);
    }
    const userId = user._id;

    // Dummy data clustered around Colombo
    const dummyItems = [
      // Cluster 1: University of Colombo (Electronics)
      {
        title: 'MacBook Pro 14"',
        description: 'Lost my macbook near the library.',
        type: 'LOST',
        category: 'Electronics',
        brand: 'Apple',
        date: new Date(),
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo 07',
        latitude: 6.9000,
        longitude: 79.8600,
        contactNumber: '0712345678',
        createdBy: userId,
      },
      {
        title: 'iPhone 13 Pro',
        description: 'Dropped it in the science faculty canteen.',
        type: 'LOST',
        category: 'Electronics',
        brand: 'Apple',
        date: new Date(),
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo 07',
        latitude: 6.9010,
        longitude: 79.8590,
        contactNumber: '0712345678',
        createdBy: userId,
      },
      {
        title: 'Sony Headphones',
        description: 'Left on a bench near the main ground.',
        type: 'LOST',
        category: 'Electronics',
        brand: 'Sony',
        date: new Date(),
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo 07',
        latitude: 6.8990,
        longitude: 79.8610,
        contactNumber: '0712345678',
        createdBy: userId,
      },

      // Cluster 2: Colombo Fort Station (Bags & Wallets)
      {
        title: 'Leather Wallet',
        description: 'Brown leather wallet with NIC and cards.',
        type: 'LOST',
        category: 'Wallets',
        date: new Date(),
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo Fort',
        latitude: 6.9333,
        longitude: 79.8483,
        contactNumber: '0776543210',
        createdBy: userId,
      },
      {
        title: 'Adidas Backpack',
        description: 'Black backpack left on the train to Kandy.',
        type: 'LOST',
        category: 'Bags',
        brand: 'Adidas',
        date: new Date(),
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo Fort',
        latitude: 6.9340,
        longitude: 79.8490,
        contactNumber: '0776543210',
        createdBy: userId,
      },
      {
        title: 'NIC Card',
        description: 'Lost my ID card near the ticket counter.',
        type: 'LOST',
        category: 'Documents',
        date: new Date(),
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo Fort',
        latitude: 6.9330,
        longitude: 79.8480,
        contactNumber: '0776543210',
        createdBy: userId,
      },
    ];

    await Item.insertMany(dummyItems);
    console.log('Successfully seeded 6 dummy items for the hotspot map!');
    
    mongoose.connection.close();
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedHotspots();
