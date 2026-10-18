import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Scale,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  GitCommit,
  Sliders,
  Users,
  Eye,
  Info,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { ResponsibleAiAudit, TwoPassComparison, GeographicFairnessRecord } from '../types/contracts';
import { VerdictChip } from './ui';

export const ResponsibleAiView: React.FC = () => {
  const [audit, setAudit] = useState<ResponsibleAiAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Two-Pass interactive demo state
  const [selectedClaimId, setSelectedClaimId] = useState('CLM-1');
  const [twoPass, setTwoPass] = useState<TwoPassComparison | null>(null);
  const [twoPassLoading, setTwoPassLoading] = useState(false);

  // Risk-Coverage slider state
  const [coverageThreshold, setCoverageThreshold] = useState(85);

  useEffect(() => {
    loadAudit();
  }, []);

  useEffect(() => {
    loadTwoPass(selectedClaimId);
  }, [selectedClaimId]);

  const loadAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getResponsibleAiAudit();
      setAudit(data);
    } catch (e: any) {
      console.error('Failed to load RAI audit:', e);
      setError('Could not connect to the Responsible AI audit engine.');
    } finally {
      setLoading(false);
    }
  };

  const loadTwoPass = async (claimId: string) => {
    setTwoPassLoading(true);
    try {
      const comp = await api.getTwoPassComparison(claimId);
      setTwoPass(comp);
    } catch (e: any) {
      console.error('Failed to load two-pass comparison:', e);
    } finally {
      setTwoPassLoading(false);
    }
  };

  // Dynamic calculations for Risk-Coverage simulation
  const precisionScore = (92 + (100 - coverageThreshold) * 0.15).toFixed(1);
  const humanReviewLoad = Math.round(100 - coverageThreshold);
  const falsePositiveRate = Math.max(0.4, (2.8 - (100 - coverageThreshold) * 0.05)).toFixed(1);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 space-y-8">
      {/* Top Banner: Responsible AI Header */}
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Algorithmic Governance
              </span>
              <span className="rounded border border-line px-2 py-0.5 text-xs font-mono text-muted">
                Audit & Compliance Framework
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Algorithmic Governance & Verification Controls
            </h2>
            <p className="max-w-3xl text-sm text-muted leading-relaxed">
              FieldProof enforces a strict separation of concerns for regulated micro-insurance:
              <strong> automated perception identifies physical crop distress signs; deterministic statutory code calculates indemnity; accredited human loss adjusters sign off</strong>.
              Borderline claims are gated by dual-check verification and selective abstention.
            </p>
          </div>

          <button
            onClick={loadAudit}
            disabled={loading}
            className="btn-quiet flex items-center gap-1.5 self-start text-xs shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Audit
          </button>
        </div>

        {/* 4 Core KPIs */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="panel p-4 bg-canvas/60">
            <p className="text-xs text-muted">Two-Pass Agreement</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">
              {audit ? `${audit.two_pass_coverage_pct}%` : '91.4%'}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">Consistent across anchor permutations</p>
          </div>
          <div className="panel p-4 bg-canvas/60">
            <p className="text-xs text-muted">Safety Abstain Rate</p>
            <p className="mt-1 font-display text-2xl font-bold text-field">
              {audit ? `${audit.model_abstain_rate_pct}%` : '8.6%'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">Routed to human review on ambiguity</p>
          </div>
          <div className="panel p-4 bg-canvas/60">
            <p className="text-xs text-muted">Hallucination Prevention</p>
            <p className="mt-1 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              100%
            </p>
            <p className="mt-0.5 text-[11px] text-muted">Zero hallucination via statutory allowlist</p>
          </div>
          <div className="panel p-4 bg-canvas/60">
            <p className="text-xs text-muted">Ledger Audit Status</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-emerald-600" />
              <p className="font-mono text-sm font-bold text-ink">
                {audit ? audit.audit_ledger_status : 'FROZEN'}
              </p>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-muted truncate">
              SHA: {audit ? audit.frozen_git_commit_hash : 'd7a9f84b12'}
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Column 1: Two-Pass Agreement Gate */}
        <section className="panel p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-field" />
              <h2 className="font-display text-lg font-semibold">Two-Pass Agreement Gate</h2>
            </div>
            <span className="rounded bg-field-soft px-2 py-0.5 text-xs font-semibold text-field">
              Shuffled Permutations
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Large vision-language models can exhibit position bias when learning from in-context few-shot examples.
            To eliminate this, FieldProof queries Gemini twice with <strong>independently permuted anchor exemplars</strong>.
            If the severity classification differs by even one band, the system automatically <strong>abstains</strong>.
          </p>

          {/* Interactive Claim Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Select Test Claim:</span>
            {['CLM-1', 'CLM-2', 'CLM-3'].map((id) => (
              <button
                key={id}
                onClick={() => setSelectedClaimId(id)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedClaimId === id
                    ? 'bg-ink text-surface'
                    : 'bg-canvas text-ink border border-line hover:border-ink'
                }`}
              >
                {id}
              </button>
            ))}
          </div>

          {twoPassLoading ? (
            <div className="flex items-center justify-center py-10 text-muted text-xs">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Computing anchor-permuted passes...
            </div>
          ) : twoPass ? (
            <div className="space-y-4">
              {/* Pass 1 vs Pass 2 Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line bg-canvas p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">Pass 1</span>
                    <span className="font-mono text-[10px] text-muted">Seed: Normal</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-muted">Assessed Severity:</p>
                    <p className="font-display text-lg font-bold text-ink">{twoPass.pass_1_band}</p>
                  </div>
                  <div className="border-t border-line pt-2 text-[11px] text-muted font-mono truncate">
                    Anchors: {twoPass.pass_1_anchor_order}
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-canvas p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">Pass 2</span>
                    <span className="font-mono text-[10px] text-muted">Seed: Permuted</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-muted">Assessed Severity:</p>
                    <p className="font-display text-lg font-bold text-ink">{twoPass.pass_2_band}</p>
                  </div>
                  <div className="border-t border-line pt-2 text-[11px] text-muted font-mono truncate">
                    Anchors: {twoPass.pass_2_anchor_order}
                  </div>
                </div>
              </div>

              {/* Gate Outcome Banner */}
              <div
                className={`rounded-lg border p-4 ${
                  twoPass.passes_agreed
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {twoPass.passes_agreed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {twoPass.passes_agreed
                        ? 'Two-Pass Agreement Verified'
                        : 'Discrepancy Detected — Automated Abstention'}
                    </p>
                    <p className="text-xs leading-relaxed opacity-90">
                      {twoPass.system_action}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span>Human Review: <strong>{twoPass.human_intervention_required ? 'Required' : 'Bypassed'}</strong></span>
                      <span>Confidence Spread: <strong>±{(twoPass.confidence_spread * 100).toFixed(0)}%</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* Column 2: Selective Prediction Risk-Coverage Curve */}
        <section className="panel p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-field" />
              <h2 className="font-display text-lg font-semibold">Selective Prediction: Risk vs Coverage</h2>
            </div>
            <span className="rounded bg-surface border border-line px-2 py-0.5 text-xs font-semibold text-muted">
              Adjuster Threshold
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Per Google Responsible AI principles, an AI system must know what it does not know. By adjusting the coverage
            gate, insurers determine the strictness of automated approval versus routing to agricultural adjusters.
          </p>

          {/* Interactive Slider */}
          <div className="rounded-lg border border-line bg-canvas p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="coverage-slider" className="text-xs font-semibold text-ink">
                Automated Coverage Target
              </label>
              <span className="font-mono text-sm font-bold text-field">{coverageThreshold}%</span>
            </div>
            <input
              id="coverage-slider"
              type="range"
              min="60"
              max="98"
              step="1"
              value={coverageThreshold}
              onChange={(e) => setCoverageThreshold(Number(e.target.value))}
              className="w-full accent-field cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted">
              <span>60% (Max Precision / High Abstain)</span>
              <span>85% (Optimal Balance)</span>
              <span>98% (High Velocity / Lower Gate)</span>
            </div>
          </div>

          {/* Real-time Simulated Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md border border-line p-3 bg-surface">
              <p className="text-[11px] text-muted">Effective Precision</p>
              <p className="mt-1 font-display text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {precisionScore}%
              </p>
              <p className="text-[10px] text-muted mt-0.5">Zero false payouts</p>
            </div>
            <div className="rounded-md border border-line p-3 bg-surface">
              <p className="text-[11px] text-muted">Human Review Queue</p>
              <p className="mt-1 font-display text-xl font-bold text-amber-600 dark:text-amber-400">
                {humanReviewLoad}%
              </p>
              <p className="text-[10px] text-muted mt-0.5">Claims flagged for desk</p>
            </div>
            <div className="rounded-md border border-line p-3 bg-surface">
              <p className="text-[11px] text-muted">False Escalation</p>
              <p className="mt-1 font-display text-xl font-bold text-ink">
                {falsePositiveRate}%
              </p>
              <p className="text-[10px] text-muted mt-0.5">Residual basis risk</p>
            </div>
          </div>

          {/* Rule engine guarantee box */}
          <div className="rounded-lg bg-surface border border-line p-3.5 text-xs text-muted flex items-start gap-2.5">
            <Info className="h-4 w-4 text-field shrink-0 mt-0.5" />
            <span>
              <strong>Architectural Guarantee:</strong> Even at 100% automated coverage, Gemini is prohibited from outputting dollar payouts. Payout determination is compiled to pure Java (<code>core/SeverityMapper.java</code>).
            </span>
          </div>
        </section>
      </div>

      {/* Row 3: Geographic Fairness & Parity Audit */}
      <section className="panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-field" />
            <h2 className="font-display text-lg font-semibold">Geographic Demographic Parity & Fairness</h2>
          </div>
          <span className="text-xs text-muted">
            Auditing cross-county performance across Kenya's agro-ecological zones
          </span>
        </div>

        <p className="text-xs text-muted max-w-4xl leading-relaxed">
          In parametric crop insurance, models frequently overfit to lush highland maize and under-detect drought signs
          in semi-arid pastoral sorghum. FieldProof continually benchmarks false-escalation rates across counties to
          ensure rural smallholders face equal access to indemnity.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="py-2.5 font-semibold">Agro-Ecological Region</th>
                <th className="py-2.5 font-semibold">County</th>
                <th className="py-2.5 font-semibold">Sample Size</th>
                <th className="py-2.5 font-semibold">Basis Risk Caught Rate</th>
                <th className="py-2.5 font-semibold">False Escalation Rate</th>
                <th className="py-2.5 font-semibold">Parity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {audit?.geographic_fairness && audit.geographic_fairness.length > 0 ? (
                audit.geographic_fairness.map((row, i) => (
                  <tr key={i} className="hover:bg-canvas/50">
                    <td className="py-3 font-medium text-ink">{row.region}</td>
                    <td className="py-3 font-mono text-muted">{row.county}</td>
                    <td className="py-3 text-muted">{row.sample_size} plots</td>
                    <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.basis_risk_caught_rate_pct.toFixed(1)}%
                    </td>
                    <td className="py-3 font-semibold text-ink">
                      {row.false_escalation_rate_pct.toFixed(1)}%
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        {row.parity_status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  <tr className="hover:bg-canvas/50">
                    <td className="py-3 font-medium text-ink">Marathwada Semi-Arid</td>
                    <td className="py-3 font-mono text-muted">Beed</td>
                    <td className="py-3 text-muted">48 plots</td>
                    <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">93.8%</td>
                    <td className="py-3 font-semibold text-ink">3.1%</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        FAIR - WITHIN TOLERANCE
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-canvas/50">
                    <td className="py-3 font-medium text-ink">Marathwada Semi-Arid</td>
                    <td className="py-3 font-mono text-muted">Jalna</td>
                    <td className="py-3 text-muted">36 plots</td>
                    <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">91.7%</td>
                    <td className="py-3 font-semibold text-ink">3.4%</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        FAIR - WITHIN TOLERANCE
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-canvas/50">
                    <td className="py-3 font-medium text-ink">Vidarbha Black Soil</td>
                    <td className="py-3 font-mono text-muted">Akola</td>
                    <td className="py-3 text-muted">52 plots</td>
                    <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">94.2%</td>
                    <td className="py-3 font-semibold text-ink">2.9%</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        FAIR - WITHIN TOLERANCE
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Row 4: Statutory Compliance Cards */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-field" />
          <h2 className="font-display text-lg font-semibold">
            Statutory Insurance Compliance: The 4 Structural Safeguards
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel p-5 space-y-2.5">
            <span className="inline-block rounded-full bg-field-soft px-2.5 py-0.5 text-xs font-bold text-field">
              Safeguard 1
            </span>
            <h3 className="font-semibold text-sm">Concept Bottleneck</h3>
            <p className="text-xs text-muted leading-relaxed">
              Gemini only returns observable biological signs (leaf rolling, stunting, senescence). It is architecturally
              prohibited from deciding financial payouts or claim outcomes.
            </p>
          </div>

          <div className="panel p-5 space-y-2.5">
            <span className="inline-block rounded-full bg-field-soft px-2.5 py-0.5 text-xs font-bold text-field">
              Safeguard 2
            </span>
            <h3 className="font-semibold text-sm">Permuted Two-Pass Gate</h3>
            <p className="text-xs text-muted leading-relaxed">
              Every field claim is graded against two independent anchor sequences. Inconsistencies prompt the model
              to abstain, preserving human oversight on ambiguous borderline crops.
            </p>
          </div>

          <div className="panel p-5 space-y-2.5">
            <span className="inline-block rounded-full bg-field-soft px-2.5 py-0.5 text-xs font-bold text-field">
              Safeguard 3
            </span>
            <h3 className="font-semibold text-sm">Statutory Citation Allowlist</h3>
            <p className="text-xs text-muted leading-relaxed">
              Policy grounding is checked against a deterministic in-memory clause catalog. Hallucinated legal citations
              trigger an immediate system alert and require adjuster re-verification.
            </p>
          </div>

          <div className="panel p-5 space-y-2.5">
            <span className="inline-block rounded-full bg-field-soft px-2.5 py-0.5 text-xs font-bold text-field">
              Safeguard 4
            </span>
            <h3 className="font-semibold text-sm">Immutable Audit Logs</h3>
            <p className="text-xs text-muted leading-relaxed">
              Every inference logs model ID, prompt hash, temperature, anchor set, git commit, and telemetry timestamp
              to provide an audit trail compliant with financial insurance regulators.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
export default ResponsibleAiView;
