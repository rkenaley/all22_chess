import {
  SimAgent,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
  Waypoint2D,
} from './engine.js';

export interface OmegaRosterPlayer {
  slotKey: string;
  name: string;
  pos: string;
  jersey: number;
  capHitM: number;
  archetype: string;
  bdbCombineBasis: string;
  scoutingNotes: string;
  throwerRating: number;
  blockRating: number;
  ratings: {
    speed: number;
    accel: number;
    power: number;
    finesse: number;
    awareness: number;
  };
}

export interface OmegaPlayDefinition {
  id: string;
  name: string;
  category: 'PASS' | 'RUN';
  personnel: string;
  situations: ('1ST_10' | '3RD_SHORT' | '3RD_LONG' | 'RED_ZONE')[];
  situationBadge: string;
  menuBuckets: ('OPEN_FIELD' | 'THIRD_LONG' | 'TWO_MINUTE' | 'FOUR_MINUTE' | 'GOAL_LINE')[];
  firstPrinciplesThesis: string;
  protectsFlawNote: string;
  featuredDefense: string;
  buildOffense: () => SimAgent[];
}

// ============================================================================
// 1. "2027 OMEGA CONTINUUM" — BDB-2027-CALIBRATED NON-ALL-STAR ROSTER
//    Honest Resource Constraints ($119.8M 11-Pers / $117.4M 12-Pers / $119.5M 21-Pers)
//    - Only TWO $20M+ cornerstones (LT $23.5M, WR1 $22.0M)
//    - Saves $18.7M vs Conv-11 ($138.5M), $26.2M vs Shanahan-12 ($146.0M),
//      and $52.2M vs Supermax ($172.0M) -> +1.7 PPG defensive cap reinvestment
//    - Every archetype anchored in BDB 2027 Combine-to-Pro empirical bands
// ============================================================================
export const OMEGA_2027_ROSTER: Record<string, OmegaRosterPlayer> = {
  QB1: {
    slotKey: 'QB',
    name: 'Dual-Threat Mid-Market QB1',
    pos: 'QB',
    jersey: 7,
    capHitM: 13.5,
    archetype: 'Athletic Edge/Counter Trigger (6\'2" 226 lbs, 4.48 40)',
    bdbCombineBasis: 'Anchored to NFL Combine / NGS (4.48s 40, 1.54s 10y; BDB 2027 510-player cohort covers DB/OL/DL/WR/TE with 0 QBs)',
    scoutingNotes: 'Explosive 11v11 runner (SPD 89, ACC 90, PWR 86) & quick-rhythm thrower (THA 84), but slower 4-read full-field dropback processor (AWR 83).',
    throwerRating: 84,
    blockRating: 50,
    ratings: { speed: 89, accel: 90, power: 86, finesse: 84, awareness: 83 },
  },
  RB1: {
    slotKey: 'RB',
    name: 'Day-2 Explosive Slasher RB1',
    pos: 'RB',
    jersey: 24,
    capHitM: 3.6,
    archetype: 'Round-2 One-Cut Burner (5\'11" 212 lbs, 4.41 40)',
    bdbCombineBasis: 'Anchored to NFL Combine / NGS burst tier (1.51s 10y split, 6.89s 3-cone; BDB 2027 510-player cohort has 1 RB / 0 RB 3-cone)',
    scoutingNotes: 'Elite perimeter cut acceleration (SPD 92, ACC 93, FIN 87), but light 1v1 pass protector (BLK 66, PWR 82) vs A-gap blitzers.',
    throwerRating: 45,
    blockRating: 66,
    ratings: { speed: 92, accel: 93, power: 82, finesse: 87, awareness: 83 },
  },
  WR1: {
    slotKey: 'WR1',
    name: 'Franchise Separator WR1',
    pos: 'WR',
    jersey: 11,
    capHitM: 22.0,
    archetype: '3-Cone Technician Cornerstone (Pillar #2 of 2)',
    bdbCombineBasis: 'Modeled on BDB 2027 Jaxon Smith-Njigba cohort (6.77s 3-cone, 3.93s shuttle)',
    scoutingNotes: 'Sudden break deceleration & zone-void feel (ACC 93, FIN 93, AWR 91); modest 196-lb inline crack-blocking (BLK 58).',
    throwerRating: 52,
    blockRating: 58,
    ratings: { speed: 91, accel: 93, power: 73, finesse: 93, awareness: 91 },
  },
  WR2: {
    slotKey: 'WR2',
    name: 'Day-2 Vertical Lid-Lifter WR2',
    pos: 'WR',
    jersey: 83,
    capHitM: 4.8,
    archetype: 'Raw 4.32 Combine Vertical Threat (6\'2" 192 lbs)',
    bdbCombineBasis: 'BDB 2027 top-decile WR 40-yd dash (11.2+ yd/s Combine peak)',
    scoutingNotes: 'Taxes 2-high safeties vertically (SPD 96, ACC 95), but narrow route tree (FIN 83, AWR 81) and light blocking (BLK 54).',
    throwerRating: 45,
    blockRating: 54,
    ratings: { speed: 96, accel: 95, power: 64, finesse: 83, awareness: 81 },
  },
  SL: {
    slotKey: 'SL',
    name: 'Ex-QB Orbit Multiplier SL',
    pos: 'SL',
    jersey: 18,
    capHitM: 6.9,
    archetype: 'Former College QB / Jet-Orbit Weapon (5\'11" 199 lbs)',
    bdbCombineBasis: 'BDB 2027 slot agility profile (6.84s 3-cone, 4.44s 40, 18.2 mph in-game p99)',
    scoutingNotes: 'Crisp space quickness (SPD 92, ACC 93, AWR 87), perimeter stalker (BLK 73), and legitimate option passer (throwerRating 78).',
    throwerRating: 78,
    blockRating: 73,
    ratings: { speed: 92, accel: 93, power: 72, finesse: 87, awareness: 87 },
  },
  TE1: {
    slotKey: 'TE',
    name: 'Two-Way Seam Hybrid TE1',
    pos: 'TE',
    jersey: 88,
    capHitM: 10.8,
    archetype: 'Complete In-Line / Seam Y-TE (6\'5" 256 lbs, 4.61 40)',
    bdbCombineBasis: 'BDB 2027 TE upper-quartile (4.61s 40, 1.56s 10y, 7.02s 3-cone)',
    scoutingNotes: 'Clears NFL edge-sealing threshold (BLK 86, PWR 86) while threatening Cover-2/3 seams at 84 SPD / 86 ACC.',
    throwerRating: 56,
    blockRating: 86,
    ratings: { speed: 84, accel: 86, power: 86, finesse: 85, awareness: 86 },
  },
  TE2: {
    slotKey: 'TE2',
    name: 'Heavy Wing Bulldozer TE2',
    pos: 'TE',
    jersey: 84,
    capHitM: 4.5,
    archetype: '6\'6" 268-lb H-Wing / Eligible 6th OL',
    bdbCombineBasis: 'BDB 2027 heavy TE/OL hybrid mass tier (268 lbs, 34.0" arms)',
    scoutingNotes: 'Market arbitrage in 12/21 packages: erases DEs and overhang safeties (BLK 89, PWR 88) while sneaking into red-zone flats.',
    throwerRating: 55,
    blockRating: 89,
    ratings: { speed: 81, accel: 83, power: 88, finesse: 81, awareness: 85 },
  },
  LT: {
    slotKey: 'LT',
    name: 'Franchise Blindside LT',
    pos: 'LT',
    jersey: 70,
    capHitM: 23.5,
    archetype: 'Long-Arm Blindside Anchor (Pillar #1 of 2)',
    bdbCombineBasis: 'Modeled on BDB 2027 Paris Johnson (6\'6" 313 lbs, 36.1" arms, 1.72s 10y)',
    scoutingNotes: 'True weakside island pass protector (BLK 91, FIN 91, PWR 89, AWR 89) enabling strongside slide protections.',
    throwerRating: 30,
    blockRating: 91,
    ratings: { speed: 75, accel: 81, power: 89, finesse: 91, awareness: 89 },
  },
  LG: {
    slotKey: 'LG',
    name: 'Core Interior Anchor LG',
    pos: 'LG',
    jersey: 69,
    capHitM: 13.8,
    archetype: 'Pro-Bowl Power Guard (6\'5" 326 lbs)',
    bdbCombineBasis: 'BDB 2027 Guard mass/anchor tier (326 lbs, 28+ bench reps)',
    scoutingNotes: 'Stonewalls 335-lb Bear NTs on A-left combos (PWR 90, BLK 89, AWR 87) and caves C-gaps on weak sweeps.',
    throwerRating: 30,
    blockRating: 89,
    ratings: { speed: 73, accel: 79, power: 90, finesse: 84, awareness: 87 },
  },
  C: {
    slotKey: 'C',
    name: 'Athletic Pull-Center C',
    pos: 'C',
    jersey: 51,
    capHitM: 5.4,
    archetype: 'High-Agility Reach/Pull Center (6\'3" 298 lbs)',
    bdbCombineBasis: 'BDB 2027 C athletic tier (1.74s 10y, 7.45s 3-cone, 9.7 yd/s Combine peak)',
    scoutingNotes: 'Elite lateral pull speed (SPD 80, ACC 86, FIN 86, AWR 87) for D-alley sweeps; lighter frame (PWR 82) needs LG combo help vs 0T NTs.',
    throwerRating: 30,
    blockRating: 86,
    ratings: { speed: 80, accel: 86, power: 82, finesse: 86, awareness: 87 },
  },
  RG: {
    slotKey: 'RG',
    name: 'Day-3 Developmental RG',
    pos: 'RG',
    jersey: 65,
    capHitM: 3.2,
    archetype: 'Second-Year Developmental RG (6\'4" 316 lbs)',
    bdbCombineBasis: 'BDB 2027 Day-3 Guard mean (5.17s 40, 315 lbs)',
    scoutingNotes: 'Solid drive power (PWR 84, BLK 83), lower blitz-pickup processing (AWR 82, FIN 82); protected by C-right slides & boot launches.',
    throwerRating: 30,
    blockRating: 83,
    ratings: { speed: 74, accel: 80, power: 84, finesse: 82, awareness: 82 },
  },
  RT: {
    slotKey: 'RT',
    name: 'Ascending Edge Tackle RT',
    pos: 'RT',
    jersey: 66,
    capHitM: 12.3,
    archetype: 'Year-4 Balanced Right Tackle (6\'6" 314 lbs)',
    bdbCombineBasis: 'BDB 2027 OT Combine tier (5.10s 40, 34.4" arms, 314 lbs)',
    scoutingNotes: 'Reliable pass-set edge & down-blocker (BLK 88, PWR 87, FIN 86, AWR 86) pairing cleanly with TE1/TE2 wings.',
    throwerRating: 30,
    blockRating: 88,
    ratings: { speed: 75, accel: 81, power: 87, finesse: 86, awareness: 86 },
  },
};

