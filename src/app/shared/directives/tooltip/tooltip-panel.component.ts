import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipVariant = 'default' | 'info' | 'success' | 'warning' | 'danger';

/**
 * Internal visual shell for [appTooltip]. Not meant to be used directly in
 * templates — the directive creates and positions this component.
 */
@Component({
  selector: 'app-tooltip-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="tooltip-panel"
      [class.tooltip-panel--visible]="visible"
      [ngClass]="'tooltip-panel--' + variant"
      role="tooltip"
      [id]="tooltipId"
    >
      @if (isTemplate) {
        <ng-container *ngTemplateOutlet="asTemplate"></ng-container>
      } @else {
        <span>{{ content }}</span>
      }
      <span class="tooltip-arrow" [ngClass]="'tooltip-arrow--' + position"></span>
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 99999;
      pointer-events: none;
    }

    .tooltip-panel {
      position: relative;
      display: inline-block;
      max-width: var(--tooltip-max-width, 260px);
      padding: 0.35rem 0.6rem;
      border-radius: 0.5rem;
      background: rgba(30, 30, 30, 0.96);
      backdrop-filter: blur(12px);
      border: 1px solid #3A3A3A;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
      color: #FFFFFF;
      font-size: 0.75rem;
      line-height: 1.35;
      font-weight: 500;
      white-space: normal;
      word-break: break-word;
      opacity: 0;
      transform: scale(0.94) translateY(2px);
      transform-origin: var(--tooltip-origin, center bottom);
      transition: opacity 120ms cubic-bezier(0.16, 1, 0.3, 1),
                  transform 120ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .tooltip-panel--visible {
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    .tooltip-panel--info {
      border-color: rgba(59, 130, 246, 0.45);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(59, 130, 246, 0.08);
    }

    .tooltip-panel--success {
      border-color: rgba(16, 163, 127, 0.5);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(16, 163, 127, 0.08);
    }

    .tooltip-panel--warning {
      border-color: rgba(250, 204, 21, 0.45);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(250, 204, 21, 0.08);
    }

    .tooltip-panel--danger {
      border-color: rgba(239, 68, 68, 0.45);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(239, 68, 68, 0.08);
    }

    .tooltip-arrow {
      position: absolute;
      width: 8px;
      height: 8px;
      background: inherit;
      border: inherit;
      border-radius: 2px;
    }

    .tooltip-arrow--top {
      bottom: -4.5px;
      left: var(--tooltip-arrow-offset, 50%);
      transform: translateX(-50%) rotate(45deg);
      border-top: none;
      border-left: none;
    }

    .tooltip-arrow--bottom {
      top: -4.5px;
      left: var(--tooltip-arrow-offset, 50%);
      transform: translateX(-50%) rotate(45deg);
      border-bottom: none;
      border-right: none;
    }

    .tooltip-arrow--left {
      right: -4.5px;
      top: var(--tooltip-arrow-offset, 50%);
      transform: translateY(-50%) rotate(45deg);
      border-bottom: none;
      border-left: none;
    }

    .tooltip-arrow--right {
      left: -4.5px;
      top: var(--tooltip-arrow-offset, 50%);
      transform: translateY(-50%) rotate(45deg);
      border-top: none;
      border-right: none;
    }
  `],
})
export class TooltipPanelComponent {
  @Input() content: string | null = null;
  @Input() template: TemplateRef<unknown> | null = null;
  @Input() variant: TooltipVariant = 'default';
  @Input() position: TooltipPosition = 'top';
  @Input() tooltipId = '';
  @Input() visible = false;

  get isTemplate(): boolean {
    return !!this.template;
  }

  get asTemplate(): TemplateRef<unknown> {
    return this.template as TemplateRef<unknown>;
  }
}
