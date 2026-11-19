import * as fs from 'fs';
import * as path from 'path';
import {
  All22KinematicEngine,
  SimAgent,
  SimFieldContext,
} from './engine';
import {
  OMEGA_2027_PLAYBOOK,
  OMEGA_ACTIVE_11_CAP_M,
} from './ultimate_2027_offense';
import {
  APEX_2027_PLAYBOOK,
  APEX_ACTIVE_11_CAP_M,
} from './apex_2027_playbook';
import {
  BASELINE_PHILOSOPHIES,
  BaselineRosterProfile,
  CanonicalPlayId,
  LEAGUE_OPEN_DEF_WEIGHTS,
  buildBaselinePlay,
} from './canonical_baselines';
import {
  ADAPTIVE_COUNTER_DEF_FRONTS,
  AdaptiveCounterDefFrontId,
  MODERN_2027_DEF_FRONTS,
  ModernDefFrontId,
  buildAdaptiveCounterDefense,
  buildModern2027Defense,
} from './vanguard_2027_playbook';

type ExtendedDefFrontId = ModernDefFrontId | AdaptiveCounterDefFrontId;

interface QbArchetypeSpec {
  id: string;
  label: string;
  qbCapM: number;
  olRatingDelta: number;
  sharePhysicsWithId?: string;
  ratings: {
    speed: number;
    accel: number;
    power: number;
    finesse: number;
    awareness: number;
  };
  empiricalNflComp: string;
}

const QB_ARCHETYPES: QbArchetypeSpec[] = [
  {
    id: 'RAW_MOBILE_11M',
    label: 'Raw Run-First Mobile QB ($10.8M, High-Variance)',
    qbCapM: 10.8,
    olRatingDelta: 0,
    ratings: { speed: 92, accel: 93, power: 89, finesse: 77, awareness: 77 },
    empiricalNflComp:
      '2022-24 nflverse Raw Run-First (Fields / Richardson / D.Jones: Comp 61.7%, Sack 9.0%, Scrm 9.3%, RegG 11.2/yr)',
  },
  {
    id: 'MID_MOBILE_13M',
    label: 'Mid-Tier Passing Mobile QB ($13.5M, OMEGA Base)',
    qbCapM: 13.5,
    olRatingDelta: 0,
    ratings: { speed: 89, accel: 90, power: 86, finesse: 84, awareness: 83 },
    empiricalNflComp:
      '2022-24 nflverse Mid-Tier Mobile (Kyler / Lawrence / early-career mobile: Comp 64.8%, Sack 7.4%, Scrm 6.8%, RegG 14.1/yr)',
  },
  {
    id: 'FUNGIBLE_MOBILE_QB2',
    label: 'Fungible Mobile QB2 ($6.5M Platoon Backup)',
    qbCapM: 6.5,
    olRatingDelta: 0,
    ratings: { speed: 89, accel: 90, power: 86, finesse: 81, awareness: 80 },
    empiricalNflComp:
      'Low-cost fungible dual-threat QB2 (Malik Willis / Cole Payton / Marcus Mariota mold) for accepted-attrition 2-QB room',
  },
  {
    id: 'MID_POCKET_28M',
    label: 'Mid-Tier Accurate Pocket QB ($28.0M Veteran)',
    qbCapM: 28.0,
    olRatingDelta: 0,
    ratings: { speed: 75, accel: 79, power: 75, finesse: 86, awareness: 86 },
    empiricalNflComp:
      '2022-24 nflverse Mid-Tier Pocket (Carr / Mayfield / mid-tier vet: Comp 63.7%, Sack 6.7%, Scrm 4.2%, RegG 13.4/yr)',
  },
  {
    id: 'BACKUP_POCKET_3M',
    label: 'Standard $3.0M Pocket Backup QB (Cliff Asset)',
    qbCapM: 3.0,
    olRatingDelta: 0,
    ratings: { speed: 75, accel: 78, power: 74, finesse: 74, awareness: 75 },
    empiricalNflComp:
      'Standard $3M backup pocket QB (Rush / Mills / Zappe tier: CPOE -4% to -7%) when a $52M star QB misses games',
  },
  {
    id: 'ELITE_POCKET_13M_CTRL',
    label: 'Elite Accurate Pocket QB ($13.5M Rookie-Scale Control)',
    qbCapM: 13.5,
    olRatingDelta: 0,
    ratings: { speed: 74, accel: 78, power: 74, finesse: 95, awareness: 95 },
    empiricalNflComp:
      'Rookie-scale elite pocket processor (Brock Purdy control — identical physics to $52M Elite Pocket, isolates cap effect)',
  },
  {
    id: 'ELITE_POCKET_52M',
    label: 'Elite Accurate Pocket QB ($52.0M Market Cap -> Def Tax)',
    qbCapM: 52.0,
    olRatingDelta: 0,
    sharePhysicsWithId: 'ELITE_POCKET_13M_CTRL',
    ratings: { speed: 74, accel: 78, power: 74, finesse: 95, awareness: 95 },
    empiricalNflComp:
      '2022-24 nflverse Elite Pocket (Burrow / Goff / Tua / Herbert / Stafford: Comp 67.0%, Sack 5.8%, 2nd+Rd +0.221, MOF 15.9%)',
  },
  {
    id: 'ELITE_POCKET_52M_SQUEEZE',
    label: 'Elite Accurate Pocket QB ($52.0M + OL Cap Squeeze -5)',
    qbCapM: 52.0,
    olRatingDelta: -5,
    ratings: { speed: 74, accel: 78, power: 74, finesse: 95, awareness: 95 },
    empiricalNflComp:
      'Market-cap pocket QB when $38.5M premium forces OL pass/run protection compression instead of defensive cap tax',
  },
  {
    id: 'SUPERMAX_DUAL_55M',
    label: 'Unicorn Dual-Threat Supermax ($55.0M Ceiling)',
    qbCapM: 55.0,
    olRatingDelta: 0,
    ratings: { speed: 90, accel: 91, power: 88, finesse: 93, awareness: 93 },
    empiricalNflComp:
      '2022-24 nflverse Elite Dual-Threat (Lamar / Allen / Mahomes / Hurts: +0.179 DB EPA, +0.366 2nd+Rd EPA, Scrm 7.9%)',
  },
];

interface SnapSample {
  yards: number;
  epa: number;
  durationSec: number;
  tttSec: number | null;
  reason: string;
  targetId: string | null;
  isPassAttempt: boolean;
  isCompletion: boolean;
  isSack: boolean;
  isScramble: boolean;
  isInt: boolean;
  isTurnover: boolean;
  isQbDesignedRun: boolean;
  pressured: boolean;
  explosive15: boolean;
}

function buildExtendedDefense(frontId: ExtendedDefFrontId): SimAgent[] {
  if ((ADAPTIVE_COUNTER_DEF_FRONTS as readonly string[]).includes(frontId)) {
    return buildAdaptiveCounterDefense(frontId as AdaptiveCounterDefFrontId);
  }
  return buildModern2027Defense(frontId as ModernDefFrontId);
}

function applyQbArchetype(
  agents: SimAgent[],
  arch: QbArchetypeSpec,
  makeCalvinWr1 = false
): SimAgent[] {
  const olSet = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
  return agents.map((a) => {
    if (a.id === 'QB' || a.pos === 'QB') {
      return {
        ...a,
        ratings: { ...arch.ratings },
        optionPass: a.optionPass ? { ...a.optionPass, throwerRating: arch.ratings.finesse } : undefined,
      };
    }
    if (makeCalvinWr1 && a.id === 'WR1') {
      // Calvin Johnson / Justin Jefferson / Ja'Marr Chase elite X-WR archetype
      return {
        ...a,
        ratings: { speed: 96, accel: 95, power: 84, finesse: 96, awareness: 94 },
      };
    }
    if (arch.olRatingDelta !== 0 && olSet.has(a.pos)) {
      return {
        ...a,
        ratings: {
          speed: Math.max(60, a.ratings.speed + Math.round(arch.olRatingDelta * 0.4)),
          accel: Math.max(62, a.ratings.accel + Math.round(arch.olRatingDelta * 0.6)),
          power: Math.max(65, a.ratings.power + arch.olRatingDelta),
          finesse: Math.max(65, a.ratings.finesse + arch.olRatingDelta),
          awareness: Math.max(65, a.ratings.awareness + arch.olRatingDelta),
        },
      };
    }
    return a;
  });
}

function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Common Random Numbers (CRN) wrapper: every QB archetype faces the exact same defensive
 * disguise draws, trench rep-noise draws, and catch/INT rolls for a given (play, front, rep),
 * eliminating paired Monte Carlo noise without mutating engine physics.
 */
