import { Route } from '@angular/router';
import { ProductsComponent } from './products.component';

export const productsRoutes: Route[] = [
  {
    path: '',
    title: 'Remeras estampadas de autor · Colección BLAK',
    component: ProductsComponent
  }
];
