import { Component, EventEmitter, Output } from '@angular/core';
import { NotificationService } from '../../../services/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconsModule } from '../../../core/icons/lucide-icons.module';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  @Output() navigate = new EventEmitter<string>();

  activeTab: 'account' | 'notifications' | 'security' | 'preferences' | 'billing' = 'account';
  
  // Account settings state
  fullName: string = 'John Doe';
  email: string = 'john.doe@example.com';
  phone: string = '+1 (555) 123-4567';
  
  // Notification preferences state
  emailNotifications: boolean = true;
  pushNotifications: boolean = true;
  weeklyReports: boolean = false;
  portfolioAlerts: boolean = true;
  
  // Security state
  twoFactorEnabled: boolean = false;
  oldPassword: string = '';
  newPasswordValue: string = '';
  confirmPasswordValue: string = '';
  
  // Preferences state
  theme: string = 'dark';
  language: string = 'en';
  currency: string = 'USD';
  dateFormat: string = 'MM/DD/YYYY';

  tabs = [
    { id: 'account' as const, label: 'Account', icon: 'user' },
    { id: 'billing' as const, label: 'Billing', icon: 'credit-card' },
    { id: 'notifications' as const, label: 'Notifications', icon: 'bell' },
    { id: 'security' as const, label: 'Security', icon: 'shield' },
    { id: 'preferences' as const, label: 'Preferences', icon: 'palette' },
  ];

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    const userEmail = this.authService.getUserEmail();
    if (userEmail) {
      this.email = userEmail;
    }
  }

  setActiveTab(tab: 'account' | 'notifications' | 'security' | 'preferences' | 'billing'): void {
    this.activeTab = tab;
  }

  handleSaveAccount(): void {
    this.notificationService.addNotification('Account settings saved successfully', '', 'success');
  }

  handleSaveNotifications(): void {
    this.notificationService.addNotification('Notification preferences updated', '', 'success');
  }

  handleEnableTwoFactor(): void {
    this.twoFactorEnabled = !this.twoFactorEnabled;
    this.notificationService.addNotification(
      this.twoFactorEnabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
      '',
      this.twoFactorEnabled ? 'success' : 'warning'
    );
  }

  handleChangePassword(): void {
    if (!this.oldPassword || !this.newPasswordValue || !this.confirmPasswordValue) {
      this.notificationService.addNotification('All password fields are required', '', 'error');
      return;
    }

    if (this.newPasswordValue !== this.confirmPasswordValue) {
      this.notificationService.addNotification('New passwords do not match', '', 'error');
      return;
    }

    const email = this.authService.getUserEmail();
    if (!email) {
      this.notificationService.addNotification('User email not found. Please log in again.', '', 'error');
      return;
    }

    this.authService.changePassword(email, this.oldPassword, this.newPasswordValue).subscribe({
      next: () => {
        this.notificationService.addNotification('Password changed successfully', '', 'success');
        this.oldPassword = '';
        this.newPasswordValue = '';
        this.confirmPasswordValue = '';
      },
      error: (err) => {
        const errorMsg = err?.error?.message || 'Password change failed. Please check your current password.';
        this.notificationService.addNotification(errorMsg, '', 'error');
      }
    });
  }

  handleSavePreferences(): void {
    this.notificationService.addNotification('Preferences saved successfully', '', 'success');
  }

  handleExportData(): void {
    this.notificationService.addNotification('Your data export has been initiated. You will receive an email shortly.', '', 'info');
  }

  handleDeleteAccount(): void {
    this.notificationService.addNotification('Account deletion is a sensitive operation. Please contact support.', '', 'warning');
  }

  onNavigate(page: string): void {
    this.navigate.emit(page);
  }
}


