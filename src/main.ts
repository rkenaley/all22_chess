// ============================================================================
// src/main.ts
// 16-Bit Procedural Sprite Renderer, All-22 Interactive Chalkboard,
// Eagles vs Jaguars Rosters, Pre-Snap Motion & Tells, Downfield Laterals
// ============================================================================

import {
  BodyArchetype,
  DefFront,
  DefensiveCall,
  MonteCarloSummary,
  OffFormationId,
  OffensiveRole,
  PlayerConfig,
  PlaySimResult,
  PRNG,
  PreSnapMotionId,
  SITUATIONS,
  SituationId,
  getMaxLateralCentripetalAccel,
  makeRatings,
  mutatePlayForRoster,
  runMonteCarloBatch,
  simulateSingleSnap,
} from './engine';

// ============================================================================
// PROCEDURAL 16-BIT PIXEL ART SPRITES (Zero External Assets)
// Team Colors: Philadelphia Eagles (Midnight Green / Silver) vs Jaguars (Teal / Gold)
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

  // Eagles: Midnight Green jersey, Silver helmet, White pants
  // Jaguars: Teal jersey, Gold/Black helmet, Black pants
  const jersey = team === 'OFF' ? '#004c54' : '#006778';
  const helmet = team === 'OFF' ? '#a5acaf' : '#d7a22a';
  const pants = team === 'OFF' ? '#ffffff' : '#101820';

  const padWidth =
    archetype === 'HEAVY_TRENCH' ? 10 :
    archetype === 'POWER_HYBRID' ? 9 :
    archetype === 'BALANCED_SKILL' ? 8 : 7;
  const x0 = Math.floor((16 - padWidth) / 2);

  // Selection highlight halo
  if (highlighted) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x0 - 2, 1, padWidth + 4, 14);
  }

  // Pixel outline
  ctx.fillStyle = '#050b14';
  ctx.fillRect(x0 - 1, 2, padWidth + 2, 12);

  // Shoulder pads & Jersey torso
  ctx.fillStyle = jersey;
  ctx.fillRect(x0, 5, padWidth, 5);

  // Number / chest dot
  ctx.fillStyle = team === 'OFF' ? '#ffffff' : '#d7a22a';
  ctx.fillRect(7, 6, 2, 3);

  // Helmet & Facemask
  ctx.fillStyle = helmet;
  ctx.fillRect(5, 2, 6, 4);
  ctx.fillStyle = '#334155';
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
// DEFAULT ROSTER: PHILADELPHIA EAGLES (OFFENSE)
// ============================================================================
export function createEaglesOffense(): PlayerConfig[] {
  return [
    {
      id: 'QB', label: 'QB', name: 'Jalen Hurts', team: 'OFF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 0, y: -4.5 }, role: 'QB', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 86, acc: 88, agi: 86, str: 84,
        thp: 92, tha_short: 90, tha_deep: 87, tup_pressure: 88,
        qb_read_speed: 86, pre_snap_read: 89, btk_power: 88, elusiveness: 85
      })
    },
    {
      id: 'LT', label: 'LT', name: 'Jordan Mailata', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -3.2, y: -0.4 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 68, acc: 74, agi: 72, str: 98,
        pbk_anchor: 97, pbk_lateral: 93, rbk_power: 98, rbk_reach: 90
      })
    },
    {
      id: 'LG', label: 'LG', name: 'Landon Dickerson', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -1.6, y: -0.3 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 64, acc: 70, agi: 66, str: 97,
        pbk_anchor: 96, pbk_lateral: 88, rbk_power: 97, rbk_reach: 89
      })
    },
    {
      id: 'C', label: 'C', name: 'Cam Jurgens', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 0.0, y: -0.2 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 73, acc: 78, agi: 76, str: 89,
        pbk_anchor: 90, pbk_lateral: 91, rbk_power: 91, rbk_reach: 95
      })
    },
    {
      id: 'RG', label: 'RG', name: 'Tyler Steen', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 1.6, y: -0.3 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 66, acc: 72, agi: 68, str: 90,
        pbk_anchor: 86, pbk_lateral: 84, rbk_power: 88, rbk_reach: 84
      })
    },
    {
      id: 'RT', label: 'RT', name: 'Lane Johnson', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 3.2, y: -0.4 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 75, acc: 81, agi: 79, str: 96,
        pbk_anchor: 98, pbk_lateral: 98, rbk_power: 96, rbk_reach: 93
      })
    },
    {
      id: 'WR1', label: 'X-WR1', name: 'A.J. Brown', team: 'OFF', archetype: 'POWER_HYBRID', eligible: true,
      startPos: { x: -17.5, y: -0.2 }, role: 'ROUTE', readOrder: 1,
      waypoints: [{ x: -17.5, y: 11.5 }, { x: -4.0, y: 12.0 }], // 12y Dig
      ratings: makeRatings({
        spd: 93, acc: 93, agi: 91, str: 89,
        rr_short: 92, rr_deep: 95, catch_traffic: 98, catch_radius: 95,
        btk_power: 94, elusiveness: 87, lateral_vision: 84
      })
    },
    {
      id: 'SLOT', label: 'H-SLOT', name: 'DeVonta Smith', team: 'OFF', archetype: 'LEAN_SPEED', eligible: true,
      startPos: { x: -8.5, y: -0.8 }, role: 'ROUTE', readOrder: 2,
      waypoints: [{ x: -8.5, y: 5.5 }, { x: -15.5, y: 6.0 }], // 5.5y Out
      ratings: makeRatings({
        spd: 94, acc: 96, agi: 98, str: 64,
        rr_short: 98, rr_deep: 97, catch_traffic: 91, catch_radius: 94,
        btk_power: 72, elusiveness: 95, lateral_vision: 88
      })
    },
    {
      id: 'TE', label: 'Y-TE', name: 'Dallas Goedert', team: 'OFF', archetype: 'POWER_HYBRID', eligible: true,
      startPos: { x: 4.9, y: -0.5 }, role: 'ROUTE', readOrder: 3,
      waypoints: [{ x: 4.9, y: 9.0 }, { x: 12.5, y: 15.0 }], // Corner
      ratings: makeRatings({
        spd: 85, acc: 86, agi: 84, str: 86,
        pbk_anchor: 84, pbk_lateral: 82, rbk_power: 87,
        rr_short: 88, rr_deep: 86, catch_traffic: 92, btk_power: 89, lateral_vision: 86
      })
    },
    {
      id: 'WR2', label: 'Z-WR2', name: 'Jahan Dotson', team: 'OFF', archetype: 'LEAN_SPEED', eligible: true,
      startPos: { x: 16.5, y: -0.6 }, role: 'ROUTE', readOrder: 4,
      waypoints: [{ x: 16.5, y: 13.0 }, { x: 6.0, y: 22.0 }], // Post
      ratings: makeRatings({
        spd: 93, acc: 93, agi: 92, str: 66,
        rr_short: 88, rr_deep: 89, catch_traffic: 86, catch_radius: 88,
        btk_power: 74, elusiveness: 89, lateral_vision: 80
      })
    },
    {
      id: 'RB', label: 'RB', name: 'Saquon Barkley', team: 'OFF', archetype: 'BALANCED_SKILL', eligible: true,
      startPos: { x: -2.0, y: -4.8 }, role: 'ROUTE', readOrder: 5,
      waypoints: [{ x: -7.5, y: -2.0 }, { x: -13.0, y: 3.5 }], // Swing
      ratings: makeRatings({
        spd: 95, acc: 96, agi: 97, str: 88,
        pbk_anchor: 78, pbk_lateral: 82, rr_short: 89, catch_traffic: 87,
        btk_power: 97, elusiveness: 98, lateral_vision: 94
      })
    }
  ];
}

