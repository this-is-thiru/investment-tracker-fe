import { Component, HostListener, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { DropdownItem } from '../../../models/DropdownItem';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-with-header-layout',
  standalone: true,
  templateUrl: './with-header-layout.component.html',
  styleUrls: ['./with-header-layout.component.css'],
  imports: [RouterOutlet,CommonModule, RouterModule, FormsModule],
})
export class WithHeaderLayoutComponent implements OnInit {
  isLoggedIn = this.authService.isLoggedIn;
  profileMenuOpen = false;
  showSignIn = false;
  showSignUp = false;

  dropdownItems: DropdownItem[] = [
    { label: 'Investments', link: '/investments-tracking', src: 'assets/imgs/menuInvestment.svg' },
    { label: 'Tax Filing', link: '/tax-filing', src: 'assets/imgs/menuTaxfiling.svg' },
    { label: 'Support', link: '/support', src: 'assets/imgs/menuSupport.svg' },
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {}

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  onLogout(): void {
    this.authService.logout();
    this.isLoggedIn.set(false);
    this.profileMenuOpen = false;
    this.router.navigate(['/home']);
  }

  onLogin(): void {
    this.showSignIn = true;
    this.router.navigate([{ outlets: { modal: ['sign-in'] } }]);
  }

  onSignUp(): void {
    this.showSignUp = true;
    this.router.navigate([{ outlets: { modal: ['sign-up'] } }]);
  }

  closeMenuAfterNavigation(): void {
    this.profileMenuOpen = false;
  }

  // Detect click outside
  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.relative');
    if (!clickedInside) {
      this.profileMenuOpen = false;
    }
  }
}
