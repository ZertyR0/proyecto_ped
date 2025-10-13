import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { switchMap, take } from 'rxjs/operators';
import { authState } from '@angular/fire/auth';

export const dentistGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authState(authService.authInstance).pipe(
    // Usamos take(1) para tomar solo el primer estado del usuario y evitar bucles
    take(1),
    // Reemplazamos 'map' con 'switchMap' para manejar la Promise interna
    switchMap(async (user) => {
      if (user) {
        // La lógica interna no cambia
        const userProfile = await authService.getUserProfile(user.uid);
        if (userProfile && userProfile['rol'] === 'dentista') {
          return true; // PERMITIDO: Es un dentista
        } else {
          // NO PERMITIDO: Es un tutor, lo mandamos a su dashboard
          router.navigate(['/perfil']);
          return false;
        }
      } else {
        // NO PERMITIDO: No ha iniciado sesión
        router.navigate(['/login']);
        return false;
      }
    })
  );
};

