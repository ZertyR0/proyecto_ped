import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // Información personal
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidoMaterno: ['', [Validators.required]],
      apellidoPaterno: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
  email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],

      // Hijos
      hijos: this.fb.array([this.nuevoHijo()])
    });
  }

  get hijos(): FormArray { return this.form.get('hijos') as FormArray; }

  nuevoHijo(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required]],
      apellidoMaterno: ['', [Validators.required]],
      apellidoPaterno: ['', [Validators.required]],
      fechaNacimiento: ['', [Validators.required]],
      sexo: ['', [Validators.required]],
      alergias: ['']
    });
  }

  agregarHijo() { this.hijos.push(this.nuevoHijo()); }
  eliminarHijo(i: number) { if (this.hijos.length > 1) { this.hijos.removeAt(i); } }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Por ahora solo mostramos el payload; integrar API después
    console.log('Registro payload', this.form.value);
  }
}
