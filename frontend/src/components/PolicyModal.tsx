import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api, PolicyClausesResponse } from '../services/api';
import { outcomeInfo, ACTIONS } from '../lib/outcomes';
import { fmtStamp } from '../lib/format';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClauseId?: string | null;
}

type Tab = 'clauses' | 'rule' | 'text';

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

  if (!isOpen) return null;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'clauses', label: 'Clauses' },
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
