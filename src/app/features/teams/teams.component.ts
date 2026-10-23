import { ChangeDetectionStrategy, Component, ElementRef, computed, signal, viewChild } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';
import { PrintPlacement, TeamShirtPreviewComponent } from './team-shirt-preview.component';

type ShirtColor = 'black' | 'off-white' | 'red';

interface ShirtColorOption {
  id: ShirtColor;
  label: string;
  hex: string;
  printHex: string;
}

interface QuantityOption {
  value: number;
  label: string;
}

export const TEAM_NAME_MAX_LENGTH = 24;
const STORAGE_KEY = 'lm-studio:teams-configurator';

// Colapsa espacios repetidos y quita puntos finales para no generar "Córdoba.." en el mensaje.
function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
}

@Component({
  selector: 'app-teams',
  imports: [NgOptimizedImage, ReactiveFormsModule, TeamShirtPreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teams.component.html',
  styles: `
    .choice {
      background-color: #f4f4f0;
      color: #0b0b0b;
      transition: background-color 150ms ease;
    }

    .choice:hover {
      background-color: #d6d6cf;
    }

    .choice:has(:checked) {
      background-color: #0b0b0b;
      color: #fff;
    }

    .choice:has(:focus-visible) {
      outline: 3px solid var(--focus-ring, var(--accent));
      outline-offset: 4px;
    }

    /* En mobile la vista previa queda fija arriba: los campos no deben quedar tapados al enfocarlos. */
    @media (max-width: 1023px) {
      .configurator-form :is(input, select, legend) {
        scroll-margin-top: 20rem;
      }
    }
  `
})
export class TeamsComponent {
  readonly colorOptions: readonly ShirtColorOption[] = [
    { id: 'black', label: 'Negro', hex: '#111111', printHex: '#d9182b' },
    { id: 'off-white', label: 'Crudo', hex: '#e7e7e1', printHex: '#d9182b' },
    { id: 'red', label: 'Rojo', hex: '#d9182b', printHex: '#f4f4f0' }
  ];
  readonly quantityOptions: readonly QuantityOption[] = [
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 30, label: '30' },
    { value: 50, label: '50 o más' }
  ];
  readonly teamNameMaxLength = TEAM_NAME_MAX_LENGTH;
  readonly faq: readonly { question: string; answer: string }[] = [
    {
      question: '¿Son camisetas de fútbol?',
      answer:
        'No. Son remeras comunes de algodón, pensadas para usar fuera de la cancha y personalizadas con la identidad del equipo.'
    },
    {
      question: '¿Hay una cantidad mínima?',
      answer:
        'Contanos cuántas necesitan. Confirmamos la viabilidad y armamos una propuesta acorde al volumen del pedido.'
    },
    {
      question: '¿Podemos mandar nuestro escudo?',
      answer:
        'Sí. Podés enviarlo junto con fotos, colores o referencias por WhatsApp. El equipo debe contar con autorización para usar ese material.'
    },
    {
      question: '¿Se pueden agregar nombres o números?',
      answer:
        'Lo evaluamos dentro de la propuesta. Decinos cuántas variantes necesitan para contemplarlo desde el comienzo.'
    },
    {
      question: '¿Qué talles y colores hay?',
      answer:
        'Las variantes se confirman según disponibilidad antes de producir. Así el pedido queda cerrado sin sorpresas.'
    },
    {
      question: '¿Cuánto tarda el pedido?',
      answer:
        'El plazo se acuerda después de definir diseño, cantidad y disponibilidad. No iniciamos la producción hasta que todo esté confirmado.'
    }
  ];

  readonly form = new FormGroup({
    teamName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(TEAM_NAME_MAX_LENGTH)]
    }),
    color: new FormControl<ShirtColor>('black', { nonNullable: true }),
    placement: new FormControl<PrintPlacement>('front', { nonNullable: true }),
    quantity: new FormControl<number | null>(null),
    hasCrest: new FormControl<boolean | null>(null),
    deadline: new FormControl('', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true })
  });

  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue()
  });
  private readonly configuratorSection = viewChild.required<ElementRef<HTMLElement>>('configuratorSection');
  private readonly configuratorHeading = viewChild.required<ElementRef<HTMLElement>>('configuratorHeading');

  // Hasta que el usuario toca algo, los CTA no envían elecciones que no hizo.
  readonly interacted = signal(false);

  readonly teamName = computed(() => normalizeText(this.value().teamName));
  readonly teamNameLength = computed(() => this.value().teamName.length);
  readonly displayTeamName = computed(() => this.teamName() || 'Tu equipo');
  readonly activeColor = computed(
    () => this.colorOptions.find(option => option.id === this.value().color) ?? this.colorOptions[0]
  );
  readonly placement = computed(() => this.value().placement);
  readonly placementLabel = computed(() => (this.placement() === 'front' ? 'frente' : 'espalda'));
  readonly hasCrest = computed(() => this.value().hasCrest);
  readonly quantityLabel = computed(
    () => this.quantityOptions.find(option => option.value === this.value().quantity)?.label ?? null
  );
  readonly crestLabel = computed(() => {
    const hasCrest = this.hasCrest();
    return hasCrest === null ? null : hasCrest ? 'Lo tienen' : 'A crear';
  });
  readonly previewSummary = computed(
    () =>
      `Vista previa actualizada: remera ${this.activeColor().label.toLowerCase()}, estampa en ${
        this.placement() === 'front' ? 'el frente' : 'la espalda'
      }, ${this.displayTeamName()}.`
  );

  readonly whatsappMessage = computed(() => {
    if (!this.interacted()) {
      return '¡Hola! Quiero consultar por remeras de algodón para un equipo.';
    }

    const { hasCrest } = this.value();
    const deadline = normalizeText(this.value().deadline);
    const location = normalizeText(this.value().location);
    const lines = ['¡Hola! Queremos pedir una propuesta de remeras de algodón para nuestro equipo.'];

    if (this.teamName()) {
      lines.push(`Equipo: ${this.teamName()}.`);
    }
    if (this.quantityLabel()) {
      lines.push(`Cantidad estimada: ${this.quantityLabel()} remeras.`);
    }
    lines.push(`Color de la remera: ${this.activeColor().label}.`);
    lines.push(`Estampa principal: ${this.placementLabel()}.`);
    if (hasCrest !== null) {
      lines.push(hasCrest ? 'Escudo: tenemos uno para enviar.' : 'Escudo: necesitamos ayuda para crearlo.');
    }
    if (deadline) {
      lines.push(`Para cuándo: ${deadline}.`);
    }
    if (location) {
      lines.push(`Localidad: ${location}.`);
    }

    return lines.join('\n');
  });
  readonly whatsappUrl = computed(() => getWhatsAppUrl(this.whatsappMessage()));

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.interacted.set(true);
      this.saveDraft();
    });
    this.restoreDraft();
  }

  goToConfigurator(event: Event): void {
    event.preventDefault();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.configuratorSection().nativeElement.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start'
    });
    this.configuratorHeading().nativeElement.focus({ preventScroll: true });
  }

  // Borrador por pestaña: si el usuario recarga después de abrir WhatsApp, no pierde lo elegido.
  private saveDraft(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.form.getRawValue()));
    } catch {
      // Sin almacenamiento disponible el configurador sigue funcionando.
    }
  }

  private restoreDraft(): void {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.form.patchValue(JSON.parse(saved));
      }
    } catch {
      // Un borrador ilegible o un almacenamiento bloqueado se ignoran.
    }
  }
}
