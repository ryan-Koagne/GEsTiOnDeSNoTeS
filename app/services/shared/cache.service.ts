import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry?: number; // Durée de vie en millisecondes
  key: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live en millisecondes (par défaut: 5 minutes)
  forceRefresh?: boolean;
  persistent?: boolean; // Non utilisé (localStorage non supporté)
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes par défaut
  private cacheSubjects = new Map<string, BehaviorSubject<any>>();

  constructor() {
    // Nettoyage périodique du cache (toutes les 10 minutes)
    setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }

  /**
   * Récupère une valeur du cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Vérifier l'expiration
    if (this.isExpired(item)) {
      this.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Stocke une valeur dans le cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const expiry = ttl > 0 ? Date.now() + ttl : undefined;

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry,
      key
    };

    this.cache.set(key, item);

    // Notifier les observateurs
    if (this.cacheSubjects.has(key)) {
      this.cacheSubjects.get(key)!.next(data);
    }
  }

  /**
   * Vérifie si une clé existe dans le cache et n'est pas expirée
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (this.isExpired(item)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    // Notifier les observateurs de la suppression
    if (deleted && this.cacheSubjects.has(key)) {
      this.cacheSubjects.get(key)!.next(null);
    }

    return deleted;
  }

  /**
   * Vide complètement le cache
   */
  clear(): void {
    this.cache.clear();
    
    // Notifier tous les observateurs
    this.cacheSubjects.forEach(subject => {
      subject.next(null);
    });
  }

  /**
   * Récupère la taille du cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Récupère toutes les clés du cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Récupère des informations sur une entrée du cache
   */
  getInfo(key: string): { exists: boolean; age?: number; ttl?: number; size?: number } {
    const item = this.cache.get(key);
    
    if (!item) {
      return { exists: false };
    }

    const age = Date.now() - item.timestamp;
    const ttl = item.expiry ? item.expiry - Date.now() : undefined;
    const size = this.estimateSize(item.data);

    return {
      exists: true,
      age,
      ttl,
      size
    };
  }

  /**
   * Mise en cache avec Observable
   * Permet de mettre en cache le résultat d'un Observable
   */
  cacheObservable<T>(
    key: string,
    observable: Observable<T>,
    options: CacheOptions = {}
  ): Observable<T> {
    // Si forceRefresh est true, on supprime l'entrée existante
    if (options.forceRefresh) {
      this.delete(key);
    }

    // Vérifier si on a déjà la donnée en cache
    const cachedData = this.get<T>(key);
    if (cachedData !== null) {
      return of(cachedData);
    }

    // Exécuter l'observable et mettre en cache le résultat
    return observable.pipe(
      tap(data => {
        this.set(key, data, options);
      })
    );
  }

  /**
   * Crée un Observable qui émet la valeur cachée et ses mises à jour
   */
  watch<T>(key: string): Observable<T | null> {
    if (!this.cacheSubjects.has(key)) {
      const currentValue = this.get<T>(key);
      this.cacheSubjects.set(key, new BehaviorSubject<T | null>(currentValue));
    }

    return this.cacheSubjects.get(key)!.asObservable();
  }

  /**
   * Met à jour une valeur existante dans le cache
   */
  update<T>(key: string, updater: (current: T | null) => T, options: CacheOptions = {}): void {
    const current = this.get<T>(key);
    const updated = updater(current);
    this.set(key, updated, options);
  }

  /**
   * Récupère plusieurs valeurs du cache
   */
  getMultiple<T>(keys: string[]): { [key: string]: T | null } {
    const result: { [key: string]: T | null } = {};
    
    keys.forEach(key => {
      result[key] = this.get<T>(key);
    });

    return result;
  }

  /**
   * Définit plusieurs valeurs dans le cache
   */
  setMultiple<T>(items: { [key: string]: T }, options: CacheOptions = {}): void {
    Object.entries(items).forEach(([key, value]) => {
      this.set(key, value, options);
    });
  }

  /**
   * Supprime plusieurs entrées du cache
   */
  deleteMultiple(keys: string[]): number {
    let deletedCount = 0;
    
    keys.forEach(key => {
      if (this.delete(key)) {
        deletedCount++;
      }
    });

    return deletedCount;
  }

  /**
   * Supprime les entrées expirées du cache
   */
  cleanup(): number {
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Statistiques du cache
   */
  getStats(): {
    size: number;
    keys: string[];
    totalMemoryUsage: number;
    expiredCount: number;
    hitRate?: number;
  } {
    let totalSize = 0;
    let expiredCount = 0;

    for (const item of this.cache.values()) {
      totalSize += this.estimateSize(item.data);
      if (this.isExpired(item)) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      keys: this.keys(),
      totalMemoryUsage: totalSize,
      expiredCount
    };
  }

  /**
   * Méthodes utilitaires pour des types de données spécifiques
   */

  // Cache pour les listes d'entités
  cacheEntityList<T>(entityType: string, data: T[], options: CacheOptions = {}): void {
    this.set(`${entityType}_list`, data, { ttl: 2 * 60 * 1000, ...options }); // 2 minutes par défaut
  }

  getEntityList<T>(entityType: string): T[] | null {
    return this.get<T[]>(`${entityType}_list`);
  }

  // Cache pour une entité spécifique
  cacheEntity<T>(entityType: string, id: string | number, data: T, options: CacheOptions = {}): void {
    this.set(`${entityType}_${id}`, data, { ttl: 10 * 60 * 1000, ...options }); // 10 minutes par défaut
  }

  getEntity<T>(entityType: string, id: string | number): T | null {
    return this.get<T>(`${entityType}_${id}`);
  }

  // Cache pour les données utilisateur
  cacheUserData<T>(userId: string | number, dataType: string, data: T, options: CacheOptions = {}): void {
    this.set(`user_${userId}_${dataType}`, data, { ttl: 15 * 60 * 1000, ...options }); // 15 minutes
  }

  getUserData<T>(userId: string | number, dataType: string): T | null {
    return this.get<T>(`user_${userId}_${dataType}`);
  }

  // Nettoyage par préfixe
  clearByPrefix(prefix: string): number {
    let deletedCount = 0;
    const keysToDelete = this.keys().filter(key => key.startsWith(prefix));
    
    keysToDelete.forEach(key => {
      if (this.delete(key)) {
        deletedCount++;
      }
    });

    return deletedCount;
  }

  /**
   * Vérifie si un élément du cache est expiré
   */
  private isExpired(item: CacheItem<any>): boolean {
    if (!item.expiry) {
      return false; // Pas d'expiration définie
    }
    
    return Date.now() > item.expiry;
  }

  /**
   * Estime la taille d'un objet en mémoire (approximation)
   */
  private estimateSize(obj: any): number {
    const str = JSON.stringify(obj);
    return str.length * 2; // Approximation : 2 bytes par caractère
  }
}