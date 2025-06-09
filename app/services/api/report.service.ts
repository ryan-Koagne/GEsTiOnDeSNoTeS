import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Define the appreciation type
type AppreciationType = 'CA' | 'CANT' | 'NC';

// Interfaces pour typer les données
interface ClassReport {
  classe: {
    id: number;
    name: string;
    level: string;
    academic_year: string;
    student_count: number;
  };
  semestre: string;
  annee_academique: string;
  date_generation: string;
  etudiants: StudentReportData[];
  statistiques: ClassStatistics;
  matieres: Subject[];
}

interface StudentReportData {
  matricule: string;
  nom_complet: string;
  notes: { [matiere: string]: StudentGrade };
  moyenne_generale: number;
  appreciation_generale: AppreciationType; // Use the specific type here
}

interface StudentGrade {
  note: number | null;
  appreciation: string;
}

interface ClassStatistics {
  nombre_etudiants: number;
  moyenne_classe: number;
  taux_reussite: number;
  statistiques_par_matiere: { [matiere: string]: SubjectStatistics };
}

interface SubjectStatistics {
  moyenne: number;
  note_max: number;
  note_min: number;
  nombre_notes: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  coefficient: number;
  description?: string;
  teacher_count?: number;
}

interface ReportGenerationParams {
  semester?: string;
  academic_year?: string;
  format?: 'json' | 'pdf' | 'csv' | 'excel';
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  /**
   * Génère un rapport de classe
   * @param classId ID de la classe
   * @param params Paramètres de génération du rapport
   * @returns Observable du rapport généré
   */
  generateClassReport(classId: number, params: ReportGenerationParams = {}): Observable<ClassReport> {
    let httpParams = new HttpParams();
    
    if (params.semester) {
      httpParams = httpParams.set('semester', params.semester);
    }
    if (params.academic_year) {
      httpParams = httpParams.set('academic_year', params.academic_year);
    }
    if (params.format) {
      httpParams = httpParams.set('format', params.format);
    }

    return this.http.get<ClassReport>(`${this.apiUrl}/class/${classId}`, { params: httpParams });
  }

