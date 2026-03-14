export interface LandingContent {
  hero: {
    title: string
    subtitle: string
    ctaPrimary: { label: string; id: string }
    ctaSecondary: { label: string; id: string }
    chips: Array<{ label: string; id: string }>
    image: { src: string; alt: string }
    connectors: Array<{ name: string; src: string; alt: string }>
  }
  howItWorks: {
    title: string
    subtitle: string
    steps: Array<{ icon: string; title: string; blurb: string }>
  }
  benefits: {
    title: string
    subtitle: string
    items: Array<{ icon: string; title: string; blurb: string }>
  }
  useCases: {
    title: string
    subtitle: string
    tiles: Array<{ image: string; title: string; blurb: string; href: string }>
  }
  miniDemo: {
    caption: string
    gif: string
  }
  security: {
    title: string
    subtitle: string
    bullets: string[]
    learnMoreHref: string
  }
  testimonials: {
    title: string
    subtitle: string
    items: Array<{ quote: string; name: string; role: string; avatar?: string }>
  }
  pricingTeaser: {
    title: string
    subtitle: string
    plans: Array<{ name: string; price: string; features: string[]; cta: { label: string; href: string } }>
  }
  meta: {
    title: string
    description: string
    ogImage: string
  }
}

export const landingContent: LandingContent = {
  hero: {
    title: "Ask questions about your data in plain English.",
    subtitle: "Upload a CSV, Excel, or JSON and get answers and charts instantly—no SQL required.",
    ctaPrimary: { label: "Get Started", id: "get-started" },
    ctaSecondary: { label: "Watch Demo", id: "watch-demo" },
    chips: [
      { label: "How many orders per status?", id: "orders-status" },
      { label: "Show customers by country", id: "customers-country" },
      { label: "Revenue trends over time", id: "revenue-trends" }
    ],
    image: { src: "/images/app-generated-pie.png", alt: "DataQA.ai dashboard showing generated charts and insights" },
    connectors: [
      { name: "CSV", src: "/images/connector-csv.svg", alt: "CSV file format support" },
      { name: "Excel", src: "/images/connector-excel.svg", alt: "Excel file format support" },
      { name: "JSON", src: "/images/connector-json.svg", alt: "JSON file format support" },
      { name: "Database", src: "/images/connector-supabase.svg", alt: "Database connection support" }
    ]
  },
  howItWorks: {
    title: "How it works",
    subtitle: "Get from data to insights in three simple steps",
    steps: [
      {
        icon: "/images/step-connect.svg",
        title: "Upload or connect",
        blurb: "Bring CSV, Excel, or JSON. Connectors coming soon."
      },
      {
        icon: "/images/step-ask.svg",
        title: "Ask in plain English",
        blurb: "Chat with your data and request charts."
      },
      {
        icon: "/images/step-results.svg",
        title: "Get answers & charts",
        blurb: "Share insights and export PNG/CSV."
      }
    ]
  },
  benefits: {
    title: "Why DataQA.ai?",
    subtitle: "Everything you need to understand your data, instantly",
    items: [
      {
        icon: "/images/benefit-insights.svg",
        title: "Instant insights",
        blurb: "AI-powered analysis reveals patterns you might miss"
      },
      {
        icon: "/images/benefit-charts.svg",
        title: "Charts on demand",
        blurb: "Generate beautiful visualizations with natural language"
      },
      {
        icon: "/images/benefit-explain.svg",
        title: "Explain results clearly",
        blurb: "Get human-readable explanations of your data"
      },
      {
        icon: "/images/benefit-export.svg",
        title: "Export & share",
        blurb: "Download charts as PNG or data as CSV"
      },
      {
        icon: "/images/benefit-files.svg",
        title: "Works with common files",
        blurb: "CSV, Excel, JSON, and PDF support out of the box"
      },
      {
        icon: "/images/benefit-privacy.svg",
        title: "Private by design",
        blurb: "Your data stays in your project with enterprise security"
      }
    ]
  },
  useCases: {
    title: "Use cases",
    subtitle: "Perfect for teams that need data insights fast",
    tiles: [
      {
        image: "/images/finance_card.png",
        title: "Finance & Accounting",
        blurb: "Track revenue, expenses, and financial performance",
        href: "#signup"
      },
      {
        image: "/images/ecommerce_card.png",
        title: "E-commerce",
        blurb: "Analyze sales, customer behavior, and inventory",
        href: "#signup"
      },
      {
        image: "/images/hr_card.png",
        title: "Human Resources",
        blurb: "Monitor employee metrics and team performance",
        href: "#signup"
      },
      {
        image: "/images/marketing_card.png",
        title: "Marketing",
        blurb: "Track campaign performance and ROI metrics",
        href: "#signup"
      },
      {
        image: "/images/operations_card.png",
        title: "Operations",
        blurb: "Monitor KPIs and operational efficiency",
        href: "#signup"
      },
      {
        image: "/images/research_card.png",
        title: "Research & Analytics",
        blurb: "Explore datasets and discover insights",
        href: "#signup"
      }
    ]
  },
  miniDemo: {
    caption: "See DataQA.ai in action",
    gif: "/images/demo-loop.gif"
  },
  security: {
    title: "Enterprise-grade security",
    subtitle: "Your data is protected with industry-leading security measures",
    bullets: [
      "Your files stay in your project.",
      "Row-level security (Supabase).",
      "Optional data retention.",
      "Encryption in transit."
    ],
    learnMoreHref: "/security"
  },
  testimonials: {
    title: "Trusted by data teams",
    subtitle: "See what our users are saying",
    items: [
      {
        quote: "DataQA.ai transformed how we analyze customer data. What used to take hours now takes minutes.",
        name: "Sarah Chen",
        role: "Data Analyst, TechCorp"
      },
      {
        quote: "The natural language interface is incredible. Our non-technical team members can now get insights independently.",
        name: "Marcus Rodriguez",
        role: "Head of Analytics, GrowthCo"
      },
      {
        quote: "Finally, a tool that makes data analysis accessible to everyone. Game changer for our business intelligence.",
        name: "Emily Watson",
        role: "Product Manager, DataFlow"
      }
    ]
  },
  pricingTeaser: {
    title: "Simple, transparent pricing",
    subtitle: "Start free, scale as you grow",
    plans: [
      {
        name: "Free",
        price: "$0/month",
        features: ["Up to 5 files", "Basic charts", "Community support"],
        cta: { label: "Get Started Free", href: "/sign-up" }
      },
      {
        name: "Pro",
        price: "Coming Soon",
        features: ["Unlimited files", "Advanced charts", "Priority support", "Team collaboration"],
        cta: { label: "Join Waitlist", href: "#waitlist" }
      }
    ]
  },
  meta: {
    title: "DataQA.ai - Ask Questions About Your Data in Plain English",
    description: "Upload CSV, Excel, or JSON files and get instant answers and charts. No SQL required. AI-powered data analysis made simple.",
    ogImage: "/images/og-image.png"
  }
}
