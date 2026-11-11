import * as fs from 'fs';
import * as path from 'path';
import {
  All22KinematicEngine,
  SimAgent,
  SimFieldContext,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
  Waypoint2D,
} from './engine';
import {
  HYDRA_2027_PLAYBOOK,
  HYDRA_ACTIVE_11_CAP_M,
  MODERN_2027_DEF_FRONTS,
  ModernDefFrontId,
  buildModern2027Defense,
} from './vanguard_2027_playbook';
import {
  ARGON_2027_PLAYBOOK,
  ARGON_2027_ROSTER,
  ARGON_ACTIVE_11_CAP_M,
} from './argon_2027_playbook';

// ============================================================================
// BASELINE OFFENSIVE ROSTER PROFILES & CANONICAL PLAYBOOKS FOR 5-WAY BENCHMARK
// ============================================================================
interface BaselineRosterProfile {
  id: string;
  name: string;
  offCapM: number;
  defReinvestedBonusPts: number;
  ol: { speed: number; accel: number; power: number; finesse: number; awareness: number };
  qb: { speed: number; accel: number; power: number; finesse: number; awareness: number };
  rb: { speed: number; accel: number; power: number; finesse: number; awareness: number };
  wr1: { speed: number; accel: number; power: number; finesse: number; awareness: number };
  wr2: { speed: number; accel: number; power: number; finesse: number; awareness: number };
  sl: { speed: number; accel: number; power: number; finesse: number; awareness: number };
  te: { speed: number; accel: number; power: number; finesse: number; awareness: number };
  openFieldPlays: CanonicalPlayId[];
  thirdLongPlays: CanonicalPlayId[];
  shortYardagePlays: CanonicalPlayId[];
  twoMinPlays: CanonicalPlayId[];
  fourMinPlays: CanonicalPlayId[];
  goalLinePlays: CanonicalPlayId[];
}

type CanonicalPlayId =
  | 'DAGGER'
  | 'PA_FLOOD'
  | 'PA_UC_BOOT'
  | 'QUICK_SLANT'
  | 'MESH'
  | 'FOUR_VERTS'
  | 'DUO'
  | 'POWER_O'
  | 'INSIDE_ZONE'
  | 'OUTSIDE_ZONE'
  | 'PIN_PULL';

const BASELINE_PHILOSOPHIES: BaselineRosterProfile[] = [
  {
    id: 'CONV_11_SPREAD',
    name: 'Conventional 11-Pers Dropback Spread ($138.5M Cap)',
    offCapM: 138.5,
    defReinvestedBonusPts: 0.4,
    ol: { speed: 74, accel: 80, power: 85, finesse: 85, awareness: 85 },
    qb: { speed: 76, accel: 80, power: 74, finesse: 88, awareness: 87 },
    rb: { speed: 89, accel: 90, power: 80, finesse: 84, awareness: 83 },
    wr1: { speed: 91, accel: 91, power: 68, finesse: 89, awareness: 88 },
    wr2: { speed: 90, accel: 90, power: 66, finesse: 86, awareness: 85 },
    sl: { speed: 89, accel: 90, power: 64, finesse: 86, awareness: 85 },
    te: { speed: 83, accel: 85, power: 78, finesse: 83, awareness: 84 },
    openFieldPlays: ['DAGGER', 'QUICK_SLANT', 'MESH', 'FOUR_VERTS', 'PA_FLOOD', 'INSIDE_ZONE', 'OUTSIDE_ZONE'],
    thirdLongPlays: ['DAGGER', 'FOUR_VERTS', 'MESH'],
    shortYardagePlays: ['INSIDE_ZONE', 'QUICK_SLANT', 'DUO'],
    twoMinPlays: ['DAGGER', 'FOUR_VERTS', 'QUICK_SLANT', 'MESH'],
    fourMinPlays: ['INSIDE_ZONE', 'OUTSIDE_ZONE', 'DUO'],
    goalLinePlays: ['INSIDE_ZONE', 'QUICK_SLANT', 'MESH', 'PA_FLOOD'],
  },
  {
    id: 'SHANAHAN_12_PA',
    name: 'Shanahan/McVay 12-Pers Play-Action ($146.0M Cap)',
    offCapM: 146.0,
    defReinvestedBonusPts: 0.0,
    ol: { speed: 77, accel: 83, power: 86, finesse: 88, awareness: 87 },
    qb: { speed: 78, accel: 82, power: 75, finesse: 87, awareness: 88 },
    rb: { speed: 91, accel: 92, power: 83, finesse: 88, awareness: 87 },
    wr1: { speed: 91, accel: 91, power: 74, finesse: 90, awareness: 89 },
    wr2: { speed: 88, accel: 88, power: 72, finesse: 85, awareness: 85 },
    sl: { speed: 84, accel: 85, power: 82, finesse: 83, awareness: 85 },
    te: { speed: 85, accel: 86, power: 84, finesse: 86, awareness: 87 },
    openFieldPlays: ['PA_UC_BOOT', 'PA_FLOOD', 'OUTSIDE_ZONE', 'DUO', 'PIN_PULL', 'DAGGER', 'QUICK_SLANT'],
    thirdLongPlays: ['DAGGER', 'PA_FLOOD', 'MESH'],
    shortYardagePlays: ['DUO', 'PIN_PULL', 'POWER_O', 'PA_UC_BOOT'],
    twoMinPlays: ['DAGGER', 'PA_FLOOD', 'QUICK_SLANT', 'FOUR_VERTS'],
    fourMinPlays: ['OUTSIDE_ZONE', 'DUO', 'PIN_PULL'],
    goalLinePlays: ['POWER_O', 'DUO', 'PA_FLOOD', 'QUICK_SLANT'],
  },
  {
    id: 'SUPERMAX_STARS',
    name: 'Top-Heavy Supermax Stars / Cap-Starved OL ($172.0M Cap)',
    offCapM: 172.0,
    defReinvestedBonusPts: -2.1,
    ol: { speed: 71, accel: 76, power: 79, finesse: 78, awareness: 79 },
    qb: { speed: 79, accel: 82, power: 76, finesse: 92, awareness: 91 },
    rb: { speed: 90, accel: 91, power: 82, finesse: 87, awareness: 85 },
    wr1: { speed: 95, accel: 95, power: 70, finesse: 94, awareness: 92 },
    wr2: { speed: 93, accel: 92, power: 68, finesse: 91, awareness: 89 },
    sl: { speed: 90, accel: 91, power: 64, finesse: 87, awareness: 86 },
    te: { speed: 87, accel: 88, power: 73, finesse: 89, awareness: 87 },
    openFieldPlays: ['FOUR_VERTS', 'DAGGER', 'QUICK_SLANT', 'MESH', 'PA_FLOOD', 'INSIDE_ZONE', 'OUTSIDE_ZONE'],
    thirdLongPlays: ['FOUR_VERTS', 'DAGGER', 'MESH'],
    shortYardagePlays: ['QUICK_SLANT', 'INSIDE_ZONE', 'MESH'],
    twoMinPlays: ['FOUR_VERTS', 'DAGGER', 'QUICK_SLANT', 'MESH'],
    fourMinPlays: ['INSIDE_ZONE', 'OUTSIDE_ZONE'],
    goalLinePlays: ['QUICK_SLANT', 'MESH', 'INSIDE_ZONE', 'PA_FLOOD'],
  },
];

