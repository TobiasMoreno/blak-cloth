import { BRAND_NAME, SITE_NAME } from '../constants/site.constants';

/**
 * Título y descripción de cada remera. El HTML estático que genera scripts/build-static-pages.mjs
 * usa el mismo texto: si cambia acá, cambiarlo también allá, o Google ve dos versiones distintas.
 */
interface ProductSeoData {
  name: string;
  description: string;
  price: number;
  sizes: readonly string[];
}

const MAX_DESCRIPTION_LENGTH = 160;

export function productSeoTitle(product: Pick<ProductSeoData, 'name'>): string {
  const name = /^remera\b/i.test(product.name) ? product.name : `Remera ${product.name}`;
  return `${name} · ${SITE_NAME}`;
}

export function productSeoDescription(product: ProductSeoData): string {
  const price = '$' + Math.round(product.price).toLocaleString('es-AR');
  const sizes = product.sizes.length > 0 ? `Talles ${product.sizes.join(', ')}` : 'Sin stock por ahora';
  // Precio y talles antes que la descripción: si el texto se recorta, se pierde el final
  const parts = [
    `Remera ${product.name} de ${BRAND_NAME}, diseño de autor.`,
    `${price}. ${sizes}.`,
    toSentence(product.description),
    'Pedidos por WhatsApp, entrega en Córdoba.'
  ];
  return truncate(parts.filter(Boolean).join(' '), MAX_DESCRIPTION_LENGTH);
}

function toSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '') + '…';
}
