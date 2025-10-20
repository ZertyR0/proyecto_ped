import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { CancelCitaComponent } from '../modals/cancel-cita/cancel-cita.component';

@NgModule({
  declarations: [NavbarComponent, FooterComponent, CancelCitaComponent],
  imports: [CommonModule, RouterModule],
  exports: [NavbarComponent, FooterComponent, CancelCitaComponent]
})
export class SharedModule {}
