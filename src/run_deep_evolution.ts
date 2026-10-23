import * as fs from 'fs';
import {
  PlayerConfig,
  DefScheme,
  DefFront,
  BlockingSchemeId,
  DropbackType,
  PreSnapMotionId,
  OffensiveRole,
  SituationSpec,
  SituationId,
  MonteCarloSummary,
  PRNG,
  clonePlay,
  runMonteCarloBatch,
  SITUATIONS,
  computeOffensePercentile,
} from './engine';
import { ALL_PRESET_MATCHUPS } from './nfl_rosters';

export interface EvolvedPlayRecord {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  situationId: SituationId;
  defCall: DefScheme;
  defFront: DefFront;
  seed: number;
  totalGenerations: number;
  initialPlayName: string;
  optimizedMotion: PreSnapMotionId;
  optimizedDropback: DropbackType;
  optimizedBlocking: BlockingSchemeId;
  offenseRoster: PlayerConfig[];
  routes: Record<string, { readOrder: number; role: OffensiveRole; waypoints: { x: number; y: number }[]; roleDesc: string }>;
  baselineSummary: MonteCarloSummary;
  optimizedSummary: MonteCarloSummary;
  percentile: number;
  tacticalNotes: string[];
}

interface ScenarioConfig {
  id: string;
  title: string;
  situationId: SituationId;
  defCall: DefScheme;
  defFront: DefFront;
  initialPlay: string;
  initialMotion: PreSnapMotionId;
  initialDropback: DropbackType;
  initialBlocking: BlockingSchemeId;
  seeds: number[];
}

const SCENARIOS_TO_EVOLVE: ScenarioConfig[] = [
  {
    id: 'SCENARIO_1_EARLY_DOWN_COV3',
    title: '1st & 10 (Own 25) vs Cover 3 Sky — Early-Down Explosive vs MOFC',
    situationId: '1st_10',
    defCall: 'COV3_SKY',
    defFront: 'OVER',
    initialPlay: 'PA_YANKEE',
    initialMotion: 'NONE',
    initialDropback: 'PLAY_ACTION',
    initialBlocking: 'HALF_SLIDE',
    seeds: [1001, 1002],
  },
  {
    id: 'SCENARIO_2_SHORT_YARDAGE_COV1',
    title: '3rd & 3 (Opp 38) vs Cover 1 Robber — High-Leverage Man Conversion',
    situationId: '3rd_3',
    defCall: 'COV1_ROBBER',
    defFront: 'OVER',
    initialPlay: 'MESH',
    initialMotion: 'NONE',
    initialDropback: 'QUICK_GAME',
    initialBlocking: 'BIG_ON_BIG',
    seeds: [2001, 2002],
  },
  {
    id: 'SCENARIO_3_LONG_YARDAGE_COV4',
    title: '3rd & 10 (Own 40) vs Cover 4 Quarters — Sticks Beater vs Deep Shell',
    situationId: '3rd_10',
    defCall: 'COV4_QUARTERS',
    defFront: 'OVER',
    initialPlay: 'DAGGER',
    initialMotion: 'JET_L_TO_R',
    initialDropback: 'STANDARD_DROP',
    initialBlocking: 'HALF_SLIDE',
    seeds: [3001, 3002],
  },
  {
    id: 'SCENARIO_4_SHOT_PLAY_COV2',
    title: '2nd & 2 (Midfield 50) vs Cover 2 Tampa — Aggressive Deep Split-Safety Shot',
    situationId: '2nd_2',
    defCall: 'COV2_TAMPA',
    defFront: 'WIDE_9',
    initialPlay: 'SMASH_DIVIDE',
    initialMotion: 'ORBIT_RETURN',
    initialDropback: 'PLAY_ACTION',
    initialBlocking: 'MAX_PROTECT',
    seeds: [4001, 4002],
  },
  {
    id: 'SCENARIO_5_RED_ZONE_GOAL_LINE',
    title: 'Red Zone 2nd & 8 (Opp 8) vs Cover 2 Match — Compressed Boundary Strike',
    situationId: 'RZ_2nd_8',
    defCall: 'COV2_TAMPA',
    defFront: 'MUG_A',
    initialPlay: 'STICK_NOD',
    initialMotion: 'NONE',
    initialDropback: 'STANDARD_DROP',
    initialBlocking: 'HALF_SLIDE',
    seeds: [5001, 5002],
  },
];

function scoreSummary(s: MonteCarloSummary, sit: SituationSpec): number {
  const goalWeight = sit.down >= 3 ? 1.25 : 0.85;
  return (
    s.meanEpa +
    goalWeight * (s.goalSuccessRate / 100) +
    0.20 * s.medianEpa +
    0.15 * (s.epaSuccessRate / 100) -
    0.18 * s.stdEpa -
    0.35 * (s.intRate / 100)
  );
}

