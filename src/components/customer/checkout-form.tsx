'use client';

import React, { useState } from 'react';
import { User, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { CartItem } from '@/hooks/use-cart';
import { PaymentUpload } from './payment-upload';
import { OrderTransitionLoader, TransitionStage } from './order-transition-loader';

interface CheckoutFormProps {
  cart: CartItem[];
  cartSubtotal: number;
  userDefaultName?: string;
  onOrderPlaced: (orderData: {
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    deliveryDate: string;
    cardMessage: string;
    paymentMethod: string;
    uploadedReceipt: string | null;
  }) => Promise<any> | void;
}

export function CheckoutForm({
  cart,
  cartSubtotal,
  userDefaultName = 'Sophia Vance',
  onOrderPlaced
}: CheckoutFormProps) {
  const [recipientName, setRecipientName] = useState(userDefaultName);
  const [recipientPhone, setRecipientPhone] = useState('+1 (555) 987-6543');
  const [shippingAddress, setShippingAddress] = useState('74 Rosewood Blvd, Hillcrest');
  const [deliveryDate, setDeliveryDate] = useState('2026-04-02');
  const [cardMessage, setCardMessage] = useState('Happy Birthday! May your day blossom with joy.');
  const [paymentMethod, setPaymentMethod] = useState('GCash / E-Wallet');
  const [uploadedReceipt, setUploadedReceipt] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStage, setTransitionStage] = useState<TransitionStage>('verifying');
  const [transitionOrderId, setTransitionOrderId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOrder(true);
    setIsTransitioning(true);
    setTransitionStage('verifying');
    setTransitionOrderId(null);

    try {
      await new Promise((r) => setTimeout(r, 650));
      setTransitionStage('securing');

      const res = await Promise.resolve(
        onOrderPlaced({
          recipientName,
          recipientPhone,
          shippingAddress,
          deliveryDate,
          cardMessage,
          paymentMethod,
          uploadedReceipt
        })
      );

      const resolvedOrderId =
        typeof res === 'string' ? res : res?.id || res?.order?.id || null;
      if (resolvedOrderId) {
        setTransitionOrderId(resolvedOrderId);
      }

      await new Promise((r) => setTimeout(r, 700));
      setTransitionStage('confirmed');

      await new Promise((r) => setTimeout(r, 950));
      setTransitionStage('navigating');

      await new Promise((r) => setTimeout(r, 450));
      setIsSubmittingOrder(false);
      setIsTransitioning(false);
      setUploadedReceipt(null);
    } catch (err) {
      console.error('Checkout form submit error:', err);
      setIsSubmittingOrder(false);
      setIsTransitioning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Checkout Form */}
      <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
        <div>
          <h3 className="font-serif text-2xl font-bold text-stone-900">Complete Floral Order</h3>
          <p className="text-xs text-stone-500">Provide recipient details and choose safe payment method</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Recipient Information */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D5A43] mb-3 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5" />
              <span>1. Recipient Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-stone-600 mb-1 font-medium">Recipient Name</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1 font-medium">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-stone-600 mb-1 font-medium">Exact Drop-off Street Address</label>
                <input
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Schedule & Greeting Card */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D5A43] mb-3 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>2. Delivery Schedule & Greeting Note</span>
            </h4>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-600 mb-1 font-medium">Desired Delivery Date</label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43] text-stone-800"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1 font-medium">
                  Personalized Florist Card Note (Free calligraphy)
                </label>
                <textarea
                  rows={3}
                  value={cardMessage}
                  onChange={(e) => setCardMessage(e.target.value)}
                  placeholder="Write sweet words to accompany your blooms..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43] text-stone-800"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Payment Method & Proof Upload */}
          <PaymentUpload
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            uploadedReceipt={uploadedReceipt}
            onUploadReceipt={(name) => setUploadedReceipt(name)}
            onClearReceipt={() => setUploadedReceipt(null)}
          />

          <button
            type="submit"
            disabled={isSubmittingOrder || cart.length === 0}
            className="w-full py-3.5 bg-[#2D5A43] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            {isSubmittingOrder ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing with Ron's Floral Workshop...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm Order & Reserve Fresh Stems</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Cart Summary Card */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs h-fit space-y-4">
        <h4 className="font-serif font-bold text-stone-900 text-base border-b border-stone-100 pb-2">
          Order Items ({cart.length})
        </h4>
        {cart.length === 0 ? (
          <p className="text-xs text-stone-600">No stems in your bag.</p>
        ) : (
          <div className="space-y-3">
            {cart.map(c => (
              <div key={c.id} className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-medium text-stone-800">{c.quantity}x {c.name}</span>
                  <span className="text-[10px] text-stone-600 block">${c.price.toFixed(2)} each</span>
                </div>
                <span className="font-bold text-stone-900">${(c.price * c.quantity).toFixed(2)}</span>
              </div>
            ))}

            <div className="pt-3 border-t border-stone-200 space-y-1 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Same-day Van Delivery</span>
                <span>$10.00</span>
              </div>
              <div className="flex justify-between text-base font-serif font-bold text-[#2D5A43] pt-2 border-t border-stone-200">
                <span>Total Due</span>
                <span>${(cartSubtotal + 10.00).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FULL-SCREEN FLORAL TRANSITION LOADER FROM CHECKOUT TO ORDER */}
      <OrderTransitionLoader
        isOpen={isTransitioning}
        stage={transitionStage}
        orderId={transitionOrderId}
        recipientName={recipientName}
        itemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        totalAmount={cartSubtotal + 10.0}
        paymentMethod={paymentMethod}
      />
    </div>
  );
}

export default CheckoutForm;
