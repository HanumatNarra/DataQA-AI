import Link from 'next/link';
import { 
  ChartBarIcon, 
  SparklesIcon, 
  GlobeAltIcon,
  UserGroupIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function BrandPanel() {
  const features = [
    {
      icon: <SparklesIcon className="w-5 h-5" />,
      label: "AI Powered",
      color: "bg-gradient-to-r from-purple-500 to-blue-500"
    },
    {
      icon: <ChartBarIcon className="w-5 h-5" />,
      label: "50+ Chart Types",
      color: "bg-gradient-to-r from-blue-400 to-cyan-400"
    },
    {
      icon: <UserGroupIcon className="w-5 h-5" />,
      label: "Teams Collaboration",
      color: "bg-gradient-to-r from-green-400 to-emerald-400"
    }
  ];

  return (
    <div className="flex-1 flex flex-col justify-center px-12 lg:px-16 xl:px-20">
      {/* Back to home link */}
      <Link 
        href="/"
        className="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-80 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to home
      </Link>

      {/* Brand Logo */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-end gap-1">
            <div className="w-3 h-8 bg-gradient-to-t from-purple-500 to-blue-500 rounded-sm"></div>
            <div className="w-3 h-12 bg-gradient-to-t from-purple-500 to-blue-500 rounded-sm"></div>
            <div className="w-3 h-16 bg-gradient-to-t from-purple-500 to-blue-500 rounded-sm"></div>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            DataQA.ai
          </span>
        </div>
      </div>

      {/* Main Heading */}
      <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6">
        <span style={{ color: 'var(--text)' }}>AI-Powered Data</span>
        <br />
        <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Visualization Platform
        </span>
      </h1>

      {/* Description */}
      <p className="text-lg lg:text-xl text-[var(--text-muted)] max-w-2xl mb-12 leading-relaxed">
        Transform your data into compelling stories with AI assistance. Perfect for analysts, 
        researchers, and business users who need professional insights fast.
      </p>

      {/* Feature Pills */}
      <div className="flex flex-wrap gap-3 mb-12">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2 ${feature.color}`}
          >
            {feature.icon}
            {feature.label}
          </div>
        ))}
      </div>

      {/* Additional Benefits */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0"></div>
          <p className="text-[var(--text-muted)]">
            Upload any CSV, Excel, or JSON file and start asking questions in natural language
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0"></div>
          <p className="text-[var(--text-muted)]">
            Get intelligent answers, generate beautiful charts, and discover insights instantly
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0"></div>
          <p className="text-[var(--text-muted)]">
            No coding required - just ask questions and let AI do the heavy lifting
          </p>
        </div>
      </div>
    </div>
  );
}
