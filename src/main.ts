// ============================================================================
// src/main.ts
// NFL Offensive Coordinator War Room — Tactile Slate Chalkboard & All-22 Simulator
// Aesthetic: American Walnut & Quarter-Sawn Oak Framing, Brushed Brass Accents,
// Matte Green Slate Chalkboard, Authentic Chalk Coaching Tokens (O's & X's).
// ============================================================================

import {
  BlockingSchemeId,
  CoEvolutionProgress,
  CoEvolutionRoundResult,
  DEFENSIVE_TACTIC_PRESETS,
  DefFront,
  DefSpyRole,
  DefensiveMutationProgress,
  DefensiveTacticSpec,
  DLStuntType,
  DefensiveCall,
  DropbackType,
  MATCHUP_PRESETS,
  MatchupPreset,
  MatchupPresetId,
  MonteCarloSummary,
  MutationProgress,
  OFFENSIVE_CONCEPTS,
  OffFormationId,
  OffPersonnelId,
  OffensiveConceptId,
  PlayerConfig,
  PlayerRatings,
  PlaySimResult,
  PRNG,
  PreSnapMotionId,
  RouteBreakStyle,
  SITUATIONS,
  SituationId,
  SituationSpec,
  adaptDefenseToOffensivePersonnel,
  applyFormationAndPersonnel,
  applyOffensiveConcept,
  buildDefenseSchemeAgents,
  evaluateCallSheetMatrix,
  getMaxLateralCentripetalAccel,
  computeOffensePercentile,
  mutateDefenseForRosterAsync,
  mutatePlayForRosterAsync,
  resolveDefScheme,
  runAdversarialCoEvolutionAsync,
  runMonteCarloBatch,
  simulateSingleSnap,
} from './engine';
import {
  ALL_PRESET_MATCHUPS,
  buildCustomMatchup,
  getAllNflTeamCodes,
  getNflTeam,
} from './nfl_rosters';

// ============================================================================
// APPLICATION STATE
// ============================================================================
let currentMatchupId: MatchupPresetId = 'PHI_VS_JAX';
let activePreset: MatchupPreset = ALL_PRESET_MATCHUPS[currentMatchupId] || MATCHUP_PRESETS['PHI_VS_JAX'];

let offenseRoster: PlayerConfig[] = activePreset.getOffense();
let defenseRoster: PlayerConfig[] = activePreset.getDefense();

let selectedPlayerId = 'WR1';
let currentSituationId: SituationId = '1st_10';
let currentConceptId: OffensiveConceptId | 'CUSTOM' = 'CUSTOM';
let currentDefCall: DefensiveCall = activePreset.primaryDefCall;
let currentDefFront: DefFront = activePreset.primaryDefFront;
let currentDefStunt: DLStuntType = 'AUTO';
let currentMatchCoverage = true;
let currentFormation: OffFormationId = 'GUN_TRIPS_RIGHT';
let currentPersonnel: OffPersonnelId = '11_PERSONNEL';
let currentMotion: PreSnapMotionId = 'NONE';
let currentDropback: DropbackType = 'STANDARD_DROP';
let currentBlockingScheme: BlockingSchemeId = 'HALF_SLIDE';
let showCoverageClouds = true;
let showBlockingOverlay = true;
let currentEvoAbortSignal: { aborted: boolean } | null = null;
let allowDownfieldLaterals = true;
let currentRiskTolerance = 0.55;
let currentSpyRole: DefSpyRole = 'WLB';

let currentCoordinatorMode: 'OC' | 'DC' | 'CO_EVO' = 'OC';
let currentDefTactic: DefensiveTacticSpec = {
  defCall: activePreset.primaryDefCall,
  front: activePreset.primaryDefFront,
  dlStunt: 'AUTO',
  spyRole: 'WLB',
  matchCoverage: true,
  cbCushionY: 5.0,
  safetyDepthY: 13.0,
  underDepthY: 6.5,
};
let currentDefEvoAbortSignal: { aborted: boolean } | null = null;
let currentCoEvoAbortSignal: { aborted: boolean } | null = null;
let coEvoHistoryArchive: CoEvolutionRoundResult[] = [];

let lastMcSummary: MonteCarloSummary | null = null;
let activePlayResult: PlaySimResult | null = null;
let animFrameCursor = 0;
let isAnimatingSnap = false;
let animRequestHandle: number | null = null;

// Canvas Elements
const fieldCanvas = document.getElementById('fieldCanvas') as HTMLCanvasElement;
const fCtx = fieldCanvas.getContext('2d')!;
const histCanvas = document.getElementById('histCanvas') as HTMLCanvasElement;
const hCtx = histCanvas.getContext('2d')!;

// Field Coordinate Boundaries
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
// TACTILE SLATE CHALKBOARD RENDERING
// ============================================================================

function drawChalkLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth = 2,
  dash: number[] = []
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 1.5;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawChalkArrowhead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  size = 9
): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 2;

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Hand-Drawn Chalk "O" (Offensive Coaching Token)
function drawChalkO(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  label: string,
  jerseyNum: number | undefined,
  isHighlighted: boolean,
  isCarrier: boolean,
  radius = 12
): void {
  ctx.save();

  // Selection Glow / Halo
  if (isHighlighted) {
    ctx.strokeStyle = 'rgba(246, 196, 69, 0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#f6c445';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ball Carrier Green Ring
  if (isCarrier) {
    ctx.strokeStyle = '#6eb079';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#6eb079';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Slate disc interior
  ctx.fillStyle = isHighlighted ? '#1d3527' : '#16281e';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Double chalk ring outline
  ctx.strokeStyle = isHighlighted ? '#f6c445' : '#f5f5f0';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = isHighlighted ? '#f6c445' : 'rgba(245, 245, 240, 0.6)';
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Interior Number or Label
  ctx.fillStyle = isHighlighted ? '#f6c445' : '#f5f5f0';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = jerseyNum !== undefined ? String(jerseyNum) : label.slice(0, 3);
  ctx.fillText(text, cx, cy + 0.5);

  ctx.restore();
}

// Hand-Drawn Chalk "X" (Defensive Coaching Token)
function drawChalkX(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  label: string,
  isHighlighted: boolean,
  isRusher: boolean,
  size = 8
): void {
  ctx.save();
  const color = isHighlighted ? '#f6c445' : isRusher ? '#e65858' : '#e06b6b';

  // Selection Glow
  if (isHighlighted) {
    ctx.strokeStyle = 'rgba(246, 196, 69, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#f6c445';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, size + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw Chalk X
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 3;

  ctx.beginPath();
  ctx.moveTo(cx - size, cy - size);
  ctx.lineTo(cx + size, cy + size);
  ctx.moveTo(cx + size, cy - size);
  ctx.lineTo(cx - size, cy + size);
  ctx.stroke();

  // If Rusher: draw direction chevron arrow pointing downhill
  if (isRusher) {
    ctx.strokeStyle = '#e65858';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + size + 2);
    ctx.lineTo(cx, cy + size + 7);
    ctx.lineTo(cx + 5, cy + size + 2);
    ctx.stroke();
  }

  // Small chalk label below
  ctx.fillStyle = color;
  ctx.font = 'bold 8.5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy - size - 3);

  ctx.restore();
}

// Football with white laces and 3D altitude scaling
function drawFootball(ctx: CanvasRenderingContext2D, cx: number, cy: number, angle = 0, scale = 1.0): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.rotate(angle);

  // Leather body
  ctx.fillStyle = '#9c4c1a';
  ctx.strokeStyle = '#5a2507';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // White chalk laces
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(3, 0);
  ctx.moveTo(-2, -1.8);
  ctx.lineTo(-2, 1.8);
  ctx.moveTo(0, -1.8);
  ctx.lineTo(0, 1.8);
  ctx.moveTo(2, -1.8);
  ctx.lineTo(2, 1.8);
  ctx.stroke();

  ctx.restore();
}

function syncDefensiveAlignment(): void {
  const sit = SITUATIONS[currentSituationId];
  const activeScheme = resolveDefScheme(currentDefTactic.defCall, sit);
  const matchedDef = adaptDefenseToOffensivePersonnel(
    defenseRoster,
    offenseRoster,
    currentDefTactic.defPersonnel
  );
  for (let i = 0; i < matchedDef.length; i++) {
    defenseRoster[i] = matchedDef[i];
  }
  const agents = buildDefenseSchemeAgents(offenseRoster, defenseRoster, activeScheme, currentDefTactic.front, currentDefTactic.spyRole, sit);
  const maxFieldY = Math.min(32.0, 100 - sit.yardline + 8.5);

  for (let i = 0; i < defenseRoster.length; i++) {
    if (agents[i]) {
      let py = agents[i].pos.y;
      const id = defenseRoster[i].id;
      if (currentDefTactic.cbCushionY !== undefined && (id === 'CB1' || id === 'CB2' || id === 'NCB' || id === 'SLB')) {
        py = Math.max(1.5, Math.min(maxFieldY - 2.0, currentDefTactic.cbCushionY));
      }
      if (currentDefTactic.safetyDepthY !== undefined && (id === 'FS' || id === 'SS')) {
        py = Math.max(8.0, Math.min(maxFieldY - 1.0, currentDefTactic.safetyDepthY));
      }
      defenseRoster[i].startPos = { x: agents[i].pos.x, y: py };
    }
  }
}

function drawCoverageClouds(
  ctx: CanvasRenderingContext2D,
  defCall: DefensiveCall,
  sit: SituationSpec,
  matchCoverage = true
): void {
  const activeScheme = resolveDefScheme(defCall, sit);
  const maxFieldY = Math.min(32.0, 100 - sit.yardline + 8.5);

  ctx.save();

  const drawZoneBox = (
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number,
    label: string,
    color = '#68b6d8',
    fillColor = 'rgba(104, 182, 216, 0.08)'
  ) => {
    const ptTopLeft = fieldToCanvas(xMin, yMax);
    const ptBottomRight = fieldToCanvas(xMax, yMin);
    const w = ptBottomRight.cx - ptTopLeft.cx;
    const h = ptBottomRight.cy - ptTopLeft.cy;

    ctx.fillStyle = fillColor;
    ctx.fillRect(ptTopLeft.cx, ptTopLeft.cy, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(ptTopLeft.cx, ptTopLeft.cy, w, h);
    ctx.setLineDash([]);

    ctx.font = '700 9px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, ptTopLeft.cx + w / 2, ptTopLeft.cy + h / 2 + 3);
  };

  switch (activeScheme) {
    case 'COV3_SKY': {
      drawZoneBox(-26, -8.5, 11, maxFieldY, 'DEEP 1/3 (CB1)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');
      drawZoneBox(-8.5, 8.5, 11, maxFieldY, 'DEEP 1/3 (FS)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');
      drawZoneBox(8.5, 26, 11, maxFieldY, 'DEEP 1/3 (CB2)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');

      drawZoneBox(-26, -11, 2.5, 10, 'CURL / FLAT', '#6eb079', 'rgba(110, 176, 121, 0.08)');
      const hookLabel1 = matchCoverage ? 'HOOK MATCH (RIP/LIZ)' : 'HOOK / CURL (WLB)';
      const hookLabel2 = matchCoverage ? 'HOOK MATCH (RIP/LIZ)' : 'HOOK / CURL (MLB)';
      const seamLabel = matchCoverage ? 'SEAM MATCH (SS)' : 'CURL / FLAT (SS)';
      const matchColor = matchCoverage ? '#b388ff' : '#6eb079';
      const matchFill = matchCoverage ? 'rgba(179, 136, 255, 0.09)' : 'rgba(110, 176, 121, 0.08)';

      drawZoneBox(-11, 0, 3, 10, hookLabel1, matchColor, matchFill);
      drawZoneBox(0, 11, 3, 10, hookLabel2, matchColor, matchFill);
      drawZoneBox(11, 26, 2.5, 10, seamLabel, matchColor, matchFill);
      break;
    }

    case 'COV2_TAMPA': {
      drawZoneBox(-26, 0, 12, maxFieldY, 'DEEP 1/2 (FS)', '#68b6d8', 'rgba(104, 182, 216, 0.10)');
      drawZoneBox(0, 26, 12, maxFieldY, 'DEEP 1/2 (SS)', '#68b6d8', 'rgba(104, 182, 216, 0.10)');

      const poleLabel = matchCoverage ? 'TAMPA POLE (WARNER ➔ 19.5y)' : 'TAMPA POLE (WARNER)';
      drawZoneBox(-4.5, 4.5, 7, 20, poleLabel, '#f6c445', 'rgba(246, 196, 69, 0.14)');

      drawZoneBox(-26, -14, 2, 7, 'CLOUD FLAT (CB1)', '#6eb079', 'rgba(110, 176, 121, 0.08)');
      drawZoneBox(-14, -4.5, 3, 7.5, 'HOOK (WLB)', '#6eb079', 'rgba(110, 176, 121, 0.08)');
      drawZoneBox(4.5, 14, 3, 7.5, 'HOOK (NCB)', '#6eb079', 'rgba(110, 176, 121, 0.08)');
      drawZoneBox(14, 26, 2, 7, 'CLOUD FLAT (CB2)', '#6eb079', 'rgba(110, 176, 121, 0.08)');
      break;
    }

    case 'COV4_QUARTERS': {
      drawZoneBox(-26, -13, 11, maxFieldY, 'DEEP 1/4 (CB1)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');
      drawZoneBox(-13, 0, 11, maxFieldY, 'DEEP 1/4 (FS)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');
      drawZoneBox(0, 13, 11, maxFieldY, 'DEEP 1/4 (SS)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');
      drawZoneBox(13, 26, 11, maxFieldY, 'DEEP 1/4 (CB2)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');

      const qtrColor = matchCoverage ? '#b388ff' : '#6eb079';
      const qtrFill = matchCoverage ? 'rgba(179, 136, 255, 0.09)' : 'rgba(110, 176, 121, 0.08)';
      drawZoneBox(-22, -8, 2.5, 9, matchCoverage ? 'QTR FLAT (MATCH #2)' : 'QTR FLAT (WLB)', qtrColor, qtrFill);
      drawZoneBox(-8, 8, 3, 9, matchCoverage ? 'HOOK MATCH (CARRY VERT)' : 'HOOK MATCH (MLB)', qtrColor, qtrFill);
      drawZoneBox(8, 22, 2.5, 9, matchCoverage ? 'QTR FLAT (MATCH #2)' : 'QTR FLAT (NCB)', qtrColor, qtrFill);
      break;
    }

    case 'COV1_ROBBER': {
      drawZoneBox(-18, 18, 14, maxFieldY, 'SINGLE-HIGH POST (FS)', '#68b6d8', 'rgba(104, 182, 216, 0.10)');
      drawZoneBox(-7.5, 7.5, 4.5, 10, 'ROBBER HOLE (HUFANGA)', '#f6c445', 'rgba(246, 196, 69, 0.14)');

      for (const off of offenseRoster) {
        if (!off.eligible) continue;
        const pt = fieldToCanvas(off.startPos.x, off.startPos.y + 2.2);
        ctx.font = '700 9px "Courier New", monospace';
        ctx.fillStyle = '#e65858';
        ctx.textAlign = 'center';
        ctx.fillText('[MAN]', pt.cx, pt.cy);
      }
      break;
    }

    case 'COV6_SPLIT': {
      drawZoneBox(-26, 0, 12, maxFieldY, 'BOUNDARY 1/2 (FS)', '#68b6d8', 'rgba(104, 182, 216, 0.10)');
      drawZoneBox(0, 13, 11, maxFieldY, 'FIELD 1/4 (SS)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');
      drawZoneBox(13, 26, 11, maxFieldY, 'FIELD 1/4 (CB2)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');

      drawZoneBox(-25, -12, 2.5, 7, 'CLOUD FLAT', '#6eb079', 'rgba(110, 176, 121, 0.08)');
      drawZoneBox(-12, 4, 3, 8.5, 'HOOK / CURL', '#6eb079', 'rgba(110, 176, 121, 0.08)');
      drawZoneBox(4, 25, 3, 8.5, matchCoverage ? 'SEAM MATCH (CARRY #2 VERT)' : 'SEAM MATCH', matchCoverage ? '#b388ff' : '#6eb079', matchCoverage ? 'rgba(179, 136, 255, 0.09)' : 'rgba(110, 176, 121, 0.08)');
      break;
    }

    case 'FIRE_ZONE_3': {
      drawZoneBox(-26, -8.5, 11, maxFieldY, 'DEEP 1/3 (CB1)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');
      drawZoneBox(-8.5, 8.5, 11, maxFieldY, 'DEEP 1/3 (FS)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');
      drawZoneBox(8.5, 26, 11, maxFieldY, 'DEEP 1/3 (CB2)', '#68b6d8', 'rgba(104, 182, 216, 0.09)');

      drawZoneBox(-22, -7, 3, 8.5, 'SEAM / FLAT', '#6eb079', 'rgba(110, 176, 121, 0.08)');
      drawZoneBox(-7, 7, 3, 8.5, 'HOOK 3-UP', '#6eb079', 'rgba(110, 176, 121, 0.08)');
      drawZoneBox(7, 22, 3, 8.5, 'SEAM / FLAT', '#6eb079', 'rgba(110, 176, 121, 0.08)');

      const blitzPt1 = fieldToCanvas(-5.2, 2.8);
      const blitzPt2 = fieldToCanvas(0.0, -1.0);
      drawChalkLine(ctx, blitzPt1.cx, blitzPt1.cy, blitzPt2.cx, blitzPt2.cy, '#e65858', 2.5, [4, 3]);
      drawChalkArrowhead(ctx, blitzPt1.cx, blitzPt1.cy, blitzPt2.cx, blitzPt2.cy, '#e65858', 9);
      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillStyle = '#e65858';
      ctx.fillText('[FIRE BLITZ]', blitzPt1.cx - 28, blitzPt1.cy - 6);
      break;
    }

    case 'ZERO_BLITZ': {
      for (const off of offenseRoster) {
        if (!off.eligible) continue;
        const pt = fieldToCanvas(off.startPos.x, off.startPos.y + 2.2);
        ctx.font = '700 9px "Courier New", monospace';
        ctx.fillStyle = '#e65858';
        ctx.textAlign = 'center';
        ctx.fillText('[ZERO MAN]', pt.cx, pt.cy);
      }

      const blitzers = [-4.3, -2.2, -0.6, 0.6, 2.2, 4.3];
      for (const bx of blitzers) {
        const p1 = fieldToCanvas(bx, 1.8);
        const p2 = fieldToCanvas(bx * 0.45, -2.5);
        drawChalkLine(ctx, p1.cx, p1.cy, p2.cx, p2.cy, '#e65858', 2, [3, 3]);
        drawChalkArrowhead(ctx, p1.cx, p1.cy, p2.cx, p2.cy, '#e65858', 7);
      }

      ctx.font = '700 11px "Courier New", monospace';
      ctx.fillStyle = '#e65858';
      ctx.textAlign = 'center';
      const cCenter = fieldToCanvas(0, 15);
      ctx.fillText('⚡ COVER 0 — 6-MAN ALL-OUT DOWNFIELD BLITZ ⚡', cCenter.cx, cCenter.cy);
      break;
    }
  }

  ctx.restore();
}

function drawDefensiveStuntsOverlay(
  ctx: CanvasRenderingContext2D,
  stunt: DLStuntType,
  _front: DefFront,
  defRoster: PlayerConfig[]
): void {
  if (stunt === 'NONE') return;

  ctx.save();
  const rdt = defRoster[2];
  const rde = defRoster[3];

  if (stunt === 'TE_TWIST' || stunt === 'AUTO') {
    if (rdt && rde) {
      // 1. DT Crasher Arrow (Gold dashed)
      const dtStart = fieldToCanvas(rdt.startPos.x, rdt.startPos.y);
      const dtCrash = fieldToCanvas(3.3, -0.6); // slanting into tackle B/C-gap
      drawChalkLine(ctx, dtStart.cx, dtStart.cy, dtCrash.cx, dtCrash.cy, '#f6c445', 2.5, [5, 3]);
      drawChalkArrowhead(ctx, dtStart.cx, dtStart.cy, dtCrash.cx, dtCrash.cy, '#f6c445', 8);

      ctx.font = '700 8.5px "Courier New", monospace';
      ctx.fillStyle = '#f6c445';
      ctx.fillText('CRASH (PICK)', dtCrash.cx + 5, dtCrash.cy - 4);

      // 2. Edge Looper Curved Track (Cyan dashed)
      const deStart = fieldToCanvas(rde.startPos.x, rde.startPos.y);
      const deLoopApex = fieldToCanvas(4.8, 1.2);
      const deTarget = fieldToCanvas(1.3, -1.0); // looping tight into A/B-gap

      ctx.strokeStyle = '#68b6d8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(deStart.cx, deStart.cy);
      ctx.quadraticCurveTo(deLoopApex.cx, deLoopApex.cy, deTarget.cx, deTarget.cy);
      ctx.stroke();
      ctx.setLineDash([]);

      drawChalkArrowhead(ctx, deLoopApex.cx, deLoopApex.cy, deTarget.cx, deTarget.cy, '#68b6d8', 8);

      ctx.fillStyle = '#68b6d8';
      ctx.fillText('LOOP ➔ QB', deTarget.cx - 28, deTarget.cy + 12);

      const badgePt = fieldToCanvas(2.8, 1.8);
      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillStyle = '#f6c445';
      ctx.fillText(stunt === 'AUTO' ? '[AUTO T-E TWIST]' : '[T-E TWIST]', badgePt.cx, badgePt.cy);
    }
  } else if (stunt === 'ET_TWIST') {
    if (rdt && rde) {
      // 1. Edge Crasher Arrow (Gold dashed)
      const deStart = fieldToCanvas(rde.startPos.x, rde.startPos.y);
      const deCrash = fieldToCanvas(2.0, -0.6); // crashing inside into B-gap
      drawChalkLine(ctx, deStart.cx, deStart.cy, deCrash.cx, deCrash.cy, '#f6c445', 2.5, [5, 3]);
      drawChalkArrowhead(ctx, deStart.cx, deStart.cy, deCrash.cx, deCrash.cy, '#f6c445', 8);

      ctx.font = '700 8.5px "Courier New", monospace';
      ctx.fillStyle = '#f6c445';
      ctx.fillText('CRASH', deCrash.cx - 20, deCrash.cy - 4);

      // 2. DT Looper Curved Track (Cyan dashed)
      const dtStart = fieldToCanvas(rdt.startPos.x, rdt.startPos.y);
      const dtLoopApex = fieldToCanvas(2.2, 1.0);
      const dtTarget = fieldToCanvas(4.5, -0.9); // loops outside RT

      ctx.strokeStyle = '#68b6d8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(dtStart.cx, dtStart.cy);
      ctx.quadraticCurveTo(dtLoopApex.cx, dtLoopApex.cy, dtTarget.cx, dtTarget.cy);
      ctx.stroke();
      ctx.setLineDash([]);

      drawChalkArrowhead(ctx, dtLoopApex.cx, dtLoopApex.cy, dtTarget.cx, dtTarget.cy, '#68b6d8', 8);

      ctx.fillStyle = '#68b6d8';
      ctx.fillText('LOOP ➔', dtTarget.cx + 5, dtTarget.cy + 10);

      const badgePt = fieldToCanvas(2.8, 1.8);
      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillStyle = '#f6c445';
      ctx.fillText('[E-T TWIST]', badgePt.cx, badgePt.cy);
    }
  } else if (stunt === 'OVERLOAD_SLANT') {
    const dlIndices = [0, 1, 2, 3];
    for (const idx of dlIndices) {
      const dl = defRoster[idx];
      if (!dl) continue;
      const startPt = fieldToCanvas(dl.startPos.x, dl.startPos.y);
      const endPt = fieldToCanvas(dl.startPos.x + 1.6, dl.startPos.y - 0.8);
      drawChalkLine(ctx, startPt.cx, startPt.cy, endPt.cx, endPt.cy, '#e65858', 2.2, [4, 3]);
      drawChalkArrowhead(ctx, startPt.cx, startPt.cy, endPt.cx, endPt.cy, '#e65858', 7);
    }
    const badgePt = fieldToCanvas(0.0, 1.8);
    ctx.font = '700 9px "Courier New", monospace';
    ctx.fillStyle = '#e65858';
    ctx.textAlign = 'center';
    ctx.fillText('[OVERLOAD SLANT ➔]', badgePt.cx, badgePt.cy);
  }

  ctx.restore();
}

function drawBlockingSchemeOverlay(
  ctx: CanvasRenderingContext2D,
  blockingScheme: BlockingSchemeId,
  offRoster: PlayerConfig[]
): void {
  ctx.save();

  const ols = offRoster.filter((p) => p.role === 'OL');
  const rb = offRoster.find((p) => p.id === 'RB');
  const te = offRoster.find((p) => p.id === 'TE');

  if (blockingScheme === 'PIN_AND_PULL') {
    const pullGuard = offRoster.find((p) => p.id === 'RG') || offRoster.find((p) => p.id === 'LG');
    if (pullGuard) {
      const gPt = fieldToCanvas(pullGuard.startPos.x, pullGuard.startPos.y);
      const loopPt = fieldToCanvas(0.8, -1.2);
      const sweepPt = fieldToCanvas(5.2, 0.4);

      ctx.strokeStyle = '#f6c445';
      ctx.lineWidth = 2.8;
      ctx.shadowColor = '#f6c445';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(gPt.cx, gPt.cy);
      ctx.quadraticCurveTo(loopPt.cx, loopPt.cy, sweepPt.cx, sweepPt.cy);
      ctx.stroke();

      drawChalkArrowhead(ctx, loopPt.cx, loopPt.cy, sweepPt.cx, sweepPt.cy, '#f6c445', 10);

      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillStyle = '#f6c445';
      ctx.fillText('PULL & SEAL ➔', sweepPt.cx - 10, sweepPt.cy - 12);
    }

    const rt = offRoster.find((p) => p.id === 'RT');
    if (rt) {
      const rtPt = fieldToCanvas(rt.startPos.x, rt.startPos.y);
      const pinPt = fieldToCanvas(rt.startPos.x - 1.6, rt.startPos.y + 1.2);
      drawChalkLine(ctx, rtPt.cx, rtPt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 2.2);
      drawChalkArrowhead(ctx, rtPt.cx, rtPt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 8);
      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillStyle = '#68b6d8';
      ctx.fillText('PIN ↙', rtPt.cx - 12, rtPt.cy - 8);
    }

    if (te && (te.label === '6OL/TE' || te.archetype === 'HEAVY_TRENCH')) {
      const tePt = fieldToCanvas(te.startPos.x, te.startPos.y);
      const pinPt = fieldToCanvas(te.startPos.x - 1.4, te.startPos.y + 1.2);
      drawChalkLine(ctx, tePt.cx, tePt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 2.5);
      drawChalkArrowhead(ctx, tePt.cx, tePt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 8);
      ctx.font = '700 8.5px "Courier New", monospace';
      ctx.fillStyle = '#68b6d8';
      ctx.fillText('6OL PIN ↙', tePt.cx - 6, tePt.cy - 8);
    }

    const c = offRoster.find((p) => p.id === 'C');
    if (c) {
      const cPt = fieldToCanvas(c.startPos.x, c.startPos.y);
      const pinPt = fieldToCanvas(c.startPos.x + 1.4, c.startPos.y + 1.2);
      drawChalkLine(ctx, cPt.cx, cPt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 2.2);
      drawChalkArrowhead(ctx, cPt.cx, cPt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 8);
    }

    const lt = offRoster.find((p) => p.id === 'LT');
    if (lt) {
      const ltPt = fieldToCanvas(lt.startPos.x, lt.startPos.y);
      const hgPt = fieldToCanvas(lt.startPos.x - 0.8, lt.startPos.y - 1.2);
      drawChalkLine(ctx, ltPt.cx, ltPt.cy, hgPt.cx, hgPt.cy, '#b388ff', 2);
      drawChalkArrowhead(ctx, ltPt.cx, ltPt.cy, hgPt.cx, hgPt.cy, '#b388ff', 7);
      ctx.font = '700 8px "Courier New", monospace';
      ctx.fillStyle = '#b388ff';
      ctx.fillText('HINGE', ltPt.cx - 24, ltPt.cy - 6);
    }
  } else if (blockingScheme === 'HALF_SLIDE') {
    const slideOLs = ols.filter((p) => p.startPos.x <= 0.2);
    for (const p of slideOLs) {
      const pt = fieldToCanvas(p.startPos.x, p.startPos.y);
      const sPt = fieldToCanvas(p.startPos.x - 1.5, p.startPos.y - 0.8);
      drawChalkLine(ctx, pt.cx, pt.cy, sPt.cx, sPt.cy, '#68b6d8', 2.2);
      drawChalkArrowhead(ctx, pt.cx, pt.cy, sPt.cx, sPt.cy, '#68b6d8', 7);
    }
    const centerPt = fieldToCanvas(0, -1.8);
    ctx.font = '700 9px "Courier New", monospace';
    ctx.fillStyle = '#68b6d8';
    ctx.textAlign = 'center';
    ctx.fillText('◀ 3-MAN SLIDE', centerPt.cx - 25, centerPt.cy);

    const manOLs = ols.filter((p) => p.startPos.x > 0.2);
    for (const p of manOLs) {
      const pt = fieldToCanvas(p.startPos.x, p.startPos.y);
      const mPt = fieldToCanvas(p.startPos.x, p.startPos.y + 1.2);
      drawChalkLine(ctx, pt.cx, pt.cy, mPt.cx, mPt.cy, '#f6c445', 2.2);
      drawChalkArrowhead(ctx, pt.cx, pt.cy, mPt.cx, mPt.cy, '#f6c445', 7);
    }
    ctx.fillStyle = '#f6c445';
    ctx.fillText('2-MAN BOB ▶', centerPt.cx + 45, centerPt.cy);

    if (rb) {
      const rbPt = fieldToCanvas(rb.startPos.x, rb.startPos.y);
      const scanPt = fieldToCanvas(1.8, 0.5);
      drawChalkLine(ctx, rbPt.cx, rbPt.cy, scanPt.cx, scanPt.cy, '#f6c445', 2, [4, 3]);
      drawChalkArrowhead(ctx, rbPt.cx, rbPt.cy, scanPt.cx, scanPt.cy, '#f6c445', 7);
      ctx.font = '700 8px "Courier New", monospace';
      ctx.fillText('RB SCAN / DUAL-READ', rbPt.cx + 20, rbPt.cy - 8);
    }
  } else if (blockingScheme === 'FULL_SLIDE_L' || blockingScheme === 'FULL_SLIDE_R') {
    const isL = blockingScheme === 'FULL_SLIDE_L';
    const dx = isL ? -1.8 : 1.8;
    for (const p of ols) {
      const pt = fieldToCanvas(p.startPos.x, p.startPos.y);
      const sPt = fieldToCanvas(p.startPos.x + dx, p.startPos.y - 0.6);
      drawChalkLine(ctx, pt.cx, pt.cy, sPt.cx, sPt.cy, '#68b6d8', 2.5);
      drawChalkArrowhead(ctx, pt.cx, pt.cy, sPt.cx, sPt.cy, '#68b6d8', 8);
    }
    const cPt = fieldToCanvas(0, -1.8);
    ctx.font = '700 10px "Courier New", monospace';
    ctx.fillStyle = '#68b6d8';
    ctx.textAlign = 'center';
    ctx.fillText(isL ? '◀ FULL SLIDE LEFT (5-MAN ZONE CUP)' : 'FULL SLIDE RIGHT (5-MAN ZONE CUP) ▶', cPt.cx, cPt.cy);
  } else if (blockingScheme === 'BIG_ON_BIG') {
    for (const p of ols) {
      const pt = fieldToCanvas(p.startPos.x, p.startPos.y);
      const mPt = fieldToCanvas(p.startPos.x, p.startPos.y + 1.2);
      drawChalkLine(ctx, pt.cx, pt.cy, mPt.cx, mPt.cy, '#f6c445', 2.5);
      drawChalkArrowhead(ctx, pt.cx, pt.cy, mPt.cx, mPt.cy, '#f6c445', 8);
    }
    const cPt = fieldToCanvas(0, -1.8);
    ctx.font = '700 10px "Courier New", monospace';
    ctx.fillStyle = '#f6c445';
    ctx.textAlign = 'center';
    ctx.fillText('BIG-ON-BIG (MAN-TO-MAN PASS PROTECTION)', cPt.cx, cPt.cy);
  } else if (blockingScheme === 'MAX_PROTECT') {
    if (te) {
      const tePt = fieldToCanvas(te.startPos.x, te.startPos.y);
      ctx.strokeStyle = '#f6c445';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(tePt.cx, tePt.cy, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '700 8px "Courier New", monospace';
      ctx.fillStyle = '#f6c445';
      ctx.textAlign = 'center';
      ctx.fillText('TE ANCHOR', tePt.cx, tePt.cy - 22);
    }
    if (rb) {
      const rbPt = fieldToCanvas(rb.startPos.x, rb.startPos.y);
      ctx.strokeStyle = '#f6c445';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rbPt.cx, rbPt.cy, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '700 8px "Courier New", monospace';
      ctx.fillStyle = '#f6c445';
      ctx.textAlign = 'center';
      ctx.fillText('RB ANCHOR', rbPt.cx, rbPt.cy - 22);
    }
    const cPt = fieldToCanvas(0, -2.4);
    ctx.font = '700 10px "Courier New", monospace';
    ctx.fillStyle = '#f6c445';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️ MAX PROTECT (7-MAN HEAVY ANCHOR)', cPt.cx, cPt.cy);
  } else if (blockingScheme === 'GT_COUNTER_PULL') {
    const lg = offRoster.find((p) => p.id === 'LG');
    if (lg) {
      const gPt = fieldToCanvas(lg.startPos.x, lg.startPos.y);
      const loopPt = fieldToCanvas(0.5, -1.2);
      const kickPt = fieldToCanvas(5.2, 0.4);
      ctx.strokeStyle = '#f6c445';
      ctx.lineWidth = 2.8;
      ctx.shadowColor = '#f6c445';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(gPt.cx, gPt.cy);
      ctx.quadraticCurveTo(loopPt.cx, loopPt.cy, kickPt.cx, kickPt.cy);
      ctx.stroke();
      drawChalkArrowhead(ctx, loopPt.cx, loopPt.cy, kickPt.cx, kickPt.cy, '#f6c445', 10);
      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillStyle = '#f6c445';
      ctx.fillText('G-PULL KICK ➔', kickPt.cx - 10, kickPt.cy - 12);
    }

    const lt = offRoster.find((p) => p.id === 'LT');
    if (lt) {
      const tPt = fieldToCanvas(lt.startPos.x, lt.startPos.y);
      const loopPt = fieldToCanvas(0.8, -1.5);
      const wrapPt = fieldToCanvas(3.8, 2.2);
      ctx.strokeStyle = '#ff9f43';
      ctx.lineWidth = 2.8;
      ctx.shadowColor = '#ff9f43';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(tPt.cx, tPt.cy);
      ctx.quadraticCurveTo(loopPt.cx, loopPt.cy, wrapPt.cx, wrapPt.cy);
      ctx.stroke();
      drawChalkArrowhead(ctx, loopPt.cx, loopPt.cy, wrapPt.cx, wrapPt.cy, '#ff9f43', 10);
      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillStyle = '#ff9f43';
      ctx.fillText('T-WRAP SEAL ⬆', wrapPt.cx - 10, wrapPt.cy - 12);
    }

    const c = offRoster.find((p) => p.id === 'C');
    if (c) {
      const cPt = fieldToCanvas(c.startPos.x, c.startPos.y);
      const pinPt = fieldToCanvas(c.startPos.x - 1.2, c.startPos.y + 1.2);
      drawChalkLine(ctx, cPt.cx, cPt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 2.2);
      drawChalkArrowhead(ctx, cPt.cx, cPt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 8);
    }
    const rg = offRoster.find((p) => p.id === 'RG');
    if (rg) {
      const rgPt = fieldToCanvas(rg.startPos.x, rg.startPos.y);
      const pinPt = fieldToCanvas(rg.startPos.x - 1.2, rg.startPos.y + 1.2);
      drawChalkLine(ctx, rgPt.cx, rgPt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 2.2);
      drawChalkArrowhead(ctx, rgPt.cx, rgPt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 8);
    }
    const rt = offRoster.find((p) => p.id === 'RT');
    if (rt) {
      const rtPt = fieldToCanvas(rt.startPos.x, rt.startPos.y);
      const pinPt = fieldToCanvas(rt.startPos.x - 1.2, rt.startPos.y + 1.2);
      drawChalkLine(ctx, rtPt.cx, rtPt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 2.2);
      drawChalkArrowhead(ctx, rtPt.cx, rtPt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 8);
      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillStyle = '#68b6d8';
      ctx.fillText('PIN ↙', rtPt.cx - 12, rtPt.cy - 8);
    }
    const cPt = fieldToCanvas(0, -2.4);
    ctx.font = '700 10px "Courier New", monospace';
    ctx.fillStyle = '#ff9f43';
    ctx.textAlign = 'center';
    ctx.fillText('🚜 GT COUNTER (LG KICK + LT WRAP)', cPt.cx, cPt.cy);
  } else if (blockingScheme === 'POWER_G_PULL') {
    const lg = offRoster.find((p) => p.id === 'LG');
    if (lg) {
      const gPt = fieldToCanvas(lg.startPos.x, lg.startPos.y);
      const loopPt = fieldToCanvas(0.5, -1.2);
      const kickPt = fieldToCanvas(5.0, 0.4);
      ctx.strokeStyle = '#f6c445';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(gPt.cx, gPt.cy);
      ctx.quadraticCurveTo(loopPt.cx, loopPt.cy, kickPt.cx, kickPt.cy);
      ctx.stroke();
      drawChalkArrowhead(ctx, loopPt.cx, loopPt.cy, kickPt.cx, kickPt.cy, '#f6c445', 10);
      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillStyle = '#f6c445';
      ctx.fillText('GUARD KICK ➔', kickPt.cx - 10, kickPt.cy - 12);
    }
    const hInsert = offRoster.find((p) => p.role === 'LEAD_BLOCK');
    if (hInsert) {
      const hPt = fieldToCanvas(hInsert.startPos.x, hInsert.startPos.y);
      const insertPt = fieldToCanvas(1.2, 1.8);
      drawChalkLine(ctx, hPt.cx, hPt.cy, insertPt.cx, insertPt.cy, '#ff9f43', 2.8);
      drawChalkArrowhead(ctx, hPt.cx, hPt.cy, insertPt.cx, insertPt.cy, '#ff9f43', 9);
      ctx.font = '700 8.5px "Courier New", monospace';
      ctx.fillStyle = '#ff9f43';
      ctx.fillText('INSERT LEAD ⬆', insertPt.cx + 5, insertPt.cy - 6);
    }
    if (te && (te.label === '6OL/TE' || te.archetype === 'HEAVY_TRENCH')) {
      const tePt = fieldToCanvas(te.startPos.x, te.startPos.y);
      const pinPt = fieldToCanvas(te.startPos.x - 1.2, te.startPos.y + 1.2);
      drawChalkLine(ctx, tePt.cx, tePt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 2.5);
      drawChalkArrowhead(ctx, tePt.cx, tePt.cy, pinPt.cx, pinPt.cy, '#68b6d8', 8);
      ctx.font = '700 8px "Courier New", monospace';
      ctx.fillStyle = '#68b6d8';
      ctx.fillText('6OL PIN ↙', tePt.cx - 6, tePt.cy - 8);
    }
    const cPt = fieldToCanvas(0, -2.4);
    ctx.font = '700 10px "Courier New", monospace';
    ctx.fillStyle = '#f6c445';
    ctx.textAlign = 'center';
    ctx.fillText('🚜 POWER-G (BACKSIDE GUARD KICK-OUT)', cPt.cx, cPt.cy);
  } else if (blockingScheme === 'INSIDE_ZONE_DUO') {
    for (const p of ols) {
      const pt = fieldToCanvas(p.startPos.x, p.startPos.y);
      const vPt = fieldToCanvas(p.startPos.x + 0.2, p.startPos.y + 1.6);
      drawChalkLine(ctx, pt.cx, pt.cy, vPt.cx, vPt.cy, '#6eb079', 2.8);
      drawChalkArrowhead(ctx, pt.cx, pt.cy, vPt.cx, vPt.cy, '#6eb079', 8);
    }
    const cPt = fieldToCanvas(0, -2.4);
    ctx.font = '700 10px "Courier New", monospace';
    ctx.fillStyle = '#6eb079';
    ctx.textAlign = 'center';
    ctx.fillText('🚜 INSIDE ZONE DUO (VERTICAL COMBO TEAMS ⬆)', cPt.cx, cPt.cy);
  } else if (blockingScheme === 'OUTSIDE_ZONE_STRETCH') {
    for (const p of ols) {
      const pt = fieldToCanvas(p.startPos.x, p.startPos.y);
      const sPt = fieldToCanvas(p.startPos.x + 1.8, p.startPos.y + 1.2);
      drawChalkLine(ctx, pt.cx, pt.cy, sPt.cx, sPt.cy, '#68b6d8', 2.8);
      drawChalkArrowhead(ctx, pt.cx, pt.cy, sPt.cx, sPt.cy, '#68b6d8', 8);
    }
    const cPt = fieldToCanvas(0, -2.4);
    ctx.font = '700 10px "Courier New", monospace';
    ctx.fillStyle = '#68b6d8';
    ctx.textAlign = 'center';
    ctx.fillText('🚜 OUTSIDE ZONE STRETCH (LATERAL REACH & SEAL ↗)', cPt.cx, cPt.cy);
  }

  ctx.restore();
}

// ============================================================================
// ALL-22 CHALKBOARD FIELD RENDERING
// ============================================================================

function renderField(): void {
  const W = fieldCanvas.width;
  const H = fieldCanvas.height;
  const sit = SITUATIONS[currentSituationId];

  // 1. Clear Matte Slate Chalkboard Background
  fCtx.fillStyle = '#14231a';
  fCtx.fillRect(0, 0, W, H);

  // Subtle slate grain / noise texture
  fCtx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  for (let i = 0; i < 400; i++) {
    const rx = (Math.sin(i * 997) * 0.5 + 0.5) * W;
    const ry = (Math.cos(i * 883) * 0.5 + 0.5) * H;
    fCtx.fillRect(rx, ry, 1.5, 1.5);
  }

  // 2. White Chalk 5-Yard Lines & Hash Marks
  fCtx.strokeStyle = 'rgba(245, 245, 240, 0.18)';
  fCtx.lineWidth = 1;
  for (let y = -10; y <= 30; y += 5) {
    const { cy } = fieldToCanvas(0, y);
    drawChalkLine(fCtx, 0, cy, W, cy, 'rgba(245, 245, 240, 0.18)', 1);

    // Yardage numbers on numbers track (-12 yds and +12 yds)
    if (y > 0 && y <= 30) {
      fCtx.fillStyle = 'rgba(245, 245, 240, 0.28)';
      fCtx.font = 'bold 11px Georgia, serif';
      fCtx.textAlign = 'center';
      const numL = fieldToCanvas(-12, y);
      const numR = fieldToCanvas(12, y);
      fCtx.fillText(String(y), numL.cx, numL.cy + 4);
      fCtx.fillText(String(y), numR.cx, numR.cy + 4);
    }
  }

  // 1-Yard Hash Marks
  for (let y = -10; y <= 30; y += 1) {
    const leftHash = fieldToCanvas(-3.1, y);
    const rightHash = fieldToCanvas(3.1, y);
    fCtx.fillStyle = 'rgba(245, 245, 240, 0.24)';
    fCtx.fillRect(leftHash.cx - 2.5, leftHash.cy, 5, 1);
    fCtx.fillRect(rightHash.cx - 2.5, rightHash.cy, 5, 1);
  }

  // 3. Line of Scrimmage (Cyan Chalk) & Line-to-Gain (Gold Chalk Dashed)
  const losY = fieldToCanvas(0, 0).cy;
  drawChalkLine(fCtx, 0, losY, W, losY, '#68b6d8', 2);

  const goalY = fieldToCanvas(0, sit.goalYards).cy;
  drawChalkLine(fCtx, 0, goalY, W, goalY, '#f6c445', 2.5, [7, 5]);

  // Red Zone Boundary line if applicable
  if (currentSituationId === 'RZ_2nd_8') {
    const rzY = fieldToCanvas(0, 100 - sit.yardline + 9.5).cy;
    drawChalkLine(fCtx, 0, rzY, W, rzY, '#e65858', 2, [4, 4]);
  }

  // Coverage Clouds (Tactile Defensive Coverage Shell Pre-Snap Visualizer)
  if (showCoverageClouds && !isAnimatingSnap) {
    drawCoverageClouds(fCtx, currentDefCall, sit, currentMatchCoverage);
  }

  // Defensive Line Stunts & Twists Visualizer
  if (!isAnimatingSnap && currentDefStunt !== 'NONE') {
    drawDefensiveStuntsOverlay(fCtx, currentDefStunt, currentDefFront, defenseRoster);
  }

  // Tactical Blocking Scheme Paths & Down-Blocks
  if (showBlockingOverlay && !isAnimatingSnap) {
    drawBlockingSchemeOverlay(fCtx, currentBlockingScheme, offenseRoster);
  }

  // 4. Monte Carlo Scatter Cloud
  if (lastMcSummary && !isAnimatingSnap) {
    for (const pt of lastMcSummary.scatterPoints) {
      const { cx, cy } = fieldToCanvas(pt.x, pt.y);
      fCtx.fillStyle =
        pt.outcome === 'COMPLETE' || pt.outcome === 'RUN_GAIN' || pt.outcome === 'RUN_TOUCHDOWN'
          ? 'rgba(110, 176, 121, 0.50)'
          : pt.outcome === 'INTERCEPTION' || pt.outcome === 'RUN_STUFF'
          ? 'rgba(230, 88, 88, 0.85)'
          : pt.outcome === 'FUMBLE'
          ? 'rgba(246, 196, 69, 0.90)'
          : 'rgba(245, 245, 240, 0.30)';
      fCtx.beginPath();
      const isBigSuccess =
        pt.outcome === 'COMPLETE' || pt.outcome === 'RUN_GAIN' || pt.outcome === 'RUN_TOUCHDOWN';
      fCtx.arc(cx, cy, isBigSuccess ? 3.5 : 2.5, 0, Math.PI * 2);
      fCtx.fill();
    }
  }

  // 5. Pre-Snap Motion Chalk Track
  if (currentMotion !== 'NONE' && !isAnimatingSnap) {
    const motionPlayer = offenseRoster.find((p) => p.id === 'SLOT' || p.id === 'RB' || p.id === 'TE');
    if (motionPlayer) {
      const sPt = fieldToCanvas(motionPlayer.startPos.x, motionPlayer.startPos.y);
      let targetX = motionPlayer.startPos.x;
      if (currentMotion === 'JET_R_TO_L') targetX = -12.0;
      else if (currentMotion === 'JET_L_TO_R') targetX = 12.0;
      else if (currentMotion === 'RB_FLAP_OUT') targetX = 14.5;
      else if (currentMotion === 'TE_SIFT') targetX = -5.0;

      const ePt = fieldToCanvas(targetX, motionPlayer.startPos.y - 0.5);
      drawChalkLine(fCtx, sPt.cx, sPt.cy, ePt.cx, ePt.cy, '#68b6d8', 2, [5, 4]);
      drawChalkArrowhead(fCtx, sPt.cx, sPt.cy, ePt.cx, ePt.cy, '#68b6d8', 8);
    }
  }

  // 6. Route Chalkboard Lines & Waypoint Nodes
  for (const p of offenseRoster) {
    if (!p.eligible) continue;
    const isSel = p.id === selectedPlayerId;
    const startPt = fieldToCanvas(p.startPos.x, p.startPos.y);

    if (p.role === 'PASS_BLOCK') {
      fCtx.strokeStyle = '#f6c445';
      fCtx.lineWidth = 2.5;
      fCtx.beginPath();
      fCtx.moveTo(startPt.cx, startPt.cy);
      fCtx.lineTo(startPt.cx, startPt.cy - 12);
      fCtx.moveTo(startPt.cx - 6, startPt.cy - 12);
      fCtx.lineTo(startPt.cx + 6, startPt.cy - 12);
      fCtx.stroke();
      continue;
    }

    const routeColor =
      p.readOrder === 1 ? '#f6c445' :
      p.readOrder === 2 ? '#68b6d8' :
      p.readOrder === 3 ? '#b388ff' :
      p.readOrder === 4 ? '#f07171' : '#f5f5f0';

    fCtx.save();
    fCtx.strokeStyle = routeColor;
    fCtx.lineWidth = isSel ? 2.8 : 1.8;
    if (p.role === 'CHIP_RELEASE') fCtx.setLineDash([5, 3]);
    fCtx.lineCap = 'round';
    fCtx.shadowColor = routeColor;
    fCtx.shadowBlur = isSel ? 4 : 2;

    fCtx.beginPath();
    fCtx.moveTo(startPt.cx, startPt.cy);
    if (p.breakStyle === 'ROUNDED_SPEED' && p.waypoints.length >= 2) {
      // Smooth continuous rounded speed arc
      let currentX = startPt.cx;
      let currentY = startPt.cy;
      for (let i = 0; i < p.waypoints.length; i++) {
        const cWp = fieldToCanvas(p.waypoints[i].x, p.waypoints[i].y);
        if (i === 0) {
          fCtx.lineTo(cWp.cx, cWp.cy);
        } else {
          const midX = (currentX + cWp.cx) / 2;
          const midY = (currentY + cWp.cy) / 2;
          fCtx.quadraticCurveTo(currentX, currentY, midX, midY);
          fCtx.lineTo(cWp.cx, cWp.cy);
        }
        currentX = cWp.cx;
        currentY = cWp.cy;
      }
    } else {
      // Sharp pivot straight-line stems & cuts
      for (const wp of p.waypoints) {
        const cWp = fieldToCanvas(wp.x, wp.y);
        fCtx.lineTo(cWp.cx, cWp.cy);
      }
    }
    fCtx.stroke();
    fCtx.setLineDash([]);
    fCtx.restore();

    // Draw Choice / Option Route Alternate Branches (Dashed Chalk)
    if (p.choiceRules && p.choiceRules.length > 0 && p.waypoints.length > 0) {
      const stemWp = p.waypoints[0];
      const cStem = fieldToCanvas(stemWp.x, stemWp.y);

      fCtx.save();
      fCtx.strokeStyle = 'rgba(255, 230, 140, 0.75)';
      fCtx.lineWidth = isSel ? 2.0 : 1.3;
      fCtx.setLineDash([4, 4]);

      for (const rule of p.choiceRules) {
        fCtx.beginPath();
        fCtx.moveTo(cStem.cx, cStem.cy);
        for (const rw of rule.waypoints) {
          const cRw = fieldToCanvas(rw.x, rw.y);
          fCtx.lineTo(cRw.cx, cRw.cy);
        }
        fCtx.stroke();

        // Arrowhead on choice rule branch
        if (rule.waypoints.length > 0) {
          const lastRw = rule.waypoints[rule.waypoints.length - 1];
          const prevRw = rule.waypoints.length > 1 ? rule.waypoints[rule.waypoints.length - 2] : stemWp;
          const cLast = fieldToCanvas(lastRw.x, lastRw.y);
          const cPrev = fieldToCanvas(prevRw.x, prevRw.y);
          drawChalkArrowhead(fCtx, cPrev.cx, cPrev.cy, cLast.cx, cLast.cy, 'rgba(255, 230, 140, 0.85)', 7);
        }
      }

      // Option Fork Glyph "⑂" at stem node
      fCtx.fillStyle = '#ffe68c';
      fCtx.font = 'bold 12px sans-serif';
      fCtx.fillText('⑂', cStem.cx + 5, cStem.cy - 5);
      fCtx.restore();
    }

    // Draw Arrowhead at final waypoint
    if (p.waypoints.length > 0) {
      const lastWp = p.waypoints[p.waypoints.length - 1];
      const prevWp = p.waypoints.length > 1 ? p.waypoints[p.waypoints.length - 2] : p.startPos;
      const cLast = fieldToCanvas(lastWp.x, lastWp.y);
      const cPrev = fieldToCanvas(prevWp.x, prevWp.y);
      drawChalkArrowhead(fCtx, cPrev.cx, cPrev.cy, cLast.cx, cLast.cy, routeColor, isSel ? 10 : 8);
    }

    // Waypoint handle dots & landmark sequence numbers
    for (let wpIdx = 0; wpIdx < p.waypoints.length; wpIdx++) {
      const wp = p.waypoints[wpIdx];
      const cWp = fieldToCanvas(wp.x, wp.y);
      fCtx.fillStyle = isSel ? '#ffffff' : routeColor;
      fCtx.beginPath();
      fCtx.arc(cWp.cx, cWp.cy, isSel ? 5.5 : 3.5, 0, Math.PI * 2);
      fCtx.fill();
      if (isSel) {
        fCtx.strokeStyle = '#14231a';
        fCtx.lineWidth = 1.5;
        fCtx.stroke();

        // Landmark label
        fCtx.fillStyle = '#68b6d8';
        fCtx.font = 'bold 9px monospace';
        fCtx.fillText(`L${wpIdx + 1}`, cWp.cx + 7, cWp.cy + 3);
      }
    }
  }

  // 7. Render Players: Live Snap Simulation OR Pre-Snap Chalk Alignment
  if (isAnimatingSnap && activePlayResult && activePlayResult.snapshots.length > 0) {
    const maxIdx = activePlayResult.snapshots.length - 1;
    const exactIdx = Math.min(maxIdx, animFrameCursor);
    const i0 = Math.floor(exactIdx);
    const i1 = Math.min(maxIdx, i0 + 1);
    const alpha = exactIdx - i0;

    const snap0 = activePlayResult.snapshots[i0];
    const snap1 = activePlayResult.snapshots[i1];

    // Pocket Pressure Halo around QB
    const qb0 = snap0.agents[0];
    const qbC = fieldToCanvas(qb0.x, qb0.y);
    if (snap0.ballState === 'HELD' && snap0.pocketPressure > 0.25) {
      fCtx.fillStyle = `rgba(230, 88, 88, ${Math.min(0.40, snap0.pocketPressure * 0.22)})`;
      fCtx.beginPath();
      fCtx.arc(qbC.cx, qbC.cy, 26, 0, Math.PI * 2);
      fCtx.fill();
    }

    // Render Agents
    for (let aIdx = 0; aIdx < snap0.agents.length; aIdx++) {
      const a0 = snap0.agents[aIdx];
      const a1 = snap1.agents[aIdx];
      const ix = a0.x + (a1.x - a0.x) * alpha;
      const iy = a0.y + (a1.y - a0.y) * alpha;
      const { cx, cy } = fieldToCanvas(ix, iy);

      const isCarrier = snap0.carrierIdx === aIdx && (snap0.ballState === 'CAUGHT' || snap0.ballState === 'DEAD');
      const isSel = a0.id === selectedPlayerId;

      if (a0.team === 'OFF') {
        const jersey = offenseRoster.find((p) => p.id === a0.id)?.scouting?.jersey;
        drawChalkO(fCtx, cx, cy, a0.label, jersey, isSel, isCarrier, 11);
      } else {
        const isRusher = a0.assignType === 'RUSH';
        drawChalkX(fCtx, cx, cy, a0.label, isSel, isRusher, 8);
      }
    }

    // Ball Flight & Catch with 3D Trajectory Elevation & Ground Shadow
    if (snap0.ballState === 'IN_FLIGHT' || snap0.ballState === 'LATERAL_FLIGHT') {
      const bx = snap0.ballPos.x + (snap1.ballPos.x - snap0.ballPos.x) * alpha;
      const by = snap0.ballPos.y + (snap1.ballPos.y - snap0.ballPos.y) * alpha;
      const bCanvas = fieldToCanvas(bx, by);
      const angle = Math.atan2(snap1.ballPos.y - snap0.ballPos.y, snap1.ballPos.x - snap0.ballPos.x);

      const bz0 = snap0.ballZ ?? 2.1;
      const bz1 = snap1.ballZ ?? 2.1;
      const bz = Math.max(0, bz0 + (bz1 - bz0) * alpha);

      // 1. Turf ground shadow directly under the ball on the grass
      const shadowAlpha = Math.max(0.12, 0.48 - (bz / 12.0) * 0.35);
      const shadowRx = Math.max(4, 9 - bz * 0.3);
      const shadowRy = Math.max(2, 4.5 - bz * 0.18);
      fCtx.save();
      fCtx.fillStyle = `rgba(12, 18, 14, ${shadowAlpha.toFixed(2)})`;
      fCtx.beginPath();
      fCtx.ellipse(bCanvas.cx, bCanvas.cy, shadowRx, shadowRy, 0, 0, Math.PI * 2);
      fCtx.fill();
      fCtx.restore();

      // 2. Faint elevation guide line from ground shadow up to airborne football
      const elevatedCy = bCanvas.cy - bz * 3.8;
      if (bz > 0.8) {
        fCtx.save();
        fCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        fCtx.lineWidth = 1;
        fCtx.setLineDash([2, 3]);
        fCtx.beginPath();
        fCtx.moveTo(bCanvas.cx, bCanvas.cy);
        fCtx.lineTo(bCanvas.cx, elevatedCy);
        fCtx.stroke();
        fCtx.restore();
      }

      // 3. Elevated 3D football with dynamic perspective altitude scaling
      const ballScale = 1.0 + Math.min(0.65, (bz / 12.0) * 0.7);
      drawFootball(fCtx, bCanvas.cx, elevatedCy, angle, ballScale);
    }
  } else {
    // Static Pre-Snap Chalkboard Alignment
    // 1. Offense
    for (const p of offenseRoster) {
      const { cx, cy } = fieldToCanvas(p.startPos.x, p.startPos.y);
      drawChalkO(fCtx, cx, cy, p.label, p.scouting?.jersey, p.id === selectedPlayerId, false, 11);
    }

    // 2. Defense
    for (const def of defenseRoster) {
      const { cx, cy } = fieldToCanvas(def.startPos.x, def.startPos.y);
      const isRusher = def.id.includes('DE') || def.id.includes('DT');
      drawChalkX(fCtx, cx, cy, def.label, def.id === selectedPlayerId, isRusher, 8);
    }
  }
}

// ============================================================================
// INSPECTOR, SCOUTING DOSSIER & ROSTER TABLE
// ============================================================================

function updateInspectorAndScouting(): void {
  const p = offenseRoster.find((ply) => ply.id === selectedPlayerId);
  if (!p) return;

  // 1. Inspector Form Controls
  (document.getElementById('inspPlayerTitle') as HTMLElement).textContent =
    `Selected: ${p.name} (${p.label})`;
  (document.getElementById('inspRole') as HTMLSelectElement).value = p.role;
  (document.getElementById('inspRead') as HTMLSelectElement).value = String(p.readOrder || 1);
  (document.getElementById('inspSplitX') as HTMLInputElement).value = p.startPos.x.toFixed(1);

  const selBreak = document.getElementById('inspBreakStyle') as HTMLSelectElement | null;
  if (selBreak) {
    selBreak.value = p.breakStyle || 'SHARP_PIVOT';
  }
  const selChoice = document.getElementById('inspChoiceRule') as HTMLSelectElement | null;
  if (selChoice) {
    if (!p.choiceRules || p.choiceRules.length === 0) {
      selChoice.value = 'NONE';
    } else if (p.choiceRules.some((r) => r.condition === 'MOFC' || r.condition === 'MOFO')) {
      selChoice.value = 'MOFC_MOFO_SEAM';
    } else if (p.choiceRules.some((r) => r.condition === 'MAN' || r.condition === 'ZONE')) {
      selChoice.value = 'MAN_ZONE_WIP';
    } else if (p.choiceRules.some((r) => r.condition === 'LEVERAGE_INSIDE' || r.condition === 'LEVERAGE_OUTSIDE')) {
      selChoice.value = 'LEVERAGE_BREAK';
    } else {
      selChoice.value = 'NONE';
    }
  }

  // Lateral turn radius info
  const maxLat = getMaxLateralCentripetalAccel(p.ratings.agi);
  const turnRad = (9.0 * 9.0) / maxLat;
  (document.getElementById('inspTurnPhysics') as HTMLElement).textContent =
    `Turn Radius @ 9yd/s: ${turnRad.toFixed(2)} yds | Max Acc: ${maxLat.toFixed(1)} y/s²`;

  // 2. Scouting Dossier Card
  const sc = p.scouting;
  if (sc) {
    (document.getElementById('scoutName') as HTMLElement).textContent = `${p.name} (${p.label})`;
    (document.getElementById('scoutOvr') as HTMLElement).textContent = `${sc.ovr} OVR | #${sc.jersey || 0}`;
    (document.getElementById('scoutHeight') as HTMLElement).textContent = sc.height || `6'1"`;
    (document.getElementById('scoutWeight') as HTMLElement).textContent = `${sc.weightLbs || 220} lbs`;
    const forty = Number(sc.fortyYdDash) || 4.55;
    const ten = Number(sc.tenYdSplit) || 1.60;
    const spd = Number(sc.ngsMaxSpeedMph) || 20.0;
    (document.getElementById('scoutForty') as HTMLElement).textContent = `${forty.toFixed(2)}s`;
    (document.getElementById('scoutTen') as HTMLElement).textContent = `${ten.toFixed(2)}s`;
    (document.getElementById('scoutSpeed') as HTMLElement).textContent = `${spd.toFixed(1)} mph`;
    (document.getElementById('scoutReport') as HTMLElement).textContent = `${sc.scoutingReport || 'Starter'} (${sc.ngsMetricLabel || 'Next Gen Stats'})`;
  }

  // 3. Update Pre-Snap Game-Theoretic Diagnostic Badge (Live Alignment & Motion Tell)
  const badge = document.getElementById('preSnapTellBadge');
  if (badge) {
    const is2High =
      currentDefCall === 'COV2_TAMPA' || currentDefCall === 'COV4_QUARTERS' || currentDefCall === 'COV6_SPLIT';
    const is0High = currentDefCall === 'ZERO_BLITZ';
    const shellText = is0High ? '0-HIGH BLITZ' : is2High ? '2-HIGH (MOFO)' : '1-HIGH (MOFC)';
    const boxDefCount = defenseRoster.filter((d) => Math.abs(d.startPos.x) <= 5.0 && d.startPos.y <= 5.6).length;
    const boxAdv =
      boxDefCount <= 6
        ? 'Light Box (Run Adv)'
        : boxDefCount >= 8
        ? 'Loaded Box (Pass Adv)'
        : 'Neutral Box (7)';
    const defPkg =
      currentPersonnel === 'EMPTY_5W'
        ? 'Dime 4-1-6'
        : currentPersonnel === '12_PERSONNEL' || currentPersonnel === '21_PERSONNEL'
        ? 'Base 4-3'
        : 'Nickel 4-2-5';
    const motionTell =
      currentMotion === 'NONE'
        ? 'Static Set (No Motion Tell)'
        : currentDefCall === 'COV1_ROBBER' || currentDefCall === 'ZERO_BLITZ'
        ? 'MAN TRAIL (94% Man Conf — Free Release)'
        : 'ZONE BUMP (91% Zone Conf — Apex Squeeze)';
    badge.textContent = `[${currentPersonnel} vs ${defPkg}] • ${shellText} • Box: ${boxDefCount} (${boxAdv}) • Motion: ${motionTell}`;
  }

  // 4. Highlight Selected Row in Roster Table
  const rows = document.querySelectorAll('#rosterTableBody tr');
  rows.forEach((r) => {
    if (r.getAttribute('data-id') === selectedPlayerId) {
      r.classList.add('selected-row');
    } else {
      r.classList.remove('selected-row');
    }
  });
}

function renderRosterTable(): void {
  const tbody = document.getElementById('rosterTableBody')!;
  tbody.innerHTML = '';

  const allPlayers = [...offenseRoster, ...defenseRoster];
  for (const p of allPlayers) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', p.id);
    if (p.id === selectedPlayerId) tr.classList.add('selected-row');

    const isOff = p.team === 'OFF';
    const tag = isOff ? 'O' : 'D';

    tr.innerHTML = `
      <td style="font-weight:700; color:${isOff ? '#f6c445' : '#e65858'};">${p.id}</td>
      <td style="text-align:left; font-weight:600;">[${tag}] ${p.name} (${p.label})</td>
      <td><input type="number" min="50" max="99" value="${p.ratings.spd}" data-id="${p.id}" data-key="spd" /></td>
      <td><input type="number" min="50" max="99" value="${p.ratings.acc}" data-id="${p.id}" data-key="acc" /></td>
      <td><input type="number" min="50" max="99" value="${p.ratings.agi}" data-id="${p.id}" data-key="agi" /></td>
      <td><input type="number" min="50" max="99" value="${p.ratings.str}" data-id="${p.id}" data-key="str" /></td>
      <td><input type="number" min="50" max="99" value="${isOff ? p.ratings.pbk_anchor : p.ratings.rush_power}" data-id="${p.id}" data-key="${isOff ? 'pbk_anchor' : 'rush_power'}" /></td>
      <td><input type="number" min="50" max="99" value="${isOff ? p.ratings.pbk_lateral : p.ratings.rush_speed}" data-id="${p.id}" data-key="${isOff ? 'pbk_lateral' : 'rush_speed'}" /></td>
      <td><input type="number" min="50" max="99" value="${isOff ? p.ratings.thp : p.ratings.bsh_shed}" data-id="${p.id}" data-key="${isOff ? 'thp' : 'bsh_shed'}" /></td>
      <td><input type="number" min="50" max="99" value="${isOff ? p.ratings.catch_traffic : p.ratings.cov_man}" data-id="${p.id}" data-key="${isOff ? 'catch_traffic' : 'cov_man'}" /></td>
      <td><input type="number" min="50" max="99" value="${isOff ? p.ratings.btk_power : p.ratings.tak_wrap}" data-id="${p.id}" data-key="${isOff ? 'btk_power' : 'tak_wrap'}" /></td>
      <td><input type="number" min="50" max="99" value="${isOff ? p.ratings.lateral_vision : p.ratings.tak_hit_power}" data-id="${p.id}" data-key="${isOff ? 'lateral_vision' : 'tak_hit_power'}" /></td>
    `;

    tr.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      selectedPlayerId = p.id;
      updateInspectorAndScouting();
      renderField();
    });

    tbody.appendChild(tr);
  }

  // Attach input change handlers
  tbody.querySelectorAll('input').forEach((inp) => {
    inp.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const pid = target.getAttribute('data-id')!;
      const key = target.getAttribute('data-key') as keyof PlayerRatings;
      const val = Math.max(50, Math.min(99, parseInt(target.value, 10) || 75));
      const targetPlayer = allPlayers.find((ply) => ply.id === pid);
      if (targetPlayer && key in targetPlayer.ratings) {
        (targetPlayer.ratings as any)[key] = val;
      }
      renderField();
    });
  });
}

