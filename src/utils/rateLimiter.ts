/**
 * Rate Limiter - защита от brute force атак
 * Ограничивает количество попыток определенных действий
 * 
 * Функции:
 * - Ограничение попыток входа (5 попыток / 5 минут)
 * - Прогрессивная блокировка (увеличение времени)
 * - Автоматический сброс после успеха
 * - Persistence в localStorage
 */

interface RateLimitEntry {
  attempts: number;           // Количество попыток
  firstAttempt: number;       // Время первой попытки
  lastAttempt: number;        // Время последней попытки
  blockedUntil: number | null; // Время разблокировки
  blockCount: number;         // Количество блокировок (для прогрессии)
}

interface RateLimitConfig {
  maxAttempts: number;        // Максимум попыток
  windowMs: number;           // Временное окно (мс)
  blockDurationMs: number;    // Длительность блокировки (мс)
  progressiveBlocking: boolean; // Увеличивать время блокировки?
}

// Конфигурация по умолчанию
const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,             // 5 попыток
  windowMs: 5 * 60 * 1000,    // 5 минут
  blockDurationMs: 15 * 60 * 1000, // 15 минут блокировки
  progressiveBlocking: true
};

// Предустановленные конфигурации
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'login': {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,      // 5 минут
    blockDurationMs: 15 * 60 * 1000, // 15 минут
    progressiveBlocking: true
  },
  'password_reset': {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,     // 1 час
    blockDurationMs: 60 * 60 * 1000, // 1 час
    progressiveBlocking: true
  },
  'api_call': {
    maxAttempts: 100,
    windowMs: 60 * 1000,          // 1 минута
    blockDurationMs: 5 * 60 * 1000, // 5 минут
    progressiveBlocking: false
  }
};

const STORAGE_KEY = '_rate_limiter_data';

/**
 * Получить данные rate limiter из localStorage
 */
const getRateLimitData = (): Record<string, RateLimitEntry> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return {};
    
    const parsed = JSON.parse(data);
    
    // Очищаем старые записи (старше 24 часов)
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    Object.keys(parsed).forEach(key => {
      if (parsed[key].lastAttempt < oneDayAgo) {
        delete parsed[key];
      }
    });
    
    return parsed;
  } catch (error) {
    console.error('[RateLimiter] Error loading data:', error);
    return {};
  }
};

/**
 * Сохранить данные rate limiter в localStorage
 */
const saveRateLimitData = (data: Record<string, RateLimitEntry>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[RateLimiter] Error saving data:', error);
  }
};

/**
 * Получить конфигурацию для действия
 */
const getConfig = (action: string): RateLimitConfig => {
  return RATE_LIMIT_CONFIGS[action] || DEFAULT_CONFIG;
};

/**
 * Вычислить длительность блокировки с учетом прогрессии
 */
const calculateBlockDuration = (
  config: RateLimitConfig, 
  blockCount: number
): number => {
  if (!config.progressiveBlocking) {
    return config.blockDurationMs;
  }
  
  // Прогрессивное увеличение: x2 за каждую блокировку
  // 1-я блокировка: 15 минут
  // 2-я блокировка: 30 минут
  // 3-я блокировка: 60 минут
  // и т.д. (максимум 24 часа)
  const multiplier = Math.pow(2, blockCount);
  const duration = config.blockDurationMs * multiplier;
  const maxDuration = 24 * 60 * 60 * 1000; // 24 часа
  
  return Math.min(duration, maxDuration);
};

/**
 * Проверить, заблокировано ли действие
 * @param action - название действия (например, 'login')
 * @returns true если разрешено, false если заблокировано
 */
export const checkRateLimit = (action: string): boolean => {
  const data = getRateLimitData();
  const entry = data[action];
  const now = Date.now();
  
  // Если нет записи - разрешаем
  if (!entry) {
    return true;
  }
  
  // Проверяем, не заблокировано ли
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return false;
  }
  
  // Если блокировка истекла - очищаем и разрешаем
  if (entry.blockedUntil && entry.blockedUntil <= now) {
    resetAttempts(action);
    return true;
  }
  
  const config = getConfig(action);
  const windowStart = now - config.windowMs;
  
  // Если первая попытка была давно - сбрасываем счетчик
  if (entry.firstAttempt < windowStart) {
    resetAttempts(action);
    return true;
  }
  
  // Проверяем превышен ли лимит
  if (entry.attempts >= config.maxAttempts) {
    // Блокируем
    const blockDuration = calculateBlockDuration(config, entry.blockCount);
    entry.blockedUntil = now + blockDuration;
    entry.blockCount += 1;
    saveRateLimitData(data);
    
    console.warn(
      `[RateLimiter] Action "${action}" blocked until ${new Date(entry.blockedUntil).toLocaleString()}`
    );
    
    return false;
  }
  
  return true;
};

