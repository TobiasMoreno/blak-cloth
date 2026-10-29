import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CostItem,
  CostWorkspace,
  DEFAULT_QUOTE_DEFAULTS,
  QuoteDefaults,
  QuoteInput,
  Supplier,
  SupplierOffer,
  SupplierPricingRule,
  createEmptyWorkspace,
  createQuoteInput,
} from '../models/cost-management.model';
import { calculateSupplierOfferPrice } from '../pricing/supplier-pricing';
import {
  DriveConflictError,
  GoogleDriveService,
  LoadedDriveWorkspace,
} from './google-drive.service';

export type WorkspaceSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'error';

@Injectable({ providedIn: 'root' })
export class CostManagementStore {
  private document = inject(DOCUMENT);
  private remoteVersion = signal<string | null>(null);

  readonly drive = inject(GoogleDriveService);
  readonly workspace = signal<CostWorkspace | null>(null);
  readonly selectedCostId = signal<string | null>(null);
  readonly selectedSupplierId = signal<string | null>(null);
  readonly quoteDraft = signal<QuoteInput>(createQuoteInput(DEFAULT_QUOTE_DEFAULTS));
  readonly saveState = signal<WorkspaceSaveState>('idle');
  readonly errorMessage = signal<string | null>(null);

  readonly costs = computed(() => this.workspace()?.costs ?? []);
  readonly selectedCost = computed(() => {
    const selectedId = this.selectedCostId();
    return this.costs().find((cost) => cost.id === selectedId) ?? null;
  });
  readonly suppliers = computed(() => this.workspace()?.suppliers ?? []);
  readonly selectedSupplier = computed(() => {
    const selectedId = this.selectedSupplierId();
    return this.suppliers().find((supplier) => supplier.id === selectedId) ?? null;
  });
  readonly hasWorkspace = computed(() => this.workspace() !== null);
  readonly isDirty = computed(() => this.saveState() === 'dirty');
  readonly canSave = computed(
    () =>
      this.hasWorkspace() &&
      (this.saveState() === 'dirty' || this.saveState() === 'conflict'),
  );

  async connect(): Promise<void> {
    this.errorMessage.set(null);
    await this.drive.connect();
    if (this.drive.workspaceFile()) {
      await this.loadWorkspace(await this.drive.loadWorkspace());
    }
  }

