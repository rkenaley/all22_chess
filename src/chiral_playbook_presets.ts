import {
  BlockRoleType,
  FakeActionFamily,
  GapOrSetCode,
  LeverageBias,
  SimAgent,
  Waypoint2D,
} from './engine';
import { ARGON_2027_ROSTER } from './argon_2027_playbook';

export type ChiralSituation = '1ST_10' | '3RD_SHORT' | '3RD_LONG' | 'RED_ZONE';

export interface ChiralPlayPreset {
  id: string;
  name: string;
  category: 'PASS' | 'RUN';
  personnel: string;
  situations: ChiralSituation[];
  situationBadge: string;
  family: FakeActionFamily | null;
  isFake: boolean;
  description: string;
  buildOffense: () => SimAgent[];
}

export interface BlankFormationStarter {
  id: string;
  label: string;
  personnel: string;
  description: string;
  buildOffense: () => SimAgent[];
}

export interface LegalityAuditResult {
  onLosCount: number;
  uncoveredEndsOk: boolean;
  illegalReason: string | null;
  isLegal: boolean;
}

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

export function auditPlayLegality(agents: SimAgent[]): LegalityAuditResult {
  const off = agents.filter((a) => a.side === 'OFF');
  if (off.length !== 11) {
    return {
      onLosCount: 0,
      uncoveredEndsOk: false,
      illegalReason: `Expected 11 offensive players (found ${off.length})`,
      isLegal: false,
    };
  }
  const los = off.filter((a) => a.startY >= -0.75);
  const onLosCount = los.length;
  const sorted = los.slice().sort((a, b) => a.startX - b.startX);
  const elig = new Set(['WR', 'TE', 'SL', 'RB', 'QB']);
  const leftOk = sorted.length > 0 && elig.has(sorted[0].pos);
  const rightOk = sorted.length > 0 && elig.has(sorted[sorted.length - 1].pos);
  const uncoveredEndsOk = onLosCount === 7 && leftOk && rightOk;

  let illegalReason: string | null = null;
  if (onLosCount !== 7) {
    illegalReason = `${onLosCount}/7 on LOS (NFL requires exactly 7 players with Y >= -0.75y)`;
  } else if (!leftOk || !rightOk) {
    illegalReason = `Covered eligible end (${!leftOk ? `Left ${sorted[0]?.pos}` : `Right ${sorted[sorted.length - 1]?.pos}`} is ineligible on end of LOS)`;
  }

  return {
    onLosCount,
    uncoveredEndsOk,
    illegalReason,
    isLegal: onLosCount === 7 && uncoveredEndsOk,
  };
}

// ============================================================================
// 8 IDENTICAL-ALIGNMENT CHIRAL 2-QB MARRIED-FAKE PLAYS (ZERO PRE-SNAP TELLS)
// ============================================================================

