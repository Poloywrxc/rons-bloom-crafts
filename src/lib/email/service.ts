import nodemailer from 'nodemailer';
import { transporter } from '@/lib/nodemailer';
import { EmailResult, OrderEmailPayload, OrderEmailType } from './types';
import { generateOrderEmailHtml, getEmailSubject } from './templates';

/**
 * Resolve the sender address for outgoing emails
 */
export function getSenderAddress(): string {
  const envFrom = process.env.SMTP_FROM;
  const user = process.env.SMTP_USER || 'princeescrupolo06@gmail.com';

  if (envFrom && !envFrom.includes('example.com')) {
    return envFrom;
  }

  return `"Ron's Bloom Crafts" <${user}>`;
}

/**
 * Main email sender function for order notifications
 */
export async function sendOrderNotificationEmail(
  type: OrderEmailType,
  order: OrderEmailPayload,
  options?: {
    previewOnly?: boolean;
    overrideRecipient?: string;
  }
): Promise<EmailResult> {
  const recipient = (options?.overrideRecipient || order.customerEmail || '').trim();
  const subject = getEmailSubject(type, order);
  const html = generateOrderEmailHtml(type, order);

  // If preview only, return rendered HTML immediately without sending SMTP packet
  if (options?.previewOnly) {
    return {
      success: true,
      recipient,
      subject,
      html
    };
  }

  if (!recipient || !recipient.includes('@')) {
    console.warn(`[Email Service] Cannot send email: Invalid recipient address "${recipient}" for order ${order.orderId}`);
    return {
      success: false,
      error: `Invalid or missing customer email: "${recipient}"`,
      recipient,
      subject,
      html
    };
  }

  try {
    const from = getSenderAddress();

    console.log(`[Email Service] Sending "${type}" email to ${recipient} for Order #${order.orderId}...`);

    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject,
      html,
      text: `${subject}\n\nHello ${order.customerName},\nOrder #${order.orderId} status update: ${type}.\nTotal: ₱${order.total.toFixed(2)}.\n\nThank you for choosing Ron's Bloom Crafts.`
    });

    console.log(`[Email Service] Successfully sent "${type}" email! Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      recipient,
      subject,
      html
    };
  } catch (err: any) {
    console.error(`[Email Service] Error sending "${type}" email to ${recipient}:`, err);
    return {
      success: false,
      error: err?.message || 'SMTP transmission failure',
      recipient,
      subject,
      html
    };
  }
}

/**
 * Convenient typed helper: Send Official Invoice & Order Confirmation
 */
export async function sendOrderInvoiceEmail(
  order: OrderEmailPayload,
  overrideRecipient?: string
): Promise<EmailResult> {
  return sendOrderNotificationEmail('invoice', order, { overrideRecipient });
}

export const sendOrderPlacedEmail = sendOrderInvoiceEmail;

/**
 * Convenient typed helper: Payment Verified
 */
export async function sendPaymentVerifiedEmail(
  order: OrderEmailPayload,
  overrideRecipient?: string
): Promise<EmailResult> {
  return sendOrderNotificationEmail('payment_verified', order, { overrideRecipient });
}

/**
 * Convenient typed helper: Payment Rejected
 */
export async function sendPaymentRejectedEmail(
  order: OrderEmailPayload,
  adminReason?: string,
  overrideRecipient?: string
): Promise<EmailResult> {
  const payload = { ...order, adminNotes: adminReason || order.adminNotes };
  return sendOrderNotificationEmail('payment_rejected', payload, { overrideRecipient });
}

/**
 * Convenient typed helper: Floral Artistry in Progress
 */
export async function sendFloralArtistryEmail(
  order: OrderEmailPayload,
  overrideRecipient?: string
): Promise<EmailResult> {
  return sendOrderNotificationEmail('floral_artistry', order, { overrideRecipient });
}

/**
 * Convenient typed helper: Out for Delivery
 */
export async function sendOutForDeliveryEmail(
  order: OrderEmailPayload,
  overrideRecipient?: string
): Promise<EmailResult> {
  return sendOrderNotificationEmail('out_for_delivery', order, { overrideRecipient });
}

/**
 * Convenient typed helper: Delivered
 */
export async function sendDeliveredEmail(
  order: OrderEmailPayload,
  overrideRecipient?: string
): Promise<EmailResult> {
  return sendOrderNotificationEmail('delivered', order, { overrideRecipient });
}

/**
 * Convenient typed helper: Cancelled
 */
export async function sendOrderCancelledEmail(
  order: OrderEmailPayload,
  reason?: string,
  overrideRecipient?: string
): Promise<EmailResult> {
  const payload = { ...order, adminNotes: reason || order.adminNotes };
  return sendOrderNotificationEmail('cancelled', payload, { overrideRecipient });
}

/**
 * Convenient typed helper: Refund
 */
export async function sendRefundEmail(
  order: OrderEmailPayload,
  refundDetails?: {
    refundMethod: 'GCash' | 'Maya' | string;
    refundNumber: string;
    notes?: string;
    amount?: number;
  },
  overrideRecipient?: string
): Promise<EmailResult> {
  const payload = {
    ...order,
    refundDetails: refundDetails || order.refundDetails
  };
  return sendOrderNotificationEmail('refund', payload, { overrideRecipient });
}
