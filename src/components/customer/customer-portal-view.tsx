'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  RefreshCw,
  Heart,
  Trash2,
  User as UserIcon,
  Package,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Truck,
  X,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  ExternalLink,
  Database,
  Edit3,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { Product } from '@/types/product';
import { Order } from '@/types/order';
import { User } from '@/types/user';
import {
  updateCustomerProfile,
  cancelCustomerOrder,
  submitCustomerReview,
  createCustomerOrder
} from '@/actions/customer/action';
import { InventoryItem } from '@/types/inventory';
import { INITIAL_USER } from '@/lib/constants';
import { CartItem } from '@/hooks/use-cart';
import { CheckoutModal } from './checkout-modal';
import { OrderStatusCard } from './order-status';
import { ReviewForm } from './review-form';

export type CustomerUser = User;

interface CustomerPortalViewProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: CustomerUser | null;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  inventory?: InventoryItem[];
  setInventory?: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  wishlist: string[];
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
  cartSubtotal: number;
  onClearCart: () => void;
  notify: (msg: string) => void;
  onLogout?: () => void;
  onUpdateUser?: (updated: User) => Promise<{ success: boolean; error?: string } | void> | void;
  onCancelOrder?: (
    orderId: string,
    refundTotal?: number,
    refundDetails?: { refundMethod: 'GCash' | 'Maya' | string; refundNumber: string; notes?: string }
  ) => Promise<void> | void;
  onSubmitReview?: (review: { bouquet: string; rating: number; comment: string }) => Promise<void> | void;
  onRefreshOrders?: () => Promise<void> | void;
  isDbConnected?: boolean;
}

