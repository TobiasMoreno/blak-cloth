import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Selector de cantidad con los botones de la marca. El label visible lo pone quien lo usa, con `for` apuntando a `inputId`. */
@Component({
  selector: 'app-quantity-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <div
      class="inline-flex h-12 border-2 border-ink bg-bone text-ink"
      [class.opacity-50]="disabled()"
    >
      <button
        type="button"
        (click)="step(-1)"
        [disabled]="disabled() || value() <= min()"
        [attr.aria-label]="'Quitar una' + nameSuffix()"
        [attr.aria-controls]="inputId()"
        class="grid w-12 place-items-center text-xl font-semibold transition-colors duration-150 hover:bg-ink hover:text-bone disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink"
      >
        <span aria-hidden="true">−</span>
      </button>
      <input
        type="number"
        inputmode="numeric"
        [id]="inputId()"
        [value]="value()"
        [min]="min()"
        [max]="max()"
        [disabled]="disabled()"
        [attr.aria-describedby]="describedBy()"
        (change)="commit($event)"
        class="w-14 border-x-2 border-ink bg-transparent text-center text-base font-semibold tabular-nums [appearance:textfield] focus-visible:outline-offset-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        (click)="step(1)"
        [disabled]="disabled() || value() >= max()"
        [attr.aria-label]="'Sumar una' + nameSuffix()"
        [attr.aria-controls]="inputId()"
        class="grid w-12 place-items-center text-xl font-semibold transition-colors duration-150 hover:bg-ink hover:text-bone disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  `
})
export class QuantityStepperComponent {
  inputId = input.required<string>();
  value = input.required<number>();
  min = input(1);
  max = input(5);
  disabled = input(false);
  /** Nombre de la prenda, para que los botones digan "Sumar una Medusa" en el lector de pantalla. */
  itemName = input<string>('');
  describedBy = input<string | null>(null);

  valueChange = output<number>();

  nameSuffix = computed(() => (this.itemName() ? ` ${this.itemName()}` : ''));

  step(delta: number): void {
    this.emit(this.value() + delta);
  }

  commit(event: Event): void {
    const field = event.target as HTMLInputElement;
    const parsed = Number.parseInt(field.value, 10);
    const next = this.clamp(Number.isNaN(parsed) ? this.value() : parsed);
    // Si lo escrito queda fuera de rango, el campo vuelve al valor válido
    field.value = String(next);
    this.emit(next);
  }

  private emit(next: number): void {
    const clamped = this.clamp(next);
    if (clamped !== this.value()) this.valueChange.emit(clamped);
  }

  private clamp(next: number): number {
    return Math.min(this.max(), Math.max(this.min(), next));
  }
}
