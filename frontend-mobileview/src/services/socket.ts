import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

// Single source of truth: derive the socket URL from whichever env URL is set
// (strip the trailing /api path). Falls back to api.ts's API_BASE_URL.
const SOCKET_URL = (
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  API_BASE_URL
).replace(/\/api\/?$/, '');

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string, role: string) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      // Join the user's own room so targeted events reach this client.
      // Server only handles these emits (server.js) — query params are ignored.
      if (role === 'ngo') this.socket?.emit('join-ngo-room', userId);
      if (role === 'donor') this.socket?.emit('join-donor-room', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }
}

export default new SocketService();
