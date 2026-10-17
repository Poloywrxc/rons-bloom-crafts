export interface SalesItem {
  id: string;
  orderId?: string;
  productId?: string;
  productName: string;
  category: string;
  image?: string;
  quantitySold: number;
  price: number; // Selling price per unit
  sales: number; // Formula: quantitySold * price
  dateRecorded?: string;
  sku?: string;
}

export type CurrencyMode = 'PHP';

