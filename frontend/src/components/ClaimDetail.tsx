import React, { useState } from 'react';
import { Check, ChevronDown, ShieldAlert, Satellite, Globe } from 'lucide-react';
import { ClaimBundle, api } from '../services/api';
import { ACTIONS, DAMAGE_TYPE, GROUP_TONE, SEVERITY, flagText, outcomeInfo } from '../lib/outcomes';
import { fmtDate, fmtDateTime, photoSrc, stageName } from '../lib/format';
import { readSources } from '../lib/signals';
import { OutcomeDot, Photo, Score, VerdictChip } from './ui';
import { decidedLabel } from './InsurerView';
import { EarthEngineInspector } from './EarthEngineInspector';
import { OrbitToFieldCard } from './OrbitToFieldCard';

interface Props {
  claim: ClaimBundle;
  onDecisionSaved: (c: ClaimBundle) => void;
  onOpenClause: (id: string) => void;
}

type Choice = 'APPROVED' | 'REJECTED' | 'ESCALATED';
const CHOICES: { id: Choice; label: string; hint: string }[] = [
  { id: 'APPROVED', label: 'Approve payout', hint: 'Pay the claim under the cited clause' },
  { id: 'ESCALATED', label: 'Send for a field visit', hint: 'An agronomist checks the plot in person' },
  { id: 'REJECTED', label: 'Reject', hint: 'Explain why in the note. The farmer is told the reason' },
];

/** Very small renderer for the brief: paragraphs, "- " lists and **bold**. */
function Brief({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>,
    );
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-3 leading-7">
      {blocks.map((b, i) => {
        const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.every((l) => /^[-*•]\s/.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^[-*•]\s/, ''))}</li>)}</ul>;
        }
        if (/^#+\s/.test(lines[0])) {
          return (
            <div key={i}>
              <p className="font-semibold">{inline(lines[0].replace(/^#+\s/, ''))}</p>
              {lines.slice(1).length > 0 && <p>{inline(lines.slice(1).join(' '))}</p>}
            </div>
          );
        }
        return <p key={i}>{inline(lines.join(' '))}</p>;
      })}
    </div>
  );
}

