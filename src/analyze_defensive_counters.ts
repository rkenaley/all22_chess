import * as fs from 'fs';
import {
  MonteCarloSummary,
  runMonteCarloBatch,
  SITUATIONS,
  clonePlay,
  applyOffensiveConcept,
  OFFENSIVE_CONCEPTS,
  OffensiveConceptId,
  DefensiveCall,
  DefFront,
  DLStuntType,
} from './engine';
import { getLeagueAverageOffense, getLeagueAverageDefense } from './nfl_rosters';

interface ConceptDefenseReport {
  conceptId: OffensiveConceptId;
  conceptName: string;
  situationId: string;
  situationLabel: string;
  targetDefense: {
    defCall: DefensiveCall;
    front: DefFront;
    summary: MonteCarloSummary;
  };
  optimalCounter: {
    defCall: DefensiveCall;
    front: DefFront;
    stunt: DLStuntType;
    summary: MonteCarloSummary;
    epaSuppression: number; // target EPA - counter EPA
    successSuppression: number; // target success - counter success
  };
  coverageResults: Array<{
    defCall: DefensiveCall;
    meanEpa: number;
    successRate: number;
    completionRate: number;
    sackRate: number;
    pressureRate: number;
    avgYards: number;
  }>;
  frontResults: Array<{
    front: DefFront;
    meanEpa: number;
    sackRate: number;
    pressureRate: number;
  }>;
  stuntResults: Array<{
    stunt: DLStuntType;
    meanEpa: number;
    sackRate: number;
    pressureRate: number;
  }>;
  specificityIndex: number; // 0 to 100
  specificityCategory: 'HYPER_SPECIFIC' | 'MODERATELY_SPECIFIC' | 'UNIVERSAL_CONCEPT';
  tacticalVerdict: string;
}

const CHAMPIONS: Array<{
  conceptId: OffensiveConceptId;
  situationId: keyof typeof SITUATIONS;
  targetDefCall: DefensiveCall;
  targetFront: DefFront;
}> = [
  {
    conceptId: 'EVO_PA_SHOT',
    situationId: '1st_10',
    targetDefCall: 'COV3_SKY',
    targetFront: 'OVER',
  },
  {
    conceptId: 'EVO_RUB_QUICK',
    situationId: '3rd_3',
    targetDefCall: 'COV1_ROBBER',
    targetFront: 'UNDER',
  },
  {
    conceptId: 'EVO_FLAP_DIG',
    situationId: '3rd_10',
    targetDefCall: 'COV4_QUARTERS',
    targetFront: 'WIDE_9',
  },
  {
    conceptId: 'EVO_ORBIT_SHOT',
    situationId: '2nd_2',
    targetDefCall: 'COV2_TAMPA',
    targetFront: 'OVER',
  },
  {
    conceptId: 'EVO_RZ_PYLON',
    situationId: 'RZ_2nd_8',
    targetDefCall: 'COV2_TAMPA',
    targetFront: 'MUG_A',
  },
];

const ALL_SCHEMES: DefensiveCall[] = [
  'COV3_SKY',
  'COV1_ROBBER',
  'COV2_TAMPA',
  'COV4_QUARTERS',
  'COV6_SPLIT',
  'FIRE_ZONE_3',
  'ZERO_BLITZ',
];

const ALL_FRONTS: DefFront[] = ['OVER', 'UNDER', 'WIDE_9', 'MUG_A'];
const ALL_STUNTS: DLStuntType[] = ['NONE', 'TE_TWIST', 'ET_TWIST', 'OVERLOAD_SLANT'];

console.log('================================================================');
console.log('FINDING OPTIMAL DEFENSIVE COUNTERS & COVERAGE SPECIFICITY AUDIT');
console.log('Evaluating 5 Evolved Champions against all Coverages, Fronts & Stunts...');
console.log('================================================================\n');

const fullReports: ConceptDefenseReport[] = [];

