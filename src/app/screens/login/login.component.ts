import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router'; // 
import { AuthService, TutorLoginData } from '../../services/auth.service'; 

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  // --- Inyección de servicios ---
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router); // 

  // --- Definición del formulario ---
  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  // --- Variables de estado ---
  loading = false;
  error = '';

  // --- Función para el formulario de Email/Contraseña ---
  async submit() {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;

    try {
      // CREAMOS UN OBJETO que cumple con la interfaz 'TutorLoginData'
      const credentials: TutorLoginData = {
        email: this.form.value.email!,
        password: this.form.value.password!
      };

      // LLAMAMOS AL SERVICIO con 'await' y pasamos el objeto
      await this.auth.login(credentials);
      
      // Si todo sale bien, redirigimos al usuario
      this.router.navigate(['/servicios']); // O a la ruta que prefieras

    } catch (e: any) {
      // MANEJAMOS EL ERROR específico de Firebase
      this.error = this.firebaseErrorToText(e.code);
    } finally {
      this.loading = false; // Esto se ejecuta siempre, haya éxito o error
    }
  }

  // --- NUEVA FUNCIÓN para el botón de Google ---
  async loginWithGoogle() {
    this.error = '';
    this.loading = true;
    try {
      const result = await this.auth.loginWithGoogle();
      const isNewUser = !(await this.auth.checkGoogleUserProfile(result.user));

      if (isNewUser) {
        // Si es nuevo, lo mandamos a completar su perfil
        this.router.navigate(['/registro']);
      } else {
        // Si ya existía, va directo al panel principal
        this.router.navigate(['/servicios']);
      }
    } catch (e: any) {
      this.error = this.firebaseErrorToText(e.code);
    } finally {
      this.loading = false;
    }
  }
  
  // --- Función auxiliar para traducir errores de Firebase a español ---
  private firebaseErrorToText(code: string): string {
    switch (code) {
      case 'auth/wrong-password':
        return 'La contraseña es incorrecta.';
      case 'auth/user-not-found':
        return 'No se encontró ningún usuario con este correo.';
      case 'auth/invalid-email':
        return 'El correo electrónico no es válido.';
      default:
        return 'Ocurrió un error al iniciar sesión.';
    }
  }
}