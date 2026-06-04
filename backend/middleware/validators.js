const { body, param, validationResult } = require('express-validator');

// ─── Shared error handler ────────────────────────────────────────────────────
// Call this as the last item in every validation chain array.
// Returns 400 with a clean errors array if any rule failed.
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// ─── Auth: Register ─────────────────────────────────────────────────────────
const validateRegister = [
  body('email')
    .trim().toLowerCase()
    .isEmail().withMessage('Valid email required')
    .isLength({ max: 254 }).withMessage('Email too long'),

  body('password')
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8–72 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),

  body('role')
    .isIn(['donor', 'ngo']).withMessage('Role must be donor or ngo'),

  body('organization_name')
    .trim().escape()
    .isLength({ min: 2, max: 100 }).withMessage('Organization name must be 2–100 characters'),

  body('contact_person')
    .trim().escape()
    .isLength({ min: 2, max: 100 }).withMessage('Contact person must be 2–100 characters'),

  body('phone')
    .trim()
    .matches(/^[6-9][0-9]{9}$/).withMessage('Valid 10-digit Indian mobile number required'),

  body('address')
    .trim().escape()
    .isLength({ min: 5, max: 300 }).withMessage('Address must be 5–300 characters'),

  body('license_number')
    .trim()
    .isLength({ min: 8, max: 20 }).withMessage('License/registration number must be 8–20 characters'),

  body('coordinates')
    .isArray({ min: 2, max: 2 }).withMessage('Coordinates must be [longitude, latitude]')
    .custom(([lng, lat]) => {
      if (typeof lng !== 'number' || typeof lat !== 'number') throw new Error('Coordinates must be numbers');
      if (lng < -180 || lng > 180) throw new Error('Longitude out of range');
      if (lat < -90  || lat > 90 ) throw new Error('Latitude out of range');
      return true;
    }),

  handleValidation
];

// ─── Auth: Login ─────────────────────────────────────────────────────────────
const validateLogin = [
  body('email')
    .trim().toLowerCase()
    .isEmail().withMessage('Valid email required')
    .isLength({ max: 254 }).withMessage('Email too long'),

  body('password')
    .isString().withMessage('Password must be a string')
    .isLength({ min: 1, max: 72 }).withMessage('Password required'),

  handleValidation
];

// ─── Auth: Update Profile ────────────────────────────────────────────────────
const validateUpdateProfile = [
  body('contact_person')
    .optional()
    .trim().escape()
    .isLength({ min: 2, max: 100 }).withMessage('Contact person must be 2–100 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9][0-9]{9}$/).withMessage('Valid 10-digit Indian mobile number required'),

  body('email')
    .optional()
    .trim().toLowerCase()
    .isEmail().withMessage('Valid email required')
    .isLength({ max: 254 }).withMessage('Email too long'),

  body('organization_name')
    .optional()
    .trim().escape()
    .isLength({ min: 2, max: 100 }).withMessage('Organization name must be 2–100 characters'),

  body('address')
    .optional()
    .trim().escape()
    .isLength({ min: 5, max: 300 }).withMessage('Address must be 5–300 characters'),

  handleValidation
];

// ─── Auth: Password Reset ────────────────────────────────────────────────────
const validatePasswordReset = [
  body('email')
    .trim().toLowerCase()
    .isEmail().withMessage('Valid email required'),

  body('otp')
    .optional()
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),

  body('newPassword')
    .optional()
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8–72 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),

  handleValidation
];

// ─── Donation: Create ────────────────────────────────────────────────────────
const validateCreateDonation = [
  body('quantity_serves')
    .isInt({ min: 1, max: 10000 }).withMessage('Serves must be between 1 and 10,000'),

  body('weight_kg')
    .isFloat({ min: 0.1, max: 5000 }).withMessage('Weight must be between 0.1 and 5,000 kg'),

  body('pickup_address')
    .trim().escape()
    .isLength({ min: 5, max: 300 }).withMessage('Pickup address must be 5–300 characters'),

  body('special_instructions')
    .optional()
    .trim().escape()
    .isLength({ max: 500 }).withMessage('Special instructions max 500 characters'),

  body('food_items')
    .custom(val => {
      const items = typeof val === 'string' ? JSON.parse(val) : val;
      if (!Array.isArray(items) || items.length === 0) throw new Error('At least one food item required');
      if (items.length > 20) throw new Error('Maximum 20 food items allowed');
      items.forEach((item, i) => {
        if (!item.name || typeof item.name !== 'string' || item.name.trim().length > 100)
          throw new Error(`Item ${i + 1}: name must be 1–100 characters`);
        if (!['vegetarian', 'non-vegetarian', 'vegan', 'mixed'].includes(item.category))
          throw new Error(`Item ${i + 1}: invalid category`);
      });
      return true;
    }),

  body('pickup_window_start')
    .isISO8601().withMessage('pickup_window_start must be a valid date'),

  body('pickup_window_end')
    .isISO8601().withMessage('pickup_window_end must be a valid date')
    .custom((end, { req }) => {
      if (new Date(end) <= new Date(req.body.pickup_window_start))
        throw new Error('pickup_window_end must be after pickup_window_start');
      return true;
    }),

  handleValidation
];

// ─── Donation: Claim ─────────────────────────────────────────────────────────
const validateClaimDonation = [
  param('donationId')
    .isMongoId().withMessage('Invalid donation ID'),

  body('pickup_type')
    .optional()
    .isIn(['instant', 'scheduled']).withMessage('pickup_type must be instant or scheduled'),

  body('scheduled_pickup_time')
    .optional()
    .isISO8601().withMessage('scheduled_pickup_time must be a valid ISO date')
    .custom(val => {
      if (new Date(val) <= new Date()) throw new Error('Scheduled time must be in the future');
      return true;
    }),

  handleValidation
];

// ─── Admin: Verify/Status User ───────────────────────────────────────────────
const validateAdminUserAction = [
  param('userId')
    .isMongoId().withMessage('Invalid user ID'),

  body('approved')
    .optional()
    .isBoolean().withMessage('approved must be boolean'),

  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be boolean'),

  handleValidation
];

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validatePasswordReset,
  validateCreateDonation,
  validateClaimDonation,
  validateAdminUserAction,
};