export const OMEGA_ACTIVE_11_CAP_M = +(
  OMEGA_2027_ROSTER.LT.capHitM +
  OMEGA_2027_ROSTER.LG.capHitM +
  OMEGA_2027_ROSTER.C.capHitM +
  OMEGA_2027_ROSTER.RG.capHitM +
  OMEGA_2027_ROSTER.RT.capHitM +
  OMEGA_2027_ROSTER.QB1.capHitM +
  OMEGA_2027_ROSTER.RB1.capHitM +
  OMEGA_2027_ROSTER.WR1.capHitM +
  OMEGA_2027_ROSTER.WR2.capHitM +
  OMEGA_2027_ROSTER.SL.capHitM +
  OMEGA_2027_ROSTER.TE1.capHitM
).toFixed(1); // 119.8M

export const OMEGA_12PERS_CAP_M = +(
  OMEGA_ACTIVE_11_CAP_M - OMEGA_2027_ROSTER.SL.capHitM + OMEGA_2027_ROSTER.TE2.capHitM
).toFixed(1); // 117.4M

export const OMEGA_21PERS_CAP_M = +(
  OMEGA_ACTIVE_11_CAP_M - OMEGA_2027_ROSTER.WR2.capHitM + OMEGA_2027_ROSTER.TE2.capHitM
).toFixed(1); // 119.5M

