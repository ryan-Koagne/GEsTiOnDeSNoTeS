import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces
export interface Student {
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

export interface CreateStudentRequest {
  username: string;
  email: string;
  password: string;
  matricule: string;
  first_name: string;
  last_name: string;
  class_id: number;
  phone?: string;
  address?: string;
  birth_date?: string;
}

export interface UpdateStudentRequest {
  first_name?: string;
  last_name?: string;
  class_id?: number;
  phone?: string;
  address?: string;
  birth_date?: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = `${environment.apiUrl}/students`;

  constructor(
    private http: HttpClient,
  ) {}
  private readonly TOKEN_KEY = 'school_auth_token'

   getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Crée les en-têtes d'authentification avec le token JWT
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Récupère tous les étudiants
   * Accessible uniquement aux administrateurs
   */
  getAllStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère un étudiant par son ID
   * Les étudiants peuvent voir leur propre profil, les admins peuvent voir tous
   */
  getStudent(studentId: number): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/${studentId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crée un nouveau étudiant
   * Accessible uniquement aux administrateurs
   */
  createStudent(studentData: CreateStudentRequest): Observable<Student> {
    return this.http.post<Student>(this.apiUrl, studentData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour un étudiant
   * Accessible uniquement aux administrateurs
   */
  updateStudent(studentId: number, studentData: UpdateStudentRequest): Observable<Student> {
    return this.http.put<Student>(`${this.apiUrl}/${studentId}`, studentData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprime un étudiant
   * Accessible uniquement aux administrateurs
   */
  deleteStudent(studentId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${studentId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les étudiants d'une classe spécifique
   */
  getStudentsByClass(classId: number): Observable<Student[]> {
    return this.getAllStudents().pipe(
      map(students => students.filter(student => student.class_id === classId)),
      catchError(this.handleError)
    );
  }

  /**
   * Recherche des étudiants par nom ou matricule
   */
  searchStudents(searchTerm: string): Observable<Student[]> {
    return this.getAllStudents().pipe(
      map(students => students.filter(student => 
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule.toLowerCase().includes(searchTerm.toLowerCase())
      )),
      catchError(this.handleError)
    );
  }

  /**
   * Valide le matricule d'un étudiant (unicité)
   */
  validateMatricule(matricule: string, excludeStudentId?: number): Observable<boolean> {
    return this.getAllStudents().pipe(
      map(students => {
        const existingStudent = students.find(s => s.matricule === matricule);
        if (!existingStudent) return true;
        if (excludeStudentId && existingStudent.id === excludeStudentId) return true;
        return false;
      }),
      catchError(() => [true]) // En cas d'erreur, on considère comme valide
    );
  }

  /**
   * Récupère les statistiques des étudiants
   */
  getStudentsStatistics(): Observable<{
    total: number;
    byClass: {[className: string]: number};
    recentlyAdded: Student[];
  }> {
    return this.getAllStudents().pipe(
      map(students => {
        const byClass: {[className: string]: number} = {};
        
        students.forEach(student => {
          const className = student.class_name || 'Non assigné';
          byClass[className] = (byClass[className] || 0) + 1;
        });

        // Trier par date de création (simulé - vous pourriez ajouter created_at au modèle)
        const recentlyAdded = students.slice(-5);

        return {
          total: students.length,
          byClass,
          recentlyAdded
        };
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Exporte la liste des étudiants
   */
  exportStudents(format: 'csv' | 'excel' = 'csv'): Observable<Blob> {
    const headers = this.getAuthHeaders().set(
      'Accept', 
      format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    return this.http.get(`${this.apiUrl}/export?format=${format}`, {
      headers,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Importe des étudiants depuis un fichier CSV/Excel
   */
  importStudents(file: File, classId: number): Observable<{
    message: string;
    imported_count: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('class_id', classId.toString());

    return this.http.post<{
      message: string;
      imported_count: number;
      errors: string[];
    }>(`${this.apiUrl}/import`, formData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('Erreur StudentService:', error);
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Utilitaire pour formater les données d'étudiant pour l'affichage
   */
  formatStudentForDisplay(student: Student): {
    displayName: string;
    displayInfo: string;
    age?: number;
  } {
    const displayName = student.full_name || `${student.first_name} ${student.last_name}`;
    const displayInfo = `${student.matricule} - ${student.class_name || 'Classe non assignée'}`;
    
    let age: number | undefined;
    if (student.birth_date) {
      const birthDate = new Date(student.birth_date);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    return {
      displayName,
      displayInfo,
      age
    };
  }

  /**
   * Valide les données d'un étudiant avant soumission
   */
  validateStudentData(studentData: CreateStudentRequest | UpdateStudentRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validation pour la création
    if ('username' in studentData) {
      if (!studentData.username || studentData.username.trim().length < 3) {
        errors.push('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      }

      if (!studentData.email || !this.isValidEmail(studentData.email)) {
        errors.push('L\'adresse email n\'est pas valide');
      }

      if (!studentData.password || studentData.password.length < 6) {
        errors.push('Le mot de passe doit contenir au moins 6 caractères');
      }

      if (!studentData.matricule || studentData.matricule.trim().length === 0) {
        errors.push('Le matricule est obligatoire');
      }
    }

    // Validations communes
    if ('first_name' in studentData && (!studentData.first_name || studentData.first_name.trim().length === 0)) {
      errors.push('Le prénom est obligatoire');
    }

    if ('last_name' in studentData && (!studentData.last_name || studentData.last_name.trim().length === 0)) {
      errors.push('Le nom de famille est obligatoire');
    }

    if ('class_id' in studentData && (!studentData.class_id || studentData.class_id <= 0)) {
      errors.push('La classe doit être sélectionnée');
    }

    if ('phone' in studentData && studentData.phone && !this.isValidPhone(studentData.phone)) {
      errors.push('Le numéro de téléphone n\'est pas valide');
    }

    if ('birth_date' in studentData && studentData.birth_date && !this.isValidDate(studentData.birth_date)) {
      errors.push('La date de naissance n\'est pas valide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    return phoneRegex.test(phone);
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    return date instanceof Date && !isNaN(date.getTime()) && date < today;
  }
}