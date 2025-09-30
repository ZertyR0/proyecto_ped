Firebase Auth (Google) Setup

1) Crea un proyecto en Firebase Console y habilita Authentication > Sign-in method > Google.
2) Copia las claves del SDK Web y pega en `src/environments/environment.ts` y `environment.prod.ts` en la clave `firebase`.
3) (Opcional) Configura dominios autorizados para localhost y tu dominio de producción.

Notas:
- Este proyecto inicializa AngularFire en `AppModule` y expone `AuthService` con `googleSignIn()` y `logout()`.
- El botón “Continuar con Google” ya llama a `AuthService.googleSignIn()` y redirige a /inicio.
- Para proteger rutas, usa `AuthGuard` (archivo `src/app/services/auth.guard.ts`).
