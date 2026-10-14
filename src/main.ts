// ============================================================================
// src/main.ts
// 16-Bit Procedural Sprite Renderer, Interactive Chalkboard Route Editor,
// Personnel Rating Table, and Live 60 FPS Interpolated Field Playback
// ============================================================================

import {
  BodyArchetype,
  DefensiveCall,
  MonteCarloSummary,
  OffensiveRole,
  PlayerConfig,
  PlaySimResult,
  PRNG,
  SITUATIONS,
  SituationId,
  getMaxLateralCentripetalAccel,
  mutatePlayForRoster,
  runMonteCarloBatch,
  simulateSingleSnap,
} from './engine';

// ============================================================================
// PROCEDURAL 16-BIT PIXEL ART SPRITE GENERATOR (Zero External Assets Needed)
// ============================================================================
const spriteCache: Record<string, HTMLCanvasElement> = {};

function get16BitSprite(
  team: 'OFF' | 'DEF',
  archetype: BodyArchetype,
  frame: 0 | 1,
  highlighted: boolean
): HTMLCanvasElement {
  const key = `${team}_${archetype}_${frame}_${highlighted}`;
  if (spriteCache[key]) return spriteCache[key];

  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d')!;

  const jersey = team === 'OFF' ? '#2563eb' : '#dc2626';
  const helmet = team === 'OFF' ? '#f5b942' : '#f8fafc';
  const pants = team === 'OFF' ? '#ffffff' : '#1e293b';
  const padWidth =
    archetype === 'HEAVY_TRENCH' ? 10 :
    archetype === 'POWER_HYBRID' ? 9 :
    archetype === 'BALANCED_SKILL' ? 8 : 7;
  const x0 = Math.floor((16 - padWidth) / 2);

  // Selection halo
  if (highlighted) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x0 - 2, 1, padWidth + 4, 14);
  }

  // Dark pixel outline
  ctx.fillStyle = '#090d16';
  ctx.fillRect(x0 - 1, 2, padWidth + 2, 12);

  // Shoulder pads & Jersey torso
  ctx.fillStyle = jersey;
  ctx.fillRect(x0, 5, padWidth, 5);

  // Jersey number pixel dot
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(7, 6, 2, 3);

  // Helmet & Facemask
  ctx.fillStyle = helmet;
  ctx.fillRect(5, 2, 6, 4);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(6, 2, 4, 1);

  // Pants & animated stride legs
  ctx.fillStyle = pants;
  if (frame === 0) {
    ctx.fillRect(5, 10, 2, 3);
    ctx.fillRect(9, 11, 2, 3);
  } else {
    ctx.fillRect(5, 11, 2, 3);
    ctx.fillRect(9, 10, 2, 3);
  }

  spriteCache[key] = c;
  return c;
}

// ============================================================================
// DEFAULT OFFENSIVE & DEFENSIVE ROSTERS (11 vs 11)
// ============================================================================
function createDefaultOffense(): PlayerConfig[] {
  return [
    {
      id: 'QB', label: 'QB1', team: 'OFF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 0, y: -4.5 }, role: 'QB', readOrder: 0, waypoints: [],
      ratings: { spd: 82, acc: 84, agi: 83, str: 74, rr_thp: 91, pbk_tha: 90, bsh_tak: 40, btk_cov: 82 }
    },
    {
      id: 'LT', label: 'LT', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -3.2, y: -0.4 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: { spd: 66, acc: 72, agi: 68, str: 88, rr_thp: 40, pbk_tha: 87, bsh_tak: 50, btk_cov: 50 }
    },
    {
      id: 'LG', label: 'LG', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -1.6, y: -0.3 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: { spd: 63, acc: 70, agi: 64, str: 90, rr_thp: 40, pbk_tha: 85, bsh_tak: 50, btk_cov: 50 }
    },
    {
      id: 'C', label: 'C', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 0.0, y: -0.2 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: { spd: 65, acc: 72, agi: 67, str: 87, rr_thp: 40, pbk_tha: 88, bsh_tak: 50, btk_cov: 50 }
    },
    {
      id: 'RG', label: 'RG', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 1.6, y: -0.3 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: { spd: 64, acc: 71, agi: 65, str: 89, rr_thp: 40, pbk_tha: 84, bsh_tak: 50, btk_cov: 50 }
    },
    {
      id: 'RT', label: 'RT', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 3.2, y: -0.4 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: { spd: 65, acc: 71, agi: 66, str: 88, rr_thp: 40, pbk_tha: 85, bsh_tak: 50, btk_cov: 50 }
    },
    {
      id: 'WR1', label: 'X-WR1', team: 'OFF', archetype: 'LEAN_SPEED', eligible: true,
      startPos: { x: -17.5, y: -0.2 }, role: 'ROUTE', readOrder: 1,
      waypoints: [{ x: -17.5, y: 11.5 }, { x: -4.0, y: 12.0 }], // 12-yard Dig
      ratings: { spd: 93, acc: 92, agi: 91, str: 70, rr_thp: 92, pbk_tha: 55, bsh_tak: 40, btk_cov: 86 }
    },
    {
      id: 'SLOT', label: 'H-SLOT', team: 'OFF', archetype: 'LEAN_SPEED', eligible: true,
      startPos: { x: -8.5, y: -0.8 }, role: 'ROUTE', readOrder: 2,
      waypoints: [{ x: -8.5, y: 5.5 }, { x: -15.5, y: 6.0 }], // 5.5-yard Quick Out
      ratings: { spd: 90, acc: 94, agi: 95, str: 64, rr_thp: 94, pbk_tha: 50, bsh_tak: 40, btk_cov: 88 }
    },
    {
      id: 'TE', label: 'Y-TE', team: 'OFF', archetype: 'POWER_HYBRID', eligible: true,
      startPos: { x: 4.9, y: -0.5 }, role: 'ROUTE', readOrder: 3,
      waypoints: [{ x: 4.9, y: 9.0 }, { x: 12.5, y: 15.0 }], // Corner route
      ratings: { spd: 84, acc: 85, agi: 82, str: 84, rr_thp: 85, pbk_tha: 78, bsh_tak: 50, btk_cov: 87 }
    },
    {
      id: 'WR2', label: 'Z-WR2', team: 'OFF', archetype: 'LEAN_SPEED', eligible: true,
      startPos: { x: 16.5, y: -0.6 }, role: 'ROUTE', readOrder: 4,
      waypoints: [{ x: 16.5, y: 13.0 }, { x: 6.0, y: 22.0 }], // Deep Post
      ratings: { spd: 94, acc: 91, agi: 88, str: 68, rr_thp: 87, pbk_tha: 52, bsh_tak: 40, btk_cov: 83 }
    },
    {
      id: 'RB', label: 'RB', team: 'OFF', archetype: 'BALANCED_SKILL', eligible: true,
      startPos: { x: -2.0, y: -4.8 }, role: 'ROUTE', readOrder: 5,
      waypoints: [{ x: -7.5, y: -2.0 }, { x: -13.0, y: 3.5 }], // Checkdown Swing
      ratings: { spd: 90, acc: 92, agi: 92, str: 78, rr_thp: 78, pbk_tha: 68, bsh_tak: 45, btk_cov: 92 }
    }
  ];
}

