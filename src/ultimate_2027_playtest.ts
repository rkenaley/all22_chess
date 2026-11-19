import * as fs from 'fs';
import * as path from 'path';
import {
  All22KinematicEngine,
  SimAgent,
  SimFieldContext,
} from './engine';
import {
  BaselineRosterProfile,
  CanonicalPlayId,
  BASELINE_PHILOSOPHIES,
  buildBaselinePlay,
  LEAGUE_OPEN_DEF_WEIGHTS,
} from './canonical_baselines';
import {
  HYDRA_2027_PLAYBOOK,
  HYDRA_ACTIVE_11_CAP_M,
  MODERN_2027_DEF_FRONTS,
  ModernDefFrontId,
  buildModern2027Defense,
} from './vanguard_2027_playbook';
import {
  ARGON_2027_PLAYBOOK,
  ARGON_ACTIVE_11_CAP_M,
} from './argon_2027_playbook';
import {
  APEX_2027_PLAYBOOK,
  APEX_ACTIVE_11_CAP_M,
} from './apex_2027_playbook';
import {
  OMEGA_2027_PLAYBOOK,
  OMEGA_2027_ROSTER,
  OMEGA_ACTIVE_11_CAP_M,
  OMEGA_12PERS_CAP_M,
  OMEGA_21PERS_CAP_M,
} from './ultimate_2027_offense';

interface SampledPlayOutcome {
  yards: number;
  epa: number;
  durationSec: number;
  reason:
    | 'SACK'
    | 'TACKLED'
    | 'COMPLETE'
    | 'INCOMPLETE'
    | 'INTERCEPTION'
    | 'TOUCHDOWN'
    | 'OUT_OF_BOUNDS'
    | 'WHISTLE'
    | 'FUMBLE_LOST'
    | 'FUMBLE_RECOVERED';
  optionPassFired: boolean;
  backwardTossFired: boolean;
  forwardPassThrown: boolean;
  pressured: boolean;
  legal7OnLos: boolean;
  legalUncoveredEnds: boolean;
  legalIneligibleOlBuffer: boolean;
  legalBackwardLateralsOnly: boolean;
  maxUnengagedGForce: number;
  minPlayerSepYds: number;
}

function simulateAndAuditPlay(
  engine: All22KinematicEngine,
  offAgents: SimAgent[],
  defAgents: SimAgent[],
  fieldContext?: SimFieldContext
): SampledPlayOutcome {
  const olPos = ['LT', 'LG', 'C', 'RG', 'RT'];
  const onLos = offAgents
    .filter((a) => a.startY >= -0.55 && a.startY <= -0.15)
    .sort((a, b) => a.startX - b.startX);
  const legal7OnLos = onLos.length >= 7;
  const legalUncoveredEnds =
    onLos.length === 7 &&
    !olPos.includes(onLos[0].pos) &&
    !olPos.includes(onLos[onLos.length - 1].pos);

  const traj = engine.simulatePlay([...offAgents, ...defAgents], 1.0, fieldContext);
  const term = traj.find((s) => s.playOver) || traj[traj.length - 1];

  let optionPassFired = false;
  let backwardTossFired = false;
  let forwardPassThrown = false;
  let legalIneligibleOlBuffer = true;
  let legalBackwardLateralsOnly = true;
  let minPocket = 100;
  let maxUnengagedGForce = 0;
  let minPlayerSepYds = 99;

  for (let i = 0; i < traj.length; i++) {
    const snap = traj[i];
    if (snap.pocketIntegrity < minPocket) minPocket = snap.pocketIntegrity;
    if (snap.exoticEvent === 'OPTION_PASS') optionPassFired = true;
    if (snap.exoticEvent === 'BACKWARD_TOSS') backwardTossFired = true;
    if (snap.ball?.forwardPassThrown) forwardPassThrown = true;

    const prevSnap = i > 0 ? traj[i - 1] : null;
    const prevBall = prevSnap?.ball;
    if (
      snap.ball?.state === 'IN_FLIGHT' &&
      !snap.ball.isLateral &&
      prevBall?.state !== 'IN_FLIGHT'
    ) {
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

  const fallbackCarrier = term.agents.find(
    (a) => a.side === 'OFF' && (a.id === term.ball?.carrierId || a.assignment.role === 'BALL_CARRIER')
  );
  const resolvedYards =
    term.carrierTackledYards ??
    (term.ball?.state === 'HELD' && fallbackCarrier ? +fallbackCarrier.y.toFixed(2) : 0);

  return {
    yards: resolvedYards,
    epa: term.expectedEpa,
    durationSec: term.timeSec,
    reason: (term.terminationReason as SampledPlayOutcome['reason']) || 'WHISTLE',
    optionPassFired,
    backwardTossFired,
    forwardPassThrown,
    pressured: minPocket < 45 || term.terminationReason === 'SACK',
    legal7OnLos,
    legalUncoveredEnds,
    legalIneligibleOlBuffer,
    legalBackwardLateralsOnly,
    maxUnengagedGForce: +maxUnengagedGForce.toFixed(3),
    minPlayerSepYds: +minPlayerSepYds.toFixed(3),
  };
}

function solveZeroSumNash(payoffMatrix: number[][], iterations = 8000): {
  nashValue: number;
  offWeights: number[];
  defWeights: number[];
} {
  const M = payoffMatrix.length;
  const N = payoffMatrix[0].length;
  const offCumRegret = new Array(M).fill(0);
  const defCumRegret = new Array(N).fill(0);
  const offStrategySum = new Array(M).fill(0);
  const defStrategySum = new Array(N).fill(0);

  let p = new Array(M).fill(1 / M);
  let q = new Array(N).fill(1 / N);

  for (let t = 1; t <= iterations; t++) {
    for (let i = 0; i < M; i++) offStrategySum[i] += p[i];
    for (let j = 0; j < N; j++) defStrategySum[j] += q[j];

    let gameVal = 0;
    const rowPayoffs = new Array(M).fill(0);
    const colPayoffs = new Array(N).fill(0);

    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        const u = payoffMatrix[i][j];
        rowPayoffs[i] += q[j] * u;
        colPayoffs[j] += p[i] * u;
        gameVal += p[i] * q[j] * u;
      }
    }

    for (let i = 0; i < M; i++) offCumRegret[i] = Math.max(0, offCumRegret[i] + (rowPayoffs[i] - gameVal));
    for (let j = 0; j < N; j++) defCumRegret[j] = Math.max(0, defCumRegret[j] + (gameVal - colPayoffs[j]));

    const sumOffReg = offCumRegret.reduce((a, b) => a + b, 0);
    const sumDefReg = defCumRegret.reduce((a, b) => a + b, 0);

    p = sumOffReg > 1e-9 ? offCumRegret.map((r) => r / sumOffReg) : new Array(M).fill(1 / M);
    q = sumDefReg > 1e-9 ? defCumRegret.map((r) => r / sumDefReg) : new Array(N).fill(1 / N);
  }

  const offWeights = offStrategySum.map((s) => s / iterations);
  const defWeights = defStrategySum.map((s) => s / iterations);
  let nashValue = 0;
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      nashValue += offWeights[i] * defWeights[j] * payoffMatrix[i][j];
    }
  }
  return { nashValue, offWeights, defWeights };
}

function fieldGoalMakeProbability(yardLineToGoal: number): number {
  const kickDist = yardLineToGoal + 17;
  if (kickDist <= 32) return 0.97;
  if (kickDist <= 39) return 0.93;
  if (kickDist <= 47) return 0.84;
  if (kickDist <= 53) return 0.72;
  if (kickDist <= 58) return 0.56;
  return 0.0;
}

function sampleWeightedIndex(weights: number[]): number {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r <= acc) return i;
  }
  return weights.length - 1;
}

type SchemeMode = 'OMEGA' | 'APEX' | 'ARGON' | 'HYDRA' | 'BASELINE';

