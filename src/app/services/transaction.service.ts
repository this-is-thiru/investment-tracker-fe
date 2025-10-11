import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { BaseurlService } from './baseurl.service';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  constructor(private http: HttpClient, private BASE_URL: BaseurlService) { }

  // Fetch all transactions for a user
  getUserTransactions(email: string): Observable<any> {
    const url = `${this.BASE_URL.getBaseUrl()}/${email}/all/transactions`;
    return this.http.get(url).pipe(
      catchError((error) => {
        console.error('Error fetching transactions:', error);
        return throwError(() => new Error('Failed to fetch transactions'));
      })
    );
  }

  // Add a new transaction
  addTransaction(email: string, transactionData: any): Observable<any> {
    const url = `${this.BASE_URL.getBaseUrl()}/${email}/transaction`;
    return this.http.post(url, transactionData, { headers: { 'Content-Type': 'application/json' } }).pipe(
      catchError((error) => {
        console.error('Error adding transaction:', error);
        return throwError(() => new Error('Failed to add transaction'));
      })
    );
  }

  // Upload transactions file
  uploadTransactions(email: string, file: File): Observable<number> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(
      `${this.BASE_URL.getBaseUrl()}/portfolio/user/${email}/upload-transactions`,
      formData,
      { reportProgress: true, observe: 'events' }
    ).pipe(
      map(event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            return Math.round((100 * event.loaded) / (event.total ?? 1));
          case HttpEventType.Response:
            return 100;
          default:
            return 0;
        }
      })
    );
  }
}
