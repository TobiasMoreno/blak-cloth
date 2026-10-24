import { Route } from '@angular/router';
import { ProductDetailComponent } from './product-detail.component';

export const productDetailRoutes: Route[] = [
  {
    path: ':id',
    title: 'Remera · BLAK CLOTH',
    component: ProductDetailComponent
  }
];
