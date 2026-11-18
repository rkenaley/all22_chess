import {
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
  SimAgent,
  Waypoint2D,
} from './engine';
import { ModernDefFrontId } from './vanguard_2027_playbook';

// ============================================================================
// BASELINE OFFENSIVE ROSTER PROFILES & CANONICAL PLAYBOOKS FOR BENCHMARKS
// ============================================================================
export interface BaselineRosterProfile {
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

export type CanonicalPlayId =
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

export const BASELINE_PHILOSOPHIES: BaselineRosterProfile[] = [
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

export const LEAGUE_OPEN_DEF_WEIGHTS: Record<ModernDefFrontId, number> = {
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

/** Builds a standardized offensive alignment and assignment list for a canonical play benchmark. */
export function buildBaselinePlay(
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
