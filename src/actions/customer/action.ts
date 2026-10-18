'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { User, UserRole, CustomerInfo } from '@/types/user';
import { Order, OrderItem } from '@/types/order';
import { Product } from '@/types/product';
import { revalidatePath } from 'next/cache';
import { sendOrderInvoiceEmail } from '@/lib/email/service';
import { OrderEmailPayload } from '@/lib/email/types';

/**
 * Fetch a customer profile by User ID from Supabase
 */
export async function fetchCustomerProfile(userId: string): Promise<User | null> {
  if (!userId) return null;
  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile) {
      // Fallback to admin client if RLS blocked
      const adminClient = createAdminClient();
      const { data: adminProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!adminProfile) return null;

      return {
        id: adminProfile.id,
        name: adminProfile.name,
        email: adminProfile.email,
        role: (adminProfile.role as UserRole) || 'customer',
        address: adminProfile.address || '',
        phone: adminProfile.phone || ''
      };
    }

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: (profile.role as UserRole) || 'customer',
      address: profile.address || '',
      phone: profile.phone || ''
    };
  } catch (err) {
    console.error('Error fetching customer profile:', err);
    return null;
  }
}

/**
 * Update user profile details (Name, Phone, Address) in Supabase database
 */
export async function updateCustomerProfile(data: {
  id: string;
  name: string;
  phone: string;
  address: string;
  badge?: string;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    if (!data.id) {
      return { success: false, error: 'User ID is required' };
    }

    const adminClient = createAdminClient();

    const { data: updatedProfile, error } = await adminClient
      .from('profiles')
      .update({
        name: data.name.trim(),
        phone: data.phone.trim(),
        address: data.address.trim(),
        badge: data.badge || 'Bloom Patron',
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)
      .select('*')
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    // Also update auth user metadata if possible
    try {
      await adminClient.auth.admin.updateUserById(data.id, {
        user_metadata: {
          name: data.name.trim(),
          phone: data.phone.trim(),
          address: data.address.trim()
        }
      });
    } catch (metaErr) {
      console.warn('Metadata update note:', metaErr);
    }

    const updatedUser: User = {
      id: data.id,
      name: updatedProfile?.name || data.name,
      email: updatedProfile?.email || '',
      role: (updatedProfile?.role as UserRole) || 'customer',
      address: updatedProfile?.address || data.address,
      phone: updatedProfile?.phone || data.phone
    };

    revalidatePath('/admin');
    revalidatePath('/account');

    return { success: true, user: updatedUser };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update profile in database' };
  }
}

/**
 * Fetch all orders belonging to a customer
 */
export async function fetchUserOrders(userId?: string, email?: string): Promise<Order[]> {
  try {
    const adminClient = createAdminClient();
    let query = adminClient
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (email) {
      query = query.ilike('customer_email', email);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.map((o: any) => {
      let refundMethod: string | undefined;
      let refundNumber: string | undefined;
      if (o.notes) {
        try {
          const parsed = JSON.parse(o.notes);
          if (parsed.refundMethod) refundMethod = parsed.refundMethod;
          if (parsed.refundNumber) refundNumber = parsed.refundNumber;
        } catch {
          const match = o.notes.match(/Refund via (GCash|Maya):\s*([0-9+ -]+)/i);
          if (match) {
            refundMethod = match[1];
            refundNumber = match[2].trim();
          }
        }
      }

      return {
        id: o.id,
        date: o.created_at ? o.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        customer: o.customer_name || 'Valued Patron',
        email: o.customer_email || '',
        items: (o.order_items || []).map((item: any) => ({
          name: item.product_name,
          qty: item.quantity,
          price: Number(item.price)
        })),
        total: Number(o.total),
        deliveryFee: Number(o.delivery_fee ?? 10.0),
        status: o.status,
        paymentStatus: o.payment_status,
        paymentProof: o.payment_proof || undefined,
        deliveryDate: o.delivery_date || '',
        recipient: `${o.recipient_name} - ${o.shipping_address}`,
        cardMessage: o.card_message || undefined,
        notes: o.notes || undefined,
        refundMethod,
        refundNumber
      };
    });
  } catch (err) {
    console.error('Error fetching user orders:', err);
    return [];
  }
}

/**
 * Create a new order in Supabase database
 */
export async function createCustomerOrder(orderInput: {
  userId?: string;
  customerName: string;
  customerEmail: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  deliveryDate: string;
  cardMessage?: string;
  paymentMethod: string;
  paymentProof?: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: { productId?: string; name: string; qty: number; price: number }[];
}): Promise<{ success: boolean; order?: Order; error?: string; emailSent?: boolean }> {
  try {
    const adminClient = createAdminClient();
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const { error: orderError } = await adminClient.from('orders').insert({
      id: orderId,
      user_id: orderInput.userId || null,
      customer_name: orderInput.customerName,
      customer_email: orderInput.customerEmail,
      recipient_name: orderInput.recipientName,
      recipient_phone: orderInput.recipientPhone || 'N/A',
      shipping_address: orderInput.shippingAddress,
      delivery_date: orderInput.deliveryDate,
      card_message: orderInput.cardMessage || null,
      status: 'Order Received',
      payment_status:
        orderInput.paymentMethod === 'Cash on Delivery'
          ? 'Pending COD'
          : 'Proof Uploaded (Pending Admin)',
      payment_method:
        orderInput.paymentMethod === 'Cash on Delivery'
          ? 'Cash on Delivery'
          : orderInput.paymentMethod?.toLowerCase().includes('card')
          ? 'Credit / Debit Card'
          : 'GCash / E-Wallet',
      payment_proof: orderInput.paymentProof || null,
      subtotal: orderInput.subtotal,
      delivery_fee: orderInput.deliveryFee,
      total: orderInput.total
    });

    if (orderError) {
      console.error('Error inserting order:', orderError);
      return { success: false, error: orderError.message };
    }

    if (orderInput.items && orderInput.items.length > 0) {
      const orderItems = [];

      for (const it of orderInput.items) {
        let matchedProductId: string | null = it.productId || null;
        let matchedProduct: any = null;

        const isUuid = matchedProductId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchedProductId);

        if (matchedProductId && isUuid) {
          const { data } = await adminClient
            .from('products')
            .select('id, name, stock')
            .eq('id', matchedProductId)
            .maybeSingle();
          matchedProduct = data;
        }

        // If not found by ID, look up by exact or case-insensitive product name
        if (!matchedProduct && it.name) {
          const { data } = await adminClient
            .from('products')
            .select('id, name, stock')
            .ilike('name', it.name)
            .maybeSingle();
          if (data) {
            matchedProduct = data;
            matchedProductId = data.id;
          }
        }

        orderItems.push({
          order_id: orderId,
          product_id: matchedProductId,
          product_name: it.name,
          quantity: it.qty,
          price: it.price,
          card_message: orderInput.cardMessage || null
        });

        // Dynamic Inventory Movement: Deduct stock from products catalog & record movement
        if (matchedProduct && typeof matchedProduct.stock === 'number') {
          const prevStock = Number(matchedProduct.stock);
          const deductQty = Math.max(1, Number(it.qty) || 1);
          const newStock = Math.max(0, prevStock - deductQty);

          const { error: stockErr } = await adminClient
            .from('products')
            .update({
              stock: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', matchedProduct.id);

          if (stockErr) {
            console.warn(`Failed to deduct inventory stock for product ${matchedProduct.id}:`, stockErr);
          } else {
            // Record dynamic inventory movement audit log
            try {
              await adminClient.from('inventory_movements').insert({
                product_id: matchedProduct.id,
                order_id: orderId,
                movement_type: 'order_placed',
                quantity: -deductQty,
                previous_stock: prevStock,
                new_stock: newStock,
                notes: `Customer Order ${orderId}: Dispatched ${deductQty} stems for ${orderInput.customerName}`
              });
            } catch {
              // Ignore if audit table not migrated
            }
          }
        }
      }

      const { error: itemsError } = await adminClient
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.warn('Error inserting order items:', itemsError);
      }
    }

    // Automatically generate and dispatch official invoice email to customer
    let emailSent = false;
    if (orderInput.customerEmail) {
      try {
        const invoicePayload: OrderEmailPayload = {
          orderId,
          customerName: orderInput.customerName || 'Valued Patron',
          customerEmail: orderInput.customerEmail,
          recipientName: orderInput.recipientName,
          recipientPhone: orderInput.recipientPhone,
          shippingAddress: orderInput.shippingAddress,
          deliveryDate: orderInput.deliveryDate,
          cardMessage: orderInput.cardMessage || undefined,
          items: orderInput.items.map((it) => ({
            name: it.name,
            qty: it.qty,
            price: it.price
          })),
          subtotal: orderInput.subtotal,
          deliveryFee: orderInput.deliveryFee,
          total: orderInput.total,
          paymentMethod: orderInput.paymentMethod,
          paymentStatus:
            orderInput.paymentMethod === 'Cash on Delivery'
              ? 'Pending COD'
              : 'Proof Uploaded (Pending Admin Clearance)',
          adminNotes: orderInput.cardMessage ? `Gift Note: "${orderInput.cardMessage}"` : undefined
        };

        const emailRes = await sendOrderInvoiceEmail(invoicePayload);
        emailSent = emailRes.success;
        if (emailRes.success) {
          console.log(`[Checkout] Invoice email successfully dispatched to ${orderInput.customerEmail} for order #${orderId}`);
        } else {
          console.warn(`[Checkout] Invoice email dispatch note for #${orderId}:`, emailRes.error);
        }
      } catch (invoiceErr) {
        console.error(`[Checkout] Failed to dispatch invoice email for #${orderId}:`, invoiceErr);
      }
    }

    revalidatePath('/admin');
    revalidatePath('/products');
    revalidatePath('/account');
    revalidatePath('/');

    const createdOrder: Order = {
      id: orderId,
      date: new Date().toISOString().split('T')[0],
      customer: orderInput.customerName,
      email: orderInput.customerEmail,
      items: orderInput.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      total: orderInput.total,
      deliveryFee: orderInput.deliveryFee,
      status: 'Order Received',
      paymentStatus:
        orderInput.paymentMethod === 'Cash on Delivery'
          ? 'Pending COD'
          : `Proof Uploaded (${orderInput.paymentMethod})`,
      paymentProof: orderInput.paymentProof || undefined,
      deliveryDate: orderInput.deliveryDate,
      recipient: `${orderInput.recipientName} - ${orderInput.shippingAddress}`,
      cardMessage: orderInput.cardMessage || undefined
    };

    return { success: true, order: createdOrder, emailSent };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to place order in database' };
  }
}

/**
 * Cancel an order in the database & restore inventory movement dynamically
 */
export async function cancelCustomerOrder(
  orderId: string,
  refundTotal?: number,
  refundDetails?: {
    refundMethod: 'GCash' | 'Maya' | string;
    refundNumber: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // Check if order was already cancelled to prevent double stock return
    const { data: existingOrder } = await adminClient
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .maybeSingle();

    const wasAlreadyCancelled = existingOrder?.status === 'Cancelled';

    const updatePayload: Record<string, any> = {
      status: 'Cancelled',
      payment_status: 'Payment Rejected',
      updated_at: new Date().toISOString()
    };

    if (refundDetails) {
      updatePayload.notes = JSON.stringify({
        refundMethod: refundDetails.refundMethod,
        refundNumber: refundDetails.refundNumber,
        refundTotal: refundTotal,
        notes: refundDetails.notes || `Refund requested via ${refundDetails.refundMethod} (${refundDetails.refundNumber})`,
        cancelledAt: new Date().toISOString()
      });
    }

    const { error } = await adminClient
      .from('orders')
      .update(updatePayload as any)
      .eq('id', orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Dynamic Inventory Movement: Restore stock if not already cancelled
    if (!wasAlreadyCancelled) {
      const { data: orderItems } = await adminClient
        .from('order_items')
        .select('product_id, product_name, quantity')
        .eq('order_id', orderId);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          let prodId = item.product_id;
          let prod: any = null;

          if (prodId) {
            const { data } = await adminClient
              .from('products')
              .select('id, name, stock')
              .eq('id', prodId)
              .maybeSingle();
            prod = data;
          }
          if (!prod && item.product_name) {
            const { data } = await adminClient
              .from('products')
              .select('id, name, stock')
              .ilike('name', item.product_name)
              .maybeSingle();
            if (data) {
              prod = data;
              prodId = data.id;
            }
          }

          if (prod && typeof prod.stock === 'number') {
            const prevStock = Number(prod.stock);
            const returnQty = Number(item.quantity) || 1;
            const newStock = prevStock + returnQty;

            await adminClient
              .from('products')
              .update({
                stock: newStock,
                updated_at: new Date().toISOString()
              })
              .eq('id', prod.id);

            try {
              await adminClient.from('inventory_movements').insert({
                product_id: prod.id,
                order_id: orderId,
                movement_type: 'order_cancelled',
                quantity: returnQty,
                previous_stock: prevStock,
                new_stock: newStock,
                notes: `Order ${orderId} Cancelled: Restored ${returnQty} stems back to inventory`
              });
            } catch {
              // Ignore if audit table not migrated
            }
          }
        }
      }
    }

    revalidatePath('/admin');
    revalidatePath('/products');
    revalidatePath('/account');
    revalidatePath('/');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to cancel order' };
  }
}

/**
 * Submit a customer product review to Supabase reviews table
 */
export async function submitCustomerReview(data: {
  userId?: string;
  userName: string;
  productId: string;
  rating: number;
  comment: string;
  orderId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('reviews').insert({
      user_id: data.userId || null,
      user_name: data.userName,
      product_id: data.productId,
      order_id: data.orderId || null,
      rating: data.rating,
      comment: data.comment,
      status: 'approved'
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit review' };
  }
}

/**
 * Fetch wishlist product IDs for user
 */
export async function fetchUserWishlist(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('wishlist_items')
      .select('product_id')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map((d) => d.product_id);
  } catch {
    return [];
  }
}

/**
 * Toggle wishlist item in Supabase
 */
export async function toggleCustomerWishlist(
  userId: string,
  productId: string
): Promise<{ success: boolean; isWishlisted: boolean }> {
  if (!userId || !productId) return { success: false, isWishlisted: false };
  try {
    const adminClient = createAdminClient();
    const { data: existing } = await adminClient
      .from('wishlist_items')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      await adminClient.from('wishlist_items').delete().eq('id', existing.id);
      return { success: true, isWishlisted: false };
    } else {
      await adminClient.from('wishlist_items').insert({
        user_id: userId,
        product_id: productId
      });
      return { success: true, isWishlisted: true };
    }
  } catch {
    return { success: false, isWishlisted: false };
  }
}

/**
 * Fetch all users with real order statistics from the database (for Admin Users Management)
 */
export async function fetchAllUsersWithStats(): Promise<CustomerInfo[]> {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch all profiles
    const { data: profiles, error: pErr } = await adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Fetch all auth users to ensure any user registered via Supabase Auth is captured
    let authUsers: any[] = [];
    try {
      const { data: authData } = await adminClient.auth.admin.listUsers();
      if (authData?.users) {
        authUsers = authData.users;
      }
    } catch (authErr) {
      console.warn('Could not list auth users:', authErr);
    }

    // 3. Fetch all orders to compute lifetime totals and counts
    const { data: orders } = await adminClient
      .from('orders')
      .select('id, user_id, customer_email, total, status');

    // Group orders by user_id and email
    const statsByUser: Record<string, { count: number; total: number }> = {};

    (orders || []).forEach((ord: any) => {
      const keys = [ord.user_id, ord.customer_email?.toLowerCase()].filter(Boolean);
      keys.forEach((k) => {
        if (!statsByUser[k]) {
          statsByUser[k] = { count: 0, total: 0 };
        }
        statsByUser[k].count += 1;
        statsByUser[k].total += Number(ord.total || 0);
      });
    });

    const combinedUsers: CustomerInfo[] = [];
    const seenIds = new Set<string>();

    (profiles || []).forEach((p: any) => {
      if (!p.id || seenIds.has(p.id)) return;
      seenIds.add(p.id);

      const stats = statsByUser[p.id] || (p.email ? statsByUser[p.email.toLowerCase()] : null) || { count: 0, total: 0 };
      const role: UserRole = p.role === 'admin' ? 'admin' : 'customer';

      const initials = p.name
        ? p.name
            .split(' ')
            .filter(Boolean)
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'BP';

      const memberSinceDate = p.created_at
        ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Recent Patron';

      combinedUsers.push({
        id: p.id,
        name: p.name || 'Bloom Patron',
        email: p.email || '',
        phone: p.phone || '',
        role,
        orderCount: stats.count,
        totalSpent: stats.total,
        badge: role === 'admin' ? 'Master Florist & Admin' : (p.badge || 'Bloom Patron'),
        badgeColor:
          role === 'admin'
            ? 'bg-emerald-950 text-amber-300 border-amber-500/40'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200',
        initials: initials || 'BP',
        favoriteBlooms: 'Hand-picked Roses & Sarah Bernhardt Peonies',
        memberSince: memberSinceDate,
        status: 'Active' as const
      });
    });

    // Check for any auth users not yet in profiles table
    authUsers.forEach((u: any) => {
      if (!u.id || seenIds.has(u.id)) return;
      seenIds.add(u.id);

      const userEmail = u.email || '';
      const stats = statsByUser[u.id] || (userEmail ? statsByUser[userEmail.toLowerCase()] : null) || { count: 0, total: 0 };
      const role: UserRole =
        u.user_metadata?.role === 'admin' || userEmail.includes('admin@') || userEmail.includes('ron@')
          ? 'admin'
          : 'customer';

      const name =
        u.user_metadata?.name ||
        (userEmail ? userEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Bloom Patron');
      const phone = u.user_metadata?.phone || u.phone || '';

      const initials = name
        ? name
            .split(' ')
            .filter(Boolean)
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'BP';

      const memberSinceDate = u.created_at
        ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Recent Patron';

      combinedUsers.push({
        id: u.id,
        name,
        email: userEmail,
        phone,
        role,
        orderCount: stats.count,
        totalSpent: stats.total,
        badge: role === 'admin' ? 'Master Florist & Admin' : 'Bloom Patron',
        badgeColor:
          role === 'admin'
            ? 'bg-emerald-950 text-amber-300 border-amber-500/40'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200',
        initials: initials || 'BP',
        favoriteBlooms: 'Hand-picked Roses & Sarah Bernhardt Peonies',
        memberSince: memberSinceDate,
        status: 'Active' as const
      });
    });

    return combinedUsers;
  } catch (err) {
    console.error('Error fetching users with stats:', err);
    return [];
  }
}

/**
 * Toggle or update user role (customer <-> admin) in Supabase database
 */
export async function updateUserRoleAction(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('profiles')
      .update({
        role: newRole,
        badge: newRole === 'admin' ? 'Master Florist & Admin' : 'Bloom Patron',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    try {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { role: newRole }
      });
    } catch {}

    revalidatePath('/admin');
    revalidatePath('/admin/users');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update user role' };
  }
}

/**
 * Fetch reviews for moderation in the Users tab
 */
export async function fetchReviewsForModeration(): Promise<any[]> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('reviews')
      .select('*, products(name)')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      author: r.user_name || 'Anonymous Patron',
      rating: r.rating,
      date: r.created_at
        ? new Date(r.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Recent',
      arrangement: r.products?.name || 'Artisan Floral Bouquet',
      comment: r.comment,
      verified: true,
      published: r.status === 'approved'
    }));
  } catch {
    return [];
  }
}

/**
 * Toggle publish review status
 */
export async function toggleReviewPublishAction(
  reviewId: string,
  currentlyPublished: boolean
): Promise<{ success: boolean; published: boolean }> {
  try {
    const adminClient = createAdminClient();
    const newStatus = currentlyPublished ? 'rejected' : 'approved';
    const { error } = await adminClient
      .from('reviews')
      .update({ status: newStatus as any, updated_at: new Date().toISOString() })
      .eq('id', reviewId);

    if (error) return { success: false, published: currentlyPublished };
    return { success: true, published: !currentlyPublished };
  } catch {
    return { success: false, published: currentlyPublished };
  }
}
