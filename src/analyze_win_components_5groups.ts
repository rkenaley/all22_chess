import fs from 'node:fs';
import path from 'node:path';
import {
  All22KinematicEngine,
  PlayTickSnapshot,
  SimAgent,
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

// ============================================================================
// 1. DEFENSIVE UNIVERSE (ALL 13 ADAPTIVE FRONTS)
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
// 2. POSITIONAL GROUP LOW (25th-pct Budget) VS HIGH (90th-pct All-Pro) TIERS
//    Exact same cap-to-rating anchors as analyze_pareto_60pct_cap.ts
// ============================================================================
type GroupKey = 'QB' | 'OL' | 'WR' | 'TE' | 'RB';
const GROUPS: GroupKey[] = ['QB', 'OL', 'WR', 'TE', 'RB'];

interface RatingsBlock {
  speed: number;
  accel: number;
  power: number;
  finesse: number;
  awareness: number;
}

const GROUP_TIERS: Record<
  GroupKey,
  {
    lowCapM: number;
    highCapM: number;
    deltaCapM: number;
    lowLabel: string;
    highLabel: string;
    lowRatings: RatingsBlock;
    highRatings: RatingsBlock;
    lowBlock?: number;
    highBlock?: number;
  }
> = {
  QB: {
    lowCapM: 20,
    highCapM: 60,
    deltaCapM: 40,
    lowLabel: 'Mid-Mobile QB ($20M: 89 SPD / 84 FIN / 83 AWR)',
    highLabel: 'Elite Pocket QB ($60M: 74 SPD / 95 FIN / 95 AWR)',
    lowRatings: { speed: 89, accel: 90, power: 85, finesse: 84, awareness: 83 },
    highRatings: { speed: 74, accel: 78, power: 75, finesse: 95, awareness: 95 },
  },
  OL: {
    lowCapM: 38,
    highCapM: 74,
    deltaCapM: 36,
    lowLabel: 'Budget OL ($38M: 80 BLK / 81 PWR / 80 FIN)',
    highLabel: 'Elite OL ($74M: 93 BLK / 93 PWR / 92 FIN)',
    lowRatings: { speed: 72, accel: 78, power: 81, finesse: 80, awareness: 81 },
    highRatings: { speed: 81, accel: 87, power: 93, finesse: 92, awareness: 92 },
    lowBlock: 80,
    highBlock: 93,
  },
  WR: {
    lowCapM: 30,
    highCapM: 58,
    deltaCapM: 28,
    lowLabel: 'Budget WR Corps ($30M: WR1 88 SPD / 87 FIN)',
    highLabel: 'Elite WR Corps ($58M: WR1 95 SPD / 95 FIN)',
    lowRatings: { speed: 88, accel: 88, power: 70, finesse: 87, awareness: 86 },
    highRatings: { speed: 95, accel: 95, power: 74, finesse: 95, awareness: 93 },
  },
  TE: {
    lowCapM: 10,
    highCapM: 26,
    deltaCapM: 16,
    lowLabel: 'Budget TE Corps ($10M: 76 BLK / 80 FIN)',
    highLabel: 'Elite Dual-TE ($26M: 89 BLK / 89 FIN)',
    lowRatings: { speed: 82, accel: 84, power: 77, finesse: 80, awareness: 81 },
    highRatings: { speed: 88, accel: 89, power: 88, finesse: 89, awareness: 89 },
    lowBlock: 76,
    highBlock: 89,
  },
  RB: {
    lowCapM: 6,
    highCapM: 14,
    deltaCapM: 8,
    lowLabel: 'Budget RB ($6M: 89 SPD / 80 PWR / 84 FIN)',
    highLabel: 'Elite RB ($14M: 92 SPD / 86 PWR / 90 FIN)',
    lowRatings: { speed: 89, accel: 90, power: 80, finesse: 84, awareness: 83 },
    highRatings: { speed: 92, accel: 93, power: 86, finesse: 90, awareness: 88 },
    lowBlock: 68,
    highBlock: 77,
  },
};

const ELITE_DUAL_QB_RATINGS: RatingsBlock = { speed: 90, accel: 91, power: 88, finesse: 93, awareness: 92 };

interface DesignPoint {
  code: string;
  levels: Record<GroupKey, -1 | 1>;
  qbOverride?: 'ELITE_DUAL';
  scheme: 'SHANAHAN_12' | 'CONV_11';
}

// ============================================================================
// 3. PLAY BUILDERS & 20 Hz TELEMETRY EXTRACTOR
// ============================================================================
interface CompactOutcome {
  y: number;
  e: number;
  r: string;
  p: 0 | 1;
  qr: 0 | 1;
  sec: number;
  minPkt: number;
  trenchYds: number;
  ttt: number | null;
}

function buildDesignRoster(dp: DesignPoint): {
  profile: BaselineRosterProfile;
  olBlock: number;
  teBlock: number;
  rbBlock: number;
  useRead3: boolean;
} {
  const base = BASELINE_PHILOSOPHIES.find(
    (b) => b.id === (dp.scheme === 'CONV_11' ? 'CONV_11_SPREAD' : 'SHANAHAN_12_PA')
  )!;
  const qbR =
    dp.qbOverride === 'ELITE_DUAL'
      ? ELITE_DUAL_QB_RATINGS
      : dp.levels.QB === 1
      ? GROUP_TIERS.QB.highRatings
      : GROUP_TIERS.QB.lowRatings;
  const olR = dp.levels.OL === 1 ? GROUP_TIERS.OL.highRatings : GROUP_TIERS.OL.lowRatings;
  const olBlock = dp.levels.OL === 1 ? GROUP_TIERS.OL.highBlock! : GROUP_TIERS.OL.lowBlock!;
  const wr1R = dp.levels.WR === 1 ? GROUP_TIERS.WR.highRatings : GROUP_TIERS.WR.lowRatings;
  const wr2R: RatingsBlock = {
    speed: wr1R.speed - 2,
    accel: wr1R.accel - 2,
    power: wr1R.power - 2,
    finesse: wr1R.finesse - 3,
    awareness: wr1R.awareness - 3,
  };
  const slR: RatingsBlock = {
    speed: wr1R.speed - 3,
    accel: wr1R.accel - 2,
    power: wr1R.power - 3,
    finesse: wr1R.finesse - 3,
    awareness: wr1R.awareness - 2,
  };
  const teR = dp.levels.TE === 1 ? GROUP_TIERS.TE.highRatings : GROUP_TIERS.TE.lowRatings;
  const teBlock = dp.levels.TE === 1 ? GROUP_TIERS.TE.highBlock! : GROUP_TIERS.TE.lowBlock!;
  const rbR = dp.levels.RB === 1 ? GROUP_TIERS.RB.highRatings : GROUP_TIERS.RB.lowRatings;
  const rbBlock = dp.levels.RB === 1 ? GROUP_TIERS.RB.highBlock! : GROUP_TIERS.RB.lowBlock!;

  return {
    profile: { ...base, qb: qbR, ol: olR, wr1: wr1R, wr2: wr2R, sl: slR, te: teR, rb: rbR },
    olBlock,
    teBlock,
    rbBlock,
    useRead3: dp.scheme === 'SHANAHAN_12' && qbR.speed >= 85,
  };
}

function buildOffensePlay(dp: DesignPoint, playId: CanonicalPlayId | 'READ3_MESH_VOID'): SimAgent[] {
  const { profile, olBlock, teBlock, rbBlock } = buildDesignRoster(dp);
  const canonId: CanonicalPlayId = playId === 'READ3_MESH_VOID' ? 'MESH' : playId;
  const agents = buildBaselinePlay(profile, canonId).map((a) => {
    const c: SimAgent = JSON.parse(JSON.stringify(a));
    if (['LT', 'LG', 'C', 'RG', 'RT'].includes(c.pos)) c.blockRating = olBlock;
    else if (c.pos === 'TE' || c.id === 'TE') c.blockRating = teBlock;
    else if (c.id === 'RB') c.blockRating = rbBlock;
    else if (c.id === 'QB') c.blockRating = 48;
    return c;
  });

  if (playId === 'READ3_MESH_VOID') {
    const qb = agents.find((a) => a.id === 'QB');
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
  }
  return agents;
}

function compress(traj: PlayTickSnapshot[]): CompactOutcome {
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
  const minPkt = Math.min(...traj.map((s) => s.pocketIntegrity));
  const launch = traj.find((s) => s.ball?.state === 'IN_FLIGHT');

  return {
    y: yds,
    e: +(term.expectedEpa ?? 0).toFixed(3),
    r,
    p: isPass ? 1 : 0,
    qr: isQbRush ? 1 : 0,
    sec: +(term.timeSec ?? 3.5).toFixed(1),
    minPkt,
    trenchYds: term.trenchNetYards ?? 0,
    ttt: launch ? launch.timeSec : null,
  };
}

// ============================================================================
// 4. ZERO-SUM NASH SOLVER & 500-SEASON 4-DOWN MONTE CARLO
// ============================================================================
function solveZeroSumNash(rowLabels: string[], colLabels: string[], payoff: number[][]) {
  const m = rowLabels.length;
  const n = colLabels.length;
  const p = new Array<number>(m).fill(1 / m);
  const q = new Array<number>(n).fill(1 / n);
  const pSum = new Array<number>(m).fill(0);
  const qSum = new Array<number>(n).fill(0);
  const regP = new Array<number>(m).fill(0);
  const regQ = new Array<number>(n).fill(0);
  const ITERS = 8000;
  for (let t = 1; t <= ITERS; t++) {
    const rv = new Array<number>(m).fill(0);
    const cv = new Array<number>(n).fill(0);
    let exp = 0;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) rv[i] += payoff[i][j] * q[j];
      exp += p[i] * rv[i];
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) cv[j] += p[i] * payoff[i][j];
    }
    for (let i = 0; i < m; i++) regP[i] = Math.max(0, regP[i] + (rv[i] - exp));
    for (let j = 0; j < n; j++) regQ[j] = Math.max(0, regQ[j] + (exp - cv[j]));
    const sp = regP.reduce((a, b) => a + b, 0);
    const sq = regQ.reduce((a, b) => a + b, 0);
    for (let i = 0; i < m; i++) p[i] = sp > 1e-12 ? regP[i] / sp : 1 / m;
    for (let j = 0; j < n; j++) q[j] = sq > 1e-12 ? regQ[j] / sq : 1 / n;
    if (t > ITERS * 0.25) {
      for (let i = 0; i < m; i++) pSum[i] += p[i];
      for (let j = 0; j < n; j++) qSum[j] += q[j];
    }
  }
  const pt = pSum.reduce((a, b) => a + b, 0) || 1;
  const qt = qSum.reduce((a, b) => a + b, 0) || 1;
  const pAvg = pSum.map((v) => v / pt);
  const qAvg = qSum.map((v) => v / qt);
  let val = 0;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) val += pAvg[i] * payoff[i][j] * qAvg[j];
  const offMix: Record<string, number> = {};
  const defMix: Record<string, number> = {};
  rowLabels.forEach((l, i) => (offMix[l] = +(pAvg[i] * 100).toFixed(1)));
  colLabels.forEach((l, j) => (defMix[l] = +(qAvg[j] * 100).toFixed(1)));
  return { value: +val.toFixed(4), offMix, defMix };
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

