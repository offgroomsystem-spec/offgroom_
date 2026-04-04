import { useAuth } from '@/contexts/AuthContext';
import { hasPermission as checkPermission, hasRouteAccess as checkRouteAccess } from '@/types/permissions';

export const usePermissions = () => {
  const { tipoLogin, isAdministrador, isTaxiDog, isRecepcionista } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (isAdministrador) return true;
    return checkPermission(tipoLogin, permission);
  };

  const hasRouteAccess = (route: string): boolean => {
    if (isAdministrador) return true;
    return checkRouteAccess(tipoLogin, route);
  };

  return {
    hasPermission,
    hasRouteAccess,
    tipoLogin,
    isAdministrador,
    isTaxiDog,
    isRecepcionista,
  };
};
