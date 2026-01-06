const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  donation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: true
  },
  donor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ngo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['claimed', 'collected', 'cancelled'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 500
  },
  rating: {
    donor_rating: {
      type: Number,
      min: 1,
      max: 5
    },
    ngo_rating: {
      type: Number,
      min: 1,
      max: 5
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
transactionSchema.index({ donation_id: 1 });
transactionSchema.index({ donor_id: 1, timestamp: -1 });
transactionSchema.index({ ngo_id: 1, timestamp: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);