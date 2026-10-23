import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';
import { PrintPlacement, TeamShirtPreviewComponent } from './team-shirt-preview.component';

type ShirtColor = 'black' | 'off-white' | 'red';

interface ShirtColorOption {
  id: ShirtColor;
  label: string;
  hex: string;
  printHex: string;
}

@Component({
  selector: 'app-teams',
  imports: [NgOptimizedImage, ReactiveFormsModule, TeamShirtPreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teams.component.html'
})
export class TeamsComponent {
  readonly colorOptions: readonly ShirtColorOption[] = [
    { id: 'black', label: 'Negro', hex: '#111111', printHex: '#d9182b' },
    { id: 'off-white', label: 'Crudo', hex: '#e7e7e1', printHex: '#d9182b' },
    { id: 'red', label: 'Rojo', hex: '#d9182b', printHex: '#f4f4f0' }
  ];
  readonly quantityOptions = [10, 20, 30, 50] as const;

  readonly teamNameControl = new FormControl('Los del Barrio', {
    nonNullable: true,
    validators: [Validators.maxLength(24)]
  });
  readonly quantityControl = new FormControl<number>(20, { nonNullable: true });
  readonly teamName = toSignal(this.teamNameControl.valueChanges, {
    initialValue: this.teamNameControl.value
  });
  readonly quantity = toSignal(this.quantityControl.valueChanges, {
    initialValue: this.quantityControl.value
  });
  readonly selectedColor = signal<ShirtColor>('black');
  readonly placement = signal<PrintPlacement>('front');
  readonly hasCrest = signal(true);

  readonly activeColor = computed(
    () => this.colorOptions.find(option => option.id === this.selectedColor()) ?? this.colorOptions[0]
  );
  readonly displayTeamName = computed(() => this.teamName().trim() || 'Tu equipo');
  readonly placementLabel = computed(() => (this.placement() === 'front' ? 'frente' : 'espalda'));
  readonly whatsappUrl = computed(() => {
    const crestMessage = this.hasCrest()
      ? 'Tenemos un escudo o referencia para enviar.'
      : 'Necesitamos ayuda para crear la identidad del equipo.';
    const message = [
      'Hola! Queremos pedir una propuesta de remeras para nuestro equipo.',
      `Equipo: ${this.displayTeamName()}.`,
      `Cantidad estimada: ${this.quantity()} remeras.`,
      `Color base: ${this.activeColor().label}.`,
      `Estampa principal: ${this.placementLabel()}.`,
      crestMessage
    ].join('\n');

    return getWhatsAppUrl(message);
  });

  selectColor(color: ShirtColor): void {
    this.selectedColor.set(color);
  }

  selectPlacement(placement: PrintPlacement): void {
    this.placement.set(placement);
  }

  selectCrestAvailability(hasCrest: boolean): void {
    this.hasCrest.set(hasCrest);
  }
}
