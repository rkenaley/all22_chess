import * as fs from 'fs';
import * as path from 'path';
import {
  All22KinematicEngine,
  SimAgent,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
  evaluateMacroMatchup,
  MacroRPSAnalysis,
} from './engine';

const engine = new All22KinematicEngine();

// ============================================================================
// OFFENSIVE PLAY DEFINITIONS (11 Canonical Schemes across 11, 12, 21 Pers)
// ============================================================================

interface OffensivePlayDef {
  id: string;
  name: string;
  category: 'PASS' | 'RUN';
  personnel: string;
  conceptFamily: string;
  build: () => SimAgent[];
}

function makeOff(
  id: string,
  pos: string,
  x: number,
  y: number,
  role: BlockRoleType,
  gap: GapOrSetCode,
  primaryTargetId: string | null = null,
  secondaryTargetId: string | null = null,
  leverage: LeverageBias = 'INSIDE_OUT',
  waypoints: any[] = [],
  readOrder?: number
): SimAgent {
  return {
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
    ratings: { speed: 85, accel: 86, power: 85, finesse: 85, awareness: 85 },
    assignment: {
      role,
      primaryTargetId,
      secondaryTargetId,
      gapOrSet: gap,
      leverage,
      climbOrChipDelaySec: 0.65,
      waypoints,
    },
  };
}

