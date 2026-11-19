import fs from 'node:fs';
import path from 'node:path';
import {
  All22KinematicEngine,
  BlockRoleType,
  DesignedScrambleReadConfig,
  GapOrSetCode,
  LeverageBias,
  PlayTickSnapshot,
  SimAgent,
  Waypoint2D,
} from './engine.js';
import {
  ADAPTIVE_COUNTER_DEF_FRONTS,
  AdaptiveCounterDefFrontId,
  buildAdaptiveCounterDefense,
  buildModern2027Defense,
  ModernDefFrontId,
} from './vanguard_2027_playbook.js';
import { ARGON_2027_PLAYBOOK, ARGON_2027_ROSTER } from './argon_2027_playbook.js';

// ============================================================================
// CONSTANTS & ARCHETYPES
// ============================================================================
const OPEN_FIELD_FRONTS: ModernDefFrontId[] = [
  'NICKEL_OVER_C3',
  'NICKEL_UNDER_C1',
  'NICKEL_SIM_C2',
  'BASE_34_BEAR_C4',
  'BASE_43_OVER_C1',
  'DIME_MUG_C0',
  'DIME_QUARTERS_MATCH',
  'VIKINGS_MUG_CROSSDOG_C0',
  'VIKINGS_SAFETY_BLITZ_C1',
];

type AllFrontId = ModernDefFrontId | AdaptiveCounterDefFrontId;
const ALL_11_FRONTS: AllFrontId[] = [...OPEN_FIELD_FRONTS, ...ADAPTIVE_COUNTER_DEF_FRONTS];

function buildFront(frontId: AllFrontId): SimAgent[] {
  if ((ADAPTIVE_COUNTER_DEF_FRONTS as readonly string[]).includes(frontId)) {
    return buildAdaptiveCounterDefense(frontId as AdaptiveCounterDefFrontId);
  }
  return buildModern2027Defense(frontId as ModernDefFrontId);
}

interface QbProfile {
  id: string;
  label: string;
  capM: number;
  ratings: SimAgent['ratings'];
}

const QB_PROFILES: QbProfile[] = [
  {
    id: 'ELITE_POCKET_55M',
    label: 'Elite Pocket ($55M)',
    capM: 55.0,
    ratings: { speed: 74, accel: 78, power: 75, finesse: 95, awareness: 95 },
  },
  {
    id: 'MID_MOBILE_18M',
    label: 'Mid-Mobile ($18M)',
    capM: 18.0,
    ratings: { speed: 89, accel: 90, power: 85, finesse: 84, awareness: 83 },
  },
  {
    id: 'RAW_MOBILE_11M',
    label: 'Raw Mobile ($11M)',
    capM: 11.0,
    ratings: { speed: 92, accel: 93, power: 89, finesse: 77, awareness: 78 },
  },
  {
    id: 'ELITE_DUAL_58M',
    label: 'Elite Dual ($58M)',
    capM: 58.0,
    ratings: { speed: 90, accel: 91, power: 88, finesse: 93, awareness: 92 },
  },
];

// Fungible 2-QB on-field room: $13.5M QB1 + $6.5M QB2 = $20.0M total cap
const DUAL_QB1_PROFILE: QbProfile = {
  id: 'DUAL_QB1_13_5M',
  label: 'QB1 Mid-Mobile ($13.5M)',
  capM: 13.5,
  ratings: { speed: 89, accel: 90, power: 86, finesse: 85, awareness: 84 },
};

const DUAL_QB2_PROFILE: QbProfile = {
  id: 'DUAL_QB2_6_5M',
  label: 'QB2 Mobile-Arm ($6.5M)',
  capM: 6.5,
  ratings: { speed: 88, accel: 89, power: 86, finesse: 83, awareness: 81 },
};

// ============================================================================
// ZERO-ORACLE PRE-SNAP CHIRAL DIRECTIONAL SHOTGUN SNAP READER
// Strictly reads ONLY pre-snap visible defender (startX, startY) coordinates!
// Never accesses hidden defAssignment.role, probabilityWeights, or manTargetId.
// ============================================================================
export function selectDirectionalSnapSide(
  defAgents: SimAgent[],
  tieBreakIndex = 0
): { side: 'LEFT' | 'RIGHT'; leftStress: number; rightStress: number; reason: string } {
  let leftBox = 0;
  let rightBox = 0;
  let leftDeep = 0;
  let rightDeep = 0;

  for (const d of defAgents) {
    if (d.side !== 'DEF') continue;
    // Box / edge / overhang leverage visible pre-snap
    if (d.startY <= 5.5 && Math.abs(d.startX) <= 10.5) {
      const weight = d.startY <= 2.6 ? 1.35 : 1.0;
      if (d.startX < -0.4) leftBox += weight;
      else if (d.startX > 0.4) rightBox += weight;
    }
    // Deep safety / bracket tilt visible pre-snap
    if (d.startY > 7.5) {
      if (d.startX < -1.0) leftDeep += 1.0;
      else if (d.startX > 1.0) rightDeep += 1.0;
    }
  }

  const leftStress = +(leftBox + leftDeep * 0.65).toFixed(2);
  const rightStress = +(rightBox + rightDeep * 0.65).toFixed(2);

  if (rightStress > leftStress + 0.25) {
    return {
      side: 'LEFT',
      leftStress,
      rightStress,
      reason: `Right heavy (${rightStress} vs ${leftStress}) -> snap LEFT to QB1`,
    };
  }
  if (leftStress > rightStress + 0.25) {
    return {
      side: 'RIGHT',
      leftStress,
      rightStress,
      reason: `Left heavy (${leftStress} vs ${rightStress}) -> snap RIGHT to QB2`,
    };
  }
  const altSide = tieBreakIndex % 2 === 0 ? 'RIGHT' : 'LEFT';
  return {
    side: altSide,
    leftStress,
    rightStress,
    reason: `Balanced shell (${leftStress} vs ${rightStress}) -> chiral alternate ${altSide}`,
  };
}

// ============================================================================
// AGENT BUILDER HELPERS
// ============================================================================
function makeAgent(
  id: string,
  pos: string,
  name: string,
  x: number,
  y: number,
  ratings: SimAgent['ratings'],
  role: BlockRoleType,
  gapOrSet: GapOrSetCode,
  primaryTargetId: string | null = null,
  secondaryTargetId: string | null = null,
  leverage: LeverageBias = 'INSIDE_OUT',
  waypoints: Waypoint2D[] = [],
  readOrder?: number,
  blockRating?: number,
  climbOrChipDelaySec = 0.55
): SimAgent {
  return {
    id,
    label: pos,
    name,
    side: 'OFF',
    pos,
    startX: x,
    startY: y,
    x,
    y,
    vx: 0,
    vy: 0,
    fx: 0,
    fy: 0,
    engagedWithId: null,
    leverageScore: 0,
    readOrder,
    blockRating,
    ratings: { ...ratings },
    assignment: {
      role,
      primaryTargetId,
      secondaryTargetId,
      gapOrSet,
      leverage,
      climbOrChipDelaySec,
      waypoints: waypoints.map((w) => ({ ...w })),
    },
  };
}

function buildStandardPassOL(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  return [
    makeAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
    makeAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PASS_SET', 'ANGLE_45', '3T', null, 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating),
    makeAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PASS_SET', 'ANGLE_45', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
    makeAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PASS_SET', 'ANGLE_45', '3T', null, 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating),
    makeAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
  ];
}

