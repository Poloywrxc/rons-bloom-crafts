'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { CartItem } from '@/types/cart';
import { revalidatePath } from 'next/cache';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Fetch a customer's active shopping cart directly from Supabase cart_items table
 */
export async function fetchUserCart(userId: string): Promise<{
  success: boolean;
  cart: CartItem[];
  error?: string;
}> {
  if (!userId) {
    return { success: true, cart: [] };
  }

  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('cart_items')
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        card_message,
        created_at,
        products (
          id,
          name,
          category_name,
          description,
          price,
          image,
          rating,
          reviews_count,
          stock,
          freshness,
          tags,
          slug
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching cart_items from database:', error);
      return { success: false, cart: [], error: error.message };
    }

    const cart: CartItem[] = (data || []).map((row: any) => {
      const p = Array.isArray(row.products) ? row.products[0] : row.products;
      const price = Number(p?.price) || 0;

      return {
        id: p?.id || row.product_id,
        name: p?.name || 'Artisanal Bouquet',
        sku: p?.slug
          ? `RBC-${p.slug.toUpperCase()}`
          : p?.id
          ? `PRD-${p.id.slice(0, 4).toUpperCase()}`
          : 'RBC-STEM',
        category: p?.category_name || 'Mixed flowers',
        description: p?.description || 'Fresh floral arrangement.',
        costPrice: Math.round(price * 0.6),
        price,
        sellingPrice: price,
        supplier: 'Benguet Highland Bloomery',
        status: 'active',
        image:
          p?.image ||
          'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=700&q=80',
        rating: Number(p?.rating) || 5.0,
        reviewsCount: Number(p?.reviews_count) || 0,
        stock: Number(p?.stock) || 12,
        freshness: p?.freshness || 'Farm Picked Today',
        tags: Array.isArray(p?.tags) ? p.tags : [],
        quantity: Number(row.quantity) || 1,
        cardMessage: row.card_message || ''
      };
    });

    return { success: true, cart };
  } catch (err: any) {
    console.error('Unexpected error in fetchUserCart:', err);
    return { success: false, cart: [], error: err?.message || 'Failed to fetch cart' };
  }
}

/**
 * Add or increment an item in the user's database cart (cart_items table)
 */
export async function addToCartAction(
  userId: string,
  productId: string,
  quantity: number = 1,
  cardMessage: string = ''
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !productId) {
    return { success: false, error: 'User ID and Product ID are required' };
  }

  try {
    const adminClient = createAdminClient();

    let resolvedProductId = productId;
    if (!isValidUuid(productId)) {
      // Find matching product in catalog
      const { data: matched } = await adminClient
        .from('products')
        .select('id')
        .or(`name.ilike.%${productId}%,slug.ilike.%${productId}%`)
        .limit(1)
        .maybeSingle();

      if (matched?.id) {
        resolvedProductId = matched.id;
      } else {
        return { success: false, error: 'Product not found in database catalog' };
      }
    }

    // Check if product already exists in user's cart
    const { data: existing, error: checkError } = await adminClient
      .from('cart_items')
      .select('id, quantity, card_message')
      .eq('user_id', userId)
      .eq('product_id', resolvedProductId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing cart item:', checkError);
    }

    if (existing) {
      const updatedQty = (Number(existing.quantity) || 0) + quantity;
      const { error: updateError } = await adminClient
        .from('cart_items')
        .update({
          quantity: updatedQty,
          card_message: cardMessage || existing.card_message,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      const { error: insertError } = await adminClient.from('cart_items').insert({
        user_id: userId,
        product_id: resolvedProductId,
        quantity: Math.max(1, quantity),
        card_message: cardMessage || ''
      });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    revalidatePath('/products');
    revalidatePath('/account');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in addToCartAction:', err);
    return { success: false, error: err?.message || 'Failed to add to cart' };
  }
}

/**
 * Update the quantity of an item in the user's cart (cart_items table)
 */
export async function updateCartItemQtyAction(
  userId: string,
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !productId) {
    return { success: false, error: 'User ID and Product ID are required' };
  }

  try {
    const adminClient = createAdminClient();

    let resolvedProductId = productId;
    if (!isValidUuid(productId)) {
      const { data: matched } = await adminClient
        .from('products')
        .select('id')
        .or(`name.ilike.%${productId}%,slug.ilike.%${productId}%`)
        .limit(1)
        .maybeSingle();

      if (matched?.id) {
        resolvedProductId = matched.id;
      }
    }

    if (quantity <= 0) {
      // Remove item if quantity is zero or negative
      const { error } = await adminClient
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', resolvedProductId);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await adminClient
        .from('cart_items')
        .update({
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('product_id', resolvedProductId);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    revalidatePath('/products');
    revalidatePath('/account');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in updateCartItemQtyAction:', err);
    return { success: false, error: err?.message || 'Failed to update cart item quantity' };
  }
}

/**
 * Remove an item from the user's cart (cart_items table)
 */
export async function removeFromCartAction(
  userId: string,
  productId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !productId) {
    return { success: false, error: 'User ID and Product ID are required' };
  }

  try {
    const adminClient = createAdminClient();

    let resolvedProductId = productId;
    if (!isValidUuid(productId)) {
      const { data: matched } = await adminClient
        .from('products')
        .select('id')
        .or(`name.ilike.%${productId}%,slug.ilike.%${productId}%`)
        .limit(1)
        .maybeSingle();

      if (matched?.id) {
        resolvedProductId = matched.id;
      }
    }

    const { error } = await adminClient
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', resolvedProductId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/products');
    revalidatePath('/account');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in removeFromCartAction:', err);
    return { success: false, error: err?.message || 'Failed to remove cart item' };
  }
}

/**
 * Clear all cart items for a user in the database (cart_items table)
 */
export async function clearCartAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: true };
  }

  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/products');
    revalidatePath('/account');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in clearCartAction:', err);
    return { success: false, error: err?.message || 'Failed to clear cart' };
  }
}

/**
 * Sync guest local cart items to the database upon user login
 */
export async function syncGuestCartToDatabase(
  userId: string,
  guestItems: { productId: string; quantity: number; cardMessage?: string }[]
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !guestItems || guestItems.length === 0) {
    return { success: true };
  }

  try {
    for (const item of guestItems) {
      await addToCartAction(userId, item.productId, item.quantity, item.cardMessage);
    }
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in syncGuestCartToDatabase:', err);
    return { success: false, error: err?.message || 'Failed to sync guest cart' };
  }
}
