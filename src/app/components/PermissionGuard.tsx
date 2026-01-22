import { ReactNode } from 'react';
import { hasPermission, type Permission, type Role } from '@/utils/permissions';

interface PermissionGuardProps {
  permission: Permission;
  userRole: Role;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Компонент для условного рендера на основе прав доступа
 */
export const PermissionGuard = ({ permission, userRole, children, fallback = null }: PermissionGuardProps) => {
  if (!hasPermission(userRole, permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};
