import * as THREE from 'three';
import { SimBody } from '../types/physics';
import { SIM_G, SUN_MASS } from './constants';

export interface HohmannResult {
  departureBody: string;
  arrivalBody: string;
  r1_AU: number;
  r2_AU: number;
  r1_km: number;
  r2_km: number;
  semiMajorAxisAU: number;
  semiMajorAxisKm: number;
  deltaV1_km_s: number;
  deltaV2_km_s: number;
  deltaVTotal_km_s: number;
  deltaV1_sim: number;
  deltaV2_sim: number;
  deltaVTotal_sim: number;
  timeOfFlightDays: number;
  timeOfFlightMonths: number;
  phaseAngleLeadDeg: number;
  synodicPeriodDays: number;
  orbitArcPoints: THREE.Vector3[];
  departurePos: THREE.Vector3;
  arrivalPos: THREE.Vector3;
}

export interface LagrangePointInfo {
  id: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  name: string;
  positionAU: THREE.Vector3;
  positionKm: THREE.Vector3;
  simPosition: THREE.Vector3;
  distanceFromSecondaryAU: number;
  stability: 'Collinear Unstable (Halo / Lissajous)' | 'Collinear Unstable (Saddle)' | 'Triangular Stable (Coriolis Potential Well)';
  description: string;
  famousMissions: string;
}

export interface LagrangeSystemResult {
  primaryName: string;
  secondaryName: string;
  massRatio: number; // m2 / (m1 + m2)
  separationAU: number;
  separationKm: number;
  hillSphereRadiusAU: number;
  hillSphereRadiusKm: number;
  jacobiConstantApprox: number;
  points: LagrangePointInfo[];
}

export type StabilityZoneType =
  | 'BOUND_SECONDARY'     // Inside Roche lobe / Hill sphere (unconditionally trapped)
  | 'TROJAN_L4_L5'        // Coriolis-stabilized L4/L5 triangular potential well
  | 'HELIOCENTRIC_STABLE' // Quasi-periodic stable Keplerian orbit
  | 'GATEWAY_L1_L2'       // Low-energy gateway / zero-velocity neck (saddle corridor)
  | 'CHAOTIC_TRANSITION'  // Chaotic horseshoe / cross-orbit transition
  | 'TIDAL_DISRUPTION';   // Deep gravitational abyss / collision boundary

export interface JacobiCriticalValues {
  C_L1: number;
  C_L2: number;
  C_L3: number;
  C_L4: number; // = C_L5
  hillRadiusAU: number;
  hillRadiusSim: number;
  massParameterMu: number;
  primaryName: string;
  secondaryName: string;
}

export interface JacobiPointSample {
  xAU: number;
  zAU: number;
  xSim: number;
  zSim: number;
  jacobiConstant: number;
  effectivePotential: number;
  stabilityZone: StabilityZoneType;
  stabilityLabel: string;
  stabilityRank: 'MAXIMUM_STABLE' | 'TROJAN_STABLE' | 'KEPLER_STABLE' | 'TRANSIT_GATEWAY' | 'CHAOTIC_SADDLE' | 'GRAV_ABYSS';
  colorHex: string;
  velocityBarrierKmS: number;
  distToPrimaryAU: number;
  distToSecondaryAU: number;
  description: string;
}

export interface ResonancePair {
  body1: string;
  body2: string;
  period1Days: number;
  period2Days: number;
  exactRatio: number; // T2 / T1
  harmonicRatio: string; // "p:q"
  p: number;
  q: number;
  deviationPercent: number;
  isConfirmedResonance: boolean;
  classification: string;
  notes: string;
}

export interface ClassicalOrbitalElements {
  semiMajorAxisAU: number;
  semiMajorAxisKm: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPeriapsisDeg: number;
  trueAnomalyDeg: number;
  perihelionAU: number;
  aphelionAU: number;
  specificOrbitalEnergy: number; // km^2 / s^2
  angularMomentum: number; // km^2 / s
  visVivaSpeedKmS: number;
  currentRadiusAU: number;
}

export interface TopocentricCoordinates {
  azimuthDeg: number;
  elevationDeg: number;
  localSiderealTimeHours: number;
  greenwichSiderealTimeHours: number;
  rightAscensionHours: number;
  declinationDeg: number;
  distanceAU: number;
  distanceKm: number;
  isVisibleAboveHorizon: boolean;
}

// 1 AU in kilometers
export const AU_IN_KM = 149597870.7;

// Astronomical heliocentric gravitational parameter (km^3 / s^2)
export const MU_SUN_KM = 1.32712440018e11;

/**
 * Analytical Hohmann Transfer Calculator
 */
