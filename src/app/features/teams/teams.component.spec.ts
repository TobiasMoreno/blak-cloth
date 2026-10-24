import { TestBed } from '@angular/core/testing';
import { TeamsComponent } from './teams.component';

describe('TeamsComponent', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TeamsComponent],
    }).compileComponents();
  });

  const messageOf = (component: TeamsComponent) =>
    new URL(component.whatsappUrl()).searchParams.get('text') ?? '';

  it('should start without invented choices', () => {
    const component = TestBed.createComponent(TeamsComponent).componentInstance;

    expect(component.displayTeamName()).toBe('Tu equipo');
    expect(component.activeColor()).toBeNull();
    expect(component.placement()).toBeNull();
    expect(component.quantityLabel()).toBe('Sin elegir');
    expect(component.hasCrest()).toBeNull();
    expect(component.requiredChoicesComplete()).toBe(false);
  });

  it('should include the complete selected configuration in the WhatsApp message', () => {
    const component = TestBed.createComponent(TeamsComponent).componentInstance;

    component.form.patchValue({
      teamName: '  Barrio   Sur ',
      quantity: '50+',
      color: 'red',
      placement: 'back',
      hasCrest: false,
      location: 'Córdoba capital.',
      notes: 'Queremos evaluar nombres y números.',
    });

    const message = messageOf(component);

    expect(message).toContain('Equipo: Barrio Sur.');
    expect(message).toContain('Cantidad estimada: 50 o más remeras.');
    expect(message).toContain('Color preferido: Rojo.');
    expect(message).toContain('Estampa principal: espalda.');
    expect(message).toContain('Escudo: necesitamos ayuda para crearlo.');
    expect(message).toContain('Localidad: Córdoba capital.');
    expect(message).toContain('Algo más: Queremos evaluar nombres y números.');
    expect(message).toContain('no confirma una compra');
  });

  it('should not send a placeholder team name', () => {
    const component = TestBed.createComponent(TeamsComponent).componentInstance;

    component.form.patchValue({
      quantity: '10-19',
      color: 'off-white',
      placement: 'front',
      hasCrest: true,
    });

    expect(messageOf(component)).not.toContain('Equipo:');
  });

  it('should restore and validate a stored draft after a reload', () => {
    const first = TestBed.createComponent(TeamsComponent).componentInstance;
    first.form.patchValue({
      teamName: 'Ferro',
      quantity: '30-49',
      color: 'black',
      placement: 'front',
      hasCrest: true,
    });

    const restored = TestBed.createComponent(TeamsComponent).componentInstance;

    expect(restored.teamName()).toBe('Ferro');
    expect(restored.quantityLabel()).toBe('30–49');
    expect(restored.requiredChoicesComplete()).toBe(true);
  });
});
