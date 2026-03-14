'use client'

import Image from 'next/image'
import Link from 'next/link'

interface UseCasesProps {
  title: string
  subtitle: string
  tiles: Array<{ image: string; title: string; blurb: string; href: string }>
}

export default function UseCases({ title, subtitle, tiles }: UseCasesProps) {
  return (
    <section id="use-cases" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 text-center">
            {title}
          </h2>
          <p className="mt-3 text-lg text-muted-foreground text-center max-w-3xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {tiles.map((tile, index) => (
            <div
              key={index}
              className="h-full flex flex-col justify-between rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200"
            >
              {/* Chart Area */}
              <div className="h-[180px] w-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white">
                <Image
                  src={tile.image}
                  alt={`${tile.title} chart`}
                  width={320}
                  height={180}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                />
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-lg font-semibold text-slate-900">
                  {tile.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-6 flex-1">
                  {tile.blurb}
                </p>
                
                {/* Learn More Link */}
                <Link
                  href={tile.href}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center group"
                >
                  Learn more
                  <svg 
                    className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
