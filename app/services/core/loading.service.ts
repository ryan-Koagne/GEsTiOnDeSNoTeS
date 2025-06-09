// src/app/services/core/loading.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadingCounter = 0;

  // Observable pour que les composants puissent s'abonner
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor() {}

  /**
   * Affiche l'indicateur de chargement
   */
  show(): void {
    this.loadingCounter++;
    if (this.loadingCounter === 1) {
      this.loadingSubject.next(true);
    }
  }

  /**
   * Masque l'indicateur de chargement
   */
  hide(): void {
    if (this.loadingCounter > 0) {
      this.loadingCounter--;
    }
    
    if (this.loadingCounter === 0) {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Force l'arrêt du loading (en cas d'erreur critique)
   */
  forceHide(): void {
    this.loadingCounter = 0;
    this.loadingSubject.next(false);
  }

  /**
   * Retourne l'état actuel du loading
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Utilitaire pour exécuter une fonction avec loading automatique
   * @param fn - Fonction à exécuter (doit retourner un Observable)
   * @param showLoading - Si true, affiche le loading pendant l'exécution
   */
  withLoading<T>(
    fn: () => Observable<T>, 
    showLoading: boolean = true
  ): Observable<T> {
    if (showLoading) {
      this.show();
    }

    return new Observable<T>(observer => {
      const subscription = fn().subscribe({
        next: (value) => observer.next(value),
        error: (error) => {
          if (showLoading) {
            this.hide();
          }
          observer.error(error);
        },
        complete: () => {
          if (showLoading) {
            this.hide();
          }
          observer.complete();
        }
      });

      // Nettoyage lors de la désinscription
      return () => {
        subscription.unsubscribe();
        if (showLoading) {
          this.hide();
        }
      };
    });
  }

  /**
   * Utilitaire pour exécuter une Promise avec loading automatique
   * @param fn - Fonction à exécuter (doit retourner une Promise)
   * @param showLoading - Si true, affiche le loading pendant l'exécution
   */
  async withLoadingAsync<T>(
    fn: () => Promise<T>, 
    showLoading: boolean = true
  ): Promise<T> {
    if (showLoading) {
      this.show();
    }

    try {
      const result = await fn();
      return result;
    } finally {
      if (showLoading) {
        this.hide();
      }
    }
  }

  /**
   * Réinitialise complètement le service loading
   * Utile lors de la déconnexion ou changement d'utilisateur
   */
  reset(): void {
    this.loadingCounter = 0;
    this.loadingSubject.next(false);
  }

  /**
   * Retourne le nombre de requêtes en cours
   * Utile pour le debugging
   */
  getLoadingCount(): number {
    return this.loadingCounter;
  }
}

// Exemple d'utilisation dans un composant :
/*
export class ExampleComponent implements OnInit, OnDestroy {
  isLoading$ = this.loadingService.loading$;

  constructor(private loadingService: LoadingService) {}

  // Méthode 1 : Gestion manuelle
  async saveData() {
    this.loadingService.show();
    try {
      await this.apiService.saveData();
    } finally {
      this.loadingService.hide();
    }
  }

  // Méthode 2 : Avec utilitaire
  saveDataWithUtility() {
    return this.loadingService.withLoading(
      () => this.apiService.saveData()
    ).subscribe({
      next: (result) => console.log('Succès:', result),
      error: (error) => console.error('Erreur:', error)
    });
  }

  // Dans le template :
  // <div *ngIf="isLoading$ | async" class="loading-spinner">
  //   Chargement...
  // </div>
}
*/