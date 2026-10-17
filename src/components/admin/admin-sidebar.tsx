'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Flower2,
  Users,
  ShoppingBag,
  Boxes,
  X,
  ShieldCheck,
  PanelLeft,
  LogOut,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export interface AdminSidebarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  ordersCount?: number;
  inventoryCount?: number;
  pendingPaymentsCount?: number;
  patronCount?: number;
  totalRevenue?: number;
  onAddBouquet?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onNavigateStorefront?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
}

export function AdminSidebar({
  activeTab = 'dashboard',
  onSelectTab,
  ordersCount: _ordersCount = 0,
  inventoryCount: _inventoryCount = 0,
  pendingPaymentsCount: _pendingPaymentsCount = 0,
  patronCount: _patronCount = 0,
  totalRevenue: _totalRevenue = 0,
  onAddBouquet: _onAddBouquet,
  isOpenMobile = false,
  onCloseMobile,
  onNavigateStorefront: _onNavigateStorefront,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  onLogout
}: AdminSidebarProps) {
  const router = useRouter();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Sync with localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rons_admin_sidebar_collapsed');
      if (saved !== null) {
        setInternalCollapsed(saved === 'true');
      }
    } catch {
      // Ignore localStorage errors in private browsing/sandboxes
    }
  }, []);

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('rons_admin_sidebar_collapsed', String(next));
        } catch {
          // Ignore
        }
        return next;
      });
    }
  };

  // Normalize tab for comparison
  const isTabActive = (tabId: string) => {
    if (tabId === 'dashboard' && (activeTab === 'dashboard' || !activeTab)) return true;
    if (tabId === 'users' && (activeTab === 'users' || activeTab === 'customers' || activeTab === 'patron')) return true;
    if (tabId === 'orders' && activeTab === 'orders') return true;
    if (tabId === 'products' && (activeTab === 'products' || activeTab === 'products-mgmt')) return true;
    if (tabId === 'best-sellers' && (activeTab === 'best-sellers' || activeTab === 'bestsellers')) return true;
    if (tabId === 'sales' && (activeTab === 'sales' || activeTab === 'sales-report')) return true;
    if (tabId === 'inventory' && activeTab === 'inventory') return true;
    return activeTab === tabId;
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag
    },
    {
      id: 'products',
      label: 'Products',
      icon: Flower2
    },
    {
      id: 'best-sellers',
      label: 'Best Sellers',
      icon: Sparkles
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: TrendingUp
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Boxes
    }
  ];

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      router.push('/login');
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen ${isCollapsed ? 'w-72 lg:w-20' : 'w-72'
          } bg-[#121B16] text-stone-200 border-r border-[#1F2E25] flex flex-col justify-between shrink-0 shadow-2xl lg:shadow-none transition-all duration-300 ease-in-out ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className={`flex flex-col h-full overflow-y-auto ${isCollapsed ? 'p-3.5 lg:px-2.5 lg:py-5' : 'p-3.5 sm:p-4'} space-y-5`}>
          {/* Atelier Brand Header */}
          <div
            className={`pb-3.5 border-b border-[#1F2E25] flex items-center ${isCollapsed ? 'justify-between lg:justify-center' : 'justify-between'
              } ${isCollapsed ? 'gap-2 lg:gap-0' : 'gap-2'}`}
          >
            <button
              type="button"
              onClick={() => {
                if (isCollapsed) {
                  handleToggleCollapse();
                  return;
                }
                onSelectTab?.('dashboard');
                onCloseMobile?.();
              }}
              className={`flex items-center ${isCollapsed ? 'space-x-2.5 lg:space-x-0 lg:justify-center lg:w-full' : 'space-x-2.5 flex-1'
                } group text-left cursor-pointer min-w-0`}
              title={isCollapsed ? 'Click to expand sidebar' : "Ron's Bloom Crafts Dashboard"}
            >
              <div className="relative w-9 h-9 rounded-2xl overflow-hidden shrink-0 border border-amber-500/40 shadow-md group-hover:scale-105 transition-transform bg-[#1D2B22]">
                <Image
                  src="/logo.png"
                  alt="Ron's Bloom Crafts"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className={`${isCollapsed ? 'block lg:hidden' : 'block'} shrink-0`}>
                <span className="font-serif font-bold text-white text-[15px] block leading-tight tracking-tight whitespace-nowrap group-hover:text-amber-300 transition-colors">
                  Ron's Bloom Crafts
                </span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono font-semibold whitespace-nowrap">
                    Admin Atelier
                  </span>
                </div>
              </div>
            </button>

            <div className={`items-center space-x-1 shrink-0 ${isCollapsed ? 'flex lg:hidden' : 'flex'}`}>
              {/* Desktop Header Collapse Button: hides when sidebar is collapsed */}
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl bg-[#122018] border border-[#234231] text-stone-200 hover:text-white hover:bg-[#182A20] hover:border-emerald-500/60 shadow-xs transition-all cursor-pointer group shrink-0"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeft className="w-4 h-4 text-stone-200 group-hover:text-white transition-colors" />
                </button>
              )}

              {/* Mobile close button */}
              {onCloseMobile && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="lg:hidden p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Section */}
          <div className="space-y-1.5">
            <div className={`items-center justify-between px-3 py-1 ${isCollapsed ? 'flex lg:hidden' : 'flex'}`}>
              <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase font-mono">
                Atelier Operations
              </span>
              <span className="text-[10px] text-stone-500 font-mono">{navItems.length} Sections</span>
            </div>

            <nav className="space-y-1" aria-label="Admin Navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isTabActive(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab?.(item.id);
                      onCloseMobile?.();
                    }}
                    title={item.label}
                    className={`w-full group flex items-center ${isCollapsed
                        ? 'px-3 py-2 lg:px-0 lg:py-2 lg:justify-center'
                        : 'px-3 py-2'
                      } rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${active
                        ? 'bg-gradient-to-r from-[#2D5A43] to-[#1F3D2E] text-white shadow-md shadow-emerald-950/50 border border-emerald-500/40'
                        : 'text-stone-300 hover:text-white hover:bg-[#1A261F] border border-transparent'
                      }`}
                  >
                    <div
                      className={`flex items-center ${isCollapsed ? 'space-x-2.5 lg:space-x-0 lg:justify-center' : 'space-x-2.5'
                        } min-w-0`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${active
                            ? 'bg-white/15 text-amber-300 shadow-inner'
                            : 'bg-stone-800/80 text-stone-400 group-hover:text-emerald-400 group-hover:bg-stone-800'
                          }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`font-medium text-sm truncate ${isCollapsed ? 'block lg:hidden' : 'block'
                          } ${active ? 'text-white font-semibold' : 'text-stone-200 group-hover:text-white'
                          }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Area: Master Florist Profile & User Account */}
        <div className={`p-3 border-t border-[#1F2E25] bg-[#0E1612] ${isCollapsed ? 'lg:px-2.5 lg:py-3.5' : ''}`}>
          {/* User Account Bar */}
          <div
            className={`flex items-center ${isCollapsed ? 'justify-between lg:justify-center' : 'justify-between'
              } ${isCollapsed ? 'gap-2 lg:gap-0' : 'gap-2'} p-1.5 rounded-xl bg-[#131E18]/60 border border-[#1E3024] hover:border-[#274030] transition-colors`}
          >
            <div
              className={`flex items-center ${isCollapsed ? 'space-x-2.5 lg:space-x-0 lg:justify-center lg:w-full' : 'space-x-2.5 flex-1'
                } min-w-0`}
              title="Ron (Master Florist) • Super Administrator"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-900/80 border border-emerald-500/50 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                RF
              </div>
              <div className={`min-w-0 flex-1 ${isCollapsed ? 'block lg:hidden' : 'block'}`}>
                <div className="text-xs font-bold text-white truncate leading-tight">
                  Ron (Master Florist)
                </div>
                <div className="text-[10px] text-stone-400 flex items-center space-x-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Super Admin</span>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className={`items-center justify-center p-1.5 rounded-lg text-stone-400 hover:text-rose-300 hover:bg-rose-950/60 border border-transparent hover:border-rose-900/50 transition-all cursor-pointer group shrink-0 ${isCollapsed ? 'flex lg:hidden' : 'flex'
                }`}
              title="Log Out"
              aria-label="Log Out"
            >
              <LogOut className="w-4 h-4 text-stone-400 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Collapsed state quick logout button */}
          {isCollapsed && (
            <div className="hidden lg:flex justify-center mt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-8 h-8 rounded-xl text-stone-400 hover:text-rose-300 hover:bg-rose-950/60 border border-transparent hover:border-rose-900/50 transition-all cursor-pointer group flex items-center justify-center"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="w-4 h-4 text-stone-400 group-hover:text-rose-400 transition-colors" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