  async createWorkspace(): Promise<void> {
    this.errorMessage.set(null);
    const workspace = createEmptyWorkspace(new Date().toISOString());
    try {
      await this.loadWorkspace(await this.drive.createWorkspace(workspace));
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async chooseSharedWorkspace(): Promise<void> {
    this.errorMessage.set(null);
    try {
      const result = await this.drive.chooseSharedWorkspace();
      if (result) await this.loadWorkspace(result);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async reload(): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.loadWorkspace(await this.drive.loadWorkspace());
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async save(): Promise<void> {
    const current = this.workspace();
    const expectedVersion = this.remoteVersion();
    if (!current || !expectedVersion || !this.canSave()) return;

    this.saveState.set('saving');
    this.errorMessage.set(null);
    const next: CostWorkspace = {
      ...current,
      schemaVersion: 2,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };

    try {
      const file = await this.drive.saveWorkspace(next, expectedVersion, current.revision);
      this.workspace.set(next);
      this.remoteVersion.set(file.version);
      this.saveState.set('saved');
    } catch (error) {
      if (error instanceof DriveConflictError) {
        this.saveState.set('conflict');
        this.errorMessage.set(
          'Drive encontró una revisión distinta. Volvé a intentar; si el conflicto continúa, recargá la versión de Drive.',
        );
      } else {
        this.handleError(error);
      }
      throw error;
    }
  }

  selectCost(id: string): void {
    if (this.costs().some((cost) => cost.id === id)) this.selectedCostId.set(id);
  }

  addCost(): void {
    const id = this.createId();
    const item: CostItem = {
      id,
      productName: 'Nuevo producto',
      category: '',
      garmentCost: 0,
      printingCost: 0,
      designCostPerUnit: 0,
      labelsCost: 0,
      packagingCost: 0,
      otherUnitCost: 0,
      regularPrice: 0,
      notes: '',
      updatedAt: new Date().toISOString(),
    };
    this.workspace.update((workspace) =>
      workspace ? { ...workspace, costs: [...workspace.costs, item] } : workspace,
    );
    this.selectedCostId.set(id);
    this.markDirty();
  }

  updateCost(updated: CostItem): void {
    this.workspace.update((workspace) => {
      if (!workspace) return workspace;
      return {
        ...workspace,
        costs: workspace.costs.map((cost) =>
          cost.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : cost,
        ),
      };
    });
    this.markDirty();
  }

  deleteSelectedCost(): void {
    const selectedId = this.selectedCostId();
    if (!selectedId) return;

    this.workspace.update((workspace) => {
      if (!workspace) return workspace;
      return { ...workspace, costs: workspace.costs.filter((cost) => cost.id !== selectedId) };
    });
    const next = this.costs()[0] ?? null;
    this.selectedCostId.set(next?.id ?? null);
    if (this.quoteDraft().costItemId === selectedId) {
      this.quoteDraft.set(
        createQuoteInput(
          this.workspace()?.quoteDefaults ?? DEFAULT_QUOTE_DEFAULTS,
          next ?? undefined,
        ),
      );
    }
    this.markDirty();
  }

  addSupplier(): void {
    const id = this.createId();
    const supplier: Supplier = {
      id,
      name: 'Nuevo proveedor',
      contactName: '',
      phone: '',
      email: '',
      instagram: '',
      website: '',
      location: '',
      catalogUrl: '',
      paymentTerms: '',
      leadTimeDays: 0,
      minimumQuantity: 1,
      pricingRules: [],
      offers: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    };
    this.workspace.update((workspace) =>
      workspace ? { ...workspace, suppliers: [...workspace.suppliers, supplier] } : workspace,
    );
    this.selectedSupplierId.set(id);
    this.markDirty();
  }

  selectSupplier(id: string): void {
    if (this.suppliers().some((supplier) => supplier.id === id)) this.selectedSupplierId.set(id);
  }

  updateSupplier(updated: Supplier): void {
    this.workspace.update((workspace) => {
      if (!workspace) return workspace;
      return {
        ...workspace,
        suppliers: workspace.suppliers.map((supplier) =>
          supplier.id === updated.id
            ? { ...updated, updatedAt: new Date().toISOString() }
            : supplier,
        ),
      };
    });
    this.markDirty();
  }

  deleteSelectedSupplier(): void {
    const selectedId = this.selectedSupplierId();
    if (!selectedId) return;
    this.workspace.update((workspace) =>
      workspace
        ? {
            ...workspace,
            suppliers: workspace.suppliers.filter((supplier) => supplier.id !== selectedId),
          }
        : workspace,
    );
    this.selectedSupplierId.set(this.suppliers()[0]?.id ?? null);
    this.markDirty();
  }

  createSupplierOffer(): SupplierOffer {
    return {
      id: this.createId(),
      productName: '',
      category: '',
      variant: '',
      baseUnitPrice: 0,
      minimumQuantity: this.selectedSupplier()?.minimumQuantity ?? 1,
      shippingCost: 0,
      taxIncluded: false,
      useSupplierPricing: true,
      pricingRules: [],
      quotedAt: new Date().toISOString().slice(0, 10),
      validUntil: '',
      notes: '',
      updatedAt: new Date().toISOString(),
    };
  }

  upsertSupplierOffer(supplierId: string, offer: SupplierOffer): void {
    this.workspace.update((workspace) => {
      if (!workspace) return workspace;
      return {
        ...workspace,
        suppliers: workspace.suppliers.map((supplier) => {
          if (supplier.id !== supplierId) return supplier;
          const exists = supplier.offers.some((item) => item.id === offer.id);
          return {
            ...supplier,
            offers: exists
              ? supplier.offers.map((item) =>
                  item.id === offer.id
                    ? { ...offer, updatedAt: new Date().toISOString() }
                    : item,
                )
              : [...supplier.offers, { ...offer, updatedAt: new Date().toISOString() }],
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    });
    this.markDirty();
  }

  deleteSupplierOffer(supplierId: string, offerId: string): void {
    this.workspace.update((workspace) => {
      if (!workspace) return workspace;
      return {
        ...workspace,
        suppliers: workspace.suppliers.map((supplier) =>
          supplier.id === supplierId
            ? {
                ...supplier,
                offers: supplier.offers.filter((offer) => offer.id !== offerId),
                updatedAt: new Date().toISOString(),
              }
            : supplier,
        ),
      };
    });
    this.markDirty();
  }

  addCostFromSupplierOffer(supplierId: string, offerId: string, quantity: number): void {
    const supplier = this.suppliers().find((item) => item.id === supplierId);
    const offer = supplier?.offers.find((item) => item.id === offerId);
    if (!supplier || !offer) return;
    const pricing = calculateSupplierOfferPrice(supplier, offer, quantity);
    if (!pricing.eligible) return;

    const now = new Date().toISOString();
    const cost: CostItem = {
      id: this.createId(),
      productName: offer.productName,
      category: offer.category,
      garmentCost: pricing.effectiveUnitPrice,
      printingCost: 0,
      designCostPerUnit: 0,
      labelsCost: 0,
      packagingCost: 0,
      otherUnitCost: 0,
      regularPrice: 0,
      notes: [
        `Proveedor: ${supplier.name}`,
        `Referencia: ${Math.max(1, Math.floor(quantity))} unidades`,
        `Cotización: ${offer.quotedAt || now.slice(0, 10)}`,
        supplier.catalogUrl ? `Fuente: ${supplier.catalogUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      updatedAt: now,
    };
    this.workspace.update((workspace) =>
      workspace ? { ...workspace, costs: [...workspace.costs, cost] } : workspace,
    );
    this.selectedCostId.set(cost.id);
    this.markDirty();
  }

  updateQuoteDraft(draft: QuoteInput): void {
    this.quoteDraft.set(draft);
  }

  updateQuoteDefaults(defaults: QuoteDefaults): void {
    this.workspace.update((workspace) =>
      workspace ? { ...workspace, quoteDefaults: defaults } : workspace,
    );
    this.quoteDraft.update((draft) => ({ ...draft, ...defaults }));
    this.markDirty();
  }

  private async loadWorkspace(result: LoadedDriveWorkspace): Promise<void> {
    const workspace = parseWorkspace(result.content);
    this.workspace.set(workspace);
    this.remoteVersion.set(result.file.version);
    const selected =
      workspace.costs.find((cost) => cost.id === this.selectedCostId()) ?? workspace.costs[0];
    this.selectedCostId.set(selected?.id ?? null);
    const selectedSupplier =
      workspace.suppliers.find((supplier) => supplier.id === this.selectedSupplierId()) ??
      workspace.suppliers[0];
    this.selectedSupplierId.set(selectedSupplier?.id ?? null);
    this.quoteDraft.set(createQuoteInput(workspace.quoteDefaults, selected));
    this.saveState.set('saved');
    this.errorMessage.set(null);
  }

  private markDirty(): void {
    if (this.workspace()) this.saveState.set('dirty');
  }

  private handleError(error: unknown): void {
    this.saveState.set('error');
    this.errorMessage.set(error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
  }

  private createId(): string {
    return this.document.defaultView?.crypto.randomUUID() ?? `cost-${Date.now()}`;
  }
}

export function parseWorkspace(value: unknown): CostWorkspace {
  const record = asRecord(value);
  if (
    !record ||
    (record['schemaVersion'] !== 1 && record['schemaVersion'] !== 2) ||
    !Array.isArray(record['costs'])
  ) {
    throw new Error('El archivo elegido no tiene el formato de Costos BLAK.');
  }

  const quoteDefaults = parseQuoteDefaults(record['quoteDefaults']);
  const costs = record['costs'].map(parseCostItem);
  return {
    schemaVersion: 2,
    revision: toNonNegativeNumber(record['revision']),
    updatedAt: toStringValue(record['updatedAt']) || new Date().toISOString(),
    costs,
    suppliers: Array.isArray(record['suppliers']) ? record['suppliers'].map(parseSupplier) : [],
    quoteDefaults,
  };
}

function parseSupplier(value: unknown): Supplier {
  const record = asRecord(value);
  if (!record || !toStringValue(record['id']) || !toStringValue(record['name'])) {
    throw new Error('Hay un proveedor incompleto en el archivo de costos.');
  }
  return {
    id: toStringValue(record['id']),
    name: toStringValue(record['name']),
    contactName: toStringValue(record['contactName']),
    phone: toStringValue(record['phone']),
    email: toStringValue(record['email']),
    instagram: toStringValue(record['instagram']),
    website: toStringValue(record['website']),
    location: toStringValue(record['location']),
    catalogUrl: toStringValue(record['catalogUrl']),
    paymentTerms: toStringValue(record['paymentTerms']),
    leadTimeDays: toNonNegativeInteger(record['leadTimeDays']),
    minimumQuantity: Math.max(1, toNonNegativeInteger(record['minimumQuantity'])),
    pricingRules: parsePricingRules(record['pricingRules']),
    offers: Array.isArray(record['offers']) ? record['offers'].map(parseSupplierOffer) : [],
    notes: toStringValue(record['notes']),
    updatedAt: toStringValue(record['updatedAt']) || new Date().toISOString(),
  };
}

function parseSupplierOffer(value: unknown): SupplierOffer {
  const record = asRecord(value);
  if (!record || !toStringValue(record['id']) || !toStringValue(record['productName'])) {
    throw new Error('Hay una oferta incompleta en el archivo de costos.');
  }
  return {
    id: toStringValue(record['id']),
    productName: toStringValue(record['productName']),
    category: toStringValue(record['category']),
    variant: toStringValue(record['variant']),
    baseUnitPrice: toNonNegativeNumber(record['baseUnitPrice']),
    minimumQuantity: Math.max(1, toNonNegativeInteger(record['minimumQuantity'])),
    shippingCost: toNonNegativeNumber(record['shippingCost']),
    taxIncluded: record['taxIncluded'] === true,
    useSupplierPricing: record['useSupplierPricing'] !== false,
    pricingRules: parsePricingRules(record['pricingRules']),
    quotedAt: toStringValue(record['quotedAt']),
    validUntil: toStringValue(record['validUntil']),
    notes: toStringValue(record['notes']),
    updatedAt: toStringValue(record['updatedAt']) || new Date().toISOString(),
  };
}

function parsePricingRules(value: unknown): SupplierPricingRule[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = asRecord(item);
    const mode = record?.['mode'] === 'unit-price' ? 'unit-price' : 'discount-rate';
    return {
      minQuantity: Math.max(1, toNonNegativeInteger(record?.['minQuantity'])),
      mode,
      value:
        mode === 'discount-rate'
          ? toRate(record?.['value'], 0)
          : toNonNegativeNumber(record?.['value']),
    };
  });
}

function parseCostItem(value: unknown): CostItem {
  const record = asRecord(value);
  if (!record || !toStringValue(record['id']) || !toStringValue(record['productName'])) {
    throw new Error('Hay un producto incompleto en el archivo de costos.');
  }
  return {
    id: toStringValue(record['id']),
    productName: toStringValue(record['productName']),
    category: toStringValue(record['category']),
    garmentCost: toNonNegativeNumber(record['garmentCost']),
    printingCost: toNonNegativeNumber(record['printingCost']),
    designCostPerUnit: toNonNegativeNumber(record['designCostPerUnit']),
    labelsCost: toNonNegativeNumber(record['labelsCost']),
    packagingCost: toNonNegativeNumber(record['packagingCost']),
    otherUnitCost: toNonNegativeNumber(record['otherUnitCost']),
    regularPrice: toNonNegativeNumber(record['regularPrice']),
    notes: toStringValue(record['notes']),
    updatedAt: toStringValue(record['updatedAt']) || new Date().toISOString(),
  };
}

function parseQuoteDefaults(value: unknown): QuoteDefaults {
  const record = asRecord(value);
  if (!record) return { ...DEFAULT_QUOTE_DEFAULTS };
  return {
    paymentFeeRate: toRate(record['paymentFeeRate'], DEFAULT_QUOTE_DEFAULTS.paymentFeeRate),
    taxRate: toRate(record['taxRate'], DEFAULT_QUOTE_DEFAULTS.taxRate),
    targetMarginRate: toRate(record['targetMarginRate'], DEFAULT_QUOTE_DEFAULTS.targetMarginRate),
    minimumMarginRate: toRate(
      record['minimumMarginRate'],
      DEFAULT_QUOTE_DEFAULTS.minimumMarginRate,
    ),
    depositRate: toRate(record['depositRate'], DEFAULT_QUOTE_DEFAULTS.depositRate),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function toNonNegativeInteger(value: unknown): number {
  return Math.floor(toNonNegativeNumber(value));
}

function toRate(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}
