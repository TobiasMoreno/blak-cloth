import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Antes las URLs inexistentes llevaban al inicio: para Google eso es un "soft 404". */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-[70svh] items-center bg-ink px-4 text-bone md:px-8">
      <div>
        <h1 class="max-w-[10ch] text-7xl font-black uppercase leading-[0.86] md:text-9xl">Página no encontrada</h1>
        <p class="mt-6 max-w-[40ch] text-lg leading-relaxed text-smoke">
          El link está roto o la página ya no existe.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a routerLink="/products" class="on-accent inline-flex min-h-12 items-center bg-accent px-6 font-semibold text-white">
            Ver la colección
          </a>
          <a routerLink="/" class="inline-flex min-h-12 items-center border-2 border-bone px-6 font-semibold">
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  `
})
export class NotFoundComponent {}
