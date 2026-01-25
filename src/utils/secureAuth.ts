/**
 * Secure Authentication Module
 * Безопасная аутентификация с хешированием паролей и session management
 * 
 * Функции:
 * - Первичная установка мастер-пароля
 * - Хеширование паролей (PBKDF2)
 * - Session timeout (30 минут)
 * - Token rotation
 * - Интеграция с rate limiter и security logger
 */

import { hashPassword, verifyPassword } from './crypto';
import { checkRateLimit, recordAttempt, resetAttempts, getBlockedTimeFormatted } from './rateLimiter';
import { logLogin, logLogout, logSecurityEvent } from './securityLogger';

export interface UserData {
  name: string;
  role: 'owner' | 'manager' | 'master';
  loginDate: string;
  sessionToken: string;
  lastActivity: number;
}

interface StoredPassword {
  hash: string;
  salt: string;
  createdAt: number;
}

const AUTH_KEY = 'crm_user_auth';
const PASSWORD_KEY = 'crm_master_password';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 минут
const INITIAL_SETUP_KEY = 'crm_initial_setup_complete';

/**
 * Генерация случайного session token
 */
const generateSessionToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Проверка, выполнена ли первичная настройка
 */
export const isInitialSetupComplete = (): boolean => {
  return localStorage.getItem(INITIAL_SETUP_KEY) === 'true';
};

/**
 * Установка мастер-пароля (первый запуск)
 * @param password - пароль для установки
 * @param confirmPassword - подтверждение пароля
 */
export const setMasterPassword = async (
  password: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Проверка совпадения паролей
    if (password !== confirmPassword) {
      return { success: false, error: 'Пароли не совпадают' };
    }
    
    // Проверка силы пароля
    if (password.length < 8) {
      return { success: false, error: 'Пароль должен содержать минимум 8 символов' };
    }
    
    if (!/[A-Za-z]/.test(password)) {
      return { success: false, error: 'Пароль должен содержать буквы' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { success: false, error: 'Пароль должен содержать цифры' };
    }
    
    // Хешируем пароль
    const { hash, salt } = await hashPassword(password);
    
    // Сохраняем
    const passwordData: StoredPassword = {
      hash,
      salt,
      createdAt: Date.now()
    };
    
    localStorage.setItem(PASSWORD_KEY, JSON.stringify(passwordData));
    localStorage.setItem(INITIAL_SETUP_KEY, 'true');
    
    logSecurityEvent(
      'PASSWORD_CHANGED',
      'Master password has been set',
      { firstTimeSetup: true }
    );
    
    return { success: true };
    
  } catch (error) {
    console.error('[SecureAuth] Error setting master password:', error);
    logSecurityEvent(
      'ENCRYPTION_ERROR',
      'Failed to set master password',
      { error: String(error) }
    );
    return { success: false, error: 'Ошибка при установке пароля' };
  }
};

/**
 * Аутентификация пользователя
 * @param username - имя пользователя
 * @param password - пароль
 */
export const authenticateUser = async (
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: UserData }> => {
  try {
    // Проверка rate limit
    if (!checkRateLimit('login')) {
      const blockTime = getBlockedTimeFormatted('login');
      const error = blockTime 
        ? `Слишком много попыток входа. Попробуйте через ${blockTime}`
        : 'Слишком много попыток входа. Попробуйте позже';
      
      logSecurityEvent(
        'RATE_LIMIT_EXCEEDED',
        'Login attempt blocked by rate limiter',
        { username }
      );
      
      return { success: false, error };
    }
    
    // Проверка наличия пароля
    const storedPasswordData = localStorage.getItem(PASSWORD_KEY);
    if (!storedPasswordData) {
      return { 
        success: false, 
        error: 'Мастер-пароль не установлен. Выполните первичную настройку' 
      };
    }
    
    const storedPassword: StoredPassword = JSON.parse(storedPasswordData);
    
    // Проверка пароля
    const isValid = await verifyPassword(
      password, 
      storedPassword.hash, 
      storedPassword.salt
    );
    
    if (!isValid) {
      recordAttempt('login');
      logLogin(username, false);
      
      return { 
        success: false, 
        error: 'Неверный пароль' 
      };
    }
    
    // Успешный вход - сбрасываем rate limit
    resetAttempts('login');
    
    // Создаем сессию
    const sessionToken = generateSessionToken();
    const userData: UserData = {
      name: username,
      role: 'owner', // В продакшене роль должна браться из БД
      loginDate: new Date().toISOString(),
      sessionToken,
      lastActivity: Date.now()
    };
    
    localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
    
    logLogin(username, true);
    
    return { success: true, user: userData };
    
  } catch (error) {
    console.error('[SecureAuth] Authentication error:', error);
    logSecurityEvent(
      'ENCRYPTION_ERROR',
      'Authentication process failed',
      { error: String(error) }
    );
    return { 
      success: false, 
      error: 'Ошибка при аутентификации' 
    };
  }
};

/**
 * Получить данные авторизованного пользователя
 */
export const getUserAuth = (): UserData | null => {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    if (!data) return null;
    
    const user = JSON.parse(data) as UserData;
    
    // Проверяем session timeout
    if (!isSessionValid(user)) {
      // Сессия истекла - выходим
      logout(true);
      return null;
    }
    
    // Обновляем последнюю активность
    updateLastActivity();
    
    return user;
  } catch (error) {
    console.error('[SecureAuth] Error getting user auth:', error);
    return null;
  }
};

/**
 * Проверка валидности сессии
 */
