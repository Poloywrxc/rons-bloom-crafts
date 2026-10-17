# Supabase Database Architecture - Ron's Bloom Crafts

This directory contains the database definition, automated triggers, performance indexes, Row Level Security (RLS) policies, storage bucket configurations, and seed data tailored for **Ron's Bloom Crafts**.

---

## 📁 Files Overview

- **`schema.sql`**: Full schema definition with PostgreSQL extensions, custom ENUMs, 9 relational tables, indexes, triggers, RLS policies, and storage setup.
- **`seed.sql`**: Initial florist catalog matching the storefront and order management pipeline (`INITIAL_PRODUCTS`, `CATEGORIES`, `INITIAL_ORDERS`).
- **`src/types/database.types.ts`**: TypeScript definitions automatically aligned with all tables, views, and functions.

---

## 🗄️ Relational Entity-Relationship Structure

```mermaid
erDiagram
    PROFILES ||--o{ ORDERS : "places"
    PROFILES ||--o{ REVIEWS : "writes"
    PROFILES ||--o{ CART_ITEMS : "saves in bag"
    PROFILES ||--o{ WISHLIST_ITEMS : "saves to wishlist"
    PROFILES ||--o{ PAYMENT_VERIFICATIONS : "moderates"

    CATEGORIES ||--o{ PRODUCTS : "categorizes"
    PRODUCTS ||--o{ ORDER_ITEMS : "included in"
    PRODUCTS ||--o{ REVIEWS : "reviewed on"
    PRODUCTS ||--o{ CART_ITEMS : "added to"
    PRODUCTS ||--o{ WISHLIST_ITEMS : "favorited in"

    ORDERS ||--|{ ORDER_ITEMS : "contains"
    ORDERS ||--o{ PAYMENT_VERIFICATIONS : "verified by"
    ORDERS ||--o{ REVIEWS : "referenced by"

    PROFILES {
        uuid id PK "auth.users ref"
        text name
        text email
        user_role role "customer | admin"
        text address
        text phone
        text badge
        text avatar_url
    }

    CATEGORIES {
        uuid id PK
        text name
        text slug
        text description
        text image_url
        int display_order
        boolean is_active
    }

    PRODUCTS {
        uuid id PK
        uuid category_id FK
        text category_name
        text name
        text slug
        numeric price
        numeric rating
        int reviews_count
        int stock
        text image
        text description
        text freshness
        text[] tags
        boolean is_featured
        boolean is_archived
    }

    ORDERS {
        text id PK "e.g. ORD-8921"
        uuid user_id FK
        text customer_name
        text customer_email
        text recipient_name
        text recipient_phone
        text shipping_address
        date delivery_date
        text card_message
        order_status status
        payment_status payment_status
        payment_method payment_method
        text payment_proof
        numeric subtotal
        numeric delivery_fee
        numeric total
    }

    ORDER_ITEMS {
        uuid id PK
        text order_id FK
        uuid product_id FK
        text product_name
        int quantity
        numeric price
        text card_message
    }

    REVIEWS {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        text order_id FK
        text user_name
        int rating "1 to 5"
        text comment
        review_status status
    }

    CART_ITEMS {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        int quantity
        text card_message
    }

    WISHLIST_ITEMS {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
    }

    PAYMENT_VERIFICATIONS {
        uuid id PK
        text order_id FK
        uuid verified_by FK
        text action
        text notes
        timestamptz verified_at
    }
```

---

## 🔒 Security & Row Level Security (RLS)

All tables have RLS enabled with strict policy enforcement:

| Table | Public Access | Authenticated Customer | Admin / Master Florist |
| :--- | :--- | :--- | :--- |
| **`profiles`** | ❌ None | Read/Update own profile | Full access |
| **`categories`** | Read active categories | Read active categories | Full CRUD |
| **`products`** | Read unarchived products | Read unarchived products | Full CRUD |
| **`orders`** | Insert (guest checkout) | Read/Insert own orders | Read/Update all (pipeline dispatch) |
| **`order_items`**| Linked order insert | Read items of own orders | Full access |
| **`reviews`** | Read approved reviews | Submit review for products | Full moderation & CRUD |
| **`cart_items`** | ❌ None | Full CRUD on own items | Full access |
| **`wishlist_items`** | ❌ None | Full CRUD on own items | Full access |
| **`payment_verifications`** | ❌ None | ❌ None | Full CRUD |

---

## ⚙️ Automated Triggers

1. **`on_auth_user_created`**: Automatically creates a record in `public.profiles` whenever a customer or admin registers through Supabase Auth.
2. **`on_review_change`**: Automatically recalculates product `rating` and `reviews_count` whenever a review is approved, edited, or deleted.
3. **`set_*_updated_at`**: Automatically touches `updated_at` on every record modification.

---

## 🚀 How to Apply

### Option A: Supabase Dashboard
1. Open your project on [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** tab.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
4. (Optional) Paste `supabase/seed.sql` to populate sample bouquets and initial pipeline orders.

### Option B: Supabase CLI
```bash
# Link your Supabase project
supabase link --project-ref <your-project-ref>

# Push the schema
supabase db push

# Or run the schema directly
supabase db reset
```
