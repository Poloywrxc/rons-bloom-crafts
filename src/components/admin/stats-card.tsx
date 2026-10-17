'use client';

import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext: React.ReactNode;
  valueColorClass?: string;
}

export function StatsCard({
  label,
  value,
  subtext,
  valueColorClass = 'text-white'
}: StatsCardProps) {
  return (
    <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700">
      <span className="text-xs text-stone-400">{label}</span>
      <div className={`font-serif text-2xl font-bold mt-1 ${valueColorClass}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px]">{subtext}</div>
    </div>
  );
}

export default StatsCard;
