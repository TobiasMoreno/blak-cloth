import { TestBed } from '@angular/core/testing';
import { TeamsComponent } from './teams.component';

describe('TeamsComponent', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TeamsComponent]
    }).compileComponents();
  });

  const messageOf = (component: TeamsComponent) =>
    new URL(component.whatsappUrl()).searchParams.get('text') ?? '';

  it('should start without invented choices', () => {
    const component = TestBed.createComponent(TeamsComponent).componentInstance;

    expect(component.displayTeamName()).toBe('Tu equipo');
    expect(component.activeColor().label).toBe('Negro');
    expect(component.placement()).toBe('front');
    expect(component.quantityLabel()).toBeNull();
    expect(component.hasCrest()).toBeNull();
    expect(messageOf(component)).toBe('¡Hola! Quiero consultar por remeras de algodón para un equipo.');
  });

  it('should include only the selected configuration in the WhatsApp message', () => {
    const component = TestBed.createComponent(TeamsComponent).componentInstance;

    component.form.patchValue({
      teamName: '  Barrio   Sur ',
      quantity: 50,
      color: 'red',
      placement: 'back',
      hasCrest: false,
      location: 'Córdoba capital.'
    });

    const message = messageOf(component);

    expect(message).toContain('Equipo: Barrio Sur.');
    expect(message).toContain('Cantidad estimada: 50 o más remeras.');
    expect(message).toContain('Color de la remera: Rojo.');
    expect(message).toContain('Estampa principal: espalda.');
    expect(message).toContain('Escudo: necesitamos ayuda para crearlo.');
    expect(message).toContain('Localidad: Córdoba capital.');
    expect(message).not.toContain('Para cuándo');
  });

  it('should not send a placeholder team name', () => {
    const component = TestBed.createComponent(TeamsComponent).componentInstance;

    component.form.patchValue({ color: 'off-white' });

    expect(messageOf(component)).not.toContain('Equipo:');
    expect(messageOf(component)).not.toContain('Escudo');
  });

  it('should restore the draft after a reload', () => {
    const first = TestBed.createComponent(TeamsComponent).componentInstance;
    first.form.patchValue({ teamName: 'Ferro', quantity: 30 });

    const restored = TestBed.createComponent(TeamsComponent).componentInstance;

    expect(restored.teamName()).toBe('Ferro');
    expect(restored.quantityLabel()).toBe('30');
  });
});
