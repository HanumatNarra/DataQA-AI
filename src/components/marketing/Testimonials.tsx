'use client'

interface TestimonialsProps {
  title: string
  subtitle: string
  items: Array<{ quote: string; name: string; role: string; avatar?: string }>
}

export default function Testimonials({ title, subtitle, items }: TestimonialsProps) {
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

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((testimonial, index) => (
            <figure key={index} className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-8 shadow-lg">
              {/* Quote */}
              <blockquote className="mb-6">
                <p className="text-[var(--text)] leading-relaxed italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </blockquote>
              
              {/* Author */}
              <figcaption className="flex items-center space-x-3">
                {testimonial.avatar ? (
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                    <span className="text-[var(--primary)] font-semibold text-lg">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                )}
                
                <div>
                  <cite className="not-italic font-semibold text-[var(--text)]">
                    {testimonial.name}
                  </cite>
                  <p className="text-sm text-[var(--text-muted)]">
                    {testimonial.role}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
