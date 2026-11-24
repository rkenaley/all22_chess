import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  All22KinematicEngine,
  BlockRoleType,
  DefensiveMemoryContext,
  FakeActionFamily,
  GapOrSetCode,
  LeverageBias,
  PlayTickSnapshot,
  SimAgent,
  SimFieldContext,
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
import { LEAGUE_OPEN_DEF_WEIGHTS } from './canonical_baselines.js';
import { selectDirectionalSnapSide } from './analyze_read3_scramble_and_dual_qb.js';

// ============================================================================
// 1. DEFENSIVE UNIVERSES (9 LEGACY + 4 ADAPTIVE COUNTERS = 13 FRONTS)
// ============================================================================
const LEGACY_9_FRONTS: ModernDefFrontId[] = [
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

type AnyDefFrontId = ModernDefFrontId | AdaptiveCounterDefFrontId;
const ALL_13_FRONTS: AnyDefFrontId[] = [
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
// 2. AGENT BUILDER HELPERS & SPLIT-SHOTGUN QBs
// ============================================================================
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
// 3. COMPLETE 9-PLAY MARRIED FAKE / REAL 2-QB PLAYBOOK
//    (All 7 Split-Shotgun chiral plays share 100% IDENTICAL pre-snap coordinates!)
// ============================================================================

// [1] Real Perimeter Option Rollout (PERIMETER_PITCH_TOSS, Real)
function buildChiralDirectSnapLaser(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol =
    snapSide === 'RIGHT'
      ? [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PASS_SET', 'JUMP_SET', 'NT', null, 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PASS_SET', 'JUMP_SET', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PULL_LEAD', 'D_ALLEY', 'DIME', 'SS', 'OUTSIDE_IN', [
            { x: 4.5, y: -1.4 }, { x: 8.6, y: -0.5 }, { x: 10.4, y: 0.6 },
          ], undefined, R.RG_BORTOLINI.blockRating),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', 'RDE', 'ROLB', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ]
      : [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'MAN_BLOCK', 'B_LEFT', 'LDE', 'LOLB', 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PULL_LEAD', 'D_ALLEY', 'NCB', 'WILL', 'OUTSIDE_IN', [
            { x: -4.5, y: -1.4 }, { x: -8.6, y: -0.5 }, { x: -10.4, y: 0.6 },
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
  activeQb.actionFamily = 'PERIMETER_PITCH_TOSS';
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

// [2] Real Chiral Perimeter Sweep (PERIMETER_PITCH_TOSS, Real)
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
  activeQb.actionFamily = 'PERIMETER_PITCH_TOSS';
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// [3] Real Split-Shotgun Off-Tackle C-Gap Exchange Power + Glance RPO (SPLIT_GUN_EXCHANGE, Real)
// Exact Split-Shotgun pre-snap look: snaps to one QB hitting C-gap Power behind RT down-block, playside wing seal & backside guard pull,
// paired with backside Glance RPO while twin QB flares backside as decoy — primes SPLIT_GUN_EXCHANGE within identical formation!
function buildChiralSplitGunInsideExchange(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const dir = snapSide === 'RIGHT' ? 1 : -1;

  const ol =
    snapSide === 'RIGHT'
      ? [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'GAP_ZONE', 'B_LEFT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PULL_LEAD', 'C_RIGHT', 'MIKE', 'DIME', 'OUTSIDE_IN', [
            { x: 1.0, y: -1.1 }, { x: 3.6, y: -0.3 }, { x: 4.5, y: 2.8 },
          ], undefined, R.LG_EBROWN.blockRating),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'COMBO_CLIMB', 'A_RIGHT', 'NT', 'MIKE', 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', '3T', '4i_R', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ]
      : [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'MAN_BLOCK', 'B_LEFT', '3T', '4i_L', 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'MIKE', 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'COMBO_CLIMB', 'A_RIGHT', 'NT', 'WILL', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PULL_LEAD', 'C_LEFT', 'MIKE', 'NCB', 'OUTSIDE_IN', [
            { x: -1.0, y: -1.1 }, { x: -3.6, y: -0.3 }, { x: -4.5, y: 2.8 },
          ], undefined, R.RG_BORTOLINI.blockRating),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'GAP_ZONE', 'B_RIGHT', 'RDE', null, 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ];

  const wr1 =
    snapSide === 'RIGHT'
      ? makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -16.0, y: 8.5 }, { x: -18.5, y: 15.0 },
        ], 2)
      : makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
  const wr2 =
    snapSide === 'LEFT'
      ? makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 16.0, y: 8.5 }, { x: 18.5, y: 15.0 },
        ], 2)
      : makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');

  const wingL =
    snapSide === 'LEFT'
      ? makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'MAN_BLOCK', 'C_LEFT', 'LDE', 'LOLB', 'OUTSIDE_IN', [], undefined, R.TE2_TREMBLE.blockRating)
      : makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -4.2, y: 5.5 }, { x: -1.5, y: 9.5 },
        ], 1, R.TE2_TREMBLE.blockRating);
  const wingR =
    snapSide === 'RIGHT'
      ? makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'MAN_BLOCK', 'C_RIGHT', 'RDE', 'ROLB', 'OUTSIDE_IN', [], undefined, R.TE1_WARREN.blockRating)
      : makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 4.2, y: 5.5 }, { x: 1.5, y: 9.5 },
        ], 1, R.TE1_WARREN.blockRating);

  const qb1 =
    snapSide === 'LEFT'
      ? makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'BALL_CARRIER', 'C_LEFT', null, null, 'NEUTRAL', [
          { x: dir * 3.4, y: -2.0 }, { x: dir * 4.5, y: 1.2 }, { x: dir * 5.2, y: 7.5 }, { x: dir * 5.6, y: 18.0 },
        ])
      : makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: -5.8, y: -4.2 }, { x: -10.5, y: -2.0 },
        ], 4);
  const qb2 =
    snapSide === 'RIGHT'
      ? makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'C_RIGHT', null, null, 'NEUTRAL', [
          { x: dir * 3.4, y: -2.0 }, { x: dir * 4.5, y: 1.2 }, { x: dir * 5.2, y: 7.5 }, { x: dir * 5.6, y: 18.0 },
        ])
      : makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 5.8, y: -4.2 }, { x: 10.5, y: -2.0 },
        ], 4);

  const activeQb = snapSide === 'RIGHT' ? qb2 : qb1;
  activeQb.isSnapRecipient = true;
  activeQb.actionFamily = 'SPLIT_GUN_EXCHANGE';
  activeQb.optionPass = {
    enabled: true,
    throwerRating: activeQb.ratings.finesse,
    decisionWindowStartSec: 1.05,
    decisionWindowEndSec: 1.48,
    primaryReceiverId: snapSide === 'RIGHT' ? 'SL' : 'TE',
    secondaryReceiverId: snapSide === 'RIGHT' ? 'WR1' : 'WR2',
    separationThresholdYds: 3.55,
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// [4] MARRIED FAKE #1: CHIRAL_FAKE_PITCH_COUNTER_KEEP (PERIMETER_PITCH_TOSS, Fake)
// Exact Split-Shotgun pre-snap look: snaps to one QB, flashes a pitch fake opposite to decoy QB,
// then keeps COUNTER behind pulling Guard + Wing sealing weakside alley!
function buildChiralFakePitchCounterKeep(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const dir = snapSide === 'RIGHT' ? 1 : -1; // dir=+1 means QB2 keeps RIGHT, fakes LEFT to QB1

  const ol =
    snapSide === 'RIGHT'
      ? [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'GAP_ZONE', 'B_LEFT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PULL_LEAD', 'C_RIGHT', 'DIME', 'SS', 'OUTSIDE_IN', [
            { x: 1.6, y: -1.4 }, { x: 5.8, y: -0.5 }, { x: 7.5, y: 3.8 },
          ], undefined, R.LG_EBROWN.blockRating),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', 'RDE', 'ROLB', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ]
      : [
          makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'MAN_BLOCK', 'B_LEFT', 'LDE', 'LOLB', 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
          makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'MAN_BLOCK', 'A_LEFT', '3T', null, 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating),
          makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'COMBO_CLIMB', 'A_RIGHT', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
          makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PULL_LEAD', 'C_LEFT', 'NCB', 'WILL', 'OUTSIDE_IN', [
            { x: -1.6, y: -1.4 }, { x: -5.8, y: -0.5 }, { x: -7.5, y: 3.8 },
          ], undefined, R.RG_BORTOLINI.blockRating),
          makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'GAP_ZONE', 'B_RIGHT', 'RDE', null, 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
        ];

  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');

  const wingL =
    snapSide === 'LEFT'
      ? makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'PULL_LEAD', 'D_ALLEY', 'NCB', 'WILL', 'OUTSIDE_IN', [
          { x: -7.0, y: 0.6 }, { x: -8.6, y: 4.5 },
        ], undefined, R.TE2_TREMBLE.blockRating)
      : makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'MAN_BLOCK', 'C_LEFT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.TE2_TREMBLE.blockRating);
  const wingR =
    snapSide === 'RIGHT'
      ? makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'PULL_LEAD', 'D_ALLEY', 'DIME', 'SS', 'OUTSIDE_IN', [
          { x: 7.0, y: 0.6 }, { x: 8.6, y: 4.5 },
        ], undefined, R.TE1_WARREN.blockRating)
      : makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'MAN_BLOCK', 'C_RIGHT', 'RDE', null, 'INSIDE_OUT', [], undefined, R.TE1_WARREN.blockRating);

  const qb1 =
    snapSide === 'LEFT'
      ? makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: -1.4, y: -4.8 }, { x: -4.5, y: -2.4 }, { x: -7.2, y: 1.0 }, { x: -8.4, y: 8.5 }, { x: -9.0, y: 20.0 },
        ])
      : makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: -8.8, y: -4.6 }, { x: -12.4, y: -1.2 }, { x: -14.0, y: 5.0 },
        ]);
  const qb2 =
    snapSide === 'RIGHT'
      ? makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 1.4, y: -4.8 }, { x: 4.5, y: -2.4 }, { x: 7.2, y: 1.0 }, { x: 8.4, y: 8.5 }, { x: 9.0, y: 20.0 },
        ])
      : makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 8.8, y: -4.6 }, { x: 12.4, y: -1.2 }, { x: 14.0, y: 5.0 },
        ]);

  const activeQb = snapSide === 'RIGHT' ? qb2 : qb1;
  activeQb.isSnapRecipient = true;
  activeQb.actionFamily = 'PERIMETER_PITCH_TOSS';
  activeQb.fakeAction = {
    enabled: true,
    family: 'PERIMETER_PITCH_TOSS',
    fakeTargetId: snapSide === 'RIGHT' ? 'QB' : 'RB',
    fakeStartSec: 0.12,
    fakeDurationSec: 0.48,
    fakeDirectionX: -dir * 9.0,
    fakeDirectionY: -3.2,
    affectsSpy: true,
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// [5] MARRIED FAKE #2: CHIRAL_FAKE_EXCHANGE_BOOT_FLOOD (SPLIT_GUN_EXCHANGE, Fake)
// 100% Legal Pass (all 5 OL PASS_SET <= 0.0y). Active QB fakes exchange to twin QB, boot-side Wing chips EMOL (Wide-9 protection)
// before releasing to flat, hitting 3-level sideline flood + Read-3 boot alley scramble!
function buildChiralFakeExchangeBootFlood(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const dir = snapSide === 'RIGHT' ? 1 : -1;
  const ol = buildPassOL();

  // Read #2 Out/Corner on boot side (depth <= 12.5y for primed window alignment), Read #3 Clearout opposite
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL',
    snapSide === 'LEFT' ? [{ x: -16.0, y: 8.8 }, { x: -19.5, y: 12.4 }] : [{ x: -11.0, y: 12.0 }, { x: -4.0, y: 20.0 }],
    snapSide === 'LEFT' ? 2 : 3);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL',
    snapSide === 'RIGHT' ? [{ x: 16.0, y: 8.8 }, { x: 19.5, y: 12.4 }] : [{ x: 11.0, y: 12.0 }, { x: 4.0, y: 20.0 }],
    snapSide === 'RIGHT' ? 2 : 3);

  // Backside Wing runs Read #1 intermediate Over toward boot side; boot-side Wing CHIP_RELEASEs EMOL then releases to flat (Read #4)!
  const wingL =
    snapSide === 'LEFT'
      ? makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'CHIP_RELEASE', 'VERTICAL_DEEP', 'LDE', 'LOLB', 'OUTSIDE_IN', [
          { x: -9.5, y: 3.5 }, { x: -15.5, y: 6.2 },
        ], 4, R.TE2_TREMBLE.blockRating, 0.42)
      : makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -1.0, y: 7.6 }, { x: 6.8, y: 11.2 }, { x: 13.5, y: 12.2 },
        ], 1, R.TE2_TREMBLE.blockRating);
  const wingR =
    snapSide === 'RIGHT'
      ? makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'CHIP_RELEASE', 'VERTICAL_DEEP', 'RDE', 'ROLB', 'OUTSIDE_IN', [
          { x: 9.5, y: 3.5 }, { x: 15.5, y: 6.2 },
        ], 4, R.TE1_WARREN.blockRating, 0.42)
      : makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 1.0, y: 7.6 }, { x: -6.8, y: 11.2 }, { x: -13.5, y: 12.2 },
        ], 1, R.TE1_WARREN.blockRating);

  const qb1 =
    snapSide === 'LEFT'
      ? makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -6.2, y: -5.6 },
        ])
      : makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'B_LEFT', null, null, 'NEUTRAL', [
          { x: -3.2, y: -2.2 }, { x: -5.5, y: 1.5 }, { x: -8.0, y: 5.5 },
        ], 5);
  const qb2 =
    snapSide === 'RIGHT'
      ? makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 6.2, y: -5.6 },
        ])
      : makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'ROUTE', 'B_RIGHT', null, null, 'NEUTRAL', [
          { x: 3.2, y: -2.2 }, { x: 5.5, y: 1.5 }, { x: 8.0, y: 5.5 },
        ], 5);

  const activeQb = snapSide === 'RIGHT' ? qb2 : qb1;
  activeQb.isSnapRecipient = true;
  activeQb.actionFamily = 'SPLIT_GUN_EXCHANGE';
  activeQb.playAction = {
    enabled: true,
    meshDurationSec: 0.78,
    fakeCarrierId: snapSide === 'RIGHT' ? 'QB' : 'RB',
    fakeGap: snapSide === 'RIGHT' ? 'B_LEFT' : 'B_RIGHT',
    isBootleg: true,
    bootDirection: snapSide,
  };
  activeQb.fakeAction = {
    enabled: true,
    family: 'SPLIT_GUN_EXCHANGE',
    fakeTargetId: snapSide === 'RIGHT' ? 'QB' : 'RB',
    fakeStartSec: 0.12,
    fakeDurationSec: 0.92,
    fakeDirectionX: -dir * 6.5,
    fakeDirectionY: -1.8,
    affectsSpy: true,
  };
  activeQb.designedScrambleRead = {
    enabled: true,
    afterReadOrder: 2,
    minDecisionTimeSec: 1.95,
    voidCorridorCenterX: dir * 8.5,
    voidCorridorHalfWidthX: 3.3,
    voidCorridorMaxY: 9.0,
    maxDefendersInVoid: 0,
    fallbackReceiverId: snapSide === 'RIGHT' ? 'TE' : 'SL',
    scrambleWaypoints: [
      { x: dir * 7.8, y: -2.0 },
      { x: dir * 9.5, y: 4.5 },
      { x: dir * 11.0, y: 14.5 },
      { x: dir * 12.0, y: 24.0 },
    ],
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// [6] MARRIED FAKE #3: CHIRAL_FAKE_SWEEP_READ3_SEAM (PERIMETER_PITCH_TOSS, Fake)
// 100% Legal Pass (all 5 OL PASS_SET <= 0.0y). Fakes wide sweep to twin QB, pulling overhangs & Spy toward decoy,
// then attacks VACATED snap-side Seam (Read #1) / Counter Over (Read #2) / emptied Read-3 scramble lane!
function buildChiralFakeSweepRead3Seam(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const dir = snapSide === 'RIGHT' ? 1 : -1;
  const ol = buildPassOL();

  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -17.5, y: 11.5 }, { x: -20.5, y: 20.5 },
  ], snapSide === 'LEFT' ? 3 : 4);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 17.5, y: 11.5 }, { x: 20.5, y: 20.5 },
  ], snapSide === 'RIGHT' ? 3 : 4);

  // Snap-side Wing attacks vacated Seam (Read #1, depth 12.2y); decoy-side Wing runs Counter Over away from fake flow (Read #2)!
  const wingL =
    snapSide === 'LEFT'
      ? makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -5.0, y: 7.2 }, { x: -3.0, y: 12.2 },
        ], 1, R.TE2_TREMBLE.blockRating)
      : makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -1.5, y: 5.5 }, { x: 5.5, y: 9.2 }, { x: 10.5, y: 11.0 },
        ], 2, R.TE2_TREMBLE.blockRating);
  const wingR =
    snapSide === 'RIGHT'
      ? makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 5.0, y: 7.2 }, { x: 3.0, y: 12.2 },
        ], 1, R.TE1_WARREN.blockRating)
      : makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 1.5, y: 5.5 }, { x: -5.5, y: 9.2 }, { x: -10.5, y: 11.0 },
        ], 2, R.TE1_WARREN.blockRating);

  const qb1 =
    snapSide === 'LEFT'
      ? makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -0.8, y: -5.4 },
        ])
      : makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: -9.2, y: -4.4 }, { x: -14.2, y: -0.5 }, { x: -17.0, y: 6.5 },
        ], 5);
  const qb2 =
    snapSide === 'RIGHT'
      ? makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 0.8, y: -5.4 },
        ])
      : makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 9.2, y: -4.4 }, { x: 14.2, y: -0.5 }, { x: 17.0, y: 6.5 },
        ], 5);

  const activeQb = snapSide === 'RIGHT' ? qb2 : qb1;
  activeQb.isSnapRecipient = true;
  activeQb.actionFamily = 'PERIMETER_PITCH_TOSS';
  activeQb.fakeAction = {
    enabled: true,
    family: 'PERIMETER_PITCH_TOSS',
    fakeTargetId: snapSide === 'RIGHT' ? 'QB' : 'RB',
    fakeStartSec: 0.12,
    fakeDurationSec: 0.92,
    fakeDirectionX: -dir * 9.5,
    fakeDirectionY: -3.2,
    affectsSpy: true,
  };
  activeQb.designedScrambleRead = {
    enabled: true,
    afterReadOrder: 2,
    minDecisionTimeSec: 1.85,
    voidCorridorCenterX: dir * 2.2,
    voidCorridorHalfWidthX: 3.1,
    voidCorridorMaxY: 8.5,
    maxDefendersInVoid: 0,
    fallbackReceiverId: snapSide === 'RIGHT' ? 'SL' : 'TE',
    scrambleWaypoints: [
      { x: dir * 1.6, y: -1.2 },
      { x: dir * 2.8, y: 5.5 },
      { x: dir * 3.4, y: 16.0 },
    ],
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// [7] Married PA Seam Flood (SPLIT_GUN_EXCHANGE, Fake — enhanced with FakeActionConfig & PA hinge protection)
function buildChiralPaSeamFlood(snapSide: 'LEFT' | 'RIGHT'): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const dir = snapSide === 'RIGHT' ? 1 : -1;
  const ol = buildPassOL();

  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL',
    snapSide === 'LEFT' ? [{ x: -16.5, y: 10.5 }, { x: -20.5, y: 15.5 }] : [{ x: -15.5, y: 12.0 }, { x: -11.5, y: 20.0 }],
    snapSide === 'LEFT' ? 3 : 4);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL',
    snapSide === 'RIGHT' ? [{ x: 16.5, y: 10.5 }, { x: 20.5, y: 15.5 }] : [{ x: 15.5, y: 12.0 }, { x: 11.5, y: 20.0 }],
    snapSide === 'RIGHT' ? 3 : 4);

  const wingL =
    snapSide === 'LEFT'
      ? makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -5.2, y: 8.0 }, { x: -4.0, y: 12.2 },
        ], 1, R.TE2_TREMBLE.blockRating)
      : makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -1.5, y: 7.0 }, { x: 4.5, y: 10.8 }, { x: 10.5, y: 12.0 },
        ], 2, R.TE2_TREMBLE.blockRating);
  const wingR =
    snapSide === 'RIGHT'
      ? makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 5.2, y: 8.0 }, { x: 4.0, y: 12.2 },
        ], 1, R.TE1_WARREN.blockRating)
      : makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 1.5, y: 7.0 }, { x: -4.5, y: 10.8 }, { x: -10.5, y: 12.0 },
        ], 2, R.TE1_WARREN.blockRating);

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
  activeQb.actionFamily = 'SPLIT_GUN_EXCHANGE';
  activeQb.playAction = {
    enabled: true,
    meshDurationSec: 0.80,
    fakeCarrierId: snapSide === 'RIGHT' ? 'QB' : 'RB',
    fakeGap: snapSide === 'RIGHT' ? 'C_LEFT' : 'C_RIGHT',
    isBootleg: false,
    bootDirection: 'POCKET',
  };
  activeQb.fakeAction = {
    enabled: true,
    family: 'SPLIT_GUN_EXCHANGE',
    fakeTargetId: snapSide === 'RIGHT' ? 'QB' : 'RB',
    fakeStartSec: 0.12,
    fakeDurationSec: 0.95,
    fakeDirectionX: -dir * 6.2,
    fakeDirectionY: -2.4,
    affectsSpy: true,
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

// [8] Neutral Reset / Read-3 Mesh Void (family: null)
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

// ============================================================================
// 4. PLAYBOOK REGISTRY (10 PLAYS: 8 IDENTICAL-ALIGNMENT CHIRAL + 2 ARGON)
// ============================================================================
interface MarriedPlayDef {
  id: string;
  family: FakeActionFamily | null;
  isFake: boolean;
  isBaseLegacy: boolean;
  build: (def: SimAgent[], rep: number) => SimAgent[];
}

const MARRIED_PLAYBOOK: MarriedPlayDef[] = [
  {
    id: 'CHIRAL_DIRECT_SNAP_LASER',
    family: 'PERIMETER_PITCH_TOSS',
    isFake: false,
    isBaseLegacy: true,
    build: (def, rep) => buildChiralDirectSnapLaser(selectDirectionalSnapSide(def, rep).side),
  },
  {
    id: 'CHIRAL_REACTOR_SWEEP',
    family: 'PERIMETER_PITCH_TOSS',
    isFake: false,
    isBaseLegacy: true,
    build: (def, rep) => buildChiralReactorSweep(selectDirectionalSnapSide(def, rep).side),
  },
  {
    id: 'CHIRAL_SPLIT_GUN_INSIDE_EXCHANGE',
    family: 'SPLIT_GUN_EXCHANGE',
    isFake: false,
    isBaseLegacy: false,
    build: (def, rep) => buildChiralSplitGunInsideExchange(selectDirectionalSnapSide(def, rep).side),
  },
  {
    id: 'ARGON_4MIN_LEFT_MONOLITH',
    family: 'SPLIT_GUN_EXCHANGE',
    isFake: false,
    isBaseLegacy: true,
    build: () => ARGON_2027_PLAYBOOK.find((p) => p.id === 'ARGON_4MIN_LEFT_MONOLITH')!.buildOffense(),
  },
  {
    id: 'CHIRAL_FAKE_PITCH_COUNTER_KEEP',
    family: 'PERIMETER_PITCH_TOSS',
    isFake: true,
    isBaseLegacy: false,
    build: (def, rep) => buildChiralFakePitchCounterKeep(selectDirectionalSnapSide(def, rep).side),
  },
  {
    id: 'CHIRAL_FAKE_EXCHANGE_BOOT_FLOOD',
    family: 'SPLIT_GUN_EXCHANGE',
    isFake: true,
    isBaseLegacy: false,
    build: (def, rep) => buildChiralFakeExchangeBootFlood(selectDirectionalSnapSide(def, rep).side),
  },
  {
    id: 'CHIRAL_FAKE_SWEEP_READ3_SEAM',
    family: 'PERIMETER_PITCH_TOSS',
    isFake: true,
    isBaseLegacy: false,
    build: (def, rep) => buildChiralFakeSweepRead3Seam(selectDirectionalSnapSide(def, rep).side),
  },
  {
    id: 'CHIRAL_PA_SEAM_FLOOD',
    family: 'SPLIT_GUN_EXCHANGE',
    isFake: true,
    isBaseLegacy: true,
    build: (def, rep) => buildChiralPaSeamFlood(selectDirectionalSnapSide(def, rep).side),
  },
  {
    id: 'CHIRAL_READ3_MESH_VOID',
    family: null,
    isFake: false,
    isBaseLegacy: true,
    build: (def, rep) => buildChiralRead3MeshVoid(selectDirectionalSnapSide(def, rep).side),
  },
  {
    id: 'ARGON_NOBLE_KINETIC_RELAY',
    family: null,
    isFake: false,
    isBaseLegacy: true,
    build: () => ARGON_2027_PLAYBOOK.find((p) => p.id === 'ARGON_NOBLE_KINETIC_RELAY')!.buildOffense(),
  },
];

// ============================================================================
// 5. ZERO-SUM NASH SOLVER & PRNG
// ============================================================================
function solveZeroSumNash(
  offIds: string[],
  defIds: readonly string[],
  payoff: number[][],
  iterations = 14000
): {
  value: number;
  dualityGap: number;
  offStrategy: Record<string, number>;
  defStrategy: Record<string, number>;
  offWeights: number[];
  defWeights: number[];
} {
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

    const w = iter + 1;
    for (let i = 0; i < m; i++) sumOff[i] += w * p[i];
    for (let j = 0; j < n; j++) sumDef[j] += w * q[j];

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

  let sOff = 0;
  let sDef = 0;
  for (let i = 0; i < m; i++) sOff += sumOff[i];
  for (let j = 0; j < n; j++) sDef += sumDef[j];
  const pAvg = Array.from(sumOff, (v) => v / sOff);
  const qAvg = Array.from(sumDef, (v) => v / sDef);

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
    offWeights: pAvg,
    defWeights: qAvg,
  };
}

