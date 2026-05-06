const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 64), 'hex');
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt data using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text with IV and auth tag (format: iv:authTag:encrypted)
 */
function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Encrypted text (format: iv:authTag:encrypted)
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedData) {
  if (!encryptedData) return null;
  
  const parts = encryptedData.split(':');
  if (parts.length !== 3) return encryptedData; // Return as-is if not encrypted
  
  try {
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption failed:', error.message);
    return encryptedData; // Return original if decryption fails
  }
}

module.exports = { encrypt, decrypt };
