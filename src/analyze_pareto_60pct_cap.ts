import fs from 'node:fs';
import path from 'node:path';
import {
  All22KinematicEngine,
  DefensiveMemoryContext,
  PlayTickSnapshot,
  SimAgent,
  SimFieldContext,
} from './engine.js';
import {
  ADAPTIVE_COUNTER_DEF_FRONTS,
  AdaptiveCounterDefFrontId,
  buildAdaptiveCounterDefense,
  buildModern2027Defense,
  ModernDefFrontId,
} from './vanguard_2027_playbook.js';
import {
  BASELINE_PHILOSOPHIES,
  BaselineRosterProfile,
  buildBaselinePlay,
  CanonicalPlayId,
} from './canonical_baselines.js';
import { CHIRAL_2QB_PLAYBOOK } from './chiral_playbook_presets.js';
import { selectDirectionalSnapSide } from './analyze_read3_scramble_and_dual_qb.js';

// ============================================================================
// 1. DEFENSIVE UNIVERSE (ALL 13 FRONTS — IDENTICAL FOR EVERY PORTFOLIO)
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
const ALL_13_FRONTS: AnyDefFrontId[] = [...LEGACY_9_FRONTS, ...ADAPTIVE_COUNTER_DEF_FRONTS];

function buildAnyDefense(frontId: AnyDefFrontId): SimAgent[] {
  if ((ADAPTIVE_COUNTER_DEF_FRONTS as readonly string[]).includes(frontId)) {
    return buildAdaptiveCounterDefense(frontId as AdaptiveCounterDefFrontId);
  }
  return buildModern2027Defense(frontId as ModernDefFrontId);
}

// ============================================================================
// 2. FIXED 60% OFFENSIVE SALARY CAP ($165.0M ON $275.0M CAP -> $110.0M DEF)
//    Positional Dollar Spend Maps Directly Into 20 Hz Engine Player Ratings
// ============================================================================
const TOTAL_NFL_CAP_M = 275.0;
const FIXED_OFF_CAP_M = 165.0; // Strictly 60.0% offensive spend across ALL portfolios!

interface RatingsBlock {
  speed: number;
  accel: number;
  power: number;
  finesse: number;
  awareness: number;
}

interface BudgetBreakdown {
  qbM: number;
  olM: number;
  wrM: number;
  teM: number;
  rbM: number;
}

interface RosterRatingsTier {
  qb1: RatingsBlock;
  qb2?: RatingsBlock;
  ol: RatingsBlock;
  olBlock: number;
  wr1: RatingsBlock;
  wr2: RatingsBlock;
  sl: RatingsBlock;
  te: RatingsBlock;
  teBlock: number;
  rb: RatingsBlock;
  rbBlock: number;
}

interface PortfolioSpec {
  id: string;
  shortLabel: string;
  label: string;
  schemeFamily: 'CONV_11' | 'SHANAHAN_12' | 'CHIRAL_2QB_STATIC' | 'CHIRAL_2QB_MDP';
  repeatableSteadyState: boolean; // False only for Rookie-Contract Draft-Hit Control
  isDualQbOnField: boolean;
  budget: BudgetBreakdown;
  ratings: RosterRatingsTier;
  oneOutEpaPenalty: number;
  bothOutEpaPenalty: number;
  memoryContext?: DefensiveMemoryContext; // Used only by MDP-Sequenced Chiral 2-QB
}

function clampR(v: number): number {
  return Math.round(Math.max(60, Math.min(97, v)));
}

// Empirically anchored linear-to-diminishing-return curves mapping $M positional cap -> ratings
// Calibrated directly against canonical_baselines.ts ($32M OL=79 -> $56M OL=86 -> $74M OL=93)
function olRatingsFromCap(olM: number): { ratings: RatingsBlock; blockRating: number } {
  const t = Math.max(0, Math.min(1, (olM - 32) / (74 - 32)));
  const curve = Math.pow(t, 0.92);
  const pwr = clampR(79 + curve * 14);
  const fin = clampR(78 + curve * 14);
  const awr = clampR(79 + curve * 13);
  return {
    ratings: {
      speed: clampR(71 + curve * 10),
      accel: clampR(76 + curve * 11),
      power: pwr,
      finesse: fin,
      awareness: awr,
    },
    blockRating: clampR(78 + curve * 15),
  };
}

function wrRatingsFromCap(wrM: number): { wr1: RatingsBlock; wr2: RatingsBlock; sl: RatingsBlock } {
  const t = Math.max(0, Math.min(1, (wrM - 28) / (58 - 28)));
  const c = Math.pow(t, 0.88);
  return {
    wr1: {
      speed: clampR(88 + c * 7),
      accel: clampR(88 + c * 7),
      power: clampR(70 + c * 4),
      finesse: clampR(86 + c * 9),
      awareness: clampR(85 + c * 8),
    },
    wr2: {
      speed: clampR(86 + c * 7),
      accel: clampR(86 + c * 7),
      power: clampR(68 + c * 4),
      finesse: clampR(83 + c * 9),
      awareness: clampR(83 + c * 7),
    },
    sl: {
      speed: clampR(86 + c * 5),
      accel: clampR(87 + c * 5),
      power: clampR(67 + c * 4),
      finesse: clampR(84 + c * 6),
      awareness: clampR(84 + c * 5),
    },
  };
}

function teRatingsFromCap(teM: number): { ratings: RatingsBlock; blockRating: number } {
  const t = Math.max(0, Math.min(1, (teM - 10) / (26 - 10)));
  const c = Math.pow(t, 0.9);
  return {
    ratings: {
      speed: clampR(82 + c * 6),
      accel: clampR(84 + c * 5),
      power: clampR(77 + c * 11),
      finesse: clampR(80 + c * 9),
      awareness: clampR(81 + c * 8),
    },
    blockRating: clampR(76 + c * 13),
  };
}

function rbRatingsFromCap(rbM: number): { ratings: RatingsBlock; blockRating: number } {
  const t = Math.max(0, Math.min(1, (rbM - 6) / (14 - 6)));
  return {
    ratings: {
      speed: clampR(89 + t * 3),
      accel: clampR(90 + t * 3),
      power: clampR(80 + t * 6),
      finesse: clampR(84 + t * 6),
      awareness: clampR(83 + t * 5),
    },
    blockRating: clampR(68 + t * 9),
  };
}

