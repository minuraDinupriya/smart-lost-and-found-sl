const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Item = require('./models/Item');
const User = require('./models/User');

dotenv.config();

const seedPoliceItems = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find any user to assign these items to (simulating a finder)
    const user = await User.findOne();
    if (!user) {
      console.error('No users found in the database. Please register a user first.');
      process.exit(1);
    }
    const userId = user._id;

    // Dummy data for Police Dashboard
    const dummyItems = [
      {
        title: 'Canon DSLR Camera',
        description: 'Found this camera left on a park bench. Handed it over immediately.',
        type: 'FOUND',
        category: 'Electronics',
        brand: 'Canon',
        date: new Date(),
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo 07',
        latitude: 6.9050,
        longitude: 79.8650,
        contactNumber: '0712345678',
        createdBy: userId,
        status: 'At Police Station', // Status for Police Handover
        handedToPolice: true,
        policeStationName: 'Cinnamon Gardens Police Station',
      },
      {
        title: 'Gucci Sunglasses',
        description: 'Black shades found near the beach. Handed to local authorities.',
        type: 'FOUND',
        category: 'Others',
        brand: 'Gucci',
        date: new Date(),
        province: 'Western',
        district: 'Colombo',
        city: 'Wellawatte',
        latitude: 6.8750,
        longitude: 79.8600,
        contactNumber: '0712345678',
        createdBy: userId,
        status: 'At Police Station',
        handedToPolice: true,
        policeStationName: 'Wellawatte Police Station',
      },
      {
        title: 'Car Keys (Toyota)',
        description: 'Set of car keys with a red keychain.',
        type: 'FOUND',
        category: 'Keys',
        date: new Date(),
        province: 'Western',
        district: 'Colombo',
        city: 'Kahathuduwa',
        latitude: 6.7830,
        longitude: 79.9861,
        contactNumber: '0712345678',
        createdBy: userId,
        status: 'At Police Station',
        handedToPolice: true,
        policeStationName: 'Kahathuduwa Police Station',
      },
    ];

    await Item.insertMany(dummyItems);
    console.log('Successfully seeded 3 items for the Police Dashboard!');
    
    mongoose.connection.close();
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedPoliceItems();
