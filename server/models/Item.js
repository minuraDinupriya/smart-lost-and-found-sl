const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    titleSi: { type: String, trim: true },
    titleTa: { type: String, trim: true },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [1000, 'Description cannot be more than 1000 characters'],
    },
    descriptionSi: { type: String },
    descriptionTa: { type: String },
    type: {
      type: String,
      enum: ['LOST', 'FOUND', 'SMART_TAG'],
      required: [true, 'Item type is required'],
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
      required: [function() { return this.type !== 'SMART_TAG'; }, 'Date is required'],
    },
    // Geographic Fields for Hierarchical National Scale Filtering
    province: {
      type: String,
      required: [function() { return this.type !== 'SMART_TAG'; }, 'Province is required'],
    },
    district: {
      type: String,
      required: [function() { return this.type !== 'SMART_TAG'; }, 'District is required'],
    },
    city: {
      type: String,
      required: [function() { return this.type !== 'SMART_TAG'; }, 'City is required'],
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
      required: [function() { return this.type !== 'SMART_TAG'; }, 'Contact number is required'],
    },
    securityQuestion: {
      type: String,
      // Optional field specifically supporting the Blind Claim protocol
    },
    // Police Tracking Fields
    handedToPolice: {
      type: Boolean,
      default: false,
    },
    policeStationName: {
      type: String,
      trim: true,
    },
    // System Fields
    status: {
      type: String,
      enum: ['Available', 'Pending Verification', 'Claimed', 'At Police Station'],
      default: 'Available',
    },
    // Item Expiry & Auto Archive Fields
    archiveStatus: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
       default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
    // Reference to the User who created the item
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
