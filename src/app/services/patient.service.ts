import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface NinoDto {
  id?: number;
  paciente_id?: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  fecha_nacimiento: string; // YYYY-MM-DD
  sexo: 'M' | 'F';
  alergias?: string;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private http = inject(HttpClient);
  private base = environment.apiBase;
  private key = 'paciente_id';

  setPacienteId(id: number) { localStorage.setItem(this.key, String(id)); }
  getPacienteId(): number | null {
    const v = localStorage.getItem(this.key);
    return v ? Number(v) : null;
  }
  clearPacienteId() { localStorage.removeItem(this.key); }

  // Niños (paciente autenticado)
  listNinos(pacienteId: number) {
    return this.http.get<NinoDto[]>(`${this.base}/mis-ninos/`, { params: { paciente_id: pacienteId as any } });
  }
  addNino(nino: NinoDto) {
    return this.http.post<{ nino_created_id: number; message: string }>(`${this.base}/agregar-nino/`, nino);
  }
  updateNino(nino: NinoDto) {
    return this.http.put(`${this.base}/editar-nino/`, nino);
  }
  deleteNino(id: number) {
    // Backend usa DELETE /editar-nino/?id=ID
    return this.http.delete(`${this.base}/editar-nino/`, { params: { id: id as any } });
  }
}
