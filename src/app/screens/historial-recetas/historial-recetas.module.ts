import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HistorialRecetasComponent } from './historial-recetas.component';

const routes: Routes = [
  { 
    path: '', 
    component: HistorialRecetasComponent 
  }
];

@NgModule({
  declarations: [
    HistorialRecetasComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule
  ]
})
export class HistorialRecetasModule { }
