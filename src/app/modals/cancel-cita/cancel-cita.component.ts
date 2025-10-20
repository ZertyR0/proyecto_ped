import { Component, EventEmitter, Input, Output } from '@angular/core';

type ModalState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-cancel-cita',
  templateUrl: './cancel-cita.component.html',
  styleUrls: ['./cancel-cita.component.scss']
})
export class CancelCitaComponent {
  @Input() appointment: any | null = null;
  /**
   * Emitted when the user confirms or closes the modal. The component consumer
   * should perform the actual cancellation action when receives the confirmed event.
   */
  @Output() confirmed = new EventEmitter<boolean>();

  // Internal UI state
  state: ModalState = 'idle';
  errorMessage: string | null = null;

  onConfirm() {
    // Inform parent that the user wants to confirm; parent will perform the cancel operation
    // and can then call showSuccess() via a template reference or rely on parent to close the modal.
    this.state = 'loading';
    this.confirmed.emit(true);
  }

  onClose() {
    // reset state and emit cancel/close
    this.state = 'idle';
    this.errorMessage = null;
    this.confirmed.emit(false);
  }

  // Called by parent to indicate the cancellation succeeded
  showSuccess() {
    this.state = 'success';
  }

  // Called by parent if the cancellation failed
  showError(message?: string) {
    this.state = 'error';
    this.errorMessage = message || 'Ocurrió un error';
  }
}
