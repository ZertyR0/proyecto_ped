import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = environment.apiBase;
  private tokenKey = 'auth_token';
  isLoggedIn$ = new BehaviorSubject<boolean>(!!this.getToken());

  login(username: string, password: string) {
    return this.http.post<{ token: string }>(`${this.base}/token/`, { username, password }).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem(this.tokenKey, res.token);
          this.isLoggedIn$.next(true);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.isLoggedIn$.next(false);
  }

  getToken(): string | null { return localStorage.getItem(this.tokenKey); }
}
