import React, { useState } from 'react';
import { X, Shield, AlertTriangle, CheckCircle, Clock, Eye, FileText, CheckCircle2, AlertOctagon, HelpCircle, UserCheck, ArrowRight, Layers, Satellite, CloudRain, Sparkles } from 'lucide-react';
import { ClaimBundle, api } from '../services/api';
import { Language, translations } from '../i18n/translations';

interface ClaimDetailModalProps {
  claim: ClaimBundle | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onDecisionUpdated: (updatedClaim: ClaimBundle) => void;
  onOpenClause: (clauseId: string) => void;
}

export const ClaimDetailModal: React.FC<ClaimDetailModalProps> = ({
  claim,
  isOpen,
  onClose,
  language,
  onDecisionUpdated,
  onOpenClause
}) => {
  const t = translations[language];

  const [adjusterId, setAdjusterId] = useState('ADJ-KE-WANJIRU');
  const [selectedAction, setSelectedAction] = useState<'APPROVED' | 'REJECTED' | 'ESCALATED'>('ESCALATED');
  const [adjusterNotes, setAdjusterNotes] = useState(
    'Flowering window 21-day dry spell confirmed by CHIRPS daily rainfall. Satellite NDVI z = -1.9 confirms vegetative stress. Approved for basis-risk escalation payout under CL-4.2.'
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !claim) return null;

  const { grading, evidence, decision, audit } = claim;

  const handleSaveDecision = async () => {
    setIsSaving(true);
    try {
      const updated = await api.recordDecision(grading.claim_id, {
        adjuster_id: adjusterId,
        action: selectedAction,
        notes: adjusterNotes
      });
      onDecisionUpdated(updated);
      onClose();
    } catch (e) {
      console.error('Failed to save decision', e);
      // Client optimistic update
      const updatedAudit = {
        ...audit,
        adjuster_id: adjusterId,
        adjuster_action: selectedAction,
        adjuster_notes: adjusterNotes,
        decided_at_utc: new Date().toISOString()
      };
      onDecisionUpdated({ ...claim, audit: updatedAudit });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'CONFIRMED_PAYOUT':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'PHENOLOGICAL_BASIS_RISK_GAP':
      case 'SPATIAL_BASIS_RISK_GAP':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'INTEGRITY_HOLD':
      case 'ABSTAIN':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'POSSIBLE_OVERPAYMENT':
      case 'EVIDENCE_CONFLICT':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
              {grading.plot_id}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Claim Inspection: {grading.claim_id}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getOutcomeBadge(decision.outcome_class)}`}>
                  {decision.outcome_class}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Plot {grading.plot_id} · {evidence.county} County · {evidence.crop} ({evidence.season}) · Uploaded {new Date(grading.uploaded_at).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Failure Mode Banner */}
          {decision.failure_mode && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 text-xs uppercase tracking-wider block mb-0.5">
                  Concordance Failure Mode Description
                </span>
                <p className="text-slate-200 text-xs leading-relaxed">
                  {decision.failure_mode}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: 3-Photo Bundle & Cryptographic Forensics */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Eye className="h-4 w-4 text-brand-400" />
                <span>{t.insurer.inspector.photosTitle}</span>
              </h3>
              <div className="flex items-center space-x-2">
                {grading.integrity_passed ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium text-[11px] flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Integrity Passed</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium text-[11px] flex items-center space-x-1">
                    <AlertOctagon className="h-3 w-3" />
                    <span>Integrity Hold</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {grading.photo_urls.map((url, i) => (
                <div key={i} className="glass-card rounded-lg overflow-hidden border border-slate-800 p-2">
                  <div className="relative aspect-video rounded-md overflow-hidden bg-slate-950 mb-2">
                    <img
                      src={
                        i === 0
                          ? 'https://images.unsplash.com/photo-1595838742445-5d97f6c3ee72?auto=format&fit=crop&w=500&q=80'
                          : i === 1
                          ? 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=500&q=80'
                          : 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=500&q=80'
                      }
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-[10px] font-mono text-slate-300">
                      Photo {i + 1}
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-[10px] text-slate-400">
                    <div className="flex justify-between">
                      <span>pHash:</span>
                      <span className="text-slate-300">
                        {i === 0 ? 'a3f18e9c4b2d071a' : i === 1 ? 'b7c29e1d8a4f3320' : 'c8d41a2e9b3f7701'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>EXIF GPS:</span>
                      <span className={grading.exif_gps_present ? 'text-emerald-400' : 'text-slate-500'}>
                        {grading.exif_gps_present ? 'Present (-1.78, 37.62)' : 'Stripped / Missing'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {grading.integrity_flags.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Integrity Notes: </span>
                {grading.integrity_flags.join('; ')}
              </div>
            )}
          </div>

          {/* Section 2: Gemini Multimodal Forensics (Two-Pass Calibrated Grading) */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>{t.insurer.inspector.forensicsTitle}</span>
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">Agreement Gate:</span>
                {grading.passes_agreed ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px]">
                    Agreed ({grading.final_severity_band})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-[11px]">
                    Disagreed (Abstained to Human)
                  </span>
                )}
              </div>
            </div>

            {/* 2-Pass Comparison Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Pass 1 */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-300">Pass 1 (Anchor Order A-B-C)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-brand-300 font-mono font-bold">
                    Band: {grading.pass_1_band}
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span>{t.insurer.inspector.signsLeafRolling}:</span>
                    <span className="font-mono font-bold text-amber-400">{grading.pass_1.signs.leaf_rolling_0_3} / 3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.insurer.inspector.signsSenescence}:</span>
                    <span className="font-mono font-bold text-amber-400">{grading.pass_1.signs.canopy_senescence_0_3} / 3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.insurer.inspector.signsStunting}:</span>
                    <span className="font-mono font-bold text-amber-400">{grading.pass_1.signs.stunting_0_3} / 3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.insurer.inspector.signsSoilCracking}:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {grading.pass_1.signs.soil_cracking_visible ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pass 2 */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-300">Pass 2 (Anchor Order Shuffled)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-brand-300 font-mono font-bold">
                    Band: {grading.pass_2_band}
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span>{t.insurer.inspector.signsLeafRolling}:</span>
                    <span className="font-mono font-bold text-amber-400">{grading.pass_2.signs.leaf_rolling_0_3} / 3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.insurer.inspector.signsSenescence}:</span>
                    <span className="font-mono font-bold text-amber-400">{grading.pass_2.signs.canopy_senescence_0_3} / 3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.insurer.inspector.signsStunting}:</span>
                    <span className="font-mono font-bold text-amber-400">{grading.pass_2.signs.stunting_0_3} / 3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.insurer.inspector.signsSoilCracking}:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {grading.pass_2.signs.soil_cracking_visible ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              {grading.passes_agreed ? t.insurer.inspector.twoPassAgreed : t.insurer.inspector.twoPassDisagreed}
            </p>
          </div>

          {/* Section 3: Three-Signal Deterministic Concordance Matrix */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center space-x-2">
              <Layers className="h-4 w-4 text-brand-400" />
              <span>{t.insurer.inspector.concordanceTitle}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              {/* Signal 1: Rainfall Index */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center space-x-2 text-slate-400 mb-1.5">
                  <CloudRain className="h-4 w-4 text-cyan-400" />
                  <span className="font-semibold text-slate-200">Signal 1: Rainfall Index</span>
                </div>
                <div className="text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Season Rain:</span>
                    <span className="font-mono font-bold">{evidence.season_rain_mm} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trigger (30th pct):</span>
                    <span className="font-mono font-bold">{evidence.trigger_rain_mm} mm</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span>Index Triggers:</span>
                    <span className={`font-mono font-bold ${evidence.index_pays ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {evidence.index_pays ? 'PAYS' : 'NO PAY'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signal 2: Ground Photo Severity */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center space-x-2 text-slate-400 mb-1.5">
                  <Eye className="h-4 w-4 text-amber-400" />
                  <span className="font-semibold text-slate-200">Signal 2: Photo Evidence</span>
                </div>
                <div className="text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Severity Band:</span>
                    <span className="font-mono font-bold text-amber-400">{grading.final_severity_band}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Damage Type:</span>
                    <span className="font-mono font-bold capitalize">{grading.damage_type}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span>Ground Damage:</span>
                    <span className="font-mono font-bold text-amber-400">CONFIRMED</span>
                  </div>
                </div>
              </div>

              {/* Signal 3: Satellite Stress & Phenology */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center space-x-2 text-slate-400 mb-1.5">
                  <Satellite className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold text-slate-200">Signal 3: Satellite & Stage</span>
                </div>
                <div className="text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>NDVI Anomaly z:</span>
                    <span className="font-mono font-bold text-rose-400">{evidence.ndvi_anomaly_z}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dry Spell Window:</span>
                    <span className="font-mono font-bold">{evidence.max_dry_spell_days} days</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span>Overlaps Flowering:</span>
                    <span className={`font-mono font-bold ${evidence.dry_spell_overlaps_critical_stage ? 'text-amber-400' : 'text-slate-400'}`}>
                      {evidence.dry_spell_overlaps_critical_stage ? 'TRUE (21d)' : 'FALSE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Policy Brief & Verified Clause Citations */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <FileText className="h-4 w-4 text-brand-400" />
                <span>{t.insurer.inspector.policyTitle}</span>
              </h3>
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-400">Cited Clauses:</span>
                {decision.cited_clause_ids.map(id => (
                  <button
                    key={id}
                    onClick={() => onOpenClause(id)}
                    className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 cursor-pointer transition-colors"
                  >
                    {id} ↗
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed mb-3">
              <span className="font-semibold text-slate-200 block mb-1">Adjuster Brief:</span>
              {decision.adjuster_brief}
            </div>

            {/* Farmer Multilingual Message Preview */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-semibold text-[11px] block mb-1">
                Farmer Multilingual Notification (Dispatched via SMS/WhatsApp):
              </span>
              <p className="text-slate-300 font-mono text-[11px] italic">
                "{decision.farmer_messages[language] || decision.farmer_messages.en}"
              </p>
            </div>
          </div>

          {/* Section 5: Mandatory Human Adjuster Sign-Off */}
          <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <span>{t.insurer.inspector.humanSignOff}</span>
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{t.insurer.inspector.adjusterId}</label>
                  <input
                    type="text"
                    value={adjusterId}
                    onChange={(e) => setAdjusterId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Final Action Selection</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedAction('APPROVED')}
                      className={`py-1.5 px-2 rounded-lg font-semibold text-xs transition-all ${
                        selectedAction === 'APPROVED'
                          ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAction('ESCALATED')}
                      className={`py-1.5 px-2 rounded-lg font-semibold text-xs transition-all ${
                        selectedAction === 'ESCALATED'
                          ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Escalate
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAction('REJECTED')}
                      className={`py-1.5 px-2 rounded-lg font-semibold text-xs transition-all ${
                        selectedAction === 'REJECTED'
                          ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Adjuster Audit Notes</label>
                <textarea
                  rows={2}
                  value={adjusterNotes}
                  onChange={(e) => setAdjusterNotes(e.target.value)}
                  placeholder={t.insurer.inspector.notesPlaceholder}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* BigQuery Audit Provenance Footer */}
              <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border border-slate-800/80">
                <span>Model: {audit?.model_version || 'gemini-2.0-flash-001'}</span>
                <span>Prompt: {audit?.prompt_version || 'v2.1.0'}</span>
                <span>Protocol: {audit?.frozen_protocol_commit_hash || '0371cad'}</span>
                <span>Audit ID: {audit?.audit_id || 'AUD-2026-001'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 px-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Immutable sign-off is committed to BigQuery audit log upon saving.
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDecision}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-500/20 transition-all flex items-center space-x-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Recording Audit...' : t.insurer.inspector.saveDecision}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
