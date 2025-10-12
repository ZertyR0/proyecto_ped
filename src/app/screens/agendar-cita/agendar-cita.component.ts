import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { AppointmentService } from '../../services/appointment.service';

interface TimeSlot {
  hour: string;
  available: boolean;
  appointmentId?: string;
}

interface DaySchedule {
  date: Date;
  day: number;
  month: number;
  year: number;
  dayName: string;
  monthName: string;
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  timeSlots: TimeSlot[];
}

interface Child {
  id?: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  sexo: string;
  alergias: string;
}

@Component({
  selector: 'app-agendar-cita',
  templateUrl: './agendar-cita.component.html',
  styleUrls: ['./agendar-cita.component.scss']
})
export class AgendarCitaComponent implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);

  // Estado del calendario
  currentMonth = new Date();
  selectedDate: Date | null = null;
  calendarDays: DaySchedule[] = [];
  
  // Horarios disponibles
  availableHours = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  // Datos del usuario
  children: Child[] = [];
  loading = false;
  loadingCalendar = false;

  // Formulario
  appointmentForm: FormGroup = this.fb.group({
    childId: ['', Validators.required],
    date: ['', Validators.required],
    time: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(10)]],
    notes: ['']
  });

  // Estado de la UI
  step = 1; // 1: Calendario, 2: Horario, 3: Datos, 4: Confirmación
  selectedTimeSlot: string = '';
  confirmationData: any = null;

  ngOnInit() {
    this.loadChildren();
    this.generateCalendar();
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

  generateCalendar() {
    this.loadingCalendar = true;
    this.calendarDays = [];
    
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const today = new Date();
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0);
    
    // Días a mostrar (incluyendo días del mes anterior y siguiente)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Comenzar desde domingo
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // Terminar en sábado
    
    const current = new Date(startDate);
    
    while (current <= endDate) {
      // Normalizar fechas para comparación correcta (solo fecha, sin hora)
      const currentDateOnly = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const daySchedule: DaySchedule = {
        date: new Date(current),
        day: current.getDate(),
        month: current.getMonth(),
        year: current.getFullYear(),
        dayName: current.toLocaleDateString('es-ES', { weekday: 'short' }),
        monthName: current.toLocaleDateString('es-ES', { month: 'short' }),
        isToday: this.isSameDay(current, today),
        isPast: currentDateOnly < todayOnly,
        isSelected: this.selectedDate ? this.isSameDay(current, this.selectedDate) : false,
        timeSlots: this.generateTimeSlots()
      };
      
      this.calendarDays.push(daySchedule);
      current.setDate(current.getDate() + 1);
    }
    
    this.loadingCalendar = false;
  }

  generateTimeSlots(): TimeSlot[] {
    return this.availableHours.map(hour => ({
      hour,
      available: true // Se actualizará dinámicamente al seleccionar fecha
    }));
  }

  async updateTimeSlotsForDate(date: Date) {
    try {
      const dateString = date.toISOString().split('T')[0];
      const availableTimes = await this.appointmentService.getAvailableTimeSlots(dateString);
      
      const daySchedule = this.calendarDays.find(d => d.isSelected);
      if (daySchedule) {
        daySchedule.timeSlots = this.availableHours.map(hour => ({
          hour,
          available: availableTimes.includes(hour)
        }));
      }
    } catch (error) {
      console.error('Error updating time slots:', error);
    }
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  // Navegación del calendario
  previousMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  // Selección de fecha
  selectDate(day: DaySchedule) {
    if (day.isPast || day.month !== this.currentMonth.getMonth()) {
      return;
    }
    
    this.selectedDate = day.date;
    this.appointmentForm.patchValue({
      date: day.date.toISOString().split('T')[0]
    });
    
    // Actualizar el estado de selección en el calendario
    this.calendarDays.forEach(d => d.isSelected = false);
    day.isSelected = true;
    
    this.step = 2;
    
    // Cargar horarios disponibles para esta fecha
    this.updateTimeSlotsForDate(day.date);
  }

  // Selección de horario
  selectTime(timeSlot: TimeSlot) {
    if (!timeSlot.available) return;
    
    this.selectedTimeSlot = timeSlot.hour;
    this.appointmentForm.patchValue({
      time: timeSlot.hour
    });
    
    this.step = 3;
  }

  // Navegación entre pasos
  goToStep(step: number) {
    this.step = step;
  }

  // Envío del formulario
  async submitAppointment() {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const user = this.auth.currentUser;
    if (!user) return;

    try {
      const formData = this.appointmentForm.value;
      const selectedChild = this.children.find(c => c.id === formData.childId);
      
      const appointmentData = {
        userId: user.uid,
        userEmail: user.email || '',
        childId: formData.childId,
        childName: `${selectedChild?.nombre} ${selectedChild?.apellidoPaterno}`,
        date: formData.date,
        time: formData.time,
        reason: formData.reason,
        notes: formData.notes,
        status: 'pending' as const
      };

      const appointmentId = await this.appointmentService.createAppointment(appointmentData);
      
      this.confirmationData = {
        ...appointmentData,
        id: appointmentId,
        formattedDate: new Date(formData.date).toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };
      
      this.step = 4;
    } catch (error) {
      console.error('Error al agendar cita:', error);
    } finally {
      this.loading = false;
    }
  }

  // Reiniciar el proceso
  newAppointment() {
    this.step = 1;
    this.selectedDate = null;
    this.selectedTimeSlot = '';
    this.confirmationData = null;
    this.appointmentForm.reset();
    this.generateCalendar();
  }

  // Helpers para la UI
  get currentMonthName(): string {
    return this.currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  get selectedChild(): Child | undefined {
    const childId = this.appointmentForm.get('childId')?.value;
    return this.children.find(c => c.id === childId);
  }

  get selectedDateFormatted(): string {
    if (!this.selectedDate) return '';
    return this.selectedDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getSelectedDayTimeSlots(): TimeSlot[] {
    const selectedDay = this.calendarDays.find(d => d.isSelected);
    return selectedDay?.timeSlots || [];
  }

  // Helper methods for template
  isFieldInvalidAndTouched(fieldName: string): boolean {
    const field = this.appointmentForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.appointmentForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }

  isTimeSlotSelected(hour: string): boolean {
    return this.selectedTimeSlot === hour;
  }

  isStepActive(stepNumber: number): boolean {
    return this.step === stepNumber;
  }

  isDayAvailable(day: DaySchedule): boolean {
    return !day.isPast && day.month === this.currentMonth.getMonth();
  }

  isConfirmationStep(): boolean {
    return this.step === 4 && !!this.confirmationData;
  }
}
