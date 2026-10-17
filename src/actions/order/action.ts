'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { Order } from '@/types/order';
import { revalidatePath } from 'next/cache';
import {
  sendFloralArtistryEmail,
  sendOutForDeliveryEmail,
  sendDeliveredEmail,
  sendOrderCancelledEmail,
  sendRefundEmail,
  sendPaymentVerifiedEmail,
  sendPaymentRejectedEmail,
  sendOrderNotificationEmail
} from '@/lib/email/service';
import { OrderEmailPayload, OrderEmailType } from '@/lib/email/types';


/**
 * Fetch all orders from Supabase database for Admin Order Management
 */
export async function fetchAllOrdersAdmin(): Promise<{
  success: boolean;
  orders: Order[];
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin orders from database:', error);
      return { success: false, orders: [], error: error.message };
    }

    const orders: Order[] = (data || []).map((o: any) => {
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
        recipient: o.recipient_name
          ? `${o.recipient_name}${o.shipping_address ? ` - ${o.shipping_address}` : ''}${o.recipient_phone ? ` (${o.recipient_phone})` : ''}`
          : o.shipping_address || 'Atelier Pickup',
        cardMessage: o.card_message || undefined,
        notes: o.notes || undefined,
        refundMethod,
        refundNumber
      };
    });

    return { success: true, orders };
  } catch (err: any) {
    console.error('Unexpected error in fetchAllOrdersAdmin:', err);
    return { success: false, orders: [], error: err?.message || 'Failed to fetch orders from database' };
  }
}

/**
 * Helper to build OrderEmailPayload from Supabase order record
 */
function buildEmailPayloadFromDb(
  orderData: any,
  overrides?: Partial<OrderEmailPayload>
): OrderEmailPayload {
  let refundMethod: 'GCash' | 'Maya' | string = 'GCash';
  let refundNumber = '';
  let refundNotes = '';

  if (orderData.notes) {
    try {
      const parsed = JSON.parse(orderData.notes);
      if (parsed.refundMethod) refundMethod = parsed.refundMethod;
      if (parsed.refundNumber) refundNumber = parsed.refundNumber;
      if (parsed.notes) refundNotes = parsed.notes;
    } catch {
      const match = orderData.notes.match(/Refund via (GCash|Maya):\s*([0-9+ -]+)/i);
      if (match) {
        refundMethod = match[1];
        refundNumber = match[2].trim();
      }
    }
  }

  const items = (orderData.order_items || []).map((it: any) => ({
    name: it.product_name || 'Floral Arrangement',
    qty: Number(it.quantity) || 1,
    price: Number(it.price) || 0
  }));

  return {
    orderId: orderData.id,
    customerName: orderData.customer_name || 'Valued Patron',
    customerEmail: orderData.customer_email || '',
    recipientName: orderData.recipient_name || orderData.customer_name,
    recipientPhone: orderData.recipient_phone || '',
    shippingAddress: orderData.shipping_address || 'Atelier Pickup',
    deliveryDate: orderData.delivery_date || '',
    cardMessage: orderData.card_message || undefined,
    items:
      items.length > 0
        ? items
        : [{ name: 'Bespoke Floral Arrangement', qty: 1, price: Number(orderData.total) || 0 }],
    subtotal:
      orderData.subtotal !== null && orderData.subtotal !== undefined
        ? Number(orderData.subtotal)
        : Math.max(0, Number(orderData.total || 0) - Number(orderData.delivery_fee || 10)),
    deliveryFee:
      orderData.delivery_fee !== null && orderData.delivery_fee !== undefined
        ? Number(orderData.delivery_fee)
        : 10,
    total: Number(orderData.total) || 0,
    paymentMethod: orderData.payment_method || 'GCash / E-Wallet',
    paymentStatus: orderData.payment_status || 'Pending Verification',
    refundDetails: {
      refundMethod,
      refundNumber,
      notes: refundNotes,
      amount: Number(orderData.total) || 0
    },
    adminNotes: orderData.notes || undefined,
    ...overrides
  };
}

/**
 * Update an order's fulfillment / production status in the database
 */
