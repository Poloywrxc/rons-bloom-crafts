'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { InventoryItem, InventoryMovementRecord } from '@/types/inventory';
import { revalidatePath } from 'next/cache';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

function parseInventoryTags(tags: string[] = []): {
  reorderLevel: number;
  stockIn?: number;
  stockOut?: number;
  sku?: string;
} {
  let reorderLevel = 5;
  let stockIn: number | undefined;
  let stockOut: number | undefined;
  let sku: string | undefined;

  for (const tag of tags) {
    if (tag.startsWith('reorder:')) {
      const val = parseInt(tag.slice(8), 10);
      if (!isNaN(val)) reorderLevel = val;
    } else if (tag.startsWith('stock_in:')) {
      const val = parseInt(tag.slice(9), 10);
      if (!isNaN(val)) stockIn = val;
    } else if (tag.startsWith('stock_out:')) {
      const val = parseInt(tag.slice(10), 10);
      if (!isNaN(val)) stockOut = val;
    } else if (tag.startsWith('sku:')) {
      sku = tag.slice(4);
    }
  }

  return { reorderLevel, stockIn, stockOut, sku };
}

function updateTagMetadata(
  existingTags: string[] = [],
  updates: { reorderLevel?: number; stockIn?: number; stockOut?: number }
): string[] {
  const result: string[] = [];

  if (updates.reorderLevel !== undefined) {
    result.push(`reorder:${updates.reorderLevel}`);
  }
  if (updates.stockIn !== undefined) {
    result.push(`stock_in:${updates.stockIn}`);
  }
  if (updates.stockOut !== undefined) {
    result.push(`stock_out:${updates.stockOut}`);
  }

  for (const tag of existingTags) {
    if (
      (updates.reorderLevel !== undefined && tag.startsWith('reorder:')) ||
      (updates.stockIn !== undefined && tag.startsWith('stock_in:')) ||
      (updates.stockOut !== undefined && tag.startsWith('stock_out:'))
    ) {
      continue;
    }
    result.push(tag);
  }

  return result;
}

function formatTimestamp(isoStr?: string | null): string {
  if (!isoStr) {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return isoStr.slice(0, 16).replace('T', ' ');
  }
}

/**
 * Fetch all botanical inventory records directly from Supabase database based on schema.sql
 * Reads live catalog products and aggregate dispatched order_items.
 * Returns empty array if no records exist in the database (NO SEEDS).
 */
export async function fetchAllInventoryAdmin(): Promise<{
  success: boolean;
  inventory: InventoryItem[];
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch all products from products table according to schema.sql
    const { data: productsData, error: productsError } = await adminClient
      .from('products')
      .select('id, name, slug, price, stock, image, category_name, tags, is_archived, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('Error fetching products for inventory:', productsError);
      return { success: false, inventory: [], error: productsError.message };
    }

    if (!productsData || productsData.length === 0) {
      return { success: true, inventory: [] };
    }

    // 2. Fetch dispatched order items to compute stockOut (excluding Cancelled orders)
    let orderItemsData: any[] | null = null;
    const { data: joinedData, error: orderItemsError } = await adminClient
      .from('order_items')
      .select('product_id, quantity, orders!inner(status)')
      .neq('orders.status', 'Cancelled');

    if (orderItemsError) {
      console.warn('Note: order_items join fetch warning, falling back to basic order_items:', orderItemsError);
      const { data: basicData } = await adminClient
        .from('order_items')
        .select('product_id, quantity');
      orderItemsData = basicData;
    } else {
      orderItemsData = joinedData;
    }

    // Aggregate dispatched quantities by product_id
    const dispatchedMap = new Map<string, number>();
    if (orderItemsData) {
      for (const item of orderItemsData) {
        if (item.product_id) {
          const prev = dispatchedMap.get(item.product_id) || 0;
          dispatchedMap.set(item.product_id, prev + (Number(item.quantity) || 0));
        }
      }
    }

    // 3. Map each product into a botanical InventoryItem
    const inventory: InventoryItem[] = productsData.map((p: any) => {
      const rawTags = Array.isArray(p.tags) ? p.tags : [];
      const { reorderLevel, stockIn: customStockIn, stockOut: customStockOut, sku } = parseInventoryTags(rawTags);

      const quantityInStock = Math.max(0, Number(p.stock ?? 0));
      const orderDispatched = dispatchedMap.get(p.id) || 0;
      const stockOut = orderDispatched + (customStockOut || 0);

      // StockIn is at least available stock + dispatched out
      const stockIn = customStockIn !== undefined
        ? Math.max(customStockIn, quantityInStock + stockOut)
        : quantityInStock + stockOut;

      const displaySku = sku || (p.slug ? `RBC-${p.slug.toUpperCase()}` : (p.id.length > 8 ? `PRD-${p.id.slice(0, 4).toUpperCase()}` : p.id));
      const inventoryId = `INV-${displaySku.replace(/^RBC-|^PRD-/, '')}`;

      return {
        id: inventoryId,
        productId: p.id,
        quantityInStock,
        reorderLevel,
        stockIn,
        stockOut,
        lastUpdated: formatTimestamp(p.updated_at || p.created_at)
      };
    });

    return { success: true, inventory };
  } catch (err: any) {
    console.error('Unexpected error in fetchAllInventoryAdmin:', err);
    return {
      success: false,
      inventory: [],
      error: err?.message || 'Failed to fetch inventory from database'
    };
  }
}

