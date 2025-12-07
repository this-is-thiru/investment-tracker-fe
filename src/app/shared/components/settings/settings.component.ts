import { Component } from '@angular/core';
import { NotificationService } from '../../../services/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Note: Icon imports omitted for brevity.

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  // State properties (replaces useState)
  activeTab: 'account' | 'notifications' | 'security' | 'preferences' = 'account';
  
  // Account settings state (bound via [(ngModel)] in template)
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
  
  // Preferences state
  theme: string = 'dark';
  language: string = 'en';
  currency: string = 'USD';
  dateFormat: string = 'MM/DD/YYYY';

  constructor(private notificationService: NotificationService) { 
    // showToast prop is replaced by injecting NotificationService
  }

  setActiveTab(tab: 'account' | 'notifications' | 'security' | 'preferences'): void {
    this.activeTab = tab;
  }

  // --- Handlers replacing functions that called showToast ---

  handleSaveAccount(): void {
    // In a real app, you would send this data to a backend service here.
    this.notificationService.addNotification(
      'Account settings saved successfully', 
      `Saved details for ${this.fullName}.`, 
      'success'
    );
  }

  handleSaveNotifications(): void {
    this.notificationService.addNotification(
      'Notification preferences updated', 
      'Your communication settings have been saved.', 
      'info'
    );
  }

  handleSaveSecurity(): void {
    this.notificationService.addNotification(
      'Security preferences updated', 
      'Your security settings have been saved.', 
      'success'
    );
  }

  handleSavePreferences(): void {
    this.notificationService.addNotification(
      'General preferences updated', 
      `New theme: ${this.theme}, Language: ${this.language}`, 
      'success'
    );
  }

  handleExportData(): void {
    this.notificationService.addNotification(
      'Data Export Initiated', 
      'Your data export is processing. You will receive an email shortly.', 
      'info'
    );
  }

  handleDeleteAccount(): void {
    // Confirmation logic would go here
    this.notificationService.addNotification(
      'Account Deletion Requested', 
      'You will receive a confirmation link via email to proceed.', 
      'warning'
    );
  }
}
