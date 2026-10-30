import * as THREE from 'three';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Remera 3D generada por código: dos paneles (frente y espalda) inflados desde la silueta,
 * que se unen en el borde como una prenda real. Todas las medidas están en unidades locales;
 * SHIRT_SCALE las pasa al mundo de la escena.
 */
export const SHIRT_SCALE = 0.42;

/**
 * Eje del riel visto desde la remera (unidades locales): el gancho lo abraza desde arriba.
 * El caño del gancho sube por x = 0, así que la remera queda corrida HOOK_CONTACT.x del riel.
 */
export const HOOK_CONTACT = new THREE.Vector3(0.15, 1.81, 0);

/** Radio del riel de locker-room (0.016 en el mundo) pasado a unidades locales. */
const RAIL_RADIUS = 0.016 / SHIRT_SCALE;
const HOOK_RADIUS = 0.15;
const HOOK_TUBE = 0.024;
const HANGER_DEPTH = 0.07;
const HANGER_BEVEL = 0.025;
/**
 * Escote: puntos del cuello (±x, y), altura del centro del escote y medio fondo del óvalo
 * abierto. La proporción ancho/fondo del óvalo copia la de una remera real colgada.
 */
const NECK = { x: 0.36, y: 1.46, dip: 1.42, depth: 0.1, frontDrop: 0.12, dropFade: 0.6 } as const;

/**
 * Semiancho de manga a manga y semiespesor máximo (panel + pecho + ondas con CLOTH_AMPLITUDE),
 * en unidades locales. Son la caja con la que se verificó que las remeras no se crucen.
 */
export const SHIRT_HALF_WIDTH = 1.75;
export const SHIRT_HALF_THICKNESS = 0.3;
export const CLOTH_AMPLITUDE = 0.018;
export const SHIRT_HEM_Y = -1.78;

/**
 * Lado de z donde está el frente real de la prenda (pecho, escote bajo). El panel +z lleva el
 * estampado de la espalda (`design`), que es el que mira a cámara en el perchero.
 */
const GARMENT_FRONT = -1;
const FRONT_PANEL_DEPTH = 0.25;
const BACK_PANEL_DEPTH = 0.22;
const EDGE_ROUNDING = 0.32;

export interface ShirtGeometry {
  front: THREE.BufferGeometry;
  back: THREE.BufferGeometry;
  collar: THREE.BufferGeometry;
  hanger: THREE.BufferGeometry;
  hook: THREE.BufferGeometry;
  bounds: THREE.Box2;
}

export interface ClothUniforms {
  uTime: { value: number };
  uPhase: { value: number };
  uAmp: { value: number };
  uTwist: { value: number };
  uBend: { value: number };
  uLining: { value: THREE.Color };
}

export function createShirtShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-0.98, -1.65);
  shape.lineTo(-1.03, 0.66);
  shape.lineTo(-1.42, 0.36);
  shape.lineTo(-1.72, 0.82);
  shape.lineTo(-1.22, 1.12);
  shape.quadraticCurveTo(-0.8, 1.36, -NECK.x, NECK.y);
  // Escote: entre los puntos del cuello la tela no se cose; ahí se abre el óvalo del cuello.
  shape.quadraticCurveTo(0, NECK.dip, NECK.x, NECK.y);
  shape.quadraticCurveTo(0.8, 1.36, 1.22, 1.12);
  shape.lineTo(1.72, 0.82);
  shape.lineTo(1.42, 0.36);
  shape.lineTo(1.03, 0.66);
  shape.lineTo(0.98, -1.65);
  shape.quadraticCurveTo(0, -1.78, -0.98, -1.65);
  return shape;
}

/** Medio ancho de la abertura del cuello (vista desde arriba) a la altura x del escote. */
function neckOpening(x: number): number {
  const t = Math.min(1, Math.abs(x) / NECK.x);
  return NECK.depth * Math.sqrt(1 - t * t);
}

/**
 * Cuánto baja el frente: el escote delantero cae por debajo del borde de la percha y se apoya
 * en ella, mientras la espalda queda alta. Se apaga hacia los hombros y hacia abajo del pecho.
 */
function frontNeckDrop(x: number, toNeck: number): number {
  const fade = 1 - THREE.MathUtils.smoothstep(toNeck, 0, NECK.dropFade);
  return NECK.frontDrop * (neckOpening(x) / NECK.depth) * fade;
}

