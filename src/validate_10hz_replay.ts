import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import {
  All22KinematicEngine,
  PlayTickSnapshot,
  SimAgent,
  SimFieldContext,
} from './engine';
import {
  BASELINE_PHILOSOPHIES,
  CanonicalPlayId,
  LEAGUE_OPEN_DEF_WEIGHTS,
  buildBaselinePlay,
} from './canonical_baselines';
import {
  MODERN_2027_DEF_FRONTS,
  ModernDefFrontId,
  HYDRA_2027_PLAYBOOK,
  buildModern2027Defense,
} from './vanguard_2027_playbook';
import { ARGON_2027_PLAYBOOK } from './argon_2027_playbook';
import { APEX_2027_PLAYBOOK } from './apex_2027_playbook';
import { OMEGA_2027_PLAYBOOK } from './ultimate_2027_offense';

// ============================================================================
// TYPES & EMPIRICAL BENCHMARK STRUCTURES
// ============================================================================
interface Quantiles {
  n: number;
  mean: number;
  std: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface DropbackBenchmark {
  n: number;
  compPctOnAtt: number | null;
  sackPct: number | null;
  intPctOnAtt: number | null;
  intPctOnDb: number | null;
  pressurePct: number | null;
  blitzPct: number | null;
  explosive15Pct: number | null;
  epaSuccessPct: number | null;
  meanYardsPerDb: number | null;
  meanEpa: number | null;
  meanAirYards: number | null;
  meanYacOnComp: number | null;
  timeToThrow?: Quantiles;
  meanPassRushers?: number | null;
  sharePct?: number;
}

interface RushBenchmark {
  n: number;
  meanYards: number | null;
  medianYards: number | null;
  stuffPct: number | null;
  successPct: number | null;
  explosive15Pct: number | null;
  meanEpa: number | null;
}

interface AutopsyBenchmark {
  gameId: string;
  label: string;
  offense: string;
  defense: string;
  finalScore: string;
  dropbacksAll: DropbackBenchmark;
  dropbacksVsBlitz: DropbackBenchmark;
  dropbacksVsNonBlitz: DropbackBenchmark;
  designedRushes: RushBenchmark;
  coverageCounts: Record<string, number>;
}

interface BenchmarksPayload {
  metadata: Record<string, unknown>;
  train_2022_2023: {
    dropbacks: Record<string, DropbackBenchmark>;
    rushes: Record<string, RushBenchmark>;
    coverage: {
      manVsZone: Record<'MAN_COVERAGE' | 'ZONE_COVERAGE', DropbackBenchmark>;
      byCoverageType: Record<string, DropbackBenchmark>;
    };
    goalLineLe5Yd: Record<string, unknown>;
  };
  heldOut_2024: {
    dropbacks: Record<string, DropbackBenchmark>;
    rushes: Record<string, RushBenchmark>;
    coverage: {
      manVsZone: Record<'MAN_COVERAGE' | 'ZONE_COVERAGE', DropbackBenchmark>;
      byCoverageType: Record<string, DropbackBenchmark>;
    };
    goalLineLe5Yd: Record<string, unknown>;
  };
  ngsKinematics_2022_2023: {
    passingWeekly: Record<string, Quantiles>;
    receivingWeekly: Record<string, Quantiles>;
    rushingWeekly: Record<string, Quantiles>;
    team2023Profiles: Record<string, Record<string, number>>;
  };
  autopsyGames: AutopsyBenchmark[];
}

type CoarseCoverage = 'MAN_COVERAGE' | 'ZONE_COVERAGE';
type ShellType = 'COVER_0' | 'COVER_1' | 'COVER_2' | 'COVER_3' | 'COVER_4';
type BoxBucket = 'LIGHT_LE6' | 'NORMAL_7' | 'HEAVY_GE8';

interface PlayTelemetry {
  weight: number;
  isPass: boolean;
  isPlayAction: boolean;
  isRun: boolean;
  passRushers: number;
  isBlitz: boolean;
  boxCount: number;
  boxBucket: BoxBucket;
  shell: ShellType;
  coarseCov: CoarseCoverage;
  completed: boolean;
  intercepted: boolean;
  sack: boolean;
  pressured: boolean;
  touchdown: boolean;
  timeToThrowSec: number | null;
  ballFlightDurationSec: number | null;
  timeToPressureSec: number | null;
  pocketIntegrityMin: number;
  separationAtThrowYds: number | null;
  separationAtArrivalYds: number | null;
  preSnapCushionYds: number | null;
  airYards: number | null;
  yacYards: number | null;
  yards: number;
  epa: number;
  rushYardsToFirstContact: number | null;
  olEngagedRate: number;
  legalAll: boolean;
  maxUnengagedGForce: number;
  minPlayerSepYds: number;
}

interface AggregatedPassMetrics {
  n: number;
  compPct: number;
  sackPct: number;
  pressurePct: number;
  intPctOnAtt: number;
  intPctOnDb: number;
  explosive15Pct: number;
  epaSuccessPct: number;
  meanYardsPerDb: number;
  meanEpa: number;
  meanAirYards: number;
  meanYacOnComp: number;
  tttMean: number;
  tttP25: number;
  tttP50: number;
  tttP75: number;
  flightDurationMean: number;
  sepAtThrowMean: number;
  sepAtArrivalMean: number;
  preSnapCushionMean: number;
  timeToPressureMean: number;
  olEngagedRateMean: number;
}

interface AggregatedRushMetrics {
  n: number;
  meanYards: number;
  medianYards: number;
  stuffPct: number;
  successPct: number;
  explosive15Pct: number;
  meanEpa: number;
  yardsToContactMean: number;
}

// ============================================================================
// UTILITY MATH & TELEMETRY AGGREGATION
// ============================================================================
const RUSH_DEF_ROLES = new Set([
  'RUSH_GAP',
  'CONTAIN_EDGE',
  'BLITZ_A',
  'BLITZ_EDGE',
  'BLITZ_RUN_GAP',
  'CROSS_DOG',
  'BLITZ_EDGE_CRASH',
  'SPILL',
]);

function weightedMean(items: { v: number; w: number }[]): number {
  let num = 0;
  let den = 0;
  for (const it of items) {
    num += it.v * it.w;
    den += it.w;
  }
  return den > 0 ? num / den : 0;
}

function weightedQuantile(items: { v: number; w: number }[], q: number): number {
  if (items.length === 0) return 0;
  const sorted = [...items].sort((a, b) => a.v - b.v);
  const totalW = sorted.reduce((acc, it) => acc + it.w, 0);
  if (totalW <= 0) return sorted[0].v;
  let acc = 0;
  for (const it of sorted) {
    acc += it.w;
    if (acc / totalW >= q) return it.v;
  }
  return sorted[sorted.length - 1].v;
}

function classifyDefenseFromSnap(snap0: PlayTickSnapshot): {
  passRushers: number;
  boxCount: number;
  boxBucket: BoxBucket;
  shell: ShellType;
  coarseCov: CoarseCoverage;
} {
  const defs = snap0.agents.filter((a) => a.side === 'DEF');
  let passRushers = 0;
  let boxCount = 0;
  let manCount = 0;
  let deepZone = 0;
  let deepHalf = 0;
  let deepThird = 0;
  let quarters = 0;
  let downDlBox = 0;

  for (const d of defs) {
    const r = d.defAssignment?.role ?? '';
    if (RUSH_DEF_ROLES.has(r)) passRushers++;
    const isDownDl = ['DE', 'DT', 'NT', 'EDGE', 'LOLB', 'ROLB'].includes(d.pos) && d.y <= 1.2;
    if (isDownDl) downDlBox++;
    if (Math.abs(d.x) <= 6.0 && d.y <= 5.5) {
      boxCount++;
    }
    if (r === 'MAN_COV') manCount++;
    else if (r === 'DEEP_ZONE') deepZone++;
    else if (r === 'DEEP_HALF') deepHalf++;
    else if (r === 'DEEP_THIRD') deepThird++;
    else if (r === 'QUARTERS_MATCH') quarters++;
  }

  let shell: ShellType = 'COVER_3';
  if (quarters >= 3) shell = 'COVER_4';
  else if (manCount >= 2 && deepZone >= 1 && deepThird === 0) shell = 'COVER_1';
  else if (manCount >= 3 && deepHalf >= 2) shell = 'COVER_1';
  else if (deepHalf >= 2) shell = 'COVER_2';
  else if (deepThird >= 2) shell = 'COVER_3';
  else if (manCount >= 2 && deepZone === 0 && deepHalf === 0 && deepThird === 0 && quarters === 0) shell = 'COVER_0';
  else if (manCount >= 4 && deepZone === 0) shell = 'COVER_0';

  const coarseCov: CoarseCoverage =
    shell === 'COVER_0' || shell === 'COVER_1' ? 'MAN_COVERAGE' : 'ZONE_COVERAGE';
  const boxBucket: BoxBucket =
    boxCount <= 6 ? 'LIGHT_LE6' : (boxCount >= 8 || downDlBox >= 5) ? 'HEAVY_GE8' : 'NORMAL_7';

  return { passRushers, boxCount, boxBucket, shell, coarseCov };
}

function simulatePlayWithTelemetry(
  engine: All22KinematicEngine,
  offAgents: SimAgent[],
  defAgents: SimAgent[],
  weight = 1.0,
  fieldContext?: SimFieldContext
): PlayTelemetry {
  const olPos = ['LT', 'LG', 'C', 'RG', 'RT'];
  const onLos = offAgents
    .filter((a) => a.startY >= -0.55 && a.startY <= -0.15)
    .sort((a, b) => a.startX - b.startX);
  const legal7OnLos = onLos.length >= 7;
  const legalUncoveredEnds =
    onLos.length >= 7 &&
    !olPos.includes(onLos[0].pos) &&
    !olPos.includes(onLos[onLos.length - 1].pos);

  const qbInit = offAgents.find((a) => a.pos === 'QB' || a.assignment.role === 'QB_DROP');
  const rbCarrierInit = offAgents.find((a) => a.assignment.role === 'BALL_CARRIER');
  const isPlayAction = Boolean(qbInit?.playAction?.enabled);
  const isRun = Boolean(rbCarrierInit) && !qbInit?.playAction?.enabled && offAgents.filter((a) => a.assignment.role === 'ROUTE').length <= 1;
  const isPass = !isRun;

  const traj = engine.simulatePlay([...offAgents, ...defAgents], 1.0, fieldContext);
  const snap0 = traj[0];
  const term = traj.find((s) => s.playOver) || traj[traj.length - 1];
  const defClass = classifyDefenseFromSnap(snap0);

  // Pre-snap cushion across outer/slot receivers vs aligned coverage DB
  const wrPositions = new Set(['WR', 'WR1', 'WR2', 'SL', 'SLOT']);
  const dbPositions = new Set(['CB', 'CB1', 'CB2', 'NCB', 'NI', 'NB', 'FS', 'SS', 'DB']);
  const recIds0 = snap0.agents
    .filter((a) => a.side === 'OFF' && wrPositions.has(a.pos.toUpperCase()) && (a.assignment.role === 'ROUTE' || a.assignment.role === 'CHIP_RELEASE'))
    .map((r) => {
      let minAlignedD = 99;
      let minAnyDbD = 99;
      for (const d of snap0.agents) {
        if (d.side !== 'DEF' || !dbPositions.has(d.pos.toUpperCase()) || d.y <= r.y) continue;
        const dist = Math.hypot(d.x - r.x, d.y - r.y);
        if (dist < minAnyDbD) minAnyDbD = dist;
        if (Math.abs(d.x - r.x) <= 5.5 && dist < minAlignedD) minAlignedD = dist;
      }
      return minAlignedD < 99 ? minAlignedD : minAnyDbD;
    })
    .filter((d) => d < 99);
  const preSnapCushionYds =
    recIds0.length > 0 ? recIds0.reduce((a, b) => a + b, 0) / recIds0.length : null;

  let minPocket = 100;
  let timeToFirstPressureSec: number | null = null;
  let throwSnap: PlayTickSnapshot | null = null;
  let arrivalSnap: PlayTickSnapshot | null = null;
  let legalIneligibleOlBuffer = true;
  let legalBackwardLateralsOnly = true;
  let maxUnengagedGForce = 0;
  let minPlayerSepYds = 99;
  let rushYardsToFirstContact: number | null = null;
  let olEngagedTicks = 0;
  let olTotalTicks = 0;

  for (let i = 0; i < traj.length; i++) {
    const snap = traj[i];
    if (snap.pocketIntegrity < minPocket) minPocket = snap.pocketIntegrity;
    if (timeToFirstPressureSec === null && snap.timeSec >= 0.65 && (snap.pocketIntegrity < 52 || snap.terminationReason === 'SACK')) {
      timeToFirstPressureSec = snap.timeSec;
    }

    const prevSnap = i > 0 ? traj[i - 1] : null;
    const prevBall = prevSnap?.ball;
    if (
      throwSnap === null &&
      snap.ball?.state === 'IN_FLIGHT' &&
      !snap.ball.isLateral &&
      prevBall?.state !== 'IN_FLIGHT'
    ) {
      throwSnap = snap;
      const olAgents = snap.agents.filter((a) => a.side === 'OFF' && olPos.includes(a.pos));
      for (const ol of olAgents) {
        if (ol.y > 1.05) legalIneligibleOlBuffer = false;
      }
      if ((snap.ball.launchY ?? 0) > 0.05) legalIneligibleOlBuffer = false;
    }
    if (throwSnap !== null && arrivalSnap === null && snap.ball?.state !== 'IN_FLIGHT') {
      arrivalSnap = snap;
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

    // Track OL block engagement up to throw/crossing LOS
    if (snap.timeSec <= 2.4 && !throwSnap) {
      for (const a of snap.agents) {
        if (a.side === 'OFF' && olPos.includes(a.pos)) {
          olTotalTicks++;
          if (a.engagedWithId) olEngagedTicks++;
        }
      }
    }

    if (isRun && rushYardsToFirstContact === null && snap.ball?.carrierId) {
      const carrier = snap.agents.find((a) => a.id === snap.ball?.carrierId);
      if (carrier) {
        for (const d of snap.agents) {
          if (d.side !== 'DEF') continue;
          if (Math.hypot(d.x - carrier.x, d.y - carrier.y) <= 1.4) {
            rushYardsToFirstContact = carrier.y;
            break;
          }
        }
      }
    }

    if (prevSnap) {
      const prevMap = new Map(prevSnap.agents.map((a) => [a.id, a]));
      for (const ag of snap.agents) {
        const pAg = prevMap.get(ag.id);
        if (pAg && !ag.engagedWithId && !pAg.engagedWithId) {
          const dv = Math.hypot(ag.vx - pAg.vx, ag.vy - pAg.vy);
          const g = dv / (0.05 * 10.72);
          if (g > maxUnengagedGForce) maxUnengagedGForce = g;
        }
      }
    }
    for (let u = 0; u < snap.agents.length; u++) {
      for (let v = u + 1; v < snap.agents.length; v++) {
        const d = Math.hypot(snap.agents[u].x - snap.agents[v].x, snap.agents[u].y - snap.agents[v].y);
        if (d < minPlayerSepYds) minPlayerSepYds = d;
      }
    }
  }

  let separationAtThrowYds: number | null = null;
  let separationAtArrivalYds: number | null = null;
  let airYards: number | null = null;
  const ballFlightDurationSec = throwSnap?.ball?.flightDurationSec ?? null;
  if (throwSnap && throwSnap.ball?.targetReceiverId) {
    const tid = throwSnap.ball.targetReceiverId;
    const rec = throwSnap.agents.find((a) => a.id === tid);
    airYards = throwSnap.ball.targetY ?? (rec ? rec.y : null);
    if (rec) {
      let distAtThrow = 99;
      for (const d of throwSnap.agents) {
        if (d.side !== 'DEF') continue;
        const dist = Math.hypot(d.x - rec.x, d.y - rec.y);
        if (dist < distAtThrow) distAtThrow = dist;
      }
      let distAtArrival = 99;
      const recArr = arrivalSnap?.agents.find((a) => a.id === tid);
      if (arrivalSnap && recArr) {
        for (const d of arrivalSnap.agents) {
          if (d.side !== 'DEF') continue;
          const dist = Math.hypot(d.x - recArr.x, d.y - recArr.y);
          if (dist < distAtArrival) distAtArrival = dist;
        }
      }
      if (distAtThrow < 99) separationAtThrowYds = +distAtThrow.toFixed(3);
      if (distAtArrival < 99) separationAtArrivalYds = +distAtArrival.toFixed(3);
    }
  }

  const fallbackCarrier = term.agents.find(
    (a) => a.side === 'OFF' && (a.id === term.ball?.carrierId || a.assignment.role === 'BALL_CARRIER')
  );
  const yards =
    term.carrierTackledYards ??
    (term.ball?.state === 'HELD' && fallbackCarrier ? +fallbackCarrier.y.toFixed(2) : 0);

  const sack = term.terminationReason === 'SACK';
  const intercepted = term.terminationReason === 'INTERCEPTION';
  const completed =
    (Boolean(term.ball?.completedPass) ||
      term.terminationReason === 'COMPLETE' ||
      term.ball?.state === 'CAUGHT') &&
    !intercepted &&
    !sack;
  const touchdown = term.terminationReason === 'TOUCHDOWN';
  const pressured = sack || minPocket < 48;
  const timeToThrowSec = throwSnap ? throwSnap.timeSec : sack ? term.timeSec : null;
  const yacYards =
    completed && airYards !== null ? Math.max(0, yards - airYards) : null;

  return {
    weight,
    isPass,
    isPlayAction,
    isRun,
    passRushers: defClass.passRushers,
    isBlitz: defClass.passRushers >= 5,
    boxCount: defClass.boxCount,
    boxBucket: defClass.boxBucket,
    shell: defClass.shell,
    coarseCov: defClass.coarseCov,
    completed,
    intercepted,
    sack,
    pressured,
    touchdown,
    timeToThrowSec,
    ballFlightDurationSec,
    timeToPressureSec: timeToFirstPressureSec,
    pocketIntegrityMin: minPocket,
    separationAtThrowYds,
    separationAtArrivalYds,
    preSnapCushionYds,
    airYards,
    yacYards,
    yards,
    epa: term.expectedEpa,
    rushYardsToFirstContact,
    olEngagedRate: olTotalTicks > 0 ? olEngagedTicks / olTotalTicks : 0,
    legalAll: legal7OnLos && legalUncoveredEnds && legalIneligibleOlBuffer && legalBackwardLateralsOnly,
    maxUnengagedGForce: +maxUnengagedGForce.toFixed(3),
    minPlayerSepYds: +minPlayerSepYds.toFixed(3),
  };
}

function aggregatePass(rows: PlayTelemetry[]): AggregatedPassMetrics {
  const dropbacks = rows;
  const totalW = dropbacks.reduce((a, b) => a + b.weight, 0);
  const attempts = dropbacks.filter((r) => !r.sack);
  const attW = attempts.reduce((a, b) => a + b.weight, 0);
  const comps = attempts.filter((r) => r.completed);
  const compW = comps.reduce((a, b) => a + b.weight, 0);
  const sacksW = dropbacks.filter((r) => r.sack).reduce((a, b) => a + b.weight, 0);
  const pressW = dropbacks.filter((r) => r.pressured).reduce((a, b) => a + b.weight, 0);
  const intW = attempts.filter((r) => r.intercepted).reduce((a, b) => a + b.weight, 0);
  const expl15W = dropbacks.filter((r) => r.yards >= 15).reduce((a, b) => a + b.weight, 0);
  const succW = dropbacks.filter((r) => r.epa > 0).reduce((a, b) => a + b.weight, 0);

  const tttItems = dropbacks
    .filter((r) => r.timeToThrowSec !== null)
    .map((r) => ({ v: r.timeToThrowSec as number, w: r.weight }));
  const fltItems = dropbacks
    .filter((r) => r.ballFlightDurationSec !== null)
    .map((r) => ({ v: r.ballFlightDurationSec as number, w: r.weight }));
  const sepItems = dropbacks
    .filter((r) => r.separationAtThrowYds !== null)
    .map((r) => ({ v: r.separationAtThrowYds as number, w: r.weight }));
  const sepArrItems = dropbacks
    .filter((r) => r.separationAtArrivalYds !== null)
    .map((r) => ({ v: r.separationAtArrivalYds as number, w: r.weight }));
  const cushItems = dropbacks
    .filter((r) => r.preSnapCushionYds !== null)
    .map((r) => ({ v: r.preSnapCushionYds as number, w: r.weight }));
  const ttpItems = dropbacks
    .filter((r) => r.timeToPressureSec !== null)
    .map((r) => ({ v: r.timeToPressureSec as number, w: r.weight }));
  const airItems = attempts
    .filter((r) => r.airYards !== null)
    .map((r) => ({ v: r.airYards as number, w: r.weight }));
  const yacItems = comps
    .filter((r) => r.yacYards !== null)
    .map((r) => ({ v: r.yacYards as number, w: r.weight }));

  return {
    n: dropbacks.length,
    compPct: attW > 0 ? +(100 * (compW / attW)).toFixed(2) : 0,
    sackPct: totalW > 0 ? +(100 * (sacksW / totalW)).toFixed(2) : 0,
    pressurePct: totalW > 0 ? +(100 * (pressW / totalW)).toFixed(2) : 0,
    intPctOnAtt: attW > 0 ? +(100 * (intW / attW)).toFixed(2) : 0,
    intPctOnDb: totalW > 0 ? +(100 * (intW / totalW)).toFixed(2) : 0,
    explosive15Pct: totalW > 0 ? +(100 * (expl15W / totalW)).toFixed(2) : 0,
    epaSuccessPct: totalW > 0 ? +(100 * (succW / totalW)).toFixed(2) : 0,
    meanYardsPerDb: +weightedMean(dropbacks.map((r) => ({ v: r.yards, w: r.weight }))).toFixed(2),
    meanEpa: +weightedMean(dropbacks.map((r) => ({ v: r.epa, w: r.weight }))).toFixed(4),
    meanAirYards: +weightedMean(airItems).toFixed(2),
    meanYacOnComp: +weightedMean(yacItems).toFixed(2),
    tttMean: +weightedMean(tttItems).toFixed(3),
    tttP25: +weightedQuantile(tttItems, 0.25).toFixed(3),
    tttP50: +weightedQuantile(tttItems, 0.5).toFixed(3),
    tttP75: +weightedQuantile(tttItems, 0.75).toFixed(3),
    flightDurationMean: +weightedMean(fltItems).toFixed(3),
    sepAtThrowMean: +weightedMean(sepItems).toFixed(3),
    sepAtArrivalMean: +weightedMean(sepArrItems).toFixed(3),
    preSnapCushionMean: +weightedMean(cushItems).toFixed(3),
    timeToPressureMean: +weightedMean(ttpItems).toFixed(3),
    olEngagedRateMean: +weightedMean(dropbacks.map((r) => ({ v: 100 * r.olEngagedRate, w: r.weight }))).toFixed(1),
  };
}

function aggregateRush(rows: PlayTelemetry[]): AggregatedRushMetrics {
  const totalW = rows.reduce((a, b) => a + b.weight, 0);
  const stuffW = rows.filter((r) => r.yards <= 0).reduce((a, b) => a + b.weight, 0);
  const succW = rows.filter((r) => r.yards >= 4 || r.touchdown).reduce((a, b) => a + b.weight, 0);
  const explW = rows.filter((r) => r.yards >= 15).reduce((a, b) => a + b.weight, 0);
  const contactItems = rows
    .filter((r) => r.rushYardsToFirstContact !== null)
    .map((r) => ({ v: r.rushYardsToFirstContact as number, w: r.weight }));

  return {
    n: rows.length,
    meanYards: +weightedMean(rows.map((r) => ({ v: r.yards, w: r.weight }))).toFixed(2),
    medianYards: +weightedQuantile(rows.map((r) => ({ v: r.yards, w: r.weight })), 0.5).toFixed(2),
    stuffPct: totalW > 0 ? +(100 * (stuffW / totalW)).toFixed(2) : 0,
    successPct: totalW > 0 ? +(100 * (succW / totalW)).toFixed(2) : 0,
    explosive15Pct: totalW > 0 ? +(100 * (explW / totalW)).toFixed(2) : 0,
    meanEpa: +weightedMean(rows.map((r) => ({ v: r.epa, w: r.weight }))).toFixed(4),
    yardsToContactMean: +weightedMean(contactItems).toFixed(2),
  };
}

// ============================================================================
// MODE 1: KAGGLE BDB 2023 / 2025 / 2026 10 Hz TRACKING REPLAY MODULE
// ============================================================================
interface BdbTrackingRow {
  gameId: string;
  playId: string;
  nflId: string;
  displayName: string;
  frameId: number;
  position: string;
  team: string;
  playDirection: 'left' | 'right';
  x: number;
  y: number;
  s: number;
  a: number;
  o: number;
  dir: number;
  event: string;
}

function parseCsvLine(line: string): string[] {
  const res: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      res.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

/** RFC-4180 streaming CSV parser that preserves embedded newlines inside quoted fields. */
async function* streamCsvRecords(filePath: string): AsyncGenerator<string[]> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1024 * 1024 });
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  let prevWasQuoteInQuotes = false;