function withCommonRandomNumbers<T>(seedKey: string, fn: () => T): T {
  const origRandom = Math.random;
  let state = hashSeed(seedKey) || 1;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = origRandom;
  }
}

function runSample(
  engine: All22KinematicEngine,
  off: SimAgent[],
  def: SimAgent[],
  fieldContext?: SimFieldContext,
  crnKey?: string
): SnapSample {
  const exec = () => {
    const qbInit = off.find((a) => a.id === 'QB');
    const isQbDesignedRun = Boolean(qbInit && qbInit.assignment.role === 'BALL_CARRIER');

    const traj = engine.simulatePlay([...off, ...def], 1.0, fieldContext);
    const term = traj.find((s) => s.playOver) || traj[traj.length - 1];
    const throwSnap = traj.find((s) => s.ball?.state === 'IN_FLIGHT' && !s.ball.isLateral);
    const isScramble = traj.some((s) => s.exoticEvent === 'QB_SCRAMBLE');

    let pressured = term.terminationReason === 'SACK';
    if (throwSnap?.ball?.pressuredAtRelease) pressured = true;

    const reason = term.terminationReason ?? 'WHISTLE';
    const fallbackCarrier = term.agents.find(
      (a) => a.side === 'OFF' && (a.id === term.ball?.carrierId || a.assignment.role === 'BALL_CARRIER')
    );
    const yards =
      term.carrierTackledYards ??
      (term.ball?.state === 'HELD' && fallbackCarrier ? +fallbackCarrier.y.toFixed(2) : 0);

    const forwardPassThrown = Boolean(throwSnap);
    const isSack = reason === 'SACK';
    const isInt = reason === 'INTERCEPTION';
    const isPassAttempt = forwardPassThrown && !isSack && !isScramble;
    const isCompletion =
      isPassAttempt &&
      (reason === 'COMPLETE' ||
        reason === 'TOUCHDOWN' ||
        ((reason === 'TACKLED' || reason === 'OUT_OF_BOUNDS' || reason === 'WHISTLE') &&
          Boolean(term.ball?.completedPass)));
    const isTurnover = isInt || reason === 'FUMBLE_LOST';

    return {
      yards,
      epa: term.expectedEpa,
      durationSec: term.timeSec,
      tttSec: throwSnap ? throwSnap.timeSec : isSack ? term.timeSec : null,
      reason,
      targetId: throwSnap?.ball?.targetReceiverId ?? null,
      isPassAttempt,
      isCompletion,
      isSack,
      isScramble,
      isInt,
      isTurnover,
      isQbDesignedRun,
      pressured,
      explosive15: yards >= 15.0 && !isTurnover,
    };
  };
  return crnKey ? withCommonRandomNumbers(crnKey, exec) : exec();
}

function solveZeroSumNash(
  payoffMatrix: number[][],
  cappedRowIndices: number[] = [],
  maxCappedShare = 1.0,
  iterations = 8000
): { nashValue: number; offWeights: number[]; defWeights: number[] } {
  const M = payoffMatrix.length;
  const N = payoffMatrix[0].length;
  const cappedSet = new Set(cappedRowIndices);

  const projectSimplexWithCap = (raw: number[]): number[] => {
    let w = raw.map((v) => Math.max(0, v));
    const total = w.reduce((a, b) => a + b, 0);
    w = total > 1e-12 ? w.map((v) => v / total) : new Array(M).fill(1 / M);

    if (cappedSet.size === 0 || maxCappedShare >= 0.999) return w;

    const capSum = w.reduce((acc, v, i) => (cappedSet.has(i) ? acc + v : acc), 0);
    if (capSum <= maxCappedShare + 1e-9) return w;

    const nonCapIndices: number[] = [];
    let nonCapSum = 0;
    for (let i = 0; i < M; i++) {
      if (!cappedSet.has(i)) {
        nonCapIndices.push(i);
        nonCapSum += w[i];
      }
    }
    if (nonCapIndices.length === 0) return w;

    const scaleCap = maxCappedShare / Math.max(1e-12, capSum);
    const remShare = 1.0 - maxCappedShare;
    return w.map((v, i) => {
      if (cappedSet.has(i)) return v * scaleCap;
      return nonCapSum > 1e-12 ? (v / nonCapSum) * remShare : remShare / nonCapIndices.length;
    });
  };

  const offCumRegret = new Array(M).fill(0);
  const defCumRegret = new Array(N).fill(0);
  const offStratSum = new Array(M).fill(0);
  const defStratSum = new Array(N).fill(0);

  let p = projectSimplexWithCap(new Array(M).fill(1 / M));
  let q = new Array(N).fill(1 / N);

  for (let t = 1; t <= iterations; t++) {
    for (let i = 0; i < M; i++) offStratSum[i] += p[i];
    for (let j = 0; j < N; j++) defStratSum[j] += q[j];

    let gameVal = 0;
    const rowPay = new Array(M).fill(0);
    const colPay = new Array(N).fill(0);
    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        const u = payoffMatrix[i][j];
        rowPay[i] += q[j] * u;
        colPay[j] += p[i] * u;
        gameVal += p[i] * q[j] * u;
      }
    }

    for (let i = 0; i < M; i++) {
      offCumRegret[i] = Math.max(0, offCumRegret[i] + (rowPay[i] - gameVal));
    }
    for (let j = 0; j < N; j++) {
      defCumRegret[j] = Math.max(0, defCumRegret[j] + (gameVal - colPay[j]));
    }

    const sumDef = defCumRegret.reduce((a, b) => a + b, 0);
    p = projectSimplexWithCap(offCumRegret);
    q = sumDef > 1e-9 ? defCumRegret.map((r) => r / sumDef) : new Array(N).fill(1 / N);
  }

  const offWeights = projectSimplexWithCap(offStratSum.map((s) => s / iterations));
  const defWeights = defStratSum.map((s) => s / iterations);

  let nashValue = 0;
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      nashValue += offWeights[i] * defWeights[j] * payoffMatrix[i][j];
    }
  }
  return { nashValue, offWeights, defWeights };
}

function sampleWeighted(weights: number[]): number {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r <= acc) return i;
  }
  return weights.length - 1;
}

function fieldGoalProb(ydToGoal: number): number {
  const dist = ydToGoal + 17;
  if (dist <= 32) return 0.97;
  if (dist <= 39) return 0.93;
  if (dist <= 47) return 0.84;
  if (dist <= 53) return 0.72;
  if (dist <= 58) return 0.56;
  return 0.0;
}

function computeCapDefBonus(offCapM: number): number {
  return +(((146.0 - offCapM) / (146.0 - 85.5)) * 3.8).toFixed(2);
}

function shannonNeff(counts: Record<string, number>): number {
  const vals = Object.values(counts).filter((v) => v > 0);
  const tot = vals.reduce((a, b) => a + b, 0);
  if (tot <= 0) return 0;
  let h = 0;
  for (const v of vals) {
    const p = v / tot;
    h -= p * Math.log(p);
  }
  return +Math.exp(h).toFixed(2);
}

function summarizeSamples(samples: SnapSample[]) {
  const n = Math.max(1, samples.length);
  const passAtts = samples.filter((s) => s.isPassAttempt);
  const scrambles = samples.filter((s) => s.isScramble);
  const dbCount = samples.filter((s) => s.isPassAttempt || s.isSack || s.isScramble).length;
  const ttts = samples.map((s) => s.tttSec).filter((v): v is number => v !== null);
  const tgtCounts: Record<string, number> = {};
  for (const s of passAtts) {
    if (s.targetId) tgtCounts[s.targetId] = (tgtCounts[s.targetId] ?? 0) + 1;
  }
  const wr1Pct = passAtts.length ? +((100 * (tgtCounts['WR1'] ?? 0)) / passAtts.length).toFixed(1) : null;
  return {
    n: samples.length,
    meanYds: +(samples.reduce((a, b) => a + b.yards, 0) / n).toFixed(2),
    meanEpa: +(samples.reduce((a, b) => a + b.epa, 0) / n).toFixed(3),
    compPct: passAtts.length ? +((100 * passAtts.filter((s) => s.isCompletion).length) / passAtts.length).toFixed(1) : null,
    sackPct: dbCount ? +((100 * samples.filter((s) => s.isSack).length) / dbCount).toFixed(1) : null,
    scramblePct: dbCount ? +((100 * scrambles.length) / dbCount).toFixed(1) : null,
    scrambleEpa: scrambles.length ? +(scrambles.reduce((a, b) => a + b.epa, 0) / scrambles.length).toFixed(3) : null,
    intPct: passAtts.length ? +((100 * passAtts.filter((s) => s.isInt).length) / passAtts.length).toFixed(2) : null,
    pressPct: dbCount ? +((100 * samples.filter((s) => s.pressured).length) / dbCount).toFixed(1) : null,
    tttMean: ttts.length ? +(ttts.reduce((a, b) => a + b, 0) / ttts.length).toFixed(2) : null,
    expl15Pct: +((100 * samples.filter((s) => s.explosive15).length) / n).toFixed(1),
    wr1TargetPct: wr1Pct,
    targetNeff: shannonNeff(tgtCounts),
  };
}

