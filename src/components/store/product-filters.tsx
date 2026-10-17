'use client';

import React from 'react';
import { Filter } from 'lucide-react';

interface ProductFiltersProps {
  priceRange: number;
  setPriceRange: (val: number) => void;
  onReset: () => void;
}

export function ProductFilters({
  priceRange,
  setPriceRange,
  onReset
}: ProductFiltersProps) {
  return (
    <div className="w-full lg:w-64 shrink-0 space-y-6 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs h-fit">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <span className="font-serif font-bold text-stone-900 flex items-center space-x-2">
          <Filter className="w-4 h-4 text-[#2D5A43]" />
          <span>Filter Stems</span>
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-[#2D5A43] hover:underline cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* Price Range Slider */}
      <div>
        <div className="flex justify-between items-center text-xs font-medium text-stone-700 mb-2">
          <span>Maximum Price:</span>
          <span className="font-bold text-[#2D5A43]">${priceRange}</span>
        </div>
        <input
          type="range"
          min="30"
          max="150"
          step="5"
          value={priceRange}
          onChange={(e) => setPriceRange(Number(e.target.value))}
          className="w-full accent-[#2D5A43] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-stone-600 mt-1">
          <span>$30</span>
          <span>$150+</span>
        </div>
      </div>

      {/* Occasions / Tag Badges */}
      <div>
        <span className="text-xs font-bold text-stone-800 block mb-2">Florist Note Guarantee</span>
        <div className="space-y-2 text-xs text-stone-600">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded text-[#2D5A43] focus:ring-[#2D5A43]" />
            <span>Includes Gift Card</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded text-[#2D5A43] focus:ring-[#2D5A43]" />
            <span>Moisture Pack Shield</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" className="rounded text-[#2D5A43] focus:ring-[#2D5A43]" />
            <span>Luxury Glass Vase (+ $15)</span>
          </label>
        </div>
      </div>

      {/* Promo banner */}
      <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs">
        <span className="font-bold text-rose-900 block mb-1">💐 Promo: BLOOMMAGIC</span>
        <span className="text-rose-700 text-[11px] leading-relaxed">
          Enjoy 15% discount on all Bridal & Peony orders placed today.
        </span>
      </div>
    </div>
  );
}

export default ProductFilters;
