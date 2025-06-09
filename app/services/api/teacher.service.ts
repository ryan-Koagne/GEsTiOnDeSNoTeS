import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces
export interface Subject {
  id: number;
  name: string;
  code: string;
  coefficient: number;
  description?: string;
  teacher_count: number;
}

export interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  address?: string;
  hire_date?: string;
  subjects: Subject[];
}

export interface CreateTeacherRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  hire_date?: string;
  subject_ids?: number[];
}

export interface UpdateTeacherRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  hire_date?: string;
  subject_ids?: number[];
}

export interface TeacherStatistics {
  total: number;
  bySubject: {[subjectName: string]: number};
  recentlyHired: Teacher[];
  subjectDistribution: {
    subject: string;
    teacherCount: number;
    teachers: string[];
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private apiUrl = `${environment.apiUrl}/teachers`;

  constructor(private http: HttpClient) {}
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
   * Récupère tous les enseignants
   * Accessible uniquement aux administrateurs
   */
  getAllTeachers(): Observable<Teacher[]> {
    
    return this.http.get<Teacher[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    }).pipe(

      catchError(this.handleError)
    );
  }

  /**
   * Récupère un enseignant par son ID
   */
  getTeacher(teacherId: number): Observable<Teacher>{
    return this.http.get<Teacher>(`this.apiUrl/${teacherId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crée un nouvel enseignant
   * Accessible uniquement aux administrateurs
   */
  createTeacher(teacherData: CreateTeacherRequest): Observable<Teacher> {
    return this.http.post<Teacher>(this.apiUrl, teacherData,{
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour un enseignant
   * Accessible uniquement aux administrateurs
   */
  updateTeacher(teacherId: number, teacherData: UpdateTeacherRequest): Observable<Teacher> {
    const payload = {
    ...teacherData,
    subject_ids: teacherData.subject_ids || []
  };
    return this.http.put<Teacher>(`${this.apiUrl}/${teacherId}`, teacherData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprime un enseignant
   * Accessible uniquement aux administrateurs
   */
  deleteTeacher(teacherId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${teacherId}`,{
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les enseignants qui enseignent une matière spécifique
   */
  getTeachersBySubject(subjectId: number): Observable<Teacher[]> {
    return this.getAllTeachers().pipe(
      map(teachers => teachers.filter(teacher => 
        teacher.subjects.some(subject => subject.id === subjectId)
      )),
      catchError(this.handleError)
    );
  }

  /**
   * Recherche des enseignants par nom
   */
  searchTeachers(searchTerm: string): Observable<Teacher[]> {
    return this.getAllTeachers().pipe(
      map(teachers => teachers.filter(teacher => 
        teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.subjects.some(subject => 
          subject.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )),
      catchError(this.handleError)
    );
  }

  /**
   * Assigne des matières à un enseignant
   */
  assignSubjectsToTeacher(teacherId: number, subjectIds: number[]): Observable<Teacher> {
    return this.updateTeacher(teacherId, { subject_ids: subjectIds });
  }

  /**
   * Retire des matières d'un enseignant
   */
  removeSubjectsFromTeacher(teacherId: number, subjectIdsToRemove: number[]): Observable<Teacher> {
    return this.getTeacher(teacherId).pipe(
      map(teacher => {
        const currentSubjectIds = teacher.subjects.map(s => s.id);
        const newSubjectIds = currentSubjectIds.filter(id => !subjectIdsToRemove.includes(id));
        return newSubjectIds;
      }),
      switchMap(newSubjectIds => this.updateTeacher(teacherId, { subject_ids: newSubjectIds })),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les statistiques des enseignants
   */
  getTeachersStatistics(): Observable<TeacherStatistics> {
    return this.getAllTeachers().pipe(
      map(teachers => {
        const bySubject: {[subjectName: string]: number} = {};
        const subjectDistribution: {[subjectName: string]: string[]} = {};

        teachers.forEach(teacher => {
          teacher.subjects.forEach(subject => {
            bySubject[subject.name] = (bySubject[subject.name] || 0) + 1;
            
            if (!subjectDistribution[subject.name]) {
              subjectDistribution[subject.name] = [];
            }
            subjectDistribution[subject.name].push(teacher.full_name);
          });
        });

        // Trier par date d'embauche (plus récents en premier)
        const recentlyHired = teachers
          .filter(teacher => teacher.hire_date)
          .sort((a, b) => new Date(b.hire_date!).getTime() - new Date(a.hire_date!).getTime())
          .slice(0, 5);

        const subjectDistributionArray = Object.keys(subjectDistribution).map(subject => ({
          subject,
          teacherCount: subjectDistribution[subject].length,
          teachers: subjectDistribution[subject]
        }));

        return {
          total: teachers.length,
          bySubject,
          recentlyHired,
          subjectDistribution: subjectDistributionArray
        };
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère la charge de travail d'un enseignant (nombre d'étudiants qu'il enseigne)
   */
  getTeacherWorkload(teacherId: number): Observable<{
    totalStudents: number;
    subjectBreakdown: {
      subject: string;
      studentCount: number;
    }[];
  }> {
    // Cette méthode nécessiterait un endpoint spécifique côté backend
    // Pour l'instant, on retourne des données simulées
    return this.getTeacher(teacherId).pipe(
      map(teacher => ({
        totalStudents: Math.floor(Math.random() * 100) + 20, // Simulation
        subjectBreakdown: teacher.subjects.map(subject => ({
          subject: subject.name,
          studentCount: Math.floor(Math.random() * 30) + 5 // Simulation
        }))
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Exporte la liste des enseignants
   */
  exportTeachers(format: 'csv' | 'excel' = 'csv'): Observable<Blob> {
    const headers = new HttpHeaders({
      'Accept': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    return this.http.get(`${this.apiUrl}/export?format=${format}`, {
      headers,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Importe des enseignants depuis un fichier CSV/Excel
   */
  importTeachers(file: File): Observable<{
    message: string;
    imported_count: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{
      message: string;
      imported_count: number;
      errors: string[];
    }>(`${this.apiUrl}/import`, formData).pipe(
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

    console.error('Erreur TeacherService:', error);
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Utilitaire pour formater les données d'enseignant pour l'affichage
   */
  formatTeacherForDisplay(teacher: Teacher): {
    displayName: string;
    displayInfo: string;
    subjectsText: string;
    experienceYears?: number;
  } {
    const displayName = teacher.full_name || `${teacher.first_name} ${teacher.last_name}`;
    const subjectsText = teacher.subjects.map(s => s.name).join(', ') || 'Aucune matière assignée';
    const displayInfo = `${subjectsText}${teacher.phone ? ` - ${teacher.phone}` : ''}`;
    
    let experienceYears: number | undefined;
    if (teacher.hire_date) {
      const hireDate = new Date(teacher.hire_date);
      const today = new Date();
      experienceYears = today.getFullYear() - hireDate.getFullYear();
      const monthDiff = today.getMonth() - hireDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hireDate.getDate())) {
        experienceYears--;
      }
    }

    return {
      displayName,
      displayInfo,
      subjectsText,
      experienceYears
    };
  }

  /**
   * Valide les données d'un enseignant avant soumission
   */
  validateTeacherData(teacherData: CreateTeacherRequest | UpdateTeacherRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validation pour la création
    if ('username' in teacherData) {
      if (!teacherData.username || teacherData.username.trim().length < 3) {
        errors.push('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      }

      if (!teacherData.email || !this.isValidEmail(teacherData.email)) {
        errors.push('L\'adresse email n\'est pas valide');
      }

      if (!teacherData.password || teacherData.password.length < 6) {
        errors.push('Le mot de passe doit contenir au moins 6 caractères');
      }
    }

    // Validations communes
    if ('first_name' in teacherData && (!teacherData.first_name || teacherData.first_name.trim().length === 0)) {
      errors.push('Le prénom est obligatoire');
    }

    if ('last_name' in teacherData && (!teacherData.last_name || teacherData.last_name.trim().length === 0)) {
      errors.push('Le nom de famille est obligatoire');
    }

    if ('phone' in teacherData && teacherData.phone && !this.isValidPhone(teacherData.phone)) {
      errors.push('Le numéro de téléphone n\'est pas valide');
    }

    if ('hire_date' in teacherData && teacherData.hire_date && !this.isValidDate(teacherData.hire_date)) {
      errors.push('La date d\'embauche n\'est pas valide');
    }

    if ('subject_ids' in teacherData && teacherData.subject_ids && teacherData.subject_ids.length === 0) {
      errors.push('Au moins une matière doit être assignée');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Vérifie si un enseignant peut enseigner une matière spécifique
   */
  canTeachSubject(teacherId: number, subjectId: number): Observable<boolean> {
    return this.getTeacher(teacherId).pipe(
      map(teacher => teacher.subjects.some(subject => subject.id === subjectId)),
      catchError(() => [false])
    );
  }

  /**
   * Récupère les conflits d'horaires potentiels (simulation)
   */
  getScheduleConflicts(teacherId: number): Observable<{
    hasConflicts: boolean;
    conflicts: {
      day: string;
      time: string;
      subject1: string;
      subject2: string;
    }[];
  }> {
    // Cette méthode nécessiterait un système de gestion d'emploi du temps
    // Pour l'instant, on retourne des données simulées
    return this.getTeacher(teacherId).pipe(
      map(() => ({
        hasConflicts: Math.random() > 0.7,
        conflicts: Math.random() > 0.7 ? [{
          day: 'Lundi',
          time: '10:00 - 12:00',
          subject1: 'Mathématiques',
          subject2: 'Physique'
        }] : []
      })),
      catchError(this.handleError)
    );
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
    return date instanceof Date && !isNaN(date.getTime()) && date <= today;
  }
}

// Import manquant pour switchMap
import { switchMap } from 'rxjs/operators';