function simulateOpponentDrive(startBallOn: number, rng: () => number) {
  const fieldFactor = (startBallOn - 25) * 0.0045;
  const pTd = Math.max(0.08, Math.min(0.45, 0.225 + fieldFactor));
  const pFg = Math.max(0.08, Math.min(0.28, 0.165 + fieldFactor * 0.4));
  const pTo = 0.115;
  const roll = rng();
  const elapsed = 125 + rng() * 115;
  if (roll < pTd) return { pts: 7, nextOffBallOn: 28, elapsed };
  if (roll < pTd + pFg) return { pts: 3, nextOffBallOn: 28, elapsed };
  if (roll < pTd + pFg + pTo) return { pts: 0, nextOffBallOn: Math.min(82, Math.max(20, 100 - startBallOn - 12)), elapsed: elapsed * 0.65 };
  return { pts: 0, nextOffBallOn: Math.min(48, Math.max(12, 100 - (startBallOn + 64))), elapsed };
}

function runSeasons(
  playBuckets: Record<string, 'OPEN' | 'PASS_3RD' | 'SHORT_RUN'>,
  nashOffMix: Record<string, number>,
  nashDefMix: Record<string, number>,
  pools: Record<string, Record<string, CompactOutcome[]>>,
  seed: number
) {
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
  const passIds = allIds.filter((id) => playBuckets[id] !== 'SHORT_RUN');
  const runIds = allIds.filter((id) => playBuckets[id] === 'SHORT_RUN');

  const pickSubset = (ids: string[]) => {
    const sw: [string, number][] = ids.map((id) => [
      id,
      Math.max(12.0, Math.min(52.0, (nashOffMix[id] ?? 0) * 0.75 + 14.0)),
    ]);
    return sampleWeighted(sw, rng);
  };

  let totWins = 0;
  let totPf = 0;
  let totPa = 0;
  let sbs = 0;

  for (let s = 0; s < SEASONS; s++) {
    let sWins = 0;
    let sPf = 0;
    let sPa = 0;
    for (let g = 0; g < 17; g++) {
      let clock = 3600;
      let offHasBall = rng() < 0.5;
      let ballOn = 28;
      let pf = 0;
      let pa = 0;
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
            let passProb = 0.52;
            if (twoMin) passProb = 0.94;
            else if (down >= 3 && toGo >= 7) passProb = 0.93;
            else if (down >= 3 && toGo >= 4) passProb = 0.78;
            else if (down >= 3 && toGo <= 2) passProb = 0.36;
            else if (down === 2 && toGo >= 8) passProb = 0.74;
            else if (down === 2 && toGo <= 3) passProb = 0.42;

            const playId = rng() < passProb ? pickSubset(passIds) : pickSubset(runIds);
            const defId = sampleWeighted(defWeights, rng);
            const rawPool = pools[playId][defId];
            const out = rawPool[Math.floor(rng() * rawPool.length)];
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
    }
    totWins += sWins;
    totPf += sPf / 17;
    totPa += sPa / 17;
    if (sWins >= 10) {
      const netDiff = (sPf - sPa) / 17;
      const singleGameP = 1 / (1 + Math.exp(-(netDiff - 3.5) / 6.2));
      const rounds = sWins >= 13 ? 3 : 4;
      if (rng() < Math.pow(singleGameP, rounds)) sbs++;
    }
  }
  return {
    avgWins: +(totWins / SEASONS).toFixed(2),
    pfG: +(totPf / SEASONS).toFixed(2),
    sbPct: +((sbs / SEASONS) * 100).toFixed(1),
  };
}

