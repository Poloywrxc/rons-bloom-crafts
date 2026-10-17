'use client';

import React from 'react';
import {
  Flower2,
  CheckCircle2,
  Package,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Receipt,
  HeartHandshake
} from 'lucide-react';

export type TransitionStage = 'verifying' | 'securing' | 'confirmed' | 'navigating';

export interface OrderTransitionLoaderProps {
  isOpen: boolean;
  stage: TransitionStage;
  orderId?: string | null;
  recipientName?: string;
  itemCount?: number;
  totalAmount?: number;
  paymentMethod?: string;
}

export function OrderTransitionLoader({
  isOpen,
  stage,
  orderId,
  recipientName = 'Valued Patron',
  itemCount = 1,
  totalAmount = 0,
  paymentMethod = 'GCash'
}: OrderTransitionLoaderProps) {
  if (!isOpen) return null;

  // Derive progress percentage based on stage
  const getProgress = () => {
    switch (stage) {
      case 'verifying':
        return 30;
      case 'securing':
        return 65;
      case 'confirmed':
        return 92;
      case 'navigating':
        return 100;
      default:
        return 20;
    }
  };

  const progress = getProgress();

  const getStatusHeading = () => {
    switch (stage) {
      case 'verifying':
        return 'Verifying Payment Receipt';
      case 'securing':
        return 'Securing Fresh Botanicals';
      case 'confirmed':
        return 'Order Confirmed & Reserved!';
      case 'navigating':
        return 'Opening Your Orders...';
    }
  };

  const getStatusDescription = () => {
    switch (stage) {
      case 'verifying':
        return 'Confirming e-wallet reference with Ron’s Bloom Crafts Atelier...';
      case 'securing':
        return 'Locking in hand-tied stems and personalized calligraphy note...';
      case 'confirmed':
        return `Order ${orderId ? `#${orderId}` : 'is saved'}! Preparing your live delivery journey...`;
      case 'navigating':
        return 'Taking you directly to your Customer Orders dashboard...';
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md transition-opacity duration-300 ${
        stage === 'navigating' ? 'opacity-95' : 'opacity-100'
      } animate-in fade-in duration-200`}
      role="dialog"
      aria-modal="true"
      aria-label="Placing order transition loader"
    >
      {/* Decorative ambient background glows */}
      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#2D5A43]/20 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-60 h-60 sm:w-80 sm:h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none -bottom-10 -right-10" />

      {/* Floating Petals Celebration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <span className="absolute top-[18%] left-[15%] text-2xl animate-bounce duration-1000 opacity-70">🌸</span>
        <span className="absolute top-[28%] right-[18%] text-xl animate-pulse duration-700 opacity-60">✨</span>
        <span className="absolute bottom-[22%] left-[22%] text-lg animate-bounce duration-1000 opacity-70">🌿</span>
        <span className="absolute bottom-[26%] right-[20%] text-2xl animate-pulse duration-1000 opacity-80">💐</span>
      </div>

      {/* Main Transition Card */}
      <div className="relative bg-[#FAF7F2] rounded-3xl p-6 sm:p-9 max-w-md w-full shadow-2xl border border-stone-200 text-center overflow-hidden z-10 animate-in zoom-in-95 duration-200 space-y-6">
        
        {/* Top Atelier Badge */}
        <div className="flex items-center justify-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-[#2D5A43] text-xs font-semibold tracking-wide uppercase border border-emerald-200/60">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            <span>Ron's Bloom Crafts Atelier</span>
          </span>
        </div>

        {/* Center Animated Floral Glyph */}
        <div className="relative flex items-center justify-center my-3">
          {/* Outer glowing pulsing ring */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#2D5A43]/10 flex items-center justify-center relative">
            {/* Spinning dashed ring during verifying / securing */}
            {(stage === 'verifying' || stage === 'securing') && (
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#2D5A43] animate-[spin_4s_linear_infinite]" />
            )}

            {/* Pulsing ring during confirmed */}
            {(stage === 'confirmed' || stage === 'navigating') && (
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-30" />
            )}

            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#2D5A43] to-emerald-800 text-white flex items-center justify-center shadow-lg transform transition-all duration-300">
              {stage === 'confirmed' || stage === 'navigating' ? (
                <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 text-amber-300 animate-in zoom-in-50 duration-300" />
              ) : stage === 'securing' ? (
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-100 animate-pulse" />
              ) : (
                <Flower2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-100 animate-spin [animation-duration:6s]" />
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Headings */}
        <div className="space-y-2">
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 leading-tight">
            {getStatusHeading()}
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
            {getStatusDescription()}
          </p>
        </div>

        {/* Progress Bar with Gradient & Shimmer */}
        <div className="space-y-1.5">
          <div className="w-full bg-stone-200/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-stone-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2D5A43] via-emerald-500 to-amber-400 transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[11px] text-stone-500 px-0.5 font-medium">
            <span>Checkout Process</span>
            <span className="font-mono text-[#2D5A43] font-bold">{progress}%</span>
          </div>
        </div>

        {/* Milestone Steps */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-200/70 text-left">
          {/* Step 1: Payment */}
          <div className="flex items-center space-x-1.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                progress >= 30
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-200 text-stone-500'
              }`}
            >
              {progress > 30 ? '✓' : '1'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-stone-800 block truncate">Payment</span>
              <span className="text-[9px] text-stone-400 block truncate">{paymentMethod}</span>
            </div>
          </div>

          {/* Step 2: Reserve Stems */}
          <div className="flex items-center space-x-1.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                progress >= 65
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-200 text-stone-500'
              }`}
            >
              {progress >= 90 ? '✓' : '2'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-stone-800 block truncate">Blooms</span>
              <span className="text-[9px] text-stone-400 block truncate">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Step 3: Orders Tab */}
          <div className="flex items-center space-x-1.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                progress >= 90
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-200 text-stone-500'
              }`}
            >
              {progress >= 100 ? '✓' : '3'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-stone-800 block truncate">Orders</span>
              <span className="text-[9px] text-stone-400 block truncate">Live Tracker</span>
            </div>
          </div>
        </div>

        {/* Order Snapshot Capsule */}
        <div className="p-3 bg-white/90 rounded-2xl border border-stone-200/80 flex items-center justify-between text-left shadow-2xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#2D5A43] flex items-center justify-center shrink-0">
              <HeartHandshake className="w-4 h-4 text-[#2D5A43]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-stone-500 truncate">Recipient & Delivery</p>
              <p className="text-xs font-semibold text-stone-800 truncate">
                {recipientName}
              </p>
            </div>
          </div>

          {totalAmount > 0 && (
            <div className="text-right shrink-0 pl-2">
              <span className="text-[10px] text-stone-400 block">Total Due</span>
              <span className="text-xs font-mono font-bold text-[#2D5A43]">
                ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Order Ref if Available */}
        {orderId && (
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>Ref: {orderId}</span>
          </div>
        )}

        {/* Footnote reassurance */}
        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-stone-400">
          <Receipt className="w-3.5 h-3.5 text-[#2D5A43]" />
          <span>Smooth transition from checkout to order status</span>
          <ArrowRight className="w-3 h-3 text-stone-400" />
        </div>
      </div>
    </div>
  );
}

export default OrderTransitionLoader;
