'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import BrandPanel from '@/components/auth/BrandPanel';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Successful sign in: navigate immediately. useAuth listener will populate state.
      if (data.user) {
        router.replace('/dashboard');
        // Safety fallback: force navigation after short delay if still here
        setTimeout(() => {
          try { router.replace('/dashboard'); } catch {}
        }, 300);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err: any) {
      console.error('[SignIn] Sign in error:', err);
      setError(err.message || 'Invalid login credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Left Side - Brand Panel */}
      <BrandPanel />
      
      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center px-8 lg:px-12">
        <div className="w-full max-w-md rounded-2xl border p-8 shadow-lg"
             style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-[var(--primary)] rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              Welcome Back
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Sign in to your account
            </p>
          </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            style={{ 
              background: 'var(--surface-2)', 
              borderColor: 'var(--line)', 
              color: 'var(--text)' 
            }}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full px-4 py-3 pr-12 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              style={{ 
                background: 'var(--surface-2)', 
                borderColor: 'var(--line)', 
                color: 'var(--text)' 
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link 
            href="/forgot-password"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Forgot your password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-semibold transition-opacity disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white' }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>

        <div className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {"Don't have an account?"}{' '}
          <Link 
            href="/sign-up"
            className="font-medium hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Sign up
          </Link>
        </div>
      </form>
        </div>
      </div>
    </>
  );
}
