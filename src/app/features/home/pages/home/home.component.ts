import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { AuthService } from '../../../../services/auth.service';
import { Benefit } from '../../../../models/Benefit';

// ✅ Import Lucide withIcons and all necessary icons
import {
  ArrowRightIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  LucideAngularModule,
  SparklesIcon,
  TrendingUpIcon,
  ZapIcon,
} from 'lucide-angular';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent, // 👇 CORRECT SETUP: Use withIcons to register the needed icons
    LucideAngularModule,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  //lucide icons
  readonly TrendingUpIcon = TrendingUpIcon;
  readonly FileTextIcon = FileTextIcon;
  readonly BarChart3Icon = BarChart3Icon;
  readonly ArrowRightIcon = ArrowRightIcon;
  readonly ClockIcon = ClockIcon;
  readonly CheckCircle2Icon = CheckCircle2Icon;
  readonly SparklesIcon = SparklesIcon;
  readonly ZapIcon = ZapIcon;

  hoveredCard: string | null = null;
  hoveredBenefit: number | null = null;
  isLoaded = false;

  benefits: Benefit[] = [
    {
      icon: 'zap',
      color: '#10A37F',
      title: 'Lightning Fast',
      desc: 'Process thousands of transactions in seconds with our optimized engine',
    },
    {
      icon: 'bar-chart-3',
      color: '#3B82F6',
      title: 'Comprehensive Reports',
      desc: 'Generate detailed reports for tax filing, compliance, and analysis',
    },
    {
      icon: 'clock',
      color: '#8B5CF6',
      title: 'Save Time',
      desc: 'Automate repetitive tasks and focus on what matters most',
    },
    {
      icon: 'check-circle-2',
      color: '#FACC15',
      title: 'Accuracy Guaranteed',
      desc: 'Eliminate errors with validated calculations and smart checks',
    },
  ];

  ngOnInit() {
    this.isLoaded = true;
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver() {
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('revealed');
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -100px 0px' },
      );

      setTimeout(() => {
        document
          .querySelectorAll('.scroll-reveal')
          .forEach((el) => observer.observe(el));
      }, 0);
    }
  }

  // ✅ Routing with Authentication Check
  onNavigate(route: string) {
    if (this.auth.isUserAuthenticated()) {
      this.router.navigate([`/${route}`]);
    } else {
      this.router.navigate([{ outlets: { modal: ['sign-in'] } }]);
    }
  }

  getBenefitStyle(benefit: Benefit, index: number): any {
    const isHovered = this.hoveredBenefit === index;
    return {
      backgroundColor: `${benefit.color}10`,
      border: `1px solid ${benefit.color}20`,
      boxShadow: isHovered
        ? `0 12px 32px ${benefit.color}40, 0 0 0 3px ${benefit.color}10`
        : 'none',
    };
  }

  // Hero Icon particle styles calculation (matching the original inline styles)
  getParticleStyle(i: number) {
    return {
      left: `${20 + i * 15}%`,
      top: `${30 + (i % 3) * 20}%`,
      'animation-delay': `${i * 0.3}s`,
      'animation-duration': `${3 + i * 0.5}s`
    };
  }
}
