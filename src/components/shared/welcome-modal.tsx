'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X, Sparkles, ArrowRight, Flower2 } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  role?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function WelcomeModal({
  isOpen,
  onClose,
  userName = 'Patron',
  role,
  actionLabel,
  onAction
}: WelcomeModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#FAF7F2] rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200/90 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-full transition cursor-pointer"
          aria-label="Close welcome modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Atelier Logo Badge */}
        <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-lg border-2 border-stone-200 bg-white p-1 mb-5 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Ron's Bloom Crafts"
            width={96}
            height={96}
            className="w-full h-full object-contain"
            priority
          />
        </div>

        {/* Small Category Pill */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-[#2D5A43] text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          <span>{role === 'admin' ? 'Master Florist Suite' : 'Ron’s Bloom Crafts Store'}</span>
        </div>

        {/* Welcome Headline */}
        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-2.5">
          Welcome, {userName}
        </h3>

        {/* Message */}
        <p className="text-stone-600 text-sm leading-relaxed mb-6">
          {role === 'admin'
            ? "Your floral workshop dashboard is ready. Manage inventory, process customer orders, and oversee atelier operations."
            : "We're delighted to welcome you to Ron's Bloom Crafts! Browse our handcrafted bouquets, fresh seasonal florals, and bespoke arrangements."}
        </p>

        {/* Action Button */}
        <button
          onClick={handleAction}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#2D5A43] hover:bg-[#234734] text-white font-medium text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 group cursor-pointer"
        >
          <span>{actionLabel || (role === 'admin' ? 'Continue to Dashboard' : 'Explore Store')}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

export default WelcomeModal;
