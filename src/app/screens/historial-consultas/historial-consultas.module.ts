import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { HistorialConsultasComponent } from './historial-consultas.component';

@NgModule({
  declarations: [
    HistorialConsultasComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', component: HistorialConsultasComponent }
    ])
  ]
})
export class HistorialConsultasModule { }
