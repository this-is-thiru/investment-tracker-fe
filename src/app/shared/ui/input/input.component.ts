import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

/**
 * Themed text input implementing ControlValueAccessor, so it works as a
 * drop-in for both `formControlName` and `[(ngModel)]` (both are used
 * across the app). Replaces the ~35 raw `<input>` tags that each hand-roll
 * a near-identical `bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg ...`
 * class string.
 *
 * Usage: <ui-input type="email" placeholder="Email" formControlName="email" [error]="hasError" />
 */
@Component({
  selector: 'ui-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'search' | 'date' = 'text';
  @Input() placeholder = '';
  @Input() error = false;
  @Input() disabled = false;
  @Input() id = `ui-input-${nextId++}`;

  value = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
