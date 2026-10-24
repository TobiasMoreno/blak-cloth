import { Route } from '@angular/router';
import { provideRoutePrimeNG } from '../../core/primeng/provide-route-primeng';
import { ProductDetailComponent } from './product-detail.component';

export const productDetailRoutes: Route[] = [
  {
    path: ':id',
    title: 'Remera · BLAK CLOTH',
    component: ProductDetailComponent,
    providers: [provideRoutePrimeNG()]
  }
];
