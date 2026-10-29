import { Component, DestroyRef, ElementRef, NgZone, afterNextRender, inject, output, signal, viewChild, viewChildren } from '@angular/core';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { StoryStep } from '../../models/story-step.model';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Scrollytelling in plain words: the problem, what WealthLens does about it, and what is
 * coming next. The copy scrolls on one side while a pinned screen on the other plays the
 * matching scene, driven by how far the visitor has read into the active step.
 */
@Component({
  selector: 'app-feature-story',
  standalone: true,
  imports: [LucideIconsModule],
  templateUrl: './feature-story.component.html',
  styleUrls: ['./feature-story.component.css'],
})
export class FeatureStoryComponent {
  private zone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  private stepEls = viewChildren<ElementRef<HTMLElement>>('step');
  private screenWrap = viewChild.required<ElementRef<HTMLElement>>('screenWrap');

  navigate = output<string>();

  active = signal(0);
  progress = signal(0);

  readonly steps: StoryStep[] = [
    {
      eyebrow: 'The problem',
      icon: 'help-circle',
      title: 'Your money is scattered everywhere.',
      body: 'Shares in one app, mutual funds in another, FDs at the bank, and a spreadsheet you stopped updating months ago. Nobody shows you the full picture.',
      points: ['Where is all my money?', 'Am I really making a profit?', 'How much am I losing to fees?'],
      screen: 'Before WealthLens',
      color: 'var(--color-warning)',
      callout: { value: '5 → 1', label: 'places, now one screen' },
    },
    {
      eyebrow: 'One place',
      icon: 'pie-chart',
      title: 'See all of it on one screen.',
      body: 'Add your investments once. See what you own, what it is worth today and how fast it is growing.',
      points: ['Shares, mutual funds, gold, FDs and bonds', 'Today\'s value with live prices', 'Your real yearly return'],
      screen: 'My portfolio',
      color: 'var(--color-blue-accent)',
      callout: { value: '+22.9%', label: 'growth so far' },
      route: 'portfolio-analytics',
      cta: 'See the dashboard',
    },
    {
      eyebrow: 'Hidden costs',
      icon: 'receipt',
      title: 'Spot the fees in every trade.',
      body: 'Every buy and sell carries small charges: brokerage, government tax, stamp duty, exchange fees. They look tiny, but they add up. We show every rupee.',
      points: ['Fees for each trade', 'What you paid this year', 'The price you need to break even'],
      screen: 'Fees on one trade',
      color: 'var(--color-warning)',
      callout: { value: '₹89.93', label: 'fees on a ₹75,600 buy' },
      route: 'broker-charges',
      cta: 'Check your fees',
    },
    {
      eyebrow: 'Always correct',
      icon: 'gift',
      title: 'Bonus shares? Splits? Updated for you.',
      body: 'When a company gives free shares or splits its stock, your share count changes but your money does not. WealthLens adjusts it for you, so your numbers stay right.',
      points: ['Bonus shares', 'Stock splits', 'Dividends and more'],
      screen: 'HDFC Bank',
      color: 'var(--color-accent)',
      callout: { value: '×2', label: 'shares, same money' },
      route: 'investments-tracking',
      cta: 'Track your investments',
    },
    {
      eyebrow: 'Real profit',
      icon: 'trending-up',
      title: 'Know what you actually earned.',
      body: 'See your profit after fees, month by month. Gains are split into short-term and long-term, the way the tax department sees them, so filing is no guesswork.',
      points: ['Profit after fees', 'Short-term and long-term gains', 'Reports ready for tax time'],
      screen: 'This financial year',
      color: 'var(--color-accent)',
      callout: { value: '98%', label: 'of your profit you keep' },
      route: 'tax-filing',
      cta: 'Open tax reports',
    },
    {
      eyebrow: 'Coming soon',
      icon: 'rocket',
      title: 'And we are just getting started.',
      body: 'Investments come first. Next, WealthLens grows into one home for the rest of your money life.',
      points: ['Tax planner', 'Insurance', 'Loans & EMI', 'SIP goals'],
      screen: 'What we are building next',
      color: 'var(--color-purple-accent)',
      callout: { value: '4', label: 'new tools on the way' },
      soon: true,
    },
  ];

  /** Scattered across apps first, then gathered into one grid. x/y in px, r in degrees. */
  readonly tiles = [
    { icon: 'trending-up', name: 'Shares', where: 'Broker app', value: '₹13.10L', color: 'var(--color-accent)', x: -46, y: -38, r: -9 },
    { icon: 'pie-chart', name: 'Mutual funds', where: 'Another app', value: '₹5.40L', color: 'var(--color-blue-accent)', x: 52, y: -22, r: 8 },
    { icon: 'crown', name: 'Gold', where: 'Locker papers', value: '₹1.80L', color: 'var(--color-warning)', x: -30, y: 34, r: 6 },
    { icon: 'landmark', name: 'Fixed deposits', where: 'Bank', value: '₹1.40L', color: 'var(--color-purple-accent)', x: 40, y: 30, r: -7 },
    { icon: 'file-text', name: 'Bonds', where: 'Email PDFs', value: '₹0.91L', color: 'var(--color-text-secondary)', x: -54, y: 46, r: 11 },
  ];

