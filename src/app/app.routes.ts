import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes').then(m => m.homeRoutes)
  },
  {
    path: 'products',
    loadChildren: () => import('./features/products/products.routes').then(m => m.productsRoutes)
  },
  {
    path: 'equipos',
    loadChildren: () => import('./features/teams/teams.routes').then(m => m.teamsRoutes)
  },
  {
    path: 'product',
    loadChildren: () => import('./features/product-detail/product-detail.routes').then(m => m.productDetailRoutes)
  },
  {
    path: 'cart',
    loadChildren: () => import('./features/cart/cart.routes').then(m => m.cartRoutes)
  },
  {
    path: 'about',
    loadChildren: () => import('./features/about/about.routes').then(m => m.aboutRoutes)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
