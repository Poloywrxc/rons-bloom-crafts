'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Monitor
} from 'lucide-react';
import { OrderEmailType } from '@/lib/email/types';
import { Order } from '@/types/order';
import { previewOrderEmailAction, sendManualOrderEmailAction } from '@/actions/order/action';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  initialType?: OrderEmailType;
  onNotify?: (msg: string) => void;
}

const EMAIL_TYPES: { id: OrderEmailType; label: string; badge: string; color: string }[] = [
  { id: 'invoice', label: 'Order Invoice & Confirmed', badge: 'Official Invoice', color: 'bg-[#1b3b2b]' },
  { id: 'payment_verified', label: 'Payment Verified', badge: 'Verified & Cleared', color: 'bg-emerald-600' },
  { id: 'payment_rejected', label: 'Payment Rejected', badge: 'Verification Incomplete', color: 'bg-rose-600' },
  { id: 'floral_artistry', label: 'Floral Artistry', badge: 'Artistry in Progress', color: 'bg-[#2D5A43]' },
  { id: 'out_for_delivery', label: 'Out for Delivery', badge: 'Courier in Transit', color: 'bg-blue-600' },
  { id: 'delivered', label: 'Delivered (Complete)', badge: 'Delivered with Love', color: 'bg-teal-700' },
  { id: 'cancelled', label: 'Cancelled', badge: 'Order Cancelled', color: 'bg-stone-600' },
  { id: 'refund', label: 'Refund', badge: 'Refund Processed', color: 'bg-emerald-700' }
];

export function EmailPreviewModal({
  isOpen,
  onClose,
  order,
  initialType = 'payment_verified',
  onNotify
}: EmailPreviewModalProps) {
  const [selectedType, setSelectedType] = useState<OrderEmailType>(initialType);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (isOpen) {
      if (initialType) {
        setSelectedType(initialType);
      }
      setRecipientEmail(order?.email || '');
      setSendSuccess(null);
      setSendError(null);
    }
  }, [isOpen, initialType, order]);

  // Fetch rendered HTML when type or order changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const orderId = order?.id || 'SAMPLE-DEMO';
        const res = await previewOrderEmailAction(orderId, selectedType, {
          customNotes: order?.notes,
          refundDetails: order?.refundNumber
            ? {
                refundMethod: order.refundMethod || 'GCash',
                refundNumber: order.refundNumber,
                notes: order.notes,
                amount: order.total
              }
            : undefined
        });

        if (isMounted && res.success && res.html) {
          setPreviewHtml(res.html);
          setPreviewSubject(res.subject || '');
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to preview email:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPreview(false);
        }
      }
    };

    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedType, order]);

  // Handle ESC key and overflow
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = original;
    };
  }, [isOpen, onClose]);

  const handleSendEmail = async () => {
    const targetEmail = recipientEmail.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setSendError('Please provide a valid destination email address.');
      return;
    }

    setIsSending(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      const orderId = order?.id || 'SAMPLE-DEMO';
      const res = await sendManualOrderEmailAction(orderId, selectedType, {
        overrideRecipient: targetEmail,
        customNotes: order?.notes,
        refundDetails: order?.refundNumber
          ? {
              refundMethod: order.refundMethod || 'GCash',
              refundNumber: order.refundNumber,
              notes: order.notes,
              amount: order?.total || 185
            }
          : undefined
      });

      if (res.success) {
        const successMsg = `Successfully sent "${selectedType.replace(/_/g, ' ')}" email to ${targetEmail}!`;
        setSendSuccess(successMsg);
        if (onNotify) onNotify(successMsg);
      } else {
        setSendError(res.error || 'Failed to dispatch email. Check SMTP settings.');
      }
    } catch (err: any) {
      setSendError(err?.message || 'Unexpected server error sending email.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const currentTypeMeta = EMAIL_TYPES.find((t) => t.id === selectedType) || EMAIL_TYPES[0];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-5xl w-full h-[94vh] shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/90 gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D5A43]/10 border border-[#2D5A43]/20 flex items-center justify-center text-[#2D5A43] shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[#2D5A43]">
                  {order ? order.id : 'Sample Order Showcase'}
                </span>
                <span className="text-stone-300">&bull;</span>
                <span className="text-xs text-stone-500 font-medium">Customer Notification Center</span>
              </div>
              <h3 className="font-serif font-bold text-stone-900 text-base leading-tight">
                Order Lifecycle Email Templates &amp; Dispatcher
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            {/* Viewport switch (Desktop vs Mobile Preview) */}
            <div className="bg-stone-200/70 p-0.5 rounded-xl flex items-center text-xs">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition cursor-pointer ${
                  viewportMode === 'desktop'
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Desktop View (600px)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition cursor-pointer ${
                  viewportMode === 'mobile'
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Mobile View (380px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
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
        </div>

        {/* 7 Lifecycle Tabs Navigation */}
        <div className="px-6 py-2.5 border-b border-stone-200/80 bg-white overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center space-x-2 min-w-max">
            {EMAIL_TYPES.map((t) => {
              const isActive = selectedType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedType(t.id);
                    setSendSuccess(null);
                    setSendError(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-[#1b3b2b] text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200/70 text-stone-600'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-[#dfb743]' : t.color
                    }`}
                  />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dispatch Bar: Recipient input + Send button */}
        <div className="px-6 py-3 bg-stone-50 border-b border-stone-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-xs font-bold text-stone-700 shrink-0">
              Recipient Email:
            </label>
            <div className="relative flex-1 max-w-md">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="customer@example.com (or enter your test email)"
                className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
              />
            </div>
            {order?.email && recipientEmail !== order.email && (
              <button
                type="button"
                onClick={() => setRecipientEmail(order.email)}
                className="text-[11px] text-[#2D5A43] hover:underline font-semibold"
              >
                Reset to Patron Email ({order.email})
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isSending}
              onClick={handleSendEmail}
              className="px-4 py-2 rounded-xl bg-[#2D5A43] hover:bg-[#1b3b2b] disabled:opacity-50 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Notification</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Alerts if sent or error */}
        {sendSuccess && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sendSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setSendSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {sendError && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{sendError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSendError(null)}
              className="text-rose-700 hover:text-rose-900 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Email Subject Header Preview */}
        <div className="px-6 py-2 border-b border-stone-200/70 bg-stone-100/50 flex items-center space-x-2 text-xs shrink-0">
          <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">Subject:</span>
          <span className="font-semibold text-stone-900 truncate">
            {previewSubject || 'Generating subject line...'}
          </span>
        </div>

        {/* Live HTML Email Preview Area */}
        <div className="flex-1 bg-stone-200/60 p-4 overflow-y-auto flex items-center justify-center">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center p-12 text-stone-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#2D5A43]" />
              <p className="text-xs font-semibold">Generating luxury email template preview...</p>
            </div>
          ) : (
            <div
              className={`transition-all duration-300 h-full w-full flex justify-center ${
                viewportMode === 'mobile' ? 'max-w-[400px]' : 'max-w-[680px]'
              }`}
            >
              <iframe
                title="Email Template Live Preview"
                srcDoc={previewHtml}
                className="w-full h-full bg-white rounded-2xl shadow-md border border-stone-300"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-stone-100 bg-stone-50/90 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Gmail SMTP Relay Live: <strong>smtp.gmail.com:587</strong></span>
          </div>
          <div>
            <span>Ron&apos;s Bloom Crafts Atelier &bull; Automatic Trigger on Status Change</span>
          </div>
        </div>
      </div>
    </div>
  );
}