function buildRatingsTier(
  b: BudgetBreakdown,
  qb1: RatingsBlock,
  qb2?: RatingsBlock
): RosterRatingsTier {
  const sum = +(b.qbM + b.olM + b.wrM + b.teM + b.rbM).toFixed(2);
  if (Math.abs(sum - FIXED_OFF_CAP_M) > 0.01) {
    throw new Error(`Budget violation: sum=${sum} !== ${FIXED_OFF_CAP_M}`);
  }
  const ol = olRatingsFromCap(b.olM);
  const wr = wrRatingsFromCap(b.wrM);
  const te = teRatingsFromCap(b.teM);
  const rb = rbRatingsFromCap(b.rbM);
  return {
    qb1,
    qb2,
    ol: ol.ratings,
    olBlock: ol.blockRating,
    wr1: wr.wr1,
    wr2: wr.wr2,
    sl: wr.sl,
    te: te.ratings,
    teBlock: te.blockRating,
    rb: rb.ratings,
    rbBlock: rb.blockRating,
  };
}

// ============================================================================
// 3. THE 8 FIXED-60%-CAP PORTFOLIOS ($165.0M OFFENSE EACH, $110.0M DEFENSE)
// ============================================================================
const ELITE_POCKET_QB: RatingsBlock = { speed: 74, accel: 78, power: 75, finesse: 95, awareness: 95 };
const STAR_POCKET_QB: RatingsBlock = { speed: 76, accel: 80, power: 76, finesse: 94, awareness: 94 };
const SUPERMAX_DUAL_QB: RatingsBlock = { speed: 90, accel: 91, power: 88, finesse: 93, awareness: 92 };
const MID_MOBILE_QB: RatingsBlock = { speed: 89, accel: 90, power: 85, finesse: 84, awareness: 83 };
const DUAL_QB1_FUNGIBLE: RatingsBlock = { speed: 89, accel: 90, power: 86, finesse: 85, awareness: 84 };
const DUAL_QB2_FUNGIBLE: RatingsBlock = { speed: 88, accel: 89, power: 86, finesse: 84, awareness: 82 };
const ROOKIE_HIT_QB: RatingsBlock = { speed: 86, accel: 88, power: 83, finesse: 91, awareness: 90 };

const PORTFOLIOS: PortfolioSpec[] = [
  {
    id: 'P1_CONV11_SUPERMAX_POCKET',
    shortLabel: 'Conv-11 Star QB',
    label: '1. Conv-11 Spread · $60M Elite Pocket / $44M OL',
    schemeFamily: 'CONV_11',
    repeatableSteadyState: true,
    isDualQbOnField: false,
    budget: { qbM: 60, olM: 44, wrM: 39, teM: 14, rbM: 8 },
    ratings: buildRatingsTier({ qbM: 60, olM: 44, wrM: 39, teM: 14, rbM: 8 }, ELITE_POCKET_QB),
    oneOutEpaPenalty: -0.145,
    bothOutEpaPenalty: -0.145,
  },
  {
    id: 'P2_CONV11_STAR_WR_CHEAP_OL',
    shortLabel: 'Air-Raid Star WR',
    label: '2. Conv-11 Stars · $58M QB / $58M WR / $32M OL',
    schemeFamily: 'CONV_11',
    repeatableSteadyState: true,
    isDualQbOnField: false,
    budget: { qbM: 58, olM: 32, wrM: 58, teM: 10, rbM: 7 },
    ratings: buildRatingsTier({ qbM: 58, olM: 32, wrM: 58, teM: 10, rbM: 7 }, STAR_POCKET_QB),
    oneOutEpaPenalty: -0.145,
    bothOutEpaPenalty: -0.145,
  },
  {
    id: 'P3_SHAN12_SUPERMAX_SQUEEZED',
    shortLabel: 'Shan12 $60M QB',
    label: '3. Shanahan-12 · $60M Elite Pocket / $44M Squeezed OL',
    schemeFamily: 'SHANAHAN_12',
    repeatableSteadyState: true,
    isDualQbOnField: false,
    budget: { qbM: 60, olM: 44, wrM: 39, teM: 14, rbM: 8 },
    ratings: buildRatingsTier({ qbM: 60, olM: 44, wrM: 39, teM: 14, rbM: 8 }, ELITE_POCKET_QB),
    oneOutEpaPenalty: -0.145,
    bothOutEpaPenalty: -0.145,
  },
  {
    id: 'P4_SHAN12_SUPERMAX_DUAL_SQUEEZED',
    shortLabel: 'Shan12 $60M Dual',
    label: '4. Shanahan-12 + R3 · $60M Supermax Dual / $44M OL',
    schemeFamily: 'SHANAHAN_12',
    repeatableSteadyState: true,
    isDualQbOnField: false,
    budget: { qbM: 60, olM: 44, wrM: 39, teM: 14, rbM: 8 },
    ratings: buildRatingsTier({ qbM: 60, olM: 44, wrM: 39, teM: 14, rbM: 8 }, SUPERMAX_DUAL_QB),
    oneOutEpaPenalty: -0.155,
    bothOutEpaPenalty: -0.155,
  },
  {
    id: 'P5_SHAN12_TRENCH_BULLY_MID_MOB',
    shortLabel: 'Trench Bully R3',
    label: '5. Shanahan-12 + R3 · $22M Mid-Mob / $74M OL / $26M TE',
    schemeFamily: 'SHANAHAN_12',
    repeatableSteadyState: true,
    isDualQbOnField: false,
    budget: { qbM: 22, olM: 74, wrM: 33, teM: 26, rbM: 10 },
    ratings: buildRatingsTier({ qbM: 22, olM: 74, wrM: 33, teM: 26, rbM: 10 }, MID_MOBILE_QB),
    oneOutEpaPenalty: -0.085,
    bothOutEpaPenalty: -0.085,
  },
  {
    id: 'P6_CHIRAL_2QB_ELITE_OL_STATIC',
    shortLabel: 'Chiral 2QB Static',
    label: '6. Chiral 2-QB Static · $22M 2-QB / $66M OL / $44M WR',
    schemeFamily: 'CHIRAL_2QB_STATIC',
    repeatableSteadyState: true,
    isDualQbOnField: true,
    budget: { qbM: 22, olM: 66, wrM: 44, teM: 21, rbM: 12 },
    ratings: buildRatingsTier(
      { qbM: 22, olM: 66, wrM: 44, teM: 21, rbM: 12 },
      DUAL_QB1_FUNGIBLE,
      DUAL_QB2_FUNGIBLE
    ),
    oneOutEpaPenalty: -0.025,
    bothOutEpaPenalty: -0.105,
  },
  {
    id: 'P7_CHIRAL_2QB_ELITE_OL_MDP',
    shortLabel: 'Chiral 2QB + MDP',
    label: '7. Chiral 2-QB + MDP Seq · $22M 2-QB / $66M OL / $44M WR',
    schemeFamily: 'CHIRAL_2QB_MDP',
    repeatableSteadyState: true,
    isDualQbOnField: true,
    budget: { qbM: 22, olM: 66, wrM: 44, teM: 21, rbM: 12 },
    ratings: buildRatingsTier(
      { qbM: 22, olM: 66, wrM: 44, teM: 21, rbM: 12 },
      DUAL_QB1_FUNGIBLE,
      DUAL_QB2_FUNGIBLE
    ),
    oneOutEpaPenalty: -0.025,
    bothOutEpaPenalty: -0.105,
    // Realistic steady-state MDP sequencing priming (+0.65 avg on married fake snaps, 0.05 low spam)
    memoryContext: {
      familyPriming: {
        PERIMETER_PITCH_TOSS: 0.65,
        SPLIT_GUN_EXCHANGE: 0.65,
        INSIDE_MESH_FAKE: 0.55,
        JET_ORBIT_SWEEP: 0.55,
      },
      realPlayAnticipation: {
        PERIMETER_PITCH_TOSS: 0.05,
        SPLIT_GUN_EXCHANGE: 0.05,
        INSIDE_MESH_FAKE: 0.05,
        JET_ORBIT_SWEEP: 0.05,
      },
    },
  },
  {
    id: 'P8_ROOKIE_WINDOW_SHAN12',
    shortLabel: 'Rookie QB Window*',
    label: '8. Rookie-Hit Control* · $14M Draft QB / $68M OL / $48M WR',
    schemeFamily: 'SHANAHAN_12',
    repeatableSteadyState: false,
    isDualQbOnField: false,
    budget: { qbM: 14, olM: 68, wrM: 48, teM: 22, rbM: 13 },
    ratings: buildRatingsTier({ qbM: 14, olM: 68, wrM: 48, teM: 22, rbM: 13 }, ROOKIE_HIT_QB),
    oneOutEpaPenalty: -0.130,
    bothOutEpaPenalty: -0.130,
  },
];