function createDefaultDefense(): PlayerConfig[] {
  return [
    { id: 'LDE', label: 'EDGE1', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false, startPos: { x: -4.2, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 83, acc: 88, agi: 82, str: 86, rr_thp: 50, pbk_tha: 50, bsh_tak: 90, btk_cov: 65 } },
    { id: 'DT1', label: 'DT1',   team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false, startPos: { x: -1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 70, acc: 78, agi: 68, str: 92, rr_thp: 50, pbk_tha: 50, bsh_tak: 87, btk_cov: 55 } },
    { id: 'DT2', label: 'DT2',   team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false, startPos: { x: 1.4,  y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 72, acc: 79, agi: 70, str: 90, rr_thp: 50, pbk_tha: 50, bsh_tak: 86, btk_cov: 55 } },
    { id: 'RDE', label: 'EDGE2', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false, startPos: { x: 4.5,  y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 85, acc: 89, agi: 84, str: 84, rr_thp: 50, pbk_tha: 50, bsh_tak: 89, btk_cov: 65 } },
    { id: 'CB1', label: 'CB1',   team: 'DEF', archetype: 'LEAN_SPEED',   eligible: false, startPos: { x: -17.0, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 93, acc: 92, agi: 92, str: 65, rr_thp: 50, pbk_tha: 50, bsh_tak: 74, btk_cov: 90 } },
    { id: 'CB2', label: 'CB2',   team: 'DEF', archetype: 'LEAN_SPEED',   eligible: false, startPos: { x: 16.5,  y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 92, acc: 91, agi: 90, str: 66, rr_thp: 50, pbk_tha: 50, bsh_tak: 75, btk_cov: 88 } },
    { id: 'NCB', label: 'NICKEL',team: 'DEF', archetype: 'LEAN_SPEED',   eligible: false, startPos: { x: -8.5,  y: 4.8 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 90, acc: 91, agi: 91, str: 68, rr_thp: 50, pbk_tha: 50, bsh_tak: 78, btk_cov: 87 } },
    { id: 'WLB', label: 'WLB',   team: 'DEF', archetype: 'POWER_HYBRID', eligible: false, startPos: { x: -3.2,  y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 86, acc: 87, agi: 84, str: 83, rr_thp: 50, pbk_tha: 50, bsh_tak: 88, btk_cov: 80 } },
    { id: 'MLB', label: 'MLB',   team: 'DEF', archetype: 'POWER_HYBRID', eligible: false, startPos: { x: 2.2,   y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 85, acc: 86, agi: 83, str: 85, rr_thp: 50, pbk_tha: 50, bsh_tak: 90, btk_cov: 79 } },
    { id: 'SS',  label: 'SS',    team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false, startPos: { x: 6.5, y: 8.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 89, acc: 89, agi: 87, str: 78, rr_thp: 50, pbk_tha: 50, bsh_tak: 85, btk_cov: 85 } },
    { id: 'FS',  label: 'FS',    team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false, startPos: { x: 0.0, y: 13.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [], ratings: { spd: 91, acc: 90, agi: 89, str: 72, rr_thp: 50, pbk_tha: 50, bsh_tak: 80, btk_cov: 90 } }
  ];
}

// ============================================================================
// APPLICATION STATE & FIELD COORDINATE TRANSFORMS
// ============================================================================
let offenseRoster = createDefaultOffense();
const defenseRoster = createDefaultDefense();
let selectedPlayerId = 'WR1';
let currentSituationId: SituationId = '1st_10';
let currentDefCall: DefensiveCall = 'MIXED';
let lastMcSummary: MonteCarloSummary | null = null;
let activePlayResult: PlaySimResult | null = null;
let animFrameCursor = 0;
let isAnimatingSnap = false;

const fieldCanvas = document.getElementById('fieldCanvas') as HTMLCanvasElement;
const fCtx = fieldCanvas.getContext('2d')!;
const histCanvas = document.getElementById('histCanvas') as HTMLCanvasElement;
const hCtx = histCanvas.getContext('2d')!;

// Field Coordinate System: x in [-26.65, +26.65], y in [-12, +32]
const Y_MIN = -11;
const Y_MAX = 31;
const X_HALF = 26.65;

function fieldToCanvas(x: number, y: number): { cx: number; cy: number } {
  const cx = ((x + X_HALF) / (2 * X_HALF)) * fieldCanvas.width;
  const cy = fieldCanvas.height - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * fieldCanvas.height;
  return { cx, cy };
}

function canvasToField(cx: number, cy: number): { x: number; y: number } {
  const x = (cx / fieldCanvas.width) * (2 * X_HALF) - X_HALF;
  const y = Y_MIN + ((fieldCanvas.height - cy) / fieldCanvas.height) * (Y_MAX - Y_MIN);
  return {
    x: Math.round(x * 2) / 2,
    y: Math.round(y * 2) / 2,
  };
}

// ============================================================================
// RENDER ALL-22 16-BIT TURF, CHALKBOARD ROUTES & LIVE SNAP ANIMATION
// ============================================================================
function renderField(): void {
  const W = fieldCanvas.width;
  const sit = SITUATIONS[currentSituationId];

  // 1. Alternating 16-bit mowed turf bands (every 5 yards)
  for (let y = -10; y <= 30; y += 5) {
    const pTop = fieldToCanvas(-X_HALF, y + 5);
    const pBot = fieldToCanvas(-X_HALF, y);
    fCtx.fillStyle = Math.abs(Math.floor(y / 5)) % 2 === 0 ? '#14532d' : '#166534';
    fCtx.fillRect(0, pTop.cy, W, pBot.cy - pTop.cy);
  }

  // 2. Yard lines & College/NFL Hash Marks
  fCtx.strokeStyle = 'rgba(255,255,255,0.22)';
  fCtx.lineWidth = 1;
  for (let y = -10; y <= 30; y += 5) {
    const { cy } = fieldToCanvas(0, y);
    fCtx.beginPath();
    fCtx.moveTo(0, cy);
    fCtx.lineTo(W, cy);
    fCtx.stroke();
  }

  for (let y = -10; y <= 30; y += 1) {
    const leftHash = fieldToCanvas(-3.1, y);
    const rightHash = fieldToCanvas(3.1, y);
    fCtx.fillStyle = 'rgba(255,255,255,0.35)';
    fCtx.fillRect(leftHash.cx - 3, leftHash.cy, 6, 1);
    fCtx.fillRect(rightHash.cx - 3, rightHash.cy, 6, 1);
  }

  // 3. Line of Scrimmage (Blue) & Situational Goal / Line-to-Gain (Gold)
  const losY = fieldToCanvas(0, 0).cy;
  fCtx.strokeStyle = '#38bdf8';
  fCtx.lineWidth = 2;
  fCtx.beginPath();
  fCtx.moveTo(0, losY);
  fCtx.lineTo(W, losY);
  fCtx.stroke();

  const goalY = fieldToCanvas(0, sit.goalYards).cy;
  fCtx.strokeStyle = '#f5b942';
  fCtx.lineWidth = 2.5;
  fCtx.setLineDash([8, 5]);
  fCtx.beginPath();
  fCtx.moveTo(0, goalY);
  fCtx.lineTo(W, goalY);
  fCtx.stroke();
  fCtx.setLineDash([]);

  // 4. Monte Carlo Catch / Incompletion Scatter Cloud Overlay
  if (lastMcSummary && !isAnimatingSnap) {
    for (const pt of lastMcSummary.scatterPoints) {
      const { cx, cy } = fieldToCanvas(pt.x, pt.y);
      fCtx.fillStyle =
        pt.outcome === 'COMPLETE'
          ? 'rgba(34, 197, 94, 0.52)'
          : pt.outcome === 'INTERCEPTION'
          ? 'rgba(239, 68, 68, 0.85)'
          : 'rgba(148, 163, 184, 0.35)';
      fCtx.beginPath();
      fCtx.arc(cx, cy, pt.outcome === 'COMPLETE' ? 3.5 : 2.5, 0, Math.PI * 2);
      fCtx.fill();
    }
  }

  // 5. Chalkboard Route Vectors, Waypoint Handles & Chip-Block Indicators
  for (const p of offenseRoster) {
    if (!p.eligible) continue;
    const isSel = p.id === selectedPlayerId;
    const startPt = fieldToCanvas(p.startPos.x, p.startPos.y);

    if (p.role === 'PASS_BLOCK') {
      fCtx.strokeStyle = '#f59e0b';
      fCtx.lineWidth = 2.5;
      fCtx.beginPath();
      fCtx.moveTo(startPt.cx, startPt.cy);
      fCtx.lineTo(startPt.cx, startPt.cy - 14);
      fCtx.moveTo(startPt.cx - 7, startPt.cy - 14);
      fCtx.lineTo(startPt.cx + 7, startPt.cy - 14);
      fCtx.stroke();
      continue;
    }

    const routeColor =
      p.readOrder === 1
        ? '#facc15'
        : p.readOrder === 2
        ? '#38bdf8'
        : p.readOrder === 3
        ? '#a855f7'
        : '#cbd5e1';

    fCtx.strokeStyle = routeColor;
    fCtx.lineWidth = isSel ? 3.0 : 2.0;
    if (p.role === 'CHIP_RELEASE') fCtx.setLineDash([4, 3]);

    fCtx.beginPath();
    fCtx.moveTo(startPt.cx, startPt.cy);
    for (const wp of p.waypoints) {
      const cWp = fieldToCanvas(wp.x, wp.y);
      fCtx.lineTo(cWp.cx, cWp.cy);
    }
    fCtx.stroke();
    fCtx.setLineDash([]);

    // Draw interactive waypoint handles
    for (let i = 0; i < p.waypoints.length; i++) {
      const cWp = fieldToCanvas(p.waypoints[i].x, p.waypoints[i].y);
      fCtx.fillStyle = isSel ? '#ffffff' : routeColor;
      fCtx.beginPath();
      fCtx.arc(cWp.cx, cWp.cy, isSel ? 5.5 : 3.5, 0, Math.PI * 2);
      fCtx.fill();
      if (isSel) {
        fCtx.strokeStyle = '#090d16';
        fCtx.lineWidth = 1.5;
        fCtx.stroke();
      }
    }
  }

  // 6. Render 22 Players (Static Pre-Snap OR Interpolated 60 FPS Live Simulation)
  if (isAnimatingSnap && activePlayResult && activePlayResult.snapshots.length > 0) {
    const maxIdx = activePlayResult.snapshots.length - 1;
    const exactIdx = Math.min(maxIdx, animFrameCursor);
    const i0 = Math.floor(exactIdx);
    const i1 = Math.min(maxIdx, i0 + 1);
    const alpha = exactIdx - i0;

    const snap0 = activePlayResult.snapshots[i0];
    const snap1 = activePlayResult.snapshots[i1];

    // Draw QB Pocket Pressure Halo
    const qb0 = snap0.agents[0];
    const qbC = fieldToCanvas(qb0.x, qb0.y);
    if (snap0.ballState === 'HELD' && snap0.pocketPressure > 0.25) {
      fCtx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.45, snap0.pocketPressure * 0.22)})`;
      fCtx.beginPath();
      fCtx.arc(qbC.cx, qbC.cy, 28, 0, Math.PI * 2);
      fCtx.fill();
    }

    const strideFrame: 0 | 1 = Math.floor(snap0.tick / 2) % 2 === 0 ? 0 : 1;

    for (let aIdx = 0; aIdx < snap0.agents.length; aIdx++) {
      const a0 = snap0.agents[aIdx];
      const a1 = snap1.agents[aIdx];
      const ix = a0.x + (a1.x - a0.x) * alpha;
      const iy = a0.y + (a1.y - a0.y) * alpha;
      const { cx, cy } = fieldToCanvas(ix, iy);

      const spr = get16BitSprite(a0.team, a0.archetype, strideFrame, a0.id === selectedPlayerId);
      fCtx.drawImage(spr, cx - 12, cy - 12, 24, 24);

      // Show shed or block clash ring
      if (a0.engaged) {
        fCtx.strokeStyle = 'rgba(245, 185, 66, 0.7)';
        fCtx.lineWidth = 1.5;
        fCtx.strokeRect(cx - 11, cy - 11, 22, 22);
      }
    }

    // Draw Football in flight or carried
    const bx = snap0.ballPos.x + (snap1.ballPos.x - snap0.ballPos.x) * alpha;
    const by = snap0.ballPos.y + (snap1.ballPos.y - snap0.ballPos.y) * alpha;
    const bCanvas = fieldToCanvas(bx, by);

    if (snap0.ballState === 'IN_FLIGHT') {
      const tCanvas = fieldToCanvas(snap0.ballTargetPos.x, snap0.ballTargetPos.y);
      fCtx.strokeStyle = '#facc15';
      fCtx.lineWidth = 1.5;
      fCtx.beginPath();
      fCtx.arc(tCanvas.cx, tCanvas.cy, 7, 0, Math.PI * 2);
      fCtx.stroke();
    }

    fCtx.fillStyle = '#92400e';
    fCtx.strokeStyle = '#ffffff';
    fCtx.lineWidth = 1.5;
    fCtx.beginPath();
    fCtx.ellipse(bCanvas.cx, bCanvas.cy, 5, 3.2, 0.4, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.stroke();

    document.getElementById('clockReadout')!.textContent =
      `t = ${snap0.time.toFixed(2)} s | Read #${snap0.qbReadOrder} | Pressure: ${snap0.pocketPressure.toFixed(2)}`;
  } else {
    // Static Pre-Snap Alignment
    const previewSnap = simulateSingleSnap(
      offenseRoster,
      defenseRoster,
      currentDefCall === 'MIXED' ? 'COV3' : currentDefCall,
      sit,
      new PRNG(101),
      true
    ).snapshots[0];

    for (const a of previewSnap.agents) {
      const { cx, cy } = fieldToCanvas(a.x, a.y);
      const spr = get16BitSprite(a.team, a.archetype, 0, a.id === selectedPlayerId);
      fCtx.drawImage(spr, cx - 12, cy - 12, 24, 24);

      fCtx.fillStyle = a.team === 'OFF' ? '#e2e8f0' : '#fca5a5';
      fCtx.font = 'bold 9px monospace';
      fCtx.textAlign = 'center';
      fCtx.fillText(a.label, cx, cy + 19);
    }

    // Read order badges on eligible receivers
    for (const p of offenseRoster) {
      if (!p.eligible || p.role === 'PASS_BLOCK') continue;
      const { cx, cy } = fieldToCanvas(p.startPos.x, p.startPos.y);
      fCtx.fillStyle = '#090d16';
      fCtx.fillRect(cx + 8, cy - 14, 14, 12);
      fCtx.fillStyle = '#f5b942';
      fCtx.font = 'bold 9px monospace';
      fCtx.fillText(`R${p.readOrder}`, cx + 15, cy - 5);
    }
  }
}

