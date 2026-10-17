'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { SalesItem } from '@/types/sales';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all sales records from Supabase database based on schema.sql
 * Reads order_items along with parent orders and catalog products.
 */
export async function fetchAllSalesAdmin(): Promise<{
  success: boolean;
  sales: SalesItem[];
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();

    // Fetch order_items with linked orders and products
    const { data, error } = await adminClient
      .from('order_items')
      .select(`
        id,
        order_id,
        product_id,
        product_name,
        quantity,
        price,
        created_at,
        orders (
          id,
          customer_name,
          customer_email,
          status,
          payment_status,
          created_at
        ),
        products (
          id,
          name,
          category_name,
          image,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales from database:', error);
      return { success: false, sales: [], error: error.message };
    }

    const sales: SalesItem[] = (data || []).map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
      const qty = Number(item.quantity) || 1;
      const prc = Number(item.price) || 0;

      return {
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id || undefined,
        productName: item.product_name,
        category: product?.category_name || 'Bouquet Artistry',
        image: product?.image || undefined,
        quantitySold: qty,
        price: prc,
        sales: qty * prc,
        dateRecorded: item.created_at
          ? item.created_at.split('T')[0]
          : order?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        sku: product?.slug ? `RBC-${product.slug.toUpperCase()}` : item.order_id || `SLS-${item.id.slice(0, 6)}`
      };
    });

    return { success: true, sales };
  } catch (err: any) {
    console.error('Unexpected error in fetchAllSalesAdmin:', err);
    return { success: false, sales: [], error: err?.message || 'Failed to fetch sales from database' };
  }
}

/**
 * Record a new sale directly into Supabase database according to schema.sql
 * Inserts an order and an order_items record.
 */
export async function recordSaleAction(input: {
  productName: string;
  category?: string;
  productId?: string;
  quantitySold: number;
  price: number;
  image?: string;
  sku?: string;
}): Promise<{
  success: boolean;
  sale?: SalesItem;
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();
    const qty = Math.max(1, Number(input.quantitySold) || 1);
    const prc = Math.max(0, Number(input.price) || 0);
    const totalAmount = qty * prc;
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Insert parent order into orders table according to schema.sql
    const { error: orderError } = await adminClient.from('orders').insert({
      id: orderId,
      customer_name: 'Direct Atelier Patron',
      customer_email: 'sales@ronsbloomcrafts.com',
      recipient_name: 'Direct Atelier Patron',
      recipient_phone: 'N/A',
      shipping_address: 'Ron’s Bloom Atelier Counter',
      delivery_date: new Date().toISOString().split('T')[0],
      status: 'Delivered',
      payment_status: 'Verified & Cleared',
      payment_method: 'Cash on Delivery',
      subtotal: totalAmount,
      delivery_fee: 0,
      total: totalAmount,
      notes: 'Recorded via Admin Atelier Sales Terminal'
    });

    if (orderError) {
      console.error('Error creating order for direct sale:', orderError);
      return { success: false, error: orderError.message };
    }

    // 2. Insert into order_items table
    const { data: itemData, error: itemError } = await adminClient
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id: input.productId || null,
        product_name: input.productName,
        quantity: qty,
        price: prc
      })
      .select()
      .single();

    if (itemError) {
      console.error('Error inserting order item for sale:', itemError);
      return { success: false, error: itemError.message };
    }

    // Optionally decrease product catalog stock if linked
    if (input.productId) {
      try {
        const { data: prod } = await adminClient
          .from('products')
          .select('stock')
          .eq('id', input.productId)
          .single();
        if (prod && typeof prod.stock === 'number') {
          const nextStock = Math.max(0, prod.stock - qty);
          await adminClient.from('products').update({ stock: nextStock }).eq('id', input.productId);
        }
      } catch (stockErr) {
        console.warn('Stock decrement note:', stockErr);
      }
    }

    revalidatePath('/admin');

    const createdSale: SalesItem = {
      id: itemData.id,
      orderId,
      productId: input.productId,
      productName: input.productName,
      category: input.category || 'Bouquet Artistry',
      image: input.image,
      quantitySold: qty,
      price: prc,
      sales: totalAmount,
      dateRecorded: new Date().toISOString().split('T')[0],
      sku: input.sku || orderId
    };

    return { success: true, sale: createdSale };
  } catch (err: any) {
    console.error('Unexpected error in recordSaleAction:', err);
    return { success: false, error: err?.message || 'Failed to record sale' };
  }
}

/**
 * Update an existing sale record in the database
 */
export async function updateSaleAction(
  saleItemId: string,
  quantitySold: number,
  price: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const qty = Math.max(1, Number(quantitySold) || 1);
    const prc = Math.max(0, Number(price) || 0);

    // 1. Get current item to find its order_id
    const { data: item, error: fetchErr } = await adminClient
      .from('order_items')
      .select('order_id')
      .eq('id', saleItemId)
      .single();

    if (fetchErr || !item) {
      return { success: false, error: fetchErr?.message || 'Sale record not found' };
    }

    // 2. Update order_items
    const { error: updateErr } = await adminClient
      .from('order_items')
      .update({
        quantity: qty,
        price: prc
      })
      .eq('id', saleItemId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 3. Recalculate parent order total
    if (item.order_id) {
      const { data: allItems } = await adminClient
        .from('order_items')
        .select('quantity, price')
        .eq('order_id', item.order_id);

      const subtotal = (allItems || []).reduce(
        (sum, it) => sum + (it.quantity * Number(it.price)),
        0
      );
      await adminClient
        .from('orders')
        .update({ subtotal, total: subtotal })
        .eq('id', item.order_id);
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in updateSaleAction:', err);
    return { success: false, error: err?.message || 'Failed to update sale' };
  }
}

/**
 * Delete a sale record from the database
 */
export async function deleteSaleAction(
  saleItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // 1. Find item to get order_id
    const { data: item, error: fetchErr } = await adminClient
      .from('order_items')
      .select('order_id')
      .eq('id', saleItemId)
      .single();

    if (fetchErr || !item) {
      return { success: false, error: fetchErr?.message || 'Sale record not found' };
    }

    // 2. Delete order_item
    const { error: delErr } = await adminClient
      .from('order_items')
      .delete()
      .eq('id', saleItemId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    // 3. Check if parent order still has items
    if (item.order_id) {
      const { data: remainingItems } = await adminClient
        .from('order_items')
        .select('id, quantity, price')
        .eq('order_id', item.order_id);

      if (!remainingItems || remainingItems.length === 0) {
        // Clean up empty order
        await adminClient.from('payment_verifications').delete().eq('order_id', item.order_id);
        await adminClient.from('orders').delete().eq('id', item.order_id);
      } else {
        const subtotal = remainingItems.reduce(
          (sum, it) => sum + (it.quantity * Number(it.price)),
          0
        );
        await adminClient
          .from('orders')
          .update({ subtotal, total: subtotal })
          .eq('id', item.order_id);
      }
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in deleteSaleAction:', err);
    return { success: false, error: err?.message || 'Failed to delete sale' };
  }
}
