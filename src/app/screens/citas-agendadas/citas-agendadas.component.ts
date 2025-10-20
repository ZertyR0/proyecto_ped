import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { CitasService } from '../../services/citas.service';

interface AppointmentCard extends Appointment {
  formattedDate: string;
  dayName: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  canCancel: boolean;
  statusText: string;
  statusClass: string;
}

@Component({
  selector: 'app-citas-agendadas',
  templateUrl: './citas-agendadas.component.html',
  styleUrls: ['./citas-agendadas.component.scss']
})
export class CitasAgendadasComponent implements OnInit {
  private auth = inject(Auth);
  private appointmentService = inject(AppointmentService);
  private citasService = inject(CitasService);

  appointments: AppointmentCard[] = [];
  filteredAppointments: AppointmentCard[] = [];
  loading = true;
  selectedFilter = 'all';
  currentWeekStart = new Date();

  filterOptions = [
    { value: 'all', label: 'Todas las citas', count: 0 },
    { value: 'upcoming', label: 'Próximas', count: 0 },
    { value: 'pending', label: 'Pendientes', count: 0 },
    { value: 'confirmed', label: 'Confirmadas', count: 0 },
    { value: 'past', label: 'Pasadas', count: 0 }
  ];

  ngOnInit() {
    this.setCurrentWeek();
    this.loadAppointments();
  }

  // Modal state for cancel confirmation
  selectedAppointment: AppointmentCard | null = null;
  showCancelModal = false;
  @ViewChild('cancelModal', { static: false }) cancelModalRef: any;

  setCurrentWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    this.currentWeekStart = new Date(today);
    this.currentWeekStart.setDate(today.getDate() - dayOfWeek);
  }

  async loadAppointments() {
    this.loading = true;
    try {
      const user = this.auth.currentUser;
      if (!user) return;

  const rawAppointments = await this.citasService.getAppointmentsForTutor(user.uid);
  this.appointments = rawAppointments.map(appointment => this.enhanceAppointment(appointment as Appointment));
      
      this.updateFilterCounts();
      this.applyFilter(this.selectedFilter);
    } catch (error) {
      console.error('Error al cargar citas:', error);
    } finally {
      this.loading = false;
    }
  }

  enhanceAppointment(appointment: Appointment): AppointmentCard {
    // Parse date string YYYY-MM-DD as local date (avoid timezone shifts with ISO parsing)
    let appointmentDate: Date;
    if (appointment.date && typeof appointment.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(appointment.date)) {
      const [y, m, d] = appointment.date.split('-').map(Number);
      appointmentDate = new Date(y, m - 1, d);
    } else if ((appointment as any).fecha && ((appointment as any).fecha as any).toDate) {
      appointmentDate = ((appointment as any).fecha as any).toDate();
    } else {
      appointmentDate = new Date(appointment.date || Date.now());
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);

    const isToday = appointmentDate.getTime() === today.getTime();
    const isPast = appointmentDate < today;
    const isFuture = appointmentDate > today;
    
    // Se puede cancelar si es futura y está pendiente o confirmada
    const canCancel = (isFuture || isToday) && ['pending', 'confirmed'].includes(appointment.status);

    return {
      ...appointment,
      formattedDate: appointmentDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      dayName: appointmentDate.toLocaleDateString('es-ES', { weekday: 'long' }),
      isToday,
      isPast,
      isFuture,
      canCancel,
      statusText: this.getStatusText(appointment.status),
      statusClass: this.getStatusClass(appointment.status)
    };
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendiente de confirmación',
      'confirmed': 'Confirmada',
      'completed': 'Completada',
      'cancelled': 'Cancelada'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return classMap[status] || 'status-default';
  }

  updateFilterCounts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.filterOptions.forEach(option => {
      switch (option.value) {
        case 'all':
          option.count = this.appointments.length;
          break;
        case 'upcoming':
          option.count = this.appointments.filter(apt => 
            (apt.isFuture || apt.isToday) && ['pending', 'confirmed'].includes(apt.status)
          ).length;
          break;
        case 'pending':
          option.count = this.appointments.filter(apt => apt.status === 'pending').length;
          break;
        case 'confirmed':
          option.count = this.appointments.filter(apt => apt.status === 'confirmed').length;
          break;
        case 'past':
          option.count = this.appointments.filter(apt => apt.isPast || apt.status === 'completed').length;
          break;
      }
    });
  }

  applyFilter(filterValue: string) {
    this.selectedFilter = filterValue;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filterValue) {
      case 'all':
        this.filteredAppointments = [...this.appointments];
        break;
      case 'upcoming':
        this.filteredAppointments = this.appointments.filter(apt => 
          (apt.isFuture || apt.isToday) && ['pending', 'confirmed'].includes(apt.status)
        );
        break;
      case 'pending':
        this.filteredAppointments = this.appointments.filter(apt => apt.status === 'pending');
        break;
      case 'confirmed':
        this.filteredAppointments = this.appointments.filter(apt => apt.status === 'confirmed');
        break;
      case 'past':
        this.filteredAppointments = this.appointments.filter(apt => 
          apt.isPast || apt.status === 'completed'
        );
        break;
    }

    // Ordenar por fecha y hora
    this.filteredAppointments.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateB.getTime() - dateA.getTime(); // Más recientes primero
    });
  }

  openCancelModal(appointment: AppointmentCard) {
    if (!appointment.canCancel || !appointment.id) return;
    this.selectedAppointment = appointment;
    this.showCancelModal = true;
  }

  async onCancelConfirmed(confirmed: boolean) {
    if (!this.selectedAppointment) {
      this.showCancelModal = false;
      return;
    }

    // If the modal emitted false, the user closed/cancelled the dialog: close modal
    if (!confirmed) {
      this.showCancelModal = false;
      this.selectedAppointment = null;
      return;
    }

    if (confirmed) {
      try {
        // Preferir CitasService que opera sobre la colección 'citas'
        if (this.citasService && this.selectedAppointment.id) {
          await this.citasService.updateAppointmentStatus(this.selectedAppointment.id, 'cancelled' as any);
        } else {
          await this.appointmentService.cancelAppointment(this.selectedAppointment.id as string);
        }

        // Actualizar el estado local
        this.selectedAppointment.status = 'cancelled';
        this.selectedAppointment.statusText = this.getStatusText('cancelled');
        this.selectedAppointment.statusClass = this.getStatusClass('cancelled');
        this.selectedAppointment.canCancel = false;

        this.updateFilterCounts();
        this.applyFilter(this.selectedFilter);
        // Indicar éxito en el modal
        try { this.cancelModalRef?.showSuccess(); } catch(e) {}
        try {
          // Notificar a otras partes de la app (por ejemplo el componente de agendar) que las citas cambiaron
          const payload = { date: this.selectedAppointment.date, time: this.selectedAppointment.time, id: this.selectedAppointment.id };
          window.dispatchEvent(new CustomEvent('citas:changed', { detail: payload } as any));
        } catch (e) {
          // ignore
        }
      } catch (error) {
        console.error('Error al cancelar cita:', error);
        try { this.cancelModalRef?.showError((error && (error as any).message) ? (error as any).message : undefined); } catch(e) {}
      }
  }
  }

  // Navegación de semana (para vista de calendario)
  previousWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.currentWeekStart = new Date(this.currentWeekStart);
  }

  nextWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.currentWeekStart = new Date(this.currentWeekStart);
  }

  getWeekDays(): Date[] {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(this.currentWeekStart);
      day.setDate(this.currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }

  getAppointmentsForDate(date: Date): AppointmentCard[] {
    const dateString = date.toISOString().split('T')[0];
    return this.filteredAppointments.filter(apt => apt.date === dateString);
  }

  formatTime(time: string): string {
    return time;
  }

  get currentWeekRange(): string {
    const endDate = new Date(this.currentWeekStart);
    endDate.setDate(this.currentWeekStart.getDate() + 6);
    
    return `${this.currentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  // Helper methods for template
  isAllFilter(): boolean {
    return this.selectedFilter === 'all';
  }

  getFilterLabel(): string {
    const filter = this.filterOptions.find(f => f.value === this.selectedFilter);
    return filter ? filter.label.toLowerCase() : '';
  }

  isSelectedFilter(filterValue: string): boolean {
    return this.selectedFilter === filterValue;
  }

  isTodayDate(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  getTodayDateString(): string {
    return new Date().toDateString();
  }

  hasNoAppointments(): boolean {
    return !this.loading && this.filteredAppointments.length === 0;
  }

  hasAppointments(): boolean {
    return !this.loading && this.filteredAppointments.length > 0;
  }

  canShowActions(appointment: AppointmentCard): boolean {
    return appointment.canCancel || appointment.status === 'pending';
  }

  isPendingStatus(appointment: AppointmentCard): boolean {
    return appointment.status === 'pending';
  }
}
