import { Injectable, computed, signal } from '@angular/core';
import { resolveLegacyProductId } from '../constants/legacy-products.constants';

const WISHLIST_STORAGE_KEY = 'lm-studio-wishlist';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private items = signal<string[]>(this.loadFromStorage());

  totalItems = computed(() => this.items().length);

  isInWishlist(productId: string): boolean {
    return this.items().includes(productId);
  }

  toggle(productId: string): void {
    const current = this.items();
    const next = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId];
    this.items.set(next);
    this.saveToStorage();
  }

  private loadFromStorage(): string[] {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      const ids: string[] = stored ? JSON.parse(stored) : [];
      return ids.map(resolveLegacyProductId);
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(this.items()));
    } catch (error) {
      console.error('Error saving wishlist to localStorage:', error);
    }
  }
}
