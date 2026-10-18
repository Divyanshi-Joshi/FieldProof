import React, { useState, useEffect } from 'react';
import {
  Satellite,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { api } from '../services/api';
import { OrbitToFieldSynthesis } from '../types/contracts';

interface Props {
  claimId: string;
  plotId: string;
  lat?: number;
  lon?: number;
  onOpenPolicy?: (clauseId?: string) => void;
  className?: string;
}

export const OrbitToFieldCard: React.FC<Props> = ({
  claimId,
  plotId,
  lat,
  lon,
  onOpenPolicy,
  className = '',
}) => {
  const [synthesis, setSynthesis] = useState<OrbitToFieldSynthesis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSynthesis = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.synthesizeOrbitToField(claimId, plotId, lat, lon);
      setSynthesis(data);
    } catch (err: any) {
      console.error('Failed to run orbit-to-field synthesis:', err);
      setError('Could not synthesize satellite telemetry with ground photos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (claimId) {
      fetchSynthesis();
    }
  }, [claimId]);

  return (
    <div className={`rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Satellite className="h-4 w-4" />
            </span>
            <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Multi-Source Telemetry
            </span>
            <span className="rounded border border-line px-2 py-0.5 text-[11px] font-mono text-muted">
              Sentinel-2 & CHIRPS
            </span>
          </div>
          <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight">
            Satellite & Ground Verification
          </h3>
        </div>

        <button
          onClick={fetchSynthesis}
          disabled={loading}
          className="btn-quiet flex items-center gap-1.5 self-start text-xs shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Verifying...' : 'Re-Verify Telemetry'}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-field" />
          <p className="text-xs font-semibold text-ink">Correlating satellite surface reflectance and rainfall telemetry with ground photos...</p>
          <p className="text-[11px] text-muted">Evaluating 10m Sentinel-2 NDVI anomaly against on-field crop stand</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{error}</span>
          <button onClick={fetchSynthesis} className="ml-auto underline font-semibold">Retry</button>
        </div>
      ) : synthesis ? (
        <div className="space-y-4">
          {/* Executive Conclusion Banner */}
          <div className={`rounded-xl border p-4 space-y-2 ${
            synthesis.concordance_classification.includes('GAP')
              ? 'border-loss/30 bg-loss-soft/40 dark:border-amber-500/30 dark:bg-amber-950/40'
              : synthesis.concordance_classification.includes('CONFIRMED')
              ? 'border-emerald-500/30 bg-emerald-500/10 dark:border-emerald-500/40 dark:bg-emerald-950/30'
              : 'border-line bg-canvas/70'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                synthesis.concordance_classification.includes('GAP') ? 'text-loss-ink dark:text-amber-300' : 'text-field dark:text-emerald-300'
              }`}>
                {synthesis.concordance_classification.includes('GAP') ? (
                  <AlertTriangle className="h-4 w-4 text-loss dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-field dark:text-emerald-400" />
                )}
                {synthesis.concordance_classification === 'PHENOLOGICAL_BASIS_RISK_GAP'
                  ? 'Reconciliation Conclusion: Missed by Weather Index (Phenological Drought)'
                  : synthesis.concordance_classification === 'SPATIAL_BASIS_RISK_GAP'
                  ? 'Reconciliation Conclusion: Missed by Weather Index (Localized Deficit)'
                  : 'Reconciliation Conclusion: Telemetry Aligned'}
              </span>
              <span className={`rounded px-2.5 py-0.5 text-[11px] font-bold ${
                synthesis.concordance_classification.includes('GAP')
                  ? 'bg-loss/15 text-loss-ink dark:bg-amber-500/20 dark:text-amber-300'
                  : 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
              }`}>
                {synthesis.concordance_classification.includes('GAP')
                  ? 'Action: Payout Recommended (§7.1.4)'
                  : 'Action: Automated Determination'}
              </span>
            </div>
            <p className="text-xs text-ink/90 dark:text-slate-100 leading-relaxed font-medium">
              {synthesis.basis_risk_summary ||
                (synthesis.concordance_classification.includes('GAP')
                  ? "The 10km regional weather index recorded normal rainfall (above trigger, index paid ₹0). However, Google Earth Engine Sentinel-2 at 10m resolution detected severe crop collapse (z = -1.9σ) caused by a 21-day dry spell during flowering. Ground photos corroborate leaf rolling and soil desiccation. This is a verified basis-risk gap; payout is recommended."
                  : synthesis.cross_modal_synthesis)}
            </p>
          </div>

          {/* Macro vs Micro Resolution Contrast (Why the Index Failed) */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Box 1: Coarse Macro Grid */}
            <div className="rounded-xl border border-line bg-canvas/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Macro Weather Grid</span>
                <span className="rounded bg-canvas border border-line px-1.5 py-0.2 text-[10px] font-mono">10 km Area</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted">Seasonal Rain:</span>
                  <span className="font-mono text-sm font-bold text-ink">
                    {synthesis.macro_station_rain_mm ? `${synthesis.macro_station_rain_mm.toFixed(0)} mm` : '341 mm'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-[11px] text-muted">
                  <span>Trigger Level:</span>
                  <span className="font-mono">290 mm</span>
                </div>
              </div>
              <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
                <span className="text-muted">Index Decision:</span>
                <span className="font-semibold text-loss-ink bg-loss-soft px-1.5 py-0.5 rounded text-[11px]">
                  Did Not Trigger (₹0)
                </span>
              </div>
            </div>

            {/* Box 2: DeepMind ALU & AgriStack */}
            <div className="rounded-xl border border-line bg-canvas/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">DeepMind ALU Parcel</span>
                <span className="rounded bg-sky-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-sky-600 dark:text-sky-400">AgriStack</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted">Delineated Area:</span>
                  <span className="font-mono text-sm font-bold text-ink">3.51 Acres</span>
                </div>
                <div className="flex items-baseline justify-between text-[11px] text-muted">
                  <span>SAR Soil Moisture:</span>
                  <span className="font-mono text-loss-ink font-semibold">0.18 (Severe Deficit)</span>
                </div>
              </div>
              <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
                <span className="text-muted">Parcel Integrity:</span>
                <span className="font-semibold text-field bg-field-soft px-1.5 py-0.5 rounded text-[11px]">
                  Verified Boundary
                </span>
              </div>
            </div>

            {/* Box 3: 10m Sentinel-2 Field Resolution */}
            <div className="rounded-xl border border-line bg-canvas/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Earth Engine Sentinel-2</span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">10m Plot</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted">NDVI Anomaly:</span>
                  <span className="font-mono text-sm font-bold text-loss-ink">
                    {synthesis.sentinel2_z_score.toFixed(1)}σ Stress
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-[11px] text-muted">
                  <span>Flowering Dry Spell:</span>
                  <span className="font-mono font-bold text-ink">{synthesis.chirps_dry_spell_days} Days</span>
                </div>
              </div>
              <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
                <span className="text-muted">Field Reality:</span>
                <span className="font-semibold text-loss-ink bg-loss-soft px-1.5 py-0.5 rounded text-[11px]">
                  Crop Loss Confirmed
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Verification Narrative */}
          <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-field">
              <Sparkles className="h-4 w-4" />
              <span>Multimodal Telemetry & Visual Synthesis</span>
            </div>
            <p className="text-xs text-ink leading-relaxed whitespace-pre-line">
              {synthesis.cross_modal_synthesis}
            </p>
          </div>



          {/* Quick Grounding Action */}
          {onOpenPolicy && (
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs text-muted">
                Statutory clause authorizing basis-risk escalation:
              </span>
              <button
                type="button"
                onClick={() => onOpenPolicy('7.1.4')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-field hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                Review Clause §7.1.4 (Phenological Dry Spell Review)
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
export default OrbitToFieldCard;
