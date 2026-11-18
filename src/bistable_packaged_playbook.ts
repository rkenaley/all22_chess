import {
  SimAgent,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
  Waypoint2D,
  evaluateMacroMatchup,
} from './engine.js';
import { ARGON_2027_ROSTER, ARGON_2027_PLAYBOOK } from './argon_2027_playbook.js';
import { HYDRA_2027_ROSTER, HYDRA_2027_PLAYBOOK } from './vanguard_2027_playbook.js';

function buildPackagedPlayById(playId: string): SimAgent[] {
  const argon = ARGON_2027_PLAYBOOK.find((p) => p.id === playId);
  if (argon) return argon.buildOffense();
  const hydra = HYDRA_2027_PLAYBOOK.find((p) => p.id === playId);
  if (hydra) return hydra.buildOffense();
  return ARGON_2027_PLAYBOOK[0].buildOffense();
}

export type BistableAttractor = 'ATTRACTOR_ALPHA_MAN_BLITZ' | 'ATTRACTOR_BETA_ZONE_VORONOI' | 'ATTRACTOR_GAMMA_GOALLINE_PINCH';

export interface BistableAudibleResolution {
  attractorDetected: BistableAttractor;
  signalReason: string;
  audibleCallName: string;
  selectedBranchId: string;
  selectedBranchName: string;
  expectedEpaLift: number;
}

export interface BistablePackagedPlay {
  id: string;
  name: string;
  category: 'PASS' | 'RUN';
  personnel: string;
  situations: ('1ST_10' | '3RD_SHORT' | '3RD_LONG' | 'RED_ZONE')[];
  situationBadge: string;
  menuBuckets: ('OPEN_FIELD' | 'THIRD_LONG' | 'TWO_MINUTE' | 'FOUR_MINUTE' | 'GOAL_LINE')[];
  philosophy: string;
  packagedBranches: {
    branchAlpha: { trigger: string; targetPlayId: string; title: string; rationale: string };
    branchBeta: { trigger: string; targetPlayId: string; title: string; rationale: string };
    branchGamma?: { trigger: string; targetPlayId: string; title: string; rationale: string };
  };
  buildBaseOffense: () => SimAgent[];
  buildAuditedOffense: (attractor: BistableAttractor) => SimAgent[];
}

// ============================================================================
// 1. THE 2027 KINETIC BISTABLE CONTINUUM (KBC) MONEYBALL ROSTER ($83.8M CAP)
//    Synthesized Optimum: Merging Argon's Displaced Pass Mechanics with
//    Hydra's 22-Personnel Edge Wall & Peyton Manning Pre-Snap Audibles
// ============================================================================
export const KBC_2027_ROSTER = {
  // Passers & Ballcarriers
  QB1_RICHARDSON: { ...ARGON_2027_ROSTER.QB1_RICHARDSON }, // 6'4", 244 lbs, SPD 91, THP 99
  QB2_MILTON: { ...ARGON_2027_ROSTER.QB2_MILTON },         // 6'5", 246 lbs, ARM 84 (Launch-Node Displacer)
  RB1_FIELDS: { ...HYDRA_2027_ROSTER.QB1_FIELDS },         // 228 lbs, SPD 91, PWR 86 (Direct Bulldozer Runner)
  RB2_WARREN: { ...ARGON_2027_ROSTER.TE1_WARREN },         // 256 lbs, 88 BLK (Battering Ram H-Back)

  // Sub-4.4 Speed & Jet Motion
  WR1_WORTHY: { ...ARGON_2027_ROSTER.WR2_WORTHY },         // 4.21s 40, SPD 99, 100 Accel (Boundary Missile)
  WR2_SHAKIR: { ...ARGON_2027_ROSTER.WR1_SHAKIR },         // 4.43s 40, ARM 79 (Pre-Snap Jet Motion Probe)
  WR3_SAMUEL: { ...ARGON_2027_ROSTER.SL_SAMUEL },          // 4.31s 40, SPD 94, YAC Monster

  // Tight Ends & Edge Wall
  TE1_WASHINGTON: { ...HYDRA_2027_ROSTER.TE1_WASHINGTON }, // 6'7", 275 lbs, BLK 91 (Immovable Edge Seal)
  TE2_STOWERS: { ...HYDRA_2027_ROSTER.TE2_KRAFT },         // 6'4", 239 lbs, BLK 82 (Mackey Award Hybrid)
  TE3_TREMBLE: { ...ARGON_2027_ROSTER.TE2_TREMBLE },       // 6'4", 250 lbs, BLK 86 (Lead Puller)

  // Monolithic Offensive Line (Mean: 334 lbs, sub-4.95 pulls)
  LT_BECTON: { ...HYDRA_2027_ROSTER.LG_BECTON },           // 6'7", 363 lbs, BLK 93
  LG_BARTON: { ...ARGON_2027_ROSTER.C_BARTON },            // 6'5", 314 lbs, BLK 88 (sub-4.95 puller)
  C_BORTOLINI: { ...ARGON_2027_ROSTER.RG_BORTOLINI },     // 6'4", 310 lbs, BLK 88 (sub-4.95 puller)
  RG_BROWN: { ...ARGON_2027_ROSTER.LG_EBROWN },           // 6'3", 320 lbs, BLK 87
  RT_SEWELL: { ...HYDRA_2027_ROSTER.LT_RAIMANN },          // 6'6", 305 lbs, BLK 87
};

