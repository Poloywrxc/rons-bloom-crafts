'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search peonies, wild roses, gift hampers...',
  className = '',
  autoFocus = false
}: SearchBarProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <Search className="w-4 h-4 text-stone-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/40 focus:bg-white transition text-stone-800"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-800"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default SearchBar;