export function calculateHohmannTransfer(
  departureBody: SimBody,
  arrivalBody: SimBody,
  simG: number = SIM_G,
  sunMass: number = SUN_MASS
): HohmannResult {
  const depPos = departureBody.position;
  const arrPos = arrivalBody.position;

  // Distances from origin (Sun)
  const r1_sim = Math.max(1.0, depPos.length());
  const r2_sim = Math.max(1.0, arrPos.length());

  // Convert to AU assuming Earth ~ 110 simulation units = 1.0 AU
  const SIM_UNITS_PER_AU = 110.0;
  const r1_AU = r1_sim / SIM_UNITS_PER_AU;
  const r2_AU = r2_sim / SIM_UNITS_PER_AU;
  const r1_km = r1_AU * AU_IN_KM;
  const r2_km = r2_AU * AU_IN_KM;

  const a_trans_AU = (r1_AU + r2_AU) / 2.0;
  const a_trans_km = a_trans_AU * AU_IN_KM;

  // Real SI orbital velocities
  const v1_circ = Math.sqrt(MU_SUN_KM / r1_km);
  const v2_circ = Math.sqrt(MU_SUN_KM / r2_km);

  const v_trans_dep = Math.sqrt(MU_SUN_KM * (2.0 / r1_km - 1.0 / a_trans_km));
  const v_trans_arr = Math.sqrt(MU_SUN_KM * (2.0 / r2_km - 1.0 / a_trans_km));

  const deltaV1_km_s = Math.abs(v_trans_dep - v1_circ);
  const deltaV2_km_s = Math.abs(v2_circ - v_trans_arr);
  const deltaVTotal_km_s = deltaV1_km_s + deltaV2_km_s;

  // Simulation unit delta V
  const simMu = simG * sunMass;
  const a_trans_sim = (r1_sim + r2_sim) / 2.0;
  const v1_circ_sim = Math.sqrt(simMu / r1_sim);
  const v2_circ_sim = Math.sqrt(simMu / r2_sim);
  const v_trans_dep_sim = Math.sqrt(simMu * (2.0 / r1_sim - 1.0 / a_trans_sim));
  const v_trans_arr_sim = Math.sqrt(simMu * (2.0 / r2_sim - 1.0 / a_trans_sim));

  const deltaV1_sim = Math.abs(v_trans_dep_sim - v1_circ_sim);
  const deltaV2_sim = Math.abs(v2_circ_sim - v_trans_arr_sim);
  const deltaVTotal_sim = deltaV1_sim + deltaV2_sim;

  // Time of flight (half orbital period of transfer ellipse)
  // TOF = pi * sqrt(a^3 / mu)
  const tofSeconds = Math.PI * Math.sqrt(Math.pow(a_trans_km, 3) / MU_SUN_KM);
  const timeOfFlightDays = tofSeconds / (24 * 3600);
  const timeOfFlightMonths = timeOfFlightDays / 30.4375;

  // Phase angle required at departure (lead angle)
  // omega2 * TOF - pi
  const omega2 = Math.sqrt(MU_SUN_KM / Math.pow(r2_km, 3));
  let phaseAngleRad = omega2 * tofSeconds - Math.PI;
  // Normalize to 0 .. 2pi then to degrees
  while (phaseAngleRad < 0) phaseAngleRad += 2 * Math.PI;
  phaseAngleRad = phaseAngleRad % (2 * Math.PI);
  const phaseAngleLeadDeg = (phaseAngleRad * 180) / Math.PI;

  // Synodic period S = 1 / |1/T1 - 1/T2|
  const T1_days = (2 * Math.PI * Math.sqrt(Math.pow(r1_km, 3) / MU_SUN_KM)) / 86400;
  const T2_days = (2 * Math.PI * Math.sqrt(Math.pow(r2_km, 3) / MU_SUN_KM)) / 86400;
  const synodicPeriodDays = Math.abs(1 / (1 / T1_days - 1 / T2_days));

  // Generate 3D transfer arc points
  // Start from departure body's current direction
  const depAngle = Math.atan2(depPos.z, depPos.x);
  const targetAngle = depAngle + Math.PI; // Opposite side for standard Hohmann

  const arcPoints: THREE.Vector3[] = [];
  const segments = 64;
  const e_trans = Math.abs(r2_sim - r1_sim) / (r2_sim + r1_sim);
  const p_trans = a_trans_sim * (1 - e_trans * e_trans);

  for (let i = 0; i <= segments; i++) {
    const fraction = i / segments;
    const trueAnomaly = fraction * Math.PI;
    const currentAngle = depAngle + (r2_sim > r1_sim ? trueAnomaly : -trueAnomaly);
    // r(theta) = p / (1 + e*cos(theta))
    const currentRadius = p_trans / (1 + e_trans * Math.cos(trueAnomaly));
    arcPoints.push(
      new THREE.Vector3(
        Math.cos(currentAngle) * currentRadius,
        depPos.y * (1 - fraction) + arrPos.y * fraction,
        Math.sin(currentAngle) * currentRadius
      )
    );
  }

  const arrivalPosition = new THREE.Vector3(
    Math.cos(targetAngle) * r2_sim,
    arrPos.y,
    Math.sin(targetAngle) * r2_sim
  );

  return {
    departureBody: departureBody.name,
    arrivalBody: arrivalBody.name,
    r1_AU,
    r2_AU,
    r1_km,
    r2_km,
    semiMajorAxisAU: a_trans_AU,
    semiMajorAxisKm: a_trans_km,
    deltaV1_km_s,
    deltaV2_km_s,
    deltaVTotal_km_s,
    deltaV1_sim,
    deltaV2_sim,
    deltaVTotal_sim,
    timeOfFlightDays,
    timeOfFlightMonths,
    phaseAngleLeadDeg,
    synodicPeriodDays,
    orbitArcPoints: arcPoints,
    departurePos: depPos.clone(),
    arrivalPos: arrivalPosition
  };
}

