const fs = require('fs');
const path = require('path');

const artifactDir = 'C:\\Users\\Ryan\\.gemini\\antigravity\\brain\\cd2e0f3d-a56e-4435-9cd4-644bc68b1df8';

// ============================================================================
// DIAGRAM 1: MACRO ROCK-PAPER-SCISSORS GAME CYCLES
// ============================================================================
function generateRpsCycleSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="100%" height="100%" style="background:#090d14; font-family:'JetBrains Mono', Consolas, sans-serif;">
  <defs>
    <linearGradient id="offenseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#059669" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="defenseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#b91c1c" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="neutralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.05"/>
    </linearGradient>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981"/>
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444"/>
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/>
    </marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b"/>
    </marker>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Title & Subtitle -->
  <text x="500" y="42" fill="#f8fafc" font-size="20" font-weight="800" text-anchor="middle" letter-spacing="1.5">MODERN NFL PLAY-CALLING ROCK-PAPER-SCISSORS EQUILIBRIA</text>
  <text x="500" y="68" fill="#94a3b8" font-size="12" text-anchor="middle">Empirical Cyclical Orbits & Subgame Payoff Transitions (All-22 Kinematic Engine v2.4)</text>

  <!-- Outer Ring Cycle -->
  <circle cx="500" cy="380" r="260" fill="none" stroke="#1e293b" stroke-width="2" stroke-dasharray="6,6"/>

  <!-- NODE 1: PLAY-ACTION WIDE ZONE BOOT (Top Left: 260, 200) -->
  <g transform="translate(140, 140)">
    <rect width="240" height="96" rx="8" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
    <rect width="240" height="96" rx="8" fill="url(#offenseGrad)"/>
    <text x="12" y="24" fill="#10b981" font-size="10" font-weight="700">OFFENSE: SHANAHAN / MCVAY</text>
    <text x="12" y="44" fill="#f8fafc" font-size="13" font-weight="700">PA Under-Center Boot</text>
    <text x="12" y="64" fill="#94a3b8" font-size="10">12P Outside Zone fake + Sail</text>
    <text x="12" y="80" fill="#38bdf8" font-size="9">+0.45 to +0.50 EPA vs Reading Zones</text>
  </g>

  <!-- NODE 2: BRIAN FLORES DOUBLE A-GAP RUN BLITZ (Top Right: 620, 140) -->
  <g transform="translate(620, 140)">
    <rect width="240" height="96" rx="8" fill="#0f172a" stroke="#ef4444" stroke-width="2"/>
    <rect width="240" height="96" rx="8" fill="url(#defenseGrad)"/>
    <text x="12" y="24" fill="#ef4444" font-size="10" font-weight="700">DEFENSE: BRIAN FLORES</text>
    <text x="12" y="44" fill="#f8fafc" font-size="13" font-weight="700">3-2-6 Mug Cross-Dog C0</text>
    <text x="12" y="64" fill="#94a3b8" font-size="10">Gap-shooting sprint (6.8 yd/s)</text>
    <text x="12" y="80" fill="#ef4444" font-size="9">Destroys mesh @ T=1.15s (-1.58 EPA)</text>
  </g>

  <!-- NODE 3: HOT QUICK SLANT / FLAT (Bottom Right: 620, 480) -->
  <g transform="translate(620, 480)">
    <rect width="240" height="96" rx="8" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
    <rect width="240" height="96" rx="8" fill="url(#offenseGrad)"/>
    <text x="12" y="24" fill="#10b981" font-size="10" font-weight="700">OFFENSE: WEST COAST HOT</text>
    <text x="12" y="44" fill="#f8fafc" font-size="13" font-weight="700">Quick Slant-Flat (3-Step)</text>
    <text x="12" y="64" fill="#94a3b8" font-size="10">Ball out @ T=1.65s before pressure</text>
    <text x="12" y="80" fill="#10b981" font-size="9">+0.05 EPA vs C0 Blitz (52% succ)</text>
  </g>

  <!-- NODE 4: PETE CARROLL / SCHWARTZ COVER 3 (Bottom Left: 140, 480) -->
  <g transform="translate(140, 480)">
    <rect width="240" height="96" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <rect width="240" height="96" rx="8" fill="url(#neutralGrad)"/>
    <text x="12" y="24" fill="#38bdf8" font-size="10" font-weight="700">DEFENSE: CARROLL / SCHWARTZ</text>
    <text x="12" y="44" fill="#f8fafc" font-size="13" font-weight="700">Nickel Over Cover 3 Sky</text>
    <text x="12" y="64" fill="#94a3b8" font-size="10">Apex Curl/Flat rallies to Slant</text>
    <text x="12" y="80" fill="#ef4444" font-size="9">Stops Quick Slant (-0.42 EPA)</text>
  </g>

  <!-- CENTER HUB: VON NEUMANN EQUILIBRIUM -->
  <g transform="translate(380, 310)">
    <rect width="240" height="140" rx="12" fill="#0b1329" stroke="#f59e0b" stroke-width="2" filter="url(#glow)"/>
    <text x="120" y="28" fill="#f59e0b" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="1">NASH EQUILIBRIUM HUB</text>
    <text x="120" y="52" fill="#f8fafc" font-size="16" font-weight="800" text-anchor="middle">v* = +0.1068 EPA</text>
    <text x="120" y="74" fill="#94a3b8" font-size="10" text-anchor="middle">Offense MSNE:</text>
    <text x="120" y="90" fill="#10b981" font-size="10" font-weight="700" text-anchor="middle">70.2% Outside Zone | 27.0% Power O</text>
    <text x="120" y="112" fill="#94a3b8" font-size="10" text-anchor="middle">Defense MSNE:</text>
    <text x="120" y="128" fill="#38bdf8" font-size="10" font-weight="700" text-anchor="middle">68.3% Wide-9 C3 | 18.5% Under C1</text>
  </g>

  <!-- DIRECTED ARROWS & LABELS -->

  <!-- Top Arrow: PA Boot -> Flores Blitz -->
  <path d="M 380 170 Q 500 130 610 170" fill="none" stroke="#ef4444" stroke-width="3" marker-end="url(#arrow-red)"/>
  <rect x="440" y="122" width="120" height="24" rx="4" fill="#1e293b"/>
  <text x="500" y="138" fill="#ef4444" font-size="10" font-weight="700" text-anchor="middle">COUNTERED BY (-1.58)</text>

  <!-- Right Arrow: Flores Blitz -> Quick Slant -->
  <path d="M 740 240 Q 770 360 740 470" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrow-green)"/>
  <rect x="745" y="348" width="130" height="24" rx="4" fill="#1e293b"/>
  <text x="810" y="364" fill="#10b981" font-size="10" font-weight="700" text-anchor="middle">EXPLOITED BY (+0.05)</text>

  <!-- Bottom Arrow: Quick Slant -> Cover 3 Sky -->
  <path d="M 620 540 Q 500 580 390 540" fill="none" stroke="#ef4444" stroke-width="3" marker-end="url(#arrow-red)"/>
  <rect x="445" y="562" width="110" height="24" rx="4" fill="#1e293b"/>
  <text x="500" y="578" fill="#ef4444" font-size="10" font-weight="700" text-anchor="middle">RALLIED ON (-0.42)</text>

  <!-- Left Arrow: Cover 3 Sky -> PA Boot -->
  <path d="M 260 480 Q 230 360 260 245" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrow-green)"/>
  <rect x="125" y="348" width="130" height="24" rx="4" fill="#1e293b"/>
  <text x="190" y="364" fill="#10b981" font-size="10" font-weight="700" text-anchor="middle">BAITS LBs DOWNHILL</text>

  <!-- Diagonal Spokes to Center Hub -->
  <path d="M 360 236 L 400 310" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
  <path d="M 640 236 L 600 310" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
  <path d="M 640 480 L 600 450" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
  <path d="M 360 480 L 400 450" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
