import {
  SimAgent,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
  Waypoint2D,
} from './engine';

export type HydraSituationTag = '1ST_10' | '3RD_SHORT' | '3RD_LONG' | 'RED_ZONE';
export type HydraMenuBucket =
  | 'OPEN_FIELD'
  | 'THIRD_LONG'
  | 'TWO_MINUTE'
  | 'FOUR_MINUTE'
  | 'GOAL_LINE';

export interface HydraRosterPlayer {
  slotKey: string;
  name: string;
  pos: string;
  jersey: number;
  capHitM: number; // 2027 projected AAV in $ Millions
  archetype: string;
  inefficiencyThesis: string;
  throwerRating: number; // 40-99 passing skill
  blockRating: number; // 40-99 contact/trench blocking skill (distinct from ballcarrier leg-drive power!)
  ratings: {
    speed: number;
    accel: number;
    power: number;
    finesse: number;
    awareness: number;
  };
}

export interface HydraPlayDefinition {
  id: string;
  name: string;
  category: 'PASS' | 'RUN';
  personnel: string;
  situations: HydraSituationTag[];
  situationBadge: string;
  menuBuckets: HydraMenuBucket[];
  legalMechanic: string;
  optionalityBranches: string;
  buildOffense: () => SimAgent[];
}

// ============================================================================
// 1. THE 2027 HYDRA VANGUARD ROSTER ($85.5M ACTIVE 11-STARTER OFFENSIVE CAP)
//    Zero All-Pros | Zero Contracts > $14.5M | 5 Pass-Capable Athletes on Roster
//    Features Philadelphia Eagles 2026 Draft Hybrids: Eli Stowers (TE/QB) & Cole Payton (QB2)
// ============================================================================
export const HYDRA_2027_ROSTER: Record<string, HydraRosterPlayer> = {
  QB1_FIELDS: {
    slotKey: 'QB',
    name: 'Justin Fields',
    pos: 'QB',
    jersey: 2,
    capHitM: 11.0,
    archetype: 'Dual-Threat Power Runner / Deep-Shot Trigger',
    inefficiencyThesis:
      'Discounted (~$44M cheaper than franchise pocket QBs) due to slow 4-read full-field dropback processing; elite 4.44 speed (228 lbs, 86 runner power) + top-quartile deep velocity thrive in binary RPOs, direct-snap runs, and 7-man Max-Protect shots (never asked to block a DE/LB; uses post-toss option-boot fakes).',
    throwerRating: 85,
    blockRating: 46,
    ratings: { speed: 91, accel: 92, power: 86, finesse: 85, awareness: 77 },
  },
  QB2_WILLIS: {
    slotKey: 'RB',
    name: 'Cole Payton',
    pos: 'QB', // Aligns in Split-Pony backfield / Slash QB2 (uses option-fake freeze rather than 1v1 blocking)
    jersey: 18,
    capHitM: 1.1,
    archetype: 'Eagles 5th-Rd Lefty Dual-Threat Pony QB2 (6\'3" 232 lbs, 4.56 40)',
    inefficiencyThesis:
      '2026 Eagles 5th-round rookie contract ($1.1M) unlocks a 6\'3" 232-lb left-handed NDSU dual-threat passer/runner (SPD 89, PWR 86, ARM 82) in Split-Pony sets — freezing backside DEs via option-keep/bootleg geometry rather than suicidal 1v1 QB blocking.',
    throwerRating: 82,
    blockRating: 48,
    ratings: { speed: 89, accel: 91, power: 86, finesse: 84, awareness: 79 },
  },
  WR1_MEYERS: {
    slotKey: 'WR1',
    name: 'Jakobi Meyers',
    pos: 'WR',
    jersey: 16,
    capHitM: 11.0,
    archetype: 'Converted College QB / Option Trigger & Hook-Pitch Hub',
    inefficiencyThesis:
      'Former NC State quarterback with multiple career NFL completions/TD passes, 98th-percentile sure hands, high route IQ, and solid perimeter stalk blocking (BLK 68) — triggers WR Jet Sweep Double Option, Backward Screen Double Pass, and Hook & Lateral.',
    throwerRating: 83,
    blockRating: 68,
    ratings: { speed: 88, accel: 90, power: 74, finesse: 88, awareness: 88 },
  },
  WR2_JENNINGS: {
    slotKey: 'SL',
    name: 'Jauan Jennings',
    pos: 'SL',
    jersey: 15,
    capHitM: 8.0,
    archetype: 'Heavy-Slot Enforcer / Former HS QB (SB LVIII TD Passer)',
    inefficiencyThesis:
      'Stalk-blocks nickel DBs and safeties like a move-TE (BLK 76, PWR 81) while offering 3rd-down contested catch reliability and double-pass capability at a mid-tier WR3 cap hit.',
    throwerRating: 79,
    blockRating: 76,
    ratings: { speed: 85, accel: 87, power: 81, finesse: 86, awareness: 87 },
  },
  WR3_SHAHEED: {
    slotKey: 'WR2',
    name: 'Rashid Shaheed',
    pos: 'WR',
    jersey: 22,
    capHitM: 6.5,
    archetype: '4.33 Deep Take-Off Lid-Lifter & Hook-and-Lateral Trailer',
    inefficiencyThesis:
      'Undrafted returner/vertical specialist priced under $7M who forces 2-high safety depth on every snap and hits 9.4 yd/s as the trailing pitch option on choreographed downfield laterals.',
    throwerRating: 55,
    blockRating: 52,
    ratings: { speed: 96, accel: 95, power: 64, finesse: 84, awareness: 84 },
  },
  TE1_WASHINGTON: {
    slotKey: 'TE',
    name: 'Darnell Washington',
    pos: 'TE',
    jersey: 80,
    capHitM: 2.5,
    archetype: '6\'7" 275-lb Eligible 6th Offensive Tackle / Seam Pop Threat',
    inefficiencyThesis:
      'Undervalued in fantasy-driven TE markets; provides true Offensive Tackle edge-sealing force (BLK 91, PWR 90) while wearing an eligible number to punish heavy boxes on seam leaks and goal-line pop passes.',
    throwerRating: 48,
    blockRating: 91,
    ratings: { speed: 81, accel: 83, power: 90, finesse: 79, awareness: 82 },
  },
  TE2_KRAFT: {
    slotKey: 'TE2',
    name: 'Eli Stowers',
    pos: 'TE',
    jersey: 85,
    capHitM: 1.9,
    archetype: 'Eagles 2nd-Rd TE/QB Hybrid (6\'4" 239 lbs, Former Texas A&M QB & Mackey TE)',
    inefficiencyThesis:
      '2026 Eagles 2nd-round pick (#54 overall, $1.9M): former college QB turned Mackey Award TE with a 45.5" vertical (SPD 90) who delivers competent H-Back/Move-TE blocks (BLK 82) on split-flow, lead-pull, and blitz-scan assignments while also throwing (ARM 79).',
    throwerRating: 79,
    blockRating: 82,
    ratings: { speed: 90, accel: 92, power: 83, finesse: 88, awareness: 85 },
  },
  LT_RAIMANN: {
    slotKey: 'LT',
    name: 'Bernhard Raimann',
    pos: 'LT',
    jersey: 79,
    capHitM: 14.5,
    archetype: 'Converted-TE Athletic Blindside Tackle',
    inefficiencyThesis:
      'Former tight end with elite lateral agility for perimeter screen/sweep pulls and half-slide anchor at ~$12M below top-of-market LT resets.',
    throwerRating: 40,
    blockRating: 87,
    ratings: { speed: 77, accel: 83, power: 86, finesse: 88, awareness: 87 },
  },
  LG_BECTON: {
    slotKey: 'LG',
    name: 'Mekhi Becton',
    pos: 'LG',
    jersey: 77,
    capHitM: 8.5,
    archetype: '363-lb Tackle-to-Guard Displacement Mauler',
    inefficiencyThesis:
      'Failed LT market discount reclaimed at Guard: massive mass (BLK 93) + straight-line pull momentum obliterates 175-205 lb Nickel/Dime DBs in space.',
    throwerRating: 40,
    blockRating: 93,
    ratings: { speed: 74, accel: 79, power: 92, finesse: 81, awareness: 83 },
  },
  C_BREWER: {
    slotKey: 'C',
    name: 'Aaron Brewer',
    pos: 'C',
    jersey: 55,
    capHitM: 7.0,
    archetype: '4.95-Speed Pin-and-Pull Specialist Center',
    inefficiencyThesis:
      'Discounted for sub-300-lb frame in traditional dropback offenses, but 99th-percentile Center speed (SPD 80, ACC 86, BLK 84) lets him outrun linebackers to the perimeter on Pin-Pull & Jet Double Options.',
    throwerRating: 40,
    blockRating: 84,
    ratings: { speed: 80, accel: 86, power: 82, finesse: 88, awareness: 87 },
  },
  RG_PUNI: {
    slotKey: 'RG',
    name: 'Dominick Puni',
    pos: 'RG',
    jersey: 77,
    capHitM: 1.4,
    archetype: 'Day-2 Rookie-Contract Combo/Pull Guard',
    inefficiencyThesis:
      'Rookie wage-scale interior OL surplus value ($1.4M vs $20M veteran guard market) with balanced combo-climb and pull-wrap mechanics (BLK 86).',
    throwerRating: 40,
    blockRating: 86,
    ratings: { speed: 75, accel: 82, power: 86, finesse: 85, awareness: 85 },
  },
  RT_BROWN: {
    slotKey: 'RT',
    name: 'Spencer Brown',
    pos: 'RT',
    jersey: 79,
    capHitM: 14.0,
    archetype: '6\'8" 311-lb 10.0-RAS Strongside Wall',
    inefficiencyThesis:
      'Elite size-athleticism profile (BLK 90) next to 6\'7" Darnell Washington forms a 600-lb strongside Duo/Pin-Pull surface at mid-tier RT cost.',
    throwerRating: 40,
    blockRating: 90,
    ratings: { speed: 77, accel: 83, power: 90, finesse: 84, awareness: 85 },
  },
};