export async function updateOrderStatusAction(
  orderId: string,
  newStatus: string,
  refundDetails?: {
    refundMethod: 'GCash' | 'Maya' | string;
    refundNumber: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string; emailSent?: boolean }> {
  try {
    const adminClient = createAdminClient();

    // Fetch previous status and full order items
    const { data: existingOrder } = await adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    const previousStatus = existingOrder?.status;

    const updatePayload: Record<string, any> = {
      status: newStatus as any,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'Cancelled') {
      updatePayload.payment_status = 'Payment Rejected';
      if (refundDetails) {
        updatePayload.notes = JSON.stringify({
          refundMethod: refundDetails.refundMethod,
          refundNumber: refundDetails.refundNumber,
          notes: refundDetails.notes || `Refund requested via ${refundDetails.refundMethod} (${refundDetails.refundNumber})`,
          cancelledAt: new Date().toISOString()
        });
      }
    }

    const { error } = await adminClient
      .from('orders')
      .update(updatePayload as any)
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: error.message };
    }

    // Dynamic Inventory Movement Sync
    // 1. Order was transitioned to Cancelled: Restore inventory stock
    if (newStatus === 'Cancelled' && previousStatus !== 'Cancelled') {
      const { data: orderItems } = await adminClient
        .from('order_items')
        .select('product_id, product_name, quantity')
        .eq('order_id', orderId);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          let prodId = item.product_id;
          let prod: any = null;

          if (prodId) {
            const { data } = await adminClient.from('products').select('id, name, stock').eq('id', prodId).maybeSingle();
            prod = data;
          }
          if (!prod && item.product_name) {
            const { data } = await adminClient.from('products').select('id, name, stock').ilike('name', item.product_name).maybeSingle();
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
              .update({ stock: newStock, updated_at: new Date().toISOString() })
              .eq('id', prod.id);

            try {
              await adminClient.from('inventory_movements').insert({
                product_id: prod.id,
                order_id: orderId,
                movement_type: 'order_cancelled',
                quantity: returnQty,
                previous_stock: prevStock,
                new_stock: newStock,
                notes: `Admin status update: Order ${orderId} Cancelled - Restored ${returnQty} stems`
              });
            } catch {}
          }
        }
      }
    }

    // 2. Order was un-cancelled (restored to active status): Re-deduct stock
    if (previousStatus === 'Cancelled' && newStatus !== 'Cancelled') {
      const { data: orderItems } = await adminClient
        .from('order_items')
        .select('product_id, product_name, quantity')
        .eq('order_id', orderId);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          let prodId = item.product_id;
          let prod: any = null;

          if (prodId) {
            const { data } = await adminClient.from('products').select('id, name, stock').eq('id', prodId).maybeSingle();
            prod = data;
          }
          if (!prod && item.product_name) {
            const { data } = await adminClient.from('products').select('id, name, stock').ilike('name', item.product_name).maybeSingle();
            if (data) {
              prod = data;
              prodId = data.id;
            }
          }

          if (prod && typeof prod.stock === 'number') {
            const prevStock = Number(prod.stock);
            const deductQty = Number(item.quantity) || 1;
            const newStock = Math.max(0, prevStock - deductQty);

            await adminClient
              .from('products')
              .update({ stock: newStock, updated_at: new Date().toISOString() })
              .eq('id', prod.id);

            try {
              await adminClient.from('inventory_movements').insert({
                product_id: prod.id,
                order_id: orderId,
                movement_type: 'order_placed',
                quantity: -deductQty,
                previous_stock: prevStock,
                new_stock: newStock,
                notes: `Admin status update: Order ${orderId} Reactivated (${newStatus}) - Deducted ${deductQty} stems`
              });
            } catch {}
          }
        }
      }
    }

    // Trigger Automated Lifecycle Email Notifications
    let emailSent = false;
    if (existingOrder && existingOrder.customer_email) {
      try {
        const emailPayload = buildEmailPayloadFromDb(existingOrder, {
          refundDetails: refundDetails
            ? {
                refundMethod: refundDetails.refundMethod,
                refundNumber: refundDetails.refundNumber,
                notes: refundDetails.notes,
                amount: Number(existingOrder.total) || 0
              }
            : undefined
        });

        if (newStatus === 'Floral Artistry in Progress') {
          const res = await sendFloralArtistryEmail(emailPayload);
          emailSent = res.success;
        } else if (newStatus === 'Out for Delivery') {
          const res = await sendOutForDeliveryEmail(emailPayload);
          emailSent = res.success;
        } else if (newStatus === 'Delivered') {
          const res = await sendDeliveredEmail(emailPayload);
          emailSent = res.success;
        } else if (newStatus === 'Cancelled') {
          if (refundDetails && refundDetails.refundNumber) {
            const res = await sendRefundEmail(emailPayload, {
              refundMethod: refundDetails.refundMethod,
              refundNumber: refundDetails.refundNumber,
              notes: refundDetails.notes,
              amount: Number(existingOrder.total) || 0
            });
            emailSent = res.success;
          } else {
            const res = await sendOrderCancelledEmail(emailPayload, refundDetails?.notes);
            emailSent = res.success;
          }
        }
      } catch (emailErr) {
        console.warn(`[Order Status] Automated email trigger error for ${orderId}:`, emailErr);
      }
    }

    revalidatePath('/admin');
    revalidatePath('/products');
    revalidatePath('/account');
    revalidatePath('/');
    return { success: true, emailSent };
  } catch (err: any) {
    console.error('Unexpected error in updateOrderStatusAction:', err);
    return { success: false, error: err?.message || 'Failed to update order status' };
  }
}

