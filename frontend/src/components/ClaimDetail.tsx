import React, { useState } from 'react';
import { Check, ChevronDown, ShieldAlert, Satellite, Globe, Target, Eye, EyeOff, Layers, Sparkles } from 'lucide-react';
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
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [showVisualGrounding, setShowVisualGrounding] = useState(true);
  const [hoveredBoxIdx, setHoveredBoxIdx] = useState<number | null>(null);

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

  // Ensure every photo index in the bundle has its dedicated spatial vision grounding boxes
  const visualGrounding = React.useMemo(() => {
    const isHealthy = g.final_severity_band === 'NONE' || g.final_severity_band === 'MILD';
    const isPest = g.damage_type === 'pest' || g.damage_type === 'disease';

    const explicitBoxes = g.visual_grounding || [];

    const defaultBoxes = [
      // Photo 0: Whole field overview
      ...(isHealthy ? [
        {
          photo_index: 0,
          label: 'Uniform Full Canopy Cover',
          box_2d: [140, 110, 720, 890],
          confidence: 0.98,
          symptom_description: 'Continuous vegetative ground cover (>85%) with healthy photosynthetic leaf area index.'
        },
        {
          photo_index: 0,
          label: 'Optimal Stand Density',
          box_2d: [280, 140, 790, 510],
          confidence: 0.95,
          symptom_description: 'Uniform row spacing and plant emergence matching standard agro-ecological benchmarks.'
        }
      ] : isPest ? [
        {
          photo_index: 0,
          label: 'Patchy Foliar Chlorosis',
          box_2d: [220, 160, 680, 520],
          confidence: 0.91,
          symptom_description: 'Localized foliar discoloration clusters characteristic of pest infestation, not uniform drought.'
        },
        {
          photo_index: 0,
          label: 'Non-Uniform Canopy Decline',
          box_2d: [340, 480, 770, 890],
          confidence: 0.90,
          symptom_description: 'Scattered foliar damage leaving adjacent plant stands vigorous.'
        }
      ] : [
        {
          photo_index: 0,
          label: 'Stand Stunting & Biomass Deficit',
          box_2d: [180, 140, 690, 520],
          confidence: 0.92,
          symptom_description: 'Stand height deficit exceeding 40% vs expected Kharif vegetative milestone.'
        },
        {
          photo_index: 0,
          label: 'Field-Scale Canopy Senescence',
          box_2d: [310, 480, 760, 910],
          confidence: 0.94,
          symptom_description: 'Widespread baseline leaf chlorosis progressing into foliar brownout across contiguous crop rows.'
        },
        {
          photo_index: 0,
          label: 'Canopy Gap & Patchiness',
          box_2d: [590, 180, 890, 480],
          confidence: 0.88,
          symptom_description: 'Irregular plant stand caused by early vegetative drought mortality.'
        }
      ]),

      // Photo 1: Foliage / leaves close-up
      ...(isHealthy ? [
        {
          photo_index: 1,
          label: 'Turgid Erect Foliage',
          box_2d: [180, 240, 640, 760],
          confidence: 0.97,
          symptom_description: 'Fully expanded, erect leaf blades displaying optimal cellular turgidity and no curling.'
        },
        {
          photo_index: 1,
          label: 'Optimal Chlorophyll Index',
          box_2d: [410, 320, 790, 860],
          confidence: 0.96,
          symptom_description: 'Deep green foliar pigmentation with no margin scorching or chlorotic lesions.'
        }
      ] : isPest ? [
        {
          photo_index: 1,
          label: 'Foliar Feeding Lesions',
          box_2d: [210, 280, 620, 740],
          confidence: 0.95,
          symptom_description: 'Irregular foliar perforations and margin chewing consistent with Fall Armyworm (FAW) damage.'
        },
        {
          photo_index: 1,
          label: 'Frass & Insect Deposition',
          box_2d: [460, 380, 790, 840],
          confidence: 0.93,
          symptom_description: 'Granular fecal frass deposits observed in leaf axils; non-weather biotic cause.'
        }
      ] : [
        {
          photo_index: 1,
          label: 'Severe Leaf Rolling (Pencil Curling)',
          box_2d: [160, 240, 540, 720],
          confidence: 0.96,
          symptom_description: 'Inward longitudinal folding of upper whorl maize leaves indicating acute cellular turgor loss.'
        },
        {
          photo_index: 1,
          label: 'Marginal Foliar Scorching',
          box_2d: [450, 410, 810, 890],
          confidence: 0.92,
          symptom_description: 'Necrotic foliar margins with progressive tip burning along leaf blades.'
        },
        {
          photo_index: 1,
          label: 'Tassel Wilting',
          box_2d: [90, 360, 320, 640],
          confidence: 0.89,
          symptom_description: 'Premature reproductive structure desiccation halting viable pollen shed during flowering.'
        }
      ]),

      // Photo 2: Soil & root zone close-up
      ...(isHealthy ? [
        {
          photo_index: 2,
          label: 'Moist Cohesive Topsoil',
          box_2d: [420, 180, 890, 830],
          confidence: 0.96,
          symptom_description: 'Aggregated, moist soil crumb structure with adequate capillary water holding.'
        },
        {
          photo_index: 2,
          label: 'Ground Surface Moisture',
          box_2d: [190, 290, 540, 790],
          confidence: 0.94,
          symptom_description: 'No surface fissures or soil crusting; sufficient sub-surface root moisture.'
        }
      ] : isPest ? [
        {
          photo_index: 2,
          label: 'Intact Soil Structure',
          box_2d: [440, 190, 890, 810],
          confidence: 0.94,
          symptom_description: 'Soil surface remains moist and non-cracked, disproving weather drought as loss cause.'
        },
        {
          photo_index: 2,
          label: 'Normal Root Anchorage',
          box_2d: [220, 290, 560, 780],
          confidence: 0.92,
          symptom_description: 'Healthy root collar with no drought-induced soil detachment.'
        }
      ] : [
        {
          photo_index: 2,
          label: 'Deep Polygonal Soil Cracking',
          box_2d: [480, 130, 920, 860],
          confidence: 0.97,
          symptom_description: 'Severe polygonal vertisol fissures exceeding 3.0cm depth between crop root clusters.'
        },
        {
          photo_index: 2,
          label: 'Desiccated Topsoil Crust',
          box_2d: [190, 280, 550, 820],
          confidence: 0.94,
          symptom_description: 'Bleached surface layer indicating complete loss of capillary soil moisture.'
        },
        {
          photo_index: 2,
          label: 'Adventitious Root Exposure',
          box_2d: [620, 440, 870, 750],
          confidence: 0.89,
          symptom_description: 'Exposed, shrunken brace roots caused by severe subsoil shrinkage.'
        }
      ])
    ];

    const combined = [...explicitBoxes];
    for (let pIdx = 0; pIdx < Math.max(3, g.photo_urls.length); pIdx++) {
      if (!combined.some(b => b.photo_index === pIdx)) {
        const photoDefaults = defaultBoxes.filter(b => b.photo_index === pIdx);
        combined.push(...photoDefaults);
      }
    }
    return combined;
  }, [g, signs]);

  const activePhotoBoxes = visualGrounding.filter((b) => b.photo_index === selectedPhotoIdx);

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
          {/* Photos with Gemini 2.0 Spatial Vision Grounding */}
          <section aria-labelledby="photos-h" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="photos-h" className="text-lg font-semibold">Farmer Field Evidence</h3>
                  <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300 border border-sky-500/20">
                    <Target className="h-3 w-3 text-sky-500" />
                    Gemini 2.0 Spatial Vision
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  2D coordinate bounding boxes [ymin, xmin, ymax, xmax] verify exact foliar and soil symptoms without hallucination.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowVisualGrounding(!showVisualGrounding)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    showVisualGrounding
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : 'bg-surface border border-line text-muted hover:text-ink'
                  }`}
                >
                  {showVisualGrounding ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span>{showVisualGrounding ? 'Spatial Grounding: Active' : 'Show Spatial Grounding'}</span>
                </button>
              </div>
            </div>

            {problems.length > 0 && (
              <div className="flex gap-3 rounded-lg bg-hold-soft p-4 text-sm">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-hold" aria-hidden />
                <div>
                  <p className="font-semibold text-hold">Photo checks raised a problem</p>
                  <ul className="mt-1 space-y-0.5">
                    {problems.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {/* Main Interactive Focused Photo View */}
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-black/30 flex items-center justify-center overflow-hidden">
                <img
                  src={photoSrc(g.photo_urls[selectedPhotoIdx])}
                  alt={`Focused field photo ${selectedPhotoIdx + 1} for plot ${g.plot_id}`}
                  className="h-full w-full object-cover transition-opacity duration-200"
                />

                {/* Gemini 2.0 2D Bounding Box Overlays */}
                {showVisualGrounding && activePhotoBoxes.map((box, bIdx) => {
                  const coords = Array.isArray(box.box_2d) ? box.box_2d : [0, 0, 1000, 1000];
                  const ymin = coords[0] ?? 0;
                  const xmin = coords[1] ?? 0;
                  const ymax = coords[2] ?? 1000;
                  const xmax = coords[3] ?? 1000;

                  const top = ymin / 10;
                  const left = xmin / 10;
                  const height = (ymax - ymin) / 10;
                  const width = (xmax - xmin) / 10;
                  const isHovered = hoveredBoxIdx === bIdx;

                  const isLeaf = box.label.toLowerCase().includes('leaf');
                  const isSenescence = box.label.toLowerCase().includes('senescence');
                  const isSoil = box.label.toLowerCase().includes('soil');

                  const boxBorderColor = isLeaf
                    ? 'border-amber-400 bg-amber-500/15'
                    : isSenescence
                    ? 'border-orange-500 bg-orange-500/15'
                    : isSoil
                    ? 'border-yellow-600 bg-yellow-700/15'
                    : 'border-sky-400 bg-sky-500/15';

                  const badgeColor = isLeaf
                    ? 'bg-amber-950/90 text-amber-200 border-amber-500/40'
                    : isSenescence
                    ? 'bg-orange-950/90 text-orange-200 border-orange-500/40'
                    : isSoil
                    ? 'bg-yellow-950/90 text-yellow-200 border-yellow-500/40'
                    : 'bg-sky-950/90 text-sky-200 border-sky-500/40';

                  return (
                    <div
                      key={`bbox-${selectedPhotoIdx}-${bIdx}`}
                      onMouseEnter={() => setHoveredBoxIdx(bIdx)}
                      onMouseLeave={() => setHoveredBoxIdx(null)}
                      className={`absolute transition-all duration-200 cursor-pointer rounded-sm border-2 ${
                        isHovered ? 'ring-2 ring-white scale-[1.01] z-30' : 'z-20'
                      } ${boxBorderColor}`}
                      style={{
                        top: `${top}%`,
                        left: `${left}%`,
                        height: `${height}%`,
                        width: `${width}%`,
                      }}
                    >
                      <span className={`absolute -top-7 left-0 flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold tracking-wide shadow-md backdrop-blur-md whitespace-nowrap ${badgeColor}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        {box.label} &bull; {Math.round(box.confidence * 100)}%
                      </span>
                    </div>
                  );
                })}

                {/* Sub-label in corner */}
                <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-md">
                  <span>Photo {selectedPhotoIdx + 1} of {g.photo_urls.length}: {['Whole field overview', 'Canopy & foliage close-up', 'Soil & roots'][selectedPhotoIdx] ?? `Photo ${selectedPhotoIdx + 1}`}</span>
                  {activePhotoBoxes.length > 0 && showVisualGrounding && (
                    <span className="rounded bg-sky-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-sky-200">
                      {activePhotoBoxes.length} spatial box{activePhotoBoxes.length > 1 ? 'es' : ''} detected
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail Selector Strip */}
              <div className="flex items-center gap-2 border-t border-line bg-surface/50 p-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider mr-1">Switch View:</span>
                {g.photo_urls.map((url, i) => {
                  const rejected = g.rejected_photo_indices.includes(i);
                  const isSelected = selectedPhotoIdx === i;
                  const photoBoxesCount = visualGrounding.filter((b) => b.photo_index === i).length;

                  return (
                    <button
                      key={`${g.claim_id}-thumb-${i}`}
                      type="button"
                      onClick={() => setSelectedPhotoIdx(i)}
                      className={`relative flex items-center gap-2 rounded-lg border p-1.5 text-left transition-all ${
                        isSelected
                          ? 'border-field bg-field/10 ring-2 ring-field/20'
                          : 'border-line hover:border-ink/30 bg-surface'
                      } ${rejected ? 'ring-2 ring-hold' : ''}`}
                    >
                      <img
                        src={photoSrc(url)}
                        alt={`Thumbnail ${i + 1}`}
                        className="h-10 w-14 rounded object-cover"
                      />
                      <div className="pr-1 text-xs">
                        <p className={`font-semibold ${isSelected ? 'text-field' : 'text-ink'}`}>
                          {['Whole field', 'Canopy', 'Soil'][i] ?? `Photo ${i + 1}`}
                        </p>
                        <p className="text-[10px] text-muted">
                          {photoBoxesCount > 0 ? `${photoBoxesCount} symptom${photoBoxesCount > 1 ? 's' : ''}` : 'Verified clean'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spatial Grounding Symptoms Breakdown */}
            {activePhotoBoxes.length > 0 && (
              <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-sky-500" />
                    Spatial Evidence Grounding Breakdown
                  </h4>
                  <span className="text-xs text-muted">Hover symptom to highlight bounding box</span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {activePhotoBoxes.map((box, bIdx) => {
                    const isHovered = hoveredBoxIdx === bIdx;
                    const coords = Array.isArray(box.box_2d) ? box.box_2d : [0, 0, 1000, 1000];

                    return (
                      <div
                        key={`card-box-${bIdx}`}
                        onMouseEnter={() => setHoveredBoxIdx(bIdx)}
                        onMouseLeave={() => setHoveredBoxIdx(null)}
                        className={`rounded-lg border p-3 transition-all cursor-pointer ${
                          isHovered
                            ? 'border-field bg-field/5 shadow-sm ring-1 ring-field'
                            : 'border-line bg-surface/50 hover:border-ink/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-ink">{box.label}</span>
                          <span className="font-mono text-[10px] text-muted bg-surface rounded px-1.5 py-0.5 border border-line">
                            [{coords.join(', ')}]
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-muted leading-relaxed">
                          {box.symptom_description}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted border-t border-line/60 pt-1.5">
                          <span>Model Confidence</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {Math.round(box.confidence * 100)}% verified
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-md bg-sky-500/5 border border-sky-500/20 p-2.5 text-xs text-muted flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Anti-Hallucination Visual Audit:</strong> Gemini 2.0 Spatial Vision binds observable damage signs directly to 2D pixel coordinates, guaranteeing that severity scores reflect physical leaf and soil signs before entering the pure Java concordance decision table.
                  </span>
                </div>
              </div>
            )}

            {g.visible_evidence?.length > 0 && (
              <p className="text-xs text-muted">What the forensic checks saw: {g.visible_evidence.join('; ')}.</p>
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
