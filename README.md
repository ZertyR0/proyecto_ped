# Autenticación con Google (Firebase)

1. Crea un proyecto en Firebase Console y habilita Google como proveedor de Auth.
2. Copia las credenciales Web y pégalas en `src/environments/environment.ts` y `environment.prod.ts`:

```
export const environment = {
	production: false,
	firebase: {
		apiKey: '...'
		// ... resto de campos
	}
};
```

3. (Opcional) Configura dominios autorizados y SHA si usas apps nativas.
4. Ejecuta la app y prueba el botón “Continuar con Google”.

> Nota: Ya hay `AuthService` con `googleSignIn()` y el módulo inicializa Firebase y Auth.
# ProyectoPed

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.14.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
