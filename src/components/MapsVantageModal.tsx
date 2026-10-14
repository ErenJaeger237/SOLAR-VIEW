import React, { useState, useEffect } from 'react';
import {
  X,
  Compass,
  Navigation,
  ExternalLink,
  Loader2,
  Check,
  RotateCw,
  Search
} from 'lucide-react';
import { calculateTopocentricCoordinates, TopocentricVantage } from '../physics/ephemeris';

interface MapsVantageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncRealTimeEphemeris: (date?: Date) => void;
}

interface GroundingChunk {
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: { text: string }[];
    };
  };
  web?: {
    uri: string;
    title: string;
  };
}

interface ObservatoryPreset {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
}

const PREMIER_OBSERVATORIES: ObservatoryPreset[] = [
  { id: 'mauna-kea', name: 'Mauna Kea Observatory', lat: 19.8230, lng: -155.4694, country: 'Hawaii, USA' },
  { id: 'alma', name: 'ALMA Observatory', lat: -23.0290, lng: -67.7550, country: 'Atacama, Chile' },
  { id: 'roque', name: 'Roque de los Muchachos', lat: 28.7566, lng: -17.8920, country: 'Canary Islands, Spain' },
  { id: 'palomar', name: 'Palomar Observatory', lat: 33.3563, lng: -116.8647, country: 'California, USA' },
  { id: 'greenwich', name: 'Royal Observatory Greenwich', lat: 51.4769, lng: -0.0005, country: 'London, UK' },
  { id: 'griffith', name: 'Griffith Observatory', lat: 34.1184, lng: -118.3004, country: 'Los Angeles, USA' }
];

const TRACKED_PLANETS = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

