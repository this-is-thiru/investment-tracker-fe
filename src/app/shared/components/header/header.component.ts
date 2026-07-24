import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideIconsModule } from '../../../core/icons/lucide-icons.module';
import { AuthService } from '../../../services/auth.service';
import { NotificationService, Notification } from '../../../services/notification.service';
import { NavItem } from '../../../models/Navitem';
import { map } from 'rxjs/operators';


@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, LucideIconsModule, RouterModule],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  // --- UI States ---
  isProfileDropdownOpen = false;
  isNotificationDropdownOpen = false;
  isMobileMenuOpen = false;

  // --- Auth state (signal) ---
  isAuthenticated = this.authService.isLoggedIn;


  // --- Nav Items ---
  navItems: NavItem[] = [
    { id: 'investment-tracking', label: 'Investment Tracking', route: 'investments-tracking' },
    { id: 'tax-filing', label: 'Tax Filing', route: 'tax-filing' },
    { id: 'portfolio-analytics', label: 'Portfolio Analytics', route: 'portfolio-analytics' },
  ];

  // --- Notifications ---
  notifications$ = this.notificationService.notifications$.pipe(
    map(list => list.slice(0, 5))
  );
  unreadCount$ = this.notificationService.unreadCount$;

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

  // --- Notification Actions ---
  markAllAsRead(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.markAllAsRead();
  }

  viewAllNotifications(): void {
    this.isNotificationDropdownOpen = false;
    this.router.navigate(['/notifications']);
  }

  onNotificationClick(notification: Notification): void {
    this.notificationService.markAsRead(notification.id);
    this.isNotificationDropdownOpen = false;
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
