import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, getDocs, orderBy, doc, addDoc, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

export interface MedicalPrescription {
  id?: string;
  userId: string;
  childId: string;
  childName: string;
  consultationId?: string;
  date: string;
  doctor: string;
  diagnosis: string;
  treatmentName: string;
  medications: Medication[];
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  cost?: number;
  patientInfo?: PatientInfo;
  doctorRegistration?: string;
  generalInstructions?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  activeIngredient?: string;
}

export interface PatientInfo {
  birthDate?: string;
  weight?: string;
  medicalConditions?: string[];
  childId?: string;
  name?: string;
  age?: number;
  allergies?: string;
  currentMedications?: string;
  medicalHistory?: string;
  // Información del tutor
  tutorName?: string;
  tutorLastName?: string;
  tutorPhone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  async getUserPrescriptions(userId?: string): Promise<MedicalPrescription[]> {
    const user = userId || this.auth.currentUser?.uid;
    if (!user) return [];

    const prescriptionsRef = collection(this.firestore, 'prescriptions');
    const q = query(
      prescriptionsRef,
      where('userId', '==', user),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const prescriptions: MedicalPrescription[] = [];

    querySnapshot.forEach((doc) => {
      prescriptions.push({ id: doc.id, ...doc.data() } as MedicalPrescription);
    });

    return prescriptions;
  }

  async getPrescriptionsByChild(childId: string): Promise<MedicalPrescription[]> {
    const user = this.auth.currentUser?.uid;
    if (!user) return [];

    const prescriptionsRef = collection(this.firestore, 'prescriptions');
    const q = query(
      prescriptionsRef,
      where('userId', '==', user),
      where('childId', '==', childId),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const prescriptions: MedicalPrescription[] = [];

    querySnapshot.forEach((doc) => {
      prescriptions.push({ id: doc.id, ...doc.data() } as MedicalPrescription);
    });

    return prescriptions;
  }

  async createPrescription(prescriptionData: Omit<MedicalPrescription, 'id'>): Promise<string> {
    const prescriptionsRef = collection(this.firestore, 'prescriptions');
    const docRef = await addDoc(prescriptionsRef, prescriptionData);
    return docRef.id;
  }

  async updatePrescriptionStatus(prescriptionId: string, status: MedicalPrescription['status']): Promise<void> {
    const prescriptionRef = doc(this.firestore, 'prescriptions', prescriptionId);
    await updateDoc(prescriptionRef, {
      status: status,
      updatedAt: new Date()
    });
  }

  // Generar datos de ejemplo para demostración
  async generateSampleData(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const samplePrescriptions: Omit<MedicalPrescription, 'id'>[] = [
      {
        userId: user.uid,
        childId: 'child1',
        childName: 'Nicole Denise Cucco Pérez',
        date: '2024-10-08',
        doctor: 'Dr. Carlos Ramirez',
        diagnosis: 'Gingivitis',
        treatmentName: 'Enjuague bucal antiséptico',
        medications: [
          {
            name: 'Enjuague bucal Listerine',
            dosage: '15 ml',
            frequency: 'Dos veces al día (mañana y noche)',
            duration: '30 segundos',
            instructions: 'Realizar enjuagues bucales con 15 ml de la solución sin diluir, dos veces al día (mañana y noche) durante 30 segundos, después del cepillado. No ingerir alimentos ni bebidas durante 30 minutos después del enjuague. Usar durante 14 días.',
            activeIngredient: 'Cloruro de benzalconio'
          }
        ],
        generalInstructions: 'No utilizar de manera prolongada para evitar la pigmentación dental.',
        cost: 5145,
        status: 'active',
        doctorRegistration: 'RP-12345',
        patientInfo: {
          birthDate: '2015-03-15',
          weight: '25',
          medicalConditions: ['Ninguna']
        }
      },
      {
        userId: user.uid,
        childId: 'child1',
        childName: 'Nicole Denise Cucco Pérez',
        date: '2024-09-25',
        doctor: 'Dra. Ana Martinez',
        diagnosis: 'Dolor dental post-extracción',
        treatmentName: 'Analgésico y antiinflamatorio',
        medications: [
          {
            name: 'Ibuprofeno',
            dosage: '400mg',
            frequency: 'Cada 8 horas',
            duration: '5 días',
            instructions: 'Tomar con alimentos para evitar molestias estomacales',
            activeIngredient: 'Ácido 2-propilfenilacético'
          },
          {
            name: 'Paracetamol',
            dosage: '500mg',
            frequency: 'Cada 6 horas si hay dolor',
            duration: '3 días',
            instructions: 'Solo si persiste el dolor después del ibuprofeno',
            activeIngredient: 'Acetaminofén'
          }
        ],
        generalInstructions: 'Aplicar compresas frías los primeros 2 días. Evitar alimentos calientes.',
        cost: 3200,
        status: 'completed',
        doctorRegistration: 'RP-67890',
        patientInfo: {
          birthDate: '2015-03-15',
          weight: '25',
          medicalConditions: ['Ninguna']
        }
      },
      {
        userId: user.uid,
        childId: 'child1',
        childName: 'Nicole Denise Cucco Pérez',
        date: '2024-08-15',
        doctor: 'Dr. Javier Torres',
        diagnosis: 'Infección dental',
        treatmentName: 'Antibiótico y analgésico',
        medications: [
          {
            name: 'Amoxicilina',
            dosage: '500mg',
            frequency: 'Cada 8 horas',
            duration: '7 días',
            instructions: 'Completar todo el tratamiento aunque desaparezcan los síntomas',
            activeIngredient: 'Amoxicilina trihidrato'
          },
          {
            name: 'Ketorolaco',
            dosage: '10mg',
            frequency: 'Cada 8 horas',
            duration: '3 días',
            instructions: 'Solo para el dolor, tomar con alimentos',
            activeIngredient: 'Ketorolaco trometamina'
          }
        ],
        generalInstructions: 'Mantener buena higiene oral. Volver si persisten los síntomas.',
        cost: 4800,
        status: 'completed',
        doctorRegistration: 'RP-54321',
        patientInfo: {
          birthDate: '2015-03-15',
          weight: '25',
          medicalConditions: ['Ninguna']
        }
      }
    ];

    // Crear las recetas de ejemplo
    for (const prescription of samplePrescriptions) {
      await this.createPrescription(prescription);
    }
  }
}
