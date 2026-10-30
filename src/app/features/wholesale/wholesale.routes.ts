import { Routes } from '@angular/router';

export const wholesaleRoutes: Routes = [
  {
    path: '',
    title: 'Remeras por mayor · Precios por cantidad · BLAK',
    loadComponent: () => import('./wholesale.component').then(m => m.WholesaleComponent)
  }
];
