/**
 * Получить строку даты в формате ISO (YYYY-MM-DD)
 * @param offset - смещение в днях от текущей даты (по умолчанию 0)
 * @returns строка даты в формате YYYY-MM-DD
 */
export const getDateStr = (offset = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};

/**
 * Форматирование суммы денег с разделением разрядов пробелами
 * @param amount - сумма для форматирования
 * @returns отформатированная строка (например: "1 000 000")
 */
export const formatMoney = (amount: any): string => {
  if (amount === undefined || amount === null || amount === "" || typeof amount === 'object') {
    return "0";
  }
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

/**
 * Форматирование даты в русский формат
 * @param dateStr - строка даты в ISO формате
 * @returns отформатированная дата (например: "15 января 2025")
 */
export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

/**
 * Форматирование даты в короткий формат
 * @param dateStr - строка даты в ISO формате
 * @returns отформатированная дата (например: "22 янв")
 */
export const formatDateShort = (dateStr: string | undefined): string => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Сегодня
  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня';
  }
  
  // Вчера
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера';
  }
  
  // Формат: "22 янв"
  const day = date.getDate();
  const month = date.toLocaleDateString('ru-RU', { month: 'short' });
  const year = date.getFullYear();
  const currentYear = today.getFullYear();
  
  // Если текущий год - не показываем год
  if (year === currentYear) {
    return `${day} ${month}`;
  }
  
  // Если другой год - показываем
  return `${day} ${month} ${year}`;
};

/**
 * Форматирование времени в формат HH:MM
 * @param timeStr - строка времени
 * @returns отформатированное время
 */
export const formatTime = (timeStr: string | undefined): string => {
  if (!timeStr) return '';
  return timeStr;
};

/**
 * Копирование текста в буфер обмена
 * @param text - текст для копирования
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Ошибка копирования в буфер обмена:', err);
  }
};

/**
 * Генерация уникального ID на основе временной метки
 * @returns уникальный числовой ID
 */
export const generateId = (): number => {
  return Date.now() + Math.random();
};