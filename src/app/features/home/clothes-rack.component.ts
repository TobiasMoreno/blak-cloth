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
  untracked,
  viewChild,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';

const DRAG_THRESHOLD = 6;
const PRIORITY_IMAGES = 6;

@Component({
  selector: 'app-clothes-rack',
  imports: [RouterLink, NgOptimizedImage, CurrencyArsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Soltar fuera del perchero (antes de capturar el puntero) o cambiar de ventana también termina el gesto
  host: {
    '(document:pointerup)': 'onPointerUp()',
    '(window:blur)': 'onPointerUp()',
  },
  template: `
    <div
      class="relative text-bone"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Perchero de remeras"
    >
      <!-- Flechas a los costados para no sumar alto: el perchero vive dentro del hero -->
      <button
        type="button"
        class="rack-arrow left-2 md:left-4"
        aria-label="Remeras anteriores"
        aria-controls="rack-track"
        [disabled]="!canGoPrev()"
        (click)="prev()"
      >
        <span aria-hidden="true">←</span>
      </button>
      <button
        type="button"
        class="rack-arrow right-2 md:right-4"
        aria-label="Remeras siguientes"
        aria-controls="rack-track"
        [disabled]="!canGoNext()"
        (click)="next()"
      >
        <span aria-hidden="true">→</span>
      </button>

      <div
        #viewport
        class="rack-viewport relative overflow-hidden px-4 md:px-8"
        [class.rack-dragging]="dragging()"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp()"
        (pointercancel)="onPointerUp()"
        (lostpointercapture)="onPointerUp()"
      >
        <div
          class="rack-bar pointer-events-none absolute inset-x-0 top-3 h-2.5 rounded-full"
          aria-hidden="true"
        ></div>

        <ul
          #track
          id="rack-track"
          class="rack relative flex gap-2 md:gap-4"
          [class.rack-animate]="animate() && !dragging()"
          role="list"
          [style.transform]="'translateX(' + -offset() + 'px)'"
          (transitionend)="onTransitionEnd($event)"
        >
          @for (slide of slides(); track slide.key; let index = $index) {
            @let product = slide.product;
            <!-- Las copias del loop se pueden clickear, pero no se anuncian ni reciben Tab -->
            <li
              class="rack-item shrink-0"
              [attr.aria-hidden]="slide.isClone || null"
              (focusin)="reveal(index)"
            >
              <a
                [routerLink]="['/product', product.id]"
                class="rack-link group block w-36 rounded-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-accent md:w-52"
                draggable="false"
                [attr.tabindex]="slide.isClone ? -1 : null"
                (click)="onLinkClick($event)"
              >
                <div class="rack-swing">
                  <svg
                    class="mx-auto block h-16 w-full text-ash"
                    viewBox="0 0 200 64"
                    preserveAspectRatio="xMidYMin meet"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <!-- Gancho que abraza la barra y percha -->
                    <path d="M100 40 V24 a10 10 0 1 0 -10 -10" />
                    <path d="M100 40 L22 60 H178 Z" />
                  </svg>

                  <div class="shirt relative -mt-3 aspect-[4/5] bg-graphite">
                    <img
                      [ngSrc]="product.images[0]"
                      alt=""
                      fill
                      draggable="false"
                      sizes="(max-width: 767px) 9rem, 13rem"
                      [priority]="slide.priority"
                      class="object-cover object-[22%_center]"
                    />
                  </div>
                </div>

                <span class="rack-label mt-4 block px-1">
                  <span class="block font-display text-2xl font-black uppercase leading-none">
                    {{ product.name }}
                  </span>
                  <span class="mt-1 flex items-center justify-between text-sm text-ash">
                    <span class="tabular-nums">{{ product.price | currencyArs }}</span>
                    <span aria-hidden="true" class="text-accent">Ver ↗</span>
                  </span>
                </span>
              </a>
            </li>
          } @empty {
            <li class="h-80 w-full md:h-96" role="status" aria-label="Cargando remeras"></li>
          }
        </ul>
      </div>

      @if (products().length > 0) {
        <p class="sr-only" aria-live="polite">{{ positionLabel() }}</p>
      }
    </div>
  `,
  styles: `
    .rack-viewport {
      touch-action: pan-y;
      cursor: grab;
    }

    .rack-dragging {
      cursor: grabbing;
      user-select: none;
    }

    /* Mientras se arrastra no se abre ni se resalta ninguna remera */
    .rack-dragging .rack-link {
      pointer-events: none;
    }

    .rack-animate {
      transition: transform 600ms var(--ease-expo);
    }

    /* A la altura del pecho de las remeras */
    .rack-arrow {
      position: absolute;
      top: 8.5rem;
      z-index: 10;
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border: 2px solid var(--color-bone);
      background-color: rgb(11 11 11 / 0.75);
      font-size: 1.25rem;
      transform: translateY(-50%);
      transition: background-color 200ms ease, color 200ms ease, opacity 200ms ease;
    }

    @media (min-width: 768px) {
      .rack-arrow {
        top: 11rem;
        width: 3rem;
        height: 3rem;
      }
    }

    .rack-arrow:not(:disabled):hover {
      background-color: var(--color-bone);
      color: var(--color-ink);
    }

    .rack-arrow:focus-visible {
      outline: 3px solid var(--color-accent);
      outline-offset: 3px;
    }

    .rack-arrow:disabled {
      opacity: 0.3;
    }

    .rack-bar {
      background: linear-gradient(180deg, #d0d0ca 0%, #7a7a74 55%, #3a3a36 100%);
      box-shadow: 0 6px 14px rgb(0 0 0 / 0.6);
    }

    /* Recorta la foto con forma de remera para que parezca colgada */
    .shirt {
      clip-path: polygon(
        33% 0%, 41% 5%, 50% 8%, 59% 5%, 67% 0%,
        100% 13%, 92% 33%, 80% 28%, 80% 100%,
        20% 100%, 20% 28%, 8% 33%, 0% 13%
      );
      filter: drop-shadow(0 18px 18px rgb(0 0 0 / 0.5));
    }

    .rack-swing {
      transform-origin: 50% 0.75rem;
      transition: transform 400ms var(--ease-out);
    }

    .rack-item {
      transition: opacity 300ms ease;
    }

    .rack-label {
      transition: opacity 250ms ease, transform 300ms var(--ease-out);
    }

    /* Con mouse: el nombre aparece al pasar por encima; en táctil queda siempre visible */
    @media (hover: hover) {
      .rack-label {
        opacity: 0;
        transform: translateY(-0.5rem);
      }

      .rack-link:hover .rack-label,
      .rack-link:focus-visible .rack-label {
        opacity: 1;
        transform: none;
      }

      .rack:has(.rack-link:hover) .rack-item:not(:has(.rack-link:hover)) {
        opacity: 0.4;
      }
    }

    .rack-link:hover .rack-swing,
    .rack-link:focus-visible .rack-swing {
      transform: scale(1.04);
    }

    @media (prefers-reduced-motion: no-preference) {
      .rack-link:hover .rack-swing,
      .rack-link:focus-visible .rack-swing,
      .rack-link:active .rack-swing {
        animation: rack-swing 900ms var(--ease-out);
      }
    }

    @keyframes rack-swing {
      0% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(5deg) scale(1.04); }
      50% { transform: rotate(-3deg) scale(1.04); }
      75% { transform: rotate(1.5deg) scale(1.04); }
      100% { transform: rotate(0deg) scale(1.04); }
    }
  `,
})
export class ClothesRackComponent {
  products = inject(ProductService).products;

  private viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private track = viewChild.required<ElementRef<HTMLElement>>('track');

  /** Índice (dentro de slides) de la primera remera visible. */
  private position = signal(0);
  // Se miden en pantalla porque el ancho de cada remera cambia con el breakpoint
  private step = signal(0);
  private visibleCount = signal(1);
  animate = signal(true);
  dragging = signal(false);
  private dragDelta = signal(0);

  private pointerStartX: number | null = null;
  private pointerId: number | null = null;
  // Cuántas remeras entran en la primera pantalla; se fija al crear porque priority no puede cambiar después
  private readonly priorityCount =
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches ? PRIORITY_IMAGES : 3;
  private swiped = false;

  private count = computed(() => this.products().length);
  // Con una sola remera no hay nada que girar
  private loops = computed(() => this.count() > 1);

  /**
   * Con loop se renderizan varias copias seguidas y la posición vive en la segunda (la "real");
   * así siempre hay remeras a ambos lados y el salto de vuelta no se nota. En pantallas donde
   * entran todas, se suman copias para que la barra nunca quede vacía a la derecha.
   */
  slides = computed(() => {
    const products = this.products();
    const count = Math.max(1, this.count());
    const copyCount = 2 + Math.ceil(this.visibleCount() / count);
    const copies = this.loops() ? Array.from({ length: copyCount }, (_, copy) => copy) : [1];
    return copies.flatMap(copy =>
      products.map((product, index) => ({
        product,
        key: `${copy}-${product.id}`,
        isClone: copy !== 1,
        // Están en la primera pantalla: las que se ven al abrir cargan primero
        priority: copy === 1 && index < this.priorityCount,
      }))
    );
  });

  private current = computed(() =>
    this.loops()
      ? this.position()
      : Math.min(this.position(), Math.max(0, this.count() - this.visibleCount()))
  );

  private lastPosition = computed(() => Math.max(0, this.slides().length - this.visibleCount()));

  offset = computed(() => this.current() * this.step() - this.dragDelta());
  canGoPrev = computed(() => this.loops() || this.current() > 0);
  canGoNext = computed(() => this.loops() || this.current() < this.count() - this.visibleCount());

  positionLabel = computed(() => {
    const total = this.count();
    const first = (this.current() % total) + 1;
    return `Mostrando desde la remera ${first} de ${total}`;
  });

  constructor() {
    // Al activarse el loop, arranca en la copia del medio
    effect(() => {
      if (this.loops()) {
        const middle = this.count();
        untracked(() => this.jumpTo(middle));
      }
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(this.viewport().nativeElement);
      observer.observe(this.track().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  // De a una remera por vez, como empujando perchas
  prev(): void {
    // Con clicks muy rápidos, frena antes de quedarse sin copias a la izquierda
    if (this.current() > 0) {
      this.position.set(this.current() - 1);
    }
  }

  next(): void {
    if (this.current() < this.lastPosition()) {
      this.position.set(this.current() + 1);
    }
  }

  /** Al llegar con Tab a una remera oculta, el carrusel se mueve para mostrarla. */
  reveal(itemIndex: number): void {
    const current = this.current();
    if (itemIndex < current) {
      this.position.set(itemIndex);
    } else if (itemIndex >= current + this.visibleCount()) {
      this.position.set(itemIndex - this.visibleCount() + 1);
    }
  }

  /** Terminado el deslizamiento, vuelve sin animación a la copia del medio. */
  onTransitionEnd(event: TransitionEvent): void {
    // Las remeras también animan transform y el evento burbujea hasta la lista
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
    if (!this.loops()) return;

    const total = this.count();
    const position = this.position();
    if (position < total) {
      this.jumpTo(position + total);
    } else if (position >= total * 2) {
      this.jumpTo(position - total);
    }
  }

  private jumpTo(position: number): void {
    this.animate.set(false);
    this.position.set(position);
    // Dos frames: uno para pintar la nueva posición y otro para devolver la transición
    requestAnimationFrame(() => requestAnimationFrame(() => this.animate.set(true)));
  }

  onPointerDown(event: PointerEvent): void {
    // Un segundo dedo a mitad del gesto no le roba el arrastre al primero
    if (event.button !== 0 || this.pointerId !== null) return;
    this.pointerId = event.pointerId;
    this.pointerStartX = event.clientX;
    this.swiped = false;
  }

  /** El perchero sigue al puntero mientras se arrastra. */
  onPointerMove(event: PointerEvent): void {
    if (this.pointerStartX === null || event.pointerId !== this.pointerId) return;
    // Mouse soltado fuera del perchero: sin botón apretado ya no hay arrastre
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      this.onPointerUp();
      return;
    }
    const delta = event.clientX - this.pointerStartX;

    if (!this.dragging()) {
      // Hasta superar el umbral es un click común sobre la remera
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      this.dragging.set(true);
      this.swiped = true;
      this.recenter();
      // Se captura recién acá: capturar en pointerdown rompería el click de los links
      this.viewport().nativeElement.setPointerCapture(event.pointerId);
    }
    this.dragDelta.set(delta);
  }

  /** Al soltar, se acomoda en la remera más cercana. */
  onPointerUp(): void {
    this.pointerStartX = null;
    this.pointerId = null;
    if (!this.dragging()) return;

    const moved = this.step() > 0 ? Math.round(-this.dragDelta() / this.step()) : 0;
    const target = Math.min(this.lastPosition(), Math.max(0, this.current() + moved));
    this.dragging.set(false);
    this.dragDelta.set(0);
    this.position.set(target);
  }

  /** Lleva la posición a la copia del medio para tener margen de arrastre a ambos lados. */
  private recenter(): void {
    if (!this.loops()) return;
    const total = this.count();
    const position = this.position();
    if (position < total) {
      this.position.set(position + total);
    } else if (position >= total * 2) {
      this.position.set(position - total);
    }
  }

  /** Un arrastre no debe abrir la remera sobre la que terminó el gesto. */
  onLinkClick(event: MouseEvent): void {
    if (this.swiped) {
      event.preventDefault();
      this.swiped = false;
    }
  }

  private measure(): void {
    const items = this.track().nativeElement.children;
    if (items.length === 0) return;

    const first = items[0] as HTMLElement;
    const second = items[1] as HTMLElement | undefined;
    const step = second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    const viewport = this.viewport().nativeElement;
    const style = getComputedStyle(viewport);
    const available =
      viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);

    this.step.set(step);
    // El último ítem no lleva gap a la derecha, por eso se suma uno al ancho disponible
    this.visibleCount.set(Math.max(1, Math.floor((available + step - first.offsetWidth) / step)));
  }
}
