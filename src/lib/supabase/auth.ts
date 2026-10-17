import { createClient } from './client';
import { User, UserRole } from '@/types/user';

export interface AuthSuccessResult {
  user: User;
  session: any;
  requiresConfirmation?: boolean;
}

export interface AuthErrorResult {
  message: string;
  status?: number;
}

/**
 * Sign in an existing florist customer or administrator
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ data: AuthSuccessResult | null; error: AuthErrorResult | null }> {
  try {
    const supabase = createClient();
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error || !data.user) {
      return {
        data: null,
        error: {
          message: error?.message || 'Invalid email or password. Please verify your credentials.',
          status: error?.status
        }
      };
    }

    // Fetch user profile from public.profiles
    let profileData: any = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
      profileData = profile;
    } catch (profileErr) {
      console.warn('Could not retrieve profile immediately:', profileErr);
    }

    // Determine role (database profile takes precedence, with user_metadata or email fallback)
    const isAdmin =
      profileData?.role === 'admin' ||
      data.user.user_metadata?.role === 'admin' ||
      cleanEmail.includes('admin@') ||
      cleanEmail.includes('ron@');

    const assignedRole: UserRole = isAdmin ? 'admin' : (profileData?.role || 'customer');

    const appUser: User = {
      id: data.user.id,
      name:
        profileData?.name ||
        data.user.user_metadata?.name ||
        (isAdmin ? 'Ron (Master Florist)' : cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
      email: data.user.email || cleanEmail,
      role: assignedRole,
      address: profileData?.address || data.user.user_metadata?.address || '12 Magnolia Way, Blossom Hill',
      phone: profileData?.phone || data.user.user_metadata?.phone || '+1 (555) 234-5678'
    };

    // If profile didn't exist in database, upsert it now
    if (!profileData) {
      try {
        await supabase.from('profiles').upsert({
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          role: appUser.role,
          address: appUser.address,
          phone: appUser.phone,
          badge: assignedRole === 'admin' ? 'Master Florist' : 'Bloom Patron'
        });
      } catch (upsertErr) {
        console.warn('Silent profile sync note:', upsertErr);
      }
    }

    // Persist in localStorage for instant offline/storefront hydration
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bloom_crafts_user', JSON.stringify(appUser));
      } catch (storageErr) {
        console.warn('Local storage error:', storageErr);
      }
    }

    return {
      data: {
        user: appUser,
        session: data.session
      },
      error: null
    };
  } catch (err: any) {
    return {
      data: null,
      error: {
        message: err?.message || 'An unexpected error occurred during sign in.'
      }
    };
  }
}

/**
 * Register a new member account with email, password, and patron profile info
 */
export async function signUpWithEmail(params: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
}): Promise<{
  data: { user: User | null; session: any; requiresConfirmation: boolean } | null;
  error: AuthErrorResult | null;
}> {
  try {
    const supabase = createClient();
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.name.trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          name: cleanName,
          phone: params.phone?.trim() || '',
          address: params.address?.trim() || '',
          role: 'customer'
        }
      }
    });

    if (error) {
      return {
        data: null,
        error: {
          message: error.message || 'Unable to complete member registration. Please try again.',
          status: error.status
        }
      };
    }

    // Check if session was returned immediately or email confirmation is pending
    const hasActiveSession = Boolean(data.session && data.user);

    if (hasActiveSession && data.user) {
      const appUser: User = {
        id: data.user.id,
        name: cleanName,
        email: cleanEmail,
        role: 'customer',
        address: params.address?.trim() || '12 Magnolia Way, Blossom Hill',
        phone: params.phone?.trim() || '+1 (555) 234-5678'
      };

      try {
        await supabase.from('profiles').upsert({
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          role: 'customer',
          address: appUser.address,
          phone: appUser.phone,
          badge: 'Bloom Patron'
        });
      } catch (upsertErr) {
        console.warn('Profile sync note:', upsertErr);
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bloom_crafts_user', JSON.stringify(appUser));
        } catch {}
      }

      return {
        data: {
          user: appUser,
          session: data.session,
          requiresConfirmation: false
        },
        error: null
      };
    }

    // Email confirmation required
    return {
      data: {
        user: null,
        session: null,
        requiresConfirmation: true
      },
      error: null
    };
  } catch (err: any) {
    return {
      data: null,
      error: {
        message: err?.message || 'An unexpected error occurred during registration.'
      }
    };
  }
}

/**
 * Dispatch password reset instructions to the given email
 */
export async function sendPasswordResetEmail(
  email: string
): Promise<{ success: boolean; error: AuthErrorResult | null }> {
  try {
    const supabase = createClient();
    const cleanEmail = email.trim().toLowerCase();

    // Determine redirect URL
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://rons-bloom-crafts.vercel.app');

    const redirectTo = `${origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          status: error.status
        }
      };
    }

    return {
      success: true,
      error: null
    };
  } catch (err: any) {
    return {
      success: false,
      error: {
        message: err?.message || 'Failed to send password reset email.'
      }
    };
  }
}

/**
 * Update the user's password once a recovery session or active session is established
 */
export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; error: AuthErrorResult | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          status: error.status
        }
      };
    }

    return {
      success: true,
      error: null
    };
  } catch (err: any) {
    return {
      success: false,
      error: {
        message: err?.message || 'Failed to update password.'
      }
    };
  }
}

/**
 * Sign out the currently active user and clear stored local cache
 */
export async function signOutUser(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Supabase sign out error:', e);
  } finally {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('bloom_crafts_user');
      } catch {}
    }
  }
}

/**
 * Retrieve the active user from Supabase session, syncing with profiles database
 */
export async function getCurrentAuthUser(): Promise<User | null> {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Try fetching profile from profiles table
    let profile: any = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      profile = data;
    } catch {}

    const isAdmin =
      profile?.role === 'admin' ||
      user.user_metadata?.role === 'admin' ||
      user.email?.includes('admin@') ||
      user.email?.includes('ron@');

    const appUser: User = {
      id: user.id,
      name:
        profile?.name ||
        user.user_metadata?.name ||
        (isAdmin ? 'Ron (Master Florist)' : user.email?.split('@')[0] || 'Patron'),
      email: user.email || '',
      role: isAdmin ? 'admin' : (profile?.role || 'customer'),
      address: profile?.address || user.user_metadata?.address || '12 Magnolia Way, Blossom Hill',
      phone: profile?.phone || user.user_metadata?.phone || '+1 (555) 234-5678'
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bloom_crafts_user', JSON.stringify(appUser));
      } catch {}
    }

    return appUser;
  } catch {
    return null;
  }
}
