import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConfigService } from '../core/config.service';
import { AuthService } from '../auth/auth.service';
import { Student } from './student.service';
import { Teacher } from './teacher.service';

// Interfaces pour les données de dashboard
 interface StudentDashboardData {
  student_info: {
    id: number;
    matricule: string;
    first_name: string;
    last_name: string;
    full_name: string;
    class_id: number;
    class_name: string;
    phone?: string;
    address?: string;
    birth_date?: string;
  };
  statistics: {
    total_grades: number;
    average: number;
    appreciations: {
      CA: number;
      CANT: number;
      NC: number;
    };
  };
  recent_grades: RecentGrade[];
}


interface TeacherDashboardData {
  teacher_info: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    phone?: string;
    address?: string;
    hire_date?: string;
    subjects: Subject[];
  };
  statistics: {
    total_grades_given: number;
    students_taught: number;
    subjects_taught: number;
  };
  recent_grades: RecentGrade[];
}

 export interface AdminDashboardData {
  general_statistics: {
    total_students: number;
    total_teachers: number;
    total_classes: number;
    total_subjects: number;
    total_grades: number;
  };
  classes_statistics: ClassStatistic[];
  recent_students: Student[]; // Add this
  recent_teachers: Teacher[]; // Add this
}

 interface RecentGrade {
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

 interface Subject {
  id: number;
  name: string;
  code: string;
  coefficient: number;
  description?: string;
  teacher_count: number;
}

 interface ClassStatistic {
  class_name: string;
  student_count: number;
  grades_count: number;
}

 interface DashboardSummary {
  total_entities: number;
  growth_rate?: number;
  trend: 'up' | 'down' | 'stable';
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private authService: AuthService
  ) {
    this.apiUrl = this.configService.getApiUrl();
  }

  /**
   * Obtenir les en-têtes HTTP avec le token d'authentification
   */
  private getHttpHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Obtenir le tableau de bord étudiant
   */
  getStudentDashboard(): Observable<StudentDashboardData> {
    const headers = this.getHttpHeaders();
    
    return this.http.get<StudentDashboardData>(
      `${this.apiUrl}/dashboard/student`,
      { headers }
    ).pipe(
      map(response => this.processStudentDashboard(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir le tableau de bord enseignant
   */
  getTeacherDashboard(): Observable<TeacherDashboardData> {
    const headers = this.getHttpHeaders();
    
    return this.http.get<TeacherDashboardData>(
      `${this.apiUrl}/dashboard/teacher`,
      { headers }
    ).pipe(
      map(response => this.processTeacherDashboard(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir le tableau de bord administrateur
   */
  getAdminDashboard(): Observable<AdminDashboardData> {
    const headers = this.getHttpHeaders();
    
    return this.http.get<AdminDashboardData>(
      `${this.apiUrl}/dashboard/admin`,
      { headers }
    ).pipe(
      map(response => this.processAdminDashboard(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir le tableau de bord selon le rôle de l'utilisateur
   */
  getCurrentUserDashboard(): Observable<StudentDashboardData | TeacherDashboardData | AdminDashboardData> {
    const userRole = this.authService.getUserRole();
    
    switch (userRole) {
      case 'student':
        return this.getStudentDashboard();
      case 'teacher':
        return this.getTeacherDashboard();
      case 'admin':
        return this.getAdminDashboard();
      default:
        return throwError(() => new Error('Rôle utilisateur non reconnu'));
    }
  }

  /**
   * Obtenir un résumé des statistiques pour les cartes du dashboard
   */
  getDashboardSummary(): Observable<DashboardSummary[]> {
    return this.getCurrentUserDashboard().pipe(
      map(dashboardData => this.createDashboardSummary(dashboardData)),
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir les données pour les graphiques du dashboard étudiant
   */
  getStudentChartData(): Observable<any> {
    return this.getStudentDashboard().pipe(
      map(data => ({
        gradesEvolution: this.processGradesEvolution(data.recent_grades),
        appreciationDistribution: this.processAppreciationDistribution(data.statistics.appreciations),
        subjectPerformance: this.processSubjectPerformance(data.recent_grades)
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir les données pour les graphiques du dashboard enseignant
   */
  getTeacherChartData(): Observable<any> {
    return this.getTeacherDashboard().pipe(
      map(data => ({
        gradesDistribution: this.processTeacherGradesDistribution(data.recent_grades),
        subjectsStats: this.processTeacherSubjectsStats(data.teacher_info.subjects),
        monthlyActivity: this.processMonthlyActivity(data.recent_grades)
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir les données pour les graphiques du dashboard admin
   */
  getAdminChartData(): Observable<any> {
    return this.getAdminDashboard().pipe(
      map(data => ({
        generalOverview: this.processGeneralOverview(data.general_statistics),
        classesComparison: this.processClassesComparison(data.classes_statistics),
        systemGrowth: this.processSystemGrowth(data)
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Traiter les données du dashboard étudiant
   */
  private processStudentDashboard(data: StudentDashboardData): StudentDashboardData {
    // Trier les notes récentes par date
    data.recent_grades = data.recent_grades.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Ajouter des données calculées
    data.statistics = {
      ...data.statistics,
      success_rate: this.calculateSuccessRate(data.statistics.appreciations),
      trend: this.calculateTrend(data.recent_grades)
    } as any;

    return data;
  }

  /**
   * Traiter les données du dashboard enseignant
   */
  private processTeacherDashboard(data: TeacherDashboardData): TeacherDashboardData {
    // Trier les notes récentes par date
    data.recent_grades = data.recent_grades.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Calculer des métriques supplémentaires
    const additionalStats = {
      average_grades_per_student: data.statistics.students_taught > 0 
        ? Math.round(data.statistics.total_grades_given / data.statistics.students_taught * 100) / 100
        : 0,
      most_active_subject: this.findMostActiveSubject(data.recent_grades)
    };

    data.statistics = { ...data.statistics, ...additionalStats } as any;

    return data;
  }

  /**
   * Traiter les données du dashboard admin
   */
  private processAdminDashboard(data: AdminDashboardData): AdminDashboardData {
    // Trier les statistiques de classes par nombre d'étudiants
    data.classes_statistics = data.classes_statistics.sort((a, b) => 
      b.student_count - a.student_count
    );

    // Calculer des métriques supplémentaires
    const totalStudentsInClasses = data.classes_statistics.reduce(
      (sum, cls) => sum + cls.student_count, 0
    );
    
    const averageStudentsPerClass = data.classes_statistics.length > 0
      ? Math.round(totalStudentsInClasses / data.classes_statistics.length * 100) / 100
      : 0;

    const additionalStats = {
      average_students_per_class: averageStudentsPerClass,
      total_grades_in_classes: data.classes_statistics.reduce(
        (sum, cls) => sum + cls.grades_count, 0
      )
    };

    data.general_statistics = { ...data.general_statistics, ...additionalStats } as any;

    return data;
  }

  /**
   * Créer un résumé pour les cartes du dashboard
   */
  private createDashboardSummary(dashboardData: any): DashboardSummary[] {
    const userRole = this.authService.getUserRole();
    
    if (userRole === 'student') {
      const data = dashboardData as StudentDashboardData;
      return [
        {
          total_entities: data.statistics.total_grades,
          label: 'Notes Total',
          trend: 'up'
        },
        {
          total_entities: data.statistics.average,
          label: 'Moyenne Générale',
          trend: data.statistics.average >= 10 ? 'up' : 'down'
        },
        {
          total_entities: data.statistics.appreciations.CA,
          label: 'Notes CA',
          trend: 'up'
        }
      ];
    } else if (userRole === 'teacher') {
      const data = dashboardData as TeacherDashboardData;
      return [
        {
          total_entities: data.statistics.total_grades_given,
          label: 'Notes Attribuées',
          trend: 'up'
        },
        {
          total_entities: data.statistics.students_taught,
          label: 'Étudiants Enseignés',
          trend: 'stable'
        },
        {
          total_entities: data.statistics.subjects_taught,
          label: 'Matières Enseignées',
          trend: 'stable'
        }
      ];
    } else {
      const data = dashboardData as AdminDashboardData;
      return [
        {
          total_entities: data.general_statistics.total_students,
          label: 'Total Étudiants',
          trend: 'up'
        },
        {
          total_entities: data.general_statistics.total_teachers,
          label: 'Total Enseignants',
          trend: 'stable'
        },
        {
          total_entities: data.general_statistics.total_classes,
          label: 'Total Classes',
          trend: 'stable'
        },
        {
          total_entities: data.general_statistics.total_grades,
          label: 'Total Notes',
          trend: 'up'
        }
      ];
    }
  }

  /**
   * Calculer le taux de réussite
   */
  private calculateSuccessRate(appreciations: { CA: number; CANT: number; NC: number }): number {
    const total = appreciations.CA + appreciations.CANT + appreciations.NC;
    return total > 0 ? Math.round((appreciations.CA / total) * 100) : 0;
  }

  /**
   * Calculer la tendance basée sur les notes récentes
   */
  private calculateTrend(recentGrades: RecentGrade[]): 'up' | 'down' | 'stable' {
    if (recentGrades.length < 2) return 'stable';
    
    const recent = recentGrades.slice(0, 3);
    const older = recentGrades.slice(3, 6);
    
    const recentAverage = recent.reduce((sum, grade) => sum + grade.value, 0) / recent.length;
    const olderAverage = older.length > 0 
      ? older.reduce((sum, grade) => sum + grade.value, 0) / older.length
      : recentAverage;
    
    if (recentAverage > olderAverage + 0.5) return 'up';
    if (recentAverage < olderAverage - 0.5) return 'down';
    return 'stable';
  }

  /**
   * Trouver la matière la plus active pour un enseignant
   */
  private findMostActiveSubject(recentGrades: RecentGrade[]): string {
    const subjectCounts = recentGrades.reduce((acc, grade) => {
      acc[grade.subject_name] = (acc[grade.subject_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(subjectCounts).reduce((a, b) => 
      subjectCounts[a] > subjectCounts[b] ? a : b
    ) || '';
  }

  /**
   * Traiter l'évolution des notes pour les graphiques
   */
  private processGradesEvolution(recentGrades: RecentGrade[]): any[] {
    const monthlyData = recentGrades.reduce((acc, grade) => {
      const month = new Date(grade.created_at).toLocaleString('fr-FR', { 
        month: 'short', 
        year: 'numeric' 
      });
      
      if (!acc[month]) {
        acc[month] = { total: 0, count: 0 };
      }
      
      acc[month].total += grade.value;
      acc[month].count += 1;
      
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
    
    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      average: Math.round((data.total / data.count) * 100) / 100
    }));
  }

  /**
   * Traiter la distribution des appréciations
   */
  private processAppreciationDistribution(appreciations: { CA: number; CANT: number; NC: number }): any[] {
    return [
      { name: 'CA', value: appreciations.CA, color: '#10B981' },
      { name: 'CANT', value: appreciations.CANT, color: '#F59E0B' },
      { name: 'NC', value: appreciations.NC, color: '#EF4444' }
    ];
  }

  /**
   * Traiter les performances par matière
   */
  private processSubjectPerformance(recentGrades: RecentGrade[]): any[] {
    const subjectData = recentGrades.reduce((acc, grade) => {
      if (!acc[grade.subject_name]) {
        acc[grade.subject_name] = { total: 0, count: 0 };
      }
      
      acc[grade.subject_name].total += grade.value;
      acc[grade.subject_name].count += 1;
      
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
    
    return Object.entries(subjectData).map(([subject, data]) => ({
      subject,
      average: Math.round((data.total / data.count) * 100) / 100,
      count: data.count
    }));
  }

  /**
   * Traiter la distribution des notes pour un enseignant
   */
  private processTeacherGradesDistribution(recentGrades: RecentGrade[]): any[] {
    const ranges = {
      '0-5': 0,
      '5-10': 0,
      '10-15': 0,
      '15-20': 0
    };
    
    recentGrades.forEach(grade => {
      if (grade.value < 5) ranges['0-5']++;
      else if (grade.value < 10) ranges['5-10']++;
      else if (grade.value < 15) ranges['10-15']++;
      else ranges['15-20']++;
    });
    
    return Object.entries(ranges).map(([range, count]) => ({
      range,
      count
    }));
  }

  /**
   * Traiter les statistiques des matières pour un enseignant
   */
  private processTeacherSubjectsStats(subjects: Subject[]): any[] {
    return subjects.map(subject => ({
      name: subject.name,
      coefficient: subject.coefficient,
      code: subject.code
    }));
  }

  /**
   * Traiter l'activité mensuelle
   */
  private processMonthlyActivity(recentGrades: RecentGrade[]): any[] {
    const monthlyActivity = recentGrades.reduce((acc, grade) => {
      const month = new Date(grade.created_at).toLocaleString('fr-FR', { 
        month: 'short' 
      });
      
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(monthlyActivity).map(([month, count]) => ({
      month,
      count
    }));
  }

  /**
   * Traiter la vue d'ensemble générale pour l'admin
   */
  private processGeneralOverview(generalStats: any): any[] {
    return [
      { label: 'Étudiants', value: generalStats.total_students },
      { label: 'Enseignants', value: generalStats.total_teachers },
      { label: 'Classes', value: generalStats.total_classes },
      { label: 'Matières', value: generalStats.total_subjects },
      { label: 'Notes', value: generalStats.total_grades }
    ];
  }

  /**
   * Traiter la comparaison des classes
   */
  private processClassesComparison(classesStats: ClassStatistic[]): any[] {
    return classesStats.map(cls => ({
      className: cls.class_name,
      studentCount: cls.student_count,
      gradesCount: cls.grades_count,
      averageGradesPerStudent: cls.student_count > 0 
        ? Math.round((cls.grades_count / cls.student_count) * 100) / 100 
        : 0
    }));
  }

  /**
   * Traiter la croissance du système
   */
  private processSystemGrowth(data: AdminDashboardData): any[] {
    // Données simulées pour la démonstration
    // En production, ces données viendraient d'une API dédiée
    return [
      { period: 'Jan', students: Math.floor(data.general_statistics.total_students * 0.7) },
      { period: 'Feb', students: Math.floor(data.general_statistics.total_students * 0.8) },
      { period: 'Mar', students: Math.floor(data.general_statistics.total_students * 0.9) },
      { period: 'Avr', students: data.general_statistics.total_students }
    ];
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError = (error: any): Observable<never> => {
    console.error('Erreur Dashboard Service:', error);
    
    let errorMessage = 'Une erreur est survenue lors du chargement du tableau de bord';
    
    if (error.status === 401) {
      errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      this.authService.logout();
    } else if (error.status === 403) {
      errorMessage = 'Accès non autorisé à cette ressource.';
    } else if (error.status === 404) {
      errorMessage = 'Données du tableau de bord non trouvées.';
    } else if (error.status === 0) {
      errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    }
    
    return throwError(() => new Error(errorMessage));
  };
}