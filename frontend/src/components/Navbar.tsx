import React from 'react';
import { ActiveTab } from '../App';

interface NavbarProps {
  current: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onOpenPolicy: () => void;
  persona: 'farmer' | 'insurer';
  onPersonaChange: (p: 'farmer' | 'insurer') => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const ITEMS: { tab: ActiveTab; label: string }[] = [
  { tab: 'landing', label: 'Overview' },
  { tab: 'doctor', label: 'Index Doctor' },
  { tab: 'validation', label: 'Evidence & Metrics' },
];

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="7" fill="#10B981" />
    <rect x="7" y="17" width="4" height="8" rx="1" fill="#FDE047" />
    <rect x="14" y="11" width="4" height="14" rx="1" fill="#fff" />
    <rect x="21" y="7" width="4" height="18" rx="1" fill="#fff" />
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
}) => (
  <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md transition-colors duration-200">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-6">
        <button onClick={() => onNavigate('landing')} className="flex shrink-0 items-center gap-2.5" aria-label="FieldProof home">
          <Logo />
          <div className="text-left">
            <span className="font-display text-lg font-bold tracking-tight text-ink block leading-none">FieldProof</span>
            <span className="text-[10px] text-muted font-medium tracking-wide uppercase">JAPAC Agri-Parametric</span>
          </div>
        </button>

        <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
          {ITEMS.map(({ tab, label }) => {
            const active = current === tab;
            return (
              <button
                key={tab}
                onClick={() => onNavigate(tab)}
                aria-current={active ? 'page' : undefined}
                className={`relative px-3 py-5 text-sm font-medium transition-colors ${
                  active ? 'text-ink font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
                {active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-field" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* 1-Click Persona Switcher */}
        <div className="flex items-center rounded-lg border border-line bg-sunk/60 p-1 text-xs font-semibold">
          <button
            onClick={() => {
              onPersonaChange('farmer');
              onNavigate('farmer');
            }}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-all ${
              persona === 'farmer'
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
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-all ${
              persona === 'insurer'
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
            <svg className="h-4 w-4 text-bloom" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <button onClick={onOpenPolicy} className="hidden sm:block text-xs font-semibold text-muted hover:text-ink border border-line rounded-lg px-2.5 py-1.5 bg-surface">
          Policy Clauses
        </button>
      </div>
    </div>

    {/* Mobile: horizontal scrollable tabs */}
    <nav aria-label="Main" className="scroll-thin flex gap-1 overflow-x-auto border-t border-line px-3 lg:hidden bg-surface/50">
      {ITEMS.map(({ tab, label }) => {
        const active = current === tab;
        return (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            aria-current={active ? 'page' : undefined}
            className={`relative shrink-0 px-3 py-2.5 text-xs font-medium ${active ? 'text-ink font-semibold' : 'text-muted'}`}
          >
            {label}
            {active && <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-t bg-field" />}
          </button>
        );
      })}
    </nav>
  </header>
);
