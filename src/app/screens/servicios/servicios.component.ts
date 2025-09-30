import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-servicios',
  templateUrl: './servicios.component.html',
  styleUrls: ['./servicios.component.scss']
})
export class ServiciosComponent implements OnInit, OnDestroy {
  // Índice de página activa (0..totalPages-1)
  active = 0;
  // Tarjetas visibles por vista según breakpoint
  itemsPerView = 3;
  items = [
    { title: 'Restauración dental', price: '$1000', desc: 'La restauración dental consiste en reparar y devolver la función y apariencia natural a los dientes dañados o deteriorados, utilizando tratamientos como empastes, coronas y puentes.' },
    { title: 'Tratamiento de Encías', price: '$1000', desc: 'Previene y trata enfermedades gingivales, manteniendo las encías saludables y protegiendo los dientes.' },
    { title: 'Implantes', price: '$1000', desc: 'Raíces artificiales de titanio que reemplazan dientes perdidos, proporcionando una base sólida para coronas, puentes o prótesis.' },
    { title: 'Ortodoncia', price: '$1200', desc: 'Alineación y corrección de la posición de los dientes y mandíbula con brackets o alineadores.' },
    { title: 'Endodoncia', price: '$1500', desc: 'Tratamiento de conductos para salvar dientes dañados por caries profundas o infecciones.' },
  ];

  ngOnInit(): void {
    this.updateItemsPerView();
  this.startAutoplay();
  }

  @HostListener('window:resize')
  onResize() {
    const prev = this.itemsPerView;
    this.updateItemsPerView();
    // Reajusta la página activa si el número de páginas cambió
    if (this.totalPages <= this.active) {
      this.active = Math.max(0, this.totalPages - 1);
    }
    // Si el perView cambió, mantenemos la página lo más cercano posible
    if (prev !== this.itemsPerView) {
      this.active = Math.min(this.active, Math.max(0, this.totalPages - 1));
    }
  }

  private updateItemsPerView() {
    const w = window.innerWidth;
    if (w < 640) this.itemsPerView = 1;          // móvil
    else if (w < 1024) this.itemsPerView = 2;    // tablet
    else this.itemsPerView = 3;                   // desktop
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.items.length / this.itemsPerView));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  next() { this.active = (this.active + 1) % this.totalPages; }
  prev() { this.active = (this.active - 1 + this.totalPages) % this.totalPages; }

  // Autoplay & swipe
  private autoplayId: any = null;
  private autoplayDelay = 4000; // ms
  isPaused = false;

  startAutoplay() {
    this.clearAutoplay();
    if (this.totalPages <= 1) return; // no autoplay si solo hay una página
    this.autoplayId = setInterval(() => {
      if (!this.isPaused) this.next();
    }, this.autoplayDelay);
  }

  clearAutoplay() {
    if (this.autoplayId) {
      clearInterval(this.autoplayId);
      this.autoplayId = null;
    }
  }

  pauseAutoplay() { this.isPaused = true; }
  resumeAutoplay() { this.isPaused = false; }

  ngOnDestroy(): void {
    this.clearAutoplay();
  }

  // Swipe simple (sin arrastre visual)
  private touchStartX: number | null = null;
  private swipeThreshold = 50; // px

  onTouchStart(ev: Event) {
    const te = ev as TouchEvent;
    this.pauseAutoplay();
    if (te.touches && te.touches.length) {
      this.touchStartX = te.touches[0].clientX;
    }
  }

  onTouchMove(ev: Event) {
    // opcional: podríamos prevenir scroll horizontal excesivo
  }

  onTouchEnd() {
    if (this.touchStartX == null) { this.resumeAutoplay(); return; }
    const endX = this.touchStartX; // almacenamos inicio, no tenemos fin -> usamos last known? mejor leer from event, pero no lo tenemos aquí
    // Simplificamos: si hubo touchstart, delegamos a pointerup real: no hay delta -> no cambiamos. Para mejor UX, podemos usar TouchEvent en template.
    // Mejor solución: almacenamos último move
  }

  // Mejorado: guardamos último move para delta
  private lastTouchX: number | null = null;
  onTouchMoveCapture(ev: Event) {
    const te = ev as TouchEvent;
    if (te.touches && te.touches.length) {
      this.lastTouchX = te.touches[0].clientX;
    }
  }

  onTouchEndFinal() {
    if (this.touchStartX != null && this.lastTouchX != null) {
      const delta = this.lastTouchX - this.touchStartX;
      if (Math.abs(delta) > this.swipeThreshold) {
        if (delta < 0) this.next(); else this.prev();
      }
    }
    this.touchStartX = null;
    this.lastTouchX = null;
    this.resumeAutoplay();
  }
}
