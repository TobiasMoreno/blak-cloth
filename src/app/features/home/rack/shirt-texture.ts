import * as THREE from 'three';
import { Product } from '../../../core/models/product.model';
import { getColorHex } from '../../../core/constants/colors.constants';

export type ShirtSide = 'design' | 'front';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ArtSource {
  image: HTMLImageElement;
  /** Torso de la remera dentro de la foto, en fracciones de la imagen. */
  torso: Rect;
}

export interface ShirtArt {
  name: string;
  base: string;
  lining: THREE.Color;
  sides: Record<ShirtSide, ArtSource | null>;
}

/**
 * Los mockups del catálogo comparten plantilla: dos remeras colgadas, la espalda (estampa
 * principal) a la izquierda y el frente a la derecha. Estas son sus zonas de torso, sin mangas
 * ni fondo. Las fotos sueltas de frente o espalda traen una sola remera centrada.
 */
const MOCKUP_LEFT: Rect = { x: 0.19, y: 0.21, w: 0.275, h: 0.69 };
const MOCKUP_RIGHT: Rect = { x: 0.515, y: 0.21, w: 0.26, h: 0.69 };
const SINGLE_PHOTO: Rect = { x: 0.2, y: 0.17, w: 0.62, h: 0.78 };

/** Zona del torso en la remera 3D (unidades locales) donde se apoya la foto. */
const TORSO = { left: -1, right: 1, top: 1.1, bottom: -1.62 };

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export async function loadShirtArt(product: Product): Promise<ShirtArt> {
  const fallback = getColorHex(product.colors[0] ?? 'negro');
  const sides: Record<ShirtSide, ArtSource | null> = { design: null, front: null };

  try {
    if (product.hoverImage && product.images.length >= 2) {
      const [front, back] = await Promise.all([
        loadImage(product.images[0]),
        loadImage(product.images[1]),
      ]);
      sides.design = { image: back, torso: SINGLE_PHOTO };
      sides.front = { image: front, torso: SINGLE_PHOTO };
    } else {
      const source = product.images.at(-1) ?? product.images[0];
      if (source) {
        const image = await loadImage(source);
        const designOnRight = product.id === 'naruto-y-kurama';
        sides.design = { image, torso: designOnRight ? MOCKUP_RIGHT : MOCKUP_LEFT };
        sides.front = { image, torso: designOnRight ? MOCKUP_LEFT : MOCKUP_RIGHT };
      }
    }
  } catch {
    sides.design = null;
    sides.front = null;
  }

  const sample = sides.design ?? sides.front;
  const base = sample ? sampleGarmentColor(sample) ?? fallback : fallback;
  const lining = new THREE.Color(base).multiplyScalar(0.55);
  return { name: product.name, base, lining, sides };
}

/**
 * Pinta la textura de un panel: color de la prenda de fondo y la foto del torso encima,
 * con los bordes difuminados para que no se vea el corte.
 */
export function paintShirtTexture(
  art: ShirtArt,
  side: ShirtSide,
  width: number,
  bounds: THREE.Box2,
  anisotropy: number,
): THREE.CanvasTexture {
  const boundsWidth = bounds.max.x - bounds.min.x;
  const boundsHeight = bounds.max.y - bounds.min.y;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((width * boundsHeight) / boundsWidth);
  const context = canvas.getContext('2d');

  if (context) {
    context.fillStyle = art.base;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const toCanvasX = (x: number) => ((x - bounds.min.x) / boundsWidth) * canvas.width;
    const toCanvasY = (y: number) => (1 - (y - bounds.min.y) / boundsHeight) * canvas.height;
    const target: Rect = {
      x: toCanvasX(TORSO.left),
      y: toCanvasY(TORSO.top),
      w: toCanvasX(TORSO.right) - toCanvasX(TORSO.left),
      h: toCanvasY(TORSO.bottom) - toCanvasY(TORSO.top),
    };

    const source = art.sides[side];
    if (source) {
      drawFeathered(context, source, target);
    } else if (side === 'design') {
      context.fillStyle = readableInk(art.base);
      context.font = `900 ${Math.round(width * 0.07)}px Arial, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        art.name.toUpperCase(),
        target.x + target.w / 2,
        target.y + target.h * 0.35,
        target.w * 0.9,
      );
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function drawFeathered(context: CanvasRenderingContext2D, source: ArtSource, target: Rect): void {
  const { image, torso } = source;
  const layer = document.createElement('canvas');
  layer.width = Math.max(1, Math.round(target.w));
  layer.height = Math.max(1, Math.round(target.h));
  const layerContext = layer.getContext('2d');
  if (!layerContext) return;

  layerContext.drawImage(
    image,
    torso.x * image.naturalWidth,
    torso.y * image.naturalHeight,
    torso.w * image.naturalWidth,
    torso.h * image.naturalHeight,
    0,
    0,
    layer.width,
    layer.height,
  );

  // Borra los bordes de forma gradual para fundir la foto con el color de la tela.
  layerContext.globalCompositeOperation = 'destination-out';
  const featherX = layer.width * 0.1;
  const featherY = layer.height * 0.06;
  const edges: [number, number, number, number, number, number, number, number][] = [
    [0, 0, featherX, 0, 0, 0, featherX, layer.height],
    [layer.width, 0, layer.width - featherX, 0, layer.width - featherX, 0, featherX, layer.height],
    [0, 0, 0, featherY, 0, 0, layer.width, featherY],
    [0, layer.height, 0, layer.height - featherY, 0, layer.height - featherY, layer.width, featherY],
  ];
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of edges) {
    const gradient = layerContext.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    layerContext.fillStyle = gradient;
    layerContext.fillRect(rx, ry, rw, rh);
  }

  context.drawImage(layer, target.x, target.y);
}

/** Color real de la tela en la foto: mediana de un parche liso cerca del bajo. */
function sampleGarmentColor(source: ArtSource): string | null {
  const { image, torso } = source;
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 12;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(
    image,
    (torso.x + torso.w * 0.06) * image.naturalWidth,
    (torso.y + torso.h * 0.84) * image.naturalHeight,
    torso.w * 0.22 * image.naturalWidth,
    torso.h * 0.1 * image.naturalHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const channel = (offset: number): number => {
    const values: number[] = [];
    for (let index = offset; index < data.length; index += 4) values.push(data[index] ?? 0);
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 0;
  };
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function readableInk(base: string): string {
  const color = new THREE.Color(base);
  return color.r * 0.299 + color.g * 0.587 + color.b * 0.114 > 0.5 ? '#0b0b0b' : '#f4f4f0';
}

function loadImage(path: string): Promise<HTMLImageElement> {
  const url = path.startsWith('/') ? path : `/${path}`;
  let pending = imageCache.get(url);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
      image.src = url;
    });
    pending.catch(() => imageCache.delete(url));
    imageCache.set(url, pending);
  }
  return pending;
}
