import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { AdminComponent } from './dashboards/admin/admin.component';
import { EnseignantComponent } from './dashboards/enseignant/enseignant.component';
import { EtudiantComponent } from './dashboards/etudiant/etudiant.component';
import { authGuard } from './guards/auth.guard'; // Import du guard

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'teacher',
    component: EnseignantComponent,
    canActivate: [authGuard],
    data: { roles: ['teacher'] }
  },
  {
    path: 'student',
    component: EtudiantComponent,
    canActivate: [authGuard],
    data: { roles: ['student'] }
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
