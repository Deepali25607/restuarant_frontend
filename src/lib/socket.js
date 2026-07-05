import { io } from 'socket.io-client'

// Derive the socket connection details from VITE_API_URL so a single env var
// configures the whole app. Behind the "/OrderNow" reverse proxy the API URL is
// https://nexussoftlab.com/OrderNow/api, which yields:
//   origin      → https://nexussoftlab.com   (what socket.io actually dials)
//   socket path → /OrderNow/socket.io         (matches the backend SOCKET_PATH)
// In local dev (http://localhost:5050/api) the path collapses to /socket.io.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api'
const parsed = new URL(
  API_URL,
  typeof window !== 'undefined' ? window.location.href : 'http://localhost',
)
const ORIGIN = parsed.origin
const BASE_PATH = parsed.pathname.replace(/\/api\/?$/, '') // '/OrderNow' or ''
const SOCKET_PATH = `${BASE_PATH}/socket.io`.replace(/\/{2,}/g, '/')

let socket
export function getSocket() {
  if (!socket) {
    socket = io(ORIGIN, {
      path: SOCKET_PATH,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}
