import fs from 'node:fs';
import path from 'node:path';
import {
  All22KinematicEngine,
  BlockRoleType,
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
import {
  BASELINE_PHILOSOPHIES,
  BaselineRosterProfile,
  buildBaselinePlay,
  CanonicalPlayId,
} from './canonical_baselines.js';
import { selectDirectionalSnapSide } from './analyze_read3_scramble_and_dual_qb.js';

// ============================================================================
// 1. DEFENSIVE UNIVERSES: 9 LEGACY FRONTS vs FULL 13 ADAPTIVE FRONTS
// ============================================================================
export const LEGACY_9_FRONTS: ModernDefFrontId[] = [
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

export type AnyDefFrontId = ModernDefFrontId | AdaptiveCounterDefFrontId;

export const ALL_13_FRONTS: AnyDefFrontId[] = [
  ...LEGACY_9_FRONTS,
  ...ADAPTIVE_COUNTER_DEF_FRONTS,
];

function buildAnyDefense(frontId: AnyDefFrontId): SimAgent[] {
  if ((ADAPTIVE_COUNTER_DEF_FRONTS as readonly string[]).includes(frontId)) {
    return buildAdaptiveCounterDefense(frontId as AdaptiveCounterDefFrontId);
  }
  return buildModern2027Defense(frontId as ModernDefFrontId);
}

// ============================================================================
// 2. AGENT BUILDER HELPERS & QB PROFILES
// ============================================================================
const ELITE_POCKET_QB: SimAgent['ratings'] = {
  speed: 74,
  accel: 78,
  power: 75,
  finesse: 95,
  awareness: 95,
};
const SUPERMAX_DUAL_QB: SimAgent['ratings'] = {
  speed: 90,
  accel: 91,
  power: 88,
  finesse: 93,
  awareness: 92,
};
const MID_MOBILE_QB: SimAgent['ratings'] = {
  speed: 89,
  accel: 90,
  power: 85,
  finesse: 84,
  awareness: 83,
};
const DUAL_QB1_RATINGS: SimAgent['ratings'] = {
  speed: 89,
  accel: 90,
  power: 86,
  finesse: 85,
  awareness: 84,
};
const DUAL_QB2_RATINGS: SimAgent['ratings'] = {
  speed: 88,
  accel: 89,
  power: 86,
  finesse: 83,
  awareness: 81,
};

function makeOffAgent(
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

function buildPassOL(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  return [
    makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
    makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PASS_SET', 'ANGLE_45', '3T', null, 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating),
    makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PASS_SET', 'ANGLE_45', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
    makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PASS_SET', 'ANGLE_45', '3T', null, 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating),
    makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
  ];
}

// ============================================================================
// 3. ARGON V2 SYMMETRIC 2-QB CHIRAL PLAYS (ZERO PRE-SNAP TELL, ZERO ORACLE)
//    All 4 core split-gun plays align in the EXACT same 100% left-right mirror
//    symmetric formation: 5 OL + WR1(-14.5) + WR2(+14.5) on LOS (7 total);
//    SL(-5.6), TE(+5.6), QB1(-1.9,-4.5), QB2(+1.9,-4.5) off LOS!
// ============================================================================

// Play A: Symmetric Chiral 2-QB Direct-Snap Laser (Perimeter RPO Rollout)
function buildChiralDirectSnapLaser(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol =
    snapSide === 'RIGHT'
      ? [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PASS_SET', 'JUMP_SET', 'NT', null, 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PASS_SET', 'JUMP_SET', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PULL_LEAD', 'D_ALLEY', 'DIME', 'SS', 'OUTSIDE_IN', [
            { x: 4.5, y: -1.4 },
            { x: 8.6, y: -0.5 },
            { x: 10.4, y: 0.6 },
          ], undefined, R.RG_BORTOLINI.blockRating),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', 'RDE', 'ROLB', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ]
      : [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'MAN_BLOCK', 'B_LEFT', 'LDE', 'LOLB', 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PULL_LEAD', 'D_ALLEY', 'NCB', 'WILL', 'OUTSIDE_IN', [
            { x: -4.5, y: -1.4 },
            { x: -8.6, y: -0.5 },
            { x: -10.4, y: 0.6 },
          ], undefined, R.LG_EBROWN.blockRating),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PASS_SET', 'JUMP_SET', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PASS_SET', 'JUMP_SET', '3T', null, 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ];

  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL',
    snapSide === 'LEFT' ? [{ x: -20.5, y: 9.6 }, { x: -22.0, y: 15.5 }] : [{ x: -16.5, y: 11.0 }, { x: -12.0, y: 18.0 }],
    snapSide === 'LEFT' ? 1 : 3);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL',
    snapSide === 'RIGHT' ? [{ x: 20.5, y: 9.6 }, { x: 22.0, y: 15.5 }] : [{ x: 16.5, y: 11.0 }, { x: 12.0, y: 18.0 }],
    snapSide === 'RIGHT' ? 1 : 3);

  const wingL =
    snapSide === 'LEFT'
      ? makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'MAN_BLOCK', 'D_ALLEY', 'NCB', 'WILL', 'INSIDE_OUT', [], undefined, R.TE2_TREMBLE.blockRating)
      : makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: 9.6 }, { x: 2.5, y: 14.0 }], 2, R.TE2_TREMBLE.blockRating);
  const wingR =
    snapSide === 'RIGHT'
      ? makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'MAN_BLOCK', 'D_ALLEY', 'DIME', 'SS', 'INSIDE_OUT', [], undefined, R.TE1_WARREN.blockRating)
      : makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 1.5, y: 9.6 }, { x: -2.5, y: 14.0 }], 2, R.TE1_WARREN.blockRating);

  const qb1 =
    snapSide === 'LEFT'
      ? makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: -4.4, y: -5.4 }, { x: -8.8, y: -4.9 }, { x: -10.4, y: -1.4 }, { x: -11.6, y: 4.8 }, { x: -12.6, y: 18.0 },
        ])
      : makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -7.5, y: -3.5 }, { x: -12.5, y: 1.5 }], 4);
  const qb2 =
    snapSide === 'RIGHT'
      ? makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 4.4, y: -5.4 }, { x: 8.8, y: -4.9 }, { x: 10.4, y: -1.4 }, { x: 11.6, y: 4.8 }, { x: 12.6, y: 18.0 },
        ])
      : makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 7.5, y: -3.5 }, { x: 12.5, y: 1.5 }], 4);

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
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// Play B: Symmetric Chiral 2-QB Inside Power-Trap (Anti-Wide-9 Interior Hammer!)
// Exact same pre-snap Split-Shotgun alignment! Punishes Wide-9 Double-Contain & Lightened Interior!
function buildChiralInsidePowerTrap(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const dir = snapSide === 'RIGHT' ? 1 : -1;

  // Wash Wide-9 DEs outward with Tackles; double-team interior 3T/NT up to MIKE Spy; pull backside Guard into A/B gap!
  const ol =
    snapSide === 'RIGHT'
      ? [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'MAN_BLOCK', 'C_LEFT', 'LDE', 'LOLB', 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PULL_TRAP', 'B_RIGHT', 'MIKE', '3T_R', 'OUTSIDE_IN', [
            { x: 0.2, y: -1.1 }, { x: 1.8, y: 0.8 }, { x: 2.2, y: 3.6 },
          ], undefined, R.LG_EBROWN.blockRating),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'COMBO_CLIMB', 'A_LEFT', '3T_L', 'WILL', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating, 0.45),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'COMBO_CLIMB', 'A_RIGHT', '3T_R', 'MIKE', 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating, 0.40),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'C_RIGHT', 'RDE', 'ROLB', 'OUTSIDE_IN', [], undefined, R.RT_TOM.blockRating),
        ]
      : [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'MAN_BLOCK', 'C_LEFT', 'LDE', 'LOLB', 'OUTSIDE_IN', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'COMBO_CLIMB', 'A_LEFT', '3T_L', 'MIKE', 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating, 0.40),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'COMBO_CLIMB', 'A_RIGHT', '3T_R', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating, 0.45),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PULL_TRAP', 'B_LEFT', 'MIKE', '3T_L', 'OUTSIDE_IN', [
            { x: -0.2, y: -1.1 }, { x: -1.8, y: 0.8 }, { x: -2.2, y: 3.6 },
          ], undefined, R.RG_BORTOLINI.blockRating),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'C_RIGHT', 'RDE', 'ROLB', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ];

  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');

  // Snap-side heavy wing inserts straight into the A/B-gap alley to blow up MIKE/SS; backside wing seals overhang!
  const wingL =
    snapSide === 'LEFT'
      ? makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'PULL_LEAD', 'B_LEFT', 'FS', 'MIKE', 'INSIDE_OUT', [
          { x: -2.6, y: -0.4 }, { x: -1.8, y: 2.2 }, { x: -1.6, y: 6.5 },
        ], undefined, R.TE2_TREMBLE.blockRating)
      : makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'MAN_BLOCK', 'D_ALLEY', 'NCB', 'WILL', 'OUTSIDE_IN', [], undefined, R.TE2_TREMBLE.blockRating);
  const wingR =
    snapSide === 'RIGHT'
      ? makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'PULL_LEAD', 'B_RIGHT', 'SS', 'MIKE', 'INSIDE_OUT', [
          { x: 2.6, y: -0.4 }, { x: 1.8, y: 2.2 }, { x: 1.6, y: 6.5 },
        ], undefined, R.TE1_WARREN.blockRating)
      : makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'MAN_BLOCK', 'D_ALLEY', 'DIME', 'SS', 'OUTSIDE_IN', [], undefined, R.TE1_WARREN.blockRating);

  // Active QB hits vacated interior A/B gap while non-snap QB flares wide opposite to freeze Wide-9/Force-Alley!
  const qb1 =
    snapSide === 'LEFT'
      ? makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'BALL_CARRIER', 'B_LEFT', null, null, 'NEUTRAL', [
          { x: -1.6, y: -2.2 }, { x: -1.5, y: 1.8 }, { x: -1.2, y: 8.5 }, { x: -1.0, y: 20.0 },
        ])
      : makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: -8.5, y: -4.2 }, { x: -14.5, y: -2.0 },
        ]);
  const qb2 =
    snapSide === 'RIGHT'
      ? makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'B_RIGHT', null, null, 'NEUTRAL', [
          { x: 1.6, y: -2.2 }, { x: 1.5, y: 1.8 }, { x: 1.2, y: 8.5 }, { x: 1.0, y: 20.0 },
        ])
      : makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 8.5, y: -4.2 }, { x: 14.5, y: -2.0 },
        ]);

  const activeQb = snapSide === 'RIGHT' ? qb2 : qb1;
  activeQb.isSnapRecipient = true;
  void dir;
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// Play C: Symmetric Chiral 2-QB Play-Action Seam-Flood (Anti-Spy / Anti-Cover-3 / Anti-Wide-9 Air Counter!)
function buildChiralPaSeamFlood(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const dir = snapSide === 'RIGHT' ? 1 : -1;
  const ol = buildPassOL();

  // Exact same 100% mirror-symmetric pre-snap Split-Shotgun alignment!
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL',
    snapSide === 'LEFT' ? [{ x: -16.5, y: 10.5 }, { x: -20.5, y: 15.5 }] : [{ x: -15.5, y: 12.0 }, { x: -11.5, y: 20.0 }],
    snapSide === 'LEFT' ? 3 : 4);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL',
    snapSide === 'RIGHT' ? [{ x: 16.5, y: 10.5 }, { x: 20.5, y: 15.5 }] : [{ x: 15.5, y: 12.0 }, { x: 11.5, y: 20.0 }],
    snapSide === 'RIGHT' ? 3 : 4);

  // Read #1: Snap-side Wing attacks the single-high Cover-3 / Spy seam hash (+5.2 -> +4.2, y=11.5..18)!
  // Read #2: Backside Wing crosses right into the intermediate dig/hook window behind the Spy (+10.0y)!
  const wingL =
    snapSide === 'LEFT'
      ? makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -5.2, y: 9.5 }, { x: -4.2, y: 15.5 }, { x: -3.5, y: 20.0 },
        ], 1, R.TE2_TREMBLE.blockRating)
      : makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -2.0, y: 7.5 }, { x: 4.5, y: 10.8 }, { x: 10.5, y: 12.0 },
        ], 2, R.TE2_TREMBLE.blockRating);
  const wingR =
    snapSide === 'RIGHT'
      ? makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 5.2, y: 9.5 }, { x: 4.2, y: 15.5 }, { x: 3.5, y: 20.0 },
        ], 1, R.TE1_WARREN.blockRating)
      : makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 2.0, y: 7.5 }, { x: -4.5, y: 10.8 }, { x: -10.5, y: 12.0 },
        ], 2, R.TE1_WARREN.blockRating);

  // Active QB executes crisp 0.78s PA fake to the non-snap QB flaring wide, freezing overhangs before ripping the seam!
  const qb1 =
    snapSide === 'LEFT'
      ? makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -2.4, y: -6.2 }])
      : makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -6.8, y: -3.2 }, { x: -13.5, y: 2.5 },
        ], 5);
  const qb2 =
    snapSide === 'RIGHT'
      ? makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 2.4, y: -6.2 }])
      : makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 6.8, y: -3.2 }, { x: 13.5, y: 2.5 },
        ], 5);

  const activeQb = snapSide === 'RIGHT' ? qb2 : qb1;
  activeQb.isSnapRecipient = true;
  activeQb.playAction = {
    enabled: true,
    meshDurationSec: 0.78,
    fakeCarrierId: snapSide === 'RIGHT' ? 'QB' : 'RB',
    fakeGap: snapSide === 'RIGHT' ? 'C_LEFT' : 'C_RIGHT',
    isBootleg: false,
    bootDirection: 'POCKET',
  };
  void dir;
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// Play D: Symmetric Chiral 2-QB Mesh-Void + Designed Scramble-as-Read-#3!
function buildChiralRead3MeshVoid(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const dir = snapSide === 'RIGHT' ? 1 : -1;
  const ol = buildPassOL();

  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -16.5, y: 10.5 }, { x: -11.5, y: 18.5 },
  ], snapSide === 'LEFT' ? 2 : 1);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 13.5, y: 9.8 }, { x: 5.5, y: 14.2 },
  ], snapSide === 'RIGHT' ? 2 : 1);

  // Twin shallow mesh crossers pulling LBs wide & creating Read #4 Spy-punish sit-down!
  const wingL = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 2.0, y: 4.8 }, { x: 10.5, y: 6.4 }, { x: 15.5, y: 8.2 },
  ], snapSide === 'LEFT' ? 4 : 3, R.TE2_TREMBLE.blockRating);
  const wingR = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -1.2, y: 5.6 }, { x: -8.5, y: 7.4 },
  ], snapSide === 'RIGHT' ? 4 : 3, R.TE1_WARREN.blockRating);

  const qb1 =
    snapSide === 'LEFT'
      ? makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.8, y: -5.8 }])
      : makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -9.5, y: -1.8 }, { x: -15.0, y: 4.5 }, { x: -16.5, y: 12.0 },
        ], 5);
  const qb2 =
    snapSide === 'RIGHT'
      ? makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 1.8, y: -5.8 }])
      : makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 9.5, y: -1.8 }, { x: 15.0, y: 4.5 }, { x: 16.5, y: 12.0 },
        ], 5);

  const activeQb = snapSide === 'RIGHT' ? qb2 : qb1;
  activeQb.isSnapRecipient = true;
  activeQb.designedScrambleRead = {
    enabled: true,
    afterReadOrder: 2,
    minDecisionTimeSec: 2.00,
    voidCorridorCenterX: dir * 0.4,
    voidCorridorHalfWidthX: 3.1,
    voidCorridorMaxY: 8.0,
    maxDefendersInVoid: 0,
    fallbackReceiverId: snapSide === 'RIGHT' ? 'TE' : 'SL',
    scrambleWaypoints: [
      { x: dir * 0.8, y: -1.0 },
      { x: dir * 1.5, y: 5.5 },
      { x: dir * 2.2, y: 16.0 },
      { x: dir * 2.8, y: 26.0 },
    ],
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// Play E: Symmetric Chiral 2-QB Reactor Sweep (100% Mirror-Symmetric Split-Shotgun Power Sweep!)
// Splits designed QB run hits 50/50 across QB1 (left) and QB2 (right) with ZERO pre-snap tell!
function buildChiralReactorSweep(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol =
    snapSide === 'RIGHT'
      ? [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'GAP_ZONE', 'B_LEFT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PULL_LEAD', 'D_ALLEY', 'DIME', 'SS', 'OUTSIDE_IN', [
            { x: 1.4, y: -1.4 }, { x: 6.0, y: -0.55 }, { x: 7.8, y: 3.4 },
          ], undefined, R.LG_EBROWN.blockRating),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
            { x: 2.3, y: -1.1 }, { x: 4.9, y: -0.3 }, { x: 6.4, y: 3.2 },
          ], undefined, R.C_BARTON.blockRating),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', 'RDE', 'ROLB', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ]
      : [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'MAN_BLOCK', 'B_LEFT', 'LDE', 'LOLB', 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'MAN_BLOCK', 'A_LEFT', '3T', null, 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PULL_LEAD', 'C_LEFT', 'MIKE', null, 'OUTSIDE_IN', [
            { x: -2.3, y: -1.1 }, { x: -4.9, y: -0.3 }, { x: -6.4, y: 3.2 },
          ], undefined, R.C_BARTON.blockRating),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PULL_LEAD', 'D_ALLEY', 'NCB', 'WILL', 'OUTSIDE_IN', [
            { x: -1.4, y: -1.4 }, { x: -6.0, y: -0.55 }, { x: -7.8, y: 3.4 },
          ], undefined, R.RG_BORTOLINI.blockRating),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'GAP_ZONE', 'B_RIGHT', 'RDE', null, 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ];

  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');

  const wingL =
    snapSide === 'LEFT'
      ? makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'PULL_LEAD', 'D_ALLEY', 'NCB', 'WILL', 'OUTSIDE_IN', [
          { x: -6.8, y: 0.6 }, { x: -8.0, y: 4.5 },
        ], undefined, R.TE2_TREMBLE.blockRating)
      : makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'MAN_BLOCK', 'C_LEFT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.TE2_TREMBLE.blockRating);
  const wingR =
    snapSide === 'RIGHT'
      ? makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'PULL_LEAD', 'D_ALLEY', 'DIME', 'SS', 'OUTSIDE_IN', [
          { x: 6.8, y: 0.6 }, { x: 8.0, y: 4.5 },
        ], undefined, R.TE1_WARREN.blockRating)
      : makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'MAN_BLOCK', 'C_RIGHT', 'RDE', null, 'INSIDE_OUT', [], undefined, R.TE1_WARREN.blockRating);

  const qb1 =
    snapSide === 'LEFT'
      ? makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
          { x: -4.2, y: -2.4 }, { x: -6.8, y: 0.9 }, { x: -7.8, y: 6.8 }, { x: -8.2, y: 20.0 },
        ])
      : makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: -7.8, y: -4.2 }, { x: -13.0, y: -2.5 },
        ]);
  const qb2 =
    snapSide === 'RIGHT'
      ? makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
          { x: 4.2, y: -2.4 }, { x: 6.8, y: 0.9 }, { x: 7.8, y: 6.8 }, { x: 8.2, y: 20.0 },
        ])
      : makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 7.8, y: -4.2 }, { x: 13.0, y: -2.5 },
        ]);

  const activeQb = snapSide === 'RIGHT' ? qb2 : qb1;
  activeQb.isSnapRecipient = true;
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// Single-QB Read-3 Mesh Middle Void (for Shanahan Mid-Mobile / Supermax Dual comparison)
function buildSingleQbRead3Mesh(qbRatings: SimAgent['ratings']): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = buildPassOL();
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -16.5, y: 10.5 }, { x: -11.5, y: 18.5 }], 1);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.8, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 13.5, y: 9.8 }, { x: 5.5, y: 14.2 }], 2);
  const sl = makeOffAgent('SL', 'SL', R.SL_SAMUEL.name, -6.8, -1.10, R.SL_SAMUEL.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 2.5, y: 4.8 }, { x: 11.5, y: 6.2 }, { x: 16.5, y: 8.0 }], 3);
  const te = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.4, -1.10, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -0.8, y: 5.8 }, { x: -8.5, y: 7.4 }], 4, R.TE1_WARREN.blockRating);
  const rb = makeOffAgent('RB', 'RB', 'Breece Hall', -2.4, -4.5, { speed: 91, accel: 92, power: 85, finesse: 86, awareness: 85 }, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -10.0, y: -1.8 }, { x: -15.5, y: 4.5 }, { x: -17.0, y: 12.5 }], 5, 72);
  const qb = makeOffAgent('QB', 'QB', 'QB1', 0.0, -4.5, qbRatings, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.0 }]);
  qb.designedScrambleRead = {
    enabled: true,
    afterReadOrder: 2,
    minDecisionTimeSec: 2.00,
    voidCorridorCenterX: 0.2,
    voidCorridorHalfWidthX: 3.1,
    voidCorridorMaxY: 8.0,
    maxDefendersInVoid: 0,
    fallbackReceiverId: 'TE',
    scrambleWaypoints: [{ x: 0.6, y: -1.0 }, { x: 1.4, y: 5.2 }, { x: 2.2, y: 15.5 }, { x: 2.8, y: 26.0 }],
  };
  return [...ol, wr1, wr2, sl, te, rb, qb];
}

