import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Notification } from '../../../services/notification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-toast.component.html',
  styleUrl: './notification-toast.component.css',
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  // Props converted to @Input()
  @Input() notification!: Notification;
  @Input() index!: number; 
  
  // onClose prop converted to @Output() EventEmitter
  @Output() close = new EventEmitter<void>();

  isExiting: boolean = false;
  private autoCloseTimer!: number; // Use number for timer ID

  ngOnInit(): void {
    // Set a timer for auto-close (5000ms)
    this.autoCloseTimer = window.setTimeout(() => {
      this.handleClose();
    }, 5000);
  }

  ngOnDestroy(): void {
    // Clear the timer when the component is destroyed
    if (this.autoCloseTimer) {
      window.clearTimeout(this.autoCloseTimer);
    }
  }

  handleClose(): void {
    this.isExiting = true;
    // Wait for the exit transition (300ms) before emitting the close event
    setTimeout(() => {
      this.close.emit();
    }, 300);
  }

  getStyles(): { bg: string, border: string, iconClass: string } {
    switch (this.notification.type) {
      case 'success':
        return { bg: 'bg-[#10A37F]/95', border: 'border-[#10A37F]', iconClass: 'text-white' };
      case 'error':
        return { bg: 'bg-red-500/95', border: 'border-red-500', iconClass: 'text-white' };
      case 'warning':
        return { bg: 'bg-yellow-500/95', border: 'border-yellow-500', iconClass: 'text-white' };
      case 'info':
      default:
        return { bg: 'bg-blue-500/95', border: 'border-blue-500', iconClass: 'text-white' };
    }
  }
}
