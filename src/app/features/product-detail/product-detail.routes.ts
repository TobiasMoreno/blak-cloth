import { Route } from '@angular/router';
import { ProductDetailComponent } from './product-detail.component';

export const productDetailRoutes: Route[] = [
  {
    path: ':id',
    title: 'Remera · LM Studio',
    component: ProductDetailComponent
  }
];
