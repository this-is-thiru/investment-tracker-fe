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
}