export const OMEGA_2027_TEAM_ENTRY = {
  id: 'OMG',
  city: 'Philadelphia',
  name: '2027 OMEGA ($119.8M)',
  fullName: '2027 OMEGA Continuum ($117.4M-$119.8M Active 11)',
  offense: [
    { id: 'QB', label: 'QB', name: OMEGA_2027_ROSTER.QB1.name, scouting: { jersey: 7, ovr: 85 }, ratings: { spd: 89, acc: 90, str: 85, btk_power: 86, agi: 87, tha_short: 84, pre_snap_read: 83 } },
    { id: 'RB', label: 'RB', name: OMEGA_2027_ROSTER.RB1.name, scouting: { jersey: 24, ovr: 84 }, ratings: { spd: 92, acc: 93, str: 76, btk_power: 82, agi: 89, elusiveness: 87, pre_snap_read: 83 } },
    { id: 'WR1', label: 'WR', name: OMEGA_2027_ROSTER.WR1.name, scouting: { jersey: 11, ovr: 91 }, ratings: { spd: 91, acc: 93, str: 72, rbk_power: 60, agi: 93, rr_short: 93, pre_snap_read: 91 } },
    { id: 'WR2', label: 'WR', name: OMEGA_2027_ROSTER.WR2.name, scouting: { jersey: 83, ovr: 83 }, ratings: { spd: 96, acc: 95, str: 64, rbk_power: 54, agi: 86, rr_short: 83, pre_snap_read: 81 } },
    { id: 'SLOT', label: 'SL', name: OMEGA_2027_ROSTER.SL.name, scouting: { jersey: 18, ovr: 85 }, ratings: { spd: 92, acc: 93, str: 72, rbk_power: 73, agi: 90, rr_short: 87, pre_snap_read: 87 } },
    { id: 'TE', label: 'TE', name: OMEGA_2027_ROSTER.TE1.name, scouting: { jersey: 88, ovr: 87 }, ratings: { spd: 84, acc: 86, str: 86, rbk_power: 86, agi: 83, rr_short: 85, pre_snap_read: 86 } },
    { id: 'LT', label: 'LT', name: OMEGA_2027_ROSTER.LT.name, scouting: { jersey: 70, ovr: 91 }, ratings: { spd: 75, acc: 81, str: 90, pbk_anchor: 91, rbk_power: 89, agi: 84, pbk_lateral: 91, rbk_reach: 90 } },
    { id: 'LG', label: 'LG', name: OMEGA_2027_ROSTER.LG.name, scouting: { jersey: 69, ovr: 88 }, ratings: { spd: 73, acc: 79, str: 92, pbk_anchor: 89, rbk_power: 90, agi: 78, pbk_lateral: 84, rbk_reach: 85 } },
    { id: 'C', label: 'C', name: OMEGA_2027_ROSTER.C.name, scouting: { jersey: 51, ovr: 84 }, ratings: { spd: 80, acc: 86, str: 81, pbk_anchor: 82, rbk_power: 82, agi: 88, pbk_lateral: 87, rbk_reach: 88 } },
    { id: 'RG', label: 'RG', name: OMEGA_2027_ROSTER.RG.name, scouting: { jersey: 65, ovr: 81 }, ratings: { spd: 74, acc: 80, str: 84, pbk_anchor: 83, rbk_power: 84, agi: 79, pbk_lateral: 82, rbk_reach: 83 } },
    { id: 'RT', label: 'RT', name: OMEGA_2027_ROSTER.RT.name, scouting: { jersey: 66, ovr: 87 }, ratings: { spd: 75, acc: 81, str: 88, pbk_anchor: 88, rbk_power: 87, agi: 82, pbk_lateral: 86, rbk_reach: 87 } },
  ],
  defense: [
    { id: 'LDE', label: 'DE', name: 'Omega Reinvested DE1', scouting: { jersey: 55, ovr: 88 }, ratings: { spd: 86, acc: 88, str: 86, rush_power: 88, rush_speed: 88, bsh_shed: 87 } },
    { id: 'DT1', label: 'NT', name: 'Omega Anchor NT', scouting: { jersey: 98, ovr: 88 }, ratings: { spd: 73, acc: 79, str: 92, rush_power: 90, rush_speed: 78, bsh_shed: 88 } },
    { id: 'DT2', label: 'DT', name: 'Omega 3-Tech DT', scouting: { jersey: 90, ovr: 88 }, ratings: { spd: 79, acc: 84, str: 89, rush_power: 89, rush_speed: 86, bsh_shed: 87 } },
    { id: 'RDE', label: 'EDGE', name: 'Omega Edge2', scouting: { jersey: 58, ovr: 87 }, ratings: { spd: 86, acc: 88, str: 85, rush_power: 85, rush_speed: 88, bsh_shed: 86 } },
    { id: 'WLB', label: 'WILL', name: 'Omega Range Will', scouting: { jersey: 53, ovr: 86 }, ratings: { spd: 88, acc: 89, str: 82, tak_hit_power: 86, cov_man: 82, cov_zone: 86 } },
    { id: 'MLB', label: 'MIKE', name: 'Omega Green-Dot Mike', scouting: { jersey: 54, ovr: 86 }, ratings: { spd: 86, acc: 88, str: 84, tak_hit_power: 87, cov_man: 81, cov_zone: 86 } },
    { id: 'NCB', label: 'NI', name: 'Omega Slot Nickel', scouting: { jersey: 27, ovr: 87 }, ratings: { spd: 90, acc: 91, str: 73, tak_hit_power: 82, cov_man: 87, cov_zone: 87 } },
    { id: 'CB1', label: 'CB', name: 'Omega Boundary CB1', scouting: { jersey: 22, ovr: 89 }, ratings: { spd: 92, acc: 92, str: 69, tak_hit_power: 76, cov_man: 89, cov_zone: 88 } },
    { id: 'CB2', label: 'CB', name: 'Omega Field CB2', scouting: { jersey: 29, ovr: 86 }, ratings: { spd: 91, acc: 91, str: 68, tak_hit_power: 75, cov_man: 86, cov_zone: 86 } },
    { id: 'SS', label: 'SS', name: 'Omega Strong Safety', scouting: { jersey: 21, ovr: 87 }, ratings: { spd: 89, acc: 90, str: 79, tak_hit_power: 87, cov_man: 84, cov_zone: 88 } },
    { id: 'FS', label: 'FS', name: 'Omega Free Safety', scouting: { jersey: 32, ovr: 88 }, ratings: { spd: 90, acc: 91, str: 72, tak_hit_power: 82, cov_man: 85, cov_zone: 90 } },
  ],
};

