import React, { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, Copy } from 'lucide-react';
import { ValidationSummary, api } from '../services/api';
import { fmtStamp, fmtUsd, toPct } from '../lib/format';
import { ErrorNote, Loading } from './ui';

interface Props { onOpenPolicy: () => void }

/** Plain names for the integrity test cases. Unknown ones are shown as readable text. */
function attackName(v: string): string {
  const s = v.toLowerCase();
  if (s.includes('dup') && (s.includes('cross') || s.includes('across') || s.includes('earlier'))) return 'Photo reused from an earlier claim';
  if (s.includes('dup')) return 'Same photo sent twice';
  if (s.includes('screen') || s.includes('recapture')) return 'Photo of a screen';
  if (s.includes('mismatch') || s.includes('different')) return 'Photos from different fields';
  if (s.includes('non') && s.includes('field')) return 'Not a field';
  if (s.includes('blur') || s.includes('quality')) return 'Blurry or dark photo';
  return v.replace(/_/g, ' ');
}

export const ValidationView: React.FC<Props> = ({ onOpenPolicy }) => {
  const [data, setData] = useState<ValidationSummary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [copied, setCopied] = useState(false);
  const [detail, setDetail] = useState(false);
  const [claimsPerYear, setClaimsPerYear] = useState(5000);

  const load = () => {
    setState('loading');
    api.getValidationSummary().then((d) => { setData(d); setState('ready'); }).catch(() => setState('error'));
  };
  useEffect(load, []);

  const full = useMemo(() => {
    const arms = data?.ablation_study ?? [];
    return arms.find((a) => a.arm_id === 'ARM_4') ?? arms[arms.length - 1];
  }, [data]);

  if (state === 'loading') return <div className="mx-auto max-w-7xl px-5 lg:px-8"><Loading label="Loading test results" /></div>;
  if (state === 'error' || !data || !full) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <ErrorNote title="Couldn't load the test results" body="The results service did not respond. Check that the backend is running, then try again." onRetry={load} />
      </div>
    );
  }

  const fp = data.frozen_protocol;
  const ue = data.unit_economics;
  const integ = data.integrity_forensics;

  const copy = () => {
    navigator.clipboard?.writeText(fp.frozen_commit_hash).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };

  // Cost model from measured values. Only the claim volume is adjustable.
  const visit = ue.manual_field_visit_cost_usd;
  const ai = ue.ai_triage_cost_per_claim_usd;
  const toPerson = toPct(ue.abstain_rate_pct) / 100;
  const manual = claimsPerYear * visit;
  const hybrid = claimsPerYear * ai + claimsPerYear * toPerson * visit;
  const saved = Math.max(0, manual - hybrid);

  const rc = data.risk_coverage_curve.map((p) => ({ coverage: toPct(p.coverage_pct), precision: toPct(p.precision_pct), label: p.label }));

  const Big: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="font-display font-semibold text-field">{children}</span>
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">How well it works</h1>
      <p className="mt-2 max-w-prose text-muted">
        Measured on held-out claims from the public Eyes on the Ground dataset, against a payout rule that was locked
        before any test photo was scored.
      </p>

      {/* Headline as a sentence */}
      <section aria-label="Headline results" className="mt-10 border-y border-line py-10">
        <p className="max-w-5xl font-display text-2xl leading-snug sm:text-3xl sm:leading-tight">
          FieldProof caught <Big>{full.natural_gaps_caught} of {full.total_natural_gaps}</Big> failed fields the index missed.
          It wrongly escalated <Big>{toPct(full.false_escalation_rate).toFixed(1)}%</Big> of claims, handed{' '}
          <Big>{toPct(full.abstain_rate).toFixed(1)}%</Big> to a person when unsure, and cost{' '}
          <Big>{fmtUsd(full.cost_per_claim_usd, 3)}</Big> per claim.
        </p>
        <p className="mt-4 text-sm text-muted">Full system ({full.arm_name}). The other setups are compared below.</p>
      </section>

      {/* Locked rule */}
      <section aria-labelledby="lock-h" className="mt-12 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="lock-h" className="text-xl font-semibold">The rule was locked first</h2>
          <p className="mt-2 text-muted">
            We wrote the payout rule and the thresholds, saved them in version control, and only then scored the test
            claims. Nothing was tuned after seeing results.
          </p>
        </div>
        <div className="panel lg:col-span-8">
          <dl className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            {[
              ['Pays when season rain is below', `the ${fp.trigger_percentile_cutoff}th percentile`],
              ['Satellite counts as stressed below', `${fp.ndvi_stress_cutoff_z} standard deviations`],
              ['Critical growth stage', fp.critical_growth_stage.replace(/_/g, ' ')],
              ['Locked on', fmtStamp(fp.frozen_commit_timestamp)],
            ].map(([k, v]) => (
              <div key={k} className="p-5 sm:border-b sm:border-line sm:[&:nth-child(odd)]:border-r">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="mt-1 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm">
              Version <span className="font-mono">{fp.frozen_commit_hash}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={copy} className="btn-quiet py-2 text-sm">
                {copied ? <><Check className="h-4 w-4" aria-hidden /> Copied</> : <><Copy className="h-4 w-4" aria-hidden /> Copy version</>}
              </button>
              <button onClick={onOpenPolicy} className="btn-quiet py-2 text-sm">Read the rule</button>
            </div>
          </div>
        </div>
      </section>

      {/* Ablation */}
      <section aria-labelledby="arms-h" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="arms-h" className="text-xl font-semibold">What each part adds</h2>
            <p className="mt-1 max-w-prose text-muted">The same test claims, run through four setups, from a plain prompt to the full system.</p>
          </div>
          <button onClick={() => setDetail((v) => !v)} aria-pressed={detail} className="btn-text">
            {detail ? 'Hide statistical detail' : 'Show statistical detail'}
          </button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="p-4 font-semibold">Setup</th>
                <th scope="col" className="p-4 font-semibold">Correct</th>
                <th scope="col" className="p-4 font-semibold">Missed losses caught</th>
                <th scope="col" className="p-4 font-semibold">Wrongly escalated</th>
                <th scope="col" className="p-4 font-semibold">Handed to a person</th>
                {detail && <>
                  <th scope="col" className="p-4 font-semibold">Precision</th>
                  <th scope="col" className="p-4 font-semibold">Recall</th>
                  <th scope="col" className="p-4 font-semibold">F1</th>
                  <th scope="col" className="p-4 font-semibold">Time</th>
                </>}
                <th scope="col" className="p-4 font-semibold">Cost per claim</th>
              </tr>
            </thead>
            <tbody>
              {data.ablation_study.map((arm) => {
                const isFull = arm.arm_id === full.arm_id;
                return (
                  <tr key={arm.arm_id} className={`border-b border-line last:border-b-0 ${isFull ? 'bg-field-soft' : ''}`}>
                    <th scope="row" className="p-4 font-normal">
                      <span className="block font-semibold">{arm.arm_name}{isFull && <span className="ml-2 text-field">(full system)</span>}</span>
                      <span className="block text-muted">{arm.description}</span>
                    </th>
                    <td className="p-4 font-semibold">{toPct(arm.accuracy).toFixed(1)}%</td>
                    <td className="p-4">{arm.natural_gaps_caught} of {arm.total_natural_gaps}</td>
                    <td className="p-4">{toPct(arm.false_escalation_rate).toFixed(1)}%</td>
                    <td className="p-4">{toPct(arm.abstain_rate).toFixed(1)}%</td>
                    {detail && <>
                      <td className="p-4">{toPct(arm.precision).toFixed(1)}%</td>
                      <td className="p-4">{toPct(arm.recall).toFixed(1)}%</td>
                      <td className="p-4">{arm.f1_score.toFixed(3)}</td>
                      <td className="p-4">{(arm.latency_ms / 1000).toFixed(1)} s</td>
                    </>}
                    <td className="p-4">{fmtUsd(arm.cost_per_claim_usd, 3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-14 grid gap-12 lg:grid-cols-2">
        {/* Risk–coverage */}
        <section aria-labelledby="rc-h">
          <h2 id="rc-h" className="text-xl font-semibold">Stepping back when unsure</h2>
          <p className="mt-1 max-w-prose text-muted">
            When the two photo checks disagree, the claim goes to a person. Deciding fewer claims automatically makes the
            ones it does decide more reliable.
          </p>
          <div className="panel mt-4 h-72 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rc} margin={{ top: 10, right: 16, bottom: 18, left: -4 }}>
                <CartesianGrid stroke="#D8DDD4" strokeDasharray="3 3" />
                <XAxis dataKey="coverage" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => `${Math.round(v)}%`}
                  tick={{ fill: '#56655B', fontSize: 12 }} stroke="#8A968D"
                  label={{ value: 'Claims decided automatically', position: 'insideBottom', offset: -10, fill: '#56655B', fontSize: 12 }} />
                <YAxis domain={['auto', 'auto']} tickFormatter={(v) => `${Math.round(v)}%`} tick={{ fill: '#56655B', fontSize: 12 }} stroke="#8A968D" />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Correct when it decides']} labelFormatter={(l) => `${Math.round(Number(l))}% decided automatically`} />
                <Line type="monotone" dataKey="precision" stroke="#1F5E3B" strokeWidth={2.5} dot={{ r: 3, fill: '#1F5E3B' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Integrity */}
        <section aria-labelledby="int-h">
          <h2 id="int-h" className="text-xl font-semibold">Catching bad photos</h2>
          <p className="mt-1 max-w-prose text-muted">
            We planted {integ.total_planted_bundles} claims with bad photos among the real ones. The checks caught{' '}
            {integ.detected_bundles} of them ({toPct(integ.detection_rate_pct).toFixed(0)}%) and wrongly held{' '}
            {integ.false_holds_on_clean_bundles} clean claims.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="p-3 font-semibold">Problem planted</th>
                  <th scope="col" className="p-3 font-semibold">Caught</th>
                  <th scope="col" className="w-1/3 p-3 font-semibold"><span className="sr-only">Share caught</span></th>
                </tr>
              </thead>
              <tbody>
                {integ.breakdown.map((b) => (
                  <tr key={b.attack_vector} className="border-b border-line last:border-b-0">
                    <th scope="row" className="p-3 font-normal">{attackName(b.attack_vector)}</th>
                    <td className="p-3 font-semibold">{b.caught} of {b.tested}</td>
                    <td className="p-3">
                      <div className="h-2 rounded-full bg-sunk">
                        <div className="h-2 rounded-full bg-field" style={{ width: `${b.tested ? (b.caught / b.tested) * 100 : 0}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">These checks make fraud harder. They do not make it impossible.</p>
        </section>
      </div>

      {/* Cost */}
      <section aria-labelledby="cost-h" className="mt-14 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="cost-h" className="text-xl font-semibold">What it costs an insurer</h2>
          <p className="mt-2 text-muted">
            Every claim is checked by FieldProof. Only the ones it hands to a person need a field visit. Measured AI cost:{' '}
            {fmtUsd(ai, 3)} per claim. Field visit: {fmtUsd(visit)} (our assumption).
          </p>
        </div>
        <div className="panel p-6 lg:col-span-8">
          <label htmlFor="vol" className="flex items-baseline justify-between">
            <span className="font-semibold">Claims per season</span>
            <span className="font-display text-xl font-semibold">{claimsPerYear.toLocaleString()}</span>
          </label>
          <input id="vol" type="range" min={500} max={50000} step={500} value={claimsPerYear}
            onChange={(e) => setClaimsPerYear(parseInt(e.target.value, 10))} className="mt-3 w-full" />
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted">A field visit for every claim</dt>
              <dd className="mt-1 text-lg font-semibold">{fmtUsd(manual)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">FieldProof, plus visits where needed</dt>
              <dd className="mt-1 text-lg font-semibold">{fmtUsd(hybrid)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Saved</dt>
              <dd className="mt-1 text-lg font-semibold text-field">{fmtUsd(saved)} ({manual ? Math.round((saved / manual) * 100) : 0}%)</dd>
            </div>
          </dl>
          <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
            Decisions in about {ue.decision_turnaround_hours} hours instead of {ue.traditional_turnaround_days} days.
          </p>
        </div>
      </section>
    </div>
  );
};
