import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service'; 

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Usamos 'from' para convertir la Promesa de getToken() en un Observable
    return from(this.auth.getToken()).pipe(
      // Usamos 'switchMap' para trabajar con el valor que emite el Observable (el token)
      switchMap(token => {
        if (token) {
          // Si obtuvimos un token, clonamos la petición y le añadimos el encabezado de autorización
          const clonedReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
          // Enviamos la petición clonada
          return next.handle(clonedReq);
        }
        // Si no hay token, dejamos pasar la petición original sin modificarla
        return next.handle(req);
      })
    );
  }
}