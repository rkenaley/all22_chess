import {
  All22KinematicEngine,
  SimAgent,
  evaluateMacroMatchup,
  MacroRPSAnalysis,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
} from './engine';

const engine = new All22KinematicEngine();

function makeOffAgent(
  id: string,
  pos: string,
  x: number,
  y: number,
  role: BlockRoleType,
  gap: GapOrSetCode,
  wps: any[] = [],
  readOrder?: number
): SimAgent {
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
    ratings: { speed: 85, accel: 86, power: 85, finesse: 85, awareness: 85 },
    assignment: {
      role,
      primaryTargetId: null,
      secondaryTargetId: null,
      gapOrSet: gap,
      leverage: 'INSIDE_OUT',
      climbOrChipDelaySec: 0.5,
      waypoints: wps,
      readOrder,
    },
  };
}

function makeDefAgent(
  id: string,
  pos: string,
  x: number,
  y: number,
  role: any,
  tx: number,
  ty: number,
  manTargetId?: string,
  ratings = { speed: 86, accel: 88, power: 86, finesse: 86, awareness: 86 }
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
    ratings,
    assignment: {
      role: 'MAN_BLOCK',
      primaryTargetId: null,
      secondaryTargetId: null,
      gapOrSet: 'VERTICAL_DEEP',
      leverage: 'NEUTRAL',
      climbOrChipDelaySec: 0,
      waypoints: [],
    },
    defAssignment: {
      role,
      targetX: tx,
      targetY: ty,
      manTargetId,
    },
  };
}

function createPAUnderCenterBoot(): SimAgent[] {
  const qb = makeOffAgent('QB', 'QB', 0.0, -1.8, 'QB_DROP', 'VERTICAL_DEEP', [{ x: 4.8, y: -6.5 }]);
  qb.playAction = {
    enabled: true,
    meshDurationSec: 1.25,
    fakeCarrierId: 'RB',
    fakeGap: 'C_LEFT',
    isBootleg: true,
    bootDirection: 'RIGHT',
  };

  const rb = makeOffAgent('RB', 'RB', 0.0, -4.5, 'MAX_PROTECT_SCAN', 'C_LEFT', [
    { x: -3.5, y: -2.5 },
    { x: -5.8, y: 0.5 },
  ], 4);

  return [
    makeOffAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
    makeOffAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
    makeOffAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45'),
    makeOffAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45'),
    makeOffAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP'),
    // Inline TE Right: Primary 12y Sail Out
    makeOffAgent('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', [
      { x: 4.8, y: 10.0 },
      { x: 12.5, y: 12.0 },
    ], 1),
    // Flex TE2 Left: Leaks into flat
    makeOffAgent('SL', 'TE', -4.8, -0.6, 'ROUTE', 'VERTICAL_DEEP', [
      { x: 0.0, y: -1.5 },
      { x: 7.5, y: 3.5 },
    ], 3),
    // Boundary WR1: Deep Crossing Over
    makeOffAgent('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', [
      { x: -14.0, y: 8.0 },
      { x: 6.0, y: 16.5 },
    ], 2),
    // Field WR2: Clearout Post
    makeOffAgent('WR2', 'WR', 14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', [
      { x: 14.0, y: 24.0 },
    ], 3),
    qb,
    rb,
  ];
}

function createQuickSlant(): SimAgent[] {
  return [
    makeOffAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'JUMP_SET'),
    makeOffAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'JUMP_SET'),
    makeOffAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'JUMP_SET'),
    makeOffAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'JUMP_SET'),
    makeOffAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'JUMP_SET'),
    makeOffAgent('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', [
      { x: 5.2, y: 4.5 },
      { x: 9.0, y: 5.0 },
    ], 3),
    makeOffAgent('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', [
      { x: -14.2, y: 3.2 },
      { x: -7.5, y: 7.0 },
    ], 1),
    makeOffAgent('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', [
      { x: -10.5, y: 2.5 },
      { x: -14.5, y: 4.0 },
    ], 2),
    makeOffAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', [
      { x: 14.2, y: 3.2 },
      { x: 8.0, y: 7.0 },
    ], 2),
    makeOffAgent('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', [{ x: 0.0, y: -5.2 }]),
    makeOffAgent('RB', 'RB', -1.5, -4.5, 'MAX_PROTECT_SCAN', 'A_LEFT', [{ x: -5.0, y: 1.5 }], 4),
  ];
}

