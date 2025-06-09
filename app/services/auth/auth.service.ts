import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

// Interfaces
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  created_at: string;
  is_active: boolean;
  student_info?: StudentInfo;
  teacher_info?: TeacherInfo;
}

export interface StudentInfo {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  full_name: string;
  class_id: number;
  class_name: string;
  phone?: string;
  address?: string;
  birth_date?: string;
}

export interface TeacherInfo {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  address?: string;
  hire_date?: string;
  subjects: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl || 'http://localhost:5000/api';
  private readonly TOKEN_KEY = 'school_auth_token';
  private readonly USER_KEY = 'school_user_data';

  // BehaviorSubjects pour gérer l'état d'authentification
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());

  // Observables publics
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Vérifier le token au démarrage
    this.checkTokenValidity();
  }

  /**
   * Connexion utilisateur
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          // Stocker le token et les données utilisateur
          this.setToken(response.access_token);
          this.setUser(response.user);
          
          // Mettre à jour les subjects
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer le profil utilisateur depuis l'API
   */
  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/auth/profile`)
      .pipe(
        tap(user => {
          this.setUser(user);
          this.currentUserSubject.next(user);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Déconnexion
   */
  logout(): void {
    // Supprimer les données du localStorage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    // Mettre à jour les subjects
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Rediriger vers la page de connexion
    this.router.navigate(['/login']);
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return this.hasValidToken();
  }

  /**
   * Obtenir le token JWT
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Obtenir le rôle de l'utilisateur actuel
   */
  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }

  /**
   * Vérifier si l'utilisateur a un rôle spécifique
   */
  hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    return userRole === role;
  }

  /**
   * Vérifier si l'utilisateur a l'un des rôles spécifiés
   */
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }

  /**
   * Vérifier si l'utilisateur est admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Vérifier si l'utilisateur est enseignant
   */
  isTeacher(): boolean {
    return this.hasRole('teacher');
  }

  /**
   * Vérifier si l'utilisateur est étudiant
   */
  isStudent(): boolean {
    return this.hasRole('student');
  }

  /**
   * Actualiser le profil utilisateur
   */
  refreshProfile(): Observable<User> {
    return this.getProfile();
  }

  /**
   * Vérifier si le token est toujours valide
   */
  private checkTokenValidity(): void {
    const token = this.getToken();
    if (token) {
      // Décoder le JWT pour vérifier l'expiration
      try {
        const payload = this.decodeJWT(token);
        const currentTime = Date.now() / 1000;
        
        if (payload.exp && payload.exp < currentTime) {
          // Token expiré
          this.logout();
        }
      } catch (error) {
        // Token invalide
        this.logout();
      }
    }
  }

  /**
   * Décoder un token JWT
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Token JWT invalide');
    }
  }

  /**
   * Vérifier si un token valide existe
   */
  private hasValidToken(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = this.decodeJWT(token);
      const currentTime = Date.now() / 1000;
      return payload.exp && payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Stocker le token
   */
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Stocker les données utilisateur
   */
  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Récupérer les données utilisateur du localStorage
   */
  private getUserFromStorage(): User | null {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      if (error.status === 401) {
        errorMessage = 'Identifiants invalides';
      } else if (error.status === 403) {
        errorMessage = 'Accès non autorisé';
      } else if (error.status === 500) {
        errorMessage = 'Erreur serveur';
      } else if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else {
        errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }

    console.error('Erreur AuthService:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Obtenir les informations spécifiques à l'étudiant
   */
  getStudentInfo(): StudentInfo | null {
    const user = this.getCurrentUser();
    return user?.student_info || null;
  }

  /**
   * Obtenir les informations spécifiques à l'enseignant
   */
  getTeacherInfo(): TeacherInfo | null {
    const user = this.getCurrentUser();
    return user?.teacher_info || null;
  }

  /**
   * Vérifier si l'utilisateur actuel peut accéder à un étudiant spécifique
   */
  canAccessStudent(studentId: number): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Admin peut accéder à tous les étudiants
    if (user.role === 'admin') return true;

    // Étudiant ne peut accéder qu'à ses propres données
    if (user.role === 'student') {
      const studentInfo = this.getStudentInfo();
      return studentInfo?.id === studentId;
    }

    // Enseignant peut accéder aux étudiants de ses classes (à implémenter selon la logique métier)
    if (user.role === 'teacher') {
      // Cette logique dépend de votre modèle de données
      // Vous pourriez avoir besoin d'un service supplémentaire pour vérifier
      return true; // Temporaire
    }

    return false;
  }
}