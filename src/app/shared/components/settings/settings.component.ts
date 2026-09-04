import { Component, EventEmitter, Output, inject } from '@angular/core';
import { NotificationService } from '@services/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { AuthService } from '@services/auth.service';
import { StorageService } from '@services/storage.service';
import { PrimeNgModule } from '@core/prime-ng.module';
import { TransactionService } from '@services/transaction.service';
import { LivePriceService } from '@services/live-price.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideIconsModule, PrimeNgModule],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.css'
})
export class SettingsComponent {
  @Output() navigate = new EventEmitter<string>();

  activeTab: 'profile' | 'portfolio' | 'alerts' | 'security' | 'billing' | 'data' = 'profile';

  private transactionService = inject(TransactionService);
  private livePriceService = inject(LivePriceService);

  tabs = [
    { id: 'profile' as const, label: 'Profile & Region', icon: 'user' },
    { id: 'portfolio' as const, label: 'Portfolio & Calculations', icon: 'trending-up' },
    { id: 'alerts' as const, label: 'Alerts & Digests', icon: 'bell' },
    { id: 'security' as const, label: 'Security & Access', icon: 'shield' },
    { id: 'billing' as const, label: 'Plans & Billing', icon: 'credit-card' },
    { id: 'data' as const, label: 'Data & Advanced', icon: 'database' },
  ];

  // Google Sheets Live Price Config
  googleSheetCsvUrl: string = '';

  // 1. General Profile State
  fullName: string = 'John Doe';
  email: string = 'john.doe@example.com';
  phone: string = '+1 (555) 123-4567';

  // Regional Preferences
  currency: string = 'USD';
  currencyOptions = [
    { label: 'USD ($) - US Dollar', value: 'USD' },
    { label: 'EUR (€) - Euro', value: 'EUR' },
    { label: 'GBP (£) - British Pound', value: 'GBP' },
    { label: 'INR (₹) - Indian Rupee', value: 'INR' },
    { label: 'JPY (¥) - Japanese Yen', value: 'JPY' },
    { label: 'CAD ($) - Canadian Dollar', value: 'CAD' },
    { label: 'AUD ($) - Australian Dollar', value: 'AUD' }
  ];

  language: string = 'en';
  languageOptions = [
    { label: 'English (US)', value: 'en' },
    { label: 'Español (ES)', value: 'es' },
    { label: 'Français (FR)', value: 'fr' },
    { label: 'Deutsch (DE)', value: 'de' }
  ];

