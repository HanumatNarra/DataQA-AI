import { Metadata } from 'next'
import { landingContent } from '@/content/landing'
import Navbar from '@/components/marketing/Navbar'
import Hero from '@/components/marketing/Hero'
import HowItWorksClean from '@/components/marketing/HowItWorksClean'
import BenefitsClean from '@/components/marketing/BenefitsClean'
import UseCases from '@/components/marketing/UseCases'
import MiniDemo from '@/components/marketing/MiniDemo'
import SecurityStrip from '@/components/marketing/SecurityStrip'
import Testimonials from '@/components/marketing/Testimonials'
import PricingTeaser from '@/components/marketing/PricingTeaser'
import Footer from '@/components/marketing/Footer'

export const metadata: Metadata = {
  title: landingContent.meta.title,
  description: landingContent.meta.description,
  openGraph: {
    title: landingContent.meta.title,
    description: landingContent.meta.description,
    images: [landingContent.meta.ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: landingContent.meta.title,
    description: landingContent.meta.description,
    images: [landingContent.meta.ogImage],
  },
}

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      
      <main>
        <Hero {...landingContent.hero} />
        <HowItWorksClean />
        <BenefitsClean />
        <UseCases {...landingContent.useCases} />
        <MiniDemo {...landingContent.miniDemo} />
        <SecurityStrip {...landingContent.security} />
        <Testimonials {...landingContent.testimonials} />
        <PricingTeaser {...landingContent.pricingTeaser} />
      </main>
      
      <Footer />
    </div>
  )
}
