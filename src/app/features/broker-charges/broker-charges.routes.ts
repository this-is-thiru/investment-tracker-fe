import { Routes } from '@angular/router';
import { BrokerChargesComponent } from './pages/broker-charges/broker-charges.component';

export const BROKER_CHARGES_ROUTES: Routes = [
  { path: '', component: BrokerChargesComponent },
  { path: ':tab', component: BrokerChargesComponent }
];