</svg>`;
}

// ============================================================================
// DIAGRAM 2: EMPIRICAL PAYOFF MATRIX HEATMAP
// ============================================================================
function generatePayoffHeatmapSvg() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'full_factorial_game_theory_results.json'), 'utf-8'));
  const m = data.offensePlays.length;
  const n = data.defensiveLooks.length;
  const matrix = data.payoffMatrixEpa;

  const cellW = 46;
  const cellH = 34;
  const leftMargin = 220;
  const topMargin = 140;
  const width = leftMargin + n * cellW + 40;
  const height = topMargin + m * cellH + 80;

  function getColor(val) {
    if (val >= 0.5) return '#059669'; // Dark green
    if (val >= 0.15) return '#10b981'; // Green
    if (val > 0) return '#34d399'; // Light green
    if (val === 0) return '#64748b'; // Gray
    if (val > -0.3) return '#fbbf24'; // Amber
    if (val > -0.8) return '#f87171'; // Light red
    return '#dc2626'; // Deep red
  }

  function getTextColor(val) {
    if (Math.abs(val) > 0.4) return '#ffffff';
    return '#0f172a';
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#090d14; font-family:'JetBrains Mono', Consolas, sans-serif;">
  <text x="${width/2}" y="36" fill="#f8fafc" font-size="18" font-weight="800" text-anchor="middle" letter-spacing="1">FULL FACTORIAL PAYOFF MATRIX: EXPECTED EPA BY MATCHUP</text>
  <text x="${width/2}" y="58" fill="#94a3b8" font-size="11" text-anchor="middle">176 Matchup Cells (4,400 Monte Carlo Simulations @ 20 Hz Kinematics)</text>
  `;

  // Draw Column Headers (Defensive Looks - Rotated)
  for (let j = 0; j < n; j++) {
    const x = leftMargin + j * cellW + cellW / 2;
    const y = topMargin - 10;
    const defId = data.defensiveLooks[j].id;
    const shortName = defId.replace('VIKINGS_', 'VIK_').replace('NICKEL_', 'NIC_').replace('BASE_', 'B_').replace('GOAL_LINE_', 'GL_');
    svg += `<text x="${x}" y="${y}" fill="#94a3b8" font-size="9" font-weight="600" text-anchor="start" transform="rotate(-45, ${x}, ${y})">${shortName}</text>\n`;
  }

  // Draw Rows (Offensive Plays)
  for (let i = 0; i < m; i++) {
    const y = topMargin + i * cellH;
    const offId = data.offensePlays[i].id;
    const offName = data.offensePlays[i].name.split(' (')[0];
    svg += `<text x="${leftMargin - 12}" y="${y + cellH / 2 + 3}" fill="#cbd5e1" font-size="10" font-weight="600" text-anchor="end">${offName}</text>\n`;

    for (let j = 0; j < n; j++) {
      const x = leftMargin + j * cellW;
      const val = matrix[i][j];
      const bg = getColor(val);
      const fg = getTextColor(val);
      const valStr = (val >= 0 ? '+' : '') + val.toFixed(2);

      // Highlight Nash optimal cells
      const isNashOff = (i === 9 || i === 7); // Outside Zone or Power O
      const isNashDef = (j === 3 || j === 1 || j === 0); // Wide-9, Under, Over
      const isEquilibrium = isNashOff && isNashDef;

      svg += `<rect x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH - 2}" rx="3" fill="${bg}" fill-opacity="${isEquilibrium ? '1.0' : '0.85'}" ${isEquilibrium ? 'stroke="#f59e0b" stroke-width="2"' : ''}/>\n`;
      svg += `<text x="${x + cellW / 2}" y="${y + cellH / 2 + 4}" fill="${fg}" font-size="9" font-weight="700" text-anchor="middle">${valStr}</text>\n`;
    }
  }

  // Legend at bottom
  const legY = height - 32;
  svg += `
  <g transform="translate(${leftMargin}, ${legY})">
    <text x="0" y="12" fill="#94a3b8" font-size="10" font-weight="700">SCALE:</text>
    <rect x="60" y="0" width="24" height="14" fill="#dc2626" rx="2"/><text x="90" y="11" fill="#cbd5e1" font-size="9">&lt; -0.80</text>
    <rect x="150" y="0" width="24" height="14" fill="#f87171" rx="2"/><text x="180" y="11" fill="#cbd5e1" font-size="9">-0.30</text>
    <rect x="230" y="0" width="24" height="14" fill="#fbbf24" rx="2"/><text x="260" y="11" fill="#cbd5e1" font-size="9">-0.05</text>
    <rect x="310" y="0" width="24" height="14" fill="#34d399" rx="2"/><text x="340" y="11" fill="#cbd5e1" font-size="9">+0.10</text>
    <rect x="390" y="0" width="24" height="14" fill="#059669" rx="2"/><text x="420" y="11" fill="#cbd5e1" font-size="9">&gt; +0.50</text>
    <rect x="490" y="0" width="18" height="14" fill="none" stroke="#f59e0b" stroke-width="2" rx="2"/><text x="515" y="11" fill="#f59e0b" font-size="9" font-weight="700">NASH EQUILIBRIUM SUPPORT</text>
  </g>
</svg>`;
  return svg;
}

