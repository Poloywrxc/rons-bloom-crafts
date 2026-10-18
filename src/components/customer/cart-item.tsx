'use client';

import React, { useEffect } from 'react';
import { ShoppingBag, X, Trash2, Plus, Minus, ArrowRight, Flower2 } from 'lucide-react';
import { CartItem } from '@/hooks/use-cart';

interface CartItemCardProps {
  item: CartItem;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemCard({ item, onUpdateQty, onRemove }: CartItemCardProps) {
  return (
    <div className="p-2 sm:p-2.5 bg-stone-50 rounded-2xl border border-stone-200/90 flex gap-2 sm:gap-3 transition hover:border-stone-300">
      <img
        src={item.image}
        alt={item.name}
        className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl border border-stone-200 shrink-0"
      />
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex justify-between items-start gap-1">
          <div className="min-w-0 flex-1 pr-1">
            <h4 className="font-serif text-xs sm:text-sm font-semibold text-stone-900 leading-snug line-clamp-1 truncate">
              {item.name}
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] sm:text-xs text-[#2D5A43] font-bold font-mono">
                ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {item.stock !== undefined && item.stock <= 0 && (
                <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded border border-rose-200">
                  Not Available
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="p-1 -mr-1 text-stone-400 hover:text-rose-600 transition cursor-pointer shrink-0"
            aria-label={`Remove ${item.name}`}
            title="Remove item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {item.cardMessage && (
          <p className="text-[9px] sm:text-[10px] text-stone-700 italic bg-white px-1.5 py-0.5 rounded border border-stone-200/80 my-1 truncate">
            💌 "{item.cardMessage}"
          </p>
        )}

        <div className="flex items-center justify-between mt-1 pt-0.5">
          {/* Quantity Controls Pill */}
          <div className="flex items-center space-x-1 bg-white px-1.5 py-0.5 rounded-full border border-stone-300 shadow-2xs">
            <button
              type="button"
              onClick={() => onUpdateQty(item.id, -1)}
              className="p-0.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className="text-[10px] sm:text-xs font-bold text-stone-900 min-w-3 text-center font-mono">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQty(item.id, 1)}
              className="p-0.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Item Total Price */}
          <span className="text-xs sm:text-sm font-bold text-stone-800 font-mono">
            ₱{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  onUpdateQty: (id: string, delta: number) => void;
  onCheckout: () => void;
  onBrowse: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  cartCount,
  cartSubtotal,
  onUpdateQty,
  onCheckout,
  onBrowse
}: CartDrawerProps) {
  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to dismiss drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed backdrop with tap-to-dismiss */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container: 85% width on mobile, max-w-md on sm and desktop */}
      <div className="relative w-[85%] max-w-xs sm:w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 rounded-l-3xl border-l border-stone-200 overflow-hidden">
        {/* Header Bar */}
        <div className="p-3 sm:p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/90 shrink-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 pr-1">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#2D5A43] shrink-0" />
            <h3 className="font-serif font-bold text-stone-800 text-xs sm:text-base md:text-lg truncate">
              Your Botanical Basket
            </h3>
            <span className="bg-rose-100 text-rose-800 text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-semibold font-mono shrink-0">
              {cartCount}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-200/80 transition cursor-pointer shrink-0"
            aria-label="Close cart drawer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 overscroll-contain">
          {cart.length === 0 ? (
            <div className="text-center py-10 sm:py-16 px-3">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#2D5A43]">
                <Flower2 className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <p className="text-stone-800 font-serif font-bold text-sm sm:text-base">
                Your flower basket is empty
              </p>
              <p className="text-stone-500 text-[11px] sm:text-xs mt-1 max-w-[200px] sm:max-w-xs mx-auto leading-relaxed">
                Explore our blooming catalog to add freshly picked handcrafted arrangements.
              </p>
              <button
                type="button"
                onClick={onBrowse}
                className="mt-4 sm:mt-5 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#2D5A43] text-white text-xs font-semibold rounded-full hover:bg-emerald-800 shadow-xs transition hover:scale-[1.02] cursor-pointer"
              >
                Browse Collections
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onUpdateQty={onUpdateQty}
                onRemove={(id) => onUpdateQty(id, -item.quantity)}
              />
            ))
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-stone-200 bg-white space-y-2 sm:space-y-2.5 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <div className="space-y-1 text-xs text-stone-600">
              <div className="flex justify-between items-center text-[11px] sm:text-xs">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900 font-mono">
                  ₱{cartSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] sm:text-xs">
                <span>Packaging</span>
                <span className="text-emerald-700 font-semibold">Complimentary</span>
              </div>
              <div className="flex justify-between items-baseline text-stone-900 font-bold text-xs sm:text-sm pt-1.5 border-t border-stone-200">
                <span className="font-serif">Estimated Total</span>
                <span className="text-[#2D5A43] font-serif font-bold text-sm sm:text-base font-mono">
                  ₱{cartSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {(() => {
              const hasOutOfStock = cart.some(item => item.stock !== undefined && item.stock <= 0);
              return (
                <>
                  {hasOutOfStock && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] text-center font-medium">
                      Some items are out of stock and not available. Please remove them to proceed.
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={hasOutOfStock}
                    onClick={onCheckout}
                    className={`w-full py-2.5 sm:py-3 font-semibold rounded-full shadow-md transition flex items-center justify-center space-x-2 text-xs sm:text-sm ${
                      hasOutOfStock
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed border border-stone-300'
                        : 'bg-[#2D5A43] hover:bg-emerald-800 text-white cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                    }`}
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </>
              );
            })()}
            <p className="text-[9px] sm:text-[10px] text-center text-stone-400">
              Free cancellation within 2 hours of booking
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartItemCard;
