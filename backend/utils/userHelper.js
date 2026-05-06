const { decrypt } = require('./encryption');

/**
 * Manually decrypt user fields that are encrypted
 * Use this when .select() bypasses the post-init hook
 */
function decryptUserFields(user) {
  if (!user) return null;
  
  const userObj = user.toObject ? user.toObject() : user;
  
  // Decrypt fields that are stored encrypted (contain : separator)
  if (userObj.email && typeof userObj.email === 'string' && userObj.email.includes(':')) {
    userObj.email = decrypt(userObj.email);
  }
  if (userObj.phone && typeof userObj.phone === 'string' && userObj.phone.includes(':')) {
    userObj.phone = decrypt(userObj.phone);
  }
  if (userObj.license_number && typeof userObj.license_number === 'string' && userObj.license_number.includes(':')) {
    userObj.license_number = decrypt(userObj.license_number);
  }
  if (userObj.contact_person && typeof userObj.contact_person === 'string' && userObj.contact_person.includes(':')) {
    userObj.contact_person = decrypt(userObj.contact_person);
  }
  
  // Also decrypt from _encrypted fields if they exist
  if (userObj.email_encrypted) {
    userObj.email = decrypt(userObj.email_encrypted);
  }
  if (userObj.phone_encrypted) {
    userObj.phone = decrypt(userObj.phone_encrypted);
  }
  if (userObj.license_number_encrypted) {
    userObj.license_number = decrypt(userObj.license_number_encrypted);
  }
  if (userObj.contact_person_encrypted) {
    userObj.contact_person = decrypt(userObj.contact_person_encrypted);
  }
  
  // Decrypt profile picture if it's encrypted (contains :)
  if (userObj.profile_picture && typeof userObj.profile_picture === 'string' && userObj.profile_picture.includes(':') && !userObj.profile_picture.startsWith('data:')) {
    userObj.profile_picture = decrypt(userObj.profile_picture);
  }
  
  // Decrypt OTP if it's encrypted
  if (userObj.password_reset?.otp && typeof userObj.password_reset.otp === 'string' && userObj.password_reset.otp.includes(':')) {
    userObj.password_reset.otp = decrypt(userObj.password_reset.otp);
  }
  
  return userObj;
}

module.exports = { decryptUserFields };