export function runDeepEvolution(
  sc: ScenarioConfig,
  seed: number,
  generations = 2000
): EvolvedPlayRecord {
  const sit = SITUATIONS[sc.situationId];
  const rng = new PRNG(seed);

  // Baseline synthetic 50th-percentile league roster
  const avgPreset = ALL_PRESET_MATCHUPS['NFL_AVERAGE'];
  const baseOffense = avgPreset.getOffense();
  const baseDefense = avgPreset.getDefense();

  let bestPlay = clonePlay(baseOffense);
  let bestMotion = sc.initialMotion;
  let bestDropback = sc.initialDropback;
  let bestBlocking = sc.initialBlocking;

  // Run comprehensive initial baseline evaluation (150 snaps)
  const baselineSummary = runMonteCarloBatch(
    bestPlay,
    baseDefense,
    sc.defCall,
    sit,
    150,
    seed,
    false,
    bestMotion,
    sc.defFront,
    0.55,
    'NONE',
    bestDropback,
    bestBlocking,
    'NONE',
    true
  );
  let bestScore = scoreSummary(baselineSummary, sit);
  let bestSummary = baselineSummary;

  const eliteArchive: {
    play: PlayerConfig[];
    motion: PreSnapMotionId;
    dropback: DropbackType;
    blocking: BlockingSchemeId;
    score: number;
  }[] = [
    {
      play: clonePlay(bestPlay),
      motion: bestMotion,
      dropback: bestDropback,
      blocking: bestBlocking,
      score: bestScore,
    },
  ];

  const maxFieldY = Math.min(32.0, 100 - sit.yardline + 8.5);
  const tacticalMutationsApplied: string[] = [];

  console.log(`\n================================================================================`);
  console.log(`EVOLVING: ${sc.title}`);
  console.log(`Seed: ${seed} | Target Generations: ${generations} | Down/Dist: ${sit.label}`);
  console.log(`Initial Score: ${bestScore.toFixed(3)} | EPA: ${bestSummary.meanEpa >= 0 ? '+' : ''}${bestSummary.meanEpa.toFixed(2)} | Success: ${bestSummary.goalSuccessRate.toFixed(1)}% | Comp: ${bestSummary.completionRate.toFixed(1)}%`);
  console.log(`================================================================================`);

  for (let gen = 1; gen <= generations; gen++) {
    // Parent selection from elite archive
    const parentEntry =
      eliteArchive.length > 1 && rng.next() < 0.40
        ? eliteArchive[Math.floor(rng.next() * eliteArchive.length)]
        : { play: bestPlay, motion: bestMotion, dropback: bestDropback, blocking: bestBlocking, score: bestScore };

    const candidate = clonePlay(parentEntry.play);
    let candMotion = parentEntry.motion;
    let candDropback = parentEntry.dropback;
    let candBlocking = parentEntry.blocking;

    const eligibles = candidate.filter((p) => p.eligible);
    const targetRec = eligibles[Math.floor(rng.next() * eligibles.length)];
    let mutationDesc = '';

    const roll = rng.next();

    // 1. Protection Role Mutation (TE / RB pass block or chip-release)
    if (roll < 0.12 && (targetRec.id === 'TE' || targetRec.id === 'RB')) {
      const roles: OffensiveRole[] =
        bestSummary.sackRate > 8.0
          ? ['PASS_BLOCK', 'CHIP_RELEASE', 'ROUTE']
          : ['ROUTE', 'CHIP_RELEASE'];
      const nextRole = roles[Math.floor(rng.next() * roles.length)];
      targetRec.role = nextRole;
      mutationDesc = `Protection: ${targetRec.name} (${targetRec.label}) set to [${nextRole}]`;
    }
    // 2. O-Line Blocking Scheme Mutation
    else if (roll < 0.22) {
      const schemes: BlockingSchemeId[] = [
        'HALF_SLIDE',
        'PIN_AND_PULL',
        'BIG_ON_BIG',
        'FULL_SLIDE_L',
        'FULL_SLIDE_R',
        'MAX_PROTECT',
      ];
      candBlocking = schemes[Math.floor(rng.next() * schemes.length)];
      mutationDesc = `Blocking Scheme: [${candBlocking}]`;
    }
    // 3. Route Geometry & Waypoint Tuning (Stem & Break Delta)
    else if (roll < 0.52 && targetRec.waypoints.length >= 2) {
      const wp0 = targetRec.waypoints[0];
      const wp1 = targetRec.waypoints[1];

      const sticksTargetY = sit.down >= 3 ? Math.min(maxFieldY - 1.5, sit.distance + 1.2) : wp0.y;
      const pullToSticks = sit.down >= 3 ? (sticksTargetY - wp0.y) * 0.35 : 0;
      const deltaStemY = pullToSticks + (rng.next() - 0.45) * 2.8;
      const deltaBreakX = (rng.next() - 0.5) * 5.2;
      const deltaBreakY = (rng.next() - 0.48) * 3.2;

      wp0.y = Math.max(1.8, Math.min(maxFieldY - 2.5, wp0.y + deltaStemY));
      wp1.x = Math.max(-23.5, Math.min(23.5, wp1.x + deltaBreakX));
      wp1.y = Math.max(0.5, Math.min(maxFieldY - 0.8, wp1.y + deltaBreakY));
      mutationDesc = `Waypoint: ${targetRec.label} break tuned to (${wp0.x.toFixed(1)}, ${wp0.y.toFixed(1)}y) ➔ (${wp1.x.toFixed(1)}, ${wp1.y.toFixed(1)}y)`;
    }
    // 4. Route Template Substitution (Contextual route tree)
    else if (roll < 0.72) {
      const x0 = targetRec.startPos.x;
      const insideDir = x0 < 0 ? 1 : -1;
      const outsideDir = -insideDir;
      const sticksY = Math.min(maxFieldY - 2.0, Math.max(3.5, sit.distance + 1.0));

      const templates = [
        { name: 'Sticks In-Cut', wps: [{ x: x0, y: sticksY }, { x: x0 + insideDir * 9.0, y: sticksY + 0.4 }] },
        { name: 'Quick Slant Window', wps: [{ x: x0, y: 2.8 }, { x: x0 + insideDir * 8.0, y: 8.0 }] },
        { name: 'Speed Out', wps: [{ x: x0, y: Math.min(sticksY, 6.0) }, { x: x0 + outsideDir * 6.5, y: Math.min(sticksY, 6.0) }] },
        { name: 'Option Whip', wps: [{ x: x0 + insideDir * 2.5, y: 4.8 }, { x: x0 + outsideDir * 5.5, y: 5.2 }] },
        { name: '7-Route Corner', wps: [{ x: x0, y: Math.min(10.0, maxFieldY - 4) }, { x: x0 + outsideDir * 7.5, y: Math.min(16.5, maxFieldY - 1) }] },
        { name: 'Shallow Drag', wps: [{ x: x0 + insideDir * 3.0, y: 4.0 }, { x: x0 + insideDir * 14.0, y: 4.8 }] },
        { name: 'Vertical Seam', wps: [{ x: x0, y: Math.min(maxFieldY - 2, 22.0) }] },
      ];
      const chosen = templates[Math.floor(rng.next() * templates.length)];
      targetRec.role = 'ROUTE';
      targetRec.waypoints = chosen.wps.map((w) => ({ ...w }));
      mutationDesc = `Route Concept: ${targetRec.label} assigned [${chosen.name}]`;
    }
    // 5. Pre-Snap Alignment Split
    else if (roll < 0.84) {
      const deltaX = (rng.next() - 0.5) * 3.5;
      const oldX = targetRec.startPos.x;
      targetRec.startPos.x = Math.max(-23.0, Math.min(23.0, oldX + deltaX));
      const shift = targetRec.startPos.x - oldX;
      targetRec.waypoints.forEach((w) => {
        w.x = Math.max(-23.5, Math.min(23.5, w.x + shift));
      });
      mutationDesc = `Alignment: ${targetRec.label} split shifted to x=${targetRec.startPos.x.toFixed(1)}y`;
    }
    // 6. Progression Read Order Swap
    else if (roll < 0.93) {
      const a = eligibles[Math.floor(rng.next() * eligibles.length)];
      const b = eligibles[Math.floor(rng.next() * eligibles.length)];
      if (a.id !== b.id) {
        const tmp = a.readOrder;
        a.readOrder = b.readOrder;
        b.readOrder = tmp;
        mutationDesc = `Progression: ${a.label} (Read #${a.readOrder}) ⇄ ${b.label} (Read #${b.readOrder})`;
      } else {
        continue;
      }
    }
    // 7. Motion & Dropback Rhythm
    else {
      const motions: PreSnapMotionId[] = ['NONE', 'JET_R_TO_L', 'JET_L_TO_R', 'ORBIT_RETURN', 'RB_FLAP_OUT', 'TE_SIFT'];
      candMotion = motions[Math.floor(rng.next() * motions.length)];
      if (sit.down <= 2 && sit.distance <= 8 && rng.next() < 0.45) {
        candDropback = 'PLAY_ACTION';
      } else if (sit.distance <= 4 && rng.next() < 0.55) {
        candDropback = 'QUICK_GAME';
      } else {
        candDropback = 'STANDARD_DROP';
      }
      mutationDesc = `Cadence: Motion=[${candMotion}], Dropback=[${candDropback}]`;
    }

    // Two-Stage Candidate Evaluation:
    // Stage 1: Fast Screening (25 snaps)
    const screeningSnaps = 25;
    const candScreening = runMonteCarloBatch(
      candidate,
      baseDefense,
      sc.defCall,
      sit,
      screeningSnaps,
      seed + gen * 31,
      false,
      candMotion,
      sc.defFront,
      0.55,
      'NONE',
      candDropback,
      candBlocking,
      'NONE',
      true
    );
    const screeningScore = scoreSummary(candScreening, sit);

    // If screening passes, run Stage 2 Verification (75 snaps)
    if (screeningScore > bestScore - 0.05) {
      const verifySnaps = 75;
      const candVerify = runMonteCarloBatch(
        candidate,
        baseDefense,
        sc.defCall,
        sit,
        verifySnaps,
        seed + gen * 31 + 7,
        false,
        candMotion,
        sc.defFront,
        0.55,
        'NONE',
        candDropback,
        candBlocking,
        'NONE',
        true
      );
      const verifyScore = scoreSummary(candVerify, sit);

      if (verifyScore > bestScore + 0.005) {
        bestPlay = candidate;
        bestMotion = candMotion;
        bestDropback = candDropback;
        bestBlocking = candBlocking;
        bestSummary = candVerify;
        bestScore = verifyScore;

        if (mutationDesc) tacticalMutationsApplied.push(`Gen ${gen}: ${mutationDesc}`);

        if (eliteArchive.length < 8) {
          eliteArchive.push({ play: clonePlay(bestPlay), motion: bestMotion, dropback: bestDropback, blocking: bestBlocking, score: bestScore });
        } else {
          eliteArchive[Math.floor(rng.next() * eliteArchive.length)] = {
            play: clonePlay(bestPlay),
            motion: bestMotion,
            dropback: bestDropback,
            blocking: bestBlocking,
            score: bestScore,
          };
        }
      }
    }

    if (gen % 500 === 0 || gen === generations) {
      console.log(`[Gen ${String(gen).padStart(4)} / ${generations}] Score: ${bestScore.toFixed(3)} | EPA: ${bestSummary.meanEpa >= 0 ? '+' : ''}${bestSummary.meanEpa.toFixed(2)} | Success: ${bestSummary.goalSuccessRate.toFixed(1)}% | Comp: ${bestSummary.completionRate.toFixed(1)}% | Sack: ${bestSummary.sackRate.toFixed(1)}%`);
    }
  }

  // Final 250-snap robust evaluation of the champion design
  const finalSummary = runMonteCarloBatch(
    bestPlay,
    baseDefense,
    sc.defCall,
    sit,
    250,
    seed + 9999,
    false,
    bestMotion,
    sc.defFront,
    0.55,
    'NONE',
    bestDropback,
    bestBlocking,
    'NONE',
    true
  );

  const pctile = computeOffensePercentile(finalSummary, sit);

  // Extract clean routes dictionary
  const routes: EvolvedPlayRecord['routes'] = {};
  for (const p of bestPlay) {
    if (p.eligible) {
      routes[p.id] = {
        readOrder: p.readOrder,
        role: p.role,
        waypoints: p.waypoints.map((w) => ({ x: Math.round(w.x * 10) / 10, y: Math.round(w.y * 10) / 10 })),
        roleDesc: `${p.label} (Read #${p.readOrder}) [${p.role}]`,
      };
    }
  }

  return {
    id: `${sc.id}_SEED_${seed}`,
    scenarioId: sc.id,
    scenarioTitle: sc.title,
    situationId: sc.situationId,
    defCall: sc.defCall,
    defFront: sc.defFront,
    seed,
    totalGenerations: generations,
    initialPlayName: sc.initialPlay,
    optimizedMotion: bestMotion,
    optimizedDropback: bestDropback,
    optimizedBlocking: bestBlocking,
    offenseRoster: bestPlay,
    routes,
    baselineSummary,
    optimizedSummary: finalSummary,
    percentile: pctile.percentile,
    tacticalNotes: tacticalMutationsApplied.slice(-15),
  };
}

console.log('Starting Deep Play Evolution (2,000 generations per seed across 5 scenarios)...');
const allEvolvedPlays: EvolvedPlayRecord[] = [];

for (const sc of SCENARIOS_TO_EVOLVE) {
  for (const seed of sc.seeds) {
    const record = runDeepEvolution(sc, seed, 2000);
    allEvolvedPlays.push(record);
  }
}

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/evolved_plays_catalog.json', JSON.stringify(allEvolvedPlays, null, 2), 'utf8');
console.log(`\nSuccessfully saved ${allEvolvedPlays.length} evolved plays to src/data/evolved_plays_catalog.json!`);