/** Se construye una sola vez y la comparten todas las remeras del perchero. */
export function createShirtGeometry(): ShirtGeometry {
  // Contorno con puntos parejos (también en los tramos rectos) para que el borde salga liso.
  const source = createShirtShape();
  const outer = source.getSpacedPoints(150);
  const flat = new THREE.ShapeGeometry(new THREE.Shape(outer), 1);
  const dense = new TessellateModifier(0.17, 8).modify(flat);
  flat.dispose();

  const { seams, neck } = splitOutline(outer);

  dense.computeBoundingBox();
  const box = dense.boundingBox ?? new THREE.Box3();
  const bounds = new THREE.Box2(
    new THREE.Vector2(box.min.x, box.min.y),
    new THREE.Vector2(box.max.x, box.max.y),
  );

  const front = inflatePanel(dense, seams, neck, bounds, 1);
  const back = inflatePanel(dense, seams, neck, bounds, -1);
  dense.dispose();

  return {
    front,
    back,
    collar: createCollarGeometry(),
    hanger: createHangerGeometry(),
    hook: createHookGeometry(),
    bounds,
  };
}

type Segment = readonly [THREE.Vector2, THREE.Vector2];

function loopSegments(loop: THREE.Vector2[]): Segment[] {
  return loop.map((point, index) => [point, loop[(index + 1) % loop.length]] as const);
}

/**
 * Separa el contorno en costuras (frente y espalda se cosen) y escote. El bajo y los puños no
 * entran en ninguno: ahí los paneles no se juntan y la prenda queda abierta, dejando ver el forro.
 */
function splitOutline(outer: THREE.Vector2[]): { seams: Segment[]; neck: Segment[] } {
  const cuffA = new THREE.Vector2(1.42, 0.36);
  const cuffB = new THREE.Vector2(1.72, 0.82);
  const seams: Segment[] = [];
  const neck: Segment[] = [];
  for (const segment of loopSegments(outer)) {
    const [a, b] = segment;
    const x = Math.abs((a.x + b.x) / 2);
    const y = (a.y + b.y) / 2;
    if (y < -1.6 && x < 0.96) continue;
    if (distanceToSegment(x, y, cuffA, cuffB) < 0.01) continue;
    (y > NECK.dip - 0.05 && x < NECK.x ? neck : seams).push(segment);
  }
  return { seams, neck };
}

/** Perfil redondeado: la tela llega a la costura a 90° y se aplana hacia el centro. */
function roundness(distance: number): number {
  const edge = Math.min(1, distance / EDGE_ROUNDING);
  return Math.sqrt(1 - (1 - edge) * (1 - edge));
}

function inflatePanel(
  source: THREE.BufferGeometry,
  seams: Segment[],
  neck: Segment[],
  bounds: THREE.Box2,
  side: 1 | -1,
): THREE.BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute('position');
  const uv = new Float32Array(position.count * 2);
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const bodyBlend = 1 - THREE.MathUtils.smoothstep(Math.abs(x), 0.82, 1.22);
    const torsoX = Math.min(1, Math.abs(x) / 1.08);
    const torsoCurve = Math.sqrt(Math.max(0, 1 - torsoX * torsoX));
    const torsoVolume = 0.72 + 0.28 * torsoCurve;
    const chest = side === GARMENT_FRONT ? 1 + 0.12 * Math.exp(-((y - 0.45) ** 2) / 0.5) : 1;
    const sleeveVolume = 0.56 + 0.08 * Math.exp(-((y - 0.85) ** 2) / 0.35);
    const volume = THREE.MathUtils.lerp(sleeveVolume, torsoVolume * chest, bodyBlend);
    const full = (side === GARMENT_FRONT ? FRONT_PANEL_DEPTH : BACK_PANEL_DEPTH) * volume;
    // Lejos de las costuras (bajo y puños) el panel conserva su volumen: la remera queda como
    // tubo. En el escote frente y espalda se separan en un óvalo: el cuello abierto hacia arriba.
    const toNeck = distanceToSeams(x, y, neck);
    const seamed = full * roundness(distanceToSeams(x, y, seams));
    const necked = Math.max(neckOpening(x), full * roundness(toNeck));
    position.setZ(index, side * Math.min(seamed, necked));
    if (side === GARMENT_FRONT) position.setY(index, y - frontNeckDrop(x, toNeck));

    const u = (x - bounds.min.x) / width;
    uv[index * 2] = side === 1 ? u : 1 - u;
    uv[index * 2 + 1] = (y - bounds.min.y) / height;
  }

  if (side === -1) flipWinding(geometry, uv);
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.deleteAttribute('normal');
  // Fusionar vértices repetidos da normales suaves en vez de facetas.
  const smooth = mergeVertices(geometry, 1e-5);
  geometry.dispose();
  smooth.computeVertexNormals();
  return smooth;
}

