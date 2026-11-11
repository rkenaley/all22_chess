import {
  SimAgent,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
  Waypoint2D,
} from './engine';

export type ArgonSituationTag = '1ST_10' | '3RD_SHORT' | '3RD_LONG' | 'RED_ZONE';
export type ArgonMenuBucket =
  | 'OPEN_FIELD'
  | 'THIRD_LONG'
  | 'TWO_MINUTE'
  | 'FOUR_MINUTE'
  | 'GOAL_LINE';

export interface ArgonRosterPlayer {
  slotKey: string;
  name: string;
  pos: string;
  jersey: number;
  capHitM: number; // 2027 projected AAV in $ Millions
  archetype: string;
  inefficiencyThesis: string;
  throwerRating: number; // 40-99 passing skill
  blockRating: number; // 40-99 contact/trench blocking skill (distinct from ballcarrier leg-drive power)
  ratings: {
    speed: number;
    accel: number;
    power: number;
    finesse: number;
    awareness: number;
  };
}

export interface ArgonPlayDefinition {
  id: string;
  name: string;
  category: 'PASS' | 'RUN';
  personnel: string;
  situations: ArgonSituationTag[];
  situationBadge: string;
  menuBuckets: ArgonMenuBucket[];
  legalMechanic: string;
  optionalityBranches: string;
  buildOffense: () => SimAgent[];
}

// ============================================================================
// 1. THE 2027 GOOGLE ARGON ROSTER ($81.1M ACTIVE 11-STARTER OFFENSIVE CAP)
//    "The Noble-Gas Symmetric Continuum"
//    Zero Overlap w/ Hydra | Zero All-Pros | Max Deal $13.0M | 4 Live Passers
// ============================================================================
export const ARGON_2027_ROSTER: Record<string, ArgonRosterPlayer> = {
  QB1_RICHARDSON: {
    slotKey: 'QB',
    name: 'Anthony Richardson',
    pos: 'QB',
    jersey: 5,
    capHitM: 10.8,
    archetype: '6\'4" 244-lb 10.00-RAS Power-Speed Trigger & Chiral Direct-Snap Hammer',
    inefficiencyThesis:
      'Discounted (~$47M below supermax pocket QBs) for 5-step full-field touch variance, yet possesses Cam Newton mass (244 lbs, PWR 89) + 4.43 speed (SPD 92) + elite raw velocity — thriving in direct-snap 11-on-11 runs behind 256-lb/250-lb TEs, binary RPOs, and half-roll boundary lasers.',
    throwerRating: 84,
    blockRating: 50,
    ratings: { speed: 92, accel: 93, power: 89, finesse: 84, awareness: 78 },
  },
  QB2_MILTON: {
    slotKey: 'RB',
    name: 'Joe Milton III',
    pos: 'RB',
    jersey: 19,
    capHitM: 3.2,
    archetype: '6\'5" 246-lb Split-Reactor QB2 / Displaced Node Passer & Option-Boot Freeze',
    inefficiencyThesis:
      'Backup-QB wage ($3.2M) puts a 246-lb dual-threat athlete with an 80-yard cannon (ARM 84, PWR 86, SPD 88) in the backfield simultaneously — serving as mug-immune perimeter passer on displaced launch nodes and high-speed weakside option-boot freeze on direct QB1 runs.',
    throwerRating: 84,
    blockRating: 52,
    ratings: { speed: 88, accel: 89, power: 86, finesse: 83, awareness: 78 },
  },
  WR1_SHAKIR: {
    slotKey: 'WR1',
    name: 'Khalil Shakir',
    pos: 'WR',
    jersey: 10,
    capHitM: 12.5,
    archetype: 'Former Wildcat Option QB / High-IQ Jet Passer & Zone-Void Separator',
    inefficiencyThesis:
      'Former high-school Wildcat QB with >85% NFL catch reliability, elite contact balance, and crisp perimeter option-pass decision-making at less than half of $32M+ WR1 contracts.',
    throwerRating: 79,
    blockRating: 68,
    ratings: { speed: 91, accel: 92, power: 72, finesse: 90, awareness: 89 },
  },
  WR2_WORTHY: {
    slotKey: 'WR2',
    name: 'Xavier Worthy',
    pos: 'WR',
    jersey: 1,
    capHitM: 4.5,
    archetype: '4.21 Combine-Record Lid-Lifter & Untouched Kinetic Relay Trailer',
    inefficiencyThesis:
      'Year-4 rookie scale ($4.5M) unlocks all-time NFL Combine 4.21 speed (SPD 98, ACC 97) — backing Quarters safeties to 17 yards pre-snap and receiving disciplined downfield backward pitches (>=3.25y separation) at 9.5 yd/s.',
    throwerRating: 52,
    blockRating: 50,
    ratings: { speed: 98, accel: 97, power: 60, finesse: 87, awareness: 85 },
  },
  SL_SAMUEL: {
    slotKey: 'SL',
    name: 'Curtis Samuel',
    pos: 'SL',
    jersey: 4,
    capHitM: 7.5,
    archetype: '4.31 RB/WR Hybrid Wing / Boundary Void Cutter & Perimeter DB Stalker',
    inefficiencyThesis:
      'College RB/WR hybrid with 4.31 speed (SPD 95) and running-back lower-body mass (BLK 74) — attacks Quarters boundary voids and stalks nickel/corner DBs in 11-on-11 sweeps at a mid-tier gadget cap hit.',
    throwerRating: 62,
    blockRating: 74,
    ratings: { speed: 95, accel: 95, power: 74, finesse: 88, awareness: 86 },
  },
  TE1_WARREN: {
    slotKey: 'TE',
    name: 'Tyler Warren',
    pos: 'TE',
    jersey: 84,
    capHitM: 4.4,
    archetype: '6\'6" 256-lb Wildcat-QB Tight End / Kinetic Relay Hub & H-Back Lead Eraser',
    inefficiencyThesis:
      'Rookie wage-scale Mackey winner ($4.4M vs $18M TE1 market) who played Wildcat QB, FB, TE, and slot — giving Argon a 4th live passer (ARM 81), elite C-gap/alley lead blocking (BLK 88), zone-void YAC, and direct-snap Wildcat power.',
    throwerRating: 81,
    blockRating: 88,
    ratings: { speed: 85, accel: 87, power: 88, finesse: 86, awareness: 86 },
  },
  TE2_TREMBLE: {
    slotKey: 'TE2',
    name: 'Tommy Tremble',
    pos: 'TE',
    jersey: 82,
    capHitM: 5.5,
    archetype: '4.59-Speed 250-lb Fullback/Move-TE / Zero-Sub Edge & Alley Lead Blocker',
    inefficiencyThesis:
      'Undervalued in reception-driven TE free agency; 4.59 speed (SPD 86) + ferocious point-of-attack punch (BLK 86) erases DEs, LBs, and safeties as a lead H-Back/Fullback on chiral 11-on-11 runs without ever asking a QB to block.',
    throwerRating: 50,
    blockRating: 86,
    ratings: { speed: 86, accel: 87, power: 86, finesse: 81, awareness: 84 },
  },
  LT_WALKER: {
    slotKey: 'LT',
    name: 'Rasheed Walker',
    pos: 'LT',
    jersey: 63,
    capHitM: 12.5,
    archetype: 'Former 7th-Round Pass-Set & Pin-Pull Blindside Tackle',
    inefficiencyThesis:
      'Late-round development surplus (~$14M below top-market LT resets) combining long-arm pass-set anchor (BLK 87) with 77-speed lateral reach on chiral left sweeps.',
    throwerRating: 40,
    blockRating: 87,
    ratings: { speed: 77, accel: 82, power: 87, finesse: 87, awareness: 86 },
  },
  LG_EBROWN: {
    slotKey: 'LG',
    name: 'Evan Brown',
    pos: 'LG',
    jersey: 64,
    capHitM: 6.2,
    archetype: 'Converted-Center High-Speed Pulling Left Guard',
    inefficiencyThesis:
      'Veteran center-guard swing value ($6.2M vs $21M Pro Bowl guards) delivering center-grade stunt recognition (BLK 87) and 77-speed open-field pull accuracy.',
    throwerRating: 40,
    blockRating: 87,
    ratings: { speed: 77, accel: 83, power: 87, finesse: 86, awareness: 86 },
  },
  C_BARTON: {
    slotKey: 'C',
    name: 'Graham Barton',
    pos: 'C',
    jersey: 62,
    capHitM: 4.2,
    archetype: '4.85-Speed / 9.98-RAS Tackle-to-Center Bilateral Pull Engine',
    inefficiencyThesis:
      'Year-4 rookie contract ($4.2M) for a former college Left Tackle with 99th-percentile Center athleticism (SPD 79, ACC 85, BLK 88) capable of outrunning ILBs to either sideline.',
    throwerRating: 40,
    blockRating: 88,
    ratings: { speed: 79, accel: 85, power: 87, finesse: 88, awareness: 87 },
  },
  RG_BORTOLINI: {
    slotKey: 'RG',
    name: 'Tanor Bortolini',
    pos: 'RG',
    jersey: 60,
    capHitM: 1.3,
    archetype: '9.87-RAS / 4.94-Speed Day-3 Rookie-Contract Pull Guard',
    inefficiencyThesis:
      'Extreme rookie-scale OL arbitrage ($1.3M vs $20M veteran RG market): 4.28 short-shuttle agility (faster than most NFL WRs!) pairs with Barton to form dual sub-4.95 interior pullers (BLK 86).',
    throwerRating: 40,
    blockRating: 86,
    ratings: { speed: 79, accel: 85, power: 85, finesse: 86, awareness: 85 },
  },
  RT_TOM: {
    slotKey: 'RT',
    name: 'Zach Tom',
    pos: 'RT',
    jersey: 50,
    capHitM: 13.0,
    archetype: '5-Position Technician Strongside Anchor & Reach Tackle',
    inefficiencyThesis:
      'Former 4th-round technician ($13.0M) with elite mirror feet (FIN 89, SPD 78, BLK 89) and leverage who anchors 5-man slide protections and seals strongside C-gaps.',
    throwerRating: 40,
    blockRating: 89,
    ratings: { speed: 78, accel: 84, power: 87, finesse: 89, awareness: 88 },
  },
};