/**
 * Записать попытку действия
 * @param action - название действия
 */
export const recordAttempt = (action: string): void => {
  const data = getRateLimitData();
  const now = Date.now();
  
  if (!data[action]) {
    data[action] = {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
      blockedUntil: null,
      blockCount: 0
    };
  } else {
    const config = getConfig(action);
    const windowStart = now - config.windowMs;
    
    // Если первая попытка была в пределах окна - увеличиваем счетчик
    if (data[action].firstAttempt >= windowStart) {
      data[action].attempts += 1;
      data[action].lastAttempt = now;
    } else {
      // Иначе начинаем новое окно
      data[action] = {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        blockedUntil: null,
        blockCount: data[action].blockCount // Сохраняем историю блокировок
      };
    }
  }
  
  saveRateLimitData(data);
};

/**
 * Сбросить счетчик попыток (после успешного действия)
 * @param action - название действия
 */
export const resetAttempts = (action: string): void => {
  const data = getRateLimitData();
  
  if (data[action]) {
    delete data[action];
    saveRateLimitData(data);
  }
};

/**
 * Получить время до разблокировки
 * @param action - название действия
 * @returns дата разблокировки или null
 */
export const getBlockedUntil = (action: string): Date | null => {
  const data = getRateLimitData();
  const entry = data[action];
  
  if (!entry || !entry.blockedUntil) {
    return null;
  }
  
  const now = Date.now();
  if (entry.blockedUntil <= now) {
    return null;
  }
  
  return new Date(entry.blockedUntil);
};

/**
 * Получить оставшееся время блокировки в миллисекундах
 * @param action - название действия
 * @returns количество миллисекунд до разблокировки или 0
 */
export const getRemainingBlockTime = (action: string): number => {
  const blockedUntil = getBlockedUntil(action);
  
  if (!blockedUntil) {
    return 0;
  }
  
  const remaining = blockedUntil.getTime() - Date.now();
  return Math.max(0, remaining);
};

/**
 * Форматирование времени блокировки для отображения
 * @param action - название действия
 * @returns строка вида "15 минут" или null
 */
export const getBlockedTimeFormatted = (action: string): string | null => {
  const remainingMs = getRemainingBlockTime(action);
  
  if (remainingMs === 0) {
    return null;
  }
  
  const seconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
  }
  
  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'}`;
  }
  
  return `${seconds} ${seconds === 1 ? 'секунду' : seconds < 5 ? 'секунды' : 'секунд'}`;
};

/**
 * Получить количество оставшихся попыток
 * @param action - название действия
 * @returns количество попыток
 */
export const getRemainingAttempts = (action: string): number => {
  const data = getRateLimitData();
  const entry = data[action];
  const config = getConfig(action);
  
  if (!entry) {
    return config.maxAttempts;
  }
  
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Если первая попытка была давно - все попытки доступны
  if (entry.firstAttempt < windowStart) {
    return config.maxAttempts;
  }
  
  return Math.max(0, config.maxAttempts - entry.attempts);
};

/**
 * Очистить все данные rate limiter (для тестирования/дебага)
 */
export const clearAllRateLimits = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  console.warn('[RateLimiter] All rate limits have been cleared');
};

/**
 * Получить статистику по действию
 * @param action - название действия
 */
export const getRateLimitStats = (action: string) => {
  const data = getRateLimitData();
  const entry = data[action];
  const config = getConfig(action);
  
  if (!entry) {
    return {
      attempts: 0,
      remainingAttempts: config.maxAttempts,
      isBlocked: false,
      blockedUntil: null,
      blockCount: 0
    };
  }
  
  const blockedUntil = getBlockedUntil(action);
  
  return {
    attempts: entry.attempts,
    remainingAttempts: getRemainingAttempts(action),
    isBlocked: blockedUntil !== null,
    blockedUntil,
    blockCount: entry.blockCount,
    firstAttempt: new Date(entry.firstAttempt),
    lastAttempt: new Date(entry.lastAttempt)
  };
};

/**
 * Экспорт модуля
 */
export const RateLimiter = {
  checkRateLimit,
  recordAttempt,
  resetAttempts,
  getBlockedUntil,
  getRemainingBlockTime,
  getBlockedTimeFormatted,
  getRemainingAttempts,
  clearAllRateLimits,
  getRateLimitStats
};

export default RateLimiter;
