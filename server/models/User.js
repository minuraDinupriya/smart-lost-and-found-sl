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
      // Optional now to support OAuth
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined values to not conflict
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    profilePicture: {
      type: String,
    },
    karmaPoints: {
      type: Number,
      default: 0,
    },
  },
  {
    // Mongoose automatically creates and manages 'createdAt' and 'updatedAt' fields
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