function buildChiralDirectSnapLaser(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = [
    makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
    makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PASS_SET', 'JUMP_SET', 'NT', null, 'INSIDE_OUT', [], undefined, R.LG_EBROWN.blockRating),
    makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PASS_SET', 'JUMP_SET', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
    makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'PULL_LEAD', 'D_ALLEY', 'DIME', 'SS', 'OUTSIDE_IN', [
      { x: 4.5, y: -1.4 }, { x: 8.6, y: -0.5 }, { x: 10.4, y: 0.6 },
    ], undefined, R.RG_BORTOLINI.blockRating),
    makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', 'RDE', 'ROLB', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
  ];
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -16.5, y: 11.0 }, { x: -12.0, y: 18.0 }], 3);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 20.5, y: 9.6 }, { x: 22.0, y: 15.5 }], 1);
  const wingL = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: 9.6 }, { x: 2.5, y: 14.0 }], 2, R.TE2_TREMBLE.blockRating);
  const wingR = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'MAN_BLOCK', 'D_ALLEY', 'DIME', 'SS', 'INSIDE_OUT', [], undefined, R.TE1_WARREN.blockRating);
  const qb1 = makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -7.5, y: -3.5 }, { x: -12.5, y: 1.5 }], 4);
  const qb2 = makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
    { x: 4.4, y: -5.4 }, { x: 8.8, y: -4.9 }, { x: 10.4, y: -1.4 }, { x: 11.6, y: 4.8 }, { x: 12.6, y: 18.0 },
  ]);
  qb2.isSnapRecipient = true;
  qb2.actionFamily = 'PERIMETER_PITCH_TOSS';
  qb2.optionPass = {
    enabled: true,
    throwerRating: qb2.ratings.finesse,
    decisionWindowStartSec: 1.22,
    decisionWindowEndSec: 1.68,
    primaryReceiverId: 'WR2',
    secondaryReceiverId: 'SL',
    separationThresholdYds: 3.65,
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

function buildChiralReactorSweep(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = [
    makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'GAP_ZONE', 'B_LEFT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
    makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PULL_LEAD', 'D_ALLEY', 'DIME', 'SS', 'OUTSIDE_IN', [
      { x: 1.4, y: -1.4 }, { x: 6.0, y: -0.55 }, { x: 7.8, y: 3.4 },
    ], undefined, R.LG_EBROWN.blockRating),
    makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
      { x: 2.3, y: -1.1 }, { x: 4.9, y: -0.3 }, { x: 6.4, y: 3.2 },
    ], undefined, R.C_BARTON.blockRating),
    makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating),
    makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', 'RDE', 'ROLB', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
  ];
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');
  const wingL = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'MAN_BLOCK', 'C_LEFT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.TE2_TREMBLE.blockRating);
  const wingR = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'PULL_LEAD', 'D_ALLEY', 'DIME', 'SS', 'OUTSIDE_IN', [
    { x: 6.8, y: 0.6 }, { x: 8.0, y: 4.5 },
  ], undefined, R.TE1_WARREN.blockRating);
  const qb1 = makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
    { x: -7.8, y: -4.2 }, { x: -13.0, y: -2.5 },
  ]);
  const qb2 = makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
    { x: 4.2, y: -2.4 }, { x: 6.8, y: 0.9 }, { x: 7.8, y: 6.8 }, { x: 8.2, y: 20.0 },
  ]);
  qb2.isSnapRecipient = true;
  qb2.actionFamily = 'PERIMETER_PITCH_TOSS';
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

