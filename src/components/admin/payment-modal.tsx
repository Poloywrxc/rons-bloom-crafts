'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  DollarSign,
  User,
  Calendar,
  MapPin,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  CreditCard,
  Sparkles,
  Maximize2,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Phone,
  Wallet,
  Mail
} from 'lucide-react';
import { Order } from '@/types/order';
import { updateOrderStatusAction } from '@/actions/order/action';
import { EmailPreviewModal } from './email-preview-modal';
import {
  STAGE_OPTIONS,
  getOrderStage,
  getOrderDropdownValue
} from './order-table';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onUpdatePaymentStatus?: (orderId: string, newStatus: string) => void;
  onUpdateStatus?: (
    orderId: string,
    newStatus: string,
    refundDetails?: { refundMethod: 'GCash' | 'Maya' | string; refundNumber: string; notes?: string }
  ) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  order,
  onUpdatePaymentStatus,
  onUpdateStatus
}: PaymentModalProps) {
  const [isEnlargedProofOpen, setIsEnlargedProofOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Refund management state for cancelled orders
  const [refundWallet, setRefundWallet] = useState<'GCash' | 'Maya'>('GCash');
  const [refundPhone, setRefundPhone] = useState<string>('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isSavingRefund, setIsSavingRefund] = useState(false);
  const [refundSaveSuccess, setRefundSaveSuccess] = useState(false);

  useEffect(() => {
    if (order) {
      setRefundWallet((order.refundMethod as 'GCash' | 'Maya') || 'GCash');
      const phoneMatch = order.recipient?.match(/(09\d{9}|\+?639\d{9}|\d{11})/);
      setRefundPhone(order.refundNumber || (phoneMatch ? phoneMatch[1] : ''));
      setCopiedPhone(false);
      setRefundSaveSuccess(false);
    }
  }, [order]);

  const handleCopyRefundPhone = () => {
    if (refundPhone) {
      navigator.clipboard.writeText(refundPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleSaveRefundDestination = async () => {
    if (!order || !refundPhone.trim()) return;
    setIsSavingRefund(true);
    try {
      await updateOrderStatusAction(order.id, 'Cancelled', {
        refundMethod: refundWallet,
        refundNumber: refundPhone.trim(),
        notes: `Refund destination updated to ${refundWallet}: ${refundPhone.trim()}`
      });
      order.refundMethod = refundWallet;
      order.refundNumber = refundPhone.trim();
      setRefundSaveSuccess(true);
      setTimeout(() => setRefundSaveSuccess(false), 2500);
    } finally {
      setIsSavingRefund(false);
    }
  };

  // ESC key to close and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const isVerified = order.paymentStatus?.toLowerCase().includes('verified');
  const isRejected = order.paymentStatus?.toLowerCase().includes('reject');
  const isPending = !isVerified && !isRejected;

  // Determine payment method label
  const paymentMethod = order.paymentStatus?.toLowerCase().includes('cod')
    ? 'Cash on Delivery (COD)'
    : order.paymentProof?.toLowerCase().includes('gcash') || order.paymentStatus?.toLowerCase().includes('gcash')
    ? 'GCash e-Wallet'
    : order.paymentProof?.toLowerCase().includes('maya') || order.paymentStatus?.toLowerCase().includes('maya')
    ? 'Maya e-Wallet'
    : 'GCash / Maya QR Ph';

  const isBase64Proof = order.paymentProof?.startsWith('data:image/');
  const proofRef = order.paymentProof && !isBase64Proof
    ? order.paymentProof.replace(/\.[^/.]+$/, '').toUpperCase()
    : `TXN-${order.id}-98214`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-stone-100 px-6 py-4.5 bg-stone-50/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D5A43]/10 border border-[#2D5A43]/20 flex items-center justify-center text-[#2D5A43] shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[#2D5A43]">{order.id}</span>
                <span className="text-stone-300">&bull;</span>
                <span className="text-xs text-stone-500 font-medium">Transaction Details</span>
              </div>
              <h3 className="font-serif font-bold text-stone-900 text-base leading-tight">
                Order Transaction &amp; Payment Details
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* CANCELLATION & MONEY REFUND PANEL (When Order is Cancelled) */}
          {(() => {
            const isCancelled = order.status === 'Cancelled' || order.status.toLowerCase().includes('cancel');
            if (!isCancelled) return null;

            return (
              <div className="bg-rose-50/90 rounded-2xl border-2 border-rose-300 p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                          Cancellation Refund Active
                        </span>
                        <span className="text-xs font-mono font-bold text-rose-700">
                          Amount Due: ${order.total.toFixed(2)}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-rose-950 text-base leading-tight mt-0.5">
                        Order Cancelled — Refund The Money To Customer
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Refund Explanation Message */}
                <p className="text-xs text-stone-700 leading-relaxed bg-white/70 p-3 rounded-xl border border-rose-200/80">
                  This order was cancelled. Please refund the patron&apos;s money of <strong className="text-rose-700 font-bold">${order.total.toFixed(2)}</strong>. Ask or verify the customer&apos;s GCash or Maya mobile number below to complete the refund transition.
                </p>

                {/* Selection in transition of refund: GCash or Maya */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                    Select Refund E-Wallet:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRefundWallet('GCash')}
                      className={`p-3 rounded-xl border-2 flex items-center space-x-2.5 text-left transition cursor-pointer ${
                        refundWallet === 'GCash'
                          ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        G
                      </div>
                      <div>
                        <span className="block font-bold text-xs">GCash</span>
                        <span className="block text-[10px] text-stone-500">e-Wallet Channel</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRefundWallet('Maya')}
                      className={`p-3 rounded-xl border-2 flex items-center space-x-2.5 text-left transition cursor-pointer ${
                        refundWallet === 'Maya'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        M
                      </div>
                      <div>
                        <span className="block font-bold text-xs">Maya</span>
                        <span className="block text-[10px] text-stone-500">e-Wallet Channel</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* GCash or Maya Number Input & 1-Click Copy */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                    Customer {refundWallet} Mobile Number:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        readOnly
                        value={refundPhone}
                        placeholder={`No customer ${refundWallet} number on file`}
                        className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-rose-200 rounded-xl text-xs font-mono font-bold text-stone-900 placeholder:text-stone-400 focus:outline-hidden select-all cursor-default"
                      />
                    </div>
                    {refundPhone && (
                      <button
                        type="button"
                        onClick={handleCopyRefundPhone}
                        className="inline-flex items-center space-x-1 px-3 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0"
                        title="Copy mobile number"
                      >
                        {copiedPhone ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-stone-500" />
                            <span>Copy Number</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveRefundDestination}
                      disabled={isSavingRefund || !refundPhone.trim()}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
                    >
                      {isSavingRefund ? 'Saving...' : refundSaveSuccess ? '✓ Saved!' : 'Save Details'}
                    </button>
                  </div>
                </div>

                {/* Status Transition of Refund */}
                <div className="pt-2 border-t border-rose-200/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-stone-500">
                    Refund Transition Status:{' '}
                    <strong className="text-rose-800">
                      {order.paymentStatus || 'Refund Pending Admin Dispatch'}
                    </strong>
                  </div>
                  {onUpdatePaymentStatus && (
                    <button
                      type="button"
                      onClick={() => onUpdatePaymentStatus(order.id, 'Refund Processed & Cleared')}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Refund Sent &amp; Cleared</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}



          {/* Digital Receipt / Electronic Slip Preview Card */}
          <div className="bg-gradient-to-b from-stone-50 to-stone-100/60 rounded-2xl border border-stone-200 p-5 space-y-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#2D5A43]" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Electronic Transfer Proof Receipt
                </span>
              </div>
              <span className="text-[11px] font-mono text-stone-500 font-semibold bg-white px-2 py-0.5 rounded-md border border-stone-200">
                {paymentMethod}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-stone-400 block text-[11px]">Transaction Reference</span>
                <span className="font-mono font-bold text-stone-900 block bg-white px-2.5 py-1.5 rounded-lg border border-stone-200">
                  {proofRef}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-stone-400 block text-[11px]">Total Paid Amount</span>
                <span className="font-serif font-bold text-stone-900 text-lg block bg-white px-2.5 py-0.5 rounded-lg border border-stone-200 text-emerald-800">
                  ${order.total.toFixed(2)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-stone-400 block text-[11px]">Beneficiary / Merchant</span>
                <span className="font-medium text-stone-800 block">
                  Ron's Bloom Crafts Atelier (0917-BLOOM-CRAFT)
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-stone-400 block text-[11px]">Payer / Account</span>
                <span className="font-medium text-stone-800 block">
                  {order.customer} ({order.email})
                </span>
              </div>
            </div>

            {/* Attached Proof Document Preview */}
            <div className="pt-2 border-t border-stone-200/70">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-2">
                Uploaded Verification File (PNG / JPEG)
              </span>
              <div className="p-3 bg-white rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  {isBase64Proof ? (
                    <div
                      onClick={() => setIsEnlargedProofOpen(true)}
                      className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-300 bg-stone-100 shrink-0 cursor-pointer group"
                      title="Click to view full receipt"
                    >
                      <img
                        src={order.paymentProof}
                        alt="Customer receipt"
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <span className="font-mono text-xs font-semibold text-stone-800 block truncate max-w-[200px] sm:max-w-[260px]">
                      {isBase64Proof
                        ? `${paymentMethod.replace(/\s+/g, '-').toLowerCase()}-payment-receipt.png`
                        : order.paymentProof || 'simulated-payment-receipt.png'}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Uploaded by customer &bull; Encrypted SHA-256 verified
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {isBase64Proof && (
                    <button
                      type="button"
                      onClick={() => setIsEnlargedProofOpen(true)}
                      className="text-[11px] font-semibold text-[#2D5A43] hover:text-emerald-900 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition cursor-pointer flex items-center space-x-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>View Receipt</span>
                    </button>
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                    PNG / JPG
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details & Delivery Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50/60 rounded-2xl border border-stone-200 text-xs space-y-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#2D5A43]" />
                Customer & Recipient
              </span>
              <div>
                <span className="font-semibold text-stone-900 block">{order.customer}</span>
                <span className="text-stone-500 block text-[11px]">{order.email}</span>
              </div>
              <div className="pt-1.5 border-t border-stone-200/60 text-stone-700">
                <span className="text-[10px] text-stone-400 block">Destination</span>
                <span className="font-medium text-[11px] block">{order.recipient}</span>
              </div>
              {order.cardMessage && (
                <div className="pt-1.5 border-t border-stone-200/60">
                  <span className="text-[10px] text-stone-400 block">Card Message</span>
                  <span className="italic text-stone-600 block text-[11px]">
                    &ldquo;{order.cardMessage}&rdquo;
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50/60 rounded-2xl border border-stone-200 text-xs space-y-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#2D5A43]" />
                Schedule & Fulfillment
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-stone-400 block">Ordered On</span>
                  <span className="font-mono font-medium text-stone-800">{order.date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">Scheduled Delivery</span>
                  <span className="font-mono font-bold text-[#2D5A43]">{order.deliveryDate}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-stone-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-stone-400 block">Status Transition</span>
                  <span className="font-semibold text-stone-800 text-xs">{getOrderDropdownValue(order)}</span>
                </div>
                {onUpdateStatus && (
                  <div className="relative">
                    <select
                      value={getOrderDropdownValue(order)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Canceled') {
                          onUpdateStatus(order.id, 'Cancelled');
                        } else if (val === 'Payment Proof (Verified)') {
                          if (onUpdatePaymentStatus) onUpdatePaymentStatus(order.id, 'Verified & Cleared');
                        } else if (val === 'Payment Proof (Pending)') {
                          if (onUpdatePaymentStatus) onUpdatePaymentStatus(order.id, 'Proof Uploaded (Pending Admin)');
                        } else if (val === 'Payment Proof (Rejected)') {
                          if (onUpdatePaymentStatus) onUpdatePaymentStatus(order.id, 'Payment Rejected');
                        } else if (val === 'Floral Artistry') {
                          onUpdateStatus(order.id, 'Floral Artistry in Progress');
                        } else if (val === 'Out of Delivery') {
                          onUpdateStatus(order.id, 'Out for Delivery');
                        } else if (val === 'Delivered') {
                          onUpdateStatus(order.id, 'Delivered');
                        } else if (val === 'Order Received') {
                          onUpdateStatus(order.id, 'Order Received');
                        }
                      }}
                      className="py-1 px-2.5 pr-6 border border-stone-300 rounded-lg text-xs font-medium bg-white hover:bg-stone-50 cursor-pointer transition appearance-none"
                    >
                      {STAGE_OPTIONS.map((opt) => {
                        const currentStage = getOrderStage(order);
                        const isLocked = currentStage === 99 ? opt.stage !== 99 : opt.stage < currentStage;
                        const isDisabled = isLocked || (opt.stage === 99 && currentStage === 5);
                        return (
                          <option
                            key={opt.value}
                            value={opt.value}
                            disabled={isDisabled}
                            className={isLocked ? 'text-stone-400 italic' : ''}
                          >
                            {isLocked ? `🔒 ${opt.label}` : opt.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Breakdown Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Order Items & Pricing
            </span>
            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-mono tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/40">
                      <td className="p-3 font-medium text-stone-800">{item.name}</td>
                      <td className="p-3 text-center font-mono text-stone-600">{item.qty}</td>
                      <td className="p-3 text-right font-mono text-stone-600">
                        ${(item.price || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-stone-900">
                        ${((item.price || 0) * item.qty).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-stone-50/50">
                    <td colSpan={3} className="p-2.5 px-3 text-stone-500 text-right">
                      Atelier White-Glove Delivery Fee
                    </td>
                    <td className="p-2.5 px-3 text-right font-mono text-stone-700">
                      ${(order.deliveryFee || 10.0).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-stone-100/70 border-t border-stone-200">
                    <td colSpan={3} className="p-3 font-bold text-stone-900 text-right">
                      Grand Total Paid
                    </td>
                    <td className="p-3 text-right font-serif font-bold text-stone-900 text-sm">
                      ${order.total.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-stone-100 px-6 py-3.5 bg-stone-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsEmailModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-700" />
              <span>Email Notification Center</span>
            </button>
            <span className="hidden sm:inline text-[11px] text-stone-400">
              &bull; Press <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded font-mono text-[10px]">Esc</kbd> to dismiss
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Email Preview & Dispatcher Modal */}
      <EmailPreviewModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        order={order}
        initialType={
          isVerified
            ? 'payment_verified'
            : isRejected
            ? 'payment_rejected'
            : 'payment_verified'
        }
      />

      {/* Enlarged Receipt Lightbox Modal */}
      {isEnlargedProofOpen && isBase64Proof && (
        <div
          onClick={() => setIsEnlargedProofOpen(false)}
          className="fixed inset-0 z-60 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl space-y-3 animate-in zoom-in-95"
          >
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-stone-900 text-sm">
                  {paymentMethod} Customer Receipt Proof
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEnlargedProofOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-auto max-h-[70vh] rounded-2xl bg-stone-100 p-2 flex items-center justify-center">
              <img
                src={order.paymentProof}
                alt="Payment proof screenshot"
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
              <span>Order Ref: {order.id} &bull; Uploaded Proof</span>
              <button
                type="button"
                onClick={() => setIsEnlargedProofOpen(false)}
                className="py-1.5 px-4 bg-[#2D5A43] text-white rounded-xl font-semibold cursor-pointer hover:bg-emerald-800 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentModal;
