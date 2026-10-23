import {
  MATCHUP_PRESETS,
  SITUATIONS,
  OFFENSIVE_CONCEPTS,
  applyOffensiveConcept,
  clonePlay,
  runMonteCarloBatch,
  NFL_LEAGUE_BENCHMARKS,
  computeOffensePercentile,
  SituationId,
  DefScheme,
  DefFront,
  DLStuntType,
  BlockingSchemeId,
  PreSnapMotionId,
  MonteCarloSummary,
} from './engine';
import { ALL_PRESET_MATCHUPS } from './nfl_rosters';

interface BenchmarkScenario {
  id: string;
  title: string;
  matchupId: string;
  situationId: SituationId;
  conceptId: keyof typeof OFFENSIVE_CONCEPTS;
  blockingScheme: BlockingSchemeId;
  motionId: PreSnapMotionId;
  defCall: DefScheme;
  defFront: DefFront;
  dlStunt: DLStuntType;
  matchCoverage: boolean;
  expectedCompRange: [number, number];
  expectedSackRange: [number, number];
  expectedPressureRange: [number, number];
  expectedTttRange: [number, number];
  expectedAirYardsRange: [number, number];
  expectedEpaRange: [number, number];
}

const SCENARIOS: BenchmarkScenario[] = [
  {
    id: 'NFL_AVG_FLOOD_1ST_10',
    title: '★ Unbiased League Benchmark: Flood vs Cover 3 (Synthetic 50th %ile NFL Roster)',
    matchupId: 'NFL_AVERAGE',
    situationId: '1st_10',
    conceptId: 'FLOOD_SAIL',
    blockingScheme: 'HALF_SLIDE',
    motionId: 'NONE',
    defCall: 'COV3_SKY',
    defFront: 'OVER',
    dlStunt: 'NONE',
    matchCoverage: true,
    expectedCompRange: [60, 75],
    expectedSackRange: [4, 9],
    expectedPressureRange: [25, 42],
    expectedTttRange: [2.3, 2.9],
    expectedAirYardsRange: [6, 13],
    expectedEpaRange: [0.02, 0.25],
  },
  {
    id: 'PA_YANKEE_1ST_10',
    title: 'PA Yankee Deep Over vs Cover 3 Match (DET vs SF)',
    matchupId: 'DET_VS_SF',
    situationId: '1st_10',
    conceptId: 'PA_YANKEE',
    blockingScheme: 'MAX_PROTECT',
    motionId: 'ORBIT_RETURN',
    defCall: 'COV3_SKY',
    defFront: 'WIDE_9',
    dlStunt: 'TE_TWIST',
    matchCoverage: true,
    expectedCompRange: [60, 72],
    expectedSackRange: [4, 9],
    expectedPressureRange: [25, 42],
    expectedTttRange: [2.7, 3.3],
    expectedAirYardsRange: [10, 16],
    expectedEpaRange: [0.05, 0.35],
  },
  {
    id: 'DAGGER_3RD_10_SIM_PRESSURE',
    title: 'Dagger 16y Dig vs Fire Zone 3 Sim Blitz (PHI vs KC)',
    matchupId: 'PHI_VS_KC',
    situationId: '3rd_10',
    conceptId: 'DAGGER',
    blockingScheme: 'HALF_SLIDE',
    motionId: 'JET_L_TO_R',
    defCall: 'FIRE_ZONE_3',
    defFront: 'OVER',
    dlStunt: 'AUTO',
    matchCoverage: true,
    expectedCompRange: [50, 64],
    expectedSackRange: [6, 13],
    expectedPressureRange: [32, 50],
    expectedTttRange: [2.4, 2.9],
    expectedAirYardsRange: [10, 16],
    expectedEpaRange: [-0.25, 0.05],
  },
  {
    id: 'MESH_3RD_3_MAN_ROBBER',
    title: 'Mesh Shallow Drags vs Cover 1 Robber (PHI vs BAL)',
    matchupId: 'PHI_VS_BAL',
    situationId: '3rd_3',
    conceptId: 'MESH',
    blockingScheme: 'BIG_ON_BIG',
    motionId: 'NONE',
    defCall: 'COV1_ROBBER',
    defFront: 'UNDER',
    dlStunt: 'NONE',
    matchCoverage: true,
    expectedCompRange: [62, 78],
    expectedSackRange: [3, 8],
    expectedPressureRange: [20, 36],
    expectedTttRange: [2.0, 2.6],
    expectedAirYardsRange: [3, 7],
    expectedEpaRange: [0.08, 0.35],
  },
  {
    id: 'FLOOD_2ND_2_QUARTERS',
    title: '3-Level Flood vs Cover 4 Quarters Match (PHI vs JAX)',
    matchupId: 'PHI_VS_JAX',
    situationId: '2nd_2',
    conceptId: 'FLOOD_SAIL',
    blockingScheme: 'HALF_SLIDE',
    motionId: 'NONE',
    defCall: 'COV4_QUARTERS',
    defFront: 'OVER',
    dlStunt: 'ET_TWIST',
    matchCoverage: true,
    expectedCompRange: [60, 74],
    expectedSackRange: [4, 9],
    expectedPressureRange: [28, 45],
    expectedTttRange: [2.3, 2.8],
    expectedAirYardsRange: [7, 13],
    expectedEpaRange: [0.08, 0.28],
  },
  {
    id: 'SMASH_REDZONE_TAMPA2',
    title: 'Smash-Divide vs Cover 2 Tampa Pole Sinking (DET vs SF)',
    matchupId: 'DET_VS_SF',
    situationId: 'RZ_2nd_8',
    conceptId: 'SMASH_DIVIDE',
    blockingScheme: 'HALF_SLIDE',
    motionId: 'NONE',
    defCall: 'COV2_TAMPA',
    defFront: 'WIDE_9',
    dlStunt: 'NONE',
    matchCoverage: true,
    expectedCompRange: [50, 68],
    expectedSackRange: [4, 10],
    expectedPressureRange: [25, 42],
    expectedTttRange: [2.2, 2.7],
    expectedAirYardsRange: [5, 10],
    expectedEpaRange: [-0.05, 0.20],
  },
  {
    id: 'STICK_2ND_8_ZERO_BLITZ',
    title: 'Quick Stick-Nod vs Cover 0 All-Out Blitz (PHI vs KC)',
    matchupId: 'PHI_VS_KC',
    situationId: '2nd_8',
    conceptId: 'STICK_NOD',
    blockingScheme: 'MAX_PROTECT',
    motionId: 'NONE',
    defCall: 'ZERO_BLITZ',
    defFront: 'MUG_A',
    dlStunt: 'AUTO',
    matchCoverage: false,
    expectedCompRange: [55, 75],
    expectedSackRange: [6, 14],
    expectedPressureRange: [40, 65],
    expectedTttRange: [1.8, 2.4],
    expectedAirYardsRange: [4, 9],
    expectedEpaRange: [-0.10, 0.25],
  },
  {
    id: 'MILLS_1ST_10_DEEP_SHOT',
    title: 'Mills Post-Dig Deep Shot vs Cover 1 Robber (PHI vs BAL)',
    matchupId: 'PHI_VS_BAL',
    situationId: '1st_10',
    conceptId: 'MILLS_POST_DIG',
    blockingScheme: 'HALF_SLIDE',
    motionId: 'NONE',
    defCall: 'COV1_ROBBER',
    defFront: 'OVER',
    dlStunt: 'AUTO',
    matchCoverage: true,
    expectedCompRange: [52, 66],
    expectedSackRange: [5, 10],
    expectedPressureRange: [28, 45],
    expectedTttRange: [2.5, 3.1],
    expectedAirYardsRange: [11, 18],
    expectedEpaRange: [0.02, 0.28],
  },
];

