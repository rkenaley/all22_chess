import {
  PlayerConfig,
  DefScheme,
  DefFront,
  DefensiveCall,
  MatchupPreset,
  MatchupPresetId,
  clonePlay,
  createTheoreticalOptimumOffense,
} from './engine';
import rawTeamsData from './data/nfl_teams_32.json';

export interface NflTeam {
  id: string;
  name: string;
  city: string;
  fullName: string;
  conf: 'AFC' | 'NFC';
  div: string;
  defScheme: DefScheme;
  defFront: DefFront;
  tacticalBrief: string;
  offense: PlayerConfig[];
  defense: PlayerConfig[];
  getOffense: () => PlayerConfig[];
  getDefense: () => PlayerConfig[];
}

const teamsRecord: Record<string, NflTeam> = {};

for (const [code, raw] of Object.entries(rawTeamsData as Record<string, any>)) {
  teamsRecord[code] = {
    id: raw.id,
    name: raw.name,
    city: raw.city,
    fullName: raw.fullName,
    conf: raw.conf,
    div: raw.div,
    defScheme: raw.defScheme as DefScheme,
    defFront: raw.defFront as DefFront,
    tacticalBrief: raw.tacticalBrief,
    offense: raw.offense,
    defense: raw.defense,
    getOffense: () => clonePlay(raw.offense),
    getDefense: () => clonePlay(raw.defense),
  };
}

export const NFL_32_TEAMS: Record<string, NflTeam> = teamsRecord;

export function getAllNflTeamCodes(): string[] {
  return Object.keys(NFL_32_TEAMS);
}

export function getNflTeam(code: string): NflTeam {
  const team = NFL_32_TEAMS[code] || NFL_32_TEAMS['PHI'];
  return team;
}

// Compute League Average Synthetic Benchmark Team (50th percentile of all 32 NFL starters by position)
export function getLeagueAverageOffense(): PlayerConfig[] {
  const allOffenses = Object.values(NFL_32_TEAMS).map((t) => t.offense);
  const sample = clonePlay(allOffenses[0]);

  for (let pIdx = 0; pIdx < sample.length; pIdx++) {
    const player = sample[pIdx];
    player.name = `NFL Average ${player.label}`;

    // Average the ratings across all 32 teams for this position slot
    const ratingKeys = Object.keys(player.ratings) as (keyof typeof player.ratings)[];
    for (const k of ratingKeys) {
      let sum = 0;
      for (const off of allOffenses) {
        sum += off[pIdx]?.ratings[k] || 80;
      }
      (player.ratings as any)[k] = Math.round(sum / allOffenses.length);
    }

    if (player.scouting) {
      player.scouting.ovr = Math.round(
        allOffenses.reduce((acc, off) => acc + (off[pIdx]?.scouting?.ovr || 82), 0) / allOffenses.length
      );
      player.scouting.scoutingReport = `Synthetic 50th-percentile benchmark aggregated across all 32 starting NFL ${player.label}s.`;
      player.scouting.ngsMetricLabel = `NFL League Median Starter (${player.scouting.ovr} OVR)`;
    }
  }

  return sample;
}

export function getLeagueAverageDefense(): PlayerConfig[] {
  const allDefenses = Object.values(NFL_32_TEAMS).map((t) => t.defense);
  const sample = clonePlay(allDefenses[0]);

  for (let pIdx = 0; pIdx < sample.length; pIdx++) {
    const player = sample[pIdx];
    player.name = `NFL Average ${player.label}`;

    const ratingKeys = Object.keys(player.ratings) as (keyof typeof player.ratings)[];
    for (const k of ratingKeys) {
      let sum = 0;
      for (const def of allDefenses) {
        sum += def[pIdx]?.ratings[k] || 80;
      }
      (player.ratings as any)[k] = Math.round(sum / allDefenses.length);
    }

    if (player.scouting) {
      player.scouting.ovr = Math.round(
        allDefenses.reduce((acc, def) => acc + (def[pIdx]?.scouting?.ovr || 82), 0) / allDefenses.length
      );
      player.scouting.scoutingReport = `Synthetic 50th-percentile benchmark aggregated across all 32 starting NFL defensive ${player.label}s.`;
      player.scouting.ngsMetricLabel = `NFL League Median Starter (${player.scouting.ovr} OVR)`;
    }
  }

  return sample;
}

