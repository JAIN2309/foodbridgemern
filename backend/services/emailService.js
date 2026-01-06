const nodemailer = require('nodemailer');
require('dotenv').config();

// SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Email Templates
const emailTemplates = {
  registration: (user) => ({
    subject: 'Welcome to FoodBridge - Registration Successful!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to FoodBridge!</h2>
        <p>Dear ${user.contact_person},</p>
        <p>Thank you for registering with FoodBridge as a <strong>${user.role.toUpperCase()}</strong>.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Registration Details:</h3>
          <p><strong>Organization:</strong> ${user.organization_name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role.toUpperCase()}</p>
          <p><strong>Status:</strong> Pending Verification</p>
        </div>
        <p>Your account is currently under review. You'll receive another email once approved by our admin team.</p>
        <p>Best regards,<br>FoodBridge Team</p>
      </div>
    `
  }),

  approval: (user, approved) => ({
    subject: approved ? 'Account Approved - Welcome to FoodBridge!' : 'Account Registration Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${approved ? '#059669' : '#dc2626'};">
          Account ${approved ? 'Approved' : 'Rejected'}
        </h2>
        <p>Dear ${user.contact_person},</p>
        ${approved ? `
          <p>Great news! Your FoodBridge account has been approved.</p>
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <p><strong>You can now:</strong></p>
            <ul>
              ${user.role === 'donor' ? 
                '<li>Post food donations</li><li>Track donation status</li><li>Help reduce food waste</li>' :
                '<li>Browse nearby donations</li><li>Claim food donations</li><li>Help feed those in need</li>'
              }
            </ul>
          </div>
        ` : `
          <p>Unfortunately, your account registration has been rejected.</p>
          <p>Please contact our support team if you believe this is an error.</p>
        `}
        <p>Best regards,<br>FoodBridge Team</p>
      </div>
    `
  }),

  newDonation: (donation, ngo) => ({
    subject: 'New Food Donation Available Nearby!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">🍽️ New Food Donation Available!</h2>
        <p>Dear ${ngo.contact_person},</p>
        <p>A new food donation is available near your location:</p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <h3>${donation.food_items.map(item => item.name).join(', ')}</h3>
          <p><strong>Donor:</strong> ${donation.donor_id.organization_name}</p>
          <p><strong>Serves:</strong> ${donation.quantity_serves} people</p>
          <p><strong>Pickup Address:</strong> ${donation.pickup_address}</p>
          <p><strong>Available Until:</strong> ${new Date(donation.pickup_window_end).toLocaleString()}</p>
        </div>
        <p>Act fast - donations are claimed on a first-come, first-served basis!</p>
        <p>Best regards,<br>FoodBridge Team</p>
      </div>
    `
  }),

  donationClaimed: (donation, ngo, donor) => ({
    ngo: {
      subject: 'Donation Claimed Successfully!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">✅ Donation Claimed Successfully!</h2>
          <p>Dear ${ngo.contact_person},</p>
          <p>You have successfully claimed a food donation:</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${donation.food_items.map(item => item.name).join(', ')}</h3>
            <p><strong>From:</strong> ${donor.organization_name}</p>
            <p><strong>Contact:</strong> ${donor.phone}</p>
            <p><strong>Pickup Address:</strong> ${donation.pickup_address}</p>
            <p><strong>Pickup Window:</strong> ${new Date(donation.pickup_window_start).toLocaleString()} - ${new Date(donation.pickup_window_end).toLocaleString()}</p>
          </div>
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Contact the donor at ${donor.phone}</li>
            <li>Coordinate pickup time</li>
            <li>Pick up the food</li>
            <li>Mark as collected in your dashboard</li>
          </ol>
          <p>Best regards,<br>FoodBridge Team</p>
        </div>
      `
    },
    donor: {
      subject: 'Your Donation Has Been Claimed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎉 Your Donation Has Been Claimed!</h2>
          <p>Dear ${donor.contact_person},</p>
          <p>Great news! Your food donation has been claimed by an NGO:</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${donation.food_items.map(item => item.name).join(', ')}</h3>
            <p><strong>Claimed by:</strong> ${ngo.organization_name}</p>
            <p><strong>Contact Person:</strong> ${ngo.contact_person}</p>
            <p><strong>Phone:</strong> ${ngo.phone}</p>
          </div>
          <p><strong>What's Next:</strong></p>
          <p>The NGO will contact you shortly to coordinate the pickup. Please be available during your specified pickup window.</p>
          <p>Thank you for helping reduce food waste and feeding those in need!</p>
          <p>Best regards,<br>FoodBridge Team</p>
        </div>
      `
    }
  }),

  donationCompleted: (donation, ngo, donor) => ({
    ngo: {
      subject: 'Donation Completed - Thank You!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">🙏 Thank You for Making a Difference!</h2>
          <p>Dear ${ngo.contact_person},</p>
          <p>You have successfully completed a food donation pickup:</p>
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${donation.food_items.map(item => item.name).join(', ')}</h3>
            <p><strong>From:</strong> ${donor.organization_name}</p>
            <p><strong>Serves:</strong> ${donation.quantity_serves} people</p>
            <p><strong>Completed:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Your efforts help reduce food waste and feed those in need. Keep up the amazing work!</p>
          <p>Best regards,<br>FoodBridge Team</p>
        </div>
      `
    },
    donor: {
      subject: 'Donation Successfully Completed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">✨ Your Donation Made an Impact!</h2>
          <p>Dear ${donor.contact_person},</p>
          <p>Your food donation has been successfully collected and will help feed ${donation.quantity_serves} people!</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Impact Summary</h3>
            <p><strong>Food Items:</strong> ${donation.food_items.map(item => item.name).join(', ')}</p>
            <p><strong>People Fed:</strong> ${donation.quantity_serves}</p>
            <p><strong>Collected by:</strong> ${ngo.organization_name}</p>
            <p><strong>Completed:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Thank you for being part of the solution to food waste and hunger!</p>
          <p>Best regards,<br>FoodBridge Team</p>
        </div>
      `
    }
  }),

  login: (user) => ({
    subject: 'Welcome Back to FoodBridge!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome Back!</h2>
        <p>Dear ${user.contact_person},</p>
        <p>You have successfully logged into your FoodBridge account.</p>
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Login Details:</h3>
          <p><strong>Account:</strong> ${user.email}</p>
          <p><strong>Organization:</strong> ${user.organization_name}</p>
          <p><strong>Role:</strong> ${user.role.toUpperCase()}</p>
          <p><strong>Login Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>If this wasn't you, please contact our support team immediately.</p>
        <p>Best regards,<br>FoodBridge Team</p>
      </div>
    `
  }),

  logout: (user) => ({
    subject: 'Logout Notification - FoodBridge',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b7280;">Logout Notification</h2>
        <p>Dear ${user.contact_person},</p>
        <p>You have successfully logged out from your FoodBridge account.</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Logout Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Account:</strong> ${user.email}</p>
        </div>
        <p>If this wasn't you, please contact our support team immediately.</p>
        <p>Best regards,<br>FoodBridge Team</p>
      </div>
    `
  })
};

// Send Email Function
const sendEmail = async (to, template) => {
  try {
    console.log(`Attempting to send email to: ${to}`);
    console.log(`Email subject: ${template.subject}`);
    
    const mailOptions = {
      from: `"FoodBridge" <${process.env.SMTP_USER}>`,
      to: to,
      subject: template.subject,
      html: template.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
};

module.exports = {
  sendEmail,
  emailTemplates
};