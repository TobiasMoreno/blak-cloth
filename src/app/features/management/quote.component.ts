import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QuoteDefaults, QuoteInput } from '../../core/models/cost-management.model';
import { calculateQuote } from '../../core/pricing/pricing-calculations';
import { CostManagementStore } from '../../core/services/cost-management.store';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';

@Component({
  selector: 'app-quote',
  imports: [ReactiveFormsModule, CurrencyArsPipe],
  templateUrl: './quote.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteComponent {
  readonly store = inject(CostManagementStore);
  private formBuilder = inject(NonNullableFormBuilder);
  private initialDraft = this.store.quoteDraft();

  readonly form = this.formBuilder.group({
    costItemId: [this.initialDraft.costItemId, Validators.required],
    quantity: [this.initialDraft.quantity, [Validators.required, Validators.min(1)]],
    listPrice: [this.initialDraft.listPrice, [Validators.required, Validators.min(0)]],
    discountPercent: [
      this.initialDraft.discountRate * 100,
      [Validators.min(0), Validators.max(100)],
    ],
    extraUnitCost: [this.initialDraft.extraUnitCost, Validators.min(0)],
    designSetupCost: [this.initialDraft.designSetupCost, Validators.min(0)],
    shippingCost: [this.initialDraft.shippingCost, Validators.min(0)],
    otherFixedCosts: [this.initialDraft.otherFixedCosts, Validators.min(0)],
    paymentFeePercent: [
      this.initialDraft.paymentFeeRate * 100,
      [Validators.min(0), Validators.max(100)],
    ],
    taxPercent: [this.initialDraft.taxRate * 100, [Validators.min(0), Validators.max(100)]],
    targetMarginPercent: [
      this.initialDraft.targetMarginRate * 100,
      [Validators.min(0), Validators.max(100)],
    ],
    minimumMarginPercent: [
      this.initialDraft.minimumMarginRate * 100,
      [Validators.min(0), Validators.max(100)],
    ],
    depositPercent: [this.initialDraft.depositRate * 100, [Validators.min(0), Validators.max(100)]],
  });

  readonly quoteInput = signal<QuoteInput>(this.toQuoteInput());
  readonly selectedCost = computed(() =>
    this.store.costs().find((cost) => cost.id === this.quoteInput().costItemId),
  );
  readonly result = computed(() => calculateQuote(this.quoteInput(), this.selectedCost()));
  readonly evaluationLabel = computed(() => {
    switch (this.result().evaluation) {
      case 'meets-target':
        return 'Cumple el margen objetivo';
      case 'below-target':
        return 'Está por debajo del objetivo';
      case 'below-minimum':
        return 'Está por debajo del margen mínimo';
      default:
        return 'Revisá los datos del pedido';
    }
  });
  readonly evaluationClass = computed(() => {
    switch (this.result().evaluation) {
      case 'meets-target':
        return 'bg-[#dcfae5] text-[#04250e]';
      case 'below-target':
        return 'bg-[#fffbeb] text-[#92400e]';
      case 'below-minimum':
        return 'bg-[#ffedea] text-[#831c1e]';
      default:
        return 'bg-[#eeeeea] text-[#555550]';
    }
  });
  readonly savingDefaults = signal(false);

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const input = this.toQuoteInput();
      this.quoteInput.set(input);
      this.store.updateQuoteDraft(input);
    });

    this.form.controls.costItemId.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      const cost = this.store.costs().find((item) => item.id === id);
      if (cost) this.form.controls.listPrice.setValue(cost.regularPrice);
    });
  }

  async saveSharedDefaults(): Promise<void> {
    const input = this.quoteInput();
    const defaults: QuoteDefaults = {
      paymentFeeRate: input.paymentFeeRate,
      taxRate: input.taxRate,
      targetMarginRate: input.targetMarginRate,
      minimumMarginRate: input.minimumMarginRate,
      depositRate: input.depositRate,
    };
    this.savingDefaults.set(true);
    this.store.updateQuoteDefaults(defaults);
    try {
      await this.store.save();
    } catch {
      // El shell muestra el conflicto o error de Drive.
    } finally {
      this.savingDefaults.set(false);
    }
  }

  marginLabel(): string {
    const margin = this.result().saleMarginRate;
    return margin === null ? '—' : `${(margin * 100).toFixed(1).replace('.', ',')}%`;
  }

  private toQuoteInput(): QuoteInput {
    const raw = this.form.getRawValue();
    return {
      costItemId: raw.costItemId,
      quantity: raw.quantity,
      listPrice: raw.listPrice,
      discountRate: raw.discountPercent / 100,
      extraUnitCost: raw.extraUnitCost,
      designSetupCost: raw.designSetupCost,
      shippingCost: raw.shippingCost,
      otherFixedCosts: raw.otherFixedCosts,
      paymentFeeRate: raw.paymentFeePercent / 100,
      taxRate: raw.taxPercent / 100,
      targetMarginRate: raw.targetMarginPercent / 100,
      minimumMarginRate: raw.minimumMarginPercent / 100,
      depositRate: raw.depositPercent / 100,
    };
  }
}
