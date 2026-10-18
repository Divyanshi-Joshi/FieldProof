import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
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
  onNavigate: (tab: ActiveTab, claimId?: string | null, params?: Record<string, string | number>) => void;
}

type Filter = 'all' | OutcomeGroup;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All Claims' },
  { id: 'missed', label: 'Missed by Index' },
  { id: 'hold', label: 'On Hold' },
  { id: 'review', label: 'Under Review' },
  { id: 'paid', label: 'Index Paid' },
  { id: 'none', label: 'No Loss' },
];
const PRIORITY: Record<OutcomeGroup, number> = { missed: 0, hold: 1, review: 2, paid: 3, none: 4 };

const isDecided = (c: ClaimBundle) => Boolean(c.audit?.adjuster_action && c.audit.adjuster_action !== 'PENDING');

type SortBy = 'priority' | 'latest' | 'oldest' | 'id_desc' | 'id_asc';

export const InsurerView: React.FC<InsurerViewProps> = ({ selectedClaimId, onSelectClaim, onOpenClause, onNavigate }) => {
  const [claims, setClaims] = useState<ClaimBundle[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  const [query, setQuery] = useState('');

  const load = () => {
    setState('loading');
    api.getClaims()
      .then((d) => { setClaims(d); setState('ready'); })
      .catch(() => setState('error'));
  };
  useEffect(load, []);

  const sorted = useMemo(() => {
    const parseId = (id: string) => {
      const match = id?.match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const getTime = (c: ClaimBundle) => {
      const ts = c.grading.uploaded_at || c.audit?.timestamp_utc;
      return ts ? new Date(ts).getTime() : 0;
    };

    return [...claims].sort((a, b) => {
      if (sortBy === 'priority') {
        const da = isDecided(a) ? 1 : 0, db = isDecided(b) ? 1 : 0;
        if (da !== db) return da - db;
        return PRIORITY[outcomeInfo(a.decision.outcome_class).group] - PRIORITY[outcomeInfo(b.decision.outcome_class).group];
      }

      if (sortBy === 'latest') {
        const tDiff = getTime(b) - getTime(a);
        if (tDiff !== 0) return tDiff;
        return parseId(b.grading.claim_id) - parseId(a.grading.claim_id);
      }

      if (sortBy === 'oldest') {
        const tDiff = getTime(a) - getTime(b);
        if (tDiff !== 0) return tDiff;
        return parseId(a.grading.claim_id) - parseId(b.grading.claim_id);
      }

      if (sortBy === 'id_desc') {
        return parseId(b.grading.claim_id) - parseId(a.grading.claim_id);
      }

      if (sortBy === 'id_asc') {
        return parseId(a.grading.claim_id) - parseId(b.grading.claim_id);
      }

      return 0;
    });
  }, [claims, sortBy]);

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
  const shown = explicit ?? visible[0] ?? claims[0];

  const updateClaim = (u: ClaimBundle) =>
    setClaims((prev) => prev.map((c) => (c.grading.claim_id === u.grading.claim_id ? u : c)));

  if (state === 'loading') return <div className="mx-auto max-w-7xl px-5 lg:px-8"><Loading label="Loading claims queue" /></div>;
  if (state === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <ErrorNote title="Couldn't load claims" body="The claims service did not respond. Check that the backend is running, then try again." onRetry={load} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl text-ink">
            Claims Adjudication Desk
          </h1>
          <p className="mt-1 text-sm text-muted">
            {waiting} claims pending adjuster sign-off • {claims.length} total active claims across Maharashtra & Central zones.
          </p>
        </div>
        <button
          onClick={() => onNavigate('doctor')}
          className="btn-quiet text-xs self-start sm:self-auto py-2 px-3 font-semibold text-field"
        >
          View Actuarial Risk & Triggers →
        </button>
      </div>

      {/* Top Selector Ribbon: Search, Filter, Dropdown & Claim Switcher */}
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-sm space-y-4">
        {/* Controls row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search claim ID, plot, district, or crop..."
              className="field-input pl-9 text-xs sm:text-sm w-full py-2"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Quick dropdown switcher */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted font-medium">Select Claim:</span>
              <select
                value={shown?.grading.claim_id || ''}
                onChange={(e) => onSelectClaim(e.target.value)}
                className="rounded-md border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink shadow-sm focus:border-field focus:outline-none"
              >
                {claims.map((c) => (
                  <option key={c.grading.claim_id} value={c.grading.claim_id}>
                    {c.grading.claim_id} — {c.evidence.county} (Plot {c.grading.plot_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink shadow-sm focus:border-field focus:outline-none"
              >
                <option value="priority">Priority (Missed losses first)</option>
                <option value="latest">Latest first</option>
                <option value="id_asc">Claim ID (Ascending)</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-thin">
          {FILTERS.filter((f) => f.id === 'all' || counts[f.id]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.id
                  ? 'border-ink bg-ink text-surface shadow-sm'
                  : 'border-line bg-canvas text-muted hover:border-ink hover:text-ink'
              }`}
            >
              {f.label} <span className="opacity-70 ml-1">({counts[f.id] ?? 0})</span>
            </button>
          ))}
        </div>

        {/* Horizontal Claim Cards Strip */}
        <div className="border-t border-line pt-3">
          {visible.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted">
              No claims match your search. <button className="btn-text ml-1" onClick={() => { setFilter('all'); setQuery(''); }}>Reset filters</button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scroll-thin">
              {visible.map((c) => {
                const o = outcomeInfo(c.decision.outcome_class);
                const s = readSources(c);
                const active = shown?.grading.claim_id === c.grading.claim_id;
                const decided = isDecided(c);
                return (
                  <button
                    key={c.grading.claim_id}
                    onClick={() => onSelectClaim(c.grading.claim_id)}
                    className={`w-64 shrink-0 rounded-lg border p-3 text-left transition-all ${
                      active
                        ? 'border-field bg-field-soft shadow-sm ring-1 ring-field'
                        : 'border-line bg-canvas/70 hover:border-field/40 hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <OutcomeDot group={o.group} className="h-2 w-2 shrink-0" />
                        <span className="font-mono text-xs font-bold text-ink truncate">
                          {c.grading.claim_id}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        decided ? 'bg-field-soft text-field' : 'bg-sunk text-muted'
                      }`}>
                        {decided ? decidedLabel(c.audit.adjuster_action) : 'Pending'}
                      </span>
                    </div>

                    <p className="mt-1 font-semibold text-xs text-ink truncate" title={o.label}>
                      {o.label}
                    </p>

                    <p className="mt-0.5 text-[11px] text-muted truncate">
                      Plot {c.grading.plot_id} • {c.evidence.county} ({c.evidence.crop})
                    </p>

                    {/* Mini Tri-Signal Verdicts */}
                    <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2 text-[10px] text-muted">
                      {(['index', 'photos', 'satellite'] as const).map((k) => (
                        <span key={k} className="inline-flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${VERDICT_STYLE[s[k].verdict].dot}`} />
                          {k === 'index' ? 'Index' : k === 'photos' ? 'Photos' : 'Sat'}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Full-Width Claim Investigation Workspace */}
      <main aria-label="Selected claim details" className="w-full">
        {shown ? (
          <ClaimDetail
            key={shown.grading.claim_id}
            claim={shown}
            onDecisionSaved={updateClaim}
            onOpenClause={onOpenClause}
            onNavigate={onNavigate}
          />
        ) : (
          <div className="panel p-12 text-center text-muted">
            Select a claim from the top bar to review its evidence and make an adjudication.
          </div>
        )}
      </main>
    </div>
  );
};

export function decidedLabel(a: string): string {
  return a === 'APPROVED' ? 'Approved' : a === 'REJECTED' ? 'Rejected' : a === 'ESCALATED' ? 'Field Visit' : 'Pending';
}

export default InsurerView;