// Worst-case active 11-starter offensive cap hit on field ($80.1M in 11-Argon; $81.1M in 22-Argon when Tremble $5.5M rotates for Worthy $4.5M)
export const ARGON_ACTIVE_11_CAP_M = 81.1;

// Workstation-compatible team entry for #off-team-select / #def-team-select
export const ARGON_2027_TEAM_ENTRY = {
  id: 'ARG',
  city: '2027 Google Argon',
  name: 'Argon Continuum ($81.1M)',
  fullName: '2027 Google Argon Continuum ($81.1M Moneyball)',
  offense: [
    {
      id: 'QB',
      label: 'QB',
      name: 'Anthony Richardson',
      scouting: { jersey: 5, ovr: 81 },
      ratings: { spd: 92, acc: 93, str: 88, btk_power: 90, agi: 87, tha_short: 82, pre_snap_read: 78 },
    },
    {
      id: 'RB',
      label: 'RB',
      name: 'Joe Milton III (QB2)',
      scouting: { jersey: 19, ovr: 80 },
      ratings: { spd: 88, acc: 89, str: 86, btk_power: 86, agi: 84, elusiveness: 82, pre_snap_read: 78 },
    },
    {
      id: 'WR1',
      label: 'WR',
      name: 'Khalil Shakir',
      scouting: { jersey: 10, ovr: 88 },
      ratings: { spd: 91, acc: 92, str: 72, btk_power: 74, agi: 91, rr_short: 90 },
    },
    {
      id: 'WR2',
      label: 'WR',
      name: 'Xavier Worthy',
      scouting: { jersey: 1, ovr: 85 },
      ratings: { spd: 98, acc: 97, str: 58, btk_power: 62, agi: 92, rr_short: 85 },
    },
    {
      id: 'SLOT',
      label: 'SL',
      name: 'Curtis Samuel',
      scouting: { jersey: 4, ovr: 86 },
      ratings: { spd: 95, acc: 95, str: 74, rbk_power: 74, agi: 90, rr_short: 87 },
    },
    {
      id: 'TE',
      label: 'TE',
      name: 'Tyler Warren',
      scouting: { jersey: 84, ovr: 87 },
      ratings: { spd: 85, acc: 87, str: 88, rbk_power: 88, agi: 85, rr_short: 87 },
    },
    {
      id: 'LT',
      label: 'LT',
      name: 'Rasheed Walker',
      scouting: { jersey: 63, ovr: 86 },
      ratings: { spd: 77, acc: 82, str: 88, pbk_anchor: 87, rbk_power: 86, agi: 80, pbk_lateral: 88, rbk_reach: 88 },
    },
    {
      id: 'LG',
      label: 'LG',
      name: 'Evan Brown',
      scouting: { jersey: 64, ovr: 86 },
      ratings: { spd: 77, acc: 83, str: 87, pbk_anchor: 86, rbk_power: 88, agi: 81, pbk_lateral: 87, rbk_reach: 88 },
    },
    {
      id: 'C',
      label: 'C',
      name: 'Graham Barton',
      scouting: { jersey: 62, ovr: 87 },
      ratings: { spd: 79, acc: 85, str: 87, pbk_anchor: 87, rbk_power: 87, agi: 85, pbk_lateral: 89, rbk_reach: 90 },
    },
    {
      id: 'RG',
      label: 'RG',
      name: 'Tanor Bortolini',
      scouting: { jersey: 60, ovr: 85 },
      ratings: { spd: 79, acc: 85, str: 85, pbk_anchor: 85, rbk_power: 85, agi: 86, pbk_lateral: 87, rbk_reach: 88 },
    },
    {
      id: 'RT',
      label: 'RT',
      name: 'Zach Tom',
      scouting: { jersey: 50, ovr: 88 },
      ratings: { spd: 78, acc: 84, str: 87, pbk_anchor: 88, rbk_power: 87, agi: 84, pbk_lateral: 90, rbk_reach: 90 },
    },
  ],
  // Cap-Reinvested Top-3 Defense funded by $64.9M-$90.9M offensive cap savings vs NFL baselines
  defense: [
    { id: 'LDE', label: 'DE', name: 'Argon Edge1', scouting: { jersey: 94, ovr: 90 }, ratings: { spd: 87, acc: 90, str: 88, rush_power: 89, rush_speed: 90, bsh_shed: 89 } },
    { id: 'DT1', label: 'NT', name: 'Argon Nose', scouting: { jersey: 98, ovr: 89 }, ratings: { spd: 75, acc: 81, str: 94, rush_power: 92, rush_speed: 79, bsh_shed: 90 } },
    { id: 'DT2', label: 'DT', name: 'Argon 3-Tech', scouting: { jersey: 92, ovr: 90 }, ratings: { spd: 80, acc: 86, str: 91, rush_power: 91, rush_speed: 87, bsh_shed: 89 } },
    { id: 'RDE', label: 'EDGE', name: 'Argon Edge2', scouting: { jersey: 51, ovr: 89 }, ratings: { spd: 88, acc: 90, str: 86, rush_power: 87, rush_speed: 90, bsh_shed: 88 } },
    { id: 'WLB', label: 'WILL', name: 'Argon Will', scouting: { jersey: 44, ovr: 88 }, ratings: { spd: 90, acc: 91, str: 83, tak_hit_power: 88, cov_man: 84, cov_zone: 88 } },
    { id: 'MLB', label: 'MIKE', name: 'Argon Mike', scouting: { jersey: 57, ovr: 89 }, ratings: { spd: 89, acc: 90, str: 86, tak_hit_power: 90, cov_man: 83, cov_zone: 89 } },
    { id: 'NCB', label: 'NI', name: 'Argon Nickel', scouting: { jersey: 20, ovr: 89 }, ratings: { spd: 92, acc: 92, str: 73, tak_hit_power: 83, cov_man: 89, cov_zone: 89 } },
    { id: 'CB1', label: 'CB', name: 'Argon CB1', scouting: { jersey: 27, ovr: 91 }, ratings: { spd: 93, acc: 93, str: 69, tak_hit_power: 77, cov_man: 91, cov_zone: 90 } },
    { id: 'CB2', label: 'CB', name: 'Argon CB2', scouting: { jersey: 29, ovr: 88 }, ratings: { spd: 92, acc: 92, str: 69, tak_hit_power: 77, cov_man: 88, cov_zone: 88 } },
    { id: 'SS', label: 'SS', name: 'Argon Strong', scouting: { jersey: 33, ovr: 89 }, ratings: { spd: 91, acc: 91, str: 80, tak_hit_power: 89, cov_man: 86, cov_zone: 89 } },
    { id: 'FS', label: 'FS', name: 'Argon Free', scouting: { jersey: 30, ovr: 90 }, ratings: { spd: 92, acc: 92, str: 73, tak_hit_power: 83, cov_man: 87, cov_zone: 92 } },
  ],
};

