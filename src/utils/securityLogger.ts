/**
 * Security Logger - логирование событий безопасности
 * Отслеживает все важные действия пользователей
 * 
 * Функции:
 * - Логирование входов/выходов
 * - Логирование CRUD операций
 * - Детекция подозрительной активности
 * - Экспорт логов для аудита
 */

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'PASSWORD_CHANGED'
  | 'DATA_CREATED'
  | 'DATA_UPDATED'
  | 'DATA_DELETED'
  | 'DATA_EXPORTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_ACCESS'
  | 'DATA_INTEGRITY_VIOLATION'
  | 'SUSPICIOUS_ACTIVITY'
  | 'ENCRYPTION_ERROR'
  | 'DECRYPTION_ERROR';

export type SecurityLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface SecurityLogEntry {
  id: string;
  timestamp: number;
  type: SecurityEventType;
  level: SecurityLevel;
  user: string | null;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

const STORAGE_KEY = '_security_logs';
const MAX_LOGS = 1000; // Максимум записей в памяти

/**
 * Определение уровня серьезности события
 */
const getEventLevel = (type: SecurityEventType): SecurityLevel => {
  const criticalEvents: SecurityEventType[] = [
    'DATA_INTEGRITY_VIOLATION',
    'ENCRYPTION_ERROR',
    'DECRYPTION_ERROR'
  ];
  
  const errorEvents: SecurityEventType[] = [
    'LOGIN_FAILED',
    'UNAUTHORIZED_ACCESS',
    'SUSPICIOUS_ACTIVITY'
  ];
  
  const warningEvents: SecurityEventType[] = [
    'RATE_LIMIT_EXCEEDED',
    'SESSION_EXPIRED'
  ];
  
  if (criticalEvents.includes(type)) return 'CRITICAL';
  if (errorEvents.includes(type)) return 'ERROR';
  if (warningEvents.includes(type)) return 'WARNING';
  return 'INFO';
};

/**
 * Получить сохраненные логи
 */
const getLogs = (): SecurityLogEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const logs = JSON.parse(data);
    
    // Очищаем старые логи (старше 30 дней)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return logs.filter((log: SecurityLogEntry) => log.timestamp > thirtyDaysAgo);
  } catch (error) {
    console.error('[SecurityLogger] Error loading logs:', error);
    return [];
  }
};

/**
 * Сохранить логи
 */
