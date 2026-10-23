import { Routes } from '@angular/router';

export const teamsRoutes: Routes = [
  {
    path: '',
    title: 'Remeras para equipos · LM Studio',
    loadComponent: () => import('./teams.component').then(m => m.TeamsComponent)
  }
];