  for await (const chunk of stream) {
    const str = chunk as string;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (prevWasQuoteInQuotes) {
        prevWasQuoteInQuotes = false;
        if (ch === '"') {
          cur += '"';
          continue;
        }
        inQuotes = false;
      }

      if (ch === '"') {
        if (inQuotes) {
          prevWasQuoteInQuotes = true;
        } else {
          inQuotes = true;
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(cur);
        cur = '';
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r') continue;
        if (cur.length > 0 || row.length > 0) {
          row.push(cur);
          yield row;
          row = [];
          cur = '';
        }
      } else {
        cur += ch;
      }
    }
  }
  if (prevWasQuoteInQuotes) {
    inQuotes = false;
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    yield row;
  }
}

function findTrackingCsvs(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const found: string[] = [];
  const walk = (p: string) => {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.toLowerCase().endsWith('.csv')) found.push(full);
    }
  };
  walk(dirPath);
  return found;
}

interface Bdb2027Summary {
  dataset: 'nfl-big-data-bowl-2027';
  cohortPlayers: number;
  combineDrills: Record<string, { n: number; p95SpeedYps: number; maxSpeedYps: number; p95AccelYps2: number; p99AccelYps2: number }>;
  playerPlayBenchmarks: {
    rowsParsed: number;
    cleanRowsParsed: number;
    dropbackDurationMean: number;
    timeToPressureMean: number;
    playerGetOffMean: number;
    separationOverallMean: number;
    separationManMean: number;
    separationZoneMean: number;
    targetedSeparationOverallMean: number;
    targetedSeparationManMean: number;
    targetedSeparationZoneMean: number;
    cushionOverallMean: number;
    cushionManMean: number;
    cushionZoneMean: number;
    yacMean: number;
    expectedYacMean: number;
    ballFlightMeanSec: number;
    ballFlightGt085Pct: number;
    byCoverageType: Record<string, { cushionMean: number; sepMean: number; nSep: number }>;
    targetedByCoverageType: Record<string, { cushionMean: number; sepMean: number; nSep: number }>;
  };
}