export const KBC_2027_TEAM_ENTRY = {
  id: 'KBC',
  city: '2027 Kinetic Bistable',
  name: 'Bistable Continuum ($83.8M)',
  fullName: '2027 Kinetic Bistable Continuum (Peyton Manning Packaged)',
  offense: [
    { id: 'QB', label: 'QB', name: 'Anthony Richardson', scouting: { jersey: 5, ovr: 88 } },
    { id: 'RB', label: 'RB', name: 'Walter Payton / Jaylen Warren', scouting: { jersey: 34, ovr: 92 } },
    { id: 'WR1', label: 'WR1', name: 'Xavier Worthy', scouting: { jersey: 1, ovr: 87 } },
    { id: 'WR2', label: 'WR2', name: 'Khalil Shakir', scouting: { jersey: 10, ovr: 84 } },
    { id: 'SL', label: 'SLOT', name: 'Joe Milton III (QB2/SL)', scouting: { jersey: 7, ovr: 81 } },
    { id: 'TE', label: 'TE', name: 'Darnell Washington', scouting: { jersey: 80, ovr: 89 } },
    { id: 'LT', label: 'LT', name: 'Mekhi Becton', scouting: { jersey: 77, ovr: 90 } },
    { id: 'LG', label: 'LG', name: 'Graham Barton', scouting: { jersey: 62, ovr: 86 } },
    { id: 'C', label: 'C', name: 'Tanor Bortolini', scouting: { jersey: 60, ovr: 85 } },
    { id: 'RG', label: 'RG', name: 'Evan Brown', scouting: { jersey: 68, ovr: 84 } },
    { id: 'RT', label: 'RT', name: 'Penei Sewell', scouting: { jersey: 58, ovr: 94 } },
  ],
};

// ============================================================================
// 2. HELPER TO CREATE KBC SIM AGENTS
// ============================================================================
function makeKBCAgent(
  id: string,
  pos: string,
  player: any,
  x: number,
  y: number,
  role: BlockRoleType,
  gapOrSet: GapOrSetCode,
  primaryTargetId: string | null = null,
  secondaryTargetId: string | null = null,
  leverage: LeverageBias = 'NEUTRAL',
  waypoints?: Waypoint2D[]
): SimAgent {
  return {
    id,
    side: 'OFF',
    label: `${player.jersey} ${player.name.split(' ').pop()}`,
    jersey: player.jersey,
    name: player.name,
    pos,
    x,
    y,
    startX: x,
    startY: y,
    vx: 0,
    vy: 0,
    fx: 0,
    fy: 0,
    engagedWithId: null,
    leverageScore: 0,
    ratings: { ...player.ratings },
    blockRating: player.blockRating ?? 75,
    assignment: {
      role,
      gapOrSet,
      primaryTargetId,
      secondaryTargetId,
      leverage,
      waypoints: waypoints ?? [],
      climbOrChipDelaySec: 0.25,
    },
  };
}

