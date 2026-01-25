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

/**
 * Форматирование даты для input[type="date"]
 * @param date - дата в любом формате
 * @returns строка в формате YYYY-MM-DD
 */
export const formatDateForInput = (date: Date | string): string => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Форматирование даты с учетом локали
 * @param date - дата в любом формате
 * @param locale - локаль (по умолчанию 'ru-RU')
 * @returns отформатированная дата (например: "15.01.2025")
 */
export const formatDateLocale = (date: Date | string, locale = 'ru-RU'): string => {
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Форматирование даты и времени
 * @param date - дата в любом формате
 * @param locale - локаль (по умолчанию 'ru-RU')
 * @returns отформатированная дата и время (например: "15.01.2025, 14:30")
 */
export const formatDateTime = (date: Date | string, locale = 'ru-RU'): string => {
  return new Date(date).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Проверка, является ли дата сегодняшней
 * @param date - дата для проверки
 * @returns true если дата сегодня
 */
export const isToday = (date: Date | string): boolean => {
  const today = new Date();
  const checkDate = new Date(date);
  return today.toDateString() === checkDate.toDateString();
};

/**
 * Проверка, просрочена ли дата
 * @param date - дата для проверки
 * @returns true если дата в прошлом (но не сегодня)
 */
export const isOverdue = (date: Date | string): boolean => {
  return new Date(date) < new Date() && !isToday(date);
};

/**
 * Получить начало дня (00:00:00.000)
 * @param date - дата (по умолчанию текущая)
 * @returns дата с временем 00:00:00.000
 */
export const getStartOfDay = (date: Date | string = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Получить конец дня (23:59:59.999)
 * @param date - дата (по умолчанию текущая)
 * @returns дата с временем 23:59:59.999
 */
export const getEndOfDay = (date: Date | string = new Date()): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Проверка, находится ли дата в заданном диапазоне
 * @param date - дата для проверки
 * @param startDate - начало диапазона
 * @param endDate - конец диапазона
 * @returns true если дата в диапазоне
 */
export const isDateInRange = (
  date: Date | string, 
  startDate: Date | string, 
  endDate: Date | string
): boolean => {
  const checkDate = new Date(date).getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return checkDate >= start && checkDate <= end;
};
