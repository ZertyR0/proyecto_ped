import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CitasAgendadasComponent } from './citas-agendadas.component';

@NgModule({
  declarations: [
    CitasAgendadasComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: CitasAgendadasComponent }
    ])
  ]
})
export class CitasAgendadasModule { }
