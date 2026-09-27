import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { blockDemoGuard } from '@core/guards/demo.guard';
import { redirectSignedInGuard } from '@core/guards/home.guard';
import { environment } from '@env/environment';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  {
    path: '',
    loadComponent: () => import('./shared/components/header/header.component').then(m => m.HeaderComponent),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/pages/home/home.component').then(m => m.HomeComponent),
        canActivate: [redirectSignedInGuard]
      },
      // Developer-only component showcase; left out of production builds
      ...(environment.production ? [] : [{
        path: 'style-guide',
        loadComponent: () => import('./features/style-guide/style-guide.component').then(m => m.StyleGuideComponent)
      }]),
      {
        path: 'investments-tracking',
        loadComponent: () => import('./features/investments-tracking/pages/investments/investments.component').then(m => m.InvestmentsComponent),
        canActivate: [authGuard, blockDemoGuard]
      },
      {
        path: 'tax-filing',
        loadChildren: () => import('./features/tax-filing/tax-filing.routes').then(m => m.TAX_FILING_ROUTES),
        canActivate: [authGuard]
      },
      {
        path: 'portfolio-analytics',
        loadChildren: () => import('./features/portfolio-analytics/portfolio-analytics.routes').then(m => m.PORTFOLIO_ANALYTICS_ROUTES),
        canActivate: [authGuard]
      },
      // 👇 Secondary outlet for modals
      {
        path: 'sign-in',
        loadComponent: () => import('./features/auth/components/sign-in/sign-in.component').then(m => m.SignInComponent),
        outlet: 'modal'
      },
      {
        path: 'sign-up',
        loadComponent: () => import('./features/auth/components/sign-up/sign-up.component').then(m => m.SignUpComponent),
        outlet: 'modal'
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/components/change-password/change-password.component').then(m => m.ChangePasswordComponent),
        outlet: 'modal'
      },
      {
        path: 'settings',
        loadComponent: () => import('./shared/components/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [authGuard, blockDemoGuard]
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
        canActivate: [authGuard]
      }
    ],
  },

  { path: '**', redirectTo: '/home' },
];