function makeOmegaAgent(
  id: string,
  pos: string,
  player: OmegaRosterPlayer,
  x: number,
  y: number,
  role: BlockRoleType,
  gapOrSet: GapOrSetCode,
  primaryTargetId: string | null = null,
  secondaryTargetId: string | null = null,
  leverage: LeverageBias = 'INSIDE_OUT',
  waypoints: Waypoint2D[] = [],
  readOrder?: number,
  climbOrChipDelaySec = 0.45
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

function buildOmegaOL(
  ltCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  lgCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  cCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  rgCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  rtCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?]
): SimAgent[] {
  const R = OMEGA_2027_ROSTER;
  return [
    makeOmegaAgent('LT', 'LT', R.LT, -3.2, -0.4, ltCfg[0], ltCfg[1], ltCfg[2], ltCfg[3], ltCfg[4], ltCfg[5] || []),
    makeOmegaAgent('LG', 'LG', R.LG, -1.6, -0.3, lgCfg[0], lgCfg[1], lgCfg[2], lgCfg[3], lgCfg[4], lgCfg[5] || []),
    makeOmegaAgent('C', 'C', R.C, 0.0, -0.2, cCfg[0], cCfg[1], cCfg[2], cCfg[3], cCfg[4], cCfg[5] || []),
    makeOmegaAgent('RG', 'RG', R.RG, 1.6, -0.3, rgCfg[0], rgCfg[1], rgCfg[2], rgCfg[3], rgCfg[4], rgCfg[5] || []),
    makeOmegaAgent('RT', 'RT', R.RT, 3.2, -0.4, rtCfg[0], rtCfg[1], rtCfg[2], rtCfg[3], rtCfg[4], rtCfg[5] || []),
  ];
}