/**
 * Analytical Circular Restricted Three-Body Problem (CR3BP) Lagrange Points
 */
export function calculateLagrangePoints(
  primaryBody: SimBody,
  secondaryBody: SimBody
): LagrangeSystemResult {
  const m1 = primaryBody.mass;
  const m2 = secondaryBody.mass;
  const massRatio = m2 / (m1 + m2);

  const primaryPos = primaryBody.position;
  const secondaryPos = secondaryBody.position;

  // Separation vector R from primary to secondary in simulation units
  const relVec = new THREE.Vector3().subVectors(secondaryPos, primaryPos);
  const R_sim = Math.max(1.0, relVec.length());
  const SIM_UNITS_PER_AU = 110.0;
  const R_AU = R_sim / SIM_UNITS_PER_AU;
  const R_km = R_AU * AU_IN_KM;

  // Hill sphere radius: r_H = R * (m2 / (3 * m1))^(1/3)
  const hillSphereRadiusAU = R_AU * Math.pow(massRatio / 3.0, 1.0 / 3.0);
  const hillSphereRadiusKm = hillSphereRadiusAU * AU_IN_KM;
  const hillSphereRadiusSim = R_sim * Math.pow(massRatio / 3.0, 1.0 / 3.0);

  // Unit vector along the primary -> secondary axis
  const unitAxis = relVec.clone().normalize();
  // Perpendicular in ecliptic orbital plane (XZ plane)
  const unitPerp = new THREE.Vector3(-unitAxis.z, 0, unitAxis.x).normalize();

  // Collinear displacement scales (analytical series approximations)
  const mu_factor = Math.pow(massRatio / 3.0, 1.0 / 3.0);
  const r_L1_dist_sim = R_sim * mu_factor * (1.0 - mu_factor / 3.0);
  const r_L2_dist_sim = R_sim * mu_factor * (1.0 + mu_factor / 3.0);
  const r_L3_dist_sim = R_sim * (1.0 + (5.0 * massRatio) / 12.0);

  // L1: Between primary and secondary
  const posL1_sim = new THREE.Vector3().copy(secondaryPos).sub(unitAxis.clone().multiplyScalar(r_L1_dist_sim));
  // L2: Beyond secondary along line of centers
  const posL2_sim = new THREE.Vector3().copy(secondaryPos).add(unitAxis.clone().multiplyScalar(r_L2_dist_sim));
  // L3: Beyond primary on opposite side
  const posL3_sim = new THREE.Vector3().copy(primaryPos).sub(unitAxis.clone().multiplyScalar(r_L3_dist_sim));

  // L4 and L5: Equilateral triangle points (+60 deg and -60 deg from line of centers)
  // Distance from primary = R_sim, distance from secondary = R_sim
  const halfR = unitAxis.clone().multiplyScalar(R_sim * 0.5);
  const height = unitPerp.clone().multiplyScalar(R_sim * (Math.sqrt(3) / 2.0));
  const basePoint = new THREE.Vector3().copy(primaryPos).add(halfR);

  const posL4_sim = new THREE.Vector3().copy(basePoint).add(height);
  const posL5_sim = new THREE.Vector3().copy(basePoint).sub(height);

  // Approximate Jacobi Constant C_J
  const jacobiConstantApprox = 3.0 + 3.0 * Math.pow(massRatio / 3.0, 2.0 / 3.0);

  const points: LagrangePointInfo[] = [
    {
      id: 'L1',
      name: `${secondaryBody.name}-L1 Collinear Inward`,
      simPosition: posL1_sim,
      positionAU: posL1_sim.clone().divideScalar(SIM_UNITS_PER_AU),
      positionKm: posL1_sim.clone().divideScalar(SIM_UNITS_PER_AU).multiplyScalar(AU_IN_KM),
      distanceFromSecondaryAU: (r_L1_dist_sim / SIM_UNITS_PER_AU),
      stability: 'Collinear Unstable (Halo / Lissajous)',
      description: 'Collinear balance point between Sun and planetary body. Ideal for uninterrupted solar observation.',
      famousMissions: secondaryBody.id === 'earth' ? 'SOHO, DSCOVR, ACE, Genesis, WIND' : 'Solar Wind Monitor'
    },
    {
      id: 'L2',
      name: `${secondaryBody.name}-L2 Collinear Outward`,
      simPosition: posL2_sim,
      positionAU: posL2_sim.clone().divideScalar(SIM_UNITS_PER_AU),
      positionKm: posL2_sim.clone().divideScalar(SIM_UNITS_PER_AU).multiplyScalar(AU_IN_KM),
      distanceFromSecondaryAU: (r_L2_dist_sim / SIM_UNITS_PER_AU),
      stability: 'Collinear Unstable (Halo / Lissajous)',
      description: 'Located behind the secondary body, shielded from solar radiation. Premier deep-space vantage point.',
      famousMissions: secondaryBody.id === 'earth' ? 'James Webb Space Telescope (JWST), Gaia, Planck, WMAP, Euclid' : 'Deep Space Array'
    },
    {
      id: 'L3',
      name: `${secondaryBody.name}-L3 Collinear Counter-Orbit`,
      simPosition: posL3_sim,
      positionAU: posL3_sim.clone().divideScalar(SIM_UNITS_PER_AU),
      positionKm: posL3_sim.clone().divideScalar(SIM_UNITS_PER_AU).multiplyScalar(AU_IN_KM),
      distanceFromSecondaryAU: ((R_sim + r_L3_dist_sim) / SIM_UNITS_PER_AU),
      stability: 'Collinear Unstable (Saddle)',
      description: 'Hidden directly behind primary body on opposite orbital plane. Unstable equilibrium point.',
      famousMissions: 'STEREO Behind (solar coronal mass ejection tracking)'
    },
    {
      id: 'L4',
      name: `${secondaryBody.name}-L4 Trojan Leading 60°`,
      simPosition: posL4_sim,
      positionAU: posL4_sim.clone().divideScalar(SIM_UNITS_PER_AU),
      positionKm: posL4_sim.clone().divideScalar(SIM_UNITS_PER_AU).multiplyScalar(AU_IN_KM),
      distanceFromSecondaryAU: R_AU,
      stability: 'Triangular Stable (Coriolis Potential Well)',
      description: 'Stable equilateral vertex 60° ahead in the orbital plane. Naturally captures Trojan asteroids.',
      famousMissions: secondaryBody.id === 'jupiter' ? 'NASA Lucy Mission, Greek Trojan Asteroid Camp' : '2010 TK7 Earth Trojan'
    },
    {
      id: 'L5',
      name: `${secondaryBody.name}-L5 Trojan Trailing 60°`,
      simPosition: posL5_sim,
      positionAU: posL5_sim.clone().divideScalar(SIM_UNITS_PER_AU),
      positionKm: posL5_sim.clone().divideScalar(SIM_UNITS_PER_AU).multiplyScalar(AU_IN_KM),
      distanceFromSecondaryAU: R_AU,
      stability: 'Triangular Stable (Coriolis Potential Well)',
      description: 'Stable equilateral vertex 60° trailing behind the planetary orbit. Natural gravitational sanctuary.',
      famousMissions: secondaryBody.id === 'jupiter' ? 'Trojan Camp (Patroclus, Menoetius), NASA Lucy' : '2020 XL5 Earth Trojan'
    }
  ];

  return {
    primaryName: primaryBody.name,
    secondaryName: secondaryBody.name,
    massRatio,
    separationAU: R_AU,
    separationKm: R_km,
    hillSphereRadiusAU,
    hillSphereRadiusKm,
    jacobiConstantApprox,
    points
  };
}