/**
 * Record a stock movement (Stock In, Stock Out, or Reorder Level adjustment) directly in the database.
 * Updates public.products stock count, tag metadata, and updated_at timestamp based on schema.sql.
 */
export async function updateInventoryMovementAction(
  item: InventoryItem,
  movementType?: 'stock_in' | 'stock_out' | 'details',
  amount?: number,
  reason?: string
): Promise<{
  success: boolean;
  updatedItem?: InventoryItem;
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();

    // 1. Retrieve the existing product record
    let targetProductId = item.productId;
    let existingProduct: any = null;

    if (isValidUuid(targetProductId)) {
      const { data, error } = await adminClient
        .from('products')
        .select('*')
        .eq('id', targetProductId)
        .maybeSingle();

      if (!error && data) {
        existingProduct = data;
      }
    }

    if (!existingProduct) {
      // Try finding by tags containing sku
      const { data, error } = await adminClient
        .from('products')
        .select('*')
        .contains('tags', [`sku:${item.productId}`])
        .maybeSingle();

      if (!error && data) {
        existingProduct = data;
        targetProductId = data.id;
      }
    }

    if (!existingProduct) {
      return { success: false, error: `Product not found for inventory item ${item.id}` };
    }

    // 2. Compute updated tags and stock
    const existingTags = Array.isArray(existingProduct.tags) ? existingProduct.tags : [];
    const updatedTags = updateTagMetadata(existingTags, {
      reorderLevel: item.reorderLevel,
      stockIn: item.stockIn,
      stockOut: item.stockOut
    });

    const nowIso = new Date().toISOString();

    // 3. Update products table in database
    const { error: updateError } = await adminClient
      .from('products')
      .update({
        stock: Math.max(0, item.quantityInStock),
        tags: updatedTags,
        updated_at: nowIso
      })
      .eq('id', targetProductId);

    if (updateError) {
      console.error('Error updating inventory stock in database:', updateError);
      return { success: false, error: updateError.message };
    }

    const updatedItem: InventoryItem = {
      ...item,
      productId: targetProductId,
      lastUpdated: formatTimestamp(nowIso)
    };

    revalidatePath('/admin');
    revalidatePath('/products');

    return { success: true, updatedItem };
  } catch (err: any) {
    console.error('Unexpected error in updateInventoryMovementAction:', err);
    return {
      success: false,
      error: err?.message || 'Failed to update inventory movement in database'
    };
  }
}

/**
 * Fetch dynamic inventory movement audit logs
 */
export async function fetchRecentInventoryMovementsAction(limit = 20): Promise<{
  success: boolean;
  movements: InventoryMovementRecord[];
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('inventory_movements')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: true, movements: [] };
    }

    const movements: InventoryMovementRecord[] = (data || []).map((m: any) => ({
      id: m.id,
      productId: m.product_id,
      productName: m.products?.name,
      orderId: m.order_id,
      movementType: m.movement_type as any,
      quantityChange: m.quantity,
      previousStock: m.previous_stock,
      newStock: m.new_stock,
      notes: m.notes,
      createdAt: formatTimestamp(m.created_at)
    }));

    return { success: true, movements };
  } catch (err: any) {
    return { success: true, movements: [] };
  }
}

