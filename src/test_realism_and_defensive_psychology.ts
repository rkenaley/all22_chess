import assert from 'node:assert/strict';
import {
  All22KinematicEngine,
  GAP_X_COORDS,
  PlayTickSnapshot,
  SimAgent,
} from './engine.js';
import { ARGON_2027_PLAYBOOK } from './argon_2027_playbook.js';
import { buildModern2027Defense, ModernDefFrontId } from './vanguard_2027_playbook.js';
import { KBC_2027_PLAYBOOK, detectDefensiveAttractor } from './bistable_packaged_playbook.js';

function makeDummyBlocker(id: string, pos: string, x: number, y: number): SimAgent {
  return {
    id,
    label: pos,
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
    ratings: { speed: 74, accel: 80, power: 84, finesse: 84, awareness: 84 },
    assignment: {
      role: 'PASS_SET',
      primaryTargetId: null,
      secondaryTargetId: null,
      gapOrSet: 'JUMP_SET',
      leverage: 'NEUTRAL',
      climbOrChipDelaySec: 0,
      waypoints: [],
    },
  };
}

function makeDummyDefender(
  id: string,
  pos: string,
  x: number,
  y: number,
  defAssignment: NonNullable<SimAgent['defAssignment']>
): SimAgent {
  return {
    id,
    label: pos,
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
    ratings: { speed: 86, accel: 88, power: 84, finesse: 84, awareness: 84 },
    assignment: {
      role: 'PASS_SET',
      primaryTargetId: null,
      secondaryTargetId: null,
      gapOrSet: 'VERTICAL_DEEP',
      leverage: 'NEUTRAL',
      climbOrChipDelaySec: 0,
      waypoints: [],
    },
    defAssignment,
  };
}

