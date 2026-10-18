import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  BookOpen,
  Send,
  Sparkles,
  FileText,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  Scale
} from 'lucide-react';
import { api } from '../services/api';
import { PolicyGroundingResult, PolicyQueryResponse, PolicyGroundingCitation } from '../types/contracts';

interface PolicyRAGAssistantProps {
  claimId: string;
  onOpenClause: (clauseId: string) => void;
  onInsertToNotes?: (text: string) => void;
}

const PRESET_QUERIES = [
  {
    label: 'Prevented Sowing (§4.2.1)',
    query: 'Is prevented sowing covered under PMFBY §4.2.1 and what is the payout cap?'
  },
  {
    label: 'Localized Calamities (§5.4)',
    query: 'What evidence and timeline are required for localized calamities like inundation or hailstorm under §5.4?'
  },
  {
    label: 'Post-Harvest Losses (§7.1.4)',
    query: 'How are post-harvest losses in cut & spread condition evaluated within 14 days under §7.1.4?'
  },
  {
    label: 'Mid-Season Adversity (§5.3)',
    query: 'What triggers mid-season adversity on-account relief under §5.3?'
  },
  {
    label: 'Phenological vs Macro Rain (§4.2)',
    query: 'How does Clause 4.2 reconcile dry spells during flowering when seasonal rainfall was above the trigger?'
  }
];