function flipWinding(geometry: THREE.BufferGeometry, uv: Float32Array): void {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const array = position.array as Float32Array;
  for (let triangle = 0; triangle < position.count; triangle += 3) {
    const a = (triangle + 1) * 3;
    const b = (triangle + 2) * 3;
    for (let axis = 0; axis < 3; axis += 1) {
      const swap = array[a + axis];
      array[a + axis] = array[b + axis];
      array[b + axis] = swap;
    }
    const ua = (triangle + 1) * 2;
    const ub = (triangle + 2) * 2;
    for (let axis = 0; axis < 2; axis += 1) {
      const swap = uv[ua + axis];
      uv[ua + axis] = uv[ub + axis];
      uv[ub + axis] = swap;
    }
  }
  position.needsUpdate = true;
}

function distanceToSeams(x: number, y: number, seams: Segment[]): number {
  let best = Infinity;
  for (const [a, b] of seams) best = Math.min(best, distanceToSegment(x, y, a, b));
  return best;
}

function distanceToSegment(x: number, y: number, a: THREE.Vector2, b: THREE.Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = THREE.MathUtils.clamp(((x - a.x) * dx + (y - a.y) * dy) / lengthSq, 0, 1);
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
}

/** Cuello acanalado: un aro que bordea el óvalo del escote; adelante baja con el frente. */
function createCollarGeometry(): THREE.BufferGeometry {
  const neckline = new THREE.QuadraticBezierCurve(
    new THREE.Vector2(-NECK.x, NECK.y),
    new THREE.Vector2(0, NECK.dip),
    new THREE.Vector2(NECK.x, NECK.y),
  );
  const steps = 32;
  const points: THREE.Vector3[] = [];
  for (const side of [1, -1]) {
    for (let step = 0; step < steps; step += 1) {
      const t = side === 1 ? step / steps : 1 - step / steps;
      const { x, y } = neckline.getPoint(t);
      const drop = side === GARMENT_FRONT ? frontNeckDrop(x, 0) : 0;
      points.push(new THREE.Vector3(x, y - drop, side * neckOpening(x)));
    }
  }
  // Dos vueltas apiladas: más alto que grueso, como un ribete de punto.
  const rows = [0, -0.04].map((offset) => {
    const loop = points.map((point) => point.clone().setY(point.y + offset));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true), 96, 0.03, 10, true);
  });
  const collar = mergeGeometries(rows);
  rows.forEach((row) => row.dispose());
  return collar ?? new THREE.BufferGeometry();
}

/**
 * Percha de madera plana: un arco más grueso en el centro que en las puntas, con cantos
 * redondeados. Queda dentro de la remera, sosteniendo los hombros; se ve por el cuello abierto.
 */
function createHangerGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-1.06, 1.04);
  shape.quadraticCurveTo(0, 1.64, 1.06, 1.04);
  shape.quadraticCurveTo(1.14, 1, 1.06, 0.96);
  shape.quadraticCurveTo(0, 1.44, -1.06, 0.96);
  shape.quadraticCurveTo(-1.14, 1, -1.06, 1.04);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: HANGER_DEPTH,
    bevelThickness: HANGER_BEVEL,
    bevelSize: HANGER_BEVEL,
    bevelSegments: 4,
    curveSegments: 48,
  });
  geometry.translate(0, 0, -HANGER_DEPTH / 2);
  return geometry;
}

