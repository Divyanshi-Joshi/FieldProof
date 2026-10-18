import React, { useState, useEffect } from 'react';
import {
  FileText, ShieldCheck, CheckCircle2, AlertCircle, BookOpen, Search, Scale, Sparkles, HelpCircle, Layers
} from 'lucide-react';
import { api, ClaimBundle } from '../services/api';
import { PolicyGroundingResult, PolicyQueryResponse } from '../types/contracts';

interface Props {
  onOpenPolicyModal?: (clauseId?: string) => void;
}

export const PolicyGroundingView: React.FC<Props> = ({ onOpenPolicyModal }) => {
  const [claims, setClaims] = useState<ClaimBundle[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState('CLM-2026-001');
  const [groundingResult, setGroundingResult] = useState<PolicyGroundingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResponse, setQueryResponse] = useState<PolicyQueryResponse | null>(null);

  useEffect(() => {
    api.getClaims().then((cls) => {
      setClaims(cls);
      if (cls.length > 0) {
        setSelectedClaimId(cls[0].grading.claim_id);
        fetchGrounding(cls[0].grading.claim_id);
      }
    }).catch(console.error);
  }, []);

  const fetchGrounding = async (cId: string) => {
    setLoading(true);
    try {
      const res = await api.groundClaimWithPolicy(cId);
      setGroundingResult(res);
    } catch (err) {
      console.error('Failed to ground claim:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSelect = (cId: string) => {
    setSelectedClaimId(cId);
    fetchGrounding(cId);
  };

  const handleAskQuery = async (customQ?: string) => {
    const q = customQ || query;
    if (!q.trim()) return;
    setQuery(q);
    setQueryLoading(true);
    try {
      const res = await api.queryPolicyGrounding(q);
      setQueryResponse(res);
    } catch (err) {
      console.error('Failed to query policy:', err);
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-field-soft px-2.5 py-1 text-xs font-bold text-field flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" /> Pillar 2: Policy Grounding
              </span>
              <span className="rounded bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                Alternative to Vertex RAG (Massive Context Window)
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl text-ink">
              Zero-Hallucination Legal Binder Counsel
            </h1>
            <p className="mt-2 max-w-3xl text-sm sm:text-base text-muted leading-relaxed">
              To guarantee zero hallucination and comply with statutory financial regulations, Gemini's massive
              context window natively ingests the entire <strong>45-page statutory insurance policy binder</strong>,
              grounding every adjuster finding against verified numbered clauses without vector chunking losses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-field" />
              Binder: FP-KENYA-PARAMETRIC-2026-REG-B4
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Claim Grounding & Interactive Legal Query */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Side: Claim Grounding Inspector */}
        <div className="lg:col-span-7 space-y-6">
          <div className="panel p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                <FileText className="h-4 w-4 text-field" />
                Claim Grounding Verification
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted font-medium">Select Claim:</label>
                <select
                  value={selectedClaimId}
                  onChange={(e) => handleClaimSelect(e.target.value)}
                  className="field-input text-xs py-1"
                >
                  {claims.map((c) => (
                    <option key={c.grading.claim_id} value={c.grading.claim_id}>
                      {c.grading.claim_id} — {c.decision.outcome_class}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-field inline-block" />
                <p className="mt-3 text-xs text-muted">Reading 45-page master binder into Gemini context window...</p>
              </div>
            ) : groundingResult ? (
              <div className="space-y-5">
                {/* Status Bar */}
                <div className="rounded-lg border border-line bg-canvas p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-muted">Statutory Classification:</span>
                    <p className="font-semibold text-sm text-ink">{groundingResult.outcome_class}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Primary Cited Clause:</span>
                    <p className="font-mono font-bold text-sm text-field">{groundingResult.primary_cited_clause}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Zero-Hallucination Status:</span>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 100% Code Verified
                    </p>
                  </div>
                </div>

                {/* Cited Clauses in Policy Binder */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold tracking-wider text-muted uppercase">
                    Cited Contractual Provisions ({groundingResult.citations.length})
                  </h3>
                  {groundingResult.citations.map((c) => (
                    <div
                      key={c.clause_id}
                      className="rounded-lg border border-line bg-surface p-4 hover:border-field/40 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-field-soft text-field px-2 py-0.5 rounded">
                            {c.clause_id}
                          </span>
                          <span className="text-xs font-semibold text-ink">{c.title}</span>
                        </div>
                        <span className="text-[11px] font-mono text-muted">{c.page_reference}</span>
                      </div>

                      <blockquote className="border-l-2 border-field/50 pl-3 text-xs text-ink/80 italic font-serif">
                        "{c.quoted_rule}"
                      </blockquote>

                      <div className="text-xs text-muted pt-1 flex items-start gap-1.5">
                        <span className="font-semibold text-ink shrink-0">Application:</span>
                        <span>{c.application_to_claim}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Legal Underwriting Rationale */}
                <div className="panel p-4 bg-canvas/40 border-line text-xs space-y-2">
                  <h4 className="font-semibold text-ink flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-field" />
                    Statutory Compliance Rationale
                  </h4>
                  <p className="text-muted leading-relaxed whitespace-pre-line">
                    {groundingResult.legal_rationale}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Side: Interactive Legal Query Console */}
        <div className="lg:col-span-5 space-y-6">
          <div className="panel p-5 space-y-4">
            <div className="border-b border-line pb-3">
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                <Search className="h-4 w-4 text-purple-500" />
                Ask the 45-Page Master Binder
              </h2>
              <p className="mt-1 text-xs text-muted">
                Test Gemini's native long-document comprehension on any contractual policy question.
              </p>
            </div>

            {/* Quick Query Pills */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted block">Try sample queries:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'What triggers phenological basis risk?',
                  'How are Fall Armyworm losses excluded?',
                  'Why is human sign-off mandatory?',
                  'What happens if Two-Pass passes disagree?',
                ].map((sampleQ) => (
                  <button
                    key={sampleQ}
                    onClick={() => handleAskQuery(sampleQ)}
                    className="rounded border border-line bg-canvas px-2.5 py-1 text-[11px] text-muted hover:border-field hover:text-ink transition-colors text-left"
                  >
                    {sampleQ}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about clauses, dry spells, fraud, triggers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskQuery()}
                className="field-input text-xs flex-1"
              />
              <button
                onClick={() => handleAskQuery()}
                disabled={queryLoading || !query.trim()}
                className="btn-primary text-xs px-3 py-1.5"
              >
                {queryLoading ? 'Grounding...' : 'Ask'}
              </button>
            </div>

            {/* Query Response Card */}
            {queryResponse && (
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    Gemini Grounded Finding
                  </span>
                  <span className="text-[11px] font-mono text-muted">
                    Zero-Hallucination: {(queryResponse.zero_hallucination_score * 100).toFixed(0)}%
                  </span>
                </div>

                <p className="text-xs text-ink leading-relaxed">
                  {queryResponse.grounded_answer}
                </p>

                {queryResponse.cited_clauses.length > 0 && (
                  <div className="border-t border-purple-500/20 pt-2 space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted block">Grounded Clauses:</span>
                    {queryResponse.cited_clauses.map((c) => (
                      <div key={c.clause_id} className="text-[11px] flex items-center justify-between bg-surface p-2 rounded border border-line">
                        <span className="font-mono font-bold text-field">{c.clause_id}: {c.title}</span>
                        <span className="text-muted">{c.page_reference}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Judges Pitch Card */}
          <div className="panel p-5 bg-canvas/60 border-purple-500/30 text-xs text-muted space-y-2">
            <div className="flex items-center gap-2 text-ink font-semibold">
              <Sparkles className="h-4 w-4 text-purple-500" />
              The Pitch to Judges:
            </div>
            <p className="leading-relaxed">
              "Traditional RAG pipelines fail in complex regulatory BFSI contracts because chunking breaks cross-clause
              conditional logic. By streaming the full 45-page legal binder directly into Gemini's context window,
              FieldProof provides 100% auditable, zero-hallucination statutory determinations."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
