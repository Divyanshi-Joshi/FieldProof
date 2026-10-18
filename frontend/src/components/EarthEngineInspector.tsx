import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Satellite, Globe, Layers, AlertTriangle, CheckCircle2, RefreshCw, Calendar, Droplets } from 'lucide-react';
import { EarthEngineAnalysis } from '../types/contracts';
import { api, ClaimBundle } from '../services/api';
import { VerdictChip } from './ui';
import { OrbitToFieldCard } from './OrbitToFieldCard';

interface Props {
  claim: ClaimBundle;
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess: (updatedClaim: ClaimBundle) => void;
}

export const EarthEngineInspector: React.FC<Props> = ({ claim, isOpen, onClose, onSyncSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [analysis, setAnalysis] = useState<EarthEngineAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const plotId = claim.grading?.plot_id || 'P-0142';
  const county = claim.evidence?.county || 'Beed';

  useEffect(() => {
    if (!isOpen) return;
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.analyzeEarthEngine(plotId);
        setAnalysis(res);
      } catch (e: any) {
        console.error('Failed to load GEE analysis:', e);
        setError('Could not reach Google Earth Engine / Vertex Geospatial service.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, plotId, onClose]);

  if (!isOpen) return null;

  const handleSyncOrbit = async () => {
    setSyncing(true);
    setSuccessToast(null);
    try {
      const updated = await api.syncClaimWithEarthEngine(claim.grading.claim_id);
      onSyncSuccess(updated);
      setSuccessToast('Claim synchronized with Google Earth Engine orbit evidence.');
      const fresh = await api.analyzeEarthEngine(plotId);
      setAnalysis(fresh);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (e: any) {
      console.error('Failed to sync claim with GEE:', e);
      setError('Sync failed: ' + (e.message || 'Server error'));
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gee-inspector-title"
    >
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="settle relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-xl border border-line bg-surface shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="gee-inspector-title" className="font-display text-xl font-semibold sm:text-2xl">
                Google Earth Engine & Satellite Verification
              </h2>
              <span className="rounded bg-field-soft px-2 py-0.5 text-xs font-semibold text-field">
                Sentinel-2 & CHIRPS
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Dynamic multi-spectral Sentinel-2 vegetation and CHIRPS rainfall telemetry for plot{' '}
              <strong className="text-ink">{plotId}</strong> ({county} District).
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 scroll-thin">
          {/* Notifications */}
          {successToast && (
            <div className="mb-6 flex items-center gap-2 rounded-md border border-field/30 bg-field-soft p-3 text-sm text-field">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-md border border-loss/30 bg-loss-soft p-3 text-sm text-loss-ink">
              <AlertTriangle className="h-4 w-4 shrink-0 text-loss" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-field" />
              <p className="mt-4 text-sm font-semibold">Querying Google Earth Engine catalog...</p>
              <p className="mt-1 text-xs text-muted">
                Pasting Copernicus Sentinel-2 L2A tiles and CHIRPS pentad rainfall records.
              </p>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Editorial Headline Banner */}
              <div className="rounded-lg border border-line bg-canvas p-5">
                <p className="font-display text-lg leading-relaxed sm:text-xl text-ink">
                  Sentinel-2 observed an NDVI of{' '}
                  <strong className="font-semibold text-field">{analysis.ndvi_observed.toFixed(2)}</strong> against a 3-year
                  historical baseline of{' '}
                  <strong className="font-semibold text-ink">{analysis.ndvi_baseline_mean.toFixed(2)}</strong> (
                  <strong className={analysis.satellite_stress ? 'text-loss font-semibold' : 'text-field font-semibold'}>
                    {analysis.ndvi_anomaly_z > 0 ? '+' : ''}{analysis.ndvi_anomaly_z.toFixed(2)} std dev
                  </strong>
                  ). CHIRPS recorded{' '}
                  <strong className="font-semibold text-ink">{analysis.chirps_seasonal_rain_mm.toFixed(0)} mm</strong> of
                  rain with a{' '}
                  <strong className={analysis.dry_spell_overlaps_critical_stage ? 'text-loss font-semibold' : 'text-ink font-semibold'}>
                    {analysis.max_dry_spell_days}-day dry spell
                  </strong>{' '}
                  {analysis.dry_spell_overlaps_critical_stage ? 'overlapping the flowering stage' : 'outside critical stages'}.
                </p>
              </div>

              {/* Two Main Signal Cards */}
              <div className="grid gap-5 md:grid-cols-2">
                {/* Sentinel-2 Vegetation Card */}
                <div className="panel p-5">
                  <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <Satellite className="h-4 w-4 text-field" />
                      <h3 className="font-semibold text-sm">Sentinel-2 Vegetation Index</h3>
                    </div>
                    <VerdictChip verdict={analysis.satellite_stress ? 'loss' : 'none'}>
                      {analysis.satellite_stress ? 'Vegetative Stress' : 'Normal Greenness'}
                    </VerdictChip>
                  </div>

                  <div className="mt-4">
                    <p className="font-display text-3xl font-semibold text-ink">
                      {analysis.ndvi_anomaly_z > 0 ? '+' : ''}{analysis.ndvi_anomaly_z.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted">
                      Anomaly in standard deviations (stress cutoff: z ≤ -1.5)
                    </p>
                  </div>

                  <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-muted">Observed NDVI (Current Season):</dt>
                      <dd className="font-mono font-semibold text-ink">{analysis.ndvi_observed.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">3-Year Baseline Mean (2023–2025):</dt>
                      <dd className="font-mono font-semibold text-ink">{analysis.ndvi_baseline_mean.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Standard Deviation (σ):</dt>
                      <dd className="font-mono font-semibold text-ink">±{analysis.ndvi_baseline_std.toFixed(3)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Sensor & Spatial Resolution:</dt>
                      <dd className="font-mono text-ink">Sentinel-2 L2A (10m)</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Cloud Filtering (SCL Mask):</dt>
                      <dd className="font-mono text-ink">{analysis.cloud_cover_pct}% cloud</dd>
                    </div>
                  </dl>
                </div>

                {/* CHIRPS Rainfall Card */}
                <div className="panel p-5">
                  <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-rain" />
                      <h3 className="font-semibold text-sm">CHIRPS Daily Rainfall</h3>
                    </div>
                    <VerdictChip verdict={analysis.dry_spell_overlaps_critical_stage ? 'loss' : 'none'}>
                      {analysis.dry_spell_overlaps_critical_stage ? 'Dry Spell at Flowering' : 'Normal Timing'}
                    </VerdictChip>
                  </div>

                  <div className="mt-4">
                    <p className="font-display text-3xl font-semibold text-ink">
                      {analysis.max_dry_spell_days}
                      <span className="text-xl font-normal text-muted"> days</span>
                    </p>
                    <p className="text-xs text-muted">
                      Longest consecutive dry period during the season
                    </p>
                  </div>

                  <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-muted">Seasonal Total Rainfall:</dt>
                      <dd className="font-mono font-semibold text-ink">{analysis.chirps_seasonal_rain_mm.toFixed(0)} mm</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">3-Year Historical Mean:</dt>
                      <dd className="font-mono font-semibold text-ink">{analysis.chirps_historical_mean_mm.toFixed(0)} mm</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Moisture Deficit:</dt>
                      <dd className="font-mono font-semibold text-ink">{analysis.moisture_deficit_pct.toFixed(1)}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Flowering Overlap:</dt>
                      <dd className={`font-semibold ${analysis.dry_spell_overlaps_critical_stage ? 'text-loss' : 'text-ink'}`}>
                        {analysis.dry_spell_overlaps_critical_stage ? 'Yes (Basis-risk gap trigger)' : 'No'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Sensor & Spatial Resolution:</dt>
                      <dd className="font-mono text-ink">CHIRPS Pentad (0.05°)</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* 3-Year Historical Comparison Visualizer */}
              <div className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <h3 className="font-semibold text-sm">3-Year Historical Satellite Trajectory</h3>
                    <p className="text-xs text-muted">
                      Compares multi-temporal Sentinel-2 vegetation and CHIRPS rainfall across matching seasonal windows.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-muted">Target Window: Kharif Season (July – October)</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {analysis.historical_ndvi_series.map((pt) => (
                    <div key={pt.year} className="rounded-md border border-line bg-canvas p-3.5">
                      <div className="flex items-center justify-between text-xs text-muted font-medium">
                        <span>{pt.year}</span>
                        <span className="font-mono">{pt.season}</span>
                      </div>
                      <p className="mt-2 font-display text-2xl font-semibold text-ink">
                        {pt.ndvi_mean.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted">NDVI mean</p>

                      <div className="mt-3 border-t border-line/60 pt-2 text-xs flex justify-between text-muted">
                        <span>Rainfall:</span>
                        <strong className="font-mono text-ink">{pt.rainfall_mm.toFixed(0)} mm</strong>
                      </div>

                      {/* Visual Bar Indicator */}
                      <div className="mt-2.5 h-1.5 w-full rounded-full bg-sunk overflow-hidden">
                        <div
                          className="h-full rounded-full bg-calm"
                          style={{ width: `${Math.min(100, (pt.ndvi_mean / 0.8) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Current Season (Observed Drop) */}
                  <div className="rounded-md border-2 border-field/30 bg-field-soft/40 p-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-field">
                      <span>2025 (Kharif)</span>
                      <span className="font-mono">Current</span>
                    </div>
                    <p className="mt-2 font-display text-2xl font-semibold text-ink">
                      {analysis.ndvi_observed.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted">NDVI observed</p>

                    <div className="mt-3 border-t border-field/20 pt-2 text-xs flex justify-between text-muted">
                      <span>Rainfall:</span>
                      <strong className="font-mono text-ink">{analysis.chirps_seasonal_rain_mm.toFixed(0)} mm</strong>
                    </div>

                    {/* Visual Bar Indicator */}
                    <div className="mt-2.5 h-1.5 w-full rounded-full bg-sunk overflow-hidden">
                      <div
                        className={`h-full rounded-full ${analysis.satellite_stress ? 'bg-loss' : 'bg-field'}`}
                        style={{ width: `${Math.min(100, (analysis.ndvi_observed / 0.8) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Source Telemetry Card */}
              <OrbitToFieldCard
                claimId={claim.grading?.claim_id || 'CLM-1'}
                plotId={plotId}
                lat={analysis.latitude}
                lon={analysis.longitude}
              />

              {/* Provenance Details */}
              <div className="rounded-md border border-line bg-canvas/60 p-4 text-xs text-muted">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-ink">Plot Centroid Coordinates: </span>
                    <span className="font-mono">{analysis.latitude.toFixed(4)}°, {analysis.longitude.toFixed(4)}°</span>
                  </div>
                  <div>
                    <span className="font-medium text-ink">Sentinel-2 Tile Granule: </span>
                    <span className="font-mono">{analysis.granule_id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-ink">Google DeepMind ALU: </span>
                    <span>3.51 Acres (1.42 ha) parcel boundary delineated</span>
                  </div>
                  <div>
                    <span className="font-medium text-ink">Sentinel-1 SAR C-Band Radar: </span>
                    <span className="font-mono">Soil moisture 0.18 m³/m³ (cloud-penetrating radar)</span>
                  </div>
                  <div>
                    <span className="font-medium text-ink">AgriStack Parcel ID: </span>
                    <span className="font-mono">{analysis.agristack_parcel_id || 'IN-MH-BEE-0142'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-ink">Decision Concordance Role: </span>
                    <span>Independent orbital validation (§7.1.4)</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line p-4 sm:px-6 bg-canvas">
          <p className="text-xs text-muted">
            Paired with ground-level Gemini Vision to catch basis-risk gaps.
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn-quiet text-xs py-2 px-3">
              Close
            </button>
            <button
              type="button"
              onClick={handleSyncOrbit}
              disabled={syncing}
              className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Satellite Data with Claim'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
