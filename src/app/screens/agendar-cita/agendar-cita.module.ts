import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AgendarCitaComponent } from './agendar-cita.component';

@NgModule({
  declarations: [
    AgendarCitaComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      { path: '', component: AgendarCitaComponent }
    ])
  ]
})
export class AgendarCitaModule { }
