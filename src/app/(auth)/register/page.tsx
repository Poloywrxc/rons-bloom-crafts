'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types/user';
import { AuthPortalView } from '@/components/auth/auth-portal-view';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('bloom_crafts_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch {}
  }, []);

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
        <span className="font-mono text-emerald-400">/register</span>
      </div>

      <main className="flex-1 flex items-center justify-center p-4">
        <AuthPortalView
          initialMode="register"
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onCancel={() => router.push('/')}
          onCompleteLogin={handleCompleteLogin}
          onModeChange={(mode) => {
            if (mode === 'login') router.push('/login');
          }}
        />
      </main>
    </div>
  );
}
