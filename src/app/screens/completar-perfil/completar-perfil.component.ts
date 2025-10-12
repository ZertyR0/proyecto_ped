import { Component, OnInit,inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators , AbstractControl, ValidationErrors} from '@angular/forms';
import { Router } from '@angular/router'; 
import { AuthService} from '../../services/auth.service'; 

export function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-completar-perfil',
  templateUrl: './completar-perfil.component.html',
  styleUrls: ['./completar-perfil.component.scss']
})
export class CompletarPerfilComponent implements OnInit{
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
      Validators.minLength(10),
      Validators.maxLength(10),
      Validators.pattern('^[0-9]*$')
    ]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    hijos: this.fb.array([this.nuevoHijo()], Validators.required)
  }, { validators: passwordsMatchValidator });
  
    // --- Métodos del FormArray ---
    get hijos(): FormArray { return this.form.get('hijos') as FormArray; }
  
    nuevoHijo(): FormGroup {
      return this.fb.group({
        nombre: ['', [Validators.required]],
        apellidoPaterno: ['', [Validators.required]],
        apellidoMaterno: [''],
        fechaNacimiento: ['', [Validators.required]],
        sexo: ['H', [Validators.required]],
        alergias: ['']
      });
    }
  
    agregarHijo() { this.hijos.push(this.nuevoHijo()); }
    eliminarHijo(i: number) { if (this.hijos.length > 1) { this.hijos.removeAt(i); } }

    formatPhoneNumber(event: any): void {
    const input = event.target;
    const digitsOnly = input.value.replace(/\D/g, '').substring(0, 10);
    this.form.controls['telefono'].setValue(digitsOnly, { emitEvent: false });
    let formattedValue = digitsOnly;
    if (digitsOnly.length > 6) {
      formattedValue = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else if (digitsOnly.length > 3) {
      formattedValue = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    }
    input.value = formattedValue;
  }
    // --- Variables de estado ---
    loading = false;
    errorMsg = '';
    
    ngOnInit(): void {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      // Función auxiliar para dividir el nombre
      const parseDisplayName = (displayName: string | null) => {
        if (!displayName) return { nombre: '', apellidoP: '', apellidoM: '' };
        const nameParts = displayName.split(' ').filter(part => part); // Divide y quita espacios extra
        let nombre = '', apellidoP = '', apellidoM = '';

        if (nameParts.length === 1) {
          nombre = nameParts[0];
        } else if (nameParts.length === 2) {
          nombre = nameParts[0];
          apellidoP = nameParts[1];
        } else if (nameParts.length === 3) {
          nombre = nameParts[0];
          apellidoP = nameParts[1];
          apellidoM = nameParts[2];
        } else if (nameParts.length >= 4) { // Maneja nombres compuestos
          nombre = `${nameParts[0]} ${nameParts[1]}`;
          apellidoP = nameParts[2];
          apellidoM = nameParts[3];
        }
        return { nombre, apellidoP, apellidoM };
      };

      const parsedName = parseDisplayName(currentUser.displayName);
      
      this.form.patchValue({
        ...parsedName,
        email: currentUser.email || ''
      });
      this.form.get('email')?.disable();
    } else {
      this.router.navigate(['/login']);
    }
  }

    // LÓGICA DEL SUBMIT COMPLETAMENTE LÓGICA DE SUBMIT COMPLETAMENTE NUEVA (ACTUALIZAR, NO REGISTRAR) ---
    async submit() {
      this.errorMsg = '';
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      this.loading = true;
  
      try {
        // Separamos los datos del tutor y de los hijos
        const currentUser = this.auth.currentUser; 
        if (!currentUser) throw new Error('Usuario no autenticado.');
        const formValue = this.form.getRawValue(); // Usamos getRawValue para leer campos deshabilitados
        // Verificamos si el usuario ya tiene una contraseña vinculada.
        const hasPasswordProvider = currentUser.providerData.some(
          (provider) => provider.providerId === 'password'
        );

        // Solo si NO tiene una contraseña, intentamos vincularla.
        if (!hasPasswordProvider) {
          await this.auth.linkEmailAndPassword(formValue.email, formValue.password);
        }
        
        const profileData = {
        nombre: formValue.nombre,
        apellidoP: formValue.apellidoP,
        apellidoM: formValue.apellidoM,
        telefono: formValue.telefono
        };
        const childrenData = formValue.hijos;
  
        // Actualizar el perfil del tutor en Firestore
      await this.auth.updateUserProfile(currentUser.uid, profileData);

      // Guardar los datos de los hijos
      await this.auth.saveChildrenData(currentUser.uid, childrenData);

      // Redirigir a servicios (provicional)
      this.router.navigate(['/servicios']);
  
      } catch (e: any) {
        // Si algo falla, lo mostramos en la consola y al usuario.
        console.error("ERROR AL GUARDAR PERFIL:", e);
        this.errorMsg = 'Ocurrió un error al guardar tu información.';
      } finally {
        // Este bloque se ejecuta siempre, asegurando que el 'loading' se desactive.
        this.loading = false;
      }
    }
}