// ============================================================================
// CALL-SHEET MATRIX EVALUATION & RENDERING
// ============================================================================

function renderCallSheetMatrix(): void {
  const container = document.getElementById('matrixContainer')!;
  container.innerHTML = '<div style="color:var(--chalk-gold); padding:10px; font-weight:700;">Simulating 8 Concepts across 7 Defensive Coverages...</div>';

  setTimeout(() => {
    const sit = SITUATIONS[currentSituationId];
    const entries = evaluateCallSheetMatrix(offenseRoster, defenseRoster, sit, currentDefFront);

    const schemes: DefensiveCall[] = [
      'COV3_SKY',
      'COV1_ROBBER',
      'COV2_TAMPA',
      'COV4_QUARTERS',
      'COV6_SPLIT',
      'FIRE_ZONE_3',
      'ZERO_BLITZ',
    ];

    const concepts = Object.keys(OFFENSIVE_CONCEPTS) as OffensiveConceptId[];

    let html = `
      <table class="matrix-table">
        <thead>
          <tr>
            <th style="text-align:left;">Offensive Concept</th>
            <th>Cov 3 Sky</th>
            <th>Cov 1 Robber</th>
            <th>Cov 2 Tampa</th>
            <th>Cov 4 Quarters</th>
            <th>Cov 6 Split</th>
            <th>Fire Zone 3</th>
            <th>Cover 0 Blitz</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const cid of concepts) {
      const cSpec = OFFENSIVE_CONCEPTS[cid];
      html += `<tr><td style="text-align:left; font-weight:700; color:var(--chalk-white);">${cSpec.name}</td>`;

      for (const scheme of schemes) {
        const entry = entries.find((e) => e.conceptId === cid && e.scheme === scheme);
        if (entry) {
          const epaStr = entry.meanEpa >= 0 ? `+${entry.meanEpa.toFixed(2)}` : entry.meanEpa.toFixed(2);
          const gradeCls = `grade-${entry.grade[0]}`;
          html += `
            <td>
              <span class="grade-badge ${gradeCls}">${entry.grade}</span>
              <div style="font-size:9.5px; color:#9eb8a7; margin-top:2px;">${epaStr} EPA</div>
              <div style="font-size:8.5px; color:#799180;">${entry.goalRate.toFixed(0)}% Conv</div>
            </td>
          `;
        } else {
          html += `<td>-</td>`;
        }
      }
      html += `</tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
  }, 20);
}