const saveLogs = (logs: SecurityLogEntry[]): void => {
  try {
    // Ограничиваем количество логов
    const limited = logs.slice(-MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('[SecurityLogger] Error saving logs:', error);
    
    // Если переполнение - удаляем старые логи
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      const reduced = logs.slice(-Math.floor(MAX_LOGS / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
      } catch (retryError) {
        console.error('[SecurityLogger] Failed to save even after cleanup:', retryError);
      }
    }
  }
};

/**
 * Генерация уникального ID для лога
 */
const generateLogId = (): string => {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Получить текущего пользователя (для логов)
 */
const getCurrentUser = (): string | null => {
  try {
    const authData = localStorage.getItem('crm_user_auth');
    if (!authData) return null;
    
    const parsed = JSON.parse(authData);
    return parsed.name || 'unknown';
  } catch {
    return null;
  }
};

/**
 * Записать событие безопасности
 * @param type - тип события
 * @param action - описание действия
 * @param details - дополнительные детали
 */
export const logSecurityEvent = (
  type: SecurityEventType,
  action: string,
  details: Record<string, any> = {}
): void => {
  const logs = getLogs();
  
  const entry: SecurityLogEntry = {
    id: generateLogId(),
    timestamp: Date.now(),
    type,
    level: getEventLevel(type),
    user: getCurrentUser(),
    action,
    details,
    userAgent: navigator.userAgent
  };
  
  logs.push(entry);
  saveLogs(logs);
  
  // Выводим в консоль для дебага (в продакшене можно отключить)
  const emoji = entry.level === 'CRITICAL' ? '🔴' : 
                entry.level === 'ERROR' ? '🟠' : 
                entry.level === 'WARNING' ? '🟡' : '🔵';
  
  console.log(
    `${emoji} [SecurityLog] ${type}`,
    `| User: ${entry.user || 'anonymous'}`,
    `| ${action}`,
    details
  );
  
  // Алерт для критических событий
  if (entry.level === 'CRITICAL') {
    console.error('🚨 CRITICAL SECURITY EVENT:', entry);
  }
};

/**
 * Получить все логи
 * @param filter - фильтр по типу, уровню или пользователю
 */
export const getSecurityLogs = (filter?: {
  type?: SecurityEventType;
  level?: SecurityLevel;
  user?: string;
  startDate?: number;
  endDate?: number;
}): SecurityLogEntry[] => {
  let logs = getLogs();
  
  if (!filter) {
    return logs;
  }
  
  if (filter.type) {
    logs = logs.filter(log => log.type === filter.type);
  }
  
  if (filter.level) {
    logs = logs.filter(log => log.level === filter.level);
  }
  
  if (filter.user) {
    logs = logs.filter(log => log.user === filter.user);
  }
  
  if (filter.startDate) {
    logs = logs.filter(log => log.timestamp >= filter.startDate!);
  }
  
  if (filter.endDate) {
    logs = logs.filter(log => log.timestamp <= filter.endDate!);
  }
  
  return logs;
};

/**
 * Экспорт логов в JSON
 */
export const exportLogs = (): Blob => {
  const logs = getLogs();
  const json = JSON.stringify(logs, null, 2);
  return new Blob([json], { type: 'application/json' });
};

/**
 * Экспорт логов в CSV
 */
export const exportLogsCSV = (): Blob => {
  const logs = getLogs();
  
  if (logs.length === 0) {
    return new Blob(['No logs available'], { type: 'text/csv' });
  }
  
  const headers = ['ID', 'Timestamp', 'Date', 'Type', 'Level', 'User', 'Action', 'Details'];
  const rows = logs.map(log => [
    log.id,
    log.timestamp,
    new Date(log.timestamp).toLocaleString('ru-RU'),
    log.type,
    log.level,
    log.user || 'anonymous',
    log.action,
    JSON.stringify(log.details)
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return new Blob([csv], { type: 'text/csv' });
};

/**
 * Скачать логи как файл
 * @param format - формат файла ('json' или 'csv')
 */
export const downloadLogs = (format: 'json' | 'csv' = 'json'): void => {
  const blob = format === 'csv' ? exportLogsCSV() : exportLogs();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `security_logs_${new Date().toISOString().split('T')[0]}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Очистить старые логи
 * @param daysToKeep - количество дней для хранения
 */
export const cleanupOldLogs = (daysToKeep: number = 30): number => {
  const logs = getLogs();
  const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  const filtered = logs.filter(log => log.timestamp > cutoff);
  const removed = logs.length - filtered.length;
  
  saveLogs(filtered);
  
  if (removed > 0) {
    logSecurityEvent(
      'DATA_DELETED',
      `Cleaned up ${removed} old security logs`,
      { daysToKeep, removed }
    );
  }
  
  return removed;
};

/**
 * Получить статистику по логам
 */
export const getLogStats = () => {
  const logs = getLogs();
  
  const stats = {
    total: logs.length,
    byLevel: {} as Record<SecurityLevel, number>,
    byType: {} as Record<SecurityEventType, number>,
    byUser: {} as Record<string, number>,
    last24Hours: 0,
    last7Days: 0
  };
  
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  logs.forEach(log => {
    // По уровню
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    
    // По типу
    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
    
    // По пользователю
    const user = log.user || 'anonymous';
    stats.byUser[user] = (stats.byUser[user] || 0) + 1;
    
    // Временные периоды
    if (log.timestamp > oneDayAgo) stats.last24Hours++;
    if (log.timestamp > sevenDaysAgo) stats.last7Days++;
  });
  
  return stats;
};

/**
 * Детекция подозрительной активности
 */
export const detectSuspiciousActivity = (): string[] => {
  const logs = getLogs();
  const alerts: string[] = [];
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  const recentLogs = logs.filter(log => log.timestamp > oneHourAgo);
  
  // Множественные неудачные попытки входа
  const failedLogins = recentLogs.filter(log => log.type === 'LOGIN_FAILED');
  if (failedLogins.length >= 3) {
    alerts.push(`⚠️ ${failedLogins.length} неудачных попыток входа за последний час`);
  }
  
  // Массовое удаление данных
  const deletions = recentLogs.filter(log => log.type === 'DATA_DELETED');
  if (deletions.length >= 10) {
    alerts.push(`⚠️ Массовое удаление: ${deletions.length} операций за последний час`);
  }
  
  // Множественные rate limit превышения
  const rateLimitExceeded = recentLogs.filter(log => log.type === 'RATE_LIMIT_EXCEEDED');
  if (rateLimitExceeded.length >= 5) {
    alerts.push(`⚠️ Множественные превышения rate limit: ${rateLimitExceeded.length}`);
  }
  
  // Критические ошибки
  const criticalEvents = recentLogs.filter(log => log.level === 'CRITICAL');
  if (criticalEvents.length > 0) {
    alerts.push(`🔴 ${criticalEvents.length} критических событий безопасности`);
  }
  
  return alerts;
};

/**
 * Очистить все логи (используйте осторожно!)
 */
export const clearAllLogs = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  console.warn('[SecurityLogger] All security logs have been cleared');
};

/**
 * Вспомогательные функции для быстрого логирования
 */
export const logLogin = (username: string, success: boolean) => {
  logSecurityEvent(
    success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
    success ? `User ${username} logged in` : `Failed login attempt for ${username}`,
    { username, success }
  );
};

export const logLogout = (username: string) => {
  logSecurityEvent(
    'LOGOUT',
    `User ${username} logged out`,
    { username }
  );
};

export const logDataChange = (
  operation: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string | number,
  details?: Record<string, any>
) => {
  const typeMap = {
    create: 'DATA_CREATED',
    update: 'DATA_UPDATED',
    delete: 'DATA_DELETED'
  } as const;
  
  logSecurityEvent(
    typeMap[operation],
    `${operation.toUpperCase()} ${entityType} (ID: ${entityId})`,
    { operation, entityType, entityId, ...details }
  );
};

/**
 * Экспорт модуля
 */
export const SecurityLogger = {
  logSecurityEvent,
  getSecurityLogs,
  exportLogs,
  exportLogsCSV,
  downloadLogs,
  cleanupOldLogs,
  getLogStats,
  detectSuspiciousActivity,
  clearAllLogs,
  logLogin,
  logLogout,
  logDataChange
};

export default SecurityLogger;