function makeArgonAgent(
  id: string,
  pos: string,
  player: ArgonRosterPlayer,
  x: number,
  y: number,
  role: BlockRoleType,
  gapOrSet: GapOrSetCode,
  primaryTargetId: string | null = null,
  secondaryTargetId: string | null = null,
  leverage: LeverageBias = 'INSIDE_OUT',
  waypoints: Waypoint2D[] = [],
  readOrder?: number,
  climbOrChipDelaySec = 0.55
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

function buildArgonOL(
  ltCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  lgCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  cCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  rgCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  rtCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?]
): SimAgent[] {
  const R = ARGON_2027_ROSTER;
  return [
    makeArgonAgent('LT', 'LT', R.LT_WALKER, -3.2, -0.4, ltCfg[0], ltCfg[1], ltCfg[2], ltCfg[3], ltCfg[4], ltCfg[5] || []),
    makeArgonAgent('LG', 'LG', R.LG_EBROWN, -1.6, -0.3, lgCfg[0], lgCfg[1], lgCfg[2], lgCfg[3], lgCfg[4], lgCfg[5] || []),
    makeArgonAgent('C', 'C', R.C_BARTON, 0.0, -0.2, cCfg[0], cCfg[1], cCfg[2], cCfg[3], cCfg[4], cCfg[5] || []),
    makeArgonAgent('RG', 'RG', R.RG_BORTOLINI, 1.6, -0.3, rgCfg[0], rgCfg[1], rgCfg[2], rgCfg[3], rgCfg[4], rgCfg[5] || []),
    makeArgonAgent('RT', 'RT', R.RT_TOM, 3.2, -0.4, rtCfg[0], rtCfg[1], rtCfg[2], rtCfg[3], rtCfg[4], rtCfg[5] || []),
  ];
}

