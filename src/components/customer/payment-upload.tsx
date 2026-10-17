'use client';

import React from 'react';
import { DollarSign, UploadCloud } from 'lucide-react';

interface PaymentUploadProps {
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  uploadedReceipt: string | null;
  onUploadReceipt: (filename: string) => void;
  onClearReceipt?: () => void;
}

export function PaymentUpload({
  paymentMethod,
  setPaymentMethod,
  uploadedReceipt,
  onUploadReceipt,
  onClearReceipt
}: PaymentUploadProps) {
  const methods = ['GCash / E-Wallet', 'Credit / Debit Card', 'Cash on Delivery'];
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onClearReceipt) {
      onClearReceipt();
    }
  };

  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D5A43] mb-3 flex items-center space-x-1.5">
        <DollarSign className="w-3.5 h-3.5" />
        <span>3. Payment Method</span>
      </h4>
      <div className="grid grid-cols-3 gap-3 text-xs mb-4">
        {methods.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setPaymentMethod(m)}
            className={`p-3 rounded-2xl border text-center transition font-semibold cursor-pointer ${
              paymentMethod === m
                ? 'bg-[#2D5A43] text-white border-[#2D5A43]'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {paymentMethod === 'GCash / E-Wallet' && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-3">
          <p className="text-emerald-900 font-semibold">
            Please send payment to GCash Number: <strong>0917-BLOOM-CRAFT (Ron B.)</strong>
          </p>
          <div className="border-2 border-dashed border-emerald-300 rounded-xl p-4 text-center bg-white cursor-pointer hover:bg-emerald-50/50 transition relative">
            <UploadCloud className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <span className="font-semibold text-stone-700 block">
              Click to upload transfer screenshot proof
            </span>
            <span className="text-[10px] text-stone-600">PNG, JPG, WEBP up to 10MB</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  onUploadReceipt(e.target.files[0].name);
                }
              }}
              className="mt-2 text-xs"
            />
          </div>
          {uploadedReceipt && (
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-300">
              <span className="text-emerald-700 font-bold text-xs truncate max-w-[200px]">
                ✓ Attached: {uploadedReceipt}
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer ml-2"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PaymentUpload;
