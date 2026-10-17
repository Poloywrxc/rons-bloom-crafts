'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Search,
  Plus,
  Download,
  Sparkles,
  ShoppingBag,
  Check,
  X,
  Edit2,
  Trash2,
  Coins,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { SalesItem } from '@/types/sales';
import { Product } from '@/types/product';
import { Order } from '@/types/order';
import { createClient } from '@/lib/supabase/client';
import {
  fetchAllSalesAdmin,
  recordSaleAction,
  updateSaleAction,
  deleteSaleAction
} from '@/actions/sales/action';

interface SalesTableProps {
  products?: Product[];
  orders?: Order[];
  onNotify?: (message: string) => void;
  onRefreshOrders?: () => Promise<void>;
}

export function SalesTable({
  products = [],
  orders = [],
  onNotify,
  onRefreshOrders
}: SalesTableProps) {
  // Live database sales state (no hardcoded seeds)
  const [salesRecords, setSalesRecords] = useState<SalesItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // New Sale Form State
  const [formProductMode, setFormProductMode] = useState<'catalog' | 'custom'>('custom');
  const [formSelectedProductId, setFormSelectedProductId] = useState<string>('');
  const [formProductName, setFormProductName] = useState('');
  const [formCategory, setFormCategory] = useState('Mixed flowers');
  const [formQuantitySold, setFormQuantitySold] = useState<number>(1);
  const [formPrice, setFormPrice] = useState<number>(500);

  // Quick inline edit state
  const [editQty, setEditQty] = useState<number>(1);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Currency is fixed to Philippine Peso (₱) - USD removed
  const currencySymbol = '₱';

  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  // Load live sales data from Supabase database based on schema.sql
  const loadSalesFromDatabase = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAllSalesAdmin();
      if (res.success && Array.isArray(res.sales)) {
        setSalesRecords(res.sales);
      } else if (res.error) {
        console.warn('Sales database load note:', res.error);
      }
    } catch (err) {
      console.warn('Failed to fetch sales from database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch sales on initial mount and setup Supabase Realtime subscriptions
  useEffect(() => {
    loadSalesFromDatabase();

    let itemsChannel: any = null;
    let ordersChannel: any = null;

    try {
      const supabase = createClient();

      itemsChannel = supabase
        .channel('admin-sales-order-items')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'order_items' },
          () => {
            loadSalesFromDatabase();
          }
        )
        .subscribe();

      ordersChannel = supabase
        .channel('admin-sales-orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            loadSalesFromDatabase();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Supabase realtime subscription note:', err);
    }

    return () => {
      try {
        const supabase = createClient();
        if (itemsChannel) supabase.removeChannel(itemsChannel);
        if (ordersChannel) supabase.removeChannel(ordersChannel);
      } catch {}
    };
  }, [loadSalesFromDatabase]);

  // Derive unique categories from active sales records and catalog products
  const categories = useMemo(() => {
    const fromSales = salesRecords.map((r) => r.category).filter(Boolean);
    const fromProducts = products.map((p) => p.category).filter(Boolean);
    const list = Array.from(new Set([...fromSales, ...fromProducts]));
    return ['All', ...list];
  }, [salesRecords, products]);

  // Filtered sales records
  const filteredRecords = useMemo(() => {
    return salesRecords.filter((rec) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        rec.productName.toLowerCase().includes(q) ||
        (rec.category && rec.category.toLowerCase().includes(q)) ||
        (rec.sku && rec.sku.toLowerCase().includes(q));

      const matchCategory = selectedCategory === 'All' || rec.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [salesRecords, searchTerm, selectedCategory]);

  // Totals calculated from filtered records
  const totalQuantitySold = useMemo(() => {
    return filteredRecords.reduce((sum, item) => sum + item.quantitySold, 0);
  }, [filteredRecords]);

  const totalSalesRevenue = useMemo(() => {
    return filteredRecords.reduce((sum, item) => sum + item.sales, 0);
  }, [filteredRecords]);

  const topSellingProduct = useMemo(() => {
    if (filteredRecords.length === 0) return null;
    return [...filteredRecords].sort((a, b) => {
      if (b.quantitySold !== a.quantitySold) return b.quantitySold - a.quantitySold;
      return b.sales - a.sales;
    })[0];
  }, [filteredRecords]);

  // Real-time calculation preview for modal
  const formComputedSales = useMemo(() => {
    const qty = Number(formQuantitySold) || 0;
    const prc = Number(formPrice) || 0;
    return qty * prc;
  }, [formQuantitySold, formPrice]);

  // Start Inline Edit
  const handleStartEdit = (record: SalesItem) => {
    setEditingItemId(record.id);
    setEditQty(record.quantitySold);
    setEditPrice(record.price);
  };

  // Save Inline Edit to Database
  const handleSaveEdit = async (recordId: string) => {
    const validQty = Math.max(1, Number(editQty) || 1);
    const validPrice = Math.max(0, Number(editPrice) || 0);

    setIsSavingEdit(true);
    try {
      const res = await updateSaleAction(recordId, validQty, validPrice);
      if (res.success) {
        setSalesRecords((prev) =>
          prev.map((rec) => {
            if (rec.id !== recordId) return rec;
            return {
              ...rec,
              quantitySold: validQty,
              price: validPrice,
              sales: validQty * validPrice
            };
          })
        );
        setEditingItemId(null);
        onNotify?.(`Updated sale record in database!`);
        if (onRefreshOrders) onRefreshOrders();
      } else {
        alert(`Failed to update sale: ${res.error || 'Database error'}`);
      }
    } catch (err: any) {
      alert(`Database error: ${err?.message || 'Failed to update'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Record from Database
  const handleDeleteRecord = async (recordId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the sales record for "${name}" from the database?`)) {
      return;
    }

    try {
      const res = await deleteSaleAction(recordId);
      if (res.success) {
        setSalesRecords((prev) => prev.filter((r) => r.id !== recordId));
        onNotify?.(`Removed sales entry for "${name}" from database`);
        if (onRefreshOrders) onRefreshOrders();
      } else {
        alert(`Failed to delete record: ${res.error || 'Database error'}`);
      }
    } catch (err: any) {
      alert(`Database error: ${err?.message || 'Failed to delete'}`);
    }
  };

  // Handle New Sale Creation in Database
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();

    let name = formProductName.trim();
    let cat = formCategory;
    let img = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80';
    let sku = `RBC-${Date.now().toString().slice(-4)}`;
    let prodId: string | undefined = undefined;

    if (formProductMode === 'catalog' && formSelectedProductId) {
      const prod = products.find((p) => p.id === formSelectedProductId);
      if (prod) {
        prodId = prod.id;
        name = prod.name;
        cat = prod.category;
        img = prod.image;
        sku = prod.sku || `RBC-${prod.id.slice(0, 4).toUpperCase()}`;
      }
    }

    if (!name) {
      alert('Please enter a product name or select one from catalog.');
      return;
    }

    const qty = Math.max(1, Number(formQuantitySold) || 1);
    const prc = Math.max(0, Number(formPrice) || 0);

    setIsSubmitting(true);
    try {
      const res = await recordSaleAction({
        productName: name,
        category: cat,
        productId: prodId,
        quantitySold: qty,
        price: prc,
        image: img,
        sku
      });

      if (res.success && res.sale) {
        setSalesRecords((prev) => [res.sale!, ...prev]);
        setIsRecordModalOpen(false);

        // Reset Form
        setFormProductName('');
        setFormQuantitySold(1);
        setFormPrice(500);

        onNotify?.(`Sale recorded in database: ${qty}x ${name} (${formatMoney(qty * prc)})`);
        if (onRefreshOrders) onRefreshOrders();
      } else {
        alert(`Failed to record sale: ${res.error || 'Database error'}`);
      }
    } catch (err: any) {
      alert(`Database error: ${err?.message || 'Failed to record sale'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Product', 'Quantity Sold', 'Price (PHP)', 'Sales (PHP)', 'Category', 'SKU', 'Date'];
    const rows = filteredRecords.map((r) => [
      `"${r.productName}"`,
      r.quantitySold,
      r.price,
      r.sales,
      `"${r.category}"`,
      `"${r.sku || ''}"`,
      `"${r.dateRecorded || ''}"`
    ]);

    // Total row
    rows.push(['"Total Sales"', totalQuantitySold, '""', totalSalesRevenue, '""', '""', '""']);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rons-bloom-crafts-sales-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-gradient-to-br from-[#1E3A2B] to-[#12231A] text-white p-5 rounded-3xl border border-emerald-600/30 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-20 h-20 text-emerald-300" />
          </div>
          <div className="flex items-center justify-between text-emerald-300 text-xs font-mono mb-2">
            <span className="uppercase tracking-wider font-semibold">Total Sales</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px]">
              Σ (Qty × Price)
            </span>
          </div>
          <div className="font-serif font-bold text-3xl text-white tracking-tight">
            {formatMoney(totalSalesRevenue)}
          </div>
          <p className="text-[11px] text-emerald-200/80 mt-2 flex items-center gap-1">
            <span>Aggregated across {filteredRecords.length} product records</span>
          </p>
        </div>

        {/* Total Quantity Sold */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-2">
            <span className="font-medium uppercase tracking-wider font-mono">Total Quantity Sold</span>
            <ShoppingBag className="w-4 h-4 text-[#2D5A43]" />
          </div>
          <div className="font-serif font-bold text-3xl text-stone-900 tracking-tight">
            {totalQuantitySold.toLocaleString()}
            <span className="text-xs font-sans font-normal text-stone-500 ml-1.5">units</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-2">Sum of all stems & arrangements dispatched</p>
        </div>

        {/* Average Item Sales Value */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-2">
            <span className="font-medium uppercase tracking-wider font-mono">Average Sales Value</span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif font-bold text-3xl text-stone-900 tracking-tight">
            {formatMoney(totalQuantitySold > 0 ? totalSalesRevenue / totalQuantitySold : 0)}
            <span className="text-xs font-sans font-normal text-stone-500 ml-1.5">/ unit</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-2">Weighted average selling price</p>
        </div>

        {/* Top Performer */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-2">
            <span className="font-medium uppercase tracking-wider font-mono">Top Sales Star</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-serif font-bold text-lg text-stone-900 truncate">
            {topSellingProduct ? topSellingProduct.productName : 'None yet'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1">
            <span>{topSellingProduct ? `${topSellingProduct.quantitySold} sold` : '—'}</span>
            <span className="font-semibold text-emerald-800">
              {topSellingProduct ? formatMoney(topSellingProduct.sales) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Sales Table Card */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Table Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-stone-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-stone-50/70">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search product, category, or order..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43]"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 px-3 bg-white border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43] cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            {/* Refresh from Database Button */}
            <button
              type="button"
              onClick={loadSalesFromDatabase}
              disabled={isLoading}
              className="p-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold flex items-center transition cursor-pointer shadow-2xs disabled:opacity-50"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-stone-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>Export CSV</span>
            </button>

            {/* Record Sale Button */}
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(true)}
              className="px-4 py-2 bg-[#2D5A43] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record Sale</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100/80 text-stone-700 uppercase text-[11px] font-mono tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-5 font-bold">Product</th>
                <th className="py-3.5 px-5 font-bold text-center">Quantity Sold</th>
                <th className="py-3.5 px-5 font-bold text-right">Price</th>
                <th className="py-3.5 px-5 font-bold text-right bg-emerald-50/50 text-[#2D5A43]">
                  Sales
                </th>
                <th className="py-3.5 px-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <Loader2 className="w-6 h-6 text-[#2D5A43] animate-spin" />
                      <span className="text-xs font-mono text-stone-500">
                        Connecting to database & loading sales records...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-stone-400">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <ShoppingBag className="w-10 h-10 text-stone-300 mb-3" />
                      <p className="font-semibold text-stone-700 text-sm">No sales records in database</p>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                        Customer orders placed on the storefront and atelier counter sales will appear here automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const isEditing = editingItemId === item.id;
                  const itemSales = item.quantitySold * item.price;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-stone-50/80 transition-colors group"
                    >
                      {/* 1. Product Column */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0 text-[#2D5A43]">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-stone-900 text-sm block truncate group-hover:text-[#2D5A43] transition-colors">
                              {item.productName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {(() => {
                                const isBestseller =
                                  topSellingProduct &&
                                  item.quantitySold > 0 &&
                                  (item.productName.toLowerCase() === topSellingProduct.productName.toLowerCase() ||
                                    item.quantitySold >= topSellingProduct.quantitySold);
                                return isBestseller ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300 shadow-2xs">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                    Bestseller ({item.quantitySold} sold)
                                  </span>
                                ) : null;
                              })()}
                              {item.category && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono">
                                  {item.category}
                                </span>
                              )}
                              {item.sku && (
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {item.sku}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Quantity Sold Column */}
                      <td className="py-3.5 px-5 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={editQty}
                            onChange={(e) => setEditQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 text-center py-1 px-2 border border-stone-300 rounded-lg font-mono font-bold text-xs"
                          />
                        ) : (
                          <span className="font-mono font-bold text-sm text-stone-900">
                            {item.quantitySold}
                          </span>
                        )}
                      </td>

                      {/* 3. Price Column */}
                      <td className="py-3.5 px-5 text-right font-mono text-stone-800">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={editPrice}
                            onChange={(e) => setEditPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-24 text-right py-1 px-2 border border-stone-300 rounded-lg font-mono font-bold text-xs"
                          />
                        ) : (
                          <span className="text-sm font-semibold">{formatMoney(item.price)}</span>
                        )}
                      </td>

                      {/* 4. Sales Column (Quantity Sold × Price) */}
                      <td className="py-3.5 px-5 text-right bg-emerald-50/30">
                        <span className="font-serif font-bold text-base text-[#2D5A43]">
                          {formatMoney(itemSales)}
                        </span>
                        <span className="block text-[10px] text-stone-400 font-mono">
                          {item.quantitySold} × {currencySymbol}{item.price.toLocaleString()}
                        </span>
                      </td>

                      {/* 5. Actions Column */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={isSavingEdit}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer disabled:opacity-50"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              disabled={isSavingEdit}
                              className="p-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg transition cursor-pointer"
                              title="Cancel edit"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 text-stone-500 hover:text-[#2D5A43] hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Edit Price/Quantity"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(item.id, item.productName)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Record New Sale Modal */}
      {isRecordModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isSubmitting && setIsRecordModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#121B16] text-white p-5 flex items-center justify-between border-b border-[#1F2E25]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-300 flex items-center justify-center border border-emerald-500/40">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base">Record Atelier Sale</h3>
                  <p className="text-[11px] text-stone-400">Stores directly to database orders and order_items</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsRecordModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSale} className="p-5 space-y-4">
              {/* Product Mode Toggle */}
              <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFormProductMode('custom')}
                  className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                    formProductMode === 'custom'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Custom Arrangement
                </button>
                <button
                  type="button"
                  onClick={() => setFormProductMode('catalog')}
                  className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                    formProductMode === 'catalog'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Pick from Catalog ({products.length})
                </button>
              </div>

              {/* Product Selection */}
              {formProductMode === 'custom' ? (
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase font-mono mb-1">
                    Arrangement / Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Crimson Velveteen Rose Bouquet"
                    value={formProductName}
                    onChange={(e) => setFormProductName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#2D5A43] focus:outline-hidden"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase font-mono mb-1">
                    Select Catalog Product *
                  </label>
                  <select
                    value={formSelectedProductId}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      setFormSelectedProductId(prodId);
                      const selected = products.find((p) => p.id === prodId);
                      if (selected) {
                        setFormPrice(selected.sellingPrice || selected.price || 500);
                        setFormCategory(selected.category);
                      }
                    }}
                    className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#2D5A43] focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatMoney(p.price)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase font-mono mb-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rose themed flowers, Artificial Bouquets"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#2D5A43] focus:outline-hidden"
                />
              </div>

              {/* Quantity Sold & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase font-mono mb-1">
                    Quantity Sold *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQuantitySold}
                    onChange={(e) => setFormQuantitySold(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#2D5A43] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase font-mono mb-1">
                    Selling Price ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#2D5A43] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Live Formula Preview Box */}
              <div className="bg-[#FAF7F2] border border-emerald-300/70 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
                  <span>Calculation Preview:</span>
                  <span className="text-[10px] text-emerald-700 font-bold">Qty × Price</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-700 font-mono">
                    {formQuantitySold} units × {formatMoney(formPrice)}
                  </span>
                  <span className="font-serif font-bold text-base text-[#2D5A43]">
                    = {formatMoney(formComputedSales)}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#2D5A43] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Sale Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesTable;
