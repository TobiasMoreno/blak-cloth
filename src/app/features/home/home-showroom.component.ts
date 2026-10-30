import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartItem } from '../../core/models/cart-item.model';
import { Product, ProductSize } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { readStorage, writeStorage } from '../../core/storage/local-storage';
import { ToastService } from '../../shared/components/toast/toast.service';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';
import { HomeShowroomScene, RackEntry, ShowroomSide } from './home-showroom-scene';

type ShowroomFilter = 'all' | 'black' | 'white' | 'color';

interface FilterOption {
  value: ShowroomFilter;
  label: string;
}

const GROUP_ORDER = ['Negras', 'Blancas', 'Color'];
const RACK_SIDE_STORAGE_KEY = 'blak-rack-side';
const SIZE_ORDER: ProductSize[] = ['S', 'M', 'L', 'XL'];

@Component({
  selector: 'app-home-showroom',
  imports: [RouterLink, NgOptimizedImage, CurrencyArsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-0',
    '(document:keydown.escape)': 'deselect()',
  },
  templateUrl: './home-showroom.component.html',
  styleUrl: './home-showroom.component.css',
})
export class HomeShowroomComponent {
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('rackCanvas');
  private stage = viewChild.required<ElementRef<HTMLElement>>('rackStage');
  private labelLayer = viewChild.required<ElementRef<HTMLElement>>('labelLayer');
  private caption = viewChild.required<ElementRef<HTMLElement>>('caption');
  private scene = signal<HomeShowroomScene | null>(null);

  products = this.productService.products;
  activeFilter = signal<ShowroomFilter>('all');
  hoveredId = signal<string | null>(null);
  selectedId = signal<string | null>(null);
  selectedSide = signal<ShowroomSide>('design');
  /** Lado que muestra el perchero (y con el que llega cada remera al escenario); se recuerda. */
  rackSide = signal<ShowroomSide>(readStorage(RACK_SIDE_STORAGE_KEY) === 'front' ? 'front' : 'design');
  sceneReady = signal(false);
  sceneFailed = signal(false);
  soundOn = signal(false);
  /** La indicación táctil se va con el primer toque en cada modo (perchero y escenario). */
  rackHintSeen = signal(false);
  stageHintSeen = signal(false);

  readonly filters: FilterOption[] = [
    { value: 'all', label: 'Todas' },
    { value: 'black', label: 'Negras' },
    { value: 'white', label: 'Blancas' },
    { value: 'color', label: 'Color' },
  ];

