import React, { useState, useEffect } from 'react';
import {
  Shield, Sparkles, ArrowRight, CheckCircle2, Eye, CloudRain,
  Satellite, Layers, Sliders, Upload, BarChart3, Zap, Globe,
  GitBranch, TrendingUp, Users, ChevronRight, Play
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface HeroLandingProps {
  language: Language;
  onNavigate: (tab: 'farmer' | 'insurer' | 'validation') => void;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({ language, onNavigate }) => {
  const t = translations[language];
  const [activeSignal, setActiveSignal] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveSignal(prev => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const signals = [
    {
      icon: CloudRain,
      label: 'Rainfall Index',
      detail: 'Frozen 30th percentile trigger via CHIRPS data',
      color: 'cyan',
      metric: '290 mm',
    },
    {
      icon: Eye,
      label: 'Ground Photo AI',
      detail: 'Two-pass Gemini grading with concept-bottleneck signs',
      color: 'amber',
      metric: '0–3 Signs',
    },
    {
      icon: Satellite,
      label: 'Satellite NDVI',
      detail: 'Sentinel-2 vegetation anomaly z-score < -1.5',
      color: 'emerald',
      metric: 'z = -1.9',
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-brand-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Hero Section */}
      <section className={`relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Competition Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm">
            <Sparkles className="h-4 w-4 text-brand-400" />
            <span className="text-brand-300 font-semibold">Google AI Builder Cup 2026</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">BFSI Track</span>
          </div>
        </div>

        {/* Main Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5">
            <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Closing the{' '}
            </span>
            <span className="bg-gradient-to-r from-brand-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Basis-Risk Gap
            </span>
            <br />
            <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              in Crop Insurance
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-8">
            FieldProof is an AI claims reconciliation layer that fuses{' '}
            <span className="text-cyan-400 font-semibold">rainfall index data</span>,{' '}
            <span className="text-amber-400 font-semibold">multimodal crop photo forensics</span>, and{' '}
            <span className="text-emerald-400 font-semibold">satellite vegetation stress</span>{' '}
            into a single deterministic concordance decision — with every threshold{' '}
            <span className="text-brand-300 font-semibold">frozen and committed before evaluation</span>.
          </p>

          {/* Key metrics strip */}
          <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300">88.7% Accuracy</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <Shield className="h-4 w-4 text-cyan-400" />
              <span className="text-slate-300">91.2% Precision</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <TrendingUp className="h-4 w-4 text-brand-400" />
              <span className="text-slate-300">77.5% Cost Savings</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <GitBranch className="h-4 w-4 text-amber-400" />
              <span className="text-slate-300 font-mono">0371cad</span>
              <span className="text-slate-400">Frozen</span>
            </div>
          </div>
        </div>

        {/* Three-Signal Concordance Visual */}
        <div className="max-w-4xl mx-auto mb-14">
          <div className="text-center mb-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Our Innovation</h2>
            <p className="text-lg font-bold text-white">Three-Signal Concordance Loop</p>
            <p className="text-xs text-slate-500 mt-1">No competitor offers this closed-loop check — Index × Photo × Satellite + Dry-Spell Timing</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {signals.map((s, i) => {
              const Icon = s.icon;
              const isActive = activeSignal === i;
              const colorMap: Record<string, string> = {
                cyan: isActive ? 'border-cyan-500/50 bg-cyan-950/30 shadow-lg shadow-cyan-500/10' : 'border-slate-800 bg-slate-900/60',
                amber: isActive ? 'border-amber-500/50 bg-amber-950/30 shadow-lg shadow-amber-500/10' : 'border-slate-800 bg-slate-900/60',
                emerald: isActive ? 'border-emerald-500/50 bg-emerald-950/30 shadow-lg shadow-emerald-500/10' : 'border-slate-800 bg-slate-900/60',
              };
              const iconColor: Record<string, string> = {
                cyan: 'text-cyan-400',
                amber: 'text-amber-400',
                emerald: 'text-emerald-400',
              };

              return (
                <div
                  key={i}
                  className={`relative p-5 rounded-2xl border transition-all duration-500 cursor-pointer ${colorMap[s.color]}`}
                  onClick={() => setActiveSignal(i)}
                >
                  <div className={`h-10 w-10 rounded-xl bg-slate-950/80 border border-slate-700 flex items-center justify-center mb-3 ${isActive ? 'scale-110' : ''} transition-transform`}>
                    <Icon className={`h-5 w-5 ${iconColor[s.color]}`} />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1">{s.label}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-2">{s.detail}</p>
                  <div className="text-xs font-mono font-bold text-slate-300 px-2 py-1 rounded bg-slate-950/80 border border-slate-800 inline-block">
                    {s.metric}
                  </div>
                  {isActive && (
                    <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full animate-pulse ${s.color === 'cyan' ? 'bg-cyan-400' : s.color === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Arrow pointing to concordance */}
          <div className="flex items-center justify-center my-4">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600/20 via-emerald-500/20 to-cyan-500/20 border border-brand-500/30">
              <Layers className="h-4 w-4 text-brand-400" />
              <span className="text-sm font-bold text-white">Concordance Table →</span>
              <span className="text-xs text-slate-300">7 outcome classes, policy clause citations, mandatory human sign-off</span>
            </div>
          </div>
        </div>

        {/* Three Demo Flow CTAs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-16">
          {/* Farmer Flow */}
          <button
            onClick={() => onNavigate('farmer')}
            className="group relative p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 text-left hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Upload className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-mono text-emerald-400 block">Demo 1</span>
                <h3 className="text-base font-bold text-white">Farmer Upload</h3>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Mobile-first PWA: Upload 3 photos, get instant integrity feedback (duplicate/blurry rejection), and see localized multilingual results.
            </p>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
              <Play className="h-3.5 w-3.5" />
              <span>Try as Wanjiru (Kenya Farmer)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>

          {/* Insurer Flow */}
          <button
            onClick={() => onNavigate('insurer')}
            className="group relative p-6 rounded-2xl bg-gradient-to-br from-brand-950/40 to-slate-900 border border-brand-500/20 hover:border-brand-500/50 transition-all duration-300 text-left hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-1"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                <Layers className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <span className="text-xs font-mono text-brand-400 block">Demo 2</span>
                <h3 className="text-base font-bold text-white">Insurer Triage</h3>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Adjuster queue with deep claim inspection, two-pass Gemini forensics, three-signal concordance table, policy citations, and mandatory sign-off.
            </p>
            <div className="flex items-center space-x-1.5 text-xs text-brand-400 font-semibold group-hover:translate-x-1 transition-transform">
              <Play className="h-3.5 w-3.5" />
              <span>Inspect Claims & Index Doctor</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>

          {/* Validation Flow */}
          <button
            onClick={() => onNavigate('validation')}
            className="group relative p-6 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 text-left hover:shadow-xl hover:shadow-cyan-500/5 hover:-translate-y-1"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <span className="text-xs font-mono text-cyan-400 block">Demo 3</span>
                <h3 className="text-base font-bold text-white">Technical Merit</h3>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              4-arm ablation table, risk-coverage curve, planted bad bundle integrity scorecard, and interactive unit economics calculator.
            </p>
            <div className="flex items-center space-x-1.5 text-xs text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform">
              <Play className="h-3.5 w-3.5" />
              <span>View Empirical Validation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>

        {/* Architecture Pillars */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <Shield className="h-6 w-6 text-brand-400 mx-auto mb-2" />
              <span className="text-xs font-semibold text-white block">Zero AI in Core</span>
              <span className="text-[10px] text-slate-400">Pure Java payout engine</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <GitBranch className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
              <span className="text-xs font-semibold text-white block">Frozen Protocol</span>
              <span className="text-[10px] text-slate-400">Committed before eval</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <Globe className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
              <span className="text-xs font-semibold text-white block">Trilingual UX</span>
              <span className="text-[10px] text-slate-400">EN · SW · HI</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <Users className="h-6 w-6 text-amber-400 mx-auto mb-2" />
              <span className="text-xs font-semibold text-white block">Buyer: Claims Head</span>
              <span className="text-[10px] text-slate-400">PMFBY / ACRE Africa MGA</span>
            </div>
          </div>

          {/* Pilot Ask Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-950/30 via-slate-900 to-emerald-950/20 border border-brand-500/20 text-center">
            <p className="text-sm text-slate-300 mb-2">
              <span className="font-bold text-white">Our Ask:</span> A single-district pilot (600 plots, one Long Rains season) with an insurer or MGA partner.
            </p>
            <p className="text-xs text-slate-400">
              Unit economics: <span className="font-mono text-brand-300">$0.04/claim AI triage</span> vs <span className="font-mono text-slate-300">$18/visit manual CCE</span> → <span className="font-bold text-emerald-400">77.5% savings</span> at <span className="font-mono text-slate-300">91.2% precision</span> on covered claims.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