for (const champ of CHAMPIONS) {
  const conc = OFFENSIVE_CONCEPTS[champ.conceptId];
  const sit = SITUATIONS[champ.situationId];
  console.log(`\n>>> Testing [${conc.name}] in [${sit.label}]...`);

  const off = getLeagueAverageOffense();
  const def = getLeagueAverageDefense();

  const dropback = applyOffensiveConcept(off, champ.conceptId);
  const motion = conc.recommendedMotion;
  const blocking = conc.recommendedBlocking || 'HALF_SLIDE';

  // 1. Evaluate Target Defense
  const targetSummary = runMonteCarloBatch(
    clonePlay(off),
    clonePlay(def),
    champ.targetDefCall,
    sit,
    250,
    42069,
    false,
    motion,
    champ.targetFront,
    0.55,
    'NONE',
    dropback,
    blocking,
    'NONE',
    true
  );

  console.log(
    `  Target Defense [${champ.targetDefCall} | ${champ.targetFront}]: EPA ${targetSummary.meanEpa >= 0 ? '+' : ''}${targetSummary.meanEpa.toFixed(2)} | Success ${targetSummary.goalSuccessRate.toFixed(1)}% | Sacks ${targetSummary.sackRate.toFixed(1)}%`
  );

  // 2. Evaluate all 7 Coverages
  const coverageResults: ConceptDefenseReport['coverageResults'] = [];
  let worstEpa = Infinity;
  let optimalCounterScheme: DefensiveCall = 'COV3_SKY';
  let counterSummary: MonteCarloSummary = targetSummary;

  for (const scheme of ALL_SCHEMES) {
    const summary = runMonteCarloBatch(
      clonePlay(off),
      clonePlay(def),
      scheme,
      sit,
      250,
      10000 + ALL_SCHEMES.indexOf(scheme) * 500,
      false,
      motion,
      champ.targetFront,
      0.55,
      'NONE',
      dropback,
      blocking,
      'NONE',
      true
    );

    coverageResults.push({
      defCall: scheme,
      meanEpa: summary.meanEpa,
      successRate: summary.goalSuccessRate,
      completionRate: summary.completionRate,
      sackRate: summary.sackRate,
      pressureRate: summary.pressureRate,
      avgYards: summary.avgYards,
    });

    if (summary.meanEpa < worstEpa) {
      worstEpa = summary.meanEpa;
      optimalCounterScheme = scheme;
      counterSummary = summary;
    }
  }

  // 3. Evaluate Fronts with the Optimal Counter Scheme
  const frontResults: ConceptDefenseReport['frontResults'] = [];
  let bestCounterFront: DefFront = champ.targetFront;
  let lowestFrontEpa = Infinity;

  for (const front of ALL_FRONTS) {
    const summary = runMonteCarloBatch(
      clonePlay(off),
      clonePlay(def),
      optimalCounterScheme,
      sit,
      250,
      20000 + ALL_FRONTS.indexOf(front) * 500,
      false,
      motion,
      front,
      0.55,
      'NONE',
      dropback,
      blocking,
      'NONE',
      true
    );

    frontResults.push({
      front,
      meanEpa: summary.meanEpa,
      sackRate: summary.sackRate,
      pressureRate: summary.pressureRate,
    });

    if (summary.meanEpa < lowestFrontEpa) {
      lowestFrontEpa = summary.meanEpa;
      bestCounterFront = front;
    }
  }

  // 4. Evaluate Stunts with Optimal Counter Scheme + Front
  const stuntResults: ConceptDefenseReport['stuntResults'] = [];
  let bestCounterStunt: DLStuntType = 'NONE';
  let lowestStuntEpa = Infinity;
  let definitiveCounterSummary: MonteCarloSummary = counterSummary;

  for (const stunt of ALL_STUNTS) {
    const summary = runMonteCarloBatch(
      clonePlay(off),
      clonePlay(def),
      optimalCounterScheme,
      sit,
      250,
      30000 + ALL_STUNTS.indexOf(stunt) * 500,
      false,
      motion,
      bestCounterFront,
      0.55,
      'NONE',
      dropback,
      blocking,
      stunt,
      true
    );

    stuntResults.push({
      stunt,
      meanEpa: summary.meanEpa,
      sackRate: summary.sackRate,
      pressureRate: summary.pressureRate,
    });

    if (summary.meanEpa < lowestStuntEpa) {
      lowestStuntEpa = summary.meanEpa;
      bestCounterStunt = stunt;
      definitiveCounterSummary = summary;
    }
  }

  // 5. Compute Specificity Metrics
  const epas = coverageResults.map((c) => c.meanEpa);
  const epaStd = Math.sqrt(epas.reduce((acc, v) => acc + (v - targetSummary.meanEpa) ** 2, 0) / epas.length);

  // Specificity Index: 0 to 100 based on EPA drop-off and standard deviation
  // Higher = more fragile to coverage rotation; Lower = more universal concept
  const epaDrop = targetSummary.meanEpa - definitiveCounterSummary.meanEpa;
  const rawSpecificity = (epaDrop / Math.max(0.5, Math.abs(targetSummary.meanEpa) + 0.5)) * 60 + epaStd * 20;
  const specificityIndex = Math.max(0, Math.min(100, Math.round(rawSpecificity)));

  let specificityCategory: ConceptDefenseReport['specificityCategory'];
  let tacticalVerdict: string;

  if (specificityIndex >= 65) {
    specificityCategory = 'HYPER_SPECIFIC';
    tacticalVerdict = `COVERAGE-SPECIFIC KILLER: Decimates ${champ.targetDefCall}, but severely suppressed by ${optimalCounterScheme} (${bestCounterFront}). Requires pre-snap check or audible if defense rotates.`;
  } else if (specificityIndex >= 35) {
    specificityCategory = 'MODERATELY_SPECIFIC';
    tacticalVerdict = `MODERATELY SPECIFIC: Highest production against intended coverage, but maintains positive baseline value across majority of shells.`;
  } else {
    specificityCategory = 'UNIVERSAL_CONCEPT';
    tacticalVerdict = `UNIVERSAL CONCEPT: Extremely resilient against defensive rotations. Progression reads and geometry offer viable answers against virtually all 7 coverage shells.`;
  }

  console.log(`  OPTIMAL DEFENSIVE COUNTER: [${optimalCounterScheme} | ${bestCounterFront} | Stunt: ${bestCounterStunt}]`);
  console.log(
    `  Counter Stats: EPA ${definitiveCounterSummary.meanEpa >= 0 ? '+' : ''}${definitiveCounterSummary.meanEpa.toFixed(2)} | Success ${definitiveCounterSummary.goalSuccessRate.toFixed(1)}% | Sacks ${definitiveCounterSummary.sackRate.toFixed(1)}%`
  );
  console.log(`  EPA Suppression: -${(targetSummary.meanEpa - definitiveCounterSummary.meanEpa).toFixed(2)} EPA | Specificity: ${specificityIndex}/100 (${specificityCategory})`);

  fullReports.push({
    conceptId: champ.conceptId,
    conceptName: conc.name,
    situationId: champ.situationId,
    situationLabel: sit.label,
    targetDefense: {
      defCall: champ.targetDefCall,
      front: champ.targetFront,
      summary: targetSummary,
    },
    optimalCounter: {
      defCall: optimalCounterScheme,
      front: bestCounterFront,
      stunt: bestCounterStunt,
      summary: definitiveCounterSummary,
      epaSuppression: targetSummary.meanEpa - definitiveCounterSummary.meanEpa,
      successSuppression: targetSummary.goalSuccessRate - definitiveCounterSummary.goalSuccessRate,
    },
    coverageResults,
    frontResults,
    stuntResults,
    specificityIndex,
    specificityCategory,
    tacticalVerdict,
  });
}

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/defensive_counters_report.json', JSON.stringify(fullReports, null, 2), 'utf8');
console.log('\nAudit complete! Saved report to src/data/defensive_counters_report.json');
