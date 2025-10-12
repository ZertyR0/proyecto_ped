import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { CompletarPerfilComponent } from './completar-perfil.component';

// 1. Importa el módulo para formularios reactivos
import { ReactiveFormsModule } from '@angular/forms';

const routes: Routes = [{ path: '', component: CompletarPerfilComponent }];

@NgModule({
  declarations: [CompletarPerfilComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    // 2. Añade el módulo a la lista de "herramientas" disponibles
    ReactiveFormsModule
  ]
})
export class CompletarPerfilModule { }