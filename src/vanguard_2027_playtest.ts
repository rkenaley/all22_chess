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
  HYDRA_2027_ROSTER,
  HYDRA_ACTIVE_11_CAP_M,
  MODERN_2027_DEF_FRONTS,
  ModernDefFrontId,
  buildModern2027Defense,
} from './vanguard_2027_playbook';

// ============================================================================
// BASELINE OFFENSIVE ROSTER PROFILES & CANONICAL PLAYBOOKS FOR BENCHMARKING
// ============================================================================
interface BaselineRosterProfile {
  id: string;
  name: string;
  offCapM: number;
  defReinvestedBonusPts: number; // Defensive PPG suppression from cap savings vs $145M baseline
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
    // $50M Pocket QB, $26M WR1, $16M WR2, $9M SL, $6.5M RB, $8M TE, $23M avg OL
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
    // $46M PA Distributor QB, $28M WR1, $12M RB, $18M Dual TE, $42M Athletic Zone OL
    ol: { speed: 77, accel: 83, power: 86, finesse: 88, awareness: 87 },
    qb: { speed: 78, accel: 82, power: 75, finesse: 87, awareness: 88 },
    rb: { speed: 91, accel: 92, power: 83, finesse: 88, awareness: 87 },
    wr1: { speed: 91, accel: 91, power: 74, finesse: 90, awareness: 89 },
    wr2: { speed: 88, accel: 88, power: 72, finesse: 85, awareness: 85 },
    sl: { speed: 84, accel: 85, power: 82, finesse: 83, awareness: 85 }, // 2nd TE / FB hybrid
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
    defReinvestedBonusPts: -2.1, // Starves defense of $26M+ cap -> allows +2.1 more PPG
    // $58M QB, $35M WR1, $28M WR2, $16M Receiving TE, $11M RB -> only $24M left for entire 5-man OL!
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
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'MAN_BLOCK', 'B_RIGHT', '3T', null, 'INSIDE_OUT'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        mk('WR1', 'WR', profile.wr1, -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
        mk('SL', 'SL', profile.sl, -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN'),
        mk('QB', 'QB', profile.qb, 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.5, y: -5.0 }]),
        mk('RB', 'RB', profile.rb, -1.5, -4.8, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
          { x: 0.5, y: -3.6 },
          { x: 3.2, y: -1.8 },
          { x: 6.0, y: 1.2 },
          { x: 7.5, y: 14.0 },
        ]),
      ];

    case 'PA_UC_BOOT': {
      const qb = mk('QB', 'QB', profile.qb, 0.0, -1.8, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 4.8, y: -6.5 },
      ]);
      qb.playAction = {
        enabled: true,
        meshDurationSec: 1.25,
        fakeCarrierId: 'RB',
        fakeGap: 'C_LEFT',
        isBootleg: true,
        bootDirection: 'RIGHT',
      };
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'PASS_SET', 'ANGLE_45', 'RDE', null, 'OUTSIDE_IN'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'PASS_SET', 'ANGLE_45', 'NT', null, 'OUTSIDE_IN'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'PASS_SET', 'ANGLE_45', 'NT', null, 'OUTSIDE_IN'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'PASS_SET', 'ANGLE_45', '3T', null, 'OUTSIDE_IN'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, -4.8, -0.4, 'CHIP_RELEASE', 'C_LEFT', 'RDE', null, 'INSIDE_OUT', [
          { x: 2.0, y: 2.8 },
          { x: 12.5, y: 4.5 },
        ], 2),
        mk('SL', 'TE', profile.sl, 4.8, -0.8, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 6.5, y: 9.0 },
          { x: 15.0, y: 13.5 },
        ], 1),
        mk('WR1', 'WR', profile.wr1, -13.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -12.0, y: 10.0 },
          { x: 4.5, y: 17.5 },
        ], 2),
        mk('WR2', 'WR', profile.wr2, 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 15.0, y: 21.0 },
        ], 3),
        qb,
        mk('RB', 'RB', profile.rb, 0.0, -5.4, 'MAX_PROTECT_SCAN', 'C_LEFT', 'WILL', 'RDE', 'OUTSIDE_IN', [
          { x: -3.8, y: -1.4 },
          { x: -6.2, y: -0.4 },
        ], 4),
      ];
    }

    case 'PA_FLOOD':
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'PASS_SET', 'ANGLE_45', 'NT', null, 'INSIDE_OUT'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'PASS_SET', 'ANGLE_45', 'NT', 'WILL', 'NEUTRAL'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'PASS_SET', 'VERTICAL_DEEP', '3T', 'MIKE', 'INSIDE_OUT'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'CHIP_RELEASE', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
          { x: 8.5, y: 4.0 },
          { x: 14.5, y: 5.5 },
        ], 2),
        mk('WR1', 'WR', profile.wr1, -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -13.5, y: 12.0 },
          { x: -4.0, y: 15.0 },
        ], 3),
        mk('SL', 'SL', profile.sl, 8.2, -1.0, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 9.0, y: 10.0 },
          { x: 16.5, y: 14.5 },
        ], 1),
        mk('WR2', 'WR', profile.wr2, 13.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 14.5, y: 20.0 },
        ], 2),
        mk('QB', 'QB', profile.qb, 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 2.2, y: -6.2 }]),
        mk('RB', 'RB', profile.rb, -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', 'WILL', 'RDE', 'INSIDE_OUT'),
      ];

    case 'QUICK_SLANT':
      return [
        mk('LT', 'LT', profile.ol, -3.2, -0.4, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
        mk('LG', 'LG', profile.ol, -1.6, -0.3, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
        mk('C', 'C', profile.ol, 0.0, -0.2, 'PASS_SET', 'JUMP_SET', null, null, 'NEUTRAL'),
        mk('RG', 'RG', profile.ol, 1.6, -0.3, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
        mk('RT', 'RT', profile.ol, 3.2, -0.4, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
        mk('TE', 'TE', profile.te, 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 5.2, y: 4.5 },
          { x: 9.0, y: 5.0 },
        ], 3),
        mk('WR1', 'WR', profile.wr1, -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -14.2, y: 3.2 },
          { x: -7.5, y: 7.0 },
        ], 1),
        mk('SL', 'SL', profile.sl, -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -10.5, y: 2.5 },
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
// SAMPLED KINEMATIC PLAY OUTCOME RECORD & NFL LEGALITY AUDITOR
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
    | 'INTERCEPTION'
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
  legalIneligibleOlBuffer: boolean;
  legalBackwardLateralsOnly: boolean;
}

