import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { dentistGuard } from './dentist.guard';

describe('dentistGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => dentistGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
