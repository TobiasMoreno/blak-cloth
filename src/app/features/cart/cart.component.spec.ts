import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartComponent, buildOrderMessage } from './cart.component';
import { CartService } from '../../core/services/cart.service';
import { CartItem } from '../../core/models/cart-item.model';

const MEDUSA: CartItem = {
  productId: 'medusa',
  productName: 'Medusa',
  price: 20000,
  size: 'M',
  color: 'Negro',
  image: 'products/medusa/mockup.jpeg',
  quantity: 1
};

describe('CartComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(CartService).addItem(MEDUSA);
  });

  function render() {
    const fixture = TestBed.createComponent(CartComponent);
    fixture.detectChanges();
    return fixture;
  }

  function finishLink(fixture: ReturnType<typeof render>): HTMLAnchorElement {
    return Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a')).find(link =>
      link.textContent?.includes('Finalizar por WhatsApp')
    )!;
  }

  it('propone retiro en local si no hay una entrega guardada', () => {
    const fixture = render();
    const retiro: HTMLInputElement = fixture.nativeElement.querySelector('input[value="retiro"]');
    expect(retiro.checked).toBe(true);
  });

  it('finaliza con un link real a WhatsApp, sin depender de una ventana emergente', () => {
    const link = finishLink(render());
    expect(link.href).toContain('wa.me');
    expect(link.target).toBe('_blank');
  });

  it('con envío y sin dirección no abre WhatsApp y explica qué falta', () => {
    const fixture = render();
    fixture.componentInstance.onDeliveryTypeChange('envio');
    fixture.detectChanges();

    const click = new MouseEvent('click', { cancelable: true });
    finishLink(fixture).dispatchEvent(click);
    fixture.detectChanges();

    expect(click.defaultPrevented).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('dirección');
    expect(TestBed.inject(CartService).isEmpty()).toBe(false);
  });

  it('al finalizar vacía el carrito, muestra el pedido y permite recuperarlo', () => {
    const fixture = render();
    const cart = TestBed.inject(CartService);

    // jsdom no navega: se cancela solo la apertura del link, no la lógica del click
    const click = new MouseEvent('click', { cancelable: true });
    const link = finishLink(fixture);
    link.addEventListener('click', event => event.preventDefault());
    link.dispatchEvent(click);
    fixture.detectChanges();

    expect(cart.isEmpty()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Tu pedido está en WhatsApp');

    const restore = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(button =>
      button.textContent?.includes('recuperar el carrito')
    )!;
    restore.click();
    fixture.detectChanges();

    expect(cart.getCartItems()()).toEqual([MEDUSA]);
  });

  it('las cantidades de la misma remera en dos talles tienen ids distintos', () => {
    TestBed.inject(CartService).addItem({ ...MEDUSA, size: 'L' });
    const fixture = render();
    const ids = Array.from<HTMLInputElement>(fixture.nativeElement.querySelectorAll('input[type="number"]')).map(
      input => input.id
    );
    expect(new Set(ids).size).toBe(2);
  });

  it('arma el mensaje con la dirección cuando es envío', () => {
    const message = buildOrderMessage([MEDUSA], 20000, 'envio', '  Av. Colón 100 ');
    expect(message).toContain('Envío a domicilio');
    expect(message).toContain('Dirección: Av. Colón 100\n');
  });

  it('detalla el descuento mayorista en el mensaje', () => {
    const message = buildOrderMessage([{ ...MEDUSA, quantity: 5 }], 90000, 'retiro', '', {
      percent: 10,
      amount: 10000
    });
    expect(message).toContain('Subtotal: $100.000\n');
    expect(message).toContain('Descuento mayorista 10%: -$10.000\n');
    expect(message).toContain('Total: $90.000\n');
  });
});