async function runBdb2027Mode(
  engine: All22KinematicEngine,
  bdb2027Dir: string,
  allCsvs: string[]
): Promise<{
  status: 'BDB_10HZ_SKIPPED_CREDENTIALS_MISSING' | 'BDB_10HZ_EXECUTED';
  filesDetected: number;
  kinematicsSummary?: Record<string, { n: number; p95SpeedYps: number; p99SpeedYps: number; p95AccelYps2: number; p99AccelYps2: number }>;
  replayChecks?: {
    playsReplayed: number;
    l1PocketDepthMaeYds: number | null;
    l1PocketDepth2sMaeYds: number | null;
    l2PassRushMaeYds: number | null;
    l3RunDispMaeYds: number | null;
    c1ShellDriftMaeYds: number | null;
    c2ManSepRmseYds: number | null;
    wr1sDispMaeYds: number | null;
  };
  bdb2027Summary?: Bdb2027Summary;
}> {
  const playersPath = path.join(bdb2027Dir, 'players.csv');
  const gamesPath = path.join(bdb2027Dir, 'games.csv');
  const combineTrackingPath = path.join(bdb2027Dir, 'combine_tracking.csv');
  const playerPlayPath = path.join(bdb2027Dir, 'player_play.csv');
  const gameTrackingPaths = ['game_tracking_2023.csv', 'game_tracking_2024.csv', 'game_tracking_2025.csv']
    .map((fn) => path.join(bdb2027Dir, fn))
    .filter((p) => fs.existsSync(p));

  const playersPosMap = new Map<string, string>();
  if (fs.existsSync(playersPath)) {
    let idx: Record<string, number> = {};
    let first = true;
    for await (const cols of streamCsvRecords(playersPath)) {
      if (first) {
        cols.forEach((h, i) => (idx[h.trim()] = i));
        first = false;
        continue;
      }
      playersPosMap.set(cols[idx['nfl_id']], cols[idx['nfl_position']] || 'UNK');
    }
  }

  const gameSeasonType = new Map<string, string>();
  if (fs.existsSync(gamesPath)) {
    let idx: Record<string, number> = {};
    let first = true;
    for await (const cols of streamCsvRecords(gamesPath)) {
      if (first) {
        cols.forEach((h, i) => (idx[h.trim()] = i));
        first = false;
        continue;
      }
      gameSeasonType.set(cols[idx['game_id']], (cols[idx['season_type']] || '').trim());
    }
  }

  // 1. Combine 10 Hz Drill Envelopes (full combine_tracking.csv including SKILL_DRILLS_LB)
  const drillKin: Record<string, { s: number[]; a: number[] }> = {};
  if (fs.existsSync(combineTrackingPath)) {
    const rl = readline.createInterface({ input: fs.createReadStream(combineTrackingPath), crlfDelay: Infinity });
    let idx: Record<string, number> = {};
    let lineNo = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      if (lineNo === 0) {
        cols.forEach((h, i) => (idx[h.trim()] = i));
        lineNo++;
        continue;
      }
      lineNo++;
      if (cols[idx['entity_type']] !== 'PLAYER') continue;
      const dt = cols[idx['drill_type']] || 'UNK';
      const s = parseFloat(cols[idx['s']] || '');
      const a = parseFloat(cols[idx['a']] || '');
      if (Number.isFinite(s) && Number.isFinite(a)) {
        drillKin[dt] ??= { s: [], a: [] };
        if (drillKin[dt].s.length < 150000) {
          drillKin[dt].s.push(s);
          drillKin[dt].a.push(a);
        }
      }
    }
  }
  const combineDrills: Bdb2027Summary['combineDrills'] = {};
  for (const [dt, arr] of Object.entries(drillKin)) {
    const ss = [...arr.s].sort((x, y) => x - y);
    const aa = [...arr.a].sort((x, y) => x - y);
    combineDrills[dt] = {
      n: arr.s.length,
      p95SpeedYps: +(ss[Math.floor(ss.length * 0.95)] || 0).toFixed(2),
      maxSpeedYps: +(ss[ss.length - 1] || 0).toFixed(2),
      p95AccelYps2: +(aa[Math.floor(aa.length * 0.95)] || 0).toFixed(2),
      p99AccelYps2: +(aa[Math.floor(aa.length * 0.99)] || 0).toFixed(2),
    };
  }

  // 2. Stream player_play.csv with RFC-4180 parser (handles 11,234 embedded newlines), filtered to REG+POST non-nullified
  interface PlayMeta {
    pos: string;
    isPass: boolean;
    isTrueRun: boolean;
    dirSign: 1 | -1;
    covType: string;
    route: string;
    sep: number;
    dbBucket: 'QUICK' | 'STD' | 'DEEP';
  }
  const playMetaMap = new Map<string, PlayMeta>();
  const dbDur: number[] = [];
  const ttpArr: number[] = [];
  const getOffArr: number[] = [];
  const sepAll: number[] = [];
  const sepMan: number[] = [];
  const sepZone: number[] = [];
  const tgtSepAll: number[] = [];
  const tgtSepMan: number[] = [];
  const tgtSepZone: number[] = [];
  const cushAll: number[] = [];
  const cushMan: number[] = [];
  const cushZone: number[] = [];
  const yacArr: number[] = [];
  const xyacArr: number[] = [];
  const byCovStats: Record<string, { cush: number[]; sep: number[] }> = {};
  const tgtByCovStats: Record<string, { cush: number[]; sep: number[] }> = {};
  let ppRows = 0;
  let cleanPpRows = 0;

  if (fs.existsSync(playerPlayPath)) {
    let idx: Record<string, number> = {};
    let first = true;
    for await (const cols of streamCsvRecords(playerPlayPath)) {
      if (first) {
        cols.forEach((h, i) => (idx[h.trim()] = i));
        first = false;
        continue;
      }
      ppRows++;
      const gid = cols[idx['game_id']];
      const pid = cols[idx['play_id']];
      const nid = cols[idx['nfl_id']];
      const seasonType = gameSeasonType.get(gid) ?? 'REG';
      const nullified = cols[idx['play_nullified_by_penalty']] || 'N';
      if ((seasonType !== 'REG' && seasonType !== 'POST') || nullified !== 'N') {
        continue;
      }
      cleanPpRows++;

      const pos = cols[idx['lined_up_position']] || playersPosMap.get(nid) || 'UNK';
      const pRes = cols[idx['pass_result']] || '';
      const playDesc = cols[idx['play_description']] || '';
      const isPass = pRes === 'C' || pRes === 'I' || pRes === 'S' || pRes === 'IN' || pRes === 'R';
      const isTrueRun = !isPass && !/kneel|aborted/i.test(playDesc);
      const isTargeted = (cols[idx['target']] === 'TRUE' || cols[idx['target']] === '1') && (pRes === 'C' || pRes === 'I' || pRes === 'IN');
      const dirSign: 1 | -1 = cols[idx['play_direction']] === 'left' ? -1 : 1;
      const covType = cols[idx['team_coverage_type']] || 'NA';
      const covMz = cols[idx['team_coverage_man_zone']] || 'NA';
      const route = cols[idx['route_ran']] || 'NA';
      const sep = parseFloat(cols[idx['separation_at_pass_forward']] || '');
      const cush = parseFloat(cols[idx['cushion']] || '');
      const db = parseFloat(cols[idx['dropback_duration']] || '');
      const ttp = parseFloat(cols[idx['time_to_pressure']] || '');
      const goff = parseFloat(cols[idx['player_get_off']] || '');
      const yac = parseFloat(cols[idx['yards_after_catch']] || '');
      const xyac = parseFloat(cols[idx['expected_yards_after_catch']] || '');

      const dbBucket: 'QUICK' | 'STD' | 'DEEP' = Number.isFinite(db) ? (db <= 2.3 ? 'QUICK' : db <= 3.1 ? 'STD' : 'DEEP') : 'STD';
      if (isPass || isTrueRun) {
        playMetaMap.set(`${gid}_${pid}_${nid}`, { pos, isPass, isTrueRun, dirSign, covType, route, sep, dbBucket });
      }

      if (Number.isFinite(db)) dbDur.push(db);
      if (Number.isFinite(ttp)) ttpArr.push(ttp);
      if (Number.isFinite(goff)) getOffArr.push(goff);
      if (Number.isFinite(yac)) yacArr.push(yac);
      if (Number.isFinite(xyac)) xyacArr.push(xyac);
      if (Number.isFinite(sep)) {
        sepAll.push(sep);
        if (covMz === 'MAN_COVERAGE') sepMan.push(sep);
        else if (covMz === 'ZONE_COVERAGE') sepZone.push(sep);
        byCovStats[covType] ??= { cush: [], sep: [] };
        byCovStats[covType].sep.push(sep);
        if (isTargeted) {
          tgtSepAll.push(sep);
          if (covMz === 'MAN_COVERAGE') tgtSepMan.push(sep);
          else if (covMz === 'ZONE_COVERAGE') tgtSepZone.push(sep);
          tgtByCovStats[covType] ??= { cush: [], sep: [] };
          tgtByCovStats[covType].sep.push(sep);
        }
      }
      if (Number.isFinite(cush)) {
        cushAll.push(cush);
        if (covMz === 'MAN_COVERAGE') cushMan.push(cush);
        else if (covMz === 'ZONE_COVERAGE') cushZone.push(cush);
        byCovStats[covType] ??= { cush: [], sep: [] };
        byCovStats[covType].cush.push(cush);
        if (isTargeted) {
          tgtByCovStats[covType] ??= { cush: [], sep: [] };
          tgtByCovStats[covType].cush.push(cush);
        }
      }
    }
  }

  const meanNum = (arr: number[]) => (arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3) : 0);
  const byCoverageType: Record<string, { cushionMean: number; sepMean: number; nSep: number }> = {};
  for (const [ct, st] of Object.entries(byCovStats)) {
    if (st.sep.length >= 100) {
      byCoverageType[ct] = { cushionMean: meanNum(st.cush), sepMean: meanNum(st.sep), nSep: st.sep.length };
    }
  }
  const targetedByCoverageType: Record<string, { cushionMean: number; sepMean: number; nSep: number }> = {};
  for (const [ct, st] of Object.entries(tgtByCovStats)) {
    if (st.sep.length >= 30) {
      targetedByCoverageType[ct] = { cushionMean: meanNum(st.cush), sepMean: meanNum(st.sep), nSep: st.sep.length };
    }
  }

  // 3. Stream 10 Hz game_tracking_2023..2025 (active play frames only, REG+POST clean plays)
  const END_EVENTS = new Set([
    'tackle',
    'out_of_bounds',
    'pass_outcome_incomplete',
    'touchdown',
    'qb_sack',
    'qb_strip_sack',
    'qb_slide',
    'fumble',
    'pass_outcome_interception',
    'pass_outcome_touchdown',
  ]);
  const posKinematics: Record<string, { s: number[]; a: number[] }> = {};
  interface TrajPt { x: number; y: number; s: number; a: number; event: string }
  interface CollectedTraj { meta: PlayMeta; snapIdx: number; pts: TrajPt[] }
  const olPassTrajs: CollectedTraj[] = [];
  const olRunTrajs: CollectedTraj[] = [];
  const dlPassTrajs: CollectedTraj[] = [];
  const dbPassTrajs: CollectedTraj[] = [];
  const wrPassTrajs: CollectedTraj[] = [];
  const seenFlightPlays = new Set<string>();
  const ballFlightDurs: number[] = [];

  for (const tf of gameTrackingPaths) {
    const rl = readline.createInterface({ input: fs.createReadStream(tf), crlfDelay: Infinity });
    let idx: Record<string, number> = {};
    let lineCount = 0;
    let curKey = '';
    let curPlayKey = '';
    let curPts: TrajPt[] = [];

    const flushTraj = () => {
      if (!curKey || curPts.length === 0) return;
      const meta = playMetaMap.get(curKey);
      if (!meta) return;
      const snapIdx = curPts.findIndex((p) => p.event === 'ball_snap');
      if (snapIdx < 0) return;

      let endIdx = curPts.length - 1;
      for (let i = snapIdx; i < curPts.length; i++) {
        if (END_EVENTS.has(curPts[i].event)) {
          endIdx = i;
          break;
        }
      }

      if (meta.pos !== 'UNK') {
        const pk = (posKinematics[meta.pos] ??= { s: [], a: [] });
        for (let i = snapIdx; i <= endIdx; i++) {
          if (pk.s.length < 60000) {
            pk.s.push(curPts[i].s);
            pk.a.push(curPts[i].a);
          }
        }
      }

      if (meta.isPass && !seenFlightPlays.has(curPlayKey)) {
        const pfIdx = curPts.findIndex((p) => p.event === 'pass_forward');
        const paIdx = curPts.findIndex((p) => p.event === 'pass_arrived');
        if (pfIdx >= 0 && paIdx > pfIdx) {
          const dtSec = (paIdx - pfIdx) * 0.1;
          if (dtSec > 0.05 && dtSec < 4.5) {
            seenFlightPlays.add(curPlayKey);
            ballFlightDurs.push(dtSec);
          }
        }
      }

      if (snapIdx + 20 >= curPts.length) return;
      if (['T', 'G', 'C'].includes(meta.pos)) {
        if (meta.isPass && olPassTrajs.length < 300) olPassTrajs.push({ meta, snapIdx, pts: curPts });
        else if (meta.isTrueRun && olRunTrajs.length < 300) olRunTrajs.push({ meta, snapIdx, pts: curPts });
      } else if (['EDGE', 'INTERIOR_LINE'].includes(meta.pos) && meta.isPass && dlPassTrajs.length < 300) {
        dlPassTrajs.push({ meta, snapIdx, pts: curPts });
      } else if (['CB', 'SLOT_CB', 'HIGH_SAFETY'].includes(meta.pos) && meta.isPass && dbPassTrajs.length < 300) {
        dbPassTrajs.push({ meta, snapIdx, pts: curPts });
      } else if (['WR', 'SLOT_WR', 'TE'].includes(meta.pos) && meta.isPass && wrPassTrajs.length < 300) {
        wrPassTrajs.push({ meta, snapIdx, pts: curPts });
      }
    };

    for await (const line of rl) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      if (lineCount === 0) {
        cols.forEach((h, i) => (idx[h.trim()] = i));
        lineCount++;
        continue;
      }
      lineCount++;
      const gid = cols[idx['game_id']];
      const pid = cols[idx['play_id']];
      const nid = cols[idx['nfl_id']];
      const k = `${gid}_${pid}_${nid}`;
      if (k !== curKey) {
        flushTraj();
        curKey = k;
        curPlayKey = `${gid}_${pid}`;
        curPts = [];
      }
      const x = parseFloat(cols[idx['x']] || '');
      const y = parseFloat(cols[idx['y']] || '');
      const s = parseFloat(cols[idx['s']] || '');
      const a = parseFloat(cols[idx['a']] || '');
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(s) && Number.isFinite(a)) {
        curPts.push({ x, y, s, a, event: cols[idx['event']] || 'NA' });
      }
      if (lineCount > 1200000) break;
    }
    flushTraj();
  }

  const kinematicsSummary: Record<string, { n: number; p95SpeedYps: number; p99SpeedYps: number; p95AccelYps2: number; p99AccelYps2: number }> = {};
  for (const [pos, arr] of Object.entries(posKinematics)) {
    const sSorted = [...arr.s].sort((x, y) => x - y);
    const aSorted = [...arr.a].sort((x, y) => x - y);
    kinematicsSummary[pos] = {
      n: arr.s.length,
      p95SpeedYps: +(sSorted[Math.floor(sSorted.length * 0.95)] || 0).toFixed(2),
      p99SpeedYps: +(sSorted[Math.floor(sSorted.length * 0.99)] || 0).toFixed(2),
      p95AccelYps2: +(aSorted[Math.floor(aSorted.length * 0.95)] || 0).toFixed(2),
      p99AccelYps2: +(aSorted[Math.floor(aSorted.length * 0.99)] || 0).toFixed(2),
    };
  }

  // 4. Score Honest Unfiltered 10 Hz Replay Checks at exact t=1.0s (tick 20) & t=2.0s (tick 40)
  const convProf = BASELINE_PHILOSOPHIES[0];
  const getSimDyAtTick = (traj: PlayTickSnapshot[], posIds: string[], targetTick: number): number => {
    const s0 = traj[0];
    const sT = traj[Math.min(targetTick, traj.length - 1)];
    const vals: number[] = [];
    for (const id of posIds) {
      const a0 = s0.agents.find((a) => a.id === id);
      const a1 = sT.agents.find((a) => a.id === id);
      if (a0 && a1) vals.push(a1.y - a0.y);
    }
    return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0;
  };

  const passSchemeByBucket: Record<'QUICK' | 'STD' | 'DEEP', CanonicalPlayId> = {
    QUICK: 'QUICK_SLANT',
    STD: 'DAGGER',
    DEEP: 'FOUR_VERTS',
  };
  const simOlPassByBucket1s: Record<string, Record<string, number>> = {};
  const simOlPassByBucket2s: Record<string, Record<string, number>> = {};
  const simDlPass1s: Record<string, number> = { EDGE: 0, INTERIOR_LINE: 0 };
  const passBktKeys = Object.keys(passSchemeByBucket) as ('QUICK' | 'STD' | 'DEEP')[];
  for (const bkt of passBktKeys) {
    const pid = passSchemeByBucket[bkt];
    const tr = engine.simulatePlay([...buildBaselinePlay(convProf, pid), ...buildModern2027Defense('NICKEL_OVER_C3')], 0.0);
    simOlPassByBucket1s[bkt] = {
      T: getSimDyAtTick(tr, ['LT', 'RT'], 20),
      G: getSimDyAtTick(tr, ['LG', 'RG'], 20),
      C: getSimDyAtTick(tr, ['C'], 20),
    };
    simOlPassByBucket2s[bkt] = {
      T: getSimDyAtTick(tr, ['LT', 'RT'], 40),
      G: getSimDyAtTick(tr, ['LG', 'RG'], 40),
      C: getSimDyAtTick(tr, ['C'], 40),
    };
    simDlPass1s.EDGE += getSimDyAtTick(tr, ['RDE', 'LDE'], 20) / passBktKeys.length;
    simDlPass1s.INTERIOR_LINE += getSimDyAtTick(tr, ['NT', '3T'], 20) / passBktKeys.length;
  }

  const runSchemes: CanonicalPlayId[] = ['INSIDE_ZONE', 'DUO', 'OUTSIDE_ZONE'];
  const simOlRunByPos: Record<string, number> = { T: 0, G: 0, C: 0 };
  for (const pid of runSchemes) {
    const tr = engine.simulatePlay([...buildBaselinePlay(convProf, pid), ...buildModern2027Defense('NICKEL_OVER_C3')], 0.0);
    simOlRunByPos.T += getSimDyAtTick(tr, ['LT', 'RT'], 20) / runSchemes.length;
    simOlRunByPos.G += getSimDyAtTick(tr, ['LG', 'RG'], 20) / runSchemes.length;
    simOlRunByPos.C += getSimDyAtTick(tr, ['C'], 20) / runSchemes.length;
  }

  const getSimDbPedal1s = (front: ModernDefFrontId, ids: string[]): number | null => {
    const tr = engine.simulatePlay([...buildBaselinePlay(convProf, 'DAGGER'), ...buildModern2027Defense(front)], 0.0);
    const s0 = tr[0];
    const s20 = tr[Math.min(20, tr.length - 1)];
    const pedals: number[] = [];
    for (const id of ids) {
      const a0 = s0.agents.find((a) => a.id === id);
      const a1 = s20.agents.find((a) => a.id === id);
      if (a0 && a1 && !RUSH_DEF_ROLES.has(a0.defAssignment?.role ?? '')) {
        pedals.push(a1.y - a0.y);
      }
    }
    return pedals.length ? pedals.reduce((x, y) => x + y, 0) / pedals.length : null;
  };
  const simDbPedalMap: Record<string, Record<string, number | null>> = {
    COVER_3_ZONE: { HIGH_SAFETY: getSimDbPedal1s('NICKEL_OVER_C3', ['FS', 'SS']), CB: getSimDbPedal1s('NICKEL_OVER_C3', ['CB1', 'CB2']), SLOT_CB: getSimDbPedal1s('NICKEL_OVER_C3', ['NCB']) },
    COVER_1_MAN: { HIGH_SAFETY: getSimDbPedal1s('NICKEL_UNDER_C1', ['FS', 'SS']), CB: getSimDbPedal1s('NICKEL_UNDER_C1', ['CB1', 'CB2']), SLOT_CB: getSimDbPedal1s('NICKEL_UNDER_C1', ['NCB']) },
    COVER_4_ZONE: { HIGH_SAFETY: getSimDbPedal1s('DIME_QUARTERS_MATCH', ['FS', 'SS']), CB: getSimDbPedal1s('DIME_QUARTERS_MATCH', ['CB1', 'CB2']), SLOT_CB: getSimDbPedal1s('DIME_QUARTERS_MATCH', ['NCB']) },
    COVER_2_ZONE: { HIGH_SAFETY: getSimDbPedal1s('NICKEL_SIM_C2', ['FS', 'SS']), CB: getSimDbPedal1s('NICKEL_SIM_C2', ['CB1', 'CB2']), SLOT_CB: getSimDbPedal1s('NICKEL_SIM_C2', ['NCB']) },
  };

  const simWrPass1s: Record<string, number> = { WR: 0, SLOT_WR: 0, TE: 0 };
  for (const pid of ['DAGGER', 'FOUR_VERTS'] as CanonicalPlayId[]) {
    const tr = engine.simulatePlay([...buildBaselinePlay(convProf, pid), ...buildModern2027Defense('NICKEL_OVER_C3')], 0.0);
    simWrPass1s.WR += getSimDyAtTick(tr, ['WR1', 'WR2'], 20) / 2;
    simWrPass1s.SLOT_WR += getSimDyAtTick(tr, ['SL'], 20) / 2;
    simWrPass1s.TE += getSimDyAtTick(tr, ['TE'], 20) / 2;
  }

  const l1Groups1s = new Map<string, number[]>();
  const l1Groups2s = new Map<string, number[]>();
  for (const t of olPassTrajs) {
    const obsDy1 = (t.pts[t.snapIdx + 10].x - t.pts[t.snapIdx].x) * t.meta.dirSign;
    const gk = `${t.meta.pos}__${t.meta.dbBucket}`;
    (l1Groups1s.get(gk) ?? (() => { const a: number[] = []; l1Groups1s.set(gk, a); return a; })()).push(obsDy1);
    if (t.snapIdx + 20 < t.pts.length) {
      const obsDy2 = (t.pts[t.snapIdx + 20].x - t.pts[t.snapIdx].x) * t.meta.dirSign;
      (l1Groups2s.get(gk) ?? (() => { const a: number[] = []; l1Groups2s.set(gk, a); return a; })()).push(obsDy2);
    }
  }
  const l1Errors: number[] = [];
  for (const [gk, vals] of l1Groups1s.entries()) {
    const [pos, bkt] = gk.split('__');
    const obsMean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const simDy = simOlPassByBucket1s[bkt]?.[pos];
    if (simDy !== undefined) l1Errors.push(Math.abs(obsMean - simDy));
  }
  const l1Errors2s: number[] = [];
  for (const [gk, vals] of l1Groups2s.entries()) {
    const [pos, bkt] = gk.split('__');
    const obsMean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const simDy = simOlPassByBucket2s[bkt]?.[pos];
    if (simDy !== undefined) l1Errors2s.push(Math.abs(obsMean - simDy));
  }

  const l2Groups = new Map<string, number[]>();
  for (const t of dlPassTrajs) {
    const obsDy = (t.pts[t.snapIdx + 10].x - t.pts[t.snapIdx].x) * t.meta.dirSign;
    (l2Groups.get(t.meta.pos) ?? (() => { const a: number[] = []; l2Groups.set(t.meta.pos, a); return a; })()).push(obsDy);
  }
  const l2Errors: number[] = [];
  for (const [pos, vals] of l2Groups.entries()) {
    const obsMean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const simDy = simDlPass1s[pos];
    if (simDy !== undefined) l2Errors.push(Math.abs(obsMean - simDy));
  }

  const l3Groups = new Map<string, number[]>();
  for (const t of olRunTrajs) {
    const obsDy = (t.pts[t.snapIdx + 10].x - t.pts[t.snapIdx].x) * t.meta.dirSign;
    (l3Groups.get(t.meta.pos) ?? (() => { const a: number[] = []; l3Groups.set(t.meta.pos, a); return a; })()).push(obsDy);
  }
  const l3Errors: number[] = [];
  for (const [pos, vals] of l3Groups.entries()) {
    const obsMean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const simDy = simOlRunByPos[pos];
    if (simDy !== undefined) l3Errors.push(Math.abs(obsMean - simDy));
  }

  const c1Groups = new Map<string, number[]>();
  for (const t of dbPassTrajs) {
    const obsPedal = (t.pts[t.snapIdx + 10].x - t.pts[t.snapIdx].x) * t.meta.dirSign;
    const covKey = simDbPedalMap[t.meta.covType] ? t.meta.covType : 'COVER_3_ZONE';
    const gk = `${t.meta.pos}__${covKey}`;
    (c1Groups.get(gk) ?? (() => { const a: number[] = []; c1Groups.set(gk, a); return a; })()).push(obsPedal);
  }
  const c1Errors: number[] = [];
  for (const [gk, vals] of c1Groups.entries()) {
    if (vals.length < 3) continue;
    const [pos, covKey] = gk.split('__');
    const obsMean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const simPedal = simDbPedalMap[covKey]?.[pos];
    if (simPedal !== null && simPedal !== undefined) c1Errors.push(Math.abs(obsMean - simPedal));
  }

  const wrGroups = new Map<string, number[]>();
  for (const t of wrPassTrajs) {
    const obsDy = (t.pts[t.snapIdx + 10].x - t.pts[t.snapIdx].x) * t.meta.dirSign;
    (wrGroups.get(t.meta.pos) ?? (() => { const a: number[] = []; wrGroups.set(t.meta.pos, a); return a; })()).push(obsDy);
  }
  const wrErrors: number[] = [];
  for (const [pos, vals] of wrGroups.entries()) {
    const obsMean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const simDy = simWrPass1s[pos];
    if (simDy !== undefined) wrErrors.push(Math.abs(obsMean - simDy));
  }

  // Coverage-level separation RMSE across COVER_0 / COVER_1 / COVER_2 / COVER_3 / COVER_4 (pure throw sep!)
  const covProbeFronts: [string, ModernDefFrontId][] = [
    ['COVER_0_MAN', 'DIME_MUG_C0'],
    ['COVER_1_MAN', 'NICKEL_UNDER_C1'],
    ['COVER_2_ZONE', 'NICKEL_SIM_C2'],
    ['COVER_3_ZONE', 'NICKEL_OVER_C3'],
    ['COVER_4_ZONE', 'DIME_QUARTERS_MATCH'],
  ];
  const sepSqErrs: number[] = [];
  for (const [covKey, df] of covProbeFronts) {
    const obsSep = targetedByCoverageType[covKey]?.sepMean ?? byCoverageType[covKey]?.sepMean;
    if (!obsSep) continue;
    const seps: number[] = [];
    for (const pid of ['DAGGER', 'QUICK_SLANT', 'MESH', 'FOUR_VERTS'] as CanonicalPlayId[]) {
      for (let r = 0; r < 6; r++) {
        const res = simulatePlayWithTelemetry(engine, buildBaselinePlay(convProf, pid), buildModern2027Defense(df));
        if (res.separationAtThrowYds !== null) seps.push(res.separationAtThrowYds);
      }
    }
    if (seps.length > 0) {
      const simSep = seps.reduce((a, b) => a + b, 0) / seps.length;
      sepSqErrs.push((simSep - obsSep) ** 2);
    }
  }

  const mae = (arr: number[]) => (arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null);
  const playsReplayed = olPassTrajs.length + olRunTrajs.length + dlPassTrajs.length + dbPassTrajs.length + wrPassTrajs.length;
  const replayChecks = {
    playsReplayed,
    l1PocketDepthMaeYds: mae(l1Errors),
    l1PocketDepth2sMaeYds: mae(l1Errors2s),
    l2PassRushMaeYds: mae(l2Errors),
    l3RunDispMaeYds: mae(l3Errors),
    c1ShellDriftMaeYds: mae(c1Errors),
    c2ManSepRmseYds: sepSqErrs.length ? +Math.sqrt(sepSqErrs.reduce((a, b) => a + b, 0) / sepSqErrs.length).toFixed(2) : null,
    wr1sDispMaeYds: mae(wrErrors),
  };

  const ballFlightGt085Pct = ballFlightDurs.length
    ? +((100 * ballFlightDurs.filter((d) => d > 0.85).length) / ballFlightDurs.length).toFixed(1)
    : 0;

  const bdb2027Summary: Bdb2027Summary = {
    dataset: 'nfl-big-data-bowl-2027',
    cohortPlayers: playersPosMap.size,
    combineDrills,
    playerPlayBenchmarks: {
      rowsParsed: ppRows,
      cleanRowsParsed: cleanPpRows,
      dropbackDurationMean: meanNum(dbDur),
      timeToPressureMean: meanNum(ttpArr),
      playerGetOffMean: meanNum(getOffArr),
      separationOverallMean: meanNum(sepAll),
      separationManMean: meanNum(sepMan),
      separationZoneMean: meanNum(sepZone),
      targetedSeparationOverallMean: meanNum(tgtSepAll),
      targetedSeparationManMean: meanNum(tgtSepMan),
      targetedSeparationZoneMean: meanNum(tgtSepZone),
      cushionOverallMean: meanNum(cushAll),
      cushionManMean: meanNum(cushMan),
      cushionZoneMean: meanNum(cushZone),
      yacMean: meanNum(yacArr),
      expectedYacMean: meanNum(xyacArr),
      ballFlightMeanSec: meanNum(ballFlightDurs),
      ballFlightGt085Pct,
      byCoverageType,
      targetedByCoverageType,
    },
  };

  console.log(`\n[Mode 1: BDB 2027 10 Hz Combine-to-Pro Replay] STATUS: BDB_10HZ_EXECUTED (${allCsvs.length} CSVs, ${ppRows} total / ${cleanPpRows} REG+POST clean player-plays, ${playsReplayed} trajectories)`);
  console.log(
    `  Replay Checks (Zero Fudge Factors @ 1.0s/2.0s): L1_Pocket1sMAE=${replayChecks.l1PocketDepthMaeYds}y | L1_Pocket2sMAE=${replayChecks.l1PocketDepth2sMaeYds}y | L2_PassRush1sMAE=${replayChecks.l2PassRushMaeYds}y | L3_RunOL1sMAE=${replayChecks.l3RunDispMaeYds}y | C1_ShellDrift1sMAE=${replayChecks.c1ShellDriftMaeYds}y | C2_TgtCovSepRMSE=${replayChecks.c2ManSepRmseYds}y | WR1sMAE=${replayChecks.wr1sDispMaeYds}y`
  );
  console.log(
    `  BDB 2027 Clean Benchmarks: Cushion=${bdb2027Summary.playerPlayBenchmarks.cushionOverallMean}y (Man ${bdb2027Summary.playerPlayBenchmarks.cushionManMean}y / Zone ${bdb2027Summary.playerPlayBenchmarks.cushionZoneMean}y) | TargetedSep=${bdb2027Summary.playerPlayBenchmarks.targetedSeparationOverallMean}y (Man ${bdb2027Summary.playerPlayBenchmarks.targetedSeparationManMean}y / Zone ${bdb2027Summary.playerPlayBenchmarks.targetedSeparationZoneMean}y) | AllSep=${bdb2027Summary.playerPlayBenchmarks.separationOverallMean}y | YAC=${bdb2027Summary.playerPlayBenchmarks.yacMean}y | Flight=${bdb2027Summary.playerPlayBenchmarks.ballFlightMeanSec}s (>0.85s: ${ballFlightGt085Pct}%) | TTP=${bdb2027Summary.playerPlayBenchmarks.timeToPressureMean}s`
  );

  return {
    status: 'BDB_10HZ_EXECUTED',
    filesDetected: allCsvs.length,
    kinematicsSummary,
    replayChecks,
    bdb2027Summary,
  };
}

