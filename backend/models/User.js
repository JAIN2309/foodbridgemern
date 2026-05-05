const mongoose = require('mongoose');
const argon2 = require('argon2');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/encryption');

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
  },
  password_reset: {
    otp: String,
    otp_expiry: Date,
    attempts: { type: Number, default: 0 }
  },
  biometric_enabled: {
    type: Boolean,
    default: false
  },
  profile_picture: {
    type: String, // AES-256-GCM encrypted image data
    default: null
  },
  email_encrypted: String,
  phone_encrypted: String,
  license_number_encrypted: String,
  contact_person_encrypted: String
}, {
  timestamps: true
});

// Create geospatial index
userSchema.index({ location: '2dsphere' });

// Encrypt sensitive fields and hash password before saving
userSchema.pre('save', async function(next) {
  console.log('🔐 Pre-save hook triggered. Password modified:', this.isModified('password'));
  
  // Encrypt sensitive fields with AES-256-GCM
  if (this.isModified('email') && this.email) {
    this.email_encrypted = encrypt(this.email);
  }
  if (this.isModified('phone') && this.phone) {
    this.phone_encrypted = encrypt(this.phone);
  }
  if (this.isModified('license_number') && this.license_number) {
    this.license_number_encrypted = encrypt(this.license_number);
  }
  if (this.isModified('contact_person') && this.contact_person) {
    this.contact_person_encrypted = encrypt(this.contact_person);
  }
  if (this.isModified('profile_picture') && this.profile_picture) {
    this.profile_picture = encrypt(this.profile_picture);
  }
  if (this.isModified('password_reset.otp') && this.password_reset?.otp) {
    this.password_reset.otp = encrypt(this.password_reset.otp);
  }
  
  // Hash password with Argon2id
  if (this.isModified('password')) {
    console.log('🔐 Hashing password with Argon2id...');
    this.password = await argon2.hash(this.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });
    console.log('✅ Password hashed successfully with Argon2id');
  }
  
  next();
});

// Decrypt sensitive fields after retrieval
userSchema.post('init', function() {
  if (this.email_encrypted) this.email = decrypt(this.email_encrypted);
  if (this.phone_encrypted) this.phone = decrypt(this.phone_encrypted);
  if (this.license_number_encrypted) this.license_number = decrypt(this.license_number_encrypted);
  if (this.contact_person_encrypted) this.contact_person = decrypt(this.contact_person_encrypted);
  if (this.profile_picture) this.profile_picture = decrypt(this.profile_picture);
  if (this.password_reset?.otp) this.password_reset.otp = decrypt(this.password_reset.otp);
});

// Compare password method - supports both Argon2 and bcrypt for migration
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Decrypt OTP if needed for comparison
    if (this.password_reset?.otp && !this.password_reset.otp.startsWith('$argon2')) {
      this.password_reset.otp = decrypt(this.password_reset.otp);
    }
    
    // Check if password is Argon2 hash (starts with $argon2)
    if (this.password.startsWith('$argon2')) {
      console.log('🔍 Verifying with Argon2...');
      return await argon2.verify(this.password, candidatePassword);
    }
    
    // Legacy bcrypt hash (starts with $2a$ or $2b$)
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
      console.log('🔍 Verifying with bcrypt (legacy)...');
      const isValid = await bcrypt.compare(candidatePassword, this.password);
      
      // If valid, migrate to Argon2
      if (isValid) {
        console.log('🔄 Migrating password from bcrypt to Argon2...');
        this.password = candidatePassword; // Will be hashed by pre-save hook
        await this.save();
        console.log('✅ Password migrated to Argon2');
      }
      
      return isValid;
    }
    
    // Unknown hash format
    console.error('❌ Unknown password hash format');
    return false;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);