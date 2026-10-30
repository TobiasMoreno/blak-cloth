import { productSeoDescription, productSeoTitle } from './product-seo';

describe('product-seo', () => {
  const product = {
    name: 'Medusa',
    description: 'remera anime',
    price: 30000,
    sizes: ['M', 'L']
  };

  it('arma el título con "Remera" y la marca, sin repetir "Remera"', () => {
    expect(productSeoTitle(product)).toBe('Remera Medusa · BLAK Streetwear');
    expect(productSeoTitle({ name: 'Remera Medusa' })).toBe('Remera Medusa · BLAK Streetwear');
  });

  it('pone precio y talles antes de la descripción, que queda como oración', () => {
    expect(productSeoDescription(product)).toBe(
      'Remera Medusa de BLAK, diseño de autor. $30.000. Talles M, L. Remera anime. Pedidos por WhatsApp, entrega en Córdoba.'
    );
  });

  it('recorta en una palabra completa sin pasar los 160 caracteres', () => {
    const description = productSeoDescription({ ...product, description: 'Algodón peinado y estampa grande. '.repeat(8) });
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.endsWith('…')).toBe(true);
    expect(description).toContain('$30.000. Talles M, L.');
  });

  it('avisa cuando no hay talles disponibles', () => {
    expect(productSeoDescription({ ...product, sizes: [] })).toContain('Sin stock por ahora.');
  });
});