async function runBdb10HzMode(engine: All22KinematicEngine): Promise<{
  status: 'BDB_10HZ_SKIPPED_CREDENTIALS_MISSING' | 'BDB_10HZ_EXECUTED';
  filesDetected: number;
  kinematicsSummary?: Record<string, { n: number; p95SpeedYps: number; p99SpeedYps: number; p95AccelYps2: number; p99AccelYps2: number }>;
  replayChecks?: {
    playsReplayed: number;
    l1PocketDepthMaeYds: number | null;
    l1PocketDepth2sMaeYds: number | null;
    l2PassRushMaeYds: number | null;
    l3RunDispMaeYds: number | null;
    c1ShellDriftMaeYds: number | null;
    c2ManSepRmseYds: number | null;
    wr1sDispMaeYds: number | null;
  };
  bdb2027Summary?: Bdb2027Summary;
}> {
  const bdbRoot = path.join(process.cwd(), 'data', 'bdb');
  const allCsvs = findTrackingCsvs(bdbRoot);

  const playersCsv = allCsvs.find((f) => path.basename(f).toLowerCase() === 'players.csv');
  const playerPlayCsv = allCsvs.find((f) => path.basename(f).toLowerCase() === 'player_play.csv');
  if (playersCsv && playerPlayCsv) {
    return runBdb2027Mode(engine, path.dirname(playersCsv), allCsvs);
  }

  const trackingFiles = allCsvs.filter((f) => {
    const bn = path.basename(f).toLowerCase();
    return bn.includes('tracking') || bn.startsWith('week') || bn.startsWith('input_');
  });

  if (trackingFiles.length === 0) {
    console.log('\n[Mode 1: BDB 10 Hz Frame Replay] STATUS: BDB_10HZ_SKIPPED_CREDENTIALS_MISSING');
    console.log('  - No Kaggle 10 Hz CSVs present in data/bdb/{bdb2023,bdb2025,bdb2026,bdb2027}.');
    console.log('  - Sanctioned unlock path: place ~/.kaggle/access_token or kaggle.json (accept competition rules on Kaggle),');
    console.log('    then run: py -3.12 scripts/fetch_validation_data.py  OR unzip Kaggle tracking CSVs into data/bdb/.');
    return { status: 'BDB_10HZ_SKIPPED_CREDENTIALS_MISSING', filesDetected: allCsvs.length };
  }

  // Stream up to first 2 tracking CSVs (caps memory cleanly for fast replay)
  const posKinematics: Record<string, { s: number[]; a: number[] }> = {};
  const snapPlays = new Map<string, { losX: number; rows: BdbTrackingRow[] }>();

  for (const tf of trackingFiles.slice(0, 2)) {
    const rl = readline.createInterface({
      input: fs.createReadStream(tf),
      crlfDelay: Infinity,
    });
    let header: string[] = [];
    let idx: Record<string, number> = {};
    let lineCount = 0;

    for await (const line of rl) {
      if (!line.trim()) continue;
      if (lineCount === 0) {
        header = parseCsvLine(line);
        header.forEach((h, i) => (idx[h.trim()] = i));
        lineCount++;
        continue;
      }
      lineCount++;
      const cols = parseCsvLine(line);
      const pos = cols[idx['position'] ?? -1] || 'UNK';
      const s = parseFloat(cols[idx['s'] ?? -1] || '0');
      const a = parseFloat(cols[idx['a'] ?? -1] || '0');
      if (Number.isFinite(s) && Number.isFinite(a) && pos !== 'UNK') {
        posKinematics[pos] ??= { s: [], a: [] };
        if (posKinematics[pos].s.length < 25000) {
          posKinematics[pos].s.push(s);
          posKinematics[pos].a.push(a);
        }
      }

      const key = `${cols[idx['gameId'] ?? 0]}_${cols[idx['playId'] ?? 1]}`;
      if (snapPlays.size < 40 || snapPlays.has(key)) {
        const entry = snapPlays.get(key) ?? { losX: 50, rows: [] };
        entry.rows.push({
          gameId: cols[idx['gameId'] ?? 0],
          playId: cols[idx['playId'] ?? 1],
          nflId: cols[idx['nflId'] ?? 2] || `${cols[idx['displayName'] ?? 3]}`,
          displayName: cols[idx['displayName'] ?? 3] || 'UNK',
          frameId: parseInt(cols[idx['frameId'] ?? 4] || '0', 10),
          position: pos,
          team: cols[idx['team'] ?? idx['club'] ?? -1] || '',
          playDirection: (cols[idx['playDirection'] ?? -1] === 'left' ? 'left' : 'right'),
          x: parseFloat(cols[idx['x'] ?? -1] || '0'),
          y: parseFloat(cols[idx['y'] ?? -1] || '0'),
          s,
          a,
          o: parseFloat(cols[idx['o'] ?? -1] || '0'),
          dir: parseFloat(cols[idx['dir'] ?? -1] || '0'),
          event: cols[idx['event'] ?? -1] || '',
        });
        snapPlays.set(key, entry);
      }
      if (lineCount > 250000) break;
    }
  }

  const kinematicsSummary: Record<string, { n: number; p95SpeedYps: number; p99SpeedYps: number; p95AccelYps2: number; p99AccelYps2: number }> = {};
  for (const [pos, arr] of Object.entries(posKinematics)) {
    const sSorted = [...arr.s].sort((x, y) => x - y);
    const aSorted = [...arr.a].sort((x, y) => x - y);
    kinematicsSummary[pos] = {
      n: arr.s.length,
      p95SpeedYps: +(sSorted[Math.floor(sSorted.length * 0.95)] || 0).toFixed(2),
      p99SpeedYps: +(sSorted[Math.floor(sSorted.length * 0.99)] || 0).toFixed(2),
      p95AccelYps2: +(aSorted[Math.floor(aSorted.length * 0.95)] || 0).toFixed(2),
      p99AccelYps2: +(aSorted[Math.floor(aSorted.length * 0.99)] || 0).toFixed(2),
    };
  }

  // Score seeded 10 Hz replay errors (normalized to LOS y=0, +y toward offense goal)
  let playsReplayed = 0;
  const pocketErrors: number[] = [];
  const shellDrifts: number[] = [];

  for (const [, play] of snapPlays) {
    const snapRows = play.rows.filter((r) => r.event === 'ball_snap' && r.team !== 'football');
    if (snapRows.length < 22) continue;
    const ballRow = play.rows.find((r) => r.event === 'ball_snap' && r.team === 'football');
    const losX = ballRow ? ballRow.x : 60;
    const dirSign = snapRows[0].playDirection === 'left' ? -1 : 1;

    const toSimXY = (rx: number, ry: number) => ({
      x: Math.max(-26.5, Math.min(26.5, (ry - 26.65) * dirSign)),
      y: (rx - losX) * dirSign,
    });

    const teams = Array.from(new Set(snapRows.map((r) => r.team)));
    if (teams.length !== 2) continue;
    const qbCand = snapRows.find((r) => r.position === 'QB');
    const offTeam = qbCand ? qbCand.team : teams[0];

    const agents: SimAgent[] = snapRows.slice(0, 22).map((r, idx) => {
      const xy = toSimXY(r.x, r.y);
      const isOff = r.team === offTeam;
      const isOl = ['T', 'G', 'C', 'OT', 'OG', 'OL'].includes(r.position);
      return {
        id: r.nflId || `${r.team}_${idx}`,
        label: r.position,
        side: isOff ? 'OFF' : 'DEF',
        pos: r.position,
        startX: xy.x,
        startY: xy.y,
        x: xy.x,
        y: xy.y,
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0,
        engagedWithId: null,
        leverageScore: 0,
        ratings: { speed: 84, accel: 85, power: 84, finesse: 84, awareness: 85 },
        assignment: {
          role: isOl ? 'PASS_SET' : r.position === 'QB' ? 'QB_DROP' : 'ROUTE',
          primaryTargetId: null,
          secondaryTargetId: null,
          gapOrSet: 'VERTICAL_DEEP',
          leverage: 'NEUTRAL',
          climbOrChipDelaySec: 0.6,
          waypoints: r.position === 'QB' ? [{ x: xy.x, y: xy.y - 2.0 }] : [{ x: xy.x, y: Math.min(20, xy.y + 12) }],
        },
        defAssignment: isOff
          ? undefined
          : {
              role: ['DE', 'DT', 'NT'].includes(r.position) ? 'RUSH_GAP' : 'DEEP_ZONE',
              targetX: xy.x,
              targetY: r.position === 'FS' || r.position === 'SS' ? 16 : -4.0,
            },
      };
    });

    const simTraj = engine.simulatePlay(agents, 0.4);
    const snapFrameId = snapRows[0].frameId;
    // Compare pocket depth Δy at t = 1.0s (frame +10 at 10 Hz vs sim tick 20 at 20 Hz)
    const obsAt1s = play.rows.filter((r) => r.frameId === snapFrameId + 10);
    const simAt1s = simTraj[Math.min(simTraj.length - 1, 20)];
    if (obsAt1s.length >= 22 && simAt1s) {
      const obsQb = obsAt1s.find((r) => r.position === 'QB');
      const simQb = simAt1s.agents.find((a) => a.pos === 'QB');
      if (obsQb && simQb) {
        const obsXY = toSimXY(obsQb.x, obsQb.y);
        pocketErrors.push(Math.abs(obsXY.y - simQb.y));
      }
      for (const r of obsAt1s) {
        if (r.position === 'FS' || r.position === 'SS') {
          const simS = simAt1s.agents.find((a) => a.id === r.nflId);
          if (simS) {
            const obsXY = toSimXY(r.x, r.y);
            shellDrifts.push(Math.hypot(obsXY.x - simS.x, obsXY.y - simS.y));
          }
        }
      }
      playsReplayed++;
    }
    if (playsReplayed >= 20) break;
  }

  console.log(`\n[Mode 1: BDB 10 Hz Frame Replay] Replayed ${playsReplayed} snap trajectories.`);
  return {
    status: 'BDB_10HZ_EXECUTED',
    filesDetected: allCsvs.length,
    kinematicsSummary,
    replayChecks: {
      playsReplayed,
      l1PocketDepthMaeYds:
        pocketErrors.length > 0 ? +(pocketErrors.reduce((a, b) => a + b, 0) / pocketErrors.length).toFixed(2) : null,
      l1PocketDepth2sMaeYds: null,
      l2PassRushMaeYds: null,
      l3RunDispMaeYds: null,
      c1ShellDriftMaeYds:
        shellDrifts.length > 0 ? +(shellDrifts.reduce((a, b) => a + b, 0) / shellDrifts.length).toFixed(2) : null,
      c2ManSepRmseYds: null,
      wr1sDispMaeYds: null,
    },
  };
}

