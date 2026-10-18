'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product } from '@/types/product';
import { User } from '@/types/user';
import { CartItem } from '@/types/cart';
import {
  fetchUserCart,
  addToCartAction,
  updateCartItemQtyAction,
  removeFromCartAction,
  clearCartAction,
  syncGuestCartToDatabase
} from '@/actions/cart/action';
import {
  fetchUserWishlist,
  toggleWishlistAction,
  syncGuestWishlistToDatabase
} from '@/actions/wishlist/action';
import { createClient } from '@/lib/supabase/client';

export type { CartItem } from '@/types/cart';

const GUEST_CART_KEY = 'bloom_crafts_guest_cart';
const GUEST_WISHLIST_KEY = 'bloom_crafts_guest_wishlist';

/**
 * Universal Cart and Wishlist hook connected live to Supabase database (cart_items & wishlist_items).
 * Automatically supports both authenticated customers and guest browsing.
 */
export function useCart(userOrProducts?: User | Product[] | null) {
  // Live states initialized completely clean (no hardcoded mock items)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // Mirror of the latest cart so callbacks can read it without side effects in setState updaters
  const cartRef = useRef<CartItem[]>(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Determine user ID from argument or localStorage
  useEffect(() => {
    let resolvedId: string | null = null;
    if (userOrProducts && typeof userOrProducts === 'object' && 'id' in userOrProducts && typeof userOrProducts.id === 'string') {
      resolvedId = userOrProducts.id;
    } else if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('bloom_crafts_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id) resolvedId = parsed.id;
        }
      } catch {}
    }
    setActiveUserId(resolvedId);
  }, [userOrProducts]);

  // Load from database when user is authenticated, or from guest storage when not
  const loadCartAndWishlist = useCallback(async (userId: string | null) => {
    setIsLoading(true);
    try {
      if (userId) {
        // 1. Sync any guest items accumulated prior to login
        if (typeof window !== 'undefined') {
          try {
            const rawGuestCart = localStorage.getItem(GUEST_CART_KEY);
            if (rawGuestCart) {
              const guestCart: CartItem[] = JSON.parse(rawGuestCart);
              if (Array.isArray(guestCart) && guestCart.length > 0) {
                await syncGuestCartToDatabase(
                  userId,
                  guestCart.map((g) => ({
                    productId: g.id,
                    quantity: g.quantity,
                    cardMessage: g.cardMessage
                  }))
                );
                localStorage.removeItem(GUEST_CART_KEY);
              }
            }

            const rawGuestWishlist = localStorage.getItem(GUEST_WISHLIST_KEY);
            if (rawGuestWishlist) {
              const guestWish: string[] = JSON.parse(rawGuestWishlist);
              if (Array.isArray(guestWish) && guestWish.length > 0) {
                await syncGuestWishlistToDatabase(userId, guestWish);
                localStorage.removeItem(GUEST_WISHLIST_KEY);
              }
            }
          } catch (syncErr) {
            console.warn('Error syncing guest cart/wishlist to database:', syncErr);
          }
        }

        // 2. Fetch live data from Supabase database tables
        const [cartRes, wishRes] = await Promise.all([
          fetchUserCart(userId),
          fetchUserWishlist(userId)
        ]);

        if (cartRes.success && Array.isArray(cartRes.cart)) {
          setCart(cartRes.cart);
        }
        if (wishRes.success && Array.isArray(wishRes.wishlist)) {
          setWishlist(wishRes.wishlist);
        }
      } else {
        // Guest mode: read from localStorage (initial default is empty)
        if (typeof window !== 'undefined') {
          const rawCart = localStorage.getItem(GUEST_CART_KEY);
          const rawWish = localStorage.getItem(GUEST_WISHLIST_KEY);
          setCart(rawCart ? JSON.parse(rawCart) : []);
          setWishlist(rawWish ? JSON.parse(rawWish) : []);
        } else {
          setCart([]);
          setWishlist([]);
        }
      }
    } catch (err) {
      console.error('Error loading cart and wishlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCartAndWishlist(activeUserId);
  }, [activeUserId, loadCartAndWishlist]);

  // Real-time synchronization for authenticated users
  useEffect(() => {
    if (!activeUserId) return;

    let cartChannel: any = null;
    let wishChannel: any = null;

    try {
      const supabase = createClient();

      cartChannel = supabase
        .channel(`user-cart-stream-${activeUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cart_items',
            filter: `user_id=eq.${activeUserId}`
          },
          () => {
            fetchUserCart(activeUserId).then((res) => {
              if (res.success && Array.isArray(res.cart)) {
                setCart(res.cart);
              }
            });
          }
        )
        .subscribe();

      wishChannel = supabase
        .channel(`user-wishlist-stream-${activeUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wishlist_items',
            filter: `user_id=eq.${activeUserId}`
          },
          () => {
            fetchUserWishlist(activeUserId).then((res) => {
              if (res.success && Array.isArray(res.wishlist)) {
                setWishlist(res.wishlist);
              }
            });
          }
        )
        .subscribe();
    } catch (realtimeErr) {
      console.warn('Realtime cart subscription warning:', realtimeErr);
    }

    return () => {
      try {
        const supabase = createClient();
        if (cartChannel) supabase.removeChannel(cartChannel);
        if (wishChannel) supabase.removeChannel(wishChannel);
      } catch {}
    };
  }, [activeUserId]);

  // Add Item to Cart (Basket)
  const addToCart = useCallback(
    (product: Product, customMessage = '') => {
      // Prevent adding items with zero or negative stock
      if ((product.stock ?? 0) <= 0) {
        return;
      }

      setCart((prev) => {
        const existing = prev.find((item) => item.id === product.id);
        let updated: CartItem[];
        if (existing) {
          updated = prev.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          updated = [...prev, { ...product, quantity: 1, cardMessage: customMessage }];
        }

        // Save to guest storage if unauthenticated
        if (!activeUserId && typeof window !== 'undefined') {
          localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
        }
        return updated;
      });

      // Persist to database if authenticated
      if (activeUserId) {
        addToCartAction(activeUserId, product.id, 1, customMessage).catch((err) =>
          console.error('Failed to add item to database cart:', err)
        );
      }
    },
    [activeUserId]
  );

  // Update Cart Quantity
  const updateCartQty = useCallback(
    (id: string, delta: number) => {
      const current = cartRef.current;
      const target = current.find((item) => item.id === id);
      if (!target) return;

      const newTargetQty = target.quantity + delta;
      const updated = current
        .map((item) =>
          item.id === id ? (newTargetQty > 0 ? { ...item, quantity: newTargetQty } : null) : item
        )
        .filter(Boolean) as CartItem[];

      cartRef.current = updated;
      setCart(updated);

      if (!activeUserId && typeof window !== 'undefined') {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
      }

      // Side effects (server actions) must run outside of setState updaters
      if (activeUserId) {
        updateCartItemQtyAction(activeUserId, id, newTargetQty).catch((err) =>
          console.error('Failed to update cart quantity in database:', err)
        );
      }
    },
    [activeUserId]
  );

  // Clear Basket
  const clearCart = useCallback(() => {
    setCart([]);
    if (!activeUserId && typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_CART_KEY);
    }
    if (activeUserId) {
      clearCartAction(activeUserId).catch((err) =>
        console.error('Failed to clear cart in database:', err)
      );
    }
  }, [activeUserId]);

  // Toggle Heart (Wishlist)
  const toggleWishlist = useCallback(
    (productId: string) => {
      setWishlist((prev) => {
        const exists = prev.includes(productId);
        const updated = exists ? prev.filter((id) => id !== productId) : [...prev, productId];

        if (!activeUserId && typeof window !== 'undefined') {
          localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(updated));
        }
        return updated;
      });

      if (activeUserId) {
        toggleWishlistAction(activeUserId, productId).catch((err) =>
          console.error('Failed to toggle wishlist in database:', err)
        );
      }
    },
    [activeUserId]
  );

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  return {
    cart,
    setCart,
    addToCart,
    updateCartQty,
    clearCart,
    wishlist,
    setWishlist,
    toggleWishlist,
    cartSubtotal,
    cartCount,
    isLoading
  };
}
