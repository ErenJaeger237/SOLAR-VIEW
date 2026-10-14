import * as THREE from 'three';
import { SimBody } from '../types/physics';

/**
 * High-performance visual overlay using THREE.LineSegments that renders
 * 3D velocity and gravitational acceleration vector arrows for celestial bodies.
 * Visualizes current linear momentum, direction, and orbital trajectory changes.
 */
export class VelocityVectorOverlay {
  public mesh: THREE.LineSegments;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private maxSegments: number = 300; // supports up to 150 line segments

  // Reusable vectors for zero GC in animation loop
  private _tip = new THREE.Vector3();
  private _dir = new THREE.Vector3();
  private _perp1 = new THREE.Vector3();
  private _perp2 = new THREE.Vector3();
  private _barb = new THREE.Vector3();
  private _up = new THREE.Vector3(0, 1, 0);
  private _forward = new THREE.Vector3(0, 0, 1);

  // Color constants - NASA Apollo CRT Phosphor Green & Amber
  private colorVelocity = new THREE.Color('#22C55E'); // CRT Phosphor Green
  private colorVelocityTip = new THREE.Color('#4ADE80'); // High-Intensity Phosphor Green
  private colorAcceleration = new THREE.Color('#F59E0B'); // Telemetry Amber
  private colorAccelerationTip = new THREE.Color('#FCD34D'); // Bright Amber

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    const maxVertices = this.maxSegments * 2;
    this.positions = new Float32Array(maxVertices * 3);
    this.colors = new Float32Array(maxVertices * 3);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false
    });

    this.mesh = new THREE.LineSegments(this.geometry, material);
    this.mesh.frustumCulled = false;
  }

  /**
   * Updates line segment vertex positions and colors each frame.
   * @param selectedBody Currently inspected celestial body
   * @param allBodies All celestial bodies in the simulation
   * @param enabled Whether velocity vectors overlay is active
   * @param showAllBodies Whether to show arrows for all bodies or just selected
   */
  public update(
    selectedBody: SimBody | null,
    allBodies: SimBody[],
    enabled: boolean,
    showAllBodies: boolean = false
  ) {
    if (!enabled) {
      this.geometry.setDrawRange(0, 0);
      return;
    }

    let vertexIdx = 0;
    const maxVertices = this.maxSegments * 2;

    const bodiesToRender: { body: SimBody; isSelected: boolean }[] = [];

    if (showAllBodies) {
      for (const b of allBodies) {
        if (!b.collided) {
          bodiesToRender.push({ body: b, isSelected: b.id === selectedBody?.id });
        }
      }
    } else if (selectedBody && !selectedBody.collided) {
      bodiesToRender.push({ body: selectedBody, isSelected: true });
    }

    for (const { body, isSelected } of bodiesToRender) {
      const speed = body.velocity.length();
      if (speed < 0.001) continue;

      const origin = body.position;

      // 1. VELOCITY / MOMENTUM VECTOR (Cyan)
      // Visual length: calibrated to be prominent yet bounded
      const velLength = Math.max(body.radius * 2.2, Math.min(speed * 6.0 + body.radius, 120));
      this._dir.copy(body.velocity).normalize();
      this._tip.copy(origin).addScaledVector(this._dir, velLength);

      // Add main velocity stem
      vertexIdx = this.addSegment(
        origin,
        this._tip,
        this.colorVelocity,
        this.colorVelocityTip,
        vertexIdx,
        maxVertices
      );

      // Compute orthogonal basis for 3D arrowhead
      this.computeOrthoBasis(this._dir, this._perp1, this._perp2);

      const headLength = Math.min(velLength * 0.28, Math.max(body.radius * 0.9, 3.5));
      const headWidth = headLength * 0.42;

      // 4 Arrowhead fins (top, bottom, left, right)
      // Fin 1 (+perp1)
      this._barb.copy(this._tip)
        .addScaledVector(this._dir, -headLength)
        .addScaledVector(this._perp1, headWidth);
      vertexIdx = this.addSegment(this._tip, this._barb, this.colorVelocityTip, this.colorVelocity, vertexIdx, maxVertices);

      // Fin 2 (-perp1)
      this._barb.copy(this._tip)
        .addScaledVector(this._dir, -headLength)
        .addScaledVector(this._perp1, -headWidth);
      vertexIdx = this.addSegment(this._tip, this._barb, this.colorVelocityTip, this.colorVelocity, vertexIdx, maxVertices);

      // Fin 3 (+perp2)
      this._barb.copy(this._tip)
        .addScaledVector(this._dir, -headLength)
        .addScaledVector(this._perp2, headWidth);
      vertexIdx = this.addSegment(this._tip, this._barb, this.colorVelocityTip, this.colorVelocity, vertexIdx, maxVertices);

      // Fin 4 (-perp2)
      this._barb.copy(this._tip)
        .addScaledVector(this._dir, -headLength)
        .addScaledVector(this._perp2, -headWidth);
      vertexIdx = this.addSegment(this._tip, this._barb, this.colorVelocityTip, this.colorVelocity, vertexIdx, maxVertices);

      // Momentum Tick marks (visualizing relative momentum magnitude p = m * v)
      if (isSelected && velLength > 8) {
        const tickCount = Math.min(Math.floor(velLength / 12), 4);
        for (let t = 1; t <= tickCount; t++) {
          const frac = t / (tickCount + 1);
          const tickCenter = origin.clone().lerp(this._tip, frac);
          const tickWidth = headWidth * 0.65;
          const tickStart = tickCenter.clone().addScaledVector(this._perp1, tickWidth);
          const tickEnd = tickCenter.clone().addScaledVector(this._perp1, -tickWidth);
          vertexIdx = this.addSegment(tickStart, tickEnd, this.colorVelocity, this.colorVelocity, vertexIdx, maxVertices);
        }
      }

      // 2. GRAVITATIONAL ACCELERATION VECTOR (Amber) for selected body
      // Shows where gravity is actively bending the trajectory
      if (isSelected && body.acceleration.length() > 0.0001) {
        const accMag = body.acceleration.length();
        const accLength = Math.max(body.radius * 1.8, Math.min(accMag * 35.0 + body.radius * 0.8, 85));
        const accDir = body.acceleration.clone().normalize();
        const accTip = origin.clone().addScaledVector(accDir, accLength);

        // Main acceleration stem
        vertexIdx = this.addSegment(
          origin,
          accTip,
          this.colorAcceleration,
          this.colorAccelerationTip,
          vertexIdx,
          maxVertices
        );

        // Arrowhead for acceleration
        const accPerp1 = new THREE.Vector3();
        const accPerp2 = new THREE.Vector3();
        this.computeOrthoBasis(accDir, accPerp1, accPerp2);
        const accHeadLen = Math.min(accLength * 0.28, Math.max(body.radius * 0.8, 3.0));
        const accHeadWid = accHeadLen * 0.42;

        // Acceleration fins
        const fin1 = accTip.clone().addScaledVector(accDir, -accHeadLen).addScaledVector(accPerp1, accHeadWid);
        vertexIdx = this.addSegment(accTip, fin1, this.colorAccelerationTip, this.colorAcceleration, vertexIdx, maxVertices);

        const fin2 = accTip.clone().addScaledVector(accDir, -accHeadLen).addScaledVector(accPerp1, -accHeadWid);
        vertexIdx = this.addSegment(accTip, fin2, this.colorAccelerationTip, this.colorAcceleration, vertexIdx, maxVertices);

        const fin3 = accTip.clone().addScaledVector(accDir, -accHeadLen).addScaledVector(accPerp2, accHeadWid);
        vertexIdx = this.addSegment(accTip, fin3, this.colorAccelerationTip, this.colorAcceleration, vertexIdx, maxVertices);

        const fin4 = accTip.clone().addScaledVector(accDir, -accHeadLen).addScaledVector(accPerp2, -accHeadWid);
        vertexIdx = this.addSegment(accTip, fin4, this.colorAccelerationTip, this.colorAcceleration, vertexIdx, maxVertices);
      }
    }

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this.geometry.setDrawRange(0, vertexIdx);
  }

  /**
   * Helper to append a single line segment (2 vertices)
   */
  private addSegment(
    v1: THREE.Vector3,
    v2: THREE.Vector3,
    c1: THREE.Color,
    c2: THREE.Color,
    idx: number,
    max: number
  ): number {
    if (idx + 2 > max) return idx;

    const p = this.positions;
    const c = this.colors;

    // Vertex 1
    p[idx * 3] = v1.x;
    p[idx * 3 + 1] = v1.y;
    p[idx * 3 + 2] = v1.z;
    c[idx * 3] = c1.r;
    c[idx * 3 + 1] = c1.g;
    c[idx * 3 + 2] = c1.b;

    // Vertex 2
    p[(idx + 1) * 3] = v2.x;
    p[(idx + 1) * 3 + 1] = v2.y;
    p[(idx + 1) * 3 + 2] = v2.z;
    c[(idx + 1) * 3] = c2.r;
    c[(idx + 1) * 3 + 1] = c2.g;
    c[(idx + 1) * 3 + 2] = c2.b;

    return idx + 2;
  }

  /**
   * Computes two perpendicular unit vectors for a given direction
   */
  private computeOrthoBasis(dir: THREE.Vector3, perp1: THREE.Vector3, perp2: THREE.Vector3) {
    if (Math.abs(dir.y) < 0.9) {
      perp1.crossVectors(dir, this._up).normalize();
    } else {
      perp1.crossVectors(dir, this._forward).normalize();
    }
    perp2.crossVectors(dir, perp1).normalize();
  }

  public dispose() {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
