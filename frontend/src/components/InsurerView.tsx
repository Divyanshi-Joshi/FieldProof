import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { ClaimBundle, api } from '../services/api';
import { OutcomeGroup, outcomeInfo } from '../lib/outcomes';
import { readSources } from '../lib/signals';
import { ActiveTab } from '../App';
import { ClaimDetail } from './ClaimDetail';
import { ErrorNote, Loading, OutcomeDot, VERDICT_STYLE } from './ui';

interface InsurerViewProps {
  selectedClaimId: string | null;
  onSelectClaim: (id: string | null) => void;
  onOpenClause: (clauseId: string) => void;
  onNavigate: (tab: ActiveTab) => void;
}

type Filter = 'all' | OutcomeGroup;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'missed', label: 'Missed by the index' },
  { id: 'hold', label: 'On hold' },
  { id: 'review', label: 'Review' },
  { id: 'paid', label: 'Index paid' },
  { id: 'none', label: 'No loss' },
];
const PRIORITY: Record<OutcomeGroup, number> = { missed: 0, hold: 1, review: 2, paid: 3, none: 4 };

const isDecided = (c: ClaimBundle) => Boolean(c.audit?.adjuster_action && c.audit.adjuster_action !== 'PENDING');

export const InsurerView: React.FC<InsurerViewProps> = ({ selectedClaimId, onSelectClaim, onOpenClause, onNavigate }) => {
  const [claims, setClaims] = useState<ClaimBundle[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const load = () => {
    setState('loading');
    api.getClaims()
      .then((d) => { setClaims(d); setState('ready'); })
      .catch(() => setState('error'));
  };
  useEffect(load, []);

  const sorted = useMemo(() => [...claims].sort((a, b) => {
    const da = isDecided(a) ? 1 : 0, db = isDecided(b) ? 1 : 0;
    if (da !== db) return da - db;
    return PRIORITY[outcomeInfo(a.decision.outcome_class).group] - PRIORITY[outcomeInfo(b.decision.outcome_class).group];
  }), [claims]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: claims.length };
    claims.forEach((c) => { const g = outcomeInfo(c.decision.outcome_class).group; m[g] = (m[g] ?? 0) + 1; });
    return m;
  }, [claims]);

  const q = query.trim().toLowerCase();
  const visible = sorted.filter((c) => {
    if (filter !== 'all' && outcomeInfo(c.decision.outcome_class).group !== filter) return false;
    if (!q) return true;
    return [c.grading.claim_id, c.grading.plot_id, c.evidence.county, c.evidence.crop, outcomeInfo(c.decision.outcome_class).label]
      .some((v) => v?.toLowerCase().includes(q));
  });

  const waiting = claims.filter((c) => !isDecided(c)).length;
  const explicit = selectedClaimId ? claims.find((c) => c.grading.claim_id === selectedClaimId) : undefined;
  const shown = explicit ?? visible[0];

  const updateClaim = (u: ClaimBundle) =>
    setClaims((prev) => prev.map((c) => (c.grading.claim_id === u.grading.claim_id ? u : c)));

  if (state === 'loading') return <div className="mx-auto max-w-7xl px-5 lg:px-8"><Loading label="Loading claims" /></div>;
  if (state === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <ErrorNote title="Couldn't load the claims" body="The claims service did not respond. Check that the backend is running, then try again." onRetry={load} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <div className={`${explicit ? 'hidden lg:flex' : 'flex'} flex-col gap-1 sm:flex-row sm:items-end sm:justify-between`}>
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Claims</h1>
          <p className="mt-1 text-muted">
            {waiting} waiting for a decision. Claims the index missed are at the top.
          </p>
        </div>
        <button onClick={() => onNavigate('doctor')} className="btn-text">See where the index misses losses</button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Queue */}
        <section aria-label="Claim queue" className={`${explicit ? 'hidden lg:block' : ''} lg:col-span-4`}>
          <label className="relative block">
            <span className="sr-only">Search claims</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plot, county or claim"
              className="field-input pl-9 text-sm"
            />
          </label>

          <div className="scroll-thin -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap">
            {FILTERS.filter((f) => f.id === 'all' || counts[f.id]).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium ${
                  filter === f.id ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                {f.label} <span className="opacity-70">{counts[f.id] ?? 0}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-line p-6 text-sm text-muted">
              No claims match. <button className="btn-text" onClick={() => { setFilter('all'); setQuery(''); }}>Show all claims</button>
            </div>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-lg border border-line bg-surface lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto scroll-thin">
              {visible.map((c) => {
                const o = outcomeInfo(c.decision.outcome_class);
                const s = readSources(c);
                const active = shown?.grading.claim_id === c.grading.claim_id;
                const decided = isDecided(c);
                return (
                  <li key={c.grading.claim_id} className="border-b border-line last:border-b-0">
                    <button
                      onClick={() => onSelectClaim(c.grading.claim_id)}
                      aria-current={active ? 'true' : undefined}
                      className={`relative block w-full px-4 py-3.5 text-left transition-colors ${active ? 'bg-field-soft' : 'hover:bg-canvas'}`}
                    >
                      {active && <span className="absolute inset-y-0 left-0 w-1 bg-field" />}
                      <div className="flex items-start gap-2.5">
                        <OutcomeDot group={o.group} className="mt-1.5 h-2.5 w-2.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-5">{o.label}</p>
                          <p className="mt-0.5 text-sm text-muted">
                            Plot {c.grading.plot_id}, {c.evidence.county}, {c.evidence.crop}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                            {(['index', 'photos', 'satellite'] as const).map((k) => (
                              <span key={k} className="inline-flex items-center gap-1" title={`${k}: ${s[k].short}`}>
                                <span className={`h-2 w-2 rounded-full ${VERDICT_STYLE[s[k].verdict].dot}`} aria-hidden />
                                {k === 'index' ? 'Index' : k === 'photos' ? 'Photos' : 'Satellite'}
                              </span>
                            ))}
                            <span className={`ml-auto font-medium ${decided ? 'text-field' : 'text-ink'}`}>
                              {decided ? decidedLabel(c.audit.adjuster_action) : 'Waiting'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <span className="h-2 w-2 rounded-full bg-loss" aria-hidden /> shows a loss
            <span className="ml-2 h-2 w-2 rounded-full bg-calm" aria-hidden /> no loss
          </p>
        </section>

        {/* Detail */}
        <section aria-label="Claim detail" className={`${explicit ? '' : 'hidden lg:block'} lg:col-span-8`}>
          {explicit && (
            <button onClick={() => onSelectClaim(null)} className="btn-text mb-4 lg:hidden">
              <ChevronLeft className="h-4 w-4" aria-hidden /> All claims
            </button>
          )}
          {shown ? (
            <ClaimDetail key={shown.grading.claim_id} claim={shown} onDecisionSaved={updateClaim} onOpenClause={onOpenClause} />
          ) : (
            <div className="rounded-lg border border-dashed border-line p-10 text-muted">Pick a claim from the list to see its evidence.</div>
          )}
        </section>
      </div>
    </div>
  );
};

export function decidedLabel(a: string): string {
  return a === 'APPROVED' ? 'Approved' : a === 'REJECTED' ? 'Rejected' : a === 'ESCALATED' ? 'Field visit' : 'Waiting';
}
