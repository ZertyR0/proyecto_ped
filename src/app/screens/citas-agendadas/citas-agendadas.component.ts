import { Component, inject, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { AppointmentService, Appointment } from '../../services/appointment.service';

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

      const rawAppointments = await this.appointmentService.getUserAppointments();
      this.appointments = rawAppointments.map(appointment => this.enhanceAppointment(appointment));
      
      this.updateFilterCounts();
      this.applyFilter(this.selectedFilter);
    } catch (error) {
      console.error('Error al cargar citas:', error);
    } finally {
      this.loading = false;
    }
  }

  enhanceAppointment(appointment: Appointment): AppointmentCard {
    const appointmentDate = new Date(appointment.date);
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

  async cancelAppointment(appointment: AppointmentCard) {
    if (!appointment.canCancel || !appointment.id) return;

    const confirmed = confirm(
      `¿Estás seguro de que deseas cancelar la cita del ${appointment.formattedDate} a las ${appointment.time}?`
    );

    if (!confirmed) return;

    try {
      await this.appointmentService.cancelAppointment(appointment.id);
      
      // Actualizar el estado local
      appointment.status = 'cancelled';
      appointment.statusText = this.getStatusText('cancelled');
      appointment.statusClass = this.getStatusClass('cancelled');
      appointment.canCancel = false;

      this.updateFilterCounts();
      this.applyFilter(this.selectedFilter);
      
      // Mostrar mensaje de éxito (puedes implementar un toast service)
      alert('Cita cancelada exitosamente');
    } catch (error) {
      console.error('Error al cancelar cita:', error);
      alert('Error al cancelar la cita. Inténtalo de nuevo.');
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
