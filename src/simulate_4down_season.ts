import fs from 'node:fs';
import path from 'node:path';
import type { CompactPlayOutcome } from './run_dual_qb_nash_tournament.js';

interface OffensePoolBundle {
  label: string;
  qbRoomCapM: number;
  isDualQbOnField: boolean;
  nash13OffMix: Record<string, number>;
  nash13DefMix: Record<string, number>;
  playBuckets: Record<string, 'OPEN' | 'PASS_3RD' | 'SHORT_RUN'>;
  poolsByPlayAndDef: Record<string, Record<string, CompactPlayOutcome[]>>;
}

// Fast deterministic-seedable PRNG (Mulberry32) for clean apples-to-apples comparisons across architectures
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleWeighted(weights: [string, number][], rng: () => number): string {
  let tot = 0;
  for (const [, w] of weights) tot += w;
  if (tot <= 0) return weights[0][0];
  let r = rng() * tot;
  for (const [k, w] of weights) {
    r -= w;
    if (r <= 0) return k;
  }
  return weights[weights.length - 1][0];
}

// Empirically calibrated NFL FG make probability by kick distance (yardLine = 100 - ballOn + 17)
function fgMakeProb(kickDistYds: number): number {
  if (kickDistYds <= 29) return 0.985;
  if (kickDistYds <= 39) return 0.935;
  if (kickDistYds <= 44) return 0.875;
  if (kickDistYds <= 49) return 0.815;
  if (kickDistYds <= 54) return 0.725;
  if (kickDistYds <= 58) return 0.56;
  return 0.36;
}

// Apply backup QB efficiency degradation honestly when an injured QB is replaced by a lower-tier backup
function applyBackupDegradation(
  o: CompactPlayOutcome,
  epaPenalty: number,
  rng: () => number
): CompactPlayOutcome {
  if (epaPenalty >= -0.005) return o;
  // Convert EPA/play penalty into realistic pass completion / sack / INT / yardage friction
  const severity = Math.min(1.0, Math.abs(epaPenalty) / 0.16);
  if (o.p === 1) {
    if (o.r === 'C' || o.r === 'TD') {
      // Lower accuracy/processing turns a fraction of tight-window completions into incompletions/sacks/INTs
      const degradeRoll = rng();
      if (degradeRoll < 0.022 * severity) {
        return { ...o, y: 0, r: 'INT' };
      }
      if (degradeRoll < (0.022 + 0.032) * severity) {
        return { ...o, y: -6.5, r: 'S' };
      }
      if (degradeRoll < (0.022 + 0.032 + 0.085) * severity) {
        return { ...o, y: 0, r: 'I' };
      }
      return { ...o, y: Math.max(0, +(o.y * (1 - 0.10 * severity)).toFixed(1)) };
    }
  } else if (o.qr === 1) {
    return { ...o, y: +(o.y - 1.2 * severity).toFixed(1) };
  }
  return o;
}

// Apply conservative NFL week-to-week defensive scouting adaptation haircut on exotic 2-QB plays
// (keeps 4-down projections strictly honest rather than assuming zero defensive film adjustment)
function applyAdaptationHaircut(
  o: CompactPlayOutcome,
  haircutFrac: number,
  rng: () => number
): CompactPlayOutcome {
  if (haircutFrac <= 0) return o;
  if (o.r === 'T' || o.r === 'C' || o.r === 'OOB' || o.r === 'TD') {
    if (o.y > 0) {
      // Shave positive yardage tail slightly (e.g. 18% haircut on exotic YAC/explosives)
      const trimmed = +(o.y * (1 - haircutFrac * (0.75 + rng() * 0.5))).toFixed(1);
      return { ...o, y: trimmed };
    }
  }
  return o;
}

interface ArchitectureSpec {
  id: string;
  label: string;
  qbRoomCapM: number;
  primaryPoolId: string;
  oneOutPoolId: string;
  oneOutEpaPenalty: number;
  bothOutEpaPenalty: number;
  isDualQbOnField: boolean;
  exoticAdaptationHaircut: number; // Conservative defensive scouting haircut on non-standard schemes
}

