console.log('📦 Скрипт запущен. Начинаем загрузку данных...');

const SPREADSHEET_ID = '1r12aZVguu3xP67JHsC8UNgaqzjc1mI2zuGgAh5sZnKE'; 
const SHEET_GID = '0'; 

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

async function loadData() {
  console.log('🔗 Формируем ссылку:', CSV_URL);
  
  try {
    const res = await fetch(CSV_URL);
    console.log('📥 Ответ сервера:', res.status, res.ok ? 'OK' : 'ERROR');

    if (!res.ok) {
      throw new Error(`Ошибка HTTP: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    
    // 🔥 ЗАЩИТА 1: Проверяем, не HTML ли нам прислали (страница входа)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error('Получен HTML вместо CSV. Проверьте доступ к таблице: "Все, у кого есть ссылка" -> "Читатель".');
    }

    if (!text || !text.trim()) {
      throw new Error('Получен пустой ответ. Проверьте, есть ли данные в таблице.');
    }

    // 🔥 ЗАЩИТА 2: Гарантированно получаем массив строк
    // split('\n') безопасен, если text - это строка (а мы это проверили выше)
    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('В таблице только заголовки или она полностью пуста. Нужны строки с данными.');
    }

    // Берем первую строку как заголовки
    const headers = lines.split(',').map(h => h.trim().toLowerCase());
    console.log('📋 Обнаружены колонки:', headers);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      // Пропускаем пустые строки
      if (!lines[i].trim()) continue;

      const cols = lines[i].split(',');
      
      // Если колонок меньше, чем заголовков, пропускаем или дополняем пустыми
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ? cols[idx].trim() : '';
      });
      
      // Добавляем строку только если есть хоть какие-то данные (опционально)
      data.push(row);
    }

    if (data.length === 0) {
      console.warn('⚠️ Данные распаршены, но массив строк пуст (возможно, в таблице нет данных после заголовков).');
    } else {
      console.log(`✅ Успешно загружено строк: \${data.length}`);
    }
    
    return data;

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    alert('Не удалось загрузить данные!\n\nПричина: ' + error.message + '\n\nПроверьте консоль (F12).');
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
    // Защита от запятых в числах (1,000 -> 1000)
    const qty = parseInt(qtyRaw.replace(/,/g, '').replace(/\s/g, ''), 10) || 0;
    
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

  // Обновляем KPI карточки (используем ID из вашего HTML)
  const elTotalSku = document.getElementById('kpi-total-sku');
  const elTotalQty = document.getElementById('kpi-total-qty');
  const elLowStock = document.getElementById('kpi-low-stock');

  if (elTotalSku) elTotalSku.textContent = data.length;
  if (elTotalQty) elTotalQty.textContent = totalQty;
  
  const lowStockCount = data.filter(r => {
    const q = parseInt((r['остаток'] || r['qty'] || '0').replace(/,/g, ''), 10);
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
    // Если массив пуст, но ошибок не было - рисуем пустую таблицу или оставляем нули
    console.warn('⚠️ Данные получены, но строк с данными нет. Таблица будет пустой.');
    render(data); // Вызываем render даже с пустым массивом, чтобы обновить нули в KPI
  }
});