// ============================================================================
// RENDER MONTE CARLO EPA HISTOGRAM
// ============================================================================
function renderHistogram(summary: MonteCarloSummary): void {
  const W = histCanvas.width;
  const H = histCanvas.height;
  hCtx.clearRect(0, 0, W, H);

  const bins = 24;
  const minEpa = -4.5;
  const maxEpa = 4.5;
  const counts = new Array(bins).fill(0);

  for (const v of summary.epaSamples) {
    const idx = Math.max(0, Math.min(bins - 1, Math.floor(((v - minEpa) / (maxEpa - minEpa)) * bins)));
    counts[idx]++;
  }
  const maxCount = Math.max(1, ...counts);
  const barW = (W - 40) / bins;

  // Zero EPA vertical divider
  const zeroX = 20 + ((0 - minEpa) / (maxEpa - minEpa)) * (W - 40);
  hCtx.strokeStyle = '#64748b';
  hCtx.setLineDash([4, 4]);
  hCtx.beginPath();
  hCtx.moveTo(zeroX, 10);
  hCtx.lineTo(zeroX, H - 24);
  hCtx.stroke();
  hCtx.setLineDash([]);

  for (let b = 0; b < bins; b++) {
    const binCenter = minEpa + ((b + 0.5) / bins) * (maxEpa - minEpa);
    const barH = (counts[b] / maxCount) * (H - 42);
    const x = 20 + b * barW;
    const y = H - 24 - barH;

    hCtx.fillStyle = binCenter >= 0 ? '#22c55e' : '#ef4444';
    hCtx.fillRect(x + 1, y, barW - 2, barH);
  }

  hCtx.fillStyle = '#94a3b8';
  hCtx.font = '10px monospace';
  hCtx.fillText('-4.5 EPA (Pick/Sack)', 20, H - 6);
  hCtx.fillText('0.0 EPA', zeroX - 20, H - 6);
  hCtx.fillText('+4.5 EPA (Explosive)', W - 135, H - 6);
}

