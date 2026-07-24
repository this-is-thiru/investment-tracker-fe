import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StorageService } from './storage.service';

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
  private storageService = inject(StorageService);

  private _notifications = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this._notifications.asObservable();

  // For visual toasts
  private _toasts = new BehaviorSubject<Notification[]>([]);
  public toasts$ = this._toasts.asObservable();

  public unreadCount$ = this.notifications$.pipe(
    map(notifications => notifications.filter(n => !n.read).length)
  );

  private readonly STORAGE_KEY = 'notifications_list';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Loads notifications from local storage if available.
   * In a future API integration, this would call:
   * this.http.get<Notification[]>(`${this.apiUrl}/notifications`).subscribe(...)
   */
  private loadFromStorage(): void {
    const saved = this.storageService.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any[];
        const list = parsed.map(n => ({
          ...n,
          timestamp: new Date(n.timestamp), // convert ISO string back to Date
        }));
        this._notifications.next(list);
      } catch (e) {
        console.error('Failed to parse saved notifications:', e);
      }
    }
  }

  /**
   * Persists notifications to local storage.
   * In a future API integration, this could also push/sync updates to the backend:
   * this.http.post(`${this.apiUrl}/notifications/sync`, notifications).subscribe(...)
   */
  private saveToStorage(notifications: Notification[]): void {
    try {
      this.storageService.setItem(this.STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications to storage:', e);
    }
  }

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
    const updatedNotifications = [newNotification, ...currentNotifications];
    this._notifications.next(updatedNotifications);
    this.saveToStorage(updatedNotifications);

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
    this.saveToStorage(updatedNotifications);
    
    // Future API integration placeholder:
    // this.http.put(`${this.apiUrl}/notifications/${id}/read`, {}).subscribe();
  }

  markAllAsRead(): void {
    const updatedNotifications = this._notifications.getValue().map(notif => ({ ...notif, read: true }));
    this._notifications.next(updatedNotifications);
    this.saveToStorage(updatedNotifications);

    // Future API integration placeholder:
    // this.http.put(`${this.apiUrl}/notifications/read-all`, {}).subscribe();
  }

  clearNotification(id: string): void {
    const updatedNotifications = this._notifications.getValue().filter(notif => notif.id !== id);
    this._notifications.next(updatedNotifications);
    this.saveToStorage(updatedNotifications);

    // Future API integration placeholder:
    // this.http.delete(`${this.apiUrl}/notifications/${id}`).subscribe();
  }

  clearAllNotifications(): void {
    this._notifications.next([]);
    this.saveToStorage([]);

    // Future API integration placeholder:
    // this.http.delete(`${this.apiUrl}/notifications/all`).subscribe();
  }
}