interface DriveStats {
  drives: number;
  plays: number;
  tds: number;
  fgs: number;
  punts: number;
  threeAndOuts: number;
  turnovers: number;
  sacks: number;
  ints: number;
  fumblesLost: number;
  points: number;
  redZoneTrips: number;
  redZoneTds: number;
  qb1Hits: number;
  qb2Hits: number;
}

// Simulate ONE full 4-down NFL offensive drive starting at `startBallOn` (1..99)
function simulateOffensiveDrive(
  startBallOn: number,
  pool: OffensePoolBundle,
  backupEpaPenalty: number,
  exoticHaircut: number,
  qb1Healthy: boolean,
  qb2Healthy: boolean,
  isDualQbOnField: boolean,
  clockSecRemaining: number,
  rng: () => number,
  stats: DriveStats,
  onQbInjury: (whichQb: 1 | 2) => void
): {
  pointsScored: number;
  nextOppBallOn: number;
  elapsedSec: number;
} {
  let ballOn = startBallOn;
  let down = 1;
  let toGo = Math.min(10, 100 - ballOn);
  let drivePlays = 0;
  let firstDowns = 0;
  let elapsedSec = 0;
  let enteredRedZone = ballOn >= 80;

  // Build realistic NFL defensive mix: 55% league-wide base shells + 45% tailored 13-Defense Nash Counter Mix
  // (Real NFL defenses mix base calls + heavy gameplan counter, never running 100% Cover-0 Mug blitzes all season!)
  const leagueBaseDefWeights: Record<string, number> = {
    NICKEL_OVER_C3: 18,
    NICKEL_UNDER_C1: 15,
    NICKEL_SIM_C2: 12,
    DIME_QUARTERS_MATCH: 15,
    BASE_34_BEAR_C4: 10,
    BASE_43_OVER_C1: 10,
    VIKINGS_SAFETY_BLITZ_C1: 8,
    DIME_MUG_C0: 6,
    VIKINGS_MUG_CROSSDOG_C0: 6,
  };
  const blendedDefMap: Record<string, number> = {};
  for (const [k, v] of Object.entries(leagueBaseDefWeights)) {
    blendedDefMap[k] = (blendedDefMap[k] ?? 0) + v * 0.55;
  }
  for (const [k, v] of Object.entries(pool.nash13DefMix)) {
    if (v > 0) blendedDefMap[k] = (blendedDefMap[k] ?? 0) + v * 0.45;
  }
  const defWeights: [string, number][] = Object.entries(blendedDefMap).filter(([, w]) => w > 0);
  const allPlayIds = Object.keys(pool.playBuckets);
  const passPlayIds = allPlayIds.filter((id) => pool.playBuckets[id] === 'PASS_3RD' || (pool.playBuckets[id] === 'OPEN' && !id.includes('LASER')));
  const runPlayIds = allPlayIds.filter((id) => pool.playBuckets[id] === 'SHORT_RUN' || id.includes('LASER'));

  const pickFromSubset = (ids: string[]): string => {
    const subWeights: [string, number][] = ids.map((id) => [
      id,
      // Blend Nash weight with realistic playbook diversity floor (prevents 100% single-play Pin-Pull spam!)
      Math.max(12.0, Math.min(52.0, (pool.nash13OffMix[id] ?? 0) * 0.75 + 14.0)),
    ]);
    return sampleWeighted(subWeights, rng);
  };

  const pickOffPlay = (curDown: number, curToGo: number, curBallOn: number, twoMin: boolean): string => {
    // Authentic NFL pass probability by down/distance/clock (league avg ~56% pass, ~44% run; Argon v2 ~48% pass/RPO)
    let passProb = 0.50;
    if (twoMin) passProb = 0.94;
    else if (curDown >= 3 && curToGo >= 7) passProb = 0.93;
    else if (curDown >= 3 && curToGo >= 4) passProb = 0.78;
    else if (curDown >= 3 && curToGo <= 2) passProb = 0.36;
    else if (curDown === 2 && curToGo >= 8) passProb = 0.74;
    else if (curDown === 2 && curToGo <= 3) passProb = 0.42;
    else if (curBallOn >= 95) passProb = 0.40;
    else passProb = isDualQbOnField ? 0.46 : 0.52;

    if (rng() < passProb && passPlayIds.length > 0) {
      return pickFromSubset(passPlayIds);
    }
    return runPlayIds.length > 0 ? pickFromSubset(runPlayIds) : pickFromSubset(allPlayIds);
  };

  stats.drives++;

  while (elapsedSec < clockSecRemaining) {
    const twoMin = clockSecRemaining - elapsedSec <= 130;

    // 4th-down decision logic (modern NFL analytics)
    if (down === 4) {
      const kickDist = 100 - ballOn + 17;
      const goForIt =
        (ballOn >= 60 && toGo <= 2) ||
        (ballOn >= 96 && toGo <= 3) ||
        (ballOn >= 48 && ballOn <= 62 && toGo <= 1) ||
        (twoMin && ballOn >= 45 && toGo <= 5);

      if (!goForIt) {
        if (kickDist <= 57) {
          elapsedSec += 5;
          if (rng() < fgMakeProb(kickDist)) {
            stats.fgs++;
            stats.points += 3;
            if (enteredRedZone) stats.redZoneTrips++;
            return { pointsScored: 3, nextOppBallOn: 30, elapsedSec };
          } else {
            if (enteredRedZone) stats.redZoneTrips++;
            const oppStart = Math.max(20, 100 - Math.max(20, ballOn - 7));
            return { pointsScored: 0, nextOppBallOn: oppStart, elapsedSec };
          }
        } else {
          // Punt (~42.5y net average, touchback at own 20)
          stats.punts++;
          if (drivePlays === 3 && firstDowns === 0) stats.threeAndOuts++;
          if (enteredRedZone) stats.redZoneTrips++;
          elapsedSec += 7;
          const puntNet = 37 + rng() * 11;
          const landing = ballOn + puntNet;
          const oppStart = landing >= 100 ? 20 : Math.max(5, Math.round(100 - landing));
          return { pointsScored: 0, nextOppBallOn: oppStart, elapsedSec };
        }
      }
    }

    // Sample play from Nash equilibrium + real 20 Hz simulated physics outcome!
    const playId = pickOffPlay(down, toGo, ballOn, twoMin);
    const defId = sampleWeighted(defWeights, rng);
    const rawPool = pool.poolsByPlayAndDef[playId]?.[defId];
    const rawOut = rawPool[Math.floor(rng() * rawPool.length)];
    const adjOut = applyBackupDegradation(
      applyAdaptationHaircut(rawOut, exoticHaircut, rng),
      backupEpaPenalty,
      rng
    );

    drivePlays++;
    stats.plays++;

    // Per-snap QB contact & injury roll (calibrated to nflverse: p_rush=0.00145, p_sack=0.00220)
    const isSack = adjOut.r === 'S';
    const isQbRush = adjOut.qr === 1;
    if (isSack || isQbRush) {
      const whichQb: 1 | 2 = isDualQbOnField && adjOut.q2 === 1 ? 2 : 1;
      if (whichQb === 1) stats.qb1Hits++;
      else stats.qb2Hits++;

      const activeHealthy = whichQb === 1 ? qb1Healthy : qb2Healthy;
      if (activeHealthy) {
        const injProb = isSack ? 0.0022 : 0.00145;
        if (rng() < injProb) {
          onQbInjury(whichQb);
        }
      }
    }

    // Advance game clock realistically
    const clockStops = adjOut.r === 'I' || adjOut.r === 'OOB' || adjOut.r === 'INT' || adjOut.r === 'FL';
    elapsedSec += Math.round(adjOut.sec) + (clockStops ? 7 : twoMin ? 14 : 29);

    // Handle Turnovers
    if (adjOut.r === 'INT') {
      stats.turnovers++;
      stats.ints++;
      if (enteredRedZone) stats.redZoneTrips++;
      const intSpot = Math.min(98, Math.max(10, ballOn + 10));
      const oppStart = Math.max(10, Math.min(85, 100 - intSpot + Math.round(rng() * 12)));
      return { pointsScored: 0, nextOppBallOn: oppStart, elapsedSec };
    }
    if (adjOut.r === 'FL') {
      stats.turnovers++;
      stats.fumblesLost++;
      if (enteredRedZone) stats.redZoneTrips++;
      const spot = Math.max(5, Math.min(95, ballOn + Math.round(adjOut.y)));
      return { pointsScored: 0, nextOppBallOn: Math.max(10, 100 - spot), elapsedSec };
    }

    if (isSack) stats.sacks++;

    // Advance ball & evaluate Touchdown / 1st Down / Turnover on Downs
    const yards = adjOut.r === 'I' ? 0 : adjOut.y;
    const newBallOn = Math.max(1, ballOn + yards);

    if (newBallOn >= 100 || adjOut.r === 'TD') {
      stats.tds++;
      const pts = rng() < 0.945 ? 7 : 6;
      stats.points += pts;
      if (enteredRedZone || ballOn >= 80) {
        stats.redZoneTrips++;
        stats.redZoneTds++;
      }
      return { pointsScored: pts, nextOppBallOn: 30, elapsedSec };
    }

    if (newBallOn >= 80) enteredRedZone = true;

    const gained = newBallOn - ballOn;
    ballOn = newBallOn;
    if (gained >= toGo) {
      firstDowns++;
      down = 1;
      toGo = Math.min(10, 100 - ballOn);
    } else {
      down++;
      toGo = Math.max(0.5, toGo - gained);
      if (down > 4) {
        // Turnover on downs
        if (enteredRedZone) stats.redZoneTrips++;
        return { pointsScored: 0, nextOppBallOn: Math.max(5, Math.round(100 - ballOn)), elapsedSec };
      }
    }
  }

  // Clock expired on drive
  if (enteredRedZone) stats.redZoneTrips++;
  return { pointsScored: 0, nextOppBallOn: 30, elapsedSec };
}

