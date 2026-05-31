import axios from 'axios'
import { useAuthStore } from '../store/useAuthStore'
import { useOrgStore } from '../store/useOrgStore'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Customer-facing endpoints need the org context. Admin endpoints derive
  // the org from the JWT, but sending the header alongside is harmless.
  const orgKey = useOrgStore.getState().orgKey
  if (orgKey) config.headers['x-organization-id'] = orgKey
  return config
})

// Super-admin endpoints + branding endpoint
export const fetchPlatformOverview = () =>
  api.get('/super-admin/overview').then((r) => r.data)
export const fetchOrganizations = () =>
  api.get('/super-admin/organizations').then((r) => r.data)
export const createOrganization = (payload) =>
  api.post('/super-admin/organizations', payload).then((r) => r.data)
export const updateOrganization = (id, patch) =>
  api.patch(`/super-admin/organizations/${id}`, patch).then((r) => r.data)
export const extendSubscription = (id, payload = {}) =>
  api
    .post(`/super-admin/organizations/${id}/subscription/extend`, payload)
    .then((r) => r.data)
export const cancelSubscription = (id, payload = {}) =>
  api
    .post(`/super-admin/organizations/${id}/subscription/cancel`, payload)
    .then((r) => r.data)
export const reactivateSubscription = (id) =>
  api
    .post(`/super-admin/organizations/${id}/subscription/reactivate`)
    .then((r) => r.data)
export const fetchInvoices = (orgId) =>
  api.get(`/super-admin/organizations/${orgId}/invoices`).then((r) => r.data)
export const createInvoice = (orgId, payload) =>
  api
    .post(`/super-admin/organizations/${orgId}/invoices`, payload)
    .then((r) => r.data)
export const updateInvoice = (invoiceId, patch) =>
  api.patch(`/super-admin/invoices/${invoiceId}`, patch).then((r) => r.data)
export const fetchUsage = () => api.get('/usage').then((r) => r.data)
export const fetchPlatformBranding = () =>
  api.get('/platform/branding').then((r) => r.data)
export const updatePlatformBranding = (patch) =>
  api.patch('/platform/branding', patch).then((r) => r.data)
export const fetchOrgBranding = (slugOrId) =>
  api.get(`/organizations/${slugOrId}/branding`).then((r) => r.data)

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    // 402 = subscription gate. Log the tenant user out so they hit the login
    // page (where the gate's clear error message renders) instead of seeing
    // mysterious 402s scattered through the UI.
    if (
      err?.response?.status === 402 &&
      err?.response?.data?.code === 'subscription_blocked'
    ) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(err)
  },
)

export const fetchMenu = () => api.get('/menu').then((r) => r.data)
export const fetchCategories = () => api.get('/categories').then((r) => r.data)
export const fetchTable = (tableNo, sessionId) =>
  api
    .get(`/tables/${tableNo}`, { params: sessionId ? { sessionId } : {} })
    .then((r) => r.data)
export const fetchTableTab = (tableNo) =>
  api.get(`/tables/${tableNo}/tab`).then((r) => r.data)
export const placeOrder = (payload) =>
  api.post('/orders', payload).then((r) => r.data)
export const getOrder = (orderId) =>
  api.get(`/orders/${orderId}`).then((r) => r.data)
export const submitRating = (orderId, payload) =>
  api.post(`/orders/${orderId}/rating`, payload).then((r) => r.data)

export const loginRequest = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data)
export const me = () => api.get('/auth/me').then((r) => r.data)
export const adminOverview = () => api.get('/admin/overview').then((r) => r.data)

export const fetchAdminOrders = (status) =>
  api
    .get('/admin/orders', { params: status ? { status } : {} })
    .then((r) => r.data)
export const setOrderStatus = (id, status) =>
  api.patch(`/admin/orders/${id}/status`, { status }).then((r) => r.data)

export const fetchAdminCategories = () =>
  api.get('/admin/categories').then((r) => r.data)
