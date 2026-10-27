import { Route } from '@angular/router';
import { provideRoutePrimeNG } from '../../core/primeng/provide-route-primeng';
import { CartComponent } from './cart.component';

export const cartRoutes: Route[] = [
  {
    path: '',
    title: 'Carrito · BLAK',
    component: CartComponent,
    providers: [provideRoutePrimeNG()]
  }
];
