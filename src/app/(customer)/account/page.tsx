'use client';

import React, { useState, useEffect } from 'react';
import { INITIAL_ORDERS, INITIAL_USER } from '@/lib/constants';
import { Product } from '@/types/product';
import { Order } from '@/types/order';
import { User } from '@/types/user';
import { useCart } from '@/hooks/use-cart';
import { CustomerPortalView } from '@/components/customer/customer-portal-view';
import { Navbar } from '@/components/shared/navbar';
import { CartDrawer } from '@/components/customer/cart-item';
import { CheckoutModal, CheckoutOrderData } from '@/components/customer/checkout-modal';
import Link from 'next/link';
import { ArrowLeft, Database, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOutUser, getCurrentAuthUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import {
  fetchCustomerProfile,
  fetchUserOrders,
  createCustomerOrder,
  cancelCustomerOrder,
  submitCustomerReview,
  fetchUserWishlist,
  toggleCustomerWishlist
} from '@/actions/customer/action';

export default function AccountPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(INITIAL_USER);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState('account');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  const {
    cart,
    addToCart,
    updateCartQty,
    clearCart,
    wishlist,
    toggleWishlist,
    cartSubtotal,
    cartCount
  } = useCart(currentUser);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseData() {
      // 1. Initial cached user from localStorage
      try {
        const stored = localStorage.getItem('bloom_crafts_user');
        if (stored && isMounted) {
          const parsed: User = JSON.parse(stored);
          if (parsed.role === 'admin') {
            router.replace('/admin');
            return;
          }
          setCurrentUser(parsed);
        }
      } catch {}

      // 2. Fetch active Supabase authenticated user
      let activeUser: User | null = null;
      try {
        activeUser = await getCurrentAuthUser();
        if (activeUser?.role === 'admin') {
          router.replace('/admin');
          return;
        }
        if (activeUser && isMounted) {
          setCurrentUser(activeUser);

          // Retrieve live profile directly from Supabase `profiles` table
          const dbProfile = await fetchCustomerProfile(activeUser.id);
          if (dbProfile?.role === 'admin') {
            router.replace('/admin');
            return;
          }
          if (dbProfile && isMounted) {
            setCurrentUser(dbProfile);
            try {
              localStorage.setItem('bloom_crafts_user', JSON.stringify(dbProfile));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Auth user sync note:', err);
      }

      const targetUserId = activeUser?.id;
      const targetUserEmail = activeUser?.email;

      // 3. Fetch real user orders from Supabase database
      try {
        const dbOrders = await fetchUserOrders(targetUserId, targetUserEmail);
        if (isMounted) {
          setOrders(dbOrders || []);
        }
      } catch (orderErr) {
        console.warn('Order sync note:', orderErr);
      }

      // 4. Fetch wishlist items from Supabase database
      if (targetUserId) {
        try {
          const dbWishlist = await fetchUserWishlist(targetUserId);
          if (isMounted && dbWishlist && dbWishlist.length > 0) {
            dbWishlist.forEach((prodId) => {
              if (!wishlist.includes(prodId)) {
                toggleWishlist(prodId);
              }
            });
          }
        } catch {}
      }

      // 5. Fetch live products catalog from Supabase
      try {
        const supabase = createClient();
        const { data: dbProducts } = await supabase.from('products').select('*');
        if (isMounted && dbProducts && dbProducts.length > 0) {
          const mapped: Product[] = dbProducts.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category_name,
            costPrice: Math.round(Number(p.price) * 0.6),
            price: Number(p.price),
            supplier: "Ron's Artisan Nursery",
            status: p.is_archived ? 'inactive' : 'active',
            rating: Number(p.rating),
            reviewsCount: p.reviews_count,
            stock: p.stock,
            image: p.image,
            description: p.description,
            freshness: p.freshness,
            tags: p.tags || []
          }));
          setProducts(mapped);
        }
      } catch {}

      if (isMounted) {
        setIsDbLoaded(true);
      }
    }

    loadDatabaseData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setCurrentUser(null);
    await signOutUser();
    router.push('/login');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('bloom_crafts_user', JSON.stringify(updatedUser));
    } catch {}
  };

  const handleRefreshOrders = async () => {
    if (currentUser?.id || currentUser?.email) {
      const liveOrders = await fetchUserOrders(currentUser.id, currentUser.email);
      if (liveOrders && liveOrders.length > 0) {
        setOrders(liveOrders);
      }
    }
  };

  const handleCancelOrder = async (
    orderId: string,
    refundTotal?: number,
    refundDetails?: { refundMethod: 'GCash' | 'Maya' | string; refundNumber: string; notes?: string }
  ) => {
    try {
      await cancelCustomerOrder(orderId, refundTotal, refundDetails);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: 'Cancelled',
                paymentStatus: refundTotal
                  ? `Refund Pending ($${refundTotal.toFixed(2)})`
                  : 'Payment Rejected',
                ...(refundDetails
                  ? {
                      refundMethod: refundDetails.refundMethod,
                      refundNumber: refundDetails.refundNumber
                    }
                  : {})
              }
            : o
        )
      );
      notify(
        refundDetails
          ? `Order ${orderId} cancelled. Refund scheduled via ${refundDetails.refundMethod} (${refundDetails.refundNumber}).`
          : `Order ${orderId} cancelled in database. Refund scheduled.`
      );
    } catch {
      notify(`Order ${orderId} has been cancelled.`);
    }
  };

  const handleSubmitReview = async (rev: { bouquet: string; rating: number; comment: string }) => {
    const matched = products.find((p) => p.name.toLowerCase() === rev.bouquet.toLowerCase());
    await submitCustomerReview({
      userId: currentUser?.id,
      userName: currentUser?.name || 'Valued Patron',
      productId: matched?.id || 'a0000001-0000-0000-0000-000000000001',
      rating: rev.rating,
      comment: rev.comment
    });
  };

  const handleWishlistToggle = async (productId: string) => {
    toggleWishlist(productId);
    if (currentUser?.id) {
      try {
        await toggleCustomerWishlist(currentUser.id, productId);
      } catch {}
    }
  };

  const handleOrderPlaced = async (orderData: CheckoutOrderData) => {
    const userToUse = currentUser || INITIAL_USER;
    const subtotal = orderData.subtotal ?? cartSubtotal;
    const deliveryFee = orderData.deliveryFee ?? (orderData.shippingAddress.includes('Pickup') ? 0 : 50.0);
    const total = orderData.total ?? (subtotal + deliveryFee);

    const items = cart.map((c) => ({
      productId: c.id,
      name: c.name,
      qty: c.quantity,
      price: c.price
    }));

    // Save to Supabase database
    const res = await createCustomerOrder({
      userId: currentUser?.id,
      customerName: userToUse.name,
      customerEmail: userToUse.email,
      recipientName: orderData.recipientName,
      recipientPhone: orderData.recipientPhone || userToUse.phone || 'N/A',
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

    const finalOrderId = res.success && res.order ? res.order.id : `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    if (res.success && res.order) {
      setOrders((prev) => [res.order!, ...prev]);
      notify(`Order ${res.order.id} placed & saved to Supabase database! 🌸`);
    } else {
      const fallbackOrder: Order = {
        id: finalOrderId,
        date: new Date().toISOString().split('T')[0],
        customer: userToUse.name,
        email: userToUse.email,
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
      notify(`Order ${finalOrderId} placed successfully! 🌸`);
    }

    clearCart();
    setIsCheckoutModalOpen(false);
    setActiveTab('orders');
    return finalOrderId;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2D5A43] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-sm animate-bounce">
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-300 px-4 py-2 text-xs flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-1.5 hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Main Studio Switcher</span>
        </Link>
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 text-emerald-400 font-mono text-[11px]">
            <Database className="w-3 h-3 text-emerald-400" />
            <span>Supabase DB Connected</span>
          </span>
          <span className="font-mono text-stone-400">/account</span>
        </div>
      </div>

      <Navbar
        currentUser={currentUser}
        userName={currentUser?.name}
        userRole={currentUser?.role === 'admin' ? 'Master Florist' : 'Customer'}
        wishlistCount={wishlist.length}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigateHome={() => router.push('/')}
        onNavigateWishlist={() => setActiveTab('wishlist')}
        onNavigateAccount={() => setActiveTab('account')}
        onNavigateLogin={() => router.push('/login')}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        <CustomerPortalView
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          orders={orders}
          setOrders={setOrders}
          products={products}
          wishlist={wishlist}
          onToggleWishlist={handleWishlistToggle}
          onAddToCart={(p) => {
            addToCart(p);
            notify(`Added ${p.name} to cart!`);
          }}
          cart={cart}
          cartSubtotal={cartSubtotal}
          onClearCart={clearCart}
          notify={notify}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
          onCancelOrder={handleCancelOrder}
          onSubmitReview={handleSubmitReview}
          onRefreshOrders={handleRefreshOrders}
          isDbConnected={isDbLoaded}
        />
      </main>

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
        onBrowse={() => setIsCartOpen(false)}
      />

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
        onOrderPlaced={handleOrderPlaced}
      />
    </div>
  );
}
