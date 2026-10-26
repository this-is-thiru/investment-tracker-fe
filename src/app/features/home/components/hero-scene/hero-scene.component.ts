import { Component, DestroyRef, ElementRef, NgZone, afterNextRender, inject, output } from '@angular/core';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { ButtonComponent } from '@shared/ui/button/button.component';

/**
 * Landing hero: aurora background, a spotlight that follows the pointer, and floating
 * widgets that drift with it at different depths for a parallax feel.
 */
@Component({
  selector: 'app-hero-scene',
  standalone: true,
  imports: [LucideIconsModule, ButtonComponent],
  templateUrl: './hero-scene.component.html',
  styleUrls: ['./hero-scene.component.css'],
})
export class HeroSceneComponent {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  start = output<void>();
  demo = output<void>();

  readonly spark = 'M0,34 L12,30 L24,32 L36,24 L48,26 L60,18 L72,21 L84,11 L96,13 L110,4';
  readonly mix = 'conic-gradient(var(--color-accent) 0 58%, var(--color-blue-accent) 0 82%, var(--color-warning) 0 90%, var(--color-purple-accent) 0 96%, var(--color-text-muted) 0)';

  constructor() {
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return;
      const el = this.host.nativeElement;
      let raf = 0;

      const move = (e: PointerEvent) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const x = e.clientX - r.left;
          const y = e.clientY - r.top;
          el.style.setProperty('--mx', `${x}px`);
          el.style.setProperty('--my', `${y}px`);
          el.style.setProperty('--px', ((x / r.width) * 2 - 1).toFixed(3));
          el.style.setProperty('--py', ((y / r.height) * 2 - 1).toFixed(3));
        });
      };

      this.zone.runOutsideAngular(() => el.addEventListener('pointermove', move));
      this.destroyRef.onDestroy(() => {
        el.removeEventListener('pointermove', move);
        cancelAnimationFrame(raf);
      });
    });
  }
}
