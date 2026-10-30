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
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../core/models/product.model';
import { ProductService } from '../../core/services/product.service';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';
import { HomeShowroomScene, RackEntry, ShowroomSide } from './home-showroom-scene';

type ShowroomFilter = 'all' | 'black' | 'white' | 'color';

interface FilterOption {
  value: ShowroomFilter;
  label: string;
}

const GROUP_ORDER = ['Negras', 'Blancas', 'Color'];

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
  selectedSide = signal<ShowroomSide>('front');
  /** Lado que muestra el perchero (y con el que llega cada remera al escenario). */
  rackSide = signal<ShowroomSide>('front');
  sceneReady = signal(false);
  sceneFailed = signal(false);
  soundOn = signal(false);

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

  showSide(side: ShowroomSide): void {
    this.scene()?.showSide(side);
  }

  setRackSide(side: ShowroomSide): void {
    this.rackSide.set(side);
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
