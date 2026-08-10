const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Pull the MongoDB URI string securely from process.env, 
    // with a local fallback for the zero-budget development stack.
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/usjp_smart_lost_found';
    
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // DB Migration: Drop old unique index on itemId if it exists to allow multiple finders
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections({ name: 'returnrecords' }).toArray();
      if (collections.length > 0) {
        const indexes = await db.collection('returnrecords').indexes();
        const hasLegacyIndex = indexes.find(i => i.name === 'itemId_1');
        if (hasLegacyIndex) {
          await db.collection('returnrecords').dropIndex('itemId_1');
          console.log('Successfully dropped legacy itemId_1 index from returnrecords collection.');
        }
      }
    } catch (indexErr) {
      console.warn('Non-critical error while checking/dropping legacy indexes:', indexErr.message);
    }
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
