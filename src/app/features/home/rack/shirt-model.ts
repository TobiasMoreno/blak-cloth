import * as THREE from 'three';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Remera 3D generada por código: dos paneles (frente y espalda) inflados desde la silueta,
 * que se unen en el borde como una prenda real. Todas las medidas están en unidades locales;
 * SHIRT_SCALE las pasa al mundo de la escena.
 */
export const SHIRT_SCALE = 0.42;

/** Punto de la percha que apoya sobre el riel (unidades locales). */
export const HOOK_CONTACT = new THREE.Vector3(0.18, 2, 0);

/**
 * Semiancho de manga a manga y semiespesor máximo (panel + pecho + ondas con CLOTH_AMPLITUDE),
 * en unidades locales. Son la caja con la que se verificó que las remeras no se crucen.
 */
export const SHIRT_HALF_WIDTH = 1.75;
export const SHIRT_HALF_THICKNESS = 0.15;
export const CLOTH_AMPLITUDE = 0.012;
export const SHIRT_HEM_Y = -1.78;

const PANEL_DEPTH = 0.11;
const EDGE_ROUNDING = 0.32;
const FULL_TURN = Math.PI * 2;

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
  shape.quadraticCurveTo(-0.78, 1.43, -0.52, 1.45);
  shape.quadraticCurveTo(-0.25, 1.22, 0, 1.2);
  shape.quadraticCurveTo(0.25, 1.22, 0.52, 1.45);
  shape.quadraticCurveTo(0.78, 1.43, 1.22, 1.12);
  shape.lineTo(1.72, 0.82);
  shape.lineTo(1.42, 0.36);
  shape.lineTo(1.03, 0.66);
  shape.lineTo(0.98, -1.65);
  shape.quadraticCurveTo(0, -1.78, -0.98, -1.65);
  const neck = new THREE.Path();
  neck.absellipse(0, 1.35, 0.34, 0.18, 0, FULL_TURN, false, 0);
  shape.holes.push(neck);
  return shape;
}

/** Se construye una sola vez y la comparten todas las remeras del perchero. */
export function createShirtGeometry(): ShirtGeometry {
  // Contorno con puntos parejos (también en los tramos rectos) para que el borde salga liso.
  const source = createShirtShape();
  const outer = source.getSpacedPoints(150);
  const holes = source.holes.map((hole) => hole.getSpacedPoints(48));
  const shape = new THREE.Shape(outer);
  shape.holes = holes.map((points) => new THREE.Path(points));
  const flat = new THREE.ShapeGeometry(shape, 1);
  const dense = new TessellateModifier(0.17, 8).modify(flat);
  flat.dispose();

  const closedLoops = [outer, ...holes];

  dense.computeBoundingBox();
  const box = dense.boundingBox ?? new THREE.Box3();
  const bounds = new THREE.Box2(
    new THREE.Vector2(box.min.x, box.min.y),
    new THREE.Vector2(box.max.x, box.max.y),
  );

  const front = inflatePanel(dense, closedLoops, bounds, 1);
  const back = inflatePanel(dense, closedLoops, bounds, -1);
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

function inflatePanel(
  source: THREE.BufferGeometry,
  loops: THREE.Vector2[][],
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
    const edge = Math.min(1, distanceToLoops(x, y, loops) / EDGE_ROUNDING);
    // Perfil redondeado: la tela llega al borde a 90° y se aplana hacia el centro.
    const bulge = Math.sqrt(1 - (1 - edge) * (1 - edge));
    const chest = 1 + 0.1 * Math.exp(-((y - 0.45) ** 2) / 0.6);
    position.setZ(index, side * PANEL_DEPTH * bulge * chest);

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

function distanceToLoops(x: number, y: number, loops: THREE.Vector2[][]): number {
  let best = Infinity;
  for (const loop of loops) {
    for (let index = 0; index < loop.length; index += 1) {
      const a = loop[index];
      const b = loop[(index + 1) % loop.length];
      best = Math.min(best, distanceToSegment(x, y, a, b));
    }
  }
  return best;
}

function distanceToSegment(x: number, y: number, a: THREE.Vector2, b: THREE.Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = THREE.MathUtils.clamp(((x - a.x) * dx + (y - a.y) * dy) / lengthSq, 0, 1);
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
}

function createCollarGeometry(): THREE.BufferGeometry {
  const curve = new THREE.EllipseCurve(0, 1.35, 0.35, 0.19, 0, FULL_TURN, false, 0);
  const points = curve.getPoints(64).map((point) => new THREE.Vector3(point.x, point.y, 0));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 72, 0.03, 8, true);
}

/** Brazos de la percha: quedan dentro de la remera y sostienen los hombros. */
function createHangerGeometry(): THREE.BufferGeometry {
  const arms = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.12, 1.02, 0),
    new THREE.Vector3(-0.6, 1.22, 0),
    new THREE.Vector3(0, 1.36, 0),
    new THREE.Vector3(0.6, 1.22, 0),
    new THREE.Vector3(1.12, 1.02, 0),
  ]);
  return new THREE.TubeGeometry(arms, 40, 0.035, 8, false);
}

function createHookGeometry(): THREE.BufferGeometry {
  const hook = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.34, 0),
    new THREE.Vector3(0, 1.62, 0),
    new THREE.Vector3(-0.04, 1.86, 0),
    new THREE.Vector3(0.06, 2.02, 0),
    new THREE.Vector3(0.2, 2.07, 0),
    new THREE.Vector3(0.32, 1.99, 0),
    new THREE.Vector3(0.36, 1.86, 0),
  ]);
  return new THREE.TubeGeometry(hook, 40, 0.024, 8, false);
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
