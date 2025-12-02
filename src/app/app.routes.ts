import { Routes } from '@angular/router';
import { SignInComponent } from './features/auth/components/sign-in/sign-in.component';
import { SignUpComponent } from './features/auth/components/sign-up/sign-up.component';
import { InvestmentsComponent } from './features/investments-tracking/pages/investments/investments.component';
import { AuthGuard } from './core/auth.guard';
import { HeaderComponent } from './shared/components/header/header.component';
import { HomeComponent } from './features/home/pages/home/home.component';
import { ChangePasswordComponent } from './features/auth/components/change-password/change-password.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  {
    path: '',
    component: HeaderComponent,
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'investments-tracking', component: InvestmentsComponent, canActivate: [AuthGuard] },
      // 👇 Secondary outlet for modals
      { path: 'sign-in', component: SignInComponent, outlet: 'modal' },
      { path: 'sign-up', component: SignUpComponent, outlet: 'modal' },
      { path: 'forgot-password', component: ChangePasswordComponent, outlet: 'modal'}
    ],
  },

  { path: '**', redirectTo: '/home' },
];
