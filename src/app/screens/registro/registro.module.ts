import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { RegistroComponent } from './registro.component';

const routes: Routes = [{ path: '', component: RegistroComponent }];

@NgModule({
	declarations: [RegistroComponent],
		imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild(routes)]
})
export class RegistroModule {}
