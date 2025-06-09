import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService, AdminDashboardData } from '../../services/api/dashboard.service';
import { TeacherService, Teacher, CreateTeacherRequest, UpdateTeacherRequest } from '../../services/api/teacher.service';
import { StudentService, Student, CreateStudentRequest, UpdateStudentRequest } from '../../services/api/student.service';
import { ClassService, Class } from '../../services/api/class.service';
import { SubjectService, Subject, CreateSubjectRequest, UpdateSubjectRequest } from '../../services/api/subject.service';
import { NotificationService } from '../../services/core/notification.service';
import { Subject as RxSubject, takeUntil, forkJoin } from 'rxjs';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  data?: any;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  address?: string;
  created_at: string;
  is_active: boolean;
}

interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
}

interface UpdateAdminRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
}

@Component({
  selector: 'app-admin',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit, OnDestroy {
  private destroy$ = new RxSubject<void>();
  
  // Navigation
  activeTab = 'statistics';
  public Math = Math;
  
  // Data
  adminDashboardData: AdminDashboardData | null = null;
  chartData: any = null;
  loading = true;
  error: string | null = null;

  // CRUD Data
  teachers: Teacher[] = [];
  students: Student[] = [];
  classes: Class[] = [];
  subjects: Subject[] = [];
  admins: AdminUser[] = [];
  
  // Loading states
  teachersLoading = false;
  studentsLoading = false;
  classesLoading = false;
  adminsLoading = false;
  
  // Modal states
  teacherModal: ModalState = { isOpen: false, mode: 'create' };
  studentModal: ModalState = { isOpen: false, mode: 'create' };
  classModal: ModalState = { isOpen: false, mode: 'create' };
  adminModal: ModalState = { isOpen: false, mode: 'create' };
  
  // Forms
  teacherForm!: FormGroup;
  studentForm!: FormGroup;
  classForm!: FormGroup;
  adminForm!: FormGroup;

  // Search and filters
  teacherSearchTerm = '';
  studentSearchTerm = '';
  classSearchTerm = '';
  adminSearchTerm = '';
  selectedClassFilter = '';

  // Tab configuration
  tabs = [
    { id: 'statistics', label: 'Statistiques Générales', icon: 'bi-graph-up' },
    { id: 'admins', label: 'Gestion Admins', icon: 'bi-people-fill' },
    { id: 'teachers', label: 'Gestion Enseignants', icon: 'bi-person-badge' },
    { id: 'students', label: 'Gestion Étudiants', icon: 'bi-mortarboard' },
    { id: 'classes', label: 'Gestion Classes', icon: 'bi-building' },
    { id: 'schedules', label: 'Emplois du Temps', icon: 'bi-calendar3' }
  ];

  constructor(
    private dashboardService: DashboardService,
    private teacherService: TeacherService,
    private studentService: StudentService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadClasses();
    this.loadSubjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.teacherForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      address: [''],
      hire_date: [''],
      subject_ids: [[], [Validators.required]]
    });

    this.studentForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      matricule: ['', [Validators.required, Validators.pattern(/^[A-Z]{2,4}[0-9]{4,8}$/)]],
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      class_id: ['', [Validators.required]],
      phone: [''],
      address: [''],
      birth_date: ['']
    });

    this.classForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      level: ['', [Validators.required]],
      academic_year: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{4}$/)]]
    });

    this.adminForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      address: ['']
    });
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    
    // Load data when switching to specific tabs
    if (tabId === 'teachers' && this.teachers.length === 0) {
      this.loadTeachers();
    } else if (tabId === 'students' && this.students.length === 0) {
      this.loadStudents();
    } else if (tabId === 'classes' && this.classes.length === 0) {
      this.loadClasses();
    } else if (tabId === 'admins' && this.admins.length === 0) {
      this.loadAdmins();
    }
  }

  private loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getAdminDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.adminDashboardData = data;
          this.loadChartData();
          this.loading = false;
        },
        error: (error) => {
          this.error = error.message;
          this.loading = false;
          this.notificationService.error('Erreur lors du chargement du tableau de bord');
        }
      });
  }

  private loadChartData(): void {
    this.dashboardService.getAdminChartData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.chartData = data;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données graphiques:', error);
        }
      });
  }

  private loadClasses(): void {
    this.classesLoading = true;
    
    this.classService.getAllClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (classes) => {
          this.classes = classes;
          this.classesLoading = false;
        },
        error: (error) => {
          this.classesLoading = false;
          console.error('Erreur lors du chargement des classes:', error);
        }
      });
  }

  private loadSubjects(): void {
    this.subjectService.getAllSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subjects) => {
          this.subjects = subjects;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des matières:', error);
        }
      });
  }

  // ==================== TEACHERS CRUD ====================

  private loadTeachers(): void {
    this.teachersLoading = true;
    
    this.teacherService.getAllTeachers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (teachers) => {
          this.teachers = teachers;
          this.teachersLoading = false;
        },
        error: (error) => {
          this.teachersLoading = false;
          this.notificationService.error('Erreur lors du chargement des enseignants');
          console.error('Erreur teachers:', error);
        }
      });
  }

  openTeacherModal(mode: 'create' | 'edit' | 'view', teacher?: Teacher): void {
    this.teacherModal = { isOpen: true, mode, data: teacher };
    
    if (mode === 'create') {
      this.teacherForm.reset();
      this.teacherForm.get('password')?.enable();
    } else if (mode === 'edit' && teacher) {
      this.teacherForm.patchValue({
        username: teacher.full_name || '',
        email: teacher.address || '',
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        phone: teacher.phone || '',
        address: teacher.address || '',
        hire_date: teacher.hire_date || '',
        subject_ids: teacher.subjects.map(s => s.id)
      });
      this.teacherForm.get('password')?.disable();
    }
  }

  closeTeacherModal(): void {
    this.teacherModal.isOpen = false;
    this.teacherForm.reset();
  }

  saveTeacher(): void {
    if (this.teacherForm.invalid) {
      this.markFormGroupTouched(this.teacherForm);
      return;
    }

    const formValue = this.teacherForm.value;
    
    if (this.teacherModal.mode === 'create') {
      const createData: CreateTeacherRequest = {
        username: formValue.username,
        email: formValue.email,
        password: formValue.password,
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        phone: formValue.phone,
        address: formValue.address,
        hire_date: formValue.hire_date,
        subject_ids: formValue.subject_ids
      };

      this.teacherService.createTeacher(createData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (teacher) => {
            this.teachers.push(teacher);
            this.closeTeacherModal();
            this.notificationService.success('Enseignant créé avec succès');
          },
          error: (error) => {
            this.notificationService.error('Erreur lors de la création de l\'enseignant');
            console.error('Erreur création teacher:', error);
          }
        });
    } else if (this.teacherModal.mode === 'edit' && this.teacherModal.data) {
      const updateData: UpdateTeacherRequest = {
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        phone: formValue.phone,
        address: formValue.address,
        hire_date: formValue.hire_date,
        subject_ids: formValue.subject_ids
      };

      this.teacherService.updateTeacher(this.teacherModal.data.id, updateData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedTeacher) => {
            const index = this.teachers.findIndex(t => t.id === updatedTeacher.id);
            if (index !== -1) {
              this.teachers[index] = updatedTeacher;
            }
            this.closeTeacherModal();
            this.notificationService.success('Enseignant mis à jour avec succès');
          },
          error: (error) => {
            this.notificationService.error('Erreur lors de la mise à jour de l\'enseignant');
            console.error('Erreur update teacher:', error);
          }
        });
    }
  }

  deleteTeacher(teacher: Teacher): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'enseignant ${teacher.full_name} ?`)) {
      this.teacherService.deleteTeacher(teacher.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.teachers = this.teachers.filter(t => t.id !== teacher.id);
            this.notificationService.success('Enseignant supprimé avec succès');
          },
          error: (error) => {
            this.notificationService.error('Erreur lors de la suppression de l\'enseignant');
            console.error('Erreur delete teacher:', error);
          }
        });
    }
  }

  get filteredTeachers(): Teacher[] {
    return this.teachers.filter(teacher => {
      const searchMatch = !this.teacherSearchTerm || 
        teacher.full_name.toLowerCase().includes(this.teacherSearchTerm.toLowerCase()) ||
        teacher.subjects.some(s => s.name.toLowerCase().includes(this.teacherSearchTerm.toLowerCase()));
      
      return searchMatch;
    });
  }

  // ==================== STUDENTS CRUD ====================

  private loadStudents(): void {
    this.studentsLoading = true;
    
    this.studentService.getAllStudents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (students) => {
          this.students = students;
          this.studentsLoading = false;
        },
        error: (error) => {
          this.studentsLoading = false;
          this.notificationService.error('Erreur lors du chargement des étudiants');
          console.error('Erreur students:', error);
        }
      });
  }

  openStudentModal(mode: 'create' | 'edit' | 'view', student?: Student): void {
    this.studentModal = { isOpen: true, mode, data: student };
    
    if (mode === 'create') {
      this.studentForm.reset();
      this.studentForm.get('password')?.enable();
    } else if (mode === 'edit' && student) {
      this.studentForm.patchValue({
        username: student.full_name || '',
        email: student.address || '',
        matricule: student.matricule,
        first_name: student.first_name,
        last_name: student.last_name,
        class_id: student.class_id,
        phone: student.phone || '',
        address: student.address || '',
        birth_date: student.birth_date || ''
      });
      this.studentForm.get('password')?.disable();
    }
  }

  closeStudentModal(): void {
    this.studentModal.isOpen = false;
    this.studentForm.reset();
  }

  saveStudent(): void {
    if (this.studentForm.invalid) {
      this.markFormGroupTouched(this.studentForm);
      return;
    }

    const formValue = this.studentForm.value;
    
    if (this.studentModal.mode === 'create') {
      const createData: CreateStudentRequest = {
        username: formValue.username,
        email: formValue.email,
        password: formValue.password,
        matricule: formValue.matricule,
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        class_id: parseInt(formValue.class_id),
        phone: formValue.phone,
        address: formValue.address,
        birth_date: formValue.birth_date
      };

      this.studentService.createStudent(createData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (student) => {
            this.students.push(student);
            this.closeStudentModal();
            this.notificationService.success('Étudiant créé avec succès');
          },
          error: (error) => {
            this.notificationService.error('Erreur lors de la création de l\'étudiant');
            console.error('Erreur création student:', error);
          }
        });
    } else if (this.studentModal.mode === 'edit' && this.studentModal.data) {
      const updateData: UpdateStudentRequest = {
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        class_id: parseInt(formValue.class_id),
        phone: formValue.phone,
        address: formValue.address,
        birth_date: formValue.birth_date
      };

      this.studentService.updateStudent(this.studentModal.data.id, updateData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedStudent) => {
            const index = this.students.findIndex(s => s.id === updatedStudent.id);
            if (index !== -1) {
              this.students[index] = updatedStudent;
            }
            this.closeStudentModal();
            this.notificationService.success('Étudiant mis à jour avec succès');
          },
          error: (error) => {
            this.notificationService.error('Erreur lors de la mise à jour de l\'étudiant');
            console.error('Erreur update student:', error);
          }
        });
    }
  }

  deleteStudent(student: Student): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'étudiant ${student.full_name} ?`)) {
      this.studentService.deleteStudent(student.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.students = this.students.filter(s => s.id !== student.id);
            this.notificationService.success('Étudiant supprimé avec succès');
          },
          error: (error) => {
            this.notificationService.error('Erreur lors de la suppression de l\'étudiant');
            console.error('Erreur delete student:', error);
          }
        });
    }
  }

  get filteredStudents(): Student[] {
    return this.students.filter(student => {
      const searchMatch = !this.studentSearchTerm || 
        student.full_name.toLowerCase().includes(this.studentSearchTerm.toLowerCase()) ||
        student.matricule.toLowerCase().includes(this.studentSearchTerm.toLowerCase());
      
      const classMatch = !this.selectedClassFilter || 
        student.class_id.toString() === this.selectedClassFilter;
      
      return searchMatch && classMatch;
    });
  }

  // ==================== CLASSES CRUD ====================

  openClassModal(mode: 'create' | 'edit' | 'view', classData?: Class): void {
    this.classModal = { isOpen: true, mode, data: classData };
    
    if (mode === 'create') {
      this.classForm.reset();
      // Set default academic year
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      this.classForm.patchValue({ academic_year: academicYear });
    } else if (mode === 'edit' && classData) {
      this.classForm.patchValue({
        name: classData.name,
        level: classData.level,
        academic_year: classData.academic_year
      });
    }
  }

  closeClassModal(): void {
    this.classModal.isOpen = false;
    this.classForm.reset();
  }

  saveClass(): void {
    if (this.classForm.invalid) {
      this.markFormGroupTouched(this.classForm);
      return;
    }

    const formValue = this.classForm.value;
    
    if (this.classModal.mode === 'create') {
      this.classService.createClass(formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newClass) => {
            this.classes.push(newClass);
            this.closeClassModal();
            this.notificationService.success('Classe créée avec succès');
          },
          error: (error) => {
            this.notificationService.error('Erreur lors de la création de la classe');
            console.error('Erreur création class:', error);
          }
        });
    } else if (this.classModal.mode === 'edit' && this.classModal.data) {
      this.classService.updateClass(this.classModal.data.id, formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedClass) => {
            const index = this.classes.findIndex(c => c.id === updatedClass.id);
            if (index !== -1) {
              this.classes[index] = updatedClass;
            }
            this.closeClassModal();
            this.notificationService.success('Classe mise à jour avec succès');
          },
          error: (error) => {
            this.notificationService.error('Erreur lors de la mise à jour de la classe');
            console.error('Erreur update class:', error);
          }
        });
    }
  }

  deleteClass(classData: Class): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la classe ${classData.name} ?`)) {
      this.classService.deleteClass(classData.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.classes = this.classes.filter(c => c.id !== classData.id);
            this.notificationService.success('Classe supprimée avec succès');
          },
          error: (error) => {
            this.notificationService.error('Erreur lors de la suppression de la classe');
            console.error('Erreur delete class:', error);
          }
        });
    }
  }

  get filteredClasses(): Class[] {
    return this.classes.filter(classData => {
      const searchMatch = !this.classSearchTerm || 
        classData.name.toLowerCase().includes(this.classSearchTerm.toLowerCase()) ||
        classData.level.toLowerCase().includes(this.classSearchTerm.toLowerCase());
      
      return searchMatch;
    });
  }

  // ==================== ADMINS CRUD ====================

  private loadAdmins(): void {
    this.adminsLoading = true;
    // Simulate admin data since we don't have a specific admin service
    // In a real application, you would have an AdminService
    setTimeout(() => {
      this.admins = [
        {
          id: 1,
          username: 'admin1',
          email: 'admin1@school.com',
          first_name: 'Jean',
          last_name: 'Dupont',
          full_name: 'Jean Dupont',
          phone: '+237123456789',
          address: 'Yaoundé, Cameroun',
          created_at: '2024-01-15T10:00:00Z',
          is_active: true
        },
        {
          id: 2,
          username: 'admin2',
          email: 'admin2@school.com',
          first_name: 'Marie',
          last_name: 'Martin',
          full_name: 'Marie Martin',
          phone: '+237987654321',
          address: 'Douala, Cameroun',
          created_at: '2024-02-20T14:30:00Z',
          is_active: true
        }
      ];
      this.adminsLoading = false;
    }, 1000);
  }

  openAdminModal(mode: 'create' | 'edit' | 'view', admin?: AdminUser): void {
    this.adminModal = { isOpen: true, mode, data: admin };
    
    if (mode === 'create') {
      this.adminForm.reset();
      this.adminForm.get('password')?.enable();
    } else if (mode === 'edit' && admin) {
      this.adminForm.patchValue({
        username: admin.username,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        phone: admin.phone || '',
        address: admin.address || ''
      });
      this.adminForm.get('password')?.disable();
    }
  }

  closeAdminModal(): void {
    this.adminModal.isOpen = false;
    this.adminForm.reset();
  }

  saveAdmin(): void {
    if (this.adminForm.invalid) {
      this.markFormGroupTouched(this.adminForm);
      return;
    }

    const formValue = this.adminForm.value;
    
    if (this.adminModal.mode === 'create') {
      // Simulate admin creation
      const newAdmin: AdminUser = {
        id: this.admins.length + 1,
        username: formValue.username,
        email: formValue.email,
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        full_name: `${formValue.first_name} ${formValue.last_name}`,
        phone: formValue.phone,
        address: formValue.address,
        created_at: new Date().toISOString(),
        is_active: true
      };
      
      this.admins.push(newAdmin);
      this.closeAdminModal();
      this.notificationService.success('Administrateur créé avec succès');
    } else if (this.adminModal.mode === 'edit' && this.adminModal.data) {
      // Simulate admin update
      const index = this.admins.findIndex(a => a.id === this.adminModal.data.id);
      if (index !== -1) {
        this.admins[index] = {
          ...this.admins[index],
          first_name: formValue.first_name,
          last_name: formValue.last_name,
          full_name: `${formValue.first_name} ${formValue.last_name}`,
          phone: formValue.phone,
          address: formValue.address
        };
      }
      this.closeAdminModal();
      this.notificationService.success('Administrateur mis à jour avec succès');
    }
  }

  deleteAdmin(admin: AdminUser): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'administrateur ${admin.full_name} ?`)) {
      this.admins = this.admins.filter(a => a.id !== admin.id);
      this.notificationService.success('Administrateur supprimé avec succès');
    }
  }

  get filteredAdmins(): AdminUser[] {
    return this.admins.filter(admin => {
      const searchMatch = !this.adminSearchTerm || 
        admin.full_name.toLowerCase().includes(this.adminSearchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(this.adminSearchTerm.toLowerCase()) ||
        admin.username.toLowerCase().includes(this.adminSearchTerm.toLowerCase());
      
      return searchMatch;
    });
  }

  // ==================== UTILITY METHODS ====================

  refreshData(): void {
    this.loadDashboardData();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} est requis`;
      if (field.errors['email']) return 'Email invalide';
      if (field.errors['minlength']) return `${fieldName} trop court`;
      if (field.errors['pattern']) return `Format de ${fieldName} invalide`;
    }
    return '';
  }

  getClassNameById(classId: number): string {
    const classObj = this.classes.find(c => c.id === classId);
    return classObj ? classObj.name : 'Classe inconnue';
  }

  // Utility methods for statistics
  getGrowthTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('fr-FR').format(num);
  }

  calculatePercentage(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }

  // Enhanced utility methods
  getCircleProgress(percentage: number): string {
    const circumference = 2 * Math.PI * 25; // radius = 25
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    return strokeDasharray;
  }

  // TrackBy functions for performance optimization
  trackByTabId(index: number, tab: any): string {
    return tab.id;
  }

  trackByClassName(index: number, classStats: any): string {
    return classStats.class_name;
  }

  trackByStudentId(index: number, student: any): string {
    return student.matricule || student.id || index.toString();
  }

  trackByTeacherId(index: number, teacher: any): string {
    return teacher.id || teacher.full_name || index.toString();
  }

  trackByClassId(index: number, classData: any): string {
    return classData.id || classData.name || index.toString();
  }

  trackByAdminId(index: number, admin: any): string {
    return admin.id || admin.username || index.toString();
  }

  // Mock methods for future functionality
  handleAdminAction(action: string): void {
    if (action === 'create') {
      this.openAdminModal('create');
    }
  }

  handleTeacherAction(action: string): void {
    if (action === 'create') {
      this.openTeacherModal('create');
    }
  }

  handleStudentAction(action: string): void {
    if (action === 'create') {
      this.openStudentModal('create');
    }
  }

  handleClassAction(action: string): void {
    if (action === 'create') {
      this.openClassModal('create');
    }
  }

  handleScheduleAction(action: string): void {
    console.log(`Action emploi du temps: ${action}`);
    // TODO: Implement schedule management
  }
}