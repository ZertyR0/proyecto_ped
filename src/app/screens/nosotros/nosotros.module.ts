import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { NosotrosComponent } from './nosotros.component';

const routes: Routes = [{ path: '', component: NosotrosComponent }];

@NgModule({
  declarations: [NosotrosComponent],
  imports: [CommonModule, RouterModule.forChild(routes)]
})
export class NosotrosModule {}
