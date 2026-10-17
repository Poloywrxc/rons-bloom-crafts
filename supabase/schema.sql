-- ==============================================================================
-- Ron's Bloom Crafts - Supabase Database Schema
-- Master Florist E-Commerce & Workshop Pipeline Management
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'Order Received', 
        'Floral Artistry in Progress', 
        'Out for Delivery', 
        'Delivered',
        'Cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'Pending COD', 
        'Proof Uploaded (Pending Admin)', 
        'Verified & Cleared', 
        'Payment Rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM (
        'GCash / E-Wallet', 
        'Credit / Debit Card', 
        'Cash on Delivery'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'customer',
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    badge TEXT DEFAULT 'Bloom Patron',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. PRODUCTS TABLE (Florist Catalog & Stem Inventory)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    rating NUMERIC(2, 1) NOT NULL DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5.0),
    reviews_count INT NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    freshness TEXT NOT NULL DEFAULT 'Farm Picked Today',
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT ('ORD-' || floor(random() * (9999 - 1000 + 1) + 1000)::text),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    delivery_date DATE NOT NULL,
    card_message TEXT,
    status order_status NOT NULL DEFAULT 'Order Received',
    payment_status payment_status NOT NULL DEFAULT 'Proof Uploaded (Pending Admin)',
    payment_method payment_method NOT NULL DEFAULT 'GCash / E-Wallet',
    payment_proof TEXT,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 10.00 CHECK (delivery_fee >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. ORDER ITEMS TABLE (Snapshot of ordered stems)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    card_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. REVIEWS TABLE (Freshness & Experience Feedback)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    status review_status NOT NULL DEFAULT 'approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. CART ITEMS TABLE (Persistent Floral Tote)
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    card_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, product_id)
);

-- 10. WISHLIST TABLE (Saved Stems & Arrangements)
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, product_id)
);

-- 11. PAYMENT VERIFICATION AUDIT LOG
CREATE TABLE IF NOT EXISTS public.payment_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'approved', 'rejected'
    notes TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. INVENTORY MOVEMENTS AUDIT LOG (Dynamic Order Stock In / Stock Out Tracker)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL, -- 'order_placed', 'order_cancelled', 'manual_stock_in', 'manual_stock_out', 'stock_adjustment'
    quantity INT NOT NULL, -- Negative for stock out (customer orders), positive for restock / cancellation return
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_category_name ON public.products(category_name);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_id ON public.inventory_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at);

-- ==============================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- 1. Automatic updated_at timestamp function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_reviews_updated_at ON public.reviews;
CREATE TRIGGER set_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER set_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Auto-sync user profile on Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role, phone, address)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer'::public.user_role),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'address', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Automatic product rating and review count recalculation
CREATE OR REPLACE FUNCTION public.recalculate_product_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_product_id UUID;
    avg_score NUMERIC(2, 1);
    total_reviews INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_product_id := OLD.product_id;
    ELSE
        target_product_id := NEW.product_id;
    END IF;

    SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0), COUNT(*)
    INTO avg_score, total_reviews
    FROM public.reviews
    WHERE product_id = target_product_id AND status = 'approved';

    UPDATE public.products
    SET rating = avg_score,
        reviews_count = total_reviews
    WHERE id = target_product_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.recalculate_product_rating();

-- 4. Helper function: Check if current auth user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Profiles:
-- Anyone authenticated can read their own profile; admins can read all profiles.
CREATE POLICY "Users can view own profile or admin can view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile or admin can update all"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Categories:
-- Anyone can view active categories; only admins can insert/update/delete.
CREATE POLICY "Public read active categories"
    ON public.categories FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins manage categories"
    ON public.categories FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Products:
-- Anyone can view unarchived products; only admins can insert/update/delete.
CREATE POLICY "Public read visible products"
    ON public.products FOR SELECT
    USING (is_archived = false OR public.is_admin());

CREATE POLICY "Admins manage products"
    ON public.products FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Orders:
-- Customers can view their own orders; Admins can view all orders.
CREATE POLICY "Users view own orders or admin view all"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Customers or guests can insert orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR public.is_admin());

CREATE POLICY "Admins can update orders"
    ON public.orders FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Order Items:
-- Accessible if user owns the parent order or is admin
CREATE POLICY "View order items if parent order is accessible"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Insert order items on checkout"
    ON public.order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR orders.user_id IS NULL OR public.is_admin())
        )
    );

-- Reviews:
-- Anyone can read approved reviews.
CREATE POLICY "Public read approved reviews"
    ON public.reviews FOR SELECT
    USING (status = 'approved' OR auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Authenticated users can submit reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can moderate reviews"
    ON public.reviews FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Cart Items:
-- Users manage their own cart items
CREATE POLICY "Users manage own cart"
    ON public.cart_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Wishlist Items:
-- Users manage their own wishlist
CREATE POLICY "Users manage own wishlist"
    ON public.wishlist_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Payment Verifications:
-- Admins only
CREATE POLICY "Admins manage payment verifications"
    ON public.payment_verifications FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Inventory Movements:
-- Admins manage all movements; read-only for authenticated audit
CREATE POLICY "Admins manage inventory movements"
    ON public.inventory_movements FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Allow service and admin read inventory movements"
    ON public.inventory_movements FOR SELECT
    USING (public.is_admin());

-- ==============================================================================
-- STORAGE BUCKETS CONFIGURATION (Product imagery & Payment slips)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('product-images', 'product-images', true),
    ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS:
-- Product images: public read, admin upload/update/delete
CREATE POLICY "Public can view product images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins can update and delete product images"
    ON storage.objects FOR ALL
    USING (bucket_id = 'product-images' AND public.is_admin());

-- Payment proofs:
-- Authenticated users can upload receipt proofs; Admins and uploading user can view
CREATE POLICY "Users and admins can view payment receipts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'payment-proofs' 
        AND (auth.uid() = owner OR public.is_admin())
    );

CREATE POLICY "Users can upload their own payment receipts"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'payment-proofs');
