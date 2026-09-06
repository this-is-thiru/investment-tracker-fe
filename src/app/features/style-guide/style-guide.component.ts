import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { InputComponent } from '@shared/ui/input/input.component';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';
import { RadioCardComponent } from '@shared/ui/radio-card/radio-card.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { SpinnerComponent } from '@shared/ui/spinner/spinner.component';
import { TabsComponent, TabItem } from '@shared/ui/tabs/tabs.component';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';

interface TokenSwatch {
  name: string;
  varName: string;
}

interface DemoRow {
  name: string;
  qty: number;
  price: number;
}

@Component({
  selector: 'app-style-guide',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideIconsModule,
    Select,
    TableModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    InputComponent,
    ToggleComponent,
    RadioCardComponent,
    ModalComponent,
    EmptyStateComponent,
    SpinnerComponent,
    TabsComponent,
  ],
  templateUrl: './style-guide.component.html',
  styleUrl: './style-guide.component.css',
})
export class StyleGuideComponent {
  readonly surfaceTokens: TokenSwatch[] = [
    { name: 'background', varName: '--color-background' },
    { name: 'surface', varName: '--color-surface' },
    { name: 'surface-alt', varName: '--color-surface-alt' },
    { name: 'surface-hover', varName: '--color-surface-hover' },
    { name: 'surface-input', varName: '--color-surface-input' },
    { name: 'border', varName: '--color-border' },
  ];

  readonly semanticTokens: TokenSwatch[] = [
    { name: 'accent', varName: '--color-accent' },
    { name: 'blue-accent', varName: '--color-blue-accent' },
    { name: 'purple-accent', varName: '--color-purple-accent' },
    { name: 'success', varName: '--color-success' },
    { name: 'warning', varName: '--color-warning' },
    { name: 'danger', varName: '--color-danger' },
  ];

  readonly tabItems: TabItem[] = [
    { label: 'All', value: 'all' },
    { label: 'Buy', value: 'buy' },
    { label: 'Sell', value: 'sell' },
  ];
  activeTab = 'all';

  readonly demoRows: DemoRow[] = [
    { name: 'Reliance Industries', qty: 10, price: 2854.5 },
    { name: 'HDFC Bank', qty: 25, price: 1642.1 },
    { name: 'Infosys', qty: 15, price: 1489.75 },
  ];

  readonly selectOptions = [
    { label: 'This Month', value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
    { label: 'This Year', value: 'year' },
  ];
  selectedOption = 'month';

  toggleValue = true;
  radioValue = 'usd';
  inputValue = '';
  modalOpen = false;
  buttonLoading = false;

  constructor(private confirmDialog: ConfirmDialogService) {}

  toggleLoadingDemo(): void {
    this.buttonLoading = true;
    setTimeout(() => (this.buttonLoading = false), 1500);
  }

  async openConfirm(): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Delete this item?',
      message: 'This action cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    console.log('confirm result', ok);
  }
}
