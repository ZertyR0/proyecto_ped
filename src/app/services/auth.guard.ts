import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private router = inject(Router);

  canActivate() {
    return new Promise<true | UrlTree>((resolve) => {
      const auth = getAuth();
      const unsub = onAuthStateChanged(auth, (user: User | null) => {
        unsub();
        resolve(user ? true : this.router.parseUrl('/login'));
      });
    });
  }
}
