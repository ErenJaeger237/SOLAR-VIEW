import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Radio,
  Clock,
  Compass,
  Monitor,
  Maximize2,
  Minimize2,
  RefreshCw,
  Orbit,
  Eye
} from 'lucide-react';

interface TopMissionRibbonProps {
  isLeftDrawerOpen: boolean;
  onToggleLeftDrawer: () => void;
  isRightDrawerOpen: boolean;
  onToggleRightDrawer: () => void;
  isCrtScanlines: boolean;
  onToggleCrtScanlines: () => void;
  isCinemaMode: boolean;
  onToggleCinemaMode: () => void;
  onSyncRealTimeNow: () => void;
  simTimeScale: number;
}

export function TopMissionRibbon({
  isLeftDrawerOpen,
  onToggleLeftDrawer,
  isRightDrawerOpen,
  onToggleRightDrawer,
  isCrtScanlines,
  onToggleCrtScanlines,
  isCinemaMode,
  onToggleCinemaMode,
  onSyncRealTimeNow,
  simTimeScale
}: TopMissionRibbonProps) {
  const [utcTime, setUtcTime] = useState<string>('');
  const [julianDate, setJulianDate] = useState<string>('');
  const [gmst, setGmst] = useState<string>('');

  useEffect(() => {
    const updateEpochClocks = () => {
      const now = new Date();
      // UTC String
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));

      // Julian Date Calculation
      const jd = now.getTime() / 86400000.0 + 2440587.5;
      setJulianDate(`JD ${jd.toFixed(4)}`);

      // Greenwich Mean Sidereal Time
      const d = jd - 2451545.0;
      let gmstHours = (18.697374558 + 24.06570982441908 * d) % 24;
      if (gmstHours < 0) gmstHours += 24;
      const h = Math.floor(gmstHours);
      const m = Math.floor((gmstHours - h) * 60);
      const s = Math.floor(((gmstHours - h) * 60 - m) * 60);
      setGmst(`GMST ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    updateEpochClocks();
    const interval = setInterval(updateEpochClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 h-10 bg-[#06100a]/95 border-b border-[#1b4328] backdrop-blur-md px-3 flex items-center justify-between text-xs font-mono select-none">
      {/* 1. Station Identification */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#22c55e]/40 bg-[#0b1c12] text-[#4ade80]">
          <Radio className="w-3.5 h-3.5 text-[#22c55e] animate-pulse" />
          <span className="font-bold tracking-wider">NASA-JSC // APOLLO SPEC</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[#86efac]/80 text-[11px]">
          <span className="text-[#16a34a]">SYS:</span>
          <span className="text-[#4ade80] font-semibold">ASTRODYNAMICS FLIGHT CONSOLE</span>
          <span className="text-[#166534]">|</span>
          <span className="text-[#86efac]/70">VERLET-RK4 SYMPLECTIC</span>
        </div>
      </div>

      {/* 2. Epoch & Time Synchronizers */}
      <div className="hidden md:flex items-center gap-4 text-[11px] tabular-nums">
        <div className="flex items-center gap-1.5 text-[#4ade80]">
          <Clock className="w-3 h-3 text-[#22c55e]" />
          <span>{utcTime || 'UTC 00:00:00'}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[#86efac] border-l border-[#1b4328] pl-3">
          <Compass className="w-3 h-3 text-[#16a34a]" />
          <span className="text-[#4ade80]">{gmst}</span>
        </div>

        <div className="px-2 py-0.2 border border-[#166534] bg-[#07150d] text-[#22c55e] text-[10px] font-semibold">
          {julianDate}
        </div>
      </div>

      {/* 3. Action Toggles & Drawer Switches */}
      <div className="flex items-center gap-1.5">
        {/* JPL Real-Time Ephemeris Sync */}
        <button
          onClick={onSyncRealTimeNow}
          title="Synchronize real-time JPL planetary ephemeris state vectors"
          className="px-2 py-1 flex items-center gap-1 border border-[#1b4328] bg-[#09170f] hover:bg-[#122e1e] text-[#86efac] hover:text-[#4ade80] transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-[#22c55e]" />
          <span className="hidden sm:inline text-[11px]">JPL SYNC</span>
        </button>

        {/* Left Telemetry Drawer Toggle */}
        <button
          onClick={onToggleLeftDrawer}
          title="Toggle Left Astrodynamics Telemetry Drawer (Hohmann, Lagrange, Resonances)"
          className={`px-2 py-1 flex items-center gap-1 border transition-colors ${
            isLeftDrawerOpen
              ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
              : 'border-[#1b4328] bg-[#09170f] text-[#86efac]/70 hover:text-[#86efac]'
          }`}
        >
          <Orbit className="w-3 h-3" />
          <span className="text-[11px] font-bold">[ASTRO DECK]</span>
        </button>

        {/* Right Ephemeris Drawer Toggle */}
        <button
          onClick={onToggleRightDrawer}
          title="Toggle Right Ephemeris Inspector Drawer"
          className={`px-2 py-1 flex items-center gap-1 border transition-colors ${
            isRightDrawerOpen
              ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
              : 'border-[#1b4328] bg-[#09170f] text-[#86efac]/70 hover:text-[#86efac]'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span className="text-[11px] font-bold">[EPHEMERIS]</span>
        </button>

        {/* CRT Scanline Toggle */}
        <button
          onClick={onToggleCrtScanlines}
          title="Toggle CRT Cathode-Ray Tube Phosphor Scanlines"
          className={`p-1 border transition-colors ${
            isCrtScanlines
              ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80]'
              : 'border-[#1b4328] bg-[#09170f] text-[#86efac]/50 hover:text-[#86efac]'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
        </button>

        {/* Cinema / Full-Bleed Mode */}
        <button
          onClick={onToggleCinemaMode}
          title="Toggle Minimal HUD / Cinema Mode (Key: H)"
          className="p-1 border border-[#1b4328] bg-[#09170f] hover:bg-[#122e1e] text-[#86efac] hover:text-[#4ade80] transition-colors"
        >
          {isCinemaMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
