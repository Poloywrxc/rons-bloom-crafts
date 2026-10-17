'use client';

import React, { useState, useEffect } from 'react';
import { X, Boxes, Plus, Minus, AlertTriangle, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { InventoryItem } from '@/types/inventory';
import { Product } from '@/types/product';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItem: InventoryItem | null;
  product?: Product;
  onUpdateInventory: (updatedItem: InventoryItem) => void;
}

type StockActionType = 'stock_in' | 'stock_out' | 'details';

export function InventoryModal({
  isOpen,
  onClose,
  inventoryItem,
  product,
  onUpdateInventory
}: InventoryModalProps) {
  const [actionType, setActionType] = useState<StockActionType>('stock_in');
  const [amount, setAmount] = useState('5');
  const [reason, setReason] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');

  useEffect(() => {
    if (inventoryItem) {
      setReorderLevel(String(inventoryItem.reorderLevel));
      setAmount('5');
      setReason('');
      setActionType('stock_in');
    }
  }, [inventoryItem, isOpen]);

  // Handle ESC key and lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !inventoryItem) return null;

  const currentStock = inventoryItem.quantityInStock;
  const numAmount = parseInt(amount) || 0;

  const getSimulatedStock = () => {
    if (actionType === 'stock_in') return currentStock + numAmount;
    if (actionType === 'stock_out') return Math.max(0, currentStock - numAmount);
    return currentStock;
  };

  const simulatedStock = getSimulatedStock();
  const formatNow = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let newStock = inventoryItem.quantityInStock;
    let newStockIn = inventoryItem.stockIn;
    let newStockOut = inventoryItem.stockOut;

    if (actionType === 'stock_in') {
      newStock += numAmount;
      newStockIn += numAmount;
    } else if (actionType === 'stock_out') {
      const realDeduction = Math.min(newStock, numAmount);
      newStock = Math.max(0, newStock - realDeduction);
      newStockOut += realDeduction;
    }

    const updated: InventoryItem = {
      ...inventoryItem,
      quantityInStock: newStock,
      stockIn: newStockIn,
      stockOut: newStockOut,
      reorderLevel: parseInt(reorderLevel) || inventoryItem.reorderLevel,
      lastUpdated: formatNow()
    };

    onUpdateInventory(updated);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] shadow-2xl border border-stone-200/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-stone-100 px-5 sm:px-7 py-4 sm:py-5 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded-md">
                  {inventoryItem.id}
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {product?.name ? `${product.name} (${product.sku || (product.id.length > 8 ? product.id.slice(0, 8).toUpperCase() : product.id)})` : `Linked to ${inventoryItem.productId}`}
                </span>
              </div>
              <h3 className="font-serif font-bold text-stone-900 text-lg sm:text-xl mt-0.5 leading-tight">
                Manage Botanical Stock & Movement
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body & Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-4 text-xs overscroll-contain">
            {/* Product Snapshot Bar */}
            {product && (
              <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl flex items-center space-x-3">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-12 h-12 rounded-xl object-cover border border-stone-200 shadow-xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-stone-900 truncate">{product.name}</h4>
                    <span className="font-mono text-[10px] text-stone-500 font-semibold">{product.sku}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-stone-600 mt-1">
                    <span>Supplier: <strong className="text-stone-800">{product.supplier}</strong></span>
                    <span>Category: <strong className="text-stone-800">{product.category}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Type Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActionType('stock_in')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center space-x-1 transition cursor-pointer ${
                  actionType === 'stock_in'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Stock In</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('stock_out')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center space-x-1 transition cursor-pointer ${
                  actionType === 'stock_out'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Stock Out</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('details')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center space-x-1 transition cursor-pointer ${
                  actionType === 'details'
                    ? 'bg-[#2D5A43] text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Reorder Level</span>
              </button>
            </div>

            {actionType !== 'details' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 mb-1 font-semibold">
                    {actionType === 'stock_in' && 'Items Added to Inventory (Stock In)'}
                    {actionType === 'stock_out' && 'Items Removed (Stock Out / Dispatched)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 mb-1 font-semibold">Stock Quantity Preview</label>
                  <div className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between font-mono">
                    <span className="text-stone-500 font-medium">{currentStock} stems</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                    <span className={`font-bold text-base ${simulatedStock <= inventoryItem.reorderLevel ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {simulatedStock} stems
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 mb-1 font-semibold">Log Note / Movement Reference</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    actionType === 'stock_in'
                      ? 'e.g. Fresh farm shipment invoice #BF-9021'
                      : 'e.g. Dispatched for wedding centerpiece bundle'
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
                />
              </div>
            </>
          ) : (
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div>
                <label className="block text-stone-700 mb-1 font-semibold flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Reorder Level (Minimum stock before restocking)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-mono text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Triggers low stock alert badge when quantity falls at or below this value.
                </span>
              </div>
            </div>
          )}

          {/* Current Historical Summary */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-stone-50 border border-stone-200/80 rounded-2xl text-center">
            <div>
              <span className="text-[9px] uppercase font-mono text-stone-400 block">Stock In</span>
              <span className="font-mono font-bold text-stone-800 text-xs">+{inventoryItem.stockIn}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono text-stone-400 block">Stock Out</span>
              <span className="font-mono font-bold text-stone-800 text-xs">-{inventoryItem.stockOut}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono text-stone-400 block">Reorder Lvl</span>
              <span className="font-mono font-bold text-amber-700 text-xs">{inventoryItem.reorderLevel}</span>
            </div>
          </div>

            <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>Last Updated: {inventoryItem.lastUpdated}</span>
              </span>
            </div>
          </div>

          {/* Action Buttons Footer (Pinned at bottom) */}
          <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-t border-stone-100 bg-stone-50/95 backdrop-blur-xs flex items-center justify-between shrink-0 rounded-b-3xl">
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              * Live inventory sync enabled
            </span>
            <div className="flex items-center space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#2D5A43] hover:bg-emerald-800 text-white rounded-xl font-semibold shadow-md transition hover:scale-[1.01] flex items-center space-x-2 cursor-pointer text-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>Confirm Stock Movement</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InventoryModal;
