import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BaseurlService } from './baseurl.service';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {

  constructor(private http: HttpClient, private BASE_URL:BaseurlService) {}

  // Method to fetch user transactions by email
  getUserTransactions(email: string): Observable<any> {
    return this.http.get(`${this.BASE_URL.getBaseUrl()}/${email}/all/transactions`).pipe(
      catchError((error) => {
        console.error('Error fetching transactions:', error);
        return throwError(() => new Error('Failed to fetch transactions'));
      })
    );
  }

  // New method to add a transaction
  addTransaction(email: string, transactionData: any): Observable<any> {
    const url = `${this.BASE_URL}/${email}/transaction`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http.post(url, transactionData, { headers }).pipe(
      catchError((error) => {
        console.error('Error adding transaction:', error);
        return throwError(() => new Error('Failed to add transaction'));
      })
    );
  }
}
