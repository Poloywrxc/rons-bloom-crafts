'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types/user';
import { AuthPortalView } from '@/components/auth/auth-portal-view';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('bloom_crafts_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        if (u.role === 'admin') {
          router.replace('/admin');
        } else {
          router.replace('/account');
        }
      }
    } catch {}
  }, [router]);

  const handleCompleteLogin = (role: 'customer' | 'admin', user?: User) => {
    if (user) {
      setCurrentUser(user);
    }
    if (role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/account');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <div className="bg-stone-900 text-stone-300 px-4 py-2 text-xs flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-1.5 hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Main Studio Switcher</span>
        </Link>
        <span className="font-mono text-emerald-400">/login</span>
      </div>

      <main className="flex-1 flex items-center justify-center">
        <AuthPortalView
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onCancel={() => router.push('/')}
          onCompleteLogin={handleCompleteLogin}
        />
      </main>
    </div>
  );
}
