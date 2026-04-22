const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dh_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    const error = new Error(err.detail || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export const api = {
  // Auth
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/api/auth/me'),

  // Scores
  getScores: () => request('/api/scores/'),
  addScore: (data) => request('/api/scores/', { method: 'POST', body: JSON.stringify(data) }),
  updateScore: (id, data) => request(`/api/scores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScore: (id) => request(`/api/scores/${id}`, { method: 'DELETE' }),

  // Subscriptions
  getSubscription: () => request('/api/subscriptions/me'),
  subscribe: (data) => request('/api/subscriptions/subscribe', { method: 'POST', body: JSON.stringify(data) }),
  cancelSubscription: () => request('/api/subscriptions/cancel', { method: 'POST' }),

  // Charities
  getCharities: () => request('/api/charities/'),
  getMyCharity: () => request('/api/charities/me/selection'),
  selectCharity: (data) => request('/api/charities/select', { method: 'POST', body: JSON.stringify(data) }),

  // Draws
  getDraws: () => request('/api/draws/'),
  getLatestDraw: () => request('/api/draws/latest'),
  simulateDraw: (type) => request(`/api/draws/simulate?draw_type=${type}`, { method: 'POST' }),
  publishDraw: (type) => request(`/api/draws/publish?draw_type=${type}`, { method: 'POST' }),

  // Winners
  getMyWinnings: () => request('/api/winners/me'),
  submitProof: (id, data) => request(`/api/winners/${id}/proof`, { method: 'POST', body: JSON.stringify(data) }),

  // Admin
  adminDashboard: () => request('/api/admin/dashboard'),
  adminUsers: () => request('/api/admin/users'),
  adminReports: () => request('/api/admin/reports'),
  adminAllWinners: () => request('/api/winners/admin/all'),
  adminVerifyWinner: (id, data) => request(`/api/winners/admin/${id}/verify`, { method: 'PUT', body: JSON.stringify(data) }),
  adminCreateCharity: (data) => request('/api/charities/admin', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCharity: (id, data) => request(`/api/charities/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteCharity: (id) => request(`/api/charities/admin/${id}`, { method: 'DELETE' }),
  adminUpdateScore: (id, data) => request(`/api/scores/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminAllSubscriptions: () => request('/api/subscriptions/admin/all'),
  adminUpdateSubscription: (userId, status) => request(`/api/subscriptions/admin/${userId}?status=${status}`, { method: 'PUT' }),
};

export function saveToken(token) {
  localStorage.setItem('dh_token', token);
}

export function clearToken() {
  localStorage.removeItem('dh_token');
  localStorage.removeItem('dh_user');
}

export function saveUser(user) {
  localStorage.setItem('dh_user', JSON.stringify(user));
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('dh_user')); } catch { return null; }
}
