import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ToggleSwitch } from 'primeng/toggleswitch';

let nextId = 0;

/**
 * Themed on/off switch — thin wrapper over PrimeNG's p-toggleswitch (now
 * correctly themed via the WealthLens preset, see core/theme). Replaces the
 * ~10 hand-built toggle switches in settings.component.html.
 *
 * Usage: <ui-toggle formControlName="emailAlerts" /> or <ui-toggle [(ngModel)]="enabled" />
 */
@Component({
  selector: 'ui-toggle',
  standalone: true,
  imports: [CommonModule, FormsModule, ToggleSwitch],
  templateUrl: './toggle.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleComponent),
      multi: true,
    },
  ],
})
export class ToggleComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Input() id = `ui-toggle-${nextId++}`;

  checked = false;

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: boolean): void {
    this.checked = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleChange(value: boolean): void {
    this.checked = value;
    this.onChange(value);
    this.onTouched();
  }
}
