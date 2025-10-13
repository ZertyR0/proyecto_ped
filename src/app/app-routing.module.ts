import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', loadChildren: () => import('./screens/home/home.module').then(m => m.HomeModule) },
  { path: 'nosotros', loadChildren: () => import('./screens/nosotros/nosotros.module').then(m => m.NosotrosModule) },
  { path: 'servicios', loadChildren: () => import('./screens/servicios/servicios.module').then(m => m.ServiciosModule) },
  { path: 'contacto', loadChildren: () => import('./screens/contacto/contacto.module').then(m => m.ContactoModule) },
  { path: 'login', loadChildren: () => import('./screens/login/login.module').then(m => m.LoginModule) },
  { path: 'registro', loadChildren: () => import('./screens/registro/registro.module').then(m => m.RegistroModule) },
  { path: 'completar-perfil', loadChildren: () => import('./screens/completar-perfil/completar-perfil.module').then(m => m.CompletarPerfilModule) },
  // --- Rutas Protegidas (Requieren inicio de sesión) ---
  { 
    path: 'perfil', 
    loadChildren: () => import('./screens/perfil/perfil.module').then(m => m.PerfilModule),
    canActivate: [authGuard]
  },
  { 
    path: 'agendar-cita', 
    loadChildren: () => import('./screens/agendar-cita/agendar-cita.module').then(m => m.AgendarCitaModule),
    canActivate: [authGuard]
  },
  { 
    path: 'citas-agendadas', 
    loadChildren: () => import('./screens/citas-agendadas/citas-agendadas.module').then(m => m.CitasAgendadasModule),
    canActivate: [authGuard]
  },
  { 
    path: 'historial-consultas', 
    loadChildren: () => import('./screens/historial-consultas/historial-consultas.module').then(m => m.HistorialConsultasModule),
    canActivate: [authGuard]
  },
  { 
    path: 'historial-recetas', 
    loadChildren: () => import('./screens/historial-recetas/historial-recetas.module').then(m => m.HistorialRecetasModule),
    canActivate: [authGuard]
  },
  // --- ¡NUEVO! Rutas para el Administrador (Dentista) ---
  /* {
    path: 'admin/citas', // ej. /admin/citas
    loadChildren: () => import('./screens/admin-citas/admin-citas.module').then(m => m.AdminCitasModule),
    canActivate: [dentistGuard] // <-- Protegido por el guardián de dentistas
  }, */
  { path: '**', redirectTo: 'inicio' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
