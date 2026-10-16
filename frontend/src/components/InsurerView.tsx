import React, { useState, useEffect } from 'react';
import { Layers, Sliders, Search, Filter, AlertTriangle, CheckCircle, Clock, Eye, AlertOctagon, RefreshCw, ChevronRight, UserCheck } from 'lucide-react';
import { ClaimBundle, api } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { ClaimDetailModal } from './ClaimDetailModal';
import { IndexDoctorView } from './IndexDoctorView';

interface InsurerViewProps {
  language: Language;
  onOpenClause: (clauseId: string) => void;
  selectedClaimId?: string | null;
}

export const InsurerView: React.FC<InsurerViewProps> = ({
  language,
  onOpenClause,
  selectedClaimId
}) => {
  const t = translations[language];

  const [activeSubTab, setActiveSubTab] = useState<'triage' | 'indexDoctor'>('triage');
  const [claims, setClaims] = useState<ClaimBundle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [inspectingClaim, setInspectingClaim] = useState<ClaimBundle | null>(null);

  // Load claims
  useEffect(() => {
    setIsLoading(true);
    api.getClaims()
      .then(data => {
        setClaims(data);
        setIsLoading(false);
        if (selectedClaimId) {
          const match = data.find(c => c.grading.claim_id === selectedClaimId);
          if (match) setInspectingClaim(match);
        }
      })
      .catch(err => {
        console.error('Failed to load claims', err);
        setIsLoading(false);
      });
  }, [selectedClaimId]);

  const handleDecisionUpdated = (updatedClaim: ClaimBundle) => {
    setClaims(prev => prev.map(c => 
      c.grading.claim_id === updatedClaim.grading.claim_id ? updatedClaim : c
    ));
  };

  // Filtering
  const filteredClaims = claims.filter(c => {
    const matchesSearch = 
      c.grading.claim_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.grading.plot_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.evidence.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c._label.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'gaps') {
      return c.decision.outcome_class.includes('BASIS_RISK_GAP');
    } else if (filterType === 'payouts') {
      return c.decision.outcome_class === 'CONFIRMED_PAYOUT';
    } else if (filterType === 'holds') {
      return c.decision.outcome_class === 'INTEGRITY_HOLD' || c.decision.outcome_class === 'ABSTAIN';
    } else if (filterType === 'overpayment') {
      return c.decision.outcome_class === 'POSSIBLE_OVERPAYMENT';
    }
    return true;
  });

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
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* View Header with Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t.insurer.title}</h1>
          <p className="text-sm text-slate-400 mt-1">{t.insurer.subtitle}</p>
        </div>

        {/* Sub-Tabs: Triage vs Index Doctor */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveSubTab('triage')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'triage'
                ? 'bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>{t.insurer.subTabs.triage}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('indexDoctor')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'indexDoctor'
                ? 'bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>{t.insurer.subTabs.indexDoctor}</span>
          </button>
        </div>
      </div>

      {/* Render Active Sub-Tab */}
      {activeSubTab === 'indexDoctor' ? (
        <IndexDoctorView language={language} />
      ) : (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Triage Search & Filters */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Plot ID, Claim ID, County, or Failure Mode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  filterType === 'all'
                    ? 'bg-slate-800 text-white font-semibold border-slate-700'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {t.insurer.filterAll} ({claims.length})
              </button>
              <button
                onClick={() => setFilterType('gaps')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  filterType === 'gaps'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border-amber-500/40'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {t.insurer.filterGaps}
              </button>
              <button
                onClick={() => setFilterType('payouts')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  filterType === 'payouts'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border-emerald-500/40'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {t.insurer.filterPayouts}
              </button>
              <button
                onClick={() => setFilterType('holds')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  filterType === 'holds'
                    ? 'bg-rose-500/20 text-rose-300 font-semibold border-rose-500/40'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {t.insurer.filterHolds}
              </button>
              <button
                onClick={() => setFilterType('overpayment')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  filterType === 'overpayment'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border-cyan-500/40'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {t.insurer.filterOverpayment}
              </button>
            </div>
          </div>

          {/* Claims Cards Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-400" />
              <span>Loading Claims Triage Queue...</span>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="p-12 text-center text-slate-500 glass-card rounded-2xl">
              No claims matching the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {filteredClaims.map((claim) => {
                const { grading, evidence, decision, audit } = claim;
                const isDecided = audit?.adjuster_action && audit.adjuster_action !== 'PENDING';

                return (
                  <div
                    key={grading.claim_id}
                    className="glass-card rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
                  >
                    {/* Card Header */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-white text-sm">
                            {grading.claim_id}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Plot: {grading.plot_id}
                          </span>
                          <span className="text-xs text-slate-400">
                            · {evidence.county} ({evidence.crop})
                          </span>
                        </div>

                        {isDecided ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>{audit.adjuster_action}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700 flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Sign-Off Pending</span>
                          </span>
                        )}
                      </div>

                      {/* Outcome Badge & Label */}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getOutcomeBadge(decision.outcome_class)}`}>
                          {decision.outcome_class}
                        </span>
                        <span className="text-xs text-slate-300 font-medium truncate" title={claim._label}>
                          {claim._label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                        {claim._description}
                      </p>
                    </div>

                    {/* Three-Signal Mini Indicators */}
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Rainfall Index:</span>
                        <span className={evidence.index_pays ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {evidence.index_pays ? 'PAYS' : 'NO PAY'} ({evidence.season_rain_mm}mm)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Photo Damage:</span>
                        <span className="text-amber-400 font-bold">
                          {grading.final_severity_band}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Satellite Stress:</span>
                        <span className={evidence.satellite_stress ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {evidence.satellite_stress ? `z = ${evidence.ndvi_anomaly_z}` : 'NORMAL'}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Action Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                        <span>Cites:</span>
                        {decision.cited_clause_ids.map(id => (
                          <span key={id} className="font-mono text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded text-[10px] border border-brand-500/20">
                            {id}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => setInspectingClaim(claim)}
                        className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-md shadow-brand-500/20 transition-all flex items-center space-x-1.5"
                      >
                        <span>{t.insurer.inspectButton}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Deep-Inspection Modal */}
          {inspectingClaim && (
            <ClaimDetailModal
              claim={inspectingClaim}
              isOpen={Boolean(inspectingClaim)}
              onClose={() => setInspectingClaim(null)}
              language={language}
              onDecisionUpdated={handleDecisionUpdated}
              onOpenClause={onOpenClause}
            />
          )}
        </div>
      )}
    </div>
  );
};