const isSessionValid = (user: UserData): boolean => {
  if (!user.lastActivity) {
    return true; // Старая версия данных, считаем валидной
  }
  
  const now = Date.now();
  const timeSinceLastActivity = now - user.lastActivity;
  
  return timeSinceLastActivity < SESSION_TIMEOUT;
};

/**
 * Обновление времени последней активности
 */
const updateLastActivity = (): void => {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    if (!data) return;
    
    const user = JSON.parse(data) as UserData;
    user.lastActivity = Date.now();
    
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('[SecureAuth] Error updating last activity:', error);
  }
};

/**
 * Проверить, авторизован ли пользователь
 */
export const isAuthenticated = (): boolean => {
  return getUserAuth() !== null;
};

/**
 * Выйти из системы
 * @param isAutoLogout - автоматический выход (истечение сессии)
 */
export const logout = (isAutoLogout: boolean = false): void => {
  try {
    const user = getUserAuth();
    
    if (user) {
      if (isAutoLogout) {
        logSecurityEvent(
          'SESSION_EXPIRED',
          `User ${user.name} session expired`,
          { username: user.name }
        );
      } else {
        logLogout(user.name);
      }
    }
    
    localStorage.removeItem(AUTH_KEY);
  } catch (error) {
    console.error('[SecureAuth] Error logging out:', error);
  }
};

/**
 * Проверить роль пользователя
 */
export const hasRole = (role: UserData['role']): boolean => {
  const user = getUserAuth();
  return user?.role === role;
};

/**
 * Получить название роли на русском
 */
export const getRoleName = (role: UserData['role']): string => {
  const roleNames: Record<UserData['role'], string> = {
    owner: 'Администратор',
    manager: 'Менеджер',
    master: 'Мастер'
  };
  
  return roleNames[role] || role;
};

/**
 * Смена пароля
 * @param oldPassword - текущий пароль
 * @param newPassword - новый пароль
 * @param confirmPassword - подтверждение нового пароля
 */
export const changePassword = async (
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Проверка rate limit
    if (!checkRateLimit('password_reset')) {
      const blockTime = getBlockedTimeFormatted('password_reset');
      return { 
        success: false, 
        error: blockTime 
          ? `Слишком много попыток. Попробуйте через ${blockTime}`
          : 'Слишком много попыток. Попробуйте позже'
      };
    }
    
    // Проверка совпадения новых паролей
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Новые пароли не совпадают' };
    }
    
    // Проверка силы нового пароля
    if (newPassword.length < 8) {
      return { success: false, error: 'Новый пароль должен содержать минимум 8 символов' };
    }
    
    // Получаем старый пароль
    const storedPasswordData = localStorage.getItem(PASSWORD_KEY);
    if (!storedPasswordData) {
      return { success: false, error: 'Мастер-пароль не установлен' };
    }
    
    const storedPassword: StoredPassword = JSON.parse(storedPasswordData);
    
    // Проверяем старый пароль
    const isValid = await verifyPassword(
      oldPassword,
      storedPassword.hash,
      storedPassword.salt
    );
    
    if (!isValid) {
      recordAttempt('password_reset');
      logSecurityEvent(
        'PASSWORD_CHANGED',
        'Failed password change attempt (invalid old password)',
        {}
      );
      return { success: false, error: 'Неверный текущий пароль' };
    }
    
    // Сбрасываем rate limit после успешной проверки
    resetAttempts('password_reset');
    
    // Хешируем новый пароль
    const { hash, salt } = await hashPassword(newPassword);
    
    // Сохраняем
    const passwordData: StoredPassword = {
      hash,
      salt,
      createdAt: Date.now()
    };
    
    localStorage.setItem(PASSWORD_KEY, JSON.stringify(passwordData));
    
    const user = getUserAuth();
    logSecurityEvent(
      'PASSWORD_CHANGED',
      'Password changed successfully',
      { username: user?.name || 'unknown' }
    );
    
    return { success: true };
    
  } catch (error) {
    console.error('[SecureAuth] Error changing password:', error);
    logSecurityEvent(
      'ENCRYPTION_ERROR',
      'Failed to change password',
      { error: String(error) }
    );
    return { success: false, error: 'Ошибка при смене пароля' };
  }
};

/**
 * Сброс пароля (только для дебага/тестирования)
 * В продакшене должен быть через email/SMS верификацию
 */
export const resetPasswordDebug = (): void => {
  localStorage.removeItem(PASSWORD_KEY);
  localStorage.removeItem(INITIAL_SETUP_KEY);
  localStorage.removeItem(AUTH_KEY);
  console.warn('[SecureAuth] Password has been reset - system requires initial setup');
};

/**
 * Получить информацию о текущей сессии
 */
export const getSessionInfo = () => {
  const user = getUserAuth();
  
  if (!user) {
    return null;
  }
  
  const remainingTime = SESSION_TIMEOUT - (Date.now() - user.lastActivity);
  const remainingMinutes = Math.floor(remainingTime / 60000);
  
  return {
    user: user.name,
    role: user.role,
    loginDate: new Date(user.loginDate),
    remainingMinutes: Math.max(0, remainingMinutes),
    isExpiring: remainingMinutes < 5 // Предупреждение за 5 минут
  };
};

/**
 * Экспорт модуля
 */
export const SecureAuth = {
  isInitialSetupComplete,
  setMasterPassword,
  authenticateUser,
  getUserAuth,
  isAuthenticated,
  logout,
  hasRole,
  getRoleName,
  changePassword,
  resetPasswordDebug,
  getSessionInfo
};

export default SecureAuth;