  readonly fees = [
    { name: 'Brokerage', note: 'free on delivery', amount: 0, color: 'var(--color-accent)' },
    { name: 'Securities tax (STT)', note: 'paid to the government', amount: 76, color: 'var(--color-warning)' },
    { name: 'Stamp duty', note: 'on every buy', amount: 11, color: 'var(--color-purple-accent)' },
    { name: 'Exchange fee', note: 'NSE / BSE', amount: 2.32, color: 'var(--color-blue-accent)' },
    { name: 'GST and others', note: 'small, but real', amount: 0.61, color: 'var(--color-text-muted)' },
  ];
  readonly feeTotal = 89.93;

  readonly dots = Array.from({ length: 60 }, (_, i) => i);

  readonly months = ['A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M'];
  readonly gains = [34, 52, 18, 61, 44, 72, 28, 90, 56, 40, 66, 100];
  readonly charges = [6, 8, 4, 9, 7, 10, 5, 12, 8, 6, 9, 13];

  readonly allocation = [
    { label: 'Shares', pct: 58, color: 'var(--color-accent)' },
    { label: 'Mutual funds', pct: 24, color: 'var(--color-blue-accent)' },
    { label: 'Gold', pct: 8, color: 'var(--color-warning)' },
    { label: 'Fixed deposits', pct: 6, color: 'var(--color-purple-accent)' },
    { label: 'Bonds', pct: 4, color: 'var(--color-text-muted)' },
  ];
  readonly donut = `conic-gradient(${this.allocation
    .reduce<{ stops: string[]; at: number }>(
      (acc, a) => ({ stops: [...acc.stops, `${a.color} ${acc.at}% ${acc.at + a.pct}%`], at: acc.at + a.pct }),
      { stops: [], at: 0 },
    )
    .stops.join(', ')})`;

  readonly roadmap = [
    { icon: 'calculator', title: 'Tax planner', text: 'Old regime or new? We tell you which one saves more.' },
    { icon: 'heart-pulse', title: 'Insurance', text: 'Health, term, life and vehicle policies in one list.' },
    { icon: 'landmark', title: 'Loans & EMI', text: 'Know your EMI before you borrow.' },
    { icon: 'target', title: 'SIP goals', text: 'See how a growing monthly SIP builds your future.' },
  ];

  constructor() {
    afterNextRender(() => {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let ticking = false;

      const frame = () => {
        ticking = false;
        const els = this.stepEls().map(s => s.nativeElement);
        if (!els.length) return;

        // When stacked (phones), the pinned screen covers the top of the viewport and the copy
        // slides under it, so a step takes over as soon as its heading is in clear view below it
        const wrap = this.screenWrap().nativeElement.getBoundingClientRect();
        const stacked = wrap.left < els[0].getBoundingClientRect().right - 1;
        const covered = stacked ? Math.min(Math.max(wrap.bottom, 0), innerHeight * 0.7) : 0;
        const line = stacked ? covered + (innerHeight - covered) * 0.35 : innerHeight / 2;

        let best = 0;
        if (stacked) {
          els.forEach((el, i) => {
            if (el.getBoundingClientRect().top <= line) best = i;
          });
        } else {
          // The step nearest the middle of the viewport owns the screen
          let bestDist = Infinity;
          els.forEach((el, i) => {
            const r = el.getBoundingClientRect();
            const d = Math.abs(r.top + r.height / 2 - line);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          });
        }
        // 0 when the step's top reaches the reading line, 1 a little before the next step takes over
        const r = els[best].getBoundingClientRect();
        const p = reduced ? 1 : clamp((line - r.top) / (r.height * 0.85));
        const rounded = Math.round(p * 100) / 100;

        if (best !== this.active() || rounded !== this.progress()) {
          this.zone.run(() => {
            this.active.set(best);
            this.progress.set(rounded);
          });
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

  /** Progress through a scene: live for the active one, complete for those already passed */
  p(scene: number): number {
    const active = this.active();
    return scene === active ? this.progress() : scene < active ? 1 : 0;
  }

  at(scene: number, threshold: number): boolean {
    return this.p(scene) >= threshold;
  }

  ease(scene: number, from: number, to: number): number {
    return smooth(from, to, this.p(scene));
  }

  count(scene: number, value: number, from: number, decimals = 0): string {
    const v = value * smooth(from, Math.min(1, from + 0.35), this.p(scene));
    return v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  /** Gentle 3D sway of the pinned screen as the visitor reads through a step */
  tilt(): string {
    const t = this.progress() - 0.5;
    return `perspective(1600px) rotateY(${(-t * 10).toFixed(2)}deg) rotateX(${(t * 4).toFixed(2)}deg)`;
  }

  /** 30 shares before the bonus, 60 after */
  shares(): number {
    return 30 + Math.round(30 * this.ease(3, 0.3, 0.7));
  }
}
