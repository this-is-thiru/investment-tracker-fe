import { Routes } from '@angular/router';
import { InvestmentsComponent } from './pages/investments/investments.component';
import { AllTransactionsComponent } from './components/transaction-list/all-transactions.component';

export const INVESTMENTS_TRACKING_ROUTES: Routes = [
  { path: 'investments-tracking', component: InvestmentsComponent }, // ✅ default for /investment-tracking
  { path: 'transactions', component: AllTransactionsComponent }
];