function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withSeededMathRandom<T>(seed: number, fn: () => T): T {
  const origRandom = Math.random;
  Math.random = createRng(seed);
  try {
    return fn();
  } finally {
    Math.random = origRandom;
  }
}

function sampleIndex(weights: number[], rng: () => number): number {
  let tot = 0;
  for (const w of weights) tot += w;
  if (tot <= 0) return 0;
  let r = rng() * tot;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// ============================================================================
// 6. STAGE 0 LEGALITY & BIOMECHANICS AUDIT
// ============================================================================
function auditPlaybook(engine: All22KinematicEngine): void {
  console.log(`--- 0. STRICT NFL RULES & BIOMECHANICS AUDIT (ALL ${MARRIED_PLAYBOOK.length} PLAYS x ALL 13 FRONTS) ---`);
  for (const play of MARRIED_PLAYBOOK) {
    let onLos = 0;
    let uncov = true;
    let maxOlY = -99;
    let maxG = 0;
    let minSep = 99;
    for (let f = 0; f < ALL_13_FRONTS.length; f++) {
      const def = buildAnyDefense(ALL_13_FRONTS[f]);
      const off = play.build(def, f);
      if (f === 0) {
        const los = off.filter((a) => a.startY >= -0.75);
        onLos = los.length;
        const sorted = los.slice().sort((a, b) => a.startX - b.startX);
        const elig = new Set(['WR', 'TE', 'SL', 'RB', 'QB']);
        uncov = onLos === 7 && elig.has(sorted[0].pos) && elig.has(sorted[sorted.length - 1].pos);
      }
      const ctx: SimFieldContext | undefined = play.family
        ? {
            offenseActionFamily: play.family,
            defensiveMemory: play.isFake
              ? { familyPriming: { [play.family]: 0.85 } }
              : { realPlayAnticipation: { [play.family]: 0.0 } },
          }
        : undefined;
      const traj = engine.simulatePlay([...off, ...def], 0.65, ctx);
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
      `  ${play.id.padEnd(32)} | LOS=${onLos} | Uncov=${uncov} | MaxOL_Y=${(maxOlY === -99 ? 0 : maxOlY).toFixed(2)}y | MaxG=${maxG.toFixed(2)}G | MinSep=${minSep.toFixed(2)}y | ${ok ? 'PASS' : 'FAIL'}`
    );
    if (!ok) throw new Error(`Legality/biomechanics audit failed for ${play.id}`);
  }
  console.log('');
}

// ============================================================================
// 7. EMPIRICAL 20 HZ PAYOFF TENSOR R(a, d, sigma) + INTERPOLATOR
// ============================================================================
interface TensorPayoff {
  // Fake plays: [BURNED(-0.80), NEUTRAL(0.00), PRIMED(+0.85)] -> [13 fronts]
  burned?: number[];
  neutral: number[];
  primed?: number[];
  // Real family plays: [FRESH(0.00), ANTICIPATED(+0.75)]
  anticipated?: number[];
}

interface ContinuousMemoryState {
  pHat: number[];          // DC's recency-weighted play distribution (length 9)
  pitchPrime: number;      // PERIMETER_PITCH_TOSS priming in [-1, +1]
  exchangePrime: number;   // SPLIT_GUN_EXCHANGE priming in [-1, +1]
  lastRealFamily: FakeActionFamily | null;
  repeatAntic: number;     // Consecutive real-play anticipation [0..1]
  lastPlayIdx: number;
}

const BASE_DC_PRIOR_13: number[] = (() => {
  // Base league shell distribution (~82% legacy 9 fronts + ~18% specialized base mix before adaptation)
  const map: Record<string, number> = { ...LEAGUE_OPEN_DEF_WEIGHTS };
  const raw = ALL_13_FRONTS.map((f) => {
    if ((ADAPTIVE_COUNTER_DEF_FRONTS as readonly string[]).includes(f)) {
      if (f === 'NICKEL_SYMMETRIC_WIDE9_C4') return 0.08;
      if (f === 'NICKEL_QB_SPY_CONTAIN_C1') return 0.05;
      if (f === 'BASE_34_DOUBLE_EDGE_SPY_C3') return 0.05;
      return 0.04;
    }
    return (map[f] ?? 0.08) * 0.78;
  });
  const s = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / s);
})();

