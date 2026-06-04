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
    description: String,
    expiry_date: { type: Date, required: true },
    preparation_time: { type: Date, required: true },
    storage_conditions: {
      type: String,
      enum: ['refrigerated', 'frozen', 'room_temperature'],
      required: true
    },
    allergens: [String],
    safety_verified: { type: Boolean, default: false }
  }],
  quantity_serves: {
    type: Number,
    required: true,
    min: 1
  },
  weight_kg: {
    type: Number,
    required: true,
    min: 0.1
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
  release_history: [{
    ngo_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason:     { type: String },
    released_at:{ type: Date, default: Date.now }
  }],
  pickup_type: {
    type: String,
    enum: ['instant', 'scheduled'],
    default: 'instant'
  },
  scheduled_pickup_time: {
    type: Date,
    default: null
  },
  pickup_deadline: {
    type: Date,
    default: null
  },
  special_instructions: {
    type: String,
    maxlength: 500
  },
  quality_score: {
    type: Number,
    min: 0,
    max: 10,
    default: null
  },
  safety_checklist: {
    proper_storage: { type: Boolean, default: false },
    within_expiry: { type: Boolean, default: false },
    hygienic_preparation: { type: Boolean, default: false },
    temperature_maintained: { type: Boolean, default: false }
  },
  verification_photos: [String],
  auto_expire_buffer: {
    type: Number,
    default: 2 // hours before actual expiry
  },
  expiresAt: {
    type: Date,
    // REMOVED TTL index - we'll handle expiry manually to preserve history
    // index: { expireAfterSeconds: 0 } // This was auto-deleting documents!
  },
  donor_rated: {
    type: Boolean,
    default: false
  },
  // Audit trail fields
  status_history: [{
    status: String,
    changed_at: { type: Date, default: Date.now },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String
  }],
  deletion_scheduled: {
    type: Boolean,
    default: false
  },
  deleted_at: Date
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
donationSchema.index({ location: '2dsphere' });

// Compound index for efficient queries
donationSchema.index({ status: 1, expiresAt: 1 });
donationSchema.index({ donor_id: 1, status: 1 });
donationSchema.index({ claimed_by: 1, status: 1 });
// Admin history: sorted by createdAt — supports getAdminDonationHistory default sort
donationSchema.index({ createdAt: -1 });
// Admin history with status filter
donationSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware to track status changes
donationSchema.pre('save', function(next) {
  // Set expiresAt based on pickup_window_end
  if (this.pickup_window_end) {
    this.expiresAt = this.pickup_window_end;
  }
  
  // Track status changes in history
  if (this.isModified('status')) {
    if (!this.status_history) {
      this.status_history = [];
    }
    this.status_history.push({
      status: this.status,
      changed_at: new Date(),
      reason: 'Status updated'
    });
  }
  
  next();
});

module.exports = mongoose.model('Donation', donationSchema);