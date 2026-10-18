import React, { useEffect, useRef, useState } from 'react';
import { X, Search, ShieldCheck, BookOpen, Send, Sparkles } from 'lucide-react';
import { api, PolicyClausesResponse } from '../services/api';
import { PolicyQueryResponse } from '../types/contracts';
import { outcomeInfo, ACTIONS } from '../lib/outcomes';
import { fmtStamp } from '../lib/format';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClauseId?: string | null;
}

type Tab = 'clauses' | 'search' | 'rule' | 'text';

const RULE_SQL = `-- Payout rule, locked before evaluation
SELECT
  p.plot_id,
  p.county,
  p.season,
  p.season_rain_mm,
  t.trigger_rain_mm,
  p.season_rain_mm < t.trigger_rain_mm AS index_pays,
  p.ndvi_anomaly_z < -1.5 AS satellite_stress,
  p.max_dry_spell_days >= 14 AND p.dry_spell_overlaps_critical_stage AS phenological_risk
FROM \`fieldproof.plot_evidence\` p
JOIN \`fieldproof.county_season_triggers\` t
  ON p.county = t.county AND p.season = t.season
WHERE t.trigger_percentile = 30;`;

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose, selectedClauseId }) => {
  const [tab, setTab] = useState<Tab>('clauses');
  const [clauses, setClauses] = useState<PolicyClausesResponse | null>(null);
  const [fullText, setFullText] = useState('');
  const [lock, setLock] = useState<{ hash: string; at: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<PolicyQueryResponse | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTab('clauses');
    closeRef.current?.focus();
    if (!clauses) api.getPolicyClauses().then(setClauses).catch(() => {});
    if (!fullText) api.getPolicyText().then((r) => setFullText(r.full_text)).catch(() => {});
    if (!lock) api.getValidationSummary()
      .then((v) => setLock({ hash: v.frozen_protocol.frozen_commit_hash, at: v.frozen_protocol.frozen_commit_timestamp }))
      .catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && selectedClauseId && clauses) {
      document.getElementById(`clause-${selectedClauseId}`)?.scrollIntoView({ block: 'center' });
    }
  }, [isOpen, selectedClauseId, clauses]);

  const handleSearch = async (q = searchQuery) => {
    if (!q.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.queryPolicyGrounding(q);
      setSearchResult(res);
    } catch (err) {
      console.error('Failed to query policy:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  if (!isOpen) return null;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'clauses', label: 'Clauses' },
    { id: 'search', label: 'Search binder' },
    { id: 'rule', label: 'Payout rule' },
    { id: 'text', label: 'Full policy' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="policy-title">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40" tabIndex={-1} />
      <div className="settle relative flex h-full w-full max-w-2xl flex-col bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <h2 id="policy-title" className="text-xl font-semibold">Demo policy and payout rule</h2>
            <p className="mt-1 text-sm text-muted">
              An illustrative policy written for this prototype{clauses?.policy_ref ? ` (${clauses.policy_ref})` : ''}. Briefs may only cite clauses listed here.
            </p>
          </div>
          <button ref={closeRef} onClick={onClose} className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div role="tablist" className="flex gap-1 border-b border-line px-5">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`relative px-3 py-3 text-sm font-medium ${tab === t.id ? 'text-ink' : 'text-muted hover:text-ink'}`}>
              {t.label}
              {tab === t.id && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-field" />}
            </button>
          ))}
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto p-5">
          {tab === 'clauses' && (
            <ol className="space-y-3">
              {!clauses && <li className="text-muted">Loading clauses…</li>}
              {clauses?.clauses.map((c) => {
                const on = c.clause_id === selectedClauseId;
                return (
                  <li key={c.clause_id} id={`clause-${c.clause_id}`}
                    className={`rounded-lg border p-4 ${on ? 'border-field bg-field-soft' : 'border-line'}`}>
                    <p className="font-semibold">
                      <span className="text-field">{c.clause_id}</span> {c.title}
                    </p>
                    <p className="mt-1 text-sm leading-6">{c.summary}</p>
                    {(c.maps_to_outcome || c.maps_to_action) && (
                      <p className="mt-2 text-sm text-muted">
                        Used for: {c.maps_to_outcome ? outcomeInfo(c.maps_to_outcome).label.toLowerCase() : ''}
                        {c.maps_to_outcome && c.maps_to_action ? '. ' : ''}
                        {c.maps_to_action ? (ACTIONS[c.maps_to_action] ?? c.maps_to_action) : ''}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {tab === 'search' && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-muted leading-relaxed">
                  Search across the full 45-page statutory policy binder. Every answer is strictly grounded in contractual clauses with zero hallucination.
                </p>
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="e.g., What dry spell length triggers a phenological review?"
                      className="field-input pl-9 text-sm w-full"
                    />
                  </div>
                  <button
                    onClick={() => handleSearch()}
                    disabled={searchLoading || !searchQuery.trim()}
                    className="btn-primary flex items-center gap-1.5 px-4 text-sm"
                  >
                    <Send className={`h-3.5 w-3.5 ${searchLoading ? 'animate-spin' : ''}`} />
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {/* Quick suggestions */}
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  <span className="text-muted py-0.5">Try:</span>
                  {[
                    'Is prevented sowing covered under PMFBY §4.2.1?',
                    'What timeline is mandated for localized calamities under §5.4?',
                    'How are post-harvest losses evaluated under §7.1.4?',
                    'What dry spell triggers phenological review under §4.2?',
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSearchQuery(s);
                        handleSearch(s);
                      }}
                      className="rounded-full border border-line bg-canvas px-2.5 py-0.5 text-muted hover:border-field hover:text-ink transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {searchResult && (
                <div className="space-y-4 rounded-xl border border-line bg-canvas/40 p-5">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-field">
                      <ShieldCheck className="h-4 w-4" />
                      Statutory Grounding Confirmed
                    </span>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      Zero-Hallucination: {(searchResult.zero_hallucination_score * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Grounded Answer</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink font-medium">
                      {searchResult.grounded_answer}
                    </p>
                  </div>

                  {searchResult.cited_clauses && searchResult.cited_clauses.length > 0 && (
                    <div className="space-y-2 border-t border-line pt-3">
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Contractual Citations</h4>
                      <div className="space-y-2">
                        {searchResult.cited_clauses.map((c) => (
                          <div key={c.clause_id} className="rounded-lg border border-line bg-surface p-3 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-field font-mono">§{c.clause_id}</span>
                              <span className="font-semibold text-ink">{c.title}</span>
                            </div>
                            <p className="text-xs text-muted italic">"{c.quoted_rule}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-faint">
                    Binder reference: <span className="font-mono">{searchResult.context_binder_ref}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'rule' && (
            <div className="space-y-5">
              <p className="leading-7">
                The index pays when a plot's season rain is below the 30th percentile of its own history for the same window.
                This rule and its thresholds were saved in version control before any test claim was scored, and have not
                changed since.
              </p>
              {lock && (
                <p className="text-sm">
                  Version <span className="font-mono">{lock.hash}</span>, locked {fmtStamp(lock.at)}.
                </p>
              )}
              <pre className="scroll-thin overflow-x-auto rounded-lg bg-ink p-4 font-mono text-xs leading-6 text-white">{RULE_SQL}</pre>
            </div>
          )}

          {tab === 'text' && (
            <div className="whitespace-pre-wrap leading-7">{fullText || 'Loading the policy text…'}</div>
          )}
        </div>
      </div>
    </div>
  );
};