interface RawTeamPlayer {
  id?: string;
  label: string;
  name: string;
  ratings: Record<string, number>;
  scouting?: { ovr?: number; jersey?: number; fortyYdDash?: number; ngsMaxSpeedMph?: number; weightLbs?: number };
}

interface RawTeamEntry {
  offense: RawTeamPlayer[];
  defense: RawTeamPlayer[];
}

function loadRawNflTeams(): Record<string, RawTeamEntry> {
  const teamsPath = path.join(process.cwd(), 'src', 'data', 'nfl_teams_32.json');
  return JSON.parse(fs.readFileSync(teamsPath, 'utf8')) as Record<string, RawTeamEntry>;
}

function applyTeamRosterToAgents(
  offAgents: SimAgent[],
  defAgents: SimAgent[],
  offTeam: RawTeamEntry | undefined,
  defTeam: RawTeamEntry | undefined
): void {
  if (offTeam) {
    for (const a of offAgents) {
      const match =
        offTeam.offense.find((p) => p.id === a.id) ||
        (a.id === 'SL' ? offTeam.offense.find((p) => p.id === 'SLOT' || p.label === 'SLOT') : undefined) ||
        offTeam.offense.find((p) => p.label === a.pos);
      if (!match) continue;
      a.name = match.name || a.id;
      const r = match.ratings || {};
      const isOl = ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.pos);
      a.ratings = {
        speed: r.spd ?? a.ratings.speed,
        accel: r.acc ?? a.ratings.accel,
        power: isOl
          ? Math.round((r.str ?? 88) * 0.4 + (r.pbk_anchor ?? 86) * 0.3 + (r.rbk_power ?? 86) * 0.3)
          : Math.round((r.str ?? 76) * 0.5 + (r.btk_power ?? r.rbk_power ?? 78) * 0.5),
        finesse: isOl
          ? Math.round((r.agi ?? 74) * 0.3 + (r.pbk_lateral ?? 85) * 0.35 + (r.rbk_reach ?? 85) * 0.35)
          : Math.round((r.agi ?? 86) * 0.45 + (r.rr_short ?? r.elusiveness ?? r.tha_short ?? 85) * 0.55),
        awareness: r.pre_snap_read ?? match.scouting?.ovr ?? a.ratings.awareness,
      };
    }
  }
  if (defTeam) {
    const defRoster = defTeam.defense;
    const mapDef = (agent: SimAgent): RawTeamPlayer | undefined => {
      const direct = defRoster.find((p) => p.id === agent.id || p.label === agent.id);
      if (direct) return direct;
      if (agent.id === 'NT' || agent.id === '0T_NT' || agent.id === '4i_L') return defRoster.find((p) => p.id === 'DT1') || defRoster[1];
      if (agent.id === '3T' || agent.id === '4i_R') return defRoster.find((p) => p.id === 'DT2') || defRoster[2];
      if (agent.id === 'LOLB' || agent.id === 'DE_L') return defRoster.find((p) => p.id === 'LDE') || defRoster[0];
      if (agent.id === 'ROLB' || agent.id === 'DE_R') return defRoster.find((p) => p.id === 'RDE') || defRoster[3];
      if (agent.id === 'WILL') return defRoster.find((p) => p.id === 'WLB') || defRoster[4];
      if (agent.id === 'MIKE') return defRoster.find((p) => p.id === 'MLB') || defRoster[5];
      if (agent.id === 'NCB' || agent.id === 'DIME') return defRoster.find((p) => p.id === 'NB' || p.label === 'NB') || defRoster[8];
      return undefined;
    };
    for (const d of defAgents) {
      const match = mapDef(d);
      if (!match) continue;
      d.name = match.name || d.id;
      const r = match.ratings || {};
      const isFront = ['DE', 'DT', 'NT', 'EDGE'].includes(d.pos);
      d.ratings = {
        speed: r.spd ?? d.ratings.speed,
        accel: r.acc ?? d.ratings.accel,
        power: isFront
          ? Math.round((r.str ?? 86) * 0.45 + (r.rush_power ?? 86) * 0.55)
          : Math.round((r.str ?? 74) * 0.45 + (r.tak_hit_power ?? 82) * 0.55),
        finesse: isFront
          ? Math.round((r.rush_speed ?? 84) * 0.5 + (r.bsh_shed ?? 85) * 0.5)
          : Math.round((r.cov_man ?? 82) * 0.5 + (r.cov_zone ?? 84) * 0.5),
        awareness: r.play_rec ?? match.scouting?.ovr ?? d.ratings.awareness,
      };
    }
  }
}

