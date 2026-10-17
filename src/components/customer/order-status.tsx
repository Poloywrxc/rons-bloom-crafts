'use client';

import React from 'react';
import { Clock, Flower2, Truck, PackageCheck, XCircle, RotateCcw, Star, Ban } from 'lucide-react';
import { Order } from '@/types/order';

interface OrderStatusCardProps {
  order: Order;
  onCancel?: (orderId: string) => void;
  onReorder?: (order: Order) => void;
  onRate?: (order: Order) => void;
}

export function OrderStatusCard({ order, onCancel, onReorder, onRate }: OrderStatusCardProps) {
  const isCancelled = order.status.toLowerCase().includes('cancel');
  const isDelivered = order.status.toLowerCase().includes('deliver');

  const statusSteps = [
    'Order Received',
    'Floral Artistry in Progress',
    'Out for Delivery',
    'Delivered'
  ];
  const currentStepIdx = statusSteps.indexOf(order.status);

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 border shadow-xs space-y-4 sm:space-y-6 transition ${
        isCancelled
          ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
          : 'bg-white border-stone-200 hover:border-emerald-200/80'
      }`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-100 pb-3 sm:pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono font-bold text-sm sm:text-base ${isCancelled ? 'text-rose-700' : 'text-[#2D5A43]'}`}>
              {order.id}
            </span>
            <span className="text-[11px] sm:text-xs text-stone-500">• Placed on {order.date}</span>
            <span
              className={`text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full ${
                isCancelled
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : isDelivered
                  ? 'bg-emerald-100 text-[#2D5A43]'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.status}
            </span>
            {order.status === 'Order Received' && (
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-[#2D5A43] text-emerald-100 border border-emerald-600 shadow-2xs animate-pulse flex items-center space-x-1">
                <span>Just Placed</span>
                <span>🌸</span>
              </span>
            )}
          </div>
          <span className="text-[11px] sm:text-xs text-stone-600 block mt-1">
            Payment Status: <strong className={isCancelled ? 'text-rose-600 font-bold' : 'text-emerald-700'}>{order.paymentStatus}</strong>
          </span>
          {isCancelled && order.refundMethod && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-rose-800 bg-white px-2.5 py-1 rounded-lg border border-rose-200/90 shadow-2xs w-fit">
              <span>💸 Refund Destination:</span>
              <strong className="text-rose-900">{order.refundMethod} {order.refundNumber ? `(${order.refundNumber})` : ''}</strong>
            </div>
          )}
        </div>
        <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 sm:border-transparent">
          <span className="text-[11px] sm:text-xs text-stone-500">Total Amount</span>
          <span className="font-serif text-lg sm:text-xl font-bold text-stone-900">${order.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Visual Status Stepper OR Cancelled Banner */}
      {isCancelled ? (
        <div className="p-3 sm:p-4 bg-rose-50/80 rounded-xl sm:rounded-2xl border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="font-bold text-rose-950">Arrangement Order Cancelled</p>
              <p className="text-rose-800 text-[11px]">
                {order.refundNumber
                  ? `Your 100% money refund of $${order.total.toFixed(2)} is being dispatched to ${order.refundMethod || 'e-wallet'} (${order.refundNumber}).`
                  : order.cardMessage || 'Payment refund processed back to your original source.'}
              </p>
            </div>
          </div>
          {onReorder && (
            <button
              type="button"
              onClick={() => onReorder(order)}
              className="w-full sm:w-auto justify-center px-3.5 py-1.5 bg-white hover:bg-rose-100/60 text-rose-800 text-xs font-semibold rounded-full border border-rose-200 transition cursor-pointer flex items-center space-x-1 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reorder</span>
            </button>
          )}
        </div>
      ) : (
        <div className="py-1 sm:py-2">
          <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center relative">
            {statusSteps.map((step, idx) => {
              const isDone = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={idx} className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition mb-1 sm:mb-1.5 ${
                      isDone ? 'bg-[#2D5A43] text-white shadow-md' : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {idx === 0 && <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    {idx === 1 && <Flower2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    {idx === 2 && <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    {idx === 3 && <PackageCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </div>
                  <span
                    className={`text-[9px] sm:text-[11px] font-semibold leading-tight ${
                      isCurrent ? 'text-[#2D5A43] font-bold' : isDone ? 'text-stone-800' : 'text-stone-400'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Details & Items */}
      <div className="bg-stone-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
        <div>
          <span className="font-bold text-stone-800 block mb-1">Arrangement Stems:</span>
          <ul className="space-y-1">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between text-stone-600">
                <span className="truncate pr-2">{item.qty}x {item.name}</span>
                <span className="font-semibold text-stone-800 shrink-0">${(item.price * item.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-stone-200 mt-2 flex justify-between text-stone-600 font-semibold">
            <span>Includes Carrier & Card</span>
            <span>${order.deliveryFee ? order.deliveryFee.toFixed(2) : '10.00'}</span>
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-stone-200 pt-3 md:pt-0 md:pl-4 space-y-1.5">
          <span className="font-bold text-stone-800 block">Recipient & Card Note:</span>
          <p className="text-stone-600 break-words">
            <strong>Delivering to:</strong> {order.recipient}
          </p>
          <p className="text-stone-600">
            <strong>Target Date:</strong> {order.deliveryDate}
          </p>
          {order.cardMessage && !isCancelled && (
            <div className="p-2 bg-white rounded-lg border border-stone-200 italic text-[11px] text-stone-700 break-words">
              💌 "{order.cardMessage}"
            </div>
          )}
        </div>
      </div>

      {/* Order Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100 text-xs">
        <span className="text-stone-500 font-mono text-[11px]">Ref: #{order.id}</span>
        <div className="flex flex-wrap items-center gap-2">
          {isDelivered && (
            <>
              {onReorder && (
                <button
                  type="button"
                  onClick={() => onReorder(order)}
                  className="flex-1 sm:flex-initial justify-center px-3.5 py-1.5 bg-[#2D5A43] hover:bg-emerald-800 text-white font-semibold rounded-full transition cursor-pointer flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Order Again</span>
                </button>
              )}
              {onRate && (
                <button
                  type="button"
                  onClick={() => onRate(order)}
                  className="flex-1 sm:flex-initial justify-center px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-full transition cursor-pointer flex items-center space-x-1"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>Review Blooms</span>
                </button>
              )}
            </>
          )}

          {!isDelivered && !isCancelled && onCancel && (
            <button
              type="button"
              onClick={() => onCancel(order.id)}
              className="w-full sm:w-auto justify-center px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-full transition cursor-pointer flex items-center space-x-1"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel Order</span>
            </button>
          )}

          {isCancelled && onReorder && (
            <button
              type="button"
              onClick={() => onReorder(order)}
              className="w-full sm:w-auto justify-center px-3.5 py-1.5 bg-[#2D5A43] hover:bg-emerald-800 text-white font-semibold rounded-full transition cursor-pointer flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reorder Arrangement</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderStatusCard;