export function CustomerPortalView({
  activeTab,
  setActiveTab,
  currentUser,
  orders,
  setOrders,
  products,
  setProducts,
  inventory,
  setInventory,
  wishlist,
  onToggleWishlist,
  onAddToCart,
  cart,
  cartSubtotal,
  onClearCart,
  notify,
  onLogout,
  onUpdateUser,
  onCancelOrder,
  onSubmitReview,
  onRefreshOrders,
  isDbConnected = true
}: CustomerPortalViewProps) {
  const user = currentUser || INITIAL_USER;
  const wishlistedProducts = products.filter(p => wishlist.includes(p.id));

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone);
  const [editAddress, setEditAddress] = useState(user.address);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setEditName(user.name);
    setEditPhone(user.phone);
    setEditAddress(user.address);
  }, [user.name, user.phone, user.address]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      notify('Please enter your full name');
      return;
    }
    setIsSavingProfile(true);
    try {
      if (user.id) {
        const res = await updateCustomerProfile({
          id: user.id,
          name: editName.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim()
        });

        if (res.success && res.user) {
          if (onUpdateUser) {
            await onUpdateUser(res.user);
          }
          notify('Profile updated and saved to database! 🌸');
          setIsEditingProfile(false);
          return;
        } else if (res.error) {
          notify(`Database note: ${res.error}`);
        }
      }

      // Offline / fallback state update
      const updatedUser: User = {
        ...user,
        name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim()
      };
      if (onUpdateUser) {
        await onUpdateUser(updatedUser);
      }
      notify('Profile updated successfully! 🏡');
      setIsEditingProfile(false);
    } catch (err: any) {
      notify(err?.message || 'Error updating profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // User-scoped orders (or all if simulated single-user)
  const userOrders = orders.filter(
    o =>
      !user.email ||
      o.email?.toLowerCase() === user.email.toLowerCase() ||
      o.customer?.toLowerCase().includes(user.name?.toLowerCase().split(' ')[0] || '')
  );
  const displayOrders = userOrders.length > 0 ? userOrders : orders;

  const activeOrders = displayOrders.filter(
    o => !o.status.toLowerCase().includes('deliver') && !o.status.toLowerCase().includes('cancel')
  );
  const completedOrders = displayOrders.filter(
    o => o.status.toLowerCase().includes('deliver') || o.status.toLowerCase().includes('complete')
  );
  const cancelledOrders = displayOrders.filter(
    o => o.status.toLowerCase().includes('cancel')
  );

  // Popup Modal State for Account, Orders, Wishlist, Completed, Cancelled
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Sync if activeTab is changed from outside (e.g., from Navbar Wishlist or Account)
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (
      activeTab &&
      activeTab !== prevTabRef.current &&
      ['account', 'orders', 'wishlist', 'completed', 'cancelled', 'reviews'].includes(activeTab)
    ) {
      setActiveModal(activeTab);
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  // Lock background scroll when modal is open and handle Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };

    if (activeModal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeModal]);

  // State for Customer Order Cancellation & Refund Modal
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [custRefundWallet, setCustRefundWallet] = useState<'GCash' | 'Maya'>('GCash');
  const [custRefundNumber, setCustRefundNumber] = useState<string>('');
  const [custRefundError, setCustRefundError] = useState<string | null>(null);

  const handleCancelOrder = (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder) {
      setCancellingOrder(targetOrder);
      setCustRefundWallet('GCash');
      const phoneMatch = targetOrder.recipient?.match(/(09\d{9}|\+?639\d{9}|\d{11})/);
      setCustRefundNumber(user.phone || (phoneMatch ? phoneMatch[1] : ''));
      setCustRefundError(null);
    }
  };

  const handleConfirmCustomerCancel = async () => {
    if (!cancellingOrder) return;
    const cleanNumber = custRefundNumber.trim();
    if (!cleanNumber) {
      setCustRefundError('Please enter your GCash or Maya mobile number for refund processing.');
      return;
    }
    const orderId = cancellingOrder.id;
    const refundTotal = cancellingOrder.total;
    const refundDetails = {
      refundMethod: custRefundWallet,
      refundNumber: cleanNumber,
      notes: `Customer cancellation requested. Full money refund to ${custRefundWallet} (${cleanNumber})`
    };

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Cancelled',
              paymentStatus: `Refund Pending ($${refundTotal.toFixed(2)})`,
              refundMethod: custRefundWallet,
              refundNumber: cleanNumber
            }
          : o
      )
    );

    try {
      if (onCancelOrder) {
        await onCancelOrder(orderId, refundTotal, refundDetails);
      } else {
        await cancelCustomerOrder(orderId, refundTotal, refundDetails);
      }
      notify(`Order ${orderId} cancelled. Refund of $${refundTotal.toFixed(2)} scheduled to your ${custRefundWallet}.`);
    } catch {
      notify(`Order ${orderId} has been cancelled.`);
    }

    setCancellingOrder(null);
  };

  const handleReorder = (order: Order) => {
    let count = 0;
    order.items.forEach(item => {
      const matched = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
      if (matched) {
        for (let i = 0; i < item.qty; i++) {
          onAddToCart(matched);
        }
        count += item.qty;
      }
    });

    if (count > 0) {
      notify(`Added ${count} items from ${order.id} to your basket! 🌸`);
      setActiveModal(null);
      setActiveTab('checkout');
    } else {
      notify(`Stems from ${order.id} re-added to your cart.`);
    }
  };

  const handleRateOrder = (order: Order) => {
    setActiveModal('reviews');
    setActiveTab('reviews');
    notify(`Ready to leave a floral review for ${order.id}! ⭐`);
  };

  const handleOrderPlaced = async (orderData: {
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    deliveryDate: string;
    cardMessage: string;
    paymentMethod: string;
    uploadedReceipt: string | null;
  }) => {
    if (cart.length === 0) {
      notify('Your basket is empty!');
      return;
    }

    const subtotal = (orderData as any).subtotal ?? cartSubtotal;
    const deliveryFee = (orderData as any).deliveryFee ?? (orderData.shippingAddress.includes('Pickup') ? 0 : 50.0);
    const total = (orderData as any).total ?? (subtotal + deliveryFee);

    // Save order directly to Supabase database (dynamically reduces product stock & logs movement)
    const res = await createCustomerOrder({
      userId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      recipientName: orderData.recipientName,
      recipientPhone: orderData.recipientPhone || user.phone || 'N/A',
      shippingAddress: orderData.shippingAddress,
      deliveryDate: orderData.deliveryDate,
      cardMessage: orderData.cardMessage,
      paymentMethod: orderData.paymentMethod,
      paymentProof: orderData.uploadedReceipt || undefined,
      subtotal,
      deliveryFee,
      total,
      items: cart.map((c) => ({
        productId: c.id,
        name: c.name,
        qty: c.quantity,
        price: c.price
      }))
    });

    const newOrderId = res.success && res.order ? res.order.id : `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    if (res.success && res.order) {
      setOrders([res.order, ...orders]);
    } else {
      const fallbackOrder: Order = {
        id: newOrderId,
        date: new Date().toISOString().split('T')[0],
        customer: user.name,
        email: user.email,
        items: cart.map(c => ({ name: c.name, qty: c.quantity, price: c.price })),
        total,
        deliveryFee,
        status: 'Order Received',
        paymentStatus:
          orderData.paymentMethod === 'Cash on Delivery'
            ? 'Pending COD'
            : `Pending Verification (${orderData.paymentMethod})`,
        paymentProof: orderData.uploadedReceipt || 'receipt_simulated.png',
        deliveryDate: orderData.deliveryDate,
        recipient: `${orderData.recipientName} - ${orderData.shippingAddress}`,
        cardMessage: orderData.cardMessage
      };
      setOrders([fallbackOrder, ...orders]);
    }

    if (onRefreshOrders) {
      try {
        await onRefreshOrders();
      } catch {}
    }

    // Synchronize product stock and inventory movement in local UI state
    if (setProducts) {
      setProducts((prev) =>
        prev.map((prod) => {
          const itemInCart = cart.find((c) => c.name.toLowerCase() === prod.name.toLowerCase() || c.id === prod.id);
          if (itemInCart) {
            return {
              ...prod,
              stock: Math.max(0, (prod.stock ?? 10) - itemInCart.quantity)
            };
          }
          return prod;
        })
      );
    }

    if (setInventory) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

      setInventory((prev) =>
        prev.map((inv) => {
          const matchingProduct = products.find((p) => p.id === inv.productId);
          const itemInCart = matchingProduct
            ? cart.find((c) => c.name.toLowerCase() === matchingProduct.name.toLowerCase() || c.id === matchingProduct.id)
            : undefined;

          if (itemInCart) {
            const deduct = Math.min(inv.quantityInStock, itemInCart.quantity);
            return {
              ...inv,
              quantityInStock: Math.max(0, inv.quantityInStock - deduct),
              stockOut: inv.stockOut + deduct,
              lastUpdated: timeStr
            };
          }
          return inv;
        })
      );
    }

    onClearCart();
    setActiveTab('orders');
    setActiveModal('orders');
    notify(`Order ${newOrderId} placed successfully! 🌸`);
    return newOrderId;
  };

  // 5 Main Navigation Cards requested: Account, Orders, Wishlist, Completed, Cancelled
  const navCards = [
    {
      id: 'account',
      title: 'Account',
      subtitle: 'Profile & Address',
      badge: 'Profile',
      icon: UserIcon,
      iconBg: 'bg-stone-100 text-stone-700',
      activeRing: 'ring-stone-400'
    },
    {
      id: 'orders',
      title: 'Orders',
      subtitle: 'Floral Journey',
      badge: `${activeOrders.length} Active`,
      icon: Package,
      iconBg: 'bg-amber-100 text-amber-800',
      activeRing: 'ring-amber-400'
    },
    {
      id: 'wishlist',
      title: 'Wishlist',
      subtitle: 'Saved Stems',
      badge: `${wishlist.length} Items`,
      icon: Heart,
      iconBg: 'bg-rose-100 text-rose-700',
      activeRing: 'ring-rose-400'
    },
    {
      id: 'completed',
      title: 'Completed',
      subtitle: 'Delivered Stems',
      badge: `${completedOrders.length} Delivered`,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 text-[#2D5A43]',
      activeRing: 'ring-emerald-400'
    },
    {
      id: 'cancelled',
      title: 'Cancelled',
      subtitle: 'Refunded Orders',
      badge: `${cancelledOrders.length} Cancelled`,
      icon: XCircle,
      iconBg: 'bg-stone-100 text-rose-600',
      activeRing: 'ring-rose-400'
    }
  ];

  const currentModalCard = navCards.find(c => c.id === activeModal);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Customer Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-[#2D5A43] font-serif font-bold text-xl shrink-0 shadow-xs">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900">{user.name}</h2>
            <p className="text-xs text-stone-500 mt-0.5">{user.email} • {user.address}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-emerald-50 text-emerald-800 text-xs px-3.5 py-1.5 rounded-full font-medium border border-emerald-200/80 shadow-2xs flex items-center space-x-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Database: Live Supabase</span>
          </span>
          <span className="bg-emerald-100 text-[#2D5A43] text-xs px-3.5 py-1.5 rounded-full font-medium border border-emerald-200/60 shadow-2xs flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2D5A43] inline-block animate-pulse" />
            <span>Verified Florist Patron</span>
          </span>
        </div>
      </div>

      {/* 5 Primary Navigation Cards: 
          - On mobile: ONLY ICON and ALL 5 CARDS FIT IN 1 ROW (grid-cols-5)
          - On desktop: Full cards with icon, badge, title, subtitle */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3.5 lg:gap-4 mb-8">
        {navCards.map((card) => {
          const isActive = activeTab === card.id || activeModal === card.id;
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              id={`nav-card-${card.id}`}
              onClick={() => {
                setActiveTab(card.id);
                setActiveModal(card.id);
              }}
              title={card.title}
              aria-label={card.title}
              className={`group relative rounded-2xl sm:rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between items-center sm:items-stretch ${
                isActive
                  ? 'bg-[#2D5A43] text-white border-[#2D5A43] shadow-md shadow-emerald-950/15 ring-2 ring-[#2D5A43]/20 sm:-translate-y-1'
                  : 'bg-white text-stone-800 border-stone-200/90 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5'
              } p-2 sm:p-5`}
            >
              {/* Card Top: Mobile is centered icon only; Desktop is icon + badge */}
              <div className="flex items-center justify-center sm:justify-between w-full sm:mb-3">
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-inner'
                      : card.iconBg
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span
                  className={`hidden sm:inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200/70'
                  }`}
                >
                  {card.badge}
                </span>
              </div>

              {/* Title & Subtitle: HIDDEN ON MOBILE (Mobile is only icon) */}
              <div className="hidden sm:block text-left">
                <h3 className={`font-serif font-bold text-base sm:text-lg leading-tight ${isActive ? 'text-white' : 'text-stone-900'}`}>
                  {card.title}
                </h3>
                <p className={`text-xs mt-1 truncate ${isActive ? 'text-emerald-100/90' : 'text-stone-500'}`}>
                  {card.subtitle}
                </p>
              </div>

              {/* Active Tab Footer: Desktop only */}
              {isActive && (
                <div className="hidden sm:flex mt-3 pt-2 border-t border-white/20 items-center justify-between text-[11px] font-medium text-emerald-100">
                  <span>Open Modal</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-ping" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* DASHBOARD OVERVIEW (Background View when no modal is active) */}
      <div className="space-y-6">

        {/* Highlight Section: Recent Order / Floral Journey Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs md:col-span-2 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  Active Floral Delivery Tracker
                </h3>
                <p className="text-xs text-stone-500">
                  Tap any card above to open full modal management
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders');
                  setActiveModal('orders');
                }}
                className="text-xs font-bold text-[#2D5A43] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>Open Orders Modal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Truck className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="font-serif font-bold text-stone-800 text-sm">No Active Deliveries Right Now</p>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  All your previous bouquets have been lovingly delivered!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.slice(0, 2).map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => {
                      setActiveTab('orders');
                      setActiveModal('orders');
                    }}
                    className="p-4 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200 transition cursor-pointer space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-[#2D5A43]">{ord.id}</span>
                      <span className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full text-[11px]">
                        {ord.status}
                      </span>
                    </div>
                    <div className="text-xs text-stone-600 flex justify-between items-center">
                      <span>Recipient: <strong className="text-stone-800">{ord.recipient}</strong></span>
                      <span className="font-bold text-[#2D5A43]">${ord.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Patron VIP Perks & Details */}
          <div className="bg-[#2D5A43] text-white p-6 rounded-3xl shadow-sm space-y-4 flex flex-col justify-center">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h4 className="font-serif font-bold text-lg text-white">Patron Privileges</h4>
              </div>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                Enjoy bespoke florist consultations, priority weekend stem sourcing, and complimentary bloom food sachets with every delivery.
              </p>
              <div className="pt-2 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>100% Fresh Stem Quality Guarantee</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-100">
                  <Truck className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Express Hand-Delivery in Manila & Metro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL FOR: Account, Orders, Wishlist, Completed, Cancelled, and Reviews */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-modal-title"
        >
          <div
            className="bg-[#FAF7F2] sm:bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 bg-white border-b border-stone-200 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    currentModalCard?.iconBg || 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {currentModalCard ? (
                    <currentModalCard.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h2 id="customer-modal-title" className="font-serif font-bold text-base sm:text-xl text-stone-900 truncate">
                      {currentModalCard?.title || (activeModal === 'reviews' ? 'Review Bouquet' : 'Customer View')}
                    </h2>
                    {currentModalCard && (
                      <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 shrink-0">
                        {currentModalCard.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-stone-500 truncate">
                    {currentModalCard?.subtitle || 'Floral crafts customer detail view'}
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                {activeModal === 'orders' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (onRefreshOrders) {
                        await onRefreshOrders();
                        notify('Orders refreshed from Supabase database! 🔄');
                      } else {
                        notify('Orders refreshed with live status!');
                      }
                    }}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center transition cursor-pointer shrink-0"
                    title="Refresh Orders from Database"
                  >
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center transition cursor-pointer shrink-0"
                  title="Close modal (Esc)"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1">
              {/* MODAL VIEW 1: ACCOUNT */}
              {activeModal === 'account' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900">
                        Customer Profile
                      </h3>
                      <span className="flex items-center space-x-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Database className="w-3 h-3 text-emerald-600" />
                        <span>Supabase DB</span>
                      </span>
                    </div>

                    {!isEditingProfile ? (
                      <>
                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="text-stone-500 block">Full Name</span>
                            <span className="font-semibold text-stone-800 text-sm">{user.name}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block">Email Address (Auth Identity)</span>
                            <span className="font-semibold text-stone-800 break-all">{user.email}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block">Primary Contact Number</span>
                            <span className="font-semibold text-stone-800">{user.phone || 'Not specified'}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block">Saved Delivery Address</span>
                            <span className="font-semibold text-stone-800 break-words">{user.address || 'Not specified'}</span>
                          </div>
                          {user.id && (
                            <div className="pt-1">
                              <span className="text-[10px] font-mono text-stone-400 block">Supabase User UUID</span>
                              <span className="font-mono text-[10px] text-stone-600 break-all bg-stone-50 px-2 py-1 rounded block border border-stone-100 select-all">
                                {user.id}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingProfile(true)}
                            className="w-full py-2.5 bg-[#2D5A43] hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Profile & Address</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                        <div>
                          <label className="block text-stone-600 mb-1 font-medium">Full Name</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#2D5A43] focus:bg-white text-stone-900"
                            placeholder="e.g. Sophia Vance"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-500 mb-1 font-medium">Email (Fixed Auth ID)</label>
                          <input
                            type="email"
                            disabled
                            value={user.email}
                            className="w-full p-2.5 bg-stone-100 border border-stone-200 rounded-xl text-stone-500 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-600 mb-1 font-medium">Primary Contact Number</label>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#2D5A43] focus:bg-white text-stone-900"
                            placeholder="e.g. +1 (555) 234-5678"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-600 mb-1 font-medium">Delivery Address</label>
                          <textarea
                            rows={3}
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#2D5A43] focus:bg-white text-stone-900"
                            placeholder="Street, City, Postal Code"
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                          <button
                            type="submit"
                            disabled={isSavingProfile}
                            className="flex-1 py-2.5 bg-[#2D5A43] hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
                          >
                            {isSavingProfile ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving to DB...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Changes</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={isSavingProfile}
                            onClick={() => {
                              setIsEditingProfile(false);
                              setEditName(user.name);
                              setEditPhone(user.phone);
                              setEditAddress(user.address);
                            }}
                            className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium rounded-xl transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                      <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900">
                        Recent Floral Deliveries Tracker
                      </h3>
                      <span className="text-xs text-stone-500 font-medium">
                        {displayOrders.length} Recorded
                      </span>
                    </div>

                    <div className="space-y-2.5 sm:space-y-3">
                      {displayOrders.slice(0, 3).map((ord) => (
                        <div key={ord.id} className="p-3.5 sm:p-4 bg-stone-50 rounded-xl sm:rounded-2xl border border-stone-200 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono font-bold text-[#2D5A43]">{ord.id}</span>
                            <span
                              className={`font-semibold px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] ${
                                ord.status.toLowerCase().includes('cancel')
                                  ? 'bg-rose-100 text-rose-700'
                                  : ord.status.toLowerCase().includes('deliver')
                                  ? 'bg-emerald-100 text-[#2D5A43]'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>
                          <div className="text-xs text-stone-600 space-y-0.5 sm:space-y-1">
                            <p className="break-words">Recipient: <strong className="text-stone-800">{ord.recipient}</strong></p>
                            <p>Scheduled Date: <strong>{ord.deliveryDate}</strong></p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('orders');
                          setActiveModal('orders');
                        }}
                        className="text-xs text-[#2D5A43] font-bold hover:underline flex items-center space-x-1 cursor-pointer py-1"
                      >
                        <span>Track active deliveries ({activeOrders.length})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('completed');
                          setActiveModal('completed');
                        }}
                        className="text-xs text-stone-600 font-semibold hover:text-stone-900 hover:underline flex items-center space-x-1 cursor-pointer py-1"
                      >
                        <span>View delivered orders ({completedOrders.length})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL VIEW 2: ORDERS */}
              {activeModal === 'orders' && (
                <div className="space-y-3 sm:space-y-4">
                  {activeOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center border border-stone-200 space-y-3">
                      <Truck className="w-10 h-10 sm:w-12 sm:h-12 text-stone-300 mx-auto" />
                      <h4 className="font-serif font-bold text-stone-800 text-base sm:text-lg">No Active Deliveries In Transit</h4>
                      <p className="text-xs text-stone-500 max-w-md mx-auto">
                        All your previous botanical orders have been completed or you haven't placed an active order yet today.
                      </p>
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('completed');
                            setActiveModal('completed');
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-full cursor-pointer transition"
                        >
                          View Completed Orders ({completedOrders.length})
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {activeOrders.map((order) => (
                        <OrderStatusCard
                          key={order.id}
                          order={order}
                          onCancel={handleCancelOrder}
                          onReorder={handleReorder}
                          onRate={handleRateOrder}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MODAL VIEW 3: WISHLIST */}
              {activeModal === 'wishlist' && (
                <div className="space-y-4">
                  {wishlistedProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center border border-stone-200">
                      <Heart className="w-10 h-10 text-rose-300 mx-auto mb-2" />
                      <p className="text-stone-700 font-serif font-bold text-base sm:text-lg">Your wishlist is currently bare.</p>
                      <p className="text-xs text-stone-500 mt-1">
                        Tap the heart on any product card in the store to save it here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {wishlistedProducts.map((p) => (
                        <div
                          key={p.id}
                          className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200 shadow-xs flex flex-row sm:flex-col justify-between"
                        >
                          <img src={p.image} alt={p.name} className="w-24 sm:w-full h-24 sm:h-40 object-cover shrink-0" />
                          <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <h4 className="font-serif font-bold text-stone-900 text-xs sm:text-base truncate">{p.name}</h4>
                              <span className="text-xs sm:text-sm font-bold text-[#2D5A43]">${p.price.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 sm:space-x-2 mt-2 sm:mt-4">
                              <button
                                type="button"
                                onClick={() => {
                                  onAddToCart(p);
                                  onToggleWishlist(p.id);
                                }}
                                className="flex-1 py-1.5 sm:py-2 bg-[#2D5A43] text-white text-[11px] sm:text-xs font-semibold rounded-full hover:bg-emerald-800 transition cursor-pointer truncate"
                              >
                                Move to Bag
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleWishlist(p.id)}
                                className="p-1.5 sm:p-2 text-rose-600 hover:bg-rose-50 rounded-full transition cursor-pointer shrink-0"
                                title="Remove from wishlist"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MODAL VIEW 4: COMPLETED */}
              {activeModal === 'completed' && (
                <div className="space-y-4">
                  {completedOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center border border-stone-200 space-y-3">
                      <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-stone-300 mx-auto" />
                      <h4 className="font-serif font-bold text-stone-800 text-base sm:text-lg">No Completed Deliveries Yet</h4>
                      <p className="text-xs text-stone-500 max-w-md mx-auto">
                        Once our courier completes handover of your floral arrangement, it will appear here with review options.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {completedOrders.map((order) => (
                        <OrderStatusCard
                          key={order.id}
                          order={order}
                          onReorder={handleReorder}
                          onRate={handleRateOrder}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MODAL VIEW 5: CANCELLED */}
              {activeModal === 'cancelled' && (
                <div className="space-y-4">
                  {cancelledOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center border border-stone-200 space-y-3">
                      <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 mx-auto" />
                      <h4 className="font-serif font-bold text-stone-800 text-base sm:text-lg">No Cancelled Orders</h4>
                      <p className="text-xs text-stone-500 max-w-md mx-auto">
                        Every bouquet you've arranged has bloomed smoothly without cancellation!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {cancelledOrders.map((order) => (
                        <OrderStatusCard
                          key={order.id}
                          order={order}
                          onReorder={handleReorder}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MODAL VIEW 6: REVIEWS */}
              {activeModal === 'reviews' && (
                <ReviewForm
                  products={products}
                  onSubmitReview={async (rev) => {
                    try {
                      if (onSubmitReview) {
                        await onSubmitReview(rev);
                      } else {
                        const matchedProduct = products.find(
                          (p) => p.name.toLowerCase() === rev.bouquet.toLowerCase()
                        );
                        await submitCustomerReview({
                          userId: user.id,
                          userName: user.name,
                          productId: matchedProduct?.id || 'a0000001-0000-0000-0000-000000000001',
                          rating: rev.rating,
                          comment: rev.comment
                        });
                      }
                      notify('Thank you for rating Ron’s Bloom Crafts! Review saved to database 💐');
                    } catch {
                      notify('Thank you for rating Ron’s Bloom Crafts! 💐');
                    }
                    setActiveModal('completed');
                    setActiveTab('completed');
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT POPUP MODAL */}
      <CheckoutModal
        isOpen={activeTab === 'checkout'}
        onClose={() => setActiveTab('account')}
        cart={cart}
        cartSubtotal={cartSubtotal}
        currentUser={user}
        userDefaultName={user.name}
        userDefaultPhone={user.phone}
        userDefaultAddress={user.address}
        onUpdateUser={onUpdateUser}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* CUSTOMER ORDER CANCELLATION & MONEY REFUND MODAL */}
      {cancellingOrder && (
        <div
          onClick={() => setCancellingOrder(null)}
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-50 to-amber-50/50 border-b border-rose-100 p-5 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    Cancel Order &amp; Money Refund
                  </h3>
                  <p className="text-xs text-rose-700 font-medium">
                    Order Ref: <strong className="font-mono">{cancellingOrder.id}</strong> &bull; Full Refund: <strong className="font-serif">${cancellingOrder.total.toFixed(2)}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200/80 text-xs text-rose-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-800">
                  <DollarSign className="w-4 h-4 text-rose-600" />
                  100% Money-Back Guarantee
                </p>
                <p className="leading-relaxed text-[11px] text-stone-700">
                  We are sorry you need to cancel your order. Ron&apos;s Bloom Crafts will promptly refund the full sum of <strong className="text-rose-700 font-bold">${cancellingOrder.total.toFixed(2)}</strong> to your chosen e-wallet.
                </p>
              </div>

              {/* Selection for Transition of Refund: GCash or Maya */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Select Refund Channel:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCustRefundWallet('GCash')}
                    className={`p-3 rounded-2xl border-2 flex items-center space-x-3 text-left transition cursor-pointer ${
                      custRefundWallet === 'GCash'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      G
                    </div>
                    <div>
                      <span className="block font-bold text-xs">GCash</span>
                      <span className="block text-[10px] text-stone-500">e-Wallet</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustRefundWallet('Maya')}
                    className={`p-3 rounded-2xl border-2 flex items-center space-x-3 text-left transition cursor-pointer ${
                      custRefundWallet === 'Maya'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      M
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Maya</span>
                      <span className="block text-[10px] text-stone-500">e-Wallet</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Mobile Number Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Your {custRefundWallet} Mobile Number:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={custRefundNumber}
                    onChange={(e) => {
                      setCustRefundNumber(e.target.value);
                      if (custRefundError) setCustRefundError(null);
                    }}
                    placeholder={`e.g. 09171234567 (${custRefundWallet})`}
                    className="w-full pl-9 pr-4 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                  />
                </div>
                {custRefundError && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {custRefundError}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-200/70 transition cursor-pointer"
              >
                Keep Order Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomerCancel}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                <span>Confirm &amp; Request Refund</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerPortalView;