// Simulate ONE realistic NFL opponent drive given defensive quality adjustment (defCapBonusPpg)
function simulateOpponentDrive(
  startBallOn: number,
  defCapBonusPpg: number,
  rng: () => number
): { pointsAllowed: number; nextOffBallOn: number; elapsedSec: number } {
  // League-average NFL defense allows ~1.98 pts/drive (~21.8 PPG over 11 drives) from own 30;
  // field position shifts expected drive scoring (~0.032 pts/yard), defensive cap reinvestment lowers TD/FG rates!
  const fieldPosShift = (startBallOn - 30) * 0.011;
  const defStrengthShift = -defCapBonusPpg / 11.0; // e.g. +2.72 DefPPG -> -0.247 pts/drive allowed!
  const scale = Math.max(0.55, Math.min(1.45, 1.0 + (fieldPosShift + defStrengthShift) / 1.98));

  const pTd = Math.min(0.42, 0.215 * scale);
  const pFg = Math.min(0.28, 0.160 * (0.5 + 0.5 * scale));
  const pTo = Math.min(0.22, 0.115 / Math.max(0.75, scale));

  const r = rng();
  const elapsedSec = 135 + Math.round(rng() * 95);
  if (r < pTd) {
    return { pointsAllowed: rng() < 0.945 ? 7 : 6, nextOffBallOn: 30, elapsedSec };
  }
  if (r < pTd + pFg) {
    return { pointsAllowed: 3, nextOffBallOn: 30, elapsedSec };
  }
  if (r < pTd + pFg + pTo) {
    // Defense forces turnover -> great starting field position for offense!
    return { pointsAllowed: 0, nextOffBallOn: 42 + Math.round(rng() * 24), elapsedSec };
  }
  // Forced punt -> offense takes over around own 22..36
  return { pointsAllowed: 0, nextOffBallOn: 22 + Math.round(rng() * 14), elapsedSec };
}

