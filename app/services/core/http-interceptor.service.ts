import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError, tap, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { LoadingService } from './loading.service';

@Injectable({
  providedIn: 'root'
})
export class HttpInterceptorService implements HttpInterceptor {

  constructor(
    private router: Router,
    private loadingService: LoadingService
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    
    // Afficher le loading pour les requêtes non-GET ou les requêtes importantes
    const shouldShowLoading = this.shouldShowLoading(request);
    if (shouldShowLoading) {
      this.loadingService.show();
    }

    // Cloner la requête pour ajouter les headers
    let modifiedRequest = request.clone();

    // Ajouter le token JWT si disponible
    const token = this.getAuthToken();
    if (token) {
      modifiedRequest = request.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Ajouter Content-Type même sans token
      modifiedRequest = request.clone({
        setHeaders: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Gérer les requêtes multipart/form-data (upload de fichiers)
    if (this.isFileUpload(request)) {
      // Pour les uploads, ne pas définir Content-Type (le navigateur le fait automatiquement)
      const headers = modifiedRequest.headers.delete('Content-Type');
      modifiedRequest = modifiedRequest.clone({ headers });
    }

    return next.handle(modifiedRequest).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          // Log des réponses réussies en mode développement
          if (!environment.production) {
            console.log('HTTP Response:', event);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleError(error);
      }),
      finalize(() => {
        // Masquer le loading à la fin de la requête
        if (shouldShowLoading) {
          this.loadingService.hide();
        }
      })
    );
  }

  private shouldShowLoading(request: HttpRequest<any>): boolean {
    // Ne pas afficher le loading pour :
    // - Les requêtes GET rapides (profil, dashboard léger)
    // - Les requêtes en arrière-plan
    const skipLoadingUrls = [
      '/api/auth/profile',
      '/api/dashboard/quick'
    ];

    const shouldSkip = skipLoadingUrls.some(url => 
      request.url.includes(url)
    );

    // Afficher le loading pour les POST, PUT, DELETE et les GET importants
    return !shouldSkip && (
      request.method !== 'GET' || 
      request.url.includes('/api/reports/') ||
      request.url.includes('/api/grades/import')
    );
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private isFileUpload(request: HttpRequest<any>): boolean {
    return request.body instanceof FormData;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur inconnue est survenue';
    
    console.error('HTTP Error:', error);

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 0:
          errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
          break;
        
        case 400:
          errorMessage = error.error?.error || 'Requête incorrecte';
          break;
        
        case 401:
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          this.handleUnauthorized();
          break;
        
        case 403:
          errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
          break;
        
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        
        case 422:
          // Erreurs de validation
          if (error.error?.errors) {
            const validationErrors = Object.values(error.error.errors).flat();
            errorMessage = validationErrors.join(', ');
          } else {
            errorMessage = error.error?.error || 'Données invalides';
          }
          break;
        
        case 429:
          errorMessage = 'Trop de requêtes. Veuillez patienter avant de réessayer.';
          break;
        
        case 500:
          errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
          break;
        
        case 502:
        case 503:
        case 504:
          errorMessage = 'Service temporairement indisponible. Veuillez réessayer plus tard.';
          break;
        
        default:
          errorMessage = error.error?.error || `Erreur HTTP ${error.status}`;
      }
    }

    // Afficher l'erreur via un service de notification (à implémenter)
    this.showErrorNotification(errorMessage);

    return throwError(() => ({
      message: errorMessage,
      status: error.status,
      originalError: error
    }));
  }

  private handleUnauthorized(): void {
    // Supprimer le token expiré
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
    }
    
    // Rediriger vers la page de connexion
    this.router.navigate(['/login'], {
      queryParams: { 
        returnUrl: this.router.url,
        reason: 'session_expired'
      }
    });
  }

  private showErrorNotification(message: string): void {
    // Ici vous pouvez intégrer un service de notification
    // Par exemple : this.notificationService.error(message);
    
    // En attendant, utiliser console.error
    console.error('API Error:', message);
    
    // Optionnel : afficher une alerte pour les erreurs critiques
    if (message.includes('serveur') || message.includes('connexion')) {
      // alert(message); // À remplacer par un service de notification plus élégant
    }
  }
}
import { environment } from '../../environments/environment';