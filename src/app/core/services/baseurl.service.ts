import { environment } from '@env/environment';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BaseurlService {
  constructor() {}

  getBaseUrl() {
    return environment.apiUrl;
  }
}