// ============================================================================
// 5. EVALUATE ONE DESIGN POINT & RUN RESOLUTION-V ORTHOGONAL 2^(5-1) DESIGN
// ============================================================================
interface EvalResult {
  code: string;
  levels: Record<GroupKey, -1 | 1>;
  qbOverride?: 'ELITE_DUAL';
  scheme: 'SHANAHAN_12' | 'CONV_11';
  avgWins: number;
  pfG: number;
  sbPct: number;
  nash13Epa: number;
  mean13Epa: number;
  sackRatePct: number;
  pressRatePct: number;
  compRatePct: number;
  intRatePct: number;
  rushYpc: number;
  trenchNetYds: number;
}

function evaluateDesignPoint(engine: All22KinematicEngine, dp: DesignPoint, seed: number): EvalResult {
  const { useRead3 } = buildDesignRoster(dp);
  const playSpecs: Array<{ id: CanonicalPlayId | 'READ3_MESH_VOID'; bucket: 'OPEN' | 'PASS_3RD' | 'SHORT_RUN' }> =
    dp.scheme === 'CONV_11'
      ? [
          { id: 'QUICK_SLANT', bucket: 'OPEN' },
          { id: 'DAGGER', bucket: 'PASS_3RD' },
          { id: 'MESH', bucket: 'PASS_3RD' },
          { id: 'INSIDE_ZONE', bucket: 'SHORT_RUN' },
          { id: 'DUO', bucket: 'SHORT_RUN' },
        ]
      : [
          { id: 'PA_UC_BOOT', bucket: 'OPEN' },
          { id: 'QUICK_SLANT', bucket: 'OPEN' },
          { id: useRead3 ? 'READ3_MESH_VOID' : 'MESH', bucket: 'PASS_3RD' },
          { id: 'DUO', bucket: 'SHORT_RUN' },
          { id: 'PIN_PULL', bucket: 'SHORT_RUN' },
        ];

  const REPS = 6; // 6 x 5 plays x 13 fronts = 390 snaps/design -> 3,120 HIGH vs 3,120 LOW snaps per main effect!
  const playBuckets: Record<string, 'OPEN' | 'PASS_3RD' | 'SHORT_RUN'> = {};
  const pools: Record<string, Record<string, CompactOutcome[]>> = {};
  const payoff: number[][] = [];

  let epaSum = 0;
  let totalSnaps = 0;
  let passSnaps = 0;
  let sacks = 0;
  let pressures = 0;
  let comps = 0;
  let ints = 0;
  let runSnaps = 0;
  let runYdsSum = 0;
  let trenchSum = 0;

  for (const ps of playSpecs) {
    playBuckets[ps.id] = ps.bucket;
    pools[ps.id] = {};
    const row: number[] = [];
    for (const defId of ALL_13_FRONTS) {
      const cell: CompactOutcome[] = [];
      let cellEpa = 0;
      for (let r = 0; r < REPS; r++) {
        const off = buildOffensePlay(dp, ps.id);
        const def = buildAnyDefense(defId);
        const traj = engine.simulatePlay([...off, ...def], 0.65);
        const c = compress(traj);
        cell.push(c);
        cellEpa += c.e;
        epaSum += c.e;
        totalSnaps++;
        trenchSum += c.trenchYds;
        if (c.p === 1) {
          passSnaps++;
          if (c.r === 'S') sacks++;
          if (c.r === 'S' || c.minPkt < 45) pressures++;
          if (c.r === 'C' || c.r === 'TD') comps++;
          if (c.r === 'INT') ints++;
        } else {
          runSnaps++;
          runYdsSum += c.y;
        }
      }
      row.push(+(cellEpa / REPS).toFixed(4));
      pools[ps.id][defId] = cell;
    }
    payoff.push(row);
  }

  const nash = solveZeroSumNash(
    playSpecs.map((p) => p.id),
    ALL_13_FRONTS,
    payoff
  );
  const season = runSeasons(playBuckets, nash.offMix, nash.defMix, pools, seed);

  return {
    code: dp.code,
    levels: dp.levels,
    qbOverride: dp.qbOverride,
    scheme: dp.scheme,
    avgWins: season.avgWins,
    pfG: season.pfG,
    sbPct: season.sbPct,
    nash13Epa: nash.value,
    mean13Epa: +(epaSum / totalSnaps).toFixed(4),
    sackRatePct: passSnaps > 0 ? +((sacks / passSnaps) * 100).toFixed(1) : 0,
    pressRatePct: passSnaps > 0 ? +((pressures / passSnaps) * 100).toFixed(1) : 0,
    compRatePct: passSnaps > 0 ? +((comps / passSnaps) * 100).toFixed(1) : 0,
    intRatePct: passSnaps > 0 ? +((ints / passSnaps) * 100).toFixed(1) : 0,
    rushYpc: runSnaps > 0 ? +(runYdsSum / runSnaps).toFixed(2) : 0,
    trenchNetYds: +(trenchSum / totalSnaps).toFixed(2),
  };
}