function evalTensorCell(
  play: MarriedPlayDef,
  tensor: TensorPayoff[],
  playIdx: number,
  defIdx: number,
  mem: ContinuousMemoryState
): number {
  const row = tensor[playIdx];
  if (play.isFake && play.family && row.burned && row.primed) {
    const p = play.family === 'PERIMETER_PITCH_TOSS' ? mem.pitchPrime : mem.exchangePrime;
    if (p >= 0) {
      const t = Math.min(1.0, p / 0.85);
      return row.neutral[defIdx] * (1 - t) + row.primed[defIdx] * t;
    } else {
      const t = Math.min(1.0, Math.abs(p) / 0.80);
      return row.neutral[defIdx] * (1 - t) + row.burned[defIdx] * t;
    }
  }
  if (!play.isFake && play.family && row.anticipated) {
    const antic = play.family === mem.lastRealFamily ? mem.repeatAntic : 0;
    const t = Math.min(1.0, antic / 0.75);
    return row.neutral[defIdx] * (1 - t) + row.anticipated[defIdx] * t;
  }
  return row.neutral[defIdx];
}

function getDcFrontWeights(
  mode: 'NAIVE_STATIC' | 'ADAPTIVE_MEMORY' | 'FAST_REACT' | 'SLOW_DISCIPLINED' | 'OMNISCIENT_NASH' | 'HYBRID_ELITE',
  mem: ContinuousMemoryState,
  subPlaybook: MarriedPlayDef[],
  subTensor: TensorPayoff[],
  nashDefWeights: number[]
): number[] {
  if (mode === 'NAIVE_STATIC') return BASE_DC_PRIOR_13;
  if (mode === 'OMNISCIENT_NASH') return nashDefWeights;

  const beta = mode === 'FAST_REACT' ? 6.5 : mode === 'SLOW_DISCIPLINED' ? 3.5 : 5.0;
  const logits = ALL_13_FRONTS.map((_, j) => {
    let expectedEpa = 0;
    for (let i = 0; i < subPlaybook.length; i++) {
      expectedEpa += mem.pHat[i] * evalTensorCell(subPlaybook[i], subTensor, i, j, mem);
    }
    return Math.log(Math.max(1e-6, BASE_DC_PRIOR_13[j])) - beta * expectedEpa;
  });
  const maxLog = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLog));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const memQ = exps.map((v) => v / sumExp);

  if (mode === 'HYBRID_ELITE') {
    return memQ.map((v, j) => 0.50 * v + 0.50 * nashDefWeights[j]);
  }
  return memQ;
}

