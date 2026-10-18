'use client';

import React from 'react';
import { Heart, Eye, Star, Plus } from 'lucide-react';
import { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
}

export function ProductCard({
  product,
  isWishlisted,
  onAddToCart,
  onToggleWishlist,
  onSelectProduct
}: ProductCardProps) {
  const isOutOfStock = (product.stock ?? 0) <= 0;

  return (
    <div className={`bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/90 hover:shadow-xl transition group flex flex-col justify-between ${isOutOfStock ? 'opacity-95' : ''}`}>
      {/* Image & Wishlist Toggle */}
      <div className="relative aspect-square sm:aspect-4/3 overflow-hidden bg-stone-100">
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 cursor-pointer ${isOutOfStock ? 'grayscale-[20%]' : ''}`}
          onClick={() => onSelectProduct(product)}
        />
        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          className={`absolute top-1.5 right-1.5 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-full transition shadow-xs sm:shadow-md cursor-pointer ${
            isWishlisted
              ? 'bg-rose-500 text-white'
              : 'bg-white/85 text-stone-600 hover:text-rose-600 hover:bg-white'
          }`}
          aria-label="Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => onSelectProduct(product)}
          className="hidden md:flex absolute bottom-3 right-3 bg-stone-900/75 hover:bg-stone-900 text-white px-2.5 py-1 rounded-full text-[11px] backdrop-blur-xs items-center space-x-1"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Quick View</span>
        </button>

        {isOutOfStock ? (
          <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-rose-600 text-white text-[9px] sm:text-[11px] uppercase font-extrabold tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-md z-10">
            NOT AVAILABLE
          </span>
        ) : (
          product.freshness && (
            <span className="hidden sm:inline-block absolute top-3 left-3 bg-[#2D5A43]/90 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full">
              {product.freshness}
            </span>
          )
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-stone-500 mb-1">
            <span className="truncate pr-1 font-medium">{product.category}</span>
            <div className="flex items-center text-amber-500 shrink-0 font-medium">
              <Star className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400 mr-0.5 sm:mr-1" />
              <span className="text-stone-800 text-[10px] sm:text-xs">{product.rating}</span>
              <span className="hidden sm:inline text-stone-400 text-[10px] ml-0.5">({product.reviewsCount})</span>
            </div>
          </div>

          <h4
            onClick={() => onSelectProduct(product)}
            className="font-serif font-bold text-xs sm:text-base text-stone-900 group-hover:text-[#2D5A43] transition cursor-pointer leading-tight sm:leading-snug line-clamp-2 min-h-[2rem] sm:min-h-0"
            title={product.name}
          >
            {product.name}
          </h4>
          <p className="hidden sm:block text-stone-600 text-xs mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Add to Cart button */}
        <div className="pt-2 mt-1.5 sm:pt-4 sm:mt-3 border-t border-stone-100 flex items-center justify-between gap-1">
          <div>
            <span className="hidden sm:block text-[10px] text-stone-400">Handcrafted Price</span>
            <span className="font-serif text-xs sm:text-base md:text-lg font-bold text-[#2D5A43]">${product.price.toFixed(2)}</span>
            {isOutOfStock && (
              <span className="text-[10px] text-rose-600 font-bold block sm:hidden">Not Available</span>
            )}
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => {
              if (isOutOfStock) return;
              onAddToCart(product);
            }}
            className={`w-auto p-1 sm:px-3 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold transition flex items-center justify-center space-x-1 shrink-0 ${
              isOutOfStock
                ? 'bg-stone-200 text-rose-600 border border-stone-300 cursor-not-allowed px-2'
                : 'bg-[#FAF7F2] hover:bg-[#2D5A43] text-stone-800 hover:text-white border border-stone-300 hover:border-transparent shadow-xs cursor-pointer active:scale-95 px-2.5 sm:px-4'
            }`}
            aria-label={isOutOfStock ? `${product.name} is not available` : `Add ${product.name} to Tote`}
            title={isOutOfStock ? "Not Available" : "Add to Tote"}
          >
            {isOutOfStock ? (
              <span className="font-bold text-[10px] sm:text-[11px] uppercase tracking-wide">Not Available</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add to Tote</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
