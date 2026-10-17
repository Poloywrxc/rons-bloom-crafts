'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  ShoppingBag,
  LogIn,
  User as UserIcon,
  ChevronDown,
  LogOut,
  Search,
  X
} from 'lucide-react';
import { Logo } from './logo';
import { SearchBar } from './search-bar';
import { User } from '@/types/user';

interface NavbarProps {
  onNavigateHome?: () => void;
  onNavigateWishlist?: () => void;
  onNavigateAccount?: () => void;
  onNavigateLogin?: () => void;
  onLogout?: () => void;
  onOpenCart?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  wishlistCount?: number;
  cartCount?: number;
  currentUser?: User | null;
  userName?: string;
  userRole?: string;
  stickyTopClass?: string;
}

export function Navbar({
  onNavigateHome,
  onNavigateWishlist,
  onNavigateAccount,
  onNavigateLogin,
  onLogout,
  onOpenCart,
  searchQuery = '',
  onSearchChange = () => {},
  wishlistCount = 0,
  cartCount = 0,
  currentUser,
  userName,
  userRole,
  stickyTopClass = 'top-0'
}: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsMobileSearchOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeUser = currentUser;
  const displayName = activeUser ? activeUser.name : userName;
  const displayRole = activeUser
    ? (activeUser.role === 'admin' ? 'Master Florist' : 'Customer')
    : (userRole === 'admin' || userRole === 'Master Florist' ? 'Master Florist' : 'Customer');
  const isLoggedIn = Boolean(activeUser || userName);

  const userInitials = displayName
    ? displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  const handleNavClick = (action?: () => void) => {
    setIsMenuOpen(false);
    action?.();
  };

  return (
    <>
      <nav className={`bg-white/90 backdrop-blur-md border-b border-stone-200/80 sticky ${stickyTopClass} z-30 shadow-xs`}>
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-3.5 flex items-center justify-between gap-1 sm:gap-4">
          {/* Brand Logo - Responsive scaling */}
          <Logo onClick={() => handleNavClick(onNavigateHome)} />

          {/* Search bar inside header (Desktop Only) */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4 lg:mx-8">
            <SearchBar value={searchQuery} onChange={onSearchChange} />
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-1 sm:space-x-2.5 md:space-x-3.5 shrink-0">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(prev => !prev)}
              className={`md:hidden p-1.5 sm:p-2 rounded-full transition cursor-pointer ${
                isMobileSearchOpen
                  ? 'bg-emerald-50 text-[#2D5A43]'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
              title="Search store"
              aria-label="Toggle mobile search"
            >
              {isMobileSearchOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Search className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Saved Wishlist Button */}
            <button
              type="button"
              onClick={onNavigateWishlist}
              className="relative p-1.5 sm:p-2 text-stone-600 hover:text-rose-600 rounded-full hover:bg-stone-100 transition cursor-pointer"
              title="Saved Wishlist"
              aria-label="Saved Wishlist"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              type="button"
              onClick={onOpenCart}
              className="relative p-1.5 sm:p-2 text-stone-600 hover:text-[#2D5A43] rounded-full hover:bg-stone-100 transition flex items-center cursor-pointer"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#2D5A43] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Profile / Login Area */}
            {isLoggedIn ? (
              <div className="relative pl-1.5 sm:pl-3 border-l border-stone-200" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  className="flex items-center space-x-1.5 sm:space-x-2 pl-0.5 sm:pl-1 pr-1 sm:pr-2 py-0.5 sm:py-1 rounded-full hover:bg-stone-100 cursor-pointer group text-left transition border border-transparent hover:border-stone-200"
                  title="Account menu"
                  aria-label="Account menu"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 group-hover:bg-[#2D5A43] flex items-center justify-center text-[#2D5A43] group-hover:text-white text-xs font-bold border border-emerald-200 group-hover:border-[#2D5A43] transition shrink-0">
                    {userInitials}
                  </div>
                  <div className="hidden lg:block text-left">
                    <span className="block text-xs font-semibold text-stone-800 leading-tight group-hover:text-[#2D5A43] transition">
                      {displayName}
                    </span>
                    <span className="block text-[10px] text-stone-500 leading-none mt-0.5">{displayRole}</span>
                  </div>
                  <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2.5 border-b border-stone-100">
                      <p className="text-xs font-bold text-stone-900 truncate">{displayName}</p>
                      <p className="text-[11px] text-stone-500 truncate">{activeUser?.email || 'patron@bloom.crafts'}</p>
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-emerald-50 text-[#2D5A43] font-medium rounded-full">
                        {displayRole}
                      </span>
                    </div>

                    <div className="py-1 text-xs">
                      <button
                        type="button"
                        onClick={() => handleNavClick(onNavigateAccount)}
                        className="w-full text-left px-4 py-2 text-stone-700 hover:bg-stone-50 hover:text-[#2D5A43] flex items-center space-x-2.5 transition cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-stone-400" />
                        <span>My Account & Orders</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNavClick(onNavigateWishlist)}
                        className="w-full text-left px-4 py-2 text-stone-700 hover:bg-stone-50 hover:text-rose-600 flex items-center space-x-2.5 transition cursor-pointer"
                      >
                        <Heart className="w-4 h-4 text-stone-400" />
                        <span>Saved Wishlist ({wishlistCount})</span>
                      </button>
                    </div>

                    {onLogout && (
                      <div className="border-t border-stone-100 pt-1">
                        <button
                          type="button"
                          onClick={() => handleNavClick(onLogout)}
                          className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 text-xs font-semibold transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="pl-1.5 sm:pl-3 border-l border-stone-200 flex items-center">
                <button
                  type="button"
                  onClick={onNavigateLogin || onNavigateAccount}
                  className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-emerald-50/90 hover:bg-[#2D5A43] text-[#2D5A43] hover:text-white transition-all duration-200 text-xs font-semibold border border-emerald-200/90 hover:border-[#2D5A43] cursor-pointer shadow-xs group"
                  title="Sign in to your account"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#2D5A43] group-hover:text-white transition shrink-0" />
                  <span className="inline text-xs font-medium">Login</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expandable Mobile Search Bar */}
        {isMobileSearchOpen && (
          <div className="md:hidden px-3 sm:px-4 pb-3 pt-1 border-t border-stone-100 bg-white/95 animate-in slide-in-from-top-2 duration-150">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search roses, peonies, bouquets..."
              className="w-full"
              autoFocus
            />
          </div>
        )}
      </nav>
    </>
  );
}

export default Navbar;