/**
 * Update payment verification status in the database & record audit trail
 */
export async function updateOrderPaymentStatusAction(
  orderId: string,
  newPaymentStatus: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string; emailSent?: boolean }> {
  try {
    const adminClient = createAdminClient();

    // Fetch order details with items for email notification
    const { data: existingOrder } = await adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        payment_status: newPaymentStatus as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return { success: false, error: updateError.message };
    }

    // Insert audit record into payment_verifications table
    try {
      await adminClient.from('payment_verifications').insert({
        order_id: orderId,
        action: newPaymentStatus,
        notes: adminNotes || `Payment status changed to "${newPaymentStatus}" by Master Florist Admin`,
        verified_at: new Date().toISOString()
      });
    } catch (auditErr) {
      console.warn('Payment verification audit log note:', auditErr);
    }

    // Trigger Automated Payment Email Notifications
    let emailSent = false;
    if (existingOrder && existingOrder.customer_email) {
      try {
        const emailPayload = buildEmailPayloadFromDb(existingOrder, {
          paymentStatus: newPaymentStatus,
          adminNotes: adminNotes || undefined
        });

        if (newPaymentStatus === 'Verified & Cleared') {
          const res = await sendPaymentVerifiedEmail(emailPayload);
          emailSent = res.success;
        } else if (newPaymentStatus === 'Payment Rejected') {
          const res = await sendPaymentRejectedEmail(emailPayload, adminNotes);
          emailSent = res.success;
        }
      } catch (emailErr) {
        console.warn(`[Payment Status] Automated email trigger error for ${orderId}:`, emailErr);
      }
    }

    revalidatePath('/admin');
    return { success: true, emailSent };
  } catch (err: any) {
    console.error('Unexpected error in updateOrderPaymentStatusAction:', err);
    return { success: false, error: err?.message || 'Failed to update payment status' };
  }
}

/**
 * Manually send an order notification email (e.g. from Admin Dashboard)
 */
export async function sendManualOrderEmailAction(
  orderId: string,
  emailType: OrderEmailType,
  options?: {
    overrideRecipient?: string;
    customNotes?: string;
    refundDetails?: {
      refundMethod: 'GCash' | 'Maya' | string;
      refundNumber: string;
      notes?: string;
      amount?: number;
    };
  }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const adminClient = createAdminClient();
    const { data: order, error } = await adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return { success: false, error: error?.message || `Order ${orderId} not found` };
    }

    const payload = buildEmailPayloadFromDb(order, {
      adminNotes: options?.customNotes || order.notes || undefined,
      refundDetails: options?.refundDetails
    });

    const result = await sendOrderNotificationEmail(emailType, payload, {
      overrideRecipient: options?.overrideRecipient
    });

    return {
      success: result.success,
      error: result.error,
      messageId: result.messageId
    };
  } catch (err: any) {
    console.error('Error in sendManualOrderEmailAction:', err);
    return { success: false, error: err?.message || 'Failed to send order email' };
  }
}

