'use server';

import {
  fetchAllOrdersAdmin as _fetchAllOrdersAdmin,
  updateOrderStatusAction as _updateOrderStatusAction,
  updateOrderPaymentStatusAction as _updateOrderPaymentStatusAction,
  deleteOrderAction as _deleteOrderAction,
  sendManualOrderEmailAction as _sendManualOrderEmailAction,
  previewOrderEmailAction as _previewOrderEmailAction
} from '@/actions/order/action';
import { OrderEmailType } from '@/lib/email/types';

export async function fetchAllOrdersAdmin() {
  return _fetchAllOrdersAdmin();
}

export async function updateOrderStatusAction(
  orderId: string,
  newStatus: string,
  refundDetails?: {
    refundMethod: 'GCash' | 'Maya' | string;
    refundNumber: string;
    notes?: string;
  }
) {
  return _updateOrderStatusAction(orderId, newStatus, refundDetails);
}

export async function updateOrderPaymentStatusAction(
  orderId: string,
  newPaymentStatus: string,
  adminNotes?: string
) {
  return _updateOrderPaymentStatusAction(orderId, newPaymentStatus, adminNotes);
}

export async function deleteOrderAction(orderId: string) {
  return _deleteOrderAction(orderId);
}

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
) {
  return _sendManualOrderEmailAction(orderId, emailType, options);
}

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
) {
  return _previewOrderEmailAction(orderId, emailType, options);
}

