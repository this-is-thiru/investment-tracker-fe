import { Component, DestroyRef, ElementRef, NgZone, afterNextRender, inject, signal, viewChild } from '@angular/core';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Pinned "exploded view" of the dashboard: a tilted stack that separates into its four
 * engines and then settles flat as the visitor scrolls through the section.
 */
@Component({
  selector: 'app-product-reveal',
  standalone: true,
  templateUrl: './product-reveal.component.html',
  styleUrls: ['./product-reveal.component.css'],
})
export class ProductRevealComponent {
  private zone = inject(NgZone);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);

  private device = viewChild.required<ElementRef<HTMLElement>>('device');

  caption = signal(0);

  readonly bars = [40, 62, -18, 55, 78, 46, 88, 34, -12, 70, 60, 94];
  readonly holdings = [
    { code: 'INFY', change: 8.4 },
    { code: 'HDFCBANK', change: 12.1 },
    { code: 'TATAPOWER', change: -3.2 },
    { code: 'NIFTYBEES', change: 15.7 },
    { code: 'SGB 2028', change: 21.9 },
    { code: 'PPFAS Flexi Cap', change: 18.3 },
  ];

  constructor() {
    afterNextRender(() => {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let ticking = false;

      const frame = () => {
        ticking = false;
        const r = this.host.nativeElement.getBoundingClientRect();
        const p = reduced ? 1 : clamp(-r.top / Math.max(1, r.height - innerHeight));
        const explode = smooth(0.08, 0.38, p) * (1 - smooth(0.58, 0.85, p));
        const tilt = 1 - smooth(0.55, 0.92, p);
        const style = this.device().nativeElement.style;
        style.setProperty('--e', explode.toFixed(4));
        style.setProperty('--t', tilt.toFixed(4));

        const caption = p < 0.2 ? 0 : p < 0.62 ? 1 : 2;
        if (caption !== this.caption()) {
          this.zone.run(() => this.caption.set(caption));
        }
      };
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(frame);
        }
      };

      this.zone.runOutsideAngular(() => {
        addEventListener('scroll', onScroll, { passive: true });
        addEventListener('resize', onScroll);
      });
      this.destroyRef.onDestroy(() => {
        removeEventListener('scroll', onScroll);
        removeEventListener('resize', onScroll);
      });
      frame();
    });
  }
}
