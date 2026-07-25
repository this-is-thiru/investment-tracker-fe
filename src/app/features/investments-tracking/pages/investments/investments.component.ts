import { Component, ViewChild } from '@angular/core';
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

  userEmail = localStorage.getItem('userEmail') || '';

  onUploadComplete(): void {
    this.tempCorporateTabs?.refresh();
    this.portfolioStocks?.refresh();
  }

  onCorporateActionApplied(): void {
    this.portfolioStocks?.refresh();
  }
}
