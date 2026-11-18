import {
  SimAgent,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
  Waypoint2D,
} from './engine.js';

export interface ApexRosterPlayer {
  slotKey: string;
  name: string;
  pos: string;
  jersey: number;
  capHitM: number;
  archetype: string;
  scoutingNotes: string;
  howieValueThesis: string;
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

export interface ApexPlayDefinition {
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
// 1. "2027 PHILADELPHIA APEX CONTINUUM" — REALISTIC NON-ALL-STAR ROSTER
//    Designed with GM Howie Roseman within Honest NFL Resource Constraints
//    - Only TWO $20M+ marquee starters on offense (LT $24.0M, WR1 $22.5M)
//    - Active 11 Cap on Field:
//        11 APEX: $122.9M  (Saves $15.6M vs Conv-11 $138.5M | $23.1M vs Shanahan-12 $146.0M)
//        12 APEX: $120.2M  (TE2 $4.8M replaces SL $7.5M)
//        21 APEX: $122.5M  (TE2 $4.8M replaces WR2 $5.2M, keeps SL)
//    - Explicit Player Flaws (no 95-OVR All-Star cheating):
//        QB1 ($14.5M): Mid-market dual-threat (AWR 83, THA 84) -> protected via half-field reads & boots
//        C ($5.5M): Undersized athletic puller (PWR 82) -> needs combo-climb help vs 335-lb NT
//        RG ($3.4M): Day-3 developmental starter (BLK 83, AWR 82) -> protected by half-slides & chips
//        RB1 ($3.8M): Explosive R2 runner (BLK 66) -> liability in 1v1 pass pro vs blitzers
//        WR2 ($5.2M): Raw vertical speed (FIN 83, AWR 81, BLK 54) -> single-job lid-lifter
//        SL ($7.5M): Swiss-army former college QB (throwerRating 75) -> space/orbit weapon
// ============================================================================
export const APEX_2027_ROSTER: Record<string, ApexRosterPlayer> = {
  QB1: {
    slotKey: 'QB',
    name: 'M. Willis-Archetype QB1',
    pos: 'QB',
    jersey: 7,
    capHitM: 14.5,
    archetype: 'Mid-Market Dual-Threat Trigger (6\'1" 225 lbs, 4.49 40)',
    scoutingNotes: 'Athletic edge/counter runner (SPD 88, PWR 85), live off-platform arm (THA 84), but slower full-field 4-read processor (AWR 83).',
    howieValueThesis: 'Saves ~$40M/yr over static $55M pocket surgeons. APEX narrows progressions to binary triangle reads, shortens PA boot meshes (0.68s), and weaponizes 11-on-11 QB counter geometry.',
    throwerRating: 84,
    blockRating: 50,
    ratings: { speed: 88, accel: 89, power: 85, finesse: 84, awareness: 83 },
  },
  RB1: {
    slotKey: 'RB',
    name: 'Day-2 One-Cut RB1',
    pos: 'RB',
    jersey: 24,
    capHitM: 3.8,
    archetype: 'Round-2 Explosive One-Cut RB (5\'11" 210 lbs, 4.42 40)',
    scoutingNotes: 'Elite burst (SPD 91, ACC 92) and downhill slash vision, but light pass-protector (BLK 66, PWR 82) who struggles anchoring A-gap muggers 1v1.',
    howieValueThesis: 'Drafted Rd 2 instead of paying $14M+ vet RB. APEX deploys him on pin-pull edges and fast swing/flat outlets so blitzers cannot isolate his BLK 66 in static 5-man protection.',
    throwerRating: 45,
    blockRating: 66,
    ratings: { speed: 91, accel: 92, power: 82, finesse: 86, awareness: 82 },
  },
  WR1: {
    slotKey: 'WR1',
    name: 'Franchise X-Separator WR1',
    pos: 'WR',
    jersey: 6,
    capHitM: 22.5,
    archetype: 'Marquee Route Technician (WR1 Cornerstone #2 of 2)',
    scoutingNotes: 'Elite suddenness (ACC 92, FIN 92, AWR 90) vs press-man & Quarters; modest 185-lb frame limits inline crack-blocking (BLK 56).',
    howieValueThesis: 'One of only two $20M+ offensive pillars. Feeds 11.5y Glance, 12.8y Sticks-Fin, and 13.8y 2-Minute Boundary Outs as the high-confidence read-1 chains mover.',
    throwerRating: 50,
    blockRating: 56,
    ratings: { speed: 91, accel: 92, power: 72, finesse: 92, awareness: 90 },
  },
  WR2: {
    slotKey: 'WR2',
    name: 'Day-2 Vertical Z-WR2',
    pos: 'WR',
    jersey: 83,
    capHitM: 5.2,
    archetype: 'Raw 4.35 Lid-Lifter (6\'2" 192 lbs)',
    scoutingNotes: 'True field-stretching top speed (SPD 95, ACC 94), but narrow route tree (FIN 83, AWR 81) and non-factor blocking (BLK 54).',
    howieValueThesis: 'Cheap rookie-scale speed taxes 2-high safeties vertically so WR1, SL, and TE1 operate inside spacious intermediate voids without paying $28M for dual alpha WRs.',
    throwerRating: 45,
    blockRating: 54,
    ratings: { speed: 95, accel: 94, power: 65, finesse: 83, awareness: 81 },
  },
  SL: {
    slotKey: 'SL',
    name: 'Orbit / Wing Slot SL',
    pos: 'SL',
    jersey: 18,
    capHitM: 7.5,
    archetype: 'Former College QB / Motion Multiplier (5\'11" 198 lbs)',
    scoutingNotes: 'Crisp short-area quickness (SPD 92, ACC 93), tough perimeter stalker (BLK 72), and credible wing-option passer (throwerRating 75 — non-All-Pro).',
    howieValueThesis: 'Mid-tier $7.5M Swiss-Army slot. Forces pre-snap defense rock-and-roll declarations via orbit motion while serving as an automatic <= 6.5y blitz-hot valve.',
    throwerRating: 75,
    blockRating: 72,
    ratings: { speed: 92, accel: 93, power: 71, finesse: 86, awareness: 86 },
  },
  TE1: {
    slotKey: 'TE',
    name: 'Two-Way Move Y-TE1',
    pos: 'TE',
    jersey: 88,
    capHitM: 11.5,
    archetype: 'Complete In-Line / Seam Y-TE (6\'5" 256 lbs)',
    scoutingNotes: 'Clears NFL edge-sealing threshold (BLK 85, PWR 85) with reliable seam/flat hands (SPD 82, AWR 86). Solid all-around pro, not an outlier blazer.',
    howieValueThesis: 'Worth $11.5M because BLK 85 stops free Edge-rush whiffs in 11/12-pers chip-and-release protections and seals C-gaps on 11-on-11 Rhino Counters.',
    throwerRating: 55,
    blockRating: 85,
    ratings: { speed: 82, accel: 84, power: 85, finesse: 84, awareness: 86 },
  },
  TE2: {
    slotKey: 'TE2',
    name: 'Heavy Wing / Sniffer TE2',
    pos: 'TE',
    jersey: 84,
    capHitM: 4.8,
    archetype: '264-lb H-Wing / Edge Bulldozer (6\'4" 264 lbs)',
    scoutingNotes: 'Dominant split-flow and pin-pull lead blocker (BLK 87, PWR 87) who swaps into 12-pers (replacing SL -> $120.2M) or 21-pers (replacing WR2 -> $122.5M).',
    howieValueThesis: 'Low-cost TE market arbitrage: gives Howie sixth-OL run/boot sealing force at $4.8M while remaining an eligible red-zone leak receiver.',
    throwerRating: 58,
    blockRating: 87,
    ratings: { speed: 81, accel: 83, power: 87, finesse: 80, awareness: 85 },
  },
  LT: {
    slotKey: 'LT',
    name: 'Franchise Blindside LT',
    pos: 'LT',
    jersey: 68,
    capHitM: 24.0,
    archetype: 'All-Pro Blindside Anchor (OL Cornerstone #1 of 2)',
    scoutingNotes: 'Long-armed technician (BLK 91, FIN 91, PWR 89, AWR 89) trusted on true 1-on-1 weakside islands.',
    howieValueThesis: 'Second of only two $20M+ contracts. Owning a true island LT lets APEX slide protection toward the developmental RG on every dropback.',
    throwerRating: 30,
    blockRating: 91,
    ratings: { speed: 75, accel: 81, power: 89, finesse: 91, awareness: 89 },
  },
  LG: {
    slotKey: 'LG',
    name: 'Core Interior Mauler LG',
    pos: 'LG',
    jersey: 69,
    capHitM: 14.5,
    archetype: 'Pro-Bowl Power Guard (6\'5" 328 lbs)',
    scoutingNotes: 'Heavy-handed anchor (PWR 90, BLK 89, AWR 87) who stabilizes young Center on zero-tech NTs and caves C-gaps on left sweeps.',
    howieValueThesis: 'Extended one cycle early at $14.5M. Anchors the A-left/B-left interior pocket so our lighter C doesn\'t collapse against Bear fronts.',
    throwerRating: 30,
    blockRating: 89,
    ratings: { speed: 73, accel: 79, power: 90, finesse: 84, awareness: 87 },
  },
  C: {
    slotKey: 'C',
    name: 'Athletic Pull-Center C',
    pos: 'C',
    jersey: 51,
    capHitM: 5.5,
    archetype: 'Undersized Reach/Pull Center (6\'3" 295 lbs)',
    scoutingNotes: 'Elite lateral pull mobility (SPD 79, ACC 85, FIN 86, AWR 87) for pin-pull edges, but modest bull-rush anchor (PWR 82) vs 335-lb NTs 1v1.',
    howieValueThesis: 'Bridge/extension value at $5.5M. Needs LG/RG combo-climb leverage vs heavy 3-4 Bear NTs while turning into a missile on outside sweeps.',
    throwerRating: 30,
    blockRating: 86,
    ratings: { speed: 79, accel: 85, power: 82, finesse: 86, awareness: 87 },
  },
  RG: {
    slotKey: 'RG',
    name: 'Day-3 Developmental RG',
    pos: 'RG',
    jersey: 65,
    capHitM: 3.4,
    archetype: 'Raw Second-Year Starting RG (6\'4" 316 lbs)',
    scoutingNotes: 'Adequate size/strength (PWR 84, BLK 83), but lower blitz-pickup processing (AWR 82, FIN 82) vulnerable to simulated A/B-gap pressures.',
    howieValueThesis: 'Rookie-scale Day-3 pick saves $13M+ over vet guards. Protected intentionally by C-right slides, TE1 chips, half-roll boots, and <= 6.5y quick hots.',
    throwerRating: 30,
    blockRating: 83,
    ratings: { speed: 74, accel: 80, power: 84, finesse: 82, awareness: 82 },
  },
  RT: {
    slotKey: 'RT',
    name: 'Ascending Right Tackle RT',
    pos: 'RT',
    jersey: 66,
    capHitM: 10.5,
    archetype: 'Balanced Year-4 Right Tackle (6\'6" 312 lbs)',
    scoutingNotes: 'Reliable edge protector and down-blocker (BLK 87, PWR 87, FIN 85, AWR 85). Good starter, not top-3 reset money.',
    howieValueThesis: 'Secures frontside edges cleanly when paired with TE1/TE2 wing help without breaking the $123M active cap ceiling.',
    throwerRating: 30,
    blockRating: 87,
    ratings: { speed: 75, accel: 81, power: 87, finesse: 85, awareness: 85 },
  },
};

export const APEX_ACTIVE_11_CAP_M = +(
  APEX_2027_ROSTER.LT.capHitM +
  APEX_2027_ROSTER.LG.capHitM +
  APEX_2027_ROSTER.C.capHitM +
  APEX_2027_ROSTER.RG.capHitM +
  APEX_2027_ROSTER.RT.capHitM +
  APEX_2027_ROSTER.QB1.capHitM +
  APEX_2027_ROSTER.RB1.capHitM +
  APEX_2027_ROSTER.WR1.capHitM +
  APEX_2027_ROSTER.WR2.capHitM +
  APEX_2027_ROSTER.SL.capHitM +
  APEX_2027_ROSTER.TE1.capHitM
).toFixed(1); // 122.9M

export const APEX_12PERS_CAP_M = +(
  APEX_ACTIVE_11_CAP_M - APEX_2027_ROSTER.SL.capHitM + APEX_2027_ROSTER.TE2.capHitM
).toFixed(1); // 120.2M

export const APEX_21PERS_CAP_M = +(
  APEX_ACTIVE_11_CAP_M - APEX_2027_ROSTER.WR2.capHitM + APEX_2027_ROSTER.TE2.capHitM
).toFixed(1); // 122.5M

// Workstation UI Team Entry for #off-team-select / #def-team-select
export const APEX_2027_TEAM_ENTRY = {
  id: 'APX',
  city: 'Philadelphia',
  name: '2027 APEX ($122.9M)',
  fullName: '2027 Philadelphia APEX Continuum ($120.2M-$122.9M Active 11)',
  offense: [
    {
      id: 'QB',
      label: 'QB',
      name: APEX_2027_ROSTER.QB1.name,
      scouting: { jersey: 7, ovr: 84 },
      ratings: { spd: 88, acc: 89, str: 84, btk_power: 85, agi: 86, tha_short: 84, pre_snap_read: 83 },
    },
    {
      id: 'RB',
      label: 'RB',
      name: APEX_2027_ROSTER.RB1.name,
      scouting: { jersey: 24, ovr: 83 },
      ratings: { spd: 91, acc: 92, str: 76, btk_power: 82, agi: 88, elusiveness: 86, pre_snap_read: 82 },
    },
    {
      id: 'WR1',
      label: 'WR',
      name: APEX_2027_ROSTER.WR1.name,
      scouting: { jersey: 6, ovr: 90 },
      ratings: { spd: 91, acc: 92, str: 70, rbk_power: 60, agi: 92, rr_short: 92, pre_snap_read: 90 },
    },
    {
      id: 'WR2',
      label: 'WR',
      name: APEX_2027_ROSTER.WR2.name,
      scouting: { jersey: 83, ovr: 82 },
      ratings: { spd: 95, acc: 94, str: 65, rbk_power: 56, agi: 85, rr_short: 83, pre_snap_read: 81 },
    },
    {
      id: 'SLOT',
      label: 'SL',
      name: APEX_2027_ROSTER.SL.name,
      scouting: { jersey: 18, ovr: 83 },
      ratings: { spd: 92, acc: 93, str: 71, rbk_power: 72, agi: 89, rr_short: 86, pre_snap_read: 86 },
    },
    {
      id: 'TE',
      label: 'TE',
      name: APEX_2027_ROSTER.TE1.name,
      scouting: { jersey: 88, ovr: 86 },
      ratings: { spd: 82, acc: 84, str: 86, rbk_power: 85, agi: 81, rr_short: 84, pre_snap_read: 86 },
    },
    {
      id: 'LT',
      label: 'LT',
      name: APEX_2027_ROSTER.LT.name,
      scouting: { jersey: 68, ovr: 90 },
      ratings: { spd: 75, acc: 81, str: 90, pbk_anchor: 91, rbk_power: 89, agi: 84, pbk_lateral: 91, rbk_reach: 90 },
    },
    {
      id: 'LG',
      label: 'LG',
      name: APEX_2027_ROSTER.LG.name,
      scouting: { jersey: 69, ovr: 88 },
      ratings: { spd: 73, acc: 79, str: 92, pbk_anchor: 89, rbk_power: 90, agi: 78, pbk_lateral: 84, rbk_reach: 85 },
    },
    {
      id: 'C',
      label: 'C',
      name: APEX_2027_ROSTER.C.name,
      scouting: { jersey: 51, ovr: 83 },
      ratings: { spd: 79, acc: 85, str: 81, pbk_anchor: 82, rbk_power: 82, agi: 86, pbk_lateral: 87, rbk_reach: 88 },
    },
    {
      id: 'RG',
      label: 'RG',
      name: APEX_2027_ROSTER.RG.name,
      scouting: { jersey: 65, ovr: 81 },
      ratings: { spd: 74, acc: 80, str: 84, pbk_anchor: 83, rbk_power: 84, agi: 79, pbk_lateral: 82, rbk_reach: 83 },
    },
    {
      id: 'RT',
      label: 'RT',
      name: APEX_2027_ROSTER.RT.name,
      scouting: { jersey: 66, ovr: 86 },
      ratings: { spd: 75, acc: 81, str: 88, pbk_anchor: 87, rbk_power: 87, agi: 81, pbk_lateral: 85, rbk_reach: 86 },
    },
  ],
  // Realistic +1.5 PPG cap-reinvested Eagles defense from $15.6M-$23.1M offensive savings (no fake all-pro hoard)
  defense: [
    { id: 'LDE', label: 'DE', name: 'Eagles Reinvested DE1', scouting: { jersey: 55, ovr: 87 }, ratings: { spd: 85, acc: 88, str: 86, rush_power: 87, rush_speed: 87, bsh_shed: 86 } },
    { id: 'DT1', label: 'NT', name: 'Eagles Anchor NT', scouting: { jersey: 98, ovr: 88 }, ratings: { spd: 73, acc: 79, str: 92, rush_power: 90, rush_speed: 78, bsh_shed: 88 } },
    { id: 'DT2', label: 'DT', name: 'Eagles 3-Tech DT', scouting: { jersey: 90, ovr: 87 }, ratings: { spd: 78, acc: 84, str: 89, rush_power: 88, rush_speed: 85, bsh_shed: 86 } },
    { id: 'RDE', label: 'EDGE', name: 'Eagles Edge2', scouting: { jersey: 58, ovr: 86 }, ratings: { spd: 86, acc: 88, str: 84, rush_power: 84, rush_speed: 87, bsh_shed: 85 } },
    { id: 'WLB', label: 'WILL', name: 'Eagles Range Will', scouting: { jersey: 53, ovr: 85 }, ratings: { spd: 88, acc: 89, str: 81, tak_hit_power: 85, cov_man: 81, cov_zone: 85 } },
    { id: 'MLB', label: 'MIKE', name: 'Eagles Green-Dot Mike', scouting: { jersey: 54, ovr: 86 }, ratings: { spd: 86, acc: 88, str: 84, tak_hit_power: 87, cov_man: 80, cov_zone: 86 } },
    { id: 'NCB', label: 'NI', name: 'Eagles Slot Nickel', scouting: { jersey: 27, ovr: 87 }, ratings: { spd: 90, acc: 91, str: 73, tak_hit_power: 82, cov_man: 87, cov_zone: 87 } },
    { id: 'CB1', label: 'CB', name: 'Eagles Boundary CB1', scouting: { jersey: 22, ovr: 88 }, ratings: { spd: 92, acc: 92, str: 69, tak_hit_power: 76, cov_man: 88, cov_zone: 88 } },
    { id: 'CB2', label: 'CB', name: 'Eagles Field CB2', scouting: { jersey: 29, ovr: 85 }, ratings: { spd: 91, acc: 91, str: 68, tak_hit_power: 75, cov_man: 85, cov_zone: 86 } },
    { id: 'SS', label: 'SS', name: 'Eagles Strong Safety', scouting: { jersey: 21, ovr: 86 }, ratings: { spd: 89, acc: 90, str: 79, tak_hit_power: 87, cov_man: 84, cov_zone: 87 } },
    { id: 'FS', label: 'FS', name: 'Eagles Free Safety', scouting: { jersey: 32, ovr: 87 }, ratings: { spd: 90, acc: 91, str: 72, tak_hit_power: 81, cov_man: 85, cov_zone: 89 } },
  ],
};

function makeApexAgent(
  id: string,
  pos: string,
  player: ApexRosterPlayer,
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

function buildApexOL(
  ltCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  lgCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  cCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  rgCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?],
  rtCfg: [BlockRoleType, GapOrSetCode, string | null, string | null, LeverageBias, Waypoint2D[]?]
): SimAgent[] {
  const R = APEX_2027_ROSTER;
  return [
    makeApexAgent('LT', 'LT', R.LT, -3.2, -0.4, ltCfg[0], ltCfg[1], ltCfg[2], ltCfg[3], ltCfg[4], ltCfg[5] || []),
    makeApexAgent('LG', 'LG', R.LG, -1.6, -0.3, lgCfg[0], lgCfg[1], lgCfg[2], lgCfg[3], lgCfg[4], lgCfg[5] || []),
    makeApexAgent('C', 'C', R.C, 0.0, -0.2, cCfg[0], cCfg[1], cCfg[2], cCfg[3], cCfg[4], cCfg[5] || []),
    makeApexAgent('RG', 'RG', R.RG, 1.6, -0.3, rgCfg[0], rgCfg[1], rgCfg[2], rgCfg[3], rgCfg[4], rgCfg[5] || []),
    makeApexAgent('RT', 'RT', R.RT, 3.2, -0.4, rtCfg[0], rtCfg[1], rtCfg[2], rtCfg[3], rtCfg[4], rtCfg[5] || []),
  ];
}

// ============================================================================
// 2. THE 8-PLAY "2027 PHILADELPHIA APEX CONTINUUM" FIRST-PRINCIPLES PLAYBOOK
//    100.0% Strictly Legal NFL Formations (7 on LOS w/ Uncovered Ends,
//    <= 1.0 yd Ineligible OL Buffer on Passes, Strictly Backward Laterals)
// ============================================================================
export const APEX_2027_PLAYBOOK: ApexPlayDefinition[] = [
  // PLAY 1: SHOTGUN ORBIT GLANCE / FLOOD TRIANGLE (11 APEX - $122.9M)
  {
    id: 'APEX_ORBIT_GLANCE_FLOOD',
    name: 'APEX // ORBIT GLANCE-SAIL TRIANGLE (HOT RELIEF)',
    category: 'PASS',
    personnel: '11 APEX',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: 'ORBIT GLANCE',
    menuBuckets: ['OPEN_FIELD', 'TWO_MINUTE'],
    featuredDefense: 'NICKEL_OVER_C3',
    firstPrinciplesThesis:
      'Orbit slot motion right-to-left forces pre-snap banjo/rock-and-roll coverage tell, stretching the flat overhang horizontally while WR1 snaps an 11.8y Glance/Dig in the intermediate void (< 15y depth -> crisp 2.35s rhythm) and WR2 lifts the field safety at 14.3y.',
    protectsFlawNote:
      '50 Half-Slide (C/RG/RT slide right + RB A/B scan) insulates developmental RG; SL orbit flare (4.5y) + TE1 chip-sit (5.6y) supply two <= 6.5y hot outlets against blitzes.',
    buildOffense: () => {
      const R = APEX_2027_ROSTER;
      const ol = buildApexOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'OUTSIDE_IN'],
        ['PASS_SET', 'A_LEFT', 'NT', 'WILL', 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', 'MIKE', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', 'MIKE', 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      // 7 on LOS with uncovered ends: 5 OL + WR1 (-14.8, -0.35) + WR2 (+15.2, -0.35)
      const wr1 = makeApexAgent(
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
          { x: -14.0, y: 8.2 },
          { x: -4.2, y: 11.4 },
        ],
        1
      );
      const wr2 = makeApexAgent(
        'WR2',
        'WR',
        R.WR2,
        15.2,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: 15.0, y: 9.5 },
          { x: 12.2, y: 14.4 },
        ],
        4
      );
      // Off-LOS Y-TE1 (BLK 85): chips LDE for 0.36s then settles at 5.4y hot check
      const te = makeApexAgent(
        'TE',
        'TE',
        R.TE1,
        4.9,
        -1.08,
        'CHIP_RELEASE',
        'C_RIGHT',
        'LDE',
        null,
        'OUTSIDE_IN',
        [
          { x: 3.4, y: 4.5 },
          { x: 1.5, y: 5.5 },
        ],
        3,
        0.36
      );
      // Off-LOS Orbit SL: sweeps right -> left behind QB as rapid <= 6.5y flat stretch & blitz hot
      const sl = makeApexAgent(
        'SL',
        'SL',
        R.SL,
        -1.2,
        -2.45,
        'ROUTE',
        'D_ALLEY',
        null,
        null,
        'NEUTRAL',
        [
          { x: -7.5, y: -0.5 },
          { x: -13.2, y: 3.8 },
          { x: -15.5, y: 4.8 },
        ],
        2
      );
      sl.vx = -6.2;
      sl.preSnapMotion = {
        enabled: true,
        type: 'JET_LEFT',
        speed: 6.2,
        dirX: -1.0,
        dirY: -0.04,
        originX: 7.8,
        originY: -1.55,
        snapX: -1.2,
        snapY: -2.45,
      };