// Simulate ONE full 60-minute NFL game (alternating drives + OT tiebreaker!)
function simulateFullGame(
  arch: ArchitectureSpec,
  pools: Record<string, OffensePoolBundle>,
  qb1HealthyStart: boolean,
  qb2HealthyStart: boolean,
  defCapBonusPpg: number,
  rng: () => number,
  stats: DriveStats
): {
  pf: number;
  pa: number;
  win: number;
  qb1InjuredInGame: boolean;
  qb2InjuredInGame: boolean;
} {
  let qb1Healthy = qb1HealthyStart;
  let qb2Healthy = qb2HealthyStart;
  let qb1InjuredInGame = false;
  let qb2InjuredInGame = false;

  let pf = 0;
  let pa = 0;
  let clockRemaining = 3600;
  let offHasBall = rng() < 0.5;
  let ballOn = 30;

  while (clockRemaining > 25) {
    if (offHasBall) {
      // Choose active playbook & backup penalty based on live in-game QB health!
      let activePool = pools[arch.primaryPoolId];
      let backupPen = 0;
      let haircut = arch.exoticAdaptationHaircut;
      let dualActive = arch.isDualQbOnField && qb1Healthy && qb2Healthy;

      if (arch.isDualQbOnField) {
        if (qb1Healthy && qb2Healthy) {
          activePool = pools[arch.primaryPoolId];
          backupPen = 0;
        } else if (qb1Healthy || qb2Healthy) {
          // One mobile QB out -> seamless pivot to single-QB Read-3 package with ZERO emergency collapse!
          activePool = pools[arch.oneOutPoolId];
          backupPen = arch.oneOutEpaPenalty;
          haircut = arch.exoticAdaptationHaircut * 0.5;
          dualActive = false;
        } else {
          // Emergency QB3!
          activePool = pools[arch.oneOutPoolId];
          backupPen = arch.bothOutEpaPenalty;
          haircut = 0;
          dualActive = false;
        }
      } else {
        if (!qb1Healthy) {
          activePool = pools[arch.oneOutPoolId];
          backupPen = arch.oneOutEpaPenalty;
          haircut = 0;
        }
      }

      const res = simulateOffensiveDrive(
        ballOn,
        activePool,
        backupPen,
        haircut,
        qb1Healthy,
        qb2Healthy,
        dualActive,
        clockRemaining,
        rng,
        stats,
        (whichQb) => {
          if (whichQb === 1 && qb1Healthy) {
            qb1Healthy = false;
            qb1InjuredInGame = true;
          } else if (whichQb === 2 && qb2Healthy) {
            qb2Healthy = false;
            qb2InjuredInGame = true;
          }
        }
      );
      pf += res.pointsScored;
      ballOn = res.nextOppBallOn;
      clockRemaining -= Math.max(25, res.elapsedSec);
      offHasBall = false;
    } else {
      const opp = simulateOpponentDrive(ballOn, defCapBonusPpg, rng);
      pa += opp.pointsAllowed;
      ballOn = opp.nextOffBallOn;
      clockRemaining -= Math.max(25, opp.elapsedSec);
      offHasBall = true;
    }
  }

  let win = pf > pa ? 1 : pf < pa ? 0 : 0.5;
  if (pf === pa) {
    // Simple OT coin-flip weighted by team quality
    const otProb = Math.max(0.35, Math.min(0.65, 0.5 + defCapBonusPpg * 0.015));
    if (rng() < otProb) {
      pf += 3;
      win = 1;
    } else {
      pa += 3;
      win = 0;
    }
  }

  return { pf, pa, win, qb1InjuredInGame, qb2InjuredInGame };
}

