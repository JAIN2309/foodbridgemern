const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey(envVar) {
  const raw = process.env[envVar];
  if (!raw) return null;
  return Buffer.from(raw, 'hex');
}

function encrypt(text) {
  if (!text) return null;

  const key = getKey('ENCRYPTION_KEY');
  if (!key) throw new Error('ENCRYPTION_KEY is not set');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function tryDecryptWithKey(envVar, ivHex, authTagHex, encryptedHex) {
  const key = getKey(envVar);
  if (!key) return null;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function decrypt(encryptedData) {
  if (!encryptedData) return null;

  const parts = encryptedData.split(':');
  if (parts.length !== 3) return encryptedData;

  const [ivHex, authTagHex, encryptedHex] = parts;

  // Try current key first
  try {
    return tryDecryptWithKey('ENCRYPTION_KEY', ivHex, authTagHex, encryptedHex);
  } catch (_) {}

  // Try old key (key rotation fallback)
  try {
    const result = tryDecryptWithKey('ENCRYPTION_KEY_OLD', ivHex, authTagHex, encryptedHex);
    if (result !== null) return result;
  } catch (_) {}

  console.error('❌ Decryption failed with all available keys');
  return null;
}

module.exports = { encrypt, decrypt };
