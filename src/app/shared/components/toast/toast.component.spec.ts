import { TestBed } from '@angular/core/testing';
import { ToastComponent } from './toast.component';
import { ToastService } from './toast.service';

describe('ToastComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra el aviso en una región anunciable y lo cierra solo', () => {
    const fixture = TestBed.createComponent(ToastComponent);
    const service = TestBed.inject(ToastService);
    const region: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');

    service.show('Agregado al carrito', 'Medusa · Talle M · Negro');
    fixture.detectChanges();
    expect(region.textContent).toContain('Agregado al carrito');
    expect(region.textContent).toContain('Medusa · Talle M · Negro');

    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    expect(region.textContent?.trim()).toBe('');
  });

  it('se puede cerrar con el botón', () => {
    const fixture = TestBed.createComponent(ToastComponent);
    TestBed.inject(ToastService).show('Agregado al carrito');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[aria-label="Cerrar aviso"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.toast-enter').length).toBe(0);
  });
});
