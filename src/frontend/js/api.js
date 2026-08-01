// Points at your LIVE deployed backend — every page uses this file.
const API_BASE = 'https://splitease-api-4q6k.onrender.com/api';

function getToken() {
  return localStorage.getItem('accessToken');
}

function setTokens(accessToken, refreshToken) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

function getCurrentUserId() {
  const token = getToken();
  if (!token) return null;
  // JWT payload is the middle base64 segment — decode it client-side just
  // to read the user id for display purposes (never trust this for security,
  // the backend re-verifies the signature on every request).
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch {
    return null;
  }
}

// Central fetch wrapper: attaches the auth token, handles errors consistently,
// and redirects to login if the session has expired — every page calls this
// instead of using fetch() directly.
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearTokens();
    window.location.href = 'index.html';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Guards pages that require login — call at the top of dashboard.html/group.html.
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
}