import { io, Socket } from 'socket.io-client';

// ======================================================
// Backend Configuration
// ======================================================

// The ONLY backend URL the frontend should know.
// Example:
// NEXT_PUBLIC_API_URL=https://legacy-homes-backend-production.up.railway.app/api
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is not defined. Please configure it in your environment variables.'
  );
}

// Derive the Socket.IO server URL from the API URL.
// https://example.com/api -> https://example.com
const SOCKET_URL = new URL(API_URL);
SOCKET_URL.pathname = '';

let socket: Socket | null = null;

// ======================================================
// Get Socket Instance
// ======================================================

export const getSocket = (userId?: string): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL.toString(), {
      transports: ['websocket'],

      autoConnect: true,

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,

      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket?.id);

      if (userId) {
        socket.emit('join_room', userId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    socket.io.on('reconnect', (attempt) => {
      console.log(`✅ Socket reconnected after ${attempt} attempt(s)`);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Socket reconnect attempt ${attempt}`);
    });

    socket.io.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnect error:', error.message);
    });

    socket.io.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed.');
    });
  }

  return socket;
};

// ======================================================
// Disconnect Socket
// ======================================================

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
