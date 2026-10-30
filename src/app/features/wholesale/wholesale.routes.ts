import { Routes } from '@angular/router';

export const wholesaleRoutes: Routes = [
  {
    path: '',
    title: 'Precios por cantidad para revendedores · BLAK',
    loadComponent: () => import('./wholesale.component').then(m => m.WholesaleComponent)
  }
];
