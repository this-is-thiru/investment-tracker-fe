import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from '@shared/components/notification-toast/toast-container.component';
import { ConfirmDialogComponent } from '@shared/ui/confirm-dialog/confirm-dialog.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, ConfirmDialogComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast-container></app-toast-container>
    <ui-confirm-dialog></ui-confirm-dialog>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent {
}
