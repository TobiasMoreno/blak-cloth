import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { CostManagementStore } from '../../core/services/cost-management.store';
import { ManagementShellComponent, UNSAVED_CHANGES_MESSAGE } from './management-shell.component';

export const managementRoutes: Route[] = [
  {
    path: '',
    component: ManagementShellComponent,
    // Entre Costos y Cotizador no hace falta: comparten el mismo store
    canDeactivate: [() => !inject(CostManagementStore).isDirty() || confirm(UNSAVED_CHANGES_MESSAGE)],
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
      {
        path: 'proveedores',
        title: 'Proveedores · Gestión BLAK',
        loadComponent: () => import('./suppliers.component').then((m) => m.SuppliersComponent),
      },
    ],
  },
];
