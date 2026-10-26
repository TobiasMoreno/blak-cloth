import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import {
  RouterOutlet,
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private router = inject(Router);
  isNavigating = signal(false);
  isManagementRoute = signal(this.router.url.startsWith('/gestion'));

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isNavigating.set(true);
        this.isManagementRoute.set(event.url.startsWith('/gestion'));
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isNavigating.set(false);
        if (event instanceof NavigationEnd) {
          this.isManagementRoute.set(event.urlAfterRedirects.startsWith('/gestion'));
        }
      }
    });
  }
}
