const CSV_URL = 'https://docs.google.com/spreadsheets/d/1r12aZVguu3xP67JHsC8UNgaqzjc1mI2zuGgAh5sZnKE/export?format=csv&gid=0
'; // ВСТАВИТЬ СЮДА ВАШУ CSV-ССЫЛКУ

async function loadData() {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < headers.length) continue;
    const row = {};
    headers.forEach((h, idx) => row[h] = cols[idx].trim());
    data.push(row);
  }
  return data;
}

function render(data) {
  const tbody = document.querySelector('#inventory-table tbody');
  tbody.innerHTML = '';

  let totalSku = 0;
  let totalQty = 0;
  let lowStock = 0;

  data.forEach(row => {
    totalSku++;
    const qty = parseInt(row.qty || 0, 10);
    totalQty += qty;
    if (qty < 20) lowStock++;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.sku || '-'}</td>
      <td>${row.name || '-'}</td>
      <td>${row.model || '-'}</td>
      <td>${row.color || '-'}</td>
      <td>${row.size || '-'}</td>
      <td>${qty}</td>
      <td>${row.last_movement || '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('kpi-total-sku').textContent = totalSku;
  document.getElementById('kpi-total-qty').textContent = totalQty;
  document.getElementById('kpi-low-stock').textContent = lowStock;
}

function searchTable() {
  const term = document.getElementById('search').value.toLowerCase();
  const rows = document.querySelectorAll('#inventory-table tbody tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(term) ? '' : 'none';
  });
}

document.getElementById('search').addEventListener('input', searchTable);

// Тема
const toggle = document.getElementById('themeToggle');
toggle.addEventListener('click', () => {
  const dark = !document.body.matches('[data-theme="dark"]');
  document.body.setAttribute('data-theme', dark ? 'dark' : '');
  toggle.textContent = dark ?
