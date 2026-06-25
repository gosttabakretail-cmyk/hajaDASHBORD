// =============================================================================
// БЛОК НАСТРОЕК: ИЗМЕНЯТЬ ТОЛЬКО ЗДЕСЬ
// =============================================================================

// 1. ВСТАВЬТЕ СЮДА ID ВАШЕЙ GOOGLE ТАБЛИЦЫ.
// Как найти: откройте таблицу в браузере. ID — это набор букв и цифр между "/d/" и "/edit".
// Пример: https://docs.google.com/spreadsheets/d/[1A2B3C4D5E6F...]/edit...
// Вставьте только то, что в скобках.
const SPREADSHEET_ID = '1r12aZVguu3xP67JHsC8UNgaqzjc1mI2zuGgAh5sZnKE'; 

// 2. ВСТАВЬТЕ СЮДА GID НУЖНОГО ЛИСТА (вкладки).
// Если у вас в таблице одна вкладка или нужна самая первая (левая), оставьте '0'.
// Как найти: откройте нужный лист, посмотрите в конец адресной строки браузера.
// Там будет написано #gid=123456789. Возьмите цифры после знака равно.
const SHEET_GID = '0'; 

// =============================================================================
// ТЕХНИЧЕСКАЯ ЧАСТЬ: ФОРМИРОВАНИЕ ССЫЛКИ И ЗАГРУЗКА ДАННЫХ
// =============================================================================

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

async function loadData() {
  try {
    const res = await fetch(CSV_URL);
    
    if (!res.ok) {
      throw new Error(`Ошибка доступа: ${res.status} ${res.statusText}. Проверьте настройки доступа в Google Таблице.`);
    }

    const text = await res.text();
    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('Файл CSV пуст или содержит только заголовки. Проверьте данные в таблице.');
    }

    // Первая строка - это заголовки. Приводим их к нижнему регистру для удобства сравнения
    const headers = lines.split(',').map(h => h.trim().toLowerCase());
    
    // Проверка: есть ли в таблице нужные колонки
    const requiredCols = ['sku', 'наименование', 'остаток'];
    const missingCols = requiredCols.filter(col => !headers.includes(col));
    
    if (missingCols.length > 0) {
      console.warn(`В таблице отсутствуют следующие колонки (проверьте регистр и пробелы): \${missingCols.join(', ')}`);
    }

    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].trim().split(',');
      
      if (cols.length === 0 || cols === '') continue;
      
      // Создаем объект, сопоставляя колонки по индексу из заголовков
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ? cols[idx].trim() : '';
      });
      
      data.push(row);
    }
    
    return data;
  } catch (error) {
    console.error('Критическая ошибка загрузки данных:', error);
    alert('Не удалось загрузить данные!\n\n1. Проверьте ID таблицы в коде.\n2. Проверьте настройки доступа (Должно быть: "Все, у кого есть ссылка" -> "Читатель").\n3. Откройте консоль браузера (F12) для детальной ошибки.');
  }
}

function render(data) {
  const tbody = document.querySelector('#inventory-table tbody');
  if (!tbody) {
    console.error('Ошибка: не найден элемент <tbody> внутри таблицы с id="inventory-table". Проверьте index.html');
    return;
  }
  
  tbody.innerHTML = '';
  
  let totalQty = 0;

  data.forEach(row => {
    // Получаем данные, используя названия колонок в нижнем регистре (как мы их нормализовали при чтении)
    const sku = row['sku'] || '-';
    const name = row['наименование'] || '-';
    const model = row['модель'] || '-';
    const color = row['цвет'] || '-';
    const size = row['размер'] || '-';
    
    // Парсим остаток. Если в CSV число с запятой (1,5), JS может прочитать как строку.
    // Заменяем запятую на точку для корректного парсинга float, затем берем целое число.
    const qtyRaw = row['остаток'] || '0';
    const qty = parseInt(qtyRaw.replace(',', '.'), 10) || 0;
    
    totalQty += qty;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>\${sku}</strong></td>
      <td>\${name}</td>
      <td>\${model}</td>
      <td>\${color}</td>
      <td>\${size}</td>
      <td class="text-right" style="font-weight:bold;">\${qty}</td>
      <td class="text-right">\${row['движение'] || '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  // Обновление итогов
  const elTotalQty = document.getElementById('total-qty');
  if (elTotalQty) elTotalQty.textContent = totalQty;
  
  // Обновляем общее количество SKU (количество строк)
  const elTotalSku = document.getElementById('total-sku');
  if (elTotalSku) elTotalSku.textContent = data.length;
}

document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadData();
  if (data) {
    render(data);
  }
});
