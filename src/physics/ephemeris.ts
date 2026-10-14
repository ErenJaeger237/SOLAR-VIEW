import * as THREE from 'three';

/**
 * Astronomical Ephemeris Calculator using Keplerian Elements.
 * Calculates exact heliocentric ecliptic coordinates (X, Y, Z in AU)
 * and orbital velocity vectors for all major solar system bodies
 * for any given real-world UTC timestamp.
 *
 * Grounded in standard NASA JPL J2000 planetary orbital elements.
 */

interface OrbitalElements {
  a0: number;   // semi-major axis (AU)
  aDot: number; // rate of change per century
  e0: number;   // eccentricity
  eDot: number;
  i0: number;   // inclination (degrees)
  iDot: number;
  L0: number;   // mean longitude (degrees)
  LDot: number;
  w0: number;   // longitude of perihelion (degrees)
  wDot: number;
  node0: number;// longitude of ascending node (degrees)
  nodeDot: number;
}

// NASA JPL orbital elements referenced to J2000.0 epoch (Jan 1, 2000 12:00 TT)
const JPL_ELEMENTS: Record<string, OrbitalElements> = {
  mercury: {
    a0: 0.38709927, aDot: 0.00000037,
    e0: 0.20563593, eDot: 0.00001906,
    i0: 7.00497902, iDot: -0.00594749,
    L0: 252.25032350, LDot: 149472.67411175,
    w0: 77.45779628, wDot: 0.16047689,
    node0: 48.33076593, nodeDot: -0.12534081
  },
  venus: {
    a0: 0.72333566, aDot: 0.00000390,
    e0: 0.00677672, eDot: -0.00004107,
    i0: 3.39467605, iDot: -0.00078890,
    L0: 181.97909950, LDot: 58517.81538729,
    w0: 131.60246718, wDot: 0.00268329,
    node0: 76.67984255, nodeDot: -0.27769418
  },
  earth: {
    a0: 1.00000261, aDot: 0.00000562,
    e0: 0.01671123, eDot: -0.00004392,
    i0: -0.00001531, iDot: -0.01294668,
    L0: 100.46457166, LDot: 35999.37244981,
    w0: 102.93768193, wDot: 0.32327364,
    node0: 0.0, nodeDot: 0.0
  },
  mars: {
    a0: 1.52371034, aDot: 0.00001847,
    e0: 0.09339410, eDot: 0.00007882,
    i0: 1.84969142, iDot: -0.00813131,
    L0: -4.55343205, LDot: 19140.30268499,
    w0: -23.94362959, wDot: 0.44441088,
    node0: 49.55953891, nodeDot: -0.29257343
  },
  jupiter: {
    a0: 5.20288700, aDot: -0.00011607,
    e0: 0.04838624, eDot: -0.00013253,
    i0: 1.30439695, iDot: -0.00183714,
    L0: 34.39644051, LDot: 3034.74612775,
    w0: 14.72847983, wDot: 0.21252668,
    node0: 100.47390909, nodeDot: 0.20469106
  },
  saturn: {
    a0: 9.53667594, aDot: -0.00125060,
    e0: 0.05386179, eDot: -0.00050991,
    i0: 2.48599187, iDot: 0.00193609,
    L0: 49.95424423, LDot: 1222.49362201,
    w0: 92.59887831, wDot: -0.41897216,
    node0: 113.66242448, nodeDot: -0.28867794
  },
  uranus: {
    a0: 19.18916464, aDot: -0.00196176,
    e0: 0.04725744, eDot: -0.00004397,
    i0: 0.77263783, iDot: -0.00242939,
    L0: 313.23810451, LDot: 428.48202785,
    w0: 170.95427630, wDot: 0.40805281,
    node0: 74.01692503, nodeDot: 0.04240589
  },
  neptune: {
    a0: 30.06992276, aDot: 0.00026291,
    e0: 0.00859048, eDot: 0.00005105,
    i0: 1.77004347, iDot: 0.00035372,
    L0: -55.12002969, LDot: 218.45945325,
    w0: 44.96476224, wDot: -0.32241464,
    node0: 131.78422574, nodeDot: -0.00508664
  },
  pluto: {
    a0: 39.48211675, aDot: -0.00031596,
    e0: 0.24882730, eDot: 0.00005170,
    i0: 17.14001206, iDot: 0.00004818,
    L0: 238.92903833, LDot: 145.20780515,
    w0: 224.06891629, wDot: -0.04062942,
    node0: 110.30393608, nodeDot: -0.01183482
  }
};

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Solve Kepler's Equation M = E - e*sin(E) for Eccentric Anomaly E (in radians)
 */