function verifyTrajectoryBiomechanics(traj: PlayTickSnapshot[], label: string): void {
  const dt = 0.05;
  for (let t = 1; t < traj.length; t++) {
    const prev = traj[t - 1];
    const curr = traj[t];
    for (const aCurr of curr.agents) {
      const aPrev = prev.agents.find((p) => p.id === aCurr.id);
      if (!aPrev) continue;
      if (!aCurr.engagedWithId && !aPrev.engagedWithId) {
        const dv = Math.hypot(aCurr.vx - aPrev.vx, aCurr.vy - aPrev.vy);
        const gs = dv / dt / 10.72;
        assert.ok(
          gs <= 1.60,
          `[${label}] Unengaged G-force violation at t=${curr.timeSec}s for ${aCurr.id}: ${gs.toFixed(2)}G`
        );
      }
    }
    for (let i = 0; i < curr.agents.length; i++) {
      for (let j = i + 1; j < curr.agents.length; j++) {
        const a = curr.agents[i];
        const b = curr.agents[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        assert.ok(
          d >= 0.20,
          `[${label}] Overlap violation at t=${curr.timeSec}s between ${a.id} & ${b.id}: ${d.toFixed(3)}y`
        );
      }
    }
  }
}

async function runTests() {
  const engine = new All22KinematicEngine();
  console.log('======================================================================');
  console.log('VALIDATION SUITE: ENGINE REALISM, DEFENSIVE PSYCHOLOGY & ANTI-GAMING');
  console.log('======================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Per-Snap Probabilistic Defensive Responsibility Distribution & Disguise
  // ---------------------------------------------------------------------------
  {
    const baseOff = KBC_2027_PLAYBOOK[0].buildBaseOffense();
    const weightedDef = makeDummyDefender('MIKE_W', 'MIKE', 1.5, 3.8, {
      role: 'HOOK_CURL',
      targetX: 1.5,
      targetY: 5.5,
      probabilityWeights: [
        { role: 'HOOK_CURL', weight: 0.7, targetX: 1.5, targetY: 5.5 },
        { role: 'BLITZ_A', weight: 0.3, targetX: 0.9, targetY: -3.5, gap: 'A_RIGHT' },
      ],
    });
    const fillerDef = makeDummyDefender('CB_W', 'CB1', -17.0, 6.0, {
      role: 'DEEP_HALF',
      targetX: -12.0,
      targetY: 14.0,
    });

    // Deterministic mode must NOT trigger stochastic weights
    const detTraj = engine.simulatePlay([...baseOff, weightedDef, fillerDef], 0.0);
    const detMike = detTraj[0].agents.find((a) => a.id === 'MIKE_W');
    assert.equal(detMike?.defAssignment?.role, 'HOOK_CURL', 'Deterministic mode must preserve default role');

    // Stochastic mode samples probabilityWeights distribution authentically
    let blitzCount = 0;
    let hookCount = 0;
    for (let i = 0; i < 160; i++) {
      const traj = engine.simulatePlay([...baseOff, weightedDef, fillerDef], 1.0);
      const role = traj[0].agents.find((a) => a.id === 'MIKE_W')?.defAssignment?.role;
      if (role === 'BLITZ_A' || role === 'BLITZ_RUN_GAP') blitzCount++;
      else if (role === 'HOOK_CURL') hookCount++;
    }
    console.log(
      `[1a] probabilityWeights sampling (N=160): HOOK_CURL=${hookCount}, BLITZ=${blitzCount}`
    );
    assert.ok(blitzCount >= 18 && hookCount >= 65, `Unexpected sampling counts: hook=${hookCount}, blitz=${blitzCount}`);

    // Full 11v11 defense disguise/rotation variety against Jet Motion look
    const disguiseSet = new Set<string>();
    const fsRoles = new Set<string>();
    for (let i = 0; i < 120; i++) {
      const def = buildModern2027Defense('NICKEL_SIM_C2');
      const traj = engine.simulatePlay([...KBC_2027_PLAYBOOK[0].buildBaseOffense(), ...def], 1.0);
      if (traj[0].appliedDefDisguise) {
        for (const tag of traj[0].appliedDefDisguise.split('|')) disguiseSet.add(tag);
      }
      const fs = traj[0].agents.find((a) => a.pos === 'FS' || a.id === 'FS');
      if (fs?.defAssignment?.role) fsRoles.add(fs.defAssignment.role);
    }
    console.log(
      `[1b] NICKEL_SIM_C2 disguise variety (N=120): tags=[${Array.from(disguiseSet).join(', ')}], FS roles=[${Array.from(fsRoles).join(', ')}]`
    );
    assert.ok(disguiseSet.size >= 2, `Expected >=2 defensive disguise/psychology mechanics, got ${disguiseSet.size}`);
    assert.ok(fsRoles.size >= 2, `Expected FS shell variation across spins, got ${Array.from(fsRoles).join(', ')}`);
  }

  // ---------------------------------------------------------------------------
  // 2. Anti-Oracle Pre-Snap Audible Check + KBC Plays 1-5 Distinctness
  // ---------------------------------------------------------------------------
  {
    const fronts: ModernDefFrontId[] = ['VIKINGS_MUG_CROSSDOG_C0', 'NICKEL_SIM_C2', 'BASE_34_BEAR_C4'];
    for (const df of fronts) {
      const realDef = buildModern2027Defense(df);
      const strippedDef = realDef.map((d) => ({
        ...d,
        defAssignment: {
          role: 'HOOK_CURL' as const,
          targetX: d.startX,
          targetY: d.startY,
        },
      }));
      const realDet = detectDefensiveAttractor(realDef);
      const strippedDet = detectDefensiveAttractor(strippedDef);
      assert.equal(
        realDet.attractor,
        strippedDet.attractor,
        `detectDefensiveAttractor peeked at hidden defAssignment for ${df}`
      );
      assert.equal(
        realDet.reason,
        strippedDet.reason,
        `detectDefensiveAttractor reason depended on hidden role for ${df}`
      );
    }

    const baseSignatures = new Set(
      KBC_2027_PLAYBOOK.map((p) => {
        const off = p.buildBaseOffense();
        const qb = off.find((a) => a.pos === 'QB');
        const routes = off.filter((a) => a.assignment.role === 'ROUTE').length;
        return `${p.id}:${qb?.startX.toFixed(1)},${qb?.startY.toFixed(1)}:${routes}:${off[0]?.startX.toFixed(1)}`;
      })
    );
    console.log(`[2] Anti-oracle check PASSED; KBC unique play signatures: ${baseSignatures.size}/${KBC_2027_PLAYBOOK.length}`);
    assert.equal(baseSignatures.size, KBC_2027_PLAYBOOK.length, 'Each KBC play 1-5 must produce a distinct offense');
  }

  // ---------------------------------------------------------------------------
  // 3. Gap-Attack Discipline (RUSH_GAP attacks assigned gap before chasing RB)
  // ---------------------------------------------------------------------------
  {
    const gapRunner: SimAgent = {
      ...makeDummyBlocker('RB', 'RB', 0.0, -4.5),
      ratings: { speed: 92, accel: 92, power: 82, finesse: 86, awareness: 85 },
      assignment: {
        role: 'BALL_CARRIER',
        primaryTargetId: null,
        secondaryTargetId: null,
        gapOrSet: 'C_LEFT',
        leverage: 'NEUTRAL',
        climbOrChipDelaySec: 0,
        waypoints: [
          { x: -7.5, y: -2.0 },
          { x: -8.5, y: 8.0 },
        ],
      },
    };
    const gapDt = makeDummyDefender('DT_R', 'DT', 2.3, 0.7, {
      role: 'RUSH_GAP',
      targetX: 2.3,
      targetY: -1.5,
      gap: 'B_RIGHT',
    });
    const farCb = makeDummyDefender('CB_FAR', 'CB1', 18.0, 6.0, {
      role: 'DEEP_HALF',
      targetX: 16.0,
      targetY: 12.0,
    });
    const traj = engine.simulatePlay([gapRunner, gapDt, farCb], 0.0);
    const snapT25 = traj.find((s) => Math.abs(s.timeSec - 0.25) < 0.01);
    assert.ok(snapT25, 'Expected T=0.25s snapshot');
    const dtPos = snapT25.agents.find((a) => a.id === 'DT_R')!;
    const bRightX = GAP_X_COORDS.B_RIGHT.dx;
    console.log(
      `[3] Gap-Attack Discipline at T=0.25s: B_RIGHT=${bRightX.toFixed(2)}y, DT.x=${dtPos.x.toFixed(2)}y, DT.y=${dtPos.y.toFixed(2)}y`
    );
    assert.ok(
      Math.abs(dtPos.x - bRightX) <= 0.75 && dtPos.x > 1.0,
      `RUSH_GAP DT failed gap discipline: walked out of B_RIGHT gap (${bRightX}) to x=${dtPos.x}`
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Symmetric NO_FC Sweep YAC Cap (prevents 30-35y runaway run inflation)
  // ---------------------------------------------------------------------------
  {
    const sweepPlay =
      ARGON_2027_PLAYBOOK.find((p) => p.id === 'ARGON_REACTOR_SWEEP_RIGHT') ||
      ARGON_2027_PLAYBOOK[0];
    let maxYards = -99;
    let sumYards = 0;
    for (let i = 0; i < 60; i++) {
      const off = sweepPlay.buildOffense();
      const def = buildModern2027Defense('DIME_MUG_C0');
      const traj = engine.simulatePlay([...off, ...def], 1.0); // NO_FC
      verifyTrajectoryBiomechanics(traj, `NO_FC_SWEEP#${i}`);
      const term = traj.find((s) => s.playOver) || traj[traj.length - 1];
      const y = term.carrierTackledYards ?? 0;
      if (y > maxYards) maxYards = y;
      sumYards += y;
    }
    const meanYards = sumYards / 60;
    console.log(
      `[4] Symmetric NO_FC Sweep Cap (${sweepPlay.id} vs DIME_MUG_C0, N=60): mean=${meanYards.toFixed(2)}y, max=${maxYards.toFixed(2)}y`
    );
    assert.ok(maxYards < 20.0, `Expected capped open-field sweep max < 20y, got ${maxYards}`);
  }

  // ---------------------------------------------------------------------------
  // 5. Real INTERCEPTION Physics & EPA + Option Pass Pressure Hazard
  // ---------------------------------------------------------------------------
  {
    const qb: SimAgent = {
      ...makeDummyBlocker('QB', 'QB', 0.0, -5.0),
      ratings: { speed: 75, accel: 80, power: 72, finesse: 64, awareness: 72 },
      assignment: {
        role: 'QB_DROP',
        primaryTargetId: null,
        secondaryTargetId: null,
        gapOrSet: 'VERTICAL_DEEP',
        leverage: 'NEUTRAL',
        climbOrChipDelaySec: 0,
        waypoints: [{ x: 0, y: -6.5 }],
      },
    };
    const wr: SimAgent = {
      ...makeDummyBlocker('WR1', 'WR', 12.0, 0.0),
      ratings: { speed: 88, accel: 88, power: 68, finesse: 84, awareness: 84 },
      assignment: {
        role: 'ROUTE',
        primaryTargetId: null,
        secondaryTargetId: null,
        gapOrSet: 'D_ALLEY',
        leverage: 'NEUTRAL',
        climbOrChipDelaySec: 0,
        waypoints: [{ x: 12.0, y: 16.0 }],
      },
    };
    const ol1 = makeDummyBlocker('C', 'C', 0.0, -0.45);
    const ol2 = makeDummyBlocker('LG', 'LG', -1.6, -0.45);
    const ol3 = makeDummyBlocker('RG', 'RG', 1.6, -0.45);
    const tightCb = makeDummyDefender('CB_SHUT', 'CB1', 12.0, 2.2, {
      role: 'MAN_COV',
      manTargetId: 'WR1',
      targetX: 12.0,
      targetY: 8.0,
    });
    const bracketSafety = makeDummyDefender('FS_BRK', 'FS', 11.2, 11.5, {
      role: 'DEEP_HALF',
      targetX: 12.0,
      targetY: 14.5,
    });

    let intCount = 0;
    for (let i = 0; i < 180; i++) {
      const traj = engine.simulatePlay([qb, ol1, ol2, ol3, wr, tightCb, bracketSafety], 1.0);
      const term = traj.find((s) => s.playOver) || traj[traj.length - 1];
      if (term.terminationReason === 'INTERCEPTION') {
        intCount++;
        assert.equal(term.carrierTackledYards, 0, 'INTERCEPTION offense gain must be 0');
        assert.ok(term.expectedEpa <= -3.5, `Expected realistic INT EPA <= -3.5, got ${term.expectedEpa}`);
      }
    }
    console.log(`[5a] Contested coverage INTERCEPTION check (N=180): INTS=${intCount}`);
    assert.ok(intCount >= 5, `Expected >=5 legitimate INTERCEPTION outcomes under double-covered low-tier throw, got ${intCount}`);

    // Option-pass pressure risk: defender sitting right in option passer's face stops risk-free abort
    const optCarrier: SimAgent = {
      ...makeDummyBlocker('OPT', 'WR', 0.0, -3.5),
      ratings: { speed: 94, accel: 94, power: 75, finesse: 86, awareness: 85 },
      assignment: {
        role: 'BALL_CARRIER',
        primaryTargetId: null,
        secondaryTargetId: null,
        gapOrSet: 'C_RIGHT',
        leverage: 'NEUTRAL',
        climbOrChipDelaySec: 0,
        waypoints: [{ x: 10.0, y: 10.0 }],
      },
      optionPass: {
        enabled: true,
        throwerRating: 68,
        decisionWindowStartSec: 0.15,
        decisionWindowEndSec: 0.90,
        primaryReceiverId: 'WR_TGT',
        separationThresholdYds: 2.0,
      },
    };
    const optWr: SimAgent = {
      ...makeDummyBlocker('WR_TGT', 'WR', 14.0, 0.0),
      assignment: {
        role: 'ROUTE',
        primaryTargetId: null,
        secondaryTargetId: null,
        gapOrSet: 'D_ALLEY',
        leverage: 'NEUTRAL',
        climbOrChipDelaySec: 0,
        waypoints: [{ x: 14.0, y: 12.0 }],
      },
    };
    const optCov = makeDummyDefender('CB_OPT', 'CB2', 14.0, 3.0, {
      role: 'MAN_COV',
      manTargetId: 'WR_TGT',
      targetX: 14.0,
      targetY: 8.0,
    });
    const blitzHit = makeDummyDefender('LB_HIT', 'MIKE', 1.2, -3.0, {
      role: 'BLITZ_A',
      targetX: 0.0,
      targetY: -4.0,
    });
    const optTraj = engine.simulatePlay([optCarrier, optWr, optCov, blitzHit], 0.0);
    const optTerm = optTraj.find((s) => s.playOver) || optTraj[optTraj.length - 1];
    console.log(
      `[5b] Option-pass under immediate crash: reason=${optTerm.terminationReason}, yds=${optTerm.carrierTackledYards}`
    );
    assert.equal(optTerm.terminationReason, 'TACKLED', 'Free hitter closing on option passer must tackle/stop option');
    assert.ok((optTerm.carrierTackledYards ?? 0) <= 0.5, 'Option passer under crash must not break cleanly upfield');
  }

  // ---------------------------------------------------------------------------
  // 6. Full 11v11 Mixed Play Biomechanics Audit (0 G-Force >1.60G, 0 Overlaps)
  // ---------------------------------------------------------------------------
  {
    const fronts: ModernDefFrontId[] = ['NICKEL_OVER_C3', 'DIME_MUG_C0', 'NICKEL_SIM_C2'];
    let checks = 0;
    for (const kbc of KBC_2027_PLAYBOOK) {
      for (const df of fronts) {
        for (let t = 0; t < 4; t++) {
          const def = buildModern2027Defense(df);
          const off = kbc.buildAuditedOffense(detectDefensiveAttractor(def).attractor);
          const traj = engine.simulatePlay([...off, ...def], 1.0);
          verifyTrajectoryBiomechanics(traj, `${kbc.id}:${df}#${t}`);
          checks++;
        }
      }
    }
    console.log(`[6] Full 11v11 KBC x Modern 2027 Fronts biomechanical invariant checks PASSED (${checks} snaps, 0 G-force or overlap violations)`);
  }

  console.log('\n[PASS] ALL ENGINE REALISM, DEFENSIVE PSYCHOLOGY & ANTI-GAMING VALIDATIONS SUCCEEDED.');
}

runTests().catch((err) => {
  console.error('\n[FAIL]', err);
  process.exit(1);
});
