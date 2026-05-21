import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, switchMap, tap, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponseDTO, CompleteGoogleProfileDTO, LoginDTO } from '../models/auth.models';
import { UserDTO } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;

  private _currentUser          = signal<UserDTO | null>(null);
  private _token                = signal<string | null>(localStorage.getItem('access_token'));
  private _pendingRoleSelection = signal(false);

  readonly currentUser          = this._currentUser.asReadonly();
  readonly token                = this._token.asReadonly();
  readonly pendingRoleSelection = this._pendingRoleSelection.asReadonly();
  readonly isLoggedIn           = computed(() => !!this._token());
  readonly isProprietaire       = computed(() => this._currentUser()?.role === 'ROLE_PROPRIETAIRE');
  readonly isLocataire          = computed(() => this._currentUser()?.role === 'ROLE_LOCATAIRE');

  // Guards wait on this before activating any route.
  // Becomes true once the initial /auth/me call resolves (success or failure).
  readonly sessionInitialized = signal(false);

  constructor(private http: HttpClient, private router: Router) {
    if (this._token()) {
      this.loadCurrentUser().pipe(
        timeout(8_000)
      ).subscribe({
        next:  () => this.sessionInitialized.set(true),
        error: () => {
          // If the token still exists here, the interceptor did NOT clear it
          // (it only clears on 401 + failed refresh). Any other failure (network
          // error, timeout) leaves an unusable token in localStorage — which
          // causes roleGuard to loop because isLoggedIn()=true but currentUser=null.
          // Clearing state here keeps the app in a consistent, non-crashing state.
          if (this._token()) {
            this._token.set(null);
            this._currentUser.set(null);
            localStorage.removeItem('access_token');
          }
          this.sessionInitialized.set(true);
        },
      });
    } else {
      this.sessionInitialized.set(true);
    }
  }

  login(dto: LoginDTO) {
    return this.http.post<AuthResponseDTO>(`${this.API}/auth/login`, dto, { withCredentials: true }).pipe(
      tap(res => this.setToken(res.accessToken)),
      switchMap(() => this.loadCurrentUser())
    );
  }

  loginWithGoogle(idToken: string) {
    return this.http.post<AuthResponseDTO>(`${this.API}/auth/google`, { idToken }, { withCredentials: true }).pipe(
      tap(res => this.setToken(res.accessToken)),
      switchMap(res => {
        if (res.requiresRoleSelection) {
          this._pendingRoleSelection.set(true);
          return of(res);
        }
        return this.loadCurrentUser().pipe(map(() => res));
      })
    );
  }

  completeGoogleProfile(role: CompleteGoogleProfileDTO['role']) {
    return this.http.patch<AuthResponseDTO>(`${this.API}/auth/complete-profile`, { role }, { withCredentials: true }).pipe(
      tap(res => {
        this.setToken(res.accessToken);
        this._pendingRoleSelection.set(false);
      }),
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
    this._pendingRoleSelection.set(false);
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }

  private setToken(token: string) {
    this._token.set(token);
    localStorage.setItem('access_token', token);
  }
}
