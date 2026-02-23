const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['donor', 'ngo', 'admin', 'super_admin'],
    required: true
  },
  organization_name: {
    type: String,
    required: true
  },
  license_number: {
    type: String,
    required: function() {
      return this.role !== 'admin' && this.role !== 'super_admin';
    }
  },
  contact_person: {
    type: String,
    required: true
  },
  phone: {
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
  address: {
    type: String,
    required: true
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  verification_documents: [{
    type: String // Cloudinary URLs
  }],
  trust_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    reviews: [{
      reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      created_at: { type: Date, default: Date.now }
    }]
  },
  activity_stats: {
    donations_posted: { type: Number, default: 0 },
    donations_claimed: { type: Number, default: 0 },
    successful_pickups: { type: Number, default: 0 },
    failed_pickups: { type: Number, default: 0 },
    response_time_avg: { type: Number, default: 0 } // minutes
  },
  offline_mode: {
    enabled: { type: Boolean, default: false },
    last_sync: { type: Date, default: Date.now },
    pending_actions: [{
      action: String,
      data: mongoose.Schema.Types.Mixed,
      timestamp: { type: Date, default: Date.now }
    }]
  }
}, {
  timestamps: true
});

// Create geospatial index
userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);