'use client';

import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Menu,
  Plus,
  Search,
  Sparkles,
  ArrowUpRight,
  AlertTriangle,
  Flower2,
  Boxes,
  Barcode,
  Building2,
  Tag,
  DollarSign,
  Calendar,
  Edit,
  Eye,
  CheckCircle2,
  TrendingUp,
  PackageCheck,
  RotateCcw,
  ArrowDownRight,
  Truck,
  Store,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Product } from '@/types/product';
import { InventoryItem } from '@/types/inventory';
import { Order } from '@/types/order';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { OrderTable } from './order-table';
import { ProductFormModal } from './product-form';
import { InventoryModal } from './inventory-modal';
import { CustomerTable } from './users-table';
import { SalesTable } from './sales-table';
import { BestSellersTable } from './best-sellers-table';
import {
  updateOrderStatusAction,
  updateOrderPaymentStatusAction
} from '@/actions/order/action';
import {
  createProductAction,
  updateProductAction,
  toggleProductStatusAction,
  deleteProductAction
} from '@/actions/product/action';
import { updateInventoryMovementAction } from '@/actions/inventory/action';

interface AdminManagementViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  isLoadingProducts?: boolean;
  onRefreshProducts?: () => Promise<void>;
  inventory?: InventoryItem[];
  setInventory?: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  isLoadingInventory?: boolean;
  onRefreshInventory?: () => Promise<void>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  isLoadingOrders?: boolean;
  onRefreshOrders?: () => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
  categories: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notify: (msg: string) => void;
  onNavigateStorefront?: () => void;
  onLogout?: () => void;
}

