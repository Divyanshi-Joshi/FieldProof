import React, { useState } from 'react';
import { ActiveTab } from '../App';
import {
  Menu,
  X,
  Home,
  Activity,
  ShieldCheck,
  FileText,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

interface NavbarProps {
  current: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onOpenPolicy: () => void;
  persona: 'farmer' | 'insurer';
  onPersonaChange: (p: 'farmer' | 'insurer') => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="7" fill="var(--color-field)" />
    <rect x="7" y="17" width="4" height="8" rx="1.5" fill="#F2DD8C" />
    <rect x="14" y="11" width="4" height="14" rx="1.5" fill="#fff" />
    <rect x="21" y="7" width="4" height="18" rx="1.5" fill="#fff" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  current,
  onNavigate,
  onOpenPolicy,
  persona,
  onPersonaChange,
  theme,
  onToggleTheme,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const getActiveTabTitle = () => {
    switch (current) {
      case 'doctor':
        return 'Index Doctor';
      case 'validation':
        return 'Evidence & Metrics';
      case 'farmer':
        return 'Farmer Portal';
      case 'insurer':
        return 'Claims Desk';
      case 'landing':
      default:
        return null; // When page is loaded, overview by default with no needed tab name displayed
    }
  };

  const activeTitle = getActiveTabTitle();

  const handleSelectTab = (tab: ActiveTab) => {
    onNavigate(tab);
    setMenuOpen(false);
  };

  const handleSelectPolicy = () => {
    onOpenPolicy();
    setMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left Side: Logo + Brand + (Active View Label) */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => handleSelectTab('landing')}
              className="flex shrink-0 items-center gap-2.5"
              aria-label="FieldProof home"
            >
              <Logo />
              <div className="text-left">
                <span className="font-display text-lg font-bold tracking-tight text-ink block leading-none">
                  FieldProof
                </span>
              </div>
            </button>

            {/* If tab is not overview/landing, display its name on the right side of the logo */}
            {activeTitle && (
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-line text-sm font-semibold text-ink">
                <span className="h-2 w-2 rounded-full bg-field animate-pulse" />
                <span>{activeTitle}</span>
              </div>
            )}
          </div>

          {/* Right Side: Clean controls (Persona Toggle + Dark Mode + 3 Horizontal Lines Floating Menu) */}
          <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
            {/* 1-Click Persona Switcher */}
            <div className="flex items-center rounded-lg border border-line bg-sunk/60 p-1 text-xs font-semibold">
              <button
                onClick={() => {
                  onPersonaChange('farmer');
                  onNavigate('farmer');
                }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-all ${persona === 'farmer'
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                  }`}
                title="Switch to Farmer View"
              >
                <span>🌾</span>
                <span className="hidden sm:inline">Farmer</span>
              </button>
              <button
                onClick={() => {
                  onPersonaChange('insurer');
                  onNavigate('insurer');
                }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-all ${persona === 'insurer'
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                  }`}
                title="Switch to Adjuster & Actuary Console"
              >
                <span>🏛️</span>
                <span className="hidden sm:inline">Adjuster</span>
              </button>
            </div>

            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-ink hover:border-faint transition-colors"
              title={`Currently ${theme} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-bloom" />
              ) : (
                <Moon className="h-4 w-4 text-ink" />
              )}
            </button>

            {/* 3 Horizontal Lines (Menu button on the right side) */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink hover:border-field hover:text-field transition-all shadow-sm"
              aria-label="Toggle navigation menu"
              title="Open Navigation Menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Floating Right Navigation Drawer / Menu (Floating Island, not full-screen edge) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Subtle backdrop */}
          <div
            className="fixed inset-0 bg-ink/30 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          {/* Floating Rounded Panel on the Right */}
          <div className="fixed right-4 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Logo className="h-5 w-5" />
                <span className="font-display text-sm font-bold text-ink">FieldProof Menu</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Navigation
                </p>
                <div className="space-y-1">
                  <button
                    onClick={() => handleSelectTab('landing')}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${current === 'landing'
                        ? 'bg-field-soft text-field'
                        : 'text-ink hover:bg-canvas'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Home className="h-4 w-4 text-field" />
                      <span>Overview</span>
                    </div>
                    {current === 'landing' && <span className="h-1.5 w-1.5 rounded-full bg-field" />}
                  </button>

                  <button
                    onClick={() => handleSelectTab('doctor')}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${current === 'doctor'
                        ? 'bg-field-soft text-field'
                        : 'text-ink hover:bg-canvas'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Activity className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      <div className="text-left">
                        <div className="leading-tight">Index Doctor</div>
                        <div className="text-[10px] font-normal text-muted">BigQuery ML Forecasting</div>
                      </div>
                    </div>
                    {current === 'doctor' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-field" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-faint" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSelectTab('validation')}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${current === 'validation'
                        ? 'bg-field-soft text-field'
                        : 'text-ink hover:bg-canvas'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-field" />
                      <div className="text-left">
                        <div className="leading-tight">Evidence & Metrics</div>
                        <div className="text-[10px] font-normal text-muted">Ablation & Responsible AI</div>
                      </div>
                    </div>
                    {current === 'validation' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-field" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-faint" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Contracts & Grounding
                </p>
                <div className="space-y-1">
                  <button
                    onClick={handleSelectPolicy}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-canvas transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <div className="text-left">
                        <div className="leading-tight">Policy Clauses</div>
                        <div className="text-[10px] font-normal text-muted">PMFBY Statutory Binder</div>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-faint" />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-line pt-3 flex items-center justify-between text-[11px] text-muted">
              <span>Mode: <strong className="text-ink capitalize">{theme}</strong></span>
              <button
                onClick={onToggleTheme}
                className="underline hover:text-ink font-semibold"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

