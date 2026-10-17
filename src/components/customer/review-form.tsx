'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Product } from '@/types/product';

interface ReviewFormProps {
  products: Product[];
  onSubmitReview: (review: { bouquet: string; rating: number; comment: string }) => void;
}

export function ReviewForm({ products, onSubmitReview }: ReviewFormProps) {
  const [reviewBouquet, setReviewBouquet] = useState(products[0]?.name || 'Blushing Romance Peonies');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    onSubmitReview({
      bouquet: reviewBouquet,
      rating: reviewRating,
      comment: reviewComment
    });
    setReviewComment('');
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4 sm:space-y-6">
      <div>
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">Write a Floral Review</h3>
        <p className="text-xs text-stone-500">
          Share your experience with our blooms, freshness, and packaging
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-stone-600 mb-1 font-medium">Select Bouquet</label>
          <select
            value={reviewBouquet}
            onChange={(e) => setReviewBouquet(e.target.value)}
            className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
          >
            {products.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-stone-600 mb-1 font-medium">Freshness Rating</label>
          <div className="flex space-x-2 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setReviewRating(star)}
                className="focus:outline-hidden cursor-pointer"
              >
                <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-400' : 'text-stone-300'}`} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-stone-600 mb-1 font-medium">Your Feedback</label>
          <textarea
            rows={4}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="How was the floral presentation? Did it bring a smile to the recipient?"
            className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#2D5A43] text-white font-bold rounded-2xl hover:bg-emerald-800 transition cursor-pointer"
        >
          Submit Bloom Review
        </button>
      </form>
    </div>
  );
}

export default ReviewForm;
