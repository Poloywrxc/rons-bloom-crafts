'use client';

import React, { useEffect } from 'react';
import { X, ShoppingBag, LogIn, UserPlus } from 'lucide-react';

interface LoginRequiredModalProps {
  isOpen: boolean;
  productName?: string;
  onClose: () => void;
  onLogin: () => void;
  onCreateAccount: () => void;
}

export function LoginRequiredModal({
  isOpen,
  productName,
  onClose,
  onLogin,
  onCreateAccount
}: LoginRequiredModalProps) {
  // Close on Escape + lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
    >
      {/* Backdrop */}
      <div
        className="modal-backdrop-in absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="modal-pop-in relative w-full max-w-sm bg-[#FAF7F2] rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Decorative header */}
        <div className="relative h-24 bg-gradient-to-br from-[#2D5A43] via-[#3B7257] to-rose-300">
          <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 right-4 w-28 h-28 rounded-full bg-rose-200/30" />
          <button
            id="login-required-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Icon badge */}
        <div className="flex justify-center -mt-9 relative">
          <div className="w-[72px] h-[72px] rounded-2xl bg-white border border-stone-200 shadow-lg flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-[#2D5A43]" />
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pt-4 pb-6 text-center">
          <h2 id="login-required-title" className="font-serif text-2xl text-stone-800">
            Please sign in
          </h2>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">
            {productName ? (
              <>
                Log in to add <span className="font-semibold text-stone-700">&ldquo;{productName}&rdquo;</span> to your tote.
              </>
            ) : (
              'Log in to start adding blooms to your tote.'
            )}
          </p>

          <button
            id="login-required-login"
            type="button"
            onClick={onLogin}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-[#2D5A43] hover:bg-[#244A37] text-white font-medium text-sm py-3 rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition"
          >
            <LogIn className="w-4 h-4" />
            Log In
          </button>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-stone-400">
            <span className="flex-1 h-px bg-stone-200" />
            No account?
            <span className="flex-1 h-px bg-stone-200" />
          </div>

          <button
            id="login-required-register"
            type="button"
            onClick={onCreateAccount}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-stone-700 border border-stone-300 hover:border-rose-300 font-medium text-sm py-3 rounded-2xl active:scale-[0.98] transition"
          >
            <UserPlus className="w-4 h-4 text-rose-500" />
            Create Account
          </button>

          <button
            id="login-required-continue"
            type="button"
            onClick={onClose}
            className="mt-4 text-xs text-stone-400 hover:text-stone-600 underline-offset-2 hover:underline transition"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
