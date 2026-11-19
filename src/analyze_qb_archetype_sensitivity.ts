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
  MODERN_2027_DEF_FRONTS,
  ModernDefFrontId,
  buildModern2027Defense,
} from './vanguard_2027_playbook';

type ExtendedDefFrontId = ModernDefFrontId | 'NICKEL_QB_SPY_CONTAIN_C1';

interface QbArchetypeSpec {
  id: string;
  label: string;
  qbCapM: number;
  olRatingDelta: number; // 0 for normal roster; -5 when modeling Supermax OL cap squeeze
  sharePhysicsWithId?: string; // Reuse exact on-field physics pool when ratings & OL are identical (isolates cap effect with 0 MC noise!)
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
      '2022-24 nflverse Raw Run-First cohort (Fields / Richardson / D.Jones: Comp 61.7%, Sack 9.0%, 3rd&7+ -0.155 EPA)',
  },
  {
    id: 'MID_MOBILE_13M',
    label: 'Mid-Tier Passing Mobile QB ($13.5M, OMEGA Base)',
    qbCapM: 13.5,
    olRatingDelta: 0,
    ratings: { speed: 89, accel: 90, power: 86, finesse: 84, awareness: 83 },
    empiricalNflComp:
      '2022-24 nflverse Mid-Tier Mobile cohort (Kyler / Lawrence / early-career mobile tier: Comp 64.8%, Sack 7.4%, PurePass -0.024 EPA)',
  },
  {
    id: 'MID_POCKET_28M',
    label: 'Mid-Tier Accurate Pocket QB ($28.0M Veteran)',
    qbCapM: 28.0,
    olRatingDelta: 0,
    ratings: { speed: 75, accel: 79, power: 75, finesse: 86, awareness: 86 },
    empiricalNflComp:
      '2022-24 nflverse Mid-Tier Pocket cohort (Carr / Mayfield / Cousins-mid tier: Comp 63.7%-65.5%, Sack 6.7%, DesRush 0.21/g)',
  },
  {
    id: 'ELITE_POCKET_13M_CTRL',
    label: 'Elite Accurate Pocket QB ($13.5M Rookie-Scale Control)',
    qbCapM: 13.5,
    olRatingDelta: 0,
    ratings: { speed: 74, accel: 78, power: 74, finesse: 95, awareness: 95 },
    empiricalNflComp:
      'Rookie-scale elite pocket processor (Brock Purdy control — identical physics to $52M Elite Pocket, isolates pure scheme/physics from cap)',
  },
  {
    id: 'ELITE_POCKET_52M',
    label: 'Elite Accurate Pocket QB ($52.0M Market Cap -> Def Tax)',
    qbCapM: 52.0,
    olRatingDelta: 0,
    sharePhysicsWithId: 'ELITE_POCKET_13M_CTRL',
    ratings: { speed: 74, accel: 78, power: 74, finesse: 95, awareness: 95 },
    empiricalNflComp:
      '2022-24 nflverse Elite Pocket cohort (Burrow / Goff / Tua / Herbert / Stafford: Comp 67.0%, INT 1.95%, Sack 5.8%, Man +0.134 EPA)',
  },
  {
    id: 'ELITE_POCKET_52M_SQUEEZE',
    label: 'Elite Accurate Pocket QB ($52.0M + OL Cap Squeeze -5)',
    qbCapM: 52.0,
    olRatingDelta: -5,
    ratings: { speed: 74, accel: 78, power: 74, finesse: 95, awareness: 95 },
    empiricalNflComp:
      'Market-cap pocket QB when $38.5M QB premium forces OL pass/run protection compression instead of defensive cap tax',
  },
  {
    id: 'SUPERMAX_DUAL_55M',
    label: 'Unicorn Dual-Threat Supermax ($55.0M Ceiling)',
    qbCapM: 55.0,
    olRatingDelta: 0,
    ratings: { speed: 90, accel: 91, power: 88, finesse: 93, awareness: 93 },
    empiricalNflComp:
      '2022-24 nflverse Elite Dual-Threat cohort (Lamar / Allen / Mahomes / Hurts: +0.179 DB EPA, +0.270 DesRush EPA)',
  },
];

interface SnapSample {
  yards: number;
  epa: number;
  durationSec: number;
  tttSec: number | null;
  reason: string;
  isPassAttempt: boolean;
  isCompletion: boolean;
  isSack: boolean;
  isInt: boolean;
  isTurnover: boolean;
  isQbDesignedRun: boolean;
  pressured: boolean;
  explosive15: boolean;
}