// ============================================================================
// 4. PLAYBOOK BUILDERS WITH STRICT BUDGET-DRIVEN RATING INJECTION
// ============================================================================
function applyTierToOffense(agents: SimAgent[], tier: RosterRatingsTier, isDualQb: boolean): SimAgent[] {
  return agents.map((a) => {
    const clone: SimAgent = JSON.parse(JSON.stringify(a));
    if (['LT', 'LG', 'C', 'RG', 'RT'].includes(clone.pos)) {
      clone.ratings = { ...tier.ol };
      clone.blockRating = tier.olBlock;
    } else if (clone.id === 'QB') {
      clone.ratings = { ...tier.qb1 };
      clone.blockRating = 48;
    } else if (clone.id === 'RB' && isDualQb && clone.pos === 'QB') {
      clone.ratings = { ...(tier.qb2 ?? tier.qb1) };
      clone.blockRating = 48;
    } else if (clone.id === 'RB') {
      clone.ratings = { ...tier.rb };
      clone.blockRating = tier.rbBlock;
    } else if (clone.id === 'WR1') {
      clone.ratings = { ...tier.wr1 };
      clone.blockRating = 58;
    } else if (clone.id === 'WR2') {
      clone.ratings = { ...tier.wr2 };
      clone.blockRating = 58;
    } else if (clone.pos === 'TE' || clone.id === 'TE') {
      clone.ratings = { ...tier.te };
      clone.blockRating = tier.teBlock;
    } else if (clone.id === 'SL') {
      clone.ratings = { ...tier.sl };
      clone.blockRating = 62;
    }
    if (clone.optionPass?.enabled) {
      clone.optionPass.throwerRating = clone.ratings.finesse;
    }
    return clone;
  });
}

function mirrorOffenseHorizontally(agents: SimAgent[]): SimAgent[] {
  const gapFlip: Record<string, string> = {
    A_LEFT: 'A_RIGHT',
    A_RIGHT: 'A_LEFT',
    B_LEFT: 'B_RIGHT',
    B_RIGHT: 'B_LEFT',
    C_LEFT: 'C_RIGHT',
    C_RIGHT: 'C_LEFT',
  };
  return agents.map((raw) => {
    const a: SimAgent = JSON.parse(JSON.stringify(raw));
    a.startX = +(-a.startX).toFixed(2);
    a.x = a.startX;
    a.assignment.waypoints = a.assignment.waypoints.map((w) => ({ x: +(-w.x).toFixed(2), y: w.y }));
    if (gapFlip[a.assignment.gapOrSet]) {
      a.assignment.gapOrSet = gapFlip[a.assignment.gapOrSet] as SimAgent['assignment']['gapOrSet'];
    }
    if (a.designedScrambleRead?.enabled) {
      a.designedScrambleRead.voidCorridorCenterX = +(-a.designedScrambleRead.voidCorridorCenterX).toFixed(2);
      a.designedScrambleRead.scrambleWaypoints = a.designedScrambleRead.scrambleWaypoints.map((w) => ({
        x: +(-w.x).toFixed(2),
        y: w.y,
      }));
    }
    if (a.fakeAction?.enabled && a.fakeAction.fakeDirectionX !== undefined) {
      a.fakeAction.fakeDirectionX = +(-a.fakeAction.fakeDirectionX).toFixed(2);
    }
    if (a.playAction?.enabled && a.playAction.bootDirection) {
      a.playAction.bootDirection = a.playAction.bootDirection === 'RIGHT' ? 'LEFT' : 'RIGHT';
    }
    return a;
  });
}

