const getLocalTimestamp = () => {
  return new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false
  }).replace(/[^\d]/g, match => match === ',' ? 'T' : match === ' ' ? '' : match);
};

const logger = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  console.log(`🔵 [${getLocalTimestamp()}] ${method} ${url}`);
  console.log(`   📍 IP: ${ip} | User-Agent: ${req.get('User-Agent')?.substring(0, 50) || 'Unknown'}`);
  console.log(`   🌐 Origin: ${req.get('Origin') || 'No Origin'}`);
  
  // Log request body for POST/PUT requests
  if ((method === 'POST' || method === 'PUT') && req.body) {
    console.log(`📝 Request Body:`, JSON.stringify(req.body, null, 2));
  }
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Color code based on status
    const statusColor = statusCode >= 400 ? '🔴' : statusCode >= 300 ? '🟡' : '🟢';
    
    console.log(`${statusColor} [${getLocalTimestamp()}] ${method} ${url} - ${statusCode} - ${duration}ms`);
    
    // Log response data for errors or important operations
    if (statusCode >= 400 || method !== 'GET') {
      console.log(`📤 Response:`, JSON.stringify(data, null, 2));
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = logger;