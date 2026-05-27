const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Item = require('../models/Item');
const User = require('../models/User');
const translate = require('google-translate-api-x');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const provinces = [
  'Western', 'Central', 'Southern', 'Northern', 'Eastern', 
  'North Western', 'North Central', 'Uva', 'Sabaragamuwa'
];

const categories = ['Electronics', 'Documents', 'Keys', 'Bags', 'Wallets', 'Pets', 'Others'];

const titles = {
  'Electronics': ['iPhone 13', 'Samsung Galaxy S22', 'Dell XPS Laptop', 'Apple AirPods', 'MacBook Air M2'],
  'Documents': ['National ID Card', 'Driver\'s License', 'Passport', 'University ID', 'Bank Passbook'],
  'Keys': ['Car Keys (Toyota)', 'House Keys', 'Motorbike Keys', 'Office Keys', 'Bunch of Keys'],
  'Bags': ['Black Backpack', 'Nike Gym Bag', 'Leather Handbag', 'Laptop Bag', 'Travel Luggage'],
  'Wallets': ['Brown Leather Wallet', 'Gucci Wallet', 'Ladies Purse', 'Card Holder', 'Black Wallet'],
  'Pets': ['Golden Retriever', 'Persian Cat', 'Husky Puppy', 'Parrot', 'Stray Dog with Collar'],
  'Others': ['Umbrella', 'Water Bottle', 'Wrist Watch', 'Gold Ring', 'Prescription Glasses']
};

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://admin:Uf7H0jJ0QGkE8K6p@cluster0.sfy6b3v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for Seeding...');

    // Find any user to assign these items to
    const user = await User.findOne();
    if (!user) {
      console.error('No users found in the database. Please register a user first.');
      process.exit(1);
    }

    console.log(`Assigning seed items to user: ${user.username} (${user._id})`);

    console.log('Cleaning up old posts...');
    await Item.deleteMany({ type: { $ne: 'SMART_TAG' } });

    const itemsToInsert = [];
    
    console.log('Generating and Translating 15 items... (Please wait)');
    for (let i = 0; i < 15; i++) {
      const type = Math.random() > 0.4 ? 'LOST' : 'FOUND';
      const category = categories[Math.floor(Math.random() * categories.length)];
      const title = titles[category][Math.floor(Math.random() * titles[category].length)];
      const province = provinces[Math.floor(Math.random() * provinces.length)];
      
      const date = new Date();
      date.setMonth(date.getMonth() - Math.floor(Math.random() * 6));
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));

      const status = Math.random() > 0.7 ? 'Claimed' : 'Available';
      const description = `This is a generated sample description for a ${category.toLowerCase()} item reported in ${province}.`;

      let titleSi, titleTa, descriptionSi, descriptionTa;
      try {
        titleSi = (await translate(title, { to: 'si' })).text;
        titleTa = (await translate(title, { to: 'ta' })).text;
        descriptionSi = (await translate(description, { to: 'si' })).text;
        descriptionTa = (await translate(description, { to: 'ta' })).text;
      } catch (err) {
        console.error('Translation error on seed:', err.message);
      }

      itemsToInsert.push({
        title, titleSi, titleTa,
        description, descriptionSi, descriptionTa,
        type, category, date, province,
        district: `${province} District`,
        city: `${province} City`,
        contactNumber: '0712345678',
        status,
        createdBy: user._id
      });
      process.stdout.write('.');
    }

    console.log('\nInserting...');
    await Item.insertMany(itemsToInsert);
    console.log('Successfully seeded 15 translated items into the database! 🎉');
    
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDatabase();
