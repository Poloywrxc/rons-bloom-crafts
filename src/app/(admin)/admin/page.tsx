'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CATEGORIES } from '@/lib/constants';
import { Product } from '@/types/product';
import { InventoryItem } from '@/types/inventory';
import { Order } from '@/types/order';
import { AdminManagementView } from '@/components/admin/admin-management-view';
import { signOutUser, getCurrentAuthUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { fetchAllOrdersAdmin, deleteOrderAction } from '@/actions/order/action';
import { fetchAllProductsAdmin } from '@/actions/product/action';
import { fetchAllInventoryAdmin } from '@/actions/inventory/action';

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');

  const getInitialTab = () => {
    if (tabFromUrl) {
      if (['dashboard'].includes(tabFromUrl)) return 'dashboard';
      if (['sales', 'sales-report'].includes(tabFromUrl)) return 'sales';
      if (['products', 'products-mgmt'].includes(tabFromUrl)) return 'products';
      if (['best-sellers', 'bestsellers'].includes(tabFromUrl)) return 'best-sellers';
      if (['inventory'].includes(tabFromUrl)) return 'inventory';
      if (['orders', 'order'].includes(tabFromUrl)) return 'orders';
      if (['users', 'customers', 'patron', 'patrons'].includes(tabFromUrl)) return 'users';
    }
    return 'dashboard';
  };

  // Live products loaded from Supabase database (default hardcoded data removed)
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  // Live botanical inventory loaded from Supabase database (default hardcoded seeds removed)
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [notification, setNotification] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // Strict Admin Guard: Customers & guests cannot view admin
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('bloom_crafts_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === 'admin') {
          setIsAuthorized(true);
        } else {
          router.replace('/account');
          return;
        }
      } else {
        router.replace('/login');
        return;
      }
    } catch {
      router.replace('/login');
      return;
    }

    getCurrentAuthUser().then((authUser) => {
      if (!authUser || authUser.role !== 'admin') {
        router.replace(authUser ? '/account' : '/login');
      } else {
        setIsAuthorized(true);
      }
    });
  }, [router]);

  useEffect(() => {
    if (tabFromUrl) {
      if (['dashboard'].includes(tabFromUrl)) {
        setActiveTab('dashboard');
      } else if (['sales', 'sales-report'].includes(tabFromUrl)) {
        setActiveTab('sales');
      } else if (['products', 'products-mgmt'].includes(tabFromUrl)) {
        setActiveTab('products');
      } else if (['best-sellers', 'bestsellers'].includes(tabFromUrl)) {
        setActiveTab('best-sellers');
      } else if (['inventory'].includes(tabFromUrl)) {
        setActiveTab('inventory');
      } else if (['orders', 'order'].includes(tabFromUrl)) {
        setActiveTab('orders');
      } else if (['users', 'customers', 'patron', 'patrons'].includes(tabFromUrl)) {
        setActiveTab('users');
      }
    }
  }, [tabFromUrl]);

  // Load live orders directly from Supabase Database
  const loadOrdersFromDatabase = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetchAllOrdersAdmin();
      if (res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);
      } else if (res.error) {
        console.warn('Orders database load note:', res.error);
      }
    } catch (err) {
      console.warn('Orders fetch error:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  // Load live products directly from Supabase Database
  const loadProductsFromDatabase = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetchAllProductsAdmin();
      if (res.success && Array.isArray(res.products)) {
        setProducts(res.products);
      } else if (res.error) {
        console.warn('Products database load note:', res.error);
      }
    } catch (err) {
      console.warn('Products fetch error:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Load live inventory directly from Supabase Database
  const loadInventoryFromDatabase = useCallback(async () => {
    setIsLoadingInventory(true);
    try {
      const res = await fetchAllInventoryAdmin();
      if (res.success && Array.isArray(res.inventory)) {
        setInventory(res.inventory);
      } else if (res.error) {
        console.warn('Inventory database load note:', res.error);
      }
    } catch (err) {
      console.warn('Inventory fetch error:', err);
    } finally {
      setIsLoadingInventory(false);
    }
  }, []);

  // Fetch orders, products, inventory, and setup Realtime subscriptions once authorized
  useEffect(() => {
    if (!isAuthorized) return;

    loadOrdersFromDatabase();
    loadProductsFromDatabase();
    loadInventoryFromDatabase();

    // Supabase Realtime channels for live updates
    let ordersChannel: any = null;
    let productsChannel: any = null;
    let orderItemsChannel: any = null;

    try {
      const supabase = createClient();

      // Orders realtime
      ordersChannel = supabase
        .channel('admin-orders-stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            loadOrdersFromDatabase();
            loadInventoryFromDatabase();
            if (payload.eventType === 'INSERT') {
              notify('New floral order placed in database! 🌸');
            }
          }
        )
        .subscribe();

      // Products realtime
      productsChannel = supabase
        .channel('admin-products-stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            loadProductsFromDatabase();
            loadInventoryFromDatabase();
            if (payload.eventType === 'INSERT') {
              notify('Catalog database updated with new floral arrangement! 🌸');
            } else if (payload.eventType === 'DELETE') {
              notify('Product removed from database catalog.');
            }
          }
        )
        .subscribe();

      // Order items realtime (affects stock and stockOut)
      orderItemsChannel = supabase
        .channel('admin-order-items-stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'order_items' },
          () => {
            loadInventoryFromDatabase();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Supabase realtime subscription note:', err);
    }

    return () => {
      try {
        const supabase = createClient();
        if (ordersChannel) supabase.removeChannel(ordersChannel);
        if (productsChannel) supabase.removeChannel(productsChannel);
        if (orderItemsChannel) supabase.removeChannel(orderItemsChannel);
      } catch {}
    };
  }, [isAuthorized, loadOrdersFromDatabase, loadProductsFromDatabase, loadInventoryFromDatabase, notify]);

  // Handle order deletion from database
  const handleDeleteOrder = async (orderId: string) => {
    try {
      const res = await deleteOrderAction(orderId);
      if (res.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        notify(`Order ${orderId} was removed from database.`);
      } else {
        notify(`Failed to delete order: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      notify(`Failed to delete order: ${err?.message || 'Database error'}`);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6 text-stone-500 font-mono text-xs">
        Verifying Master Florist credentials...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2D5A43] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-sm animate-bounce border border-emerald-400/30">
          <span>{notification}</span>
        </div>
      )}

      {/* Main Admin Workspace */}
      <main className="flex-1">
        <AdminManagementView
          products={products}
          setProducts={setProducts}
          isLoadingProducts={isLoadingProducts}
          onRefreshProducts={loadProductsFromDatabase}
          inventory={inventory}
          setInventory={setInventory}
          isLoadingInventory={isLoadingInventory}
          onRefreshInventory={loadInventoryFromDatabase}
          orders={orders}
          setOrders={setOrders}
          isLoadingOrders={isLoadingOrders}
          onRefreshOrders={loadOrdersFromDatabase}
          onDeleteOrder={handleDeleteOrder}
          categories={CATEGORIES}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notify={notify}
          onLogout={async () => {
            await signOutUser();
            router.push('/login');
          }}
        />
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F2] p-8 text-stone-500 font-mono text-xs">Loading Ron's Admin Suite...</div>}>
      <AdminContent />
    </Suspense>
  );
}
