import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HomeComponent } from './components/home/home.component';
import { AuthComponent } from './components/auth/auth.component';
import { TestComponent } from './components/test/test.component';
import { WithHeaderLayoutComponent } from './components/common/with-header-layout/with-header-layout.component'
import { WithoutHeaderLayoutComponent } from './components/common/without-header-layout/without-header-layout.component';
import { authGuard } from './components/auth/auth.guard'; // Import the AuthGuard
import { FooterComponent } from './components/common/footer/footer.component';
import { SignInComponent } from './components/auth/sign-in/sign-in.component';
import { SignUpComponent } from './components/auth/sign-up/sign-up.component';
 

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  {
    path: '',
    component: WithHeaderLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
      { path: 'home', component: HomeComponent },
      { path: 'test', component: TestComponent },
    ],
  },

  {
    path: '', 
    component: WithoutHeaderLayoutComponent,
    children: [
      { path: 'auth', component: AuthComponent },
      { path: 'sign-in', component: SignInComponent },
      { path: 'sign-up', component: SignUpComponent }
    ],
  },

  { path: '**', redirectTo: '/home' }, // fallback
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }






