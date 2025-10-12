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
      // Primero, inicia la sesión con Google. Esto crea la cuenta en Firebase Auth.
      const result = await this.auth.loginWithGoogle();
      
      // Luego, revisamos si el perfil de este usuario ya existe en nuestra base de datos Firestore.
      //    La función devuelve 'false' si es un usuario nuevo.
      const isNewUser = !(await this.auth.checkGoogleUserProfile(result.user));

      // 3. LA DECISIÓN: Basado en la respuesta, redirigimos.
      if (isNewUser) {
        // Si es un usuario nuevo, lo mandamos a la pantalla para que complete sus datos.
        this.router.navigate(['/completar-perfil']);
      } else {
        // Si ya es un usuario existente, lo mandamos directo al panel servicios (provisional).
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