// ============================================================================
// 4. EXACT ZERO-SUM NASH EQUILIBRIUM SOLVER (REGRET-MATCHING + DUALITY CHECK)
// ============================================================================
interface NashResult {
  value: number;
  dualityGap: number;
  offStrategy: Record<string, number>;
  defStrategy: Record<string, number>;
}

function solveZeroSumNash(
  offIds: string[],
  defIds: string[],
  payoff: number[][],
  iterations = 12000
): NashResult {
  const m = offIds.length;
  const n = defIds.length;
  const regOff = new Float64Array(m);
  const regDef = new Float64Array(n);
  const sumOff = new Float64Array(m);
  const sumDef = new Float64Array(n);

  for (let iter = 0; iter < iterations; iter++) {
    const p = new Float64Array(m);
    let pSum = 0;
    for (let i = 0; i < m; i++) {
      p[i] = Math.max(0, regOff[i]);
      pSum += p[i];
    }
    for (let i = 0; i < m; i++) p[i] = pSum > 1e-12 ? p[i] / pSum : 1 / m;

    const q = new Float64Array(n);
    let qSum = 0;
    for (let j = 0; j < n; j++) {
      q[j] = Math.max(0, regDef[j]);
      qSum += q[j];
    }
    for (let j = 0; j < n; j++) q[j] = qSum > 1e-12 ? q[j] / qSum : 1 / n;

    // Linear-weighted averaging (CFR+ style) accelerates convergence to < 0.0001 duality gap
    const w = iter + 1;
    for (let i = 0; i < m; i++) sumOff[i] += w * p[i];
    for (let j = 0; j < n; j++) sumDef[j] += w * q[j];

    // Expected payoffs against current strategies
    const offU = new Float64Array(m);
    const defU = new Float64Array(n);
    let gameVal = 0;
    for (let i = 0; i < m; i++) {
      let ui = 0;
      for (let j = 0; j < n; j++) ui += payoff[i][j] * q[j];
      offU[i] = ui;
      gameVal += p[i] * ui;
    }
    for (let j = 0; j < n; j++) {
      let uj = 0;
      for (let i = 0; i < m; i++) uj += payoff[i][j] * p[i];
      defU[j] = uj;
    }

    for (let i = 0; i < m; i++) regOff[i] = Math.max(0, regOff[i] + (offU[i] - gameVal));
    for (let j = 0; j < n; j++) regDef[j] = Math.max(0, regDef[j] + (gameVal - defU[j]));
  }

  let sOffTot = 0;
  let sDefTot = 0;
  for (let i = 0; i < m; i++) sOffTot += sumOff[i];
  for (let j = 0; j < n; j++) sDefTot += sumDef[j];

  const pAvg = Array.from(sumOff, (v) => v / sOffTot);
  const qAvg = Array.from(sumDef, (v) => v / sDefTot);

  // Primal-dual verification
  let maxOffBR = -Infinity;
  for (let i = 0; i < m; i++) {
    let val = 0;
    for (let j = 0; j < n; j++) val += payoff[i][j] * qAvg[j];
    if (val > maxOffBR) maxOffBR = val;
  }
  let minDefBR = Infinity;
  for (let j = 0; j < n; j++) {
    let val = 0;
    for (let i = 0; i < m; i++) val += payoff[i][j] * pAvg[i];
    if (val < minDefBR) minDefBR = val;
  }

  const offStrategy: Record<string, number> = {};
  const defStrategy: Record<string, number> = {};
  for (let i = 0; i < m; i++) offStrategy[offIds[i]] = +(pAvg[i] * 100).toFixed(1);
  for (let j = 0; j < n; j++) defStrategy[defIds[j]] = +(qAvg[j] * 100).toFixed(1);

  return {
    value: +(((maxOffBR + minDefBR) / 2)).toFixed(4),
    dualityGap: +(maxOffBR - minDefBR).toFixed(5),
    offStrategy,
    defStrategy,
  };
}

