import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, authState, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);

  user$: Observable<User | null> = authState(this.auth);

  async googleSignIn(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    return cred.user;
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}
