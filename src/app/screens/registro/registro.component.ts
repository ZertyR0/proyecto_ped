import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router'; 
import { AuthService, TutorRegisterData } from '../../services/auth.service'; 

@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent {
  // --- Inyección de dependencias ---
  private fb = inject(FormBuilder);
  private auth = inject(AuthService); 
  private router = inject(Router);

  // --- Definición del formulario ---
  form: FormGroup = this.fb.group({
    // Datos del tutor
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    //AJUSTAMOS LOS NOMBRES para que coincidan con la interfaz TutorRegisterData
    apellidoP: ['', [Validators.required]],
    apellidoM: [''],
    telefono: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    // Hijos
    hijos: this.fb.array([this.nuevoHijo()], Validators.required) // Añadimos validador
  });

  // --- Métodos del FormArray ---
  get hijos(): FormArray { return this.form.get('hijos') as FormArray; }

  nuevoHijo(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required]],
      apellidoPaterno: ['', [Validators.required]],
      apellidoMaterno: [''],
      fechaNacimiento: ['', [Validators.required]],
      sexo: ['M', [Validators.required]],
      alergias: ['']
    });
  }

  agregarHijo() { this.hijos.push(this.nuevoHijo()); }
  eliminarHijo(i: number) { if (this.hijos.length > 1) { this.hijos.removeAt(i); } }

  // --- Variables de estado ---
  loading = false;
  errorMsg = '';

  // LÓGICA DEL SUBMIT COMPLETAMENTE REESCRITA PARA FIREBASE ---
  async submit() {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;

    try {
      // Separamos los datos del tutor y de los hijos
      const formValue = this.form.value;
      const tutorData: TutorRegisterData = {
        nombre: formValue.nombre,
        apellidoP: formValue.apellidoP,
        apellidoM: formValue.apellidoM,
        telefono: formValue.telefono,
        email: formValue.email,
        password: formValue.password
      };
      const childrenData = formValue.hijos;

      // Registrar al tutor en Auth y Firestore (datos personales)
      const userCredential = await this.auth.register(tutorData);

      if (userCredential && userCredential.user) {
        // Si el registro fue exitoso, guardar los datos de los hijos
        const userId = userCredential.user.uid;
        await this.auth.saveChildrenData(userId, childrenData);

        // Cerrar sesión después del registro para que el usuario inicie sesión manualmente
        await this.auth.logout();
        
        // Redirigir al login con mensaje de éxito
        this.router.navigate(['/login'], { 
          queryParams: { mensaje: 'Registro exitoso. Por favor, inicia sesión.' }
        });
      } else {
        throw new Error('No se pudo crear la cuenta de usuario.');
      }

    } catch (e: any) {
      this.errorMsg = this.firebaseErrorToText(e.code);
    } finally {
      this.loading = false;
    }
  }

  // --- Función auxiliar para traducir errores ---
  private firebaseErrorToText(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este correo electrónico ya está en uso.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'El correo electrónico no es válido.';
      default:
        return 'Ocurrió un error inesperado al registrar la cuenta.';
    }
  }
}