// ============================================================================
// MODE 2: NFLVERSE EMPIRICAL TELEMETRY AUDIT & STAGE 4 RE-AUDIT
// ============================================================================
function auditRosterKinematics(engine: All22KinematicEngine, rawTeams: Record<string, RawTeamEntry>) {
  const byPos: Record<string, { spd: number[]; acc: number[]; forty: number[]; mph: number[]; wt: number[]; exact475Count: number }> = {};
  for (const team of Object.values(rawTeams)) {
    for (const p of [...team.offense, ...team.defense]) {
      byPos[p.label] ??= { spd: [], acc: [], forty: [], mph: [], wt: [], exact475Count: 0 };
      byPos[p.label].spd.push(p.ratings.spd ?? 0);
      byPos[p.label].acc.push(p.ratings.acc ?? 0);
      if (p.scouting?.fortyYdDash) {
        byPos[p.label].forty.push(p.scouting.fortyYdDash);
        if (Math.abs(p.scouting.fortyYdDash - 4.75) < 0.005) byPos[p.label].exact475Count++;
      }
      if (p.scouting?.ngsMaxSpeedMph) byPos[p.label].mph.push(p.scouting.ngsMaxSpeedMph);
      if (p.scouting?.weightLbs) byPos[p.label].wt.push(p.scouting.weightLbs);
    }
  }

  const posSummary = Object.entries(byPos).map(([pos, vals]) => {
    const avg = (a: number[]) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : 0);
    return {
      pos,
      n: vals.spd.length,
      meanSpd: avg(vals.spd),
      meanAcc: avg(vals.acc),
      meanForty: avg(vals.forty),
      meanMph: avg(vals.mph),
      meanWtLbs: avg(vals.wt),
      imputed475Count: vals.exact475Count,
    };
  });
  const posByKey = new Map(posSummary.map((p) => [p.pos, p]));

  // Also empirically measure Engine 0->10y split & max speed for rating profiles in a clean sprint
  const measureSprint = (pos: string, rosterPosKey: string) => {
    const rp = posByKey.get(rosterPosKey);
    const speedRating = rp ? Math.round(rp.meanSpd) : 85;
    const accelRating = rp ? Math.round(rp.meanAcc) : 85;
    const weightLbs = rp ? Math.round(rp.meanWtLbs) : undefined;
    const off: SimAgent = {
      id: 'TEST_RUNNER',
      label: pos,
      side: 'OFF',
      pos,
      startX: 0,
      startY: -0.3,
      x: 0,
      y: -0.3,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      engagedWithId: null,
      leverageScore: 0,
      ratings: { speed: speedRating, accel: accelRating, power: 80, finesse: 80, awareness: 85 },
      assignment: {
        role: 'ROUTE',
        primaryTargetId: null,
        secondaryTargetId: null,
        gapOrSet: 'VERTICAL_DEEP',
        leverage: 'NEUTRAL',
        climbOrChipDelaySec: 0,
        waypoints: [{ x: 0, y: 40 }],
      },
    };
    const dummyQb: SimAgent = {
      id: 'QB',
      label: 'QB',
      side: 'OFF',
      pos: 'QB',
      startX: 0,
      startY: -5,
      x: 0,
      y: -5,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      engagedWithId: null,
      leverageScore: 0,
      ratings: { speed: 75, accel: 78, power: 70, finesse: 85, awareness: 85 },
      assignment: {
        role: 'QB_DROP',
        primaryTargetId: null,
        secondaryTargetId: null,
        gapOrSet: 'VERTICAL_DEEP',
        leverage: 'NEUTRAL',
        climbOrChipDelaySec: 0,
        waypoints: [{ x: 0, y: -12 }],
      },
    };
    const dummyCb: SimAgent = {
      id: 'CB1',
      label: 'CB1',
      side: 'DEF',
      pos: 'CB',
      startX: 15,
      startY: 12,
      x: 15,
      y: 12,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      engagedWithId: null,
      leverageScore: 0,
      ratings: { speed: 85, accel: 85, power: 70, finesse: 85, awareness: 85 },
      assignment: {
        role: 'MAN_BLOCK',
        primaryTargetId: null,
        secondaryTargetId: null,
        gapOrSet: 'VERTICAL_DEEP',
        leverage: 'NEUTRAL',
        climbOrChipDelaySec: 0,
        waypoints: [],
      },
      defAssignment: { role: 'DEEP_ZONE', targetX: 15, targetY: 20 },
    };

    const traj = engine.simulatePlay([off, dummyQb, dummyCb], 0.0);
    let maxV = 0;
    let tFirstMove: number | null = null;
    let t10y: number | null = null;
    for (const snap of traj) {
      const a = snap.agents.find((ag) => ag.id === 'TEST_RUNNER');
      if (!a) continue;
      const v = Math.hypot(a.vx, a.vy);
      if (v > maxV) maxV = v;
      if (tFirstMove === null && v >= 0.5) tFirstMove = snap.timeSec;
      if (t10y === null && a.y - off.startY >= 10.0) t10y = snap.timeSec;
    }
    const burst10y = t10y !== null && tFirstMove !== null ? +(t10y - tFirstMove).toFixed(2) : null;
    return {
      pos,
      weightLbs,
      speedRating,
      accelRating,
      simMaxYps: +maxV.toFixed(2),
      simMaxMph: +(maxV * 2.04545).toFixed(2),
      sim10YdSplitSec: t10y !== null ? +t10y.toFixed(2) : null,
      sim10YdBurstSec: burst10y,
    };
  };

  const sprintProbes = [
    measureSprint('WR', 'WR1'),
    measureSprint('CB', 'CB1'),
    measureSprint('FS', 'FS'),
    measureSprint('RB', 'RB'),
    measureSprint('LB', 'MLB'),
    measureSprint('TE', 'TE'),
    measureSprint('EDGE', 'EDGE1'),
    measureSprint('LT', 'LT'),
    measureSprint('DT', 'DT1'),
  ];

  return { posSummary, sprintProbes };
}

function formatLineDiff(label: string, simVal: number, trainVal: number | null, testVal: number | null, unit = ''): string {
  const tr = trainVal !== null ? `${trainVal}${unit}` : 'n/a';
  const te = testVal !== null ? `${testVal}${unit}` : 'n/a';
  const diff = trainVal !== null ? `${simVal - trainVal >= 0 ? '+' : ''}${(simVal - trainVal).toFixed(2)}${unit}` : 'n/a';
  return `  ${label.padEnd(28)} Sim=${String(simVal + unit).padEnd(9)} | Train22-23=${String(tr).padEnd(9)} | Held24=${String(te).padEnd(9)} | ΔTrain=${diff}`;
}

