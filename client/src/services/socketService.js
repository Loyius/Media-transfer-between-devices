import { io } from 'socket.io-client';

export function createSocketClient() {
  return io();
}
