# Apollo Flight Director Astrophysics & Cosmology Console

A professional, research-grade astrodynamics and cosmology mission control station styled in NASA Apollo Flight Director monochrome with CRT phosphor green aesthetics. Features a full-bleed 3D celestial mechanics canvas paired with collapsible HUD telemetry side drawers, real-time Lagrange points (L1–L5) visualization, an orbital resonance matrix, and an interactive Hohmann transfer trajectory calculator.

### User Review & Critical Decisions

> [!IMPORTANT]
> This redesign plan directly operationalizes your confirmed selections:
> - **Visual Style & Tone**: NASA Apollo Flight Director monochrome with CRT phosphor green (`#22C55E` / `#16A34A` / `#4ADE80` on pitch-black obsidian `#050907` and `#0A110D` telemetry panels), scanline-inspired hairline borders, and pure technical monospace numerals (`font-mono tabular-nums`).
> - **Viewport Structure**: Full-bleed 3D celestial canvas running Three.js with zero viewport occlusion, flanked by collapsible HUD side telemetry drawers (Left Astrodynamics Drawer & Right Ephemeris Inspector) and a streamlined mission status bar.
> - **Main Deck Astrophysics Tools**:
>   1. **Lagrange Points Engine**: Real-time analytical computation and 3D/2D projection of collinear (L1, L2, L3) and triangular equilibrium points (L4, L5) for the Sun-Earth and Sun-Jupiter three-body systems with zero-velocity curves / Hill spheres.
>   2. **Keplerian Orbital Resonance Matrix**: Mean-motion resonance analyzer (e.g. 1:2, 2:3, 3:5, 1:1 Trojan resonance) with period ratio diagnostics and Laplace resonance phase diagrams.
>   3. **Hohmann Transfer Trajectory Calculator**: Interplanetary delta-v ($\Delta v_1, \Delta v_2, \Delta v_{\text{total}}$) and time-of-flight ($\text{TOF}$) mission planner with rendered coplanar transfer ellipses between any two solar system bodies.

---

### 1. Overview & Core Concept

- **What It Does**: Provides an authentic mission control environment for exploring celestial mechanics, interplanetary navigation, and N-body gravitational dynamics. Users can inspect planetary state vectors, compute fuel-optimal Hohmann transfer trajectories between planetary orbits, plot gravitational equilibrium Lagrange points in 3D space, and analyze orbital resonance stability.
- **Target Audience & Persona**: Astrophysicists, orbital mechanics engineers, aerospace enthusiasts, and students who demand authentic physics, exact SI/AU notation, and a focused telemetry environment without decorative filler or consumer-app gimmicks.
- **Key Value**: Replaces generic 3D widgets with authoritative astrodynamics tooling—giving the user the tools used in flight dynamics facilities (JPL, Houston Mission Control, ESOC).

---

### 2. User Experience & Visual Design

#### Aesthetic Direction: Apollo Flight Director CRT Phosphor Green
- **Palette & Atmosphere**:
  - Deep space vacuum obsidian: `#050806` (primary background canvas).
  - Telemetry console surfaces: `#0A100C` and `#0E1712` with crisp 1px phosphor hairline dividers (`#1B3826` and `#22C55E33`).
  - Active Phosphor Beam: `#22C55E` (Phosphor Green P1) and `#4ADE80` (High-intensity readout).
  - Alert / Delta-v Warning: `#EAB308` (Telemetry Amber) and `#EF4444` (Trajectory Divergence).
  - CRT Grid & Reticle: Subtle Cartesian coordinate lines with milliradian ticks and equinoctial guides.