function simulateSeasonFromPool(
  playIds: string[],
  playWeights: number[],
  defIds: ExtendedDefFrontId[],
  defWeights: number[],
  pool: Record<string, Record<string, SnapSample[]>>,
  thirdLongPlayIds: string[],
  goalLinePlayIds: string[],
  goalLinePool: Record<string, Record<string, SnapSample[]>>,
  trials = 800,
  passForcedMode = false
) {
  let totalPts = 0;
  let totalDrives = 0;
  let tdDrives = 0;
  let toDrives = 0;
  let qbDesignedCarries = 0;
  let qbScrambles = 0;
  let totalSnaps = 0;
  let passAtts = 0;
  let completions = 0;
  let sacks = 0;
  let ints = 0;

  const validThirdLong = thirdLongPlayIds.filter((pid) => Boolean(pool[pid]));
  const safeThirdLong = validThirdLong.length > 0 ? validThirdLong : playIds;
  const validGl = goalLinePlayIds.filter((pid) => Boolean(goalLinePool[pid]));

  for (let g = 0; g < trials; g++) {
    let gamePts = 0;
    for (let drv = 0; drv < 11; drv++) {
      totalDrives++;
      let ydsToGoal = 75.0;
      let down = 1;
      let toGo = 10.0;
      for (let snap = 0; snap < 20; snap++) {
        let pid: string;
        let activePool = pool;
        let df: ExtendedDefFrontId;

        if (ydsToGoal <= 5.0 && validGl.length > 0) {
          pid = validGl[Math.floor(Math.random() * validGl.length)];
          const glFronts: ExtendedDefFrontId[] = ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'];
          df = glFronts[Math.floor(Math.random() * glFronts.length)];
          activePool = goalLinePool;
        } else if (down >= 3 && toGo >= 7.0) {
          pid = safeThirdLong[Math.floor(Math.random() * safeThirdLong.length)];
          const passDefs: ExtendedDefFrontId[] = ['DIME_QUARTERS_MATCH', 'DIME_MUG_C0', 'NICKEL_SIM_C2', 'VIKINGS_MUG_CROSSDOG_C0'];
          df = passDefs[Math.floor(Math.random() * passDefs.length)];
        } else if (passForcedMode && Math.random() < 0.85) {
          pid = safeThirdLong[Math.floor(Math.random() * safeThirdLong.length)];
          df = defIds[sampleWeighted(defWeights)];
        } else {
          pid = playIds[sampleWeighted(playWeights)];
          df = defIds[sampleWeighted(defWeights)];
        }

        const bucket = activePool[pid]?.[df] ?? pool[pid]?.[defIds[0]] ?? pool[playIds[0]][defIds[0]];
        const s = bucket[Math.floor(Math.random() * bucket.length)];
        totalSnaps++;
        if (s.isQbDesignedRun) qbDesignedCarries++;
        if (s.isScramble) qbScrambles++;
        if (s.isPassAttempt) {
          passAtts++;
          if (s.isCompletion) completions++;
          if (s.isInt) ints++;
        }
        if (s.isSack) sacks++;

        if (s.isTurnover || (s.isSack && Math.random() < 0.08)) {
          toDrives++;
          break;
        }
        ydsToGoal -= s.yards;
        if (ydsToGoal <= 0.05 || s.reason === 'TOUCHDOWN') {
          gamePts += 6.96;
          tdDrives++;
          break;
        }
        if (s.yards >= toGo) {
          down = 1;
          toGo = Math.min(10.0, ydsToGoal);
        } else {
          down++;
          toGo = Math.max(0.5, toGo - s.yards);
        }

        if (down === 4) {
          const goForIt = toGo <= 2.2 || (ydsToGoal <= 42 && ydsToGoal > 36 && toGo <= 4.0);
          if (!goForIt) {
            if (ydsToGoal <= 41) {
              if (Math.random() < fieldGoalProb(ydsToGoal)) gamePts += 3;
            }
            break;
          }
        }
        if (down > 4) break;
      }
    }
    totalPts += gamePts;
  }

  const dbDenom = Math.max(1, passAtts + sacks + qbScrambles);
  return {
    ppg: +(totalPts / trials).toFixed(2),
    tdDrivePct: +((100 * tdDrives) / totalDrives).toFixed(1),
    toDrivePct: +((100 * toDrives) / totalDrives).toFixed(1),
    qbRunsPerGame: +(qbDesignedCarries / trials).toFixed(1),
    qbScramblesPerGame: +(qbScrambles / trials).toFixed(1),
    scramblePct: +((100 * qbScrambles) / dbDenom).toFixed(1),
    compPct: passAtts ? +((100 * completions) / passAtts).toFixed(1) : 0,
    sackPct: +((100 * sacks) / dbDenom).toFixed(1),
    intPct: passAtts ? +((100 * ints) / passAtts).toFixed(2) : 0,
    snapsPerGame: +(totalSnaps / trials).toFixed(1),
  };
}

function simulateTwoMinuteDrill(
  playIds: string[],
  pool: Record<string, Record<string, SnapSample[]>>,
  trials = 1000
) {
  const twoMinDefs: ExtendedDefFrontId[] = ['DIME_QUARTERS_MATCH', 'DIME_MUG_C0', 'NICKEL_SIM_C2', 'NICKEL_OVER_C3'];
  let tdWins = 0;
  let sacks = 0;
  let scrambles = 0;
  let ints = 0;
  let snaps = 0;

  for (let t = 0; t < trials; t++) {
    let ydsToGoal = 65.0;
    let clock = 110.0;
    let tos = 1;
    let down = 1;
    let toGo = 10.0;

    while (clock > 0 && down <= 4) {
      const df = twoMinDefs[Math.floor(Math.random() * twoMinDefs.length)];
      const pid = playIds[Math.floor(Math.random() * playIds.length)];
      const bucket = pool[pid][df];
      const s = bucket[Math.floor(Math.random() * bucket.length)];
      snaps++;
      if (s.isSack) sacks++;
      if (s.isScramble) scrambles++;
      if (s.isInt) ints++;

      if (s.isTurnover || (s.isSack && Math.random() < 0.08)) break;

      let clockCost = s.durationSec;
      if (s.reason === 'INCOMPLETE' || s.reason === 'OUT_OF_BOUNDS') {
        clockCost += 2.5;
      } else if (tos > 0 && clock < 55) {
        tos--;
        clockCost += 3.0;
      } else {
        clockCost += 12.5;
      }
      clock -= clockCost;
      ydsToGoal -= s.yards;

      if (ydsToGoal <= 0.05 || s.reason === 'TOUCHDOWN') {
        if (clock >= -1.0) tdWins++;
        break;
      }
      if (s.yards >= toGo) {
        down = 1;
        toGo = Math.min(10.0, ydsToGoal);
      } else {
        down++;
        toGo = Math.max(0.5, toGo - s.yards);
      }
    }
  }
  return {
    tdWinPct: +((100 * tdWins) / trials).toFixed(1),
    sackPct: +((100 * sacks) / Math.max(1, snaps)).toFixed(1),
    scramblePct: +((100 * scrambles) / Math.max(1, snaps)).toFixed(1),
    intPct: +((100 * ints) / Math.max(1, snaps)).toFixed(2),
  };
}

