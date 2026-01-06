const Donation = require('../models/Donation');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../services/emailService');

const createDonation = async (req, res) => {
  try {
    console.log('createDonation called with:', req.body);
    const {
      food_items,
      quantity_serves,
      photo_url,
      coordinates,
      pickup_address,
      pickup_window_start,
      pickup_window_end,
      special_instructions
    } = req.body;

    const donation = new Donation({
      donor_id: req.user._id,
      food_items,
      quantity_serves,
      photo_url,
      location: {
        type: 'Point',
        coordinates: coordinates
      },
      pickup_address,
      pickup_window_start: new Date(pickup_window_start),
      pickup_window_end: new Date(pickup_window_end),
      special_instructions
    });

    await donation.save();
    console.log('Donation created:', donation._id);

    // Notify nearby NGOs via Socket.io
    const io = req.app.get('io');
    const nearbyNGOs = await User.find({
      role: 'ngo',
      is_verified: true,
      location: {
        $near: {
          $geometry: donation.location,
          $maxDistance: 10000 // 10km radius
        }
      }
    });

    console.log(`Notifying ${nearbyNGOs.length} nearby NGOs`);
    nearbyNGOs.forEach(async (ngo) => {
      io.to(`ngo-${ngo._id}`).emit('new-donation', {
        donation: donation,
        distance: 'nearby'
      });
      
      // Send email notification
      try {
        await sendEmail(ngo.email, emailTemplates.newDonation(donation, ngo));
      } catch (emailError) {
        console.error('New donation email failed:', emailError);
      }
    });

    res.status(201).json(donation);
  } catch (error) {
    console.error('createDonation error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getNearbyDonations = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000 } = req.query;
    console.log('getNearbyDonations called with:', { longitude, latitude, maxDistance });
    
    const donations = await Donation.find({
      status: 'available',
      expiresAt: { $gt: new Date() },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    })
    .populate('donor_id', 'organization_name phone')
    .sort({ createdAt: -1 });

    console.log(`Found ${donations.length} nearby donations`);
    res.json(donations);
  } catch (error) {
    console.error('getNearbyDonations error:', error);
    res.status(500).json({ message: error.message });
  }
};

// CRITICAL: Atomic claim handling to prevent race conditions
const claimDonation = async (req, res) => {
  try {
    const { donationId } = req.params;
    const ngoId = req.user._id;

    // Use findOneAndUpdate with atomic operation
    const donation = await Donation.findOneAndUpdate(
      { 
        _id: donationId, 
        status: 'available',
        expiresAt: { $gt: new Date() }
      },
      { 
        status: 'reserved',
        claimed_by: ngoId,
        claimed_at: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    ).populate('donor_id', 'organization_name phone contact_person');

    if (!donation) {
      return res.status(400).json({ 
        message: 'Donation not available or already claimed' 
      });
    }

    // Create transaction log
    const transaction = new Transaction({
      donation_id: donationId,
      donor_id: donation.donor_id._id,
      ngo_id: ngoId,
      action: 'claimed'
    });
    await transaction.save();

    // Notify donor via Socket.io
    const io = req.app.get('io');
    io.to(`donor-${donation.donor_id._id}`).emit('donation-claimed', {
      donation: donation,
      ngo: req.user.organization_name
    });

    // Send emails to both NGO and donor
    try {
      const ngoUser = await User.findById(ngoId);
      const donorUser = donation.donor_id;
      
      await Promise.all([
        sendEmail(ngoUser.email, emailTemplates.donationClaimed(donation, ngoUser, donorUser).ngo),
        sendEmail(donorUser.email, emailTemplates.donationClaimed(donation, ngoUser, donorUser).donor)
      ]);
    } catch (emailError) {
      console.error('Claim notification emails failed:', emailError);
    }

    res.json({
      message: 'Donation claimed successfully',
      donation: donation
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markCollected = async (req, res) => {
  try {
    const { donationId } = req.params;
    
    const donation = await Donation.findOneAndUpdate(
      { 
        _id: donationId, 
        claimed_by: req.user._id,
        status: 'reserved'
      },
      { 
        status: 'collected',
        collected_at: new Date()
      },
      { new: true }
    );

    if (!donation) {
      return res.status(400).json({ 
        message: 'Donation not found or not claimed by you' 
      });
    }

    // Create transaction log
    const transaction = new Transaction({
      donation_id: donationId,
      donor_id: donation.donor_id,
      ngo_id: req.user._id,
      action: 'collected'
    });
    await transaction.save();

    // Send completion emails to both NGO and donor
    try {
      const ngoUser = req.user;
      const donorUser = await User.findById(donation.donor_id);
      
      await Promise.all([
        sendEmail(ngoUser.email, emailTemplates.donationCompleted(donation, ngoUser, donorUser).ngo),
        sendEmail(donorUser.email, emailTemplates.donationCompleted(donation, ngoUser, donorUser).donor)
      ]);
    } catch (emailError) {
      console.error('Completion notification emails failed:', emailError);
    }

    res.json({ message: 'Donation marked as collected', donation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDonorHistory = async (req, res) => {
  try {
    const donations = await Donation.find({ donor_id: req.user._id })
      .populate('claimed_by', 'organization_name')
      .sort({ createdAt: -1 });
    
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNGOHistory = async (req, res) => {
  try {
    const donations = await Donation.find({ claimed_by: req.user._id })
      .populate('donor_id', 'organization_name')
      .sort({ claimed_at: -1 });
    
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDonation,
  getNearbyDonations,
  claimDonation,
  markCollected,
  getDonorHistory,
  getNGOHistory
};