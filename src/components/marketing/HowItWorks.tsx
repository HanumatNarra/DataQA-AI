'use client'

import Image from 'next/image'

interface HowItWorksProps {
  title: string
  subtitle: string
  steps: Array<{ icon: string; title: string; blurb: string }>
}

export default function HowItWorks({ title, subtitle, steps }: HowItWorksProps) {
  return (
    <section id="features" className="py-20 bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text)] mb-4">
            {title}
          </h2>
          <p className="text-xl text-[var(--text-muted)] max-w-3xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group"
            >
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-[var(--primary)] text-white rounded-full flex items-center justify-center font-bold text-lg z-10">
                {index + 1}
              </div>

              {/* Step Card */}
              <div className="relative bg-[var(--bg)] border border-[var(--line)] rounded-2xl p-8 pt-12 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                {/* Icon */}
                <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center mb-6">
                  <Image
                    src={step.icon}
                    alt={`${step.title} icon`}
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-[var(--text)] mb-3">
                  {step.title}
                </h3>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  {step.blurb}
                </p>
              </div>

              {/* Connector Line (except for last step) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-[var(--line)] transform -translate-y-1/2 z-0"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
