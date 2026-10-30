import { Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { VolumeTier, discountedUnitPrice, normalizeTiers } from '../pricing/volume-discount';

/** Tramos de precio mayorista, editables desde Decap CMS (Configuración → Mayoristas). */
@Injectable({
  providedIn: 'root'
})
export class VolumeDiscountService {
  // Si el archivo no carga no se promete ningún descuento: el carrito cobra precio de lista
  private file = httpResource<{ tiers?: unknown }>(() => 'data/wholesale.json', { defaultValue: {} });

  readonly tiers = computed<VolumeTier[]>(() => normalizeTiers(this.file.value().tiers));

  readonly firstTier = computed(() => this.tiers()[0] ?? null);

  /** Precio por unidad con el primer tramo, para mostrar "$X c/u llevando 5+"; sin tramos, el de lista. */
  fromPrice(price: number): number {
    const tier = this.firstTier();
    return tier ? discountedUnitPrice(price, tier) : price;
  }
}
