export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export type OrderStatus = 
  | 'Order Received' 
  | 'Floral Artistry in Progress' 
  | 'Out for Delivery' 
  | 'Delivered'
  | 'Cancelled';

export interface Order {
  id: string;
  date: string;
  customer: string;
  email: string;
  items: OrderItem[];
  total: number;
  deliveryFee: number;
  status: OrderStatus | string;
  paymentStatus: string;
  paymentProof?: string;
  deliveryDate: string;
  recipient: string;
  cardMessage?: string;
  notes?: string;
  refundMethod?: 'GCash' | 'Maya' | string;
  refundNumber?: string;
}
