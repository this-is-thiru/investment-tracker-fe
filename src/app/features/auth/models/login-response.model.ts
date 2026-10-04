export interface LoginResponse {
  access_token: string;
  expires_in: number;
  tokenType: string;
  email?: string;
}

