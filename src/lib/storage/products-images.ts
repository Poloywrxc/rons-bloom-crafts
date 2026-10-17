import { Product } from '@/types/product';
import { INITIAL_PRODUCTS } from '@/lib/constants';

let productsMemory: Product[] = [...INITIAL_PRODUCTS];

export function getStoredProducts(): Product[] {
  return productsMemory;
}

export function getStoredProductById(id: string): Product | undefined {
  return productsMemory.find(p => p.id === id);
}

export function addStoredProduct(product: Product): void {
  productsMemory = [product, ...productsMemory];
}

export function removeStoredProduct(id: string): void {
  productsMemory = productsMemory.filter(p => p.id !== id);
}

export function updateStoredProduct(id: string, updates: Partial<Product>): Product | null {
  const index = productsMemory.findIndex(p => p.id === id);
  if (index === -1) return null;
  productsMemory[index] = { ...productsMemory[index], ...updates };
  return productsMemory[index];
}
