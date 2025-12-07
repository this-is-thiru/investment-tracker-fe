import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Interface for type safety (exported for use in components)
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
  // BehaviorSubject holds the current list of notifications (the 'state')
  private _notifications = new BehaviorSubject<Notification[]>([]);
  
  // Public observable for components to subscribe to
  public notifications$ = this._notifications.asObservable();

  // Public observable for unread count (derived state)
  public unreadCount$ = this.notifications$.pipe(
    map(notifications => notifications.filter(n => !n.read).length)
  );

  constructor() { }

  /** Adds a new notification to the state. */
  addNotification(title: string, message: string, type: Notification['type']): void {
    const newNotification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      title,
      message,
      type,
      timestamp: new Date(),
      read: false,
    };
    
    // Update the state immutably: new notification first
    const currentNotifications = this._notifications.getValue();
    this._notifications.next([newNotification, ...currentNotifications]);
  }

  /** Marks a specific notification as read. */
  markAsRead(id: string): void {
    const updatedNotifications = this._notifications.getValue().map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    );
    this._notifications.next(updatedNotifications);
  }

  /** Marks all notifications as read. */
  markAllAsRead(): void {
    const updatedNotifications = this._notifications.getValue().map(notif => ({ ...notif, read: true }));
    this._notifications.next(updatedNotifications);
  }

  /** Clears a specific notification. */
  clearNotification(id: string): void {
    const updatedNotifications = this._notifications.getValue().filter(notif => notif.id !== id);
    this._notifications.next(updatedNotifications);
  }

  /** Clears all notifications. */
  clearAllNotifications(): void {
    this._notifications.next([]);
  }
}