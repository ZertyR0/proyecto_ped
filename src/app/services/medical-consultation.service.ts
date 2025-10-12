import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, getDocs, orderBy, doc, addDoc, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

export interface MedicalConsultation {
  id?: string;
  userId: string;
  childId: string;
  childName: string;
  appointmentId?: string;
  date: string;
  time: string;
  doctor: string;
  reason: string;
  diagnosis: string;
  treatment: string;
  notes?: string;
  prescriptions?: Prescription[];
  nextAppointment?: string;
  status: 'completed' | 'in-progress' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Prescription {
  id?: string;
  consultationId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  status: 'active' | 'completed' | 'cancelled';
}

@Injectable({
  providedIn: 'root'
})
export class MedicalConsultationService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  async getUserConsultations(userId?: string): Promise<MedicalConsultation[]> {
    const user = userId || this.auth.currentUser?.uid;
    if (!user) return [];

    const consultationsRef = collection(this.firestore, 'consultations');
    const q = query(
      consultationsRef,
      where('userId', '==', user),
      orderBy('date', 'desc'),
      orderBy('time', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const consultations: MedicalConsultation[] = [];

    querySnapshot.forEach((doc) => {
      consultations.push({ id: doc.id, ...doc.data() } as MedicalConsultation);
    });

    return consultations;
  }

  async getConsultationsByChild(childId: string): Promise<MedicalConsultation[]> {
    const user = this.auth.currentUser?.uid;
    if (!user) return [];

    const consultationsRef = collection(this.firestore, 'consultations');
    const q = query(
      consultationsRef,
      where('userId', '==', user),
      where('childId', '==', childId),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const consultations: MedicalConsultation[] = [];

    querySnapshot.forEach((doc) => {
      consultations.push({ id: doc.id, ...doc.data() } as MedicalConsultation);
    });

    return consultations;
  }

  async createConsultation(consultationData: Omit<MedicalConsultation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const data: Omit<MedicalConsultation, 'id'> = {
      ...consultationData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const consultationsRef = collection(this.firestore, 'consultations');
    const docRef = await addDoc(consultationsRef, data);
    return docRef.id;
  }

  async updateConsultation(consultationId: string, updateData: Partial<MedicalConsultation>): Promise<void> {
    const consultationRef = doc(this.firestore, 'consultations', consultationId);
    await updateDoc(consultationRef, {
      ...updateData,
      updatedAt: new Date()
    });
  }

  // Generar datos de ejemplo para demostración
  async generateSampleData(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const sampleConsultations: Omit<MedicalConsultation, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        userId: user.uid,
        childId: 'child1',
        childName: 'fulanito hernandito',
        date: '2024-10-01',
        time: '09:00',
        doctor: 'Dr. Carlos Ramirez',
        reason: 'Dolor Dental',
        diagnosis: 'Caries en molar superior derecho',
        treatment: 'Obturación con resina compuesta',
        notes: 'El dolor dental fue causado por una infección',
        status: 'completed'
      },
      {
        userId: user.uid,
        childId: 'child1',
        childName: 'fulanito hernandito',
        date: '2024-09-15',
        time: '11:00',
        doctor: 'Dra. Ana Martinez',
        reason: 'Problemas de Encías',
        diagnosis: 'Gingivitis leve',
        treatment: 'Limpieza dental y tratamiento con enjuague bucal',
        notes: 'El sangrado y la inflamacion es causado por gingivitis',
        status: 'completed'
      },
      {
        userId: user.uid,
        childId: 'child1',
        childName: 'fulanito hernandito',
        date: '2024-08-30',
        time: '13:00',
        doctor: 'Dr. Javier Torres',
        reason: 'Caries',
        diagnosis: 'Múltiples caries en dientes posteriores',
        treatment: 'Obturaciones múltiples',
        notes: 'Caries en el diente 19',
        status: 'completed'
      },
      {
        userId: user.uid,
        childId: 'child1',
        childName: 'fulanito hernandito',
        date: '2024-08-22',
        time: '15:00',
        doctor: 'Dr. Luis Fernández',
        reason: 'Consulta para implante dental',
        diagnosis: 'Evaluación para implante',
        treatment: 'Planificación de implante dental',
        notes: 'Proceso de Ortodoncia',
        status: 'completed'
      }
    ];

    // Crear las consultas de ejemplo
    for (const consultation of sampleConsultations) {
      await this.createConsultation(consultation);
    }
  }
}