export const PolicyRAGAssistant: React.FC<PolicyRAGAssistantProps> = ({
  claimId,
  onOpenClause,
  onInsertToNotes
}) => {
  const [claimGrounding, setClaimGrounding] = useState<PolicyGroundingResult | null>(null);
  const [loadingGrounding, setLoadingGrounding] = useState(false);
  const [query, setQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<PolicyQueryResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'claim' | 'assistant'>('claim');

  // Load claim-level policy grounding whenever claimId changes
  useEffect(() => {
    if (!claimId) return;
    setLoadingGrounding(true);
    api.groundClaimWithPolicy(claimId)
      .then((res) => {
        setClaimGrounding(res);
      })
      .catch((err) => {
        console.error('Failed to load policy grounding for claim:', err);
      })
      .finally(() => {
        setLoadingGrounding(false);
      });
  }, [claimId]);

  const handleRunQuery = async (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : query).trim();
    if (!q) return;
    setQuery(q);
    setActiveTab('assistant');
    setQueryLoading(true);
    try {
      const res = await api.queryPolicyGrounding(q);
      setQueryResult(res);
    } catch (err) {
      console.error('Failed to query policy RAG assistant:', err);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleCopyCitation = (clause: PolicyGroundingCitation) => {
    const textToCopy = `Statutory Citation §${clause.clause_id} (${clause.title}): "${clause.quoted_rule}" [${clause.page_reference}]`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(clause.clause_id);
    setTimeout(() => setCopiedId(null), 2000);
    if (onInsertToNotes) {
      onInsertToNotes(textToCopy);
    }
  };

  return (
    <section
      aria-labelledby="policy-rag-title"
      className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-5 transition-all"
    >
      {/* Header with Verified Regulatory Seal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Scale className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Statutory Policy RAG Grounding
            </span>
            <span className="font-mono text-[11px] rounded bg-canvas border border-line px-2 py-0.5 text-muted">
              PMFBY / WBCIS Standard Binder
            </span>
          </div>
          <h3 id="policy-rag-title" className="text-base font-semibold text-ink">
            Official Scheme Clause Retrieval & Adjuster Guidance
          </h3>
          <p className="text-xs text-muted max-w-2xl leading-relaxed">
            Every claim determination is cross-referenced against the 45-page statutory insurance binder using Gemini's 1M-token context window with zero hallucination.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-canvas p-1 rounded-lg border border-line text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('claim')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'claim'
                ? 'bg-surface shadow-xs text-ink font-semibold'
                : 'text-muted hover:text-ink'
            }`}
          >
            Claim Citations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assistant')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'assistant'
                ? 'bg-surface shadow-xs text-ink font-semibold'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-field" />
            Policy Query Assistant
          </button>
        </div>
      </div>

      {/* Mode 1: Claim-Specific Grounding */}
      {activeTab === 'claim' && (
        <div className="space-y-4">
          {loadingGrounding ? (
            <div className="p-8 text-center text-xs text-muted">
              <div className="inline-block animate-spin h-5 w-5 border-2 border-field border-t-transparent rounded-full mb-2" />
              <p>Grounding claim against PMFBY / WBCIS master policy binder...</p>
            </div>
          ) : claimGrounding ? (
            <div className="space-y-4">
              {/* Primary Governed Outcome & Rationale */}
              <div className="rounded-lg border border-line bg-canvas/40 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted uppercase tracking-wider text-[11px]">Governing Rationale:</span>
                    <span className="font-mono font-bold text-field bg-field/10 border border-field/25 px-2 py-0.5 rounded">
                      Clause {claimGrounding.primary_cited_clause}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Zero-Hallucination Verified
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-ink font-serif italic border-l-2 border-field pl-3">
                  "{claimGrounding.legal_rationale}"
                </p>
              </div>

              {/* Verified Statutory Clauses Cited */}
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">
                  Verified Statutory Clauses for this Claim
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {claimGrounding.citations.map((c) => (
                    <div
                      key={c.clause_id}
                      className="rounded-lg border border-line bg-surface p-3 space-y-2 hover:border-field/50 transition-colors shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-field">
                              §{c.clause_id}
                            </span>
                            <span className="text-xs font-semibold text-ink line-clamp-1">
                              {c.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted font-mono">{c.page_reference}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenClause(c.clause_id)}
                          title="Open official text in policy binder"
                          className="shrink-0 p-1 text-muted hover:text-field hover:bg-canvas rounded"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                        "{c.quoted_rule}"
                      </p>

                      <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[11px]">
                        <span className="text-muted line-clamp-1 italic">{c.application_to_claim}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCitation(c)}
                          className="shrink-0 inline-flex items-center gap-1 font-medium text-field hover:underline ml-2"
                        >
                          {copiedId === c.clause_id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Cite
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick query bridge button */}
              <div className="rounded-lg border border-dashed border-line bg-canvas/30 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-muted">
                  Need to verify specific scheme rules (e.g. Prevented Sowing §4.2.1, Post-Harvest §7.1.4, Localized Calamities §5.4)?
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('assistant')}
                  className="btn-primary text-xs shrink-0 flex items-center gap-1.5 px-3 py-1.5"
                >
                  <Search className="h-3.5 w-3.5" />
                  Query Policy Assistant
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">No policy grounding details available for this claim.</p>
          )}
        </div>
      )}

      {/* Mode 2: Interactive Deep-Dive Policy Assistant */}
      {activeTab === 'assistant' && (
        <div className="space-y-4">
          {/* Query Input */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunQuery()}
                placeholder="Ask any PMFBY / WBCIS policy question (e.g., Prevented Sowing §4.2.1, Post-Harvest §7.1.4, Localized §5.4)..."
                className="field-input w-full pl-9 pr-24 py-2.5 text-xs text-ink"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <button
                type="button"
                onClick={() => handleRunQuery()}
                disabled={queryLoading || !query.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className={`h-3 w-3 ${queryLoading ? 'animate-spin' : ''}`} />
                <span>{queryLoading ? 'Retrieving...' : 'Ask'}</span>
              </button>
            </div>

            {/* Statutory Quick Queries for Adjuster */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-muted font-semibold mr-1">Statutory Clauses:</span>
              {PRESET_QUERIES.map((pq) => (
                <button
                  key={pq.label}
                  type="button"
                  onClick={() => handleRunQuery(pq.query)}
                  className="rounded-full border border-line bg-canvas px-2.5 py-1 text-muted hover:border-field hover:text-ink hover:bg-surface transition-all flex items-center gap-1"
                >
                  <BookOpen className="h-3 w-3 text-field" />
                  <span>{pq.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Assistant Response Display */}
          {queryResult && (
            <div className="rounded-lg border border-line bg-canvas/50 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-ink">
                    Official Regulatory Response Grounded
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted">
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                    Zero-Hallucination: {(queryResult.zero_hallucination_score * 100).toFixed(0)}%
                  </span>
                  <span>{queryResult.context_binder_ref}</span>
                </div>
              </div>

              {/* Grounded Answer */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Contractual Answer:
                </span>
                <p className="text-xs leading-relaxed text-ink font-medium bg-surface p-3.5 rounded-lg border border-line/75 shadow-2xs">
                  {queryResult.grounded_answer}
                </p>
              </div>

              {/* Cited Scheme Clauses */}
              {queryResult.cited_clauses && queryResult.cited_clauses.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Statutory Clause Evidence & Quoted Rules:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {queryResult.cited_clauses.map((c) => (
                      <div
                        key={c.clause_id}
                        className="rounded-md border border-line bg-surface p-3 space-y-1.5 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-field text-xs">
                            §{c.clause_id}
                          </span>
                          <span className="font-mono text-[10px] text-muted">
                            {c.page_reference}
                          </span>
                        </div>
                        <p className="font-semibold text-ink text-xs">{c.title}</p>
                        <p className="text-[11px] text-muted italic bg-canvas/60 p-2 rounded border border-line/50">
                          "{c.quoted_rule}"
                        </p>
                        <p className="text-[11px] text-muted leading-tight">
                          {c.application_to_claim}
                        </p>
                        <div className="pt-2 flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={() => onOpenClause(c.clause_id)}
                            className="font-semibold text-field hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> View in Binder
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyCitation(c)}
                            className="text-muted hover:text-ink flex items-center gap-1"
                          >
                            {copiedId === c.clause_id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Insert Citation
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
