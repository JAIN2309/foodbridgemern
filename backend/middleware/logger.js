const logger = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  console.log(`🔵 [${new Date().toISOString()}] ${method} ${url} - IP: ${ip}`);
  
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
    
    console.log(`${statusColor} [${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms`);
    
    // Log response data for errors or important operations
    if (statusCode >= 400 || method !== 'GET') {
      console.log(`📤 Response:`, JSON.stringify(data, null, 2));
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = logger;