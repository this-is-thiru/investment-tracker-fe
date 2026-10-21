import {
  ApplicationRef,
  ComponentRef,
  Directive,
  ElementRef,
  EnvironmentInjector,
  HostListener,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  createComponent,
} from '@angular/core';
import { TooltipPanelComponent, TooltipPosition, TooltipVariant } from './tooltip-panel.component';

let uniqueId = 0;

/**
 * Lightweight, dependency-free tooltip directive matching the app's dark,
 * "premium card" visual language. Works with plain text or a rich
 * <ng-template> for HTML content, auto-flips off viewport edges, and is
 * keyboard/screen-reader accessible.
 *
 * Usage:
 *   <lucide-icon name="info" appTooltip="Some helpful text"></lucide-icon>
 *   <span [appTooltip]="richTemplate" appTooltipVariant="info"></span>
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '[attr.aria-describedby]': 'hasPanel ? tooltipId : null',
  },
})
export class TooltipDirective implements OnInit, OnChanges, OnDestroy {
  @Input('appTooltip') content: string | TemplateRef<unknown> | null = null;
  @Input() appTooltipPosition: TooltipPosition = 'top';
  @Input() appTooltipVariant: TooltipVariant = 'default';
  @Input() appTooltipDisabled = false;
  @Input() appTooltipDelay = 150;
  @Input() appTooltipMaxWidth = '260px';

  readonly tooltipId = `app-tooltip-${++uniqueId}`;

  private panelRef: ComponentRef<TooltipPanelComponent> | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCleanup: (() => void) | null = null;
  private readonly viewportPadding = 8;
  private readonly gap = 8;

  private readonly onWindowChange = () => this.reposition();
  private readonly onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.hide(true);
    }
  };

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly appRef: ApplicationRef,
    private readonly injector: EnvironmentInjector,
  ) {}

  get hasPanel(): boolean {
    return !!this.panelRef;
  }

  ngOnInit(): void {
    this.stripNativeTitle();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.stripNativeTitle();
    if (changes['content'] && !this.content) {
      this.hide(true);
    }
    if (changes['appTooltipDisabled'] && this.appTooltipDisabled) {
      this.hide(true);
    }
    this.updatePanelInputs();
  }

  private stripNativeTitle(): void {
    const el = this.el?.nativeElement;
    if (el && typeof el.hasAttribute === 'function' && el.hasAttribute('title')) {
      const nativeTitle = el.getAttribute('title');
      if (!this.content && nativeTitle) {
        this.content = nativeTitle;
      }
      el.removeAttribute('title');
    }
  }

  ngOnDestroy(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    this.pendingCleanup?.();
    this.pendingCleanup = null;
    this.hide(true);
  }

  @HostListener('mouseenter')
  @HostListener('focusin')
  onShow(): void {
    this.stripNativeTitle();
    if (this.appTooltipDisabled || !this.content) {
      return;
    }
    if (this.hideTimer) {
      // A previous panel is mid fade-out — finish tearing it down now
      // instead of leaving it orphaned in the DOM.
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
      this.pendingCleanup?.();
      this.pendingCleanup = null;
    }
    if (this.panelRef) {
      return;
    }
    this.showTimer = setTimeout(() => this.show(), this.appTooltipDelay);
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  onHide(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    this.hide(false);
  }

  @HostListener('click')
  onClick(): void {
    this.hide(true);
  }

  private show(): void {
    this.panelRef = createComponent(TooltipPanelComponent, { environmentInjector: this.injector });
    this.updatePanelInputs();
    document.body.appendChild(this.panelRef.location.nativeElement);
    this.appRef.attachView(this.panelRef.hostView);

    window.addEventListener('scroll', this.onWindowChange, true);
    window.addEventListener('resize', this.onWindowChange);
    document.addEventListener('keydown', this.onKeydown);

    // Position after the panel has rendered so its dimensions are known.
    requestAnimationFrame(() => {
      this.reposition();
      if (this.panelRef) {
        this.panelRef.instance.visible = true;
        this.panelRef.changeDetectorRef.detectChanges();
      }
    });
  }

  private hide(immediate: boolean): void {
    if (!this.panelRef) {
      return;
    }
    const ref = this.panelRef;
    ref.instance.visible = false;
    ref.changeDetectorRef.detectChanges();

    const cleanup = () => {
      window.removeEventListener('scroll', this.onWindowChange, true);
      window.removeEventListener('resize', this.onWindowChange);
      document.removeEventListener('keydown', this.onKeydown);
      this.appRef.detachView(ref.hostView);
      ref.destroy();
    };

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    this.panelRef = null;
    if (immediate) {
      cleanup();
      this.hideTimer = null;
      this.pendingCleanup = null;
    } else {
      this.pendingCleanup = cleanup;
      this.hideTimer = setTimeout(() => {
        cleanup();
        this.pendingCleanup = null;
      }, 130);
    }
  }

  private updatePanelInputs(): void {
    if (!this.panelRef) {
      return;
    }
    const instance = this.panelRef.instance;
    instance.content = typeof this.content === 'string' ? this.content : null;
    instance.template = this.content instanceof TemplateRef ? this.content : null;
    instance.variant = this.appTooltipVariant;
    instance.tooltipId = this.tooltipId;
    this.panelRef.location.nativeElement.style.setProperty('--tooltip-max-width', this.appTooltipMaxWidth);
    this.panelRef.changeDetectorRef.detectChanges();
  }

  private reposition(): void {
    if (!this.panelRef) {
      return;
    }
    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const panelEl = this.panelRef.location.nativeElement as HTMLElement;
    const panelRect = panelEl.getBoundingClientRect();

    const resolvedPosition = this.resolvePosition(hostRect, panelRect);
    this.panelRef.instance.position = resolvedPosition;

    const { top, left, arrowOffset, origin } = this.computeCoords(hostRect, panelRect, resolvedPosition);

    panelEl.style.transform = `translate(${left}px, ${top}px)`;
    panelEl.style.setProperty('--tooltip-arrow-offset', `${arrowOffset}px`);
    panelEl.style.setProperty('--tooltip-origin', origin);
  }

  /** Flips the preferred side if the tooltip would overflow the viewport. */
  private resolvePosition(hostRect: DOMRect, panelRect: DOMRect): TooltipPosition {
    const preferred = this.appTooltipPosition;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const overflows: Record<TooltipPosition, boolean> = {
      top: hostRect.top - panelRect.height - this.gap < 0,
      bottom: hostRect.bottom + panelRect.height + this.gap > vh,
      left: hostRect.left - panelRect.width - this.gap < 0,
      right: hostRect.right + panelRect.width + this.gap > vw,
    };
    const opposite: Record<TooltipPosition, TooltipPosition> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    };

    return overflows[preferred] && !overflows[opposite[preferred]] ? opposite[preferred] : preferred;
  }

  private computeCoords(hostRect: DOMRect, panelRect: DOMRect, position: TooltipPosition) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = 0;
    let left = 0;
    let origin = 'center bottom';

    if (position === 'top' || position === 'bottom') {
      left = hostRect.left + hostRect.width / 2 - panelRect.width / 2;
      top = position === 'top' ? hostRect.top - panelRect.height - this.gap : hostRect.bottom + this.gap;
      origin = position === 'top' ? 'center bottom' : 'center top';
    } else {
      top = hostRect.top + hostRect.height / 2 - panelRect.height / 2;
      left = position === 'left' ? hostRect.left - panelRect.width - this.gap : hostRect.right + this.gap;
      origin = position === 'left' ? 'right center' : 'left center';
    }

    const clampedLeft = Math.min(Math.max(left, this.viewportPadding), vw - panelRect.width - this.viewportPadding);
    const clampedTop = Math.min(Math.max(top, this.viewportPadding), vh - panelRect.height - this.viewportPadding);

    // Keep the arrow pointing at the host's center even after clamping.
    let arrowOffset: number;
    if (position === 'top' || position === 'bottom') {
      const hostCenterX = hostRect.left + hostRect.width / 2;
      arrowOffset = Math.min(Math.max(hostCenterX - clampedLeft, 12), panelRect.width - 12);
    } else {
      const hostCenterY = hostRect.top + hostRect.height / 2;
      arrowOffset = Math.min(Math.max(hostCenterY - clampedTop, 12), panelRect.height - 12);
    }

    return { top: clampedTop, left: clampedLeft, arrowOffset, origin };
  }
}
