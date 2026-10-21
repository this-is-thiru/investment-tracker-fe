import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { BaseurlService } from '@services/baseurl.service';
import { CorporateActionDto, CorporateActionPerformDto } from '@models/corporate-action.model';

/**
 * Readable message from a failed request. Endpoints called with
 * `responseType: 'text'` hand back the error body as a raw string, which may
 * itself be a JSON `{ message }` payload.
 */
export function describeHttpError(err: any, fallback: string): string {
  let body = err?.error;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return body.trim() || fallback;
    }
  }
  const msg = body?.message || body?.error;
  if (typeof msg === 'string' && msg) return msg;
  // HttpErrorResponse.message is "Http failure response for <url>…", not for users
  return err?.name !== 'HttpErrorResponse' && err?.message ? err.message : fallback;
}

@Injectable({
  providedIn: 'root',
})
export class CorporateActionService {
  private http = inject(HttpClient);
  private BASE_URL = inject(BaseurlService);

  addCorporateAction(payload: any): Observable<string> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/add`;
    return this.http.post(url, payload, { responseType: 'text' });
  }

  getAllCorporateActions(): Observable<any[]> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/all`;
    return this.http.get<any[]>(url);
  }

  getCorporateActionById(id: string): Observable<any> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/${id}`;
    return this.http.get<any>(url);
  }

  getCorporateActions(ids: string[]): Observable<CorporateActionDto[]> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/list?ids=${encodeURIComponent(ids.join(','))}`;
    return this.http.get<CorporateActionDto[]>(url);
  }

  updateCorporateActionPriority(id: string, priority: number): Observable<string> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/update/priority/${id}/${priority}`;
    return this.http.put(url, {}, { responseType: 'text' });
  }

  performBatchCorporateActions(
    email: string,
    payload: CorporateActionPerformDto,
    allBrokers = false
  ): Observable<string> {
    if (email === 'demo@wealthlens.com') {
      return throwError(() => new HttpErrorResponse({
        status: 403,
        error: { message: 'Performing batch corporate actions is disabled in read-only guest session.' }
      }));
    }
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/user/${email}/perform?allBrokers=${allBrokers}`;
    return this.http.put(url, payload, { responseType: 'text' });
  }

  performCorporateAction(email: string, payload: any, allBrokers = false): Observable<any> {
    return this.performBatchCorporateActions(email, payload, allBrokers);
  }

  performSingleCorporateAction(payload: any): Observable<string> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/perform`;
    return this.http.put(url, payload, { responseType: 'text' });
  }

  anyCorporateActionToPerform(payload: any): Observable<boolean> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/perform/test`;
    return this.http.put<boolean>(url, payload);
  }

  deleteCorporateAction(id: string): Observable<string> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/delete/${id}`;
    return this.http.delete(url, { responseType: 'text' });
  }
}
