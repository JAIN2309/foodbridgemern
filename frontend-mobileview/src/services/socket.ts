import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string, role: string) {
    if (this.socket?.connected) return;

    this.socket = io('http://10.132.72.65:5001', {
      query: { userId, role },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
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
