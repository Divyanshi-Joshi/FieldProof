import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroLanding } from './components/HeroLanding';
import { FarmerView } from './components/FarmerView';
import { InsurerView } from './components/InsurerView';
import { ValidationView } from './components/ValidationView';
import { PolicyModal } from './components/PolicyModal';
import { Language } from './i18n/translations';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'landing' | 'farmer' | 'insurer' | 'validation'>('landing');
  const [language, setLanguage] = useState<Language>('en');
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const handleOpenClause = (clauseId: string) => {
    setSelectedClauseId(clauseId);
    setPolicyModalOpen(true);
  };

  const handleClaimSubmitted = (claimId: string) => {
    setSelectedClaimId(claimId);
  };

  const handleNavigate = (tab: 'farmer' | 'insurer' | 'validation') => {
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Navigation — hidden on landing */}
      <Navbar
        currentTab={currentTab}
        setTab={(tab) => setCurrentTab(tab)}
        language={language}
        setLanguage={setLanguage}
        onOpenPolicy={() => {
          setSelectedClauseId(null);
          setPolicyModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'landing' && (
          <div className="animate-in fade-in duration-500">
            <HeroLanding
              language={language}
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {currentTab === 'farmer' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
            <FarmerView
              language={language}
              onClaimSubmitted={(id) => {
                handleClaimSubmitted(id);
                setCurrentTab('insurer');
              }}
            />
          </div>
        )}

        {currentTab === 'insurer' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
            <InsurerView
              language={language}
              onOpenClause={handleOpenClause}
              selectedClaimId={selectedClaimId}
            />
          </div>
        )}

        {currentTab === 'validation' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
            <ValidationView
              language={language}
              onOpenPolicy={() => {
                setSelectedClauseId(null);
                setPolicyModalOpen(true);
              }}
            />
          </div>
        )}
      </main>

      {/* Illustrative Policy & Frozen Protocol Modal */}
      <PolicyModal
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        selectedClauseId={selectedClauseId}
      />

      {/* Footer */}
      <footer className="w-full glass-panel border-t border-slate-800 py-6 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-md bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-300 font-bold text-[10px]">
              FP
            </div>
            <span className="font-semibold text-slate-200">FieldProof</span>
            <span>— AI Builder Cup 2026 (BFSI Track)</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Pure Java Core (Zero AI imports in <code className="text-slate-300 font-mono">core/</code>)</span>
            </span>
            <span>·</span>
            <span className="font-mono text-slate-400">Git Commit: 0371cad</span>
            <span>·</span>
            <button
              onClick={() => {
                setSelectedClauseId(null);
                setPolicyModalOpen(true);
              }}
              className="text-brand-400 hover:text-brand-300 transition-colors"
            >
              Policy & Protocol
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
