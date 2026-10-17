import { Product } from '@/types/product';
import { Order } from '@/types/order';
import { User } from '@/types/user';
import { InventoryItem } from '@/types/inventory';

export const PRODUCT_CATEGORIES: string[] = [
  'Mixed flowers',
  'Rose themed flowers',
  'Customized Flowers',
  'Sunflower Themed flowers',
  'Satin Artificial Flowers',
  'Fuzzy wire Artificial Flowers',
  'Dried Artificial Flowers'
];

export const CATEGORIES: string[] = [
  'All Blooms',
  ...PRODUCT_CATEGORIES
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'PRD-1001',
    name: 'Blushing Romance Peonies',
    sku: 'RBC-PEO-001',
    category: 'Mixed flowers',
    description: 'A breathtaking arrangement of Sarah Bernhardt peonies hand-tied with dusty rose satin ribbon.',
    costPrice: 34.00,
    price: 68.00,
    sellingPrice: 68.00,
    supplier: 'Benguet Highland Bloomery',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=700&q=80',
    rating: 4.9,
    reviewsCount: 34,
    stock: 12,
    freshness: 'Farm Picked Today',
    tags: ['Bestseller', 'Mixed Flowers']
  },
  {
    id: 'PRD-1002',
    name: 'Eternal Velveteen Red Roses',
    sku: 'RBC-ROS-002',
    category: 'Rose themed flowers',
    description: 'Two dozen premium Ecuadorian long-stem scarlet roses nestled in fragrant eucalyptus leaves.',
    costPrice: 42.50,
    price: 85.00,
    sellingPrice: 85.00,
    supplier: 'Ecuadorian Highland Growers',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80',
    rating: 5.0,
    reviewsCount: 52,
    stock: 8,
    freshness: 'Guaranteed 7-day Bloom',
    tags: ['Luxury', 'Rose Themed']
  },
  {
    id: 'PRD-1003',
    name: 'Wildflower Whisper Basket',
    sku: 'RBC-HMP-003',
    category: 'Mixed flowers',
    description: 'Artisan woven wicker basket bursting with chamomile, lavender, peach ranunculus, and baby’s breath.',
    costPrice: 24.00,
    price: 54.00,
    sellingPrice: 54.00,
    supplier: 'Tagaytay Meadow Co-op',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=700&q=80',
    rating: 4.8,
    reviewsCount: 29,
    stock: 15,
    freshness: 'Handcrafted Morning Harvest',
    tags: ['Cottagecore', 'Mixed Flowers']
  },
  {
    id: 'PRD-1004',
    name: 'Scarlet Elegance Satin Ribbon Roses',
    sku: 'RBC-SAT-004',
    category: 'Satin Artificial Flowers',
    description: 'Meticulously handcrafted luxury satin ribbon roses accented with faux pearls and organza wrapping that last forever.',
    costPrice: 48.00,
    price: 95.00,
    sellingPrice: 95.00,
    supplier: 'Studio Artisan Atelier',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=700&q=80',
    rating: 4.7,
    reviewsCount: 19,
    stock: 6,
    freshness: 'Handcrafted Keepsake',
    tags: ['Handmade', 'Everlasting', 'Satin']
  },
  {
    id: 'PRD-1005',
    name: 'Pastel Sunrise Fuzzy Wire Tulips',
    sku: 'RBC-TLP-005',
    category: 'Fuzzy wire Artificial Flowers',
    description: 'Whimsical handcrafted chenille fuzzy wire tulips in soft pastel hues, hand-twisted into an everlasting playful bloom.',
    costPrice: 22.00,
    price: 49.00,
    sellingPrice: 49.00,
    supplier: 'Craft & Bloom Studio',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=700&q=80',
    rating: 4.9,
    reviewsCount: 41,
    stock: 18,
    freshness: 'Handmade Chenille Blooms',
    tags: ['Handcrafted', 'Fuzzy Wire', 'Cute']
  },
  {
    id: 'PRD-1006',
    name: 'Grand Bridal Whispers Garland',
    sku: 'RBC-BRD-006',
    category: 'Customized Flowers',
    description: 'Opulent cascading arrangement of ivory hydrangeas, gardenia, silver dollar eucalyptus, and silk tassels.',
    costPrice: 65.00,
    price: 130.00,
    sellingPrice: 130.00,
    supplier: 'Baguio Master Floriculture',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=80',
    rating: 5.0,
    reviewsCount: 16,
    stock: 4,
    freshness: 'Event Grade Bespoke',
    tags: ['Bestseller', 'Customized', 'Bespoke']
  },
  {
    id: 'PRD-1007',
    name: 'Sun-Kissed Meadow Sunshine',
    sku: 'RBC-SUN-007',
    category: 'Sunflower Themed flowers',
    description: 'Bright sunflowers, craspedia globes, yellow spray roses and fragrant chamomile in a rustic jute basket.',
    costPrice: 28.00,
    price: 59.00,
    sellingPrice: 59.00,
    supplier: 'Sunny Ridge Farmstead',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=700&q=80',
    rating: 4.9,
    reviewsCount: 38,
    stock: 14,
    freshness: 'Sun-Drenched Stems',
    tags: ['Bestseller', 'Sunflower Themed', 'Cheer']
  },
  {
    id: 'PRD-1008',
    name: 'French Lavender & White Lisianthus',
    sku: 'RBC-LAV-008',
    category: 'Dried Artificial Flowers',
    description: 'Calming dried Provence lavender woven with delicate white lisianthus and seeded silver eucalyptus.',
    costPrice: 30.00,
    price: 64.00,
    sellingPrice: 64.00,
    supplier: 'Provence Alpine Imports',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=700&q=80',
    rating: 4.9,
    reviewsCount: 47,
    stock: 20,
    freshness: 'Everlasting Preserved Stems',
    tags: ['Bestseller', 'Aromatherapy', 'Dried Flowers']
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_USER: User = {
  id: 'user-101',
  name: 'Eleanor Vance',
  email: 'eleanor@bloom.crafts',
  role: 'customer',
  address: '12 Magnolia Way, Blossom Hill',
  phone: '+1 (555) 234-5678'
};