// Active 11-player core cap calculation ($85.5M max 11 starters on field; $87.4M full 12-man Hydra package)
export const HYDRA_ACTIVE_11_CAP_M = 85.5;

// Workstation-compatible team entry for #off-team-select / #def-team-select
export const HYDRA_2027_TEAM_ENTRY = {
  id: 'HYD',
  city: '2027 Moneyball',
  name: 'Hydra Vanguard ($85.5M)',
  fullName: '2027 Hydra Vanguard ($85.5M Philly-Hybrid Moneyball)',
  offense: [
    {
      id: 'QB',
      label: 'QB',
      name: 'Justin Fields',
      scouting: { jersey: 2, ovr: 79 },
      ratings: { spd: 91, acc: 92, str: 84, btk_power: 88, agi: 88, tha_short: 83, pre_snap_read: 77 },
    },
    {
      id: 'RB',
      label: 'RB',
      name: 'Cole Payton (QB2) / Eli Stowers (TE-QB)',
      scouting: { jersey: 18, ovr: 80 },
      ratings: { spd: 89, acc: 91, str: 83, btk_power: 86, agi: 89, elusiveness: 84, pre_snap_read: 82 },
    },
    {
      id: 'WR1',
      label: 'WR',
      name: 'Jakobi Meyers (QB-WR)',
      scouting: { jersey: 16, ovr: 86 },
      ratings: { spd: 88, acc: 90, str: 72, rbk_power: 76, agi: 88, rr_short: 89, pre_snap_read: 88 },
    },
    {
      id: 'WR2',
      label: 'WR',
      name: 'Rashid Shaheed',
      scouting: { jersey: 22, ovr: 84 },
      ratings: { spd: 96, acc: 95, str: 62, rbk_power: 65, agi: 90, rr_short: 80, pre_snap_read: 84 },
    },
    {
      id: 'SLOT',
      label: 'SL',
      name: 'Eli Stowers (TE-QB) / Jauan Jennings',
      scouting: { jersey: 85, ovr: 84 },
      ratings: { spd: 90, acc: 92, str: 82, rbk_power: 84, agi: 88, rr_short: 87, pre_snap_read: 86 },
    },
    {
      id: 'TE',
      label: 'TE',
      name: 'Darnell Washington',
      scouting: { jersey: 80, ovr: 82 },
      ratings: { spd: 81, acc: 83, str: 91, rbk_power: 91, agi: 77, rr_short: 80, pre_snap_read: 82 },
    },
    {
      id: 'LT',
      label: 'LT',
      name: 'Bernhard Raimann',
      scouting: { jersey: 79, ovr: 87 },
      ratings: { spd: 77, acc: 83, str: 85, pbk_anchor: 87, rbk_power: 86, agi: 82, pbk_lateral: 90, rbk_reach: 90 },
    },
    {
      id: 'LG',
      label: 'LG',
      name: 'Mekhi Becton',
      scouting: { jersey: 77, ovr: 83 },
      ratings: { spd: 74, acc: 79, str: 94, pbk_anchor: 89, rbk_power: 93, agi: 73, pbk_lateral: 83, rbk_reach: 84 },
    },
    {
      id: 'C',
      label: 'C',
      name: 'Aaron Brewer',
      scouting: { jersey: 55, ovr: 87 },
      ratings: { spd: 80, acc: 86, str: 80, pbk_anchor: 82, rbk_power: 84, agi: 85, pbk_lateral: 89, rbk_reach: 90 },
    },
    {
      id: 'RG',
      label: 'RG',
      name: 'Dominick Puni',
      scouting: { jersey: 77, ovr: 85 },
      ratings: { spd: 75, acc: 82, str: 86, pbk_anchor: 86, rbk_power: 86, agi: 79, pbk_lateral: 87, rbk_reach: 87 },
    },
    {
      id: 'RT',
      label: 'RT',
      name: 'Spencer Brown',
      scouting: { jersey: 79, ovr: 85 },
      ratings: { spd: 77, acc: 83, str: 91, pbk_anchor: 88, rbk_power: 91, agi: 78, pbk_lateral: 86, rbk_reach: 87 },
    },
  ],
  // Cap-Reinvested Top-5 Defense funded by ~$60M-$86M offensive cap savings
  defense: [
    { id: 'LDE', label: 'DE', name: 'Reinvested Edge1', scouting: { jersey: 91, ovr: 89 }, ratings: { spd: 86, acc: 89, str: 87, rush_power: 88, rush_speed: 89, bsh_shed: 88 } },
    { id: 'DT1', label: 'NT', name: 'Reinvested Nose', scouting: { jersey: 97, ovr: 88 }, ratings: { spd: 74, acc: 80, str: 93, rush_power: 91, rush_speed: 78, bsh_shed: 89 } },
    { id: 'DT2', label: 'DT', name: 'Reinvested 3-Tech', scouting: { jersey: 93, ovr: 89 }, ratings: { spd: 79, acc: 85, str: 90, rush_power: 90, rush_speed: 86, bsh_shed: 88 } },
    { id: 'RDE', label: 'EDGE', name: 'Reinvested Edge2', scouting: { jersey: 58, ovr: 88 }, ratings: { spd: 87, acc: 89, str: 85, rush_power: 86, rush_speed: 89, bsh_shed: 87 } },
    { id: 'WLB', label: 'WILL', name: 'Reinvested Will', scouting: { jersey: 48, ovr: 87 }, ratings: { spd: 89, acc: 90, str: 82, tak_hit_power: 87, cov_man: 83, cov_zone: 87 } },
    { id: 'MLB', label: 'MIKE', name: 'Reinvested Mike', scouting: { jersey: 54, ovr: 88 }, ratings: { spd: 88, acc: 89, str: 85, tak_hit_power: 89, cov_man: 82, cov_zone: 88 } },
    { id: 'NCB', label: 'NI', name: 'Reinvested Nickel', scouting: { jersey: 23, ovr: 88 }, ratings: { spd: 91, acc: 92, str: 72, tak_hit_power: 82, cov_man: 88, cov_zone: 88 } },
    { id: 'CB1', label: 'CB', name: 'Reinvested CB1', scouting: { jersey: 21, ovr: 90 }, ratings: { spd: 93, acc: 93, str: 68, tak_hit_power: 76, cov_man: 90, cov_zone: 89 } },
    { id: 'CB2', label: 'CB', name: 'Reinvested CB2', scouting: { jersey: 24, ovr: 87 }, ratings: { spd: 92, acc: 91, str: 68, tak_hit_power: 76, cov_man: 87, cov_zone: 87 } },
    { id: 'SS', label: 'SS', name: 'Reinvested Strong', scouting: { jersey: 31, ovr: 88 }, ratings: { spd: 90, acc: 90, str: 79, tak_hit_power: 88, cov_man: 85, cov_zone: 88 } },
    { id: 'FS', label: 'FS', name: 'Reinvested Free', scouting: { jersey: 32, ovr: 89 }, ratings: { spd: 91, acc: 91, str: 72, tak_hit_power: 82, cov_man: 86, cov_zone: 91 } },
  ],
};