// ============================================================================
// MONTE CARLO EPA HISTOGRAM DENSITY CURVE
// ============================================================================

function renderEpaHistogram(summary: MonteCarloSummary): void {
  const W = histCanvas.width;
  const H = histCanvas.height;

  hCtx.fillStyle = '#14231a';
  hCtx.fillRect(0, 0, W, H);

  // Grid lines
  hCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  hCtx.lineWidth = 1;
  for (let y = 20; y < H; y += 30) {
    hCtx.beginPath();
    hCtx.moveTo(0, y);
    hCtx.lineTo(W, y);
    hCtx.stroke();
  }

  const epas = summary.epaSamples;
  if (!epas || epas.length === 0) return;

  const minEpa = -3.5;
  const maxEpa = +4.0;
  const numBins = 35;
  const bins = new Array(numBins).fill(0);

  for (const epa of epas) {
    const clamped = Math.max(minEpa, Math.min(maxEpa - 0.01, epa));
    const bIdx = Math.floor(((clamped - minEpa) / (maxEpa - minEpa)) * numBins);
    bins[bIdx]++;
  }

  const maxCount = Math.max(...bins, 1);
  const binWidth = W / numBins;

  // Zero EPA vertical divider
  const zeroX = ((0 - minEpa) / (maxEpa - minEpa)) * W;
  hCtx.strokeStyle = 'rgba(245, 245, 240, 0.4)';
  hCtx.lineWidth = 1.5;
  hCtx.setLineDash([4, 3]);
  hCtx.beginPath();
  hCtx.moveTo(zeroX, 0);
  hCtx.lineTo(zeroX, H);
  hCtx.stroke();
  hCtx.setLineDash([]);

  // Draw smooth density bins
  for (let b = 0; b < numBins; b++) {
    const bHeight = (bins[b] / maxCount) * (H - 30);
    const bx = b * binWidth;
    const by = H - bHeight;

    const binEpa = minEpa + (b / numBins) * (maxEpa - minEpa);
    hCtx.fillStyle = binEpa >= 0 ? 'rgba(110, 176, 121, 0.70)' : 'rgba(230, 88, 88, 0.70)';
    hCtx.fillRect(bx + 1, by, binWidth - 2, bHeight);
  }

  // Draw Mean EPA Indicator
  const meanX = ((summary.meanEpa - minEpa) / (maxEpa - minEpa)) * W;
  hCtx.strokeStyle = '#f6c445';
  hCtx.lineWidth = 2.5;
  hCtx.beginPath();
  hCtx.moveTo(meanX, 0);
  hCtx.lineTo(meanX, H);
  hCtx.stroke();

  hCtx.fillStyle = '#f6c445';
  hCtx.font = 'bold 10px monospace';
  hCtx.fillText(`μ = ${summary.meanEpa >= 0 ? '+' : ''}${summary.meanEpa.toFixed(2)}`, Math.max(10, meanX - 25), 15);
}

