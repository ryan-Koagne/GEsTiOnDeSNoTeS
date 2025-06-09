import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  CanLoad,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Route,
  UrlSegment
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild, CanLoad {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Protection des routes - CanActivate
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(state.url);
  }

  /**
   * Protection des routes enfants - CanActivateChild
   */
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  /**
   * Protection du lazy loading - CanLoad
   */
  canLoad(
    route: Route,
    segments: UrlSegment[]
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth();
  }

  /**
   * Vérification de l'authentification
   */
  private checkAuth(url?: string): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          return true;
        } else {
          // Stocker l'URL de redirection pour après la connexion
          if (url) {
            sessionStorage.setItem('redirectUrl', url);
          }
          
          // Rediriger vers la page de connexion
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Protection des routes basée sur les rôles - CanActivate
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkRole(route, state.url);
  }

  /**
   * Protection des routes enfants basée sur les rôles - CanActivateChild
   */
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  /**
   * Vérification des rôles
   */
  private checkRole(
    route: ActivatedRouteSnapshot,
    url: string
  ): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          // Pas authentifié, rediriger vers login
          sessionStorage.setItem('redirectUrl', url);
          this.router.navigate(['/login']);
          return false;
        }

        // Récupérer les rôles autorisés depuis les données de la route
        const allowedRoles = route.data['roles'] as string[];
        const requiredRole = route.data['role'] as string;

        // Si aucun rôle spécifié, autoriser l'accès
        if (!allowedRoles && !requiredRole) {
          return true;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) {
          this.handleUnauthorized();
          return false;
        }

        let hasAccess = false;

        // Vérifier les rôles multiples
        if (allowedRoles && allowedRoles.length > 0) {
          hasAccess = this.authService.hasAnyRole(allowedRoles);
        }

        // Vérifier le rôle unique
        if (requiredRole) {
          hasAccess = this.authService.hasRole(requiredRole);
        }

        if (!hasAccess) {
          this.handleUnauthorized();
          return false;
        }

        return true;
      })
    );
  }

  /**
   * Gestion des accès non autorisés
   */
  private handleUnauthorized(): void {
    // Rediriger vers une page d'erreur ou le dashboard approprié
    const userRole = this.authService.getUserRole();
    
    switch (userRole) {
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
        this.router.navigate(['/unauthorized']);
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    return this.checkAdminRole(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  private checkAdminRole(url: string): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          sessionStorage.setItem('redirectUrl', url);
          this.router.navigate(['/login']);
          return false;
        }

        if (!this.authService.isAdmin()) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class TeacherGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    return this.checkTeacherRole(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  private checkTeacherRole(url: string): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          sessionStorage.setItem('redirectUrl', url);
          this.router.navigate(['/login']);
          return false;
        }

        // Autoriser les admins et les enseignants
        if (!this.authService.hasAnyRole(['admin', 'teacher'])) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class StudentGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    return this.checkStudentRole(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  private checkStudentRole(url: string): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          sessionStorage.setItem('redirectUrl', url);
          this.router.navigate(['/login']);
          return false;
        }

        // Autoriser les admins et les étudiants
        if (!this.authService.hasAnyRole(['admin', 'student'])) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Empêche l'accès à la page de login si déjà connecté
   */
  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          // Déjà connecté, rediriger vers le dashboard approprié
          this.redirectToDashboard();
          return false;
        }
        return true;
      })
    );
  }

  private redirectToDashboard(): void {
    const userRole = this.authService.getUserRole();
    
    switch (userRole) {
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
        this.router.navigate(['/dashboard']);
    }
  }
}

// Guard personnalisé pour vérifier l'accès aux données d'un étudiant spécifique
@Injectable({
  providedIn: 'root'
})
export class StudentDataGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const studentId = parseInt(route.params['id'] || route.params['studentId']);
    
    if (!studentId) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    // Vérifier si l'utilisateur peut accéder aux données de cet étudiant
    if (!this.authService.canAccessStudent(studentId)) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  }
}

// Export de tous les guards pour faciliter l'importation
export const AUTH_GUARDS = [
  AuthGuard,
  RoleGuard,
  AdminGuard,
  TeacherGuard,
  StudentGuard,
  LoginGuard,
  StudentDataGuard
];