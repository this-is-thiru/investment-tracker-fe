import { Routes } from '@angular/router';
import { InvestmentsComponent } from './pages/investments/investments.component';
import { AllTransactionsComponent } from './components/transaction-list/all-transactions.component';
import { TransactionsTableComponent } from './components/transactions-table/transactions-table.component';

export const INVESTMENTS_TRACKING_ROUTES: Routes = [
  { path: 'investments-tracking', component: InvestmentsComponent }, // ✅ default for /investment-tracking
  { path: 'transactions', component: AllTransactionsComponent },
  {path: 'transaction-table', component: TransactionsTableComponent}
];