// ============================================================================
// DEFAULT ROSTER: JACKSONVILLE JAGUARS (DEFENSE)
// ============================================================================
export function createJaguarsDefense(): PlayerConfig[] {
  return [
    {
      id: 'LDE', label: 'EDGE1', name: 'Josh Hines-Allen', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -4.2, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 88, acc: 92, agi: 88, str: 89,
        rush_power: 95, rush_speed: 96, bsh_shed: 94, tak_wrap: 89, tak_hit_power: 91
      })
    },
    {
      id: 'DT1', label: 'DT1', name: 'Arik Armstead', team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 73, acc: 80, agi: 74, str: 94,
        rush_power: 92, rush_speed: 84, bsh_shed: 91, tak_wrap: 88
      })
    },
    {
      id: 'DT2', label: 'DT2', name: 'DaVon Hamilton', team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 69, acc: 76, agi: 68, str: 95,
        rush_power: 91, rush_speed: 72, bsh_shed: 90, tak_wrap: 89
      })
    },
    {
      id: 'RDE', label: 'EDGE2', name: 'Travon Walker', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 4.5, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 90, acc: 93, agi: 89, str: 92,
        rush_power: 94, rush_speed: 92, bsh_shed: 91, tak_wrap: 90, tak_hit_power: 93
      })
    },
    {
      id: 'CB1', label: 'CB1', name: 'Tyson Campbell', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: -17.0, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 95, acc: 94, agi: 93, str: 73,
        press_jam: 92, cov_man: 93, cov_zone: 89, catch_contest: 92, tak_wrap: 83
      })
    },
    {
      id: 'CB2', label: 'CB2', name: 'Ronald Darby', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: 16.5, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 93, acc: 92, agi: 91, str: 66,
        press_jam: 83, cov_man: 88, cov_zone: 87, catch_contest: 87, tak_wrap: 79
      })
    },
    {
      id: 'NCB', label: 'NICKEL', name: 'Jarrian Jones', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: -8.5, y: 4.8 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 94, acc: 94, agi: 93, str: 69,
        press_jam: 86, cov_man: 89, cov_zone: 88, catch_contest: 89, tak_wrap: 81
      })
    },
    {
      id: 'WLB', label: 'WLB', name: 'Devin Lloyd', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -3.2, y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 88, acc: 89, agi: 86, str: 86,
        cov_man: 83, cov_zone: 90, bsh_shed: 89, tak_wrap: 91, tak_hit_power: 92
      })
    },
    {
      id: 'MLB', label: 'MLB', name: 'Foyesade Oluokun', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 2.2, y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 87, acc: 88, agi: 86, str: 87,
        cov_man: 81, cov_zone: 89, bsh_shed: 91, tak_wrap: 97, tak_hit_power: 90
      })
    },
    {
      id: 'SS', label: 'SS', name: 'Antonio Johnson', team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 6.5, y: 8.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 90, acc: 90, agi: 89, str: 81,
        cov_man: 85, cov_zone: 88, catch_contest: 88, tak_wrap: 90, tak_hit_power: 91
      })
    },
    {
      id: 'FS', label: 'FS', name: 'Andre Cisco', team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 0.0, y: 13.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 93, acc: 92, agi: 91, str: 75,
        cov_man: 82, cov_zone: 94, catch_contest: 94, tak_wrap: 86, tak_hit_power: 89
      })
    }
  ];
}

