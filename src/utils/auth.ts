// Утилиты для работы с авторизацией

export interface UserData {
  id?: number;
  name: string;
  email?: string;
  role: 'owner' | 'manager' | 'master';
  isOwner?: boolean;
  loginDate: string;
}

const AUTH_KEY = 'crm_user_auth';
const TOKEN_KEY = 'crm_session_token';

/**
 * Сохранить данные пользователя и токен
 */
export const saveUserAuth = (userData: Omit<UserData, 'loginDate'>, token?: string): void => {
  const authData: UserData = {
    ...userData,
    loginDate: new Date().toISOString()
  };
  
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Error saving user auth:', error);
  }
};

/**
 * Получить токен сессии
 */
export const getSessionToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting session token:', error);
    return null;
  }
};

/**
 * Получить данные авторизованного пользователя
 */
export const getUserAuth = (): UserData | null => {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    if (!data) return null;
    
    return JSON.parse(data) as UserData;
  } catch (error) {
    console.error('Error getting user auth:', error);
    return null;
  }
};

/**
 * Проверить, авторизован ли пользователь
 */
export const isAuthenticated = (): boolean => {
  return getUserAuth() !== null && getSessionToken() !== null;
};

/**
 * Выйти из системы
 */
export const logout = async (): Promise<void> => {
  try {
    const token = getSessionToken();
    if (token) {
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => {});
    }
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error logging out:', error);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
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
