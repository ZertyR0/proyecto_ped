import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);

  form: FormGroup = this.fb.group({
    // Datos del paciente
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellidoPaterno: ['', [Validators.required]],
    apellidoMaterno: [''],
    telefono: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    username: [''], // opcional: lo llenaremos con el email si viene vacío
    password: ['', [Validators.required, Validators.minLength(6)]],

    // Hijos
    hijos: this.fb.array([this.nuevoHijo()])
  });

  get hijos(): FormArray { return this.form.get('hijos') as FormArray; }

  nuevoHijo(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required]],
      apellidoPaterno: ['', [Validators.required]],
  apellidoMaterno: [''],
      fechaNacimiento: ['', [Validators.required]],
  sexo: ['M', [Validators.required]],
      alergias: ['']
    });
  }

  agregarHijo() { this.hijos.push(this.nuevoHijo()); }
  eliminarHijo(i: number) { if (this.hijos.length > 1) { this.hijos.removeAt(i); } }

  loading = false;
  successMsg = '';
  errorMsg = '';

  async submit() {
    this.successMsg = this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Mapear a la API: /registro-paciente/
    const v = this.form.value;
    const payload = {
      first_name: v.nombre,
      email: v.email,
      username: v.username || v.email,
      password: v.password,
      apellido_paterno: v.apellidoPaterno,
      apellido_materno: v.apellidoMaterno || '',
      telefono: v.telefono,
      ninos: (v.hijos as any[]).map(h => ({
        nombre: h.nombre,
        apellido_paterno: h.apellidoPaterno,
        apellido_materno: h.apellidoMaterno || '',
        fecha_nacimiento: h.fechaNacimiento, // YYYY-MM-DD
        sexo: h.sexo,
        alergias: h.alergias || ''
      }))
    };

    this.loading = true;
    try {
      const res = await this.api.post<any>('/registro-paciente/', payload).toPromise();
      this.successMsg = res?.message || 'Registro exitoso';
      // Reset suave dejando un hijo vacío
      this.form.reset();
      this.hijos.clear();
      this.agregarHijo();
    } catch (e: any) {
      this.errorMsg = e?.error?.message || 'Error al registrar';
    } finally {
      this.loading = false;
    }
  }
}
