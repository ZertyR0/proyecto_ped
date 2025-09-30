import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', loadChildren: () => import('./screens/home/home.module').then(m => m.HomeModule) },
  { path: 'nosotros', loadChildren: () => import('./screens/nosotros/nosotros.module').then(m => m.NosotrosModule) },
  { path: 'servicios', loadChildren: () => import('./screens/servicios/servicios.module').then(m => m.ServiciosModule) },
  { path: 'contacto', loadChildren: () => import('./screens/contacto/contacto.module').then(m => m.ContactoModule) },
  { path: 'login', loadChildren: () => import('./screens/login/login.module').then(m => m.LoginModule) },
  { path: 'registro', loadChildren: () => import('./screens/registro/registro.module').then(m => m.RegistroModule) },
  { path: '**', redirectTo: 'inicio' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
