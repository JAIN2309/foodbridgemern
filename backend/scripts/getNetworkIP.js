const os = require('os');

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return 'localhost';
}

const ip = getNetworkIP();
console.log('🌐 Your network IP address:', ip);
console.log('📱 Use this in React Native:', `http://${ip}:5001`);
console.log('💻 Local access:', 'http://localhost:5001');