// ============================================================================
// SIMULATION EXECUTION & ANIMATION LOOP
// ============================================================================

function executeSingleSnapSimulation(): void {
  if (isAnimatingSnap) return;

  if (animRequestHandle !== null) {
    cancelAnimationFrame(animRequestHandle);
    animRequestHandle = null;
  }

  const sit = SITUATIONS[currentSituationId];
  activePlayResult = simulateSingleSnap(
    offenseRoster,
    defenseRoster,
    currentDefCall,
    sit,
    new PRNG(Math.floor(Math.random() * 999999)),
    true, // recordSnapshots
    allowDownfieldLaterals,
    currentMotion,
    currentDefFront,
    currentRiskTolerance,
    currentSpyRole,
    currentDropback,
    currentBlockingScheme,
    currentDefStunt,
    currentMatchCoverage,
    currentDefTactic
  );

  // Update Status and Telemetry
  (document.getElementById('statusBanner') as HTMLElement).textContent =
    `Snap Result: ${activePlayResult.outcome} (${activePlayResult.epa >= 0 ? '+' : ''}${activePlayResult.epa.toFixed(2)} EPA | ${activePlayResult.yardsGained.toFixed(1)} yds)`;
  (document.getElementById('lastSnapOutcomeBadge') as HTMLElement).textContent =
    activePlayResult.outcome;
  (document.getElementById('lastSnapOutcomeBadge') as HTMLElement).style.color =
    activePlayResult.outcome === 'COMPLETE' || activePlayResult.outcome === 'RUN_GAIN' || activePlayResult.outcome === 'RUN_TOUCHDOWN' ? '#6eb079' :
    activePlayResult.outcome === 'INTERCEPTION' || activePlayResult.outcome === 'SACK' || activePlayResult.outcome === 'RUN_STUFF' ? '#e65858' : '#f6c445';

  let fullCommentary = activePlayResult.commentary;
  if (activePlayResult.throwTrajectory) {
    const traj = activePlayResult.throwTrajectory;
    fullCommentary += `\n[BALLISTIC TELEMETRY: ${traj.passType} | Launch: ${traj.launchAngleDeg.toFixed(1)}° | Apex: ${(traj.apexHeightYds * 3).toFixed(1)} ft (${traj.apexHeightYds.toFixed(1)}y) | Hang: ${traj.flightTime.toFixed(2)}s | Exit Vel: ${(traj.v0 * 2.045).toFixed(1)} mph]`;
  }
  (document.getElementById('livePlayCommentary') as HTMLElement).textContent = fullCommentary;

  // Pre-Snap Diagnostic Tell
  (document.getElementById('preSnapTellBadge') as HTMLElement).textContent =
    `[${activePlayResult.preSnapTell.safetyShell}] ${activePlayResult.preSnapTell.summaryText}`;

  // Start Animation Playback
  animFrameCursor = 0;
  isAnimatingSnap = true;
  runAnimationPlayback();
}

function runAnimationPlayback(): void {
  if (!activePlayResult || !isAnimatingSnap) return;

  renderField();

  if (activePlayResult.snapshots.length > 0) {
    const curSnap = activePlayResult.snapshots[Math.min(activePlayResult.snapshots.length - 1, Math.floor(animFrameCursor))];
    let trajText = '';
    if (activePlayResult.throwTrajectory && curSnap.ballState === 'IN_FLIGHT') {
      const traj = activePlayResult.throwTrajectory;
      const altFt = ((curSnap.ballZ ?? 2.1) * 3).toFixed(1);
      trajText = ` | Ball: ${traj.passType} (Loft: ${traj.launchAngleDeg.toFixed(0)}° | Alt: ${altFt}ft | Hang: ${traj.flightTime.toFixed(2)}s)`;
    }
    (document.getElementById('clockReadout') as HTMLElement).textContent =
      `t = ${curSnap.time.toFixed(2)}s | Read #${curSnap.qbReadOrder}${trajText}`;

    // Update QB Read Tree HUD
    if (activePlayResult.qbDecisionTelemetry) {
      renderQbDecisionTreeHud(activePlayResult.qbDecisionTelemetry);
    }
  }

  animFrameCursor += 0.55; // 20 Hz frame advance
  if (animFrameCursor >= activePlayResult.snapshots.length) {
    isAnimatingSnap = false;
    animRequestHandle = null;
    renderField();
    return;
  }

  animRequestHandle = requestAnimationFrame(runAnimationPlayback);
}