// ============================================================================
// FORMATION ALIGNMENT PRESETS (Trips, Doubles, Bunch, Ace, Empty)
// ============================================================================
export function applyFormation(offense: PlayerConfig[], formation: OffFormationId): void {
  const wr1 = offense.find((p) => p.id === 'WR1')!;
  const slot = offense.find((p) => p.id === 'SLOT')!;
  const te = offense.find((p) => p.id === 'TE')!;
  const wr2 = offense.find((p) => p.id === 'WR2')!;
  const rb = offense.find((p) => p.id === 'RB')!;

  switch (formation) {
    case 'GUN_DOUBLES':
      // 2x2 Balanced: WR1 & Slot on Left, TE & WR2 on Right
      wr1.startPos = { x: -17.0, y: -0.2 };
      slot.startPos = { x: -9.0, y: -0.8 };
      te.startPos = { x: 4.8, y: -0.5 };
      wr2.startPos = { x: 17.0, y: -0.4 };
      rb.startPos = { x: 2.2, y: -4.8 };
      break;

    case 'GUN_BUNCH_RIGHT':
      // Bunch Right: WR1 isolated left, Slot + TE + WR2 condensed bunch right
      wr1.startPos = { x: -18.0, y: -0.2 };
      slot.startPos = { x: 9.0, y: -0.8 };
      te.startPos = { x: 6.5, y: -0.4 };
      wr2.startPos = { x: 11.5, y: -0.8 };
      rb.startPos = { x: -2.2, y: -4.8 };
      break;

    case 'SINGLEBACK_ACE':
      // 12-Personnel Ace: Tight Ends inline, 2 outside WRs
      wr1.startPos = { x: -16.5, y: -0.2 };
      slot.startPos = { x: -5.0, y: -0.5 }; // Second TE position
      te.startPos = { x: 5.0, y: -0.5 };
      wr2.startPos = { x: 16.5, y: -0.2 };
      rb.startPos = { x: 0.0, y: -5.2 };
      break;

    case 'EMPTY_QUADS':
      // Empty 4x1 Quads: 4 receivers right, WR1 backside solo, RB split out
      wr1.startPos = { x: -18.5, y: -0.2 };
      slot.startPos = { x: 6.5, y: -0.8 };
      te.startPos = { x: 10.5, y: -0.5 };
      wr2.startPos = { x: 19.0, y: -0.4 };
      rb.startPos = { x: 14.5, y: -0.8 }; // Saquon split out wide
      break;

    default:
      // GUN_TRIPS_RIGHT (Default 3x1 Trips)
      wr1.startPos = { x: -17.5, y: -0.2 };
      slot.startPos = { x: -8.5, y: -0.8 };
      te.startPos = { x: 4.9, y: -0.5 };
      wr2.startPos = { x: 16.5, y: -0.6 };
      rb.startPos = { x: -2.0, y: -4.8 };
      break;
  }
}

