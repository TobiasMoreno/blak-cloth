import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type PrintPlacement = 'front' | 'back';

@Component({
  selector: 'app-team-shirt-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full w-full'
  },
  template: `
    <div
      class="flex h-full min-h-[25rem] items-center justify-center overflow-hidden bg-[#d9182b] px-6 py-12 md:min-h-[40rem]"
      role="img"
      [attr.aria-label]="previewDescription()"
    >
      <div class="relative flex aspect-square w-[min(92%,38rem)] items-center justify-center rounded-full bg-[#f4f4f0]">
        <div class="shirt relative" [style.background-color]="shirtColor()">
          <div
            class="print-mark absolute flex flex-col items-center justify-center text-center font-display font-black uppercase leading-[0.82]"
            [class.print-mark-front]="placement() === 'front'"
            [class.print-mark-back]="placement() === 'back'"
            [style.color]="printColor()"
          >
            <span class="block">{{ initials() }}</span>
            @if (placement() === 'back') {
              <span class="mt-2 block max-w-[9rem] text-[clamp(0.75rem,2vw,1.25rem)] leading-none">
                {{ displayName() }}
              </span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .shirt {
      width: min(68%, 25rem);
      aspect-ratio: 0.82;
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
      background: #f4f4f0;
    }

    .print-mark-front {
      top: 24%;
      left: 57%;
      width: 16%;
      font-size: clamp(1rem, 3vw, 2rem);
    }

    .print-mark-back {
      top: 31%;
      left: 24%;
      width: 52%;
      font-size: clamp(3rem, 9vw, 6.5rem);
    }
  `
})
export class TeamShirtPreviewComponent {
  teamName = input.required<string>();
  shirtColor = input.required<string>();
  shirtColorLabel = input.required<string>();
  printColor = input.required<string>();
  placement = input.required<PrintPlacement>();

  displayName = computed(() => this.teamName().trim() || 'Tu equipo');
  initials = computed(() => {
    const words = this.displayName().split(/\s+/).filter(Boolean);
    return words
      .slice(0, 3)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  });
  previewDescription = computed(
    () =>
      `Vista previa de una remera ${this.shirtColorLabel()} para ${this.displayName()}, con estampa en ${
        this.placement() === 'front' ? 'el frente' : 'la espalda'
      }.`
  );
}
