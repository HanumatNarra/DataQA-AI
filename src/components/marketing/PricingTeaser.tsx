'use client'

import Link from 'next/link'
import { track } from '@/lib/track'

interface PricingTeaserProps {
  title: string
  subtitle: string
  plans: Array<{ name: string; price: string; features: string[]; cta: { label: string; href: string } }>
}

export default function PricingTeaser({ title, subtitle, plans }: PricingTeaserProps) {
  const handleSignupClick = (planName: string) => {
    track('signup_submit', { location: 'pricing_teaser', plan: planName })
  }

  return (
    <section id="pricing" className="py-20 bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text)] mb-4">
            {title}
          </h2>
          <p className="text-xl text-[var(--text-muted)] max-w-3xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-[var(--bg)] border rounded-2xl p-8 shadow-lg ${
                plan.name === 'Free' 
                  ? 'border-[var(--line)]' 
                  : 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20'
              }`}
            >
              {/* Plan Badge */}
              {plan.name === 'Pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-[var(--primary)] text-white px-4 py-1 rounded-full text-sm font-medium">
                    Coming Soon
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-[var(--text)] mb-2">
                  {plan.name}
                </h3>
                <div className="text-4xl font-bold text-[var(--text)] mb-1">
                  {plan.price}
                </div>
                {plan.name === 'Free' && (
                  <p className="text-sm text-[var(--text-muted)]">No credit card required</p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-[var(--primary)]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-[var(--text)]">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <div className="text-center">
                <Link
                  href={plan.cta.href}
                  onClick={() => handleSignupClick(plan.name)}
                  className={`inline-flex items-center justify-center w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    plan.name === 'Free'
                      ? 'bg-[var(--primary)] text-white hover:opacity-90 focus:ring-[var(--primary)] focus:ring-offset-[var(--bg)]'
                      : 'bg-[var(--line)] text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  {plan.cta.label}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12">
          <p className="text-[var(--text-muted)] mb-4">
            Need enterprise features or custom pricing?
          </p>
          <Link
            href="#contact"
            className="text-[var(--primary)] hover:text-[var(--primary)]/80 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] rounded-lg px-4 py-2"
          >
            Contact us
          </Link>
        </div>
      </div>
    </section>
  )
}
