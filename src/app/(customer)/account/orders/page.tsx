'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function OrdersPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-4">
      <Link href="/" className="inline-flex items-center space-x-2 text-xs font-semibold text-[#2D5A43] hover:underline">
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Main Studio</span>
      </Link>
      <h1 className="text-2xl font-serif font-bold text-stone-900 capitalize">orders</h1>
      <p className="text-xs text-stone-500">Dedicated view managed by Ron's Bloom Crafts App Router.</p>
    </div>
  );
}
