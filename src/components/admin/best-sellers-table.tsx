'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Star,
  Award,
  TrendingUp,
  PackageCheck,
  CheckCircle2,
  Loader2,
  ArrowUpDown,
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import { Product } from '@/types/product';
import { Order } from '@/types/order';
import { SalesItem } from '@/types/sales';
import { toggleProductBestsellerAction } from '@/actions/product/action';
import { fetchAllSalesAdmin } from '@/actions/sales/action';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface BestSellersTableProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders?: Order[];
  onNotify?: (msg: string) => void;
  onEditProduct?: (product: Product) => void;
}

export function BestSellersTable({
  products,
  setProducts,
  orders = [],
  onNotify,
  onEditProduct
}: BestSellersTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'tagged' | 'with-sales' | 'high-rated'>('all');
  const [sortBy, setSortBy] = useState<'sales' | 'revenue' | 'featured' | 'rating'>('sales');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [salesRecords, setSalesRecords] = useState<SalesItem[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  // Currency fixed to Philippine Peso (₱) matching the Sales Table
  const currencySymbol = '₱';

  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  // Load live sales database records to compute accurate sales metrics
  const loadSales = useCallback(async () => {
    setIsLoadingSales(true);
    try {
      const res = await fetchAllSalesAdmin();
      if (res.success && Array.isArray(res.sales)) {
        setSalesRecords(res.sales);
      }
    } catch (err) {
      console.warn('Could not fetch sales records for best sellers:', err);
    } finally {
      setIsLoadingSales(false);
    }
  }, []);

  // Fetch sales on initial mount and setup Supabase Realtime subscriptions
  useEffect(() => {
    loadSales();

    let itemsChannel: any = null;
    let ordersChannel: any = null;

    try {
      const supabase = createClient();

      itemsChannel = supabase
        .channel('bestsellers-sales-order-items')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'order_items' },
          () => {
            loadSales();
          }
        )
        .subscribe();

      ordersChannel = supabase
        .channel('bestsellers-sales-orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            loadSales();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription not established for best sellers:', e);
    }

    return () => {
      if (itemsChannel) itemsChannel.unsubscribe();
      if (ordersChannel) ordersChannel.unsubscribe();
    };
  }, [loadSales]);

  // Comprehensive Product Sales Map (Units Sold & Revenue)
  // Strictly linked to database sales records - each sale item is attributed to its matching product once
  const productSalesMap = useMemo(() => {
    const map = new Map<string, { unitsSold: number; revenue: number }>();

    // 1. Process directly from salesRecords (order_items table - same source as Sales table)
    if (salesRecords.length > 0) {
      salesRecords.forEach((item) => {
        const qty = Number(item.quantitySold) || 1;
        const rev = Number(item.sales) || qty * Number(item.price || 0);

        // Find matching product in catalog
        const matchedProduct = products.find(
          (p) =>
            (item.productId && p.id === item.productId) ||
            (p.name && item.productName && p.name.toLowerCase().trim() === item.productName.toLowerCase().trim())
        );

        const targetKey = matchedProduct?.id || item.productId || item.productName.toLowerCase().trim();
        const prev = map.get(targetKey) || { unitsSold: 0, revenue: 0 };
        map.set(targetKey, {
          unitsSold: prev.unitsSold + qty,
          revenue: prev.revenue + rev
        });
      });
    } else {
      // 2. Fallback to orders prop if sales records are not loaded yet
      orders.forEach((o) => {
        o.items?.forEach((item) => {
          const qty = Number(item.qty) || 1;
          const rev = qty * Number(item.price || 0);
          const matchedProduct = products.find(
            (p) => p.name && item.name && p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
          );
          const targetKey = matchedProduct?.id || item.name.toLowerCase().trim();
          const prev = map.get(targetKey) || { unitsSold: 0, revenue: 0 };
          map.set(targetKey, {
            unitsSold: prev.unitsSold + qty,
            revenue: prev.revenue + rev
          });
        });
      });
    }

    return map;
  }, [salesRecords, orders, products]);

  // Helper to fetch stats for a product directly from the linked sales records
  const getStats = useCallback(
    (prod: Product) => {
      const byId = prod.id ? productSalesMap.get(prod.id) : null;
      const byName = prod.name ? productSalesMap.get(prod.name.toLowerCase().trim()) : null;
      const stat = byId || byName || { unitsSold: 0, revenue: 0 };
      return {
        unitsSold: stat.unitsSold,
        revenue: stat.revenue
      };
    },
    [productSalesMap]
  );

  // Sort products based on selected mode - Best sellers determined strictly by units sold
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aStats = getStats(a);
      const bStats = getStats(b);

      if (sortBy === 'sales' || sortBy === 'featured') {
        // Determine strictly by quantity of units sold only
        if (bStats.unitsSold !== aStats.unitsSold) return bStats.unitsSold - aStats.unitsSold;
        return (b.rating || 0) - (a.rating || 0);
      }

      if (sortBy === 'revenue') {
        if (bStats.revenue !== aStats.revenue) return bStats.revenue - aStats.revenue;
        return bStats.unitsSold - aStats.unitsSold;
      }

      // Default rating
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return bStats.unitsSold - aStats.unitsSold;
    });
  }, [products, sortBy, getStats]);

  // Filter products: Best Sellers determined by units sold only
  const filteredProducts = useMemo(() => {
    return sortedProducts.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q));

      const stats = getStats(p);

      if (filterMode === 'tagged' || filterMode === 'with-sales') return matchesSearch && stats.unitsSold > 0;
      if (filterMode === 'high-rated') return matchesSearch && (p.rating || 0) >= 4.9;
      return matchesSearch;
    });
  }, [sortedProducts, searchQuery, filterMode, getStats]);

  // Toggle Bestseller Status with Database Persistence
  const toggleBestsellerTag = async (productId: string) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const currentTags = targetProduct.tags || [];
    const currentlyFeatured = Boolean(
      targetProduct.isFeatured || currentTags.some((t) => t.toLowerCase().includes('bestseller'))
    );
    const willFeature = !currentlyFeatured;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const tags = p.tags || [];
          const updatedTags = willFeature
            ? (tags.some((t) => t.toLowerCase().includes('bestseller')) ? tags : [...tags, 'Bestseller'])
            : tags.filter((t) => !t.toLowerCase().includes('bestseller'));
          return {
            ...p,
            tags: updatedTags,
            isFeatured: willFeature
          };
        }
        return p;
      })
    );

    const action = willFeature ? 'Featured in' : 'Removed from';
    onNotify?.(`${action} storefront Best Sellers carousel! ✨`);

    setUpdatingId(productId);
    try {
      const res = await toggleProductBestsellerAction(productId, willFeature);
      if (!res.success) {
        // Revert on failure
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === productId) {
              return {
                ...p,
                tags: currentTags,
                isFeatured: currentlyFeatured
              };
            }
            return p;
          })
        );
        onNotify?.(`Database note: ${res.error || 'Failed to update'}`);
      }
    } catch (err: any) {
      console.error('Error toggling bestseller:', err);
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              tags: currentTags,
              isFeatured: currentlyFeatured
            };
          }
          return p;
        })
      );
      onNotify?.('Error persisting bestseller status to database.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics computation
  // Metrics computation: Best Sellers determined strictly by quantity of sold only
  const bestsellers = useMemo(() => {
    return products.filter((p) => getStats(p).unitsSold > 0);
  }, [products, getStats]);

  const bestsellerCount = bestsellers.length;

  const totalBestsellerRevenue = bestsellers.reduce((sum, p) => sum + getStats(p).revenue, 0);

  const totalBestsellerUnits = bestsellers.reduce((sum, p) => sum + getStats(p).unitsSold, 0);

  // Top Bouquet (by sales or highest rating)
  const topBouquet = useMemo(() => {
    if (products.length === 0) return null;
    return [...products].sort((a, b) => {
      const aSales = getStats(a).unitsSold;
      const bSales = getStats(b).unitsSold;
      if (bSales !== aSales) return bSales - aSales;
      return (b.rating || 0) - (a.rating || 0);
    })[0];
  }, [products, getStats]);

  const topBouquetStats = topBouquet ? getStats(topBouquet) : { unitsSold: 0, revenue: 0 };

  // Calculate dynamic catalog rating average
  const averageCatalogRating = useMemo(() => {
    if (products.length === 0) return 5.0;
    const total = products.reduce((sum, p) => sum + (p.rating || 5.0), 0);
    return total / products.length;
  }, [products]);

  const totalReviews = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.reviewsCount || 0), 0);
  }, [products]);

  const productsWithSalesCount = useMemo(() => {
    return products.filter((p) => getStats(p).unitsSold > 0).length;
  }, [products, getStats]);

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards for Best Sellers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Best Sellers by Quantity Sold */}
        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Verified Best Sellers</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-serif font-bold text-2xl text-stone-900">{bestsellerCount}</span>
            <span className="text-[10px] text-stone-400 font-mono">with sales</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Ranked by Quantity Sold Only</span>
        </div>

        {/* Card 2: Top Performing Bouquet */}
        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Top Performing Bouquet</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-bold text-sm text-stone-900 truncate">
            {topBouquet?.name || 'No catalog items'}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold font-mono truncate">
            ★ {topBouquet?.rating?.toFixed(1) || '5.0'} &bull;{' '}
            {topBouquetStats.unitsSold > 0
              ? `${topBouquetStats.unitsSold} Sold (${formatMoney(topBouquetStats.revenue)})`
              : `${topBouquet?.reviewsCount || 0} Reviews`}
          </div>
        </div>

        {/* Card 3: Bestseller Sales Volume */}
        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Bestseller Revenue</span>
            <DollarSign className="w-4 h-4 text-[#2D5A43]" />
          </div>
          <div className="font-serif font-bold text-2xl text-stone-900">
            {formatMoney(totalBestsellerRevenue)}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium font-mono">
            {totalBestsellerUnits} Units Sold from Bestsellers
          </span>
        </div>

        {/* Card 4: Catalog Satisfaction Index */}
        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Satisfaction Index</span>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div className="font-serif font-bold text-2xl text-stone-900">
            {averageCatalogRating.toFixed(2)} / 5.0
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">
            {totalReviews > 0 ? `${totalReviews} Verified Reviews` : '100% Master Floral Quality'}
          </span>
        </div>
      </div>

      {/* Main Best Sellers Directory */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Header & Controls */}
        <div className="p-5 sm:p-6 border-b border-stone-200/80 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-stone-900 text-xl">
              Best Sellers Management
            </h3>
            <p className="text-xs text-stone-500">
              Ranked and determined strictly by total quantity of units sold across completed sales and customer orders.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bouquet by name, category..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
            />
          </div>
        </div>

        {/* Filter Pills & Sorting Options */}
        <div className="px-6 py-3 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-stone-50/30">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                filterMode === 'all'
                  ? 'bg-[#2D5A43] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>All Catalog Items ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('tagged')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                filterMode === 'tagged'
                  ? 'bg-[#2D5A43] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Best Sellers With Sales ({bestsellerCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('with-sales')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                filterMode === 'with-sales'
                  ? 'bg-[#2D5A43] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              <span>With Recorded Sales ({productsWithSalesCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('high-rated')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                filterMode === 'high-rated'
                  ? 'bg-[#2D5A43] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Top Rated (★ 4.9+)</span>
            </button>
          </div>

          {/* Sort By Selector */}
          <div className="flex items-center space-x-1.5 text-stone-500 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[11px] font-medium">Rank by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#2D5A43] cursor-pointer"
            >
              <option value="sales">Sales Volume (Units Sold)</option>
              <option value="revenue">Total Revenue Generated</option>
              <option value="featured">Featured Status</option>
              <option value="rating">Customer Rating</option>
            </select>
          </div>
        </div>

        {/* Products Table with Real Sales Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100/70 text-stone-600 uppercase text-[10px] tracking-wider font-mono">
              <tr>
                <th className="p-4 pl-6">Rank & Bouquet</th>
                <th className="p-4">Units Sold</th>
                <th className="p-4">Sales Revenue</th>
                <th className="p-4">Rating & Feedback</th>
                <th className="p-4">Stock Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500 text-xs">
                    No best sellers match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, idx) => {
                  const isFeatured = Boolean(
                    product.isFeatured || product.tags?.some((t) => t.toLowerCase().includes('bestseller'))
                  );
                  const stats = getStats(product);
                  const isUpdating = updatingId === product.id;

                  return (
                    <tr key={product.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Rank & Bouquet */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-7 text-center font-mono font-bold text-stone-400 text-xs shrink-0">
                            {idx === 0 && <span className="text-amber-500 font-extrabold">🏆 1</span>}
                            {idx === 1 && <span className="text-slate-400 font-extrabold">🥈 2</span>}
                            {idx === 2 && <span className="text-amber-700 font-extrabold">🥉 3</span>}
                            {idx > 2 && `#${idx + 1}`}
                          </div>

                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>

                          <div className="min-w-0">
                            <span className="font-bold text-stone-900 text-xs block truncate">
                              {product.name}
                            </span>
                            <span className="text-[11px] text-stone-500 block truncate">
                              {product.freshness || 'Studio Handcrafted'}
                            </span>
                          </div>
                        </div>
                      </td>


                      {/* Units Sold (Direct from Sales) */}
                      <td className="p-4">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`font-mono font-bold text-xs ${
                              stats.unitsSold > 0 ? 'text-emerald-700' : 'text-stone-400'
                            }`}
                          >
                            {stats.unitsSold} sold
                          </span>
                          {stats.unitsSold > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sales Revenue */}
                      <td className="p-4">
                        <div
                          className={`font-serif font-bold text-xs ${
                            stats.revenue > 0 ? 'text-[#2D5A43]' : 'text-stone-400'
                          }`}
                        >
                          {formatMoney(stats.revenue)}
                        </div>
                      </td>

                      {/* Rating & Feedback */}
                      <td className="p-4">
                        <div className="flex items-center space-x-1 text-stone-800 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{product.rating?.toFixed(1) || '5.0'}</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            ({product.reviewsCount || 0} reviews)
                          </span>
                        </div>
                      </td>

                      {/* Stock Status */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            (product.stock ?? 0) > 5
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{product.stock ?? 0} in stock</span>
                        </span>
                      </td>


                      {/* Actions */}
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => toggleBestsellerTag(product.id)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition cursor-pointer border shadow-2xs ${
                            isFeatured
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-[#2D5A43] border-emerald-300'
                          } disabled:opacity-50`}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3 h-3 animate-spin text-current" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          <span>{isFeatured ? 'Remove Bestseller' : 'Feature as Bestseller'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BestSellersTable;
