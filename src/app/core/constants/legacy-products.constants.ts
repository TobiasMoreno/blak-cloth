/** IDs numéricos que usaba la web antes de pasar a slugs. Mantienen vivos los links compartidos y los carritos/favoritos guardados. */
export const LEGACY_PRODUCT_IDS: Record<string, string> = {
  '001': 'positive-energy',
  '002': 'stitch-art',
  '003': 'the-rose-system',
  '004': 'blak-minimal-series-001',
  '005': 'blak-minimal-series-002',
  '006': 'medusa',
  '007': 'take-control'
};

export function resolveLegacyProductId(id: string): string {
  return LEGACY_PRODUCT_IDS[id] ?? id;
}
