const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    type: {
      type: String,
      enum: ['LOST', 'FOUND'],
      required: [true, 'Item type (LOST or FOUND) is required'],
    },
    category: {
      type: String,
      enum: ['Electronics', 'Documents', 'Keys', 'Bags', 'Wallets', 'Pets', 'Others'],
      required: [true, 'Category is required'],
    },
    imageUrl: {
      type: String, // Will hold local Multer path first, then Cloudinary URL
      default: '',
    },
    imageHash: {
      type: String, // Will hold the 64-bit binary pHash fingerprint
    },
    date: {
      type: Date,
      required: [true, 'Date of loss or find is required'],
    },
    // Geographic Fields for Hierarchical National Scale Filtering
    province: {
      type: String,
      required: [true, 'Province is required'],
    },
    district: {
      type: String,
      required: [true, 'District is required'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    // Security & Contact Fields
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
    },
    securityQuestion: {
      type: String,
      // Optional field specifically supporting the Blind Claim protocol
    },
    // System Fields
    status: {
      type: String,
      enum: ['Available', 'Pending Verification', 'Claimed'],
      default: 'Available',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
