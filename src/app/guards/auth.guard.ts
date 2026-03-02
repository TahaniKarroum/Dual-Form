import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    const check = () => {
      if (authService.loading()) {
        setTimeout(check, 100);
        return;
      }
      if (authService.isAuthenticated) {
        resolve(true);
      } else {
        router.navigate(['/']);
        resolve(false);
      }
    };
    check();
  });
};