export const createCategory = (payload) =>
  api.post('/admin/categories', payload).then((r) => r.data)
export const updateCategory = (id, patch) =>
  api.patch(`/admin/categories/${id}`, patch).then((r) => r.data)
export const deleteCategory = (id) =>
  api.delete(`/admin/categories/${id}`).then((r) => r.data)

export const createDish = (dish) =>
  api.post('/admin/menu', dish).then((r) => r.data)
export const updateDish = (id, patch) =>
  api.patch(`/admin/menu/${id}`, patch).then((r) => r.data)
export const deleteDish = (id) =>
  api.delete(`/admin/menu/${id}`).then((r) => r.data)

export const fetchTables = () => api.get('/admin/tables').then((r) => r.data)
export const createTable = (payload) =>
  api.post('/admin/tables', payload).then((r) => r.data)
export const updateTable = (number, patch) =>
  api.patch(`/admin/tables/${number}`, patch).then((r) => r.data)
export const deleteTable = (number) =>
  api.delete(`/admin/tables/${number}`).then((r) => r.data)

export const fetchStaff = () => api.get('/admin/staff').then((r) => r.data)
export const createStaff = (payload) =>
  api.post('/admin/staff', payload).then((r) => r.data)
export const updateStaff = (id, patch) =>
  api.patch(`/admin/staff/${id}`, patch).then((r) => r.data)
export const deleteStaff = (id) =>
  api.delete(`/admin/staff/${id}`).then((r) => r.data)
export const fetchPermissionCatalog = () =>
  api.get('/admin/permissions/catalog').then((r) => r.data)
export const updateStaffPermissions = (id, payload) =>
  api.patch(`/admin/staff/${id}/permissions`, payload).then((r) => r.data)

export const fetchReportsSummary = (params) =>
  api.get('/admin/reports/summary', { params }).then((r) => r.data)

export const fetchBillingTables = () =>
  api.get('/admin/billing/tables').then((r) => r.data)
export const markOrderPaid = (id, payload) =>
  api.post(`/admin/orders/${id}/pay`, payload).then((r) => r.data)
export const splitBill = (id, parts) =>
  api.post(`/admin/orders/${id}/split`, { parts }).then((r) => r.data)

export const fetchExpenses = (params) =>
  api.get('/admin/expenses', { params }).then((r) => r.data)
export const createExpense = (payload) =>
  api.post('/admin/expenses', payload).then((r) => r.data)
export const updateExpense = (id, payload) =>
  api.patch(`/admin/expenses/${id}`, payload).then((r) => r.data)
export const deleteExpense = (id) =>
  api.delete(`/admin/expenses/${id}`).then((r) => r.data)

export const uploadImage = (file) => {
  const form = new FormData()
  form.append('image', file)
  return api
    .post('/admin/uploads/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

export const paymentStatus = () =>
  api.get('/payments/status').then((r) => r.data)
export const createRazorpayOrder = (orderId) =>
  api.post(`/payments/razorpay/order/${orderId}`).then((r) => r.data)
export const verifyRazorpayPayment = (orderId, payload) =>
  api.post(`/payments/razorpay/verify/${orderId}`, payload).then((r) => r.data)

export const fetchAuditLog = (params) =>
  api.get('/admin/audit', { params }).then((r) => r.data)

export const restockDish = (id, payload) =>
  api.post(`/admin/menu/${id}/restock`, payload).then((r) => r.data)
export const fetchLowStock = () =>
  api.get('/admin/inventory/low').then((r) => r.data)

export const loyaltyLookup = (phone) =>
  api.get('/loyalty/lookup', { params: { phone } }).then((r) => r.data)
export const loyaltyJoin = (payload) =>
  api.post('/loyalty/join', payload).then((r) => r.data)
export const fetchLoyaltyMembers = (params) =>
  api.get('/admin/loyalty', { params }).then((r) => r.data)
export const fetchLoyaltyHistory = (phone) =>
  api.get(`/admin/loyalty/${phone}/history`).then((r) => r.data)