function simulateThirdAndNine(
  playIds: string[],
  pool: Record<string, Record<string, SnapSample[]>>,
  trials = 1000
) {
  const defs: ExtendedDefFrontId[] = ['DIME_QUARTERS_MATCH', 'DIME_MUG_C0', 'NICKEL_SIM_C2', 'VIKINGS_MUG_CROSSDOG_C0'];
  let conv = 0;
  let sacks = 0;
  let scrambles = 0;
  let ints = 0;
  let atts = 0;
  let comps = 0;
  let epaSum = 0;

  for (let t = 0; t < trials; t++) {
    const df = defs[Math.floor(Math.random() * defs.length)];
    const pid = playIds[Math.floor(Math.random() * playIds.length)];
    const bucket = pool[pid][df];
    const s = bucket[Math.floor(Math.random() * bucket.length)];
    if (s.yards >= 9.0 && !s.isTurnover) conv++;
    if (s.isSack) sacks++;
    if (s.isScramble) scrambles++;
    if (s.isPassAttempt) {
      atts++;
      if (s.isCompletion) comps++;
      if (s.isInt) ints++;
    }
    epaSum += s.epa;
  }
  return {
    convPct: +((100 * conv) / trials).toFixed(1),
    compPct: atts ? +((100 * comps) / atts).toFixed(1) : 0,
    sackPct: +((100 * sacks) / trials).toFixed(1),
    scramblePct: +((100 * scrambles) / trials).toFixed(1),
    intPct: atts ? +((100 * ints) / atts).toFixed(2) : 0,
    meanEpa: +(epaSum / trials).toFixed(3),
  };
}

function simulateFourMinuteDrill(
  playIds: string[],
  pool: Record<string, Record<string, SnapSample[]>>,
  trials = 1000
) {
  const defs: ExtendedDefFrontId[] = ['BASE_34_BEAR_C4', 'BASE_43_OVER_C1', 'NICKEL_UNDER_C1', 'NICKEL_OVER_C3'];
  let sealed = 0;
  let firstDowns = 0;

  for (let t = 0; t < trials; t++) {
    let ydsToGoal = 70.0;
    let clock = 240.0;
    let oppTos = 2;
    let down = 1;
    let toGo = 10.0;
    while (clock > 0 && down <= 4) {
      const df = defs[Math.floor(Math.random() * defs.length)];
      const pid = playIds[Math.floor(Math.random() * playIds.length)];
      const bucket = pool[pid][df];
      const s = bucket[Math.floor(Math.random() * bucket.length)];
      if (s.isTurnover) break;
      let bleed = s.durationSec;
      if (s.reason === 'INCOMPLETE' || s.reason === 'OUT_OF_BOUNDS') {
        bleed += 1.0;
      } else if (oppTos > 0) {
        oppTos--;
        bleed += 2.0;
      } else {
        bleed += 39.5;
      }
      clock -= bleed;
      ydsToGoal -= s.yards;
      if (ydsToGoal <= 0.05 || clock <= 0) {
        sealed++;
        break;
      }
      if (s.yards >= toGo) {
        firstDowns++;
        down = 1;
        toGo = Math.min(10.0, ydsToGoal);
      } else {
        down++;
        toGo = Math.max(0.5, toGo - s.yards);
      }
    }
  }
  return {
    sealPct: +((100 * sealed) / trials).toFixed(1),
    firstDownsPerDrive: +(firstDowns / trials).toFixed(2),
  };
}

