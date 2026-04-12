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

// Modern Email Base Template
const getEmailBase = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FoodBridge</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-font-smoothing: antialiased; }
    .email-wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .email-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
    .logo { width: 60px; height: 60px; background: white; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 15px; }
    .email-header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .email-header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; }
    .email-body { padding: 40px 30px; }
    .greeting { font-size: 18px; color: #1f2937; margin: 0 0 20px 0; font-weight: 600; }
    .message { font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 25px 0; }
    .info-card { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #3b82f6; border-radius: 12px; padding: 25px; margin: 25px 0; }
    .info-card.success { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left-color: #10b981; }
    .info-card.warning { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left-color: #f59e0b; }
    .info-card.danger { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left-color: #ef4444; }
    .info-card h3 { margin: 0 0 15px 0; font-size: 18px; color: #1f2937; font-weight: 600; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table tr { border-bottom: 1px solid rgba(0,0,0,0.05); }
    .info-table tr:last-child { border-bottom: none; }
    .info-table td { padding: 12px 0; font-size: 14px; }
    .info-table td:first-child { color: #6b7280; font-weight: 500; width: 40%; }
    .info-table td:last-child { color: #1f2937; font-weight: 600; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge.donor { background: #dbeafe; color: #1e40af; }
    .badge.ngo { background: #d1fae5; color: #065f46; }
    .badge.admin { background: #fce7f3; color: #9f1239; }
    .badge.pending { background: #fef3c7; color: #92400e; }
    .badge.approved { background: #d1fae5; color: #065f46; }
    .badge.rejected { background: #fee2e2; color: #991b1b; }
    .action-list { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .action-list ol { margin: 0; padding-left: 20px; }
    .action-list li { color: #4b5563; font-size: 14px; line-height: 1.8; margin-bottom: 8px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .stat-card { background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0; }
    .stat-label { font-size: 12px; color: #6b7280; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .email-footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
    .email-footer p { margin: 0 0 10px 0; font-size: 13px; color: #6b7280; }
    .social-links { margin: 15px 0; }
    .social-links a { display: inline-block; width: 36px; height: 36px; background: #e5e7eb; border-radius: 50%; margin: 0 5px; line-height: 36px; text-decoration: none; color: #4b5563; font-size: 16px; }
    .divider { height: 1px; background: linear-gradient(to right, transparent, #e5e7eb, transparent); margin: 30px 0; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { margin: 0; border-radius: 0; }
      .email-body { padding: 30px 20px; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="logo">🍽️</div>
      <h1>FoodBridge</h1>
      <p>Connecting Hearts, Reducing Waste</p>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p><strong>FoodBridge</strong> - Bridging Food Surplus with Food Security</p>
      <p>📧 support@foodbridge.com | 📞 +91 8849096412
      
      <p style="font-size: 11px; color: #9ca3af; margin-top: 20px;">
        © 2026 FoodBridge. All rights reserved.<br>
        This email was sent to you because you are registered with FoodBridge.
      </p>
    </div>
  </div>
</body>
</html>
`;

// Email Templates
const emailTemplates = {
  registration: (user) => ({
    subject: '🎉 Welcome to FoodBridge - Registration Successful!',
    html: getEmailBase(`
      <p class="greeting">Dear ${user.contact_person},</p>
      <p class="message">
        Thank you for joining FoodBridge! We're excited to have you as part of our mission to reduce food waste and help feed those in need.
      </p>
      <div class="info-card">
        <h3>📝 Your Registration Details</h3>
        <table class="info-table">
          <tr><td>Organization</td><td>${user.organization_name}</td></tr>
          <tr><td>Email Address</td><td>${user.email}</td></tr>
          <tr><td>Contact Person</td><td>${user.contact_person}</td></tr>
          <tr><td>Phone Number</td><td>${user.phone}</td></tr>
          <tr><td>Role</td><td><span class="badge ${user.role}">${user.role.toUpperCase()}</span></td></tr>
          <tr><td>License Number</td><td>${user.license_number}</td></tr>
          <tr><td>Status</td><td><span class="badge pending">Pending Verification</span></td></tr>
          <tr><td>Registered On</td><td>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
        </table>
      </div>
      <div class="info-card warning">
        <h3>⏳ What Happens Next?</h3>
        <p class="message">Your account is currently under review by our admin team. This process typically takes 24-48 hours. You'll receive an email notification once your account is approved.</p>
      </div>
      <div class="divider"></div>
      <p class="message" style="text-align: center; color: #6b7280; font-size: 14px;">
        <strong>Thank you for choosing FoodBridge!</strong><br>Together, we can make a difference.
      </p>
    `)
  }),

  approval: (user, approved) => ({
    subject: approved ? '✅ Account Approved - Welcome to FoodBridge!' : '❌ Account Registration Update',
    html: getEmailBase(`
      <p class="greeting">Dear ${user.contact_person},</p>
      ${approved ? `
        <p class="message">🎉 <strong>Great news!</strong> Your FoodBridge account has been approved and is now active!</p>
        <div class="info-card success">
          <h3>✅ Account Approved</h3>
          <table class="info-table">
            <tr><td>Organization</td><td>${user.organization_name}</td></tr>
            <tr><td>Account Type</td><td><span class="badge ${user.role}">${user.role.toUpperCase()}</span></td></tr>
            <tr><td>Status</td><td><span class="badge approved">VERIFIED</span></td></tr>
            <tr><td>Approved On</td><td>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
          </table>
        </div>
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="cta-button">🚀 Login to Your Dashboard</a>
        </div>
      ` : `
        <p class="message">We regret to inform you that your account registration has been rejected after review.</p>
        <div class="info-card danger">
          <h3>❌ Registration Rejected</h3>
          <p class="message">Your application did not meet our verification criteria. Please contact <strong>support@foodbridge.com</strong> for more information.</p>
        </div>
      `}
      <div class="divider"></div>
      <p class="message" style="text-align: center; color: #6b7280; font-size: 14px;">Questions? Contact us at support@foodbridge.com</p>
    `)
  }),

  newDonation: (donation, ngo) => ({
    subject: '🍽️ New Food Donation Available Nearby!',
    html: getEmailBase(`
      <p class="greeting">Dear ${ngo.contact_person},</p>
      <p class="message">🚨 <strong>Alert!</strong> A new food donation matching your area is now available.</p>
      <div class="info-card success">
        <h3>🍽️ Donation Details</h3>
        <table class="info-table">
          <tr><td>Food Items</td><td><strong>${donation.food_items.map(item => item.name).join(', ')}</strong></td></tr>
          <tr><td>Quantity</td><td><strong>🍽️ Serves ${donation.quantity_serves} people</strong></td></tr>
          <tr><td>Donor</td><td>${donation.donor_id.organization_name}</td></tr>
          <tr><td>Contact</td><td>${donation.donor_id.phone}</td></tr>
        </table>
      </div>
      <div class="info-card warning">
        <h3>📍 Pickup Information</h3>
        <table class="info-table">
          <tr><td>Address</td><td>${donation.pickup_address}</td></tr>
          <tr><td>Pickup Window</td><td><strong>From:</strong> ${new Date(donation.pickup_window_start).toLocaleString('en-IN')}<br><strong>To:</strong> ${new Date(donation.pickup_window_end).toLocaleString('en-IN')}</td></tr>
        </table>
      </div>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="cta-button">👍 Claim This Donation</a>
      </div>
    `)
  }),

  donationClaimed: (donation, ngo, donor) => ({
    ngo: {
      subject: '✅ Donation Claimed Successfully!',
      html: getEmailBase(`
        <p class="greeting">Dear ${ngo.contact_person},</p>
        <p class="message">🎉 <strong>Success!</strong> You have successfully claimed a food donation. Please coordinate with the donor for pickup.</p>
        <div class="info-card success">
          <h3>🍽️ Claimed Donation</h3>
          <table class="info-table">
            <tr><td>Food Items</td><td><strong>${donation.food_items.map(item => item.name).join(', ')}</strong></td></tr>
            <tr><td>Quantity</td><td><strong>🍽️ Serves ${donation.quantity_serves} people</strong></td></tr>
            <tr><td>Claimed On</td><td>${new Date().toLocaleString('en-IN')}</td></tr>
          </table>
        </div>
        <div class="info-card">
          <h3>👤 Donor Contact Information</h3>
          <table class="info-table">
            <tr><td>Organization</td><td>${donor.organization_name}</td></tr>
            <tr><td>Contact Person</td><td>${donor.contact_person}</td></tr>
            <tr><td>Phone Number</td><td><strong>📞 ${donor.phone}</strong></td></tr>
            <tr><td>Email</td><td>${donor.email}</td></tr>
          </table>
        </div>
        <div class="info-card warning">
          <h3>📍 Pickup Details</h3>
          <table class="info-table">
            <tr><td>Address</td><td>${donation.pickup_address}</td></tr>
            <tr><td>Pickup Window</td><td><strong>From:</strong> ${new Date(donation.pickup_window_start).toLocaleString('en-IN')}<br><strong>To:</strong> ${new Date(donation.pickup_window_end).toLocaleString('en-IN')}</td></tr>
          </table>
        </div>
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="cta-button">📊 View in Dashboard</a>
        </div>
      `)
    },
    donor: {
      subject: '🎉 Your Donation Has Been Claimed!',
      html: getEmailBase(`
        <p class="greeting">Dear ${donor.contact_person},</p>
        <p class="message">🎉 <strong>Great news!</strong> Your food donation has been claimed by an NGO. They will contact you shortly to coordinate pickup.</p>
        <div class="info-card success">
          <h3>🍽️ Donation Claimed</h3>
          <table class="info-table">
            <tr><td>Food Items</td><td><strong>${donation.food_items.map(item => item.name).join(', ')}</strong></td></tr>
            <tr><td>Quantity</td><td><strong>🍽️ Serves ${donation.quantity_serves} people</strong></td></tr>
            <tr><td>Claimed On</td><td>${new Date().toLocaleString('en-IN')}</td></tr>
          </table>
        </div>
        <div class="info-card">
          <h3>🤝 NGO Contact Information</h3>
          <table class="info-table">
            <tr><td>Organization</td><td>${ngo.organization_name}</td></tr>
            <tr><td>Contact Person</td><td>${ngo.contact_person}</td></tr>
            <tr><td>Phone Number</td><td><strong>📞 ${ngo.phone}</strong></td></tr>
            <tr><td>Email</td><td>${ngo.email}</td></tr>
          </table>
        </div>
        <div class="divider"></div>
        <p class="message" style="text-align: center; color: #6b7280; font-size: 14px;">
          <strong>Thank you for helping reduce food waste!</strong><br>
          Your contribution will help feed ${donation.quantity_serves} people. 🙏
        </p>
      `)
    }
  }),

  donationCompleted: (donation, ngo, donor) => ({
    ngo: {
      subject: '🙏 Donation Completed - Thank You!',
      html: getEmailBase(`
        <p class="greeting">Dear ${ngo.contact_person},</p>
        <p class="message">🎉 <strong>Congratulations!</strong> You have successfully completed a food donation pickup.</p>
        <div class="info-card success">
          <h3>✅ Completed Donation</h3>
          <table class="info-table">
            <tr><td>Food Items</td><td><strong>${donation.food_items.map(item => item.name).join(', ')}</strong></td></tr>
            <tr><td>Quantity</td><td><strong>🍽️ Serves ${donation.quantity_serves} people</strong></td></tr>
            <tr><td>Donor</td><td>${donor.organization_name}</td></tr>
            <tr><td>Status</td><td><span class="badge approved">COMPLETED</span></td></tr>
            <tr><td>Completed On</td><td>${new Date().toLocaleString('en-IN')}</td></tr>
          </table>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><p class="stat-value">${donation.quantity_serves}</p><p class="stat-label">People Fed</p></div>
          <div class="stat-card"><p class="stat-value">100%</p><p class="stat-label">Food Saved</p></div>
        </div>
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="cta-button">📊 View Your Impact</a>
        </div>
      `)
    },
    donor: {
      subject: '✨ Your Donation Made an Impact!',
      html: getEmailBase(`
        <p class="greeting">Dear ${donor.contact_person},</p>
        <p class="message">✨ <strong>Wonderful news!</strong> Your food donation has been successfully collected and will help feed ${donation.quantity_serves} people!</p>
        <div class="info-card success">
          <h3>🎯 Impact Summary</h3>
          <table class="info-table">
            <tr><td>Food Items</td><td><strong>${donation.food_items.map(item => item.name).join(', ')}</strong></td></tr>
            <tr><td>People Fed</td><td><strong>🍽️ ${donation.quantity_serves} people</strong></td></tr>
            <tr><td>Collected By</td><td>${ngo.organization_name}</td></tr>
            <tr><td>Status</td><td><span class="badge approved">COMPLETED</span></td></tr>
            <tr><td>Completed On</td><td>${new Date().toLocaleString('en-IN')}</td></tr>
          </table>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><p class="stat-value">${donation.quantity_serves}</p><p class="stat-label">People Helped</p></div>
          <div class="stat-card"><p class="stat-value">0kg</p><p class="stat-label">Waste Prevented</p></div>
        </div>
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="cta-button">📊 View Your Impact Dashboard</a>
        </div>
        <div class="divider"></div>
        <p class="message" style="text-align: center; color: #6b7280; font-size: 14px;">
          <strong>Thank you for being a FoodBridge hero!</strong><br>Your generosity makes a real difference. 🙏
        </p>
      `)
    }
  }),

  login: (user) => ({
    subject: '🔐 Welcome Back to FoodBridge!',
    html: getEmailBase(`
      <p class="greeting">Welcome back, ${user.contact_person}!</p>
      <p class="message">You have successfully logged into your FoodBridge account.</p>
      <div class="info-card">
        <h3>🔐 Login Details</h3>
        <table class="info-table">
          <tr><td>Account</td><td>${user.email}</td></tr>
          <tr><td>Organization</td><td>${user.organization_name}</td></tr>
          <tr><td>Role</td><td><span class="badge ${user.role}">${user.role.toUpperCase()}</span></td></tr>
          <tr><td>Login Time</td><td>${new Date().toLocaleString('en-IN')}</td></tr>
        </table>
      </div>
      <div class="info-card warning">
        <h3>🔒 Security Notice</h3>
        <p class="message">If this wasn't you, please contact our support team immediately at <strong>support@foodbridge.com</strong>.</p>
      </div>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="cta-button">📊 Go to Dashboard</a>
      </div>
    `)
  }),

  logout: (user) => ({
    subject: '👋 Logout Notification - FoodBridge',
    html: getEmailBase(`
      <p class="greeting">Goodbye, ${user.contact_person}!</p>
      <p class="message">You have successfully logged out from your FoodBridge account.</p>
      <div class="info-card">
        <h3>📝 Session Details</h3>
        <table class="info-table">
          <tr><td>Account</td><td>${user.email}</td></tr>
          <tr><td>Logout Time</td><td>${new Date().toLocaleString('en-IN')}</td></tr>
        </table>
      </div>
      <div class="info-card warning">
        <h3>🔒 Security Notice</h3>
        <p class="message">If this wasn't you, please contact our support team immediately.</p>
      </div>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="cta-button">🔐 Login Again</a>
      </div>
      <div class="divider"></div>
      <p class="message" style="text-align: center; color: #6b7280; font-size: 14px;">
        Thank you for using FoodBridge!<br>See you again soon. 👋
      </p>
    `)
  }),

  passwordResetOTP: (user, otp) => ({
    subject: '🔐 Password Reset OTP - FoodBridge',
    html: getEmailBase(`
      <p class="greeting">Hello, ${user.contact_person}!</p>
      <p class="message">You requested to reset your password. Use the OTP below to proceed:</p>
      <div class="info-card" style="text-align: center;">
        <h3>🔑 Your 6-Digit OTP</h3>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 36px; font-weight: 800; letter-spacing: 8px; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: 'Courier New', monospace; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;">${otp}</div>
        <p style="color: #10b981; font-size: 14px; font-weight: 600; margin: 15px 0 5px 0;">📋 Tap and hold the code above to copy</p>
        <p class="message" style="color: #6b7280; font-size: 13px; margin-top: 5px;">This OTP is valid for 10 minutes</p>
      </div>
      <div class="info-card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #3b82f6; border-radius: 12px; padding: 25px; margin: 25px 0;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1f2937; font-weight: 600;">📱 How to Use:</h3>
        <ol style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
          <li><strong>Tap and hold</strong> the OTP code above</li>
          <li>Select <strong>"Copy"</strong> from the menu</li>
          <li>Open the FoodBridge app</li>
          <li>Tap <strong>"Paste OTP from Clipboard"</strong> button</li>
          <li>Enter your new password</li>
        </ol>
      </div>
      <div class="info-card warning">
        <h3>🔒 Security Tips</h3>
        <ul style="margin: 10px 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
          <li>Never share this OTP with anyone</li>
          <li>FoodBridge will never ask for your OTP via phone or email</li>
          <li>If you didn't request this, please ignore this email</li>
        </ul>
      </div>
      <div class="divider"></div>
      <p class="message" style="text-align: center; color: #6b7280; font-size: 14px;">
        Need help? Contact us at <strong>support@foodbridge.com</strong>
      </p>
    `)
  })
};

// Send Email Function
const sendEmail = async (to, template) => {
  try {
    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📨 Email subject: ${template.subject}`);
    const mailOptions = {
      from: `"FoodBridge 🍽️" <${process.env.SMTP_USER}>`,
      to,
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

module.exports = { sendEmail, emailTemplates };