console.log('================================================================================');
console.log('       NFL BENCHMARK SIMULATION & SYSTEMIC ALIGNMENT AUDIT (300 SNAPS / CELL)   ');
console.log('================================================================================\n');

interface AuditResult {
  scenario: BenchmarkScenario;
  summary: MonteCarloSummary;
  systemicNotes: string[];
}

const auditResults: AuditResult[] = [];

for (const sc of SCENARIOS) {
  const preset = (ALL_PRESET_MATCHUPS as any)[sc.matchupId] || (MATCHUP_PRESETS as any)[sc.matchupId];
  const sit = SITUATIONS[sc.situationId];
  const off = clonePlay(preset.getOffense());
  const def = preset.getDefense();

  const dropback = applyOffensiveConcept(off, sc.conceptId);

  const snaps = 300;
  const summary = runMonteCarloBatch(
    off,
    def,
    sc.defCall,
    sit,
    snaps,
    1337 + SCENARIOS.indexOf(sc) * 111,
    false,
    sc.motionId,
    sc.defFront,
    0.55,
    'NONE',
    dropback,
    sc.blockingScheme,
    sc.dlStunt,
    sc.matchCoverage
  );

  const notes: string[] = [];

  // Check metrics against expected ranges
  if (summary.completionRate < sc.expectedCompRange[0]) {
    notes.push(`Comp % LOW (${summary.completionRate.toFixed(1)}% < exp ${sc.expectedCompRange[0]}%)`);
  } else if (summary.completionRate > sc.expectedCompRange[1]) {
    notes.push(`Comp % HIGH (${summary.completionRate.toFixed(1)}% > exp ${sc.expectedCompRange[1]}%)`);
  }

  if (summary.sackRate < sc.expectedSackRange[0]) {
    notes.push(`Sack % LOW (${summary.sackRate.toFixed(1)}% < exp ${sc.expectedSackRange[0]}%)`);
  } else if (summary.sackRate > sc.expectedSackRange[1]) {
    notes.push(`Sack % HIGH (${summary.sackRate.toFixed(1)}% > exp ${sc.expectedSackRange[1]}%)`);
  }

  if (summary.pressureRate < sc.expectedPressureRange[0]) {
    notes.push(`Pressure % LOW (${summary.pressureRate.toFixed(1)}% < exp ${sc.expectedPressureRange[0]}%)`);
  } else if (summary.pressureRate > sc.expectedPressureRange[1]) {
    notes.push(`Pressure % HIGH (${summary.pressureRate.toFixed(1)}% > exp ${sc.expectedPressureRange[1]}%)`);
  }

  if (summary.avgTimeToThrow < sc.expectedTttRange[0]) {
    notes.push(`TTT FAST (${summary.avgTimeToThrow.toFixed(2)}s < exp ${sc.expectedTttRange[0]}s)`);
  } else if (summary.avgTimeToThrow > sc.expectedTttRange[1]) {
    notes.push(`TTT SLOW (${summary.avgTimeToThrow.toFixed(2)}s > exp ${sc.expectedTttRange[1]}s)`);
  }

  if (summary.avgAirYards < sc.expectedAirYardsRange[0]) {
    notes.push(`aDoT SHORT (${summary.avgAirYards.toFixed(1)}y < exp ${sc.expectedAirYardsRange[0]}y)`);
  } else if (summary.avgAirYards > sc.expectedAirYardsRange[1]) {
    notes.push(`aDoT DEEP (${summary.avgAirYards.toFixed(1)}y > exp ${sc.expectedAirYardsRange[1]}y)`);
  }

  if (summary.meanEpa < sc.expectedEpaRange[0]) {
    notes.push(`EPA LOW (${summary.meanEpa.toFixed(2)} < exp ${sc.expectedEpaRange[0]})`);
  } else if (summary.meanEpa > sc.expectedEpaRange[1]) {
    notes.push(`EPA HIGH (${summary.meanEpa.toFixed(2)} > exp ${sc.expectedEpaRange[1]})`);
  }

  // Check INT rate against real NFL benchmark (1.5% - 3.2%)
  if (summary.intRate > 3.5) {
    notes.push(`INT Rate HIGH (${summary.intRate.toFixed(1)}% > 3.5%)`);
  } else if (summary.intRate < 0.5) {
    notes.push(`INT Rate LOW (${summary.intRate.toFixed(1)}% < 0.5%)`);
  }

  // Check Scramble rate
  const isMobileQb = off[0].ratings.spd >= 84;
  if (isMobileQb && summary.scrambleRate < 3.0) {
    notes.push(`Mobile QB Scramble % LOW (${summary.scrambleRate.toFixed(1)}%)`);
  } else if (!isMobileQb && summary.scrambleRate > 5.0) {
    notes.push(`Pocket Passer Scramble % HIGH (${summary.scrambleRate.toFixed(1)}%)`);
  }

  auditResults.push({ scenario: sc, summary, systemicNotes: notes });
}

