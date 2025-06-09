import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  constructor() { }

  /**
   * Valide un format d'email
   */
  validateEmail(email: string): boolean {
    if (!email) return false;
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Valide un numéro de téléphone (format camerounais et international)
   */
  validatePhone(phone: string): boolean {
    if (!phone) return false;
    
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    
    // Format camerounais: 6XXXXXXXX ou +237XXXXXXXXX
    const cameroonRegex = /^(\+237)?[26][0-9]{8}$/;
    
    // Format international général
    const internationalRegex = /^\+[1-9]\d{1,14}$/;
    
    return cameroonRegex.test(cleanPhone) || internationalRegex.test(cleanPhone);
  }

  /**
   * Valide un matricule d'étudiant (format: LETTRES + CHIFFRES)
   */
  validateMatricule(matricule: string): boolean {
    if (!matricule) return false;
    
    const cleanMatricule = matricule.trim().toUpperCase();
    
    // Format: 2-4 lettres suivies de 4-8 chiffres (ex: ABC1234, XY123456)
    const matriculeRegex = /^[A-Z]{2,4}[0-9]{4,8}$/;
    
    return matriculeRegex.test(cleanMatricule);
  }

  /**
   * Valide une note (0-20)
   */
  validateGrade(grade: number | string): boolean {
    if (grade === null || grade === undefined || grade === '') return false;
    
    const numGrade = typeof grade === 'string' ? parseFloat(grade) : grade;
    
    return !isNaN(numGrade) && numGrade >= 0 && numGrade <= 20;
  }

  /**
   * Valide un mot de passe (minimum 6 caractères, au moins une lettre et un chiffre)
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Le mot de passe est requis');
      return { isValid: false, errors };
    }

    if (password.length < 6) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }

    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Valide un nom d'utilisateur
   */
  validateUsername(username: string): boolean {
    if (!username) return false;
    
    // 3-30 caractères, lettres, chiffres, underscore et tiret autorisés
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    
    return usernameRegex.test(username.trim());
  }

  /**
   * Valide un nom ou prénom
   */
  validateName(name: string): boolean {
    if (!name) return false;
    
    const cleanName = name.trim();
    
    // 2-50 caractères, lettres, espaces, tirets et apostrophes autorisés
    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-\']{2,50}$/;
    
    return nameRegex.test(cleanName);
  }

  /**
   * Valide une date de naissance (pas dans le futur, âge raisonnable)
   */
  validateBirthDate(birthDate: string | Date): boolean {
    if (!birthDate) return false;
    
    const date = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    
    return date instanceof Date && 
           !isNaN(date.getTime()) && 
           date <= today && 
           date >= minDate;
  }

  /**
   * Valide un code de matière
   */
  validateSubjectCode(code: string): boolean {
    if (!code) return false;
    
    const cleanCode = code.trim().toUpperCase();
    
    // 2-10 caractères, lettres et chiffres
    const codeRegex = /^[A-Z0-9]{2,10}$/;
    
    return codeRegex.test(cleanCode);
  }

  /**
   * Valide un coefficient (nombre positif)
   */
  validateCoefficient(coefficient: number | string): boolean {
    if (coefficient === null || coefficient === undefined || coefficient === '') return false;
    
    const numCoeff = typeof coefficient === 'string' ? parseFloat(coefficient) : coefficient;
    
    return !isNaN(numCoeff) && numCoeff > 0 && numCoeff <= 10;
  }

  /**
   * Valide une année académique (format: YYYY-YYYY)
   */
  validateAcademicYear(year: string): boolean {
    if (!year) return false;
    
    const yearRegex = /^20\d{2}-20\d{2}$/;
    
    if (!yearRegex.test(year)) return false;
    
    const [startYear, endYear] = year.split('-').map(y => parseInt(y));
    
    return endYear === startYear + 1;
  }

  /**
   * Valide un semestre
   */
  validateSemester(semester: string): boolean {
    if (!semester) return false;
    
    const validSemesters = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
    
    return validSemesters.includes(semester.toUpperCase());
  }

  /**
   * Valide le niveau d'une classe
   */
  validateClassLevel(level: string): boolean {
    if (!level) return false;
    
    const validLevels = [
      'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2', // Primaire
      '6ème', '5ème', '4ème', '3ème', // Collège
      '2nde', '1ère', 'Tle', // Lycée
      'L1', 'L2', 'L3', 'M1', 'M2' // Université
    ];
    
    return validLevels.includes(level);
  }

  /**
   * Valide un type d'examen
   */
  validateExamType(examType: string): boolean {
    if (!examType) return false;
    
    const validExamTypes = ['CC', 'DS', 'Examen', 'TP', 'TD', 'Projet', 'Oral'];
    
    return validExamTypes.includes(examType);
  }

  /**
   * Valide un rôle utilisateur
   */
  validateUserRole(role: string): boolean {
    if (!role) return false;
    
    const validRoles = ['admin', 'teacher', 'student'];
    
    return validRoles.includes(role.toLowerCase());
  }

  /**
   * Nettoie et valide une chaîne de caractères générique
   */
  sanitizeString(input: string, maxLength: number = 255): string {
    if (!input) return '';
    
    return input.trim().substring(0, maxLength);
  }

  /**
   * Valide un fichier uploadé (CSV/Excel pour import de notes)
   */
  validateUploadFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!file) {
      errors.push('Aucun fichier sélectionné');
      return { isValid: false, errors };
    }

    // Vérifier l'extension
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push('Format de fichier non supporté. Utilisez CSV, XLSX ou XLS');
    }

    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      errors.push('Le fichier est trop volumineux (max 5MB)');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Valide un objet étudiant complet
   */
  validateStudentData(student: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.validateName(student.first_name)) {
      errors.push('Prénom invalide');
    }

    if (!this.validateName(student.last_name)) {
      errors.push('Nom invalide');
    }

    if (!this.validateMatricule(student.matricule)) {
      errors.push('Matricule invalide');
    }

    if (!this.validateEmail(student.email)) {
      errors.push('Email invalide');
    }

    if (student.phone && !this.validatePhone(student.phone)) {
      errors.push('Numéro de téléphone invalide');
    }

    if (student.birth_date && !this.validateBirthDate(student.birth_date)) {
      errors.push('Date de naissance invalide');
    }

    if (!student.class_id || student.class_id <= 0) {
      errors.push('Classe non sélectionnée');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Valide un objet enseignant complet
   */
  validateTeacherData(teacher: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.validateName(teacher.first_name)) {
      errors.push('Prénom invalide');
    }

    if (!this.validateName(teacher.last_name)) {
      errors.push('Nom invalide');
    }

    if (!this.validateEmail(teacher.email)) {
      errors.push('Email invalide');
    }

    if (teacher.phone && !this.validatePhone(teacher.phone)) {
      errors.push('Numéro de téléphone invalide');
    }

    if (teacher.hire_date && !this.validateBirthDate(teacher.hire_date)) {
      errors.push('Date d\'embauche invalide');
    }

    if (!teacher.subject_ids || teacher.subject_ids.length === 0) {
      errors.push('Aucune matière assignée');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Valide un objet note complet
   */
  validateGradeData(grade: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.validateGrade(grade.value)) {
      errors.push('Note invalide (0-20)');
    }

    if (!grade.student_id || grade.student_id <= 0) {
      errors.push('Étudiant non sélectionné');
    }

    if (!grade.subject_id || grade.subject_id <= 0) {
      errors.push('Matière non sélectionnée');
    }

    if (!this.validateSemester(grade.semester)) {
      errors.push('Semestre invalide');
    }

    if (!this.validateAcademicYear(grade.academic_year)) {
      errors.push('Année académique invalide');
    }

    if (grade.exam_type && !this.validateExamType(grade.exam_type)) {
      errors.push('Type d\'examen invalide');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Génère des messages d'erreur personnalisés
   */
  getErrorMessage(field: string, value: any): string {
    const errorMessages: { [key: string]: string } = {
      'email': 'Veuillez saisir une adresse email valide',
      'phone': 'Veuillez saisir un numéro de téléphone valide',
      'matricule': 'Le matricule doit contenir 2-4 lettres suivies de 4-8 chiffres',
      'grade': 'La note doit être comprise entre 0 et 20',
      'password': 'Le mot de passe doit contenir au moins 6 caractères',
      'username': 'Le nom d\'utilisateur doit contenir 3-30 caractères',
      'name': 'Le nom doit contenir 2-50 caractères',
      'birth_date': 'Veuillez saisir une date de naissance valide',
      'subject_code': 'Le code matière doit contenir 2-10 caractères alphanumériques',
      'coefficient': 'Le coefficient doit être un nombre positif',
      'academic_year': 'L\'année académique doit être au format YYYY-YYYY',
      'semester': 'Le semestre doit être S1, S2, S3, S4, S5 ou S6'
    };

    return errorMessages[field] || `La valeur '${value}' n'est pas valide pour le champ '${field}'`;
  }
}