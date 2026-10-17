import { OrderEmailPayload, OrderEmailType } from './types';

/**
 * Helper to escape HTML characters in dynamic strings
 */
function escapeHtml(str: string = ''): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format currency with fallback
 */
function formatCurrency(amount: number = 0): string {
  return `$${Number(amount || 0).toFixed(2)}`;
}

/**
 * Render visual progress stepper bar for floral order fulfillment
 */
function renderTimelineStepper(activeStep: 'verified' | 'artistry' | 'delivery' | 'delivered' | 'cancelled' | 'refund'): string {
  if (activeStep === 'cancelled' || activeStep === 'refund') {
    const isRefund = activeStep === 'refund';
    return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 25px 0;">
        <tr>
          <td align="center" style="padding: 12px 16px; background-color: ${isRefund ? '#ecfdf5' : '#fef2f2'}; border-radius: 12px; border: 1px solid ${isRefund ? '#a7f3d0' : '#fecaca'};">
            <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: ${isRefund ? '#065f46' : '#991b1b'};">
              ${isRefund ? '💳 Order Refund Processing &amp; Transfer' : '✕ Order Cancelled from Atelier Schedule'}
            </span>
          </td>
        </tr>
      </table>
    `;
  }

  const steps = [
    { key: 'placed', label: 'Received' },
    { key: 'verified', label: 'Payment' },
    { key: 'artistry', label: 'Artistry' },
    { key: 'delivery', label: 'Delivery' },
    { key: 'delivered', label: 'Delivered' }
  ];

  const stepOrder = ['placed', 'verified', 'artistry', 'delivery', 'delivered'];
  const currentIndex = stepOrder.indexOf(activeStep);

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 28px 0;">
      <tr>
        ${steps
          .map((s, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            const dotColor = isCurrent ? '#1b3b2b' : isCompleted ? '#2D5A43' : '#d1d5db';
            const textColor = isCurrent ? '#1b3b2b' : isCompleted ? '#2D5A43' : '#9ca3af';
            const fontWeight = isCurrent ? '700' : '500';

            return `
              <td align="center" style="vertical-align: top; width: 20%;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td align="center" style="width: 24px; height: 24px; border-radius: 50%; background-color: ${dotColor}; color: #ffffff; font-family: -apple-system, sans-serif; font-size: 11px; font-weight: bold; line-height: 24px; text-align: center;">
                      ${isCompleted ? '✓' : idx + 1}
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: ${fontWeight}; color: ${textColor}; line-height: 1.2;">
                      ${s.label}
                    </td>
                  </tr>
                </table>
              </td>
            `;
          })
          .join('')}
      </tr>
    </table>
  `;
}

/**
 * Master Florist Care Guide included in completed deliveries
 */
function renderCareGuide(): string {
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f9f7; border: 1px solid #dbe7df; border-radius: 16px; margin: 24px 0; overflow: hidden;">
      <tr>
        <td style="padding: 20px 24px; border-bottom: 1px solid #e2ece5; background: linear-gradient(135deg, #1b3b2b 0%, #2D5A43 100%);">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: bold; color: #ffffff; display: block;">
                  🌿 Master Florist Care Ritual
                </span>
                <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #d4e6db; display: block; margin-top: 2px;">
                  Keep your handcrafted arrangement radiant for days to come
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom: 12px; vertical-align: top; width: 28px;">
                <span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; background-color: #2D5A43; color: #ffffff; font-size: 11px; font-weight: bold; line-height: 22px; text-align: center;">1</span>
              </td>
              <td style="padding-bottom: 12px; padding-left: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #374151; line-height: 1.5;">
                <strong style="color: #1b3b2b;">Hydration First:</strong> Check the water level daily. Replenish with fresh, cold tap water mixed with flower food.
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 12px; vertical-align: top; width: 28px;">
                <span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; background-color: #2D5A43; color: #ffffff; font-size: 11px; font-weight: bold; line-height: 22px; text-align: center;">2</span>
              </td>
              <td style="padding-bottom: 12px; padding-left: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #374151; line-height: 1.5;">
                <strong style="color: #1b3b2b;">Trim at 45°:</strong> Recut stems 1–2 cm at an angle every 2 days to maintain optimal water absorption.
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 12px; vertical-align: top; width: 28px;">
                <span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; background-color: #2D5A43; color: #ffffff; font-size: 11px; font-weight: bold; line-height: 22px; text-align: center;">3</span>
              </td>
              <td style="padding-bottom: 12px; padding-left: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #374151; line-height: 1.5;">
                <strong style="color: #1b3b2b;">Cool Placement:</strong> Keep away from direct sunlight, heating radiators, air conditioning drafts, and fruit bowls.
              </td>
            </tr>
            <tr>
              <td style="vertical-align: top; width: 28px;">
                <span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; background-color: #2D5A43; color: #ffffff; font-size: 11px; font-weight: bold; line-height: 22px; text-align: center;">4</span>
              </td>
              <td style="padding-left: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #374151; line-height: 1.5;">
                <strong style="color: #1b3b2b;">Remove Spent Petals:</strong> Gently pluck withered guard petals to encourage fresh inner florets to bloom.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate Subject line for each email type
 */
export function getEmailSubject(type: OrderEmailType, order: OrderEmailPayload): string {
  switch (type) {
    case 'payment_verified':
      return `✨ Payment Verified & Cleared - Order #${order.orderId} | Ron's Bloom Crafts`;
    case 'payment_rejected':
      return `⚠️ Verification Notice: Order #${order.orderId} Payment Proof | Ron's Bloom Crafts`;
    case 'floral_artistry':
      return `🌸 Floral Artistry in Progress: Order #${order.orderId} Handcrafted with Love`;
    case 'out_for_delivery':
      return `🚚 Out for Delivery: Your Blooms Are on the Way! - Order #${order.orderId}`;
    case 'delivered':
      return `💐 Delivered with Love: Order #${order.orderId} Successfully Arrived!`;
    case 'cancelled':
      return `Notice: Order #${order.orderId} Cancellation | Ron's Bloom Crafts`;
    case 'refund':
      return `💳 Refund Processed: Order #${order.orderId} | Ron's Bloom Crafts`;
    default:
      return `Order Update: #${order.orderId} | Ron's Bloom Crafts`;
  }
}

/**
 * Generate full HTML email template
 */
export function generateOrderEmailHtml(type: OrderEmailType, order: OrderEmailPayload): string {
  const safeCustomer = escapeHtml(order.customerName || 'Valued Patron');
  const safeOrderId = escapeHtml(order.orderId);
  const safeRecipient = escapeHtml(order.recipientName || order.customerName || 'Recipient');
  const safePhone = escapeHtml(order.recipientPhone || '');
  const safeAddress = escapeHtml(order.shippingAddress || 'Atelier Pick-up');
  const safeDeliveryDate = escapeHtml(order.deliveryDate || 'Scheduled date');
  const safePaymentMethod = escapeHtml(order.paymentMethod || 'GCash / E-Wallet');
  const safeNotes = escapeHtml(order.adminNotes || '');
  const subtotal = order.subtotal !== undefined ? order.subtotal : Math.max(0, order.total - (order.deliveryFee ?? 10));
  const deliveryFee = order.deliveryFee !== undefined ? order.deliveryFee : 10;
  const total = order.total;

  // Determine header and hero content based on type
  let badgeText = '';
  let badgeBg = '#2D5A43';
  let badgeColor = '#ffffff';
  let headline = '';
  let subheadline = '';
  let bannerIcon = '🌸';
  let dynamicSection = '';
  let activeTimelineStep: 'verified' | 'artistry' | 'delivery' | 'delivered' | 'cancelled' | 'refund' = 'verified';

  switch (type) {
    case 'payment_verified':
      activeTimelineStep = 'verified';
      badgeText = 'Payment Verified &amp; Cleared';
      badgeBg = '#065f46';
      badgeColor = '#ffffff';
      bannerIcon = '✓';
      headline = 'Payment Verified &amp; Cleared';
      subheadline = `Thank you, ${safeCustomer}. We have verified and cleared your electronic payment of <strong>${formatCurrency(total)}</strong> via <strong>${safePaymentMethod}</strong>.`;
      dynamicSection = `
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #065f46; line-height: 1.6;">
            <strong>Next Step:</strong> Your order has entered our atelier preparation queue. Our floral designers are selecting the freshest seasonal blooms to begin crafting your bespoke arrangement.
          </p>
        </div>
      `;
      break;

    case 'payment_rejected':
      activeTimelineStep = 'verified';
      badgeText = 'Verification Incomplete';
      badgeBg = '#b91c1c';
      badgeColor = '#ffffff';
      bannerIcon = '⚠️';
      headline = 'Action Required: Payment Verification';
      subheadline = `Hello ${safeCustomer}, our accounting team was unable to verify the payment proof uploaded for order <strong>#${safeOrderId}</strong>.`;
      dynamicSection = `
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: #991b1b;">
            Verification Note:
          </h4>
          <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #7f1d1d; line-height: 1.6;">
            ${safeNotes ? safeNotes : 'The transaction reference number or screenshot provided does not correspond to a cleared bank or e-wallet transfer. Please review your transfer receipt.'}
          </p>
          <div style="background-color: #ffffff; padding: 12px 14px; border-radius: 6px; border: 1px dashed #fca5a5;">
            <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #991b1b; line-height: 1.5;">
              <strong>How to resolve:</strong> Simply reply directly to this email with your updated payment slip or transaction reference, or reach our florist hotline at <strong>0917-BLOOM-CRAFT (0917-256-6627)</strong> so we can prioritize your order.
            </p>
          </div>
        </div>
      `;
      break;

    case 'floral_artistry':
      activeTimelineStep = 'artistry';
      badgeText = 'Floral Artistry in Progress';
      badgeBg = '#2D5A43';
      badgeColor = '#ffffff';
      bannerIcon = '🌸';
      headline = 'Handcrafting Your Arrangement';
      subheadline = `Wonderful news, ${safeCustomer}! Your bespoke floral arrangement for order <strong>#${safeOrderId}</strong> is now being artfully composed by our master florists.`;
      dynamicSection = `
        <div style="background: linear-gradient(135deg, #f7f9f7 0%, #edf5f0 100%); border: 1px solid #c7ddcf; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="vertical-align: top; width: 36px;">
                <span style="font-size: 26px; line-height: 1;">✂️</span>
              </td>
              <td style="padding-left: 12px;">
                <h4 style="margin: 0 0 4px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: bold; color: #1b3b2b;">
                  Atelier Craftsmanship Pledge
                </h4>
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #374151; line-height: 1.6;">
                  Every stem is conditioned in mineral-rich cold water, arranged by hand according to Japanese botanical harmony principles, and finished with luxury silk ribbon and protective packaging.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;
      break;

    case 'out_for_delivery':
      activeTimelineStep = 'delivery';
      badgeText = 'Out for Delivery';
      badgeBg = '#1e40af';
      badgeColor = '#ffffff';
      bannerIcon = '🚚';
      headline = 'Your Blooms Are on the Way!';
      subheadline = `Exciting update! Order <strong>#${safeOrderId}</strong> has departed our atelier and is safely in transit with our specialized floral courier.`;
      dynamicSection = `
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: #1e40af;">
            Specialized Flower Transport
          </h4>
          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #1e3a8a; line-height: 1.6;">
            Your arrangement travels in upright, temperature-stabilized carriers to preserve petal freshness and structural elegance until the moment of presentation.
          </p>
          <div style="margin-top: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #2563eb;">
            <strong>Target Delivery:</strong> ${safeDeliveryDate} &bull; Recipient: <strong>${safeRecipient}</strong>
          </div>
        </div>
      `;
      break;

    case 'delivered':
      activeTimelineStep = 'delivered';
      badgeText = 'Delivered with Love';
      badgeBg = '#065f46';
      badgeColor = '#ffffff';
      bannerIcon = '💐';
      headline = 'Delivered &amp; Complete!';
      subheadline = `We are delighted to share that order <strong>#${safeOrderId}</strong> has been successfully delivered into the hands of <strong>${safeRecipient}</strong>!`;
      dynamicSection = `
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #065f46; line-height: 1.6;">
            Thank you for allowing Ron's Bloom Crafts to be part of this special moment. We hope these blossoms bring heartfelt warmth, beauty, and unforgettable memories.
          </p>
        </div>
        ${renderCareGuide()}
      `;
      break;

    case 'cancelled':
      activeTimelineStep = 'cancelled';
      badgeText = 'Order Cancelled';
      badgeBg = '#4b5563';
      badgeColor = '#ffffff';
      bannerIcon = '✕';
      headline = 'Order Cancellation Notice';
      subheadline = `Hello ${safeCustomer}, order <strong>#${safeOrderId}</strong> has been cancelled and removed from our active fulfillment schedule.`;
      dynamicSection = `
        <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: #374151;">
            Cancellation Details:
          </h4>
          <p style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #4b5563; line-height: 1.6;">
            ${safeNotes ? safeNotes : 'This order was cancelled as requested. Any reserved flower inventory has been returned to stock.'}
          </p>
          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #6b7280;">
            If this cancellation was unexpected or you wish to reorder, please contact us immediately or browse our collection anytime.
          </p>
        </div>
      `;
      break;

    case 'refund':
      activeTimelineStep = 'refund';
      badgeText = 'Refund Scheduled / Processed';
      badgeBg = '#0d9488';
      badgeColor = '#ffffff';
      bannerIcon = '💳';
      headline = 'Refund Processed';
      const refundAmount = order.refundDetails?.amount !== undefined ? order.refundDetails.amount : total;
      const refundMethod = order.refundDetails?.refundMethod || 'GCash';
      const refundNum = order.refundDetails?.refundNumber || 'Registered Mobile';
      subheadline = `Hello ${safeCustomer}, a full refund of <strong>${formatCurrency(refundAmount)}</strong> has been scheduled and processed for order <strong>#${safeOrderId}</strong>.`;
      dynamicSection = `
        <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border: 1px solid #99f6e4; padding: 22px 20px; border-radius: 12px; margin: 20px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom: 12px;">
                <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #0f766e;">
                  Refund Transfer Details
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 8px; border: 1px solid #99f6e4; padding: 14px 16px;">
                  <tr>
                    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #64748b; padding-bottom: 6px;">
                      Refund Amount:
                    </td>
                    <td align="right" style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: bold; color: #0f766e; padding-bottom: 6px;">
                      ${formatCurrency(refundAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #64748b; padding-bottom: 6px;">
                      Refund Destination:
                    </td>
                    <td align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 700; color: #0f766e; padding-bottom: 6px;">
                      ${escapeHtml(refundMethod)} e-Wallet
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #64748b;">
                      Account Mobile:
                    </td>
                    <td align="right" style="font-family: monospace; font-size: 13px; font-weight: bold; color: #1e293b;">
                      ${escapeHtml(refundNum)}
                    </td>
                  </tr>
                  ${order.refundDetails?.notes ? `
                    <tr>
                      <td colspan="2" style="padding-top: 10px; border-top: 1px dashed #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #475569;">
                        <em>Note: ${escapeHtml(order.refundDetails.notes)}</em>
                      </td>
                    </tr>
                  ` : ''}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #115e59; line-height: 1.5;">
                ⏱ <strong>Crediting Speed:</strong> GCash and Maya e-Wallet refunds typically reflect in your account within 1 to 24 hours. If you do not see the credited balance after 24 hours, feel free to reply with your transaction proof.
              </td>
            </tr>
          </table>
        </div>
      `;
      break;
  }

  // Render items table
  const itemsRows = (order.items || [])
    .map((item) => {
      const itemTotal = Number(item.price) * Number(item.qty);
      return `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #1f2937;">
            <strong>${escapeHtml(item.name)}</strong>
            <span style="display: block; font-size: 11px; color: #6b7280;">Qty: ${item.qty} &times; ${formatCurrency(item.price)}</span>
          </td>
          <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #1f2937;">
            ${formatCurrency(itemTotal)}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(headline)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f6f7f6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: #2D5A43;
      text-decoration: underline;
    }
  </style>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f6f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  
  <!-- Outer Wrapper Table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f6f7f6;">
    <tr>
      <td align="center">
        
        <!-- Main Email Container (600px Max) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e7ebe8; margin: 20px auto;">
          
          <!-- Atelier Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #163023 0%, #2D5A43 100%); padding: 36px 32px 30px 32px; text-align: center; border-bottom: 3px solid #d4af37;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Brand Floral Monogram Emblem -->
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.12); border: 1px solid rgba(212,175,55,0.4); margin: 0 auto 12px auto; line-height: 48px; font-size: 24px; text-align: center;">
                      🌸
                    </div>
                    <!-- Brand Name -->
                    <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
                      Ron's Bloom Crafts
                    </h1>
                    <p style="margin: 4px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #dfb743;">
                      Artisan Floral Atelier &amp; Botanical Gifts
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              
              <!-- Status Pill Badge -->
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 5px 12px; border-radius: 20px;">
                  ${badgeText}
                </span>
                <span style="float: right; font-family: monospace; font-size: 12px; font-weight: bold; color: #6b7280; line-height: 24px;">
                  #${safeOrderId}
                </span>
                <div style="clear: both;"></div>
              </div>

              <!-- Primary Headline -->
              <h2 style="margin: 0 0 8px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; line-height: 1.3;">
                ${headline}
              </h2>

              <!-- Subheadline / Message -->
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #4b5563; line-height: 1.6;">
                ${subheadline}
              </p>

              <!-- Progress Timeline Stepper -->
              ${renderTimelineStepper(activeTimelineStep)}

              <!-- Dynamic Content (Context Specific) -->
              ${dynamicSection}

              <!-- Order Summary Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafbfa; border: 1px solid #e5eae6; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
                <tr>
                  <td colspan="2" style="padding-bottom: 10px; border-bottom: 1px solid #e5eae6;">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2D5A43;">
                      Handcrafted Arrangements Ordered
                    </span>
                  </td>
                </tr>

                <!-- Item Lines -->
                ${itemsRows}

                <!-- Subtotal, Delivery Fee, Total -->
                <tr>
                  <td style="padding-top: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #6b7280;">
                    Arrangements Subtotal
                  </td>
                  <td align="right" style="padding-top: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #4b5563;">
                    ${formatCurrency(subtotal)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #6b7280;">
                    Courier Delivery Fee
                  </td>
                  <td align="right" style="padding-top: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #4b5563;">
                    ${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Complimentary'}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 8px; border-top: 1px dashed #d1d5db; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: #111827;">
                    Order Total
                  </td>
                  <td align="right" style="padding-top: 8px; border-top: 1px dashed #d1d5db; font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: bold; color: #1b3b2b;">
                    ${formatCurrency(total)}
                  </td>
                </tr>
              </table>

              <!-- Delivery & Recipient Information Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5eae6; border-radius: 14px; padding: 18px 20px; margin: 16px 0;">
                <tr>
                  <td style="padding-bottom: 8px; border-bottom: 1px solid #f3f4f6;">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2D5A43;">
                      Delivery &amp; Recipient Details
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #374151; line-height: 1.5;">
                    <div><strong>Recipient:</strong> ${safeRecipient} ${safePhone ? `(${safePhone})` : ''}</div>
                    <div style="margin-top: 4px;"><strong>Delivery Address:</strong> ${safeAddress}</div>
                    <div style="margin-top: 4px;"><strong>Scheduled Date:</strong> ${safeDeliveryDate}</div>
                    ${order.cardMessage ? `
                      <div style="margin-top: 10px; padding: 10px 14px; background-color: #faf5ea; border-left: 3px solid #dfb743; border-radius: 6px; font-family: Georgia, serif; font-style: italic; font-size: 13px; color: #78350f;">
                        &ldquo;${escapeHtml(order.cardMessage)}&rdquo;
                      </div>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- Atelier Hotline Note -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #6b7280; line-height: 1.5;">
                      Have questions about this arrangement or need urgent modifications?<br>
                      Call our Master Florist Atelier: <strong style="color: #1b3b2b;">0917-BLOOM-CRAFT (0917-256-6627)</strong> or reply directly to this email.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #163023; padding: 24px 32px; text-align: center; border-top: 1px solid #234d38;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 6px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-weight: bold; color: #ffffff;">
                      Ron's Bloom Crafts
                    </p>
                    <p style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #a3b8ad; line-height: 1.4;">
                      Bespoke Floral Sculptures &bull; Premium Preserved Stems &bull; Same-Day Metropolitan Delivery<br>
                      Crafted with Devotion, Delivered with Elegance.
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #6d8578;">
                      &copy; ${new Date().getFullYear()} Ron's Bloom Crafts Atelier. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
  `;
}
