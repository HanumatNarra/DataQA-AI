'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import BrandPanel from '@/components/auth/BrandPanel';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Successful sign up
        router.push('/dashboard');
        router.refresh(); // Refresh to update auth state
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { score: 0, label: '', color: '' };
    if (password.length < 8) return { score: 1, label: 'Weak', color: '#EF4444' };
    if (password.length < 12) return { score: 2, label: 'Fair', color: '#F59E0B' };
    if (password.length < 16) return { score: 3, label: 'Good', color: '#14B8A6' };
    return { score: 4, label: 'Strong', color: '#22C55E' };
  };

  const passwordStrength = getPasswordStrength(password);

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
              Create Account
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Join us to start analyzing your data
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
          <label htmlFor="fullName" className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
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
              placeholder="Create a password"
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
          
          {/* Password strength indicator */}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className="h-1 w-8 rounded-full transition-colors"
                      style={{
                        background: level <= passwordStrength.score ? passwordStrength.color : 'var(--line)'
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Use at least 8 characters
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
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
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Password match indicator */}
          {confirmPassword.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              {password === confirmPassword ? (
                <>
                  <CheckIcon className="w-4 h-4" style={{ color: '#22C55E' }} />
                  <span className="text-xs" style={{ color: '#22C55E' }}>Passwords match</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: '#EF4444' }} />
                  <span className="text-xs" style={{ color: '#EF4444' }}>{"Passwords don't match"}</span>
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || password !== confirmPassword}
          className="w-full py-3 px-4 rounded-xl font-semibold transition-opacity disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white' }}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link 
            href="/sign-in"
            className="font-medium hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Sign in
          </Link>
        </div>
      </form>
        </div>
      </div>
    </>
  );
}
