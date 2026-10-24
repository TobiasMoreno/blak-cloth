import { EnvironmentProviders, inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { PrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

let configured = false;

/**
 * Activa el tema de PrimeNG solo en las rutas que usan sus componentes (detalle y carrito).
 * Registrarlo en app.config lo sumaba (~200 kB) al JavaScript inicial de todas las páginas.
 * `providePrimeNG` no sirve acá porque usa un app initializer, que en rutas lazy no se ejecuta.
 */
export function provideRoutePrimeNG(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      if (configured) return;
      inject(PrimeNG).setConfig({ theme: { preset: Aura } });
      configured = true;
    })
  ]);
}
