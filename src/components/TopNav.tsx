import React from 'react';
import { Compass, RotateCcw } from 'lucide-react';
import { SimBody } from '../types/physics';

interface TopNavProps {
  bodies: SimBody[];
  selectedBody: SimBody | null;
  onSelectBody: (body: SimBody) => void;
  onOpenSpawner: () => void;
  onOpenMapsVantage: () => void;
  onResetSystem: () => void;
  onSyncRealTimeNow: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  bodies,
  selectedBody,
  onSelectBody,
  onOpenMapsVantage,
  onResetSystem,
}) => {
  const primaryBodies = ['sun', 'earth', 'mars', 'jupiter', 'saturn'];

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-8 px-6 py-2.5 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark in display face */}
      <div className="flex items-center gap-4 shrink-0">
        <a href="/" className="text-sm font-semibold tracking-widest text-slate-100 uppercase whitespace-nowrap shrink-0 hover:text-white transition-colors">
          ORBITAL DYNAMICS
        </a>
        <span className="hidden lg:inline text-xs text-slate-500 font-mono tracking-tight" aria-hidden="true">
          · J2000 ASTRODYNAMICS LABORATORY
        </span>
      </div>

      {/* Zone 2: 4-5 concise single-line nav links with tabular discipline */}
      <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-400">
        {primaryBodies.map(id => {
          const body = bodies.find(b => b.id === id);
          if (!body) return null;
          const isSelected = selectedBody?.id === id;

          return (
            <button
              key={id}
              onClick={() => onSelectBody(body)}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
                isSelected
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-none rotate-45 inline-block shrink-0"
                style={{ backgroundColor: body.color }}
              />
              <span className="capitalize">{body.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onResetSystem}
          title="Reset simulation to default state"
          className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={onOpenMapsVantage}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 shadow-sm"
        >
          <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Google Maps Ephemeris</span>
        </button>
      </div>
    </header>
  );
};
