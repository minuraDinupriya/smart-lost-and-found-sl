require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const username = process.argv[2];

if (!username) {
  console.error("Please provide a username. Usage: node makeAdmin.js <username>");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log('Connected to MongoDB');
  const user = await User.findOne({ username });
  if (!user) {
    console.error(`User ${username} not found.`);
    process.exit(1);
  }
  
  user.role = 'admin';
  await user.save();
  console.log(`Successfully made user '${username}' an admin!`);
  process.exit(0);
})
.catch(err => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});
