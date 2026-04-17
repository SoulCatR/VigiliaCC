export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'supervisor' | 'operator' | 'viewer';
  fullName: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}