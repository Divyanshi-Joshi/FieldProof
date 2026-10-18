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

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
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

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Navbar current={route.tab} onNavigate={navigate} onOpenPolicy={() => openPolicy()} />

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
        {route.tab === 'doctor' && (
          <IndexDoctorView queryParams={route.queryParams} onNavigate={navigate} />
        )}
        {route.tab === 'validation' && <ValidationView onOpenPolicy={() => openPolicy()} />}
      </main>

      <PolicyModal isOpen={policyOpen} onClose={() => setPolicyOpen(false)} selectedClauseId={clauseId} />

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            FieldProof is a prototype for the AI Builder Cup 2026, BFSI track. It runs on historical plots from the public
            Eyes on the Ground dataset. It is not a certified product or a real insurer's contract.
          </p>
          <button onClick={() => openPolicy()} className="btn-text shrink-0">
            Read the demo policy and payout rule
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
