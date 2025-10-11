import { Routes } from '@angular/router';
import { SignInComponent } from './features/auth/pages/sign-in/sign-in.component';
import { SignUpComponent } from './features/auth/pages/sign-up/sign-up.component';
import { InvestmentsComponent } from './features/investments-tracking/pages/investments/investments.component';
import { AuthGuard } from './core/auth.guard';
import { WithHeaderLayoutComponent } from './shared/components/with-header-layout/with-header-layout.component';
import { HomeComponent } from './features/home/pages/home/home.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  {
    path: '',
    component: WithHeaderLayoutComponent,
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'investments-tracking', component: InvestmentsComponent, canActivate: [AuthGuard] },
      // 👇 Secondary outlet for modals
      { path: 'sign-in', component: SignInComponent, outlet: 'modal' },
      { path: 'sign-up', component: SignUpComponent, outlet: 'modal' },
    ],
  },

  { path: '**', redirectTo: '/home' },
];