function main() {
  const engine = new All22KinematicEngine();

  console.log('================================================================================');
  console.log('ORTHOGONAL 2^(5-1) RESOLUTION-V COMPONENT ANALYSIS OF WINS (QB / OL / WR / TE / RB)');
  console.log('================================================================================');

  // Build exact 16-run Resolution-V design: RB = QB * OL * WR * TE (all 5 main effects & all 10 2-way interactions orthogonal!)
  const designPoints: DesignPoint[] = [];
  for (let mask = 0; mask < 16; mask++) {
    const qb: -1 | 1 = (mask & 1) ? 1 : -1;
    const ol: -1 | 1 = (mask & 2) ? 1 : -1;
    const wr: -1 | 1 = (mask & 4) ? 1 : -1;
    const te: -1 | 1 = (mask & 8) ? 1 : -1;
    const rb: -1 | 1 = (qb * ol * wr * te) as -1 | 1;
    const code = `${qb > 0 ? 'Q' : 'q'}${ol > 0 ? 'O' : 'o'}${wr > 0 ? 'W' : 'w'}${te > 0 ? 'T' : 't'}${rb > 0 ? 'R' : 'r'}`;
    designPoints.push({
      code,
      levels: { QB: qb, OL: ol, WR: wr, TE: te, RB: rb },
      scheme: 'SHANAHAN_12',
    });
  }

  const factorialResults: EvalResult[] = [];
  for (let i = 0; i < designPoints.length; i++) {
    const res = evaluateDesignPoint(engine, designPoints[i], 303000 + i * 17);
    factorialResults.push(res);
    console.log(
      `  [${String(i + 1).padStart(2, '0')}/16] ${res.code} | Wins=${res.avgWins.toFixed(2)} | PF=${res.pfG.toFixed(1)} | ` +
        `Nash=${res.nash13Epa >= 0 ? '+' : ''}${res.nash13Epa.toFixed(3)} | Sack=${res.sackRatePct}% | Press=${res.pressRatePct}% | Rush=${res.rushYpc}y`
    );
  }

  // Compute exact orthogonal main effects, ANOVA variance shares (SS_g / SS_total), and Wins per $10M cap!
  const meanWins = factorialResults.reduce((s, r) => s + r.avgWins, 0) / factorialResults.length;
  const ssTotal = factorialResults.reduce((s, r) => s + Math.pow(r.avgWins - meanWins, 2), 0);

  const mainEffects: Record<string, any> = {};
  console.log('\n--- 1. ORTHOGONAL MAIN EFFECTS ON 17-GAME WINS (SHANAHAN-12, BUDGET -> ELITE) ---');
  for (const g of GROUPS) {
    const hi = factorialResults.filter((r) => r.levels[g] === 1);
    const lo = factorialResults.filter((r) => r.levels[g] === -1);
    const avg = (arr: EvalResult[], fn: (r: EvalResult) => number) =>
      arr.reduce((s, r) => s + fn(r), 0) / arr.length;

    const deltaWins = +(avg(hi, (r) => r.avgWins) - avg(lo, (r) => r.avgWins)).toFixed(2);
    const deltaPf = +(avg(hi, (r) => r.pfG) - avg(lo, (r) => r.pfG)).toFixed(2);
    const deltaEpa = +(avg(hi, (r) => r.mean13Epa) - avg(lo, (r) => r.mean13Epa)).toFixed(4);
    const deltaNash = +(avg(hi, (r) => r.nash13Epa) - avg(lo, (r) => r.nash13Epa)).toFixed(4);
    const deltaSack = +(avg(hi, (r) => r.sackRatePct) - avg(lo, (r) => r.sackRatePct)).toFixed(2);
    const deltaPress = +(avg(hi, (r) => r.pressRatePct) - avg(lo, (r) => r.pressRatePct)).toFixed(2);
    const deltaComp = +(avg(hi, (r) => r.compRatePct) - avg(lo, (r) => r.compRatePct)).toFixed(2);
    const deltaRush = +(avg(hi, (r) => r.rushYpc) - avg(lo, (r) => r.rushYpc)).toFixed(2);
    const deltaTrench = +(avg(hi, (r) => r.trenchNetYds) - avg(lo, (r) => r.trenchNetYds)).toFixed(2);

    // Exact orthogonal Sum of Squares for main effect g: N * (effect / 2)^2
    const ssGroup = factorialResults.length * Math.pow(deltaWins / 2, 2);
    const varSharePct = ssTotal > 0 ? +((ssGroup / ssTotal) * 100).toFixed(1) : 0;
    const winsPer10M = +((deltaWins / GROUP_TIERS[g].deltaCapM) * 10).toFixed(2);

    mainEffects[g] = {
      group: g,
      deltaCapM: GROUP_TIERS[g].deltaCapM,
      lowWins: +avg(lo, (r) => r.avgWins).toFixed(2),
      highWins: +avg(hi, (r) => r.avgWins).toFixed(2),
      deltaWins,
      winsPer10M,
      varSharePct,
      deltaPf,
      deltaEpa,
      deltaNash,
      physics: { deltaSack, deltaPress, deltaComp, deltaRush, deltaTrench },
    };

    console.log(
      `  ${g.padEnd(3)} (+$${String(GROUP_TIERS[g].deltaCapM).padStart(2)}M) | ` +
        `ΔWins=${deltaWins >= 0 ? '+' : ''}${deltaWins.toFixed(2).padStart(5)} | ` +
        `Wins/$10M=${winsPer10M >= 0 ? '+' : ''}${winsPer10M.toFixed(2).padStart(5)} | ` +
        `WinVar=${varSharePct.toFixed(1).padStart(5)}% | ` +
        `ΔSack=${deltaSack >= 0 ? '+' : ''}${deltaSack.toFixed(1)}% | ΔPress=${deltaPress >= 0 ? '+' : ''}${deltaPress.toFixed(1)}% | ΔRush=${deltaRush >= 0 ? '+' : ''}${deltaRush.toFixed(2)}y`
    );
  }

  // Exact all-10 Two-Way Interactions (orthogonal because Resolution V!)
  const interactions: Array<{ pair: string; deltaWins: number; varSharePct: number }> = [];
  for (let i = 0; i < GROUPS.length; i++) {
    for (let j = i + 1; j < GROUPS.length; j++) {
      const g1 = GROUPS[i];
      const g2 = GROUPS[j];
      const pos = factorialResults.filter((r) => r.levels[g1] * r.levels[g2] === 1);
      const neg = factorialResults.filter((r) => r.levels[g1] * r.levels[g2] === -1);
      const eff = +(
        pos.reduce((s, r) => s + r.avgWins, 0) / pos.length -
        neg.reduce((s, r) => s + r.avgWins, 0) / neg.length
      ).toFixed(2);
      const ssInt = factorialResults.length * Math.pow(eff / 2, 2);
      interactions.push({
        pair: `${g1} × ${g2}`,
        deltaWins: eff,
        varSharePct: ssTotal > 0 ? +((ssInt / ssTotal) * 100).toFixed(1) : 0,
      });
    }
  }
  interactions.sort((a, b) => Math.abs(b.deltaWins) - Math.abs(a.deltaWins));
  console.log('\n--- 2. TOP TWO-WAY INTERACTIONS (SYNERGY / SUBSTITUTION ON WINS) ---');
  for (const it of interactions.slice(0, 5)) {
    console.log(`  ${it.pair.padEnd(10)} | Interaction ΔWins=${it.deltaWins >= 0 ? '+' : ''}${it.deltaWins.toFixed(2)} | VarShare=${it.varSharePct}%`);
  }

  // Targeted Probes: (A) Elite Dual QB ($60M) vs Elite OL ($74M), and (B) Conv-11 Spread OL vs QB vs WR!
  console.log('\n--- 3. TARGETED CROSS-CHECKS (ELITE DUAL QB & CONV-11 SPREAD) ---');
  const probes: DesignPoint[] = [
    { code: 'SHAN_DUAL_LOW_OL', levels: { QB: 1, OL: -1, WR: -1, TE: -1, RB: -1 }, qbOverride: 'ELITE_DUAL', scheme: 'SHANAHAN_12' },
    { code: 'SHAN_DUAL_HIGH_OL', levels: { QB: 1, OL: 1, WR: -1, TE: -1, RB: -1 }, qbOverride: 'ELITE_DUAL', scheme: 'SHANAHAN_12' },
    { code: 'CONV11_ALL_LOW', levels: { QB: -1, OL: -1, WR: -1, TE: -1, RB: -1 }, scheme: 'CONV_11' },
    { code: 'CONV11_PLUS_QB', levels: { QB: 1, OL: -1, WR: -1, TE: -1, RB: -1 }, scheme: 'CONV_11' },
    { code: 'CONV11_PLUS_OL', levels: { QB: -1, OL: 1, WR: -1, TE: -1, RB: -1 }, scheme: 'CONV_11' },
    { code: 'CONV11_PLUS_WR', levels: { QB: -1, OL: -1, WR: 1, TE: -1, RB: -1 }, scheme: 'CONV_11' },
  ];
  const probeResults: EvalResult[] = [];
  for (let i = 0; i < probes.length; i++) {
    const r = evaluateDesignPoint(engine, probes[i], 404000 + i * 29);
    probeResults.push(r);
    console.log(
      `  ${r.code.padEnd(20)} | Wins=${r.avgWins.toFixed(2)} | PF=${r.pfG.toFixed(1)} | Nash=${r.nash13Epa >= 0 ? '+' : ''}${r.nash13Epa.toFixed(3)} | Sack=${r.sackRatePct}% | Press=${r.pressRatePct}% | Rush=${r.rushYpc}y`
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    design: 'Resolution-V Orthogonal 2^(5-1) Fractional Factorial (16 runs, 5 main effects + 10 2-way interactions unconfounded)',
    meanWinsAcross16Runs: +meanWins.toFixed(2),
    ssTotalWins: +ssTotal.toFixed(2),
    groupTiers: GROUP_TIERS,
    mainEffects,
    twoWayInteractions: interactions,
    factorialRuns: factorialResults,
    crossCheckProbes: probeResults,
  };

  const outPath = path.join(process.cwd(), 'src', 'data', 'win_component_analysis_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nWrote ${outPath}`);
}

main();
