import * as fs from 'fs';
import * as path from 'path';
import { All22KinematicEngine, SimAgent, SimFieldContext } from './engine.js';
import {
  HYDRA_2027_PLAYBOOK,
  buildModern2027Defense,
  ModernDefFrontId,
} from './vanguard_2027_playbook.js';
import { ARGON_2027_PLAYBOOK } from './argon_2027_playbook.js';

interface PlayEvaluationSummary {
  team: 'ARGON' | 'HYDRA';
  playId: string;
  name: string;
  category: 'RUN' | 'PASS';
  personnel: string;
  regime: 'OPEN_FIELD_1ST_10' | 'RED_ZONE_6YD';
  meanYds: number;
  meanEpa: number;
  successRatePct: number; // >= 4.0y or 1st down in open field; TD in red zone
  explosiveRatePct: number; // >= 15y in open field
  tdRatePct: number;
  negativeRatePct: number; // y <= 0
  turnoverRatePct: number;
  nashMinimaxEpa: number;
  bestMatchupDef: string;
  bestMatchupEpa: number;
  worstCounterDef: string;
  worstCounterEpa: number;
  compositeScore: number;
}

function solveZeroSumNash(matrix: number[][]): { offWeights: number[]; defWeights: number[]; nashValue: number } {
  const m = matrix.length;
  const n = matrix[0].length;
  const offRegret = new Array(m).fill(0);
  const defRegret = new Array(n).fill(0);
  const offStrategySum = new Array(m).fill(0);
  const defStrategySum = new Array(n).fill(0);

  const iterations = 8000;
  for (let it = 0; it < iterations; it++) {
    // Offensive choice
    let offSum = 0;
    const offStrat = new Array(m).fill(0);
    for (let i = 0; i < m; i++) {
      offStrat[i] = Math.max(0, offRegret[i]);
      offSum += offStrat[i];
    }
    if (offSum > 0) {
      for (let i = 0; i < m; i++) offStrat[i] /= offSum;
    } else {
      offStrat.fill(1 / m);
    }
    for (let i = 0; i < m; i++) offStrategySum[i] += offStrat[i];

    // Defensive choice
    let defSum = 0;
    const defStrat = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      defStrat[j] = Math.max(0, defRegret[j]);
      defSum += defStrat[j];
    }
    if (defSum > 0) {
      for (let j = 0; j < n; j++) defStrat[j] /= defSum;
    } else {
      defStrat.fill(1 / n);
    }
    for (let j = 0; j < n; j++) defStrategySum[j] += defStrat[j];

    // Expected payoffs
    const expectedDefPayoffs = new Array(m).fill(0);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        expectedDefPayoffs[i] += matrix[i][j] * defStrat[j];
      }
    }

    const expectedOffPayoffs = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) {
        expectedOffPayoffs[j] += matrix[i][j] * offStrat[i];
      }
    }

    const actualOffPayoff = offStrat.reduce((sum, w, i) => sum + w * expectedDefPayoffs[i], 0);
    const actualDefPayoff = defStrat.reduce((sum, w, j) => sum + w * expectedOffPayoffs[j], 0);

    for (let i = 0; i < m; i++) offRegret[i] += expectedDefPayoffs[i] - actualOffPayoff;
    for (let j = 0; j < n; j++) defRegret[j] += actualDefPayoff - expectedOffPayoffs[j];
  }

  const offSum = offStrategySum.reduce((a, b) => a + b, 0);
  const defSum = defStrategySum.reduce((a, b) => a + b, 0);
  const offWeights = offStrategySum.map((v) => v / offSum);
  const defWeights = defStrategySum.map((v) => v / defSum);

  let nashValue = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      nashValue += offWeights[i] * matrix[i][j] * defWeights[j];
    }
  }

  return { offWeights, defWeights, nashValue };
}

