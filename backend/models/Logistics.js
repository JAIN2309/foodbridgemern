const mongoose = require('mongoose');

const logisticsSchema = new mongoose.Schema({
  donation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: true
  },
  pickup_attempts: [{
    ngo_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduled_time: Date,
    status: { 
      type: String, 
      enum: ['scheduled', 'in_progress', 'completed', 'failed', 'cancelled'],
      default: 'scheduled'
    },
    failure_reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
  delivery_partner: {
    partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assigned_at: Date,
    estimated_pickup: Date,
    tracking_id: String,
    status: {
      type: String,
      enum: ['assigned', 'en_route', 'picked_up', 'delivered', 'failed']
    }
  },
  auto_reassignment: {
    enabled: { type: Boolean, default: true },
    max_attempts: { type: Number, default: 3 },
    timeout_minutes: { type: Number, default: 30 },
    fallback_partners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  priority_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  }
}, {
  timestamps: true
});

logisticsSchema.index({ donation_id: 1 });
logisticsSchema.index({ 'pickup_attempts.ngo_id': 1 });
logisticsSchema.index({ 'delivery_partner.partner_id': 1 });

module.exports = mongoose.model('Logistics', logisticsSchema);