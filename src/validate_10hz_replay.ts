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
  timeToPressureSec: number | null;
  pocketIntegrityMin: number;
  separationAtThrowYds: number | null;
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
  sepAtThrowMean: number;
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
    const isTrueBoxPos = ['DE', 'DT', 'NT', 'EDGE', 'LB', 'ILB', 'MLB', 'WLB', 'SLB', 'OLB', 'LOLB', 'ROLB', 'WILL', 'MIKE', 'SAM'].includes(d.pos);
    const isDownDl = ['DE', 'DT', 'NT', 'EDGE', 'LOLB', 'ROLB'].includes(d.pos) && d.y <= 1.2;
    if (isDownDl) downDlBox++;
    if (Math.abs(d.x) <= 6.5 && d.y <= 5.5 && (isTrueBoxPos || (Math.abs(d.x) <= 5.8 && r !== 'MAN_COV'))) {
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
  else if (deepHalf >= 2) shell = 'COVER_2';
  else if (deepThird >= 2) shell = 'COVER_3';
  else if (manCount >= 3 && deepZone >= 1) shell = 'COVER_1';
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

  // Pre-snap cushion across outer/slot receivers at snap
  const recIds0 = snap0.agents
    .filter((a) => a.side === 'OFF' && (a.assignment.role === 'ROUTE' || a.assignment.role === 'CHIP_RELEASE'))
    .map((r) => {
      let minD = 99;
      for (const d of snap0.agents) {
        if (d.side !== 'DEF') continue;
        const dist = Math.hypot(d.x - r.x, d.y - r.y);
        if (dist < minD) minD = dist;
      }
      return minD;
    });
  const preSnapCushionYds =
    recIds0.length > 0 ? recIds0.reduce((a, b) => a + b, 0) / recIds0.length : null;

  let minPocket = 100;
  let timeToFirstPressureSec: number | null = null;
  let throwSnap: PlayTickSnapshot | null = null;
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
    if (timeToFirstPressureSec === null && (snap.pocketIntegrity < 52 || snap.terminationReason === 'SACK')) {
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
  let airYards: number | null = null;
  if (throwSnap && throwSnap.ball?.targetReceiverId) {
    const tid = throwSnap.ball.targetReceiverId;
    const rec = throwSnap.agents.find((a) => a.id === tid);
    airYards = throwSnap.ball.targetY ?? (rec ? rec.y : null);
    if (rec) {
      let minD = 99;
      for (const d of throwSnap.agents) {
        if (d.side !== 'DEF') continue;
        const dist = Math.hypot(d.x - rec.x, d.y - rec.y);
        if (dist < minD) minD = dist;
      }
      if (minD < 99) separationAtThrowYds = minD;
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
    timeToPressureSec: timeToFirstPressureSec,
    pocketIntegrityMin: minPocket,
    separationAtThrowYds,
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
  const sepItems = dropbacks
    .filter((r) => r.separationAtThrowYds !== null)
    .map((r) => ({ v: r.separationAtThrowYds as number, w: r.weight }));
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
    sepAtThrowMean: +weightedMean(sepItems).toFixed(3),
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
      inQuotes = !inQuotes;
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

async function runBdb10HzMode(engine: All22KinematicEngine): Promise<{
  status: 'BDB_10HZ_SKIPPED_CREDENTIALS_MISSING' | 'BDB_10HZ_EXECUTED';
  filesDetected: number;
  kinematicsSummary?: Record<string, { n: number; p95SpeedYps: number; p95AccelYps2: number }>;
  replayChecks?: {
    playsReplayed: number;
    l1PocketDepthMaeYds: number | null;
    l3RunDispMaeYds: number | null;
    c1ShellDriftMaeYds: number | null;
    c2ManSepRmseYds: number | null;
  };
}> {
  const bdbRoot = path.join(process.cwd(), 'data', 'bdb');
  const allCsvs = findTrackingCsvs(bdbRoot);
  const trackingFiles = allCsvs.filter((f) => {
    const bn = path.basename(f).toLowerCase();
    return bn.includes('tracking') || bn.startsWith('week') || bn.startsWith('input_');
  });

  if (trackingFiles.length === 0) {
    console.log('\n[Mode 1: BDB 10 Hz Frame Replay] STATUS: BDB_10HZ_SKIPPED_CREDENTIALS_MISSING');
    console.log('  - No Kaggle 10 Hz CSVs present in data/bdb/{bdb2023,bdb2025,bdb2026}.');
    console.log('  - Sanctioned unlock path: place ~/.kaggle/kaggle.json (accept competition rules on Kaggle),');
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

  const kinematicsSummary: Record<string, { n: number; p95SpeedYps: number; p95AccelYps2: number }> = {};
  for (const [pos, arr] of Object.entries(posKinematics)) {
    const sSorted = [...arr.s].sort((x, y) => x - y);
    const aSorted = [...arr.a].sort((x, y) => x - y);
    kinematicsSummary[pos] = {
      n: arr.s.length,
      p95SpeedYps: +(sSorted[Math.floor(sSorted.length * 0.95)] || 0).toFixed(2),
      p95AccelYps2: +(aSorted[Math.floor(aSorted.length * 0.95)] || 0).toFixed(2),
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
      l3RunDispMaeYds: null,
      c1ShellDriftMaeYds:
        shellDrifts.length > 0 ? +(shellDrifts.reduce((a, b) => a + b, 0) / shellDrifts.length).toFixed(2) : null,
      c2ManSepRmseYds: null,
    },
  };
}

// ============================================================================
// MODE 2: NFLVERSE EMPIRICAL TELEMETRY AUDIT & STAGE 4 RE-AUDIT
// ============================================================================
function auditRosterKinematics(engine: All22KinematicEngine) {
  const teamsPath = path.join(process.cwd(), 'src', 'data', 'nfl_teams_32.json');
  const rawTeams = JSON.parse(fs.readFileSync(teamsPath, 'utf8')) as Record<
    string,
    {
      offense: { label: string; name: string; ratings: Record<string, number>; scouting?: { fortyYdDash?: number; ngsMaxSpeedMph?: number; weightLbs?: number } }[];
      defense: { label: string; name: string; ratings: Record<string, number>; scouting?: { fortyYdDash?: number; ngsMaxSpeedMph?: number; weightLbs?: number } }[];
    }
  >;

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

  // Also empirically measure Engine 0->10y split & max speed for rating profiles in a clean sprint
  const measureSprint = (pos: string, speedRating: number, accelRating: number, weightLbs?: number) => {
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
    let t10y: number | null = null;
    for (const snap of traj) {
      const a = snap.agents.find((ag) => ag.id === 'TEST_RUNNER');
      if (!a) continue;
      const v = Math.hypot(a.vx, a.vy);
      if (v > maxV) maxV = v;
      if (t10y === null && a.y - off.startY >= 10.0) t10y = snap.timeSec;
    }
    return {
      pos,
      weightLbs,
      speedRating,
      accelRating,
      simMaxYps: +maxV.toFixed(2),
      simMaxMph: +(maxV * 2.04545).toFixed(2),
      sim10YdSplitSec: t10y !== null ? +t10y.toFixed(2) : null,
    };
  };

  const sprintProbes = [
    measureSprint('WR', 92, 92, 192),
    measureSprint('CB', 92, 91, 197),
    measureSprint('FS', 83, 83, 205),
    measureSprint('RB', 89, 89, 217),
    measureSprint('LB', 82, 82, 234),
    measureSprint('TE', 81, 81, 249),
    measureSprint('EDGE', 80, 80, 262),
    measureSprint('LT', 71, 71, 311),
    measureSprint('DT', 73, 73, 305),
  ];

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

  // 2. MODE 2A: Roster & Positional Kinematics Envelope Audit
  const kinAudit = auditRosterKinematics(engine);
  console.log('\n[Mode 2A: Roster & Engine Kinematics Audit (32 NFL Teams + Sprint Envelope)]');
  for (const s of kinAudit.sprintProbes) {
    console.log(
      `  Sprint[${s.pos.padEnd(4)} spd=${s.speedRating} acc=${s.accelRating}] => SimMax=${s.simMaxYps} yd/s (${s.simMaxMph} mph) | 10ySplit=${s.sim10YdSplitSec}s`
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
  console.log(`  TTT Quantiles: Sim p25=${simPassAll.tttP25}s / p50=${simPassAll.tttP50}s / p75=${simPassAll.tttP75}s (NFL 22-23: 2.10 / 2.60 / 3.24s) | OL Engaged=${simPassAll.olEngagedRateMean}% | MeanTTP=${simPassAll.timeToPressureMean}s`);

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
    for (const [df, w] of defMix) {
      for (const pid of ['DAGGER', 'QUICK_SLANT', 'MESH', 'PA_FLOOD'] as CanonicalPlayId[]) {
        for (let r = 0; r < AUTOPSY_REPS; r++) {
          passRows.push(simulatePlayWithTelemetry(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df), w));
        }
      }
      for (const pid of ['INSIDE_ZONE', 'OUTSIDE_ZONE', 'DUO'] as CanonicalPlayId[]) {
        for (let r = 0; r < AUTOPSY_REPS; r++) {
          runRows.push(simulatePlayWithTelemetry(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df), w));
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

  const apexAudits = APEX_2027_PLAYBOOK.map((p) => evalPlay(p.id, p.buildOffense));
  const hydraAudits = HYDRA_2027_PLAYBOOK.map((p) => evalPlay(p.id, p.buildOffense));
  const argonAudits = ARGON_2027_PLAYBOOK.map((p) => evalPlay(p.id, p.buildOffense));

  const meanArr = (arr: number[]) => +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4);
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
      apexMeanEpa: meanArr(apexAudits.map((x) => x.epa)),
      hydraMeanEpa: meanArr(hydraAudits.map((x) => x.epa)),
      argonMeanEpa: meanArr(argonAudits.map((x) => x.epa)),
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
