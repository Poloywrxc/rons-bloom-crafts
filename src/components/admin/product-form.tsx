'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Image as ImageIcon, DollarSign, Building2, Tag, CheckCircle2, AlertCircle, Upload, Check, Boxes } from 'lucide-react';
import { Product, ProductStatus } from '@/types/product';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onCreateProduct: (product: Product, initialStock?: number, reorderLevel?: number) => void;
  onUpdateProduct?: (product: Product) => void;
  initialProduct?: Product | null;
  existingCount?: number;
}

const DEFAULT_FLORAL_IMAGE = 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=700&q=80';

export function ProductFormModal({
  isOpen,
  onClose,
  categories,
  onCreateProduct,
  onUpdateProduct,
  initialProduct,
  existingCount = 6
}: ProductFormModalProps) {
  const isEditing = Boolean(initialProduct);

  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mixed flowers');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('30.00');
  const [sellingPrice, setSellingPrice] = useState('65.00');
  const [supplier, setSupplier] = useState('Benguet Highland Bloomery');
  const [status, setStatus] = useState<ProductStatus>('active');
  const [image, setImage] = useState(DEFAULT_FLORAL_IMAGE);
  const [initialStock, setInitialStock] = useState('10');
  const [reorderLevel, setReorderLevel] = useState('5');

  // JPG / PNG file import state
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (initialProduct) {
      setProductId(initialProduct.sku || (initialProduct.id.length > 8 ? `PRD-${initialProduct.id.slice(0, 4).toUpperCase()}` : initialProduct.id));
      setName(initialProduct.name);
      setCategory(initialProduct.category);
      setDescription(initialProduct.description || '');
      setCostPrice(String(initialProduct.costPrice || 25.00));
      setSellingPrice(String(initialProduct.sellingPrice || initialProduct.price || 55.00));
      setSupplier(initialProduct.supplier || 'Benguet Highland Bloomery');
      setStatus(initialProduct.status || 'active');
      setImage(initialProduct.image);
      setInitialStock(String(initialProduct.stock ?? 10));
      setReorderLevel('5');
      setImportedFileName(null);
      setImageError(null);
    } else {
      const nextNum = existingCount + 1001;
      const nextId = `PRD-${nextNum}`;
      setProductId(nextId);
      setName('');
      setCategory(categories.find(c => c !== 'All Blooms') || 'Mixed flowers');
      setDescription('');
      setCostPrice('30.00');
      setSellingPrice('65.00');
      setSupplier('Benguet Highland Bloomery');
      setStatus('active');
      setImage(DEFAULT_FLORAL_IMAGE);
      setInitialStock('10');
      setReorderLevel('5');
      setImportedFileName(null);
      setImageError(null);
    }
  }, [initialProduct, existingCount, categories, isOpen]);

  // Handle ESC key and prevent body scroll when modal is open
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

  if (!isOpen) return null;

  const cost = parseFloat(costPrice) || 0;
  const selling = parseFloat(sellingPrice) || 0;

  const processImageFile = (file: File) => {
    const validExtensions = /\.(jpe?g|png)$/i;
    const validMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    const isValid = validMimes.includes(file.type) || validExtensions.test(file.name);

    if (!isValid) {
      setImageError('Please choose a valid JPG or PNG image file (.jpg, .png).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image file is too large. Please select a file under 10MB.');
      return;
    }

    setImageError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImage(event.target.result);
        setImportedFileName(file.name);
      }
    };
    reader.onerror = () => {
      setImageError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedStock = parseInt(initialStock) || 10;
    const parsedReorder = parseInt(reorderLevel) || 5;

    const productPayload: Product = {
      id: initialProduct?.id || (productId.trim() ? productId.trim() : `PRD-${Date.now().toString().slice(-4)}`),
      name: name.trim(),
      sku: productId.trim() || initialProduct?.sku || (productId.trim() ? `RBC-${productId.trim()}` : `RBC-${Date.now().toString().slice(-4)}`),
      category,
      description: description.trim() || 'Artisanal handcrafted floral arrangement.',
      costPrice: cost,
      price: selling,
      sellingPrice: selling,
      supplier: supplier.trim() || 'Local Artisan Nursery',
      status,
      image: image.trim() || DEFAULT_FLORAL_IMAGE,
      rating: initialProduct?.rating ?? 5.0,
      reviewsCount: initialProduct?.reviewsCount ?? 0,
      stock: isEditing ? (initialProduct?.stock ?? parsedStock) : parsedStock,
      freshness: initialProduct?.freshness ?? 'Studio Fresh Blooms',
      tags: initialProduct?.tags ?? ['Artisanal', 'Fresh Cut']
    };

    if (isEditing && onUpdateProduct) {
      onUpdateProduct(productPayload);
    } else {
      onCreateProduct(productPayload, parsedStock, parsedReorder);
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] shadow-2xl border border-stone-200/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-stone-100 px-5 sm:px-7 py-4 sm:py-5 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D5A43]/10 border border-[#2D5A43]/20 flex items-center justify-center text-[#2D5A43] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-900 text-lg sm:text-xl leading-tight">
                {isEditing ? 'Revise Botanical Product' : 'Add New Floral Product'}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Configure complete product catalog specifications & pricing tiers.
              </p>
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

        {/* Form with scrollable body and pinned footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-4 text-xs overscroll-contain">
          {/* Section 1: Identification & Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 mb-1 font-semibold flex items-center">
                <Tag className="w-3.5 h-3.5 mr-1 text-[#2D5A43]" />
                Product ID *
              </label>
              <input
                type="text"
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="e.g. PRD-1007"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Unique product identifier</span>
            </div>

            <div>
              <label className="block text-stone-700 mb-1 font-semibold">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43] cursor-pointer"
              >
                {categories
                  .filter((c) => c !== 'All Blooms')
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Product classification</span>
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-stone-700 mb-1 font-semibold">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Velvet Crimson Peony Symphony"
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-stone-700 mb-1 font-semibold">Description (Product details) *</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Stem varieties, floral arrangement nuances, wrapping ribbons, freshness guarantee notes..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
            />
          </div>

          {/* Section 2: Financials & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 mb-1 font-semibold flex items-center">
                <DollarSign className="w-3.5 h-3.5 mr-0.5 text-stone-500" />
                Cost Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Purchase or production cost</span>
            </div>

            <div>
              <label className="block text-stone-700 mb-1 font-semibold flex items-center">
                <DollarSign className="w-3.5 h-3.5 mr-0.5 text-[#2D5A43]" />
                Selling Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-[#2D5A43] font-bold focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Price offered to customers</span>
            </div>

            <div>
              <label className="block text-stone-700 mb-1 font-semibold flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1 text-[#2D5A43]" />
                Supplier *
              </label>
              <input
                type="text"
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Benguet Highland Bloomery"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Source of the product</span>
            </div>
          </div>

          {/* Section 3: Status */}
          <div className="pt-1">
            <label className="block text-stone-700 mb-1.5 font-semibold">Status (Active or Inactive) *</label>
            <div className="grid grid-cols-2 sm:max-w-xs gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 font-semibold cursor-pointer transition ${
                  status === 'active'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Active</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 font-semibold cursor-pointer transition ${
                  status === 'inactive'
                    ? 'bg-stone-200 border-stone-400 text-stone-900 ring-2 ring-stone-400/20'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-stone-400" />
                <span>Inactive</span>
              </button>
            </div>
          </div>

          {/* Section 4: Inventory Configuration */}
          {!isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-stone-700 mb-1 font-semibold flex items-center">
                  <Boxes className="w-3.5 h-3.5 mr-1 text-[#2D5A43]" />
                  Initial Quantity in Stock (Stems)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  placeholder="10"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">Recorded into botanical inventory</span>
              </div>

              <div>
                <label className="block text-stone-700 mb-1 font-semibold flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Reorder Level (Restock Threshold)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  placeholder="5"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">Minimum stock before restocking alert</span>
              </div>
            </div>
          )}

          {/* Product Image Import */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-stone-700 font-semibold flex items-center text-xs">
              <ImageIcon className="w-3.5 h-3.5 mr-1 text-[#2D5A43]" />
              Product Image (JPG or PNG)
            </label>

            {/* Custom styled file input bar */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processImageFile(file);
              }}
              className={`p-2 sm:p-2.5 bg-stone-50 border rounded-xl transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 ${
                isDragging
                  ? 'border-[#2D5A43] bg-emerald-50/60 ring-2 ring-[#2D5A43]/20'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                <label className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#2D5A43] hover:bg-[#234735] text-white rounded-lg font-medium text-xs cursor-pointer shadow-xs transition hover:scale-[1.01] shrink-0">
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>Import JPG or PNG</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, .png, .jpg, .jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    className="hidden"
                  />
                </label>

                {importedFileName ? (
                  <div className="inline-flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg min-w-0">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-[#2D5A43] truncate max-w-[200px] sm:max-w-[260px]">
                      {importedFileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setImage(DEFAULT_FLORAL_IMAGE);
                        setImportedFileName(null);
                        setImageError(null);
                      }}
                      className="text-stone-400 hover:text-stone-600 p-0.5 rounded transition cursor-pointer"
                      title="Remove selected file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-stone-400 font-medium">
                    No file chosen
                  </span>
                )}
              </div>

              <span className="text-[11px] text-stone-400 font-medium shrink-0 self-center sm:self-auto">
                JPG, PNG up to 10MB
              </span>
            </div>

            {/* Error message */}
            {imageError && (
              <div className="mt-2 flex items-center space-x-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{imageError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer (Pinned at bottom) */}
        <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-t border-stone-100 bg-stone-50/95 backdrop-blur-xs flex items-center justify-between shrink-0 rounded-b-3xl">
          <span className="text-[11px] text-stone-400 hidden sm:inline">
            * All fields required for botanical registry
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
              <span>{isEditing ? 'Save Product Changes' : 'Catalog New Product'}</span>
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}

export default ProductFormModal;
