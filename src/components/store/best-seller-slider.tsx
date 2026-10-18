'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Eye,
  Star,
  Plus,
  Flame,
  Sparkles,
  Award
} from 'lucide-react';
import { Product } from '@/types/product';

interface BestSellerSliderProps {
  products: Product[];
  wishlist: string[];
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
}

export function BestSellerSlider({
  products,
  wishlist,
  onAddToCart,
  onToggleWishlist,
  onSelectProduct
}: BestSellerSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isUserScrolling = useRef(false);

  // Determine Best Sellers strictly by the quantity of units sold only
  const bestSellers = React.useMemo(() => {
    const activeProducts = products.filter(p => p.status === 'active');

    // Sort strictly by quantity sold descending
    const sortedBySales = [...activeProducts].sort((a, b) => {
      const aSold = a.quantitySold ?? a.soldCount ?? 0;
      const bSold = b.quantitySold ?? b.soldCount ?? 0;
      if (bSold !== aSold) return bSold - aSold;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

    // If there are products with recorded sales (> 0 units sold), best sellers are determined strictly by sold items
    const soldOnly = sortedBySales.filter(
      p => (p.quantitySold ?? p.soldCount ?? 0) > 0
    );

    if (soldOnly.length > 0) {
      return soldOnly;
    }

    // Fallback when store has no sales recorded yet
    return sortedBySales;
  }, [products]);

  // Center index state: start with the true middle card so it is centered and floating immediately
  const [centerIndex, setCenterIndex] = useState(() =>
    bestSellers.length > 0 ? Math.floor(bestSellers.length / 2) : 0
  );

  // Smoothly or instantly scroll a specific card index to the dead center of the slider track
  const scrollToCard = useCallback((targetIdx: number, behavior: ScrollBehavior = 'smooth') => {
    const container = sliderRef.current;
    if (!container) return;

    const cards = container.querySelectorAll<HTMLElement>('[data-slider-card]');
    const targetCard = cards[targetIdx];
    if (!targetCard) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = targetCard.getBoundingClientRect();
    const currentCardCenter = cardRect.left + cardRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const offset = currentCardCenter - containerCenter;

    container.scrollTo({
      left: container.scrollLeft + offset,
      behavior
    });

    setCenterIndex(targetIdx);
  }, []);

  // Handle scroll to detect which card is closest to the middle of the viewport
  const handleScroll = useCallback(() => {
    const container = sliderRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    const cards = container.querySelectorAll<HTMLElement>('[data-slider-card]');
    if (cards.length === 0) return;

    let closestIdx = 0;
    let minDistance = Infinity;

    cards.forEach((card, idx) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(containerCenter - cardCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }
    });

    setCenterIndex(closestIdx);
  }, []);

  // Initialize and center the middle card on mount and whenever bestSellers changes
  useEffect(() => {
    if (bestSellers.length === 0) return;
    const midIdx = Math.floor(bestSellers.length / 2);
    setCenterIndex(midIdx);

    // Initial instant alignment so middle card and dot are active immediately
    const instantTimer = setTimeout(() => {
      scrollToCard(midIdx, 'auto');
    }, 60);

    // Smooth follow-up to refine center positioning once images and fonts are computed
    const smoothTimer = setTimeout(() => {
      scrollToCard(midIdx, 'smooth');
    }, 220);

    return () => {
      clearTimeout(instantTimer);
      clearTimeout(smoothTimer);
    };
  }, [bestSellers.length, scrollToCard]);

  // Set up scroll and resize listeners
  useEffect(() => {
    const container = sliderRef.current;
    if (!container) return;

    let debounceTimer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      isUserScrolling.current = true;
      handleScroll();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        isUserScrolling.current = false;
      }, 150);
    };

    const onResize = () => {
      handleScroll();
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      clearTimeout(debounceTimer);
    };
  }, [handleScroll]);

  // Navigate left or right with seamless wrap-around
  const navigate = (direction: 'left' | 'right') => {
    if (bestSellers.length <= 1) return;
    const nextIdx =
      direction === 'left'
        ? (centerIndex - 1 + bestSellers.length) % bestSellers.length
        : (centerIndex + 1) % bestSellers.length;
    scrollToCard(nextIdx);
  };

  if (bestSellers.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 select-none">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-3 sm:mb-5 px-4 flex flex-col items-center">
        <div className="inline-flex items-center space-x-2 bg-amber-50 text-amber-900 border border-amber-200/80 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
          <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>Ranked by Quantity Sold</span>
          <Sparkles className="w-3 h-3 text-amber-500" />
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
          Best Seller Blooms
        </h2>
        <p className="text-stone-600 text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
          Our top-purchased floral arrangements, determined directly by total quantity sold. Tap any bloom to bring it to center stage.
        </p>
      </div>

      {/* Card Slider Track with Floating Side Arrow Controls */}
      <div className="relative group/slider">
        {/* Left Side Arrow Button (Desktop) */}
        <button
          type="button"
          onClick={() => navigate('left')}
          disabled={bestSellers.length <= 1}
          aria-label="Previous best seller"
          className="hidden sm:flex absolute -left-2 md:-left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-12 md:h-12 rounded-full border shadow-xl items-center justify-center transition-all duration-300 cursor-pointer bg-white/95 backdrop-blur-md border-stone-200 text-stone-800 hover:bg-[#2D5A43] hover:text-white hover:border-[#2D5A43] hover:scale-110 active:scale-95 shadow-stone-900/10"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        {/* Right Side Arrow Button (Desktop) */}
        <button
          type="button"
          onClick={() => navigate('right')}
          disabled={bestSellers.length <= 1}
          aria-label="Next best seller"
          className="hidden sm:flex absolute -right-2 md:-right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-12 md:h-12 rounded-full border shadow-xl items-center justify-center transition-all duration-300 cursor-pointer bg-white/95 backdrop-blur-md border-stone-200 text-stone-800 hover:bg-[#2D5A43] hover:text-white hover:border-[#2D5A43] hover:scale-110 active:scale-95 shadow-stone-900/10"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        {/* Scrollable Track with Center Padding */}
        <div
          ref={sliderRef}
          className="flex gap-4 sm:gap-8 overflow-x-auto scroll-smooth snap-x snap-mandatory pt-6 sm:pt-12 pb-10 sm:pb-16 no-scrollbar"
          style={{
            scrollbarWidth: 'none',
            paddingLeft: 'max(1rem, calc(50% - min(135px, 38vw)))',
            paddingRight: 'max(1rem, calc(50% - min(135px, 38vw)))'
          }}
        >
          {bestSellers.map((product, idx) => {
            const isWishlisted = wishlist.includes(product.id);
            const isCenter = idx === centerIndex;
            const rank = idx + 1;

            return (
              <div
                key={product.id}
                data-slider-card
                ref={el => {
                  cardRefs.current[idx] = el;
                }}
                onClick={() => {
                  if (!isCenter) {
                    scrollToCard(idx);
                  }
                }}
                className={`relative w-[76vw] max-w-[275px] sm:w-[330px] md:w-[340px] shrink-0 snap-center rounded-3xl transition-all duration-700 ease-out flex flex-col justify-between cursor-pointer ${
                  isCenter
                    ? 'z-20 floating-center-card border-2 border-emerald-500/80 ring-4 ring-emerald-500/15 shadow-[0_24px_50px_-12px_rgba(45,90,67,0.38),0_12px_24px_-8px_rgba(0,0,0,0.18)] bg-white'
                    : 'z-10 translate-y-0 scale-[0.92] sm:scale-[0.93] opacity-70 hover:opacity-95 hover:scale-[0.95] border border-stone-200/90 shadow-lg bg-stone-50/80 hover:bg-white'
                }`}
              >
                {/* Ground Shadow for Floating Center Card */}
                {isCenter && (
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 sm:w-56 h-3 bg-emerald-950/20 blur-md rounded-full pointer-events-none transition-opacity duration-500 animate-pulse"
                  />
                )}



                {/* Product Visual Area */}
                <div className="relative aspect-4/3 overflow-hidden rounded-t-3xl bg-stone-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    onClick={e => {
                      if (isCenter) {
                        e.stopPropagation();
                        onSelectProduct(product);
                      }
                    }}
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      isCenter ? 'hover:scale-108 cursor-pointer' : 'cursor-pointer'
                    }`}
                  />

                  {/* Best Seller Rank Badge */}
                  <div className="absolute top-3 left-3 z-10 flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                    <Award className="w-3.5 h-3.5" />
                    <span>#{rank} Bestseller</span>
                    {(product.quantitySold ?? product.soldCount ?? 0) > 0 && (
                      <span className="bg-black/20 text-amber-100 text-[10px] px-1.5 py-0.2 rounded-full font-mono ml-0.5">
                        {product.quantitySold ?? product.soldCount} sold
                      </span>
                    )}
                  </div>

                  {/* Wishlist Button */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onToggleWishlist(product.id);
                    }}
                    aria-label="Save to wishlist"
                    className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-all duration-200 shadow-md cursor-pointer ${
                      isWishlisted
                        ? 'bg-rose-500 text-white scale-110'
                        : 'bg-white/85 text-stone-600 hover:text-rose-600 hover:bg-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>

                  {/* Quick View Button (Desktop only to prevent clutter) */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onSelectProduct(product);
                    }}
                    className="hidden sm:flex absolute bottom-3 right-3 z-10 bg-stone-900/80 hover:bg-stone-900 text-white px-3 py-1 rounded-full text-[11px] font-medium backdrop-blur-xs items-center space-x-1 transition shadow-sm cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Quick View</span>
                  </button>

                  {/* Out of Stock or Freshness Badge */}
                  {(product.stock ?? 0) <= 0 ? (
                    <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 bg-rose-600 text-white text-[9px] sm:text-[11px] uppercase font-extrabold tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-md">
                      NOT AVAILABLE
                    </span>
                  ) : (
                    product.freshness && (
                      <span className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-10 bg-[#2D5A43]/90 backdrop-blur-xs text-white text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full shadow-xs truncate max-w-[170px]">
                        {product.freshness}
                      </span>
                    )
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
                      <span className="font-medium text-stone-600 truncate pr-2">{product.category}</span>
                      <div className="flex items-center text-amber-500 font-semibold shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                        <span>{product.rating ?? 4.9}</span>
                        <span className="text-stone-400 text-[10px] ml-1 font-normal">
                          ({product.reviewsCount ?? 30})
                        </span>
                      </div>
                    </div>

                    <h3
                      onClick={e => {
                        if (isCenter) {
                          e.stopPropagation();
                          onSelectProduct(product);
                        }
                      }}
                      className="font-serif font-bold text-base sm:text-lg text-stone-900 hover:text-[#2D5A43] transition cursor-pointer leading-snug line-clamp-1"
                    >
                      {product.name}
                    </h3>

                    <p className="text-stone-600 text-xs mt-1 sm:mt-1.5 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Pricing & Cart Action */}
                  <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-medium">
                        Patron Price
                      </span>
                      <span className="font-serif text-lg sm:text-2xl font-bold text-[#2D5A43] block truncate">
                        ₱{product.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                      {(product.stock ?? 0) <= 0 && (
                        <span className="text-[10px] text-rose-600 font-bold block">Not Available</span>
                      )}
                    </div>

                    {(() => {
                      const isOutOfStock = (product.stock ?? 0) <= 0;
                      return (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={e => {
                            e.stopPropagation();
                            if (isOutOfStock) return;
                            onAddToCart(product);
                          }}
                          className={`shrink-0 whitespace-nowrap h-9 px-4 rounded-full text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 ${
                            isOutOfStock
                              ? 'bg-stone-200 text-rose-600 border border-stone-300 cursor-not-allowed'
                              : 'bg-[#2D5A43] hover:bg-emerald-800 text-white shadow-xs hover:shadow-md cursor-pointer transform active:scale-95'
                          }`}
                        >
                          {!isOutOfStock && <Plus className="w-3.5 h-3.5 shrink-0" />}
                          <span>{isOutOfStock ? 'Not Available' : 'Add to Tote'}</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slider Pagination Dots & Quick Center Switcher */}
      {bestSellers.length > 1 && (
        <div className="w-full flex flex-col items-center justify-center text-center mx-auto space-y-2 pt-2 sm:pt-3">
          <div className="flex items-center justify-center space-x-3">
            {/* Mobile Left Chevron Button */}
            <button
              type="button"
              onClick={() => navigate('left')}
              className="sm:hidden p-1.5 rounded-full bg-white border border-stone-200 text-stone-700 shadow-xs active:scale-95 transition"
              aria-label="Previous bloom"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              {bestSellers.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToCard(idx)}
                  aria-label={`Slide to ${item.name}`}
                  className={`rounded-full transition-all duration-500 cursor-pointer ${
                    centerIndex === idx
                      ? 'w-8 h-2.5 bg-[#2D5A43] ring-2 ring-emerald-500/40 shadow-sm'
                      : 'w-2.5 h-2.5 bg-stone-300 hover:bg-stone-400'
                  }`}
                />
              ))}
            </div>

            {/* Mobile Right Chevron Button */}
            <button
              type="button"
              onClick={() => navigate('right')}
              className="sm:hidden p-1.5 rounded-full bg-white border border-stone-200 text-stone-700 shadow-xs active:scale-95 transition"
              aria-label="Next bloom"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[11px] text-stone-400 font-medium block text-center">
            Tap arrows, swipe, or tap any card to view
          </span>
        </div>
      )}
    </section>
  );
}

export default BestSellerSlider;

