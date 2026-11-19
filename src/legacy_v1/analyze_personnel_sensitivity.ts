import * as fs from 'fs';
import {
  PlayerConfig,
  MonteCarloSummary,
  runMonteCarloBatch,
  SITUATIONS,
} from './engine';
import { ALL_PRESET_MATCHUPS, getNflTeam } from './nfl_rosters';
import { EvolvedPlayRecord } from './run_deep_evolution';

interface TeamSensitivityResult {
  teamCode: string;
  teamName: string;
  tier: 'ELITE' | 'PLAYOFF' | 'AVERAGE' | 'DEVELOPING';
  qbName: string;
  summary: MonteCarloSummary;
}

interface PlaySensitivityReport {
  scenarioId: string;
  scenarioTitle: string;
  playChampionId: string;
  seed: number;
  tacticalConceptSummary: string;
  resultsByTeam: TeamSensitivityResult[];
  personnelSensitivityScore: number; // 0 to 100 scale (100 = heavily personnel dependent, 0 = scheme invariant)
  sensitivityAnalysis: string;
}

const TEAMS_TO_TEST: { code: string; tier: 'ELITE' | 'PLAYOFF' | 'AVERAGE' | 'DEVELOPING' }[] = [
  { code: 'AVG', tier: 'AVERAGE' },
  { code: 'PHI', tier: 'ELITE' },
  { code: 'KC', tier: 'ELITE' },
  { code: 'BAL', tier: 'ELITE' },
  { code: 'DET', tier: 'PLAYOFF' },
  { code: 'SF', tier: 'PLAYOFF' },
  { code: 'CAR', tier: 'DEVELOPING' },
];

