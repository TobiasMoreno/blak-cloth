import { Route } from '@angular/router';
import { ManagementShellComponent } from './management-shell.component';

export const managementRoutes: Route[] = [
  {
    path: '',
    component: ManagementShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'costos' },
      {
        path: 'costos',
        title: 'Costos · Gestión BLAK',
        loadComponent: () => import('./costs.component').then((m) => m.CostsComponent),
      },
      {
        path: 'cotizador',
        title: 'Cotizador · Gestión BLAK',
        loadComponent: () => import('./quote.component').then((m) => m.QuoteComponent),
      },
    ],
  },
];
