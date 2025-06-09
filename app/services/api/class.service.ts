import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces
export interface Class {
  id: number;
  name: string;
  level: string;
  academic_year: string;
  student_count?: number;
  created_at?: string;
}

interface CreateClassRequest {
  name: string;
  level: string;
  academic_year: string;
}

interface UpdateClassRequest {
  name?: string;
  level?: string;
  academic_year?: string;
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClassService {
  private apiUrl = `${environment.apiUrl}/classes`;

  constructor(private http: HttpClient) {}

  getAllClasses(): Observable<Class[]> {
    return this.http.get<Class[]>(this.apiUrl, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getClass(id: number): Observable<Class> {
    return this.http.get<Class>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getClassesByLevel(level: string): Observable<Class[]> {
    return this.getAllClasses().pipe(
      map(classes => classes.filter(cls => cls.level === level))
    );
  }

  getClassesByAcademicYear(academicYear: string): Observable<Class[]> {
    return this.getAllClasses().pipe(
      map(classes => classes.filter(cls => cls.academic_year === academicYear))
    );
  }

  createClass(classData: CreateClassRequest): Observable<Class> {
    return this.http.post<Class>(this.apiUrl, classData, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  updateClass(id: number, classData: UpdateClassRequest): Observable<Class> {
    return this.http.put<Class>(`${this.apiUrl}/${id}`, classData, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  deleteClass(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  checkClassExists(name: string, excludeId?: number): Observable<boolean> {
    return this.getAllClasses().pipe(
      map(classes => {
        const existingClass = classes.find(cls =>
          cls.name.toLowerCase() === name.toLowerCase() &&
          (!excludeId || cls.id !== excludeId)
        );
        return !!existingClass;
      })
    );
  }

  getClassStatistics(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/statistics`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getClassStudents(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/students`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getAvailableLevels(): Observable<string[]> {
    return this.getAllClasses().pipe(
      map(classes => {
        const levels = classes.map(cls => cls.level);
        return Array.from(new Set(levels)).sort();
      })
    );
  }

  getAvailableAcademicYears(): Observable<string[]> {
    return this.getAllClasses().pipe(
      map(classes => {
        const years = classes.map(cls => cls.academic_year);
        return Array.from(new Set(years)).sort().reverse();
      })
    );
  }

  searchClasses(searchTerm: string): Observable<Class[]> {
    return this.getAllClasses().pipe(
      map(classes =>
        classes.filter(cls =>
          cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cls.level.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  }

  filterClasses(filters: {
    level?: string;
    academic_year?: string;
    searchTerm?: string;
  }): Observable<Class[]> {
    return this.getAllClasses().pipe(
      map(classes => {
        let filteredClasses = classes;

        if (filters.level) {
          filteredClasses = filteredClasses.filter(cls => cls.level === filters.level);
        }

        if (filters.academic_year) {
          filteredClasses = filteredClasses.filter(cls => cls.academic_year === filters.academic_year);
        }

        if (filters.searchTerm) {
          const searchTerm = filters.searchTerm.toLowerCase();
          filteredClasses = filteredClasses.filter(cls =>
            cls.name.toLowerCase().includes(searchTerm) ||
            cls.level.toLowerCase().includes(searchTerm)
          );
        }

        return filteredClasses;
      })
    );
  }

  validateClassData(classData: CreateClassRequest | UpdateClassRequest): string[] {
    const errors: string[] = [];

    if ('name' in classData && classData.name) {
      if (!classData.name.trim()) {
        errors.push('Le nom de la classe est requis');
      } else if (classData.name.length < 2) {
        errors.push('Le nom de la classe doit contenir au moins 2 caractères');
      } else if (classData.name.length > 100) {
        errors.push('Le nom de la classe ne peut pas dépasser 100 caractères');
      }
    }

    if ('level' in classData && classData.level) {
      if (!classData.level.trim()) {
        errors.push('Le niveau est requis');
      } else if (classData.level.length > 50) {
        errors.push('Le niveau ne peut pas dépasser 50 caractères');
      }
    }

    if ('academic_year' in classData && classData.academic_year) {
      if (!classData.academic_year.trim()) {
        errors.push('L\'année académique est requise');
      } else if (!/^\d{4}-\d{4}$/.test(classData.academic_year)) {
        errors.push('L\'année académique doit être au format YYYY-YYYY (ex: 2024-2025)');
      }
    }

    return errors;
  }

  generateDefaultAcademicYear(): string {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const startYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    return `${startYear}-${startYear + 1}`;
  }

  sortClasses(classes: Class[], sortBy: 'name' | 'level' | 'academic_year' | 'student_count', sortOrder: 'asc' | 'desc' = 'asc'): Class[] {
    return classes.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'level':
          comparison = a.level.localeCompare(b.level);
          break;
        case 'academic_year':
          comparison = a.academic_year.localeCompare(b.academic_year);
          break;
        case 'student_count':
          const aCount = a.student_count || 0;
          const bCount = b.student_count || 0;
          comparison = aCount - bCount;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('school_auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      if (error.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      } else if (error.status === 403) {
        errorMessage = 'Accès non autorisé.';
      } else if (error.status === 404) {
        errorMessage = 'Classe non trouvée.';
      } else if (error.status === 409) {
        errorMessage = 'Une classe avec ce nom existe déjà.';
      } else if (error.status === 422) {
        errorMessage = error.error?.error || 'Données invalides.';
      } else if (error.status === 500) {
        errorMessage = 'Erreur interne du serveur.';
      } else if (error.error?.error) {
        errorMessage = error.error.error;
      }
    }

    console.error('Erreur ClassService:', error);
    return throwError(() => new Error(errorMessage));
  };
}
