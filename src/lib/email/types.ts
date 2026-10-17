export type OrderEmailType =
  | 'payment_verified'
  | 'payment_rejected'
  | 'floral_artistry'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refund';

export interface EmailOrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface OrderEmailPayload {
  orderId: string;
  customerName: string;
  customerEmail: string;
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
  deliveryDate?: string;
  cardMessage?: string;
  items: EmailOrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
  refundDetails?: {
    refundMethod: 'GCash' | 'Maya' | string;
    refundNumber: string;
    notes?: string;
    amount?: number;
  };
  adminNotes?: string;
  trackingUrl?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipient?: string;
  subject?: string;
  html?: string;
}