- **Typography & Precision Notation**:
  - **Interface & Headings**: `Plus Jakarta Sans` / `IBM Plex Sans` in uppercase, tight tracking (`tracking-wider text-xs font-semibold`).
  - **Data, Coordinates & Ephemeris**: Tabular monospace (`font-mono tabular-nums`) with standardized physical units ($\text{AU}$, $\text{km/s}$, $\text{m/s}^2$, $\Delta v$, $\text{days}$, $\text{deg}$).
  - **Zero-Pill Discipline**: Absolutely no pill-shaped badges, rounded-full chips, or cartoon gradients. All switches, telemetry cards, and toggles use precise rectangular aerospace geometry with subtle 2px–4px bevels or sharp technical corners.

#### Workspace Architecture & HUD Drawers
1. **Top Mission Status Ribbon (36px)**:
   - Left: Station callsign `ASTRODYNAMICS MISSION CONTROL // NASA-HOUSTON APOLLO SPEC`.
   - Center: Mission Elapsed Epoch time (`J2000.0 + d.ddd`, GMST, UTC sync).
   - Right: System status indicator (`NOMINAL // SYMPLECTIC RK4/VERLET ACTIVE`), master Drawer Toggles.
2. **Left Telemetry Drawer: Astrodynamics & Mission Tools (340px, collapsible)**:
   - **Tab 1: Hohmann Transfer Planner**:
     - Departure body selector $\to$ Target arrival body selector.
     - Analytical computation: Semi-major axis $a_{\text{trans}} = \frac{r_1 + r_2}{2}$, transfer time $\text{TOF} = \pi \sqrt{\frac{a_{\text{trans}}^3}{\mu}}$, burn impulses $\Delta v_1$ and $\Delta v_2$, total $\Delta v_{\text{total}}$, and phase angle at launch $\theta_{\text{lead}}$.
     - "Inject Transfer Orbit" button that renders the transfer ellipse directly into the 3D Three.js canvas.
   - **Tab 2: Lagrange Equilibrium Engine**:
     - System selector (Sun-Earth, Sun-Jupiter, Earth-Moon).
     - Live coordinates for $L_1, L_2, L_3, L_4, L_5$, effective gravitational potential contours, and 3D beacon markers.
   - **Tab 3: Orbital Resonance Matrix**:
     - Real-time mean motion period ratios ($T_1 / T_2$) across planetary pairs (e.g. Jupiter-Saturn 5:2, Neptune-Pluto 3:2, Galilean resonance 1:2:4).
     - Stability index and resonance perturbation phase angle.
3. **Right Telemetry Drawer: Planetary Inspector & Vantage Telemetry (320px, collapsible)**:
   - Real-time Heliocentric State Vectors ($\vec{r} = [x, y, z]\,\text{AU}$, $\vec{v} = [v_x, v_y, v_z]\,\text{km/s}$).
   - Orbital Elements ($a, e, i, \Omega, \omega, \nu$).
   - Topocentric Horizontal Coordinates (Azimuth $Az$, Elevation $Alt$, Local Sidereal Time $LST$) relative to observer latitude/longitude.
4. **Bottom Instrument Dock (Streamlined 48px)**:
   - Centered time-warp controller (Real-time $1\times$, $10\times$, $100\times$, $1000\times$, $10000\times$, Pause, Step).
   - Camera Mode Selector (Free 3D Orbit, Planetary Lock-On, Ecliptic Polar Top-Down, Hohmann Frame).
   - Display Overlays: Lagrange Points Toggle, Transfer Orbit Toggle, Trails Toggle, Grid & Ticks Toggle.

---

### 3. Key Product Decisions & Trade-Offs

- **Analytical Orbital Mechanics vs Pure Numerical Propagation**:
  - *Chosen Approach*: Hybrid architecture. The N-body engine simulates gravitational interactions using symplectic Velocity Verlet with sub-stepping for unconstrained multi-body dynamics, while the Hohmann Transfer and Lagrange tools compute exact Keplerian two-body and circular restricted three-body (CR3BP) solutions analytically and overlay them onto the 3D scene.
  - *Why*: Hohmann transfers and Lagrange points have closed-form analytical solutions that provide instant, deterministic engineering readouts without waiting for numerical orbital convergence.