// ============================================================================
// APPLICATION STATE & FIELD COORDINATES
// ============================================================================
let offenseRoster = createEaglesOffense();
const defenseRoster = createJaguarsDefense();
let selectedPlayerId = 'WR1';
let currentSituationId: SituationId = '1st_10';
let currentDefCall: DefensiveCall = 'MIXED';
let currentDefFront: DefFront = 'OVER';
let currentFormation: OffFormationId = 'GUN_TRIPS_RIGHT';
let currentMotion: PreSnapMotionId = 'NONE';
let allowDownfieldLaterals = true;

let lastMcSummary: MonteCarloSummary | null = null;
let activePlayResult: PlaySimResult | null = null;
let animFrameCursor = 0;
let isAnimatingSnap = false;

const fieldCanvas = document.getElementById('fieldCanvas') as HTMLCanvasElement;
const fCtx = fieldCanvas.getContext('2d')!;
const histCanvas = document.getElementById('histCanvas') as HTMLCanvasElement;
const hCtx = histCanvas.getContext('2d')!;

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
// ALL-22 16-BIT TURF, CHALKBOARD ROUTES & LATERAL PLAYBACK
// ============================================================================
function renderField(): void {
  const W = fieldCanvas.width;
  const sit = SITUATIONS[currentSituationId];

  // 1. Mowed grass bands (5 yards each)
  for (let y = -10; y <= 30; y += 5) {
    const pTop = fieldToCanvas(-X_HALF, y + 5);
    const pBot = fieldToCanvas(-X_HALF, y);
    fCtx.fillStyle = Math.abs(Math.floor(y / 5)) % 2 === 0 ? '#114b28' : '#145c32';
    fCtx.fillRect(0, pTop.cy, W, pBot.cy - pTop.cy);
  }

  // 2. Yard lines & hash marks
  fCtx.strokeStyle = 'rgba(255,255,255,0.20)';
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
    fCtx.fillStyle = 'rgba(255,255,255,0.32)';
    fCtx.fillRect(leftHash.cx - 3, leftHash.cy, 6, 1);
    fCtx.fillRect(rightHash.cx - 3, rightHash.cy, 6, 1);
  }

  // 3. Line of Scrimmage (Eagles Blue/Cyan) & Line-to-Gain (Gold)
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

  // 4. Monte Carlo Scatter Cloud
  if (lastMcSummary && !isAnimatingSnap) {
    for (const pt of lastMcSummary.scatterPoints) {
      const { cx, cy } = fieldToCanvas(pt.x, pt.y);
      fCtx.fillStyle =
        pt.outcome === 'COMPLETE'
          ? 'rgba(34, 197, 94, 0.48)'
          : pt.outcome === 'INTERCEPTION'
          ? 'rgba(239, 68, 68, 0.85)'
          : pt.outcome === 'FUMBLE'
          ? 'rgba(245, 158, 11, 0.90)'
          : 'rgba(148, 163, 184, 0.35)';
      fCtx.beginPath();
      fCtx.arc(cx, cy, pt.outcome === 'COMPLETE' ? 3.5 : 2.5, 0, Math.PI * 2);
      fCtx.fill();
    }
  }

  // 5. Route Chalkboard Lines & Waypoint Nodes
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
      p.readOrder === 1 ? '#facc15' :
      p.readOrder === 2 ? '#38bdf8' :
      p.readOrder === 3 ? '#a855f7' :
      p.readOrder === 4 ? '#ec4899' : '#cbd5e1';

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

    for (const wp of p.waypoints) {
      const cWp = fieldToCanvas(wp.x, wp.y);
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

  // 6. Animate Live Snap OR Static Alignment
  if (isAnimatingSnap && activePlayResult && activePlayResult.snapshots.length > 0) {
    const maxIdx = activePlayResult.snapshots.length - 1;
    const exactIdx = Math.min(maxIdx, animFrameCursor);
    const i0 = Math.floor(exactIdx);
    const i1 = Math.min(maxIdx, i0 + 1);
    const alpha = exactIdx - i0;

    const snap0 = activePlayResult.snapshots[i0];
    const snap1 = activePlayResult.snapshots[i1];

    // Pocket Pressure Halo
    const qb0 = snap0.agents[0];
    const qbC = fieldToCanvas(qb0.x, qb0.y);
    if (snap0.ballState === 'HELD' && snap0.pocketPressure > 0.25) {
      fCtx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.42, snap0.pocketPressure * 0.22)})`;
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

      if (a0.engaged) {
        fCtx.strokeStyle = 'rgba(245, 185, 66, 0.75)';
        fCtx.lineWidth = 1.5;
        fCtx.strokeRect(cx - 11, cy - 11, 22, 22);
      }
    }

    // Football flight / Lateral flight rendering
    const bx = snap0.ballPos.x + (snap1.ballPos.x - snap0.ballPos.x) * alpha;
    const by = snap0.ballPos.y + (snap1.ballPos.y - snap0.ballPos.y) * alpha;
    const bCanvas = fieldToCanvas(bx, by);

    if (snap0.ballState === 'IN_FLIGHT' || snap0.ballState === 'LATERAL_FLIGHT') {
      const tCanvas = fieldToCanvas(snap0.ballTargetPos.x, snap0.ballTargetPos.y);
      fCtx.strokeStyle = snap0.ballState === 'LATERAL_FLIGHT' ? '#f59e0b' : '#facc15';
      fCtx.lineWidth = 2.0;
      if (snap0.ballState === 'LATERAL_FLIGHT') fCtx.setLineDash([4, 3]);
      fCtx.beginPath();
      fCtx.arc(tCanvas.cx, tCanvas.cy, 8, 0, Math.PI * 2);
      fCtx.stroke();
      fCtx.setLineDash([]);
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
    // Static Pre-Snap Formation Alignment
    const previewSnap = simulateSingleSnap(
      offenseRoster,
      defenseRoster,
      currentDefCall === 'MIXED' ? 'COV3_SKY' : currentDefCall,
      sit,
      new PRNG(101),
      true,
      allowDownfieldLaterals,
      currentMotion,
      currentDefFront
    ).snapshots[0];

    for (const a of previewSnap.agents) {
      const { cx, cy } = fieldToCanvas(a.x, a.y);
      const spr = get16BitSprite(a.team, a.archetype, 0, a.id === selectedPlayerId);
      fCtx.drawImage(spr, cx - 12, cy - 12, 24, 24);

      fCtx.fillStyle = a.team === 'OFF' ? '#e2e8f0' : '#fca5a5';
      fCtx.font = 'bold 9px monospace';
      fCtx.textAlign = 'center';
      fCtx.fillText(a.name.split(' ')[1] || a.label, cx, cy + 19);
    }

    // Receiver Read Priority Badges
    for (const p of offenseRoster) {
      if (!p.eligible || p.role === 'PASS_BLOCK') continue;
      const { cx, cy } = fieldToCanvas(p.startPos.x, p.startPos.y);
      fCtx.fillStyle = '#090d16';
      fCtx.fillRect(cx + 8, cy - 14, 16, 12);
      fCtx.fillStyle = '#f5b942';
      fCtx.font = 'bold 9px monospace';
      fCtx.fillText(`R${p.readOrder}`, cx + 16, cy - 5);
    }
  }
}

// ============================================================================
// EPA DISTRIBUTION HISTOGRAM
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
  hCtx.fillText('-4.5 EPA (Turnover/Sack)', 20, H - 6);
  hCtx.fillText('0.0 EPA', zeroX - 20, H - 6);
  hCtx.fillText('+4.5 EPA (Explosive TD)', W - 145, H - 6);
}

// ============================================================================
// UI SYNCHRONIZATION & TELEMETRY
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
  document.getElementById('inspPlayerTitle')!.textContent =
    `Selected: ${p.name} (${p.label}) — ${p.team === 'OFF' ? 'Philadelphia Eagles' : 'Jacksonville Jaguars'}`;

  const aLat = getMaxLateralCentripetalAccel(p.ratings.agi, p.ratings.rr_short);
  const rMinAt9 = (9.0 * 9.0) / aLat;
  document.getElementById('inspTurnPhysics')!.textContent =
    `SPD: ${p.ratings.spd} | AGI: ${p.ratings.agi} | Min Turn Radius @ 9yd/s: ${rMinAt9.toFixed(2)} yds | Trait: ${p.ratings.catch_traffic ? 'Traffic Hands ' + p.ratings.catch_traffic : 'Anchor ' + p.ratings.pbk_anchor}`;

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

// ============================================================================
// GRANULAR ROSTER TABLE (Categorized View: Trench, Skill, Coverage)
// ============================================================================
function buildRosterTable(): void {
  const tbody = document.getElementById('rosterTableBody')!;
  tbody.innerHTML = '';

  const allPlayers = [...offenseRoster, ...defenseRoster];

  for (const p of allPlayers) {
    const tr = document.createElement('tr');
    if (p.id === selectedPlayerId) tr.classList.add('selected-row');

    tr.innerHTML = `
      <td style="font-weight:800; color:${p.team === 'OFF' ? '#38bdf8' : '#f87171'}; cursor:pointer;">${p.id}</td>
      <td style="text-align:left; font-weight:700;">${p.name} <span style="font-size:10px; color:#94a3b8;">(${p.label})</span></td>
    `;

    tr.children[0].addEventListener('click', () => {
      if (p.team === 'OFF') {
        selectedPlayerId = p.id;
        syncInspectorPanel();
        buildRosterTable();
        renderField();
      }
    });

    const displayKeys: { key: keyof PlayerConfig['ratings']; label: string }[] = [
      { key: 'spd', label: 'SPD' },
      { key: 'acc', label: 'ACC' },
      { key: 'agi', label: 'AGI' },
      { key: 'str', label: 'STR' },
      { key: p.team === 'OFF' ? 'pbk_anchor' : 'rush_power', label: p.team === 'OFF' ? 'PBK-Anc' : 'Rush-Pow' },
      { key: p.team === 'OFF' ? 'pbk_lateral' : 'rush_speed', label: p.team === 'OFF' ? 'PBK-Lat' : 'Rush-Spd' },
      { key: p.team === 'OFF' ? 'thp' : 'bsh_shed', label: p.team === 'OFF' ? 'THP/RR' : 'BSH-Shed' },
      { key: p.team === 'OFF' ? 'catch_traffic' : 'cov_man', label: p.team === 'OFF' ? 'CIT' : 'Cov-Man' },
      { key: p.team === 'OFF' ? 'btk_power' : 'tak_wrap', label: p.team === 'OFF' ? 'BTK' : 'TAK-Wrap' },
      { key: p.team === 'OFF' ? 'lateral_vision' : 'tak_hit_power', label: p.team === 'OFF' ? 'Lateral' : 'Hit-Pow' },
    ];

    for (const item of displayKeys) {
      const td = document.createElement('td');
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '40';
      inp.max = '99';
      inp.value = String(p.ratings[item.key] ?? 75);
      inp.addEventListener('change', () => {
        (p.ratings as any)[item.key] = Math.max(40, Math.min(99, Number(inp.value) || 75));
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
  lastMcSummary = runMonteCarloBatch(
    offenseRoster,
    defenseRoster,
    currentDefCall,
    sit,
    400,
    42069,
    allowDownfieldLaterals,
    currentMotion,
    currentDefFront
  );
  updateKpiStrip(lastMcSummary);
  renderField();
}

// ============================================================================
// INTERACTIVE ROUTE DESIGNER & CANVAS MOUSE EVENTS
// ============================================================================
let draggingWaypointIdx: number | null = null;

fieldCanvas.addEventListener('mousedown', (e) => {
  const rect = fieldCanvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (fieldCanvas.width / rect.width);
  const cy = (e.clientY - rect.top) * (fieldCanvas.height / rect.height);
  const pt = canvasToField(cx, cy);

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

  if (selPlayer && selPlayer.eligible && selPlayer.role !== 'PASS_BLOCK') {
    if (selPlayer.waypoints.length < 2) {
      selPlayer.waypoints.push({ x: pt.x, y: pt.y });
    } else {
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
// SIMULATION PLAYBACK & CONTROLS
// ============================================================================
let snapSeedCounter = 2005;

function playSingleSnapAnimated(): void {
  const sit = SITUATIONS[currentSituationId];
  snapSeedCounter += 17;
  activePlayResult = simulateSingleSnap(
    offenseRoster,
    defenseRoster,
    currentDefCall,
    sit,
    new PRNG(snapSeedCounter),
    true,
    allowDownfieldLaterals,
    currentMotion,
    currentDefFront
  );

  document.getElementById('livePlayCommentary')!.textContent =
    `${activePlayResult.preSnapTell.summaryText}\n\n${activePlayResult.commentary}`;

  const badge = document.getElementById('lastSnapOutcomeBadge')!;
  badge.textContent = `${activePlayResult.outcome} (${activePlayResult.yardsGained >= 0 ? '+' : ''}${activePlayResult.yardsGained.toFixed(1)}y | ${activePlayResult.epa >= 0 ? '+' : ''}${activePlayResult.epa.toFixed(2)} EPA)`;
  badge.style.color = activePlayResult.epa >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  // Update Pre-Snap Tell HUD
  const tellEl = document.getElementById('preSnapTellBadge');
  if (tellEl) {
    tellEl.textContent = activePlayResult.preSnapTell.summaryText;
  }

  animFrameCursor = 0;
  isAnimatingSnap = true;

  const stepAnimation = () => {
    if (!isAnimatingSnap || !activePlayResult) return;
    renderField();
    animFrameCursor += 0.34;
    if (animFrameCursor < activePlayResult.snapshots.length - 1) {
      requestAnimationFrame(stepAnimation);
    } else {
      isAnimatingSnap = false;
    }
  };
  requestAnimationFrame(stepAnimation);
}

// Bind Top Bar & Playbook Events
document.getElementById('selSituation')!.addEventListener('change', (e) => {
  currentSituationId = (e.target as HTMLSelectElement).value as SituationId;
  triggerFastMonteCarloUpdate();
});

document.getElementById('selDefense')!.addEventListener('change', (e) => {
  currentDefCall = (e.target as HTMLSelectElement).value as DefensiveCall;
  triggerFastMonteCarloUpdate();
});

const frontSelect = document.getElementById('selFront') as HTMLSelectElement | null;
if (frontSelect) {
  frontSelect.addEventListener('change', (e) => {
    currentDefFront = (e.target as HTMLSelectElement).value as DefFront;
    triggerFastMonteCarloUpdate();
  });
}

const formationSelect = document.getElementById('selFormation') as HTMLSelectElement | null;
if (formationSelect) {
  formationSelect.addEventListener('change', (e) => {
    currentFormation = (e.target as HTMLSelectElement).value as OffFormationId;
    applyFormation(offenseRoster, currentFormation);
    syncInspectorPanel();
    triggerFastMonteCarloUpdate();
  });
}

const motionSelect = document.getElementById('selMotion') as HTMLSelectElement | null;
if (motionSelect) {
  motionSelect.addEventListener('change', (e) => {
    currentMotion = (e.target as HTMLSelectElement).value as PreSnapMotionId;
    triggerFastMonteCarloUpdate();
  });
}

const lateralCheck = document.getElementById('chkLaterals') as HTMLInputElement | null;
if (lateralCheck) {
  lateralCheck.addEventListener('change', (e) => {
    allowDownfieldLaterals = (e.target as HTMLInputElement).checked;
    triggerFastMonteCarloUpdate();
  });
}

document.getElementById('btnPlayOne')!.addEventListener('click', () => {
  playSingleSnapAnimated();
});

document.getElementById('btnRunMC')!.addEventListener('click', () => {
  isAnimatingSnap = false;
  triggerFastMonteCarloUpdate();
  document.getElementById('livePlayCommentary')!.textContent =
    `Completed 400 Monte Carlo snaps (Eagles vs Jaguars): Mean EPA = ${lastMcSummary!.meanEpa.toFixed(2)}, Goal Success = ${lastMcSummary!.goalSuccessRate.toFixed(1)}%, Sack Rate = ${lastMcSummary!.sackRate.toFixed(1)}%, Lateral Success = ${lastMcSummary!.lateralSuccessShare.toFixed(0)}%.`;
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

// Inspector inputs
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
  offenseRoster = createEaglesOffense();
  // Air Raid Mesh: DeVonta & Goedert shallow mesh, A.J. Brown 10y sit
  offenseRoster[6].waypoints = [{ x: -17.5, y: 10.0 }, { x: -12.0, y: 10.5 }];
  offenseRoster[7].waypoints = [{ x: -6.0, y: 4.8 }, { x: 10.0, y: 5.5 }];
  offenseRoster[8].waypoints = [{ x: 3.0, y: 5.2 }, { x: -10.0, y: 6.0 }];
  offenseRoster[9].waypoints = [{ x: 16.5, y: 9.5 }, { x: 22.0, y: 16.5 }];
  offenseRoster[7].readOrder = 1;
  offenseRoster[8].readOrder = 2;
  offenseRoster[9].readOrder = 3;
  triggerFastMonteCarloUpdate();
});

document.getElementById('btnLoadConceptDagger')!.addEventListener('click', () => {
  offenseRoster = createEaglesOffense();
  offenseRoster[7].waypoints = [{ x: -8.5, y: 12.0 }, { x: -4.0, y: 24.0 }];
  offenseRoster[6].waypoints = [{ x: -17.5, y: 14.0 }, { x: -2.0, y: 14.5 }];
  offenseRoster[8].role = 'CHIP_RELEASE';
  offenseRoster[6].readOrder = 1;
  offenseRoster[7].readOrder = 2;
  triggerFastMonteCarloUpdate();
});

document.getElementById('btnLoadConceptStick')!.addEventListener('click', () => {
  offenseRoster = createEaglesOffense();
  offenseRoster[8].waypoints = [{ x: 4.9, y: 5.5 }, { x: 8.0, y: 5.5 }];
  offenseRoster[7].waypoints = [{ x: -8.5, y: 3.5 }, { x: -2.5, y: 6.5 }];
  offenseRoster[6].waypoints = [{ x: -17.5, y: 3.5 }, { x: -10.0, y: 7.5 }];
  offenseRoster[8].readOrder = 1;
  offenseRoster[7].readOrder = 2;
  offenseRoster[6].readOrder = 3;
  triggerFastMonteCarloUpdate();
});

// Hook and Lateral Preset Concept
const btnHookLateral = document.getElementById('btnLoadConceptHookLateral');
if (btnHookLateral) {
  btnHookLateral.addEventListener('click', () => {
    offenseRoster = createEaglesOffense();
    // A.J. Brown (WR1) runs 6y quick curl/in (x=-17.5 -> x=-13.0, y=6.0)
    offenseRoster[6].waypoints = [{ x: -17.5, y: 6.0 }, { x: -13.0, y: 6.0 }];
    offenseRoster[6].readOrder = 1;
    // Saquon Barkley (RB) runs delayed trail wheel right behind A.J. Brown to take backward pitch!
    offenseRoster[10].waypoints = [{ x: -6.0, y: 0.5 }, { x: -16.5, y: 4.5 }];
    offenseRoster[10].readOrder = 5;
    // Goedert chip releases to clear right side
    offenseRoster[8].role = 'CHIP_RELEASE';
    allowDownfieldLaterals = true;
    if (lateralCheck) lateralCheck.checked = true;
    triggerFastMonteCarloUpdate();
  });
}

// Tab navigation
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
