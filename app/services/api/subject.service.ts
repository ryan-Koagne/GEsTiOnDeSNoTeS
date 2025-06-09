import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Subject {
  id: number;
  name: string;
  code: string;
  coefficient: number;
  description?: string;
  teacher_count: number;
}

export interface CreateSubjectRequest {
  name: string;
  code: string;
  coefficient: number;
  description?: string;
}

export interface UpdateSubjectRequest {
  name?: string;
  code?: string;
  coefficient?: number;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private apiUrl = `${environment.apiUrl}/subjects`;
  private readonly TOKEN_KEY = 'school_auth_token';

  constructor(private http: HttpClient) {}

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getAllSubjects(): Observable<Subject[]> {
    return this.http.get<Subject[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getSubject(subjectId: number): Observable<Subject> {
    return this.http.get<Subject>(`${this.apiUrl}/${subjectId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  createSubject(subjectData: CreateSubjectRequest): Observable<Subject> {
    return this.http.post<Subject>(this.apiUrl, subjectData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  updateSubject(subjectId: number, subjectData: UpdateSubjectRequest): Observable<Subject> {
    return this.http.put<Subject>(`${this.apiUrl}/${subjectId}`, subjectData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  deleteSubject(subjectId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${subjectId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('Erreur SubjectService:', error);
    return throwError(() => new Error(errorMessage));
  };
}