import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router'; 
import { AuthService, TutorRegisterData } from '../../services/auth.service'; 

// Creamos una función fuera del componente para validar que las contraseñas coincidan
export function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  // Si no son iguales, devolvemos un objeto de error; si son iguales, devolvemos null
  return password === confirmPassword ? null : { passwordsMismatch: true };
}

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
    apellidoP: ['', [Validators.required]],
    apellidoM: [''],
    telefono: ['', [
      Validators.required,
      Validators.minLength(10), // Longitud mínima de 10 dígitos
      Validators.maxLength(10), // Longitud máxima de 10 dígitos
      Validators.pattern('^[0-9]*$') // Solo permite números
    ]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    // Hijos
    hijos: this.fb.array([this.nuevoHijo()], Validators.required) // Añadimos validador
  }, { validators: passwordsMatchValidator });

  

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

  formatPhoneNumber(event: any): void {
    const input = event.target;
    
    // 1. Limpiamos el valor: quitamos todo lo que NO sea un dígito (\D)
    //    y nos aseguramos de que no tenga más de 10 dígitos.
    const digitsOnly = input.value.replace(/\D/g, '').substring(0, 10);

    // 2. Guardamos el valor limpio (solo números) en el control del formulario.
    //    Esto es lo que se enviará a la base de datos.
    //    { emitEvent: false } evita un bucle infinito de actualizaciones.
    this.form.controls['telefono'].setValue(digitsOnly, { emitEvent: false });
 
    // 3. Aplicamos el formato visual XXX-XXX-XXXX
    let formattedValue = digitsOnly;
    if (digitsOnly.length > 6) {
      formattedValue = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else if (digitsOnly.length > 3) {
      formattedValue = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    }

    // 4. Mostramos el valor formateado en el campo de texto.
    input.value = formattedValue;
  }

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

        // Redirigir al usuario al nuevo screen
        this.router.navigate(['/servicios']);
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