// ============================================================================
// 5. OUTCOME POOL RECORD (FED DIRECTLY INTO 4-DOWN FULL-SEASON MONTE CARLO!)
// ============================================================================
export interface CompactPlayOutcome {
  y: number;         // Net yards gained (rounded to 0.5y)
  e: number;         // Expected EPA
  r: string;         // Termination reason code: C, I, S, T, INT, FL, FR, TD, OOB
  p: 0 | 1;          // Was pass play (forward pass or sack)
  qr: 0 | 1;         // QB rush/scramble exposure (counts toward QB contact load!)
  q2: 0 | 1;         // Executed by QB2 (1 = QB2 took the snap/hits, 0 = QB1)
  sec: number;       // Play duration seconds (for clock management)
}

function compressOutcome(traj: PlayTickSnapshot[], qb2TookSnap: boolean): CompactPlayOutcome {
  const term = traj[traj.length - 1];
  const reason = term.terminationReason ?? 'TACKLED';
  const rCode =
    reason === 'INTERCEPTION'
      ? 'INT'
      : reason === 'SACK'
      ? 'S'
      : reason === 'INCOMPLETE'
      ? 'I'
      : reason === 'FUMBLE_LOST'
      ? 'FL'
      : reason === 'FUMBLE_RECOVERED'
      ? 'FR'
      : reason === 'TOUCHDOWN'
      ? 'TD'
      : reason === 'OUT_OF_BOUNDS'
      ? 'OOB'
      : reason === 'COMPLETE'
      ? 'C'
      : 'T';
  const isPass = Boolean(term.ball?.forwardPassThrown) || reason === 'SACK';
  const activeCarrier = term.agents.find(
    (a) => a.side === 'OFF' && (a.id === term.ball?.carrierId || a.assignment.role === 'BALL_CARRIER')
  );
  const scrambled = traj.some(
    (s) => s.exoticEvent === 'QB_SCRAMBLE' || s.exoticEvent === 'DESIGNED_SCRAMBLE_READ3'
  );
  const isQbRush = !isPass && (scrambled || activeCarrier?.pos === 'QB' || activeCarrier?.id === 'QB');
  const yds =
    reason === 'INCOMPLETE' || reason === 'INTERCEPTION'
      ? 0
      : +(Math.round((term.carrierTackledYards ?? 0) * 2) / 2).toFixed(1);

  return {
    y: yds,
    e: +(term.expectedEpa ?? 0).toFixed(3),
    r: rCode,
    p: isPass ? 1 : 0,
    qr: isQbRush ? 1 : 0,
    q2: qb2TookSnap ? 1 : 0,
    sec: +(term.timeSec ?? 3.5).toFixed(1),
  };
}