function buildBaselinePlay(
  profile: BaselineRosterProfile,
  scheme: CanonicalPlayId
): SimAgent[] {
  const mk = (
    id: string,
    pos: string,
    rat: SimAgent['ratings'],
    x: number,
    y: number,
    role: BlockRoleType,
    gapOrSet: GapOrSetCode,
    t1: string | null = null,
    t2: string | null = null,
    lev: LeverageBias = 'INSIDE_OUT',
    wps: Waypoint2D[] = [],
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
    ratings: { ...rat },
    assignment: {
      role,
      primaryTargetId: t1,
      secondaryTargetId: t2,
      gapOrSet,
      leverage: lev,
      climbOrChipDelaySec: 0.65,
      waypoints: wps.map((w) => ({ ...w })),
    },
  });

  switch (scheme) {
    case 'DUO':
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'NEUTRAL'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        mk('WR1', 'WR', profile.wr1, -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
        mk('SL', 'SL', profile.sl, -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN'),
        mk('QB', 'QB', profile.qb, 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.4, y: -4.8 }]),
        mk('RB', 'RB', profile.rb, -1.2, -4.8, 'BALL_CARRIER', 'B_RIGHT', null, null, 'NEUTRAL', [
          { x: 0.8, y: -1.5 },
          { x: 2.1, y: 3.5 },
          { x: 2.4, y: 14.0 },
        ]),
      ];

    case 'POWER_O':
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
          { x: -0.5, y: -1.4 },
          { x: 2.8, y: -1.1 },
          { x: 3.4, y: 3.8 },
        ]),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'MAN_BLOCK', 'A_LEFT', 'NT', null, 'OUTSIDE_IN'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
          { x: 4.2, y: 0.4 },
          { x: 4.9, y: 1.4 },
        ]),
        mk('WR1', 'WR', profile.wr1, -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.0, y: 12.0 }]),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
        mk('SL', 'FB', profile.sl, 0.0, -3.2, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
          { x: 3.6, y: -0.5 },
          { x: 4.5, y: 1.2 },
        ]),
        mk('QB', 'QB', profile.qb, 0.0, -1.8, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: -3.5 }]),
        mk('RB', 'RB', profile.rb, 0.0, -5.2, 'BALL_CARRIER', 'C_RIGHT', null, null, 'NEUTRAL', [
          { x: 2.8, y: -1.0 },
          { x: 3.5, y: 5.5 },
          { x: 4.2, y: 15.0 },
        ]),
      ];

    case 'INSIDE_ZONE':
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'OUTSIDE_IN'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'NEUTRAL'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'GAP_ZONE', 'D_ALLEY', 'LDE', null, 'INSIDE_OUT'),
        mk('WR1', 'WR', profile.wr1, -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
        mk('SL', 'SL', profile.sl, -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN'),
        mk('QB', 'QB', profile.qb, 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -0.5, y: -5.0 }]),
        mk('RB', 'RB', profile.rb, -1.5, -4.8, 'BALL_CARRIER', 'A_RIGHT', null, null, 'NEUTRAL', [
          { x: 0.4, y: -1.2 },
          { x: 0.9, y: 3.5 },
          { x: 1.2, y: 14.0 },
        ]),
      ];

    case 'OUTSIDE_ZONE':
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'GAP_ZONE', 'C_LEFT', 'RDE', null, 'OUTSIDE_IN'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'COMBO_CLIMB', 'B_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', '3T', 'MIKE', 'OUTSIDE_IN'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'LDE', null, 'OUTSIDE_IN'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        mk('WR1', 'WR', profile.wr1, -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
        mk('SL', 'SL', profile.sl, -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN'),
        mk('QB', 'QB', profile.qb, 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -4.8 }]),
        mk('RB', 'RB', profile.rb, -1.5, -4.8, 'BALL_CARRIER', 'C_LEFT', null, null, 'NEUTRAL', [
          { x: -3.5, y: -1.2 },
          { x: -5.2, y: 2.5 },
          { x: -6.5, y: 14.0 },
        ]),
      ];

    case 'PIN_PULL':
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
          { x: 1.0, y: -1.2 },
          { x: 4.8, y: -0.5 },
          { x: 6.5, y: 3.0 },
        ]),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'MAN_BLOCK', 'A_LEFT', 'NT', null, 'OUTSIDE_IN'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'PULL_LEAD', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN', [
          { x: 3.5, y: -1.0 },
          { x: 6.8, y: -0.3 },
          { x: 8.2, y: 3.5 },
        ]),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'MAN_BLOCK', 'B_RIGHT', '3T', null, 'OUTSIDE_IN'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'OUTSIDE_IN'),
        mk('WR1', 'WR', profile.wr1, -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'OUTSIDE_IN'),
        mk('SL', 'SL', profile.sl, 7.2, -0.9, 'MAN_BLOCK', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN'),
        mk('QB', 'QB', profile.qb, 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.0, y: -5.0 }]),
        mk('RB', 'RB', profile.rb, 1.4, -4.6, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
          { x: 5.2, y: -1.5 },
          { x: 7.8, y: 2.2 },
          { x: 8.8, y: 14.0 },
        ]),
      ];

    case 'PA_FLOOD': {
      const qb = mk('QB', 'QB', profile.qb, 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 3.8, y: -5.6 },
      ]);
      qb.playAction = {
        enabled: true,
        meshDurationSec: 0.95,
        fakeCarrierId: 'RB',
        fakeGap: 'B_LEFT',
        isBootleg: true,
        bootDirection: 'RIGHT',
      };
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'PASS_SET', 'ANGLE_45', 'NT', null, 'INSIDE_OUT'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'PASS_SET', 'ANGLE_45', 'NT', 'WILL', 'NEUTRAL'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'PASS_SET', 'ANGLE_45', '3T', 'MIKE', 'INSIDE_OUT'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'CHIP_RELEASE', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
          { x: 9.5, y: 4.5 },
          { x: 14.5, y: 5.5 },
        ], 2),
        mk('WR1', 'WR', profile.wr1, -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -12.0, y: 10.0 },
          { x: -4.0, y: 14.0 },
        ], 3),
        mk('SL', 'SL', profile.sl, 8.2, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 11.5, y: 10.5 },
          { x: 17.5, y: 13.5 },
        ], 1),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 15.5, y: 19.5 },
        ], 3),
        qb,
        mk('RB', 'RB', profile.rb, -1.4, -4.6, 'MAX_PROTECT_SCAN', 'B_LEFT', 'WILL', 'RDE', 'INSIDE_OUT', [
          { x: -1.8, y: -1.5 },
        ], 4),
      ];
    }

    case 'PA_UC_BOOT': {
      const qb = mk('QB', 'QB', profile.qb, 0.0, -1.6, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -1.5, y: -3.2 },
        { x: 5.2, y: -5.4 },
      ]);
      qb.playAction = {
        enabled: true,
        meshDurationSec: 1.05,
        fakeCarrierId: 'RB',
        fakeGap: 'C_LEFT',
        isBootleg: true,
        bootDirection: 'RIGHT',
      };
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'GAP_ZONE', 'C_LEFT', 'RDE', null, 'OUTSIDE_IN'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'GAP_ZONE', 'B_LEFT', 'NT', null, 'OUTSIDE_IN'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'PASS_SET', 'ANGLE_45', 'NT', 'WILL', 'OUTSIDE_IN'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'PASS_SET', 'ANGLE_45', '3T', 'MIKE', 'OUTSIDE_IN'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'CHIP_RELEASE', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
          { x: 11.0, y: 3.8 },
          { x: 16.0, y: 5.0 },
        ], 2),
        mk('SL', 'TE', profile.sl, -4.8, -0.8, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 2.5, y: 8.5 },
          { x: 13.5, y: 11.5 },
        ], 1),
        mk('WR1', 'WR', profile.wr1, -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -12.0, y: 14.0 },
        ], 3),
        mk('WR2', 'WR', profile.wr2, 14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 15.0, y: 19.0 },
        ], 3),
        qb,
        mk('RB', 'RB', profile.rb, 0.0, -5.4, 'MAX_PROTECT_SCAN', 'C_LEFT', 'RDE', 'WILL', 'OUTSIDE_IN', [
          { x: -3.8, y: -1.2 },
        ], 4),
      ];
    }

    case 'QUICK_SLANT':
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'PASS_SET', 'JUMP_SET', 'RDE', null, 'INSIDE_OUT'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'PASS_SET', 'JUMP_SET', 'NT', null, 'INSIDE_OUT'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'PASS_SET', 'JUMP_SET', 'NT', null, 'NEUTRAL'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'PASS_SET', 'JUMP_SET', '3T', null, 'INSIDE_OUT'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'PASS_SET', 'JUMP_SET', 'LDE', null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 9.5, y: 3.5 },
          { x: 13.5, y: 4.5 },
        ], 3),
        mk('WR1', 'WR', profile.wr1, -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -14.2, y: 3.0 },
          { x: -7.5, y: 6.8 },
        ], 1),
        mk('SL', 'SL', profile.sl, -7.8, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -12.0, y: 3.2 },
          { x: -14.5, y: 4.0 },
        ], 2),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 14.2, y: 3.2 },
          { x: 8.0, y: 7.0 },
        ], 2),
        mk('QB', 'QB', profile.qb, 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -5.2 }]),
        mk('RB', 'RB', profile.rb, -1.5, -4.5, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [{ x: -5.0, y: 1.5 }], 4),
      ];

    case 'MESH':
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 2.0, y: 4.2 },
          { x: -8.5, y: 4.8 },
        ], 2),
        mk('WR1', 'WR', profile.wr1, -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -14.5, y: 10.0 },
          { x: -7.5, y: 10.0 },
        ], 3),
        mk('SL', 'SL', profile.sl, -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -2.0, y: 3.8 },
          { x: 9.0, y: 4.5 },
        ], 1),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 14.5, y: 12.0 },
          { x: 18.5, y: 15.5 },
        ], 3),
        mk('QB', 'QB', profile.qb, 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.0 }]),
        mk('RB', 'RB', profile.rb, 1.5, -4.6, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 8.5, y: -1.0 },
          { x: 12.5, y: 8.0 },
        ], 4),
      ];

    case 'FOUR_VERTS':
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 4.8, y: 10.0 },
          { x: 2.0, y: 18.0 },
        ], 2),
        mk('WR1', 'WR', profile.wr1, -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.5, y: 18.5 }], 1),
        mk('SL', 'SL', profile.sl, -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -7.0, y: 17.5 }], 2),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.5, y: 18.5 }], 3),
        mk('QB', 'QB', profile.qb, 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.5 }]),
        mk('RB', 'RB', profile.rb, -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [{ x: 0.0, y: 3.2 }], 4),
      ];

    case 'DAGGER':
    default:
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'PASS_SET', 'ANGLE_45', 'RDE', null, 'OUTSIDE_IN'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'PASS_SET', 'ANGLE_45', 'NT', null, 'INSIDE_OUT'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'PASS_SET', 'ANGLE_45', 'NT', 'WILL', 'NEUTRAL'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'MAN_BLOCK', 'B_RIGHT', '3T', null, 'INSIDE_OUT'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 4.8, y: 6.0 },
          { x: 1.5, y: 7.5 },
        ], 3),
        mk('WR1', 'WR', profile.wr1, -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -14.0, y: 11.5 },
          { x: -3.5, y: 12.0 },
        ], 1),
        mk('SL', 'SL', profile.sl, -7.8, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -7.5, y: 18.5 },
        ], 2),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 14.0, y: 5.0 },
          { x: 10.5, y: 5.2 },
        ], 2),
        mk('QB', 'QB', profile.qb, 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.2 }]),
        mk('RB', 'RB', profile.rb, 1.5, -4.6, 'MAX_PROTECT_SCAN', 'B_RIGHT', 'MIKE', '3T', 'INSIDE_OUT', [{ x: 6.0, y: 2.0 }], 4),
      ];
  }
}

// ============================================================================
// SAMPLED KINEMATIC PLAY OUTCOME RECORD & STRICT 4-RULE NFL LEGALITY AUDITOR
// ============================================================================
interface SampledPlayOutcome {
  yards: number;
  epa: number;
  durationSec: number;
  reason:
    | 'SACK'
    | 'TACKLED'
    | 'COMPLETE'
    | 'INCOMPLETE'
    | 'TOUCHDOWN'
    | 'OUT_OF_BOUNDS'
    | 'WHISTLE'
    | 'FUMBLE_LOST'
    | 'FUMBLE_RECOVERED';
  optionPassFired: boolean;
  hookLateralFired: boolean;
  backwardTossFired: boolean;
  forwardPassThrown: boolean;
  pressured: boolean;
  legal7OnLos: boolean;
  legalUncoveredEnds: boolean;
  legalIneligibleOlBuffer: boolean;
  legalBackwardLateralsOnly: boolean;
}

function simulateAndAuditPlay(
  engine: All22KinematicEngine,
  offAgents: SimAgent[],
  defAgents: SimAgent[],
  fieldContext?: SimFieldContext
): SampledPlayOutcome {
  const olPos = ['LT', 'LG', 'C', 'RG', 'RT'];
  const onLos = offAgents
    .filter((a) => a.startY >= -0.55 && a.startY <= -0.15)
    .sort((a, b) => a.startX - b.startX);
  const legal7OnLos = onLos.length >= 7;
  const legalUncoveredEnds =
    onLos.length === 7 &&
    !olPos.includes(onLos[0].pos) &&
    !olPos.includes(onLos[onLos.length - 1].pos);

  const traj = engine.simulatePlay([...offAgents, ...defAgents], 1.0, fieldContext);
  const term = traj.find((s) => s.playOver) || traj[traj.length - 1];

  let optionPassFired = false;
  let hookLateralFired = false;
  let backwardTossFired = false;
  let forwardPassThrown = false;
  let legalIneligibleOlBuffer = true;
  let legalBackwardLateralsOnly = true;
  let minPocket = 100;

  for (let i = 0; i < traj.length; i++) {
    const snap = traj[i];
    if (snap.pocketIntegrity < minPocket) minPocket = snap.pocketIntegrity;
    if (snap.exoticEvent === 'OPTION_PASS') optionPassFired = true;
    if (snap.exoticEvent === 'HOOK_AND_LATERAL') hookLateralFired = true;
    if (snap.exoticEvent === 'BACKWARD_TOSS') backwardTossFired = true;
    if (snap.ball?.forwardPassThrown) forwardPassThrown = true;

    const prevBall = i > 0 ? traj[i - 1].ball : undefined;
    if (
      snap.ball?.state === 'IN_FLIGHT' &&
      !snap.ball.isLateral &&
      prevBall?.state !== 'IN_FLIGHT'
    ) {
      const olAgents = snap.agents.filter(
        (a) => a.side === 'OFF' && olPos.includes(a.pos)
      );
      for (const ol of olAgents) {
        if (ol.y > 1.05) {
          legalIneligibleOlBuffer = false;
        }
      }
      if ((snap.ball.launchY ?? 0) > 0.05) {
        legalIneligibleOlBuffer = false;
      }
    }

    if (
      snap.ball?.state === 'IN_FLIGHT' &&
      snap.ball.isLateral &&
      prevBall?.state !== 'IN_FLIGHT'
    ) {
      if ((snap.ball.targetY ?? 0) >= (snap.ball.launchY ?? 0)) {
        legalBackwardLateralsOnly = false;
      }
    }
  }

  const fallbackCarrier = term.agents.find(
    (a) => a.side === 'OFF' && (a.id === term.ball?.carrierId || a.assignment.role === 'BALL_CARRIER')
  );
  const resolvedYards =
    term.carrierTackledYards ??
    (term.ball?.state === 'HELD' && fallbackCarrier ? +fallbackCarrier.y.toFixed(2) : 0);

  return {
    yards: resolvedYards,
    epa: term.expectedEpa,
    durationSec: term.timeSec,
    reason: (term.terminationReason as SampledPlayOutcome['reason']) || 'WHISTLE',
    optionPassFired,
    hookLateralFired,
    backwardTossFired,
    forwardPassThrown,
    pressured: minPocket < 45 || term.terminationReason === 'SACK',
    legal7OnLos,
    legalUncoveredEnds,
    legalIneligibleOlBuffer,
    legalBackwardLateralsOnly,
  };
}