function simulateAndAuditPlay(
  engine: All22KinematicEngine,
  offAgents: SimAgent[],
  defAgents: SimAgent[],
  fieldContext?: SimFieldContext
): SampledPlayOutcome {
  // 1. Pre-snap 7+ men on LOS legality audit (-0.55 <= startY <= -0.15)
  const menOnLos = offAgents.filter((a) => a.startY >= -0.55 && a.startY <= -0.15).length;
  const legal7OnLos = menOnLos >= 7;

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

    // Audit forward pass launch tick for NFL 1-yard ineligible OL downfield buffer
    const prevBall = i > 0 ? traj[i - 1].ball : undefined;
    if (
      snap.ball?.state === 'IN_FLIGHT' &&
      !snap.ball.isLateral &&
      prevBall?.state !== 'IN_FLIGHT'
    ) {
      const olAgents = snap.agents.filter(
        (a) => a.side === 'OFF' && ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.pos)
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

    // Audit every lateral launch tick for strictly backward vector (targetY < launchY)
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
    legalIneligibleOlBuffer,
    legalBackwardLateralsOnly,
  };
}

// ============================================================================
// MULTIPLICATIVE WEIGHTS / REGRET-MATCHING ZERO-SUM NASH EQUILIBRIUM SOLVER
// Offender maximizes EPA; Adversarial Defensive Coordinator minimizes EPA!
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

    // Expected payoff of current mixed pair
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
      // Defender minimizes u, so defender regret for column j is (gameVal - colPayoffs[j])
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

// ============================================================================
// EMPIRICAL NFL FIELD GOAL PROBABILITY & FULL-GAME DRIVE SIMULATOR
// ============================================================================
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

// Realistic 2026-2027 NFL open-field defensive call frequency weights across the 9 non-goalline fronts
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

