import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ActiveTab } from '../App';
import { SeasonChart } from './SeasonChart';

interface HeroLandingProps {
  onNavigate: (tab: ActiveTab, claimId?: string) => void;
}

const SOURCES = [
  {
    source: 'Rain index',
    says: 'The season total was 341 mm. The policy pays below 290 mm.',
    loss: false,
  },
  {
    source: "Ramesh's photos",
    says: 'Rolled leaves, drying canopy and cracked soil. Two separate checks both graded it severe.',
    loss: true,
  },
  {
    source: 'Satellite',
    says: 'Vegetation is much less green than this plot usually is at this time of year.',
    loss: true,
  },
];

const STEPS = [
  {
    title: 'Check the photos',
    body: 'Copies of old photos, photos of a screen and photos from different fields are caught first.',
  },
  {
    title: 'Grade the damage',
    body: 'Gemini scores what it can see, like leaf rolling and cracked soil, twice. If the two checks disagree, a person decides.',
  },
  {
    title: 'Gather the records',
    body: 'Rainfall, satellite greenness and the timing of dry spells for that plot.',
  },
  {
    title: 'Apply the fixed rules',
    body: 'Tested code, not the AI, applies the payout rule. The rule was locked before we tested anything.',
  },
  {
    title: 'A person decides',
    body: 'The adjuster approves, rejects or sends for a field visit. Every decision is recorded.',
  },
];

const PEOPLE: { who: string; does: string; cta: string; tab: ActiveTab }[] = [
  { who: 'Farmer', does: 'Sends three photos from a phone in a simple guided flow.', cta: 'Open the farmer page', tab: 'farmer' },
  { who: 'Claims adjuster', does: 'Sees every source side by side, reads a short brief and makes the call.', cta: 'Open the claims queue', tab: 'insurer' },
  { who: 'Actuarial team', does: 'Sees where the index misses losses and tests a new trigger on past seasons.', cta: 'Open Index Doctor', tab: 'doctor' },
];

