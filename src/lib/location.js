// Shared helper for labelling an order's origin — a dine-in table, a
// room-service room, or a takeaway pickup. Accepts an order ({ serviceType,
// tableNo }) or a raw { serviceType, number }. `short` gives the compact
// "T2" / "R101" / "T/A" form.
export function locationLabel(o, { short = false } = {}) {
  const serviceType = o?.serviceType
  const n = o?.tableNo ?? o?.number ?? ''
  if (serviceType === 'takeaway') {
    if (short) return 'T/A'
    return n ? `Takeaway #${n}` : 'Takeaway'
  }
  const isRoom = serviceType === 'room'
  if (short) return `${isRoom ? 'R' : 'T'}${n}`
  return `${isRoom ? 'Room' : 'Table'} ${n}`
}

export function locationNoun(serviceType) {
  if (serviceType === 'takeaway') return 'Takeaway'
  return serviceType === 'room' ? 'Room' : 'Table'
}
