import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

// Interfaces de configuration
export interface AppConfig {
  apiUrl: string;
  appName: string;
  version: string;
  production: boolean;
  features: FeatureFlags;
  ui: UIConfig;
  validation: ValidationConfig;
  pagination: PaginationConfig;
  fileUpload: FileUploadConfig;
  security: SecurityConfig;
}

export interface FeatureFlags {
  enableGradeImport: boolean;
  enableReports: boolean;
  enableNotifications: boolean;
  enableFileExport: boolean;
  enableAdvancedSearch: boolean;
  enableDarkMode: boolean;
  enableMultiLanguage: boolean;
}

export interface UIConfig {
  defaultPageSize: number;
  maxPageSize: number;
  showConfirmDialogs: boolean;
  autoSaveInterval: number; // en millisecondes
  toastDuration: number; // en millisecondes
  loadingDelay: number; // en millisecondes
  dateFormat: string;
  timeFormat: string;
  currency: string;
  locale: string;
}

export interface ValidationConfig {
  passwordMinLength: number;
  passwordMaxLength: number;
  usernameMinLength: number;
  usernameMaxLength: number;
  emailMaxLength: number;
  phonePattern: string;
  matriculePattern: string;
  gradeMin: number;
  gradeMax: number;
  coefficientMin: number;
  coefficientMax: number;
}

export interface PaginationConfig {
  defaultPage: number;
  defaultSize: number;
  pageSizeOptions: number[];
  showFirstLastButtons: boolean;
  showPageSizeSelector: boolean;
}

export interface FileUploadConfig {
  maxSizeBytes: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  maxFilesCount: number;
}

