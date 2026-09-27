import { Component, inject } from '@angular/core';
import { AsyncPipe, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notification } from '@services/notification.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { TooltipDirective } from '@shared/directives/tooltip/tooltip.directive';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';

type NotificationType = Notification['type'];

const TYPE_STYLES: Record<NotificationType, { icon: string; text: string; bg: string; border: string }> = {
  success: { icon: 'check-circle-2', text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30' },
  error: { icon: 'x-circle', text: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30' },
  warning: { icon: 'alert-triangle', text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  info: { icon: 'info', text: 'text-blue-accent', bg: 'bg-blue-accent/10', border: 'border-blue-accent/30' },
};

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [AsyncPipe, NgClass, LucideIconsModule, TooltipDirective, FooterComponent, ButtonComponent, EmptyStateComponent],
  template: `
    <div class="w-full min-h-screen flex flex-col bg-background">

      <!-- HEADER STRIP -->
      <section class="relative bg-background overflow-hidden border-b border-divider">
        <div class="absolute inset-0 opacity-30 pointer-events-none">
          <div class="relative bg-gradient-to-br from-[#0F0F0F] via-[#121212] to-background w-full h-full"></div>
        </div>
        <div class="w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-10 md:py-14 relative z-10">
          <div class="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1.5 mb-4">
            <lucide-icon name="bell" class="w-4 h-4 text-accent"></lucide-icon>
            <span class="text-xs text-accent font-semibold uppercase tracking-wider">Notifications</span>
          </div>
          <h1 class="text-3xl md:text-4xl text-white mb-2 font-semibold">
            Your
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-hover">activity</span>
          </h1>
          <p class="text-sm text-text-secondary max-w-2xl">
            Results of uploads, corporate actions and account changes. Click one to open the page it's about.
          </p>
        </div>
      </section>

      <!-- MAIN BODY -->
      <main class="w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 flex-1">
        @if (notifications$ | async; as notifications) {
          @if (notifications.length === 0) {
            <ui-empty-state icon="bell" title="No notifications yet"
              message="You'll see results here when you upload transactions or change settings." />
          } @else {
            <!-- Actions bar -->
            <div class="flex flex-wrap items-center gap-3 mb-6">
              <ui-button variant="secondary" size="sm" (click)="markAllAsRead()">
                <lucide-icon name="check-check" class="h-4 w-4"></lucide-icon>
                Mark all as read
              </ui-button>
              <ui-button variant="danger" size="sm" (click)="clearAll()">
                <lucide-icon name="trash-2" class="h-4 w-4"></lucide-icon>
                Clear all
              </ui-button>
              <span class="ml-auto text-sm text-text-secondary">{{ unreadCount$ | async }} unread</span>
            </div>

            <!-- List -->
            <div class="space-y-3">
              @for (notification of notifications; track notification.id) {
                <div
                  class="relative border rounded-xl p-4 transition-colors group"
                  [ngClass]="notification.read ? 'bg-surface border-border hover:bg-surface-hover' : styles(notification.type).bg + ' ' + styles(notification.type).border"
                  [class.cursor-pointer]="!!notification.link"
                  [attr.role]="notification.link ? 'button' : null"
                  [attr.tabindex]="notification.link ? 0 : null"
                  (click)="open(notification)"
                  (keydown.enter)="open(notification)"
                  (keydown.space)="open(notification); $event.preventDefault()"
                >
                  <div class="flex items-start gap-4">
                    <div class="p-2 rounded-lg shrink-0" [ngClass]="styles(notification.type).bg">
                      <lucide-icon [name]="styles(notification.type).icon" class="h-5 w-5" [ngClass]="styles(notification.type).text"></lucide-icon>
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <h2 class="text-sm text-white font-medium">{{ notification.title }}</h2>
                        @if (!notification.read) {
                          <span class="w-2 h-2 bg-accent rounded-full shrink-0" aria-label="Unread"></span>
                        }
                      </div>
                      @if (notification.message) {
                        <p class="text-text-secondary text-sm mb-2 break-words">{{ notification.message }}</p>
                      }
                      <div class="flex items-center gap-3">
                        <span class="text-xs text-text-muted">{{ formatTimestamp(notification.timestamp) }}</span>
                        <span class="text-xs px-2 py-0.5 rounded capitalize" [ngClass]="styles(notification.type).bg + ' ' + styles(notification.type).text">
                          {{ notification.type }}
                        </span>
                      </div>
                    </div>

                    <!-- Actions: always visible on touch screens, on hover/focus on larger ones -->
                    <div class="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                      @if (!notification.read) {
                        <ui-button variant="icon" size="sm" appTooltip="Mark as read" ariaLabel="Mark as read"
                          (click)="markAsRead(notification.id); $event.stopPropagation()">
                          <lucide-icon name="check-check" class="h-4 w-4"></lucide-icon>
                        </ui-button>
                      }
                      <ui-button variant="icon" size="sm" appTooltip="Delete notification" appTooltipVariant="danger" ariaLabel="Delete notification"
                        (click)="clearNotification(notification.id); $event.stopPropagation()">
                        <lucide-icon name="trash-2" class="h-4 w-4"></lucide-icon>
                      </ui-button>
                      @if (notification.link) {
                        <lucide-icon name="ArrowRight" class="h-4 w-4 text-text-muted ml-1"></lucide-icon>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        }
      </main>

      <app-footer></app-footer>
    </div>
  `,
})
export class NotificationsComponent {
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);

  notifications$ = this.notificationService.notifications$;
  unreadCount$ = this.notificationService.unreadCount$;

  styles(type: NotificationType) {
    return TYPE_STYLES[type] ?? TYPE_STYLES.info;
  }

  formatTimestamp(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
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

  open(notification: Notification): void {
    this.notificationService.markAsRead(notification.id);
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearNotification(id: string): void {
    this.notificationService.clearNotification(id);
  }

  async clearAll(): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Clear all notifications',
      message: 'This removes your whole notification history. This cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Clear all',
    });
    if (ok) {
      this.notificationService.clearAllNotifications();
    }
  }
}