// ============================================================================
// 6. PLAYBOOK REGISTRY (5 COMPLETE OFFENSES FOR ADVERSARIAL NASH TOURNAMENT)
// ============================================================================
interface PlaySpec {
  id: string;
  bucket: 'OPEN' | 'PASS_3RD' | 'SHORT_RUN';
  build: (def: SimAgent[], rep: number) => { off: SimAgent[]; qb2TookSnap: boolean };
}

interface OffenseSpec {
  id: string;
  label: string;
  qbRoomCapM: number;
  isDualQbOnField: boolean;
  plays: PlaySpec[];
}

function makeBaselinePlaySpec(
  baseProfile: BaselineRosterProfile,
  qbRatings: SimAgent['ratings'],
  playId: CanonicalPlayId,
  bucket: PlaySpec['bucket']
): PlaySpec {
  const patched: BaselineRosterProfile = { ...baseProfile, qb: { ...qbRatings } };
  return {
    id: playId,
    bucket,
    build: () => ({ off: buildBaselinePlay(patched, playId), qb2TookSnap: false }),
  };
}

const CONV_BASE = BASELINE_PHILOSOPHIES.find((p) => p.id === 'CONV_11_SPREAD')!;
const SHAN_BASE = BASELINE_PHILOSOPHIES.find((p) => p.id === 'SHANAHAN_12_PA')!;

