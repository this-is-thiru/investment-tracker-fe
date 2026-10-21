import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '@env/environment';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class LivePriceService {
  static readonly STORAGE_KEY = 'google_sheet_csv_url';

  private http = inject(HttpClient);
  private storageService = inject(StorageService);

  /**
   * Retrieves the current Google Sheets CSV URL from user settings (localStorage)
   * or falls back to the default URL configured in the environment.
   */
  getGoogleSheetUrl(): string {
    const userUrl = this.storageService.getItem(LivePriceService.STORAGE_KEY);
    if (userUrl && userUrl.trim().length > 0) {
      return userUrl.trim();
    }
    return environment.googleSheetCsvUrl || '';
  }

  /**
   * Persists the user-configured Google Sheets CSV URL.
   */
  saveGoogleSheetUrl(url: string): void {
    this.storageService.setItem(LivePriceService.STORAGE_KEY, url || '');
  }

  /**
   * Fetches the CSV from the Google Sheet and parses it into a Map of stockCode -> currentPrice.
   */
  fetchPrices(): Observable<Map<string, number>> {
    const url = this.getGoogleSheetUrl();
    if (!url) {
      // Return an empty map immediately if no URL is configured
      return of(new Map<string, number>());
    }

    // Bypass caching for all requests to ensure latest data is fetched instantly
    const cacheBuster = `cb=${new Date().getTime()}`;
    const finalUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;

    return this.http.get(finalUrl, { responseType: 'text' }).pipe(
      timeout(10000),
      map((csvText) => this.parseCsv(csvText)),
      catchError((error) => {
        console.warn('Failed to fetch live prices from Google Sheet, falling back to mock data:', error);
        // Return an empty map to trigger fallback downstream
        return of(new Map<string, number>());
      })
    );
  }

  /**
   * Parse CSV content and extract ticker symbol and price.
   */
  private parseCsv(csvText: string): Map<string, number> {
    const priceMap = new Map<string, number>();
    if (!csvText) return priceMap;

    // Google Sheets/Excel CSV exports commonly prepend a UTF-8 BOM, which would
    // otherwise corrupt the first header cell (e.g. "﻿Symbol") and break
    // header detection.
    if (csvText.charCodeAt(0) === 0xfeff) {
      csvText = csvText.slice(1);
    }

    const lines = csvText.split(/\r?\n/);
    if (lines.length === 0) return priceMap;

    let symbolIdx = -1;
    let priceIdx = -1;
    let headerChecked = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const cells = this.parseCsvLine(trimmedLine);
      if (cells.length < 2) continue;

      // Determine header columns
      if (!headerChecked) {
        headerChecked = true;
        // Check if first row is a header row
        const hasSymbolHeader = cells.some((cell) => {
          const l = cell.toLowerCase();
          return l === 'symbol' || l === 'ticker' || l === 'code' || l === 'stock';
        });
        const hasPriceHeader = cells.some((cell) => {
          const l = cell.toLowerCase();
          return l === 'price' || l === 'current price' || l === 'value' || l === 'close' || l === 'cmp';
        });

        if (hasSymbolHeader || hasPriceHeader) {
          symbolIdx = cells.findIndex((cell) => {
            const l = cell.toLowerCase();
            return l === 'symbol' || l === 'ticker' || l === 'code' || l === 'stock';
          });
          priceIdx = cells.findIndex((cell) => {
            const l = cell.toLowerCase();
            return l === 'price' || l === 'current price' || l === 'value' || l === 'close' || l === 'cmp';
          });
          // If symbol header was found but price wasn't, or vice-versa, default to index 0 and 1
          if (symbolIdx === -1) symbolIdx = 0;
          if (priceIdx === -1) priceIdx = 1;
          continue; // skip the header row
        } else {
          // No headers detected, assume column 0 is symbol and column 1 is price
          symbolIdx = 0;
          priceIdx = 1;
        }
      }

      // Extract symbol and price
      const symbol = cells[symbolIdx]?.toUpperCase() || '';
      const priceVal = parseFloat(cells[priceIdx]?.replace(/[^0-9.-]/g, '') || '');

      if (symbol && !isNaN(priceVal)) {
        priceMap.set(symbol, priceVal);
      }
    }

    return priceMap;
  }

  /**
   * Helper to split a CSV line correctly handling potential quotes.
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
}
