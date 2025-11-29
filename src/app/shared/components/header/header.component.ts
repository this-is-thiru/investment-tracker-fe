import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  TrendingUp,
  Bell,
  User,
  ChevronDown,
} from 'lucide-angular';
import { AuthService } from '../../../services/auth.service';
import { Notification } from '../../../models/Notification';
import { NavItem } from '../../../models/Navitem';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  // --- UI States ---
  isProfileDropdownOpen = false;
  isNotificationDropdownOpen = false;
  isMobileMenuOpen = false;

  // --- Auth state (signal) ---
  isAuthenticated = this.authService.isLoggedIn;

  // --- Lucide Icons ---
  readonly TrendingUp = TrendingUp;
  readonly Bell = Bell;
  readonly User = User;
  readonly ChevronDown = ChevronDown;

  // --- Nav Items ---
  navItems: NavItem[] = [
    { id: 'investment-tracking', label: 'Investment Tracking', route: 'investments-tracking' },
    { id: 'tax-filing', label: 'Tax Filing', route: 'tax-filing' },
    { id: 'portfolio-analytics', label: 'Portfolio Analytics', route: 'portfolio-analytics' },
  ];

  // --- Notifications ---
  notifications: Notification[] = [
    {
      id: 1,
      title: 'Transaction Uploaded',
      desc: '50 transactions processed successfully',
      time: '2m ago',
      unread: true,
    },
    {
      id: 2,
      title: 'Tax Report Ready',
      desc: 'Your 2024 tax report is ready to download',
      time: '1h ago',
      unread: true,
    },
    {
      id: 3,
      title: 'Portfolio Update',
      desc: 'Your portfolio gained 2.5% this week',
      time: '3h ago',
      unread: false,
    },
  ];

  // --- Auth-based navigation ---
  onNavigate(route: string): void {
    if (this.authService.isUserAuthenticated()) {
      this.router.navigate([`/${route}`]);
    } else {
      this.router.navigate([{ outlets: { modal: ['sign-in'] } }]);
    }
  }

  // --- Toggles ---
  toggleProfileDropdown(): void {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
    this.isNotificationDropdownOpen = false;
  }

  toggleNotificationDropdown(): void {
    this.isNotificationDropdownOpen = !this.isNotificationDropdownOpen;
    this.isProfileDropdownOpen = false;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.isNotificationDropdownOpen = false;
  }

  signOut(): void {
    this.authService.logOut();
    this.closeAllMenus();
  }

  closeAllMenus(): void {
    this.isProfileDropdownOpen = false;
    this.isMobileMenuOpen = false;
    this.isNotificationDropdownOpen = false;
  }

  // --- Click outside detection ---
  @HostListener('document:mousedown', ['$event'])
  onGlobalClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    const isInsideProfile = target.closest('.profile-toggle, .profile-dropdown');
    if (!isInsideProfile) this.isProfileDropdownOpen = false;

    const isInsideNotification = target.closest(
      '.notification-toggle, .desktop-notification-dropdown, .mobile-notification-dropdown'
    );
    if (!isInsideNotification) this.isNotificationDropdownOpen = false;

    const isInsideMobileMenu = target.closest('.mobile-menu-toggle, .mobile-menu-dropdown');
    if (!isInsideMobileMenu) this.isMobileMenuOpen = false;
  }
}
