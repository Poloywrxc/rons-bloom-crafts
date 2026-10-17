'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { Product, ProductStatus } from '@/types/product';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

function parseTagsMetadata(tags: string[] = []): {
  costPrice?: number;
  supplier?: string;
  sku?: string;
  cleanTags: string[];
} {
  let costPrice: number | undefined;
  let supplier: string | undefined;
  let sku: string | undefined;
  const cleanTags: string[] = [];

  for (const tag of tags) {
    if (tag.startsWith('cost:')) {
      const val = parseFloat(tag.slice(5));
      if (!isNaN(val)) costPrice = val;
    } else if (tag.startsWith('supplier:')) {
      supplier = tag.slice(9);
    } else if (tag.startsWith('sku:')) {
      sku = tag.slice(4);
    } else {
      cleanTags.push(tag);
    }
  }

  return { costPrice, supplier, sku, cleanTags };
}

function buildTagsArray(
  baseTags: string[] = [],
  meta: {
    costPrice?: number;
    supplier?: string;
    sku?: string;
    reorderLevel?: number;
    stockIn?: number;
    stockOut?: number;
  }
): string[] {
  const result: string[] = [];
  if (meta.costPrice !== undefined) {
    result.push(`cost:${meta.costPrice.toFixed(2)}`);
  }
  if (meta.supplier) {
    result.push(`supplier:${meta.supplier}`);
  }
  if (meta.sku) {
    result.push(`sku:${meta.sku}`);
  }
  if (meta.reorderLevel !== undefined) {
    result.push(`reorder:${meta.reorderLevel}`);
  }
  if (meta.stockIn !== undefined) {
    result.push(`stock_in:${meta.stockIn}`);
  }
  if (meta.stockOut !== undefined) {
    result.push(`stock_out:${meta.stockOut}`);
  }
  for (const tag of baseTags) {
    if (
      !tag.startsWith('cost:') &&
      !tag.startsWith('supplier:') &&
      !tag.startsWith('sku:') &&
      !tag.startsWith('reorder:') &&
      !tag.startsWith('stock_in:') &&
      !tag.startsWith('stock_out:')
    ) {
      result.push(tag);
    }
  }
  return result;
}

/**
 * Fetch all products from Supabase database for Admin Product Management
 */
export async function fetchAllProductsAdmin(): Promise<{
  success: boolean;
  products: Product[];
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();
    const [{ data, error }, { data: orderItems }] = await Promise.all([
      adminClient.from('products').select('*').order('created_at', { ascending: false }),
      adminClient.from('order_items').select('product_id, product_name, quantity')
    ]);

    if (error) {
      console.error('Error fetching admin products from database:', error);
      return { success: false, products: [], error: error.message };
    }

    // Build product sold quantities map from database order_items (exact 1-to-1 matching)
    const salesMap = new Map<string, number>();
    if (orderItems && Array.isArray(orderItems)) {
      for (const item of orderItems) {
        const qty = Number(item.quantity) || 1;
        let matchedId = '';
        if (item.product_id && (data || []).some((p: any) => p.id === item.product_id)) {
          matchedId = item.product_id;
        } else if (item.product_name) {
          const found = (data || []).find(
            (p: any) => p.name && p.name.toLowerCase().trim() === item.product_name.toLowerCase().trim()
          );
          if (found) matchedId = found.id;
        }

        if (matchedId) {
          salesMap.set(matchedId, (salesMap.get(matchedId) || 0) + qty);
        }
      }
    }

    const products: Product[] = (data || []).map((p: any) => {
      const rawTags = Array.isArray(p.tags) ? p.tags : [];
      const { costPrice, supplier, sku, cleanTags } = parseTagsMetadata(rawTags);

      const price = Number(p.price) || 0;
      const derivedCost = costPrice !== undefined ? costPrice : Math.round(price * 0.6);
      const derivedSupplier = supplier || 'Benguet Highland Bloomery';
      const derivedSku = sku || (p.slug ? `RBC-${p.slug.toUpperCase()}` : (p.id.length > 8 ? `PRD-${p.id.slice(0, 4).toUpperCase()}` : p.id));

      const hasBestsellerTag = cleanTags.some((t) => t.toLowerCase().includes('bestseller'));
      const isFeatured = Boolean(p.is_featured || hasBestsellerTag);

      if (isFeatured && !hasBestsellerTag) {
        cleanTags.push('Bestseller');
      }

      const quantitySold = salesMap.get(p.id) || 0;

      return {
        id: p.id,
        name: p.name,
        sku: derivedSku,
        category: p.category_name,
        description: p.description || '',
        costPrice: derivedCost,
        price: price,
        sellingPrice: price,
        supplier: derivedSupplier,
        status: (p.is_archived ? 'inactive' : 'active') as ProductStatus,
        image: p.image,
        rating: Number(p.rating ?? 5.0),
        reviewsCount: Number(p.reviews_count ?? 0),
        stock: Number(p.stock ?? 0),
        freshness: p.freshness || 'Farm Picked Today',
        tags: cleanTags,
        isFeatured: isFeatured,
        quantitySold: quantitySold,
        soldCount: quantitySold
      };
    });

    return { success: true, products };
  } catch (err: any) {
    console.error('Unexpected error in fetchAllProductsAdmin:', err);
    return { success: false, products: [], error: err?.message || 'Failed to fetch products from database' };
  }
}

