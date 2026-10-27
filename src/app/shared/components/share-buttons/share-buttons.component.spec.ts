import { TestBed } from '@angular/core/testing';
import { ShareButtonsComponent } from './share-buttons.component';

describe('ShareButtonsComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(ShareButtonsComponent);
    fixture.componentRef.setInput('path', '/product/medusa');
    fixture.componentRef.setInput('title', 'Medusa · BLAK Streetwear');
    fixture.componentRef.setInput('text', 'Mirá esta remera: Medusa');
    fixture.detectChanges();
    return fixture;
  }

  it('arma el mensaje de WhatsApp con el texto y el link de la remera', () => {
    const link: HTMLAnchorElement = setup().nativeElement.querySelector('a');
    const message = new URL(link.href).searchParams.get('text');
    expect(link.href.startsWith('https://wa.me/?text=')).toBe(true);
    expect(message).toBe(`Mirá esta remera: Medusa\n${location.origin}/product/medusa`);
  });

  it('copia el link y avisa que se copió', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const fixture = setup();

    await fixture.componentInstance.copyLink();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(`${location.origin}/product/medusa`);
    expect(fixture.nativeElement.textContent).toContain('¡Link copiado!');
  });
});