export function AdminManagementView({
  products,
  setProducts,
  isLoadingProducts = false,
  onRefreshProducts,
  inventory: externalInventory,
  setInventory: externalSetInventory,
  isLoadingInventory = false,
  onRefreshInventory,
  orders,
  setOrders,
  isLoadingOrders,
  onRefreshOrders,
  onDeleteOrder,
  categories,
  activeTab,
  setActiveTab,
  notify,
  onNavigateStorefront,
  onLogout
}: AdminManagementViewProps) {
  // Local fallback if inventory state not passed from parent (no default seeds)
  const [internalInventory, setInternalInventory] = useState<InventoryItem[]>([]);
  const inventory = externalInventory !== undefined ? externalInventory : internalInventory;
  const setInventory = externalSetInventory || setInternalInventory;

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);

  // Mobile sidebar & UI collapse
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Product Management Filters
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('All');
  const [productStatus, setProductStatus] = useState<'All' | 'active' | 'inactive'>('All');
  const [productSupplier, setProductSupplier] = useState('All');

  // Inventory Management Filters
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'All' | 'low_stock' | 'in_stock' | 'out_of_stock'>('All');

  // Live Users Count
  const [usersCount, setUsersCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('bloom_crafts_all_users');
        if (cached) return JSON.parse(cached).length;
      } catch {}
    }
    return 0;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rons_admin_sidebar_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rons_admin_sidebar_collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const formatNow = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // 1. Product Management Handlers - Connected to Database

  const handleCreateProduct = async (newProduct: Product, initialStock = 10, reorderLevel = 5) => {
    notify(`Cataloging "${newProduct.name}" in database...`);
    try {
      const res = await createProductAction(newProduct, initialStock, reorderLevel);
      if (res.success && res.product) {
        const created = res.product;
        setProducts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);

        if (onRefreshInventory) {
          await onRefreshInventory();
        } else {
          // Automatically create matching inventory tracking record
          const nextInvId = `INV-${created.sku ? created.sku.replace(/^RBC-|^PRD-/, '') : (created.id.length > 8 ? created.id.slice(0, 4).toUpperCase() : created.id)}`;
          const newInvItem: InventoryItem = {
            id: nextInvId,
            productId: created.id,
            quantityInStock: initialStock,
            reorderLevel: reorderLevel,
            stockIn: initialStock,
            stockOut: 0,
            lastUpdated: formatNow()
          };
          setInventory((prev) => [newInvItem, ...prev.filter((i) => i.productId !== created.id)]);
        }

        notify(`Cataloged "${created.name}" (${created.sku || created.id}) in database! 🌸`);
      } else {
        notify(`Failed to save product in database: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      notify(`Database error: ${err?.message || 'Failed to save product'}`);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const prevProducts = products;
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    notify(`Updating "${updatedProduct.name}" in database...`);

    try {
      const res = await updateProductAction(updatedProduct);
      if (res.success) {
        notify(`Saved revisions for "${updatedProduct.name}" in database!`);
      } else {
        setProducts(prevProducts);
        notify(`Could not update product: ${res.error || 'Database error'}`);
      }
    } catch (err: any) {
      setProducts(prevProducts);
      notify(`Update product error: ${err?.message || 'Database error'}`);
    }
  };

  const handleToggleProductStatus = async (productId: string) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const nextStatus = target.status === 'active' ? 'inactive' : 'active';
    const prevProducts = products;

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status: nextStatus } : p))
    );
    notify(`Product status changing to ${nextStatus.toUpperCase()}...`);

    try {
      const res = await toggleProductStatusAction(productId, nextStatus);
      if (res.success) {
        notify(`Product ${target.sku || productId} is now ${nextStatus.toUpperCase()}`);
      } else {
        setProducts(prevProducts);
        notify(`Could not update status: ${res.error || 'Database error'}`);
      }
    } catch (err: any) {
      setProducts(prevProducts);
      notify(`Status update error: ${err?.message || 'Database error'}`);
    }
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the database?`)) {
      const prevProducts = products;
      const prevInventory = inventory;

      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setInventory((prev) => prev.filter((i) => i.productId !== productId));
      notify(`Removing "${name}" from database...`);

      try {
        const res = await deleteProductAction(productId);
        if (res.success) {
          notify(`Removed product "${name}" and its inventory records.`);
          if (onRefreshInventory) {
            await onRefreshInventory();
          }
        } else {
          setProducts(prevProducts);
          setInventory(prevInventory);
          notify(`Failed to delete product: ${res.error || 'Database error'}`);
        }
      } catch (err: any) {
        setProducts(prevProducts);
        setInventory(prevInventory);
        notify(`Delete product error: ${err?.message || 'Database error'}`);
      }
    }
  };

  // 2. Inventory Management Handlers - Connected to Supabase Database
  const handleUpdateInventory = async (updatedItem: InventoryItem) => {
    const prevInventory = inventory;
    const prevProducts = products;

    // Optimistically update local view
    setInventory((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));

    // Synchronize product stock count for storefront/cart
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedItem.productId ? { ...p, stock: updatedItem.quantityInStock } : p))
    );

    notify(`Recording stock movement in database...`);

    try {
      const res = await updateInventoryMovementAction(updatedItem);
      if (res.success) {
        notify(`Inventory ${updatedItem.id} updated! Stock is now ${updatedItem.quantityInStock} stems.`);
        if (onRefreshInventory) {
          await onRefreshInventory();
        }
        if (onRefreshProducts) {
          await onRefreshProducts();
        }
      } else {
        setInventory(prevInventory);
        setProducts(prevProducts);
        notify(`Failed to update stock in database: ${res.error || 'Database error'}`);
      }
    } catch (err: any) {
      setInventory(prevInventory);
      setProducts(prevProducts);
      notify(`Database error: ${err?.message || 'Failed to update inventory'}`);
    }
  };

  const handleQuickStockIn = async (item: InventoryItem, amount = 5) => {
    const updated: InventoryItem = {
      ...item,
      quantityInStock: item.quantityInStock + amount,
      stockIn: item.stockIn + amount,
      lastUpdated: formatNow()
    };
    await handleUpdateInventory(updated);
  };

  const handleQuickStockOut = async (item: InventoryItem, amount = 2) => {
    if (item.quantityInStock <= 0) {
      notify(`Cannot stock out of ${item.id}: currently out of stock.`);
      return;
    }
    const realAmount = Math.min(item.quantityInStock, amount);
    const updated: InventoryItem = {
      ...item,
      quantityInStock: item.quantityInStock - realAmount,
      stockOut: item.stockOut + realAmount,
      lastUpdated: formatNow()
    };
    await handleUpdateInventory(updated);
  };

  // Order & Payment Handlers - Connected to Supabase Database
  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: string,
    refundDetails?: { refundMethod: 'GCash' | 'Maya' | string; refundNumber: string; notes?: string }
  ) => {
    const prevOrders = orders;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: newStatus,
            ...(newStatus === 'Cancelled' && refundDetails
              ? {
                  refundMethod: refundDetails.refundMethod,
                  refundNumber: refundDetails.refundNumber,
                  paymentStatus: 'Payment Rejected'
                }
              : {})
          };
        }
        return o;
      })
    );

    notify(
      newStatus === 'Cancelled' && refundDetails
        ? `Order ${orderId} cancelled & refund scheduled via ${refundDetails.refundMethod}`
        : `Order ${orderId} moved to "${newStatus}"`
    );

    try {
      const res = await updateOrderStatusAction(orderId, newStatus, refundDetails);
      if (!res.success) {
        setOrders(prevOrders);
        notify(`Could not update status in DB: ${res.error || 'Database error'}`);
      }
    } catch (err: any) {
      setOrders(prevOrders);
      notify(`Status update error: ${err?.message || 'Database error'}`);
    }
  };

  const handleVerifyPayment = async (orderId: string, isApproved: boolean) => {
    const newStatus = isApproved ? 'Verified & Cleared' : 'Payment Rejected';
    const prevOrders = orders;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            paymentStatus: newStatus
          };
        }
        return o;
      })
    );
    notify(`Payment for order ${orderId} was ${isApproved ? 'Approved & Cleared' : 'Rejected'}.`);

    try {
      const res = await updateOrderPaymentStatusAction(orderId, newStatus);
      if (!res.success) {
        setOrders(prevOrders);
        notify(`Could not persist payment status: ${res.error || 'Database error'}`);
      }
    } catch (err: any) {
      setOrders(prevOrders);
      notify(`Payment update error: ${err?.message || 'Database error'}`);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    const prevOrders = orders;
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: newPaymentStatus } : o))
    );
    notify(`Order ${orderId} payment status updated to "${newPaymentStatus}".`);

    try {
      const res = await updateOrderPaymentStatusAction(orderId, newPaymentStatus);
      if (!res.success) {
        setOrders(prevOrders);
        notify(`Could not persist payment status: ${res.error || 'Database error'}`);
      }
    } catch (err: any) {
      setOrders(prevOrders);
      notify(`Payment status error: ${err?.message || 'Database error'}`);
    }
  };

  // Aggregated Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'Delivered').length;
  const pendingPaymentsCount = orders.filter(
    (o) => o.paymentStatus === 'Pending Verification' || !o.paymentStatus?.includes('Verified')
  ).length;

  const totalStockQuantity = inventory.reduce((sum, i) => sum + i.quantityInStock, 0);
  const lowStockCount = inventory.filter((i) => i.quantityInStock <= i.reorderLevel).length;
  const totalStockedIn = inventory.reduce((sum, i) => sum + i.stockIn, 0);
  const totalStockedOut = inventory.reduce((sum, i) => sum + i.stockOut, 0);

  const activeProductsCount = products.filter((p) => p.status === 'active').length;
  const inactiveProductsCount = products.filter((p) => p.status === 'inactive').length;
  const uniqueSuppliers = Array.from(new Set(products.map((p) => p.supplier).filter(Boolean)));

  // Average Profit Margin
  const totalCost = products.reduce((sum, p) => sum + (p.costPrice || 0), 0);
  const totalSelling = products.reduce((sum, p) => sum + (p.sellingPrice || p.price || 0), 0);
  const avgMargin = totalSelling > 0 ? (((totalSelling - totalCost) / totalSelling) * 100).toFixed(1) : '0';

  // Delivery & Pickup Schedule
  const scheduleOrders = orders.filter((o) => !o.status.toLowerCase().includes('cancel'));
  const scheduleDeliveriesCount = scheduleOrders.filter(
    (o) => !o.recipient?.toLowerCase().includes('pickup') && o.deliveryFee > 0
  ).length;
  const schedulePickupsCount = scheduleOrders.filter(
    (o) => o.recipient?.toLowerCase().includes('pickup') || o.deliveryFee === 0
  ).length;

  // Active Tab Flags
  const isTabDashboard = activeTab === 'dashboard' || !activeTab;
  const isTabUsers = activeTab === 'users' || activeTab === 'customers' || activeTab === 'patron';
  const isTabOrders = activeTab === 'orders';
  const isTabProducts = activeTab === 'products' || activeTab === 'products-mgmt';
  const isTabBestSellers = activeTab === 'best-sellers' || activeTab === 'bestsellers';
  const isTabSales = activeTab === 'sales' || activeTab === 'sales-report';
  const isTabInventory = activeTab === 'inventory';


  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.supplier && p.supplier.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);

    const matchesCategory = productCategory === 'All' || p.category === productCategory;
    const matchesStatus = productStatus === 'All' || p.status === productStatus;
    const matchesSupplier = productSupplier === 'All' || p.supplier === productSupplier;

    return matchesSearch && matchesCategory && matchesStatus && matchesSupplier;
  });

  // Filtered Inventory
  const filteredInventory = inventory.filter((item) => {
    const q = inventorySearch.toLowerCase().trim();
    const linkedProduct = products.find((p) => p.id === item.productId);

    const matchesSearch =
      !q ||
      item.id.toLowerCase().includes(q) ||
      item.productId.toLowerCase().includes(q) ||
      (linkedProduct && linkedProduct.name.toLowerCase().includes(q)) ||
      (linkedProduct && linkedProduct.sku && linkedProduct.sku.toLowerCase().includes(q));

    let matchesStatus = true;
    if (inventoryStatusFilter === 'low_stock') {
      matchesStatus = item.quantityInStock > 0 && item.quantityInStock <= item.reorderLevel;
    } else if (inventoryStatusFilter === 'out_of_stock') {
      matchesStatus = item.quantityInStock <= 0;
    } else if (inventoryStatusFilter === 'in_stock') {
      matchesStatus = item.quantityInStock > item.reorderLevel;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col lg:flex-row text-stone-800">
      {/* Admin Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        ordersCount={activeOrdersCount}
        inventoryCount={inventory.length}
        pendingPaymentsCount={pendingPaymentsCount}
        patronCount={usersCount}
        totalRevenue={totalRevenue}
        onAddBouquet={() => {
          setEditingProduct(null);
          setShowProductModal(true);
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onNavigateStorefront={onNavigateStorefront}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        onLogout={onLogout}
      />

      {/* Main Admin Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-stone-200/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-1.5 text-xs text-stone-500 font-mono">
                <span>Atelier Suite</span>
                <span>/</span>
                <span className="font-semibold text-[#2D5A43] capitalize">
                  {isTabDashboard && 'Dashboard'}
                  {isTabUsers && 'Users'}
                  {isTabOrders && 'Orders'}
                  {isTabProducts && 'Product Management'}
                  {isTabBestSellers && 'Best Sellers'}
                  {isTabSales && 'Sales'}
                  {isTabInventory && 'Inventory Management'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ============================================================== */}
          {/* TAB: DASHBOARD                                                 */}
          {/* ============================================================== */}
          {isTabDashboard && (
            <div className="animate-fadeIn space-y-6">
              <AdminHeader
                totalRevenue={totalRevenue}
                activeDeliveriesCount={activeOrdersCount}
                inventoryCount={inventory.length}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Orders snapshot */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div>
                      <h3 className="font-serif font-bold text-stone-900 text-lg">Live Orders Pipeline</h3>
                      <p className="text-xs text-stone-500">
                        {orders.length} total orders registered &bull; {activeOrdersCount} in progress
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTabChange('orders')}
                      className="text-xs font-semibold text-[#2D5A43] hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>View Orders Dispatch</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] tracking-wider font-mono">
                        <tr>
                          <th className="py-2.5 px-3">Order Ref</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Items</th>
                          <th className="py-2.5 px-3">Total</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {orders.slice(0, 4).map((o) => (
                          <tr key={o.id} className="hover:bg-stone-50/50">
                            <td className="py-3 px-3 font-mono font-bold text-[#2D5A43]">{o.id}</td>
                            <td className="py-3 px-3 font-medium text-stone-900">{o.customer}</td>
                            <td className="py-3 px-3 text-stone-600 truncate max-w-[140px]">
                              {o.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                            </td>
                            <td className="py-3 px-3 font-serif font-bold text-stone-900">${o.total.toFixed(2)}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  o.status === 'Delivered' ? 'bg-stone-100 text-stone-700' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Today's Delivery and Pickup Schedule */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div>
                      <h3 className="font-serif font-bold text-stone-900 text-lg">
                        Today's Delivery and Pickup Schedule
                      </h3>
                      <p className="text-xs text-stone-500">
                        {scheduleOrders.length} fulfillment slots &bull; {scheduleDeliveriesCount} deliveries, {schedulePickupsCount} pickups
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTabChange('orders')}
                      className="text-xs font-semibold text-[#2D5A43] hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>View Orders</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {scheduleOrders.slice(0, 4).map((o) => {
                      const isPickup =
                        o.recipient?.toLowerCase().includes('pickup') ||
                        o.cardMessage?.toLowerCase().includes('pickup') ||
                        o.deliveryFee === 0;

                      return (
                        <div
                          key={o.id}
                          onClick={() => handleTabChange('orders')}
                          className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/80 border border-stone-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition cursor-pointer group"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isPickup
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-[#2D5A43]'
                              }`}
                            >
                              {isPickup ? (
                                <Store className="w-4 h-4" />
                              ) : (
                                <Truck className="w-4 h-4" />
                              )}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-xs text-[#2D5A43]">
                                  {o.id}
                                </span>
                                <span className="text-xs font-medium text-stone-900 truncate">
                                  {o.customer}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 truncate mt-0.5">
                                {o.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 pl-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isPickup
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                  : 'bg-emerald-50 text-[#2D5A43] border border-emerald-200/60'
                              }`}
                            >
                              {isPickup ? 'Studio Pickup' : 'Hand Delivery'}
                            </span>
                            <span className="text-[10px] text-stone-500 mt-1 flex items-center space-x-1 font-medium">
                              <Clock className="w-3 h-3 text-stone-400" />
                              <span>{o.deliveryDate || 'Today'}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {scheduleOrders.length === 0 && (
                      <div className="py-8 text-center text-stone-400 text-xs">
                        No fulfillment schedule active today.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: SALES                                                     */}
          {/* Shows Product, Quantity Sold, Price, Sales (Formula: Qty × Price)*/}
          {/* ============================================================== */}
          {isTabSales && (
            <div className="animate-fadeIn space-y-6">
              <SalesTable
                products={products}
                orders={orders}
                onNotify={notify}
                onRefreshOrders={onRefreshOrders}
              />
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: PRODUCT MANAGEMENT                                      */}
          {/* Contains information about the items your business sells/manages*/}
          {/* ============================================================== */}
          {isTabProducts && (
            <div className="animate-fadeIn space-y-5">
              {/* Product Management Overview Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                    <span>Cataloged Products</span>
                    <Flower2 className="w-4 h-4 text-[#2D5A43]" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="font-serif font-bold text-2xl text-stone-900">{products.length}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                      {activeProductsCount} active &bull; {inactiveProductsCount} inactive
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                    <span>Average Selling Price</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="font-serif font-bold text-2xl text-stone-900">
                      ${products.length > 0 ? (totalSelling / products.length).toFixed(2) : '0.00'}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Cost: ${products.length > 0 ? (totalCost / products.length).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                    <span>Est. Gross Margin</span>
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="font-serif font-bold text-2xl text-stone-900">{avgMargin}%</span>
                    <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                      +${(totalSelling - totalCost).toFixed(2)} total profit
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                    <span>Active Suppliers</span>
                    <Building2 className="w-4 h-4 text-[#2D5A43]" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="font-serif font-bold text-2xl text-stone-900">{uniqueSuppliers.length}</span>
                    <span className="text-[10px] text-stone-500 font-mono">Certified sources</span>
                  </div>
                </div>
              </div>

              {/* Main Product Management Table Card */}
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                {/* Header & Filter Controls */}
                <div className="p-5 sm:p-6 border-b border-stone-200/80 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider font-mono">
                        1. Product Management
                      </span>
                      <span className="text-xs text-stone-500 font-medium">
                        {filteredProducts.length} of {products.length} Products Shown
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-stone-900 text-xl mt-1">
                      Botanical Catalog & Product Database
                    </h3>
                    <p className="text-xs text-stone-500">
                      Contains information about the items your business sells or manages.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search */}
                    <div className="relative w-full sm:w-52">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search ID, name, category..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
                      />
                    </div>

                    {/* Category Filter */}
                    <select
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value)}
                      className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      {categories
                        .filter((c) => c !== 'All Blooms')
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                      value={productStatus}
                      onChange={(e) => setProductStatus(e.target.value as any)}
                      className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>

                    {/* Add Product Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setShowProductModal(true);
                      }}
                      className="px-3.5 py-2 bg-[#2D5A43] hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-xs transition hover:scale-[1.02] cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-amber-300" />
                      <span>Add Product</span>
                    </button>
                  </div>
                </div>

                {/* 10-Field Product Management Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100/70 text-stone-600 uppercase text-[10px] tracking-wider font-mono">
                      <tr>
                        <th className="p-3.5 pl-6">Product ID</th>
                        <th className="p-3.5">Product Image</th>
                        <th className="p-3.5">Product Name</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Description</th>
                        <th className="p-3.5">Cost Price</th>
                        <th className="p-3.5">Selling Price</th>
                        <th className="p-3.5">Supplier</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-12 text-center text-stone-500">
                            {isLoadingProducts ? (
                              <div className="flex flex-col items-center justify-center space-y-2 py-6">
                                <div className="w-6 h-6 border-2 border-[#2D5A43] border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-mono text-stone-500">Loading botanical catalog from database...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center space-y-2 py-6">
                                <Flower2 className="w-10 h-10 text-stone-300" />
                                <div>
                                  <p className="font-semibold text-stone-700 text-sm">No products found in database</p>
                                  <p className="text-stone-400 text-xs mt-0.5">
                                    {productSearch || productCategory !== 'All' || productStatus !== 'All'
                                      ? 'Try adjusting your search query or category filters.'
                                      : 'Your database catalog is currently empty.'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => {
                          const cost = p.costPrice || 0;
                          const selling = p.sellingPrice || p.price || 0;
                          const profit = selling - cost;
                          const margin = selling > 0 ? ((profit / selling) * 100).toFixed(1) : '0';

                          return (
                            <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                              {/* 1. Product ID */}
                              <td className="p-3.5 pl-6 font-mono font-bold text-[#2D5A43] whitespace-nowrap">
                                <span
                                  className="bg-[#2D5A43]/10 text-[#2D5A43] px-2 py-0.5 rounded-md border border-[#2D5A43]/20"
                                  title={`Database ID: ${p.id}`}
                                >
                                  {p.sku || (p.id.length > 8 ? `PRD-${p.id.slice(0, 4).toUpperCase()}` : p.id)}
                                </span>
                              </td>

                              {/* 10. Product Image */}
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="relative group cursor-pointer" onClick={() => setPreviewImage(p.image)}>
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="w-12 h-12 object-cover rounded-xl shadow-xs border border-stone-200/80 group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity text-white">
                                    <Eye className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              </td>

                              {/* 2. Product Name */}
                              <td className="p-3.5 font-bold text-stone-900 max-w-[170px]">
                                <span className="block leading-tight">{p.name}</span>
                                {p.tags && p.tags.length > 0 && (
                                  <span className="text-[9px] text-stone-400 font-mono">{p.tags.join(' • ')}</span>
                                )}
                              </td>

                              {/* 4. Category */}
                              <td className="p-3.5 whitespace-nowrap">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                                  {p.category}
                                </span>
                              </td>

                              {/* 5. Description */}
                              <td className="p-3.5 text-stone-600 max-w-[200px]">
                                <p className="truncate text-[11px]" title={p.description}>
                                  {p.description}
                                </p>
                              </td>

                              {/* 6. Cost Price */}
                              <td className="p-3.5 font-mono font-semibold text-stone-700 whitespace-nowrap">
                                ${cost.toFixed(2)}
                              </td>

                              {/* 7. Selling Price */}
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="font-serif font-bold text-[#2D5A43] text-sm leading-tight">
                                  ${selling.toFixed(2)}
                                </div>
                                <div className="text-[9px] font-mono text-emerald-700">
                                  +{margin}% (${profit.toFixed(2)})
                                </div>
                              </td>

                              {/* 8. Supplier */}
                              <td className="p-3.5 text-stone-700 whitespace-nowrap text-[11px] font-medium">
                                <div className="flex items-center space-x-1">
                                  <Building2 className="w-3 h-3 text-stone-400" />
                                  <span>{p.supplier || 'Benguet Highland Bloomery'}</span>
                                </div>
                              </td>

                              {/* 9. Status */}
                              <td className="p-3.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleProductStatus(p.id)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5 transition cursor-pointer border ${
                                    p.status === 'active'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
                                  }`}
                                  title="Click to toggle status"
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      p.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
                                    }`}
                                  />
                                  <span>{p.status === 'active' ? 'Active' : 'Inactive'}</span>
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="p-3.5 pr-6 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProduct(p);
                                      setShowProductModal(true);
                                    }}
                                    className="p-1.5 text-stone-600 hover:text-[#2D5A43] hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                    title="Edit Product"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(p.id, p.name)}
                                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
          )}

          {/* ============================================================== */}
          {/* TAB 2: INVENTORY MANAGEMENT                                    */}
          {/* Tracks quantity, availability, and movement of products in stock*/}
          {/* ============================================================== */}
          {isTabInventory && (
            <div className="animate-fadeIn space-y-5">
              {/* Inventory Management Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                    <span>Quantity in Stock</span>
                    <Boxes className="w-4 h-4 text-[#2D5A43]" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="font-serif font-bold text-2xl text-stone-900">{totalStockQuantity}</span>
                    <span className="text-[10px] text-stone-500 font-mono">live stems</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                    <span>Reorder Alerts</span>
                    <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-rose-600 animate-pulse' : 'text-stone-400'}`} />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className={`font-serif font-bold text-2xl ${lowStockCount > 0 ? 'text-rose-600' : 'text-stone-900'}`}>
                      {lowStockCount}
                    </span>
                    <span className="text-[10px] text-rose-600 font-semibold font-mono">need restock</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                    <span>Total Stock In</span>
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="font-serif font-bold text-2xl text-emerald-800">+{totalStockedIn}</span>
                    <span className="text-[10px] text-stone-500 font-mono">received</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                    <span>Total Stock Out</span>
                    <ArrowDownRight className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="font-serif font-bold text-2xl text-amber-800">-{totalStockedOut}</span>
                    <span className="text-[10px] text-stone-500 font-mono">dispatched</span>
                  </div>
                </div>
              </div>

              {/* Main Inventory Management Table Card */}
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                {/* Header & Filter Controls */}
                <div className="p-5 sm:p-6 border-b border-stone-200/80 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider font-mono">
                        2. Inventory Management
                      </span>
                      <span className="text-xs text-stone-500 font-medium">
                        {filteredInventory.length} of {inventory.length} Stock Records
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-stone-900 text-xl mt-1">
                      Botanical Inventory, Movement & Availability
                    </h3>
                    <p className="text-xs text-stone-500">
                      Tracks the quantity, availability, and movement of products in stock.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search */}
                    <div className="relative w-full sm:w-60">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        placeholder="Search Inv ID, Product..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
                      />
                    </div>

                    {/* Stock Status Filter */}
                    <select
                      value={inventoryStatusFilter}
                      onChange={(e) => setInventoryStatusFilter(e.target.value as any)}
                      className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Stock Levels</option>
                      <option value="low_stock">⚠️ Needs Reorder (Low Stock)</option>
                      <option value="in_stock">✅ Adequate Stock</option>
                      <option value="out_of_stock">❌ Out of Stock</option>
                    </select>

                    {/* Live Sync / Refresh */}
                    {onRefreshInventory && (
                      <button
                        type="button"
                        onClick={() => onRefreshInventory()}
                        disabled={isLoadingInventory}
                        className="px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 flex items-center space-x-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                        title="Sync inventory with database"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-[#2D5A43] ${isLoadingInventory ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Live Sync</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 8-Field Inventory Management Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100/70 text-stone-600 uppercase text-[10px] tracking-wider font-mono">
                      <tr>
                        <th className="p-3.5 pl-6">Inventory ID</th>
                        <th className="p-3.5">Product ID & Details</th>
                        <th className="p-3.5">Quantity in Stock</th>
                        <th className="p-3.5">Reorder Level</th>
                        <th className="p-3.5">Stock In</th>
                        <th className="p-3.5">Stock Out</th>
                        <th className="p-3.5">Last Updated</th>
                        <th className="p-3.5 pr-6 text-right">Quick Stock Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {isLoadingInventory ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center text-stone-500">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <Loader2 className="w-8 h-8 animate-spin text-[#2D5A43]" />
                              <span className="text-xs font-mono">Syncing botanical inventory from database...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredInventory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 px-4 text-center">
                            <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                                <Boxes className="w-6 h-6 text-[#2D5A43]" />
                              </div>
                              <h4 className="font-serif font-bold text-stone-900 text-base">
                                {inventory.length === 0 ? 'No Botanical Inventory Records' : 'No Matching Stock Records'}
                              </h4>
                              <p className="text-xs text-stone-500 max-w-sm">
                                {inventory.length === 0
                                  ? 'Your botanical inventory is currently empty. Catalog new floral products to automatically initialize stem tracking, availability, and restock alerts.'
                                  : 'No inventory records found matching your current search or filter criteria.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredInventory.map((item) => {
                          const linkedProduct = products.find((p) => p.id === item.productId);
                          const isLowStock = item.quantityInStock <= item.reorderLevel;
                          const isOutOfStock = item.quantityInStock <= 0;

                          return (
                            <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                              {/* 1. Inventory ID */}
                              <td className="p-3.5 pl-6 font-mono font-bold whitespace-nowrap">
                                <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md">
                                  {item.id}
                                </span>
                              </td>

                              {/* 2. Product ID (Links to Product) */}
                              <td className="p-3.5">
                                <div className="flex items-center space-x-2.5 min-w-[200px]">
                                  {linkedProduct ? (
                                    <>
                                      <img
                                        src={linkedProduct.image}
                                        alt={linkedProduct.name}
                                        className="w-10 h-10 object-cover rounded-xl border border-stone-200 shadow-xs shrink-0 cursor-pointer"
                                        onClick={() => setPreviewImage(linkedProduct.image)}
                                      />
                                      <div className="min-w-0">
                                        <div className="flex items-center space-x-1.5">
                                          <span className="font-mono text-[10px] font-bold text-[#2D5A43] bg-emerald-50 px-1 rounded">
                                            {item.productId}
                                          </span>
                                          <span className="font-mono text-[10px] text-stone-400">
                                            {linkedProduct.sku}
                                          </span>
                                        </div>
                                        <span className="font-bold text-stone-900 block truncate text-xs mt-0.5">
                                          {linkedProduct.name}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <div>
                                      <span className="font-mono font-bold text-[#2D5A43]">{item.productId}</span>
                                      <span className="text-[10px] text-stone-400 block">Archived or Unlinked</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 3. Quantity in Stock */}
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs border ${
                                      isOutOfStock
                                        ? 'bg-rose-200 text-rose-900 border-rose-300'
                                        : isLowStock
                                        ? 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    }`}
                                  >
                                    {item.quantityInStock} stems
                                  </span>

                                  {isLowStock && (
                                    <span className="text-[10px] text-rose-600 font-bold flex items-center">
                                      <AlertTriangle className="w-3 h-3 mr-0.5" /> Reorder
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 4. Reorder Level */}
                              <td className="p-3.5 whitespace-nowrap font-mono text-stone-700">
                                <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-stone-200">
                                  min {item.reorderLevel}
                                </span>
                              </td>

                              {/* 5. Stock In */}
                              <td className="p-3.5 whitespace-nowrap font-mono font-bold text-emerald-700">
                                +{item.stockIn}
                              </td>

                              {/* 6. Stock Out */}
                              <td className="p-3.5 whitespace-nowrap font-mono font-bold text-amber-700">
                                -{item.stockOut}
                              </td>

                              {/* 7. Last Updated */}
                              <td className="p-3.5 whitespace-nowrap font-mono text-[10px] text-stone-500">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3 text-stone-400" />
                                  <span>{item.lastUpdated}</span>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="p-3.5 pr-6 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInventoryItem(item);
                                    setShowInventoryModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-[#2D5A43] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1 ml-auto cursor-pointer shadow-xs"
                                  title="Manage stock movements"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Movement</span>
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
          )}

          {/* ============================================================== */}
          {/* TAB: USERS (PATRON)                                            */}
          {/* ============================================================== */}
          {isTabUsers && (
            <div className="animate-fadeIn">
              <CustomerTable onUsersLoaded={(users) => setUsersCount(users.length)} />
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: ORDERS                                                    */}
          {/* ============================================================== */}
          {isTabOrders && (
            <div className="animate-fadeIn space-y-6">
              <OrderTable
                orders={orders}
                onUpdateStatus={handleUpdateOrderStatus}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
                isLoading={isLoadingOrders}
                onRefresh={onRefreshOrders}
                onDeleteOrder={onDeleteOrder}
              />
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: BEST SELLERS                                              */}
          {/* ============================================================== */}
          {isTabBestSellers && (
            <div className="animate-fadeIn space-y-6">
              <BestSellersTable
                products={products}
                setProducts={setProducts}
                orders={orders}
                onNotify={notify}
                onEditProduct={(p) => {
                  setEditingProduct(p);
                  setShowProductModal(true);
                }}
              />
            </div>
          )}

        </main>
      </div>

      {/* Product Form Modal (10 Fields) */}
      <ProductFormModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        categories={categories}
        onCreateProduct={handleCreateProduct}
        onUpdateProduct={handleUpdateProduct}
        initialProduct={editingProduct}
        existingCount={products.length}
      />

      {/* Inventory Stock Movement Modal (9 Fields) */}
      <InventoryModal
        isOpen={showInventoryModal}
        onClose={() => {
          setShowInventoryModal(false);
          setSelectedInventoryItem(null);
        }}
        inventoryItem={selectedInventoryItem}
        product={products.find((p) => p.id === selectedInventoryItem?.productId)}
        onUpdateInventory={handleUpdateInventory}
      />

      {/* Image Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Product full preview" className="w-full h-80 object-cover" />
            <div className="p-4 flex items-center justify-between bg-white">
              <span className="text-xs font-mono text-stone-500">Botanical HD Image Preview</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminManagementView;
