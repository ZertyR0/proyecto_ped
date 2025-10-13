import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router'; 
import { AuthService, TutorLoginData } from '../../services/auth.service'; 
import { fetchSignInMethodsForEmail } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  // --- Inyección de servicios ---
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // --- Definición del formulario ---
  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  // --- Variables de estado ---
  loading = false;
  error = '';
  successMessage = '';

  ngOnInit() {
    // Verificar si hay mensaje de éxito desde el registro
    this.route.queryParams.subscribe(params => {
      if (params['mensaje']) {
        this.successMessage = params['mensaje'];
        // Limpiar el mensaje después de 5 segundos
        setTimeout(() => this.successMessage = '', 5000);
      }
    });
  }

  // --- Función para el formulario de Email/Contraseña ---
   async submit() {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    
    // Obtenemos email y password del formulario
    const { email, password } = this.form.value;

    try {
      const credentials: TutorLoginData = { email, password };
      await this.auth.login(credentials);
      this.router.navigate(['/perfil']);

    } catch (e: any) {
      // Pasamos el objeto de error completo 'e' y el 'email' a nuestro traductor ---
      this.error = await this.firebaseErrorToText(e, email);
    } finally {
      this.loading = false;
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

      // LA DECISIÓN: Basado en la respuesta, redirigimos.
      if (isNewUser) {
        // Si es un usuario nuevo, lo mandamos a la pantalla para que complete sus datos.
        this.router.navigate(['/completar-perfil']);
      } else {
        // Si ya es un usuario existente, lo mandamos directo al perfil.
        this.router.navigate(['/perfil']);
      }

    } catch (e: any) {
      this.error = await this.firebaseErrorToText(e, '');
    } finally {
      this.loading = false;
    }
  }
  
  // --- Función auxiliar para traducir errores de Firebase a español ---
  private async firebaseErrorToText(error: any, email: string): Promise<string> {
    const code = error.code;

    // ---  Usamos el código de error correcto que nos dio la consola ---
    if (code === 'auth/invalid-login-credentials') {
      // Verificamos si el usuario quizás se registró con Google.
      try {
        const methods = await fetchSignInMethodsForEmail(this.auth.authInstance, email);
        if (methods.includes('google.com')) {
          return 'Ese correo fue registrado con Google. Por favor, usa el botón "Continuar con Google".';
        } else {
          // Si no, damos un mensaje combinado que es más seguro.
          return 'El correo o la contraseña son incorrectos.';
        }
      } catch {
        return 'El correo o la contraseña son incorrectos.';
      }
    }
    
    if (code === 'auth/invalid-email') {
      return 'El correo electrónico no es válido.';
    }

    // Un mensaje por defecto para cualquier otro error.
    return 'Ocurrió un error al iniciar sesión.';
  }
}