/**
 * Preview order email template HTML for admin preview modal
 */
export async function previewOrderEmailAction(
  orderId: string,
  emailType: OrderEmailType,
  options?: {
    customNotes?: string;
    refundDetails?: {
      refundMethod: 'GCash' | 'Maya' | string;
      refundNumber: string;
      notes?: string;
      amount?: number;
    };
  }
): Promise<{ success: boolean; html?: string; subject?: string; error?: string }> {
  try {
    const adminClient = createAdminClient();
    let orderPayload: OrderEmailPayload;

    if (orderId && orderId !== 'SAMPLE-DEMO') {
      const { data: order, error } = await adminClient
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .maybeSingle();

      if (error || !order) {
        return { success: false, error: error?.message || `Order ${orderId} not found` };
      }

      orderPayload = buildEmailPayloadFromDb(order, {
        adminNotes: options?.customNotes,
        refundDetails: options?.refundDetails
      });
    } else {
      // High-fidelity sample payload for demo preview
      orderPayload = {
        orderId: 'ORD-7821',
        customerName: 'Madame Evelyn Vance',
        customerEmail: 'evelyn.vance@example.com',
        recipientName: 'Sophia Vance-Montague',
        recipientPhone: '0917-889-4321',
        shippingAddress: 'Penthouse 42B, The Grand Residences, Ayala Avenue, Makati City',
        deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        cardMessage: 'Wishing you the happiest birthday dearest Sophia! May your year bloom with boundless joy and wonder.',
        items: [
          { name: 'Élégance Royale - Premium Grand Peonies', qty: 1, price: 185.0 },
          { name: 'Atelier Signature Silk Ribbon & Gold Trim', qty: 1, price: 15.0 }
        ],
        subtotal: 200.0,
        deliveryFee: 15.0,
        total: 215.0,
        paymentMethod: 'GCash e-Wallet',
        paymentStatus: 'Verified & Cleared',
        refundDetails: {
          refundMethod: 'GCash',
          refundNumber: '0917-889-4321',
          notes: 'Customer cancellation processed. Full balance returned.',
          amount: 215.0
        },
        adminNotes: options?.customNotes || 'Payment verified via reference GC-982314-MK.'
      };
    }

    const result = await sendOrderNotificationEmail(emailType, orderPayload, { previewOnly: true });

    return {
      success: true,
      html: result.html,
      subject: result.subject
    };
  } catch (err: any) {
    console.error('Error in previewOrderEmailAction:', err);
    return { success: false, error: err?.message || 'Failed to generate email preview' };
  }
}

/**
 * Delete an order from the database & restore inventory if not cancelled
 */
export async function deleteOrderAction(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // Check order status before deleting
    const { data: existingOrder } = await adminClient
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .maybeSingle();

    // If order was not cancelled, return stock to inventory
    if (existingOrder && existingOrder.status !== 'Cancelled') {
      const { data: orderItems } = await adminClient
        .from('order_items')
        .select('product_id, product_name, quantity')
        .eq('order_id', orderId);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (item.product_id) {
            const { data: prod } = await adminClient
              .from('products')
              .select('id, stock')
              .eq('id', item.product_id)
              .maybeSingle();

            if (prod && typeof prod.stock === 'number') {
              const returnQty = Number(item.quantity) || 1;
              await adminClient
                .from('products')
                .update({ stock: prod.stock + returnQty, updated_at: new Date().toISOString() })
                .eq('id', prod.id);
            }
          }
        }
      }
    }

    // Clean up dependent records first
    await adminClient.from('payment_verifications').delete().eq('order_id', orderId);
    await adminClient.from('order_items').delete().eq('order_id', orderId);

    const { error } = await adminClient.from('orders').delete().eq('id', orderId);
    if (error) {
      console.error('Error deleting order:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/products');
    revalidatePath('/account');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in deleteOrderAction:', err);
    return { success: false, error: err?.message || 'Failed to delete order' };
  }
}
