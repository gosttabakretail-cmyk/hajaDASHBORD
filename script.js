console.log('📦 Скрипт запущен. Начинаем загрузку данных...');

// ================= НАСТРОЙКИ =================
// ВСТАВЬТЕ СЮДА ID ТАБЛИЦЫ (между /d/ и /edit в ссылке)
const SPREADSHEET_ID = '1r12aZVguu3xP67JHsC8UNgaqzjc1mI2zuGgAh5sZnKE'; 

// Если нужна не первая вкладка, укажите её GID (цифры после #gid= в адресной строке)
const SHEET_GID = '0'; 
// =============================================

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

async function loadData() {
  console.log('🔗 Формируем ссылку:', CSV_URL);
  
  try {
    const res = await fetch(CSV_URL);
    console.log('📥 Ответ сервера:', res.status, res.ok ? 'OK' : 'ERROR');

    if (!res.ok) {
      throw new Error(`Ошибка доступа к таблице: ${res.status} ${res.statusText}.\n` + 
                      `Проверьте: 1) ID таблицы. 2) Доступ "Все, у кого есть ссылка" -> "Читатель".`);
    }

    const text = await res.text();
    
    // ВАЖНО: проверяем, что получили именно строку
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('Получен некорректный ответ от сервера. Ожидалась строка (CSV), но получено что-то другое.');
    }

    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('В файле только заголовки или он повреждён. Нужны данные хотя бы в одной строке.');
    }

    // Нормализуем заголовки: убираем пробелы, приводим к нижнему регистру
    const headers = lines.split(',').map(h => h.trim().toLowerCase());
    console.log('📋 Обнаружены колонки:', headers);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].trim().split(',');
      if (cols.length === 0 || cols === '') continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ? cols[idx].trim() : '';
      });
      data.push(row);
    }

    console.log(`✅ Успешно загружено строк: \${data.length}`);
    return data;

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    alert('Не удалось загрузить данные!\n\nОткройте консоль (F12) для деталей.\nЧастые причины:\n1. Не вставлен ID таблицы.\n2. В Google Таблице нет доступа "Читатель".\n3. Пустая таблица или неверный формат.');
    return [];
  }
}

function render(data) {
  const tbody = document.querySelector('#inventory-table tbody');
  if (!tbody) {
    console.error('❌ Не найден элемент <tbody> с id="inventory-table". Проверьте index.html');
    return;
  }

  tbody.innerHTML = '';
  
  let totalQty = 0;

  data.forEach(row => {
    const sku = row['sku'] || row['артикул'] || '-';
    const name = row['наименование'] || row['name'] || '-';
    const model = row['модель'] || '-';
    const color = row['цвет'] || '-';
    const size = row['размер'] || '-';
    
    const qtyRaw = row['остаток'] || row['qty'] || '0';
    const qty = parseInt(qtyRaw.replace(',', '.'), 10) || 0;
    
    totalQty += qty;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>\${sku}</strong></td>
      <td>\${name}</td>
      <td>\${model}</td>
      <td>\${color}</td>
      <td>\${size}</td>
      <td class="text-right" style="font-weight:bold; color:#d9534f;">\${qty}</td>
      <td class="text-right">\${row['движение'] || '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  const elTotalSku = document.getElementById('total-sku');
  const elTotalQty = document.getElementById('total-qty');
  const elLowStock = document.getElementById('low-stock-count');

  if (elTotalSku) elTotalSku.textContent = data.length;
  if (elTotalQty) elTotalQty.textContent = totalQty;
  
  const lowStockCount = data.filter(r => {
    const q = parseInt((r['остаток'] || r['qty'] || '0').replace(',', '.'), 10);
    return q > 0 && q < 20;
  }).length;
  
  if (elLowStock) elLowStock.textContent = lowStockCount;

  console.log('📊 Таблица отрисована.');
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🏁 DOM загружен. Вызываем loadData()...');
  const data = await loadData();
  if (data && data.length > 0) {
    render(data);
  } else if (data) {
    console.warn('⚠️ Данные получены, но массив пуст. Таблица не будет отрисована.');
  }
});