export const MapsVantageModal: React.FC<MapsVantageModalProps> = ({
  isOpen,
  onClose,
  onSyncRealTimeEphemeris
}) => {
  if (!isOpen) return null;

  const [locationName, setLocationName] = useState('Mauna Kea Observatory, Hawaii');
  const [latitude, setLatitude] = useState(19.8230);
  const [longitude, setLongitude] = useState(-155.4694);
  const [loading, setLoading] = useState(false);
  const [groundingReport, setGroundingReport] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [syncedSuccess, setSyncedSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [vantageData, setVantageData] = useState<TopocentricVantage[]>([]);

  // Update ephemeris calculations whenever location or time changes
  useEffect(() => {
    const now = new Date();
    setCurrentTime(now);
    const results: TopocentricVantage[] = [];
    for (const pid of TRACKED_PLANETS) {
      const data = calculateTopocentricCoordinates(pid, now, latitude, longitude);
      if (data) results.push(data);
    }
    setVantageData(results);
  }, [latitude, longitude]);

  const handleSelectPreset = (preset: ObservatoryPreset) => {
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setLocationName(`${preset.name}, ${preset.country}`);
  };

  const fetchMapsGrounding = async () => {
    setLoading(true);
    setGroundingReport(null);
    setGroundingChunks([]);

    try {
      const res = await fetch('/api/sky-vantage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          locationName
        })
      });

      const data = await res.json();
      if (data.success) {
        setGroundingReport(data.text);
        setGroundingChunks(data.groundingChunks || []);
      } else {
        setGroundingReport('Unable to query Google Maps places for this coordinate. Numerical topocentric calculations remain fully accurate above.');
      }
    } catch {
      setGroundingReport('Google Maps grounding service offline. Astronomical calculations above remain active.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          setLocationName(`Current GPS (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`);
        },
        _err => {
          // GPS unavailable, keep current
        }
      );
    }
  };

  const handleSyncToScene = () => {
    onSyncRealTimeEphemeris(currentTime);
    setSyncedSuccess(true);
    setTimeout(() => setSyncedSuccess(false), 3000);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-lg shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header: Exact Title and Metadata */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div>
            <h2 className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400 stroke-[2.2]" />
              <span>Google Maps Astrometric Ephemeris</span>
            </h2>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
              <span>NASA JPL J2000 Ephemeris</span>
              <span aria-hidden="true">·</span>
              <span>Topocentric Altitude &amp; Azimuth</span>
              <span aria-hidden="true">·</span>
              <span>UTC {currentTime.toISOString().slice(11, 19)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Close Ephemeris Station"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Explanation Callout: Connecting Google Maps Coordinates to Instantaneous Planetary Positions */}
          <div className="p-4 rounded bg-slate-900/70 border border-slate-800 text-xs">
            <h3 className="font-semibold text-slate-200 mb-1">
              How Google Maps Data Determines Exact Planetary Positions At This Instant
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Google Maps provides precise terrestrial geodetic coordinates (latitude <span className="font-mono text-slate-200">{latitude.toFixed(4)}°</span>, longitude <span className="font-mono text-slate-200">{longitude.toFixed(4)}°</span>). Combined with Greenwich Mean Sidereal Time (GMST) and NASA JPL orbital vectors, this station computes where every planet sits relative to your horizon (<span className="text-cyan-300 font-semibold">Altitude</span>: angle above ground) and compass direction (<span className="text-cyan-300 font-semibold">Azimuth</span>: degrees from True North) at this exact second.
            </p>
          </div>

          {/* Location Vantage Controls & Presets */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Observer Vantage Point
              </span>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={handleUseGPS}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                  <span>My Device GPS</span>
                </button>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open in Google Maps</span>
                </a>
              </div>
            </div>

            {/* Quick Premier Observatory Selection */}
            <div className="flex flex-wrap gap-1.5">
              {PREMIER_OBSERVATORIES.map(p => {
                const isSelected = Math.abs(p.lat - latitude) < 0.01 && Math.abs(p.lng - longitude) < 0.01;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors font-mono ${
                      isSelected
                        ? 'bg-slate-800 text-cyan-300 border border-slate-700 font-semibold'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* Manual Coordinate Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div>
                <label className="text-[10px] uppercase text-slate-500 block mb-1">Vantage Label</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-500 block mb-1">Latitude (°N / -°S)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={e => setLatitude(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-slate-700 tabular-nums"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-500 block mb-1">Longitude (°E / -°W)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={e => setLongitude(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-slate-700 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Sync 3D Simulation Action Strip */}
          <div className="p-3.5 rounded bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Synchronize 3D Orrery To Real Time
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Sets all 3D planets to their exact NASA J2000 heliocentric coordinates for {currentTime.toUTCString()}
              </div>
            </div>

            <button
              onClick={handleSyncToScene}
              className={`px-4 py-2 rounded text-xs font-semibold transition-colors flex items-center gap-2 shrink-0 ${
                syncedSuccess
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm'
              }`}
            >
              {syncedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>3D Orrery Synchronized</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-4 h-4 stroke-[2.5]" />
                  <span>Align 3D Orrery Now</span>
                </>
              )}
            </button>
          </div>

          {/* Topocentric Horizon Radar and Sky Dome Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* SVG Sky Dome Radar (Left 5 Cols) */}
            <div className="lg:col-span-5 flex flex-col items-center p-4 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2">
                Local Sky Horizon Dome (360° Azimuth)
              </span>

              <div className="relative w-64 h-64">
                <svg viewBox="-120 -120 240 240" className="w-full h-full">
                  {/* Outer circle: Local Horizon (Alt = 0°) */}
                  <circle cx="0" cy="0" r="100" fill="#090D16" stroke="#334155" strokeWidth="1.5" />
                  {/* Middle circle: Alt = 30° */}
                  <circle cx="0" cy="0" r="66" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
                  {/* Inner circle: Alt = 60° */}
                  <circle cx="0" cy="0" r="33" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
                  {/* Center dot: Zenith (Alt = 90°) */}
                  <circle cx="0" cy="0" r="2" fill="#06B6D4" />

                  {/* Cardinal Crosshairs */}
                  <line x1="0" y1="-100" x2="0" y2="100" stroke="#1E293B" strokeWidth="1" />
                  <line x1="-100" y1="0" x2="100" y2="0" stroke="#1E293B" strokeWidth="1" />

                  {/* Cardinal Labels */}
                  <text x="0" y="-105" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">N</text>
                  <text x="108" y="3" textAnchor="start" fill="#94A3B8" fontSize="9" fontFamily="monospace">E</text>
                  <text x="0" y="113" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">S</text>
                  <text x="-108" y="3" textAnchor="end" fill="#94A3B8" fontSize="9" fontFamily="monospace">W</text>

                  {/* Plot planets on radar */}
                  {vantageData.map(p => {
                    if (p.planetId === 'earth') return null;
                    // Map altitude [0, 90] to radial distance [100, 0]
                    const isVisible = p.altitudeDeg > 0;
                    const r = isVisible
                      ? Math.max(5, (90 - p.altitudeDeg) / 90 * 100)
                      : 105; // Outside horizon ring if below ground

                    // Azimuth 0 is North (-Y), 90 is East (+X)
                    const azRad = (p.azimuthDeg - 90) * (Math.PI / 180);
                    const cx = r * Math.cos(azRad);
                    const cy = r * Math.sin(azRad);

                    return (
                      <g key={p.planetId}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isVisible ? 4.5 : 3}
                          fill={isVisible ? '#06B6D4' : '#475569'}
                          stroke={isVisible ? '#FFFFFF' : '#334155'}
                          strokeWidth="1"
                        />
                        <text
                          x={cx + 6}
                          y={cy + 3}
                          fill={isVisible ? '#F1F5F9' : '#64748B'}
                          fontSize="8"
                          fontFamily="monospace"
                        >
                          {p.name.slice(0, 4)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-none rotate-45 bg-cyan-400 inline-block" />
                  <span>Above Horizon (Visible)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-none rotate-45 bg-slate-600 inline-block" />
                  <span>Below Horizon</span>
                </div>
              </div>
            </div>

            {/* Ephemeris Table (Right 7 Cols) */}
            <div className="lg:col-span-7 overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-800 border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                    <th className="py-2 px-3">Celestial Body</th>
                    <th className="py-2 px-3">Local Horizon Status</th>
                    <th className="py-2 px-3 text-right">Altitude (Alt)</th>
                    <th className="py-2 px-3 text-right">Azimuth (Az)</th>
                    <th className="py-2 px-3 text-right">Distance (AU)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-[11px] tabular-nums">
                  {vantageData.map(p => {
                    return (
                      <tr key={p.planetId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-200 capitalize">
                          {p.name}
                        </td>
                        <td className="py-2 px-3">
                          {p.isVisible ? (
                            <span className="text-cyan-400 flex items-center gap-1">
                              <span>●</span>
                              <span>Visible ({p.altitudeDeg.toFixed(1)}°)</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 flex items-center gap-1">
                              <span>○</span>
                              <span>Below Horizon</span>
                            </span>
                          )}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold ${p.isVisible ? 'text-slate-100' : 'text-slate-500'}`}>
                          {p.altitudeDeg > 0 ? `+${p.altitudeDeg.toFixed(1)}°` : `${p.altitudeDeg.toFixed(1)}°`}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">
                          {p.azimuthDeg.toFixed(1)}° {p.cardinalBearing}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {p.distanceAU.toFixed(3)} AU
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Google Maps Grounding & Nearby Observatories Query */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">
                  Google Maps Observatories &amp; Dark Sky Grounding
                </h4>
                <p className="text-[11px] text-slate-400">
                  Search nearby verified observatories, planetariums, and viewing spots around these coordinates
                </p>
              </div>

              <button
                onClick={fetchMapsGrounding}
                disabled={loading}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5 text-cyan-400" />}
                <span>Scan Google Maps Places</span>
              </button>
            </div>

            {loading && (
              <div className="p-6 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Querying Google Maps grounding service for nearby astronomical facilities...</span>
              </div>
            )}

            {groundingReport && !loading && (
              <div className="p-4 rounded bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-3 leading-relaxed">
                <div className="whitespace-pre-line text-slate-300 font-sans">
                  {groundingReport}
                </div>

                {groundingChunks.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-2">
                      Verified Google Maps Places:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {groundingChunks.map((chunk, idx) => {
                        if (!chunk.maps) return null;
                        return (
                          <a
                            key={idx}
                            href={chunk.maps.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 text-cyan-300 hover:text-cyan-200 transition-colors flex items-center gap-1.5 font-mono text-[11px]"
                          >
                            <span>{chunk.maps.title}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
