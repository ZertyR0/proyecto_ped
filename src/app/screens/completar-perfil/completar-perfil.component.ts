import { Component, OnInit,inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router'; 
import { AuthService} from '../../services/auth.service'; 


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
    telefono: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    hijos: this.fb.array([this.nuevoHijo()], Validators.required)
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
    
    ngOnInit(): void {
    const currentUser = this.auth.currentUser; 
    if (currentUser) {
      this.form.patchValue({
        nombre: currentUser.displayName || '',
        email: currentUser.email || ''
      });
      // Deshabilitamos el email para que el usuario no pueda cambiarlo
      this.form.get('email')?.disable();
    } else {
      // Si por alguna razón no hay un usuario, lo mandamos al login
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
