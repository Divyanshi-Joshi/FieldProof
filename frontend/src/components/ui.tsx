import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { GROUP_TONE, OutcomeGroup } from '../lib/outcomes';

export type Verdict = 'loss' | 'mild' | 'none' | 'unclear' | 'na';

export const VERDICT_STYLE: Record<Verdict, { chip: string; dot: string }> = {
  loss: { chip: 'bg-loss-soft text-loss-ink', dot: 'bg-loss' },
  mild: { chip: 'bg-loss-soft/60 text-loss-ink', dot: 'bg-loss/60' },
  none: { chip: 'bg-calm-soft text-calm', dot: 'bg-calm' },
  unclear: { chip: 'bg-review-soft text-review', dot: 'bg-review' },
  na: { chip: 'bg-sunk text-faint', dot: 'bg-faint' },
};

export const VerdictChip: React.FC<{ verdict: Verdict; children: React.ReactNode; className?: string }> = ({ verdict, children, className = '' }) => (
  <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-sm font-semibold ${VERDICT_STYLE[verdict].chip} ${className}`}>
    <span className={`h-2 w-2 rounded-full ${VERDICT_STYLE[verdict].dot}`} aria-hidden />
    {children}
  </span>
);

export const OutcomeDot: React.FC<{ group: OutcomeGroup; className?: string }> = ({ group, className = 'h-2.5 w-2.5' }) => (
  <span className={`inline-block shrink-0 rounded-full ${GROUP_TONE[group].dot} ${className}`} aria-hidden />
);

export const Photo: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = '' }) => {
  const [broken, setBroken] = useState(false);
  if (broken || !src) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-sunk text-xs text-faint ${className}`}>
        <ImageOff className="h-5 w-5" aria-hidden />
        Photo not available
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} className={`object-cover ${className}`} />;
};

/** 0–3 score shown as three segments */
export const Score: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm">{label}</span>
    <span className="flex items-center gap-1" aria-label={`${value} out of 3`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={`h-2 w-5 rounded-sm ${n <= value ? 'bg-loss' : 'bg-sunk'}`} />
      ))}
    </span>
  </div>
);

export const Loading: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 p-10 text-muted" role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-field" aria-hidden />
    {label}
  </div>
);

export const ErrorNote: React.FC<{ title: string; body: string; onRetry?: () => void }> = ({ title, body, onRetry }) => (
  <div className="panel p-6" role="alert">
    <p className="font-semibold">{title}</p>
    <p className="mt-1 text-sm text-muted">{body}</p>
    {onRetry && <button onClick={onRetry} className="btn-quiet mt-4">Try again</button>}
  </div>
);
