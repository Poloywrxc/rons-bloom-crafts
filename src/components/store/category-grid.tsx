'use client';

import React, { useMemo } from 'react';
import {
  Flower2,
  Heart,
  Sparkles,
  Sun,
  Palette,
  Scissors,
  Leaf,
  Layers
} from 'lucide-react';
import { Product } from '@/types/product';
import { CategoryItem } from '@/types/category';

export interface CategoryGridProps {
  categories: (string | CategoryItem)[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  products?: Product[];
  isLoading?: boolean;
}

const getCategoryIcon = (category: string) => {
  const norm = category.toLowerCase();
  if (norm.includes('all')) return <Flower2 className="w-5 h-5" />;
  if (norm.includes('mixed')) return <Flower2 className="w-5 h-5" />;
  if (norm.includes('rose')) return <Heart className="w-5 h-5" />;
  if (norm.includes('custom') || norm.includes('bespoke')) return <Sparkles className="w-5 h-5" />;
  if (norm.includes('sunflower') || norm.includes('sun')) return <Sun className="w-5 h-5" />;
  if (norm.includes('satin')) return <Palette className="w-5 h-5" />;
  if (norm.includes('fuzzy') || norm.includes('wire')) return <Scissors className="w-5 h-5" />;
  if (norm.includes('dried')) return <Leaf className="w-5 h-5" />;
  return <Layers className="w-5 h-5" />;
};

export function CategoryGrid({
  categories,
  selectedCategory,
  onSelectCategory,
  products = [],
  isLoading = false
}: CategoryGridProps) {
  // Normalize categories list to clean name, count, and description
  const normalizedCategories = useMemo(() => {
    const list: { name: string; count: number }[] = [];

    const activeProducts = products.filter((p) => p.status !== 'inactive');
    const totalCount = activeProducts.length;

    // 1. All Blooms is always the first master card
    list.push({
      name: 'All Blooms',
      count: totalCount
    });

    // 2. Loop through categories (handling string[] or CategoryItem[])
    categories.forEach((cat) => {
      const name = typeof cat === 'string' ? cat : cat.name;
      if (!name || name === 'All Blooms') return;

      const count = activeProducts.filter(
        (p) => p.category?.trim().toLowerCase() === name.trim().toLowerCase()
      ).length;

      if (!list.some((existing) => existing.name.toLowerCase() === name.toLowerCase())) {
        list.push({ name, count });
      }
    });

    return list;
  }, [categories, products]);

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-5 sm:mb-8">
        <span className="text-[11px] sm:text-xs uppercase tracking-widest text-[#2D5A43] font-bold">
          Curated Botanicals
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
          Shop by Category
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Hand-picked selections crafted for every milestone and celebration.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
        {normalizedCategories.map((cat, idx) => {
          const isSelected = selectedCategory === cat.name;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectCategory(cat.name)}
              className={`p-3 sm:p-4 rounded-2xl text-center transition-all duration-200 flex flex-col items-center justify-center border cursor-pointer min-h-[115px] sm:min-h-[125px] ${
                isSelected
                  ? 'bg-[#2D5A43] text-white border-[#2D5A43] shadow-md shadow-emerald-950/20 ring-2 ring-emerald-600/30'
                  : 'bg-white text-stone-700 border-stone-200/90 hover:border-emerald-300 hover:bg-stone-50/80 hover:shadow-xs'
              }`}
            >
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105 shrink-0 ${
                  isSelected
                    ? 'bg-white/20 text-white shadow-inner'
                    : 'bg-rose-50 text-[#2D5A43]'
                }`}
              >
                {getCategoryIcon(cat.name)}
              </div>

              <div className="w-full flex flex-col items-center justify-center">
                <span className="text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 text-center">
                  {cat.name}
                </span>
                <span
                  className={`text-[10px] font-medium mt-1 block ${
                    isSelected ? 'text-emerald-100' : 'text-stone-600'
                  }`}
                >
                  {isLoading ? '...' : `${cat.count} ${cat.count === 1 ? 'stem' : 'stems'}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default CategoryGrid;