// ============================================================================
// PLAY 1: READ3_CLEAROUT_VOID_RIGHT (Single-QB Clear-Out Scramble as Read #3)
// ============================================================================
function buildRead3ClearoutVoidRight(qbRatings: SimAgent['ratings'], enableDesignedScramble: boolean): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = buildStandardPassOL();

  // Strictly 7 on LOS w/ uncovered ends (5 OL + WR1 -14.5 + WR2 +14.8)
  // Read #1: WR1 Deep Dig/Post pulls CB1 + FS middle-left
  const wr1 = makeAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -14.0, y: 11.0 },
    { x: -6.5, y: 16.5 },
  ], 1);

  // Clear-out Vertical Go: WR2 drags CB2 + right quarter/half 22 yards deep, emptying 150 sq yds of right grass!
  const wr2 = makeAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.8, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 17.5, y: 12.0 },
    { x: 20.0, y: 22.0 },
  ], 3);

  // Read #2: SL Out/Dig Left pulls NCB away from the right grass corridor
  const sl = makeAgent('SL', 'SL', R.SL_SAMUEL.name, -7.2, -1.10, R.SL_SAMUEL.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -10.5, y: 8.2 },
    { x: -15.5, y: 12.5 },
  ], 2);

  // Read #4 (Spy / Hook Fallback Outlet): 256-lb TE chips RDE (0.35s) then crosses LEFT behind MIKE Spy,
  // dragging SS completely out of the right scramble alley AND sitting open behind the Spy!
  const te = makeAgent('TE', 'TE', R.TE1_WARREN.name, 4.8, -1.10, R.TE1_WARREN.ratings, 'CHIP_RELEASE', 'C_RIGHT', 'RDE', 'LDE', 'OUTSIDE_IN', [
    { x: 1.0, y: 5.0 },
    { x: -5.2, y: 7.4 },
  ], 4, R.TE1_WARREN.blockRating, 0.35);

  // RB flares left flat/wheel (drags WILL left out of box!)
  const rb = makeAgent('RB', 'RB', 'Breece Hall', -2.2, -4.6, { speed: 91, accel: 92, power: 85, finesse: 86, awareness: 85 }, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -9.5, y: -1.5 },
    { x: -15.0, y: 3.5 },
  ], 5, 72);

  // QB half-rolls smoothly outside chipped RDE contain arc to (+4.6, -5.6), ready to throw OR explode into void!
  const qb = makeAgent('QB', 'QB', 'QB1', 0.0, -4.5, qbRatings, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 2.2, y: -5.6 },
    { x: 4.8, y: -5.5 },
  ]);

  if (enableDesignedScramble) {
    const cfg: DesignedScrambleReadConfig = {
      enabled: true,
      afterReadOrder: 2,
      minDecisionTimeSec: 2.00,
      voidCorridorCenterX: 8.2,
      voidCorridorHalfWidthX: 3.3,
      voidCorridorMaxY: 9.5,
      maxDefendersInVoid: 0,
      fallbackReceiverId: 'TE',
      scrambleWaypoints: [
        { x: 7.4, y: -2.0 },
        { x: 8.8, y: 4.5 },
        { x: 10.0, y: 14.5 },
        { x: 11.2, y: 26.0 },
      ],
    };
    qb.designedScrambleRead = cfg;
  }

  return [...ol, wr1, wr2, sl, te, rb, qb];
}

// ============================================================================
// PLAY 2: READ3_MESH_MIDDLE_VOID (Single-QB Central Mesh Clear-Out Read #3)
// ============================================================================
function buildRead3MeshMiddleVoid(qbRatings: SimAgent['ratings'], enableDesignedScramble: boolean): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = buildStandardPassOL();

  // Strictly 7 on LOS w/ uncovered ends (5 OL + WR1 -14.5 + WR2 +14.8)
  const wr1 = makeAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -16.5, y: 10.5 },
    { x: -11.5, y: 18.5 },
  ], 1);

  const wr2 = makeAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.8, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 13.5, y: 9.8 },
    { x: 5.5, y: 14.2 },
  ], 2);

  // Shallow Mesh Right pulls NCB horizontally out of middle box
  const sl = makeAgent('SL', 'SL', R.SL_SAMUEL.name, -6.8, -1.10, R.SL_SAMUEL.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 2.5, y: 4.8 },
    { x: 11.5, y: 6.2 },
    { x: 16.5, y: 8.0 },
  ], 3);

  // Read #4 (Spy-Punish Fallback): TE Mesh Left sits right behind MIKE Spy at +6.5y
  const te = makeAgent('TE', 'TE', R.TE1_WARREN.name, 5.4, -1.10, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -0.8, y: 5.8 },
    { x: -8.5, y: 7.4 },
  ], 4, R.TE1_WARREN.blockRating);

  // RB Wheel Left drags WILL completely out of central void
  const rb = makeAgent('RB', 'RB', 'Breece Hall', -2.4, -4.5, { speed: 91, accel: 92, power: 85, finesse: 86, awareness: 85 }, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -10.0, y: -1.8 },
    { x: -15.5, y: 4.5 },
    { x: -17.0, y: 12.5 },
  ], 5, 72);

  const qb = makeAgent('QB', 'QB', 'QB1', 0.0, -4.5, qbRatings, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 0.0, y: -6.0 },
  ]);

  if (enableDesignedScramble) {
    qb.designedScrambleRead = {
      enabled: true,
      afterReadOrder: 2,
      minDecisionTimeSec: 2.05,
      voidCorridorCenterX: 0.2,
      voidCorridorHalfWidthX: 3.1,
      voidCorridorMaxY: 8.0,
      maxDefendersInVoid: 0,
      fallbackReceiverId: 'TE',
      scrambleWaypoints: [
        { x: 0.6, y: -1.0 },
        { x: 1.4, y: 5.2 },
        { x: 2.2, y: 15.5 },
        { x: 2.8, y: 26.0 },
      ],
    };
  }

  return [...ol, wr1, wr2, sl, te, rb, qb];
}

// ============================================================================
// PLAY 3A: DUAL_QB_FIXED_DIRECT_SNAP_LASER
// Direct head-to-head upgrade of ARGON_DISPLACED_NODE_LASER: replaces 0.18s backward toss
// with 0.00s directional shotgun snap straight to QB2 (pos:'QB', isSnapRecipient:true)
// ============================================================================
function buildDualQbFixedDirectSnapLaser(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = [
    makeAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
    makeAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PASS_SET', 'JUMP_SET', 'NT', null, 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating),
    makeAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PASS_SET', 'JUMP_SET', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
    makeAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PULL_LEAD', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN', [
      { x: 4.5, y: -1.4 },
      { x: 8.6, y: -0.5 },
      { x: 10.4, y: 0.6 },
    ], undefined, R.RG_BORTOLINI.blockRating),
    makeAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
  ];

  // Strictly 7 on LOS w/ uncovered ends (5 OL + WR1 Shakir -14.5 + TE1 Warren +4.8)
  const te = makeAgent('TE', 'TE', R.TE1_WARREN.name, 4.8, -0.35, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 1.8, y: 9.8 },
    { x: 0.5, y: 14.5 },
  ], 2, R.TE1_WARREN.blockRating);

  const wr1 = makeAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -19.5, y: 9.5 },
    { x: -21.0, y: 14.5 },
  ], 3);

  const wr2 = makeAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.8, -1.00, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 20.8, y: 9.6 },
    { x: 22.2, y: 15.5 },
  ], 1);

  const sl = makeAgent('SL', 'TE', R.TE2_TREMBLE.name, 6.2, -1.15, R.TE2_TREMBLE.ratings, 'MAN_BLOCK', 'D_ALLEY', 'DIME', 'SS', 'INSIDE_OUT', [], undefined, R.TE2_TREMBLE.blockRating);

  // QB1 aligns left (-1.9, -4.45) and flares weakside left immediately (zero backward toss!)
  const qb1 = makeAgent('QB', 'QB', R.QB1_RICHARDSON.name, -1.9, -4.45, R.QB1_RICHARDSON.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -6.8, y: -4.2 },
    { x: -11.5, y: -2.0 },
  ], 4);

  // QB2 (Milton, pos:'QB') takes the DIRECT DIRECTIONAL SHOTGUN SNAP at (+1.9, -4.45)
  // with a 0.25s guard-timing hesitation step so pulling RG Bortolini crosses his face to seal the alley!
  const qb2 = makeAgent('RB', 'QB', R.QB2_MILTON.name, 1.9, -4.45, R.QB2_MILTON.ratings, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
    { x: 4.4, y: -5.4 },
    { x: 8.8, y: -4.9 },
    { x: 10.4, y: -1.4 },
    { x: 11.6, y: 4.8 },
    { x: 12.6, y: 18.0 },
  ]);
  qb2.isSnapRecipient = true;
  qb2.optionPass = {
    enabled: true,
    throwerRating: R.QB2_MILTON.throwerRating,
    decisionWindowStartSec: 1.22,
    decisionWindowEndSec: 1.68,
    primaryReceiverId: 'WR2',
    secondaryReceiverId: 'TE',
    separationThresholdYds: 3.70,
  };

  return [...ol, te, wr1, wr2, sl, qb1, qb2];
}

