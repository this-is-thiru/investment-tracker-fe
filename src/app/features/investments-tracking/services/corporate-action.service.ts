import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseurlService } from '../../../services/baseurl.service';

export interface CorporateActionPayload {
  actionType: string;
  stockCode: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class CorporateActionService {
  private http = inject(HttpClient);
  private BASE_URL = inject(BaseurlService);

  apply(email: string, payload: CorporateActionPayload): Observable<any> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-actions/user/${email}/apply`;
    return this.http.post(url, payload);
  }

  addCorporateAction(payload: any): Observable<any> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/add`;
    return this.http.post(url, payload);
  }

  getAllCorporateActions(): Observable<any[]> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/all`;
    return this.http.get<any[]>(url);
  }

  getCorporateActionById(id: string): Observable<any> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/${id}`;
    return this.http.get<any>(url);
  }

  performCorporateAction(email: string, payload: any): Observable<any> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/user/${email}/perform`;
    return this.http.put(url, payload);
  }

  deleteCorporateAction(id: string, payload: any): Observable<any> {
    const url = `${this.BASE_URL.getBaseUrl()}/corporate-action/delete/${id}`;
    return this.http.delete(url, { body: payload });
  }
}
