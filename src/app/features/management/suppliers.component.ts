import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Supplier,
  SupplierOffer,
  SupplierPricingRule,
  SupplierPricingRuleMode,
} from '../../core/models/cost-management.model';
import {
  SupplierOfferPrice,
  calculateSupplierOfferPrice,
} from '../../core/pricing/supplier-pricing';
import { CostManagementStore } from '../../core/services/cost-management.store';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';

type SuppliersView = 'directory' | 'comparison';

interface ComparisonRow {
  supplier: Supplier;
  offer: SupplierOffer;
  pricing: SupplierOfferPrice;
}

@Component({
  selector: 'app-suppliers',
  imports: [ReactiveFormsModule, CurrencyArsPipe],
  templateUrl: './suppliers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuppliersComponent {
  readonly store = inject(CostManagementStore);
  private formBuilder = inject(NonNullableFormBuilder);
  private router = inject(Router);
  private loadedSupplierKey: string | null = null;

  readonly view = signal<SuppliersView>('directory');
  readonly offerEditorOpen = signal(false);
  readonly editingOfferId = signal<string | null>(null);
  readonly supplierDeleteConfirmationOpen = signal(false);
  readonly offerDeleteConfirmationId = signal<string | null>(null);
  readonly comparisonQuery = signal('');
  readonly comparisonQuantity = signal(20);

  readonly supplierForm = this.formBuilder.group({
    name: ['', Validators.required],
    contactName: [''],
    phone: [''],
    email: ['', Validators.email],
    instagram: [''],
    website: [''],
    location: [''],
    catalogUrl: [''],
    paymentTerms: [''],
    leadTimeDays: [0, Validators.min(0)],
    minimumQuantity: [1, [Validators.required, Validators.min(1)]],
    pricingRules: this.formBuilder.array([this.createPricingRuleForm()]),
    notes: [''],
  });

  readonly offerForm = this.formBuilder.group({
    productName: ['', Validators.required],
    category: [''],
    variant: [''],
    baseUnitPrice: [0, [Validators.required, Validators.min(0)]],
    minimumQuantity: [1, [Validators.required, Validators.min(1)]],
    shippingCost: [0, Validators.min(0)],
    taxIncluded: [false],
    useSupplierPricing: [true],
    pricingRules: this.formBuilder.array([this.createPricingRuleForm()]),
    quotedAt: [new Date().toISOString().slice(0, 10)],
    validUntil: [''],
    notes: [''],
  });

  readonly comparisonRows = computed<ComparisonRow[]>(() => {
    const query = this.comparisonQuery().trim().toLocaleLowerCase('es');
    const quantity = this.comparisonQuantity();
    return this.store
      .suppliers()
      .flatMap((supplier) =>
        supplier.offers.map((offer) => ({
          supplier,
          offer,
          pricing: calculateSupplierOfferPrice(supplier, offer, quantity),
        })),
      )
      .filter(({ supplier, offer }) => {
        if (!query) return true;
        return [supplier.name, offer.productName, offer.category, offer.variant]
          .join(' ')
          .toLocaleLowerCase('es')
          .includes(query);
      })
      .sort((a, b) => {
        if (a.pricing.eligible !== b.pricing.eligible) return a.pricing.eligible ? -1 : 1;
        return a.pricing.effectiveUnitPrice - b.pricing.effectiveUnitPrice;
      });
  });

  readonly bestEligibleRow = computed(
    () =>
      this.comparisonQuery().trim()
        ? (this.comparisonRows().find((row) => row.pricing.eligible) ?? null)
        : null,
  );

  constructor() {
    effect(() => {
      const selected = this.store.selectedSupplier();
      const key = selected ? `${selected.id}:${this.store.workspace()?.revision ?? 0}` : null;
      if (!selected || key === this.loadedSupplierKey) return;
      this.loadedSupplierKey = key;
      this.patchSupplierForm(selected);
      this.offerEditorOpen.set(false);
      this.editingOfferId.set(null);
      this.supplierDeleteConfirmationOpen.set(false);
    });

    this.supplierForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const selected = this.store.selectedSupplier();
      if (!selected || this.supplierForm.invalid) return;
      const raw = this.supplierForm.getRawValue();
      this.store.updateSupplier({
        ...selected,
        ...raw,
        pricingRules: this.toPricingRules(raw.pricingRules),
      });
    });
  }

  get supplierPricingRules() {
    return this.supplierForm.controls.pricingRules;
  }

  get offerPricingRules() {
    return this.offerForm.controls.pricingRules;
  }

  setView(view: SuppliersView): void {
    this.view.set(view);
  }

  addSupplier(): void {
    this.store.addSupplier();
    this.view.set('directory');
  }

  selectSupplier(id: string): void {
    this.store.selectSupplier(id);
  }

  requestSupplierDelete(): void {
    this.supplierDeleteConfirmationOpen.set(true);
  }

  cancelSupplierDelete(): void {
    this.supplierDeleteConfirmationOpen.set(false);
  }

  confirmSupplierDelete(): void {
    this.loadedSupplierKey = null;
    this.store.deleteSelectedSupplier();
    this.supplierDeleteConfirmationOpen.set(false);
  }

  addSupplierPricingRule(): void {
    this.supplierPricingRules.push(this.createPricingRuleForm());
  }

  removeSupplierPricingRule(index: number): void {
    this.supplierPricingRules.removeAt(index);
  }

  createOffer(): void {
    const offer = this.store.createSupplierOffer();
    this.editingOfferId.set(offer.id);
    this.patchOfferForm(offer);
    this.offerEditorOpen.set(true);
  }

  editOffer(offer: SupplierOffer): void {
    this.editingOfferId.set(offer.id);
    this.patchOfferForm(offer);
    this.offerEditorOpen.set(true);
    this.offerDeleteConfirmationId.set(null);
  }

  cancelOffer(): void {
    this.offerEditorOpen.set(false);
    this.editingOfferId.set(null);
    this.offerDeleteConfirmationId.set(null);
  }

  saveOffer(): void {
    const supplier = this.store.selectedSupplier();
    const id = this.editingOfferId();
    if (!supplier || !id || this.offerForm.invalid) {
      this.offerForm.markAllAsTouched();
      return;
    }
    const raw = this.offerForm.getRawValue();
    const current = supplier.offers.find((offer) => offer.id === id);
    this.store.upsertSupplierOffer(supplier.id, {
      ...raw,
      id,
      pricingRules: this.toPricingRules(raw.pricingRules),
      updatedAt: current?.updatedAt ?? new Date().toISOString(),
    });
    this.cancelOffer();
  }

  addOfferPricingRule(): void {
    this.offerPricingRules.push(this.createPricingRuleForm());
  }

  removeOfferPricingRule(index: number): void {
    this.offerPricingRules.removeAt(index);
  }

  requestOfferDelete(id: string): void {
    this.offerDeleteConfirmationId.set(id);
  }

  offerExists(id: string): boolean {
    return this.store.selectedSupplier()?.offers.some((offer) => offer.id === id) ?? false;
  }

  cancelOfferDelete(): void {
    this.offerDeleteConfirmationId.set(null);
  }

  confirmOfferDelete(id: string): void {
    const supplier = this.store.selectedSupplier();
    if (!supplier) return;
    this.store.deleteSupplierOffer(supplier.id, id);
    this.offerDeleteConfirmationId.set(null);
    if (this.editingOfferId() === id) this.cancelOffer();
  }

  updateComparisonQuery(event: Event): void {
    this.comparisonQuery.set((event.target as HTMLInputElement).value);
  }

  updateComparisonQuantity(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.comparisonQuantity.set(Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1);
  }

  isBestRow(row: ComparisonRow): boolean {
    const best = this.bestEligibleRow();
    return best?.supplier.id === row.supplier.id && best.offer.id === row.offer.id;
  }

  discountLabel(rate: number | null): string {
    return rate === null || rate <= 0 ? '—' : `${(rate * 100).toFixed(1).replace('.0', '')}%`;
  }

  async useOfferInCosts(row: ComparisonRow): Promise<void> {
    this.store.addCostFromSupplierOffer(
      row.supplier.id,
      row.offer.id,
      this.comparisonQuantity(),
    );
    await this.router.navigate(['/gestion/costos']);
  }

  private createPricingRuleForm(rule?: SupplierPricingRule) {
    return this.formBuilder.group({
      minQuantity: [rule?.minQuantity ?? 1, [Validators.required, Validators.min(1)]],
      mode: [rule?.mode ?? ('discount-rate' as SupplierPricingRuleMode)],
      value: [
        rule?.mode === 'discount-rate' ? rule.value * 100 : (rule?.value ?? 0),
        [Validators.required, Validators.min(0)],
      ],
    });
  }

  private patchSupplierForm(supplier: Supplier): void {
    const { pricingRules, ...fields } = supplier;
    this.supplierPricingRules.clear({ emitEvent: false });
    for (const rule of pricingRules) {
      this.supplierPricingRules.push(this.createPricingRuleForm(rule), { emitEvent: false });
    }
    this.supplierForm.patchValue(fields, { emitEvent: false });
    this.supplierForm.markAsPristine();
  }

  private patchOfferForm(offer: SupplierOffer): void {
    const { pricingRules, ...fields } = offer;
    this.offerPricingRules.clear({ emitEvent: false });
    for (const rule of pricingRules) {
      this.offerPricingRules.push(this.createPricingRuleForm(rule), { emitEvent: false });
    }
    this.offerForm.patchValue(fields, { emitEvent: false });
    this.offerForm.markAsPristine();
  }

  private toPricingRules(
    rules: Array<{ minQuantity: number; mode: SupplierPricingRuleMode; value: number }>,
  ): SupplierPricingRule[] {
    return rules
      .map((rule) => ({
        minQuantity: Math.max(1, Math.floor(rule.minQuantity)),
        mode: rule.mode,
        value:
          rule.mode === 'discount-rate'
            ? Math.min(1, Math.max(0, rule.value / 100))
            : Math.max(0, rule.value),
      }))
      .sort((a, b) => a.minQuantity - b.minQuantity);
  }
}
