const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  food_items: [{
    name: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['vegetarian', 'non-vegetarian', 'vegan', 'mixed'],
      required: true 
    },
    description: String
  }],
  quantity_serves: {
    type: Number,
    required: true,
    min: 1
  },
  photo_url: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  pickup_address: {
    type: String,
    required: true
  },
  pickup_window_start: {
    type: Date,
    required: true
  },
  pickup_window_end: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'reserved', 'collected', 'expired'],
    default: 'available'
  },
  claimed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  claimed_at: {
    type: Date,
    default: null
  },
  collected_at: {
    type: Date,
    default: null
  },
  special_instructions: {
    type: String,
    maxlength: 500
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
donationSchema.index({ location: '2dsphere' });

// Compound index for efficient queries
donationSchema.index({ status: 1, expiresAt: 1 });
donationSchema.index({ donor_id: 1, status: 1 });
donationSchema.index({ claimed_by: 1, status: 1 });

// Pre-save middleware to set expiresAt based on pickup_window_end
donationSchema.pre('save', function(next) {
  // Always set expiresAt to pickup_window_end for TTL functionality
  if (this.pickup_window_end) {
    this.expiresAt = this.pickup_window_end;
  }
  next();
});

module.exports = mongoose.model('Donation', donationSchema);