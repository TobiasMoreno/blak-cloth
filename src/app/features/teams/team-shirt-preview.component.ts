import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type PrintPlacement = 'front' | 'back';

const CONNECTORS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e']);

@Component({
  selector: 'app-team-shirt-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full w-full',
  },
  template: `
    <div
      class="frame relative flex h-full items-center justify-center overflow-hidden bg-accent p-3 md:p-4"
    >
      <p
        class="absolute left-3 top-3 z-10 bg-ink px-3 py-1 text-xs font-semibold text-white md:left-6 md:top-6 md:text-sm"
      >
        {{ placementLabel() }}
      </p>
      @if (hasCrest() !== null) {
        <p
          class="absolute bottom-3 right-3 z-10 max-w-40 bg-ink px-3 py-2 text-right text-xs leading-snug text-white md:bottom-6 md:right-6 md:text-sm"
        >
          {{ hasCrest() ? 'Escudo: ubicación a definir' : 'Escudo: hay que crearlo' }}
        </p>
      }
      <div
        class="stage relative flex items-center justify-center rounded-full"
        [style.background-color]="stageColor()"
        role="img"
        [attr.aria-label]="previewDescription()"
      >
        <div
          class="shirt relative"
          [class.shirt-back]="placement() === 'back'"
          [class.shirt-pending]="placement() === null"
          [style.background-color]="shirtColor()"
          [style.--stage]="stageColor()"
        >
          @if (placement() === 'front') {
            <div
              class="print-front absolute flex flex-col items-center text-center"
              [style.color]="printColor()"
            >
              <span class="front-name block font-display font-black uppercase">{{
                displayName()
              }}</span>
            </div>
          } @else if (placement() === 'back') {
            <div
              class="print-back absolute flex flex-col items-center text-center font-display font-black uppercase"
              [style.color]="printColor()"
            >
              <span class="back-initials block">{{ initials() }}</span>
              <span class="back-name block">{{ displayName() }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .frame {
      container-type: size;
    }

    .stage {
      width: min(88cqh, 92cqw);
      aspect-ratio: 1;
    }

    .shirt {
      width: 68%;
      aspect-ratio: 0.82;
      container-type: inline-size;
      clip-path: polygon(
        24% 5%,
        38% 0,
        62% 0,
        76% 5%,
        100% 20%,
        87% 42%,
        76% 35%,
        76% 100%,
        24% 100%,
        24% 35%,
        13% 42%,
        0 20%
      );
    }

    .shirt::after {
      content: '';
      position: absolute;
      left: 41%;
      top: -1%;
      width: 18%;
      height: 8%;
      border-radius: 0 0 999px 999px;
      background: var(--stage);
    }

    .shirt-back::after {
      height: 4%;
    }

    .shirt-pending {
      opacity: 0.72;
    }

    .print-front {
      top: 25%;
      left: 22%;
      width: 56%;
    }

    .front-name,
    .back-name {
      display: -webkit-box;
      overflow: hidden;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .front-name {
      font-size: clamp(0.75rem, 8cqw, 2.5rem);
      line-height: 0.9;
    }

    .print-back {
      top: 23%;
      left: 22%;
      width: 56%;
    }

    .back-initials {
      font-size: clamp(1.55rem, 22cqw, 6.5rem);
      line-height: 0.82;
    }

    .back-name {
      margin-top: 2cqw;
      font-size: clamp(0.72rem, 5.5cqw, 1.9rem);
      line-height: 0.95;
    }
  `,
})
export class TeamShirtPreviewComponent {
  teamName = input.required<string>();
  shirtColor = input.required<string>();
  shirtColorLabel = input.required<string>();
  printColor = input.required<string>();
  placement = input.required<PrintPlacement | null>();
  hasCrest = input<boolean | null>(null);

  displayName = computed(() => this.teamName().trim() || 'Tu equipo');
  placementLabel = computed(() => {
    const placement = this.placement();
    return placement === null
      ? 'Elegí frente o espalda'
      : placement === 'front'
        ? 'Frente'
        : 'Espalda';
  });
  stageColor = computed(() => (this.isLightShirt() ? '#0b0b0b' : '#f4f4f0'));
  initials = computed(() => {
    const words = this.displayName().split(/\s+/).filter(Boolean);
    const meaningful = words.filter(
      (word, index) => index === 0 || !CONNECTORS.has(word.toLowerCase()),
    );
    return meaningful
      .slice(0, 3)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();
  });
  previewDescription = computed(() => {
    const placement = this.placement();
    const side =
      placement === null
        ? 'sin ubicación de estampa elegida'
        : `con estampa en ${placement === 'front' ? 'el frente' : 'la espalda'}`;
    const crest =
      this.hasCrest() === null
        ? ''
        : this.hasCrest()
          ? ' El escudo existe y su ubicación queda a definir.'
          : ' El escudo todavía debe crearse.';
    return `Vista previa: remera ${this.shirtColorLabel().toLowerCase()}, ${side}, con el nombre ${this.displayName()}.${crest}`;
  });

  private isLightShirt(): boolean {
    const hex = this.shirtColor().replace('#', '');
    const [r, g, b] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
  }
}
