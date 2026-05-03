export async function apiRequest(method, path, body) {
  const token = localStorage.getItem('noteflow_token') || '';
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`/api${path}`, opts);
  if (res.status === 401) {
    localStorage.removeItem('noteflow_token');
    localStorage.removeItem('noteflow_auth');
    localStorage.removeItem('noteflow_user');
    window.location.href = '/login';
    throw new Error('未授权');
  }
  if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Request failed' })); throw new Error(e.error || `HTTP ${res.status}`); }
  return res.json();
}