export function runUltimate2027Playtest(): void {
  console.log('===============================================================================================================');
  console.log(' 2027 OMEGA CONTINUUM — BDB-2027 CALIBRATED ULTIMATE OFFENSE & 7-WAY BENCHMARK');
  console.log(` Calibrated 20 Hz Physics | Non-All-Star Roster ($${OMEGA_ACTIVE_11_CAP_M}M 11-Pers / $${OMEGA_12PERS_CAP_M}M 12-Pers / $${OMEGA_21PERS_CAP_M}M 21-Pers)`);
  console.log('===============================================================================================================\n');

  const engine = new All22KinematicEngine();
  const OPEN_FRONTS = MODERN_2027_DEF_FRONTS.filter((f) => f !== 'GOAL_LINE_62_PINCH');

  // --------------------------------------------------------------------------
  // PHASE 1: SIMULATE ALL 8 OMEGA PLAYS ACROSS ALL 10 DEFENSES + LEGALITY + BIO
  // --------------------------------------------------------------------------
  const omegaPool: Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>> = {};
  const omegaContextPool: Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>> = {};

  let totalOmegaSnaps = 0;
  let legal7Count = 0;
  let legalUncoveredCount = 0;
  let legalOlBufCount = 0;
  let legalBackLatCount = 0;
  let bioViolationsG = 0;
  let bioViolationsOverlap = 0;
  let maxObservedG = 0;
  let minObservedSep = 99;

  const auditSnap = (res: SampledPlayOutcome) => {
    totalOmegaSnaps++;
    if (res.legal7OnLos) legal7Count++;
    if (res.legalUncoveredEnds) legalUncoveredCount++;
    if (res.legalIneligibleOlBuffer) legalOlBufCount++;
    if (res.legalBackwardLateralsOnly) legalBackLatCount++;
    if (res.maxUnengagedGForce > 1.60) bioViolationsG++;
    if (res.minPlayerSepYds < 0.20) bioViolationsOverlap++;
    if (res.maxUnengagedGForce > maxObservedG) maxObservedG = res.maxUnengagedGForce;
    if (res.minPlayerSepYds < minObservedSep) minObservedSep = res.minPlayerSepYds;
  };

  console.log('[Phase 1] Running 20 Hz Kinematic Monte Carlo (N=50/cell) & Legality/Biomechanical Audit for OMEGA 2027...');
  for (const op of OMEGA_2027_PLAYBOOK) {
    omegaPool[op.id] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
    const baseCtx: SimFieldContext | undefined =
      op.id === 'OMEGA_GOALLINE_SPRINT_SMASH'
        ? { yardLineToGoal: 4.0, sidelineObjective: 'NORMAL' }
        : op.id === 'OMEGA_2MIN_BOUNDARY_OOB'
        ? { sidelineObjective: 'STOP_CLOCK_OOB' }
        : op.id === 'OMEGA_11V11_RHINO_PIN_PULL'
        ? { sidelineObjective: 'STAY_INBOUNDS' }
        : undefined;

    for (const df of MODERN_2027_DEF_FRONTS) {
      const outcomes: SampledPlayOutcome[] = [];
      for (let k = 0; k < 50; k++) {
        const res = simulateAndAuditPlay(engine, op.buildOffense(), buildModern2027Defense(df), baseCtx);
        outcomes.push(res);
        auditSnap(res);
      }
      omegaPool[op.id][df] = outcomes;
    }

    if (op.menuBuckets.includes('TWO_MINUTE')) {
      const key = `${op.id}__2MIN`;
      omegaContextPool[key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of OPEN_FRONTS) {
        omegaContextPool[key][df] = [];
        for (let k = 0; k < 35; k++) {
          const res = simulateAndAuditPlay(engine, op.buildOffense(), buildModern2027Defense(df), {
            sidelineObjective: 'STOP_CLOCK_OOB',
          });
          omegaContextPool[key][df].push(res);
          auditSnap(res);
        }
      }
    }
    if (op.menuBuckets.includes('FOUR_MINUTE')) {
      const key = `${op.id}__4MIN`;
      omegaContextPool[key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of OPEN_FRONTS) {
        omegaContextPool[key][df] = [];
        for (let k = 0; k < 35; k++) {
          const res = simulateAndAuditPlay(engine, op.buildOffense(), buildModern2027Defense(df), {
            sidelineObjective: 'STAY_INBOUNDS',
          });
          omegaContextPool[key][df].push(res);
          auditSnap(res);
        }
      }
    }
    if (op.menuBuckets.includes('GOAL_LINE')) {
      const key = `${op.id}__GL4`;
      omegaContextPool[key] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ModernDefFrontId[]) {
        omegaContextPool[key][df] = [];
        for (let k = 0; k < 45; k++) {
          const res = simulateAndAuditPlay(engine, op.buildOffense(), buildModern2027Defense(df), {
            yardLineToGoal: 4.0,
            sidelineObjective: 'NORMAL',
          });
          omegaContextPool[key][df].push(res);
          auditSnap(res);
        }
      }
    }
  }

  console.log(
    `  -> Audited ${totalOmegaSnaps} OMEGA 2027 20 Hz snaps:` +
      `\n     Legality:     7-on-LOS=${((legal7Count / totalOmegaSnaps) * 100).toFixed(2)}% | Uncovered Ends=${((legalUncoveredCount / totalOmegaSnaps) * 100).toFixed(2)}% | OL Buffer=${((legalOlBufCount / totalOmegaSnaps) * 100).toFixed(2)}% | Back-Lat=${((legalBackLatCount / totalOmegaSnaps) * 100).toFixed(2)}%` +
      `\n     Biomechanics: Unengaged >1.60G=${bioViolationsG} (peak ${maxObservedG.toFixed(2)}G) | Overlap <0.20y=${bioViolationsOverlap} (min ${minObservedSep.toFixed(2)}y)\n`
  );

  interface OmegaPlayTelemetry {
    id: string;
    name: string;
    personnel: string;
    category: 'PASS' | 'RUN';
    menuBuckets: string[];
    featuredDefense: string;
    overallMeanYards: number;
    overallMeanEpa: number;
    successRatePct: number;
    explosiveRatePct: number;
    sackRatePct: number;
    turnoverRatePct: number;
    optPassRatePct: number;
    epaByDefense: Record<string, number>;
  }

  const omegaTelemetrySummary: OmegaPlayTelemetry[] = [];
  console.log('--- 2027 OMEGA CONTINUUM: 8-PLAY CALIBRATED TELEMETRY ---');
  console.log(
    'Play Concept'.padEnd(46) +
      'Pers'.padEnd(9) +
      'Yds/P'.padEnd(8) +
      'EPA/P'.padEnd(9) +
      'Succ%'.padEnd(8) +
      'Expl%'.padEnd(8) +
      'Sack%'.padEnd(8) +
      'TO%'.padEnd(8) +
      'Featured Matchup'
  );
  console.log('-'.repeat(120));

  for (const op of OMEGA_2027_PLAYBOOK) {
    const frontsToEval = op.id === 'OMEGA_GOALLINE_SPRINT_SMASH' ? (['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ModernDefFrontId[]) : OPEN_FRONTS;
    const allSamples: SampledPlayOutcome[] = [];
    const epaByDef: Record<string, number> = {};
    for (const df of MODERN_2027_DEF_FRONTS) {
      const arr = omegaPool[op.id][df];
      epaByDef[df] = +(arr.reduce((s, r) => s + r.epa, 0) / arr.length).toFixed(3);
      if (frontsToEval.includes(df)) allSamples.push(...arr);
    }

    const n = allSamples.length;
    const meanYds = allSamples.reduce((s, r) => s + r.yards, 0) / n;
    const meanEpa = allSamples.reduce((s, r) => s + r.epa, 0) / n;
    const succPct = (allSamples.filter((r) => (r.epa > 0 || r.yards >= 4.0) && r.reason !== 'INTERCEPTION' && r.reason !== 'FUMBLE_LOST').length / n) * 100;
    const explPct = (allSamples.filter((r) => r.yards >= 15.0).length / n) * 100;
    const sackPct = (allSamples.filter((r) => r.reason === 'SACK').length / n) * 100;
    const toPct = (allSamples.filter((r) => r.reason === 'INTERCEPTION' || r.reason === 'FUMBLE_LOST').length / n) * 100;
    const optPassPct = (allSamples.filter((r) => r.optionPassFired).length / n) * 100;

    omegaTelemetrySummary.push({
      id: op.id,
      name: op.name,
      personnel: op.personnel,
      category: op.category,
      menuBuckets: op.menuBuckets,
      featuredDefense: op.featuredDefense,
      overallMeanYards: +meanYds.toFixed(2),
      overallMeanEpa: +meanEpa.toFixed(3),
      successRatePct: +succPct.toFixed(1),
      explosiveRatePct: +explPct.toFixed(1),
      sackRatePct: +sackPct.toFixed(1),
      turnoverRatePct: +toPct.toFixed(1),
      optPassRatePct: +optPassPct.toFixed(1),
      epaByDefense: epaByDef,
    });

    const fEpa = epaByDef[op.featuredDefense];
    console.log(
      op.id.padEnd(46) +
        op.personnel.padEnd(9) +
        meanYds.toFixed(1).padEnd(8) +
        `${meanEpa >= 0 ? '+' : ''}${meanEpa.toFixed(3)}`.padEnd(9) +
        `${succPct.toFixed(1)}%`.padEnd(8) +
        `${explPct.toFixed(1)}%`.padEnd(8) +
        `${sackPct.toFixed(1)}%`.padEnd(8) +
        `${toPct.toFixed(1)}%`.padEnd(8) +
        `${op.featuredDefense} (${fEpa >= 0 ? '+' : ''}${fEpa.toFixed(2)})`
    );
  }
  console.log('');

  // --------------------------------------------------------------------------
  // PHASE 2: SIMULATE APEX, ARGON, HYDRA & 3 NFL BASELINES FOR 7-WAY BENCHMARK
  // --------------------------------------------------------------------------
  console.log('[Phase 2] Benchmarking vs APEX ($122.9M), Argon ($81.1M), Hydra ($85.5M) & 3 NFL Baselines...');

  const buildPoolForBook = <T extends { id: string; menuBuckets: string[]; buildOffense: () => SimAgent[] }>(
    book: T[],
    glId: string,
    twoMinId?: string,
    fourMinId?: string
  ) => {
    const pool: Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>> = {};
    const ctxPool: Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>> = {};
    for (const p of book) {
      pool[p.id] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      const ctx: SimFieldContext | undefined =
        p.id === glId
          ? { yardLineToGoal: 4.0, sidelineObjective: 'NORMAL' }
          : p.id === twoMinId
          ? { sidelineObjective: 'STOP_CLOCK_OOB' }
          : p.id === fourMinId
          ? { sidelineObjective: 'STAY_INBOUNDS' }
          : undefined;
      for (const df of MODERN_2027_DEF_FRONTS) {
        pool[p.id][df] = Array.from({ length: 35 }, () =>
          simulateAndAuditPlay(engine, p.buildOffense(), buildModern2027Defense(df), ctx)
        );
      }
      if (p.menuBuckets.includes('TWO_MINUTE')) {
        ctxPool[`${p.id}__2MIN`] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
        for (const df of OPEN_FRONTS) {
          ctxPool[`${p.id}__2MIN`][df] = Array.from({ length: 25 }, () =>
            simulateAndAuditPlay(engine, p.buildOffense(), buildModern2027Defense(df), { sidelineObjective: 'STOP_CLOCK_OOB' })
          );
        }
      }
      if (p.menuBuckets.includes('FOUR_MINUTE')) {
        ctxPool[`${p.id}__4MIN`] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
        for (const df of OPEN_FRONTS) {
          ctxPool[`${p.id}__4MIN`][df] = Array.from({ length: 25 }, () =>
            simulateAndAuditPlay(engine, p.buildOffense(), buildModern2027Defense(df), { sidelineObjective: 'STAY_INBOUNDS' })
          );
        }
      }
      if (p.menuBuckets.includes('GOAL_LINE')) {
        ctxPool[`${p.id}__GL4`] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
        for (const df of ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ModernDefFrontId[]) {
          ctxPool[`${p.id}__GL4`][df] = Array.from({ length: 35 }, () =>
            simulateAndAuditPlay(engine, p.buildOffense(), buildModern2027Defense(df), { yardLineToGoal: 4.0, sidelineObjective: 'NORMAL' })
          );
        }
      }
    }
    return { pool, ctxPool };
  };

  const { pool: apexPool, ctxPool: apexContextPool } = buildPoolForBook(
    APEX_2027_PLAYBOOK,
    'APEX_GOALLINE_SPRINT_SMASH',
    'APEX_TWOMIN_BOUNDARY_OOB',
    'APEX_EAGLES_RHINO_COUNTER'
  );
  const { pool: argonPool, ctxPool: argonContextPool } = buildPoolForBook(
    ARGON_2027_PLAYBOOK,
    'ARGON_GOALLINE_CYCLOTRON'
  );
  const { pool: hydraPool, ctxPool: hydraContextPool } = buildPoolForBook(
    HYDRA_2027_PLAYBOOK,
    'HYDRA_GOALLINE_PHILLY_SPECIAL'
  );

  const baselinePools: Record<string, Record<CanonicalPlayId, Record<ModernDefFrontId, SampledPlayOutcome[]>>> = {};
  const baselineContextPools: Record<string, Record<string, Record<ModernDefFrontId, SampledPlayOutcome[]>>> = {};
  for (const prof of BASELINE_PHILOSOPHIES) {
    baselinePools[prof.id] = {} as any;
    baselineContextPools[prof.id] = {};
    const uniquePlays = Array.from(
      new Set([
        ...prof.openFieldPlays,
        ...prof.thirdLongPlays,
        ...prof.shortYardagePlays,
        ...prof.twoMinPlays,
        ...prof.fourMinPlays,
        ...prof.goalLinePlays,
      ])
    );
    for (const pid of uniquePlays) {
      baselinePools[prof.id][pid] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
      for (const df of MODERN_2027_DEF_FRONTS) {
        baselinePools[prof.id][pid][df] = Array.from({ length: 30 }, () =>
          simulateAndAuditPlay(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df))
        );
      }
      if (prof.twoMinPlays.includes(pid)) {
        baselineContextPools[prof.id][`${pid}__2MIN`] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
        for (const df of OPEN_FRONTS) {
          baselineContextPools[prof.id][`${pid}__2MIN`][df] = Array.from({ length: 20 }, () =>
            simulateAndAuditPlay(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df), {
              sidelineObjective: 'STOP_CLOCK_OOB',
            })
          );
        }
      }
      if (prof.fourMinPlays.includes(pid)) {
        baselineContextPools[prof.id][`${pid}__4MIN`] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
        for (const df of OPEN_FRONTS) {
          baselineContextPools[prof.id][`${pid}__4MIN`][df] = Array.from({ length: 20 }, () =>
            simulateAndAuditPlay(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df), {
              sidelineObjective: 'STAY_INBOUNDS',
            })
          );
        }
      }
      if (prof.goalLinePlays.includes(pid)) {
        baselineContextPools[prof.id][`${pid}__GL4`] = {} as Record<ModernDefFrontId, SampledPlayOutcome[]>;
        for (const df of ['GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'] as ModernDefFrontId[]) {
          baselineContextPools[prof.id][`${pid}__GL4`][df] = Array.from({ length: 30 }, () =>
            simulateAndAuditPlay(engine, buildBaselinePlay(prof, pid), buildModern2027Defense(df), {
              yardLineToGoal: 4.0,
              sidelineObjective: 'NORMAL',
            })
          );
        }
      }
    }
  }

  const omegaOpenPlays = OMEGA_2027_PLAYBOOK.filter((p) => p.menuBuckets.includes('OPEN_FIELD'));
  const omegaNash = solveZeroSumNash(
    omegaOpenPlays.map((op) => OPEN_FRONTS.map((df) => omegaPool[op.id][df].reduce((a, b) => a + b.epa, 0) / omegaPool[op.id][df].length))
  );

  const apexOpenPlays = APEX_2027_PLAYBOOK.filter((p) => p.menuBuckets.includes('OPEN_FIELD'));
  const apexNash = solveZeroSumNash(
    apexOpenPlays.map((ap) => OPEN_FRONTS.map((df) => apexPool[ap.id][df].reduce((a, b) => a + b.epa, 0) / apexPool[ap.id][df].length))
  );

  const argonOpenPlays = ARGON_2027_PLAYBOOK.filter((p) => p.menuBuckets.includes('OPEN_FIELD'));
  const argonNash = solveZeroSumNash(
    argonOpenPlays.map((ap) => OPEN_FRONTS.map((df) => argonPool[ap.id][df].reduce((a, b) => a + b.epa, 0) / argonPool[ap.id][df].length))
  );

  const hydraOpenPlays = HYDRA_2027_PLAYBOOK.filter((p) => p.menuBuckets.includes('OPEN_FIELD'));
  const hydraNash = solveZeroSumNash(
    hydraOpenPlays.map((hp) => OPEN_FRONTS.map((df) => hydraPool[hp.id][df].reduce((a, b) => a + b.epa, 0) / hydraPool[hp.id][df].length))
  );

  const baselineNashMap: Record<string, ReturnType<typeof solveZeroSumNash>> = {};
  for (const prof of BASELINE_PHILOSOPHIES) {
    baselineNashMap[prof.id] = solveZeroSumNash(
      prof.openFieldPlays.map((pid) =>
        OPEN_FRONTS.map((df) => baselinePools[prof.id][pid][df].reduce((a, b) => a + b.epa, 0) / baselinePools[prof.id][pid][df].length)
      )
    );
  }

  console.log('\n--- ZERO-SUM GAME-THEORY / ADVERSARIAL DC NASH EQUILIBRIUM EPA/PLAY (7-WAY) ---');
  console.log(`1. 2027 OMEGA Continuum ($${OMEGA_ACTIVE_11_CAP_M.toFixed(1)}M BDB-Calibrated)    -> Nash Minimax EPA/Play = ${omegaNash.nashValue >= 0 ? '+' : ''}${omegaNash.nashValue.toFixed(3)}`);
  console.log(
    `   Optimal OMEGA Mixed Call Sheet: ` +
      omegaOpenPlays
        .map((p, i) => ({ id: p.id.replace('OMEGA_', ''), w: omegaNash.offWeights[i] }))
        .filter((x) => x.w >= 0.02)
        .sort((a, b) => b.w - a.w)
        .map((x) => `${x.id} (${(x.w * 100).toFixed(1)}%)`)
        .join(', ')
  );
  console.log(
    `   Adversarial DC Counter-Mix:     ` +
      OPEN_FRONTS.map((df, j) => ({ df, w: omegaNash.defWeights[j] }))
        .filter((x) => x.w >= 0.02)
        .sort((a, b) => b.w - a.w)
        .map((x) => `${x.df} (${(x.w * 100).toFixed(1)}%)`)
        .join(', ')
  );
  console.log(`2. 2027 Philadelphia APEX ($${APEX_ACTIVE_11_CAP_M.toFixed(1)}M Realistic Cap)    -> Nash Minimax EPA/Play = ${apexNash.nashValue >= 0 ? '+' : ''}${apexNash.nashValue.toFixed(3)}`);
  console.log(`3. 2027 Google Argon ($${ARGON_ACTIVE_11_CAP_M.toFixed(1)}M Extreme Moneyball)     -> Nash Minimax EPA/Play = ${argonNash.nashValue >= 0 ? '+' : ''}${argonNash.nashValue.toFixed(3)}`);
  console.log(`4. 2027 Hydra Vanguard ($${HYDRA_ACTIVE_11_CAP_M.toFixed(1)}M Moneyball)           -> Nash Minimax EPA/Play = ${hydraNash.nashValue >= 0 ? '+' : ''}${hydraNash.nashValue.toFixed(3)}`);
  for (let idx = 0; idx < BASELINE_PHILOSOPHIES.length; idx++) {
    const prof = BASELINE_PHILOSOPHIES[idx];
    const bn = baselineNashMap[prof.id];
    console.log(`${idx + 5}. ${prof.name.padEnd(50)} -> Nash Minimax EPA/Play = ${bn.nashValue >= 0 ? '+' : ''}${bn.nashValue.toFixed(3)}`);
  }
  console.log('');

  // --------------------------------------------------------------------------
  // PHASE 3: 1,000 FULL 11-DRIVE NFL GAMES PER PHILOSOPHY (77,000 DRIVES)
  // --------------------------------------------------------------------------
  interface FullGameStats {
    philosophyName: string;
    offCapM: number;
    ppgStandardDc: number;
    ppgAdversarialNashDc: number;
    ppdStandard: number;
    tdDrivePct: number;
    fgDrivePct: number;
    turnoverDrivePct: number;
    explosiveRatePct: number;
    ppgPer10MCap: number;
    projectedTeamNetDiffPerGame: number;
  }

  function simulateSeasonGames(
    mode: SchemeMode,
    prof: BaselineRosterProfile | null,
    adversarialDcWeights: number[] | null,
    numGames = 1000
  ) {
    const DRIVES_PER_GAME = 11;
    let totalPoints = 0;
    let totalDrives = 0;
    let tdDrives = 0;
    let fgDrives = 0;
    let toDrives = 0;
    let totalSnaps = 0;
    let explosiveSnaps = 0;

    const leagueWeightsArr = OPEN_FRONTS.map((df) => LEAGUE_OPEN_DEF_WEIGHTS[df]);

    for (let g = 0; g < numGames; g++) {
      let gamePts = 0;
      for (let d = 0; d < DRIVES_PER_GAME; d++) {
        totalDrives++;
        let ydsToGoal = Math.round(66 + Math.random() * 10);
        let down = 1;
        let toGo = 10;
        const isTwoMinHalfEnd = d === 5;
        let clockRemaining = isTwoMinHalfEnd ? 105 : 900;

        while (down <= 4 && clockRemaining > 0) {
          if (down === 4) {
            const canGoForIt =
              (toGo <= 2 && ydsToGoal <= 62) ||
              (toGo <= 4 && ydsToGoal <= 42 && ydsToGoal >= 34) ||
              ydsToGoal <= 3;
            if (!canGoForIt) {
              if (ydsToGoal <= 39 && Math.random() < fieldGoalMakeProbability(ydsToGoal)) {
                gamePts += 3;
                fgDrives++;
              }
              break;
            }
          }

          let defFront: ModernDefFrontId;
          if (ydsToGoal <= 5 && toGo <= 5) {
            const glR = Math.random();
            defFront = glR < 0.50 ? 'GOAL_LINE_62_PINCH' : glR < 0.78 ? 'BASE_43_OVER_C1' : 'VIKINGS_MUG_CROSSDOG_C0';
          } else if (down === 3 && toGo >= 7) {
            const tlR = Math.random();
            defFront =
              tlR < 0.36
                ? 'DIME_QUARTERS_MATCH'
                : tlR < 0.68
                ? 'DIME_MUG_C0'
                : tlR < 0.85
                ? 'NICKEL_SIM_C2'
                : 'VIKINGS_MUG_CROSSDOG_C0';
          } else if (adversarialDcWeights) {
            defFront = OPEN_FRONTS[sampleWeightedIndex(adversarialDcWeights)];
          } else {
            defFront = OPEN_FRONTS[sampleWeightedIndex(leagueWeightsArr)];
          }

          let sample: SampledPlayOutcome;
          if (mode === 'OMEGA') {
            let chosenId: string;
            if (ydsToGoal <= 5) {
              const glMenu = ['OMEGA_GOALLINE_SPRINT_SMASH', 'OMEGA_11V11_RHINO_PIN_PULL', 'OMEGA_DISPLACED_ORBIT_LASER'];
              chosenId = glMenu[Math.floor(Math.random() * glMenu.length)];
            } else if (isTwoMinHalfEnd) {
              const tmMenu = ['OMEGA_2MIN_BOUNDARY_OOB', 'OMEGA_DISPLACED_ORBIT_LASER', 'OMEGA_ORBIT_GLANCE_FLOOD'];
              chosenId = tmMenu[Math.floor(Math.random() * tmMenu.length)];
            } else if (down >= 3 && toGo >= 7) {
              const tlMenu = ['OMEGA_3RD9_SWITCH_STICKS', 'OMEGA_2MIN_BOUNDARY_OOB', 'OMEGA_DISPLACED_ORBIT_LASER'];
              chosenId = tlMenu[Math.floor(Math.random() * tlMenu.length)];
            } else if (toGo <= 3) {
              const syMenu = ['OMEGA_11V11_RHINO_PIN_PULL', 'OMEGA_CHIRAL_JET_OPTION', 'OMEGA_064S_FLASH_PA_BOOT', 'OMEGA_DISPLACED_ORBIT_LASER'];
              chosenId = syMenu[Math.floor(Math.random() * syMenu.length)];
            } else {
              const m = omegaOpenPlays.length;
              const blended = omegaNash.offWeights.map((w) => 0.55 * w + 0.45 * (1 / m));
              chosenId = omegaOpenPlays[sampleWeightedIndex(blended)].id;
            }
            const bucket = omegaPool[chosenId][defFront];
            sample = bucket[Math.floor(Math.random() * bucket.length)];
          } else if (mode === 'APEX') {
            let chosenId: string;
            if (ydsToGoal <= 5) {
              const glMenu = ['APEX_GOALLINE_SPRINT_SMASH', 'APEX_EAGLES_RHINO_COUNTER', 'APEX_DISPLACED_WING_OPTION'];
              chosenId = glMenu[Math.floor(Math.random() * glMenu.length)];
            } else if (isTwoMinHalfEnd) {
              const tmMenu = ['APEX_TWOMIN_BOUNDARY_OOB', 'APEX_ORBIT_GLANCE_FLOOD', 'APEX_DISPLACED_WING_OPTION'];
              chosenId = tmMenu[Math.floor(Math.random() * tmMenu.length)];
            } else if (down >= 3 && toGo >= 7) {
              const tlMenu = ['APEX_SWITCH_MESH_STICKS', 'APEX_TWOMIN_BOUNDARY_OOB', 'APEX_ORBIT_GLANCE_FLOOD'];
              chosenId = tlMenu[Math.floor(Math.random() * tlMenu.length)];
            } else if (toGo <= 3) {
              const syMenu = ['APEX_EAGLES_RHINO_COUNTER', 'APEX_DUO_WING_PIN_PULL', 'APEX_SHORT_MESH_PA_BOOT', 'APEX_DISPLACED_WING_OPTION'];
              chosenId = syMenu[Math.floor(Math.random() * syMenu.length)];
            } else {
              const m = apexOpenPlays.length;
              const blended = apexNash.offWeights.map((w) => 0.55 * w + 0.45 * (1 / m));
              chosenId = apexOpenPlays[sampleWeightedIndex(blended)].id;
            }
            const bucket = apexPool[chosenId][defFront];
            sample = bucket[Math.floor(Math.random() * bucket.length)];
          } else if (mode === 'ARGON') {
            let chosenId: string;
            if (ydsToGoal <= 5) {
              const glMenu = ['ARGON_GOALLINE_CYCLOTRON', 'ARGON_WILDCAT_TRIPLE_PITCH', 'ARGON_REACTOR_SWEEP_RIGHT'];
              chosenId = glMenu[Math.floor(Math.random() * glMenu.length)];
            } else if (isTwoMinHalfEnd) {
              const tmMenu = ['ARGON_2MIN_BOUNDARY_LASER', 'ARGON_NOBLE_KINETIC_RELAY', 'ARGON_CHIRAL_JET_LEFT'];
              chosenId = tmMenu[Math.floor(Math.random() * tmMenu.length)];
            } else if (down >= 3 && toGo >= 7) {
              const tlMenu = ['ARGON_NOBLE_KINETIC_RELAY', 'ARGON_DISPLACED_NODE_LASER', 'ARGON_2MIN_BOUNDARY_LASER'];
              chosenId = tlMenu[Math.floor(Math.random() * tlMenu.length)];
            } else if (toGo <= 3) {
              const syMenu = ['ARGON_REACTOR_SWEEP_RIGHT', 'ARGON_4MIN_LEFT_MONOLITH', 'ARGON_WILDCAT_TRIPLE_PITCH', 'ARGON_CHIRAL_JET_LEFT'];
              chosenId = syMenu[Math.floor(Math.random() * syMenu.length)];
            } else {
              const m = argonOpenPlays.length;
              const blended = argonNash.offWeights.map((w) => 0.55 * w + 0.45 * (1 / m));
              chosenId = argonOpenPlays[sampleWeightedIndex(blended)].id;
            }
            const bucket = argonPool[chosenId][defFront];
            sample = bucket[Math.floor(Math.random() * bucket.length)];
          } else if (mode === 'HYDRA') {
            let chosenId: string;
            if (ydsToGoal <= 5) {
              const glMenu = ['HYDRA_GOALLINE_PHILLY_SPECIAL', 'HYDRA_6OL_ELIGIBLE_SEAM', 'HYDRA_4MIN_BULLDOZER_SWEEP'];
              chosenId = glMenu[Math.floor(Math.random() * glMenu.length)];
            } else if (isTwoMinHalfEnd) {
              const tmMenu = ['HYDRA_2MIN_SIDELINE_CHOICE', 'HYDRA_HOOK_AND_LATERAL', 'HYDRA_JET_DOUBLE_OPTION'];
              chosenId = tmMenu[Math.floor(Math.random() * tmMenu.length)];
            } else if (down >= 3 && toGo >= 7) {
              const tlMenu = ['HYDRA_HOOK_AND_LATERAL', 'HYDRA_BACKWARD_DOUBLE_PASS', 'HYDRA_2MIN_SIDELINE_CHOICE'];
              chosenId = tlMenu[Math.floor(Math.random() * tlMenu.length)];
            } else if (toGo <= 3) {
              const syMenu = ['HYDRA_4MIN_BULLDOZER_SWEEP', 'HYDRA_PONY_SPLIT_BASH', 'HYDRA_6OL_ELIGIBLE_SEAM', 'HYDRA_JET_DOUBLE_OPTION'];
              chosenId = syMenu[Math.floor(Math.random() * syMenu.length)];
            } else {
              const m = hydraOpenPlays.length;
              const blended = hydraNash.offWeights.map((w) => 0.55 * w + 0.45 * (1 / m));
              chosenId = hydraOpenPlays[sampleWeightedIndex(blended)].id;
            }
            const bucket = hydraPool[chosenId][defFront];
            sample = bucket[Math.floor(Math.random() * bucket.length)];
          } else {
            const p = prof!;
            let chosenPid: CanonicalPlayId;
            if (ydsToGoal <= 5) {
              chosenPid = p.goalLinePlays[Math.floor(Math.random() * p.goalLinePlays.length)];
            } else if (isTwoMinHalfEnd) {
              chosenPid = p.twoMinPlays[Math.floor(Math.random() * p.twoMinPlays.length)];
            } else if (down >= 3 && toGo >= 7) {
              chosenPid = p.thirdLongPlays[Math.floor(Math.random() * p.thirdLongPlays.length)];
            } else if (toGo <= 3) {
              chosenPid = p.shortYardagePlays[Math.floor(Math.random() * p.shortYardagePlays.length)];
            } else {
              const m = p.openFieldPlays.length;
              const nashW = baselineNashMap[p.id].offWeights;
              const blended = nashW.map((w) => 0.55 * w + 0.45 * (1 / m));
              chosenPid = p.openFieldPlays[sampleWeightedIndex(blended)];
            }
            const bucket = baselinePools[p.id][chosenPid][defFront];
            sample = bucket[Math.floor(Math.random() * bucket.length)];
          }

          const penRoll = Math.random();
          if (penRoll < 0.038) {
            ydsToGoal = Math.min(99, ydsToGoal + 10);
            toGo += 10;
            clockRemaining -= 8.0;
            continue;
          } else if (penRoll < 0.063) {
            ydsToGoal = Math.min(99, ydsToGoal + 5);
            toGo += 5;
            clockRemaining -= 5.0;
            continue;
          } else if (penRoll < 0.085) {
            const penGain = Math.min(ydsToGoal * 0.5, 5);
            ydsToGoal -= penGain;
            if (penGain >= toGo) {
              down = 1;
              toGo = Math.min(10, ydsToGoal);
            } else {
              toGo -= penGain;
            }
            clockRemaining -= 5.0;
            continue;
          }

          totalSnaps++;
          const effGain = Math.min(ydsToGoal, sample.yards);
          if (effGain >= 15.0) explosiveSnaps++;

          let turnover = false;
          if (sample.reason === 'FUMBLE_LOST' || sample.reason === 'INTERCEPTION') {
            turnover = true;
          } else if (sample.reason === 'SACK' && Math.random() < 0.105) {
            turnover = true;
          } else if (sample.reason === 'TACKLED' && Math.random() < 0.008) {
            turnover = true;
          }
          if (turnover) {
            toDrives++;
            break;
          }

          if (sample.reason === 'INCOMPLETE' || sample.reason === 'OUT_OF_BOUNDS') {
            clockRemaining -= sample.durationSec + 1.0;
          } else {
            clockRemaining -= isTwoMinHalfEnd ? 17.5 : 31.0;
          }

          ydsToGoal -= effGain;
          if (ydsToGoal <= 0.05 || sample.reason === 'TOUCHDOWN') {
            gamePts += Math.random() < 0.96 ? 7 : 6;
            tdDrives++;
            break;
          }

          if (effGain >= toGo) {
            down = 1;
            toGo = Math.min(10, ydsToGoal);
          } else {
            down++;
            toGo -= effGain;
          }

          if (isTwoMinHalfEnd && clockRemaining <= 6 && ydsToGoal <= 40) {
            if (Math.random() < fieldGoalMakeProbability(ydsToGoal)) {
              gamePts += 3;
              fgDrives++;
            }
            break;
          }
        }
      }
      totalPoints += gamePts;
    }

    return {
      ppg: totalPoints / numGames,
      ppd: totalPoints / totalDrives,
      tdPct: (tdDrives / totalDrives) * 100,
      fgPct: (fgDrives / totalDrives) * 100,
      toPct: (toDrives / totalDrives) * 100,
      explPct: (explosiveSnaps / Math.max(1, totalSnaps)) * 100,
    };
  }

  const fullGameResults: FullGameStats[] = [];

  const addFullGame = (
    name: string,
    cap: number,
    mode: SchemeMode,
    prof: BaselineRosterProfile | null,
    advWeights: number[] | null,
    defBonus: number
  ) => {
    const std = simulateSeasonGames(mode, prof, null, 1000);
    const adv = simulateSeasonGames(mode, prof, advWeights, 1000);
    fullGameResults.push({
      philosophyName: name,
      offCapM: cap,
      ppgStandardDc: +std.ppg.toFixed(2),
      ppgAdversarialNashDc: +adv.ppg.toFixed(2),
      ppdStandard: +std.ppd.toFixed(2),
      tdDrivePct: +std.tdPct.toFixed(1),
      fgDrivePct: +std.fgPct.toFixed(1),
      turnoverDrivePct: +std.toPct.toFixed(1),
      explosiveRatePct: +std.explPct.toFixed(1),
      ppgPer10MCap: +((std.ppg / cap) * 10).toFixed(2),
      projectedTeamNetDiffPerGame: +(std.ppg - (22.4 - defBonus)).toFixed(2),
    });
  };

  const omegaDefBonus = +(((146.0 - OMEGA_ACTIVE_11_CAP_M) / (146.0 - HYDRA_ACTIVE_11_CAP_M)) * 3.8).toFixed(1);
  const apexDefBonus = +(((146.0 - APEX_ACTIVE_11_CAP_M) / (146.0 - HYDRA_ACTIVE_11_CAP_M)) * 3.8).toFixed(1);
  const argonDefBonus = +(((146.0 - ARGON_ACTIVE_11_CAP_M) / (146.0 - HYDRA_ACTIVE_11_CAP_M)) * 3.8).toFixed(1);

  addFullGame(`2027 OMEGA Continuum ($${OMEGA_ACTIVE_11_CAP_M.toFixed(1)}M BDB-Calibrated)`, OMEGA_ACTIVE_11_CAP_M, 'OMEGA', null, omegaNash.defWeights, omegaDefBonus);
  addFullGame(`2027 Philadelphia APEX ($${APEX_ACTIVE_11_CAP_M.toFixed(1)}M Realistic Cap)`, APEX_ACTIVE_11_CAP_M, 'APEX', null, apexNash.defWeights, apexDefBonus);
  addFullGame(`2027 Google Argon ($${ARGON_ACTIVE_11_CAP_M.toFixed(1)}M Moneyball)`, ARGON_ACTIVE_11_CAP_M, 'ARGON', null, argonNash.defWeights, argonDefBonus);
  addFullGame(`2027 Hydra Vanguard ($${HYDRA_ACTIVE_11_CAP_M.toFixed(1)}M Moneyball)`, HYDRA_ACTIVE_11_CAP_M, 'HYDRA', null, hydraNash.defWeights, 3.8);
  for (const prof of BASELINE_PHILOSOPHIES) {
    addFullGame(prof.name, prof.offCapM, 'BASELINE', prof, baselineNashMap[prof.id].defWeights, prof.defReinvestedBonusPts);
  }

  console.log('--- 7-WAY FULL-GAME PPG & CAP-ARBITRAGE BENCHMARK (N=1,000 NFL Games / Philosophy) ---');
  console.log(
    'Offensive Philosophy'.padEnd(56) +
      'PPG(Std)'.padEnd(10) +
      'PPG(Nash)'.padEnd(11) +
      'PPD'.padEnd(8) +
      'TD%'.padEnd(8) +
      'TO%'.padEnd(8) +
      'Expl%'.padEnd(8) +
      'PPG/$10M'.padEnd(10) +
      'Team Net +/-'
  );
  console.log('-'.repeat(134));
  for (const r of fullGameResults) {
    console.log(
      r.philosophyName.padEnd(56) +
        r.ppgStandardDc.toFixed(2).padEnd(10) +
        r.ppgAdversarialNashDc.toFixed(2).padEnd(11) +
        r.ppdStandard.toFixed(2).padEnd(8) +
        `${r.tdDrivePct.toFixed(1)}%`.padEnd(8) +
        `${r.turnoverDrivePct.toFixed(1)}%`.padEnd(8) +
        `${r.explosiveRatePct.toFixed(1)}%`.padEnd(8) +
        r.ppgPer10MCap.toFixed(2).padEnd(10) +
        `${r.projectedTeamNetDiffPerGame >= 0 ? '+' : ''}${r.projectedTeamNetDiffPerGame.toFixed(2)} pts/g`
    );
  }
  console.log('');

  // --------------------------------------------------------------------------
  // PHASE 4: 4 SITUATIONAL COACHING DRILLS (N=1,000 PER DRILL)
  // --------------------------------------------------------------------------
  function runTwoMinuteDrill(mode: SchemeMode, prof: BaselineRosterProfile | null, trials = 1000) {
    let tdWins = 0;
    let totalYds = 0;
    let totalSecUsed = 0;
    let oobStops = 0;
    let sacks = 0;
    let totalPlays = 0;
    const defChoices: ModernDefFrontId[] = ['DIME_QUARTERS_MATCH', 'NICKEL_SIM_C2', 'NICKEL_OVER_C3', 'DIME_MUG_C0'];

    for (let t = 0; t < trials; t++) {
      let ydsToGoal = 65.0;
      let clock = 110.0;
      let timeouts = 1;
      let down = 1;
      let toGo = 10.0;

      while (down <= 4 && clock > 0) {
        const df = defChoices[Math.floor(Math.random() * defChoices.length)];
        let s: SampledPlayOutcome;
        if (mode === 'OMEGA') {
          const pid = clock > 55 && Math.random() < 0.45 ? 'OMEGA_DISPLACED_ORBIT_LASER' : 'OMEGA_2MIN_BOUNDARY_OOB';
          const pool = omegaContextPool[`${pid}__2MIN`]?.[df] || omegaPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'APEX') {
          const pid = clock > 55 && Math.random() < 0.45 ? 'APEX_ORBIT_GLANCE_FLOOD' : 'APEX_TWOMIN_BOUNDARY_OOB';
          const pool = apexContextPool[`${pid}__2MIN`]?.[df] || apexPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'ARGON') {
          const pid = clock > 50 && Math.random() < 0.40 ? 'ARGON_CHIRAL_JET_LEFT' : 'ARGON_2MIN_BOUNDARY_LASER';
          const pool = argonContextPool[`${pid}__2MIN`]?.[df] || argonPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'HYDRA') {
          const pid = Math.random() < 0.65 ? 'HYDRA_2MIN_SIDELINE_CHOICE' : 'HYDRA_HOOK_AND_LATERAL';
          const pool = hydraContextPool[`${pid}__2MIN`]?.[df] || hydraPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else {
          const p = prof!;
          const pid = p.twoMinPlays[Math.floor(Math.random() * p.twoMinPlays.length)];
          const pool = baselineContextPools[p.id][`${pid}__2MIN`][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        }

        totalPlays++;
        if (s.reason === 'SACK') sacks++;
        if (s.reason === 'OUT_OF_BOUNDS') oobStops++;
        if (s.reason === 'FUMBLE_LOST' || s.reason === 'INTERCEPTION' || (s.reason === 'SACK' && Math.random() < 0.10)) break;

        const gain = Math.min(ydsToGoal, s.yards);
        ydsToGoal -= gain;
        totalYds += gain;

        if (ydsToGoal <= 0.05 || s.reason === 'TOUCHDOWN') {
          tdWins++;
          totalSecUsed += Math.min(clock, s.durationSec);
          break;
        }

        let playClockCost = s.durationSec;
        if (s.reason === 'OUT_OF_BOUNDS' || s.reason === 'INCOMPLETE') playClockCost += 0.5;
        else if (timeouts > 0 && (s.reason === 'SACK' || clock < 38)) {
          timeouts--;
          playClockCost += 1.0;
        } else {
          playClockCost += 10.5;
        }
        totalSecUsed += Math.min(clock, playClockCost);
        clock -= playClockCost;

        if (gain >= toGo) {
          down = 1;
          toGo = Math.min(10, ydsToGoal);
        } else {
          down++;
          toGo -= gain;
        }
      }
    }

    return {
      tdWinPct: +((tdWins / trials) * 100).toFixed(1),
      ydsPerClockSec: +(totalYds / Math.max(1, totalSecUsed)).toFixed(2),
      oobStopsPerDrive: +(oobStops / trials).toFixed(2),
      sackRatePct: +((sacks / Math.max(1, totalPlays)) * 100).toFixed(1),
    };
  }

  function runFourMinuteDrill(mode: SchemeMode, prof: BaselineRosterProfile | null, trials = 1000) {
    let sealedGames = 0;
    let totalClockBled = 0;
    let firstDownsEarned = 0;
    let clockStopMistakes = 0;
    let totalSnaps = 0;
    const heavyDefs: ModernDefFrontId[] = ['BASE_43_OVER_C1', 'BASE_34_BEAR_C4', 'VIKINGS_SAFETY_BLITZ_C1', 'NICKEL_UNDER_C1'];

    for (let t = 0; t < trials; t++) {
      let ydsToGoal = 70.0;
      let clock = 240.0;
      let oppTimeouts = 2;
      let down = 1;
      let toGo = 10.0;

      while (down <= 3 && clock > 0) {
        const df = heavyDefs[Math.floor(Math.random() * heavyDefs.length)];
        let s: SampledPlayOutcome;
        if (mode === 'OMEGA') {
          const pid = df === 'BASE_34_BEAR_C4' ? 'OMEGA_CHIRAL_JET_OPTION' : 'OMEGA_11V11_RHINO_PIN_PULL';
          const pool = omegaContextPool[`${pid}__4MIN`]?.[df] || omegaPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'APEX') {
          const pid = df === 'BASE_34_BEAR_C4' || toGo >= 4 ? 'APEX_DUO_WING_PIN_PULL' : 'APEX_EAGLES_RHINO_COUNTER';
          const pool = apexContextPool[`${pid}__4MIN`]?.[df] || apexPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'ARGON') {
          const pid = df === 'VIKINGS_SAFETY_BLITZ_C1' || df === 'BASE_34_BEAR_C4' ? 'ARGON_4MIN_LEFT_MONOLITH' : 'ARGON_REACTOR_SWEEP_RIGHT';
          const pool = argonContextPool[`${pid}__4MIN`]?.[df] || argonPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'HYDRA') {
          const pid = down === 3 && toGo >= 4 ? 'HYDRA_PONY_SPLIT_BASH' : 'HYDRA_4MIN_BULLDOZER_SWEEP';
          const pool = hydraContextPool[`${pid}__4MIN`]?.[df] || hydraPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else {
          const p = prof!;
          const pid = p.fourMinPlays[Math.floor(Math.random() * p.fourMinPlays.length)];
          const pool = baselineContextPools[p.id][`${pid}__4MIN`][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        }

        totalSnaps++;
        if (s.reason === 'INCOMPLETE' || s.reason === 'OUT_OF_BOUNDS') clockStopMistakes++;
        if (s.reason === 'FUMBLE_LOST' || s.reason === 'INTERCEPTION' || Math.random() < 0.008) break;

        const gain = Math.min(ydsToGoal, s.yards);
        ydsToGoal -= gain;

        let bleed = s.durationSec;
        if (s.reason === 'INCOMPLETE' || s.reason === 'OUT_OF_BOUNDS') bleed += 0.5;
        else if (oppTimeouts > 0) {
          oppTimeouts--;
          bleed += 1.0;
        } else {
          bleed += 39.5;
        }

        const actualBled = Math.min(clock, bleed);
        clock -= actualBled;
        totalClockBled += actualBled;

        if (ydsToGoal <= 0.05 || clock <= 0) {
          sealedGames++;
          break;
        }
        if (gain >= toGo) {
          firstDownsEarned++;
          down = 1;
          toGo = Math.min(10, ydsToGoal);
        } else {
          down++;
          toGo -= gain;
        }
      }
    }

    return {
      gameSealPct: +((sealedGames / trials) * 100).toFixed(1),
      meanClockBledSec: +(totalClockBled / trials).toFixed(1),
      firstDownsPerDrive: +(firstDownsEarned / trials).toFixed(2),
      clockGiftMistakePct: +((clockStopMistakes / Math.max(1, totalSnaps)) * 100).toFixed(1),
    };
  }

  function runGoalLineDrill(mode: SchemeMode, prof: BaselineRosterProfile | null, trials = 1000) {
    let fourDownTds = 0;
    let firstSnapTds = 0;
    let totalPts = 0;
    const glDefs: ModernDefFrontId[] = ['GOAL_LINE_62_PINCH', 'GOAL_LINE_62_PINCH', 'BASE_43_OVER_C1', 'VIKINGS_MUG_CROSSDOG_C0'];

    for (let t = 0; t < trials; t++) {
      let ydsToGoal = 4.0;
      for (let down = 1; down <= 4; down++) {
        if (down === 4 && mode === 'BASELINE' && ydsToGoal > 2.2) {
          if (Math.random() < 0.97) totalPts += 3;
          break;
        }
        const df = glDefs[Math.floor(Math.random() * glDefs.length)];
        let s: SampledPlayOutcome;
        if (mode === 'OMEGA') {
          const pid = down === 1 ? 'OMEGA_GOALLINE_SPRINT_SMASH' : Math.random() < 0.65 ? 'OMEGA_GOALLINE_SPRINT_SMASH' : 'OMEGA_11V11_RHINO_PIN_PULL';
          const pool = omegaContextPool[`${pid}__GL4`]?.[df] || omegaPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'APEX') {
          const pid = down === 1 ? 'APEX_GOALLINE_SPRINT_SMASH' : Math.random() < 0.65 ? 'APEX_GOALLINE_SPRINT_SMASH' : 'APEX_EAGLES_RHINO_COUNTER';
          const pool = apexContextPool[`${pid}__GL4`]?.[df] || apexPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'ARGON') {
          const menu = ['ARGON_GOALLINE_CYCLOTRON', 'ARGON_WILDCAT_TRIPLE_PITCH', 'ARGON_GOALLINE_CYCLOTRON'];
          const pid = down === 1 ? 'ARGON_GOALLINE_CYCLOTRON' : menu[Math.floor(Math.random() * menu.length)];
          const pool = argonContextPool[`${pid}__GL4`]?.[df] || argonPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else if (mode === 'HYDRA') {
          const menu = ['HYDRA_GOALLINE_PHILLY_SPECIAL', 'HYDRA_6OL_ELIGIBLE_SEAM', 'HYDRA_PONY_SPLIT_BASH'];
          const pid = down === 1 ? 'HYDRA_GOALLINE_PHILLY_SPECIAL' : menu[Math.floor(Math.random() * menu.length)];
          const pool = hydraContextPool[`${pid}__GL4`]?.[df] || hydraPool[pid][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        } else {
          const p = prof!;
          const pid = p.goalLinePlays[Math.floor(Math.random() * p.goalLinePlays.length)];
          const pool = baselineContextPools[p.id][`${pid}__GL4`][df];
          s = pool[Math.floor(Math.random() * pool.length)];
        }

        if (s.reason === 'FUMBLE_LOST' || s.reason === 'INTERCEPTION' || (s.reason === 'SACK' && Math.random() < 0.09)) {
          break;
        }

        ydsToGoal -= s.yards;
        if (ydsToGoal <= 0.05 || s.reason === 'TOUCHDOWN') {
          fourDownTds++;
          if (down === 1) firstSnapTds++;
          totalPts += 6.96;
          break;
        }
        ydsToGoal = Math.max(0.5, ydsToGoal);
      }
    }

    return {
      fourDownTdPct: +((fourDownTds / trials) * 100).toFixed(1),
      singleSnapTdPct: +((firstSnapTds / trials) * 100).toFixed(1),
      expectedGoalLinePts: +(totalPts / trials).toFixed(2),
    };
  }

  function runThirdAndNineDrill(mode: SchemeMode, prof: BaselineRosterProfile | null, trials = 1000) {
    let conversions = 0;
    let explosives = 0;
    let sacks = 0;
    let sumEpa = 0;
    const thirdLongDefs: ModernDefFrontId[] = ['DIME_QUARTERS_MATCH', 'DIME_MUG_C0', 'NICKEL_SIM_C2', 'VIKINGS_MUG_CROSSDOG_C0'];

    for (let t = 0; t < trials; t++) {
      const df = thirdLongDefs[Math.floor(Math.random() * thirdLongDefs.length)];
      let s: SampledPlayOutcome;
      if (mode === 'OMEGA') {
        const pid = df.includes('MUG') ? 'OMEGA_3RD9_SWITCH_STICKS' : Math.random() < 0.55 ? 'OMEGA_3RD9_SWITCH_STICKS' : 'OMEGA_DISPLACED_ORBIT_LASER';
        const pool = omegaPool[pid][df];
        s = pool[Math.floor(Math.random() * pool.length)];
      } else if (mode === 'APEX') {
        const pid = Math.random() < 0.65 ? 'APEX_SWITCH_MESH_STICKS' : 'APEX_TWOMIN_BOUNDARY_OOB';
        const pool = apexPool[pid][df];
        s = pool[Math.floor(Math.random() * pool.length)];
      } else if (mode === 'ARGON') {
        const pid = df.includes('MUG') ? 'ARGON_DISPLACED_NODE_LASER' : 'ARGON_NOBLE_KINETIC_RELAY';
        const pool = argonPool[pid][df];
        s = pool[Math.floor(Math.random() * pool.length)];
      } else if (mode === 'HYDRA') {
        const pid = df.includes('MUG') ? 'HYDRA_BACKWARD_DOUBLE_PASS' : 'HYDRA_HOOK_AND_LATERAL';
        const pool = hydraPool[pid][df];
        s = pool[Math.floor(Math.random() * pool.length)];
      } else {
        const p = prof!;
        const pid = p.thirdLongPlays[Math.floor(Math.random() * p.thirdLongPlays.length)];
        const pool = baselinePools[p.id][pid][df];
        s = pool[Math.floor(Math.random() * pool.length)];
      }

      if (s.yards >= 9.0 && s.reason !== 'FUMBLE_LOST' && s.reason !== 'INTERCEPTION') conversions++;
      if (s.yards >= 18.0 && s.reason !== 'FUMBLE_LOST' && s.reason !== 'INTERCEPTION') explosives++;
      if (s.reason === 'SACK') sacks++;
      sumEpa += s.epa;
    }

    return {
      conversionPct: +((conversions / trials) * 100).toFixed(1),
      explosive18Pct: +((explosives / trials) * 100).toFixed(1),
      sackPct: +((sacks / trials) * 100).toFixed(1),
      meanEpa: +(sumEpa / trials).toFixed(3),
    };
  }

  const twoMinOmega = runTwoMinuteDrill('OMEGA', null);
  const twoMinApex = runTwoMinuteDrill('APEX', null);
  const twoMinArgon = runTwoMinuteDrill('ARGON', null);
  const twoMinConv = runTwoMinuteDrill('BASELINE', BASELINE_PHILOSOPHIES[0]);
  const twoMinStars = runTwoMinuteDrill('BASELINE', BASELINE_PHILOSOPHIES[2]);

  console.log('1) 2-MINUTE DRILL (Own 35, 1:50 left, 1 TO — TD Required):');
  console.log(`   - 2027 OMEGA ($${OMEGA_ACTIVE_11_CAP_M.toFixed(1)}M):       TD Win = ${twoMinOmega.tdWinPct}% | Speed = ${twoMinOmega.ydsPerClockSec} yds/sec | OOB = ${twoMinOmega.oobStopsPerDrive}/drv | Sack% = ${twoMinOmega.sackRatePct}%`);
  console.log(`   - 2027 APEX ($${APEX_ACTIVE_11_CAP_M.toFixed(1)}M):        TD Win = ${twoMinApex.tdWinPct}% | Speed = ${twoMinApex.ydsPerClockSec} yds/sec | OOB = ${twoMinApex.oobStopsPerDrive}/drv | Sack% = ${twoMinApex.sackRatePct}%`);
  console.log(`   - 2027 Argon ($${ARGON_ACTIVE_11_CAP_M.toFixed(1)}M):       TD Win = ${twoMinArgon.tdWinPct}% | Speed = ${twoMinArgon.ydsPerClockSec} yds/sec | OOB = ${twoMinArgon.oobStopsPerDrive}/drv | Sack% = ${twoMinArgon.sackRatePct}%`);
  console.log(`   - Conv. 11 ($138.5M):        TD Win = ${twoMinConv.tdWinPct}% | Speed = ${twoMinConv.ydsPerClockSec} yds/sec | OOB = ${twoMinConv.oobStopsPerDrive}/drv | Sack% = ${twoMinConv.sackRatePct}%`);
  console.log(`   - Supermax ($172.0M):        TD Win = ${twoMinStars.tdWinPct}% | Speed = ${twoMinStars.ydsPerClockSec} yds/sec | OOB = ${twoMinStars.oobStopsPerDrive}/drv | Sack% = ${twoMinStars.sackRatePct}%\n`);

  const fourMinOmega = runFourMinuteDrill('OMEGA', null);
  const fourMinApex = runFourMinuteDrill('APEX', null);
  const fourMinArgon = runFourMinuteDrill('ARGON', null);
  const fourMinShan = runFourMinuteDrill('BASELINE', BASELINE_PHILOSOPHIES[1]);
  const fourMinConv = runFourMinuteDrill('BASELINE', BASELINE_PHILOSOPHIES[0]);

  console.log('2) 4-MINUTE DRILL (Own 30, 4:00 left, Opp 2 TOs — Bleed Clock):');
  console.log(`   - 2027 OMEGA (Rhino/Jet):    Game-Seal = ${fourMinOmega.gameSealPct}% | Clock = ${fourMinOmega.meanClockBledSec}s | 1st Downs = ${fourMinOmega.firstDownsPerDrive} | Clock-Gift = ${fourMinOmega.clockGiftMistakePct}%`);
  console.log(`   - 2027 APEX (Rhino/PinPull): Game-Seal = ${fourMinApex.gameSealPct}% | Clock = ${fourMinApex.meanClockBledSec}s | 1st Downs = ${fourMinApex.firstDownsPerDrive} | Clock-Gift = ${fourMinApex.clockGiftMistakePct}%`);
  console.log(`   - 2027 Argon (Chiral 11v11): Game-Seal = ${fourMinArgon.gameSealPct}% | Clock = ${fourMinArgon.meanClockBledSec}s | 1st Downs = ${fourMinArgon.firstDownsPerDrive} | Clock-Gift = ${fourMinArgon.clockGiftMistakePct}%`);
  console.log(`   - Shanahan 12 ($146M):       Game-Seal = ${fourMinShan.gameSealPct}% | Clock = ${fourMinShan.meanClockBledSec}s | 1st Downs = ${fourMinShan.firstDownsPerDrive} | Clock-Gift = ${fourMinShan.clockGiftMistakePct}%`);
  console.log(`   - Conv. 11 ($138.5M):        Game-Seal = ${fourMinConv.gameSealPct}% | Clock = ${fourMinConv.meanClockBledSec}s | 1st Downs = ${fourMinConv.firstDownsPerDrive} | Clock-Gift = ${fourMinConv.clockGiftMistakePct}%\n`);

  const glOmega = runGoalLineDrill('OMEGA', null);
  const glApex = runGoalLineDrill('APEX', null);
  const glArgon = runGoalLineDrill('ARGON', null);
  const glShan = runGoalLineDrill('BASELINE', BASELINE_PHILOSOPHIES[1]);
  const glConv = runGoalLineDrill('BASELINE', BASELINE_PHILOSOPHIES[0]);

  console.log('3) LOW RED ZONE / GOAL LINE (1st & Goal at +4.0y vs 6-2 Heavy Pinch & Cross-Dog):');
  console.log(`   - 2027 OMEGA (Sprint Smash): 4-Down TD = ${glOmega.fourDownTdPct}% | 1st-Snap TD = ${glOmega.singleSnapTdPct}% | Expected Pts = ${glOmega.expectedGoalLinePts}`);
  console.log(`   - 2027 APEX (Sprint Smash):  4-Down TD = ${glApex.fourDownTdPct}% | 1st-Snap TD = ${glApex.singleSnapTdPct}% | Expected Pts = ${glApex.expectedGoalLinePts}`);
  console.log(`   - 2027 Argon (Cyclotron):    4-Down TD = ${glArgon.fourDownTdPct}% | 1st-Snap TD = ${glArgon.singleSnapTdPct}% | Expected Pts = ${glArgon.expectedGoalLinePts}`);
  console.log(`   - Shanahan 12 ($146M):       4-Down TD = ${glShan.fourDownTdPct}% | 1st-Snap TD = ${glShan.singleSnapTdPct}% | Expected Pts = ${glShan.expectedGoalLinePts}`);
  console.log(`   - Conv. 11 ($138.5M):        4-Down TD = ${glConv.fourDownTdPct}% | 1st-Snap TD = ${glConv.singleSnapTdPct}% | Expected Pts = ${glConv.expectedGoalLinePts}\n`);

  const tlOmega = runThirdAndNineDrill('OMEGA', null);
  const tlApex = runThirdAndNineDrill('APEX', null);
  const tlArgon = runThirdAndNineDrill('ARGON', null);
  const tlConv = runThirdAndNineDrill('BASELINE', BASELINE_PHILOSOPHIES[0]);
  const tlStars = runThirdAndNineDrill('BASELINE', BASELINE_PHILOSOPHIES[2]);

  console.log('4) 3RD & 9 "STICKS TRAP" (vs Dime Quarters Match & Dime Mug Cover 0):');
  console.log(`   - 2027 OMEGA (Switch/Laser): Conv% = ${tlOmega.conversionPct}% | Expl 18+y = ${tlOmega.explosive18Pct}% | Sack% = ${tlOmega.sackPct}% | Mean EPA = ${tlOmega.meanEpa >= 0 ? '+' : ''}${tlOmega.meanEpa}`);
  console.log(`   - 2027 APEX (Switch/OOB):    Conv% = ${tlApex.conversionPct}% | Expl 18+y = ${tlApex.explosive18Pct}% | Sack% = ${tlApex.sackPct}% | Mean EPA = ${tlApex.meanEpa >= 0 ? '+' : ''}${tlApex.meanEpa}`);
  console.log(`   - 2027 Argon (Relay/Laser):  Conv% = ${tlArgon.conversionPct}% | Expl 18+y = ${tlArgon.explosive18Pct}% | Sack% = ${tlArgon.sackPct}% | Mean EPA = ${tlArgon.meanEpa >= 0 ? '+' : ''}${tlArgon.meanEpa}`);
  console.log(`   - Conv. 11 ($138.5M):        Conv% = ${tlConv.conversionPct}% | Expl 18+y = ${tlConv.explosive18Pct}% | Sack% = ${tlConv.sackPct}% | Mean EPA = ${tlConv.meanEpa >= 0 ? '+' : ''}${tlConv.meanEpa}`);
  console.log(`   - Supermax ($172.0M):        Conv% = ${tlStars.conversionPct}% | Expl 18+y = ${tlStars.explosive18Pct}% | Sack% = ${tlStars.sackPct}% | Mean EPA = ${tlStars.meanEpa >= 0 ? '+' : ''}${tlStars.meanEpa}\n`);

  const outSummary = {
    generatedAt: new Date().toISOString(),
    capSummary: {
      elevenPersCapM: OMEGA_ACTIVE_11_CAP_M,
      twelvePersCapM: OMEGA_12PERS_CAP_M,
      twentyOnePersCapM: OMEGA_21PERS_CAP_M,
      savingsVsConv11M: +(138.5 - OMEGA_ACTIVE_11_CAP_M).toFixed(1),
      savingsVsShanahan12M: +(146.0 - OMEGA_ACTIVE_11_CAP_M).toFixed(1),
      savingsVsSupermaxM: +(172.0 - OMEGA_ACTIVE_11_CAP_M).toFixed(1),
      defReinvestedSuppressionPpg: omegaDefBonus,
    },
    rosterPlayers: Object.values(OMEGA_2027_ROSTER),
    legalityAndBiomechanicsAudit: {
      snapsAudited: totalOmegaSnaps,
      legal7OnLosPct: +((legal7Count / totalOmegaSnaps) * 100).toFixed(2),
      legalUncoveredEndsPct: +((legalUncoveredCount / totalOmegaSnaps) * 100).toFixed(2),
      legalIneligibleBufferPct: +((legalOlBufCount / totalOmegaSnaps) * 100).toFixed(2),
      strictlyBackwardLateralsPct: +((legalBackLatCount / totalOmegaSnaps) * 100).toFixed(2),
      unengagedGForceViolations: bioViolationsG,
      peakUnengagedGForce: +maxObservedG.toFixed(3),
      overlapViolationsUnder020y: bioViolationsOverlap,
      minPlayerSeparationYds: +minObservedSep.toFixed(3),
    },
    omegaPlayTelemetry: omegaTelemetrySummary,
    nashEquilibrium: {
      omegaNashEpa: +omegaNash.nashValue.toFixed(4),
      omegaMix: Object.fromEntries(omegaOpenPlays.map((p, i) => [p.id, +(omegaNash.offWeights[i] * 100).toFixed(2)])),
      adversarialDcCounterMix: Object.fromEntries(OPEN_FRONTS.map((df, j) => [df, +(omegaNash.defWeights[j] * 100).toFixed(2)])),
      apexNashEpa: +apexNash.nashValue.toFixed(4),
      argonNashEpa: +argonNash.nashValue.toFixed(4),
      hydraNashEpa: +hydraNash.nashValue.toFixed(4),
      baselinesNashEpa: Object.fromEntries(BASELINE_PHILOSOPHIES.map((p) => [p.id, +baselineNashMap[p.id].nashValue.toFixed(4)])),
    },
    fullGameBenchmarks: fullGameResults,
    situationalDrills: {
      twoMinute: { omega: twoMinOmega, apex: twoMinApex, argon: twoMinArgon, conv11: twoMinConv, supermax: twoMinStars },
      fourMinute: { omega: fourMinOmega, apex: fourMinApex, argon: fourMinArgon, shanahan12: fourMinShan, conv11: fourMinConv },
      goalLine: { omega: glOmega, apex: glApex, argon: glArgon, shanahan12: glShan, conv11: glConv },
      thirdAndNine: { omega: tlOmega, apex: tlApex, argon: tlArgon, conv11: tlConv, supermax: tlStars },
    },
  };

  const dataDir = path.join(process.cwd(), 'src', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const outPath = path.join(dataDir, 'ultimate_2027_results.json');
  fs.writeFileSync(outPath, JSON.stringify(outSummary, null, 2), 'utf8');
  console.log(`[Saved] Empirical playtest & 7-way Nash benchmark written to: ${outPath}`);
}

runUltimate2027Playtest();
