import { Component, inject, OnInit } from '@angular/core';
import { User } from '@angular/fire/auth';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

// Interfaces (las que ya tenías)
interface UserProfile {
  uid: string;
  email: string;
  nombre: string;
  apellidoP: string;
  apellidoM: string;
  telefono: string;
  rol: string;
}
interface Child {
  id: string; 
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  sexo: string;
  alergias: string;
}

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  // --- Propiedades del componente ---
  currentUser: User | null = null;
  userProfile: UserProfile | null = null;
  children: Child[] = [];
  loading = true;
  editMode = false;
  editChildrenMode = false;

  // --- 1. SE CREA UN ÚNICO FORMULARIO PRINCIPAL QUE CONTENDRÁ TODO ---
  perfilPageForm: FormGroup = this.fb.group({
    // a) Un FormGroup anidado para los datos del tutor
    tutor: this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidoP: ['', [Validators.required]],
      apellidoM: [''],
      telefono: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern('^[0-9]*$')
      ]]
    }),
    // b) Un FormArray anidado para los hijos
    hijos: this.fb.array([])
  });

  // --- 2. GETTERS PARA ACCEDER FÁCILMENTE A CADA PARTE DEL FORMULARIO ---
  get tutorForm(): FormGroup {
    return this.perfilPageForm.get('tutor') as FormGroup;
  }
  get childrenForm(): FormArray {
    return this.perfilPageForm.get('hijos') as FormArray;
  }

  ngOnInit() {
    this.currentUser = this.authService.currentUser;
    if (this.currentUser) {
      this.loadUserProfileAndChildren(this.currentUser.uid);
    } else {
      this.loading = false; // O redirigir a login
    }
  }

  async loadUserProfileAndChildren(uid: string) {
    try {
      this.userProfile = (await this.authService.getUserProfile(uid)) as UserProfile;
      // Llenamos la parte del tutor del formulario
      if (this.userProfile) this.tutorForm.patchValue(this.userProfile);
      
      this.authService.getChildrenForTutor(uid).subscribe(childrenData => {
        this.children = childrenData as Child[];
        // Llenamos la parte de los hijos del formulario
        this.buildChildrenForm();
        this.loading = false;
      });
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.loading = false;
    }
  }

  buildChildrenForm() {
    this.childrenForm.clear();
    this.children.forEach(child => {
      this.childrenForm.push(this.createChildFormGroup(child));
    });
  }

  createChildFormGroup(child: Child): FormGroup {
    return this.fb.group({
      nombre: [child.nombre, [Validators.required]],
      apellidoPaterno: [child.apellidoPaterno, [Validators.required]],
      apellidoMaterno: [child.apellidoMaterno],
      fechaNacimiento: [child.fechaNacimiento, [Validators.required]],
      sexo: [child.sexo, [Validators.required]],
      alergias: [child.alergias]
    });
  }

  formatPhoneNumber(event: any): void {
    const input = event.target;
    const digitsOnly = input.value.replace(/\D/g, '').substring(0, 10);
    // Apuntamos al control correcto dentro del sub-grupo 'tutor'
    this.tutorForm.controls['telefono'].setValue(digitsOnly, { emitEvent: false });
    let formattedValue = digitsOnly;
    if (digitsOnly.length > 6) {
      formattedValue = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else if (digitsOnly.length > 3) {
      formattedValue = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    }
    input.value = formattedValue;
  }

  async saveProfile() {
    if (this.tutorForm.invalid || !this.currentUser) return;
    try {
      const updatedData = this.tutorForm.value;
      await this.authService.updateUserProfile(this.currentUser.uid, updatedData);
      if (this.userProfile) {
        this.userProfile = { ...this.userProfile, ...updatedData };
      }
      this.editMode = false;
    } catch (error) { console.error('Error al actualizar perfil:', error); }
  }

  async saveChildren() {
    if (this.childrenForm.invalid || !this.currentUser) return;
    try {
      const promises = this.childrenForm.controls.map((control, index) => {
        const childId = this.children[index].id;
        return this.authService.updateChildProfile(this.currentUser!.uid, childId, control.value);
      });
      await Promise.all(promises);
      this.editChildrenMode = false;
    } catch (error) { console.error('Error al actualizar hijos:', error); }
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    if (!this.editMode && this.userProfile) this.tutorForm.patchValue(this.userProfile);
  }

  toggleEditChildrenMode() {
    this.editChildrenMode = !this.editChildrenMode;
    if (!this.editChildrenMode) { // Si se cancela, reconstruir para descartar cambios
      this.buildChildrenForm();
    }
  }
  
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Añadimos un día para corregir el desfase de zona horaria
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  calculateAge(dateString: string): number {
    if (!dateString) return 0;
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  }
}

