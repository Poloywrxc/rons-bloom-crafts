'use client';

import React from 'react';
import { X, Star, ShoppingBag } from 'lucide-react';
import { Product } from '@/types/product';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export function ProductGalleryModal({
  product,
  onClose,
  onAddToCart
}: ProductModalProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative border border-stone-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 rounded-full bg-white/80 text-stone-700 hover:bg-white transition cursor-pointer shadow-xs"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="h-52 sm:h-64 md:h-full relative">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-3 left-3 bg-[#2D5A43] text-white text-[11px] px-2.5 py-1 rounded-full font-medium shadow-xs">
              {product.freshness}
            </span>
          </div>
          <div className="p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest text-rose-800 font-bold">
                {product.category}
              </span>
              <h3 className="font-serif text-2xl font-bold text-stone-900 mt-1">
                {product.name}
              </h3>
              <div className="flex items-center space-x-2 my-2">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs text-stone-700 font-semibold">
                  {product.rating} ({product.reviewsCount} reviews)
                </span>
              </div>
              <p className="text-stone-600 text-xs leading-relaxed mt-2">
                {product.description}
              </p>

              <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-xs font-semibold text-stone-700 block mb-1">
                  Florist Care Guarantee:
                </span>
                <ul className="text-[11px] text-stone-700 space-x-1 list-disc list-inside">
                  <li>Hydration pack included during transit</li>
                  <li>Includes nutrient floral food sachet</li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-200 mt-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-600 block">Price</span>
                <span className="font-serif text-2xl font-bold text-[#2D5A43]">
                  ${product.price.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                className="px-6 py-2.5 bg-[#2D5A43] text-white text-sm font-medium rounded-full hover:bg-emerald-800 transition shadow-md flex items-center space-x-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Bag</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductGalleryModal;
