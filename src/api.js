const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const authAPI = {
  login: (data) => request('/login', { method: 'POST', body: JSON.stringify(data) }),
};

export const businessAPI = {
  getAll: () => request('/businesses'),
  create: (data) => request('/businesses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/businesses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/businesses/${id}`, { method: 'DELETE' }),
};

export const transactionAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions${q ? '?' + q : ''}`);
  },
  create: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
};

export const imageAPI = {
  // ดึงรูปภาพทั้งหมดของ transaction
  getAll: (txnId) => request(`/transactions/${txnId}/images`),
  // เพิ่มรูปใหม่
  upload: (txnId, data) => request(`/transactions/${txnId}/images`, { method: 'POST', body: JSON.stringify(data) }),
  // ลบรูป
  delete: (imgId) => request(`/images/${imgId}`, { method: 'DELETE' }),
};

export const auditAPI = {
  // ดึง audit log ของ transaction
  getByTransaction: (txnId) => request(`/transactions/${txnId}/audit`),
};

export const userAPI = {
  getAll: () => request('/users'),
  create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

export const reportAPI = {
  getPL: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/pl${q ? '?' + q : ''}`);
  },
};
