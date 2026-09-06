import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';

export type ModalSize = 'sm' | 'md' | 'lg';

/**
 * Generic modal shell (overlay scrim + panel + optional close button),
 * replacing the 3 divergent hand-rolled modal implementations (auth,
 * detail, confirm) that each used different bg/radius/animation values.
 *
 * Content projection:
 *  - `[modalHeader]` — title area (optional; falls back to plain `title` input)
 *  - default slot — body
 *  - `[modalFooter]` — action buttons row
 *
 * Usage:
 * <ui-modal [open]="show" title="Sign in" (closed)="show = false">
 *   ...body...
 *   <div modalFooter> <ui-button (click)="show=false">Cancel</ui-button> </div>
 * </ui-modal>
 */
@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CommonModule, LucideIconsModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() size: ModalSize = 'md';
  @Input() dismissible = true;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.open && this.dismissible) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  handleBackdropClick(): void {
    if (this.dismissible) {
      this.close();
    }
  }
}
