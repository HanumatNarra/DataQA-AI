import React from "react";

type Benefit = {
  title: string;
  blurb: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
};

const BulbIcon: Benefit["Icon"] = (p) => (<svg viewBox="0 0 24 24" {...p}><path d="M12 3a6 6 0 0 0-3 11.2V17h6v-2.8A6 6 0 0 0 12 3Z" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="18" width="6" height="2.5" rx="1.25" fill="currentColor"/></svg>);
const BarsIcon: Benefit["Icon"] = (p) => (<svg viewBox="0 0 24 24" {...p}><rect x="4" y="11" width="3" height="7" rx="1" fill="currentColor"/><rect x="10.5" y="7" width="3" height="11" rx="1" fill="currentColor"/><rect x="17" y="14" width="3" height="4" rx="1" fill="currentColor"/></svg>);
const FlagIcon: Benefit["Icon"] = (p) => (<svg viewBox="0 0 24 24" {...p}><path d="M5 4v16" stroke="currentColor" strokeWidth="1.5"/><path d="M5 5h10l-1.5 3 1.5 3H5" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>);
const ExportIcon: Benefit["Icon"] = (p) => (<svg viewBox="0 0 24 24" {...p}><path d="M12 4v10" stroke="currentColor" strokeWidth="1.5"/><path d="M9 7l3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="5" y="14" width="14" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>);
const FilesIcon: Benefit["Icon"] = (p) => (<svg viewBox="0 0 24 24" {...p}><rect x="5" y="5" width="10" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>);
const ShieldIcon: Benefit["Icon"] = (p) => (<svg viewBox="0 0 24 24" {...p}><path d="M12 3l7 3v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3Z" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>);

const BENEFITS: Benefit[] = [
  { title: "Instant insights", blurb: "AI-powered analysis reveals patterns you might miss.", Icon: BulbIcon },
  { title: "Charts on demand", blurb: "Generate beautiful visualizations with natural language.", Icon: BarsIcon },
  { title: "Explain results clearly", blurb: "Get human-readable explanations of your data.", Icon: FlagIcon },
  { title: "Export & share", blurb: "Download charts as PNG or data as CSV.", Icon: ExportIcon },
  { title: "Works with common files", blurb: "CSV, Excel, JSON, and PDF support out of the box.", Icon: FilesIcon },
  { title: "Private by design", blurb: "Your data stays in your project with enterprise security.", Icon: ShieldIcon },
];

export default function BenefitsClean() {
  return (
    <section data-section="benefits" className="relative w-full bg-slate-50/60 py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header stack - unified design system */}
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 text-center">
          Why DataQA.ai?
        </h2>
        <p className="mt-3 text-lg text-muted-foreground text-center max-w-3xl mx-auto">
          Everything you need to understand your data, instantly
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-12">
          {BENEFITS.map((b, i) => (
            <article
              key={b.title}
              className={[
                "rounded-2xl border border-gray-200/80 bg-white shadow-sm p-8 lg:p-10 flex flex-col items-start min-h-[260px] transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                i % 2 === 1 ? "bg-slate-100/40" : "",
              ].join(" ")}
            >
              {/* icon tile - unified design system */}
              <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <b.Icon className="w-7 h-7" aria-hidden="true" />
              </div>
              
              {/* content - unified design system */}
              <h3 className="mt-6 text-2xl font-semibold text-gray-900">{b.title}</h3>
              <p className="mt-3 text-base text-gray-600 leading-7">{b.blurb}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