  /** Todas las remeras, agrupadas como cuelgan en el perchero. */
  entries = computed<RackEntry[]>(() =>
    this.products()
      .map((product) => ({ product, group: groupOf(product) }))
      .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)),
  );
  groups = computed(() =>
    GROUP_ORDER.filter((group) => this.entries().some((entry) => entry.group === group)),
  );
  visibleProducts = computed(() => {
    const filter = this.activeFilter();
    return this.entries()
      .map((entry) => entry.product)
      .filter((product) => matchesFilter(product, filter));
  });
  selectedProduct = computed(() => this.findVisible(this.selectedId()));
  hoveredProduct = computed(() => this.findVisible(this.hoveredId()));
  selectedPosition = computed(() => {
    const id = this.selectedId();
    return id ? this.visibleProducts().findIndex((product) => product.id === id) : -1;
  });
  canPrevious = computed(() => this.selectedPosition() > 0);
  canNext = computed(() => {
    const index = this.selectedPosition();
    return index >= 0 && index < this.visibleProducts().length - 1;
  });
  touchHint = computed(() => {
    if (!this.sceneReady()) return null;
    if (this.selectedId()) {
      return this.stageHintSeen() ? null : 'Arrastrá para girarla · Tocala para darla vuelta';
    }
    return this.rackHintSeen() ? null : 'Deslizá el perchero · Tocá una remera';
  });
  positionLabel = computed(
    () => `${this.selectedPosition() + 1} de ${this.visibleProducts().length}`,
  );
  announcement = computed(() => {
    const selected = this.selectedProduct();
    if (selected) {
      const side = this.selectedSide() === 'design' ? 'el dorso' : 'el frente';
      return `${selected.name} en el escenario, mostrando ${side}.`;
    }
    const hovered = this.hoveredProduct();
    if (!hovered) return '';
    const index = this.visibleProducts().indexOf(hovered);
    return `${hovered.name}, ${index + 1} de ${this.visibleProducts().length}. Enter para verla.`;
  });

  /** Compra desde la ficha: si hay un único color o talle disponible, queda elegido. */
  selectedColor = linkedSignal<string | null>(() => {
    const colors = this.selectedProduct()?.colors ?? [];
    return colors.length === 1 ? colors[0] : null;
  });
  sizeOptions = computed(() => {
    const color = this.selectedColor();
    const variants = (this.selectedProduct()?.variants ?? []).filter(
      (variant) => !color || variant.color === color,
    );
    return SIZE_ORDER.filter((size) => variants.some((variant) => variant.size === size)).map(
      (size) => ({
        size,
        available: variants.some((variant) => variant.size === size && variant.available),
      }),
    );
  });
  selectedSize = linkedSignal<ProductSize[], ProductSize | null>({
    source: () =>
      this.sizeOptions()
        .filter((option) => option.available)
        .map((option) => option.size),
    computation: (available, previous) => {
      if (previous?.value && available.includes(previous.value)) return previous.value;
      return available.length === 1 ? available[0] : null;
    },
  });
  isSoldOut = computed(() => (this.selectedProduct()?.colors.length ?? 0) === 0);
  reachedMax = computed(() => {
    const product = this.selectedProduct();
    const size = this.selectedSize();
    const color = this.selectedColor();
    if (!product || !size || !color) return false;
    return (
      this.cartService.getItemQuantity(product.id, size, color) >=
      this.cartService.getMaxQuantity()
    );
  });
  showSelectionError = linkedSignal(() => {
    this.selectedProduct();
    return false;
  });

  constructor() {
    effect(() => {
      const scene = this.scene();
      const entries = this.entries();
      if (!scene || entries.length === 0) return;
      this.sceneReady.set(false);
      void scene.setEntries(entries);
    });

    effect(() => {
      const scene = this.scene();
      const ids = this.visibleProducts().map((product) => product.id);
      if (!scene || !this.sceneReady()) return;
      scene.setVisible(ids);
    });

    afterNextRender(() => {
      const scene = new HomeShowroomScene({
        canvas: this.canvas().nativeElement,
        container: this.stage().nativeElement,
        labelLayer: this.labelLayer().nativeElement,
        caption: this.caption().nativeElement,
        onFailure: () => this.sceneFailed.set(true),
        onReady: () => this.sceneReady.set(true),
        onHoverChange: (id) => this.hoveredId.set(id),
        onSelectionChange: (id) => this.selectedId.set(id),
        onSideChange: (side) => this.selectedSide.set(side),
      });
      scene.setRackSide(this.rackSide(), true);
      this.scene.set(scene);
      scene.initialize();
      this.destroyRef.onDestroy(() => scene.destroy());
    });
  }

  setFilter(filter: ShowroomFilter): void {
    if (this.activeFilter() === filter) return;
    this.selectedId.set(null);
    this.hoveredId.set(null);
    this.activeFilter.set(filter);
  }

  filterCount(filter: ShowroomFilter): number {
    return this.products().filter((product) => matchesFilter(product, filter)).length;
  }

  select(id: string): void {
    this.scene()?.select(id);
  }

  deselect(): void {
    if (this.selectedId()) this.scene()?.select(null);
  }

  previous(): void {
    this.scene()?.step(-1);
  }

  next(): void {
    this.scene()?.step(1);
  }

  selectColor(color: string): void {
    this.selectedColor.set(color);
    this.showSelectionError.set(false);
  }

  selectSize(size: ProductSize): void {
    this.selectedSize.set(size);
    this.showSelectionError.set(false);
  }

  addToCart(): void {
    const product = this.selectedProduct();
    const size = this.selectedSize();
    const color = this.selectedColor();
    if (!product || !size || !color) {
      this.showSelectionError.set(true);
      return;
    }
    if (this.reachedMax()) return;

    const item: CartItem = {
      productId: product.id,
      productName: product.name,
      price: product.price,
      size,
      color,
      image: product.images[0],
      quantity: 1,
    };
    this.cartService.addItem(item);
    this.toastService.show('Agregado al carrito', `${product.name} · Talle ${size} · ${color}`, {
      label: 'Ver carrito',
      link: '/cart',
    });
  }

  showSide(side: ShowroomSide): void {
    this.scene()?.showSide(side);
  }

  onCanvasPointerDown(): void {
    (this.selectedId() ? this.stageHintSeen : this.rackHintSeen).set(true);
  }

  setRackSide(side: ShowroomSide): void {
    this.rackSide.set(side);
    writeStorage(RACK_SIDE_STORAGE_KEY, side);
    this.scene()?.setRackSide(side);
  }

  toggleSound(): void {
    const enabled = !this.soundOn();
    this.soundOn.set(enabled);
    this.scene()?.setSound(enabled);
  }

  onRackKeydown(event: KeyboardEvent): void {
    const scene = this.scene();
    if (!scene) return;
    switch (event.key) {
      case 'ArrowRight':
        scene.step(1);
        break;
      case 'ArrowLeft':
        scene.step(-1);
        break;
      case 'Enter':
      case ' ':
        if (this.selectedId()) scene.flip();
        else scene.openHovered();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private findVisible(id: string | null): Product | null {
    return id ? (this.visibleProducts().find((product) => product.id === id) ?? null) : null;
  }
}

function groupOf(product: Product): string {
  const color = (product.colors[0] ?? '').toLocaleLowerCase('es');
  if (color === 'negro') return 'Negras';
  if (color === 'blanco') return 'Blancas';
  return 'Color';
}

function matchesFilter(product: Product, filter: ShowroomFilter): boolean {
  if (filter === 'all') return true;
  const colors = product.colors.map((color) => color.toLocaleLowerCase('es'));
  if (filter === 'black') return colors.includes('negro');
  if (filter === 'white') return colors.includes('blanco');
  return colors.some((color) => color !== 'negro' && color !== 'blanco');
}
