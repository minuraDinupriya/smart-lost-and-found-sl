const mongoose = require('mongoose');

const tipSchema = new mongoose.Schema(
  {
    returnRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReturnRecord',
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
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paymentReference: {
      type: String,
      default: '',
    },
    thankYouMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one tip per return record
tipSchema.index({ returnRecordId: 1 }, { unique: true });

module.exports = mongoose.model('Tip', tipSchema);