- **Collapsible HUD Drawers vs Floating Modal Windows**:
  - *Chosen Approach*: Side docking panels that slide neatly into the viewport edges and can be independently minimized to 0px with a single keystroke or icon click.
  - *Why*: Floating modals obstruct the celestial mechanics in 3D space. Pinned edge drawers provide maximum canvas visibility while keeping telemetry readable at a glance.
- **Phosphor Green Monochrome Theming**:
  - *Chosen Approach*: Tailored high-contrast CRT palette with high-density data tables and phosphor green luminescence (`#22C55E` accent, `#0B150F` dark containers, `#040705` void).
  - *Why*: Completely eliminates the modern "AI template" aesthetic and establishes a timeless, disciplined, and authentic mission-control experience.

---

### 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│             Top Mission Ribbon (Epoch, Time Sync, HUD Toggles)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴──────────────────────────────┐
    │                                                              │
    ▼                                                              ▼
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│ Left Astrodynamics Drawer │  │ Three.js 3D Viewport Stage│  │ Right Telemetry Drawer    │
│  - Hohmann Calculator     │  │  - N-Body Gravitational   │  │  - Selected Body Vectors  │
│  - Lagrange Points L1-L5  │  │    Meshes & Trails        │  │  - Orbital Elements       │
│  - Resonance Matrix       │  │  - Hohmann Orbit Arc      │  │  - Topocentric Horizon    │
│  - Perturbation Sandbox   │  │  - Lagrange 3D Markers    │  │  - Observational Ephemeris│
└───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘
                                    ▲
                                    │ Time Warp & Camera Toggles
┌───────────────────────────────────┴────────────────────────────────────┐
│          Bottom Instrument Dock (Time Warp, Camera, Visibilities)      │
└────────────────────────────────────────────────────────────────────────┘
```

#### Astrodynamics Calculations Specification
1. **Hohmann Transfer Trajectory**:
   $$\mu = G \cdot M_{\odot}$$
   $$r_1 = a_{\text{dep}}, \quad r_2 = a_{\text{arr}}$$
   $$a_{\text{trans}} = \frac{r_1 + r_2}{2}$$
   $$\Delta v_1 = \sqrt{\frac{\mu}{r_1}} \left( \sqrt{\frac{2 r_2}{r_1 + r_2}} - 1 \right)$$
   $$\Delta v_2 = \sqrt{\frac{\mu}{r_2}} \left( 1 - \sqrt{\frac{2 r_1}{r_1 + r_2}} \right)$$
   $$\Delta v_{\text{total}} = |\Delta v_1| + |\Delta v_2|$$
   $$\text{TOF} = \pi \sqrt{\frac{a_{\text{trans}}^3}{\mu}}$$

2. **Lagrange Equilibrium Solutions (CR3BP)**:
   For mass parameter $\mu = \frac{m_2}{m_1 + m_2}$ and separation $R$:
   - $L_1$: Collinear point between primary and secondary: $r_{L1} \approx R \left( 1 - \left(\frac{\mu}{3}\right)^{1/3} \right)$
   - $L_2$: Collinear point behind secondary: $r_{L2} \approx R \left( 1 + \left(\frac{\mu}{3}\right)^{1/3} \right)$
   - $L_3$: Collinear point behind primary: $r_{L3} \approx -R \left( 1 + \frac{5\mu}{12} \right)$
   - $L_4, L_5$: Equilateral vertices forming $60^\circ$ leading and trailing angles on the secondary body's orbital plane.

3. **Orbital Resonance Analyzer**:
   - Computes period $T = 2\pi \sqrt{\frac{a^3}{\mu}}$ for all planetary pairs.
   - Computes ratio $R_{12} = T_2 / T_1$ and matches nearest integer ratio $p:q$ within resonance tolerance ($\delta < 0.05$).