export async function runTrackingAndChartedValidation(): Promise<void> {
  const isBaselineSave = process.argv.includes('--save-baseline');
  const engine = new All22KinematicEngine();
  const benchPath = path.join(process.cwd(), 'src', 'data', 'nfl_empirical_benchmarks.json');
  const benchmarks = JSON.parse(fs.readFileSync(benchPath, 'utf8')) as BenchmarksPayload;

  console.log('===============================================================================================================');
  console.log(' ALL-22 KINEMATIC SIMULATOR — EMPIRICAL 10 HZ & NFLVERSE CHARTED TELEMETRY VALIDATION');
  console.log(' Train: nflverse 2022-2023 (39,017 non-screen DBs, 27,156 rushes) | Blind Held-Out: 2024 (19,145 DBs, 13,561 rushes)');
  console.log('===============================================================================================================');

  // 1. MODE 1: BDB 10 Hz Frame Replay
  const bdbRes = await runBdb10HzMode(engine);
  const rawTeams = loadRawNflTeams();

  // 2. MODE 2A: Roster & Positional Kinematics Envelope Audit
  const kinAudit = auditRosterKinematics(engine, rawTeams);
  console.log('\n[Mode 2A: Roster & Engine Kinematics Audit (32 NFL Teams + Sprint Envelope)]');
  for (const s of kinAudit.sprintProbes) {
    console.log(
      `  Sprint[${s.pos.padEnd(4)} spd=${s.speedRating} acc=${s.accelRating}] => SimMax=${s.simMaxYps} yd/s (${s.simMaxMph} mph) | 10ySnap=${s.sim10YdSplitSec}s | 10yBurst=${s.sim10YdBurstSec}s`
    );
  }
  const anomalyPositions = kinAudit.posSummary.filter((p) => p.imputed475Count >= 4 || p.pos === 'FS' || p.pos === 'SS' || p.pos === 'EDGE1');
  console.log('  Selected nfl_teams_32.json Positional Averages & Imputed-4.75 Clusters:');
  for (const p of anomalyPositions) {
    console.log(
      `    ${p.pos.padEnd(6)} n=${p.n} meanSpd=${p.meanSpd} meanAcc=${p.meanAcc} mean40=${p.meanForty} meanMph=${p.meanMph} exact4.75=${p.imputed475Count}`
    );
  }

  // 3. MODE 2B: League-Weighted Canonical NFL Benchmark Suite
  const OPEN_FRONTS = MODERN_2027_DEF_FRONTS.filter((f) => f !== 'GOAL_LINE_62_PINCH');
  const PASS_PLAYS: CanonicalPlayId[] = ['DAGGER', 'PA_FLOOD', 'PA_UC_BOOT', 'QUICK_SLANT', 'MESH', 'FOUR_VERTS'];
  const RUN_PLAYS: CanonicalPlayId[] = ['DUO', 'POWER_O', 'INSIDE_ZONE', 'OUTSIDE_ZONE', 'PIN_PULL'];
  const THIRD_LONG_PLAYS: CanonicalPlayId[] = ['DAGGER', 'FOUR_VERTS', 'MESH'];

  const passTelemetry: PlayTelemetry[] = [];
  const runTelemetry: PlayTelemetry[] = [];
  const thirdLongTelemetry: PlayTelemetry[] = [];
  const goalLinePassTelemetry: PlayTelemetry[] = [];
  const goalLineRunTelemetry: PlayTelemetry[] = [];

  const isFast = process.argv.includes('--fast');
  const repScale = isFast ? 0.5 : 1.0;
  const PASS_REPS = Math.max(4, Math.round(10 * repScale));
  const RUN_REPS = Math.max(4, Math.round(12 * repScale));
  const THIRD_REPS = Math.max(3, Math.round(8 * repScale));
  const GL_REPS = Math.max(4, Math.round(10 * repScale));
  const AUTOPSY_REPS = Math.max(3, Math.round(5 * repScale));
  const PB_REPS = Math.max(4, Math.round(8 * repScale));

  for (const prof of BASELINE_PHILOSOPHIES) {
    const profWeight = prof.id === 'CONV_11_SPREAD' ? 0.45 : prof.id === 'SHANAHAN_12_PA' ? 0.35 : 0.20;
    for (const pid of PASS_PLAYS) {
      // Match real ~80% straight dropback / 20% PA mix vs ~20% league PA share
      const playWeight =
        pid === 'PA_FLOOD' || pid === 'PA_UC_BOOT' ? 0.10 : 0.20;
      for (const df of OPEN_FRONTS) {
        const defW = LEAGUE_OPEN_DEF_WEIGHTS[df];
        if (defW <= 0) continue;
        for (let r = 0; r < PASS_REPS; r++) {
          passTelemetry.push(
            simulatePlayWithTelemetry(
              engine,
              buildBaselinePlay(prof, pid),
              buildModern2027Defense(df),
              profWeight * playWeight * defW
            )
          );
        }
      }
    }

    for (const pid of RUN_PLAYS) {
      for (const df of OPEN_FRONTS) {
        const defW = LEAGUE_OPEN_DEF_WEIGHTS[df];
        if (defW <= 0) continue;
        for (let r = 0; r < RUN_REPS; r++) {
          runTelemetry.push(
            simulatePlayWithTelemetry(
              engine,
              buildBaselinePlay(prof, pid),
              buildModern2027Defense(df),
              profWeight * defW
            )
          );
        }
      }
    }

    // 3rd & 7-11 sub-audit (~40% blitz fronts, matching 40.5% NFL blitz rate on 3rd & 7-11)
    const thirdLongFronts: [ModernDefFrontId, number][] = [
      ['NICKEL_OVER_C3', 0.22],
      ['DIME_QUARTERS_MATCH', 0.22],
      ['NICKEL_SIM_C2', 0.16],
      ['DIME_MUG_C0', 0.18],
      ['VIKINGS_MUG_CROSSDOG_C0', 0.12],
      ['VIKINGS_SAFETY_BLITZ_C1', 0.10],
    ];
    for (const pid of THIRD_LONG_PLAYS) {
      for (const [df, w] of thirdLongFronts) {
        for (let r = 0; r < THIRD_REPS; r++) {
          thirdLongTelemetry.push(
            simulatePlayWithTelemetry(
              engine,
              buildBaselinePlay(prof, pid),
              buildModern2027Defense(df),
              profWeight * w
            )
          );
        }
      }
    }
  }

  // Goal-Line <= 4y check against BASE_34_BEAR_C4 & GOAL_LINE_62_PINCH
  for (const prof of BASELINE_PHILOSOPHIES.slice(0, 2)) {
    for (const pid of ['QUICK_SLANT', 'MESH', 'PA_FLOOD'] as CanonicalPlayId[]) {
      for (const df of ['BASE_34_BEAR_C4', 'GOAL_LINE_62_PINCH'] as ModernDefFrontId[]) {
        for (let r = 0; r < GL_REPS; r++) {
          goalLinePassTelemetry.push(
            simulatePlayWithTelemetry(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df), 1.0, {
              yardLineToGoal: 4.0,
              sidelineObjective: 'NORMAL',
            })
          );
        }
      }
    }
    for (const pid of ['POWER_O', 'DUO', 'INSIDE_ZONE'] as CanonicalPlayId[]) {
      for (const df of ['BASE_34_BEAR_C4', 'GOAL_LINE_62_PINCH'] as ModernDefFrontId[]) {
        for (let r = 0; r < GL_REPS; r++) {
          goalLineRunTelemetry.push(
            simulatePlayWithTelemetry(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df), 1.0, {
              yardLineToGoal: 4.0,
              sidelineObjective: 'NORMAL',
            })
          );
        }
      }
    }
  }

  const tr = benchmarks.train_2022_2023;
  const ho = benchmarks.heldOut_2024;
  const ngs = benchmarks.ngsKinematics_2022_2023;

  const simPassAll = aggregatePass(passTelemetry);
  const simPass4Man = aggregatePass(passTelemetry.filter((r) => !r.isBlitz));
  const simPassBlitz = aggregatePass(passTelemetry.filter((r) => r.isBlitz));
  const simPassStraight = aggregatePass(passTelemetry.filter((r) => !r.isPlayAction));
  const simPassPA = aggregatePass(passTelemetry.filter((r) => r.isPlayAction));
  const simPassMan = aggregatePass(passTelemetry.filter((r) => r.coarseCov === 'MAN_COVERAGE'));
  const simPassZone = aggregatePass(passTelemetry.filter((r) => r.coarseCov === 'ZONE_COVERAGE'));
  const simThirdLong = aggregatePass(thirdLongTelemetry);

  const byShellSim: Record<string, AggregatedPassMetrics> = {};
  for (const sh of ['COVER_0', 'COVER_1', 'COVER_2', 'COVER_3', 'COVER_4'] as ShellType[]) {
    const sub = passTelemetry.filter((r) => r.shell === sh);
    if (sub.length > 0) byShellSim[sh] = aggregatePass(sub);
  }

  const simRushAll = aggregateRush(runTelemetry);
  const simRushLight = aggregateRush(runTelemetry.filter((r) => r.boxBucket === 'LIGHT_LE6'));
  const simRushNormal = aggregateRush(runTelemetry.filter((r) => r.boxBucket === 'NORMAL_7'));
  const simRushHeavy = aggregateRush(runTelemetry.filter((r) => r.boxBucket === 'HEAVY_GE8'));

  const simGoalLinePass = aggregatePass(goalLinePassTelemetry);
  const simGoalLineRun = aggregateRush(goalLineRunTelemetry);

  const allSampled = [
    ...passTelemetry,
    ...runTelemetry,
    ...thirdLongTelemetry,
    ...goalLinePassTelemetry,
    ...goalLineRunTelemetry,
  ];
  const legalityPassPct = +(100 * (allSampled.filter((r) => r.legalAll).length / allSampled.length)).toFixed(2);
  const maxG = Math.max(...allSampled.map((r) => r.maxUnengagedGForce));
  const minSep = Math.min(...allSampled.map((r) => r.minPlayerSepYds));

  console.log(`\n[Mode 2B: League-Weighted Passing & Line-Play Telemetry (N=${passTelemetry.length} simulated dropbacks)]`);
  console.log(formatLineDiff('Completion % (Att)', simPassAll.compPct, tr.dropbacks.nonScreenDropbacks.compPctOnAtt, ho.dropbacks.nonScreenDropbacks.compPctOnAtt, '%'));
  console.log(formatLineDiff('Sack % (DB)', simPassAll.sackPct, tr.dropbacks.nonScreenDropbacks.sackPct, ho.dropbacks.nonScreenDropbacks.sackPct, '%'));
  console.log(formatLineDiff('Pressure % (DB)', simPassAll.pressurePct, tr.dropbacks.nonScreenDropbacks.pressurePct, ho.dropbacks.nonScreenDropbacks.pressurePct, '%'));
  console.log(formatLineDiff('INT % (Att)', simPassAll.intPctOnAtt, tr.dropbacks.nonScreenDropbacks.intPctOnAtt, ho.dropbacks.nonScreenDropbacks.intPctOnAtt, '%'));
  console.log(formatLineDiff('Explosive 15+ %', simPassAll.explosive15Pct, tr.dropbacks.nonScreenDropbacks.explosive15Pct, ho.dropbacks.nonScreenDropbacks.explosive15Pct, '%'));
  console.log(formatLineDiff('Mean EPA / DB', simPassAll.meanEpa, tr.dropbacks.nonScreenDropbacks.meanEpa, ho.dropbacks.nonScreenDropbacks.meanEpa, ''));
  console.log(formatLineDiff('Time to Throw Mean', simPassAll.tttMean, tr.dropbacks.nonScreenDropbacks.timeToThrow?.mean ?? null, ho.dropbacks.nonScreenDropbacks.timeToThrow?.mean ?? null, 's'));
  console.log(formatLineDiff('Separation at Throw', simPassAll.sepAtThrowMean, ngs.receivingWeekly.avgSeparationYds.mean, null, 'y'));
  console.log(formatLineDiff('Pre-Snap Cushion', simPassAll.preSnapCushionMean, ngs.receivingWeekly.avgCushionYds.mean, null, 'y'));
  console.log(formatLineDiff('Mean Air Yards', simPassAll.meanAirYards, tr.dropbacks.nonScreenDropbacks.meanAirYards, ho.dropbacks.nonScreenDropbacks.meanAirYards, 'y'));
  console.log(formatLineDiff('Mean YAC on Comp', simPassAll.meanYacOnComp, tr.dropbacks.nonScreenDropbacks.meanYacOnComp, ho.dropbacks.nonScreenDropbacks.meanYacOnComp, 'y'));
  console.log(`  TTT Quantiles: Sim p25=${simPassAll.tttP25}s / p50=${simPassAll.tttP50}s / p75=${simPassAll.tttP75}s (NFL 22-23: 2.10 / 2.60 / 3.24s) | Flight=${simPassAll.flightDurationMean}s | Sep@Arr=${simPassAll.sepAtArrivalMean}y | OL Engaged=${simPassAll.olEngagedRateMean}% | MeanTTP=${simPassAll.timeToPressureMean}s`);

  console.log('\n[Line Play Splits: 4-Man Rush vs 5+ Blitz | Play-Action vs Straight Dropback | 3rd & 7-11]');
  console.log(formatLineDiff('4-Man Rush Sack %', simPass4Man.sackPct, tr.dropbacks.fourManOrFewerRush.sackPct, ho.dropbacks.fourManOrFewerRush.sackPct, '%'));
  console.log(formatLineDiff('4-Man Rush Press %', simPass4Man.pressurePct, tr.dropbacks.fourManOrFewerRush.pressurePct, ho.dropbacks.fourManOrFewerRush.pressurePct, '%'));
  console.log(formatLineDiff('Blitz (5+) Sack %', simPassBlitz.sackPct, tr.dropbacks.blitz5Plus.sackPct, ho.dropbacks.blitz5Plus.sackPct, '%'));
  console.log(formatLineDiff('Blitz (5+) Press %', simPassBlitz.pressurePct, tr.dropbacks.blitz5Plus.pressurePct, ho.dropbacks.blitz5Plus.pressurePct, '%'));
  console.log(formatLineDiff('Blitz (5+) EPA', simPassBlitz.meanEpa, tr.dropbacks.blitz5Plus.meanEpa, ho.dropbacks.blitz5Plus.meanEpa, ''));
  console.log(formatLineDiff('Straight DB Comp %', simPassStraight.compPct, tr.dropbacks.straightDropback.compPctOnAtt, ho.dropbacks.straightDropback.compPctOnAtt, '%'));
  console.log(formatLineDiff('Play-Action Comp %', simPassPA.compPct, tr.dropbacks.playAction.compPctOnAtt, ho.dropbacks.playAction.compPctOnAtt, '%'));
  console.log(formatLineDiff('Play-Action Expl15 %', simPassPA.explosive15Pct, tr.dropbacks.playAction.explosive15Pct, ho.dropbacks.playAction.explosive15Pct, '%'));
  console.log(formatLineDiff('Play-Action EPA', simPassPA.meanEpa, tr.dropbacks.playAction.meanEpa, ho.dropbacks.playAction.meanEpa, ''));
  console.log(formatLineDiff('3rd & 7-11 Sack %', simThirdLong.sackPct, tr.dropbacks.thirdAndLong_7to11.sackPct, ho.dropbacks.thirdAndLong_7to11.sackPct, '%'));
  console.log(formatLineDiff('3rd & 7-11 Comp %', simThirdLong.compPct, tr.dropbacks.thirdAndLong_7to11.compPctOnAtt, ho.dropbacks.thirdAndLong_7to11.compPctOnAtt, '%'));

  console.log('\n[Coverage Splits: Man vs Zone & Per-Shell Charted Breakdown]');
  console.log(formatLineDiff('MAN Comp % (Att)', simPassMan.compPct, tr.coverage.manVsZone.MAN_COVERAGE.compPctOnAtt, ho.coverage.manVsZone.MAN_COVERAGE.compPctOnAtt, '%'));
  console.log(formatLineDiff('ZONE Comp % (Att)', simPassZone.compPct, tr.coverage.manVsZone.ZONE_COVERAGE.compPctOnAtt, ho.coverage.manVsZone.ZONE_COVERAGE.compPctOnAtt, '%'));
  console.log(formatLineDiff('MAN INT % (Att)', simPassMan.intPctOnAtt, tr.coverage.manVsZone.MAN_COVERAGE.intPctOnAtt, ho.coverage.manVsZone.MAN_COVERAGE.intPctOnAtt, '%'));
  console.log(formatLineDiff('ZONE INT % (Att)', simPassZone.intPctOnAtt, tr.coverage.manVsZone.ZONE_COVERAGE.intPctOnAtt, ho.coverage.manVsZone.ZONE_COVERAGE.intPctOnAtt, '%'));
  console.log(formatLineDiff('MAN Sep at Throw', simPassMan.sepAtThrowMean, null, null, 'y'));
  console.log(formatLineDiff('ZONE Sep at Throw', simPassZone.sepAtThrowMean, null, null, 'y'));
  for (const sh of ['COVER_0', 'COVER_1', 'COVER_2', 'COVER_3', 'COVER_4'] as ShellType[]) {
    const sSim = byShellSim[sh];
    const sTr = tr.coverage.byCoverageType[sh];
    const sHo = ho.coverage.byCoverageType[sh];
    if (!sSim) continue;
    console.log(
      `  Shell[${sh}] (n=${sSim.n}): Comp=${sSim.compPct}% (NFL=${sTr?.compPctOnAtt}%/${sHo?.compPctOnAtt}%) | INT=${sSim.intPctOnAtt}% (${sTr?.intPctOnAtt}%) | Expl15=${sSim.explosive15Pct}% (${sTr?.explosive15Pct}%) | EPA=${sSim.meanEpa} (${sTr?.meanEpa}) | Sep=${sSim.sepAtThrowMean}y`
    );
  }

  console.log(`\n[Run Game & Trench Push Telemetry (N=${runTelemetry.length} designed rushes)]`);
  console.log(formatLineDiff('Rush Mean Yards', simRushAll.meanYards, tr.rushes.allDesignedRushes.meanYards, ho.rushes.allDesignedRushes.meanYards, 'y'));
  console.log(formatLineDiff('Rush Median Yards', simRushAll.medianYards, tr.rushes.allDesignedRushes.medianYards, ho.rushes.allDesignedRushes.medianYards, 'y'));
  console.log(formatLineDiff('Rush Stuff % (<=0y)', simRushAll.stuffPct, tr.rushes.allDesignedRushes.stuffPct, ho.rushes.allDesignedRushes.stuffPct, '%'));
  console.log(formatLineDiff('Rush Success % (>=4y)', simRushAll.successPct, tr.rushes.allDesignedRushes.successPct, ho.rushes.allDesignedRushes.successPct, '%'));
  console.log(formatLineDiff('Rush Explosive 15+ %', simRushAll.explosive15Pct, tr.rushes.allDesignedRushes.explosive15Pct, ho.rushes.allDesignedRushes.explosive15Pct, '%'));
  console.log(formatLineDiff('Light Box (<=6) YPC', simRushLight.meanYards, tr.rushes.lightBox_le6.meanYards, ho.rushes.lightBox_le6.meanYards, 'y'));
  console.log(formatLineDiff('Normal Box (7) YPC', simRushNormal.meanYards, tr.rushes.normalBox_7.meanYards, ho.rushes.normalBox_7.meanYards, 'y'));
  console.log(formatLineDiff('Heavy Box (8+) YPC', simRushHeavy.meanYards, tr.rushes.heavyBox_ge8.meanYards, ho.rushes.heavyBox_ge8.meanYards, 'y'));
  console.log(formatLineDiff('Heavy Box Stuff %', simRushHeavy.stuffPct, tr.rushes.heavyBox_ge8.stuffPct, ho.rushes.heavyBox_ge8.stuffPct, '%'));
  console.log(
    `  Goal-Line (4y): Pass Comp=${simGoalLinePass.compPct}% Sack=${simGoalLinePass.sackPct}% EPA=${simGoalLinePass.meanEpa} | Run YPC=${simGoalLineRun.meanYards}y Stuff=${simGoalLineRun.stuffPct}% EPA=${simGoalLineRun.meanEpa}`
  );

  // 4. MODE 2C: 8 Historical Autopsy Stress Checks
  console.log('\n[Mode 2C: 8 Historical Autopsy Games Stress Checks]');
  const autopsyResults: Record<string, unknown>[] = [];
  for (const ag of benchmarks.autopsyGames) {
    // Map authentic game coverage/blitz mix from empirical coverageCounts & blitzPct
    const isHeavyBlitz = (ag.dropbacksAll.blitzPct ?? 30) >= 45;
    const covCounts = ag.coverageCounts;
    const isHeavyQuarters = (covCounts.COVER_4 ?? 0) >= 12;
    const defMix: [ModernDefFrontId, number][] = isHeavyBlitz
      ? [
          ['VIKINGS_MUG_CROSSDOG_C0', 0.30],
          ['DIME_MUG_C0', 0.25],
          ['VIKINGS_SAFETY_BLITZ_C1', 0.25],
          ['BASE_34_BEAR_C4', 0.20],
        ]
      : isHeavyQuarters
      ? [
          ['DIME_QUARTERS_MATCH', 0.48],
          ['BASE_34_BEAR_C4', 0.25],
          ['NICKEL_SIM_C2', 0.15],
          ['NICKEL_OVER_C3', 0.12],
        ]
      : [
          ['NICKEL_OVER_C3', 0.30],
          ['NICKEL_UNDER_C1', 0.25],
          ['DIME_QUARTERS_MATCH', 0.25],
          ['NICKEL_SIM_C2', 0.20],
        ];

    const passRows: PlayTelemetry[] = [];
    const runRows: PlayTelemetry[] = [];
    const prof = BASELINE_PHILOSOPHIES[0];
    const offRoster = rawTeams[ag.offense];
    const defRoster = rawTeams[ag.defense];
    for (const [df, w] of defMix) {
      for (const pid of ['DAGGER', 'QUICK_SLANT', 'MESH', 'PA_FLOOD'] as CanonicalPlayId[]) {
        for (let r = 0; r < AUTOPSY_REPS; r++) {
          const off = buildBaselinePlay(prof, pid);
          const def = buildModern2027Defense(df);
          applyTeamRosterToAgents(off, def, offRoster, defRoster);
          passRows.push(simulatePlayWithTelemetry(engine, off, def, w));
        }
      }
      for (const pid of ['INSIDE_ZONE', 'OUTSIDE_ZONE', 'DUO'] as CanonicalPlayId[]) {
        for (let r = 0; r < AUTOPSY_REPS; r++) {
          const off = buildBaselinePlay(prof, pid);
          const def = buildModern2027Defense(df);
          applyTeamRosterToAgents(off, def, offRoster, defRoster);
          runRows.push(simulatePlayWithTelemetry(engine, off, def, w));
        }
      }
    }
    const apPass = aggregatePass(passRows);
    const apRun = aggregateRush(runRows);
    console.log(
      `  ${ag.gameId.padEnd(16)} (${ag.finalScore.padEnd(16)}): Sim Comp=${apPass.compPct}% (Act=${ag.dropbacksAll.compPctOnAtt}%) | Sack=${apPass.sackPct}% (Act=${ag.dropbacksAll.sackPct}%) | BlitzSack=${aggregatePass(passRows.filter((x) => x.isBlitz)).sackPct}% (Act=${ag.dropbacksVsBlitz.sackPct}%) | Rush=${apRun.meanYards}y (Act=${ag.designedRushes.meanYards}y)`
    );
    autopsyResults.push({
      gameId: ag.gameId,
      actual: {
        compPct: ag.dropbacksAll.compPctOnAtt,
        sackPct: ag.dropbacksAll.sackPct,
        rushYpc: ag.designedRushes.meanYards,
      },
      simulated: {
        compPct: apPass.compPct,
        sackPct: apPass.sackPct,
        pressPct: apPass.pressurePct,
        rushYpc: apRun.meanYards,
        rushStuffPct: apRun.stuffPct,
      },
    });
  }

  // 5. MODE 2D (Stage 4 Prep): Playbook Cross-Audit (APEX, HYDRA, ARGON, Baseline SHANAHAN/CONV)
  console.log('\n[Mode 2D: Playbook Performance & Legality Audit Across LEAGUE_OPEN_DEF_WEIGHTS]');
  const evalPlay = (name: string, builder: () => SimAgent[]) => {
    const rows: PlayTelemetry[] = [];
    for (const df of OPEN_FRONTS) {
      const w = LEAGUE_OPEN_DEF_WEIGHTS[df];
      if (w <= 0) continue;
      for (let r = 0; r < PB_REPS; r++) {
        rows.push(simulatePlayWithTelemetry(engine, builder(), buildModern2027Defense(df), w));
      }
    }
    const totalW = rows.reduce((a, b) => a + b.weight, 0);
    const epa = +(rows.reduce((a, b) => a + b.epa * b.weight, 0) / totalW).toFixed(4);
    const yds = +(rows.reduce((a, b) => a + b.yards * b.weight, 0) / totalW).toFixed(2);
    const legal = rows.every((r) => r.legalAll);
    const maxUnengG = Math.max(...rows.map((r) => r.maxUnengagedGForce));
    const minSepP = Math.min(...rows.map((r) => r.minPlayerSepYds));
    return { name, epa, yds, legal, maxUnengG, minSepP };
  };

  const omegaAudits = OMEGA_2027_PLAYBOOK.map((p) => evalPlay(p.id, p.buildOffense));
  const apexAudits = APEX_2027_PLAYBOOK.map((p) => evalPlay(p.id, p.buildOffense));
  const hydraAudits = HYDRA_2027_PLAYBOOK.map((p) => evalPlay(p.id, p.buildOffense));
  const argonAudits = ARGON_2027_PLAYBOOK.map((p) => evalPlay(p.id, p.buildOffense));

  const meanArr = (arr: number[]) => +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4);
  console.log(`  OMEGA Mean Open-Field EPA:  ${meanArr(omegaAudits.map((x) => x.epa))} (${omegaAudits.map((x) => `${x.name.replace('OMEGA_', '')}:${x.epa}`).join(' | ')})`);
  console.log(`  APEX Mean Open-Field EPA:   ${meanArr(apexAudits.map((x) => x.epa))} (${apexAudits.map((x) => `${x.name.replace('APEX_', '')}:${x.epa}`).join(' | ')})`);
  console.log(`  HYDRA Mean Open-Field EPA:  ${meanArr(hydraAudits.map((x) => x.epa))}`);
  console.log(`  ARGON Mean Open-Field EPA:  ${meanArr(argonAudits.map((x) => x.epa))}`);
  console.log(`  CONV_11 Pass/Run Mean EPA:  Pass=${simPassAll.meanEpa} | Run=${simRushAll.meanEpa}`);
  console.log(`\n[Biomechanics & Legality Gate] LegalSnaps=${legalityPassPct}% | MaxUnengagedG=${maxG}G (Limit<=1.60G) | MinPlayerSep=${minSep}y (Limit>=0.20y)`);

  // Save report & compare against saved baseline if it exists
  const reportObj = {
    generatedAt: new Date().toISOString(),
    bdb10Hz: bdbRes,
    kinematicsAudit: kinAudit,
    simulatedVsEmpirical: {
      passAll: simPassAll,
      pass4Man: simPass4Man,
      passBlitz: simPassBlitz,
      passStraight: simPassStraight,
      passPlayAction: simPassPA,
      passMan: simPassMan,
      passZone: simPassZone,
      thirdAndLong: simThirdLong,
      byShell: byShellSim,
      rushAll: simRushAll,
      rushLight: simRushLight,
      rushNormal: simRushNormal,
      rushHeavy: simRushHeavy,
      goalLinePass: simGoalLinePass,
      goalLineRun: simGoalLineRun,
    },
    autopsyResults,
    playbookAudits: {
      omegaMeanEpa: meanArr(omegaAudits.map((x) => x.epa)),
      apexMeanEpa: meanArr(apexAudits.map((x) => x.epa)),
      hydraMeanEpa: meanArr(hydraAudits.map((x) => x.epa)),
      argonMeanEpa: meanArr(argonAudits.map((x) => x.epa)),
      omegaPlays: omegaAudits,
      apexPlays: apexAudits,
      hydraPlays: hydraAudits,
      argonPlays: argonAudits,
    },
    legalityAndBiomechanics: {
      legalityPassPct,
      maxUnengagedGForce: maxG,
      minPlayerSepYds: minSep,
    },
  };

  const dataDir = path.join(process.cwd(), 'src', 'data');
  const reportPath = path.join(dataDir, 'tracking_validation_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportObj, null, 2), 'utf8');

  const baselinePath = path.join(dataDir, 'tracking_validation_baseline.json');
  if (isBaselineSave) {
    fs.writeFileSync(baselinePath, JSON.stringify(reportObj, null, 2), 'utf8');
    console.log(`[Saved Stage 1 Baseline] -> ${baselinePath}`);
  } else if (fs.existsSync(baselinePath)) {
    const base = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const basePlays = new Map<string, number>(
      (base.playbookAudits?.apexPlays ?? []).map((p: { name: string; epa: number }) => [p.name, p.epa])
    );
    console.log('\n[Stage 4 Baseline -> Calibrated Delta Check (Artifact Flag >= 0.150 EPA drop)]');
    for (const ap of apexAudits) {
      const oldEpa = basePlays.get(ap.name);
      if (oldEpa !== undefined) {
        const delta = +(ap.epa - oldEpa).toFixed(4);
        const flag = delta <= -0.15 ? ' [ARTIFACT_FLAG]' : '';
        console.log(`  ${ap.name.padEnd(34)} Before=${oldEpa} -> After=${ap.epa} (Δ=${delta >= 0 ? '+' : ''}${delta})${flag}`);
      }
    }
  }
  console.log(`[Saved Validation Report] -> ${reportPath}`);
}

runTrackingAndChartedValidation().catch((err) => {
  console.error('[Validation Error]', err);
  process.exit(1);
});