// Print detailed report
for (const res of auditResults) {
  const { scenario: sc, summary: s, systemicNotes } = res;
  const bench = NFL_LEAGUE_BENCHMARKS[sc.situationId];
  const pctile = computeOffensePercentile(s, SITUATIONS[sc.situationId]);

  console.log(`--------------------------------------------------------------------------------`);
  console.log(`SCENARIO: ${sc.title}`);
  console.log(`Context: ${sc.matchupId} | Sit: ${sc.situationId} (${bench.label}) | Concept: ${sc.conceptId}`);
  console.log(`Scheme: ${sc.defCall} | Stunt: ${sc.dlStunt} | Match: ${sc.matchCoverage} | Pro: ${sc.blockingScheme}`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`  Completion Rate:   ${s.completionRate.toFixed(1)}%  (NFL exp: ${sc.expectedCompRange[0]}-${sc.expectedCompRange[1]}%)`);
  console.log(`  Sack Rate:         ${s.sackRate.toFixed(1)}%  (NFL exp: ${sc.expectedSackRange[0]}-${sc.expectedSackRange[1]}%)`);
  console.log(`  Pressure Rate:     ${s.pressureRate.toFixed(1)}%  (NFL exp: ${sc.expectedPressureRange[0]}-${sc.expectedPressureRange[1]}%)`);
  console.log(`  Interception Rate: ${s.intRate.toFixed(1)}%  (NFL league avg: ~2.1%)`);
  console.log(`  Avg Time-To-Throw: ${s.avgTimeToThrow.toFixed(2)}s  (NFL exp: ${sc.expectedTttRange[0]}-${sc.expectedTttRange[1]}s)`);
  console.log(`  Avg Air Yards:     ${s.avgAirYards.toFixed(1)}y  (NFL exp: ${sc.expectedAirYardsRange[0]}-${sc.expectedAirYardsRange[1]}y)`);
  console.log(`  Avg YAC:           ${s.avgYacYards.toFixed(1)}y`);
  console.log(`  Scramble Rate:     ${s.scrambleRate.toFixed(1)}% (${s.avgScrambleYards.toFixed(1)} yds/scramble)`);
  console.log(`  Read Distribution: Primary: ${s.primaryReadShare.toFixed(1)}% | Checkdown: ${s.checkdownShare.toFixed(1)}%`);
  console.log(`  Mean EPA:          ${s.meanEpa >= 0 ? '+' : ''}${s.meanEpa.toFixed(2)}  (Situation Baseline: ${bench.leagueAvgEpa >= 0 ? '+' : ''}${bench.leagueAvgEpa.toFixed(2)})`);
  console.log(`  Goal Success %:    ${s.goalSuccessRate.toFixed(1)}%  (Situation Baseline: ${bench.leagueAvgGoalRate.toFixed(1)}%)`);
  console.log(`  Offense %ile:      ${pctile.percentile.toFixed(1)}th %ile [${pctile.tierName}] (${pctile.franchiseComp})`);

  if (systemicNotes.length === 0) {
    console.log(`  Systemic Status:   [PASS] Aligned with NFL expectation metrics.`);
  } else {
    console.log(`  Systemic Issues:   [FLAGGED]:`);
    for (const note of systemicNotes) {
      console.log(`    - ${note}`);
    }
  }
  console.log(``);
}
