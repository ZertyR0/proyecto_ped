import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Auth } from '@angular/fire/auth';

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  private auth = inject(Auth);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return next.handle(req);

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) => {
        const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        return next.handle(authReq);
      })
    );
  }
}
