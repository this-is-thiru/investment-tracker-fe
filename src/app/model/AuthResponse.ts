export interface AuthResponse {
  email: string;
  token: string;
  expiresIn: string;
  refreshToken: string;
  localId: string;
  registered?: boolean;
}
