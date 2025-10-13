import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PerfilComponent } from './perfil.component';

@NgModule({
  declarations: [
    PerfilComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      { path: '', component: PerfilComponent }
    ])
  ]
})
export class PerfilModule { }
