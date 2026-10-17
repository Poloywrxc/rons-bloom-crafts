'use client';

import React from 'react';
import Image from 'next/image';

interface LogoProps {
  onClick?: () => void;
  className?: string;
}

export function Logo({ onClick, className = '' }: LogoProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-2 sm:space-x-2.5 cursor-pointer group select-none min-w-0 shrink-0 ${className}`}
      title="Ron's Bloom Crafts - Return to Store"
    >
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-xs border border-stone-200/80 shrink-0 bg-emerald-50/50">
        <Image
          src="/logo.png"
          alt="Ron's Bloom Crafts Logo"
          width={40}
          height={40}
          className="w-full h-full object-cover"
          priority
        />
      </div>
      <div className="min-w-0">
        <span className="text-sm xs:text-base sm:text-lg md:text-xl font-serif font-bold tracking-tight text-[#2D5A43] block leading-tight whitespace-nowrap">
          Ron’s Bloom Crafts
        </span>
        <span className="hidden sm:block text-[9px] md:text-[10px] tracking-widest uppercase text-stone-500 font-sans font-semibold whitespace-nowrap">
          Artisan Florist & Botanicals
        </span>
      </div>
    </div>
  );
}

export default Logo;
