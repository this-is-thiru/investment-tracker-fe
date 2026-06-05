import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../services/notification.service';
import { NotificationToastComponent } from './notification-toast.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, NotificationToastComponent],
  template: `
    <div class="fixed right-4 z-[100] flex flex-col gap-3 top-20 pointer-events-none">
      <app-notification-toast
        *ngFor="let toast of toasts$ | async; let i = index; trackBy: trackByById"
        [notification]="toast"
        [index]="i"
        (close)="removeToast(toast.id)"
        class="pointer-events-auto"
      >
      </app-notification-toast>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class ToastContainerComponent implements OnInit {
  toasts$: Observable<Notification[]>;

  constructor(private notificationService: NotificationService) {
    this.toasts$ = this.notificationService.toasts$;
  }

  ngOnInit(): void {}

  removeToast(id: string): void {
    this.notificationService.removeToast(id);
  }

  trackByById(index: number, item: Notification): string {
    return item.id;
  }
}
