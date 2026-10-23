import { Route } from '@angular/router';
import { ProductsComponent } from './products.component';

export const productsRoutes: Route[] = [
  {
    path: '',
    title: 'Colección · LM Studio',
    component: ProductsComponent
  }
];
