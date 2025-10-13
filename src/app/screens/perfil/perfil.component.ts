import { Component, inject, OnInit } from '@angular/core';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc, collection, getDocs } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

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
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  currentUser: User | null = null;
  userProfile: UserProfile | null = null;
  children: Child[] = [];
  loading = true;
  editMode = false;
  editChildrenMode = false;

  profileForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellidoP: ['', [Validators.required]],
    apellidoM: [''],
    telefono: ['', [Validators.required]]
  });

  ngOnInit() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserProfile();
        await this.loadChildren();
      }
      this.loading = false;
    });
  }

  async loadUserProfile() {
    if (!this.currentUser) return;
    
    try {
      const userDocRef = doc(this.firestore, `users/${this.currentUser.uid}`);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        this.userProfile = docSnap.data() as UserProfile;
        this.updateProfileForm();
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    }
  }

  async loadChildren() {
    if (!this.currentUser) return;
    
    try {
      const childrenCollectionRef = collection(this.firestore, `users/${this.currentUser.uid}/children`);
      const querySnapshot = await getDocs(childrenCollectionRef);
      
      this.children = [];
      querySnapshot.forEach((doc) => {
        this.children.push(doc.data() as Child);
      });
    } catch (error) {
      console.error('Error al cargar hijos:', error);
    }
  }

  updateProfileForm() {
    if (this.userProfile) {
      this.profileForm.patchValue({
        nombre: this.userProfile.nombre,
        apellidoP: this.userProfile.apellidoP,
        apellidoM: this.userProfile.apellidoM,
        telefono: this.userProfile.telefono
      });
    }
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    if (!this.editMode) {
      this.updateProfileForm(); // Restaurar valores originales si se cancela
    }
  }

  toggleEditChildrenMode() {
    this.editChildrenMode = !this.editChildrenMode;
  }

  async saveProfile() {
    if (this.profileForm.invalid || !this.currentUser) {
      this.profileForm.markAllAsTouched();
      return;
    }

    try {
      const updatedData = this.profileForm.value;
      await this.authService.updateUserProfile(this.currentUser.uid, updatedData);
      
      // Actualizar el objeto local
      if (this.userProfile) {
        this.userProfile = { ...this.userProfile, ...updatedData };
      }
      
      this.editMode = false;
      // Aquí podrías mostrar un mensaje de éxito
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      // Aquí podrías mostrar un mensaje de error
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  }

  calculateAge(dateString: string): number {
    if (!dateString) return 0;
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}
