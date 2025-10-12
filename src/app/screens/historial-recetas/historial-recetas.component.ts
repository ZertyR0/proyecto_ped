import { Component, inject, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { PrescriptionService, MedicalPrescription, PatientInfo } from '../../services/prescription.service';

interface Child {
  id?: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  alergias: string;
}

interface PrescriptionView extends MedicalPrescription {
  formattedDate: string;
  searchText: string;
  totalCost: number;
}

@Component({
  selector: 'app-historial-recetas',
  templateUrl: './historial-recetas.component.html',
  styleUrls: ['./historial-recetas.component.scss']
})
export class HistorialRecetasComponent implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private prescriptionService = inject(PrescriptionService);

  prescriptions: PrescriptionView[] = [];
  filteredPrescriptions: PrescriptionView[] = [];
  children: Child[] = [];
  loading = true;
  
  // Vista actual: 'list' o 'bitacora'
  currentView = 'list';
  
  // Receta seleccionada para vista detallada
  selectedPrescription: PrescriptionView | null = null;
  
  // Filtros para vista de lista
  selectedChild = '';
  selectedDoctor = '';
  selectedStatus = '';
  searchTerm = '';
  dateFrom = '';
  dateTo = '';

  // Listas para filtros
  doctors: string[] = [];
  statuses = [
    { value: 'active', label: 'Activa' },
    { value: 'completed', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' }
  ];

  // Filtros de la vista principal (como en la imagen)
  treatmentFilters = [
    'Manejo del dolor postoperatorio',
    'Enjuague bucal antiséptico',
    'Extracción de muela del juicio',
    'Tratamiento de ortodoncia',
    'Tratamiento de una infección de',
    'Manejo de sensibilidad dental'
  ];

  selectedTreatmentFilter = 'Enjuague bucal antiséptico';

  ngOnInit() {
    this.loadChildren();
    this.loadPrescriptions();
  }

  async loadChildren() {
    const user = this.auth.currentUser;
    if (!user) return;

    try {
      const childrenCollectionRef = collection(this.firestore, `users/${user.uid}/children`);
      const querySnapshot = await getDocs(childrenCollectionRef);
      
      this.children = [];
      querySnapshot.forEach((doc) => {
        this.children.push({ id: doc.id, ...doc.data() } as Child);
      });
    } catch (error) {
      console.error('Error al cargar hijos:', error);
    }
  }

  async loadPrescriptions() {
    this.loading = true;
    try {
      const rawPrescriptions = await this.prescriptionService.getUserPrescriptions();
      
      // Si no hay recetas, generar datos de ejemplo
      if (rawPrescriptions.length === 0) {
        await this.prescriptionService.generateSampleData();
        const newPrescriptions = await this.prescriptionService.getUserPrescriptions();
        this.processPrescriptions(newPrescriptions);
      } else {
        this.processPrescriptions(rawPrescriptions);
      }
      
      this.extractFilterOptions();
      this.applyFilters();
      
      // Seleccionar la primera receta para vista detallada
      if (this.filteredPrescriptions.length > 0) {
        this.selectedPrescription = this.filteredPrescriptions[0];
      }
    } catch (error) {
      console.error('Error al cargar recetas:', error);
    } finally {
      this.loading = false;
    }
  }

  processPrescriptions(prescriptions: MedicalPrescription[]) {
    this.prescriptions = prescriptions.map(prescription => ({
      ...prescription,
      formattedDate: new Date(prescription.date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      searchText: `${prescription.childName} ${prescription.doctor} ${prescription.diagnosis} ${prescription.treatmentName}`.toLowerCase(),
      totalCost: prescription.cost || 0
    }));
  }

  extractFilterOptions() {
    // Extraer doctores únicos
    this.doctors = [...new Set(this.prescriptions.map(p => p.doctor))].sort();
  }

  applyFilters() {
    this.filteredPrescriptions = this.prescriptions.filter(prescription => {
      // Filtro por hijo
      if (this.selectedChild && prescription.childId !== this.selectedChild) {
        return false;
      }

      // Filtro por doctor
      if (this.selectedDoctor && prescription.doctor !== this.selectedDoctor) {
        return false;
      }

      // Filtro por estado
      if (this.selectedStatus && prescription.status !== this.selectedStatus) {
        return false;
      }

      // Filtro por fecha desde
      if (this.dateFrom && prescription.date < this.dateFrom) {
        return false;
      }

      // Filtro por fecha hasta
      if (this.dateTo && prescription.date > this.dateTo) {
        return false;
      }

      // Filtro por término de búsqueda
      if (this.searchTerm && !prescription.searchText.includes(this.searchTerm.toLowerCase())) {
        return false;
      }

      // Filtro por tratamiento (vista principal)
      if (this.selectedTreatmentFilter && this.currentView === 'list') {
        return prescription.treatmentName.toLowerCase().includes(this.selectedTreatmentFilter.toLowerCase());
      }

      return true;
    });

    // Si hay filtros aplicados y no hay receta seleccionada, seleccionar la primera
    if (this.filteredPrescriptions.length > 0 && !this.selectedPrescription) {
      this.selectedPrescription = this.filteredPrescriptions[0];
    }
  }

  onFilterChange() {
    this.applyFilters();
  }

  onTreatmentFilterChange(treatment: string) {
    this.selectedTreatmentFilter = treatment;
    this.applyFilters();
  }

  clearFilters() {
    this.selectedChild = '';
    this.selectedDoctor = '';
    this.selectedStatus = '';
    this.searchTerm = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.selectedTreatmentFilter = '';
    this.applyFilters();
  }

  switchView(view: 'list' | 'bitacora') {
    this.currentView = view;
    if (view === 'bitacora' && this.filteredPrescriptions.length > 0 && !this.selectedPrescription) {
      this.selectedPrescription = this.filteredPrescriptions[0];
    }
  }

  selectPrescription(prescription: PrescriptionView) {
    this.selectedPrescription = prescription;
    if (this.currentView === 'list') {
      this.currentView = 'bitacora';
    }
  }

  printPrescription() {
    if (this.selectedPrescription) {
      // Implementar funcionalidad de impresión
      window.print();
    }
  }

  exportData() {
    const dataStr = JSON.stringify(this.filteredPrescriptions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `historial-recetas-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  getChildName(childId: string): string {
    const child = this.children.find(c => c.id === childId);
    return child ? `${child.nombre} ${child.apellidoPaterno}` : 'Paciente no encontrado';
  }

  getChildAge(childId: string): number {
    const child = this.children.find(c => c.id === childId);
    if (!child || !child.fechaNacimiento) return 0;
    
    const birthDate = new Date(child.fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getChildAllergies(childId: string): string {
    const child = this.children.find(c => c.id === childId);
    return child?.alergias || 'Ninguna alergia conocida';
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  getStatusClass(status: string): string {
    const classes = {
      'active': 'status-active',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return classes[status as keyof typeof classes] || 'status-default';
  }

  getStatusText(status: string): string {
    const texts = {
      'active': 'Activa',
      'completed': 'Completada',
      'cancelled': 'Cancelada'
    };
    return texts[status as keyof typeof texts] || status;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  async updatePrescriptionStatus(prescriptionId: string, status: MedicalPrescription['status']) {
    try {
      await this.prescriptionService.updatePrescriptionStatus(prescriptionId, status);
      
      // Actualizar el estado local
      const prescription = this.prescriptions.find(p => p.id === prescriptionId);
      if (prescription) {
        prescription.status = status;
      }
      
      if (this.selectedPrescription && this.selectedPrescription.id === prescriptionId) {
        this.selectedPrescription.status = status;
      }
      
      this.applyFilters();
    } catch (error) {
      console.error('Error al actualizar estado de receta:', error);
    }
  }
}
