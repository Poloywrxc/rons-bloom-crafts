'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';

import { Product } from '@/types/product';
import { InventoryItem } from '@/types/inventory';
import { Order } from '@/types/order';
import { User } from '@/types/user';
import { CATEGORIES, INITIAL_ORDERS, INITIAL_USER } from '@/lib/constants';
import { useCart } from '@/hooks/use-cart';

import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { CartDrawer } from '@/components/customer/cart-item';
import { ProductGalleryModal } from '@/components/store/product-gallery';

import { StorefrontView } from '@/components/store/storefront-view';
import { CustomerPortalView } from '@/components/customer/customer-portal-view';
import { AdminManagementView } from '@/components/admin/admin-management-view';
import { AuthPortalView } from '@/components/auth/auth-portal-view';
import { CheckoutModal, CheckoutOrderData } from '@/components/customer/checkout-modal';
import { LoginRequiredModal } from '@/components/store/login-required-modal';
import { WelcomeModal } from '@/components/shared/welcome-modal';
import { signOutUser, getCurrentAuthUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { fetchAllOrdersAdmin, deleteOrderAction } from '@/actions/order/action';
import { fetchAllProductsAdmin } from '@/actions/product/action';
import { createCustomerOrder, fetchUserOrders } from '@/actions/customer/action';
import { fetchAllInventoryAdmin } from '@/actions/inventory/action';
import { fetchAllCategoriesAction } from '@/actions/category/action';
import { CategoryItem } from '@/types/category';

export default function App() {
  // Navigation State mirroring the Next.js routes
  const [currentRoute, setCurrentRoute] = useState<'(store)' | '(customer)' | '(admin)' | '(auth)'>('(store)');
  const [activeSubTab, setActiveSubTab] = useState<string>('home');

  // App Shared State - Live from Supabase Database (Default mock data removed)
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);

  // Welcome modal state for customer in store
  const [welcomeModal, setWelcomeModal] = useState<{
    isOpen: boolean;
    name: string;
    role?: string;
  }>({
    isOpen: false,
    name: ''
  });

  // Check for welcome modal if returning or navigating to store
  useEffect(() => {
    if (currentRoute === '(store)') {
      try {
        const stored = sessionStorage.getItem('bloom_welcome_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.role !== 'admin') {
            sessionStorage.removeItem('bloom_welcome_user');
            setWelcomeModal({
              isOpen: true,
              name: parsed.name || currentUser?.name || 'Patron',
              role: parsed.role || currentUser?.role || 'customer'
            });
          }
        }
      } catch {}
    }
  }, [currentRoute, currentUser?.name, currentUser?.role]);

  // Restore persistent login from localStorage or active Supabase session
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('bloom_crafts_user');
      if (savedUser) {
        const parsed: User = JSON.parse(savedUser);
        setCurrentUser(parsed);
        if (parsed.role === 'admin') {
          setCurrentRoute('(admin)');
          setActiveSubTab('dashboard');
        } else {
          setCurrentRoute('(store)');
          setActiveSubTab('home');
        }
      } else {
        setCurrentRoute('(store)');
        setActiveSubTab('home');
      }
    } catch (e) {
      console.error('Failed to load user session', e);
    } finally {
      setIsSessionLoaded(true);
    }

    // Verify and sync with active Supabase session
    getCurrentAuthUser().then((authUser) => {
      if (authUser) {
        setCurrentUser(authUser);
        if (authUser.role === 'admin') {
          setCurrentRoute('(admin)');
          setActiveSubTab('dashboard');
        } else if (currentRoute === '(admin)') {
          setCurrentRoute('(store)');
          setActiveSubTab('home');
        }
      }
    });
  }, []);

  // Strict role-based view enforcement:
  // Admin: ONLY (admin) suite - NO store
  // Customer / Guest: ONLY (store) and (customer) account - NO admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      if (currentRoute !== '(admin)' && currentRoute !== '(auth)') {
        setCurrentRoute('(admin)');
        setActiveSubTab('dashboard');
      }
    } else {
      if (currentRoute === '(admin)') {
        setCurrentRoute('(store)');
        setActiveSubTab('home');
      }
    }
  }, [currentUser, currentRoute]);

  // Cart & Wishlist Hook
  const {
    cart,
    setCart,
    addToCart: addCartItem,
    updateCartQty,
    clearCart,
    wishlist,
    toggleWishlist: toggleWishlistItem,
    cartSubtotal,
    cartCount
  } = useCart(currentUser);

  // UI State
  const [loginPromptProduct, setLoginPromptProduct] = useState<Product | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Blooms');
  const [priceRange, setPriceRange] = useState(150);
  const [notification, setNotification] = useState<string | null>(null);

  // Quick Notification Helper
  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // Sync tab from URL query params (e.g. ?tab=orders)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        setActiveSubTab(tab);
      }
    }
  }, []);

  // Load live orders directly from Supabase Database
  const loadOrdersFromDatabase = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      if (currentUser?.role === 'admin' || currentRoute === '(admin)') {
        const res = await fetchAllOrdersAdmin();
        if (res.success && Array.isArray(res.orders)) {
          setOrders(res.orders);
        } else if (res.error) {
          console.warn('Orders load note:', res.error);
        }
      } else if (currentUser?.id || currentUser?.email) {
        const userOrders = await fetchUserOrders(currentUser.id, currentUser.email);
        setOrders(userOrders || []);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Orders database load error:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [currentUser, currentRoute]);

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
      console.warn('Products database load error:', err);
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
      }
    } catch (err) {
      console.warn('Inventory database load error:', err);
    } finally {
      setIsLoadingInventory(false);
    }
  }, []);

  // Load live categories directly from Supabase Database
  const loadCategoriesFromDatabase = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetchAllCategoriesAction();
      if (res.success && Array.isArray(res.categories)) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.warn('Categories database load note:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Fetch orders, products, inventory, categories, and setup Realtime subscriptions
  useEffect(() => {
    loadOrdersFromDatabase();
    loadProductsFromDatabase();
    loadInventoryFromDatabase();
    loadCategoriesFromDatabase();

    let ordersChannel: any = null;
    let productsChannel: any = null;
    let orderItemsChannel: any = null;
    let categoriesChannel: any = null;

    try {
      const supabase = createClient();
      ordersChannel = supabase
        .channel('app-orders-stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            loadOrdersFromDatabase();
            loadInventoryFromDatabase();
            if (payload.eventType === 'INSERT') {
              notify('New floral order received in database! 🌸');
            }
          }
        )
        .subscribe();

      productsChannel = supabase
        .channel('app-products-stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          () => {
            loadProductsFromDatabase();
            loadInventoryFromDatabase();
            loadCategoriesFromDatabase();
          }
        )
        .subscribe();

      categoriesChannel = supabase
        .channel('app-categories-stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories' },
          () => {
            loadCategoriesFromDatabase();
          }
        )
        .subscribe();

      orderItemsChannel = supabase
        .channel('app-order-items-stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'order_items' },
          () => {
            loadInventoryFromDatabase();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription note:', err);
    }

    return () => {
      try {
        const supabase = createClient();
        if (ordersChannel) supabase.removeChannel(ordersChannel);
        if (productsChannel) supabase.removeChannel(productsChannel);
        if (categoriesChannel) supabase.removeChannel(categoriesChannel);
        if (orderItemsChannel) supabase.removeChannel(orderItemsChannel);
      } catch {}
    };
  }, [loadOrdersFromDatabase, loadProductsFromDatabase, loadInventoryFromDatabase, loadCategoriesFromDatabase, notify]);

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

  const handlePlaceOrder = async (orderData: CheckoutOrderData) => {
    if (cart.length === 0) {
      notify('Your basket is empty!');
      return;
    }

    const subtotal = orderData.subtotal ?? cartSubtotal;
    const deliveryFee = orderData.deliveryFee ?? (orderData.shippingAddress.includes('Pickup') ? 0 : 50.0);
    const total = orderData.total ?? (subtotal + deliveryFee);

    const items = cart.map((c) => ({
      productId: c.id,
      name: c.name,
      qty: c.quantity,
      price: c.price
    }));

    // Save order directly to Supabase database
    const res = await createCustomerOrder({
      userId: currentUser?.id,
      customerName: currentUser?.name || INITIAL_USER.name,
      customerEmail: currentUser?.email || INITIAL_USER.email,
      recipientName: orderData.recipientName,
      recipientPhone: orderData.recipientPhone || currentUser?.phone || 'N/A',
      shippingAddress: orderData.shippingAddress,
      deliveryDate: orderData.deliveryDate,
      cardMessage: orderData.cardMessage,
      paymentMethod: orderData.paymentMethod,
      paymentProof: orderData.uploadedReceipt || undefined,
      subtotal,
      deliveryFee,
      total,
      items
    });

    const newOrderId = res.success && res.order ? res.order.id : `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    if (res.success && res.order) {
      setOrders((prev) => [res.order!, ...prev]);
    } else {
      const fallbackOrder: Order = {
        id: newOrderId,
        date: new Date().toISOString().split('T')[0],
        customer: currentUser?.name || INITIAL_USER.name,
        email: currentUser?.email || INITIAL_USER.email,
        items: cart.map((c) => ({ name: c.name, qty: c.quantity, price: c.price })),
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
      setOrders((prev) => [fallbackOrder, ...prev]);
    }

    // Synchronize product stock and inventory
    setProducts((prev) =>
      prev.map((prod) => {
        const itemInCart = cart.find((c) => c.name.toLowerCase() === prod.name.toLowerCase());
        if (itemInCart) {
          return {
            ...prod,
            stock: Math.max(0, (prod.stock ?? 10) - itemInCart.quantity)
          };
        }
        return prod;
      })
    );

    setInventory((prev) => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      return prev.map((inv) => {
        const matchingProduct = products.find((p) => p.id === inv.productId);
        const itemInCart = matchingProduct
          ? cart.find((c) => c.name.toLowerCase() === matchingProduct.name.toLowerCase())
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
      });
    });

    // Synchronize live inventory and products directly from database
    loadInventoryFromDatabase();
    loadProductsFromDatabase();

    clearCart();
    setIsCheckoutModalOpen(false);
    setCurrentRoute('(customer)');
    setActiveSubTab('orders');
    notify(`Order ${newOrderId} placed successfully! An invoice has been emailed to you. 🌸`);
    return newOrderId;
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    await signOutUser();
    setCurrentRoute('(store)');
    setActiveSubTab('home');
    notify('Signed out successfully. 🌿');
  };

  const handleAddToCart = (product: Product, customMessage = '') => {
    if ((product.stock ?? 0) <= 0) {
      notify(`"${product.name}" is currently out of stock and not available.`);
      return;
    }
    if (!currentUser) {
      setSelectedProduct(null);
      setLoginPromptProduct(product);
      return;
    }
    addCartItem(product, customMessage);
    notify(`Added "${product.name}" to your floral tote! 🌸`);
  };

  const openAuthFromPrompt = (mode: 'login' | 'register') => {
    setLoginPromptProduct(null);
    setAuthInitialMode(mode);
    setCurrentRoute('(auth)');
  };

  const handleToggleWishlist = (productId: string) => {
    const exists = wishlist.includes(productId);
    toggleWishlistItem(productId);
    if (exists) {
      notify('Removed from Wishlist');
    } else {
      notify('Saved bouquet to Wishlist ❤️');
    }
  };

  if (!isSessionLoaded) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-xl border-2 border-stone-200/80 bg-white flex items-center justify-center p-1.5 animate-pulse">
          <Image
            src="/logo.png"
            alt="Ron's Bloom Crafts"
            width={128}
            height={128}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800 font-sans flex flex-col selection:bg-rose-100 selection:text-rose-900">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2D5A43] text-cream px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-white border border-emerald-700 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="text-sm font-medium tracking-wide">{notification}</span>
        </div>
      )}

      {/* Main Florist Navbar - hidden in admin and login */}
      {currentRoute !== '(admin)' && currentRoute !== '(auth)' && (
        <Navbar
          currentUser={currentUser}
          onNavigateHome={() => {
            setCurrentRoute('(store)');
            setActiveSubTab('home');
          }}
          onNavigateWishlist={() => {
            if (!currentUser) {
              setAuthInitialMode('login');
              setCurrentRoute('(auth)');
              notify('Please sign in to view your saved wishlist. ❤️');
            } else {
              setCurrentRoute('(customer)');
              setActiveSubTab('wishlist');
            }
          }}
          onNavigateAccount={() => {
            if (!currentUser) {
              setAuthInitialMode('login');
              setCurrentRoute('(auth)');
            } else {
              setCurrentRoute('(customer)');
              setActiveSubTab('account');
            }
          }}
          onNavigateLogin={() => {
            setAuthInitialMode('login');
            setCurrentRoute('(auth)');
          }}
          onLogout={handleLogout}
          onOpenCart={() => setIsCartOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            if (currentRoute !== '(store)') setCurrentRoute('(store)');
          }}
          wishlistCount={wishlist.length}
          cartCount={cartCount}
          userName={currentUser?.name}
          userRole={currentUser ? (currentUser.role === 'admin' ? 'Master Florist' : 'Customer') : undefined}
        />
      )}

      {/* Main Content Area Routed based on Next.js App Router Structure */}
      <main className={`flex-1 ${currentRoute !== '(admin)' ? 'pb-16' : ''}`}>
        {currentRoute === '(store)' && (
          <StorefrontView
            products={products}
            categories={categories.length > 0 ? categories : CATEGORIES}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
            onSelectProduct={setSelectedProduct}
            onOpenCheckout={() => {
              setIsCheckoutModalOpen(true);
            }}
            isLoading={isLoadingProducts || isLoadingCategories}
          />
        )}

        {currentRoute === '(customer)' && (
          <CustomerPortalView
            activeTab={activeSubTab}
            setActiveTab={setActiveSubTab}
            currentUser={currentUser || INITIAL_USER}
            orders={orders}
            setOrders={setOrders}
            products={products}
            setProducts={setProducts}
            inventory={inventory}
            setInventory={setInventory}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            cart={cart}
            cartSubtotal={cartSubtotal}
            onClearCart={clearCart}
            notify={notify}
            onLogout={handleLogout}
          />
        )}

        {currentRoute === '(admin)' && (
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
            categories={categories.length > 0 ? categories.map((c) => c.name) : CATEGORIES}
            activeTab={activeSubTab}
            setActiveTab={setActiveSubTab}
            notify={notify}
            onLogout={handleLogout}
          />
        )}

        {currentRoute === '(auth)' && (
          <AuthPortalView
            key={authInitialMode}
            initialMode={authInitialMode}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            onCancel={() => {
              if (currentUser?.role === 'admin') {
                setCurrentRoute('(admin)');
                setActiveSubTab('dashboard');
              } else {
                setCurrentRoute('(store)');
                setActiveSubTab('home');
              }
            }}
            onCompleteLogin={(role, user) => {
              const activeUser = user || currentUser;
              if (activeUser) setCurrentUser(activeUser);
              if (role === 'admin') {
                setCurrentRoute('(admin)');
                setActiveSubTab('dashboard');
                notify('Welcome back to the Atelier Suite, Master Florist Ron! 🌿');
              } else {
                setCurrentRoute('(store)');
                setActiveSubTab('home');
                setWelcomeModal({
                  isOpen: true,
                  name: activeUser?.name || 'Patron',
                  role: activeUser?.role || 'customer'
                });
                try {
                  sessionStorage.removeItem('bloom_welcome_user');
                } catch {}
              }
            }}
          />
        )}
      </main>

      {/* Shared Footer - strictly for store and customer account, no admin link */}
      {currentRoute !== '(admin)' && currentRoute !== '(auth)' && currentRoute !== '(customer)' && (
        <Footer
          onSelectCategory={(cat) => {
            setCurrentRoute('(store)');
            setSelectedCategory(cat);
          }}
          onNavigateTab={(tab) => {
            setCurrentRoute('(customer)');
            setActiveSubTab(tab);
          }}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        onUpdateQty={updateCartQty}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutModalOpen(true);
        }}
        onBrowse={() => {
          setIsCartOpen(false);
          setCurrentRoute('(store)');
        }}
      />

      {/* Quick View Product Modal */}
      <ProductGalleryModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Guest Login Prompt Modal */}
      <LoginRequiredModal
        isOpen={!!loginPromptProduct}
        productName={loginPromptProduct?.name}
        onClose={() => setLoginPromptProduct(null)}
        onLogin={() => openAuthFromPrompt('login')}
        onCreateAccount={() => openAuthFromPrompt('register')}
      />

      {/* Checkout Popup Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cart={cart}
        cartSubtotal={cartSubtotal}
        currentUser={currentUser}
        userDefaultName={currentUser?.name}
        userDefaultPhone={currentUser?.phone}
        userDefaultAddress={currentUser?.address}
        onUpdateUser={(updated) => setCurrentUser(updated)}
        onOrderPlaced={handlePlaceOrder}
      />

      {/* Welcome Popup Modal for Customer in Store */}
      <WelcomeModal
        isOpen={welcomeModal.isOpen && currentRoute === '(store)'}
        onClose={() => setWelcomeModal((prev) => ({ ...prev, isOpen: false }))}
        userName={welcomeModal.name}
        role={welcomeModal.role}
        actionLabel="Explore Store"
      />
    </div>
  );
}