export const ClaimDetail: React.FC<Props> = ({ claim, onDecisionSaved, onOpenClause }) => {
  const { grading: g, evidence: e, decision: d, audit: a } = claim;
  const o = outcomeInfo(d.outcome_class);
  const s = readSources(claim);
  const decided = Boolean(a?.adjuster_action && a.adjuster_action !== 'PENDING');

  const [choice, setChoice] = useState<Choice | null>(null);
  const [notes, setNotes] = useState('');
  const [adjusterId, setAdjusterId] = useState(a?.adjuster_id || 'ADJ-014');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showGeeInspector, setShowGeeInspector] = useState(false);

  const notesRequired = choice === 'REJECTED';
  const canSave = Boolean(choice) && (!notesRequired || notes.trim().length > 0) && !saving;

  const save = async () => {
    if (!choice) return;
    setSaving(true);
    setSaveError(false);
    try {
      const updated = await api.recordDecision(g.claim_id, { action: choice, notes, adjuster_id: adjusterId });
      const audit = updated?.audit ?? {
        ...a, adjuster_id: adjusterId, adjuster_action: choice, adjuster_notes: notes, decided_at_utc: new Date().toISOString(),
      };
      onDecisionSaved({ ...claim, audit });
      setEditing(false);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const trigger = e.trigger_rain_mm;
  const gaugeMax = Math.max(e.season_rain_mm, trigger) * 1.25 || 1;
  const signs = g.signs;
  const messages = d.farmer_messages || { en: '' };
  const earlier = 'Matches a photo from an earlier claim';
  const problems = Array.from(new Set(g.integrity_flags.map(flagText)))
    .map((p) => (p === earlier && g.matched_earlier_claim_id ? `Matches a photo in claim ${g.matched_earlier_claim_id}` : p));
  if (g.matched_earlier_claim_id && !problems.some((p) => p.includes(g.matched_earlier_claim_id!))) {
    problems.push(`Matches a photo in claim ${g.matched_earlier_claim_id}`);
  }

  return (
    <article className="settle space-y-6">
      {/* Header */}
      <header className={`rounded-lg p-6 ${GROUP_TONE[o.group].soft}`}>
        <p className="text-sm text-muted">
          Claim {g.claim_id}. Plot {g.plot_id}, {e.county} county, {e.crop}, season {e.season}. Sent {fmtDate(g.uploaded_at)}.
        </p>
        <h2 className="mt-2 flex items-start gap-3 text-xl font-semibold sm:text-2xl">
          <OutcomeDot group={o.group} className="mt-2.5 h-3 w-3" />
          {o.label}
        </h2>
        {/* Single clear conclusion — removes redundancy */}
        <p className="mt-2 text-base text-ink leading-relaxed max-w-prose">
          {d.failure_mode || o.summary}
        </p>
        <p className="mt-4 text-sm">
          <span className="text-muted">System suggestion: </span>
          <strong>{ACTIONS[d.recommended_action] ?? d.recommended_action}</strong>
          <span className="text-muted">. You make the decision.</span>
        </p>
      </header>

      {/* Three sources */}
      <section aria-labelledby="sources-h">
        <h3 id="sources-h" className="text-lg font-semibold">What each source says</h3>
        <div className="mt-3 grid overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-3 md:divide-x md:divide-line">
          {/* Index */}
          <div className="border-b border-line p-5 md:border-b-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">Rain index</p>
              <VerdictChip verdict={s.index.verdict}>{s.index.short}</VerdictChip>
            </div>
            <p className="mt-4 font-display text-2xl font-semibold">{e.season_rain_mm} mm</p>
            <p className="text-sm text-muted">season total</p>
            <div className="relative mt-3 h-2.5 rounded-full bg-sunk">
              <div className="absolute inset-y-0 left-0 rounded-full bg-rain" style={{ width: `${(e.season_rain_mm / gaugeMax) * 100}%` }} />
              <div className="absolute -bottom-1 -top-1 w-0.5 bg-ink" style={{ left: `${(trigger / gaugeMax) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm">Pays below {trigger} mm (the {e.trigger_percentile}th percentile for this plot).</p>
            <div className="mt-4 border-t border-line pt-3 text-sm">
              <p>
                Longest dry spell: <strong>{e.max_dry_spell_days} days</strong>
                {e.dry_spell_window_start && <>, {fmtDate(e.dry_spell_window_start)} to {fmtDate(e.dry_spell_window_end)}</>}.
              </p>
              <p className="mt-1">
                {e.dry_spell_overlaps_critical_stage
                  ? <>It overlapped <strong>{stageName(e.critical_growth_stage)}</strong>, a critical stage.</>
                  : <>It did not overlap {stageName(e.critical_growth_stage)}.</>}
              </p>
              {e.low_local_rain && <p className="mt-1">Rain on this plot was low compared with its own history.</p>}
            </div>
          </div>

          {/* Photos */}
          <div className="border-b border-line p-5 md:border-b-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">Farmer's photos</p>
              <VerdictChip verdict={s.photos.verdict}>{s.photos.short}</VerdictChip>
            </div>
            {!g.integrity_passed ? (
              <p className="mt-4 text-sm">The photos failed the authenticity checks, so the damage was not graded.</p>
            ) : (
              <>
                <div className="mt-4 space-y-2.5">
                  <Score value={signs.leaf_rolling_0_3} label="Leaf rolling" />
                  <Score value={signs.canopy_senescence_0_3} label="Leaves drying" />
                  <Score value={signs.stunting_0_3} label="Stunted plants" />
                  <div className="flex items-center justify-between text-sm">
                    <span>Cracked soil</span>
                    <strong>{signs.soil_cracking_visible ? 'Visible' : 'Not visible'}</strong>
                  </div>
                </div>
                <div className="mt-4 border-t border-line pt-3 text-sm">
                  <p>Likely cause: <strong>{DAMAGE_TYPE[g.damage_type] ?? g.damage_type}</strong>. Stage seen: {stageName(g.growth_stage)}.</p>
                  <p className="mt-1">
                    {g.passes_agreed
                      ? <>Two independent checks both said <strong>{SEVERITY[g.final_severity_band]?.toLowerCase()}</strong>.</>
                      : <>The two checks disagreed ({SEVERITY[g.pass_1_band]?.toLowerCase()} and {SEVERITY[g.pass_2_band]?.toLowerCase()}), so this needs your judgement.</>}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Satellite */}
          <div className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold">Satellite</p>
                {e.evidence_source === 'GOOGLE_EARTH_ENGINE' && (
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    GEE Orbit
                  </span>
                )}
              </div>
              <VerdictChip verdict={s.satellite.verdict}>{s.satellite.short}</VerdictChip>
            </div>
            <p className="mt-4 font-display text-2xl font-semibold">{e.ndvi_anomaly_z > 0 ? '+' : ''}{e.ndvi_anomaly_z.toFixed(1)}</p>
            <p className="text-sm text-muted">greenness compared with normal, in standard deviations</p>
            <p className="mt-3 text-sm">
              {e.satellite_stress
                ? <>Well below what this plot usually shows now. Counts as stress below {e.ndvi_stress_cutoff_z}.</>
                : <>Within the normal range for this plot. Stress starts below {e.ndvi_stress_cutoff_z}.</>}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
              <span className="text-muted">
                {e.evidence_source === 'GOOGLE_EARTH_ENGINE'
                  ? 'Dynamic Sentinel-2 L2A via Google Earth Engine'
                  : `Vegetation index ${e.ndvi_observed.toFixed(2)} vs normal ${e.ndvi_baseline_mean.toFixed(2)}`}
              </span>
              <button
                type="button"
                onClick={() => setShowGeeInspector(true)}
                className="inline-flex items-center gap-1 font-semibold text-field hover:underline"
              >
                <Satellite className="h-3.5 w-3.5" />
                Orbit Deep-Dive
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Photos */}
          <section aria-labelledby="photos-h">
            <h3 id="photos-h" className="text-lg font-semibold">Photos</h3>
            {problems.length > 0 && (
              <div className="mt-3 flex gap-3 rounded-lg bg-hold-soft p-4 text-sm">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-hold" aria-hidden />
                <div>
                  <p className="font-semibold text-hold">Photo checks raised a problem</p>
                  <ul className="mt-1 space-y-0.5">
                    {problems.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-3">
              {g.photo_urls.map((url, i) => {
                const rejected = g.rejected_photo_indices.includes(i);
                return (
                  <figure key={`${g.claim_id}-slot-${i}`}>
                    <Photo
                      key={`${g.claim_id}-photo-${i}-${url}`}
                      src={photoSrc(url)}
                      alt={`Field photo ${i + 1} for plot ${g.plot_id}`}
                      className={`aspect-[4/3] w-full rounded-md ${rejected ? 'ring-[3px] ring-hold' : ''}`}
                    />
                    <figcaption className="mt-1.5 text-xs text-muted">
                      {['Whole field', 'Leaves', 'Soil'][i] ?? `Photo ${i + 1}`}
                      {rejected && <span className="font-semibold text-hold">, rejected</span>}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            {g.visible_evidence?.length > 0 && (
              <p className="mt-3 text-sm text-muted">What the checks saw: {g.visible_evidence.join('; ')}.</p>
            )}
          </section>

          {/* Pillar 1: Gemini Multimodal Orbit-to-Field Synthesis */}
          <OrbitToFieldCard
            claimId={g.claim_id}
            plotId={g.plot_id}
            onOpenPolicy={(id) => onOpenClause(id || 'CL-2.1')}
          />

          {/* Brief */}
          <section aria-labelledby="brief-h" className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="brief-h" className="text-lg font-semibold">Brief</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {d.cited_clause_ids.map((id) => (
                  <button key={id} onClick={() => onOpenClause(id)}
                    className="rounded border border-line px-2 py-0.5 text-sm font-semibold text-field hover:border-field">
                    Clause {id}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 max-w-prose"><Brief text={d.adjuster_brief || 'No brief was written for this claim.'} /></div>
            <p className={`mt-4 flex items-center gap-1.5 text-sm ${d.citations_validated_by_code ? 'text-muted' : 'text-hold'}`}>
              {d.citations_validated_by_code
                ? <><Check className="h-4 w-4 text-field" aria-hidden /> Every clause cited here exists in the policy.</>
                : <><ShieldAlert className="h-4 w-4" aria-hidden /> Some cited clauses could not be found in the policy. Read with care.</>}
            </p>
          </section>

          {/* Farmer message */}
          <section aria-labelledby="msg-h" className="panel p-5">
            <h3 id="msg-h" className="text-lg font-semibold">Message the farmer will get</h3>
            <p className="mt-3 max-w-prose leading-7">{messages.en || 'No message.'}</p>
          </section>
        </div>

        {/* Decision rail */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section aria-labelledby="decide-h" className="panel border-ink p-5">
            <h3 id="decide-h" className="text-lg font-semibold">Your decision</h3>
            {decided && !editing ? (
              <div className="mt-3">
                <p className="text-lg font-semibold text-field">{decidedLabel(a.adjuster_action)}</p>
                <p className="mt-1 text-sm text-muted">By {a.adjuster_id ?? 'adjuster'}, {fmtDateTime(a.decided_at_utc)}</p>
                {a.adjuster_notes && <p className="mt-3 text-sm">{a.adjuster_notes}</p>}
                <p className="mt-3 text-sm text-muted">Recorded in the audit log.</p>
                <button onClick={() => { setEditing(true); setChoice(a.adjuster_action as Choice); setNotes(a.adjuster_notes || ''); }} className="btn-text mt-3">
                  Change decision
                </button>
              </div>
            ) : (
              <>
                <div role="radiogroup" aria-label="Decision" className="mt-3 space-y-2">
                  {CHOICES.map((c) => {
                    const on = choice === c.id;
                    return (
                      <button key={c.id} role="radio" aria-checked={on} onClick={() => setChoice(c.id)}
                        className={`flex w-full items-start gap-3 rounded-md border p-3 text-left ${on ? 'border-field bg-field-soft' : 'border-line hover:border-faint'}`}>
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-field' : 'border-faint'}`}>
                          {on && <span className="h-2 w-2 rounded-full bg-field" />}
                        </span>
                        <span>
                          <span className="block font-semibold">{c.label}</span>
                          <span className="block text-sm text-muted">{c.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <label className="mt-4 block">
                  <span className="label">Note {notesRequired ? '(needed to reject)' : '(optional)'}</span>
                  <textarea rows={3} value={notes} onChange={(ev) => setNotes(ev.target.value)} className="field-input mt-1 text-sm"
                    placeholder="What did you base this on?" />
                </label>
                <label className="mt-3 block">
                  <span className="label">Adjuster ID</span>
                  <input value={adjusterId} onChange={(ev) => setAdjusterId(ev.target.value)} className="field-input mt-1 text-sm" />
                </label>
                {saveError && <p role="alert" className="mt-3 text-sm text-hold">Couldn't save the decision. Check the connection and try again.</p>}
                <button onClick={save} disabled={!canSave} className="btn-primary mt-4 w-full">
                  {saving ? 'Recording…' : 'Record decision'}
                </button>
                {editing && <button onClick={() => setEditing(false)} className="btn-text mt-2">Cancel</button>}
              </>
            )}
          </section>

          {/* Audit record */}
          <details className="panel group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              Audit record
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-2 text-sm text-muted">Everything needed to reproduce this result later.</p>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ['Record', a?.audit_id],
                ['AI model', a?.model_version],
                ['Prompt version', a?.prompt_version],
                ['Reference photos', a?.anchor_image_ids?.join(', ')],
                ['Payout rule version', a?.frozen_protocol_commit_hash],
                ['Evidence from', e.evidence_source === 'GOOGLE_EARTH_ENGINE' ? 'Google Earth Engine (Sentinel-2 L2A + CHIRPS)' : e.evidence_source === 'OPEN_METEO_FALLBACK' ? 'Open-Meteo (live)' : 'Dataset records in BigQuery'],
                ['Evidence time', fmtDateTime(a?.evidence_timestamp_utc || e.evidence_timestamp_utc)],
                ['Reused a saved AI answer', a?.cache_hit ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-5 gap-2">
                  <dt className="col-span-2 text-muted">{k}</dt>
                  <dd className="col-span-3 break-words font-mono text-xs leading-5">{v || '–'}</dd>
                </div>
              ))}
            </dl>
          </details>
        </aside>
      </div>

      {/* Earth Engine Orbit-to-Field Inspector Modal */}
      <EarthEngineInspector
        claim={claim}
        isOpen={showGeeInspector}
        onClose={() => setShowGeeInspector(false)}
        onSyncSuccess={(updatedClaim) => {
          onDecisionSaved(updatedClaim);
        }}
      />
    </article>
  );
};
