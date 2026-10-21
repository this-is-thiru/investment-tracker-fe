import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { ModalComponent } from '../modal/modal.component';
import { ButtonComponent } from '../button/button.component';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  selector: 'ui-confirm-dialog',
  standalone: true,
  imports: [CommonModule, LucideIconsModule, ModalComponent, ButtonComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
  private readonly service = inject(ConfirmDialogService);
  readonly request = this.service.request;

  cancel(): void {
    this.service.respond(false);
  }

  confirm(): void {
    this.service.respond(true);
  }
}
