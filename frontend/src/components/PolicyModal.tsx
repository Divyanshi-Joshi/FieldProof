import React, { useState, useEffect } from 'react';
import { X, Shield, FileText, CheckCircle2, Copy, GitBranch, ExternalLink, BookOpen } from 'lucide-react';
import { api, PolicyClausesResponse } from '../services/api';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClauseId?: string | null;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose, selectedClauseId }) => {
  const [activeTab, setActiveTab] = useState<'clauses' | 'fulltext' | 'protocol'>('clauses');
  const [clausesData, setClausesData] = useState<PolicyClausesResponse | null>(null);
  const [fullText, setFullText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getPolicyClauses().then(setClausesData).catch(console.error);
      api.getPolicyText().then(res => setFullText(res.full_text)).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText('0371cad');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Illustrative Policy & Frozen Protocol</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-brand-500/10 text-brand-300 border border-brand-500/30">
                  FP-DEMO-2026-001
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Grounding policy index with automated clause citations (CL-1.1 through CL-8.1)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-slate-800 bg-slate-900/40 flex space-x-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('clauses')}
            className={`pb-2.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'clauses'
                ? 'border-brand-500 text-brand-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Clause Index ({clausesData?.clauses.length || 12} Clauses)</span>
          </button>

          <button
            onClick={() => setActiveTab('protocol')}
            className={`pb-2.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'protocol'
                ? 'border-brand-500 text-brand-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span>Frozen Protocol Commit Proof</span>
          </button>

          <button
            onClick={() => setActiveTab('fulltext')}
            className={`pb-2.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'fulltext'
                ? 'border-brand-500 text-brand-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Full 2-Page Policy Text</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs">
          {activeTab === 'clauses' && (
            <div className="space-y-3">
              {clausesData?.clauses.map((clause) => {
                const isSelected = selectedClauseId === clause.clause_id;
                return (
                  <div
                    key={clause.clause_id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-brand-950/40 border-brand-500/60 ring-1 ring-brand-500/40'
                        : 'glass-card border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-brand-300 bg-brand-500/10 border border-brand-500/20 text-xs">
                          {clause.clause_id}
                        </span>
                        <span className="font-semibold text-white text-sm">{clause.title}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {clause.maps_to_outcome && (
                          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            Outcome: {clause.maps_to_outcome}
                          </span>
                        )}
                        {clause.maps_to_action && (
                          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-brand-900/40 text-brand-300 border border-brand-700/40">
                            Action: {clause.maps_to_action}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-xs pl-0.5">
                      {clause.summary}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'protocol' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="font-bold text-white text-sm">
                      Frozen Trigger Protocol Verification
                    </span>
                  </div>
                  <button
                    onClick={handleCopyHash}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-mono"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? 'Copied!' : 'Copy Hash: 0371cad'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px] mb-1">Git Commit Hash</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                      0371cad (parent: feca4ae)
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px] mb-1">Commit Timestamp (IST)</span>
                    <span className="font-mono text-slate-200">
                      2026-10-16T11:09:07+05:30
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  To eliminate circularity or post-hoc threshold tuning, the trigger rule, NDVI anomaly cut-off, and observable sign rubric were committed to git and timestamped BEFORE evaluating any test plots in the Eyes on the Ground dataset.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-bold text-slate-300 block mb-2 uppercase tracking-wider">
                  Frozen SQL Trigger Rule (protocol/frozen_trigger.sql)
                </span>
                <pre className="p-3 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed border border-slate-800">
{`-- FROZEN TRIGGER RULE (FieldProof v2)
-- Committed: 2026-10-16T11:09:07+05:30 | Hash: feca4ae
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
WHERE t.trigger_percentile = 30;`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'fulltext' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto">
                {fullText || "Loading illustrative policy text..."}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