// ============================================================================
// 2. "2027 OMEGA CONTINUUM" — 8-PLAY BDB-2027-ENGINEERED OFFENSE
//    100.00% Strictly Legal NFL Formations (7 on LOS w/ Uncovered Ends,
//    <= +1.0y Ineligible OL Pass Buffer, Strictly Backward Laterals)
// ============================================================================
export const OMEGA_2027_PLAYBOOK: OmegaPlayDefinition[] = [
  // PLAY 1: DISPLACED ORBIT LASER (21 OMEGA - $119.5M)
  {
    id: 'OMEGA_DISPLACED_ORBIT_LASER',
    name: 'OMEGA // DISPLACED ORBIT LASER CONTINUUM',
    category: 'RUN',
    personnel: '21 OMEGA',
    situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
    situationBadge: 'ORBIT LASER',
    menuBuckets: ['OPEN_FIELD', 'TWO_MINUTE'],
    featuredDefense: 'NICKEL_SIM_C2',
    firstPrinciplesThesis:
      'Exploits BDB 2027\'s 1.01s edge get-off constraint: QB1 tosses backward (-0.70y) at t=0.18s to orbiting former-QB SL (throwerRating 78) behind pulling athletic C (SPD 80) and Heavy TE2 (BLK 89) pinning the C-gap edge — displacing the pocket 11 yards right while RB1 flares wheel and TE1/WR1 attack high-separation Zone/Man voids.',
    protectsFlawNote:
      'Zero static pass-pro island for developmental RG or light RB1; C stays <= +0.65y in the alley during option window so OL legality holds at 100.00%.',
    buildOffense: () => {
      const R = OMEGA_2027_ROSTER;
      const ol = buildOmegaOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT'],
        ['PASS_SET', 'A_LEFT', 'NT', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 3.5, y: -1.1 },
            { x: 7.4, y: -0.4 },
            { x: 10.6, y: 0.65 },
          ],
        ],
        ['PASS_SET', 'B_RIGHT', '3T', null, 'INSIDE_OUT'],
        ['PASS_SET', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT']
      );

      // 7 on LOS w/ uncovered ends: WR1 (-14.8, -0.35), 5 OL, TE1 (+5.0, -0.35)
      const wr1 = makeOmegaAgent(
        'WR1',
        'WR',
        R.WR1,
        -14.8,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: -12.5, y: 11.2 },
          { x: -4.2, y: 16.8 },
        ],
        2
      );
      const te = makeOmegaAgent(
        'TE',
        'TE',
        R.TE1,
        5.0,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: 6.5, y: 6.8 },
          { x: 12.2, y: 15.6 },
        ],
        1
      );
      const te2 = makeOmegaAgent('WR2', 'TE', R.TE2, 4.2, -1.15, 'MAN_BLOCK', 'C_RIGHT', 'ROLB', 'LDE', 'INSIDE_OUT');
      const rb = makeOmegaAgent(
        'RB',
        'RB',
        R.RB1,
        1.8,
        -4.4,
        'ROUTE',
        'D_ALLEY',
        null,
        null,
        'NEUTRAL',
        [
          { x: 15.2, y: 3.5 },
          { x: 19.2, y: 14.5 },
        ],
        3
      );

      const qb = makeOmegaAgent('QB', 'QB', R.QB1, 0.0, -2.85, 'QB_DROP', 'C_LEFT', null, null, 'NEUTRAL', [
        { x: -4.5, y: -4.0 },
      ]);
      qb.backwardToss = {
        enabled: true,
        tossTimeSec: 0.18,
        recipientId: 'SL',
        postTossRole: 'ROUTE',
        postTossWaypoints: [
          { x: -6.8, y: -2.8 },
          { x: -9.5, y: 4.5 },
        ],
      };

      const sl = makeOmegaAgent('SL', 'SL', R.SL, -0.8, -3.55, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 7.4, y: -2.4 },
        { x: 11.4, y: 1.5 },
        { x: 14.8, y: 14.2 },
      ]);
      sl.vx = 5.95;
      sl.preSnapMotion = {
        enabled: true,
        type: 'ORBIT',
        speed: 5.95,
        dirX: 1.0,
        dirY: -0.05,
        originX: -7.8,
        originY: -1.55,
        snapX: -0.8,
        snapY: -3.55,
      };
      sl.optionPass = {
        enabled: true,
        throwerRating: R.SL.throwerRating,
        decisionWindowStartSec: 1.10,
        decisionWindowEndSec: 1.72,
        primaryReceiverId: 'TE',
        secondaryReceiverId: 'WR1',
        separationThresholdYds: 2.85,
      };

      return [...ol, wr1, te, te2, rb, qb, sl];
    },
  },

  // PLAY 2: CHIRAL JET SWEEP OPTION LEFT (12 OMEGA - $117.4M)
  {
    id: 'OMEGA_CHIRAL_JET_OPTION',
    name: 'OMEGA // CHIRAL JET-LEFT OPTION CONTINUUM',
    category: 'RUN',
    personnel: '12 OMEGA',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: 'CHIRAL JET-L',
    menuBuckets: ['OPEN_FIELD', 'FOUR_MINUTE'],
    featuredDefense: 'NICKEL_OVER_C3',
    firstPrinciplesThesis:
      'Full-speed pre-snap jet motion (5.95 yd/s) + 0.18s backward toss to SL sweeping weakside left behind athletic C puller and Heavy Wing TE2 (BLK 89), while TE1 seals/releases into the seam-flat and WR1 attacks the deep corner — punishing both Cover-3 overhang pursuit and Cover-1 blitzes.',
    protectsFlawNote:
      'Uses C\'s 1.74s-10y burst in space instead of 1v1 NT anchor; keeps all OL pass-buffer legal <= +0.65y during SL\'s pass-or-tuck window.',
    buildOffense: () => {
      const R = OMEGA_2027_ROSTER;
      const ol = buildOmegaOL(
        ['PASS_SET', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'],
        ['PASS_SET', 'A_LEFT', 'NT', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'C_LEFT',
          'WILL',
          null,
          'OUTSIDE_IN',
          [
            { x: -2.8, y: -1.1 },
            { x: -6.4, y: -0.4 },
            { x: -9.0, y: 0.65 },
          ],
        ],
        ['PASS_SET', 'B_RIGHT', '3T', null, 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      // 7 on LOS w/ uncovered ends: WR1 (-14.5, -0.35), 5 OL, WR2 (+14.5, -0.35)
      const wr1 = makeOmegaAgent('WR1', 'WR', R.WR1, -14.5, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -16.8, y: 6.2 },
        { x: -21.0, y: 12.2 },
        { x: -21.8, y: 18.0 },
      ], 1);
      const wr2 = makeOmegaAgent('WR2', 'WR', R.WR2, 14.5, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 12.5, y: 9.0 },
        { x: 4.5, y: 16.5 },
      ], 2);

      // Off-LOS wing TE1 (BLK 86) chips NCB/edge for 0.36s then leaks seam-flat left
      const te = makeOmegaAgent(
        'TE',
        'TE',
        R.TE1,
        -5.2,
        -1.08,
        'CHIP_RELEASE',
        'C_LEFT',
        'NCB',
        null,
        'INSIDE_OUT',
        [
          { x: -9.8, y: 5.5 },
          { x: -13.5, y: 11.2 },
        ],
        2,
        0.36
      );
      // Off-LOS Heavy TE2 (BLK 89) leads C/D alley left to clear overhang safety/CB
      const rb = makeOmegaAgent('RB', 'TE', R.TE2, -2.2, -3.7, 'PULL_LEAD', 'D_ALLEY', 'FS', null, 'OUTSIDE_IN', [
        { x: -5.8, y: -1.6 },
        { x: -8.8, y: 0.7 },
        { x: -10.8, y: 4.5 },
      ]);

      const qb = makeOmegaAgent('QB', 'QB', R.QB1, 0.0, -3.9, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
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

      const sl = makeOmegaAgent('SL', 'SL', R.SL, 0.6, -4.5, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: -5.8, y: -3.2 },
        { x: -9.4, y: -0.9 },
        { x: -11.4, y: 4.5 },
        { x: -12.5, y: 18.0 },
      ]);
      sl.vx = -5.95;
      sl.preSnapMotion = {
        enabled: true,
        type: 'JET_LEFT',
        speed: 5.95,
        dirX: -1.0,
        dirY: -0.05,
        originX: 8.6,
        originY: -2.2,
        snapX: 0.6,
        snapY: -4.5,
      };
      sl.optionPass = {
        enabled: true,
        throwerRating: R.SL.throwerRating,
        decisionWindowStartSec: 0.90,
        decisionWindowEndSec: 1.48,
        primaryReceiverId: 'WR1',
        secondaryReceiverId: 'TE',
        separationThresholdYds: 3.35,
      };

      return [...ol, wr1, wr2, te, rb, qb, sl];
    },
  },

  // PLAY 3: ORBIT GLANCE-SAIL TRIANGLE (11 OMEGA - $119.8M)
  {
    id: 'OMEGA_ORBIT_GLANCE_FLOOD',
    name: 'OMEGA // ORBIT GLANCE-SAIL TRIANGLE (HOT RELIEF)',
    category: 'PASS',
    personnel: '11 OMEGA',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: 'ORBIT GLANCE',
    menuBuckets: ['OPEN_FIELD', 'TWO_MINUTE'],
    featuredDefense: 'NICKEL_OVER_C3',
    firstPrinciplesThesis:
      'Orbit motion forces pre-snap coverage declarations while pairing BDB 2027\'s top zone-void separation routes: WR1 11.4y Glance/Dig, SL 4.8y Orbit Hot Flare, and TE1 0.36s LDE-chip into 5.5y sit.',
    protectsFlawNote:
      'Half-slide protection right + RB1 A-gap scan shields developmental RG; dual <= 5.5y hot outlets eliminate pressure spikes.',
    buildOffense: () => {
      const R = OMEGA_2027_ROSTER;
      const ol = buildOmegaOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'OUTSIDE_IN'],
        ['PASS_SET', 'A_LEFT', 'NT', 'WILL', 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', 'MIKE', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', 'MIKE', 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      const wr1 = makeOmegaAgent('WR1', 'WR', R.WR1, -14.8, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -14.0, y: 8.2 },
        { x: -4.2, y: 11.4 },
      ], 1);
      const wr2 = makeOmegaAgent('WR2', 'WR', R.WR2, 15.2, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 15.0, y: 9.5 },
        { x: 12.2, y: 14.6 },
      ], 4);
      const te = makeOmegaAgent('TE', 'TE', R.TE1, 4.9, -1.08, 'CHIP_RELEASE', 'C_RIGHT', 'LDE', null, 'OUTSIDE_IN', [
        { x: 3.4, y: 4.5 },
        { x: 1.5, y: 5.5 },
      ], 3, 0.36);

      const sl = makeOmegaAgent('SL', 'SL', R.SL, -1.2, -2.45, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: -7.5, y: -0.5 },
        { x: -13.2, y: 3.8 },
        { x: -15.5, y: 4.8 },
      ], 2);
      sl.vx = -6.0;
      sl.preSnapMotion = {
        enabled: true,
        type: 'JET_LEFT',
        speed: 6.0,
        dirX: -1.0,
        dirY: -0.04,
        originX: 7.8,
        originY: -1.55,
        snapX: -1.2,
        snapY: -2.45,
      };

      const qb = makeOmegaAgent('QB', 'QB', R.QB1, 0.0, -4.85, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -0.4, y: -6.5 },
      ]);
      const rb = makeOmegaAgent('RB', 'RB', R.RB1, 1.25, -4.85, 'MAX_PROTECT_SCAN', 'A_RIGHT', 'WILL', 'MIKE', 'INSIDE_OUT', [
        { x: 6.2, y: 2.2 },
      ], 5);

      return [...ol, wr1, wr2, te, sl, qb, rb];
    },
  },

  // PLAY 4: 0.64s FLASH PA HALF-ROLL BOOT CROSS (12 OMEGA - $117.4M)
  {
    id: 'OMEGA_064S_FLASH_PA_BOOT',
    name: 'OMEGA // 0.64s FLASH PA BOOT CROSS',
    category: 'PASS',
    personnel: '12 OMEGA',
    situations: ['1ST_10', 'RED_ZONE'],
    situationBadge: '0.64s PA BOOT',
    menuBuckets: ['OPEN_FIELD', 'FOUR_MINUTE'],
    featuredDefense: 'NICKEL_SIM_C2',
    firstPrinciplesThesis:
      'Calibrated to BDB 2027\'s PA & route separation findings: a compressed 0.45s flash mesh still triggers downhill LB reaction while launching QB1 outside the pocket behind Heavy TE2 (BLK 89), feeding CROSS (WR1 11.4y), CORNER/OVER (WR2 14.8y), and FLAT (TE1 5.0y).',
    protectsFlawNote:
      'Launches QB1 outside developmental RG (+5.6x, -6.1y) behind TE2\'s A_RIGHT blitz scan and narrows progression to a 3-level half-field stack for QB1 (AWR 83).',
    buildOffense: () => {
      const R = OMEGA_2027_ROSTER;
      const ol = buildOmegaOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'OUTSIDE_IN'],
        ['PASS_SET', 'ANGLE_45', 'NT', 'WILL', 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'WILL', 'NT', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', 'MIKE', 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      const wr1 = makeOmegaAgent('WR1', 'WR', R.WR1, -14.5, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -9.5, y: 8.0 },
        { x: 5.5, y: 11.4 },
      ], 1);
      const wr2 = makeOmegaAgent('WR2', 'WR', R.WR2, 15.0, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 16.5, y: 10.5 },
        { x: 22.0, y: 14.8 },
      ], 3);
      const te = makeOmegaAgent('TE', 'TE', R.TE1, 4.8, -1.05, 'CHIP_RELEASE', 'C_RIGHT', 'LDE', null, 'OUTSIDE_IN', [
        { x: 11.0, y: 4.0 },
        { x: 18.0, y: 5.0 },
      ], 2, 0.38);
      const sl = makeOmegaAgent('SL', 'TE', R.TE2, 2.2, -1.45, 'MAX_PROTECT_SCAN', 'A_RIGHT', 'WILL', 'MIKE', 'INSIDE_OUT', [
        { x: 4.8, y: 1.5 },
      ], 4);

      const qb = makeOmegaAgent('QB', 'QB', R.QB1, 0.0, -4.75, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 5.6, y: -6.1 },
      ]);
      qb.playAction = {
        enabled: true,
        meshDurationSec: 0.45,
        fakeCarrierId: 'RB',
        fakeGap: 'A_LEFT',
        isBootleg: true,
        bootDirection: 'RIGHT',
      };

      const rb = makeOmegaAgent('RB', 'RB', R.RB1, -1.4, -4.9, 'MAX_PROTECT_SCAN', 'A_LEFT', 'MIKE', 'WILL', 'INSIDE_OUT', [
        { x: -1.8, y: -1.6 },
      ], 4);

      return [...ol, wr1, wr2, te, sl, qb, rb];
    },
  },

  // PLAY 5: 3RD & 9 SWITCH-MESH & STICKS FIN (11 OMEGA - $119.8M)
  {
    id: 'OMEGA_3RD9_SWITCH_STICKS',
    name: 'OMEGA // 3RD & 9 SWITCH-MESH & STICKS',
    category: 'PASS',
    personnel: '11 OMEGA',
    situations: ['3RD_LONG', '1ST_10'],
    situationBadge: '3RD & 9 MESH',
    menuBuckets: ['THIRD_LONG', 'OPEN_FIELD'],
    featuredDefense: 'VIKINGS_MUG_CROSSDOG_C0',
    firstPrinciplesThesis:
      'Designed specifically to beat Dime Quarters Match & Mug Cross-Dog C0 on 3rd & 7-11: TE1 sniffer picks up A-gap muggers while SL (5.2y shallow mesh) and RB1 (3.2y weak swing) create dual <= 5.5y hot relief for WR1\'s 12.6y Sticks Dig.',
    protectsFlawNote:
      'Never asks RB1 (BLK 66) to block a 250-lb blitzing linebacker 1v1; substitutes TE1 (BLK 86) inside while turning RB1 into an instant flat check.',
    buildOffense: () => {
      const R = OMEGA_2027_ROSTER;
      const ol = buildOmegaOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'OUTSIDE_IN'],
        ['PASS_SET', 'A_LEFT', 'NT', 'WILL', 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'WILL', 'NT', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', 'MIKE', 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      const wr1 = makeOmegaAgent('WR1', 'WR', R.WR1, -14.5, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -13.5, y: 11.0 },
        { x: -3.0, y: 12.6 },
      ], 1);
      const wr2 = makeOmegaAgent('WR2', 'WR', R.WR2, 15.0, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.0, y: 9.8 },
        { x: 11.5, y: 14.3 },
      ], 4);
      const sl = makeOmegaAgent('SL', 'SL', R.SL, 6.2, -1.05, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 0.5, y: 4.5 },
        { x: -8.5, y: 5.2 },
        { x: -14.5, y: 6.0 },
      ], 2);
      const te = makeOmegaAgent('TE', 'TE', R.TE1, 2.4, -1.55, 'MAX_PROTECT_SCAN', 'A_RIGHT', 'WILL', 'MIKE', 'INSIDE_OUT', [
        { x: 4.8, y: 5.5 },
      ], 3);

      const qb = makeOmegaAgent('QB', 'QB', R.QB1, 0.0, -4.9, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -0.3, y: -6.6 },
      ]);
      const rb = makeOmegaAgent('RB', 'RB', R.RB1, -1.8, -4.8, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: -7.5, y: 0.6 },
        { x: -13.0, y: 3.2 },
      ], 3);

      return [...ol, wr1, wr2, sl, te, qb, rb];
    },
  },

  // PLAY 6: 2-MINUTE DUAL SIDELINE OOB LASER (11 OMEGA - $119.8M)
  {
    id: 'OMEGA_2MIN_BOUNDARY_OOB',
    name: 'OMEGA // 2-MIN BOUNDARY OUT-STRETCH (OOB)',
    category: 'PASS',
    personnel: '11 OMEGA',
    situations: ['1ST_10', '3RD_LONG'],
    situationBadge: '2-MIN OOB',
    menuBuckets: ['TWO_MINUTE', 'THIRD_LONG'],
    featuredDefense: 'DIME_QUARTERS_MATCH',
    firstPrinciplesThesis:
      'Dual horizontal sideline attack under 2-minute clock pressure: WR1 runs a crisp 13.8y Boundary Out (-24.4x) paired with SL\'s 5.8y Right Whip-Out (+23.8x) and TE1\'s 0.34s RDE chip into a 5.4y Left Sideline Flare (-23.0x).',
    protectsFlawNote:
      'Two <= 5.8y sideline OOB valves neutralize Dime Mug Cover-0 blitzes while RB1 scans A-gap.',
    buildOffense: () => {
      const R = OMEGA_2027_ROSTER;
      const ol = buildOmegaOL(
        ['PASS_SET', 'C_LEFT', 'RDE', null, 'OUTSIDE_IN'],
        ['PASS_SET', 'A_LEFT', 'NT', 'WILL', 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', 'MIKE', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', null, 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      const wr1 = makeOmegaAgent('WR1', 'WR', R.WR1, -16.2, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -16.2, y: 12.6 },
        { x: -24.4, y: 13.8 },
      ], 1);
      const wr2 = makeOmegaAgent('WR2', 'WR', R.WR2, 16.5, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 17.5, y: 10.5 },
        { x: 24.0, y: 14.2 },
      ], 3);
      const sl = makeOmegaAgent('SL', 'SL', R.SL, 9.5, -1.05, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: 11.5, y: 5.0 },
        { x: 23.8, y: 5.8 },
      ], 2);
      const te = makeOmegaAgent('TE', 'TE', R.TE1, -5.0, -1.10, 'CHIP_RELEASE', 'D_ALLEY', 'RDE', null, 'OUTSIDE_IN', [
        { x: -13.5, y: 4.2 },
        { x: -23.0, y: 5.4 },
      ], 4, 0.34);

      const qb = makeOmegaAgent('QB', 'QB', R.QB1, 0.0, -4.85, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -0.4, y: -6.5 },
      ]);
      const rb = makeOmegaAgent('RB', 'RB', R.RB1, 1.2, -4.85, 'MAX_PROTECT_SCAN', 'A_LEFT', 'WILL', 'MIKE', 'INSIDE_OUT', [
        { x: 6.5, y: 2.2 },
      ], 5);

      return [...ol, wr1, wr2, sl, te, qb, rb];
    },
  },

  // PLAY 7: 11-ON-11 RHINO PIN-AND-PULL QB SWEEP LEFT (12 OMEGA - $117.4M)
  {
    id: 'OMEGA_11V11_RHINO_PIN_PULL',
    name: 'OMEGA // 11v11 RHINO PIN-PULL QB SWEEP',
    category: 'RUN',
    personnel: '12 OMEGA',
    situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
    situationBadge: '4-MIN RHINO',
    menuBuckets: ['OPEN_FIELD', 'FOUR_MINUTE'],
    featuredDefense: 'BASE_43_OVER_C1',
    firstPrinciplesThesis:
      'Weaponizes 11-on-11 run math for 4-minute clock control and heavy 8-man fronts: RB1 runs a hard right counter dive fake while Heavy TE2 (BLK 89), LG (PWR 90), and athletic C (SPD 80) clear the left perimeter for QB1 (SPD 89, PWR 86).',
    protectsFlawNote:
      'Turns C\'s lateral athleticism into a lead-blocking weapon while keeping developmental RG anchored on interior down-blocks.',
    buildOffense: () => {
      const R = OMEGA_2027_ROSTER;
      const ol = buildOmegaOL(
        ['MAN_BLOCK', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'],
        ['COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'],
        [
          'PULL_LEAD',
          'C_LEFT',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: -2.8, y: -1.1 },
            { x: -5.8, y: -0.2 },
            { x: -7.5, y: 2.8 },
            { x: -8.2, y: 6.5 },
          ],
        ],
        ['MAN_BLOCK', 'B_RIGHT', '3T', null, 'INSIDE_OUT'],
        ['MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT']
      );

      const wr1 = makeOmegaAgent('WR1', 'WR', R.WR1, -14.5, -0.35, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
      const te = makeOmegaAgent('TE', 'TE', R.TE1, 4.8, -0.35, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT');
      const wr2 = makeOmegaAgent('WR2', 'WR', R.WR2, 14.5, -1.05, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.5, y: 12.0 },
      ]);
      const sl = makeOmegaAgent('SL', 'TE', R.TE2, -4.6, -1.10, 'MAN_BLOCK', 'C_LEFT', 'LOLB', 'RDE', 'INSIDE_OUT');

      const rb = makeOmegaAgent('RB', 'RB', R.RB1, -1.2, -4.8, 'PULL_LEAD', 'A_RIGHT', 'MIKE', 'LDE', 'INSIDE_OUT', [
        { x: 1.5, y: -1.2 },
        { x: 2.5, y: 1.5 },
      ]);
      const qb = makeOmegaAgent('QB', 'QB', R.QB1, 0.0, -3.9, 'BALL_CARRIER', 'C_LEFT', null, null, 'NEUTRAL', [
        { x: -4.8, y: -1.6 },
        { x: -7.6, y: 1.8 },
        { x: -8.2, y: 7.5 },
        { x: -8.0, y: 14.0 },
      ]);

      return [...ol, wr1, wr2, te, sl, rb, qb];
    },
  },

  // PLAY 8: LOW RED ZONE +4y HEAVY WING SPRINT SMASH (12 OMEGA - $117.4M)
  {
    id: 'OMEGA_GOALLINE_SPRINT_SMASH',
    name: 'OMEGA // GL +4y HEAVY WING SPRINT SMASH',
    category: 'PASS',
    personnel: '12 OMEGA',
    situations: ['RED_ZONE', '3RD_SHORT'],
    situationBadge: 'GL +4y SMASH',
    menuBuckets: ['GOAL_LINE'],
    featuredDefense: 'GOAL_LINE_62_PINCH',
    firstPrinciplesThesis:
      'Engineered for 1st & Goal from +4.0y vs 6-2 Pinch & Cross-Dog Cover 0: a 0.36s RB A-gap flash freeze sucks interior defenders inward while QB1 sprints right behind TE2 (BLK 89) to hit TE1 on the +5.1y pylon corner or WR1 on the back-pylon drag.',
    protectsFlawNote:
      'Out-leverages 6-2 box density laterally into the +9x..+14x boundary corner while keeping RB1 on interior scan rather than 1v1 edge blocking.',
    buildOffense: () => {
      const R = OMEGA_2027_ROSTER;
      const ol = buildOmegaOL(
        ['PASS_SET', 'C_LEFT', 'DE_L', null, 'OUTSIDE_IN'],
        ['PASS_SET', 'A_LEFT', 'NT_L', null, 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT_L', 'NT_R', 'INSIDE_OUT'],
        ['PASS_SET', 'A_RIGHT', 'NT_R', 'DT_R', 'INSIDE_OUT'],
        ['PASS_SET', 'B_RIGHT', 'DT_R', 'DE_R', 'INSIDE_OUT']
      );

      const w1 = makeOmegaAgent('WR1', 'WR', R.WR1, -14.5, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -3.0, y: 3.4 },
        { x: 9.8, y: 4.6 },
      ], 2);
      const wr2 = makeOmegaAgent('WR2', 'WR', R.WR2, 14.8, -0.35, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.5, y: 2.8 },
        { x: 17.8, y: 4.9 },
      ], 3);
      const sl = makeOmegaAgent('SL', 'TE', R.TE2, 3.4, -1.15, 'MAX_PROTECT_SCAN', 'C_RIGHT', 'DE_R', 'DT_R', 'INSIDE_OUT', [
        { x: 5.5, y: -0.6 },
      ]);
      const te = makeOmegaAgent('TE', 'TE', R.TE1, 5.0, -1.15, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: 7.5, y: 2.8 },
        { x: 11.8, y: 5.1 },
      ], 1);

      const qb = makeOmegaAgent('QB', 'QB', R.QB1, 0.0, -4.35, 'QB_DROP', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: 5.6, y: -4.9 },
      ]);
      qb.playAction = {
        enabled: true,
        meshDurationSec: 0.36,
        fakeCarrierId: 'RB',
        fakeGap: 'A_LEFT',
        isBootleg: true,
        bootDirection: 'RIGHT',
      };

      const rb = makeOmegaAgent('RB', 'RB', R.RB1, -1.2, -4.55, 'MAX_PROTECT_SCAN', 'A_LEFT', 'NT_R', 'WILL', 'INSIDE_OUT', [
        { x: -1.5, y: -1.0 },
      ], 4);

      return [...ol, sl, wr2, te, w1, qb, rb];
    },
  },
];
