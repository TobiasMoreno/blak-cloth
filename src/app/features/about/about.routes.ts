import { Route } from '@angular/router';
import { AboutComponent } from './about.component';

export const aboutRoutes: Route[] = [
  {
    path: '',
    title: 'El estudio · LM Studio',
    component: AboutComponent
  }
];
