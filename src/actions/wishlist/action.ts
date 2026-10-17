'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Fetch all product IDs in a user's wishlist directly from Supabase (wishlist_items table)
 */
export async function fetchUserWishlist(userId: string): Promise<{
  success: boolean;
  wishlist: string[];
  error?: string;
}> {
  if (!userId) {
    return { success: true, wishlist: [] };
  }

  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('wishlist_items')
      .select('product_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wishlist_items from database:', error);
      return { success: false, wishlist: [], error: error.message };
    }

    const wishlist = (data || []).map((row: any) => row.product_id as string);
    return { success: true, wishlist };
  } catch (err: any) {
    console.error('Unexpected error in fetchUserWishlist:', err);
    return { success: false, wishlist: [], error: err?.message || 'Failed to fetch wishlist' };
  }
}

/**
 * Toggle a product in user's wishlist in Supabase (wishlist_items table)
 */
export async function toggleWishlistAction(
  userId: string,
  productId: string
): Promise<{
  success: boolean;
  isWishlisted: boolean;
  error?: string;
}> {
  if (!userId || !productId) {
    return { success: false, isWishlisted: false, error: 'User ID and Product ID are required' };
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
      } else {
        return { success: false, isWishlisted: false, error: 'Product not found in database catalog' };
      }
    }

    // Check if the item is already wishlisted
    const { data: existing, error: checkError } = await adminClient
      .from('wishlist_items')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', resolvedProductId)
      .maybeSingle();

    if (checkError) {
      console.warn('Error checking wishlist item:', checkError);
    }

    if (existing) {
      // Remove from wishlist
      const { error: deleteError } = await adminClient
        .from('wishlist_items')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        return { success: false, isWishlisted: true, error: deleteError.message };
      }

      revalidatePath('/products');
      revalidatePath('/account');
      return { success: true, isWishlisted: false };
    } else {
      // Add to wishlist
      const { error: insertError } = await adminClient
        .from('wishlist_items')
        .insert({
          user_id: userId,
          product_id: resolvedProductId
        });

      if (insertError) {
        return { success: false, isWishlisted: false, error: insertError.message };
      }

      revalidatePath('/products');
      revalidatePath('/account');
      return { success: true, isWishlisted: true };
    }
  } catch (err: any) {
    console.error('Unexpected error in toggleWishlistAction:', err);
    return { success: false, isWishlisted: false, error: err?.message || 'Failed to toggle wishlist' };
  }
}

/**
 * Sync guest local wishlist items to the database upon user login
 */
export async function syncGuestWishlistToDatabase(
  userId: string,
  guestProductIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !guestProductIds || guestProductIds.length === 0) {
    return { success: true };
  }

  try {
    for (const pid of guestProductIds) {
      await toggleWishlistAction(userId, pid);
    }
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in syncGuestWishlistToDatabase:', err);
    return { success: false, error: err?.message || 'Failed to sync guest wishlist' };
  }
}
