import React, { useState } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { X } from 'lucide-react'
import LoginForm from './LoginForm'
import SignUpForm from './SignUpForm'
import ForgotPasswordForm from './ForgotPasswordForm'

interface AuthSplitViewProps {
  mode: 'signin' | 'signup'
  onClose: () => void
  onSuccess: () => void
}

export default function AuthSplitView({ mode, onClose, onSuccess }: AuthSplitViewProps) {
  const [currentMode, setCurrentMode] = useState<'signin' | 'signup' | 'forgot-password'>(mode)

  return (
    <div className="fixed inset-0 z-50 flex bg-brand-navy">
      <div className="relative z-10 flex w-full h-full">
        {/* Left: Marketing panel */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 text-white pl-6 pr-6 sm:pl-12 sm:pr-12 py-10">
          <div>
            <button onClick={onClose} className="text-sm opacity-80 hover:opacity-100 transition-opacity">
              ← Back to home
            </button>
          </div>
          <div className="max-w-2xl ml-auto">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-semibold">DataQA.ai</div>
            </div>
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-snug">
              AI‑Powered Data
              <span className="block text-brand-teal">Visualization Platform</span>
            </h1>
            <p className="mt-6 text-slate-300">
              Turn any dataset into insights with natural‑language Q&A and on‑demand charts. Built to be data‑agnostic so it works with any CSV, Excel or JSON you upload.
            </p>
            <div className="mt-10 flex gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-center">
                <div className="text-lg font-semibold">AI</div>
                <div className="text-slate-300 text-sm">Powered</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400">© {new Date().getFullYear()} DataQA.ai</div>
        </div>

        {/* Right: Auth form */}
        <div className="relative w-full lg:w-1/2 flex items-center justify-center pl-6 pr-6 sm:pl-12 sm:pr-12 py-10 overflow-y-auto bg-brand-bg">
          <div className="absolute top-4 right-4">
            <button 
              onClick={onClose} 
              className="text-brand-text hover:text-brand-primary transition-colors p-2 rounded-lg hover:bg-brand-line/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="w-full max-w-md mr-auto">
            {currentMode !== 'forgot-password' && (
              <div className="mb-6 flex justify-center space-x-2">
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentMode === 'signin' 
                      ? 'bg-brand-primary text-white' 
                      : 'bg-brand-line text-brand-text hover:bg-brand-line/70'
                  }`}
                  onClick={() => setCurrentMode('signin')}
                >
                  Sign in
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentMode === 'signup' 
                      ? 'bg-brand-primary text-white' 
                      : 'bg-brand-line text-brand-text hover:bg-brand-line/70'
                  }`}
                  onClick={() => setCurrentMode('signup')}
                >
                  Create account
                </button>
              </div>
            )}
            <div className="rounded-2xl border border-brand-line bg-brand-card backdrop-blur p-6 shadow-xl">
              {currentMode === 'signin' && (
                <LoginForm 
                  mode={currentMode} 
                  onSuccess={onSuccess} 
                  onClose={onClose} 
                  onSwitchMode={setCurrentMode}
                  onSwitchToForgotPassword={() => setCurrentMode('forgot-password')}
                />
              )}
              {currentMode === 'signup' && (
                <SignUpForm onSuccess={onSuccess} onSwitchToLogin={() => setCurrentMode('signin')} />
              )}
              {currentMode === 'forgot-password' && (
                <ForgotPasswordForm onBackToLogin={() => setCurrentMode('signin')} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