function buildSingleQbRead3Mesh(tier: RosterRatingsTier): SimAgent[] {
  const baseProfile: BaselineRosterProfile = {
    ...BASELINE_PHILOSOPHIES.find((p) => p.id === 'SHANAHAN_12_PA')!,
    ol: tier.ol,
    qb: tier.qb1,
    rb: tier.rb,
    wr1: tier.wr1,
    wr2: tier.wr2,
    sl: tier.sl,
    te: tier.te,
  };
  const off = buildBaselinePlay(baseProfile, 'MESH');
  const patched = applyTierToOffense(off, tier, false);
  const qb = patched.find((a) => a.id === 'QB');
  if (qb) {
    qb.designedScrambleRead = {
      enabled: true,
      afterReadOrder: 2,
      minDecisionTimeSec: 1.85,
      voidCorridorCenterX: 0.0,
      voidCorridorHalfWidthX: 3.0,
      voidCorridorMaxY: 8.0,
      maxDefendersInVoid: 0,
      fallbackReceiverId: 'RB',
      scrambleWaypoints: [
        { x: 0.0, y: -1.5 },
        { x: 0.4, y: 4.5 },
        { x: 0.6, y: 14.0 },
      ],
    };
  }
  return patched;
}

interface PlayRunner {
  id: string;
  bucket: 'OPEN' | 'PASS_3RD' | 'SHORT_RUN';
  isFake: boolean;
  build: (def: SimAgent[], rep: number) => { off: SimAgent[]; qb2TookSnap: boolean };
}

function buildPlaysForPortfolio(p: PortfolioSpec): PlayRunner[] {
  const baseTemplate = BASELINE_PHILOSOPHIES.find(
    (b) => b.id === (p.schemeFamily === 'CONV_11' ? 'CONV_11_SPREAD' : 'SHANAHAN_12_PA')
  )!;
  const profile: BaselineRosterProfile = {
    ...baseTemplate,
    ol: p.ratings.ol,
    qb: p.ratings.qb1,
    rb: p.ratings.rb,
    wr1: p.ratings.wr1,
    wr2: p.ratings.wr2,
    sl: p.ratings.sl,
    te: p.ratings.te,
  };

  const makeCanon = (id: CanonicalPlayId, bucket: PlayRunner['bucket']): PlayRunner => ({
    id,
    bucket,
    isFake: false,
    build: () => ({
      off: applyTierToOffense(buildBaselinePlay(profile, id), p.ratings, false),
      qb2TookSnap: false,
    }),
  });

  if (p.schemeFamily === 'CONV_11') {
    return [
      makeCanon('DAGGER', 'PASS_3RD'),
      makeCanon('MESH', 'PASS_3RD'),
      makeCanon('FOUR_VERTS', 'PASS_3RD'),
      makeCanon('PA_FLOOD', 'OPEN'),
      makeCanon('QUICK_SLANT', 'OPEN'),
      makeCanon('INSIDE_ZONE', 'SHORT_RUN'),
      makeCanon('OUTSIDE_ZONE', 'SHORT_RUN'),
      makeCanon('DUO', 'SHORT_RUN'),
    ];
  }

  if (p.schemeFamily === 'SHANAHAN_12') {
    const useRead3 = p.ratings.qb1.speed >= 85;
    const plays: PlayRunner[] = [
      makeCanon('PA_UC_BOOT', 'OPEN'),
      makeCanon('PA_FLOOD', 'OPEN'),
      makeCanon('QUICK_SLANT', 'OPEN'),
      makeCanon('DAGGER', 'PASS_3RD'),
      useRead3
        ? {
            id: 'READ3_MESH_VOID',
            bucket: 'PASS_3RD',
            isFake: false,
            build: () => ({ off: buildSingleQbRead3Mesh(p.ratings), qb2TookSnap: false }),
          }
        : makeCanon('MESH', 'PASS_3RD'),
      makeCanon('OUTSIDE_ZONE', 'SHORT_RUN'),
      makeCanon('DUO', 'SHORT_RUN'),
      makeCanon('PIN_PULL', 'SHORT_RUN'),
    ];
    return plays;
  }

  // CHIRAL 2-QB (All 8 identical-alignment plays from CHIRAL_2QB_PLAYBOOK, mirrored dynamically by observable pre-snap def!)
  const bucketMap: Record<string, PlayRunner['bucket']> = {
    CHIRAL_DIRECT_SNAP_LASER: 'OPEN',
    CHIRAL_FAKE_PITCH_COUNTER_KEEP: 'OPEN',
    CHIRAL_FAKE_EXCHANGE_BOOT_FLOOD: 'OPEN',
    CHIRAL_PA_SEAM_FLOOD: 'PASS_3RD',
    CHIRAL_FAKE_SWEEP_READ3_SEAM: 'PASS_3RD',
    CHIRAL_READ3_MESH_VOID: 'PASS_3RD',
    CHIRAL_REACTOR_SWEEP: 'SHORT_RUN',
    CHIRAL_SPLIT_GUN_INSIDE_EXCHANGE: 'SHORT_RUN',
  };

  return CHIRAL_2QB_PLAYBOOK.map((cp) => ({
    id: cp.id,
    bucket: bucketMap[cp.id] ?? 'OPEN',
    isFake: cp.isFake,
    build: (def: SimAgent[], rep: number) => {
      const { side } = selectDirectionalSnapSide(def, rep);
      let off = applyTierToOffense(cp.buildOffense(), p.ratings, true);
      if (side === 'LEFT') {
        off = mirrorOffenseHorizontally(off);
      }
      const snapAgent = off.find((a) => a.isSnapRecipient);
      const qb2TookSnap = snapAgent ? snapAgent.id === 'RB' : side === 'RIGHT';
      return { off, qb2TookSnap };
    },
  }));
}