function renderQbDecisionTreeHud(telemetry: import('./engine').QbDecisionTelemetry): void {
  const container = document.getElementById('qbReadTreeHud')!;
  let html = '';

  for (const read of telemetry.readEvaluations) {
    const isTargeted = telemetry.chosenTargetName.includes(read.receiverName);
    const opennessPct = Math.round(read.openness * 100);
    const tagCls =
      opennessPct >= 55 ? 'tag-open' :
      opennessPct >= 35 ? 'tag-tight' : 'tag-smothered';
    const tagText =
      opennessPct >= 55 ? 'OPEN' :
      opennessPct >= 35 ? 'CONTESTED' : 'BLANKET';

    html += `
      <div class="read-tree-row ${isTargeted ? 'active-look' : ''}">
        <span style="font-weight:700; color:var(--chalk-white);">${read.receiverName}</span>
        <span style="color:#8da495; font-size:9.5px;">Read #${read.readOrder}</span>
        <div class="read-bar-wrap">
          <div class="read-bar-fill" style="width:${opennessPct}%; background:${opennessPct >= 55 ? '#6eb079' : opennessPct >= 35 ? '#f6c445' : '#e65858'};"></div>
        </div>
        <span class="tag-pill ${tagCls}">${tagText}</span>
        <span style="font-size:9.5px; color:#f6c445; text-align:right;">${read.expectedEpaIfThrown >= 0 ? '+' : ''}${read.expectedEpaIfThrown.toFixed(2)} EPA</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

function updateKpis(summary: {
  meanEpa: number;
  medianEpa: number;
  stdEpa?: number;
  epaSuccessRate: number;
  goalSuccessRate: number;
  completionRate: number;
  avgYards?: number;
  sackRate: number;
  avgTimeToThrow: number;
  intRate?: number;
  scrambleRate: number;
  isRunPlay?: boolean;
  yardsPerCarry?: number;
  stuffRate?: number;
  explosiveRunRate?: number;
  brokenTackleRate?: number;
  rushingSuccessRate?: number;
}): void {
  (document.getElementById('kpiEpa') as HTMLElement).textContent =
    `${summary.meanEpa >= 0 ? '+' : ''}${summary.meanEpa.toFixed(2)}`;
  (document.getElementById('kpiCvar') as HTMLElement).textContent =
    `Median: ${summary.medianEpa >= 0 ? '+' : ''}${summary.medianEpa.toFixed(2)}`;
  (document.getElementById('kpiStd') as HTMLElement).textContent =
    summary.isRunPlay && summary.rushingSuccessRate !== undefined
      ? `Succ: ${summary.rushingSuccessRate.toFixed(1)}%`
      : `${summary.epaSuccessRate.toFixed(1)}%`;
  (document.getElementById('kpiGoal') as HTMLElement).textContent =
    `${summary.goalSuccessRate.toFixed(1)}%`;
  (document.getElementById('kpiComp') as HTMLElement).textContent =
    summary.isRunPlay && summary.yardsPerCarry !== undefined
      ? `YPC: ${summary.yardsPerCarry.toFixed(1)}y`
      : `${summary.completionRate.toFixed(1)}%`;
  (document.getElementById('kpiYards') as HTMLElement).textContent =
    `Avg: ${(summary.avgYards ?? (summary.yardsPerCarry ?? 4.2)).toFixed(1)} yds`;
  (document.getElementById('kpiSack') as HTMLElement).textContent =
    summary.isRunPlay && summary.stuffRate !== undefined
      ? `Stuff: ${summary.stuffRate.toFixed(1)}%`
      : `${summary.sackRate.toFixed(1)}%`;
  (document.getElementById('kpiThrowTime') as HTMLElement).textContent =
    summary.isRunPlay && summary.explosiveRunRate !== undefined
      ? `Expl: ${summary.explosiveRunRate.toFixed(1)}%`
      : `TTT: ${summary.avgTimeToThrow.toFixed(2)}s`;
  if (summary.intRate !== undefined) {
    (document.getElementById('kpiInt') as HTMLElement).textContent =
      summary.isRunPlay ? '0.0%' : `${summary.intRate.toFixed(1)}%`;
  }
  (document.getElementById('kpiCheckdown') as HTMLElement).textContent =
    summary.isRunPlay && summary.brokenTackleRate !== undefined
      ? `BTK: ${summary.brokenTackleRate.toFixed(1)}%`
      : `Scramble: ${summary.scrambleRate.toFixed(1)}%`;

  // Compute situational NFL benchmark and whole-offense percentile
  const sit = SITUATIONS[currentSituationId];
  const report = computeOffensePercentile(summary, sit);

  const kpiPercentile = document.getElementById('kpiPercentile');
  if (kpiPercentile) {
    kpiPercentile.textContent = `${report.percentile.toFixed(1)}th %ile`;
  }
  const kpiPercentileSub = document.getElementById('kpiPercentileSub');
  if (kpiPercentileSub) {
    const dEpaSign = report.deltaEpa >= 0 ? '+' : '';
    kpiPercentileSub.textContent = `Lg: ${report.leagueAvgEpa >= 0 ? '+' : ''}${report.leagueAvgEpa.toFixed(2)} | Δ ${dEpaSign}${report.deltaEpa.toFixed(2)}`;
    kpiPercentileSub.title = report.summaryText;
  }

  // Update Tab 4 dedicated benchmark cards
  const benchPlayEpa = document.getElementById('benchPlayEpa');
  if (benchPlayEpa) {
    benchPlayEpa.textContent = `${summary.meanEpa >= 0 ? '+' : ''}${summary.meanEpa.toFixed(2)} | ${summary.epaSuccessRate.toFixed(1)}%`;
  }
  const benchLeagueEpa = document.getElementById('benchLeagueEpa');
  if (benchLeagueEpa) {
    benchLeagueEpa.textContent = `${report.leagueAvgEpa >= 0 ? '+' : ''}${report.leagueAvgEpa.toFixed(2)} | ${report.leagueAvgSuccessRate.toFixed(1)}%`;
  }
  const benchDeltaEpa = document.getElementById('benchDeltaEpa');
  if (benchDeltaEpa) {
    const dEpaSign = report.deltaEpa >= 0 ? '+' : '';
    const dSrSign = report.deltaSuccessRate >= 0 ? '+' : '';
    benchDeltaEpa.textContent = `${dEpaSign}${report.deltaEpa.toFixed(2)} EPA (${dSrSign}${report.deltaSuccessRate.toFixed(1)}%)`;
    benchDeltaEpa.style.color = report.deltaEpa >= 0 ? '#6eb079' : '#e65858';
  }
  const benchPercentile = document.getElementById('benchPercentile');
  if (benchPercentile) {
    benchPercentile.textContent = `${report.percentile.toFixed(1)}th %ile`;
  }
  const benchFranchiseComp = document.getElementById('benchFranchiseComp');
  if (benchFranchiseComp) {
    benchFranchiseComp.textContent = report.summaryText;
  }
  const offenseTierBadge = document.getElementById('offenseTierBadge');
  if (offenseTierBadge) {
    offenseTierBadge.textContent = report.tierName;
  }
}

function stopEvolution(): void {
  if (currentEvoAbortSignal) {
    currentEvoAbortSignal.aborted = true;
    const statusBanner = document.getElementById('statusBanner') as HTMLElement;
    if (statusBanner) statusBanner.textContent = 'Stopping evolution... finalizing best play found.';
  }
}

function executeMonteCarloBatch(): void {
  const sit = SITUATIONS[currentSituationId];
  (document.getElementById('statusBanner') as HTMLElement).textContent =
    `Running 400 Monte Carlo Rollouts across ${sit.label}...`;

  setTimeout(() => {
    const summary = runMonteCarloBatch(
      offenseRoster,
      defenseRoster,
      currentDefCall,
      sit,
      400,
      42069,
      false,
      currentMotion,
      currentDefFront,
      currentRiskTolerance,
      currentSpyRole,
      currentDropback,
      currentBlockingScheme,
      currentDefStunt,
      currentMatchCoverage,
      currentDefTactic
    );

    lastMcSummary = summary;
    updateKpis(summary);

    (document.getElementById('statusBanner') as HTMLElement).textContent =
      `400 Monte Carlo Complete: ${summary.meanEpa >= 0 ? '+' : ''}${summary.meanEpa.toFixed(2)} Mean EPA | ${summary.goalSuccessRate.toFixed(1)}% Goal Conversion`;

    // Render Histogram
    renderEpaHistogram(summary);
    renderField();
  }, 10);
}

async function executeEvolutionaryMutator(): Promise<void> {
  const sit = SITUATIONS[currentSituationId];
  const selEvoGens = document.getElementById('selEvoGens') as HTMLSelectElement;
  const targetGens = selEvoGens ? parseInt(selEvoGens.value, 10) : 1500;

  const boardWrap = document.getElementById('boardEvoProgress') as HTMLElement;
  const boardLabel = document.getElementById('boardEvoLabel') as HTMLElement;
  const boardBar = document.getElementById('boardEvoBar') as HTMLElement;

  const tabWrap = document.getElementById('evolutionProgressWrap') as HTMLElement;
  const tabTitle = document.getElementById('evoProgressTitle') as HTMLElement;
  const tabBar = document.getElementById('evoProgressBar') as HTMLElement;
  const statEpa = document.getElementById('evoStatEpa') as HTMLElement;
  const statGoal = document.getElementById('evoStatGoal') as HTMLElement;
  const statPercentile = document.getElementById('evoStatPercentile') as HTMLElement;
  const statSack = document.getElementById('evoStatSack') as HTMLElement;
  const statStatus = document.getElementById('evoStatStatus') as HTMLElement;
  const logBox = document.getElementById('mutationLogBox') as HTMLElement;

  if (boardWrap) boardWrap.style.display = 'block';
  if (tabWrap) tabWrap.style.display = 'block';

  const btnMutate = document.getElementById('btnMutate') as HTMLButtonElement;
  const btnMutateTab = document.getElementById('btnMutateTab') as HTMLButtonElement;
  if (btnMutate) {
    btnMutate.disabled = true;
    btnMutate.textContent = '🧬 Optimizing...';
  }
  if (btnMutateTab) {
    btnMutateTab.disabled = true;
    btnMutateTab.textContent = '🧬 Optimizing...';
  }

  currentEvoAbortSignal = { aborted: false };
  const evoBatchSize = Number((document.getElementById('selEvoBatchSize') as HTMLSelectElement)?.value || '3');

  logBox.textContent = `Starting continuous multi-parameter gradient descent across ${targetGens} generations (Batch Size: ${evoBatchSize})...\nSimultaneous route vectors, pre-snap splits, and protection schemes active.\n\n`;

  try {
    const result = await mutatePlayForRosterAsync(
      offenseRoster,
      defenseRoster,
      currentDefCall,
      sit,
      targetGens,
      35,
      currentMotion,
      currentDefFront,
      currentRiskTolerance,
      currentSpyRole,
      currentDropback,
      currentBlockingScheme,
      currentDefStunt,
      currentMatchCoverage,
      (prog: MutationProgress) => {
        const pct = Math.min(100, Math.round((prog.generation / prog.maxGenerations) * 100));

        if (boardBar) boardBar.style.width = `${pct}%`;
        if (tabBar) tabBar.style.width = `${pct}%`;

        const pctText = prog.offensePercentile
          ? ` (${prog.offensePercentile.percentile.toFixed(1)}th %ile)`
          : '';

        if (boardLabel) {
          boardLabel.textContent = `EVOLVING: Gen ${prog.generation}/${prog.maxGenerations} (${pct}%) | Best EPA: ${prog.meanEpa >= 0 ? '+' : ''}${prog.meanEpa.toFixed(2)}${pctText}`;
        }
        if (tabTitle) {
          tabTitle.textContent = `EVOLVING PLAY: Generation ${prog.generation} / ${prog.maxGenerations} (${pct}%)`;
        }

        if (statEpa) statEpa.textContent = `Best EPA: ${prog.meanEpa >= 0 ? '+' : ''}${prog.meanEpa.toFixed(2)}`;
        if (statGoal) statGoal.textContent = `Goal Conv: ${prog.goalRate.toFixed(0)}%`;
        if (statPercentile && prog.offensePercentile) {
          statPercentile.textContent = `Percentile: ${prog.offensePercentile.percentile.toFixed(1)}%`;
        }
        if (statSack) statSack.textContent = `Sack: ${prog.sackRate.toFixed(1)}%`;
        if (statStatus) statStatus.textContent = prog.latestChangeDesc.slice(0, 52);

        const statusBanner = document.getElementById('statusBanner') as HTMLElement;
        if (statusBanner) {
          statusBanner.textContent = `🧬 Optimizing Play: Gen ${prog.generation}/${prog.maxGenerations} | Best EPA: ${prog.meanEpa >= 0 ? '+' : ''}${prog.meanEpa.toFixed(2)} | Goal: ${prog.goalRate.toFixed(0)}%${pctText}`;
        }

        if (prog.accepted) {
          offenseRoster = prog.currentBestPlay;
          currentMotion = prog.currentMotion;
          currentDropback = prog.currentDropback;
          currentBlockingScheme = prog.currentBlocking;
          const selBlocking = document.getElementById('selBlocking') as HTMLSelectElement;
          if (selBlocking) selBlocking.value = currentBlockingScheme;

          const latestLog = prog.logs[prog.logs.length - 1];
          if (latestLog) {
            logBox.textContent =
              `[Gen ${latestLog.generation}] Score: ${latestLog.objectiveScore.toFixed(3)} | μ_EPA: ${latestLog.meanEpa >= 0 ? '+' : ''}${latestLog.meanEpa.toFixed(2)} | Goal: ${latestLog.goalRate.toFixed(0)}% | Sack: ${latestLog.sackRate.toFixed(1)}%\n  -> ${latestLog.changeDescription}\n\n` +
              logBox.textContent;
          }

          updateKpis({
            meanEpa: prog.meanEpa,
            medianEpa: prog.medianEpa,
            stdEpa: prog.stdEpa,
            goalSuccessRate: prog.goalRate,
            epaSuccessRate: prog.epaSuccessRate ?? 50,
            completionRate: prog.compRate,
            sackRate: prog.sackRate,
            avgTimeToThrow: 2.35,
            scrambleRate: 2.5,
          });

          renderField();
        } else if (prog.generation % 10 === 0 || prog.generation === prog.maxGenerations) {
          // Regular GUI refresh every 10 generations even if candidate was rejected
          updateKpis({
            meanEpa: prog.meanEpa,
            medianEpa: prog.medianEpa,
            stdEpa: prog.stdEpa,
            goalSuccessRate: prog.goalRate,
            epaSuccessRate: prog.epaSuccessRate ?? 50,
            completionRate: prog.compRate,
            sackRate: prog.sackRate,
            avgTimeToThrow: 2.35,
            scrambleRate: 2.5,
          });
          renderField();
        }
      },
      currentEvoAbortSignal,
      currentDefTactic,
      evoBatchSize
    );

    offenseRoster = result.optimizedOffense;
    currentMotion = result.optimizedMotion;
    currentDropback = result.optimizedDropback;
    currentBlockingScheme = result.optimizedBlocking;
    const selBlocking = document.getElementById('selBlocking') as HTMLSelectElement;
    if (selBlocking) selBlocking.value = currentBlockingScheme;

    let fullLog = `=========================================================\n`;
    fullLog += `EVOLUTIONARY PLAY OPTIMIZATION COMPLETE (${result.logs.length - 1} improvements found across ${targetGens} gens):\n`;
    fullLog += `Final Mean EPA: ${result.finalSummary.meanEpa >= 0 ? '+' : ''}${result.finalSummary.meanEpa.toFixed(2)} | Goal Conv: ${result.finalSummary.goalSuccessRate.toFixed(1)}% | Sack Rate: ${result.finalSummary.sackRate.toFixed(1)}%\n`;
    fullLog += `NFL Whole Offense Projection: ${result.offensePercentile.percentile.toFixed(1)}th Percentile (${result.offensePercentile.tierName})\n`;
    fullLog += `Franchise Benchmark Comp: ${result.offensePercentile.franchiseComp}\n`;
    fullLog += `=========================================================\n\n`;
    for (const log of result.logs) {
      fullLog += `[Gen ${log.generation}] Score: ${log.objectiveScore.toFixed(3)} | μ_EPA: ${log.meanEpa >= 0 ? '+' : ''}${log.meanEpa.toFixed(2)} | Goal: ${log.goalRate.toFixed(0)}% | Comp: ${log.compRate.toFixed(0)}% | Sack: ${log.sackRate.toFixed(1)}%\n  -> ${log.changeDescription}\n\n`;
    }
    logBox.textContent = fullLog;

    lastMcSummary = result.finalSummary;
    updateKpis(result.finalSummary);
    renderEpaHistogram(result.finalSummary);
    updateInspectorAndScouting();
    renderField();

    (document.getElementById('statusBanner') as HTMLElement).textContent =
      `Evolution Complete: ${result.finalSummary.meanEpa >= 0 ? '+' : ''}${result.finalSummary.meanEpa.toFixed(2)} Mean EPA (${result.offensePercentile.percentile.toFixed(1)}th %ile NFL) | ${result.finalSummary.goalSuccessRate.toFixed(1)}% Goal Conv`;
  } catch (err) {
    console.error('Evolution error:', err);
    logBox.textContent += `\nError during evolution: ${err}`;
  } finally {
    if (boardWrap) boardWrap.style.display = 'none';
    if (tabWrap) tabWrap.style.display = 'none';
    if (btnMutate) {
      btnMutate.disabled = false;
      btnMutate.textContent = '🧬 Evolve Play';
    }
    if (btnMutateTab) {
      btnMutateTab.disabled = false;
      btnMutateTab.textContent = '🧬 Evolve Play';
    }
    currentEvoAbortSignal = null;
  }
}

// ============================================================================
// DEFENSIVE COORDINATOR CONTROLS & MUTATOR
// ============================================================================

function syncDcControlsFromTactic(): void {
  currentDefCall = currentDefTactic.defCall;
  currentDefFront = currentDefTactic.front;
  currentDefStunt = currentDefTactic.dlStunt;
  currentSpyRole = currentDefTactic.spyRole;
  currentMatchCoverage = currentDefTactic.matchCoverage;

  const selCall = document.getElementById('selDefense') as HTMLSelectElement;
  if (selCall) selCall.value = currentDefTactic.defCall;
  const selFront = document.getElementById('selFront') as HTMLSelectElement;
  if (selFront) selFront.value = currentDefTactic.front;
  const selStunt = document.getElementById('selDefStunt') as HTMLSelectElement;
  if (selStunt) selStunt.value = currentDefTactic.dlStunt;

  const selDcCall = document.getElementById('selDcCall') as HTMLSelectElement;
  if (selDcCall) selDcCall.value = currentDefTactic.defCall;
  const selDcFront = document.getElementById('selDcFront') as HTMLSelectElement;
  if (selDcFront) selDcFront.value = currentDefTactic.front;
  const selDcStunt = document.getElementById('selDcStunt') as HTMLSelectElement;
  if (selDcStunt) selDcStunt.value = currentDefTactic.dlStunt;
  const selDcSpy = document.getElementById('selDcSpy') as HTMLSelectElement;
  if (selDcSpy) selDcSpy.value = currentDefTactic.spyRole;
  const chkDcMatch = document.getElementById('chkDcMatch') as HTMLInputElement;
  if (chkDcMatch) chkDcMatch.checked = currentDefTactic.matchCoverage;

  const rngCushion = document.getElementById('rngDcCushion') as HTMLInputElement;
  const lblCushion = document.getElementById('lblDcCushion') as HTMLElement;
  if (rngCushion) rngCushion.value = currentDefTactic.cbCushionY.toFixed(1);
  if (lblCushion) lblCushion.textContent = `${currentDefTactic.cbCushionY.toFixed(1)} yds`;

  const rngSafety = document.getElementById('rngDcSafetyDepth') as HTMLInputElement;
  const lblSafety = document.getElementById('lblDcSafetyDepth') as HTMLElement;
  if (rngSafety) rngSafety.value = currentDefTactic.safetyDepthY.toFixed(1);
  if (lblSafety) lblSafety.textContent = `${currentDefTactic.safetyDepthY.toFixed(1)} yds`;

  const rngUnder = document.getElementById('rngDcUnderDepth') as HTMLInputElement;
  const lblUnder = document.getElementById('lblDcUnderDepth') as HTMLElement;
  if (rngUnder) rngUnder.value = currentDefTactic.underDepthY.toFixed(1);
  if (lblUnder) lblUnder.textContent = `${currentDefTactic.underDepthY.toFixed(1)} yds`;
}

function applyDefensivePreset(presetKey: keyof typeof DEFENSIVE_TACTIC_PRESETS): void {
  const preset = DEFENSIVE_TACTIC_PRESETS[presetKey];
  if (!preset) return;
  currentDefTactic = { ...preset.spec };
  syncDcControlsFromTactic();
  syncDefensiveAlignment();
  renderField();

  const banner = document.getElementById('statusBanner');
  if (banner) {
    banner.textContent = `Applied Defensive Preset: ${preset.name} (${preset.desc})`;
  }
}

async function executeDefensiveMutator(): Promise<void> {
  const sit = SITUATIONS[currentSituationId];
  const selGens = document.getElementById('selDcEvoGens') as HTMLSelectElement;
  const targetGens = selGens ? parseInt(selGens.value, 10) : 300;

  const defWrap = document.getElementById('defEvoProgressWrap') as HTMLElement;
  const defTitle = document.getElementById('defEvoProgressTitle') as HTMLElement;
  const defBar = document.getElementById('defEvoProgressBar') as HTMLElement;
  const statEpa = document.getElementById('defEvoStatEpa') as HTMLElement;
  const statGoal = document.getElementById('defEvoStatGoal') as HTMLElement;
  const statSack = document.getElementById('defEvoStatSack') as HTMLElement;
  const statPressure = document.getElementById('defEvoStatPressure') as HTMLElement;
  const statInt = document.getElementById('defEvoStatInt') as HTMLElement;
  const logBox = document.getElementById('defMutationLogBox') as HTMLElement;

  const btnMutateDef = document.getElementById('btnMutateDef') as HTMLButtonElement;
  if (btnMutateDef) {
    btnMutateDef.disabled = true;
    btnMutateDef.textContent = '🛡️ Evolving Defense...';
  }
  if (defWrap) defWrap.style.display = 'block';

  currentDefEvoAbortSignal = { aborted: false };
  logBox.textContent = `Starting Defensive Evolutionary Optimization across ${targetGens} generations against current offensive concept...\nSearching optimal coverage shell, front alignment, stunt, and player cushions...\n\n`;

  try {
    const result = await mutateDefenseForRosterAsync(
      offenseRoster,
      defenseRoster,
      currentDefTactic,
      sit,
      targetGens,
      35,
      currentMotion,
      currentRiskTolerance,
      currentDropback,
      currentBlockingScheme,
      (prog: DefensiveMutationProgress) => {
        const pct = Math.min(100, Math.round((prog.generation / prog.maxGenerations) * 100));
        if (defBar) defBar.style.width = `${pct}%`;
        if (defTitle) defTitle.textContent = `EVOLVING DEFENSE: Gen ${prog.generation} / ${prog.maxGenerations} (${pct}%)`;
        if (statEpa) statEpa.textContent = `Offense EPA: ${prog.meanEpa >= 0 ? '+' : ''}${prog.meanEpa.toFixed(2)}`;
        if (statGoal) statGoal.textContent = `Goal: ${prog.goalRate.toFixed(0)}%`;
        if (statSack) statSack.textContent = `Sack: ${prog.sackRate.toFixed(1)}%`;
        if (statPressure) statPressure.textContent = `Press: ${prog.pressureRate.toFixed(1)}%`;
        if (statInt) statInt.textContent = `INT: ${prog.intRate.toFixed(1)}%`;

        if (prog.accepted) {
          currentDefTactic = { ...prog.currentTactic };
          syncDcControlsFromTactic();
          syncDefensiveAlignment();
          renderField();

          const latestLog = prog.logs[prog.logs.length - 1];
          if (latestLog) {
            logBox.textContent =
              `[GEN ${latestLog.generation}] Def Score: ${latestLog.objectiveScore.toFixed(3)} | EPA Allowed: ${latestLog.meanEpa >= 0 ? '+' : ''}${latestLog.meanEpa.toFixed(2)} | Sack: ${latestLog.sackRate.toFixed(1)}% | Int: ${latestLog.intRate.toFixed(1)}%\n` +
              `>> ${latestLog.changeDescription}\n\n` +
              logBox.textContent;
          }
        }
      },
      currentDefEvoAbortSignal
    );

    currentDefTactic = { ...result.optimizedTactic };
    syncDcControlsFromTactic();
    syncDefensiveAlignment();
    lastMcSummary = result.finalSummary;
    updateKpis(result.finalSummary);
    renderEpaHistogram(result.finalSummary);
    renderField();

    const banner = document.getElementById('statusBanner');
    if (banner) {
      banner.textContent = `🛡️ Defense Optimized: Countered offense to ${result.finalSummary.meanEpa >= 0 ? '+' : ''}${result.finalSummary.meanEpa.toFixed(2)} EPA (${result.finalSummary.sackRate.toFixed(1)}% Sacks, ${result.finalSummary.intRate.toFixed(1)}% INTs)!`;
    }
  } finally {
    if (defWrap) defWrap.style.display = 'none';
    if (btnMutateDef) {
      btnMutateDef.disabled = false;
      btnMutateDef.textContent = '🧬 Evolve Defense';
    }
    currentDefEvoAbortSignal = null;
  }
}

function stopDefEvolution(): void {
  if (currentDefEvoAbortSignal) {
    currentDefEvoAbortSignal.aborted = true;
  }
}

// ============================================================================
// ADVERSARIAL TICK-TOCK CO-EVOLUTION WAR ROOM
// ============================================================================

async function executeCoEvolutionWarRoom(): Promise<void> {
  const sit = SITUATIONS[currentSituationId];
  const selRounds = document.getElementById('selCoEvoRounds') as HTMLSelectElement;
  const rounds = selRounds ? parseInt(selRounds.value, 10) : 3;

  const selPhaseGens = document.getElementById('selCoEvoPhaseGens') as HTMLSelectElement;
  const phaseGens = selPhaseGens ? parseInt(selPhaseGens.value, 10) : 60;

  const btnStart = document.getElementById('btnStartCoEvo') as HTMLButtonElement;
  const btnStop = document.getElementById('btnStopCoEvo') as HTMLButtonElement;
  const progressWrap = document.getElementById('coevoProgressWrap') as HTMLElement;
  const phaseTitle = document.getElementById('coevoPhaseTitle') as HTMLElement;
  const pctBadge = document.getElementById('coevoPctBadge') as HTMLElement;
  const progressBar = document.getElementById('coevoProgressBar') as HTMLElement;
  const phaseStatus = document.getElementById('coevoPhaseStatus') as HTMLElement;
  const nashBadge = document.getElementById('nashBadge') as HTMLElement;
  const tableBody = document.getElementById('coevoTableBody') as HTMLElement;

  if (btnStart) btnStart.style.display = 'none';
  if (btnStop) btnStop.style.display = 'inline-block';
  if (progressWrap) progressWrap.style.display = 'block';

  currentCoEvoAbortSignal = { aborted: false };
  coEvoHistoryArchive = [];

  tableBody.innerHTML = '';

  const renderHistoryTable = (history: CoEvolutionRoundResult[]) => {
    tableBody.innerHTML = history
      .map((entry, idx) => {
        const isTick = entry.phase === 'TICK_OFFENSE';
        const isTock = entry.phase === 'TOCK_DEFENSE';
        const phaseColor = isTick ? 'var(--chalk-gold)' : isTock ? 'var(--chalk-purple)' : 'var(--chalk-cyan)';
        const phaseIcon = isTick ? '🏈 TICK' : isTock ? '🛡️ TOCK' : '🏁 INIT';
        const epaColor = entry.summary.meanEpa >= 0.15 ? '#6eb079' : entry.summary.meanEpa < -0.1 ? '#e65858' : '#f6c445';
        const deltaColor = entry.deltaEpa > 0.05 ? '#6eb079' : entry.deltaEpa < -0.05 ? '#e65858' : 'var(--chalk-dim)';
        const dSign = entry.deltaEpa >= 0 ? '+' : '';

        return `
          <tr data-history-idx="${idx}" style="cursor:pointer;" title="Click to view play design on chalkboard">
            <td style="color:${phaseColor}; font-weight:700;">
              ${phaseIcon} ${entry.round > 0 ? `R${entry.round}` : ''}
            </td>
            <td>
              <div style="font-weight:700; color:var(--chalk-gold);">${entry.motion !== 'NONE' ? entry.motion : 'Standard Set'}</div>
              <div style="font-size:9.5px; color:var(--chalk-dim);">${entry.blocking} • ${entry.dropback}</div>
            </td>
            <td>
              <div style="font-weight:700; color:var(--chalk-purple);">${entry.defTactic.defCall} (${entry.defTactic.front})</div>
              <div style="font-size:9.5px; color:var(--chalk-dim);">Cushion: ${entry.defTactic.cbCushionY.toFixed(1)}y • ${entry.defTactic.dlStunt}</div>
            </td>
            <td style="font-weight:700; color:${epaColor};">
              ${entry.summary.meanEpa >= 0 ? '+' : ''}${entry.summary.meanEpa.toFixed(2)}
            </td>
            <td>${entry.summary.goalSuccessRate.toFixed(0)}%</td>
            <td>${entry.summary.sackRate.toFixed(1)}%</td>
            <td style="font-weight:700; color:${deltaColor};">
              ${entry.phase === 'INIT' ? '—' : `${dSign}${entry.deltaEpa.toFixed(2)}`}
            </td>
            <td>
              <button class="btn-mc btn-inspect-round" data-inspect-idx="${idx}" style="font-size:9px; padding:2px 6px;">🔍 Inspect</button>
            </td>
          </tr>
          <tr style="background:rgba(0,0,0,0.15); border-bottom:1px solid rgba(255,255,255,0.08);">
            <td colspan="8" style="font-size:10px; color:#c4d7cb; padding:4px 8px 6px 8px; line-height:1.35; font-style:italic;">
              ${entry.narrative}
            </td>
          </tr>
        `;
      })
      .join('');

    tableBody.querySelectorAll('.btn-inspect-round').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).getAttribute('data-inspect-idx') || '0', 10);
        loadCoEvoHistorySnapshot(idx);
      });
    });
    tableBody.querySelectorAll('tr[data-history-idx]').forEach((row) => {
      row.addEventListener('click', () => {
        const idx = parseInt(row.getAttribute('data-history-idx') || '0', 10);
        loadCoEvoHistorySnapshot(idx);
      });
    });
  };

  try {
    const result = await runAdversarialCoEvolutionAsync(
      offenseRoster,
      defenseRoster,
      currentDefTactic,
      sit,
      rounds,
      phaseGens,
      25,
      (prog: CoEvolutionProgress) => {
        coEvoHistoryArchive = prog.history;
        renderHistoryTable(prog.history);

        if (progressBar) progressBar.style.width = `${prog.percentComplete}%`;
        if (pctBadge) pctBadge.textContent = `${prog.percentComplete}%`;
        const phaseName = prog.activePhase === 'TICK_OFFENSE' ? 'TICK: Offense Adapting Routes' : 'TOCK: Defense Pivoting Shell';
        if (phaseTitle) phaseTitle.textContent = `ROUND ${prog.currentRound} / ${prog.totalRounds} • ${phaseName}`;
        if (phaseStatus) phaseStatus.textContent = prog.latestResult.narrative;

        if (nashBadge) {
          if (prog.isNashConverged) {
            nashBadge.textContent = '⚖️ Nash Equilibrium Achieved';
            nashBadge.style.borderColor = 'var(--chalk-green)';
            nashBadge.style.color = 'var(--chalk-green)';
          } else {
            nashBadge.textContent = `⚔️ Adversarial Arms Race (Phase ${prog.phaseIndex}/${prog.totalPhases})`;
            nashBadge.style.borderColor = 'var(--chalk-gold)';
            nashBadge.style.color = 'var(--chalk-gold)';
          }
        }

        offenseRoster = prog.latestResult.offensePlay;
        currentMotion = prog.latestResult.motion;
        currentDropback = prog.latestResult.dropback;
        currentBlockingScheme = prog.latestResult.blocking;
        currentDefTactic = { ...prog.latestResult.defTactic };
        syncDcControlsFromTactic();
        syncDefensiveAlignment();
        renderField();
      },
      currentCoEvoAbortSignal
    );

    coEvoHistoryArchive = result.history;
    renderHistoryTable(result.history);

    offenseRoster = result.finalOffense;
    currentMotion = result.finalMotion;
    currentDropback = result.finalDropback;
    currentBlockingScheme = result.finalBlocking;
    currentDefTactic = { ...result.finalDefTactic };
    syncDcControlsFromTactic();
    syncDefensiveAlignment();

    const lastSnap = result.history[result.history.length - 1];
    if (lastSnap) {
      lastMcSummary = lastSnap.summary;
      updateKpis(lastSnap.summary);
      renderEpaHistogram(lastSnap.summary);
    }
    renderField();

    if (nashBadge) {
      if (result.isNashConverged) {
        nashBadge.textContent = '⚖️ Nash Equilibrium Converged';
        nashBadge.style.borderColor = 'var(--chalk-green)';
        nashBadge.style.color = 'var(--chalk-green)';
      } else {
        nashBadge.textContent = '⚔️ Co-Evolution Cycle Complete';
        nashBadge.style.borderColor = 'var(--chalk-gold)';
        nashBadge.style.color = 'var(--chalk-gold)';
      }
    }

    const banner = document.getElementById('statusBanner');
    if (banner) {
      banner.textContent = result.isNashConverged
        ? `⚔️ Co-Evolution Complete: Nash Equilibrium balance reached (|ΔEPA| < 0.14)!`
        : `⚔️ Co-Evolution Complete: Final EPA ${lastSnap ? (lastSnap.summary.meanEpa >= 0 ? '+' : '') + lastSnap.summary.meanEpa.toFixed(2) : '0.00'}.`;
    }
  } finally {
    if (progressWrap) progressWrap.style.display = 'none';
    if (btnStart) btnStart.style.display = 'inline-block';
    if (btnStop) btnStop.style.display = 'none';
    currentCoEvoAbortSignal = null;
  }
}

function stopCoEvolution(): void {
  if (currentCoEvoAbortSignal) {
    currentCoEvoAbortSignal.aborted = true;
  }
}

function loadCoEvoHistorySnapshot(index: number): void {
  const item = coEvoHistoryArchive[index];
  if (!item) return;

  offenseRoster = item.offensePlay.map((p) => ({
    ...p,
    startPos: { ...p.startPos },
    waypoints: p.waypoints.map((w) => ({ ...w })),
    ratings: { ...p.ratings },
  }));
  currentMotion = item.motion;
  currentDropback = item.dropback;
  currentBlockingScheme = item.blocking;
  currentDefTactic = { ...item.defTactic };

  syncDcControlsFromTactic();
  syncDefensiveAlignment();
  lastMcSummary = item.summary;
  updateKpis(item.summary);
  renderEpaHistogram(item.summary);
  renderField();

  switchTab('tabChalkboard');

  const banner = document.getElementById('statusBanner');
  if (banner) {
    banner.textContent = `Inspecting ${item.title}: ${item.summary.meanEpa >= 0 ? '+' : ''}${item.summary.meanEpa.toFixed(2)} EPA (${item.narrative.slice(0, 75)}...)`;
  }
}

function setCoordinatorMode(mode: 'OC' | 'DC' | 'CO_EVO'): void {
  currentCoordinatorMode = mode;
  const pillOC = document.getElementById('pillModeOC');
  const pillDC = document.getElementById('pillModeDC');
  const pillCoEvo = document.getElementById('pillModeCoEvo');

  if (pillOC) pillOC.classList.toggle('active', currentCoordinatorMode === 'OC');
  if (pillDC) pillDC.classList.toggle('active', currentCoordinatorMode === 'DC');
  if (pillCoEvo) pillCoEvo.classList.toggle('active', currentCoordinatorMode === 'CO_EVO');

  if (currentCoordinatorMode === 'OC') {
    switchTab('tabChalkboard');
  } else if (currentCoordinatorMode === 'DC') {
    switchTab('tabDefensiveCoordinator');
  } else if (currentCoordinatorMode === 'CO_EVO') {
    switchTab('tabCoEvolution');
  }
}

// ============================================================================
// EVENT LISTENERS & INITIALIZATION
// ============================================================================

function setupEventListeners(): void {
  // 1. Matchup Selector & Custom 32-Team Pairing
  const selMatchup = document.getElementById('selMatchup') as HTMLSelectElement;
  const customRow = document.getElementById('customTeamPickRow') as HTMLElement;
  const selCustomOff = document.getElementById('selCustomOffTeam') as HTMLSelectElement;
  const selCustomDef = document.getElementById('selCustomDefTeam') as HTMLSelectElement;

  // Populate Custom 32-team dropdown options
  if (selCustomOff && selCustomDef) {
    const allCodes = getAllNflTeamCodes();
    let optHtml = '<option value="AVG">★ NFL Average (50th %ile)</option>';
    for (const code of allCodes) {
      const team = getNflTeam(code);
      optHtml += `<option value="${code}">${code} - ${team.fullName}</option>`;
    }
    selCustomOff.innerHTML = optHtml;
    selCustomDef.innerHTML = optHtml;
    selCustomOff.value = 'PHI';
    selCustomDef.value = 'JAX';
  }

  const applyActivePreset = () => {
    offenseRoster = activePreset.getOffense();
    defenseRoster = activePreset.getDefense();
    currentDefCall = activePreset.primaryDefCall;
    currentDefFront = activePreset.primaryDefFront;

    (document.getElementById('selDefense') as HTMLSelectElement).value = currentDefCall;
    (document.getElementById('selFront') as HTMLSelectElement).value = currentDefFront;

    if (currentConceptId !== 'CUSTOM') {
      currentDropback = applyOffensiveConcept(offenseRoster, currentConceptId);
    } else {
      applyFormationAndPersonnel(offenseRoster, currentFormation, currentPersonnel);
    }

    const banner = document.getElementById('statusBanner');
    if (banner) {
      banner.textContent = `${activePreset.offenseName.toUpperCase()} vs ${activePreset.defenseName.toUpperCase()} — Ready for Snap`;
    }

    syncDefensiveAlignment();
    updateInspectorAndScouting();
    renderRosterTable();
    renderField();
  };

  selMatchup.addEventListener('change', () => {
    const val = selMatchup.value;
    if (val === 'CUSTOM_TEAM_PICK') {
      if (customRow) customRow.style.display = 'flex';
      activePreset = buildCustomMatchup(selCustomOff.value, selCustomDef.value);
    } else {
      if (customRow) customRow.style.display = 'none';
      currentMatchupId = val as MatchupPresetId;
      activePreset = ALL_PRESET_MATCHUPS[val] || MATCHUP_PRESETS['PHI_VS_JAX'];
    }
    applyActivePreset();
  });

  const onCustomTeamChange = () => {
    activePreset = buildCustomMatchup(selCustomOff.value, selCustomDef.value);
    applyActivePreset();
  };

  if (selCustomOff) selCustomOff.addEventListener('change', onCustomTeamChange);
  if (selCustomDef) selCustomDef.addEventListener('change', onCustomTeamChange);

  // 2. Canonical Offensive Concept Selector
  const selConcept = document.getElementById('selConcept') as HTMLSelectElement;
  selConcept.addEventListener('change', () => {
    currentConceptId = selConcept.value as OffensiveConceptId | 'CUSTOM';
    if (currentConceptId !== 'CUSTOM') {
      const isTheoConcept =
        currentConceptId === 'THEO_SWEEP_TOSS' ||
        currentConceptId === 'THEO_QB_POWER_DRAW' ||
        currentConceptId === 'THEO_PA_BOOT_SHOT' ||
        currentConceptId === 'THEO_INSERT_HOT_LEAK';

      if (isTheoConcept) {
        currentPersonnel = 'HEAVY_6OL_2INSERT';
        const selPers = document.getElementById('selPersonnel') as HTMLSelectElement | null;
        if (selPers) selPers.value = currentPersonnel;

        currentFormation =
          currentConceptId === 'THEO_INSERT_HOT_LEAK' ? 'GUN_HEAVY_OFFSET' : 'PISTOL_HEAVY_INSERT';
        const selForm = document.getElementById('selFormation') as HTMLSelectElement | null;
        if (selForm) selForm.value = currentFormation;
      }

      applyFormationAndPersonnel(offenseRoster, currentFormation, currentPersonnel);
      const conc = OFFENSIVE_CONCEPTS[currentConceptId];
      currentDropback = applyOffensiveConcept(offenseRoster, currentConceptId);
      currentMotion = conc.recommendedMotion;
      (document.getElementById('selMotion') as HTMLSelectElement).value = currentMotion;
      if (conc.recommendedBlocking) {
        currentBlockingScheme = conc.recommendedBlocking;
        const selBlocking = document.getElementById('selBlocking') as HTMLSelectElement;
        if (selBlocking) selBlocking.value = currentBlockingScheme;
      }
      syncDefensiveAlignment();
      renderRosterTable();
    }
    updateInspectorAndScouting();
    renderField();
  });

  // 3. Personnel Selector
  const selPersonnel = document.getElementById('selPersonnel') as HTMLSelectElement | null;
  if (selPersonnel) {
    selPersonnel.addEventListener('change', () => {
      currentPersonnel = selPersonnel.value as OffPersonnelId;
      applyFormationAndPersonnel(offenseRoster, currentFormation, currentPersonnel);
      if (currentConceptId !== 'CUSTOM') {
        currentDropback = applyOffensiveConcept(offenseRoster, currentConceptId);
      }
      syncDefensiveAlignment();
      updateInspectorAndScouting();
      renderRosterTable();
      renderField();
    });
  }

  // 3. Formation & Personnel
  const selFormation = document.getElementById('selFormation') as HTMLSelectElement;
  selFormation.addEventListener('change', () => {
    currentFormation = selFormation.value as OffFormationId;
    applyFormationAndPersonnel(offenseRoster, currentFormation, currentPersonnel);
    updateInspectorAndScouting();
    renderField();
  });

  // 4. Motion
  const selMotion = document.getElementById('selMotion') as HTMLSelectElement;
  selMotion.addEventListener('change', () => {
    currentMotion = selMotion.value as PreSnapMotionId;
    renderField();
  });

  // 5. Defense Front & Scheme
  const selFront = document.getElementById('selFront') as HTMLSelectElement;
  selFront.addEventListener('change', () => {
    currentDefFront = selFront.value as DefFront;
    currentDefTactic.front = currentDefFront;
    syncDcControlsFromTactic();
    syncDefensiveAlignment();
    renderField();
  });

  const selDefense = document.getElementById('selDefense') as HTMLSelectElement;
  selDefense.addEventListener('change', () => {
    currentDefCall = selDefense.value as DefensiveCall;
    currentDefTactic.defCall = currentDefCall;
    syncDcControlsFromTactic();
    syncDefensiveAlignment();
    renderField();
  });

  const selDefStunt = document.getElementById('selDefStunt') as HTMLSelectElement;
  if (selDefStunt) {
    selDefStunt.addEventListener('change', () => {
      currentDefStunt = selDefStunt.value as DLStuntType;
      currentDefTactic.dlStunt = currentDefStunt;
      syncDcControlsFromTactic();
      renderField();
    });
  }

  // 6. Situation
  const selSituation = document.getElementById('selSituation') as HTMLSelectElement;
  selSituation.addEventListener('change', () => {
    currentSituationId = selSituation.value as SituationId;
    syncDefensiveAlignment();
    renderField();
  });

  // 7. Tactical Blocking Scheme
  const selBlocking = document.getElementById('selBlocking') as HTMLSelectElement;
  if (selBlocking) {
    selBlocking.addEventListener('change', () => {
      currentBlockingScheme = selBlocking.value as BlockingSchemeId;
      renderField();
    });
  }

  // 8. Visual Chalk Overlays (Coverage Clouds & Blocking Schemes)
  const chkCoverageClouds = document.getElementById('chkCoverageClouds') as HTMLInputElement;
  if (chkCoverageClouds) {
    chkCoverageClouds.addEventListener('change', () => {
      showCoverageClouds = chkCoverageClouds.checked;
      renderField();
    });
  }

  const chkMatchCoverage = document.getElementById('chkMatchCoverage') as HTMLInputElement;
  if (chkMatchCoverage) {
    chkMatchCoverage.addEventListener('change', () => {
      currentMatchCoverage = chkMatchCoverage.checked;
      renderField();
    });
  }

  const chkBlockingOverlay = document.getElementById('chkBlockingOverlay') as HTMLInputElement;
  if (chkBlockingOverlay) {
    chkBlockingOverlay.addEventListener('change', () => {
      showBlockingOverlay = chkBlockingOverlay.checked;
      renderField();
    });
  }

  // 9. Risk Tolerance & Laterals
  const rngRisk = document.getElementById('rngRisk') as HTMLInputElement;
  rngRisk.addEventListener('input', () => {
    currentRiskTolerance = parseInt(rngRisk.value, 10) / 100;
    (document.getElementById('lblRiskVal') as HTMLElement).textContent = `${rngRisk.value}%`;
  });

  const chkLaterals = document.getElementById('chkLaterals') as HTMLInputElement;
  if (chkLaterals) {
    chkLaterals.addEventListener('change', () => {
      allowDownfieldLaterals = chkLaterals.checked;
    });
  }

  // 10. Buttons
  document.getElementById('btnPlayOne')!.addEventListener('click', executeSingleSnapSimulation);
  document.getElementById('btnRunMC')!.addEventListener('click', executeMonteCarloBatch);
  document.getElementById('btnMutate')!.addEventListener('click', executeEvolutionaryMutator);
  const btnMutateTab = document.getElementById('btnMutateTab');
  if (btnMutateTab) btnMutateTab.addEventListener('click', executeEvolutionaryMutator);

  const btnStopEvolve = document.getElementById('btnStopEvolve');
  if (btnStopEvolve) btnStopEvolve.addEventListener('click', stopEvolution);
  const btnBoardStopEvolve = document.getElementById('btnBoardStopEvolve');
  if (btnBoardStopEvolve) btnBoardStopEvolve.addEventListener('click', stopEvolution);

  document.getElementById('btnMatrix')!.addEventListener('click', () => {
    switchTab('tabCallSheet');
    renderCallSheetMatrix();
  });
  document.getElementById('btnRefreshMatrix')!.addEventListener('click', renderCallSheetMatrix);

  // 11. Coordinator Mode Switching Pills
  const pillOC = document.getElementById('pillModeOC');
  if (pillOC) pillOC.addEventListener('click', () => setCoordinatorMode('OC'));
  const pillDC = document.getElementById('pillModeDC');
  if (pillDC) pillDC.addEventListener('click', () => setCoordinatorMode('DC'));
  const pillCoEvo = document.getElementById('pillModeCoEvo');
  if (pillCoEvo) pillCoEvo.addEventListener('click', () => setCoordinatorMode('CO_EVO'));

  // 12. Defensive Coordinator Console Controls
  document.getElementById('btnPresetFangio')?.addEventListener('click', () => applyDefensivePreset('FANGIO_QUARTERS'));
  document.getElementById('btnPresetBelichick')?.addEventListener('click', () => applyDefensivePreset('BELICHICK_COV1_PRESS'));
  document.getElementById('btnPresetTampa2')?.addEventListener('click', () => applyDefensivePreset('TAMPA_2_DEEP'));
  document.getElementById('btnPresetSpags')?.addEventListener('click', () => applyDefensivePreset('SPAGS_DOUBLE_A_GAP'));
  document.getElementById('btnPresetLeBeau')?.addEventListener('click', () => applyDefensivePreset('LEBEAU_FIRE_ZONE'));
  document.getElementById('btnPresetSaban')?.addEventListener('click', () => applyDefensivePreset('SABAN_COVER_6'));

  const selDcCall = document.getElementById('selDcCall') as HTMLSelectElement;
  if (selDcCall) {
    selDcCall.addEventListener('change', () => {
      currentDefTactic.defCall = selDcCall.value as DefensiveCall;
      currentDefCall = currentDefTactic.defCall;
      const selDefElem = document.getElementById('selDefense') as HTMLSelectElement;
      if (selDefElem) selDefElem.value = currentDefCall;
      syncDefensiveAlignment();
      renderField();
    });
  }

  const selDcFront = document.getElementById('selDcFront') as HTMLSelectElement;
  if (selDcFront) {
    selDcFront.addEventListener('change', () => {
      currentDefTactic.front = selDcFront.value as DefFront;
      currentDefFront = currentDefTactic.front;
      const selFrontElem = document.getElementById('selFront') as HTMLSelectElement;
      if (selFrontElem) selFrontElem.value = currentDefFront;
      syncDefensiveAlignment();
      renderField();
    });
  }

  const selDcStunt = document.getElementById('selDcStunt') as HTMLSelectElement;
  if (selDcStunt) {
    selDcStunt.addEventListener('change', () => {
      currentDefTactic.dlStunt = selDcStunt.value as DLStuntType;
      currentDefStunt = currentDefTactic.dlStunt;
      const selStuntElem = document.getElementById('selDefStunt') as HTMLSelectElement;
      if (selStuntElem) selStuntElem.value = currentDefStunt;
    });
  }

  const selDcSpy = document.getElementById('selDcSpy') as HTMLSelectElement;
  if (selDcSpy) {
    selDcSpy.addEventListener('change', () => {
      currentDefTactic.spyRole = selDcSpy.value as DefSpyRole;
      currentSpyRole = currentDefTactic.spyRole;
      syncDefensiveAlignment();
      renderField();
    });
  }

  const chkDcMatch = document.getElementById('chkDcMatch') as HTMLInputElement;
  if (chkDcMatch) {
    chkDcMatch.addEventListener('change', () => {
      currentDefTactic.matchCoverage = chkDcMatch.checked;
      currentMatchCoverage = currentDefTactic.matchCoverage;
      const chkMatchCoverage = document.getElementById('chkMatchCoverage') as HTMLInputElement;
      if (chkMatchCoverage) chkMatchCoverage.checked = currentMatchCoverage;
    });
  }

  // Defensive Cushion & Depth Sliders
  const rngDcCushion = document.getElementById('rngDcCushion') as HTMLInputElement;
  const lblDcCushion = document.getElementById('lblDcCushion') as HTMLElement;
  if (rngDcCushion) {
    rngDcCushion.addEventListener('input', () => {
      currentDefTactic.cbCushionY = parseFloat(rngDcCushion.value);
      if (lblDcCushion) lblDcCushion.textContent = `${currentDefTactic.cbCushionY.toFixed(1)} yds`;
      syncDefensiveAlignment();
      renderField();
    });
  }

  const rngDcSafetyDepth = document.getElementById('rngDcSafetyDepth') as HTMLInputElement;
  const lblDcSafetyDepth = document.getElementById('lblDcSafetyDepth') as HTMLElement;
  if (rngDcSafetyDepth) {
    rngDcSafetyDepth.addEventListener('input', () => {
      currentDefTactic.safetyDepthY = parseFloat(rngDcSafetyDepth.value);
      if (lblDcSafetyDepth) lblDcSafetyDepth.textContent = `${currentDefTactic.safetyDepthY.toFixed(1)} yds`;
      syncDefensiveAlignment();
      renderField();
    });
  }

  const rngDcUnderDepth = document.getElementById('rngDcUnderDepth') as HTMLInputElement;
  const lblDcUnderDepth = document.getElementById('lblDcUnderDepth') as HTMLElement;
  if (rngDcUnderDepth) {
    rngDcUnderDepth.addEventListener('input', () => {
      currentDefTactic.underDepthY = parseFloat(rngDcUnderDepth.value);
      if (lblDcUnderDepth) lblDcUnderDepth.textContent = `${currentDefTactic.underDepthY.toFixed(1)} yds`;
      syncDefensiveAlignment();
      renderField();
    });
  }

  const btnMutateDef = document.getElementById('btnMutateDef');
  if (btnMutateDef) btnMutateDef.addEventListener('click', executeDefensiveMutator);
  const btnStopDefEvolve = document.getElementById('btnStopDefEvolve');
  if (btnStopDefEvolve) btnStopDefEvolve.addEventListener('click', stopDefEvolution);

  // 13. Tick-Tock Adversarial Co-Evolution
  const btnStartCoEvo = document.getElementById('btnStartCoEvo');
  if (btnStartCoEvo) btnStartCoEvo.addEventListener('click', executeCoEvolutionWarRoom);
  const btnStopCoEvo = document.getElementById('btnStopCoEvo');
  if (btnStopCoEvo) btnStopCoEvo.addEventListener('click', stopCoEvolution);

  // Preset Route buttons
  document.getElementById('btnLoadConceptMesh')!.addEventListener('click', () => {
    selConcept.value = 'MESH';
    currentDropback = applyOffensiveConcept(offenseRoster, 'MESH');
    currentMotion = OFFENSIVE_CONCEPTS['MESH'].recommendedMotion;
    (document.getElementById('selMotion') as HTMLSelectElement).value = currentMotion;
    updateInspectorAndScouting();
    renderField();
  });
  document.getElementById('btnLoadConceptDagger')!.addEventListener('click', () => {
    selConcept.value = 'DAGGER';
    currentDropback = applyOffensiveConcept(offenseRoster, 'DAGGER');
    currentMotion = OFFENSIVE_CONCEPTS['DAGGER'].recommendedMotion;
    (document.getElementById('selMotion') as HTMLSelectElement).value = currentMotion;
    updateInspectorAndScouting();
    renderField();
  });
  document.getElementById('btnLoadConceptStick')!.addEventListener('click', () => {
    selConcept.value = 'STICK_NOD';
    currentDropback = applyOffensiveConcept(offenseRoster, 'STICK_NOD');
    currentMotion = OFFENSIVE_CONCEPTS['STICK_NOD'].recommendedMotion;
    (document.getElementById('selMotion') as HTMLSelectElement).value = currentMotion;
    updateInspectorAndScouting();
    renderField();
  });
  document.getElementById('btnLoadConceptHookLateral')!.addEventListener('click', () => {
    selConcept.value = 'HOOK_LATERAL';
    currentDropback = applyOffensiveConcept(offenseRoster, 'HOOK_LATERAL');
    currentMotion = OFFENSIVE_CONCEPTS['HOOK_LATERAL'].recommendedMotion;
    (document.getElementById('selMotion') as HTMLSelectElement).value = currentMotion;
    updateInspectorAndScouting();
    renderField();
  });
  document.getElementById('btnLoadConceptOrbitShot')?.addEventListener('click', () => {
    selConcept.value = 'EVO_ORBIT_SHOT';
    currentDropback = applyOffensiveConcept(offenseRoster, 'EVO_ORBIT_SHOT');
    currentMotion = OFFENSIVE_CONCEPTS['EVO_ORBIT_SHOT'].recommendedMotion;
    (document.getElementById('selMotion') as HTMLSelectElement).value = currentMotion;
    updateInspectorAndScouting();
    renderField();
  });
  document.getElementById('btnLoadConceptFlapDig')?.addEventListener('click', () => {
    selConcept.value = 'EVO_FLAP_DIG';
    currentDropback = applyOffensiveConcept(offenseRoster, 'EVO_FLAP_DIG');
    currentMotion = OFFENSIVE_CONCEPTS['EVO_FLAP_DIG'].recommendedMotion;
    (document.getElementById('selMotion') as HTMLSelectElement).value = currentMotion;
    updateInspectorAndScouting();
    renderField();
  });
  document.getElementById('btnLoadConceptRubQuick')?.addEventListener('click', () => {
    selConcept.value = 'EVO_RUB_QUICK';
    currentDropback = applyOffensiveConcept(offenseRoster, 'EVO_RUB_QUICK');
    currentMotion = OFFENSIVE_CONCEPTS['EVO_RUB_QUICK'].recommendedMotion;
    (document.getElementById('selMotion') as HTMLSelectElement).value = currentMotion;
    updateInspectorAndScouting();
    renderField();
  });
  document.getElementById('btnClearNodes')!.addEventListener('click', () => {
    const p = offenseRoster.find((ply) => ply.id === selectedPlayerId);
    if (p && p.eligible) {
      p.waypoints = [{ x: p.startPos.x, y: 15.0 }];
      updateInspectorAndScouting();
      renderField();
    }
  });

  // Inspector Route Preset dropdown
  const inspPresetRoute = document.getElementById('inspPresetRoute') as HTMLSelectElement;
  inspPresetRoute.addEventListener('change', () => {
    const val = inspPresetRoute.value;
    const p = offenseRoster.find((ply) => ply.id === selectedPlayerId);
    if (!p || !p.eligible || !val) return;

    if (val === 'SLANT') {
      p.waypoints = [{ x: p.startPos.x, y: 3.0 }, { x: p.startPos.x + (p.startPos.x < 0 ? 8 : -8), y: 7.0 }];
    } else if (val === 'OUT_5') {
      p.waypoints = [{ x: p.startPos.x, y: 5.0 }, { x: p.startPos.x + (p.startPos.x < 0 ? -7 : 7), y: 5.5 }];
    } else if (val === 'WHIP') {
      p.waypoints = [{ x: p.startPos.x + (p.startPos.x < 0 ? 3 : -3), y: 4.5 }, { x: p.startPos.x + (p.startPos.x < 0 ? -6 : 6), y: 5.0 }];
    } else if (val === 'DIG_12') {
      p.waypoints = [{ x: p.startPos.x, y: 12.0 }, { x: p.startPos.x < 0 ? 2.0 : -2.0, y: 12.5 }];
    } else if (val === 'CORNER_10') {
      p.waypoints = [{ x: p.startPos.x, y: 9.0 }, { x: p.startPos.x + (p.startPos.x < 0 ? -8 : 8), y: 15.0 }];
    } else if (val === 'POST_14') {
      p.waypoints = [{ x: p.startPos.x, y: 13.0 }, { x: 0.0, y: 22.0 }];
    } else if (val === 'GO') {
      p.waypoints = [{ x: p.startPos.x, y: 14.0 }, { x: p.startPos.x, y: 26.0 }];
    } else if (val === 'SWING') {
      p.waypoints = [{ x: p.startPos.x + (p.startPos.x < 0 ? -5 : 5), y: -1.5 }, { x: p.startPos.x + (p.startPos.x < 0 ? -11 : 11), y: 2.0 }];
    }
    renderField();
  });

  // Inspector Break Style dropdown
  const inspBreakStyle = document.getElementById('inspBreakStyle') as HTMLSelectElement | null;
  inspBreakStyle?.addEventListener('change', () => {
    const p = offenseRoster.find((ply) => ply.id === selectedPlayerId);
    if (!p || !p.eligible) return;
    p.breakStyle = inspBreakStyle.value as RouteBreakStyle;
    renderField();
  });

  // Inspector Choice Rule dropdown
  const inspChoiceRule = document.getElementById('inspChoiceRule') as HTMLSelectElement | null;
  inspChoiceRule?.addEventListener('change', () => {
    const p = offenseRoster.find((ply) => ply.id === selectedPlayerId);
    if (!p || !p.eligible) return;
    const val = inspChoiceRule.value;
    const x0 = p.startPos.x;
    const insideDir = x0 < 0 ? 1 : -1;
    const outsideDir = -insideDir;

    if (val === 'NONE') {
      p.choiceRules = undefined;
    } else if (val === 'MOFC_MOFO_SEAM') {
      p.choiceRules = [
        {
          condition: 'MOFO',
          description: 'MOFO: Post Seam',
          waypoints: [{ x: 0, y: 22.0 }],
        },
        {
          condition: 'MOFC',
          description: 'MOFC: Out Boundary',
          waypoints: [{ x: x0 + outsideDir * 7.5, y: 12.0 }],
        },
      ];
    } else if (val === 'MAN_ZONE_WIP') {
      p.choiceRules = [
        {
          condition: 'MAN',
          description: 'Man: Whip Out Cut',
          waypoints: [{ x: x0 + outsideDir * 6.5, y: 5.5 }],
        },
        {
          condition: 'ZONE',
          description: 'Zone: Hook Settle',
          waypoints: [{ x: x0, y: 5.5 }],
        },
      ];
    } else if (val === 'LEVERAGE_BREAK') {
      p.choiceRules = [
        {
          condition: 'LEVERAGE_OUTSIDE',
          description: 'Outside Lev: In-Slant',
          waypoints: [{ x: x0 + insideDir * 8.0, y: 7.5 }],
        },
        {
          condition: 'LEVERAGE_INSIDE',
          description: 'Inside Lev: Out-Corner',
          waypoints: [{ x: x0 + outsideDir * 7.5, y: 14.0 }],
        },
      ];
    }
    renderField();
  });

  // Add Landmark button
  const btnAddLandmark = document.getElementById('btnAddLandmark') as HTMLButtonElement | null;
  btnAddLandmark?.addEventListener('click', () => {
    const p = offenseRoster.find((ply) => ply.id === selectedPlayerId);
    if (!p || !p.eligible) return;
    if (p.waypoints.length === 0) {
      p.waypoints.push({ x: p.startPos.x, y: 6.0 });
    } else {
      const last = p.waypoints[p.waypoints.length - 1];
      p.waypoints.push({
        x: Math.max(-23, Math.min(23, last.x + (last.x < 0 ? 3.0 : -3.0))),
        y: Math.min(28, last.y + 4.0),
      });
    }
    updateInspectorAndScouting();
    renderField();
  });

  // Remove Landmark button
  const btnRemoveLandmark = document.getElementById('btnRemoveLandmark') as HTMLButtonElement | null;
  btnRemoveLandmark?.addEventListener('click', () => {
    const p = offenseRoster.find((ply) => ply.id === selectedPlayerId);
    if (!p || !p.eligible || p.waypoints.length <= 1) return;
    p.waypoints.pop();
    updateInspectorAndScouting();
    renderField();
  });

  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab')!;
      switchTab(tabId);
    });
  });

  // Spacebar to trigger snap
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
      e.preventDefault();
      executeSingleSnapSimulation();
    }
  });

  // Support URL query parameters for direct links & headless captures
  const params = new URLSearchParams(window.location.search);
  const qMatchup = params.get('matchup');
  const qSituation = params.get('situation');
  const qFront = params.get('front');
  const qCoverage = params.get('coverage');
  const qConcept = params.get('concept');
  const qMotion = params.get('motion');

  if (qMatchup) {
    if (ALL_PRESET_MATCHUPS[qMatchup]) {
      currentMatchupId = qMatchup as MatchupPresetId;
      activePreset = ALL_PRESET_MATCHUPS[qMatchup];
      selMatchup.value = qMatchup;
      applyActivePreset();
    }
  }
  if (qSituation && SITUATIONS[qSituation as SituationId]) {
    currentSituationId = qSituation as SituationId;
    selSituation.value = qSituation;
  }
  if (qFront) {
    currentDefFront = qFront as DefFront;
    selFront.value = qFront;
  }
  if (qCoverage) {
    currentDefCall = qCoverage as DefensiveCall;
    selDefense.value = qCoverage;
  }
  if (qConcept && OFFENSIVE_CONCEPTS[qConcept as OffensiveConceptId]) {
    currentConceptId = qConcept as OffensiveConceptId;
    selConcept.value = qConcept;
    const conc = OFFENSIVE_CONCEPTS[currentConceptId];
    currentDropback = applyOffensiveConcept(offenseRoster, currentConceptId);
    currentMotion = conc.recommendedMotion;
    selMotion.value = currentMotion;
    if (conc.recommendedBlocking) {
      currentBlockingScheme = conc.recommendedBlocking;
      const selBlocking = document.getElementById('selBlocking') as HTMLSelectElement;
      if (selBlocking) selBlocking.value = currentBlockingScheme;
    }
  }
  const qBlocking = params.get('blocking');
  if (qBlocking) {
    currentBlockingScheme = qBlocking as BlockingSchemeId;
    const selBlocking = document.getElementById('selBlocking') as HTMLSelectElement;
    if (selBlocking) selBlocking.value = currentBlockingScheme;
  }
  if (qMotion) {
    currentMotion = qMotion as PreSnapMotionId;
    selMotion.value = currentMotion;
  }

  // Interactive Dragging on Chalkboard
  setupCanvasInteractivity();
}

function switchTab(tabId: string): void {
  document.querySelectorAll('.tab-btn').forEach((b) => {
    if (b.getAttribute('data-tab') === tabId) b.classList.add('active');
    else b.classList.remove('active');
  });

  document.querySelectorAll('.tab-content').forEach((c) => {
    if (c.id === tabId) c.classList.add('active');
    else c.classList.remove('active');
  });
}

function setupCanvasInteractivity(): void {
  let draggingNode: { player: PlayerConfig; wpIndex: number } | null = null;
  let draggingPlayer: PlayerConfig | null = null;

  fieldCanvas.addEventListener('mousedown', (e) => {
    const rect = fieldCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { x: fx, y: fy } = canvasToField(mouseX, mouseY);

    // 1. Check if clicking a route waypoint node
    for (const p of offenseRoster) {
      if (!p.eligible) continue;
      for (let i = 0; i < p.waypoints.length; i++) {
        const wp = p.waypoints[i];
        const dist = Math.hypot(wp.x - fx, wp.y - fy);
        if (dist < 1.4) {
          draggingNode = { player: p, wpIndex: i };
          selectedPlayerId = p.id;
          updateInspectorAndScouting();
          renderField();
          return;
        }
      }
    }

    // 2. Check if clicking a player token
    const allPlayers = [...offenseRoster, ...defenseRoster];
    for (const p of allPlayers) {
      const dist = Math.hypot(p.startPos.x - fx, p.startPos.y - fy);
      if (dist < 1.6) {
        draggingPlayer = p;
        selectedPlayerId = p.id;
        updateInspectorAndScouting();
        renderField();
        return;
      }
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!draggingNode && !draggingPlayer) return;

    const rect = fieldCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { x: fx, y: fy } = canvasToField(mouseX, mouseY);

    if (draggingNode) {
      draggingNode.player.waypoints[draggingNode.wpIndex] = {
        x: Math.max(-25, Math.min(25, fx)),
        y: Math.max(-4, Math.min(30, fy)),
      };
      renderField();
    } else if (draggingPlayer) {
      draggingPlayer.startPos.x = Math.max(-25, Math.min(25, fx));
      renderField();
    }
  });

  window.addEventListener('mouseup', () => {
    draggingNode = null;
    draggingPlayer = null;
  });
}

// ============================================================================
// APP ENTRY POINT
// ============================================================================
setupEventListeners();
syncDcControlsFromTactic();
syncDefensiveAlignment();
renderRosterTable();
updateInspectorAndScouting();
renderField();
executeMonteCarloBatch();
