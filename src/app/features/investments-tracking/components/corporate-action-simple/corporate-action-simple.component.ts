import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CorporateActionService } from '../../services/corporate-action.service';
import { AuthService } from '../../../../services/auth.service';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

@Component({
  selector: 'app-corporate-action-simple',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideIconsModule,
    PrimeNgModule,
  ],
  providers: [MessageService],
  templateUrl: './corporate-action-simple.component.html',
})
export class CorporateActionSimpleComponent {
  @Input() userEmail = '';
  @Output() actionApplied = new EventEmitter<void>();

  private corporateActionService = inject(CorporateActionService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  actionType = 'bonus';
  stockCode = '';
  ratio = '';
  dividendAmount: number | null = null;
  isLoading = false;

  actionOptions = [
    { label: 'Bonus Issue', value: 'bonus' },
    { label: 'Dividend Payment', value: 'dividend' },
    { label: 'Stock Split', value: 'split' },
    { label: 'Merger/Acquisition', value: 'merger' },
  ];

  applyAction(): void {
    const email = this.userEmail || this.authService.getUserEmail();
    if (!email) {
      this.messageService.add({
        severity: 'error',
        summary: 'Please sign in',
        detail: 'You need to be signed in to apply corporate actions.',
      });
      return;
    }

    if (!this.stockCode.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please enter a stock code.',
      });
      return;
    }

    const payload: any = {
      actionType: this.actionType,
      stockCode: this.stockCode.trim(),
    };

    if (this.actionType === 'split' || this.actionType === 'bonus') {
      if (!this.ratio.trim()) {
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Please enter a ratio.',
        });
        return;
      }
      payload.ratio = this.ratio.trim();
    }

    if (this.actionType === 'dividend') {
      if (this.dividendAmount == null || this.dividendAmount <= 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Please enter a valid dividend amount.',
        });
        return;
      }
      payload.dividendAmount = this.dividendAmount;
    }

    this.isLoading = true;
    this.corporateActionService.apply(email, payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Corporate action applied successfully.',
        });
        this.actionApplied.emit();
        this.resetForm();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Corporate action error:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to apply corporate action.',
        });
      },
    });
  }

  resetForm(): void {
    this.stockCode = '';
    this.ratio = '';
    this.dividendAmount = null;
  }
}