export function runVanguard2027Playtest(): void {
  console.log('====================================================================================================');
  console.log(' 2027 NFL OFFENSIVE VANGUARD PLAYTEST & GAME-THEORY BENCHMARK ("THE 2027 HYDRA VANGUARD")');
  console.log(' 20 Hz Continuous Kinematic Physics Engine | Strict NFL Rule Legality | Full-Game PPG & Drills');
  console.log('====================================================================================================\n');

  const engine = new All22KinematicEngine();
  const MC_PER_CELL = 50; // 50 continuous 20 Hz physics sims per (play x defense x context) cell
  const OPEN_FRONTS = MODERN_2027_DEF_FRONTS.filter((f) => f !== 'GOAL_LINE_62_PINCH');

  // --------------------------------------------------------------------------
  // PHASE 1: SIMULATE ALL 8 HYDRA PLAYS ACROSS ALL 10 DEFENSES & AUDIT LEGALITY
  // --------------------------------------------------------------------------
  console.log(`[Phase 1] Running 20 Hz Kinematic Tensor & NFL Legality Audit for 2027 Hydra Vanguard...`);
  const hydraPool: Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>> = {};
  const hydraContextPool: Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>> = {};

  let totalHydraAuditSnaps = 0;
  let legal7Count = 0;
  let legalIneligibleCount = 0;
  let legalBackwardCount = 0;

  for (const hp of HYDRA_2027_PLAYBOOK) {
    hydraPool[hp.id] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
    for (const df of MODERN_2027_DEF_FRONTS) {
      const outcomes: SampledPlayOutcome[] = [];
      const ctx: SimFieldContext | undefined =
        hp.id === 'HYDRA_GOALLINE_PHILLY_SPECIAL'
          ? { yardLineToGoal: 4.0, sidelineObjective: 'NORMAL' }
          : undefined;

      for (let k = 0; k < MC_PER_CELL; k++) {
        const res = simulateAndAuditPlay(engine, hp.buildOffense(), buildModern2027Defense(df), ctx);
        outcomes.push(res);
        totalHydraAuditSnaps++;
        if (res.legal7OnLos) legal7Count++;
        if (res.legalIneligibleOlBuffer) legalIneligibleCount++;
        if (res.legalBackwardLateralsOnly) legalBackwardCount++;
      }
      hydraPool[hp.id][df] = outcomes;
    }
  }

  // Situational context pools (2-Min STOP_CLOCK_OOB, 4-Min STAY_INBOUNDS, Goal-Line +4.0y)
  for (const hp of HYDRA_2027_PLAYBOOK) {
    if (hp.menuBuckets.includes('TWO_MINUTE')) {
      const key = `${hp.id}__2MIN`;
      hydraContextPool[key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of OPEN_FRONTS) {
        hydraContextPool[key][df] = [];
        for (let k = 0; k < 35; k++) {
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
        for (let k = 0; k < 35; k++) {
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
        for (let k = 0; k < 45; k++) {
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

  console.log(
    `  -> Audited ${totalHydraAuditSnaps} Hydra 20 Hz snaps:` +
      ` 7+ Men on LOS = ${((legal7Count / totalHydraAuditSnaps) * 100).toFixed(1)}% |` +
      ` 1-Yd Ineligible OL Buffer = ${((legalIneligibleCount / totalHydraAuditSnaps) * 100).toFixed(1)}% |` +
      ` Strictly Backward Laterals = ${((legalBackwardCount / totalHydraAuditSnaps) * 100).toFixed(1)}%\n`
  );

  // Print Hydra Play-by-Play Telemetry & Optionality Branch Splits
  console.log('--- HYDRA 2027 EXOTIC PLAYBOOK TELEMETRY, FUMBLE AUDIT & OPTIONALITY BRANCH SPLITS ---');
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

  const hydraTelemetrySummary: Record<string, any> = {};

  for (const hp of HYDRA_2027_PLAYBOOK) {
    const relevantFronts: ModernDefFrontId[] =
      hp.id === 'HYDRA_GOALLINE_PHILLY_SPECIAL'
        ? ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0']
        : [...OPEN_FRONTS];

    const allSamples: SampledPlayOutcome[] = [];
    for (const df of relevantFronts) {
      allSamples.push(...hydraPool[hp.id][df]);
    }

    const n = allSamples.length;
    const meanYds = allSamples.reduce((a, b) => a + b.yards, 0) / n;
    const meanEpa = allSamples.reduce((a, b) => a + b.epa, 0) / n;
    const explPct = (allSamples.filter((s) => s.yards >= 15.0 || s.reason === 'TOUCHDOWN').length / n) * 100;
    const negPct = (
      allSamples.filter(
        (s) =>
          (s.yards <= 0.0 && s.reason !== 'INCOMPLETE') ||
          s.reason === 'INTERCEPTION' ||
          s.reason === 'FUMBLE_LOST' ||
          s.reason === 'FUMBLE_RECOVERED'
      ).length / n
    ) * 100;
    const fumbleLostPct = (allSamples.filter((s) => s.reason === 'FUMBLE_LOST').length / n) * 100;
    const fumbleRecPct = (allSamples.filter((s) => s.reason === 'FUMBLE_RECOVERED').length / n) * 100;
    const fumbleTotalPct = fumbleLostPct + fumbleRecPct;

    const optPassSamples = allSamples.filter((s) => s.optionPassFired);
    const optKeepSamples = allSamples.filter((s) => !s.optionPassFired);
    const hookLatSamples = allSamples.filter((s) => s.hookLateralFired);

    let branchText = 'Direct Execution / Built-in Multi-Level Progression';
    if (hp.id === 'HYDRA_HOOK_AND_LATERAL') {
      const completedHooks = allSamples.filter(
        (s) => s.reason !== 'INCOMPLETE' && s.reason !== 'INTERCEPTION' && s.reason !== 'SACK'
      );
      const pitchRateOnCatch =
        completedHooks.length > 0 ? (hookLatSamples.length / completedHooks.length) * 100 : 0;
      const latMeanYds =
        hookLatSamples.length > 0
          ? hookLatSamples.reduce((a, b) => a + b.yards, 0) / hookLatSamples.length
          : 0;
      const keepCompleted = completedHooks.filter((s) => !s.hookLateralFired);
      const keepMeanYds =
        keepCompleted.length > 0
          ? keepCompleted.reduce((a, b) => a + b.yards, 0) / keepCompleted.length
          : 0;
      branchText = `Pitch on Catch: ${pitchRateOnCatch.toFixed(1)}% (+${latMeanYds.toFixed(1)}y) | Hook Keep: ${(100 - pitchRateOnCatch).toFixed(1)}% (+${keepMeanYds.toFixed(1)}y)`;
    } else if (
      ['HYDRA_JET_DOUBLE_OPTION', 'HYDRA_PONY_SPLIT_BASH', 'HYDRA_BACKWARD_DOUBLE_PASS', 'HYDRA_GOALLINE_PHILLY_SPECIAL'].includes(
        hp.id
      )
    ) {
      const passRate = (optPassSamples.length / n) * 100;
      const passYds =
        optPassSamples.length > 0
          ? optPassSamples.reduce((a, b) => a + b.yards, 0) / optPassSamples.length
          : 0;
      const keepYds =
        optKeepSamples.length > 0
          ? optKeepSamples.reduce((a, b) => a + b.yards, 0) / optKeepSamples.length
          : 0;
      branchText = `Option Pass: ${passRate.toFixed(1)}% (+${passYds.toFixed(1)}y) | Tuck & Run: ${(100 - passRate).toFixed(1)}% (+${keepYds.toFixed(1)}y)`;
    } else if (hp.id === 'HYDRA_4MIN_BULLDOZER_SWEEP') {
      const stuffPct = (allSamples.filter((s) => s.yards <= 0.5).length / n) * 100;
      branchText = `Stowers (BLK 82) Lead + Payton Freeze (Stuff ${stuffPct.toFixed(1)}%, 0% Incomp)`;
    }

    hydraTelemetrySummary[hp.id] = {
      name: hp.name,
      meanYds: +meanYds.toFixed(2),
      meanEpa: +meanEpa.toFixed(3),
      explosivePct: +explPct.toFixed(1),
      negativePlayPct: +negPct.toFixed(1),
      fumbleTotalPct: +fumbleTotalPct.toFixed(2),
      fumbleLostPct: +fumbleLostPct.toFixed(2),
      branchText,
    };

    console.log(
      hp.id.padEnd(32) +
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
  // PHASE 1B: CONTROLLED PHYSICS DIAGNOSTICS (QB-ON-DE BLOCKING & LATERAL FUMBLES)
  // --------------------------------------------------------------------------
  console.log('--- [DIAGNOSTIC AUDIT] 1) SUICIDAL QB-ON-DE BLOCK vs. ELI STOWERS (TE/QB) + PAYTON FREEZE ---');
  // Test A1: Force QB1 Fields (BLK 46) to 1v1 MAN_BLOCK RDE & QB2 Payton (BLK 48) to PULL_LEAD on WILL/DE
  const bulldozerPlay = HYDRA_2027_PLAYBOOK.find((p) => p.id === 'HYDRA_4MIN_BULLDOZER_SWEEP')!;
  const ponyPlay = HYDRA_2027_PLAYBOOK.find((p) => p.id === 'HYDRA_PONY_SPLIT_BASH')!;
  let suicidalBlockYds = 0;
  let suicidalBlockEpa = 0;
  let suicidalStuffCount = 0;
  let hybridBlockYds = 0;
  let hybridBlockEpa = 0;
  let hybridStuffCount = 0;
  let diagTrials = 0;

  for (const df of ['BASE_43_OVER_C1', 'BASE_34_BEAR_C4', 'NICKEL_UNDER_C1', 'VIKINGS_SAFETY_BLITZ_C1'] as ModernDefFrontId[]) {
    for (let k = 0; k < 45; k++) {
      diagTrials++;
      // 1. Hybrid Eli Stowers (BLK 82) Lead + Cole Payton Option Freeze (Current Play 7)
      const cleanRes = simulateAndAuditPlay(engine, bulldozerPlay.buildOffense(), buildModern2027Defense(df));
      hybridBlockYds += cleanRes.yards;
      hybridBlockEpa += cleanRes.epa;
      if (cleanRes.yards <= 0.5) hybridStuffCount++;

      // 2. Suicidal QB-Blocks-DE/LB Variant: Put QB2 Payton (BLK 48) as PULL_LEAD on LDE/WILL & unassign TE1 Washington from LDE so QB must block DE/LB 1v1!
      const suicidalOff = bulldozerPlay.buildOffense();
      const rt = suicidalOff.find((a) => a.id === 'RT')!;
      const te = suicidalOff.find((a) => a.id === 'TE')!;
      const sl = suicidalOff.find((a) => a.id === 'SL')!;
      const rb = suicidalOff.find((a) => a.id === 'RB')!;
      // Have RT climb inside to MIKE and TE release vertical so QB2 Payton (BLK 48, pos 'QB') has to kick out LDE (270-lb DE) 1v1!
      rt.assignment.primaryTargetId = '3T';
      te.assignment.role = 'ROUTE';
      te.assignment.waypoints = [{ x: 4.8, y: 12.0 }];
      sl.assignment.role = 'ROUTE';
      sl.assignment.waypoints = [{ x: -8.0, y: -3.5 }];
      rb.pos = 'QB';
      rb.blockRating = 48;
      rb.startX = 2.0;
      rb.startY = -3.4;
      rb.x = 2.0;
      rb.y = -3.4;
      rb.assignment.role = 'MAN_BLOCK';
      rb.assignment.primaryTargetId = 'LDE';
      rb.assignment.waypoints = [];
      const suicRes = simulateAndAuditPlay(engine, suicidalOff, buildModern2027Defense(df));
      suicidalBlockYds += suicRes.yards;
      suicidalBlockEpa += suicRes.epa;
      if (suicRes.yards <= 0.5) suicidalStuffCount++;
    }
  }

  console.log(
    `  * Suicidal 1v1 QB-Blocks-DE (Payton BLK 48 vs 270lb DE): Mean = ${(suicidalBlockYds / diagTrials).toFixed(2)}y | EPA = ${(suicidalBlockEpa / diagTrials).toFixed(3)} | Stuff/TFL Rate = ${((suicidalStuffCount / diagTrials) * 100).toFixed(1)}%`
  );
  console.log(
    `  * Philly Hybrid Solution (Stowers BLK 82 + Washington BLK 91 + Payton Freeze): Mean = +${(hybridBlockYds / diagTrials).toFixed(2)}y | EPA = +${(hybridBlockEpa / diagTrials).toFixed(3)} | Stuff/TFL Rate = ${((hybridStuffCount / diagTrials) * 100).toFixed(1)}%\n`
  );

  console.log('--- [DIAGNOSTIC AUDIT] 2) RECKLESS LATERALS IN TRAFFIC vs. DISCIPLINED CATCH-PITCH OPTION ---');
  const hookPlay = HYDRA_2027_PLAYBOOK.find((p) => p.id === 'HYDRA_HOOK_AND_LATERAL')!;
  let recklessEpa = 0;
  let recklessFumTot = 0;
  let recklessFumLost = 0;
  let recklessPitches = 0;
  let discEpa = 0;
  let discFumTot = 0;
  let discFumLost = 0;
  let discPitches = 0;
  let latTrials = 0;

  for (const df of OPEN_FRONTS) {
    for (let k = 0; k < 35; k++) {
      latTrials++;
      // 1. Disciplined Catch-Pitch Option (only pitch when DB collapses <4.5y & Shaheed has >=2.65y separation)
      const dRes = simulateAndAuditPlay(engine, hookPlay.buildOffense(), buildModern2027Defense(df));
      discEpa += dRes.epa;
      if (dRes.hookLateralFired) discPitches++;
      if (dRes.reason === 'FUMBLE_LOST') {
        discFumTot++;
        discFumLost++;
      } else if (dRes.reason === 'FUMBLE_RECOVERED') {
        discFumTot++;
      }

      // 2. Reckless Forced Downfield Lateral (pitches into tight coverage minTargetSeparation=0.6y, maxPitchDist=11.5y)
      const reckOff = hookPlay.buildOffense();
      const wr1 = reckOff.find((a) => a.id === 'WR1')!;
      wr1.lateralConfig = {
        enabled: true,
        pitchTargetId: 'SL',
        gatherDelaySec: 0.08,
        defenderCollapseRadius: 12.0,
        maxPitchDist: 11.5,
        minTargetSeparation: 0.6,
      };
      // Put NCB in tighter trail on SL Shaheed to test forced pitch into traffic
      const defAgents = buildModern2027Defense(df);
      const ncb = defAgents.find((d) => d.id === 'NCB' || d.id === 'WILL');
      if (ncb) {
        ncb.defAssignment = { role: 'MAN_COV', targetX: -14.0, targetY: 5.5, manTargetId: 'SL' };
      }
      const rRes = simulateAndAuditPlay(engine, reckOff, defAgents);
      recklessEpa += rRes.epa;
      if (rRes.hookLateralFired) recklessPitches++;
      if (rRes.reason === 'FUMBLE_LOST') {
        recklessFumTot++;
        recklessFumLost++;
      } else if (rRes.reason === 'FUMBLE_RECOVERED') {
        recklessFumTot++;
      }
    }
  }

  console.log(
    `  * Reckless Forced Downfield Pitch in Traffic: Pitch Rate = ${((recklessPitches / latTrials) * 100).toFixed(1)}% | Fumble Rate = ${((recklessFumTot / latTrials) * 100).toFixed(1)}% (${((recklessFumLost / latTrials) * 100).toFixed(1)}% Lost Turnover @ -4.35 EPA!) | Mean EPA = ${(recklessEpa / latTrials).toFixed(3)}`
  );
  console.log(
    `  * Disciplined Catch-Pitch Option (Gated):     Pitch Rate = ${((discPitches / latTrials) * 100).toFixed(1)}% | Fumble Rate = ${((discFumTot / latTrials) * 100).toFixed(1)}% (${((discFumLost / latTrials) * 100).toFixed(1)}% Lost Turnover) | Mean EPA = +${(discEpa / latTrials).toFixed(3)}\n`
  );
  void ponyPlay;

  // --------------------------------------------------------------------------
  // PHASE 2: SIMULATE 3 BASELINE PHILOSOPHIES & SOLVE NASH EQUILIBRIA
  // --------------------------------------------------------------------------
  console.log(`[Phase 2] Simulating 3 Baseline NFL Philosophies & Solving Regret-Matching Nash Equilibria...`);
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
        for (let k = 0; k < 35; k++) {
          arr.push(simulateAndAuditPlay(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df)));
        }
        baselinePools[prof.id][pid][df] = arr;
      }

      if (prof.twoMinPlays.includes(pid)) {
        const key = `${pid}__2MIN`;
        baselineContextPools[prof.id][key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
        for (const df of OPEN_FRONTS) {
          baselineContextPools[prof.id][key][df] = [];
          for (let k = 0; k < 25; k++) {
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
          for (let k = 0; k < 25; k++) {
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
          for (let k = 0; k < 35; k++) {
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

  // Construct Open-Field Payoff Matrices (Plays x 9 Open-Field Defenses) & Solve Nash
  const hydraOpenPlays = HYDRA_2027_PLAYBOOK.filter((p) => p.id !== 'HYDRA_GOALLINE_PHILLY_SPECIAL');
  const hydraMatrix = hydraOpenPlays.map((hp) =>
    OPEN_FRONTS.map((df) => {
      const arr = hydraPool[hp.id][df];
      return arr.reduce((a, b) => a + b.epa, 0) / arr.length;
    })
  );
  const hydraNash = solveZeroSumNash(hydraMatrix);

  // Full 8 Plays x 10 Defenses EPA Matrix + Anti-Cherry-Picking Best-Response & Worst-Counter Audit
  console.log('\n--- ANTI-CHERRY-PICKING AUDIT: COMPLETE 8x10 EPA PAYOFF MATRIX, NASH WEIGHTS & WORST COUNTERS ---');
  const playMatchupAudit: Record<string, any> = {};
  for (let i = 0; i < HYDRA_2027_PLAYBOOK.length; i++) {
    const hp = HYDRA_2027_PLAYBOOK[i];
    const isGl = hp.id === 'HYDRA_GOALLINE_PHILLY_SPECIAL';
    const evalFronts: ModernDefFrontId[] = isGl
      ? ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0']
      : [...OPEN_FRONTS];

    const byDefEpa: Record<string, number> = {};
    const byDefYds: Record<string, number> = {};
    for (const df of MODERN_2027_DEF_FRONTS) {
      const arr = hydraPool[hp.id][df];
      byDefEpa[df] = +(arr.reduce((a, b) => a + b.epa, 0) / arr.length).toFixed(3);
      byDefYds[df] = +(arr.reduce((a, b) => a + b.yards, 0) / arr.length).toFixed(2);
    }

    let bestDef = evalFronts[0];
    let worstDef = evalFronts[0];
    for (const df of evalFronts) {
      if (byDefEpa[df] > byDefEpa[bestDef]) bestDef = df;
      if (byDefEpa[df] < byDefEpa[worstDef]) worstDef = df;
    }

    const openIdx = hydraOpenPlays.findIndex((p) => p.id === hp.id);
    const nashWeightPct = openIdx >= 0 ? +(hydraNash.offWeights[openIdx] * 100).toFixed(1) : 0;
    const epaVsNashDc =
      openIdx >= 0
        ? +OPEN_FRONTS.reduce((acc, df, j) => acc + hydraNash.defWeights[j] * byDefEpa[df], 0).toFixed(3)
        : byDefEpa['GOAL_LINE_62_PINCH'];

    // Which defenses is this play the #1 Best Response against?
    const bestResponseAgainst: ModernDefFrontId[] = [];
    for (const df of MODERN_2027_DEF_FRONTS) {
      let topPlayId = HYDRA_2027_PLAYBOOK[0].id;
      let topVal = -999;
      for (const candidate of HYDRA_2027_PLAYBOOK) {
        if (df !== 'GOAL_LINE_62_PINCH' && candidate.id === 'HYDRA_GOALLINE_PHILLY_SPECIAL') continue;
        const cArr = hydraPool[candidate.id][df];
        const cEpa = cArr.reduce((a, b) => a + b.epa, 0) / cArr.length;
        if (cEpa > topVal) {
          topVal = cEpa;
          topPlayId = candidate.id;
        }
      }
      if (topPlayId === hp.id) bestResponseAgainst.push(df);
    }

    playMatchupAudit[hp.id] = {
      nashWeightPct,
      epaVsNashDc,
      allFrontMeanEpa: hydraTelemetrySummary[hp.id].meanEpa,
      bestMatchup: { def: bestDef, epa: byDefEpa[bestDef], yds: byDefYds[bestDef] },
      worstCounter: { def: worstDef, epa: byDefEpa[worstDef], yds: byDefYds[worstDef] },
      bestResponseAgainst,
      byDefenseEpa: byDefEpa,
      byDefenseYds: byDefYds,
    };
    hydraTelemetrySummary[hp.id].nashWeightPct = nashWeightPct;
    hydraTelemetrySummary[hp.id].epaVsNashDc = epaVsNashDc;
    hydraTelemetrySummary[hp.id].bestMatchup = playMatchupAudit[hp.id].bestMatchup;
    hydraTelemetrySummary[hp.id].worstCounter = playMatchupAudit[hp.id].worstCounter;
    hydraTelemetrySummary[hp.id].bestResponseAgainst = bestResponseAgainst;

    console.log(
      `  * ${hp.id.padEnd(30)} | All-Front EPA: ${(hydraTelemetrySummary[hp.id].meanEpa >= 0 ? '+' : '') + hydraTelemetrySummary[hp.id].meanEpa.toFixed(3)} | vs Nash DC: ${(epaVsNashDc >= 0 ? '+' : '') + epaVsNashDc.toFixed(3)} | Nash Wt: ${String(nashWeightPct + '%').padEnd(6)} | Best: ${bestDef} (${byDefEpa[bestDef] >= 0 ? '+' : ''}${byDefEpa[bestDef].toFixed(2)}) | Worst Counter: ${worstDef} (${byDefEpa[worstDef] >= 0 ? '+' : ''}${byDefEpa[worstDef].toFixed(2)})`
    );
  }

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

  console.log('\n--- ZERO-SUM GAME-THEORY / ADVERSARIAL DC NASH EQUILIBRIUM EPA/PLAY ---');
  console.log(
    `1. 2027 Hydra Vanguard ($${HYDRA_ACTIVE_11_CAP_M.toFixed(1)}M Cap)        -> Nash Minimax EPA/Play = ${hydraNash.nashValue >= 0 ? '+' : ''}${hydraNash.nashValue.toFixed(3)}`
  );
  console.log(
    `   Optimal Hydra Mixed Call Sheet: ` +
      hydraOpenPlays
        .map((p, i) => ({ id: p.id.replace('HYDRA_', ''), w: hydraNash.offWeights[i] }))
        .filter((x) => x.w >= 0.03)
        .sort((a, b) => b.w - a.w)
        .map((x) => `${x.id} (${(x.w * 100).toFixed(1)}%)`)
        .join(', ')
  );
  console.log(
    `   Adversarial DC Counter-Mix:     ` +
      OPEN_FRONTS.map((df, j) => ({ df, w: hydraNash.defWeights[j] }))
        .filter((x) => x.w >= 0.03)
        .sort((a, b) => b.w - a.w)
        .map((x) => `${x.df} (${(x.w * 100).toFixed(1)}%)`)
        .join(', ')
  );

  for (let idx = 0; idx < BASELINE_PHILOSOPHIES.length; idx++) {
    const prof = BASELINE_PHILOSOPHIES[idx];
    const bn = baselineNashMap[prof.id];
    console.log(
      `${idx + 2}. ${prof.name.padEnd(50)} -> Nash Minimax EPA/Play = ${bn.nashValue >= 0 ? '+' : ''}${bn.nashValue.toFixed(3)}`
    );
  }
  console.log('');

  // --------------------------------------------------------------------------
  // PHASE 3: FULL-GAME POINTS PER GAME (PPG) SEASON SIMULATOR (1,000 GAMES EACH)
  // --------------------------------------------------------------------------
  console.log(`[Phase 3] Simulating 1,000 Full 11-Drive NFL Games per Philosophy (44,000 Drives)...`);

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
    projectedTeamNetDiffPerGame: number; // Factoring cap savings reinvested into defense vs 22.4 NFL avg opp PPG
  }

  function simulateSeasonGames(
    isHydra: boolean,
    prof: BaselineRosterProfile | null,
    adversarialDcWeights: number[] | null,
    numGames = 1000
  ): {
    ppg: number;
    ppd: number;
    tdPct: number;
    fgPct: number;
    toPct: number;
    explPct: number;
  } {
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
        // Dynamic Kickoff starting field position: Own 25..Own 35 -> 65..75 yards to opponent goal
        let ydsToGoal = Math.round(66 + Math.random() * 10);
        let down = 1;
        let toGo = 10;
        const isTwoMinHalfEnd = d === 5; // End of Q2 2-Minute Drill drive
        let clockRemaining = isTwoMinHalfEnd ? 105 : 900;

        while (down <= 4 && clockRemaining > 0) {
          // 4th down decision engine (Modern 2027 NFL Analytics Go/Kick/Punt Chart)
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
              break; // Punt or FG ends possession
            }
          }

          // Choose Defensive Front
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

          // Choose Offensive Play from Situational Menu
          let sample: SampledPlayOutcome;
          if (isHydra) {
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
              // Tendency-breaking Nash-blended open-field call sheet (55% Nash optimal + 45% uniform entropy)
              const m = hydraOpenPlays.length;
              const blended = hydraNash.offWeights.map((w) => 0.55 * w + 0.45 * (1 / m));
              const idx = sampleWeightedIndex(blended);
              chosenId = hydraOpenPlays[idx].id;
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

          // Empirical NFL Penalty Incidence (Identical across philosophies: 3.8% Off Hold -10y, 2.5% False Start -5y, 2.2% Def Pen +5y)
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

          // Honest NFL Turnover Physics (Direct Engine INTERCEPTION + FUMBLE_LOST + Strip-Sacks + Rushing Fumbles)
          let turnover = false;
          if (sample.reason === 'FUMBLE_LOST' || sample.reason === 'INTERCEPTION') {
            turnover = true; // Direct kinematic lateral/pitch fumble or forward-pass interception!
          } else if (sample.reason === 'SACK' && Math.random() < 0.105) {
            turnover = true; // Strip-sack lost fumble
          } else if (sample.reason === 'TACKLED' && Math.random() < 0.008) {
            turnover = true; // Standard ballcarrier tackle fumble lost
          }

          if (turnover) {
            toDrives++;
            break;
          }

          // Clock Runoff
          if (sample.reason === 'INCOMPLETE' || sample.reason === 'OUT_OF_BOUNDS') {
            clockRemaining -= sample.durationSec + 1.0;
          } else {
            clockRemaining -= isTwoMinHalfEnd ? 17.5 : 31.0;
          }

          ydsToGoal -= effGain;
          if (ydsToGoal <= 0.05 || sample.reason === 'TOUCHDOWN') {
            // Touchdown + NFL PAT/2-pt blend (mean 6.96 pts per TD)
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

          // End of Q2 field goal attempt before clock expires
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

  // 1. Evaluate 2027 Hydra Vanguard
  const hydraStd = simulateSeasonGames(true, null, null, 1000);
  const hydraAdv = simulateSeasonGames(true, null, hydraNash.defWeights, 1000);
  // $85.5M offensive cap saves $60.5M vs $146M baseline -> funds Top-5 defense suppressing opponent by ~3.8 PPG (from 22.4 to 18.6)
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

  // 2. Evaluate 3 Baseline Offenses
  for (const prof of BASELINE_PHILOSOPHIES) {
    const std = simulateSeasonGames(false, prof, null, 1000);
    const adv = simulateSeasonGames(false, prof, baselineNashMap[prof.id].defWeights, 1000);
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

  console.log('--- FULL-GAME POINTS PER GAME (PPG) & CAP-ARBITRAGE BENCHMARK (N=1,000 NFL Games / Philosophy) ---');
  console.log(
    'Offensive Philosophy'.padEnd(50) +
      'PPG(Std)'.padEnd(10) +
      'PPG(Nash)'.padEnd(11) +
      'PPD'.padEnd(8) +
      'TD%'.padEnd(8) +
      'TO%'.padEnd(8) +
      'Expl%'.padEnd(8) +
      'PPG/$10M'.padEnd(10) +
      'Team Net +/-'
  );
  console.log('-'.repeat(124));
  for (const r of fullGameResults) {
    console.log(
      r.philosophyName.padEnd(50) +
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

  // DRILL A: 2-MINUTE DRILL (Own 35 -> 65y to TD, 110s left, 1 Timeout, Trailing by 4 -> Must score TD!)
  function runTwoMinuteDrill(isHydra: boolean, prof: BaselineRosterProfile | null, trials = 1000) {
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
        if (isHydra) {
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

        // Turnover check (including live-ball lateral fumbles & interceptions!)
        if (
          s.reason === 'FUMBLE_LOST' ||
          s.reason === 'INTERCEPTION' ||
          (s.reason === 'SACK' && Math.random() < 0.10)
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
          playClockCost += 10.5; // NFL hurry-up no-huddle / spike reset cost in-bounds
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

  // DRILL B: 4-MINUTE DRILL (Own 30, 4:00 = 240s left, Leading by 4, Opp has 2 Timeouts -> Bleed clock & seal!)
  function runFourMinuteDrill(isHydra: boolean, prof: BaselineRosterProfile | null, trials = 1000) {
    let sealedGames = 0;
    let totalClockBled = 0;
    let firstDownsEarned = 0;
    let clockStopMistakes = 0;
    let totalSnaps = 0;
    // Defense loads heavy boxes expecting run!
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
        if (isHydra) {
          const pid =
            down === 3 && toGo >= 4
              ? 'HYDRA_PONY_SPLIT_BASH'
              : 'HYDRA_4MIN_BULLDOZER_SWEEP';
          const pool =
            hydraContextPool[`${pid}__4MIN`]?.[df] || hydraPool[pid][df];
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

        // Fumble / turnover check
        if (s.reason === 'FUMBLE_LOST' || s.reason === 'INTERCEPTION' || Math.random() < 0.008) break;

        const gain = Math.min(ydsToGoal, s.yards);
        ydsToGoal -= gain;

        let bleed = s.durationSec;
        if (s.reason === 'INCOMPLETE' || s.reason === 'OUT_OF_BOUNDS') {
          bleed += 0.5;
        } else if (oppTimeouts > 0) {
          oppTimeouts--;
          bleed += 1.0;
        } else {
          bleed += 39.5; // Full 40-second NFL play clock bled!
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

  // DRILL C: LOW RED ZONE / GOAL LINE (1st & Goal at +4.0y vs Heavy Goal-Line / Blitz Fronts)
  function runGoalLineDrill(isHydra: boolean, prof: BaselineRosterProfile | null, trials = 1000) {
    let fourDownTds = 0;
    let firstSnapTds = 0; // Equivalent to 2-Point Conversion rate from +2/+4!
    let totalPts = 0;
    const glDefs: ModernDefFrontId[] = [
      'GOAL_LINE_62_PINCH',
      'GOAL_LINE_62_PINCH',
      'BASE_43_OVER_C1',
      'VIKINGS_MUG_CROSSDOG_C0',
    ];

    for (let t = 0; t < trials; t++) {
      let ydsToGoal = 4.0;
      let scoredTd = false;

      for (let down = 1; down <= 4; down++) {
        if (down === 4 && !isHydra && ydsToGoal > 2.2) {
          // Conventional teams kick chip-shot FG on 4th & Goal > 2y (~97% make)
          if (Math.random() < 0.97) totalPts += 3;
          break;
        }
        const df = glDefs[Math.floor(Math.random() * glDefs.length)];
        let s: SampledPlayOutcome;
        if (isHydra) {
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

        // Turnover check
        if (
          s.reason === 'FUMBLE_LOST' ||
          s.reason === 'INTERCEPTION' ||
          (s.reason === 'SACK' && Math.random() < 0.09)
        ) {
          break;
        }

        ydsToGoal -= s.yards;
        if (ydsToGoal <= 0.05 || s.reason === 'TOUCHDOWN') {
          scoredTd = true;
          fourDownTds++;
          if (down === 1) firstSnapTds++;
          totalPts += 6.96;
          break;
        }
        ydsToGoal = Math.max(0.5, ydsToGoal);
      }
      void scoredTd;
    }

    return {
      fourDownTdPct: +((fourDownTds / trials) * 100).toFixed(1),
      singleSnapTdPct: +((firstSnapTds / trials) * 100).toFixed(1),
      expectedGoalLinePts: +(totalPts / trials).toFixed(2),
    };
  }

  // DRILL D: 3RD & LONG "STICKS TRAP" (3rd & 9 vs Dime Quarters Match & Dime Mug Cover 0)
  function runThirdAndNineDrill(isHydra: boolean, prof: BaselineRosterProfile | null, trials = 1000) {
    let conversions = 0;
    let explosives = 0;
    let sacks = 0;
    let sumEpa = 0;
    const thirdLongDefs: ModernDefFrontId[] = ['DIME_QUARTERS_MATCH', 'DIME_MUG_C0', 'NICKEL_SIM_C2', 'VIKINGS_MUG_CROSSDOG_C0'];

    for (let t = 0; t < trials; t++) {
      const df = thirdLongDefs[Math.floor(Math.random() * thirdLongDefs.length)];
      let s: SampledPlayOutcome;
      if (isHydra) {
        const pid = df.includes('MUG') ? 'HYDRA_BACKWARD_DOUBLE_PASS' : 'HYDRA_HOOK_AND_LATERAL';
        const pool = hydraPool[pid][df];
        s = pool[Math.floor(Math.random() * pool.length)];
      } else {
        const p = prof!;
        const pid = p.thirdLongPlays[Math.floor(Math.random() * p.thirdLongPlays.length)];
        const pool = baselinePools[p.id][pid][df];
        s = pool[Math.floor(Math.random() * pool.length)];
      }

      if (s.yards >= 9.0 && s.reason !== 'FUMBLE_LOST' && s.reason !== 'INTERCEPTION') conversions++;
      if (s.yards >= 18.0 && s.reason !== 'FUMBLE_LOST' && s.reason !== 'INTERCEPTION') explosives++;
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

  const twoMinHydra = runTwoMinuteDrill(true, null);
  const twoMinConv = runTwoMinuteDrill(false, BASELINE_PHILOSOPHIES[0]);
  const twoMinStars = runTwoMinuteDrill(false, BASELINE_PHILOSOPHIES[2]);

  console.log('1) 2-MINUTE DRILL (Own 35, 1:50 left, 1 TO, Trailing by 4 — TD Required):');
  console.log(`   - 2027 Hydra Vanguard ($${HYDRA_ACTIVE_11_CAP_M.toFixed(1)}M):    TD Win = ${twoMinHydra.tdWinPct}% | Speed = ${twoMinHydra.ydsPerClockSec} yds/sec | OOB Stops = ${twoMinHydra.oobStopsPerDrive}/drv | Sack% = ${twoMinHydra.sackRatePct}%`);
  console.log(`   - Conv. 11-Pers Spread ($138.5M):  TD Win = ${twoMinConv.tdWinPct}% | Speed = ${twoMinConv.ydsPerClockSec} yds/sec | OOB Stops = ${twoMinConv.oobStopsPerDrive}/drv | Sack% = ${twoMinConv.sackRatePct}%`);
  console.log(`   - Supermax Stars / Thin OL ($172M):TD Win = ${twoMinStars.tdWinPct}% | Speed = ${twoMinStars.ydsPerClockSec} yds/sec | OOB Stops = ${twoMinStars.oobStopsPerDrive}/drv | Sack% = ${twoMinStars.sackRatePct}%\n`);

  const fourMinHydra = runFourMinuteDrill(true, null);
  const fourMinShan = runFourMinuteDrill(false, BASELINE_PHILOSOPHIES[1]);
  const fourMinConv = runFourMinuteDrill(false, BASELINE_PHILOSOPHIES[0]);

  console.log('2) 4-MINUTE DRILL (Own 30, 4:00 left, Leading by 4, Opp 2 TOs — Bleed Clock vs Heavy Box):');
  console.log(`   - 2027 Hydra Vanguard (Stowers+Payton): Game-Seal = ${fourMinHydra.gameSealPct}% | Clock Bled = ${fourMinHydra.meanClockBledSec}s | 1st Downs = ${fourMinHydra.firstDownsPerDrive} | Clock-Gift% = ${fourMinHydra.clockGiftMistakePct}%`);
  console.log(`   - Shanahan 12-Pers Zone ($146M):        Game-Seal = ${fourMinShan.gameSealPct}% | Clock Bled = ${fourMinShan.meanClockBledSec}s | 1st Downs = ${fourMinShan.firstDownsPerDrive} | Clock-Gift% = ${fourMinShan.clockGiftMistakePct}%`);
  console.log(`   - Conv. 11-Pers Spread ($138.5M):       Game-Seal = ${fourMinConv.gameSealPct}% | Clock Bled = ${fourMinConv.meanClockBledSec}s | 1st Downs = ${fourMinConv.firstDownsPerDrive} | Clock-Gift% = ${fourMinConv.clockGiftMistakePct}%\n`);

  const glHydra = runGoalLineDrill(true, null);
  const glShan = runGoalLineDrill(false, BASELINE_PHILOSOPHIES[1]);
  const glConv = runGoalLineDrill(false, BASELINE_PHILOSOPHIES[0]);

  console.log('3) LOW RED ZONE / GOAL LINE (1st & Goal at +4.0y vs 6-2 Heavy Pinch & Cross-Dog Blitz):');
  console.log(`   - 2027 Hydra Vanguard (Hydra Spec): 4-Down TD = ${glHydra.fourDownTdPct}% | 1st-Snap TD (2-Pt Eq.) = ${glHydra.singleSnapTdPct}% | Expected Pts = ${glHydra.expectedGoalLinePts}`);
  console.log(`   - Shanahan 12-Pers Heavy ($146M):   4-Down TD = ${glShan.fourDownTdPct}% | 1st-Snap TD (2-Pt Eq.) = ${glShan.singleSnapTdPct}% | Expected Pts = ${glShan.expectedGoalLinePts}`);
  console.log(`   - Conv. 11-Pers Spread ($138.5M):   4-Down TD = ${glConv.fourDownTdPct}% | 1st-Snap TD (2-Pt Eq.) = ${glConv.singleSnapTdPct}% | Expected Pts = ${glConv.expectedGoalLinePts}\n`);

  const tlHydra = runThirdAndNineDrill(true, null);
  const tlConv = runThirdAndNineDrill(false, BASELINE_PHILOSOPHIES[0]);
  const tlStars = runThirdAndNineDrill(false, BASELINE_PHILOSOPHIES[2]);

  console.log('4) 3RD & 9 "STICKS TRAP" (vs Dime Quarters Match & Dime Mug Cover 0):');
  console.log(`   - 2027 Hydra (Hook-Lateral / DblPass): Conv% = ${tlHydra.conversionPct}% | Explosive 18+y = ${tlHydra.explosive18Pct}% | Sack% = ${tlHydra.sackPct}% | Mean EPA = ${tlHydra.meanEpa >= 0 ? '+' : ''}${tlHydra.meanEpa}`);
  console.log(`   - Conv. 11-Pers Dropback ($138.5M):    Conv% = ${tlConv.conversionPct}% | Explosive 18+y = ${tlConv.explosive18Pct}% | Sack% = ${tlConv.sackPct}% | Mean EPA = ${tlConv.meanEpa >= 0 ? '+' : ''}${tlConv.meanEpa}`);
  console.log(`   - Supermax Stars / Thin OL ($172.0M):  Conv% = ${tlStars.conversionPct}% | Explosive 18+y = ${tlStars.explosive18Pct}% | Sack% = ${tlStars.sackPct}% | Mean EPA = ${tlStars.meanEpa >= 0 ? '+' : ''}${tlStars.meanEpa}\n`);

  // Save complete empirical report data to src/data/vanguard_2027_results.json
  const outSummary = {
    generatedAt: new Date().toISOString(),
    rosterCapM: HYDRA_ACTIVE_11_CAP_M,
    rosterPlayers: Object.values(HYDRA_2027_ROSTER),
    legalityAudit: {
      snapsAudited: totalHydraAuditSnaps,
      legal7OnLosPct: +((legal7Count / totalHydraAuditSnaps) * 100).toFixed(2),
      legalIneligibleBufferPct: +((legalIneligibleCount / totalHydraAuditSnaps) * 100).toFixed(2),
      strictlyBackwardLateralsPct: +((legalBackwardCount / totalHydraAuditSnaps) * 100).toFixed(2),
    },
    physicsDiagnostics: {
      suicidalQbOnDeBlock: {
        meanYds: +(suicidalBlockYds / diagTrials).toFixed(2),
        meanEpa: +(suicidalBlockEpa / diagTrials).toFixed(3),
        stuffPct: +((suicidalStuffCount / diagTrials) * 100).toFixed(1),
      },
      phillyHybridStowersPayton: {
        meanYds: +(hybridBlockYds / diagTrials).toFixed(2),
        meanEpa: +(hybridBlockEpa / diagTrials).toFixed(3),
        stuffPct: +((hybridStuffCount / diagTrials) * 100).toFixed(1),
      },
      recklessForcedLaterals: {
        pitchRatePct: +((recklessPitches / latTrials) * 100).toFixed(1),
        fumbleTotalPct: +((recklessFumTot / latTrials) * 100).toFixed(1),
        fumbleLostPct: +((recklessFumLost / latTrials) * 100).toFixed(1),
        meanEpa: +(recklessEpa / latTrials).toFixed(3),
      },
      disciplinedCatchPitchOption: {
        pitchRatePct: +((discPitches / latTrials) * 100).toFixed(1),
        fumbleTotalPct: +((discFumTot / latTrials) * 100).toFixed(1),
        fumbleLostPct: +((discFumLost / latTrials) * 100).toFixed(1),
        meanEpa: +(discEpa / latTrials).toFixed(3),
      },
    },
    hydraPlayTelemetry: hydraTelemetrySummary,
    playMatchupAudit,
    nashEquilibrium: {
      hydraNashEpa: +hydraNash.nashValue.toFixed(4),
      hydraMix: Object.fromEntries(
        hydraOpenPlays.map((p, i) => [p.id, +(hydraNash.offWeights[i] * 100).toFixed(2)])
      ),
      adversarialDcCounterMix: Object.fromEntries(
        OPEN_FRONTS.map((df, j) => [df, +(hydraNash.defWeights[j] * 100).toFixed(2)])
      ),
      baselinesNashEpa: Object.fromEntries(
        BASELINE_PHILOSOPHIES.map((p) => [p.id, +baselineNashMap[p.id].nashValue.toFixed(4)])
      ),
    },
    fullGameBenchmarks: fullGameResults,
    situationalDrills: {
      twoMinute: { hydra: twoMinHydra, conv11: twoMinConv, supermax: twoMinStars },
      fourMinute: { hydra: fourMinHydra, shanahan12: fourMinShan, conv11: fourMinConv },
      goalLine: { hydra: glHydra, shanahan12: glShan, conv11: glConv },
      thirdAndNine: { hydra: tlHydra, conv11: tlConv, supermax: tlStars },
    },
  };

  const outPath = path.join(process.cwd(), 'src', 'data', 'vanguard_2027_results.json');
  fs.writeFileSync(outPath, JSON.stringify(outSummary, null, 2), 'utf8');
  console.log(`[Saved] Empirical playtest & Nash equilibrium dataset written to: ${outPath}`);
}

runVanguard2027Playtest();