/**
 * Create a new product in the database based on schema.sql
 */
export async function createProductAction(
  product: Product,
  initialStock = 10,
  reorderLevel = 5
): Promise<{ success: boolean; product?: Product; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // Check if category_id exists in public.categories
    let categoryId: string | null = null;
    try {
      const { data: cat } = await adminClient
        .from('categories')
        .select('id')
        .ilike('name', product.category)
        .maybeSingle();
      if (cat?.id) categoryId = cat.id;
    } catch {}

    const generatedSlug = (product.name || 'bouquet')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

    const isUuid = isValidUuid(product.id);
    const dbId = isUuid ? product.id : crypto.randomUUID();
    const sku = product.sku || (product.id && !isUuid ? product.id : `PRD-${Date.now().toString().slice(-4)}`);

    const cost = product.costPrice !== undefined ? product.costPrice : Math.round(Number(product.price) * 0.6);
    const supplier = product.supplier || 'Benguet Highland Bloomery';
    const finalTags = buildTagsArray(product.tags, {
      costPrice: cost,
      supplier,
      sku,
      reorderLevel,
      stockIn: initialStock
    });

    const isFeatured = product.isFeatured !== undefined
      ? Boolean(product.isFeatured)
      : (product.tags?.some(t => t.toLowerCase().includes('bestseller')) ?? false);

    const insertPayload: any = {
      id: dbId,
      category_id: categoryId,
      category_name: product.category,
      name: product.name,
      slug: generatedSlug,
      price: Number(product.sellingPrice || product.price),
      rating: product.rating ?? 5.0,
      reviews_count: product.reviewsCount ?? 0,
      stock: initialStock,
      image: product.image,
      description: product.description || 'Artisanal handcrafted floral arrangement.',
      freshness: product.freshness || 'Farm Picked Today',
      tags: finalTags,
      is_featured: isFeatured,
      is_archived: product.status === 'inactive'
    };

    const { data, error } = await adminClient
      .from('products')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating product in database:', error);
      return { success: false, error: error.message };
    }

    const createdProduct: Product = {
      id: data.id,
      name: data.name,
      sku,
      category: data.category_name,
      description: data.description,
      costPrice: cost,
      price: Number(data.price),
      sellingPrice: Number(data.price),
      supplier,
      status: (data.is_archived ? 'inactive' : 'active') as ProductStatus,
      image: data.image,
      rating: Number(data.rating),
      reviewsCount: Number(data.reviews_count),
      stock: Number(data.stock),
      freshness: data.freshness,
      tags: product.tags || [],
      isFeatured: isFeatured
    };

    revalidatePath('/admin');
    revalidatePath('/products');
    return { success: true, product: createdProduct };
  } catch (err: any) {
    console.error('Unexpected error in createProductAction:', err);
    return { success: false, error: err?.message || 'Failed to create product in database' };
  }
}

/**
 * Update an existing product in the database
 */
export async function updateProductAction(
  product: Product
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    let categoryId: string | null = null;
    try {
      const { data: cat } = await adminClient
        .from('categories')
        .select('id')
        .ilike('name', product.category)
        .maybeSingle();
      if (cat?.id) categoryId = cat.id;
    } catch {}

    const cost = product.costPrice !== undefined ? product.costPrice : Math.round(Number(product.price) * 0.6);
    const supplier = product.supplier || 'Benguet Highland Bloomery';
    const sku = product.sku || (product.id.length > 8 ? `PRD-${product.id.slice(0, 4).toUpperCase()}` : product.id);
    const finalTags = buildTagsArray(product.tags, { costPrice: cost, supplier, sku });

    const isFeatured = product.isFeatured !== undefined
      ? Boolean(product.isFeatured)
      : (product.tags?.some(t => t.toLowerCase().includes('bestseller')) ?? false);

    const updatePayload: any = {
      category_id: categoryId,
      category_name: product.category,
      name: product.name,
      price: Number(product.sellingPrice || product.price),
      stock: Number(product.stock ?? 0),
      image: product.image,
      description: product.description,
      freshness: product.freshness || 'Farm Picked Today',
      tags: finalTags,
      is_featured: isFeatured,
      is_archived: product.status === 'inactive',
      updated_at: new Date().toISOString()
    };

    let targetId = product.id;
    if (!isValidUuid(product.id)) {
      const { data: found } = await adminClient
        .from('products')
        .select('id')
        .contains('tags', [`sku:${product.id}`])
        .maybeSingle();
      if (found?.id) {
        targetId = found.id;
      } else {
        return { success: false, error: 'Product not found in database' };
      }
    }

    const { error } = await adminClient
      .from('products')
      .update(updatePayload)
      .eq('id', targetId);

    if (error) {
      console.error('Error updating product in database:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in updateProductAction:', err);
    return { success: false, error: err?.message || 'Failed to update product in database' };
  }
}

