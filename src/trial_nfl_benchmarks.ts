import { All22KinematicEngine, SimAgent, BlockRoleType, GapOrSetCode, LeverageBias } from './engine';

// ============================================================================
// NFL BENCHMARK EXPECTATION TARGETS (Derived from NFL NGS / PFF / nflfastR)
// ============================================================================
export const NFL_EXPECTATIONS = {
  PASS: {
    PRESSURE_RATE: { min: 28.0, max: 38.0, mean: 33.5 }, // % of dropbacks with pocket < 45% or sack
    SACK_RATE: { min: 5.0, max: 8.5, mean: 6.5 },        // % of dropbacks resulting in sack
    TIME_TO_PRESSURE: { min: 2.30, max: 2.85, mean: 2.55 }, // seconds until pocket integrity < 45%
    TIME_TO_THROW: { min: 2.50, max: 3.10, mean: 2.75 },    // seconds at QB release
    EPA_PER_PLAY: { min: 0.02, max: 0.18, mean: 0.08 },     // NFL average pass EPA
    SUCCESS_RATE: { min: 44.0, max: 50.0, mean: 47.0 },     // % of plays with positive EPA
  },
  RUN: {
    YPC: { min: 4.10, max: 4.55, mean: 4.32 },              // Yards per carry
    STUFF_RATE: { min: 17.0, max: 22.0, mean: 19.5 },       // % carries <= 0 yards
    EXPLOSIVE_RATE: { min: 9.5, max: 13.5, mean: 11.2 },    // % carries >= 10 yards
    SUCCESS_RATE: { min: 39.0, max: 45.0, mean: 42.0 },     // % carries with positive EPA (>= 4 yds)
    EPA_PER_PLAY: { min: -0.09, max: -0.01, mean: -0.05 },  // NFL average rush EPA
  },
};

// Builders for diverse plays
function createAgent(
  id: string, pos: string, side: 'OFF' | 'DEF', x: number, y: number,
  role: BlockRoleType, gap: GapOrSetCode,
  tgt1: string | null = null, tgt2: string | null = null,
  lev: LeverageBias = 'INSIDE_OUT',
  wps: Array<{ x: number; y: number }> = [],
  sp = 80, pwr = 85, fin = 85, acc = 85
): SimAgent {
  return {
    id, label: pos, side, pos,
    startX: x, startY: y, x, y, vx: 0, vy: 0, fx: 0, fy: 0,
    engagedWithId: null, leverageScore: 0,
    ratings: { speed: sp, accel: acc, power: pwr, finesse: fin, awareness: 85 },
    assignment: { role, primaryTargetId: tgt1, secondaryTargetId: tgt2, gapOrSet: gap, leverage: lev, climbOrChipDelaySec: 0.65, waypoints: wps }
  };
}