// ============================================================================
// 5. ZERO-SUM NASH SOLVER (EXP3 / REGRET MATCHING+)
// ============================================================================
function solveZeroSumNash(
  rowLabels: string[],
  colLabels: string[],
  payoff: number[][]
): { value: number; offMix: Record<string, number>; defMix: Record<string, number> } {
  const m = rowLabels.length;
  const n = colLabels.length;
  const p = new Array<number>(m).fill(1 / m);
  const q = new Array<number>(n).fill(1 / n);
  const pSum = new Array<number>(m).fill(0);
  const qSum = new Array<number>(n).fill(0);
  const regP = new Array<number>(m).fill(0);
  const regQ = new Array<number>(n).fill(0);

  const ITERS = 12000;
  for (let t = 1; t <= ITERS; t++) {
    const rowVal = new Array<number>(m).fill(0);
    const colVal = new Array<number>(n).fill(0);
    let expected = 0;
    for (let i = 0; i < m; i++) {
      let rv = 0;
      for (let j = 0; j < n; j++) rv += payoff[i][j] * q[j];
      rowVal[i] = rv;
      expected += p[i] * rv;
    }
    for (let j = 0; j < n; j++) {
      let cv = 0;
      for (let i = 0; i < m; i++) cv += p[i] * payoff[i][j];
      colVal[j] = cv;
    }
    for (let i = 0; i < m; i++) regP[i] = Math.max(0, regP[i] + (rowVal[i] - expected));
    for (let j = 0; j < n; j++) regQ[j] = Math.max(0, regQ[j] + (expected - colVal[j]));

    const sumRP = regP.reduce((a, b) => a + b, 0);
    const sumRQ = regQ.reduce((a, b) => a + b, 0);
    for (let i = 0; i < m; i++) p[i] = sumRP > 1e-12 ? regP[i] / sumRP : 1 / m;
    for (let j = 0; j < n; j++) q[j] = sumRQ > 1e-12 ? regQ[j] / sumRQ : 1 / n;

    if (t > ITERS * 0.25) {
      for (let i = 0; i < m; i++) pSum[i] += p[i];
      for (let j = 0; j < n; j++) qSum[j] += q[j];
    }
  }

  const pTot = pSum.reduce((a, b) => a + b, 0) || 1;
  const qTot = qSum.reduce((a, b) => a + b, 0) || 1;
  const pAvg = pSum.map((v) => v / pTot);
  const qAvg = qSum.map((v) => v / qTot);

  let val = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) val += pAvg[i] * payoff[i][j] * qAvg[j];
  }
  const offMix: Record<string, number> = {};
  const defMix: Record<string, number> = {};
  rowLabels.forEach((lbl, i) => (offMix[lbl] = +(pAvg[i] * 100).toFixed(1)));
  colLabels.forEach((lbl, j) => (defMix[lbl] = +(qAvg[j] * 100).toFixed(1)));
  return { value: +val.toFixed(4), offMix, defMix };
}

// ============================================================================
// 6. COMPACT OUTCOME COMPRESSION + 500-SEASON 4-DOWN MONTE CARLO (EQUAL DEF!)
// ============================================================================
interface CompactOutcome {
  y: number;
  e: number;
  r: string;
  p: 0 | 1;
  qr: 0 | 1;
  q2: 0 | 1;
  sec: number;
}