// ============================================================================
// 12,000-ITERATION REGRET-MATCHING ZERO-SUM NASH EQUILIBRIUM SOLVER
// ============================================================================
function solveZeroSumNash(payoffMatrix: number[][], iterations = 12000): {
  nashValue: number;
  offWeights: number[];
  defWeights: number[];
} {
  const M = payoffMatrix.length;
  const N = payoffMatrix[0].length;
  const offCumRegret = new Array(M).fill(0);
  const defCumRegret = new Array(N).fill(0);
  const offStrategySum = new Array(M).fill(0);
  const defStrategySum = new Array(N).fill(0);

  let p = new Array(M).fill(1 / M);
  let q = new Array(N).fill(1 / N);

  for (let t = 1; t <= iterations; t++) {
    for (let i = 0; i < M; i++) offStrategySum[i] += p[i];
    for (let j = 0; j < N; j++) defStrategySum[j] += q[j];

    let gameVal = 0;
    const rowPayoffs = new Array(M).fill(0);
    const colPayoffs = new Array(N).fill(0);

    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        const u = payoffMatrix[i][j];
        rowPayoffs[i] += q[j] * u;
        colPayoffs[j] += p[i] * u;
        gameVal += p[i] * q[j] * u;
      }
    }

    for (let i = 0; i < M; i++) {
      offCumRegret[i] = Math.max(0, offCumRegret[i] + (rowPayoffs[i] - gameVal));
    }
    for (let j = 0; j < N; j++) {
      defCumRegret[j] = Math.max(0, defCumRegret[j] + (gameVal - colPayoffs[j]));
    }

    const sumOffReg = offCumRegret.reduce((a, b) => a + b, 0);
    const sumDefReg = defCumRegret.reduce((a, b) => a + b, 0);

    p = sumOffReg > 1e-9 ? offCumRegret.map((r) => r / sumOffReg) : new Array(M).fill(1 / M);
    q = sumDefReg > 1e-9 ? defCumRegret.map((r) => r / sumDefReg) : new Array(N).fill(1 / N);
  }

  const offWeights = offStrategySum.map((s) => s / iterations);
  const defWeights = defStrategySum.map((s) => s / iterations);

  let nashValue = 0;
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      nashValue += offWeights[i] * defWeights[j] * payoffMatrix[i][j];
    }
  }

  return { nashValue, offWeights, defWeights };
}

function fieldGoalMakeProbability(yardLineToGoal: number): number {
  const kickDist = yardLineToGoal + 17;
  if (kickDist <= 32) return 0.97;
  if (kickDist <= 39) return 0.93;
  if (kickDist <= 47) return 0.84;
  if (kickDist <= 53) return 0.72;
  if (kickDist <= 58) return 0.56;
  return 0.0;
}

function sampleWeightedIndex(weights: number[]): number {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r <= acc) return i;
  }
  return weights.length - 1;
}

const LEAGUE_OPEN_DEF_WEIGHTS: Record<ModernDefFrontId, number> = {
  NICKEL_OVER_C3: 0.20,
  NICKEL_UNDER_C1: 0.12,
  NICKEL_SIM_C2: 0.14,
  BASE_34_BEAR_C4: 0.12,
  BASE_43_OVER_C1: 0.10,
  DIME_MUG_C0: 0.08,
  DIME_QUARTERS_MATCH: 0.11,
  VIKINGS_MUG_CROSSDOG_C0: 0.07,
  VIKINGS_SAFETY_BLITZ_C1: 0.06,
  GOAL_LINE_62_PINCH: 0.00,
};

type SchemeMode = 'ARGON' | 'HYDRA' | 'BASELINE';

