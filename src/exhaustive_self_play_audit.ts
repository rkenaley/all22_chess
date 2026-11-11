import { All22KinematicEngine, SimAgent, GapOrSetCode, BlockRoleType, LeverageBias } from './engine';

interface SelfPlayScenarioResult {
  scenarioName: string;
  offConcept: string;
  defFront: string;
  ticks: number;
  finalTimeSec: number;
  finalEpa: number;
  minPocketIntegrity: number;
  finalPocketIntegrity: number;
  meanTrenchDisplacement: number;
  maxDefenderPenetrationY: number;
  unblockedRusherAtQb: boolean;
  timeToPressureSec: number | null;
  sackOccurred: boolean;
  blockerDisengagementsCount: number;
  maxLateralAccelGs: number;
  zoneDefendersMovementPostLandmark: number;
  ballCarrierClippingCollisions: number;
  observations: string[];
}

// Helper to construct standard offensive unit
function buildOffensiveUnit(
  scheme: 'PASS_HALF_SLIDE' | 'RUN_DUO_COMBO' | 'RUN_POWER_PULL' | 'PASS_CHIP_FLOOD' | 'INSIDE_ZONE_R' | 'OUTSIDE_ZONE_L' | 'PIN_AND_PULL',
  olRatingMod = 0
): SimAgent[] {
  const r = (base: number) => Math.max(40, Math.min(99, base + olRatingMod));
  const make = (
    id: string, pos: string, x: number, y: number,
    role: BlockRoleType, gap: GapOrSetCode,
    t1: string | null = null, t2: string | null = null,
    lev: LeverageBias = 'INSIDE_OUT',
    wps: Array<{ x: number; y: number }> = [],
    sp = 78, pwr = 88
  ): SimAgent => ({
    id, label: pos, side: 'OFF', pos,
    startX: x, startY: y, x, y, vx: 0, vy: 0, fx: 0, fy: 0,
    engagedWithId: null, leverageScore: 0,
    ratings: { speed: sp, accel: r(82), power: r(pwr), finesse: r(85), awareness: r(85) },
    assignment: { role, primaryTargetId: t1, secondaryTargetId: t2, gapOrSet: gap, leverage: lev, climbOrChipDelaySec: 0.65, waypoints: wps }
  });

  if (scheme === 'RUN_DUO_COMBO') {
    return [
      make('LT', 'LT', -3.2, -0.4, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
      make('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL'),
      make('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      make('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'NEUTRAL'),
      make('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
      make('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
      make('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT', [], 88, 65),
      make('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT', [], 88, 65),
      make('SL', 'SL', -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN', [], 86, 68),
      make('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.4, y: -4.8 }], 75, 70),
      make('RB', 'RB', -1.2, -4.8, 'BALL_CARRIER', 'B_RIGHT', null, null, 'NEUTRAL', [
        { x: 0.8, y: -1.5 }, { x: 2.1, y: 4.0 }, { x: 2.4, y: 14.0 }
      ], 89, 82),
    ];
  }

  if (scheme === 'RUN_POWER_PULL') {
    return [
      make('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'),
      make('LG', 'LG', -1.6, -0.3, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
        { x: -0.5, y: -1.4 }, { x: 2.8, y: -1.1 }, { x: 3.4, y: 3.8 }
      ]),
      make('C', 'C', 0.0, -0.2, 'MAN_BLOCK', 'A_LEFT', 'NT', null, 'OUTSIDE_IN'),
      make('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
      make('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
      make('TE', 'TE', 4.8, -0.4, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [{ x: 4.2, y: 0.4 }, { x: 4.9, y: 1.4 }]),
      make('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14, y: 12 }], 89, 65),
      make('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT', [], 88, 65),
      make('SL', 'FB', 0.0, -3.2, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [{ x: 3.6, y: -0.5 }, { x: 4.5, y: 1.2 }], 82, 85),
      make('QB', 'QB', 0.0, -1.8, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: -3.5 }], 75, 70),
      make('RB', 'RB', 0.0, -5.2, 'BALL_CARRIER', 'C_RIGHT', null, null, 'NEUTRAL', [
        { x: 2.8, y: -1.0 }, { x: 3.5, y: 6.0 }, { x: 4.2, y: 15.0 }
      ], 89, 82),
    ];
  }

  // Pass Half-Slide default
  return [
    make('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT'),
    make('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', 'NT', null, 'INSIDE_OUT'),
    make('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', 'NT', 'MIKE', 'NEUTRAL'),
    make('RG', 'RG', 1.6, -0.3, 'MAN_BLOCK', 'B_RIGHT', '3T', null, 'INSIDE_OUT'),
    make('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT'),
    make('TE', 'TE', 4.8, -0.4, 'PASS_SET', 'C_RIGHT', 'LDE', null, 'OUTSIDE_IN'),
    make('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
      { x: -14.5, y: 11.0 }, { x: -6.0, y: 11.0 }
    ], 92, 60),
    make('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -7.5, y: 16.0 }], 90, 60),
    make('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
      { x: 14.5, y: 14.0 }, { x: 19.0, y: 17.0 }
    ], 91, 60),
    make('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.2 }], 75, 70),
    make('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', 'MIKE', null, 'INSIDE_OUT', [{ x: -4.0, y: 2.0 }], 88, 75),
  ];
}

// Helper to construct defense fronts
function buildDefensiveFront(call: string, dlRatingMod = 0): SimAgent[] {
  const r = (base: number) => Math.max(40, Math.min(99, base + dlRatingMod));
  const def = (
    id: string, pos: string, x: number, y: number,
    role: 'RUSH_GAP' | 'CONTAIN_EDGE' | 'SPILL' | 'READ_RUN_PASS' | 'DEEP_ZONE' | 'MAN_COV',
    targetX: number, targetY: number,
    sp = 84, pwr = 86, fin = 85
  ): SimAgent => ({
    id, label: pos, side: 'DEF', pos,
    startX: x, startY: y, x, y, vx: 0, vy: 0, fx: 0, fy: 0,
    engagedWithId: null, leverageScore: 0,
    ratings: { speed: sp, accel: r(86), power: r(pwr), finesse: r(fin), awareness: r(85) },
    assignment: { role: 'MAN_BLOCK', primaryTargetId: null, secondaryTargetId: null, gapOrSet: 'VERTICAL_DEEP', leverage: 'NEUTRAL', climbOrChipDelaySec: 0, waypoints: [] },
    defAssignment: { role, targetX, targetY },
  });

  const isBlitz0 = call === 'DIME_MUG_C0';
  return [
    def('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0, 84, 88, 87),
    def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, 72, 92, 75),
    def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, 76, 90, 84),
    def('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0, 86, 86, 88),
    def('MIKE', 'MIKE', 1.2, isBlitz0 ? 1.1 : 4.2, isBlitz0 ? 'RUSH_GAP' : 'READ_RUN_PASS', 1.2, isBlitz0 ? -4.5 : 2.5, 85, 84, 80),
    def('WILL', 'WILL', -2.2, isBlitz0 ? 1.1 : 4.2, isBlitz0 ? 'RUSH_GAP' : 'READ_RUN_PASS', -2.2, isBlitz0 ? -4.5 : 2.5, 87, 82, 82),
    def('NCB', 'NI', -6.8, 3.2, 'READ_RUN_PASS', -7.5, 9.0, 91, 65, 78),
    def('CB1', 'CB', -14.2, 6.0, 'DEEP_ZONE', -14.0, 15.0, 93, 62, 85),
    def('CB2', 'CB', 14.2, 6.0, 'DEEP_ZONE', 14.0, 15.0, 92, 62, 85),
    def('SS', 'SS', 5.8, 6.5, 'READ_RUN_PASS', 8.0, 8.0, 88, 78, 80),
    def('FS', 'FS', 0.0, 12.5, 'DEEP_ZONE', 0.0, 18.0, 91, 68, 82),
  ];
}

export function runExhaustiveSelfPlayAudit(): void {
  const engine = new All22KinematicEngine();
  const results: SelfPlayScenarioResult[] = [];

  const offSchemes: Array<'PASS_HALF_SLIDE' | 'RUN_DUO_COMBO' | 'RUN_POWER_PULL'> = [
    'PASS_HALF_SLIDE',
    'RUN_DUO_COMBO',
    'RUN_POWER_PULL',
  ];

  const defFronts = [
    'NICKEL_OVER_C3',
    'NICKEL_UNDER_C1',
    'BASE_34_BEAR_C4',
    'DIME_MUG_C0',
    'NICKEL_SIM_C2',
  ];

  console.log('======================================================================');
  console.log('STARTING EXHAUSTIVE SELF-PLAY & REALISM WEAKNESS AUDIT');
  console.log('Testing continuous 20 Hz Kinematic Engine across scheme permutations...');
  console.log('======================================================================\n');

  // Test 1: Full Combinatorial Self-Play Matrix (15 scenarios)
  for (const off of offSchemes) {
    for (const def of defFronts) {
      const offAgents = buildOffensiveUnit(off);
      const defAgents = buildDefensiveFront(def);
      const allAgents = [...offAgents, ...defAgents];

      const traj = engine.simulatePlay(allAgents, 0.0);
      const qb = offAgents.find(a => a.pos === 'QB')!;
      const ballCarrier = offAgents.find(a => a.assignment.role === 'BALL_CARRIER');

      let minPocket = 100;
      let timeToPressure: number | null = null;
      let maxDefPenY = 0;
      let unblockedRusher = false;
      let maxLatAccelGs = 0;
      let disengagements = 0;
      let previousEngagements = new Map<string, string | null>();
      let zoneMovementPostArrival = 0;
      let clippingCollisions = 0;

      // Track trajectory through all 80 frames
      for (let t = 0; t < traj.length; t++) {
        const snap = traj[t];
        if (snap.pocketIntegrity < minPocket) minPocket = snap.pocketIntegrity;
        if (snap.pocketIntegrity < 45 && timeToPressure === null) {
          timeToPressure = snap.timeSec;
        }

        const currentDefs = snap.agents.filter(a => a.side === 'DEF');
        const currentOffs = snap.agents.filter(a => a.side === 'OFF');
        const currentQb = snap.agents.find(a => a.pos === 'QB')!;
        const currentCarrier = snap.agents.find(a => a.assignment.role === 'BALL_CARRIER');

        for (const d of currentDefs) {
          const depth = -d.y; // positive into offensive backfield
          if (depth > maxDefPenY) maxDefPenY = depth;

          const distToQb = Math.hypot(d.x - currentQb.x, d.y - currentQb.y);
          if (distToQb < 1.0 && !d.engagedWithId) {
            unblockedRusher = true;
          }

          // Check if previously engaged defender broke free / disengaged
          const prevEng = previousEngagements.get(d.id);
          if (prevEng && !d.engagedWithId) {
            disengagements++;
          }
          previousEngagements.set(d.id, d.engagedWithId);

          // Check zone defenders behavior after reaching landmark (t > 1.5s)
          if (['CB1', 'CB2', 'FS', 'NCB'].includes(d.id) && snap.timeSec > 1.5) {
            const speed = Math.hypot(d.vx, d.vy);
            zoneMovementPostArrival += speed * 0.05;
          }

          // Check ball carrier clipping collision
          if (currentCarrier && d.id !== currentCarrier.id) {
            const distToCarrier = Math.hypot(d.x - currentCarrier.x, d.y - currentCarrier.y);
            if (distToCarrier < 0.6) {
              clippingCollisions++;
            }
          }
        }

        // Measure lateral centripetal acceleration on route runners
        for (const o of currentOffs.filter(a => a.assignment.role === 'ROUTE')) {
          const v = Math.hypot(o.vx, o.vy);
          // Numerical acceleration: dv / dt
          if (t > 0) {
            const prevAgent = traj[t - 1].agents.find(a => a.id === o.id)!;
            const ax = (o.vx - prevAgent.vx) / 0.05;
            const ay = (o.vy - prevAgent.vy) / 0.05;
            const accelYdsSec2 = Math.hypot(ax, ay);
            const accelGs = (accelYdsSec2 * 0.9144) / 9.81; // convert yds/s^2 to m/s^2 to Gs
            if (accelGs > maxLatAccelGs) maxLatAccelGs = accelGs;
          }
        }
      }

      const finalSnap = traj[traj.length - 1];
      const observations: string[] = [];

      if (unblockedRusher) {
        observations.push('UNBLOCKED_PENETRATION: Rusher reached QB contact radius (<1.0y)');
      }
      if (disengagements === 0) {
        observations.push('STICKY_BLOCKS: 0 block disengagements observed throughout entire snap');
      }
      if (zoneMovementPostArrival < 0.5) {
        observations.push('STATUE_ZONE: Deep coverage froze completely upon reaching static landmark');
      }
      if (clippingCollisions > 0) {
        observations.push(`GHOST_TACKLES: Ball carrier intersected defenders (${clippingCollisions} ticks) with zero wrap-up/tackle stop`);
      }
      if (maxLatAccelGs > 3.0) {
        observations.push(`INSTANT_CUTS: Receiver pulled ${maxLatAccelGs.toFixed(2)} Gs of lateral acceleration without radius curvature limits`);
      }

      results.push({
        scenarioName: `${off} vs ${def}`,
        offConcept: off,
        defFront: def,
        ticks: traj.length,
        finalTimeSec: finalSnap.timeSec,
        finalEpa: finalSnap.expectedEpa,
        minPocketIntegrity: minPocket,
        finalPocketIntegrity: finalSnap.pocketIntegrity,
        meanTrenchDisplacement: finalSnap.trenchNetYards,
        maxDefenderPenetrationY: +maxDefPenY.toFixed(2),
        unblockedRusherAtQb: unblockedRusher,
        timeToPressureSec: timeToPressure !== null ? +timeToPressure.toFixed(2) : null,
        sackOccurred: false, // Engine has no sack termination logic!
        blockerDisengagementsCount: disengagements,
        maxLateralAccelGs: +maxLatAccelGs.toFixed(2),
        zoneDefendersMovementPostLandmark: +zoneMovementPostArrival.toFixed(2),
        ballCarrierClippingCollisions: clippingCollisions,
        observations,
      });
    }
  }

  // Print Detailed Scenario Table
  console.log(
    'Scenario'.padEnd(38) +
    'Final EPA'.padEnd(12) +
    'Min Pkt %'.padEnd(12) +
    'Trench Lev'.padEnd(12) +
    'TTP (s)'.padEnd(10) +
    'Max Pen(y)'.padEnd(12) +
    'Max Lat Gs'
  );
  console.log('-'.repeat(105));

  for (const r of results) {
    console.log(
      r.scenarioName.padEnd(38) +
      (r.finalEpa >= 0 ? `+${r.finalEpa.toFixed(2)}` : r.finalEpa.toFixed(2)).padEnd(12) +
      `${r.minPocketIntegrity.toFixed(1)}%`.padEnd(12) +
      `${r.meanTrenchDisplacement.toFixed(2)}y`.padEnd(12) +
      (r.timeToPressureSec !== null ? `${r.timeToPressureSec.toFixed(2)}s` : 'NONE').padEnd(10) +
      `${r.maxDefenderPenetrationY}y`.padEnd(12) +
      `${r.maxLateralAccelGs} Gs`
    );
  }

  // Aggregate Systemic Weakness Analysis
  console.log('\n======================================================================');
  console.log('SYSTEMIC REALISM WEAKNESS AUDIT REPORT');
  console.log('======================================================================\n');

  // Finding 1: Termination & Sack Mechanics
  const blitzScenarios = results.filter(r => r.defFront === 'DIME_MUG_C0');
  const blitzPressures = blitzScenarios.filter(r => r.timeToPressureSec !== null && r.timeToPressureSec < 1.5);
  console.log('1. PLAY TERMINATION & SACK BLIND SPOT:');
  console.log(`   - Blitz scenarios with immediate pressure (<1.5s): ${blitzPressures.length} / ${blitzScenarios.length}`);
  console.log('   - Sacks triggered: 0 (Engine simulates all 80 ticks / 4.00s unconditionally).');
  console.log('   - Realism Impact: When A-gap blitzers reach QB in 0.85s, the QB continues standing,');
  console.log('     skill receivers continue downfield routes, and EPA is evaluated as if 4.0 seconds elapsed.\n');

  // Finding 2: Sticky Trench Engagements & Shed Failure
  const totalDisengagements = results.reduce((acc, r) => acc + r.blockerDisengagementsCount, 0);
  console.log('2. STICKY BLOCKS & ABSENCE OF SHED DYNAMICS:');
  console.log(`   - Total block disengagements across all 15 scenarios: ${totalDisengagements}`);
  console.log('   - Realism Impact: Once a blocker and defender make contact within 1.35 yards,');
  console.log('     they are permanently bound in an impulse normal loop until T=4.00s.');
  console.log('     Elite pass rushers (e.g. Myles Garrett, Micah Parsons) cannot rip, swim, or shed');
  console.log('     away from a block even if they generate winning leverage (leverageScore = -1.0).\n');

  // Finding 3: Statue Zone Pass Coverage
  const avgZonePostMovement = results.reduce((acc, r) => acc + r.zoneDefendersMovementPostLandmark, 0) / results.length;
  console.log('3. PASSIVE / STATUE ZONE COVERAGE (ZERO ROUTE MATCHING):');
  console.log(`   - Mean post-arrival zone movement per defender: ${avgZonePostMovement.toFixed(2)} yards`);
  console.log('   - Realism Impact: Zone defenders (Cover 3 Sky, Quarters, Tampa 2) navigate strictly');
  console.log('     to static coordinates (targetX, targetY). Once there, velocity collapses to 0.');
  console.log('     Defenders do not break on the ball, match crossing routes, carry vertical seams,');
  console.log('     or rally to the ball carrier.\n');

  // Finding 4: Ghost Tackles & Waypoint-Blind Run Game
  const totalClippingTicks = results.reduce((acc, r) => acc + r.ballCarrierClippingCollisions, 0);
  console.log('4. GHOST TACKLING & WAYPOINT-LOCKED RUN CARRIER:');
  console.log(`   - Cumulative defender-runner penetration ticks without tackle: ${totalClippingTicks}`);
  console.log('   - Realism Impact: The ball carrier strictly follows pre-programmed waypoints with zero');
  console.log('     vision, cutback sensing, or contact collision response. Defenders within 0.5 yards');
  console.log('     pass right through the runner without attempting tackles, wraps, or stops.\n');

  // Finding 5: Omnidirectional Inversion & Unconstrained Lateral G-Forces
  const maxGsObserved = Math.max(...results.map(r => r.maxLateralAccelGs));
  console.log('5. ANISOTROPIC STEERING LIMITS ABSENT (HIGH-G TELEPORT TURNS):');
  console.log(`   - Peak lateral acceleration recorded: ${maxGsObserved.toFixed(2)} Gs`);
  console.log('   - Human biomechanical limit: ~1.2 - 1.6 Gs on NFL cleats/turf (friction coefficient μ ≈ 0.85).');
  console.log('   - Realism Impact: Receivers executing 90-degree square-in or comeback stems turn');
  console.log('     instantaneously via simple exponential velocity smoothing (accelRate = 0.25 + 0.35 * accel / 100),');
  console.log('     ignoring physical turning radius R = v^2 / (μ * g).\n');

  // Finding 6: Ball Flight & Discrete Play Outcomes Absent
  console.log('6. LACK OF BALLISTIC TRAJECTORY & DISCRETE EVENT HORIZON:');
  console.log('   - The simulation lacks a 3D ball projectile (x, y, z), throw initiation, and catch/incompletion logic.');
  console.log('   - EPA is a continuous heuristic computed as:');
  console.log('     EPA = -0.35 + (Pocket% * 0.55) + (TrenchYards * 0.28) + (Separation * 0.18)');
  console.log('   - Down & distance, field position, and discrete catch/drop/INT states are absent.\n');
}

runExhaustiveSelfPlayAudit();
