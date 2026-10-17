'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { CategoryItem } from '@/types/category';
import { PRODUCT_CATEGORIES } from '@/lib/constants';

/**
 * Fetch all categories directly from the Supabase database.
 * Falls back to default curated categories if the table is unreachable.
 */
export async function fetchAllCategoriesAction(): Promise<{
  success: boolean;
  categories: CategoryItem[];
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch categories from public.categories
    const { data: dbCategories, error: catError } = await adminClient
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (catError) {
      console.warn('Note fetching categories table:', catError.message);
    }

    // 2. Fetch distinct category names from live products to make sure any custom product categories are represented
    const { data: productsData } = await adminClient
      .from('products')
      .select('category_name, is_archived');

    // Count products per category
    const countMap: Record<string, number> = {};
    const seenCategories = new Set<string>();

    if (productsData && Array.isArray(productsData)) {
      productsData.forEach((p: any) => {
        if (!p.is_archived && p.category_name) {
          const trimmed = p.category_name.trim();
          countMap[trimmed] = (countMap[trimmed] || 0) + 1;
          seenCategories.add(trimmed);
        }
      });
    }

    const categoriesList: CategoryItem[] = [];

    if (dbCategories && dbCategories.length > 0) {
      dbCategories.forEach((cat: any) => {
        categoriesList.push({
          id: cat.id,
          name: cat.name,
          slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: cat.description || null,
          imageUrl: cat.image_url || null,
          displayOrder: cat.display_order ?? 0,
          isActive: cat.is_active ?? true,
          productCount: countMap[cat.name] || 0
        });
        seenCategories.delete(cat.name);
      });
    } else {
      // Fallback to PRODUCT_CATEGORIES
      PRODUCT_CATEGORIES.forEach((name, idx) => {
        categoriesList.push({
          id: `cat-${idx + 1}`,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: `Handcrafted ${name.toLowerCase()} by Ron's master florists`,
          displayOrder: idx + 1,
          isActive: true,
          productCount: countMap[name] || 0
        });
        seenCategories.delete(name);
      });
    }

    // Append any extra active categories found on products that aren't in categories table
    seenCategories.forEach((extraCat) => {
      if (extraCat && !categoriesList.some((c) => c.name.toLowerCase() === extraCat.toLowerCase())) {
        categoriesList.push({
          id: `cat-dynamic-${extraCat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: extraCat,
          slug: extraCat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: `Bespoke artisanal arrangements`,
          displayOrder: 99,
          isActive: true,
          productCount: countMap[extraCat] || 0
        });
      }
    });

    return { success: true, categories: categoriesList };
  } catch (err: any) {
    console.error('Unexpected error fetching categories from database:', err);
    // Graceful fallback
    const fallback: CategoryItem[] = PRODUCT_CATEGORIES.map((name, idx) => ({
      id: `cat-fb-${idx}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: `Bespoke ${name.toLowerCase()}`,
      displayOrder: idx,
      isActive: true,
      productCount: 0
    }));
    return { success: false, categories: fallback, error: err?.message };
  }
}

/**
 * Create a new category in Supabase database
 */
export async function createCategoryAction(category: {
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
}): Promise<{ success: boolean; category?: CategoryItem; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const slug = category.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { data, error } = await adminClient
      .from('categories')
      .insert({
        name: category.name.trim(),
        slug,
        description: category.description || null,
        image_url: category.imageUrl || null,
        display_order: category.displayOrder || 10,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      category: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        imageUrl: data.image_url,
        displayOrder: data.display_order,
        isActive: data.is_active,
        productCount: 0
      }
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create category' };
  }
}