function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 15; i++) {
    const deltaE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += deltaE;
    if (Math.abs(deltaE) < 1e-7) break;
  }
  return E;
}

export interface EphemerisPosition {
  id: string;
  heliocentricAU: { x: number; y: number; z: number };
  simulationCoords: { x: number; y: number; z: number };
  velocityUnit: { x: number; y: number; z: number };
  distanceAU: number;
}

/**
 * Computes exact heliocentric 3D position and velocity vector for any planet at a specific Date.
 */
export function calculatePlanetEphemeris(
  planetId: string,
  date: Date = new Date()
): EphemerisPosition | null {
  const elem = JPL_ELEMENTS[planetId];
  if (!elem) return null;

  // Julian date calculation
  const time = date.getTime();
  const JD = time / 86400000 + 2440587.5;
  // Julian centuries since J2000.0 (JD 2451545.0)
  const T = (JD - 2451545.0) / 36525.0;

  // Compute instantaneous elements
  const a = elem.a0 + elem.aDot * T;
  const e = elem.e0 + elem.eDot * T;
  const I = (elem.i0 + elem.iDot * T) * DEG2RAD;
  const L = ((elem.L0 + elem.LDot * T) % 360) * DEG2RAD;
  const w = ((elem.w0 + elem.wDot * T) % 360) * DEG2RAD;
  const Omega = ((elem.node0 + elem.nodeDot * T) % 360) * DEG2RAD;

  const omega = w - Omega; // Argument of perihelion
  let M = (L - w) % (Math.PI * 2); // Mean anomaly
  if (M < 0) M += Math.PI * 2;

  // Solve for Eccentric Anomaly E
  const E = solveKepler(M, e);

  // Heliocentric coordinates in orbital plane
  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Transform orbital plane to J2000 Ecliptic frame
  const cosOmega = Math.cos(Omega);
  const sinOmega = Math.sin(Omega);
  const cosOmegaLittle = Math.cos(omega);
  const sinOmegaLittle = Math.sin(omega);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  const Px = cosOmega * cosOmegaLittle - sinOmega * sinOmegaLittle * cosI;
  const Py = sinOmega * cosOmegaLittle + cosOmega * sinOmegaLittle * cosI;
  const Pz = sinOmegaLittle * sinI;

  const Qx = -cosOmega * sinOmegaLittle - sinOmega * cosOmegaLittle * cosI;
  const Qy = -sinOmega * sinOmegaLittle + cosOmega * cosOmegaLittle * cosI;
  const Qz = cosOmegaLittle * sinI;

  const xEcliptic = xPrime * Px + yPrime * Qx;
  const yEcliptic = xPrime * Py + yPrime * Qy;
  const zEcliptic = xPrime * Pz + yPrime * Qz;

  const distAU = Math.sqrt(xEcliptic * xEcliptic + yEcliptic * yEcliptic + zEcliptic * zEcliptic);

  // Scaled coordinates for simulation viewport
  // In our engine, 1 AU = 100 units. For outer planets (>5 AU), apply gentle logarithmic dampening so they fit gracefully
  let simDist: number;
  if (distAU <= 2.0) {
    simDist = distAU * 105;
  } else {
    simDist = 210 + Math.pow(distAU, 0.65) * 65;
  }
  const scale = simDist / distAU;

  const simX = xEcliptic * scale;
  const simY = zEcliptic * scale * 0.4; // z in astronomical ecliptic is height
  const simZ = yEcliptic * scale;

  // Tangential velocity vector
  const vMag = Math.sqrt(1200.0 / Math.max(simDist, 10)); // simulated orbital speed
  const rVec = new THREE.Vector3(simX, simY, simZ).normalize();
  const normal = new THREE.Vector3(0, 1, 0);
  const velVec = new THREE.Vector3().crossVectors(normal, rVec).multiplyScalar(vMag);

  return {
    id: planetId,
    heliocentricAU: { x: xEcliptic, y: yEcliptic, z: zEcliptic },
    simulationCoords: { x: simX, y: simY, z: simZ },
    velocityUnit: { x: velVec.x, y: velVec.y, z: velVec.z },
    distanceAU: distAU
  };
}