async function runTournament() {
  console.log('================================================================================');
  console.log('RUTHLESS EVOLUTIONARY PLAY TOURNAMENT: HYDRA VANGUARD vs. GOOGLE ARGON');
  console.log('Evaluating under Voronoi-Complete Defensive Coverage');
  console.log('================================================================================\n');

  const engine = new All22KinematicEngine();

  // ----------------------------------------------------------------------------
  // 1. OPEN FIELD 1ST & 10 TOURNAMENT
  // ----------------------------------------------------------------------------
  const OPEN_FRONTS: ModernDefFrontId[] = [
    'NICKEL_OVER_C3',
    'NICKEL_SIM_C2',
    'BASE_34_BEAR_C4',
    'BASE_43_OVER_C1',
    'DIME_QUARTERS_MATCH',
    'VIKINGS_MUG_CROSSDOG_C0',
    'VIKINGS_SAFETY_BLITZ_C1',
    'DIME_MUG_C0',
  ];

  interface CandidatePlay {
    team: 'ARGON' | 'HYDRA';
    id: string;
    name: string;
    category: 'RUN' | 'PASS';
    personnel: string;
    buildOffense: () => SimAgent[];
  }

  const openCandidates: CandidatePlay[] = [
    // Argon
    ...ARGON_2027_PLAYBOOK.filter((p) => p.id !== 'ARGON_GOALLINE_CYCLOTRON').map((p) => ({
      team: 'ARGON' as const,
      id: p.id,
      name: p.name,
      category: p.category,
      personnel: p.personnel,
      buildOffense: p.buildOffense,
    })),
    // Hydra
    ...HYDRA_2027_PLAYBOOK.filter((p) => p.id !== 'HYDRA_GOALLINE_PHILLY_SPECIAL').map((p) => ({
      team: 'HYDRA' as const,
      id: p.id,
      name: p.name,
      category: p.category,
      personnel: p.personnel,
      buildOffense: p.buildOffense,
    })),
  ];

  console.log(`[Regime 1] Simulating Open Field 1st & 10 across ${openCandidates.length} candidate concepts & ${OPEN_FRONTS.length} Voronoi defenses...`);
  const openPayoffMatrix: number[][] = [];
  const openSummaries: PlayEvaluationSummary[] = [];

  const SNAPS_PER_CELL = 40;

  for (let pIdx = 0; pIdx < openCandidates.length; pIdx++) {
    const cp = openCandidates[pIdx];
    const rowEpa: number[] = [];
    let sumYds = 0;
    let sumEpa = 0;
    let successCount = 0;
    let explosiveCount = 0;
    let tdCount = 0;
    let negativeCount = 0;
    let turnoverCount = 0;
    let totalSnaps = 0;

    let bestDef = OPEN_FRONTS[0];
    let bestDefEpa = -Infinity;
    let worstDef = OPEN_FRONTS[0];
    let worstDefEpa = Infinity;

    for (const df of OPEN_FRONTS) {
      let defEpaSum = 0;
      for (let s = 0; s < SNAPS_PER_CELL; s++) {
        totalSnaps++;
        const off = cp.buildOffense();
        const def = buildModern2027Defense(df);
        const traj = engine.simulatePlay([...off, ...def], 1.0); // Symmetric capped NO_FC evaluation for passes & sweeps
        const term = traj.find((t) => t.playOver) || traj[traj.length - 1];

        const fallbackCarrier = term.agents.find(
          (a) => a.side === 'OFF' && (a.id === term.ball?.carrierId || a.assignment.role === 'BALL_CARRIER')
        );
        const yards =
          term.carrierTackledYards ??
          (term.ball?.state === 'HELD' && fallbackCarrier ? +fallbackCarrier.y.toFixed(2) : 0);
        const epa = term.expectedEpa;

        sumYds += yards;
        sumEpa += epa;
        defEpaSum += epa;

        const isTurnover = term.terminationReason === 'FUMBLE_LOST' || term.terminationReason === 'INTERCEPTION';
        if (yards >= 4.0 && !isTurnover) successCount++;
        if (yards >= 15.0 && !isTurnover) explosiveCount++;
        if (!isTurnover && (term.terminationReason === 'TOUCHDOWN' || yards >= 75.0)) tdCount++;
        if (yards <= 0 || isTurnover) negativeCount++;
        if (isTurnover) {
          turnoverCount++;
        }
      }

      const meanDefEpa = defEpaSum / SNAPS_PER_CELL;
      rowEpa.push(meanDefEpa);
      if (meanDefEpa > bestDefEpa) {
        bestDefEpa = meanDefEpa;
        bestDef = df;
      }
      if (meanDefEpa < worstDefEpa) {
        worstDefEpa = meanDefEpa;
        worstDef = df;
      }
    }

    openPayoffMatrix.push(rowEpa);

    const meanYds = +(sumYds / totalSnaps).toFixed(2);
    const meanEpa = +(sumEpa / totalSnaps).toFixed(3);
    const successRatePct = +((successCount / totalSnaps) * 100).toFixed(1);
    const explosiveRatePct = +((explosiveCount / totalSnaps) * 100).toFixed(1);
    const tdRatePct = +((tdCount / totalSnaps) * 100).toFixed(1);
    const negativeRatePct = +((negativeCount / totalSnaps) * 100).toFixed(1);
    const turnoverRatePct = +((turnoverCount / totalSnaps) * 100).toFixed(1);

    openSummaries.push({
      team: cp.team,
      playId: cp.id,
      name: cp.name,
      category: cp.category,
      personnel: cp.personnel,
      regime: 'OPEN_FIELD_1ST_10',
      meanYds,
      meanEpa,
      successRatePct,
      explosiveRatePct,
      tdRatePct,
      negativeRatePct,
      turnoverRatePct,
      nashMinimaxEpa: 0, // filled after Nash solve
      bestMatchupDef: bestDef,
      bestMatchupEpa: +bestDefEpa.toFixed(3),
      worstCounterDef: worstDef,
      worstCounterEpa: +worstDefEpa.toFixed(3),
      compositeScore: 0,
    });
  }

  // Solve 14-play open field Nash equilibrium
  const openNash = solveZeroSumNash(openPayoffMatrix);
  for (let i = 0; i < openSummaries.length; i++) {
    // Minimax against adversarial DC
    const defMixEpa = openPayoffMatrix[i].reduce((sum, epa, j) => sum + epa * openNash.defWeights[j], 0);
    openSummaries[i].nashMinimaxEpa = +defMixEpa.toFixed(3);

    // Evolutionary Composite Score = 0.45 * NashMinimaxEPA + 0.25 * MeanEPA + 0.20 * (SuccessRate/100) + 0.10 * (ExplosiveRate/100) - 0.5 * (TurnoverRate/100)
    const compScore =
      0.45 * openSummaries[i].nashMinimaxEpa +
      0.25 * openSummaries[i].meanEpa +
      0.20 * (openSummaries[i].successRatePct / 100) +
      0.10 * (openSummaries[i].explosiveRatePct / 100) -
      0.50 * (openSummaries[i].turnoverRatePct / 100);

    openSummaries[i].compositeScore = +compScore.toFixed(4);
  }

  // Rank open field concepts
  openSummaries.sort((a, b) => b.compositeScore - a.compositeScore);

  console.log('\n--- TOP SURVIVING CONCEPTS (OPEN FIELD 1ST & 10) ---');
  openSummaries.forEach((s, idx) => {
    console.log(
      `${(idx + 1 + '.').padEnd(3)} [${s.team}] ${s.playId.padEnd(28)} | Score: ${s.compositeScore.toFixed(4)} | Nash: ${s.nashMinimaxEpa >= 0 ? '+' : ''}${s.nashMinimaxEpa.toFixed(3)} | Mean: ${s.meanYds >= 0 ? '+' : ''}${s.meanYds.toFixed(1)}y (${s.meanEpa >= 0 ? '+' : ''}${s.meanEpa.toFixed(2)} EPA) | Succ: ${s.successRatePct}% | Expl: ${s.explosiveRatePct}% | Worst Counter: ${s.worstCounterDef} (${s.worstCounterEpa})`
    );
  });

  const top5Open = openSummaries.slice(0, 5);

  // ----------------------------------------------------------------------------
  // 2. RED ZONE FROM THE 6-YARD LINE TOURNAMENT (+6.0y to Goal)
  // ----------------------------------------------------------------------------
  const REDZONE_FRONTS: ModernDefFrontId[] = [
    'GOAL_LINE_62_PINCH',
    'BASE_43_OVER_C1',
    'VIKINGS_MUG_CROSSDOG_C0',
    'NICKEL_UNDER_C1',
    'BASE_34_BEAR_C4',
  ];

  const redZoneCandidates: CandidatePlay[] = [
    // Goal line specials
    ...ARGON_2027_PLAYBOOK.filter((p) => p.id === 'ARGON_GOALLINE_CYCLOTRON').map((p) => ({
      team: 'ARGON' as const,
      id: p.id,
      name: p.name,
      category: p.category,
      personnel: p.personnel,
      buildOffense: p.buildOffense,
    })),
    ...HYDRA_2027_PLAYBOOK.filter((p) => p.id === 'HYDRA_GOALLINE_PHILLY_SPECIAL').map((p) => ({
      team: 'HYDRA' as const,
      id: p.id,
      name: p.name,
      category: p.category,
      personnel: p.personnel,
      buildOffense: p.buildOffense,
    })),
    // Short yardage & heavy sweeps / bash reads
    ...ARGON_2027_PLAYBOOK.filter((p) =>
      ['ARGON_REACTOR_SWEEP_RIGHT', 'ARGON_4MIN_LEFT_MONOLITH', 'ARGON_WILDCAT_TRIPLE_PITCH', 'ARGON_CHIRAL_JET_LEFT'].includes(p.id)
    ).map((p) => ({
      team: 'ARGON' as const,
      id: p.id,
      name: p.name,
      category: p.category,
      personnel: p.personnel,
      buildOffense: p.buildOffense,
    })),
    ...HYDRA_2027_PLAYBOOK.filter((p) =>
      ['HYDRA_4MIN_BULLDOZER_SWEEP', 'HYDRA_PONY_SPLIT_BASH', 'HYDRA_JET_DOUBLE_OPTION', 'HYDRA_6OL_ELIGIBLE_SEAM'].includes(p.id)
    ).map((p) => ({
      team: 'HYDRA' as const,
      id: p.id,
      name: p.name,
      category: p.category,
      personnel: p.personnel,
      buildOffense: p.buildOffense,
    })),
  ];

  console.log(`\n[Regime 2] Simulating Red Zone 1st & Goal from the 6-Yard Line across ${redZoneCandidates.length} concepts & ${REDZONE_FRONTS.length} heavy/goal-line fronts...`);

  const rzPayoffMatrix: number[][] = [];
  const rzSummaries: PlayEvaluationSummary[] = [];

  for (let pIdx = 0; pIdx < redZoneCandidates.length; pIdx++) {
    const cp = redZoneCandidates[pIdx];
    const rowEpa: number[] = [];
    let sumYds = 0;
    let sumEpa = 0;
    let tdCount = 0;
    let negativeCount = 0;
    let turnoverCount = 0;
    let totalSnaps = 0;

    let bestDef = REDZONE_FRONTS[0];
    let bestDefEpa = -Infinity;
    let worstDef = REDZONE_FRONTS[0];
    let worstDefEpa = Infinity;

    for (const df of REDZONE_FRONTS) {
      let defEpaSum = 0;
      for (let s = 0; s < SNAPS_PER_CELL; s++) {
        totalSnaps++;
        const off = cp.buildOffense();
        const def = buildModern2027Defense(df);
        const traj = engine.simulatePlay([...off, ...def], 1.0, { yardLineToGoal: 6.0, sidelineObjective: 'NORMAL' });
        const term = traj.find((t) => t.playOver) || traj[traj.length - 1];

        const fallbackCarrier = term.agents.find(
          (a) => a.side === 'OFF' && (a.id === term.ball?.carrierId || a.assignment.role === 'BALL_CARRIER')
        );
        const yards =
          term.carrierTackledYards ??
          (term.ball?.state === 'HELD' && fallbackCarrier ? +fallbackCarrier.y.toFixed(2) : 0);
        const isTurnover = term.terminationReason === 'FUMBLE_LOST' || term.terminationReason === 'INTERCEPTION';
        const isTd = !isTurnover && (term.terminationReason === 'TOUCHDOWN' || yards >= 5.95);
        const epa = term.expectedEpa;

        sumYds += yards;
        sumEpa += epa;
        defEpaSum += epa;

        if (isTd) tdCount++;
        if (yards <= 0 || isTurnover) negativeCount++;
        if (isTurnover) {
          turnoverCount++;
        }
      }

      const meanDefEpa = defEpaSum / SNAPS_PER_CELL;
      rowEpa.push(meanDefEpa);
      if (meanDefEpa > bestDefEpa) {
        bestDefEpa = meanDefEpa;
        bestDef = df;
      }
      if (meanDefEpa < worstDefEpa) {
        worstDefEpa = meanDefEpa;
        worstDef = df;
      }
    }

    rzPayoffMatrix.push(rowEpa);

    const meanYds = +(sumYds / totalSnaps).toFixed(2);
    const meanEpa = +(sumEpa / totalSnaps).toFixed(3);
    const tdRatePct = +((tdCount / totalSnaps) * 100).toFixed(1);
    const negativeRatePct = +((negativeCount / totalSnaps) * 100).toFixed(1);
    const turnoverRatePct = +((turnoverCount / totalSnaps) * 100).toFixed(1);

    rzSummaries.push({
      team: cp.team,
      playId: cp.id,
      name: cp.name,
      category: cp.category,
      personnel: cp.personnel,
      regime: 'RED_ZONE_6YD',
      meanYds,
      meanEpa,
      successRatePct: tdRatePct, // In RZ 1st & G at +6y, success is Touchdown!
      explosiveRatePct: 0,
      tdRatePct,
      negativeRatePct,
      turnoverRatePct,
      nashMinimaxEpa: 0,
      bestMatchupDef: bestDef,
      bestMatchupEpa: +bestDefEpa.toFixed(3),
      worstCounterDef: worstDef,
      worstCounterEpa: +worstDefEpa.toFixed(3),
      compositeScore: 0,
    });
  }

  // Solve Red Zone Nash equilibrium
  const rzNash = solveZeroSumNash(rzPayoffMatrix);
  for (let i = 0; i < rzSummaries.length; i++) {
    const defMixEpa = rzPayoffMatrix[i].reduce((sum, epa, j) => sum + epa * rzNash.defWeights[j], 0);
    rzSummaries[i].nashMinimaxEpa = +defMixEpa.toFixed(3);

    // In red zone from +6y:
    // Composite Score = 0.50 * TD_Rate/100 + 0.30 * NashMinimaxEPA/3.0 + 0.20 * (MeanYards/6.0) - 0.60 * (TurnoverRate/100)
    const compScore =
      0.50 * (rzSummaries[i].tdRatePct / 100) +
      0.30 * (rzSummaries[i].nashMinimaxEpa / 3.0) +
      0.20 * (Math.min(6.0, rzSummaries[i].meanYds) / 6.0) -
      0.60 * (rzSummaries[i].turnoverRatePct / 100);

    rzSummaries[i].compositeScore = +compScore.toFixed(4);
  }

  // Rank Red Zone concepts
  rzSummaries.sort((a, b) => b.compositeScore - a.compositeScore);

  console.log('\n--- TOP SURVIVING CONCEPTS (RED ZONE FROM THE 6-YARD LINE) ---');
  rzSummaries.forEach((s, idx) => {
    console.log(
      `${(idx + 1 + '.').padEnd(3)} [${s.team}] ${s.playId.padEnd(30)} | Score: ${s.compositeScore.toFixed(4)} | TD Rate: ${s.tdRatePct}% | Nash: ${s.nashMinimaxEpa >= 0 ? '+' : ''}${s.nashMinimaxEpa.toFixed(3)} | Mean: +${s.meanYds.toFixed(1)}y (${s.meanEpa >= 0 ? '+' : ''}${s.meanEpa.toFixed(2)} EPA) | Neg: ${s.negativeRatePct}% | Worst Counter: ${s.worstCounterDef} (${s.worstCounterEpa})`
    );
  });

  const top3Rz = rzSummaries.slice(0, 3);

  // Save full results to JSON
  const outData = {
    generatedAt: new Date().toISOString(),
    regime1_openField: {
      candidatesEvaluated: openSummaries.length,
      nashEquilibriumValue: +openNash.nashValue.toFixed(4),
      topSurviving: top5Open,
      fullRankings: openSummaries,
    },
    regime2_redZone6Yd: {
      candidatesEvaluated: rzSummaries.length,
      nashEquilibriumValue: +rzNash.nashValue.toFixed(4),
      topSurviving: top3Rz,
      fullRankings: rzSummaries,
    },
  };

  const outJsonPath = path.join(process.cwd(), 'src', 'data', 'ruthless_evolution_results.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(outData, null, 2), 'utf8');
  console.log(`\n[OK] Complete evolutionary tournament dataset saved to: ${outJsonPath}`);
}

runTournament();
