import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Product } from '../../core/models/product.model';
import { buildLockerRoom } from './rack/locker-room';
import { RackAudio } from './rack/rack-audio';
import {
  CLOTH_AMPLITUDE,
  ClothUniforms,
  HOOK_CONTACT,
  SHIRT_HALF_WIDTH,
  SHIRT_HEM_Y,
  SHIRT_SCALE,
  ShirtGeometry,
  createClothDepthMaterial,
  createClothMaterial,
  createClothUniforms,
  createKnitNormalMap,
  createShirtGeometry,
} from './rack/shirt-model';
import { ShirtArt, ShirtSide, loadShirtArt, paintShirtTexture } from './rack/shirt-texture';

export type ShowroomSide = ShirtSide;

export interface RackEntry {
  product: Product;
  group: string;
}

interface HomeShowroomSceneOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  labelLayer: HTMLElement;
  caption: HTMLElement;
  onFailure: () => void;
  onReady: () => void;
  onHoverChange: (id: string | null) => void;
  onSelectionChange: (id: string | null) => void;
  onSideChange: (side: ShowroomSide) => void;
}

interface RackItem {
  id: string;
  group: string;
  pivot: THREE.Group;
  turn: THREE.Group;
  materials: Record<ShirtSide, THREE.MeshPhysicalMaterial>;
  meshes: THREE.Mesh[];
  uniforms: ClothUniforms;
  art: ShirtArt;
  low: Record<ShirtSide, THREE.CanvasTexture>;
  high: Record<ShirtSide, THREE.CanvasTexture> | null;
  highWidth: number;
  active: boolean;
  presence: number;
  restX: number;
  baseX: number;
  /** 0 = colgada en el perchero, 1 = afuera y de frente. */
  pull: number;
  /** 0 = afuera del perchero, 1 = en el escenario. */
  stage: number;
  yaw: number;
  lagYaw: number;
  lagYawVelocity: number;
  lagRoll: number;
  lagRollVelocity: number;
}

interface GroupLabel {
  key: string;
  element: HTMLElement | null;
}

/**
 * Medidas del perchero (mundo). La coreografía está verificada por SAT sobre la caja de cada
 * remera (SHIRT_HALF_WIDTH × SHIRT_HALF_THICKNESS):
 * - colgadas de canto a RACK_YAW, paralelas, separadas `spacing`: nunca se tocan;
 * - una remera sale hacia adelante con un desplazamiento lateral corto (`pullXRatio`) y recién
 *   gira cuando quedó delante de todas; varias pueden deslizarse a la vez, pero solo una gira;
 * - las vecinas se abren `spread` en bloque (sin caída), así ningún hueco se achica;
 * - el escenario está por delante de todo y la remera solo gira ahí cuando ya llegó.
 * Si cambiás estos valores, hay que volver a verificar.
 */
const RAIL_Y = 1;
const RACK = {
  // Mantiene la lectura de perchero, pero deja una franja clara para apuntar cada prenda.
  spacing: 0.3,
  groupGap: 0.55,
  yaw: 1.2,
  pull: 1.3,
  pullXRatio: -0.15,
  spread: 0.5,
  turnStart: 0.5,
  pickRadius: 0.38,
} as const;
const STAGE_Z = 1.8;
const DIM_Z = 0.95;
const STAGE_MAX_SCALE = 1.2;
const PULL_SPEED = 2.2;
const STAGE_SPEED = 1.5;
const PRESENCE_SPEED = 3;
const SETTLED = 0.0005;

const CAMERA = {
  fov: 32,
  position: new THREE.Vector3(0, 0.5, 5.4),
  target: new THREE.Vector3(0, 0.22, 0),
  minHalfWidth: 1.25,
};
const INTRO = {
  position: new THREE.Vector3(2.6, 1.3, 2.3),
  target: new THREE.Vector3(0.5, 0.85, 0),
  seconds: 3.2,
};

const SHIRT_HANG = (HOOK_CONTACT.y - SHIRT_HEM_Y) * SHIRT_SCALE;
const SHIRT_WIDTH = SHIRT_HALF_WIDTH * 2 * SHIRT_SCALE;
const LOW_TEXTURE = 512;
const HOVER_TEXTURE = 1024;
const STAGE_TEXTURE = 1536;
const SIDES: ShirtSide[] = ['design', 'front'];

