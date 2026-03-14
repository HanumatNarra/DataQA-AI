'use client'

import Image from 'next/image'

interface BenefitsGridProps {
  title: string
  subtitle: string
  items: Array<{ icon: string; title: string; blurb: string }>
}

export default function BenefitsGrid({ title, subtitle, items }: BenefitsGridProps) {
  return (
    <section className="py-20 bg-[var(--bg)]">
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

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center mb-6">
                <Image
                  src={item.icon}
                  alt={`${item.title} icon`}
                  width={28}
                  height={28}
                  className="w-7 h-7"
                />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-[var(--text)] mb-3">
                {item.title}
              </h3>
              <p className="text-[var(--text-muted)] leading-relaxed">
                {item.blurb}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