function buildChiralSplitGunInsideExchange(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = [
    makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'GAP_ZONE', 'B_LEFT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
    makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PULL_LEAD', 'C_RIGHT', 'MIKE', 'DIME', 'OUTSIDE_IN', [
      { x: 1.0, y: -1.1 }, { x: 3.6, y: -0.3 }, { x: 4.5, y: 2.8 },
    ], undefined, R.LG_EBROWN.blockRating),
    makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
    makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'COMBO_CLIMB', 'A_RIGHT', 'NT', 'MIKE', 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating),
    makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', '3T', '4i_R', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
  ];
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -16.0, y: 8.5 }, { x: -18.5, y: 15.0 }], 2);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');
  const wingL = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -4.2, y: 5.5 }, { x: -1.5, y: 9.5 }], 1, R.TE2_TREMBLE.blockRating);
  const wingR = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'MAN_BLOCK', 'C_RIGHT', 'RDE', 'ROLB', 'OUTSIDE_IN', [], undefined, R.TE1_WARREN.blockRating);
  const qb1 = makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [{ x: -5.8, y: -4.2 }, { x: -10.5, y: -2.0 }], 4);
  const qb2 = makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'C_RIGHT', null, null, 'NEUTRAL', [
    { x: 3.4, y: -2.0 }, { x: 4.5, y: 1.2 }, { x: 5.2, y: 7.5 }, { x: 5.6, y: 18.0 },
  ]);
  qb2.isSnapRecipient = true;
  qb2.actionFamily = 'SPLIT_GUN_EXCHANGE';
  qb2.optionPass = {
    enabled: true,
    throwerRating: qb2.ratings.finesse,
    decisionWindowStartSec: 1.05,
    decisionWindowEndSec: 1.48,
    primaryReceiverId: 'SL',
    secondaryReceiverId: 'WR1',
    separationThresholdYds: 3.55,
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

function buildChiralFakePitchCounterKeep(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = [
    makeOffAgent('LT', 'LT', R.LT_WALKER.name, -3.2, -0.4, R.LT_WALKER.ratings, 'GAP_ZONE', 'B_LEFT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.LT_WALKER.blockRating),
    makeOffAgent('LG', 'LG', R.LG_EBROWN.name, -1.6, -0.3, R.LG_EBROWN.ratings, 'PULL_LEAD', 'C_RIGHT', 'DIME', 'SS', 'OUTSIDE_IN', [
      { x: 1.6, y: -1.4 }, { x: 5.8, y: -0.5 }, { x: 7.5, y: 3.8 },
    ], undefined, R.LG_EBROWN.blockRating),
    makeOffAgent('C', 'C', R.C_BARTON.name, 0.0, -0.2, R.C_BARTON.ratings, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'MIKE', 'NEUTRAL', [], undefined, R.C_BARTON.blockRating),
    makeOffAgent('RG', 'RG', R.RG_BORTOLINI.name, 1.6, -0.3, R.RG_BORTOLINI.ratings, 'MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT', [], undefined, R.RG_BORTOLINI.blockRating),
    makeOffAgent('RT', 'RT', R.RT_TOM.name, 3.2, -0.4, R.RT_TOM.ratings, 'MAN_BLOCK', 'B_RIGHT', 'RDE', 'ROLB', 'INSIDE_OUT', [], undefined, R.RT_TOM.blockRating),
  ];
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');
  const wingL = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'MAN_BLOCK', 'C_LEFT', 'LDE', null, 'INSIDE_OUT', [], undefined, R.TE2_TREMBLE.blockRating);
  const wingR = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'PULL_LEAD', 'D_ALLEY', 'DIME', 'SS', 'OUTSIDE_IN', [
    { x: 7.0, y: 0.6 }, { x: 8.6, y: 4.5 },
  ], undefined, R.TE1_WARREN.blockRating);
  const qb1 = makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
    { x: -8.8, y: -4.6 }, { x: -12.4, y: -1.2 }, { x: -14.0, y: 5.0 },
  ]);
  const qb2 = makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
    { x: 1.4, y: -4.8 }, { x: 4.5, y: -2.4 }, { x: 7.2, y: 1.0 }, { x: 8.4, y: 8.5 }, { x: 9.0, y: 20.0 },
  ]);
  qb2.isSnapRecipient = true;
  qb2.actionFamily = 'PERIMETER_PITCH_TOSS';
  qb2.fakeAction = {
    enabled: true,
    family: 'PERIMETER_PITCH_TOSS',
    fakeTargetId: 'QB',
    fakeStartSec: 0.12,
    fakeDurationSec: 0.48,
    fakeDirectionX: -9.0,
    fakeDirectionY: -3.2,
    affectsSpy: true,
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

function buildChiralFakeExchangeBootFlood(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = buildPassOL();
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -11.0, y: 12.0 }, { x: -4.0, y: 20.0 }], 3);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 16.0, y: 8.8 }, { x: 19.5, y: 12.4 }], 2);
  const wingL = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -1.0, y: 7.6 }, { x: 6.8, y: 11.2 }, { x: 13.5, y: 12.2 },
  ], 1, R.TE2_TREMBLE.blockRating);
  const wingR = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'CHIP_RELEASE', 'VERTICAL_DEEP', 'RDE', 'ROLB', 'OUTSIDE_IN', [
    { x: 9.5, y: 3.5 }, { x: 15.5, y: 6.2 },
  ], 4, R.TE1_WARREN.blockRating, 0.42);
  const qb1 = makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'B_LEFT', null, null, 'NEUTRAL', [
    { x: -3.2, y: -2.2 }, { x: -5.5, y: 1.5 }, { x: -8.0, y: 5.5 },
  ], 5);
  const qb2 = makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 6.2, y: -5.6 }]);
  qb2.isSnapRecipient = true;
  qb2.actionFamily = 'SPLIT_GUN_EXCHANGE';
  qb2.playAction = {
    enabled: true,
    meshDurationSec: 0.78,
    fakeCarrierId: 'QB',
    fakeGap: 'B_LEFT',
    isBootleg: true,
    bootDirection: 'RIGHT',
  };
  qb2.fakeAction = {
    enabled: true,
    family: 'SPLIT_GUN_EXCHANGE',
    fakeTargetId: 'QB',
    fakeStartSec: 0.12,
    fakeDurationSec: 0.92,
    fakeDirectionX: -6.5,
    fakeDirectionY: -1.8,
    affectsSpy: true,
  };
  qb2.designedScrambleRead = {
    enabled: true,
    afterReadOrder: 2,
    minDecisionTimeSec: 1.95,
    voidCorridorCenterX: 8.5,
    voidCorridorHalfWidthX: 3.3,
    voidCorridorMaxY: 9.0,
    maxDefendersInVoid: 0,
    fallbackReceiverId: 'TE',
    scrambleWaypoints: [
      { x: 7.8, y: -2.0 }, { x: 9.5, y: 4.5 }, { x: 11.0, y: 14.5 }, { x: 12.0, y: 24.0 },
    ],
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

function buildChiralFakeSweepRead3Seam(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = buildPassOL();
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -17.5, y: 11.5 }, { x: -20.5, y: 20.5 }], 4);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 17.5, y: 11.5 }, { x: 20.5, y: 20.5 }], 3);
  const wingL = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -1.5, y: 5.5 }, { x: 5.5, y: 9.2 }, { x: 10.5, y: 11.0 },
  ], 2, R.TE2_TREMBLE.blockRating);
  const wingR = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 5.0, y: 7.2 }, { x: 3.0, y: 12.2 },
  ], 1, R.TE1_WARREN.blockRating);
  const qb1 = makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
    { x: -9.2, y: -4.4 }, { x: -14.2, y: -0.5 }, { x: -17.0, y: 6.5 },
  ], 5);
  const qb2 = makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.8, y: -5.4 }]);
  qb2.isSnapRecipient = true;
  qb2.actionFamily = 'PERIMETER_PITCH_TOSS';
  qb2.fakeAction = {
    enabled: true,
    family: 'PERIMETER_PITCH_TOSS',
    fakeTargetId: 'QB',
    fakeStartSec: 0.12,
    fakeDurationSec: 0.92,
    fakeDirectionX: -9.5,
    fakeDirectionY: -3.2,
    affectsSpy: true,
  };
  qb2.designedScrambleRead = {
    enabled: true,
    afterReadOrder: 2,
    minDecisionTimeSec: 1.85,
    voidCorridorCenterX: 2.2,
    voidCorridorHalfWidthX: 3.1,
    voidCorridorMaxY: 8.5,
    maxDefendersInVoid: 0,
    fallbackReceiverId: 'SL',
    scrambleWaypoints: [
      { x: 1.6, y: -1.2 }, { x: 2.8, y: 5.5 }, { x: 3.4, y: 16.0 },
    ],
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

function buildChiralPaSeamFlood(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = buildPassOL();
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -15.5, y: 12.0 }, { x: -11.5, y: 20.0 }], 4);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 16.5, y: 10.5 }, { x: 20.5, y: 15.5 }], 3);
  const wingL = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -1.5, y: 7.0 }, { x: 4.5, y: 10.8 }, { x: 10.5, y: 12.0 },
  ], 2, R.TE2_TREMBLE.blockRating);
  const wingR = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 5.2, y: 8.0 }, { x: 4.0, y: 12.2 },
  ], 1, R.TE1_WARREN.blockRating);
  const qb1 = makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -6.8, y: -3.2 }, { x: -13.5, y: 2.5 },
  ], 5);
  const qb2 = makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 2.4, y: -6.2 }]);
  qb2.isSnapRecipient = true;
  qb2.actionFamily = 'SPLIT_GUN_EXCHANGE';
  qb2.playAction = {
    enabled: true,
    meshDurationSec: 0.80,
    fakeCarrierId: 'QB',
    fakeGap: 'C_LEFT',
    isBootleg: false,
    bootDirection: 'POCKET',
  };
  qb2.fakeAction = {
    enabled: true,
    family: 'SPLIT_GUN_EXCHANGE',
    fakeTargetId: 'QB',
    fakeStartSec: 0.12,
    fakeDurationSec: 0.95,
    fakeDirectionX: -6.2,
    fakeDirectionY: -2.4,
    affectsSpy: true,
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

function buildChiralRead3MeshVoid(): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  const ol = buildPassOL();
  const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -16.5, y: 10.5 }, { x: -11.5, y: 18.5 }], 1);
  const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 13.5, y: 9.8 }, { x: 5.5, y: 14.2 }], 2);
  const wingL = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: 2.0, y: 4.8 }, { x: 10.5, y: 6.4 }, { x: 15.5, y: 8.2 },
  ], 3, R.TE2_TREMBLE.blockRating);
  const wingR = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -1.2, y: 5.6 }, { x: -8.5, y: 7.4 },
  ], 4, R.TE1_WARREN.blockRating);
  const qb1 = makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
    { x: -9.5, y: -1.8 }, { x: -15.0, y: 4.5 }, { x: -16.5, y: 12.0 },
  ], 5);
  const qb2 = makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 1.8, y: -5.8 }]);
  qb2.isSnapRecipient = true;
  qb2.designedScrambleRead = {
    enabled: true,
    afterReadOrder: 2,
    minDecisionTimeSec: 2.00,
    voidCorridorCenterX: 0.4,
    voidCorridorHalfWidthX: 3.1,
    voidCorridorMaxY: 8.0,
    maxDefendersInVoid: 0,
    fallbackReceiverId: 'TE',
    scrambleWaypoints: [
      { x: 0.8, y: -1.0 }, { x: 1.5, y: 5.5 }, { x: 2.2, y: 16.0 }, { x: 2.8, y: 26.0 },
    ],
  };
  return [...ol, wr1, wr2, wingL, wingR, qb1, qb2];
}