      const qb = makeApexAgent('QB', 'QB', R.QB1, 0.0, -4.85, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -0.4, y: -6.5 },
      ]);
      const rb = makeApexAgent(
        'RB',
        'RB',
        R.RB1,
        1.25,
        -4.85,
        'MAX_PROTECT_SCAN',
        'A_RIGHT',
        'WILL',
        'MIKE',
        'INSIDE_OUT',
        [{ x: 6.2, y: 2.2 }],
        5
      );

      return [...ol, wr1, wr2, te, sl, qb, rb];
    },
  },

  // PLAY 2: 12-PERSONNEL PIN-PULL EDGE SWEEP RIGHT (12 APEX - $120.2M)
  {
    id: 'APEX_DUO_WING_PIN_PULL',
    name: 'APEX // 12-PERS WING PIN-AND-PULL EDGE',
    category: 'RUN',
    personnel: '12 APEX',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: 'PIN-PULL 12',
    menuBuckets: ['OPEN_FIELD', 'FOUR_MINUTE'],
    featuredDefense: 'BASE_34_BEAR_C4',
    firstPrinciplesThesis:
      'Turns C (SPD 79) and Heavy Wing TE2 (BLK 87) into moving perimeter lead blockers while TE1 (BLK 85) and RT seal C/B-gap defenders inside — out-flanking 3-4 Bear & 4-3 stacked interior boxes rather than slamming light C/RB into nose tackles.',
    protectsFlawNote:
      'Exploits C\'s lateral athleticism instead of his modest 1v1 bull-rush anchor (PWR 82); saves RB1 from interior traffic contact until full speed outside the numbers.',
    buildOffense: () => {
      const R = APEX_2027_ROSTER;
      const ol = buildApexOL(
        ['GAP_ZONE', 'C_LEFT', 'RDE', 'LOLB', 'OUTSIDE_IN'],
        [
          'PULL_LEAD',
          'C_RIGHT',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 1.5, y: -1.1 },
            { x: 5.2, y: -0.5 },
            { x: 6.8, y: 2.5 },
          ],
        ],
        ['COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'],
        ['COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'INSIDE_OUT'],
        ['MAN_BLOCK', 'B_RIGHT', '3T', '4i_R', 'INSIDE_OUT']
      );

      // 7 on LOS w/ uncovered ends: WR1 (-14.5, -0.35), 5 OL, TE1 (+4.8, -0.35)
      const wr1 = makeApexAgent('WR1', 'WR', R.WR1, -14.5, -0.35, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'OUTSIDE_IN');
      // TE1 (BLK 85) seals edge DE/ROLB inside/outside right at +4.8
      const te = makeApexAgent('TE', 'TE', R.TE1, 4.8, -0.35, 'MAN_BLOCK', 'C_RIGHT', 'ROLB', 'LDE', 'INSIDE_OUT');
      // Off-LOS WR2 pins CB2 outside the alley
      const wr2 = makeApexAgent('WR2', 'WR', R.WR2, 14.5, -1.05, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT');
      // Off-LOS Heavy Wing TE2 (BLK 87) leads C/D alley onto SS/Overhang after TE1 + LG seal inside-out
      const sl = makeApexAgent('SL', 'TE', R.TE2, 3.8, -1.15, 'PULL_LEAD', 'D_ALLEY', 'SS', 'CB2', 'OUTSIDE_IN', [
        { x: 6.4, y: -0.4 },
        { x: 8.6, y: 2.5 },
        { x: 9.6, y: 6.5 },
      ]);

      // Pistol QB boots backside left while RB runs crisp pin-pull timing behind TE1, LG, TE2
      const qb = makeApexAgent('QB', 'QB', R.QB1, 0.0, -3.55, 'QB_DROP', 'C_LEFT', null, null, 'NEUTRAL', [
        { x: -5.8, y: -4.2 },
      ]);
      const rb = makeApexAgent('RB', 'RB', R.RB1, 0.0, -5.85, 'BALL_CARRIER', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: 4.2, y: -2.2 },
        { x: 7.4, y: 1.5 },
        { x: 8.8, y: 6.5 },
        { x: 9.2, y: 14.5 },
      ]);

      return [...ol, wr1, wr2, te, sl, qb, rb];
    },
  },

  // PLAY 3: SHORTENED 0.68s HALF-ROLL PLAY-ACTION BOOT (12 APEX - $120.2M)
  {
    id: 'APEX_SHORT_MESH_PA_BOOT',
    name: 'APEX // 0.68s HALF-ROLL PA BOOT FLOOD',
    category: 'PASS',
    personnel: '12 APEX',
    situations: ['1ST_10', 'RED_ZONE'],
    situationBadge: '0.68s PA BOOT',
    menuBuckets: ['OPEN_FIELD', 'FOUR_MINUTE'],
    featuredDefense: 'BASE_43_OVER_C1',
    firstPrinciplesThesis:
      'Calibrated telemetry proved 1.25s PA fakes suffer 15%+ sacks vs modern pressure. Compressing the RB mesh to 0.68s triggers READ_RUN_PASS linebacker downhill bite (-1.7y) while immediately sprinting QB1 outside the pocket behind TE2\'s split-flow edge seal.',
    protectsFlawNote:
      'Moves launch point outside developmental RG (+5.5x) behind Heavy Wing TE2 (BLK 87); hides QB1\'s modest AWR 83 behind a crystal-clear 3-level vertical stack (Flat 5.4y / Dig 11.2y / Over 13.8y).',
    buildOffense: () => {
      const R = APEX_2027_ROSTER;
      const ol = buildApexOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'OUTSIDE_IN'],
        ['PASS_SET', 'ANGLE_45', 'NT', 'WILL', 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'WILL', 'NT', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', 'MIKE', 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      // 7 on LOS w/ uncovered ends: WR1 (-14.5, -0.35), 5 OL, WR2 (+15.0, -0.35)
      const wr1 = makeApexAgent(
        'WR1',
        'WR',
        R.WR1,
        -14.5,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: -9.5, y: 8.0 },
          { x: 5.5, y: 11.4 },
        ],
        1
      );
      const wr2 = makeApexAgent(
        'WR2',
        'WR',
        R.WR2,
        15.0,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: 16.5, y: 10.5 },
          { x: 22.0, y: 14.5 },
        ],
        3
      );
      // Off-LOS TE1 (+4.8, -1.05, BLK 85): 0.40s chip on LDE into right 5.0y flat (<= 6.5y Hot Valve!)
      const te = makeApexAgent(
        'TE',
        'TE',
        R.TE1,
        4.8,
        -1.05,
        'CHIP_RELEASE',
        'C_RIGHT',
        'LDE',
        null,
        'OUTSIDE_IN',
        [
          { x: 11.0, y: 4.0 },
          { x: 18.0, y: 5.0 },
        ],
        2,
        0.40
      );
      // Off-LOS Heavy TE2 (+2.2, -1.45, BLK 87): personal protector scanning A-gap Cross-Dog / WILL / MIKE!
      const sl = makeApexAgent(
        'SL',
        'TE',
        R.TE2,
        2.2,
        -1.45,
        'MAX_PROTECT_SCAN',
        'A_RIGHT',
        'WILL',
        'MIKE',
        'INSIDE_OUT',
        [{ x: 4.8, y: 1.5 }],
        4
      );

      const qb = makeApexAgent('QB', 'QB', R.QB1, 0.0, -4.75, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 5.6, y: -6.1 },
      ]);
      qb.playAction = {
        enabled: true,
        meshDurationSec: 0.46,
        fakeCarrierId: 'RB',
        fakeGap: 'A_LEFT',
        isBootleg: true,
        bootDirection: 'RIGHT',
      };

      // RB sells quick left A-gap flash fake then checks A_LEFT / WILL / MIKE!
      const rb = makeApexAgent(
        'RB',
        'RB',
        R.RB1,
        -1.4,
        -4.9,
        'MAX_PROTECT_SCAN',
        'A_LEFT',
        'MIKE',
        'WILL',
        'INSIDE_OUT',
        [{ x: -1.8, y: -1.6 }],
        4
      );

      return [...ol, wr1, wr2, te, sl, qb, rb];
    },
  },

  // PLAY 4: SWITCH MESH & STICKS CHOICE — 3RD & 9 KILLER (11 APEX - $122.9M)
  {
    id: 'APEX_SWITCH_MESH_STICKS',
    name: 'APEX // 3RD & 9 SWITCH-MESH & STICKS FIN',
    category: 'PASS',
    personnel: '11 APEX',
    situations: ['3RD_LONG', '1ST_10'],
    situationBadge: '3RD & 9 MESH',
    menuBuckets: ['THIRD_LONG', 'OPEN_FIELD'],
    featuredDefense: 'VIKINGS_MUG_CROSSDOG_C0',
    firstPrinciplesThesis:
      'Engineered specifically for 3rd & 7-11 against Dime Quarters Match & Cross-Dog Cover 0. Natural rub mesh (5.2y & 5.8y) clears man defenders inside while WR1 attacks the 12.8y Dig/Fin window inside 2.35s and RB releases fast into the weak flat.',
    protectsFlawNote:
      'Zero 1v1 RB pass-pro ask (hides RB1 BLK 66 via immediate swing release = dual <= 6.5y Hot Valves vs Mug C0!), while TE1 chips LDE on C/RG/RT 6-man half-slide.',
    buildOffense: () => {
      const R = APEX_2027_ROSTER;
      const ol = buildApexOL(
        ['PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'OUTSIDE_IN'],
        ['PASS_SET', 'A_LEFT', 'NT', 'WILL', 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'WILL', 'NT', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', 'MIKE', 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      // 7 on LOS: WR1 (-14.5, -0.35), 5 OL, WR2 (+15.0, -0.35)
      const wr1 = makeApexAgent(
        'WR1',
        'WR',
        R.WR1,
        -14.5,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: -13.5, y: 11.0 },
          { x: -3.0, y: 12.6 },
        ],
        1
      );
      const wr2 = makeApexAgent(
        'WR2',
        'WR',
        R.WR2,
        15.0,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: 14.0, y: 9.8 },
          { x: 11.5, y: 14.3 },
        ],
        4
      );
      // Off-LOS SL (+6.2, -1.05): Rapid Shallow Mesh Cross right -> left at 5.0y (<= 6.5y Hot Relief #1!)
      const sl = makeApexAgent(
        'SL',
        'SL',
        R.SL,
        6.2,
        -1.05,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: 0.5, y: 4.5 },
          { x: -8.5, y: 5.2 },
          { x: -14.5, y: 6.0 },
        ],
        2
      );
      // Off-LOS Y-TE1 (+2.4, -1.55, BLK 85): Sniffer Blitz-Scan picking up A-gap Muggers (WILL/MIKE) before leaking check
      const te = makeApexAgent(
        'TE',
        'TE',
        R.TE1,
        2.4,
        -1.55,
        'MAX_PROTECT_SCAN',
        'A_RIGHT',
        'WILL',
        'MIKE',
        'INSIDE_OUT',
        [{ x: 4.8, y: 5.5 }],
        3
      );

      const qb = makeApexAgent('QB', 'QB', R.QB1, 0.0, -4.9, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -0.3, y: -6.6 },
      ]);
      // RB1 leaks fast weak swing at 2.8y (<= 6.5y Hot Relief #2!) instead of losing A-gap pass-pro battles
      const rb = makeApexAgent(
        'RB',
        'RB',
        R.RB1,
        -1.8,
        -4.8,
        'ROUTE',
        'D_ALLEY',
        null,
        null,
        'NEUTRAL',
        [
          { x: -7.5, y: 0.6 },
          { x: -13.0, y: 3.2 },
        ],
        3
      );

      return [...ol, wr1, wr2, sl, te, qb, rb];
    },
  },

  // PLAY 5: 2-MINUTE SIDELINE LASER / WHIP-OUT BOUNDARY CONTINUUM (11 APEX - $122.9M)
  {
    id: 'APEX_TWOMIN_BOUNDARY_OOB',
    name: 'APEX // 2-MIN BOUNDARY OUT-STRETCH (OOB STOP)',
    category: 'PASS',
    personnel: '11 APEX',
    situations: ['1ST_10', '3RD_LONG'],
    situationBadge: '2-MIN SIDELINE',
    menuBuckets: ['TWO_MINUTE', 'THIRD_LONG'],
    featuredDefense: 'DIME_QUARTERS_MATCH',
    firstPrinciplesThesis:
      'Dual horizontal sideline stress in the final 1:50: WR1 runs a crisp 13.8y Deep Boundary Out (-24.5x) while SL snaps a rapid 5.8y Right Whip-Out (+23.8x) and TE1 flares to the Left Sideline (5.4y) — guaranteeing clock-stopping sideline completions on every rush profile.',
    protectsFlawNote:
      'Dual <= 6.5y sideline hot outlets prevent drive-killing sacks vs Dime Mug C0; keeps RB1 inside on B-right chip scan while OL fans into deep-drop boundary cup.',
    buildOffense: () => {
      const R = APEX_2027_ROSTER;
      const ol = buildApexOL(
        ['PASS_SET', 'C_LEFT', 'RDE', null, 'OUTSIDE_IN'],
        ['PASS_SET', 'A_LEFT', 'NT', 'WILL', 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT', 'MIKE', 'NEUTRAL'],
        ['PASS_SET', 'ANGLE_45', '3T', null, 'INSIDE_OUT'],
        ['PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT']
      );

      // 7 on LOS: WR1 (-16.2, -0.35), 5 OL, WR2 (+16.5, -0.35)
      const wr1 = makeApexAgent(
        'WR1',
        'WR',
        R.WR1,
        -16.2,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: -16.2, y: 12.6 },
          { x: -24.4, y: 13.8 },
        ],
        1
      );
      const wr2 = makeApexAgent(
        'WR2',
        'WR',
        R.WR2,
        16.5,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: 17.5, y: 10.5 },
          { x: 24.0, y: 14.2 },
        ],
        3
      );
      // Off-LOS SL (+9.5, -1.05): Fast 5.8y Right Sideline Whip-Out (<= 6.5y Hot OOB Valve!)
      const sl = makeApexAgent(
        'SL',
        'SL',
        R.SL,
        9.5,
        -1.05,
        'ROUTE',
        'D_ALLEY',
        null,
        null,
        'NEUTRAL',
        [
          { x: 11.5, y: 5.0 },
          { x: 23.8, y: 5.8 },
        ],
        2
      );
      // Off-LOS TE1 (-5.0, -1.10, BLK 85): Quick chip RDE then Left Sideline Flare (5.4y Hot OOB Valve #2!)
      const te = makeApexAgent(
        'TE',
        'TE',
        R.TE1,
        -5.0,
        -1.10,
        'CHIP_RELEASE',
        'D_ALLEY',
        'RDE',
        null,
        'OUTSIDE_IN',
        [
          { x: -13.5, y: 4.2 },
          { x: -23.0, y: 5.4 },
        ],
        4,
        0.34
      );

      const qb = makeApexAgent('QB', 'QB', R.QB1, 0.0, -4.85, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -0.4, y: -6.5 },
      ]);
      const rb = makeApexAgent(
        'RB',
        'RB',
        R.RB1,
        1.2,
        -4.85,
        'MAX_PROTECT_SCAN',
        'A_LEFT',
        'WILL',
        'MIKE',
        'INSIDE_OUT',
        [{ x: 6.5, y: 2.2 }],
        5
      );

      return [...ol, wr1, wr2, sl, te, qb, rb];
    },
  },

  // PLAY 6: DISPLACED WING OPTION-PASS CONTINUUM (21 APEX - $122.5M)
  {
    id: 'APEX_DISPLACED_WING_OPTION',
    name: 'APEX // DISPLACED WING OPTION-PASS CONTINUUM',
    category: 'RUN',
    personnel: '21 APEX',
    situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
    situationBadge: 'WING OPTION',
    menuBuckets: ['OPEN_FIELD', 'TWO_MINUTE'],
    featuredDefense: 'NICKEL_SIM_C2',
    firstPrinciplesThesis:
      'Steals the highest-leverage legal launch-point displacer in calibrated physics cleanly: SL (former college QB, realistic throwerRating 75) catches a -0.60y backward toss behind TE2 (BLK 87) and pulling C on the right perimeter while QB1 boots left — forcing force defenders into an impossible run-vs-pass bind.',
    protectsFlawNote:
      'SL (arm 75) only throws single-read clean-pocket strikes vs flying overhangs when WR1/TE1 clear > 1.85y; OL remains <= +0.85y until throw/run trigger.',
    buildOffense: () => {
      const R = APEX_2027_ROSTER;
      const ol = buildApexOL(
        ['MAN_BLOCK', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'],
        ['MAN_BLOCK', 'A_LEFT', 'NT', null, 'INSIDE_OUT'],
        [
          'PULL_LEAD',
          'D_ALLEY',
          'MIKE',
          null,
          'OUTSIDE_IN',
          [
            { x: 3.5, y: -1.1 },
            { x: 7.5, y: -0.4 },
            { x: 10.5, y: 0.7 },
          ],
        ],
        ['MAN_BLOCK', 'B_RIGHT', '3T', null, 'INSIDE_OUT'],
        ['MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT']
      );

      // 7 on LOS w/ uncovered ends: 5 OL + WR1 (-14.8, -0.35) + TE1 (+5.0, -0.35)
      const wr1 = makeApexAgent(
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
          { x: -13.0, y: 11.5 },
          { x: -5.5, y: 16.5 },
        ],
        2
      );
      // Right LOS end TE1 (BLK 85): clean vertical seam-corner release (primary strike window!)
      const te = makeApexAgent(
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
          { x: 11.8, y: 15.2 },
        ],
        1
      );
      // Off-LOS Heavy Wing TE2 (BLK 87): pins ROLB/LDE right at C_RIGHT edge so Bear/Over OLBs never run free!
      const te2 = makeApexAgent('WR2', 'TE', R.TE2, 4.2, -1.15, 'MAN_BLOCK', 'C_RIGHT', 'ROLB', 'LDE', 'INSIDE_OUT');
      // Off-LOS RB1 flares deep right wheel to stretch CB2 vertically away from TE1 seam
      const rb = makeApexAgent(
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
          { x: 14.8, y: 3.5 },
          { x: 18.8, y: 14.5 },
        ],
        3
      );

      // QB1 catches snap, tosses backward (-0.60y) to Orbit-Right SL at t=0.18s, then boots left
      const qb = makeApexAgent('QB', 'QB', R.QB1, 0.0, -2.85, 'QB_DROP', 'C_LEFT', null, null, 'NEUTRAL', [
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

      // Former-QB SL (SPD 92, arm 75) catches backward toss on right perimeter behind TE2 + C
      const sl = makeApexAgent('SL', 'SL', R.SL, -0.8, -3.55, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 7.2, y: -2.4 },
        { x: 11.2, y: 1.5 },
        { x: 14.5, y: 14.0 },
      ]);
      sl.vx = 5.8;
      sl.preSnapMotion = {
        enabled: true,
        type: 'ORBIT',
        speed: 5.8,
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
        decisionWindowStartSec: 1.15,
        decisionWindowEndSec: 1.72,
        primaryReceiverId: 'TE',
        secondaryReceiverId: 'WR1',
        separationThresholdYds: 3.10,
      };

      return [...ol, wr1, te, te2, rb, qb, sl];
    },
  },

  // PLAY 7: 11-ON-11 EAGLES RHINO QB COUNTER-SWEEP LEFT (12 APEX - $120.2M)
  {
    id: 'APEX_EAGLES_RHINO_COUNTER',
    name: 'APEX // 11v11 EAGLES RHINO QB SWEEP LEFT',
    category: 'RUN',
    personnel: '12 APEX',
    situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
    situationBadge: '4-MIN RHINO',
    menuBuckets: ['OPEN_FIELD', 'FOUR_MINUTE'],
    featuredDefense: 'VIKINGS_SAFETY_BLITZ_C1',
    firstPrinciplesThesis:
      'True 11-on-11 math equalizer for 4-minute clock bleeding and heavy 8-man fronts: RB1 runs a hard weakside A_RIGHT dive fake to pin WILL/MIKE inside while TE2 (BLK 87), LG (PWR 90), and C (SPD 79) lead QB1 (SPD 88, PWR 85) around the left edge inside the numbers (stays inbounds).',
    protectsFlawNote:
      'Captures Howie\'s $14.5M mid-market QB rushing surplus honestly under capped-YAC SYMMETRIC rules while keeping RG away from space-pull failure.',
    buildOffense: () => {
      const R = APEX_2027_ROSTER;
      const ol = buildApexOL(
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

      // 7 on LOS w/ uncovered ends: WR1 (-14.5, -0.35), 5 OL, TE1 (+4.8, -0.35)
      const wr1 = makeApexAgent('WR1', 'WR', R.WR1, -14.5, -0.35, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT');
      const te = makeApexAgent('TE', 'TE', R.TE1, 4.8, -0.35, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT');
      // Off-LOS WR2 occupies CB2 deep right
      const wr2 = makeApexAgent('WR2', 'WR', R.WR2, 14.5, -1.05, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.5, y: 12.0 },
      ]);
      // Off-LOS Heavy Wing TE2 (-4.6, -1.10, BLK 87): Directly seals/kicks Bear LOLB / weakside Edge so lane stays clean!
      const sl = makeApexAgent('SL', 'TE', R.TE2, -4.6, -1.10, 'MAN_BLOCK', 'C_LEFT', 'LOLB', 'RDE', 'INSIDE_OUT');

      // RB1 fakes hard right dive (D_ALLEY/A_RIGHT freeze block) while QB1 takes 11-on-11 edge left
      const rb = makeApexAgent('RB', 'RB', R.RB1, -1.2, -4.8, 'PULL_LEAD', 'A_RIGHT', 'MIKE', 'LDE', 'INSIDE_OUT', [
        { x: 1.5, y: -1.2 },
        { x: 2.5, y: 1.5 },
      ]);
      const qb = makeApexAgent('QB', 'QB', R.QB1, 0.0, -3.9, 'BALL_CARRIER', 'C_LEFT', null, null, 'NEUTRAL', [
        { x: -4.8, y: -1.6 },
        { x: -7.6, y: 1.8 },
        { x: -8.2, y: 7.5 },
        { x: -8.0, y: 14.0 },
      ]);

      return [...ol, wr1, wr2, te, sl, rb, qb];
    },
  },

  // PLAY 8: LOW RED ZONE +4y PHILLY SPRINT SMASH / OPTION-POP (12 APEX - $120.2M)
  {
    id: 'APEX_GOALLINE_SPRINT_SMASH',
    name: 'APEX // GL +4y SPRINT-BOOT OPTION POP',
    category: 'PASS',
    personnel: '12 APEX',
    situations: ['RED_ZONE', '3RD_SHORT'],
    situationBadge: 'GL +4y SMASH',
    menuBuckets: ['GOAL_LINE'],
    featuredDefense: 'GOAL_LINE_62_PINCH',
    firstPrinciplesThesis:
      'Built for 1st & Goal from the +4 vs 6-2 Pinch & Mug Cross-Dog: fast 0.50s RB-dive PA freeze pulls all 8 box defenders inside toward the A-gap while QB1 sprints outside behind Heavy TE2 (BLK 87), reading a pylon rub-corner by TE1 (6\'5") and back-pylon drag by WR1.',
    protectsFlawNote:
      'Turns dense 6-2 interior size against itself by attacking the +9x to +14x boundary corner at full horizontal speed; RB1 sells A-gap plunge rather than pass-blocking 255-lb LBs.',
    buildOffense: () => {
      const R = APEX_2027_ROSTER;
      const ol = buildApexOL(
        ['PASS_SET', 'C_LEFT', 'DE_L', null, 'OUTSIDE_IN'],
        ['PASS_SET', 'A_LEFT', 'NT_L', null, 'INSIDE_OUT'],
        ['PASS_SET', 'ANGLE_45', 'NT_L', 'NT_R', 'INSIDE_OUT'],
        ['PASS_SET', 'A_RIGHT', 'NT_R', 'DT_R', 'INSIDE_OUT'],
        ['PASS_SET', 'B_RIGHT', 'DT_R', 'DE_R', 'INSIDE_OUT']
      );

      // 7 on LOS w/ uncovered ends: WR1 (-14.5, -0.35), 5 OL, WR2 (+14.8, -0.35)
      const w1 = makeApexAgent(
        'WR1',
        'WR',
        R.WR1,
        -14.5,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: -3.0, y: 3.4 },
          { x: 9.8, y: 4.6 },
        ],
        2
      );
      const wr2 = makeApexAgent(
        'WR2',
        'WR',
        R.WR2,
        14.8,
        -0.35,
        'ROUTE',
        'VERTICAL_DEEP',
        null,
        null,
        'NEUTRAL',
        [
          { x: 14.5, y: 2.8 },
          { x: 17.8, y: 4.9 },
        ],
        3
      );
      // Off-LOS Heavy TE2 (+3.4, -1.15, BLK 87): Right Sprint-Boot Edge Seal (protects roll vs DE_R/SS!)
      const sl = makeApexAgent('SL', 'TE', R.TE2, 3.4, -1.15, 'MAX_PROTECT_SCAN', 'C_RIGHT', 'DE_R', 'DT_R', 'INSIDE_OUT', [
        { x: 5.5, y: -0.6 },
      ]);
      // Off-LOS TE1 (+5.0, -1.15, BLK 85): Pylon Corner Primary Read (+11.8, 5.1)
      const te = makeApexAgent(
        'TE',
        'TE',
        R.TE1,
        5.0,
        -1.15,
        'ROUTE',
        'D_ALLEY',
        null,
        null,
        'NEUTRAL',
        [
          { x: 7.5, y: 2.8 },
          { x: 11.8, y: 5.1 },
        ],
        1
      );

      const qb = makeApexAgent('QB', 'QB', R.QB1, 0.0, -4.35, 'QB_DROP', 'D_ALLEY', null, null, 'NEUTRAL', [
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

      const rb = makeApexAgent(
        'RB',
        'RB',
        R.RB1,
        -1.2,
        -4.55,
        'MAX_PROTECT_SCAN',
        'A_LEFT',
        'NT_R',
        'WILL',
        'INSIDE_OUT',
        [{ x: -1.5, y: -1.0 }],
        4
      );

      return [...ol, sl, wr2, te, w1, qb, rb];
    },
  },
];
