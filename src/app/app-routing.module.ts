import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HomeComponent } from './components/home/home.component';
import { AuthComponent } from './components/auth/auth.component';
import { TestComponent } from './components/test/test.component';
import { WithHeaderLayoutComponent } from './components/common/with-header-layout/with-header-layout.component'
import { WithoutHeaderLayoutComponent } from './components/common/without-header-layout/without-header-layout.component';
import { authGuard } from './components/auth/auth.guard'; // Import the AuthGuard


const routes: Routes = [
  { path: '', redirectTo: '/auth', pathMatch: 'full' },
  {
    path: '',
    component: WithHeaderLayoutComponent,
    children: [
      { path: 'home', component: HomeComponent, canActivate: [authGuard] }, // Protect route with AuthGuard
      { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] }, // Protect route with AuthGuard
      { path: 'test', component: TestComponent }, // No protection needed for test route
    ],
  },
  {
    path: '',
    component: WithoutHeaderLayoutComponent,
    children: [
      { path: 'auth', component: AuthComponent},
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }






