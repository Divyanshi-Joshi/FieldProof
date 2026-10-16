import React from 'react';
import { Shield, Sparkles, CheckCircle, Globe, Layers, BarChart3, Upload, Home } from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface NavbarProps {
  currentTab: 'landing' | 'farmer' | 'insurer' | 'validation';
  setTab: (tab: 'landing' | 'farmer' | 'insurer' | 'validation') => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  onOpenPolicy: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setTab,
  language,
  setLanguage,
  onOpenPolicy
}) => {
  const t = translations[language];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setTab('landing')}>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20 border border-brand-400/30">
            <Shield className="h-5 w-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
                FieldProof
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
                v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Agricultural Basis-Risk Decision Core
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setTab('farmer')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              currentTab === 'farmer'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden md:inline">{t.tabs.farmer}</span>
            <span className="md:hidden">Farmer</span>
          </button>

          <button
            onClick={() => setTab('insurer')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              currentTab === 'insurer'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span className="hidden md:inline">{t.tabs.insurer}</span>
            <span className="md:hidden">Insurer & Index</span>
          </button>

          <button
            onClick={() => setTab('validation')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              currentTab === 'validation'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden md:inline">{t.tabs.validation}</span>
            <span className="md:hidden">Validation</span>
          </button>
        </nav>

        {/* Right Section: Protocol Hash Pill & Language Selector */}
        <div className="flex items-center space-x-3">
          {/* Frozen Protocol Pill */}
          <div 
            onClick={onOpenPolicy}
            title="Click to view frozen trigger protocol & illustrative policy"
            className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/60 hover:border-brand-500/50 cursor-pointer transition-colors text-xs"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Frozen Protocol:</span>
            <span className="font-mono text-brand-300 font-semibold">0371cad</span>
            <CheckCircle className="h-3.5 w-3.5 text-brand-400" />
          </div>

          {/* Language Selector */}
          <div className="flex items-center space-x-1 bg-slate-900/90 rounded-lg p-1 border border-slate-800">
            <Globe className="h-3.5 w-3.5 text-slate-400 ml-1.5 mr-0.5" />
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                language === 'en' ? 'bg-slate-800 text-brand-400 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('sw')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                language === 'sw' ? 'bg-slate-800 text-brand-400 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SW
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                language === 'hi' ? 'bg-slate-800 text-brand-400 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              HI
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