function stepMemoryState(
  mem: ContinuousMemoryState,
  playIdx: number,
  subPlaybook: MarriedPlayDef[],
  lambdaDc: number
): ContinuousMemoryState {
  const play = subPlaybook[playIdx];
  const nextPHat = mem.pHat.map((p, i) => lambdaDc * p + (1 - lambdaDc) * (i === playIdx ? 1.0 : 0.0));
  let nextPitch = 0.72 * mem.pitchPrime;
  let nextExch = 0.72 * mem.exchangePrime;
  let nextRealFam: FakeActionFamily | null = null;
  let nextAntic = 0;

  const clip = (x: number) => Math.max(-1.0, Math.min(1.0, x));
  if (play.family === 'PERIMETER_PITCH_TOSS') {
    if (!play.isFake) {
      nextPitch = clip(nextPitch + 0.58);
      nextRealFam = 'PERIMETER_PITCH_TOSS';
      nextAntic = mem.lastRealFamily === 'PERIMETER_PITCH_TOSS' ? Math.min(0.95, mem.repeatAntic + 0.45) : 0.45;
    } else {
      nextPitch = clip(nextPitch - 0.90); // Consumes priming + burns if back-to-back!
    }
  } else if (play.family === 'SPLIT_GUN_EXCHANGE') {
    if (!play.isFake) {
      nextExch = clip(nextExch + 0.58);
      nextRealFam = 'SPLIT_GUN_EXCHANGE';
      nextAntic = mem.lastRealFamily === 'SPLIT_GUN_EXCHANGE' ? Math.min(0.95, mem.repeatAntic + 0.45) : 0.45;
    } else {
      nextExch = clip(nextExch - 0.90);
    }
  }

  return {
    pHat: nextPHat,
    pitchPrime: nextPitch,
    exchangePrime: nextExch,
    lastRealFamily: nextRealFam,
    repeatAntic: nextAntic,
    lastPlayIdx: playIdx,
  };
}