// ============================================================================
// PLAY 3B: DUAL_QB_CHIRAL_DIRECT_SNAP_LASER
// 100% MIRROR-SYMMETRIC Twin-Wing Split-Shotgun 2-QB!
// ZERO pre-snap formation tell! Center snaps LEFT (to QB1) or RIGHT (to QB2)
// strictly away from pre-snap visible defensive stress.
// ============================================================================
function buildDualQbChiralDirectSnapLaser(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const dir = snapSide === 'RIGHT' ? 1 : -1;

  // 100% Symmetric Pre-Snap Alignment:
  // 7 on LOS w/ uncovered ends: 5 OL + WR1 (-14.5, -0.35) + WR2 (+14.5, -0.35)
  // 4 off LOS: SL/Wing-L (-5.6, -1.15), TE/Wing-R (+5.6, -1.15), QB1 (-1.9, -4.5), QB2 (+1.9, -4.5)
  const ol =
    snapSide === 'RIGHT'
      ? [
          makeAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PASS_SET', 'JUMP_SET', 'NT', null, 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating),
          makeAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PASS_SET', 'JUMP_SET', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
          makeAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PULL_LEAD', 'D_ALLEY', 'SS', 'DIME', 'OUTSIDE_IN', [
            { x: 4.5, y: -1.4 },
            { x: 8.6, y: -0.5 },
            { x: 10.4, y: 0.6 },
          ], undefined, R.RG_BORTOLINI.blockRating),
          makeAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', 'RDE', 'LDE', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ]
      : [
          makeAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'MAN_BLOCK', 'B_LEFT', 'LDE', 'RDE', 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PULL_LEAD', 'D_ALLEY', 'WILL', 'NCB', 'OUTSIDE_IN', [
            { x: -4.5, y: -1.4 },
            { x: -8.6, y: -0.5 },
            { x: -10.4, y: 0.6 },
          ], undefined, R.LG_EBROWN.blockRating),
          makeAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PASS_SET', 'JUMP_SET', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
          makeAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PASS_SET', 'JUMP_SET', '3T', null, 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating),
          makeAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ];

  const wr1 = makeAgent(
    'WR1',
    'WR',
    R.WR1_SHAKIR.name,
    -14.5,
    -0.35,
    R.WR1_SHAKIR.ratings,
    'ROUTE',
    'VERTICAL_DEEP',
    null,
    null,
    'NEUTRAL',
    snapSide === 'LEFT'
      ? [
          { x: -20.5, y: 9.6 },
          { x: -22.0, y: 15.5 },
        ]
      : [
          { x: -16.5, y: 11.0 },
          { x: -12.0, y: 18.0 },
        ],
    snapSide === 'LEFT' ? 1 : 3
  );

  const wr2 = makeAgent(
    'WR2',
    'WR',
    R.WR2_WORTHY.name,
    14.5,
    -0.35,
    R.WR2_WORTHY.ratings,
    'ROUTE',
    'VERTICAL_DEEP',
    null,
    null,
    'NEUTRAL',
    snapSide === 'RIGHT'
      ? [
          { x: 20.5, y: 9.6 },
          { x: 22.0, y: 15.5 },
        ]
      : [
          { x: 16.5, y: 11.0 },
          { x: 12.0, y: 18.0 },
        ],
    snapSide === 'RIGHT' ? 1 : 3
  );

  // Twin Symmetric Off-LOS H-Back Wings: snap-side seals edge blitzer, opposite releases into high-hole seam!
  const wingL =
    snapSide === 'LEFT'
      ? makeAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'MAN_BLOCK', 'D_ALLEY', 'NCB', 'WILL', 'INSIDE_OUT', [], undefined, R.TE2_TREMBLE.blockRating)
      : makeAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -1.5, y: 9.6 },
          { x: 2.5, y: 14.0 },
        ], 2, R.TE2_TREMBLE.blockRating);

  const wingR =
    snapSide === 'RIGHT'
      ? makeAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'MAN_BLOCK', 'D_ALLEY', 'DIME', 'SS', 'INSIDE_OUT', [], undefined, R.TE1_WARREN.blockRating)
      : makeAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 1.5, y: 9.6 },
          { x: -2.5, y: 14.0 },
        ], 2, R.TE1_WARREN.blockRating);

  // Twin QBs in Split-Shotgun: QB1 (-1.9, -4.5) & QB2 (+1.9, -4.5)
  // 0.25s guard-timing read step lets pulling Guard cross the QB's face before hitting the perimeter alley!
  const qb1 =
    snapSide === 'LEFT'
      ? makeAgent('QB', 'QB', DUAL_QB1_PROFILE.label, -1.9, -4.5, DUAL_QB1_PROFILE.ratings, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: -4.4, y: -5.4 },
          { x: -8.8, y: -4.9 },
          { x: -10.4, y: -1.4 },
          { x: -11.6, y: 4.8 },
          { x: -12.6, y: 18.0 },
        ])
      : makeAgent('QB', 'QB', DUAL_QB1_PROFILE.label, -1.9, -4.5, DUAL_QB1_PROFILE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -7.5, y: -3.5 },
          { x: -12.5, y: 1.5 },
        ], 4);

  const qb2 =
    snapSide === 'RIGHT'
      ? makeAgent('RB', 'QB', DUAL_QB2_PROFILE.label, 1.9, -4.5, DUAL_QB2_PROFILE.ratings, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 4.4, y: -5.4 },
          { x: 8.8, y: -4.9 },
          { x: 10.4, y: -1.4 },
          { x: 11.6, y: 4.8 },
          { x: 12.6, y: 18.0 },
        ])
      : makeAgent('RB', 'QB', DUAL_QB2_PROFILE.label, 1.9, -4.5, DUAL_QB2_PROFILE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 7.5, y: -3.5 },
          { x: 12.5, y: 1.5 },
        ], 4);

  const activeQb = snapSide === 'RIGHT' ? qb2 : qb1;
  activeQb.isSnapRecipient = true;
  activeQb.optionPass = {
    enabled: true,
    throwerRating: activeQb.ratings.finesse,
    decisionWindowStartSec: 1.22,
    decisionWindowEndSec: 1.68,
    primaryReceiverId: snapSide === 'RIGHT' ? 'WR2' : 'WR1',
    secondaryReceiverId: snapSide === 'RIGHT' ? 'SL' : 'TE',
    separationThresholdYds: 3.65,
  };
  void dir;

  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// ============================================================================