const OFFENSES: OffenseSpec[] = [
  {
    id: 'CONV_11_ELITE_POCKET',
    label: 'Conv-11 Spread / Elite Pocket ($60M QB Room)',
    qbRoomCapM: 60.0,
    isDualQbOnField: false,
    plays: [
      makeBaselinePlaySpec(CONV_BASE, ELITE_POCKET_QB, 'DAGGER', 'PASS_3RD'),
      makeBaselinePlaySpec(CONV_BASE, ELITE_POCKET_QB, 'MESH', 'PASS_3RD'),
      makeBaselinePlaySpec(CONV_BASE, ELITE_POCKET_QB, 'FOUR_VERTS', 'PASS_3RD'),
      makeBaselinePlaySpec(CONV_BASE, ELITE_POCKET_QB, 'PA_FLOOD', 'OPEN'),
      makeBaselinePlaySpec(CONV_BASE, ELITE_POCKET_QB, 'QUICK_SLANT', 'OPEN'),
      makeBaselinePlaySpec(CONV_BASE, ELITE_POCKET_QB, 'INSIDE_ZONE', 'SHORT_RUN'),
      makeBaselinePlaySpec(CONV_BASE, ELITE_POCKET_QB, 'OUTSIDE_ZONE', 'SHORT_RUN'),
      makeBaselinePlaySpec(CONV_BASE, ELITE_POCKET_QB, 'DUO', 'SHORT_RUN'),
    ],
  },
  {
    id: 'SHANAHAN_12_ELITE_POCKET',
    label: 'Shanahan-12 PA / Elite Pocket ($60M QB Room)',
    qbRoomCapM: 60.0,
    isDualQbOnField: false,
    plays: [
      makeBaselinePlaySpec(SHAN_BASE, ELITE_POCKET_QB, 'PA_UC_BOOT', 'OPEN'),
      makeBaselinePlaySpec(SHAN_BASE, ELITE_POCKET_QB, 'PA_FLOOD', 'OPEN'),
      makeBaselinePlaySpec(SHAN_BASE, ELITE_POCKET_QB, 'DAGGER', 'PASS_3RD'),
      makeBaselinePlaySpec(SHAN_BASE, ELITE_POCKET_QB, 'MESH', 'PASS_3RD'),
      makeBaselinePlaySpec(SHAN_BASE, ELITE_POCKET_QB, 'QUICK_SLANT', 'OPEN'),
      makeBaselinePlaySpec(SHAN_BASE, ELITE_POCKET_QB, 'OUTSIDE_ZONE', 'SHORT_RUN'),
      makeBaselinePlaySpec(SHAN_BASE, ELITE_POCKET_QB, 'DUO', 'SHORT_RUN'),
      makeBaselinePlaySpec(SHAN_BASE, ELITE_POCKET_QB, 'PIN_PULL', 'SHORT_RUN'),
    ],
  },
  {
    id: 'SHANAHAN_12_SUPERMAX_DUAL',
    label: 'Shanahan-12 PA + Read3 / Supermax Dual ($60M QB Room)',
    qbRoomCapM: 60.0,
    isDualQbOnField: false,
    plays: [
      makeBaselinePlaySpec(SHAN_BASE, SUPERMAX_DUAL_QB, 'PA_UC_BOOT', 'OPEN'),
      makeBaselinePlaySpec(SHAN_BASE, SUPERMAX_DUAL_QB, 'PA_FLOOD', 'OPEN'),
      makeBaselinePlaySpec(SHAN_BASE, SUPERMAX_DUAL_QB, 'DAGGER', 'PASS_3RD'),
      { id: 'READ3_MESH_VOID', bucket: 'PASS_3RD', build: () => ({ off: buildSingleQbRead3Mesh(SUPERMAX_DUAL_QB), qb2TookSnap: false }) },
      makeBaselinePlaySpec(SHAN_BASE, SUPERMAX_DUAL_QB, 'OUTSIDE_ZONE', 'SHORT_RUN'),
      makeBaselinePlaySpec(SHAN_BASE, SUPERMAX_DUAL_QB, 'DUO', 'SHORT_RUN'),
      makeBaselinePlaySpec(SHAN_BASE, SUPERMAX_DUAL_QB, 'PIN_PULL', 'SHORT_RUN'),
    ],
  },
  {
    id: 'SHANAHAN_12_MID_MOBILE_READ3',
    label: 'Shanahan-12 PA + Read3 / Mid-Mobile ($23M Single or $20M Bench)',
    qbRoomCapM: 23.0,
    isDualQbOnField: false,
    plays: [
      makeBaselinePlaySpec(SHAN_BASE, MID_MOBILE_QB, 'PA_UC_BOOT', 'OPEN'),
      makeBaselinePlaySpec(SHAN_BASE, MID_MOBILE_QB, 'PA_FLOOD', 'OPEN'),
      makeBaselinePlaySpec(SHAN_BASE, MID_MOBILE_QB, 'DAGGER', 'PASS_3RD'),
      { id: 'READ3_MESH_VOID', bucket: 'PASS_3RD', build: () => ({ off: buildSingleQbRead3Mesh(MID_MOBILE_QB), qb2TookSnap: false }) },
      makeBaselinePlaySpec(SHAN_BASE, MID_MOBILE_QB, 'OUTSIDE_ZONE', 'SHORT_RUN'),
      makeBaselinePlaySpec(SHAN_BASE, MID_MOBILE_QB, 'DUO', 'SHORT_RUN'),
      makeBaselinePlaySpec(SHAN_BASE, MID_MOBILE_QB, 'PIN_PULL', 'SHORT_RUN'),
    ],
  },
  {
    id: 'ARGON_V2_CHIRAL_2QB',
    label: 'Argon v2 Chiral 2-QB Split-Gun ($20M On-Field Room)',
    qbRoomCapM: 20.0,
    isDualQbOnField: true,
    plays: [
      {
        id: 'CHIRAL_DIRECT_SNAP_LASER',
        bucket: 'OPEN',
        build: (def, rep) => {
          const { side } = selectDirectionalSnapSide(def, rep);
          return { off: buildChiralDirectSnapLaser(side), qb2TookSnap: side === 'RIGHT' };
        },
      },
      {
        id: 'CHIRAL_INSIDE_POWER_TRAP',
        bucket: 'SHORT_RUN',
        build: (def, rep) => {
          const { side } = selectDirectionalSnapSide(def, rep);
          return { off: buildChiralInsidePowerTrap(side), qb2TookSnap: side === 'RIGHT' };
        },
      },
      {
        id: 'CHIRAL_PA_SEAM_FLOOD',
        bucket: 'PASS_3RD',
        build: (def, rep) => {
          const { side } = selectDirectionalSnapSide(def, rep);
          return { off: buildChiralPaSeamFlood(side), qb2TookSnap: side === 'RIGHT' };
        },
      },
      {
        id: 'CHIRAL_READ3_MESH_VOID',
        bucket: 'PASS_3RD',
        build: (def, rep) => {
          const { side } = selectDirectionalSnapSide(def, rep);
          return { off: buildChiralRead3MeshVoid(side), qb2TookSnap: side === 'RIGHT' };
        },
      },
      {
        id: 'CHIRAL_REACTOR_SWEEP',
        bucket: 'SHORT_RUN',
        build: (def, rep) => {
          const { side } = selectDirectionalSnapSide(def, rep);
          return { off: buildChiralReactorSweep(side), qb2TookSnap: side === 'RIGHT' };
        },
      },
      {
        id: 'ARGON_4MIN_LEFT_MONOLITH',
        bucket: 'SHORT_RUN',
        build: () => ({
          off: ARGON_2027_PLAYBOOK.find((p) => p.id === 'ARGON_4MIN_LEFT_MONOLITH')!.buildOffense(),
          qb2TookSnap: false,
        }),
      },
      {
        id: 'ARGON_NOBLE_KINETIC_RELAY',
        bucket: 'PASS_3RD',
        build: () => ({
          off: ARGON_2027_PLAYBOOK.find((p) => p.id === 'ARGON_NOBLE_KINETIC_RELAY')!.buildOffense(),
          qb2TookSnap: false,
        }),
      },
    ],
  },
];

