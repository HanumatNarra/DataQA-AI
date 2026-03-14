'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  GlobeAltIcon,
  SparklesIcon,
  ChartPieIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import ThemeToggle from './ui/ThemeToggle';
import HeroPreview from './landing/HeroPreview';

interface LandingPageProps {
  onSignIn?: () => void;
  onSignUp?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onSignUp }) => {

  const features = [
    {
      icon: <SparklesIcon className="w-8 h-8" />,
      title: "Natural Language Q&A",
      description: "Ask questions about your data in plain English. No SQL or coding knowledge required.",
      color: "bg-[#2563EB]"
    },
    {
      icon: <ChartBarIcon className="w-8 h-8" />,
      title: "Smart Visualizations",
      description: "Automatically generate beautiful charts and graphs based on your questions and data patterns.",
      color: "bg-[#14B8A6]"
    },
    {
      icon: <GlobeAltIcon className="w-8 h-8" />,
      title: "Universal Data Support",
      description: "Works with CSV, Excel, JSON, and more. Upload any file format and start analyzing immediately.",
      color: "bg-[#6366F1]"
    }
  ];

  const chartTypes = [
    { icon: <ChartBarIcon className="w-6 h-6" />, name: "Bar Charts", color: "text-brand-primary" },
    { icon: <PresentationChartLineIcon className="w-6 h-6" />, name: "Line Charts", color: "text-brand-teal" },
    { icon: <ChartPieIcon className="w-6 h-6" />, name: "Pie Charts", color: "text-brand-primary" },
    { icon: <DocumentTextIcon className="w-6 h-6" />, name: "Area Charts", color: "text-brand-teal" }
  ];



  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--line)] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-[var(--text)]">
                DataQA.ai
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link
                href="/sign-in"
                className="rounded-xl px-4 py-2 font-medium border border-[var(--line)] text-[var(--text)] hover:bg-[color:rgb(255_255_255/0.02)] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="bg-[var(--primary)] text-white rounded-xl px-4 py-2 font-semibold hover:opacity-95 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-24 pb-28 md:pt-24 md:pb-28 pt-16 pb-20">
        <div className="text-center">
          <div className="inline-block rounded-full px-3 py-1 text-xs font-semibold bg-[color:rgb(20_184_166/0.12)] text-[var(--accent)] border border-[color:rgb(20_184_166/0.25)] mb-6">
            AI-powered analysis
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-[var(--text)] text-center mb-6">
            Ask questions about your data
            <span className="block text-[var(--accent)]">in plain English</span>
          </h1>
          <p className="mt-5 text-lg md:text-xl text-[var(--text-muted)] max-w-3xl mx-auto text-center mb-8">
            Upload any CSV, Excel, or JSON file and start asking questions in natural language. 
            Get intelligent answers, generate beautiful charts, and discover insights instantly. No coding required.
          </p>
          
          {/* CTA Row */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="rounded-2xl px-6 py-3.5 bg-[var(--primary)] text-white font-semibold shadow-sm hover:opacity-95 focus:ring-2 focus:ring-[color:rgb(37_99_235/0.35)] transition-colors"
            >
              Get started free
            </Link>
            <Link
              href="/sign-in"
              className="rounded-2xl px-6 py-3.5 border border-[var(--line)] text-[var(--text)] bg-transparent hover:bg-[color:rgb(255_255_255/0.02)] transition-colors"
            >
              Sign in
            </Link>
          </div>
          
          {/* Try asking section */}
          <div className="mt-10 text-center">
            <p className="text-sm text-[var(--text-muted)]">Try asking:</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 px-4">
              {[
                "How many orders per status?",
                "Show customers by country",
                "Revenue trends over time",
              ].map((query, index) => (
                <span 
                  key={index} 
                  className="rounded-xl px-4 py-2 text-sm border border-[var(--line)] text-[var(--text)] bg-[var(--surface)] hover:bg-[color:rgb(255_255_255/0.03)] transition-colors min-h-[38px] flex items-center"
                >
                  {query}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hero Preview Card */}
      <section className="max-w-4xl mx-auto px-4 mb-20">
        <HeroPreview />
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="rounded-2xl p-8 border border-[var(--line)] bg-[var(--surface)] shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                <div className="text-white">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text)] mb-3">{feature.title}</h3>
              <p className="text-[var(--text-muted)] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">© 2024 DataQA.ai. All rights reserved.</span>
            <div className="flex gap-6 text-sm text-[var(--text-muted)]">
              <a href="#" className="hover:text-[var(--primary)] transition-colors">Features</a>
              <a href="#" className="hover:text-[var(--primary)] transition-colors">Pricing</a>
              <a href="#" className="hover:text-[var(--primary)] transition-colors">Documentation</a>
            </div>
          </div>
        </div>
      </footer>


    </div>
  );
};

export default LandingPage;