/**
 * Keplerian Mean-Motion Orbital Resonance Matrix
 */
export function calculateResonanceMatrix(bodies: SimBody[]): ResonancePair[] {
  const planets = bodies.filter(b => b.type === 'planet' || b.type === 'dwarf');
  const results: ResonancePair[] = [];

  // Standard harmonics to check
  const commonRatios: [number, number, string, string][] = [
    [1, 1, '1:1', 'Co-orbital / Trojan Resonance'],
    [2, 1, '2:1', 'First-Order Mean-Motion Resonance'],
    [3, 2, '3:2', 'Second-Order Harmonic (Plutino Protection)'],
    [5, 2, '5:2', 'The Great Inequality (Jupiter-Saturn Resonance)'],
    [3, 1, '3:1', 'Kirkwood Asteroid Gap Resonant Depletion'],
    [4, 1, '4:1', 'Strong Inner Harmonic Boundary'],
    [5, 3, '5:3', 'Intermediate Jovian Harmonic'],
    [7, 4, '7:4', 'Outer Jovian Harmonic'],
    [8, 5, '8:5', 'Venus-Earth Pentagram of Venus Harmonic (~1.6)']
  ];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const b1 = planets[i];
      const b2 = planets[j];

      const r1 = b1.position.length();
      const r2 = b2.position.length();

      // Ensure b1 is inner, b2 is outer
      const [inner, outer] = r1 <= r2 ? [b1, b2] : [b2, b1];
      const rInner = inner.position.length();
      const rOuter = outer.position.length();

      // Kepler's Third Law: (T2/T1)^2 = (a2/a1)^3
      // T2 / T1 = (rOuter / rInner)^(1.5)
      const exactRatio = Math.pow(rOuter / Math.max(1, rInner), 1.5);

      // Approximate orbital periods in days
      const SIM_UNITS_PER_AU = 110.0;
      const a1_AU = rInner / SIM_UNITS_PER_AU;
      const a2_AU = rOuter / SIM_UNITS_PER_AU;
      const period1Days = 365.25 * Math.pow(a1_AU, 1.5);
      const period2Days = 365.25 * Math.pow(a2_AU, 1.5);

      // Find nearest harmonic
      let bestMatch = commonRatios[0];
      let minDiff = 999;

      for (const ratio of commonRatios) {
        const targetVal = ratio[0] / ratio[1];
        const diff = Math.abs(exactRatio - targetVal) / targetVal;
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = ratio;
        }
      }

      const deviationPercent = minDiff * 100;
      const isConfirmed = deviationPercent < 6.0;

      let notes = 'Keplerian orbital harmonics within solar system field.';
      if (inner.id === 'jupiter' && outer.id === 'saturn') {
        notes = 'Laplace "Great Inequality" periodic perturbation: 5 orbits of Jupiter closely equal 2 orbits of Saturn (~900 yr cycle).';
      } else if (inner.id === 'neptune' && outer.id === 'pluto') {
        notes = 'Plutino 3:2 resonance prevents collision even though Pluto\'s eccentric orbit crosses Neptune\'s orbital radius.';
      } else if (inner.id === 'venus' && outer.id === 'earth') {
        notes = 'Venus-Earth near 8:5 resonance produces the iconic geometric 5-petal "Pentagram of Venus" over 8 Earth years.';
      } else if (inner.id === 'mars' && outer.id === 'jupiter') {
        notes = 'Governs the Kirkwood gaps in the Main Asteroid Belt through chaotic orbital clearing.';
      }

      results.push({
        body1: inner.name,
        body2: outer.name,
        period1Days,
        period2Days,
        exactRatio,
        harmonicRatio: bestMatch[2],
        p: bestMatch[0],
        q: bestMatch[1],
        deviationPercent,
        isConfirmedResonance: isConfirmed,
        classification: bestMatch[3],
        notes
      });
    }
  }

  // Sort by confirmed resonances first, then lowest deviation
  return results.sort((a, b) => {
    if (a.isConfirmedResonance && !b.isConfirmedResonance) return -1;
    if (!a.isConfirmedResonance && b.isConfirmedResonance) return 1;
    return a.deviationPercent - b.deviationPercent;
  });
}