function makeHydraAgent(
  id: string,
  pos: string,
  player: HydraRosterPlayer,
  x: number,
  y: number,
  role: BlockRoleType,
  gapOrSet: GapOrSetCode,
  primaryTargetId: string | null = null,
  secondaryTargetId: string | null = null,
  leverage: LeverageBias = 'INSIDE_OUT',
  waypoints: Waypoint2D[] = [],
  readOrder?: number,
  climbOrChipDelaySec = 0.60
): SimAgent {
  return {
    id,
    label: pos,
    name: player.name,
    jersey: player.jersey,
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
    readOrder,
    blockRating: player.blockRating,
    ratings: { ...player.ratings },
    assignment: {
      role,
      primaryTargetId,
      secondaryTargetId,
      gapOrSet,
      leverage,
      climbOrChipDelaySec,
      waypoints: waypoints.map((w) => ({ ...w })),
    },
  };
}

function buildHydraOL(
  ltCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  lgCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  cCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  rgCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  rtCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?]
): SimAgent[] {
  const R = HYDRA_2027_ROSTER;
  return [
    makeHydraAgent('LT', 'LT', R.LT_RAIMANN, -3.2, -0.4, ltCfg[0], ltCfg[1], ltCfg[2], ltCfg[3], ltCfg[4], ltCfg[5] || []),
    makeHydraAgent('LG', 'LG', R.LG_BECTON, -1.6, -0.3, lgCfg[0], lgCfg[1], lgCfg[2], lgCfg[3], lgCfg[4], lgCfg[5] || []),
    makeHydraAgent('C', 'C', R.C_BREWER, 0.0, -0.2, cCfg[0], cCfg[1], cCfg[2], cCfg[3], cCfg[4], cCfg[5] || []),
    makeHydraAgent('RG', 'RG', R.RG_PUNI, 1.6, -0.3, rgCfg[0], rgCfg[1], rgCfg[2], rgCfg[3], rgCfg[4], rgCfg[5] || []),
    makeHydraAgent('RT', 'RT', R.RT_BROWN, 3.2, -0.4, rtCfg[0], rtCfg[1], rtCfg[2], rtCfg[3], rtCfg[4], rtCfg[5] || []),
  ];
}

