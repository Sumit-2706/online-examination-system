// js/utils.js  —  Shared utilities: API client, auth, helpers

const API_BASE = '/api';

// ── Token Management ─────────────────────────────────────────
const Auth = {
  setSession(token, user) {
    localStorage.setItem('oes_token', token);
    localStorage.setItem('oes_user',  JSON.stringify(user));
  },
  getToken() { return localStorage.getItem('oes_token'); },
  getUser()  {
    try { return JSON.parse(localStorage.getItem('oes_user')); }
    catch { return null; }
  },
  clear() {
    localStorage.removeItem('oes_token');
    localStorage.removeItem('oes_user');
  },
  isLoggedIn() { return !!this.getToken(); },
  requireAuth(expectedRole) {
    const user = this.getUser();
    if (!this.isLoggedIn() || !user) {
      window.location.href = '/index.html';
      return null;
    }
    if (expectedRole && user.role !== expectedRole) {
      alert('Access denied. Redirecting...');
      window.location.href = user.role === 'teacher' ? '/teacher-dashboard.html' : '/student-dashboard.html';
      return null;
    }
    return user;
  }
};

// ── HTTP Client ──────────────────────────────────────────────
const API = {
  async request(method, endpoint, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const token = Auth.getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body)  opts.body = JSON.stringify(body);

    const res  = await fetch(`${API_BASE}${endpoint}`, opts);
    const data = await res.json();

    if (res.status === 401) {
      Auth.clear();
      window.location.href = '/index.html';
    }
    return { ok: res.ok, status: res.status, data };
  },
  get(endpoint)         { return this.request('GET',    endpoint); },
  post(endpoint, body)  { return this.request('POST',   endpoint, body); },
  put(endpoint, body)   { return this.request('PUT',    endpoint, body); },
  patch(endpoint, body) { return this.request('PATCH',  endpoint, body); },
  delete(endpoint)      { return this.request('DELETE', endpoint); },
};

// ── UI Helpers ───────────────────────────────────────────────
function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}"><span>${escapeHtml(message)}</span></div>`;
  el.classList.remove('hidden');
}
function clearAlert(containerId) {
  const el = document.getElementById(containerId);
  if (el) { el.innerHTML = ''; el.classList.add('hidden'); }
}
function setLoading(btnEl, loading) {
  if (!btnEl) return;
  btnEl.disabled = loading;
  btnEl.dataset.original = btnEl.dataset.original || btnEl.textContent;
  btnEl.innerHTML = loading
    ? `<span class="loading-spinner"></span> Please wait...`
    : btnEl.dataset.original;
}
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';
}
function gradeColor(grade) {
  const map = { 'A+': 'success', 'A': 'success', 'B': 'info', 'C': 'warning', 'D': 'warning', 'F': 'danger' };
  return map[grade] || 'gray';
}

// ── Modal helpers ────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// ── Populate user info in sidebar ────────────────────────────
function renderSidebarUser() {
  const user = Auth.getUser();
  if (!user) return;
  const nameEl   = document.getElementById('sidebar-name');
  const roleEl   = document.getElementById('sidebar-role');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl)   nameEl.textContent   = user.name;
  if (roleEl)   roleEl.textContent   = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  if (avatarEl) avatarEl.textContent = getInitials(user.name);
}
function logout() {
  Auth.clear();
  window.location.href = '/index.html';
}