export const HeroLanding: React.FC<HeroLandingProps> = ({ onNavigate }) => (
  <div>
    {/* Hero */}
    <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:pt-16">
      <div className="lg:col-span-5 lg:pt-6">
        <h1 className="text-3xl font-semibold sm:text-4xl lg:text-[3.4rem] lg:leading-[1.05]">
          His maize failed. The rain index said it was a normal season.
        </h1>
        <p className="mt-6 max-w-prose text-lg leading-8 text-muted">
          Index insurance pays when an area's rainfall crosses a line. When one field fails and the index doesn't move,
          the farmer gets nothing and the insurer never finds out.
        </p>
        <p className="mt-4 max-w-prose text-lg leading-8 text-muted">
          FieldProof finds those missed losses and gives each one to a human adjuster, with the evidence.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button onClick={() => onNavigate('farmer')} className="btn-primary px-5 py-3 text-base">
            Follow Ramesh's claim
          </button>
          <button onClick={() => onNavigate('insurer')} className="btn-quiet px-5 py-3 text-base">
            Open the claims queue
          </button>
        </div>
        <p className="mt-4 text-sm text-faint">A three-minute walk-through. No sign-in.</p>
      </div>
      <div className="lg:col-span-7">
        <SeasonChart />
      </div>
    </section>

    {/* Three sources */}
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="text-2xl font-semibold">Three sources, read together</h2>
            <p className="mt-4 max-w-prose text-muted">
              Most systems pick one source and trust it. FieldProof puts the index, the farmer's photos and the satellite
              side by side, and flags the claims where they disagree.
            </p>
            <p className="mt-4 max-w-prose text-sm text-muted">
              In published field research, severe damage was visible in farmer photos at 71% of affected sites, against at
              most 34% for index products (Ceballos, Kramer and Robles, 2019).
            </p>
          </div>

          <div className="lg:col-span-8">
            <table className="w-full text-left">
              <caption className="sr-only">What each source says about Ramesh's plot</caption>
              <thead>
                <tr className="border-b border-ink text-sm">
                  <th scope="col" className="w-40 py-3 pr-4 font-semibold">Source</th>
                  <th scope="col" className="py-3 pr-4 font-semibold">What it says about plot P-0142</th>
                  <th scope="col" className="w-32 py-3 font-semibold">Shows a loss?</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((s) => (
                  <tr key={s.source} className="border-b border-line align-top">
                    <th scope="row" className="py-4 pr-4 font-semibold">{s.source}</th>
                    <td className="py-4 pr-4 text-muted">{s.says}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-2 rounded px-2 py-1 text-sm font-semibold ${
                        s.loss ? 'bg-loss-soft text-loss-ink' : 'bg-calm-soft text-calm'
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${s.loss ? 'bg-loss' : 'bg-calm'}`} />
                        {s.loss ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 rounded-lg bg-loss-soft p-5">
              <p className="font-semibold text-loss-ink">Result: missed by the index, badly timed dry spell</p>
              <p className="mt-1 text-ink">
                Two sources show a loss the index did not pay. The claim goes to an adjuster with the photos, the rain
                record and a short brief that cites the policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* How a claim moves */}
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <h2 className="max-w-3xl text-2xl font-semibold sm:text-3xl">
        The AI looks at the photos. Fixed rules decide the outcome. A person signs off.
      </h2>
      <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-t-2 border-ink pt-4">
            <span className="font-display text-2xl font-semibold text-field">{i + 1}</span>
            <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>

    {/* Enterprise Platform Capabilities */}
    <section className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-field-soft px-3 py-1 text-xs font-semibold text-field">
            <span>Enterprise Insurance Infrastructure</span>
            <span>•</span>
            <span>PMFBY & WBCIS Compatible</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl text-ink">
            Sovereign Multi-Sensor Parametric Reconciliation
          </h2>
          <p className="mt-2 text-muted max-w-2xl text-sm leading-relaxed">
            Eliminating basis risk for micro-insurance portfolios by cross-correlating high-resolution satellite telemetry,
            statutory policy binders, and verifiable on-field crop evidence.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Capability 1 */}
          <div className="panel p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <span className="rounded bg-canvas border border-line px-2 py-0.5 text-xs font-semibold text-ink">
                Multi-Source Telemetry
              </span>
              <h3 className="font-semibold text-base">Satellite & Field Telemetry</h3>
              <p className="text-xs text-muted leading-relaxed">
                Dynamic Sentinel-2 10m vegetative anomaly mapping and CHIRPS precipitation tracking correlated with
                geotagged field photos.
              </p>
            </div>
            <button
              onClick={() => onNavigate('insurer')}
              className="btn-quiet text-xs w-full py-2 flex items-center justify-center gap-1 font-semibold text-field"
            >
              Explore Claims Desk <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Capability 2 */}
          <div className="panel p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <span className="rounded bg-canvas border border-line px-2 py-0.5 text-xs font-semibold text-ink">
                Statutory Compliance
              </span>
              <h3 className="font-semibold text-base">Policy Adjudication</h3>
              <p className="text-xs text-muted leading-relaxed">
                Every claim determination is verified against official PMFBY / WBCIS statutory clauses with exact legal citations
                and zero hallucination.
              </p>
            </div>
            <button
              onClick={() => onNavigate('insurer')}
              className="btn-quiet text-xs w-full py-2 flex items-center justify-center gap-1 font-semibold text-field"
            >
              Review Grounded Claims <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Capability 3 */}
          <div className="panel p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <span className="rounded bg-canvas border border-line px-2 py-0.5 text-xs font-semibold text-ink">
                Predictive Analytics
              </span>
              <h3 className="font-semibold text-base">BigQuery ML Predictive Risk</h3>
              <p className="text-xs text-muted leading-relaxed">
                14-day BigQuery ML (ARIMA_PLUS) predictive weather trajectory simulation to model forward payout probability and drought escalation.
              </p>
            </div>
            <button
              onClick={() => onNavigate('doctor')}
              className="btn-quiet text-xs w-full py-2 flex items-center justify-center gap-1 font-semibold text-field"
            >
              Open Index Doctor <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Capability 4 */}
          <div className="panel p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <span className="rounded bg-canvas border border-line px-2 py-0.5 text-xs font-semibold text-ink">
                Model Oversight
              </span>
              <h3 className="font-semibold text-base">Governance & Audit</h3>
              <p className="text-xs text-muted leading-relaxed">
                Dual-check consistency verification, selective prediction risk controls, and immutable cryptographic
                audit logs for regulatory compliance.
              </p>
            </div>
            <button
              onClick={() => onNavigate('validation')}
              className="btn-quiet text-xs w-full py-2 flex items-center justify-center gap-1 font-semibold text-field"
            >
              Inspect Validation Results <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>

    {/* Who it's for */}
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <h2 className="text-2xl font-semibold">Try it as each person</h2>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {PEOPLE.map((p) => (
            <li key={p.who} className="grid items-center gap-2 py-5 sm:grid-cols-12 sm:gap-6">
              <p className="font-display text-lg font-semibold sm:col-span-3">{p.who}</p>
              <p className="text-muted sm:col-span-6">{p.does}</p>
              <div className="sm:col-span-3 sm:text-right">
                <button onClick={() => onNavigate(p.tab)} className="btn-text">{p.cta}</button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-14 grid gap-6 lg:grid-cols-12">
          <h2 className="text-xl font-semibold lg:col-span-4">What we don't claim</h2>
          <div className="lg:col-span-8">
            <p className="max-w-prose text-muted">
              This is not certified, it has no regulatory approval, and it does not use a real insurer's contract. It does
              not replace agronomists. The demo index is a simple, published rule applied to historical plots, and we show
              our failure cases next to our results.
            </p>
            <button onClick={() => onNavigate('validation')} className="btn-text mt-4">See how we tested it</button>
          </div>
        </div>
      </div>
    </section>
  </div>
);
