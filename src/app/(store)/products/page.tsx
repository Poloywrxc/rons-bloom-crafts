'use client';

import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '@/lib/constants';
import { Product } from '@/types/product';
import { User } from '@/types/user';
import { useCart } from '@/hooks/use-cart';
import { StorefrontView } from '@/components/store/storefront-view';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { CartDrawer } from '@/components/customer/cart-item';
import { ProductGalleryModal } from '@/components/store/product-gallery';
import { CheckoutModal } from '@/components/customer/checkout-modal';
import { LoginRequiredModal } from '@/components/store/login-required-modal';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOutUser, getCurrentAuthUser } from '@/lib/supabase/auth';
import { fetchAllProductsAdmin } from '@/actions/product/action';
import { fetchAllCategoriesAction } from '@/actions/category/action';
import { createCustomerOrder } from '@/actions/customer/action';
import { CategoryItem } from '@/types/category';

export default function ProductsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All Blooms');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState(150);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [loginPromptProduct, setLoginPromptProduct] = useState<Product | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bloom_crafts_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role === 'admin') {
          router.replace('/admin');
          return;
        }
        setCurrentUser(parsed);
      }
    } catch {}

    getCurrentAuthUser().then((authUser) => {
      if (authUser) {
        if (authUser.role === 'admin') {
          router.replace('/admin');
          return;
        }
        setCurrentUser(authUser);
      }
    });
  }, [router]);

  const handleLogout = async () => {
    setCurrentUser(null);
    await signOutUser();
    router.push('/login');
  };

  useEffect(() => {
    fetchAllProductsAdmin().then((res) => {
      if (res.success && Array.isArray(res.products)) {
        setProducts(res.products);
      }
    });
    fetchAllCategoriesAction().then((res) => {
      if (res.success && Array.isArray(res.categories)) {
        setCategories(res.categories);
      }
    });
  }, []);

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

  const handleAddToCart = (p: Product) => {
    if (!currentUser) {
      setSelectedProduct(null);
      setLoginPromptProduct(p);
      return;
    }
    addToCart(p);
    notify(`Added "${p.name}" to your tote! 🌸`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2D5A43] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-sm animate-bounce">
          <span>{notification}</span>
        </div>
      )}

      <div className="bg-stone-900 text-stone-300 px-4 py-2 text-xs flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-1.5 hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Main Studio Switcher</span>
        </Link>
        <span className="font-mono text-emerald-400">/products</span>
      </div>

      <Navbar
        currentUser={currentUser}
        userName={currentUser?.name}
        userRole={currentUser?.role === 'admin' ? 'Master Florist' : 'Customer'}
        wishlistCount={wishlist.length}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigateHome={() => router.push('/')}
        onNavigateWishlist={() => router.push(currentUser ? '/account' : '/login')}
        onNavigateAccount={() => router.push(currentUser ? '/account' : '/login')}
        onNavigateLogin={() => router.push('/login')}
        onLogout={handleLogout}
      />

      <main className="flex-1">
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
          onToggleWishlist={toggleWishlist}
          wishlist={wishlist}
          onSelectProduct={setSelectedProduct}
        />
      </main>

      <Footer
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
        }}
      />

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

      <ProductGalleryModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <LoginRequiredModal
        isOpen={!!loginPromptProduct}
        productName={loginPromptProduct?.name}
        onClose={() => setLoginPromptProduct(null)}
        onLogin={() => router.push('/login')}
        onCreateAccount={() => router.push('/register')}
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
        onOrderPlaced={async (orderData) => {
          const res = await createCustomerOrder({
            userId: currentUser?.id,
            customerName: currentUser?.name || orderData.recipientName || 'Valued Patron',
            customerEmail: currentUser?.email || 'patron@ronsbloomcrafts.com',
            recipientName: orderData.recipientName,
            recipientPhone: orderData.recipientPhone || currentUser?.phone || 'N/A',
            shippingAddress: orderData.shippingAddress,
            deliveryDate: orderData.deliveryDate,
            cardMessage: orderData.cardMessage,
            paymentMethod: orderData.paymentMethod,
            paymentProof: orderData.uploadedReceipt || undefined,
            subtotal: orderData.subtotal ?? cartSubtotal,
            deliveryFee: orderData.deliveryFee ?? (orderData.shippingAddress.includes('Pickup') ? 0 : 50),
            total: orderData.total ?? ((orderData.subtotal ?? cartSubtotal) + 50),
            items: cart.map((c) => ({
              productId: c.id,
              name: c.name,
              qty: c.quantity,
              price: c.price
            }))
          });

          // Reload live catalog with dynamically updated stock
          fetchAllProductsAdmin().then((res) => {
            if (res.success && Array.isArray(res.products)) {
              setProducts(res.products);
            }
          });

          clearCart();
          setIsCheckoutModalOpen(false);
          notify('Order placed successfully! 🌸');
          router.push('/account');
          return res.success && res.order ? res.order.id : undefined;
        }}
      />
    </div>
  );
}
