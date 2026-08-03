import {
  Component,
  Input,
  OnInit,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionsResponse } from '@models/transactions-response.model';
import { TransactionService } from '@services/transaction.service';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { NotificationService } from '@services/notification.service';

export interface PortfolioStockRow {
  stockCode: string;
  stockName: string;
  assetType: string;
  totalBought: number;
  totalSold: number;
  netHeld: number;
  totalInvested: number;
  totalSoldValue: number;
  netInvested: number;
  txnCount: number;
  avgPrice: number;
  totalCharges: number;
  sharePercent: number;
}

@Component({
  selector: 'app-portfolio-stocks',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    LucideIconsModule,
    ExpansionPanelComponent,
    PrimeNgModule,
  ],
  templateUrl: './portfolio-stocks.component.html',
})
export class PortfolioStocksComponent implements OnInit {
  @Input() userEmail = '';

  private transactionService = inject(TransactionService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  holdings: PortfolioStockRow[] = [];
  filteredHoldings: PortfolioStockRow[] = [];
  loading = false;
  expandedRows: { [key: string]: boolean } = {};
  stockTransactions: { [stockCode: string]: TransactionsResponse[] } = {};
  loadingStockTransactions: { [stockCode: string]: boolean } = {};
  transactionTypeFilter: { [stockCode: string]: 'ALL' | 'BUY' | 'SELL' } = {};

  searchQuery = '';
  filterAssetType: string | null = null;
  availableAssetTypes: string[] = [];

  setTransactionFilter(stockCode: string, type: string): void {
    this.transactionTypeFilter[stockCode] = type as 'ALL' | 'BUY' | 'SELL';
    this.cdr.detectChanges();
  }

  getFilteredTransactions(stockCode: string): TransactionsResponse[] {
    const txns = this.stockTransactions[stockCode] || [];
    const filter = this.transactionTypeFilter[stockCode] || 'ALL';
    if (filter === 'ALL') return txns;
    return txns.filter((t) => t.transactionType === filter);
  }

  getTransactionSummary(stockCode: string): any {
    const txns = this.stockTransactions[stockCode] || [];
    let buyQty = 0;
    let sellQty = 0;
    let totalBuyValue = 0;
    let totalSellValue = 0;
    let totalCharges = 0;

    txns.forEach((t) => {
      const charges = (t.brokerCharges || 0) + (t.miscCharges || 0);
      totalCharges += charges;
      if (t.transactionType === 'BUY') {
        buyQty += t.quantity;
        totalBuyValue += t.totalValue;
      } else if (t.transactionType === 'SELL') {
        sellQty += t.quantity;
        totalSellValue += t.totalValue;
      }
    });

    const avgBuyPrice = buyQty > 0 ? totalBuyValue / buyQty : 0;
    const avgSellPrice = sellQty > 0 ? totalSellValue / sellQty : 0;

    return {
      buyQty,
      sellQty,
      totalBuyValue,
      totalSellValue,
      avgBuyPrice,
      avgSellPrice,
      totalCharges,
    };
  }

  ngOnInit(): void {
    this.loadHoldings();
  }

  refresh(): void {
    this.loadHoldings();
  }

  applyFilters(): void {
    const q = (this.searchQuery || '').toLowerCase().trim();
    this.filteredHoldings = this.holdings.filter((h) => {
      if (q) {
        const haystack = `${h.stockName} ${h.stockCode} ${h.assetType}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (this.filterAssetType && h.assetType !== this.filterAssetType) {
        return false;
      }
      return true;
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterAssetType = null;
    this.applyFilters();
  }

  loadHoldings(): void {
    if (!this.userEmail) return;
    this.loading = true;
    this.transactionService.getAllHoldings(this.userEmail).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : res?.data || res?.content || [];
        let totalAllInvested = 0;
        this.holdings = data.map((d: any) => {
          totalAllInvested += d.totalValue || 0;
          const totalBought = d.totalQuantity || 0;
          const netHeld = d.quantity || 0;
          const totalSold = totalBought - netHeld;
          const totalInvested = d.totalValue || 0;
          return {
            stockCode: d.stockCode,
            stockName: d.stockName,
            assetType: d.assetType,
            totalBought,
            totalSold,
            netHeld,
            totalInvested,
            totalSoldValue: 0,
            netInvested: totalInvested,
            txnCount:
              (d.buyTransactionIds?.length || 0) +
              (d.sellTransactionIds?.length || 0) ||
              Object.keys(d.transactionQuantities || {}).length,
            avgPrice: d.price || 0,
            totalCharges: (d.brokerCharges || 0) + (d.miscCharges || 0),
            sharePercent: 0,
          };
        });
        if (totalAllInvested > 0) {
          this.holdings.forEach((h) => {
            h.sharePercent = (h.totalInvested / totalAllInvested) * 100;
          });
        }
        this.holdings.sort((a, b) => b.totalInvested - a.totalInvested);
        
        this.availableAssetTypes = Array.from(
          new Set(this.holdings.map((h) => h.assetType).filter(Boolean))
        ).sort();
        this.applyFilters();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load holdings', err);
        this.loading = false;
        this.notificationService.addNotification(
          'Error',
          'Failed to load portfolio stocks.',
          'error'
        );
        this.cdr.detectChanges();
      },
    });
  }

  onRowExpand(event: any): void {
    const stock = event.data as PortfolioStockRow;
    if (!stock?.stockCode) return;
    if (!this.transactionTypeFilter[stock.stockCode]) {
      this.transactionTypeFilter[stock.stockCode] = 'ALL';
    }
    if (this.stockTransactions[stock.stockCode]) return;

    this.loadingStockTransactions[stock.stockCode] = true;
    this.transactionService
      .getTransactionsByStock(this.userEmail, stock.stockCode)
      .subscribe({
        next: (data) => {
          this.stockTransactions[stock.stockCode] = data;
          this.loadingStockTransactions[stock.stockCode] = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load stock transactions', err);
          this.loadingStockTransactions[stock.stockCode] = false;
          this.stockTransactions[stock.stockCode] = [];
          this.notificationService.addNotification(
            'Error',
            `Failed to load transactions for ${stock.stockCode}.`,
            'error'
          );
          this.cdr.detectChanges();
        },
      });
  }
}