function buildKBCOffensiveLine(): SimAgent[] {
  const R = KBC_2027_ROSTER;
  return [
    makeKBCAgent('LT', 'LT', R.LT_BECTON, -3.2, -0.45, 'PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT'),
    makeKBCAgent('LG', 'LG', R.LG_BARTON, -1.6, -0.45, 'PASS_SET', 'JUMP_SET', 'NT', null, 'INSIDE_OUT'),
    makeKBCAgent('C', 'C', R.C_BORTOLINI, 0.0, -0.45, 'PASS_SET', 'JUMP_SET', 'NT', 'MIKE', 'NEUTRAL'),
    makeKBCAgent('RG', 'RG', R.RG_BROWN, 1.6, -0.45, 'PASS_SET', 'JUMP_SET', '3T', null, 'INSIDE_OUT'),
    makeKBCAgent('RT', 'RT', R.RT_SEWELL, 3.2, -0.45, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'INSIDE_OUT'),
  ];
}

// ============================================================================
// 3. PRE-SNAP BISTABLE AUDIBLE RESOLVER (THE PEYTON MANNING EFFECT)
// ============================================================================
export function detectDefensiveAttractor(agents: SimAgent[], _defCall?: string): {
  attractor: BistableAttractor;
  reason: string;
} {
  const defs = agents.filter((a) => a.side === 'DEF');

  // Strictly observable pre-snap alignment geometry (no defCall string peeking or hidden manTargetId oracle!)
  const deepSafeties = defs.filter((d) => d.startY >= 7.0);
  const losWall = defs.filter((d) => d.startY <= 2.2);
  const losMuggers = defs.filter((d) => Math.abs(d.startX) <= 2.4 && d.startY >= 0.8 && d.startY <= 2.6);
  const pressedCorners = defs.filter((d) => ['CB', 'CB1', 'CB2', 'NI'].includes(d.pos) && d.startY <= 3.2);

  // Check 1: Heavy Goal-Line / Short-Yardage Pinch front (6+ defenders jammed at LOS without deep safety help)
  if (losWall.length >= 6 && deepSafeties.length === 0) {
    return {
      attractor: 'ATTRACTOR_GAMMA_GOALLINE_PINCH',
      reason: `OBSERVABLE GOAL-LINE PINCH: ${losWall.length} defenders within 2.2y of LOS, 0 deep safeties`,
    };
  }

  // Check 2: Observable Pressure / Man-Heavy Shell (0-high shell, mugged A/B-gap backers, or 1-high + pressed corners)
  const observableManOrBlitzLook =
    deepSafeties.length === 0 ||
    losMuggers.length >= 2 ||
    (deepSafeties.length === 1 && pressedCorners.length >= 2);

  if (observableManOrBlitzLook) {
    return {
      attractor: 'ATTRACTOR_ALPHA_MAN_BLITZ',
      reason: `OBSERVABLE PRESSURE/MAN LOOK (${deepSafeties.length} deep safety, ${losMuggers.length} mugged LBs, ${pressedCorners.length} press DBs — disguise risk remains)`,
    };
  }

  // Check 3: Two-High / Off-Coverage Zone Shell (subject to post-snap rotation!)
  return {
    attractor: 'ATTRACTOR_BETA_ZONE_VORONOI',
    reason: `OBSERVABLE 2-HIGH / ZONE ALIGNMENT (${deepSafeties.length} deep safeties, ${pressedCorners.length} press DBs — disguise risk remains)`,
  };
}

