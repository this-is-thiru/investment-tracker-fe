import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Notification,
  NotificationService,
} from '../../../services/notification.service';
import { CommonModule } from '@angular/common';
// Note: Imports for lucide icons (e.g., CheckCircle2) are omitted for brevity,
// assuming you use an Angular icon library or custom components.

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css',
})
export class NotificationsPageComponent {
  // Use the async pipe in the template to subscribe to notifications$
  notifications$: Observable<Notification[]>;
  unreadCount$: Observable<number>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications$;
    this.unreadCount$ = this.notificationService.unreadCount$;
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearNotification(id: string): void {
    this.notificationService.clearNotification(id);
  }

  clearAllNotifications(): void {
    this.notificationService.clearAllNotifications();
  }

  // Helper method for template rendering
  getIconClass(type: string): string {
    switch (type) {
      case 'success':
        return 'text-[#10A37F]';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-blue-500';
    }
  }

  // Helper method for template rendering
  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }
}
