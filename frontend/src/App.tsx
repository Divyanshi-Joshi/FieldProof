import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroLanding } from './components/HeroLanding';
import { FarmerView } from './components/FarmerView';
import { InsurerView } from './components/InsurerView';
import { IndexDoctorView } from './components/IndexDoctorView';
import { ValidationView } from './components/ValidationView';
import { PolicyModal } from './components/PolicyModal';

export type ActiveTab = 'landing' | 'farmer' | 'insurer' | 'doctor' | 'validation';

const TAB_PATH: Record<ActiveTab, string> = {
  landing: '/',
  farmer: '/farmer',
  insurer: '/claims',
  doctor: '/index-doctor',
  validation: '/results',
};

/** Hash routes (#/claims/CLM-1) work on Cloud Run's static hosting without server rewrites. */
function readRoute(): { tab: ActiveTab; claimId: string | null } {
  const parts = window.location.hash.replace(/^#/, '').split('/').filter(Boolean);
  const head = `/${parts[0] ?? ''}`;
  const tab = (Object.keys(TAB_PATH) as ActiveTab[]).find((k) => TAB_PATH[k] === head) ?? 'landing';
  return { tab, claimId: tab === 'insurer' && parts[1] ? decodeURIComponent(parts[1]) : null };
}

export const App: React.FC = () => {
  const [route, setRoute] = useState(readRoute);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [clauseId, setClauseId] = useState<string | null>(null);

  // Phase 5: Dark mode state (default: dark)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('fieldproof_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  // Phase 3: Persona switcher state ('farmer' | 'insurer')
  const [persona, setPersona] = useState<'farmer' | 'insurer'>(() => {
    return route.tab === 'farmer' ? 'farmer' : 'insurer';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('fieldproof_theme', theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => {
      const r = readRoute();
      setRoute(r);
      if (r.tab === 'farmer') setPersona('farmer');
      else if (r.tab === 'insurer' || r.tab === 'doctor') setPersona('insurer');
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (tab: ActiveTab, claimId?: string | null) => {
    const path = TAB_PATH[tab] + (tab === 'insurer' && claimId ? `/${encodeURIComponent(claimId)}` : '');
    if (window.location.hash !== `#${path}`) window.location.hash = path;
  };

  const openPolicy = (id: string | null = null) => {
    setClauseId(id);
    setPolicyOpen(true);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handlePersonaChange = (p: 'farmer' | 'insurer') => {
    setPersona(p);
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink transition-colors duration-200">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Navbar
        current={route.tab}
        onNavigate={navigate}
        onOpenPolicy={() => openPolicy()}
        persona={persona}
        onPersonaChange={handlePersonaChange}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main id="main" className="flex-1">
        {route.tab === 'landing' && <HeroLanding onNavigate={navigate} />}
        {route.tab === 'farmer' && (
          <FarmerView onNavigate={navigate} />
        )}
        {route.tab === 'insurer' && (
          <InsurerView
            selectedClaimId={route.claimId}
            onSelectClaim={(id) => navigate('insurer', id)}
            onOpenClause={(id) => openPolicy(id)}
            onNavigate={navigate}
          />
        )}
        {route.tab === 'doctor' && <IndexDoctorView />}
        {route.tab === 'validation' && <ValidationView onOpenPolicy={() => openPolicy()} />}
      </main>

      <PolicyModal isOpen={policyOpen} onClose={() => setPolicyOpen(false)} selectedClauseId={clauseId} />

      {/* Enterprise JAPAC Footer with Copyright & Attribution */}
      <footer className="border-t border-line bg-surface/80 backdrop-blur transition-colors">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pb-6 border-b border-line text-xs">
            <div>
              <p className="font-display font-semibold text-ink text-sm">FieldProof JAPAC</p>
              <p className="mt-1 text-muted leading-relaxed">
                Autonomous parametric basis-risk resolution engine powered by Gemini 2.0 Multimodal Vision, Google Earth Engine & BigQuery ML.
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink uppercase tracking-wider text-[11px]">Jurisdictional Coverage</p>
              <ul className="mt-2 space-y-1 text-muted">
                <li>🇮🇳 India (PMFBY / AgriStack compliant)</li>
                <li>🇮🇩 Indonesia (Jasindo / OJK Parametric)</li>
                <li>🇹🇭 Thailand (BAAC Rice & Cassava Index)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-ink uppercase tracking-wider text-[11px]">Auditability & Compliance</p>
              <ul className="mt-2 space-y-1 text-muted">
                <li>Two-pass anchor permutation grading</li>
                <li>Cryptographic protocol freeze hash</li>
                <li>Immutable BigQuery audit logging</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-ink uppercase tracking-wider text-[11px]">Policy & Governance</p>
              <p className="mt-2 text-muted">
                Adheres to statutory drought & dry-spell trigger indices with mandatory human-in-the-loop sign-off.
              </p>
              <button onClick={() => openPolicy()} className="btn-text mt-2 block">
                View Master Policy Binder →
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © 2026 FieldProof Technologies. Built for Google Cloud AI Builder Cup (BFSI / InsurTech Track).
            </p>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-field"></span>
                <span>Production Ready</span>
              </span>
              <span>Cloud Run Global</span>
              <span>Vertex AI / BigQuery ML</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