export function buildCustomMatchup(offTeamCode: string, defTeamCode: string): MatchupPreset {
  const offTeam = offTeamCode === 'AVG' ? null : getNflTeam(offTeamCode);
  const defTeam = defTeamCode === 'AVG' ? null : getNflTeam(defTeamCode);

  const offenseName = offTeam ? offTeam.fullName : 'NFL Average Offense';
  const defenseName = defTeam ? defTeam.fullName : 'NFL Average Defense';

  return {
    id: `${offTeamCode}_VS_${defTeamCode}` as MatchupPresetId,
    label: `${offTeamCode} vs ${defTeamCode}`,
    offenseName,
    defenseName,
    getOffense: offTeam ? () => offTeam.getOffense() : getLeagueAverageOffense,
    getDefense: defTeam ? () => defTeam.getDefense() : getLeagueAverageDefense,
    primaryDefCall: defTeam ? (defTeam.defScheme as DefensiveCall) : 'COV3_SKY',
    primaryDefFront: defTeam ? defTeam.defFront : 'OVER',
    tacticalBrief: offTeam && defTeam
      ? `${offTeam.fullName} (${offTeam.tacticalBrief}) takes on ${defTeam.fullName} (${defTeam.tacticalBrief}).`
      : 'Custom matchup with synthetic league-wide baseline data.',
  };
}