/** Gancho cromado: sube desde el centro de la percha y se curva sobre el riel. */
function createHookGeometry(): THREE.BufferGeometry {
  const { x: cx } = HOOK_CONTACT;
  const cy = HOOK_CONTACT.y + HOOK_TUBE + RAIL_RADIUS - HOOK_RADIUS;
  const points = [new THREE.Vector3(0, 1.28, 0), new THREE.Vector3(0, cy, 0)];
  // Arco de casi tres cuartos de vuelta: del caño, por arriba del riel, hasta bajar del otro lado.
  for (let step = 1; step <= 24; step += 1) {
    const angle = Math.PI - (step / 24) * (Math.PI + 0.55);
    points.push(new THREE.Vector3(cx + HOOK_RADIUS * Math.cos(angle), cy + HOOK_RADIUS * Math.sin(angle), 0));
  }
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(new THREE.LineCurve3(points[0], points[1]));
  path.add(new THREE.CatmullRomCurve3(points.slice(1)));
  const wire = new THREE.TubeGeometry(path, 64, HOOK_TUBE, 10, false);

  const tip = new THREE.SphereGeometry(HOOK_TUBE * 1.35, 12, 8);
  tip.translate(points.at(-1)?.x ?? 0, points.at(-1)?.y ?? 0, 0);
  // Casquillo donde el gancho entra en la madera.
  const ferrule = new THREE.CylinderGeometry(0.045, 0.05, 0.1, 16);
  ferrule.translate(0, 1.38, 0);
  const merged = mergeGeometries([wire, tip, ferrule]);
  wire.dispose();
  tip.dispose();
  ferrule.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/** Normal map de punto de algodón, generado una vez y compartido. */
export function createKnitNormalMap(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const height = (x: number, y: number): number => {
    const loop = Math.sin((x / size) * 16 * Math.PI * 2) * 0.5 + 0.5;
    const row = Math.sin((y / size) * 22 * Math.PI * 2 + Math.sin((x / size) * 8 * Math.PI * 2) * 0.8);
    return loop * (0.55 + 0.45 * row);
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (height(x + 1, y) - height(x - 1, y)) * 1.8;
      const dy = (height(x, y + 1) - height(x, y - 1)) * 1.8;
      const length = Math.hypot(dx, dy, 1);
      const offset = (y * size + x) * 4;
      data[offset] = (-dx / length) * 127 + 128;
      data[offset + 1] = (-dy / length) * 127 + 128;
      data[offset + 2] = (1 / length) * 127 + 128;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(26, 24);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

const CLOTH_COMMON = /* glsl */ `
uniform float uTime;
uniform float uPhase;
uniform float uAmp;
uniform float uTwist;
uniform float uBend;

// 0 donde la percha sostiene los hombros, 1 en el bajo; las mangas cuelgan sueltas.
float hangWeight(vec3 p) {
  float body = smoothstep(1.15, -1.5, p.y);
  float sleeve = 0.55 * smoothstep(1.02, 1.4, abs(p.x)) * smoothstep(1.2, 0.5, p.y);
  return max(body, sleeve);
}

// x: desplazamiento; yz: pendiente en x e y para corregir la normal.
vec3 clothRipple(vec3 p) {
  float a = uTime * 1.05 + p.x * 2.6 + p.y * 3.8 + uPhase;
  float b = uTime * 1.7 + p.x * 6.4 - p.y * 2.9 + uPhase * 1.6;
  float c = uTime * 0.5 + p.y * 1.2 + uPhase * 0.7;
  float gust = 0.7 + 0.3 * sin(uTime * 0.29 + uPhase * 2.1);
  float h = 0.5 * sin(a) + 0.3 * sin(b) + sin(c);
  vec2 slope = vec2(1.3 * cos(a) + 1.92 * cos(b), 1.9 * cos(a) - 0.87 * cos(b) + 1.2 * cos(c));
  return vec3(h, slope) * gust;
}

vec2 twistXZ(vec2 xz, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * xz.x + s * xz.y, -s * xz.x + c * xz.y);
}
`;

const CLOTH_NORMAL = /* glsl */ `
float clothWeightN = hangWeight(position);
objectNormal.xy -= objectNormal.z * uAmp * clothWeightN * clothRipple(position).yz;
objectNormal.xz = twistXZ(objectNormal.xz, uTwist * clothWeightN);
objectNormal = normalize(objectNormal);
`;

const CLOTH_VERTEX = /* glsl */ `
float clothWeight = hangWeight(position);
transformed.z += uAmp * clothWeight * clothRipple(position).x;
transformed.x += uBend * clothWeight * clothWeight;
transformed.xz = twistXZ(transformed.xz, uTwist * clothWeight);
`;

function injectCloth(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: ClothUniforms): void {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${CLOTH_COMMON}`)
    .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${CLOTH_NORMAL}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${CLOTH_VERTEX}`);
}

export function createClothUniforms(time: { value: number }, phase: number, lining: THREE.Color): ClothUniforms {
  return {
    uTime: time,
    uPhase: { value: phase },
    uAmp: { value: 0 },
    uTwist: { value: 0 },
    uBend: { value: 0 },
    uLining: { value: lining },
  };
}

/** Tela de algodón con brillo suave (sheen), interior de otro tono y ondas por shader. */
export function createClothMaterial(
  map: THREE.Texture,
  normalMap: THREE.Texture,
  uniforms: ClothUniforms,
): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.82,
    sheen: 0.35,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color('#8f8a84'),
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    injectCloth(shader, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uLining;')
      .replace(
        '#include <map_fragment>',
        '#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = uLining;',
      );
  };
  return material;
}

/** Sombra que acompaña la deformación de la tela. */
export function createClothDepthMaterial(uniforms: ClothUniforms): THREE.MeshDepthMaterial {
  const material = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => injectCloth(shader, uniforms);
  return material;
}
