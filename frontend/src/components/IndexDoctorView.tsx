import React, { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IndexDoctorSimulation } from '../types/contracts';
import { api } from '../services/api';
import { fmtUsd, toPct } from '../lib/format';
import { ErrorNote, Loading } from './ui';
import { ActuarialForecasterView } from './ActuarialForecasterView';

const CURRENT_RULE = 30; // the trigger committed before evaluation
const SWEEP = [10, 15, 20, 25, 30, 35, 40, 45, 50];

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => { const id = setTimeout(() => setD(v), ms); return () => clearTimeout(id); }, [v, ms]);
  return d;
}

function delta(now: number, base: number, fmt: (n: number) => string, goodWhenDown: boolean) {
  const diff = now - base;
  if (Math.abs(diff) < 1e-9) return <span className="text-muted">no change</span>;
  const good = goodWhenDown ? diff < 0 : diff > 0;
  return <span className={good ? 'font-semibold text-field' : 'font-semibold text-loss-ink'}>{diff > 0 ? '+' : '−'}{fmt(Math.abs(diff))}</span>;
}

export const IndexDoctorView: React.FC = () => {
  const [pct, setPct] = useState(CURRENT_RULE);
  const debounced = useDebounced(pct, 200);
  const [sim, setSim] = useState<IndexDoctorSimulation | null>(null);
  const [base, setBase] = useState<IndexDoctorSimulation | null>(null);
  const [curve, setCurve] = useState<IndexDoctorSimulation[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);

  const loadBase = () => {
    setState('loading');
    api.simulateIndexDoctor(CURRENT_RULE)
      .then((b) => { setBase(b); setSim(b); setState('ready'); })
      .catch(() => setState('error'));
    Promise.all(SWEEP.map((p) => api.simulateIndexDoctor(p).catch(() => null)))
      .then((r) => setCurve(r.filter(Boolean) as IndexDoctorSimulation[]));
  };
  useEffect(loadBase, []);

  useEffect(() => {
    if (state !== 'ready') return;
    let live = true;
    setBusy(true);
    api.simulateIndexDoctor(debounced)
      .then((s) => { if (live) setSim(s); })
      .catch(() => {})
      .finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [debounced, state]);

  const chartData = useMemo(() => curve.map((c) => ({
    p: c.trigger_percentile,
    missed: +toPct(c.gap_rate).toFixed(1),
    overpaid: +toPct(c.overpayment_rate).toFixed(1),
  })), [curve]);

  if (state === 'loading') return <div className="mx-auto max-w-7xl px-5 lg:px-8"><Loading label="Running the current rule on past seasons" /></div>;
  if (state === 'error' || !base || !sim) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <ErrorNote title="Couldn't run the simulation" body="The simulator did not respond. Check that the backend and BigQuery connection are up, then try again." onRetry={loadBase} />
      </div>
    );
  }

  const n = (v: number) => v.toLocaleString();
  const pp = (v: number) => `${v.toFixed(1)} pts`;
  const rows = [
    {
      label: 'Failed fields the index misses',
      hint: 'Damage in photos and satellite, but no payout',
      base: `${n(base.gap_count)} (${toPct(base.gap_rate).toFixed(1)}%)`,
      now: `${n(sim.gap_count)} (${toPct(sim.gap_rate).toFixed(1)}%)`,
      change: delta(toPct(sim.gap_rate), toPct(base.gap_rate), pp, true),
    },
    {
      label: 'Payouts to fields with no damage',
      hint: 'The index pays but the photos show a healthy crop',
      base: `${n(base.overpayment_count)} (${toPct(base.overpayment_rate).toFixed(1)}%)`,
      now: `${n(sim.overpayment_count)} (${toPct(sim.overpayment_rate).toFixed(1)}%)`,
      change: delta(toPct(sim.overpayment_rate), toPct(base.overpayment_rate), pp, true),
    },
    {
      label: 'Plots paid',
      hint: `Out of ${n(sim.total_plots)} historical plots`,
      base: `${n(base.payout_count)} (${toPct(base.payout_frequency).toFixed(1)}%)`,
      now: `${n(sim.payout_count)} (${toPct(sim.payout_frequency).toFixed(1)}%)`,
      change: delta(sim.payout_count, base.payout_count, (v) => n(v), false),
    },
    {
      label: 'Total paid out',
      hint: `At a flat ${fmtUsd(sim.flat_payout_per_plot_usd)} per paid plot`,
      base: fmtUsd(base.illustrative_payout_total_usd),
      now: fmtUsd(sim.illustrative_payout_total_usd),
      change: (() => {
        const diff = sim.illustrative_payout_total_usd - base.illustrative_payout_total_usd;
        if (!diff) return <span className="text-muted">no change</span>;
        return <span className="font-semibold text-ink">{diff > 0 ? '+' : '−'}{fmtUsd(Math.abs(diff))}</span>;
      })(),
    },
  ];

  const maxGap = Math.max(...sim.county_breakdown.map((c) => toPct(c.gap_rate)), 1);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Index Doctor</h1>
      <p className="mt-2 max-w-prose text-muted">
        Move the payout trigger and see what it would have done on {n(sim.total_plots)} past plots: how many failed fields
        it would still miss, and what it would cost.
      </p>

      {/* Control */}
      <section aria-label="Trigger setting" className="panel mt-8 p-6 sm:p-8">
        <p className="max-w-3xl font-display text-xl leading-snug sm:text-2xl">
          Pay when a plot's season rain falls below the{' '}
          <span className="inline-block min-w-[4ch] rounded bg-field-soft px-2 text-field">{pct}th</span>{' '}
          percentile of its own history
          <span className="text-muted"> (about {Math.round(sim.trigger_rain_mm_median)} mm for a typical plot).</span>
        </p>
        <div className="mt-8">
          <label htmlFor="trigger" className="sr-only">Trigger percentile</label>
          <input id="trigger" type="range" min={10} max={50} step={1} value={pct}
            onChange={(e) => setPct(parseInt(e.target.value, 10))}
            className="h-2 w-full cursor-pointer" aria-valuetext={`${pct}th percentile`} />
          <div className="relative mt-2 h-10 text-sm text-muted">
            <span className="absolute left-0">10th, fewer payouts</span>
            <span className="absolute -translate-x-1/2 text-center font-semibold text-ink" style={{ left: `${((CURRENT_RULE - 10) / 40) * 100}%` }}>
              <span className="mx-auto block h-2 w-0.5 bg-ink" />
              current rule
            </span>
            <span className="absolute right-0">50th, more payouts</span>
          </div>
        </div>
        {pct !== CURRENT_RULE && (
          <button onClick={() => setPct(CURRENT_RULE)} className="btn-text mt-2">Back to the current rule</button>
        )}
      </section>

      {/* Comparison */}
      <section aria-labelledby="cmp-h" className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 id="cmp-h" className="text-lg font-semibold">What changes</h2>
          {busy && <span className="text-sm text-muted" role="status">Updating…</span>}
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-line text-sm">
                <th scope="col" className="p-4 font-semibold"> </th>
                <th scope="col" className="p-4 font-semibold">Current rule ({CURRENT_RULE}th)</th>
                <th scope="col" className="p-4 font-semibold">This setting ({pct}th)</th>
                <th scope="col" className="p-4 font-semibold">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-line last:border-b-0">
                  <th scope="row" className="p-4 font-normal">
                    <span className="block font-semibold">{r.label}</span>
                    <span className="block text-sm text-muted">{r.hint}</span>
                  </th>
                  <td className="p-4 text-muted">{r.base}</td>
                  <td className="p-4 font-semibold">{r.now}</td>
                  <td className="p-4">{r.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        {/* Trade-off */}
        <section aria-labelledby="trade-h">
          <h2 id="trade-h" className="text-lg font-semibold">The trade-off</h2>
          <p className="mt-1 text-sm text-muted">A higher trigger misses fewer failed fields but pays more fields that were fine.</p>
          <div className="panel mt-3 h-72 p-3">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 24, right: 16, bottom: 4, left: -8 }}>
                  <CartesianGrid stroke="#D8DDD4" strokeDasharray="3 3" />
                  <XAxis dataKey="p" tickFormatter={(v) => `${v}th`} tick={{ fill: '#56655B', fontSize: 12 }} stroke="#8A968D" />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: '#56655B', fontSize: 12 }} stroke="#8A968D" />
                  <Tooltip formatter={(v: number) => `${v}%`} labelFormatter={(l) => `${l}th percentile`} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <ReferenceLine x={CURRENT_RULE} stroke="#16231C" strokeDasharray="4 3" label={{ value: 'current', fill: '#16231C', fontSize: 12, position: 'top' }} />
                  <ReferenceLine x={pct} stroke="#1F5E3B" />
                  <Line type="monotone" dataKey="missed" name="Failed fields missed" stroke="#B45309" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="overpaid" name="Healthy fields paid" stroke="#5B4BA0" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Loading label="Drawing the curve" />
            )}
          </div>
        </section>

        {/* Counties */}
        <section aria-labelledby="county-h">
          <h2 id="county-h" className="text-lg font-semibold">Where the misses are, at the {pct}th</h2>
          <p className="mt-1 text-sm text-muted">Counties with the most failed fields the index doesn't pay.</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="p-3 font-semibold">County</th>
                  <th scope="col" className="p-3 font-semibold">Plots</th>
                  <th scope="col" className="p-3 font-semibold">Missed</th>
                  <th scope="col" className="w-2/5 p-3 font-semibold">Miss rate</th>
                </tr>
              </thead>
              <tbody>
                {[...sim.county_breakdown].sort((a, b) => toPct(b.gap_rate) - toPct(a.gap_rate)).map((c) => (
                  <tr key={c.county} className="border-b border-line last:border-b-0">
                    <th scope="row" className="p-3 font-semibold">{c.county}</th>
                    <td className="p-3">{n(c.total_plots)}</td>
                    <td className="p-3">{n(c.gap_count)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-sunk">
                          <div className="h-2 rounded-full bg-loss" style={{ width: `${(toPct(c.gap_rate) / maxGap) * 100}%` }} />
                        </div>
                        <span className="w-12 text-right">{toPct(c.gap_rate).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Predictive Actuarial Risk & Forward Forecast Section */}
      <div className="mt-14 border-t border-line pt-10">
        <ActuarialForecasterView />
      </div>

      <p className="mt-10 max-w-prose text-sm text-muted">
        This replays the rule on historical test plots from the dataset. The payout total assumes a flat amount per paid plot
        for illustration. It is a way to explore the rule, not pricing advice.
      </p>
    </div>
  );
};
