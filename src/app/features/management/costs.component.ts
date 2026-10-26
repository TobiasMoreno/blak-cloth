import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CostItem } from '../../core/models/cost-management.model';
import { calculateGrossMargin, calculateUnitCost } from '../../core/pricing/pricing-calculations';
import { CostManagementStore } from '../../core/services/cost-management.store';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';

@Component({
  selector: 'app-costs',
  imports: [ReactiveFormsModule, CurrencyArsPipe],
  templateUrl: './costs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostsComponent {
  readonly store = inject(CostManagementStore);
  private formBuilder = inject(NonNullableFormBuilder);

  readonly deleteConfirmationOpen = signal(false);
  readonly selectedUnitCost = computed(() => {
    const cost = this.store.selectedCost();
    return cost ? calculateUnitCost(cost) : 0;
  });
  readonly selectedMargin = computed(() => {
    const cost = this.store.selectedCost();
    return cost ? calculateGrossMargin(cost) : null;
  });

  readonly form = this.formBuilder.group({
    productName: ['', Validators.required],
    category: [''],
    garmentCost: [0, [Validators.required, Validators.min(0)]],
    printingCost: [0, [Validators.required, Validators.min(0)]],
    designCostPerUnit: [0, [Validators.required, Validators.min(0)]],
    labelsCost: [0, [Validators.required, Validators.min(0)]],
    packagingCost: [0, [Validators.required, Validators.min(0)]],
    otherUnitCost: [0, [Validators.required, Validators.min(0)]],
    regularPrice: [0, [Validators.required, Validators.min(0)]],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const selected = this.store.selectedCost();
      if (!selected) {
        this.form.reset();
        return;
      }
      this.form.patchValue(selected, { emitEvent: false });
      this.form.markAsPristine();
      this.deleteConfirmationOpen.set(false);
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const selected = this.store.selectedCost();
      if (!selected) return;
      this.store.updateCost({ ...selected, ...this.form.getRawValue() });
    });
  }

  selectCost(id: string): void {
    this.store.selectCost(id);
  }

  addCost(): void {
    this.store.addCost();
  }

  requestDelete(): void {
    this.deleteConfirmationOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteConfirmationOpen.set(false);
  }

  confirmDelete(): void {
    this.store.deleteSelectedCost();
    this.deleteConfirmationOpen.set(false);
  }

  unitCost(cost: CostItem): number {
    return calculateUnitCost(cost);
  }

  margin(cost: CostItem): string {
    const value = calculateGrossMargin(cost);
    return value === null ? '—' : `${(value * 100).toFixed(1).replace('.', ',')}%`;
  }

  selectedMarginLabel(): string {
    const value = this.selectedMargin();
    return value === null ? '—' : `${(value * 100).toFixed(1).replace('.', ',')}%`;
  }
}
