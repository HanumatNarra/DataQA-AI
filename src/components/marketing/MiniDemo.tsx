'use client'

import Image from 'next/image'

interface MiniDemoProps {
  caption: string
  gif: string
}

const DEMO_SCREENSHOTS = [
  {
    image: "/images/dataset_preview.png",
    alt: "Dataset preview interface",
    caption: "Upload and explore your CSV, Excel, or JSON data."
  },
  {
    image: "/images/data_chat.png", 
    alt: "Data chat interface",
    caption: "Ask questions in plain English and get instant answers."
  },
  {
    image: "/images/chart.png",
    alt: "Generated chart visualization", 
    caption: "Generate charts and summaries you can share."
  }
]

export default function MiniDemo({ caption }: MiniDemoProps) {
  return (
    <section className="bg-gray-50 py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 text-center">
            {caption}
          </h2>
        </div>

        {/* Screenshots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {DEMO_SCREENSHOTS.map((screenshot, index) => (
            <div key={index} className="group">
              {/* Image Card */}
              <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 ease-in-out overflow-hidden">
                <div className="aspect-[4/3] w-full">
                  <Image
                    src={screenshot.image}
                    alt={screenshot.alt}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              {/* Caption */}
              <p className="mt-4 text-base font-medium text-gray-600 leading-6 text-center">
                {screenshot.caption}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