function buildExtendedDefense(frontId: ExtendedDefFrontId): SimAgent[] {
  if (frontId !== 'NICKEL_QB_SPY_CONTAIN_C1') {
    return buildModern2027Defense(frontId);
  }
  const mkDef = (
    id: string,
    pos: string,
    x: number,
    y: number,
    role: NonNullable<SimAgent['defAssignment']>['role'],
    targetX: number,
    targetY: number,
    manTargetId?: string,
    customRatings?: Partial<SimAgent['ratings']>
  ): SimAgent => ({
    id,
    label: id,
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
    ratings: {
      speed: customRatings?.speed ?? 86,
      accel: customRatings?.accel ?? 88,
      power: customRatings?.power ?? 85,
      finesse: customRatings?.finesse ?? 85,
      awareness: customRatings?.awareness ?? 87,
    },
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

  return [
    mkDef('LDE', 'DE', -4.4, 0.6, 'CONTAIN_EDGE', -4.0, -4.5, undefined, { speed: 86, power: 86 }),
    mkDef('3T', 'DT', -1.8, 0.5, 'RUSH_GAP', -1.5, -4.0, undefined, { speed: 76, power: 91 }),
    mkDef('NT', 'NT', 1.1, 0.5, 'RUSH_GAP', 1.0, -4.0, undefined, { speed: 73, power: 93 }),
    mkDef('RDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.2, -4.5, undefined, { speed: 87, power: 85 }),
    mkDef('WILL', 'WILL', -6.0, 2.2, 'FORCE_ALLEY', -6.8, 1.2, undefined, { speed: 89, accel: 91, power: 86 }),
    mkDef('MIKE', 'MIKE', 0.0, 3.8, 'ROBBER', 0.0, 2.5, undefined, { speed: 90, accel: 91, power: 86, awareness: 90 }),
    mkDef('NCB', 'NI', -7.2, 3.8, 'MAN_COV', -7.0, 1.0, 'SL', { speed: 91, accel: 91, power: 72 }),
    mkDef('CB1', 'CB', -14.2, 4.2, 'MAN_COV', -14.2, 1.0, 'WR1', { speed: 92, accel: 91, power: 66 }),
    mkDef('CB2', 'CB', 14.2, 4.2, 'MAN_COV', 14.2, 1.0, 'WR2', { speed: 92, accel: 91, power: 66 }),
    mkDef('SS', 'SS', 5.6, 4.2, 'MAN_COV', 5.2, 1.0, 'TE', { speed: 89, accel: 89, power: 80 }),
    mkDef('FS', 'FS', 0.0, 13.5, 'DEEP_ZONE', 0.0, 17.5, undefined, { speed: 91, accel: 90, power: 72 }),
  ];
}

function applyQbArchetype(agents: SimAgent[], arch: QbArchetypeSpec): SimAgent[] {
  const olSet = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
  return agents.map((a) => {
    if (a.id === 'QB' || a.pos === 'QB') {
      return {
        ...a,
        ratings: { ...arch.ratings },
        optionPass: a.optionPass ? { ...a.optionPass, throwerRating: arch.ratings.finesse } : undefined,
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

function runSample(
  engine: All22KinematicEngine,
  off: SimAgent[],
  def: SimAgent[],
  fieldContext?: SimFieldContext
): SnapSample {
  const qbInit = off.find((a) => a.id === 'QB');
  const isQbDesignedRun = Boolean(qbInit && qbInit.assignment.role === 'BALL_CARRIER');

  const traj = engine.simulatePlay([...off, ...def], 1.0, fieldContext);
  const term = traj.find((s) => s.playOver) || traj[traj.length - 1];
  const throwSnap = traj.find((s) => s.ball?.state === 'IN_FLIGHT' && !s.ball.isLateral);

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
  const isPassAttempt = forwardPassThrown && !isSack;
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
    isPassAttempt,
    isCompletion,
    isSack,
    isInt,
    isTurnover,
    isQbDesignedRun,
    pressured,
    explosive15: yards >= 15.0 && !isTurnover,
  };
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

function summarizeSamples(samples: SnapSample[]) {
  const n = Math.max(1, samples.length);
  const passAtts = samples.filter((s) => s.isPassAttempt);
  const dbCount = samples.filter((s) => s.isPassAttempt || s.isSack).length;
  const ttts = samples.map((s) => s.tttSec).filter((v): v is number => v !== null);
  return {
    n: samples.length,
    meanYds: +(samples.reduce((a, b) => a + b.yards, 0) / n).toFixed(2),
    meanEpa: +(samples.reduce((a, b) => a + b.epa, 0) / n).toFixed(3),
    compPct: passAtts.length ? +((100 * passAtts.filter((s) => s.isCompletion).length) / passAtts.length).toFixed(1) : null,
    sackPct: dbCount ? +((100 * samples.filter((s) => s.isSack).length) / dbCount).toFixed(1) : null,
    intPct: passAtts.length ? +((100 * passAtts.filter((s) => s.isInt).length) / passAtts.length).toFixed(2) : null,
    pressPct: dbCount ? +((100 * samples.filter((s) => s.pressured).length) / dbCount).toFixed(1) : null,
    tttMean: ttts.length ? +(ttts.reduce((a, b) => a + b, 0) / ttts.length).toFixed(2) : null,
    expl15Pct: +((100 * samples.filter((s) => s.explosive15).length) / n).toFixed(1),
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
  let totalSnaps = 0;
  let passAtts = 0;
  let completions = 0;
  let sacks = 0;
  let ints = 0;

  // Ensure thirdLongPlayIds only references plays present in pool
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

  return {
    ppg: +(totalPts / trials).toFixed(2),
    tdDrivePct: +((100 * tdDrives) / totalDrives).toFixed(1),
    toDrivePct: +((100 * toDrives) / totalDrives).toFixed(1),
    qbRunsPerGame: +(qbDesignedCarries / trials).toFixed(1),
    compPct: passAtts ? +((100 * completions) / passAtts).toFixed(1) : 0,
    sackPct: passAtts + sacks ? +((100 * sacks) / (passAtts + sacks)).toFixed(1) : 0,
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
  const EXT_FRONTS: ExtendedDefFrontId[] = [...OPEN_FRONTS, 'NICKEL_QB_SPY_CONTAIN_C1'];
  const STD_DEF_WEIGHTS = OPEN_FRONTS.map((f) => LEAGUE_OPEN_DEF_WEIGHTS[f as ModernDefFrontId]);
  const EXT_STD_DEF_WEIGHTS = [...STD_DEF_WEIGHTS.map((w) => w * 0.88), 0.12];

  // High-precision sample counts to keep Monte Carlo SE tight (~0.04 EPA/play)
  const REPS_OPEN = 40;
  const REPS_CTX = 30;

  console.log('================================================================================================================');
  console.log(' QB ARCHETYPE SENSITIVITY & SHORTCOMINGS STUDY (BDB-2027 & NFLVERSE 2022-2024 CALIBRATED ENGINE)');
  console.log(' 7 Controlled QB Profiles x 4 Playbooks x Durability Caps x QB-Spy Counter x 2D Crossover Frontier');
  console.log('================================================================================================================\n');

  const omegaOpenPlays = OMEGA_2027_PLAYBOOK.filter((p) => p.id !== 'OMEGA_GOALLINE_SPRINT_SMASH');
  const omegaQbRunIdx = omegaOpenPlays
    .map((p, i) => (p.id === 'OMEGA_11V11_RHINO_PIN_PULL' ? i : -1))
    .filter((i) => i >= 0);

  const omegaPoolsCache: Record<string, { pool: Record<string, Record<string, SnapSample[]>>; glPool: Record<string, Record<string, SnapSample[]>>; oobPool: Record<string, Record<string, SnapSample[]>> }> = {};
  const omegaResults: Record<string, any> = {};

  // ---------------------------------------------------------------------------
  // PART 1: FULL 7-ARCHETYPE DEEP DIVE ON 2027 OMEGA CONTINUUM
  // ---------------------------------------------------------------------------
  console.log(`[PART 1] 2027 OMEGA CONTINUUM — 7 QB ARCHETYPES (N=${REPS_OPEN} snaps/play/front = ${REPS_OPEN * 10} snaps/play)`);
  for (const arch of QB_ARCHETYPES) {
    let pool: Record<string, Record<string, SnapSample[]>>;
    let glPool: Record<string, Record<string, SnapSample[]>>;
    let oobPool: Record<string, Record<string, SnapSample[]>>;

    if (arch.sharePhysicsWithId && omegaPoolsCache[arch.sharePhysicsWithId]) {
      // Exact same on-field physics pool -> cleanly isolates salary-cap delta with zero Monte Carlo drift
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
            pool[play.id][df].push(runSample(engine, off, buildExtendedDefense(df), fc));
          }
        }
        if (play.id === 'OMEGA_GOALLINE_SPRINT_SMASH' || play.id === 'OMEGA_11V11_RHINO_PIN_PULL') {
          glPool[play.id] = {};
          for (const df of ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ExtendedDefFrontId[]) {
            glPool[play.id][df] = [];
            for (let r = 0; r < REPS_CTX; r++) {
              const off = applyQbArchetype(play.buildOffense(), arch);
              glPool[play.id][df].push(
                runSample(engine, off, buildExtendedDefense(df), { yardLineToGoal: 4.0, sidelineObjective: 'NORMAL' })
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
                runSample(engine, off, buildExtendedDefense(df), { sidelineObjective: 'STOP_CLOCK_OOB' })
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
    const mat10 = omegaOpenPlays.map((p) =>
      EXT_FRONTS.map((df) => pool[p.id][df].reduce((a, b) => a + b.epa, 0) / pool[p.id][df].length)
    );

    const nashUnconstrained = solveZeroSumNash(mat9);
    const nashDurability25 = solveZeroSumNash(mat9, omegaQbRunIdx, 0.25);
    const nashDurability12 = solveZeroSumNash(mat9, omegaQbRunIdx, 0.12);
    const nashAntiMobileSpy = solveZeroSumNash(mat10, omegaQbRunIdx, 0.25);

    const openPlayIds = omegaOpenPlays.map((p) => p.id);
    const passThirdLongIds = ['OMEGA_3RD9_SWITCH_STICKS', 'OMEGA_ORBIT_GLANCE_FLOOD', 'OMEGA_2MIN_BOUNDARY_OOB'];
    const glIds = ['OMEGA_GOALLINE_SPRINT_SMASH', 'OMEGA_11V11_RHINO_PIN_PULL'];

    const offCapM = +(OMEGA_ACTIVE_11_CAP_M - 13.5 + arch.qbCapM - (arch.olRatingDelta < 0 ? 38.5 : 0)).toFixed(1);
    const defBonus = computeCapDefBonus(offCapM);

    // If sharing physics pool with a control, reuse exact simulated season metrics and only shift cap-derived Team Net Diff!
    const sharedRes = arch.sharePhysicsWithId ? omegaResults[arch.sharePhysicsWithId] : null;
    const seasonStdUncon = sharedRes
      ? sharedRes.seasons.stdUncon
      : simulateSeasonFromPool(openPlayIds, nashUnconstrained.offWeights, OPEN_FRONTS, STD_DEF_WEIGHTS, pool, passThirdLongIds, glIds, glPool, 800, false);
    const seasonNashUncon = sharedRes
      ? sharedRes.seasons.nashUncon
      : simulateSeasonFromPool(openPlayIds, nashUnconstrained.offWeights, OPEN_FRONTS, nashUnconstrained.defWeights, pool, passThirdLongIds, glIds, glPool, 800, false);
    const seasonNashDur25 = sharedRes
      ? sharedRes.seasons.nashDur25
      : simulateSeasonFromPool(openPlayIds, nashDurability25.offWeights, OPEN_FRONTS, nashDurability25.defWeights, pool, passThirdLongIds, glIds, glPool, 800, false);
    const seasonNashDur12 = sharedRes
      ? sharedRes.seasons.nashDur12
      : simulateSeasonFromPool(openPlayIds, nashDurability12.offWeights, OPEN_FRONTS, nashDurability12.defWeights, pool, passThirdLongIds, glIds, glPool, 800, false);
    const seasonSpyDur25 = sharedRes
      ? sharedRes.seasons.nashSpyDur25
      : simulateSeasonFromPool(openPlayIds, nashAntiMobileSpy.offWeights, EXT_FRONTS, nashAntiMobileSpy.defWeights, pool, passThirdLongIds, glIds, glPool, 800, false);
    const seasonPassForced = sharedRes
      ? sharedRes.seasons.passForcedTrail14
      : simulateSeasonFromPool(openPlayIds, nashDurability12.offWeights, EXT_FRONTS, EXT_STD_DEF_WEIGHTS, pool, passThirdLongIds, glIds, glPool, 800, true);

    const thirdAnd9 = sharedRes ? sharedRes.situational.thirdAnd9 : simulateThirdAndNine(['OMEGA_3RD9_SWITCH_STICKS', 'OMEGA_ORBIT_GLANCE_FLOOD'], pool, 1000);
    const twoMin = sharedRes ? sharedRes.situational.twoMin : simulateTwoMinuteDrill(['OMEGA_2MIN_BOUNDARY_OOB', 'OMEGA_3RD9_SWITCH_STICKS', 'OMEGA_ORBIT_GLANCE_FLOOD'], oobPool, 1000);
    const fourMin = sharedRes ? sharedRes.situational.fourMin : simulateFourMinuteDrill(['OMEGA_11V11_RHINO_PIN_PULL', 'OMEGA_CHIRAL_JET_OPTION'], pool, 1000);

    const perPlay: Record<string, any> = {};
    for (const p of OMEGA_2027_PLAYBOOK) {
      const allOpen = OPEN_FRONTS.flatMap((df) => pool[p.id][df]);
      const spySamples = pool[p.id]['NICKEL_QB_SPY_CONTAIN_C1'];
      perPlay[p.id] = {
        open9: summarizeSamples(allOpen),
        vsQbSpy: summarizeSamples(spySamples),
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
      nashDurability25: {
        epa: +nashDurability25.nashValue.toFixed(3),
        mix: Object.fromEntries(openPlayIds.map((id, i) => [id, +(nashDurability25.offWeights[i] * 100).toFixed(1)])),
      },
      nashDurability12: {
        epa: +nashDurability12.nashValue.toFixed(3),
        mix: Object.fromEntries(openPlayIds.map((id, i) => [id, +(nashDurability12.offWeights[i] * 100).toFixed(1)])),
      },
      nashAntiMobileSpyDur25: {
        epa: +nashAntiMobileSpy.nashValue.toFixed(3),
        spyDefSharePct: +(nashAntiMobileSpy.defWeights[EXT_FRONTS.length - 1] * 100).toFixed(1),
        mix: Object.fromEntries(openPlayIds.map((id, i) => [id, +(nashAntiMobileSpy.offWeights[i] * 100).toFixed(1)])),
      },
      seasons: {
        stdUncon: withNet(seasonStdUncon),
        nashUncon: withNet(seasonNashUncon),
        nashDur25: withNet(seasonNashDur25),
        nashDur12: withNet(seasonNashDur12),
        nashSpyDur25: withNet(seasonSpyDur25),
        passForcedTrail14: withNet(seasonPassForced),
      },
      situational: { thirdAnd9, twoMin, fourMin },
      perPlay,
    };

    const r = omegaResults[arch.id];
    const topOff = Object.entries(r.nashUnconstrained.mix as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k.replace('OMEGA_', '')}:${v}%`)
      .join(', ');
    const topDef = Object.entries(r.nashUnconstrained.defMix as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k, v]) => `${k}:${v}%`)
      .join(', ');
    console.log(
      `  ${arch.id.padEnd(24)} | Cap=$${offCapM.toFixed(1)}M (Def ${defBonus >= 0 ? '+' : ''}${defBonus}) | ` +
        `NashUncon=${r.nashUnconstrained.epa >= 0 ? '+' : ''}${r.nashUnconstrained.epa.toFixed(3)} (${r.nashUnconstrained.qbRunSharePct}% QBR) | ` +
        `Nash<=25%=${r.nashDurability25.epa >= 0 ? '+' : ''}${r.nashDurability25.epa.toFixed(3)} | ` +
        `Nash<=12%=${r.nashDurability12.epa >= 0 ? '+' : ''}${r.nashDurability12.epa.toFixed(3)} | ` +
        `NashSpy=${r.nashAntiMobileSpyDur25.epa >= 0 ? '+' : ''}${r.nashAntiMobileSpyDur25.epa.toFixed(3)}`
    );
    console.log(
      `     Mix: [${topOff}] vs DC [${topDef}] | RhinoEPA=${r.perPlay.OMEGA_11V11_RHINO_PIN_PULL.open9.meanEpa >= 0 ? '+' : ''}${r.perPlay.OMEGA_11V11_RHINO_PIN_PULL.open9.meanEpa} (vsSpy=${r.perPlay.OMEGA_11V11_RHINO_PIN_PULL.vsQbSpy.meanEpa >= 0 ? '+' : ''}${r.perPlay.OMEGA_11V11_RHINO_PIN_PULL.vsQbSpy.meanEpa})`
    );
    console.log(
      `     PPG: Std=${r.seasons.stdUncon.ppg} (Net ${r.seasons.stdUncon.teamNetDiff >= 0 ? '+' : ''}${r.seasons.stdUncon.teamNetDiff}) | ` +
        `NashUncon=${r.seasons.nashUncon.ppg} (Net ${r.seasons.nashUncon.teamNetDiff >= 0 ? '+' : ''}${r.seasons.nashUncon.teamNetDiff}, ${r.seasons.nashUncon.qbRunsPerGame} QBR/g) | ` +
        `Nash<=12%=${r.seasons.nashDur12.ppg} (Net ${r.seasons.nashDur12.teamNetDiff >= 0 ? '+' : ''}${r.seasons.nashDur12.teamNetDiff}, ${r.seasons.nashDur12.qbRunsPerGame} QBR/g) | ` +
        `Trail14Pass=${r.seasons.passForcedTrail14.ppg} (Comp ${r.seasons.passForcedTrail14.compPct}%, Sack ${r.seasons.passForcedTrail14.sackPct}%, INT ${r.seasons.passForcedTrail14.intPct}%)`
    );
    console.log(
      `     Drills: 3rd&9 Conv=${thirdAnd9.convPct}% EPA=${thirdAnd9.meanEpa >= 0 ? '+' : ''}${thirdAnd9.meanEpa} Sack=${thirdAnd9.sackPct}% INT=${thirdAnd9.intPct}% | ` +
        `2Min TD=${twoMin.tdWinPct}% Sack=${twoMin.sackPct}% INT=${twoMin.intPct}% | ` +
        `4Min Seal=${fourMin.sealPct}%`
    );
  }

  // ---------------------------------------------------------------------------
  // PART 2: PLAYBOOK x QB ARCHETYPE MATRIX (5 PLAYBOOK MODES x 6 QBs)
  // ---------------------------------------------------------------------------
  console.log('\n[PART 2] PLAYBOOK x QB ARCHETYPE MATRIX (Nash EPA / Play, Nash PPG & Cap-Adjusted Team Net +/-)');
  const coreQbs = QB_ARCHETYPES.filter((q) => q.id !== 'ELITE_POCKET_52M_SQUEEZE');
  const playbookMatrix: Record<string, Record<string, any>> = {
    OMEGA_2027_UNCON: {},
    OMEGA_2027_CAP12QBR: {},
    APEX_2027_UNCON: {},
    SHANAHAN_12_PA: {},
    CONV_11_SPREAD: {},
  };

  for (const arch of coreQbs) {
    playbookMatrix.OMEGA_2027_UNCON[arch.id] = {
      nashEpa: omegaResults[arch.id].nashUnconstrained.epa,
      nashPpg: omegaResults[arch.id].seasons.nashUncon.ppg,
      teamNetDiff: omegaResults[arch.id].seasons.nashUncon.teamNetDiff,
      qbRunsPerGame: omegaResults[arch.id].seasons.nashUncon.qbRunsPerGame,
    };
    playbookMatrix.OMEGA_2027_CAP12QBR[arch.id] = {
      nashEpa: omegaResults[arch.id].nashDurability12.epa,
      nashPpg: omegaResults[arch.id].seasons.nashDur12.ppg,
      teamNetDiff: omegaResults[arch.id].seasons.nashDur12.teamNetDiff,
      qbRunsPerGame: omegaResults[arch.id].seasons.nashDur12.qbRunsPerGame,
    };
  }

  // Evaluate APEX_2027 across coreQbs
  const apexOpenPlays = APEX_2027_PLAYBOOK.filter((p) => p.id !== 'APEX_GOALLINE_SPRINT_SMASH');
  const apexCache: Record<string, { nashEpa: number; sea: any }> = {};
  for (const arch of coreQbs) {
    const offCapM = +(APEX_ACTIVE_11_CAP_M - 13.5 + arch.qbCapM).toFixed(1);
    const defBonus = computeCapDefBonus(offCapM);
    if (arch.sharePhysicsWithId && apexCache[arch.sharePhysicsWithId]) {
      const c = apexCache[arch.sharePhysicsWithId];
      playbookMatrix.APEX_2027_UNCON[arch.id] = {
        nashEpa: c.nashEpa,
        nashPpg: c.sea.ppg,
        teamNetDiff: +(c.sea.ppg - (22.4 - defBonus)).toFixed(2),
        qbRunsPerGame: c.sea.qbRunsPerGame,
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
          apPool[play.id][df].push(runSample(engine, off, buildExtendedDefense(df), fc));
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
      600,
      false
    );
    const nashEpa = +nash.nashValue.toFixed(3);
    apexCache[arch.id] = { nashEpa, sea };
    playbookMatrix.APEX_2027_UNCON[arch.id] = {
      nashEpa,
      nashPpg: sea.ppg,
      teamNetDiff: +(sea.ppg - (22.4 - defBonus)).toFixed(2),
      qbRunsPerGame: sea.qbRunsPerGame,
    };
  }

  // Evaluate SHANAHAN_12_PA and CONV_11_SPREAD across coreQbs
  for (const baseId of ['SHANAHAN_12_PA', 'CONV_11_SPREAD'] as const) {
    const baseProf = BASELINE_PHILOSOPHIES.find((p) => p.id === baseId)!;
    const baseCache: Record<string, { nashEpa: number; sea: any }> = {};
    // Union of openFieldPlays and thirdLongPlays so thirdLongPlays (e.g., MESH in SHANAHAN_12_PA) are always populated!
    const allNeededPlays = Array.from(new Set<CanonicalPlayId>([...baseProf.openFieldPlays, ...baseProf.thirdLongPlays]));

    for (const arch of coreQbs) {
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
            bPool[pid][df].push(runSample(engine, buildBaselinePlay(modProf, pid), buildExtendedDefense(df)));
          }
        }
      }
      for (const pid of baseProf.goalLinePlays) {
        bGlPool[pid] = {};
        for (const df of ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ExtendedDefFrontId[]) {
          bGlPool[pid][df] = [];
          for (let r = 0; r < 18; r++) {
            bGlPool[pid][df].push(
              runSample(engine, buildBaselinePlay(modProf, pid), buildExtendedDefense(df), {
                yardLineToGoal: 4.0,
                sidelineObjective: 'NORMAL',
              })
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
        600,
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
        intPct: sea.intPct,
      };
    }
  }

  for (const [schemeName, row] of Object.entries(playbookMatrix)) {
    console.log(`  ${schemeName}:`);
    for (const q of coreQbs) {
      const d = row[q.id];
      const extra = d.compPct !== undefined ? ` | Comp=${d.compPct}% Sack=${d.sackPct}% INT=${d.intPct}%` : ` | QBR/g=${d.qbRunsPerGame}`;
      console.log(
        `    ${q.id.padEnd(23)} => NashEPA=${d.nashEpa >= 0 ? '+' : ''}${d.nashEpa.toFixed(3)} | NashPPG=${d.nashPpg.toFixed(2)} | TeamNet=${d.teamNetDiff >= 0 ? '+' : ''}${d.teamNetDiff.toFixed(2)}${extra}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // PART 3: 2D SENSITIVITY FRONTIER SWEEP (PASSING FIN=AWR vs MOBILITY SPD)
  // ---------------------------------------------------------------------------
  console.log('\n[PART 3] 2D CROSSOVER FRONTIER: PASSING (FIN=AWR) x MOBILITY (SPD/ACC)');
  const passTiers = [76, 82, 88, 95];
  const spdTiers = [72, 78, 84, 90];
  const frontierOmegaUncon: Record<string, Record<string, number>> = {};
  const frontierOmegaCap15: Record<string, Record<string, number>> = {};
  const frontierConv11: Record<string, Record<string, number>> = {};
  const convProf = BASELINE_PHILOSOPHIES.find((p) => p.id === 'CONV_11_SPREAD')!;
  const sweepFronts: ExtendedDefFrontId[] = [
    'NICKEL_OVER_C3',
    'NICKEL_UNDER_C1',
    'NICKEL_SIM_C2',
    'BASE_34_BEAR_C4',
    'DIME_MUG_C0',
    'DIME_QUARTERS_MATCH',
    'VIKINGS_SAFETY_BLITZ_C1',
  ];
  const SWEEP_REPS = 20;

  for (const pTier of passTiers) {
    frontierOmegaUncon[String(pTier)] = {};
    frontierOmegaCap15[String(pTier)] = {};
    frontierConv11[String(pTier)] = {};
    for (const sTier of spdTiers) {
      const arch: QbArchetypeSpec = {
        id: `P${pTier}_S${sTier}`,
        label: `FIN/AWR=${pTier} SPD=${sTier}`,
        qbCapM: 13.5,
        olRatingDelta: 0,
        ratings: {
          speed: sTier,
          accel: Math.min(95, sTier + 2),
          power: Math.round(72 + (sTier - 72) * 0.78),
          finesse: pTier,
          awareness: pTier,
        },
        empiricalNflComp: '',
      };
      const oMat = omegaOpenPlays.map((p) =>
        sweepFronts.map((df) => {
          const fc: SimFieldContext | undefined =
            p.id === 'OMEGA_11V11_RHINO_PIN_PULL' ? { sidelineObjective: 'STAY_INBOUNDS' } : undefined;
          let sum = 0;
          for (let r = 0; r < SWEEP_REPS; r++) {
            sum += runSample(engine, applyQbArchetype(p.buildOffense(), arch), buildExtendedDefense(df), fc).epa;
          }
          return sum / SWEEP_REPS;
        })
      );
      const nUncon = solveZeroSumNash(oMat, [], 1.0, 4000);
      const nCap15 = solveZeroSumNash(oMat, omegaQbRunIdx, 0.15, 4000);
      frontierOmegaUncon[String(pTier)][String(sTier)] = +nUncon.nashValue.toFixed(3);
      frontierOmegaCap15[String(pTier)][String(sTier)] = +nCap15.nashValue.toFixed(3);

      const cProf: BaselineRosterProfile = { ...convProf, qb: { ...arch.ratings } };
      const cMat = convProf.openFieldPlays.map((pid) =>
        sweepFronts.map((df) => {
          let sum = 0;
          for (let r = 0; r < SWEEP_REPS; r++) {
            sum += runSample(engine, buildBaselinePlay(cProf, pid), buildExtendedDefense(df)).epa;
          }
          return sum / SWEEP_REPS;
        })
      );
      const nConv = solveZeroSumNash(cMat, [], 1.0, 4000);
      frontierConv11[String(pTier)][String(sTier)] = +nConv.nashValue.toFixed(3);
    }
    console.log(
      `  FIN/AWR=${pTier} | OMEGA(Uncon): ${spdTiers.map((s) => `S${s}=${frontierOmegaUncon[pTier][s].toFixed(3)}`).join(' ')} | ` +
        `OMEGA(<=15%QBR): ${spdTiers.map((s) => `S${s}=${frontierOmegaCap15[pTier][s].toFixed(3)}`).join(' ')} | ` +
        `CONV11: ${spdTiers.map((s) => `S${s}=${frontierConv11[pTier][s].toFixed(3)}`).join(' ')}`
    );
  }

  const out = {
    generatedAt: new Date().toISOString(),
    methodologyNote:
      'BDB-2027 & nflverse 2022-2024 calibrated 20 Hz engine. N=40 snaps/play/front in Part 1, N=24 in Part 2, N=20 in 2D frontier. ELITE_POCKET_52M shares exact physics pool with ELITE_POCKET_13M_CTRL to isolate salary-cap delta with zero Monte Carlo noise. Includes durability caps (<=25%, <=12% QB run share), anti-mobile NICKEL_QB_SPY_CONTAIN_C1 stress front, and pass-forced trailing-by-14 script.',
    empiricalNfl2022_2024Benchmarks: {
      elitePocketPassers: {
        qbs: ['B.Purdy', 'C.Stroud', 'D.Prescott', 'J.Burrow', 'J.Goff', 'J.Herbert', 'K.Cousins', 'M.Stafford', 'T.Tagovailoa'],
        dropbacks: 14747, compPct: 67.0, cpoe: 1.60, intPct: 1.95, sackPct: 5.80, tttSec: 2.64,
        allDbEpa: 0.117, purePassSackEpa: 0.106, manEpa: 0.134, third7PlusEpa: 0.060, twoMinEpa: 0.077, trail8PlusEpa: 0.047,
        scramblePct: 3.2, scrambleEpa: 0.448, designedQbRushPerGame: 0.16, designedQbRushEpa: 0.041,
      },
      eliteDualThreatSupermax: {
        qbs: ['J.Allen', 'J.Hurts', 'L.Jackson', 'P.Mahomes'],
        dropbacks: 8013, compPct: 66.3, cpoe: 3.42, intPct: 1.84, sackPct: 5.27, tttSec: 2.82,
        allDbEpa: 0.179, purePassSackEpa: 0.138, manEpa: 0.198, third7PlusEpa: 0.093, twoMinEpa: 0.180, trail8PlusEpa: 0.266,
        scramblePct: 7.9, scrambleEpa: 0.658, designedQbRushPerGame: 2.63, designedQbRushEpa: 0.270,
      },
      midTierMobileQbs: {
        qbs: ['A.Richardson', 'C.Williams', 'D.Jones', 'G.Smith', 'J.Daniels', 'J.Fields', 'K.Murray', 'R.Wilson', 'T.Lawrence'],
        dropbacks: 10623, compPct: 64.8, cpoe: 1.31, intPct: 2.04, sackPct: 7.44, tttSec: 2.72,
        allDbEpa: 0.016, purePassSackEpa: -0.024, manEpa: 0.005, third7PlusEpa: -0.191, twoMinEpa: 0.034, trail8PlusEpa: 0.023,
        scramblePct: 6.8, scrambleEpa: 0.567, designedQbRushPerGame: 1.98, designedQbRushEpa: 0.177,
      },
      rawRunFirstMobile: {
        qbs: ['A.Richardson', 'D.Jones', 'J.Fields'],
        dropbacks: 2741, compPct: 61.7, cpoe: -1.09, intPct: 2.37, sackPct: 9.01, tttSec: 2.85,
        allDbEpa: -0.041, purePassSackEpa: -0.108, manEpa: 0.008, third7PlusEpa: -0.155, twoMinEpa: -0.061, trail8PlusEpa: -0.074,
        scramblePct: 9.3, scrambleEpa: 0.618, designedQbRushPerGame: 3.85, designedQbRushEpa: 0.192,
      },
      midTierPocketQbs: {
        qbs: ['A.Rodgers', 'B.Mayfield', 'B.Young', 'D.Carr', 'K.Pickett', 'M.Jones', 'W.Levis'],
        dropbacks: 8212, compPct: 63.7, cpoe: -0.35, intPct: 2.27, sackPct: 6.67, tttSec: 2.63,
        allDbEpa: -0.016, purePassSackEpa: -0.034, manEpa: 0.001, third7PlusEpa: -0.105, twoMinEpa: -0.018, trail8PlusEpa: -0.063,
        scramblePct: 4.2, scrambleEpa: 0.404, designedQbRushPerGame: 0.21, designedQbRushEpa: -0.243,
      },
    },
    omegaDeepDive: omegaResults,
    playbookByQbMatrix: playbookMatrix,
    sensitivityFrontier2D: {
      passTiersFinEqAwr: passTiers,
      spdTiers,
      omegaUnconstrainedNashEpa: frontierOmegaUncon,
      omegaDurabilityCap15NashEpa: frontierOmegaCap15,
      conv11SpreadNashEpa: frontierConv11,
    },
  };

  const outPath = path.join(process.cwd(), 'src', 'data', 'qb_archetype_sensitivity_report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\n[Saved] QB Archetype Sensitivity Report written to: ${outPath}`);
}

runQbArchetypeSensitivityStudy();
