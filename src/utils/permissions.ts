// Система управления правами доступа (RBAC)

export type Role = 'owner' | 'manager' | 'master';

export type Permission = 
  | 'view_clients'
  | 'create_clients'
  | 'edit_clients'
  | 'delete_clients'
  | 'view_tasks'
  | 'create_tasks'
  | 'edit_tasks'
  | 'delete_tasks'
  | 'view_calendar'
  | 'create_bookings'
  | 'edit_bookings'
  | 'delete_bookings'
  | 'view_finance'
  | 'create_transactions'
  | 'edit_transactions'
  | 'delete_transactions'
  | 'manage_categories'
  | 'manage_users'
  | 'view_analytics';

// Определение прав для каждой роли
const rolePermissions: Record<Role, Permission[]> = {
  // Super Admin (Владелец) - ПОЛНЫЙ доступ ко всему
  owner: [
    'view_clients',
    'create_clients',
    'edit_clients',
    'delete_clients',
    'view_tasks',
    'create_tasks',
    'edit_tasks',
    'delete_tasks',
    'view_calendar',
    'create_bookings',
    'edit_bookings',
    'delete_bookings',
    'view_finance',
    'create_transactions',
    'edit_transactions',
    'delete_transactions',
    'manage_categories',
    'manage_users',
    'view_analytics'
  ],
  
  // Менеджер - доступ к клиентам, задачам, календарю (без финансов)
  manager: [
    'view_clients',
    'create_clients',
    'edit_clients',
    'view_tasks',
    'create_tasks',
    'edit_tasks',
    'view_calendar',
    'create_bookings',
    'edit_bookings'
  ],
  
  // Мастер - только просмотр задач и календаря
  master: [
    'view_clients',
    'view_tasks',
    'view_calendar'
  ]
};

/**
 * Проверить, есть ли у роли определенное право
 */
export const hasPermission = (role: Role, permission: Permission): boolean => {
  return rolePermissions[role]?.includes(permission) || false;
};

/**
 * Проверить, есть ли у роли хотя бы одно из прав
 */
export const hasAnyPermission = (role: Role, permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(role, permission));
};

/**
 * Проверить, есть ли у роли все права
 */
export const hasAllPermissions = (role: Role, permissions: Permission[]): boolean => {
  return permissions.every(permission => hasPermission(role, permission));
};

/**
 * Получить все права роли
 */
export const getRolePermissions = (role: Role): Permission[] => {
  return rolePermissions[role] || [];
};

/**
 * Проверить, является ли роль администратором
 */
export const isAdmin = (role: Role): boolean => {
  return role === 'owner';
};

/**
 * Получить доступные вкладки для роли
 */
export const getAvailableTabs = (role: Role): string[] => {
  const tabs: string[] = [];
  
  if (hasPermission(role, 'view_clients')) {
    tabs.push('clients');
  }
  
  if (hasPermission(role, 'view_tasks')) {
    tabs.push('tasks');
  }
  
  if (hasPermission(role, 'view_calendar')) {
    tabs.push('calendar');
  }
  
  if (hasPermission(role, 'view_finance')) {
    tabs.push('finance');
  }
  
  return tabs;
};

/**
 * Проверить доступ к вкладке
 */
export const canAccessTab = (role: Role, tab: string): boolean => {
  const tabPermissions: Record<string, Permission> = {
    clients: 'view_clients',
    tasks: 'view_tasks',
    calendar: 'view_calendar',
    finance: 'view_finance'
  };
  
  const requiredPermission = tabPermissions[tab];
  return requiredPermission ? hasPermission(role, requiredPermission) : false;
};
