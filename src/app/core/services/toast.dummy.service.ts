import { Injectable } from '@angular/core';
import { Subject, timer } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage | null>();
  toast$ = this.toastSubject.asObservable();

  show(message: string, type: ToastType) {
    this.toastSubject.next({ message, type });

    // Auto-dismiss after 3000ms
    timer(3000).subscribe(() => {
      this.toastSubject.next(null);
    });
  }

  // Helper method to dismiss toast manually
  dismiss() {
    this.toastSubject.next(null);
  }
}