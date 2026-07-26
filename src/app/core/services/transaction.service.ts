import { Injectable, inject } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient, HttpEvent, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { BaseurlService } from './baseurl.service';
import { TransactionsResponse } from '@models/transactions-response.model';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private http = inject(HttpClient);
  private BASE_URL = inject(BaseurlService);

  private mockTempData(): any[] {
    return Array.from({ length: 3 }, (_, i) => ({
      id: i + 100,
      rowId: `temp-${i}`,
      email: 'demo@wealthlens.com',
      stockName: `Mock Temp Stock ${i + 1}`,
      stockCode: `MOCKT${i + 1}`,
      assetType: 'MUTUAL_FUND',
      exchangeName: 'NSE',
      brokerName: 'Groww',
      quantity: 5 * (i + 1),
      transactionType: 'BUY',
      price: 150 * (i + 1),
      totalValue: 150 * 5 * (i + 1) * (i + 1),
      transactionDate: '2023-09-10',
    }));
  }

  private mockPortfolioData(): any[] {
    return Array.from({ length: 19 }, (_, i) => ({
      id: i,
      rowId: `port-${i}`,
      email: 'demo@wealthlens.com',
      stockName: i % 2 === 0 ? 'QUANT SMALL CAP FUND - DIRECT' : 'SBI BLUECHIP FUND - DIRECT',
      stockCode: i % 2 === 0 ? 'QUANT_SMALL' : 'SBI_BLUE',
      assetType: 'MUTUAL_FUND',
      exchangeName: i % 3 === 0 ? 'BSE' : 'NSE',
      brokerName: i % 2 === 0 ? 'Zerodha' : 'Groww',
      quantity: 5 + i * 0.1,
      transactionType: i % 4 === 0 ? 'SELL' : 'BUY',
      price: 195.76,
      totalValue: 1000 + i * 100,
      brokerCharges: 5,
      miscCharges: 2,
      transactionDate: `2023-${String(((i % 12) + 1)).padStart(2, '0')}-15`,
    }));
  }

  private mockApiHoldingsData(): any[] {
    return [
      {
        stockCode: 'QUANT_SMALL',
        stockName: 'QUANT SMALL CAP FUND - DIRECT',
        assetType: 'MUTUAL_FUND',
        totalQuantity: 100,
        quantity: 80,
        totalValue: 15000,
        price: 150,
        brokerCharges: 20,
        miscCharges: 10,
      },
      {
        stockCode: 'SBI_BLUE',
        stockName: 'SBI BLUECHIP FUND - DIRECT',
        assetType: 'MUTUAL_FUND',
        totalQuantity: 150,
        quantity: 120,
        totalValue: 24000,
        price: 160,
        brokerCharges: 25,
        miscCharges: 15,
      }
    ];
  }

  // existing APIs left unchanged...
  getUserTransactions(email: string): Observable<any> {
    if (email === 'demo@wealthlens.com') {
      return of(this.mockPortfolioData());
    }
    const url = `${this.BASE_URL.getBaseUrl()}/${email}/all/transactions`;
    return this.http.get(url).pipe(
      catchError((error) => {
        console.error('Error fetching transactions:', error);
        return throwError(() => new Error('Failed to fetch transactions'));
      }),
    );
  }

  addTransaction(email: string, transactionData: any): Observable<any> {
    if (email === 'demo@wealthlens.com') {
      return throwError(() => new HttpErrorResponse({
        status: 403,
        error: { message: 'Adding transactions is disabled in read-only guest session.' }
      }));
    }
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

  uploadTransactions(email: string, file: File, quarter?: string): Observable<HttpEvent<any>> {
    if (email === 'demo@wealthlens.com') {
      return throwError(() => new HttpErrorResponse({
        status: 403,
        error: { message: 'File import is disabled in read-only guest session.' }
      }));
    }
    const formData = new FormData();
    formData.append('file', file);

    let url = `${this.BASE_URL.getBaseUrl()}/portfolio/user/${email}/upload-transactions`;
    if (quarter) {
      url += `?quarter=${quarter}`;
    }

    return this.http.post(url, formData, {
      observe: 'events',
      reportProgress: true,
    });
  }

  /**
   * Classify an upload error into a user-friendly { category, title, message }
   * triple. Handles both HTTP error responses (read from `err.status` /
   * `err.error.message`) and client-side validation errors (read from
   * `err.category`).
   */
  classifyUploadError(err: any): { category: string; title: string; message: string } {
    // Client-side validation categories: caller passes `{ category: 'no-file' }`
    // (or similar) and we return the fixed mapping.
    switch (err?.category) {
      case 'no-file':
        return {
          category: 'no-file',
          title: 'No file selected',
          message: 'Please choose an .xlsx or .xls file to upload.',
        };
      case 'bad-extension':
        return {
          category: 'bad-extension',
          title: 'Wrong file type',
          message: 'We accept .xlsx and .xls files.',
        };
      case 'too-large':
        return {
          category: 'too-large',
          title: 'File too large',
          message: 'Maximum size is 10 MB. Try splitting the file by quarter.',
        };
      case 'no-email':
        return {
          category: 'no-email',
          title: 'Please sign in',
          message: 'You need to be signed in to upload transactions.',
        };
    }

    const status: number = typeof err?.status === 'number' ? err.status : 0;
    const rawServerMessage: string | undefined =
      err?.error?.message || err?.error?.data || err?.message;

    // status 0 (or missing) → network vs unknown
    if (status === 0) {
      const msg = typeof err?.message === 'string' ? err.message : '';
      const lower = msg.toLowerCase();
      const looksNetwork =
        msg.includes('HttpErrorResponse') ||
        lower.includes('network') ||
        lower.includes('failed to fetch') ||
        lower.includes('cors');
      if (looksNetwork) {
        return {
          category: 'network',
          title: 'Connection problem',
          message: "We couldn't reach the server. Check your internet and try again.",
        };
      }
      return {
        category: 'unknown',
        title: 'Upload failed',
        message: rawServerMessage || 'Please try again.',
      };
    }

    switch (status) {
      case 401:
        return {
          category: 'unauthorized',
          title: 'Session expired',
          message: 'Please sign in again to continue.',
        };
      case 403:
        return {
          category: 'forbidden',
          title: 'Not allowed',
          message: "Your account doesn't have upload permission.",
        };
      case 404:
        return {
          category: 'not-found',
          title: 'Portfolio not found',
          message: "We couldn't find a portfolio for your account. Please contact support.",
        };
      case 413:
        return {
          category: 'payload-too-large',
          title: 'Server rejected file',
          message: 'The file is too large for our server. Please try a smaller file.',
        };
      case 415:
        return {
          category: 'unsupported-media',
          title: 'Unsupported file',
          message: "The server couldn't read this file. Make sure it's a valid .xlsx.",
        };
      case 400:
        return {
          category: 'bad-request',
          title: "Couldn't process file",
          message:
            rawServerMessage || 'Please check the file format and quarter, then try again.',
        };
      default:
        if (status >= 500) {
          return {
            category: 'server',
            title: 'Server error',
            message: 'Something went wrong on our side. Please try again in a moment.',
          };
        }
        return {
          category: 'unknown',
          title: 'Upload failed',
          message: rawServerMessage || 'Please try again.',
        };
    }
  }

  downloadTemplate(): Observable<Blob> {
    const url = `${this.BASE_URL.getBaseUrl()}/helper/template`;
    return this.http.get(url, { responseType: 'blob' });
  }

  /** Fetch current transactions */
  getCurrentTransactions(email: string, filters: any[] = []): Observable<TransactionsResponse[]> {
    if (email === 'demo@wealthlens.com') {
      return of(this.mockPortfolioData());
    }
    const url = `${this.BASE_URL.getBaseUrl()}/transactions/user/${email}`;
    console.log('Token being sent:', localStorage.getItem('jwtToken'));
    return this.http.post<TransactionsResponse[]>(url, { filters });
  }

  /** Fetch temporary transactions */
  getTemporaryTransactions(email: string): Observable<TransactionsResponse[]> {
    if (email === 'demo@wealthlens.com') {
      return of(this.mockTempData());
    }
    const url = `${this.BASE_URL.getBaseUrl()}/temporary-transactions/user/${email}/all`;
    console.log('Token being sent:', localStorage.getItem('jwtToken'));
    return this.http.get<TransactionsResponse[]>(url);
  }

  /** Fetch holdings */
  getAllHoldings(email: string): Observable<any> {
    if (email === 'demo@wealthlens.com') {
      return of(this.mockApiHoldingsData());
    }
    const url = `${this.BASE_URL.getBaseUrl()}/portfolio/user/${email}/stocks/all`;
    return this.http.get<any>(url);
  }

  /** Fetch transactions for a single stock */
  getTransactionsByStock(email: string, stockCode: string): Observable<TransactionsResponse[]> {
    if (email === 'demo@wealthlens.com') {
      const all = this.mockPortfolioData();
      return of(all.filter(t => t.stockCode === stockCode));
    }
    const url = `${this.BASE_URL.getBaseUrl()}/transactions/user/${email}`;
    const queryFilters = [
      {
        filterKey: 'stock_code',
        operation: 'EQUALS',
        value: stockCode,
        logicalOperation: 'AND',
        expressionLogicalOperation: 'AND',
        allowEmptyOrNull: false,
        caseSensitive: false,
        isDateField: false
      }
    ];
    return this.http.post<TransactionsResponse[]>(url, { queryFilters });
  }

  /** Clear all portfolio records for a user */
  clearAllRecords(email: string): Observable<any> {
    if (email === 'demo@wealthlens.com') {
      return throwError(() => new HttpErrorResponse({
        status: 403,
        error: { message: 'Clearing records is disabled in read-only guest session.' }
      }));
    }
    const url = `${this.BASE_URL.getBaseUrl()}/portfolio/user/${email}/clear/all`;
    return this.http.post(url, {});
  }
}
