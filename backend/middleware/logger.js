const SENSITIVE_KEYS = new Set([
  'password', 'confirmPassword', 'currentPassword', 'newPassword',
  'token', 'accessToken', 'refreshToken',
  'otp', 'secret', 'authorization',
  'email_encrypted', 'phone_encrypted', 'contact_person_encrypted',
  'license_number_encrypted', 'profile_picture', 'ENCRYPTION_KEY',
  'JWT_SECRET', 'SMTP_PASS', 'TWILIO_AUTH_TOKEN',
]);

function redact(obj, depth = 0) {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    out[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : redact(obj[key], depth + 1);
  }
  return out;
}

const getLocalTimestamp = () => {
  return new Date().toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    fractionalSecondDigits: 3, hour12: false
  }).replace(/[^\d]/g, m => m === ',' ? 'T' : m === ' ' ? '' : m);
};

const logger = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;

  console.log(`🔵 [${getLocalTimestamp()}] ${method} ${url}`);
  console.log(`   📍 IP: ${ip} | User-Agent: ${req.get('User-Agent')?.substring(0, 50) || 'Unknown'}`);
  console.log(`   🌐 Origin: ${req.get('Origin') || 'No Origin'}`);

  if ((method === 'POST' || method === 'PUT') && req.body) {
    console.log('📝 Request Body:', JSON.stringify(redact(req.body), null, 2));
  }

  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 400 ? '🔴' : statusCode >= 300 ? '🟡' : '🟢';

    console.log(`${statusColor} [${getLocalTimestamp()}] ${method} ${url} - ${statusCode} - ${duration}ms`);

    if (statusCode >= 400 || method !== 'GET') {
      console.log('📤 Response:', JSON.stringify(redact(data), null, 2));
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = logger;
