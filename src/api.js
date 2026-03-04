// API Base URL - works both local and on Vercel
const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ===== BUSINESSES =====
export const businessAPI = {
  getAll: () => request('/businesses'),
  create: (data) => request('/businesses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/businesses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/businesses/${id}`, { method: 'DELETE' }),
}

// ===== TRANSACTIONS =====
export const transactionAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/transactions${q ? '?' + q : ''}`)
  },
  create: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
}

// ===== USERS =====
export const userAPI = {
  getAll: () => request('/users'),
  create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
}

// ===== REPORTS =====
export const reportAPI = {
  getPL: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/reports/pl${q ? '?' + q : ''}`)
  },
}
