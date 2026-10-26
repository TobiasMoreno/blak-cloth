import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CostManagementStore } from '../../core/services/cost-management.store';

@Component({
  selector: 'app-management-shell',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './management-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class ManagementShellComponent {
  readonly store = inject(CostManagementStore);
  readonly busy = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly errorMessage = computed(
    () => this.store.errorMessage() ?? this.store.drive.errorMessage(),
  );
  readonly saveLabel = computed(() => {
    switch (this.store.saveState()) {
      case 'dirty':
        return 'Cambios sin guardar';
      case 'saving':
        return 'Guardando en Drive';
      case 'saved':
        return 'Guardado en Drive';
      case 'conflict':
        return 'Hay cambios más recientes';
      case 'error':
        return 'Error al guardar';
      default:
        return 'Sin cambios';
    }
  });

  async connect(): Promise<void> {
    await this.run(() => this.store.connect());
  }

  async createWorkspace(): Promise<void> {
    await this.run(() => this.store.createWorkspace());
  }

  async chooseWorkspace(): Promise<void> {
    await this.run(() => this.store.chooseSharedWorkspace());
  }

  async save(): Promise<void> {
    await this.run(() => this.store.save());
  }

  async reload(): Promise<void> {
    await this.run(() => this.store.reload());
  }

  toggleMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch {
      // Los servicios exponen el mensaje contextual en la pantalla.
    } finally {
      this.busy.set(false);
    }
  }
}