// PLAY 4: DUAL_QB_CHIRAL_DROPBACK_READ3
// Ultimate Synthesis: 100% Mirror-Symmetric Split-Shotgun 2-QB Directional Snap
// + Pure QB_DROP Progression + Designed Scramble-as-Read-#3 IF/THEN Void Logic!
// ============================================================================
function buildDualQbChiralDropbackRead3(snapSide: 'LEFT' | 'RIGHT', enableRead3 = true): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const dir = snapSide === 'RIGHT' ? 1 : -1;
  const ol = buildStandardPassOL();

  // Strictly 7 on LOS w/ uncovered ends (5 OL + WR1 -14.5 + WR2 +14.5)
  // Snap-side WR runs vertical clear-out (empties snap-side alley grass!); backside WR runs Read #1 Post/Dig!
  const wr1 = makeAgent(
    'WR1',
    'WR',
    R.WR1_SHAKIR.name,
    -14.5,
    -0.35,
    R.WR1_SHAKIR.ratings,
    'ROUTE',
    'VERTICAL_DEEP',
    null,
    null,
    'NEUTRAL',
    snapSide === 'LEFT'
      ? [
          { x: -16.8, y: 11.5 },
          { x: -19.5, y: 22.0 },
        ]
      : [
          { x: -13.0, y: 9.8 },
          { x: -4.5, y: 14.5 },
          { x: 2.0, y: 16.0 },
        ],
    snapSide === 'LEFT' ? 3 : 1
  );

  const wr2 = makeAgent(
    'WR2',
    'WR',
    R.WR2_WORTHY.name,
    14.5,
    -0.35,
    R.WR2_WORTHY.ratings,
    'ROUTE',
    'VERTICAL_DEEP',
    null,
    null,
    'NEUTRAL',
    snapSide === 'RIGHT'
      ? [
          { x: 16.8, y: 11.5 },
          { x: 19.5, y: 22.0 },
        ]
      : [
          { x: 13.0, y: 9.8 },
          { x: 4.5, y: 14.5 },
          { x: -2.0, y: 16.0 },
        ],
    snapSide === 'RIGHT' ? 3 : 1
  );

  // Off-LOS symmetric wings (-5.6, -1.10 and +5.6, -1.10):
  // Snap-side wing chips the snap-side DE (0.35s) then crosses opposite behind the Spy as Read #4!
  // Backside wing runs Read #2 Out/Dig away from the engineered void!
  const sl =
    snapSide === 'LEFT'
      ? makeAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.10, R.TE2_TREMBLE.ratings, 'CHIP_RELEASE', 'C_LEFT', 'LDE', 'RDE', 'OUTSIDE_IN', [
          { x: -1.0, y: 5.0 },
          { x: 5.2, y: 7.4 },
        ], 4, R.TE2_TREMBLE.blockRating, 0.35)
      : makeAgent('SL', 'SL', R.SL_SAMUEL.name, -5.6, -1.10, R.SL_SAMUEL.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -10.5, y: 8.2 },
          { x: -15.5, y: 12.5 },
        ], 2);

  const te =
    snapSide === 'RIGHT'
      ? makeAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.10, R.TE1_WARREN.ratings, 'CHIP_RELEASE', 'C_RIGHT', 'RDE', 'LDE', 'OUTSIDE_IN', [
          { x: 1.0, y: 5.0 },
          { x: -5.2, y: 7.4 },
        ], 4, R.TE1_WARREN.blockRating, 0.35)
      : makeAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.10, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 10.5, y: 8.2 },
          { x: 15.5, y: 12.5 },
        ], 2, R.TE1_WARREN.blockRating);

  // Twin Split-Shotgun QBs: active QB half-rolls smoothly toward light flank (already 1.9y outside center!)
  // with Designed Read-3 Void Logic; non-snap QB flares opposite (pulling WILL/FS away!) as Read #5 valve!
  const qb1 =
    snapSide === 'LEFT'
      ? makeAgent('QB', 'QB', DUAL_QB1_PROFILE.label, -1.9, -4.5, DUAL_QB1_PROFILE.ratings, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -3.8, y: -5.5 },
          { x: -5.2, y: -5.4 },
        ])
      : makeAgent('QB', 'QB', DUAL_QB1_PROFILE.label, -1.9, -4.5, DUAL_QB1_PROFILE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -9.5, y: -2.0 },
          { x: -15.0, y: 3.5 },
        ], 5);

  const qb2 =
    snapSide === 'RIGHT'
      ? makeAgent('RB', 'QB', DUAL_QB2_PROFILE.label, 1.9, -4.5, DUAL_QB2_PROFILE.ratings, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 3.8, y: -5.5 },
          { x: 5.2, y: -5.4 },
        ])
      : makeAgent('RB', 'QB', DUAL_QB2_PROFILE.label, 1.9, -4.5, DUAL_QB2_PROFILE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 9.5, y: -2.0 },
          { x: 15.0, y: 3.5 },
        ], 5);

  const activeQb = snapSide === 'RIGHT' ? qb2 : qb1;
  activeQb.isSnapRecipient = true;
  if (enableRead3) {
    activeQb.designedScrambleRead = {
      enabled: true,
      afterReadOrder: 2,
      minDecisionTimeSec: 2.00,
      voidCorridorCenterX: dir * 8.4,
      voidCorridorHalfWidthX: 3.3,
      voidCorridorMaxY: 9.5,
      maxDefendersInVoid: 0,
      fallbackReceiverId: snapSide === 'RIGHT' ? 'TE' : 'SL',
      scrambleWaypoints: [
        { x: dir * 7.6, y: -2.0 },
        { x: dir * 9.0, y: 4.5 },
        { x: dir * 10.2, y: 14.5 },
        { x: dir * 11.4, y: 26.0 },
      ],
    };
  }

  return [...ol, wr1, wr2, sl, te, qb1, qb2];
}

// ============================================================================
// NFL LEGALITY & BIOMECHANICS AUDITOR
// ============================================================================
interface AuditResult {
  name: string;
  onLosCount: number;
  uncoveredEndsOk: boolean;
  maxOlForwardPassY: number;
  maxUnengagedG: number;
  minAgentSep: number;
  passed: boolean;
}

