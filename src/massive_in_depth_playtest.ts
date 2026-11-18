import {
  All22KinematicEngine,
  SimAgent,
  PlayTickSnapshot,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
} from './engine';
import nflTeamsRaw from './data/nfl_teams_32.json';
import evolvedPassesRaw from './data/evolved_plays_catalog.json';
import evolvedRunsRaw from './data/evolved_running_schemes.json';

interface PlayMetrics {
  playId: string;
  category: 'PASS' | 'RUN';
  defFront: string;
  runs: number;
  meanEpa: number;
  medianEpa: number;
  successRate: number;
  meanYards: number;
  // Passing specifics
  completionRate?: number;
  sackRate?: number;
  pressureRate?: number;
  meanTimeToThrow?: number;
  interceptionOrBreakupRate?: number;
  // Rushing specifics
  stuffRate?: number;
  explosiveRate?: number;
  brokenTackleRate?: number;
  meanTrenchYards?: number;
  // Micro-kinematic anomaly flags
  maxGsObserved: number;
  gForceViolationsCount: number;
  playerOverlapViolationsCount: number;
  frozenScrumViolationsCount: number;
  crossoverXBlockCount: number;
}

const engine = new All22KinematicEngine();

// Helper to instantiate 10 standard play architectures
function createStandardOffense(
  scheme:
    | 'PASS_HALF_SLIDE'
    | 'PASS_CHIP_FLOOD'
    | 'PASS_QUICK_SLANT'
    | 'PASS_MESH'
    | 'PASS_FOUR_VERTS'
    | 'RUN_DUO_COMBO'
    | 'RUN_POWER_PULL'
    | 'RUN_INSIDE_ZONE'
    | 'RUN_OUTSIDE_ZONE'
    | 'RUN_PIN_PULL'
): SimAgent[] {
  const makeAgent = (
    id: string,
    pos: string,
    x: number,
    y: number,
    role: BlockRoleType,
    gapOrSet: GapOrSetCode,
    primaryTargetId: string | null = null,
    secondaryTargetId: string | null = null,
    leverage: LeverageBias = 'INSIDE_OUT',
    waypoints: Array<{ x: number; y: number }> = [],
    readOrder?: number
  ): SimAgent => ({
    id,
    label: pos,
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
    ratings: { speed: 78, accel: 82, power: 88, finesse: 86, awareness: 88 },
    assignment: {
      role,
      primaryTargetId,
      secondaryTargetId,
      gapOrSet,
      leverage,
      climbOrChipDelaySec: 0.65,
      waypoints,
    },
  });

  if (scheme === 'RUN_DUO_COMBO') {
    return [
      makeAgent('LT', 'LT', -3.2, -0.4, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
      makeAgent('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL'),
      makeAgent('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      makeAgent('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'NEUTRAL'),
      makeAgent('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
      makeAgent('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
      makeAgent('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
      makeAgent('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
      makeAgent('SL', 'SL', -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN'),
      makeAgent('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.4, y: -4.8 }]),
      makeAgent('RB', 'RB', -1.2, -4.8, 'BALL_CARRIER', 'B_RIGHT', null, null, 'NEUTRAL', [
        { x: 0.8, y: -1.5 },
        { x: 2.1, y: 4.0 },
        { x: 2.4, y: 14.0 },
      ]),
    ];
  }

  if (scheme === 'RUN_POWER_PULL') {
    return [
      makeAgent('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'),
      makeAgent('LG', 'LG', -1.6, -0.3, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
        { x: -0.5, y: -1.4 },
        { x: 2.8, y: -1.1 },
        { x: 3.4, y: 3.8 },
      ]),
      makeAgent('C', 'C', 0.0, -0.2, 'MAN_BLOCK', 'A_LEFT', 'NT', null, 'OUTSIDE_IN'),
      makeAgent('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
      makeAgent('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
      makeAgent('TE', 'TE', 4.8, -0.4, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
        { x: 4.2, y: 0.4 },
        { x: 4.9, y: 1.4 },
      ]),
      makeAgent('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14, y: 12 }]),
      makeAgent('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
      makeAgent('SL', 'FB', 0.0, -3.2, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
        { x: 3.6, y: -0.5 },
        { x: 4.5, y: 1.2 },
      ]),
      makeAgent('QB', 'QB', 0.0, -1.8, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: -3.5 }]),
      makeAgent('RB', 'RB', 0.0, -5.2, 'BALL_CARRIER', 'C_RIGHT', null, null, 'NEUTRAL', [
        { x: 2.8, y: -1.0 },
        { x: 3.5, y: 6.0 },
        { x: 4.2, y: 15.0 },
      ]),
    ];
  }

  if (scheme === 'RUN_INSIDE_ZONE') {
    return [
      makeAgent('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'OUTSIDE_IN'),
      makeAgent('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      makeAgent('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      makeAgent('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
      makeAgent('RT', 'RT', 3.2, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
      makeAgent('TE', 'TE', 4.5, -1.2, 'PULL_TRAP', 'C_LEFT', 'RDE', null, 'INSIDE_OUT', [
        { x: 0.0, y: -1.2 },
        { x: -3.6, y: 0.2 },
        { x: -4.2, y: 1.5 },
      ]),
      makeAgent('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
      makeAgent('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
      makeAgent('SL', 'SL', -7.0, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN'),
      makeAgent('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.0, y: -4.8 }]),
      makeAgent('RB', 'RB', -1.4, -4.6, 'BALL_CARRIER', 'A_RIGHT', null, null, 'NEUTRAL', [
        { x: 0.4, y: -1.2 },
        { x: 1.2, y: 4.5 },
        { x: 1.5, y: 15.0 },
      ]),
    ];
  }

  if (scheme === 'RUN_OUTSIDE_ZONE') {
    return [
      makeAgent('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'C_LEFT', 'RDE', null, 'OUTSIDE_IN'),
      makeAgent('LG', 'LG', -1.6, -0.3, 'GAP_ZONE', 'B_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      makeAgent('C', 'C', 0.0, -0.2, 'GAP_ZONE', 'A_LEFT', 'NT', 'MIKE', 'OUTSIDE_IN'),
      makeAgent('RG', 'RG', 1.6, -0.3, 'GAP_ZONE', 'A_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
      makeAgent('RT', 'RT', 3.2, -0.4, 'GAP_ZONE', 'B_RIGHT', 'LDE', null, 'OUTSIDE_IN'),
      makeAgent('TE', 'TE', -4.8, -0.4, 'GAP_ZONE', 'D_ALLEY', 'RDE', null, 'OUTSIDE_IN'),
      makeAgent('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'OUTSIDE_IN'),
      makeAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.5, y: 10.0 }]),
      makeAgent('SL', 'SL', -7.2, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN'),
      makeAgent('QB', 'QB', 0.0, -2.0, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 2.5, y: -4.2 }]),
      makeAgent('RB', 'RB', 0.0, -5.2, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: -3.8, y: -1.5 },
        { x: -6.2, y: 2.5 },
        { x: -7.5, y: 14.0 },
      ]),
    ];
  }

  if (scheme === 'RUN_PIN_PULL') {
    return [
      makeAgent('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'),
      makeAgent('LG', 'LG', -1.6, -0.3, 'PULL_LEAD', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN', [
        { x: 1.0, y: -1.4 },
        { x: 6.2, y: -0.8 },
        { x: 8.2, y: 3.5 },
      ]),
      makeAgent('C', 'C', 0.0, -0.2, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
        { x: 2.0, y: -1.2 },
        { x: 5.0, y: -0.5 },
        { x: 6.2, y: 3.0 },
      ]),
      makeAgent('RG', 'RG', 1.6, -0.3, 'MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT'),
      makeAgent('RT', 'RT', 3.2, -0.4, 'MAN_BLOCK', 'B_RIGHT', 'LDE', null, 'INSIDE_OUT'),
      makeAgent('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
      makeAgent('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.0, y: 10.0 }]),
      makeAgent('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
      makeAgent('SL', 'SL', 7.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'INSIDE_OUT'),
      makeAgent('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: -4.8 }]),
      makeAgent('RB', 'RB', 1.2, -4.6, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 5.2, y: -1.4 },
        { x: 7.5, y: 2.8 },
        { x: 8.8, y: 14.0 },
      ]),
    ];
  }

  if (scheme === 'PASS_QUICK_SLANT') {
    return [
      makeAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
      makeAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
      makeAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'JUMP_SET', null, null, 'NEUTRAL'),
      makeAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
      makeAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
      makeAgent('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 5.2, y: 4.5 },
        { x: 9.0, y: 5.0 },
      ], 3),
      makeAgent('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -14.2, y: 3.2 },
        { x: -7.5, y: 7.0 },
      ], 1),
      makeAgent('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -10.5, y: 2.5 },
        { x: -14.5, y: 4.0 },
      ], 2),
      makeAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.2, y: 3.2 },
        { x: 8.0, y: 7.0 },
      ], 2),
      makeAgent('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -5.2 }]),
      makeAgent('RB', 'RB', -1.5, -4.5, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [
        { x: -5.0, y: 1.5 },
      ], 4),
    ];
  }

  if (scheme === 'PASS_MESH') {
    return [
      makeAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
      makeAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
      makeAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
      makeAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
      makeAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
      makeAgent('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 2.0, y: 4.2 },
        { x: -8.5, y: 4.8 },
      ], 2),
      makeAgent('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -14.5, y: 10.0 },
        { x: -7.5, y: 10.0 },
      ], 3),
      makeAgent('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -2.0, y: 3.8 },
        { x: 9.0, y: 4.5 },
      ], 1),
      makeAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.5, y: 12.0 },
        { x: 18.5, y: 15.5 },
      ], 3),
      makeAgent('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.0 }]),
      makeAgent('RB', 'RB', 1.5, -4.6, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 8.5, y: -1.0 },
        { x: 12.5, y: 8.0 },
      ], 4),
    ];
  }

  if (scheme === 'PASS_FOUR_VERTS') {
    return [
      makeAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
      makeAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
      makeAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
      makeAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
      makeAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
      makeAgent('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 4.8, y: 10.0 },
        { x: 2.0, y: 18.0 },
      ], 2),
      makeAgent('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -14.5, y: 18.5 },
      ], 1),
      makeAgent('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -7.0, y: 17.5 },
      ], 2),
      makeAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.5, y: 18.5 },
      ], 3),
      makeAgent('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.5 }]),
      makeAgent('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [
        { x: 0.0, y: 3.2 },
      ], 4),
    ];
  }

  // Default: Pass Half-Slide or Chip Flood
  const isChip = scheme === 'PASS_CHIP_FLOOD';
  return [
    makeAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
    makeAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
    makeAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
    makeAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
    makeAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
    makeAgent(
      'TE',
      'TE',
      4.8,
      -0.4,
      isChip ? 'CHIP_RELEASE' : 'PASS_SET',
      'C_RIGHT',
      null,
      null,
      'OUTSIDE_IN',
      [
        { x: 5.5, y: 4.0 },
        { x: 12.5, y: 5.5 },
      ],
      3
    ),
    makeAgent('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
      { x: -14.5, y: 11.0 },
      { x: -6.0, y: 11.0 },
    ], 1),
    makeAgent('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
      { x: -7.5, y: 16.0 },
    ], 2),
    makeAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
      { x: 14.5, y: 14.0 },
      { x: 19.0, y: 17.0 },
    ], 2),
    makeAgent('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
      { x: 0.0, y: -6.2 },
    ]),
    makeAgent('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [
      { x: -4.0, y: 2.0 },
    ], 4),
  ];
}

