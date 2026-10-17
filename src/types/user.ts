export type UserRole = 'customer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  address: string;
  phone: string;
}

export interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole; // strictly 'customer' | 'admin'
  orderCount: number;
  totalSpent: number;
  badge?: string;
  badgeColor?: string;
  initials: string;
  favoriteBlooms: string;
  memberSince: string;
  status: 'Active' | 'Regular';
}
