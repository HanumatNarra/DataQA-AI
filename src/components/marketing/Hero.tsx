'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { track } from '@/lib/track'

interface HeroProps {
  title: string
  subtitle: string
  ctaPrimary: { label: string; id: string }
  ctaSecondary: { label: string; id: string }
  chips: Array<{ label: string; id: string }>
  image: { src: string; alt: string }
  connectors: Array<{ name: string; src: string; alt: string }>
}

export default function Hero({
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  chips,
  image,
  connectors
}: HeroProps) {
  const [isVariantB, setIsVariantB] = useState(false)

  // Check for A/B variant
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('v') === 'b') {
        setIsVariantB(true)
        track('ab_variant', { variant: 'b' })
      }
    }
  }, [])

  const handleChipClick = (chipId: string, label: string) => {
    track('chip_click', { label, chip_id: chipId })
  }

  const handlePrimaryCTA = () => {
    track('cta_click', { location: 'hero', cta: 'get_started' })
  }

  const handleSecondaryCTA = () => {
    track('demo_open', { location: 'hero' })
  }

  return (
    <section className="relative overflow-hidden bg-[var(--bg)] py-24 sm:py-32" id="main-content">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Content Stack */}
          <div className="max-w-xl space-y-6">
            <h1 className="text-[clamp(40px,6vw,72px)] font-bold text-[var(--text)] leading-[0.9] tracking-tight">
              {isVariantB ? "Turn any CSV into answers in seconds." : title}
            </h1>
            
            <p className="text-lg sm:text-xl text-[var(--text-muted)] leading-relaxed max-w-[70ch]">
              {isVariantB ? "Ask in plain English. Get charts and summaries instantly—no SQL." : subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/sign-up"
                onClick={handlePrimaryCTA}
                className="inline-flex items-center justify-center px-8 py-4 bg-[var(--primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                aria-label="Get Started: create your free workspace"
              >
                {ctaPrimary.label}
              </Link>
              
              <button
                onClick={handleSecondaryCTA}
                className="inline-flex items-center justify-center px-8 py-4 border border-[var(--line)] text-[var(--text)] font-semibold rounded-xl hover:bg-[var(--line)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                aria-label="Watch Demo: see DataQA.ai in action"
              >
                {ctaSecondary.label}
              </button>
            </div>

            {/* Prompt Chips */}
            <div className="space-y-3 pt-4">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                Try asking:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {chips.map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => handleChipClick(chip.id, chip.label)}
                    className="px-4 py-2 bg-[var(--surface)] border border-[var(--line)] text-[var(--text)] text-sm rounded-lg hover:bg-[var(--line)] hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                    aria-pressed="false"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Connector Strip */}
            <div className="flex items-center space-x-6 pt-5">
              <span className="text-sm font-medium text-[var(--text-muted)]">Works with:</span>
              <div className="flex items-center space-x-4">
                {connectors.map((connector) => (
                  <div key={connector.name} className="flex items-center space-x-2">
                    <Image
                      src={connector.src}
                      alt={connector.alt}
                      width={24}
                      height={24}
                      className="w-6 h-6"
                      aria-label={connector.alt}
                    />
                    <span className="text-sm text-[var(--text-muted)]">{connector.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Product Card */}
          <div className="relative">
            <div className="relative rounded-2xl bg-white border border-[#e5e7eb] shadow-lg overflow-hidden">
              {/* Card Chrome */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f3f4f6] bg-[#fafafa]">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-[#6b7280] font-medium">DataQA.ai</span>
                  <button 
                    className="px-2 py-1 text-xs bg-[#f3f4f6] text-[#374151] rounded hover:bg-[#e5e7eb] transition-colors cursor-not-allowed"
                    disabled
                    aria-label="Download chart (demo only)"
                  >
                    Download
                  </button>
                </div>
              </div>
              
              {/* Product Image */}
              <div className="p-6">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={600}
                  height={450}
                  className="w-full h-auto rounded-lg"
                  priority
                  fetchPriority="high"
                />
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-[var(--primary)]/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-[var(--primary)]/5 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