  dateFormat: string = 'MM/DD/YYYY';
  dateFormatOptions = [
    { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
    { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
    { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }
  ];

  // 2. Portfolio Preferences State
  returnCalculation: 'TWR' | 'IRR' | 'SIMPLE' = 'TWR';

  defaultBenchmark: 'SP500' | 'NIFTY50' | 'NASDAQ' | 'BTC' | 'NONE' = 'SP500';
  benchmarkOptions = [
    { label: 'S&P 500 ETF (US Stock Market Index)', value: 'SP500' },
    { label: 'Nifty 50 Index (Indian Stock Market Index)', value: 'NIFTY50' },
    { label: 'Nasdaq 100 Index (Tech Stock Index)', value: 'NASDAQ' },
    { label: 'Bitcoin (BTC / USD Spot)', value: 'BTC' },
    { label: 'No Comparison Benchmark', value: 'NONE' }
  ];

  fiscalYearStart: 'jan' | 'apr' | 'jul' = 'jan';
  fiscalYearStartOptions = [
    { label: 'January 1st (Standard Calendar Year)', value: 'jan' },
    { label: 'April 1st (Indian / UK Tax Calendar)', value: 'apr' },
    { label: 'July 1st (Australian Tax Calendar)', value: 'jul' }
  ];

  priceAlertThresholdOptions = [
    { label: '± 1% Daily Portfolio Swing', value: 1 },
    { label: '± 2% Daily Portfolio Swing', value: 2 },
    { label: '± 5% Daily Portfolio Swing', value: 5 },
    { label: '± 10% Daily Portfolio Swing', value: 10 }
  ];

  rebalanceThresholdOptions = [
    { label: '± 2% Allocation Deviation', value: 2 },
    { label: '± 5% Allocation Deviation (Standard)', value: 5 },
    { label: '± 10% Allocation Deviation', value: 10 }
  ];

  activeAssetClasses = {
    stocks: true,
    crypto: true,
    mutualFunds: true,
    etfs: true,
    cash: true,
    realEstate: false,
    gold: true
  };

  // 3. Notification & Alert Settings State
  emailNotifications: boolean = true;
  pushNotifications: boolean = true;
  weeklyReports: boolean = false;
  portfolioAlerts: boolean = true;
  dividendAlerts: boolean = true;
  rebalanceAlerts: boolean = true;
  priceAlertThreshold: number = 5; // default 5%
  rebalanceThreshold: number = 5; // default 5%

  // 4. Security & Access State
  twoFactorEnabled: boolean = false;
  show2FAModal: boolean = false;
  twoFactorSecret: string = 'KVKVE43VOB2HE33K'; // Mock secret key
  twoFactorCode: string = '';
  changePasswordEmail: string = '';
  oldPassword: string = '';
  newPasswordValue: string = '';
  isLoadingPasswordChange: boolean = false;

  activeSessions = [
    { id: 'sess-1', device: 'Chrome on Windows', location: 'San Francisco, US', isCurrent: true, date: 'Active now' },
    { id: 'sess-2', device: 'Safari on iPhone 15', location: 'New York, US', isCurrent: false, date: '2 hours ago' },
    { id: 'sess-3', device: 'Firefox on macOS', location: 'London, UK', isCurrent: false, date: '3 days ago' }
  ];

  // 5. Data Management Modals State
  showResetModal: boolean = false;
  showDeleteModal: boolean = false;
  isResetting: boolean = false;
  isDeleting: boolean = false;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private storageService: StorageService
  ) {
    // Sync email from auth service
    const userEmail = this.authService.getUserEmail();
    if (userEmail) {
      this.email = userEmail;
      this.changePasswordEmail = userEmail;
    }

    // Load persisted settings from LocalStorage
    this.loadSettings();
  }

  private loadSettings(): void {
    this.googleSheetCsvUrl = this.livePriceService.getGoogleSheetUrl();

    const storedFullName = this.storageService.getItem('settings_fullName');
    if (storedFullName) this.fullName = storedFullName;

    const storedPhone = this.storageService.getItem('settings_phone');
    if (storedPhone) this.phone = storedPhone;

    const storedCurrency = this.storageService.getItem('settings_currency');
    if (storedCurrency) this.currency = storedCurrency;

    const storedLanguage = this.storageService.getItem('settings_language');
    if (storedLanguage) this.language = storedLanguage;

    const storedDateFormat = this.storageService.getItem('settings_dateFormat');
    if (storedDateFormat) this.dateFormat = storedDateFormat;

    const storedReturnCalculation = this.storageService.getItem('settings_returnCalculation');
    if (storedReturnCalculation) this.returnCalculation = storedReturnCalculation as any;

    const storedBenchmark = this.storageService.getItem('settings_defaultBenchmark');
    if (storedBenchmark) this.defaultBenchmark = storedBenchmark as any;

    const storedFiscalYear = this.storageService.getItem('settings_fiscalYearStart');
    if (storedFiscalYear) this.fiscalYearStart = storedFiscalYear as any;

    const storedAssets = this.storageService.getItem('settings_activeAssetClasses');
    if (storedAssets) {
      try {
        this.activeAssetClasses = { ...this.activeAssetClasses, ...JSON.parse(storedAssets) };
      } catch (e) {
        console.error('Failed to parse active asset classes', e);
      }
    }

    const storedEmailNotif = this.storageService.getItem('settings_emailNotifications');
    if (storedEmailNotif) this.emailNotifications = storedEmailNotif === 'true';

    const storedPushNotif = this.storageService.getItem('settings_pushNotifications');
    if (storedPushNotif) this.pushNotifications = storedPushNotif === 'true';

    const storedWeeklyReports = this.storageService.getItem('settings_weeklyReports');
    if (storedWeeklyReports) this.weeklyReports = storedWeeklyReports === 'true';

    const storedPortfolioAlerts = this.storageService.getItem('settings_portfolioAlerts');
    if (storedPortfolioAlerts) this.portfolioAlerts = storedPortfolioAlerts === 'true';

    const storedDividendAlerts = this.storageService.getItem('settings_dividendAlerts');
    if (storedDividendAlerts) this.dividendAlerts = storedDividendAlerts === 'true';

    const storedRebalanceAlerts = this.storageService.getItem('settings_rebalanceAlerts');
    if (storedRebalanceAlerts) this.rebalanceAlerts = storedRebalanceAlerts === 'true';

    const storedPriceThreshold = this.storageService.getItem('settings_priceAlertThreshold');
    if (storedPriceThreshold) this.priceAlertThreshold = parseInt(storedPriceThreshold, 10);

    const storedRebalanceThreshold = this.storageService.getItem('settings_rebalanceThreshold');
    if (storedRebalanceThreshold) this.rebalanceThreshold = parseInt(storedRebalanceThreshold, 10);

    const stored2FA = this.storageService.getItem('settings_twoFactorEnabled');
    if (stored2FA) this.twoFactorEnabled = stored2FA === 'true';
  }

  setActiveTab(tab: 'profile' | 'portfolio' | 'alerts' | 'security' | 'billing' | 'data'): void {
    this.activeTab = tab;
  }

  handleSaveProfile(): void {
    this.storageService.setItem('settings_fullName', this.fullName);
    this.storageService.setItem('settings_phone', this.phone);
    this.storageService.setItem('settings_currency', this.currency);
    this.storageService.setItem('settings_language', this.language);
    this.storageService.setItem('settings_dateFormat', this.dateFormat);
    this.notificationService.addNotification('Profile & Regional preferences saved', '', 'success');
  }

  handleSavePortfolio(): void {
    this.storageService.setItem('settings_returnCalculation', this.returnCalculation);
    this.storageService.setItem('settings_defaultBenchmark', this.defaultBenchmark);
    this.storageService.setItem('settings_fiscalYearStart', this.fiscalYearStart);
    this.storageService.setItem('settings_activeAssetClasses', JSON.stringify(this.activeAssetClasses));
    this.notificationService.addNotification('Portfolio & Performance calculation preferences saved', '', 'success');
  }

  handleSaveAlerts(): void {
    this.storageService.setItem('settings_emailNotifications', String(this.emailNotifications));
    this.storageService.setItem('settings_pushNotifications', String(this.pushNotifications));
    this.storageService.setItem('settings_weeklyReports', String(this.weeklyReports));
    this.storageService.setItem('settings_portfolioAlerts', String(this.portfolioAlerts));
    this.storageService.setItem('settings_dividendAlerts', String(this.dividendAlerts));
    this.storageService.setItem('settings_rebalanceAlerts', String(this.rebalanceAlerts));
    this.storageService.setItem('settings_priceAlertThreshold', String(this.priceAlertThreshold));
    this.storageService.setItem('settings_rebalanceThreshold', String(this.rebalanceThreshold));
    this.notificationService.addNotification('Alert & Notification preferences updated', '', 'success');
  }

  // 2FA Setup flows
  handleToggle2FA(): void {
    if (this.twoFactorEnabled) {
      // Disabling 2FA
      this.twoFactorEnabled = false;
      this.storageService.setItem('settings_twoFactorEnabled', 'false');
      this.notificationService.addNotification('Two-factor authentication disabled', '', 'warning');
    } else {
      // Opening QR Setup Modal
      this.twoFactorCode = '';
      this.show2FAModal = true;
    }
  }

  handleVerify2FA(): void {
    if (!this.twoFactorCode || this.twoFactorCode.trim().length < 6) {
      this.notificationService.addNotification('Please enter a valid 6-digit confirmation code', '', 'error');
      return;
    }

    // Simulated successful confirmation
    this.twoFactorEnabled = true;
    this.storageService.setItem('settings_twoFactorEnabled', 'true');
    this.show2FAModal = false;
    this.notificationService.addNotification('Two-factor authentication enabled successfully', '', 'success');
  }

  handleChangePassword(): void {
    if (this.isLoadingPasswordChange) return;

    if (!this.changePasswordEmail || !this.oldPassword || !this.newPasswordValue) {
      this.notificationService.addNotification('All fields are required', '', 'error');
      return;
    }

    this.isLoadingPasswordChange = true;

    this.authService.changePassword(this.changePasswordEmail, this.oldPassword, this.newPasswordValue).subscribe({
      next: () => {
        this.isLoadingPasswordChange = false;
        this.notificationService.addNotification('Password changed successfully', '', 'success');
        this.oldPassword = '';
        this.newPasswordValue = '';
      },
      error: (err) => {
        this.isLoadingPasswordChange = false;
        const errorMsg = err?.error?.message || (typeof err?.error === 'string' ? err.error : null) || 'Password change failed. Please check your details.';
        this.notificationService.addNotification(errorMsg, '', 'error');
      }
    });
  }

  handleRevokeSession(sessionId: string): void {
    this.activeSessions = this.activeSessions.filter(s => s.id !== sessionId);
    this.notificationService.addNotification('Session successfully terminated', '', 'success');
  }

  handleExportData(format: 'csv' | 'json'): void {
    let dataContent = '';
    let fileName = `portfolio_export_${new Date().toISOString().slice(0, 10)}`;
    let mimeType = '';

    if (format === 'csv') {
      dataContent = 'Asset Name,Symbol,Asset Class,Quantity,Purchase Price,Current Price,Value\n' +
        'Apple Inc.,AAPL,Stocks,10,150.00,185.20,1852.00\n' +
        'Bitcoin,BTC,Crypto,0.25,45000.00,67000.00,16750.00\n' +
        'Vanguard S&P 500 ETF,VOO,ETFs,5,380.00,420.50,2102.50\n';
      fileName += '.csv';
      mimeType = 'text/csv;charset=utf-8;';
    } else {
      const mockJSON = [
        { assetName: 'Apple Inc.', symbol: 'AAPL', class: 'Stocks', qty: 10, buyPrice: 150.00, currentPrice: 185.20 },
        { assetName: 'Bitcoin', symbol: 'BTC', class: 'Crypto', qty: 0.25, buyPrice: 45000.00, currentPrice: 67000.00 },
        { assetName: 'Vanguard S&P 500 ETF', symbol: 'VOO', class: 'ETFs', qty: 5, buyPrice: 380.00, currentPrice: 420.50 }
      ];
      dataContent = JSON.stringify(mockJSON, null, 2);
      fileName += '.json';
      mimeType = 'application/json;charset=utf-8;';
    }

    try {
      const blob = new Blob([dataContent], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.notificationService.addNotification(`Portfolio data successfully exported as ${format.toUpperCase()}`, '', 'success');
    } catch (e) {
      console.error('Failed to export file', e);
      this.notificationService.addNotification('Failed to generate export file', '', 'error');
    }
  }

  handleResetPortfolio(): void {
    if (this.isResetting) return;
    this.isResetting = true;
    this.transactionService.clearAllRecords(this.email).subscribe({
      next: () => {
        this.isResetting = false;
        this.showResetModal = false;
        this.notificationService.addNotification('All portfolio transactions and statistics have been reset successfully.', '', 'success');
      },
      error: (err) => {
        console.error('Failed to reset portfolio:', err);
        this.isResetting = false;
        this.notificationService.addNotification('Failed to clear portfolio records. Please try again.', '', 'error');
      }
    });
  }

  handleDeleteAccountConfirm(): void {
    this.isDeleting = true;
    setTimeout(() => {
      this.isDeleting = false;
      this.showDeleteModal = false;
      this.notificationService.addNotification('Your account has been deleted successfully. Logging you out.', '', 'success');
      setTimeout(() => {
        this.authService.logOut();
      }, 1000);
    }, 1500);
  }

  handleSaveLivePriceUrl(): void {
    this.livePriceService.saveGoogleSheetUrl(this.googleSheetCsvUrl);
    this.notificationService.addNotification('Google Sheets Live Price URL saved successfully', '', 'success');
  }

  onNavigate(page: string): void {
    this.navigate.emit(page);
  }
}



