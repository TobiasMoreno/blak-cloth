import { TestBed } from '@angular/core/testing';
import { TeamsComponent } from './teams.component';

describe('TeamsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamsComponent]
    }).compileComponents();
  });

  it('should create the configurator with useful defaults', () => {
    const fixture = TestBed.createComponent(TeamsComponent);
    const component = fixture.componentInstance;

    expect(component.displayTeamName()).toBe('Los del Barrio');
    expect(component.activeColor().label).toBe('Negro');
    expect(component.placement()).toBe('front');
    expect(component.quantity()).toBe(20);
  });

  it('should update the shirt configuration', () => {
    const fixture = TestBed.createComponent(TeamsComponent);
    const component = fixture.componentInstance;

    component.teamNameControl.setValue('Barrio Sur');
    component.quantityControl.setValue(30);
    component.selectColor('red');
    component.selectPlacement('back');
    component.selectCrestAvailability(false);

    expect(component.displayTeamName()).toBe('Barrio Sur');
    expect(component.activeColor().label).toBe('Rojo');
    expect(component.placementLabel()).toBe('espalda');
    expect(component.quantity()).toBe(30);
    expect(component.hasCrest()).toBe(false);
  });

  it('should include the selected configuration in the WhatsApp message', () => {
    const fixture = TestBed.createComponent(TeamsComponent);
    const component = fixture.componentInstance;

    component.teamNameControl.setValue('Barrio Sur');
    component.quantityControl.setValue(30);
    component.selectColor('red');
    component.selectPlacement('back');
    component.selectCrestAvailability(false);

    const message = new URL(component.whatsappUrl()).searchParams.get('text');

    expect(message).toContain('Equipo: Barrio Sur.');
    expect(message).toContain('Cantidad estimada: 30 remeras.');
    expect(message).toContain('Color base: Rojo.');
    expect(message).toContain('Estampa principal: espalda.');
    expect(message).toContain('Necesitamos ayuda para crear la identidad del equipo.');
  });
});
