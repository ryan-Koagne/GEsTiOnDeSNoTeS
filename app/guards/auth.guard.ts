import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles = route.data['roles'] as string[];

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const userRole = authService.getUserRole();
  if (expectedRoles.includes(userRole!)) {
    return true;
  }

  // Si l'utilisateur est authentifié mais n'a pas le bon rôle
  router.navigate(['/login']);
  return false;
};