function auditPlayLegalityAndPhysics(
  engine: All22KinematicEngine,
  name: string,
  buildOff: (def: SimAgent[], rep: number) => SimAgent[]
): AuditResult {
  let onLosCount = 0;
  let uncoveredEndsOk = true;
  let maxOlForwardPassY = -99;
  let maxUnengagedG = 0;
  let minAgentSep = 99;

  for (let fIdx = 0; fIdx < ALL_11_FRONTS.length; fIdx++) {
    const def = buildFront(ALL_11_FRONTS[fIdx]);
    const off = buildOff(def, fIdx);
    if (fIdx === 0) {
      const onLos = off.filter((a) => a.startY >= -0.75);
      onLosCount = onLos.length;
      const sortedLos = onLos.slice().sort((a, b) => a.startX - b.startX);
      const leftEnd = sortedLos[0];
      const rightEnd = sortedLos[sortedLos.length - 1];
      const eligiblePos = new Set(['WR', 'TE', 'SL', 'RB', 'QB']);
      uncoveredEndsOk = Boolean(
        leftEnd &&
          rightEnd &&
          eligiblePos.has(leftEnd.pos) &&
          eligiblePos.has(rightEnd.pos) &&
          onLos.length === 7
      );
    }

    const traj = engine.simulatePlay([...off, ...def], 0.65);
    const dt = 0.05;
    for (let t = 1; t < traj.length; t++) {
      const prev = traj[t - 1];
      const curr = traj[t];
      // Check OL ineligible downfield at forward pass release
      if (curr.ball?.forwardPassThrown && !prev.ball?.forwardPassThrown) {
        for (const a of curr.agents) {
          if (a.side === 'OFF' && ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.pos)) {
            if (a.y > maxOlForwardPassY) maxOlForwardPassY = a.y;
          }
        }
      }
      for (const aCurr of curr.agents) {
        const aPrev = prev.agents.find((p) => p.id === aCurr.id);
        if (aPrev && !aCurr.engagedWithId && !aPrev.engagedWithId) {
          const gs = Math.hypot(aCurr.vx - aPrev.vx, aCurr.vy - aPrev.vy) / dt / 10.72;
          if (gs > maxUnengagedG) maxUnengagedG = gs;
        }
      }
      for (let i = 0; i < curr.agents.length; i++) {
        for (let j = i + 1; j < curr.agents.length; j++) {
          const d = Math.hypot(curr.agents[i].x - curr.agents[j].x, curr.agents[i].y - curr.agents[j].y);
          if (d < minAgentSep) minAgentSep = d;
        }
      }
    }
  }

  const passed =
    onLosCount === 7 &&
    uncoveredEndsOk &&
    (maxOlForwardPassY <= 1.05 || maxOlForwardPassY === -99) &&
    maxUnengagedG <= 1.60 &&
    minAgentSep >= 0.20;

  return {
    name,
    onLosCount,
    uncoveredEndsOk,
    maxOlForwardPassY: maxOlForwardPassY === -99 ? 0 : +maxOlForwardPassY.toFixed(2),
    maxUnengagedG: +maxUnengagedG.toFixed(3),
    minAgentSep: +minAgentSep.toFixed(3),
    passed,
  };
}

// ============================================================================
// TELEMETRY AGGREGATOR
// ============================================================================
interface PlayRunStats {
  n: number;
  meanEpa: number;
  meanYds: number;
  read12PassRate: number;
  read12PassEpa: number | null;
  designedScrambleRate: number;
  designedScrambleEpa: number | null;
  designedScrambleYds: number | null;
  fallbackPassRate: number;
  fallbackPassEpa: number | null;
  improvisedScrambleRate: number;
  optionPassRate: number;
  optionKeepRate: number;
  sackRate: number;
  intRate: number;
  fumbleRate: number;
  snapLeftRate: number;
  snapRightRate: number;
}

function evaluateAcrossFronts(
  engine: All22KinematicEngine,
  fronts: AllFrontId[],
  repsPerFront: number,
  buildOff: (def: SimAgent[], rep: number, frontId: AllFrontId) => { off: SimAgent[]; snapSide?: 'LEFT' | 'RIGHT' }
): { overall: PlayRunStats; byFront: Record<string, PlayRunStats> } {
  const accumulate = (snaps: { traj: PlayTickSnapshot[]; snapSide?: 'LEFT' | 'RIGHT' }[]): PlayRunStats => {
    let epaSum = 0;
    let ydsSum = 0;
    let r12Count = 0;
    let r12Epa = 0;
    let dScrCount = 0;
    let dScrEpa = 0;
    let dScrYds = 0;
    let fbCount = 0;
    let fbEpa = 0;
    let impScrCount = 0;
    let optPassCount = 0;
    let optKeepCount = 0;
    let sackCount = 0;
    let intCount = 0;
    let fumCount = 0;
    let leftCount = 0;
    let rightCount = 0;

    for (const { traj, snapSide } of snaps) {
      const term = traj[traj.length - 1];
      const epa = term.expectedEpa ?? 0;
      const yds = term.carrierTackledYards ?? 0;
      epaSum += epa;
      ydsSum += yds;

      if (snapSide === 'LEFT') leftCount++;
      else if (snapSide === 'RIGHT') rightCount++;

      const hasDesignedScramble = traj.some((s) => s.exoticEvent === 'DESIGNED_SCRAMBLE_READ3');
      const hasFallbackPass = traj.some((s) => s.exoticEvent === 'DESIGNED_SCRAMBLE_FALLBACK_PASS');
      const hasImpScramble = traj.some((s) => s.exoticEvent === 'QB_SCRAMBLE');
      const hasOptPass = traj.some((s) => s.exoticEvent === 'OPTION_PASS');
      const hasForwardPass = Boolean(term.ball?.forwardPassThrown);

      if (term.terminationReason === 'SACK') sackCount++;
      if (term.terminationReason === 'INTERCEPTION') intCount++;
      if (term.terminationReason === 'FUMBLE_LOST' || term.terminationReason === 'FUMBLE_RECOVERED') fumCount++;

      if (hasDesignedScramble) {
        dScrCount++;
        dScrEpa += epa;
        dScrYds += yds;
      } else if (hasFallbackPass) {
        fbCount++;
        fbEpa += epa;
      } else if (hasImpScramble) {
        impScrCount++;
      } else if (hasOptPass) {
        optPassCount++;
      } else if (hasForwardPass) {
        r12Count++;
        r12Epa += epa;
      } else if (term.terminationReason !== 'SACK' && term.terminationReason !== 'FUMBLE_LOST' && term.terminationReason !== 'FUMBLE_RECOVERED') {
        optKeepCount++;
      }
    }

    const n = Math.max(1, snaps.length);
    return {
      n: snaps.length,
      meanEpa: +(epaSum / n).toFixed(4),
      meanYds: +(ydsSum / n).toFixed(2),
      read12PassRate: +((r12Count / n) * 100).toFixed(1),
      read12PassEpa: r12Count > 0 ? +(r12Epa / r12Count).toFixed(3) : null,
      designedScrambleRate: +((dScrCount / n) * 100).toFixed(1),
      designedScrambleEpa: dScrCount > 0 ? +(dScrEpa / dScrCount).toFixed(3) : null,
      designedScrambleYds: dScrCount > 0 ? +(dScrYds / dScrCount).toFixed(2) : null,
      fallbackPassRate: +((fbCount / n) * 100).toFixed(1),
      fallbackPassEpa: fbCount > 0 ? +(fbEpa / fbCount).toFixed(3) : null,
      improvisedScrambleRate: +((impScrCount / n) * 100).toFixed(1),
      optionPassRate: +((optPassCount / n) * 100).toFixed(1),
      optionKeepRate: +((optKeepCount / n) * 100).toFixed(1),
      sackRate: +((sackCount / n) * 100).toFixed(1),
      intRate: +((intCount / n) * 100).toFixed(1),
      fumbleRate: +((fumCount / n) * 100).toFixed(2),
      snapLeftRate: +((leftCount / n) * 100).toFixed(1),
      snapRightRate: +((rightCount / n) * 100).toFixed(1),
    };
  };

  const allSnaps: { traj: PlayTickSnapshot[]; snapSide?: 'LEFT' | 'RIGHT' }[] = [];
  const byFront: Record<string, PlayRunStats> = {};

  for (const frontId of fronts) {
    const frontSnaps: { traj: PlayTickSnapshot[]; snapSide?: 'LEFT' | 'RIGHT' }[] = [];
    for (let r = 0; r < repsPerFront; r++) {
      const def = buildFront(frontId);
      const built = buildOff(def, r, frontId);
      const traj = engine.simulatePlay([...built.off, ...def], 0.65);
      frontSnaps.push({ traj, snapSide: built.snapSide });
      allSnaps.push({ traj, snapSide: built.snapSide });
    }
    byFront[frontId] = accumulate(frontSnaps);
  }

  return { overall: accumulate(allSnaps), byFront };
}

