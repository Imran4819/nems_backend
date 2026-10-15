export interface LoginRequest {
  username?: string; // email or phone
  email?: string;
  phone?: string;
  password?: string;
  client_id?: string;
}

export interface RegisterRequest {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
  password?: string;
  client_id?: string;
  role_id?: string;
  role_name?: string;
  gender?: 'Male' | 'Female' | 'Other';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: any;
  client?: any;
  role?: any;
}