  /**
   * Exporte un rapport de classe en PDF
   * @param classId ID de la classe
   * @param params Paramètres d'export
   * @returns Observable du blob PDF
   */
  exportToPdf(classId: number, params: Omit<ReportGenerationParams, 'format'> = {}): Observable<Blob> {
    let httpParams = new HttpParams().set('format', 'pdf');
    
    if (params.semester) {
      httpParams = httpParams.set('semester', params.semester);
    }
    if (params.academic_year) {
      httpParams = httpParams.set('academic_year', params.academic_year);
    }

    return this.http.get(`${this.apiUrl}/class/${classId}`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Exporte un rapport de classe en CSV
   * @param classId ID de la classe
   * @param params Paramètres d'export
   * @returns Observable du blob CSV
   */
  exportToCsv(classId: number, params: Omit<ReportGenerationParams, 'format'> = {}): Observable<Blob> {
    let httpParams = new HttpParams().set('format', 'csv');
    
    if (params.semester) {
      httpParams = httpParams.set('semester', params.semester);
    }
    if (params.academic_year) {
      httpParams = httpParams.set('academic_year', params.academic_year);
    }

    return this.http.get(`${this.apiUrl}/class/${classId}`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Exporte un rapport de classe en Excel
   * @param classId ID de la classe
   * @param params Paramètres d'export
   * @returns Observable du blob Excel
   */
  exportToExcel(classId: number, params: Omit<ReportGenerationParams, 'format'> = {}): Observable<Blob> {
    let httpParams = new HttpParams().set('format', 'excel');
    
    if (params.semester) {
      httpParams = httpParams.set('semester', params.semester);
    }
    if (params.academic_year) {
      httpParams = httpParams.set('academic_year', params.academic_year);
    }

    return this.http.get(`${this.apiUrl}/class/${classId}`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Télécharge un fichier de rapport
   * @param blob Blob du fichier
   * @param filename Nom du fichier
   * @param format Format du fichier
   */
  downloadFile(blob: Blob, filename: string, format: 'pdf' | 'csv' | 'excel'): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Déterminer l'extension selon le format
    let extension = '';
    let mimeType = '';
    
    switch (format) {
      case 'pdf':
        extension = '.pdf';
        mimeType = 'application/pdf';
        break;
      case 'csv':
        extension = '.csv';
        mimeType = 'text/csv';
        break;
      case 'excel':
        extension = '.xlsx';
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
    }
    
    link.download = `${filename}${extension}`;
    link.type = mimeType;
    
    // Déclencher le téléchargement
    document.body.appendChild(link);
    link.click();
    
    // Nettoyer
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Génère et télécharge automatiquement un rapport en PDF
   * @param classId ID de la classe
   * @param params Paramètres de génération
   * @param filename Nom du fichier (optionnel)
   */
  generateAndDownloadPdf(
    classId: number, 
    params: Omit<ReportGenerationParams, 'format'> = {},
    filename?: string
  ): Observable<void> {
    return new Observable(observer => {
      this.exportToPdf(classId, params).subscribe({
        next: (blob) => {
          const defaultFilename = `releve_notes_classe_${classId}_${params.semester || 'S1'}`;
          this.downloadFile(blob, filename || defaultFilename, 'pdf');
          observer.next();
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Génère et télécharge automatiquement un rapport en CSV
   * @param classId ID de la classe
   * @param params Paramètres de génération
   * @param filename Nom du fichier (optionnel)
   */
  generateAndDownloadCsv(
    classId: number, 
    params: Omit<ReportGenerationParams, 'format'> = {},
    filename?: string
  ): Observable<void> {
    return new Observable(observer => {
      this.exportToCsv(classId, params).subscribe({
        next: (blob) => {
          const defaultFilename = `releve_notes_classe_${classId}_${params.semester || 'S1'}`;
          this.downloadFile(blob, filename || defaultFilename, 'csv');
          observer.next();
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Génère et télécharge automatiquement un rapport en Excel
   * @param classId ID de la classe
   * @param params Paramètres de génération
   * @param filename Nom du fichier (optionnel)
   */
  generateAndDownloadExcel(
    classId: number, 
    params: Omit<ReportGenerationParams, 'format'> = {},
    filename?: string
  ): Observable<void> {
    return new Observable(observer => {
      this.exportToExcel(classId, params).subscribe({
        next: (blob) => {
          const defaultFilename = `releve_notes_classe_${classId}_${params.semester || 'S1'}`;
          this.downloadFile(blob, filename || defaultFilename, 'excel');
          observer.next();
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Calcule les statistiques d'un rapport
   * @param report Données du rapport
   * @returns Statistiques calculées
   */
  calculateReportStatistics(report: ClassReport): {
    totalStudents: number;
    passRate: number;
    classAverage: number;
    gradeDistribution: Record<AppreciationType, number>;
    topPerformers: StudentReportData[];
    needsAttention: StudentReportData[];
  } {
    const totalStudents = report.etudiants.length;
    
    // Calcul du taux de réussite (moyenne >= 10)
    const passedStudents = report.etudiants.filter(s => s.moyenne_generale >= 10).length;
    const passRate = totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0;
    
    // Calcul de la moyenne de classe
    const totalAverage = report.etudiants.reduce((sum, s) => sum + s.moyenne_generale, 0);
    const classAverage = totalStudents > 0 ? totalAverage / totalStudents : 0;
    
    // Distribution des appréciations - FIXED VERSION
    const gradeDistribution: Record<AppreciationType, number> = { CA: 0, CANT: 0, NC: 0 };
    report.etudiants.forEach(student => {
      // Method 1: Type assertion (safest if you're sure about the data)
      const appreciation = student.appreciation_generale as AppreciationType;
      if (appreciation in gradeDistribution) {
        gradeDistribution[appreciation]++;
      }
    });
    
    // Top 5 des meilleurs étudiants
    const topPerformers = [...report.etudiants]
      .sort((a, b) => b.moyenne_generale - a.moyenne_generale)
      .slice(0, 5);
    
    // Étudiants en difficulté (moyenne < 7)
    const needsAttention = report.etudiants
      .filter(s => s.moyenne_generale < 7)
      .sort((a, b) => a.moyenne_generale - b.moyenne_generale);
    
    return {
      totalStudents,
      passRate: Math.round(passRate * 100) / 100,
      classAverage: Math.round(classAverage * 100) / 100,
      gradeDistribution,
      topPerformers,
      needsAttention
    };
  }

  /**
   * Alternative method for calculating statistics with type guards
   */
  calculateReportStatisticsAlternative(report: ClassReport): {
    totalStudents: number;
    passRate: number;
    classAverage: number;
    gradeDistribution: Record<AppreciationType, number>;
    topPerformers: StudentReportData[];
    needsAttention: StudentReportData[];
  } {
    const totalStudents = report.etudiants.length;
    
    // Calcul du taux de réussite (moyenne >= 10)
    const passedStudents = report.etudiants.filter(s => s.moyenne_generale >= 10).length;
    const passRate = totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0;
    
    // Calcul de la moyenne de classe
    const totalAverage = report.etudiants.reduce((sum, s) => sum + s.moyenne_generale, 0);
    const classAverage = totalStudents > 0 ? totalAverage / totalStudents : 0;
    
    // Distribution des appréciations - Alternative with type guard
    const gradeDistribution: Record<AppreciationType, number> = { CA: 0, CANT: 0, NC: 0 };
    
    const isValidAppreciation = (appreciation: string): appreciation is AppreciationType => {
      return ['CA', 'CANT', 'NC'].includes(appreciation);
    };
    
    report.etudiants.forEach(student => {
      if (isValidAppreciation(student.appreciation_generale)) {
        gradeDistribution[student.appreciation_generale]++;
      }
    });
    
    // Top 5 des meilleurs étudiants
    const topPerformers = [...report.etudiants]
      .sort((a, b) => b.moyenne_generale - a.moyenne_generale)
      .slice(0, 5);
    
    // Étudiants en difficulté (moyenne < 7)
    const needsAttention = report.etudiants
      .filter(s => s.moyenne_generale < 7)
      .sort((a, b) => a.moyenne_generale - b.moyenne_generale);
    
    return {
      totalStudents,
      passRate: Math.round(passRate * 100) / 100,
      classAverage: Math.round(classAverage * 100) / 100,
      gradeDistribution,
      topPerformers,
      needsAttention
    };
  }

  /**
   * Formate les données pour l'affichage dans un tableau
   * @param report Données du rapport
   * @returns Données formatées pour le tableau
   */
  formatReportForTable(report: ClassReport): any[] {
    return report.etudiants.map(student => {
      const formattedStudent: any = {
        matricule: student.matricule,
        nom_complet: student.nom_complet,
        moyenne_generale: student.moyenne_generale,
        appreciation_generale: student.appreciation_generale
      };

      // Ajouter les notes par matière
      report.matieres.forEach(matiere => {
        const noteData = student.notes[matiere.name];
        if (noteData && noteData.note !== null) {
          formattedStudent[`${matiere.name}_note`] = noteData.note;
          formattedStudent[`${matiere.name}_appreciation`] = noteData.appreciation;
          formattedStudent[`${matiere.name}_display`] = `${noteData.note} (${noteData.appreciation})`;
        } else {
          formattedStudent[`${matiere.name}_note`] = null;
          formattedStudent[`${matiere.name}_appreciation`] = 'NE';
          formattedStudent[`${matiere.name}_display`] = 'NE';
        }
      });

      return formattedStudent;
    });
  }

  /**
   * Valide les paramètres de génération de rapport
   * @param params Paramètres à valider
   * @returns True si valides, sinon erreurs
   */
  validateReportParams(params: ReportGenerationParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.semester && !['S1', 'S2'].includes(params.semester)) {
      errors.push('Le semestre doit être S1 ou S2');
    }

    if (params.academic_year) {
      const yearPattern = /^\d{4}-\d{4}$/;
      if (!yearPattern.test(params.academic_year)) {
        errors.push('L\'année académique doit être au format YYYY-YYYY (ex: 2024-2025)');
      }
    }

    if (params.format && !['json', 'pdf', 'csv', 'excel'].includes(params.format)) {
      errors.push('Le format doit être json, pdf, csv ou excel');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}