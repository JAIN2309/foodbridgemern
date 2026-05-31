const { decrypt } = require('./encryption');

/**
 * Manually decrypt user fields that are encrypted
 * Use this when .select() bypasses the post-init hook
 */
function decryptUserFields(user) {
  if (!user) return null;
  
  const userObj = user.toObject ? user.toObject() : user;
  
  // Helper function to safely decrypt
  const safeDecrypt = (value, fieldName) => {
    if (!value || typeof value !== 'string') return value;
    if (!value.includes(':')) return value; // Not encrypted
    if (value.startsWith('data:')) return value; // Base64 image, not encrypted
    
    try {
      return decrypt(value);
    } catch (error) {
      console.warn(`⚠️  Failed to decrypt ${fieldName}, using original value`);
      return value; // Return original if decryption fails
    }
  };
  
  // Decrypt from _encrypted fields first (preferred)
  if (userObj.email_encrypted) {
    userObj.email = safeDecrypt(userObj.email_encrypted, 'email');
  } else if (userObj.email) {
    userObj.email = safeDecrypt(userObj.email, 'email');
  }
  
  if (userObj.phone_encrypted) {
    userObj.phone = safeDecrypt(userObj.phone_encrypted, 'phone');
  } else if (userObj.phone) {
    userObj.phone = safeDecrypt(userObj.phone, 'phone');
  }
  
  if (userObj.license_number_encrypted) {
    userObj.license_number = safeDecrypt(userObj.license_number_encrypted, 'license_number');
  } else if (userObj.license_number) {
    userObj.license_number = safeDecrypt(userObj.license_number, 'license_number');
  }
  
  if (userObj.contact_person_encrypted) {
    userObj.contact_person = safeDecrypt(userObj.contact_person_encrypted, 'contact_person');
  } else if (userObj.contact_person) {
    userObj.contact_person = safeDecrypt(userObj.contact_person, 'contact_person');
  }
  
  // Decrypt profile picture if it's encrypted
  if (userObj.profile_picture) {
    userObj.profile_picture = safeDecrypt(userObj.profile_picture, 'profile_picture');
  }
  
  // Decrypt OTP if it's encrypted
  if (userObj.password_reset?.otp) {
    userObj.password_reset.otp = safeDecrypt(userObj.password_reset.otp, 'otp');
  }
  
  return userObj;
}

module.exports = { decryptUserFields };