// ============================================================================
// UI SYNCHRONIZATION, INSPECTOR & ROSTER RATING TABLE
// ============================================================================
function updateKpiStrip(s: MonteCarloSummary): void {
  const epaEl = document.getElementById('kpiEpa')!;
  epaEl.textContent = `${s.meanEpa >= 0 ? '+' : ''}${s.meanEpa.toFixed(2)}`;
  epaEl.style.color = s.meanEpa >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  document.getElementById('kpiCvar')!.textContent = `CVaR₁₀: ${s.cvar10Epa.toFixed(2)}`;
  document.getElementById('kpiStd')!.textContent = s.stdEpa.toFixed(2);
  document.getElementById('kpiVar')!.textContent = `σ²: ${s.varEpa.toFixed(2)}`;

  const sit = SITUATIONS[currentSituationId];
  document.getElementById('kpiGoal')!.textContent = `${s.goalSuccessRate.toFixed(1)}%`;
  document.getElementById('kpiGoalLabel')!.textContent = `Target: +${sit.goalYards.toFixed(1)}y`;

  document.getElementById('kpiComp')!.textContent = `${s.completionRate.toFixed(1)}%`;
  document.getElementById('kpiYards')!.textContent = `Avg: ${s.avgYards >= 0 ? '+' : ''}${s.avgYards.toFixed(1)} yds`;

  document.getElementById('kpiSack')!.textContent = `${s.sackRate.toFixed(1)}%`;
  document.getElementById('kpiThrowTime')!.textContent = `TTT: ${s.avgTimeToThrow.toFixed(2)}s`;

  document.getElementById('kpiInt')!.textContent = `${s.intRate.toFixed(1)}%`;
  document.getElementById('kpiCheckdown')!.textContent = `Read #1: ${s.primaryReadShare.toFixed(0)}%`;

  renderHistogram(s);
}