// ============================================================================
// 2. THE 8-PLAY 2027 HYDRA VANGUARD SITUATIONAL CALL SHEET
//    100% Strictly Legal NFL Formations, Exchanges & Ineligible OL Buffers
// ============================================================================
export const HYDRA_2027_PLAYBOOK: HydraPlayDefinition[] = [
  // PLAY 1: CONVERTED-QB WR JET SWEEP DOUBLE OPTION
  {
    id: 'HYDRA_JET_DOUBLE_OPTION',
    name: 'HYDRA // WR JET SWEEP DOUBLE OPTION (MEYERS THROW/KEEP)',
    category: 'RUN',
    personnel: '21 HYDRA',
    situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
    situationBadge: 'WR OPT PASS',
    menuBuckets: ['OPEN_FIELD', 'TWO_MINUTE'],
    legalMechanic:
      '7 men on LOS (5 OL + WR1 Jennings + WR2 Shaheed); QB1 Fields tosses backward (-0.55y) at t=0.22s to Jet-motion WR Jakobi Meyers (former NC State QB) and boots weakside to freeze DE; 239-lb TE/QB Eli Stowers split-flow seals backside while OL stays <= +0.85y.',
    optionalityBranches:
      'Branch A: Flat/Alley defender crashes on Jet Sweep -> Meyers throws single-read strike to Shaheed or leaking TE Washington. Branch B: DBs sink deep -> Meyers tucks behind pulling C Aaron Brewer (SPD 80) & LG Becton.',
    buildOffense: () => {
      const R = HYDRA_2027_ROSTER;
      // RT Spencer Brown pins LDE inside while LG Becton & C Brewer pull right to seal alley & force
      const ol = buildHydraOL(
        ['MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'C_RIGHT',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 1.5, y: -1.3 },
            { x: 5.8, y: -0.5 },
            { x: 7.8, y: 0.6 },
            { x: 8.8, y: 4.0 },
          ],
        ],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'SS',
          null,
          'OUTSIDE_IN',
          [
            { x: 2.6, y: -1.1 },
            { x: 6.8, y: -0.4 },
            { x: 9.2, y: 0.6 },
            { x: 10.2, y: 4.5 },
          ],
        ],
        ['MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT'],
        ['MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT']
      );

      // Uncovered ends on LOS (7 men on LOS strictly satisfied: 5 OL + WR1 Jennings + WR2 Shaheed)
      const wr1 = makeHydraAgent('WR1', 'WR', R.WR2_JENNINGS, -11.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -11.0, y: 6.0 },
        { x: -5.0, y: 10.5 },
      ]);
      const wr2 = makeHydraAgent('WR2', 'WR', R.WR3_SHAHEED, 14.2, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 13.8, y: 7.5 },
        { x: 16.5, y: 16.5 },
        { x: 17.8, y: 23.0 },
      ], 1);
      // Off-LOS wing TE Washington chips overhang for 0.42s then leaks into vacated intermediate seam
      const te = makeHydraAgent(
        'TE',
        'TE',
        R.TE1_WASHINGTON,
        4.9,
        -0.95,
        'CHIP_RELEASE',
        'D_ALLEY',
        'SS',
        null,
        'INSIDE_OUT',
        [
          { x: 7.8, y: 5.5 },
          { x: 11.2, y: 11.5 },
        ],
        2,
        0.42
      );

      // QB1 Fields tosses backward to Meyers then executes a weakside Counter-Bootleg Fake (NEVER blocks a DE!)
      const qb = makeHydraAgent('QB', 'QB', R.QB1_FIELDS, 0.0, -3.9, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 0.0, y: -4.0 },
      ]);
      qb.backwardToss = {
        enabled: true,
        tossTimeSec: 0.22,
        recipientId: 'SL',
        postTossRole: 'ROUTE',
        postTossWaypoints: [
          { x: -6.5, y: -4.6 },
          { x: -10.5, y: -3.5 },
        ],
      };

      // 239-lb TE/QB hybrid Eli Stowers (BLK 82) executes the split-flow backside seal on NT/WILL!
      const rb = makeHydraAgent('RB', 'TE', R.TE2_KRAFT, -1.6, -4.2, 'MAN_BLOCK', 'B_LEFT', 'NT', 'WILL', 'OUTSIDE_IN');

      // Converted-QB WR Jakobi Meyers in lateral/slightly-backward Jet Motion (vy <= 0) catching backward touch-toss at y=-4.45
      const sl = makeHydraAgent('SL', 'SL', R.WR1_MEYERS, -1.0, -4.45, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 5.2, y: -2.8 },
        { x: 8.6, y: -0.9 },
        { x: 10.2, y: 4.2 },
        { x: 11.2, y: 16.0 },
      ]);
      sl.vx = 5.8;
      sl.preSnapMotion = {
        enabled: true,
        type: 'JET_RIGHT',
        speed: 5.8,
        dirX: 1.0,
        dirY: -0.05,
        originX: -8.8,
        originY: -2.2,
        snapX: -1.0,
        snapY: -4.45,
      };
      sl.optionPass = {
        enabled: true,
        throwerRating: R.WR1_MEYERS.throwerRating,
        decisionWindowStartSec: 0.90,
        decisionWindowEndSec: 1.42,
        primaryReceiverId: 'WR2',
        secondaryReceiverId: 'TE',
        separationThresholdYds: 3.35,
      };

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 2: CHOREOGRAPHED HOOK & LATERAL ("CATCH-PITCH OPTION" / CPO)
  {
    id: 'HYDRA_HOOK_AND_LATERAL',
    name: 'HYDRA // HOOK & LATERAL CATCH-PITCH OPTION (MEYERS -> SHAHEED)',
    category: 'PASS',
    personnel: '11 HYDRA',
    situations: ['1ST_10', '3RD_LONG'],
    situationBadge: 'HOOK/LATERAL',
    menuBuckets: ['OPEN_FIELD', 'THIRD_LONG', 'TWO_MINUTE'],
    legalMechanic:
      'QB1 Fields hits WR1 Jakobi Meyers on an +8.0y Intermediate Hook; 4.33-speed Rashid Shaheed loops underneath strictly behind Meyers (y=+6.4y < +7.8y); Meyers ONLY pitches when defender collapses (<4.5y) AND Shaheed has >=2.65y separation.',
    optionalityBranches:
      'Branch A: DB/LB collapses on Meyers to rally-tackle short & Shaheed is clean -> Meyers pitches backward (-1.3y) to Shaheed at 9.4 yd/s. Branch B: Pitch window contested -> Meyers keeps hook safely (avoiding live-ball fumble).',
    buildOffense: () => {
      const R = HYDRA_2027_ROSTER;
      const ol = buildHydraOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', null, 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', 'MIKE', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', null, 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      // TE Washington runs middle seam clearout to pull Mike/Safety inside
      const te = makeHydraAgent('TE', 'TE', R.TE1_WASHINGTON, 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 4.5, y: 7.5 },
        { x: 2.2, y: 14.0 },
      ], 3);

      // WR1 Meyers stems outside the numbers to (-13.5, +8.2) and curls back to (-13.9, +7.7)
      // Disciplined Catch-Pitch Option thresholds avoid reckless downfield fumbles!
      const wr1 = makeHydraAgent('WR1', 'WR', R.WR1_MEYERS, -13.8, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -13.5, y: 8.2 },
        { x: -13.9, y: 7.7 },
      ], 1);
      wr1.lateralConfig = {
        enabled: true,
        pitchTargetId: 'SL',
        gatherDelaySec: 0.10,
        defenderCollapseRadius: 5.4,
        maxPitchDist: 7.8,
        minTargetSeparation: 3.25,
      };

      // WR2 Jennings runs field-side 12y dig/clearout
      const wr2 = makeHydraAgent('WR2', 'WR', R.WR2_JENNINGS, 14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.0, y: 11.5 },
        { x: 8.5, y: 12.0 },
      ], 2);

      // SL Rashid Shaheed (SPD 96) orbits behind LT Raimann and wheels outside the numbers to (-18.0, +6.8) — strictly behind Meyers at catch!
      const sl = makeHydraAgent('SL', 'SL', R.WR3_SHAHEED, -2.4, -1.8, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -8.5, y: -0.4 },
        { x: -15.2, y: 4.0 },
        { x: -18.0, y: 6.8 },
      ], 4);

      const qb = makeHydraAgent('QB', 'QB', R.QB1_FIELDS, 0.0, -4.4, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -0.6, y: -5.6 },
      ]);
      // 239-lb TE/QB hybrid Eli Stowers (BLK 82) scans A-gaps against Mug/Cross-Dog blitzes so Hook & Lateral stays sack-proof!
      const rb = makeHydraAgent('RB', 'TE', R.TE2_KRAFT, -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', 'WILL', 'MIKE', 'INSIDE_OUT', [
        { x: 5.5, y: 2.0 },
      ], 4);

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 3: DUAL-QB SPLIT-PONY PIN-PULL & PASS OPTION (FIELDS + PAYTON + STOWERS)
  {
    id: 'HYDRA_PONY_SPLIT_BASH',
    name: 'HYDRA // 2-QB SPLIT-PONY PIN-PULL & OPTION (FIELDS + PAYTON + STOWERS)',
    category: 'RUN',
    personnel: '21 HYDRA',
    situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
    situationBadge: '2-QB PONY',
    menuBuckets: ['OPEN_FIELD', 'GOAL_LINE'],
    legalMechanic:
      'Simultaneous 2-QB Pony backfield: QB1 Fields (-1.1, -4.0) tosses backward right to lefty QB2 Cole Payton (+1.8, -4.5) at t=0.20s, then fakes a weakside counter-bootleg to freeze backside DE (LT Raimann blocks RDE); 239-lb TE/QB Eli Stowers chips SS & releases to corner-flat.',
    optionalityBranches:
      'Branch A: Light Nickel/Dime box -> Cole Payton tucks behind 363-lb Becton, 80-SPD Brewer & 275-lb Washington. Branch B: Heavy 8-man box / safety blitz -> Payton fires option pass to Eli Stowers flat-corner or Shaheed post.',
    buildOffense: () => {
      const R = HYDRA_2027_ROSTER;
      const ol = buildHydraOL(
        ['MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'NCB',
          null,
          'OUTSIDE_IN',
          [
            { x: 1.5, y: -1.3 },
            { x: 6.2, y: -0.6 },
            { x: 8.4, y: 0.7 },
            { x: 9.2, y: 4.2 },
          ],
        ],
        [
          'PULL_LEAD',
          'C_RIGHT',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 2.5, y: -1.1 },
            { x: 5.2, y: -0.4 },
            { x: 6.8, y: 0.7 },
            { x: 7.6, y: 3.8 },
          ],
        ],
        ['MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT'],
        ['MAN_BLOCK', 'B_RIGHT', 'LDE', null, 'INSIDE_OUT']
      );

      // 6'7" 275-lb TE Washington pins/crushes right defensive end (7th man on LOS with WR1)
      const te = makeHydraAgent('TE', 'TE', R.TE1_WASHINGTON, 4.8, -0.35, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT');
      const wr1 = makeHydraAgent('WR1', 'WR', R.WR2_JENNINGS, -13.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
      // Off-LOS flanker Shaheed runs deep clear/flag
      const wr2 = makeHydraAgent('WR2', 'WR', R.WR3_SHAHEED, 14.2, -1.0, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.0, y: 8.0 },
        { x: 16.5, y: 17.5 },
      ], 2);
      // Off-LOS H-Back Eli Stowers (239-lb TE/QB hybrid, BLK 82) chips overhang SS for 0.45s then releases to 8.5-yard corner-flat!
      const sl = makeHydraAgent(
        'SL',
        'TE',
        R.TE2_KRAFT,
        6.4,
        -1.1,
        'CHIP_RELEASE',
        'D_ALLEY',
        'SS',
        null,
        'INSIDE_OUT',
        [
          { x: 10.5, y: 4.2 },
          { x: 13.8, y: 8.5 },
        ],
        1,
        0.45
      );

      // QB1 Fields tosses backward to Payton then boots weakside to hold backside contain via option threat (zero QB-on-DE contact!)
      const qb = makeHydraAgent('QB', 'QB', R.QB1_FIELDS, -1.1, -4.0, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -1.2, y: -4.1 },
      ]);
      qb.backwardToss = {
        enabled: true,
        tossTimeSec: 0.20,
        recipientId: 'RB',
        postTossRole: 'ROUTE',
        postTossWaypoints: [
          { x: -6.8, y: -4.6 },
          { x: -10.8, y: -3.5 },
        ],
      };

      // QB2 Cole Payton (6'3" 232-lb Eagles 5th-Rd dual-threat, SPD 89, ARM 82) sweeps right with run/pass option
      const rb = makeHydraAgent('RB', 'RB', R.QB2_WILLIS, 1.8, -4.5, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 5.5, y: -3.2 },
        { x: 8.2, y: -1.2 },
        { x: 9.5, y: 3.5 },
        { x: 10.5, y: 16.0 },
      ]);
      rb.optionPass = {
        enabled: true,
        throwerRating: R.QB2_WILLIS.throwerRating,
        decisionWindowStartSec: 0.85,
        decisionWindowEndSec: 1.40,
        primaryReceiverId: 'SL',
        secondaryReceiverId: 'WR2',
        separationThresholdYds: 3.55,
      };

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 4: BACKWARD LATERAL SCREEN -> DEEP RAIL DOUBLE PASS
  {
    id: 'HYDRA_BACKWARD_DOUBLE_PASS',
    name: 'HYDRA // BACKWARD LATERAL SCREEN DOUBLE PASS (FIELDS -> MEYERS -> SHAHEED)',
    category: 'PASS',
    personnel: '11 HYDRA',
    situations: ['1ST_10', '3RD_LONG'],
    situationBadge: 'DOUBLE PASS',
    menuBuckets: ['OPEN_FIELD', 'THIRD_LONG'],
    legalMechanic:
      'Pass #1 (t=0.30s) is a strictly BACKWARD lateral toss from QB Fields (y=-4.0) to SL Jakobi Meyers retreating to y=-5.4 behind 239-lb TE/QB Eli Stowers chipping NCB & 275-lb Washington scanning A-gaps; OL holds <= +0.85y.',
    optionalityBranches:
      'Branch A: Blitz/Zone triggers toward left-flank bubble screen -> Meyers launches deep strike to 4.33 Shaheed or leaking Eli Stowers. Branch B: Secondary stays deep -> Meyers follows Raimann + Becton screen convoy up left alley.',
    buildOffense: () => {
      const R = HYDRA_2027_ROSTER;
      const ol = buildHydraOL(
        [
          'PULL_LEAD',
          'D_ALLEY',
          'CB1',
          null,
          'OUTSIDE_IN',
          [
            { x: -6.2, y: -1.6 },
            { x: -9.5, y: -0.4 },
            { x: -10.8, y: 0.7 },
          ],
        ],
        [
          'PULL_LEAD',
          'C_LEFT',
          'NCB',
          null,
          'OUTSIDE_IN',
          [
            { x: -5.2, y: -1.6 },
            { x: -7.2, y: -1.2 },
            { x: -8.4, y: 0.4 },
          ],
        ],
        ['PASS_SET', 'JUMP_SET', 'NT', null, 'NEUTRAL'],
        ['PASS_SET', 'JUMP_SET', '3T', null, 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      // 239-lb TE/QB hybrid Eli Stowers (BLK 82) aligns off-LOS left slot (-6.8, -1.1) to stonewall blitzing NCB for 0.62s, then leaks past sticks!
      const te = makeHydraAgent(
        'TE',
        'TE',
        R.TE2_KRAFT,
        -6.8,
        -1.1,
        'CHIP_RELEASE',
        'C_LEFT',
        'NCB',
        null,
        'OUTSIDE_IN',
        [
          { x: -5.2, y: 9.8 },
          { x: -2.5, y: 15.5 },
        ],
        2,
        0.62
      );
      // WR1 Jennings (6th man on LOS, BLK 76) seals boundary corner on left screen side
      const wr1 = makeHydraAgent('WR1', 'WR', R.WR2_JENNINGS, -13.8, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
      // WR2 Shaheed (7th man on LOS, uncovered right end!) explodes vertical-post past the sticks!
      const wr2 = makeHydraAgent('WR2', 'WR', R.WR3_SHAHEED, 11.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 10.5, y: 11.5 },
        { x: 5.5, y: 21.5 },
      ], 1);

      // QB1 Fields tosses backward left then flares weakside right as a throwback decoy (never pass-blocks DL/LBs)
      const qb = makeHydraAgent('QB', 'QB', R.QB1_FIELDS, 0.0, -4.0, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -0.5, y: -4.0 },
      ]);
      qb.backwardToss = {
        enabled: true,
        tossTimeSec: 0.30,
        recipientId: 'SL',
        postTossRole: 'ROUTE',
        postTossWaypoints: [
          { x: 4.5, y: -5.2 },
          { x: 8.5, y: -4.5 },
        ],
      };

      // 6'7" 275-lb Darnell Washington (BLK 91) aligns as offset H-Back protector to stonewall A-gap Cross-Dog blitzers!
      const rb = makeHydraAgent('RB', 'TE', R.TE1_WASHINGTON, 1.4, -4.2, 'MAX_PROTECT_SCAN', 'A_RIGHT', 'MIKE', 'WILL', 'INSIDE_OUT');

      // SL Jakobi Meyers retreats deeply behind QB (-5.4 < -4.0) behind Stowers' chip on NCB, fires past the sticks at t=1.22-1.72s, or runs screen!
      const sl = makeHydraAgent('SL', 'SL', R.WR1_MEYERS, -7.8, -4.6, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: -10.2, y: -5.4 },
        { x: -10.8, y: -2.0 },
        { x: -11.6, y: 5.0 },
        { x: -12.0, y: 16.0 },
      ]);
      sl.optionPass = {
        enabled: true,
        throwerRating: R.WR1_MEYERS.throwerRating,
        decisionWindowStartSec: 1.22,
        decisionWindowEndSec: 1.72,
        primaryReceiverId: 'WR2',
        secondaryReceiverId: 'TE',
        separationThresholdYds: 2.35,
      };

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 5: CONDENSED 6-OL ELIGIBLE SEAM LEAK & HEAVY PA FLOOD
  {
    id: 'HYDRA_6OL_ELIGIBLE_SEAM',
    name: 'HYDRA // 6th-OL ELIGIBLE SEAM LEAK (275-LB WASHINGTON + STOWERS PA)',
    category: 'PASS',
    personnel: '22 HYDRA',
    situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
    situationBadge: '6-OL SEAM',
    menuBuckets: ['OPEN_FIELD', 'GOAL_LINE'],
    legalMechanic:
      'Condensed 22-Hydra formation forces Base/Bear LB response; QB1 Fields & 239-lb TE/QB Eli Stowers execute 0.65s PA Duo mesh + Stowers blitz-scan (BLK 82) while 6\'7" 275-lb Darnell Washington chips LDE (0.42s) then leaks clean up the seam.',
    optionalityBranches:
      'Primary: Washington seam leak behind biting LBs (+11y). Secondary: Meyers 7.5y in-breaker, Jennings flat-sail (+6y), or Shaheed deep clear behind 7-man Max-Protect.',
    buildOffense: () => {
      const R = HYDRA_2027_ROSTER;
      const ol = buildHydraOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', null, 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', 'WILL', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', 'MIKE', 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      // Eligible 6th-OL Darnell Washington (BLK 91) on right end of LOS chips LDE 0.38s then bursts up vacated seam
      const te = makeHydraAgent(
        'TE',
        'TE',
        R.TE1_WASHINGTON,
        4.8,
        -0.4,
        'CHIP_RELEASE',
        'C_RIGHT',
        'LDE',
        null,
        'INSIDE_OUT',
        [
          { x: 4.6, y: 6.2 },
          { x: 2.2, y: 12.8 },
        ],
        1,
        0.38
      );
      // Condensed left end Jakobi Meyers runs quick-rhythm 7.5y in-breaker (hot vs A-gap Mug blitz)
      const wr1 = makeHydraAgent('WR1', 'WR', R.WR1_MEYERS, -7.8, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -7.4, y: 6.8 },
        { x: -1.2, y: 8.2 },
      ], 1);
      // Off-LOS flanker Shaheed lifts intermediate/deep outside corner within 2.25s PA rhythm window
      const wr2 = makeHydraAgent('WR2', 'WR', R.WR3_SHAHEED, 13.5, -1.0, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.5, y: 14.2 },
      ], 2);
      // Condensed wing Jauan Jennings runs fast flat-out flood
      const sl = makeHydraAgent('SL', 'SL', R.WR2_JENNINGS, 6.2, -1.1, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 11.2, y: 4.2 },
        { x: 15.8, y: 5.5 },
      ], 1);

      // Flash Play-Action mesh (freezes reading LBs for 0.50s while keeping 7-man Max-Protect intact vs Cross-Dog)
      const qb = makeHydraAgent('QB', 'QB', R.QB1_FIELDS, 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 0.2, y: -5.2 },
      ]);
      qb.playAction = {
        enabled: true,
        meshDurationSec: 0.50,
        fakeCarrierId: 'RB',
        fakeGap: 'A_RIGHT',
        isBootleg: false,
      };

      // 239-lb TE/QB hybrid Eli Stowers (BLK 82) anchors B-gap/A-gap Max-Protect Scan immediately from snap!
      const rb = makeHydraAgent('RB', 'TE', R.TE2_KRAFT, 1.2, -4.4, 'MAX_PROTECT_SCAN', 'B_RIGHT', 'MIKE', 'SS', 'INSIDE_OUT', [], 4);

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 6: 2-MINUTE DRILL TEMPO SIDELINE FLOOD & CLOCK-STOPPER
  {
    id: 'HYDRA_2MIN_SIDELINE_CHOICE',
    name: 'HYDRA 2-MIN // TEMPO SIDELINE SPEED-OUT & FLAT CLOCK-STOPPER',
    category: 'PASS',
    personnel: '11 HYDRA',
    situations: ['1ST_10', '3RD_LONG'],
    situationBadge: '2-MIN OOB',
    menuBuckets: ['TWO_MINUTE', 'THIRD_LONG'],
    legalMechanic:
      'Half-roll right shortens boundary throw by 6 yards behind 7-man Max-Protect (275-lb Washington + 239-lb Eli Stowers); Meyers (+7.9y Speed Out) & 4.33 Shaheed (+4.6y Sideline Shoot) attack the +/-25.85y sideline boundary for immediate out-of-bounds clock stop.',
    optionalityBranches:
      'Read 1: Meyers 7.9y sideline cut (+10y & 0s runoff). Read 2: Shaheed 4.6y sideline shoot (+5.5y & 0s runoff). Read 3: Jennings backside boundary speed-out.',
    buildOffense: () => {
      const R = HYDRA_2027_ROSTER;
      const ol = buildHydraOL(
        ['PASS_SET', 'ANGLE_45', 'RDE', null, 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', null, 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', 'WILL', 'NEUTRAL'],
        ['PASS_SET', 'VERTICAL_DEEP', '3T', 'MIKE', 'INSIDE_OUT'],
        ['PASS_SET', 'JUMP_SET', 'LDE', null, 'OUTSIDE_IN']
      );

      // 275-lb Darnell Washington (BLK 91) seals right edge LDE
      const te = makeHydraAgent(
        'TE',
        'TE',
        R.TE1_WASHINGTON,
        4.8,
        -0.4,
        'PASS_SET',
        'VERTICAL_DEEP',
        'LDE',
        null,
        'INSIDE_OUT'
      );
      const wr1 = makeHydraAgent('WR1', 'WR', R.WR2_JENNINGS, -14.8, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -15.2, y: 6.8 },
        { x: -24.5, y: 7.6 },
      ], 2);
      // WR2 Jakobi Meyers aligned outside the right numbers (+15.2) for rapid 1.75s Sideline Speed-Out -> OOB!
      const wr2 = makeHydraAgent('WR2', 'WR', R.WR1_MEYERS, 15.2, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 15.6, y: 7.1 },
        { x: 24.4, y: 7.9 },
      ], 1);
      // SL Rashid Shaheed (SPD 96) runs fast 4.6y Sideline Shoot/Flat to guarantee OOB outlet vs Cover-2/Quarters
      const sl = makeHydraAgent('SL', 'SL', R.WR3_SHAHEED, 10.5, -0.95, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 18.2, y: 3.6 },
        { x: 25.0, y: 4.6 },
      ], 2);

      const qb = makeHydraAgent('QB', 'QB', R.QB1_FIELDS, 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 2.2, y: -5.0 },
      ]);
      // 239-lb TE/QB hybrid Eli Stowers (BLK 82) scans interior blitzers (MIKE/WILL) so Fields has a clean half-roll launch!
      const rb = makeHydraAgent('RB', 'TE', R.TE2_KRAFT, 1.5, -4.5, 'MAX_PROTECT_SCAN', 'B_RIGHT', 'MIKE', 'WILL', 'OUTSIDE_IN');

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 7: 4-MINUTE DRILL DIRECT-SNAP BULLDOZER PIN-PULL (STOWERS LEAD + PAYTON FREEZE)
  {
    id: 'HYDRA_4MIN_BULLDOZER_SWEEP',
    name: 'HYDRA 4-MIN // DIRECT-SNAP FIELDS BULLDOZER (STOWERS LEAD + PAYTON FREEZE)',
    category: 'RUN',
    personnel: '22 HYDRA',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: '4-MIN BLEED',
    menuBuckets: ['FOUR_MINUTE', 'OPEN_FIELD'],
    legalMechanic:
      '228-lb QB1 Justin Fields (SPD 91, PWR 86) takes direct shotgun snap behind a 3-puller convoy led by 239-lb TE/QB hybrid Eli Stowers (BLK 82), 363-lb LG Becton (BLK 93) & 80-SPD C Brewer (BLK 84), while QB2 Cole Payton fakes a weakside jet/bootleg to freeze backside pursuit!',
    optionalityBranches:
      'True hat advantage without asking a QB to block a DE/LB: Mackey TE Eli Stowers kicks out WILL while Payton holds backside edge via option geometry; runner stays inside +/-21y hash corridor to bleed 40s clock.',
    buildOffense: () => {
      const R = HYDRA_2027_ROSTER;
      const ol = buildHydraOL(
        ['MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'SS',
          null,
          'OUTSIDE_IN',
          [
            { x: 1.2, y: -1.4 },
            { x: 5.8, y: -0.6 },
            { x: 7.6, y: 3.2 },
          ],
        ],
        [
          'PULL_LEAD',
          'C_RIGHT',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 2.2, y: -1.1 },
            { x: 4.8, y: -0.3 },
            { x: 6.2, y: 3.0 },
          ],
        ],
        ['MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT'],
        ['MAN_BLOCK', 'B_RIGHT', 'LDE', null, 'INSIDE_OUT']
      );

      // Heavy perimeter & edge sealers: 275-lb Washington (BLK 91) on LDE, Jennings (BLK 76) on CB2, Meyers (BLK 68) on CB1
      const te = makeHydraAgent('TE', 'TE', R.TE1_WASHINGTON, 4.8, -0.35, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT');
      const wr1 = makeHydraAgent('WR1', 'WR', R.WR1_MEYERS, -12.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
      const wr2 = makeHydraAgent('WR2', 'WR', R.WR2_JENNINGS, 11.5, -1.0, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');

      // 239-lb TE/QB hybrid Eli Stowers (BLK 82, SPD 90) acts as H-Back lead blocker wrapping through the C/D alley on WILL!
      const sl = makeHydraAgent('SL', 'TE', R.TE2_KRAFT, 2.0, -3.4, 'PULL_LEAD', 'D_ALLEY', 'WILL', null, 'OUTSIDE_IN', [
        { x: 4.5, y: -1.4 },
        { x: 6.8, y: 1.5 },
        { x: 7.5, y: 5.5 },
      ]);

      // QB2 Cole Payton (SPD 89, lefty passer) executes a high-speed weakside Jet/Bootleg Option Fake to freeze backside contain (zero contact blocking!)
      const rb = makeHydraAgent('RB', 'RB', R.QB2_WILLIS, -1.4, -4.2, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: -6.5, y: -4.2 },
        { x: -11.5, y: -3.2 },
      ]);

      // QB1 Justin Fields (SPD 91, PWR 86) carries directly behind Becton + Brewer + Stowers + Washington, cutting upfield in-bounds!
      const qb = makeHydraAgent('QB', 'QB', R.QB1_FIELDS, 0.0, -4.4, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: 3.6, y: -2.4 },
        { x: 6.2, y: 0.8 },
        { x: 7.2, y: 6.5 },
        { x: 7.0, y: 16.0 },
      ]);

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 8: LOW RED ZONE / GOAL-LINE HEAVY "HYDRA PHILLY SPECIAL"
  {
    id: 'HYDRA_GOALLINE_PHILLY_SPECIAL',
    name: 'HYDRA GOAL-LINE // HEAVY 2-QB PYLON SWEEP & POP-PASS SPECIAL',
    category: 'RUN',
    personnel: '22 HYDRA',
    situations: ['3RD_SHORT', 'RED_ZONE'],
    situationBadge: 'GOAL SPECIAL',
    menuBuckets: ['GOAL_LINE'],
    legalMechanic:
      'At +4y Goal Line vs 6-2 Heavy Pinch: QB1 Fields tosses backward right (t=0.20s) to Eagles rookie QB2 Cole Payton sweeping toward right pylon, then leaks left into end zone; 6\'7" Washington blocks down 0.48s then pops over goal line while 239-lb Eli Stowers seals weakside DE.',
    optionalityBranches:
      'Branch A: 6-2 Pinch/LB scrapes hard to pylon -> Cole Payton loft-pops 4y TD pass to 6\'7" Washington or cross Meyers/Fields. Branch B: DBs plaster eligibles -> Payton outruns DL to pylon behind C Brewer + RG Puni.',
    buildOffense: () => {
      const R = HYDRA_2027_ROSTER;
      const ol = buildHydraOL(
        ['MAN_BLOCK', 'C_LEFT', 'DE_L', null, 'INSIDE_OUT'],
        ['COMBO_CLIMB', 'A_LEFT', 'NT_L', 'WILL', 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 2.5, y: -1.1 },
            { x: 6.0, y: -0.3 },
            { x: 8.5, y: 0.7 },
            { x: 9.5, y: 4.2 },
          ],
        ],
        [
          'PULL_LEAD',
          'C_RIGHT',
          'DE_R',
          null,
          'OUTSIDE_IN',
          [
            { x: 3.5, y: -1.0 },
            { x: 5.8, y: -0.2 },
            { x: 7.5, y: 0.7 },
            { x: 8.2, y: 4.0 },
          ],
        ],
        ['MAN_BLOCK', 'B_RIGHT', 'DT_R', null, 'INSIDE_OUT']
      );

      // 6'7" Darnell Washington (BLK 91) chips/pins DE for 0.48s then pops 4.5 yards straight into end zone!
      const te = makeHydraAgent(
        'TE',
        'TE',
        R.TE1_WASHINGTON,
        4.8,
        -0.35,
        'CHIP_RELEASE',
        'C_RIGHT',
        'DE_R',
        null,
        'INSIDE_OUT',
        [
          { x: 5.2, y: 2.5 },
          { x: 6.2, y: 4.8 },
        ],
        1,
        0.48
      );
      // Left tight end Eli Stowers (239-lb TE/QB hybrid, BLK 82) seals left edge alongside LT Raimann
      const wr1 = makeHydraAgent('WR1', 'TE', R.TE2_KRAFT, -5.0, -0.35, 'MAN_BLOCK', 'C_LEFT', 'DE_L', null, 'INSIDE_OUT');
      // Wide right Jennings (BLK 76) stalks CB2
      const wr2 = makeHydraAgent('WR2', 'WR', R.WR2_JENNINGS, 13.0, -1.0, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'OUTSIDE_IN');
      // Slot Meyers runs shallow back-line cross into end zone
      const sl = makeHydraAgent('SL', 'SL', R.WR1_MEYERS, -7.2, -1.1, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -8.5, y: 3.5 },
        { x: -11.5, y: 5.0 },
      ], 2);

      const qb = makeHydraAgent('QB', 'QB', R.QB1_FIELDS, -0.8, -3.8, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -1.0, y: -3.9 },
      ]);
      qb.backwardToss = {
        enabled: true,
        tossTimeSec: 0.20,
        recipientId: 'RB',
        postTossRole: 'ROUTE',
        postTossWaypoints: [
          { x: -5.5, y: -2.2 },
          { x: -8.0, y: 4.5 },
        ],
      };

      const rb = makeHydraAgent('RB', 'RB', R.QB2_WILLIS, 2.0, -4.3, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 5.6, y: -2.8 },
        { x: 8.6, y: -1.0 },
        { x: 10.2, y: 2.2 },
        { x: 10.8, y: 6.5 },
      ]);
      rb.optionPass = {
        enabled: true,
        throwerRating: R.QB2_WILLIS.throwerRating,
        decisionWindowStartSec: 0.75,
        decisionWindowEndSec: 1.38,
        primaryReceiverId: 'TE',
        secondaryReceiverId: 'SL',
        separationThresholdYds: 2.05,
      };

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },
];

