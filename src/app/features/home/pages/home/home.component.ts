import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { AuthService } from '@services/auth.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ProductRevealComponent } from '../../components/product-reveal/product-reveal.component';
import { FeatureStoryComponent } from '../../components/feature-story/feature-story.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        CommonModule,
        FooterComponent,
        LucideIconsModule,
        ButtonComponent,
        ProductRevealComponent,
        FeatureStoryComponent,
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  isLoaded = false;

  readonly howSteps = [
    { icon: 'play-circle', color: 'var(--color-accent)', title: 'Try it or sign up', text: 'Open the demo in one click, or create your free account.' },
    { icon: 'upload', color: 'var(--color-blue-accent)', title: 'Add your investments', text: 'Upload the trade file from your broker, or type a trade in yourself.' },
    { icon: 'pie-chart', color: 'var(--color-purple-accent)', title: 'See the full picture', text: 'Your value, profit, fees and tax numbers, all worked out for you.' },
  ];

  readonly audiences = [
    { icon: 'user', color: 'var(--color-accent)', title: 'New investors', text: 'Understand what you own and what it costs, in plain words.' },
    { icon: 'briefcase', color: 'var(--color-blue-accent)', title: 'Busy professionals', text: 'Your whole portfolio in one glance. No spreadsheets to keep up.' },
    { icon: 'bar-chart-3', color: 'var(--color-warning)', title: 'Active traders', text: 'Every fee and every gain counted, ready for tax time.' },
    { icon: 'users', color: 'var(--color-purple-accent)', title: 'Families', text: 'Track the investments you look after for parents or a partner too.' },
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
      this.router.navigate([{ outlets: { modal: ['sign-in'] } }], { queryParams: { returnUrl: `/${route}` } });
    }
  }

  exploreDemo() {
    this.auth.loginAsDemo();
  }
}