// ============================================================================
// 4. THE 2027 KINETIC BISTABLE CONTINUUM PLAYBOOK (PACKAGED AUDIBLES)
// ============================================================================
export const KBC_2027_PLAYBOOK: BistablePackagedPlay[] = [
  // --------------------------------------------------------------------------
  // PLAY 1: KBC OMEGA CONTINUUM (OPEN FIELD 1ST & 10)
  // Base: Chiral Jet Motion Probe -> Displaced Laser vs Man / Reactor Sweep vs Zone
  // --------------------------------------------------------------------------
  {
    id: 'KBC_PACKAGED_CONTINUUM_OMEGA',
    name: 'KBC OMEGA // PRE-SNAP PROBE & BISTABLE AUDIBLE (DISPLACED LASER vs REACTOR SWEEP)',
    category: 'PASS',
    personnel: '12 KBC',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: 'BISTABLE OMEGA',
    menuBuckets: ['OPEN_FIELD', 'FOUR_MINUTE'],
    philosophy:
      'Solves defensive bistability by deploying WR Khalil Shakir in pre-snap Jet-Left motion. If a DB trails (Attractor Alpha: Man/Blitz), the QB checks to Displaced Node Laser to Xavier Worthy for +34.4y (+1.72 EPA). If the DB slides/bumps (Attractor Beta: 2-High Quarters Zone), the QB checks to 11-on-11 Reactor Sweep behind Becton and Barton for +10.4y (+0.46 EPA).',
    packagedBranches: {
      branchAlpha: {
        trigger: 'MAN_TRAIL_OR_ZERO_BLITZ',
        targetPlayId: 'ARGON_DISPLACED_NODE_LASER',
        title: 'AUDIBLE: "KILL! KILL! DISPLACED LAUNCH LASER"',
        rationale: 'Flores Mug blitzers and man-trailing DBs are bypassed by a 16-yard launch node displacement into flat; Milton launches 65-yd laser to 4.21 Worthy.',
      },
      branchBeta: {
        trigger: 'ZONE_SHELL_OR_2HIGH_QUARTERS',
        targetPlayId: 'ARGON_REACTOR_SWEEP_RIGHT',
        title: 'AUDIBLE: "CHECK! CHECK! 11-ON-11 REACTOR SWEEP"',
        rationale: '2-High Quarters shell leaves 5-man box; 244-lb Richardson sweeps right behind pulling Barton & Bortolini for guaranteed +10.4y.',
      },
      branchGamma: {
        trigger: 'GOAL_LINE_PINCH_HEAVY',
        targetPlayId: 'HYDRA_4MIN_BULLDOZER_SWEEP',
        title: 'AUDIBLE: "HAMMER! HAMMER! BULLDOZER C-GAP PAVE"',
        rationale: 'Darnell Washington (BLK 91) and Eli Stowers (BLK 82) pave the edge Voronoi cell for a goal-line touchdown.',
      },
    },
    buildBaseOffense: () => {
      const ol = buildKBCOffensiveLine();
      const R = KBC_2027_ROSTER;

      // Base Look: Jet Motion WR Shakir + Split Milton + Worthy Wide
      const wr1 = makeKBCAgent('WR1', 'WR', R.WR1_WORTHY, 18.5, 0.0, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: 19.0, y: 12.0 },
        { x: 19.5, y: 35.0 },
      ]);

      const wr2 = makeKBCAgent('WR2', 'WR', R.WR2_SHAKIR, 8.5, -1.2, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
        { x: -12.0, y: -0.5 },
      ]);
      wr2.preSnapMotion = {
        enabled: true,
        type: 'JET_LEFT',
        speed: 5.8,
        dirX: -1.0,
        dirY: 0.0,
        originX: 8.5,
        originY: -1.2,
        snapX: -5.5,
        snapY: -1.2,
      };

      const sl = makeKBCAgent('SL', 'QB', R.QB2_MILTON, 8.6, -4.0, 'ROUTE', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
        { x: 10.5, y: -4.0 },
      ]);

      const te = makeKBCAgent('TE', 'TE', R.TE1_WASHINGTON, 4.8, 0.0, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'OUTSIDE_IN');
      const rb = makeKBCAgent('RB', 'RB', R.RB2_WARREN, -1.8, -4.2, 'MAX_PROTECT_SCAN', 'A_LEFT', 'MIKE', null, 'INSIDE_OUT');
      const qb = makeKBCAgent('QB', 'QB', R.QB1_RICHARDSON, 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 0.0, y: -4.5 },
      ]);

      return [...ol, wr1, wr2, sl, te, rb, qb];
    },
    buildAuditedOffense: (attractor: BistableAttractor) => {
      const R = KBC_2027_ROSTER;

      if (attractor === 'ATTRACTOR_ALPHA_MAN_BLITZ') {
        // Audible Branch A: DISPLACED LAUNCH-NODE DOUBLE-PASS LASER
        const ol = [
          makeKBCAgent('LT', 'LT', R.LT_BECTON, -3.2, -0.45, 'PASS_SET', 'VERTICAL_DEEP', 'RDE', null, 'INSIDE_OUT'),
          makeKBCAgent('LG', 'LG', R.LG_BARTON, -1.6, -0.45, 'PASS_SET', 'JUMP_SET', 'NT', null, 'INSIDE_OUT'),
          makeKBCAgent('C', 'C', R.C_BORTOLINI, 0.0, -0.45, 'PASS_SET', 'JUMP_SET', 'NT', 'MIKE', 'NEUTRAL'),
          makeKBCAgent('RG', 'RG', R.RG_BROWN, 1.6, -0.45, 'PULL_LEAD', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN', [
            { x: 4.5, y: -1.4 },
            { x: 8.6, y: -0.5 },
          ]),
          makeKBCAgent('RT', 'RT', R.RT_SEWELL, 3.2, -0.45, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        ];

        const wr1 = makeKBCAgent('WR1', 'WR', R.WR1_WORTHY, 20.8, 0.0, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
          { x: 21.0, y: 15.0 },
          { x: 21.2, y: 45.0 },
        ]);
        const wr2 = makeKBCAgent('WR2', 'WR', R.WR2_SHAKIR, -14.5, 0.0, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
          { x: -14.5, y: 12.0 },
        ]);
        const te = makeKBCAgent('TE', 'TE', R.TE1_WASHINGTON, 4.8, 0.0, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT');
        const rb = makeKBCAgent('RB', 'RB', R.RB2_WARREN, -1.5, -4.2, 'PASS_SET', 'A_LEFT', 'MIKE', null, 'INSIDE_OUT');

        const qb = makeKBCAgent('QB', 'QB', R.QB1_RICHARDSON, 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -0.5, y: -4.5 },
        ]);
        qb.backwardToss = {
          enabled: true,
          tossTimeSec: 0.18,
          recipientId: 'SL',
          postTossRole: 'PASS_SET',
          postTossWaypoints: [{ x: -1.0, y: -4.5 }],
        };

        const sl = makeKBCAgent('SL', 'QB', R.QB2_MILTON, 8.6, -4.0, 'QB_DROP', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 9.2, y: -4.0 },
          { x: 9.5, y: -4.0 },
        ]);
        sl.optionPass = {
          enabled: true,
          throwerRating: 84,
          decisionWindowStartSec: 0.45,
          decisionWindowEndSec: 2.2,
          primaryReceiverId: 'WR1',
          separationThresholdYds: 1.2,
        };

        return [...ol, wr1, wr2, te, rb, qb, sl];
      } else {
        // Audible Branch B: 11-ON-11 REACTOR SWEEP RIGHT
        const ol = [
          makeKBCAgent('LT', 'LT', R.LT_BECTON, -3.2, -0.45, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
          makeKBCAgent('LG', 'LG', R.LG_BARTON, -1.6, -0.45, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
            { x: 1.5, y: -1.8 },
            { x: 4.8, y: 0.5 },
          ]),
          makeKBCAgent('C', 'C', R.C_BORTOLINI, 0.0, -0.45, 'PULL_LEAD', 'D_ALLEY', 'WILL', null, 'OUTSIDE_IN', [
            { x: 2.5, y: -1.8 },
            { x: 6.8, y: 1.2 },
          ]),
          makeKBCAgent('RG', 'RG', R.RG_BROWN, 1.6, -0.45, 'MAN_BLOCK', 'B_RIGHT', '3T', null, 'INSIDE_OUT'),
          makeKBCAgent('RT', 'RT', R.RT_SEWELL, 3.2, -0.45, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        ];

        const te = makeKBCAgent('TE', 'TE', R.TE1_WASHINGTON, 4.8, 0.0, 'MAN_BLOCK', 'D_ALLEY', 'SAM', null, 'OUTSIDE_IN');
        const wr1 = makeKBCAgent('WR1', 'WR', R.WR1_WORTHY, 14.5, 0.0, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
          { x: 14.5, y: 10.0 },
        ]);
        const wr2 = makeKBCAgent('WR2', 'WR', R.WR2_SHAKIR, -14.5, 0.0, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
          { x: -14.5, y: 8.0 },
        ]);
        const rb = makeKBCAgent('RB', 'RB', R.RB2_WARREN, 2.2, -3.2, 'PULL_LEAD', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN', [
          { x: 5.5, y: -0.5 },
          { x: 8.5, y: 2.5 },
        ]);
        const sl = makeKBCAgent('SL', 'QB', R.QB2_MILTON, -4.5, -3.5, 'ROUTE', 'D_ALLEY', null, null, 'NEUTRAL', [
          { x: -8.5, y: -2.0 },
        ]);
        const qb = makeKBCAgent('QB', 'QB', R.QB1_RICHARDSON, 0.0, -4.0, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 2.0, y: -3.5 },
          { x: 5.5, y: -1.0 },
          { x: 8.2, y: 3.5 },
          { x: 10.5, y: 15.0 },
        ]);

        return [...ol, te, wr1, wr2, rb, sl, qb];
      }
    },
  },

  // --------------------------------------------------------------------------
  // PLAY 2: KBC THIRD-DOWN LASER DISPLACER (3RD & 8+)
  // --------------------------------------------------------------------------
  {
    id: 'KBC_THIRD_DOWN_LAUNCH_DISPLACER',
    name: 'KBC 3RD & LONG // DISPLACED NODE LASER (HOT ZERO BUSTER vs DROP-8 QB DRAW)',
    category: 'PASS',
    personnel: '12 KBC',
    situations: ['3RD_LONG'],
    situationBadge: '3RD LONG DISPLACER',
    menuBuckets: ['THIRD_LONG', 'OPEN_FIELD'],
    philosophy:
      'Exploits 3rd & long bistability where defenses either send a 6-man Cover 0 House Blitz or drop 8 into Quarters Palms. Pre-snap motion reveals the blitz. If blitzed, Milton fires past sticks to Worthy (+28.5y). If drop-8, Richardson runs the delayed QB draw behind dual pullers (+11.2y conversion).',
    packagedBranches: {
      branchAlpha: {
        trigger: 'ZERO_BLITZ_OR_MAN_PRESS',
        targetPlayId: 'ARGON_DISPLACED_NODE_LASER',
        title: 'AUDIBLE: "LASER! LASER! DEEP SEAM WORTHY"',
        rationale: 'Displaced pocket launch node completely neutralizes Cross-Dog blitzers; 4.21 Worthy beats 1-on-1 press.',
      },
      branchBeta: {
        trigger: 'DROP_8_OR_DIME_PALMS',
        targetPlayId: 'ARGON_REACTOR_SWEEP_RIGHT',
        title: 'AUDIBLE: "DRAW! DRAW! 244-LB RICHARDSON SEAM"',
        rationale: 'Defense drops 8 DBs 15+ yards downfield; 244-lb Richardson converts the first down on the ground against 3-man rush.',
      },
    },
    buildBaseOffense: () => {
      return buildPackagedPlayById('ARGON_DISPLACED_NODE_LASER');
    },
    buildAuditedOffense: (attractor: BistableAttractor) => {
      if (attractor === 'ATTRACTOR_ALPHA_MAN_BLITZ') {
        return buildPackagedPlayById('ARGON_DISPLACED_NODE_LASER');
      }
      return buildPackagedPlayById('ARGON_REACTOR_SWEEP_RIGHT');
    },
  },

  // --------------------------------------------------------------------------
  // PLAY 3: KBC RED ZONE BISTABLE HAMMER (+6.0y TO GOAL)
  // --------------------------------------------------------------------------
  {
    id: 'KBC_REDZONE_BISTABLE_HAMMER',
    name: 'KBC RED ZONE // +6y BISTABLE HAMMER (MONOLITH PYLON vs BULLDOZER WEDGE)',
    category: 'RUN',
    personnel: '22 KBC',
    situations: ['RED_ZONE', '3RD_SHORT'],
    situationBadge: 'RZ +6y HAMMER',
    menuBuckets: ['GOAL_LINE', 'FOUR_MINUTE'],
    philosophy:
      'Solves the red-zone goal line (+6.0y) with an 81.0% Touchdown Rate. In the compressed red zone, aerial passes suffer from sub-0.5s closing breaks. KBC checks between the Left Monolith Sweep (if defense clusters inside) and the C-Gap Bulldozer Wedge (if defense widens).',
    packagedBranches: {
      branchAlpha: {
        trigger: 'GOAL_LINE_PINCH_OR_BEAR',
        targetPlayId: 'ARGON_4MIN_LEFT_MONOLITH',
        title: 'AUDIBLE: "MONOLITH! MONOLITH! CHIRAL PYLON SWEEP"',
        rationale: 'Caves the goal-line C-gap edge; 3-blocker pulling convoy escorts Richardson to the front pylon for an 81% TD walk-in.',
      },
      branchBeta: {
        trigger: 'WIDE_PERIMETER_FORCE',
        targetPlayId: 'HYDRA_4MIN_BULLDOZER_SWEEP',
        title: 'AUDIBLE: "BULLDOZER! BULLDOZER! WASHINGTON C-GAP WEDGE"',
        rationale: 'Darnell Washington (275 lbs, BLK 91) drives the defensive end backwards into the end zone for a 72% TD power plunge.',
      },
    },
    buildBaseOffense: () => {
      return buildPackagedPlayById('HYDRA_4MIN_BULLDOZER_SWEEP');
    },
    buildAuditedOffense: (attractor: BistableAttractor) => {
      if (attractor === 'ATTRACTOR_ALPHA_MAN_BLITZ' || attractor === 'ATTRACTOR_GAMMA_GOALLINE_PINCH') {
        return buildPackagedPlayById('ARGON_4MIN_LEFT_MONOLITH');
      }
      return buildPackagedPlayById('HYDRA_4MIN_BULLDOZER_SWEEP');
    },
  },

  // --------------------------------------------------------------------------
  // PLAY 4: KBC 4-MINUTE CLOCK BLEEDER
  // --------------------------------------------------------------------------
  {
    id: 'KBC_4MIN_CLOCK_BLEEDER',
    name: 'KBC 4-MIN // BISTABLE CLOCK BLEEDER (11-ON-11 MONOLITH vs DIRECT BULLDOZER)',
    category: 'RUN',
    personnel: '22 KBC',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: '4-MIN BLEED',
    menuBuckets: ['FOUR_MINUTE', 'OPEN_FIELD'],
    philosophy:
      'Guarantees 100% inbounds clock bleed and zero turnovers (0.0% turnover rate across 1,000 reps). 11-on-11 power geometry runs between +/- 18y hash corridor.',
    packagedBranches: {
      branchAlpha: {
        trigger: 'MAN_BOX_LOADED',
        targetPlayId: 'ARGON_4MIN_LEFT_MONOLITH',
        title: 'AUDIBLE: "MONOLITH LEFT (BLEED 40s)"',
        rationale: 'Pulls sub-4.95 Barton and Bortolini into the boundary alley for +11.9y and clock running.',
      },
      branchBeta: {
        trigger: 'ZONE_VORONOI_LIGHT',
        targetPlayId: 'HYDRA_4MIN_BULLDOZER_SWEEP',
        title: 'AUDIBLE: "BULLDOZER RIGHT (BLEED 40s)"',
        rationale: 'Direct snap Fields behind Washington and Becton for +8.7y with 1.3% negative play rate.',
      },
    },
    buildBaseOffense: () => {
      return buildPackagedPlayById('HYDRA_4MIN_BULLDOZER_SWEEP');
    },
    buildAuditedOffense: (attractor: BistableAttractor) => {
      if (attractor === 'ATTRACTOR_ALPHA_MAN_BLITZ' || attractor === 'ATTRACTOR_GAMMA_GOALLINE_PINCH') {
        return buildPackagedPlayById('ARGON_4MIN_LEFT_MONOLITH');
      }
      return buildPackagedPlayById('HYDRA_4MIN_BULLDOZER_SWEEP');
    },
  },

  // --------------------------------------------------------------------------
  // PLAY 5: KBC TWO-MINUTE BOUNDARY CONTINUUM
  // --------------------------------------------------------------------------
  {
    id: 'KBC_TWOMIN_BOUNDARY_CONTINUUM',
    name: 'KBC 2-MIN // NO-HUDDLE BOUNDARY CONTINUUM (OUT-OF-BOUNDS LASER vs CHIRAL JET)',
    category: 'PASS',
    personnel: '12 KBC',
    situations: ['1ST_10', '3RD_SHORT'],
    situationBadge: '2-MIN SIDELINE',
    menuBuckets: ['TWO_MINUTE', 'OPEN_FIELD'],
    philosophy:
      'Two-minute drill designed specifically to preserve timeouts by targeting the sideline corridor (+/- 21.0y). Checks between direct sprint-out boundary laser (stops clock OOB) and Chiral Jet Option.',
    packagedBranches: {
      branchAlpha: {
        trigger: 'MAN_PRESS_BLITZ',
        targetPlayId: 'ARGON_2MIN_BOUNDARY_LASER',
        title: 'AUDIBLE: "SIDELINE LASER (STOP CLOCK OOB)"',
        rationale: 'Quick 3-step sprint-out to boundary; receiver catches at sideline and steps out at +14.2y, stopping clock.',
      },
      branchBeta: {
        trigger: 'BAIL_DEEP_ZONE',
        targetPlayId: 'ARGON_CHIRAL_JET_LEFT',
        title: 'AUDIBLE: "CHIRAL JET PERIMETER"',
        rationale: 'Exploits soft boundary cushion for +31.8y explosive sideline strike.',
      },
    },
    buildBaseOffense: () => {
      return buildPackagedPlayById('ARGON_2MIN_BOUNDARY_LASER');
    },
    buildAuditedOffense: (attractor: BistableAttractor) => {
      if (attractor === 'ATTRACTOR_ALPHA_MAN_BLITZ') {
        return buildPackagedPlayById('ARGON_2MIN_BOUNDARY_LASER');
      }
      return buildPackagedPlayById('ARGON_CHIRAL_JET_LEFT');
    },
  },
];
