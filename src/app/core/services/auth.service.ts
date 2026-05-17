import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponseDTO, LoginDTO } from '../models/auth.models';
import { UserDTO } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;

  private _currentUser = signal<UserDTO | null>(null);
  private _token = signal<string | null>(localStorage.getItem('access_token'));

  readonly currentUser = this._currentUser.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());
  readonly isProprietaire = computed(() => this._currentUser()?.role === 'ROLE_PROPRIETAIRE');
  readonly isLocataire = computed(() => this._currentUser()?.role === 'ROLE_LOCATAIRE');

  constructor(private http: HttpClient, private router: Router) {
    if (this._token()) {
      this.loadCurrentUser().subscribe({ error: () => this.clearSession() });
    }
  }

  login(dto: LoginDTO) {
    return this.http.post<AuthResponseDTO>(`${this.API}/auth/login`, dto, { withCredentials: true }).pipe(
      tap(res => this.setToken(res.accessToken)),
      switchMap(() => this.loadCurrentUser())
    );
  }

  register(formData: FormData) {
    return this.http.post<AuthResponseDTO>(`${this.API}/auth/register`, formData, { withCredentials: true }).pipe(
      tap(res => this.setToken(res.accessToken)),
      switchMap(() => this.loadCurrentUser())
    );
  }

  logout() {
    return this.http.post(`${this.API}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.clearSession())
    );
  }

  refreshToken() {
    return this.http.post<AuthResponseDTO>(`${this.API}/auth/refresh`, {}, { withCredentials: true }).pipe(
      tap(res => this.setToken(res.accessToken))
    );
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.API}/auth/forgot-password`, null, { params: { email }, responseType: 'text' });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post(`${this.API}/auth/reset-password`, null, { params: { token, newPassword }, responseType: 'text' });
  }

  loadCurrentUser() {
    return this.http.get<UserDTO>(`${this.API}/auth/me`).pipe(
      tap(user => this._currentUser.set(user))
    );
  }

  clearSession() {
    this._token.set(null);
    this._currentUser.set(null);
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }

  private setToken(token: string) {
    this._token.set(token);
    localStorage.setItem('access_token', token);
  }
}