/**
 * Toggle product active / inactive (archived) status in the database
 */
export async function toggleProductStatusAction(
  productId: string,
  newStatus: ProductStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    let targetId = productId;
    if (!isValidUuid(productId)) {
      const { data: found } = await adminClient
        .from('products')
        .select('id')
        .contains('tags', [`sku:${productId}`])
        .maybeSingle();
      if (found?.id) {
        targetId = found.id;
      } else {
        return { success: true };
      }
    }

    const { error } = await adminClient
      .from('products')
      .update({
        is_archived: newStatus === 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', targetId);

    if (error) {
      console.error('Error toggling product status in database:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in toggleProductStatusAction:', err);
    return { success: false, error: err?.message || 'Failed to update product status' };
  }
}

/**
 * Toggle product bestseller / featured status in the database
 */
export async function toggleProductBestsellerAction(
  productId: string,
  isFeatured: boolean
): Promise<{ success: boolean; tags?: string[]; isFeatured?: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    let targetId = productId;
    if (!isValidUuid(productId)) {
      const { data: found } = await adminClient
        .from('products')
        .select('id, tags')
        .contains('tags', [`sku:${productId}`])
        .maybeSingle();
      if (found?.id) {
        targetId = found.id;
      } else {
        return { success: false, error: 'Product not found in database' };
      }
    }

    const { data: currentProd, error: fetchErr } = await adminClient
      .from('products')
      .select('tags, is_featured')
      .eq('id', targetId)
      .single();

    if (fetchErr) {
      console.error('Error fetching product for bestseller toggle:', fetchErr);
      return { success: false, error: fetchErr.message };
    }

    const currentTags: string[] = Array.isArray(currentProd?.tags) ? currentProd.tags : [];
    let updatedTags: string[];
    if (isFeatured) {
      if (!currentTags.some(t => t.toLowerCase() === 'bestseller')) {
        updatedTags = [...currentTags, 'Bestseller'];
      } else {
        updatedTags = currentTags;
      }
    } else {
      updatedTags = currentTags.filter(t => t.toLowerCase() !== 'bestseller');
    }

    const { error } = await adminClient
      .from('products')
      .update({
        is_featured: isFeatured,
        tags: updatedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetId);

    if (error) {
      console.error('Error toggling bestseller in database:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/products');
    revalidatePath('/');
    return { success: true, tags: updatedTags, isFeatured };
  } catch (err: any) {
    console.error('Unexpected error in toggleProductBestsellerAction:', err);
    return { success: false, error: err?.message || 'Failed to toggle bestseller status' };
  }
}

/**
 * Delete a product from the database
 */
export async function deleteProductAction(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    let targetId = productId;
    if (!isValidUuid(productId)) {
      const { data: found } = await adminClient
        .from('products')
        .select('id')
        .contains('tags', [`sku:${productId}`])
        .maybeSingle();
      if (found?.id) {
        targetId = found.id;
      } else {
        // Product was only a mock/client ID, no record to delete in db
        return { success: true };
      }
    }

    // Clean up dependent cart, review, and wishlist references if any
    try {
      await adminClient.from('cart_items').delete().eq('product_id', targetId);
      await adminClient.from('wishlist_items').delete().eq('product_id', targetId);
      await adminClient.from('reviews').delete().eq('product_id', targetId);
    } catch (cleanupErr) {
      console.warn('Dependent items cleanup note:', cleanupErr);
    }

    const { error } = await adminClient
      .from('products')
      .delete()
      .eq('id', targetId);

    if (error) {
      console.error('Error deleting product from database:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in deleteProductAction:', err);
    return { success: false, error: err?.message || 'Failed to delete product from database' };
  }
}