export interface TopocentricVantage {
  planetId: string;
  name: string;
  distanceAU: number;
  distanceMillionKm: number;
  lightTimeMinutes: number;
  altitudeDeg: number;       // Elevation angle above horizon (-90° to +90°)
  azimuthDeg: number;        // Compass bearing (0° = N, 90° = E, 180° = S, 270° = W)
  cardinalBearing: string;   // e.g. "SSE", "NW"
  isVisible: boolean;        // true if above local horizon (> 0°)
  rightAscensionHours: number; // α in hours (0h - 24h)
  declinationDeg: number;    // δ in degrees
}

const CARDINALS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

function getCardinalDirection(azimuthDeg: number): string {
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return CARDINALS[index];
}

/**
 * Calculates the exact topocentric horizontal position (Altitude & Azimuth)
 * for a celestial body as observed from a specific Google Maps geographical position
 * (latitude, longitude) at a specific instant in time.
 */
export function calculateTopocentricCoordinates(
  planetId: string,
  date: Date,
  latitudeDeg: number,
  longitudeDeg: number
): TopocentricVantage | null {
  const earthEphem = calculatePlanetEphemeris('earth', date);
  if (!earthEphem) return null;

  let targetX = 0;
  let targetY = 0;
  let targetZ = 0;
  let bodyName = 'Sun';

  if (planetId.toLowerCase() === 'sun') {
    targetX = 0;
    targetY = 0;
    targetZ = 0;
    bodyName = 'Sun';
  } else {
    const targetEphem = calculatePlanetEphemeris(planetId, date);
    if (!targetEphem) return null;
    targetX = targetEphem.heliocentricAU.x;
    targetY = targetEphem.heliocentricAU.y;
    targetZ = targetEphem.heliocentricAU.z;
    bodyName = planetId.charAt(0).toUpperCase() + planetId.slice(1);
  }

  // Geocentric vector (AU)
  const dX = targetX - earthEphem.heliocentricAU.x;
  const dY = targetY - earthEphem.heliocentricAU.y;
  const dZ = targetZ - earthEphem.heliocentricAU.z;
  const deltaAU = Math.sqrt(dX * dX + dY * dY + dZ * dZ);

  // Earth obliquity of ecliptic J2000 ~ 23.4392911 degrees
  const eps = 23.4392911 * DEG2RAD;
  const cosEps = Math.cos(eps);
  const sinEps = Math.sin(eps);

  // Convert Ecliptic (dX, dY, dZ) to Equatorial (Xeq, Yeq, Zeq)
  const Xeq = dX;
  const Yeq = dY * cosEps - dZ * sinEps;
  const Zeq = dY * sinEps + dZ * cosEps;

  // Right Ascension α (radians) and Declination δ (radians)
  let ra = Math.atan2(Yeq, Xeq);
  if (ra < 0) ra += Math.PI * 2;
  const dec = Math.asin(Math.max(-1, Math.min(1, Zeq / Math.max(deltaAU, 1e-6))));

  // Greenwich Mean Sidereal Time (GMST)
  const time = date.getTime();
  const JD = time / 86400000 + 2440587.5;
  const D = JD - 2451545.0;
  let gmstHours = (18.697374558 + 24.06570982441908 * D) % 24;
  if (gmstHours < 0) gmstHours += 24;

  const gmstRad = (gmstHours / 24) * Math.PI * 2;
  const lstRad = (gmstRad + longitudeDeg * DEG2RAD) % (Math.PI * 2);

  // Local Hour Angle H = LST - RA
  let H = lstRad - ra;
  while (H < -Math.PI) H += Math.PI * 2;
  while (H > Math.PI) H -= Math.PI * 2;

  // Horizontal coordinates
  const phi = latitudeDeg * DEG2RAD;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const altDeg = altRad * RAD2DEG;

  // Azimuth
  const sinAz = -Math.cos(dec) * Math.sin(H);
  const cosAz = (Math.sin(dec) - Math.sin(phi) * sinAlt) / Math.max(Math.cos(altRad) * Math.cos(phi), 1e-7);
  let azRad = Math.atan2(sinAz, cosAz);
  let azDeg = (azRad * RAD2DEG + 360) % 360;

  const distMillionKm = deltaAU * 149.59787;
  const lightTimeSeconds = (deltaAU * 149597870.7) / 299792.458;

  return {
    planetId,
    name: bodyName,
    distanceAU: deltaAU,
    distanceMillionKm: distMillionKm,
    lightTimeMinutes: lightTimeSeconds / 60,
    altitudeDeg: altDeg,
    azimuthDeg: azDeg,
    cardinalBearing: getCardinalDirection(azDeg),
    isVisible: altDeg > 0,
    rightAscensionHours: (ra * RAD2DEG) / 15,
    declinationDeg: dec * RAD2DEG
  };
}