function syncInspectorPanel(): void {
  const p = offenseRoster.find((x) => x.id === selectedPlayerId) || offenseRoster[6];
  document.getElementById('inspPlayerTitle')!.textContent = `Selected Player: ${p.label} (${p.id})`;

  const aLat = getMaxLateralCentripetalAccel(p.ratings.agi, p.ratings.rr_thp);
  const rMinAt9 = (9.0 * 9.0) / aLat;
  document.getElementById('inspTurnPhysics')!.textContent =
    `SPD: ${p.ratings.spd} | AGI: ${p.ratings.agi} | Min Turn Radius @ 9yd/s: ${rMinAt9.toFixed(2)} yds`;

  const roleSel = document.getElementById('inspRole') as HTMLSelectElement;
  const readSel = document.getElementById('inspRead') as HTMLSelectElement;
  const splitIn = document.getElementById('inspSplitX') as HTMLInputElement;

  roleSel.disabled = !p.eligible;
  readSel.disabled = !p.eligible;
  if (p.eligible) {
    roleSel.value = p.role;
    readSel.value = String(p.readOrder);
  }
  splitIn.value = String(p.startPos.x);
}

function buildRosterTable(): void {
  const tbody = document.getElementById('rosterTableBody')!;
  tbody.innerHTML = '';

  const allPlayers = [...offenseRoster, ...defenseRoster];
  const ratingKeys: (keyof PlayerConfig['ratings'])[] = [
    'spd', 'acc', 'agi', 'str', 'rr_thp', 'pbk_tha', 'bsh_tak', 'btk_cov'
  ];

  for (const p of allPlayers) {
    const tr = document.createElement('tr');
    if (p.id === selectedPlayerId) tr.classList.add('selected-row');

    tr.innerHTML = `
      <td style="font-weight:800; color:${p.team === 'OFF' ? '#38bdf8' : '#f87171'}; cursor:pointer;">${p.id}</td>
      <td>${p.label} (${p.team})</td>
    `;
    tr.children[0].addEventListener('click', () => {
      if (p.team === 'OFF') {
        selectedPlayerId = p.id;
        syncInspectorPanel();
        buildRosterTable();
        renderField();
      }
    });

    for (const k of ratingKeys) {
      const td = document.createElement('td');
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '40';
      inp.max = '99';
      inp.value = String(p.ratings[k]);
      inp.addEventListener('change', () => {
        p.ratings[k] = Math.max(40, Math.min(99, Number(inp.value) || 70));
        syncInspectorPanel();
        triggerFastMonteCarloUpdate();
      });
      td.appendChild(inp);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }
}

function triggerFastMonteCarloUpdate(): void {
  const sit = SITUATIONS[currentSituationId];
  lastMcSummary = runMonteCarloBatch(offenseRoster, defenseRoster, currentDefCall, sit, 400, 42069);
  updateKpiStrip(lastMcSummary);
  renderField();
}

// ============================================================================
// INTERACTIVE CANVAS ROUTE DRAWING & WAYPOINT DRAGGING
// ============================================================================
let draggingWaypointIdx: number | null = null;

fieldCanvas.addEventListener('mousedown', (e) => {
  const rect = fieldCanvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (fieldCanvas.width / rect.width);
  const cy = (e.clientY - rect.top) * (fieldCanvas.height / rect.height);
  const pt = canvasToField(cx, cy);

  // 1. Check if clicking an existing waypoint of the selected player
  const selPlayer = offenseRoster.find((p) => p.id === selectedPlayerId);
  if (selPlayer && selPlayer.eligible) {
    for (let i = 0; i < selPlayer.waypoints.length; i++) {
      const cWp = fieldToCanvas(selPlayer.waypoints[i].x, selPlayer.waypoints[i].y);
      if (Math.hypot(cx - cWp.cx, cy - cWp.cy) < 11) {
        draggingWaypointIdx = i;
        return;
      }
    }
  }

  // 2. Check if clicking an offensive player sprite to select them
  for (const p of offenseRoster) {
    const cPos = fieldToCanvas(p.startPos.x, p.startPos.y);
    if (Math.hypot(cx - cPos.cx, cy - cPos.cy) < 15) {
      selectedPlayerId = p.id;
      syncInspectorPanel();
      buildRosterTable();
      renderField();
      return;
    }
  }

  // 3. Otherwise, move/set route break or endpoint for selected eligible receiver
  if (selPlayer && selPlayer.eligible && selPlayer.role !== 'PASS_BLOCK') {
    if (selPlayer.waypoints.length < 2) {
      selPlayer.waypoints.push({ x: pt.x, y: pt.y });
    } else {
      // Move nearest node (stem node vs final node)
      const d0 = Math.hypot(pt.x - selPlayer.waypoints[0].x, pt.y - selPlayer.waypoints[0].y);
      const d1 = Math.hypot(pt.x - selPlayer.waypoints[1].x, pt.y - selPlayer.waypoints[1].y);
      const targetNode = d0 < d1 ? 0 : 1;
      selPlayer.waypoints[targetNode] = { x: pt.x, y: pt.y };
      draggingWaypointIdx = targetNode;
    }
    isAnimatingSnap = false;
    triggerFastMonteCarloUpdate();
  }
});

window.addEventListener('mousemove', (e) => {
  if (draggingWaypointIdx === null) return;
  const selPlayer = offenseRoster.find((p) => p.id === selectedPlayerId);
  if (!selPlayer) return;

  const rect = fieldCanvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (fieldCanvas.width / rect.width);
  const cy = (e.clientY - rect.top) * (fieldCanvas.height / rect.height);
  const pt = canvasToField(cx, cy);

  selPlayer.waypoints[draggingWaypointIdx] = {
    x: Math.max(-25, Math.min(25, pt.x)),
    y: Math.max(-5, Math.min(29, pt.y)),
  };
  renderField();
});

window.addEventListener('mouseup', () => {
  if (draggingWaypointIdx !== null) {
    draggingWaypointIdx = null;
    triggerFastMonteCarloUpdate();
  }
});

// ============================================================================
// UI CONTROLS, PRESET CONCEPTS & ANIMATION LOOP
// ============================================================================
let snapSeedCounter = 1001;

function playSingleSnapAnimated(): void {
  const sit = SITUATIONS[currentSituationId];
  snapSeedCounter += 13;
  activePlayResult = simulateSingleSnap(
    offenseRoster,
    defenseRoster,
    currentDefCall,
    sit,
    new PRNG(snapSeedCounter),
    true
  );

  document.getElementById('livePlayCommentary')!.textContent = activePlayResult.commentary;
  const badge = document.getElementById('lastSnapOutcomeBadge')!;
  badge.textContent = `${activePlayResult.outcome} (${activePlayResult.yardsGained >= 0 ? '+' : ''}${activePlayResult.yardsGained.toFixed(1)}y | ${activePlayResult.epa >= 0 ? '+' : ''}${activePlayResult.epa.toFixed(2)} EPA)`;
  badge.style.color = activePlayResult.epa >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  animFrameCursor = 0;
  isAnimatingSnap = true;

  const stepAnimation = () => {
    if (!isAnimatingSnap || !activePlayResult) return;
    renderField();
    animFrameCursor += 0.34; // 60 FPS smooth interpolation of 20 Hz physics ticks
    if (animFrameCursor < activePlayResult.snapshots.length - 1) {
      requestAnimationFrame(stepAnimation);
    } else {
      isAnimatingSnap = false;
    }
  };
  requestAnimationFrame(stepAnimation);
}

// Bind Top Bar & Inspector Events
document.getElementById('selSituation')!.addEventListener('change', (e) => {
  currentSituationId = (e.target as HTMLSelectElement).value as SituationId;
  triggerFastMonteCarloUpdate();
});

document.getElementById('selDefense')!.addEventListener('change', (e) => {
  currentDefCall = (e.target as HTMLSelectElement).value as DefensiveCall;
  triggerFastMonteCarloUpdate();
});

document.getElementById('btnPlayOne')!.addEventListener('click', () => {
  playSingleSnapAnimated();
});

document.getElementById('btnRunMC')!.addEventListener('click', () => {
  isAnimatingSnap = false;
  triggerFastMonteCarloUpdate();
  document.getElementById('livePlayCommentary')!.textContent =
    `Completed 400 time-explicit 20 Hz simulations: Mean EPA = ${lastMcSummary!.meanEpa.toFixed(2)}, StdDev σ = ${lastMcSummary!.stdEpa.toFixed(2)}, Goal Success = ${lastMcSummary!.goalSuccessRate.toFixed(1)}%, Sack Rate = ${lastMcSummary!.sackRate.toFixed(1)}%.`;
});

document.getElementById('btnMutate')!.addEventListener('click', () => {
  isAnimatingSnap = false;
  const sit = SITUATIONS[currentSituationId];
  const res = mutatePlayForRoster(offenseRoster, defenseRoster, currentDefCall, sit, 20, 120);
  offenseRoster = res.optimizedOffense;
  lastMcSummary = res.finalSummary;
  updateKpiStrip(lastMcSummary);
  syncInspectorPanel();
  buildRosterTable();
  renderField();

  const logText = res.logs
    .map(
      (l) =>
        `[Gen ${String(l.generation).padStart(2, '0')}] Score=${l.objectiveScore.toFixed(2)} | μ_EPA=${l.meanEpa >= 0 ? '+' : ''}${l.meanEpa.toFixed(2)} (σ=${l.stdEpa.toFixed(2)}) | Goal=${l.goalRate.toFixed(1)}% | Sack=${l.sackRate.toFixed(1)}%\n   ↳ ${l.changeDescription}`
    )
    .join('\n\n');

  document.getElementById('mutationLogBox')!.textContent = logText;
  document.getElementById('livePlayCommentary')!.textContent = logText;
});

document.getElementById('inspRole')!.addEventListener('change', (e) => {
  const p = offenseRoster.find((x) => x.id === selectedPlayerId);
  if (p && p.eligible) {
    p.role = (e.target as HTMLSelectElement).value as OffensiveRole;
    triggerFastMonteCarloUpdate();
  }
});

document.getElementById('inspRead')!.addEventListener('change', (e) => {
  const p = offenseRoster.find((x) => x.id === selectedPlayerId);
  if (p && p.eligible) {
    p.readOrder = Number((e.target as HTMLSelectElement).value);
    triggerFastMonteCarloUpdate();
  }
});

document.getElementById('inspSplitX')!.addEventListener('change', (e) => {
  const p = offenseRoster.find((x) => x.id === selectedPlayerId);
  if (p) {
    const newX = Math.max(-24, Math.min(24, Number((e.target as HTMLInputElement).value)));
    const dx = newX - p.startPos.x;
    p.startPos.x = newX;
    p.waypoints.forEach((w) => (w.x += dx));
    triggerFastMonteCarloUpdate();
  }
});

document.getElementById('inspPresetRoute')!.addEventListener('change', (e) => {
  const val = (e.target as HTMLSelectElement).value;
  const p = offenseRoster.find((x) => x.id === selectedPlayerId);
  if (!p || !p.eligible || !val) return;

  const x0 = p.startPos.x;
  const insideDir = x0 < 0 ? 1 : -1;
  const outsideDir = -insideDir;

  p.role = 'ROUTE';
  if (val === 'SLANT') p.waypoints = [{ x: x0, y: 3.0 }, { x: x0 + insideDir * 8.5, y: 9.0 }];
  if (val === 'OUT_5') p.waypoints = [{ x: x0, y: 5.0 }, { x: x0 + outsideDir * 7.0, y: 5.0 }];
  if (val === 'WHIP') p.waypoints = [{ x: x0 + insideDir * 2.5, y: 5.5 }, { x: x0 + outsideDir * 5.5, y: 6.0 }];
  if (val === 'DIG_12') p.waypoints = [{ x: x0, y: 12.0 }, { x: x0 + insideDir * 11.0, y: 12.0 }];
  if (val === 'CORNER_10') p.waypoints = [{ x: x0, y: 9.5 }, { x: x0 + outsideDir * 8.0, y: 17.5 }];
  if (val === 'POST_14') p.waypoints = [{ x: x0, y: 13.5 }, { x: x0 + insideDir * 9.0, y: 23.0 }];
  if (val === 'GO') p.waypoints = [{ x: x0, y: 12.0 }, { x: x0, y: 26.0 }];
  if (val === 'SWING') p.waypoints = [{ x: x0 + outsideDir * 6.5, y: -2.0 }, { x: x0 + outsideDir * 12.0, y: 4.5 }];

  (e.target as HTMLSelectElement).value = '';
  syncInspectorPanel();
  triggerFastMonteCarloUpdate();
});

// Concept Play Presets
document.getElementById('btnClearNodes')!.addEventListener('click', () => {
  const p = offenseRoster.find((x) => x.id === selectedPlayerId);
  if (p && p.eligible) {
    p.waypoints = [{ x: p.startPos.x, y: 8.0 }, { x: p.startPos.x, y: 18.0 }];
    triggerFastMonteCarloUpdate();
  }
});

document.getElementById('btnLoadConceptMesh')!.addEventListener('click', () => {
  offenseRoster = createDefaultOffense();
  // Air Raid Mesh: Slot & TE shallow cross at 5.5y, X-WR 10y sit, Z-WR wheel/corner
  offenseRoster[6].waypoints = [{ x: -17.5, y: 10.0 }, { x: -12.0, y: 10.5 }]; // WR1
  offenseRoster[7].waypoints = [{ x: -6.0, y: 4.8 }, { x: 10.0, y: 5.5 }];     // SLOT shallow mesh
  offenseRoster[8].waypoints = [{ x: 3.0, y: 5.2 }, { x: -10.0, y: 6.0 }];     // TE shallow mesh
  offenseRoster[9].waypoints = [{ x: 16.5, y: 9.5 }, { x: 22.0, y: 16.5 }];    // WR2 Corner
  offenseRoster[7].readOrder = 1;
  offenseRoster[8].readOrder = 2;
  offenseRoster[9].readOrder = 3;
  triggerFastMonteCarloUpdate();
});

document.getElementById('btnLoadConceptDagger')!.addEventListener('click', () => {
  offenseRoster = createDefaultOffense();
  // 7-Step Dagger: Slot clears deep seam, X-WR runs 14y deep dig behind it
  offenseRoster[7].waypoints = [{ x: -8.5, y: 12.0 }, { x: -4.0, y: 24.0 }];  // Slot Clear Seam
  offenseRoster[6].waypoints = [{ x: -17.5, y: 14.0 }, { x: -2.0, y: 14.5 }]; // X-WR Deep Dig
  offenseRoster[8].role = 'CHIP_RELEASE';
  offenseRoster[6].readOrder = 1;
  offenseRoster[7].readOrder = 2;
  triggerFastMonteCarloUpdate();
});

document.getElementById('btnLoadConceptStick')!.addEventListener('click', () => {
  offenseRoster = createDefaultOffense();
  // Quick Stick: TE 5y hitch/out, Slot quick flat, X-WR slant
  offenseRoster[8].waypoints = [{ x: 4.9, y: 5.5 }, { x: 8.0, y: 5.5 }];
  offenseRoster[7].waypoints = [{ x: -8.5, y: 3.5 }, { x: -2.5, y: 6.5 }];
  offenseRoster[6].waypoints = [{ x: -17.5, y: 3.5 }, { x: -10.0, y: 7.5 }];
  offenseRoster[8].readOrder = 1;
  offenseRoster[7].readOrder = 2;
  offenseRoster[6].readOrder = 3;
  triggerFastMonteCarloUpdate();
});

// Personnel Roster Archetype Buttons
document.getElementById('btnPresetBalanced')!.addEventListener('click', () => {
  offenseRoster = createDefaultOffense();
  buildRosterTable();
  syncInspectorPanel();
  triggerFastMonteCarloUpdate();
});

document.getElementById('btnPresetWeakOL')!.addEventListener('click', () => {
  offenseRoster = createDefaultOffense();
  offenseRoster[1].ratings.pbk_tha = 58; // Weak LT Pass Block
  offenseRoster[1].ratings.str = 66;
  offenseRoster[5].ratings.pbk_tha = 62; // Weak RT Pass Block
  offenseRoster[7].ratings.agi = 98;     // Elite Slot WR
  offenseRoster[7].ratings.rr_thp = 97;
  buildRosterTable();
  syncInspectorPanel();
  triggerFastMonteCarloUpdate();
});

document.getElementById('btnPresetTrackBurners')!.addEventListener('click', () => {
  for (const p of offenseRoster) {
    if (p.eligible) {
      p.ratings.spd = 99;
      p.ratings.acc = 97;
      p.ratings.agi = 64; // Stiff hips: huge turning radius on sharp cuts!
      p.ratings.rr_thp = 65;
    }
  }
  buildRosterTable();
  syncInspectorPanel();
  triggerFastMonteCarloUpdate();
});

document.getElementById('btnPresetTechnicians')!.addEventListener('click', () => {
  for (const p of offenseRoster) {
    if (p.eligible) {
      p.ratings.spd = 84;
      p.ratings.acc = 88;
      p.ratings.agi = 98; // Elite lateral cut physics
      p.ratings.rr_thp = 98;
    }
  }
  buildRosterTable();
  syncInspectorPanel();
  triggerFastMonteCarloUpdate();
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    const tabId = (btn as HTMLElement).dataset.tab!;
    document.getElementById(tabId)!.classList.add('active');
  });
});

// Initialize Application
syncInspectorPanel();
buildRosterTable();
triggerFastMonteCarloUpdate();
