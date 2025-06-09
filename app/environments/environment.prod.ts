// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com/api',
  appName: 'Système de Gestion Scolaire',
  version: '1.0.0',
  
  // Configuration JWT
  jwtTokenKey: 'school_app_token',
  tokenExpirationKey: 'school_app_token_exp',
  
  // Configuration des uploads
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFileTypes: ['.csv', '.xlsx', '.xls'],
  
  // Configuration pagination
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  
  // Configuration des notes
  gradeScale: {
    min: 0,
    max: 20,
    passGrade: 10
  },
  
  // Configuration des appréciations
  appreciations: {
    'CA': { label: 'Compétence Acquise', color: 'success', minGrade: 10 },
    'CANT': { label: 'Compétence en Acquisition', color: 'warning', minGrade: 7 },
    'NC': { label: 'Non Conforme', color: 'danger', minGrade: 0 }
  },
  
  // Configuration des semestres
  semesters: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  
  // Configuration des types d'examens
  examTypes: [
    { value: 'CC', label: 'Contrôle Continu' },
    { value: 'DS', label: 'Devoir Surveillé' },
    { value: 'Examen', label: 'Examen' },
    { value: 'TP', label: 'Travaux Pratiques' },
    { value: 'TD', label: 'Travaux Dirigés' },
    { value: 'Projet', label: 'Projet' },
    { value: 'Oral', label: 'Oral' }
  ],
  
  // Configuration des niveaux de classe
  classLevels: [
    // Primaire
    { value: 'CP1', label: 'CP1', category: 'Primaire' },
    { value: 'CP2', label: 'CP2', category: 'Primaire' },
    { value: 'CE1', label: 'CE1', category: 'Primaire' },
    { value: 'CE2', label: 'CE2', category: 'Primaire' },
    { value: 'CM1', label: 'CM1', category: 'Primaire' },
    { value: 'CM2', label: 'CM2', category: 'Primaire' },
    
    // Collège
    { value: '6ème', label: '6ème', category: 'Collège' },
    { value: '5ème', label: '5ème', category: 'Collège' },
    { value: '4ème', label: '4ème', category: 'Collège' },
    { value: '3ème', label: '3ème', category: 'Collège' },
    
    // Lycée
    { value: '2nde', label: '2nde', category: 'Lycée' },
    { value: '1ère', label: '1ère', category: 'Lycée' },
    { value: 'Tle', label: 'Terminale', category: 'Lycée' },
    
    // Université
    { value: 'L1', label: 'Licence 1', category: 'Université' },
    { value: 'L2', label: 'Licence 2', category: 'Université' },
    { value: 'L3', label: 'Licence 3', category: 'Université' },
    { value: 'M1', label: 'Master 1', category: 'Université' },
    { value: 'M2', label: 'Master 2', category: 'Université' }
  ],
  
  // Configuration des rôles
  userRoles: [
    { value: 'admin', label: 'Administrateur', permissions: ['*'] },
    { value: 'teacher', label: 'Enseignant', permissions: ['grades:create', 'grades:read', 'grades:update', 'students:read'] },
    { value: 'student', label: 'Étudiant', permissions: ['grades:read:own', 'profile:read:own'] }
  ],
  
  // Messages de succès/erreur par défaut
  messages: {
    success: {
      create: 'Élément créé avec succès',
      update: 'Élément mis à jour avec succès',
      delete: 'Élément supprimé avec succès',
      import: 'Import effectué avec succès',
      export: 'Export effectué avec succès',
      login: 'Connexion réussie'
    },
    error: {
      generic: 'Une erreur s\'est produite',
      network: 'Erreur de connexion au serveur',
      unauthorized: 'Accès non autorisé',
      forbidden: 'Action interdite',
      notFound: 'Élément non trouvé',
      validation: 'Données invalides',
      fileUpload: 'Erreur lors de l\'upload du fichier'
    }
  },
  
  // Configuration des notifications
  notifications: {
    duration: 3000, // 3 secondes
    position: 'top-right',
    showClose: true
  },
  
  // Configuration du cache
  cache: {
    enabled: true,
    duration: 10 * 60 * 1000, // 10 minutes en production
    keys: {
      classes: 'app_classes',
      subjects: 'app_subjects',
      currentUser: 'app_current_user'
    }
  },
  
  // Configuration des rapports
  reports: {
    defaultFormat: 'pdf',
    supportedFormats: ['pdf', 'csv', 'excel'],
    defaultAcademicYear: '2024-2025'
  },
  
  // Logs et debug (désactivés en production)
  logging: {
    enabled: false,
    level: 'error', // Seulement les erreurs en production
    api: false,
    errors: true
  },
  
  // Configuration des validations (même qu'en dev)
  validation: {
    phone: {
      cameroonFormat: /^(\+237)?[26][0-9]{8}$/,
      internationalFormat: /^\+[1-9]\d{1,14}$/
    },
    matricule: {
      format: /^[A-Z]{2,4}[0-9]{4,8}$/,
      minLength: 6,
      maxLength: 12
    },
    password: {
      minLength: 6,
      requireLetter: true,
      requireNumber: true,
      requireSpecialChar: false
    },
    name: {
      minLength: 2,
      maxLength: 50,
      format: /^[a-zA-ZÀ-ÿ\s\-\']+$/
    }
  }
};
