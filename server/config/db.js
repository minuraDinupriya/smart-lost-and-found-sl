const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Pull the MongoDB URI string securely from process.env, 
    // with a local fallback for the zero-budget development stack.
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/usjp_smart_lost_found';
    
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
