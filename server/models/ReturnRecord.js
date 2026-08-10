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
      enum: ['FINDER_CONFIRMED', 'OWNER_CONFIRMED', 'OWNER_FINDER_VERIFIED', 'RETURN_COMPLETED', 'Completed', 'Returned'],
      default: 'FINDER_CONFIRMED',
    },
    finderConfirmedAt: {
      type: Date,
    },
    ownerConfirmedAt: {
      type: Date,
    },
    ownerReceivedAt: {
      type: Date,
    }
  },
  {
    timestamps: true,
  }
);

// Allow multiple potential handovers to start, but uniquely identify them by the participants and item
returnRecordSchema.index({ itemId: 1, ownerId: 1, finderId: 1 }, { unique: true });

module.exports = mongoose.model('ReturnRecord', returnRecordSchema);
