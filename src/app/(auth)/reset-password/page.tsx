'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updatePassword, sendPasswordResetEmail } from '@/lib/supabase/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Check if user came from a recovery link (hash fragment or active session)
    const checkRecoverySession = async () => {
      try {
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;
          if (hash.includes('type=recovery') || hash.includes('access_token')) {
            setIsRecoveryMode(true);
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsRecoveryMode(true);
        }
      } catch (err) {
        console.warn('Error checking recovery session:', err);
      } finally {
        setCheckingSession(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    checkRecoverySession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await sendPasswordResetEmail(email);
      if (res.error) {
        setErrorMessage(res.error.message);
      } else {
        setEmailSent(true);
        setSuccessMessage(`Password recovery instructions sent to ${email}.`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await updatePassword(password);
      if (res.error) {
        setErrorMessage(res.error.message);
      } else {
        setPasswordUpdated(true);
        setSuccessMessage('Your password has been successfully updated!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      {/* Top Studio Switcher Header */}
      <div className="bg-stone-900 text-stone-300 px-4 py-2 text-xs flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-1.5 hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Main Studio Switcher</span>
        </Link>
        <span className="font-mono text-emerald-400">/reset-password</span>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/login"
              className="inline-flex items-center space-x-1.5 text-xs text-stone-500 hover:text-stone-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>

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
              {isRecoveryMode ? 'Create New Password' : 'Reset Your Password'}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              {isRecoveryMode
                ? 'Enter your new patron account password below to regain full access'
                : 'Enter your registered email address to receive password recovery instructions'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {checkingSession ? (
            <div className="py-8 text-center text-xs text-stone-500 flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#2D5A43]" />
              <span>Verifying recovery link...</span>
            </div>
          ) : passwordUpdated ? (
            /* Password Successfully Changed */
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950 font-serif">Password Updated!</h4>
              <p className="text-xs text-emerald-800">
                Your florist account credentials have been securely updated in the database.
              </p>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="mt-2 w-full py-2.5 bg-[#2D5A43] hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-xs"
              >
                Sign In With New Password
              </button>
            </div>
          ) : emailSent ? (
            /* Reset Email Sent Confirmation */
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950 font-serif">Recovery Email Dispatched</h4>
              <p className="text-xs text-emerald-800">
                We sent a password reset link to <strong>{email}</strong>. Please check your inbox and click the link to set a new password.
              </p>
              <div className="pt-2 flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={() => setEmailSent(false)}
                  className="text-xs text-[#2D5A43] font-bold hover:underline cursor-pointer"
                >
                  Send to a different email
                </button>
                <Link
                  href="/login"
                  className="text-xs text-stone-500 hover:text-stone-800 hover:underline"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : isRecoveryMode ? (
            /* Set New Password Form */
            <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-600 mb-1 font-medium">New Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
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

              <div>
                <label className="block text-stone-600 mb-1 font-medium">Confirm New Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  disabled={isLoading}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43] outline-hidden transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#2D5A43] hover:bg-emerald-800 disabled:opacity-70 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password in Database...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Save New Password</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Request Reset Link Form */
            <form onSubmit={handleRequestReset} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-600 mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patron@example.com"
                  disabled={isLoading}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2D5A43] outline-hidden transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#2D5A43] hover:bg-emerald-800 disabled:opacity-70 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to Database...</span>
                  </>
                ) : (
                  <span>Send Password Reset Link</span>
                )}
              </button>
            </form>
          )}

          <div className="text-center text-xs text-stone-500 pt-2 border-t border-stone-100 flex justify-between items-center">
            <Link href="/login" className="text-[#2D5A43] font-bold hover:underline">
              Sign In
            </Link>
            <Link href="/register" className="text-stone-600 hover:text-stone-900 hover:underline">
              Register as New Member
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
