const mongoose = require('mongoose');

const returnRecordSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    finderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Completed', 'Returned'],
      default: 'Returned',
    },
  },
  {
    timestamps: true,
  }
);

// Add unique index on itemId to prevent multiple return records for same item
returnRecordSchema.index({ itemId: 1 }, { unique: true });

module.exports = mongoose.model('ReturnRecord', returnRecordSchema);
