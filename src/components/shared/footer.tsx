'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PolicyModal, PolicyModalType } from './policy-modal';
import { ShieldCheck, FileText, Flower2, Sparkles } from 'lucide-react';

interface FooterProps {
  onSelectCategory?: (category: string) => void;
  onNavigateTab?: (tab: string) => void;
  onNavigateAdmin?: () => void;
}

export function Footer({ onSelectCategory, onNavigateAdmin }: FooterProps) {
  const [activeModal, setActiveModal] = useState<PolicyModalType>(null);

  return (
    <footer className="bg-stone-900 text-stone-400 pt-12 pb-8 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        {/* Column 1: Brand Info */}
        <div>
          <div className="flex items-center space-x-2.5 text-white mb-3">
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-stone-700">
              <Image
                src="/logo.png"
                alt="Ron's Bloom Crafts"
                width={28}
                height={28}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-serif text-lg font-bold">Ron’s Bloom Crafts</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed mb-4">
            Handcrafting bespoke floral artistry, wedding installations, and same-day fresh botanical hampers with sustainably sourced blooms.
          </p>
          <div className="text-xs text-stone-400 space-y-1">
            <div>📍 412 Botanical Lane, Suite 10, Floral District</div>
            <div>📞 0917-BLOOM-CRAFT (0917-256-6627)</div>
          </div>
        </div>

        {/* Column 2: Collections */}
        <div>
          <h4 className="text-white font-medium text-sm mb-3">Quick Collections</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                type="button"
                onClick={() => onSelectCategory?.('Mixed flowers')}
                className="hover:text-emerald-400 cursor-pointer transition"
              >
                Mixed Flowers
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectCategory?.('Rose themed flowers')}
                className="hover:text-emerald-400 cursor-pointer transition"
              >
                Rose Themed Flowers
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectCategory?.('Customized Flowers')}
                className="hover:text-emerald-400 cursor-pointer transition"
              >
                Customized Flowers
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectCategory?.('Sunflower Themed flowers')}
                className="hover:text-emerald-400 cursor-pointer transition"
              >
                Sunflower Themed
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectCategory?.('Satin Artificial Flowers')}
                className="hover:text-emerald-400 cursor-pointer transition"
              >
                Satin Artificial Flowers
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectCategory?.('Fuzzy wire Artificial Flowers')}
                className="hover:text-emerald-400 cursor-pointer transition"
              >
                Fuzzy Wire Flowers
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectCategory?.('Dried Artificial Flowers')}
                className="hover:text-emerald-400 cursor-pointer transition"
              >
                Dried Everlasting
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3: Atelier Policies & Guides (Replaces Customer Care & System Info) */}
        <div>
          <h4 className="text-white font-medium text-sm mb-3">Atelier &amp; Policies</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <button
                type="button"
                onClick={() => setActiveModal('privacy')}
                className="hover:text-emerald-400 cursor-pointer flex items-center gap-2 text-stone-300 transition text-left group"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80 group-hover:text-emerald-400 transition" />
                <span>Privacy Policy</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveModal('terms')}
                className="hover:text-emerald-400 cursor-pointer flex items-center gap-2 text-stone-300 transition text-left group"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400/80 group-hover:text-emerald-400 transition" />
                <span>Terms of Service</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveModal('care')}
                className="hover:text-emerald-400 cursor-pointer flex items-center gap-2 text-stone-300 transition text-left group"
              >
                <Flower2 className="w-3.5 h-3.5 text-emerald-400/80 group-hover:text-emerald-400 transition" />
                <span>Flower Care Guide</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Column 4: Craftsmanship & Promise */}
        <div>
          <h4 className="text-white font-medium text-sm mb-3">Artisan Promise</h4>
          <p className="text-xs text-stone-400 leading-relaxed mb-3">
            Every botanical sculpture, satin ribbon bouquet, and fuzzy wire creation is individually designed and handcrafted with devotion.
          </p>
          <div className="bg-stone-800/70 p-3 rounded-xl border border-stone-700/60 text-xs text-stone-300 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Handcrafted Guarantee</span>
            </div>
            <div className="text-stone-400 text-[11px] leading-normal">
              Same-day bespoke deliveries, premium packaging &amp; everlasting keepsake flowers.
            </div>
          </div>
        </div>
      </div>

      {/* Sub-footer Bar */}
      <div className="max-w-7xl mx-auto px-4 border-t border-stone-800 pt-6 text-center text-xs text-stone-500 flex flex-col md:flex-row justify-between items-center gap-2">
        <span>© 2026 Ron's Bloom Crafts. All rights reserved. Handcrafted with heart &amp; petals.</span>
        {onNavigateAdmin && (
          <button
            type="button"
            onClick={onNavigateAdmin}
            className="hover:text-emerald-400 text-stone-500 transition cursor-pointer"
          >
            Florist Admin
          </button>
        )}
      </div>

      {/* Popup Modal for Privacy Policy, Terms of Service, and Flower Care Guide */}
      <PolicyModal type={activeModal} onClose={() => setActiveModal(null)} />
    </footer>
  );
}

export default Footer;