// ============================================================================
// 7. LEGALITY & BIOMECHANICS AUDIT ON ALL NEW ARGON V2 PLAYS
// ============================================================================
function auditArgonV2Plays(engine: All22KinematicEngine): void {
  const argonV2 = OFFENSES.find((o) => o.id === 'ARGON_V2_CHIRAL_2QB')!;
  console.log('--- 0. ARGON V2 LEGALITY & BIOMECHANICS AUDIT ACROSS ALL 13 DEFENSES ---');
  for (const play of argonV2.plays) {
    let onLos = 0;
    let uncov = true;
    let maxOlY = -99;
    let maxG = 0;
    let minSep = 99;
    for (let f = 0; f < ALL_13_FRONTS.length; f++) {
      const def = buildAnyDefense(ALL_13_FRONTS[f]);
      const { off } = play.build(def, f);
      if (f === 0) {
        const los = off.filter((a) => a.startY >= -0.75);
        onLos = los.length;
        const sorted = los.slice().sort((a, b) => a.startX - b.startX);
        const elig = new Set(['WR', 'TE', 'SL', 'RB', 'QB']);
        uncov = onLos === 7 && elig.has(sorted[0].pos) && elig.has(sorted[sorted.length - 1].pos);
      }
      const traj = engine.simulatePlay([...off, ...def], 0.65);
      for (let t = 1; t < traj.length; t++) {
        const prev = traj[t - 1];
        const curr = traj[t];
        if (curr.ball?.forwardPassThrown && !prev.ball?.forwardPassThrown) {
          for (const a of curr.agents) {
            if (a.side === 'OFF' && ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.pos)) {
              if (a.y > maxOlY) maxOlY = a.y;
            }
          }
        }
        for (const ac of curr.agents) {
          const ap = prev.agents.find((p) => p.id === ac.id);
          if (ap && !ac.engagedWithId && !ap.engagedWithId) {
            const g = Math.hypot(ac.vx - ap.vx, ac.vy - ap.vy) / 0.05 / 10.72;
            if (g > maxG) maxG = g;
          }
        }
        for (let i = 0; i < curr.agents.length; i++) {
          for (let j = i + 1; j < curr.agents.length; j++) {
            const d = Math.hypot(curr.agents[i].x - curr.agents[j].x, curr.agents[i].y - curr.agents[j].y);
            if (d < minSep) minSep = d;
          }
        }
      }
    }
    const ok = onLos === 7 && uncov && (maxOlY <= 1.05 || maxOlY === -99) && maxG <= 1.60 && minSep >= 0.20;
    console.log(
      `  ${play.id.padEnd(28)} | LOS=${onLos} | Uncov=${uncov} | MaxOL_Y=${(maxOlY === -99 ? 0 : maxOlY).toFixed(2)}y | MaxG=${maxG.toFixed(2)}G | MinSep=${minSep.toFixed(2)}y | ${ok ? 'PASS' : 'FAIL'}`
    );
    if (!ok) throw new Error(`Audit failed for ${play.id}`);
  }
  console.log('');
}

