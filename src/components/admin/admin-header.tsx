'use client';

import React from 'react';
import { ShieldCheck, Plus, TrendingUp } from 'lucide-react';
import { StatsCard } from './stats-card';

interface AdminHeaderProps {
  totalRevenue: number;
  activeDeliveriesCount: number;
  inventoryCount: number;
  satisfactionRating?: string;
  reviewsCount?: number;
  onOpenAddModal?: () => void;
}

export function AdminHeader({
  totalRevenue,
  activeDeliveriesCount,
  inventoryCount,
  satisfactionRating = '4.92 / 5.0',
  reviewsCount = 182,
  onOpenAddModal
}: AdminHeaderProps) {
  return (
    <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-800 pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
              Admin Console
            </span>
            <h2 className="font-serif text-2xl font-bold">
              Ron’s Bloom Crafts Management Suite
            </h2>
          </div>
        </div>

        {onOpenAddModal && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-[#2D5A43] hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Floral Bouquet</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatsCard
          label="Total Floral Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          subtext={
            <span className="text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> +18.4% this week
            </span>
          }
        />
        <StatsCard
          label="Active Deliveries"
          value={activeDeliveriesCount}
          subtext={<span className="text-amber-400">In Florist Pipeline</span>}
        />
        <StatsCard
          label="Inventory Items"
          value={inventoryCount}
          subtext={<span className="text-stone-400">Active Live SKUs</span>}
        />
        <StatsCard
          label="Shop Satisfaction"
          value={satisfactionRating}
          valueColorClass="text-amber-400"
          subtext={<span className="text-stone-400">Based on {reviewsCount} reviews</span>}
        />
      </div>
    </div>
  );
}

export default AdminHeader;