export function runQbArchetypeSensitivityStudy(): void {
  const engine = new All22KinematicEngine();
  const OPEN_FRONTS: ExtendedDefFrontId[] = MODERN_2027_DEF_FRONTS.filter((f) => f !== 'GOAL_LINE_62_PINCH');
  const EXT_FRONTS: ExtendedDefFrontId[] = [...OPEN_FRONTS, ...ADAPTIVE_COUNTER_DEF_FRONTS];
  const STD_DEF_WEIGHTS = OPEN_FRONTS.map((f) => LEAGUE_OPEN_DEF_WEIGHTS[f as ModernDefFrontId]);
  const EXT_STD_DEF_WEIGHTS = [
    ...STD_DEF_WEIGHTS.map((w) => w * 0.80),
    0.10, // NICKEL_QB_SPY_CONTAIN_C1
    0.10, // NICKEL_CALVIN_BRACKET_WR1
  ];

  const REPS_OPEN = 45;
  const REPS_CTX = 30;

  console.log('================================================================================================================');
  console.log(' QB ARCHETYPE, READ VERSATILITY, ADAPTIVE DEFENSES (QB_SPY & CALVIN BRACKET) & QB FUNGIBILITY STUDY');
  console.log(' BDB-2027 & nflverse/FTN 2022-2024 Calibrated 20 Hz Engine (w/ Improvised Scrambles, QB_SPY, BRACKET_TOP)');
  console.log('================================================================================================================\n');

  const omegaOpenPlays = OMEGA_2027_PLAYBOOK.filter((p) => p.id !== 'OMEGA_GOALLINE_SPRINT_SMASH');
  const omegaQbRunIdx = omegaOpenPlays
    .map((p, i) => (p.id === 'OMEGA_11V11_RHINO_PIN_PULL' ? i : -1))
    .filter((i) => i >= 0);

  const omegaPoolsCache: Record<string, { pool: Record<string, Record<string, SnapSample[]>>; glPool: Record<string, Record<string, SnapSample[]>>; oobPool: Record<string, Record<string, SnapSample[]>> }> = {};
  const omegaResults: Record<string, any> = {};

  // ---------------------------------------------------------------------------
  // PART 1: FULL 9-ARCHETYPE DEEP DIVE ON 2027 OMEGA CONTINUUM
  // ---------------------------------------------------------------------------
  console.log(`[PART 1] 2027 OMEGA CONTINUUM — ALL QB PROFILES (N=${REPS_OPEN} snaps/play/front x 11 fronts)`);
  for (const arch of QB_ARCHETYPES) {
    let pool: Record<string, Record<string, SnapSample[]>>;
    let glPool: Record<string, Record<string, SnapSample[]>>;
    let oobPool: Record<string, Record<string, SnapSample[]>>;

    if (arch.sharePhysicsWithId && omegaPoolsCache[arch.sharePhysicsWithId]) {
      pool = omegaPoolsCache[arch.sharePhysicsWithId].pool;
      glPool = omegaPoolsCache[arch.sharePhysicsWithId].glPool;
      oobPool = omegaPoolsCache[arch.sharePhysicsWithId].oobPool;
    } else {
      pool = {};
      glPool = {};
      oobPool = {};
      for (const play of OMEGA_2027_PLAYBOOK) {
        pool[play.id] = {};
        for (const df of EXT_FRONTS) {
          pool[play.id][df] = [];
          const fc: SimFieldContext | undefined =
            play.id === 'OMEGA_11V11_RHINO_PIN_PULL' ? { sidelineObjective: 'STAY_INBOUNDS' } : undefined;
          for (let r = 0; r < REPS_OPEN; r++) {
            const off = applyQbArchetype(play.buildOffense(), arch);
            pool[play.id][df].push(runSample(engine, off, buildExtendedDefense(df), fc, `OMEGA|${play.id}|${df}|${r}`));
          }
        }
        if (play.id === 'OMEGA_GOALLINE_SPRINT_SMASH' || play.id === 'OMEGA_11V11_RHINO_PIN_PULL') {
          glPool[play.id] = {};
          for (const df of ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ExtendedDefFrontId[]) {
            glPool[play.id][df] = [];
            for (let r = 0; r < REPS_CTX; r++) {
              const off = applyQbArchetype(play.buildOffense(), arch);
              glPool[play.id][df].push(
                runSample(engine, off, buildExtendedDefense(df), { yardLineToGoal: 4.0, sidelineObjective: 'NORMAL' }, `OMEGA_GL|${play.id}|${df}|${r}`)
              );
            }
          }
        }
        if (['OMEGA_2MIN_BOUNDARY_OOB', 'OMEGA_3RD9_SWITCH_STICKS', 'OMEGA_ORBIT_GLANCE_FLOOD'].includes(play.id)) {
          oobPool[play.id] = {};
          for (const df of ['DIME_QUARTERS_MATCH', 'DIME_MUG_C0', 'NICKEL_SIM_C2', 'NICKEL_OVER_C3'] as ExtendedDefFrontId[]) {
            oobPool[play.id][df] = [];
            for (let r = 0; r < REPS_CTX; r++) {
              const off = applyQbArchetype(play.buildOffense(), arch);
              oobPool[play.id][df].push(
                runSample(engine, off, buildExtendedDefense(df), { sidelineObjective: 'STOP_CLOCK_OOB' }, `OMEGA_OOB|${play.id}|${df}|${r}`)
              );
            }
          }
        }
      }
      omegaPoolsCache[arch.id] = { pool, glPool, oobPool };
    }

    const mat9 = omegaOpenPlays.map((p) =>
      OPEN_FRONTS.map((df) => pool[p.id][df].reduce((a, b) => a + b.epa, 0) / pool[p.id][df].length)
    );
    const mat11 = omegaOpenPlays.map((p) =>
      EXT_FRONTS.map((df) => pool[p.id][df].reduce((a, b) => a + b.epa, 0) / pool[p.id][df].length)
    );

    const nashUnconstrained = solveZeroSumNash(mat9);
    const nashDurability12 = solveZeroSumNash(mat9, omegaQbRunIdx, 0.12);
    const nashAdaptive11 = solveZeroSumNash(mat11);
    const nashAdaptive11Cap12 = solveZeroSumNash(mat11, omegaQbRunIdx, 0.12);

    const openPlayIds = omegaOpenPlays.map((p) => p.id);
    const passThirdLongIds = ['OMEGA_3RD9_SWITCH_STICKS', 'OMEGA_ORBIT_GLANCE_FLOOD', 'OMEGA_2MIN_BOUNDARY_OOB'];
    const glIds = ['OMEGA_GOALLINE_SPRINT_SMASH', 'OMEGA_11V11_RHINO_PIN_PULL'];

    const offCapM = +(OMEGA_ACTIVE_11_CAP_M - 13.5 + arch.qbCapM - (arch.olRatingDelta < 0 ? 38.5 : 0)).toFixed(1);
    const defBonus = computeCapDefBonus(offCapM);

    const sharedRes = arch.sharePhysicsWithId ? omegaResults[arch.sharePhysicsWithId] : null;
    const seasonStdUncon = sharedRes
      ? sharedRes.seasons.stdUncon
      : simulateSeasonFromPool(openPlayIds, nashUnconstrained.offWeights, OPEN_FRONTS, STD_DEF_WEIGHTS, pool, passThirdLongIds, glIds, glPool, 700, false);
    const seasonNashUncon = sharedRes
      ? sharedRes.seasons.nashUncon
      : simulateSeasonFromPool(openPlayIds, nashUnconstrained.offWeights, OPEN_FRONTS, nashUnconstrained.defWeights, pool, passThirdLongIds, glIds, glPool, 700, false);
    const seasonNashDur12 = sharedRes
      ? sharedRes.seasons.nashDur12
      : simulateSeasonFromPool(openPlayIds, nashDurability12.offWeights, OPEN_FRONTS, nashDurability12.defWeights, pool, passThirdLongIds, glIds, glPool, 700, false);
    const seasonAdaptive11 = sharedRes
      ? sharedRes.seasons.nashAdaptive11
      : simulateSeasonFromPool(openPlayIds, nashAdaptive11.offWeights, EXT_FRONTS, nashAdaptive11.defWeights, pool, passThirdLongIds, glIds, glPool, 700, false);
    const seasonPassForced = sharedRes
      ? sharedRes.seasons.passForcedTrail14
      : simulateSeasonFromPool(openPlayIds, nashDurability12.offWeights, EXT_FRONTS, EXT_STD_DEF_WEIGHTS, pool, passThirdLongIds, glIds, glPool, 700, true);

    const thirdAnd9 = sharedRes ? sharedRes.situational.thirdAnd9 : simulateThirdAndNine(['OMEGA_3RD9_SWITCH_STICKS', 'OMEGA_ORBIT_GLANCE_FLOOD'], pool, 900);
    const twoMin = sharedRes ? sharedRes.situational.twoMin : simulateTwoMinuteDrill(['OMEGA_2MIN_BOUNDARY_OOB', 'OMEGA_3RD9_SWITCH_STICKS', 'OMEGA_ORBIT_GLANCE_FLOOD'], oobPool, 900);
    const fourMin = sharedRes ? sharedRes.situational.fourMin : simulateFourMinuteDrill(['OMEGA_11V11_RHINO_PIN_PULL', 'OMEGA_CHIRAL_JET_OPTION'], pool, 900);

    const perPlay: Record<string, any> = {};
    for (const p of OMEGA_2027_PLAYBOOK) {
      perPlay[p.id] = {
        open9: summarizeSamples(OPEN_FRONTS.flatMap((df) => pool[p.id][df])),
        vsQbSpy: summarizeSamples(pool[p.id]['NICKEL_QB_SPY_CONTAIN_C1']),
        vsCalvinBracket: summarizeSamples(pool[p.id]['NICKEL_CALVIN_BRACKET_WR1']),
      };
    }

    const withNet = (s: any) => ({ ...s, teamNetDiff: +(s.ppg - (22.4 - defBonus)).toFixed(2) });

    omegaResults[arch.id] = {
      archetype: arch,
      effectiveOffCapM: offCapM,
      defReinvestBonusPpg: defBonus,
      nashUnconstrained: {
        epa: +nashUnconstrained.nashValue.toFixed(3),
        qbRunSharePct: +(omegaQbRunIdx.reduce((a, idx) => a + nashUnconstrained.offWeights[idx], 0) * 100).toFixed(1),
        mix: Object.fromEntries(openPlayIds.map((id, i) => [id, +(nashUnconstrained.offWeights[i] * 100).toFixed(1)])),
        defMix: Object.fromEntries(OPEN_FRONTS.map((df, j) => [df, +(nashUnconstrained.defWeights[j] * 100).toFixed(1)])),
      },
      nashDurability12: {
        epa: +nashDurability12.nashValue.toFixed(3),
        mix: Object.fromEntries(openPlayIds.map((id, i) => [id, +(nashDurability12.offWeights[i] * 100).toFixed(1)])),
      },
      nashAdaptive11: {
        epa: +nashAdaptive11.nashValue.toFixed(3),
        epaCap12: +nashAdaptive11Cap12.nashValue.toFixed(3),
        spyDefSharePct: +(nashAdaptive11.defWeights[EXT_FRONTS.indexOf('NICKEL_QB_SPY_CONTAIN_C1')] * 100).toFixed(1),
        bracketDefSharePct: +(nashAdaptive11.defWeights[EXT_FRONTS.indexOf('NICKEL_CALVIN_BRACKET_WR1')] * 100).toFixed(1),
        defMix: Object.fromEntries(EXT_FRONTS.map((df, j) => [df, +(nashAdaptive11.defWeights[j] * 100).toFixed(1)])),
      },
      seasons: {
        stdUncon: withNet(seasonStdUncon),
        nashUncon: withNet(seasonNashUncon),
        nashDur12: withNet(seasonNashDur12),
        nashAdaptive11: withNet(seasonAdaptive11),
        passForcedTrail14: withNet(seasonPassForced),
      },
      situational: { thirdAnd9, twoMin, fourMin },
      perPlay,
    };

    const r = omegaResults[arch.id];
    console.log(
      `  ${arch.id.padEnd(24)} | Cap=$${offCapM.toFixed(1)}M (Def ${defBonus >= 0 ? '+' : ''}${defBonus}) | ` +
        `Nash9=${r.nashUnconstrained.epa >= 0 ? '+' : ''}${r.nashUnconstrained.epa.toFixed(3)} (${r.nashUnconstrained.qbRunSharePct}% QBR) | ` +
        `Nash<=12%=${r.nashDurability12.epa >= 0 ? '+' : ''}${r.nashDurability12.epa.toFixed(3)} | ` +
        `Nash11(Spy+Brk)=${r.nashAdaptive11.epa >= 0 ? '+' : ''}${r.nashAdaptive11.epa.toFixed(3)} [Spy=${r.nashAdaptive11.spyDefSharePct}% Brk=${r.nashAdaptive11.bracketDefSharePct}%]`
    );
    console.log(
      `     PPG: Nash9=${r.seasons.nashUncon.ppg} (Net ${r.seasons.nashUncon.teamNetDiff >= 0 ? '+' : ''}${r.seasons.nashUncon.teamNetDiff}, ${r.seasons.nashUncon.qbRunsPerGame} QBR/g, Scrm=${r.seasons.nashUncon.scramblePct}%) | ` +
        `Nash<=12%=${r.seasons.nashDur12.ppg} (Net ${r.seasons.nashDur12.teamNetDiff >= 0 ? '+' : ''}${r.seasons.nashDur12.teamNetDiff}) | ` +
        `Trail14=${r.seasons.passForcedTrail14.ppg} (Comp ${r.seasons.passForcedTrail14.compPct}% Sack ${r.seasons.passForcedTrail14.sackPct}% Scrm ${r.seasons.passForcedTrail14.scramblePct}% INT ${r.seasons.passForcedTrail14.intPct}%)`
    );
    console.log(
      `     Drills: 3rd&9 Conv=${thirdAnd9.convPct}% EPA=${thirdAnd9.meanEpa >= 0 ? '+' : ''}${thirdAnd9.meanEpa} Sack=${thirdAnd9.sackPct}% Scrm=${thirdAnd9.scramblePct}% | ` +
        `2Min TD=${twoMin.tdWinPct}% | 4Min Seal=${fourMin.sealPct}%`
    );
  }

  // ---------------------------------------------------------------------------
  // PART 2: PLAYBOOK x QB MISMATCH MATRIX ("Don't build like you have an elite QB...")
  // ---------------------------------------------------------------------------
  console.log('\n[PART 2] PLAYBOOK x QB MISMATCH MATRIX (OMEGA vs APEX vs SHANAHAN 12 vs CONV 11 SPREAD)');
  const matrixQbs = QB_ARCHETYPES.filter((q) =>
    ['RAW_MOBILE_11M', 'MID_MOBILE_13M', 'MID_POCKET_28M', 'ELITE_POCKET_13M_CTRL', 'ELITE_POCKET_52M', 'SUPERMAX_DUAL_55M'].includes(q.id)
  );
  const playbookMatrix: Record<string, Record<string, any>> = {
    OMEGA_2027_UNCON: {},
    OMEGA_2027_CAP12QBR: {},
    APEX_2027_UNCON: {},
    SHANAHAN_12_PA: {},
    CONV_11_SPREAD: {},
  };

  for (const arch of matrixQbs) {
    playbookMatrix.OMEGA_2027_UNCON[arch.id] = {
      nashEpa: omegaResults[arch.id].nashUnconstrained.epa,
      nashPpg: omegaResults[arch.id].seasons.nashUncon.ppg,
      teamNetDiff: omegaResults[arch.id].seasons.nashUncon.teamNetDiff,
      qbRunsPerGame: omegaResults[arch.id].seasons.nashUncon.qbRunsPerGame,
      scramblePct: omegaResults[arch.id].seasons.nashUncon.scramblePct,
    };
    playbookMatrix.OMEGA_2027_CAP12QBR[arch.id] = {
      nashEpa: omegaResults[arch.id].nashDurability12.epa,
      nashPpg: omegaResults[arch.id].seasons.nashDur12.ppg,
      teamNetDiff: omegaResults[arch.id].seasons.nashDur12.teamNetDiff,
      qbRunsPerGame: omegaResults[arch.id].seasons.nashDur12.qbRunsPerGame,
      scramblePct: omegaResults[arch.id].seasons.nashDur12.scramblePct,
    };
  }

  const apexOpenPlays = APEX_2027_PLAYBOOK.filter((p) => p.id !== 'APEX_GOALLINE_SPRINT_SMASH');
  const apexCache: Record<string, { nashEpa: number; sea: any }> = {};
  for (const arch of matrixQbs) {
    const offCapM = +(APEX_ACTIVE_11_CAP_M - 13.5 + arch.qbCapM).toFixed(1);
    const defBonus = computeCapDefBonus(offCapM);
    if (arch.sharePhysicsWithId && apexCache[arch.sharePhysicsWithId]) {
      const c = apexCache[arch.sharePhysicsWithId];
      playbookMatrix.APEX_2027_UNCON[arch.id] = {
        nashEpa: c.nashEpa,
        nashPpg: c.sea.ppg,
        teamNetDiff: +(c.sea.ppg - (22.4 - defBonus)).toFixed(2),
        qbRunsPerGame: c.sea.qbRunsPerGame,
        scramblePct: c.sea.scramblePct,
      };
      continue;
    }
    const apPool: Record<string, Record<string, SnapSample[]>> = {};
    for (const play of apexOpenPlays) {
      apPool[play.id] = {};
      for (const df of OPEN_FRONTS) {
        apPool[play.id][df] = [];
        const fc: SimFieldContext | undefined =
          play.id === 'APEX_EAGLES_RHINO_COUNTER' ? { sidelineObjective: 'STAY_INBOUNDS' } : undefined;
        for (let r = 0; r < 24; r++) {
          const off = applyQbArchetype(play.buildOffense(), arch);
          apPool[play.id][df].push(runSample(engine, off, buildExtendedDefense(df), fc, `APEX|${play.id}|${df}|${r}`));
        }
      }
    }
    const mat = apexOpenPlays.map((p) =>
      OPEN_FRONTS.map((df) => apPool[p.id][df].reduce((a, b) => a + b.epa, 0) / apPool[p.id][df].length)
    );
    const nash = solveZeroSumNash(mat);
    const sea = simulateSeasonFromPool(
      apexOpenPlays.map((p) => p.id),
      nash.offWeights,
      OPEN_FRONTS,
      nash.defWeights,
      apPool,
      ['APEX_SWITCH_MESH_STICKS', 'APEX_ORBIT_GLANCE_FLOOD'],
      [],
      {},
      500,
      false
    );
    const nashEpa = +nash.nashValue.toFixed(3);
    apexCache[arch.id] = { nashEpa, sea };
    playbookMatrix.APEX_2027_UNCON[arch.id] = {
      nashEpa,
      nashPpg: sea.ppg,
      teamNetDiff: +(sea.ppg - (22.4 - defBonus)).toFixed(2),
      qbRunsPerGame: sea.qbRunsPerGame,
      scramblePct: sea.scramblePct,
    };
  }

  for (const baseId of ['SHANAHAN_12_PA', 'CONV_11_SPREAD'] as const) {
    const baseProf = BASELINE_PHILOSOPHIES.find((p) => p.id === baseId)!;
    const baseCache: Record<string, { nashEpa: number; sea: any }> = {};
    const allNeededPlays = Array.from(new Set<CanonicalPlayId>([...baseProf.openFieldPlays, ...baseProf.thirdLongPlays]));

    for (const arch of matrixQbs) {
      const offCapM = +(baseProf.offCapM - 32.0 + arch.qbCapM).toFixed(1);
      const defBonus = computeCapDefBonus(offCapM);
      if (arch.sharePhysicsWithId && baseCache[arch.sharePhysicsWithId]) {
        const c = baseCache[arch.sharePhysicsWithId];
        playbookMatrix[baseId][arch.id] = {
          nashEpa: c.nashEpa,
          nashPpg: c.sea.ppg,
          teamNetDiff: +(c.sea.ppg - (22.4 - defBonus)).toFixed(2),
          compPct: c.sea.compPct,
          sackPct: c.sea.sackPct,
          scramblePct: c.sea.scramblePct,
          intPct: c.sea.intPct,
        };
        continue;
      }
      const modProf: BaselineRosterProfile = { ...baseProf, qb: { ...arch.ratings } };
      const bPool: Record<string, Record<string, SnapSample[]>> = {};
      const bGlPool: Record<string, Record<string, SnapSample[]>> = {};
      for (const pid of allNeededPlays) {
        bPool[pid] = {};
        for (const df of OPEN_FRONTS) {
          bPool[pid][df] = [];
          for (let r = 0; r < 24; r++) {
            bPool[pid][df].push(runSample(engine, buildBaselinePlay(modProf, pid), buildExtendedDefense(df), undefined, `${baseId}|${pid}|${df}|${r}`));
          }
        }
      }
      for (const pid of baseProf.goalLinePlays) {
        bGlPool[pid] = {};
        for (const df of ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ExtendedDefFrontId[]) {
          bGlPool[pid][df] = [];
          for (let r = 0; r < 16; r++) {
            bGlPool[pid][df].push(
              runSample(engine, buildBaselinePlay(modProf, pid), buildExtendedDefense(df), {
                yardLineToGoal: 4.0,
                sidelineObjective: 'NORMAL',
              }, `${baseId}_GL|${pid}|${df}|${r}`)
            );
          }
        }
      }
      const mat = baseProf.openFieldPlays.map((pid) =>
        OPEN_FRONTS.map((df) => bPool[pid][df].reduce((a, b) => a + b.epa, 0) / bPool[pid][df].length)
      );
      const nash = solveZeroSumNash(mat);
      const sea = simulateSeasonFromPool(
        baseProf.openFieldPlays,
        nash.offWeights,
        OPEN_FRONTS,
        nash.defWeights,
        bPool,
        baseProf.thirdLongPlays,
        baseProf.goalLinePlays,
        bGlPool,
        500,
        false
      );
      const nashEpa = +nash.nashValue.toFixed(3);
      baseCache[arch.id] = { nashEpa, sea };
      playbookMatrix[baseId][arch.id] = {
        nashEpa,
        nashPpg: sea.ppg,
        teamNetDiff: +(sea.ppg - (22.4 - defBonus)).toFixed(2),
        compPct: sea.compPct,
        sackPct: sea.sackPct,
        scramblePct: sea.scramblePct,
        intPct: sea.intPct,
      };
    }
  }

  for (const [schemeName, row] of Object.entries(playbookMatrix)) {
    console.log(`  ${schemeName}:`);
    for (const q of matrixQbs) {
      const d = row[q.id];
      const extra =
        d.compPct !== undefined
          ? ` | Comp=${d.compPct}% Sack=${d.sackPct}% Scrm=${d.scramblePct}% INT=${d.intPct}%`
          : ` | QBR/g=${d.qbRunsPerGame} Scrm=${d.scramblePct}%`;
      console.log(
        `    ${q.id.padEnd(23)} => NashEPA=${d.nashEpa >= 0 ? '+' : ''}${d.nashEpa.toFixed(3)} | NashPPG=${d.nashPpg.toFixed(2)} | TeamNet=${d.teamNetDiff >= 0 ? '+' : ''}${d.teamNetDiff.toFixed(2)}${extra}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // PART 3: "CALVIN JOHNSON BRACKET" DOUBLE COVERAGE & QB SPY STRESS TEST
  //         Tests Read Versatility when Elite X-WR1 is Double-Covered!
  // ---------------------------------------------------------------------------
  console.log('\n[PART 3] ADAPTIVE DEFENSIVE COUNTERS: ELITE X-WR1 ("CALVIN JOHNSON BRACKET") vs 1-ON-1 C1 vs QB SPY');
  const convProf = BASELINE_PHILOSOPHIES.find((p) => p.id === 'CONV_11_SPREAD')!;
  const stressQbs = QB_ARCHETYPES.filter((q) =>
    ['RAW_MOBILE_11M', 'MID_MOBILE_13M', 'ELITE_POCKET_13M_CTRL', 'SUPERMAX_DUAL_55M'].includes(q.id)
  );
  const adaptiveCounterResults: Record<string, any> = {};

  for (const arch of stressQbs) {
    adaptiveCounterResults[arch.id] = {};
    for (const df of ['NICKEL_UNDER_C1', 'NICKEL_CALVIN_BRACKET_WR1', 'NICKEL_QB_SPY_CONTAIN_C1'] as ExtendedDefFrontId[]) {
      const samples: SnapSample[] = [];
      // Mix of OMEGA passing (Orbit Glance, 3rd&9 Switch, 2Min OOB) + Conv-11 Dagger/Four Verts with Elite Calvin WR1
      for (const playId of ['OMEGA_ORBIT_GLANCE_FLOOD', 'OMEGA_3RD9_SWITCH_STICKS', 'OMEGA_2MIN_BOUNDARY_OOB']) {
        const play = OMEGA_2027_PLAYBOOK.find((p) => p.id === playId)!;
        for (let r = 0; r < 28; r++) {
          samples.push(runSample(engine, applyQbArchetype(play.buildOffense(), arch, true), buildExtendedDefense(df), undefined, `CALVIN|${playId}|${df}|${r}`));
        }
      }
      for (const pid of ['DAGGER', 'FOUR_VERTS'] as CanonicalPlayId[]) {
        const modProf: BaselineRosterProfile = { ...convProf, qb: { ...arch.ratings } };
        for (let r = 0; r < 28; r++) {
          samples.push(runSample(engine, applyQbArchetype(buildBaselinePlay(modProf, pid), arch, true), buildExtendedDefense(df), undefined, `CALVIN|${pid}|${df}|${r}`));
        }
      }
      const summ = summarizeSamples(samples);
      adaptiveCounterResults[arch.id][df] = summ;
    }
    const c1 = adaptiveCounterResults[arch.id]['NICKEL_UNDER_C1'];
    const brk = adaptiveCounterResults[arch.id]['NICKEL_CALVIN_BRACKET_WR1'];
    const spy = adaptiveCounterResults[arch.id]['NICKEL_QB_SPY_CONTAIN_C1'];
    console.log(`  ${arch.id}:`);
    console.log(`    vs 1v1 C1       => EPA=${c1.meanEpa >= 0 ? '+' : ''}${c1.meanEpa.toFixed(3)} | Comp=${c1.compPct}% Sack=${c1.sackPct}% Scrm=${c1.scramblePct}% INT=${c1.intPct}% | WR1_Tgt=${c1.wr1TargetPct}% Neff=${c1.targetNeff}`);
    console.log(`    vs CALVIN_BRK   => EPA=${brk.meanEpa >= 0 ? '+' : ''}${brk.meanEpa.toFixed(3)} | Comp=${brk.compPct}% Sack=${brk.sackPct}% Scrm=${brk.scramblePct}% INT=${brk.intPct}% | WR1_Tgt=${brk.wr1TargetPct}% Neff=${brk.targetNeff}`);
    console.log(`    vs QB_SPY_C1    => EPA=${spy.meanEpa >= 0 ? '+' : ''}${spy.meanEpa.toFixed(3)} | Comp=${spy.compPct}% Sack=${spy.sackPct}% Scrm=${spy.scramblePct}% INT=${spy.intPct}% | WR1_Tgt=${spy.wr1TargetPct}% Neff=${spy.targetNeff}`);
  }

  // ---------------------------------------------------------------------------
  // PART 4: 17-GAME QB FUNGIBILITY & ACCEPTED-ATTRITION ECONOMICS
  //         Single $52M Star + $3M Backup vs Fungible 2-QB Mobile Room ($20M)
  // ---------------------------------------------------------------------------
  console.log('\n[PART 4] 17-GAME QB FUNGIBILITY & ACCEPTED-ATTRITION ECONOMICS (Empirical nflverse Availability)');
  // Empirical nflverse 2022-24 regular season availability:
  //   Pocket (0-2 QBR/g): ~14.5/17 games (85.3% healthy)
  //   Protected Dual/Mobile (<=12% QBR): ~14.1/17 games (82.9% healthy)
  //   Aggressive Unconstrained Mobile (~25-30% QBR): ~11.2/17 games (65.9% healthy — exact Fields/Richardson/Jones empirical avg!)
  const fungibilityScenarios = [
    {
      id: 'SINGLE_ELITE_POCKET_55M_ROOM',
      label: 'Single $52M Elite Pocket QB + $3M Pocket Backup ($55M QB Room, Protected)',
      qbRoomCapM: 55.0,
      qb1HealthyGames: 14.5,
      qb1Ppg: omegaResults['ELITE_POCKET_52M'].seasons.nashDur12.ppg,
      qb2Ppg: omegaResults['BACKUP_POCKET_3M'].seasons.nashDur12.ppg,
      qb1StdPpg: omegaResults['ELITE_POCKET_52M'].seasons.stdUncon.ppg,
      qb2StdPpg: omegaResults['BACKUP_POCKET_3M'].seasons.stdUncon.ppg,
      qb1Style: 'OMEGA Protected (<=12% QBR)',
    },
    {
      id: 'SINGLE_SUPERMAX_DUAL_PROTECTED_58M',
      label: 'Single $55M Supermax Dual + $3M Backup ($58M Room, Protected <=12% QBR)',
      qbRoomCapM: 58.0,
      qb1HealthyGames: 15.0,
      qb1Ppg: omegaResults['SUPERMAX_DUAL_55M'].seasons.nashDur12.ppg,
      qb2Ppg: omegaResults['BACKUP_POCKET_3M'].seasons.nashDur12.ppg,
      qb1StdPpg: omegaResults['SUPERMAX_DUAL_55M'].seasons.stdUncon.ppg,
      qb2StdPpg: omegaResults['BACKUP_POCKET_3M'].seasons.stdUncon.ppg,
      qb1Style: 'OMEGA Protected (<=12% QBR)',
    },
    {
      id: 'SINGLE_SUPERMAX_DUAL_AGGRESSIVE_58M',
      label: 'Single $55M Supermax Dual + $3M Backup ($58M Room, Aggressive Uncon QBR)',
      qbRoomCapM: 58.0,
      qb1HealthyGames: 11.8,
      qb1Ppg: omegaResults['SUPERMAX_DUAL_55M'].seasons.nashUncon.ppg,
      qb2Ppg: omegaResults['BACKUP_POCKET_3M'].seasons.nashDur12.ppg,
      qb1StdPpg: omegaResults['SUPERMAX_DUAL_55M'].seasons.stdUncon.ppg,
      qb2StdPpg: omegaResults['BACKUP_POCKET_3M'].seasons.stdUncon.ppg,
      qb1Style: 'OMEGA Aggressive (Unconstrained QBR)',
    },
    {
      id: 'FUNGIBLE_2QB_MID_MOBILE_20M',
      label: 'Fungible 2-QB Mid-Mobile Room ($13.5M QB1 + $6.5M QB2 = $20M, Accepted Attrition!)',
      qbRoomCapM: 20.0,
      qb1HealthyGames: 11.2,
      qb1Ppg: omegaResults['MID_MOBILE_13M'].seasons.nashUncon.ppg,
      qb2Ppg: omegaResults['FUNGIBLE_MOBILE_QB2'].seasons.nashUncon.ppg,
      qb1StdPpg: omegaResults['MID_MOBILE_13M'].seasons.stdUncon.ppg,
      qb2StdPpg: omegaResults['FUNGIBLE_MOBILE_QB2'].seasons.stdUncon.ppg,
      qb1Style: 'OMEGA Unconstrained 11v11 (Accepted Attrition)',
    },
    {
      id: 'SINGLE_MID_MOBILE_PROTECTED_16M',
      label: 'Single $13.5M Mid-Mobile QB + $3M Backup ($16.5M Room, Risk-Averse <=12% QBR)',
      qbRoomCapM: 16.5,
      qb1HealthyGames: 14.1,
      qb1Ppg: omegaResults['MID_MOBILE_13M'].seasons.nashDur12.ppg,
      qb2Ppg: omegaResults['BACKUP_POCKET_3M'].seasons.nashDur12.ppg,
      qb1StdPpg: omegaResults['MID_MOBILE_13M'].seasons.stdUncon.ppg,
      qb2StdPpg: omegaResults['BACKUP_POCKET_3M'].seasons.stdUncon.ppg,
      qb1Style: 'OMEGA Protected (<=12% QBR)',
    },
    {
      id: 'FUNGIBLE_2QB_RAW_MOBILE_17M',
      label: 'Fungible 2-QB Raw-Mobile Room ($10.8M QB1 + $6.5M QB2 = $17.3M, Accepted Attrition)',
      qbRoomCapM: 17.3,
      qb1HealthyGames: 11.2,
      qb1Ppg: omegaResults['RAW_MOBILE_11M'].seasons.nashUncon.ppg,
      qb2Ppg: omegaResults['FUNGIBLE_MOBILE_QB2'].seasons.nashUncon.ppg,
      qb1StdPpg: omegaResults['RAW_MOBILE_11M'].seasons.stdUncon.ppg,
      qb2StdPpg: omegaResults['FUNGIBLE_MOBILE_QB2'].seasons.stdUncon.ppg,
      qb1Style: 'OMEGA Unconstrained 11v11 (Accepted Attrition)',
    },
    {
      id: 'MISMATCH_MID_MOBILE_IN_CONV11',
      label: 'Scheme Mismatch: $13.5M Mid-Mobile QB Forced into CONV_11_SPREAD ($16.5M Room)',
      qbRoomCapM: 16.5,
      qb1HealthyGames: 14.1,
      qb1Ppg: playbookMatrix.CONV_11_SPREAD['MID_MOBILE_13M'].nashPpg,
      qb2Ppg: Math.max(4.0, playbookMatrix.CONV_11_SPREAD['RAW_MOBILE_11M'].nashPpg),
      qb1StdPpg: playbookMatrix.CONV_11_SPREAD['MID_MOBILE_13M'].nashPpg,
      qb2StdPpg: Math.max(4.0, playbookMatrix.CONV_11_SPREAD['RAW_MOBILE_11M'].nashPpg),
      qb1Style: 'CONV_11 Dropback Spread (Scheme Mismatch!)',
    },
  ];

  const fungibilitySummary = fungibilityScenarios.map((sc) => {
    const w1 = sc.qb1HealthyGames / 17.0;
    const w2 = 1.0 - w1;
    const blendedOffPpg = +(w1 * sc.qb1Ppg + w2 * sc.qb2Ppg).toFixed(2);
    const blendedStdPpg = +(w1 * sc.qb1StdPpg + w2 * sc.qb2StdPpg).toFixed(2);
    const totalOffCapM = +(OMEGA_ACTIVE_11_CAP_M - 13.5 + sc.qbRoomCapM).toFixed(1);
    const defBonus = computeCapDefBonus(totalOffCapM);
    const oppAllowedPpg = +(22.4 - defBonus).toFixed(2);
    const seasonNetDiff = +(blendedOffPpg - oppAllowedPpg).toFixed(2);
    const seasonStdNetDiff = +(blendedStdPpg - oppAllowedPpg).toFixed(2);
    const backupCliffPpg = +(sc.qb2Ppg - sc.qb1Ppg).toFixed(2);
    console.log(
      `  ${sc.id.padEnd(36)} | Room=$${sc.qbRoomCapM.toFixed(1)}M (Def ${defBonus >= 0 ? '+' : ''}${defBonus}) | ` +
        `QB1=${sc.qb1Ppg.toFixed(1)} (${sc.qb1HealthyGames}g) / QB2=${sc.qb2Ppg.toFixed(1)} (Cliff ${backupCliffPpg >= 0 ? '+' : ''}${backupCliffPpg}) | ` +
        `17g Nash=${blendedOffPpg.toFixed(2)} (Net ${seasonNetDiff >= 0 ? '+' : ''}${seasonNetDiff.toFixed(2)}) | ` +
        `17g Std=${blendedStdPpg.toFixed(2)} (Net ${seasonStdNetDiff >= 0 ? '+' : ''}${seasonStdNetDiff.toFixed(2)})`
    );
    return {
      ...sc,
      totalOffCapM,
      defReinvestBonusPpg: defBonus,
      backupCliffPpg,
      blended17gOffPpg: blendedOffPpg,
      blended17gTeamNetDiff: seasonNetDiff,
      blended17gStdOffPpg: blendedStdPpg,
      blended17gStdTeamNetDiff: seasonStdNetDiff,
    };
  });

  const out = {
    generatedAt: new Date().toISOString(),
    methodologyNote:
      'BDB-2027 & nflverse/FTN 2022-2024 calibrated 20 Hz engine with improvised dropback scrambles, first-class QB_SPY and BRACKET_TOP ("Calvin Johnson Double") defensive roles, bracket-aware read versatility, and 17-game QB fungibility / accepted-attrition economics.',
    empiricalReadVersatilityAndAvailability: {
      correlationsN51Starters: {
        secondPlusReadEpa_vs_PurePassEPA: 0.515,
        secondPlusReadEpa_vs_AllDbEPA: 0.517,
        mof5PlusShare_vs_PurePassEPA: 0.380,
        overallTtt_vs_PurePassEPA: -0.143,
        receiverPolydispersityNeff_vs_PurePassEPA: -0.165,
        secondPlusReadPct_vs_PurePassEPA: -0.072,
      },
      cohorts: {
        Elite_Pocket: { secondPlusReadPct: 18.8, secondPlusReadEpa: 0.221, r1Ttt: 2.40, r2Ttt: 2.96, recNeff: 5.95, zoneNeff: 6.61, mof5PlusPct: 15.9, desRushPg: 0.17, regGamesPerYr: 14.2 },
        Elite_Dual_Supermax: { secondPlusReadPct: 20.2, secondPlusReadEpa: 0.366, r1Ttt: 2.39, r2Ttt: 3.10, recNeff: 6.35, zoneNeff: 6.62, mof5PlusPct: 13.2, desRushPg: 3.09, regGamesPerYr: 15.8 },
        MidTier_Mobile: { secondPlusReadPct: 18.2, secondPlusReadEpa: 0.184, r1Ttt: 2.40, r2Ttt: 3.06, recNeff: 6.12, zoneNeff: 6.47, mof5PlusPct: 12.9, desRushPg: 2.20, regGamesPerYr: 14.1 },
        Raw_RunFirst_Mobile: { secondPlusReadPct: 19.9, secondPlusReadEpa: 0.208, r1Ttt: 2.50, r2Ttt: 3.16, recNeff: 5.97, zoneNeff: 6.26, mof5PlusPct: 12.8, desRushPg: 3.80, regGamesPerYr: 11.2 },
        MidTier_Pocket: { secondPlusReadPct: 18.9, secondPlusReadEpa: 0.155, r1Ttt: 2.35, r2Ttt: 2.98, recNeff: 6.31, zoneNeff: 6.70, mof5PlusPct: 14.0, desRushPg: 0.22, regGamesPerYr: 13.4 },
      },
    },
    omegaDeepDive: omegaResults,
    playbookByQbMatrix: playbookMatrix,
    adaptiveDefensiveCounterStressTest: adaptiveCounterResults,
    qbFungibility17GameEconomics: fungibilitySummary,
  };

  const outPath = path.join(process.cwd(), 'src', 'data', 'qb_archetype_sensitivity_report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\n[Saved] Upgraded QB & Adaptive Defense Sensitivity Report written to: ${outPath}`);
}

runQbArchetypeSensitivityStudy();