/**
 * Classical Keplerian Orbital Elements from Cartesian State Vectors [r, v]
 */
export function calculateKeplerianElements(
  body: SimBody,
  simG: number = SIM_G,
  sunMass: number = SUN_MASS
): ClassicalOrbitalElements {
  const r = body.position;
  const v = body.velocity;

  const simMu = simG * sunMass;
  const SIM_UNITS_PER_AU = 110.0;
  const rMag_sim = Math.max(0.1, r.length());
  const vMag_sim = v.length();

  // Angular momentum vector h = r x v
  const h = new THREE.Vector3().crossVectors(r, v);
  const hMag = h.length();

  // Eccentricity vector e = ((v^2 - mu/r)*r - (r.v)*v) / mu
  const rDotV = r.dot(v);
  const term1 = r.clone().multiplyScalar(vMag_sim * vMag_sim - simMu / rMag_sim);
  const term2 = v.clone().multiplyScalar(rDotV);
  const eVec = new THREE.Vector3().subVectors(term1, term2).divideScalar(simMu);
  const eccentricity = eVec.length();

  // Semi-major axis: 1/a = 2/r - v^2/mu
  const invA = (2.0 / rMag_sim) - (vMag_sim * vMag_sim / simMu);
  const a_sim = invA > 0 ? 1.0 / invA : rMag_sim;
  const semiMajorAxisAU = a_sim / SIM_UNITS_PER_AU;
  const semiMajorAxisKm = semiMajorAxisAU * AU_IN_KM;

  // Inclination: i = arccos(h_z / h)
  const incRad = Math.acos(Math.max(-1, Math.min(1, h.y / Math.max(0.001, hMag))));
  const inclinationDeg = (incRad * 180) / Math.PI;

  // Node vector n = k x h (where k is y-axis in Three.js coordinate system)
  const n = new THREE.Vector3(-h.z, 0, h.x);
  const nMag = n.length();

  // Longitude of ascending node Omega
  let OmegaRad = 0;
  if (nMag > 0.0001) {
    OmegaRad = Math.acos(Math.max(-1, Math.min(1, n.x / nMag)));
    if (n.z < 0) OmegaRad = 2 * Math.PI - OmegaRad;
  }
  const longitudeOfAscendingNodeDeg = (OmegaRad * 180) / Math.PI;

  // Argument of periapsis omega
  let omegaRad = 0;
  if (nMag > 0.0001 && eccentricity > 0.0001) {
    omegaRad = Math.acos(Math.max(-1, Math.min(1, n.dot(eVec) / (nMag * eccentricity))));
    if (eVec.y < 0) omegaRad = 2 * Math.PI - omegaRad;
  }
  const argumentOfPeriapsisDeg = (omegaRad * 180) / Math.PI;

  // True anomaly nu
  let nuRad = 0;
  if (eccentricity > 0.0001) {
    nuRad = Math.acos(Math.max(-1, Math.min(1, eVec.dot(r) / (eccentricity * rMag_sim))));
    if (rDotV < 0) nuRad = 2 * Math.PI - nuRad;
  }
  const trueAnomalyDeg = (nuRad * 180) / Math.PI;

  // Perihelion and Aphelion
  const perihelionAU = semiMajorAxisAU * (1 - eccentricity);
  const aphelionAU = semiMajorAxisAU * (1 + eccentricity);

  // Real SI velocity and energy
  const r_km = (rMag_sim / SIM_UNITS_PER_AU) * AU_IN_KM;
  const visVivaSpeedKmS = Math.sqrt(Math.max(0, MU_SUN_KM * (2.0 / r_km - 1.0 / semiMajorAxisKm)));
  const specificOrbitalEnergy = -MU_SUN_KM / (2.0 * semiMajorAxisKm);
  const angularMomentum = (hMag / SIM_UNITS_PER_AU) * AU_IN_KM * 29.78; // scaled to km^2/s

  return {
    semiMajorAxisAU,
    semiMajorAxisKm,
    eccentricity,
    inclinationDeg,
    longitudeOfAscendingNodeDeg,
    argumentOfPeriapsisDeg,
    trueAnomalyDeg,
    perihelionAU,
    aphelionAU,
    specificOrbitalEnergy,
    angularMomentum,
    visVivaSpeedKmS,
    currentRadiusAU: rMag_sim / SIM_UNITS_PER_AU
  };
}

