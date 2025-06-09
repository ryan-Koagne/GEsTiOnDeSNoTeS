import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';
// Interfaces pour les emplois du temps
export interface Schedule {
  id: number;
  class_id: number;
  class_name: string;
  teacher_id: number;
  teacher_name: string;
  subject_id: number;
  subject_name: string;
  day_of_week: string; // 'MONDAY', 'TUESDAY', etc.
  start_time: string; // Format HH:MM
  end_time: string; // Format HH:MM
  academic_year: string;
  semester: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateScheduleRequest {
  class_id: number;
  teacher_id: number;
  subject_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  academic_year: string;
  semester: string;
}

export interface UpdateScheduleRequest {
  class_id?: number;
  teacher_id?: number;
  subject_id?: number;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  academic_year?: string;
  semester?: string;
}

export interface ScheduleConflict {
  type: 'teacher' | 'class' | 'room';
  message: string;
  conflicting_schedule: Schedule;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private apiUrl = `${environment.apiUrl}/schedules`;
  private readonly TOKEN_KEY = 'school_auth_token';

  // Créneaux horaires standards
  private readonly TIME_SLOTS: TimeSlot[] = [
    { start_time: '08:00', end_time: '10:00', label: '08h00 - 10h00' },
    { start_time: '10:15', end_time: '12:15', label: '10h15 - 12h15' },
    { start_time: '14:00', end_time: '16:00', label: '14h00 - 16h00' },
    { start_time: '16:15', end_time: '18:15', label: '16h15 - 18h15' }
  ];

  // Jours de la semaine
  private readonly DAYS_OF_WEEK = [
    { value: 'MONDAY', label: 'Lundi' },
    { value: 'TUESDAY', label: 'Mardi' },
    { value: 'WEDNESDAY', label: 'Mercredi' },
    { value: 'THURSDAY', label: 'Jeudi' },
    { value: 'FRIDAY', label: 'Vendredi' },
    { value: 'SATURDAY', label: 'Samedi' }
  ];

