import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { roleGuard, superUserGuard, adminGuard } from './role.guard';
import { UserRole } from '@core/enums';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';

describe('RoleGuards', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/admin-test' } as RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['isUserAuthenticated', 'hasRole']);
    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);
    mockNotificationService = jasmine.createSpyObj('NotificationService', ['addNotification']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: NotificationService, useValue: mockNotificationService },
      ]
    });
  });

  describe('roleGuard', () => {
    it('should redirect to sign-in modal if user is not authenticated', () => {
      mockAuthService.isUserAuthenticated.and.returnValue(false);
      const guard = roleGuard([UserRole.ADMIN]);

      TestBed.runInInjectionContext(() => {
        guard(dummyRoute, dummyState);
      });

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
        [{ outlets: { primary: ['home'], modal: ['sign-in'] } }],
        { queryParams: { returnUrl: '/admin-test' } }
      );
    });

    it('should allow navigation if user possesses one of the allowed roles', () => {
      mockAuthService.isUserAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.callFake((role) => role === UserRole.ADMIN);
      const guard = roleGuard([UserRole.ADMIN, UserRole.SUPER_USER]);

      let result: any;
      TestBed.runInInjectionContext(() => {
        result = guard(dummyRoute, dummyState);
      });

      expect(result).toBeTrue();
    });

    it('should deny navigation, show notification, and redirect if role is missing', () => {
      mockAuthService.isUserAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.returnValue(false);
      const guard = roleGuard([UserRole.SUPER_USER]);

      TestBed.runInInjectionContext(() => {
        guard(dummyRoute, dummyState);
      });

      expect(mockNotificationService.addNotification).toHaveBeenCalledWith(
        'Access Restricted',
        jasmine.any(String),
        'error',
        null
      );
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/portfolio-analytics']);
    });
  });

  describe('superUserGuard', () => {
    it('should allow access when user has SUPER_USER role', () => {
      mockAuthService.isUserAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.callFake((role) => role === UserRole.SUPER_USER);

      let result: any;
      TestBed.runInInjectionContext(() => {
        result = superUserGuard(dummyRoute, dummyState);
      });

      expect(result).toBeTrue();
    });
  });
});