function makeColdState(numPlays: number): ContinuousMemoryState {
  return {
    pHat: Array.from({ length: numPlays }, () => 1 / numPlays),
    pitchPrime: 0,
    exchangePrime: 0,
    lastRealFamily: null,
    repeatAntic: 0,
    lastPlayIdx: -1,
  };
}

// Discretize state into 4 x 3 x 3 x 3 = 108 Markov States observable via DC alignment + own play call history
function discretizeState(
  mem: ContinuousMemoryState,
  dcQ: number[]
): number {
  const idxW9 = ALL_13_FRONTS.indexOf('NICKEL_SYMMETRIC_WIDE9_C4');
  const idx34 = ALL_13_FRONTS.indexOf('BASE_34_DOUBLE_EDGE_SPY_C3');
  const idxSpy = ALL_13_FRONTS.indexOf('NICKEL_QB_SPY_CONTAIN_C1');
  const idxVik = ALL_13_FRONTS.indexOf('VIKINGS_SAFETY_BLITZ_C1');
  const idxMug = ALL_13_FRONTS.indexOf('DIME_MUG_C0');
  const idxCross = ALL_13_FRONTS.indexOf('VIKINGS_MUG_CROSSDOG_C0');
  const idxBrk = ALL_13_FRONTS.indexOf('NICKEL_CALVIN_BRACKET_WR1');

  const perimStopWeight = (dcQ[idxW9] ?? 0) + (dcQ[idx34] ?? 0) + (dcQ[idxSpy] ?? 0);
  const blitzWeight = (dcQ[idxVik] ?? 0) + (dcQ[idxMug] ?? 0) + (dcQ[idxCross] ?? 0) + (dcQ[idxBrk] ?? 0);
  const maxP = Math.max(...mem.pHat);

  let macroRegime = 0; // 0 = BALANCED/COLD
  if (maxP >= 0.20) {
    if (perimStopWeight >= 0.28) macroRegime = 1;      // DC stacked perimeter/edges/Spy
    else if (blitzWeight >= 0.34) macroRegime = 2;     // DC heating up pressure/blitzes
    else macroRegime = 3;                              // Legacy mixed/coverage tilt
  }

  const binPrime = (p: number) => (p < -0.22 ? 0 : p <= 0.22 ? 1 : 2);
  const pitchBin = binPrime(mem.pitchPrime);
  const exchBin = binPrime(mem.exchangePrime);
  const repBin = mem.repeatAntic < 0.20 ? 0 : mem.repeatAntic < 0.70 ? 1 : 2;

  return ((macroRegime * 3 + pitchBin) * 3 + exchBin) * 3 + repBin;
}

