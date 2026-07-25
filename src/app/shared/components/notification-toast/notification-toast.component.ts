import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { Notification } from '@services/notification.service';

@Component({
    selector: 'app-notification-toast',
    standalone: true,
    imports: [CommonModule, LucideIconsModule],
    template: `
    <div
      class="w-80 backdrop-blur-md border rounded-xl shadow-2xl transition-all duration-300 relative overflow-hidden"
      [ngClass]="[styles.bg, styles.border, isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0']"
    >
      <div class="p-4">
        <div class="flex items-start gap-3">
          <lucide-icon [name]="styles.icon" class="h-5 w-5 text-white shrink-0"></lucide-icon>
          <div class="flex-1 min-w-0">
            <h4 class="text-white font-semibold mb-1">{{ notification.title }}</h4>
            <p class="text-white/90 text-sm break-words">{{ notification.message }}</p>
          </div>
          <button
            (click)="handleClose()"
            class="text-white/70 hover:text-white transition-colors p-1 -mt-1 -mr-1 shrink-0"
          >
            <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
          </button>
        </div>
      </div>
      <!-- Progress bar -->
      <div class="h-1 bg-white/20 rounded-b-xl overflow-hidden">
        <div
          class="h-full bg-white/50"
          [style.animation]="'progress 5s linear forwards'"
        ></div>
      </div>
    </div>

    <style>
      @keyframes progress {
        from { width: 100%; }
        to { width: 0%; }
      }
    </style>
  `,
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  @Input() notification!: Notification;
  @Input() index: number = 0;
  @Output() close = new EventEmitter<void>();

  isExiting = false;
  private timer: any;

  ngOnInit(): void {
    this.timer = setTimeout(() => {
      this.handleClose();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  handleClose(): void {
    this.isExiting = true;
    setTimeout(() => {
      this.close.emit();
    }, 300);
  }

  get styles() {
    switch (this.notification.type) {
      case 'success':
        return {
          bg: 'bg-[#10A37F]/95',
          border: 'border-[#10A37F]',
          icon: 'check-circle-2',
        };
      case 'error':
        return {
          bg: 'bg-red-500/95',
          border: 'border-red-500',
          icon: 'x-circle',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/95',
          border: 'border-yellow-500',
          icon: 'alert-triangle',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500/95',
          border: 'border-blue-500',
          icon: 'info',
        };
    }
  }
}
