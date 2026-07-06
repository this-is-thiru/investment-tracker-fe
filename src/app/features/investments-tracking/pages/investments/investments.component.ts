import { Component, ViewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { UploadTransactionsComponent } from '../../components/upload-transactions/upload-transactions.component';
import { UploadPreviewTableComponent } from '../../components/upload-preview-table/upload-preview-table.component';
import { TempCorporateTabsComponent } from '../../components/temp-corporate-tabs/temp-corporate-tabs.component';
import { PortfolioStocksComponent } from '../../components/portfolio-stocks/portfolio-stocks.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';

@Component({
    selector: 'app-investments',
    standalone: true,
    imports: [UploadTransactionsComponent, UploadPreviewTableComponent, TempCorporateTabsComponent, PortfolioStocksComponent, FooterComponent, LucideIconsModule],
    templateUrl: './investments.component.html',
    styleUrls: ['./investments.component.css'],
    providers: [MessageService]
})
export class InvestmentsComponent {
  @ViewChild(TempCorporateTabsComponent) tempCorporateTabs?: TempCorporateTabsComponent;
  @ViewChild(PortfolioStocksComponent) portfolioStocks?: PortfolioStocksComponent;

  selectedFile: File | null = null;
  selectedQuarter = 'Q1';
  userEmail = localStorage.getItem('userEmail') || '';

  onQuarterSelected(quarter: string): void {
    this.selectedQuarter = quarter;
  }

  onFileSelected(file: File): void {
    this.selectedFile = file;
  }

  onUploadComplete(): void {
    this.selectedFile = null;
    this.tempCorporateTabs?.refresh();
    this.portfolioStocks?.refresh();
  }

  onFileCleared(): void {
    this.selectedFile = null;
  }

  onCorporateActionApplied(): void {
    this.portfolioStocks?.refresh();
  }
}