// ============================================================================
// 3. MODERN 2026-2027 10-FRONT NFL DEFENSIVE LIBRARY (FOR PLAYTEST & NASH DC)
// ============================================================================
export const MODERN_2027_DEF_FRONTS = [
  'NICKEL_OVER_C3',
  'NICKEL_UNDER_C1',
  'NICKEL_SIM_C2',
  'BASE_34_BEAR_C4',
  'BASE_43_OVER_C1',
  'DIME_MUG_C0',
  'DIME_QUARTERS_MATCH',
  'VIKINGS_MUG_CROSSDOG_C0',
  'VIKINGS_SAFETY_BLITZ_C1',
  'GOAL_LINE_62_PINCH',
] as const;

export type ModernDefFrontId = (typeof MODERN_2027_DEF_FRONTS)[number];

export function buildModern2027Defense(call: ModernDefFrontId): SimAgent[] {
  const def = (
    id: string,
    pos: string,
    x: number,
    y: number,
    role: NonNullable<SimAgent['defAssignment']>['role'],
    targetX: number,
    targetY: number,
    manTargetId?: string,
    customRatings?: Partial<SimAgent['ratings']>
  ): SimAgent => ({
    id,
    label: id,
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
    ratings: {
      speed: customRatings?.speed ?? 85,
      accel: customRatings?.accel ?? 87,
      power: customRatings?.power ?? 85,
      finesse: customRatings?.finesse ?? 84,
      awareness: customRatings?.awareness ?? 86,
    },
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
      targetX,
      targetY,
      manTargetId,
    },
  });

  switch (call) {
    case 'NICKEL_UNDER_C1':
      return [
        def('LDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
        def('3T', 'DT', -1.8, 0.5, 'RUSH_GAP', -1.5, -4.0, undefined, { speed: 76, power: 90, finesse: 84 }),
        def('NT', 'NT', 1.0, 0.5, 'RUSH_GAP', 1.0, -4.0, undefined, { speed: 72, power: 92, finesse: 76 }),
        def('RDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
        def('WILL', 'WILL', -0.5, 4.2, 'MAN_COV', -0.5, 1.5, 'RB'),
        def('MIKE', 'MIKE', 2.5, 4.2, 'READ_RUN_PASS', 2.0, 1.5),
        def('NCB', 'NI', -6.8, 3.8, 'MAN_COV', -6.5, 0.0, 'SL', { speed: 91, accel: 90, power: 70 }),
        def('CB1', 'CB', -14.2, 4.3, 'MAN_COV', -14.0, 0.0, 'WR1', { speed: 92, accel: 91, power: 66 }),
        def('CB2', 'CB', 14.2, 4.3, 'MAN_COV', 14.0, 0.0, 'WR2', { speed: 92, accel: 91, power: 66 }),
        def('SS', 'SS', 5.8, 4.5, 'MAN_COV', 5.0, 0.0, 'TE', { speed: 89, accel: 88, power: 78 }),
        def('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0, undefined, { speed: 91, accel: 90, power: 72 }),
      ];

    case 'NICKEL_SIM_C2':
      return [
        def('LDE', 'DE', -4.2, 0.6, 'HOOK_CURL', -8.0, 4.5, undefined, { speed: 80, power: 85 }),
        def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 72, power: 92, finesse: 76 }),
        def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 76, power: 90, finesse: 84 }),
        def('RDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0, undefined, { speed: 86, power: 85, finesse: 88 }),
        def('NCB', 'NI', -6.8, 3.2, 'BLITZ_EDGE', -3.5, -4.5, undefined, { speed: 91, accel: 92, power: 70 }),
        def('WILL', 'WILL', -2.5, 4.2, 'HOOK_CURL', 8.0, 4.5),
        def('MIKE', 'MIKE', 0.0, 4.2, 'HOOK_CURL', 0.0, 10.0, undefined, { speed: 87, power: 84, awareness: 90 }),
        def('CB1', 'CB', -14.2, 5.2, 'CURL_FLAT', -18.5, 5.0, undefined, { speed: 92, power: 65 }),
        def('CB2', 'CB', 14.2, 5.2, 'CURL_FLAT', 18.5, 5.0, undefined, { speed: 92, power: 65 }),
        def('FS', 'FS', -7.5, 12.5, 'DEEP_HALF', -12.0, 17.0, undefined, { speed: 91, power: 68 }),
        def('SS', 'SS', 7.5, 12.5, 'DEEP_HALF', 12.0, 17.0, undefined, { speed: 89, power: 76 }),
      ];

    case 'BASE_34_BEAR_C4':
      return [
        def('LOLB', 'EDGE', -5.0, 0.6, 'CONTAIN_EDGE', -4.2, -5.0, undefined, { speed: 85, power: 84, finesse: 88 }),
        def('4i_L', 'DE', -2.2, 0.5, 'RUSH_GAP', -1.9, -4.0, undefined, { speed: 75, power: 90, finesse: 82 }),
        def('0T_NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 70, power: 94, finesse: 74 }),
        def('4i_R', 'DE', 2.2, 0.5, 'RUSH_GAP', 1.9, -4.0, undefined, { speed: 75, power: 90, finesse: 82 }),
        def('ROLB', 'EDGE', 5.4, 0.6, 'CONTAIN_EDGE', 4.5, -5.0, undefined, { speed: 86, power: 84, finesse: 88 }),
        def('WILL', 'ILB', -1.2, 4.5, 'READ_RUN_PASS', -6.5, 4.0),
        def('MIKE', 'ILB', 1.2, 4.5, 'READ_RUN_PASS', 6.5, 4.0),
        def('CB1', 'CB', -14.0, 7.0, 'QUARTERS_MATCH', -18.5, 15.0, undefined, { speed: 92, power: 65 }),
        def('CB2', 'CB', 14.0, 7.0, 'QUARTERS_MATCH', 18.5, 15.0, undefined, { speed: 92, power: 65 }),
        def('FS', 'FS', -5.0, 10.5, 'QUARTERS_MATCH', -6.0, 16.0, undefined, { speed: 90, power: 70 }),
        def('SS', 'SS', 5.0, 10.5, 'QUARTERS_MATCH', 6.0, 16.0, undefined, { speed: 89, power: 74 }),
      ];

    case 'BASE_43_OVER_C1':
      return [
        def('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
        def('NT', 'NT', -1.0, 0.5, 'RUSH_GAP', -0.6, -4.0, undefined, { speed: 72, power: 93, finesse: 76 }),
        def('3T', 'DT', 1.8, 0.5, 'RUSH_GAP', 1.5, -4.0, undefined, { speed: 76, power: 91, finesse: 84 }),
        def('LDE', 'DE', 4.5, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
        def('WILL', 'WLB', -2.5, 4.5, 'READ_RUN_PASS', -2.5, 3.8),
        def('MIKE', 'MLB', 0.5, 4.5, 'READ_RUN_PASS', 2.5, 3.8),
        def('SAM', 'SLB', 5.2, 1.5, 'FORCE_ALLEY', 5.0, 2.5),
        def('SS', 'SS', 4.8, 4.8, 'ROBBER', 0.0, 5.5, undefined, { speed: 89, power: 78 }),
        def('CB1', 'CB', -14.2, 4.2, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 92, power: 65 }),
        def('CB2', 'CB', 14.2, 4.2, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, power: 65 }),
        def('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0, undefined, { speed: 91, power: 70 }),
      ];

    case 'DIME_MUG_C0':
      return [
        def('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0),
        def('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 74, power: 91, finesse: 80 }),
        def('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0),
        def('WILL', 'WILL', -0.8, 1.1, 'BLITZ_A', -0.5, -4.5, undefined, { speed: 88, accel: 90, power: 82 }),
        def('MIKE', 'MIKE', 0.8, 1.1, 'BLITZ_A', 0.5, -4.5, undefined, { speed: 88, accel: 90, power: 84 }),
        def('NCB', 'NI', -6.8, 3.8, 'MAN_COV', -7.5, 1.5, 'SL', { speed: 91, accel: 90, power: 68 }),
        def('CB1', 'CB', -14.2, 4.2, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 93, accel: 92, power: 65 }),
        def('CB2', 'CB', 14.2, 4.2, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, accel: 91, power: 65 }),
        def('SS', 'SS', 5.8, 4.2, 'MAN_COV', 5.0, 1.5, 'TE', { speed: 89, accel: 88, power: 78 }),
        def('FS', 'FS', -2.5, 4.5, 'MAN_COV', -2.0, 1.5, 'RB', { speed: 91, accel: 89, power: 68 }),
        def('DIME', 'DB', 5.2, 4.0, 'BLITZ_EDGE', 4.5, -5.0, undefined, { speed: 90, accel: 90, power: 72 }),
      ];

    case 'DIME_QUARTERS_MATCH':
      return [
        def('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
        def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 74, power: 91 }),
        def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 77, power: 89 }),
        def('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
        def('MIKE', 'MLB', 0.0, 4.2, 'HOOK_CURL', 0.0, 4.5, undefined, { speed: 88, power: 83 }),
        def('NCB', 'NI', -6.5, 4.5, 'CURL_FLAT', -16.0, 5.0, undefined, { speed: 91, power: 68 }),
        def('DIME', 'DB', 6.5, 4.5, 'CURL_FLAT', 16.0, 5.0, undefined, { speed: 90, power: 68 }),
        def('CB1', 'CB', -14.2, 6.8, 'QUARTERS_MATCH', -18.5, 15.0, undefined, { speed: 92, power: 65 }),
        def('CB2', 'CB', 14.2, 6.8, 'QUARTERS_MATCH', 18.5, 15.0, undefined, { speed: 92, power: 65 }),
        def('FS', 'FS', -5.5, 11.0, 'QUARTERS_MATCH', -6.0, 16.0, undefined, { speed: 91, power: 70 }),
        def('SS', 'SS', 5.5, 11.0, 'QUARTERS_MATCH', 6.0, 16.0, undefined, { speed: 90, power: 74 }),
      ];

    case 'VIKINGS_MUG_CROSSDOG_C0':
      return [
        def('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0, undefined, { speed: 84, power: 88, finesse: 86 }),
        def('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 76, power: 92, finesse: 80 }),
        def('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0, undefined, { speed: 84, power: 88, finesse: 86 }),
        def('WILL', 'WILL', -0.7, 1.1, 'BLITZ_RUN_GAP', -0.6, -1.5, undefined, { speed: 90, accel: 92, power: 84 }),
        def('MIKE', 'MIKE', 0.7, 1.1, 'CROSS_DOG', 0.6, -1.5, undefined, { speed: 89, accel: 91, power: 84 }),
        def('SS', 'SS', 5.2, 2.2, 'BLITZ_EDGE_CRASH', 3.5, -5.0, undefined, { speed: 90, accel: 90, power: 78 }),
        def('NCB', 'NI', -6.8, 3.6, 'MAN_COV', -7.5, 1.5, 'SL', { speed: 91, accel: 90, power: 68 }),
        def('CB1', 'CB', -14.2, 4.0, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 93, accel: 92, power: 65 }),
        def('CB2', 'CB', 14.2, 4.0, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, accel: 91, power: 65 }),
        def('FS', 'FS', -2.5, 4.2, 'MAN_COV', -2.0, 1.5, 'RB', { speed: 91, accel: 89, power: 68 }),
        def('DIME', 'DB', 5.8, 3.8, 'MAN_COV', 5.0, 1.5, 'TE', { speed: 89, accel: 88, power: 78 }),
      ];

    case 'VIKINGS_SAFETY_BLITZ_C1':
      return [
        def('LDE', 'DE', -4.4, 0.6, 'CONTAIN_EDGE', -3.8, -5.0),
        def('3T', 'DT', -2.1, 0.5, 'RUSH_GAP', -1.8, -4.0, undefined, { speed: 76, power: 90 }),
        def('NT', 'NT', 0.8, 0.5, 'RUSH_GAP', 0.5, -4.0, undefined, { speed: 72, power: 92 }),
        def('RDE', 'DE', 4.5, 0.6, 'SPILL', 3.8, -1.0),
        def('SS', 'SS', 5.6, 1.2, 'BLITZ_EDGE_CRASH', 3.5, -5.0, undefined, { speed: 91, accel: 92, power: 80 }),
        def('WILL', 'WILL', -1.2, 4.2, 'MAN_COV', -1.5, 1.5, 'RB'),
        def('MIKE', 'MIKE', 2.2, 4.2, 'MAN_COV', 4.5, 1.5, 'TE'),
        def('NCB', 'NI', -6.8, 3.8, 'MAN_COV', -7.5, 1.5, 'SL', { speed: 91, power: 68 }),
        def('CB1', 'CB', -14.2, 4.2, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 92, power: 65 }),
        def('CB2', 'CB', 14.2, 4.2, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, power: 65 }),
        def('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0, undefined, { speed: 91, power: 70 }),
      ];

    case 'GOAL_LINE_62_PINCH':
      return [
        def('DE_L', 'DE', -4.8, 0.5, 'CONTAIN_EDGE', -4.2, -3.5, undefined, { speed: 76, power: 90 }),
        def('DT_L', 'DT', -2.8, 0.5, 'SPILL', -2.0, -1.0, undefined, { speed: 72, power: 93 }),
        def('NT_L', 'NT', -0.9, 0.5, 'RUSH_GAP', -0.5, -2.5, undefined, { speed: 70, power: 95 }),
        def('NT_R', 'NT', 0.9, 0.5, 'RUSH_GAP', 0.5, -2.5, undefined, { speed: 70, power: 95 }),
        def('DT_R', 'DT', 2.8, 0.5, 'SPILL', 2.0, -1.0, undefined, { speed: 72, power: 93 }),
        def('DE_R', 'DE', 4.8, 0.5, 'FORCE_ALLEY', 5.2, 1.2, undefined, { speed: 76, power: 90 }),
        def('WILL', 'ILB', -3.5, 2.8, 'MAN_COV', -4.0, 1.0, 'SL', { speed: 86, power: 86 }),
        def('MIKE', 'ILB', 4.2, 2.8, 'MAN_COV', 4.5, 1.0, 'TE', { speed: 86, power: 86 }),
        def('CB1', 'CB', -13.5, 2.5, 'MAN_COV', -13.5, 1.0, 'WR1', { speed: 92, power: 65 }),
        def('CB2', 'CB', 13.5, 2.5, 'MAN_COV', 13.5, 1.0, 'WR2', { speed: 92, power: 65 }),
        def('FS', 'FS', 0.0, 4.8, 'ROBBER', 0.0, 4.0, undefined, { speed: 89, power: 76 }),
      ];

    case 'NICKEL_OVER_C3':
    default:
      return [
        def('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
        def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 72, power: 92, finesse: 76 }),
        def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 76, power: 90, finesse: 84 }),
        def('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
        def('WILL', 'WILL', -2.2, 4.2, 'HOOK_CURL', -5.5, 4.5),
        def('MIKE', 'MIKE', 1.2, 4.2, 'HOOK_CURL', 5.5, 4.5),
        def('NCB', 'NI', -6.8, 4.2, 'CURL_FLAT', -17.5, 5.0, undefined, { speed: 91, power: 70 }),
        def('CB1', 'CB', -14.2, 6.2, 'DEEP_THIRD', -17.0, 16.0, undefined, { speed: 92, power: 66 }),
        def('CB2', 'CB', 14.2, 6.2, 'DEEP_THIRD', 17.0, 16.0, undefined, { speed: 92, power: 66 }),
        def('SS', 'SS', 5.8, 5.4, 'CURL_FLAT', 17.5, 5.0, undefined, { speed: 89, power: 78 }),
        def('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0, undefined, { speed: 91, power: 72 }),
      ];
  }
}