  constructor(private http: HttpClient) {}

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
   * Récupère tous les emplois du temps
   */
  getAllSchedules(): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère un emploi du temps par ID
   */
  getSchedule(scheduleId: number): Observable<Schedule> {
    return this.http.get<Schedule>(`${this.apiUrl}/${scheduleId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crée un nouvel emploi du temps
   */
  createSchedule(scheduleData: CreateScheduleRequest): Observable<Schedule> {
    return this.http.post<Schedule>(this.apiUrl, scheduleData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour un emploi du temps
   */
  updateSchedule(scheduleId: number, scheduleData: UpdateScheduleRequest): Observable<Schedule> {
    return this.http.put<Schedule>(`${this.apiUrl}/${scheduleId}`, scheduleData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprime un emploi du temps
   */
  deleteSchedule(scheduleId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${scheduleId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère l'emploi du temps d'une classe
   */
  getClassSchedule(classId: number, semester?: string, academicYear?: string): Observable<Schedule[]> {
    let url = `${this.apiUrl}/class/${classId}`;
    const params = new URLSearchParams();
    
    if (semester) params.append('semester', semester);
    if (academicYear) params.append('academic_year', academicYear);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.http.get<Schedule[]>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère l'emploi du temps d'un enseignant
   */
  getTeacherSchedule(teacherId: number, semester?: string, academicYear?: string): Observable<Schedule[]> {
    let url = `${this.apiUrl}/teacher/${teacherId}`;
    const params = new URLSearchParams();
    
    if (semester) params.append('semester', semester);
    if (academicYear) params.append('academic_year', academicYear);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.http.get<Schedule[]>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Vérifie les conflits avant création/modification
   */
  checkConflicts(scheduleData: CreateScheduleRequest | UpdateScheduleRequest, excludeId?: number): Observable<ScheduleConflict[]> {
    const url = excludeId ? `${this.apiUrl}/check-conflicts/${excludeId}` : `${this.apiUrl}/check-conflicts`;
    
    return this.http.post<ScheduleConflict[]>(url, scheduleData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtient les créneaux horaires disponibles
   */
  getTimeSlots(): TimeSlot[] {
    return [...this.TIME_SLOTS];
  }

  /**
   * Obtient les jours de la semaine
   */
  getDaysOfWeek(): Array<{value: string, label: string}> {
    return [...this.DAYS_OF_WEEK];
  }

  /**
   * Formate l'emploi du temps en grille hebdomadaire
   */
  formatWeeklyGrid(schedules: Schedule[]): {[day: string]: {[timeSlot: string]: Schedule | null}} {
    const grid: {[day: string]: {[timeSlot: string]: Schedule | null}} = {};
    
    // Initialiser la grille
    this.DAYS_OF_WEEK.forEach(day => {
      grid[day.value] = {};
      this.TIME_SLOTS.forEach(slot => {
        grid[day.value][slot.start_time] = null;
      });
    });

    // Remplir la grille avec les emplois du temps
    schedules.forEach(schedule => {
      if (grid[schedule.day_of_week] && grid[schedule.day_of_week][schedule.start_time] !== undefined) {
        grid[schedule.day_of_week][schedule.start_time] = schedule;
      }
    });

    return grid;
  }

  /**
   * Valide les données d'emploi du temps
   */
  validateScheduleData(scheduleData: CreateScheduleRequest | UpdateScheduleRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if ('class_id' in scheduleData && (!scheduleData.class_id || scheduleData.class_id <= 0)) {
      errors.push('La classe est obligatoire');
    }

    if ('teacher_id' in scheduleData && (!scheduleData.teacher_id || scheduleData.teacher_id <= 0)) {
      errors.push('L\'enseignant est obligatoire');
    }

    if ('subject_id' in scheduleData && (!scheduleData.subject_id || scheduleData.subject_id <= 0)) {
      errors.push('La matière est obligatoire');
    }

    if ('day_of_week' in scheduleData && !this.DAYS_OF_WEEK.find(d => d.value === scheduleData.day_of_week)) {
      errors.push('Jour de la semaine invalide');
    }

    if ('start_time' in scheduleData && 'end_time' in scheduleData) {
      if (scheduleData.start_time && scheduleData.end_time) {
        if (scheduleData.start_time >= scheduleData.end_time) {
          errors.push('L\'heure de fin doit être après l\'heure de début');
        }
      }
    }

    if ('academic_year' in scheduleData && scheduleData.academic_year) {
      const yearPattern = /^\d{4}-\d{4}$/;
      if (!yearPattern.test(scheduleData.academic_year)) {
        errors.push('Format d\'année académique invalide (YYYY-YYYY)');
      }
    }

    if ('semester' in scheduleData && scheduleData.semester) {
      if (!['S1', 'S2'].includes(scheduleData.semester)) {
        errors.push('Semestre invalide (S1 ou S2)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtient les statistiques d'emploi du temps
   */
  getScheduleStatistics(): Observable<{
    total_schedules: number;
    schedules_by_day: {[day: string]: number};
    teacher_workload: {teacher_name: string; hours_per_week: number}[];
    class_coverage: {class_name: string; hours_per_week: number}[];
  }> {
    return this.getAllSchedules().pipe(
      map(schedules => {
        const stats = {
          total_schedules: schedules.length,
          schedules_by_day: {} as {[day: string]: number},
          teacher_workload: [] as {teacher_name: string; hours_per_week: number}[],
          class_coverage: [] as {class_name: string; hours_per_week: number}[]
        };

        // Compter par jour
        this.DAYS_OF_WEEK.forEach(day => {
          stats.schedules_by_day[day.value] = schedules.filter(s => s.day_of_week === day.value).length;
        });

        // Calculer la charge de travail des enseignants
        const teacherHours: {[teacherId: number]: {name: string; hours: number}} = {};
        const classHours: {[classId: number]: {name: string; hours: number}} = {};

        schedules.forEach(schedule => {
          const duration = this.calculateDuration(schedule.start_time, schedule.end_time);
          
          // Enseignants
          if (!teacherHours[schedule.teacher_id]) {
            teacherHours[schedule.teacher_id] = {
              name: schedule.teacher_name,
              hours: 0
            };
          }
          teacherHours[schedule.teacher_id].hours += duration;

          // Classes
          if (!classHours[schedule.class_id]) {
            classHours[schedule.class_id] = {
              name: schedule.class_name,
              hours: 0
            };
          }
          classHours[schedule.class_id].hours += duration;
        });

        stats.teacher_workload = Object.values(teacherHours).map(t => ({
          teacher_name: t.name,
          hours_per_week: t.hours
        }));

        stats.class_coverage = Object.values(classHours).map(c => ({
          class_name: c.name,
          hours_per_week: c.hours
        }));

        return stats;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Calcule la durée entre deux heures
   */
  private calculateDuration(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Heures
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

    console.error('Erreur ScheduleService:', error);
    return throwError(() => new Error(errorMessage));
  };
}