// ============================================================================
// 8. MAIN ADVERSARIAL TOURNAMENT EXECUTION
// ============================================================================
async function main() {
  const engine = new All22KinematicEngine();
  const REPS = 26; // 26 reps * 13 fronts = 338 snaps per play (~12,500 full 11v11 physics snaps total!)

  console.log('==================================================================================');
  console.log('ADVERSARIAL COUNTER-EVOLUTION & 13-DEFENSE NASH EQUILIBRIUM TOURNAMENT (2-QB LAB)');
  console.log('==================================================================================\n');

  auditArgonV2Plays(engine);

  const tournamentSummary: Record<string, any> = {};
  const outcomePools: Record<
    string,
    {
      label: string;
      qbRoomCapM: number;
      isDualQbOnField: boolean;
      nash13OffMix: Record<string, number>;
      nash13DefMix: Record<string, number>;
      playBuckets: Record<string, PlaySpec['bucket']>;
      poolsByPlayAndDef: Record<string, Record<string, CompactPlayOutcome[]>>;
    }
  > = {};

  for (const offSpec of OFFENSES) {
    const offIds = offSpec.plays.map((p) => p.id);
    const payoff13: number[][] = [];
    const payoff9: number[][] = [];
    const playStats: Record<string, any> = {};
    const poolsByPlayAndDef: Record<string, Record<string, CompactPlayOutcome[]>> = {};
    const playBuckets: Record<string, PlaySpec['bucket']> = {};

    for (let i = 0; i < offSpec.plays.length; i++) {
      const play = offSpec.plays[i];
      playBuckets[play.id] = play.bucket;
      poolsByPlayAndDef[play.id] = {};
      const row13: number[] = [];
      const row9: number[] = [];
      const perFrontEpa: Record<string, number> = {};

      for (let j = 0; j < ALL_13_FRONTS.length; j++) {
        const frontId = ALL_13_FRONTS[j];
        const cellOutcomes: CompactPlayOutcome[] = [];
        let epaSum = 0;
        for (let r = 0; r < REPS; r++) {
          const def = buildAnyDefense(frontId);
          const { off, qb2TookSnap } = play.build(def, r);
          const traj = engine.simulatePlay([...off, ...def], 0.65);
          const compact = compressOutcome(traj, qb2TookSnap);
          cellOutcomes.push(compact);
          epaSum += compact.e;
        }
        const meanEpa = +(epaSum / REPS).toFixed(4);
        row13.push(meanEpa);
        if (j < LEGACY_9_FRONTS.length) row9.push(meanEpa);
        perFrontEpa[frontId] = meanEpa;
        poolsByPlayAndDef[play.id][frontId] = cellOutcomes;
      }

      payoff13.push(row13);
      payoff9.push(row9);
      const mean13 = +(row13.reduce((a, b) => a + b, 0) / row13.length).toFixed(4);
      const mean9 = +(row9.reduce((a, b) => a + b, 0) / row9.length).toFixed(4);
      playStats[play.id] = {
        mean13,
        mean9,
        vsWide9C4: perFrontEpa['NICKEL_SYMMETRIC_WIDE9_C4'],
        vsDoubleEdgeSpyC3: perFrontEpa['BASE_34_DOUBLE_EDGE_SPY_C3'],
        vsSpyC1: perFrontEpa['NICKEL_QB_SPY_CONTAIN_C1'],
        vsCalvinBracket: perFrontEpa['NICKEL_CALVIN_BRACKET_WR1'],
        perFrontEpa,
      };
    }

    const nash9 = solveZeroSumNash(offIds, LEGACY_9_FRONTS, payoff9);
    const nash13 = solveZeroSumNash(offIds, ALL_13_FRONTS, payoff13);

    tournamentSummary[offSpec.id] = {
      label: offSpec.label,
      qbRoomCapM: offSpec.qbRoomCapM,
      isDualQbOnField: offSpec.isDualQbOnField,
      nash9Value: nash9.value,
      nash13Value: nash13.value,
      adaptiveCounterPenalty: +(nash13.value - nash9.value).toFixed(4),
      dualityGap13: nash13.dualityGap,
      nash13OffStrategy: nash13.offStrategy,
      nash13DefStrategy: nash13.defStrategy,
      playStats,
    };

    outcomePools[offSpec.id] = {
      label: offSpec.label,
      qbRoomCapM: offSpec.qbRoomCapM,
      isDualQbOnField: offSpec.isDualQbOnField,
      nash13OffMix: nash13.offStrategy,
      nash13DefMix: nash13.defStrategy,
      playBuckets,
      poolsByPlayAndDef,
    };

    const topOff = Object.entries(nash13.offStrategy)
      .filter(([, pct]) => pct >= 5.0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}%`)
      .join(', ');
    const topDef = Object.entries(nash13.defStrategy)
      .filter(([, pct]) => pct >= 5.0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}%`)
      .join(', ');

    console.log(`[${offSpec.id}] ${offSpec.label}`);
    console.log(
      `  Nash9=${nash9.value >= 0 ? '+' : ''}${nash9.value.toFixed(4)} -> Nash13=${nash13.value >= 0 ? '+' : ''}${nash13.value.toFixed(4)} (Adaptive Δ=${nash13.value - nash9.value >= 0 ? '+' : ''}${(nash13.value - nash9.value).toFixed(4)}, gap=${nash13.dualityGap})`
    );
    console.log(`  Off Nash13 Mix: ${topOff}`);
    console.log(`  Def Nash13 Mix: ${topDef}\n`);
  }

  // Detailed Rock-Paper-Scissors Spotlight for ARGON_V2_CHIRAL_2QB vs the 4 Adaptive Counter Defenses
  console.log('--- ARGON V2 ROCK-PAPER-SCISSORS MATRIX vs ALL 4 ADAPTIVE COUNTER DEFENSES ---');
  const a2 = tournamentSummary['ARGON_V2_CHIRAL_2QB'].playStats;
  for (const [playId, st] of Object.entries<any>(a2)) {
    console.log(
      `  ${playId.padEnd(28)} | Mean13=${st.mean13 >= 0 ? '+' : ''}${st.mean13.toFixed(3)} | vsWide9C4=${st.vsWide9C4 >= 0 ? '+' : ''}${st.vsWide9C4.toFixed(3)} | vs34DblEdgeSpy=${st.vsDoubleEdgeSpyC3 >= 0 ? '+' : ''}${st.vsDoubleEdgeSpyC3.toFixed(3)} | vsSpyC1=${st.vsSpyC1 >= 0 ? '+' : ''}${st.vsSpyC1.toFixed(3)} | vsBracket=${st.vsCalvinBracket >= 0 ? '+' : ''}${st.vsCalvinBracket.toFixed(3)}`
    );
  }

  const reportPath = path.join(process.cwd(), 'src', 'data', 'nash_2qb_tournament_report.json');
  const poolPath = path.join(process.cwd(), 'src', 'data', 'nash_2qb_outcome_pools.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        repsPerCell: REPS,
        legacy9Fronts: LEGACY_9_FRONTS,
        all13Fronts: ALL_13_FRONTS,
        tournamentSummary,
      },
      null,
      2
    ),
    'utf8'
  );
  fs.writeFileSync(poolPath, JSON.stringify(outcomePools), 'utf8');
  console.log(`\n[SAVED] ${reportPath}`);
  console.log(`[SAVED] ${poolPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
