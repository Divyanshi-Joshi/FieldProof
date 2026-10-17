import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * The signature visual: what the index sees (one season total) next to
 * what the field lived through (daily rain, with the dry spell landing on flowering).
 * Values on the landing page are illustrative and labelled as such.
 */

const DAYS = 120;
const FLOWER: [number, number] = [58, 82];
const DRY: [number, number] = [56, 76]; // 21 days

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeSeason(total: number): number[] {
  const rnd = seeded(42);
  const raw = Array.from({ length: DAYS }, (_, d) => {
    if (d >= DRY[0] && d <= DRY[1]) return 0;
    const wet = d < DRY[0] ? 0.42 : 0.5; // late rains arrive after flowering
    if (rnd() > wet) return 0;
    const base = d > DRY[1] ? 1.5 : 1;
    return (0.5 + rnd() * 2.2) * base;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => (v / sum) * total);
}

const MONTHS = [
  { d: 0, l: 'Mar' }, { d: 31, l: 'Apr' }, { d: 61, l: 'May' }, { d: 92, l: 'Jun' },
];

interface Props {
  seasonTotal?: number;
  trigger?: number;
  animate?: boolean;
}

export const SeasonChart: React.FC<Props> = ({ seasonTotal = 341, trigger = 290, animate = true }) => {
  const rain = useMemo(() => makeSeason(seasonTotal), [seasonTotal]);
  const max = Math.max(...rain);

  // Draw at the real pixel width so labels keep their size on phones
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 200 : 230, padL = 4, padR = 4, top = 34, base = H - 62;
  const bw = (W - padL - padR) / DAYS;
  const x = (d: number) => padL + d * bw;
  const y = (mm: number) => base - (mm / max) * (base - top - 6);

  const gaugeMax = Math.max(seasonTotal, trigger) * 1.25;
  const pct = (v: number) => `${(v / gaugeMax) * 100}%`;

  return (
    <figure className="panel overflow-hidden" aria-labelledby="season-cap">
      {/* What the index sees */}
      <div className="border-b border-line p-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-semibold">What the index sees</p>
          <p className="text-sm text-muted">one number for the season</p>
        </div>
        <div className="relative mt-4 h-9 rounded bg-sunk">
          <div
            className="absolute inset-y-0 left-0 flex items-center justify-end rounded bg-rain pr-3 text-sm font-semibold text-white"
            style={{ width: pct(seasonTotal) }}
          >
            {seasonTotal} mm
          </div>
          <div className="absolute -bottom-1 -top-1 w-0.5 bg-ink" style={{ left: pct(trigger) }} />
        </div>
        <div className="relative mt-1.5 h-5 text-xs text-muted">
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pct(trigger) }}>
            pays below {trigger} mm
          </span>
        </div>
        <p className="mt-2 text-sm">
          Above the trigger, so <strong>the index does not pay.</strong>
        </p>
      </div>

      {/* What the field lived through */}
      <div className="p-5 pb-3">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-semibold">What the field lived through</p>
          <p className="text-sm text-muted">daily rain</p>
        </div>
        <div ref={wrap} className="mt-2 w-full">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full" role="img"
          aria-label="Daily rainfall over the season. A 21-day period with no rain falls during flowering.">
          <rect x={x(FLOWER[0])} y={top - 22} width={(FLOWER[1] - FLOWER[0]) * bw} height={base - top + 22} fill="#F2DD8C" opacity="0.55" rx="3" />
          <text x={x(FLOWER[0]) + 8} y={top - 7} fontSize="13" fill="#5C4B0F" fontWeight="600">Flowering</text>

          {rain.map((mm, d) =>
            mm > 0 ? (
              <rect
                key={d}
                className={animate ? 'bar-grow' : undefined}
                style={animate ? { animationDelay: `${d * 7}ms` } : undefined}
                x={x(d) + 0.6}
                y={y(mm)}
                width={Math.max(1, bw - 1.2)}
                height={base - y(mm)}
                fill="#3A6EA5"
                rx="1"
              />
            ) : null,
          )}
          <line x1={padL} x2={W - padR} y1={base} y2={base} stroke="#8A968D" strokeWidth="1" />
          {MONTHS.map((m) => (
            <text key={m.l} x={x(m.d)} y={base + 18} fontSize="12" fill="#56655B">{m.l}</text>
          ))}

          <g className={animate ? 'reveal-late' : undefined}>
            <path
              d={`M${x(DRY[0])},${base + 30} v8 H${x(DRY[1] + 1)} v-8`}
              fill="none" stroke="#B45309" strokeWidth="2"
            />
            <text x={(x(DRY[0]) + x(DRY[1] + 1)) / 2} y={base + 58} fontSize="14" fontWeight="700" fill="#7A3A06" textAnchor="middle">
              21 days, no rain
            </text>
          </g>
        </svg>
        </div>
        <figcaption id="season-cap" className="pb-2 text-sm text-muted">
          The dry spell lands on flowering, when maize needs water most. The rain that followed came too late.
          <span className="mt-1 block text-xs text-faint">Illustrative season based on the example in our project brief.</span>
        </figcaption>
      </div>
    </figure>
  );
};
