import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { CitasAgendadasComponent } from './citas-agendadas.component';

@NgModule({
  declarations: [
    CitasAgendadasComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild([
      { path: '', component: CitasAgendadasComponent }
    ])
  ]
})
export class CitasAgendadasModule { }
