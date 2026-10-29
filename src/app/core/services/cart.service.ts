import { inject, Injectable, signal, computed } from '@angular/core';
import { CartItem } from '../models/cart-item.model';
import { LEGACY_PRODUCT_IDS } from '../constants/legacy-products.constants';
import { readStorage, writeStorage } from '../storage/local-storage';

const CART_STORAGE_KEY = 'blak-cart';
const LEGACY_CART_STORAGE_KEY = 'lm-studio-cart';
const MAX_QUANTITY = 5;

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = signal<CartItem[]>(this.loadCartFromStorage());

  // Computed signals
  totalItems = computed(() => 
    this.cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );

  totalPrice = computed(() =>
    this.cartItems().reduce((sum, item) => sum + (item.price * item.quantity), 0)
  );

  isEmpty = computed(() => this.cartItems().length === 0);

  constructor() {
    // Sincronizar con localStorage cuando cambie el carrito
    this.cartItems.set(this.loadCartFromStorage());
  }

  getCartItems() {
    return this.cartItems.asReadonly();
  }

  getItemQuantity(productId: string, size: string, color: string): number {
    const currentItems = this.cartItems();
    const existingItem = currentItems.find(
      item => 
        item.productId === productId &&
        item.size === size &&
        item.color === color
    );
    return existingItem ? existingItem.quantity : 0;
  }

  getMaxQuantity(): number {
    return MAX_QUANTITY;
  }

  addItem(item: CartItem): void {
    const currentItems = this.cartItems();
    
    // Buscar si ya existe el mismo producto con mismo talle y color
    const existingIndex = currentItems.findIndex(
      existing => 
        existing.productId === item.productId &&
        existing.size === item.size &&
        existing.color === item.color
    );

    if (existingIndex >= 0) {
      // Si existe, aumentar cantidad pero respetar el máximo
      const updatedItems = [...currentItems];
      const existingItem = updatedItems[existingIndex];
      const newQuantity = existingItem.quantity + item.quantity;
      const finalQuantity = Math.min(newQuantity, MAX_QUANTITY);
      
      updatedItems[existingIndex] = {
        ...existingItem,
        quantity: finalQuantity
      };
      
      this.cartItems.set(updatedItems);
    } else {
      // Si no existe, agregar nuevo item (también respetar máximo)
      const newItem = {
        ...item,
        quantity: Math.min(item.quantity, MAX_QUANTITY)
      };
      this.cartItems.set([...currentItems, newItem]);
    }

    this.saveCartToStorage();
  }

  updateQuantity(productId: string, size: string, color: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId, size, color);
      return;
    }

    // Respetar el límite máximo
    const finalQuantity = Math.min(quantity, MAX_QUANTITY);

    const currentItems = this.cartItems();
    const updatedItems = currentItems.map(item =>
      item.productId === productId && item.size === size && item.color === color
        ? { ...item, quantity: finalQuantity }
        : item
    );
    
    this.cartItems.set(updatedItems);
    this.saveCartToStorage();
  }

  removeItem(productId: string, size: string, color: string): void {
    const currentItems = this.cartItems();
    const updatedItems = currentItems.filter(
      item => !(item.productId === productId && item.size === size && item.color === color)
    );
    
    this.cartItems.set(updatedItems);
    this.saveCartToStorage();
  }

  /** Vuelve a poner una prenda quitada en su lugar ("Deshacer"). */
  restoreItem(item: CartItem, index: number): void {
    const updatedItems = [...this.cartItems()];
    updatedItems.splice(Math.min(index, updatedItems.length), 0, item);
    this.cartItems.set(updatedItems);
    this.saveCartToStorage();
  }

  clearCart(): void {
    this.cartItems.set([]);
    this.saveCartToStorage();
  }

  private loadCartFromStorage(): CartItem[] {
    try {
      const stored = readStorage(CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY);
      const items: CartItem[] = stored ? JSON.parse(stored) : [];
      // Carritos guardados antes del catálogo con slugs: actualizar ID y foto
      return items.map(item => {
        const slug = LEGACY_PRODUCT_IDS[item.productId];
        return slug ? { ...item, productId: slug, image: `products/${slug}/mockup.jpeg` } : item;
      });
    } catch {
      return [];
    }
  }

  private saveCartToStorage(): void {
    writeStorage(CART_STORAGE_KEY, JSON.stringify(this.cartItems()));
  }
}