// ============================================================================
// 8. EXACT EMPIRICAL MDP VALUE ITERATION SEQUENCER (108 STATES x N ACTIONS)
// ============================================================================
function solveOptimalSequencingMdp(
  subPlaybook: MarriedPlayDef[],
  subTensor: TensorPayoff[],
  nashDefWeights: number[],
  dcLambda = 0.70
): {
  policyAction: number[];
  valueFn: number[];
  actionLabels: string[];
} {
  const NUM_STATES = 108;
  const NUM_ACTIONS = subPlaybook.length;
  const GAMMA = 0.96;

  // Populate empirical transition counts & rewards via 45,000 continuous trajectories of the coupled DC dynamics!
  const counts = Array.from({ length: NUM_STATES }, () =>
    Array.from({ length: NUM_ACTIONS }, () => new Float64Array(NUM_STATES))
  );
  const rewardSum = Array.from({ length: NUM_STATES }, () => new Float64Array(NUM_ACTIONS));
  const rewardN = Array.from({ length: NUM_STATES }, () => new Float64Array(NUM_ACTIONS));

  const rng = createRng(424242);
  for (let ep = 0; ep < 1000; ep++) {
    let mem = makeColdState(NUM_ACTIONS);
    for (let t = 0; t < 45; t++) {
      const dcQ = getDcFrontWeights('ADAPTIVE_MEMORY', mem, subPlaybook, subTensor, nashDefWeights);
      const s = discretizeState(mem, dcQ);
      const a = Math.floor(rng() * NUM_ACTIONS);

      // Expected EPA across active adaptive DC mix at current continuous memory state
      let expEpa = 0;
      for (let j = 0; j < ALL_13_FRONTS.length; j++) {
        expEpa += dcQ[j] * evalTensorCell(subPlaybook[a], subTensor, a, j, mem);
      }

      const nextMem = stepMemoryState(mem, a, subPlaybook, dcLambda);
      const nextDcQ = getDcFrontWeights('ADAPTIVE_MEMORY', nextMem, subPlaybook, subTensor, nashDefWeights);
      const sNext = discretizeState(nextMem, nextDcQ);

      counts[s][a][sNext] += 1;
      rewardSum[s][a] += expEpa;
      rewardN[s][a] += 1;
      mem = nextMem;
    }
  }

  // Fallback expected payoff at cold centroid for any never-visited state-action pair
  const coldState = makeColdState(NUM_ACTIONS);
  const coldDc = getDcFrontWeights('ADAPTIVE_MEMORY', coldState, subPlaybook, subTensor, nashDefWeights);
  const coldExp = subPlaybook.map((p, a) =>
    coldDc.reduce((acc, qj, j) => acc + qj * evalTensorCell(p, subTensor, a, j, coldState), 0)
  );

  // Value Iteration (450 sweeps)
  let V = new Float64Array(NUM_STATES);
  const policyAction = new Array<number>(NUM_STATES).fill(0);

  for (let iter = 0; iter < 450; iter++) {
    const Vnext = new Float64Array(NUM_STATES);
    for (let s = 0; s < NUM_STATES; s++) {
      let bestQ = -Infinity;
      let bestA = 0;
      for (let a = 0; a < NUM_ACTIONS; a++) {
        const nSA = rewardN[s][a];
        if (nSA < 1) {
          if (coldExp[a] > bestQ) {
            bestQ = coldExp[a];
            bestA = a;
          }
          continue;
        }
        const meanR = rewardSum[s][a] / nSA;
        let futureV = 0;
        const row = counts[s][a];
        for (let sn = 0; sn < NUM_STATES; sn++) {
          if (row[sn] > 0) futureV += (row[sn] / nSA) * V[sn];
        }
        const qVal = meanR + GAMMA * futureV;
        if (qVal > bestQ) {
          bestQ = qVal;
          bestA = a;
        }
      }
      Vnext[s] = bestQ === -Infinity ? 0 : bestQ;
      policyAction[s] = bestA;
    }
    V = Vnext;
  }

  return {
    policyAction,
    valueFn: Array.from(V),
    actionLabels: policyAction.map((a) => subPlaybook[a].id),
  };
}

// ============================================================================
// 8B. REUSABLE BENCHMARK EXPERIMENT RUNNER
// ============================================================================
type OffPolicyId =
  | 'STATIC_NAIVE_SPAM'
  | 'STATIC_NASH_MIX'
  | 'HEURISTIC_2_REAL_1_FAKE'
  | 'MDP_OPTIMAL_SEQUENCER'
  | 'NASH_GUARDED_SEQUENCER';

type DcModeId =
  | 'NAIVE_STATIC'
  | 'ADAPTIVE_MEMORY'
  | 'FAST_REACT'
  | 'SLOW_DISCIPLINED'
  | 'HYBRID_ELITE'
  | 'OMNISCIENT_NASH';

interface SequencingExperimentResult {
  label: string;
  playbookIds: string[];
  baselines: {
    V_NAIVE: number;
    bestNaivePlay: string;
    V_OMNISCIENT_NASH_BASE: number;
    V_OMNISCIENT_NASH_FULL: number;
    nashFullOffStrategy: Record<string, number>;
    nashFullDefStrategy: Record<string, number>;
  };
  policyVsDcMatrix: Record<string, Record<string, number>>;
  canonical10PlaySequence: any[];
  canonical10PlayMeanEpa: number;
  mdpStateSampleActions: string[];
}

