import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { TransactionService } from '@services/transaction.service';
import { LivePriceService } from '@services/live-price.service';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { InputComponent } from '@shared/ui/input/input.component';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    LucideIconsModule,
    ExpansionPanelComponent,
    FooterComponent,
    ButtonComponent,
    InputComponent,
  ],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);
  private transactionService = inject(TransactionService);
  private livePriceService = inject(LivePriceService);
  private confirmDialog = inject(ConfirmDialogService);

  email = this.authService.getUserEmail() ?? '';

  // Change password
  oldPassword = '';
  newPassword = '';
  isChangingPassword = false;

  // Google Sheets live prices (used by Tax Filing)
  googleSheetCsvUrl = this.livePriceService.getGoogleSheetUrl();

  // Reset portfolio
  isResetting = false;

  signOut(): void {
    this.authService.logOut();
  }

  changePassword(): void {
    if (this.isChangingPassword || !this.oldPassword || !this.newPassword) return;
    this.isChangingPassword = true;

    this.authService.changePassword(this.email, this.oldPassword, this.newPassword).pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: () => {
        this.isChangingPassword = false;
        this.oldPassword = '';
        this.newPassword = '';
        this.notificationService.addNotification('Password changed', 'Your password was updated successfully.', 'success');
      },
      error: (err) => {
        this.isChangingPassword = false;
        const message = err?.error?.message || (typeof err?.error === 'string' ? err.error : null)
          || 'Password change failed. Please check your current password.';
        this.notificationService.addNotification('Password change failed', message, 'error');
      },
    });
  }

  saveLivePriceUrl(): void {
    this.livePriceService.saveGoogleSheetUrl(this.googleSheetCsvUrl.trim());
    this.notificationService.addNotification('Live prices', 'Google Sheet URL saved.', 'success');
  }

  async resetPortfolio(): Promise<void> {
    if (this.isResetting) return;
    const ok = await this.confirmDialog.confirm({
      title: 'Reset portfolio data',
      message: 'This permanently deletes all your transactions and holdings. Your account stays. This cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Reset data',
    });
    if (!ok) return;

    this.isResetting = true;
    this.transactionService.clearAllRecords(this.email).pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: () => {
        this.isResetting = false;
        this.notificationService.addNotification('Portfolio reset', 'All transactions and holdings were deleted.', 'success');
      },
      error: () => {
        this.isResetting = false;
        this.notificationService.addNotification('Reset failed', 'Could not clear your portfolio. Please try again.', 'error');
      },
    });
  }
}
