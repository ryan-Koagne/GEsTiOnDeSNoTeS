import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ConfigService } from '../core/config.service';

// Interfaces
export interface Grade {
  id: number;
  student_id: number;
  student_name: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  value: number;
  appreciation: 'CA' | 'CANT' | 'NC';
  semester: string;
  academic_year: string;
  exam_type: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGradeRequest {
  student_id: number;
  subject_id: number;
  value: number;
  semester: string;
  academic_year: string;
  exam_type?: string;
}

export interface UpdateGradeRequest {
  value?: number;
  semester?: string;
  academic_year?: string;
  exam_type?: string;
}

export interface ImportGradesRequest {
  file: File;
  subject_id: number;
  semester: string;
  academic_year: string;
  exam_type?: string;
}

export interface ImportGradesResponse {
  message: string;
  imported_count: number;
  errors: string[];
}

export interface GradeFilters {
  student_id?: number;
  subject_id?: number;
  teacher_id?: number;
  semester?: string;
  academic_year?: string;
  exam_type?: string;
}

export interface StudentGradeSummary {
  total_grades: number;
  average: number;
  appreciations: {
    CA: number;
    CANT: number;
    NC: number;
  };
  grades_by_subject: {
    [subjectName: string]: {
      value: number;
      appreciation: string;
      exam_type: string;
      date: string;
    }[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class GradeService {
  private readonly baseUrl: string;
  private gradesSubject = new BehaviorSubject<Grade[]>([]);
  public grades$ = this.gradesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.baseUrl = `${this.configService.getApiUrl()}/grades`;
  }

  /**
   * Récupérer toutes les notes (selon le rôle de l'utilisateur)
   */
  getAllGrades(filters?: GradeFilters): Observable<Grade[]> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof GradeFilters];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<Grade[]>(this.baseUrl, { params }).pipe(
      tap(grades => this.gradesSubject.next(grades)),
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer une note par ID
   */
  getGrade(id: number): Observable<Grade> {
    return this.http.get<Grade>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer les notes d'un étudiant spécifique
   */
  getStudentGrades(studentId: number, filters?: Omit<GradeFilters, 'student_id'>): Observable<Grade[]> {
    let params = new HttpParams().set('student_id', studentId.toString());
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof Omit<GradeFilters, 'student_id'>];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<Grade[]>(this.baseUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer les notes données par un enseignant
   */
  getTeacherGrades(teacherId: number, filters?: Omit<GradeFilters, 'teacher_id'>): Observable<Grade[]> {
    let params = new HttpParams().set('teacher_id', teacherId.toString());
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof Omit<GradeFilters, 'teacher_id'>];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<Grade[]>(this.baseUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer les notes par matière
   */
  getSubjectGrades(subjectId: number, filters?: Omit<GradeFilters, 'subject_id'>): Observable<Grade[]> {
    let params = new HttpParams().set('subject_id', subjectId.toString());
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof Omit<GradeFilters, 'subject_id'>];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<Grade[]>(this.baseUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Créer une nouvelle note
   */
  createGrade(gradeData: CreateGradeRequest): Observable<Grade> {
    return this.http.post<Grade>(this.baseUrl, gradeData).pipe(
      tap(() => this.refreshGrades()),
      catchError(this.handleError)
    );
  }

  /**
   * Mettre à jour une note
   */
  updateGrade(id: number, gradeData: UpdateGradeRequest): Observable<Grade> {
    return this.http.put<Grade>(`${this.baseUrl}/${id}`, gradeData).pipe(
      tap(() => this.refreshGrades()),
      catchError(this.handleError)
    );
  }

  /**
   * Supprimer une note
   */
  deleteGrade(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.refreshGrades()),
      catchError(this.handleError)
    );
  }

  /**
   * Importer des notes via fichier CSV/Excel
   */
  importGrades(importData: ImportGradesRequest): Observable<ImportGradesResponse> {
    const formData = new FormData();
    formData.append('file', importData.file);
    formData.append('subject_id', importData.subject_id.toString());
    formData.append('semester', importData.semester);
    formData.append('academic_year', importData.academic_year);
    
    if (importData.exam_type) {
      formData.append('exam_type', importData.exam_type);
    }

    return this.http.post<ImportGradesResponse>(`${this.baseUrl}/import`, formData).pipe(
      tap(() => this.refreshGrades()),
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer le résumé des notes d'un étudiant
   */
  getStudentGradeSummary(studentId: number, semester?: string, academicYear?: string): Observable<StudentGradeSummary> {
    let params = new HttpParams();
    
    if (semester) {
      params = params.set('semester', semester);
    }
    if (academicYear) {
      params = params.set('academic_year', academicYear);
    }

    return this.http.get<StudentGradeSummary>(`${this.baseUrl}/student/${studentId}/summary`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Calculer la moyenne d'un étudiant
   */
  calculateStudentAverage(grades: Grade[]): number {
    if (!grades || grades.length === 0) {
      return 0;
    }

    const totalPoints = grades.reduce((sum, grade) => sum + grade.value, 0);
    return Math.round((totalPoints / grades.length) * 100) / 100;
  }

  /**
   * Obtenir l'appréciation selon la note
   */
  getAppreciation(grade: number): 'CA' | 'CANT' | 'NC' {
    if (grade > 10) {
      return 'CA';
    } else if (grade >= 7 && grade <= 10) {
      return 'CANT';
    } else {
      return 'NC';
    }
  }

  /**
   * Grouper les notes par matière
   */
  groupGradesBySubject(grades: Grade[]): { [subjectName: string]: Grade[] } {
    return grades.reduce((groups, grade) => {
      const subjectName = grade.subject_name;
      if (!groups[subjectName]) {
        groups[subjectName] = [];
      }
      groups[subjectName].push(grade);
      return groups;
    }, {} as { [subjectName: string]: Grade[] });
  }

  /**
   * Grouper les notes par semestre
   */
  groupGradesBySemester(grades: Grade[]): { [semester: string]: Grade[] } {
    return grades.reduce((groups, grade) => {
      const semester = grade.semester;
      if (!groups[semester]) {
        groups[semester] = [];
      }
      groups[semester].push(grade);
      return groups;
    }, {} as { [semester: string]: Grade[] });
  }

  /**
   * Grouper les notes par type d'examen
   */
  groupGradesByExamType(grades: Grade[]): { [examType: string]: Grade[] } {
    return grades.reduce((groups, grade) => {
      const examType = grade.exam_type;
      if (!groups[examType]) {
        groups[examType] = [];
      }
      groups[examType].push(grade);
      return groups;
    }, {} as { [examType: string]: Grade[] });
  }

  /**
   * Obtenir les statistiques des notes
   */
  getGradeStatistics(grades: Grade[]): {
    total: number;
    average: number;
    highest: number;
    lowest: number;
    appreciations: { CA: number; CANT: number; NC: number };
  } {
    if (!grades || grades.length === 0) {
      return {
        total: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        appreciations: { CA: 0, CANT: 0, NC: 0 }
      };
    }

    const values = grades.map(g => g.value);
    const appreciations = { CA: 0, CANT: 0, NC: 0 };

    grades.forEach(grade => {
      appreciations[grade.appreciation]++;
    });

    return {
      total: grades.length,
      average: this.calculateStudentAverage(grades),
      highest: Math.max(...values),
      lowest: Math.min(...values),
      appreciations
    };
  }

  /**
   * Valider une note
   */
  validateGrade(value: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (value < 0) {
      errors.push('La note ne peut pas être négative');
    }

    if (value > 20) {
      errors.push('La note ne peut pas être supérieure à 20');
    }

    if (!Number.isFinite(value)) {
      errors.push('La note doit être un nombre valide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valider le format d'un fichier d'import
   */
  validateImportFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    // Vérifier l'extension
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`Format de fichier non supporté. Formats acceptés: ${allowedExtensions.join(', ')}`);
    }

    // Vérifier la taille
    if (file.size > maxSize) {
      errors.push('Le fichier est trop volumineux (maximum 5MB)');
    }

    // Vérifier que le fichier n'est pas vide
    if (file.size === 0) {
      errors.push('Le fichier est vide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Rafraîchir la liste des notes
   */
  private refreshGrades(): void {
    this.getAllGrades().subscribe();
  }

  /**
   * Gestion d'erreur centralisée
   */
  private handleError(error: any): Observable<never> {
    console.error('Erreur dans GradeService:', error);
    throw error;
  }

  /**
   * Nettoyer les données en cache
   */
  clearCache(): void {
    this.gradesSubject.next([]);
  }
}