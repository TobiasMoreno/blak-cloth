import { Routes } from '@angular/router';

export const teamsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./teams.component').then(m => m.TeamsComponent)
  }
];