function compressOutcome(traj: PlayTickSnapshot[], qb2TookSnap: boolean): CompactOutcome {
  const term = traj[traj.length - 1];
  const reason = term.terminationReason ?? 'TACKLED';
  const r =
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
    r,
    p: isPass ? 1 : 0,
    qr: isQbRush ? 1 : 0,
    q2: qb2TookSnap ? 1 : 0,
    sec: +(term.timeSec ?? 3.5).toFixed(1),
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

function sampleWeighted(weights: [string, number][], rng: () => number): string {
  let tot = 0;
  for (const [, w] of weights) tot += w;
  if (tot <= 0) return weights[0][0];
  let r = rng() * tot;
  for (const [k, w] of weights) {
    r -= w;
    if (r <= 0) return k;
  }
  return weights[weights.length - 1][0];
}

function fgMakeProb(kickDistYds: number): number {
  if (kickDistYds <= 29) return 0.985;
  if (kickDistYds <= 39) return 0.935;
  if (kickDistYds <= 44) return 0.875;
  if (kickDistYds <= 49) return 0.815;
  if (kickDistYds <= 54) return 0.725;
  if (kickDistYds <= 58) return 0.56;
  return 0.36;
}

function degradeForBackup(o: CompactOutcome, epaPenalty: number, rng: () => number): CompactOutcome {
  if (epaPenalty >= -0.005) return o;
  const sev = Math.min(1.0, Math.abs(epaPenalty) / 0.16);
  if (o.p === 1 && (o.r === 'C' || o.r === 'TD')) {
    const roll = rng();
    if (roll < 0.022 * sev) return { ...o, y: 0, r: 'INT' };
    if (roll < 0.054 * sev) return { ...o, y: -6.5, r: 'S' };
    if (roll < 0.139 * sev) return { ...o, y: 0, r: 'I' };
    return { ...o, y: Math.max(0, +(o.y * (1 - 0.10 * sev)).toFixed(1)) };
  }
  if (o.qr === 1) return { ...o, y: +(o.y - 1.2 * sev).toFixed(1) };
  return o;
}

function applyHaircut(o: CompactOutcome, haircutFrac: number, rng: () => number): CompactOutcome {
  if (haircutFrac <= 0 || o.y <= 0) return o;
  if (o.r === 'T' || o.r === 'C' || o.r === 'OOB' || o.r === 'TD') {
    return { ...o, y: +(o.y * (1 - haircutFrac * (0.75 + rng() * 0.5))).toFixed(1) };
  }
  return o;
}

function simulateOpponentDrive(startBallOn: number, rng: () => number): { pts: number; nextOffBallOn: number; elapsed: number } {
  // Identical 40%-cap defense for ALL 8 portfolios (league-average ~21.8 PA/G baseline)
  const fieldFactor = (startBallOn - 25) * 0.0045;
  const pTd = Math.max(0.08, Math.min(0.45, 0.225 + fieldFactor));
  const pFg = Math.max(0.08, Math.min(0.28, 0.165 + fieldFactor * 0.4));
  const pTo = 0.115;
  const roll = rng();
  const elapsed = 125 + rng() * 115;
  if (roll < pTd) return { pts: 7, nextOffBallOn: 28, elapsed };
  if (roll < pTd + pFg) return { pts: 3, nextOffBallOn: 28, elapsed };
  if (roll < pTd + pFg + pTo) return { pts: 0, nextOffBallOn: Math.min(82, Math.max(20, 100 - startBallOn - 12)), elapsed: elapsed * 0.65 };
  return { pts: 0, nextOffBallOn: Math.min(48, Math.max(12, 100 - (startBallOn + 22 + 42))), elapsed };
}

interface SeasonMetrics {
  avgWins: number;
  playoffPct: number;
  sbPct: number;
  pfG: number;
  paG: number;
  diffG: number;
  qb1HealthyG: number;
  qb1HitsYr: number;
  qb2HitsYr: number;
}

function run500Seasons(
  p: PortfolioSpec,
  playBuckets: Record<string, PlayRunner['bucket']>,
  nashOffMix: Record<string, number>,
  nashDefMix: Record<string, number>,
  pools: Record<string, Record<string, CompactOutcome[]>>,
  haircutFrac: number,
  seed: number
): SeasonMetrics {
  const rng = createRng(seed);
  const SEASONS = 500;
  const baseDefW: Record<string, number> = {
    NICKEL_OVER_C3: 18,
    NICKEL_UNDER_C1: 15,
    NICKEL_SIM_C2: 12,
    DIME_QUARTERS_MATCH: 15,
    BASE_34_BEAR_C4: 10,
    BASE_43_OVER_C1: 10,
    VIKINGS_SAFETY_BLITZ_C1: 8,
    DIME_MUG_C0: 6,
    VIKINGS_MUG_CROSSDOG_C0: 6,
  };
  const blended: Record<string, number> = {};
  for (const [k, v] of Object.entries(baseDefW)) blended[k] = (blended[k] ?? 0) + v * 0.55;
  for (const [k, v] of Object.entries(nashDefMix)) if (v > 0) blended[k] = (blended[k] ?? 0) + v * 0.45;
  const defWeights = Object.entries(blended).filter(([, w]) => w > 0) as [string, number][];

  const allIds = Object.keys(playBuckets);
  const passIds = allIds.filter((id) => playBuckets[id] === 'PASS_3RD' || (playBuckets[id] === 'OPEN' && !id.includes('LASER')));
  const runIds = allIds.filter((id) => playBuckets[id] === 'SHORT_RUN' || id.includes('LASER'));

  const pickSubset = (ids: string[]) => {
    const sw: [string, number][] = ids.map((id) => [
      id,
      Math.max(12.0, Math.min(52.0, (nashOffMix[id] ?? 0) * 0.75 + 14.0)),
    ]);
    return sampleWeighted(sw, rng);
  };

  let totWins = 0;
  let playoffs = 0;
  let sbs = 0;
  let totPf = 0;
  let totPa = 0;
  let totQb1G = 0;
  let totQb1Hits = 0;
  let totQb2Hits = 0;

  for (let s = 0; s < SEASONS; s++) {
    let qb1OutRem = 0;
    let qb2OutRem = 0;
    let sWins = 0;
    let sPf = 0;
    let sPa = 0;

    for (let g = 0; g < 17; g++) {
      const qb1H = qb1OutRem === 0;
      const qb2H = qb2OutRem === 0;
      if (qb1H) totQb1G++;
      const penalty = qb1H && qb2H ? 0 : !qb1H && !qb2H ? p.bothOutEpaPenalty : p.oneOutEpaPenalty;

      let clock = 3600;
      let offHasBall = rng() < 0.5;
      let ballOn = 28;
      let pf = 0;
      let pa = 0;
      let qb1Inj = false;
      let qb2Inj = false;

      while (clock > 30) {
        if (offHasBall) {
          let down = 1;
          let toGo = Math.min(10, 100 - ballOn);
          let elapsed = 0;
          let scored = false;

          while (elapsed < clock) {
            const twoMin = clock - elapsed <= 130;
            if (down === 4) {
              const kickDist = 100 - ballOn + 17;
              const goForIt =
                (ballOn >= 60 && toGo <= 2) ||
                (ballOn >= 96 && toGo <= 3) ||
                (ballOn >= 48 && ballOn <= 62 && toGo <= 1) ||
                (twoMin && ballOn >= 45 && toGo <= 5);
              if (!goForIt) {
                if (kickDist <= 57) {
                  elapsed += 5;
                  if (rng() < fgMakeProb(kickDist)) {
                    pf += 3;
                    ballOn = 30;
                  } else {
                    ballOn = Math.max(20, 100 - Math.max(20, ballOn - 7));
                  }
                } else {
                  elapsed += 7;
                  const landing = ballOn + 37 + rng() * 11;
                  ballOn = landing >= 100 ? 20 : Math.max(5, Math.round(100 - landing));
                }
                scored = true;
                break;
              }
            }

            let passProb = p.isDualQbOnField ? 0.46 : 0.52;
            if (twoMin) passProb = 0.94;
            else if (down >= 3 && toGo >= 7) passProb = 0.93;
            else if (down >= 3 && toGo >= 4) passProb = 0.78;
            else if (down >= 3 && toGo <= 2) passProb = 0.36;
            else if (down === 2 && toGo >= 8) passProb = 0.74;
            else if (down === 2 && toGo <= 3) passProb = 0.42;

            const playId = rng() < passProb && passIds.length > 0 ? pickSubset(passIds) : runIds.length > 0 ? pickSubset(runIds) : pickSubset(allIds);
            const defId = sampleWeighted(defWeights, rng);
            const rawPool = pools[playId][defId];
            const raw = rawPool[Math.floor(rng() * rawPool.length)];
            const out = degradeForBackup(applyHaircut(raw, haircutFrac, rng), penalty, rng);

            if (out.r === 'S' || out.qr === 1) {
              const isQ2 = p.isDualQbOnField && out.q2 === 1;
              if (isQ2) totQb2Hits++;
              else totQb1Hits++;
              const injP = out.r === 'S' ? 0.0022 : 0.00145;
              if (rng() < injP) {
                if (isQ2) qb2Inj = true;
                else qb1Inj = true;
              }
            }

            elapsed += twoMin ? (out.r === 'I' || out.r === 'OOB' ? 7 : 18) : out.r === 'I' || out.r === 'OOB' ? 12 : 31;

            if (out.r === 'INT' || out.r === 'FL') {
              ballOn = Math.max(5, Math.min(95, 100 - (ballOn + Math.max(0, out.y))));
              scored = true;
              break;
            }
            if (out.r === 'TD' || ballOn + out.y >= 100) {
              pf += 7;
              ballOn = 28;
              scored = true;
              break;
            }
            ballOn = Math.max(1, ballOn + out.y);
            if (out.y >= toGo) {
              down = 1;
              toGo = Math.min(10, 100 - ballOn);
            } else {
              down++;
              toGo -= out.y;
              if (down > 4) {
                ballOn = Math.max(5, Math.min(95, 100 - ballOn));
                scored = true;
                break;
              }
            }
          }
          if (!scored) ballOn = 28;
          clock -= Math.max(25, elapsed);
          offHasBall = false;
        } else {
          const opp = simulateOpponentDrive(ballOn, rng);
          pa += opp.pts;
          ballOn = opp.nextOffBallOn;
          clock -= Math.max(25, opp.elapsed);
          offHasBall = true;
        }
      }

      if (pf === pa) {
        if (rng() < 0.5) pf += 3;
        else pa += 3;
      }
      if (pf > pa) sWins += 1;
      sPf += pf;
      sPa += pa;

      if (qb1OutRem > 0) qb1OutRem--;
      if (qb2OutRem > 0) qb2OutRem--;
      if (qb1Inj && qb1OutRem === 0) qb1OutRem = 1 + Math.floor(rng() * 5);
      if (qb2Inj && qb2OutRem === 0) qb2OutRem = 1 + Math.floor(rng() * 5);
    }

    totWins += sWins;
    totPf += sPf / 17;
    totPa += sPa / 17;
    if (sWins >= 10) {
      playoffs++;
      const netDiff = (sPf - sPa) / 17;
      // Realistic 3-round or 4-round NFL playoff win probability from team net point differential
      const singleGameP = 1 / (1 + Math.exp(-(netDiff - 3.5) / 6.2));
      const rounds = sWins >= 13 ? 3 : 4;
      if (rng() < Math.pow(singleGameP, rounds)) sbs++;
    }
  }

  return {
    avgWins: +(totWins / SEASONS).toFixed(2),
    playoffPct: +((playoffs / SEASONS) * 100).toFixed(1),
    sbPct: +((sbs / SEASONS) * 100).toFixed(1),
    pfG: +(totPf / SEASONS).toFixed(2),
    paG: +(totPa / SEASONS).toFixed(2),
    diffG: +((totPf - totPa) / SEASONS).toFixed(2),
    qb1HealthyG: +(totQb1G / SEASONS).toFixed(2),
    qb1HitsYr: +(totQb1Hits / SEASONS).toFixed(1),
    qb2HitsYr: +(totQb2Hits / SEASONS).toFixed(1),
  };
}

// ============================================================================
// 7. MARGINAL POSITIONAL DOLLAR AUDIT (+$10M SHIFT AT CONSTANT $165M CAP)
// ============================================================================
function evaluateMarginalCapShifts(engine: All22KinematicEngine) {
  const baseBudget: BudgetBreakdown = { qbM: 22, olM: 58, wrM: 46, teM: 24, rbM: 15 }; // $165M balanced mid-mobile base
  const shifts: Array<{ id: string; label: string; budget: BudgetBreakdown; qb: RatingsBlock }> = [
    { id: 'BASE_BALANCED', label: 'Balanced Base ($22QB/$58OL/$46WR/$24TE/$15RB)', budget: baseBudget, qb: MID_MOBILE_QB },
    { id: 'PLUS_12M_OL_MINUS_WR', label: '+$12M OL (from WR): $70M OL / $34M WR', budget: { qbM: 22, olM: 70, wrM: 34, teM: 24, rbM: 15 }, qb: MID_MOBILE_QB },
    { id: 'PLUS_12M_WR_MINUS_OL', label: '+$12M WR (from OL): $46M OL / $58M WR', budget: { qbM: 22, olM: 46, wrM: 58, teM: 24, rbM: 15 }, qb: MID_MOBILE_QB },
    { id: 'PLUS_10M_TE_MINUS_WR', label: '+$10M TE (from WR): $34M TE -> capped $26M / +$2M OL', budget: { qbM: 22, olM: 60, wrM: 38, teM: 26, rbM: 19 }, qb: MID_MOBILE_QB },
    { id: 'UPGRADE_QB_FROM_OL_WR', label: '+$38M Elite QB (from OL -$20M, WR -$10M, TE -$8M)', budget: { qbM: 60, olM: 38, wrM: 36, teM: 16, rbM: 15 }, qb: ELITE_POCKET_QB },
  ];

  const evalPlays: CanonicalPlayId[] = ['PA_UC_BOOT', 'PA_FLOOD', 'DAGGER', 'QUICK_SLANT', 'OUTSIDE_ZONE', 'DUO', 'PIN_PULL'];
  const baseTemplate = BASELINE_PHILOSOPHIES.find((b) => b.id === 'SHANAHAN_12_PA')!;
  const REPS = 12;

  const results: Array<{ id: string; label: string; mean13Epa: number; deltaVsBase: number; olAvg: number; wr1Fin: number; teBlk: number }> = [];
  let baseEpa = 0;

  for (let idx = 0; idx < shifts.length; idx++) {
    const sh = shifts[idx];
    const tier = buildRatingsTier(sh.budget, sh.qb);
    const prof: BaselineRosterProfile = {
      ...baseTemplate,
      ol: tier.ol,
      qb: tier.qb1,
      rb: tier.rb,
      wr1: tier.wr1,
      wr2: tier.wr2,
      sl: tier.sl,
      te: tier.te,
    };
    let epaSum = 0;
    let cnt = 0;
    for (const pid of evalPlays) {
      for (const defId of ALL_13_FRONTS) {
        for (let r = 0; r < REPS; r++) {
          const off = applyTierToOffense(buildBaselinePlay(prof, pid), tier, false);
          const def = buildAnyDefense(defId);
          const traj = engine.simulatePlay([...off, ...def], 0.65);
          epaSum += traj[traj.length - 1].expectedEpa ?? 0;
          cnt++;
        }
      }
    }
    const mean13Epa = +(epaSum / cnt).toFixed(4);
    if (idx === 0) baseEpa = mean13Epa;
    results.push({
      id: sh.id,
      label: sh.label,
      mean13Epa,
      deltaVsBase: +(mean13Epa - baseEpa).toFixed(4),
      olAvg: tier.olBlock,
      wr1Fin: tier.wr1.finesse,
      teBlk: tier.teBlock,
    });
  }
  return results;
}

// ============================================================================
// 8. MAIN EXECUTION
// ============================================================================
function main() {
  const engine = new All22KinematicEngine();
  const REPS = 18; // 18 stochastic reps x 8 plays x 13 fronts = 1,872 snaps/portfolio (~15,000 snaps total)

  console.log('================================================================================');
  console.log(`FIXED 60% OFFENSIVE CAP ($${FIXED_OFF_CAP_M}M / $${TOTAL_NFL_CAP_M}M) GM x OC PARETO FRONTIER`);
  console.log('================================================================================');

  const portfolioResults: any[] = [];

  for (let pIdx = 0; pIdx < PORTFOLIOS.length; pIdx++) {
    const port = PORTFOLIOS[pIdx];
    const plays = buildPlaysForPortfolio(port);
    const playIds = plays.map((pl) => pl.id);
    const playBuckets: Record<string, PlayRunner['bucket']> = {};
    const pools: Record<string, Record<string, CompactOutcome[]>> = {};
    const payoff13: number[][] = [];
    let mean13Sum = 0;

    for (const pl of plays) {
      playBuckets[pl.id] = pl.bucket;
      pools[pl.id] = {};
      const row: number[] = [];
      for (const frontId of ALL_13_FRONTS) {
        const cell: CompactOutcome[] = [];
        let cellEpa = 0;
        for (let r = 0; r < REPS; r++) {
          const def = buildAnyDefense(frontId);
          const { off, qb2TookSnap } = pl.build(def, r);
          const fCtx: SimFieldContext | undefined = port.memoryContext
            ? { defensiveMemory: port.memoryContext }
            : undefined;
          const traj = engine.simulatePlay([...off, ...def], 0.65, fCtx);
          const comp = compressOutcome(traj, qb2TookSnap);
          cell.push(comp);
          cellEpa += comp.e;
        }
        const mEpa = +(cellEpa / REPS).toFixed(4);
        row.push(mEpa);
        mean13Sum += mEpa;
        pools[pl.id][frontId] = cell;
      }
      payoff13.push(row);
    }

    const nash13 = solveZeroSumNash(playIds, ALL_13_FRONTS, payoff13);
    const mean13RawEpa = +(mean13Sum / (plays.length * ALL_13_FRONTS.length)).toFixed(4);

    // Primary Apples-to-Apples 500-Season MC (0% haircut for ALL portfolios, identical 40% DEF!)
    const seasonEqual0 = run500Seasons(port, playBuckets, nash13.offMix, nash13.defMix, pools, 0.0, 202700 + pIdx * 31);

    // Sensitivity check for exotic schemes (10% and 20% film-adaptation haircuts)
    const seasonHaircut10 = port.isDualQbOnField
      ? run500Seasons(port, playBuckets, nash13.offMix, nash13.defMix, pools, 0.10, 202700 + pIdx * 31)
      : null;
    const seasonHaircut20 = port.isDualQbOnField
      ? run500Seasons(port, playBuckets, nash13.offMix, nash13.defMix, pools, 0.20, 202700 + pIdx * 31)
      : null;

    const topPlays = Object.entries(nash13.offMix)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}:${v}%`)
      .join(', ');

    console.log(
      `${port.shortLabel.padEnd(18)} | Cap=$${port.budget.qbM}Q/${port.budget.olM}OL/${port.budget.wrM}WR/${port.budget.teM}TE | ` +
        `Nash13=${nash13.value >= 0 ? '+' : ''}${nash13.value.toFixed(3)} | ` +
        `Wins=${seasonEqual0.avgWins.toFixed(2)} | PF=${seasonEqual0.pfG.toFixed(1)} | SB=${seasonEqual0.sbPct.toFixed(1)}% | Top=[${topPlays}]`
    );

    portfolioResults.push({
      id: port.id,
      shortLabel: port.shortLabel,
      label: port.label,
      schemeFamily: port.schemeFamily,
      repeatableSteadyState: port.repeatableSteadyState,
      isDualQbOnField: port.isDualQbOnField,
      budget: port.budget,
      ratingsSummary: {
        qb1FinAwr: Math.round((port.ratings.qb1.finesse + port.ratings.qb1.awareness) / 2),
        qb1Spd: port.ratings.qb1.speed,
        olBlock: port.ratings.olBlock,
        wr1Fin: port.ratings.wr1.finesse,
        teBlock: port.ratings.teBlock,
      },
      nash13Epa: nash13.value,
      mean13RawEpa,
      nash13OffMix: nash13.offMix,
      seasonEqual0,
      seasonHaircut10,
      seasonHaircut20,
    });
  }

  console.log('\n--- MARGINAL CAP REALLOCATION AUDIT (FIXED $165M OFFENSE, SHANAHAN-12) ---');
  const marginalShifts = evaluateMarginalCapShifts(engine);
  for (const m of marginalShifts) {
    console.log(
      `  ${m.label.padEnd(56)} | Mean13EPA=${m.mean13Epa >= 0 ? '+' : ''}${m.mean13Epa.toFixed(4)} | Δ=${m.deltaVsBase >= 0 ? '+' : ''}${m.deltaVsBase.toFixed(4)}`
    );
  }

  // Compute Pareto-nondominated steady-state frontier on (nash13Epa, avgWins, qbCapM-efficiency)
  const steadyState = portfolioResults.filter((r) => r.repeatableSteadyState);
  const paretoIds = steadyState
    .filter((a) => !steadyState.some((b) => b.id !== a.id && b.nash13Epa >= a.nash13Epa && b.seasonEqual0.avgWins >= a.seasonEqual0.avgWins && (b.nash13Epa > a.nash13Epa || b.seasonEqual0.avgWins > a.seasonEqual0.avgWins)))
    .map((a) => a.id);

  console.log('\nSTEADY-STATE PARETO FRONTIER (NON-DOMINATED AT $165M / 60% CAP):', paretoIds);

  const report = {
    generatedAt: new Date().toISOString(),
    totalNflCapM: TOTAL_NFL_CAP_M,
    fixedOffCapM: FIXED_OFF_CAP_M,
    fixedOffCapPct: 60.0,
    repsPerCell: REPS,
    seasonsPerPortfolio: 500,
    frontsEvaluated: ALL_13_FRONTS,
    methodologyNote:
      'Strict 60.0% ($165.0M) offensive salary cap held identical across all 8 portfolios with equal 40% defense ($110.0M, zero assumed defCapBonusPpg) and equal 0% baseline adaptation haircut, plus 10%/20% adaptation sensitivity on exotic 2-QB schemes.',
    paretoFrontierSteadyStateIds: paretoIds,
    portfolios: portfolioResults,
    marginalCapShifts: marginalShifts,
  };

  const outPath = path.join(process.cwd(), 'src', 'data', 'pareto_60pct_cap_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nWrote ${outPath}`);
}

main();