// ============================================================================
// MAIN EXPERIMENT RUNNER
// ============================================================================
async function main() {
  const engine = new All22KinematicEngine();
  const REPS_PER_FRONT = 32; // 32 * 11 fronts = 352 snaps per cell

  console.log('===============================================================================');
  console.log('READ-3 DESIGNED SCRAMBLE VOIDS & 2-QB DIRECTIONAL SHOTGUN SNAP LAB (BDB 0.80y)');
  console.log('===============================================================================\n');

  // ---------------------------------------------------------------------------
  // 0. NFL LEGALITY & BIOMECHANICS AUDIT
  // ---------------------------------------------------------------------------
  const audits: AuditResult[] = [
    auditPlayLegalityAndPhysics(engine, 'READ3_CLEAROUT_VOID_RIGHT', () =>
      buildRead3ClearoutVoidRight(QB_PROFILES[1].ratings, true)
    ),
    auditPlayLegalityAndPhysics(engine, 'READ3_MESH_MIDDLE_VOID', () =>
      buildRead3MeshMiddleVoid(QB_PROFILES[1].ratings, true)
    ),
    auditPlayLegalityAndPhysics(engine, 'DUAL_QB_FIXED_DIRECT_SNAP_LASER', () =>
      buildDualQbFixedDirectSnapLaser()
    ),
    auditPlayLegalityAndPhysics(engine, 'DUAL_QB_CHIRAL_DIRECT_SNAP_LASER', (def, rep) => {
      const { side } = selectDirectionalSnapSide(def, rep);
      return buildDualQbChiralDirectSnapLaser(side);
    }),
    auditPlayLegalityAndPhysics(engine, 'DUAL_QB_CHIRAL_DROPBACK_READ3', (def, rep) => {
      const { side } = selectDirectionalSnapSide(def, rep);
      return buildDualQbChiralDropbackRead3(side, true);
    }),
  ];

  console.log('--- 0. STRICT NFL RULES & BIOMECHANICS AUDIT (ALL 11 FRONTS) ---');
  for (const a of audits) {
    console.log(
      `  ${a.name.padEnd(35)} | LOS=${a.onLosCount} | Uncov=${a.uncoveredEndsOk} | MaxOL_Y=${a.maxOlForwardPassY.toFixed(2)}y | MaxG=${a.maxUnengagedG.toFixed(2)}G | MinSep=${a.minAgentSep.toFixed(2)}y | ${a.passed ? 'PASS' : 'FAIL'}`
    );
    if (!a.passed) {
      throw new Error(`Legality/biomechanics audit failed for ${a.name}`);
    }
  }
  console.log('');

  // ---------------------------------------------------------------------------
  // 1. EXPERIMENT 1: DESIGNED SCRAMBLE AS READ #3 (IF/THEN VOID LOGIC)
  // ---------------------------------------------------------------------------
  console.log('--- 1. DESIGNED SCRAMBLE-AS-READ-#3 (A/B CAUSAL LIFT & IF/THEN BRANCHES) ---');
  const read3Results: Record<string, any> = {};

  for (const qbProf of QB_PROFILES) {
    const clearoutOn = evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, () => ({
      off: buildRead3ClearoutVoidRight(qbProf.ratings, true),
    }));
    const clearoutOff = evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, () => ({
      off: buildRead3ClearoutVoidRight(qbProf.ratings, false),
    }));
    const meshOn = evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, () => ({
      off: buildRead3MeshMiddleVoid(qbProf.ratings, true),
    }));
    const meshOff = evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, () => ({
      off: buildRead3MeshMiddleVoid(qbProf.ratings, false),
    }));

    const clearoutLift = +(clearoutOn.overall.meanEpa - clearoutOff.overall.meanEpa).toFixed(4);
    const meshLift = +(meshOn.overall.meanEpa - meshOff.overall.meanEpa).toFixed(4);

    read3Results[qbProf.id] = {
      label: qbProf.label,
      clearoutRight: {
        withRead3: clearoutOn.overall,
        controlNoRead3: clearoutOff.overall,
        causalEpaLift: clearoutLift,
        vsSpyWithRead3: clearoutOn.byFront['NICKEL_QB_SPY_CONTAIN_C1'],
        vsSpyControl: clearoutOff.byFront['NICKEL_QB_SPY_CONTAIN_C1'],
        vsManC1WithRead3: clearoutOn.byFront['NICKEL_UNDER_C1'],
        vsBracketWithRead3: clearoutOn.byFront['NICKEL_CALVIN_BRACKET_WR1'],
      },
      meshMiddle: {
        withRead3: meshOn.overall,
        controlNoRead3: meshOff.overall,
        causalEpaLift: meshLift,
        vsSpyWithRead3: meshOn.byFront['NICKEL_QB_SPY_CONTAIN_C1'],
        vsManC1WithRead3: meshOn.byFront['NICKEL_UNDER_C1'],
      },
    };

    const c = clearoutOn.overall;
    const cs = clearoutOn.byFront['NICKEL_QB_SPY_CONTAIN_C1'];
    const cm = clearoutOn.byFront['NICKEL_UNDER_C1'];
    console.log(
      `  ${qbProf.label.padEnd(20)} | ClearoutRight: ${c.meanEpa >= 0 ? '+' : ''}${c.meanEpa.toFixed(3)} vs Ctrl ${clearoutOff.overall.meanEpa >= 0 ? '+' : ''}${clearoutOff.overall.meanEpa.toFixed(3)} (Δ=${clearoutLift >= 0 ? '+' : ''}${clearoutLift.toFixed(3)}) | R1/2=${c.read12PassRate}% | R3Scr=${c.designedScrambleRate}% (${c.designedScrambleEpa !== null ? (c.designedScrambleEpa >= 0 ? '+' : '') + c.designedScrambleEpa.toFixed(2) : 'n/a'} EPA, ${c.designedScrambleYds ?? '-'}y) | R4FB=${c.fallbackPassRate}% | Sack=${c.sackRate}%`
    );
    console.log(
      `     ↳ vs Man C1: R3Scr=${cm.designedScrambleRate}% (${cm.meanEpa >= 0 ? '+' : ''}${cm.meanEpa.toFixed(3)} EPA) | vs QB_SPY: R3Scr=${cs.designedScrambleRate}%, R4_SpyPunish=${cs.fallbackPassRate}% (${cs.meanEpa >= 0 ? '+' : ''}${cs.meanEpa.toFixed(3)} EPA)`
    );
    const m = meshOn.overall;
    console.log(
      `     ↳ MeshMiddle:  ${m.meanEpa >= 0 ? '+' : ''}${m.meanEpa.toFixed(3)} vs Ctrl ${meshOff.overall.meanEpa >= 0 ? '+' : ''}${meshOff.overall.meanEpa.toFixed(3)} (Δ=${meshLift >= 0 ? '+' : ''}${meshLift.toFixed(3)}) | R3Scr=${m.designedScrambleRate}% (${m.designedScrambleYds ?? '-'}y) | R4FB=${m.fallbackPassRate}% | Sack=${m.sackRate}%`
    );
  }
  console.log('');

  // ---------------------------------------------------------------------------
  // 2. EXPERIMENT 2: ARGON'S 2-QB GREEN SHOOTS + DIRECTIONAL SHOTGUN SNAP A/B/C/D
  // ---------------------------------------------------------------------------
  console.log('--- 2. ARGON 2-QB BASELINE vs DIRECTIONAL SHOTGUN SNAP (ALL 11 FRONTS) ---');
  const argonLaserPlay = ARGON_2027_PLAYBOOK.find((p) => p.id === 'ARGON_DISPLACED_NODE_LASER')!;
  const argonReactorPlay = ARGON_2027_PLAYBOOK.find((p) => p.id === 'ARGON_REACTOR_SWEEP_RIGHT')!;
  const argonMonolithPlay = ARGON_2027_PLAYBOOK.find((p) => p.id === 'ARGON_4MIN_LEFT_MONOLITH')!;
  const argonRelayPlay = ARGON_2027_PLAYBOOK.find((p) => p.id === 'ARGON_NOBLE_KINETIC_RELAY')!;

  const dualQbBenchmarks = [
    {
      id: 'ARGON_DISPLACED_NODE_LASER',
      label: 'A. Argon Displaced Laser (0.18s Toss)',
      run: evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, () => ({
        off: argonLaserPlay.buildOffense(),
        snapSide: 'RIGHT',
      })),
    },
    {
      id: 'DUAL_QB_FIXED_DIRECT_SNAP_LASER',
      label: 'B. Direct-Snap Laser (Fixed Right QB2)',
      run: evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, () => ({
        off: buildDualQbFixedDirectSnapLaser(),
        snapSide: 'RIGHT',
      })),
    },
    {
      id: 'DUAL_QB_CHIRAL_DIRECT_SNAP_LASER',
      label: 'C. Symmetric Chiral 2-QB Direct-Snap Laser',
      run: evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, (def, rep) => {
        const { side } = selectDirectionalSnapSide(def, rep);
        return { off: buildDualQbChiralDirectSnapLaser(side), snapSide: side };
      }),
    },
    {
      id: 'DUAL_QB_CHIRAL_DROPBACK_READ3',
      label: 'D. Symmetric Chiral 2-QB Dropback + Read3',
      run: evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, (def, rep) => {
        const { side } = selectDirectionalSnapSide(def, rep);
        return { off: buildDualQbChiralDropbackRead3(side, true), snapSide: side };
      }),
    },
    {
      id: 'DUAL_QB_CHIRAL_DROPBACK_NO_READ3',
      label: 'D-Ctrl. Chiral 2-QB Dropback (No Read3)',
      run: evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, (def, rep) => {
        const { side } = selectDirectionalSnapSide(def, rep);
        return { off: buildDualQbChiralDropbackRead3(side, false), snapSide: side };
      }),
    },
    {
      id: 'ARGON_REACTOR_SWEEP_RIGHT',
      label: 'Ref. Argon Reactor Sweep (2-QB Run)',
      run: evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, () => ({
        off: argonReactorPlay.buildOffense(),
      })),
    },
    {
      id: 'ARGON_4MIN_LEFT_MONOLITH',
      label: 'Ref. Argon 4Min Monolith (2-QB Power)',
      run: evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, () => ({
        off: argonMonolithPlay.buildOffense(),
      })),
    },
    {
      id: 'ARGON_NOBLE_KINETIC_RELAY',
      label: 'Ref. Argon Noble Kinetic Relay',
      run: evaluateAcrossFronts(engine, ALL_11_FRONTS, REPS_PER_FRONT, () => ({
        off: argonRelayPlay.buildOffense(),
      })),
    },
  ];

  const dualQbSummary: Record<string, any> = {};
  for (const item of dualQbBenchmarks) {
    const o = item.run.overall;
    const open9Mean = +(
      OPEN_FIELD_FRONTS.reduce((acc, f) => acc + item.run.byFront[f].meanEpa, 0) / OPEN_FIELD_FRONTS.length
    ).toFixed(4);
    const spyEpa = item.run.byFront['NICKEL_QB_SPY_CONTAIN_C1'].meanEpa;
    const brkEpa = item.run.byFront['NICKEL_CALVIN_BRACKET_WR1'].meanEpa;
    const mugEpa = item.run.byFront['DIME_MUG_C0'].meanEpa;
    const vikEpa = item.run.byFront['VIKINGS_SAFETY_BLITZ_C1'].meanEpa;

    dualQbSummary[item.id] = {
      label: item.label,
      all11Epa: o.meanEpa,
      open9Epa: open9Mean,
      meanYds: o.meanYds,
      sackRate: o.sackRate,
      intRate: o.intRate,
      fumbleRate: o.fumbleRate,
      snapLeftRate: o.snapLeftRate,
      snapRightRate: o.snapRightRate,
      designedScrambleRate: o.designedScrambleRate,
      fallbackPassRate: o.fallbackPassRate,
      optionPassRate: o.optionPassRate,
      optionKeepRate: o.optionKeepRate,
      vsSpyEpa: spyEpa,
      vsCalvinBracketEpa: brkEpa,
      vsMugC0Epa: mugEpa,
      vsVikingsBlitzEpa: vikEpa,
    };

    console.log(
      `  ${item.label.padEnd(42)} | All11=${o.meanEpa >= 0 ? '+' : ''}${o.meanEpa.toFixed(3)} | Open9=${open9Mean >= 0 ? '+' : ''}${open9Mean.toFixed(3)} | Yds=${o.meanYds.toFixed(1)} | Sack=${o.sackRate}% | Fum=${o.fumbleRate}% | L/R=${o.snapLeftRate}/${o.snapRightRate}% | vsSpy=${spyEpa >= 0 ? '+' : ''}${spyEpa.toFixed(2)} | vsBrk=${brkEpa >= 0 ? '+' : ''}${brkEpa.toFixed(2)}`
    );
  }
  console.log('');

  // Print exact chiral snap routing map across all 11 fronts
  console.log('--- 2B. ZERO-ORACLE CHIRAL DIRECTIONAL SNAP ROUTING BY FRONT ---');
  const snapRoutingMap: Record<string, any> = {};
  for (const frontId of ALL_11_FRONTS) {
    const def = buildFront(frontId);
    const read = selectDirectionalSnapSide(def, 0);
    snapRoutingMap[frontId] = read;
    console.log(`  ${frontId.padEnd(28)} -> ${read.side.padEnd(5)} | ${read.reason}`);
  }
  console.log('');

  // ---------------------------------------------------------------------------
  // 3. EXPERIMENT 3: 17-GAME ON-FIELD 2-QB FUNGIBILITY & HIT-SPLITTING ECONOMICS
  //    Anchored to realistic NFL full-gameplan usage (NOT 100% exotic snaps!):
  //    - Standard Offense baseline (55%-100% of plays): Elite Pocket +0.120 EPA/play, Mid-Mobile +0.025 EPA/play
  //    - Designed Read-3 Void Dropbacks: 20%-25% snap share, with 50% conservative NFL defensive-adaptation haircut
  //    - On-Field 2-QB Chiral Direct-Snap Package: 25% snap share, with 50% conservative adaptation haircut
  //    - Attrition hazard: seasonGames = 17 * exp(-0.00145 * annualRushContacts - 0.0022 * annualSacks)
  //    - Defensive Cap Reinvestment: +0.068 PPG net margin per $1M reallocated vs $60M QB room
  // ---------------------------------------------------------------------------
  console.log('--- 3. 17-GAME ON-FIELD 2-QB HIT-SPLITTING & ZERO-DEAD-CAP ECONOMICS ---');
  const expectedHealthyGames = (rushContactsPerSeason: number, sacksPerSeason: number): number => {
    const hazard = 0.00145 * rushContactsPerSeason + 0.0022 * sacksPerSeason;
    return +(17 * Math.min(0.985, Math.exp(-hazard))).toFixed(2);
  };

  const ADAPT_HAIRCUT = 0.50; // Conservative 50% discount for NFL week-to-week defensive scouting adaptation
  const ELITE_STD_BASE_EPA = 0.120;
  const MID_MOBILE_STD_BASE_EPA = 0.025;

  const midRead3CausalLift =
    0.5 *
    (read3Results['MID_MOBILE_18M'].clearoutRight.causalEpaLift +
      read3Results['MID_MOBILE_18M'].meshMiddle.causalEpaLift);
  const dualDropRead3CausalLift =
    dualQbSummary['DUAL_QB_CHIRAL_DROPBACK_READ3'].all11Epa -
    dualQbSummary['DUAL_QB_CHIRAL_DROPBACK_NO_READ3'].all11Epa;
  const dualChiralLaserVsStdLift =
    dualQbSummary['DUAL_QB_CHIRAL_DIRECT_SNAP_LASER'].all11Epa - MID_MOBILE_STD_BASE_EPA;

  // Incremental full-game EPA/play (62 plays/game) with realistic package snap shares
  const singleMidRead3FullGameEpa = +(
    MID_MOBILE_STD_BASE_EPA +
    0.25 * ADAPT_HAIRCUT * Math.max(0, midRead3CausalLift)
  ).toFixed(4);
  const onField2QbFullGameEpa = +(
    MID_MOBILE_STD_BASE_EPA +
    0.20 * ADAPT_HAIRCUT * Math.max(0, dualDropRead3CausalLift) +
    0.25 * ADAPT_HAIRCUT * Math.max(0, dualChiralLaserVsStdLift)
  ).toFixed(4);

  const PLAYS_PER_GAME = 62;
  const DEF_CAP_PPG_PER_M = 0.068;
  const REF_QB_CAP_M = 60.0;

  const eliteHealthy = expectedHealthyGames(18, 32);
  const eliteBlendedRefEpa = +(
    ELITE_STD_BASE_EPA +
    ((17 - eliteHealthy) / 17) * -0.145
  ).toFixed(4);

  const architectures = [
    {
      name: '1. Elite Pocket Protected ($55M + $5M idle = $60M)',
      roomCapM: 60.0,
      qb1Rushes: 18,
      qb1Sacks: 32,
      qb2OnField: false,
      baseEpa: ELITE_STD_BASE_EPA,
      oneOutEpa: ELITE_STD_BASE_EPA - 0.145, // Severe backup cliff when $55M star misses time
      bothOutEpa: ELITE_STD_BASE_EPA - 0.145,
    },
    {
      name: '2. Single Mid-Mobile + Read3 (25% share, $18M + $5M = $23M)',
      roomCapM: 23.0,
      qb1Rushes: 135, // High single-body contact load
      qb1Sacks: 36,
      qb2OnField: false,
      baseEpa: singleMidRead3FullGameEpa,
      oneOutEpa: MID_MOBILE_STD_BASE_EPA - 0.055,
      bothOutEpa: MID_MOBILE_STD_BASE_EPA - 0.055,
    },
    {
      name: '3. Fungible 2-QB Bench Rotation (25% Read3, $13.5M+$6.5M = $20M)',
      roomCapM: 20.0,
      qb1Rushes: 135,
      qb1Sacks: 36,
      qb2OnField: false,
      baseEpa: singleMidRead3FullGameEpa,
      oneOutEpa: singleMidRead3FullGameEpa - 0.020, // Fungible QB2 absorbs attrition smoothly
      bothOutEpa: singleMidRead3FullGameEpa - 0.080,
    },
    {
      name: '4. On-Field 2-QB Split-Gun Directional Snap (25% Chiral + 20% R3, $20M)',
      roomCapM: 20.0,
      qb1Rushes: 68, // 50/50 chiral hit split across QB1 & QB2!
      qb1Sacks: 16,  // Lower sack rate + split 50/50
      qb2OnField: true,
      baseEpa: onField2QbFullGameEpa,
      oneOutEpa: singleMidRead3FullGameEpa, // Other healthy mobile QB still runs single-QB Read-3!
      bothOutEpa: MID_MOBILE_STD_BASE_EPA - 0.070,
    },
  ];

  const seasonEconomics = architectures.map((arch) => {
    const qb1Games = expectedHealthyGames(arch.qb1Rushes, arch.qb1Sacks);
    const pHealthy = qb1Games / 17;
    const bothHealthyGames = arch.qb2OnField ? +(17 * pHealthy * pHealthy).toFixed(2) : qb1Games;
    const oneHealthyGames = arch.qb2OnField ? +(17 * 2 * pHealthy * (1 - pHealthy)).toFixed(2) : +(17 - qb1Games).toFixed(2);
    const neitherHealthyGames = arch.qb2OnField ? +(17 * (1 - pHealthy) * (1 - pHealthy)).toFixed(2) : 0;
    const atLeastOneHealthyGames = +(bothHealthyGames + (arch.qb2OnField ? oneHealthyGames : 0)).toFixed(2);

    const blendedEpa = +(
      (bothHealthyGames / 17) * arch.baseEpa +
      (oneHealthyGames / 17) * arch.oneOutEpa +
      (neitherHealthyGames / 17) * arch.bothOutEpa
    ).toFixed(4);
    const capSavedM = +(REF_QB_CAP_M - arch.roomCapM).toFixed(1);
    const defCapPpgBonus = +(capSavedM * DEF_CAP_PPG_PER_M).toFixed(2);
    const offPpgRel = +((blendedEpa - eliteBlendedRefEpa) * PLAYS_PER_GAME).toFixed(2);
    const netPointDiffVsElitePpg = +(offPpgRel + defCapPpgBonus).toFixed(2);

    console.log(
      `  ${arch.name.padEnd(72)} | QB1_G=${qb1Games.toFixed(1)} | Both_G=${bothHealthyGames.toFixed(1)} | >=1_G=${atLeastOneHealthyGames.toFixed(1)} | BlendEPA=${blendedEpa >= 0 ? '+' : ''}${blendedEpa.toFixed(3)} | OffΔ=${offPpgRel >= 0 ? '+' : ''}${offPpgRel.toFixed(2)} | DefCap=+${defCapPpgBonus.toFixed(2)} | NetΔ=${netPointDiffVsElitePpg >= 0 ? '+' : ''}${netPointDiffVsElitePpg.toFixed(2)} PPG`
    );

    return {
      ...arch,
      qb1HealthyGames: qb1Games,
      fullPackageGames: bothHealthyGames,
      atLeastOneHealthyGames,
      blendedEpa,
      capSavedM,
      defCapPpgBonus,
      offPpgRel,
      netPointDiffVsElitePpg,
    };
  });

  // Save report
  const report = {
    generatedAt: new Date().toISOString(),
    repsPerFront: REPS_PER_FRONT,
    frontsEvaluated: ALL_11_FRONTS,
    legalityAndBiomechanicsAudit: audits,
    experiment1_designedScrambleRead3: read3Results,
    experiment2_dualQbDirectionalSnap: dualQbSummary,
    experiment2b_zeroOracleSnapRouting: snapRoutingMap,
    experiment3_seasonHitSplitEconomics: seasonEconomics,
  };

  const outPath = path.join(process.cwd(), 'src', 'data', 'read3_scramble_dual_qb_report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n[SAVED] ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