const OFFENSIVE_PLAYS: OffensivePlayDef[] = [
  {
    id: 'PA_UNDER_CENTER_BOOT',
    name: '12P PA Wide Zone Bootleg (Sail/Cross)',
    category: 'PASS',
    personnel: '12 PERS',
    conceptFamily: 'PLAY_ACTION',
    build: () => {
      const qb = makeOff('QB', 'QB', 0.0, -1.8, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
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
      const rb = makeOff('RB', 'RB', 0.0, -4.5, 'MAX_PROTECT_SCAN', 'C_LEFT', null, null, 'OUTSIDE_IN', [
        { x: -3.5, y: -2.5 },
        { x: -5.8, y: 0.5 },
      ], 4);
      return [
        makeOff('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
        makeOff('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
        makeOff('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45'),
        makeOff('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
        makeOff('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
        makeOff('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'OUTSIDE_IN', [
          { x: 4.8, y: 10.0 },
          { x: 12.5, y: 12.0 },
        ], 1),
        makeOff('SL', 'TE', -4.8, -0.6, 'ROUTE', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT', [
          { x: 0.0, y: -1.5 },
          { x: 7.5, y: 3.5 },
        ], 3),
        makeOff('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -14.0, y: 8.0 },
          { x: 6.0, y: 16.5 },
        ], 2),
        makeOff('WR2', 'WR', 14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 14.0, y: 24.0 },
        ], 3),
        qb,
        rb,
      ];
    },
  },
  {
    id: 'PA_MAX_CHIP_FLOOD',
    name: '11P PA 7-Man Chip Flood',
    category: 'PASS',
    personnel: '11 PERS',
    conceptFamily: 'PLAY_ACTION',
    build: () => {
      const qb = makeOff('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.2 }]);
      qb.playAction = {
        enabled: true,
        meshDurationSec: 1.15,
        fakeCarrierId: 'RB',
        fakeGap: 'A_LEFT',
      };
      return [
        makeOff('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
        makeOff('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
        makeOff('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45'),
        makeOff('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
        makeOff('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
        makeOff('TE', 'TE', 4.8, -0.4, 'CHIP_RELEASE', 'C_RIGHT', null, null, 'OUTSIDE_IN', [
          { x: 5.5, y: 4.0 },
          { x: 12.5, y: 5.5 },
        ], 3),
        makeOff('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -14.5, y: 11.0 },
          { x: -6.0, y: 11.0 },
        ], 1),
        makeOff('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -7.5, y: 16.0 },
        ], 2),
        makeOff('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 14.5, y: 14.0 },
          { x: 19.0, y: 17.0 },
        ], 2),
        qb,
        makeOff('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [
          { x: -4.0, y: 2.0 },
        ], 4),
      ];
    },
  },
  {
    id: 'PASS_DAGGER',
    name: '11P Dagger (50 Half-Slide / Dig)',
    category: 'PASS',
    personnel: '11 PERS',
    conceptFamily: 'DROPBACK_INTERMEDIATE',
    build: () => [
      makeOff('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
      makeOff('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
      makeOff('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45'),
      makeOff('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
      makeOff('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
      makeOff('TE', 'TE', 4.8, -0.4, 'PASS_SET', 'C_RIGHT', null, null, 'OUTSIDE_IN'),
      makeOff('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -14.5, y: 11.0 },
        { x: -6.0, y: 11.0 },
      ], 1),
      makeOff('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -7.5, y: 16.0 },
      ], 2),
      makeOff('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.5, y: 14.0 },
        { x: 19.0, y: 17.0 },
      ], 2),
      makeOff('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.2 }]),
      makeOff('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [
        { x: -4.0, y: 2.0 },
      ], 4),
    ],
  },
  {
    id: 'PASS_QUICK_SLANT',
    name: '11P Quick Slant-Flat (3-Step Rhythm)',
    category: 'PASS',
    personnel: '11 PERS',
    conceptFamily: 'QUICK_GAME',
    build: () => [
      makeOff('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'JUMP_SET'),
      makeOff('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'JUMP_SET'),
      makeOff('C', 'C', 0.0, -0.2, 'PASS_SET', 'JUMP_SET'),
      makeOff('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'JUMP_SET'),
      makeOff('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'JUMP_SET'),
      makeOff('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 5.2, y: 4.5 },
        { x: 9.0, y: 5.0 },
      ], 3),
      makeOff('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -14.2, y: 3.2 },
        { x: -7.5, y: 7.0 },
      ], 1),
      makeOff('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -10.5, y: 2.5 },
        { x: -14.5, y: 4.0 },
      ], 2),
      makeOff('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.2, y: 3.2 },
        { x: 8.0, y: 7.0 },
      ], 2),
      makeOff('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -5.2 }]),
      makeOff('RB', 'RB', -1.5, -4.5, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [
        { x: -5.0, y: 1.5 },
      ], 4),
    ],
  },
  {
    id: 'PASS_MESH',
    name: '11P Mesh Shallow Crossers',
    category: 'PASS',
    personnel: '11 PERS',
    conceptFamily: 'MAN_BEATER_UNDERNEATH',
    build: () => [
      makeOff('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
      makeOff('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
      makeOff('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45'),
      makeOff('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
      makeOff('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
      makeOff('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 2.0, y: 4.2 },
        { x: -8.5, y: 4.8 },
      ], 2),
      makeOff('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -14.5, y: 10.0 },
        { x: -7.5, y: 10.0 },
      ], 3),
      makeOff('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -2.0, y: 3.8 },
        { x: 9.0, y: 4.5 },
      ], 1),
      makeOff('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.5, y: 12.0 },
        { x: 18.5, y: 15.5 },
      ], 3),
      makeOff('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.0 }]),
      makeOff('RB', 'RB', 1.5, -4.6, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 8.5, y: -1.0 },
        { x: 12.5, y: 8.0 },
      ], 4),
    ],
  },
  {
    id: 'PASS_FOUR_VERTS',
    name: '11P Four Verticals Seam Bender',
    category: 'PASS',
    personnel: '11 PERS',
    conceptFamily: 'DEEP_VERTICALS',
    build: () => [
      makeOff('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
      makeOff('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
      makeOff('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45'),
      makeOff('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
      makeOff('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
      makeOff('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 4.8, y: 10.0 },
        { x: 2.0, y: 18.0 },
      ], 2),
      makeOff('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -14.5, y: 18.5 },
      ], 1),
      makeOff('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -7.0, y: 17.5 },
      ], 2),
      makeOff('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.5, y: 18.5 },
      ], 3),
      makeOff('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.5 }]),
      makeOff('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [
        { x: 0.0, y: 3.2 },
      ], 4),
    ],
  },
  {
    id: 'RUN_DUO',
    name: '12P Duo Double-Climb',
    category: 'RUN',
    personnel: '12 PERS',
    conceptFamily: 'GAP_POWER',
    build: () => [
      makeOff('LT', 'LT', -3.2, -0.4, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
      makeOff('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL'),
      makeOff('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      makeOff('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'NEUTRAL'),
      makeOff('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
      makeOff('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
      makeOff('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
      makeOff('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
      makeOff('SL', 'TE', -4.8, -0.4, 'MAN_BLOCK', 'C_LEFT', 'SS', null, 'OUTSIDE_IN'),
      makeOff('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.4, y: -4.8 }]),
      makeOff('RB', 'RB', -1.2, -4.8, 'BALL_CARRIER', 'B_RIGHT', null, null, 'NEUTRAL', [
        { x: 0.8, y: -1.5 },
        { x: 2.1, y: 4.0 },
        { x: 2.4, y: 14.0 },
      ]),
    ],
  },
  {
    id: 'RUN_POWER_PULL',
    name: '21P Power O (LG Pull + Kick)',
    category: 'RUN',
    personnel: '21 PERS',
    conceptFamily: 'GAP_POWER',
    build: () => [
      makeOff('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'),
      makeOff('LG', 'LG', -1.6, -0.3, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
        { x: -0.5, y: -1.4 },
        { x: 2.8, y: -1.1 },
        { x: 3.4, y: 3.8 },
      ]),
      makeOff('C', 'C', 0.0, -0.2, 'MAN_BLOCK', 'A_LEFT', 'NT', null, 'OUTSIDE_IN'),
      makeOff('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
      makeOff('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
      makeOff('TE', 'TE', 4.8, -0.4, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
        { x: 4.2, y: 0.4 },
        { x: 4.9, y: 1.4 },
      ]),
      makeOff('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14, y: 12 }]),
      makeOff('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
      makeOff('SL', 'FB', 0.0, -3.2, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
        { x: 3.6, y: -0.5 },
        { x: 4.5, y: 1.2 },
      ]),
      makeOff('QB', 'QB', 0.0, -1.8, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: -3.5 }]),
      makeOff('RB', 'RB', 0.0, -5.2, 'BALL_CARRIER', 'C_RIGHT', null, null, 'NEUTRAL', [
        { x: 2.8, y: -1.0 },
        { x: 3.5, y: 6.0 },
        { x: 4.2, y: 15.0 },
      ]),
    ],
  },
  {
    id: 'RUN_INSIDE_ZONE',
    name: '11P Inside Zone Read',
    category: 'RUN',
    personnel: '11 PERS',
    conceptFamily: 'ZONE_RUN',
    build: () => [
      makeOff('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'OUTSIDE_IN'),
      makeOff('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      makeOff('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      makeOff('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
      makeOff('RT', 'RT', 3.2, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
      makeOff('TE', 'TE', 4.5, -1.2, 'PULL_TRAP', 'C_LEFT', 'RDE', null, 'INSIDE_OUT', [
        { x: 0.0, y: -1.2 },
        { x: -3.6, y: 0.2 },
        { x: -4.2, y: 1.5 },
      ]),
      makeOff('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
      makeOff('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
      makeOff('SL', 'SL', -7.0, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN'),
      makeOff('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.0, y: -4.8 }]),
      makeOff('RB', 'RB', -1.4, -4.6, 'BALL_CARRIER', 'A_RIGHT', null, null, 'NEUTRAL', [
        { x: 0.4, y: -1.2 },
        { x: 1.2, y: 4.5 },
        { x: 1.5, y: 15.0 },
      ]),
    ],
  },
  {
    id: 'RUN_OUTSIDE_ZONE',
    name: '11P Wide Zone Stretch',
    category: 'RUN',
    personnel: '11 PERS',
    conceptFamily: 'ZONE_RUN',
    build: () => [
      makeOff('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'C_LEFT', 'RDE', null, 'OUTSIDE_IN'),
      makeOff('LG', 'LG', -1.6, -0.3, 'GAP_ZONE', 'B_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      makeOff('C', 'C', 0.0, -0.2, 'GAP_ZONE', 'A_LEFT', 'NT', 'MIKE', 'OUTSIDE_IN'),
      makeOff('RG', 'RG', 1.6, -0.3, 'GAP_ZONE', 'A_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
      makeOff('RT', 'RT', 3.2, -0.4, 'GAP_ZONE', 'B_RIGHT', 'LDE', null, 'OUTSIDE_IN'),
      makeOff('TE', 'TE', -4.8, -0.4, 'GAP_ZONE', 'D_ALLEY', 'RDE', null, 'OUTSIDE_IN'),
      makeOff('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'OUTSIDE_IN'),
      makeOff('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.5, y: 10.0 }]),
      makeOff('SL', 'SL', -7.2, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN'),
      makeOff('QB', 'QB', 0.0, -2.0, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 2.5, y: -4.2 }]),
      makeOff('RB', 'RB', 0.0, -5.2, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: -3.8, y: -1.5 },
        { x: -6.2, y: 2.5 },
        { x: -7.5, y: 14.0 },
      ]),
    ],
  },
  {
    id: 'RUN_PIN_PULL',
    name: '12P Pin & Pull Perimeter Sweep',
    category: 'RUN',
    personnel: '12 PERS',
    conceptFamily: 'GAP_POWER',
    build: () => [
      makeOff('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'),
      makeOff('LG', 'LG', -1.6, -0.3, 'PULL_LEAD', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN', [
        { x: 1.0, y: -1.4 },
        { x: 6.2, y: -0.8 },
        { x: 8.2, y: 3.5 },
      ]),
      makeOff('C', 'C', 0.0, -0.2, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
        { x: 2.0, y: -1.2 },
        { x: 5.0, y: -0.5 },
        { x: 6.2, y: 3.0 },
      ]),
      makeOff('RG', 'RG', 1.6, -0.3, 'MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT'),
      makeOff('RT', 'RT', 3.2, -0.4, 'MAN_BLOCK', 'B_RIGHT', 'LDE', null, 'INSIDE_OUT'),
      makeOff('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
      makeOff('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.0, y: 10.0 }]),
      makeOff('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
      makeOff('SL', 'TE', -4.8, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'INSIDE_OUT'),
      makeOff('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: -4.8 }]),
      makeOff('RB', 'RB', 1.2, -4.6, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 5.2, y: -1.4 },
        { x: 7.5, y: 2.8 },
        { x: 8.8, y: 14.0 },
      ]),
    ],
  },
];

// ============================================================================
// DEFENSIVE SCHEME DEFINITIONS (All 16 Canonical NFL Looks)
// ============================================================================

interface DefensiveLookDef {
  id: string;
  name: string;
  family: string;
  personnel: string;
  coverageShell: string;
  build: () => SimAgent[];
}

function makeDef(
  id: string,
  pos: string,
  x: number,
  y: number,
  role: any,
  tx: number,
  ty: number,
  manTargetId?: string,
  ratings = { speed: 85, accel: 87, power: 86, finesse: 86, awareness: 86 }
): SimAgent {
  return {
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
    defAssignment: { role, targetX: tx, targetY: ty, manTargetId },
  };
}

const DEFENSIVE_LOOKS: DefensiveLookDef[] = [
  // 1. 4-2-5 Nickel Family
  {
    id: 'NICKEL_OVER_C3',
    name: 'Nickel Over Cover 3 Sky',
    family: 'NICKEL_425',
    personnel: '4-2-5 Nickel',
    coverageShell: 'COVER_3',
    build: () => [
      makeDef('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
      makeDef('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 72, accel: 80, power: 92, finesse: 76, awareness: 85 }),
      makeDef('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 84, awareness: 85 }),
      makeDef('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
      makeDef('WILL', 'WILL', -2.2, 4.2, 'READ_RUN_PASS', -2.5, 3.5),
      makeDef('MIKE', 'MIKE', 1.2, 4.2, 'READ_RUN_PASS', 1.5, 3.5),
      makeDef('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -7.5, 4.8),
      makeDef('CB1', 'CB', -14.2, 6.0, 'DEEP_THIRD', -14.0, 16.0),
      makeDef('CB2', 'CB', 14.2, 6.0, 'DEEP_THIRD', 14.0, 16.0),
      makeDef('SS', 'SS', 5.8, 5.0, 'CURL_FLAT', 7.5, 4.8),
      makeDef('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
    ],
  },
  {
    id: 'NICKEL_UNDER_C1',
    name: 'Nickel Under Cover 1 Robber',
    family: 'NICKEL_425',
    personnel: '4-2-5 Nickel',
    coverageShell: 'COVER_1',
    build: () => [
      makeDef('LDE', 'DE', -4.4, 0.6, 'CONTAIN_EDGE', -3.8, -5.0),
      makeDef('3T', 'DT', -2.1, 0.5, 'RUSH_GAP', -1.8, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 85, awareness: 85 }),
      makeDef('NT', 'NT', 0.8, 0.5, 'RUSH_GAP', 0.5, -4.0, undefined, { speed: 72, accel: 80, power: 92, finesse: 78, awareness: 85 }),
      makeDef('RDE', 'EDGE', 5.2, 0.6, 'BLITZ_EDGE', 4.0, -5.0, undefined, { speed: 87, accel: 88, power: 84, finesse: 89, awareness: 86 }),
      makeDef('WILL', 'WILL', -1.2, 4.2, 'HOOK_CURL', -1.5, 3.5),
      makeDef('MIKE', 'MIKE', 2.2, 4.2, 'HOOK_CURL', 2.0, 3.5),
      makeDef('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL', { speed: 91, accel: 90, power: 68, finesse: 82, awareness: 88 }),
      makeDef('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 93, accel: 92, power: 65, finesse: 85, awareness: 88 }),
      makeDef('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, accel: 91, power: 65, finesse: 85, awareness: 88 }),
      makeDef('SS', 'SS', 0.0, 6.0, 'ROBBER', 0.0, 6.5, undefined, { speed: 88, accel: 88, power: 78, finesse: 80, awareness: 90 }),
      makeDef('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0, undefined, { speed: 91, accel: 89, power: 68, finesse: 82, awareness: 89 }),
    ],
  },
  {
    id: 'NICKEL_SIM_C2',
    name: 'Nickel Sim Pressure Cover 2',
    family: 'NICKEL_425',
    personnel: '4-2-5 Nickel',
    coverageShell: 'COVER_2',
    build: () => [
      makeDef('LDE', 'DE', -4.2, 0.6, 'CURL_FLAT', -5.5, 3.8, undefined, { speed: 80, accel: 82, power: 85, finesse: 82, awareness: 85 }),
      makeDef('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 72, accel: 80, power: 92, finesse: 76, awareness: 85 }),
      makeDef('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 84, awareness: 85 }),
      makeDef('RDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0, undefined, { speed: 86, accel: 88, power: 85, finesse: 88, awareness: 86 }),
      makeDef('NCB', 'NI', -6.8, 2.5, 'BLITZ_EDGE', -3.5, -4.5, undefined, { speed: 91, accel: 92, power: 70, finesse: 82, awareness: 88 }),
      makeDef('WILL', 'WILL', -2.5, 4.2, 'HOOK_CURL', -3.0, 4.0),
      makeDef('MIKE', 'MIKE', 0.0, 4.2, 'HOOK_CURL', 0.0, 11.0, undefined, { speed: 87, accel: 88, power: 84, finesse: 82, awareness: 90 }),
      makeDef('CB1', 'CB', -14.2, 4.5, 'CURL_FLAT', -13.5, 4.5),
      makeDef('CB2', 'CB', 14.2, 4.5, 'CURL_FLAT', 13.5, 4.5),
      makeDef('FS', 'FS', -7.5, 12.5, 'DEEP_HALF', -8.5, 17.0),
      makeDef('SS', 'SS', 7.5, 12.5, 'DEEP_HALF', 8.5, 17.0),
    ],
  },
  {
    id: 'NICKEL_WIDE9_C3',
    name: 'Nickel Wide-9 Cover 3 (Schwartz)',
    family: 'NICKEL_425',
    personnel: '4-2-5 Nickel',
    coverageShell: 'COVER_3',
    build: () => [
      makeDef('RDE', 'EDGE', -5.8, 0.6, 'CONTAIN_EDGE', -5.2, -5.0, undefined, { speed: 87, accel: 88, power: 84, finesse: 88, awareness: 85 }),
      makeDef('3T', 'DT', -1.8, 0.5, 'RUSH_GAP', -1.5, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 84, awareness: 85 }),
      makeDef('2i', 'DT', 1.8, 0.5, 'RUSH_GAP', 1.5, -4.0, undefined, { speed: 74, accel: 82, power: 91, finesse: 80, awareness: 85 }),
      makeDef('LDE', 'EDGE', 5.8, 0.6, 'CONTAIN_EDGE', 5.2, -5.0, undefined, { speed: 88, accel: 89, power: 85, finesse: 89, awareness: 86 }),
      makeDef('WILL', 'WILL', -1.5, 4.2, 'READ_RUN_PASS', -1.8, 3.5),
      makeDef('MIKE', 'MIKE', 1.5, 4.2, 'READ_RUN_PASS', 1.8, 3.5),
      makeDef('NCB', 'NI', -7.2, 3.2, 'CURL_FLAT', -7.8, 4.8),
      makeDef('CB1', 'CB', -14.2, 6.0, 'DEEP_THIRD', -14.0, 16.0),
      makeDef('CB2', 'CB', 14.2, 6.0, 'DEEP_THIRD', 14.0, 16.0),
      makeDef('SS', 'SS', 5.8, 5.0, 'CURL_FLAT', 7.5, 4.8),
      makeDef('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
    ],
  },
  {
    id: 'NICKEL_SPLIT_C6',
    name: 'Nickel Split-Field Cover 6 (Fangio)',
    family: 'NICKEL_425',
    personnel: '4-2-5 Nickel',
    coverageShell: 'COVER_6',
    build: () => [
      makeDef('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
      makeDef('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0),
      makeDef('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0),
      makeDef('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
      makeDef('WILL', 'WILL', -2.2, 4.2, 'HOOK_CURL', -2.5, 3.5),
      makeDef('MIKE', 'MIKE', 1.2, 4.2, 'HOOK_CURL', 1.5, 3.5),
      makeDef('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -7.5, 4.8),
      makeDef('CB1', 'CB', -14.2, 6.5, 'QUARTERS_MATCH', -14.0, 15.0),
      makeDef('FS', 'FS', -5.5, 11.5, 'QUARTERS_MATCH', -6.0, 16.0),
      makeDef('CB2', 'CB', 14.2, 4.2, 'CURL_FLAT', 13.5, 4.5),
      makeDef('SS', 'SS', 7.5, 12.5, 'DEEP_HALF', 8.5, 17.0),
    ],
  },
  {
    id: 'NICKEL_FIRE_ZONE',
    name: 'Nickel 5-Man Fire Zone 3-Under 3-Deep',
    family: 'NICKEL_425',
    personnel: '4-2-5 Nickel',
    coverageShell: 'FIRE_ZONE_3',
    build: () => [
      makeDef('RDE', 'EDGE', -4.4, 0.6, 'BLITZ_EDGE', -3.8, -5.0),
      makeDef('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0),
      makeDef('3T', 'DT', 1.8, 0.5, 'RUSH_GAP', 1.5, -4.0),
      makeDef('WILL', 'WILL', -1.5, 4.2, 'BLITZ_A', -0.8, -4.5),
      makeDef('LDE', 'DE', 4.8, 0.6, 'CURL_FLAT', 5.5, 3.5),
      makeDef('MIKE', 'MIKE', 0.8, 4.2, 'HOOK_CURL', 1.0, 4.0),
      makeDef('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -7.5, 4.5),
      makeDef('CB1', 'CB', -14.2, 6.5, 'DEEP_THIRD', -14.0, 16.0),
      makeDef('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
      makeDef('CB2', 'CB', 14.2, 6.5, 'DEEP_THIRD', 14.0, 16.0),
      makeDef('SS', 'SS', 5.5, 5.0, 'HOOK_CURL', 6.0, 5.5),
    ],
  },
  // 2. Vikings / Flores Family
  {
    id: 'VIKINGS_MUG_CROSSDOG_C0',
    name: 'Vikings 3-2-6 Mug Cross-Dog Cover 0 Run Blitz',
    family: 'VIKINGS_FLORES',
    personnel: '3-2-6 Mug',
    coverageShell: 'COVER_0',
    build: () => [
      makeDef('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0),
      makeDef('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0),
      makeDef('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0),
      makeDef('WILL', 'WILL', -0.7, 1.1, 'BLITZ_RUN_GAP', -0.6, -1.5, undefined, { speed: 92, accel: 94, power: 85, finesse: 86, awareness: 90 }),
      makeDef('MIKE', 'MIKE', 0.7, 1.1, 'CROSS_DOG', 0.6, -1.5, undefined, { speed: 90, accel: 92, power: 85, finesse: 86, awareness: 90 }),
      makeDef('SS', 'SS', 5.2, 2.2, 'BLITZ_EDGE_CRASH', 3.5, -5.0, undefined, { speed: 91, accel: 92, power: 80, finesse: 85, awareness: 90 }),
      makeDef('NCB', 'NI', -6.8, 1.8, 'MAN_COV', -7.5, 1.5, 'SL', { speed: 91, accel: 90, power: 68, finesse: 82, awareness: 88 }),
      makeDef('CB1', 'CB', -14.2, 1.8, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 93, accel: 92, power: 65, finesse: 85, awareness: 88 }),
      makeDef('CB2', 'CB', 14.2, 1.8, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, accel: 91, power: 65, finesse: 85, awareness: 88 }),
      makeDef('FS', 'FS', -2.5, 2.8, 'MAN_COV', -2.0, 1.5, 'RB', { speed: 91, accel: 89, power: 68, finesse: 82, awareness: 89 }),
      makeDef('DIME', 'DB', 5.8, 2.2, 'MAN_COV', 5.0, 1.5, 'TE', { speed: 89, accel: 88, power: 78, finesse: 80, awareness: 88 }),
    ],
  },
  {
    id: 'VIKINGS_A_GAP_SIM_C3',
    name: 'Vikings 3-2-6 A-Gap Sim Pressure Cover 3',
    family: 'VIKINGS_FLORES',
    personnel: '3-2-6 Mug',
    coverageShell: 'COVER_3',
    build: () => [
      makeDef('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0),
      makeDef('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0),
      makeDef('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0),
      makeDef('WILL', 'WILL', -0.7, 1.1, 'HOOK_CURL', -2.2, 4.0),
      makeDef('MIKE', 'MIKE', 0.7, 1.1, 'HOOK_CURL', 2.2, 4.0),
      makeDef('SS', 'SS', 5.2, 1.8, 'BLITZ_EDGE', 4.0, -5.0),
      makeDef('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -7.5, 4.5),
      makeDef('CB1', 'CB', -14.2, 6.0, 'DEEP_THIRD', -14.0, 16.0),
      makeDef('CB2', 'CB', 14.2, 6.0, 'DEEP_THIRD', 14.0, 16.0),
      makeDef('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
      makeDef('DIME', 'DB', 5.8, 4.2, 'CURL_FLAT', 7.5, 4.8),
    ],
  },
  {
    id: 'VIKINGS_SAFETY_BLITZ_C1',
    name: 'Vikings Safety Edge Crash Cover 1',
    family: 'VIKINGS_FLORES',
    personnel: '4-2-5 Nickel',
    coverageShell: 'COVER_1',
    build: () => [
      makeDef('LDE', 'DE', -4.4, 0.6, 'CONTAIN_EDGE', -3.8, -5.0),
      makeDef('3T', 'DT', -2.1, 0.5, 'RUSH_GAP', -1.8, -4.0),
      makeDef('NT', 'NT', 0.8, 0.5, 'RUSH_GAP', 0.5, -4.0),
      makeDef('RDE', 'DE', 4.5, 0.6, 'SPILL', 3.8, -1.0),
      makeDef('SS', 'SS', 5.6, 1.2, 'BLITZ_EDGE_CRASH', 3.5, -5.0, undefined, { speed: 91, accel: 92, power: 80, finesse: 85, awareness: 92 }),
      makeDef('WILL', 'WILL', -1.2, 4.2, 'MAN_COV', -1.5, 1.5, 'RB'),
      makeDef('MIKE', 'MIKE', 2.2, 4.2, 'ROBBER', 0.0, 6.0),
      makeDef('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL'),
      makeDef('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1'),
      makeDef('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2'),
      makeDef('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0),
    ],
  },
  // 3. Base 3-4 & 4-3 Family
  {
    id: 'BASE_34_BEAR_C4',
    name: 'Base 3-4 Bear Tite Front Cover 4 (Fangio)',
    family: 'BASE_HEAVY',
    personnel: '3-4 Base',
    coverageShell: 'COVER_4',
    build: () => [
      makeDef('LOLB', 'EDGE', -5.0, 0.6, 'CONTAIN_EDGE', -4.2, -5.0),
      makeDef('4i_L', 'DE', -2.2, 0.5, 'RUSH_GAP', -1.9, -4.0, undefined, { speed: 75, accel: 80, power: 90, finesse: 82, awareness: 85 }),
      makeDef('0T_NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 70, accel: 76, power: 94, finesse: 74, awareness: 86 }),
      makeDef('4i_R', 'DE', 2.2, 0.5, 'RUSH_GAP', 1.9, -4.0, undefined, { speed: 75, accel: 80, power: 90, finesse: 82, awareness: 85 }),
      makeDef('ROLB', 'EDGE', 5.4, 0.6, 'CONTAIN_EDGE', 4.5, -5.0),
      makeDef('WILL', 'ILB', -1.2, 4.5, 'READ_RUN_PASS', -1.5, 3.8),
      makeDef('MIKE', 'ILB', 1.2, 4.5, 'READ_RUN_PASS', 1.5, 3.8),
      makeDef('CB1', 'CB', -14.0, 7.0, 'QUARTERS_MATCH', -14.0, 15.0),
      makeDef('CB2', 'CB', 14.0, 7.0, 'QUARTERS_MATCH', 14.0, 15.0),
      makeDef('FS', 'FS', -5.0, 10.5, 'QUARTERS_MATCH', -6.0, 16.0),
      makeDef('SS', 'SS', 5.0, 10.5, 'QUARTERS_MATCH', 6.0, 16.0),
    ],
  },
  {
    id: 'BASE_34_OKIE_C2',
    name: 'Base 3-4 Okie 2-Gap Front Tampa 2',
    family: 'BASE_HEAVY',
    personnel: '3-4 Base',
    coverageShell: 'COVER_2',
    build: () => [
      makeDef('LOLB', 'OLB', -5.2, 0.6, 'CONTAIN_EDGE', -4.5, -5.0),
      makeDef('4T_L', 'DE', -2.4, 0.5, 'RUSH_GAP', -2.0, -4.0, undefined, { speed: 74, accel: 78, power: 92, finesse: 78, awareness: 86 }),
      makeDef('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 68, accel: 74, power: 96, finesse: 72, awareness: 88 }),
      makeDef('4T_R', 'DE', 2.4, 0.5, 'RUSH_GAP', 2.0, -4.0, undefined, { speed: 74, accel: 78, power: 92, finesse: 78, awareness: 86 }),
      makeDef('ROLB', 'OLB', 5.2, 0.6, 'CONTAIN_EDGE', 4.5, -5.0),
      makeDef('WILL', 'ILB', -1.5, 4.5, 'READ_RUN_PASS', -1.8, 3.8),
      makeDef('MIKE', 'ILB', 1.5, 4.5, 'READ_RUN_PASS', 1.8, 3.8),
      makeDef('CB1', 'CB', -14.2, 4.2, 'CURL_FLAT', -13.5, 4.5),
      makeDef('CB2', 'CB', 14.2, 4.2, 'CURL_FLAT', 13.5, 4.5),
      makeDef('FS', 'FS', -7.5, 12.5, 'DEEP_HALF', -8.5, 17.0),
      makeDef('SS', 'SS', 7.5, 12.5, 'DEEP_HALF', 8.5, 17.0),
    ],
  },
  {
    id: 'BASE_43_OVER_C1',
    name: 'Base 4-3 Over Heavy 8-Man Box Cover 1',
    family: 'BASE_HEAVY',
    personnel: '4-3 Base Heavy',
    coverageShell: 'COVER_1',
    build: () => [
      makeDef('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
      makeDef('NT', 'NT', -1.0, 0.5, 'RUSH_GAP', -0.6, -4.0, undefined, { speed: 72, accel: 78, power: 93, finesse: 76, awareness: 85 }),
      makeDef('3T', 'DT', 1.8, 0.5, 'RUSH_GAP', 1.5, -4.0, undefined, { speed: 76, accel: 84, power: 91, finesse: 84, awareness: 86 }),
      makeDef('LDE', 'DE', 4.5, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
      makeDef('WILL', 'WLB', -2.5, 4.5, 'READ_RUN_PASS', -2.8, 3.8),
      makeDef('MIKE', 'MLB', 0.5, 4.5, 'READ_RUN_PASS', 0.8, 3.8),
      makeDef('SAM', 'SLB', 5.2, 1.5, 'FORCE_ALLEY', 5.0, 2.5),
      makeDef('SS', 'SS', 4.8, 4.8, 'ROBBER', 4.5, 5.5),
      makeDef('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1'),
      makeDef('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2'),
      makeDef('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0),
    ],
  },
  // 4. Dime & Sub Family
  {
    id: 'DIME_MUG_C0',
    name: 'Dime 3-2-6 Mug Cover 0 House Blitz',
    family: 'DIME_SUB',
    personnel: '3-2-6 Dime',
    coverageShell: 'COVER_0',
    build: () => [
      makeDef('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0),
      makeDef('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0),
      makeDef('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0),
      makeDef('WILL', 'WILL', -0.8, 1.1, 'BLITZ_A', -0.5, -4.5),
      makeDef('MIKE', 'MIKE', 0.8, 1.1, 'BLITZ_A', 0.5, -4.5),
      makeDef('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL'),
      makeDef('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1'),
      makeDef('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2'),
      makeDef('SS', 'SS', 5.8, 2.8, 'MAN_COV', 5.0, 1.5, 'TE'),
      makeDef('FS', 'FS', -2.5, 3.2, 'MAN_COV', -2.0, 1.5, 'RB'),
      makeDef('DIME', 'DB', 5.2, 4.0, 'BLITZ_EDGE', 4.5, -5.0),
    ],
  },
  {
    id: 'DIME_QUARTERS_MATCH',
    name: 'Dime 4-1-6 Palms Match Quarters (Saban)',
    family: 'DIME_SUB',
    personnel: '4-1-6 Dime',
    coverageShell: 'COVER_4_MATCH',
    build: () => [
      makeDef('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
      makeDef('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0),
      makeDef('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0),
      makeDef('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
      makeDef('MIKE', 'MLB', 0.0, 4.2, 'HOOK_CURL', 0.0, 4.5),
      makeDef('NCB', 'NI', -6.5, 3.5, 'CURL_FLAT', -7.0, 5.0),
      makeDef('DIME', 'DB', 6.5, 3.5, 'CURL_FLAT', 7.0, 5.0),
      makeDef('CB1', 'CB', -14.2, 6.8, 'QUARTERS_MATCH', -14.0, 15.0),
      makeDef('CB2', 'CB', 14.2, 6.8, 'QUARTERS_MATCH', 14.0, 15.0),
      makeDef('FS', 'FS', -5.5, 11.0, 'QUARTERS_MATCH', -6.0, 16.0),
      makeDef('SS', 'SS', 5.5, 11.0, 'QUARTERS_MATCH', 6.0, 16.0),
    ],
  },
  {
    id: 'DIME_CORNER_CAT_C2',
    name: 'Dime Corner Cat Blitz Invert Cover 2 (Spagnuolo)',
    family: 'DIME_SUB',
    personnel: '3-2-6 Dime',
    coverageShell: 'COVER_2_INVERT',
    build: () => [
      makeDef('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
      makeDef('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0),
      makeDef('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0),
      makeDef('LDE', 'EDGE', 4.5, 0.6, 'RUSH_GAP', 3.8, -5.0),
      makeDef('CB2', 'CB', 14.2, 2.5, 'BLITZ_EDGE_CRASH', 5.5, -5.0, undefined, { speed: 92, accel: 92, power: 65, finesse: 85, awareness: 88 }),
      makeDef('WILL', 'WILL', -2.2, 4.2, 'HOOK_CURL', -2.5, 3.5),
      makeDef('MIKE', 'MIKE', 1.2, 4.2, 'HOOK_CURL', 1.5, 3.5),
      makeDef('NCB', 'NI', -6.8, 3.5, 'CURL_FLAT', -7.5, 4.8),
      makeDef('CB1', 'CB', -14.2, 4.5, 'CURL_FLAT', -13.5, 4.5),
      makeDef('FS', 'FS', -6.5, 12.5, 'DEEP_HALF', -8.0, 17.0),
      makeDef('SS', 'SS', 7.5, 12.0, 'DEEP_HALF', 8.5, 17.0),
    ],
  },
  // 5. Goal Line Family
  {
    id: 'GOAL_LINE_62_PINCH',
    name: 'Goal Line 6-2 Jumbo Pinch & Jam',
    family: 'GOAL_LINE',
    personnel: '6-2 Jumbo',
    coverageShell: 'GOAL_LINE_JAM',
    build: () => [
      makeDef('DE_L', 'DE', -4.8, 0.5, 'CONTAIN_EDGE', -4.2, -3.5, undefined, { speed: 76, accel: 80, power: 90, finesse: 80, awareness: 85 }),
      makeDef('DT_L', 'DT', -2.8, 0.5, 'SPILL', -2.0, -1.0, undefined, { speed: 72, accel: 78, power: 93, finesse: 76, awareness: 85 }),
      makeDef('NT_L', 'NT', -0.9, 0.5, 'RUSH_GAP', -0.5, -2.5, undefined, { speed: 70, accel: 76, power: 95, finesse: 74, awareness: 85 }),
      makeDef('NT_R', 'NT', 0.9, 0.5, 'RUSH_GAP', 0.5, -2.5, undefined, { speed: 70, accel: 76, power: 95, finesse: 74, awareness: 85 }),
      makeDef('DT_R', 'DT', 2.8, 0.5, 'SPILL', 2.0, -1.0, undefined, { speed: 72, accel: 78, power: 93, finesse: 76, awareness: 85 }),
      makeDef('DE_R', 'DE', 4.8, 0.5, 'CONTAIN_EDGE', 4.2, -3.5, undefined, { speed: 76, accel: 80, power: 90, finesse: 80, awareness: 85 }),
      makeDef('WILL', 'ILB', -1.5, 3.2, 'READ_RUN_PASS', -1.2, 1.8, undefined, { speed: 84, accel: 86, power: 86, finesse: 82, awareness: 86 }),
      makeDef('MIKE', 'ILB', 1.5, 3.2, 'READ_RUN_PASS', 1.2, 1.8, undefined, { speed: 84, accel: 86, power: 86, finesse: 82, awareness: 86 }),
      makeDef('CB1', 'CB', -13.5, 1.5, 'MAN_COV', -13.5, 1.0, 'WR1', { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
      makeDef('CB2', 'CB', 13.5, 1.5, 'MAN_COV', 13.5, 1.0, 'WR2', { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
      makeDef('FS', 'FS', 0.0, 6.5, 'ROBBER', 0.0, 5.0, undefined, { speed: 89, accel: 88, power: 76, finesse: 80, awareness: 88 }),
    ],
  },
];

// ============================================================================
// SIMULATION DATA STRUCTURES
// ============================================================================

export interface CellResult {
  offPlayId: string;
  offPlayName: string;
  offPersonnel: string;
  offCategory: 'PASS' | 'RUN';
  defLookId: string;
  defLookName: string;
  defFamily: string;
  defPersonnel: string;
  repsCount: number;
  meanEpa: number;
  stdEpa: number;
  successRate: number; // % EPA > 0
  meanYards: number;
  sackRate: number;
  pressureOrStuffRate: number;
  meanTimeToThrowOrGap: number;
  explosiveRate: number; // >= 15y pass, >= 10y run
  macroRps: MacroRPSAnalysis;
}

export interface FactorialMatrixData {
  offensePlayIds: string[];
  defenseLookIds: string[];
  payoffMatrixEpa: number[][]; // [m][n]
  successRateMatrix: number[][]; // [m][n]
  yardsMatrix: number[][]; // [m][n]
  sackRateMatrix: number[][]; // [m][n]
  cells: CellResult[];
}

// ============================================================================
// GAME THEORY SOLVERS (Primal-Dual Simplex & Fictitious Play)
// ============================================================================

export interface NashEquilibriumResult {
  gameValue: number; // Minimax expected EPA
  offenseMixedStrategy: { playId: string; name: string; probability: number }[];
  defenseMixedStrategy: { lookId: string; name: string; probability: number }[];
  fictitiousPlayHistory: {
    iteration: number;
    offenseFreq: number[];
    defenseFreq: number[];
    currentValue: number;
  }[];
}

/**
 * Solve zero-sum game min-max payoff matrix using Fictitious Play (Brown 1951)
 * Offense maximizes EPA, Defense minimizes EPA.
 */
function solveFictitiousPlay(
  matrix: number[][],
  iterations = 10000
): NashEquilibriumResult {
  const m = matrix.length; // Offense actions
  const n = matrix[0].length; // Defense actions

  const offCounts = new Array(m).fill(0);
  const defCounts = new Array(n).fill(0);

  // Cumulative payoff vectors
  const offCumPayoff = new Array(m).fill(0);
  const defCumPayoff = new Array(n).fill(0);

  // Initial random choices
  let offChoice = 0;
  let defChoice = 0;
  offCounts[offChoice]++;
  defCounts[defChoice]++;

  const history: { iteration: number; offenseFreq: number[]; defenseFreq: number[]; currentValue: number }[] = [];

  for (let t = 1; t <= iterations; t++) {
    // Update cumulative payoffs
    for (let i = 0; i < m; i++) {
      offCumPayoff[i] += matrix[i][defChoice];
    }
    for (let j = 0; j < n; j++) {
      defCumPayoff[j] += matrix[offChoice][j];
    }

    // Offense plays Best Response: argmax_i offCumPayoff[i]
    let bestOff = 0;
    let maxOffVal = -Infinity;
    for (let i = 0; i < m; i++) {
      if (offCumPayoff[i] > maxOffVal) {
        maxOffVal = offCumPayoff[i];
        bestOff = i;
      }
    }

    // Defense plays Best Response: argmin_j defCumPayoff[j]
    let bestDef = 0;
    let minDefVal = Infinity;
    for (let j = 0; j < n; j++) {
      if (defCumPayoff[j] < minDefVal) {
        minDefVal = defCumPayoff[j];
        bestDef = j;
      }
    }

    offChoice = bestOff;
    defChoice = bestDef;
    offCounts[offChoice]++;
    defCounts[defChoice]++;

    if (t === 10 || t === 50 || t === 100 || t === 250 || t === 500 || t === 1000 || t === 5000 || t === iterations) {
      const offFreq = offCounts.map((c) => c / (t + 1));
      const defFreq = defCounts.map((c) => c / (t + 1));
      let curVal = 0;
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
          curVal += offFreq[i] * matrix[i][j] * defFreq[j];
        }
      }
      history.push({ iteration: t, offenseFreq: offFreq, defenseFreq: defFreq, currentValue: +curVal.toFixed(4) });
    }
  }

  const totalOff = offCounts.reduce((a, b) => a + b, 0);
  const totalDef = defCounts.reduce((a, b) => a + b, 0);
  const pStar = offCounts.map((c) => c / totalOff);
  const qStar = defCounts.map((c) => c / totalDef);

  let gameVal = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      gameVal += pStar[i] * matrix[i][j] * qStar[j];
    }
  }

  return {
    gameValue: +gameVal.toFixed(4),
    offenseMixedStrategy: pStar.map((prob, idx) => ({
      playId: OFFENSIVE_PLAYS[idx].id,
      name: OFFENSIVE_PLAYS[idx].name,
      probability: +prob.toFixed(4),
    })),
    defenseMixedStrategy: qStar.map((prob, idx) => ({
      lookId: DEFENSIVE_LOOKS[idx].id,
      name: DEFENSIVE_LOOKS[idx].name,
      probability: +prob.toFixed(4),
    })),
    fictitiousPlayHistory: history,
  };
}

// ============================================================================
// MAIN FULL FACTORIAL RUNNER
// ============================================================================

async function runFullFactorialExperiment(repsPerCell = 25): Promise<void> {
  console.log('==========================================================================');
  console.log(`STARTING FULL FACTORIAL EXPERIMENT: ${OFFENSIVE_PLAYS.length} OFF x ${DEFENSIVE_LOOKS.length} DEF = ${OFFENSIVE_PLAYS.length * DEFENSIVE_LOOKS.length} CELLS`);
  console.log(`REPLICATIONS PER CELL: ${repsPerCell} (TOTAL ${OFFENSIVE_PLAYS.length * DEFENSIVE_LOOKS.length * repsPerCell} SIMULATED SNAPS)`);
  console.log('==========================================================================\n');

  const startTime = Date.now();
  const cells: CellResult[] = [];
  const m = OFFENSIVE_PLAYS.length;
  const n = DEFENSIVE_LOOKS.length;

  const payoffMatrixEpa: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  const successRateMatrix: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  const yardsMatrix: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  const sackRateMatrix: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));

  let completedCells = 0;
  const totalCells = m * n;

  for (let i = 0; i < m; i++) {
    const offDef = OFFENSIVE_PLAYS[i];
    for (let j = 0; j < n; j++) {
      const defDef = DEFENSIVE_LOOKS[j];

      // Sample repsPerCell Monte Carlo snapshots
      const epaSamples: number[] = [];
      const yardsSamples: number[] = [];
      let successCount = 0;
      let sackCount = 0;
      let pressureOrStuffCount = 0;
      let explosiveCount = 0;
      let sumTimeToThrow = 0;

      const baseOff = offDef.build();
      const baseDef = defDef.build();
      const initialAgents = [...baseOff, ...baseDef];

      // Macro RPS Analysis
      const macroRps = evaluateMacroMatchup(
        offDef.personnel,
        offDef.id,
        offDef.category,
        defDef.id,
        initialAgents
      );

      for (let r = 0; r < repsPerCell; r++) {
        // Run with stochastic noise for realistic variance
        const noise = r === 0 ? 0.0 : 0.85;
        const traj = engine.simulatePlay(initialAgents, noise);
        const termFrame = traj.find((s) => s.playOver) || traj[traj.length - 1];

        const epa = termFrame.expectedEpa;
        const yds = termFrame.carrierTackledYards ?? 0;
        const isSack = termFrame.terminationReason === 'SACK';
        const isSuccess = epa > 0;
        const isExplosive = offDef.category === 'PASS' ? yds >= 15.0 : yds >= 10.0;
        const isPressureOrStuff =
          offDef.category === 'RUN'
            ? yds <= 1.5
            : isSack || termFrame.pocketIntegrity < 45;

        epaSamples.push(epa);
        yardsSamples.push(yds);
        if (isSuccess) successCount++;
        if (isSack) sackCount++;
        if (isPressureOrStuff) pressureOrStuffCount++;
        if (isExplosive) explosiveCount++;
        sumTimeToThrow += termFrame.timeToThrowOrGapSec ?? termFrame.timeSec;
      }

      // Mean & Std Dev
      const meanEpa = epaSamples.reduce((a, b) => a + b, 0) / repsPerCell;
      const variance =
        epaSamples.reduce((acc, val) => acc + Math.pow(val - meanEpa, 2), 0) /
        repsPerCell;
      const stdEpa = Math.sqrt(variance);

      const meanYards = yardsSamples.reduce((a, b) => a + b, 0) / repsPerCell;
      const successRate = (successCount / repsPerCell) * 100;
      const sackRate = (sackCount / repsPerCell) * 100;
      const pressureRate = (pressureOrStuffCount / repsPerCell) * 100;
      const explosiveRate = (explosiveCount / repsPerCell) * 100;
      const meanTtt = sumTimeToThrow / repsPerCell;

      payoffMatrixEpa[i][j] = +meanEpa.toFixed(3);
      successRateMatrix[i][j] = +successRate.toFixed(1);
      yardsMatrix[i][j] = +meanYards.toFixed(1);
      sackRateMatrix[i][j] = +sackRate.toFixed(1);

      const cellResult: CellResult = {
        offPlayId: offDef.id,
        offPlayName: offDef.name,
        offPersonnel: offDef.personnel,
        offCategory: offDef.category,
        defLookId: defDef.id,
        defLookName: defDef.name,
        defFamily: defDef.family,
        defPersonnel: defDef.personnel,
        repsCount: repsPerCell,
        meanEpa: +meanEpa.toFixed(3),
        stdEpa: +stdEpa.toFixed(3),
        successRate: +successRate.toFixed(1),
        meanYards: +meanYards.toFixed(1),
        sackRate: +sackRate.toFixed(1),
        pressureOrStuffRate: +pressureRate.toFixed(1),
        meanTimeToThrowOrGap: +meanTtt.toFixed(2),
        explosiveRate: +explosiveRate.toFixed(1),
        macroRps,
      };

      cells.push(cellResult);
      completedCells++;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[SUCCESS] Simulated all ${totalCells} cells (${totalCells * repsPerCell} snaps) in ${durationSec}s!\n`);

  // Solve Mixed-Strategy Nash Equilibrium
  console.log('--- SOLVING ITERATED GAME & MIXED-STRATEGY NASH EQUILIBRIUM ---');
  const nash = solveFictitiousPlay(payoffMatrixEpa, 15000);

  console.log(`\n==========================================================================`);
  console.log(`GAME THEORETIC RESULTS: VON NEUMANN MINIMAX EQUILIBRIUM`);
  console.log(`==========================================================================`);
  console.log(`MINIMAX GAME VALUE: ${nash.gameValue >= 0 ? '+' : ''}${nash.gameValue} EPA / play\n`);

  console.log('OFFENSIVE MIXED-STRATEGY NASH EQUILIBRIUM (Optimal Call Distribution):');
  nash.offenseMixedStrategy
    .filter((s) => s.probability >= 0.01)
    .sort((a, b) => b.probability - a.probability)
    .forEach((s) => {
      console.log(`  ${(s.probability * 100).toFixed(1).padStart(5, ' ')}% | ${s.playId.padEnd(22, ' ')} | ${s.name}`);
    });

  console.log('\nDEFENSIVE MIXED-STRATEGY NASH EQUILIBRIUM (Optimal Counter Distribution):');
  nash.defenseMixedStrategy
    .filter((s) => s.probability >= 0.01)
    .sort((a, b) => b.probability - a.probability)
    .forEach((s) => {
      console.log(`  ${(s.probability * 100).toFixed(1).padStart(5, ' ')}% | ${s.lookId.padEnd(24, ' ')} | ${s.name}`);
    });

  // Extract Canonical Rock-Paper-Scissors Cycles
  console.log('\n==========================================================================');
  console.log('IDENTIFIED ROCK-PAPER-SCISSORS EQUILIBRIA CYCLES');
  console.log('==========================================================================');

  // Cycle 1: Play-Action vs Run Blitz vs Hot Quick Game
  const paBoot = cells.find((c) => c.offPlayId === 'PA_UNDER_CENTER_BOOT' && c.defLookId === 'NICKEL_OVER_C3')!;
  const paVsBlitz = cells.find((c) => c.offPlayId === 'PA_UNDER_CENTER_BOOT' && c.defLookId === 'VIKINGS_MUG_CROSSDOG_C0')!;
  const quickVsBlitz = cells.find((c) => c.offPlayId === 'PASS_QUICK_SLANT' && c.defLookId === 'VIKINGS_MUG_CROSSDOG_C0')!;
  const quickVsC3 = cells.find((c) => c.offPlayId === 'PASS_QUICK_SLANT' && c.defLookId === 'NICKEL_OVER_C3')!;

  console.log('\n1. THE MODERN NFL SHANAHAN vs FLORES TACTICAL CYCLE:');
  console.log(`   [Play-Action Bootleg]  vs  [Cover 3 Sky]             -> EPA: ${paBoot.meanEpa >= 0 ? '+' : ''}${paBoot.meanEpa} (LBs baited downhill)`);
  console.log(`   [Play-Action Bootleg]  vs  [Vikings Mug C0 Blitz]    -> EPA: ${paVsBlitz.meanEpa >= 0 ? '+' : ''}${paVsBlitz.meanEpa} (Flores smokes mesh; Sack: ${paVsBlitz.sackRate}%)`);
  console.log(`   [Quick Slant-Flat]     vs  [Vikings Mug C0 Blitz]    -> EPA: ${quickVsBlitz.meanEpa >= 0 ? '+' : ''}${quickVsBlitz.meanEpa} (Hot ball beats blitz; Success: ${quickVsBlitz.successRate}%)`);
  console.log(`   [Quick Slant-Flat]     vs  [Cover 3 Sky]             -> EPA: ${quickVsC3.meanEpa >= 0 ? '+' : ''}${quickVsC3.meanEpa} (Curl/flat defender rallies to tackle)`);

  // Cycle 2: Heavy Duo vs Light Dime vs 8-Man Loaded Box
  const duoVsDime = cells.find((c) => c.offPlayId === 'RUN_DUO' && c.defLookId === 'DIME_QUARTERS_MATCH')!;
  const duoVsHeavy = cells.find((c) => c.offPlayId === 'RUN_DUO' && c.defLookId === 'BASE_43_OVER_C1')!;
  const paVsHeavy = cells.find((c) => c.offPlayId === 'PA_UNDER_CENTER_BOOT' && c.defLookId === 'BASE_43_OVER_C1')!;
  const vertsVsDime = cells.find((c) => c.offPlayId === 'PASS_FOUR_VERTS' && c.defLookId === 'DIME_QUARTERS_MATCH')!;

  console.log('\n2. THE MACRO PERSONNEL & BOX COUNT CYCLE:');
  console.log(`   [12P Duo Double-Climb] vs  [4-1-6 Dime Palms]        -> EPA: ${duoVsDime.meanEpa >= 0 ? '+' : ''}${duoVsDime.meanEpa} (+2 Blocker overmatch, ${duoVsDime.meanYards} yds)`);
  console.log(`   [12P Duo Double-Climb] vs  [Base 4-3 Over 8-Man Box] -> EPA: ${duoVsHeavy.meanEpa >= 0 ? '+' : ''}${duoVsHeavy.meanEpa} (Deficit box, stuffed: ${duoVsHeavy.pressureOrStuffRate}%)`);
  console.log(`   [12P PA Wide Zone Boot] vs [Base 4-3 Over 8-Man Box] -> EPA: ${paVsHeavy.meanEpa >= 0 ? '+' : ''}${paVsHeavy.meanEpa} (8-man box bites; 1-on-1 isolated shot)`);
  console.log(`   [11P Four Verts Seam]  vs  [4-1-6 Dime Palms]        -> EPA: ${vertsVsDime.meanEpa >= 0 ? '+' : ''}${vertsVsDime.meanEpa} (6 DBs bracket deep seams)`);

  // Compile JSON data export
  const exportPayload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      replicationsPerCell: repsPerCell,
      totalSimulatedPlays: totalCells * repsPerCell,
      engineVersion: 'All-22 Kinematic Engine v2.4 (20 Hz)',
      offenseCount: m,
      defenseCount: n,
    },
    offensePlays: OFFENSIVE_PLAYS.map((o) => ({ id: o.id, name: o.name, category: o.category, personnel: o.personnel })),
    defensiveLooks: DEFENSIVE_LOOKS.map((d) => ({ id: d.id, name: d.name, family: d.family, personnel: d.personnel })),
    payoffMatrixEpa,
    successRateMatrix,
    yardsMatrix,
    sackRateMatrix,
    nashEquilibrium: nash,
    cells,
  };

  const outDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'full_factorial_game_theory_results.json');
  fs.writeFileSync(outPath, JSON.stringify(exportPayload, null, 2), 'utf-8');
  console.log(`\n[SUCCESS] Wrote full factorial game theory results to: ${outPath}`);
}

runFullFactorialExperiment(25).catch((err) => {
  console.error('[FATAL EXPERIMENT ERROR]', err);
  process.exit(1);
});
