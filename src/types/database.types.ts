export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'customer' | 'admin';

export type OrderStatus =
  | 'Order Received'
  | 'Floral Artistry in Progress'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus =
  | 'Pending COD'
  | 'Proof Uploaded (Pending Admin)'
  | 'Verified & Cleared'
  | 'Payment Rejected';

export type PaymentMethod =
  | 'GCash'
  | 'Maya'
  | 'GCash / E-Wallet'
  | 'Credit / Debit Card'
  | 'Cash on Delivery';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          address: string;
          phone: string;
          badge: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: UserRole;
          address?: string;
          phone?: string;
          badge?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: UserRole;
          address?: string;
          phone?: string;
          badge?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          category_name: string;
          name: string;
          slug: string | null;
          price: number;
          rating: number;
          reviews_count: number;
          stock: number;
          image: string;
          description: string;
          freshness: string;
          tags: string[];
          is_featured: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          category_name: string;
          name: string;
          slug?: string | null;
          price: number;
          rating?: number;
          reviews_count?: number;
          stock?: number;
          image: string;
          description: string;
          freshness?: string;
          tags?: string[];
          is_featured?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          category_name?: string;
          name?: string;
          slug?: string | null;
          price?: number;
          rating?: number;
          reviews_count?: number;
          stock?: number;
          image?: string;
          description?: string;
          freshness?: string;
          tags?: string[];
          is_featured?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          customer_name: string;
          customer_email: string;
          recipient_name: string;
          recipient_phone: string;
          shipping_address: string;
          delivery_date: string;
          card_message: string | null;
          status: OrderStatus;
          payment_status: PaymentStatus;
          payment_method: PaymentMethod;
          payment_proof: string | null;
          subtotal: number;
          delivery_fee: number;
          total: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          customer_name: string;
          customer_email: string;
          recipient_name: string;
          recipient_phone: string;
          shipping_address: string;
          delivery_date: string;
          card_message?: string | null;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod;
          payment_proof?: string | null;
          subtotal: number;
          delivery_fee?: number;
          total: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          customer_name?: string;
          customer_email?: string;
          recipient_name?: string;
          recipient_phone?: string;
          shipping_address?: string;
          delivery_date?: string;
          card_message?: string | null;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod;
          payment_proof?: string | null;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          price: number;
          card_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          price: number;
          card_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          price?: number;
          card_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string | null;
          product_id: string;
          order_id: string | null;
          user_name: string;
          rating: number;
          comment: string;
          status: ReviewStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          product_id: string;
          order_id?: string | null;
          user_name: string;
          rating: number;
          comment: string;
          status?: ReviewStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          product_id?: string;
          order_id?: string | null;
          user_name?: string;
          rating?: number;
          comment?: string;
          status?: ReviewStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          card_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          quantity?: number;
          card_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          quantity?: number;
          card_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cart_items_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cart_items_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      wishlist_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wishlist_items_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wishlist_items_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      payment_verifications: {
        Row: {
          id: string;
          order_id: string;
          verified_by: string | null;
          action: string;
          notes: string | null;
          verified_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          verified_by?: string | null;
          action: string;
          notes?: string | null;
          verified_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          verified_by?: string | null;
          action?: string;
          notes?: string | null;
          verified_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_verifications_order_id_fkey';
            columns: ['order_id'];
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_verifications_verified_by_fkey';
            columns: ['verified_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      inventory_movements: {
        Row: {
          id: string;
          product_id: string;
          order_id: string | null;
          movement_type: string;
          quantity: number;
          previous_stock: number;
          new_stock: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          order_id?: string | null;
          movement_type: string;
          quantity: number;
          previous_stock: number;
          new_stock: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          order_id?: string | null;
          movement_type?: string;
          quantity?: number;
          previous_stock?: number;
          new_stock?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'inventory_movements_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inventory_movements_order_id_fkey';
            columns: ['order_id'];
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      review_status: ReviewStatus;
    };
  };
}
