import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CostManagementStore } from '../../core/services/cost-management.store';

export const UNSAVED_CHANGES_MESSAGE =
  'Hay cambios que todavía no guardaste en Firebase. Si salís ahora, se pierden. ¿Salir igual?';
export const RELOAD_CONFLICT_MESSAGE =
  'Recargar Firebase descarta los cambios que tenés abiertos. ¿Querés continuar?';

@Component({
  selector: 'app-management-shell',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './management-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeMenu()',
    '(window:beforeunload)': 'warnUnsaved($event)',
  },
})
export class ManagementShellComponent {
  readonly store = inject(CostManagementStore);
  readonly busy = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly errorMessage = computed(
    () => this.store.errorMessage() ?? this.store.management.errorMessage(),
  );
  readonly saveLabel = computed(() => {
    switch (this.store.saveState()) {
      case 'dirty':
        return 'Cambios sin guardar';
      case 'saving':
        return 'Guardando en Firebase';
      case 'saved':
        return 'Guardado en Firebase';
      case 'conflict':
        return 'Hay cambios más recientes';
      case 'error':
        return 'Error al guardar';
      default:
        return 'Sin cambios';
    }
  });

  constructor() {
    void this.store.initialize();
  }

  async connect(): Promise<void> {
    await this.run(() => this.store.connect());
  }

  async createWorkspace(): Promise<void> {
    await this.run(() => this.store.createWorkspace());
  }

  async importWorkspace(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    await this.run(async () => {
      await this.store.importWorkspaceJson(await file.text());
    });
  }

  async save(): Promise<void> {
    await this.run(() => this.store.save());
  }

  async reload(): Promise<void> {
    if (this.store.saveState() === 'conflict' && !confirm(RELOAD_CONFLICT_MESSAGE)) return;
    await this.run(() => this.store.reload());
  }

  async disconnect(): Promise<void> {
    if (this.store.isDirty() && !confirm(UNSAVED_CHANGES_MESSAGE)) return;
    await this.run(() => this.store.disconnect());
  }

  /** Recargar o cerrar la pestaña con cambios sin guardar pide confirmación al navegador. */
  warnUnsaved(event: BeforeUnloadEvent): void {
    if (this.store.isDirty()) event.preventDefault();
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
