import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Firestore, collection, addDoc, query, where, getDocs, Timestamp } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CitasService {
  private firestore = inject(Firestore);
  private http = inject(HttpClient);

  /**
   * Comprueba si ya existe una cita para una fecha (YYYY-MM-DD) y hora (HH:MM).
   * Devuelve true si existe al menos una cita con esos valores.
   */
  async isSlotTaken(dateString: string, time: string): Promise<boolean> {
    try {
      const q = query(
        collection(this.firestore, 'citas'),
        where('date', '==', dateString),
        where('time', '==', time)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (err) {
      console.error('Error comprobando si el slot está ocupado:', err);
      // En caso de error, asumimos ocupado para evitar doble-booking por seguridad
      return true;
    }
  }


  async getCurrentTimeInMexico(): Promise<any> {
    try {
      // Intentamos calcular la hora de Ciudad de México en el cliente usando Intl (evita CORS)
      const mexicoStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
      const mexicoNow = new Date(mexicoStr);
      if (!isNaN(mexicoNow.getTime())) {
        return { datetime: mexicoNow.toISOString() };
      }
    } catch (err) {
      // fallback to HTTP
    }

    // Fallback: intenta la API externa (puede fallar por CORS en algunos entornos)
    try {
      const response = await firstValueFrom(
        this.http.get<any>('https://worldtimeapi.org/api/timezone/America/Mexico_City')
      );
      return response;
    } catch (error) {
      return { datetime: new Date().toISOString() };
    }
  }

  /**
   * Guarda una nueva cita en la base de datos.
   * @param data Los datos de la cita a guardar.
   */
  async createAppointment(data: any) {
    // Combinamos la fecha y la hora para crear un objeto de fecha completo.
    const appointmentDate = new Date(`${data.date}T${data.time}:00`);
    
    // Preparamos el objeto final que se guardará en Firestore.
    const appointmentDataToSave = {
      ...data,
      // Aseguramos que 'date' y 'time' estén presentes y normalizados
      date: (data.date || '').toString(),
      time: (data.time || '').toString().slice(0,5),
      // Convertimos la fecha a un Timestamp de Firebase. Esto es crucial para poder ordenar y filtrar por fecha correctamente.
      fecha: Timestamp.fromDate(appointmentDate),
      estado: 'confirmada' // Estado inicial de la cita
    };

    //  Apuntamos a la colección 'citas' y añadimos el nuevo documento.
    const citasCollection = collection(this.firestore, 'citas');
    try {
      const docRef = await addDoc(citasCollection, appointmentDataToSave);
      return docRef.id; // Devolvemos el ID de la nueva cita.
    } catch (err) {
      throw err; // re-lanzar para que el componente lo maneje
    }
  }

  /**
   * Obtiene todas las citas para una fecha específica.
   * @param dateString La fecha en formato 'YYYY-MM-DD'.
   * @returns Una promesa que se resuelve con un array de objetos de cita.
   */
  async getAppointmentsForDate(dateString: string, tutorId?: string) {
    const collectionRef = collection(this.firestore, 'citas');

    // Strategy to avoid requiring composite indexes:
    // 1) If documents use the 'date' string field, query by that (optionally + tutorId equality) which doesn't need a composite index.
    // 2) If there are no results or documents only have 'fecha' Timestamp, query by tutorId alone (or by date if tutorId not provided) and filter the results client-side by the day's range.
    // This avoids combining a range on 'fecha' with an equality on 'tutorId' which needs a composite index.

    const appointments: any[] = [];

    // Attempt 1: query by 'date' string (fast and index-free for simple equality)
    try {
      const constraints: any[] = [where('date', '==', dateString)];
      if (tutorId) constraints.push(where('tutorId', '==', tutorId));
      let q = query(collectionRef, ...constraints);
      let querySnapshot = await getDocs(q);

      // If we got hits, normalize and return immediately
      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const data = doc.data() as any;
          let timeStr = data.time;
          if (!timeStr && data.fecha && (data.fecha as any).toDate) {
            const dt: Date = (data.fecha as any).toDate();
            const hh = String(dt.getHours()).padStart(2, '0');
            const mm = String(dt.getMinutes()).padStart(2, '0');
            timeStr = `${hh}:${mm}`;
          }
          const dateStr = data.date || (data.fecha && (data.fecha as any).toDate ? (data.fecha as any).toDate().toISOString().split('T')[0] : dateString);
          appointments.push({ id: doc.id, ...data, time: timeStr, date: dateStr });
        });
        return appointments;
      }
    } catch (err) {
      console.warn('[DEBUG] query by date failed (will fallback):', err);
      // continue to fallback
    }

    // Fallback: avoid range + equality composite query by querying by tutorId (if available) and then filter client-side by date range
    try {
      let q;
      if (tutorId) {
        q = query(collectionRef, where('tutorId', '==', tutorId));
      } else {
        // No tutorId: query all docs for the date range (this may still require an index if using fecha range). To be safe, we query by 'date' equality without tutorId above, so here we query by 'fecha' range only.
        const dayStart = new Date(dateString + 'T00:00:00');
        const dayEnd = new Date(dateString + 'T23:59:59.999');
        q = query(collectionRef, where('fecha', '>=', Timestamp.fromDate(dayStart)), where('fecha', '<=', Timestamp.fromDate(dayEnd)));
      }

      const querySnapshot = await getDocs(q);
      const dayStart = new Date(dateString + 'T00:00:00');
      const dayEnd = new Date(dateString + 'T23:59:59.999');

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        // If we queried by tutorId only, we must filter docs to the target day using 'date' or 'fecha'
        let dateStr = data.date;
        if (!dateStr && data.fecha && (data.fecha as any).toDate) {
          dateStr = (data.fecha as any).toDate().toISOString().split('T')[0];
        }
        // If dateStr still not available, attempt to derive from fecha and compare range
        let include = false;
        if (dateStr === dateString) include = true;
        else if (data.fecha && (data.fecha as any).toDate) {
          const dt: Date = (data.fecha as any).toDate();
          if (dt >= dayStart && dt <= dayEnd) include = true;
        }
        if (!include) return; // skip docs not for the requested day

        let timeStr = data.time;
        if (!timeStr && data.fecha && (data.fecha as any).toDate) {
          const dt: Date = (data.fecha as any).toDate();
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          timeStr = `${hh}:${mm}`;
        }

        appointments.push({ id: doc.id, ...data, time: timeStr, date: dateStr || dateString });
      });
    } catch (err) {
      console.error('[DEBUG] fallback query failed:', err);
      throw err;
    }

    return appointments;
  }
}