function createDefenseFront(call: string): SimAgent[] {
  const def = (
    id: string,
    pos: string,
    x: number,
    y: number,
    role: any,
    targetX: number,
    targetY: number,
    manTargetId?: string,
    ratings = { speed: 84, accel: 86, power: 86, finesse: 85, awareness: 85 }
  ): SimAgent => ({
    id,
    label: pos,
    side: 'DEF',
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
    ratings,
    assignment: {
      role: 'MAN_BLOCK',
      primaryTargetId: null,
      secondaryTargetId: null,
      gapOrSet: 'VERTICAL_DEEP',
      leverage: 'NEUTRAL',
      climbOrChipDelaySec: 0,
      waypoints: [],
    },
    defAssignment: { role, targetX, targetY, manTargetId },
  });

  switch (call) {
    case 'NICKEL_UNDER_C1':
      return [
        def('LDE', 'DE', -4.4, 0.6, 'CONTAIN_EDGE', -3.8, -5.0),
        def('3T', 'DT', -2.1, 0.5, 'RUSH_GAP', -1.8, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 85, awareness: 85 }),
        def('NT', 'NT', 0.8, 0.5, 'RUSH_GAP', 0.5, -4.0, undefined, { speed: 72, accel: 80, power: 92, finesse: 78, awareness: 85 }),
        def('RDE', 'EDGE', 5.2, 0.6, 'BLITZ_EDGE', 4.0, -5.0, undefined, { speed: 87, accel: 88, power: 84, finesse: 89, awareness: 86 }),
        def('WILL', 'WILL', -1.2, 4.2, 'HOOK_CURL', -1.5, 3.5),
        def('MIKE', 'MIKE', 2.2, 4.2, 'HOOK_CURL', 2.0, 3.5),
        def('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL', { speed: 91, accel: 90, power: 68, finesse: 82, awareness: 88 }),
        def('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 93, accel: 92, power: 65, finesse: 85, awareness: 88 }),
        def('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, accel: 91, power: 65, finesse: 85, awareness: 88 }),
        def('SS', 'SS', 0.0, 6.0, 'ROBBER', 0.0, 6.5, undefined, { speed: 88, accel: 88, power: 78, finesse: 80, awareness: 90 }),
        def('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0, undefined, { speed: 91, accel: 89, power: 68, finesse: 82, awareness: 89 }),
      ];

    case 'BASE_34_BEAR_C4':
      return [
        def('LOLB', 'EDGE', -5.0, 0.6, 'CONTAIN_EDGE', -4.2, -5.0, undefined, { speed: 85, accel: 87, power: 84, finesse: 88, awareness: 85 }),
        def('4i_L', 'DE', -2.2, 0.5, 'RUSH_GAP', -1.9, -4.0, undefined, { speed: 75, accel: 80, power: 90, finesse: 82, awareness: 85 }),
        def('0T_NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 70, accel: 76, power: 94, finesse: 74, awareness: 86 }),
        def('4i_R', 'DE', 2.2, 0.5, 'RUSH_GAP', 1.9, -4.0, undefined, { speed: 75, accel: 80, power: 90, finesse: 82, awareness: 85 }),
        def('ROLB', 'EDGE', 5.4, 0.6, 'CONTAIN_EDGE', 4.5, -5.0, undefined, { speed: 86, accel: 88, power: 84, finesse: 88, awareness: 85 }),
        def('WILL', 'ILB', -1.2, 4.5, 'HOOK_CURL', -1.5, 3.8),
        def('MIKE', 'ILB', 1.2, 4.5, 'HOOK_CURL', 1.5, 3.8),
        def('CB1', 'CB', -14.0, 7.0, 'QUARTERS_MATCH', -14.0, 15.0, undefined, { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
        def('CB2', 'CB', 14.0, 7.0, 'QUARTERS_MATCH', 14.0, 15.0, undefined, { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
        def('FS', 'FS', -5.0, 10.5, 'QUARTERS_MATCH', -6.0, 16.0, undefined, { speed: 90, accel: 88, power: 70, finesse: 80, awareness: 88 }),
        def('SS', 'SS', 5.0, 10.5, 'QUARTERS_MATCH', 6.0, 16.0, undefined, { speed: 89, accel: 87, power: 74, finesse: 80, awareness: 88 }),
      ];

    case 'DIME_MUG_C0':
      return [
        def('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0),
        def('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 74, accel: 82, power: 91, finesse: 80, awareness: 85 }),
        def('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0),
        def('WILL', 'WILL', -0.8, 1.1, 'BLITZ_A', -0.5, -4.5, undefined, { speed: 88, accel: 90, power: 82, finesse: 84, awareness: 86 }),
        def('MIKE', 'MIKE', 0.8, 1.1, 'BLITZ_A', 0.5, -4.5, undefined, { speed: 88, accel: 90, power: 84, finesse: 84, awareness: 86 }),
        def('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL', { speed: 91, accel: 90, power: 68, finesse: 82, awareness: 88 }),
        def('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 93, accel: 92, power: 65, finesse: 85, awareness: 88 }),
        def('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, accel: 91, power: 65, finesse: 85, awareness: 88 }),
        def('SS', 'SS', 5.8, 2.8, 'MAN_COV', 5.0, 1.5, 'TE', { speed: 89, accel: 88, power: 78, finesse: 80, awareness: 88 }),
        def('FS', 'FS', -2.5, 3.2, 'MAN_COV', -2.0, 1.5, 'RB', { speed: 91, accel: 89, power: 68, finesse: 82, awareness: 89 }),
        def('DIME', 'DB', 5.2, 4.0, 'BLITZ_EDGE', 4.5, -5.0, undefined, { speed: 90, accel: 90, power: 72, finesse: 80, awareness: 86 }),
      ];

    case 'NICKEL_SIM_C2':
      return [
        def('LDE', 'DE', -4.2, 0.6, 'CURL_FLAT', -5.5, 3.8, undefined, { speed: 80, accel: 82, power: 85, finesse: 82, awareness: 85 }),
        def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 72, accel: 80, power: 92, finesse: 76, awareness: 85 }),
        def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 84, awareness: 85 }),
        def('RDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0, undefined, { speed: 86, accel: 88, power: 85, finesse: 88, awareness: 86 }),
        def('NCB', 'NI', -6.8, 2.5, 'BLITZ_EDGE', -3.5, -4.5, undefined, { speed: 91, accel: 92, power: 70, finesse: 82, awareness: 88 }),
        def('WILL', 'WILL', -2.5, 4.2, 'HOOK_CURL', -3.0, 4.0),
        def('MIKE', 'MIKE', 0.0, 4.2, 'HOOK_CURL', 0.0, 11.0, undefined, { speed: 87, accel: 88, power: 84, finesse: 82, awareness: 90 }),
        def('CB1', 'CB', -14.2, 4.5, 'CURL_FLAT', -13.5, 4.5, undefined, { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
        def('CB2', 'CB', 14.2, 4.5, 'CURL_FLAT', 13.5, 4.5, undefined, { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
        def('FS', 'FS', -7.5, 12.5, 'DEEP_HALF', -8.5, 17.0, undefined, { speed: 91, accel: 89, power: 68, finesse: 82, awareness: 89 }),
        def('SS', 'SS', 7.5, 12.5, 'DEEP_HALF', 8.5, 17.0, undefined, { speed: 89, accel: 87, power: 76, finesse: 80, awareness: 89 }),
      ];

    case 'NICKEL_OVER_C3':
    default:
      return [
        def('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
        def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 72, accel: 80, power: 92, finesse: 76, awareness: 85 }),
        def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 84, awareness: 85 }),
        def('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
        def('WILL', 'WILL', -2.2, 4.2, 'HOOK_CURL', -2.5, 3.5),
        def('MIKE', 'MIKE', 1.2, 4.2, 'HOOK_CURL', 1.5, 3.5),
        def('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -7.5, 4.8),
        def('CB1', 'CB', -14.2, 6.0, 'DEEP_THIRD', -14.0, 16.0),
        def('CB2', 'CB', 14.2, 6.0, 'DEEP_THIRD', 14.0, 16.0),
        def('SS', 'SS', 5.8, 5.0, 'CURL_FLAT', 7.5, 4.8),
        def('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
      ];
  }
}

async function runMassivePlaytest() {
  console.log('========================================================================================');
  console.log('MASSIVE IN-DEPTH 50-CELL ALL-22 CHESS PLAYTEST & KINEMATIC INTEGRITY AUDIT');
  console.log('Evaluating 10 Offensive Concepts x 5 Defensive Fronts (N=50 Snaps/Cell = 2,500 Snaps)');
  console.log('========================================================================================\n');

  const passConcepts: Array<{ id: string; scheme: Parameters<typeof createStandardOffense>[0] }> = [
    { id: 'DAGGER', scheme: 'PASS_HALF_SLIDE' },
    { id: 'PA_FLOOD', scheme: 'PASS_CHIP_FLOOD' },
    { id: 'QUICK_SLANT', scheme: 'PASS_QUICK_SLANT' },
    { id: 'MESH', scheme: 'PASS_MESH' },
    { id: 'FOUR_VERTS', scheme: 'PASS_FOUR_VERTS' },
  ];

  const runConcepts: Array<{ id: string; scheme: Parameters<typeof createStandardOffense>[0] }> = [
    { id: 'DUO', scheme: 'RUN_DUO_COMBO' },
    { id: 'POWER_O', scheme: 'RUN_POWER_PULL' },
    { id: 'INSIDE_ZONE', scheme: 'RUN_INSIDE_ZONE' },
    { id: 'OUTSIDE_ZONE', scheme: 'RUN_OUTSIDE_ZONE' },
    { id: 'PIN_PULL', scheme: 'RUN_PIN_PULL' },
  ];

  const defFronts = [
    'NICKEL_OVER_C3',
    'NICKEL_UNDER_C1',
    'BASE_34_BEAR_C4',
    'DIME_MUG_C0',
    'NICKEL_SIM_C2',
  ];

  const results: PlayMetrics[] = [];
  let totalAnomalies = 0;
  let totalOverlapViolations = 0;
  let totalGForceViolations = 0;
  let maxGlobalGs = 0;

  const N_RUNS = 50;

  for (const pc of passConcepts) {
    for (const df of defFronts) {
      let sumEpa = 0;
      let sumYds = 0;
      let completions = 0;
      let sacks = 0;
      let pressures = 0;
      let sumTtt = 0;
      let successes = 0;
      let turnaways = 0;
      let maxGs = 0;
      let cellOverlap = 0;
      let cellGs = 0;
      let cellFrozen = 0;
      let epaList: number[] = [];

      for (let r = 0; r < N_RUNS; r++) {
        const off = createStandardOffense(pc.scheme);
        const def = createDefenseFront(df);
        const agents = [...off, ...def];

        const traj = engine.simulatePlay(agents, 1.0);
        const term = traj.find((s) => s.playOver) || traj[traj.length - 1];

        sumEpa += term.expectedEpa;
        epaList.push(term.expectedEpa);
        const yds = term.carrierTackledYards ?? 0;
        sumYds += yds;

        if (
          term.terminationReason === 'COMPLETE' ||
          term.terminationReason === 'TOUCHDOWN' ||
          (term.ball?.state === 'CAUGHT' && term.terminationReason !== 'SACK')
        ) {
          completions++;
        }
        if (term.terminationReason === 'SACK') {
          sacks++;
        }
        if (term.terminationReason === 'INCOMPLETE' || term.terminationReason === 'INTERCEPTION') {
          turnaways++;
        }

        const minPocket = Math.min(...traj.map((s) => s.pocketIntegrity));
        if (minPocket < 45 || term.terminationReason === 'SACK') {
          pressures++;
        }

        sumTtt += term.timeToThrowOrGapSec ?? term.timeSec;

        const isSuccess =
          term.terminationReason !== 'SACK' &&
          term.terminationReason !== 'INCOMPLETE' &&
          term.terminationReason !== 'INTERCEPTION' &&
          term.terminationReason !== 'FUMBLE_LOST' &&
          (term.expectedEpa > 0 || yds >= 4.5);
        if (isSuccess) successes++;

        // Audit micro-kinematics per active tick (before play is whistled dead)
        for (let t = 1; t < traj.length; t++) {
          const prev = traj[t - 1];
          if (prev.playOver) break; // Play already whistled dead; subsequent ticks are static terminal freeze
          const curr = traj[t];
          const dt = 0.05;

          for (let i = 0; i < curr.agents.length; i++) {
            const aCurr = curr.agents[i];
            const aPrev = prev.agents.find((p) => p.id === aCurr.id);
            if (!aPrev) continue;

            const dvx = aCurr.vx - aPrev.vx;
            const dvy = aCurr.vy - aPrev.vy;
            const acc = Math.hypot(dvx, dvy) / dt;
            const gs = acc / 10.72; // 1 G = ~10.72 yd/s^2 (9.81 m/s^2)
            if (gs > maxGs) maxGs = gs;
            if (gs > maxGlobalGs) maxGlobalGs = gs;

            // In open field (unengaged, non-tackle contact), cleat-turf steering traction limit is 1.60 Gs
            const isOpenField = !aCurr.engagedWithId && !aPrev.engagedWithId;
            if (isOpenField && gs > 1.60) {
              cellGs++;
              totalGForceViolations++;
            }

            // Check overlap with other active agents: real pads have radius ~0.35-0.45y, <0.20y is clipping
            for (let j = i + 1; j < curr.agents.length; j++) {
              const bCurr = curr.agents[j];
              const dist = Math.hypot(aCurr.x - bCurr.x, aCurr.y - bCurr.y);
              if (dist < 0.20) {
                cellOverlap++;
                totalOverlapViolations++;
              }
            }
          }
        }
      }

      epaList.sort((a, b) => a - b);
      const medianEpa = epaList[Math.floor(epaList.length / 2)];

      results.push({
        playId: pc.id,
        category: 'PASS',
        defFront: df,
        runs: N_RUNS,
        meanEpa: +(sumEpa / N_RUNS).toFixed(2),
        medianEpa: +medianEpa.toFixed(2),
        successRate: +((successes / N_RUNS) * 100).toFixed(1),
        meanYards: +(sumYds / N_RUNS).toFixed(1),
        completionRate: +((completions / N_RUNS) * 100).toFixed(1),
        sackRate: +((sacks / N_RUNS) * 100).toFixed(1),
        pressureRate: +((pressures / N_RUNS) * 100).toFixed(1),
        meanTimeToThrow: +(sumTtt / N_RUNS).toFixed(2),
        maxGsObserved: +maxGs.toFixed(2),
        gForceViolationsCount: cellGs,
        playerOverlapViolationsCount: cellOverlap,
        frozenScrumViolationsCount: cellFrozen,
        crossoverXBlockCount: 0,
      });
    }
  }

  for (const rc of runConcepts) {
    for (const df of defFronts) {
      let sumEpa = 0;
      let sumYds = 0;
      let stuffs = 0;
      let explosives = 0;
      let successes = 0;
      let brokenTackles = 0;
      let sumTrench = 0;
      let maxGs = 0;
      let cellOverlap = 0;
      let cellGs = 0;
      let cellFrozen = 0;
      let epaList: number[] = [];

      for (let r = 0; r < N_RUNS; r++) {
        const off = createStandardOffense(rc.scheme);
        const def = createDefenseFront(df);
        const agents = [...off, ...def];

        const traj = engine.simulatePlay(agents, 1.0);
        const term = traj.find((s) => s.playOver) || traj[traj.length - 1];

        sumEpa += term.expectedEpa;
        epaList.push(term.expectedEpa);
        const yds = term.carrierTackledYards ?? 0;
        sumYds += yds;
        sumTrench += term.trenchNetYards;

        if (yds <= 0.0) stuffs++;
        if (yds >= 10.0) explosives++;

        const isSuccess = term.expectedEpa > 0 || yds >= 4.0;
        if (isSuccess) successes++;

        // Count broken tackles
        const bc = agents.find((a) => a.assignment.role === 'BALL_CARRIER');
        if (bc && (bc.tackleContactTicks === 0 && yds > 3.0)) {
          brokenTackles++;
        }

        // Audit micro-kinematics per active tick (before play is whistled dead)
        for (let t = 1; t < traj.length; t++) {
          const prev = traj[t - 1];
          if (prev.playOver) break; // Play already whistled dead
          const curr = traj[t];
          const dt = 0.05;

          for (let i = 0; i < curr.agents.length; i++) {
            const aCurr = curr.agents[i];
            const aPrev = prev.agents.find((p) => p.id === aCurr.id);
            if (!aPrev) continue;

            const dvx = aCurr.vx - aPrev.vx;
            const dvy = aCurr.vy - aPrev.vy;
            const acc = Math.hypot(dvx, dvy) / dt;
            const gs = acc / 10.72;
            if (gs > maxGs) maxGs = gs;
            if (gs > maxGlobalGs) maxGlobalGs = gs;

            // In open field (unengaged, non-tackle contact), cleat-turf steering traction limit is 1.60 Gs
            const isOpenField = !aCurr.engagedWithId && !aPrev.engagedWithId;
            if (isOpenField && gs > 1.60) {
              cellGs++;
              totalGForceViolations++;
            }

            for (let j = i + 1; j < curr.agents.length; j++) {
              const bCurr = curr.agents[j];
              const dist = Math.hypot(aCurr.x - bCurr.x, aCurr.y - bCurr.y);
              if (dist < 0.20) {
                cellOverlap++;
                totalOverlapViolations++;
              }
            }
          }
        }
      }

      epaList.sort((a, b) => a - b);
      const medianEpa = epaList[Math.floor(epaList.length / 2)];

      results.push({
        playId: rc.id,
        category: 'RUN',
        defFront: df,
        runs: N_RUNS,
        meanEpa: +(sumEpa / N_RUNS).toFixed(2),
        medianEpa: +medianEpa.toFixed(2),
        successRate: +((successes / N_RUNS) * 100).toFixed(1),
        meanYards: +(sumYds / N_RUNS).toFixed(2),
        stuffRate: +((stuffs / N_RUNS) * 100).toFixed(1),
        explosiveRate: +((explosives / N_RUNS) * 100).toFixed(1),
        meanTrenchYards: +(sumTrench / N_RUNS).toFixed(2),
        maxGsObserved: +maxGs.toFixed(2),
        gForceViolationsCount: cellGs,
        playerOverlapViolationsCount: cellOverlap,
        frozenScrumViolationsCount: cellFrozen,
        crossoverXBlockCount: 0,
      });
    }
  }

  console.log('--- 1. PASSING PLAYS AUDIT MATRIX (25 CELLS, N=1,250 SNAPS) ---');
  console.log('Concept       Defense Front       Press%   Sack%   Comp%   Mean TTT   Mean Yds   EPA (Mean/Med)  SR%   Max Gs');
  console.log('-------------------------------------------------------------------------------------------------------------');
  for (const r of results.filter((x) => x.category === 'PASS')) {
    console.log(
      `${r.playId.padEnd(14)} ${r.defFront.padEnd(19)} ${String(r.pressureRate + '%').padEnd(8)} ${String(r.sackRate + '%').padEnd(7)} ${String(r.completionRate + '%').padEnd(7)} ${(r.meanTimeToThrow + 's').padEnd(10)} ${(r.meanYards + 'y').padEnd(10)} ${(r.meanEpa + ' / ' + r.medianEpa).padEnd(15)} ${(r.successRate + '%').padEnd(6)} ${r.maxGsObserved}G`
    );
  }

  console.log('\n--- 2. RUSHING PLAYS AUDIT MATRIX (25 CELLS, N=1,250 SNAPS) ---');
  console.log('Concept       Defense Front       YPC     Stuff%   Explosive%  Trench Lev   EPA (Mean/Med)  SR%   Max Gs');
  console.log('-------------------------------------------------------------------------------------------------------------');
  for (const r of results.filter((x) => x.category === 'RUN')) {
    console.log(
      `${r.playId.padEnd(14)} ${r.defFront.padEnd(19)} ${(r.meanYards + 'y').padEnd(7)} ${String(r.stuffRate + '%').padEnd(8)} ${String(r.explosiveRate + '%').padEnd(11)} ${(r.meanTrenchYards + 'y').padEnd(12)} ${(r.meanEpa + ' / ' + r.medianEpa).padEnd(15)} ${(r.successRate + '%').padEnd(6)} ${r.maxGsObserved}G`
    );
  }

  // Aggregate stats
  const passResults = results.filter((x) => x.category === 'PASS');
  const runResults = results.filter((x) => x.category === 'RUN');

  const avgPassPress = +(passResults.reduce((a, b) => a + (b.pressureRate || 0), 0) / passResults.length).toFixed(1);
  const avgPassSack = +(passResults.reduce((a, b) => a + (b.sackRate || 0), 0) / passResults.length).toFixed(1);
  const avgPassComp = +(passResults.reduce((a, b) => a + (b.completionRate || 0), 0) / passResults.length).toFixed(1);
  const avgPassEpa = +(passResults.reduce((a, b) => a + b.meanEpa, 0) / passResults.length).toFixed(2);
  const avgPassSr = +(passResults.reduce((a, b) => a + b.successRate, 0) / passResults.length).toFixed(1);

  const avgRunYpc = +(runResults.reduce((a, b) => a + b.meanYards, 0) / runResults.length).toFixed(2);
  const avgRunStuff = +(runResults.reduce((a, b) => a + (b.stuffRate || 0), 0) / runResults.length).toFixed(1);
  const avgRunExp = +(runResults.reduce((a, b) => a + (b.explosiveRate || 0), 0) / runResults.length).toFixed(1);
  const avgRunEpa = +(runResults.reduce((a, b) => a + b.meanEpa, 0) / runResults.length).toFixed(2);
  const avgRunSr = +(runResults.reduce((a, b) => a + b.successRate, 0) / runResults.length).toFixed(1);

  console.log('\n========================================================================================');
  console.log('MASSIVE PLAYTEST AGGREGATE SUMMARY:');
  console.log(`- PASSING (N=1,250): Pressure=${avgPassPress}% (target 28-38%), Sack=${avgPassSack}% (target 5-8.5%), Comp=${avgPassComp}% (target 64-67%), EPA=${avgPassEpa} (target +0.02 to +0.18), SR=${avgPassSr}% (target 44-50%)`);
  console.log(`- RUSHING (N=1,250): YPC=${avgRunYpc}y (target 4.1-4.55y), Stuff=${avgRunStuff}% (target 17-22%), Explosive=${avgRunExp}% (target 9.5-13.5%), EPA=${avgRunEpa} (target -0.09 to -0.01), SR=${avgRunSr}% (target 39-45%)`);
  console.log(`- KINEMATIC INTEGRITY: Peak G-Force=${maxGlobalGs.toFixed(2)}G (limit <=1.60G), Overlap Violations (<0.20y)=${totalOverlapViolations}, G-Force Violations (>1.60G)=${totalGForceViolations}`);
  console.log('========================================================================================\n');
}

runMassivePlaytest().catch(console.error);
