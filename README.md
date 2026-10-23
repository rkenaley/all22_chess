# 🏈 The All-22 Chessboard: Football Played Like Chess

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.21-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520.0-green.svg?logo=node.js)](https://nodejs.org/)
[![Build Status](https://img.shields.io/badge/Build-Passing%20(0%20errors)-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Physics Engine](https://img.shields.io/badge/Physics-20Hz%20Continuous%20Anisotropic-orange.svg)]()
[![Analytics](https://img.shields.io/badge/Analytics-nflfastR%20EPA%20Calibrated-blueviolet.svg)]()

> *"American football is not a collection of isolated collisions; it is the world’s most sophisticated, time-compressed game of continuous physical chess."*

The **All-22 Chessboard** is an open-source, time-explicit simulation laboratory and adversarial game-theoretic engine for American football. It completely eliminates the canned animations, discrete dice-roll collision triggers, and magnetic suction tackling of commercial video games (like Madden) in favor of **continuous 20 Hz anisotropic steering physics**, **SDE trench pocket collapse**, **Next Gen Stats (NGS) kinematics**, and **official nflfastR Expected Points Added (EPA)**.

Here, every playcall is a move, pre-snap motion is a diagnostic pawn probe, route stems and coverage shells are tactical maneuvers, and coordinators co-evolve adversarially across rounds in search of game-theoretic Nash equilibria.

---

## 🌟 Key Features

### 1. High-Speed Continuous Physical Chess
* **20 Hz Anisotropic Steering**: Real physical turning limits governed by turf friction and centripetal acceleration ($a_{\text{lat}} = v^2 / R \le \mu g$). No unnatural animation locks or instantaneous 90-degree vector teleportation.
* **Trench Warfare & SDE Pocket Collapse**: Continuous Brownian pocket compression driven by ESPN Pass Rush Win Rate (PRWR) and Pass Block Win Rate (PBWR). Models authentic A/B-gap vs edge C-gap collapse, stunt loops (`ET_TWIST`, `TE_TWIST`), and pulling guard/tackle mechanics (`PIN_AND_PULL`, `GT_COUNTER`, `POWER_G`).
* **3D Ballistic Trajectory**: True parabolic ball flight ($z(t) = v_z t - \frac{1}{2}gt^2$) with aerodynamic drag, altitude perspective scaling, turf ground shadows, and defender visual reaction latency (`ballBreakDelay`).

### 2. Modern Route Architecture & Coaching Dynamics
* **Break Styles (`SHARP_PIVOT` vs `ROUNDED_SPEED`)**:
  * **Sharp Hard Pivot**: Receiver drops hips, decelerates abruptly ($a_{\text{brake}}$) to a tight radius ($1.05\text{y}$), and plants, triggering maximum visual-motor reaction penalty on trailing man defenders.
  * **Rounded Speed Arc**: Receiver maintains up to $80\%\ v_{\text{max}}$ along a continuous curved spline ($2.85\text{y}$ radius) with zero hard braking, defeating zone leverage and crossing fields in stride.
* **Dynamic Choice / Option Routes (`⑂`)**: Post-snap branch evaluation triggered at the stem landmark based on:
  * **MOFC vs MOFO**: Middle-of-field closed (single-high Cov 1/Cov 3) $\to$ snap outside (Out/Corner); middle-of-field open (split-safety Cov 2/Cov 4/Cov 6) $\to$ seam post split.
  * **Man vs Zone**: Defender trailing $\to$ break away (Whip/Out); zone defenders dropping $\to$ throttle down and settle in the soft hook/curl void.
  * **Leverage Read**: Outside leverage $\to$ quick slant across face; inside leverage $\to$ corner/out to boundary.
* **Multi-Waypoint Landmark Routing**: Arbitrary $L_1, L_2, L_3 \dots L_n$ route control points with real-time chalkboard drag-and-drop and add/pop landmark controls.

### 3. Pre-Snap Information Hierarchy & Game Theory
* **Rock-Paper-Scissors Cascade**: Personnel Grouping $\to$ Automated Defensive Counter-Matching (e.g. 6-OL forces Base 4-3, subbing Nickel CB for SAM LB) $\to$ Formation Spacing $\to$ Pre-Snap Motion Tells (`Jet`, `Orbit`, `Sift`) revealing Man vs Zone $\to$ Post-Snap Choice Execution.
* **Contractual Cap Arbitrage**: Full 32 NFL team rosters with real player salaries under the **$255M hard cap**. Demonstrates how scheme design can extract surplus value (e.g. our Pet Theoretical Optimum Offense runs on $84.5M, freeing $170.5M for defense).

### 4. Evolutionary Optimization & Adversarial Co-Evolution
* **Multi-Objective Play Optimizer**: Genetic algorithm ($\mu + \lambda$ tournament + crossover) with configurable mutation batching ($1$ parameter micro-tuning up to $4+$ parameter compound revamps) searching for optimal route depths, splits, and protections.
* **10-Round Tick-Tock Co-Evolution**: Offense and defense co-evolve adversarially across rounds, demonstrating cyclical bistability (shot plays vs quarters press) and eventual convergence to balanced mixed Nash equilibria.

---

## 🚀 Quick Start (Under 60 Seconds)

### Prerequisites
* [Node.js](https://nodejs.org/) $\ge$ 20.0
* npm $\ge$ 9.0

### Installation & Launch

```bash
# 1. Clone repository
git clone https://github.com/rkenaley/all22_chess.git
cd all22_chess

# 2. Install dependencies
npm install

# 3. Start local interactive All-22 chalkboard
npm run dev
```

Open your browser to `http://localhost:5173/` to explore the interactive tactile slate chalkboard.

### Verify Production Build
```bash
npm run build
```
*Compiles clean with 0 TypeScript/Vite errors in ~2.2s.*

---

## 💻 CLI Backtest & Validation Suites

The engine includes turnkey TypeScript execution scripts to replicate all empirical research findings:

```bash
# 1. Simulate the Pet Theoretical Optimum Offense (6 OL + 2 Inserts + Mobile QB)
npm run simulate:optimum

# 2. Run NFL Baseline Calibration Audit vs nflfastR EPA distributions
npm run benchmark

# 3. Evolve and benchmark pulling run schemes (Pin-Pull, Counter, Power-G)
npm run evolve:schemes

# 4. Analyze defensive counter-adaptation and coverage sensitivity
npm run analyze:counters

# 5. Evaluate offensive personnel groupings against defensive responses
npm run analyze:personnel
```

---

## 📖 The Technical Whitepaper

For a rigorous, mathematical treatment of the underlying kinematic equations, PRWR Brownian motion formulas, empirical backtest tables, and game-theoretic proofs, read the full whitepaper:

👉 **[Read the Full Technical Whitepaper (WHITEPAPER.md)](WHITEPAPER.md)**

---

## 📁 Repository Structure

```
all22-chess-oc-simulator/
├── index.html                   # Tactile All-22 chalkboard UI & control panels
├── package.json                 # Project configuration, scripts & dependencies
├── tsconfig.json                # Strict TypeScript configuration
├── .gitignore                   # Clean exclusion specification
├── LICENSE                      # Open-source MIT License
├── README.md                    # Project documentation & quickstart
├── WHITEPAPER.md                # Mission statement, mathematical formulations & backtests
└── src/
    ├── engine.ts                # Unified 20Hz anisotropic physics, SDE trench, EPA & genetic search
    ├── main.ts                  # Interactive chalkboard renderer, canvas handlers & UI event loops
    ├── nfl_rosters.ts           # 32 NFL team rosters, salaries, cap economics & matchup presets
    ├── simulate_pet_optimum.ts  # Validation runner for 6-OL Pet Theoretical Optimum offense
    ├── benchmark_audit.ts       # Empirical validation against NFL league averages
    ├── evolve_running_schemes.ts# Evolutionary optimizer for pulling run schemes
    ├── analyze_defensive_counters.ts # Systematic scheme-counter sensitivity audit
    ├── analyze_personnel_sensitivity.ts # Personnel grouping matchup evaluation
    └── data/                    # Empirical datasets, evolved catalogs & team registries
        ├── nfl_teams_32.json
        ├── evolved_plays_catalog.json
        ├── evolved_running_schemes.json
        ├── defensive_counters_report.json
        └── personnel_sensitivity_report.json
```

---

## 🎮 How to Play Football Like Chess

1. **Board Setup (Personnel & Formation)**: Pick your offensive personnel grouping (`11`, `12`, `13`, `21`, or `6-OL Heavy`) and formation. Watch the defense automatically adapt its personnel (e.g. subbing Nickel CB for 248lb SAM LB against 6 OL).
2. **Diagnostic Pawn Probe (Pre-Snap Motion)**: Send an eligible receiver or back into motion (`Jet`, `Orbit`, `TE Sift`). If a defender trails $\to$ Man-to-Man; if the defense shifts zone leverage $\to$ Zone.
3. **Maneuver & Cut (Post-Snap 20Hz)**: Watch receivers execute sharp pivot cuts or rounded speed arcs. If an option route is called, watch the receiver read the single-high or two-high safety shell in real time and snap to the open void.
4. **Adversarial Optimization (Tick-Tock Co-Evolution)**: Head to the **Tick-Tock War Room** to pit your play designs against an evolving AI defensive coordinator over 10 rounds of metagame warfare.

---

## 🤝 Contributing

We welcome contributions from football analysts, game theorists, physics engine developers, and sports analytics researchers!
* Open an issue to report bugs or suggest strategic concepts.
* Submit pull requests for new blocking schemes, coverage logic, or visualization features.

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
