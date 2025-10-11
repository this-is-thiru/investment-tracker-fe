import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FooterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {


  constructor(private auth: AuthService) { }
  router = inject(Router);


  onGetStarted() {
    if (this.auth.isUserAuthenticated()) {
      this.router.navigate(['/investments-tracking']);
    } else {
      this.router.navigate([{ outlets: { modal: ['sign-in'] } }]);

    }
  }
}
