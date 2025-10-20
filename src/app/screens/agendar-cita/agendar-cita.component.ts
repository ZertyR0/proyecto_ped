import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CitasService } from '../../services/citas.service';

// --- Interfaces para la estructura de datos del componente ---
interface TimeSlot {
  hour: string;
  available: boolean;
}

interface DaySchedule {
  date: Date;
  day: number;
  month: number;
  year: number;
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  timeSlots: TimeSlot[];
}

interface Child {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

@Component({
  selector: 'app-agendar-cita',
  templateUrl: './agendar-cita.component.html',
  styleUrls: ['./agendar-cita.component.scss']
})
export class AgendarCitaComponent implements OnInit {
  // --- Inyección de servicios ---
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private citasService = inject(CitasService);

  // --- Estado del calendario ---
  currentMonth = new Date();
  selectedDate: Date | null = null;
  calendarDays: DaySchedule[] = [];
  
  // --- Horarios base de atención ---
  availableHours = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  // --- Datos del usuario y estado de carga ---
  children: Child[] = [];
  loading = false;
  loadingCalendar = false;

  // --- Formulario para la cita ---
  appointmentForm: FormGroup = this.fb.group({
    childId: ['', Validators.required],
    date: ['', Validators.required],
    time: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(10)]],
    notes: ['']
  });

  // --- Estado de la UI para los pasos del formulario ---
  step = 1;
  selectedTimeSlot: string = '';
  confirmationData: any = null;

  ngOnInit() {
    this.loadChildren();
    this.generateCalendar();
    // Escuchar cambios en citas para refrescar disponibilidad cuando se cancela o modifica una cita
    window.addEventListener('citas:changed', this.onCitasChanged as EventListener);
  }

  ngOnDestroy() {
    try { window.removeEventListener('citas:changed', this.onCitasChanged as EventListener); } catch(e) {}
  }

  private onCitasChanged = async (ev: Event) => {
    try {
      const detail: any = (ev as CustomEvent).detail;
      if (!detail || !detail.date) return;
      // Si el usuario tiene actualmente seleccionada la fecha afectada, refrescar los horarios
      if (this.selectedDate && this.selectedDate.toISOString().split('T')[0] === detail.date) {
        await this.updateTimeSlotsForDate(this.selectedDate);
      }
      // También podríamos regenerar el calendario si se prefiere
    } catch (err) {
      // ignore
    }
  }

  loadChildren() {
    const user = this.authService.currentUser;
    if (!user) return;
    this.authService.getChildrenForTutor(user.uid).subscribe(childrenData => {
      this.children = childrenData as Child[];
    });
  }

  async generateCalendar() {
    this.loadingCalendar = true;
    this.calendarDays = [];

    // Obtener la fecha/hora actual en Ciudad de México para calcular isToday/isPast correctamente
    let mexicoNow = new Date();
    try {
      const nowResp = await this.citasService.getCurrentTimeInMexico();
      const iso = nowResp?.datetime;
      if (iso && typeof iso === 'string') {
        const d = new Date(iso);
        if (!isNaN(d.getTime())) mexicoNow = d;
      }
    } catch (err) {
      console.warn('[DEBUG] generateCalendar: could not get Mexico time, falling back to local time', err);
    }

    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const mexicoToday = new Date(mexicoNow);
    mexicoToday.setHours(0, 0, 0, 0);

    let current = new Date(startDate);
    while (current <= endDate) {
      this.calendarDays.push({
        date: new Date(current),
        day: current.getDate(),
        month: current.getMonth(),
        year: current.getFullYear(),
        isToday: this.isSameDay(current, mexicoToday),
        isPast: current < mexicoToday,
        isSelected: this.selectedDate ? this.isSameDay(current, this.selectedDate) : false,
        timeSlots: this.availableHours.map(hour => ({ hour, available: true }))
      });
      current.setDate(current.getDate() + 1);
    }

    this.loadingCalendar = false;

    // Si el día de hoy está en el rango mostrado, pre-desactivar localmente los horarios pasados
    try {
      const todayVisible = this.calendarDays.find(d => d.isToday);
      if (todayVisible) {
        const currentHour = mexicoNow.getHours();
        const currentMinute = mexicoNow.getMinutes();

        todayVisible.timeSlots = todayVisible.timeSlots.map(ts => {
          const [h, m] = ts.hour.split(':').map(Number);
          // si la hora ya pasó en Ciudad de México, marcar no disponible
          if (currentHour > h || (currentHour === h && currentMinute >= m)) {
            return { hour: ts.hour, available: false };
          }
          return ts;
        });

        // Actualizar también desde la fuente autoritativa para marcar horarios ya tomados
        // No esperamos esta llamada para no bloquear la UI
        this.updateTimeSlotsForDate(todayVisible.date).catch(err => console.warn('[DEBUG] updateTimeSlotsForDate early refresh failed:', err));
      }
    } catch (err) {
      console.warn('[DEBUG] generateCalendar: could not pre-disable past slots:', err);
    }
  }

  // --- FUNCIÓN DE DISPONIBILIDAD  ---
  async updateTimeSlotsForDate(date: Date) {
    try {
      this.loadingCalendar = true;
      const dateString = date.toISOString().split('T')[0];
      // DEBUG: mostrar usuario y token parcial antes de consultar disponibilidad
      try {
        // suppressed debug logs in production
      } catch (logErr) {
        // suppressed
      }
      
      const user = this.authService.currentUser;
      const tutorId = user?.uid;
      const [existingAppointments, nowResponse] = await Promise.all([
        this.citasService.getAppointmentsForDate(dateString, tutorId),
        this.citasService.getCurrentTimeInMexico()
      ]);

  // debug logs removed

      const takenTimes = new Set(existingAppointments.map(app => app.time));

      // Compute Mexico City local date and time from the returned ISO, avoiding substring(0,10) which yields UTC date
      const mexicoDateString = new Date(nowResponse.datetime).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }); // YYYY-MM-DD
      const mexicoTimeParts = new Date(nowResponse.datetime).toLocaleTimeString('en-GB', { timeZone: 'America/Mexico_City', hour12: false }).split(':');
      const mexicoHour = Number(mexicoTimeParts[0]);
      const mexicoMinute = Number(mexicoTimeParts[1]);
  // debug logs removed

      const isToday = (dateString === mexicoDateString);

      const daySchedule = this.calendarDays.find(d => this.isSameDay(d.date, date));
      if (daySchedule) {
        const updatedSlots = this.availableHours.map(hour => {
          let isAvailable = !takenTimes.has(hour);

          if (isToday && !Number.isNaN(mexicoHour) && !Number.isNaN(mexicoMinute)) {
            const [slotHour, slotMinute] = hour.split(':').map(Number);
            if (mexicoHour > slotHour || (mexicoHour === slotHour && mexicoMinute >= slotMinute)) {
              isAvailable = false;
            }
          }

          return { hour, available: isAvailable };
        });

        daySchedule.timeSlots = updatedSlots;
      }
    } catch (error) {
      console.error('Error al actualizar horarios:', error);
      try { console.log('[DEBUG] currentUser (on updateTimeSlotsForDate error):', this.authService?.currentUser ?? null); } catch(e){}
    } finally {
      this.loadingCalendar = false;
    }
  }

  // --- FUNCIÓN selectDate CORREGIDA PARA SOLUCIONAR LA "CARRERA DE TIEMPOS" ---
  async selectDate(day: DaySchedule) {
    if (!this.isDayAvailable(day)) return;
    
    this.selectedDate = day.date;
    this.appointmentForm.patchValue({ date: day.date.toISOString().split('T')[0] });
    this.calendarDays.forEach(d => d.isSelected = this.isSameDay(d.date, day.date));
    
    // Hacemos la función 'async' para poder usar 'await'.
    // Usamos 'await' para forzar al código a ESPERAR a que la consulta de disponibilidad termine.
    await this.updateTimeSlotsForDate(day.date);
    
    // Solo DESPUÉS de que los horarios se hayan actualizado, avanzamos al siguiente paso.
    this.goToStep(2);
  }
  
  selectTime(timeSlot: TimeSlot) {
    if (!timeSlot.available) return;
    // Asumimos que updateTimeSlotsForDate ya deshabilitó horarios pasados y ocupados.
    this.selectedTimeSlot = timeSlot.hour;
    this.appointmentForm.patchValue({ time: timeSlot.hour });
    this.goToStep(3);
  }

  async submitAppointment() {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    const user = this.authService.currentUser;
    if (!user) { this.loading = false; return; }
    try {
      const formData = this.appointmentForm.value;
      // Validar que la fecha/hora seleccionada no esté en el pasado según la hora de México
      const dateString = formData.date; // 'YYYY-MM-DD'
      const timeString = formData.time; // 'HH:MM'
      const selectedDateTime = new Date(`${dateString}T${timeString}:00`);
      const nowResponse = await this.citasService.getCurrentTimeInMexico();
      const mexicoNow = new Date(nowResponse.datetime);
      if (selectedDateTime.getTime() < mexicoNow.getTime()) {
        window.alert('No se puede agendar en una fecha/hora pasada. Selecciona otro horario.');
        this.loading = false;
        // refrescar disponibilidad por si cambió
        if (this.selectedDate) await this.updateTimeSlotsForDate(this.selectedDate);
        return;
      }

      // Comprobar que el slot no esté ocupado en la base de datos (evita doble booking)
      // Usamos getAppointmentsForDate y comprobamos localmente el campo 'time' para evitar falsos positivos
  const appointmentsForDay = await this.citasService.getAppointmentsForDate(dateString, user.uid);
      const slotTaken = appointmentsForDay.some((a: any) => a.time === timeString);
      if (slotTaken) {
        window.alert('El horario seleccionado ya está ocupado. Elige otro horario.');
        this.loading = false;
        if (this.selectedDate) await this.updateTimeSlotsForDate(this.selectedDate);
        this.goToStep(2);
        return;
      }

      const selectedChild = this.children.find(c => c.id === formData.childId);
      const appointmentData = {
        tutorId: user.uid,
        tutorEmail: user.email || '',
        childId: formData.childId,
        childName: `${selectedChild?.nombre} ${selectedChild?.apellidoPaterno}`,
        date: formData.date,
        time: formData.time,
        reason: formData.reason,
        notes: formData.notes
      };
      const appointmentId = await this.citasService.createAppointment(appointmentData);
      this.confirmationData = {
        ...appointmentData,
        id: appointmentId,
        formattedDate: new Date(formData.date).toLocaleDateString('es-ES', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
        })
      };
      this.goToStep(4);
    } catch (error) {
      console.error('Error al agendar cita:', error);
      // Manejo específico para errores de permisos de Firestore
      const msg = (error && (error as any).code && (error as any).message) ? `${(error as any).code}: ${(error as any).message}` : 'Ocurrió un error al agendar la cita.';
      if ((error as any)?.code === 'permission-denied' || (error as any)?.message?.includes('Missing or insufficient permissions')) {
        window.alert('No se pudo guardar la cita: verifique permisos en Firestore (Missing or insufficient permissions).');
      } else {
        window.alert(msg);
      }
    } finally {
      this.loading = false;
    }
  }

  newAppointment() {
    this.step = 1;
    this.selectedDate = null;
    this.selectedTimeSlot = '';
    this.confirmationData = null;
    this.appointmentForm.reset({ childId: '', reason: '', notes: '' });
    this.generateCalendar();
  }

  goToStep(step: number) { this.step = step; }
  previousMonth() { this.currentMonth.setMonth(this.currentMonth.getMonth() - 1); this.generateCalendar(); }
  nextMonth() { this.currentMonth.setMonth(this.currentMonth.getMonth() + 1); this.generateCalendar(); }
  
  isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  get currentMonthName(): string { return this.currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }); }
  
  get selectedDateFormatted(): string {
    if (!this.selectedDate) return '';
    return this.selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }

  getSelectedDayTimeSlots(): TimeSlot[] {
    const selectedDay = this.calendarDays.find(d => d.isSelected);
    return selectedDay?.timeSlots || [];
  }

  isFieldInvalidAndTouched(fieldName: string): boolean {
    const field = this.appointmentForm.get(fieldName);
    return !!(field?.invalid && (field?.touched || field?.dirty));
  }

  getFieldError(fieldName: string): string {
    const field = this.appointmentForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
  
  isTimeSlotSelected(hour: string): boolean { return this.selectedTimeSlot === hour; }
  isStepActive(stepNumber: number): boolean { return this.step === stepNumber; }
  isDayAvailable(day: DaySchedule): boolean { return !day.isPast && day.month === this.currentMonth.getMonth(); }
  isConfirmationStep(): boolean { return this.step === 4 && !!this.confirmationData; }
}

