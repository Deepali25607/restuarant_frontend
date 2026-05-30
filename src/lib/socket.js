import { io } from 'socket.io-client'

const URL = (import.meta.env.VITE_API_URL || 'http://localhost:5050/api').replace(/\/api$/, '')

let socket
export function getSocket() {
  if (!socket) {
    socket = io(URL, { autoConnect: true, transports: ['websocket', 'polling'] })
  }
  return socket
}
