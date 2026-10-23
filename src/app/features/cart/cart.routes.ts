import { Route } from '@angular/router';
import { CartComponent } from './cart.component';

export const cartRoutes: Route[] = [
  {
    path: '',
    title: 'Carrito · LM Studio',
    component: CartComponent
  }
];
