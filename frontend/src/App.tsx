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

/** Hash routes (#/claims/CLM-1 or #/index-doctor?county=beed&plot=P-0142) work on Cloud Run's static hosting. */
function readRoute(): { tab: ActiveTab; claimId: string | null; queryParams: Record<string, string> } {
  const hash = window.location.hash.replace(/^#/, '');
  const [pathPart, queryPart] = hash.split('?');
  const parts = (pathPart || '').split('/').filter(Boolean);
  const head = `/${parts[0] ?? ''}`;
  const tab = (Object.keys(TAB_PATH) as ActiveTab[]).find((k) => TAB_PATH[k] === head) ?? 'landing';

  const queryParams: Record<string, string> = {};
  if (queryPart) {
    const sp = new URLSearchParams(queryPart);
    sp.forEach((v, k) => {
      queryParams[k] = v;
    });
  }

  return {
    tab,
    claimId: tab === 'insurer' && parts[1] ? decodeURIComponent(parts[1]) : null,
    queryParams,
  };
}

export const App: React.FC = () => {
  const [route, setRoute] = useState(readRoute);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [clauseId, setClauseId] = useState<string | null>(null);

  // Theme state: defaults to light (classic FieldProof cream & sage)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('fieldproof_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Phase 3: Persona switcher state ('farmer' | 'insurer')
  const [persona, setPersona] = useState<'farmer' | 'insurer'>(() => {
    return route.tab === 'farmer' ? 'farmer' : 'insurer';
  });

  // Slider state for going to top when user reaches footer/scrolls down
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      // Show slider button when scrolled down (e.g. past 350px or nearing footer)
      setShowScrollTop(scrollY > 350 || scrollY + windowHeight >= docHeight - 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const navigate = (tab: ActiveTab, claimId?: string | null, params?: Record<string, string | number>) => {
    let path = TAB_PATH[tab] + (tab === 'insurer' && claimId ? `/${encodeURIComponent(claimId)}` : '');
    if (params && Object.keys(params).length > 0) {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.set(k, String(v)));
      path += `?${sp.toString()}`;
    }
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
        {route.tab === 'landing' && (
          <HeroLanding 
            onNavigate={navigate} 
            onOpenPolicy={() => openPolicy()} 
          />
        )}
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
        {route.tab === 'doctor' && (
          <IndexDoctorView queryParams={route.queryParams} onNavigate={navigate} />
        )}
        {route.tab === 'validation' && <ValidationView onOpenPolicy={() => openPolicy()} />}
      </main>

      <PolicyModal isOpen={policyOpen} onClose={() => setPolicyOpen(false)} selectedClauseId={clauseId} />

      {/* Standard Clean Website Footer */}
      <footer className="border-t border-line bg-canvas text-ink transition-colors">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            {/* Column 1: Brand & Summary */}
            <div className="col-span-2 space-y-3 pr-4">
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
                  <rect width="32" height="32" rx="7" fill="var(--color-field)" />
                  <rect x="7" y="17" width="4" height="8" rx="1.5" fill="#F2DD8C" />
                  <rect x="14" y="11" width="4" height="14" rx="1.5" fill="#fff" />
                  <rect x="21" y="7" width="4" height="18" rx="1.5" fill="#fff" />
                </svg>
                <span className="font-display font-bold text-base tracking-tight text-ink">FieldProof</span>
              </div>
              <p className="text-xs text-muted leading-relaxed max-w-sm">
                Parametric basis-risk reconciliation engine closing the insurance payout gap with multimodal vision and satellite intelligence.
              </p>
              <p className="text-[11px] text-muted/70">
                Google Cloud AI Builder Cup 2026
              </p>
            </div>

            {/* Column 2: Platform Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink/75">Platform</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button 
                    onClick={() => navigate('landing')} 
                    className="text-left text-muted hover:text-ink transition-colors"
                  >
                    System Overview
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('farmer')} 
                    className="text-left text-muted hover:text-ink transition-colors"
                  >
                    Farmer Photo Capture
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('insurer')} 
                    className="text-left text-muted hover:text-ink transition-colors"
                  >
                    Claims Adjuster Console
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('doctor')} 
                    className="text-left text-muted hover:text-ink transition-colors"
                  >
                    Index Doctor (Forward ML)
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Resources & Policy */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink/75">Resources</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button 
                    onClick={() => navigate('validation')} 
                    className="text-left text-muted hover:text-ink transition-colors"
                  >
                    Evidence & Metrics
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => openPolicy()} 
                    className="text-left text-muted hover:text-ink transition-colors"
                  >
                    PMFBY Policy Clauses
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact / Creators */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink/75">Connect</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="https://www.linkedin.com/in/rudra-mriganka/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-muted hover:text-field dark:hover:text-emerald-400 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5 fill-current opacity-80" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    <span>Rudra Mriganka</span>
                    <span className="text-[10px] opacity-60">↗</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/divyanshi-joshi-352a73256/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-muted hover:text-field dark:hover:text-emerald-400 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5 fill-current opacity-80" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    <span>Divyanshi Joshi</span>
                    <span className="text-[10px] opacity-60">↗</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="mt-10 pt-6 border-t border-line/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted">
            <p className="text-[11px]">
              © 2026 FieldProof Technologies. All rights reserved.
            </p>
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <span>BFSI / InsurTech Track</span>
              <span>•</span>
              <span>Cloud Run Global</span>
              <span>•</span>
              <span>Vertex AI</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating slider button for going to top when reaching footer / scrolling */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-line bg-surface/95 px-3.5 py-2 text-xs font-semibold text-ink shadow-lg backdrop-blur-md transition-all duration-300 hover:border-field hover:text-field hover:shadow-xl ${
          showScrollTop ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <span>Top</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </div>
  );
};

export default App;
