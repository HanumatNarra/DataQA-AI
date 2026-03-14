import React from "react";

type Step = {
  id: number;
  title: string;
  blurb: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
};

// Consistent, minimal icon set (all use currentColor; same visual weight)
const UploadIcon: Step["Icon"] = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const AskIcon: Step["Icon"] = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 9h8" />
    <path d="M8 13h6" />
  </svg>
);

const ChartIcon: Step["Icon"] = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M18 20V10" />
    <path d="M12 20V4" />
    <path d="M6 20v-6" />
  </svg>
);

const STEPS: Step[] = [
  { id: 1, title: "Upload or connect", blurb: "Bring CSV, Excel, or JSON. Connectors coming soon.", Icon: UploadIcon },
  { id: 2, title: "Ask in plain English", blurb: "Chat with your data and request charts.", Icon: AskIcon },
  { id: 3, title: "Get answers & charts", blurb: "Share insights and export PNG/CSV.", Icon: ChartIcon },
];

export default function HowItWorksClean() {
  return (
    <section data-section="how" className="relative w-full bg-white py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header stack - unified design system */}
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 text-center">
          How it works
        </h2>
        <p className="mt-3 text-lg text-muted-foreground text-center max-w-3xl mx-auto">
          Get from data to insights in three simple steps
        </p>

        <div className="relative mt-12">
          {/* connector line (lg+) */}
          <div className="hidden lg:block absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-gray-200/50" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch relative">
            {STEPS.map((s) => (
              <div key={s.id} className="relative">
                {/* number badge - positioned in wrapper, not clipped */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-semibold grid place-content-center shadow-md z-10">
                  {s.id}
                </div>

                {/* card - unified design system */}
                <article className="relative rounded-2xl border border-gray-200/80 bg-white shadow-sm p-8 lg:p-10 overflow-visible flex flex-col justify-start transition-shadow hover:shadow-md min-h-[260px]">
                  {/* icon tile - unified design system */}
                  <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <s.Icon className="w-7 h-7" aria-hidden="true" />
                  </div>

                  {/* content - unified design system */}
                  <h3 className="mt-6 text-2xl font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-3 text-base text-gray-600 leading-7">{s.blurb}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
