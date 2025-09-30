import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {


  constructor(private router: Router, private auth: AuthService) { }


  onGetStarted() {
    if (this.auth.isUserAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/sign-in']);
    }
  }
}
