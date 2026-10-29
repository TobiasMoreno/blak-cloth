import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';
import { PrintPlacement, TeamShirtPreviewComponent } from './team-shirt-preview.component';

type ShirtColor = 'black' | 'off-white' | 'red';
type QuantityRange = '10-19' | '20-29' | '30-49' | '50+';

interface ShirtColorOption {
  id: ShirtColor;
  label: string;
  hex: string;
  printHex: string;
}

interface QuantityOption {
  value: QuantityRange;
  label: string;
  messageLabel: string;
}

interface TeamConfiguratorDraft {
  teamName: string;
  color: ShirtColor | null;
  placement: PrintPlacement | null;
  quantity: QuantityRange | null;
  hasCrest: boolean | null;
  deadline: string;
  location: string;
  notes: string;
}

export const TEAM_NAME_MAX_LENGTH = 28;
export const TEAM_NOTES_MAX_LENGTH = 240;
const STORAGE_KEY = 'blak:teams-configurator';
const LONG_NAME_THRESHOLD = 18;

function normalizeText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Component({
  selector: 'app-teams',
  imports: [NgOptimizedImage, ReactiveFormsModule, TeamShirtPreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teams.component.html',
  styles: `
    /* .choice vive en styles.css: lo comparten el configurador y el detalle de remera */
    .field-invalid .choice,
    select[aria-invalid='true'] {
      outline: 3px solid var(--color-accent);
      outline-offset: 2px;
    }

    @media (max-width: 1023px) {
      .configurator-form :is(input, select, textarea, legend) {
        scroll-margin-top: 16rem;
      }
    }

    @media (max-width: 640px) and (max-height: 700px) {
      .mobile-preview {
        position: relative;
        top: auto;
      }
    }
  `,
})
export class TeamsComponent {
  readonly colorOptions: readonly ShirtColorOption[] = [
    { id: 'black', label: 'Negro', hex: '#111111', printHex: '#d9182b' },
    { id: 'off-white', label: 'Crudo', hex: '#e7e7e1', printHex: '#d9182b' },
    { id: 'red', label: 'Rojo', hex: '#d9182b', printHex: '#f4f4f0' },
  ];
  readonly quantityOptions: readonly QuantityOption[] = [
    { value: '10-19', label: '10–19', messageLabel: 'Entre 10 y 19' },
    { value: '20-29', label: '20–29', messageLabel: 'Entre 20 y 29' },
    { value: '30-49', label: '30–49', messageLabel: 'Entre 30 y 49' },
    { value: '50+', label: '50 o más', messageLabel: '50 o más' },
  ];
  readonly teamNameMaxLength = TEAM_NAME_MAX_LENGTH;
  readonly notesMaxLength = TEAM_NOTES_MAX_LENGTH;
  readonly faq: readonly { question: string; answer: string }[] = [
    {
      question: '¿Qué tipo de remera ofrecen?',
      answer:
        'Una remera común de algodón, para uso diario y fuera de la cancha. No es una camiseta deportiva ni una prenda de tela técnica.',
    },
    {
      question: '¿Desde cuántas remeras puedo consultar?',
      answer:
        'El configurador organiza la idea en tramos desde 10 unidades. Si necesitan otra cantidad, escribila en “Algo más” y la evaluamos antes de cotizar.',
    },
    {
      question: '¿Escudo y estampa principal son lo mismo?',
      answer:
        'No necesariamente. “Frente o espalda” ubica la gráfica principal; la pregunta del escudo nos dice si ya existe un archivo para incorporar. Su tamaño y ubicación final se definen en la propuesta.',
    },
    {
      question: '¿Se pueden sumar nombres o números?',
      answer:
        'Podés pedirlo en “Algo más”. Indicá cuántas variantes serían para que la propuesta contemple ese trabajo desde el comienzo.',
    },
    {
      question: '¿Cuándo se confirman talles, colores y precio?',
      answer:
        'Después de revisar la idea confirmamos opciones disponibles, curva de talles, alcance del diseño y cotización. Nada entra en producción hasta que esté acordado.',
    },
    {
      question: '¿Cuánto tarda y cómo se entrega?',
      answer:
        'Indicá una fecha objetivo y la localidad. El plazo se confirma según diseño, cantidad y disponibilidad. La entrega se coordina en Córdoba; para otra localidad evaluamos la alternativa antes de cotizar.',
    },
    {
      question: '¿Qué pasa después de enviar la consulta?',
      answer:
        'WhatsApp se abre con el resumen listo. Ahí podés adjuntar escudo y referencias; revisamos el material y respondemos con los puntos que falten para armar la propuesta.',
    },
  ];

  readonly form = new FormGroup({
    teamName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(TEAM_NAME_MAX_LENGTH)],
    }),
    color: new FormControl<ShirtColor | null>(null, Validators.required),
    placement: new FormControl<PrintPlacement | null>(null, Validators.required),
    quantity: new FormControl<QuantityRange | null>(null, Validators.required),
    hasCrest: new FormControl<boolean | null>(null),
    deadline: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(40)] }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(40)] }),
    notes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(TEAM_NOTES_MAX_LENGTH)],
    }),
  });

  private readonly value = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );
  private readonly configuratorSection =
    viewChild.required<ElementRef<HTMLElement>>('configuratorSection');
  private readonly configuratorHeading =
    viewChild.required<ElementRef<HTMLElement>>('configuratorHeading');
  private readonly configuratorForm =
    viewChild.required<ElementRef<HTMLFormElement>>('configuratorForm');

  readonly attemptedSubmit = signal(false);
  readonly previewAnnouncement = signal('');

  readonly teamName = computed(() => normalizeText(this.value().teamName));
  readonly teamNameLength = computed(() => this.value().teamName.length);
  readonly notesLength = computed(() => this.value().notes.length);
  readonly displayTeamName = computed(() => this.teamName() || 'Tu equipo');
  readonly hasLongName = computed(() => this.teamName().length > LONG_NAME_THRESHOLD);
  readonly activeColor = computed(
    () => this.colorOptions.find((option) => option.id === this.value().color) ?? null,
  );
  readonly previewColor = computed(() => this.activeColor()?.hex ?? '#777770');
  readonly previewPrintColor = computed(() => this.activeColor()?.printHex ?? '#f4f4f0');
  readonly colorLabel = computed(() => this.activeColor()?.label ?? 'Sin elegir');
  readonly placement = computed(() => this.value().placement);
  readonly placementLabel = computed(() => {
    const placement = this.placement();
    return placement === null ? 'Sin elegir' : placement === 'front' ? 'Frente' : 'Espalda';
  });
  readonly hasCrest = computed(() => this.value().hasCrest);
  readonly quantityOption = computed(
    () => this.quantityOptions.find((option) => option.value === this.value().quantity) ?? null,
  );
  readonly quantityLabel = computed(() => this.quantityOption()?.label ?? 'Sin elegir');
  readonly crestLabel = computed(() => {
    const hasCrest = this.hasCrest();
    return hasCrest === null ? 'Sin responder' : hasCrest ? 'Ya existe' : 'Hay que crearlo';
  });
  readonly requiredChoicesComplete = computed(
    () =>
      this.activeColor() !== null &&
      this.placement() !== null &&
      this.quantityOption() !== null &&
      this.hasCrest() !== null,
  );

  readonly whatsappMessage = computed(() => {
    const deadline = normalizeText(this.value().deadline);
    const location = normalizeText(this.value().location);
    const notes = normalizeText(this.value().notes);
    const lines = [
      '¡Hola! Queremos pedir una propuesta de remeras de algodón para nuestro equipo.',
    ];

    if (this.teamName()) {
      lines.push(`Equipo: ${this.teamName()}.`);
    }
    lines.push(`Cantidad estimada: ${this.quantityOption()?.messageLabel ?? 'A definir'} remeras.`);
    lines.push(`Color preferido: ${this.colorLabel()}.`);
    lines.push(`Estampa principal: ${this.placementLabel().toLowerCase()}.`);
    lines.push(
      this.hasCrest()
        ? 'Escudo: tenemos uno para enviar; su ubicación queda a definir.'
        : 'Escudo: necesitamos ayuda para crearlo.',
    );
    if (deadline) {
      lines.push(`Fecha objetivo: ${deadline}.`);
    }
    if (location) {
      lines.push(`Localidad: ${location}.`);
    }
    if (notes) {
      lines.push(`Algo más: ${notes}.`);
    }
    lines.push('Sabemos que esto inicia una consulta y no confirma una compra.');

    return lines.join('\n');
  });
  readonly whatsappUrl = computed(() => getWhatsAppUrl(this.whatsappMessage()));

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.saveDraft();
    });
    this.restoreDraft();
  }

  goToConfigurator(event?: Event): void {
    event?.preventDefault();
    this.scrollToConfigurator();
    this.configuratorHeading().nativeElement.focus({ preventScroll: true });
  }

  announcePreview(): void {
    const placement = this.placement();
    const side =
      placement === null
        ? 'ubicación sin elegir'
        : `estampa en ${this.placementLabel().toLowerCase()}`;
    this.previewAnnouncement.set(
      `Vista previa actualizada: remera ${this.colorLabel().toLowerCase()}, ${side}, nombre ${this.displayTeamName()}.`,
    );
  }

  submitProposal(): void {
    this.attemptedSubmit.set(true);
    this.form.markAllAsTouched();

    if (!this.requiredChoicesComplete() || this.form.invalid) {
      this.scrollToConfigurator();
      requestAnimationFrame(() => {
        const firstInvalid =
          this.configuratorForm().nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]');
        firstInvalid?.focus({ preventScroll: true });
      });
      return;
    }

    this.saveDraft();
    window.open(this.whatsappUrl(), '_blank', 'noopener,noreferrer');
  }

  private scrollToConfigurator(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.configuratorSection().nativeElement.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

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
      if (!saved) {
        return;
      }
      const parsed: unknown = JSON.parse(saved);
      const draft = this.parseDraft(parsed);
      if (draft) {
        this.form.patchValue(draft);
      }
    } catch {
      // Un borrador ilegible o un almacenamiento bloqueado se ignoran.
    }
  }

  private parseDraft(value: unknown): TeamConfiguratorDraft | null {
    if (!isRecord(value)) {
      return null;
    }

    const colors: readonly unknown[] = this.colorOptions.map((option) => option.id);
    const quantities: readonly unknown[] = this.quantityOptions.map((option) => option.value);
    const placements: readonly unknown[] = ['front', 'back'];
    const color = colors.includes(value['color']) ? (value['color'] as ShirtColor) : null;
    const placement = placements.includes(value['placement'])
      ? (value['placement'] as PrintPlacement)
      : null;
    const quantity = quantities.includes(value['quantity'])
      ? (value['quantity'] as QuantityRange)
      : null;
    const hasCrest = typeof value['hasCrest'] === 'boolean' ? value['hasCrest'] : null;

    return {
      teamName:
        typeof value['teamName'] === 'string'
          ? value['teamName'].slice(0, TEAM_NAME_MAX_LENGTH)
          : '',
      color,
      placement,
      quantity,
      hasCrest,
      deadline: typeof value['deadline'] === 'string' ? value['deadline'].slice(0, 40) : '',
      location: typeof value['location'] === 'string' ? value['location'].slice(0, 40) : '',
      notes:
        typeof value['notes'] === 'string' ? value['notes'].slice(0, TEAM_NOTES_MAX_LENGTH) : '',
    };
  }
}
