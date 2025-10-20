import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancelCitaComponent } from './cancel-cita.component';

describe('CancelCitaComponent', () => {
  let component: CancelCitaComponent;
  let fixture: ComponentFixture<CancelCitaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CancelCitaComponent]
    });
    fixture = TestBed.createComponent(CancelCitaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