function main() {
  const poolPath = path.join(process.cwd(), 'src', 'data', 'nash_2qb_outcome_pools.json');
  if (!fs.existsSync(poolPath)) {
    throw new Error(`Missing ${poolPath} — run "npm run analyze:nash2qb" first!`);
  }
  const pools: Record<string, OffensePoolBundle> = JSON.parse(fs.readFileSync(poolPath, 'utf8'));

  const SEASONS = 500; // 500 x 17 = 8,500 complete 4-down NFL games per architecture!
  const REF_QB_CAP_M = 60.0;
  const DEF_CAP_PPG_PER_M = 0.068;

  const architectures: ArchitectureSpec[] = [
    {
      id: 'CONV11_ELITE_60M',
      label: '1. Conv-11 Spread / Elite Pocket ($55M+$5M = $60M)',
      qbRoomCapM: 60.0,
      primaryPoolId: 'CONV_11_ELITE_POCKET',
      oneOutPoolId: 'CONV_11_ELITE_POCKET',
      oneOutEpaPenalty: -0.145,
      bothOutEpaPenalty: -0.145,
      isDualQbOnField: false,
      exoticAdaptationHaircut: 0.0,
    },
    {
      id: 'SHAN12_ELITE_60M',
      label: '2. Shanahan-12 PA / Elite Pocket ($55M+$5M = $60M)',
      qbRoomCapM: 60.0,
      primaryPoolId: 'SHANAHAN_12_ELITE_POCKET',
      oneOutPoolId: 'SHANAHAN_12_ELITE_POCKET',
      oneOutEpaPenalty: -0.145,
      bothOutEpaPenalty: -0.145,
      isDualQbOnField: false,
      exoticAdaptationHaircut: 0.0,
    },
    {
      id: 'SHAN12_SUPERMAX_DUAL_60M',
      label: '3. Shanahan-12 + Read3 / Supermax Dual ($60M Room)',
      qbRoomCapM: 60.0,
      primaryPoolId: 'SHANAHAN_12_SUPERMAX_DUAL',
      oneOutPoolId: 'SHANAHAN_12_SUPERMAX_DUAL',
      oneOutEpaPenalty: -0.155,
      bothOutEpaPenalty: -0.155,
      isDualQbOnField: false,
      exoticAdaptationHaircut: 0.05,
    },
    {
      id: 'SINGLE_MID_MOBILE_23M',
      label: '4. Single Mid-Mobile + Read3 ($18M+$5M = $23M)',
      qbRoomCapM: 23.0,
      primaryPoolId: 'SHANAHAN_12_MID_MOBILE_READ3',
      oneOutPoolId: 'SHANAHAN_12_MID_MOBILE_READ3',
      oneOutEpaPenalty: -0.085,
      bothOutEpaPenalty: -0.085,
      isDualQbOnField: false,
      exoticAdaptationHaircut: 0.05,
    },
    {
      id: 'FUNGIBLE_BENCH_2QB_20M',
      label: '5. Fungible 2-QB Bench Rotation ($13.5M+$6.5M = $20M)',
      qbRoomCapM: 20.0,
      primaryPoolId: 'SHANAHAN_12_MID_MOBILE_READ3',
      oneOutPoolId: 'SHANAHAN_12_MID_MOBILE_READ3',
      oneOutEpaPenalty: -0.020,
      bothOutEpaPenalty: -0.095,
      isDualQbOnField: false,
      exoticAdaptationHaircut: 0.05,
    },
    {
      id: 'ARGON_V2_ONFIELD_2QB_20M',
      label: '6. On-Field 2-QB Chiral Split-Gun ($20M, 20% Film Haircut)',
      qbRoomCapM: 20.0,
      primaryPoolId: 'ARGON_V2_CHIRAL_2QB',
      oneOutPoolId: 'SHANAHAN_12_MID_MOBILE_READ3',
      oneOutEpaPenalty: 0.0,
      bothOutEpaPenalty: -0.095,
      isDualQbOnField: true,
      exoticAdaptationHaircut: 0.20, // Conservative 20% yardage haircut for NFL defensive film adaptation!
    },
  ];

  console.log('====================================================================================================');
  console.log(`4-DOWN DRIVE & 17-GAME FULL-SEASON MONTE CARLO (${SEASONS} SEASONS = ${SEASONS * 17} GAMES PER ARCHITECTURE)`);
  console.log('Sampling directly from 13-Defense Nash Equilibrium 20 Hz Physics Outcome Pools');
  console.log('====================================================================================================\n');

  const results: any[] = [];

  for (let aIdx = 0; aIdx < architectures.length; aIdx++) {
    const arch = architectures[aIdx];
    const rng = createRng(202700 + aIdx * 1009);
    const defCapBonusPpg = +((REF_QB_CAP_M - arch.qbRoomCapM) * DEF_CAP_PPG_PER_M).toFixed(2);

    const stats: DriveStats = {
      drives: 0,
      plays: 0,
      tds: 0,
      fgs: 0,
      punts: 0,
      threeAndOuts: 0,
      turnovers: 0,
      sacks: 0,
      ints: 0,
      fumblesLost: 0,
      points: 0,
      redZoneTrips: 0,
      redZoneTds: 0,
      qb1Hits: 0,
      qb2Hits: 0,
    };

    let totPf = 0;
    let totPa = 0;
    let totWins = 0;
    let playoffs = 0;
    let superBowls = 0;
    let qb1HealthyGamesTot = 0;
    let qb2HealthyGamesTot = 0;
    let bothHealthyGamesTot = 0;
    let atLeastOneHealthyTot = 0;

    const rollRecoveryWeeks = (): number => {
      const r = rng();
      if (r < 0.12) return 18; // Season-ending injury (~12% of QB injuries)
      return 1 + Math.floor(rng() * 5); // 1 to 5 weeks missed
    };

    for (let s = 0; s < SEASONS; s++) {
      let qb1OutWeeks = 0;
      let qb2OutWeeks = 0;
      let seasonWins = 0;

      for (let g = 0; g < 17; g++) {
        const qb1Ok = qb1OutWeeks === 0;
        const qb2Ok = qb2OutWeeks === 0;
        if (qb1Ok) qb1HealthyGamesTot++;
        if (qb2Ok) qb2HealthyGamesTot++;
        if (qb1Ok && qb2Ok) bothHealthyGamesTot++;
        if (qb1Ok || qb2Ok) atLeastOneHealthyTot++;

        const game = simulateFullGame(arch, pools, qb1Ok, qb2Ok, defCapBonusPpg, rng, stats);
        totPf += game.pf;
        totPa += game.pa;
        seasonWins += game.win;

        if (qb1OutWeeks > 0) qb1OutWeeks--;
        if (qb2OutWeeks > 0) qb2OutWeeks--;
        if (game.qb1InjuredInGame) qb1OutWeeks = Math.max(qb1OutWeeks, rollRecoveryWeeks());
        if (game.qb2InjuredInGame) qb2OutWeeks = Math.max(qb2OutWeeks, rollRecoveryWeeks());
      }

      totWins += seasonWins;
      // Realistic NFL 7-team-per-conference playoff qualification (~10+ wins, or 50% at 9 wins)
      const madePlayoffs = seasonWins >= 10 || (seasonWins >= 9 && rng() < 0.45);
      if (madePlayoffs) {
        playoffs++;
        // 4-round NFL Playoff Bracket (3 rounds if #1 seed at 13+ wins!) against strong playoff opponents (+2.5 PPG)
        const roundsNeeded = seasonWins >= 13 ? 3 : 4;
        let alive = true;
        for (let rd = 0; rd < roundsNeeded && alive; rd++) {
          const poDefBonus = defCapBonusPpg - 2.4; // Playoff opponents score +2.4 PPG more than league average
          const poStats: DriveStats = {
            drives: 0, plays: 0, tds: 0, fgs: 0, punts: 0, threeAndOuts: 0,
            turnovers: 0, sacks: 0, ints: 0, fumblesLost: 0, points: 0,
            redZoneTrips: 0, redZoneTds: 0, qb1Hits: 0, qb2Hits: 0,
          };
          const poGame = simulateFullGame(
            arch,
            pools,
            qb1OutWeeks === 0,
            qb2OutWeeks === 0,
            poDefBonus,
            rng,
            poStats
          );
          if (poGame.win < 1) alive = false;
          if (qb1OutWeeks > 0) qb1OutWeeks--;
          if (qb2OutWeeks > 0) qb2OutWeeks--;
          if (poGame.qb1InjuredInGame) qb1OutWeeks = Math.max(qb1OutWeeks, rollRecoveryWeeks());
          if (poGame.qb2InjuredInGame) qb2OutWeeks = Math.max(qb2OutWeeks, rollRecoveryWeeks());
        }
        if (alive) superBowls++;
      }
    }

    const totGames = SEASONS * 17;
    const pfG = +(totPf / totGames).toFixed(2);
    const paG = +(totPa / totGames).toFixed(2);
    const diffG = +(pfG - paG).toFixed(2);
    const avgWins = +(totWins / SEASONS).toFixed(2);
    const playoffPct = +((playoffs / SEASONS) * 100).toFixed(1);
    const sbPct = +((superBowls / SEASONS) * 100).toFixed(1);

    const ppd = +(stats.points / stats.drives).toFixed(2);
    const tdPct = +((stats.tds / stats.drives) * 100).toFixed(1);
    const puntPct = +((stats.punts / stats.drives) * 100).toFixed(1);
    const threeOutPct = +((stats.threeAndOuts / stats.drives) * 100).toFixed(1);
    const toPct = +((stats.turnovers / stats.drives) * 100).toFixed(1);
    const rzTdPct = stats.redZoneTrips > 0 ? +((stats.redZoneTds / stats.redZoneTrips) * 100).toFixed(1) : 0;
    const sackPlayPct = +((stats.sacks / stats.plays) * 100).toFixed(2);
    const playsPerGame = +(stats.plays / totGames).toFixed(1);

    const qb1G = +(qb1HealthyGamesTot / SEASONS).toFixed(2);
    const qb2G = +(qb2HealthyGamesTot / SEASONS).toFixed(2);
    const bothG = +(bothHealthyGamesTot / SEASONS).toFixed(2);
    const ge1G = +(atLeastOneHealthyTot / SEASONS).toFixed(2);
    const qb1HitsYr = +(stats.qb1Hits / SEASONS).toFixed(1);
    const qb2HitsYr = +(stats.qb2Hits / SEASONS).toFixed(1);

    console.log(`${arch.label}`);
    console.log(
      `  Season: PF=${pfG.toFixed(1)} | PA=${paG.toFixed(1)} (DefCap +${defCapBonusPpg.toFixed(2)}) | Diff=${diffG >= 0 ? '+' : ''}${diffG.toFixed(1)} | Wins=${avgWins.toFixed(2)}/17 | Playoff=${playoffPct}% | SuperBowl=${sbPct}%`
    );
    console.log(
      `  Drives: PPD=${ppd.toFixed(2)} | TD=${tdPct}% | Punt=${puntPct}% | 3&Out=${threeOutPct}% | TO=${toPct}% | RZ_TD=${rzTdPct}% | Sack/Pl=${sackPlayPct}% | Pl/G=${playsPerGame}`
    );
    console.log(
      `  Health: QB1_G=${qb1G.toFixed(1)} (${qb1HitsYr} hits/yr) | QB2_G=${qb2G.toFixed(1)} (${qb2HitsYr} hits/yr) | Both_G=${bothG.toFixed(1)} | >=1_Starter_G=${ge1G.toFixed(1)}\n`
    );

    results.push({
      id: arch.id,
      label: arch.label,
      qbRoomCapM: arch.qbRoomCapM,
      defCapBonusPpg,
      exoticAdaptationHaircut: arch.exoticAdaptationHaircut,
      season: { pfG, paG, diffG, avgWins, playoffPct, sbPct },
      drives: { ppd, tdPct, puntPct, threeOutPct, toPct, rzTdPct, sackPlayPct, playsPerGame },
      health: { qb1G, qb2G, bothG, ge1G, qb1HitsYr, qb2HitsYr },
    });
  }

  const outPath = path.join(process.cwd(), 'src', 'data', 'season_4down_monte_carlo_report.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), seasonsPerArch: SEASONS, results }, null, 2),
    'utf8'
  );
  console.log(`[SAVED] ${outPath}`);
}

main();