function runSequencingExperiment(opts: {
  label: string;
  sectionPrefix: string;
  subPlaybook: MarriedPlayDef[];
  subTensor: TensorPayoff[];
  games?: number;
  snapsPerGame?: number;
  seedOffset?: number;
}): SequencingExperimentResult {
  const { label, sectionPrefix, subPlaybook, subTensor, games = 2000, snapsPerGame = 60, seedOffset = 0 } = opts;

  // Reference Baselines: V_Naive vs V_Omniscient_Nash (Base vs Full)
  const naivePayoffs = subPlaybook.map((p, i) => ({
    id: p.id,
    naiveEpa: +ALL_13_FRONTS.reduce((acc, _, j) => acc + BASE_DC_PRIOR_13[j] * subTensor[i].neutral[j], 0).toFixed(4),
  })).sort((a, b) => b.naiveEpa - a.naiveEpa);
  const V_NAIVE = naivePayoffs[0].naiveEpa;
  const BEST_NAIVE_PLAY_IDX = subPlaybook.findIndex((p) => p.id === naivePayoffs[0].id);

  const baseIdx = subPlaybook.map((p, i) => (p.isBaseLegacy ? i : -1)).filter((i) => i >= 0);
  const nashFull = solveZeroSumNash(
    subPlaybook.map((p) => p.id),
    ALL_13_FRONTS,
    subTensor.map((r) => r.neutral)
  );
  const nashBase =
    baseIdx.length > 0
      ? solveZeroSumNash(
          baseIdx.map((i) => subPlaybook[i].id),
          ALL_13_FRONTS,
          baseIdx.map((i) => subTensor[i].neutral)
        )
      : nashFull;

  const V_OMNISCIENT_NASH_BASE = nashBase.value;
  const V_OMNISCIENT_NASH_FULL = nashFull.value;

  const fmtSigned = (v: number, digits = 4) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;

  console.log(`--- ${sectionPrefix}A. [${label}] REFERENCE GAME-THEORETIC BENCHMARKS ---`);
  console.log(`  Best Play vs Naive Static DC:  ${naivePayoffs[0].id} => V_NAIVE = ${fmtSigned(V_NAIVE)} EPA/play`);
  console.log(`  Omniscient Static Nash (${baseIdx.length} Base Plays):  V_NASH_BASE = ${fmtSigned(V_OMNISCIENT_NASH_BASE)} (gap=${nashBase.dualityGap})`);
  console.log(`  Omniscient Static Nash (All ${subPlaybook.length} Plays): V_NASH_FULL = ${fmtSigned(V_OMNISCIENT_NASH_FULL)} (gap=${nashFull.dualityGap})`);
  console.log(
    `  Full Nash Off Mix: ${Object.entries(nashFull.offStrategy).filter(([, w]) => w >= 5).sort((a, b) => b[1] - a[1]).map(([k, w]) => `${k}:${w}%`).join(', ')}`
  );
  console.log(
    `  Full Nash Def Mix: ${Object.entries(nashFull.defStrategy).filter(([, w]) => w >= 5).sort((a, b) => b[1] - a[1]).map(([k, w]) => `${k}:${w}%`).join(', ')}\n`
  );

  // Solve Exact MDP Optimal Play Sequencer
  const mdp = solveOptimalSequencingMdp(subPlaybook, subTensor, nashFull.defWeights, 0.70);

  const idxOf = (id: string) => subPlaybook.findIndex((p) => p.id === id);
  const safeIdx = (idx: number) => (idx >= 0 ? idx : 0);
  const idxLaser = safeIdx(idxOf('CHIRAL_DIRECT_SNAP_LASER'));
  const idxSweep = safeIdx(idxOf('CHIRAL_REACTOR_SWEEP'));
  const idxMonolith = idxOf('ARGON_4MIN_LEFT_MONOLITH');
  const idxInsideExch = idxOf('CHIRAL_SPLIT_GUN_INSIDE_EXCHANGE');
  const idxExchReal = safeIdx(idxMonolith >= 0 ? idxMonolith : idxInsideExch);
  const idxFakeKeep = safeIdx(idxOf('CHIRAL_FAKE_PITCH_COUNTER_KEEP'));
  const idxFakeBoot = safeIdx(idxOf('CHIRAL_FAKE_EXCHANGE_BOOT_FLOOD'));
  const idxFakeSeam = safeIdx(idxOf('CHIRAL_FAKE_SWEEP_READ3_SEAM'));
  const idxPaSeam = safeIdx(idxOf('CHIRAL_PA_SEAM_FLOOD'));

  const pickOffPlay = (
    pol: OffPolicyId,
    mem: ContinuousMemoryState,
    dcQ: number[],
    snapIdx: number,
    rng: () => number
  ): number => {
    if (pol === 'STATIC_NAIVE_SPAM') return BEST_NAIVE_PLAY_IDX;
    if (pol === 'STATIC_NASH_MIX') return sampleIndex(nashFull.offWeights, rng);
    if (pol === 'HEURISTIC_2_REAL_1_FAKE') {
      // Classic 6-play Shanahan/Johnson married cycle: 2 Perimeter Setups -> Fake Counter/Seam -> 2 Exchange Setups -> Boot/PA
      const step = snapIdx % 6;
      if (step === 0) return idxLaser;
      if (step === 1) return idxSweep;
      if (step === 2) return rng() < 0.5 ? idxFakeSeam : idxFakeKeep;
      if (step === 3 || step === 4) return idxExchReal;
      return rng() < 0.5 ? idxFakeBoot : idxPaSeam;
    }
    const s = discretizeState(mem, dcQ);
    const mdpA = mdp.policyAction[s];
    if (pol === 'MDP_OPTIMAL_SEQUENCER') {
      return rng() < 0.92 ? mdpA : sampleIndex(nashFull.offWeights, rng);
    }
    return rng() < 0.75 ? mdpA : sampleIndex(nashFull.offWeights, rng);
  };

  const POLICIES: OffPolicyId[] = [
    'STATIC_NAIVE_SPAM',
    'STATIC_NASH_MIX',
    'HEURISTIC_2_REAL_1_FAKE',
    'MDP_OPTIMAL_SEQUENCER',
    'NASH_GUARDED_SEQUENCER',
  ];
  const DC_MODES: { id: DcModeId; lambda: number; label: string }[] = [
    { id: 'NAIVE_STATIC', lambda: 0.90, label: 'Naive Static' },
    { id: 'ADAPTIVE_MEMORY', lambda: 0.70, label: 'Adaptive Mem' },
    { id: 'FAST_REACT', lambda: 0.55, label: 'Fast React' },
    { id: 'SLOW_DISCIPLINED', lambda: 0.85, label: 'Slow Discip' },
    { id: 'HYBRID_ELITE', lambda: 0.70, label: 'Hybrid 50/50' },
    { id: 'OMNISCIENT_NASH', lambda: 0.70, label: 'Omnis Nash' },
  ];

  console.log(`--- ${sectionPrefix}B. [${label}] POLICY MATRIX (EPA/PLAY ACROSS ${games.toLocaleString()} GAMES x ${snapsPerGame} SNAPS/CELL) ---`);
  console.log(
    `  ${'Offensive Policy'.padEnd(28)} | ` +
      DC_MODES.map((d) => d.label.padStart(12)).join(' | ')
  );

  const matrixResults: Record<string, Record<string, number>> = {};

  for (const pol of POLICIES) {
    matrixResults[pol] = {};
    const rowCells: string[] = [];
    for (let dIdx = 0; dIdx < DC_MODES.length; dIdx++) {
      const dc = DC_MODES[dIdx];
      const rng = createRng(99000 + seedOffset + dIdx * 313 + pol.length * 17);
      let epaTot = 0;
      let nTot = 0;

      for (let g = 0; g < games; g++) {
        let mem = makeColdState(subPlaybook.length);
        for (let t = 0; t < snapsPerGame; t++) {
          const dcQ = getDcFrontWeights(dc.id, mem, subPlaybook, subTensor, nashFull.defWeights);
          const a = pickOffPlay(pol, mem, dcQ, t, rng);
          const defFront = sampleIndex(dcQ, rng);
          epaTot += evalTensorCell(subPlaybook[a], subTensor, a, defFront, mem);
          nTot++;
          mem = stepMemoryState(mem, a, subPlaybook, dc.lambda);
        }
      }
      const meanEpa = +(epaTot / nTot).toFixed(4);
      matrixResults[pol][dc.id] = meanEpa;
      rowCells.push(`${meanEpa >= 0 ? '+' : ''}${meanEpa.toFixed(4)}`.padStart(12));
    }
    console.log(`  ${pol.padEnd(28)} | ${rowCells.join(' | ')}`);
  }
  console.log(
    `  References: V_NAIVE = ${fmtSigned(V_NAIVE)} | V_NASH_BASE = ${fmtSigned(V_OMNISCIENT_NASH_BASE)} | V_NASH_FULL = ${fmtSigned(V_OMNISCIENT_NASH_FULL)}\n`
  );

  console.log(`--- ${sectionPrefix}C. [${label}] CANONICAL 10-PLAY MDP OPTIMAL SEQUENCE ROLLOUT (VS ADAPTIVE MEMORY DC, λ=0.70) ---`);
  let traceMem = makeColdState(subPlaybook.length);
  const traceLog: any[] = [];
  let cumEpa = 0;

  for (let snap = 1; snap <= 10; snap++) {
    const dcQ = getDcFrontWeights('ADAPTIVE_MEMORY', traceMem, subPlaybook, subTensor, nashFull.defWeights);
    const s = discretizeState(traceMem, dcQ);
    const a = mdp.policyAction[s];
    const play = subPlaybook[a];
    const expEpa = +dcQ.reduce(
      (acc, qj, j) => acc + qj * evalTensorCell(play, subTensor, a, j, traceMem),
      0
    ).toFixed(4);
    cumEpa += expEpa;

    const top2Dc = dcQ
      .map((q, j) => ({ f: ALL_13_FRONTS[j], q }))
      .sort((u, v) => v.q - u.q)
      .slice(0, 2)
      .map((x) => `${x.f}:${(x.q * 100).toFixed(0)}%`)
      .join(', ');

    console.log(
      `  Snap ${String(snap).padStart(2)} | Pitchπ=${(traceMem.pitchPrime >= 0 ? '+' : '') + traceMem.pitchPrime.toFixed(2)} | Exchπ=${(traceMem.exchangePrime >= 0 ? '+' : '') + traceMem.exchangePrime.toFixed(2)} | Call=${play.id.padEnd(34)} | ExpEPA=${expEpa >= 0 ? '+' : ''}${expEpa.toFixed(3)} | TopDC=[${top2Dc}]`
    );

    traceLog.push({
      snap,
      stateId: s,
      pitchPrimeBefore: +traceMem.pitchPrime.toFixed(3),
      exchangePrimeBefore: +traceMem.exchangePrime.toFixed(3),
      repeatAnticBefore: +traceMem.repeatAntic.toFixed(3),
      calledPlay: play.id,
      family: play.family,
      isFake: play.isFake,
      expectedEpa: expEpa,
      topDcFronts: top2Dc,
    });
    traceMem = stepMemoryState(traceMem, a, subPlaybook, 0.70);
  }
  const canonical10PlayMeanEpa = +(cumEpa / 10).toFixed(4);
  console.log(`  10-Play Mean Sequence EPA = ${fmtSigned(canonical10PlayMeanEpa)} (vs V_NAIVE=${fmtSigned(V_NAIVE)}, V_NASH_BASE=${fmtSigned(V_OMNISCIENT_NASH_BASE)})\n`);

  return {
    label,
    playbookIds: subPlaybook.map((p) => p.id),
    baselines: {
      V_NAIVE,
      bestNaivePlay: naivePayoffs[0].id,
      V_OMNISCIENT_NASH_BASE,
      V_OMNISCIENT_NASH_FULL,
      nashFullOffStrategy: nashFull.offStrategy,
      nashFullDefStrategy: nashFull.defStrategy,
    },
    policyVsDcMatrix: matrixResults,
    canonical10PlaySequence: traceLog,
    canonical10PlayMeanEpa,
    mdpStateSampleActions: mdp.actionLabels.slice(0, 36),
  };
}