export interface SecurityConfig {
  tokenStorageKey: string;
  tokenExpirationBuffer: number; // en minutes
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly config: AppConfig;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Charger la configuration depuis les environnements et les constantes
   */
  private loadConfiguration(): AppConfig {
    return {
      apiUrl: environment.apiUrl || 'http://localhost:5000/api',
      appName: environment.appName || 'Système de Gestion Scolaire',
      version: environment.version || '1.0.0',
      production: environment.production,
      
      features: {
        enableGradeImport: environment.features?.enableGradeImport ?? true,
        enableReports: environment.features?.enableReports ?? true,
        enableNotifications: environment.features?.enableNotifications ?? true,
        enableFileExport: environment.features?.enableFileExport ?? true,
        enableAdvancedSearch: environment.features?.enableAdvancedSearch ?? true,
        enableDarkMode: environment.features?.enableDarkMode ?? false,
        enableMultiLanguage: environment.features?.enableMultiLanguage ?? false
      },

      ui: {
        defaultPageSize: 10,
        maxPageSize: 100,
        showConfirmDialogs: true,
        autoSaveInterval: 30000, // 30 secondes
        toastDuration: 5000, // 5 secondes
        loadingDelay: 300, // 300ms
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        currency: 'FCFA',
        locale: 'fr-FR'
      },

      validation: {
        passwordMinLength: 6,
        passwordMaxLength: 128,
        usernameMinLength: 3,
        usernameMaxLength: 50,
        emailMaxLength: 120,
        phonePattern: '^[+]?[0-9]{8,15}$',
        matriculePattern: '^[A-Z0-9]{6,12}$',
        gradeMin: 0,
        gradeMax: 20,
        coefficientMin: 0.5,
        coefficientMax: 10
      },

      pagination: {
        defaultPage: 1,
        defaultSize: 10,
        pageSizeOptions: [5, 10, 20, 50, 100],
        showFirstLastButtons: true,
        showPageSizeSelector: true
      },

      fileUpload: {
        maxSizeBytes: 5 * 1024 * 1024, // 5MB
        allowedTypes: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv'
        ],
        allowedExtensions: ['.xlsx', '.xls', '.csv'],
        maxFilesCount: 1
      },

      security: {
        tokenStorageKey: 'school_auth_token',
        tokenExpirationBuffer: 5, // 5 minutes avant expiration
        sessionTimeoutMinutes: 60,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15
      }
    };
  }

  /**
   * Obtenir l'URL de base de l'API
   */
  getApiUrl(): string {
    return this.config.apiUrl;
  }

  /**
   * Obtenir la configuration complète
   */
  getAppConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Obtenir le nom de l'application
   */
  getAppName(): string {
    return this.config.appName;
  }

  /**
   * Obtenir la version de l'application
   */
  getVersion(): string {
    return this.config.version;
  }

  /**
   * Vérifier si l'application est en mode production
   */
  isProduction(): boolean {
    return this.config.production;
  }

  /**
   * Obtenir les flags de fonctionnalités
   */
  getFeatureFlags(): FeatureFlags {
    return { ...this.config.features };
  }

  /**
   * Vérifier si une fonctionnalité est activée
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.config.features[feature];
  }

  /**
   * Obtenir la configuration de l'interface utilisateur
   */
  getUIConfig(): UIConfig {
    return { ...this.config.ui };
  }

  /**
   * Obtenir la configuration de validation
   */
  getValidationConfig(): ValidationConfig {
    return { ...this.config.validation };
  }

  /**
   * Obtenir la configuration de pagination
   */
  getPaginationConfig(): PaginationConfig {
    return { ...this.config.pagination };
  }

  /**
   * Obtenir la configuration d'upload de fichiers
   */
  getFileUploadConfig(): FileUploadConfig {
    return { ...this.config.fileUpload };
  }

  /**
   * Obtenir la configuration de sécurité
   */
  getSecurityConfig(): SecurityConfig {
    return { ...this.config.security };
  }

  /**
   * Obtenir l'URL complète d'un endpoint
   */
  getEndpointUrl(endpoint: string): string {
    const baseUrl = this.config.apiUrl.endsWith('/') 
      ? this.config.apiUrl.slice(0, -1) 
      : this.config.apiUrl;
    const cleanEndpoint = endpoint.startsWith('/') 
      ? endpoint.slice(1) 
      : endpoint;
    return `${baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Obtenir les endpoints principaux
   */
  getEndpoints() {
    const base = this.config.apiUrl;
    return {
      auth: {
        login: `${base}/auth/login`,
        profile: `${base}/auth/profile`,
        logout: `${base}/auth/logout`
      },
      students: `${base}/students`,
      teachers: `${base}/teachers`,
      classes: `${base}/classes`,
      subjects: `${base}/subjects`,
      grades: `${base}/grades`,
      dashboard: {
        student: `${base}/dashboard/student`,
        teacher: `${base}/dashboard/teacher`,
        admin: `${base}/dashboard/admin`
      },
      reports: `${base}/reports`,
      import: `${base}/grades/import`
    };
  }

  /**
   * Formater une date selon la configuration
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat(this.config.ui.locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  /**
   * Formater une heure selon la configuration
   */
  formatTime(date: Date): string {
    return new Intl.DateTimeFormat(this.config.ui.locale, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  /**
   * Formater un nombre selon la locale
   */
  formatNumber(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat(this.config.ui.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Obtenir la taille maximale de fichier formatée
   */
  getMaxFileSizeFormatted(): string {
    const sizeInMB = this.config.fileUpload.maxSizeBytes / (1024 * 1024);
    return `${sizeInMB}MB`;
  }

  /**
   * Valider la taille d'un fichier
   */
  isFileSizeValid(fileSize: number): boolean {
    return fileSize <= this.config.fileUpload.maxSizeBytes;
  }

  /**
   * Valider le type d'un fichier
   */
  isFileTypeValid(fileType: string, fileName: string): boolean {
    const typeValid = this.config.fileUpload.allowedTypes.includes(fileType);
    const extensionValid = this.config.fileUpload.allowedExtensions.some(ext => 
      fileName.toLowerCase().endsWith(ext.toLowerCase())
    );
    return typeValid || extensionValid;
  }

  /**
   * Obtenir les rôles d'utilisateur disponibles
   */
  getUserRoles(): Array<{value: string, label: string}> {
    return [
      { value: 'admin', label: 'Administrateur' },
      { value: 'teacher', label: 'Enseignant' },
      { value: 'student', label: 'Étudiant' }
    ];
  }

  /**
   * Obtenir les types d'examens disponibles
   */
  getExamTypes(): Array<{value: string, label: string}> {
    return [
      { value: 'CC', label: 'Contrôle Continu' },
      { value: 'DS', label: 'Devoir Surveillé' },
      { value: 'EXAMEN', label: 'Examen Final' },
      { value: 'TP', label: 'Travaux Pratiques' },
      { value: 'PROJET', label: 'Projet' }
    ];
  }

  /**
   * Obtenir les semestres disponibles
   */
  getSemesters(): Array<{value: string, label: string}> {
    return [
      { value: 'S1', label: '1er Semestre' },
      { value: 'S2', label: '2ème Semestre' }
    ];
  }

  /**
   * Obtenir les niveaux de classe disponibles
   */
  getClassLevels(): Array<{value: string, label: string}> {
    return [
      { value: 'L1', label: 'Licence 1' },
      { value: 'L2', label: 'Licence 2' },
      { value: 'L3', label: 'Licence 3' },
      { value: 'M1', label: 'Master 1' },
      { value: 'M2', label: 'Master 2' }
    ];
  }

  /**
   * Obtenir les années académiques (dynamique)
   */
  getAcademicYears(): Array<{value: string, label: string}> {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      const nextYear = year + 1;
      const value = `${year}-${nextYear}`;
      const label = `${year}/${nextYear}`;
      years.push({ value, label });
    }
    
    return years;
  }

  /**
   * Obtenir l'année académique courante
   */
  getCurrentAcademicYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    // Si on est entre septembre et décembre, on est dans l'année académique courante
    // Sinon, on est dans l'année académique suivante
    const academicYear = now.getMonth() >= 8 ? currentYear : currentYear - 1;
    return `${academicYear}-${academicYear + 1}`;
  }

  /**
   * Obtenir les formats d'export disponibles
   */
  getExportFormats(): Array<{value: string, label: string, icon?: string}> {
    return [
      { value: 'pdf', label: 'PDF', icon: 'picture_as_pdf' },
      { value: 'excel', label: 'Excel', icon: 'table_chart' },
      { value: 'csv', label: 'CSV', icon: 'description' }
    ];
  }

  /**
   * Logger les erreurs selon l'environnement
   */
  logError(error: any, context?: string): void {
    if (!this.config.production) {
      console.error(`[${context || 'App'}] Error:`, error);
    }
    // En production, vous pourriez envoyer les erreurs à un service de monitoring
  }

  /**
   * Logger les informations selon l'environnement
   */
  logInfo(message: string, data?: any): void {
    if (!this.config.production) {
      console.log(`[App] ${message}`, data || '');
    }
  }
}