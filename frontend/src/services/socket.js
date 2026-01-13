import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(userId, role) {
    if (!this.socket) {
      try {
        this.socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
          timeout: 5000,
          forceNew: true
        });
        
        this.socket.on('connect', () => {
          console.log('Connected to server');
          if (role === 'ngo') {
            this.socket.emit('join-ngo-room', userId);
          }
        });

        this.socket.on('connect_error', (error) => {
          console.warn('Socket connection failed:', error.message);
        });
      } catch (error) {
        console.warn('Socket initialization failed:', error.message);
      }
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onNewDonation(callback) {
    if (this.socket) {
      this.socket.on('new-donation', callback);
    }
  }

  onDonationClaimed(callback) {
    if (this.socket) {
      this.socket.on('donation-claimed', callback);
    }
  }

  offAllListeners() {
    if (this.socket) {
      this.socket.off('new-donation');
      this.socket.off('donation-claimed');
    }
  }
}

export default new SocketService();