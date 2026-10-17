export type ProductStatus = 'active' | 'inactive';

export interface Product {
  // 1. Product Management Fields
  id: string; // Product ID: Unique product identifier (e.g. PRD-1001)
  name: string; // Product Name: Name of the product
  sku?: string; // Product tracking code (optional)
  category: string; // Category: Product classification
  description: string; // Description: Product details
  costPrice: number; // Cost Price: Purchase or production cost
  price: number; // Selling Price: Price offered to customers (kept as price for app compatibility)
  sellingPrice?: number; // Optional alias for Selling Price
  supplier: string; // Supplier: Source of the product
  status: ProductStatus; // Status: Active or inactive
  image: string; // Product Image: Image of the product

  // Storefront & reviews compatibility fields
  rating?: number;
  reviewsCount?: number;
  stock?: number;
  freshness?: string;
  tags?: string[];
  isFeatured?: boolean;
  quantitySold?: number;
  soldCount?: number;
}

export type Category = 
  | 'All Blooms'
  | 'Mixed flowers'
  | 'Rose themed flowers'
  | 'Customized Flowers'
  | 'Sunflower Themed flowers'
  | 'Satin Artificial Flowers'
  | 'Fuzzy wire Artificial Flowers'
  | 'Dried Artificial Flowers';
