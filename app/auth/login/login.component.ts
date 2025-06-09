import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    NgIf
  ]
})
export class LoginComponent {
  credentials = {
    username: '',
    password: ''
  };

  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // Récupérer le rôle depuis la réponse de l'API
        const userRole = this.authService.getUserRole();
        
        // Redirection basée sur le rôle réel
        if (userRole) {
          this.router.navigate([`/${userRole}`]);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Identifiants incorrects ou compte inactif';
        console.error('Erreur de connexion:', err);
      }
    });
  }
}