/**
 * Calculates ground-based Topocentric Horizontal coordinates (Azimuth & Elevation)
 * for a target celestial body viewed from NASA Houston Mission Control (29.56° N, 95.09° W)
 */
export function calculateTopocentricCoordinates(
  targetBody: SimBody,
  observerBody: SimBody | null,
  latDeg: number = 29.56, // Houston Johnson Space Center
  lonDeg: number = -95.09,
  epochDate: Date = new Date()
): TopocentricCoordinates {
  const SIM_UNITS_PER_AU = 110.0;
  const targetPos = targetBody.position;
  const obsPos = observerBody ? observerBody.position : new THREE.Vector3(110, 0, 0);

  // Apparent topocentric vector from Earth to Target
  const topVec = new THREE.Vector3().subVectors(targetPos, obsPos);
  const distSim = Math.max(0.01, topVec.length());
  const distanceAU = distSim / SIM_UNITS_PER_AU;
  const distanceKm = distanceAU * AU_IN_KM;

  // Greenwich Sidereal Time (GST) calculation
  const jd = (epochDate.getTime() / 86400000.0) + 2440587.5;
  const d = jd - 2451545.0;
  let gmstHours = (18.697374558 + 24.06570982441908 * d) % 24;
  if (gmstHours < 0) gmstHours += 24;

  // Local Sidereal Time: LST = GMST + (lon / 15)
  let lstHours = (gmstHours + lonDeg / 15.0) % 24;
  if (lstHours < 0) lstHours += 24;

  // Right Ascension and Declination (approximate equatorial)
  const raRad = Math.atan2(topVec.z, topVec.x);
  let raHours = (raRad * 12.0) / Math.PI;
  if (raHours < 0) raHours += 24;

  const decRad = Math.asin(Math.max(-1, Math.min(1, topVec.y / distSim)));
  const decDeg = (decRad * 180.0) / Math.PI;

  // Hour angle H = LST - RA
  const haRad = ((lstHours - raHours) * 15.0 * Math.PI) / 180.0;
  const latRad = (latDeg * Math.PI) / 180.0;

  // Elevation (Altitude)
  // sin(Alt) = sin(dec)*sin(lat) + cos(dec)*cos(lat)*cos(H)
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const elevationDeg = (altRad * 180.0) / Math.PI;

  // Azimuth
  // cos(Az) = (sin(dec) - sin(Alt)*sin(lat)) / (cos(Alt)*cos(lat))
  const cosAlt = Math.cos(altRad);
  const cosLat = Math.cos(latRad);
  let azRad = 0;
  if (cosAlt * cosLat > 0.0001) {
    const cosAz = (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) / (cosAlt * cosLat);
    azRad = Math.acos(Math.max(-1, Math.min(1, cosAz)));
    if (Math.sin(haRad) > 0) azRad = 2 * Math.PI - azRad;
  }
  const azimuthDeg = (azRad * 180.0) / Math.PI;

  return {
    azimuthDeg,
    elevationDeg,
    localSiderealTimeHours: lstHours,
    greenwichSiderealTimeHours: gmstHours,
    rightAscensionHours: raHours,
    declinationDeg: decDeg,
    distanceAU,
    distanceKm,
    isVisibleAboveHorizon: elevationDeg > 0
  };
}

/**
 * Calculates critical Jacobi Constant values (C_L1, C_L2, C_L3, C_L4) for a Primary-Secondary pair
 */
