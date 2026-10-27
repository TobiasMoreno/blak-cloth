import { Routes } from '@angular/router';

export const teamsRoutes: Routes = [
  {
    path: '',
    title: 'Remeras de algodón para equipos · BLAK',
    loadComponent: () => import('./teams.component').then(m => m.TeamsComponent)
  }
];