// 5 Passing Plays
export function buildPassPlay(concept: 'DAGGER' | 'PA_FLOOD' | 'QUICK_SLANT' | 'MESH' | 'FOUR_VERTS'): SimAgent[] {
  const o = (id: string, pos: string, x: number, y: number, role: BlockRoleType, gap: GapOrSetCode, t1: string | null = null, t2: string | null = null, lev: LeverageBias = 'INSIDE_OUT', wps: any[] = [], sp = 78, pwr = 88) =>
    createAgent(id, pos, 'OFF', x, y, role, gap, t1, t2, lev, wps, sp, pwr);

  const ol = [
    o('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
    o('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
    o('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
    o('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
    o('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
  ];

  switch (concept) {
    case 'DAGGER':
      return [
        ...ol,
        o('TE', 'TE', 4.8, -0.4, 'PASS_SET', 'C_RIGHT', null, null, 'OUTSIDE_IN'),
        o('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.5, y: 15.0 }, { x: -4.0, y: 16.0 }], 92, 60), // 16y Dig
        o('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -7.5, y: 22.0 }], 93, 58), // Clearout streak
        o('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.5, y: 5.0 }, { x: 4.0, y: 6.0 }], 90, 60), // Shallow drag
        o('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.5 }], 75, 70),
        o('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [], 88, 75),
      ];

    case 'PA_FLOOD':
      return [
        ...ol,
        o('TE', 'TE', 4.8, -0.4, 'CHIP_RELEASE', 'C_RIGHT', null, null, 'OUTSIDE_IN', [{ x: 5.5, y: 2.0 }, { x: 10.5, y: 3.5 }], 84, 82), // Chip to Flat
        o('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.5, y: 18.0 }, { x: 0.0, y: 19.0 }], 91, 60), // Deep backside cross
        o('SL', 'SL', 8.5, -0.8, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 8.5, y: 12.0 }, { x: 16.0, y: 14.0 }], 91, 60), // 12y Sail/Out
        o('WR2', 'WR', 13.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 13.5, y: 24.0 }], 93, 58), // Deep vertical alert
        o('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.2, y: -7.0 }], 75, 70),
        o('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [], 88, 75),
      ];

    case 'QUICK_SLANT':
      return [
        ...ol,
        o('TE', 'TE', 4.8, -0.4, 'PASS_SET', 'C_RIGHT', null, null, 'OUTSIDE_IN'),
        o('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.5, y: 3.5 }, { x: -6.0, y: 7.5 }], 93, 62), // Quick slant 3-step
        o('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -7.5, y: 2.0 }, { x: -12.0, y: 3.0 }], 90, 60), // Flat route
        o('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.5, y: 3.5 }, { x: 6.0, y: 7.5 }], 93, 62), // Slant right
        o('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -5.0 }], 75, 70), // Quick 3-step drop
        o('RB', 'RB', 1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_RIGHT', null, null, 'INSIDE_OUT', [], 88, 75),
      ];

    case 'MESH':
      return [
        ...ol,
        o('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 4.8, y: 7.0 }, { x: 4.8, y: 12.0 }, { x: 2.0, y: 13.0 }], 84, 80), // TE sit route at 12y
        o('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.5, y: 4.5 }, { x: 12.0, y: 5.5 }], 91, 60), // Mesh cross left-to-right
        o('SL', 'SL', 8.5, -0.8, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 8.5, y: 4.0 }, { x: -12.0, y: 4.5 }], 91, 60), // Mesh cross right-to-left
        o('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.5, y: 16.0 }, { x: 6.0, y: 20.0 }], 93, 58), // Post over top
        o('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.0 }], 75, 70),
        o('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [], 88, 75),
      ];

    case 'FOUR_VERTS':
      return [
        ...ol,
        o('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 4.0, y: 22.0 }], 85, 80), // Right Seam
        o('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.5, y: 24.0 }], 93, 58), // Left Outside Vert
        o('SL', 'SL', -6.5, -0.8, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -4.0, y: 22.0 }], 92, 60), // Left Seam
        o('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.5, y: 24.0 }], 93, 58), // Right Outside Vert
        o('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.8 }], 75, 70), // Deep 7-step drop
        o('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [], 88, 75),
      ];
  }
}

// 5 Rushing Plays
export function buildRunPlay(concept: 'DUO' | 'POWER_O' | 'INSIDE_ZONE' | 'OUTSIDE_ZONE' | 'PIN_PULL'): SimAgent[] {
  const o = (id: string, pos: string, x: number, y: number, role: BlockRoleType, gap: GapOrSetCode, t1: string | null = null, t2: string | null = null, lev: LeverageBias = 'INSIDE_OUT', wps: any[] = [], sp = 78, pwr = 88) =>
    createAgent(id, pos, 'OFF', x, y, role, gap, t1, t2, lev, wps, sp, pwr);

  switch (concept) {
    case 'DUO':
      return [
        o('LT', 'LT', -3.2, -0.4, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
        o('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL'),
        o('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        o('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'NEUTRAL'),
        o('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
        o('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        o('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT', [], 88, 65),
        o('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT', [], 88, 65),
        o('SL', 'SL', -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN', [], 86, 68),
        o('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.4, y: -4.8 }], 75, 70),
        o('RB', 'RB', -1.2, -4.8, 'BALL_CARRIER', 'B_RIGHT', null, null, 'NEUTRAL', [
          { x: 0.8, y: -1.5 }, { x: 2.1, y: 3.5 }, { x: 2.4, y: 12.0 }
        ], 89, 82),
      ];

    case 'POWER_O':
      return [
        o('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'),
        o('LG', 'LG', -1.6, -0.3, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
          { x: -0.5, y: -1.4 }, { x: 2.8, y: -1.1 }, { x: 3.4, y: 3.8 }
        ]),
        o('C', 'C', 0.0, -0.2, 'MAN_BLOCK', 'A_LEFT', 'NT', null, 'OUTSIDE_IN'),
        o('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
        o('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
        o('TE', 'TE', 4.8, -0.4, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [{ x: 4.2, y: 0.4 }, { x: 4.9, y: 1.4 }]),
        o('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14, y: 12 }], 89, 65),
        o('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT', [], 88, 65),
        o('SL', 'FB', 0.0, -3.2, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [{ x: 3.6, y: -0.5 }, { x: 4.5, y: 1.2 }], 82, 85),
        o('QB', 'QB', 0.0, -1.8, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: -3.5 }], 75, 70),
        o('RB', 'RB', 0.0, -5.2, 'BALL_CARRIER', 'C_RIGHT', null, null, 'NEUTRAL', [
          { x: 2.8, y: -1.0 }, { x: 3.5, y: 5.5 }, { x: 4.2, y: 14.0 }
        ], 89, 82),
      ];

    case 'INSIDE_ZONE':
      return [
        o('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'OUTSIDE_IN'),
        o('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL'),
        o('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        o('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'NEUTRAL'),
        o('RT', 'RT', 3.2, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        o('TE', 'TE', 4.8, -0.4, 'GAP_ZONE', 'D_ALLEY', 'LDE', null, 'INSIDE_OUT'),
        o('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT', [], 88, 65),
        o('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT', [], 88, 65),
        o('SL', 'SL', -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN', [], 86, 68),
        o('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -0.5, y: -5.0 }], 75, 70),
        o('RB', 'RB', -1.5, -4.8, 'BALL_CARRIER', 'A_RIGHT', null, null, 'NEUTRAL', [
          { x: 0.4, y: -1.2 }, { x: 0.9, y: 3.5 }, { x: 1.2, y: 12.0 }
        ], 89, 82),
      ];

    case 'OUTSIDE_ZONE':
      return [
        o('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'C_LEFT', 'RDE', null, 'OUTSIDE_IN'),
        o('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'B_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        o('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        o('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', '3T', 'MIKE', 'OUTSIDE_IN'),
        o('RT', 'RT', 3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'LDE', null, 'OUTSIDE_IN'),
        o('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        o('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT', [], 88, 65),
        o('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT', [], 88, 65),
        o('SL', 'SL', -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN', [], 86, 68),
        o('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -4.8 }], 75, 70),
        o('RB', 'RB', -1.5, -4.8, 'BALL_CARRIER', 'C_LEFT', null, null, 'NEUTRAL', [
          { x: -3.5, y: -1.2 }, { x: -5.2, y: 2.5 }, { x: -6.5, y: 12.0 }
        ], 90, 80),
      ];

    case 'PIN_PULL':
      return [
        o('LT', 'LT', -3.2, -0.4, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
        o('LG', 'LG', -1.6, -0.3, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [{ x: 1.0, y: -1.2 }, { x: 4.8, y: -0.5 }, { x: 6.5, y: 3.0 }], 84, 85),
        o('C', 'C', 0.0, -0.2, 'MAN_BLOCK', 'A_LEFT', 'NT', null, 'OUTSIDE_IN'),
        o('RG', 'RG', 1.6, -0.3, 'MAN_BLOCK', 'B_RIGHT', '3T', null, 'INSIDE_OUT'),
        o('RT', 'RT', 3.2, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        o('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        o('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT', [], 88, 65),
        o('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT', [], 88, 65),
        o('SL', 'SL', -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN', [], 86, 68),
        o('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.5, y: -5.0 }], 75, 70),
        o('RB', 'RB', -1.5, -4.8, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
          { x: 0.5, y: -3.6 }, { x: 3.2, y: -1.8 }, { x: 6.0, y: 1.2 }, { x: 7.5, y: 12.0 }
        ], 90, 80),
      ];
  }
}

// 5 Defensive Fronts
export function buildDefense(call: string): SimAgent[] {
  const d = (
    id: string, pos: string, x: number, y: number,
    role: any, targetX: number, targetY: number,
    manTargetId?: string, ratings?: any
  ): SimAgent => createAgent(
    id, pos, 'DEF', x, y, 'MAN_BLOCK', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [],
    ratings?.speed ?? 84, ratings?.power ?? 86, ratings?.finesse ?? 85, ratings?.accel ?? 86
  );

  const assignDef = (agent: SimAgent, role: any, targetX: number, targetY: number, manTargetId?: string) => {
    agent.defAssignment = { role, targetX, targetY, manTargetId };
    return agent;
  };

  switch (call) {
    case 'NICKEL_UNDER_C1':
      return [
        assignDef(d('LDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0), 'CONTAIN_EDGE', -3.5, -5.0),
        assignDef(d('3T', 'DT', -1.8, 0.5, 'RUSH_GAP', -1.5, -4.0, undefined, { speed: 76, power: 90, finesse: 84 }), 'RUSH_GAP', -1.5, -4.0),
        assignDef(d('NT', 'NT', 1.0, 0.5, 'RUSH_GAP', 1.0, -4.0, undefined, { speed: 72, power: 92, finesse: 76 }), 'RUSH_GAP', 1.0, -4.0),
        assignDef(d('RDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0), 'CONTAIN_EDGE', 4.0, -5.0),
        assignDef(d('WILL', 'WILL', -0.5, 4.2, 'READ_RUN_PASS', -0.5, 1.5), 'READ_RUN_PASS', -0.5, 1.5),
        assignDef(d('MIKE', 'MIKE', 2.5, 4.2, 'READ_RUN_PASS', 2.0, 1.5), 'READ_RUN_PASS', 2.0, 1.5),
        assignDef(d('NCB', 'NI', -6.8, 2.5, 'MAN_COV', -6.5, 0.0, 'SL'), 'MAN_COV', -6.5, 0.0, 'SL'),
        assignDef(d('CB1', 'CB', -14.2, 2.5, 'MAN_COV', -14.0, 0.0, 'WR1'), 'MAN_COV', -14.0, 0.0, 'WR1'),
        assignDef(d('CB2', 'CB', 14.2, 2.5, 'MAN_COV', 14.0, 0.0, 'WR2'), 'MAN_COV', 14.0, 0.0, 'WR2'),
        assignDef(d('SS', 'SS', 5.8, 3.0, 'MAN_COV', 5.0, 0.0, 'TE'), 'MAN_COV', 5.0, 0.0, 'TE'),
        assignDef(d('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0), 'DEEP_ZONE', 0.0, 18.0),
      ];

    case 'BASE_34_BEAR_C4':
      return [
        assignDef(d('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 70, power: 94, finesse: 72 }), 'RUSH_GAP', 0.0, -4.0),
        assignDef(d('LDE', 'DE', -2.8, 0.6, 'RUSH_GAP', -2.5, -4.5, undefined, { speed: 78, power: 90, finesse: 82 }), 'RUSH_GAP', -2.5, -4.5),
        assignDef(d('RDE', 'DE', 2.8, 0.6, 'RUSH_GAP', 2.5, -4.5, undefined, { speed: 78, power: 90, finesse: 82 }), 'RUSH_GAP', 2.5, -4.5),
        assignDef(d('LOLB', 'OLB', -4.8, 0.8, 'CONTAIN_EDGE', -4.2, -5.0), 'CONTAIN_EDGE', -4.2, -5.0),
        assignDef(d('ROLB', 'OLB', 4.8, 0.8, 'CONTAIN_EDGE', 4.2, -5.0), 'CONTAIN_EDGE', 4.2, -5.0),
        assignDef(d('WILL', 'ILB', -1.2, 4.5, 'HOOK_CURL', -1.5, 3.8), 'HOOK_CURL', -1.5, 3.8),
        assignDef(d('MIKE', 'ILB', 1.2, 4.5, 'HOOK_CURL', 1.5, 3.8), 'HOOK_CURL', 1.5, 3.8),
        assignDef(d('CB1', 'CB', -14.0, 7.0, 'QUARTERS_MATCH', -14.0, 15.0), 'QUARTERS_MATCH', -14.0, 15.0),
        assignDef(d('CB2', 'CB', 14.0, 7.0, 'QUARTERS_MATCH', 14.0, 15.0), 'QUARTERS_MATCH', 14.0, 15.0),
        assignDef(d('FS', 'FS', -5.0, 10.5, 'QUARTERS_MATCH', -6.0, 16.0), 'QUARTERS_MATCH', -6.0, 16.0),
        assignDef(d('SS', 'SS', 5.0, 10.5, 'QUARTERS_MATCH', 6.0, 16.0), 'QUARTERS_MATCH', 6.0, 16.0),
      ];

    case 'DIME_MUG_C0':
      return [
        assignDef(d('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0), 'RUSH_GAP', -3.0, -5.0),
        assignDef(d('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 74, power: 91, finesse: 80 }), 'RUSH_GAP', 0.0, -4.0),
        assignDef(d('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0), 'RUSH_GAP', 3.0, -5.0),
        assignDef(d('WILL', 'WILL', -0.8, 1.1, 'BLITZ_A', -0.5, -4.5, undefined, { speed: 88, power: 82, finesse: 84 }), 'BLITZ_A', -0.5, -4.5),
        assignDef(d('MIKE', 'MIKE', 0.8, 1.1, 'BLITZ_A', 0.5, -4.5, undefined, { speed: 88, power: 84, finesse: 84 }), 'BLITZ_A', 0.5, -4.5),
        assignDef(d('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL'), 'MAN_COV', -7.5, 1.5, 'SL'),
        assignDef(d('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1'), 'MAN_COV', -14.2, 1.5, 'WR1'),
        assignDef(d('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2'), 'MAN_COV', 14.2, 1.5, 'WR2'),
        assignDef(d('SS', 'SS', 5.8, 2.8, 'MAN_COV', 5.0, 1.5, 'TE'), 'MAN_COV', 5.0, 1.5, 'TE'),
        assignDef(d('FS', 'FS', -2.5, 3.2, 'MAN_COV', -2.0, 1.5, 'RB'), 'MAN_COV', -2.0, 1.5, 'RB'),
        assignDef(d('DIME', 'DB', 5.2, 4.0, 'BLITZ_EDGE', 4.5, -5.0), 'BLITZ_EDGE', 4.5, -5.0),
      ];

    case 'NICKEL_SIM_C2':
      return [
        assignDef(d('LDE', 'DE', -4.2, 0.6, 'CURL_FLAT', -5.5, 3.8), 'CURL_FLAT', -5.5, 3.8),
        assignDef(d('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 72, power: 92, finesse: 76 }), 'RUSH_GAP', -0.5, -4.0),
        assignDef(d('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 76, power: 90, finesse: 84 }), 'RUSH_GAP', 1.8, -4.0),
        assignDef(d('RDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0), 'CONTAIN_EDGE', 4.0, -5.0),
        assignDef(d('NCB', 'NI', -6.8, 2.5, 'BLITZ_EDGE', -3.5, -4.5), 'BLITZ_EDGE', -3.5, -4.5),
        assignDef(d('WILL', 'WILL', -2.5, 4.2, 'HOOK_CURL', -3.0, 4.0), 'HOOK_CURL', -3.0, 4.0),
        assignDef(d('MIKE', 'MIKE', 0.0, 4.2, 'HOOK_CURL', 0.0, 11.0), 'HOOK_CURL', 0.0, 11.0),
        assignDef(d('CB1', 'CB', -14.2, 4.5, 'CURL_FLAT', -13.5, 4.5), 'CURL_FLAT', -13.5, 4.5),
        assignDef(d('CB2', 'CB', 14.2, 4.5, 'CURL_FLAT', 13.5, 4.5), 'CURL_FLAT', 13.5, 4.5),
        assignDef(d('FS', 'FS', -7.5, 12.5, 'DEEP_HALF', -8.5, 17.0), 'DEEP_HALF', -8.5, 17.0),
        assignDef(d('SS', 'SS', 7.5, 12.5, 'DEEP_HALF', 8.5, 17.0), 'DEEP_HALF', 8.5, 17.0),
      ];

    case 'NICKEL_OVER_C3':
    default:
      return [
        assignDef(d('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0), 'CONTAIN_EDGE', -3.5, -5.0),
        assignDef(d('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 72, power: 92, finesse: 76 }), 'RUSH_GAP', -0.5, -4.0),
        assignDef(d('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 76, power: 90, finesse: 84 }), 'RUSH_GAP', 1.8, -4.0),
        assignDef(d('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0), 'CONTAIN_EDGE', 4.0, -5.0),
        assignDef(d('WILL', 'WILL', -2.2, 4.2, 'HOOK_CURL', -2.5, 3.5), 'HOOK_CURL', -2.5, 3.5),
        assignDef(d('MIKE', 'MIKE', 1.2, 4.2, 'HOOK_CURL', 1.5, 3.5), 'HOOK_CURL', 1.5, 3.5),
        assignDef(d('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -7.5, 4.8), 'CURL_FLAT', -7.5, 4.8),
        assignDef(d('CB1', 'CB', -14.2, 6.0, 'DEEP_THIRD', -14.0, 16.0), 'DEEP_THIRD', -14.0, 16.0),
        assignDef(d('CB2', 'CB', 14.2, 6.0, 'DEEP_THIRD', 14.0, 16.0), 'DEEP_THIRD', 14.0, 16.0),
        assignDef(d('SS', 'SS', 5.8, 5.0, 'CURL_FLAT', 7.5, 4.8), 'CURL_FLAT', 7.5, 4.8),
        assignDef(d('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0), 'DEEP_THIRD', 0.0, 18.0),
      ];
  }
}

// Monte Carlo Trial Runner across Plays and Defenses
export function runNflBenchmarkTrial() {
  const engine = new All22KinematicEngine();

  const passConcepts: Array<'DAGGER' | 'PA_FLOOD' | 'QUICK_SLANT' | 'MESH' | 'FOUR_VERTS'> = [
    'DAGGER', 'PA_FLOOD', 'QUICK_SLANT', 'MESH', 'FOUR_VERTS'
  ];

  const runConcepts: Array<'DUO' | 'POWER_O' | 'INSIDE_ZONE' | 'OUTSIDE_ZONE' | 'PIN_PULL'> = [
    'DUO', 'POWER_O', 'INSIDE_ZONE', 'OUTSIDE_ZONE', 'PIN_PULL'
  ];

  const defFronts = [
    'NICKEL_OVER_C3',
    'NICKEL_UNDER_C1',
    'BASE_34_BEAR_C4',
    'DIME_MUG_C0',
    'NICKEL_SIM_C2',
  ];

  const N_BATCH = 50; // Monte Carlo iterations per scenario

  console.log('========================================================================================');
  console.log('NFL EMPIRICAL BENCHMARK TRIAL & CALIBRATION HARNESS');
  console.log(`Evaluating ${passConcepts.length} Pass + ${runConcepts.length} Run Plays against 5 NFL Defensive Fronts (N=${N_BATCH} MC runs/cell)`);
  console.log('========================================================================================\n');

  // --------------------------------------------------------------------------
  // 1. TRIAL PASSING CONCEPTS
  // --------------------------------------------------------------------------
  console.log('--- 1. PASSING PLAYS TRIAL ---');
  let totalPassPlays = 0;
  let totalPressuredPasses = 0;
  let totalSacks = 0;
  let totalPassEpa = 0;
  let totalTtpSum = 0;
  let ttpCount = 0;
  let positivePassEpaCount = 0;

  interface PassResultRow {
    concept: string;
    def: string;
    pressureRate: number;
    sackRate: number;
    meanTtp: number | null;
    meanEpa: number;
    successRate: number;
  }
  const passRows: PassResultRow[] = [];

  for (const pc of passConcepts) {
    for (const df of defFronts) {
      let scenarioPressures = 0;
      let scenarioSacks = 0;
      let scenarioEpaSum = 0;
      let scenarioTtpSum = 0;
      let scenarioTtpCount = 0;
      let scenarioPositiveEpa = 0;

      for (let i = 0; i < N_BATCH; i++) {
        const off = buildPassPlay(pc);
        const def = buildDefense(df);
        const traj = engine.simulatePlay([...off, ...def], 1.0); // with stochastic trench noise

        totalPassPlays++;
        const termSnap = traj.find(s => s.playOver);
        const finalSnap = traj[traj.length - 1];
        const isSack = termSnap?.terminationReason === 'SACK';

        let ttp: number | null = null;
        const liveEndTime = termSnap ? termSnap.timeSec : 4.0;
        for (const snap of traj) {
          if (snap.timeSec <= liveEndTime && snap.pocketIntegrity < 45) {
            ttp = snap.timeSec;
            break;
          }
        }

        const isPressure = isSack || ttp !== null;
        if (isPressure) {
          scenarioPressures++;
          totalPressuredPasses++;
        }
        if (isSack) {
          scenarioSacks++;
          totalSacks++;
        }
        if (ttp !== null) {
          scenarioTtpSum += ttp;
          scenarioTtpCount++;
          totalTtpSum += ttp;
          ttpCount++;
        }

        const epa = finalSnap.expectedEpa;
        scenarioEpaSum += epa;
        totalPassEpa += epa;
        if (epa > 0 && !isSack && termSnap?.terminationReason !== 'INCOMPLETE') {
          scenarioPositiveEpa++;
          positivePassEpaCount++;
        }
      }

      passRows.push({
        concept: pc,
        def: df,
        pressureRate: +(scenarioPressures / N_BATCH * 100).toFixed(1),
        sackRate: +(scenarioSacks / N_BATCH * 100).toFixed(1),
        meanTtp: scenarioTtpCount > 0 ? +(scenarioTtpSum / scenarioTtpCount).toFixed(2) : null,
        meanEpa: +(scenarioEpaSum / N_BATCH).toFixed(2),
        successRate: +(scenarioPositiveEpa / N_BATCH * 100).toFixed(1),
      });
    }
  }

  // Print Pass Table
  console.log(
    'Play Concept'.padEnd(16) +
    'Defense'.padEnd(18) +
    'Pressure%'.padEnd(12) +
    'Sack%'.padEnd(10) +
    'Mean TTP(s)'.padEnd(14) +
    'Mean EPA'.padEnd(12) +
    'Success Rate%'
  );
  console.log('-'.repeat(94));
  for (const r of passRows) {
    console.log(
      r.concept.padEnd(16) +
      r.def.padEnd(18) +
      `${r.pressureRate}%`.padEnd(12) +
      `${r.sackRate}%`.padEnd(10) +
      (r.meanTtp !== null ? `${r.meanTtp.toFixed(2)}s` : 'NONE').padEnd(14) +
      (r.meanEpa >= 0 ? `+${r.meanEpa.toFixed(2)}` : r.meanEpa.toFixed(2)).padEnd(12) +
      `${r.successRate}%`
    );
  }

  const overallPassPressureRate = (totalPressuredPasses / totalPassPlays) * 100;
  const overallPassSackRate = (totalSacks / totalPassPlays) * 100;
  const overallPassMeanTtp = ttpCount > 0 ? totalTtpSum / ttpCount : 0;
  const overallPassMeanEpa = totalPassEpa / totalPassPlays;
  const overallPassSuccessRate = (positivePassEpaCount / totalPassPlays) * 100;

  console.log('\nAGGREGATE SIMULATED PASS RESULTS vs NFL BENCHMARKS:');
  console.log(`- Pressure Rate: ${overallPassPressureRate.toFixed(1)}% | NFL Target: ${NFL_EXPECTATIONS.PASS.PRESSURE_RATE.min}% - ${NFL_EXPECTATIONS.PASS.PRESSURE_RATE.max}% (mean ${NFL_EXPECTATIONS.PASS.PRESSURE_RATE.mean}%)`);
  console.log(`- Sack Rate:     ${overallPassSackRate.toFixed(1)}% | NFL Target: ${NFL_EXPECTATIONS.PASS.SACK_RATE.min}% - ${NFL_EXPECTATIONS.PASS.SACK_RATE.max}% (mean ${NFL_EXPECTATIONS.PASS.SACK_RATE.mean}%)`);
  console.log(`- Time to Press: ${overallPassMeanTtp.toFixed(2)}s | NFL Target: ${NFL_EXPECTATIONS.PASS.TIME_TO_PRESSURE.min}s - ${NFL_EXPECTATIONS.PASS.TIME_TO_PRESSURE.max}s`);
  console.log(`- Mean Pass EPA: ${overallPassMeanEpa >= 0 ? '+' : ''}${overallPassMeanEpa.toFixed(2)} | NFL Target: +${NFL_EXPECTATIONS.PASS.EPA_PER_PLAY.min} to +${NFL_EXPECTATIONS.PASS.EPA_PER_PLAY.max}`);
  console.log(`- Success Rate:  ${overallPassSuccessRate.toFixed(1)}% | NFL Target: ${NFL_EXPECTATIONS.PASS.SUCCESS_RATE.min}% - ${NFL_EXPECTATIONS.PASS.SUCCESS_RATE.max}%\n`);

  // --------------------------------------------------------------------------
  // 2. TRIAL RUSHING CONCEPTS
  // --------------------------------------------------------------------------
  console.log('--- 2. RUSHING PLAYS TRIAL ---');
  let totalRunPlays = 0;
  let totalRunYards = 0;
  let totalStuffs = 0;
  let totalExplosives = 0;
  let totalRunEpa = 0;
  let positiveRunEpaCount = 0;

  interface RunResultRow {
    concept: string;
    def: string;
    meanYpc: number;
    stuffRate: number;
    explosiveRate: number;
    meanEpa: number;
    successRate: number;
  }
  const runRows: RunResultRow[] = [];

  for (const rc of runConcepts) {
    for (const df of defFronts) {
      let scenarioYardsSum = 0;
      let scenarioStuffs = 0;
      let scenarioExplosives = 0;
      let scenarioEpaSum = 0;
      let scenarioSuccesses = 0;

      for (let i = 0; i < N_BATCH; i++) {
        const off = buildRunPlay(rc);
        const def = buildDefense(df);
        const traj = engine.simulatePlay([...off, ...def], 1.0);

        totalRunPlays++;
        const termSnap = traj.find(s => s.playOver);
        const finalSnap = traj[traj.length - 1];
        const carrier = finalSnap.agents.find(a => a.assignment.role === 'BALL_CARRIER')!;
        const yards = termSnap?.carrierTackledYards !== undefined && termSnap.carrierTackledYards !== null
          ? termSnap.carrierTackledYards
          : carrier.y;

        scenarioYardsSum += yards;
        totalRunYards += yards;

        if (yards <= 0.0) {
          scenarioStuffs++;
          totalStuffs++;
        }
        if (yards >= 10.0) {
          scenarioExplosives++;
          totalExplosives++;
        }

        const epa = finalSnap.expectedEpa;
        scenarioEpaSum += epa;
        totalRunEpa += epa;

        if (yards >= 4.0 || epa > 0) {
          scenarioSuccesses++;
          positiveRunEpaCount++;
        }
      }

      runRows.push({
        concept: rc,
        def: df,
        meanYpc: +(scenarioYardsSum / N_BATCH).toFixed(2),
        stuffRate: +(scenarioStuffs / N_BATCH * 100).toFixed(1),
        explosiveRate: +(scenarioExplosives / N_BATCH * 100).toFixed(1),
        meanEpa: +(scenarioEpaSum / N_BATCH).toFixed(2),
        successRate: +(scenarioSuccesses / N_BATCH * 100).toFixed(1),
      });
    }
  }

  // Print Run Table
  console.log(
    'Play Concept'.padEnd(16) +
    'Defense'.padEnd(18) +
    'Mean YPC'.padEnd(12) +
    'Stuff%'.padEnd(10) +
    'Explosive%'.padEnd(12) +
    'Mean EPA'.padEnd(12) +
    'Success Rate%'
  );
  console.log('-'.repeat(92));
  for (const r of runRows) {
    console.log(
      r.concept.padEnd(16) +
      r.def.padEnd(18) +
      `${r.meanYpc.toFixed(2)}y`.padEnd(12) +
      `${r.stuffRate}%`.padEnd(10) +
      `${r.explosiveRate}%`.padEnd(12) +
      (r.meanEpa >= 0 ? `+${r.meanEpa.toFixed(2)}` : r.meanEpa.toFixed(2)).padEnd(12) +
      `${r.successRate}%`
    );
  }

  const overallMeanYpc = totalRunYards / totalRunPlays;
  const overallStuffRate = (totalStuffs / totalRunPlays) * 100;
  const overallExplosiveRate = (totalExplosives / totalRunPlays) * 100;
  const overallRunMeanEpa = totalRunEpa / totalRunPlays;
  const overallRunSuccessRate = (positiveRunEpaCount / totalRunPlays) * 100;

  console.log('\nAGGREGATE SIMULATED RUSH RESULTS vs NFL BENCHMARKS:');
  console.log(`- Yards Per Carry: ${overallMeanYpc.toFixed(2)}y | NFL Target: ${NFL_EXPECTATIONS.RUN.YPC.min}y - ${NFL_EXPECTATIONS.RUN.YPC.max}y (mean ${NFL_EXPECTATIONS.RUN.YPC.mean}y)`);
  console.log(`- Stuff Rate:      ${overallStuffRate.toFixed(1)}% | NFL Target: ${NFL_EXPECTATIONS.RUN.STUFF_RATE.min}% - ${NFL_EXPECTATIONS.RUN.STUFF_RATE.max}% (mean ${NFL_EXPECTATIONS.RUN.STUFF_RATE.mean}%)`);
  console.log(`- Explosive Rate:  ${overallExplosiveRate.toFixed(1)}% | NFL Target: ${NFL_EXPECTATIONS.RUN.EXPLOSIVE_RATE.min}% - ${NFL_EXPECTATIONS.RUN.EXPLOSIVE_RATE.max}% (mean ${NFL_EXPECTATIONS.RUN.EXPLOSIVE_RATE.mean}%)`);
  console.log(`- Mean Rush EPA:   ${overallRunMeanEpa >= 0 ? '+' : ''}${overallRunMeanEpa.toFixed(2)} | NFL Target: ${NFL_EXPECTATIONS.RUN.EPA_PER_PLAY.min} to ${NFL_EXPECTATIONS.RUN.EPA_PER_PLAY.max}`);
  console.log(`- Success Rate:    ${overallRunSuccessRate.toFixed(1)}% | NFL Target: ${NFL_EXPECTATIONS.RUN.SUCCESS_RATE.min}% - ${NFL_EXPECTATIONS.RUN.SUCCESS_RATE.max}%\n`);
}

if (process.argv[1] && process.argv[1].endsWith('trial_nfl_benchmarks.ts')) {
  runNflBenchmarkTrial();
}