export function calculateJacobiCriticalValues(
  primaryBody: SimBody,
  secondaryBody: SimBody
): JacobiCriticalValues {
  const m1 = Math.max(1e-5, primaryBody.mass);
  const m2 = Math.max(1e-8, secondaryBody.mass);
  const mu = m2 / (m1 + m2);

  const relVec = new THREE.Vector3().subVectors(secondaryBody.position, primaryBody.position);
  const R_sim = Math.max(1.0, relVec.length());
  const SIM_UNITS_PER_AU = 110.0;
  const R_AU = R_sim / SIM_UNITS_PER_AU;

  const muFactor = Math.pow(mu / 3.0, 1.0 / 3.0);
  const hillRadiusSim = R_sim * muFactor;
  const hillRadiusAU = R_AU * muFactor;

  // L1 position in dimensionless rotating coordinates (primary at -mu, secondary at 1-mu)
  const gamma1 = muFactor * (1.0 - muFactor / 3.0);
  const x_L1 = 1.0 - mu - gamma1;
  const r1_L1 = Math.abs(x_L1 + mu);
  const r2_L1 = Math.max(1e-6, Math.abs(x_L1 - (1.0 - mu)));
  const C_L1 = x_L1 * x_L1 + (2.0 * (1.0 - mu)) / r1_L1 + (2.0 * mu) / r2_L1;

  // L2 position
  const gamma2 = muFactor * (1.0 + muFactor / 3.0);
  const x_L2 = 1.0 - mu + gamma2;
  const r1_L2 = Math.abs(x_L2 + mu);
  const r2_L2 = Math.max(1e-6, Math.abs(x_L2 - (1.0 - mu)));
  const C_L2 = x_L2 * x_L2 + (2.0 * (1.0 - mu)) / r1_L2 + (2.0 * mu) / r2_L2;

  // L3 position
  const gamma3 = 1.0 + (5.0 * mu) / 12.0;
  const x_L3 = -gamma3;
  const r1_L3 = Math.max(1e-6, Math.abs(x_L3 + mu));
  const r2_L3 = Math.abs(x_L3 - (1.0 - mu));
  const C_L3 = x_L3 * x_L3 + (2.0 * (1.0 - mu)) / r1_L3 + (2.0 * mu) / r2_L3;

  // L4 / L5 equilateral triangle positions: r1 = 1, r2 = 1
  const x_L4 = 0.5 - mu;
  const z_L4 = Math.sqrt(3.0) / 2.0;
  const C_L4 = (x_L4 * x_L4 + z_L4 * z_L4) + 2.0 * (1.0 - mu) + 2.0 * mu; // = 3 + mu - mu^2

  return {
    C_L1,
    C_L2,
    C_L3,
    C_L4,
    hillRadiusAU,
    hillRadiusSim,
    massParameterMu: mu,
    primaryName: primaryBody.name,
    secondaryName: secondaryBody.name
  };
}

/**
 * Samples the N-body gravitational effective potential and Jacobi Constant at an arbitrary simulation position (X, Z).
 * Returns stability zone classification, zero-velocity escape velocity threshold, and diagnostic telemetry.
 */
