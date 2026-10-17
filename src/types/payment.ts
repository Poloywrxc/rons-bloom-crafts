export type PaymentMethod = 
  | 'GCash'
  | 'Maya'
  | 'GCash / E-Wallet' 
  | 'Credit / Debit Card' 
  | 'Cash on Delivery';

export interface PaymentVerification {
  orderId: string;
  customer: string;
  total: number;
  paymentProof?: string;
  paymentStatus: string;
}
