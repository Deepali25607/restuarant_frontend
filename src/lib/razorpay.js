let scriptPromise = null

export function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
  return scriptPromise
}

export async function openRazorpayCheckout({
  keyId,
  rzpOrder,
  customer,
  description,
  onSuccess,
  onDismiss,
}) {
  const ok = await loadRazorpay()
  if (!ok) throw new Error('Could not load Razorpay checkout')
  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key: keyId,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      order_id: rzpOrder.id,
      name: 'Masala Story',
      description,
      prefill: customer || {},
      theme: { color: '#ea580c' },
      modal: {
        ondismiss: () => {
          onDismiss?.()
          resolve(null)
        },
      },
      handler: (resp) => {
        onSuccess?.(resp)
        resolve(resp)
      },
    })
    rzp.open()
  })
}