export const CHIRAL_2QB_PLAYBOOK: ChiralPlayPreset[] = [
  {
    id: 'CHIRAL_DIRECT_SNAP_LASER',
    name: 'CHIRAL 2QB // DIRECT-SNAP LASER RPO',
    category: 'RUN',
    personnel: '22 CHIRAL 2QB',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: 'CHIRAL REAL',
    family: 'PERIMETER_PITCH_TOSS',
    isFake: false,
    description: 'Mirror-symmetric Split-Shotgun direct snap to perimeter QB2 with pull-lead guard and conflict option-pass.',
    buildOffense: buildChiralDirectSnapLaser,
  },
  {
    id: 'CHIRAL_FAKE_PITCH_COUNTER_KEEP',
    name: 'CHIRAL 2QB // FAKE PITCH COUNTER KEEP',
    category: 'RUN',
    personnel: '22 CHIRAL 2QB',
    situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
    situationBadge: 'FAKE COUNTER',
    family: 'PERIMETER_PITCH_TOSS',
    isFake: true,
    description: 'Identical alignment: flashes perimeter pitch fake left to QB1, pulling overhangs & Spy before keeping counter right (+0.172 priming lift).',
    buildOffense: buildChiralFakePitchCounterKeep,
  },
  {
    id: 'CHIRAL_FAKE_EXCHANGE_BOOT_FLOOD',
    name: 'CHIRAL 2QB // FAKE EXCHANGE BOOT FLOOD',
    category: 'PASS',
    personnel: '22 CHIRAL 2QB',
    situations: ['1ST_10', '3RD_LONG', 'RED_ZONE'],
    situationBadge: 'FAKE BOOT',
    family: 'SPLIT_GUN_EXCHANGE',
    isFake: true,
    description: 'Fakes inside B-gap exchange to twin QB1, chips Wide-9 edge with TE, and boots into 3-level flood + Read-3 alley scramble (+0.136 priming lift).',
    buildOffense: buildChiralFakeExchangeBootFlood,
  },
  {
    id: 'CHIRAL_PA_SEAM_FLOOD',
    name: 'CHIRAL 2QB // PA SEAM FLOOD (WIDE-9 BUSTER)',
    category: 'PASS',
    personnel: '22 CHIRAL 2QB',
    situations: ['1ST_10', '3RD_LONG'],
    situationBadge: 'PA SEAM',
    family: 'SPLIT_GUN_EXCHANGE',
    isFake: true,
    description: 'Fakes split-gun exchange to suck box LBs downhill, hitting vacated 12y seam & crossing over (+0.53 EPA vs Symmetric Wide-9!).',
    buildOffense: buildChiralPaSeamFlood,
  },
  {
    id: 'CHIRAL_FAKE_SWEEP_READ3_SEAM',
    name: 'CHIRAL 2QB // FAKE SWEEP READ-3 SEAM',
    category: 'PASS',
    personnel: '22 CHIRAL 2QB',
    situations: ['1ST_10', '3RD_LONG'],
    situationBadge: 'FAKE + READ3',
    family: 'PERIMETER_PITCH_TOSS',
    isFake: true,
    description: 'Fakes wide sweep left to QB1, attacking vacated right seam & counter over with Read-3 middle-right void scramble.',
    buildOffense: buildChiralFakeSweepRead3Seam,
  },
  {
    id: 'CHIRAL_READ3_MESH_VOID',
    name: 'CHIRAL 2QB // READ-3 MESH VOID',
    category: 'PASS',
    personnel: '22 CHIRAL 2QB',
    situations: ['1ST_10', '3RD_LONG', 'RED_ZONE'],
    situationBadge: 'READ-3 VOID',
    family: null,
    isFake: false,
    description: 'Neutral clear-out & mesh routes engineered to open a central grass scramble corridor (IF open -> burst; ELSE -> Read #4 fallback).',
    buildOffense: buildChiralRead3MeshVoid,
  },
  {
    id: 'CHIRAL_REACTOR_SWEEP',
    name: 'CHIRAL 2QB // REACTOR PIN-PULL SWEEP',
    category: 'RUN',
    personnel: '22 CHIRAL 2QB',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: 'CHIRAL SWEEP',
    family: 'PERIMETER_PITCH_TOSS',
    isFake: false,
    description: 'Dual OL + Wing pin-and-pull perimeter sweep out of exact Split-Shotgun look — sets up Fake Pitch Counter Keep.',
    buildOffense: buildChiralReactorSweep,
  },
  {
    id: 'CHIRAL_SPLIT_GUN_INSIDE_EXCHANGE',
    name: 'CHIRAL 2QB // C-GAP EXCHANGE POWER RPO',
    category: 'RUN',
    personnel: '22 CHIRAL 2QB',
    situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
    situationBadge: 'EXCHANGE RPO',
    family: 'SPLIT_GUN_EXCHANGE',
    isFake: false,
    description: 'Off-tackle C-gap exchange power paired with backside Glance RPO — primes Split-Gun Exchange fakes within identical formation.',
    buildOffense: buildChiralSplitGunInsideExchange,
  },
];

