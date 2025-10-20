import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

export interface BitacoraEntry {
  appointmentId: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  tutorId?: string;
  tutorName?: string;
  tutorPhone?: string | null;
  patientId?: string;
  patientName?: string;
  age?: string | null;
  allergies?: string | null;
  medications?: string | null;
  intraoralExam?: string | null;
  medicalHistory?: string | null;
  professional?: string | null;
  reason?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  nextAppointment?: string | null; // YYYY-MM-DD or free text
  observations?: string | null;
  createdAt?: any;
  createdBy?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  /**
   * Prepara un objeto BitacoraEntry con los datos existentes de la cita, tutor y paciente.
   * El dentista usará este objeto para pre-enlazar el formulario.
   */
  async prepareBitacoraForAppointment(appointmentId: string): Promise<BitacoraEntry> {
    if (!appointmentId) throw new Error('appointmentId required');

    const appointmentRef = doc(this.firestore, 'citas', appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);
    if (!appointmentSnap.exists()) throw new Error('Appointment not found');
    const appt: any = appointmentSnap.data();

    const result: BitacoraEntry = {
      appointmentId,
      date: appt.date || (appt.fecha && (appt.fecha as any).toDate ? (appt.fecha as any).toDate().toISOString().split('T')[0] : undefined),
      time: appt.time || undefined,
      tutorId: appt.tutorId || undefined,
      tutorName: appt.tutorName || appt.tutorEmail || undefined,
      tutorPhone: appt.tutorPhone || null,
      patientId: appt.childId || undefined,
      patientName: appt.childName || undefined,
      reason: appt.reason || undefined,
  // fields that might be present on appt already
  diagnosis: appt.diagnosis || appt['diagnostico'] || undefined,
  treatment: appt.treatment || appt['tratamiento'] || undefined,
  observations: appt.observations || appt['observaciones'] || undefined
    };

    // Try to fetch more tutor details (phone or name) from users collection if available
    try {
      if (result.tutorId) {
        const tutorRef = doc(this.firestore, 'users', result.tutorId);
        const tutorSnap = await getDoc(tutorRef);
        if (tutorSnap.exists()) {
          const t = tutorSnap.data() as any;
          result.tutorName = result.tutorName || (t.name || (t.nombre ? `${t.nombre} ${t.apellidoPaterno || ''}`.trim() : undefined));
          result.tutorPhone = result.tutorPhone || t.phone || t.telefono || result.tutorPhone;
        }
      }

      // Try to fetch child details from users/{tutorId}/children/{childId}
      if (result.tutorId && result.patientId) {
        const childRef = doc(this.firestore, `users/${result.tutorId}/children/${result.patientId}`);
        const childSnap = await getDoc(childRef);
        if (childSnap.exists()) {
          const c = childSnap.data() as any;
          result.patientName = result.patientName || (c.nombre ? `${c.nombre} ${c.apellidoPaterno || ''}`.trim() : result.patientName);
          result.age = c.age || c.edad || result.age;
          result.allergies = c.allergies || c.alergias || result.allergies || null;
          result.medications = c.medications || c.medicamentos || result.medications || null;
          result.intraoralExam = c.intraoralExam || c.examen_intraoral || result.intraoralExam || null;
          result.medicalHistory = c.medicalHistory || c.antecedentes || result.medicalHistory || null;
        }
      }
    } catch (e) {
      // Non-fatal: continue with whatever data we have
    }

    return result;
  }

  /**
   * Guarda los datos de la bitácora dentro del documento de la cita (campo `bitacora`).
   * Además, opcionalmente marca la cita como 'completed' (completada) para el historial.
   */
  async saveBitacora(appointmentId: string, payload: Partial<BitacoraEntry>, markCompleted = true): Promise<void> {
    if (!appointmentId) throw new Error('appointmentId required');
    const appointmentRef = doc(this.firestore, 'citas', appointmentId);

    const now = Timestamp.now();
    const user = this.auth.currentUser;
    const bitacoraData: any = {
      ...payload,
      updatedAt: now,
      updatedBy: user?.uid || null
    };

    const updatePayload: any = { bitacora: bitacoraData };
    if (markCompleted) {
      updatePayload.status = 'completed';
      updatePayload.estado = 'completada';
    }

    await updateDoc(appointmentRef, updatePayload);
  }

  /**
   * Obtiene la bitácora (si existe) asociada a una cita.
   */
  async getBitacoraForAppointment(appointmentId: string): Promise<BitacoraEntry | null> {
    if (!appointmentId) return null;
    const appointmentRef = doc(this.firestore, 'citas', appointmentId);
    const snap = await getDoc(appointmentRef);
    if (!snap.exists()) return null;
    const data: any = snap.data();
    return data.bitacora ? { appointmentId, ...data.bitacora } as BitacoraEntry : null;
  }

  /**
   * Obtiene todas las citas del tutor y devuelve aquellas que contienen bitácora
   */
  async getConsultationsWithBitacoraForTutor(tutorId: string): Promise<BitacoraEntry[]> {
    if (!tutorId) return [];
    const col = collection(this.firestore, 'citas');
    const q = query(col, where('tutorId', '==', tutorId));
    const snap = await getDocs(q);
    const rows: BitacoraEntry[] = [];
    snap.forEach(docSnap => {
      const d: any = docSnap.data();
      if (d.bitacora) {
        rows.push({ appointmentId: docSnap.id, ...d.bitacora } as BitacoraEntry);
      }
    });
    return rows;
  }
}
