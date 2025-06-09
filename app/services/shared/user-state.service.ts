import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

// Interfaces basées sur votre backend Flask
 interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  created_at: string;
  is_active: boolean;
  student_info?: StudentInfo;
  teacher_info?: TeacherInfo;
}

interface StudentInfo {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  full_name: string;
  class_id: number;
  class_name?: string;
  phone?: string;
  address?: string;
  birth_date?: string;
}

 interface TeacherInfo {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  address?: string;
  hire_date?: string;
  subjects: Subject[];
}

 interface Subject {
  id: number;
  name: string;
  code: string;
  coefficient: number;
  description?: string;
  teacher_count: number;
}

 interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
  dashboardLayout: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private readonly STORAGE_KEYS = {
    USER: 'current_user',
    TOKEN: 'access_token',
    PREFERENCES: 'user_preferences',
    LAST_ACTIVITY: 'last_activity'
  };

  // Subjects pour la gestion d'état réactive
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  private userPreferencesSubject = new BehaviorSubject<UserPreferences>(this.getDefaultPreferences());

  // Observables publics
  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  public userPreferences$ = this.userPreferencesSubject.asObservable();

  constructor(private router: Router) {
    this.initializeUserState();
  }

  /**
   * Initialiser l'état utilisateur au démarrage de l'application
   */
  private initializeUserState(): void {
    const storedUser = this.getStoredUser();
    const token = this.getStoredToken();

    if (storedUser && token) {
      this.setCurrentUser(storedUser);
      this.updateLastActivity();
    }

    // Charger les préférences utilisateur
    this.loadUserPreferences();
  }

  /**
   * Définir l'utilisateur courant
   */
  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    this.isLoggedInSubject.next(true);
    
    // Stocker dans localStorage
    localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));
    this.updateLastActivity();
  }

  /**
   * Obtenir l'utilisateur courant
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  /**
   * Obtenir le rôle de l'utilisateur courant
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
   * Vérifier si l'utilisateur est un administrateur
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Vérifier si l'utilisateur est un enseignant
   */
  isTeacher(): boolean {
    return this.hasRole('teacher');
  }

  /**
   * Vérifier si l'utilisateur est un étudiant
   */
  isStudent(): boolean {
    return this.hasRole('student');
  }

  /**
   * Obtenir les informations de l'étudiant (si applicable)
   */
  getStudentInfo(): StudentInfo | null {
    const user = this.getCurrentUser();
    return user?.student_info || null;
  }

  /**
   * Obtenir les informations de l'enseignant (si applicable)
   */
  getTeacherInfo(): TeacherInfo | null {
    const user = this.getCurrentUser();
    return user?.teacher_info || null;
  }

  /**
   * Mettre à jour les informations utilisateur
   */
  updateCurrentUser(updatedUser: Partial<User>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const newUser = { ...currentUser, ...updatedUser };
      this.setCurrentUser(newUser);
    }
  }

  /**
   * Mettre à jour les informations de profil étudiant
   */
  updateStudentInfo(studentInfo: Partial<StudentInfo>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.student_info) {
      const updatedUser = {
        ...currentUser,
        student_info: { ...currentUser.student_info, ...studentInfo }
      };
      this.setCurrentUser(updatedUser);
    }
  }

  /**
   * Mettre à jour les informations de profil enseignant
   */
  updateTeacherInfo(teacherInfo: Partial<TeacherInfo>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.teacher_info) {
      const updatedUser = {
        ...currentUser,
        teacher_info: { ...currentUser.teacher_info, ...teacherInfo }
      };
      this.setCurrentUser(updatedUser);
    }
  }

  /**
   * Stocker le token d'authentification
   */
  setToken(token: string): void {
    localStorage.setItem(this.STORAGE_KEYS.TOKEN, token);
  }

  /**
   * Obtenir le token d'authentification
   */
  getToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEYS.TOKEN);
  }

  /**
   * Déconnexion de l'utilisateur
   */
  logout(): void {
    this.clearUserData();
    this.router.navigate(['/login']);
  }

  /**
   * Effacer toutes les données utilisateur
   */
  clearUserData(): void {
    // Vider les subjects
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
    
    // Vider le localStorage
    localStorage.removeItem(this.STORAGE_KEYS.USER);
    localStorage.removeItem(this.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.LAST_ACTIVITY);
  }

  /**
   * Gestion des préférences utilisateur
   */
  getUserPreferences(): UserPreferences {
    return this.userPreferencesSubject.value;
  }

  /**
   * Mettre à jour les préférences utilisateur
   */
  updateUserPreferences(preferences: Partial<UserPreferences>): void {
    const currentPrefs = this.getUserPreferences();
    const newPrefs = { ...currentPrefs, ...preferences };
    
    this.userPreferencesSubject.next(newPrefs);
    localStorage.setItem(this.STORAGE_KEYS.PREFERENCES, JSON.stringify(newPrefs));
  }

  /**
   * Charger les préférences depuis le stockage
   */
  private loadUserPreferences(): void {
    const stored = localStorage.getItem(this.STORAGE_KEYS.PREFERENCES);
    if (stored) {
      try {
        const preferences = JSON.parse(stored);
        this.userPreferencesSubject.next({ ...this.getDefaultPreferences(), ...preferences });
      } catch (error) {
        console.warn('Erreur lors du chargement des préférences utilisateur:', error);
      }
    }
  }

  /**
   * Obtenir les préférences par défaut
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      language: 'fr',
      notifications: true,
      dashboardLayout: 'default'
    };
  }

  /**
   * Obtenir l'utilisateur stocké
   */
  private getStoredUser(): User | null {
    const stored = localStorage.getItem(this.STORAGE_KEYS.USER);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('Erreur lors du parsing de l\'utilisateur stocké:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Obtenir le token stocké
   */
  private getStoredToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEYS.TOKEN);
  }

  /**
   * Mettre à jour la dernière activité
   */
  private updateLastActivity(): void {
    const now = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVITY, now);
  }

  /**
   * Obtenir la dernière activité
   */
  getLastActivity(): Date | null {
    const stored = localStorage.getItem(this.STORAGE_KEYS.LAST_ACTIVITY);
    return stored ? new Date(stored) : null;
  }

  /**
   * Vérifier si la session a expiré (basé sur la dernière activité)
   */
  isSessionExpired(maxIdleTimeMinutes: number = 60): boolean {
    const lastActivity = this.getLastActivity();
    if (!lastActivity) return true;

    const now = new Date();
    const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    
    return diffMinutes > maxIdleTimeMinutes;
  }

  /**
   * Obtenir le nom d'affichage de l'utilisateur
   */
  getDisplayName(): string {
    const user = this.getCurrentUser();
    if (!user) return '';

    if (user.student_info) {
      return user.student_info.full_name;
    } else if (user.teacher_info) {
      return user.teacher_info.full_name;
    } else {
      return user.username;
    }
  }

  /**
   * Obtenir les initiales de l'utilisateur
   */
  getUserInitials(): string {
    const displayName = this.getDisplayName();
    if (!displayName) return '';

    const names = displayName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    } else {
      return displayName.substring(0, 2).toUpperCase();
    }
  }

  /**
   * Rediriger vers le dashboard approprié selon le rôle
   */
  redirectToDashboard(): void {
    const role = this.getUserRole();
    switch (role) {
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'teacher':
        this.router.navigate(['/teacher/dashboard']);
        break;
      case 'student':
        this.router.navigate(['/student/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  /**
   * Vérifier les permissions pour une action spécifique
   */
  hasPermission(action: string, resource?: string): boolean {
    const role = this.getUserRole();
    
    // Définir les permissions selon les rôles
    const permissions = {
      admin: ['*'], // Admin a tous les droits
      teacher: ['read:students', 'write:grades', 'read:grades', 'read:classes', 'read:subjects'],
      student: ['read:own_grades', 'read:own_profile']
    };

    if (!role || !permissions[role as keyof typeof permissions]) {
      return false;
    }

    const userPermissions = permissions[role as keyof typeof permissions];
    
    // Admin a tous les droits
    if (userPermissions.includes('*')) {
      return true;
    }

    // Vérifier les permissions spécifiques
    const fullPermission = resource ? `${action}:${resource}` : action;
    return userPermissions.includes(fullPermission) || userPermissions.includes(action);
  }
}