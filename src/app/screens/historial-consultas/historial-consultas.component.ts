import { Component, inject, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { MedicalConsultationService, MedicalConsultation } from '../../services/medical-consultation.service';

interface Child {
  id?: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

interface ConsultationView extends MedicalConsultation {
  formattedDate: string;
  searchText: string;
}

@Component({
  selector: 'app-historial-consultas',
  templateUrl: './historial-consultas.component.html',
  styleUrls: ['./historial-consultas.component.scss']
})
export class HistorialConsultasComponent implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private consultationService = inject(MedicalConsultationService);

  consultations: ConsultationView[] = [];
  filteredConsultations: ConsultationView[] = [];
  children: Child[] = [];
  loading = true;
  
  // Filtros
  selectedChild = '';
  selectedDoctor = '';
  selectedReason = '';
  searchTerm = '';
  dateFrom = '';
  dateTo = '';

  // Listas para filtros
  doctors: string[] = [];
  reasons: string[] = [];

  ngOnInit() {
    this.loadChildren();
    this.loadConsultations();
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

  async loadConsultations() {
    this.loading = true;
    try {
      const rawConsultations = await this.consultationService.getUserConsultations();
      
      // Si no hay consultaciones, generar datos de ejemplo
      if (rawConsultations.length === 0) {
        await this.consultationService.generateSampleData();
        const newConsultations = await this.consultationService.getUserConsultations();
        this.processConsultations(newConsultations);
      } else {
        this.processConsultations(rawConsultations);
      }
      
      this.extractFilterOptions();
      this.applyFilters();
    } catch (error) {
      console.error('Error al cargar consultas:', error);
    } finally {
      this.loading = false;
    }
  }

  processConsultations(consultations: MedicalConsultation[]) {
    this.consultations = consultations.map(consultation => ({
      ...consultation,
      formattedDate: new Date(consultation.date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      searchText: `${consultation.childName} ${consultation.doctor} ${consultation.reason} ${consultation.diagnosis} ${consultation.treatment}`.toLowerCase()
    }));
  }

  extractFilterOptions() {
    // Extraer doctores únicos
    this.doctors = [...new Set(this.consultations.map(c => c.doctor))].sort();
    
    // Extraer motivos únicos
    this.reasons = [...new Set(this.consultations.map(c => c.reason))].sort();
  }

  applyFilters() {
    this.filteredConsultations = this.consultations.filter(consultation => {
      // Filtro por hijo
      if (this.selectedChild && consultation.childId !== this.selectedChild) {
        return false;
      }

      // Filtro por doctor
      if (this.selectedDoctor && consultation.doctor !== this.selectedDoctor) {
        return false;
      }

      // Filtro por motivo
      if (this.selectedReason && consultation.reason !== this.selectedReason) {
        return false;
      }

      // Filtro por fecha desde
      if (this.dateFrom && consultation.date < this.dateFrom) {
        return false;
      }

      // Filtro por fecha hasta
      if (this.dateTo && consultation.date > this.dateTo) {
        return false;
      }

      // Filtro por término de búsqueda
      if (this.searchTerm && !consultation.searchText.includes(this.searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.selectedChild = '';
    this.selectedDoctor = '';
    this.selectedReason = '';
    this.searchTerm = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilters();
  }

  exportData() {
    // Implementar exportación a PDF o Excel
    const dataStr = JSON.stringify(this.filteredConsultations, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `historial-consultas-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  getChildName(childId: string): string {
    const child = this.children.find(c => c.id === childId);
    return child ? `${child.nombre} ${child.apellidoPaterno}` : 'Paciente no encontrado';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatTime(timeString: string): string {
    return timeString;
  }

  getStatusClass(status: string): string {
    const classes = {
      'completed': 'status-completed',
      'in-progress': 'status-progress',
      'cancelled': 'status-cancelled'
    };
    return classes[status as keyof typeof classes] || 'status-default';
  }

  getStatusText(status: string): string {
    const texts = {
      'completed': 'Completada',
      'in-progress': 'En Progreso',
      'cancelled': 'Cancelada'
    };
    return texts[status as keyof typeof texts] || status;
  }
}
