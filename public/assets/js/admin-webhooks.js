async function getToken() {
  const stored = localStorage.getItem('adminToken');
  return stored || document.getElementById('token').value.trim();
}

function setToken(v) {
  localStorage.setItem('adminToken', v);
  document.getElementById('token').value = v;
}

async function fetchItems() {
  const token = await getToken();
  const status = document.getElementById('status').value;
  const res = await fetch(`/api/v1/admin/webhooks?status=${encodeURIComponent(status)}&page=1&limit=200`, {
    headers: { 'x-admin-token': token }
  });
  if (!res.ok) throw new Error('Failed to fetch items: ' + res.statusText);
  return res.json();
}

function renderItems(items) {
  const tbody = document.querySelector('#items tbody');
  tbody.innerHTML = '';
  for (const it of items) {
    const tr = document.createElement('tr');
    const idTd = document.createElement('td'); idTd.textContent = it._id; tr.appendChild(idTd);
    const webhookTd = document.createElement('td'); webhookTd.textContent = it.webhook || it.url || it.webhookUrl || ''; tr.appendChild(webhookTd);
    const payloadTd = document.createElement('td'); payloadTd.textContent = JSON.stringify(it.payload || {}).slice(0, 120); tr.appendChild(payloadTd);
    const statusTd = document.createElement('td'); statusTd.textContent = it.status; tr.appendChild(statusTd);
    const attemptsTd = document.createElement('td'); attemptsTd.textContent = String(it.attempts || 0); tr.appendChild(attemptsTd);
    const actionsTd = document.createElement('td');
    const requeueBtn = document.createElement('button'); requeueBtn.textContent = 'Requeue';
    requeueBtn.onclick = async () => { await requeue([it._id]); await refresh(); };
    const delBtn = document.createElement('button'); delBtn.textContent = 'Delete';
    delBtn.onclick = async () => { if (confirm('Delete this item?')) { await remove([it._id]); await refresh(); } };
    actionsTd.appendChild(requeueBtn);
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  }
}

async function requeue(ids) {
  const token = await getToken();
  const res = await fetch('/api/v1/admin/webhooks/requeue', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token }, body: JSON.stringify({ ids })
  });
  if (!res.ok) throw new Error('Requeue failed');
  return res.json();
}

async function remove(ids) {
  const token = await getToken();
  const res = await fetch('/api/v1/admin/webhooks', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-token': token }, body: JSON.stringify({ ids })
  });
  if (!res.ok) throw new Error('Delete failed');
  return res.json();
}

async function refresh() {
  try {
    const data = await fetchItems();
    document.getElementById('summary').textContent = `Total: ${data.total} — page ${data.page} limit ${data.limit}`;
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
  document.getElementById('status').addEventListener('change', () => refresh());
  refresh();
});
