import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ConfigService } from '../core/config.service';

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult {
  message: string;
  imported_count: number;
  errors: string[];
}

export interface GradeImportParams {
  subject_id: string;
  semester: string;
  academic_year: string;
  exam_type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private readonly apiUrl: string;
  private uploadProgressSubject = new BehaviorSubject<FileUploadProgress | null>(null);
  public uploadProgress$ = this.uploadProgressSubject.asObservable();

  // Formats de fichiers acceptés
  private readonly ACCEPTED_FORMATS = ['.csv', '.xlsx', '.xls'];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.apiUrl = this.configService.getApiUrl();
  }

  /**
   * Importer des notes depuis un fichier CSV/Excel
   */
  importGrades(file: File, params: GradeImportParams): Observable<FileUploadResult> {
    // Validation du fichier
    const validationError = this.validateFile(file);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    // Préparer les données du formulaire
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject_id', params.subject_id);
    formData.append('semester', params.semester);
    formData.append('academic_year', params.academic_year);
    
    if (params.exam_type) {
      formData.append('exam_type', params.exam_type);
    }

    // Headers (le token JWT sera ajouté automatiquement par l'intercepteur)
    const headers = new HttpHeaders();
    // Ne pas définir Content-Type pour FormData, le navigateur le fera automatiquement

    return this.http.post<FileUploadResult>(
      `${this.apiUrl}/grades/import`,
      formData,
      {
        headers,
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map((event: HttpEvent<FileUploadResult>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const progress: FileUploadProgress = {
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100)
              };
              this.uploadProgressSubject.next(progress);
            }
            return null;

          case HttpEventType.Response:
            this.uploadProgressSubject.next(null); // Reset progress
            return event.body!;

          default:
            return null;
        }
      }),
      // Filtrer les valeurs null (événements de progression)
      map(result => result!),
      catchError(error => {
        this.uploadProgressSubject.next(null); // Reset progress on error
        return throwError(() => this.handleUploadError(error));
      })
    );
  }

  /**
   * Upload générique de fichier
   */
  uploadFile(
    file: File,
    endpoint: string,
    additionalData?: { [key: string]: string }
  ): Observable<any> {
    const validationError = this.validateFile(file);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const formData = new FormData();
    formData.append('file', file);

    // Ajouter des données supplémentaires si fournies
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    return this.http.post(`${this.apiUrl}/${endpoint}`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const progress: FileUploadProgress = {
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100)
              };
              this.uploadProgressSubject.next(progress);
            }
            return null;

          case HttpEventType.Response:
            this.uploadProgressSubject.next(null);
            return event.body;

          default:
            return null;
        }
      }),
      catchError(error => {
        this.uploadProgressSubject.next(null);
        return throwError(() => this.handleUploadError(error));
      })
    );
  }

  /**
   * Valider le format et la taille du fichier
   */
  validateFile(file: File): string | null {
    if (!file) {
      return 'Aucun fichier sélectionné';
    }

    // Vérifier la taille
    if (file.size > this.MAX_FILE_SIZE) {
      return `Le fichier est trop volumineux. Taille maximum autorisée: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    // Vérifier l'extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.ACCEPTED_FORMATS.includes(fileExtension)) {
      return `Format de fichier non supporté. Formats acceptés: ${this.ACCEPTED_FORMATS.join(', ')}`;
    }

    return null;
  }

  /**
   * Vérifier si un fichier est un CSV
   */
  isCsvFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.csv');
  }

  /**
   * Vérifier si un fichier est un Excel
   */
  isExcelFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.xlsx') || name.endsWith('.xls');
  }

  /**
   * Obtenir une template CSV pour l'import de notes
   */
  getGradeImportTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/grades/import-template`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        return throwError(() => this.handleUploadError(error));
      })
    );
  }

  /**
   * Télécharger un fichier template
   */
  downloadTemplate(templateType: 'grades' | 'students' | 'teachers'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/templates/${templateType}`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        return throwError(() => this.handleUploadError(error));
      })
    );
  }

  /**
   * Créer et télécharger un template CSV pour l'import de notes
   */
  createGradeImportTemplate(): void {
    const csvContent = 'matricule,nom,note\n' +
                      'ETU001,Nom Exemple,15.5\n' +
                      'ETU002,Autre Exemple,12.0';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_notes.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Lire le contenu d'un fichier CSV (pour prévisualisation)
   */
  readCsvFile(file: File): Observable<string[][]> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n');
          const data = lines
            .filter(line => line.trim().length > 0)
            .map(line => line.split(',').map(cell => cell.trim()));
          
          observer.next(data);
          observer.complete();
        } catch (error) {
          observer.error(new Error('Erreur lors de la lecture du fichier CSV'));
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Erreur lors de la lecture du fichier'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Obtenir les formats acceptés
   */
  getAcceptedFormats(): string[] {
    return [...this.ACCEPTED_FORMATS];
  }

  /**
   * Obtenir la taille maximum de fichier
   */
  getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }

  /**
   * Formater la taille d'un fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Reset du progrès d'upload
   */
  resetUploadProgress(): void {
    this.uploadProgressSubject.next(null);
  }

  /**
   * Gestion des erreurs d'upload
   */
  private handleUploadError(error: any): Error {
    let errorMessage = 'Erreur lors de l\'upload du fichier';

    if (error.error) {
      if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error.error) {
        errorMessage = error.error.error;
      } else if (error.error.message) {
        errorMessage = error.error.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Error(errorMessage);
  }
}