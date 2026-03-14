'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { track } from '@/lib/track'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = () => {
    track('nav_click', { label: 'sign_out' })
    signOut()
  }

  const handleNavClick = (label: string) => {
    track('nav_click', { label })
  }

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <>
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
      >
        Skip to content
      </a>

      <nav 
        className={`sticky top-0 z-40 w-full transition-all duration-200 ${
          isScrolled 
            ? 'bg-[var(--surface)]/90 backdrop-blur-md border-b border-[#e5e7eb] shadow-sm' 
            : 'bg-[var(--surface)]/80 backdrop-blur-sm border-b border-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 lg:h-18 items-center justify-between">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center space-x-2"
              onClick={() => handleNavClick('logo')}
            >
              <div className="h-8 w-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">DQ</span>
              </div>
              <span className="text-xl font-semibold text-[var(--text)]">DataQA.ai</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-8">
              <Link 
                href="#features" 
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 rounded-lg px-2 py-1"
                onClick={() => handleNavClick('features')}
              >
                Features
              </Link>
              <Link 
                href="#use-cases" 
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 rounded-lg px-2 py-1"
                onClick={() => handleNavClick('use_cases')}
              >
                Use Cases
              </Link>
              <Link 
                href="#pricing" 
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 rounded-lg px-2 py-1"
                onClick={() => handleNavClick('pricing')}
              >
                Pricing
              </Link>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden lg:flex items-center space-x-4">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 rounded-lg px-3 py-2"
                    onClick={() => handleNavClick('dashboard')}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-sm font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 rounded-lg"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                    onClick={() => handleNavClick('sign_in')}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="px-4 py-2 bg-[var(--primary)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                    onClick={() => handleNavClick('get_started')}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg text-[var(--text)] hover:bg-[var(--line)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
              onClick={handleMobileMenuToggle}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className={`block w-5 h-0.5 bg-current transition-all duration-200 ${isMobileMenuOpen ? 'rotate-45 translate-y-1' : ''}`}></span>
                <span className={`block w-5 h-0.5 bg-current transition-all duration-200 mt-1 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-5 h-0.5 bg-current transition-all duration-200 mt-1 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1' : ''}`}></span>
              </div>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md">
              <div className="py-4 space-y-2">
                <Link
                  href="#features"
                  className="block px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--line)] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                  onClick={() => {
                    handleNavClick('features')
                    setIsMobileMenuOpen(false)
                  }}
                >
                  Features
                </Link>
                <Link
                  href="#use-cases"
                  className="block px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--line)] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                  onClick={() => {
                    handleNavClick('use_cases')
                    setIsMobileMenuOpen(false)
                  }}
                >
                  Use Cases
                </Link>
                <Link
                  href="#pricing"
                  className="block px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--line)] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                  onClick={() => {
                    handleNavClick('pricing')
                    setIsMobileMenuOpen(false)
                  }}
                >
                  Pricing
                </Link>
                <div className="border-t border-[var(--line)] pt-4 mt-4">
                  {user ? (
                    <>
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--line)] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                        onClick={() => {
                          handleNavClick('dashboard')
                          setIsMobileMenuOpen(false)
                        }}
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          handleSignOut()
                          setIsMobileMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-medium text-[var(--text)] hover:text-[var(--primary)] hover:bg-[var(--line)] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/sign-in"
                        className="block px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--line)] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                        onClick={() => {
                          handleNavClick('sign_in')
                          setIsMobileMenuOpen(false)
                        }}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/sign-up"
                        className="block px-4 py-2 bg-[var(--primary)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 mx-4"
                        onClick={() => {
                          handleNavClick('get_started')
                          setIsMobileMenuOpen(false)
                        }}
                      >
                        Get Started
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