export function sampleJacobiField(
  xSim: number,
  zSim: number,
  primaryBody: SimBody,
  secondaryBody: SimBody,
  allBodies: SimBody[] = []
): JacobiPointSample {
  const SIM_UNITS_PER_AU = 110.0;
  const xAU = xSim / SIM_UNITS_PER_AU;
  const zAU = zSim / SIM_UNITS_PER_AU;

  const p1Pos = primaryBody.position;
  const p2Pos = secondaryBody.position;
  const m1 = Math.max(1e-5, primaryBody.mass);
  const m2 = Math.max(1e-8, secondaryBody.mass);
  const mu = m2 / (m1 + m2);

  // Separation vector R from primary to secondary in XZ plane
  const dx = p2Pos.x - p1Pos.x;
  const dz = p2Pos.z - p1Pos.z;
  const D = Math.max(1.0, Math.sqrt(dx * dx + dz * dz));

  // Center of mass
  const cmX = (m1 * p1Pos.x + m2 * p2Pos.x) / (m1 + m2);
  const cmZ = (m1 * p1Pos.z + m2 * p2Pos.z) / (m1 + m2);

  // Unit vectors of rotating frame
  const ux_x = dx / D;
  const ux_z = dz / D;
  const uz_x = -ux_z;
  const uz_z = ux_x;

  // Relative vector from CM to sample point
  const rx = xSim - cmX;
  const rz = zSim - cmZ;

  // Normalized coordinates in rotating frame (dimensionless, D = 1)
  const xRot = (rx * ux_x + rz * ux_z) / D;
  const zRot = (rx * uz_x + rz * uz_z) / D;

  // Distances to primary and secondary
  const dist1Sim = Math.max(1e-5, Math.hypot(xSim - p1Pos.x, zSim - p1Pos.z));
  const dist2Sim = Math.max(1e-5, Math.hypot(xSim - p2Pos.x, zSim - p2Pos.z));
  const r1_norm = dist1Sim / D;
  const r2_norm = dist2Sim / D;

  // Dimensionless Centrifugal and Gravitational potentials (CR3BP base)
  const centrifugalTerm = xRot * xRot + zRot * zRot;
  const gravP1 = (2.0 * (1.0 - mu)) / Math.max(0.015, r1_norm);
  const gravP2 = (2.0 * mu) / Math.max(0.005, r2_norm);

  // N-Body planetary perturbation corrections from other bodies
  let nbodyPerturb = 0;
  for (const b of allBodies) {
    if (b.id !== primaryBody.id && b.id !== secondaryBody.id && b.mass > 0) {
      const dSim = Math.hypot(xSim - b.position.x, zSim - b.position.z);
      const dNorm = Math.max(0.01, dSim / D);
      const mRel = b.mass / (m1 + m2);
      nbodyPerturb += (2.0 * mRel) / dNorm;
    }
  }

  // Dimensionless Jacobi Constant C_J
  const jacobiConstant = centrifugalTerm + gravP1 + gravP2 + nbodyPerturb;
  const effectivePotential = 0.5 * jacobiConstant;

  const crit = calculateJacobiCriticalValues(primaryBody, secondaryBody);

  // Distances to L4 and L5 in rotating frame
  const x_L4 = 0.5 - mu;
  const z_L4 = Math.sqrt(3.0) / 2.0;
  const distToL4 = Math.hypot(xRot - x_L4, zRot - z_L4);
  const distToL5 = Math.hypot(xRot - x_L4, zRot + z_L4);

  // Hill sphere radius
  const hillRadiusNorm = crit.hillRadiusSim / D;

  // Determine Stability Zone Classification
  let stabilityZone: StabilityZoneType = 'HELIOCENTRIC_STABLE';
  let stabilityLabel = 'Heliocentric Stable Orbit';
  let stabilityRank: JacobiPointSample['stabilityRank'] = 'KEPLER_STABLE';
  let colorHex = '#22c55e'; // Phosphor green
  let description = 'Quasi-periodic stable Keplerian orbit region with minimal tidal perturbation.';

  if (r1_norm < (primaryBody.radius * 1.5) / D || r2_norm < (secondaryBody.radius * 1.5) / D) {
    stabilityZone = 'TIDAL_DISRUPTION';
    stabilityLabel = 'Gravitational Collision / Tidal Boundary';
    stabilityRank = 'GRAV_ABYSS';
    colorHex = '#ef4444'; // Red
    description = 'Inside Roche tidal disruption radius. High collision probability with planetary surface.';
  } else if (r2_norm < hillRadiusNorm && jacobiConstant >= crit.C_L1) {
    stabilityZone = 'BOUND_SECONDARY';
    stabilityLabel = `${secondaryBody.name} Hill Core (Unconditionally Bound)`;
    stabilityRank = 'MAXIMUM_STABLE';
    colorHex = '#10b981'; // Emerald
    description = `Zero-velocity envelope closed. Orbits remain perpetually bound around ${secondaryBody.name} without escape.`;
  } else if (distToL4 < 0.28 || distToL5 < 0.28) {
    stabilityZone = 'TROJAN_L4_L5';
    const isL4 = distToL4 <= distToL5;
    stabilityLabel = `L${isL4 ? '4' : '5'} Trojan Coriolis Well (Resonant Stable)`;
    stabilityRank = 'TROJAN_STABLE';
    colorHex = '#38bdf8'; // Electric Cyan
    description = 'Coriolis-stabilized 1:1 orbital resonance well. Traps natural Trojan asteroids across billions of years.';
  } else if (jacobiConstant >= crit.C_L2 && jacobiConstant < crit.C_L1 && r2_norm < hillRadiusNorm * 1.8) {
    stabilityZone = 'GATEWAY_L1_L2';
    stabilityLabel = 'L1 / L2 Low-Energy Gateway (Saddle Portal)';
    stabilityRank = 'TRANSIT_GATEWAY';
    colorHex = '#f59e0b'; // Amber
    description = 'Roche neck opened at Lagrange saddle. Ideal corridor for low delta-V ballistic captures and halo orbits.';
  } else if (jacobiConstant < crit.C_L3 && Math.abs(xRot * xRot + zRot * zRot - 1.0) < 0.2) {
    stabilityZone = 'CHAOTIC_TRANSITION';
    stabilityLabel = 'Chaotic Horseshoe / Resonant Crossing';
    stabilityRank = 'CHAOTIC_SADDLE';
    colorHex = '#f97316'; // Orange
    description = 'Overlapping mean-motion resonances. Prone to orbital chaos, chaotic scattering, and orbital hops.';
  } else {
    stabilityZone = 'HELIOCENTRIC_STABLE';
    stabilityLabel = 'Heliocentric Stable Orbit Zone';
    stabilityRank = 'KEPLER_STABLE';
    colorHex = '#22c55e';
    description = 'Stable heliocentric potential corridor. Well-conditioned Keplerian dynamics.';
  }

  // Velocity barrier in km/s (Speed required to overcome zero-velocity contour from C_J)
  const simMu = 1.0 * primaryBody.mass;
  const speedSim = Math.sqrt(Math.max(0, 2 * effectivePotential - 3.0));
  const velocityBarrierKmS = Math.round(speedSim * 30.0 * 10) / 10;

  return {
    xAU: Math.round(xAU * 1000) / 1000,
    zAU: Math.round(zAU * 1000) / 1000,
    xSim,
    zSim,
    jacobiConstant: Math.round(jacobiConstant * 1000) / 1000,
    effectivePotential: Math.round(effectivePotential * 1000) / 1000,
    stabilityZone,
    stabilityLabel,
    stabilityRank,
    colorHex,
    velocityBarrierKmS,
    distToPrimaryAU: Math.round((dist1Sim / SIM_UNITS_PER_AU) * 1000) / 1000,
    distToSecondaryAU: Math.round((dist2Sim / SIM_UNITS_PER_AU) * 1000) / 1000,
    description
  };
}

