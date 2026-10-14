import React from 'react';
import { Flame, X } from 'lucide-react';
import { CollisionEventData } from '../physics/nbodyEngine';

interface CollisionToastProps {
  event: CollisionEventData | null;
  onDismiss: () => void;
}

export const CollisionToast: React.FC<CollisionToastProps> = ({ event, onDismiss }) => {
  if (!event) return null;

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-40 max-w-md w-full px-4 animate-in fade-in duration-200 font-mono select-none">
      <div className="bg-[#0b140d]/95 border border-[#f59e0b] p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-[#fef08a] text-glow-amber">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#261c06] border border-[#f59e0b]/50 flex items-center justify-center text-[#f59e0b] shrink-0">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#fef08a] flex items-center gap-2 uppercase tracking-wide">
              <span>Orbital Inelastic Collision Event</span>
              <span className="text-[10px] text-[#f59e0b] tabular-nums">
                &Delta;v = {event.impactVelocity.toFixed(1)} km/s
              </span>
            </div>
            <div className="text-[11px] text-[#86efac]/80 tabular-nums">
              <span className="text-[#4ade80] font-bold">{event.primaryBody.name}</span> merged with{' '}
              <span className="text-[#86efac]">{event.absorbedBodyName}</span> &middot; Final Mass:{' '}
              <span className="tabular-nums font-semibold">{event.newMass.toFixed(3)} M_sim</span>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 text-[#f59e0b] hover:text-[#fef08a] hover:bg-[#261c06] border border-[#f59e0b]/40 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
