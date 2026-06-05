import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private _notifications = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this._notifications.asObservable();

  // For visual toasts
  private _toasts = new BehaviorSubject<Notification[]>([]);
  public toasts$ = this._toasts.asObservable();

  public unreadCount$ = this.notifications$.pipe(
    map(notifications => notifications.filter(n => !n.read).length)
  );

  constructor() { }

  addNotification(title: string, message: string, type: Notification['type']): void {
    const newNotification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      title,
      message,
      type,
      timestamp: new Date(),
      read: false,
    };
    
    // Add to history
    const currentNotifications = this._notifications.getValue();
    this._notifications.next([newNotification, ...currentNotifications]);

    // Add to active toasts
    const currentToasts = this._toasts.getValue();
    this._toasts.next([...currentToasts, newNotification]);
  }

  removeToast(id: string): void {
    const updatedToasts = this._toasts.getValue().filter(t => t.id !== id);
    this._toasts.next(updatedToasts);
  }

  markAsRead(id: string): void {
    const updatedNotifications = this._notifications.getValue().map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    );
    this._notifications.next(updatedNotifications);
  }

  markAllAsRead(): void {
    const updatedNotifications = this._notifications.getValue().map(notif => ({ ...notif, read: true }));
    this._notifications.next(updatedNotifications);
  }

  clearNotification(id: string): void {
    const updatedNotifications = this._notifications.getValue().filter(notif => notif.id !== id);
    this._notifications.next(updatedNotifications);
  }

  clearAllNotifications(): void {
    this._notifications.next([]);
  }
}