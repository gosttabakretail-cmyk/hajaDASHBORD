// =============================================================================
// БЛОК НАСТРОЕК: ИЗМЕНЯТЬ ТОЛЬКО ЗДЕСЬ (остальной код трогать не нужно!)
// =============================================================================

// 1. ВСТАВЬТЕ СЮДА ID ВАШЕЙ GOOGLE ТАБЛИЦЫ.
// Как найти: откройте таблицу в браузере, посмотрите на ссылку.
// ID — это набор букв и цифр между "/d/" и "/edit".
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

// Скрипт сам собирает правильную ссылку для скачивания CSV.
// Не меняйте эту строку!
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

/**
 * Функция загрузки данных из CSV.
 * Она берет ссылку, скачивает файл, превращает его в удобный список объектов.
 */
async function loadData() {
  try {
    const res = await fetch(CSV_URL);
    
    // Проверка: если Google вернул ошибку (например, доступ закрыт), выбрасываем свою ошибку
    if (!res.ok) {
      throw new Error(`Ошибка доступа к таблице: код \${res.status}. Проверьте настройки доступа ("Все, у кого есть ссылка" -> "Читатель").`);
    }

    const text = await res.text();
    const lines = text.trim().split('\n');
    
    if (lines.length === 0) {
      throw new Error('Файл CSV пуст. Проверьте, есть ли данные в таблице.');
    }

    // Первая строка CSV — это заголовки (SKU, Название, Остаток и т.д.)
    const headers = lines.split(',').map(h => h.trim());
    
    const data = [];
    // Начинаем цикл со второй строки (индекс 1), чтобы пропустить заголовки
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].trim().split(',');
      
      // Пропускаем полностью пустые строки
      if (cols.length === 0 || cols === '') continue;
      
      // Защита: если количество колонок в строке не совпадает с заголовками, пропускаем её
      if (cols.length !== headers.length) {
        console.warn(`Строка \${i + 1} имеет неправильное количество колонок. Пропущена.`);
        continue;
      }

      // Превращаем строку CSV в объект вида { sku: "123", name: "Товар", qty: "10" }
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx].trim();
      });
      
      data.push(row);
    }
    
    return data;
  } catch (error) {
    console.error('Критическая ошибка загрузки данных:', error);
    // Показываем пользователю понятное сообщение, если что-то пошло не так
    alert('Не удалось загрузить данные!\n\nПроверьте:\n1. ID таблицы в коде.\n2. Настройки доступа в Google Таблице (должно быть "Все, у кого есть ссылка" -> "Читатель").\n3. Консоль браузера (F12) для детальной ошибки.');
  }
}

/**
 * Функция отрисовки таблицы и подсчета итогов.
 * Она ищет элементы на странице и заполняет их данными.
 */
function render(data) {
  // Ищем таблицу на странице по ID. Убедитесь, что в вашем index.html у таблицы есть id="inventory-table"
  const tbody = document.querySelector('#inventory-table tbody');
  if (!tbody) {
    console.error('Ошибка: не найден элемент <tbody> внутри таблицы с id="inventory-table". Проверьте index.html');
    return;
  }
  
  tbody.innerHTML = ''; // Очищаем таблицу перед новой отрисовкой
  
  let totalSku = 0;
  let totalQty = 0;
  let totalValue = 0;

  data.forEach(row => {
    totalSku++;
    
    // --- УМНЫЙ ПОИСК КОЛОНОК ---
    // Скрипт пытается найти данные, даже если названия столбцов немного отличаются регистром.
    // Например, если в CSV написано "Qty", а в коде мы ищем "qty", он всё равно найдёт.
    
    // Получаем количество (ищем варианты: qty, Qty, quantity, Quantity)
    const qtyRaw = row.qty || row.Qty || row.quantity || row.Quantity || '0';
    const qty = parseInt(qtyRaw.replace(',', '.'), 10) || 0;
    totalQty += qty;

    // Получаем цену (ищем варианты: price, Price, cost, Cost)
    // .replace(',', '.') нужен, чтобы корректно обрабатывать числа вида "100,50"
    const priceRaw = row.price || row.Price || row.cost || row.Cost || '0';
    const price = parseFloat(priceRaw.replace(',', '.')) || 0;
    totalValue += qty * price;

    // Получаем SKU (ищем варианты: sku, Sku, article, Article)
    const sku = row.sku || row.Sku || row.article || row.Article || '-';
    
    // Получаем название (ищем варианты: name, Name, product, Product, title, Title)
    const name = row.name || row.Name || row.product || row.Product || row.title || row.Title || '-';

    // Создаем новую строку таблицы
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>\${sku}</td>
      <td>\${name}</td>
      <td class="text-right">\${qty}</td>
      <td class="text-right">\${price.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
      <td class="text-right">\${(qty * price).toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
    `;
    tbody.appendChild(tr);
  });

  // --- ЗАПОЛНЕНИЕ ИТОГОВ ---
  // Ищем элементы для вывода итогов по ID.
  // Убедитесь, что в index.html у вас есть элементы с такими id: total-sku, total-qty, total-value
  const elTotalSku = document.getElementById('total-sku');
  const elTotalQty = document.getElementById('total-qty');
  const elTotalValue = document.getElementById('total-value');

  if (elTotalSku) elTotalSku.textContent = totalSku;
  if (elTotalQty) elTotalQty.textContent = totalQty;
  if (elTotalValue) elTotalValue.textContent = totalValue.toLocaleString('ru-RU', {minimumFractionDigits: 2});
}

// =============================================================================
// ЗАПУСК: когда страница полностью загрузится, запускаем скрипт
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadData();
  if (data) {
    render(data);
  }
});
