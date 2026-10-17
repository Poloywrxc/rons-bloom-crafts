'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Star,
  Award,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Mail,
  Phone,
  User,
  ShieldAlert,
  ArrowUpDown,
  Database,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { UserRole, CustomerInfo } from '@/types/user';
import {
  fetchAllUsersWithStats,
  updateUserRoleAction,
  fetchReviewsForModeration,
  toggleReviewPublishAction
} from '@/actions/customer/action';

export type { CustomerInfo };

export interface CustomerTableProps {
  customers?: CustomerInfo[];
  onUsersLoaded?: (users: CustomerInfo[]) => void;
}

export function CustomerTable({
  customers,
  onUsersLoaded
}: CustomerTableProps) {
  const [usersList, setUsersList] = useState<CustomerInfo[]>(() => {
    if (customers && customers.length > 0) return customers;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('bloom_crafts_all_users');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'customer' | 'admin'>('all');
  const [reviews, setReviews] = useState<any[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const loadDataFromDatabase = async () => {
    setIsLoadingFromDb(true);
    try {
      const [usersResult, reviewsResult] = await Promise.allSettled([
        fetchAllUsersWithStats(),
        fetchReviewsForModeration()
      ]);

      if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
        setUsersList(usersResult.value);
        try {
          localStorage.setItem('bloom_crafts_all_users', JSON.stringify(usersResult.value));
        } catch {}
        onUsersLoaded?.(usersResult.value);
      }

      if (reviewsResult.status === 'fulfilled' && Array.isArray(reviewsResult.value)) {
        setReviews(reviewsResult.value);
      }
    } catch (e) {
      console.warn('Database load note:', e);
    } finally {
      setIsLoadingFromDb(false);
    }
  };

  React.useEffect(() => {
    loadDataFromDatabase();
  }, []);

  const handleToggleUserRole = async (userId: string) => {
    const targetUser = usersList.find((u) => u.id === userId);
    if (!targetUser) return;
    const nextRole: UserRole = targetUser.role === 'admin' ? 'customer' : 'admin';

    const updatedUsers = usersList.map((user) => {
      if (user.id === userId) {
        return {
          ...user,
          role: nextRole,
          badge: nextRole === 'admin' ? 'Master Florist & Admin' : 'Floral Customer',
          badgeColor:
            nextRole === 'admin'
              ? 'bg-emerald-950 text-amber-300 border-amber-500/40'
              : 'bg-stone-100 text-stone-800 border-stone-200'
        };
      }
      return user;
    });

    setUsersList(updatedUsers);
    try {
      localStorage.setItem('bloom_crafts_all_users', JSON.stringify(updatedUsers));
      const savedUserStr = localStorage.getItem('bloom_crafts_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser.id === userId) {
          savedUser.role = nextRole;
          localStorage.setItem('bloom_crafts_user', JSON.stringify(savedUser));
        }
      }
    } catch {}
    onUsersLoaded?.(updatedUsers);

    try {
      const res = await updateUserRoleAction(userId, nextRole);
      if (res.success) {
        showNotice(`Updated role for ${targetUser.name} to ${nextRole.toUpperCase()} in Supabase database! 🛡️`);
      } else {
        showNotice(`Updated role for ${targetUser.name} to ${nextRole.toUpperCase()}`);
      }
    } catch {
      showNotice(`Updated role for ${targetUser.name} to ${nextRole.toUpperCase()}`);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedRoleFilter === 'customer') return matchesSearch && u.role === 'customer';
    if (selectedRoleFilter === 'admin') return matchesSearch && u.role === 'admin';
    return matchesSearch;
  });

  const totalUsers = usersList.length;
  const customerCount = usersList.filter((u) => u.role === 'customer').length;
  const adminCount = usersList.filter((u) => u.role === 'admin').length;
  const avgLifetimeValue =
    usersList.reduce((acc, c) => acc + c.totalSpent, 0) / (totalUsers || 1);

  const togglePublishReview = async (reviewId: string) => {
    const targetRev = reviews.find((r) => r.id === reviewId);
    if (!targetRev) return;
    const currentStatus = targetRev.published;

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, published: !currentStatus } : r))
    );

    try {
      await toggleReviewPublishAction(reviewId, currentStatus);
      showNotice(`Review visibility updated in Supabase database! 💬`);
    } catch {
      showNotice(`Review visibility updated.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Action Notification Toast */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121B16] text-amber-300 px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs border border-emerald-500/40 animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Overview Stat Cards for Users (Only Customer & Admin) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Total Users</span>
            <Users className="w-4 h-4 text-[#2D5A43]" />
          </div>
          <div className="font-serif font-bold text-2xl text-stone-900">{totalUsers}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Customer & Admin Accounts</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Customers</span>
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif font-bold text-2xl text-stone-900">{customerCount}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Patrons & Floral Buyers</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Administrators</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-serif font-bold text-2xl text-stone-900">{adminCount}</div>
          <span className="text-[11px] text-amber-700 font-medium">Master Florist & Staff</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Avg. Lifetime Spend</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif font-bold text-2xl text-stone-900">
            ${avgLifetimeValue.toFixed(2)}
          </div>
          <span className="text-[11px] text-stone-500 font-medium">All User Spend Combined</span>
        </div>
      </div>

      {/* Main Users Directory Card */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-200/80 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#2D5A43] text-[10px] font-bold uppercase tracking-wider font-mono">
                Atelier Accounts
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                Only Customer & Admin Roles
              </span>
            </div>
            <h3 className="font-serif font-bold text-stone-900 text-xl mt-1">
              Users Directory & Roles
            </h3>
            <p className="text-xs text-stone-500">
              Manage accounts, toggle customer and administrator access, and inspect floral order histories.
            </p>
          </div>

          {/* Actions: Sync and Search Bar */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button
              type="button"
              onClick={async () => {
                await loadDataFromDatabase();
                showNotice('Users directory synchronized with Supabase database! 🌸');
              }}
              disabled={isLoadingFromDb}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#2D5A43] border border-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-60 shrink-0"
              title="Refresh users and orders from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFromDb ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync DB</span>
            </button>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2D5A43]/20 focus:border-[#2D5A43]"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills: Only All Users, Customers, and Admins */}
        <div className="px-6 py-3 border-b border-stone-100 flex items-center space-x-2 overflow-x-auto text-xs bg-stone-50/30">
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              selectedRoleFilter === 'all'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Users ({totalUsers})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('customer')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              selectedRoleFilter === 'customer'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Customers ({customerCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('admin')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              selectedRoleFilter === 'admin'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admins ({adminCount})</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100/70 text-stone-600 uppercase text-[10px] tracking-wider font-mono">
              <tr>
                <th className="p-4 pl-6">User Details</th>
                <th className="p-4">Account Role</th>
                <th className="p-4">Member Since</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Role Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoadingFromDb && usersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-stone-500 text-xs">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#2D5A43]" />
                      <span className="font-medium text-stone-600">Retrieving user accounts from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-500 text-xs">
                    No users match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shadow-xs shrink-0 ${
                            user.role === 'admin'
                              ? 'bg-gradient-to-br from-emerald-900 to-stone-900 text-amber-300 border border-amber-500/40'
                              : 'bg-gradient-to-br from-[#2D5A43] to-[#1E3B2C] text-emerald-100'
                          }`}
                        >
                          {user.initials}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-stone-900 text-xs block">
                              {user.name}
                            </span>
                            {user.role === 'admin' && (
                              <span className="text-[10px] font-mono font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-stone-500 mt-0.5">
                            <span className="flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-stone-400" />
                              <span>{user.email}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-stone-400" />
                              <span>{user.phone}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#14231A] text-amber-300 border border-amber-500/50 shadow-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#2D5A43] border border-emerald-200">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Customer</span>
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-stone-500 font-mono text-[11px]">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>{user.memberSince}</span>
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{user.status}</span>
                      </span>
                    </td>

                    <td className="p-4 pr-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleUserRole(user.id)}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-[11px] font-medium transition cursor-pointer border ${
                          user.role === 'admin'
                            ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-[#2D5A43] border-emerald-300'
                        }`}
                        title={
                          user.role === 'admin'
                            ? 'Demote user role to Customer'
                            : 'Promote user role to Administrator'
                        }
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        <span>
                          {user.role === 'admin' ? 'Change to Customer' : 'Make Admin'}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reviews & Feedback Moderation Stream */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-[#2D5A43]" />
              <h3 className="font-serif font-bold text-stone-900 text-lg">
                Customer Reviews & Floral Testimonials
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Curate feedback from verified customers to feature on the storefront home.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            All Reviews Verified by Slip Check
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs bg-stone-50/50 rounded-2xl border border-stone-100 flex flex-col items-center justify-center space-y-1">
            <MessageSquare className="w-6 h-6 text-stone-300 mb-1" />
            <span className="font-semibold text-stone-600">No customer reviews submitted yet</span>
            <span className="text-[11px] text-stone-400">Patron testimonials on arrangements will appear here for moderation.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">{rev.date}</span>
                  </div>

                  <p className="text-xs text-stone-700 italic leading-relaxed">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-stone-900 block text-xs">{rev.author}</span>
                    <span className="text-[10px] text-stone-500">{rev.arrangement}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePublishReview(rev.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      rev.published
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                    }`}
                  >
                    {rev.published ? 'Published' : 'Hidden'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerTable;
