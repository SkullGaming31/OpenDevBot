async function getToken() {
  const stored = localStorage.getItem('adminToken');
  return stored || document.getElementById('token').value.trim();
}

function setToken(v) {
  localStorage.setItem('adminToken', v);
  document.getElementById('token').value = v;
}

function formatDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(); } catch (e) { return String(iso); }
}

async function fetchSubs() {
  const token = await getToken();
  const res = await fetch('/api/v1/admin/eventsubs', { headers: { 'x-admin-token': token } });
  if (!res.ok) throw new Error('Failed to fetch subscriptions: ' + res.statusText);
  return res.json();
}

function renderItems(items) {
  const tbody = document.querySelector('#items tbody');
  tbody.innerHTML = '';
  for (const it of items) {
    const tr = document.createElement('tr');
    const idTd = document.createElement('td'); idTd.textContent = it.subscriptionId; tr.appendChild(idTd);
    const userTd = document.createElement('td'); userTd.textContent = it.authUserId; tr.appendChild(userTd);
    const presentTd = document.createElement('td'); presentTd.textContent = it.present ? 'yes' : 'no'; presentTd.className = it.present ? 'status-up' : 'status-down'; tr.appendChild(presentTd);
    const retryTd = document.createElement('td'); retryTd.textContent = it.retryStatus || 'none'; tr.appendChild(retryTd);
    const attemptsTd = document.createElement('td'); attemptsTd.textContent = String(it.attempts || 0); tr.appendChild(attemptsTd);
    const lastTd = document.createElement('td'); lastTd.textContent = it.lastError || ''; tr.appendChild(lastTd);
    const nextTd = document.createElement('td'); nextTd.textContent = formatDate(it.nextRetryAt); tr.appendChild(nextTd);
    tbody.appendChild(tr);
  }
}

async function refresh() {
  try {
    const data = await fetchSubs();
    document.getElementById('summary').textContent = `Total: ${data.total}`;
    renderItems(data.items || []);
  } catch (e) {
    document.getElementById('summary').textContent = 'Error: ' + e.message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('adminToken');
  if (saved) document.getElementById('token').value = saved;
  document.getElementById('saveToken').addEventListener('click', () => setToken(document.getElementById('token').value.trim()));
  document.getElementById('refresh').addEventListener('click', () => refresh());
  refresh();
});