// ============================================================================
// 9. MAIN RUNNER
// ============================================================================
async function main() {
  const engine = new All22KinematicEngine();
  const REPS = 36;

  console.log('==================================================================================');
  console.log('20 HZ FAKE PITCH/EXCHANGE PHYSICS, DEFENSIVE MEMORY & OPTIMAL MDP SEQUENCING LAB');
  console.log('==================================================================================\n');

  auditPlaybook(engine);

  // 1. Build Full Empirical 20 Hz Payoff Tensor R(a, d, sigma) with Common Random Numbers (CRN)
  console.log(`--- 1. EMPIRICAL 20 HZ PRIMING TENSOR (REPS=${REPS}/cell across 13 Defenses, CRN-Aligned) ---`);
  const tensor: TensorPayoff[] = [];
  const primingAuditTable: any[] = [];

  const simMeanAcross13 = (
    playIdx: number,
    play: MarriedPlayDef,
    ctxFn: (def: SimAgent[], rep: number) => SimFieldContext | undefined
  ): number[] => {
    const out: number[] = [];
    for (let j = 0; j < ALL_13_FRONTS.length; j++) {
      const fId = ALL_13_FRONTS[j];
      let sum = 0;
      for (let r = 0; r < REPS; r++) {
        const def = buildAnyDefense(fId);
        const off = play.build(def, r);
        const ctx = ctxFn(def, r);
        const traj = withSeededMathRandom(
          1000003 + playIdx * 10007 + j * 97 + r,
          () => engine.simulatePlay([...off, ...def], 0.65, ctx)
        );
        sum += traj[traj.length - 1].expectedEpa ?? 0;
      }
      out.push(+(sum / REPS).toFixed(4));
    }
    return out;
  };

  for (let playIdx = 0; playIdx < MARRIED_PLAYBOOK.length; playIdx++) {
    const play = MARRIED_PLAYBOOK[playIdx];
    if (play.isFake && play.family) {
      const fam = play.family;
      const burned = simMeanAcross13(playIdx, play, () => ({
        offenseActionFamily: fam,
        defensiveMemory: { familyPriming: { [fam]: -0.80 } },
      }));
      const neutral = simMeanAcross13(playIdx, play, () => ({
        offenseActionFamily: fam,
        defensiveMemory: { familyPriming: { [fam]: 0.0 } },
      }));
      const primed = simMeanAcross13(playIdx, play, () => ({
        offenseActionFamily: fam,
        defensiveMemory: { familyPriming: { [fam]: 0.85 } },
      }));
      tensor.push({ burned, neutral, primed });
      const avgB = +(burned.reduce((a, b) => a + b, 0) / 13).toFixed(4);
      const avgN = +(neutral.reduce((a, b) => a + b, 0) / 13).toFixed(4);
      const avgP = +(primed.reduce((a, b) => a + b, 0) / 13).toFixed(4);
      const w9Idx = ALL_13_FRONTS.indexOf('NICKEL_SYMMETRIC_WIDE9_C4');
      const spyIdx = ALL_13_FRONTS.indexOf('NICKEL_QB_SPY_CONTAIN_C1');
      console.log(
        `  [FAKE ] ${play.id.padEnd(34)} | Burned=${avgB >= 0 ? '+' : ''}${avgB.toFixed(3)} -> Neutral=${avgN >= 0 ? '+' : ''}${avgN.toFixed(3)} -> Primed=${avgP >= 0 ? '+' : ''}${avgP.toFixed(3)} (Δ_Prime=${(avgP - avgB) >= 0 ? '+' : ''}${(avgP - avgB).toFixed(3)}) | Wide9:${primed[w9Idx].toFixed(2)} | Spy:${primed[spyIdx].toFixed(2)}`
      );
      primingAuditTable.push({ id: play.id, family: fam, isFake: true, burnedMean: avgB, neutralMean: avgN, primedMean: avgP, primeSpan: +(avgP - avgB).toFixed(4) });
    } else if (!play.isFake && play.family) {
      const fam = play.family;
      const neutral = simMeanAcross13(playIdx, play, () => ({
        offenseActionFamily: fam,
        defensiveMemory: { realPlayAnticipation: { [fam]: 0.0 } },
      }));
      const anticipated = simMeanAcross13(playIdx, play, () => ({
        offenseActionFamily: fam,
        defensiveMemory: { realPlayAnticipation: { [fam]: 0.75 } },
      }));
      tensor.push({ neutral, anticipated });
      const avgF = +(neutral.reduce((a, b) => a + b, 0) / 13).toFixed(4);
      const avgA = +(anticipated.reduce((a, b) => a + b, 0) / 13).toFixed(4);
      console.log(
        `  [REAL ] ${play.id.padEnd(34)} | Fresh=${avgF >= 0 ? '+' : ''}${avgF.toFixed(3)} -> Spammed/Antic=${avgA >= 0 ? '+' : ''}${avgA.toFixed(3)} (Decay=${(avgA - avgF).toFixed(3)})`
      );
      primingAuditTable.push({ id: play.id, family: fam, isFake: false, freshMean: avgF, anticipatedMean: avgA, decay: +(avgA - avgF).toFixed(4) });
    } else {
      const neutral = simMeanAcross13(playIdx, play, () => undefined);
      tensor.push({ neutral });
      const avgN = +(neutral.reduce((a, b) => a + b, 0) / 13).toFixed(4);
      console.log(`  [NEUT ] ${play.id.padEnd(34)} | Mean13=${avgN >= 0 ? '+' : ''}${avgN.toFixed(3)}`);
      primingAuditTable.push({ id: play.id, family: null, isFake: false, neutralMean: avgN });
    }
  }
  console.log('');

  // Benchmark A: Full 10-Playbook (Multi-Personnel Argon + Chiral Split-Gun 2-QB Fakes)
  const fullExp = runSequencingExperiment({
    label: 'FULL_10_PLAYBOOK',
    sectionPrefix: '2',
    subPlaybook: MARRIED_PLAYBOOK,
    subTensor: tensor,
    games: 2000,
    snapsPerGame: 60,
    seedOffset: 0,
  });

  // Benchmark B: Pure Same-Formation Zero-Tell Split-Shotgun 2-QB Sub-Game (8 Identical-Alignment Plays)
  const chiralIdx = MARRIED_PLAYBOOK.map((p, i) => (p.id.startsWith('CHIRAL_') ? i : -1)).filter((i) => i >= 0);
  const chiralExp = runSequencingExperiment({
    label: 'SAME_FORMATION_CHIRAL_8',
    sectionPrefix: '3',
    subPlaybook: chiralIdx.map((i) => MARRIED_PLAYBOOK[i]),
    subTensor: chiralIdx.map((i) => tensor[i]),
    games: 2000,
    snapsPerGame: 60,
    seedOffset: 500000,
  });

  // Save report (preserving top-level Full-Playbook keys + dedicated fullPlaybook & sameFormationChiralSubgame sections)
  const outPath = path.join(process.cwd(), 'src', 'data', 'play_sequencing_memory_report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        repsPerTensorCell: REPS,
        baselines: fullExp.baselines,
        primingAuditTable,
        policyVsDcMatrix: fullExp.policyVsDcMatrix,
        canonical10PlaySequence: fullExp.canonical10PlaySequence,
        mdpStateSampleActions: fullExp.mdpStateSampleActions,
        fullPlaybook: fullExp,
        sameFormationChiralSubgame: chiralExp,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`[SAVED] ${outPath}`);
}

const isMainEntry =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isMainEntry) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
