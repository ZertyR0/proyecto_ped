import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { CitasService } from './citas.service';

export interface ConsultationRow {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  tutorId?: string;
  tutorEmail?: string;
  tutorName?: string;
  tutorPhone?: string | null;
  patientId?: string;
  patientName?: string; // childName
  reason?: string;
  conclusions?: string | null;
  status?: string; // pending|confirmed|completed|cancelled
  raw?: any; // original doc data for extra fields
}

export interface ConsultationFilters {
  date?: string; // YYYY-MM-DD exact match
  tutor?: string; // partial tutor name or email
  patient?: string; // partial patient name
  reason?: string; // partial reason
}

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private firestore = inject(Firestore);
  private citasService = inject(CitasService);

  /**
   * Retrieves all consultations from 'citas' collection and maps to ConsultationRow.
   * Note: this fetches all documents. For large datasets consider adding pagination/server-side filters.
   */
  async getAllConsultations(): Promise<ConsultationRow[]> {
    const col = collection(this.firestore, 'citas');
    const snap = await getDocs(col);
    const rows: ConsultationRow[] = [];

    snap.forEach(doc => {
      const data = doc.data() as any;

      // Normalize status (prefer 'status', fallback to 'estado')
      let status = data.status;
      if (!status && data.estado) {
        const es = (data.estado || '').toString().toLowerCase();
        const map: any = { 'pendiente': 'pending', 'confirmada': 'confirmed', 'confirmado': 'confirmed', 'cancelada': 'cancelled', 'completada': 'completed' };
        status = map[es] || es;
      }

      // Normalize date/time
      let dateStr = data.date;
      if (!dateStr && data.fecha && (data.fecha as any).toDate) {
        dateStr = (data.fecha as any).toDate().toISOString().split('T')[0];
      }

      let timeStr = data.time;
      if (!timeStr && data.fecha && (data.fecha as any).toDate) {
        const dt: Date = (data.fecha as any).toDate();
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        timeStr = `${hh}:${mm}`;
      }

      rows.push({
        id: doc.id,
        date: dateStr || '',
        time: timeStr || '',
        tutorId: data.tutorId,
        tutorEmail: data.tutorEmail,
        tutorName: data.tutorName || data.tutorEmail || '',
        tutorPhone: data.tutorPhone || null,
        patientId: data.childId,
        patientName: data.childName,
        reason: data.reason,
        conclusions: data.conclusions || data.result || null,
        status: status || 'pending',
        raw: data
      });
    });

    // Sort by date desc then time desc
    rows.sort((a, b) => {
      if (a.date === b.date) return (b.time || '').localeCompare(a.time || '');
      return (b.date || '').localeCompare(a.date || '');
    });

    return rows;
  }

  /**
   * Apply client-side filters to a list of ConsultationRow.
   */
  applyFilters(rows: ConsultationRow[], filters: ConsultationFilters): ConsultationRow[] {
    if (!filters) return rows;
    const fDate = (filters.date || '').trim();
    const fTutor = (filters.tutor || '').trim().toLowerCase();
    const fPatient = (filters.patient || '').trim().toLowerCase();
    const fReason = (filters.reason || '').trim().toLowerCase();

    return rows.filter(r => {
      if (fDate) {
        if (!r.date) return false;
        if (r.date !== fDate) return false;
      }
      if (fTutor) {
        const tutorConcat = ((r.tutorName || '') + ' ' + (r.tutorEmail || '')).toLowerCase();
        if (!tutorConcat.includes(fTutor)) return false;
      }
      if (fPatient) {
        if (!r.patientName || !r.patientName.toLowerCase().includes(fPatient)) return false;
      }
      if (fReason) {
        if (!r.reason || !r.reason.toLowerCase().includes(fReason)) return false;
      }
      return true;
    });
  }

  /**
   * Confirm a consultation (set status to 'confirmed'). Returns void or throws on error.
   */
  async confirmConsultation(consultationId: string): Promise<void> {
    if (!consultationId) throw new Error('consultationId required');
    await this.citasService.updateAppointmentStatus(consultationId, 'confirmed' as any);
  }
}