// Complete set of curated marquee matchups + synthetic league benchmark
export const ALL_PRESET_MATCHUPS: Record<string, MatchupPreset> = {
  NFL_AVERAGE: {
    id: 'NFL_AVERAGE' as MatchupPresetId,
    label: '★ NFL League-Wide Average (Synthetic 50th %ile)',
    offenseName: 'NFL Average Offense',
    defenseName: 'NFL Average Defense',
    getOffense: getLeagueAverageOffense,
    getDefense: getLeagueAverageDefense,
    primaryDefCall: 'MIXED',
    primaryDefFront: 'OVER',
    tacticalBrief: 'Synthetic 50th-percentile benchmark aggregated across all 32 NFL teams for true, unbiased league-wide baseline simulation.',
  },
  PHI_VS_JAX: {
    id: 'PHI_VS_JAX' as MatchupPresetId,
    label: 'PHI vs JAX [Baseline]',
    offenseName: 'Philadelphia Eagles',
    defenseName: 'Jacksonville Jaguars',
    getOffense: () => getNflTeam('PHI').getOffense(),
    getDefense: () => getNflTeam('JAX').getDefense(),
    primaryDefCall: 'MIXED',
    primaryDefFront: 'OVER',
    tacticalBrief: 'Eagles elite trench line and Saquon/A.J. Brown face Hines-Allen and Campbell in a balanced matchup.',
  },
  PHI_VS_KC: {
    id: 'PHI_VS_KC' as MatchupPresetId,
    label: 'PHI vs KC [Super Bowl Rematch]',
    offenseName: 'Philadelphia Eagles',
    defenseName: 'Kansas City Chiefs',
    getOffense: () => getNflTeam('PHI').getOffense(),
    getDefense: () => getNflTeam('KC').getDefense(),
    primaryDefCall: 'FIRE_ZONE_3',
    primaryDefFront: 'OVER',
    tacticalBrief: 'Steve Spagnuolo\'s exotic simulated pressures and Trent McDuffie test Hurts against Chris Jones.',
  },
  PHI_VS_BAL: {
    id: 'PHI_VS_BAL' as MatchupPresetId,
    label: 'PHI vs BAL [Heavyweight Clash]',
    offenseName: 'Philadelphia Eagles',
    defenseName: 'Baltimore Ravens',
    getOffense: () => getNflTeam('PHI').getOffense(),
    getDefense: () => getNflTeam('BAL').getDefense(),
    primaryDefCall: 'COV4_QUARTERS',
    primaryDefFront: 'UNDER',
    tacticalBrief: 'Kyle Hamilton and Roquan Smith disguise coverages to challenge RPOs and intermediate dig routes.',
  },
  DET_VS_SF: {
    id: 'DET_VS_SF' as MatchupPresetId,
    label: 'DET vs SF [NFC Title Rematch]',
    offenseName: 'Detroit Lions',
    defenseName: 'San Francisco 49ers',
    getOffense: () => getNflTeam('DET').getOffense(),
    getDefense: () => getNflTeam('SF').getDefense(),
    primaryDefCall: 'COV2_TAMPA',
    primaryDefFront: 'WIDE_9',
    tacticalBrief: 'Dan Campbell power game with Sewell and Montgomery challenges Fred Warner, Bosa, and SF pass defense.',
  },
  KC_VS_SF: {
    id: 'KC_VS_SF' as MatchupPresetId,
    label: 'KC vs SF [Super Bowl LVIII Rematch]',
    offenseName: 'Kansas City Chiefs',
    defenseName: 'San Francisco 49ers',
    getOffense: () => getNflTeam('KC').getOffense(),
    getDefense: () => getNflTeam('SF').getDefense(),
    primaryDefCall: 'COV2_TAMPA',
    primaryDefFront: 'WIDE_9',
    tacticalBrief: 'Patrick Mahomes and Travis Kelce duel Fred Warner, Nick Bosa, and the 49ers zone coverage.',
  },
  BAL_VS_KC: {
    id: 'BAL_VS_KC' as MatchupPresetId,
    label: 'BAL vs KC [AFC Championship Rematch]',
    offenseName: 'Baltimore Ravens',
    defenseName: 'Kansas City Chiefs',
    getOffense: () => getNflTeam('BAL').getOffense(),
    getDefense: () => getNflTeam('KC').getDefense(),
    primaryDefCall: 'FIRE_ZONE_3',
    primaryDefFront: 'OVER',
    tacticalBrief: 'Lamar Jackson and Derrick Henry face Spagnuolo\'s disguised simulated pressures and blitzes.',
  },
  BUF_VS_KC: {
    id: 'BUF_VS_KC' as MatchupPresetId,
    label: 'BUF vs KC [Playoff Shootout]',
    offenseName: 'Buffalo Bills',
    defenseName: 'Kansas City Chiefs',
    getOffense: () => getNflTeam('BUF').getOffense(),
    getDefense: () => getNflTeam('KC').getDefense(),
    primaryDefCall: 'FIRE_ZONE_3',
    primaryDefFront: 'OVER',
    tacticalBrief: 'Josh Allen\'s cannon arm and power rushing test the Chiefs interior front.',
  },
  DET_VS_GB: {
    id: 'DET_VS_GB' as MatchupPresetId,
    label: 'DET vs GB [NFC North Rivalry]',
    offenseName: 'Detroit Lions',
    defenseName: 'Green Bay Packers',
    getOffense: () => getNflTeam('DET').getOffense(),
    getDefense: () => getNflTeam('GB').getDefense(),
    primaryDefCall: 'COV4_QUARTERS',
    primaryDefFront: 'OVER',
    tacticalBrief: 'Jared Goff and Amon-Ra St. Brown battle Jeff Hafley\'s aggressive quarters coverage.',
  },
  HOU_VS_BAL: {
    id: 'HOU_VS_BAL' as MatchupPresetId,
    label: 'HOU vs BAL [AFC Contenders]',
    offenseName: 'Houston Texans',
    defenseName: 'Baltimore Ravens',
    getOffense: () => getNflTeam('HOU').getOffense(),
    getDefense: () => getNflTeam('BAL').getDefense(),
    primaryDefCall: 'COV1_ROBBER',
    primaryDefFront: 'OVER',
    tacticalBrief: 'C.J. Stroud pocket poise and Nico Collins deep speed vs Kyle Hamilton and Roquan Smith.',
  },
  WAS_VS_PHI: {
    id: 'WAS_VS_PHI' as MatchupPresetId,
    label: 'WAS vs PHI [NFC East Clash]',
    offenseName: 'Washington Commanders',
    defenseName: 'Philadelphia Eagles',
    getOffense: () => getNflTeam('WAS').getOffense(),
    getDefense: () => getNflTeam('PHI').getDefense(),
    primaryDefCall: 'COV4_QUARTERS',
    primaryDefFront: 'OVER',
    tacticalBrief: 'Jayden Daniels electric dual-threat creation tests Vic Fangio\'s quarters coverage.',
  },
  CIN_VS_BAL: {
    id: 'CIN_VS_BAL' as MatchupPresetId,
    label: 'CIN vs BAL [AFC North Shootout]',
    offenseName: 'Cincinnati Bengals',
    defenseName: 'Baltimore Ravens',
    getOffense: () => getNflTeam('CIN').getOffense(),
    getDefense: () => getNflTeam('BAL').getDefense(),
    primaryDefCall: 'COV1_ROBBER',
    primaryDefFront: 'OVER',
    tacticalBrief: 'Joe Burrow and Ja\'Marr Chase test Marlon Humphrey and the Ravens secondary.',
  },
  DAL_VS_SF: {
    id: 'DAL_VS_SF' as MatchupPresetId,
    label: 'DAL vs SF [Playoff Rivalry]',
    offenseName: 'Dallas Cowboys',
    defenseName: 'San Francisco 49ers',
    getOffense: () => getNflTeam('DAL').getOffense(),
    getDefense: () => getNflTeam('SF').getDefense(),
    primaryDefCall: 'COV2_TAMPA',
    primaryDefFront: 'WIDE_9',
    tacticalBrief: 'Dak Prescott and CeeDee Lamb attack the deep seams against Fred Warner and Talanoa Hufanga.',
  },
  THEO_VS_LEAGUE: {
    id: 'THEO_VS_LEAGUE' as MatchupPresetId,
    label: '⚡ THEO (Pet Optimum Off) vs NFL Average (Def)',
    offenseName: 'Theoretical Optimum Offense (6OL / 2-Insert)',
    defenseName: 'NFL Average Defense (Base 4-3 Counter)',
    getOffense: createTheoreticalOptimumOffense,
    getDefense: getLeagueAverageDefense,
    primaryDefCall: 'COV2_TAMPA',
    primaryDefFront: 'OVER',
    tacticalBrief:
      '6 OL + 2 hybrid insert utility players force Base 4-3 defense. 6\'4" contested WRs force 2-high safeties, leaving an 8 vs 7 box advantage for +1 QB Power and perimeter sweeps.',
  },
  THEO_VS_BAL: {
    id: 'THEO_VS_BAL' as MatchupPresetId,
    label: '⚡ THEO vs BAL [Heavyweight Front vs Roquan Smith]',
    offenseName: 'Theoretical Optimum Offense (6OL / 2-Insert)',
    defenseName: 'Baltimore Ravens (Base 4-3 / Trenton Simpson)',
    getOffense: createTheoreticalOptimumOffense,
    getDefense: () => getNflTeam('BAL').getDefense(),
    primaryDefCall: 'COV1_ROBBER',
    primaryDefFront: 'OVER',
    tacticalBrief:
      'Pet optimum heavy offense attacks Baltimore\'s downhill linebackers with Pin-Pull perimeter toss and play-action bootlegs.',
  },
  THEO_VS_KC: {
    id: 'THEO_VS_KC' as MatchupPresetId,
    label: '⚡ THEO vs KC [Anti-Blitz Test vs Spagnuolo]',
    offenseName: 'Theoretical Optimum Offense (6OL / 2-Insert)',
    defenseName: 'Kansas City Chiefs (Leo Chenal / Blitz Front)',
    getOffense: createTheoreticalOptimumOffense,
    getDefense: () => getNflTeam('KC').getDefense(),
    primaryDefCall: 'FIRE_ZONE_3',
    primaryDefFront: 'MUG_A',
    tacticalBrief:
      'Spagnuolo brings simulated pressures and Cover 0 blitzes; H-Insert and F-Insert chip-release through B/C gaps into vacated middle-field holes.',
  },
  THEO_VS_SF: {
    id: 'THEO_VS_SF' as MatchupPresetId,
    label: '⚡ THEO vs SF [Space Conflict vs Fred Warner & Wide-9]',
    offenseName: 'Theoretical Optimum Offense (6OL / 2-Insert)',
    defenseName: 'San Francisco 49ers (Base 4-3 / Dee Winters)',
    getOffense: createTheoreticalOptimumOffense,
    getDefense: () => getNflTeam('SF').getDefense(),
    primaryDefCall: 'COV2_TAMPA',
    primaryDefFront: 'WIDE_9',
    tacticalBrief:
      'Wide-9 edge rushers and Fred Warner are tested laterally by pre-snap motion tells and 8-blocker interior gap power.',
  },
};
