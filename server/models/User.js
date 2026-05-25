const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
  },
  {
    // Mongoose automatically creates and manages 'createdAt' and 'updatedAt' fields
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
