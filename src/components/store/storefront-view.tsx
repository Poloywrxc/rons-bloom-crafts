'use client';

import React, { useMemo, useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Flower2, Grid2x2, Grid3x3, RotateCcw } from 'lucide-react';
import { Product } from '@/types/product';
import { CategoryItem } from '@/types/category';
import { CategoryGrid } from './category-grid';
import { ProductCard } from './product-card';
import { BestSellerSlider } from './best-seller-slider';

interface StorefrontViewProps {
  products: Product[];
  categories: (string | CategoryItem)[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  priceRange: number;
  setPriceRange: (price: number) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  wishlist: string[];
  onSelectProduct: (product: Product) => void;
  onOpenCheckout?: () => void;
  isLoading?: boolean;
}

export function StorefrontView({
  products,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  priceRange,
  setPriceRange,
  onAddToCart,
  onToggleWishlist,
  wishlist,
  onSelectProduct,
  isLoading = false
}: StorefrontViewProps) {
  const [mobileGridCols, setMobileGridCols] = useState<2 | 3>(2);

  // Filter logic: category and search connected to product database (no price limit)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Must be active product
      if (p.status === 'inactive') return false;

      const matchCat =
        !selectedCategory ||
        selectedCategory === 'All Blooms' ||
        p.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase();

      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Banner with Floral Aesthetic */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#FAF3EB] via-[#F4E8E1] to-[#E9D8D0] py-10 sm:py-16 md:py-24 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
          <div className="space-y-4 sm:space-y-5">
            <span className="inline-flex items-center space-x-2 bg-rose-200/70 text-rose-900 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Spring 2026 Bloom Collection</span>
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-stone-900 font-bold leading-tight">
              Fresh Blooms, Handcrafted with <span className="text-[#2D5A43] italic font-normal">Pure Love</span>.
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm md:text-base leading-relaxed max-w-lg">
              Welcome to Ron's Bloom Crafts. Every bouquet is artfully arranged by master florists using sunrise-harvested stems, packed in sustainable moisture pouches, and delivered with bespoke message cards.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('Rose themed flowers')}
                className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-full bg-[#2D5A43] text-white text-sm font-medium hover:bg-emerald-800 transition shadow-md flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Explore Rose Stems</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('Mixed flowers')}
                className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-full bg-white/80 border border-stone-300 text-stone-800 text-sm font-medium hover:bg-white transition cursor-pointer flex items-center justify-center"
              >
                Curated Mixed Flowers
              </button>
            </div>
            {/* Quick Badges */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 sm:pt-6 border-t border-rose-200/50 text-[11px] sm:text-xs text-stone-600">
              <div className="flex items-center space-x-1.5 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
                <span>Same-day delivery</span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
                <span>7-Day Fresh Guarantee</span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
                <span>Custom Card Included</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Collage */}
          <div className="relative">
            <div className="relative z-10 w-full aspect-[16/10] sm:aspect-4/3 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl border-4 border-white">
              <img
                src="/hero.png"
                alt="Ron's Bloom Crafts hero floral arrangement"
                className="w-full h-full object-cover transform hover:scale-105 transition duration-700"
              />
            </div>
            {/* Floating floral badge */}
            <div className="absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-rose-100 hidden sm:flex items-center space-x-3 z-20">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-[#2D5A43]">
                <Flower2 className="w-6 h-6" />
              </div>
              <div>
                <span className="font-serif font-bold text-stone-900 block text-sm">
                  Ron's Signature Bouquet
                </span>
                <span className="text-xs text-stone-500">Over 1,200+ Delivered This Month</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Best Seller Card Slider */}
      <BestSellerSlider
        products={products}
        wishlist={wishlist}
        onAddToCart={onAddToCart}
        onToggleWishlist={onToggleWishlist}
        onSelectProduct={onSelectProduct}
      />

      {/* Curated Botanicals: Shop by Category Grid */}
      <CategoryGrid
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        products={products}
        isLoading={isLoading}
      />

      {/* Main Catalog Live Grid */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 sm:mb-6 px-1 sm:px-0">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                    {selectedCategory}
                  </h3>
                  {selectedCategory && selectedCategory !== 'All Blooms' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All Blooms')}
                      className="text-[11px] text-[#2D5A43] hover:underline flex items-center space-x-1 cursor-pointer ml-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Show All Blooms</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Showing {filteredProducts.length} handcrafted floral arrangements
                </p>
              </div>

              {/* Mobile Grid Columns Switcher (2 cols vs 3 cols) */}
              <div className="flex sm:hidden items-center space-x-1 bg-stone-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMobileGridCols(2)}
                  className={`p-1.5 rounded-lg transition text-xs flex items-center ${
                    mobileGridCols === 2
                      ? 'bg-white text-[#2D5A43] shadow-xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  aria-label="2 Columns View"
                  title="2 Columns View"
                >
                  <Grid2x2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMobileGridCols(3)}
                  className={`p-1.5 rounded-lg transition text-xs flex items-center ${
                    mobileGridCols === 3
                      ? 'bg-white text-[#2D5A43] shadow-xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  aria-label="3 Columns View"
                  title="3 Columns View"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {searchQuery && (
              <div className="text-xs bg-emerald-50 text-[#2D5A43] px-3.5 py-1.5 rounded-full border border-emerald-200 flex items-center space-x-1.5">
                <span>Filter: &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-emerald-950 font-bold ml-1 cursor-pointer"
                  title="Clear search"
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
              <Flower2 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h4 className="font-serif text-stone-800 font-bold text-lg">
                No Blooming Bouquets Found
              </h4>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                No floral arrangements matched your current category selection.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All Blooms');
                  setSearchQuery('');
                }}
                className="mt-4 px-5 py-2 rounded-full bg-[#2D5A43] text-white text-xs font-semibold hover:bg-emerald-800 transition inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters & Show All Blooms</span>
              </button>
            </div>
          ) : (
            <div
              className={`grid ${
                mobileGridCols === 3
                  ? 'grid-cols-3 gap-2 sm:gap-6'
                  : 'grid-cols-2 gap-2.5 sm:gap-6'
              } sm:grid-cols-3 lg:grid-cols-4`}
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlist.includes(product.id)}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                  onSelectProduct={onSelectProduct}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default StorefrontView;