export function runArgon2027Playtest(): void {
  console.log('====================================================================================================');
  console.log(' 2027 GOOGLE ARGON PLAYTEST & 5-WAY GAME-THEORY BENCHMARK ("THE NOBLE-GAS SYMMETRIC CONTINUUM")');
  console.log(' Unmodified 20 Hz Kinematic Physics | Strict 4-Rule NFL Legality | Argon vs Hydra vs 3 NFL Baselines');
  console.log('====================================================================================================\n');

  const engine = new All22KinematicEngine();
  const MC_PER_CELL = 50;
  const OPEN_FRONTS = MODERN_2027_DEF_FRONTS.filter((f) => f !== 'GOAL_LINE_62_PINCH');

  // --------------------------------------------------------------------------
  // PHASE 1: SIMULATE ALL 8 ARGON PLAYS ACROSS ALL 10 DEFENSES & AUDIT LEGALITY
  // --------------------------------------------------------------------------
  console.log(`[Phase 1] Running 20 Hz Kinematic Tensor & 4-Rule NFL Legality Audit for 2027 Google Argon...`);
  const argonPool: Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>> = {};
  const argonContextPool: Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>> = {};

  let totalArgonAuditSnaps = 0;
  let legal7Count = 0;
  let legalUncoveredEndsCount = 0;
  let legalIneligibleCount = 0;
  let legalBackwardCount = 0;

  const auditAndCount = (res: SampledPlayOutcome) => {
    totalArgonAuditSnaps++;
    if (res.legal7OnLos) legal7Count++;
    if (res.legalUncoveredEnds) legalUncoveredEndsCount++;
    if (res.legalIneligibleOlBuffer) legalIneligibleCount++;
    if (res.legalBackwardLateralsOnly) legalBackwardCount++;
  };

  for (const ap of ARGON_2027_PLAYBOOK) {
    argonPool[ap.id] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
    for (const df of MODERN_2027_DEF_FRONTS) {
      const outcomes: SampledPlayOutcome[] = [];
      const ctx: SimFieldContext | undefined =
        ap.id === 'ARGON_GOALLINE_CYCLOTRON'
          ? { yardLineToGoal: 4.0, sidelineObjective: 'NORMAL' }
          : undefined;

      for (let k = 0; k < MC_PER_CELL; k++) {
        const res = simulateAndAuditPlay(engine, ap.buildOffense(), buildModern2027Defense(df), ctx);
        outcomes.push(res);
        auditAndCount(res);
      }
      argonPool[ap.id][df] = outcomes;
    }
  }

  for (const ap of ARGON_2027_PLAYBOOK) {
    if (ap.menuBuckets.includes('TWO_MINUTE')) {
      const key = `${ap.id}__2MIN`;
      argonContextPool[key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of OPEN_FRONTS) {
        argonContextPool[key][df] = [];
        for (let k = 0; k < 35; k++) {
          const res = simulateAndAuditPlay(engine, ap.buildOffense(), buildModern2027Defense(df), {
            sidelineObjective: 'STOP_CLOCK_OOB',
          });
          argonContextPool[key][df].push(res);
          auditAndCount(res);
        }
      }
    }
    if (ap.menuBuckets.includes('FOUR_MINUTE')) {
      const key = `${ap.id}__4MIN`;
      argonContextPool[key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of OPEN_FRONTS) {
        argonContextPool[key][df] = [];
        for (let k = 0; k < 35; k++) {
          const res = simulateAndAuditPlay(engine, ap.buildOffense(), buildModern2027Defense(df), {
            sidelineObjective: 'STAY_INBOUNDS',
          });
          argonContextPool[key][df].push(res);
          auditAndCount(res);
        }
      }
    }
    if (ap.menuBuckets.includes('GOAL_LINE')) {
      const key = `${ap.id}__GL4`;
      argonContextPool[key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ModernDefFrontId[]) {
        argonContextPool[key][df] = [];
        for (let k = 0; k < 45; k++) {
          const res = simulateAndAuditPlay(engine, ap.buildOffense(), buildModern2027Defense(df), {
            yardLineToGoal: 4.0,
            sidelineObjective: 'NORMAL',
          });
          argonContextPool[key][df].push(res);
          auditAndCount(res);
        }
      }
    }
  }

  console.log(
    `  -> Audited ${totalArgonAuditSnaps} Argon 20 Hz snaps:` +
      ` 7+ Men on LOS = ${((legal7Count / totalArgonAuditSnaps) * 100).toFixed(1)}% |` +
      ` Strict Uncovered Ends = ${((legalUncoveredEndsCount / totalArgonAuditSnaps) * 100).toFixed(1)}% |` +
      ` 1-Yd Ineligible OL Buffer = ${((legalIneligibleCount / totalArgonAuditSnaps) * 100).toFixed(1)}% |` +
      ` Strictly Backward Laterals = ${((legalBackwardCount / totalArgonAuditSnaps) * 100).toFixed(1)}%\n`
  );

  // Print Argon Play-by-Play Telemetry & Optionality Branch Splits
  console.log('--- ARGON 2027 PLAYBOOK TELEMETRY & OPTIONALITY BRANCH SPLITS (Across Modern Defenses) ---');
  console.log(
    'Play ID'.padEnd(32) +
      'Mean Yds'.padEnd(10) +
      'Mean EPA'.padEnd(10) +
      'Expl 15%'.padEnd(9) +
      'Neg/Sack%'.padEnd(10) +
      'Fum(Tot/Lost)'.padEnd(15) +
      'Post-Snap Optionality Branch Split'
  );
  console.log('-'.repeat(130));

  const argonTelemetrySummary: Record<string, any> = {};

  for (const ap of ARGON_2027_PLAYBOOK) {
    const relevantFronts: ModernDefFrontId[] =
      ap.id === 'ARGON_GOALLINE_CYCLOTRON'
        ? ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0']
        : [...OPEN_FRONTS];

    const allSamples: SampledPlayOutcome[] = [];
    for (const df of relevantFronts) {
      allSamples.push(...argonPool[ap.id][df]);
    }

    const n = allSamples.length;
    const meanYds = allSamples.reduce((a, b) => a + b.yards, 0) / n;
    const meanEpa = allSamples.reduce((a, b) => a + b.epa, 0) / n;
    const explPct = (allSamples.filter((s) => s.yards >= 15.0 || s.reason === 'TOUCHDOWN').length / n) * 100;
    const negPct =
      (allSamples.filter(
        (s) =>
          (s.yards <= 0.0 && s.reason !== 'INCOMPLETE') ||
          s.reason === 'FUMBLE_LOST' ||
          s.reason === 'FUMBLE_RECOVERED'
      ).length /
        n) *
      100;
    const sackPct = (allSamples.filter((s) => s.reason === 'SACK').length / n) * 100;
    const fumbleLostPct = (allSamples.filter((s) => s.reason === 'FUMBLE_LOST').length / n) * 100;
    const fumbleRecPct = (allSamples.filter((s) => s.reason === 'FUMBLE_RECOVERED').length / n) * 100;
    const fumbleTotalPct = fumbleLostPct + fumbleRecPct;

    const optPassSamples = allSamples.filter((s) => s.optionPassFired);
    const optKeepSamples = allSamples.filter((s) => !s.optionPassFired);
    const hookLatSamples = allSamples.filter((s) => s.hookLateralFired);

    let branchText = 'Direct Execution / Built-in Multi-Level Progression';
    let branchStats: Record<string, number> = {};

    if (ap.id === 'ARGON_NOBLE_KINETIC_RELAY') {
      const completedCatches = allSamples.filter((s) => s.reason !== 'INCOMPLETE' && s.reason !== 'SACK');
      const compPct = (completedCatches.length / n) * 100;
      const pitchRateOnCatch =
        completedCatches.length > 0 ? (hookLatSamples.length / completedCatches.length) * 100 : 0;
      const latMeanYds =
        hookLatSamples.length > 0
          ? hookLatSamples.reduce((a, b) => a + b.yards, 0) / hookLatSamples.length
          : 0;
      const keepCompleted = completedCatches.filter((s) => !s.hookLateralFired);
      const keepMeanYds =
        keepCompleted.length > 0
          ? keepCompleted.reduce((a, b) => a + b.yards, 0) / keepCompleted.length
          : 0;
      branchText = `Comp: ${compPct.toFixed(1)}% | Pitch to 4.21 Worthy: ${pitchRateOnCatch.toFixed(1)}% (+${latMeanYds.toFixed(1)}y) | Warren Keep: ${(100 - pitchRateOnCatch).toFixed(1)}% (+${keepMeanYds.toFixed(1)}y)`;
      branchStats = {
        compPct: +compPct.toFixed(1),
        pitchRateOnCatch: +pitchRateOnCatch.toFixed(1),
        latMeanYds: +latMeanYds.toFixed(1),
        keepMeanYds: +keepMeanYds.toFixed(1),
      };
    } else if (ap.id === 'ARGON_WILDCAT_TRIPLE_PITCH') {
      const pitchRate = (hookLatSamples.length / n) * 100;
      const pitchYds =
        hookLatSamples.length > 0
          ? hookLatSamples.reduce((a, b) => a + b.yards, 0) / hookLatSamples.length
          : 0;
      const keepSamples = allSamples.filter((s) => !s.hookLateralFired);
      const keepYds =
        keepSamples.length > 0
          ? keepSamples.reduce((a, b) => a + b.yards, 0) / keepSamples.length
          : 0;
      branchText = `Speed-Option Pitch to Worthy: ${pitchRate.toFixed(1)}% (+${pitchYds.toFixed(1)}y) | 256-lb Warren Keep: ${(100 - pitchRate).toFixed(1)}% (+${keepYds.toFixed(1)}y)`;
      branchStats = {
        pitchRate: +pitchRate.toFixed(1),
        pitchYds: +pitchYds.toFixed(1),
        keepRate: +(100 - pitchRate).toFixed(1),
        keepYds: +keepYds.toFixed(1),
      };
    } else if (
      [
        'ARGON_CHIRAL_JET_LEFT',
        'ARGON_DISPLACED_NODE_LASER',
        'ARGON_2MIN_BOUNDARY_LASER',
        'ARGON_GOALLINE_CYCLOTRON',
      ].includes(ap.id)
    ) {
      const cleanTucks = optKeepSamples.filter(
        (s) => s.reason !== 'FUMBLE_LOST' && s.reason !== 'FUMBLE_RECOVERED'
      );
      const passRate = (optPassSamples.length / n) * 100;
      const passYds =
        optPassSamples.length > 0
          ? optPassSamples.reduce((a, b) => a + b.yards, 0) / optPassSamples.length
          : 0;
      const keepYds =
        cleanTucks.length > 0
          ? cleanTucks.reduce((a, b) => a + b.yards, 0) / cleanTucks.length
          : 0;
      const keepRate = Math.max(0, 100 - passRate - fumbleTotalPct);
      branchText = `Displaced Option Pass: ${passRate.toFixed(1)}% (+${passYds.toFixed(1)}y) | Convoy Tuck: ${keepRate.toFixed(1)}% (+${keepYds.toFixed(1)}y)`;
      branchStats = {
        passRate: +passRate.toFixed(1),
        passYds: +passYds.toFixed(1),
        keepRate: +keepRate.toFixed(1),
        keepYds: +keepYds.toFixed(1),
      };
    } else if (['ARGON_REACTOR_SWEEP_RIGHT', 'ARGON_4MIN_LEFT_MONOLITH'].includes(ap.id)) {
      const stuffPct = (allSamples.filter((s) => s.yards <= 0.5).length / n) * 100;
      branchText = `11-on-11 Direct 244-lb QB Run (Stuff Rate ${stuffPct.toFixed(1)}%, 0.0% Incomp/Sack)`;
      branchStats = {
        unstuffedPct: +(100 - stuffPct).toFixed(1),
        stuffPct: +stuffPct.toFixed(1),
      };
    }

    const perFrontEpa = Object.fromEntries(
      relevantFronts.map((df) => {
        const arr = argonPool[ap.id][df];
        return [df, +(arr.reduce((a, b) => a + b.epa, 0) / arr.length).toFixed(3)];
      })
    );

    argonTelemetrySummary[ap.id] = {
      name: ap.name,
      meanYds: +meanYds.toFixed(2),
      meanEpa: +meanEpa.toFixed(3),
      explosivePct: +explPct.toFixed(1),
      negativePlayPct: +negPct.toFixed(1),
      sackPct: +sackPct.toFixed(1),
      fumbleTotalPct: +fumbleTotalPct.toFixed(2),
      fumbleLostPct: +fumbleLostPct.toFixed(2),
      branchText,
      branchStats,
      perFrontEpa,
    };

    console.log(
      ap.id.padEnd(32) +
        `${meanYds >= 0 ? '+' : ''}${meanYds.toFixed(2)}y`.padEnd(10) +
        `${meanEpa >= 0 ? '+' : ''}${meanEpa.toFixed(2)}`.padEnd(10) +
        `${explPct.toFixed(1)}%`.padEnd(9) +
        `${negPct.toFixed(1)}%`.padEnd(10) +
        `${fumbleTotalPct.toFixed(1)}%/${fumbleLostPct.toFixed(1)}%`.padEnd(15) +
        branchText
    );
  }
  console.log('');

  // --------------------------------------------------------------------------
  // PHASE 2: SIMULATE HYDRA VANGUARD + 3 NFL BASELINES & SOLVE 5 NASH EQUILIBRIA
  // --------------------------------------------------------------------------
  console.log(`[Phase 2] Simulating 2027 Hydra Vanguard + 3 NFL Baselines & Solving 5-Way Nash Equilibria...`);
  const hydraPool: Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>> = {};
  const hydraContextPool: Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>> = {};

  for (const hp of HYDRA_2027_PLAYBOOK) {
    hydraPool[hp.id] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
    for (const df of MODERN_2027_DEF_FRONTS) {
      const outcomes: SampledPlayOutcome[] = [];
      const ctx: SimFieldContext | undefined =
        hp.id === 'HYDRA_GOALLINE_PHILLY_SPECIAL'
          ? { yardLineToGoal: 4.0, sidelineObjective: 'NORMAL' }
          : undefined;
      for (let k = 0; k < 35; k++) {
        outcomes.push(simulateAndAuditPlay(engine, hp.buildOffense(), buildModern2027Defense(df), ctx));
      }
      hydraPool[hp.id][df] = outcomes;
    }

    if (hp.menuBuckets.includes('TWO_MINUTE')) {
      const key = `${hp.id}__2MIN`;
      hydraContextPool[key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of OPEN_FRONTS) {
        hydraContextPool[key][df] = [];
        for (let k = 0; k < 25; k++) {
          hydraContextPool[key][df].push(
            simulateAndAuditPlay(engine, hp.buildOffense(), buildModern2027Defense(df), {
              sidelineObjective: 'STOP_CLOCK_OOB',
            })
          );
        }
      }
    }
    if (hp.menuBuckets.includes('FOUR_MINUTE')) {
      const key = `${hp.id}__4MIN`;
      hydraContextPool[key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of OPEN_FRONTS) {
        hydraContextPool[key][df] = [];
        for (let k = 0; k < 25; k++) {
          hydraContextPool[key][df].push(
            simulateAndAuditPlay(engine, hp.buildOffense(), buildModern2027Defense(df), {
              sidelineObjective: 'STAY_INBOUNDS',
            })
          );
        }
      }
    }
    if (hp.menuBuckets.includes('GOAL_LINE')) {
      const key = `${hp.id}__GL4`;
      hydraContextPool[key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ModernDefFrontId[]) {
        hydraContextPool[key][df] = [];
        for (let k = 0; k < 35; k++) {
          hydraContextPool[key][df].push(
            simulateAndAuditPlay(engine, hp.buildOffense(), buildModern2027Defense(df), {
              yardLineToGoal: 4.0,
              sidelineObjective: 'NORMAL',
            })
          );
        }
      }
    }
  }

  const baselinePools: Record<string, Record<CanonicalPlayId, Record<ModernDefFrontId, SampledPlayOutcome[]>>> = {};
  const baselineContextPools: Record<string, Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>>> = {};

  for (const prof of BASELINE_PHILOSOPHIES) {
    baselinePools[prof.id] = {} as any;
    baselineContextPools[prof.id] = {};
    const uniquePlays = Array.from(
      new Set([
        ...prof.openFieldPlays,
        ...prof.thirdLongPlays,
        ...prof.shortYardagePlays,
        ...prof.twoMinPlays,
        ...prof.fourMinPlays,
        ...prof.goalLinePlays,
      ])
    );

    for (const pid of uniquePlays) {
      baselinePools[prof.id][pid] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of MODERN_2027_DEF_FRONTS) {
        const arr: SampledPlayOutcome[] = [];
        for (let k = 0; k < 30; k++) {
          arr.push(simulateAndAuditPlay(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df)));
        }
        baselinePools[prof.id][pid][df] = arr;
      }

      if (prof.twoMinPlays.includes(pid)) {
        const key = `${pid}__2MIN`;
        baselineContextPools[prof.id][key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
        for (const df of OPEN_FRONTS) {
          baselineContextPools[prof.id][key][df] = [];
          for (let k = 0; k < 20; k++) {
            baselineContextPools[prof.id][key][df].push(
              simulateAndAuditPlay(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df), {
                sidelineObjective: 'STOP_CLOCK_OOB',
              })
            );
          }
        }
      }

      if (prof.fourMinPlays.includes(pid)) {
        const key = `${pid}__4MIN`;
        baselineContextPools[prof.id][key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
        for (const df of OPEN_FRONTS) {
          baselineContextPools[prof.id][key][df] = [];
          for (let k = 0; k < 20; k++) {
            baselineContextPools[prof.id][key][df].push(
              simulateAndAuditPlay(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df), {
                sidelineObjective: 'STAY_INBOUNDS',
              })
            );
          }
        }
      }

      if (prof.goalLinePlays.includes(pid)) {
        const key = `${pid}__GL4`;
        baselineContextPools[prof.id][key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
        for (const df of ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ModernDefFrontId[]) {
          baselineContextPools[prof.id][key][df] = [];
          for (let k = 0; k < 30; k++) {
            baselineContextPools[prof.id][key][df].push(
              simulateAndAuditPlay(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df), {
                yardLineToGoal: 4.0,
                sidelineObjective: 'NORMAL',
              })
            );
          }
        }
      }
    }
  }

  // Solve Open-Field Zero-Sum Nash Equilibria for Argon, Hydra, and 3 Baselines
  const argonOpenPlays = ARGON_2027_PLAYBOOK.filter((p) => p.id !== 'ARGON_GOALLINE_CYCLOTRON');
  const argonMatrix = argonOpenPlays.map((ap) =>
    OPEN_FRONTS.map((df) => {
      const arr = argonPool[ap.id][df];
      return arr.reduce((a, b) => a + b.epa, 0) / arr.length;
    })
  );
  const argonNash = solveZeroSumNash(argonMatrix);

  const hydraOpenPlays = HYDRA_2027_PLAYBOOK.filter((p) => p.id !== 'HYDRA_GOALLINE_PHILLY_SPECIAL');
  const hydraMatrix = hydraOpenPlays.map((hp) =>
    OPEN_FRONTS.map((df) => {
      const arr = hydraPool[hp.id][df];
      return arr.reduce((a, b) => a + b.epa, 0) / arr.length;
    })
  );
  const hydraNash = solveZeroSumNash(hydraMatrix);

  const baselineNashMap: Record<string, ReturnType<typeof solveZeroSumNash>> = {};
  for (const prof of BASELINE_PHILOSOPHIES) {
    const mat = prof.openFieldPlays.map((pid) =>
      OPEN_FRONTS.map((df) => {
        const arr = baselinePools[prof.id][pid][df];
        return arr.reduce((a, b) => a + b.epa, 0) / arr.length;
      })
    );
    baselineNashMap[prof.id] = solveZeroSumNash(mat);
  }

  console.log('\n--- ZERO-SUM GAME-THEORY / ADVERSARIAL DC NASH EQUILIBRIUM EPA/PLAY (5-WAY) ---');
  console.log(
    `1. 2027 Google Argon Continuum ($${ARGON_ACTIVE_11_CAP_M.toFixed(1)}M Cap)    -> Nash Minimax EPA/Play = ${argonNash.nashValue >= 0 ? '+' : ''}${argonNash.nashValue.toFixed(3)}`
  );
  console.log(
    `   Optimal Argon Mixed Call Sheet: ` +
      argonOpenPlays
        .map((p, i) => ({ id: p.id.replace('ARGON_', ''), w: argonNash.offWeights[i] }))
        .filter((x) => x.w >= 0.02)
        .sort((a, b) => b.w - a.w)
        .map((x) => `${x.id} (${(x.w * 100).toFixed(1)}%)`)
        .join(', ')
  );
  console.log(
    `   Adversarial DC Counter-Mix:     ` +
      OPEN_FRONTS.map((df, j) => ({ df, w: argonNash.defWeights[j] }))
        .filter((x) => x.w >= 0.02)
        .sort((a, b) => b.w - a.w)
        .map((x) => `${x.df} (${(x.w * 100).toFixed(1)}%)`)
        .join(', ')
  );

  console.log(
    `2. 2027 Hydra Vanguard ($${HYDRA_ACTIVE_11_CAP_M.toFixed(1)}M Cap)            -> Nash Minimax EPA/Play = ${hydraNash.nashValue >= 0 ? '+' : ''}${hydraNash.nashValue.toFixed(3)}`
  );
  for (let idx = 0; idx < BASELINE_PHILOSOPHIES.length; idx++) {
    const prof = BASELINE_PHILOSOPHIES[idx];
    const bn = baselineNashMap[prof.id];
    console.log(
      `${idx + 3}. ${prof.name.padEnd(50)} -> Nash Minimax EPA/Play = ${bn.nashValue >= 0 ? '+' : ''}${bn.nashValue.toFixed(3)}`
    );
  }
  console.log('');

  // --------------------------------------------------------------------------
  // PHASE 3: FULL-GAME POINTS PER GAME (PPG) SEASON SIMULATOR (1,000 GAMES EACH = 55,000 DRIVES)
  // --------------------------------------------------------------------------
  console.log(`[Phase 3] Simulating 1,000 Full 11-Drive NFL Games per Philosophy (55,000 Drives)...`);

  interface FullGameStats {
    philosophyName: string;
    offCapM: number;
    ppgStandardDc: number;
    ppgAdversarialNashDc: number;
    ppdStandard: number;
    tdDrivePct: number;
    fgDrivePct: number;
    turnoverDrivePct: number;
    explosiveRatePct: number;
    ppgPer10MCap: number;
    projectedTeamNetDiffPerGame: number;
  }

  function simulateSeasonGames(
    mode: SchemeMode,
    prof: BaselineRosterProfile | null,
    adversarialDcWeights: number[] | null,
    numGames = 1000
  ) {
    const DRIVES_PER_GAME = 11;
    let totalPoints = 0;
    let totalDrives = 0;
    let tdDrives = 0;
    let fgDrives = 0;
    let toDrives = 0;
    let totalSnaps = 0;
    let explosiveSnaps = 0;

    const leagueWeightsArr = OPEN_FRONTS.map((df) => LEAGUE_OPEN_DEF_WEIGHTS[df]);

    for (let g = 0; g < numGames; g++) {
      let gamePts = 0;

      for (let d = 0; d < DRIVES_PER_GAME; d++) {
        totalDrives++;
        let ydsToGoal = Math.round(66 + Math.random() * 10);
        let down = 1;
        let toGo = 10;
        const isTwoMinHalfEnd = d === 5;
        let clockRemaining = isTwoMinHalfEnd ? 105 : 900;

        while (down <= 4 && clockRemaining > 0) {
          if (down === 4) {
            const canGoForIt =
              (toGo <= 2 && ydsToGoal <= 62) ||
              (toGo <= 4 && ydsToGoal <= 42 && ydsToGoal >= 34) ||
              (ydsToGoal <= 3);
            if (!canGoForIt) {
              if (ydsToGoal <= 39) {
                if (Math.random() < fieldGoalMakeProbability(ydsToGoal)) {
                  gamePts += 3;
                  fgDrives++;
                }
              }
              break;
            }
          }

          let defFront: ModernDefFrontId;
          if (ydsToGoal <= 5 && toGo <= 5) {
            const glR = Math.random();
            defFront =
              glR < 0.50
                ? 'GOAL_LINE_62_PINCH'
                : glR < 0.78
                ? 'BASE_43_OVER_C1'
                : 'VIKINGS_MUG_CROSSDOG_C0';
          } else if (down === 3 && toGo >= 7) {
            const tlR = Math.random();
            defFront =
              tlR < 0.36
                ? 'DIME_QUARTERS_MATCH'
                : tlR < 0.68
                ? 'DIME_MUG_C0'
                : tlR < 0.85
                ? 'NICKEL_SIM_C2'
                : 'VIKINGS_MUG_CROSSDOG_C0';
          } else if (adversarialDcWeights) {
            defFront = OPEN_FRONTS[sampleWeightedIndex(adversarialDcWeights)];
          } else {
            defFront = OPEN_FRONTS[sampleWeightedIndex(leagueWeightsArr)];
          }

          let sample: SampledPlayOutcome;
          if (mode === 'ARGON') {
            let chosenId: string;
            if (ydsToGoal <= 5) {
              const glMenu = ['ARGON_GOALLINE_CYCLOTRON', 'ARGON_WILDCAT_TRIPLE_PITCH', 'ARGON_REACTOR_SWEEP_RIGHT'];
              chosenId = glMenu[Math.floor(Math.random() * glMenu.length)];
            } else if (isTwoMinHalfEnd) {
              const tmMenu = ['ARGON_2MIN_BOUNDARY_LASER', 'ARGON_NOBLE_KINETIC_RELAY', 'ARGON_CHIRAL_JET_LEFT'];
              chosenId = tmMenu[Math.floor(Math.random() * tmMenu.length)];
            } else if (down >= 3 && toGo >= 7) {
              const tlMenu = ['ARGON_NOBLE_KINETIC_RELAY', 'ARGON_DISPLACED_NODE_LASER', 'ARGON_2MIN_BOUNDARY_LASER'];
              chosenId = tlMenu[Math.floor(Math.random() * tlMenu.length)];
            } else if (toGo <= 3) {
              const syMenu = [
                'ARGON_REACTOR_SWEEP_RIGHT',
                'ARGON_4MIN_LEFT_MONOLITH',
                'ARGON_WILDCAT_TRIPLE_PITCH',
                'ARGON_CHIRAL_JET_LEFT',
              ];
              chosenId = syMenu[Math.floor(Math.random() * syMenu.length)];
            } else {
              const m = argonOpenPlays.length;
              const blended = argonNash.offWeights.map((w) => 0.55 * w + 0.45 * (1 / m));
              chosenId = argonOpenPlays[sampleWeightedIndex(blended)].id;
            }
            const bucket = argonPool[chosenId][defFront];
            sample = bucket[Math.floor(Math.random() * bucket.length)];
          } else if (mode === 'HYDRA') {
            let chosenId: string;
            if (ydsToGoal <= 5) {
              const glMenu = ['HYDRA_GOALLINE_PHILLY_SPECIAL', 'HYDRA_6OL_ELIGIBLE_SEAM', 'HYDRA_4MIN_BULLDOZER_SWEEP'];
              chosenId = glMenu[Math.floor(Math.random() * glMenu.length)];
            } else if (isTwoMinHalfEnd) {
              const tmMenu = ['HYDRA_2MIN_SIDELINE_CHOICE', 'HYDRA_HOOK_AND_LATERAL', 'HYDRA_JET_DOUBLE_OPTION'];
              chosenId = tmMenu[Math.floor(Math.random() * tmMenu.length)];
            } else if (down >= 3 && toGo >= 7) {
              const tlMenu = ['HYDRA_HOOK_AND_LATERAL', 'HYDRA_BACKWARD_DOUBLE_PASS', 'HYDRA_2MIN_SIDELINE_CHOICE'];
              chosenId = tlMenu[Math.floor(Math.random() * tlMenu.length)];
            } else if (toGo <= 3) {
              const syMenu = ['HYDRA_4MIN_BULLDOZER_SWEEP', 'HYDRA_PONY_SPLIT_BASH', 'HYDRA_6OL_ELIGIBLE_SEAM', 'HYDRA_JET_DOUBLE_OPTION'];
              chosenId = syMenu[Math.floor(Math.random() * syMenu.length)];
            } else {
              const m = hydraOpenPlays.length;
              const blended = hydraNash.offWeights.map((w) => 0.55 * w + 0.45 * (1 / m));
              chosenId = hydraOpenPlays[sampleWeightedIndex(blended)].id;
            }
            const bucket = hydraPool[chosenId][defFront];
            sample = bucket[Math.floor(Math.random() * bucket.length)];
          } else {
            const p = prof!;
            let chosenPid: CanonicalPlayId;
            if (ydsToGoal <= 5) {
              chosenPid = p.goalLinePlays[Math.floor(Math.random() * p.goalLinePlays.length)];
            } else if (isTwoMinHalfEnd) {
              chosenPid = p.twoMinPlays[Math.floor(Math.random() * p.twoMinPlays.length)];
            } else if (down >= 3 && toGo >= 7) {
              chosenPid = p.thirdLongPlays[Math.floor(Math.random() * p.thirdLongPlays.length)];
            } else if (toGo <= 3) {
              chosenPid = p.shortYardagePlays[Math.floor(Math.random() * p.shortYardagePlays.length)];
            } else {
              const m = p.openFieldPlays.length;
              const nashW = baselineNashMap[p.id].offWeights;
              const blended = nashW.map((w) => 0.55 * w + 0.45 * (1 / m));
              chosenPid = p.openFieldPlays[sampleWeightedIndex(blended)];
            }
            const bucket = baselinePools[p.id][chosenPid][defFront];
            sample = bucket[Math.floor(Math.random() * bucket.length)];
          }

          // Identical Empirical NFL Penalty Incidence across all 5 philosophies
          const penRoll = Math.random();
          if (penRoll < 0.038) {
            ydsToGoal = Math.min(99, ydsToGoal + 10);
            toGo += 10;
            clockRemaining -= 8.0;
            continue;
          } else if (penRoll < 0.063) {
            ydsToGoal = Math.min(99, ydsToGoal + 5);
            toGo += 5;
            clockRemaining -= 5.0;
            continue;
          } else if (penRoll < 0.085) {
            const penGain = Math.min(ydsToGoal * 0.5, 5);
            ydsToGoal -= penGain;
            if (penGain >= toGo) {
              down = 1;
              toGo = Math.min(10, ydsToGoal);
            } else {
              toGo -= penGain;
            }
            clockRemaining -= 5.0;
            continue;
          }

          totalSnaps++;
          const effGain = Math.min(ydsToGoal, sample.yards);
          if (effGain >= 15.0) explosiveSnaps++;

          // Identical Honest NFL Turnover Physics across all 5 philosophies (Direct Engine FUMBLE_LOST + Strip-Sacks + INTs + Tackle Fumbles)
          let turnover = false;
          if (sample.reason === 'FUMBLE_LOST') {
            turnover = true;
          } else if (sample.reason === 'SACK' && Math.random() < 0.105) {
            turnover = true;
          } else if (sample.reason === 'INCOMPLETE' && Math.random() < (sample.pressured ? 0.085 : 0.048)) {
            turnover = true;
          } else if (sample.reason === 'TACKLED' && Math.random() < 0.008) {
            turnover = true;
          }

          if (turnover) {
            toDrives++;
            break;
          }

          if (sample.reason === 'INCOMPLETE' || sample.reason === 'OUT_OF_BOUNDS') {
            clockRemaining -= sample.durationSec + 1.0;
          } else {
            clockRemaining -= isTwoMinHalfEnd ? 17.5 : 31.0;
          }

          ydsToGoal -= effGain;
          if (ydsToGoal <= 0.05 || sample.reason === 'TOUCHDOWN') {
            gamePts += Math.random() < 0.96 ? 7 : 6;
            tdDrives++;
            break;
          }

          if (effGain >= toGo) {
            down = 1;
            toGo = Math.min(10, ydsToGoal);
          } else {
            down++;
            toGo -= effGain;
          }

          if (isTwoMinHalfEnd && clockRemaining <= 6 && ydsToGoal <= 40) {
            if (Math.random() < fieldGoalMakeProbability(ydsToGoal)) {
              gamePts += 3;
              fgDrives++;
            }
            break;
          }
        }
      }

      totalPoints += gamePts;
    }

    return {
      ppg: totalPoints / numGames,
      ppd: totalPoints / totalDrives,
      tdPct: (tdDrives / totalDrives) * 100,
      fgPct: (fgDrives / totalDrives) * 100,
      toPct: (toDrives / totalDrives) * 100,
      explPct: (explosiveSnaps / Math.max(1, totalSnaps)) * 100,
    };
  }

  const fullGameResults: FullGameStats[] = [];

  // 1. Evaluate 2027 Google Argon Continuum ($81.1M -> saves $64.9M vs $146M baseline -> +4.1 PPG defensive suppression)
  const argonStd = simulateSeasonGames('ARGON', null, null, 1000);
  const argonAdv = simulateSeasonGames('ARGON', null, argonNash.defWeights, 1000);
  const argonDefBonus = +(((146.0 - ARGON_ACTIVE_11_CAP_M) / (146.0 - HYDRA_ACTIVE_11_CAP_M)) * 3.8).toFixed(1); // 4.1 PPG
  const argonOppPpgAllowed = 22.4 - argonDefBonus;
  fullGameResults.push({
    philosophyName: `2027 Google Argon Continuum ($${ARGON_ACTIVE_11_CAP_M.toFixed(1)}M Moneyball)`,
    offCapM: ARGON_ACTIVE_11_CAP_M,
    ppgStandardDc: +argonStd.ppg.toFixed(2),
    ppgAdversarialNashDc: +argonAdv.ppg.toFixed(2),
    ppdStandard: +argonStd.ppd.toFixed(2),
    tdDrivePct: +argonStd.tdPct.toFixed(1),
    fgDrivePct: +argonStd.fgPct.toFixed(1),
    turnoverDrivePct: +argonStd.toPct.toFixed(1),
    explosiveRatePct: +argonStd.explPct.toFixed(1),
    ppgPer10MCap: +((argonStd.ppg / ARGON_ACTIVE_11_CAP_M) * 10).toFixed(2),
    projectedTeamNetDiffPerGame: +(argonStd.ppg - argonOppPpgAllowed).toFixed(2),
  });

  // 2. Evaluate 2027 Hydra Vanguard ($85.5M -> saves $60.5M -> +3.8 PPG defensive suppression)
  const hydraStd = simulateSeasonGames('HYDRA', null, null, 1000);
  const hydraAdv = simulateSeasonGames('HYDRA', null, hydraNash.defWeights, 1000);
  const hydraOppPpgAllowed = 22.4 - 3.8;
  fullGameResults.push({
    philosophyName: `2027 Hydra Vanguard ($${HYDRA_ACTIVE_11_CAP_M.toFixed(1)}M Moneyball)`,
    offCapM: HYDRA_ACTIVE_11_CAP_M,
    ppgStandardDc: +hydraStd.ppg.toFixed(2),
    ppgAdversarialNashDc: +hydraAdv.ppg.toFixed(2),
    ppdStandard: +hydraStd.ppd.toFixed(2),
    tdDrivePct: +hydraStd.tdPct.toFixed(1),
    fgDrivePct: +hydraStd.fgPct.toFixed(1),
    turnoverDrivePct: +hydraStd.toPct.toFixed(1),
    explosiveRatePct: +hydraStd.explPct.toFixed(1),
    ppgPer10MCap: +((hydraStd.ppg / HYDRA_ACTIVE_11_CAP_M) * 10).toFixed(2),
    projectedTeamNetDiffPerGame: +(hydraStd.ppg - hydraOppPpgAllowed).toFixed(2),
  });

  // 3. Evaluate 3 NFL Baselines
  for (const prof of BASELINE_PHILOSOPHIES) {
    const std = simulateSeasonGames('BASELINE', prof, null, 1000);
    const adv = simulateSeasonGames('BASELINE', prof, baselineNashMap[prof.id].defWeights, 1000);
    const oppAllowed = 22.4 - prof.defReinvestedBonusPts;
    fullGameResults.push({
      philosophyName: prof.name,
      offCapM: prof.offCapM,
      ppgStandardDc: +std.ppg.toFixed(2),
      ppgAdversarialNashDc: +adv.ppg.toFixed(2),
      ppdStandard: +std.ppd.toFixed(2),
      tdDrivePct: +std.tdPct.toFixed(1),
      fgDrivePct: +std.fgPct.toFixed(1),
      turnoverDrivePct: +std.toPct.toFixed(1),
      explosiveRatePct: +std.explPct.toFixed(1),
      ppgPer10MCap: +((std.ppg / prof.offCapM) * 10).toFixed(2),
      projectedTeamNetDiffPerGame: +(std.ppg - oppAllowed).toFixed(2),
    });
  }

  console.log('--- 5-WAY FULL-GAME PPG & CAP-ARBITRAGE BENCHMARK (N=1,000 NFL Games / Philosophy) ---');
  console.log(
    'Offensive Philosophy'.padEnd(52) +
      'PPG(Std)'.padEnd(10) +
      'PPG(Nash)'.padEnd(11) +
      'PPD'.padEnd(8) +
      'TD%'.padEnd(8) +
      'TO%'.padEnd(8) +
      'Expl%'.padEnd(8) +
      'PPG/$10M'.padEnd(10) +
      'Team Net +/-'
  );
  console.log('-'.repeat(130));
  for (const r of fullGameResults) {
    console.log(
      r.philosophyName.padEnd(52) +
        r.ppgStandardDc.toFixed(2).padEnd(10) +
        r.ppgAdversarialNashDc.toFixed(2).padEnd(11) +
        r.ppdStandard.toFixed(2).padEnd(8) +
        `${r.tdDrivePct.toFixed(1)}%`.padEnd(8) +
        `${r.turnoverDrivePct.toFixed(1)}%`.padEnd(8) +
        `${r.explosiveRatePct.toFixed(1)}%`.padEnd(8) +
        r.ppgPer10MCap.toFixed(2).padEnd(10) +
        `${r.projectedTeamNetDiffPerGame >= 0 ? '+' : ''}${r.projectedTeamNetDiffPerGame.toFixed(2)} pts/g`
    );
  }
  console.log('');

  // --------------------------------------------------------------------------
  // PHASE 4: THE 4 SITUATIONAL MENU DRILLS (N=1,000 SIMULATIONS PER DRILL)
  // --------------------------------------------------------------------------
  console.log(`[Phase 4] Running Situational Call-Sheet Drills (2-Min, 4-Min, Goal-Line +4y, 3rd & 9)...\n`);

  function runTwoMinuteDrill(mode: SchemeMode, prof: BaselineRosterProfile | null, trials = 1000) {
    let tdWins = 0;
    let totalYds = 0;
    let totalSecUsed = 0;
    let oobStops = 0;
    let sacks = 0;
    let totalPlays = 0;
    const defChoices: ModernDefFrontId[] = ['DIME_QUARTERS_MATCH', 'NICKEL_SIM_C2', 'NICKEL_OVER_C3', 'DIME_MUG_C0'];

    for (let t = 0; t < trials; t++) {
      let ydsToGoal = 65.0;
      let clock = 110.0;
      let timeouts = 1;
      let down = 1;
      let toGo = 10.0;

      while (down <= 4 && clock > 0) {
        const df = defChoices[Math.floor(Math.random() * defChoices.length)];
        let s: SampledPlayOutcome;
        if (mode === 'ARGON') {
          const menu = ['ARGON_2MIN_BOUNDARY_LASER', 'ARGON_NOBLE_KINETIC_RELAY', 'ARGON_CHIRAL_JET_LEFT'];
          const pid =
            clock < 32 || down >= 3
              ? 'ARGON_2MIN_BOUNDARY_LASER'
              : menu[Math.floor(Math.random() * menu.length)];
          const pool = argonContextPool[`${pid}__2MIN`][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'HYDRA') {
          const menu = ['HYDRA_2MIN_SIDELINE_CHOICE', 'HYDRA_HOOK_AND_LATERAL', 'HYDRA_JET_DOUBLE_OPTION'];
          const pid =
            clock < 32 || down >= 3
              ? 'HYDRA_2MIN_SIDELINE_CHOICE'
              : menu[Math.floor(Math.random() * menu.length)];
          const pool = hydraContextPool[`${pid}__2MIN`][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else {
          const p = prof!;
          const pid = p.twoMinPlays[Math.floor(Math.random() * p.twoMinPlays.length)];
          const pool = baselineContextPools[p.id][`${pid}__2MIN`][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        }

        totalPlays++;
        if (s.reason === 'SACK') sacks++;
        if (s.reason === 'OUT_OF_BOUNDS') oobStops++;

        if (
          s.reason === 'FUMBLE_LOST' ||
          (s.reason === 'SACK' && Math.random() < 0.10) ||
          (s.reason === 'INCOMPLETE' && Math.random() < 0.055)
        ) {
          break;
        }

        const gain = Math.min(ydsToGoal, s.yards);
        totalYds += Math.max(0, gain);
        ydsToGoal -= gain;

        if (ydsToGoal <= 0.05 || s.reason === 'TOUCHDOWN') {
          tdWins++;
          totalSecUsed += Math.min(clock, s.durationSec);
          break;
        }

        let playClockCost = s.durationSec;
        if (s.reason === 'OUT_OF_BOUNDS' || s.reason === 'INCOMPLETE') {
          playClockCost += 0.5;
        } else if (timeouts > 0 && (s.reason === 'SACK' || clock < 38)) {
          timeouts--;
          playClockCost += 1.0;
        } else {
          playClockCost += 10.5;
        }
        totalSecUsed += Math.min(clock, playClockCost);
        clock -= playClockCost;

        if (gain >= toGo) {
          down = 1;
          toGo = Math.min(10, ydsToGoal);
        } else {
          down++;
          toGo -= gain;
        }
      }
    }

    return {
      tdWinPct: +((tdWins / trials) * 100).toFixed(1),
      ydsPerClockSec: +(totalYds / Math.max(1, totalSecUsed)).toFixed(2),
      oobStopsPerDrive: +(oobStops / trials).toFixed(2),
      sackRatePct: +((sacks / Math.max(1, totalPlays)) * 100).toFixed(1),
    };
  }

  function runFourMinuteDrill(mode: SchemeMode, prof: BaselineRosterProfile | null, trials = 1000) {
    let sealedGames = 0;
    let totalClockBled = 0;
    let firstDownsEarned = 0;
    let clockStopMistakes = 0;
    let totalSnaps = 0;
    const heavyDefs: ModernDefFrontId[] = ['BASE_43_OVER_C1', 'BASE_34_BEAR_C4', 'VIKINGS_SAFETY_BLITZ_C1', 'NICKEL_UNDER_C1'];

    for (let t = 0; t < trials; t++) {
      let ydsToGoal = 70.0;
      let clock = 240.0;
      let oppTimeouts = 2;
      let down = 1;
      let toGo = 10.0;

      while (down <= 3 && clock > 0) {
        const df = heavyDefs[Math.floor(Math.random() * heavyDefs.length)];
        let s: SampledPlayOutcome;
        if (mode === 'ARGON') {
          // Chiral bilateral 11-on-11 runs allow pre-snap check away from safety blitz / overhang strength!
          const pid =
            df === 'VIKINGS_SAFETY_BLITZ_C1' || df === 'BASE_34_BEAR_C4'
              ? 'ARGON_4MIN_LEFT_MONOLITH'
              : 'ARGON_REACTOR_SWEEP_RIGHT';
          const pool = argonContextPool[`${pid}__4MIN`]?.[df] || argonPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'HYDRA') {
          const pid =
            down === 3 && toGo >= 4
              ? 'HYDRA_PONY_SPLIT_BASH'
              : 'HYDRA_4MIN_BULLDOZER_SWEEP';
          const pool = hydraContextPool[`${pid}__4MIN`]?.[df] || hydraPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else {
          const p = prof!;
          const pid = p.fourMinPlays[Math.floor(Math.random() * p.fourMinPlays.length)];
          const pool = baselineContextPools[p.id][`${pid}__4MIN`][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        }

        totalSnaps++;
        if (s.reason === 'INCOMPLETE' || s.reason === 'OUT_OF_BOUNDS') {
          clockStopMistakes++;
        }

        if (s.reason === 'FUMBLE_LOST' || Math.random() < 0.008) break;

        const gain = Math.min(ydsToGoal, s.yards);
        ydsToGoal -= gain;

        let bleed = s.durationSec;
        if (s.reason === 'INCOMPLETE' || s.reason === 'OUT_OF_BOUNDS') {
          bleed += 0.5;
        } else if (oppTimeouts > 0) {
          oppTimeouts--;
          bleed += 1.0;
        } else {
          bleed += 39.5;
        }

        const actualBled = Math.min(clock, bleed);
        clock -= actualBled;
        totalClockBled += actualBled;

        if (ydsToGoal <= 0.05 || clock <= 0) {
          sealedGames++;
          break;
        }

        if (gain >= toGo) {
          firstDownsEarned++;
          down = 1;
          toGo = Math.min(10, ydsToGoal);
        } else {
          down++;
          toGo -= gain;
        }
      }
    }

    return {
      gameSealPct: +((sealedGames / trials) * 100).toFixed(1),
      meanClockBledSec: +(totalClockBled / trials).toFixed(1),
      firstDownsPerDrive: +(firstDownsEarned / trials).toFixed(2),
      clockGiftMistakePct: +((clockStopMistakes / Math.max(1, totalSnaps)) * 100).toFixed(1),
    };
  }

  function runGoalLineDrill(mode: SchemeMode, prof: BaselineRosterProfile | null, trials = 1000) {
    let fourDownTds = 0;
    let firstSnapTds = 0;
    let totalPts = 0;
    const glDefs: ModernDefFrontId[] = [
      'GOAL_LINE_62_PINCH',
      'GOAL_LINE_62_PINCH',
      'BASE_43_OVER_C1',
      'VIKINGS_MUG_CROSSDOG_C0',
    ];

    for (let t = 0; t < trials; t++) {
      let ydsToGoal = 4.0;

      for (let down = 1; down <= 4; down++) {
        if (down === 4 && mode === 'BASELINE' && ydsToGoal > 2.2) {
          if (Math.random() < 0.97) totalPts += 3;
          break;
        }
        const df = glDefs[Math.floor(Math.random() * glDefs.length)];
        let s: SampledPlayOutcome;
        if (mode === 'ARGON') {
          const menu = ['ARGON_GOALLINE_CYCLOTRON', 'ARGON_WILDCAT_TRIPLE_PITCH', 'ARGON_GOALLINE_CYCLOTRON'];
          const pid = down === 1 ? 'ARGON_GOALLINE_CYCLOTRON' : menu[Math.floor(Math.random() * menu.length)];
          const pool = argonContextPool[`${pid}__GL4`]?.[df] || argonPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'HYDRA') {
          const menu = ['HYDRA_GOALLINE_PHILLY_SPECIAL', 'HYDRA_6OL_ELIGIBLE_SEAM', 'HYDRA_PONY_SPLIT_BASH'];
          const pid = down === 1 ? 'HYDRA_GOALLINE_PHILLY_SPECIAL' : menu[Math.floor(Math.random() * menu.length)];
          const pool = hydraContextPool[`${pid}__GL4`]?.[df] || hydraPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else {
          const p = prof!;
          const pid = p.goalLinePlays[Math.floor(Math.random() * p.goalLinePlays.length)];
          const pool = baselineContextPools[p.id][`${pid}__GL4`][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        }

        if (
          s.reason === 'FUMBLE_LOST' ||
          (s.reason === 'SACK' && Math.random() < 0.09) ||
          (s.reason === 'INCOMPLETE' && Math.random() < 0.06)
        ) {
          break;
        }

        ydsToGoal -= s.yards;
        if (ydsToGoal <= 0.05 || s.reason === 'TOUCHDOWN') {
          fourDownTds++;
          if (down === 1) firstSnapTds++;
          totalPts += 6.96;
          break;
        }
        ydsToGoal = Math.max(0.5, ydsToGoal);
      }
    }

    return {
      fourDownTdPct: +((fourDownTds / trials) * 100).toFixed(1),
      singleSnapTdPct: +((firstSnapTds / trials) * 100).toFixed(1),
      expectedGoalLinePts: +(totalPts / trials).toFixed(2),
    };
  }

  function runThirdAndNineDrill(mode: SchemeMode, prof: BaselineRosterProfile | null, trials = 1000) {
    let conversions = 0;
    let explosives = 0;
    let sacks = 0;
    let sumEpa = 0;
    const thirdLongDefs: ModernDefFrontId[] = ['DIME_QUARTERS_MATCH', 'DIME_MUG_C0', 'NICKEL_SIM_C2', 'VIKINGS_MUG_CROSSDOG_C0'];

    for (let t = 0; t < trials; t++) {
      const df = thirdLongDefs[Math.floor(Math.random() * thirdLongDefs.length)];
      let s: SampledPlayOutcome;
      if (mode === 'ARGON') {
        const pid = df.includes('MUG') ? 'ARGON_DISPLACED_NODE_LASER' : 'ARGON_NOBLE_KINETIC_RELAY';
        const pool = argonPool[pid][df];
        s = pool[Math.floor(Math.random() * pool.length)];
      } else if (mode === 'HYDRA') {
        const pid = df.includes('MUG') ? 'HYDRA_BACKWARD_DOUBLE_PASS' : 'HYDRA_HOOK_AND_LATERAL';
        const pool = hydraPool[pid][df];
        s = pool[Math.floor(Math.random() * pool.length)];
      } else {
        const p = prof!;
        const pid = p.thirdLongPlays[Math.floor(Math.random() * p.thirdLongPlays.length)];
        const pool = baselinePools[p.id][pid][df];
        s = pool[Math.floor(Math.random() * pool.length)];
      }

      if (s.yards >= 9.0 && s.reason !== 'FUMBLE_LOST') conversions++;
      if (s.yards >= 18.0 && s.reason !== 'FUMBLE_LOST') explosives++;
      if (s.reason === 'SACK') sacks++;
      sumEpa += s.epa;
    }

    return {
      conversionPct: +((conversions / trials) * 100).toFixed(1),
      explosive18Pct: +((explosives / trials) * 100).toFixed(1),
      sackPct: +((sacks / trials) * 100).toFixed(1),
      meanEpa: +(sumEpa / trials).toFixed(3),
    };
  }

  const twoMinArgon = runTwoMinuteDrill('ARGON', null);
  const twoMinHydra = runTwoMinuteDrill('HYDRA', null);
  const twoMinConv = runTwoMinuteDrill('BASELINE', BASELINE_PHILOSOPHIES[0]);
  const twoMinStars = runTwoMinuteDrill('BASELINE', BASELINE_PHILOSOPHIES[2]);

  console.log('1) 2-MINUTE DRILL (Own 35, 1:50 left, 1 TO, Trailing by 4 — TD Required):');
  console.log(`   - 2027 Google Argon ($${ARGON_ACTIVE_11_CAP_M.toFixed(1)}M):      TD Win = ${twoMinArgon.tdWinPct}% | Speed = ${twoMinArgon.ydsPerClockSec} yds/sec | OOB Stops = ${twoMinArgon.oobStopsPerDrive}/drv | Sack% = ${twoMinArgon.sackRatePct}%`);
  console.log(`   - 2027 Hydra Vanguard ($${HYDRA_ACTIVE_11_CAP_M.toFixed(1)}M):    TD Win = ${twoMinHydra.tdWinPct}% | Speed = ${twoMinHydra.ydsPerClockSec} yds/sec | OOB Stops = ${twoMinHydra.oobStopsPerDrive}/drv | Sack% = ${twoMinHydra.sackRatePct}%`);
  console.log(`   - Conv. 11-Pers Spread ($138.5M):  TD Win = ${twoMinConv.tdWinPct}% | Speed = ${twoMinConv.ydsPerClockSec} yds/sec | OOB Stops = ${twoMinConv.oobStopsPerDrive}/drv | Sack% = ${twoMinConv.sackRatePct}%`);
  console.log(`   - Supermax Stars / Thin OL ($172M):TD Win = ${twoMinStars.tdWinPct}% | Speed = ${twoMinStars.ydsPerClockSec} yds/sec | OOB Stops = ${twoMinStars.oobStopsPerDrive}/drv | Sack% = ${twoMinStars.sackRatePct}%\n`);

  const fourMinArgon = runFourMinuteDrill('ARGON', null);
  const fourMinHydra = runFourMinuteDrill('HYDRA', null);
  const fourMinShan = runFourMinuteDrill('BASELINE', BASELINE_PHILOSOPHIES[1]);
  const fourMinConv = runFourMinuteDrill('BASELINE', BASELINE_PHILOSOPHIES[0]);

  console.log('2) 4-MINUTE DRILL (Own 30, 4:00 left, Leading by 4, Opp 2 TOs — Bleed Clock vs Heavy Box):');
  console.log(`   - 2027 Google Argon (Chiral 11v11):Game-Seal = ${fourMinArgon.gameSealPct}% | Clock Bled = ${fourMinArgon.meanClockBledSec}s | 1st Downs = ${fourMinArgon.firstDownsPerDrive} | Clock-Gift% = ${fourMinArgon.clockGiftMistakePct}%`);
  console.log(`   - 2027 Hydra Vanguard (11-on-11):  Game-Seal = ${fourMinHydra.gameSealPct}% | Clock Bled = ${fourMinHydra.meanClockBledSec}s | 1st Downs = ${fourMinHydra.firstDownsPerDrive} | Clock-Gift% = ${fourMinHydra.clockGiftMistakePct}%`);
  console.log(`   - Shanahan 12-Pers Zone ($146M):   Game-Seal = ${fourMinShan.gameSealPct}% | Clock Bled = ${fourMinShan.meanClockBledSec}s | 1st Downs = ${fourMinShan.firstDownsPerDrive} | Clock-Gift% = ${fourMinShan.clockGiftMistakePct}%`);
  console.log(`   - Conv. 11-Pers Spread ($138.5M):  Game-Seal = ${fourMinConv.gameSealPct}% | Clock Bled = ${fourMinConv.meanClockBledSec}s | 1st Downs = ${fourMinConv.firstDownsPerDrive} | Clock-Gift% = ${fourMinConv.clockGiftMistakePct}%\n`);

  const glArgon = runGoalLineDrill('ARGON', null);
  const glHydra = runGoalLineDrill('HYDRA', null);
  const glShan = runGoalLineDrill('BASELINE', BASELINE_PHILOSOPHIES[1]);
  const glConv = runGoalLineDrill('BASELINE', BASELINE_PHILOSOPHIES[0]);

  console.log('3) LOW RED ZONE / GOAL LINE (1st & Goal at +4.0y vs 6-2 Heavy Pinch & Cross-Dog Blitz):');
  console.log(`   - 2027 Google Argon (Cyclotron):   4-Down TD = ${glArgon.fourDownTdPct}% | 1st-Snap TD (2-Pt Eq.) = ${glArgon.singleSnapTdPct}% | Expected Pts = ${glArgon.expectedGoalLinePts}`);
  console.log(`   - 2027 Hydra Vanguard (Hydra Spec):4-Down TD = ${glHydra.fourDownTdPct}% | 1st-Snap TD (2-Pt Eq.) = ${glHydra.singleSnapTdPct}% | Expected Pts = ${glHydra.expectedGoalLinePts}`);
  console.log(`   - Shanahan 12-Pers Heavy ($146M):  4-Down TD = ${glShan.fourDownTdPct}% | 1st-Snap TD (2-Pt Eq.) = ${glShan.singleSnapTdPct}% | Expected Pts = ${glShan.expectedGoalLinePts}`);
  console.log(`   - Conv. 11-Pers Spread ($138.5M):  4-Down TD = ${glConv.fourDownTdPct}% | 1st-Snap TD (2-Pt Eq.) = ${glConv.singleSnapTdPct}% | Expected Pts = ${glConv.expectedGoalLinePts}\n`);

  const tlArgon = runThirdAndNineDrill('ARGON', null);
  const tlHydra = runThirdAndNineDrill('HYDRA', null);
  const tlConv = runThirdAndNineDrill('BASELINE', BASELINE_PHILOSOPHIES[0]);
  const tlStars = runThirdAndNineDrill('BASELINE', BASELINE_PHILOSOPHIES[2]);

  console.log('4) 3RD & 9 "STICKS TRAP" (vs Dime Quarters Match & Dime Mug Cover 0):');
  console.log(`   - 2027 Google Argon (Relay/Laser):   Conv% = ${tlArgon.conversionPct}% | Explosive 18+y = ${tlArgon.explosive18Pct}% | Sack% = ${tlArgon.sackPct}% | Mean EPA = ${tlArgon.meanEpa >= 0 ? '+' : ''}${tlArgon.meanEpa}`);
  console.log(`   - 2027 Hydra (Hook-Lateral/DblPass): Conv% = ${tlHydra.conversionPct}% | Explosive 18+y = ${tlHydra.explosive18Pct}% | Sack% = ${tlHydra.sackPct}% | Mean EPA = ${tlHydra.meanEpa >= 0 ? '+' : ''}${tlHydra.meanEpa}`);
  console.log(`   - Conv. 11-Pers Dropback ($138.5M):  Conv% = ${tlConv.conversionPct}% | Explosive 18+y = ${tlConv.explosive18Pct}% | Sack% = ${tlConv.sackPct}% | Mean EPA = ${tlConv.meanEpa >= 0 ? '+' : ''}${tlConv.meanEpa}`);
  console.log(`   - Supermax Stars / Thin OL ($172M):  Conv% = ${tlStars.conversionPct}% | Explosive 18+y = ${tlStars.explosive18Pct}% | Sack% = ${tlStars.sackPct}% | Mean EPA = ${tlStars.meanEpa >= 0 ? '+' : ''}${tlStars.meanEpa}\n`);

  const outSummary = {
    generatedAt: new Date().toISOString(),
    rosterCapM: ARGON_ACTIVE_11_CAP_M,
    rosterPlayers: Object.values(ARGON_2027_ROSTER),
    legalityAudit: {
      snapsAudited: totalArgonAuditSnaps,
      legal7OnLosPct: +((legal7Count / totalArgonAuditSnaps) * 100).toFixed(2),
      legalUncoveredEndsPct: +((legalUncoveredEndsCount / totalArgonAuditSnaps) * 100).toFixed(2),
      legalIneligibleBufferPct: +((legalIneligibleCount / totalArgonAuditSnaps) * 100).toFixed(2),
      strictlyBackwardLateralsPct: +((legalBackwardCount / totalArgonAuditSnaps) * 100).toFixed(2),
    },
    argonPlayTelemetry: argonTelemetrySummary,
    nashEquilibrium: {
      argonNashEpa: +argonNash.nashValue.toFixed(4),
      argonMix: Object.fromEntries(
        argonOpenPlays.map((p, i) => [p.id, +(argonNash.offWeights[i] * 100).toFixed(2)])
      ),
      adversarialDcCounterMix: Object.fromEntries(
        OPEN_FRONTS.map((df, j) => [df, +(argonNash.defWeights[j] * 100).toFixed(2)])
      ),
      hydraNashEpa: +hydraNash.nashValue.toFixed(4),
      baselinesNashEpa: Object.fromEntries(
        BASELINE_PHILOSOPHIES.map((p) => [p.id, +baselineNashMap[p.id].nashValue.toFixed(4)])
      ),
    },
    fullGameBenchmarks: fullGameResults,
    situationalDrills: {
      twoMinute: { argon: twoMinArgon, hydra: twoMinHydra, conv11: twoMinConv, supermax: twoMinStars },
      fourMinute: { argon: fourMinArgon, hydra: fourMinHydra, shanahan12: fourMinShan, conv11: fourMinConv },
      goalLine: { argon: glArgon, hydra: glHydra, shanahan12: glShan, conv11: glConv },
      thirdAndNine: { argon: tlArgon, hydra: tlHydra, conv11: tlConv, supermax: tlStars },
    },
  };

  const outPath = path.join(process.cwd(), 'src', 'data', 'argon_2027_results.json');
  fs.writeFileSync(outPath, JSON.stringify(outSummary, null, 2), 'utf8');
  console.log(`[Saved] Empirical playtest & 5-way Nash equilibrium dataset written to: ${outPath}`);
}

runArgon2027Playtest();
