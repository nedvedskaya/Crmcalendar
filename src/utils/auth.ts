// Утилиты для работы с авторизацией

export interface UserData {
  name: string;
  role: 'owner' | 'manager' | 'master';
  loginDate: string;
}

const AUTH_KEY = 'crm_user_auth';

/**
 * Сохранить данные пользователя в localStorage
 */
export const saveUserAuth = (userData: Omit<UserData, 'loginDate'>): void => {
  const authData: UserData = {
    ...userData,
    loginDate: new Date().toISOString()
  };
  
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
  } catch (error) {
    console.error('Error saving user auth:', error);
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
  return getUserAuth() !== null;
};

/**
 * Выйти из системы
 */
export const logout = (): void => {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (error) {
    console.error('Error logging out:', error);
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