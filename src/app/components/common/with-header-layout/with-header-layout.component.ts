import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';  // Import the AuthService to call the logout method
import { Router } from '@angular/router';

@Component({
  selector: 'app-with-header-layout',
  templateUrl: './with-header-layout.component.html',
  styleUrl: './with-header-layout.component.css'
})
export class WithHeaderLayoutComponent {
  isLoggedIn: boolean = false; // Tracks login status
  menuOpen = false; // Tracks the state of the hamburger menu

  constructor(private authService: AuthService, private router: Router) {
    this.checkLoginStatus(); // Initial login status check
  }

  /**
   * Checks login status based on token presence in localStorage
   */
  private checkLoginStatus(): void {
    const token = localStorage.getItem('jwtToken');
    this.isLoggedIn = token !== null && !this.isTokenExpired(token);
  }

  /**
   * Placeholder for token expiration check
   * @param token JWT token from localStorage
   * @returns boolean indicating if the token is expired
   */
  private isTokenExpired(token: string): boolean {
    // Add actual token validation logic (e.g., decode and check exp field)
    return false; // Assume valid for now
  }

  /**
   * Toggles the visibility of the hamburger menu
   */
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  /**
   * Logs the user out and redirects to the login page
   */
  onLogout(): void {
    this.authService.logout(); // Clear user session
    localStorage.removeItem('jwtToken'); // Clear token from localStorage
    this.isLoggedIn = false; // Update state
    this.menuOpen = false; // Close menu on logout
    this.router.navigate(['/auth']); // Redirect to login
  }

  /**
   * Placeholder for login action
   */
  onLogin(): void {
    this.isLoggedIn = true; // Update state
  }

  /**
   * Closes the menu after navigation
   */
  closeMenuAfterNavigation(): void {
    if (this.menuOpen) {
      this.menuOpen = false;
    }
  }
}



