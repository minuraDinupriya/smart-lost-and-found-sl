require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const makeAdmin = async (identifier) => {
  if (!identifier) {
    console.error('Please provide an email or username as an argument.');
    process.exit(1);
  }

  try {
    await connectDB();
    const user = await User.findOneAndUpdate(
      { $or: [{ email: identifier }, { username: identifier }] },
      { role: 'admin' },
      { new: true }
    );

    if (user) {
      console.log(`Success! User ${user.username} (${user.email}) is now an admin.`);
    } else {
      console.log(`User with email or username '${identifier}' not found.`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

const arg = process.argv[2];
makeAdmin(arg);
