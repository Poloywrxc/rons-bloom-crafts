import { Product } from './product';

export interface CategoryItem {
  id?: string;
  name: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  productCount?: number;
}

export interface OccasionItem {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  icon: string;
  keywords: string[];
  productCount?: number;
}

export const CURATED_OCCASIONS: OccasionItem[] = [
  {
    id: 'occ-all',
    name: 'All Occasions',
    slug: 'all',
    subtitle: 'All Celebrations & Milestones',
    description: 'Explore our full bespoke repertoire of handcrafted floral designs.',
    icon: 'Layers',
    keywords: []
  },
  {
    id: 'occ-romance',
    name: 'Romance & Anniversary',
    slug: 'romance',
    subtitle: 'Love letters, anniversaries & dates',
    description: 'Sensual Ecuadorian roses, velvety petals, and intimate romantic bouquets.',
    icon: 'Heart',
    keywords: ['romance', 'rose', 'love', 'anniversary', 'peony', 'velveteen']
  },
  {
    id: 'occ-birthday',
    name: 'Birthday & Joy',
    slug: 'birthday',
    subtitle: 'Festive milestones & bright smiles',
    description: 'Vibrant golden sunflowers, cheery mixed florals, and joyous meadow stems.',
    icon: 'PartyPopper',
    keywords: ['birthday', 'cheer', 'sunflower', 'sunshine', 'celebration', 'joy']
  },
  {
    id: 'occ-wedding',
    name: 'Wedding & Bridal',
    slug: 'wedding',
    subtitle: 'Ceremony cascades & bridal garlands',
    description: 'Opulent cascading hydrangeas, gardenia, bespoke garlands, and silk ribbons.',
    icon: 'Sparkles',
    keywords: ['wedding', 'bridal', 'garland', 'customized', 'bespoke', 'ceremony']
  },
  {
    id: 'occ-everlasting',
    name: 'Everlasting Keepsakes',
    slug: 'everlasting',
    subtitle: 'Satin ribbon, fuzzy wire & dried stems',
    description: 'Handmade keepsakes that never wilt, from silk satin roses to chenille wire blooms.',
    icon: 'Infinity',
    keywords: ['everlasting', 'satin', 'fuzzy wire', 'chenille', 'dried', 'keepsake']
  },
  {
    id: 'occ-sympathy',
    name: 'Sympathy & Comfort',
    slug: 'sympathy',
    subtitle: 'Gentle solace, serenity & healing',
    description: 'Aromatic French lavender, white lisianthus, and soothing preserved stems.',
    icon: 'Feather',
    keywords: ['sympathy', 'comfort', 'lavender', 'peace', 'serenity', 'dried flowers']
  },
  {
    id: 'occ-congratulations',
    name: 'Congratulations & Milestone',
    slug: 'congratulations',
    subtitle: 'Graduations, honors & achievements',
    description: 'Showstopper grand bouquets and florist choice bestsellers for proud milestones.',
    icon: 'Award',
    keywords: ['congratulations', 'milestone', 'bestseller', 'grand', 'luxury', 'honor']
  },
  {
    id: 'occ-cheer',
    name: 'Just Because & Cheer',
    slug: 'just-because',
    subtitle: 'Spontaneous smiles & warmth',
    description: 'Cottagecore wildflower baskets, playful fuzzy tulips, and sunny greetings.',
    icon: 'Sun',
    keywords: ['cheer', 'cottagecore', 'cute', 'wildflower', 'tulip', 'spontaneous']
  }
];

/**
 * Evaluates whether a product matches a given occasion slug
 */
export function doesProductMatchOccasion(product: Product, occasionSlug: string): boolean {
  if (!occasionSlug || occasionSlug === 'all') {
    return true;
  }

  const searchableText = `${product.name} ${product.description} ${product.category} ${(product.tags || []).join(' ')}`.toLowerCase();
  const categoryLower = (product.category || '').toLowerCase();
  const tagsLower = (product.tags || []).map(t => t.toLowerCase());

  switch (occasionSlug) {
    case 'romance':
      return (
        categoryLower.includes('rose') ||
        tagsLower.some(t => t.includes('rose') || t.includes('romance') || t.includes('luxury')) ||
        /romance|rose|peon|valentine|anniversary|velvet|love|darling|intimate/.test(searchableText)
      );

    case 'birthday':
      return (
        categoryLower.includes('mixed') ||
        categoryLower.includes('sunflower') ||
        tagsLower.some(t => t.includes('cheer') || t.includes('birthday') || t.includes('sunflower') || t.includes('mixed')) ||
        /birthday|cheer|party|sunflower|sunshine|celebrat|joy|bright|whisper/.test(searchableText)
      );

    case 'wedding':
      return (
        categoryLower.includes('customized') ||
        tagsLower.some(t => t.includes('bridal') || t.includes('wedding') || t.includes('bespoke') || t.includes('customized')) ||
        /bridal|wedding|garland|cascade|ceremony|bespoke|hydrangea|silk/.test(searchableText)
      );

    case 'everlasting':
      return (
        categoryLower.includes('satin') ||
        categoryLower.includes('fuzzy') ||
        categoryLower.includes('dried') ||
        tagsLower.some(t => t.includes('satin') || t.includes('fuzzy') || t.includes('wire') || t.includes('dried') || t.includes('everlasting') || t.includes('keepsake') || t.includes('handmade')) ||
        /satin|fuzzy|wire|chenille|dried|preserv|everlasting|keepsake|forever/.test(searchableText)
      );

    case 'sympathy':
      return (
        categoryLower.includes('dried') ||
        tagsLower.some(t => t.includes('aromatherapy') || t.includes('dried') || t.includes('comfort')) ||
        /lavender|calm|peace|comfort|sooth|seren|lisianthus|gentle|solace/.test(searchableText)
      );

    case 'congratulations':
      return (
        tagsLower.some(t => t.includes('bestseller') || t.includes('luxury') || t.includes('grand')) ||
        (product.price >= 60) ||
        /bestseller|grand|milestone|congrat|achieve|luxury|opulent|signature/.test(searchableText)
      );

    case 'just-because':
      return (
        tagsLower.some(t => t.includes('cottagecore') || t.includes('cute') || t.includes('cheer')) ||
        /wildflower|basket|tulip|cute|playful|pastel|meadow|smile|spontaneous/.test(searchableText)
      );

    default:
      return true;
  }
}
