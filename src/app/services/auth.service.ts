import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<User | null>(null);
  loading = signal<boolean>(true);

  constructor(private http: HttpClient) {
    this.loadUser();
  }

  loadUser() {
    this.loading.set(true);
    this.http.get<User>('/api/auth/user', { withCredentials: true }).subscribe({
      next: (user) => {
        this.user.set(user);
        this.loading.set(false);
      },
      error: () => {
        this.user.set(null);
        this.loading.set(false);
      }
    });
  }

  login() {
    window.location.href = '/api/login';
  }

  logout() {
    window.location.href = '/api/logout';
  }

  get isAuthenticated(): boolean {
    return this.user() !== null;
  }
}