export class HomeShowroomScene {
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 40);
  private readonly rail = new THREE.Group();
  private readonly audio = new RackAudio();
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly projected = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly mobile = window.innerWidth < 820 || window.matchMedia('(pointer: coarse)').matches;
  private readonly touchOnly = window.matchMedia('(hover: none)').matches;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private geometry: ShirtGeometry | null = null;
  private knit: THREE.DataTexture | null = null;
  private hangerMaterial: THREE.Material | null = null;
  private hookMaterial: THREE.Material | null = null;
  private dim: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  private supports: THREE.Group | null = null;
  private environment: THREE.Texture | null = null;
  private anisotropy = 4;

  private items: RackItem[] = [];
  private labels: GroupLabel[] = [];
  private hover: RackItem | null = null;
  private selected: RackItem | null = null;
  private sharp: RackItem[] = [];
  private sharpTimer = 0;
  private keyboardHover = false;
  private lastSide: ShowroomSide = 'design';

  private readonly clothTime = { value: 0 };
  private time = 0;
  private lastFrame = 0;
  private animationFrame: number | null = null;
  private visible = true;
  private inViewport = true;
  private destroyed = false;
  private buildVersion = 0;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  private tanHalf = Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2));
  private bounds = { min: 0, max: 0 };
  private scroll = 0;
  private scrollTarget = 0;
  private scrollVelocity = 0;
  private railVelocity = 0;
  private railAcceleration = 0;
  private swing = 0;
  private swingVelocity = 0;
  private userYaw = 0;
  private yawVelocity = 0;
  private stageSince = 0;
  private intro = 0;
  private introSpeed = 1 / INTRO.seconds;
  private parallax = new THREE.Vector2();

  private readonly pointer = {
    x: 0,
    y: 0,
    inside: false,
    down: false,
    id: -1,
    moved: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    touch: false,
  };
  private dragging = false;

  constructor(private readonly options: HomeShowroomSceneOptions) {}

  initialize(): void {
    try {
      const renderer = new THREE.WebGLRenderer({
        canvas: this.options.canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 1.5 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      this.renderer = renderer;
      this.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

      this.scene.background = new THREE.Color('#0b0909');
      this.scene.fog = new THREE.Fog('#0b0909', 8, 15);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      this.environment = pmrem.fromScene(room, 0.04).texture;
      room.dispose();
      pmrem.dispose();
      this.scene.environment = this.environment;
      this.scene.environmentIntensity = 0.22;

      const lockerRoom = buildLockerRoom(this.scene, RAIL_Y, DIM_Z, this.mobile);
      this.dim = lockerRoom.dim;
      this.supports = lockerRoom.supports;
      this.scene.add(this.rail);

      this.geometry = createShirtGeometry();
      this.knit = createKnitNormalMap();
      this.hangerMaterial = new THREE.MeshPhysicalMaterial({
        color: '#1c1a19',
        roughness: 0.4,
        clearcoat: 0.6,
        clearcoatRoughness: 0.3,
      });
      this.hookMaterial = new THREE.MeshStandardMaterial({ color: '#d4d0ca', roughness: 0.22, metalness: 1 });

      if (this.reducedMotion) this.intro = 1;
      this.applyCamera(this.intro);
      this.bindEvents();
      this.resize();
      this.lastFrame = performance.now();
      this.animationFrame = requestAnimationFrame(this.tick);
    } catch {
      this.options.onFailure();
      this.destroy();
    }
  }

  async setEntries(entries: RackEntry[]): Promise<void> {
    if (!this.geometry || !this.knit) return;
    const version = ++this.buildVersion;
    const arts = await Promise.all(entries.map((entry) => loadShirtArt(entry.product)));
    if (this.destroyed || version !== this.buildVersion || !this.geometry || !this.knit) return;

    this.clearItems();
    this.items = entries.map((entry, index) => this.createItem(entry, arts[index], index));
    this.labels = this.createLabels(entries);
    this.layout();
    for (const item of this.items) {
      item.baseX = item.restX;
      item.presence = 1;
    }
    this.scroll = this.scrollTarget = this.bounds.min;
    this.options.onReady();
  }

  /** Muestra solo estas remeras. Primero se guardan las que salen, después se acomoda el riel. */
  setVisible(ids: string[]): void {
    const visible = new Set(ids);
    this.select(null);
    this.setHover(null);
    for (const item of this.items) item.active = visible.has(item.id);
    this.layout();
    this.scrollTarget = THREE.MathUtils.clamp(this.scrollTarget, this.bounds.min, this.bounds.max);
  }

  select(id: string | null): void {
    const next = id ? (this.items.find((item) => item.id === id && item.active) ?? null) : null;
    if (next === this.selected) return;

    if (this.selected) this.userYaw = normalizeAngle(this.userYaw);
    this.selected = next;
    this.yawVelocity = 0;
    if (next) {
      this.userYaw = 0;
      this.stageSince = this.time;
      this.scrollTarget = THREE.MathUtils.clamp(next.restX, this.bounds.min, this.bounds.max);
      this.scrollVelocity = 0;
      this.sharpen(next, STAGE_TEXTURE);
      this.audio.clink(0.8);
    }
    this.setHover(null);
    this.options.canvas.style.cursor = next ? 'grab' : '';
    this.options.onSelectionChange(next?.id ?? null);
    this.emitSide(true);
  }

  /** Recorre las remeras visibles; si hay una elegida, pasa a la siguiente. */
  step(direction: 1 | -1): void {
    const active = this.activeItems();
    if (active.length === 0) return;
    const reference = this.selected ?? this.hover;
    const current = reference ? active.indexOf(reference) : direction > 0 ? -1 : active.length;
    const next = active[THREE.MathUtils.clamp(current + direction, 0, active.length - 1)];
    if (!next) return;
    this.skipIntro();
    if (this.selected) {
      this.select(next.id);
    } else {
      this.keyboardHover = true;
      this.setHover(next);
      this.scrollTarget = THREE.MathUtils.clamp(next.restX, this.bounds.min, this.bounds.max);
    }
  }

  openHovered(): void {
    if (this.hover) this.select(this.hover.id);
  }

  showSide(side: ShowroomSide): void {
    const target = side === 'design' ? 0 : Math.PI;
    this.userYaw = Math.round((this.userYaw - target) / (Math.PI * 2)) * Math.PI * 2 + target;
    this.yawVelocity = 0;
    this.emitSide();
  }

  flip(): void {
    this.showSide(this.currentSide() === 'design' ? 'front' : 'design');
  }

  setSound(enabled: boolean): void {
    this.audio.setEnabled(enabled);
  }

  destroy(): void {
    this.destroyed = true;
    this.buildVersion += 1;
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    window.clearTimeout(this.sharpTimer);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    const canvas = this.options.canvas;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointercancel', this.onPointerUp);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('wheel', this.onWheel);
    this.clearItems();
    this.audio.dispose();

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) =>
          materials.add(material),
        );
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    if (this.geometry) {
      Object.values(this.geometry).forEach((value) => {
        if (value instanceof THREE.BufferGeometry) value.dispose();
      });
    }
    this.knit?.dispose();
    this.hangerMaterial?.dispose();
    this.hookMaterial?.dispose();
    this.environment?.dispose();
    this.renderer?.dispose();
    this.renderer = null;
  }

  // ─── Construcción ──────────────────────────────────────────────────────────

  private createItem(entry: RackEntry, art: ShirtArt, index: number): RackItem {
    const geometry = this.geometry as ShirtGeometry;
    const knit = this.knit as THREE.DataTexture;
    const phase = (index * 2.399) % (Math.PI * 2);
    const uniforms = createClothUniforms(this.clothTime, phase, art.lining);
    uniforms.uAmp.value = this.reducedMotion ? 0 : CLOTH_AMPLITUDE;

    const low = {
      design: paintShirtTexture(art, 'design', LOW_TEXTURE, geometry.bounds, this.anisotropy),
      front: paintShirtTexture(art, 'front', LOW_TEXTURE, geometry.bounds, this.anisotropy),
    };
    const materials = {
      design: createClothMaterial(low.design, knit, uniforms),
      front: createClothMaterial(low.front, knit, uniforms),
    };
    const depth = createClothDepthMaterial(uniforms);

    const front = new THREE.Mesh(geometry.front, materials.design);
    const back = new THREE.Mesh(geometry.back, materials.front);
    const collarMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(art.base).multiplyScalar(0.92),
      roughness: 0.85,
      sheen: 0.5,
      sheenRoughness: 0.8,
    });
    const collar = new THREE.Mesh(geometry.collar, collarMaterial);
    for (const mesh of [front, back]) {
      mesh.customDepthMaterial = depth;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    collar.castShadow = true;
    const hanger = new THREE.Mesh(geometry.hanger, this.hangerMaterial as THREE.Material);
    const hook = new THREE.Mesh(geometry.hook, this.hookMaterial as THREE.Material);
    hook.castShadow = true;

    // El grupo cuelga del punto de contacto del gancho con el riel.
    const shirt = new THREE.Group();
    shirt.add(front, back, collar, hanger, hook);
    shirt.position.copy(HOOK_CONTACT).multiplyScalar(-1);
    const turn = new THREE.Group();
    turn.scale.setScalar(SHIRT_SCALE);
    turn.add(shirt);
    const pivot = new THREE.Group();
    pivot.position.y = RAIL_Y;
    pivot.add(turn);
    this.rail.add(pivot);

    return {
      id: entry.product.id,
      group: entry.group,
      pivot,
      turn,
      materials,
      meshes: [front, back],
      uniforms,
      art,
      low,
      high: null,
      highWidth: 0,
      active: true,
      presence: 0,
      restX: 0,
      baseX: 0,
      pull: 0,
      stage: 0,
      yaw: RACK.yaw,
      lagYaw: RACK.yaw,
      lagYawVelocity: 0,
      lagRoll: 0,
      lagRollVelocity: 0,
    };
  }

  /** Las etiquetas las pinta el componente (`data-group`); la escena solo las ubica. */
  private createLabels(entries: RackEntry[]): GroupLabel[] {
    const keys = [...new Set(entries.map((entry) => entry.group))];
    return keys.map((key) => ({ key, element: null }));
  }

  private labelElement(label: GroupLabel): HTMLElement | null {
    if (!label.element?.isConnected) {
      label.element = this.options.labelLayer.querySelector<HTMLElement>(`[data-group="${label.key}"]`);
    }
    return label.element;
  }

  private clearItems(): void {
    window.clearTimeout(this.sharpTimer);
    for (const item of this.items) {
      this.rail.remove(item.pivot);
      SIDES.forEach((side) => {
        item.low[side].dispose();
        item.high?.[side].dispose();
        item.materials[side].dispose();
      });
      item.meshes[0]?.customDepthMaterial?.dispose();
      item.pivot.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material !== this.hangerMaterial && object.material !== this.hookMaterial) {
          (object.material as THREE.Material).dispose();
        }
      });
    }
    this.items = [];
    this.hover = null;
    this.selected = null;
    this.sharp = [];
  }

  private activeItems(): RackItem[] {
    return this.items.filter((item) => item.active);
  }

  private layout(): void {
    const active = this.activeItems();
    let cursor = 0;
    let previous: string | null = null;
    for (const item of active) {
      if (previous !== null && item.group !== previous) cursor += RACK.groupGap;
      item.restX = cursor;
      cursor += RACK.spacing;
      previous = item.group;
    }
    const center = active.length ? ((active[0]?.restX ?? 0) + (active.at(-1)?.restX ?? 0)) / 2 : 0;
    active.forEach((item) => (item.restX -= center));
    this.updateBounds();
  }

  private updateBounds(): void {
    const active = this.activeItems();
    const first = active[0];
    const last = active.at(-1);
    if (!first || !last) {
      this.bounds = { min: 0, max: 0 };
      return;
    }
    const padding = 0.7;
    const half = this.viewHalfWidth();
    const min = first.restX - padding + half;
    const max = last.restX + padding - half;
    this.bounds = min < max ? { min, max } : { min: 0, max: 0 };
  }

  private viewHalfWidth(distance = CAMERA.position.z): number {
    return this.tanHalf * distance * this.camera.aspect;
  }

  // ─── Entrada ───────────────────────────────────────────────────────────────

  private bindEvents(): void {
    const canvas = this.options.canvas;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.options.container);
    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.inViewport = entry?.isIntersecting ?? true;
        this.updateVisibility();
      },
      { threshold: 0.01 },
    );
    this.intersectionObserver.observe(this.options.container);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.pointer.down) return;
    if (this.intro < 1) {
      this.skipIntro();
      return;
    }
    Object.assign(this.pointer, {
      down: true,
      id: event.pointerId,
      moved: 0,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: performance.now(),
      touch: event.pointerType !== 'mouse',
      inside: true,
    });
    this.setPointer(event);
    this.scrollVelocity = 0;
    this.yawVelocity = 0;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const pointer = this.pointer;
    pointer.inside = true;
    this.setPointer(event);
    if (event.pointerType === 'mouse') this.keyboardHover = false;
    if (!pointer.down || event.pointerId !== pointer.id) return;

    const deltaX = event.clientX - pointer.lastX;
    const now = performance.now();
    const seconds = Math.max(1, now - pointer.lastTime) / 1000;
    pointer.moved = Math.max(pointer.moved, Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY));

    if (!this.dragging && pointer.moved > 6) {
      // En táctil, un gesto vertical es scroll de la página: no lo capturamos.
      const vertical = Math.abs(event.clientY - pointer.startY) > Math.abs(event.clientX - pointer.startX);
      if (pointer.touch && vertical) {
        pointer.down = false;
        return;
      }
      this.dragging = true;
      this.options.canvas.setPointerCapture(event.pointerId);
      this.options.canvas.style.cursor = 'grabbing';
      if (!this.selected) this.setHover(null);
    }

    if (this.dragging) {
      if (this.selected) {
        const turn = deltaX * 0.011;
        this.userYaw += turn;
        this.yawVelocity = turn / seconds;
        this.emitSide();
      } else {
        const worldPerPixel = (this.viewHalfWidth() * 2) / Math.max(1, this.options.canvas.clientWidth);
        this.scrollTarget -= deltaX * worldPerPixel;
        this.scrollVelocity = (-deltaX * worldPerPixel) / seconds;
      }
    }
    pointer.lastX = event.clientX;
    pointer.lastTime = now;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const pointer = this.pointer;
    if (!pointer.down || event.pointerId !== pointer.id) return;
    pointer.down = false;
    const dragged = this.dragging;
    this.dragging = false;
    if (this.options.canvas.hasPointerCapture(event.pointerId)) {
      this.options.canvas.releasePointerCapture(event.pointerId);
    }
    this.options.canvas.style.cursor = this.selected ? 'grab' : '';
    if (performance.now() - pointer.lastTime > 90) {
      this.scrollVelocity = 0;
      this.yawVelocity = 0;
    }
    if (dragged || event.type === 'pointercancel') return;

    if (this.selected) {
      if (this.hitsItem(this.selected)) this.flip();
      else this.select(null);
    } else {
      const picked = this.pick();
      if (picked) this.select(picked.id);
    }
    if (pointer.touch) pointer.inside = false;
  };

  private readonly onPointerLeave = (): void => {
    this.pointer.inside = false;
  };

  /** Solo el gesto horizontal (o Shift + rueda) mueve el riel: la rueda vertical sigue siendo de la página. */
  private readonly onWheel = (event: WheelEvent): void => {
    if (this.selected) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const delta = horizontal ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (delta === 0) return;
    event.preventDefault();
    this.skipIntro();
    this.scrollTarget += delta * 0.0016;
  };

  private readonly onVisibilityChange = (): void => this.updateVisibility();

  private updateVisibility(): void {
    this.visible = this.inViewport && !document.hidden;
    if (this.visible && this.animationFrame === null && !this.destroyed) {
      this.lastFrame = performance.now();
      this.animationFrame = requestAnimationFrame(this.tick);
    }
  }

  private setPointer(event: PointerEvent): void {
    const rect = this.options.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private hitsItem(item: RackItem): boolean {
    this.ndc.set(this.pointer.x, this.pointer.y);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster.intersectObjects(item.meshes, false).length > 0;
  }

  /** Remera bajo el cursor: primero la que ya está afuera, después la más cercana sobre el riel. */
  private pick(): RackItem | null {
    if (this.hover && this.hover.pull > 0.3 && this.hitsItem(this.hover)) return this.hover;

    this.ndc.set(this.pointer.x, this.pointer.y);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const { origin, direction } = this.raycaster.ray;
    if (Math.abs(direction.z) < 1e-5) return null;

    // Las zonas de selección permanecen en las perchas. Si acompañaran a la prenda que sale
    // hacia adelante, un puntero quieto terminaría apuntando a la vecina durante la animación.
    const distance = -origin.z / direction.z;
    const x = origin.x + direction.x * distance;
    const y = origin.y + direction.y * distance;
    if (y > RAIL_Y + 0.12 || y < RAIL_Y - SHIRT_HANG - 0.05) return null;

    const local = x - this.rail.position.x;
    let best: RackItem | null = null;
    let bestDistance: number = RACK.pickRadius;
    for (const item of this.items) {
      if (!item.active || item.presence < 0.99) continue;
      const gap = Math.abs(item.baseX - local);
      if (gap < bestDistance) {
        bestDistance = gap;
        best = item;
      }
    }
    // Histéresis: no saltar entre vecinas por un píxel.
    if (best && this.hover && best !== this.hover) {
      const current = Math.abs(this.hover.baseX - local);
      if (current < bestDistance + 0.04) return this.hover;
    }
    return best;
  }

  private setHover(item: RackItem | null): void {
    if (item === this.hover) return;
    this.hover = item;
    window.clearTimeout(this.sharpTimer);
    if (item) {
      this.audio.clink(0.6);
      this.sharpTimer = window.setTimeout(() => {
        if (this.hover === item) this.sharpen(item, HOVER_TEXTURE);
      }, 140);
    }
    if (!this.selected) this.options.canvas.style.cursor = item ? 'pointer' : '';
    this.options.onHoverChange(item?.id ?? null);
  }

  private skipIntro(): void {
    if (this.intro < 1) this.introSpeed = Math.max(this.introSpeed, 2.4);
  }

  private currentSide(): ShowroomSide {
    return Math.cos(this.userYaw) >= 0 ? 'design' : 'front';
  }

  private emitSide(force = false): void {
    const side = this.selected ? this.currentSide() : 'design';
    if (!force && side === this.lastSide) return;
    this.lastSide = side;
    this.options.onSideChange(side);
  }

  /** Texturas nítidas solo para las remeras que se miran de cerca (máximo tres). */
  private sharpen(item: RackItem, width: number): void {
    if (!this.geometry) return;
    if (item.highWidth < width) {
      SIDES.forEach((side) => item.high?.[side].dispose());
      item.high = {
        design: paintShirtTexture(item.art, 'design', width, this.geometry.bounds, this.anisotropy),
        front: paintShirtTexture(item.art, 'front', width, this.geometry.bounds, this.anisotropy),
      };
      item.highWidth = width;
      SIDES.forEach((side) => {
        item.materials[side].map = item.high?.[side] ?? item.low[side];
      });
    }
    this.sharp = [item, ...this.sharp.filter((other) => other !== item)];
    for (const stale of this.sharp.splice(3)) {
      if (stale === this.selected) {
        this.sharp.push(stale);
        continue;
      }
      SIDES.forEach((side) => {
        stale.materials[side].map = stale.low[side];
        stale.high?.[side].dispose();
      });
      stale.high = null;
      stale.highWidth = 0;
    }
  }

  // ─── Cámara y escenario ────────────────────────────────────────────────────

  private resize(): void {
    if (!this.renderer) return;
    const width = this.options.canvas.clientWidth;
    const height = this.options.canvas.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.tanHalf = Math.max(
      Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2)),
      CAMERA.minHalfWidth / (CAMERA.position.z * this.camera.aspect),
    );
    this.camera.fov = THREE.MathUtils.radToDeg(Math.atan(this.tanHalf)) * 2;
    this.camera.updateProjectionMatrix();
    this.updateBounds();
  }

  private applyCamera(intro: number): void {
    const eased = intro < 0.5 ? 4 * intro ** 3 : 1 - (-2 * intro + 2) ** 3 / 2;
    this.camera.position.lerpVectors(INTRO.position, CAMERA.position, eased);
    this.camera.position.x += this.parallax.x * eased;
    this.camera.position.y += this.parallax.y * eased;
    this.lookTarget.lerpVectors(INTRO.target, CAMERA.target, eased);
    this.lookTarget.x += this.parallax.x * 0.4 * eased;
    this.camera.lookAt(this.lookTarget);
    this.camera.updateMatrixWorld();
  }

  /** Dónde y a qué escala se presenta la remera elegida, según el espacio libre de la pantalla. */
  private stagePose(): { x: number; y: number; scale: number } {
    const distance = CAMERA.position.z - STAGE_Z;
    const viewHeight = 2 * distance * this.tanHalf;
    const viewWidth = viewHeight * this.camera.aspect;
    const wide = this.options.canvas.clientWidth >= 820;
    const rect = wide
      ? { x0: 0.04, x1: 0.52, y0: 0.2, y1: 0.93 }
      : { x0: 0.05, x1: 0.95, y0: 0.24, y1: 0.6 };
    const rectWidth = (rect.x1 - rect.x0) * viewWidth;
    const rectHeight = (rect.y1 - rect.y0) * viewHeight;
    const scale = THREE.MathUtils.clamp(
      Math.min((rectHeight * 0.92) / SHIRT_HANG, (rectWidth * 0.9) / SHIRT_WIDTH),
      0.3,
      STAGE_MAX_SCALE,
    );
    const centerY =
      CAMERA.position.y + (CAMERA.target.y - CAMERA.position.y) * (distance / CAMERA.position.z);
    const rectCenterY = centerY + (0.5 - (rect.y0 + rect.y1) / 2) * viewHeight;
    return {
      x: CAMERA.position.x + ((rect.x0 + rect.x1) / 2 - 0.5) * viewWidth,
      y: rectCenterY + (SHIRT_HANG * scale) / 2,
      scale,
    };
  }

  // ─── Bucle ─────────────────────────────────────────────────────────────────

  private readonly tick = (now: number): void => {
    if (this.destroyed || !this.renderer) return;
    if (!this.visible) {
      this.animationFrame = null;
      return;
    }
    this.animationFrame = requestAnimationFrame(this.tick);
    const dt = Math.min((now - this.lastFrame) / 1000, 1 / 20) || 1 / 60;
    this.lastFrame = now;
    this.time += dt;
    this.clothTime.value = this.time;

    if (this.intro < 1 && this.items.length > 0) {
      this.intro = Math.min(1, this.intro + dt * this.introSpeed);
    }
    this.updateScroll(dt);
    this.updateHover(dt);
    this.updateCamera(dt);
    this.updateSelectionSpin(dt);
    this.advanceChoreography(dt);
    this.updateSwing(dt);
    this.placeItems(dt);
    this.updateOverlays();

    if (this.dim) {
      const target = this.selected ? 0.78 : 0;
      this.dim.material.opacity = damp(this.dim.material.opacity, target, 6, dt);
      this.dim.visible = this.dim.material.opacity > 0.005;
    }
    this.audio.slide(this.selected ? 0 : this.railVelocity);
    this.renderer.render(this.scene, this.camera);
  };

  private updateScroll(dt: number): void {
    if (!this.dragging && !this.selected) {
      this.scrollTarget += this.scrollVelocity * dt;
      this.scrollVelocity *= Math.exp(-3.2 * dt);
    }
    const { min, max } = this.bounds;
    const overflow =
      this.scrollTarget < min ? this.scrollTarget - min : this.scrollTarget > max ? this.scrollTarget - max : 0;
    if (overflow && !this.dragging) {
      this.scrollTarget -= overflow * (1 - Math.exp(-9 * dt));
      this.scrollVelocity *= 0.8;
    }
    // Al arrastrar más allá del borde, el riel se resiste como una goma.
    const resisted = this.scrollTarget - (this.dragging ? overflow * 0.6 : 0);
    this.scroll = damp(this.scroll, resisted, 9, dt);

    const previousX = this.rail.position.x;
    this.rail.position.x = -this.scroll;
    if (this.supports) this.supports.position.x = this.rail.position.x % 2.4;
    const velocity = (this.rail.position.x - previousX) / dt;
    this.railAcceleration = THREE.MathUtils.clamp((velocity - this.railVelocity) / dt, -40, 40);
    this.railVelocity = velocity;
  }

  private updateHover(dt: number): void {
    const pointer = this.pointer;
    if (this.intro < 1 || this.selected) {
      if (!this.selected) this.setHover(null);
      return;
    }
    if (this.keyboardHover) return;
    if (!this.dragging && pointer.inside && !pointer.touch) {
      this.setHover(this.pick());
    } else if (this.touchOnly) {
      // En táctil se presenta la remera que queda en el centro y el riel se acomoda a ella.
      const center = -this.rail.position.x;
      let closest: RackItem | null = null;
      let distance = Infinity;
      for (const item of this.activeItems()) {
        const gap = Math.abs(item.restX - center);
        if (gap < distance) {
          distance = gap;
          closest = item;
        }
      }
      this.setHover(this.dragging ? null : closest);
      if (closest && !this.dragging && Math.abs(this.scrollVelocity) < 0.25) {
        this.scrollTarget = damp(
          this.scrollTarget,
          THREE.MathUtils.clamp(closest.restX, this.bounds.min, this.bounds.max),
          5,
          dt,
        );
      }
    } else if (!pointer.inside && this.hover) {
      this.setHover(null);
    }
  }

  private updateCamera(dt: number): void {
    const follow = !this.selected && !this.reducedMotion && this.intro >= 1 && this.pointer.inside ? 1 : 0;
    this.parallax.x = damp(this.parallax.x, this.pointer.x * 0.08 * follow, 3, dt);
    this.parallax.y = damp(this.parallax.y, this.pointer.y * 0.04 * follow, 3, dt);
    this.applyCamera(this.intro);
  }

  private updateSelectionSpin(dt: number): void {
    if (!this.selected || this.dragging) return;
    if (Math.abs(this.yawVelocity) > 0.001) {
      this.userYaw += this.yawVelocity * dt;
      this.yawVelocity *= Math.exp(-2.6 * dt);
      this.emitSide();
    }
  }

  /**
   * Coordina quién sale del perchero: deslizar en paralelo es seguro para varias a la vez,
   * pero girar solo puede una, y únicamente cuando las demás están colgadas.
   */
  private advanceChoreography(dt: number): void {
    const active = this.activeItems();
    const anyTurning = (except: RackItem) =>
      this.items.some((item) => item !== except && (item.pull > RACK.turnStart || item.stage > 0));
    const allHome = (except: RackItem) => this.items.every((item) => item === except || item.pull === 0);

    // Filtros: primero se guardan las que salen, después se mueve el riel y al final aparecen las nuevas.
    const anyOut = this.items.some((item) => item.pull > 0 || item.stage > 0);
    const leaving = this.items.filter((item) => !item.active && item.presence > 0);
    if (!anyOut) {
      leaving.forEach((item) => (item.presence = approach(item.presence, 0, PRESENCE_SPEED * dt)));
    }
    const rearranging = leaving.length > 0;
    let settled = true;
    if (!rearranging) {
      for (const item of active) {
        item.baseX = damp(item.baseX, item.restX, 6, dt);
        if (Math.abs(item.baseX - item.restX) > 0.002) settled = false;
        else item.baseX = item.restX;
      }
      if (settled) {
        active.forEach((item) => (item.presence = approach(item.presence, 1, PRESENCE_SPEED * dt)));
      }
    }

    for (const item of this.items) {
      const ready = item.active && item.presence >= 1 && settled && !rearranging;
      const onStage = ready && item === this.selected;
      const wantsOut = ready && (onStage || (!this.selected && item === this.hover));

      if (!onStage) item.stage = approach(item.stage, 0, STAGE_SPEED * dt);
      else if (item.pull >= 1) item.stage = approach(item.stage, 1, STAGE_SPEED * dt);

      if (item.stage > 0) continue;
      // Si otra está girando, esta no sale; si otra se está deslizando, esta solo puede deslizarse.
      let target = 0;
      if (wantsOut && !anyTurning(item)) target = allHome(item) ? 1 : RACK.turnStart;
      item.pull = approach(item.pull, target, PULL_SPEED * dt);
    }
  }

  /** El perchero entero se balancea igual (misma aceleración) y la brisa varía suave a lo largo del riel. */
  private updateSwing(dt: number): void {
    if (this.reducedMotion) {
      this.swing = 0;
      return;
    }
    this.swingVelocity += (-30 * this.swing - 3.4 * this.swingVelocity - this.railAcceleration * 0.02) * dt;
    this.swing = THREE.MathUtils.clamp(this.swing + this.swingVelocity * dt, -0.1, 0.1);
  }

  private placeItems(dt: number): void {
    const stage = this.stagePose();
    const order = new Map(this.activeItems().map((item, index) => [item, index]));
    const out = this.items.filter((item) => item.pull > 0);
    // Casi recto hacia la cámara: el cursor permanece sobre la remera mientras esta sale.
    // El pequeño sesgo lateral conserva margen con la vecina durante el desplazamiento.
    const directionX = RACK.pullXRatio;
    const directionZ = 1;
    const spinSide = this.selected ? this.userYaw : 0;

    for (const item of this.items) {
      const index = order.get(item);
      let x = item.baseX;
      if (index !== undefined) {
        for (const other of out) {
          const otherIndex = order.get(other);
          if (other === item || otherIndex === undefined) continue;
          x += Math.sign(index - otherIndex) * RACK.spread * smoothstep(other.pull);
        }
      }

      const slide = smoothstep(item.pull / RACK.turnStart);
      const turn = smoothstep((item.pull - RACK.turnStart) / (1 - RACK.turnStart));
      x += directionX * RACK.pull * slide;
      let y = 0;
      let z = directionZ * RACK.pull * slide;
      let yaw = RACK.yaw * (1 - turn);
      let scale = 1;

      if (item.stage > 0) {
        const blend = smoothstep(item.stage);
        const worldX = this.rail.position.x + x;
        x = THREE.MathUtils.lerp(worldX, stage.x, blend) - this.rail.position.x;
        y = THREE.MathUtils.lerp(0, stage.y - RAIL_Y, blend);
        z = THREE.MathUtils.lerp(z, STAGE_Z, blend);
        scale = THREE.MathUtils.lerp(1, stage.scale, blend);
        // Solo gira cuando ya está delante de todo (ver verificación de RACK).
        const idle = this.reducedMotion ? 0 : Math.sin((this.time - this.stageSince) * 0.7) * 0.16;
        const spin = item === this.selected ? spinSide + idle : 0;
        yaw = spin * smoothstep((item.stage - 0.9) / 0.1);
      }

      item.yaw = yaw;
      const idleBreeze = this.reducedMotion
        ? 0
        : 0.022 * Math.sin(this.time * 0.7 + item.restX * 1.1) + 0.01 * Math.sin(this.time * 1.27 + item.restX * 0.6);
      const roll = (this.swing + idleBreeze) * (1 - turn);

      if (this.reducedMotion) {
        item.lagYaw = yaw;
        item.lagRoll = roll;
      } else {
        item.lagYawVelocity += ((yaw - item.lagYaw) * 70 - item.lagYawVelocity * 8) * dt;
        item.lagYaw += item.lagYawVelocity * dt;
        item.lagRollVelocity += ((roll - item.lagRoll) * 55 - item.lagRollVelocity * 6) * dt;
        item.lagRoll += item.lagRollVelocity * dt;
      }
      // La torsión saca la tela de su plano: solo se permite fuera del perchero. La flexión es en
      // el plano (segura colgada) y se apaga mientras gira, para no agrandar su ancho verificado.
      item.uniforms.uTwist.value = THREE.MathUtils.clamp(item.lagYaw - yaw, -0.6, 0.6) * turn;
      item.uniforms.uBend.value = THREE.MathUtils.clamp(item.lagRoll - roll, -0.3, 0.3) * 0.6 * (1 - turn);

      const presence = smoothstep(item.presence);
      item.pivot.visible = presence > 0.01;
      item.pivot.position.set(x, RAIL_Y + y, z);
      item.pivot.rotation.z = roll;
      item.pivot.scale.setScalar(scale * Math.max(presence, 0.0001));
      item.turn.rotation.y = yaw;
    }
    this.emitSide();
  }

  private updateOverlays(): void {
    const width = this.options.canvas.clientWidth;
    const height = this.options.canvas.clientHeight;
    const toScreen = (x: number, y: number, z: number) => {
      this.projected.set(x, y, z).project(this.camera);
      return { x: (this.projected.x * 0.5 + 0.5) * width, y: (-this.projected.y * 0.5 + 0.5) * height };
    };

    const caption = this.options.caption;
    const shown = this.hover && !this.selected && this.hover.pull > 0.85 ? this.hover : null;
    if (shown) {
      const point = toScreen(
        this.rail.position.x + shown.pivot.position.x,
        RAIL_Y - SHIRT_HANG - 0.04,
        shown.pivot.position.z,
      );
      caption.style.transform = `translate(${point.x}px, ${point.y}px) translateX(-50%)`;
      caption.style.opacity = '1';
    } else {
      caption.style.opacity = '0';
    }

    const fade = this.selected ? 0 : 1;
    for (const label of this.labels) {
      const element = this.labelElement(label);
      if (!element) continue;
      const members = this.items.filter((item) => item.active && item.group === label.key);
      const first = members[0];
      if (!first || this.intro < 1) {
        element.style.opacity = '0';
        continue;
      }
      const point = toScreen(this.rail.position.x + first.baseX - 0.12, RAIL_Y + 0.12, 0);
      const inside = point.x > -40 && point.x < width - 40;
      element.style.transform = `translate(${Math.max(12, point.x)}px, ${point.y}px) translateY(-100%)`;
      element.style.opacity = String(inside ? fade * Math.min(...members.map((item) => item.presence)) : 0);
    }
  }
}

function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/** Avanza a velocidad constante y llega exacto: los umbrales de la coreografía dependen de eso. */
function approach(current: number, target: number, step: number): number {
  if (Math.abs(target - current) <= Math.max(step, SETTLED)) return target;
  return current + Math.sign(target - current) * step;
}

function smoothstep(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
