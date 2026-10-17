'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  Search,
  RefreshCw,
  Database,
  Filter,
  ShoppingBag,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Trash2,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  X,
  ArrowRight,
  Phone,
  Wallet,
  Mail
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/order';
import { PaymentModal } from './payment-modal';
import { EmailPreviewModal } from './email-preview-modal';
import { OrderEmailType } from '@/lib/email/types';

interface OrderTableProps {
  orders: Order[];
  onUpdateStatus: (
    orderId: string,
    newStatus: string,
    refundDetails?: { refundMethod: 'GCash' | 'Maya' | string; refundNumber: string; notes?: string }
  ) => void;
  onUpdatePaymentStatus?: (orderId: string, newPaymentStatus: string) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  onDeleteOrder?: (orderId: string) => void;
}

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'Order Received',
  'Floral Artistry in Progress',
  'Out for Delivery',
  'Delivered',
  'Cancelled'
];

export function OrderTable({
  orders,
  onUpdateStatus,
  onUpdatePaymentStatus,
  isLoading = false,
  onRefresh,
  onDeleteOrder
}: OrderTableProps) {
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State for Order Cancellation & Customer Refund Process
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [selectedRefundMethod, setSelectedRefundMethod] = useState<'GCash' | 'Maya'>('GCash');
  const [refundNumber, setRefundNumber] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundError, setRefundError] = useState<string | null>(null);

  // Email Preview & Dispatcher Modal State
  const [emailModalOrder, setEmailModalOrder] = useState<Order | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalInitialType, setEmailModalInitialType] = useState<OrderEmailType>('payment_verified');

  const handleManualRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleModalUpdatePaymentStatus = (orderId: string, newStatus: string) => {
    if (onUpdatePaymentStatus) {
      onUpdatePaymentStatus(orderId, newStatus);
    }
    if (selectedPaymentOrder && selectedPaymentOrder.id === orderId) {
      setSelectedPaymentOrder((prev) => (prev ? { ...prev, paymentStatus: newStatus } : null));
    }
  };

  const handleStatusChange = (order: Order, newStatus: string) => {
    if (newStatus === 'Cancelled') {
      // Intercept transition to Cancelled: ask for GCash/Maya selection and number
      setCancellingOrder(order);
      setSelectedRefundMethod((order.refundMethod as 'GCash' | 'Maya') || 'GCash');
      // Auto-extract phone if present
      const phoneMatch = order.recipient?.match(/(09\d{9}|\+?639\d{9}|\d{11})/);
      setRefundNumber(order.refundNumber || (phoneMatch ? phoneMatch[1] : ''));
      setRefundReason('Order cancelled by atelier. Customer refund scheduled.');
      setRefundError(null);
    } else {
      onUpdateStatus(order.id, newStatus);
    }
  };

  const handleConfirmCancellation = () => {
    if (!cancellingOrder) return;
    const cleanNum = refundNumber.trim();
    if (!cleanNum) {
      setRefundError('Please enter the customer GCash or Maya mobile number for refund processing.');
      return;
    }
    onUpdateStatus(cancellingOrder.id, 'Cancelled', {
      refundMethod: selectedRefundMethod,
      refundNumber: cleanNum,
      notes: refundReason.trim()
    });
    setCancellingOrder(null);
  };

  // Filter orders by search query, status, and payment status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        (order.recipient && order.recipient.toLowerCase().includes(q)) ||
        order.items.some((it) => it.name.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'All' || order.status.toLowerCase() === statusFilter.toLowerCase();

      const isVerified = order.paymentStatus?.toLowerCase().includes('verified');
      const isRejected = order.paymentStatus?.toLowerCase().includes('reject');
      const isPending = !isVerified && !isRejected;

      let matchesPayment = true;
      if (paymentFilter === 'verified') matchesPayment = isVerified;
      else if (paymentFilter === 'pending') matchesPayment = isPending;
      else if (paymentFilter === 'rejected') matchesPayment = isRejected;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, searchQuery, statusFilter, paymentFilter]);

  // Counts for summary pills
  const statusCounts = useMemo(() => {
    return {
      all: orders.length,
      received: orders.filter((o) => o.status === 'Order Received').length,
      inProgress: orders.filter((o) => o.status === 'Floral Artistry in Progress').length,
      delivery: orders.filter((o) => o.status === 'Out for Delivery').length,
      delivered: orders.filter((o) => o.status === 'Delivered').length,
      cancelled: orders.filter((o) => o.status === 'Cancelled').length,
      pendingPayment: orders.filter(
        (o) => !o.paymentStatus?.toLowerCase().includes('verified') && !o.paymentStatus?.toLowerCase().includes('reject')
      ).length
    };
  }, [orders]);

  return (
    <>
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Top Header Banner */}
        <div className="p-5 sm:p-6 border-b border-stone-200 bg-stone-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <h3 className="font-serif font-bold text-stone-900 text-lg sm:text-xl">
                Active Floral Orders
              </h3>
              {/* Database Live Indicator */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span>Database Live</span>
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Live order pipeline synced with your Supabase database &bull; Real-time status dispatcher
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isLoading || isRefreshing}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs transition cursor-pointer disabled:opacity-50"
                title="Refresh orders from database"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-stone-500 ${
                    isLoading || isRefreshing ? 'animate-spin text-[#2D5A43]' : ''
                  }`}
                />
                <span>{isLoading || isRefreshing ? 'Syncing...' : 'Refresh DB'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setEmailModalOrder(null);
                setEmailModalInitialType('payment_verified');
                setIsEmailModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs transition cursor-pointer"
              title="Preview & test all 7 lifecycle email templates"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-700" />
              <span>Email Templates</span>
            </button>

            <span className="text-xs font-semibold text-stone-700 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
              <strong className="font-mono text-[#2D5A43]">{orders.length}</strong> Registered Orders
            </span>
          </div>
        </div>

        {/* Filter and Search Controls Bar */}
        <div className="p-4 border-b border-stone-100 bg-white flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order Ref (e.g. ORD-1001), customer, or items..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 hover:bg-stone-100/70 focus:bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Dropdown Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-medium text-stone-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-700 font-medium focus:ring-1 focus:ring-[#2D5A43] cursor-pointer"
              >
                <option value="All">All Statuses ({orders.length})</option>
                <option value="Order Received">Order Received ({statusCounts.received})</option>
                <option value="Floral Artistry in Progress">Floral Artistry ({statusCounts.inProgress})</option>
                <option value="Out for Delivery">Out for Delivery ({statusCounts.delivery})</option>
                <option value="Delivered">Delivered ({statusCounts.delivered})</option>
                <option value="Cancelled">Cancelled ({statusCounts.cancelled})</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-medium text-stone-400">Payment:</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-700 font-medium focus:ring-1 focus:ring-[#2D5A43] cursor-pointer"
              >
                <option value="All">All Payments</option>
                <option value="verified">Verified & Cleared</option>
                <option value="pending">Pending Verification</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {(searchQuery || statusFilter !== 'All' || paymentFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setPaymentFilter('All');
                }}
                className="text-xs text-[#2D5A43] hover:underline font-medium px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Orders Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 uppercase text-[10px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-4 font-bold">Order Ref</th>
                <th className="p-4 font-bold">Customer & Contact</th>
                <th className="p-4 font-bold">Bouquet Items</th>
                <th className="p-4 font-bold">Scheduled Date</th>
                <th className="p-4 font-bold">Total Amount</th>
                <th className="p-4 font-bold">Payment Status</th>
                <th className="p-4 font-bold">Transaction</th>
                <th className="p-4 font-bold">Status Transition</th>
                {onDeleteOrder && <th className="p-4 font-bold text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                // Loading Skeleton Rows
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="p-4">
                      <div className="h-4 bg-stone-200 rounded-md w-20 mb-1"></div>
                      <div className="h-3 bg-stone-100 rounded-md w-14"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-stone-200 rounded-md w-28 mb-1"></div>
                      <div className="h-3 bg-stone-100 rounded-md w-36"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-3 bg-stone-200 rounded-md w-32 mb-1"></div>
                      <div className="h-3 bg-stone-100 rounded-md w-24"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-stone-200 rounded-md w-20"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-stone-200 rounded-md w-16"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-6 bg-stone-200 rounded-full w-24"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-7 bg-stone-200 rounded-xl w-24"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-7 bg-stone-200 rounded-lg w-32"></div>
                    </td>
                    {onDeleteOrder && (
                      <td className="p-4 text-center">
                        <div className="h-6 w-6 bg-stone-200 rounded-full mx-auto"></div>
                      </td>
                    )}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                // Empty Database State
                <tr>
                  <td colSpan={onDeleteOrder ? 9 : 8} className="p-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-50 border border-emerald-100 text-[#2D5A43] flex items-center justify-center shadow-xs">
                        <ShoppingBag className="w-7 h-7" />
                      </div>
                      <h4 className="font-serif font-bold text-stone-900 text-base">
                        No Orders in Database Yet
                      </h4>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Your admin order pipeline is cleanly connected to Supabase. When customers checkout on your storefront or upload proof of payment, their orders will appear here automatically.
                      </p>
                      {onRefresh && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleManualRefresh}
                            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#2D5A43] text-white hover:bg-[#234735] shadow-xs transition cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Check for New Orders</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                // No Results for Filter
                <tr>
                  <td colSpan={onDeleteOrder ? 9 : 8} className="p-10 text-center">
                    <div className="space-y-2">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="text-sm font-semibold text-stone-800">
                        No orders match your filter criteria
                      </p>
                      <p className="text-xs text-stone-500">
                        Try clearing your search query or choosing a different filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('All');
                          setPaymentFilter('All');
                        }}
                        className="text-xs font-semibold text-[#2D5A43] underline pt-1 cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isCancelled = order.status === 'Cancelled' || order.status.toLowerCase().includes('cancel');
                  const isVerified = order.paymentStatus?.toLowerCase().includes('verified');
                  const isRejected = order.paymentStatus?.toLowerCase().includes('reject');

                  return (
                    <tr
                      key={order.id}
                      className={`transition-colors ${
                        isCancelled
                          ? 'bg-rose-50/90 hover:bg-rose-100/90 border-l-4 border-l-rose-500 text-stone-900'
                          : 'hover:bg-stone-50/80'
                      }`}
                    >
                      {/* Order Ref */}
                      <td className="p-4 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className={`block ${isCancelled ? 'text-rose-700 font-extrabold' : 'text-[#2D5A43]'}`}>
                            {order.id}
                          </span>
                          {isCancelled && (
                            <span className="text-[9px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-rose-200 text-rose-800">
                              Cancelled
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 font-sans font-normal block">
                          {order.date}
                        </span>
                      </td>

                      {/* Customer Info & Connected Refund Channel */}
                      <td className="p-4">
                        <span className={`font-semibold block ${isCancelled ? 'text-rose-950' : 'text-stone-900'}`}>
                          {order.customer}
                        </span>
                        <span className="text-[11px] text-stone-500 block truncate max-w-[180px]">
                          {order.email}
                        </span>
                        {order.recipient && (
                          <span className="text-[10px] text-stone-400 block truncate max-w-[180px]" title={order.recipient}>
                            To: {order.recipient}
                          </span>
                        )}
                        {isCancelled && (
                          <div
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-100/90 px-2 py-0.5 rounded-md border border-rose-200 shadow-2xs max-w-[210px] truncate"
                            title={`Customer Refund Destination: ${order.refundMethod || 'GCash/Maya'} - ${order.refundNumber || 'Pending number'}`}
                          >
                            <span className="text-rose-600 shrink-0">💸</span>
                            <span className="truncate">
                              {order.refundMethod ? `${order.refundMethod}: ` : 'Refund: '}
                              <strong>{order.refundNumber || 'Pending number'}</strong>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="p-4">
                        <div className="space-y-0.5 max-w-[200px]">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((it, i) => (
                              <span key={i} className="block text-stone-700 truncate">
                                <strong className="font-semibold text-stone-900">{it.qty}x</strong>{' '}
                                {it.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-stone-400 italic">No item breakdown</span>
                          )}
                        </div>
                      </td>

                      {/* Scheduled Date */}
                      <td className="p-4 text-stone-600 font-medium">
                        <span className="block font-mono text-stone-800">
                          {order.deliveryDate || 'Standard Delivery'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="p-4 font-serif font-bold text-stone-900 text-sm whitespace-nowrap">
                        ${order.total.toFixed(2)}
                      </td>

                      {/* Payment Status Pill */}
                      <td className="p-4 whitespace-nowrap">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-900 border border-rose-300">
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>
                              {order.refundNumber
                                ? `Refund via ${order.refundMethod || 'E-Wallet'}`
                                : 'Cancelled (Refund Due)'}
                            </span>
                          </span>
                        ) : isVerified ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Verified & Cleared</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{order.paymentStatus || 'Pending Verification'}</span>
                          </span>
                        )}
                      </td>

                      {/* Transaction Button & Email Dispatch */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPaymentOrder(order)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer group ${
                              isCancelled
                                ? 'bg-rose-100 hover:bg-rose-700 hover:text-white text-rose-800 border border-rose-300'
                                : 'bg-stone-100 hover:bg-[#2D5A43] hover:text-white text-stone-700 border border-stone-200'
                            }`}
                          >
                            <Receipt className="w-3.5 h-3.5 text-stone-500 group-hover:text-white transition" />
                            <span>Transaction</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEmailModalOrder(order);
                              let defaultType: OrderEmailType = 'payment_verified';
                              if (order.status === 'Floral Artistry in Progress') defaultType = 'floral_artistry';
                              else if (order.status === 'Out for Delivery') defaultType = 'out_for_delivery';
                              else if (order.status === 'Delivered') defaultType = 'delivered';
                              else if (order.status === 'Cancelled') defaultType = order.refundNumber ? 'refund' : 'cancelled';
                              else if (order.paymentStatus?.toLowerCase().includes('reject')) defaultType = 'payment_rejected';
                              else defaultType = 'payment_verified';
                              setEmailModalInitialType(defaultType);
                              setIsEmailModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl text-stone-500 hover:text-[#2D5A43] hover:bg-emerald-50 border border-stone-200 bg-stone-50 transition cursor-pointer"
                            title="Preview & Dispatch Customer Lifecycle Emails"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Status Transition Select */}
                      <td className="p-4 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                          className={`p-1.5 border rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#2D5A43] cursor-pointer transition ${
                            isCancelled
                              ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold hover:bg-rose-200'
                              : 'bg-stone-50 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {ORDER_STATUS_OPTIONS.map((statusOpt) => (
                            <option key={statusOpt} value={statusOpt}>
                              {statusOpt}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Delete Action if handler provided */}
                      {onDeleteOrder && (
                        <td className="p-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete order ${order.id} from the database?`)) {
                                onDeleteOrder(order.id);
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete order record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CANCELLATION & CUSTOMER REFUND TRANSITION MODAL */}
      {cancellingOrder && (
        <div
          onClick={() => setCancellingOrder(null)}
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-50 to-amber-50/50 border-b border-rose-100 p-5 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    Cancel Order & Refund Customer
                  </h3>
                  <p className="text-xs text-rose-700 font-medium">
                    Order Ref: <strong className="font-mono">{cancellingOrder.id}</strong> &bull; Total: <strong className="font-serif">${cancellingOrder.total.toFixed(2)}</strong>
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
            <div className="p-6 space-y-5">
              {/* Message to refund the money */}
              <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200/80 text-xs text-rose-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-800">
                  <DollarSign className="w-4 h-4 text-rose-600" />
                  Refund Notice for Order Cancellation
                </p>
                <p className="leading-relaxed text-[11px] text-stone-700">
                  Cancelling this order requires refunding the customer&apos;s money of <strong className="text-rose-700 font-bold">${cancellingOrder.total.toFixed(2)}</strong>. This will mark the order row in red and connect the refund request directly to the customer.
                </p>
              </div>

              {/* Customer Details info */}
              <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 text-xs flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-bold">Customer Contact</span>
                  <span className="font-semibold text-stone-900 block">{cancellingOrder.customer}</span>
                  <span className="text-[11px] text-stone-500 block">{cancellingOrder.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-bold">Refund Amount</span>
                  <span className="text-lg font-serif font-bold text-rose-600">${cancellingOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Selection for Transition of Refund: GCash or Maya */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Select Refund E-Wallet:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRefundMethod('GCash')}
                    className={`p-3 rounded-2xl border-2 flex items-center space-x-3 text-left transition cursor-pointer ${
                      selectedRefundMethod === 'GCash'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      G
                    </div>
                    <div>
                      <span className="block font-bold text-xs">GCash</span>
                      <span className="block text-[10px] text-stone-500">e-Wallet Refund</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRefundMethod('Maya')}
                    className={`p-3 rounded-2xl border-2 flex items-center space-x-3 text-left transition cursor-pointer ${
                      selectedRefundMethod === 'Maya'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      M
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Maya</span>
                      <span className="block text-[10px] text-stone-500">e-Wallet Refund</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* E-Wallet Mobile Number Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Customer {selectedRefundMethod} Mobile Number:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={refundNumber}
                    onChange={(e) => {
                      setRefundNumber(e.target.value);
                      if (refundError) setRefundError(null);
                    }}
                    placeholder={`Enter customer's 11-digit ${selectedRefundMethod} number (e.g. 09171234567)`}
                    className="w-full pl-9 pr-4 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                  />
                </div>
                {refundError && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {refundError}
                  </p>
                )}
              </div>

              {/* Transition Notes / Message */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Cancellation Reason & Refund Transition Note:
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Order cancelled by customer. 100% money refund dispatched."
                  className="w-full px-3.5 py-2 bg-stone-50 focus:bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
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
                onClick={handleConfirmCancellation}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                <span>Confirm Cancellation & Schedule Refund</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment & Verification Modal */}
      <PaymentModal
        isOpen={!!selectedPaymentOrder}
        onClose={() => setSelectedPaymentOrder(null)}
        order={selectedPaymentOrder}
        onUpdatePaymentStatus={handleModalUpdatePaymentStatus}
      />

      {/* Email Preview & Dispatcher Modal */}
      <EmailPreviewModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        order={emailModalOrder}
        initialType={emailModalInitialType}
      />
    </>
  );
}

export default OrderTable;