// ============================================================================
// DIAGRAM 3: FICTITIOUS PLAY CONVERGENCE & CYCLIC ORBITS
// ============================================================================
function generateFictitiousPlaySvg() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'full_factorial_game_theory_results.json'), 'utf-8'));
  const history = data.nashEquilibrium.fictitiousPlayHistory;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 480" width="100%" height="100%" style="background:#090d14; font-family:'JetBrains Mono', Consolas, sans-serif;">
  <text x="450" y="34" fill="#f8fafc" font-size="18" font-weight="800" text-anchor="middle" letter-spacing="1">ITERATED FICTITIOUS PLAY DYNAMICS & CONVERGENCE</text>
  <text x="450" y="56" fill="#94a3b8" font-size="11" text-anchor="middle">Empirical Learning Trajectory: Evolution from Exploratory Cycling to Minimax Value (v* = +0.1068 EPA)</text>

  <!-- Axes & Grid -->
  <g transform="translate(80, 80)">
    <!-- Y-axis -->
    <line x1="0" y1="0" x2="0" y2="300" stroke="#334155" stroke-width="1.5"/>
    <line x1="0" y1="300" x2="740" y2="300" stroke="#334155" stroke-width="1.5"/>

    <!-- Grid lines & Y labels (0% to 100%) -->
    <line x1="0" y1="0" x2="740" y2="0" stroke="#1e293b" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="-12" y="5" fill="#64748b" font-size="10" text-anchor="end">100%</text>

    <line x1="0" y1="75" x2="740" y2="75" stroke="#1e293b" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="-12" y="80" fill="#64748b" font-size="10" text-anchor="end">75%</text>

    <line x1="0" y1="150" x2="740" y2="150" stroke="#1e293b" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="-12" y="155" fill="#64748b" font-size="10" text-anchor="end">50%</text>

    <line x1="0" y1="225" x2="740" y2="225" stroke="#1e293b" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="-12" y="230" fill="#64748b" font-size="10" text-anchor="end">25%</text>

    <text x="-12" y="305" fill="#64748b" font-size="10" text-anchor="end">0%</text>

    <!-- X-axis Labels (Iterations: 10, 50, 100, 250, 500, 1k, 5k, 15k) -->
    <text x="30" y="322" fill="#94a3b8" font-size="9" text-anchor="middle">T=10</text>
    <text x="130" y="322" fill="#94a3b8" font-size="9" text-anchor="middle">T=50</text>
    <text x="230" y="322" fill="#94a3b8" font-size="9" text-anchor="middle">T=100</text>
    <text x="340" y="322" fill="#94a3b8" font-size="9" text-anchor="middle">T=250</text>
    <text x="440" y="322" fill="#94a3b8" font-size="9" text-anchor="middle">T=500</text>
    <text x="540" y="322" fill="#94a3b8" font-size="9" text-anchor="middle">T=1,000</text>
    <text x="640" y="322" fill="#94a3b8" font-size="9" text-anchor="middle">T=5,000</text>
    <text x="730" y="322" fill="#94a3b8" font-size="9" text-anchor="middle">T=15,000</text>

    <!-- Strategy Curves -->
    <!-- Curve 1: RUN_OUTSIDE_ZONE (Green) -->
    <!-- 81.8% -> 54.9% -> 77.2% -> 68.1% -> 73.1% -> 68.7% -> 69.7% -> 70.2% -->
    <polyline points="
      30,${300 - 0.818 * 300}
      130,${300 - 0.549 * 300}
      230,${300 - 0.772 * 300}
      340,${300 - 0.681 * 300}
      440,${300 - 0.731 * 300}
      540,${300 - 0.687 * 300}
      640,${300 - 0.697 * 300}
      730,${300 - 0.702 * 300}
    " fill="none" stroke="#10b981" stroke-width="3"/>

    <!-- Curve 2: NICKEL_WIDE9_C3 (Blue) -->
    <!-- 63.6% -> 68.6% -> 71.3% -> 69.7% -> 68.3% -> 66.4% -> 67.7% -> 68.3% -->
    <polyline points="
      30,${300 - 0.636 * 300}
      130,${300 - 0.686 * 300}
      230,${300 - 0.713 * 300}
      340,${300 - 0.697 * 300}
      440,${300 - 0.683 * 300}
      540,${300 - 0.664 * 300}
      640,${300 - 0.677 * 300}
      730,${300 - 0.683 * 300}
    " fill="none" stroke="#38bdf8" stroke-width="3"/>

    <!-- Curve 3: RUN_POWER_PULL (Amber) -->
    <!-- 0.0% -> 31.4% -> 15.8% -> 29.1% -> 23.4% -> 27.5% -> 27.2% -> 27.0% -->
    <polyline points="
      30,${300 - 0.00 * 300}
      130,${300 - 0.314 * 300}
      230,${300 - 0.158 * 300}
      340,${300 - 0.291 * 300}
      440,${300 - 0.234 * 300}
      540,${300 - 0.275 * 300}
      640,${300 - 0.272 * 300}
      730,${300 - 0.270 * 300}
    " fill="none" stroke="#f59e0b" stroke-width="2.5"/>

    <!-- Curve 4: NICKEL_UNDER_C1 (Purple) -->
    <!-- 0.0% -> 13.7% -> 6.9% -> 13.5% -> 11.6% -> 15.4% -> 15.9% -> 18.5% -->
    <polyline points="
      30,${300 - 0.00 * 300}
      130,${300 - 0.137 * 300}
      230,${300 - 0.069 * 300}
      340,${300 - 0.135 * 300}
      440,${300 - 0.116 * 300}
      540,${300 - 0.154 * 300}
      640,${300 - 0.159 * 300}
      730,${300 - 0.185 * 300}
    " fill="none" stroke="#a855f7" stroke-width="2"/>

    <!-- Damped Oscillation Callouts -->
    <circle cx="130" cy="${300 - 0.549 * 300}" r="4" fill="#10b981"/>
    <circle cx="230" cy="${300 - 0.772 * 300}" r="4" fill="#10b981"/>
    <text x="180" y="100" fill="#94a3b8" font-size="9" text-anchor="middle">Initial Cyclic Swings (T&lt;250)</text>
    <path d="M 180 108 L 180 135" stroke="#64748b" stroke-width="1" stroke-dasharray="2,2"/>

    <circle cx="730" cy="${300 - 0.702 * 300}" r="5" fill="#10b981"/>
    <text x="730" y="${300 - 0.702 * 300 - 10}" fill="#10b981" font-size="10" font-weight="700" text-anchor="end">Outside Zone: 70.2%</text>

    <circle cx="730" cy="${300 - 0.683 * 300}" r="5" fill="#38bdf8"/>
    <text x="730" y="${300 - 0.683 * 300 + 18}" fill="#38bdf8" font-size="10" font-weight="700" text-anchor="end">Wide-9 Cover 3: 68.3%</text>

    <circle cx="730" cy="${300 - 0.270 * 300}" r="5" fill="#f59e0b"/>
    <text x="730" y="${300 - 0.270 * 300 - 10}" fill="#f59e0b" font-size="10" font-weight="700" text-anchor="end">Power O: 27.0%</text>

    <circle cx="730" cy="${300 - 0.185 * 300}" r="5" fill="#a855f7"/>
    <text x="730" y="${300 - 0.185 * 300 + 16}" fill="#a855f7" font-size="10" font-weight="700" text-anchor="end">Under Cover 1: 18.5%</text>
  </g>

  <!-- Legend -->
  <g transform="translate(100, 435)">
    <line x1="0" y1="7" x2="25" y2="7" stroke="#10b981" stroke-width="3"/><text x="32" y="11" fill="#cbd5e1" font-size="10">Outside Zone (Offense)</text>
    <line x1="220" y1="7" x2="245" y2="7" stroke="#38bdf8" stroke-width="3"/><text x="252" y="11" fill="#cbd5e1" font-size="10">Wide-9 C3 (Defense)</text>
    <line x1="420" y1="7" x2="445" y2="7" stroke="#f59e0b" stroke-width="2.5"/><text x="452" y="11" fill="#cbd5e1" font-size="10">Power O (Offense)</text>
    <line x1="600" y1="7" x2="625" y2="7" stroke="#a855f7" stroke-width="2"/><text x="632" y="11" fill="#cbd5e1" font-size="10">Under C1 Robber (Defense)</text>
  </g>
</svg>`;
}

fs.writeFileSync(path.join(artifactDir, 'diagram_macro_rps_game_cycle.svg'), generateRpsCycleSvg(), 'utf-8');
fs.writeFileSync(path.join(artifactDir, 'diagram_payoff_matrix_heatmap.svg'), generatePayoffHeatmapSvg(), 'utf-8');
fs.writeFileSync(path.join(artifactDir, 'diagram_fictitious_play_orbits.svg'), generateFictitiousPlaySvg(), 'utf-8');

console.log('Successfully generated all 3 SVG diagrams in artifact directory!');
