import React from 'react';
import { ActiveTab } from '../App';

interface NavbarProps {
  current: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onOpenPolicy: () => void;
}

const ITEMS: { tab: ActiveTab; label: string }[] = [
  { tab: 'landing', label: 'How it works' },
  { tab: 'farmer', label: 'Farmer' },
  { tab: 'insurer', label: 'Claims' },
  { tab: 'doctor', label: 'Index Doctor' },
  { tab: 'validation', label: 'Results' },
];

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="7" fill="#1F5E3B" />
    <rect x="7" y="17" width="4" height="8" rx="1" fill="#F2DD8C" />
    <rect x="14" y="11" width="4" height="14" rx="1" fill="#fff" />
    <rect x="21" y="7" width="4" height="18" rx="1" fill="#fff" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({ current, onNavigate, onOpenPolicy }) => (
  <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 lg:px-8">
      <button onClick={() => onNavigate('landing')} className="flex shrink-0 items-center gap-2.5" aria-label="FieldProof home">
        <Logo />
        <span className="font-display text-lg font-semibold tracking-tight">FieldProof</span>
      </button>

      <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
        {ITEMS.map(({ tab, label }) => {
          const active = current === tab;
          return (
            <button
              key={tab}
              onClick={() => onNavigate(tab)}
              aria-current={active ? 'page' : undefined}
              className={`relative px-3 py-5 text-sm font-medium transition-colors ${
                active ? 'text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {label}
              {active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-field" />}
            </button>
          );
        })}
      </nav>

      <button onClick={onOpenPolicy} className="ml-auto hidden text-sm font-medium text-muted hover:text-ink lg:block">
        Policy and payout rule
      </button>
    </div>

    {/* Mobile: a scrollable row of tabs under the logo */}
    <nav aria-label="Main" className="scroll-thin flex gap-1 overflow-x-auto border-t border-line px-3 md:hidden">
      {ITEMS.map(({ tab, label }) => {
        const active = current === tab;
        return (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            aria-current={active ? 'page' : undefined}
            className={`relative shrink-0 px-3 py-3 text-sm font-medium ${active ? 'text-ink' : 'text-muted'}`}
          >
            {label}
            {active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-field" />}
          </button>
        );
      })}
    </nav>
  </header>
);
