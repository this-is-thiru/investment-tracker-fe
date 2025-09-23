import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-with-header-layout',
  templateUrl: './with-header-layout.component.html',
  styleUrls: ['./with-header-layout.component.css']
})
export class WithHeaderLayoutComponent implements OnInit {
  isLoggedIn: boolean = false;
  profileMenuOpen = false;
  dropdownOpen: any;
  showSignIn = false;


  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.checkLoginStatus(); // Safe to access browser APIs here
  }
  closePopup(event: Event) {
    this.showSignIn = false;
  }

  dropdownItems = [
    { label: 'Investments', link: '/dashboard', Src: '../../../../assets/imgs/menuInvestment.svg' },
    { label: 'Tax Filing', link: '/tax', Src: '../../../../assets/imgs/menuTaxfiling.svg' },
    { label: 'Support', link: '/support', Src: '../../../../assets/imgs/menuSupport.svg' },
  ];

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  private checkLoginStatus(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwtToken');
      this.isLoggedIn = token !== null && !this.isTokenExpired(token);
    }
  }

  private isTokenExpired(token: string): boolean {
    // Replace with real expiration logic
    return false;
  }


  onLogout(): void {
    this.authService.logout();
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('jwtToken');
    }
    this.isLoggedIn = false;
    this.profileMenuOpen = false;
    this.router.navigate(['/home']);
  }

  onLogin(): void {
    this.isLoggedIn = true;
    this.router.navigate(['/sign-in']);
  }

  closeMenuAfterNavigation(): void {
    if (this.profileMenuOpen) {
      this.profileMenuOpen = false;
    }
  }

  onSignUp(): void {
    this.showSignIn = true;
    this.router.navigate(['/sign-up']);
  }
}