// ============================================================================
// 2. THE 8-PLAY 2027 GOOGLE ARGON SITUATIONAL CALL SHEET
//    "The Noble-Gas Symmetric Continuum"
//    100.0% Strict NFL Legality (Exactly 7 on LOS w/ Uncovered Ends on Every Play,
//    <= 1.0 yd OL Buffer on All Forward Passes, Strictly Backward Laterals)
// ============================================================================
export const ARGON_2027_PLAYBOOK: ArgonPlayDefinition[] = [
  // PLAY 1: CHIRAL JET-LEFT OPTION CONTINUUM (SHAKIR JET THROW / SWEEP LEFT)
  {
    id: 'ARGON_CHIRAL_JET_LEFT',
    name: 'ARGON // CHIRAL JET-LEFT OPTION CONTINUUM (SHAKIR THROW/SWEEP)',
    category: 'RUN',
    personnel: '21 ARGON',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: 'CHIRAL JET-L',
    menuBuckets: ['OPEN_FIELD', 'TWO_MINUTE'],
    legalMechanic:
      'Exactly 7 on LOS w/ uncovered ends (5 OL + WR1 Samuel -14.5 + WR2 Worthy +14.2); Richardson tosses backward (-0.55y) at t=0.20s to Jet-Left WR Khalil Shakir (ARM 79) behind 250-lb TE2 Tremble (BLK 86) + pulling Barton & Bortolini while Richardson boots weakside right; OL <= +0.85y.',
    optionalityBranches:
      'Branch A: Flat/Quarters overhang triggers on Jet-Left sweep -> Shakir fires clean-pocket boundary strike to 4.31 Samuel (-21.2, +10.2) or leaking TE Warren. Branch B: DBs bail deep -> Shakir tucks behind 250-lb Tremble (BLK 86) + dual 79-SPD pullers.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildArgonOL(
        ['MAN_BLOCK', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'],
        ['MAN_BLOCK', 'A_LEFT', 'NT', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'C_LEFT',
          'WILL',
          null,
          'OUTSIDE_IN',
          [
            { x: -2.6, y: -1.1 },
            { x: -6.2, y: -0.4 },
            { x: -8.6, y: 0.65 },
            { x: -9.8, y: 4.5 },
          ],
        ],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'NCB',
          null,
          'OUTSIDE_IN',
          [
            { x: -1.6, y: -1.3 },
            { x: -7.2, y: -0.5 },
            { x: -10.2, y: 0.65 },
            { x: -11.5, y: 4.8 },
          ],
        ],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      // Strictly 7 on LOS with uncovered eligible ends (WR1 Samuel at -14.5, WR2 Worthy at +14.2)
      const wr1 = makeArgonAgent('WR1', 'WR', R.SL_SAMUEL, -14.5, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -16.8, y: 5.5 },
        { x: -21.2, y: 10.2 },
        { x: -22.5, y: 18.0 },
      ], 1);

      const wr2 = makeArgonAgent('WR2', 'WR', R.WR2_WORTHY, 14.2, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 12.5, y: 8.5 },
        { x: 4.0, y: 16.5 },
      ], 2);

      // Off-LOS wing TE Warren (BLK 88) chips NCB/edge for 0.38s then leaks into left seam-flat
      const te = makeArgonAgent(
        'TE',
        'TE',
        R.TE1_WARREN,
        -5.2,
        -1.05,
        'CHIP_RELEASE',
        'C_LEFT',
        'NCB',
        null,
        'INSIDE_OUT',
        [
          { x: -9.8, y: 5.2 },
          { x: -13.5, y: 10.5 },
        ],
        2,
        0.38
      );

      // 250-lb H-Back/Move-TE Tommy Tremble (pos: 'TE', BLK 86) erases left-side FS/alley pursuit so Jet passer operates untouched!
      const rb = makeArgonAgent('RB', 'TE', R.TE2_TREMBLE, -2.2, -3.8, 'PULL_LEAD', 'D_ALLEY', 'FS', null, 'OUTSIDE_IN', [
        { x: -5.8, y: -1.8 },
        { x: -8.8, y: 0.6 },
        { x: -10.5, y: 4.2 },
      ]);

      // QB1 Richardson tosses backward to Shakir then executes a Weakside Right Bootleg Fake (zero QB-on-DE contact!)
      const qb = makeArgonAgent('QB', 'QB', R.QB1_RICHARDSON, 0.0, -3.9, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 0.2, y: -4.0 },
      ]);
      qb.backwardToss = {
        enabled: true,
        tossTimeSec: 0.18,
        recipientId: 'SL',
        postTossRole: 'ROUTE',
        postTossWaypoints: [
          { x: 6.2, y: -4.5 },
          { x: 10.8, y: -3.5 },
        ],
      };

      const sl = makeArgonAgent('SL', 'SL', R.WR1_SHAKIR, 0.6, -4.45, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: -5.8, y: -3.2 },
        { x: -9.4, y: -1.0 },
        { x: -11.4, y: 4.2 },
        { x: -12.5, y: 18.0 },
      ]);
      sl.vx = -5.8;
      sl.preSnapMotion = {
        enabled: true,
        type: 'JET_LEFT',
        speed: 5.8,
        dirX: -1.0,
        dirY: -0.05,
        originX: 8.6,
        originY: -2.2,
        snapX: 0.6,
        snapY: -4.45,
      };
      sl.optionPass = {
        enabled: true,
        throwerRating: R.WR1_SHAKIR.throwerRating,
        decisionWindowStartSec: 0.90,
        decisionWindowEndSec: 1.44,
        primaryReceiverId: 'WR1',
        secondaryReceiverId: 'TE',
        separationThresholdYds: 3.85,
      };

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 2: RIGHT-FLANK 11-ON-11 REACTOR SWEEP (DIRECT SNAP 244-LB RICHARDSON + TREMBLE LEAD + MILTON FREEZE)
  {
    id: 'ARGON_REACTOR_SWEEP_RIGHT',
    name: 'ARGON // 11-ON-11 RIGHT REACTOR SWEEP (244-LB RICHARDSON + TREMBLE LEAD)',
    category: 'RUN',
    personnel: '22 ARGON',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: 'REACTOR R-11',
    menuBuckets: ['OPEN_FIELD', 'FOUR_MINUTE'],
    legalMechanic:
      'True 11-on-11 hat math with 7 on LOS & uncovered ends (5 OL + WR1 Shakir -12.8 + TE1 Warren +4.8): 244-lb Richardson takes direct snap behind 250-lb H-Back Tremble (BLK 86), pulling LG Evan Brown (BLK 87) & C Barton (BLK 88), while QB2 Milton fakes weakside bootleg.',
    optionalityBranches:
      'Zero QB blocking & 0.0% lateral fumble risk: 256-lb Warren seals LDE, 250-lb Tremble kicks out WILL, and Milton freezes backside edge via option geometry.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildArgonOL(
        ['GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'SS',
          null,
          'OUTSIDE_IN',
          [
            { x: 1.4, y: -1.4 },
            { x: 6.0, y: -0.55 },
            { x: 7.8, y: 3.4 },
          ],
        ],
        [
          'PULL_LEAD',
          'C_RIGHT',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 2.3, y: -1.1 },
            { x: 4.9, y: -0.3 },
            { x: 6.4, y: 3.2 },
          ],
        ],
        ['MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT'],
        ['MAN_BLOCK', 'B_RIGHT', 'LDE', null, 'INSIDE_OUT']
      );

      // Strictly 7 on LOS with uncovered ends (WR1 Shakir -12.8, TE1 Warren +4.8)
      const te = makeArgonAgent('TE', 'TE', R.TE1_WARREN, 4.8, -0.35, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT');
      const wr1 = makeArgonAgent('WR1', 'WR', R.WR1_SHAKIR, -12.8, -0.35, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');

      // 4 Off-LOS players: Samuel (+11.8, -1.05, BLK 74 on CB2), Tremble (+1.8, -3.5, BLK 86 PULL_LEAD on WILL), Milton (-1.5, -4.2 boot fake), Richardson (0, -4.35 carrier)
      const wr2 = makeArgonAgent('WR2', 'WR', R.SL_SAMUEL, 11.8, -1.05, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');
      const sl = makeArgonAgent('SL', 'TE', R.TE2_TREMBLE, 1.8, -3.5, 'PULL_LEAD', 'D_ALLEY', 'WILL', null, 'OUTSIDE_IN', [
        { x: 4.6, y: -1.4 },
        { x: 6.9, y: 1.6 },
        { x: 7.6, y: 5.8 },
      ]);

      // QB2 Joe Milton III executes a high-speed weakside Jet/Bootleg Option Fake to freeze backside pursuit (zero QB contact!)
      const rb = makeArgonAgent('RB', 'RB', R.QB2_MILTON, -1.5, -4.2, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: -6.8, y: -4.2 },
        { x: -11.8, y: -3.2 },
      ]);

      const qb = makeArgonAgent('QB', 'QB', R.QB1_RICHARDSON, 0.0, -4.35, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: 3.7, y: -2.3 },
        { x: 6.3, y: 0.9 },
        { x: 7.3, y: 6.8 },
        { x: 7.5, y: 22.0 },
      ]);

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 3: NOBLE KINETIC RELAY (ZONE-VOID SAIL TO WARREN -> DISCIPLINED 4.21 WORTHY CATCH-PITCH OPTION)
  {
    id: 'ARGON_NOBLE_KINETIC_RELAY',
    name: 'ARGON // NOBLE KINETIC RELAY (WARREN ZONE-VOID -> 4.21 WORTHY PITCH)',
    category: 'PASS',
    personnel: '12 ARGON',
    situations: ['1ST_10', '3RD_LONG'],
    situationBadge: '4.21 RELAY',
    menuBuckets: ['OPEN_FIELD', 'THIRD_LONG', 'TWO_MINUTE'],
    legalMechanic:
      'Strictly 7 on LOS w/ uncovered ends (5 OL + WR1 Shakir -14.2 + TE1 Warren +4.8) & 250-lb TE2 Tremble (BLK 86) scanning A-gaps; Richardson hits 256-lb Warren at +8.4y while 4.21 Worthy orbits strictly behind (dy = -1.6y); Warren ONLY pitches when Worthy has >=3.25y separation.',
    optionalityBranches:
      'Branch A: DB collapses on Warren (<5.4y) & 4.21 Worthy has >=3.25y clean separation -> Warren pitches backward to Worthy at 9.5 yd/s (0% traffic fumble risk!). Branch B: Pitch contested -> 256-lb Warren keeps safely.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildArgonOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', null, 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', 'MIKE', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', null, 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      // Strictly 7 on LOS with uncovered ends (WR1 Shakir -14.2, TE Warren +4.8)
      // Disciplined Catch-Pitch Option thresholds (minTargetSeparation: 3.25 >= 3.20 eliminates trafficRisk!)
      const te = makeArgonAgent('TE', 'TE', R.TE1_WARREN, 4.8, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 12.2, y: 8.5 },
        { x: 12.8, y: 8.0 },
      ], 1);
      te.lateralConfig = {
        enabled: true,
        pitchTargetId: 'WR2',
        gatherDelaySec: 0.08,
        defenderCollapseRadius: 5.4,
        maxPitchDist: 7.8,
        minTargetSeparation: 3.25,
      };

      const wr1 = makeArgonAgent('WR1', 'WR', R.WR1_SHAKIR, -14.2, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -16.8, y: 7.5 },
        { x: -20.5, y: 10.2 },
      ], 2);

      // SL Samuel clears middle-deep safety away from right sideline relay corridor
      const sl = makeArgonAgent('SL', 'SL', R.SL_SAMUEL, -5.8, -1.10, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -1.5, y: 9.5 },
        { x: 1.0, y: 18.5 },
      ], 3);

      // 4.21-speed Xavier Worthy (SPD 98) loops off-LOS strictly behind TE Warren in tight pitch phase (~4.2y distance)
      const wr2 = makeArgonAgent('WR2', 'WR', R.WR2_WORTHY, 1.2, -2.20, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 10.8, y: 2.5 },
        { x: 17.5, y: 7.0 },
      ], 4);

      const qb = makeArgonAgent('QB', 'QB', R.QB1_RICHARDSON, 0.0, -4.3, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 1.4, y: -5.3 },
      ]);
      // 250-lb TE2 Tommy Tremble (pos: 'TE', BLK 86) scans interior A-gaps against Cross-Dog/Mug blitzes!
      const rb = makeArgonAgent('RB', 'TE', R.TE2_TREMBLE, -1.2, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', 'WILL', 'MIKE', 'INSIDE_OUT');

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 4: DISPLACED LAUNCH-NODE QUARTERS & MUG LASER (NOBLE-GAS PRESSURE IMMUNITY)
  {
    id: 'ARGON_DISPLACED_NODE_LASER',
    name: 'ARGON // DISPLACED NODE DOUBLE-PASS LASER (RICHARDSON -> MILTON -> WORTHY)',
    category: 'PASS',
    personnel: '12 ARGON',
    situations: ['1ST_10', '3RD_LONG'],
    situationBadge: 'NODE LASER',
    menuBuckets: ['OPEN_FIELD', 'THIRD_LONG'],
    legalMechanic:
      'Strictly 7 on LOS w/ uncovered ends (5 OL + WR1 Shakir -14.5 + TE1 Warren +4.8); C Barton anchors A-gap & 250-lb TE2 Tremble (BLK 86) stonewalls right edge while Pass #1 (t=0.18s) shifts launch node +8.6y outside Mug blitzers to QB2 Milton (ARM 84); OL <= +0.85y.',
    optionalityBranches:
      'Branch A: 0.0% Sack vs 6-man Mug Cover-0 & Bear Quarters -> Milton fires past 3rd & 9 sticks to 4.21 Worthy (+20.8, +9.6) or High-Hole Warren (+1.8, +9.8). Branch B: DBs plaster -> 246-lb Milton tucks behind RG Bortolini + TE2 Tremble.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildArgonOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT'],
        ['PASS_SET', 'JUMP_SET', 'NT', null, 'INSIDE_OUT'],
        ['PASS_SET', 'JUMP_SET', 'NT', 'MIKE', 'NEUTRAL'],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'SS',
          null,
          'OUTSIDE_IN',
          [
            { x: 4.5, y: -1.4 },
            { x: 8.6, y: -0.5 },
            { x: 10.4, y: 0.6 },
          ],
        ],
        ['MAN_BLOCK', 'B_RIGHT', 'LDE', null, 'INSIDE_OUT']
      );

      // Strictly 7 on LOS with uncovered ends (WR1 Shakir -14.5, TE Warren +4.8)
      const te = makeArgonAgent('TE', 'TE', R.TE1_WARREN, 4.8, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 1.8, y: 9.8 },
        { x: 0.5, y: 14.5 },
      ], 2);

      const wr1 = makeArgonAgent('WR1', 'WR', R.WR1_SHAKIR, -14.5, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -19.5, y: 9.5 },
        { x: -21.0, y: 14.5 },
      ], 3);

      // Off-LOS 4.21 Worthy attacks the wide-open outside-numbers Quarters/Mug void past the 3rd & 9 sticks
      const wr2 = makeArgonAgent('WR2', 'WR', R.WR2_WORTHY, 14.8, -1.00, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 20.8, y: 9.6 },
        { x: 22.2, y: 15.5 },
      ], 1);

      // 250-lb TE2 Tommy Tremble (pos: 'TE', BLK 86) seals right-edge Dime/SS blitzer so Milton catches & throws untouched!
      const sl = makeArgonAgent('SL', 'TE', R.TE2_TREMBLE, 6.2, -1.15, 'MAN_BLOCK', 'D_ALLEY', 'DIME', 'SS', 'INSIDE_OUT');

      // QB1 Richardson executes compact 2.2y backward pitch then flares weakside left as throwback decoy (never pass-blocks DL/LBs!)
      const qb = makeArgonAgent('QB', 'QB', R.QB1_RICHARDSON, 0.0, -3.9, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -0.2, y: -4.0 },
      ]);
      qb.backwardToss = {
        enabled: true,
        tossTimeSec: 0.18,
        recipientId: 'RB',
        postTossRole: 'ROUTE',
        postTossWaypoints: [
          { x: -5.2, y: -4.8 },
          { x: -9.5, y: -4.2 },
        ],
      };

      const rb = makeArgonAgent('RB', 'RB', R.QB2_MILTON, 2.0, -4.45, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 8.6, y: -4.9 },
        { x: 10.2, y: -1.5 },
        { x: 11.4, y: 4.5 },
        { x: 12.5, y: 18.0 },
      ]);
      rb.optionPass = {
        enabled: true,
        throwerRating: R.QB2_MILTON.throwerRating,
        decisionWindowStartSec: 1.22,
        decisionWindowEndSec: 1.68,
        primaryReceiverId: 'WR2',
        secondaryReceiverId: 'TE',
        separationThresholdYds: 3.75,
      };

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 5: 256-LB WILDCAT-TE DIRECT-SNAP POWER & DISCIPLINED 4.21 SPEED-OPTION PITCH (WARREN -> WORTHY)
  {
    id: 'ARGON_WILDCAT_TRIPLE_PITCH',
    name: 'ARGON // 256-LB WILDCAT-TE DIRECT SNAP & 4.21 SPEED-OPTION PITCH (WARREN -> WORTHY)',
    category: 'RUN',
    personnel: '22 WILDCAT',
    situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
    situationBadge: 'WILDCAT PITCH',
    menuBuckets: ['OPEN_FIELD', 'GOAL_LINE'],
    legalMechanic:
      'Strictly 7 on LOS w/ uncovered ends (5 OL + WR1 Shakir -12.8 + TE2 Tremble +4.8); 6\'6" 256-lb Wildcat-TE Tyler Warren takes direct snap behind 3 pulling OL (LG Brown on SS, C Barton on MIKE, RT Tom on WILL) + TE2 Tremble (LDE) + SL Samuel (CB2) & 4.21 Worthy in >=3.25y pitch phase!',
    optionalityBranches:
      'Branch A: Alley defender collapses on 256-lb Warren (<5.4y) & 4.21 Worthy has >=3.25y separation -> Warren pitches backward to Worthy in stride outside Samuel\'s CB2 seal. Branch B: Defender widens with Worthy -> Warren trucks through C/D alley untouched.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildArgonOL(
        ['GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'SS',
          null,
          'OUTSIDE_IN',
          [
            { x: 1.4, y: -1.4 },
            { x: 6.0, y: -0.55 },
            { x: 7.8, y: 3.4 },
          ],
        ],
        [
          'PULL_LEAD',
          'C_RIGHT',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 2.3, y: -1.1 },
            { x: 4.9, y: -0.3 },
            { x: 6.4, y: 3.2 },
          ],
        ],
        ['MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'WILL',
          null,
          'OUTSIDE_IN',
          [
            { x: 4.6, y: -1.1 },
            { x: 6.9, y: 1.5 },
            { x: 7.6, y: 5.5 },
          ],
        ]
      );

      // Strictly 7 on LOS with uncovered ends (WR1 Shakir -12.8 BLK 68, TE2 Tremble +4.8 BLK 86 sealing LDE)
      const wr1 = makeArgonAgent('WR1', 'WR', R.WR1_SHAKIR, -12.8, -0.35, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
      const sl = makeArgonAgent('SL', 'TE', R.TE2_TREMBLE, 4.8, -0.35, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT');

      // RB/WR hybrid Curtis Samuel (BLK 74, SPD 95) seals play-side CB2 on the perimeter, isolating SS as the 2-on-1 pitch key!
      const rb = makeArgonAgent('RB', 'SL', R.SL_SAMUEL, 11.8, -1.05, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');

      // QB1 Richardson executes weakside Jet/Bootleg Option Fake to hold backside contain (zero QB blocking!)
      const qb = makeArgonAgent('QB', 'QB', R.QB1_RICHARDSON, -1.5, -4.2, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: -6.8, y: -4.2 },
        { x: -11.8, y: -3.2 },
      ]);

      // 4.21-speed Xavier Worthy (+7.6, -1.35) maintains disciplined downfield speed-option pitch relationship outside Warren
      const wr2 = makeArgonAgent('WR2', 'WR', R.WR2_WORTHY, 7.6, -1.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 10.8, y: -0.6 },
        { x: 12.2, y: 4.8 },
        { x: 13.0, y: 18.0 },
      ]);

      // 256-lb Wildcat-TE Tyler Warren takes direct snap as BALL_CARRIER with disciplined (>=3.25y sep) backward pitch option
      const te = makeArgonAgent('TE', 'TE', R.TE1_WARREN, 0.0, -4.3, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: 3.7, y: -2.3 },
        { x: 6.3, y: 0.9 },
        { x: 7.3, y: 6.8 },
        { x: 7.5, y: 22.0 },
      ]);
      te.lateralConfig = {
        enabled: true,
        pitchTargetId: 'WR2',
        gatherDelaySec: 0.10,
        defenderCollapseRadius: 5.4,
        maxPitchDist: 7.8,
        minTargetSeparation: 3.25,
      };

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 6: 2-MINUTE DRILL DIRECT-SNAP SPRINT-OUT BOUNDARY LASER & OUT-OF-BOUNDS ACCELERATOR
  {
    id: 'ARGON_2MIN_BOUNDARY_LASER',
    name: 'ARGON 2-MIN // DIRECT-SNAP SPRINT-OUT BOUNDARY LASER & OOB CLOCK-STOPPER',
    category: 'PASS',
    personnel: '12 ARGON',
    situations: ['1ST_10', '3RD_LONG'],
    situationBadge: '2-MIN LASER',
    menuBuckets: ['TWO_MINUTE', 'THIRD_LONG'],
    legalMechanic:
      'Strictly 7 on LOS w/ uncovered ends (5 OL + WR1 Shakir -14.2 + TE1 Warren +4.8); direct shotgun snap to QB2 Milton (ARM 84, SPD 88) sprinting right behind Barton + Bortolini + 250-lb TE2 Tremble (BLK 86) eliminates backfield toss risk (0.0% Fumble, 0.0% Sack!) while Warren attacks +25.2y boundary.',
    optionalityBranches:
      'Branch A: Milton lasers 10.8y boundary out-cut to 256-lb Warren in stride (vy > 1.2 -> 0.5s OOB clock stop). Branch B: Corner sinks to sideline -> Milton sprints out-of-bounds himself (+26.2x) behind Barton + Bortolini.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildArgonOL(
        ['PASS_SET', 'ANGLE_45', 'RDE', null, 'INSIDE_OUT'],
        ['PASS_SET', 'JUMP_SET', 'NT', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'C_RIGHT',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 2.8, y: -1.2 },
            { x: 7.0, y: -0.45 },
            { x: 9.5, y: 0.6 },
            { x: 11.8, y: 4.0 },
          ],
        ],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'DIME',
          null,
          'OUTSIDE_IN',
          [
            { x: 4.0, y: -1.2 },
            { x: 8.6, y: -0.45 },
            { x: 11.2, y: 0.6 },
            { x: 13.8, y: 4.2 },
          ],
        ],
        ['MAN_BLOCK', 'B_RIGHT', 'LDE', null, 'INSIDE_OUT']
      );

      // Strictly 7 on LOS with uncovered ends (WR1 Shakir -14.2, TE1 Warren +4.8)
      const wr1 = makeArgonAgent('WR1', 'WR', R.WR1_SHAKIR, -14.2, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -16.5, y: 7.5 },
        { x: -24.8, y: 11.5 },
      ]);
      const te = makeArgonAgent(
        'TE',
        'TE',
        R.TE1_WARREN,
        4.8,
        -0.35,
        'CHIP_RELEASE',
        'C_RIGHT',
        'SS',
        null,
        'INSIDE_OUT',
        [
          { x: 14.5, y: 6.2 },
          { x: 25.2, y: 10.8 },
        ],
        1,
        0.35
      );

      // 4.21 Worthy pulls CB2 & Quarters safety inside-deep (+10.5, +19.5) to vacate the right sideline
      const wr2 = makeArgonAgent('WR2', 'WR', R.WR2_WORTHY, 13.8, -1.05, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 13.2, y: 10.5 },
        { x: 10.5, y: 19.5 },
      ], 2);

      // 250-lb TE2 Tommy Tremble (pos: 'TE', BLK 86) seals right-edge DIME blitzer!
      const sl = makeArgonAgent('SL', 'TE', R.TE2_TREMBLE, 6.5, -1.15, 'MAN_BLOCK', 'D_ALLEY', 'DIME', null, 'INSIDE_OUT');

      // QB1 Richardson fakes weakside left bootleg to hold backside rushers (zero QB blocking, zero lateral toss!)
      const qb = makeArgonAgent('QB', 'QB', R.QB1_RICHARDSON, -1.4, -4.1, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: -6.5, y: -4.2 },
        { x: -11.5, y: -3.2 },
      ]);

      // Direct shotgun snap to QB2 Milton (BALL_CARRIER + optionPass) sprinting to the right boundary (0.0% Fumble, 0.0% Sack!)
      const rb = makeArgonAgent('RB', 'RB', R.QB2_MILTON, 0.6, -4.2, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 7.4, y: -3.2 },
        { x: 10.8, y: -1.0 },
        { x: 15.2, y: 4.5 },
        { x: 26.2, y: 12.5 },
      ]);
      rb.optionPass = {
        enabled: true,
        throwerRating: R.QB2_MILTON.throwerRating,
        decisionWindowStartSec: 0.92,
        decisionWindowEndSec: 1.46,
        primaryReceiverId: 'TE',
        secondaryReceiverId: 'WR2',
        separationThresholdYds: 2.55,
      };

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 7: 4-MINUTE DRILL 22-HEAVY CHIRAL LEFT MONOLITH CLOCK-CRUSHER
  {
    id: 'ARGON_4MIN_LEFT_MONOLITH',
    name: 'ARGON 4-MIN // 11-ON-11 CHIRAL LEFT MONOLITH SWEEP (BARTON + BORTOLINI + WARREN)',
    category: 'RUN',
    personnel: '22 ARGON',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: '4-MIN MONOLITH',
    menuBuckets: ['FOUR_MINUTE', 'OPEN_FIELD'],
    legalMechanic:
      'Chiral left mirror of Play 2 w/ 7 on LOS & uncovered ends (5 OL + TE2 Tremble -4.8 + WR2 Shakir +12.8): 244-lb Richardson runs left behind 256-lb H-Back Warren (BLK 88) + dual sub-4.95 rookie-deal pullers (Barton & Bortolini) while QB2 Milton fakes weakside right bootleg.',
    optionalityBranches:
      'Zero QB blocking & 0.0% lateral fumble risk: punishes right-edge Dime Mug Cover-0 & Safety Blitzes while locking ball inside +/-21y hash corridor for 0.0% clock-stop mistakes.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildArgonOL(
        ['MAN_BLOCK', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'],
        ['MAN_BLOCK', 'A_LEFT', 'NT', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'C_LEFT',
          'WILL',
          null,
          'OUTSIDE_IN',
          [
            { x: -2.3, y: -1.1 },
            { x: -4.9, y: -0.3 },
            { x: -6.4, y: 3.2 },
          ],
        ],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'NCB',
          null,
          'OUTSIDE_IN',
          [
            { x: -1.4, y: -1.4 },
            { x: -6.0, y: -0.55 },
            { x: -7.8, y: 3.4 },
          ],
        ],
        ['GAP_ZONE', 'B_RIGHT', 'LDE', null, 'INSIDE_OUT']
      );

      // Strictly 7 on LOS with uncovered ends (WR1/TE2 Tremble -4.8 BLK 86, WR2 Shakir +12.8 BLK 68)
      const wr1 = makeArgonAgent('WR1', 'TE', R.TE2_TREMBLE, -4.8, -0.35, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT');
      const wr2 = makeArgonAgent('WR2', 'WR', R.WR1_SHAKIR, 12.8, -0.35, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');

      // 4 Off-LOS players: Samuel (-11.5, -1.05 BLK 74 on CB1), Warren (-1.8, -3.5 BLK 88 PULL_LEAD on MIKE), Milton (+1.5, -4.2 boot fake), Richardson (0, -4.35 carrier)
      const sl = makeArgonAgent('SL', 'SL', R.SL_SAMUEL, -11.5, -1.05, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
      const te = makeArgonAgent('TE', 'TE', R.TE1_WARREN, -1.8, -3.5, 'PULL_LEAD', 'D_ALLEY', 'MIKE', null, 'OUTSIDE_IN', [
        { x: -4.6, y: -1.4 },
        { x: -6.9, y: 1.6 },
        { x: -7.6, y: 5.8 },
      ]);

      // QB2 Joe Milton III executes a high-speed weakside right Jet/Bootleg Option Fake to freeze backside pursuit (zero QB blocking!)
      const rb = makeArgonAgent('RB', 'RB', R.QB2_MILTON, 1.5, -4.2, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 6.8, y: -4.2 },
        { x: 11.8, y: -3.2 },
      ]);

      const qb = makeArgonAgent('QB', 'QB', R.QB1_RICHARDSON, 0.0, -4.35, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: -3.7, y: -2.3 },
        { x: -6.3, y: 0.9 },
        { x: -7.3, y: 6.8 },
        { x: -7.5, y: 22.0 },
      ]);

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },

  // PLAY 8: GOAL-LINE +4.0Y HEAVY 2-QB PYLON CYCLOTRON & WARREN POP-PASS
  {
    id: 'ARGON_GOALLINE_CYCLOTRON',
    name: 'ARGON GOAL-LINE // +4.0y 2-QB PYLON CYCLOTRON & 256-LB WARREN POP-PASS',
    category: 'RUN',
    personnel: '22 GOAL',
    situations: ['3RD_SHORT', 'RED_ZONE'],
    situationBadge: 'GOAL CYCLOTRON',
    menuBuckets: ['GOAL_LINE'],
    legalMechanic:
      'At +4.0y Goal Line w/ 7 on LOS & uncovered ends (5 OL + TE2 Tremble -5.0 + TE1 Warren +4.8): Richardson tosses compact 1.8y backward pitch (t=0.18s) to 246-lb QB2 Milton & leaks left; Warren (BLK 88) chips DE_R 0.44s then pops to +5.0y end zone; OL <= +0.85y.',
    optionalityBranches:
      'Branch A: 6-2 Goal-Line DE/LB crashes on Milton pylon sweep -> Milton pops 4.5y TD strike to 6\'6" 256-lb Warren or 4.21 Worthy back-line cross (~75% 1st-snap TD!). Branch B: DBs plaster -> 246-lb Milton powers into right pylon behind Barton + Bortolini.',
    buildOffense: () => {
      const R = ARGON_2027_ROSTER;
      const ol = buildArgonOL(
        ['MAN_BLOCK', 'C_LEFT', 'DE_L', null, 'INSIDE_OUT'],
        ['COMBO_CLIMB', 'A_LEFT', 'NT_L', 'WILL', 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 2.6, y: -1.1 },
            { x: 6.2, y: -0.3 },
            { x: 8.8, y: 0.7 },
            { x: 9.8, y: 4.3 },
          ],
        ],
        [
          'PULL_LEAD',
          'C_RIGHT',
          'DE_R',
          null,
          'OUTSIDE_IN',
          [
            { x: 3.6, y: -1.0 },
            { x: 5.9, y: -0.2 },
            { x: 7.7, y: 0.7 },
            { x: 8.4, y: 4.1 },
          ],
        ],
        ['MAN_BLOCK', 'B_RIGHT', 'DT_R', null, 'INSIDE_OUT']
      );

      // Strictly 7 on LOS with uncovered ends (WR1/TE2 Tremble -5.0 BLK 86, TE1 Warren +4.8 BLK 88)
      const te = makeArgonAgent(
        'TE',
        'TE',
        R.TE1_WARREN,
        4.8,
        -0.35,
        'CHIP_RELEASE',
        'C_RIGHT',
        'DE_R',
        null,
        'INSIDE_OUT',
        [
          { x: 5.2, y: 3.0 },
          { x: 6.4, y: 5.0 },
        ],
        1,
        0.44
      );
      const wr1 = makeArgonAgent('WR1', 'TE', R.TE2_TREMBLE, -5.0, -0.35, 'MAN_BLOCK', 'C_LEFT', 'DE_L', null, 'INSIDE_OUT');

      // Wide WR2 Shakir (+16.0, -1.00, BLK 68) pins CB2 wide outside the pylon alley
      const wr2 = makeArgonAgent('WR2', 'WR', R.WR1_SHAKIR, 16.0, -1.00, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'OUTSIDE_IN');
      // SL 4.21 Worthy streaks across back end-zone line as secondary pop valve
      const sl = makeArgonAgent('SL', 'SL', R.WR2_WORTHY, -7.2, -1.10, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -10.5, y: 4.8 },
        { x: -14.0, y: 5.2 },
      ], 2);

      const qb = makeArgonAgent('QB', 'QB', R.QB1_RICHARDSON, -0.2, -3.85, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -0.4, y: -3.95 },
      ]);
      qb.backwardToss = {
        enabled: true,
        tossTimeSec: 0.18,
        recipientId: 'RB',
        postTossRole: 'ROUTE',
        postTossWaypoints: [
          { x: -5.8, y: -2.0 },
          { x: -8.8, y: 4.7 },
        ],
      };

      const rb = makeArgonAgent('RB', 'RB', R.QB2_MILTON, 1.6, -4.35, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 5.8, y: -2.8 },
        { x: 8.8, y: -1.0 },
        { x: 10.4, y: 2.2 },
        { x: 11.0, y: 6.5 },
      ]);
      rb.optionPass = {
        enabled: true,
        throwerRating: R.QB2_MILTON.throwerRating,
        decisionWindowStartSec: 0.82,
        decisionWindowEndSec: 1.48,
        primaryReceiverId: 'TE',
        secondaryReceiverId: 'SL',
        separationThresholdYds: 1.85,
      };

      return [...ol, te, wr1, wr2, sl, qb, rb];
    },
  },
];
