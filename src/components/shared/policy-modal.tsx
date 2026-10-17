'use client';

import React, { useEffect } from 'react';
import { X, ShieldCheck, FileText, Flower2, Droplets, Sun, Scissors, Heart, CheckCircle2, Phone, Mail } from 'lucide-react';

export type PolicyModalType = 'privacy' | 'terms' | 'care' | null;

interface PolicyModalProps {
  type: PolicyModalType;
  onClose: () => void;
}

export function PolicyModal({ type, onClose }: PolicyModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (type) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [type, onClose]);

  if (!type) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 border border-stone-800 text-stone-300 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0">
              {type === 'privacy' && <ShieldCheck className="w-5 h-5" />}
              {type === 'terms' && <FileText className="w-5 h-5" />}
              {type === 'care' && <Flower2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                {type === 'privacy' && 'Privacy Policy'}
                {type === 'terms' && 'Terms of Service'}
                {type === 'care' && 'Master Florist Flower Care Guide'}
              </h3>
              <p className="text-xs text-stone-400">
                {type === 'privacy' && "How Ron's Bloom Crafts respects & protects your personal data"}
                {type === 'terms' && 'Order fulfillment, payment verification & delivery guidelines'}
                {type === 'care' && 'Essential rituals to extend the vitality & beauty of your blooms'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm leading-relaxed text-stone-300">
          {type === 'privacy' && (
            <>
              <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-4 text-emerald-300">
                <p className="font-medium text-xs sm:text-sm">
                  At Ron’s Bloom Crafts, we hold your trust with the same delicacy as our handcrafted blooms. We do not sell or monetize personal customer records.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  1. Information We Collect
                </h4>
                <p className="text-stone-400 mb-2">
                  When you commission an arrangement or place an order through our storefront, we collect:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-stone-400">
                  <li><strong>Sender Details:</strong> Name, phone number, and email address for order notifications.</li>
                  <li><strong>Recipient Information:</strong> Delivery address, recipient contact number, and personal greeting card messages.</li>
                  <li><strong>Proof of Payment:</strong> E-wallet transaction screenshots or reference numbers for manual payment verification.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  2. How We Use Your Data
                </h4>
                <p className="text-stone-400">
                  Your information is strictly used to fulfill your bespoke floral order: generating dispatch manifests for our couriers, printing greeting cards, notifying you of real-time fulfillment status via email, and handling customer inquiries.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  3. Payment Proof & Privacy
                </h4>
                <p className="text-stone-400">
                  Electronic transfer proofs uploaded during checkout (GCash, Maya, Bank Transfer) are stored securely in encrypted cloud buckets and accessed solely by our authorized billing team to clear payments. We never store debit/credit card numbers directly.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  4. Your Rights & Questions
                </h4>
                <p className="text-stone-400">
                  You may request the deletion or correction of your account information at any time by reaching out to our atelier team at <strong className="text-stone-200">0917-BLOOM-CRAFT (0917-256-6627)</strong> or via email.
                </p>
              </div>
            </>
          )}

          {type === 'terms' && (
            <>
              <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-4 text-stone-300">
                <p className="font-medium text-xs sm:text-sm">
                  Welcome to Ron's Bloom Crafts. By placing an order with our atelier, you agree to the fulfillment and delivery terms outlined below.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  1. Bespoke Floral Handcrafting & Substitutions
                </h4>
                <p className="text-stone-400">
                  Every arrangement is individually composed by our florists. Because fresh blooms are subject to seasonal climate and harvest availability, slight variations in shade or foliage may occur. We guarantee that any substitution will match or exceed the original aesthetic value.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  2. Payment Verification & Processing
                </h4>
                <p className="text-stone-400">
                  Orders transition to our floral preparation queue once payment proof is reviewed and cleared by our atelier staff. Unverified orders will remain pending and may delay scheduled delivery until confirmed.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  3. Delivery Policies & Recipient Handover
                </h4>
                <p className="text-stone-400">
                  Our specialized couriers hand-carry all arrangements in protective packaging. If the recipient is unreachable upon arrival, our driver will contact the sender or leave the arrangement with building reception/security after gaining sender approval.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  4. Cancellations, Rescheduling & Refunds
                </h4>
                <p className="text-stone-400">
                  Cancellations or date modifications must be requested at least 24 hours prior to the scheduled delivery date. If an arrangement arrives damaged due to transit, notify us within 4 hours with a photograph for an expedited replacement or refund.
                </p>
              </div>
            </>
          )}

          {type === 'care' && (
            <>
              <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-4 text-emerald-300">
                <p className="font-medium text-xs sm:text-sm">
                  Handcrafted with devotion, your flowers can radiate vibrancy for days to come with these simple master florist care rituals.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-emerald-400" />
                  Fresh Cut Botanical Bouquets
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-stone-800/40 p-3.5 rounded-xl border border-stone-800">
                    <div className="flex items-center gap-2 text-white font-medium mb-1">
                      <Scissors className="w-4 h-4 text-emerald-400" />
                      Trim at 45° Angle
                    </div>
                    <p className="text-stone-400 text-xs">
                      Recut stems 1–2 cm at an angle every 2 days under cool water to unblock vascular channels for hydration.
                    </p>
                  </div>
                  <div className="bg-stone-800/40 p-3.5 rounded-xl border border-stone-800">
                    <div className="flex items-center gap-2 text-white font-medium mb-1">
                      <Droplets className="w-4 h-4 text-emerald-400" />
                      Fresh Water Daily
                    </div>
                    <p className="text-stone-400 text-xs">
                      Replenish with cold, clean water daily. Remove any submerged lower foliage to inhibit bacterial growth.
                    </p>
                  </div>
                  <div className="bg-stone-800/40 p-3.5 rounded-xl border border-stone-800">
                    <div className="flex items-center gap-2 text-white font-medium mb-1">
                      <Sun className="w-4 h-4 text-amber-400" />
                      Avoid Direct Sunlight
                    </div>
                    <p className="text-stone-400 text-xs">
                      Keep bouquets away from direct sunlight, air conditioning drafts, heating vents, and ripening fruit bowls.
                    </p>
                  </div>
                  <div className="bg-stone-800/40 p-3.5 rounded-xl border border-stone-800">
                    <div className="flex items-center gap-2 text-white font-medium mb-1">
                      <Heart className="w-4 h-4 text-rose-400" />
                      Pluck Guard Petals
                    </div>
                    <p className="text-stone-400 text-xs">
                      Gently remove outer protective guard petals as roses open to encourage fresh interior florets to expand.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800">
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Satin Ribbon &amp; Fuzzy Wire Everlasting Flowers
                </h4>
                <p className="text-stone-400">
                  Our artisanal satin and chenille fuzzy wire blooms last indefinitely! Keep them away from moisture and humidity. Dust gently using a soft clean cosmetic brush or a hairdryer on cool, low setting.
                </p>
              </div>

              <div className="pt-2 border-t border-stone-800">
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Preserved &amp; Dried Flowers
                </h4>
                <p className="text-stone-400">
                  Do not add water. Store in a dry indoor room away from direct moisture and harsh sun exposure to preserve rich botanical pigmentation for years.
                </p>
              </div>
            </>
          )}

          {/* Hotline Footer within modal */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Need florist assistance? <strong>0917-BLOOM-CRAFT (0917-256-6627)</strong></span>
            </div>
            <div className="flex items-center gap-2 text-stone-400">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>princeescrupolo06@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
          >
            <CheckCircle2 className="w-4 h-4" />
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