// ============================================================================
// 5 CLEAN BLANK FORMATION STARTERS FOR CUSTOM PLAY DESIGN
// ============================================================================
export const BLANK_FORMATION_STARTERS: BlankFormationStarter[] = [
  {
    id: 'BLANK_SPLIT_GUN_2QB',
    label: 'Split-Shotgun 2-QB (Zero-Tell)',
    personnel: '22 CHIRAL 2QB',
    description: 'Mirror-symmetric twin-QB shotgun with 2 wings and 2 wideouts (7 on LOS). Ideal for directional snaps, fakes, and Read-3 scrambles.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildPassOL();
      const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.5, y: 12.0 }], 1);
      const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.5, y: 12.0 }], 2);
      const sl = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -5.6, -1.15, R.TE2_TREMBLE.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -5.6, y: 8.0 }], 3, R.TE2_TREMBLE.blockRating);
      const te = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.6, -1.15, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 5.6, y: 8.0 }], 4, R.TE1_WARREN.blockRating);
      const qb1 = makeOffAgent('QB', 'QB', 'QB1', -1.9, -4.5, DUAL_QB1_RATINGS, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.9, y: -6.0 }]);
      const qb2 = makeOffAgent('RB', 'QB', 'QB2', 1.9, -4.5, DUAL_QB2_RATINGS, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [{ x: 7.0, y: -3.0 }], 5);
      qb1.isSnapRecipient = true;
      return [...ol, wr1, wr2, sl, te, qb1, qb2];
    },
  },
  {
    id: 'BLANK_11_GUN_TRIPS',
    label: '11 Personnel Gun Trips Right',
    personnel: '11 PERS',
    description: 'Modern NFL base 3-WR, 1-TE, 1-RB shotgun with Trips to the field (7 on LOS).',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildPassOL();
      const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.5, y: 12.0 }], 1);
      const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.5, y: 14.0 }], 2);
      const sl = makeOffAgent('SL', 'SL', R.SL_SAMUEL.name, 9.2, -1.1, R.SL_SAMUEL.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 9.2, y: 9.0 }], 3);
      const te = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 4.8, -1.1, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 4.8, y: 7.0 }], 4, R.TE1_WARREN.blockRating);
      const qb = makeOffAgent('QB', 'QB', R.QB1_RICHARDSON.name, 0.0, -4.8, R.QB1_RICHARDSON.ratings, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.5 }]);
      const rb = makeOffAgent('RB', 'RB', 'Tailback', -1.8, -4.8, DUAL_QB2_RATINGS, 'MAX_PROTECT_SCAN', 'B_LEFT', 'MIKE', null, 'INSIDE_OUT', []);
      qb.isSnapRecipient = true;
      return [...ol, wr1, wr2, sl, te, qb, rb];
    },
  },
  {
    id: 'BLANK_12_SINGLEBACK_ACE',
    label: '12 Personnel Singleback Ace (Shanahan)',
    personnel: '12 PERS',
    description: 'Under-center 2-TE balanced formation built for Wide Zone, Duo, and Play-Action Bootlegs.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildPassOL();
      const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.0, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.0, y: 12.0 }], 1);
      const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.0, -1.1, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.0, y: 14.0 }], 2);
      const sl = makeOffAgent('SL', 'TE', R.TE2_TREMBLE.name, -4.8, -1.1, R.TE2_TREMBLE.ratings, 'CHIP_RELEASE', 'C_LEFT', 'LDE', null, 'OUTSIDE_IN', [{ x: -4.8, y: 7.0 }], 3, R.TE2_TREMBLE.blockRating, 0.55);
      const te = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 4.8, -0.35, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 4.8, y: 10.0 }], 4, R.TE1_WARREN.blockRating);
      const qb = makeOffAgent('QB', 'QB', R.QB1_RICHARDSON.name, 0.0, -1.6, R.QB1_RICHARDSON.ratings, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.2 }]);
      const rb = makeOffAgent('RB', 'RB', 'Tailback', 0.0, -5.8, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'C_RIGHT', null, null, 'NEUTRAL', [{ x: 3.5, y: -2.0 }, { x: 5.0, y: 5.0 }]);
      qb.isSnapRecipient = true;
      return [...ol, wr1, wr2, sl, te, qb, rb];
    },
  },
  {
    id: 'BLANK_21_IFORM_PRO',
    label: '21 Personnel I-Form Pro',
    personnel: '21 PERS',
    description: 'Classic downhill Power-O / Iso / Play-Action Shot formation with lead FB and inline TE.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildPassOL();
      const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -14.0, -0.35, R.WR1_SHAKIR.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
      const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 14.0, -1.1, R.WR2_WORTHY.ratings, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');
      const te = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 4.8, -0.35, R.TE1_WARREN.ratings, 'MAN_BLOCK', 'C_RIGHT', 'RDE', null, 'OUTSIDE_IN', [], undefined, R.TE1_WARREN.blockRating);
      const sl = makeOffAgent('SL', 'FB', R.TE2_TREMBLE.name, 0.0, -3.6, R.TE2_TREMBLE.ratings, 'PULL_LEAD', 'B_RIGHT', 'MIKE', null, 'INSIDE_OUT', [{ x: 2.2, y: -1.0 }, { x: 2.8, y: 3.5 }], undefined, R.TE2_TREMBLE.blockRating);
      const qb = makeOffAgent('QB', 'QB', R.QB1_RICHARDSON.name, 0.0, -1.5, R.QB1_RICHARDSON.ratings, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -3.5 }]);
      const rb = makeOffAgent('RB', 'RB', 'Tailback', 0.0, -6.2, DUAL_QB2_RATINGS, 'BALL_CARRIER', 'B_RIGHT', null, null, 'NEUTRAL', [{ x: 2.4, y: -2.0 }, { x: 3.2, y: 8.0 }]);
      qb.isSnapRecipient = true;
      return [...ol, wr1, wr2, sl, te, qb, rb];
    },
  },
  {
    id: 'BLANK_EMPTY_3X2',
    label: 'Empty 3x2 Spread (5-Out)',
    personnel: '10 PERS',
    description: 'Maximum horizontal stress with 5 eligible receivers detached and lone shotgun QB (ideal for Read-3 middle voids).',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildPassOL();
      const wr1 = makeOffAgent('WR1', 'WR', R.WR1_SHAKIR.name, -16.5, -0.35, R.WR1_SHAKIR.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -16.5, y: 14.0 }], 1);
      const sl = makeOffAgent('SL', 'SL', R.SL_SAMUEL.name, -9.2, -1.1, R.SL_SAMUEL.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -6.0, y: 8.0 }], 2);
      const te = makeOffAgent('TE', 'TE', R.TE1_WARREN.name, 5.8, -1.1, R.TE1_WARREN.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 4.5, y: 12.0 }], 3, R.TE1_WARREN.blockRating);
      const rb = makeOffAgent('RB', 'RB', 'Slot RB', 10.5, -1.1, DUAL_QB2_RATINGS, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 13.5, y: 5.0 }], 4);
      const wr2 = makeOffAgent('WR2', 'WR', R.WR2_WORTHY.name, 16.5, -0.35, R.WR2_WORTHY.ratings, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 16.5, y: 18.0 }], 5);
      const qb = makeOffAgent('QB', 'QB', R.QB1_RICHARDSON.name, 0.0, -4.8, R.QB1_RICHARDSON.ratings, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.0 }]);
      qb.isSnapRecipient = true;
      return [...ol, wr1, wr2, sl, te, qb, rb];
    },
  },
];
