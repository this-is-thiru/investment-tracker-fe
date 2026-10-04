import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { UserRole, AuthModalRoute } from '@core/enums';

/**
 * Functional guard factory that restricts route access based on required roles.
 *
 * Example:
 * canActivate: [authGuard, roleGuard([UserRole.SUPER_USER, UserRole.ADMIN])]
 */
export function roleGuard(allowedRoles: (UserRole | string)[]): CanActivateFn {
  return (_route, _state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const notificationService = inject(NotificationService);

    if (!authService.isUserAuthenticated()) {
      return router.createUrlTree(
        [{ outlets: { primary: ['home'], modal: [AuthModalRoute.SIGN_IN] } }],
        { queryParams: { returnUrl: router.url } }
      );
    }

    const hasPermission = allowedRoles.some((role) => authService.hasRole(role));
    if (hasPermission) {
      return true;
    }

    notificationService.addNotification(
      'Access Restricted',
      'You do not have the required permissions to access this page.',
      'error',
      null
    );

    return router.createUrlTree(['/portfolio-analytics']);
  };
}

/**
 * Convenience guard restricting route access to users with SUPER_USER role.
 */
export const superUserGuard: CanActivateFn = (route, state) => {
  return roleGuard([UserRole.SUPER_USER])(route, state);
};

/**
 * Convenience guard restricting route access to users with ADMIN or SUPER_USER role.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  return roleGuard([UserRole.SUPER_USER, UserRole.ADMIN])(route, state);
};
