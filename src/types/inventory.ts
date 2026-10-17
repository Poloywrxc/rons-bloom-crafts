export interface InventoryItem {
  // 2. Inventory Management Fields
  id: string; // Inventory ID: Unique inventory record (e.g. INV-8001)
  productId: string; // Product ID: Links to the product
  quantityInStock: number; // Quantity in Stock: Current available quantity
  reorderLevel: number; // Reorder Level: Minimum stock before restocking
  stockIn: number; // Stock In: Items added to inventory
  stockOut: number; // Stock Out: Items removed from inventory
  lastUpdated: string; // Last Updated: Date and time of the latest stock update
}

export interface InventoryMovementRecord {
  id: string;
  productId: string;
  productName?: string;
  orderId?: string | null;
  movementType: 'order_placed' | 'order_cancelled' | 'stock_in' | 'stock_out' | 'adjustment';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  notes?: string;
  createdAt: string;
}
