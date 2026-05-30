// Kitchen alerts: synthesised chime + browser notification + tab badge.
// No audio asset — uses Web Audio API directly so it works offline.

const PREFS_KEY = 'masala-story-kitchen-alerts'
const COOLDOWN_MS = 700

let audioCtx = null
let lastPlayed = 0
const listeners = new Set()

const defaults = { sound: true, push: true }

function loadPrefs() {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(PREFS_KEY)) || {}) }
  } catch {
    return { ...defaults }
  }
}

function savePrefs(p) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p))
  listeners.forEach((fn) => fn(p))
}

let prefs = typeof window !== 'undefined' ? loadPrefs() : { ...defaults }

export function getPrefs() {
  return { ...prefs }
}

export function setPrefs(patch) {
  prefs = { ...prefs, ...patch }
  savePrefs(prefs)
}

export function subscribePrefs(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  return Notification.requestPermission()
}

// Must be called from a user gesture (button click) — primes audio context
// so future programmatic plays aren't blocked by autoplay policy.
export async function primeAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return false
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume()
    } catch {
      return false
    }
  }
  return true
}

// Pleasant two-tone bell (G5 → C6). Designed to cut through kitchen noise
// without being painful.
function playChime() {
  if (!audioCtx) return
  const now = audioCtx.currentTime
  const master = audioCtx.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.5, now + 0.02)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)
  master.connect(audioCtx.destination)

  const tones = [
    { freq: 784, start: 0, dur: 0.45 },   // G5
    { freq: 1046, start: 0.18, dur: 0.55 }, // C6
  ]

  tones.forEach(({ freq, start, dur }) => {
    const osc = audioCtx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const g = audioCtx.createGain()
    g.gain.setValueAtTime(0.0001, now + start)
    g.gain.exponentialRampToValueAtTime(1, now + start + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
    osc.connect(g).connect(master)
    osc.start(now + start)
    osc.stop(now + start + dur + 0.02)
  })
}

function tooSoon() {
  const now = Date.now()
  if (now - lastPlayed < COOLDOWN_MS) return true
  lastPlayed = now
  return false
}

export function notifyNewOrder(order) {
  if (tooSoon()) return
  if (prefs.sound) playChime()

  const title = `New order · Table ${order.tableNo}`
  const body = `${order.items?.length || 0} item${(order.items?.length || 0) > 1 ? 's' : ''} · ₹${order.amounts?.total ?? ''}`

  // Only fire OS notification when the tab isn't visible — otherwise the
  // sonner toast inside the app is enough.
  const hidden = typeof document !== 'undefined' && document.visibilityState !== 'visible'
  if (prefs.push && hidden && notificationPermission() === 'granted') {
    try {
      new Notification(title, {
        body,
        tag: `order-${order.id}`,
        silent: false,
        requireInteraction: false,
      })
    } catch {
      /* notification creation can throw on some platforms (e.g. iOS PWA) */
    }
  }
}

// Tiny tab-title badge so backgrounded kitchen tabs visibly attract attention.
let pendingCount = 0
let baseTitle = typeof document !== 'undefined' ? document.title : ''

export function bumpTabBadge() {
  if (typeof document === 'undefined') return
  if (document.visibilityState === 'visible') return
  pendingCount += 1
  document.title = `(${pendingCount}) ${baseTitle.replace(/^\(\d+\)\s*/, '')}`
}

export function clearTabBadge() {
  if (typeof document === 'undefined') return
  pendingCount = 0
  document.title = baseTitle.replace(/^\(\d+\)\s*/, '')
}

export function attachVisibilityClearer() {
  if (typeof document === 'undefined') return () => {}
  const onVis = () => {
    if (document.visibilityState === 'visible') clearTabBadge()
  }
  document.addEventListener('visibilitychange', onVis)
  return () => document.removeEventListener('visibilitychange', onVis)
}
