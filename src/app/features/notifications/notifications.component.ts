import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '@services/notification.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { Observable, map } from 'rxjs';

@Component({
    selector: 'app-notifications-page',
    standalone: true,
    imports: [CommonModule, LucideIconsModule],
    template: `
    <div class="min-h-screen bg-[#191919] py-8">
      <div class="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-8 flow-slide-up flow-delay-1">
          <h1 class="text-2xl md:text-3xl text-white mb-2">Notifications</h1>
          <p class="text-[#B3B3B3]">View and manage all your notification history</p>
        </div>

        <!-- Actions Bar -->
        <div *ngIf="(notifications$ | async)?.length" class="flex flex-wrap items-center gap-3 mb-6 flow-slide-up flow-delay-2">
          <button
            (click)="markAllAsRead()"
            class="flex items-center gap-2 px-4 py-2 bg-[#232323] hover:bg-[#2A2A2A] text-[#B3B3B3] hover:text-white border border-[#3A3A3A] rounded-lg transition-all text-sm"
          >
            <lucide-icon name="check-check" class="h-4 w-4"></lucide-icon>
            Mark all as read
          </button>
          <button
            (click)="clearAllNotifications()"
            class="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 rounded-lg transition-all text-sm"
          >
            <lucide-icon name="trash-2" class="h-4 w-4"></lucide-icon>
            Clear all
          </button>
          <div class="ml-auto text-sm text-[#B3B3B3]">
            {{ unreadCount$ | async }} unread
          </div>
        </div>

        <!-- Notifications List -->
        <div class="space-y-3 flow-slide-up flow-delay-3">
          <ng-container *ngIf="(notifications$ | async) as notifications; else noNotifications">
            <div *ngIf="notifications.length === 0" class="text-center py-16">
              <div class="w-16 h-16 bg-[#232323] rounded-full flex items-center justify-center mx-auto mb-4">
                <lucide-icon name="info" class="h-8 w-8 text-[#666666]"></lucide-icon>
              </div>
              <h3 class="text-lg text-white mb-2">No notifications yet</h3>
              <p class="text-[#B3B3B3]">You'll see notifications here when actions are completed</p>
            </div>

            <div
              *ngFor="let notification of notifications; let i = index"
              class="relative bg-[#232323] border rounded-xl p-4 transition-all hover:bg-[#2A2A2A] group"
              [ngClass]="[!notification.read ? getTypeColor(notification.type) : 'border-[#3A3A3A]']"
              [style.animation]="'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards ' + (i * 0.05) + 's'"
              style="opacity: 0"
            >
              <div class="flex items-start gap-4">
                <!-- Icon -->
                <div class="p-2 rounded-lg" [ngClass]="getIconBg(notification.type)">
                  <lucide-icon [name]="getIcon(notification.type)" class="h-5 w-5" [ngClass]="getIconColor(notification.type)"></lucide-icon>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-3 mb-1">
                    <h4 class="text-white font-medium">{{ notification.title }}</h4>
                    <span *ngIf="!notification.read" class="w-2 h-2 bg-[#10A37F] rounded-full shrink-0 mt-2"></span>
                  </div>
                  <p class="text-[#B3B3B3] text-sm mb-2 break-words">{{ notification.message }}</p>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-[#666666]">{{ formatTimestamp(notification.timestamp) }}</span>
                    <span class="text-xs px-2 py-0.5 rounded capitalize" [ngClass]="getTypeBadgeClass(notification.type)">
                      {{ notification.type }}
                    </span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    *ngIf="!notification.read"
                    (click)="markAsRead(notification.id)"
                    class="p-2 text-[#B3B3B3] hover:text-[#10A37F] hover:bg-[#10A37F]/10 rounded-lg transition-all"
                    title="Mark as read"
                  >
                    <lucide-icon name="check-check" class="h-4 w-4"></lucide-icon>
                  </button>
                  <button
                    (click)="clearNotification(notification.id)"
                    class="p-2 text-[#B3B3B3] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete notification"
                  >
                    <lucide-icon name="trash-2" class="h-4 w-4"></lucide-icon>
                  </button>
                </div>
              </div>
            </div>
          </ng-container>

          <ng-template #noNotifications>
             <!-- Handled by notifications.length === 0 above -->
          </ng-template>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class NotificationsComponent implements OnInit {
  notifications$: Observable<Notification[]>;
  unreadCount$: Observable<number>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications$;
    this.unreadCount$ = this.notificationService.unreadCount$;
  }

  ngOnInit(): void {}

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check-circle-2';
      case 'error': return 'x-circle';
      case 'warning': return 'alert-triangle';
      case 'info':
      default: return 'info';
    }
  }

  getIconColor(type: string): string {
    switch (type) {
      case 'success': return 'text-[#10A37F]';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'info':
      default: return 'text-blue-500';
    }
  }

  getIconBg(type: string): string {
    switch (type) {
      case 'success': return 'bg-[#10A37F]/10';
      case 'error': return 'bg-red-500/10';
      case 'warning': return 'bg-yellow-500/10';
      case 'info':
      default: return 'bg-blue-500/10';
    }
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'success': return 'bg-[#10A37F]/10 border-[#10A37F]/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'info': return 'bg-blue-500/10 border-blue-500/20';
      default: return 'bg-[#232323] border-[#3A3A3A]';
    }
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'success': return 'bg-[#10A37F]/10 text-[#10A37F]';
      case 'error': return 'bg-red-500/10 text-red-400';
      case 'warning': return 'bg-yellow-500/10 text-yellow-400';
      case 'info':
      default: return 'bg-blue-500/10 text-blue-400';
    }
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
}
