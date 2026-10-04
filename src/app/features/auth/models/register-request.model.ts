import { UserRole } from '@core/enums';

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole | string;
}
