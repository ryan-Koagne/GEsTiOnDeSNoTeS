import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Notification[] = [];
  private notificationSubject = new Subject<Notification>();
  private removeNotificationSubject = new Subject<string>();

  // Observables pour les composants qui écoutent les notifications
  public notification$ = this.notificationSubject.asObservable();
  public removeNotification$ = this.removeNotificationSubject.asObservable();

  constructor() {}

  /**
   * Affiche une notification de succès
   */
  success(message: string, title?: string, options?: Partial<Notification>): void {
    this.show({
      type: 'success',
      message,
      title: title || 'Succès',
      ...options
    });
  }

  /**
   * Affiche une notification d'erreur
   */
  error(message: string, title?: string, options?: Partial<Notification>): void {
    this.show({
      type: 'error',
      message,
      title: title || 'Erreur',
      persistent: true, // Les erreurs sont persistantes par défaut
      ...options
    });
  }

  /**
   * Affiche une notification d'avertissement
   */
  warning(message: string, title?: string, options?: Partial<Notification>): void {
    this.show({
      type: 'warning',
      message,
      title: title || 'Attention',
      duration: 6000, // Plus long pour les warnings
      ...options
    });
  }

  /**
   * Affiche une notification d'information
   */
  info(message: string, title?: string, options?: Partial<Notification>): void {
    this.show({
      type: 'info',
      message,
      title: title || 'Information',
      ...options
    });
  }

  /**
   * Affiche une notification personnalisée
   */
  private show(notification: Partial<Notification>): void {
    const newNotification: Notification = {
      id: this.generateId(),
      type: 'info',
      message: '',
      duration: 4000,
      persistent: false,
      timestamp: new Date(),
      ...notification
    };

    this.notifications.push(newNotification);
    this.notificationSubject.next(newNotification);

    // Auto-suppression si ce n'est pas persistant
    if (!newNotification.persistent && newNotification.duration! > 0) {
      setTimeout(() => {
        this.remove(newNotification.id);
      }, newNotification.duration);
    }
  }

  /**
   * Supprime une notification
   */
  remove(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      this.notifications.splice(index, 1);
      this.removeNotificationSubject.next(id);
    }
  }

  /**
   * Supprime toutes les notifications
   */
  clear(): void {
    this.notifications.forEach(notification => {
      this.removeNotificationSubject.next(notification.id);
    });
    this.notifications = [];
  }

  /**
   * Récupère toutes les notifications actuelles
   */
  getAll(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Récupère une notification par son ID
   */
  getById(id: string): Notification | undefined {
    return this.notifications.find(n => n.id === id);
  }

  /**
   * Compte le nombre de notifications par type
   */
  getCount(type?: Notification['type']): number {
    if (type) {
      return this.notifications.filter(n => n.type === type).length;
    }
    return this.notifications.length;
  }

  /**
   * Vérifie s'il y a des notifications d'erreur
   */
  hasErrors(): boolean {
    return this.notifications.some(n => n.type === 'error');
  }

  /**
   * Notifications prédéfinies pour les opérations courantes
   */
  
  // Authentification
  loginSuccess(): void {
    this.success('Connexion réussie !', 'Bienvenue');
  }

  loginError(): void {
    this.error('Identifiants invalides', 'Échec de connexion');
  }

  sessionExpired(): void {
    this.warning('Votre session a expiré, veuillez vous reconnecter', 'Session expirée');
  }

  // Opérations CRUD
  createSuccess(entity: string): void {
    this.success(`${entity} créé(e) avec succès !`);
  }

  updateSuccess(entity: string): void {
    this.success(`${entity} mis(e) à jour avec succès !`);
  }

  deleteSuccess(entity: string): void {
    this.success(`${entity} supprimé(e) avec succès !`);
  }

  saveError(): void {
    this.error('Une erreur est survenue lors de la sauvegarde');
  }

  loadError(): void {
    this.error('Une erreur est survenue lors du chargement des données');
  }

  // Import/Export
  importSuccess(count: number): void {
    this.success(`${count} éléments importés avec succès !`, 'Import terminé');
  }

  importError(errors: string[]): void {
    const message = errors.length > 1 
      ? `${errors.length} erreurs détectées lors de l'import`
      : errors[0];
    this.error(message, 'Erreur d\'import');
  }

  exportSuccess(): void {
    this.success('Export terminé avec succès !');
  }

  // Validation
  validationError(message: string): void {
    this.warning(message, 'Validation');
  }

  // Réseau
  networkError(): void {
    this.error('Problème de connexion réseau', 'Erreur réseau');
  }

  serverError(): void {
    this.error('Erreur interne du serveur', 'Erreur serveur');
  }

  // Permissions
  accessDenied(): void {
    this.warning('Vous n\'avez pas les permissions nécessaires', 'Accès refusé');
  }

  /**
   * Génère un ID unique pour les notifications
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}