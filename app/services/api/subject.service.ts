import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConfigService } from '../core/config.service';

// Interfaces TypeScript
export interface Subject {
  id: number;
  name: string;
  code: string;
  coefficient: number;
  description?: string;
  teacher_count: number;
}

 export interface CreateSubjectRequest {
  name: string;
  code: string;
  coefficient: number;
  description?: string;
}

 export interface UpdateSubjectRequest {
  name?: string;
  code?: string;
  coefficient?: number;
  description?: string;
}

 interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private readonly apiUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.apiUrl = `${this.configService.getApiUrl()}/subjects`;
  }

  /**
   * Récupérer toutes les matières
   */
  getAllSubjects(): Observable<Subject[]> {
    return this.http.get<Subject[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer une matière par ID
   */
  getSubject(id: number): Observable<Subject> {
    return this.http.get<Subject>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Créer une nouvelle matière
   */
  createSubject(subjectData: CreateSubjectRequest): Observable<Subject> {
    return this.http.post<Subject>(this.apiUrl, subjectData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mettre à jour une matière
   */
  updateSubject(id: number, subjectData: UpdateSubjectRequest): Observable<Subject> {
    return this.http.put<Subject>(`${this.apiUrl}/${id}`, subjectData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprimer une matière
   */
  deleteSubject(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Rechercher des matières par nom ou code
   */
  searchSubjects(query: string): Observable<Subject[]> {
    return this.getAllSubjects().pipe(
      map(subjects => subjects.filter(subject =>
        subject.name.toLowerCase().includes(query.toLowerCase()) ||
        subject.code.toLowerCase().includes(query.toLowerCase())
      ))
    );
  }

  /**
   * Récupérer les matières avec coefficient supérieur à une valeur donnée
   */
  getSubjectsByMinCoefficient(minCoeff: number): Observable<Subject[]> {
    return this.getAllSubjects().pipe(
      map(subjects => subjects.filter(subject => subject.coefficient >= minCoeff))
    );
  }

  /**
   * Récupérer les matières par codes spécifiques
   */
  getSubjectsByCodes(codes: string[]): Observable<Subject[]> {
    return this.getAllSubjects().pipe(
      map(subjects => subjects.filter(subject => codes.includes(subject.code)))
    );
  }

  /**
   * Vérifier si un code de matière existe déjà
   */
  checkSubjectCodeExists(code: string, excludeId?: number): Observable<boolean> {
    return this.getAllSubjects().pipe(
      map(subjects => {
        const existingSubject = subjects.find(s => s.code.toLowerCase() === code.toLowerCase());
        if (!existingSubject) return false;
        if (excludeId && existingSubject.id === excludeId) return false;
        return true;
      }),
      catchError(() => throwError(() => new Error('Erreur lors de la vérification du code')))
    );
  }

  /**
   * Calculer le coefficient total pour un ensemble de matières
   */
  calculateTotalCoefficient(subjectIds: number[]): Observable<number> {
    return this.getAllSubjects().pipe(
      map(subjects => {
        const selectedSubjects = subjects.filter(s => subjectIds.includes(s.id));
        return selectedSubjects.reduce((total, subject) => total + subject.coefficient, 0);
      })
    );
  }

  /**
   * Récupérer les statistiques des matières
   */
  getSubjectsStatistics(): Observable<{
    totalSubjects: number;
    averageCoefficient: number;
    maxCoefficient: number;
    minCoefficient: number;
    subjectsWithoutTeachers: number;
  }> {
    return this.getAllSubjects().pipe(
      map(subjects => {
        if (subjects.length === 0) {
          return {
            totalSubjects: 0,
            averageCoefficient: 0,
            maxCoefficient: 0,
            minCoefficient: 0,
            subjectsWithoutTeachers: 0
          };
        }

        const coefficients = subjects.map(s => s.coefficient);
        const totalCoeff = coefficients.reduce((sum, coeff) => sum + coeff, 0);

        return {
          totalSubjects: subjects.length,
          averageCoefficient: Number((totalCoeff / subjects.length).toFixed(2)),
          maxCoefficient: Math.max(...coefficients),
          minCoefficient: Math.min(...coefficients),
          subjectsWithoutTeachers: subjects.filter(s => s.teacher_count === 0).length
        };
      })
    );
  }

  /**
   * Valider les données d'une matière
   */
  validateSubjectData(subjectData: CreateSubjectRequest | UpdateSubjectRequest): string[] {
    const errors: string[] = [];

    if ('name' in subjectData && subjectData.name) {
      if (subjectData.name.trim().length < 2) {
        errors.push('Le nom de la matière doit contenir au moins 2 caractères');
      }
      if (subjectData.name.length > 100) {
        errors.push('Le nom de la matière ne peut pas dépasser 100 caractères');
      }
    }

    if ('code' in subjectData && subjectData.code) {
      if (!/^[A-Z0-9]{2,10}$/.test(subjectData.code)) {
        errors.push('Le code doit contenir entre 2 et 10 caractères alphanumériques en majuscules');
      }
    }

    if ('coefficient' in subjectData && subjectData.coefficient !== undefined) {
      if (subjectData.coefficient <= 0) {
        errors.push('Le coefficient doit être supérieur à 0');
      }
      if (subjectData.coefficient > 10) {
        errors.push('Le coefficient ne peut pas dépasser 10');
      }
    }

    if ('description' in subjectData && subjectData.description) {
      if (subjectData.description.length > 500) {
        errors.push('La description ne peut pas dépasser 500 caractères');
      }
    }

    return errors;
  }

  /**
   * Formater les données d'une matière pour l'affichage
   */
  formatSubjectForDisplay(subject: Subject): {
    id: number;
    displayName: string;
    fullCode: string;
    coefficientText: string;
    hasTeachers: boolean;
    shortDescription: string;
  } {
    return {
      id: subject.id,
      displayName: `${subject.name} (${subject.code})`,
      fullCode: `[${subject.code}]`,
      coefficientText: `Coeff: ${subject.coefficient}`,
      hasTeachers: subject.teacher_count > 0,
      shortDescription: subject.description 
        ? (subject.description.length > 50 
           ? subject.description.substring(0, 50) + '...' 
           : subject.description)
        : 'Aucune description'
    };
  }

  /**
   * Gestion centralisée des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur inattendue s\'est produite';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage = error.error?.error || 'Données invalides';
          break;
        case 401:
          errorMessage = 'Non autorisé - Veuillez vous reconnecter';
          break;
        case 403:
          errorMessage = 'Accès refusé - Permissions insuffisantes';
          break;
        case 404:
          errorMessage = 'Matière non trouvée';
          break;
        case 409:
          errorMessage = 'Une matière avec ce code existe déjà';
          break;
        case 500:
          errorMessage = 'Erreur serveur - Veuillez réessayer plus tard';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.error?.error || error.message}`;
      }
    }

    console.error('Erreur SubjectService:', error);
    return throwError(() => new Error(errorMessage));
  }
}