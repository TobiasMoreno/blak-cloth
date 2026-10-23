import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type PrintPlacement = 'front' | 'back';

// Conectores que no aportan a las iniciales ("Los Pibes de la Esquina" → LPE, no LPD).
const CONNECTORS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e']);

@Component({
  selector: 'app-team-shirt-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full w-full'
  },
  template: `
    <div class="frame relative flex h-full items-center justify-center overflow-hidden bg-[#d9182b] p-4">
      <p
        class="absolute left-3 top-3 z-10 bg-[#0b0b0b] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white md:left-6 md:top-6 md:text-sm"
        aria-hidden="true"
      >
        {{ placement() === 'front' ? 'Frente' : 'Espalda' }}
      </p>
      <div
        class="stage relative flex items-center justify-center rounded-full"
        [style.background-color]="stageColor()"
        role="img"
        [attr.aria-label]="previewDescription()"
      >
        <div
          class="shirt relative"
          [class.shirt-back]="placement() === 'back'"
          [style.background-color]="shirtColor()"
          [style.--stage]="stageColor()"
        >
          @if (placement() === 'front') {
            <div class="print-front absolute flex flex-col items-center text-center" [style.color]="printColor()">
              @if (hasCrest()) {
                <span class="crest block" [style.background-color]="printColor()"></span>
              }
              <span class="front-name block font-display font-black uppercase">{{ displayName() }}</span>
            </div>
          } @else {
            <div class="print-back absolute flex flex-col items-center text-center font-display font-black uppercase" [style.color]="printColor()">
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
      clip-path: polygon(24% 5%, 38% 0, 62% 0, 76% 5%, 100% 20%, 87% 42%, 76% 35%, 76% 100%, 24% 100%, 24% 35%, 13% 42%, 0 20%);
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

    /* La espalda tiene un escote más bajo para diferenciarla del frente. */
    .shirt-back::after {
      height: 4%;
    }

    .print-front {
      top: 22%;
      left: 26%;
      width: 48%;
      gap: 3cqw;
    }

    .crest {
      width: 11cqw;
      height: 13cqw;
      clip-path: polygon(0 0, 100% 0, 100% 62%, 50% 100%, 0 62%);
    }

    .front-name {
      font-size: 8cqw;
      line-height: 0.9;
      overflow-wrap: anywhere;
    }

    .print-back {
      top: 24%;
      left: 26%;
      width: 48%;
    }

    .back-initials {
      font-size: 22cqw;
      line-height: 0.82;
    }

    .back-name {
      margin-top: 2cqw;
      font-size: 5.5cqw;
      line-height: 0.95;
      overflow-wrap: anywhere;
    }
  `
})
export class TeamShirtPreviewComponent {
  teamName = input.required<string>();
  shirtColor = input.required<string>();
  shirtColorLabel = input.required<string>();
  printColor = input.required<string>();
  placement = input.required<PrintPlacement>();
  hasCrest = input<boolean | null>(null);

  displayName = computed(() => this.teamName().trim() || 'Tu equipo');
  // Una remera clara sobre el círculo claro desaparece: se invierte el fondo.
  stageColor = computed(() => (this.isLightShirt() ? '#0b0b0b' : '#f4f4f0'));
  initials = computed(() => {
    const words = this.displayName().split(/\s+/).filter(Boolean);
    const meaningful = words.filter((word, index) => index === 0 || !CONNECTORS.has(word.toLowerCase()));
    return meaningful
      .slice(0, 3)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  });
  previewDescription = computed(() => {
    const side = this.placement() === 'front' ? 'el frente' : 'la espalda';
    const crest = this.placement() === 'front' && this.hasCrest() ? ' y lugar para el escudo' : '';
    return `Vista previa: remera ${this.shirtColorLabel().toLowerCase()} con el nombre ${this.displayName()} estampado en ${side}${crest}.`;
  });

  private isLightShirt(): boolean {
    const hex = this.shirtColor().replace('#', '');
    const [r, g, b] = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
  }
}
