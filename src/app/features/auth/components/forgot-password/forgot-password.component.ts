import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AuthModalRoute } from '@core/enums';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, LucideIconsModule, ModalComponent, ButtonComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private router = inject(Router);

  onClose(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
  }

  goToSignIn(): void {
    this.router.navigate([{ outlets: { modal: [AuthModalRoute.SIGN_IN] } }]);
  }

  goToSignUp(): void {
    this.router.navigate([{ outlets: { modal: [AuthModalRoute.SIGN_UP] } }]);
  }
}
