import * as THREE from 'three';
import { SimBody, PhysicsSettings } from '../types/physics';
import { SIM_G, EPSILON_SOFTENING } from './constants';

export interface CollisionEventData {
  primaryBody: SimBody;
  absorbedBodyName: string;
  collisionPoint: THREE.Vector3;
  impactVelocity: number;
  newMass: number;
  newRadius: number;
}

// Pre-allocated vectors for zero-garbage physics computation
const _diff = new THREE.Vector3();
const _force = new THREE.Vector3();
const _newAccels: THREE.Vector3[] = [];

/**
 * Calculates mutual gravitational accelerations on all active bodies
 */
export function computeAccelerations(
  bodies: SimBody[],
  accels: THREE.Vector3[],
  G: number = SIM_G,
  epsilon: number = EPSILON_SOFTENING
) {
  const n = bodies.length;

  // Zero out all accelerations
  for (let i = 0; i < n; i++) {
    if (!accels[i]) {
      accels[i] = new THREE.Vector3();
    }
    accels[i].set(0, 0, 0);
  }

  const epsSq = epsilon * epsilon;

  // Pairwise N-body calculation (Newton's 3rd Law: F_ji = -F_ij)
  for (let i = 0; i < n; i++) {
    const b1 = bodies[i];
    if (b1.collided) continue;

    for (let j = i + 1; j < n; j++) {
      const b2 = bodies[j];
      if (b2.collided) continue;

      _diff.subVectors(b2.position, b1.position);
      const distSq = _diff.lengthSq() + epsSq;
      const dist = Math.sqrt(distSq);
      const forceMag = (G * b1.mass * b2.mass) / (distSq * dist);

      // Force vector along displacement
      _force.copy(_diff).multiplyScalar(forceMag);

      // a_i = F / m_i
      if (b1.mass > 0) {
        accels[i].addScaledVector(_force, 1.0 / b1.mass);
      }
      // a_j = -F / m_j
      if (b2.mass > 0) {
        accels[j].addScaledVector(_force, -1.0 / b2.mass);
      }
    }
  }
}

/**
 * Symplectic Velocity Verlet integrator step.
 * Preserves mechanical energy and orbital phase space much better than Euler.
 */
export function stepVerlet(
  bodies: SimBody[],
  dt: number,
  G: number,
  epsilon: number,
  collisionsEnabled: boolean,
  onCollision?: (event: CollisionEventData) => void
) {
  const n = bodies.length;

  // Ensure accel buffer capacity
  while (_newAccels.length < n) {
    _newAccels.push(new THREE.Vector3());
  }

  // 1. Update positions: x(t + dt) = x(t) + v(t)*dt + 0.5*a(t)*dt^2
  const halfDtSq = 0.5 * dt * dt;
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    if (b.collided) continue;

    b.position.addScaledVector(b.velocity, dt);
    b.position.addScaledVector(b.acceleration, halfDtSq);

    // Update axial rotation angle
    if (b.rotationPeriodHours !== 0) {
      // Arbitrary smooth rotation scaling based on simulation time
      const radPerSec = (Math.PI * 2) / (Math.abs(b.rotationPeriodHours) * 10);
      b.rotationAngle += radPerSec * dt * (b.rotationPeriodHours < 0 ? -1 : 1);
    }
  }

  // 2. Compute new accelerations at new positions: a(t + dt)
  computeAccelerations(bodies, _newAccels, G, epsilon);

  // 3. Update velocities: v(t + dt) = v(t) + 0.5*(a(t) + a(t+dt))*dt
  const halfDt = 0.5 * dt;
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    if (b.collided) continue;

    b.velocity.addScaledVector(b.acceleration, halfDt);
    b.velocity.addScaledVector(_newAccels[i], halfDt);
    b.acceleration.copy(_newAccels[i]);
  }

  // 4. Inelastic collision detection and momentum-conserving merging
  if (collisionsEnabled) {
    handleCollisions(bodies, onCollision);
  }
}

/**
 * Inelastic physical collision merging.
 * Conserves mass and total linear momentum.
 */
function handleCollisions(
  bodies: SimBody[],
  onCollision?: (event: CollisionEventData) => void
) {
  const n = bodies.length;

  for (let i = 0; i < n; i++) {
    const b1 = bodies[i];
    if (b1.collided) continue;

    for (let j = i + 1; j < n; j++) {
      const b2 = bodies[j];
      if (b2.collided) continue;

      const dist = b1.position.distanceTo(b2.position);
      const collisionThreshold = (b1.radius + b2.radius) * 0.85;

      if (dist < collisionThreshold) {
        // Decide primary (larger mass or star/planet dominance)
        const primary = b1.mass >= b2.mass ? b1 : b2;
        const absorbed = b1.mass >= b2.mass ? b2 : b1;

        const totalMass = primary.mass + absorbed.mass;
        const impactPoint = primary.position.clone().lerp(absorbed.position, 0.5);
        const relSpeed = primary.velocity.distanceTo(absorbed.velocity);

        // Momentum conservation: v_new = (m1*v1 + m2*v2) / (m1 + m2)
        primary.velocity.multiplyScalar(primary.mass)
          .addScaledVector(absorbed.velocity, absorbed.mass)
          .divideScalar(totalMass);

        // Center of mass adjustment
        primary.position.multiplyScalar(primary.mass)
          .addScaledVector(absorbed.position, absorbed.mass)
          .divideScalar(totalMass);

        primary.mass = totalMass;

        // Radius expands according to volume conservation: R_new = (R1^3 + R2^3)^(1/3)
        const newRadius = Math.cbrt(Math.pow(primary.radius, 3) + Math.pow(absorbed.radius, 3));
        primary.radius = newRadius;

        absorbed.collided = true;

        if (onCollision) {
          onCollision({
            primaryBody: primary,
            absorbedBodyName: absorbed.name,
            collisionPoint: impactPoint,
            impactVelocity: relSpeed,
            newMass: primary.mass,
            newRadius: primary.radius
          });
        }
      }
    }
  }
}

/**
 * Top-level physics update supporting adaptive sub-stepping for extreme orbital stability
 */
export function updateNBodyPhysics(
  bodies: SimBody[],
  deltaSeconds: number,
  settings: PhysicsSettings,
  onCollision?: (event: CollisionEventData) => void
) {
  if (settings.timeScale <= 0) return;

  const totalDt = deltaSeconds * settings.timeScale;
  // Adaptive sub-steps: more sub-steps for higher time warps
  const subSteps = Math.min(Math.max(settings.subSteps, Math.ceil(settings.timeScale * 2)), 30);
  const dt = totalDt / subSteps;

  for (let s = 0; s < subSteps; s++) {
    stepVerlet(
      bodies,
      dt,
      settings.gravityConstant,
      settings.softening,
      settings.collisionsEnabled,
      onCollision
    );
  }
}
