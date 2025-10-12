import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (route, state): Observable<boolean> => {
  // Inyectamos los servicios que necesitamos: Auth para Firebase y Router para redirigir.
  const auth = inject(Auth);
  const router = inject(Router);

  // Usamos 'authState', un observable que nos dice en tiempo real si hay un usuario o no.
  return authState(auth).pipe(
    map(user => {
      // Usamos 'map' para transformar la respuesta (user o null).
      if (user) {
        // Si 'user' existe, significa que el usuario ha iniciado sesión.
        // El guardián devuelve 'true' y permite el acceso a la ruta.
        return true;
      } else {
        // Si 'user' es nulo, no hay sesión iniciada.
        // Redirigimos al usuario a la página de login.
        router.navigate(['/login']);
        // El guardián devuelve 'false' y bloquea el acceso a la ruta protegida.
        return false;
      }
    })
  );
};