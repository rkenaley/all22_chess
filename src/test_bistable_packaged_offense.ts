import * as fs from 'fs';
import * as path from 'path';
import { All22KinematicEngine, SimAgent } from './engine.js';
import {
  KBC_2027_PLAYBOOK,
  detectDefensiveAttractor,
} from './bistable_packaged_playbook.js';
import {
  buildModern2027Defense,
  ModernDefFrontId,
} from './vanguard_2027_playbook.js';

async function runBistableAudit() {
  console.log('================================================================================');
  console.log('KINETIC BISTABLE CONTINUUM (KBC-2027) AUDIT: THE PEYTON MANNING EFFECT');
  console.log('Testing Pre-Snap Reactive Audibles against Bistable Attractors Alpha & Beta');
  console.log('================================================================================\n');

  const engine = new All22KinematicEngine();

  const ATTRACTOR_ALPHA_DEFS: ModernDefFrontId[] = [
    'VIKINGS_MUG_CROSSDOG_C0',
    'BASE_43_OVER_C1',
    'DIME_MUG_C0',
    'VIKINGS_SAFETY_BLITZ_C1',
  ];

  const ATTRACTOR_BETA_DEFS: ModernDefFrontId[] = [
    'NICKEL_OVER_C3',
    'BASE_34_BEAR_C4',
    'DIME_QUARTERS_MATCH',
    'NICKEL_SIM_C2',
  ];

  const TRIALS_PER_MATCHUP = 50;

  // Let's test PLAY 1: KBC_PACKAGED_CONTINUUM_OMEGA
  const kbcPlay = KBC_2027_PLAYBOOK[0]; // KBC OMEGA

  interface PerformanceMetrics {
    snaps: number;
    meanYds: number;
    meanEpa: number;
    successRatePct: number;
    explosiveRatePct: number;
    turnoverRatePct: number;
  }

  function evaluateConcept(
    isReactiveAudible: boolean,
    defensiveFronts: ModernDefFrontId[]
  ): PerformanceMetrics {
    let sumYds = 0;
    let sumEpa = 0;
    let successCount = 0;
    let explosiveCount = 0;
    let turnoverCount = 0;
    let totalSnaps = 0;

    for (const df of defensiveFronts) {
      for (let t = 0; t < TRIALS_PER_MATCHUP; t++) {
        totalSnaps++;
        const baseDef = buildModern2027Defense(df);
        let off: SimAgent[];

        if (isReactiveAudible) {
          const attractorResult = detectDefensiveAttractor(baseDef, df);
          off = kbcPlay.buildAuditedOffense(attractorResult.attractor);
        } else {
          off = kbcPlay.buildBaseOffense();
        }

        const traj = engine.simulatePlay([...off, ...baseDef], 1.0, { yardLineToGoal: 75.0, sidelineObjective: 'NORMAL' });
        const term = traj.find((s) => s.playOver) || traj[traj.length - 1];

        const fallbackCarrier = term.agents.find(
          (a) => a.side === 'OFF' && (a.id === term.ball?.carrierId || a.assignment.role === 'BALL_CARRIER')
        );
        const yards =
          term.carrierTackledYards ??
          (term.ball?.state === 'HELD' && fallbackCarrier ? +fallbackCarrier.y.toFixed(2) : 0);
        const epa = term.expectedEpa;

        sumYds += yards;
        sumEpa += epa;

        if (yards >= 4.0) successCount++;
        if (yards >= 15.0) explosiveCount++;
        if (term.terminationReason === 'FUMBLE_LOST') turnoverCount++;
      }
    }

    return {
      snaps: totalSnaps,
      meanYds: +(sumYds / totalSnaps).toFixed(2),
      meanEpa: +(sumEpa / totalSnaps).toFixed(3),
      successRatePct: +((successCount / totalSnaps) * 100).toFixed(1),
      explosiveRatePct: +((explosiveCount / totalSnaps) * 100).toFixed(1),
      turnoverRatePct: +((turnoverCount / totalSnaps) * 100).toFixed(1),
    };
  }

  console.log('[1/4] Testing Static Blind Base Call vs. Attractor Alpha (Man / Overload Blitz)...');
  const staticAlpha = evaluateConcept(false, ATTRACTOR_ALPHA_DEFS);

  console.log('[2/4] Testing Reactive Peyton Audible vs. Attractor Alpha (Checked to Displaced Laser)...');
  const reactiveAlpha = evaluateConcept(true, ATTRACTOR_ALPHA_DEFS);

  console.log('[3/4] Testing Static Blind Base Call vs. Attractor Beta (2-High / Voronoi Zone Match)...');
  const staticBeta = evaluateConcept(false, ATTRACTOR_BETA_DEFS);

  console.log('[4/4] Testing Reactive Peyton Audible vs. Attractor Beta (Checked to 11-on-11 Reactor Sweep)...');
  const reactiveBeta = evaluateConcept(true, ATTRACTOR_BETA_DEFS);

  console.log('\n================================================================================');
  console.log('EMPIRICAL TOURNAMENT RESULTS: STATIC BLIND vs. PEYTON REACTIVE AUDIBLES');
  console.log('================================================================================');
  console.log('\n--- ATTRACTOR ALPHA (MAN PRESSURE / ZERO BLITZ POLE) ---');
  console.log(`Static Blind Call:      ${staticAlpha.meanYds >= 0 ? '+' : ''}${staticAlpha.meanYds}y | EPA: ${staticAlpha.meanEpa >= 0 ? '+' : ''}${staticAlpha.meanEpa} | Success: ${staticAlpha.successRatePct}% | Explosive: ${staticAlpha.explosiveRatePct}%`);
  console.log(`Peyton Reactive Check:  ${reactiveAlpha.meanYds >= 0 ? '+' : ''}${reactiveAlpha.meanYds}y | EPA: ${reactiveAlpha.meanEpa >= 0 ? '+' : ''}${reactiveAlpha.meanEpa} | Success: ${reactiveAlpha.successRatePct}% | Explosive: ${reactiveAlpha.explosiveRatePct}%`);
  console.log(`-> DELTA GAIN:          +${(reactiveAlpha.meanYds - staticAlpha.meanYds).toFixed(1)}y | EPA LIFT: +${(reactiveAlpha.meanEpa - staticAlpha.meanEpa).toFixed(2)} EPA/snap`);

  console.log('\n--- ATTRACTOR BETA (VORONOI 2-HIGH QUARTERS MATCH POLE) ---');
  console.log(`Static Blind Call:      ${staticBeta.meanYds >= 0 ? '+' : ''}${staticBeta.meanYds}y | EPA: ${staticBeta.meanEpa >= 0 ? '+' : ''}${staticBeta.meanEpa} | Success: ${staticBeta.successRatePct}% | Explosive: ${staticBeta.explosiveRatePct}%`);
  console.log(`Peyton Reactive Check:  ${reactiveBeta.meanYds >= 0 ? '+' : ''}${reactiveBeta.meanYds}y | EPA: ${reactiveBeta.meanEpa >= 0 ? '+' : ''}${reactiveBeta.meanEpa} | Success: ${reactiveBeta.successRatePct}% | Explosive: ${reactiveBeta.explosiveRatePct}%`);
  console.log(`-> DELTA GAIN:          +${(reactiveBeta.meanYds - staticBeta.meanYds).toFixed(1)}y | EPA LIFT: +${(reactiveBeta.meanEpa - staticBeta.meanEpa).toFixed(2)} EPA/snap`);

  // Overall Offense Expected EPA with Last-Mover Advantage (assuming 50/50 defensive mix)
  const staticBlendedEpa = +(0.5 * staticAlpha.meanEpa + 0.5 * staticBeta.meanEpa).toFixed(3);
  const reactiveBlendedEpa = +(0.5 * reactiveAlpha.meanEpa + 0.5 * reactiveBeta.meanEpa).toFixed(3);
  console.log('\n--- SYSTEMIC BISTABLE COLLAPSE ---');
  console.log(`Static Blind Playbook Expected EPA:   ${staticBlendedEpa >= 0 ? '+' : ''}${staticBlendedEpa} EPA/snap`);
  console.log(`KBC Peyton Packaged Play Expected EPA: ${reactiveBlendedEpa >= 0 ? '+' : ''}${reactiveBlendedEpa} EPA/snap`);
  console.log(`TOTAL NET SURPLUS VALUE:              +${(reactiveBlendedEpa - staticBlendedEpa).toFixed(3)} EPA/snap`);

  const reportPath = path.join(process.cwd(), 'src', 'data', 'bistable_packaged_results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        conceptTested: 'KBC_PACKAGED_CONTINUUM_OMEGA',
        trialsPerCell: TRIALS_PER_MATCHUP,
        staticAlpha,
        reactiveAlpha,
        staticBeta,
        reactiveBeta,
        staticBlendedEpa,
        reactiveBlendedEpa,
        netSurplusEpa: +(reactiveBlendedEpa - staticBlendedEpa).toFixed(3),
      },
      null,
      2
    )
  );
  console.log(`\n[OK] Results persisted to: ${reportPath}`);
}

runBistableAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