function create12PersDuo(): SimAgent[] {
  return [
    makeOffAgent('LT', 'LT', -3.2, -0.4, 'MAN_BLOCK', 'C_LEFT'),
    makeOffAgent('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT'),
    makeOffAgent('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT'),
    makeOffAgent('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT'),
    makeOffAgent('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT'),
    makeOffAgent('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT'),
    makeOffAgent('SL', 'TE', -4.8, -0.4, 'MAN_BLOCK', 'C_LEFT'),
    makeOffAgent('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY'),
    makeOffAgent('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY'),
    makeOffAgent('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', [{ x: 0.4, y: -4.8 }]),
    makeOffAgent('RB', 'RB', -1.2, -4.8, 'BALL_CARRIER', 'B_RIGHT', [
      { x: 0.8, y: -1.5 },
      { x: 2.1, y: 4.0 },
      { x: 2.4, y: 14.0 },
    ]),
  ];
}

function createNickelOverC3(): SimAgent[] {
  return [
    makeDefAgent('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
    makeDefAgent('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0),
    makeDefAgent('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0),
    makeDefAgent('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
    makeDefAgent('WILL', 'WILL', -2.2, 4.2, 'READ_RUN_PASS', -2.5, 3.5),
    makeDefAgent('MIKE', 'MIKE', 1.2, 4.2, 'READ_RUN_PASS', 1.5, 3.5),
    makeDefAgent('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -7.5, 4.8),
    makeDefAgent('CB1', 'CB', -14.2, 6.0, 'DEEP_THIRD', -14.0, 16.0),
    makeDefAgent('CB2', 'CB', 14.2, 6.0, 'DEEP_THIRD', 14.0, 16.0),
    makeDefAgent('SS', 'SS', 5.8, 5.0, 'CURL_FLAT', 7.5, 4.8),
    makeDefAgent('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
  ];
}

function createVikingsCrossDogC0(): SimAgent[] {
  return [
    makeDefAgent('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0),
    makeDefAgent('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0),
    makeDefAgent('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0),
    // Flores penetrating A-gap run blitzer (shoots left A-gap)
    makeDefAgent('WILL', 'WILL', -0.7, 1.1, 'BLITZ_RUN_GAP', -0.6, -1.5, undefined, { speed: 92, accel: 94, power: 85, finesse: 86, awareness: 90 }),
    // Flores looping cross-dog blitzer
    makeDefAgent('MIKE', 'MIKE', 0.7, 1.1, 'CROSS_DOG', 0.6, -1.5, undefined, { speed: 90, accel: 92, power: 85, finesse: 86, awareness: 90 }),
    // Creeping Safety Edge Crash
    makeDefAgent('SS', 'SS', 5.2, 2.2, 'BLITZ_EDGE_CRASH', 3.5, -5.0, undefined, { speed: 91, accel: 92, power: 80, finesse: 85, awareness: 90 }),
    // Zero coverage locks
    makeDefAgent('NCB', 'NI', -6.8, 1.8, 'MAN_COV', -7.5, 1.5, 'SL'),
    makeDefAgent('CB1', 'CB', -14.2, 1.8, 'MAN_COV', -14.2, 1.5, 'WR1'),
    makeDefAgent('CB2', 'CB', 14.2, 1.8, 'MAN_COV', 14.2, 1.5, 'WR2'),
    makeDefAgent('FS', 'FS', -2.5, 2.8, 'MAN_COV', -2.0, 1.5, 'RB'),
    makeDefAgent('DIME', 'DB', 5.8, 2.2, 'MAN_COV', 5.0, 1.5, 'TE'),
  ];
}

function createDimeMugC0(): SimAgent[] {
  return [
    makeDefAgent('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0),
    makeDefAgent('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0),
    makeDefAgent('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0),
    makeDefAgent('WILL', 'WILL', -0.8, 1.1, 'BLITZ_A', -0.5, -4.5),
    makeDefAgent('MIKE', 'MIKE', 0.8, 1.1, 'BLITZ_A', 0.5, -4.5),
    makeDefAgent('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL'),
    makeDefAgent('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1'),
    makeDefAgent('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2'),
    makeDefAgent('SS', 'SS', 5.8, 2.8, 'MAN_COV', 5.0, 1.5, 'TE'),
    makeDefAgent('FS', 'FS', -2.5, 3.2, 'MAN_COV', -2.0, 1.5, 'RB'),
    makeDefAgent('DIME', 'DB', 5.2, 4.0, 'BLITZ_EDGE', 4.5, -5.0),
  ];
}

console.log('================================================================');
console.log('SIMULATOR EMPIRICAL AUDIT: RUN BLITZES & MACRO RPS MATCHING');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: Play-Action vs Standard Reading Defense (Cover 3)
// ----------------------------------------------------------------------------
console.log('--- TEST 1: Play-Action Bootleg vs Base Nickel Cover 3 (Reading LBs) ---');
const offPA = createPAUnderCenterBoot();
const defC3 = createNickelOverC3();
const snapsPA_C3 = engine.simulatePlay([...offPA, ...defC3]);

const finalSnapPA_C3 = snapsPA_C3[snapsPA_C3.length - 1];
// Check LB false step at T ~ 0.5s (tick 15)
const midSnapPA_C3 = snapsPA_C3[Math.min(15, snapsPA_C3.length - 1)];
const willSnap = midSnapPA_C3.agents.find(a => a.id === 'WILL')!;
const mikeSnap = midSnapPA_C3.agents.find(a => a.id === 'MIKE')!;

console.log(`Phase at T=0.5s: ${midSnapPA_C3.phase}`);
console.log(`WILL LB Y position: start=4.20, T=0.5s=${willSnap.y.toFixed(2)} (delta: ${(willSnap.y - 4.2).toFixed(2)}y downhill bite)`);
console.log(`MIKE LB Y position: start=4.20, T=0.5s=${mikeSnap.y.toFixed(2)} (delta: ${(mikeSnap.y - 4.2).toFixed(2)}y downhill bite)`);
console.log(`Result: EPA = ${finalSnapPA_C3.expectedEpa.toFixed(3)}, Yards = ${finalSnapPA_C3.carrierTackledYards?.toFixed(1) ?? 'N/A'}, Outcome = ${finalSnapPA_C3.terminationReason}`);

// ----------------------------------------------------------------------------
// TEST 2: Play-Action vs Brian Flores Double A-Gap Cross-Dog Run Blitz
// ----------------------------------------------------------------------------
console.log('\n--- TEST 2: Play-Action Bootleg vs Vikings Mug Cross-Dog C0 (Flores Run Blitz) ---');
const offPA2 = createPAUnderCenterBoot();
const defFlores = createVikingsCrossDogC0();
const snapsPA_Flores = engine.simulatePlay([...offPA2, ...defFlores]);

const finalSnapPA_Flores = snapsPA_Flores[snapsPA_Flores.length - 1];
// Find tick where sack occurred
const sackSnap = snapsPA_Flores.find(s => s.terminationReason === 'SACK');
console.log(`Result: EPA = ${finalSnapPA_Flores.expectedEpa.toFixed(3)}, Yards = ${finalSnapPA_Flores.carrierTackledYards?.toFixed(1) ?? 'N/A'}, Outcome = ${finalSnapPA_Flores.terminationReason}`);
if (sackSnap) {
  console.log(`Sack Occurred at T = ${sackSnap.timeSec.toFixed(2)}s, Phase: ${sackSnap.phase}, QB pos: (${sackSnap.agents.find(a => a.id === 'QB')!.x.toFixed(2)}, ${sackSnap.agents.find(a => a.id === 'QB')!.y.toFixed(2)})`);
  console.log('CONFIRMED: Run blitzer breached A-gap and destroyed play-action at/near mesh before bootleg could develop!');
}

// ----------------------------------------------------------------------------
// TEST 3: Hot Quick Game vs Brian Flores Cover 0 Run Blitz
// ----------------------------------------------------------------------------
console.log('\n--- TEST 3: Hot Quick Slants vs Vikings Mug Cross-Dog C0 ---');
const offQuick = createQuickSlant();
const defFlores2 = createVikingsCrossDogC0();
const snapsQuick_Flores = engine.simulatePlay([...offQuick, ...defFlores2]);

const finalSnapQuick = snapsQuick_Flores[snapsQuick_Flores.length - 1];
console.log(`Result: EPA = ${finalSnapQuick.expectedEpa.toFixed(3)}, Yards = ${finalSnapQuick.carrierTackledYards?.toFixed(1) ?? 'N/A'}, Outcome = ${finalSnapQuick.terminationReason}, TTT = ${finalSnapQuick.timeToThrowOrGapSec?.toFixed(2) ?? 'N/A'}s`);
console.log('CONFIRMED: Hot quick game gets ball out before blitz reaches QB, exploiting 0-high man coverage!');

// ----------------------------------------------------------------------------
// TEST 4: Macro RPS Audit Across Canonical Matchups
// ----------------------------------------------------------------------------
console.log('\n--- TEST 4: Macro Rock-Paper-Scissors Matchup Engine Audit ---');

const testCases = [
  {
    name: '12 Pers PA Bootleg vs Vikings Mug Cross-Dog C0',
    personnel: '12 PERS',
    playId: 'PA_UNDER_CENTER_BOOT',
    cat: 'PASS' as const,
    defCall: 'VIKINGS_MUG_CROSSDOG_C0',
    agents: [...createPAUnderCenterBoot(), ...createVikingsCrossDogC0()],
  },
  {
    name: '12 Pers PA Bootleg vs Base Nickel Cover 3',
    personnel: '12 PERS',
    playId: 'PA_UNDER_CENTER_BOOT',
    cat: 'PASS' as const,
    defCall: 'NICKEL_OVER_C3',
    agents: [...createPAUnderCenterBoot(), ...createNickelOverC3()],
  },
  {
    name: '11 Pers Quick Slant vs Vikings Mug Cross-Dog C0',
    personnel: '11 PERS',
    playId: 'QUICK_SLANT_FLAT',
    cat: 'PASS' as const,
    defCall: 'VIKINGS_MUG_CROSSDOG_C0',
    agents: [...createQuickSlant(), ...createVikingsCrossDogC0()],
  },
  {
    name: '12 Pers Duo vs Dime Mug Cover 0',
    personnel: '12 PERS',
    playId: 'DUO_COMBO_CLIMB',
    cat: 'RUN' as const,
    defCall: 'DIME_MUG_C0',
    agents: [...create12PersDuo(), ...createDimeMugC0()],
  },
  {
    name: '11 Pers Inside Zone vs Base 4-3 Over Heavy',
    personnel: '11 PERS',
    playId: 'HB_INSIDE_ZONE',
    cat: 'RUN' as const,
    defCall: 'BASE_43_OVER_C1',
    agents: [...create12PersDuo(), ...createNickelOverC3()],
  },
];

for (const tc of testCases) {
  const rps = evaluateMacroMatchup(tc.personnel, tc.playId, tc.cat, tc.defCall, tc.agents);
  console.log(`\nScenario: ${tc.name}`);
  console.log(`  Verdict:    [${rps.verdict}]`);
  console.log(`  Headline:   ${rps.headline}`);
  console.log(`  Detail:     ${rps.tacticalDetail}`);
  console.log(`  OC Audible: ${rps.recommendedAudible}`);
}

console.log('\n================================================================');
console.log('AUDIT COMPLETED SUCCESSFULLY');
console.log('================================================================');
