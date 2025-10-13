import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

export interface Appointment {
  id?: string;
  userId: string;
  userEmail: string;
  childId: string;
  childName: string;
  date: string;
  time: string;
  reason: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const data: Omit<Appointment, 'id'> = {
      ...appointmentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const appointmentsRef = collection(this.firestore, 'appointments');
    const docRef = await addDoc(appointmentsRef, data);
    return docRef.id;
  }

  async getUserAppointments(userId?: string): Promise<Appointment[]> {
    const user = userId || this.auth.currentUser?.uid;
    if (!user) return [];

    const appointmentsRef = collection(this.firestore, 'appointments');
    const q = query(
      appointmentsRef, 
      where('userId', '==', user),
      orderBy('date', 'desc'),
      orderBy('time', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({ id: doc.id, ...doc.data() } as Appointment);
    });

    return appointments;
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    const appointmentsRef = collection(this.firestore, 'appointments');
    const q = query(
      appointmentsRef,
      where('date', '==', date),
      where('status', 'in', ['pending', 'confirmed'])
    );

    const querySnapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({ id: doc.id, ...doc.data() } as Appointment);
    });

    return appointments;
  }

  async updateAppointmentStatus(appointmentId: string, status: Appointment['status']): Promise<void> {
    const appointmentRef = doc(this.firestore, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status: status,
      updatedAt: new Date()
    });
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    await this.updateAppointmentStatus(appointmentId, 'cancelled');
  }

  async deleteAppointment(appointmentId: string): Promise<void> {
    const appointmentRef = doc(this.firestore, 'appointments', appointmentId);
    await deleteDoc(appointmentRef);
  }

  // Verificar disponibilidad de horarios para una fecha específica
  async getAvailableTimeSlots(date: string): Promise<string[]> {
    const allTimeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00'
    ];

    const bookedAppointments = await this.getAppointmentsByDate(date);
    const bookedTimes = bookedAppointments.map(appointment => appointment.time);
    
    return allTimeSlots.filter(time => !bookedTimes.includes(time));
  }
}