export function runPersonnelSensitivityAnalysis(): void {
  if (!fs.existsSync('src/data/evolved_plays_catalog.json')) {
    console.error('Error: src/data/evolved_plays_catalog.json does not exist yet. Wait for deep evolution to complete.');
    return;
  }

  const catalog: EvolvedPlayRecord[] = JSON.parse(
    fs.readFileSync('src/data/evolved_plays_catalog.json', 'utf8')
  );
  console.log(`Loaded ${catalog.length} evolved plays from catalog.\n`);

  // Group by scenarioId and pick the champion (higher score)
  const scenariosMap = new Map<string, EvolvedPlayRecord>();
  for (const p of catalog) {
    const existing = scenariosMap.get(p.scenarioId);
    if (!existing || p.optimizedSummary.meanEpa > existing.optimizedSummary.meanEpa) {
      scenariosMap.set(p.scenarioId, p);
    }
  }

  const champions = Array.from(scenariosMap.values());
  const fullReports: PlaySensitivityReport[] = [];

  console.log('================================================================================');
  console.log('       CROSS-PERSONNEL SENSITIVITY AUDIT ACROSS 7 NFL ROSTER TIERS');
  console.log('================================================================================\n');

  for (const champ of champions) {
    const sit = SITUATIONS[champ.situationId];
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`CHAMPION PLAY: ${champ.scenarioTitle}`);
    console.log(`Evolved from Seed ${champ.seed} (${champ.totalGenerations} generations)`);
    console.log(`Optimized Cadence: Motion=[${champ.optimizedMotion}], Dropback=[${champ.optimizedDropback}], Blocking=[${champ.optimizedBlocking}]`);
    console.log(`--------------------------------------------------------------------------------`);

    const teamResults: TeamSensitivityResult[] = [];

    for (const tInfo of TEAMS_TO_TEST) {
      let off: PlayerConfig[];
      let def: PlayerConfig[];
      let teamName: string;
      let qbName: string;

      if (tInfo.code === 'AVG') {
        const avg = ALL_PRESET_MATCHUPS['NFL_AVERAGE'];
        off = avg.getOffense();
        def = avg.getDefense();
        teamName = 'NFL 50th %ile Average';
        qbName = off[0].name;
      } else {
        const team = getNflTeam(tInfo.code);
        off = team.getOffense();
        def = team.getDefense();
        teamName = team.fullName;
        qbName = off[0].name;
      }

      // Transfer evolved route geometry, roles, read orders, and splits onto the target team's players
      for (const p of off) {
        const routeSpec = champ.routes[p.id];
        if (routeSpec) {
          p.role = routeSpec.role;
          p.readOrder = routeSpec.readOrder;
          p.waypoints = routeSpec.waypoints.map((w) => ({ ...w }));
          p.eligible = routeSpec.role === 'ROUTE' || routeSpec.role === 'CHIP_RELEASE';
        }
        // Match start position split if tuned
        const champPlayer = champ.offenseRoster.find((cp) => cp.id === p.id);
        if (champPlayer && p.id !== 'QB') {
          p.startPos.x = champPlayer.startPos.x;
        }
      }

      const summary = runMonteCarloBatch(
        off,
        def,
        champ.defCall,
        sit,
        250,
        18880 + TEAMS_TO_TEST.indexOf(tInfo) * 73,
        false,
        champ.optimizedMotion,
        champ.defFront,
        0.55,
        'NONE',
        champ.optimizedDropback,
        champ.optimizedBlocking,
        'NONE',
        true
      );

      teamResults.push({
        teamCode: tInfo.code,
        teamName,
        tier: tInfo.tier,
        qbName,
        summary,
      });

      console.log(
        `  [${tInfo.tier.padEnd(10)}] ${tInfo.code.padEnd(4)} (${teamName.padEnd(25)} - ${qbName}): ` +
        `EPA: ${summary.meanEpa >= 0 ? '+' : ''}${summary.meanEpa.toFixed(2)} | ` +
        `Success: ${summary.goalSuccessRate.toFixed(1).padStart(5)}% | ` +
        `Comp: ${summary.completionRate.toFixed(1).padStart(5)}% | ` +
        `Sack: ${summary.sackRate.toFixed(1).padStart(4)}% | ` +
        `Air: ${summary.avgAirYards.toFixed(1)}y`
      );
    }

    // Compute sensitivity metrics
    const epas = teamResults.map((r) => r.summary.meanEpa);
    const minEpa = Math.min(...epas);
    const maxEpa = Math.max(...epas);
    const epaRange = maxEpa - minEpa;
    const meanEpaAvg = epas.reduce((a, b) => a + b, 0) / epas.length;
    const epaStd = Math.sqrt(epas.reduce((acc, v) => acc + Math.pow(v - meanEpaAvg, 2), 0) / epas.length);

    // 0 to 100 sensitivity score
    const sensitivityScore = Math.min(100, Math.round(epaRange * 45 + epaStd * 60));

    let sensitivitySummary = '';
    if (sensitivityScore < 30) {
      sensitivitySummary = 'SCHEME-DRIVEN (HIGHLY INVARIANT): Play relies on spacing, leverage, and route concept geometry. Succeeds consistently across all talent tiers.';
    } else if (sensitivityScore < 60) {
      sensitivitySummary = 'MODERATELY PERSONNEL SENSITIVE: Benefits significantly from above-average QB accuracy or OT anchor power, but remains viable for average teams.';
    } else {
      sensitivitySummary = 'PERSONNEL-CRITICAL: Performance drops severely on lower-tier rosters. Requires high-end pass protection, elite throw power, or premier contested catch skill.';
    }

    console.log(`\n  >> Sensitivity Score: ${sensitivityScore}/100 (${sensitivitySummary})`);
    console.log(`  >> EPA Range: ${minEpa.toFixed(2)} to +${maxEpa.toFixed(2)} (Δ = ${epaRange.toFixed(2)} EPA, σ = ${epaStd.toFixed(2)})\n`);

    fullReports.push({
      scenarioId: champ.scenarioId,
      scenarioTitle: champ.scenarioTitle,
      playChampionId: champ.id,
      seed: champ.seed,
      tacticalConceptSummary: `Motion: ${champ.optimizedMotion}, Dropback: ${champ.optimizedDropback}, Blocking: ${champ.optimizedBlocking}`,
      resultsByTeam: teamResults,
      personnelSensitivityScore: sensitivityScore,
      sensitivityAnalysis: sensitivitySummary,
    });
  }

  fs.writeFileSync('src/data/personnel_sensitivity_report.json', JSON.stringify(fullReports, null, 2), 'utf8');
  console.log('Saved full cross-team sensitivity report to src/data/personnel_sensitivity_report.json!');
}

runPersonnelSensitivityAnalysis();
