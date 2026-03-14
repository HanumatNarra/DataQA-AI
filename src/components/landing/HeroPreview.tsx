'use client';
import { chartPalette, series } from '@/lib/chartTheme';

const max = Math.max(...series.map(s => s.value));

function BarMini() {
  return (
    <div className="grid grid-cols-4 gap-4 items-end h-28" role="img" aria-label="Bar chart preview">
      {series.map(s => (
        <div key={s.key} className="rounded-md" style={{
          height: `${Math.max(8, (s.value / max) * 100)}%`,
          background: chartPalette[s.key as keyof typeof chartPalette]
        }} />
      ))}
    </div>
  );
}

function LineMini() {
  // Simple sparkline in SVG (normalized to viewBox 100x40)
  const points = series.map((s, i) => {
    const x = (i / (series.length - 1)) * 100;
    const y = 40 - ((s.value / max) * 36 + 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 40" className="w-full h-28" role="img" aria-label="Line chart preview">
      <polyline fill="none" stroke="#2563EB" strokeWidth="3" points={points} />
      {series.map((s, i) => {
        const x = (i / (series.length - 1)) * 100;
        const y = 40 - ((s.value / max) * 36 + 2);
        return <circle key={s.key} cx={x} cy={y} r="2.8" fill="#2563EB" />;
      })}
    </svg>
  );
}

function PieMini() {
  // Donut pie using SVG arcs
  const total = series.reduce((a, b) => a + b.value, 0);
  let angle = 0;
  const radius = 40, cx = 50, cy = 50, strokeW = 16;

  const arcs = series.map(s => {
    const portion = s.value / total;
    const start = angle;
    const end = angle + portion * Math.PI * 2;
    angle = end;

    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const largeArc = end - start > Math.PI ? 1 : 0;

    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    return (
      <path key={s.key} d={d} stroke={chartPalette[s.key as keyof typeof chartPalette]} strokeWidth={strokeW} fill="none" />
    );
  });

  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 mx-auto" role="img" aria-label="Pie chart preview">
      {arcs}
      {/* hollow center */}
      <circle cx="50" cy="50" r={radius - strokeW/2} fill="transparent" />
    </svg>
  );
}

export default function HeroPreview() {
  return (
    <div
      className="rounded-2xl border shadow-lg/20 p-6 md:p-7"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      <div className="motion-safe:animate-[fadeIn_300ms_ease-out]">
        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
            <BarMini />
            <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Bar</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
            <LineMini />
            <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Line</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
            <PieMini />
            <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Pie</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Chart legend">
        {series.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: chartPalette[s.key as keyof typeof chartPalette] }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Sample chart preview</p>
    </div>
  );
}
