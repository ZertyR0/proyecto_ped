import { Injectable, inject } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  EmailAuthProvider,
  linkWithCredential
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, collection, addDoc, updateDoc } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';

export interface TutorRegisterData {
  email: string;
  password: string;
  nombre: string;
  apellidoP: string;
  apellidoM: string;
  telefono: string;
}

export interface TutorLoginData {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private auth: Auth, private firestore: Firestore) { }

  // --- Registro con Correo y Contraseña ---
  async register(data: TutorRegisterData) {
    try {
      // Crear usuario en Firebase Auth
      const { email, password, nombre, apellidoP, apellidoM, telefono } = data;
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Guardar datos adicionales en Firestore
      if (user) {
        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          nombre,
          apellidoP,
          apellidoM,
          telefono,
          rol: 'tutor'
        });
      }
      return userCredential;
    } catch (e: any) { // Le damos tipo al error
      console.error("Error en el registro:", e);
      return null;
    }
  }

  // --- Inicio de Sesión con Correo ---
  login(data: TutorLoginData) {
    const { email, password } = data;
    return signInWithEmailAndPassword(this.auth, email, password);
}
  // --- Inicio de Sesión con Google ---
  loginWithGoogle() {
    return signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  // --- Verificar si el perfil de Google ya existe en Firestore ---
  async checkGoogleUserProfile(user: User) {
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      // Si el perfil NO existe, creamos uno básico
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        nombre: user.displayName || 'Sin Nombre', // Dato que provee Google
        rol: 'tutor'
      });
      return false; // Indicamos que es un perfil nuevo
    }
    return true; // Indicamos que el perfil ya existe
  }

  // --- Cerrar Sesión ---
  logout() {
    return signOut(this.auth);
  }
  async saveChildrenData(userId: string, children: any[]) {
    // Creamos una referencia a la subcolección 'children' dentro del documento del usuario
    const childrenCollectionRef = collection(this.firestore, `users/${userId}/children`);

    // Creamos una promesa para cada hijo que se va a añadir
    const promises = children.map(child => addDoc(childrenCollectionRef, child));
    
    // Esperamos a que todas las promesas de guardado se completen
    return Promise.all(promises);
  }
  async getToken(): Promise<string | null> {
    const user = this.auth.currentUser; // Obtiene el usuario logueado actualmente
    if (user) {
      return await user.getIdToken(); // Devuelve el token de Firebase si hay usuario
    }
    return null; // Devuelve null si no hay usuario
  }

  async updateUserProfile(userId: string, data: any) {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    return await updateDoc(userDocRef, data);
  }

  // Permite que los componentes pregunten quién es el usuario actual de forma segura.
  public get currentUser() {
    return this.auth.currentUser;
  }

  // --- NUEVO GETTER ---
  // Proporciona acceso público y seguro a la instancia principal de Auth.
  // La necesitaremos para funciones como fetchSignInMethodsForEmail.
  public get authInstance(): Auth {
    return this.auth;
  }

  // --- NUEVA FUNCIÓN: Vincular Email/Contraseña a una cuenta existente ---
  async linkEmailAndPassword(email: string, password: string) {
    if (!this.currentUser) throw new Error('No hay un usuario autenticado para vincular.');

    // 2. Creamos la 'credencial' con el email y la nueva contraseña
    const credential = EmailAuthProvider.credential(email, password);
    
    // 3. Vinculamos esta nueva credencial a la cuenta del usuario actual
    return await linkWithCredential(this.currentUser, credential);
  }
}
