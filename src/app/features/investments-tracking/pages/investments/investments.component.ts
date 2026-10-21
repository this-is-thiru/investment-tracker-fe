import { ChangeDetectorRef, Component, ViewChild, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { UploadTransactionsComponent } from '../../components/upload-transactions/upload-transactions.component';
import { TempCorporateTabsComponent } from '../../components/temp-corporate-tabs/temp-corporate-tabs.component';
import { PortfolioStocksComponent } from '../../components/portfolio-stocks/portfolio-stocks.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';

@Component({
    selector: 'app-investments',
    standalone: true,
    imports: [UploadTransactionsComponent, TempCorporateTabsComponent, PortfolioStocksComponent, FooterComponent, LucideIconsModule],
    templateUrl: './investments.component.html',
    styleUrls: ['./investments.component.css'],
    providers: [MessageService]
})
export class InvestmentsComponent {
  @ViewChild(TempCorporateTabsComponent) tempCorporateTabs?: TempCorporateTabsComponent;
  @ViewChild(PortfolioStocksComponent) portfolioStocks?: PortfolioStocksComponent;

  private cdr = inject(ChangeDetectorRef);

  userEmail = localStorage.getItem('userEmail') || '';

  // Returning users already have holdings, so keep the upload panel out of the way
  uploadExpanded = true;
  private initialHoldingsChecked = false;

  onHoldingsLoaded(count: number): void {
    if (this.initialHoldingsChecked) return;
    this.initialHoldingsChecked = true;
    this.uploadExpanded = count === 0;
    this.cdr.markForCheck(); // fired from the child's HTTP callback; the app is zoneless
  }

  onUploadComplete(): void {
    this.tempCorporateTabs?.refresh();
    this.portfolioStocks?.refresh();
  }

  onCorporateActionApplied(): void {
    this.portfolioStocks?.refresh();
  }
}
