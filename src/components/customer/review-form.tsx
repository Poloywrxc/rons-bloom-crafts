'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Star, Check, Package } from 'lucide-react';
import { Product } from '@/types/product';
import { Order } from '@/types/order';

interface ReviewFormProps {
  products?: Product[];
  order?: Order | null;
  orders?: Order[];
  onSubmitReview: (review: { bouquet: string; rating: number; comment: string; orderId?: string }) => void;
  onCancel?: () => void;
}

export function ReviewForm({
  products = [],
  order,
  orders = [],
  onSubmitReview,
  onCancel
}: ReviewFormProps) {
  // Collect purchased bouquets strictly from verified purchases (no arbitrary catalogue dropdown)
  const purchasedItems = useMemo(() => {
    // 1. If an explicit order was provided
    if (order && order.items && order.items.length > 0) {
      return order.items.map((item) => ({
        name: item.name,
        orderId: order.id,
        date: order.date
      }));
    }

    // 2. Otherwise collect from delivered / past customer orders
    if (orders && orders.length > 0) {
      const deliveredOrValid = orders.filter(
        (o) =>
          o.status === 'Delivered' ||
          o.status === 'Order Received' ||
          o.status === 'Floral Artistry in Progress' ||
          o.status === 'Out for Delivery'
      );
      const targetOrders = deliveredOrValid.length > 0 ? deliveredOrValid : orders;
      const list: { name: string; orderId: string; date: string }[] = [];

      targetOrders.forEach((o) => {
        if (o.items && o.items.length > 0) {
          o.items.forEach((item) => {
            if (!list.some((l) => l.name.toLowerCase() === item.name.toLowerCase() && l.orderId === o.id)) {
              list.push({
                name: item.name,
                orderId: o.id,
                date: o.date
              });
            }
          });
        }
      });
      return list;
    }

    return [];
  }, [order, orders]);

  const [selectedBouquet, setSelectedBouquet] = useState(purchasedItems[0]?.name || '');
  const [selectedOrderId, setSelectedOrderId] = useState(purchasedItems[0]?.orderId || order?.id || '');

  // Keep selected bouquet in sync if purchased items change
  useEffect(() => {
    if (purchasedItems.length > 0) {
      const exists = purchasedItems.some((i) => i.name === selectedBouquet && i.orderId === selectedOrderId);
      if (!exists) {
        setSelectedBouquet(purchasedItems[0].name);
        setSelectedOrderId(purchasedItems[0].orderId);
      }
    }
  }, [purchasedItems, selectedBouquet, selectedOrderId]);

  // DO NOT AUTO STAR: Starts at 0 (unfilled)
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // If customer has no purchase history at all
  if (purchasedItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
          <Package className="w-7 h-7" />
        </div>
        <div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
            Verified Purchases Only
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
            Reviews can only be submitted for floral arrangements you have purchased. Once you complete an order, you can review it directly from your completed deliveries!
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-[#2D5A43] hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
          >
            Back to Orders
          </button>
        )}
      </div>
    );
  }

  const activeDisplayRating = hoverRating || reviewRating;
  const currentMatchedProduct = products.find(
    (p) => p.name.toLowerCase() === selectedBouquet.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBouquet) {
      setError('Please select your purchased bouquet to review.');
      return;
    }
    if (reviewRating === 0) {
      setError('Please tap a star to choose your rating (1–5 stars) before submitting.');
      return;
    }
    if (!reviewComment.trim()) {
      setError('Please share your thoughts or feedback about your arrangement.');
      return;
    }

    onSubmitReview({
      bouquet: selectedBouquet,
      rating: reviewRating,
      comment: reviewComment.trim(),
      orderId: selectedOrderId || undefined
    });

    setReviewComment('');
    setReviewRating(0);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4 sm:space-y-6">
      <div>
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">Write a Floral Review</h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Share your experience with our blooms, freshness, and packaging
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* PURCHASE DISPLAY (NO DROPDOWN) */}
        {purchasedItems.length === 1 ? (
          <div>
            <label className="block text-stone-600 mb-1.5 font-medium">Purchased Bouquet</label>
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                {currentMatchedProduct?.image ? (
                  <img
                    src={currentMatchedProduct.image}
                    alt={selectedBouquet}
                    className="w-12 h-12 rounded-xl object-cover border border-stone-200 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl shrink-0">
                    🌸
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-stone-900 text-sm">{selectedBouquet}</span>
                    <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                      Verified Purchase
                    </span>
                  </div>
                  {selectedOrderId && (
                    <span className="text-[11px] text-stone-500 font-mono mt-0.5 block">
                      Order #{selectedOrderId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-stone-600 mb-1.5 font-medium">Select Purchased Bouquet</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {purchasedItems.map((item) => {
                const isSelected = selectedBouquet === item.name && selectedOrderId === item.orderId;
                const prod = products.find((p) => p.name.toLowerCase() === item.name.toLowerCase());
                return (
                  <button
                    key={`${item.orderId}-${item.name}`}
                    type="button"
                    onClick={() => {
                      setSelectedBouquet(item.name);
                      setSelectedOrderId(item.orderId);
                      setError(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex items-center space-x-3 cursor-pointer ${
                      isSelected
                        ? 'border-[#2D5A43] bg-emerald-50/70 shadow-2xs ring-2 ring-[#2D5A43]/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    {prod?.image ? (
                      <img
                        src={prod.image}
                        alt={item.name}
                        className="w-11 h-11 rounded-xl object-cover shrink-0 border border-stone-200"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg shrink-0">
                        🌸
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-stone-900 text-xs truncate">{item.name}</p>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-[10px] text-stone-500 font-mono">Ref: #{item.orderId}</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                          Verified
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#2D5A43] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* FRESHNESS RATING (DO NOT AUTO STAR) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-stone-600 font-medium">Freshness Rating</label>
            <span className="text-xs text-stone-500 font-medium">
              {activeDisplayRating === 0 && 'Tap a star to rate'}
              {activeDisplayRating === 1 && '⭐ Poor Freshness'}
              {activeDisplayRating === 2 && '⭐⭐ Fair Arrangement'}
              {activeDisplayRating === 3 && '⭐⭐⭐ Good Blooms'}
              {activeDisplayRating === 4 && '⭐⭐⭐⭐ Very Fresh'}
              {activeDisplayRating === 5 && '⭐⭐⭐⭐⭐ Artisan Perfection!'}
            </span>
          </div>

          <div
            className="flex space-x-2 text-stone-300 py-1"
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = star <= activeDisplayRating;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => {
                    setReviewRating(star);
                    setError(null);
                  }}
                  className="p-1 focus:outline-hidden cursor-pointer transition transform hover:scale-115"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      isFilled ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* FEEDBACK COMMENT */}
        <div>
          <label className="block text-stone-600 mb-1 font-medium">Your Feedback</label>
          <textarea
            rows={4}
            value={reviewComment}
            onChange={(e) => {
              setReviewComment(e.target.value);
              if (error) setError(null);
            }}
            placeholder="How was the floral presentation? Did it bring a smile to the recipient?"
            className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl focus:border-[#2D5A43] focus:outline-hidden"
          />
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center space-x-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-2xl transition cursor-pointer text-xs"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="flex-1 py-3 bg-[#2D5A43] text-white font-bold rounded-2xl hover:bg-emerald-800 transition cursor-pointer shadow-xs text-xs"
          >
            Submit Bloom Review
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReviewForm;
