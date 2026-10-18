'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { User } from '@/types/user';
import { signInWithEmail, signUpWithEmail, sendPasswordResetEmail } from '@/lib/supabase/auth';

interface AuthPortalViewProps {
  initialMode?: 'login' | 'register' | 'forgot';
  currentUser?: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<any>> | ((user: User) => void);
  onCompleteLogin: (role: 'customer' | 'admin', user?: User) => void;
  onCancel?: () => void;
  onModeChange?: (mode: 'login' | 'register' | 'forgot') => void;
}

export function AuthPortalView({
  initialMode = 'login',
  setCurrentUser,
  onCompleteLogin,
  onCancel,
  onModeChange
}: AuthPortalViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const [isEnteringAccount, setIsEnteringAccount] = useState(false);

  const switchMode = (mode: 'login' | 'register' | 'forgot') => {
    setAuthMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setResetSent(false);
    setConfirmationSent(false);
    onModeChange?.(mode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    let willEnterAccount = false;

    try {
      if (authMode === 'forgot') {
        const res = await sendPasswordResetEmail(email);
        if (res.error) {
          setErrorMessage(res.error.message);
        } else {
          setResetSent(true);
          setSuccessMessage(`Password recovery instructions dispatched to ${email}.`);
        }
        return;
      }

      if (authMode === 'register') {
        if (!name.trim()) {
          setErrorMessage('Please enter your full name.');
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters long.');
          return;
        }

        const res = await signUpWithEmail({
          email,
          password,
          name,
          phone,
          address
        });

        if (res.error) {
          setErrorMessage(res.error.message);
          return;
        }

        if (res.data?.requiresConfirmation) {
          setConfirmationSent(true);
          setSuccessMessage(`We have sent a verification email to ${email}. Please confirm your email to activate your account.`);
        } else if (res.data?.user) {
          const activeUser = res.data.user;
          setCurrentUser(activeUser);
          try {
            localStorage.setItem('bloom_crafts_user', JSON.stringify(activeUser));
            sessionStorage.setItem(
              'bloom_welcome_user',
              JSON.stringify({
                name: activeUser.name || 'Patron',
                role: activeUser.role
              })
            );
          } catch {}
          willEnterAccount = true;
          setIsEnteringAccount(true);
          setTimeout(() => {
            onCompleteLogin(activeUser.role, activeUser);
          }, 1100);
        }
        return;
      }

      // Login mode
      const res = await signInWithEmail(email, password);
      if (res.error || !res.data) {
        setErrorMessage(res.error?.message || 'Invalid email or password.');
        return;
      }

      const activeUser = res.data.user;
      setCurrentUser(activeUser);
      try {
        localStorage.setItem('bloom_crafts_user', JSON.stringify(activeUser));
        sessionStorage.setItem(
          'bloom_welcome_user',
          JSON.stringify({
            name: activeUser.name || 'Patron',
            role: activeUser.role
          })
        );
      } catch {}

      willEnterAccount = true;
      setIsEnteringAccount(true);
      setTimeout(() => {
        onCompleteLogin(activeUser.role, activeUser);
      }, 1100);
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected connection error occurred.');
    } finally {
      if (!willEnterAccount) {
        setIsLoading(false);
      }
    }
  };

  if (isEnteringAccount) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FAF7F2] flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in duration-200">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-xl border-2 border-stone-200/80 bg-white flex items-center justify-center p-1.5 animate-pulse">
          <Image
            src="/logo.png"
            alt="Ron's Bloom Crafts"
            width={128}
            height={128}
            className="w-full h-full object-contain"
            priority
          />
        </div>
        <div className="flex items-center space-x-2.5 text-stone-700 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-[#2D5A43]" />
          <span>Entering Ron’s Bloom Crafts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sm:p-8 space-y-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center space-x-1.5 text-xs text-stone-500 hover:text-stone-800 transition cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Storefront</span>
          </button>
        )}

        <div className="text-center">
          <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-3 shadow-md border border-stone-200 shrink-0">
            <Image
              src="/logo.png"
              alt="Ron's Bloom Crafts"
              width={56}
              height={56}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <h3 className="font-serif text-2xl font-bold text-stone-900">
            {authMode === 'login' && 'Welcome to Ron’s Bloom Crafts'}
            {authMode === 'register' && 'Join the Flower Patron Club'}
            {authMode === 'forgot' && 'Reset Your Florist Password'}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {authMode === 'login' && 'Sign in to track orders, schedule flower deliveries, and view member bouquets'}
            {authMode === 'register' && 'Create an account to save floral arrangements and access member benefits'}
            {authMode === 'forgot' && 'Enter your email address to receive password reset instructions'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Reset Confirmation State */}
        {resetSent ? (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-emerald-900 font-medium">
              A recovery link has been dispatched to <strong>{email}</strong>!
            </p>
            <p className="text-[11px] text-emerald-700">
              Please check your inbox (and spam folder) for the reset link to choose your new password.
            </p>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-xs text-[#2D5A43] font-bold hover:underline cursor-pointer pt-2"
            >
              Return to Login
            </button>
          </div>
        ) : confirmationSent ? (
          /* Registration Confirmation State */
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-emerald-950 font-serif">Account Created!</h4>
            <p className="text-xs text-emerald-900 font-medium">
              Verification email sent to <strong>{email}</strong>.
            </p>
            <p className="text-[11px] text-emerald-700">
              Please verify your email address to activate your patron account, then return here to sign in.
            </p>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="mt-2 w-full py-2.5 bg-[#2D5A43] hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-xs"
            >
              Proceed to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-stone-600 mb-1 font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    disabled={isLoading}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43] outline-hidden transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1 font-medium">Contact Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      disabled={isLoading}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43] outline-hidden transition"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1 font-medium">Delivery Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 12 Rosewood St"
                      disabled={isLoading}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43] outline-hidden transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-stone-600 mb-1 font-medium">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43] outline-hidden transition"
              />
            </div>

            {authMode !== 'forgot' && (
              <div>
                <label className="block text-stone-600 mb-1 font-medium">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full p-2.5 pr-10 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43] outline-hidden transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {authMode === 'login' && (
              <div className="flex justify-end items-center text-[11px] text-stone-500">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[#2D5A43] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#2D5A43] hover:bg-emerald-800 disabled:opacity-70 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isLoading ? (
                  authMode === 'login' ? 'Signing In...' : authMode === 'register' ? 'Creating Account...' : 'Sending Link...'
                ) : (
                  authMode === 'login' ? 'Sign In to Bloom Crafts' : authMode === 'register' ? 'Create Patron Account' : 'Send Reset Link'
                )}
              </span>
            </button>
          </form>
        )}

        <div className="text-center text-xs text-stone-500 pt-2 border-t border-stone-100">
          {authMode === 'login' ? (
            <span>
              Don’t have an account yet?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-[#2D5A43] font-bold hover:underline cursor-pointer"
              >
                Register as Member
              </button>
            </span>
          ) : authMode === 'register' ? (
            <span>
              Already a patron?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-[#2D5A43] font-bold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </span>
          ) : (
            <span>
              Remembered your credentials?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-[#2D5A43] font-bold hover:underline cursor-pointer"
              >
                Return to Login
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPortalView;
