// transaction.service.ts
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { BaseurlService } from './baseurl.service';
import { TransactionsResponse } from '../models/TranscationsResponse';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  constructor(
    private http: HttpClient,
    private BASE_URL: BaseurlService,
  ) {}

  // existing APIs left unchanged...
  getUserTransactions(email: string): Observable<any> {
    const url = `${this.BASE_URL.getBaseUrl()}/${email}/all/transactions`;
    return this.http.get(url).pipe(
      catchError((error) => {
        console.error('Error fetching transactions:', error);
        return throwError(() => new Error('Failed to fetch transactions'));
      }),
    );
  }

  addTransaction(email: string, transactionData: any): Observable<any> {
    const url = `${this.BASE_URL.getBaseUrl()}/${email}/transaction`;
    return this.http.post(url, transactionData).pipe(
      catchError((error) => {
        console.error('Error adding transaction:', error);
        return throwError(() => new Error('Failed to add transaction'));
      }),
    );
  }

  /**
   * Upload transactions file with progress events.
   * Returns Observable<HttpEvent<any>> so caller can react to progress and response.
   */
  // uploadTransactions(email: string, file: File): Observable<HttpEvent<any>> {

  //   const formData = new FormData();
  //   formData.append('file', file);

  //   const url = `${this.BASE_URL.getBaseUrl()}/portfolio/user/${email}/upload-transactions`;

  //   return this.http.post(url, formData, {
  //     responseType: 'text' as 'json',
  //     reportProgress: true,
  //     observe: 'events',
  //   }).pipe(
  //     tap({
  //       next: (event) => {
  //         // event handling is done in component; this tap just logs.
  //       },
  //       error: (err) => console.error('❌ [Service] upload error raw:', err),
  //     }),
  //     catchError((err) => {
  //       // rethrow original error so component can show meaningful message
  //       return throwError(() => err);
  //     })
  //   );
  // }

  // Download Excel template
  uploadTransactions(email: string, file: File): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.BASE_URL.getBaseUrl()}/portfolio/user/${email}/upload-transactions`;

    return this.http.post(url, formData, {
      responseType: 'text', // ALWAYS return plain text
      observe: 'events',
      reportProgress: true,
    });
  }

  downloadTemplate(): Observable<Blob> {
    const url = `${this.BASE_URL.getBaseUrl()}/helper/template`;
    return this.http.get(url, { responseType: 'blob' });
  }

  /** Fetch current transactions */
  getCurrentTransactions(email: string): Observable<TransactionsResponse[]> {
    const url = `${this.BASE_URL.getBaseUrl()}/transactions/user/${email}`;
    console.log('Token being sent:', localStorage.getItem('jwtToken'));
    return this.http.get<TransactionsResponse[]>(url);
  }

  /** Fetch temporary transactions */
  getTemporaryTransactions(email: string): Observable<TransactionsResponse[]> {
    const url = `${this.BASE_URL.getBaseUrl()}/temporary-transactions/user/${email}/all`;
    console.log('Token being sent:', localStorage.getItem('jwtToken'));
    return this.http.get<TransactionsResponse[]>(url);
  }
}
