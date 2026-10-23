// ============================================================================
// src/engine.ts
// NFL Coordinator War-Room Simulation Engine (20 Hz Anisotropic Kinematics)
// - Empirical nflfastR Situational Expected Points (EP) & EPA Model
// - Next Gen Stats (NGS) + Madden 25 + Combine Scouting Granular Player Profiles
// - LOS Press-Release Contests, Route Stem-Break Timing & Zone Settle IQ
// - Trench Pass-Set Arcs, Interior Pocket Depth Push & 2.5s Pass Rush Win Rate
// - Pre-Snap Motion Diagnostics, Post-Snap Disguise Rotations & Play-Action Fakes
// - Multi-Objective Evolutionary Play Optimizer (μ + λ Tournament & Crossover)
// ============================================================================

export type BodyArchetype = 'HEAVY_TRENCH' | 'POWER_HYBRID' | 'BALANCED_SKILL' | 'LEAN_SPEED';
export type OffensiveRole =
  | 'QB'
  | 'OL'
  | 'ROUTE'
  | 'CHIP_RELEASE'
  | 'PASS_BLOCK'
  | 'RUN_BLOCK'
  | 'BALL_CARRIER'
  | 'LEAD_BLOCK';

// Granular Defensive System Types (NFL / Madden Playbook Library)
export type DefPersonnel = 'NICKEL_425' | 'BASE_43' | 'DIME_416';
export type DefFront = 'OVER' | 'UNDER' | 'WIDE_9' | 'MUG_A';
export type DefScheme =
  | 'COV3_SKY'
  | 'COV1_ROBBER'
  | 'COV2_TAMPA'
  | 'COV4_QUARTERS'
  | 'COV6_SPLIT'
  | 'ZERO_BLITZ'
  | 'FIRE_ZONE_3';

export type DefensiveCall = 'MIXED' | 'COV3' | 'COV1' | 'COV2' | 'BLITZ' | DefScheme;
export type DefSpyRole = 'NONE' | 'WLB' | 'SS' | 'EDGE2';
export type DLStuntType = 'AUTO' | 'NONE' | 'TE_TWIST' | 'ET_TWIST' | 'OVERLOAD_SLANT';

export interface DefensiveTacticSpec {
  defCall: DefensiveCall;
  front: DefFront;
  dlStunt: DLStuntType;
  spyRole: DefSpyRole;
  matchCoverage: boolean;
  cbCushionY: number; // 1.8 (press), 5.0 (standard), 8.0 (off)
  safetyDepthY: number; // 9.5 (robber/box), 13.0 (standard), 16.5 (deep)
  underDepthY: number; // 4.0 (tight), 6.5 (standard), 9.0 (sticks)
  defPersonnel?: DefPersonnel; // 'NICKEL_425' | 'BASE_43' | 'DIME_416'
}

export type DropbackType = 'STANDARD_DROP' | 'QUICK_GAME' | 'PLAY_ACTION' | 'SPRINT_OUT';

export type BlockingSchemeId =
  | 'HALF_SLIDE'
  | 'FULL_SLIDE_L'
  | 'FULL_SLIDE_R'
  | 'PIN_AND_PULL'
  | 'BIG_ON_BIG'
  | 'MAX_PROTECT'
  | 'GT_COUNTER_PULL'
  | 'POWER_G_PULL'
  | 'INSIDE_ZONE_DUO'
  | 'OUTSIDE_ZONE_STRETCH';

export function isRunBlockingScheme(scheme: BlockingSchemeId): boolean {
  return (
    scheme === 'PIN_AND_PULL' ||
    scheme === 'GT_COUNTER_PULL' ||
    scheme === 'POWER_G_PULL' ||
    scheme === 'INSIDE_ZONE_DUO' ||
    scheme === 'OUTSIDE_ZONE_STRETCH'
  );
}

// Offense Formations, Personnel Groupings, and Pre-Snap Motion
export type OffPersonnelId =
  | '11_PERSONNEL'
  | '12_PERSONNEL'
  | '21_PERSONNEL'
  | 'EMPTY_5W'
  | 'HEAVY_6OL_2INSERT';

export type OffFormationId =
  | 'GUN_TRIPS_RIGHT'
  | 'GUN_DOUBLES'
  | 'GUN_BUNCH_RIGHT'
  | 'SINGLEBACK_ACE'
  | 'EMPTY_QUADS'
  | 'PISTOL_HEAVY_INSERT'
  | 'GUN_HEAVY_OFFSET';

export type PreSnapMotionId =
  | 'NONE'
  | 'JET_R_TO_L'
  | 'JET_L_TO_R'
  | 'ORBIT_RETURN'
  | 'RB_FLAP_OUT'
  | 'TE_SIFT'
  | 'H_INSERT_MOTION'
  | 'F_ORBIT_TELL';

export type SituationId =
  | '1st_10'
  | '2nd_2'
  | '2nd_8'
  | '3rd_3'
  | '3rd_7'
  | '3rd_10'
  | 'RZ_2nd_8';

export type MatchupPresetId =
  | 'NFL_AVERAGE'
  | 'PHI_VS_JAX'
  | 'PHI_VS_KC'
  | 'PHI_VS_BAL'
  | 'DET_VS_SF'
  | 'KC_VS_SF'
  | 'BAL_VS_KC'
  | 'BUF_VS_KC'
  | 'DET_VS_GB'
  | 'HOU_VS_BAL'
  | 'WAS_VS_PHI'
  | 'CIN_VS_BAL'
  | 'DAL_VS_SF'
  | 'THEO_VS_LEAGUE'
  | 'THEO_VS_BAL'
  | 'THEO_VS_KC'
  | 'THEO_VS_SF'
  | (string & {});

export interface Vec2 {
  x: number; // Yards from center of field (-26.65 to +26.65)
  y: number; // Yards from Line of Scrimmage (y = 0 is LOS, +y is downfield)
}

// ============================================================================
// SCOUTING & NEXT GEN STATS TRACKING PROFILE
// ============================================================================
export interface PlayerScoutingProfile {
  ovr: number;              // Overall Madden/Consensus Grade (65-99)
  jersey: number;           // Uniform number
  height: string;           // e.g. "6'1\""
  weightLbs: number;        // e.g. 226
  armLengthIn: number;      // Combine arm length (inches)
  fortyYdDash: number;      // Combine 40-yard dash (seconds)
  tenYdSplit: number;       // 10-yard burst split (seconds)
  ngsMaxSpeedMph: number;   // Next Gen Stats peak tracking speed (mph)
  ngsMetricLabel: string;   // Position-specific NGS tracking stat
  scoutingReport: string;   // Coordinator scouting note / archetype trait
}

// ============================================================================
// GRANULAR PLAYER RATINGS (Madden 25 + Next Gen Stats + Scouting Traits)
// ============================================================================
export interface PlayerRatings {
  // Athletic Foundation
  spd: number; // Straight-line top velocity (40-99)
  acc: number; // Tangential acceleration burst (40-99)
  agi: number; // Centripetal lateral force limit & braking (40-99)
  str: number; // Physical mass / momentum & contact leverage (40-99)

  // Granular Trench & Blocking Traits
  pbk_anchor: number;  // Pass Block Power: Resisting bull rush & interior pocket push
  pbk_lateral: number; // Pass Block Finesse: Mirror footwork vs edge speed rush & spin/rip
  rbk_power: number;   // Run Block Power: Vertical displacement drive
  rbk_reach: number;   // Run Block Reach: Second-level / lateral seal

  // Granular Pass Rush & Front Defense Traits
  rush_power: number;    // Power Moves / Bull Rush speed-to-power
  rush_speed: number;    // Finesse Moves / Dip & Rip edge bend
  bsh_shed: number;      // Block Shedding torque / hand disengagement
  get_off_burst: number; // Snap jump / first-step get-off reaction (40-99)

  // Granular Passing & QB Processing
  thp: number;            // Throw Power (release velocity & deep trajectory zip)
  tha_short: number;      // Throw Accuracy Short (0-9 yds)
  tha_med: number;        // Throw Accuracy Intermediate (10-19 yds)
  tha_deep: number;       // Throw Accuracy Deep (20+ yds)
  tup_pressure: number;   // Throw Under Pressure poise
  qb_read_speed: number;  // Post-snap progression processing speed
  pre_snap_read: number;  // Pre-snap disguise & motion tell recognition
  release_quick: number;  // Throwing motion release quickness

  // Granular Receiver & Ballcarrier Traits
  release_press: number;  // LOS Release vs Press Jam (footfire / hand swipe)
  rr_short: number;       // Short route cut sharpness & braking (0-9 yds)
  rr_med: number;         // Intermediate route stem leverage & break (10-19 yds)
  rr_deep: number;        // Deep stem tracking & separation (20+ yds)
  zone_find_iq: number;   // Option route / settling in soft zone voids
  catch_hands: number;    // Clean catch reliability (low drop rate)
  catch_traffic: number;  // Contested catch / hands in traffic vs contact
  catch_radius: number;   // Wingspan / high-point adjustment radius
  btk_power: number;      // Break tackle power (contact balance / stiff-arm)
  elusiveness: number;    // Elusiveness / juke / slipping open-field pursuit
  ball_security: number;  // Fumble resistance against hit power
  lateral_vision: number; // Downfield pitch decision IQ & backward pitch accuracy

  // Granular Coverage & Tackling Traits
  press_jam: number;      // Press disruption at the Line of Scrimmage
  cov_man: number;        // Man-to-man mirror, hip fluidity & cut recovery
  cov_zone: number;       // Zone landmark discipline, pattern-matching & break on ball
  play_rec: number;       // Play Recognition (diagnosing play-action, screen, misdirection)
  catch_contest: number;  // Pass breakup timing / raking receiver's hands
  ball_hawk: number;      // Interception conversion hands & tracking
  tak_wrap: number;       // Form wrap-up tackling efficiency
  tak_hit_power: number;  // Hit power (jarring passes loose, forcing fumbles)

  // Backward compatibility convenience getters
  rr_thp?: number;
  pbk_tha?: number;
  bsh_tak?: number;
  btk_cov?: number;
}

export function makeRatings(base: Partial<PlayerRatings>): PlayerRatings {
  const spd = base.spd ?? 78;
  const acc = base.acc ?? 80;
  const agi = base.agi ?? 78;
  const str = base.str ?? 76;
  const rrShort = base.rr_short ?? base.rr_thp ?? agi;
  const rrDeep = base.rr_deep ?? base.rr_thp ?? spd;
  const thaShort = base.tha_short ?? base.pbk_tha ?? 78;
  const thaDeep = base.tha_deep ?? base.pbk_tha ?? 78;
  const covMan = base.cov_man ?? base.btk_cov ?? agi;
  const covZone = base.cov_zone ?? base.btk_cov ?? 82;

  return {
    spd,
    acc,
    agi,
    str,
    pbk_anchor: base.pbk_anchor ?? str,
    pbk_lateral: base.pbk_lateral ?? agi,
    rbk_power: base.rbk_power ?? str,
    rbk_reach: base.rbk_reach ?? agi,
    rush_power: base.rush_power ?? str,
    rush_speed: base.rush_speed ?? spd,
    bsh_shed: base.bsh_shed ?? Math.round((str + agi) / 2),
    get_off_burst: base.get_off_burst ?? acc,
    thp: base.thp ?? base.rr_thp ?? 78,
    tha_short: thaShort,
    tha_med: base.tha_med ?? Math.round((thaShort + thaDeep) / 2),
    tha_deep: thaDeep,
    tup_pressure: base.tup_pressure ?? 80,
    qb_read_speed: base.qb_read_speed ?? 82,
    pre_snap_read: base.pre_snap_read ?? 82,
    release_quick: base.release_quick ?? 82,
    release_press: base.release_press ?? Math.round(0.6 * rrShort + 0.4 * str),
    rr_short: rrShort,
    rr_med: base.rr_med ?? Math.round((rrShort + rrDeep) / 2),
    rr_deep: rrDeep,
    zone_find_iq: base.zone_find_iq ?? Math.round((rrShort + 84) / 2),
    catch_hands: base.catch_hands ?? Math.min(98, (base.catch_traffic ?? 80) + 3),
    catch_traffic: base.catch_traffic ?? 78,
    catch_radius: base.catch_radius ?? 80,
    btk_power: base.btk_power ?? base.btk_cov ?? str,
    elusiveness: base.elusiveness ?? agi,
    ball_security: base.ball_security ?? 86,
    lateral_vision: base.lateral_vision ?? 78,
    press_jam: base.press_jam ?? Math.round(0.55 * covMan + 0.45 * str),
    cov_man: covMan,
    cov_zone: covZone,
    play_rec: base.play_rec ?? covZone,
    catch_contest: base.catch_contest ?? Math.round((covMan + covZone) / 2),
    ball_hawk: base.ball_hawk ?? base.catch_contest ?? 78,
    tak_wrap: base.tak_wrap ?? base.bsh_tak ?? 82,
    tak_hit_power: base.tak_hit_power ?? str,
    rr_thp: base.rr_thp ?? base.thp ?? rrShort,
    pbk_tha: base.pbk_tha ?? thaShort,
    bsh_tak: base.bsh_tak ?? base.bsh_shed ?? 80,
    btk_cov: base.btk_cov ?? covMan,
  };
}

export type RouteBreakStyle = 'SHARP_PIVOT' | 'ROUNDED_SPEED';

export type ChoiceRouteCondition =
  | 'NONE'
  | 'MOFC'
  | 'MOFO'
  | 'MAN'
  | 'ZONE'
  | 'LEVERAGE_INSIDE'
  | 'LEVERAGE_OUTSIDE';

export interface ChoiceRouteRule {
  condition: ChoiceRouteCondition;
  waypoints: Vec2[];
  description?: string;
}

export interface PlayerConfig {
  id: string;
  label: string;
  name: string;
  team: 'OFF' | 'DEF';
  archetype: BodyArchetype;
  eligible: boolean;
  startPos: Vec2;
  role: OffensiveRole;
  readOrder: number; // 1..5 for eligible receivers
  waypoints: Vec2[]; // Route nodes in field coordinates
  ratings: PlayerRatings;
  scouting?: PlayerScoutingProfile;
  breakStyle?: RouteBreakStyle;
  choiceRules?: ChoiceRouteRule[];
  choiceActiveDesc?: string;
}

export interface SituationSpec {
  id: SituationId;
  label: string;
  shortDesc: string;
  down: number;
  distance: number;
  yardline: number; // Yards from own goal (e.g. 25 = Own 25, 62 = Opp 38, 92 = Opp 8)
  goalYards: number; // Yards required for Situational Goal Success
  strategicNote: string;
}

export const SITUATIONS: Record<SituationId, SituationSpec> = {
  '1st_10': {
    id: '1st_10',
    label: '1st & 10 (Own 25)',
    shortDesc: 'Open-Field Script | Goal: +4.5y',
    down: 1,
    distance: 10,
    yardline: 25,
    goalYards: 4.5,
    strategicNote:
      'Early-down efficiency script. Staying ahead of the chains (>=4.5 yds or EPA > 0) unlocks the entire call sheet. Pre-snap motion and play-action manipulate linebackers before they can key run/pass.',
  },
  '2nd_2': {
    id: '2nd_2',
    label: '2nd & 2 (Midfield 50)',
    shortDesc: 'Conflict / Shot Down | Goal: +2.0y',
    down: 2,
    distance: 2,
    yardline: 50,
    goalYards: 2.0,
    strategicNote:
      'Highest-leverage offensive down in the NFL. Defense must respect the short-yardage run box, creating 1-on-1 vertical and intermediate play-action shot windows with 3rd-and-2 safety net.',
  },
  '2nd_8': {
    id: '2nd_8',
    label: '2nd & 8 (Own 42)',
    shortDesc: 'Chain-Mover Down | Goal: +5.0y',
    down: 2,
    distance: 8,
    yardline: 42,
    goalYards: 5.0,
    strategicNote:
      'Critical bridge down to avoid 3rd-and-long. High-percentage spacing, mesh, and flood concepts that gain 5+ yards set up manageable 3rd-and-short conversions.',
  },
  '3rd_3': {
    id: '3rd_3',
    label: '3rd & 3 (Opp 38)',
    shortDesc: 'Short Sticks / 4-Down Terr. | Goal: +3.0y',
    down: 3,
    distance: 3,
    yardline: 62,
    goalYards: 3.0,
    strategicNote:
      'Defense tightens cushions at the 3-yard sticks and brings Cover 1 Robber or press blitzes. Rub/pick routes (Mesh/Bunch), option whips, and QB scramble lanes Punish man leverage.',
  },
  '3rd_7': {
    id: '3rd_7',
    label: '3rd & 7 (Opp 45)',
    shortDesc: 'Money Down / Sim Pressure | Goal: +7.0y',
    down: 3,
    distance: 7,
    yardline: 55,
    goalYards: 7.0,
    strategicNote:
      'Classic NFL "Money Down." Defensive coordinators deploy Sim Pressures (Creeper), Fire Zones, and 2-Man under. Requires protection integrity (TE/RB chip) and routes breaking right at 7.5–10 yards.',
  },
  '3rd_10': {
    id: '3rd_10',
    label: '3rd & 10 (Own 40)',
    shortDesc: 'True Passing / Sticks Def | Goal: +10.0y',
    down: 3,
    distance: 10,
    yardline: 40,
    goalYards: 10.0,
    strategicNote:
      'Defense plays "Sticks" depth (underneath zones sink to 9–10 yds) with Wide-9 edge rushers pinning ears back. Checkdowns short of the sticks yield negative EPA; high-low Dagger/Sail concepts stress intermediate voids.',
  },
  'RZ_2nd_8': {
    id: 'RZ_2nd_8',
    label: 'Red Zone 2nd & Goal (Opp 8)',
    shortDesc: 'Compressed End Zone | Goal: +8.0y TD',
    down: 2,
    distance: 8,
    yardline: 92,
    goalYards: 8.0,
    strategicNote:
      'Vertical field compressed to 18 total yards (8 to goal line + 10-yd end zone). Deep safeties cap at the back line, condensing windows. High-point contested catch ability, crisp red-zone breaks, and QB scramble threat dominate.',
  },
};

// ============================================================================
// PRE-SNAP MOTION & RECOGNITION TELL INTERFACES
// ============================================================================
export interface MotionSpec {
  id: PreSnapMotionId;
  playerId: string;
  path: Vec2[];
  duration: number;
}

export interface PreSnapTell {
  motionReaction: 'MAN_TRAIL' | 'ZONE_BUMP' | 'DISGUISE_HOLD' | 'NONE';
  trailingDefenderName: string | null;
  manConfidence: number;  // 0 - 100%
  zoneConfidence: number; // 0 - 100%
  safetyShell: 'MOFC_1_HIGH' | 'MOFO_2_HIGH' | 'ZERO_HIGH';
  postSnapRotation: string;
  boxCount: number;       // Defender count in tackle box
  qbInfoBonus: number;    // Processing speed & anticipation boost
  leverageShiftYds: number;
  summaryText: string;
}

// Runtime agent state at tick t (20 Hz, dt = 0.05s)
export interface AgentRuntime {
  id: string;
  label: string;
  name: string;
  team: 'OFF' | 'DEF';
  archetype: BodyArchetype;
  pos: Vec2;
  vel: Vec2;
  heading: number;
  role: OffensiveRole;
  readOrder: number;
  waypoints: Vec2[];
  wpIndex: number;
  ratings: PlayerRatings;

  // Trench, Press & Route interaction states
  blockType:
    | 'PASS_ANCHOR'
    | 'PASS_MIRROR'
    | 'RUN_DRIVE'
    | 'CHIP_RELEASE'
    | 'PULL_KICK'
    | 'PULL_WRAP'
    | 'PIN_DOWN';
  engagedWith: number | null;
  isPulling?: boolean;
  leverageAngle: number;
  stunTimer: number;
  chipTimer: number;
  pressJamTimer: number;      // LOS press engagement timer (0 - 0.40s)
  pressTested: boolean;       // Whether LOS press release was resolved
  motionFreeRelease: boolean; // True if player was in motion or stacked off LOS
  cutReactionTimer: number;   // Defender delay after receiver route cut
  ballBreakDelay: number;     // Defender visual reaction delay when ball is thrown
  playActionFreezeTimer: number; // LB/Safety freeze on play-action fake
  lastTargetVelDir: Vec2;
  lungeLockTimer: number;
  expectedBreakTime: number;  // Estimated time (s) when receiver hits primary break
  breakStyle?: RouteBreakStyle;
  choiceRules?: ChoiceRouteRule[];
  choiceActiveDesc?: string;
  hasResolvedChoice?: boolean;

  // Defensive scheme attributes
  assignType: 'RUSH' | 'MAN' | 'ZONE_DEEP' | 'ZONE_UNDER' | 'ROBBER' | 'SPY';
  manTargetIdx: number;
  zoneAnchor: Vec2;
  zoneCapY: number;

  // Defensive stunt and pattern match attributes
  stuntRole?: 'NONE' | 'CRASHER' | 'LOOPER' | 'SLANTER';
  stuntPartnerIdx?: number;
  stuntStage?: number;
  matchedReceiverIdx?: number | null;
}

export interface QbReadEvaluation {
  slot: number;
  readOrder: number;
  receiverId: string;
  receiverName: string;
  routePhase: 'STEM' | 'BREAK_WINDOW' | 'SETTLED' | 'SCRAMBLE_DRILL';
  separation: number;
  openness: number; // 0.0 - 1.0
  compProb: number; // Expected NGS Completion Probability (0.0 - 1.0)
  expectedEpaIfThrown: number;
  utility: number;
  isPrimaryLook: boolean;
}

export interface QbDecisionTelemetry {
  riskTolerance: number;
  dropbackType: DropbackType;
  currentReadSlot: number;
  readEvaluations: QbReadEvaluation[];
  scrambleLaneOpenness: number;
  scrambleUtility: number;
  spyActive: boolean;
  spyDefenderName: string | null;
  decisionType: 'THROW' | 'SCRAMBLE' | 'THROWAWAY' | 'SACK' | 'PENDING' | 'DESIGNED_RUN';
  chosenTargetName: string;
}

export interface TickSnapshot {
  tick: number;
  time: number;
  qbReadOrder: number;
  pocketPressure: number;
  ballState: 'HELD' | 'IN_FLIGHT' | 'LATERAL_FLIGHT' | 'CAUGHT' | 'DEAD' | 'FUMBLE';
  ballPos: Vec2;
  ballTargetPos: Vec2;
  carrierIdx: number | null;
  pitcherIdx?: number | null;
  isScramble?: boolean;
  activeScheme?: DefScheme;
  activeStunt?: DLStuntType;
  matchCoverageActive?: boolean;
  ballZ?: number; // Height in yards above ground (for 3D loft, shadow, and pass tips)
  agents: {
    id: string;
    label: string;
    name: string;
    team: 'OFF' | 'DEF';
    archetype: BodyArchetype;
    x: number;
    y: number;
    vx: number;
    vy: number;
    heading: number;
    engaged: boolean;
    stunned: boolean;
    isSpy?: boolean;
    assignType?: AgentRuntime['assignType'];
    zoneAnchor?: Vec2;
    stuntRole?: AgentRuntime['stuntRole'];
    matchedReceiverIdx?: number | null;
  }[];
}

export type PlayOutcome =
  | 'COMPLETE'
  | 'INCOMPLETE'
  | 'SACK'
  | 'INTERCEPTION'
  | 'FUMBLE'
  | 'RUN_GAIN'
  | 'RUN_STUFF'
  | 'RUN_TOUCHDOWN';

export interface PlaySimResult {
  outcome: PlayOutcome;
  yardsGained: number;
  airYards: number;
  yacYards: number;
  epa: number;
  goalSuccess: boolean;
  epaSuccess: boolean; // EPA > 0
  timeToThrow: number;
  wasPressured: boolean;
  targetedPlayerId: string | null;
  targetedReadOrder: number;
  catchPos: Vec2 | null;
  brokenTackles: number;
  lateralsAttempted: number;
  lateralsCompleted: number;
  preSnapTell: PreSnapTell;
  commentary: string;
  snapshots: TickSnapshot[];
  isScramble?: boolean;
  scrambleYards?: number;
  qbDecisionTelemetry?: QbDecisionTelemetry;
  activeScheme?: DefScheme;
  activeStunt?: DLStuntType;
  matchCoverageActive?: boolean;
  throwTrajectory?: BallTrajectorySpec;
  isRunPlay?: boolean;
}

export interface MonteCarloSummary {
  snaps: number;
  meanEpa: number;
  medianEpa: number;
  stdEpa: number;
  varEpa: number;
  cvar10Epa: number;
  epaSuccessRate: number; // % of snaps with EPA > 0
  goalSuccessRate: number; // % of snaps achieving situational goalYards
  completionRate: number;
  sackRate: number;
  pressureRate: number;
  intRate: number;
  fumbleRate: number;
  avgYards: number;
  avgAirYards: number;
  avgYacYards: number;
  avgTimeToThrow: number;
  primaryReadShare: number;
  checkdownShare: number;
  lateralSuccessShare: number;
  scrambleRate: number;
  avgScrambleYards: number;
  epaSamples: number[];
  scatterPoints: { x: number; y: number; outcome: PlayOutcome; yards: number; epa: number }[];
  isRunPlay?: boolean;
  yardsPerCarry?: number;
  stuffRate?: number;
  explosiveRunRate?: number;
  brokenTackleRate?: number;
  rushingSuccessRate?: number;
}

// ============================================================================
// DETERMINISTIC PRNG (Mulberry32) + Box-Muller Gaussian
// ============================================================================
export class PRNG {
  private state: number;
  constructor(seed = 1337) {
    this.state = seed >>> 0;
  }
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  gaussian(): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }
}

// ============================================================================
// KINEMATIC RATING CURVES (Calibrated to NFL Next Gen Stats Tracking Data)
// ============================================================================
export function getMaxSpeedYdsPerSec(spd: number): number {
  // NGS Calibration:
  // 65 SPD OL -> ~7.2 yds/s (14.7 mph)
  // 85 SPD TE/LB -> ~9.0 yds/s (18.4 mph)
  // 93 SPD WR1 -> ~9.85 yds/s (20.1 mph in pads on routes)
  // 99 SPD Elite Burner -> ~10.55 yds/s (21.6 mph)
  const norm = Math.max(0, Math.min(1, (spd - 45) / 54));
  return 6.15 + 4.40 * Math.pow(norm, 1.12);
}

export function getMaxTangentialAccel(acc: number): number {
  const norm = Math.max(0, Math.min(1, (acc - 45) / 54));
  return 5.5 + 5.6 * norm;
}

export function getMaxLateralCentripetalAccel(agi: number, rrBonus = 0): number {
  const effectiveAgi = Math.min(99, agi * 0.78 + (rrBonus || agi) * 0.22);
  const norm = Math.max(0, Math.min(1, (effectiveAgi - 45) / 54));
  return 6.0 + 13.8 * Math.pow(norm, 1.40);
}

export function getMaxBrakingDecel(agi: number): number {
  const norm = Math.max(0, Math.min(1, (agi - 45) / 54));
  return 6.8 + 10.8 * Math.pow(norm, 1.25);
}

// ============================================================================
// 3D BALLISTIC FOOTBALL TRAJECTORY & THROW POWER KINEMATICS
// ============================================================================
export interface BallTrajectorySpec {
  v0: number; // 3D exit speed in yards/sec (scaled from THP)
  vh: number; // Horizontal ground speed in yards/sec
  vz: number; // Initial vertical launch speed in yards/sec
  launchAngleDeg: number; // Elevation angle in degrees
  flightTime: number; // True horizontal flight duration in seconds
  apexHeightYds: number; // Peak height above turf in yards
  passType: 'BULLET' | 'TOUCH_INTERMEDIATE' | 'HIGH_LOFT_DEEP';
}

export function computeBallTrajectory(
  qbPos: Vec2,
  targetPos: Vec2,
  thp: number,
  hasUnderneathObstacle = false,
  isTouchPass = false
): BallTrajectorySpec {
  const dx = targetPos.x - qbPos.x;
  const dy = targetPos.y - qbPos.y;
  const dist = Math.max(1.0, Math.hypot(dx, dy));

  // Exit velocity from THP rating (22.0 to 30.8 yd/s, ~45 to ~63 mph in pads)
  const thpNorm = Math.max(0, Math.min(1, (thp - 50) / 49));
  const v0 = 22.0 + 8.8 * thpNorm;
  const g = 10.725; // Acceleration due to gravity in yd/s^2 (9.81 m/s^2)

  // Minimum launch angle required by physics to achieve distance (R = v0^2 * sin(2theta) / g)
  const maxRange = (v0 * v0) / g;
  const rangeRatio = Math.min(0.98, dist / maxRange);
  const minDriveAngleRad = 0.5 * Math.asin(rangeRatio);
  const minDriveAngleDeg = (minDriveAngleRad * 180) / Math.PI;

  let launchAngleDeg: number;
  let passType: BallTrajectorySpec['passType'];

  if (dist <= 12.0 && !hasUnderneathObstacle) {
    // Short bullet / laser throw: low flat drive angle
    passType = 'BULLET';
    launchAngleDeg = Math.max(6.0, Math.min(12.0, minDriveAngleDeg + 2.0));
  } else if (dist <= 22.0 && !hasUnderneathObstacle && !isTouchPass) {
    // Intermediate line-drive
    passType = 'BULLET';
    launchAngleDeg = Math.max(10.0, Math.min(18.0, minDriveAngleDeg + 4.0));
  } else if (dist <= 24.0 || hasUnderneathObstacle) {
    // Touch intermediate pass: lofted to clear underneath linebackers (apex >= 3.8y)
    passType = 'TOUCH_INTERMEDIATE';
    const touchAngleDeg = Math.max(18.0, minDriveAngleDeg + (hasUnderneathObstacle ? 10.0 : 6.0));
    launchAngleDeg = Math.min(32.0, touchAngleDeg);
  } else {
    // Deep shot / bucket pass (dist > 24y):
    // Strong-armed QBs can drive with lower loft (~24-28 deg).
    // Weak-armed QBs lack velocity, so rangeRatio is high and minDriveAngleDeg is high.
    // To clear coverage and drop into bucket, weak arms must loft at 36-44 deg!
    passType = 'HIGH_LOFT_DEEP';
    const loftAdd = 14.0 + (1.0 - thpNorm) * 10.0; // Weaker arms must loft significantly higher
    launchAngleDeg = Math.max(minDriveAngleDeg + 4.0, Math.min(44.0, minDriveAngleDeg + loftAdd));
  }

  const thetaRad = (launchAngleDeg * Math.PI) / 180;
  const vh = Math.max(12.0, v0 * Math.cos(thetaRad));
  const vz = v0 * Math.sin(thetaRad);
  const flightTime = Math.max(0.18, dist / vh);

  const z0 = 2.1; // Shoulder release height in yards (~6.3 ft)
  const apexHeightYds = z0 + (vz * vz) / (2 * g);

  return {
    v0,
    vh,
    vz,
    launchAngleDeg,
    flightTime,
    apexHeightYds,
    passType,
  };
}

// ============================================================================
// EMPIRICAL nflfastR EXPECTED POINTS (EP) & SITUATIONAL EPA MODEL
// ============================================================================
function computeFirstDownBaseEp(yardline: number): number {
  const y = Math.max(1, Math.min(99, yardline));
  // Smooth piecewise polynomial calibrated to nflfastR 1st & 10 Expected Points:
  // y=5 -> -0.35 | y=25 -> +1.05 | y=50 -> +2.55 | y=70 -> +3.85 | y=85 -> +4.90 | y=95 -> +5.75
  return -0.68 + 0.068 * y + 0.000095 * Math.max(0, y - 35) ** 2 - 0.22 * Math.exp(-y / 8.0);
}

export function computeExpectedPoints(down: number, distance: number, yardline: number): number {
  if (yardline >= 100) return 6.96; // Touchdown (7 pts minus small XP miss probability)
  if (yardline <= 0) return -2.0;   // Safety

  const base1st = computeFirstDownBaseEp(yardline);
  const goalDist = Math.min(10, 100 - yardline);
  const effDist = Math.max(0.5, distance);

  if (down === 1) {
    return base1st - 0.042 * (effDist - goalDist);
  }
  if (down === 2) {
    // Smooth transition: 0 yards on 1st & 10 -> 2nd & 10 costs ~ -0.52 EPA; +4.5 yds -> +0.02 EPA
    return base1st - 0.21 - 0.056 * (effDist - 4.5);
  }
  if (down === 3) {
    // 3rd down value depends heavily on distance to sticks
    const shortBonus = effDist <= 2.5 ? 0.14 : 0;
    return base1st - 0.68 - 0.092 * (effDist - 3.5) + shortBonus;
  }

  // 4th down value (field goal / punt / go-for-it envelope)
  const fgRangeProb =
    yardline >= 62 ? Math.min(0.95, 0.32 + (yardline - 62) * 0.024) : 0;
  const puntLanding = Math.max(12, Math.min(92, 100 - (yardline + 41)));
  const puntEp = -computeFirstDownBaseEp(puntLanding) * 0.88;
  const fgEp = fgRangeProb > 0 ? fgRangeProb * 3.0 + (1 - fgRangeProb) * (-computeFirstDownBaseEp(Math.max(20, 100 - yardline))) : -99;
  const goConvProb = Math.max(0.08, Math.min(0.76, 0.72 - 0.058 * (effDist - 1)));
  const goEp =
    goConvProb * computeFirstDownBaseEp(Math.min(99, yardline + effDist)) +
    (1 - goConvProb) * (-computeFirstDownBaseEp(100 - yardline));

  return Math.max(puntEp, fgEp, goEp - 0.15);
}

export function evaluateSnapEPA(
  sit: SituationSpec,
  outcome: PlayOutcome,
  yardsGained: number
): { epa: number; goalSuccess: boolean; epaSuccess: boolean } {
  const epBefore = computeExpectedPoints(sit.down, sit.distance, sit.yardline);
  const rawNewYardline = sit.yardline + yardsGained;

  if (outcome === 'INTERCEPTION' || outcome === 'FUMBLE') {
    const spotYds = Math.max(1, Math.min(99, rawNewYardline));
    const oppYardline = Math.max(1, Math.min(99, 100 - spotYds + (outcome === 'INTERCEPTION' ? 4 : 1)));
    const oppEp = computeExpectedPoints(1, Math.min(10, 100 - oppYardline), oppYardline);
    // Expected turnover value is negative of opponent's starting EP minus our pre-snap EP
    const epa = Math.max(-5.2, -oppEp * 0.92 - epBefore);
    return { epa, goalSuccess: false, epaSuccess: false };
  }

  if (rawNewYardline >= 100) {
    const epa = 6.96 - epBefore;
    return { epa, goalSuccess: true, epaSuccess: true };
  }

  if (rawNewYardline <= 0) {
    const epa = -2.0 - epBefore;
    return { epa, goalSuccess: false, epaSuccess: false };
  }

  const newYardline = Math.max(1, Math.min(99, rawNewYardline));
  const achievedFirstDown = yardsGained >= sit.distance;
  let epAfter = 0;

  if (achievedFirstDown) {
    epAfter = computeExpectedPoints(1, Math.min(10, 100 - newYardline), newYardline);
  } else {
    const nextDown = sit.down + 1;
    const nextDist = Math.max(0.5, sit.distance - yardsGained);
    epAfter = computeExpectedPoints(nextDown, nextDist, newYardline);
  }

  const sackPenalty = outcome === 'SACK' ? -0.14 : 0.0;
  const epa = epAfter - epBefore + sackPenalty;
  const epaSuccess = epa > 0;
  const isOffensiveSuccess = outcome === 'COMPLETE' || outcome === 'RUN_GAIN' || outcome === 'RUN_TOUCHDOWN';
  const goalSuccess =
    isOffensiveSuccess &&
    (yardsGained >= sit.goalYards || achievedFirstDown || (sit.down === 1 && epa > 0.02));

  return { epa, goalSuccess, epaSuccess };
}

// ============================================================================
// NFL LEAGUE BENCHMARKS & WHOLE-OFFENSE PERCENTILE MODEL
// ============================================================================
export interface SituationalLeagueBenchmark {
  situationId: SituationId;
  label: string;
  leagueAvgEpa: number;
  leagueAvgSuccessRate: number;
  leagueAvgGoalRate: number;
  teamEpaStdDev: number; // Seasonal team-level standard deviation (nflfastR passing data)
}

export const NFL_LEAGUE_BENCHMARKS: Record<SituationId, SituationalLeagueBenchmark> = {
  '1st_10': {
    situationId: '1st_10',
    label: '1st & 10 (Own 25)',
    leagueAvgEpa: 0.048,
    leagueAvgSuccessRate: 46.5,
    leagueAvgGoalRate: 42.0,
    teamEpaStdDev: 0.115,
  },
  '2nd_2': {
    situationId: '2nd_2',
    label: '2nd & 2 (Midfield 50)',
    leagueAvgEpa: 0.125,
    leagueAvgSuccessRate: 58.2,
    leagueAvgGoalRate: 56.5,
    teamEpaStdDev: 0.130,
  },
  '2nd_8': {
    situationId: '2nd_8',
    label: '2nd & 8 (Own 42)',
    leagueAvgEpa: 0.038,
    leagueAvgSuccessRate: 44.8,
    leagueAvgGoalRate: 40.5,
    teamEpaStdDev: 0.120,
  },
  '3rd_3': {
    situationId: '3rd_3',
    label: '3rd & 3 (Opp 38)',
    leagueAvgEpa: 0.185,
    leagueAvgSuccessRate: 52.4,
    leagueAvgGoalRate: 52.0,
    teamEpaStdDev: 0.140,
  },
  '3rd_7': {
    situationId: '3rd_7',
    label: '3rd & 7 (Opp 45)',
    leagueAvgEpa: -0.024,
    leagueAvgSuccessRate: 41.8,
    leagueAvgGoalRate: 41.0,
    teamEpaStdDev: 0.125,
  },
  '3rd_10': {
    situationId: '3rd_10',
    label: '3rd & 10 (Own 40)',
    leagueAvgEpa: -0.142,
    leagueAvgSuccessRate: 34.6,
    leagueAvgGoalRate: 33.5,
    teamEpaStdDev: 0.135,
  },
  'RZ_2nd_8': {
    situationId: 'RZ_2nd_8',
    label: 'Red Zone 2nd & Goal (Opp 8)',
    leagueAvgEpa: 0.075,
    leagueAvgSuccessRate: 46.0,
    leagueAvgGoalRate: 32.0,
    teamEpaStdDev: 0.145,
  },
};

export interface OffensePercentileReport {
  situationId: SituationId;
  playMeanEpa: number;
  playSuccessRate: number;
  playGoalRate: number;
  leagueAvgEpa: number;
  leagueAvgSuccessRate: number;
  leagueAvgGoalRate: number;
  deltaEpa: number;
  deltaSuccessRate: number;
  zScore: number;
  percentile: number;
  tierName: string;
  franchiseComp: string;
  summaryText: string;
}

export function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const a = Math.abs(x);
  const p = 0.3275911;
  const t = 1.0 / (1.0 + p * a);
  const y =
    1.0 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-a * a);
  return sign * y;
}

export function normalCdf(mean: number, stdDev: number, x: number): number {
  if (stdDev <= 0) return x >= mean ? 1.0 : 0.0;
  return 0.5 * (1.0 + erf((x - mean) / (stdDev * Math.SQRT2)));
}

export function computeOffensePercentile(
  summary: { meanEpa: number; epaSuccessRate: number; goalSuccessRate?: number },
  situation: SituationSpec
): OffensePercentileReport {
  const bench = NFL_LEAGUE_BENCHMARKS[situation.id] || {
    situationId: situation.id,
    label: situation.label,
    leagueAvgEpa: 0.050,
    leagueAvgSuccessRate: 45.5,
    leagueAvgGoalRate: 40.0,
    teamEpaStdDev: 0.120,
  };

  const deltaEpa = summary.meanEpa - bench.leagueAvgEpa;
  const deltaSuccessRate = summary.epaSuccessRate - bench.leagueAvgSuccessRate;
  const zScore = deltaEpa / bench.teamEpaStdDev;
  const rawPct = normalCdf(bench.leagueAvgEpa, bench.teamEpaStdDev, summary.meanEpa) * 100;
  const percentile = Math.max(0.1, Math.min(99.9, parseFloat(rawPct.toFixed(1))));

  let tierName = 'League Average Offense';
  let franchiseComp = '2023 Houston Texans / 2023 LA Rams';

  if (percentile >= 99.0) {
    tierName = 'Historic God-Tier Offense (Top 0.5%)';
    franchiseComp = '2007 New England Patriots / 2018 Kansas City Chiefs';
  } else if (percentile >= 95.0) {
    tierName = 'Super Bowl MVP Caliber (Top 3%)';
    franchiseComp = '2020 Green Bay Packers / 2016 Atlanta Falcons';
  } else if (percentile >= 85.0) {
    tierName = 'Elite Top-5 Passing Attack';
    franchiseComp = '2023 San Francisco 49ers / 2021 Tampa Bay Buccaneers';
  } else if (percentile >= 70.0) {
    tierName = 'Top-10 Playoff Unit';
    franchiseComp = '2023 Detroit Lions / 2022 Philadelphia Eagles';
  } else if (percentile >= 50.0) {
    tierName = 'Above Average Starting Unit';
    franchiseComp = '2023 Dallas Cowboys / 2023 Buffalo Bills';
  } else if (percentile >= 35.0) {
    tierName = 'Below League Average';
    franchiseComp = '2023 Tennessee Titans / 2023 Las Vegas Raiders';
  } else {
    tierName = 'Replacement-Level Offense';
    franchiseComp = '2023 Carolina Panthers / 2023 New York Jets';
  }

  const sign = deltaEpa >= 0 ? '+' : '';
  const signSr = deltaSuccessRate >= 0 ? '+' : '';
  const summaryText =
    `If an NFL offense was built entirely out of this one play in this situational context (${bench.label}) over a full 17-game season, it would rank in the ${percentile.toFixed(1)}th percentile of all NFL offenses (${sign}${deltaEpa.toFixed(2)} EPA/play and ${signSr}${deltaSuccessRate.toFixed(1)}% SR relative to league baseline), matching the efficiency tier of the ${franchiseComp}.`;

  return {
    situationId: situation.id,
    playMeanEpa: summary.meanEpa,
    playSuccessRate: summary.epaSuccessRate,
    playGoalRate: summary.goalSuccessRate ?? 0,
    leagueAvgEpa: bench.leagueAvgEpa,
    leagueAvgSuccessRate: bench.leagueAvgSuccessRate,
    leagueAvgGoalRate: bench.leagueAvgGoalRate,
    deltaEpa,
    deltaSuccessRate,
    zScore,
    percentile,
    tierName,
    franchiseComp,
    summaryText,
  };
}

// ============================================================================
// 2D ANISOTROPIC STEERING STEP (20 Hz, dt = 0.05s)
// ============================================================================
function stepAnisotropicAgent(
  agent: AgentRuntime,
  targetPos: Vec2,
  nextWaypointAfterTarget: Vec2 | null,
  dt: number,
  speedScale = 1.0,
  maxFieldY = 35.0
): void {
  if (agent.stunTimer > 0) {
    agent.stunTimer = Math.max(0, agent.stunTimer - dt);
    agent.vel.x *= 0.74;
    agent.vel.y *= 0.74;
    agent.pos.x += agent.vel.x * dt;
    agent.pos.y += agent.vel.y * dt;
    return;
  }

  const dx = targetPos.x - agent.pos.x;
  const dy = targetPos.y - agent.pos.y;
  const distToTarget = Math.hypot(dx, dy);
  if (distToTarget < 1e-4) {
    agent.vel.x *= 0.65;
    agent.vel.y *= 0.65;
    return;
  }

  const dirToTargetX = dx / distToTarget;
  const dirToTargetY = dy / distToTarget;

  const speed = Math.hypot(agent.vel.x, agent.vel.y);
  const vMax = getMaxSpeedYdsPerSec(agent.ratings.spd) * speedScale;
  const aTangentialMax = getMaxTangentialAccel(agent.ratings.acc);
  const routeSkill = agent.pos.y > 10 ? agent.ratings.rr_med : agent.ratings.rr_short;
  const aLateralMax = getMaxLateralCentripetalAccel(agent.ratings.agi, routeSkill);
  const aBrakeMax = getMaxBrakingDecel(agent.ratings.agi);

  let desiredSpeed = vMax;
  if (nextWaypointAfterTarget && distToTarget < 4.2) {
    const leg2x = nextWaypointAfterTarget.x - targetPos.x;
    const leg2y = nextWaypointAfterTarget.y - targetPos.y;
    const leg2Len = Math.hypot(leg2x, leg2y);
    if (leg2Len > 0.1) {
      const dot = Math.max(
        -1,
        Math.min(1, dirToTargetX * (leg2x / leg2Len) + dirToTargetY * (leg2y / leg2Len))
      );
      const cutAngle = Math.acos(dot);
      if (cutAngle > 0.32) {
        const isRounded = agent.breakStyle === 'ROUNDED_SPEED';
        const tightRadius = isRounded
          ? 2.85 + 1.25 * (1 - routeSkill / 100)
          : 1.05 + 1.35 * (1 - routeSkill / 100);
        const safeTurnSpeed = isRounded
          ? Math.max(vMax * 0.80, Math.sqrt(aLateralMax * tightRadius) / (1 + 0.22 * (cutAngle / Math.PI)))
          : Math.sqrt(aLateralMax * tightRadius) / (1 + 0.50 * (cutAngle / Math.PI));
        const reqBrakeDist = Math.max(
          0,
          (speed * speed - safeTurnSpeed * safeTurnSpeed) / (2 * aBrakeMax)
        );
        if (distToTarget <= reqBrakeDist + (isRounded ? 0.30 : 0.60)) {
          desiredSpeed = Math.max(isRounded ? 5.2 : 3.1, safeTurnSpeed);
        }
      }
    }
  } else if (!nextWaypointAfterTarget && agent.team === 'OFF' && agent.role === 'ROUTE' && distToTarget < 1.6) {
    // Receiver settling in a zone window at the end of a curl/hitch/stick route
    const lastWp = agent.waypoints[agent.waypoints.length - 1];
    const firstWp = agent.waypoints[0];
    if (lastWp && firstWp && lastWp.y <= firstWp.y + 1.5 && lastWp.y < 15.0) {
      desiredSpeed = Math.max(1.2, vMax * (distToTarget / 1.8));
    }
  }

  const ux = speed > 0.25 ? agent.vel.x / speed : dirToTargetX;
  const uy = speed > 0.25 ? agent.vel.y / speed : dirToTargetY;
  const nx = -uy;
  const ny = ux;

  const vDesX = dirToTargetX * desiredSpeed;
  const vDesY = dirToTargetY * desiredSpeed;

  const reqAx = (vDesX - agent.vel.x) / dt;
  const reqAy = (vDesY - agent.vel.y) / dt;

  let aPar = reqAx * ux + reqAy * uy;
  let aPerp = reqAx * nx + reqAy * ny;

  if (Math.abs(aPerp) > aLateralMax) {
    aPerp = Math.sign(aPerp) * aLateralMax;
  }

  if (aPar >= 0) {
    const hillLimit = aTangentialMax * Math.max(0.06, 1.0 - speed / vMax);
    const turnLoad = Math.min(0.85, Math.abs(aPerp) / aLateralMax);
    aPar = Math.min(aPar, hillLimit * (1.0 - 0.42 * turnLoad * turnLoad));
  } else {
    const remFraction = Math.sqrt(Math.max(0.05, 1.0 - Math.pow(aPerp / aLateralMax, 2)));
    const maxBrake = aBrakeMax * remFraction;
    aPar = Math.max(aPar, -maxBrake);
  }

  const ax = aPar * ux + aPerp * nx;
  const ay = aPar * uy + aPerp * ny;

  agent.vel.x += ax * dt;
  agent.vel.y += ay * dt;

  const newSpd = Math.hypot(agent.vel.x, agent.vel.y);
  if (newSpd > vMax) {
    agent.vel.x = (agent.vel.x / newSpd) * vMax;
    agent.vel.y = (agent.vel.y / newSpd) * vMax;
  }

  agent.pos.x = Math.max(-25.8, Math.min(25.8, agent.pos.x + agent.vel.x * dt));
  agent.pos.y = Math.min(maxFieldY, agent.pos.y + agent.vel.y * dt);

  if (newSpd > 0.3) {
    agent.heading = Math.atan2(agent.vel.y, agent.vel.x);
  }
}

// ============================================================================
// DEFENSIVE PERSONNEL MATCHING & BASE 4-3 COUNTER SYSTEM
// ============================================================================
export function getSamLinebackerForDefense(defenseRoster: PlayerConfig[]): PlayerConfig {
  const defNames = defenseRoster.map((p) => p.name).join(' ');

  if (defNames.includes('Josh Hines-Allen') || defNames.includes('Foyesade Oluokun')) {
    return {
      id: 'SLB',
      label: 'SAM',
      name: 'Chad Muma',
      team: 'DEF',
      archetype: 'POWER_HYBRID',
      eligible: false,
      startPos: { x: 4.8, y: 4.2 },
      role: 'PASS_BLOCK',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 85,
        acc: 87,
        agi: 83,
        str: 87,
        rush_power: 87,
        rush_speed: 80,
        bsh_shed: 90,
        tak_wrap: 92,
        tak_hit_power: 91,
        cov_man: 76,
        cov_zone: 81,
        play_rec: 88,
      }),
      scouting: {
        ovr: 81,
        jersey: 48,
        height: "6'3\"",
        weightLbs: 242,
        armLengthIn: 32.5,
        fortyYdDash: 4.63,
        tenYdSplit: 1.58,
        ngsMaxSpeedMph: 20.1,
        ngsMetricLabel: '242 lbs | Base 4-3 Strongside Enforcer',
        scoutingReport:
          'Heavy downhill run stopper inserted vs heavy 6-OL personnel. Stuffs C-gap runs, but vulnerable against lateral speed and empty space.',
      },
    };
  }

  if (defNames.includes('George Karlaftis') || defNames.includes('Nick Bolton') || defNames.includes('Chris Jones')) {
    return {
      id: 'SLB',
      label: 'SAM',
      name: 'Leo Chenal',
      team: 'DEF',
      archetype: 'POWER_HYBRID',
      eligible: false,
      startPos: { x: 4.8, y: 4.2 },
      role: 'PASS_BLOCK',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 86,
        acc: 88,
        agi: 82,
        str: 92,
        rush_power: 91,
        rush_speed: 81,
        bsh_shed: 92,
        tak_wrap: 93,
        tak_hit_power: 94,
        cov_man: 74,
        cov_zone: 80,
        play_rec: 89,
      }),
      scouting: {
        ovr: 84,
        jersey: 54,
        height: "6'3\"",
        weightLbs: 250,
        armLengthIn: 33.0,
        fortyYdDash: 4.53,
        tenYdSplit: 1.55,
        ngsMaxSpeedMph: 20.4,
        ngsMetricLabel: '250 lbs | 92 Str | Elite Point-of-Attack Anchor',
        scoutingReport:
          'Bruising 250lb SAM linebacker deployed against heavy fronts. Dominates lead blockers, but struggles in trail man coverage against flexed skill players.',
      },
    };
  }

  if (defNames.includes('Kyle Hamilton') || defNames.includes('Roquan Smith')) {
    return {
      id: 'SLB',
      label: 'SAM',
      name: 'Trenton Simpson',
      team: 'DEF',
      archetype: 'POWER_HYBRID',
      eligible: false,
      startPos: { x: 4.8, y: 4.2 },
      role: 'PASS_BLOCK',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 88,
        acc: 90,
        agi: 85,
        str: 86,
        rush_power: 88,
        rush_speed: 84,
        bsh_shed: 88,
        tak_wrap: 90,
        tak_hit_power: 91,
        cov_man: 78,
        cov_zone: 83,
        play_rec: 86,
      }),
      scouting: {
        ovr: 82,
        jersey: 23,
        height: "6'2\"",
        weightLbs: 238,
        armLengthIn: 32.5,
        fortyYdDash: 4.45,
        tenYdSplit: 1.52,
        ngsMaxSpeedMph: 21.0,
        ngsMetricLabel: '4.45s 40-yd dash | Explosive Box Athlete',
        scoutingReport:
          'High-ceiling explosive athlete who sets physical edges vs gap schemes; developing coverage discipline.',
      },
    };
  }

  if (defNames.includes('Fred Warner') || defNames.includes('Nick Bosa')) {
    return {
      id: 'SLB',
      label: 'SAM',
      name: 'Dee Winters',
      team: 'DEF',
      archetype: 'POWER_HYBRID',
      eligible: false,
      startPos: { x: 4.8, y: 4.2 },
      role: 'PASS_BLOCK',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 87,
        acc: 88,
        agi: 84,
        str: 85,
        rush_power: 86,
        rush_speed: 82,
        bsh_shed: 87,
        tak_wrap: 89,
        tak_hit_power: 90,
        cov_man: 77,
        cov_zone: 82,
        play_rec: 85,
      }),
      scouting: {
        ovr: 80,
        jersey: 53,
        height: "6'1\"",
        weightLbs: 230,
        armLengthIn: 31.75,
        fortyYdDash: 4.49,
        tenYdSplit: 1.54,
        ngsMaxSpeedMph: 20.8,
        ngsMetricLabel: 'Base 4-3 Overhang | 87 BSH Shed',
        scoutingReport:
          'Fast-flowing hybrid linebacker brought on to counter run-heavy 6-OL alignments.',
      },
    };
  }

  // NFL Average SAM Linebacker baseline
  return {
    id: 'SLB',
    label: 'SAM',
    name: 'NFL Average SAM LB',
    team: 'DEF',
    archetype: 'POWER_HYBRID',
    eligible: false,
    startPos: { x: 4.8, y: 4.2 },
    role: 'PASS_BLOCK',
    readOrder: 0,
    waypoints: [],
    ratings: makeRatings({
      spd: 85,
      acc: 86,
      agi: 82,
      str: 88,
      rush_power: 87,
      rush_speed: 80,
      bsh_shed: 89,
      tak_wrap: 91,
      tak_hit_power: 90,
      cov_man: 76,
      cov_zone: 81,
      play_rec: 87,
    }),
    scouting: {
      ovr: 81,
      jersey: 55,
      height: "6'3\"",
      weightLbs: 245,
      armLengthIn: 32.5,
      fortyYdDash: 4.60,
      tenYdSplit: 1.58,
      ngsMaxSpeedMph: 20.0,
      ngsMetricLabel: '245 lbs | 50th %ile Base SAM Linebacker',
      scoutingReport:
        'Standard NFL starting Base 4-3 strongside linebacker. Stiff in deep coverage, stout against interior power blocks.',
    },
  };
}

export function adaptDefenseToOffensivePersonnel(
  defConfigs: PlayerConfig[],
  offConfigs: PlayerConfig[],
  forcedPersonnel?: DefPersonnel
): PlayerConfig[] {
  const isHeavyPersonnel =
    forcedPersonnel === 'BASE_43' ||
    offConfigs.some(
      (p) =>
        p.label === '6OL/TE' ||
        p.label === 'H-INSERT' ||
        (p.id === 'TE' && p.archetype === 'HEAVY_TRENCH') ||
        (p.id === 'SLOT' && p.archetype === 'POWER_HYBRID' && p.label === 'TE2')
    );

  if (!isHeavyPersonnel) return defConfigs;

  return defConfigs.map((d) => {
    if (d.id === 'NCB' || d.label === 'NICKEL') {
      return getSamLinebackerForDefense(defConfigs);
    }
    return { ...d, ratings: { ...d.ratings }, startPos: { ...d.startPos } };
  });
}

// ============================================================================
// DEFENSIVE PLAYBOOK: SITUATION-AWARE ALIGNMENT & ASSIGNMENT BUILDER
// ============================================================================
export function buildDefenseSchemeAgents(
  offConfigs: PlayerConfig[],
  defRoster: PlayerConfig[],
  scheme: DefScheme,
  front: DefFront = 'OVER',
  spyRole: DefSpyRole = 'NONE',
  situation: SituationSpec = SITUATIONS['1st_10']
): AgentRuntime[] {
  const eligibles = offConfigs
    .map((p, idx) => ({ p, idx }))
    .filter((item) => item.p.eligible)
    .sort((a, b) => a.p.startPos.x - b.p.startPos.x);

  const isRedZone = 100 - situation.yardline <= 15;
  const maxFieldY = Math.min(34.0, 100 - situation.yardline + 9.5);
  // Situational sticks adjustment: on 3rd & long, underneath zones sink deeper toward sticks;
  // on 3rd & short / 2nd & short, zones tighten to the line to gain.
  const sticksDepthMod =
    situation.down === 3 && situation.distance >= 8
      ? 2.2
      : (situation.down === 3 && situation.distance <= 3) || (situation.down === 2 && situation.distance <= 2)
      ? -1.6
      : isRedZone
      ? -1.8
      : 0.0;

  return defRoster.map((d, dIdx) => {
    let pos = { x: d.startPos.x, y: d.startPos.y };
    let assignType: AgentRuntime['assignType'] = 'RUSH';
    let manTargetIdx = -1;
    let zoneAnchor: Vec2 = { x: pos.x, y: pos.y + 6 };
    let zoneCapY = Math.min(maxFieldY, 24.0);

    const isDesignatedSpy =
      (spyRole === 'WLB' && (d.id === 'WLB' || d.label === 'WLB')) ||
      (spyRole === 'SS' && (d.id === 'SS' || d.label === 'SS')) ||
      (spyRole === 'EDGE2' && (d.id === 'RDE' || d.label === 'EDGE2' || dIdx === 3));

    if (isDesignatedSpy) {
      assignType = 'SPY';
      if (spyRole === 'EDGE2') {
        pos = { x: 3.6, y: 1.8 };
        zoneAnchor = { x: 1.4, y: 3.6 };
      } else if (spyRole === 'SS') {
        pos = { x: 1.8, y: 4.6 };
        zoneAnchor = { x: 0.0, y: 4.0 };
      } else {
        pos = { x: 0.0, y: 4.2 };
        zoneAnchor = { x: 0.0, y: 3.8 };
      }
    } else if (dIdx < 4) {
      assignType = 'RUSH';
      if (front === 'WIDE_9') {
        if (dIdx === 0) pos = { x: -5.8, y: 0.6 };
        if (dIdx === 1) pos = { x: -1.7, y: 0.5 };
        if (dIdx === 2) pos = { x: 1.7, y: 0.5 };
        if (dIdx === 3) pos = { x: 5.8, y: 0.6 };
      } else if (front === 'UNDER') {
        if (dIdx === 0) pos = { x: -4.6, y: 0.6 };
        if (dIdx === 1) pos = { x: -2.1, y: 0.5 };
        if (dIdx === 2) pos = { x: 0.9, y: 0.5 };
        if (dIdx === 3) pos = { x: 4.3, y: 0.6 };
      } else if (front === 'MUG_A') {
        if (dIdx === 0) pos = { x: -4.2, y: 0.6 };
        if (dIdx === 1) pos = { x: -1.1, y: 0.5 };
        if (dIdx === 2) pos = { x: 1.1, y: 0.5 };
        if (dIdx === 3) pos = { x: 4.2, y: 0.6 };
      } else {
        // OVER front
        if (dIdx === 0) pos = { x: -4.3, y: 0.6 };
        if (dIdx === 1) pos = { x: -1.2, y: 0.5 };
        if (dIdx === 2) pos = { x: 2.1, y: 0.5 };
        if (dIdx === 3) pos = { x: 4.5, y: 0.6 };
      }
    } else {
      // dIdx 4=CB1, 5=CB2, 6=NCB, 7=WLB, 8=MLB, 9=SS, 10=FS
      switch (scheme) {
        case 'COV1_ROBBER': {
          const manSlots = [4, 5, 6, 7];
          const slot = manSlots.indexOf(dIdx);
          if (slot !== -1 && eligibles[slot]) {
            assignType = 'MAN';
            manTargetIdx = eligibles[slot].idx;
            const tStart = eligibles[slot].p.startPos;
            const pressDepth = situation.distance <= 4 || isRedZone ? 2.1 : 3.4;
            pos = { x: tStart.x, y: Math.max(1.8, tStart.y + pressDepth) };
          } else if (dIdx === 8) {
            assignType = 'ROBBER';
            pos = { x: 0.0, y: 4.8 };
            zoneAnchor = { x: 0.0, y: Math.min(maxFieldY - 2, 7.2 + sticksDepthMod) };
          } else if (dIdx === 9) {
            if (eligibles[4]) {
              assignType = 'MAN';
              manTargetIdx = eligibles[4].idx;
              pos = { x: eligibles[4].p.startPos.x * 0.75, y: 4.2 };
            } else {
              assignType = 'RUSH';
              pos = { x: 3.2, y: 2.2 };
            }
          } else {
            assignType = 'ZONE_DEEP';
            pos = { x: 0.0, y: Math.min(maxFieldY - 2, 13.5) };
            zoneAnchor = { x: 0.0, y: Math.min(maxFieldY - 1, 17.5 + sticksDepthMod * 0.5) };
            zoneCapY = maxFieldY;
          }
          break;
        }

        case 'COV2_TAMPA': {
          if (dIdx === 4 || dIdx === 5) {
            assignType = 'ZONE_UNDER'; // Cloud / Flat corners jam outside WR then sink to flat
            const outerWr = dIdx === 4 ? eligibles[0] : eligibles[eligibles.length - 1];
            const baseX = outerWr ? outerWr.p.startPos.x : dIdx === 4 ? -16.0 : 16.0;
            pos = { x: baseX, y: 3.2 };
            zoneAnchor = {
              x: dIdx === 4 ? -13.5 : 13.5,
              y: Math.min(maxFieldY - 3, 6.2 + sticksDepthMod * 0.6),
            };
          } else if (dIdx === 6 || dIdx === 7) {
            assignType = 'ZONE_UNDER';
            pos = { x: dIdx === 6 ? -5.5 : 5.5, y: 4.4 };
            zoneAnchor = {
              x: dIdx === 6 ? -6.5 : 6.5,
              y: Math.min(maxFieldY - 2, 7.8 + sticksDepthMod),
            };
          } else if (dIdx === 8) {
            assignType = 'ZONE_DEEP'; // Tampa-2 MLB deep middle hole
            pos = { x: 0.0, y: 4.6 };
            zoneAnchor = { x: 0.0, y: Math.min(maxFieldY - 1.5, 14.0 + sticksDepthMod * 0.6) };
            zoneCapY = Math.min(maxFieldY, 22.0);
          } else {
            assignType = 'ZONE_DEEP';
            pos = { x: dIdx === 9 ? -9.5 : 9.5, y: Math.min(maxFieldY - 2.5, 12.0) };
            zoneAnchor = {
              x: dIdx === 9 ? -11.0 : 11.0,
              y: Math.min(maxFieldY - 1, 17.5 + sticksDepthMod * 0.5),
            };
            zoneCapY = maxFieldY;
          }
          break;
        }

        case 'COV4_QUARTERS': {
          if (dIdx === 4 || dIdx === 5) {
            assignType = 'ZONE_DEEP';
            const outerWr = dIdx === 4 ? eligibles[0] : eligibles[eligibles.length - 1];
            const baseX = outerWr ? outerWr.p.startPos.x : dIdx === 4 ? -16.5 : 16.5;
            pos = { x: baseX, y: Math.min(maxFieldY - 3, 6.8) };
            zoneAnchor = {
              x: dIdx === 4 ? -14.5 : 14.5,
              y: Math.min(maxFieldY - 1, 16.5 + sticksDepthMod * 0.5),
            };
            zoneCapY = maxFieldY;
          } else if (dIdx === 9 || dIdx === 10) {
            assignType = 'ZONE_DEEP';
            pos = { x: dIdx === 9 ? -6.2 : 6.2, y: Math.min(maxFieldY - 2.5, 10.8) };
            zoneAnchor = {
              x: dIdx === 9 ? -6.5 : 6.5,
              y: Math.min(maxFieldY - 1, 16.5 + sticksDepthMod * 0.5),
            };
            zoneCapY = maxFieldY;
          } else {
            assignType = 'ZONE_UNDER';
            const underX = [-10.5, 0.0, 10.5];
            const uSlot = (dIdx - 6) % 3;
            pos = { x: underX[uSlot], y: 4.3 };
            zoneAnchor = {
              x: underX[uSlot],
              y: Math.min(maxFieldY - 2, 7.6 + sticksDepthMod),
            };
          }
          break;
        }

        case 'ZERO_BLITZ': {
          // Cover 0 Blitz: 6 rushers (4 DL + 2 LB blitzing from LB depth), 5 tight man defenders
          if (dIdx === 7 || dIdx === 8) {
            assignType = 'RUSH';
            const blitzDepth = front === 'MUG_A' ? 3.2 : 4.2;
            pos = { x: dIdx === 7 ? -3.2 : 3.2, y: blitzDepth };
          } else {
            const manDefIndices = [4, 5, 6, 9, 10];
            const slot = manDefIndices.indexOf(dIdx);
            if (slot !== -1 && eligibles[slot]) {
              assignType = 'MAN';
              manTargetIdx = eligibles[slot].idx;
              const tStart = eligibles[slot].p.startPos;
              pos = { x: tStart.x, y: Math.max(1.8, tStart.y + 2.5) };
            }
          }
          break;
        }

        case 'FIRE_ZONE_3': {
          // 5-Man Sim Pressure / Fire Zone: Nickel or WLB blitzes, 3 deep, 3 under
          if (dIdx === 6) {
            assignType = 'RUSH';
            pos = { x: -5.2, y: 2.8 };
          } else if (dIdx === 4 || dIdx === 5) {
            assignType = 'ZONE_DEEP';
            pos = { x: dIdx === 4 ? -16.0 : 16.0, y: 6.5 };
            zoneAnchor = { x: dIdx === 4 ? -14.5 : 14.5, y: Math.min(maxFieldY - 1, 16.5) };
            zoneCapY = maxFieldY;
          } else if (dIdx === 10) {
            assignType = 'ZONE_DEEP';
            pos = { x: 0.0, y: Math.min(maxFieldY - 2, 12.8) };
            zoneAnchor = { x: 0.0, y: Math.min(maxFieldY - 1, 17.5) };
            zoneCapY = maxFieldY;
          } else {
            assignType = 'ZONE_UNDER';
            const underX = dIdx === 7 ? -8.5 : dIdx === 8 ? 0.0 : 8.5;
            pos = { x: underX, y: 4.4 };
            zoneAnchor = { x: underX, y: Math.min(maxFieldY - 2, 7.5 + sticksDepthMod) };
          }
          break;
        }

        case 'COV6_SPLIT': {
          if (dIdx === 4) {
            assignType = 'ZONE_UNDER';
            pos = { x: -15.5, y: 3.6 };
            zoneAnchor = { x: -13.5, y: Math.min(maxFieldY - 3, 6.2 + sticksDepthMod * 0.6) };
          } else if (dIdx === 5) {
            assignType = 'ZONE_DEEP';
            pos = { x: 16.0, y: 6.8 };
            zoneAnchor = { x: 14.5, y: Math.min(maxFieldY - 1, 17.0) };
            zoneCapY = maxFieldY;
          } else if (dIdx === 9) {
            assignType = 'ZONE_DEEP';
            pos = { x: -9.5, y: Math.min(maxFieldY - 2.5, 11.5) };
            zoneAnchor = { x: -10.5, y: Math.min(maxFieldY - 1, 17.0) };
            zoneCapY = maxFieldY;
          } else if (dIdx === 10) {
            assignType = 'ZONE_DEEP';
            pos = { x: 6.5, y: Math.min(maxFieldY - 2.5, 11.0) };
            zoneAnchor = { x: 6.5, y: Math.min(maxFieldY - 1, 17.0) };
            zoneCapY = maxFieldY;
          } else {
            assignType = 'ZONE_UNDER';
            pos = { x: dIdx === 6 ? -7.0 : dIdx === 7 ? 0 : 7.0, y: 4.4 };
            zoneAnchor = { x: pos.x, y: Math.min(maxFieldY - 2, 7.6 + sticksDepthMod) };
          }
          break;
        }

        default: {
          // COV3_SKY
          if (dIdx === 4 || dIdx === 5) {
            assignType = 'ZONE_DEEP';
            const outerWr = dIdx === 4 ? eligibles[0] : eligibles[eligibles.length - 1];
            const baseX = outerWr ? outerWr.p.startPos.x : dIdx === 4 ? -16.0 : 16.0;
            pos = { x: baseX, y: Math.min(maxFieldY - 3, 6.5) };
            zoneAnchor = {
              x: dIdx === 4 ? -14.5 : 14.5,
              y: Math.min(maxFieldY - 1, 16.8 + sticksDepthMod * 0.5),
            };
            zoneCapY = maxFieldY;
          } else if (dIdx === 10) {
            assignType = 'ZONE_DEEP';
            pos = { x: 0.0, y: Math.min(maxFieldY - 2, 13.0) };
            zoneAnchor = { x: 0.0, y: Math.min(maxFieldY - 1, 17.8 + sticksDepthMod * 0.5) };
            zoneCapY = maxFieldY;
          } else {
            assignType = 'ZONE_UNDER';
            const underX = [-11.5, -3.8, 3.8, 11.5];
            const slot = dIdx - 6;
            pos = { x: underX[slot] ?? 0, y: 4.3 };
            zoneAnchor = {
              x: underX[slot] ?? 0,
              y: Math.min(maxFieldY - 2, 7.5 + sticksDepthMod),
            };
          }
        }
      }
    }

    return {
      id: d.id,
      label: d.label,
      name: d.name,
      team: 'DEF',
      archetype: d.archetype,
      pos,
      vel: { x: 0, y: 0 },
      heading: -Math.PI / 2,
      role: 'PASS_BLOCK',
      readOrder: 0,
      waypoints: [],
      wpIndex: 0,
      ratings: { ...d.ratings },
      blockType: 'PASS_ANCHOR',
      engagedWith: null,
      leverageAngle: 0,
      stunTimer: 0,
      chipTimer: 0,
      pressJamTimer: 0,
      pressTested: false,
      motionFreeRelease: false,
      cutReactionTimer: 0,
      ballBreakDelay: 0,
      playActionFreezeTimer: 0,
      lastTargetVelDir: { x: 0, y: 1 },
      lungeLockTimer: 0,
      expectedBreakTime: 0,
      assignType,
      manTargetIdx,
      zoneAnchor,
      zoneCapY,
    };
  });
}

// ============================================================================
// PRE-SNAP MOTION & COVERAGE RECOGNITION ENGINE
// ============================================================================
export function evaluatePreSnapMotion(
  offConfigs: PlayerConfig[],
  defAgents: AgentRuntime[],
  motionId: PreSnapMotionId,
  scheme: DefScheme
): PreSnapTell {
  const qb = offConfigs[0];
  const qbReadIq = qb ? qb.ratings.pre_snap_read : 85;
  const isManScheme = scheme === 'COV1_ROBBER' || scheme === 'ZERO_BLITZ';
  const is2High = scheme === 'COV2_TAMPA' || scheme === 'COV4_QUARTERS' || scheme === 'COV6_SPLIT';
  const boxCount = defAgents.filter((d) => Math.abs(d.pos.x) <= 5.0 && d.pos.y <= 5.6).length;

  const postSnapRotation =
    scheme === 'COV3_SKY'
      ? 'SS Buzz Down to Flat / Single-High FS'
      : scheme === 'COV1_ROBBER'
      ? 'Man-Free + MLB Low-Hole Robber'
      : scheme === 'COV2_TAMPA'
      ? '2-High Split + MLB Tampa Deep Pole'
      : scheme === 'COV4_QUARTERS'
      ? '4-Deep Match Quarters (Mod/Palms)'
      : scheme === 'COV6_SPLIT'
      ? 'Split-Field QQH (Quarters Strong / Halves Weak)'
      : scheme === 'FIRE_ZONE_3'
      ? 'Nickel Sim Blitz + 3-Deep / 3-Under'
      : 'Cover 0 All-Out Pressure (No Deep Safety)';

  if (motionId === 'NONE') {
    const iqFactor = (qbReadIq - 70) / 30;
    return {
      motionReaction: 'DISGUISE_HOLD',
      trailingDefenderName: null,
      manConfidence: isManScheme ? Math.round(58 + 14 * iqFactor) : Math.round(38 - 10 * iqFactor),
      zoneConfidence: isManScheme ? Math.round(42 - 14 * iqFactor) : Math.round(62 + 10 * iqFactor),
      safetyShell: is2High ? 'MOFO_2_HIGH' : scheme === 'ZERO_BLITZ' ? 'ZERO_HIGH' : 'MOFC_1_HIGH',
      postSnapRotation,
      boxCount,
      qbInfoBonus: 0,
      leverageShiftYds: 0,
      summaryText: `Static Alignment (No Motion) • Box: ${boxCount} • Pre-Snap Shell: ${
        is2High ? '2-High (MOFO)' : scheme === 'ZERO_BLITZ' ? '0-High Blitz Threat' : '1-High (MOFC)'
      } • Post-Snap: ${postSnapRotation}.`,
    };
  }

  const motionTarget =
    offConfigs.find(
      (p) =>
        (motionId === 'RB_FLAP_OUT' && p.id === 'RB') ||
        (motionId === 'TE_SIFT' && p.id === 'TE') ||
        p.id === 'SLOT'
    ) || offConfigs[7];

  if (isManScheme) {
    const trackingDef =
      defAgents.find((d) => d.assignType === 'MAN' && d.manTargetIdx >= 0) || defAgents[6];
    return {
      motionReaction: 'MAN_TRAIL',
      trailingDefenderName: trackingDef.name,
      manConfidence: 94,
      zoneConfidence: 6,
      safetyShell: scheme === 'ZERO_BLITZ' ? 'ZERO_HIGH' : 'MOFC_1_HIGH',
      postSnapRotation,
      boxCount,
      qbInfoBonus: 0.09 + 0.04 * ((qbReadIq - 75) / 24),
      leverageShiftYds: 1.4,
      summaryText: `[MAN COVERAGE TELL — 94% Conf] ${trackingDef.name} locked on & trailed ${motionTarget.name} across formation (${postSnapRotation}). Free release granted.`,
    };
  } else {
    return {
      motionReaction: 'ZONE_BUMP',
      trailingDefenderName: null,
      manConfidence: 9,
      zoneConfidence: 91,
      safetyShell: is2High ? 'MOFO_2_HIGH' : 'MOFC_1_HIGH',
      postSnapRotation,
      boxCount,
      qbInfoBonus: 0.08 + 0.03 * ((qbReadIq - 75) / 24),
      leverageShiftYds: 1.1,
      summaryText: `[ZONE COVERAGE TELL — 91% Conf] Corners stayed home on ${motionTarget.name}'s motion; apex linebackers bumped zone leverage (${postSnapRotation}).`,
    };
  }
}

export function resolveDefScheme(
  defCallInput: DefensiveCall,
  situation: SituationSpec,
  rVal = 0.5
): DefScheme {
  if (defCallInput === 'MIXED') {
    if (situation.down === 3 && situation.distance >= 8) {
      if (rVal < 0.30) return 'COV4_QUARTERS';
      if (rVal < 0.54) return 'COV2_TAMPA';
      if (rVal < 0.74) return 'COV1_ROBBER';
      if (rVal < 0.91) return 'COV3_SKY';
      return 'ZERO_BLITZ';
    } else if (
      (situation.down === 3 && situation.distance <= 3) ||
      (situation.down === 2 && situation.distance <= 2) ||
      100 - situation.yardline <= 12
    ) {
      if (rVal < 0.34) return 'COV1_ROBBER';
      if (rVal < 0.64) return 'COV3_SKY';
      if (rVal < 0.80) return 'COV4_QUARTERS';
      if (rVal < 0.92) return 'COV2_TAMPA';
      return 'ZERO_BLITZ';
    } else {
      if (rVal < 0.35) return 'COV3_SKY';
      if (rVal < 0.58) return 'COV4_QUARTERS';
      if (rVal < 0.76) return 'COV1_ROBBER';
      if (rVal < 0.89) return 'COV2_TAMPA';
      if (rVal < 0.95) return 'COV6_SPLIT';
      return 'ZERO_BLITZ';
    }
  } else if (defCallInput === 'COV3') return 'COV3_SKY';
  else if (defCallInput === 'COV1') return 'COV1_ROBBER';
  else if (defCallInput === 'COV2') return 'COV2_TAMPA';
  else if (defCallInput === 'BLITZ') return 'ZERO_BLITZ';
  return defCallInput as DefScheme;
}

export function resolveDLStunt(
  stuntInput: DLStuntType,
  situation: SituationSpec,
  rVal = 0.5
): 'NONE' | 'TE_TWIST' | 'ET_TWIST' | 'OVERLOAD_SLANT' {
  if (stuntInput !== 'AUTO') return stuntInput;
  if (situation.down === 3 && situation.distance >= 7) {
    if (rVal < 0.42) return 'TE_TWIST';
    if (rVal < 0.72) return 'ET_TWIST';
    if (rVal < 0.86) return 'OVERLOAD_SLANT';
    return 'NONE';
  } else if (situation.down === 2 && situation.distance >= 8) {
    if (rVal < 0.36) return 'TE_TWIST';
    if (rVal < 0.62) return 'ET_TWIST';
    if (rVal < 0.76) return 'OVERLOAD_SLANT';
    return 'NONE';
  } else if (situation.down === 1) {
    if (rVal < 0.16) return 'TE_TWIST';
    if (rVal < 0.28) return 'ET_TWIST';
    if (rVal < 0.38) return 'OVERLOAD_SLANT';
    return 'NONE';
  } else {
    if (rVal < 0.22) return 'TE_TWIST';
    if (rVal < 0.38) return 'OVERLOAD_SLANT';
    return 'NONE';
  }
}

// ============================================================================
// CORE 20 Hz SINGLE-SNAP TIME-EXPLICIT KINEMATIC SIMULATION
// ============================================================================
export function simulateSingleSnap(
  offConfigs: PlayerConfig[],
  defConfigs: PlayerConfig[],
  defCallInput: DefensiveCall,
  situation: SituationSpec,
  rng: PRNG,
  recordSnapshots: boolean,
  allowLaterals = false,
  motionId: PreSnapMotionId = 'NONE',
  front: DefFront = 'OVER',
  riskTolerance = 0.55,
  spyRole: DefSpyRole = 'NONE',
  dropbackType: DropbackType = 'STANDARD_DROP',
  blockingScheme: BlockingSchemeId = 'HALF_SLIDE',
  dlStunt: DLStuntType = 'AUTO',
  matchCoverage = true,
  defTactic?: Partial<DefensiveTacticSpec>
): PlaySimResult {
  const dt = 0.05; // 20 Hz
  const maxTicks = 110; // 5.5 seconds max play clock
  const maxFieldY = Math.min(34.0, 100 - situation.yardline + 9.5);

  // 1. Situational Defensive Call Resolution & Pass Rush Stunt Resolution
  const effectiveCall = defTactic?.defCall || defCallInput;
  const effectiveFront = defTactic?.front || front;
  const effectiveSpy = defTactic?.spyRole || spyRole;
  const effectiveStunt = defTactic?.dlStunt || dlStunt;
  const effectiveMatchCoverage = defTactic?.matchCoverage !== undefined ? defTactic.matchCoverage : matchCoverage;

  // Match defensive personnel to offensive personnel grouping (e.g. 6 OL / 2-Insert forces Base 4-3)
  const effectiveDefConfigs = adaptDefenseToOffensivePersonnel(
    defConfigs,
    offConfigs,
    defTactic?.defPersonnel
  );

  const activeScheme: DefScheme = resolveDefScheme(effectiveCall, situation, rng.next());
  const resolvedStunt: 'NONE' | 'TE_TWIST' | 'ET_TWIST' | 'OVERLOAD_SLANT' =
    resolveDLStunt(effectiveStunt, situation, rng.next());

  let currentThrowTrajectory: BallTrajectorySpec | undefined = undefined;
  let currentBallZ = 2.1;

  // Helper to wrap PlaySimResult with activeScheme, activeStunt, matchCoverageActive, and throwTrajectory
  const wrapResult = (base: PlaySimResult): PlaySimResult => ({
    ...base,
    activeScheme,
    activeStunt: resolvedStunt,
    matchCoverageActive: effectiveMatchCoverage,
    throwTrajectory: currentThrowTrajectory,
  });

  // 2. Build Offensive Agents & Compute Route Stem Timing Windows
  const offAgents: AgentRuntime[] = offConfigs.map((c) => {
    const vMax = getMaxSpeedYdsPerSec(c.ratings.spd);
    let expectedBreakTime = 1.55;
    if (c.waypoints.length > 0) {
      const wp0 = c.waypoints[0];
      const stemDist = Math.hypot(wp0.x - c.startPos.x, wp0.y - c.startPos.y);
      expectedBreakTime = Math.max(1.25, Math.min(2.75, 0.45 + stemDist / (vMax * 0.76)));
    }
    if (c.role === 'CHIP_RELEASE') {
      expectedBreakTime += 0.42;
    }

    return {
      id: c.id,
      label: c.label,
      name: c.name,
      team: 'OFF',
      archetype: c.archetype,
      pos: { x: c.startPos.x, y: c.startPos.y },
      vel: { x: 0, y: 0 },
      heading: Math.PI / 2,
      role: c.role,
      readOrder: c.readOrder,
      waypoints: c.waypoints.map((w) => ({
        x: w.x,
        y: Math.min(maxFieldY - 0.8, w.y),
      })),
      wpIndex: 0,
      ratings: { ...c.ratings },
      blockType: c.role === 'OL' ? 'PASS_ANCHOR' : 'PASS_MIRROR',
      engagedWith: null,
      leverageAngle: 0,
      stunTimer: 0,
      chipTimer: c.role === 'CHIP_RELEASE' ? 0.42 : 0,
      pressJamTimer: 0,
      pressTested: false,
      motionFreeRelease: c.startPos.y <= -0.65, // Off-ball alignment avoids LOS press jam
      cutReactionTimer: 0,
      ballBreakDelay: 0,
      playActionFreezeTimer: 0,
      lastTargetVelDir: { x: 0, y: 1 },
      lungeLockTimer: 0,
      expectedBreakTime,
      breakStyle: c.breakStyle || 'SHARP_PIVOT',
      choiceRules: c.choiceRules
        ? c.choiceRules.map((r) => ({
            condition: r.condition,
            description: r.description,
            waypoints: r.waypoints.map((w) => ({ ...w })),
          }))
        : undefined,
      choiceActiveDesc: c.choiceActiveDesc,
      hasResolvedChoice: false,
      assignType: 'RUSH',
      manTargetIdx: -1,
      zoneAnchor: { x: 0, y: 0 },
      zoneCapY: maxFieldY,
    };
  });

  // Apply Tactical Blocking Scheme Adjustments
  const isDesignedRun =
    offAgents.some((a) => a.role === 'BALL_CARRIER') ||
    isRunBlockingScheme(blockingScheme);

  if (isDesignedRun) {
    let rbAgent = offAgents.find((a) => a.role === 'BALL_CARRIER');
    if (!rbAgent) {
      rbAgent = offAgents.find((a) => a.id === 'RB') || offAgents[offAgents.length - 1];
      rbAgent.role = 'BALL_CARRIER';
    }

    if (blockingScheme === 'PIN_AND_PULL') {
      const rg = offAgents.find((a) => a.id === 'RG');
      const rt = offAgents.find((a) => a.id === 'RT');
      if (rg) {
        rg.isPulling = true;
        rg.blockType = 'PULL_KICK';
        rg.pos.y = -1.15;
      }
      if (rt) {
        rt.isPulling = true;
        rt.blockType = 'PULL_WRAP';
        rt.pos.y = -1.30;
      }
      for (const a of offAgents) {
        if (a.role === 'OL' && a.id !== 'RG' && a.id !== 'RT') {
          a.blockType = 'PIN_DOWN';
        }
        if (a.id === 'TE') {
          a.role = 'RUN_BLOCK';
          a.blockType = 'PIN_DOWN';
        }
      }
    } else if (blockingScheme === 'GT_COUNTER_PULL') {
      const lg = offAgents.find((a) => a.id === 'LG');
      const lt = offAgents.find((a) => a.id === 'LT');
      if (lg) {
        lg.isPulling = true;
        lg.blockType = 'PULL_KICK';
        lg.pos.y = -1.15;
      }
      if (lt) {
        lt.isPulling = true;
        lt.blockType = 'PULL_WRAP';
        lt.pos.y = -1.30;
      }
      for (const a of offAgents) {
        if (a.role === 'OL' && a.id !== 'LG' && a.id !== 'LT') {
          a.blockType = 'PIN_DOWN';
        }
        if (a.id === 'TE') {
          a.role = 'RUN_BLOCK';
          a.blockType = 'PIN_DOWN';
        }
      }
    } else if (blockingScheme === 'POWER_G_PULL') {
      const lg = offAgents.find((a) => a.id === 'LG');
      if (lg) {
        lg.isPulling = true;
        lg.blockType = 'PULL_KICK';
        lg.pos.y = -1.15;
      }
      for (const a of offAgents) {
        if (a.role === 'OL' && a.id !== 'LG') {
          a.blockType = 'PIN_DOWN';
        }
        if (a.id === 'TE') {
          a.role = 'RUN_BLOCK';
          a.blockType = 'PIN_DOWN';
        }
        if (a.role === 'LEAD_BLOCK') {
          a.isPulling = true;
          a.blockType = 'PULL_WRAP';
        }
      }
    } else if (blockingScheme === 'INSIDE_ZONE_DUO') {
      for (const a of offAgents) {
        if (a.role === 'OL' || a.id === 'TE') {
          a.blockType = 'RUN_DRIVE';
        }
      }
    } else if (blockingScheme === 'OUTSIDE_ZONE_STRETCH') {
      for (const a of offAgents) {
        if (a.role === 'OL' || a.id === 'TE') {
          a.blockType = 'RUN_DRIVE';
        }
      }
    }
  } else {
    // Pass protection schemes
    if (blockingScheme === 'MAX_PROTECT') {
      for (const a of offAgents) {
        if (a.id === 'TE' || a.id === 'RB') {
          a.role = 'PASS_BLOCK';
          a.blockType = 'PASS_ANCHOR';
        }
      }
    } else if (blockingScheme === 'PIN_AND_PULL') {
      const pullGuard = offAgents.find((a) => a.id === 'RG') || offAgents.find((a) => a.id === 'LG');
      if (pullGuard) {
        pullGuard.isPulling = true;
        pullGuard.blockType = 'PASS_MIRROR';
        pullGuard.pos.y = -1.1; // Drops behind center
      }
    } else if (blockingScheme === 'FULL_SLIDE_L' || blockingScheme === 'FULL_SLIDE_R') {
      const slideSign = blockingScheme === 'FULL_SLIDE_L' ? -1 : 1;
      for (const a of offAgents) {
        if (a.role === 'OL') {
          a.pos.x += slideSign * 0.45;
        }
      }
    }
  }

  // 3. Apply Pre-Snap Motion Geometry before building final defensive leverage
  const applyMotionShift = () => {
    if (motionId === 'JET_R_TO_L' || motionId === 'JET_L_TO_R') {
      const slot = offAgents.find((p) => p.id === 'SLOT');
      if (slot) {
        const targetSign = motionId === 'JET_R_TO_L' ? -1 : 1;
        const oldX = slot.pos.x;
        slot.pos.x = targetSign * Math.max(7.5, Math.abs(oldX));
        const shift = slot.pos.x - oldX;
        slot.waypoints.forEach((w) => {
          w.x = Math.max(-24.5, Math.min(24.5, w.x + shift));
        });
        slot.motionFreeRelease = true;
      }
    } else if (motionId === 'ORBIT_RETURN') {
      const slot = offAgents.find((p) => p.id === 'SLOT');
      if (slot) {
        slot.pos.y = -1.2;
        slot.motionFreeRelease = true;
      }
    } else if (motionId === 'RB_FLAP_OUT') {
      const rb = offAgents.find((p) => p.id === 'RB');
      if (rb) {
        const oldX = rb.pos.x;
        rb.pos.x = rb.pos.x <= 0 ? -12.5 : 12.5;
        rb.pos.y = -0.8;
        const shift = rb.pos.x - oldX;
        rb.waypoints.forEach((w) => {
          w.x = Math.max(-24.5, Math.min(24.5, w.x + shift * 0.5));
          w.y = Math.max(2.5, w.y);
        });
        rb.motionFreeRelease = true;
      }
    } else if (motionId === 'TE_SIFT') {
      const te = offAgents.find((p) => p.id === 'TE');
      if (te) {
        te.pos.x = -3.8;
        te.pos.y = -1.1;
        te.motionFreeRelease = true;
      }
    } else if (motionId === 'H_INSERT_MOTION') {
      const slot = offAgents.find((p) => p.id === 'SLOT');
      if (slot) {
        const oldX = slot.pos.x;
        slot.pos.x = -oldX * 0.95;
        slot.pos.y = -2.0;
        const shift = slot.pos.x - oldX;
        slot.waypoints.forEach((w) => {
          w.x = Math.max(-24.5, Math.min(24.5, w.x + shift * 0.65));
        });
        slot.motionFreeRelease = true;
      }
    } else if (motionId === 'F_ORBIT_TELL') {
      const rb = offAgents.find((p) => p.id === 'RB');
      if (rb) {
        const oldX = rb.pos.x;
        rb.pos.x = rb.pos.x <= 0 ? -9.5 : 9.5;
        rb.pos.y = -3.2;
        const shift = rb.pos.x - oldX;
        rb.waypoints.forEach((w) => {
          w.x = Math.max(-24.5, Math.min(24.5, w.x + shift * 0.5));
        });
        rb.motionFreeRelease = true;
      }
    }
  };
  applyMotionShift();

  // Detect Bunch / Stack alignments that also grant free releases from press
  for (let i = 1; i < offAgents.length; i++) {
    for (let j = 1; j < offAgents.length; j++) {
      if (i === j) continue;
      if (
        offAgents[i].role === 'ROUTE' &&
        Math.hypot(offAgents[i].pos.x - offAgents[j].pos.x, offAgents[i].pos.y - offAgents[j].pos.y) < 3.4
      ) {
        offAgents[i].motionFreeRelease = true;
      }
    }
  }

  const defAgents = buildDefenseSchemeAgents(
    offAgents.map((a, idx) => ({
      ...offConfigs[idx],
      startPos: { ...a.pos },
    })),
    effectiveDefConfigs,
    activeScheme,
    effectiveFront,
    effectiveSpy,
    situation
  );

  // Apply DefTactic cushion and depth overrides if present
  if (defTactic) {
    for (const def of defAgents) {
      if (def.assignType === 'RUSH') continue;
      if (defTactic.cbCushionY !== undefined && (def.id === 'CB1' || def.id === 'CB2' || def.id === 'NCB')) {
        def.pos.y = Math.max(1.5, Math.min(maxFieldY - 2.0, defTactic.cbCushionY));
      }
      if (defTactic.safetyDepthY !== undefined && (def.id === 'FS' || def.id === 'SS')) {
        def.pos.y = Math.max(8.0, Math.min(maxFieldY - 1.0, defTactic.safetyDepthY));
      }
      if (defTactic.underDepthY !== undefined && (def.assignType === 'ZONE_UNDER' || def.id === 'MLB' || def.id === 'WLB')) {
        def.zoneAnchor.y = Math.max(3.0, Math.min(maxFieldY - 2.0, defTactic.underDepthY));
      }
    }
  }

  // Authentic NFL per-snap defensive disguise, leverage, and zone-drop depth variance
  for (const def of defAgents) {
    if (def.assignType === 'RUSH') continue;
    def.pos.x = Math.max(-24.5, Math.min(24.5, def.pos.x + rng.gaussian() * 0.35));
    def.pos.y = Math.max(1.6, Math.min(maxFieldY - 1.0, def.pos.y + rng.gaussian() * 0.28));
    def.zoneAnchor.x = Math.max(-24.0, Math.min(24.0, def.zoneAnchor.x + rng.gaussian() * 0.70));
    def.zoneAnchor.y = Math.max(2.5, Math.min(maxFieldY - 0.8, def.zoneAnchor.y + rng.gaussian() * 0.55));
  }

  // Initialize stunt and match attributes for defensive players
  for (const def of defAgents) {
    def.stuntRole = 'NONE';
    def.stuntStage = 0;
    def.matchedReceiverIdx = null;
  }

  if (resolvedStunt === 'TE_TWIST') {
    // Tackle-End Twist (DT Crashes outward, EDGE Loops tight inside)
    if (defAgents[2] && defAgents[2].assignType === 'RUSH') {
      defAgents[2].stuntRole = 'CRASHER';
      defAgents[2].stuntPartnerIdx = 3;
    }
    if (defAgents[3] && defAgents[3].assignType === 'RUSH') {
      defAgents[3].stuntRole = 'LOOPER';
      defAgents[3].stuntPartnerIdx = 2;
    }
  } else if (resolvedStunt === 'ET_TWIST') {
    // End-Tackle Twist (EDGE Crashes inside, DT Loops outside)
    if (defAgents[3] && defAgents[3].assignType === 'RUSH') {
      defAgents[3].stuntRole = 'CRASHER';
      defAgents[3].stuntPartnerIdx = 2;
    }
    if (defAgents[2] && defAgents[2].assignType === 'RUSH') {
      defAgents[2].stuntRole = 'LOOPER';
      defAgents[2].stuntPartnerIdx = 3;
    }
  } else if (resolvedStunt === 'OVERLOAD_SLANT') {
    // All 4 down linemen slant laterally
    for (let dIdx = 0; dIdx < 4; dIdx++) {
      if (defAgents[dIdx] && defAgents[dIdx].assignType === 'RUSH') {
        defAgents[dIdx].stuntRole = 'SLANTER';
      }
    }
  }

  // Per-snap QB progression perception variance across eligible reads
  const readPerceptionOffsets = offAgents.map(() => rng.gaussian() * 0.042);

  const qb = offAgents[0];
  const preSnapTell = evaluatePreSnapMotion(offConfigs, defAgents, motionId, activeScheme);

  // If motion occurred, give motion receiver slight separation leverage against man coverage
  if (motionId !== 'NONE') {
    for (const def of defAgents) {
      if (def.assignType === 'MAN' && def.manTargetIdx >= 0) {
        const rec = offAgents[def.manTargetIdx];
        if (rec && rec.motionFreeRelease) {
          def.pos.y += 0.9; // Motion forces man defender to trail slightly deeper through traffic
        }
      }
    }
  }

  // Play-Action Fake Initialization: Linebackers & Robber Safeties freeze downhill on PA
  if (dropbackType === 'PLAY_ACTION') {
    const sitPaMultiplier =
      situation.down === 1 || (situation.down === 2 && situation.distance <= 3)
        ? 1.25
        : situation.down === 3 && situation.distance >= 7
        ? 0.45
        : 0.90;
    for (const def of defAgents) {
      if (def.assignType === 'ZONE_UNDER' || def.assignType === 'ROBBER') {
        const playRecNorm = (def.ratings.play_rec - 50) / 49;
        def.playActionFreezeTimer = Math.max(0.12, (0.58 - 0.32 * playRecNorm) * sitPaMultiplier);
      }
    }
  }

  // NFL Dual-Read Blitz Scan: Backfield RB checks A/B-gap blitz and picks up free blitzer when recognized
  if (activeScheme === 'ZERO_BLITZ' || activeScheme === 'FIRE_ZONE_3') {
    const rb = offAgents.find((a) => a.id === 'RB' && a.pos.y < -2.0 && a.role === 'ROUTE');
    if (rb) {
      const scanProb = 0.72 * ((qb.ratings.pre_snap_read + rb.ratings.pbk_anchor) / 168);
      if (rng.next() < scanProb) {
        rb.role = 'PASS_BLOCK';
        rb.pos = { x: rb.pos.x * 0.45, y: -1.4 };
      }
    }
  }

  // NFL Pre-Snap Game-Theoretic Audible Engine ("Kill / Hot Sight Adjustment"):
  // If Cover 0 all-out pressure is diagnosed and protection is 5-man (no backfield pass blocker),
  // a high-IQ QB checks into a 3-step hot slant before the unblocked 6th rusher arrives.
  if (activeScheme === 'ZERO_BLITZ') {
    const hasBackfieldBlocker = offAgents.some(
      (a) => a.id === 'RB' && a.role === 'PASS_BLOCK' && a.pos.y < -1.0
    );
    if (!hasBackfieldBlocker) {
      const qbIqNorm = Math.max(0, Math.min(1, (qb.ratings.pre_snap_read - 60) / 40));
      if (rng.next() < 0.20 + 0.72 * qbIqNorm) {
        const eligibleRoutes = offAgents.filter(
          (a) => (a.role === 'ROUTE' || a.role === 'CHIP_RELEASE') && a.waypoints.length > 0
        );
        const deepPrimary =
          eligibleRoutes.find((a) => a.readOrder === 1 && a.waypoints[0].y > 6.0) || eligibleRoutes[0];
        if (deepPrimary) {
          const inDir = deepPrimary.pos.x > 0 ? -1 : 1;
          deepPrimary.waypoints = [{ x: deepPrimary.pos.x + inDir * 4.2, y: 3.8 }];
          preSnapTell.summaryText = `[PRE-SNAP HOT AUDIBLE — KILL! KILL!] QB diagnosed Cover 0 blitz (${Math.round(
            qb.ratings.pre_snap_read
          )} IQ); tagged ${deepPrimary.name} on 3-step hot slant.`;
        }
      }
    }
  }

  // Sort eligible route runners by QB Read Progression Order (1..5)
  const readProgressionIndices = offAgents
    .map((a, idx) => ({ a, idx }))
    .filter((item) => item.idx > 0 && (item.a.role === 'ROUTE' || item.a.role === 'CHIP_RELEASE'))
    .sort((x, y) => x.a.readOrder - y.a.readOrder)
    .map((item) => item.idx);

  let currentReadSlot = 0;
  let readDwellTimer = 0;

  let ballState: TickSnapshot['ballState'] = 'HELD';
  let ballPos: Vec2 = { x: qb.pos.x, y: qb.pos.y };
  let ballVel: Vec2 = { x: 0, y: 0 };
  let ballTargetPos: Vec2 = { x: 0, y: 0 };
  let ballIntendedLeadPos: Vec2 = { x: 0, y: 0 };
  let flightTimer = 0;
  let totalFlightTime = 0;
  let targetedOffIdx: number | null = null;
  let carrierOffIdx: number | null = null;
  let pitcherOffIdx: number | null = null;
  let timeToThrow = 0;
  let airYardsOnPlay = 0;
  let catchSpotY = 0;
  let wasPressuredOnPlay = false;
  let pressureAtRelease = 0;
  let brokenTackles = 0;
  let lateralsAttempted = 0;
  let lateralsCompleted = 0;
  let commentary = '';
  let isScramble = false;
  let lastDecisionTelemetry: QbDecisionTelemetry | undefined = undefined;

  let stuntTested = false;

  const snapshots: TickSnapshot[] = [];

  for (let tick = 0; tick < maxTicks; tick++) {
    const t = tick * dt;

    // ------------------------------------------------------------------------
    // 1. GRANULAR TRENCH MECHANICS (Pass-Set Arcs, Double-Teams & 2.5s PRWR)
    // ------------------------------------------------------------------------
    // Collect active blockers and active rushers for closest-pair pass-pro matching
    const activeBlockers: number[] = [];
    for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
      const off = offAgents[oIdx];
      if (off.role === 'CHIP_RELEASE') {
        off.chipTimer = Math.max(0, off.chipTimer - dt);
        if (off.chipTimer <= 0 && off.engagedWith !== null) {
          defAgents[off.engagedWith].engagedWith = null;
          off.engagedWith = null;
        }
      }
      const canBlock =
        off.role === 'OL' ||
        off.role === 'PASS_BLOCK' ||
        off.role === 'RUN_BLOCK' ||
        off.role === 'LEAD_BLOCK' ||
        (off.role === 'CHIP_RELEASE' && off.chipTimer > 0);
      if (canBlock && off.stunTimer <= 0) {
        activeBlockers.push(oIdx);
      }
    }

    // Closest-pair matching for unengaged blockers and rushers (sorted by distance so Tackles take Edges & Guards take DTs)
    const candidatePairs: { oIdx: number; dIdx: number; dist: number; isChip: boolean }[] = [];
    for (const oIdx of activeBlockers) {
      const off = offAgents[oIdx];
      if (off.engagedWith !== null) continue;
      const isChip = off.role === 'CHIP_RELEASE';
      const isPulling = off.isPulling === true;
      // Pulling linemen ignore early interior pass rush because they are pulling laterally
      if (isPulling && t < 1.4) continue;

      // Initial pass-set pickup reach: Tackles kick out to 4.8y to mirror edge/nickel rushers; slide protection fans outward
      const isTackle = off.role === 'OL' && Math.abs(off.pos.x) >= 2.4;
      const isSlide =
        blockingScheme === 'HALF_SLIDE' ||
        blockingScheme === 'FULL_SLIDE_L' ||
        blockingScheme === 'FULL_SLIDE_R' ||
        blockingScheme === 'MAX_PROTECT';
      const maxReach = isChip ? 3.2 : t < 1.0 ? (isTackle || isSlide ? 4.85 : 3.8) : 1.55;
      for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
        const def = defAgents[dIdx];
        if (def.assignType !== 'RUSH' || def.engagedWith !== null) continue;
        if (t >= 1.0 && def.pos.y < off.pos.y - 0.35) continue;
        const latScale = isTackle ? 0.90 : 1.05;
        let d = Math.hypot((def.pos.x - off.pos.x) * latScale, def.pos.y - off.pos.y);
        // Stunt looper delay: in first 0.75s, blocker prioritizes the crasher
        if (def.stuntRole === 'LOOPER' && t < 0.75) {
          d += 2.2;
        }
        // Down-block leverage discount: tackle, center or guard pin interior rusher
        if (off.blockType === 'PIN_DOWN' && Math.abs(def.pos.x) < Math.abs(off.pos.x)) {
          d *= 0.55;
        }
        if (d < maxReach) {
          candidatePairs.push({ oIdx, dIdx, dist: d + (isChip ? 1.5 : 0), isChip });
        }
      }
    }
    candidatePairs.sort((a, b) => a.dist - b.dist);

    for (const pair of candidatePairs) {
      const off = offAgents[pair.oIdx];
      const rusher = defAgents[pair.dIdx];
      if (off.engagedWith !== null || rusher.engagedWith !== null) continue;
      if (pair.isChip) {
        rusher.vel.x *= 0.30;
        rusher.vel.y *= 0.30;
        rusher.leverageAngle = Math.max(0, rusher.leverageAngle - 0.32);
        rusher.stunTimer = Math.max(rusher.stunTimer, 0.24);
      } else {
        off.engagedWith = pair.dIdx;
        rusher.engagedWith = pair.oIdx;
      }
    }

    // Pass Rush Stunt Pass-Off Resolution (t >= 0.80s)
    if (!stuntTested && t >= 0.80 && (resolvedStunt === 'TE_TWIST' || resolvedStunt === 'ET_TWIST')) {
      stuntTested = true;
      const crasher = defAgents.find((d) => d.stuntRole === 'CRASHER');
      const looper = defAgents.find((d) => d.stuntRole === 'LOOPER');

      if (crasher && looper) {
        const rt = offAgents.find((a) => a.id === 'RT') ?? offAgents[5];
        const rg = offAgents.find((a) => a.id === 'RG') ?? offAgents[4];

        let schemeBonus = 0;
        if (blockingScheme === 'HALF_SLIDE' || blockingScheme === 'FULL_SLIDE_R') {
          schemeBonus = 12.0; // Slide protection naturally exchanges stunts
        } else if (blockingScheme === 'MAX_PROTECT') {
          schemeBonus = 16.0; // 7-man protection with TE/RB communication
        } else if (blockingScheme === 'PIN_AND_PULL') {
          schemeBonus = 4.0;
        } else if (blockingScheme === 'BIG_ON_BIG') {
          schemeBonus = -18.0; // Big-on-Big man locking is vulnerable to crossing picks
        } else if (blockingScheme === 'FULL_SLIDE_L') {
          schemeBonus = -10.0; // Sliding away isolates the tackle on an island
        }

        const olLateralAvg = 0.5 * (rt.ratings.pbk_lateral ?? 80) + 0.5 * (rg.ratings.pbk_lateral ?? 80);
        const stuntThreat =
          0.55 * looper.ratings.rush_speed + 0.45 * crasher.ratings.rush_power + rng.gaussian() * 6.5;
        const passOffMargin = olLateralAvg + schemeBonus - stuntThreat;
        const passOffProb = 1 / (1 + Math.exp(-0.065 * passOffMargin));

        if (rng.next() < passOffProb) {
          // OL Passed off the stunt cleanly!
          const rgIdx = offAgents.indexOf(rg);
          const rtIdx = offAgents.indexOf(rt);
          const cIdx = defAgents.indexOf(crasher);
          const lIdx = defAgents.indexOf(looper);

          if (rg.engagedWith !== null && rg.engagedWith !== cIdx) {
            defAgents[rg.engagedWith].engagedWith = null;
          }
          if (rt.engagedWith !== null && rt.engagedWith !== lIdx) {
            defAgents[rt.engagedWith].engagedWith = null;
          }

          rg.engagedWith = cIdx;
          crasher.engagedWith = rgIdx;
          rt.engagedWith = lIdx;
          looper.engagedWith = rtIdx;
          looper.leverageAngle = 0.05;
        } else {
          // Stunt defeated the OL! Looper is unblocked into the pocket!
          const rtIdx = offAgents.indexOf(rt);
          const cIdx = defAgents.indexOf(crasher);

          if (crasher.engagedWith !== null) {
            offAgents[crasher.engagedWith].engagedWith = null;
          }
          if (looper.engagedWith !== null) {
            offAgents[looper.engagedWith].engagedWith = null;
          }

          // Crasher occupies the tackle
          rt.engagedWith = cIdx;
          crasher.engagedWith = rtIdx;
          rg.stunTimer = Math.max(rg.stunTimer, 0.42); // Guard momentarily frozen watching or confused

          // Looper is completely clean!
          looper.engagedWith = null;
          looper.leverageAngle = 0;
          const burstSpd = getMaxSpeedYdsPerSec(looper.ratings.rush_speed) * 0.94;
          const toQbX = qb.pos.x - looper.pos.x;
          const toQbY = qb.pos.y - looper.pos.y;
          const len = Math.max(0.1, Math.hypot(toQbX, toQbY));
          looper.vel.x = (toQbX / len) * burstSpd;
          looper.vel.y = (toQbY / len) * burstSpd;
        }
      }
    }

    for (const oIdx of activeBlockers) {
      const off = offAgents[oIdx];
      if (off.engagedWith !== null) continue;

      if (off.isPulling) {
        if (off.blockType === 'PULL_KICK') {
          // Kick-out puller tracks play-side edge defender (DE/OLB outside the tackle)
          let targetEdgeIdx = -1;
          let minEdgeDist = 99;
          for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
            const def = defAgents[dIdx];
            if (def.engagedWith === null && def.pos.x >= 1.5) {
              const d = Math.hypot(def.pos.x - off.pos.x, def.pos.y - off.pos.y);
              if (d < minEdgeDist) {
                minEdgeDist = d;
                targetEdgeIdx = dIdx;
              }
            }
          }
          if (targetEdgeIdx !== -1 && minEdgeDist <= 2.1) {
            const edgeRusher = defAgents[targetEdgeIdx];
            const kickPower = off.ratings.rbk_power * 1.15;
            const defResist = edgeRusher.ratings.str * 0.75 + edgeRusher.ratings.bsh_shed * 0.40;
            const kickWin = kickPower >= defResist + rng.gaussian() * 6.0;

            edgeRusher.leverageAngle = 0;
            edgeRusher.stunTimer = kickWin ? 0.65 : 0.25;
            edgeRusher.vel.x = kickWin ? 2.8 : 1.2;
            edgeRusher.vel.y = 0.2;
            edgeRusher.pos.x += kickWin ? 0.35 : 0.10;
            off.engagedWith = targetEdgeIdx;
            edgeRusher.engagedWith = oIdx;
          } else {
            stepAnisotropicAgent(off, { x: 5.6, y: -0.6 }, null, dt, 1.30, maxFieldY);
          }
          continue;
        } else if (off.blockType === 'PULL_WRAP') {
          if (off.pos.x < 2.5 && off.pos.y < 0.2) {
            stepAnisotropicAgent(off, { x: 3.2, y: -0.5 }, null, dt, 1.25, maxFieldY);
          } else {
            let targetLbIdx = -1;
            let minLbDist = 99;
            for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
              const def = defAgents[dIdx];
              if (def.engagedWith === null && def.pos.y >= 0.5 && Math.abs(def.pos.x) <= 5.8) {
                const d = Math.hypot(def.pos.x - off.pos.x, def.pos.y - off.pos.y);
                if (d < minLbDist) {
                  minLbDist = d;
                  targetLbIdx = dIdx;
                }
              }
            }
            if (targetLbIdx !== -1 && minLbDist <= 2.2) {
              const lb = defAgents[targetLbIdx];
              const wrapPower = off.ratings.rbk_power * 1.10;
              const lbResist = lb.ratings.str * 0.70 + lb.ratings.tak_wrap * 0.40;
              const wrapWin = wrapPower >= lbResist + rng.gaussian() * 5.0;
              lb.leverageAngle = 0;
              lb.stunTimer = wrapWin ? 0.70 : 0.30;
              lb.vel.x = -1.2; // Seal LB inside away from alley
              off.engagedWith = targetLbIdx;
              lb.engagedWith = oIdx;
            } else {
              stepAnisotropicAgent(off, { x: 3.6, y: 3.8 }, null, dt, 1.20, maxFieldY);
            }
          }
          continue;
        } else {
          // Pass-protection pulling guard variant
          let sealDefIdx = -1;
          let sealDist = 2.4;
          for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
            const def = defAgents[dIdx];
            if (def.assignType === 'RUSH') {
              const d = Math.hypot(def.pos.x - off.pos.x, def.pos.y - off.pos.y);
              if (d < sealDist) {
                sealDist = d;
                sealDefIdx = dIdx;
              }
            }
          }
          if (sealDefIdx !== -1) {
            const edgeRusher = defAgents[sealDefIdx];
            edgeRusher.leverageAngle = 0;
            edgeRusher.stunTimer = Math.max(edgeRusher.stunTimer, 0.40);
            edgeRusher.vel.x *= 0.15;
            edgeRusher.vel.y *= 0.15;
            off.engagedWith = sealDefIdx;
            edgeRusher.engagedWith = oIdx;
          } else {
            const pullDir = off.id === 'LG' ? -1 : 1;
            stepAnisotropicAgent(off, { x: pullDir * 5.2, y: -0.6 }, null, dt, 1.25, maxFieldY);
          }
          continue;
        }
      }

      // Unengaged blocker slides to help double-team the nearest engaged interior rusher or sets pocket/drive depth
      let helpDefIdx = -1;
      let helpDist = 3.0;
      for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
        const def = defAgents[dIdx];
        if (def.assignType === 'RUSH' && def.engagedWith !== null) {
          const d = Math.hypot(def.pos.x - off.pos.x, def.pos.y - off.pos.y);
          if (d < helpDist) {
            helpDist = d;
            helpDefIdx = dIdx;
          }
        }
      }
      if (helpDefIdx !== -1 && off.role === 'CHIP_RELEASE') {
        const rusher = defAgents[helpDefIdx];
        rusher.leverageAngle = Math.max(0, rusher.leverageAngle - 0.55 * dt);
      } else if (isDesignedRun) {
        stepAnisotropicAgent(off, { x: off.pos.x + 0.3, y: 1.5 }, null, dt, 0.95, maxFieldY);
      } else {
        const isTackle = Math.abs(off.pos.x) > 2.4;
        let targetX = off.pos.x * 0.96;
        if (blockingScheme === 'FULL_SLIDE_L') targetX -= 0.6;
        else if (blockingScheme === 'FULL_SLIDE_R') targetX += 0.6;
        const arcDepth = isTackle ? -3.4 : -2.0;
        stepAnisotropicAgent(off, { x: targetX, y: arcDepth }, null, dt, 0.70, maxFieldY);
      }
    }

    // Count unengaged OL available to provide interior double-team slide help
    const freeOlHelpCount = activeBlockers.filter(
      (idx) => offAgents[idx].role === 'OL' && offAgents[idx].engagedWith === null
    ).length;

    // Step engaged DL/OL contacts & free rushers
    for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
      const def = defAgents[dIdx];
      if (def.assignType !== 'RUSH') continue;

      if (def.engagedWith !== null) {
        const blk = offAgents[def.engagedWith];
        const isEdgeRush = Math.abs(def.pos.x) > 2.5;
        const toQbX = qb.pos.x - def.pos.x;
        const toQbY = qb.pos.y - def.pos.y;
        const toQbLen = Math.max(0.1, Math.hypot(toQbX, toQbY));
        const nx = toQbX / toQbLen;
        const ny = toQbY / toQbLen;

        // Interior double-team slide help: 1 unengaged Center/Guard can only double-team 1 interior DT (dIdx === 1), leaving the 3-tech DT 1-on-1
        const hasDoubleTeam = dIdx === 1 && freeOlHelpCount > 0;
        const doubleTeamBonus = hasDoubleTeam ? 5.5 : 0.0;

        let stuntBlockerBonus = 0;
        let stuntRusherBonus = 0;
        if (resolvedStunt === 'OVERLOAD_SLANT') {
          if (blockingScheme === 'HALF_SLIDE' || blockingScheme === 'FULL_SLIDE_R') {
            stuntBlockerBonus = 6.0;
          } else if (blockingScheme === 'BIG_ON_BIG' || blockingScheme === 'FULL_SLIDE_L') {
            if (dIdx <= 1) stuntRusherBonus = 8.5; // Backside slanter beats isolated blocker
          }
        }

        let runBlockerBonus = 0;
        if (isDesignedRun) {
          if (blk.blockType === 'PIN_DOWN') {
            runBlockerBonus = 25.0; // Pin-down leverage angle bonus
          } else if (blk.blockType === 'PULL_KICK') {
            runBlockerBonus = 20.0;
          } else if (blk.blockType === 'PULL_WRAP') {
            runBlockerBonus = 18.0;
          } else if (blk.blockType === 'RUN_DRIVE') {
            runBlockerBonus = 14.0;
          }
        }

        const rusherRating = (isEdgeRush
          ? 0.62 * def.ratings.rush_speed + 0.38 * def.ratings.rush_power
          : 0.68 * def.ratings.rush_power + 0.32 * def.ratings.str) + stuntRusherBonus;
        const blockerRating =
          (isEdgeRush
            ? 0.65 * (isDesignedRun ? blk.ratings.rbk_power : blk.ratings.pbk_lateral) + 0.35 * blk.ratings.pbk_anchor
            : 0.68 * (isDesignedRun ? blk.ratings.rbk_power : blk.ratings.pbk_anchor) + 0.32 * blk.ratings.str) +
          doubleTeamBonus +
          stuntBlockerBonus +
          runBlockerBonus;

        const skillDiff = rusherRating - blockerRating;
        // Two-stage NFL Pass Protection Geometry vs Run Drive Displacement:
        const pocketRimX = isEdgeRush ? Math.sign(def.pos.x || 1) * 1.95 : def.pos.x * 0.48;
        const pocketRimY = isEdgeRush ? qb.pos.y + 1.75 : qb.pos.y + 2.02;
        const toRimX = pocketRimX - def.pos.x;
        const toRimY = pocketRimY - def.pos.y;
        const distToRim = Math.hypot(toRimX, toRimY);
        const inKickSlide = !isDesignedRun && distToRim > 0.42 && def.pos.y > pocketRimY;

        let dirX = inKickSlide ? toRimX / Math.max(0.1, distToRim) : nx;
        let dirY = inKickSlide ? toRimY / Math.max(0.1, distToRim) : ny;
        if (isDesignedRun) {
          if (blk.blockType === 'PIN_DOWN') {
            dirX = blk.pos.x > 0 ? -0.85 : 0.85;
            dirY = 0.25;
          } else if (blk.blockType === 'PULL_KICK') {
            dirX = 1.0;
            dirY = 0.15;
          } else {
            dirX = 0;
            dirY = 0.85;
          }
        }
        const pushSpeed = inKickSlide
          ? (isEdgeRush ? 1.55 : 1.32) + 0.015 * skillDiff
          : Math.max(0.05, Math.min(0.35, (isEdgeRush ? 0.16 : 0.14) + 0.009 * skillDiff));

        def.vel.x = dirX * pushSpeed;
        def.vel.y = dirY * pushSpeed;
        def.pos.x += def.vel.x * dt;
        def.pos.y += def.vel.y * dt;

        blk.pos.x = def.pos.x + nx * 0.72;
        blk.pos.y = def.pos.y + ny * 0.72;

        // Calibrated Pass Rush Win Rate (PRWR) / Block Shed SDE:
        const shedSkillDiff =
          (0.55 * def.ratings.bsh_shed + 0.45 * rusherRating - blockerRating) / 100;
        const baseDrift = isDesignedRun && blk.blockType === 'PIN_DOWN' ? 0.10 : 0.228;
        const shedDrift = Math.max(0.06, baseDrift + 0.32 * shedSkillDiff) * dt;
        const shedNoise = 0.145 * Math.sqrt(dt) * rng.gaussian();
        def.leverageAngle = Math.max(0, def.leverageAngle + shedDrift + shedNoise);

        if (def.leverageAngle >= 1.0) {
          blk.engagedWith = null;
          blk.stunTimer = 0.90;
          def.engagedWith = null;
          def.leverageAngle = 0;
          def.pos.x += nx * 0.55;
          def.pos.y += ny * 0.55;
          // Explosive block-shed burst toward carrier or QB
          const burstSpd = getMaxSpeedYdsPerSec(def.ratings.spd) * 0.88;
          const targetPos =
            isDesignedRun && carrierOffIdx !== null ? offAgents[carrierOffIdx].pos : qb.pos;
          const burstDx = targetPos.x - def.pos.x;
          const burstDy = targetPos.y - def.pos.y;
          const burstLen = Math.max(0.1, Math.hypot(burstDx, burstDy));
          def.vel.x = (burstDx / burstLen) * burstSpd;
          def.vel.y = (burstDy / burstLen) * burstSpd;
        }
      } else {
        let pursuitTarget =
          (ballState === 'CAUGHT' || ballState === 'LATERAL_FLIGHT') && carrierOffIdx !== null
            ? offAgents[carrierOffIdx].pos
            : qb.pos;
        let getOffBoost = t < 0.8 ? 1.0 + 0.08 * ((def.ratings.get_off_burst - 75) / 24) : 1.16;

        if (ballState === 'HELD') {
          if (def.stuntRole === 'CRASHER' && t < 0.75) {
            const crashX = resolvedStunt === 'TE_TWIST' ? 3.3 : 1.8;
            pursuitTarget = { x: crashX, y: -0.6 };
            getOffBoost = 1.25;
          } else if (def.stuntRole === 'LOOPER' && t < 0.75) {
            const stemX = resolvedStunt === 'TE_TWIST' ? 4.8 : 2.1;
            const stemY = resolvedStunt === 'TE_TWIST' ? 1.0 : 0.4;
            pursuitTarget = { x: stemX, y: stemY };
            getOffBoost = 0.75;
          } else if (def.stuntRole === 'LOOPER' && t >= 0.75) {
            getOffBoost = 1.32; // Looper loops into backfield
          }
        }
        stepAnisotropicAgent(def, pursuitTarget, null, dt, getOffBoost, maxFieldY);

        if (ballState === 'HELD') {
          const targetPerson = isDesignedRun
            ? offAgents.find((a) => a.role === 'BALL_CARRIER') || qb
            : qb;
          const distToTarget = Math.hypot(def.pos.x - targetPerson.pos.x, def.pos.y - targetPerson.pos.y);
          if (distToTarget <= 1.78) {
            const runnerBreak = isDesignedRun
              ? targetPerson.ratings.btk_power * 0.7 + targetPerson.ratings.elusiveness * 0.3
              : qb.ratings.btk_power * 0.6 + qb.ratings.elusiveness * 0.4;
            const escapeProb =
              1 /
              (1 +
                Math.exp(
                  -0.055 *
                    (runnerBreak - def.ratings.tak_wrap - 23)
                ));
            if (rng.next() > escapeProb) {
              ballState = 'DEAD';
              timeToThrow = t;
              wasPressuredOnPlay = true;
              const yardsLost = Math.min(-0.8, Math.round(targetPerson.pos.y * 10) / 10);
              const outcomeType: PlayOutcome = isDesignedRun ? 'RUN_STUFF' : 'SACK';
              const evalRes = evaluateSnapEPA(situation, outcomeType, yardsLost);
              commentary = isDesignedRun
                ? `[RUN STUFF at t=${t.toFixed(2)}s] ${def.name} blew up the backfield mesh to tackle ${targetPerson.name} for ${yardsLost.toFixed(1)} yds (${evalRes.epa.toFixed(2)} EPA).`
                : `[SACK at t=${t.toFixed(2)}s] ${def.name} (${def.label}) defeated protection and sacked ${qb.name} at ${yardsLost.toFixed(1)} yds (${evalRes.epa.toFixed(2)} EPA).`;
              if (recordSnapshots) {
                snapshots.push(
                  captureSnapshot(
                    tick,
                    t,
                    currentReadSlot + 1,
                    1.6,
                    ballState,
                    ballPos,
                    ballTargetPos,
                    null,
                    null,
                    offAgents,
                    defAgents,
                    false,
                    activeScheme,
                    resolvedStunt,
                    matchCoverage
                  )
                );
              }
              if (lastDecisionTelemetry) {
                lastDecisionTelemetry.decisionType = isDesignedRun ? 'DESIGNED_RUN' : 'SACK';
                lastDecisionTelemetry.chosenTargetName = `${outcomeType} by ${def.name}`;
              }
              return wrapResult({
                outcome: outcomeType,
                yardsGained: yardsLost,
                airYards: 0,
                yacYards: 0,
                epa: evalRes.epa,
                goalSuccess: false,
                epaSuccess: false,
                timeToThrow,
                wasPressured: true,
                targetedPlayerId: isDesignedRun ? targetPerson.id : null,
                targetedReadOrder: currentReadSlot + 1,
                catchPos: { ...targetPerson.pos },
                brokenTackles: 0,
                lateralsAttempted: 0,
                lateralsCompleted: 0,
                preSnapTell,
                commentary,
                snapshots,
                isScramble: false,
                scrambleYards: 0,
                qbDecisionTelemetry: lastDecisionTelemetry,
                isRunPlay: isDesignedRun,
              });
            } else {
              def.stunTimer = 0.42;
              brokenTackles++;
            }
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // 2. POCKET PRESSURE FIELD & QB DROPBACK GEOMETRY
    // ------------------------------------------------------------------------
    let pocketPressure = 0;
    let pressGradX = 0;
    let pressGradY = 0;
    let hasUnblockedThreat = false;
    const isBlitzCall = activeScheme === 'ZERO_BLITZ' || activeScheme === 'FIRE_ZONE_3';

    if (ballState === 'HELD') {
      for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
        const def = defAgents[dIdx];
        if (def.assignType !== 'RUSH') continue;
        const dx = qb.pos.x - def.pos.x;
        const dy = qb.pos.y - def.pos.y;
        const dist = Math.hypot(dx, dy);

        if (def.engagedWith === null) {
          // Free or shed rusher creates genuine NGS pressure when within 3.6 yards of QB
          if (dist < 3.6) {
            const sigmaSq = 2 * 2.15 * 2.15;
            const contrib = 1.45 * Math.exp(-(dist * dist) / sigmaSq);
            pocketPressure += contrib;
            pressGradX += (dx / sigmaSq) * contrib;
            pressGradY += (dy / sigmaSq) * contrib;
            if (dist < 3.1) hasUnblockedThreat = true;
          }
        } else {
          // Engaged rusher creates pocket collapse pressure when bull-rushed within 1.65y or crossing leverage barrier (>= 0.92)
          if (dist < 1.65 || def.leverageAngle >= 0.92) {
            const levFactor =
              def.leverageAngle >= 0.92 ? Math.min(1.0, (def.leverageAngle - 0.86) / 0.14) : 0.45;
            const sigmaSq = 2 * 2.05 * 2.05;
            const contrib = 0.78 * levFactor * Math.exp(-(dist * dist) / sigmaSq);
            pocketPressure += contrib;
            pressGradX += (dx / sigmaSq) * contrib;
            pressGradY += (dy / sigmaSq) * contrib;
          }
        }
      }

      if (
        (hasUnblockedThreat ||
          pocketPressure >= 0.60) &&
        t >= 1.35
      ) {
        wasPressuredOnPlay = true;
      }

      let dropTarget: Vec2;
      if (isDesignedRun) {
        const carrier =
          offAgents.find((a) => a.role === 'BALL_CARRIER') ||
          offAgents.find((a) => a.id === 'RB');
        if (carrier && carrier.id === 'QB') {
          const wp0 = carrier.waypoints[0] || { x: 0, y: -3.5 };
          dropTarget = { x: wp0.x * 0.5, y: -3.8 };
        } else {
          dropTarget = carrier ? { x: carrier.pos.x * 0.45, y: -4.5 } : { x: 0, y: -4.5 };
        }
      } else if (dropbackType === 'PLAY_ACTION' && t < 0.70) {
        dropTarget = { x: 0.0, y: -3.8 };
      } else if (dropbackType === 'SPRINT_OUT') {
        dropTarget = { x: Math.min(8.5, t * 4.2), y: -5.4 };
      } else if (dropbackType === 'QUICK_GAME') {
        dropTarget =
          t < 1.15
            ? { x: 0, y: -5.2 }
            : {
                x: Math.max(-4.0, Math.min(4.0, qb.pos.x + pressGradX * 2.0)),
                y: Math.max(-6.6, Math.min(-3.6, qb.pos.y + pressGradY * 1.2 + 0.20)),
              };
      } else {
        dropTarget =
          t < 1.40
            ? { x: 0, y: -6.0 }
            : {
                x: Math.max(-4.5, Math.min(4.5, qb.pos.x + pressGradX * 2.2)),
                y: Math.max(-7.2, Math.min(-3.8, qb.pos.y + pressGradY * 1.4 + 0.25)),
              };
      }
      stepAnisotropicAgent(qb, dropTarget, null, dt, 0.85, maxFieldY);
      ballPos = { x: qb.pos.x, y: qb.pos.y };
    }

    // ------------------------------------------------------------------------
    // 3. OFFENSIVE ROUTE RUNNERS (Press Release, Cuts, Zone Settle & Scramble Drill)
    // ------------------------------------------------------------------------
    if (ballState === 'CAUGHT' && carrierOffIdx === 0) {
      if (isDesignedRun && qb.waypoints.length > 0) {
        const curWp = qb.waypoints[qb.wpIndex];
        const distWp = Math.hypot(curWp.x - qb.pos.x, curWp.y - qb.pos.y);
        if (distWp < 1.4 && qb.wpIndex + 1 < qb.waypoints.length) {
          qb.wpIndex++;
        }
        let laneAdjustX = 0;
        for (const def of defAgents) {
          if (def.stunTimer > 0) continue;
          const dx = qb.pos.x - def.pos.x;
          const dy = qb.pos.y - def.pos.y;
          const d = Math.hypot(dx, dy);
          if (d < 3.8 && dy > -1.0) {
            laneAdjustX += (dx / (d * d + 0.3)) * 2.2;
          }
        }
        const wp = qb.waypoints[qb.wpIndex];
        const runTarget: Vec2 = {
          x: Math.max(-24.0, Math.min(24.0, wp.x + laneAdjustX * 0.45)),
          y: Math.min(maxFieldY - 0.5, wp.y),
        };
        stepAnisotropicAgent(qb, runTarget, null, dt, 1.0, maxFieldY);
      } else {
        // Scrambling QB seeks open grass outside the tackle box or through the widest B/C gap
        let avoidX = qb.pos.x >= 0 ? 3.2 : -3.2;
        for (const def of defAgents) {
          const dx = qb.pos.x - def.pos.x;
          const dy = qb.pos.y - def.pos.y;
          const d = Math.hypot(dx, dy);
          if (d < 6.8 && dy > -2.0) {
            const signX = Math.abs(dx) < 0.3 ? (qb.pos.x >= 0 ? 1 : -1) : Math.sign(dx);
            avoidX += (signX * 4.5) / (d + 0.4);
          }
        }
        const qbScrambleTarget: Vec2 = {
          x: Math.max(-24.0, Math.min(24.0, qb.pos.x + avoidX)),
          y: qb.pos.y + 11.0,
        };
        stepAnisotropicAgent(qb, qbScrambleTarget, null, dt, 1.0, maxFieldY);
      }
    }

    for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
      const off = offAgents[oIdx];
      if (off.role === 'OL' || off.role === 'PASS_BLOCK') continue;
      if (off.role === 'CHIP_RELEASE' && off.chipTimer > 0) continue;

      if (!off.pressTested && !off.motionFreeRelease && t >= 0.05 && t <= 0.30 && off.pos.y < 2.2) {
        off.pressTested = true;
        const pressCorner = defAgents.find(
          (d) =>
            d.assignType !== 'RUSH' &&
            Math.abs(d.pos.x - off.pos.x) <= 2.2 &&
            d.pos.y - off.pos.y <= 3.5
        );
        if (pressCorner) {
          const recRelease = 0.65 * off.ratings.release_press + 0.35 * off.ratings.agi;
          const defJam = 0.65 * pressCorner.ratings.press_jam + 0.35 * pressCorner.ratings.str;
          const margin = defJam - recRelease;
          if (margin + rng.gaussian() * 8 > 1.0) {
            const jamDuration = Math.max(0.08, Math.min(0.24, 0.12 + 0.004 * margin));
            off.pressJamTimer = jamDuration;
            off.expectedBreakTime += jamDuration;
          } else {
            pressCorner.cutReactionTimer = Math.max(pressCorner.cutReactionTimer, 0.12);
          }
        }
      }

      if (off.pressJamTimer > 0) {
        off.pressJamTimer = Math.max(0, off.pressJamTimer - dt);
        stepAnisotropicAgent(off, { x: off.pos.x, y: off.pos.y + 1.2 }, null, dt, 0.42, maxFieldY);
        continue;
      }

      if (ballState === 'CAUGHT' && carrierOffIdx === oIdx) {
        if (isDesignedRun && off.waypoints.length > 0) {
          const curWp = off.waypoints[off.wpIndex];
          const distWp = Math.hypot(curWp.x - off.pos.x, curWp.y - off.pos.y);
          if (distWp < 1.4 && off.wpIndex + 1 < off.waypoints.length) {
            off.wpIndex++;
          }
          let laneAdjustX = 0;
          for (const def of defAgents) {
            if (def.stunTimer > 0) continue;
            const dx = off.pos.x - def.pos.x;
            const dy = off.pos.y - def.pos.y;
            const d = Math.hypot(dx, dy);
            if (d < 3.8 && dy > -1.0) {
              laneAdjustX += (dx / (d * d + 0.3)) * 2.2;
            }
          }
          const activeWp = off.waypoints[off.wpIndex];
          const lookaheadWp =
            off.wpIndex + 1 < off.waypoints.length ? off.waypoints[off.wpIndex + 1] : null;
          const targetX = Math.max(-24.0, Math.min(24.0, activeWp.x + laneAdjustX * 0.35));
          const targetY = off.wpIndex + 1 >= off.waypoints.length ? off.pos.y + 12.0 : activeWp.y;

          const nearestDefDist = Math.min(
            ...defAgents.map((d) => (d.stunTimer > 0 ? 99 : Math.hypot(d.pos.x - off.pos.x, d.pos.y - off.pos.y)))
          );
          const runBurstScale = nearestDefDist > 2.2 ? 1.08 : 0.95;
          stepAnisotropicAgent(off, { x: targetX, y: targetY }, lookaheadWp, dt, runBurstScale, maxFieldY);
        } else {
          let avoidX = 0;
          for (const def of defAgents) {
            const dx = off.pos.x - def.pos.x;
            const dy = off.pos.y - def.pos.y;
            const d = Math.hypot(dx, dy);
            if (d < 5.8 && dy > -1.5) {
              avoidX += (dx / (d * d + 0.4)) * 3.8;
            }
          }
          const yacTarget: Vec2 = {
            x: Math.max(-24.5, Math.min(24.5, off.pos.x + avoidX)),
            y: off.pos.y + 12.0,
          };
          const tuckScale = t - (timeToThrow + totalFlightTime) < 0.30 ? 0.84 : 0.94;
          stepAnisotropicAgent(off, yacTarget, null, dt, tuckScale, maxFieldY);
        }
      } else if (ballState === 'CAUGHT' && carrierOffIdx !== oIdx && allowLaterals) {
        const carrier = offAgents[carrierOffIdx!];
        const pitchTrailTarget: Vec2 = {
          x: carrier.pos.x + (off.pos.x > carrier.pos.x ? 3.8 : -3.8),
          y: carrier.pos.y - 2.0,
        };
        stepAnisotropicAgent(off, pitchTrailTarget, null, dt, 1.0, maxFieldY);
      } else if (ballState === 'IN_FLIGHT' && targetedOffIdx === oIdx) {
        // Receiver tracks anticipated route lead spot for first 45% of flight, then adjusts to scattered ball in final 55%
        const trackTarget =
          flightTimer > totalFlightTime * 0.55 ? ballIntendedLeadPos : ballTargetPos;
        stepAnisotropicAgent(off, trackTarget, null, dt, 1.0, maxFieldY);
      } else if (off.waypoints.length > 0) {
        // Dynamic Choice / Option Route Branching at Stem Read Point
        if (
          !off.hasResolvedChoice &&
          off.choiceRules &&
          off.choiceRules.length > 0 &&
          (off.pos.y >= (off.waypoints[0]?.y ?? 4.0) - 1.8 || t >= 0.45)
        ) {
          // 1. Safety Shell (MOFC vs MOFO)
          const deepSafeties = defAgents.filter(
            (d) => d.assignType === 'ZONE_DEEP' || (d.pos.y > 13.0 && d.assignType !== 'RUSH')
          );
          const isMOFC =
            deepSafeties.length <= 1 ||
            (deepSafeties.length === 1 && Math.abs(deepSafeties[0].pos.x) < 5.0) ||
            activeScheme === 'COV1_ROBBER' ||
            activeScheme === 'COV3_SKY';
          const isMOFO = !isMOFC;

          // 2. Coverage Type (MAN vs ZONE)
          const manDef = defAgents.find(
            (d) => d.assignType === 'MAN' && d.manTargetIdx === oIdx
          );
          const isMan = !!manDef;
          const isZone = !isMan;

          // 3. Defender Leverage (Inside vs Outside)
          let defenderLeverage: 'INSIDE' | 'OUTSIDE' = 'OUTSIDE';
          const primaryDef =
            manDef ||
            defAgents.reduce((closest, d) => {
              if (d.assignType === 'RUSH') return closest;
              const dist = Math.hypot(d.pos.x - off.pos.x, d.pos.y - off.pos.y);
              const curDist = Math.hypot(closest.pos.x - off.pos.x, closest.pos.y - off.pos.y);
              return dist < curDist ? d : closest;
            }, defAgents[4]);

          if (primaryDef) {
            const isInside =
              off.pos.x > 0
                ? primaryDef.pos.x < off.pos.x - 0.2
                : primaryDef.pos.x > off.pos.x + 0.2;
            defenderLeverage = isInside ? 'INSIDE' : 'OUTSIDE';
          }

          // Match choice rule
          for (const rule of off.choiceRules) {
            let matched = false;
            if (rule.condition === 'MOFC' && isMOFC) matched = true;
            else if (rule.condition === 'MOFO' && isMOFO) matched = true;
            else if (rule.condition === 'MAN' && isMan) matched = true;
            else if (rule.condition === 'ZONE' && isZone) matched = true;
            else if (rule.condition === 'LEVERAGE_INSIDE' && defenderLeverage === 'INSIDE') matched = true;
            else if (rule.condition === 'LEVERAGE_OUTSIDE' && defenderLeverage === 'OUTSIDE') matched = true;

            if (matched && rule.waypoints.length > 0) {
              const currentStem = off.waypoints[0] || { x: off.pos.x, y: off.pos.y + 4.0 };
              off.waypoints = [currentStem, ...rule.waypoints.map((w) => ({ ...w }))];
              off.choiceActiveDesc = rule.description || `Choice Read: ${rule.condition}`;
              break;
            }
          }
          off.hasResolvedChoice = true;
        }

        const wp = off.waypoints[off.wpIndex];
        const distToWp = Math.hypot(wp.x - off.pos.x, wp.y - off.pos.y);

        if (distToWp < 1.05 && off.wpIndex + 1 < off.waypoints.length) {
          off.wpIndex++;
          // Receiver hits route stem break -> trigger visual-motor cut reaction on covering man defender
          const routeRating = off.pos.y > 10 ? off.ratings.rr_med : off.ratings.rr_short;
          for (const def of defAgents) {
            if (def.assignType === 'MAN' && def.manTargetIdx === oIdx && def.cutReactionTimer <= 0) {
              const skillDiff = (routeRating - def.ratings.cov_man) / 100;
              let rubDelay = 0;
              for (let otherIdx = 1; otherIdx < offAgents.length; otherIdx++) {
                if (otherIdx === oIdx || offAgents[otherIdx].role !== 'ROUTE') continue;
                if (
                  Math.hypot(
                    offAgents[otherIdx].pos.x - def.pos.x,
                    offAgents[otherIdx].pos.y - def.pos.y
                  ) < 2.4
                ) {
                  rubDelay = 0.16;
                  break;
                }
              }
              const isRounded = off.breakStyle === 'ROUNDED_SPEED';
              const breakReactionMultiplier = isRounded ? 0.45 : 1.25;
              def.cutReactionTimer = Math.max(
                isRounded ? 0.06 : 0.16,
                (0.24 + 0.24 * skillDiff + rubDelay + 0.03 * rng.gaussian()) * breakReactionMultiplier
              );
            }
          }
        }
        let activeWp = { ...off.waypoints[off.wpIndex] };
        const lookaheadWp =
          off.wpIndex + 1 < off.waypoints.length ? off.waypoints[off.wpIndex + 1] : null;

        if (!lookaheadWp && distToWp < 2.0 && ballState === 'HELD') {
          if (t > 3.10) {
            activeWp = {
              x: Math.max(-23.5, Math.min(23.5, activeWp.x + Math.sign(qb.pos.x - activeWp.x) * 4.5)),
              y: Math.min(maxFieldY - 1.2, Math.max(situation.distance + 0.5, activeWp.y + 2.0)),
            };
          } else if (
            off.ratings.zone_find_iq >= 82 &&
            activeScheme !== 'COV1_ROBBER' &&
            activeScheme !== 'ZERO_BLITZ'
          ) {
            let pushAwayX = 0;
            for (const def of defAgents) {
              if (def.assignType === 'RUSH') continue;
              const dx = off.pos.x - def.pos.x;
              const dy = off.pos.y - def.pos.y;
              const d = Math.hypot(dx, dy);
              if (d < 5.2) pushAwayX += (dx / (d + 0.5)) * 1.15;
            }
            activeWp.x = Math.max(-23.5, Math.min(23.5, activeWp.x + pushAwayX));
          }
        }

        stepAnisotropicAgent(off, activeWp, lookaheadWp, dt, 1.0, maxFieldY);
      }
    }

    // ------------------------------------------------------------------------
    // 4. DEFENSIVE SECONDARY (Play-Action Freeze, Capping, Pattern Match & Ball Break)
    // ------------------------------------------------------------------------
    for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
      const def = defAgents[dIdx];
      if (def.assignType === 'RUSH') continue;

      if ((ballState === 'CAUGHT' || ballState === 'LATERAL_FLIGHT') && carrierOffIdx !== null) {
        const carrier = offAgents[carrierOffIdx];
        if (def.lungeLockTimer > 0) {
          def.lungeLockTimer = Math.max(0, def.lungeLockTimer - dt);
          def.pos.x += def.vel.x * dt;
          def.pos.y += def.vel.y * dt;
        } else {
          const leadT = Math.min(
            0.35,
            Math.hypot(carrier.pos.x - def.pos.x, carrier.pos.y - def.pos.y) / 10.0
          );
          const pursuitPt: Vec2 = {
            x: carrier.pos.x + carrier.vel.x * leadT,
            y: carrier.pos.y + carrier.vel.y * leadT,
          };
          stepAnisotropicAgent(def, pursuitPt, null, dt, 1.05, maxFieldY);
        }
        continue;
      }

      if (ballState === 'IN_FLIGHT') {
        if (def.ballBreakDelay > 0) {
          def.ballBreakDelay = Math.max(0, def.ballBreakDelay - dt);
          if (def.assignType === 'MAN' && def.manTargetIdx >= 0) {
            const rec = offAgents[def.manTargetIdx];
            stepAnisotropicAgent(
              def,
              { x: rec.pos.x + rec.vel.x * 0.14, y: rec.pos.y + 0.20 },
              null,
              dt,
              1.0,
              maxFieldY
            );
          } else {
            const continueTarget: Vec2 =
              targetedOffIdx !== null &&
              Math.hypot(
                offAgents[targetedOffIdx].pos.x - def.pos.x,
                offAgents[targetedOffIdx].pos.y - def.pos.y
              ) < 11.5
                ? offAgents[targetedOffIdx].pos
                : { x: def.pos.x + def.vel.x * 0.25, y: def.pos.y + def.vel.y * 0.25 };
            stepAnisotropicAgent(def, continueTarget, null, dt, 0.98, maxFieldY);
          }
        } else {
          stepAnisotropicAgent(def, ballTargetPos, null, dt, 1.06, maxFieldY);
        }
        continue;
      }

      if (def.playActionFreezeTimer > 0) {
        def.playActionFreezeTimer = Math.max(0, def.playActionFreezeTimer - dt);
        stepAnisotropicAgent(
          def,
          { x: def.pos.x * 0.88, y: Math.max(1.8, def.pos.y - 1.0) },
          null,
          dt,
          0.65,
          maxFieldY
        );
        continue;
      }

      if (def.assignType === 'SPY') {
        const qbScrambling = ballState === 'CAUGHT' && carrierOffIdx === 0;
        const qbBreakingPocket = qb.pos.y > -1.8 || Math.abs(qb.pos.x) > 3.8;

        if (qbScrambling || qbBreakingPocket) {
          const leadT = Math.min(0.35, Math.hypot(qb.pos.x - def.pos.x, qb.pos.y - def.pos.y) / 10.0);
          const pursuitPt: Vec2 = {
            x: qb.pos.x + qb.vel.x * leadT,
            y: qb.pos.y + qb.vel.y * leadT,
          };
          stepAnisotropicAgent(def, pursuitPt, null, dt, 1.0, maxFieldY);
        } else {
          const mirrorTarget: Vec2 = {
            x: qb.pos.x * 0.85,
            y: Math.max(3.2, 4.0 + (qb.pos.y + 4.5) * 0.25),
          };
          stepAnisotropicAgent(def, mirrorTarget, null, dt, 0.92, maxFieldY);
        }
        continue;
      }

      if (def.assignType === 'MAN' && def.manTargetIdx >= 0) {
        const rec = offAgents[def.manTargetIdx];
        const recSpd = Math.hypot(rec.vel.x, rec.vel.y);
        const curDir =
          recSpd > 0.5 ? { x: rec.vel.x / recSpd, y: rec.vel.y / recSpd } : def.lastTargetVelDir;
        const routeRating = rec.pos.y > 10 ? rec.ratings.rr_med : rec.ratings.rr_short;

        def.lastTargetVelDir = {
          x: 0.82 * def.lastTargetVelDir.x + 0.18 * curDir.x,
          y: 0.82 * def.lastTargetVelDir.y + 0.18 * curDir.y,
        };

        if (def.cutReactionTimer > 0) {
          def.cutReactionTimer = Math.max(0, def.cutReactionTimer - dt);
          const driftTarget: Vec2 = {
            x: def.pos.x + def.vel.x * 0.35,
            y: def.pos.y + def.vel.y * 0.35,
          };
          stepAnisotropicAgent(def, driftTarget, null, dt, 0.90, maxFieldY);
        } else {
          // NFL Man-to-Man Mirror (inside hip leverage + realistic cushion modulated by cov_man vs rr)
          const skillGap = (routeRating - def.ratings.cov_man) / 100;
          const leverageOffset = (rec.pos.x > 0 ? -0.55 : 0.55) * (1.0 + 0.35 * skillGap);
          const cushionY = Math.max(0.35, 0.65 + 0.35 * skillGap);
          const manAim: Vec2 = {
            x: rec.pos.x + rec.vel.x * 0.12 + leverageOffset,
            y: Math.max(rec.pos.y + cushionY, rec.pos.y + rec.vel.y * 0.12),
          };
          stepAnisotropicAgent(def, manAim, null, dt, 0.99, maxFieldY);
        }
      } else {
        // ZONE_DEEP, ZONE_UNDER, or ROBBER Pattern Matching
        let matchTarget: Vec2 = { ...def.zoneAnchor };

        if (def.assignType === 'ZONE_DEEP') {
          if (activeScheme === 'COV2_TAMPA' && dIdx === 8) {
            // Tampa-2 Middle Pole Sinking: Mike Linebacker (e.g. Warner) bisects the two deep half-field safeties
            let poleThreat: AgentRuntime | null = null;
            let deepestMiddleY = -5.0;
            for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
              const rec = offAgents[oIdx];
              if (rec.role === 'OL' || rec.role === 'PASS_BLOCK') continue;
              if (Math.abs(rec.pos.x) < 7.5 && rec.pos.y > deepestMiddleY) {
                deepestMiddleY = rec.pos.y;
                poleThreat = rec;
              }
            }
            if (poleThreat && poleThreat.pos.y >= 5.5) {
              def.matchedReceiverIdx = poleThreat.readOrder;
              const carryDepth = Math.min(def.zoneCapY, Math.max(12.5, poleThreat.pos.y + 0.85));
              matchTarget = {
                x: poleThreat.pos.x * 0.65,
                y: carryDepth,
              };
            } else {
              def.matchedReceiverIdx = null;
              // Sinking continuously down the middle pole with play clock
              const sinkY = Math.min(def.zoneCapY - 1.5, 6.5 + t * 3.4);
              matchTarget = { x: 0.0, y: sinkY };
            }
          } else {
            let deepestY = -5.0;
            let sectorReceiver: AgentRuntime | null = null;
            const isOutsideDeep = Math.abs(def.zoneAnchor.x) > 8.0;

            for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
              const rec = offAgents[oIdx];
              if (rec.role === 'OL' || rec.role === 'PASS_BLOCK') continue;
              const sectorWidth = isOutsideDeep ? 11.5 : 15.0;
              const inSector = Math.abs(rec.pos.x - def.zoneAnchor.x) < sectorWidth;
              if (inSector && rec.pos.y > deepestY) {
                deepestY = rec.pos.y;
                sectorReceiver = rec;
              }
            }

            if (sectorReceiver) {
              const zoneTrackWeight = 0.74 + 0.17 * (def.ratings.cov_zone / 100);
              const brokeHorizontal = sectorReceiver.pos.y >= 9.0 && Math.abs(sectorReceiver.vel.y) < 2.6;
              const cushionY = brokeHorizontal ? 1.35 : isOutsideDeep ? 1.75 : 2.35;
              const minPedalY = isOutsideDeep ? 5.5 : 10.5;
              matchTarget = {
                x:
                  (1 - zoneTrackWeight) * def.zoneAnchor.x +
                  zoneTrackWeight * (sectorReceiver.pos.x + sectorReceiver.vel.x * 0.18),
                y: Math.min(
                  def.zoneCapY,
                  Math.max(minPedalY, sectorReceiver.pos.y + cushionY)
                ),
              };
            }
          }
        } else {
          // ZONE_UNDER or ROBBER: Pattern-match distribution
          let matchedRec: AgentRuntime | null = null;
          if (
            matchCoverage &&
            (activeScheme === 'COV3_SKY' ||
              activeScheme === 'COV4_QUARTERS' ||
              activeScheme === 'COV6_SPLIT' ||
              activeScheme === 'FIRE_ZONE_3')
          ) {
            // Rip/Liz Match Rule: Underneath hook/apex/nickel defenders carry vertical stems inside their quadrant
            for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
              const rec = offAgents[oIdx];
              if (rec.role === 'OL' || rec.role === 'PASS_BLOCK') continue;
              const dx = rec.pos.x - def.zoneAnchor.x;
              // Inside vertical stem check: within 7.0 yards lateral corridor of anchor, releasing vertical past 6.0y
              if (Math.abs(dx) < 7.0 && rec.pos.y >= 6.0 && rec.vel.y > 1.8) {
                matchedRec = rec;
                break;
              }
            }
          }

          if (matchedRec) {
            def.matchedReceiverIdx = matchedRec.readOrder;
            const matchWeight = 0.88 + 0.10 * (def.ratings.cov_zone / 100);
            const targetX =
              (1 - matchWeight) * def.zoneAnchor.x + matchWeight * (matchedRec.pos.x + matchedRec.vel.x * 0.15);
            // Carry vertical route downfield up to 19.5y under the deep safety
            const maxCarryY = Math.min(maxFieldY - 1.2, 19.5);
            const targetY = Math.min(maxCarryY, Math.max(def.zoneAnchor.y, matchedRec.pos.y + 0.75));
            matchTarget = { x: targetX, y: targetY };
          } else {
            def.matchedReceiverIdx = null;
            let bestScore = 99;
            for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
              const rec = offAgents[oIdx];
              if (rec.role === 'OL' || rec.role === 'PASS_BLOCK') continue;
              const predX = rec.pos.x + rec.vel.x * 0.25;
              const predY = rec.pos.y + rec.vel.y * 0.25;
              let d = Math.hypot(predX - def.zoneAnchor.x, predY - def.zoneAnchor.y);
              const alreadyBracketed = defAgents.some(
                (other, otherIdx) =>
                  otherIdx !== dIdx &&
                  other.assignType !== 'RUSH' &&
                  Math.hypot(other.pos.x - rec.pos.x, other.pos.y - rec.pos.y) < 2.3
              );
              if (alreadyBracketed) d += 2.6;
              const maxRadius = def.assignType === 'ROBBER' ? 11.2 : 9.8;
              if (d < maxRadius && d < bestScore) {
                bestScore = d;
                const matchWeight = 0.88 + 0.10 * (def.ratings.cov_zone / 100);
                matchTarget = {
                  x: (1 - matchWeight) * def.zoneAnchor.x + matchWeight * predX,
                  y: (1 - matchWeight) * def.zoneAnchor.y + matchWeight * predY,
                };
              }
            }
          }
        }
        stepAnisotropicAgent(def, matchTarget, null, dt, 0.98, maxFieldY);
      }
    }

    // ------------------------------------------------------------------------
    // 5. QUARTERBACK DECISION READ TREE, ROUTE TIMING & SCRAMBLE MATRIX
    // ------------------------------------------------------------------------
    const minDropbackTime =
      isBlitzCall && hasUnblockedThreat && t >= 1.25
        ? 1.25
        : dropbackType === 'PLAY_ACTION'
        ? 1.95
        : dropbackType === 'QUICK_GAME' || activeScheme === 'ZERO_BLITZ'
        ? 1.40
        : 1.65;

    // Designed Run Mesh Handoff
    if (isDesignedRun && ballState === 'HELD' && t >= 0.35) {
      const rbIdx =
        offAgents.findIndex((a) => a.role === 'BALL_CARRIER') !== -1
          ? offAgents.findIndex((a) => a.role === 'BALL_CARRIER')
          : offAgents.findIndex((a) => a.id === 'RB');
      if (rbIdx !== -1) {
        carrierOffIdx = rbIdx;
        ballState = 'CAUGHT';
        ballPos = { ...offAgents[rbIdx].pos };
        catchSpotY = ballPos.y;
        airYardsOnPlay = 0;
        timeToThrow = 0.35;
      }
    }

    if (!isDesignedRun && ballState === 'HELD' && t >= minDropbackTime && readProgressionIndices.length > 0) {
      // 5A. Scramble Lane Openness Evaluation
      let laneObstruction = 0;
      let spyThreat = 0;
      const corridorLeft = qb.pos.x - 4.2;
      const corridorRight = qb.pos.x + 4.2;

      for (const def of defAgents) {
        const inCorridorX = def.pos.x >= corridorLeft && def.pos.x <= corridorRight;
        const inCorridorY = def.pos.y > qb.pos.y && def.pos.y < qb.pos.y + 8.5;
        const d = Math.hypot(def.pos.x - qb.pos.x, def.pos.y - qb.pos.y);

        if (def.assignType === 'SPY') {
          spyThreat = Math.max(spyThreat, Math.max(0, 1.0 - d / 9.0));
          if (inCorridorX && inCorridorY) {
            laneObstruction += 2.8 / Math.max(0.7, d);
          }
        } else if (def.assignType === 'RUSH') {
          if (def.engagedWith === null && inCorridorX && inCorridorY) {
            laneObstruction += 2.0 / Math.max(0.7, d);
          } else if (def.engagedWith !== null && inCorridorX && inCorridorY) {
            laneObstruction += 0.55 / Math.max(0.7, d);
          }
        } else if (inCorridorX && inCorridorY) {
          laneObstruction += 1.20 / Math.max(0.7, d);
        }
      }

      const boxCountFactor =
        preSnapTell.boxCount <= 5 ? 1.18 : preSnapTell.boxCount >= 8 ? 0.72 : 1.0;
      const rawLaneOpenness = Math.max(
        0,
        Math.min(1.0, (1.0 - laneObstruction * 0.30) * boxCountFactor)
      );
      const scrambleLaneOpenness = Math.round(rawLaneOpenness * 100) / 100;

      const qbMobility = Math.pow(qb.ratings.spd / 100, 1.45) * (qb.ratings.acc / 100);
      const scrambleUtility = Math.max(
        0,
        Math.min(
          1.2,
          qbMobility *
            scrambleLaneOpenness *
            (1.0 - 0.80 * spyThreat) *
            (0.40 + 0.55 * riskTolerance) *
            (0.70 + 0.55 * pocketPressure)
        )
      );

      // Project exact receiver arrival coordinate along their anisotropic route trajectory over flightTime
      const computeReceiverLeadPos = (rec: AgentRuntime, flightTime: number): Vec2 => {
        const simSteps = Math.max(2, Math.min(8, Math.ceil(flightTime / 0.08)));
        const simDt = flightTime / simSteps;
        const ghost: AgentRuntime = {
          ...rec,
          pos: { x: rec.pos.x, y: rec.pos.y },
          vel: { x: rec.vel.x, y: rec.vel.y },
          wpIndex: rec.wpIndex,
          stunTimer: 0,
        };
        for (let s = 0; s < simSteps; s++) {
          if (ghost.waypoints.length > 0) {
            const wp = ghost.waypoints[ghost.wpIndex];
            const dWp = Math.hypot(wp.x - ghost.pos.x, wp.y - ghost.pos.y);
            if (dWp < 0.95 && ghost.wpIndex + 1 < ghost.waypoints.length) {
              ghost.wpIndex++;
            }
            const activeWp = ghost.waypoints[ghost.wpIndex];
            const nextWp =
              ghost.wpIndex + 1 < ghost.waypoints.length ? ghost.waypoints[ghost.wpIndex + 1] : null;
            stepAnisotropicAgent(ghost, activeWp, nextWp, simDt, 1.0, maxFieldY);
          } else {
            stepAnisotropicAgent(
              ghost,
              { x: ghost.pos.x + ghost.vel.x * simDt, y: ghost.pos.y + ghost.vel.y * simDt },
              null,
              simDt,
              1.0,
              maxFieldY
            );
          }
        }
        return {
          x: Math.max(-25.0, Math.min(25.0, ghost.pos.x)),
          y: Math.min(maxFieldY - 0.5, ghost.pos.y),
        };
      };

      // 5B. Evaluate Every Read in the Progression Tree
      const readEvals: QbReadEvaluation[] = [];

      for (let slot = 0; slot < readProgressionIndices.length; slot++) {
        const rIdx = readProgressionIndices[slot];
        const rec = offAgents[rIdx];

        const throwDist = Math.hypot(rec.pos.x - qb.pos.x, rec.pos.y - qb.pos.y);

        // Pre-scan passing corridor to detect if an underneath defender forces a lofted touch trajectory
        let hasUnderneathObstacle = false;
        const qbToRecX = rec.pos.x - qb.pos.x;
        const qbToRecY = rec.pos.y - qb.pos.y;
        const throwLenSq = qbToRecX * qbToRecX + qbToRecY * qbToRecY;
        if (throwLenSq > 4.0) {
          for (const d of defAgents) {
            if (d.assignType === 'RUSH') continue;
            const proj = ((d.pos.x - qb.pos.x) * qbToRecX + (d.pos.y - qb.pos.y) * qbToRecY) / throwLenSq;
            if (proj > 0.18 && proj < 0.82) {
              const lx = qb.pos.x + proj * qbToRecX;
              const ly = qb.pos.y + proj * qbToRecY;
              if (Math.hypot(d.pos.x - lx, d.pos.y - ly) < 1.85) {
                hasUnderneathObstacle = true;
                break;
              }
            }
          }
        }

        const isSidelineHoleShot = rec.pos.y > 14.0 && Math.abs(rec.pos.x) > 13.0;
        const trajSpec = computeBallTrajectory(
          qb.pos,
          rec.pos,
          qb.ratings.thp,
          hasUnderneathObstacle,
          isSidelineHoleShot
        );
        const flightTime = trajSpec.flightTime;

        const leadPos = computeReceiverLeadPos(rec, flightTime);

        const distFromFirstWp =
          rec.waypoints.length > 0
            ? Math.hypot(rec.pos.x - rec.waypoints[0].x, rec.pos.y - rec.waypoints[0].y)
            : 0;
        const isQuickRoute = rec.waypoints.length > 0 && rec.waypoints[0].y <= 4.5;
        const minPostBreakDist = isQuickRoute ? 0.65 : 1.25;

        let routePhase: QbReadEvaluation['routePhase'] = 'BREAK_WINDOW';
        if (t > 3.20) {
          routePhase = 'SCRAMBLE_DRILL';
        } else if (
          rec.waypoints.length > 1 &&
          (rec.wpIndex === 0 || distFromFirstWp < minPostBreakDist)
        ) {
          routePhase = 'STEM';
        } else if (
          rec.wpIndex >= rec.waypoints.length - 1 &&
          rec.waypoints.length > 0 &&
          Math.hypot(
            rec.waypoints[rec.waypoints.length - 1].x - rec.pos.x,
            rec.waypoints[rec.waypoints.length - 1].y - rec.pos.y
          ) < 1.5
        ) {
          routePhase = 'SETTLED';
        }

        let minDefSep = 99;
        let laneCongestion = 0;

        for (const def of defAgents) {
          if (def.assignType === 'RUSH') continue;

          let sepAtArrival: number;
          if (def.assignType === 'MAN' && def.manTargetIdx === rIdx) {
            // Man defender mirrors receiver through the route break, lagging by cutReactionTimer and skill differential
            const curSep = Math.hypot(rec.pos.x - def.pos.x, rec.pos.y - def.pos.y);
            const routeSkill = rec.pos.y > 10 ? rec.ratings.rr_med : rec.ratings.rr_short;
            const skillEdge = (routeSkill - def.ratings.cov_man) * 0.025;
            const cutBonus = def.cutReactionTimer > 0 ? def.cutReactionTimer * 5.0 : 0;
            const speedEdge = (rec.ratings.spd - def.ratings.spd) * 0.024 * flightTime;
            sepAtArrival = Math.max(0.28, curSep * 0.91 + cutBonus + skillEdge + speedEdge);
          } else {
            // Zone defender continues on current trajectory during reaction delay, then closes toward leadPos
            const reactDelay = 0.22;
            const driftT = Math.min(flightTime, reactDelay);
            const closeT = Math.max(0, flightTime - reactDelay);
            const driftX = def.pos.x + def.vel.x * driftT;
            const driftY = def.pos.y + def.vel.y * driftT;
            const distAfterDrift = Math.hypot(leadPos.x - driftX, leadPos.y - driftY);
            const defCloseSpeed = getMaxSpeedYdsPerSec(def.ratings.spd) * 0.92;
            sepAtArrival = Math.max(0.20, distAfterDrift - defCloseSpeed * closeT);
          }
          if (sepAtArrival < minDefSep) minDefSep = sepAtArrival;

          const qbToRecX = leadPos.x - qb.pos.x;
          const qbToRecY = leadPos.y - qb.pos.y;
          const segLenSq = qbToRecX * qbToRecX + qbToRecY * qbToRecY;
          const proj =
            segLenSq > 0.1
              ? ((def.pos.x - qb.pos.x) * qbToRecX + (def.pos.y - qb.pos.y) * qbToRecY) / segLenSq
              : 0;
          if (proj > 0.18 && proj < 0.85 && throwDist < 22.0) {
            const lineX = qb.pos.x + proj * qbToRecX;
            const lineY = qb.pos.y + proj * qbToRecY;
            if (Math.hypot(def.pos.x - lineX, def.pos.y - lineY) < 1.72) {
              laneCongestion += 0.65;
            }
          }
        }

        const rawSep = Math.max(0, minDefSep - 0.54);
        const sepNorm = Math.min(1.0, rawSep / 2.12);
        const citFactor = 0.82 + 0.18 * (rec.ratings.catch_traffic / 100);
        const congPenalty = Math.min(0.75, laneCongestion * 0.43);
        const isBlitzHotOutlet =
          isBlitzCall &&
          hasUnblockedThreat &&
          (rec.waypoints.length <= 1 || rec.waypoints[0].y <= 6.5 || slot === 1);
        const stemPenalty = routePhase === 'STEM' ? (isBlitzHotOutlet ? 0.85 : 0.14) : 1.0;
        const blitzHotBonus = isBlitzHotOutlet ? 0.22 : 0.0;
        const openness = Math.max(
          0,
          Math.min(
            1.0,
            sepNorm * (1.0 - congPenalty) * citFactor * stemPenalty +
              blitzHotBonus +
              (readPerceptionOffsets[rIdx] || 0)
          )
        );

        const airDistPenalty = Math.max(0, (throwDist - 6.0) * 0.014);
        const compProb = Math.max(
          0.14,
          Math.min(0.90, 0.28 + 0.58 * openness - airDistPenalty - 0.08 * pocketPressure)
        );

        // Underneath throws behind/near LOS must run into underneath zone defenders ahead of them
        const yacDepthScale = leadPos.y < 2.5 ? 0.36 : leadPos.y < 5.0 ? 0.60 : 0.82;
        const expectedYac = Math.min(
          4.5,
          Math.max(0.2, (minDefSep - 1.0) * yacDepthScale * (rec.ratings.spd / 90))
        );
        const estTotalYards = Math.round((leadPos.y + expectedYac) * 10) / 10;
        const epaIfComp = evaluateSnapEPA(situation, 'COMPLETE', estTotalYards).epa;
        const epaIfInc = evaluateSnapEPA(situation, 'INCOMPLETE', 0).epa;
        const intRisk = Math.max(0.008, (1.0 - openness) * 0.038 * (1.0 + 0.30 * laneCongestion));
        const expectedEpaIfThrown =
          compProb * epaIfComp + (1 - compProb - intRisk) * epaIfInc + intRisk * -3.8;

        const isCurrentSlot = slot === currentReadSlot;
        const attentionWeight =
          isCurrentSlot ? 1.0 : slot === currentReadSlot + 1 ? 0.72 : slot < currentReadSlot ? 0.60 : 0.48;

        const convertsSticks = estTotalYards >= situation.distance;
        const sticksMod =
          situation.down >= 3
            ? convertsSticks
              ? 0.35
              : t < 2.35 && pocketPressure < 0.45
              ? -0.25
              : 0.05
            : 0.0;

        // Prevent premature checkdowns before primary/secondary progression has developed
        const isCheckdownRoute = rec.readOrder >= 4 && leadPos.y < 4.0;
        const minCheckdownTime =
          dropbackType === 'PLAY_ACTION' ? 2.75 : dropbackType === 'STANDARD_DROP' ? 2.45 : 1.95;
        const earlyCheckdownPenalty =
          isCheckdownRoute && t < minCheckdownTime && !hasUnblockedThreat && pocketPressure < 0.52
            ? -0.55
            : 0.0;

        const riskMod = (openness - (0.52 - 0.30 * riskTolerance)) * 0.85;
        const utility =
          Math.round(
            (attentionWeight *
              (0.52 * openness + 0.26 * expectedEpaIfThrown + riskMod + sticksMod + earlyCheckdownPenalty)) *
              100
          ) / 100;

        readEvals.push({
          slot,
          readOrder: rec.readOrder,
          receiverId: rec.id,
          receiverName: rec.name,
          routePhase,
          separation: Math.round(minDefSep * 10) / 10,
          openness: Math.round(openness * 100) / 100,
          compProb: Math.round(compProb * 100) / 100,
          expectedEpaIfThrown: Math.round(expectedEpaIfThrown * 100) / 100,
          utility,
          isPrimaryLook: isCurrentSlot,
        });
      }

      const activeSpy = defAgents.find((d) => d.assignType === 'SPY');
      const activeEval = readEvals[currentReadSlot] || readEvals[0];

      lastDecisionTelemetry = {
        riskTolerance,
        dropbackType,
        currentReadSlot,
        readEvaluations: readEvals,
        scrambleLaneOpenness,
        scrambleUtility: Math.round(scrambleUtility * 100) / 100,
        spyActive: !!activeSpy,
        spyDefenderName: activeSpy ? activeSpy.name : null,
        decisionType: 'PENDING',
        chosenTargetName: activeEval.receiverName,
      };

      // 5C. SEQUENTIAL QB PROGRESSION & HOT-READ LOGIC:
      const qbProcessNorm = (qb.ratings.qb_read_speed - 50) / 49;
      const dropbackDwellMod =
        dropbackType === 'PLAY_ACTION' ? 0.28 : dropbackType === 'STANDARD_DROP' ? 0.18 : 0.0;
      const slotDwellBase =
        currentReadSlot === 0
          ? 0.42 + dropbackDwellMod
          : currentReadSlot === 1
          ? 0.32 + dropbackDwellMod * 0.5
          : 0.22;
      const baseDwell = Math.max(0.20, slotDwellBase - 0.07 * qbProcessNorm - preSnapTell.qbInfoBonus);

      // Hold eyes on Read #1 while stem develops; dynamically calculate stem break window from route geometry & dropback
      const rec1 = offAgents[readProgressionIndices[0]];
      const stem1Y = rec1 && rec1.waypoints.length > 0 ? rec1.waypoints[0].y : 5.0;
      const maxStemWait =
        dropbackType === 'PLAY_ACTION'
          ? Math.max(2.15, Math.min(2.55, 0.65 + stem1Y * 0.12))
          : dropbackType === 'STANDARD_DROP'
          ? Math.max(1.75, Math.min(2.25, 0.55 + stem1Y * 0.11))
          : Math.max(1.25, Math.min(1.55, 0.45 + stem1Y * 0.10));

      const waitingForStemBreak =
        currentReadSlot === 0 &&
        activeEval.routePhase === 'STEM' &&
        t < maxStemWait &&
        !(isBlitzCall && hasUnblockedThreat) &&
        pocketPressure < 0.65;

      if (!waitingForStemBreak) {
        readDwellTimer += dt;
      } else {
        readDwellTimer = Math.min(0.08, readDwellTimer + dt * 0.25);
      }

      // Required openness threshold for the active read
      const reqOpenness = Math.max(
        0.32,
        0.545 - 0.21 * riskTolerance - 0.038 * currentReadSlot - 0.025 * pocketPressure
      );

      let chosenSlot = currentReadSlot;
      let chosenEval = activeEval;

      // Sight-Adjust Hot Read ONLY when blitzed with an unblocked threat, OR late-down scramble drill scan after t > 2.48s
      if (isBlitzCall && hasUnblockedThreat) {
        for (const ev of readEvals) {
          if (ev.openness >= 0.36 && ev.utility > chosenEval.utility + 0.03) {
            chosenSlot = ev.slot;
            chosenEval = ev;
          }
        }
      } else if (
        t > 2.48 &&
        currentReadSlot >= readProgressionIndices.length - 2 &&
        activeEval.openness < reqOpenness
      ) {
        for (const ev of readEvals) {
          if (ev.openness >= 0.24 && ev.utility > chosenEval.utility + 0.02) {
            chosenSlot = ev.slot;
            chosenEval = ev;
          }
        }
      }

      // Check if an unblocked rusher is already in the QB's throwing motion (within 2.35 yards closing fast)
      const rusherDisruptingRelease = defAgents.some(
        (d) =>
          d.assignType === 'RUSH' &&
          d.engagedWith === null &&
          Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) < 2.35
      );

      // Calibrated NFL Scramble Trigger (dt-scaled Poisson hazard rate -> ~6-10% for mobile QBs, ~1-2.5% for pocket passers)
      const mobileFactor = Math.max(0.12, Math.pow(Math.max(0, qb.ratings.spd - 60) / 36, 1.4));
      const spyPenalty = activeSpy ? 0.30 : 1.0;
      const flushScramble =
        t >= 1.95 &&
        !rusherDisruptingRelease &&
        pocketPressure >= 0.40 &&
        (chosenEval.openness < reqOpenness + 0.05 || chosenEval.slot >= 2) &&
        scrambleLaneOpenness >= 0.35 &&
        rng.next() < 0.48 * mobileFactor * spyPenalty * dt;
      const coverageScramble =
        t >= 2.25 &&
        !rusherDisruptingRelease &&
        currentReadSlot >= 1 &&
        (chosenEval.openness < reqOpenness || chosenEval.slot >= 3) &&
        scrambleLaneOpenness >= 0.38 &&
        rng.next() < 0.38 * mobileFactor * spyPenalty * dt;

      // 1. SCRAMBLE DECISION
      if (flushScramble || coverageScramble) {
        ballState = 'CAUGHT';
        carrierOffIdx = 0;
        timeToThrow = t;
        isScramble = true;
        lastDecisionTelemetry.decisionType = 'SCRAMBLE';
        lastDecisionTelemetry.chosenTargetName = `${qb.name} (Scramble Run)`;
        commentary = `[QB SCRAMBLE at t=${t.toFixed(2)}s] ${qb.name} tucked the ball and escaped the pocket (${Math.round(scrambleLaneOpenness * 100)}% lane openness)!`;
      }
      // 2. THROW DECISION
      else if (
        (!rusherDisruptingRelease || chosenEval.openness >= reqOpenness + 0.14) &&
        ((!waitingForStemBreak &&
          chosenEval.routePhase !== 'STEM' &&
          readDwellTimer >= (currentReadSlot === 0 ? 0.20 : 0.12) &&
          chosenEval.openness >= reqOpenness &&
          (situation.down < 3 || chosenEval.expectedEpaIfThrown > -0.45 || t > 2.45 || pocketPressure > 0.45)) ||
          (isBlitzCall && hasUnblockedThreat && t >= 1.25 && chosenEval.openness >= 0.36) ||
          (currentReadSlot >= readProgressionIndices.length - 1 && t > 2.55 && chosenEval.openness >= 0.22))
      ) {
        currentReadSlot = chosenSlot;
        const targetRec = offAgents[readProgressionIndices[currentReadSlot]];
        const throwDist = Math.hypot(targetRec.pos.x - qb.pos.x, targetRec.pos.y - qb.pos.y);
        const isDeepPass = throwDist > 18.0;
        const isMedPass = throwDist >= 10.0 && throwDist <= 18.0;

        // Detect underneath defender obstacle for actual throw trajectory
        let hasUnderneathObstacle = false;
        const qbToTargetX = targetRec.pos.x - qb.pos.x;
        const qbToTargetY = targetRec.pos.y - qb.pos.y;
        const throwLenSq = qbToTargetX * qbToTargetX + qbToTargetY * qbToTargetY;
        if (throwLenSq > 4.0) {
          for (const d of defAgents) {
            if (d.assignType === 'RUSH') continue;
            const proj = ((d.pos.x - qb.pos.x) * qbToTargetX + (d.pos.y - qb.pos.y) * qbToTargetY) / throwLenSq;
            if (proj > 0.18 && proj < 0.82) {
              const lx = qb.pos.x + proj * qbToTargetX;
              const ly = qb.pos.y + proj * qbToTargetY;
              if (Math.hypot(d.pos.x - lx, d.pos.y - ly) < 1.85) {
                hasUnderneathObstacle = true;
                break;
              }
            }
          }
        }

        const isSidelineHoleShot = targetRec.pos.y > 14.0 && Math.abs(targetRec.pos.x) > 13.0;
        const traj = computeBallTrajectory(
          qb.pos,
          targetRec.pos,
          qb.ratings.thp,
          hasUnderneathObstacle,
          isSidelineHoleShot
        );
        currentThrowTrajectory = traj;
        const flightTime = traj.flightTime;

        const leadPos = computeReceiverLeadPos(targetRec, flightTime);
        ballIntendedLeadPos = { ...leadPos };

        const accRating = isDeepPass
          ? qb.ratings.tha_deep
          : isMedPass
          ? qb.ratings.tha_med
          : qb.ratings.tha_short;
        const accNorm = Math.max(0, Math.min(1, (accRating - 50) / 49));
        const pressurePenalty = Math.max(0, pocketPressure * (1.15 - qb.ratings.tup_pressure / 100));
        const airScatter = Math.max(0, (throwDist - 7.5) * 0.048);
        const scatterSigma = 0.42 + 0.62 * (1 - accNorm) + 0.44 * pressurePenalty + airScatter;

        ballTargetPos = {
          x: Math.max(-25.5, Math.min(25.5, leadPos.x + rng.gaussian() * scatterSigma)),
          y: Math.min(maxFieldY - 0.3, leadPos.y + rng.gaussian() * scatterSigma),
        };

        flightTimer = Math.max(0.18, flightTime);
        totalFlightTime = flightTimer;
        currentBallZ = 2.1;
        ballVel = {
          x: (ballTargetPos.x - qb.pos.x) / flightTimer,
          y: (ballTargetPos.y - qb.pos.y) / flightTimer,
        };
        ballState = 'IN_FLIGHT';
        targetedOffIdx = readProgressionIndices[currentReadSlot];
        timeToThrow = t;
        airYardsOnPlay = Math.round(ballTargetPos.y * 10) / 10;
        pressureAtRelease = pocketPressure;

        for (const def of defAgents) {
          if (def.assignType === 'RUSH') continue;
          const distToTarget = Math.hypot(def.pos.x - ballTargetPos.x, def.pos.y - ballTargetPos.y);
          if (def.assignType === 'MAN') {
            const manAwareness = (def.ratings.cov_man - 50) / 49;
            def.ballBreakDelay = Math.max(0.06, totalFlightTime * (0.34 - 0.14 * manAwareness));
          } else {
            const zoneIq = (0.6 * def.ratings.cov_zone + 0.4 * def.ratings.play_rec - 50) / 49;
            const sectorDelay = distToTarget > 12.0 ? 0.06 : 0.0;
            def.ballBreakDelay = Math.max(0.05, 0.12 - 0.06 * zoneIq + sectorDelay);
          }
        }

        lastDecisionTelemetry.decisionType = 'THROW';
        lastDecisionTelemetry.chosenTargetName = `${targetRec.name} (Read #${targetRec.readOrder})`;
      }
      // 3. THROWAWAY TO AVOID SACK OR COVERAGE SACK (~2% of dropbacks)
      else if (
        (pocketPressure > 0.85 && t > 2.65 && chosenEval.openness < 0.18 && rng.next() < 0.35 * dt) ||
        (t > 3.20 && currentReadSlot >= readProgressionIndices.length - 1 && chosenEval.openness < 0.18)
      ) {
        ballState = 'DEAD';
        const evalRes = evaluateSnapEPA(situation, 'INCOMPLETE', 0);
        lastDecisionTelemetry.decisionType = 'THROWAWAY';
        lastDecisionTelemetry.chosenTargetName = 'Out of Bounds (Throwaway)';
        commentary = `[THROWAWAY at t=${t.toFixed(2)}s] ${qb.name} threw the ball away with coverage blanketed (${evalRes.epa.toFixed(2)} EPA).`;
        if (recordSnapshots) {
          snapshots.push(
            captureSnapshot(
              tick,
              t,
              currentReadSlot + 1,
              pocketPressure,
              ballState,
              ballPos,
              ballTargetPos,
              null,
              null,
              offAgents,
              defAgents,
              false,
              activeScheme,
              resolvedStunt,
              matchCoverage
            )
          );
        }
        return wrapResult({
          outcome: 'INCOMPLETE',
          yardsGained: 0,
          airYards: 0,
          yacYards: 0,
          epa: evalRes.epa,
          goalSuccess: false,
          epaSuccess: evalRes.epaSuccess,
          timeToThrow: t,
          wasPressured: wasPressuredOnPlay,
          targetedPlayerId: null,
          targetedReadOrder: 0,
          catchPos: null,
          brokenTackles: 0,
          lateralsAttempted: 0,
          lateralsCompleted: 0,
          preSnapTell,
          commentary,
          snapshots,
          isScramble: false,
          scrambleYards: 0,
          qbDecisionTelemetry: lastDecisionTelemetry,
        });
      }
      // 4. PROGRESS TO NEXT READ
      else if (
        !waitingForStemBreak &&
        readDwellTimer >= (currentReadSlot === 0 ? baseDwell + 0.04 : baseDwell) &&
        currentReadSlot < readProgressionIndices.length - 1
      ) {
        currentReadSlot++;
        readDwellTimer = 0;
      }
    }

    // ------------------------------------------------------------------------
    // 6. BALL FLIGHT & NGS-CALIBRATED CATCH / PBU / INTERCEPTION RESOLUTION
    // ------------------------------------------------------------------------
    if (ballState === 'IN_FLIGHT' && targetedOffIdx !== null) {
      ballPos.x += ballVel.x * dt;
      ballPos.y += ballVel.y * dt;
      flightTimer -= dt;

      // Dynamic 3D elevation tracking
      const tElapsed = Math.max(0, totalFlightTime - flightTimer);
      if (currentThrowTrajectory) {
        const rawZ = 2.1 + currentThrowTrajectory.vz * tElapsed - 0.5 * 10.725 * tElapsed * tElapsed;
        currentBallZ = Math.max(1.6, rawZ);
      } else {
        currentBallZ = 2.0;
      }

      // 6A. Underneath Defender Pass Deflection / Swat Check
      // Evaluated only while the ball is mid-flight (not right at QB release or arrival)
      if (tElapsed > 0.16 && flightTimer > 0.12) {
        for (const def of defAgents) {
          if (def.assignType === 'RUSH') continue;
          const hDist = Math.hypot(def.pos.x - ballPos.x, def.pos.y - ballPos.y);
          if (hDist < 1.05) {
            // Deflection only occurs if ball is at or below maximum vertical leaping reach (~3.0y / 9.0 ft)
            if (currentBallZ <= 3.0) {
              const defAgi = (def.ratings.agi - 50) / 49;
              const defPr = (def.ratings.play_rec - 50) / 49;
              const batProb = 0.06 + 0.12 * Math.max(0, 0.5 * defAgi + 0.5 * defPr);
              if (rng.next() < batProb * dt * 7.5) {
                ballState = 'DEAD';
                currentBallZ = 0.0;
                const evalRes = evaluateSnapEPA(situation, 'INCOMPLETE', 0);
                commentary = `[PASS BATTED DOWN at t=${t.toFixed(2)}s] Low trajectory pass (${currentBallZ.toFixed(1)}y height) batted down underneath by ${def.name} (${def.label})!`;
                if (recordSnapshots) {
                  snapshots.push(
                    captureSnapshot(
                      tick,
                      t,
                      offAgents[targetedOffIdx].readOrder,
                      pocketPressure,
                      ballState,
                      ballPos,
                      ballTargetPos,
                      null,
                      null,
                      offAgents,
                      defAgents,
                      false,
                      activeScheme,
                      resolvedStunt,
                      matchCoverage,
                      currentBallZ
                    )
                  );
                }
                return wrapResult({
                  outcome: 'INCOMPLETE',
                  yardsGained: 0,
                  airYards: airYardsOnPlay,
                  yacYards: 0,
                  epa: evalRes.epa,
                  goalSuccess: false,
                  epaSuccess: evalRes.epaSuccess,
                  timeToThrow,
                  wasPressured: wasPressuredOnPlay,
                  targetedPlayerId: offAgents[targetedOffIdx].id,
                  targetedReadOrder: offAgents[targetedOffIdx].readOrder,
                  catchPos: null,
                  brokenTackles: 0,
                  lateralsAttempted: 0,
                  lateralsCompleted: 0,
                  preSnapTell,
                  commentary,
                  snapshots,
                  isScramble: false,
                  scrambleYards: 0,
                  qbDecisionTelemetry: lastDecisionTelemetry,
                });
              }
            }
          }
        }
      }

      if (flightTimer <= 0) {
        currentBallZ = 1.6;
        const rec = offAgents[targetedOffIdx];
        const recDistToBall = Math.hypot(rec.pos.x - ballTargetPos.x, rec.pos.y - ballTargetPos.y);

        let closestDef: AgentRuntime = defAgents[4];
        let minDefDist = 99;
        for (const def of defAgents) {
          if (def.assignType === 'RUSH') continue;
          const d = Math.hypot(def.pos.x - ballTargetPos.x, def.pos.y - ballTargetPos.y);
          if (d < minDefDist) {
            minDefDist = d;
            closestDef = def;
          }
        }

        // 6A. Calibrated NFL Interception Check (Empirical NFL INT rate: ~1.8% - 2.5% per pass)
        if (minDefDist < 1.05 && minDefDist <= recDistToBall + 0.18) {
          const hawkSkill = (0.6 * closestDef.ratings.ball_hawk + 0.4 * closestDef.ratings.catch_contest) / 100;
          const recProtect = (0.6 * rec.ratings.catch_traffic + 0.4 * rec.ratings.str) / 100;
          const pressureErr = Math.min(0.030, pressureAtRelease * 0.015);
          const riskErr = Math.max(0, (riskTolerance - 0.50) * 0.025);
          const isUndercut = minDefDist < recDistToBall - 0.20;
          const loftRisk =
            currentThrowTrajectory?.passType === 'HIGH_LOFT_DEEP' && isUndercut
              ? 0.075 * (1.0 - (qb.ratings.thp - 50) / 49)
              : 0.0;
          const maxIntCap = isUndercut ? 0.16 : 0.052;
          const intProb = Math.max(
            0.008,
            Math.min(maxIntCap, 0.014 + 0.040 * (hawkSkill - recProtect * 0.74) + pressureErr + riskErr + loftRisk)
          );

          if (rng.next() < intProb) {
            ballState = 'DEAD';
            const intYards = Math.round(ballTargetPos.y * 10) / 10;
            const evalRes = evaluateSnapEPA(situation, 'INTERCEPTION', intYards);
            commentary = `[INTERCEPTION at t=${t.toFixed(2)}s] Pass intended for ${rec.name} (Read #${rec.readOrder}) intercepted by ${closestDef.name} (${closestDef.label}) at ${intYards >= 0 ? '+' : ''}${intYards.toFixed(1)} yds (${evalRes.epa.toFixed(2)} EPA).`;
            if (recordSnapshots) {
              snapshots.push(
                captureSnapshot(
                  tick,
                  t,
                  rec.readOrder,
                  pocketPressure,
                  ballState,
                  ballPos,
                  ballTargetPos,
                  null,
                  null,
                  offAgents,
                  defAgents,
                  false,
                  activeScheme,
                  resolvedStunt,
                  matchCoverage
                )
              );
            }
            return wrapResult({
              outcome: 'INTERCEPTION',
              yardsGained: intYards,
              airYards: airYardsOnPlay,
              yacYards: 0,
              epa: evalRes.epa,
              goalSuccess: false,
              epaSuccess: false,
              timeToThrow,
              wasPressured: wasPressuredOnPlay,
              targetedPlayerId: rec.id,
              targetedReadOrder: rec.readOrder,
              catchPos: { ...ballTargetPos },
              brokenTackles: 0,
              lateralsAttempted: 0,
              lateralsCompleted: 0,
              preSnapTell,
              commentary,
              snapshots,
              isScramble: false,
              scrambleYards: 0,
              qbDecisionTelemetry: lastDecisionTelemetry,
            });
          }
        }

        // 6B. Catch Radius & Contested Catch vs PBU Resolution
        const catchRadiusYds = 1.92 + (rec.ratings.catch_radius - 75) * 0.018;
        const withinRadius = recDistToBall <= catchRadiusYds;

        if (withinRadius) {
          const handsNorm = (rec.ratings.catch_hands - 60) / 39;
          let catchProbability = Math.min(
            0.85,
            0.78 + 0.07 * handsNorm - Math.max(0, airYardsOnPlay - 6.0) * 0.005 - pressureAtRelease * 0.040
          );

          if (minDefDist < 1.85) {
            const receiverContest =
              0.50 * rec.ratings.catch_traffic +
              0.30 * rec.ratings.catch_hands +
              0.20 * rec.ratings.str;
            const defenderDisrupt =
              0.45 * closestDef.ratings.catch_contest +
              0.30 * closestDef.ratings.cov_man +
              0.25 * closestDef.ratings.tak_hit_power;
            const sepAdvantage = (minDefDist - 1.0) * 20.0;
            // If defender undercut or beat receiver to the spot on a hanging lofted throw
            const undercutPenalty =
              minDefDist < recDistToBall && currentThrowTrajectory?.passType === 'HIGH_LOFT_DEEP'
                ? (recDistToBall - minDefDist) * 22.0
                : 0.0;
            const contestMargin = receiverContest - defenderDisrupt + sepAdvantage - undercutPenalty - pressureAtRelease * 3.0;
            const contestedCatchProb = 1 / (1 + Math.exp(-0.065 * contestMargin));
            catchProbability = Math.min(catchProbability, contestedCatchProb);
          }

          if (rng.next() <= catchProbability) {
            ballState = 'CAUGHT';
            carrierOffIdx = targetedOffIdx;
            rec.pos.x = ballTargetPos.x;
            rec.pos.y = ballTargetPos.y;
            catchSpotY = ballTargetPos.y;
          } else {
            ballState = 'DEAD';
            const evalRes = evaluateSnapEPA(situation, 'INCOMPLETE', 0);
            const reason =
              minDefDist < 1.85
                ? `broken up in tight coverage by ${closestDef.name} (${closestDef.label})`
                : `incomplete off the fingertips of ${rec.name}`;
            commentary = `[INCOMPLETE at t=${t.toFixed(2)}s] Pass to ${rec.name} (Read #${rec.readOrder}, ${airYardsOnPlay >= 0 ? '+' : ''}${airYardsOnPlay.toFixed(1)} air yds) ${reason} (${evalRes.epa.toFixed(2)} EPA).`;
            if (recordSnapshots) {
              snapshots.push(
                captureSnapshot(
                  tick,
                  t,
                  rec.readOrder,
                  pocketPressure,
                  ballState,
                  ballPos,
                  ballTargetPos,
                  null,
                  null,
                  offAgents,
                  defAgents,
                  false,
                  activeScheme,
                  resolvedStunt,
                  matchCoverage
                )
              );
            }
            return wrapResult({
              outcome: 'INCOMPLETE',
              yardsGained: 0,
              airYards: airYardsOnPlay,
              yacYards: 0,
              epa: evalRes.epa,
              goalSuccess: false,
              epaSuccess: evalRes.epaSuccess,
              timeToThrow,
              wasPressured: wasPressuredOnPlay,
              targetedPlayerId: rec.id,
              targetedReadOrder: rec.readOrder,
              catchPos: { ...ballTargetPos },
              brokenTackles: 0,
              lateralsAttempted: 0,
              lateralsCompleted: 0,
              preSnapTell,
              commentary,
              snapshots,
              isScramble: false,
              scrambleYards: 0,
              qbDecisionTelemetry: lastDecisionTelemetry,
            });
          }
        } else {
          ballState = 'DEAD';
          const evalRes = evaluateSnapEPA(situation, 'INCOMPLETE', 0);
          commentary = `[INCOMPLETE at t=${t.toFixed(2)}s] Pass to ${rec.name} (Read #${rec.readOrder}) off-target outside catch radius (${evalRes.epa.toFixed(2)} EPA).`;
          if (recordSnapshots) {
            snapshots.push(
              captureSnapshot(
                tick,
                t,
                rec.readOrder,
                pocketPressure,
                ballState,
                ballPos,
                ballTargetPos,
                null,
                null,
                offAgents,
                defAgents,
                false,
                activeScheme,
                resolvedStunt,
                matchCoverage
              )
            );
          }
          return wrapResult({
            outcome: 'INCOMPLETE',
            yardsGained: 0,
            airYards: airYardsOnPlay,
            yacYards: 0,
            epa: evalRes.epa,
            goalSuccess: false,
            epaSuccess: evalRes.epaSuccess,
            timeToThrow,
            wasPressured: wasPressuredOnPlay,
            targetedPlayerId: rec.id,
            targetedReadOrder: rec.readOrder,
            catchPos: { ...ballTargetPos },
            brokenTackles: 0,
            lateralsAttempted: 0,
            lateralsCompleted: 0,
            preSnapTell,
            commentary,
            snapshots,
            isScramble: false,
            scrambleYards: 0,
            qbDecisionTelemetry: lastDecisionTelemetry,
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // 7. DOWNFIELD LATERALS (Designed Hook & Lateral Pitch Package)
    // ------------------------------------------------------------------------
    if (ballState === 'LATERAL_FLIGHT' && pitcherOffIdx !== null && carrierOffIdx !== null) {
      ballPos.x += ballVel.x * dt;
      ballPos.y += ballVel.y * dt;
      flightTimer -= dt;

      if (flightTimer <= 0) {
        const trailer = offAgents[carrierOffIdx];
        const d = Math.hypot(trailer.pos.x - ballTargetPos.x, trailer.pos.y - ballTargetPos.y);

        if (d < 2.25) {
          ballState = 'CAUGHT';
          lateralsCompleted++;
          trailer.pos.x = ballTargetPos.x;
          trailer.pos.y = ballTargetPos.y;
        } else {
          ballState = 'DEAD';
          const evalRes = evaluateSnapEPA(situation, 'FUMBLE', Math.round(trailer.pos.y * 10) / 10);
          commentary = `[FUMBLE on Lateral at t=${t.toFixed(2)}s] Pitch to ${trailer.name} missed the mark! (${evalRes.epa.toFixed(2)} EPA).`;
          if (recordSnapshots) {
            snapshots.push(
              captureSnapshot(
                tick,
                t,
                0,
                pocketPressure,
                ballState,
                ballPos,
                ballTargetPos,
                null,
                null,
                offAgents,
                defAgents,
                false,
                activeScheme,
                resolvedStunt,
                matchCoverage
              )
            );
          }
          return wrapResult({
            outcome: 'FUMBLE',
            yardsGained: Math.round(trailer.pos.y * 10) / 10,
            airYards: airYardsOnPlay,
            yacYards: 0,
            epa: evalRes.epa,
            goalSuccess: false,
            epaSuccess: false,
            timeToThrow,
            wasPressured: wasPressuredOnPlay,
            targetedPlayerId: trailer.id,
            targetedReadOrder: trailer.readOrder,
            catchPos: { ...trailer.pos },
            brokenTackles,
            lateralsAttempted,
            lateralsCompleted,
            preSnapTell,
            commentary,
            snapshots,
            isScramble: false,
            scrambleYards: 0,
            qbDecisionTelemetry: lastDecisionTelemetry,
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // 8. OPEN-FIELD TACKLING, YAC, BALL SECURITY & LATERAL TRIGGER
    // ------------------------------------------------------------------------
    if (ballState === 'CAUGHT' && carrierOffIdx !== null) {
      const carrier = offAgents[carrierOffIdx];
      ballPos = { x: carrier.pos.x, y: carrier.pos.y };

      // Touchdown or Sideline Out of Bounds
      if (situation.yardline + carrier.pos.y >= 100 || Math.abs(carrier.pos.x) >= 25.6) {
        ballState = 'DEAD';
        const isRunByQb = carrierOffIdx === 0 || isScramble;
        const gain = Math.round(carrier.pos.y * 10) / 10;
        const yac = isRunByQb || isDesignedRun ? gain : Math.max(0, Math.round((gain - catchSpotY) * 10) / 10);
        const isTd = situation.yardline + carrier.pos.y >= 100;
        const outcomeType: PlayOutcome = isDesignedRun
          ? isTd
            ? 'RUN_TOUCHDOWN'
            : gain <= 0
            ? 'RUN_STUFF'
            : 'RUN_GAIN'
          : 'COMPLETE';
        const evalRes = evaluateSnapEPA(situation, outcomeType, gain);
        const tdTag = isTd ? 'TOUCHDOWN! ' : '';
        commentary = isDesignedRun
          ? `[${outcomeType} +${gain.toFixed(1)} yds] ${tdTag}${carrier.name} rushed to the perimeter (${brokenTackles} broken tackles | ${evalRes.epa >= 0 ? '+' : ''}${evalRes.epa.toFixed(2)} EPA).`
          : isRunByQb
          ? `[QB SCRAMBLE +${gain.toFixed(1)} yds] ${tdTag}${carrier.name} scrambled to the boundary (${brokenTackles} broken tackles | ${evalRes.epa >= 0 ? '+' : ''}${evalRes.epa.toFixed(2)} EPA).`
          : `[COMPLETE +${gain.toFixed(1)} yds (${airYardsOnPlay.toFixed(1)} air + ${yac.toFixed(1)} YAC)] ${tdTag}${carrier.name} pushed out of bounds (${brokenTackles} broken tackles | ${evalRes.epa >= 0 ? '+' : ''}${evalRes.epa.toFixed(2)} EPA).`;
        if (recordSnapshots) {
          snapshots.push(
            captureSnapshot(
              tick,
              t,
              carrier.readOrder,
              pocketPressure,
              ballState,
              ballPos,
              ballTargetPos,
              carrierOffIdx,
              null,
              offAgents,
              defAgents,
              isRunByQb,
              activeScheme,
              resolvedStunt,
              matchCoverage
            )
          );
        }
        return wrapResult({
          outcome: outcomeType,
          yardsGained: gain,
          airYards: isRunByQb || isDesignedRun ? 0 : airYardsOnPlay,
          yacYards: yac,
          epa: evalRes.epa,
          goalSuccess: evalRes.goalSuccess,
          epaSuccess: evalRes.epaSuccess,
          timeToThrow: isDesignedRun ? 0.35 : timeToThrow,
          wasPressured: isDesignedRun ? gain <= 0 : wasPressuredOnPlay,
          targetedPlayerId: carrier.id,
          targetedReadOrder: isDesignedRun ? 1 : carrier.readOrder,
          catchPos: { ...carrier.pos },
          brokenTackles,
          lateralsAttempted,
          lateralsCompleted,
          preSnapTell,
          commentary,
          snapshots,
          isScramble: isRunByQb && !isDesignedRun,
          scrambleYards: isRunByQb && !isDesignedRun ? gain : 0,
          qbDecisionTelemetry: lastDecisionTelemetry,
          isRunPlay: isDesignedRun,
        });
      }

      for (const def of defAgents) {
        if (def.stunTimer > 0) continue;
        const dx = carrier.pos.x - def.pos.x;
        const dy = carrier.pos.y - def.pos.y;
        const dist = Math.hypot(dx, dy);
        if (def.engagedWith !== null && dist > 0.45) continue;

        // Optional Downfield Lateral Pitch (only when explicitly enabled & trailer is uncovered!)
        if (
          dist < 1.55 &&
          allowLaterals &&
          lateralsAttempted === 0 &&
          carrier.ratings.lateral_vision >= 82
        ) {
          let bestTrailerIdx = -1;
          let bestTrailerDist = 99;

          for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
            if (oIdx === carrierOffIdx) continue;
            const tr = offAgents[oIdx];
            if (tr.role === 'OL' || tr.role === 'PASS_BLOCK') continue;
            const pitchDy = tr.pos.y - carrier.pos.y;
            const pitchDist = Math.hypot(tr.pos.x - carrier.pos.x, pitchDy);

            // Check that trailer has open grass (no defender within 3.2 yards of trailer)
            const trailerCovered = defAgents.some(
              (d) => Math.hypot(d.pos.x - tr.pos.x, d.pos.y - tr.pos.y) < 3.2
            );

            if (!trailerCovered && pitchDy <= -0.4 && pitchDist >= 2.2 && pitchDist <= 7.5) {
              if (pitchDist < bestTrailerDist) {
                bestTrailerDist = pitchDist;
                bestTrailerIdx = oIdx;
              }
            }
          }

          if (bestTrailerIdx !== -1 && rng.next() < 0.38) {
            const trailer = offAgents[bestTrailerIdx];
            pitcherOffIdx = carrierOffIdx;
            carrierOffIdx = bestTrailerIdx;
            lateralsAttempted++;

            const pitchSpeed = 16.5;
            const pFlightTime = bestTrailerDist / pitchSpeed;
            ballTargetPos = {
              x: trailer.pos.x + trailer.vel.x * pFlightTime * 0.82,
              y: trailer.pos.y + trailer.vel.y * pFlightTime * 0.82,
            };
            ballVel = {
              x: (ballTargetPos.x - carrier.pos.x) / pFlightTime,
              y: (ballTargetPos.y - carrier.pos.y) / pFlightTime,
            };
            flightTimer = pFlightTime;
            ballState = 'LATERAL_FLIGHT';
            break;
          }
        }

        if (dist <= 1.44) {
          const defSpd = Math.max(0.5, Math.hypot(def.vel.x, def.vel.y));
          const cosPsi = Math.max(-1, Math.min(1, (def.vel.x * dx + def.vel.y * dy) / (defSpd * dist)));
          const sinPsi = Math.sqrt(Math.max(0, 1 - cosPsi * cosPsi));
          const impactB = dist * sinPsi;

          // Realistic NFL Forced Fumble check (~0.6% per tackle contact)
          const hitDiff = def.ratings.tak_hit_power - carrier.ratings.ball_security;
          const fumbleProb = Math.max(0.002, Math.min(0.018, 0.005 + 0.00022 * hitDiff));
          if (rng.next() < fumbleProb) {
            ballState = 'DEAD';
            const spot = Math.round(carrier.pos.y * 10) / 10;
            const evalRes = evaluateSnapEPA(situation, 'FUMBLE', spot);
            commentary = `[FUMBLE LOST at t=${t.toFixed(2)}s] ${def.name} delivered a jarring hit (${def.ratings.tak_hit_power} Hit Power) to force a fumble on ${carrier.name} at +${spot.toFixed(1)} yds (${evalRes.epa.toFixed(2)} EPA).`;
            if (recordSnapshots) {
              snapshots.push(
                captureSnapshot(
                  tick,
                  t,
                  carrier.readOrder,
                  pocketPressure,
                  'FUMBLE',
                  ballPos,
                  ballTargetPos,
                  null,
                  null,
                  offAgents,
                  defAgents,
                  false,
                  activeScheme,
                  resolvedStunt,
                  matchCoverage
                )
              );
            }
            return wrapResult({
              outcome: 'FUMBLE',
              yardsGained: spot,
              airYards: isDesignedRun ? 0 : airYardsOnPlay,
              yacYards: isDesignedRun ? spot : 0,
              epa: evalRes.epa,
              goalSuccess: false,
              epaSuccess: false,
              timeToThrow: isDesignedRun ? 0.35 : timeToThrow,
              wasPressured: isDesignedRun ? spot <= 0 : wasPressuredOnPlay,
              targetedPlayerId: carrier.id,
              targetedReadOrder: isDesignedRun ? 1 : carrier.readOrder,
              catchPos: { ...carrier.pos },
              brokenTackles,
              lateralsAttempted,
              lateralsCompleted,
              preSnapTell,
              commentary,
              snapshots,
              isScramble: false,
              scrambleYards: 0,
              qbDecisionTelemetry: lastDecisionTelemetry,
              isRunPlay: isDesignedRun,
            });
          }

          const runnerEscape =
            0.48 * carrier.ratings.btk_power +
            0.34 * carrier.ratings.elusiveness +
            0.18 * carrier.ratings.str;
          const tacklerWrap =
            (0.68 * def.ratings.tak_wrap + 0.32 * def.ratings.str) *
            Math.max(0.45, 1.0 - 0.45 * impactB);

          const breakProb = 1 / (1 + Math.exp(-0.060 * (runnerEscape - tacklerWrap - 24)));

          if (rng.next() < breakProb && brokenTackles < 2) {
            brokenTackles++;
            def.stunTimer = 0.45;
            carrier.vel.x *= 0.74;
            carrier.vel.y *= 0.74;
          } else {
            ballState = 'DEAD';
            const isRunByQb = carrierOffIdx === 0 || isScramble;
            const forwardProgress = Math.round((carrier.pos.y + 0.10) * 10) / 10;
            const yac =
              isRunByQb || isDesignedRun
                ? forwardProgress
                : Math.max(0, Math.round((forwardProgress - catchSpotY) * 10) / 10);
            const outcomeType: PlayOutcome = isDesignedRun
              ? forwardProgress <= 0
                ? 'RUN_STUFF'
                : 'RUN_GAIN'
              : 'COMPLETE';
            const evalRes = evaluateSnapEPA(situation, outcomeType, forwardProgress);
            commentary = isDesignedRun
              ? `[${outcomeType} +${forwardProgress.toFixed(1)} yds] ${carrier.name} tackled by ${def.name} (${def.label}) (${brokenTackles} BTK | ${evalRes.epa >= 0 ? '+' : ''}${evalRes.epa.toFixed(2)} EPA).`
              : isRunByQb
              ? `[QB SCRAMBLE +${forwardProgress.toFixed(1)} yds] ${carrier.name} scrambled for ${forwardProgress.toFixed(1)} yds before being brought down by ${def.name} (${evalRes.epa >= 0 ? '+' : ''}${evalRes.epa.toFixed(2)} EPA).`
              : `[COMPLETE +${forwardProgress.toFixed(1)} yds (${airYardsOnPlay.toFixed(1)} air + ${yac.toFixed(1)} YAC)] ${carrier.name} tackled by ${def.name} (${def.label}) (${brokenTackles} BTK | ${evalRes.epa >= 0 ? '+' : ''}${evalRes.epa.toFixed(2)} EPA).`;
            if (recordSnapshots) {
              snapshots.push(
                captureSnapshot(
                  tick,
                  t,
                  carrier.readOrder,
                  pocketPressure,
                  ballState,
                  ballPos,
                  ballTargetPos,
                  carrierOffIdx,
                  null,
                  offAgents,
                  defAgents,
                  isRunByQb,
                  activeScheme,
                  resolvedStunt,
                  matchCoverage
                )
              );
            }
            return wrapResult({
              outcome: outcomeType,
              yardsGained: forwardProgress,
              airYards: isRunByQb || isDesignedRun ? 0 : airYardsOnPlay,
              yacYards: yac,
              epa: evalRes.epa,
              goalSuccess: evalRes.goalSuccess,
              epaSuccess: evalRes.epaSuccess,
              timeToThrow: isDesignedRun ? 0.35 : timeToThrow,
              wasPressured: isDesignedRun ? forwardProgress <= 0 : wasPressuredOnPlay,
              targetedPlayerId: carrier.id,
              targetedReadOrder: isDesignedRun ? 1 : carrier.readOrder,
              catchPos: { ...carrier.pos },
              brokenTackles,
              lateralsAttempted,
              lateralsCompleted,
              preSnapTell,
              commentary,
              snapshots,
              isScramble: isRunByQb && !isDesignedRun,
              scrambleYards: isRunByQb && !isDesignedRun ? forwardProgress : 0,
              qbDecisionTelemetry: lastDecisionTelemetry,
              isRunPlay: isDesignedRun,
            });
          }
        }
      }
    }

    if (recordSnapshots) {
      snapshots.push(
        captureSnapshot(
          tick,
          t,
          currentReadSlot + 1,
          pocketPressure,
          ballState,
          ballPos,
          ballTargetPos,
          carrierOffIdx,
          pitcherOffIdx,
          offAgents,
          defAgents,
          ballState === 'CAUGHT' && carrierOffIdx === 0,
          activeScheme,
          resolvedStunt,
          matchCoverage,
          currentBallZ
        )
      );
    }
  }

  // Whistle on max ticks
  if (isDesignedRun) {
    const finalYards =
      ballState === 'CAUGHT' && carrierOffIdx !== null
        ? Math.round(offAgents[carrierOffIdx].pos.y * 10) / 10
        : 0;
    const finalOutcome: PlayOutcome = finalYards <= 0 ? 'RUN_STUFF' : 'RUN_GAIN';
    const evalRes = evaluateSnapEPA(situation, finalOutcome, finalYards);
    return wrapResult({
      outcome: finalOutcome,
      yardsGained: finalYards,
      airYards: 0,
      yacYards: finalYards,
      epa: evalRes.epa,
      goalSuccess: evalRes.goalSuccess,
      epaSuccess: evalRes.epaSuccess,
      timeToThrow: 0.35,
      wasPressured: finalYards <= 0,
      targetedPlayerId: carrierOffIdx !== null ? offAgents[carrierOffIdx].id : null,
      targetedReadOrder: 1,
      catchPos: null,
      brokenTackles,
      lateralsAttempted,
      lateralsCompleted,
      preSnapTell,
      commentary: `[RUN WHISTLE] Outcome: ${finalOutcome} (${finalYards.toFixed(1)} yds, ${evalRes.epa.toFixed(2)} EPA).`,
      snapshots,
      isScramble: false,
      scrambleYards: 0,
      qbDecisionTelemetry: lastDecisionTelemetry,
      isRunPlay: true,
    });
  }

  const isRunByQb = (ballState === 'CAUGHT' && carrierOffIdx === 0) || isScramble;
  const finalYards =
    ballState === 'CAUGHT' && carrierOffIdx !== null
      ? Math.round(offAgents[carrierOffIdx].pos.y * 10) / 10
      : 0;
  const finalOutcome = ballState === 'CAUGHT' ? 'COMPLETE' : 'INCOMPLETE';
  const evalRes = evaluateSnapEPA(situation, finalOutcome, finalYards);

  return wrapResult({
    outcome: finalOutcome,
    yardsGained: finalYards,
    airYards: airYardsOnPlay,
    yacYards: Math.max(0, finalYards - catchSpotY),
    epa: evalRes.epa,
    goalSuccess: evalRes.goalSuccess,
    epaSuccess: evalRes.epaSuccess,
    timeToThrow: timeToThrow || 3.4,
    wasPressured: wasPressuredOnPlay,
    targetedPlayerId: targetedOffIdx !== null ? offAgents[targetedOffIdx].id : null,
    targetedReadOrder: currentReadSlot + 1,
    catchPos: null,
    brokenTackles,
    lateralsAttempted,
    lateralsCompleted,
    preSnapTell,
    commentary: `[PLAY WHISTLE] Outcome: ${finalOutcome} (${finalYards.toFixed(1)} yds, ${evalRes.epa.toFixed(2)} EPA).`,
    snapshots,
    isScramble: isRunByQb && !isDesignedRun,
    scrambleYards: isRunByQb && !isDesignedRun ? finalYards : 0,
    qbDecisionTelemetry: lastDecisionTelemetry,
    isRunPlay: isDesignedRun,
  });
}

function captureSnapshot(
  tick: number,
  time: number,
  qbReadOrder: number,
  pocketPressure: number,
  ballState: TickSnapshot['ballState'],
  ballPos: Vec2,
  ballTargetPos: Vec2,
  carrierIdx: number | null,
  pitcherIdx: number | null | undefined,
  offAgents: AgentRuntime[],
  defAgents: AgentRuntime[],
  isScramble?: boolean,
  activeScheme?: DefScheme,
  activeStunt?: DLStuntType,
  matchCoverageActive?: boolean,
  ballZ?: number
): TickSnapshot {
  const all = [...offAgents, ...defAgents];
  return {
    tick,
    time,
    qbReadOrder,
    pocketPressure,
    ballState,
    ballPos: { ...ballPos },
    ballTargetPos: { ...ballTargetPos },
    carrierIdx,
    pitcherIdx,
    isScramble: isScramble || (ballState === 'CAUGHT' && carrierIdx === 0),
    activeScheme,
    activeStunt,
    matchCoverageActive,
    ballZ: ballZ !== undefined ? Math.round(ballZ * 100) / 100 : undefined,
    agents: all.map((a) => ({
      id: a.id,
      label: a.label,
      name: a.name,
      team: a.team,
      archetype: a.archetype,
      x: a.pos.x,
      y: a.pos.y,
      vx: a.vel.x,
      vy: a.vel.y,
      heading: a.heading,
      engaged: a.engagedWith !== null,
      stunned: a.stunTimer > 0,
      isSpy: a.assignType === 'SPY',
      assignType: a.assignType,
      zoneAnchor: a.zoneAnchor ? { ...a.zoneAnchor } : undefined,
      stuntRole: a.stuntRole,
      matchedReceiverIdx: a.matchedReceiverIdx,
    })),
  };
}

// ============================================================================
// BATCH MONTE CARLO ROLLOUT ENGINE
// ============================================================================
export function runMonteCarloBatch(
  offConfigs: PlayerConfig[],
  defConfigs: PlayerConfig[],
  defCall: DefensiveCall,
  situation: SituationSpec,
  snaps = 400,
  baseSeed = 42069,
  allowLaterals = false,
  motionId: PreSnapMotionId = 'NONE',
  front: DefFront = 'OVER',
  riskTolerance = 0.55,
  spyRole: DefSpyRole = 'NONE',
  dropbackType: DropbackType = 'STANDARD_DROP',
  blockingScheme: BlockingSchemeId = 'HALF_SLIDE',
  dlStunt: DLStuntType = 'AUTO',
  matchCoverage = true,
  defTactic?: Partial<DefensiveTacticSpec>
): MonteCarloSummary {
  const rng = new PRNG(baseSeed);
  const epaSamples: number[] = [];
  const scatterPoints: MonteCarloSummary['scatterPoints'] = [];

  let goals = 0;
  let epaSuccesses = 0;
  let comps = 0;
  let sacks = 0;
  let pressures = 0;
  let ints = 0;
  let fumbles = 0;
  let scrambles = 0;
  let totalScrambleYards = 0;
  let totalYards = 0;
  let totalAirYards = 0;
  let totalYacYards = 0;
  let totalTtt = 0;
  let primaryTargets = 0;
  let checkdownTargets = 0;
  let passAttempts = 0;
  let totalLaterals = 0;
  let completedLaterals = 0;

  let rushAttempts = 0;
  let rushYards = 0;
  let rushStuffs = 0;
  let rushExplosives = 0;
  let rushBrokenTackles = 0;
  let rushSuccesses = 0;
  let isRunPlayDetected = false;

  for (let i = 0; i < snaps; i++) {
    const res = simulateSingleSnap(
      offConfigs,
      defConfigs,
      defCall,
      situation,
      rng,
      false,
      allowLaterals,
      motionId,
      front,
      riskTolerance,
      spyRole,
      dropbackType,
      blockingScheme,
      dlStunt,
      matchCoverage,
      defTactic
    );
    epaSamples.push(res.epa);
    if (res.goalSuccess) goals++;
    if (res.epaSuccess) epaSuccesses++;
    if (res.outcome === 'COMPLETE' && !res.isScramble) {
      comps++;
      totalAirYards += res.airYards;
      totalYacYards += res.yacYards;
    }
    if (
      res.isRunPlay ||
      res.outcome === 'RUN_GAIN' ||
      res.outcome === 'RUN_STUFF' ||
      res.outcome === 'RUN_TOUCHDOWN'
    ) {
      isRunPlayDetected = true;
      rushAttempts++;
      rushYards += res.yardsGained;
      if (res.yardsGained <= 0) rushStuffs++;
      if (res.yardsGained >= 10) rushExplosives++;
      if (res.brokenTackles > 0) rushBrokenTackles += res.brokenTackles;

      const reqYards =
        situation.down === 1
          ? situation.distance * 0.40
          : situation.down === 2
          ? situation.distance * 0.60
          : situation.distance;
      if (res.yardsGained >= reqYards || res.outcome === 'RUN_TOUCHDOWN') {
        rushSuccesses++;
      }
    }
    if (res.outcome === 'SACK') sacks++;
    if (res.wasPressured) pressures++;
    if (res.outcome === 'INTERCEPTION') ints++;
    if (res.outcome === 'FUMBLE') fumbles++;
    if (res.isScramble) {
      scrambles++;
      totalScrambleYards += res.yardsGained;
    }
    totalYards += res.yardsGained;
    totalTtt += res.timeToThrow;
    totalLaterals += res.lateralsAttempted;
    completedLaterals += res.lateralsCompleted;

    if (
      res.outcome !== 'SACK' &&
      !res.isScramble &&
      !res.isRunPlay &&
      res.outcome !== 'RUN_GAIN' &&
      res.outcome !== 'RUN_STUFF' &&
      res.outcome !== 'RUN_TOUCHDOWN'
    ) {
      passAttempts++;
      if (res.targetedReadOrder === 1) primaryTargets++;
      if (res.targetedReadOrder >= 4) checkdownTargets++;
    }
    if (res.catchPos && scatterPoints.length < 220) {
      scatterPoints.push({
        x: res.catchPos.x,
        y: res.catchPos.y,
        outcome: res.outcome,
        yards: res.yardsGained,
        epa: res.epa,
      });
    }
  }

  const meanEpa = epaSamples.reduce((a, b) => a + b, 0) / snaps;
  const varEpa =
    epaSamples.reduce((acc, v) => acc + (v - meanEpa) * (v - meanEpa), 0) / Math.max(1, snaps - 1);
  const stdEpa = Math.sqrt(varEpa);

  const sortedEpa = [...epaSamples].sort((a, b) => a - b);
  const midIdx = Math.floor(sortedEpa.length / 2);
  const medianEpa =
    sortedEpa.length % 2 === 0
      ? (sortedEpa[midIdx - 1] + sortedEpa[midIdx]) / 2
      : sortedEpa[midIdx];

  const tailCount = Math.max(1, Math.floor(snaps * 0.1));
  const cvar10Epa = sortedEpa.slice(0, tailCount).reduce((a, b) => a + b, 0) / tailCount;

  return {
    snaps,
    meanEpa,
    medianEpa,
    stdEpa,
    varEpa,
    cvar10Epa,
    epaSuccessRate: (epaSuccesses / snaps) * 100,
    goalSuccessRate: (goals / snaps) * 100,
    completionRate: (comps / Math.max(1, passAttempts)) * 100,
    sackRate: (sacks / snaps) * 100,
    pressureRate: (pressures / snaps) * 100,
    intRate: (ints / Math.max(1, passAttempts)) * 100,
    fumbleRate: (fumbles / snaps) * 100,
    avgYards: totalYards / snaps,
    avgAirYards: comps > 0 ? totalAirYards / comps : 0,
    avgYacYards: comps > 0 ? totalYacYards / comps : 0,
    avgTimeToThrow: totalTtt / snaps,
    primaryReadShare: (primaryTargets / Math.max(1, passAttempts)) * 100,
    checkdownShare: (checkdownTargets / Math.max(1, passAttempts)) * 100,
    lateralSuccessShare: totalLaterals > 0 ? (completedLaterals / totalLaterals) * 100 : 0,
    scrambleRate: Math.round((scrambles / snaps) * 1000) / 10,
    avgScrambleYards: scrambles > 0 ? Math.round((totalScrambleYards / scrambles) * 10) / 10 : 0,
    epaSamples,
    scatterPoints,
    isRunPlay: isRunPlayDetected,
    yardsPerCarry: rushAttempts > 0 ? Math.round((rushYards / rushAttempts) * 10) / 10 : undefined,
    stuffRate: rushAttempts > 0 ? Math.round((rushStuffs / rushAttempts) * 1000) / 10 : undefined,
    explosiveRunRate:
      rushAttempts > 0 ? Math.round((rushExplosives / rushAttempts) * 1000) / 10 : undefined,
    brokenTackleRate:
      rushAttempts > 0 ? Math.round((rushBrokenTackles / rushAttempts) * 1000) / 10 : undefined,
    rushingSuccessRate:
      rushAttempts > 0 ? Math.round((rushSuccesses / rushAttempts) * 1000) / 10 : undefined,
  };
}

// ============================================================================
// MULTI-OBJECTIVE EVOLUTIONARY PLAY OPTIMIZER (μ + λ Tournament & Crossover)
// ============================================================================
export interface MutationGenerationLog {
  generation: number;
  objectiveScore: number;
  meanEpa: number;
  medianEpa: number;
  stdEpa: number;
  goalRate: number;
  epaSuccessRate: number;
  sackRate: number;
  compRate: number;
  changeDescription: string;
}

export function clonePlay(cfg: PlayerConfig[]): PlayerConfig[] {
  return cfg.map((p) => ({
    ...p,
    startPos: { ...p.startPos },
    waypoints: p.waypoints.map((w) => ({ ...w })),
    ratings: { ...p.ratings },
    scouting: p.scouting ? { ...p.scouting } : undefined,
    breakStyle: p.breakStyle,
    choiceRules: p.choiceRules
      ? p.choiceRules.map((r) => ({
          ...r,
          waypoints: r.waypoints.map((w) => ({ ...w })),
        }))
      : undefined,
    choiceActiveDesc: p.choiceActiveDesc,
  }));
}

export function mutatePlayForRoster(
  initialOffense: PlayerConfig[],
  defConfigs: PlayerConfig[],
  defCall: DefensiveCall,
  situation: SituationSpec,
  generations = 20,
  rolloutsPerCandidate = 100,
  motionId: PreSnapMotionId = 'NONE',
  front: DefFront = 'OVER',
  riskTolerance = 0.55,
  spyRole: DefSpyRole = 'NONE',
  dropbackType: DropbackType = 'STANDARD_DROP',
  blockingScheme: BlockingSchemeId = 'HALF_SLIDE'
): {
  optimizedOffense: PlayerConfig[];
  optimizedMotion: PreSnapMotionId;
  optimizedDropback: DropbackType;
  optimizedBlocking: BlockingSchemeId;
  logs: MutationGenerationLog[];
  finalSummary: MonteCarloSummary;
} {
  const scoreSummary = (s: MonteCarloSummary): number => {
    const goalWeight = situation.down >= 3 ? 1.15 : 0.75;
    return (
      s.meanEpa +
      goalWeight * (s.goalSuccessRate / 100) +
      0.20 * s.medianEpa +
      0.12 * (s.epaSuccessRate / 100) -
      0.16 * s.stdEpa
    );
  };

  let bestPlay = clonePlay(initialOffense);
  let bestMotion = motionId;
  let bestDropback = dropbackType;
  let bestBlocking = blockingScheme;
  let bestSummary = runMonteCarloBatch(
    bestPlay,
    defConfigs,
    defCall,
    situation,
    rolloutsPerCandidate,
    9001,
    false,
    bestMotion,
    front,
    riskTolerance,
    spyRole,
    bestDropback,
    bestBlocking
  );
  let bestScore = scoreSummary(bestSummary);

  const eliteArchive: {
    play: PlayerConfig[];
    motion: PreSnapMotionId;
    dropback: DropbackType;
    blocking: BlockingSchemeId;
    score: number;
  }[] = [{ play: clonePlay(bestPlay), motion: bestMotion, dropback: bestDropback, blocking: bestBlocking, score: bestScore }];

  const logs: MutationGenerationLog[] = [
    {
      generation: 0,
      objectiveScore: bestScore,
      meanEpa: bestSummary.meanEpa,
      medianEpa: bestSummary.medianEpa,
      stdEpa: bestSummary.stdEpa,
      goalRate: bestSummary.goalSuccessRate,
      epaSuccessRate: bestSummary.epaSuccessRate,
      sackRate: bestSummary.sackRate,
      compRate: bestSummary.completionRate,
      changeDescription: `Baseline Call Sheet evaluated across ${rolloutsPerCandidate} snaps (${situation.label}).`,
    },
  ];

  const rng = new PRNG(777111);
  const maxFieldY = Math.min(32.0, 100 - situation.yardline + 8.5);

  for (let gen = 1; gen <= generations; gen++) {
    const parentEntry =
      eliteArchive.length > 1 && rng.next() < 0.35
        ? eliteArchive[Math.floor(rng.next() * eliteArchive.length)]
        : { play: bestPlay, motion: bestMotion, dropback: bestDropback, blocking: bestBlocking, score: bestScore };

    const candidate = clonePlay(parentEntry.play);
    let candMotion = parentEntry.motion;
    let candDropback = parentEntry.dropback;
    let candBlocking = parentEntry.blocking;

    const eligibles = candidate.filter((p) => p.eligible);
    const targetRec = eligibles[Math.floor(rng.next() * eligibles.length)];
    let desc = '';

    const mutationRoll = rng.next();

    if (mutationRoll < 0.12 && (targetRec.id === 'TE' || targetRec.id === 'RB')) {
      const roles: OffensiveRole[] =
        bestSummary.sackRate > 8.5
          ? ['CHIP_RELEASE', 'PASS_BLOCK', 'ROUTE']
          : ['ROUTE', 'CHIP_RELEASE'];
      const nextRole = roles[Math.floor(rng.next() * roles.length)];
      targetRec.role = nextRole;
      desc = `Protection Tweak: ${targetRec.name} (${targetRec.label}) assigned to [${nextRole}]`;
    } else if (mutationRoll < 0.22) {
      const isPlayRun =
        candidate.some((p) => p.role === 'BALL_CARRIER') || isRunBlockingScheme(candBlocking);
      const passSchemes: BlockingSchemeId[] = [
        'HALF_SLIDE',
        'PIN_AND_PULL',
        'FULL_SLIDE_L',
        'FULL_SLIDE_R',
        'BIG_ON_BIG',
        'MAX_PROTECT',
      ];
      const runSchemes: BlockingSchemeId[] = [
        'PIN_AND_PULL',
        'GT_COUNTER_PULL',
        'POWER_G_PULL',
        'INSIDE_ZONE_DUO',
        'OUTSIDE_ZONE_STRETCH',
      ];
      const schemes = isPlayRun ? runSchemes : passSchemes;
      candBlocking = schemes[Math.floor(rng.next() * schemes.length)];
      desc = `Blocking Scheme: [${candBlocking}]`;
    } else if (mutationRoll < 0.50 && targetRec.waypoints.length >= 2) {
      const wp0 = targetRec.waypoints[0];
      const wp1 = targetRec.waypoints[1];
      const sticksTargetY =
        situation.down >= 3 ? Math.min(maxFieldY - 2, situation.distance + 1.5) : wp0.y;
      const pullToSticks = situation.down >= 3 ? (sticksTargetY - wp0.y) * 0.35 : 0;
      const deltaStemY = pullToSticks + (rng.next() - 0.45) * 3.4;
      const deltaBreakX = (rng.next() - 0.5) * 6.0;
      const deltaBreakY = (rng.next() - 0.46) * 3.8;

      wp0.y = Math.max(2.0, Math.min(maxFieldY - 3.0, wp0.y + deltaStemY));
      wp1.x = Math.max(-24.0, Math.min(24.0, wp1.x + deltaBreakX));
      wp1.y = Math.max(0.5, Math.min(maxFieldY - 1.0, wp1.y + deltaBreakY));
      desc = `Route Stem: ${targetRec.name} break tuned to (${wp0.x.toFixed(1)}, ${wp0.y.toFixed(1)}y) ➔ (${wp1.x.toFixed(1)}, ${wp1.y.toFixed(1)}y)`;
    } else if (mutationRoll < 0.68) {
      const x0 = targetRec.startPos.x;
      const insideDir = x0 < 0 ? 1 : -1;
      const outsideDir = -insideDir;
      const sticksY = Math.min(maxFieldY - 2.5, Math.max(4.5, situation.distance + 1.0));
      const templates = [
        { name: 'Sticks In-Cut', wps: [{ x: x0, y: sticksY }, { x: x0 + insideDir * 9.5, y: sticksY + 0.5 }] },
        { name: 'Quick Slant Window', wps: [{ x: x0, y: 3.2 }, { x: x0 + insideDir * 8.5, y: 8.5 }] },
        { name: 'Speed Out', wps: [{ x: x0, y: Math.min(sticksY, 6.0) }, { x: x0 + outsideDir * 6.5, y: Math.min(sticksY, 6.0) }] },
        { name: 'Option Whip', wps: [{ x: x0 + insideDir * 2.5, y: 5.0 }, { x: x0 + outsideDir * 5.5, y: 5.5 }] },
        { name: '7-Route Corner', wps: [{ x: x0, y: Math.min(10.0, maxFieldY - 5) }, { x: x0 + outsideDir * 7.5, y: Math.min(16.5, maxFieldY - 1) }] },
        { name: 'Shallow Crosser', wps: [{ x: x0 + insideDir * 3.0, y: 4.2 }, { x: x0 + insideDir * 14.0, y: 5.5 }] },
      ];
      const chosen = templates[Math.floor(rng.next() * templates.length)];
      targetRec.role = 'ROUTE';
      targetRec.waypoints = chosen.wps;
      desc = `Route Swap: ${targetRec.name} assigned [${chosen.name}]`;
    } else if (mutationRoll < 0.82) {
      const sign = Math.sign(targetRec.startPos.x) || 1;
      const deltaSplit = (rng.next() - 0.5) * 3.8;
      const oldX = targetRec.startPos.x;
      targetRec.startPos.x = Math.max(-23.0, Math.min(23.0, oldX + deltaSplit));
      if (Math.abs(targetRec.startPos.x) < 3.8 && targetRec.id !== 'RB') {
        targetRec.startPos.x = sign * 4.2;
      }
      const shift = targetRec.startPos.x - oldX;
      targetRec.waypoints.forEach((w) => {
        w.x = Math.max(-24.0, Math.min(24.0, w.x + shift));
      });
      desc = `Pre-Snap Split: ${targetRec.name} aligned at x=${targetRec.startPos.x.toFixed(1)}y`;
    } else if (mutationRoll < 0.92) {
      const a = eligibles[Math.floor(rng.next() * eligibles.length)];
      const b = eligibles[Math.floor(rng.next() * eligibles.length)];
      if (a.id !== b.id) {
        const tmp = a.readOrder;
        a.readOrder = b.readOrder;
        b.readOrder = tmp;
        desc = `QB Progression: ${a.name} (Read #${a.readOrder}) ⇄ ${b.name} (Read #${b.readOrder})`;
      } else {
        continue;
      }
    } else {
      const motions: PreSnapMotionId[] = ['NONE', 'JET_R_TO_L', 'ORBIT_RETURN', 'RB_FLAP_OUT', 'TE_SIFT'];
      candMotion = motions[Math.floor(rng.next() * motions.length)];
      if (situation.down <= 2 && situation.distance <= 10 && rng.next() < 0.45) {
        candDropback = 'PLAY_ACTION';
      } else if (situation.distance <= 4 && rng.next() < 0.5) {
        candDropback = 'QUICK_GAME';
      } else {
        candDropback = 'STANDARD_DROP';
      }
      desc = `Motion/Rhythm: Motion=[${candMotion}], Dropback=[${candDropback}]`;
    }

    const candSummary = runMonteCarloBatch(
      candidate,
      defConfigs,
      defCall,
      situation,
      rolloutsPerCandidate,
      9001 + gen * 19,
      false,
      candMotion,
      front,
      riskTolerance,
      spyRole,
      candDropback,
      candBlocking
    );
    const candScore = scoreSummary(candSummary);

    if (candScore > bestScore + 0.008) {
      bestPlay = candidate;
      bestMotion = candMotion;
      bestDropback = candDropback;
      bestBlocking = candBlocking;
      bestSummary = candSummary;
      bestScore = candScore;

      eliteArchive.push({
        play: clonePlay(bestPlay),
        motion: bestMotion,
        dropback: bestDropback,
        blocking: bestBlocking,
        score: bestScore,
      });
      eliteArchive.sort((a, b) => b.score - a.score);
      if (eliteArchive.length > 3) eliteArchive.pop();

      logs.push({
        generation: gen,
        objectiveScore: bestScore,
        meanEpa: bestSummary.meanEpa,
        medianEpa: bestSummary.medianEpa,
        stdEpa: bestSummary.stdEpa,
        goalRate: bestSummary.goalSuccessRate,
        epaSuccessRate: bestSummary.epaSuccessRate,
        sackRate: bestSummary.sackRate,
        compRate: bestSummary.completionRate,
        changeDescription: `ACCEPTED: ${desc}`,
      });
    }
  }

  const finalSummary = runMonteCarloBatch(
    bestPlay,
    defConfigs,
    defCall,
    situation,
    250,
    42069,
    false,
    bestMotion,
    front,
    riskTolerance,
    spyRole,
    bestDropback,
    bestBlocking
  );
  return {
    optimizedOffense: bestPlay,
    optimizedMotion: bestMotion,
    optimizedDropback: bestDropback,
    optimizedBlocking: bestBlocking,
    logs,
    finalSummary,
  };
}

export interface MutationProgress {
  generation: number;
  maxGenerations: number;
  bestScore: number;
  meanEpa: number;
  medianEpa: number;
  stdEpa: number;
  goalRate: number;
  epaSuccessRate: number;
  compRate: number;
  sackRate: number;
  currentBestPlay: PlayerConfig[];
  currentMotion: PreSnapMotionId;
  currentDropback: DropbackType;
  currentBlocking: BlockingSchemeId;
  latestChangeDesc: string;
  accepted: boolean;
  logs: MutationGenerationLog[];
  offensePercentile?: OffensePercentileReport;
}

export async function mutatePlayForRosterAsync(
  initialOffense: PlayerConfig[],
  defConfigs: PlayerConfig[],
  defCall: DefensiveCall,
  situation: SituationSpec,
  generations = 1500,
  rolloutsPerCandidate = 35,
  motionId: PreSnapMotionId = 'NONE',
  front: DefFront = 'OVER',
  riskTolerance = 0.55,
  spyRole: DefSpyRole = 'NONE',
  dropbackType: DropbackType = 'STANDARD_DROP',
  blockingScheme: BlockingSchemeId = 'HALF_SLIDE',
  dlStunt: DLStuntType = 'AUTO',
  matchCoverage = true,
  onProgress?: (progress: MutationProgress) => void,
  abortSignal?: { aborted: boolean },
  defTactic?: Partial<DefensiveTacticSpec>,
  mutationBatchSize = 3
): Promise<{
  optimizedOffense: PlayerConfig[];
  optimizedMotion: PreSnapMotionId;
  optimizedDropback: DropbackType;
  optimizedBlocking: BlockingSchemeId;
  logs: MutationGenerationLog[];
  finalSummary: MonteCarloSummary;
  offensePercentile: OffensePercentileReport;
}> {
  const scoreSummary = (s: MonteCarloSummary): number => {
    const goalWeight = situation.down >= 3 ? 1.20 : 0.80;
    return (
      s.meanEpa +
      goalWeight * (s.goalSuccessRate / 100) +
      0.22 * s.medianEpa +
      0.15 * (s.epaSuccessRate / 100) -
      0.16 * s.stdEpa -
      0.10 * (s.sackRate / 100)
    );
  };

  let bestPlay = clonePlay(initialOffense);
  let bestMotion = motionId;
  let bestDropback = dropbackType;
  let bestBlocking = blockingScheme;
  let bestSummary = runMonteCarloBatch(
    bestPlay,
    defConfigs,
    defCall,
    situation,
    rolloutsPerCandidate,
    9001,
    false,
    bestMotion,
    front,
    riskTolerance,
    spyRole,
    bestDropback,
    bestBlocking,
    dlStunt,
    matchCoverage,
    defTactic
  );
  let bestScore = scoreSummary(bestSummary);

  const eliteArchive: {
    play: PlayerConfig[];
    motion: PreSnapMotionId;
    dropback: DropbackType;
    blocking: BlockingSchemeId;
    score: number;
  }[] = [{ play: clonePlay(bestPlay), motion: bestMotion, dropback: bestDropback, blocking: bestBlocking, score: bestScore }];

  const initialPercentile = computeOffensePercentile(bestSummary, situation);

  const logs: MutationGenerationLog[] = [
    {
      generation: 0,
      objectiveScore: bestScore,
      meanEpa: bestSummary.meanEpa,
      medianEpa: bestSummary.medianEpa,
      stdEpa: bestSummary.stdEpa,
      goalRate: bestSummary.goalSuccessRate,
      epaSuccessRate: bestSummary.epaSuccessRate,
      sackRate: bestSummary.sackRate,
      compRate: bestSummary.completionRate,
      changeDescription: `Baseline Call Sheet evaluated across ${rolloutsPerCandidate} snaps (${situation.label}) -> ${initialPercentile.percentile.toFixed(1)}th %ile NFL Offense.`,
    },
  ];

  if (onProgress) {
    onProgress({
      generation: 0,
      maxGenerations: generations,
      bestScore,
      meanEpa: bestSummary.meanEpa,
      medianEpa: bestSummary.medianEpa,
      stdEpa: bestSummary.stdEpa,
      goalRate: bestSummary.goalSuccessRate,
      epaSuccessRate: bestSummary.epaSuccessRate,
      compRate: bestSummary.completionRate,
      sackRate: bestSummary.sackRate,
      currentBestPlay: clonePlay(bestPlay),
      currentMotion: bestMotion,
      currentDropback: bestDropback,
      currentBlocking: bestBlocking,
      latestChangeDesc: `Baseline Initialized (${initialPercentile.percentile.toFixed(1)}th %ile NFL)`,
      accepted: true,
      logs: [...logs],
      offensePercentile: initialPercentile,
    });
  }

  const rng = new PRNG(777111);
  const maxFieldY = Math.min(32.0, 100 - situation.yardline + 8.5);

  for (let gen = 1; gen <= generations; gen++) {
    if (abortSignal?.aborted) break;

    // Simulated annealing / learning rate decay: broad exploration early, micro-tuning late
    const alpha = Math.max(0.18, 1.0 - 0.72 * (gen / generations));

    const parentEntry =
      eliteArchive.length > 1 && rng.next() < 0.40
        ? eliteArchive[Math.floor(rng.next() * eliteArchive.length)]
        : { play: bestPlay, motion: bestMotion, dropback: bestDropback, blocking: bestBlocking, score: bestScore };

    const candidate = clonePlay(parentEntry.play);
    let candMotion = parentEntry.motion;
    let candDropback = parentEntry.dropback;
    let candBlocking = parentEntry.blocking;

    const eligibles = candidate.filter((p) => p.eligible);
    const changeParts: string[] = [];

    // Channel selection based on user-controlled mutationBatchSize
    // Channels:
    // 0: Stem & Break Vector Micro-adjustment
    // 1: Pre-Snap Spacing / Split Shifts
    // 2: Route Concept Reshaping & Landmarks
    // 3: Route Break Mechanics (Sharp Pivot vs Rounded Speed)
    // 4: Dynamic Option / Choice Route Branching
    // 5: Protection Scheme & Backfield Role
    // 6: Progression Read Order & Pre-Snap Motion
    const allChannels = [0, 1, 2, 3, 4, 5, 6];
    let activeChannels: Set<number>;
    if (mutationBatchSize <= 1) {
      const chosen = allChannels[Math.floor(rng.next() * allChannels.length)];
      activeChannels = new Set([chosen]);
    } else if (mutationBatchSize === 2) {
      const shuffled = [...allChannels].sort(() => rng.next() - 0.5);
      activeChannels = new Set([shuffled[0], shuffled[1]]);
    } else {
      activeChannels = new Set(allChannels);
    }

    // 0. STEM & BREAK VECTOR MICRO-ADJUSTMENTS
    if (activeChannels.has(0)) {
      const numReceiversToPerturb = mutationBatchSize === 1 ? 1 : Math.min(eligibles.length, 2 + Math.floor(rng.next() * 3));
      const shuffledEligibles = [...eligibles].sort(() => rng.next() - 0.5);

      for (let k = 0; k < numReceiversToPerturb; k++) {
        const rec = shuffledEligibles[k];

        // Route Stem & Break Vectors
        if (rec.waypoints.length >= 1) {
          const wp0 = rec.waypoints[0];
          const sticksTargetY = situation.down >= 3 ? Math.min(maxFieldY - 2.0, situation.distance + 1.2) : wp0.y;
          const pullToSticks = situation.down >= 3 ? (sticksTargetY - wp0.y) * 0.35 : 0;
          const deltaStemY = (pullToSticks + (rng.next() - 0.48) * 3.4) * alpha;
          const deltaStemX = ((rng.next() - 0.5) * 1.8) * alpha;

          wp0.y = Math.max(2.0, Math.min(maxFieldY - 2.5, wp0.y + deltaStemY));
          wp0.x = Math.max(-23.0, Math.min(23.0, wp0.x + deltaStemX));

          if (rec.waypoints.length >= 2) {
            const wp1 = rec.waypoints[1];
            const deltaBreakX = ((rng.next() - 0.5) * 5.6) * alpha;
            const deltaBreakY = ((rng.next() - 0.46) * 3.6) * alpha;

            wp1.x = Math.max(-24.0, Math.min(24.0, wp1.x + deltaBreakX));
            wp1.y = Math.max(0.5, Math.min(maxFieldY - 1.0, wp1.y + deltaBreakY));
          }

          if (rec.waypoints.length >= 3) {
            const wp2 = rec.waypoints[2];
            wp2.x = Math.max(-24.0, Math.min(24.0, wp2.x + ((rng.next() - 0.5) * 3.2) * alpha));
            wp2.y = Math.max(1.0, Math.min(maxFieldY - 0.5, wp2.y + ((rng.next() - 0.5) * 2.2) * alpha));
          }

          changeParts.push(`${rec.label} stem ${(deltaStemY >= 0 ? '+' : '')}${deltaStemY.toFixed(1)}y`);
        }
      }
    }

    // 1. PRE-SNAP SPACING / SPLIT ADJUSTMENT
    if (activeChannels.has(1) && (mutationBatchSize <= 2 || rng.next() < 0.45)) {
      const recToSplit = eligibles[Math.floor(rng.next() * eligibles.length)];
      const deltaSplit = ((rng.next() - 0.5) * 3.6) * alpha;
      const oldX = recToSplit.startPos.x;
      recToSplit.startPos.x = Math.max(-23.0, Math.min(23.0, oldX + deltaSplit));
      if (Math.abs(recToSplit.startPos.x) < 3.8 && recToSplit.id !== 'RB') {
        recToSplit.startPos.x = (Math.sign(oldX) || 1) * 4.2;
      }
      const shift = recToSplit.startPos.x - oldX;
      recToSplit.waypoints.forEach((w) => {
        w.x = Math.max(-24.0, Math.min(24.0, w.x + shift));
      });
      changeParts.push(`${recToSplit.label} split x=${recToSplit.startPos.x.toFixed(1)}y`);
    }

    // 2. ROUTE CONCEPT RESHAPING & MULTI-LANDMARK INJECTION
    if (activeChannels.has(2) && (mutationBatchSize <= 2 || rng.next() < 0.16 * alpha)) {
      const targetRec = eligibles[Math.floor(rng.next() * eligibles.length)];
      const x0 = targetRec.startPos.x;
      const insideDir = x0 < 0 ? 1 : -1;
      const outsideDir = -insideDir;
      const sticksY = Math.min(maxFieldY - 2.5, Math.max(4.5, situation.distance + 1.0));
      const templates = [
        { name: 'Sticks In-Cut', wps: [{ x: x0, y: sticksY }, { x: x0 + insideDir * 9.5, y: sticksY + 0.5 }], style: 'SHARP_PIVOT' as RouteBreakStyle },
        { name: 'Quick Slant Window', wps: [{ x: x0, y: 3.2 }, { x: x0 + insideDir * 8.5, y: 8.5 }], style: 'ROUNDED_SPEED' as RouteBreakStyle },
        { name: 'Speed Out', wps: [{ x: x0, y: Math.min(sticksY, 6.0) }, { x: x0 + outsideDir * 6.5, y: Math.min(sticksY, 6.0) }], style: 'SHARP_PIVOT' as RouteBreakStyle },
        { name: 'Option Whip', wps: [{ x: x0 + insideDir * 2.5, y: 5.0 }, { x: x0 + outsideDir * 5.5, y: 5.5 }], style: 'SHARP_PIVOT' as RouteBreakStyle },
        { name: '7-Route Corner', wps: [{ x: x0, y: Math.min(10.0, maxFieldY - 5) }, { x: x0 + outsideDir * 7.5, y: Math.min(16.5, maxFieldY - 1) }], style: 'ROUNDED_SPEED' as RouteBreakStyle },
        { name: 'Shallow Crosser', wps: [{ x: x0 + insideDir * 3.0, y: 4.2 }, { x: x0 + insideDir * 14.0, y: 5.5 }], style: 'ROUNDED_SPEED' as RouteBreakStyle },
        { name: 'Double-Move Sluggo', wps: [{ x: x0, y: 4.5 }, { x: x0 + insideDir * 3.0, y: 6.5 }, { x: x0 + insideDir * 1.5, y: 22.0 }], style: 'ROUNDED_SPEED' as RouteBreakStyle },
      ];
      const chosen = templates[Math.floor(rng.next() * templates.length)];
      targetRec.role = 'ROUTE';
      targetRec.waypoints = chosen.wps;
      targetRec.breakStyle = chosen.style;
      changeParts.push(`${targetRec.label} [${chosen.name}]`);
    }

    // 3. ROUTE BREAK MECHANICS (Sharp Pivot vs Rounded Speed)
    if (activeChannels.has(3) && (mutationBatchSize <= 2 || rng.next() < 0.22)) {
      const rec = eligibles[Math.floor(rng.next() * eligibles.length)];
      const nextStyle: RouteBreakStyle = rec.breakStyle === 'ROUNDED_SPEED' ? 'SHARP_PIVOT' : 'ROUNDED_SPEED';
      rec.breakStyle = nextStyle;
      changeParts.push(`${rec.label} Break: [${nextStyle === 'ROUNDED_SPEED' ? 'Speed Arc' : 'Sharp Pivot'}]`);
    }

    // 4. DYNAMIC OPTION / CHOICE ROUTE BRANCHING
    if (activeChannels.has(4) && (mutationBatchSize <= 2 || rng.next() < 0.14 * alpha)) {
      const rec = eligibles[Math.floor(rng.next() * eligibles.length)];
      const x0 = rec.startPos.x;
      const insideDir = x0 < 0 ? 1 : -1;
      const outsideDir = -insideDir;
      if (rec.choiceRules && rec.choiceRules.length > 0 && rng.next() < 0.35) {
        rec.choiceRules = undefined;
        changeParts.push(`${rec.label} Choice: [Cleared -> Static]`);
      } else if (rng.next() < 0.5) {
        // MOFC vs MOFO Choice
        rec.choiceRules = [
          {
            condition: 'MOFO',
            description: 'MOFO: Post Seam',
            waypoints: [{ x: 0, y: Math.min(maxFieldY - 1.0, 22.0) }],
          },
          {
            condition: 'MOFC',
            description: 'MOFC: Out Boundary',
            waypoints: [{ x: x0 + outsideDir * 7.5, y: 12.0 }],
          },
        ];
        changeParts.push(`${rec.label} Choice: [MOFC/MOFO Seam]`);
      } else {
        // Man vs Zone Choice
        rec.choiceRules = [
          {
            condition: 'MAN',
            description: 'Man: Whip Cut',
            waypoints: [{ x: x0 + outsideDir * 6.5, y: 5.5 }],
          },
          {
            condition: 'ZONE',
            description: 'Zone: Hook Settle',
            waypoints: [{ x: x0, y: 5.5 }],
          },
        ];
        changeParts.push(`${rec.label} Choice: [Man/Zone Whip]`);
      }
    }

    // 5. PROTECTION SCHEME & BACKFIELD ROLE
    if (activeChannels.has(5) && (mutationBatchSize <= 2 || rng.next() < 0.30)) {
      const isPlayRun =
        candidate.some((p) => p.role === 'BALL_CARRIER') || isRunBlockingScheme(candBlocking);
      const passSchemes: BlockingSchemeId[] = [
        'HALF_SLIDE',
        'PIN_AND_PULL',
        'FULL_SLIDE_L',
        'FULL_SLIDE_R',
        'BIG_ON_BIG',
        'MAX_PROTECT',
      ];
      const runSchemes: BlockingSchemeId[] = [
        'PIN_AND_PULL',
        'GT_COUNTER_PULL',
        'POWER_G_PULL',
        'INSIDE_ZONE_DUO',
        'OUTSIDE_ZONE_STRETCH',
      ];
      const schemes = isPlayRun ? runSchemes : passSchemes;
      candBlocking = schemes[Math.floor(rng.next() * schemes.length)];
      changeParts.push(`Block [${candBlocking}]`);
    }

    if (activeChannels.has(5) && (mutationBatchSize <= 2 || rng.next() < 0.22)) {
      const protBack = eligibles.find((p) => p.id === 'TE' || p.id === 'RB');
      if (protBack) {
        const roles: OffensiveRole[] =
          bestSummary.sackRate > 7.5
            ? ['CHIP_RELEASE', 'PASS_BLOCK']
            : ['ROUTE', 'CHIP_RELEASE'];
        const nextRole = roles[Math.floor(rng.next() * roles.length)];
        protBack.role = nextRole;
        changeParts.push(`${protBack.label} [${nextRole}]`);
      }
    }

    // 6. PROGRESSION READ ORDER & MOTION / RHYTHM
    if (activeChannels.has(6) && (mutationBatchSize <= 2 || rng.next() < 0.24)) {
      const a = eligibles[Math.floor(rng.next() * eligibles.length)];
      const b = eligibles[Math.floor(rng.next() * eligibles.length)];
      if (a.id !== b.id) {
        const tmp = a.readOrder;
        a.readOrder = b.readOrder;
        b.readOrder = tmp;
        changeParts.push(`Progression: ${a.label} ⇄ ${b.label}`);
      }
    }

    if (activeChannels.has(6) && (mutationBatchSize <= 2 || rng.next() < 0.20)) {
      const motions: PreSnapMotionId[] = ['NONE', 'JET_R_TO_L', 'ORBIT_RETURN', 'RB_FLAP_OUT', 'TE_SIFT'];
      candMotion = motions[Math.floor(rng.next() * motions.length)];
      if (situation.down <= 2 && situation.distance <= 10 && rng.next() < 0.45) {
        candDropback = 'PLAY_ACTION';
      } else if (situation.distance <= 4 && rng.next() < 0.5) {
        candDropback = 'QUICK_GAME';
      } else {
        candDropback = 'STANDARD_DROP';
      }
      changeParts.push(`Motion: [${candMotion}], Dropback: [${candDropback}]`);
    }

    const desc = changeParts.join(' | ') || 'Compound continuous vector gradient step';

    // Fast multi-fidelity screening (10 snaps)
    const screenSummary = runMonteCarloBatch(
      candidate,
      defConfigs,
      defCall,
      situation,
      10,
      9001 + gen * 31,
      false,
      candMotion,
      front,
      riskTolerance,
      spyRole,
      candDropback,
      candBlocking,
      dlStunt,
      matchCoverage
    );
    const screenScore = scoreSummary(screenSummary);
    let accepted = false;

    if (screenScore >= bestScore - 0.08) {
      // Passed screening - run confirmation snaps (28 snaps)
      const candSummary = runMonteCarloBatch(
        candidate,
        defConfigs,
        defCall,
        situation,
        28,
        9001 + gen * 31 + 500,
        false,
        candMotion,
        front,
        riskTolerance,
        spyRole,
        candDropback,
        candBlocking,
        dlStunt,
        matchCoverage,
        defTactic
      );
      const candScore = scoreSummary(candSummary);

      if (candScore > bestScore + 0.004) {
        accepted = true;
        bestPlay = candidate;
        bestMotion = candMotion;
        bestDropback = candDropback;
        bestBlocking = candBlocking;
        bestSummary = candSummary;
        bestScore = candScore;

        eliteArchive.push({
          play: clonePlay(bestPlay),
          motion: bestMotion,
          dropback: bestDropback,
          blocking: bestBlocking,
          score: bestScore,
        });
        eliteArchive.sort((a, b) => b.score - a.score);
        if (eliteArchive.length > 4) eliteArchive.pop();

        logs.push({
          generation: gen,
          objectiveScore: bestScore,
          meanEpa: bestSummary.meanEpa,
          medianEpa: bestSummary.medianEpa,
          stdEpa: bestSummary.stdEpa,
          goalRate: bestSummary.goalSuccessRate,
          epaSuccessRate: bestSummary.epaSuccessRate,
          sackRate: bestSummary.sackRate,
          compRate: bestSummary.completionRate,
          changeDescription: `ACCEPTED: ${desc}`,
        });
      }
    }

    // GUI update & event loop yield:
    // Update every accepted improvement OR every 10 generations OR on the final generation
    const shouldUpdateGui = accepted || gen % 10 === 0 || gen === generations;

    if (shouldUpdateGui) {
      const currentPercentile = computeOffensePercentile(bestSummary, situation);

      if (onProgress) {
        onProgress({
          generation: gen,
          maxGenerations: generations,
          bestScore,
          meanEpa: bestSummary.meanEpa,
          medianEpa: bestSummary.medianEpa,
          stdEpa: bestSummary.stdEpa,
          goalRate: bestSummary.goalSuccessRate,
          epaSuccessRate: bestSummary.epaSuccessRate,
          compRate: bestSummary.completionRate,
          sackRate: bestSummary.sackRate,
          currentBestPlay: clonePlay(bestPlay),
          currentMotion: bestMotion,
          currentDropback: bestDropback,
          currentBlocking: bestBlocking,
          latestChangeDesc: desc,
          accepted,
          logs: [...logs],
          offensePercentile: currentPercentile,
        });
      }

      // Yield execution to the browser UI thread so animations paint smoothly
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const finalSummary = runMonteCarloBatch(
    bestPlay,
    defConfigs,
    defCall,
    situation,
    250,
    42069,
    false,
    bestMotion,
    front,
    riskTolerance,
    spyRole,
    bestDropback,
    bestBlocking,
    dlStunt,
    matchCoverage,
    defTactic
  );
  return {
    optimizedOffense: bestPlay,
    optimizedMotion: bestMotion,
    optimizedDropback: bestDropback,
    optimizedBlocking: bestBlocking,
    logs,
    finalSummary,
    offensePercentile: computeOffensePercentile(finalSummary, situation),
  };
}

// ============================================================================
// DEFENSIVE COORDINATOR OBJECTIVE & TACTICS
// ============================================================================
export function scoreDefSummary(s: MonteCarloSummary, situation: SituationSpec): number {
  const goalWeight = situation.down >= 3 ? 1.25 : 0.85;
  return (
    -s.meanEpa -
    goalWeight * (s.goalSuccessRate / 100) -
    0.22 * s.medianEpa -
    0.15 * (s.epaSuccessRate / 100) +
    0.40 * (s.sackRate / 100) +
    0.30 * (s.pressureRate / 100) +
    0.45 * (s.intRate / 100)
  );
}

export const DEFENSIVE_TACTIC_PRESETS: Record<string, { name: string; spec: DefensiveTacticSpec; desc: string }> = {
  FANGIO_QUARTERS: {
    name: 'Fangio 2-High Quarters Match',
    spec: {
      defCall: 'COV4_QUARTERS',
      front: 'UNDER',
      dlStunt: 'AUTO',
      spyRole: 'NONE',
      matchCoverage: true,
      cbCushionY: 6.5,
      safetyDepthY: 14.5,
      underDepthY: 7.0,
    },
    desc: '2-High split-field match coverage capping explosive passing lanes; light box with late boundary fits.',
  },
  BELICHICK_COV1_PRESS: {
    name: 'Belichick Cover 1 Robber Press',
    spec: {
      defCall: 'COV1_ROBBER',
      front: 'UNDER',
      dlStunt: 'TE_TWIST',
      spyRole: 'NONE',
      matchCoverage: true,
      cbCushionY: 1.8,
      safetyDepthY: 10.0,
      underDepthY: 5.5,
    },
    desc: 'Physical press-man on outside receivers, single-high safety deep, with SS or LB lurking in the robber hole.',
  },
  TAMPA_2_DEEP: {
    name: 'Lovie Smith Tampa 2 Pole',
    spec: {
      defCall: 'COV2_TAMPA',
      front: 'OVER',
      dlStunt: 'ET_TWIST',
      spyRole: 'NONE',
      matchCoverage: true,
      cbCushionY: 4.5,
      safetyDepthY: 15.0,
      underDepthY: 8.5,
    },
    desc: '2-deep half safeties splitting the field while MLB sinks deep down the middle pole to erase seams.',
  },
  SPAGS_DOUBLE_A_GAP: {
    name: 'Spagnuolo / Macdonald A-Gap Blitz',
    spec: {
      defCall: 'ZERO_BLITZ',
      front: 'MUG_A',
      dlStunt: 'OVERLOAD_SLANT',
      spyRole: 'NONE',
      matchCoverage: false,
      cbCushionY: 2.0,
      safetyDepthY: 9.0,
      underDepthY: 4.5,
    },
    desc: 'Simulated 6-man mug pressure attacking protection slides with tight zero-cushion man lock outside.',
  },
  LEBEAU_FIRE_ZONE: {
    name: 'Dick LeBeau Fire Zone 3',
    spec: {
      defCall: 'FIRE_ZONE_3',
      front: 'UNDER',
      dlStunt: 'OVERLOAD_SLANT',
      spyRole: 'WLB',
      matchCoverage: true,
      cbCushionY: 5.5,
      safetyDepthY: 13.0,
      underDepthY: 6.0,
    },
    desc: '5-man zone dog pressure replacing a dropping defensive end into the boundary seam while capping 3-deep.',
  },
  SABAN_COVER_6: {
    name: 'Saban Cover 6 Split (QQH)',
    spec: {
      defCall: 'COV6_SPLIT',
      front: 'WIDE_9',
      dlStunt: 'AUTO',
      spyRole: 'NONE',
      matchCoverage: true,
      cbCushionY: 5.0,
      safetyDepthY: 14.0,
      underDepthY: 6.5,
    },
    desc: 'Quarter-Quarter-Half split field coverage: Quarters to passing strength, Cover 2 half to the boundary.',
  },
};

export interface DefensiveMutationProgress {
  generation: number;
  maxGenerations: number;
  bestDefScore: number;
  meanEpa: number;
  medianEpa: number;
  stdEpa: number;
  goalRate: number;
  epaSuccessRate: number;
  compRate: number;
  sackRate: number;
  pressureRate: number;
  intRate: number;
  currentTactic: DefensiveTacticSpec;
  latestChangeDesc: string;
  accepted: boolean;
  logs: {
    generation: number;
    objectiveScore: number;
    meanEpa: number;
    goalRate: number;
    sackRate: number;
    pressureRate: number;
    intRate: number;
    changeDescription: string;
  }[];
}

export async function mutateDefenseForRosterAsync(
  offensePlay: PlayerConfig[],
  defConfigs: PlayerConfig[],
  initialTactic: DefensiveTacticSpec,
  situation: SituationSpec,
  generations = 300,
  rolloutsPerCandidate = 35,
  motionId: PreSnapMotionId = 'NONE',
  riskTolerance = 0.55,
  dropbackType: DropbackType = 'STANDARD_DROP',
  blockingScheme: BlockingSchemeId = 'HALF_SLIDE',
  onProgress?: (progress: DefensiveMutationProgress) => void,
  abortSignal?: { aborted: boolean }
): Promise<{
  optimizedTactic: DefensiveTacticSpec;
  logs: DefensiveMutationProgress['logs'];
  finalSummary: MonteCarloSummary;
  defScore: number;
}> {
  let bestTactic: DefensiveTacticSpec = { ...initialTactic };
  let bestSummary = runMonteCarloBatch(
    offensePlay,
    defConfigs,
    bestTactic.defCall,
    situation,
    rolloutsPerCandidate,
    9101,
    false,
    motionId,
    bestTactic.front,
    riskTolerance,
    bestTactic.spyRole,
    dropbackType,
    blockingScheme,
    bestTactic.dlStunt,
    bestTactic.matchCoverage,
    bestTactic
  );
  let bestScore = scoreDefSummary(bestSummary, situation);

  const eliteArchive: { tactic: DefensiveTacticSpec; score: number }[] = [
    { tactic: { ...bestTactic }, score: bestScore },
  ];

  const logs: DefensiveMutationProgress['logs'] = [
    {
      generation: 0,
      objectiveScore: bestScore,
      meanEpa: bestSummary.meanEpa,
      goalRate: bestSummary.goalSuccessRate,
      sackRate: bestSummary.sackRate,
      pressureRate: bestSummary.pressureRate,
      intRate: bestSummary.intRate,
      changeDescription: `Baseline Defense (${bestTactic.defCall}, ${bestTactic.front}, Cushion ${bestTactic.cbCushionY.toFixed(1)}y) -> Offense EPA: ${bestSummary.meanEpa >= 0 ? '+' : ''}${bestSummary.meanEpa.toFixed(2)}`,
    },
  ];

  if (onProgress) {
    onProgress({
      generation: 0,
      maxGenerations: generations,
      bestDefScore: bestScore,
      meanEpa: bestSummary.meanEpa,
      medianEpa: bestSummary.medianEpa,
      stdEpa: bestSummary.stdEpa,
      goalRate: bestSummary.goalSuccessRate,
      epaSuccessRate: bestSummary.epaSuccessRate,
      compRate: bestSummary.completionRate,
      sackRate: bestSummary.sackRate,
      pressureRate: bestSummary.pressureRate,
      intRate: bestSummary.intRate,
      currentTactic: { ...bestTactic },
      latestChangeDesc: `Baseline Defensive Tactic Initialized`,
      accepted: true,
      logs: [...logs],
    });
  }

  const rng = new PRNG(888222);
  const COVERAGE_CHOICES: DefensiveCall[] = [
    'COV3',
    'COV1',
    'COV2',
    'COV4_QUARTERS',
    'COV6_SPLIT',
    'COV1_ROBBER',
    'COV2_TAMPA',
    'ZERO_BLITZ',
    'FIRE_ZONE_3',
  ];
  const FRONT_CHOICES: DefFront[] = ['OVER', 'UNDER', 'WIDE_9', 'MUG_A'];
  const STUNT_CHOICES: DLStuntType[] = ['AUTO', 'NONE', 'TE_TWIST', 'ET_TWIST', 'OVERLOAD_SLANT'];
  const SPY_CHOICES: DefSpyRole[] = ['NONE', 'WLB', 'SS', 'EDGE2'];

  for (let gen = 1; gen <= generations; gen++) {
    if (abortSignal?.aborted) break;

    const alpha = Math.max(0.18, 1.0 - 0.72 * (gen / generations));

    const parent =
      eliteArchive.length > 1 && rng.next() < 0.45
        ? eliteArchive[Math.floor(rng.next() * eliteArchive.length)].tactic
        : bestTactic;

    const candidate: DefensiveTacticSpec = { ...parent };
    const changeParts: string[] = [];

    // 1. Coverage Shell Perturbation
    if (rng.next() < 0.35) {
      const newCall = COVERAGE_CHOICES[Math.floor(rng.next() * COVERAGE_CHOICES.length)];
      if (newCall !== candidate.defCall) {
        candidate.defCall = newCall;
        changeParts.push(`Coverage -> ${newCall}`);
      }
    }

    // 2. Front Perturbation
    if (rng.next() < 0.28) {
      const newFront = FRONT_CHOICES[Math.floor(rng.next() * FRONT_CHOICES.length)];
      if (newFront !== candidate.front) {
        candidate.front = newFront;
        changeParts.push(`Front -> ${newFront}`);
      }
    }

    // 3. DL Stunt Perturbation
    if (rng.next() < 0.25) {
      const newStunt = STUNT_CHOICES[Math.floor(rng.next() * STUNT_CHOICES.length)];
      if (newStunt !== candidate.dlStunt) {
        candidate.dlStunt = newStunt;
        changeParts.push(`Stunt -> ${newStunt}`);
      }
    }

    // 4. Spy Role Perturbation
    if (rng.next() < 0.20) {
      const newSpy = SPY_CHOICES[Math.floor(rng.next() * SPY_CHOICES.length)];
      if (newSpy !== candidate.spyRole) {
        candidate.spyRole = newSpy;
        changeParts.push(`Spy -> ${newSpy}`);
      }
    }

    // 5. Match Coverage Toggle
    if (rng.next() < 0.18) {
      candidate.matchCoverage = !candidate.matchCoverage;
      changeParts.push(`Match -> ${candidate.matchCoverage ? 'ON' : 'OFF'}`);
    }

    // 6. Continuous Depths & Cushions
    if (rng.next() < 0.65 || changeParts.length === 0) {
      const deltaCushion = (rng.next() - 0.5) * 2.4 * alpha;
      const deltaSafety = (rng.next() - 0.5) * 3.0 * alpha;
      const deltaUnder = (rng.next() - 0.5) * 2.2 * alpha;

      candidate.cbCushionY = Math.max(1.5, Math.min(8.5, candidate.cbCushionY + deltaCushion));
      candidate.safetyDepthY = Math.max(8.5, Math.min(16.5, candidate.safetyDepthY + deltaSafety));
      candidate.underDepthY = Math.max(3.5, Math.min(9.5, candidate.underDepthY + deltaUnder));

      if (Math.abs(deltaCushion) > 0.3) {
        changeParts.push(`Cushion ${candidate.cbCushionY.toFixed(1)}y`);
      }
    }

    const desc = changeParts.join(', ') || 'Micro depth adjustments';

    const candSummary = runMonteCarloBatch(
      offensePlay,
      defConfigs,
      candidate.defCall,
      situation,
      rolloutsPerCandidate,
      gen * 53 + 37,
      false,
      motionId,
      candidate.front,
      riskTolerance,
      candidate.spyRole,
      dropbackType,
      blockingScheme,
      candidate.dlStunt,
      candidate.matchCoverage,
      candidate
    );

    const candScore = scoreDefSummary(candSummary, situation);
    let accepted = false;

    if (candScore > bestScore + 0.003) {
      accepted = true;
      bestTactic = { ...candidate };
      bestSummary = candSummary;
      bestScore = candScore;

      eliteArchive.push({ tactic: { ...bestTactic }, score: bestScore });
      eliteArchive.sort((a, b) => b.score - a.score);
      if (eliteArchive.length > 4) eliteArchive.pop();

      logs.push({
        generation: gen,
        objectiveScore: bestScore,
        meanEpa: bestSummary.meanEpa,
        goalRate: bestSummary.goalSuccessRate,
        sackRate: bestSummary.sackRate,
        pressureRate: bestSummary.pressureRate,
        intRate: bestSummary.intRate,
        changeDescription: `ACCEPTED DEFENSE: ${desc}`,
      });
    }

    const shouldUpdateGui = accepted || gen % 10 === 0 || gen === generations;
    if (shouldUpdateGui) {
      if (onProgress) {
        onProgress({
          generation: gen,
          maxGenerations: generations,
          bestDefScore: bestScore,
          meanEpa: bestSummary.meanEpa,
          medianEpa: bestSummary.medianEpa,
          stdEpa: bestSummary.stdEpa,
          goalRate: bestSummary.goalSuccessRate,
          epaSuccessRate: bestSummary.epaSuccessRate,
          compRate: bestSummary.completionRate,
          sackRate: bestSummary.sackRate,
          pressureRate: bestSummary.pressureRate,
          intRate: bestSummary.intRate,
          currentTactic: { ...bestTactic },
          latestChangeDesc: accepted ? `Accepted: ${desc}` : `Evaluated: ${desc}`,
          accepted,
          logs: [...logs],
        });
      }
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const finalSummary = runMonteCarloBatch(
    offensePlay,
    defConfigs,
    bestTactic.defCall,
    situation,
    250,
    777888,
    false,
    motionId,
    bestTactic.front,
    riskTolerance,
    bestTactic.spyRole,
    dropbackType,
    blockingScheme,
    bestTactic.dlStunt,
    bestTactic.matchCoverage,
    bestTactic
  );

  return {
    optimizedTactic: bestTactic,
    logs,
    finalSummary,
    defScore: scoreDefSummary(finalSummary, situation),
  };
}

// ============================================================================
// ADVERSARIAL TICK-TOCK CO-EVOLUTION ENGINE
// ============================================================================
export interface CoEvolutionRoundResult {
  round: number;
  phase: 'INIT' | 'TICK_OFFENSE' | 'TOCK_DEFENSE';
  title: string;
  offensePlay: PlayerConfig[];
  motion: PreSnapMotionId;
  dropback: DropbackType;
  blocking: BlockingSchemeId;
  defTactic: DefensiveTacticSpec;
  summary: MonteCarloSummary;
  deltaEpa: number;
  narrative: string;
}

export interface CoEvolutionProgress {
  currentRound: number;
  totalRounds: number;
  activePhase: 'TICK_OFFENSE' | 'TOCK_DEFENSE';
  phaseIndex: number;
  totalPhases: number;
  percentComplete: number;
  latestResult: CoEvolutionRoundResult;
  history: CoEvolutionRoundResult[];
  isNashConverged: boolean;
}

export async function runAdversarialCoEvolutionAsync(
  initialOffense: PlayerConfig[],
  defConfigs: PlayerConfig[],
  initialDefTactic: DefensiveTacticSpec,
  situation: SituationSpec,
  rounds = 4,
  generationsPerPhase = 60,
  rolloutsPerCandidate = 25,
  onProgress?: (progress: CoEvolutionProgress) => void,
  abortSignal?: { aborted: boolean },
  earlyExitOnNash = true
): Promise<{
  history: CoEvolutionRoundResult[];
  finalOffense: PlayerConfig[];
  finalMotion: PreSnapMotionId;
  finalDropback: DropbackType;
  finalBlocking: BlockingSchemeId;
  finalDefTactic: DefensiveTacticSpec;
  isNashConverged: boolean;
}> {
  let curOffense = clonePlay(initialOffense);
  let curMotion: PreSnapMotionId = 'NONE';
  let curDropback: DropbackType = 'STANDARD_DROP';
  let curBlocking: BlockingSchemeId = 'HALF_SLIDE';
  let curDefTactic: DefensiveTacticSpec = { ...initialDefTactic };

  const history: CoEvolutionRoundResult[] = [];
  const totalPhases = rounds * 2;

  // 1. Initial Baseline Monte Carlo
  const initSummary = runMonteCarloBatch(
    curOffense,
    defConfigs,
    curDefTactic.defCall,
    situation,
    150,
    12345,
    false,
    curMotion,
    curDefTactic.front,
    0.55,
    curDefTactic.spyRole,
    curDropback,
    curBlocking,
    curDefTactic.dlStunt,
    curDefTactic.matchCoverage,
    curDefTactic
  );

  const initResult: CoEvolutionRoundResult = {
    round: 0,
    phase: 'INIT',
    title: 'Baseline Alignment',
    offensePlay: clonePlay(curOffense),
    motion: curMotion,
    dropback: curDropback,
    blocking: curBlocking,
    defTactic: { ...curDefTactic },
    summary: initSummary,
    deltaEpa: 0,
    narrative: `Initial matchup: Offense base play vs ${curDefTactic.defCall} (${curDefTactic.front}). EPA: ${initSummary.meanEpa >= 0 ? '+' : ''}${initSummary.meanEpa.toFixed(2)}, Goal: ${initSummary.goalSuccessRate.toFixed(0)}%.`,
  };
  history.push(initResult);

  let prevEpa = initSummary.meanEpa;
  let isNashConverged = false;

  for (let r = 1; r <= rounds; r++) {
    if (abortSignal?.aborted) break;

    // -------------------------------------------------------------
    // PHASE 1: TICK - OFFENSIVE COORDINATOR ADAPTS AGAINST curDefTactic
    // -------------------------------------------------------------
    const tickPhaseIdx = (r - 1) * 2 + 1;
    if (onProgress) {
      onProgress({
        currentRound: r,
        totalRounds: rounds,
        activePhase: 'TICK_OFFENSE',
        phaseIndex: tickPhaseIdx,
        totalPhases,
        percentComplete: Math.round(((tickPhaseIdx - 1) / totalPhases) * 100),
        latestResult: history[history.length - 1],
        history: [...history],
        isNashConverged: false,
      });
    }

    const offResult = await mutatePlayForRosterAsync(
      curOffense,
      defConfigs,
      curDefTactic.defCall,
      situation,
      generationsPerPhase,
      rolloutsPerCandidate,
      curMotion,
      curDefTactic.front,
      0.55,
      curDefTactic.spyRole,
      curDropback,
      curBlocking,
      curDefTactic.dlStunt,
      curDefTactic.matchCoverage,
      undefined,
      abortSignal,
      curDefTactic
    );

    curOffense = clonePlay(offResult.optimizedOffense);
    curMotion = offResult.optimizedMotion;
    curDropback = offResult.optimizedDropback;
    curBlocking = offResult.optimizedBlocking;

    const tickDelta = offResult.finalSummary.meanEpa - prevEpa;
    prevEpa = offResult.finalSummary.meanEpa;

    const tickNarrative = `Round ${r} TICK (Offense): Countered ${curDefTactic.defCall} by tuning route stems, ${curMotion !== 'NONE' ? `adding ${curMotion}` : 're-spacing splits'}, and adjusting blocking to ${curBlocking}. EPA shifted ${tickDelta >= 0 ? '+' : ''}${tickDelta.toFixed(2)} to ${prevEpa >= 0 ? '+' : ''}${prevEpa.toFixed(2)} (Goal: ${offResult.finalSummary.goalSuccessRate.toFixed(0)}%).`;

    const tickResult: CoEvolutionRoundResult = {
      round: r,
      phase: 'TICK_OFFENSE',
      title: `Round ${r} TICK: Offense Exploits Defense`,
      offensePlay: clonePlay(curOffense),
      motion: curMotion,
      dropback: curDropback,
      blocking: curBlocking,
      defTactic: { ...curDefTactic },
      summary: offResult.finalSummary,
      deltaEpa: tickDelta,
      narrative: tickNarrative,
    };
    history.push(tickResult);

    if (onProgress) {
      onProgress({
        currentRound: r,
        totalRounds: rounds,
        activePhase: 'TICK_OFFENSE',
        phaseIndex: tickPhaseIdx,
        totalPhases,
        percentComplete: Math.round((tickPhaseIdx / totalPhases) * 100),
        latestResult: tickResult,
        history: [...history],
        isNashConverged: false,
      });
    }

    if (abortSignal?.aborted) break;

    // -------------------------------------------------------------
    // PHASE 2: TOCK - DEFENSIVE COORDINATOR ADAPTS AGAINST curOffense
    // -------------------------------------------------------------
    const tockPhaseIdx = (r - 1) * 2 + 2;
    if (onProgress) {
      onProgress({
        currentRound: r,
        totalRounds: rounds,
        activePhase: 'TOCK_DEFENSE',
        phaseIndex: tockPhaseIdx,
        totalPhases,
        percentComplete: Math.round(((tockPhaseIdx - 1) / totalPhases) * 100),
        latestResult: history[history.length - 1],
        history: [...history],
        isNashConverged: false,
      });
    }

    const defResult = await mutateDefenseForRosterAsync(
      curOffense,
      defConfigs,
      curDefTactic,
      situation,
      generationsPerPhase,
      rolloutsPerCandidate,
      curMotion,
      0.55,
      curDropback,
      curBlocking,
      undefined,
      abortSignal
    );

    curDefTactic = { ...defResult.optimizedTactic };
    const tockDelta = defResult.finalSummary.meanEpa - prevEpa;
    prevEpa = defResult.finalSummary.meanEpa;

    const tockNarrative = `Round ${r} TOCK (Defense): Countered offensive adaptation by pivoting shell to ${curDefTactic.defCall} (${curDefTactic.front}), setting cushion to ${curDefTactic.cbCushionY.toFixed(1)}y, and dialing ${curDefTactic.dlStunt} stunt. EPA pushed down ${tockDelta >= 0 ? '+' : ''}${tockDelta.toFixed(2)} to ${prevEpa >= 0 ? '+' : ''}${prevEpa.toFixed(2)} (Sack: ${defResult.finalSummary.sackRate.toFixed(1)}%, Int: ${defResult.finalSummary.intRate.toFixed(1)}%).`;

    const tockResult: CoEvolutionRoundResult = {
      round: r,
      phase: 'TOCK_DEFENSE',
      title: `Round ${r} TOCK: Defense Counters Offense`,
      offensePlay: clonePlay(curOffense),
      motion: curMotion,
      dropback: curDropback,
      blocking: curBlocking,
      defTactic: { ...curDefTactic },
      summary: defResult.finalSummary,
      deltaEpa: tockDelta,
      narrative: tockNarrative,
    };
    history.push(tockResult);

    // Check Nash Convergence criterion: if last 2 phases had |deltaEpa| < 0.14
    if (Math.abs(tickDelta) < 0.14 && Math.abs(tockDelta) < 0.14) {
      isNashConverged = true;
    }

    if (onProgress) {
      onProgress({
        currentRound: r,
        totalRounds: rounds,
        activePhase: 'TOCK_DEFENSE',
        phaseIndex: tockPhaseIdx,
        totalPhases,
        percentComplete: Math.round((tockPhaseIdx / totalPhases) * 100),
        latestResult: tockResult,
        history: [...history],
        isNashConverged,
      });
    }

    if (earlyExitOnNash && isNashConverged && r >= 3) {
      break;
    }
  }

  return {
    history,
    finalOffense: curOffense,
    finalMotion: curMotion,
    finalDropback: curDropback,
    finalBlocking: curBlocking,
    finalDefTactic: curDefTactic,
    isNashConverged,
  };
}



// ============================================================================
// CANONICAL OFFENSIVE CONCEPTS & PLAYBOOK ARCHETYPES
// ============================================================================
export type OffensiveConceptId =
  | 'MESH'
  | 'DAGGER'
  | 'STICK_NOD'
  | 'FLOOD_SAIL'
  | 'PA_YANKEE'
  | 'SMASH_DIVIDE'
  | 'MILLS_POST_DIG'
  | 'HOOK_LATERAL'
  | 'EVO_PA_SHOT'
  | 'EVO_RUB_QUICK'
  | 'EVO_FLAP_DIG'
  | 'EVO_ORBIT_SHOT'
  | 'EVO_RZ_PYLON'
  | 'RUN_PIN_PULL'
  | 'RUN_GT_COUNTER'
  | 'RUN_INSIDE_ZONE'
  | 'RUN_OUTSIDE_ZONE'
  | 'THEO_SWEEP_TOSS'
  | 'THEO_QB_POWER_DRAW'
  | 'THEO_PA_BOOT_SHOT'
  | 'THEO_INSERT_HOT_LEAK';

export interface RouteSpec {
  readOrder: number;
  waypoints: Vec2[];
  roleDesc: string;
  role?: OffensiveRole;
  breakStyle?: RouteBreakStyle;
  choiceRules?: ChoiceRouteRule[];
}

export interface OffensiveConceptSpec {
  id: OffensiveConceptId;
  name: string;
  category: 'QUICK' | 'INTERMEDIATE' | 'DEEP_SHOT' | 'PLAY_ACTION' | 'TRICK' | 'RUN';
  shortDesc: string;
  primaryCoverageBeater: string;
  dropbackType: DropbackType;
  recommendedMotion: PreSnapMotionId;
  recommendedBlocking?: BlockingSchemeId;
  routes: Record<string, RouteSpec>; // keyed by player id ('WR1', 'SLOT', 'TE', 'WR2', 'RB')
}

export const OFFENSIVE_CONCEPTS: Record<OffensiveConceptId, OffensiveConceptSpec> = {
  MESH: {
    id: 'MESH',
    name: 'Air Raid Mesh (Rub / Pick)',
    category: 'QUICK',
    shortDesc: 'Crossing shallow drags rub underneath man coverage with a middle sit option.',
    primaryCoverageBeater: 'Man-to-Man (Cov 0, Cov 1) & Soft Underneath Zones',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'NONE',
    routes: {
      WR1: {
        readOrder: 3,
        waypoints: [{ x: -17.5, y: 12.0 }, { x: -6.0, y: 12.5 }], // 12y Dig over the top
        roleDesc: 'Deep Dig (Over-the-ball clearance)',
      },
      SLOT: {
        readOrder: 1,
        waypoints: [{ x: -8.5, y: 2.0 }, { x: 12.0, y: 2.5 }], // Shallow Drag Right
        roleDesc: 'Shallow Drag Under (Sets pick for TE drag)',
      },
      TE: {
        readOrder: 2,
        waypoints: [{ x: 4.9, y: 3.5 }, { x: -14.0, y: 4.0 }], // Shallow Drag Left
        roleDesc: 'Shallow Drag Over (Rubs off Slot drag)',
      },
      WR2: {
        readOrder: 4,
        waypoints: [{ x: 16.5, y: 14.0 }, { x: 16.5, y: 24.0 }], // Backside Go
        roleDesc: 'Backside Go / Alert (Pre-snap fade vs single coverage)',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: 0.0, y: 5.5 }], // Check-and-Release Hook / Sit
        roleDesc: 'Middle Sit / Checkdown in vacated hole',
      },
    },
  },

  DAGGER: {
    id: 'DAGGER',
    name: '7-Step Dagger (High-Low Seam-Dig)',
    category: 'INTERMEDIATE',
    shortDesc: 'Deep vertical seam clears middle safety; 16-yard basic dig strikes underneath.',
    primaryCoverageBeater: 'Cover 3 & Cover 4 Quarters',
    dropbackType: 'STANDARD_DROP',
    recommendedMotion: 'JET_L_TO_R',
    routes: {
      WR1: {
        readOrder: 1,
        waypoints: [{ x: -17.5, y: 15.5 }, { x: -2.0, y: 16.0 }], // 16y Dagger Dig
        roleDesc: 'Primary 16-Yard Basic Dig',
      },
      SLOT: {
        readOrder: 2,
        waypoints: [{ x: -8.5, y: 14.0 }, { x: -5.0, y: 25.0 }], // Seam Clear-Out
        roleDesc: 'Vertical Seam Clear-Out (Pushes MOF Safety)',
      },
      TE: {
        readOrder: 3,
        waypoints: [{ x: 4.9, y: 5.5 }, { x: 4.9, y: 6.0 }], // 6y Underneath Drag / Pivot
        roleDesc: 'Underneath Pivot / Shallow Outlet',
      },
      WR2: {
        readOrder: 4,
        waypoints: [{ x: 16.5, y: 12.0 }, { x: 20.0, y: 14.0 }], // Deep Out / Comeback
        roleDesc: 'Boundary Comeback / Hole Shot',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: -4.0, y: -1.0 }, { x: -11.0, y: 1.5 }], // Check-release flat
        roleDesc: 'Check-Release Flat Outlet',
      },
    },
  },

  STICK_NOD: {
    id: 'STICK_NOD',
    name: 'Quick Stick-Nod (Option-Break)',
    category: 'QUICK',
    shortDesc: '3-step rhythm stick route with a double-move nod if defender undercuts.',
    primaryCoverageBeater: 'Cover 3 Match & Underneath Zone Drops',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'NONE',
    routes: {
      WR1: {
        readOrder: 3,
        waypoints: [{ x: -17.5, y: 6.0 }, { x: -17.5, y: 6.0 }], // 6y Hitch
        roleDesc: 'Quick Hitch on the Boundary',
      },
      SLOT: {
        readOrder: 1,
        waypoints: [{ x: -8.5, y: 5.0 }, { x: -5.5, y: 5.2 }], // 5y Stick Option
        roleDesc: 'Primary 5y Stick (Turn in / Out based on leverage)',
      },
      TE: {
        readOrder: 2,
        waypoints: [{ x: 4.9, y: 5.0 }, { x: 7.0, y: 14.0 }], // Stick-Nod Double Move
        roleDesc: 'Stick-Nod Double Move (Bites flat defender, breaks seam)',
      },
      WR2: {
        readOrder: 4,
        waypoints: [{ x: 16.5, y: 8.0 }, { x: 22.0, y: 10.0 }], // 8y Speed Out
        roleDesc: 'Field Speed Out',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: -2.0, y: -2.0 }, { x: -9.5, y: -0.5 }], // Quick Swing
        roleDesc: 'Quick Swing to stretch flat horizontally',
      },
    },
  },

  FLOOD_SAIL: {
    id: 'FLOOD_SAIL',
    name: '3-Level Flood / Sail',
    category: 'INTERMEDIATE',
    shortDesc: '3 receivers stack the sideline at 3 distinct levels (Go, 12y Sail, Flat).',
    primaryCoverageBeater: 'Cover 3 & Cover 4 Sideline Stress',
    dropbackType: 'STANDARD_DROP',
    recommendedMotion: 'NONE',
    routes: {
      WR1: {
        readOrder: 4,
        waypoints: [{ x: -17.5, y: 12.0 }, { x: -5.0, y: 14.0 }], // Backside Post-Dig
        roleDesc: 'Backside Post-Dig (Alert vs Cover 1)',
      },
      SLOT: {
        readOrder: 1,
        waypoints: [{ x: 9.0, y: 11.5 }, { x: 17.5, y: 12.0 }], // 12y Intermediate Sail Out
        roleDesc: 'Primary Intermediate Sail Route (12y Out)',
      },
      TE: {
        readOrder: 3,
        waypoints: [{ x: 6.0, y: 14.0 }, { x: 10.0, y: 24.0 }], // Deep Clear-out Streak
        roleDesc: 'Deep Clear-out Streak (Pushes CB deep)',
      },
      WR2: {
        readOrder: 2,
        waypoints: [{ x: 17.0, y: 2.0 }, { x: 22.5, y: 2.5 }], // Flat Route
        roleDesc: 'Underneath Flat Route (Holds Curl/Flat LB)',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: -3.0, y: -2.0 }, { x: 0.0, y: 3.5 }], // Check-and-Release Hook
        roleDesc: 'Backside Checkdown Hook',
      },
    },
  },

  PA_YANKEE: {
    id: 'PA_YANKEE',
    name: 'Play-Action Yankee (Deep Over & Post)',
    category: 'PLAY_ACTION',
    shortDesc: 'Hard play-action fake freezes linebackers; deep over crosser creates explosive chunk.',
    primaryCoverageBeater: 'Cover 1, Cover 3 & Cover 2 Hole Shots',
    dropbackType: 'PLAY_ACTION',
    recommendedMotion: 'ORBIT_RETURN',
    routes: {
      WR1: {
        readOrder: 1,
        waypoints: [{ x: -17.5, y: 10.0 }, { x: 12.0, y: 16.5 }], // Deep Over Crosser
        roleDesc: 'Primary Deep Over Crosser (16-18y depth across field)',
      },
      SLOT: {
        readOrder: 3,
        waypoints: [{ x: -8.5, y: 4.0 }, { x: -8.5, y: 4.5 }], // 4y Check Hook
        roleDesc: 'Check Hook / Checkdown',
      },
      TE: {
        readOrder: 4,
        waypoints: [{ x: 4.9, y: 0.0 }, { x: 4.9, y: 0.0 }], // Max Protect / Chip
        roleDesc: 'Protection Chip & Seal Edge',
      },
      WR2: {
        readOrder: 2,
        waypoints: [{ x: 16.5, y: 13.0 }, { x: 4.0, y: 23.0 }], // Deep Post (Clear MOF)
        roleDesc: 'Deep Post Clear-Out (Forces safety to vacate crosser)',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: -1.0, y: -1.5 }, { x: -6.0, y: 1.0 }], // PA fake mesh then leak flat
        roleDesc: 'Play-Action Mesh Fake then Flat Leak',
      },
    },
  },

  SMASH_DIVIDE: {
    id: 'SMASH_DIVIDE',
    name: 'Smash-Divide (2-High Beater)',
    category: 'INTERMEDIATE',
    shortDesc: '5-yard hitch locks boundary cornerback while corner route attacks overtop.',
    primaryCoverageBeater: 'Cover 2 Tampa & 2-High Quarters',
    dropbackType: 'STANDARD_DROP',
    recommendedMotion: 'NONE',
    routes: {
      WR1: {
        readOrder: 1,
        waypoints: [{ x: -17.5, y: 5.5 }, { x: -17.5, y: 5.5 }], // 5y Hitch
        roleDesc: 'Smash Hitch (Bites outside CB)',
      },
      SLOT: {
        readOrder: 2,
        waypoints: [{ x: -8.5, y: 10.0 }, { x: -16.0, y: 15.0 }], // 12y Corner Route
        roleDesc: 'Smash Corner (Exploits soft Cover 2 hole)',
      },
      TE: {
        readOrder: 3,
        waypoints: [{ x: 4.9, y: 12.0 }, { x: 0.0, y: 22.0 }], // Middle Post Divide
        roleDesc: 'Middle Post Divide (Splits 2-high safeties)',
      },
      WR2: {
        readOrder: 4,
        waypoints: [{ x: 16.5, y: 6.0 }, { x: 21.0, y: 7.0 }], // Speed Out
        roleDesc: 'Backside Speed Out',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: 1.5, y: -2.0 }, { x: 7.5, y: 1.5 }], // Check-release flat
        roleDesc: 'Check-Release Flat Checkdown',
      },
    },
  },

  MILLS_POST_DIG: {
    id: 'MILLS_POST_DIG',
    name: 'Mills Post-Dig (MOFC Beater)',
    category: 'DEEP_SHOT',
    shortDesc: 'Deep post pins the single-high safety; square-in dig breaks into the vacated middle.',
    primaryCoverageBeater: 'Cover 3 & Cover 1 Single-High Safety',
    dropbackType: 'STANDARD_DROP',
    recommendedMotion: 'NONE',
    routes: {
      WR1: {
        readOrder: 2,
        waypoints: [{ x: -17.5, y: 12.0 }, { x: -3.0, y: 12.5 }], // 12y Square In / Dig
        roleDesc: 'Primary Square-In Dig (Underneath Post)',
      },
      SLOT: {
        readOrder: 4,
        waypoints: [{ x: -8.5, y: 4.5 }, { x: -13.0, y: 5.0 }], // Quick Out
        roleDesc: 'Underneath Quick Out',
      },
      TE: {
        readOrder: 3,
        waypoints: [{ x: 4.9, y: 6.0 }, { x: 4.9, y: 6.5 }], // Shallow Drag / Curl
        roleDesc: 'Shallow Curl Outlet',
      },
      WR2: {
        readOrder: 1,
        waypoints: [{ x: 16.5, y: 12.5 }, { x: 4.0, y: 24.0 }], // Deep Post
        roleDesc: 'Deep Post Shot (Pins single-high safety)',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: -2.5, y: -2.0 }, { x: -9.0, y: 0.5 }], // Flat checkdown
        roleDesc: 'Check-Release Flat Checkdown',
      },
    },
  },

  HOOK_LATERAL: {
    id: 'HOOK_LATERAL',
    name: 'Hook & Lateral (Designed Pitch Package)',
    category: 'TRICK',
    shortDesc: 'Receiver settles in intermediate zone, catching pass and pitching to trailing speedster.',
    primaryCoverageBeater: 'Prevent & Deep Zone Coverage Shells',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'RB_FLAP_OUT',
    routes: {
      WR1: {
        readOrder: 1,
        waypoints: [{ x: -17.5, y: 9.5 }, { x: -15.0, y: 10.0 }], // 10y Stop / Curl Catch Spot
        roleDesc: 'Primary Catch Receiver (Secures ball, sets pitch platform)',
      },
      SLOT: {
        readOrder: 2,
        waypoints: [{ x: -8.5, y: 3.5 }, { x: -14.0, y: 8.5 }], // Trailing Pitch Pitcher / Pitch Track
        roleDesc: 'Designated Pitch Trailer (Sprints into lateral lane 3y behind WR1)',
      },
      TE: {
        readOrder: 3,
        waypoints: [{ x: 4.9, y: 7.0 }, { x: 4.9, y: 7.5 }], // Intermediate Hook
        roleDesc: 'Field Hook / Intermediate Distraction',
      },
      WR2: {
        readOrder: 4,
        waypoints: [{ x: 16.5, y: 14.0 }, { x: 16.5, y: 22.0 }], // Go route
        roleDesc: 'Field Clear-Out Go',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: -3.0, y: -2.0 }, { x: -8.0, y: 2.0 }], // Secondary Pitch Option
        roleDesc: 'Secondary Pitch Track / Release',
      },
    },
  },

  EVO_PA_SHOT: {
    id: 'EVO_PA_SHOT',
    name: 'AI Champion: PA Yankee Divide (1st & 10 vs Cov 3)',
    category: 'PLAY_ACTION',
    shortDesc: '2000-gen evolved play-action deep shot; half-slide protection with 22y corner-divide behind sinking CB3.',
    primaryCoverageBeater: 'Cover 3 Sky / Deep 1-High MOFC',
    dropbackType: 'PLAY_ACTION',
    recommendedMotion: 'NONE',
    recommendedBlocking: 'HALF_SLIDE',
    routes: {
      WR1: {
        readOrder: 1,
        waypoints: [{ x: -18.5, y: 22.0 }],
        roleDesc: 'Deep Corner/Divide (Clears deep 1/3 CB)',
      },
      SLOT: {
        readOrder: 2,
        waypoints: [{ x: 9.0, y: 12.0 }],
        roleDesc: 'Intermediate Crosser (Bridges seam void)',
      },
      TE: {
        readOrder: 3,
        waypoints: [{ x: 4.5, y: 4.0 }, { x: -6.0, y: 4.5 }],
        roleDesc: 'Underneath Drag (Holds curl/flat defender)',
      },
      WR2: {
        readOrder: 4,
        waypoints: [{ x: 18.0, y: 14.0 }],
        roleDesc: 'Backside Deep Out (Clearout)',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: -2.0, y: 5.4 }, { x: -10.3, y: 7.3 }],
        roleDesc: 'PA Fake & Arrow Escape Checkdown',
      },
    },
  },

  EVO_RUB_QUICK: {
    id: 'EVO_RUB_QUICK',
    name: 'AI Champion: Quick Rub Pick (3rd & 3 vs Cov 1)',
    category: 'QUICK',
    shortDesc: '2000-gen evolved man-beater; quick 4y rub lines create natural boundary picks with 2.8y separation.',
    primaryCoverageBeater: 'Cover 1 Robber / Man-Press Coverage',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'NONE',
    recommendedBlocking: 'BIG_ON_BIG',
    routes: {
      WR1: {
        readOrder: 1,
        waypoints: [{ x: -18.5, y: 22.0 }],
        roleDesc: 'Deep Boundary Clearout Go',
      },
      SLOT: {
        readOrder: 2,
        waypoints: [{ x: 11.5, y: 4.0 }, { x: 2.5, y: 4.4 }],
        roleDesc: 'Underneath Rub / Whip (Picks defender)',
      },
      TE: {
        readOrder: 3,
        waypoints: [{ x: 4.5, y: 5.0 }],
        roleDesc: 'Quick Hitch in intermediate hole',
      },
      WR2: {
        readOrder: 4,
        waypoints: [{ x: 18.5, y: 4.0 }, { x: 9.5, y: 4.4 }],
        roleDesc: 'Inside Mesh Rub (Capitalizes on pick separation)',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: -1.1, y: 4.0 }, { x: -7.6, y: 4.0 }],
        roleDesc: 'Chip-and-Release Flat (Safety valve)',
        role: 'CHIP_RELEASE',
      },
    },
  },

  EVO_FLAP_DIG: {
    id: 'EVO_FLAP_DIG',
    name: 'AI Champion: Flap Motion Dig (3rd & 10 vs Cov 4)',
    category: 'INTERMEDIATE',
    shortDesc: '2000-gen evolved sticks beater; backfield motion spreads Quarters safeties while dig breaks at 11.4y.',
    primaryCoverageBeater: 'Cover 4 Quarters / 2-High Shells',
    dropbackType: 'STANDARD_DROP',
    recommendedMotion: 'RB_FLAP_OUT',
    recommendedBlocking: 'BIG_ON_BIG',
    routes: {
      WR1: {
        readOrder: 1,
        waypoints: [{ x: -18.5, y: 11.0 }, { x: -9.5, y: 11.4 }],
        roleDesc: 'Primary Dig (Breaks 1.4y past the sticks)',
      },
      SLOT: {
        readOrder: 2,
        waypoints: [{ x: 8.5, y: 8.0 }, { x: -2.3, y: 4.6 }],
        roleDesc: 'Underneath Angle Crosser',
      },
      TE: {
        readOrder: 3,
        waypoints: [{ x: 4.8, y: 10.0 }, { x: 12.3, y: 16.5 }],
        roleDesc: 'Deep Out / High Corner Alert',
      },
      RB: {
        readOrder: 4,
        waypoints: [{ x: -2.0, y: 6.0 }, { x: -8.5, y: 6.0 }],
        roleDesc: 'Motion Flat Out / Pulls Curl Defender',
      },
      WR2: {
        readOrder: 5,
        waypoints: [{ x: 18.5, y: 11.0 }, { x: 9.5, y: 11.4 }],
        roleDesc: 'Opposite Dig / Boundary Conversion',
      },
    },
  },

  EVO_ORBIT_SHOT: {
    id: 'EVO_ORBIT_SHOT',
    name: 'AI Champion: Orbit Post Shot (2nd & 2 vs Cov 2)',
    category: 'PLAY_ACTION',
    shortDesc: '2000-gen evolved shot; Orbit motion + PA fake freeze Tampa-2 MLB for 0.45s, creating deep honey-hole post.',
    primaryCoverageBeater: 'Cover 2 Tampa / Middle Hole Void',
    dropbackType: 'PLAY_ACTION',
    recommendedMotion: 'ORBIT_RETURN',
    recommendedBlocking: 'BIG_ON_BIG',
    routes: {
      RB: {
        readOrder: 1,
        waypoints: [],
        roleDesc: 'Pass Protection Max-Anchor',
        role: 'PASS_BLOCK',
      },
      SLOT: {
        readOrder: 2,
        waypoints: [{ x: 11.5, y: 22.0 }],
        roleDesc: 'Deep Honey-Hole Split Post (Splits 2-high safeties)',
      },
      WR2: {
        readOrder: 3,
        waypoints: [{ x: 18.5, y: 3.5 }, { x: 9.5, y: 3.9 }],
        roleDesc: 'Under Drag (Freezes linebackers)',
      },
      TE: {
        readOrder: 4,
        waypoints: [{ x: 4.5, y: 6.0 }],
        roleDesc: 'Intermediate Seam / Sit',
      },
      WR1: {
        readOrder: 5,
        waypoints: [{ x: -18.5, y: 3.5 }, { x: -9.5, y: 3.9 }],
        roleDesc: 'Under Drag (Boundary Pin)',
      },
    },
  },

  EVO_RZ_PYLON: {
    id: 'EVO_RZ_PYLON',
    name: 'AI Champion: Red Zone Pylon (2nd & 8 vs Cov 2)',
    category: 'QUICK',
    shortDesc: '2000-gen evolved red zone strike; dual pylon breaks capitalize on compressed endzone boundaries.',
    primaryCoverageBeater: 'Red Zone Match / Goal Line Cover 2',
    dropbackType: 'STANDARD_DROP',
    recommendedMotion: 'NONE',
    recommendedBlocking: 'HALF_SLIDE',
    routes: {
      WR1: {
        readOrder: 1,
        waypoints: [{ x: -18.5, y: 2.0 }, { x: -8.2, y: 7.9 }],
        roleDesc: 'Front Pylon Quick Out / Catch Point',
      },
      WR2: {
        readOrder: 2,
        waypoints: [{ x: 17.1, y: 9.0 }, { x: 8.1, y: 9.4 }],
        roleDesc: 'Back Pylon Boundary Pivot',
      },
      TE: {
        readOrder: 3,
        waypoints: [{ x: 4.5, y: 7.0 }],
        roleDesc: 'Goal-Line Settle Hook',
      },
      SLOT: {
        readOrder: 4,
        waypoints: [{ x: 11.5, y: 6.0 }, { x: 18.0, y: 6.0 }],
        roleDesc: 'Corner Fade Clearout',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: -2.0, y: 14.5 }],
        roleDesc: 'Back-of-Endzone Rail Route',
      },
    },
  },

  RUN_PIN_PULL: {
    id: 'RUN_PIN_PULL',
    name: 'Pin-and-Pull Sweep (RG/RT Pull + TE Seal)',
    category: 'RUN',
    shortDesc: 'Frontside pins down inside; RG kicks edge, RT wraps alley. RB sweeps wide then bursts north.',
    primaryCoverageBeater: 'Over/Under Fronts & Light 2-High Shells (C2/C4)',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'NONE',
    recommendedBlocking: 'PIN_AND_PULL',
    routes: {
      WR1: {
        readOrder: 4,
        waypoints: [{ x: -17.5, y: 3.5 }],
        roleDesc: 'Stalk Block Boundary CB',
        role: 'RUN_BLOCK',
      },
      SLOT: {
        readOrder: 3,
        waypoints: [{ x: 9.0, y: 3.0 }],
        roleDesc: 'Stalk Block Nickel CB / Safety',
        role: 'RUN_BLOCK',
      },
      TE: {
        readOrder: 2,
        waypoints: [{ x: 4.9, y: 1.2 }],
        roleDesc: 'Pin Down / Seal 7-Tech Edge',
        role: 'RUN_BLOCK',
      },
      WR2: {
        readOrder: 5,
        waypoints: [{ x: 16.5, y: 4.0 }],
        roleDesc: 'Stalk Block Field CB',
        role: 'RUN_BLOCK',
      },
      RB: {
        readOrder: 1,
        waypoints: [
          { x: 3.2, y: -2.8 },
          { x: 6.2, y: -0.2 },
          { x: 6.8, y: 6.5 },
          { x: 6.0, y: 22.0 },
        ],
        roleDesc: 'Sweep Carrier (Track Pullers ➔ Burst Alley)',
        role: 'BALL_CARRIER',
      },
    },
  },

  RUN_GT_COUNTER: {
    id: 'RUN_GT_COUNTER',
    name: 'GT Counter (Backside Guard Kick + Tackle Wrap)',
    category: 'RUN',
    shortDesc: 'Backside LG kicks out edge; LT wraps into B/C gap for Mike LB. RB counter-step downhill.',
    primaryCoverageBeater: 'Aggressive Fast-Flow Linebackers & Over-Pursuit',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'NONE',
    recommendedBlocking: 'GT_COUNTER_PULL',
    routes: {
      WR1: {
        readOrder: 4,
        waypoints: [{ x: -17.5, y: 4.0 }],
        roleDesc: 'Stalk Block Boundary CB',
        role: 'RUN_BLOCK',
      },
      SLOT: {
        readOrder: 3,
        waypoints: [{ x: -8.5, y: 3.0 }],
        roleDesc: 'Backside Sift / Cutoff Safety',
        role: 'RUN_BLOCK',
      },
      TE: {
        readOrder: 2,
        waypoints: [{ x: 4.9, y: 1.2 }],
        roleDesc: 'Frontside Down-Block on DT/DE',
        role: 'RUN_BLOCK',
      },
      WR2: {
        readOrder: 5,
        waypoints: [{ x: 16.5, y: 4.5 }],
        roleDesc: 'Crack Block on Force Safety',
        role: 'RUN_BLOCK',
      },
      RB: {
        readOrder: 1,
        waypoints: [
          { x: -1.0, y: -4.8 },
          { x: 1.8, y: -2.2 },
          { x: 3.8, y: 1.5 },
          { x: 4.2, y: 20.0 },
        ],
        roleDesc: 'Counter Carrier (Jab Step ➔ Off-Tackle Burst)',
        role: 'BALL_CARRIER',
      },
    },
  },

  RUN_INSIDE_ZONE: {
    id: 'RUN_INSIDE_ZONE',
    name: 'Inside Zone Duo (Interior Double-Teams)',
    category: 'RUN',
    shortDesc: 'Vertical combo double-teams at point of attack displace interior DL into lap of LBs.',
    primaryCoverageBeater: 'Light Boxes (Nickel 2-High) & Short Yardage',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'NONE',
    recommendedBlocking: 'INSIDE_ZONE_DUO',
    routes: {
      WR1: {
        readOrder: 4,
        waypoints: [{ x: -17.5, y: 4.0 }],
        roleDesc: 'Stalk Block Boundary CB',
        role: 'RUN_BLOCK',
      },
      SLOT: {
        readOrder: 3,
        waypoints: [{ x: -8.5, y: 3.5 }],
        roleDesc: 'Stalk Block Nickel CB',
        role: 'RUN_BLOCK',
      },
      TE: {
        readOrder: 2,
        waypoints: [{ x: 4.9, y: 1.0 }],
        roleDesc: 'Base Block Edge Defender',
        role: 'RUN_BLOCK',
      },
      WR2: {
        readOrder: 5,
        waypoints: [{ x: 16.5, y: 4.0 }],
        roleDesc: 'Stalk Block Field CB',
        role: 'RUN_BLOCK',
      },
      RB: {
        readOrder: 1,
        waypoints: [
          { x: 0.6, y: -2.5 },
          { x: 0.8, y: 1.0 },
          { x: 1.0, y: 8.0 },
          { x: 0.5, y: 22.0 },
        ],
        roleDesc: 'North-South Carrier (Press A-Gap ➔ Vertical Burst)',
        role: 'BALL_CARRIER',
      },
    },
  },

  RUN_OUTSIDE_ZONE: {
    id: 'RUN_OUTSIDE_ZONE',
    name: 'Outside Zone Stretch (Lateral Reach & Cutback)',
    category: 'RUN',
    shortDesc: 'Entire line lateral reach flows play-side; RB stretches defense horizontally to trigger cutback.',
    primaryCoverageBeater: 'Sluggish Linebackers & Wide-9 Over-Pursuit',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'NONE',
    recommendedBlocking: 'OUTSIDE_ZONE_STRETCH',
    routes: {
      WR1: {
        readOrder: 4,
        waypoints: [{ x: -17.5, y: 4.0 }],
        roleDesc: 'Stalk Block Boundary CB',
        role: 'RUN_BLOCK',
      },
      SLOT: {
        readOrder: 3,
        waypoints: [{ x: 8.5, y: 3.5 }],
        roleDesc: 'Reach Block Overhang Defender',
        role: 'RUN_BLOCK',
      },
      TE: {
        readOrder: 2,
        waypoints: [{ x: 5.8, y: 1.0 }],
        roleDesc: 'Reach & Hook Play-Side DE',
        role: 'RUN_BLOCK',
      },
      WR2: {
        readOrder: 5,
        waypoints: [{ x: 16.5, y: 4.0 }],
        roleDesc: 'Stalk Block Field CB',
        role: 'RUN_BLOCK',
      },
      RB: {
        readOrder: 1,
        waypoints: [
          { x: 4.2, y: -3.2 },
          { x: 7.2, y: -0.5 },
          { x: 6.8, y: 7.0 },
          { x: 5.5, y: 22.0 },
        ],
        roleDesc: 'Stretch Carrier (Aim Outside Hip ➔ One-Cut & Go)',
        role: 'BALL_CARRIER',
      },
    },
  },
  THEO_SWEEP_TOSS: {
    id: 'THEO_SWEEP_TOSS',
    name: 'Theo #1: Heavy Pin-Pull Sweep & Toss',
    category: 'RUN',
    shortDesc: '6-OL pin-down; RG/RT pull into perimeter alley. Versatile F-Insert sweeps outside sluggish Base SAM LB.',
    primaryCoverageBeater: 'Base 4-3 Personnel & Light Perimeter Support',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'H_INSERT_MOTION',
    recommendedBlocking: 'PIN_AND_PULL',
    routes: {
      WR1: {
        readOrder: 4,
        waypoints: [{ x: -17.5, y: 4.0 }],
        roleDesc: 'Stalk Block Boundary CB',
        role: 'RUN_BLOCK',
      },
      SLOT: {
        readOrder: 3,
        waypoints: [{ x: 6.8, y: 4.0 }],
        roleDesc: 'H-Insert Lead Wrap on Force Defender / Safety',
        role: 'LEAD_BLOCK',
      },
      TE: {
        readOrder: 2,
        waypoints: [{ x: 4.8, y: 1.2 }],
        roleDesc: '6th OL Pin-Down on 7-Tech Edge Rusher',
        role: 'RUN_BLOCK',
      },
      WR2: {
        readOrder: 5,
        waypoints: [{ x: 17.5, y: 4.0 }],
        roleDesc: 'Stalk Block Field CB',
        role: 'RUN_BLOCK',
      },
      RB: {
        readOrder: 1,
        waypoints: [
          { x: 4.2, y: -2.5 },
          { x: 6.8, y: 0.5 },
          { x: 7.2, y: 6.5 },
          { x: 6.5, y: 24.0 },
        ],
        roleDesc: 'Toss Carrier (Stretch Perimeter ➔ Track Pullers ➔ Burst North)',
        role: 'BALL_CARRIER',
      },
    },
  },

  THEO_QB_POWER_DRAW: {
    id: 'THEO_QB_POWER_DRAW',
    name: 'Theo #2: +1 Heavy QB Power / Draw',
    category: 'RUN',
    shortDesc: '+1 Box Math: 6 OL + H-Insert lead block into B-gap. Dual-threat QB follows puller into 8v7 interior crease.',
    primaryCoverageBeater: '2-High Split Safety Shells (Cov 2, Cov 4, Cov 6) & 7-Man Fronts',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'F_ORBIT_TELL',
    recommendedBlocking: 'POWER_G_PULL',
    routes: {
      WR1: {
        readOrder: 4,
        waypoints: [{ x: -18.5, y: 12.0 }],
        roleDesc: 'Boundary Stalk Block / Deep Go Threat',
        role: 'RUN_BLOCK',
      },
      SLOT: {
        readOrder: 2,
        waypoints: [{ x: 1.2, y: 2.0 }],
        roleDesc: 'H-Insert Lead Block into B-Gap on MLB/WLB',
        role: 'LEAD_BLOCK',
      },
      TE: {
        readOrder: 3,
        waypoints: [{ x: 4.8, y: 1.2 }],
        roleDesc: '6th OL Down-Block on Interior DT',
        role: 'RUN_BLOCK',
      },
      WR2: {
        readOrder: 5,
        waypoints: [{ x: 18.5, y: 12.0 }],
        roleDesc: 'Field Stalk Block / Deep Go Threat',
        role: 'RUN_BLOCK',
      },
      RB: {
        readOrder: 6,
        waypoints: [{ x: -8.5, y: -2.0 }],
        roleDesc: 'Backfield Orbit Fake (Freezes Backside Edge & Will LB)',
        role: 'RUN_BLOCK',
      },
      QB: {
        readOrder: 1,
        waypoints: [
          { x: 0.0, y: -3.0 },
          { x: 1.2, y: 0.5 },
          { x: 1.5, y: 7.5 },
          { x: 1.0, y: 22.0 },
        ],
        roleDesc: 'QB Power Carrier (+1 Math behind LG pull and H-Insert lead)',
        role: 'BALL_CARRIER',
      },
    },
  },

  THEO_PA_BOOT_SHOT: {
    id: 'THEO_PA_BOOT_SHOT',
    name: 'Theo #3: PA Heavy Bootleg Post-Corner & Leak',
    category: 'PLAY_ACTION',
    shortDesc: 'Heavy run fake freezes Base LBs; QB bootlegs into space with 6\'4" WRs dividing 2-high safeties and H-Insert leak.',
    primaryCoverageBeater: 'Aggressive Run-Fit Linebackers & 2-High Safety Disconnects',
    dropbackType: 'PLAY_ACTION',
    recommendedMotion: 'H_INSERT_MOTION',
    recommendedBlocking: 'HALF_SLIDE',
    routes: {
      WR1: {
        readOrder: 2,
        waypoints: [
          { x: -18.5, y: 14.0 },
          { x: -1.0, y: 25.0 },
        ],
        roleDesc: 'Contested Alpha Post (Splits Safeties in Deep Honey Hole)',
      },
      SLOT: {
        readOrder: 1,
        waypoints: [
          { x: 4.2, y: 0.5 },
          { x: 11.5, y: 6.5 },
          { x: 18.0, y: 7.2 },
        ],
        roleDesc: 'Chip Edge Rusher ➔ Flat Leak Hot Valve (Mismatched on LB)',
        role: 'CHIP_RELEASE',
      },
      TE: {
        readOrder: 4,
        waypoints: [],
        roleDesc: '6th OL Heavy Edge Pass Anchor',
        role: 'PASS_BLOCK',
      },
      WR2: {
        readOrder: 3,
        waypoints: [
          { x: 18.5, y: 15.0 },
          { x: 22.5, y: 23.0 },
        ],
        roleDesc: 'Boundary Corner Route (High-Point Catch Threat)',
      },
      RB: {
        readOrder: 5,
        waypoints: [{ x: -6.5, y: -2.0 }],
        roleDesc: 'Hard Sweep Handoff Fake (Sucks up Mike & Will LBs)',
        role: 'PASS_BLOCK',
      },
    },
  },

  THEO_INSERT_HOT_LEAK: {
    id: 'THEO_INSERT_HOT_LEAK',
    name: 'Theo #4: B/C Gap Insert Hot Seam Leak (Anti-Blitz)',
    category: 'QUICK',
    shortDesc: 'Insert players chip A/B blitzers then snap into vacated seams. 1-on-1 boundary fades punish Zero/Cov 1 blitz.',
    primaryCoverageBeater: 'Cover 0 All-Out Blitz & Fire Zone 3 Pressure',
    dropbackType: 'QUICK_GAME',
    recommendedMotion: 'NONE',
    recommendedBlocking: 'HALF_SLIDE',
    routes: {
      WR1: {
        readOrder: 3,
        waypoints: [
          { x: -18.5, y: 7.5 },
          { x: -18.5, y: 7.0 },
        ],
        roleDesc: 'Quick Boundary Hitch / Back-Shoulder Alert vs Press',
      },
      SLOT: {
        readOrder: 1,
        waypoints: [
          { x: 2.0, y: 1.0 },
          { x: 3.5, y: 8.5 },
          { x: 5.0, y: 15.0 },
        ],
        roleDesc: 'Chip B-Gap Blitzer ➔ Instant Hot Seam in Vacated Void',
        role: 'CHIP_RELEASE',
      },
      TE: {
        readOrder: 5,
        waypoints: [],
        roleDesc: '6th OL Inside-Out Slide Block',
        role: 'PASS_BLOCK',
      },
      WR2: {
        readOrder: 4,
        waypoints: [
          { x: 18.5, y: 7.5 },
          { x: 18.5, y: 7.0 },
        ],
        roleDesc: 'Quick Boundary Hitch / Go Fade vs Off Coverage',
      },
      RB: {
        readOrder: 2,
        waypoints: [
          { x: -2.5, y: -2.0 },
          { x: -6.5, y: 3.5 },
        ],
        roleDesc: 'Chip Edge Rusher ➔ Flat Release Safety Valve',
        role: 'CHIP_RELEASE',
      },
    },
  },
};

export function applyOffensiveConcept(offense: PlayerConfig[], conceptId: OffensiveConceptId): DropbackType {
  const concept = OFFENSIVE_CONCEPTS[conceptId];
  if (!concept) return 'STANDARD_DROP';

  for (const player of offense) {
    if (player.id === 'QB') {
      const qbSpec = concept.routes['QB'];
      if (qbSpec) {
        player.role = qbSpec.role || 'BALL_CARRIER';
        player.readOrder = qbSpec.readOrder;
        player.waypoints = qbSpec.waypoints.map((w) => ({ ...w }));
      } else {
        player.role = 'QB';
        player.waypoints = [];
        player.readOrder = 0;
      }
      continue;
    }
    if (!player.eligible && player.id !== 'TE') continue;
    const spec = concept.routes[player.id];
    if (spec) {
      player.readOrder = spec.readOrder;
      player.waypoints = spec.waypoints.map((w) => ({ ...w }));
      player.breakStyle = spec.breakStyle || 'SHARP_PIVOT';
      player.choiceRules = spec.choiceRules
        ? spec.choiceRules.map((r) => ({
            ...r,
            waypoints: r.waypoints.map((w) => ({ ...w })),
          }))
        : undefined;
      player.choiceActiveDesc = undefined;
      if (spec.role) {
        player.role = spec.role;
      } else {
        player.role = 'ROUTE';
      }
    }
  }

  return concept.dropbackType;
}

// ============================================================================
// FORMATION & PERSONNEL ALIGNMENT PRESETS
// ============================================================================
export function applyFormation(offense: PlayerConfig[], formation: OffFormationId): void {
  const wr1 = offense.find((p) => p.id === 'WR1');
  const slot = offense.find((p) => p.id === 'SLOT');
  const te = offense.find((p) => p.id === 'TE');
  const wr2 = offense.find((p) => p.id === 'WR2');
  const rb = offense.find((p) => p.id === 'RB');

  if (!wr1 || !slot || !te || !wr2 || !rb) return;

  switch (formation) {
    case 'PISTOL_HEAVY_INSERT': {
      const qb = offense.find((p) => p.id === 'QB');
      if (qb) qb.startPos = { x: 0.0, y: -4.0 };
      wr1.startPos = { x: -18.5, y: -0.2 }; // Boundary Contested Alpha X
      slot.startPos = { x: -2.8, y: -2.2 }; // H-Insert Sniffer / Wing
      te.startPos = { x: 4.8, y: -0.4 };   // 6th OL Attached Tight
      wr2.startPos = { x: 18.5, y: -0.2 };  // Field Contested Alpha Z
      rb.startPos = { x: 0.0, y: -6.2 };   // F-Insert Pistol Alignment
      break;
    }

    case 'GUN_HEAVY_OFFSET': {
      const qb = offense.find((p) => p.id === 'QB');
      if (qb) qb.startPos = { x: 0.0, y: -4.5 };
      wr1.startPos = { x: -18.0, y: -0.2 };
      slot.startPos = { x: 3.2, y: -1.8 };  // H-Insert Flexed / Sniffer Right
      te.startPos = { x: 4.8, y: -0.4 };   // 6th OL Attached Tight
      wr2.startPos = { x: 18.0, y: -0.2 };
      rb.startPos = { x: -2.6, y: -4.8 };  // F-Insert Offset Sidecar
      break;
    }

    case 'GUN_DOUBLES':
      wr1.startPos = { x: -17.0, y: -0.2 };
      slot.startPos = { x: -9.0, y: -0.8 };
      te.startPos = { x: 4.8, y: -0.5 };
      wr2.startPos = { x: 17.0, y: -0.4 };
      rb.startPos = { x: 2.2, y: -4.8 };
      break;

    case 'GUN_BUNCH_RIGHT':
      wr1.startPos = { x: -18.0, y: -0.2 };
      slot.startPos = { x: 9.0, y: -0.8 };
      te.startPos = { x: 6.5, y: -0.4 };
      wr2.startPos = { x: 11.5, y: -0.8 };
      rb.startPos = { x: -2.2, y: -4.8 };
      break;

    case 'SINGLEBACK_ACE':
      wr1.startPos = { x: -16.5, y: -0.2 };
      slot.startPos = { x: -5.0, y: -0.5 };
      te.startPos = { x: 5.0, y: -0.5 };
      wr2.startPos = { x: 16.5, y: -0.2 };
      rb.startPos = { x: 0.0, y: -5.2 };
      break;

    case 'EMPTY_QUADS':
      wr1.startPos = { x: -18.5, y: -0.2 };
      slot.startPos = { x: 6.5, y: -0.8 };
      te.startPos = { x: 10.5, y: -0.5 };
      wr2.startPos = { x: 19.0, y: -0.4 };
      rb.startPos = { x: 14.5, y: -0.8 };
      break;

    default:
      // GUN_TRIPS_RIGHT
      wr1.startPos = { x: -17.5, y: -0.2 };
      slot.startPos = { x: -8.5, y: -0.8 };
      te.startPos = { x: 4.9, y: -0.5 };
      wr2.startPos = { x: 16.5, y: -0.6 };
      rb.startPos = { x: -2.0, y: -4.8 };
      break;
  }
}

export function applyFormationAndPersonnel(
  offense: PlayerConfig[],
  formation: OffFormationId,
  personnel: OffPersonnelId
): void {
  const slot = offense.find((p) => p.id === 'SLOT');
  const rb = offense.find((p) => p.id === 'RB');
  const te = offense.find((p) => p.id === 'TE');

  if (personnel === 'HEAVY_6OL_2INSERT') {
    if (te) {
      te.label = '6OL/TE';
      te.archetype = 'HEAVY_TRENCH';
    }
    if (slot) {
      slot.label = 'H-INSERT';
      slot.archetype = 'POWER_HYBRID';
    }
    if (rb) {
      rb.label = 'F-INSERT';
      rb.archetype = 'POWER_HYBRID';
    }
  } else if (personnel === '12_PERSONNEL' && slot) {
    slot.label = 'TE2';
    slot.archetype = 'POWER_HYBRID';
    if (te) {
      te.label = 'TE';
      te.archetype = 'POWER_HYBRID';
    }
    if (rb) {
      rb.label = 'RB';
    }
  } else if (personnel === '21_PERSONNEL' && slot) {
    slot.label = 'FB';
    slot.archetype = 'HEAVY_TRENCH';
    if (te) {
      te.label = 'TE';
      te.archetype = 'POWER_HYBRID';
    }
    if (rb) {
      rb.label = 'RB';
    }
  } else if (slot) {
    slot.label = 'H-SLOT';
    slot.archetype = 'LEAN_SPEED';
    if (te) {
      te.label = 'TE';
      te.archetype = 'POWER_HYBRID';
    }
    if (rb) {
      rb.label = 'RB';
    }
  }

  if (personnel === 'EMPTY_5W' && rb) {
    rb.label = 'RB-SPLIT';
  } else if (rb && personnel !== 'HEAVY_6OL_2INSERT') {
    rb.label = 'RB';
  }

  applyFormation(offense, formation);
}

// ============================================================================
// NFL AUTHENTIC ROSTERS & SCOUTING DOSSIERS
// ============================================================================

export function createTheoreticalOptimumOffense(): PlayerConfig[] {
  return [
    {
      id: 'QB',
      label: 'QB',
      name: 'Theo Mobile QB',
      team: 'OFF',
      archetype: 'POWER_HYBRID',
      eligible: false,
      startPos: { x: 0, y: -4.0 },
      role: 'QB',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 89,
        acc: 90,
        agi: 87,
        str: 85,
        thp: 91,
        tha_short: 83,
        tha_med: 81,
        tha_deep: 83,
        tup_pressure: 81,
        qb_read_speed: 82,
        pre_snap_read: 84,
        btk_power: 89,
        elusiveness: 88,
        release_quick: 84,
      }),
      scouting: {
        ovr: 83,
        jersey: 5,
        height: "6'3\"",
        weightLbs: 226,
        armLengthIn: 32.5,
        fortyYdDash: 4.54,
        tenYdSplit: 1.55,
        ngsMaxSpeedMph: 20.8,
        ngsMetricLabel: '20.8 mph top speed | +1 Math QB Run Specialist ($6.5M APY)',
        scoutingReport:
          'High-mobility dual-threat quarterback with elite contact balance. Replacement-level passer outside structure, but lethal in read-option, bootlegs, and designed QB power behind heavy fronts. Salary Cap Hit: $6.5M APY.',
      },
    },
    {
      id: 'LT',
      label: 'LT',
      name: 'Starting Pro LT',
      team: 'OFF',
      archetype: 'HEAVY_TRENCH',
      eligible: false,
      startPos: { x: -3.2, y: -0.4 },
      role: 'OL',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 68,
        acc: 74,
        agi: 70,
        str: 92,
        pbk_anchor: 89,
        pbk_lateral: 87,
        rbk_power: 91,
        rbk_reach: 88,
      }),
      scouting: {
        ovr: 84,
        jersey: 74,
        height: "6'6\"",
        weightLbs: 320,
        armLengthIn: 34.5,
        fortyYdDash: 5.15,
        tenYdSplit: 1.78,
        ngsMaxSpeedMph: 15.8,
        ngsMetricLabel: '87.5% PBWR | Solid Starter ($10.0M APY)',
        scoutingReport:
          'Reliable starting blindside tackle with stout anchor and consistent edge seal. Salary Cap Hit: $10.0M APY.',
      },
    },
    {
      id: 'LG',
      label: 'LG',
      name: 'Pulling Pro LG',
      team: 'OFF',
      archetype: 'HEAVY_TRENCH',
      eligible: false,
      startPos: { x: -1.6, y: -0.4 },
      role: 'OL',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 72,
        acc: 78,
        agi: 75,
        str: 94,
        pbk_anchor: 88,
        pbk_lateral: 83,
        rbk_power: 93,
        rbk_reach: 86,
      }),
      scouting: {
        ovr: 83,
        jersey: 65,
        height: "6'4\"",
        weightLbs: 325,
        armLengthIn: 33.5,
        fortyYdDash: 5.08,
        tenYdSplit: 1.72,
        ngsMaxSpeedMph: 16.5,
        ngsMetricLabel: 'Primary Puller | 93 RBK Power ($7.5M APY)',
        scoutingReport:
          'Athletic pulling guard who generates devastating momentum on kick-out blocks for Power and Counter. Salary Cap Hit: $7.5M APY.',
      },
    },
    {
      id: 'C',
      label: 'C',
      name: 'Anchor Center',
      team: 'OFF',
      archetype: 'HEAVY_TRENCH',
      eligible: false,
      startPos: { x: 0.0, y: -0.4 },
      role: 'OL',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 68,
        acc: 73,
        agi: 72,
        str: 90,
        pbk_anchor: 87,
        pbk_lateral: 86,
        rbk_power: 89,
        rbk_reach: 88,
      }),
      scouting: {
        ovr: 82,
        jersey: 61,
        height: "6'3\"",
        weightLbs: 308,
        armLengthIn: 33.0,
        fortyYdDash: 5.18,
        tenYdSplit: 1.77,
        ngsMaxSpeedMph: 15.2,
        ngsMetricLabel: 'A-Gap Anchor | 87 PBK ($6.0M APY)',
        scoutingReport:
          'Smart interior pivot who makes front calls and anchors interior bull rushes. Salary Cap Hit: $6.0M APY.',
      },
    },
    {
      id: 'RG',
      label: 'RG',
      name: 'Mauler Pro RG',
      team: 'OFF',
      archetype: 'HEAVY_TRENCH',
      eligible: false,
      startPos: { x: 1.6, y: -0.4 },
      role: 'OL',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 70,
        acc: 76,
        agi: 73,
        str: 95,
        pbk_anchor: 89,
        pbk_lateral: 82,
        rbk_power: 94,
        rbk_reach: 85,
      }),
      scouting: {
        ovr: 83,
        jersey: 71,
        height: "6'5\"",
        weightLbs: 330,
        armLengthIn: 34.0,
        fortyYdDash: 5.12,
        tenYdSplit: 1.75,
        ngsMaxSpeedMph: 16.0,
        ngsMetricLabel: '94 RBK Power | Pin-Pull Specialist ($8.0M APY)',
        scoutingReport:
          'Heavy road grader with power hands. Combines with RT and 6th OL for frontside pin-down dominance. Salary Cap Hit: $8.0M APY.',
      },
    },
    {
      id: 'RT',
      label: 'RT',
      name: 'Starting Pro RT',
      team: 'OFF',
      archetype: 'HEAVY_TRENCH',
      eligible: false,
      startPos: { x: 3.2, y: -0.4 },
      role: 'OL',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 67,
        acc: 72,
        agi: 69,
        str: 93,
        pbk_anchor: 88,
        pbk_lateral: 85,
        rbk_power: 92,
        rbk_reach: 87,
      }),
      scouting: {
        ovr: 84,
        jersey: 78,
        height: "6'6\"",
        weightLbs: 325,
        armLengthIn: 34.5,
        fortyYdDash: 5.16,
        tenYdSplit: 1.79,
        ngsMaxSpeedMph: 15.6,
        ngsMetricLabel: '88 PBK | 92 RBK ($9.5M APY)',
        scoutingReport:
          'Powerful drive blocker who pairs with the 6th OL to create cavernous C-gap running lanes. Salary Cap Hit: $9.5M APY.',
      },
    },
    {
      id: 'TE',
      label: '6OL/TE',
      name: 'Jumbo 6th OL',
      team: 'OFF',
      archetype: 'HEAVY_TRENCH',
      eligible: false,
      startPos: { x: 4.8, y: -0.4 },
      role: 'RUN_BLOCK',
      readOrder: 0,
      waypoints: [],
      ratings: makeRatings({
        spd: 63,
        acc: 68,
        agi: 65,
        str: 96,
        pbk_anchor: 90,
        pbk_lateral: 81,
        rbk_power: 95,
        rbk_reach: 89,
      }),
      scouting: {
        ovr: 81,
        jersey: 79,
        height: "6'7\"",
        weightLbs: 335,
        armLengthIn: 35.0,
        fortyYdDash: 5.25,
        tenYdSplit: 1.82,
        ngsMaxSpeedMph: 14.5,
        ngsMetricLabel: '335 lbs | 95 RBK Power | Forces Base 4-3 ($2.5M APY)',
        scoutingReport:
          'Pure 6th offensive lineman aligned at tight end. Road grader who dominates point-of-attack blocks and forces opposing coordinators into heavy Base 4-3 personnel. Salary Cap Hit: $2.5M APY.',
      },
    },
    {
      id: 'WR1',
      label: 'WR1',
      name: 'Contested Alpha X',
      team: 'OFF',
      archetype: 'LEAN_SPEED',
      eligible: true,
      startPos: { x: -18.5, y: -0.2 },
      role: 'ROUTE',
      readOrder: 1,
      waypoints: [],
      ratings: makeRatings({
        spd: 93,
        acc: 93,
        agi: 89,
        str: 80,
        catch_traffic: 96,
        catch_radius: 95,
        rr_deep: 92,
        release_press: 91,
        catch_hands: 94,
      }),
      scouting: {
        ovr: 89,
        jersey: 11,
        height: "6'4\"",
        weightLbs: 225,
        armLengthIn: 34.0,
        fortyYdDash: 4.41,
        tenYdSplit: 1.51,
        ngsMaxSpeedMph: 21.6,
        ngsMetricLabel: '6\'4" | 96 Catch Contest | Forces 2-High ($14.0M APY)',
        scoutingReport:
          'Physical boundary alpha (Nico Collins / Mike Evans prototype). Demands deep cushion or safety help; wins 50/50 jump balls at the apex. Salary Cap Hit: $14.0M APY.',
      },
    },
    {
      id: 'WR2',
      label: 'WR2',
      name: 'Contested Field Z',
      team: 'OFF',
      archetype: 'LEAN_SPEED',
      eligible: true,
      startPos: { x: 18.5, y: -0.2 },
      role: 'ROUTE',
      readOrder: 2,
      waypoints: [],
      ratings: makeRatings({
        spd: 92,
        acc: 92,
        agi: 89,
        str: 78,
        catch_traffic: 94,
        catch_radius: 93,
        rr_deep: 91,
        release_press: 90,
        catch_hands: 92,
      }),
      scouting: {
        ovr: 87,
        jersey: 18,
        height: "6'3\"",
        weightLbs: 220,
        armLengthIn: 33.5,
        fortyYdDash: 4.44,
        tenYdSplit: 1.53,
        ngsMaxSpeedMph: 21.2,
        ngsMetricLabel: '6\'3" | 94 Catch Contest | Deep Perimeter Threat ($12.0M APY)',
        scoutingReport:
          'Long-limbed perimeter vertical threat. Forces outside cornerbacks into deep trail technique and caps single-high rotations. Salary Cap Hit: $12.0M APY.',
      },
    },
    {
      id: 'SLOT',
      label: 'H-INSERT',
      name: 'Versatile H-Insert',
      team: 'OFF',
      archetype: 'POWER_HYBRID',
      eligible: true,
      startPos: { x: -2.8, y: -2.2 },
      role: 'ROUTE',
      readOrder: 3,
      waypoints: [],
      ratings: makeRatings({
        spd: 85,
        acc: 87,
        agi: 86,
        str: 86,
        rbk_power: 88,
        rbk_reach: 86,
        pbk_anchor: 84,
        catch_traffic: 88,
        rr_short: 85,
        rr_med: 84,
        release_press: 83,
        catch_hands: 86,
      }),
      scouting: {
        ovr: 83,
        jersey: 84,
        height: "6'4\"",
        weightLbs: 248,
        armLengthIn: 33.0,
        fortyYdDash: 4.62,
        tenYdSplit: 1.58,
        ngsMaxSpeedMph: 20.0,
        ngsMetricLabel: '248 lbs | Swiss-Army Utility | Pre-Snap Tell Diagnostic ($4.0M APY)',
        scoutingReport:
          'Do-everything H-back / dirty-work slot receiver. Pre-snap motion diagnostic piece that forces linebackers into space. Chips edge rushers, seals linebackers on sweeps, and snaps open in intermediate voids. Salary Cap Hit: $4.0M APY.',
      },
    },
    {
      id: 'RB',
      label: 'F-INSERT',
      name: 'Versatile F-Insert',
      team: 'OFF',
      archetype: 'POWER_HYBRID',
      eligible: true,
      startPos: { x: 0.0, y: -6.2 },
      role: 'BALL_CARRIER',
      readOrder: 4,
      waypoints: [],
      ratings: makeRatings({
        spd: 87,
        acc: 89,
        agi: 87,
        str: 87,
        rbk_power: 87,
        rbk_reach: 84,
        btk_power: 89,
        elusiveness: 85,
        catch_traffic: 86,
        rr_short: 85,
        catch_hands: 84,
      }),
      scouting: {
        ovr: 84,
        jersey: 28,
        height: "6'0\"",
        weightLbs: 232,
        armLengthIn: 32.0,
        fortyYdDash: 4.50,
        tenYdSplit: 1.54,
        ngsMaxSpeedMph: 20.6,
        ngsMetricLabel: '232 lbs | 89 Broken Tackle | Multi-Tool Weapon ($4.5M APY)',
        scoutingReport:
          'Hybrid running back / fullback / lead blocker. Never a dead player: carries tosses and sweeps, inserts as lead blocker for QB power, or chips and releases as an outlet valve. Salary Cap Hit: $4.5M APY.',
      },
    },
  ];
}

export function createEaglesOffense(): PlayerConfig[] {
  return [
    {
      id: 'QB', label: 'QB', name: 'Jalen Hurts', team: 'OFF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 0, y: -4.5 }, role: 'QB', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 86, acc: 88, agi: 86, str: 86,
        thp: 90, tha_short: 89, tha_med: 87, tha_deep: 86, tup_pressure: 86,
        qb_read_speed: 85, pre_snap_read: 87, btk_power: 91, elusiveness: 85,
        release_quick: 86
      }),
      scouting: {
        ovr: 88, jersey: 1, height: "6'1\"", weightLbs: 223, armLengthIn: 31.75,
        fortyYdDash: 4.59, tenYdSplit: 1.60, ngsMaxSpeedMph: 20.4,
        ngsMetricLabel: '20.4 mph top speed | +3.8 CPOE in clean pocket',
        scoutingReport: 'Elite dual-threat strength (squats 600+ lbs). Poised vs interior pressure; powerful contact balance on scrambles.'
      }
    },
    {
      id: 'LT', label: 'LT', name: 'Jordan Mailata', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -3.2, y: -0.4 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 68, acc: 74, agi: 72, str: 98,
        pbk_anchor: 96, pbk_lateral: 92, rbk_power: 98, rbk_reach: 90
      }),
      scouting: {
        ovr: 93, jersey: 68, height: "6'8\"", weightLbs: 365, armLengthIn: 35.5,
        fortyYdDash: 5.12, tenYdSplit: 1.76, ngsMaxSpeedMph: 16.2,
        ngsMetricLabel: '92.4% Pass Block Win Rate (NGS)',
        scoutingReport: 'Massive rugby-bred anchor with rare lateral recovery. Shuts down bull rushes at the pocket apex.'
      }
    },
    {
      id: 'LG', label: 'LG', name: 'Landon Dickerson', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -1.6, y: -0.3 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 64, acc: 70, agi: 66, str: 97,
        pbk_anchor: 94, pbk_lateral: 86, rbk_power: 97, rbk_reach: 89
      }),
      scouting: {
        ovr: 90, jersey: 69, height: "6'6\"", weightLbs: 332, armLengthIn: 33.25,
        fortyYdDash: 5.25, tenYdSplit: 1.82, ngsMaxSpeedMph: 15.1,
        ngsMetricLabel: '91.8% Interior Anchor Rate',
        scoutingReport: 'Road grader inside with punishing grip strength. Stone wall against interior stunts.'
      }
    },
    {
      id: 'C', label: 'C', name: 'Cam Jurgens', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 0.0, y: -0.2 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 75, acc: 79, agi: 78, str: 87,
        pbk_anchor: 86, pbk_lateral: 90, rbk_power: 88, rbk_reach: 95
      }),
      scouting: {
        ovr: 82, jersey: 51, height: "6'3\"", weightLbs: 303, armLengthIn: 33.38,
        fortyYdDash: 4.92, tenYdSplit: 1.71, ngsMaxSpeedMph: 17.5,
        ngsMetricLabel: '4.92s 40-yd dash (98th percentile C)',
        scoutingReport: 'High-twitch athletic center hand-picked to mirror Kelces reach blocks and screen climbing.'
      }
    },
    {
      id: 'RG', label: 'RG', name: 'Mekhi Becton', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 1.6, y: -0.3 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 68, acc: 74, agi: 67, str: 95,
        pbk_anchor: 88, pbk_lateral: 82, rbk_power: 92, rbk_reach: 84
      }),
      scouting: {
        ovr: 82, jersey: 77, height: "6'7\"", weightLbs: 363, armLengthIn: 35.63,
        fortyYdDash: 5.10, tenYdSplit: 1.77, ngsMaxSpeedMph: 15.8,
        ngsMetricLabel: '363 lbs starting mass | 95 Strength',
        scoutingReport: 'Imposing physical size creates natural pocket width; re-energized inside at guard.'
      }
    },
    {
      id: 'RT', label: 'RT', name: 'Lane Johnson', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 3.2, y: -0.4 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 75, acc: 81, agi: 79, str: 95,
        pbk_anchor: 97, pbk_lateral: 98, rbk_power: 94, rbk_reach: 93
      }),
      scouting: {
        ovr: 96, jersey: 65, height: "6'6\"", weightLbs: 325, armLengthIn: 35.25,
        fortyYdDash: 4.72, tenYdSplit: 1.61, ngsMaxSpeedMph: 18.0,
        ngsMetricLabel: 'Zero sacks allowed in 28 consecutive games',
        scoutingReport: 'Hall of Fame caliber kick-slide speed. Quickest get-off in NFL history; eliminates wide-9 rushers.'
      }
    },
    {
      id: 'WR1', label: 'X-WR1', name: 'A.J. Brown', team: 'OFF', archetype: 'POWER_HYBRID', eligible: true,
      startPos: { x: -17.5, y: -0.2 }, role: 'ROUTE', readOrder: 1,
      waypoints: [{ x: -17.5, y: 11.0 }, { x: -4.5, y: 11.5 }],
      ratings: makeRatings({
        spd: 92, acc: 93, agi: 90, str: 88,
        release_press: 96, rr_short: 93, rr_med: 96, rr_deep: 94,
        catch_hands: 95, catch_traffic: 98, catch_radius: 95,
        btk_power: 94, elusiveness: 87, lateral_vision: 84
      }),
      scouting: {
        ovr: 95, jersey: 11, height: "6'1\"", weightLbs: 226, armLengthIn: 32.88,
        fortyYdDash: 4.49, tenYdSplit: 1.54, ngsMaxSpeedMph: 21.5,
        ngsMetricLabel: '+4.2 YAC Above Expected (Next Gen Stats)',
        scoutingReport: 'Dominant physical X receiver. Decimates press coverage; unstoppable on 12-16yd intermediate in-breakers.'
      }
    },
    {
      id: 'SLOT', label: 'H-SLOT', name: 'DeVonta Smith', team: 'OFF', archetype: 'LEAN_SPEED', eligible: true,
      startPos: { x: -8.5, y: -0.8 }, role: 'ROUTE', readOrder: 2,
      waypoints: [{ x: -8.5, y: 5.5 }, { x: -15.0, y: 6.0 }],
      ratings: makeRatings({
        spd: 93, acc: 95, agi: 97, str: 63,
        release_press: 92, rr_short: 97, rr_med: 96, rr_deep: 95,
        catch_hands: 96, catch_traffic: 90, catch_radius: 94,
        btk_power: 72, elusiveness: 95, lateral_vision: 88
      }),
      scouting: {
        ovr: 90, jersey: 6, height: "6'0\"", weightLbs: 170, armLengthIn: 31.5,
        fortyYdDash: 4.47, tenYdSplit: 1.52, ngsMaxSpeedMph: 21.2,
        ngsMetricLabel: '3.6 yards average separation at break',
        scoutingReport: 'The Slim Reaper. Masterful footwork tempo, ankle-breaking brake control, and vacuum-tight hands.'
      }
    },
    {
      id: 'TE', label: 'Y-TE', name: 'Dallas Goedert', team: 'OFF', archetype: 'POWER_HYBRID', eligible: true,
      startPos: { x: 4.9, y: -0.5 }, role: 'ROUTE', readOrder: 3,
      waypoints: [{ x: 4.9, y: 7.5 }, { x: 11.5, y: 12.5 }],
      ratings: makeRatings({
        spd: 85, acc: 86, agi: 84, str: 85,
        pbk_anchor: 83, pbk_lateral: 80, rbk_power: 87,
        rr_short: 87, rr_med: 86, rr_deep: 83, catch_hands: 91, catch_traffic: 90,
        btk_power: 88, lateral_vision: 86
      }),
      scouting: {
        ovr: 88, jersey: 88, height: "6'5\"", weightLbs: 256, armLengthIn: 34.0,
        fortyYdDash: 4.67, tenYdSplit: 1.62, ngsMaxSpeedMph: 19.8,
        ngsMetricLabel: '7.8 YAC per reception (Top 3 NFL TE)',
        scoutingReport: 'Versatile inline/flex Y tight end. Punishing run blocker and seam-splitter with great contact balance.'
      }
    },
    {
      id: 'WR2', label: 'Z-WR2', name: 'Jahan Dotson', team: 'OFF', archetype: 'LEAN_SPEED', eligible: true,
      startPos: { x: 16.5, y: -0.6 }, role: 'ROUTE', readOrder: 4,
      waypoints: [{ x: 16.5, y: 12.5 }, { x: 6.0, y: 20.0 }],
      ratings: makeRatings({
        spd: 92, acc: 93, agi: 92, str: 64,
        release_press: 84, rr_short: 88, rr_med: 87, rr_deep: 87,
        catch_hands: 90, catch_traffic: 83, catch_radius: 87,
        btk_power: 73, elusiveness: 89, lateral_vision: 82
      }),
      scouting: {
        ovr: 78, jersey: 83, height: "5'11\"", weightLbs: 182, armLengthIn: 30.75,
        fortyYdDash: 4.43, tenYdSplit: 1.51, ngsMaxSpeedMph: 21.0,
        ngsMetricLabel: '4.43s 40-yd dash | 36.0\" vertical',
        scoutingReport: 'Speed merchant field-stretcher. Keeps safeties honest over top; dangerous on deep post routes.'
      }
    },
    {
      id: 'RB', label: 'RB', name: 'Saquon Barkley', team: 'OFF', archetype: 'BALANCED_SKILL', eligible: true,
      startPos: { x: -2.0, y: -4.8 }, role: 'ROUTE', readOrder: 5,
      waypoints: [{ x: -7.0, y: -2.0 }, { x: -12.5, y: 2.5 }],
      ratings: makeRatings({
        spd: 95, acc: 96, agi: 96, str: 88,
        pbk_anchor: 78, pbk_lateral: 82, rr_short: 90, catch_hands: 91, catch_traffic: 88,
        btk_power: 97, elusiveness: 98, lateral_vision: 95
      }),
      scouting: {
        ovr: 94, jersey: 26, height: "6'0\"", weightLbs: 233, armLengthIn: 31.38,
        fortyYdDash: 4.40, tenYdSplit: 1.52, ngsMaxSpeedMph: 22.0,
        ngsMetricLabel: '22.0 mph peak tracking | 29 broken tackles',
        scoutingReport: 'Generational physical specimen. Jump-cut burst, home-run open field speed, and lethal lateral vision.'
      }
    },
  ];
}

export function createLionsOffense(): PlayerConfig[] {
  return [
    {
      id: 'QB', label: 'QB', name: 'Jared Goff', team: 'OFF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 0, y: -4.5 }, role: 'QB', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 67, acc: 72, agi: 69, str: 75,
        thp: 88, tha_short: 93, tha_med: 91, tha_deep: 84, tup_pressure: 83,
        qb_read_speed: 93, pre_snap_read: 94, btk_power: 70, elusiveness: 65,
        release_quick: 91
      }),
      scouting: {
        ovr: 86, jersey: 16, height: "6'4\"", weightLbs: 217, armLengthIn: 32.75,
        fortyYdDash: 4.82, tenYdSplit: 1.68, ngsMaxSpeedMph: 16.5,
        ngsMetricLabel: '72.4% on-target throw rate under Ben Johnson',
        scoutingReport: 'Point-guard processing efficiency. Surgical ball placement in rhythm from clean pockets.'
      }
    },
    {
      id: 'LT', label: 'LT', name: 'Taylor Decker', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -3.2, y: -0.4 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 66, acc: 72, agi: 70, str: 94,
        pbk_anchor: 92, pbk_lateral: 89, rbk_power: 93, rbk_reach: 88
      }),
      scouting: {
        ovr: 87, jersey: 68, height: "6'7\"", weightLbs: 318, armLengthIn: 33.75,
        fortyYdDash: 5.23, tenYdSplit: 1.80, ngsMaxSpeedMph: 15.6,
        ngsMetricLabel: '90.5% Pass Block Win Rate',
        scoutingReport: 'Veteran technician with disciplined posture and dependable blindside anchoring.'
      }
    },
    {
      id: 'LG', label: 'LG', name: 'Graham Glasgow', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -1.6, y: -0.3 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 64, acc: 70, agi: 66, str: 91,
        pbk_anchor: 88, pbk_lateral: 83, rbk_power: 90, rbk_reach: 85
      }),
      scouting: {
        ovr: 81, jersey: 60, height: "6'6\"", weightLbs: 315, armLengthIn: 33.13,
        fortyYdDash: 5.13, tenYdSplit: 1.78, ngsMaxSpeedMph: 15.2,
        ngsMetricLabel: '90.2% Run Block Win Rate',
        scoutingReport: 'Gritty interior battler; stout against interior nose tackles.'
      }
    },
    {
      id: 'C', label: 'C', name: 'Frank Ragnow', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 0.0, y: -0.2 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 71, acc: 77, agi: 74, str: 97,
        pbk_anchor: 95, pbk_lateral: 92, rbk_power: 98, rbk_reach: 94
      }),
      scouting: {
        ovr: 94, jersey: 77, height: "6'5\"", weightLbs: 311, armLengthIn: 33.13,
        fortyYdDash: 4.99, tenYdSplit: 1.74, ngsMaxSpeedMph: 16.8,
        ngsMetricLabel: '#1 PFF Graded Center in NFL',
        scoutingReport: 'The standard for NFL centers. Iron-willed toughness, immovable anchor, and seamless pre-snap IDs.'
      }
    },
    {
      id: 'RG', label: 'RG', name: 'Kevin Zeitler', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 1.6, y: -0.3 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 63, acc: 68, agi: 65, str: 93,
        pbk_anchor: 91, pbk_lateral: 85, rbk_power: 91, rbk_reach: 84
      }),
      scouting: {
        ovr: 84, jersey: 70, height: "6'4\"", weightLbs: 340, armLengthIn: 32.75,
        fortyYdDash: 5.39, tenYdSplit: 1.84, ngsMaxSpeedMph: 14.8,
        ngsMetricLabel: '13-year veteran starter | 92.1% pass protection grade',
        scoutingReport: 'Experienced pass protection technician with heavy hands and low center of gravity.'
      }
    },
    {
      id: 'RT', label: 'RT', name: 'Penei Sewell', team: 'OFF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 3.2, y: -0.4 }, role: 'OL', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 77, acc: 83, agi: 81, str: 98,
        pbk_anchor: 97, pbk_lateral: 97, rbk_power: 99, rbk_reach: 96
      }),
      scouting: {
        ovr: 98, jersey: 58, height: "6'5\"", weightLbs: 335, armLengthIn: 33.25,
        fortyYdDash: 5.09, tenYdSplit: 1.76, ngsMaxSpeedMph: 18.2,
        ngsMetricLabel: 'First-Team All-Pro | #1 Offensive Lineman in football',
        scoutingReport: 'Mauling force of nature with nimble feet. Completely deletes pass rushers at the edge.'
      }
    },
    {
      id: 'WR1', label: 'X-WR1', name: 'Jameson Williams', team: 'OFF', archetype: 'LEAN_SPEED', eligible: true,
      startPos: { x: -17.5, y: -0.2 }, role: 'ROUTE', readOrder: 1,
      waypoints: [{ x: -17.5, y: 14.0 }, { x: 5.0, y: 24.0 }],
      ratings: makeRatings({
        spd: 98, acc: 98, agi: 93, str: 62,
        release_press: 85, rr_short: 85, rr_med: 87, rr_deep: 96,
        catch_hands: 87, catch_traffic: 82, catch_radius: 88,
        btk_power: 70, elusiveness: 94, lateral_vision: 84
      }),
      scouting: {
        ovr: 82, jersey: 9, height: "6'1\"", weightLbs: 180, armLengthIn: 32.13,
        fortyYdDash: 4.28, tenYdSplit: 1.48, ngsMaxSpeedMph: 22.4,
        ngsMetricLabel: '22.4 mph top speed (Fastest ballcarrier in NFL 2024)',
        scoutingReport: 'Atomic field-tilting speed. Forces safeties 20 yards deep on every snap.'
      }
    },
    {
      id: 'SLOT', label: 'H-SLOT', name: 'Amon-Ra St. Brown', team: 'OFF', archetype: 'BALANCED_SKILL', eligible: true,
      startPos: { x: -8.5, y: -0.8 }, role: 'ROUTE', readOrder: 2,
      waypoints: [{ x: -8.5, y: 6.0 }, { x: -15.5, y: 6.5 }],
      ratings: makeRatings({
        spd: 90, acc: 93, agi: 95, str: 79,
        release_press: 94, rr_short: 98, rr_med: 97, rr_deep: 92,
        catch_hands: 99, catch_traffic: 97, catch_radius: 93,
        btk_power: 86, elusiveness: 91, lateral_vision: 89
      }),
      scouting: {
        ovr: 95, jersey: 14, height: "6'0\"", weightLbs: 202, armLengthIn: 31.5,
        fortyYdDash: 4.51, tenYdSplit: 1.54, ngsMaxSpeedMph: 20.6,
        ngsMetricLabel: '78.5% conversion on 3rd down targets | 1.8% drop rate',
        scoutingReport: 'The Sun God. Relentless route technician with best hands in football; automatic 3rd-down converter.'
      }
    },
    {
      id: 'TE', label: 'Y-TE', name: 'Sam LaPorta', team: 'OFF', archetype: 'POWER_HYBRID', eligible: true,
      startPos: { x: 4.9, y: -0.5 }, role: 'ROUTE', readOrder: 3,
      waypoints: [{ x: 4.9, y: 8.5 }, { x: 12.0, y: 14.0 }],
      ratings: makeRatings({
        spd: 87, acc: 88, agi: 87, str: 82,
        pbk_anchor: 80, pbk_lateral: 78, rbk_power: 84,
        rr_short: 90, rr_med: 90, rr_deep: 86, catch_hands: 92, catch_traffic: 91,
        btk_power: 86, lateral_vision: 85
      }),
      scouting: {
        ovr: 89, jersey: 87, height: "6'3\"", weightLbs: 245, armLengthIn: 32.13,
        fortyYdDash: 4.59, tenYdSplit: 1.59, ngsMaxSpeedMph: 20.1,
        ngsMetricLabel: 'Record 86 catches by rookie tight end',
        scoutingReport: 'Iowa tight end pipeline star. Natural separator against linebackers and safeties on seam and crosser routes.'
      }
    },
    {
      id: 'WR2', label: 'Z-WR2', name: 'Tim Patrick', team: 'OFF', archetype: 'POWER_HYBRID', eligible: true,
      startPos: { x: 16.5, y: -0.6 }, role: 'ROUTE', readOrder: 4,
      waypoints: [{ x: 16.5, y: 11.0 }, { x: 6.0, y: 11.5 }],
      ratings: makeRatings({
        spd: 88, acc: 89, agi: 87, str: 82,
        release_press: 88, rr_short: 86, rr_med: 87, rr_deep: 85,
        catch_hands: 91, catch_traffic: 90, catch_radius: 93,
        btk_power: 81, elusiveness: 79, lateral_vision: 80
      }),
      scouting: {
        ovr: 79, jersey: 17, height: "6'4\"", weightLbs: 212, armLengthIn: 33.0,
        fortyYdDash: 4.55, tenYdSplit: 1.58, ngsMaxSpeedMph: 19.5,
        ngsMetricLabel: '6\'4\" catch radius | 85.2% contested catch win rate',
        scoutingReport: 'Big-bodied boundary target with strong hands and aggressive run-blocking toughness.'
      }
    },
    {
      id: 'RB', label: 'RB', name: 'Jahmyr Gibbs', team: 'OFF', archetype: 'LEAN_SPEED', eligible: true,
      startPos: { x: -2.0, y: -4.8 }, role: 'ROUTE', readOrder: 5,
      waypoints: [{ x: -7.5, y: -1.5 }, { x: -13.5, y: 3.5 }],
      ratings: makeRatings({
        spd: 96, acc: 97, agi: 97, str: 76,
        pbk_anchor: 68, pbk_lateral: 74, rr_short: 92, catch_hands: 93, catch_traffic: 84,
        btk_power: 82, elusiveness: 97, lateral_vision: 96
      }),
      scouting: {
        ovr: 91, jersey: 26, height: "5'9\"", weightLbs: 200, armLengthIn: 30.5,
        fortyYdDash: 4.36, tenYdSplit: 1.52, ngsMaxSpeedMph: 22.3,
        ngsMetricLabel: '4.36s 40-yd dash | +5.1 yards per route run',
        scoutingReport: 'Explosive mismatch weapon out of backfield. Instant acceleration and wide receiver route caliber.'
      }
    },
  ];
}

export function createJaguarsDefense(): PlayerConfig[] {
  return [
    {
      id: 'LDE', label: 'EDGE1', name: 'Josh Hines-Allen', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -4.2, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 88, acc: 92, agi: 88, str: 89,
        rush_power: 95, rush_speed: 96, bsh_shed: 94, get_off_burst: 93, tak_wrap: 89, tak_hit_power: 91
      }),
      scouting: {
        ovr: 92, jersey: 41, height: "6'5\"", weightLbs: 255, armLengthIn: 33.5,
        fortyYdDash: 4.63, tenYdSplit: 1.61, ngsMaxSpeedMph: 20.1,
        ngsMetricLabel: '17.5 sacks in 2023 | 21.2% Pass Rush Win Rate',
        scoutingReport: 'Elite speed-to-power edge rusher with dominant rip move and closing burst.'
      }
    },
    {
      id: 'DT1', label: 'DT1', name: 'Arik Armstead', team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 73, acc: 80, agi: 74, str: 94,
        rush_power: 92, rush_speed: 84, bsh_shed: 91, get_off_burst: 85, tak_wrap: 88
      }),
      scouting: {
        ovr: 86, jersey: 91, height: "6'7\"", weightLbs: 290, armLengthIn: 33.0,
        fortyYdDash: 5.10, tenYdSplit: 1.75, ngsMaxSpeedMph: 16.5,
        ngsMetricLabel: 'Interior pressure rate: 12.4%',
        scoutingReport: 'Long-limbed interior disruptor; pushes the interior pocket pocket rim directly into QBs lap.'
      }
    },
    {
      id: 'DT2', label: 'DT2', name: 'DaVon Hamilton', team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 69, acc: 76, agi: 68, str: 95,
        rush_power: 91, rush_speed: 72, bsh_shed: 90, get_off_burst: 81, tak_wrap: 89
      }),
      scouting: {
        ovr: 80, jersey: 52, height: "6'4\"", weightLbs: 335, armLengthIn: 33.0,
        fortyYdDash: 5.14, tenYdSplit: 1.78, ngsMaxSpeedMph: 15.0,
        ngsMetricLabel: 'Zero-technique run stuffer',
        scoutingReport: 'Space-eating interior anchor who occupies double teams to keep linebackers clean.'
      }
    },
    {
      id: 'RDE', label: 'EDGE2', name: 'Travon Walker', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 4.5, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 90, acc: 93, agi: 89, str: 92,
        rush_power: 94, rush_speed: 92, bsh_shed: 91, get_off_burst: 91, tak_wrap: 90, tak_hit_power: 93
      }),
      scouting: {
        ovr: 86, jersey: 44, height: "6'5\"", weightLbs: 272, armLengthIn: 35.5,
        fortyYdDash: 4.51, tenYdSplit: 1.54, ngsMaxSpeedMph: 20.8,
        ngsMetricLabel: '9.99 RAS score | 35.5\" arms',
        scoutingReport: 'Rare physical specimen. Bull rush shocks offensive tackles back on their heels.'
      }
    },
    {
      id: 'CB1', label: 'CB1', name: 'Tyson Campbell', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: -17.0, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 95, acc: 94, agi: 93, str: 73,
        press_jam: 92, cov_man: 93, cov_zone: 89, catch_contest: 92, ball_hawk: 85, tak_wrap: 83
      }),
      scouting: {
        ovr: 88, jersey: 3, height: "6'1\"", weightLbs: 195, armLengthIn: 32.0,
        fortyYdDash: 4.38, tenYdSplit: 1.50, ngsMaxSpeedMph: 21.8,
        ngsMetricLabel: '4.38s speed | 54.2% allowed completion rate',
        scoutingReport: 'Top-tier boundary man corner. Fluid hips to carry vertical speed with length to contest catches.'
      }
    },
    {
      id: 'CB2', label: 'CB2', name: 'Ronald Darby', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: 16.5, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 93, acc: 92, agi: 91, str: 66,
        press_jam: 83, cov_man: 88, cov_zone: 87, catch_contest: 87, ball_hawk: 82, tak_wrap: 79
      }),
      scouting: {
        ovr: 81, jersey: 30, height: "5'11\"", weightLbs: 193, armLengthIn: 31.38,
        fortyYdDash: 4.38, tenYdSplit: 1.50, ngsMaxSpeedMph: 21.2,
        ngsMetricLabel: '10-year veteran speed corner',
        scoutingReport: 'Experienced trail-technique cornerback with steady recovery speed.'
      }
    },
    {
      id: 'NCB', label: 'NICKEL', name: 'Jarrian Jones', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: -8.5, y: 4.8 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 94, acc: 94, agi: 93, str: 69,
        press_jam: 86, cov_man: 89, cov_zone: 88, catch_contest: 89, ball_hawk: 86, tak_wrap: 81
      }),
      scouting: {
        ovr: 78, jersey: 22, height: "6'0\"", weightLbs: 190, armLengthIn: 30.0,
        fortyYdDash: 4.38, tenYdSplit: 1.49, ngsMaxSpeedMph: 21.5,
        ngsMetricLabel: '4.38s 40-yd dash | 9.87 RAS',
        scoutingReport: 'Twitchy rookie slot defender with sudden trigger on out-breaking routes.'
      }
    },
    {
      id: 'WLB', label: 'WLB', name: 'Devin Lloyd', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -3.2, y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 88, acc: 89, agi: 86, str: 86,
        cov_man: 83, cov_zone: 90, play_rec: 88, bsh_shed: 89, tak_wrap: 91, tak_hit_power: 92
      }),
      scouting: {
        ovr: 85, jersey: 0, height: "6'3\"", weightLbs: 237, armLengthIn: 33.0,
        fortyYdDash: 4.66, tenYdSplit: 1.58, ngsMaxSpeedMph: 20.0,
        ngsMetricLabel: 'Leader in pass breakups among LBs',
        scoutingReport: 'Sideline-to-sideline range with wide wingspan to choke throwing lanes over the middle.'
      }
    },
    {
      id: 'MLB', label: 'MLB', name: 'Foyesade Oluokun', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 2.2, y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 87, acc: 88, agi: 86, str: 87,
        cov_man: 81, cov_zone: 89, play_rec: 94, bsh_shed: 91, tak_wrap: 97, tak_hit_power: 90
      }),
      scouting: {
        ovr: 88, jersey: 23, height: "6'2\"", weightLbs: 230, armLengthIn: 32.5,
        fortyYdDash: 4.48, tenYdSplit: 1.53, ngsMaxSpeedMph: 20.2,
        ngsMetricLabel: 'Led NFL in tackles 2021 & 2022 (184 tackles)',
        scoutingReport: 'Tackling machine with Ivy League football IQ. Diagnoses misdirection instantly.'
      }
    },
    {
      id: 'SS', label: 'SS', name: 'Antonio Johnson', team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 6.5, y: 8.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 90, acc: 90, agi: 89, str: 81,
        cov_man: 85, cov_zone: 88, play_rec: 86, catch_contest: 88, ball_hawk: 84, tak_wrap: 90, tak_hit_power: 91
      }),
      scouting: {
        ovr: 81, jersey: 26, height: "6'2\"", weightLbs: 200, armLengthIn: 32.13,
        fortyYdDash: 4.52, tenYdSplit: 1.56, ngsMaxSpeedMph: 20.5,
        ngsMetricLabel: 'Hybrid box/overhang safety',
        scoutingReport: 'Physical enforcer in the intermediate flat; lays jarring hits on crossers.'
      }
    },
    {
      id: 'FS', label: 'FS', name: 'Andre Cisco', team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 0.0, y: 13.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 93, acc: 92, agi: 91, str: 75,
        cov_man: 82, cov_zone: 94, play_rec: 90, catch_contest: 94, ball_hawk: 95, tak_wrap: 86, tak_hit_power: 89
      }),
      scouting: {
        ovr: 84, jersey: 5, height: "6'0\"", weightLbs: 216, armLengthIn: 31.0,
        fortyYdDash: 4.45, tenYdSplit: 1.54, ngsMaxSpeedMph: 21.4,
        ngsMetricLabel: '7 interceptions in 2 seasons | 95 Ball Hawk',
        scoutingReport: 'True centerfield ball-hawk with great range from single-high deep alignment.'
      }
    },
  ];
}

export function createChiefsDefense(): PlayerConfig[] {
  return [
    {
      id: 'LDE', label: 'EDGE1', name: 'George Karlaftis', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -4.2, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 84, acc: 88, agi: 83, str: 92,
        rush_power: 93, rush_speed: 86, bsh_shed: 92, get_off_burst: 88, tak_wrap: 90, tak_hit_power: 91
      }),
      scouting: {
        ovr: 86, jersey: 56, height: "6'4\"", weightLbs: 263, armLengthIn: 32.63,
        fortyYdDash: 4.71, tenYdSplit: 1.65, ngsMaxSpeedMph: 19.4,
        ngsMetricLabel: '10.5 sacks in 2023 | 64 QB pressures',
        scoutingReport: 'Furious relentless motor. Collapses the edge on second effort.'
      }
    },
    {
      id: 'DT1', label: 'DT1', name: 'Chris Jones', team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 78, acc: 86, agi: 82, str: 98,
        rush_power: 99, rush_speed: 95, bsh_shed: 97, get_off_burst: 95, tak_wrap: 93, tak_hit_power: 96
      }),
      scouting: {
        ovr: 97, jersey: 95, height: "6'6\"", weightLbs: 310, armLengthIn: 34.5,
        fortyYdDash: 4.96, tenYdSplit: 1.70, ngsMaxSpeedMph: 18.0,
        ngsMetricLabel: '#1 Interior Pass Rush Win Rate (22.5%)',
        scoutingReport: 'Game-wrecking interior pass rusher. Wins one-on-one matchups with devastating arm-over move.'
      }
    },
    {
      id: 'DT2', label: 'DT2', name: 'Tershawn Wharton', team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 75, acc: 81, agi: 76, str: 88,
        rush_power: 87, rush_speed: 84, bsh_shed: 86, get_off_burst: 86, tak_wrap: 84
      }),
      scouting: {
        ovr: 78, jersey: 98, height: "6'1\"", weightLbs: 280, armLengthIn: 31.25,
        fortyYdDash: 4.88, tenYdSplit: 1.68, ngsMaxSpeedMph: 17.2,
        ngsMetricLabel: 'Quick-twitch interior penetrator',
        scoutingReport: 'Undersized sub-package 3-tech who slips guards with quick lateral burst.'
      }
    },
    {
      id: 'RDE', label: 'EDGE2', name: 'Mike Danna', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 4.5, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 82, acc: 86, agi: 82, str: 90,
        rush_power: 89, rush_speed: 85, bsh_shed: 89, get_off_burst: 85, tak_wrap: 88, tak_hit_power: 89
      }),
      scouting: {
        ovr: 81, jersey: 51, height: "6'2\"", weightLbs: 257, armLengthIn: 32.25,
        fortyYdDash: 4.77, tenYdSplit: 1.66, ngsMaxSpeedMph: 19.0,
        ngsMetricLabel: 'Disciplined edge setter in Spagnuolo system',
        scoutingReport: 'Dependable strongside defensive end with heavy punch and assignment discipline.'
      }
    },
    {
      id: 'CB1', label: 'CB1', name: 'Trent McDuffie', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: -17.0, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 94, acc: 95, agi: 96, str: 74,
        press_jam: 94, cov_man: 95, cov_zone: 95, play_rec: 94, catch_contest: 95, ball_hawk: 89,
        tak_wrap: 91, tak_hit_power: 89
      }),
      scouting: {
        ovr: 93, jersey: 22, height: "5'11\"", weightLbs: 193, armLengthIn: 29.75,
        fortyYdDash: 4.44, tenYdSplit: 1.53, ngsMaxSpeedMph: 21.6,
        ngsMetricLabel: 'First-Team All-Pro | Zero TDs allowed in slot 2023',
        scoutingReport: 'Complete cornerback. Can shadow #1 WR, lock down slot, and blitz off the edge like a linebacker.'
      }
    },
    {
      id: 'CB2', label: 'CB2', name: 'Jaylen Watson', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: 16.5, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 92, acc: 92, agi: 90, str: 74,
        press_jam: 90, cov_man: 88, cov_zone: 87, catch_contest: 89, ball_hawk: 85, tak_wrap: 82
      }),
      scouting: {
        ovr: 81, jersey: 35, height: "6'2\"", weightLbs: 197, armLengthIn: 32.25,
        fortyYdDash: 4.47, tenYdSplit: 1.54, ngsMaxSpeedMph: 21.0,
        ngsMetricLabel: 'Lengthy press-man corner',
        scoutingReport: 'Physical boundary press specialist; jams receivers at the line to disrupt timing.'
      }
    },
    {
      id: 'NCB', label: 'NICKEL', name: 'Chamarri Conner', team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: -8.5, y: 4.8 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 92, acc: 93, agi: 91, str: 80,
        press_jam: 88, cov_man: 87, cov_zone: 88, catch_contest: 87, tak_wrap: 89, tak_hit_power: 92
      }),
      scouting: {
        ovr: 79, jersey: 27, height: "6'0\"", weightLbs: 202, armLengthIn: 31.5,
        fortyYdDash: 4.51, tenYdSplit: 1.56, ngsMaxSpeedMph: 20.8,
        ngsMetricLabel: 'Hard-hitting hybrid safety/nickel',
        scoutingReport: 'Versatile defensive back who flies up to tackle and delivers punishing hit power.'
      }
    },
    {
      id: 'WLB', label: 'WLB', name: 'Drue Tranquill', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -3.2, y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 88, acc: 90, agi: 89, str: 83,
        cov_man: 88, cov_zone: 91, play_rec: 92, bsh_shed: 87, tak_wrap: 91, tak_hit_power: 87
      }),
      scouting: {
        ovr: 85, jersey: 23, height: "6'2\"", weightLbs: 235, armLengthIn: 31.5,
        fortyYdDash: 4.57, tenYdSplit: 1.57, ngsMaxSpeedMph: 20.4,
        ngsMetricLabel: '87.4 coverage grade vs RBs and TEs',
        scoutingReport: 'Elite coverage linebacker. Matches tight ends stride-for-stride and diagnoses screen plays.'
      }
    },
    {
      id: 'MLB', label: 'MLB', name: 'Nick Bolton', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 2.2, y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 86, acc: 89, agi: 86, str: 90,
        cov_man: 81, cov_zone: 88, play_rec: 96, bsh_shed: 93, tak_wrap: 97, tak_hit_power: 94
      }),
      scouting: {
        ovr: 89, jersey: 32, height: "5'11\"", weightLbs: 237, armLengthIn: 31.88,
        fortyYdDash: 4.59, tenYdSplit: 1.58, ngsMaxSpeedMph: 20.1,
        ngsMetricLabel: 'Defensive signal caller | 96 Play Recognition',
        scoutingReport: 'Heart and soul of the defense. Supreme diagnose-and-attack downhill thumper.'
      }
    },
    {
      id: 'SS', label: 'SS', name: 'Justin Reid', team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 6.5, y: 8.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 92, acc: 92, agi: 90, str: 82,
        cov_man: 87, cov_zone: 89, play_rec: 91, catch_contest: 90, ball_hawk: 86, tak_wrap: 91, tak_hit_power: 91
      }),
      scouting: {
        ovr: 86, jersey: 20, height: "6'1\"", weightLbs: 207, armLengthIn: 31.63,
        fortyYdDash: 4.40, tenYdSplit: 1.51, ngsMaxSpeedMph: 21.2,
        ngsMetricLabel: '4.40s speed | 14 passes defended / INTs',
        scoutingReport: 'Versatile chess piece who aligns in box, deep half, or blitzes off slot.'
      }
    },
    {
      id: 'FS', label: 'FS', name: 'Bryan Cook', team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 0.0, y: 13.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 91, acc: 91, agi: 89, str: 80,
        cov_man: 84, cov_zone: 91, play_rec: 89, catch_contest: 91, ball_hawk: 88, tak_wrap: 90, tak_hit_power: 93
      }),
      scouting: {
        ovr: 82, jersey: 6, height: "6'1\"", weightLbs: 206, armLengthIn: 31.88,
        fortyYdDash: 4.53, tenYdSplit: 1.57, ngsMaxSpeedMph: 20.8,
        ngsMetricLabel: 'Enforcer over the middle of field',
        scoutingReport: 'Fearless downhill safety who separates ball from receiver with violent hit power.'
      }
    },
  ];
}

export function createRavensDefense(): PlayerConfig[] {
  return [
    {
      id: 'LDE', label: 'EDGE1', name: 'Odafe Oweh', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -4.2, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 92, acc: 94, agi: 90, str: 88,
        rush_power: 90, rush_speed: 94, bsh_shed: 89, get_off_burst: 96, tak_wrap: 88, tak_hit_power: 90
      }),
      scouting: {
        ovr: 84, jersey: 99, height: "6'5\"", weightLbs: 257, armLengthIn: 34.5,
        fortyYdDash: 4.37, tenYdSplit: 1.48, ngsMaxSpeedMph: 21.5,
        ngsMetricLabel: '4.37s 40-yd dash (fastest DE ever at Combine)',
        scoutingReport: 'Rare athletic burst around the edge. First step threatens tackles vertical set instantly.'
      }
    },
    {
      id: 'DT1', label: 'DT1', name: 'Michael Pierce', team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 65, acc: 72, agi: 66, str: 98,
        rush_power: 93, rush_speed: 74, bsh_shed: 96, get_off_burst: 81, tak_wrap: 93
      }),
      scouting: {
        ovr: 85, jersey: 58, height: "6'0\"", weightLbs: 345, armLengthIn: 31.0,
        fortyYdDash: 5.25, tenYdSplit: 1.82, ngsMaxSpeedMph: 14.5,
        ngsMetricLabel: '345 lbs anchor | 96 Block Shed',
        scoutingReport: 'True two-gapping zero-technique brick wall. Impossible to move one-on-one.'
      }
    },
    {
      id: 'DT2', label: 'DT2', name: 'Justin Madubuike', team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 82, acc: 88, agi: 83, str: 95,
        rush_power: 96, rush_speed: 93, bsh_shed: 94, get_off_burst: 93, tak_wrap: 91, tak_hit_power: 94
      }),
      scouting: {
        ovr: 92, jersey: 92, height: "6'3\"", weightLbs: 305, armLengthIn: 33.5,
        fortyYdDash: 4.83, tenYdSplit: 1.66, ngsMaxSpeedMph: 18.8,
        ngsMetricLabel: '13.0 sacks in 2023 | 11 straight games with a sack',
        scoutingReport: 'Explosive interior pass rusher. Bullies guards with heavy hands and explosive get-off.'
      }
    },
    {
      id: 'RDE', label: 'EDGE2', name: 'Kyle Van Noy', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 4.5, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 84, acc: 88, agi: 85, str: 88,
        rush_power: 91, rush_speed: 90, bsh_shed: 89, get_off_burst: 89, tak_wrap: 89, tak_hit_power: 90
      }),
      scouting: {
        ovr: 83, jersey: 53, height: "6'3\"", weightLbs: 250, armLengthIn: 31.63,
        fortyYdDash: 4.71, tenYdSplit: 1.63, ngsMaxSpeedMph: 19.5,
        ngsMetricLabel: '9.0 sacks in 2023 | Veteran rush craft',
        scoutingReport: 'Cerebral edge rusher who sets up blockers with savvy hands and stunt coordination.'
      }
    },
    {
      id: 'CB1', label: 'CB1', name: 'Marlon Humphrey', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -17.0, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 93, acc: 93, agi: 92, str: 79,
        press_jam: 96, cov_man: 93, cov_zone: 91, play_rec: 93, catch_contest: 93, ball_hawk: 90,
        tak_wrap: 91, tak_hit_power: 94
      }),
      scouting: {
        ovr: 91, jersey: 44, height: "6'0\"", weightLbs: 201, armLengthIn: 32.25,
        fortyYdDash: 4.41, tenYdSplit: 1.51, ngsMaxSpeedMph: 21.4,
        ngsMetricLabel: 'Fruit Punch master | 8 forced fumbles in a season',
        scoutingReport: 'Most physical corner in the league. Violent press jam and legendary peanut punch on ballcarriers.'
      }
    },
    {
      id: 'CB2', label: 'CB2', name: 'Nate Wiggins', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: 16.5, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 97, acc: 97, agi: 95, str: 62,
        press_jam: 84, cov_man: 92, cov_zone: 88, catch_contest: 91, ball_hawk: 86, tak_wrap: 79
      }),
      scouting: {
        ovr: 79, jersey: 2, height: "6'1\"", weightLbs: 182, armLengthIn: 30.5,
        fortyYdDash: 4.28, tenYdSplit: 1.47, ngsMaxSpeedMph: 22.6,
        ngsMetricLabel: '4.28s 40-yd dash (Fastest CB at 2024 Combine)',
        scoutingReport: 'Blazing recovery wheels. Can erase 5 yards of separation in 2 strides.'
      }
    },
    {
      id: 'NCB', label: 'NICKEL', name: 'Arthur Maulet', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: -8.5, y: 4.8 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 90, acc: 91, agi: 90, str: 73,
        press_jam: 87, cov_man: 86, cov_zone: 87, catch_contest: 86, tak_wrap: 85, tak_hit_power: 87
      }),
      scouting: {
        ovr: 78, jersey: 10, height: "5'10\"", weightLbs: 190, armLengthIn: 30.5,
        fortyYdDash: 4.54, tenYdSplit: 1.58, ngsMaxSpeedMph: 20.2,
        ngsMetricLabel: 'Effective slot blitz pressure specialist',
        scoutingReport: 'Aggressive slot nickel who excels shooting gaps on corner blitzes.'
      }
    },
    {
      id: 'WLB', label: 'WLB', name: 'Trenton Simpson', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -3.2, y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 91, acc: 93, agi: 88, str: 86,
        cov_man: 85, cov_zone: 88, play_rec: 85, bsh_shed: 87, tak_wrap: 89, tak_hit_power: 92
      }),
      scouting: {
        ovr: 78, jersey: 23, height: "6'2\"", weightLbs: 238, armLengthIn: 32.38,
        fortyYdDash: 4.43, tenYdSplit: 1.51, ngsMaxSpeedMph: 21.0,
        ngsMetricLabel: '4.43s 40-yd dash speed linebacker',
        scoutingReport: 'Sideline burner who flows to the perimeter before ballcarrier can turn upfield.'
      }
    },
    {
      id: 'MLB', label: 'MLB', name: 'Roquan Smith', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 2.2, y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 89, acc: 92, agi: 89, str: 91,
        cov_man: 88, cov_zone: 95, play_rec: 98, bsh_shed: 94, tak_wrap: 98, tak_hit_power: 96
      }),
      scouting: {
        ovr: 96, jersey: 0, height: "6'1\"", weightLbs: 236, armLengthIn: 32.0,
        fortyYdDash: 4.51, tenYdSplit: 1.53, ngsMaxSpeedMph: 20.8,
        ngsMetricLabel: 'Two-time First-Team All-Pro | 98 Play Rec',
        scoutingReport: 'Premier inside linebacker in modern football. Triggers on the ball before the center can release.'
      }
    },
    {
      id: 'SS', label: 'SS', name: 'Kyle Hamilton', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 6.5, y: 8.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 91, acc: 93, agi: 93, str: 88,
        press_jam: 93, cov_man: 94, cov_zone: 97, play_rec: 96, catch_contest: 97, ball_hawk: 94,
        tak_wrap: 95, tak_hit_power: 95
      }),
      scouting: {
        ovr: 96, jersey: 14, height: "6'4\"", weightLbs: 220, armLengthIn: 33.0,
        fortyYdDash: 4.56, tenYdSplit: 1.57, ngsMaxSpeedMph: 21.4,
        ngsMetricLabel: 'First-Team All-Pro | #1 Safety in NFL',
        scoutingReport: 'The ultimate NFL defensive weapon. Aligns at slot, deep half, box, or edge rusher; erases entire concepts.'
      }
    },
    {
      id: 'FS', label: 'FS', name: 'Marcus Williams', team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 0.0, y: 13.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 91, acc: 90, agi: 89, str: 76,
        cov_man: 82, cov_zone: 93, play_rec: 92, catch_contest: 93, ball_hawk: 93, tak_wrap: 87, tak_hit_power: 87
      }),
      scouting: {
        ovr: 86, jersey: 32, height: "6'1\"", weightLbs: 207, armLengthIn: 32.5,
        fortyYdDash: 4.49, tenYdSplit: 1.55, ngsMaxSpeedMph: 21.0,
        ngsMetricLabel: 'Deep centerfielder with 20 career INTs',
        scoutingReport: 'Deep MOF safety who reads QB eyes from depth and breaks on post routes.'
      }
    },
  ];
}

export function create49ersDefense(): PlayerConfig[] {
  return [
    {
      id: 'LDE', label: 'EDGE1', name: 'Nick Bosa', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -4.5, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 90, acc: 95, agi: 93, str: 96,
        rush_power: 99, rush_speed: 98, bsh_shed: 98, get_off_burst: 98, tak_wrap: 94, tak_hit_power: 95
      }),
      scouting: {
        ovr: 98, jersey: 97, height: "6'4\"", weightLbs: 266, armLengthIn: 33.0,
        fortyYdDash: 4.60, tenYdSplit: 1.55, ngsMaxSpeedMph: 20.8,
        ngsMetricLabel: 'Defensive Player of the Year | 23.4% Pass Rush Win Rate',
        scoutingReport: 'The benchmark NFL edge rusher. Violent hand swipe, impossible ankle flexion on bend, and elite bull rush.'
      }
    },
    {
      id: 'DT1', label: 'DT1', name: 'Maliek Collins', team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: -1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 75, acc: 82, agi: 76, str: 91,
        rush_power: 91, rush_speed: 87, bsh_shed: 89, get_off_burst: 89, tak_wrap: 86
      }),
      scouting: {
        ovr: 83, jersey: 90, height: "6'2\"", weightLbs: 310, armLengthIn: 33.0,
        fortyYdDash: 5.03, tenYdSplit: 1.74, ngsMaxSpeedMph: 16.8,
        ngsMetricLabel: 'Wide-9 interior penetrator',
        scoutingReport: 'Attacks 3-technique gap with quick first step to disrupt timing routes.'
      }
    },
    {
      id: 'DT2', label: 'DT2', name: 'Jordan Elliott', team: 'DEF', archetype: 'HEAVY_TRENCH', eligible: false,
      startPos: { x: 1.4, y: 0.6 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 70, acc: 77, agi: 72, str: 92,
        rush_power: 88, rush_speed: 78, bsh_shed: 88, get_off_burst: 82, tak_wrap: 87
      }),
      scouting: {
        ovr: 77, jersey: 92, height: "6'4\"", weightLbs: 303, armLengthIn: 32.38,
        fortyYdDash: 5.02, tenYdSplit: 1.76, ngsMaxSpeedMph: 16.0,
        ngsMetricLabel: 'Interior anchor',
        scoutingReport: 'Interior rotational tackle who holds ground vs double teams.'
      }
    },
    {
      id: 'RDE', label: 'EDGE2', name: 'Leonard Floyd', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 4.5, y: 0.7 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 87, acc: 90, agi: 87, str: 87,
        rush_power: 90, rush_speed: 92, bsh_shed: 89, get_off_burst: 91, tak_wrap: 88, tak_hit_power: 89
      }),
      scouting: {
        ovr: 84, jersey: 54, height: "6'5\"", weightLbs: 240, armLengthIn: 33.13,
        fortyYdDash: 4.60, tenYdSplit: 1.59, ngsMaxSpeedMph: 20.2,
        ngsMetricLabel: '10.5 sacks in 2023 | 4 straight 9+ sack seasons',
        scoutingReport: 'Long, bendy edge rusher who threatens the outside arc and finishes sacks.'
      }
    },
    {
      id: 'CB1', label: 'CB1', name: 'Charvarius Ward', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: -17.0, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 93, acc: 93, agi: 92, str: 75,
        press_jam: 95, cov_man: 94, cov_zone: 92, play_rec: 92, catch_contest: 95, ball_hawk: 91,
        tak_wrap: 86, tak_hit_power: 88
      }),
      scouting: {
        ovr: 91, jersey: 7, height: "6'1\"", weightLbs: 196, armLengthIn: 32.25,
        fortyYdDash: 4.44, tenYdSplit: 1.52, ngsMaxSpeedMph: 21.5,
        ngsMetricLabel: '5 INTs in 2023 | Led NFL with 23 passes defensed',
        scoutingReport: 'Physical press corner with elite length and hand placement. Erases outside go routes.'
      }
    },
    {
      id: 'CB2', label: 'CB2', name: 'Deommodore Lenoir', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: 16.5, y: 5.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 92, acc: 93, agi: 93, str: 73,
        press_jam: 91, cov_man: 91, cov_zone: 90, play_rec: 90, catch_contest: 90, ball_hawk: 87,
        tak_wrap: 87, tak_hit_power: 89
      }),
      scouting: {
        ovr: 86, jersey: 2, height: "5'10\"", weightLbs: 191, armLengthIn: 30.75,
        fortyYdDash: 4.44, tenYdSplit: 1.54, ngsMaxSpeedMph: 21.2,
        ngsMetricLabel: 'Hybrid boundary and nickel starter',
        scoutingReport: 'Tenacious dog mentality. Glides in coverage and hits like a strong safety.'
      }
    },
    {
      id: 'NCB', label: 'NICKEL', name: 'Isaac Yiadom', team: 'DEF', archetype: 'LEAN_SPEED', eligible: false,
      startPos: { x: -8.5, y: 4.8 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 91, acc: 92, agi: 90, str: 72,
        press_jam: 88, cov_man: 87, cov_zone: 88, catch_contest: 89, tak_wrap: 84
      }),
      scouting: {
        ovr: 79, jersey: 22, height: "6'1\"", weightLbs: 188, armLengthIn: 32.25,
        fortyYdDash: 4.52, tenYdSplit: 1.56, ngsMaxSpeedMph: 20.6,
        ngsMetricLabel: '14 passes defensed in 2023',
        scoutingReport: 'Tall boundary/nickel corner with reach to disrupt quick slants.'
      }
    },
    {
      id: 'WLB', label: 'WLB', name: 'Dre Greenlaw', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: -3.2, y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 89, acc: 92, agi: 88, str: 89,
        cov_man: 86, cov_zone: 92, play_rec: 93, bsh_shed: 92, tak_wrap: 95, tak_hit_power: 96
      }),
      scouting: {
        ovr: 88, jersey: 57, height: "6'0\"", weightLbs: 230, armLengthIn: 32.25,
        fortyYdDash: 4.73, tenYdSplit: 1.62, ngsMaxSpeedMph: 20.7,
        ngsMetricLabel: 'Most feared missile tackler in football',
        scoutingReport: 'Fierce competitor who explodes through ballcarriers on contact. Eliminates perimeter screens.'
      }
    },
    {
      id: 'MLB', label: 'MLB', name: 'Fred Warner', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 2.2, y: 4.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 90, acc: 93, agi: 92, str: 91,
        cov_man: 93, cov_zone: 99, play_rec: 99, bsh_shed: 95, catch_contest: 96, ball_hawk: 95,
        tak_wrap: 99, tak_hit_power: 95
      }),
      scouting: {
        ovr: 99, jersey: 54, height: "6'3\"", weightLbs: 230, armLengthIn: 32.0,
        fortyYdDash: 4.64, tenYdSplit: 1.58, ngsMaxSpeedMph: 21.1,
        ngsMetricLabel: 'Madden 99 Club | #1 Linebacker in the World',
        scoutingReport: 'Defensive maestro. Drops 20 yards down the middle of field in Tampa 2; anticipates route combinations before WR breaks.'
      }
    },
    {
      id: 'SS', label: 'SS', name: 'Talanoa Hufanga', team: 'DEF', archetype: 'POWER_HYBRID', eligible: false,
      startPos: { x: 6.5, y: 8.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 89, acc: 91, agi: 88, str: 84,
        cov_man: 84, cov_zone: 92, play_rec: 95, catch_contest: 91, ball_hawk: 93, tak_wrap: 92, tak_hit_power: 96
      }),
      scouting: {
        ovr: 88, jersey: 29, height: "6'0\"", weightLbs: 200, armLengthIn: 32.0,
        fortyYdDash: 4.64, tenYdSplit: 1.63, ngsMaxSpeedMph: 20.5,
        ngsMetricLabel: 'First-Team All-Pro safety | Polamalu protégé',
        scoutingReport: 'Instinctual hawk who anticipates QB reads, triggers on flat passes, and forces turnovers.'
      }
    },
    {
      id: 'FS', label: 'FS', name: 'Ji\'Ayir Brown', team: 'DEF', archetype: 'BALANCED_SKILL', eligible: false,
      startPos: { x: 0.0, y: 13.5 }, role: 'PASS_BLOCK', readOrder: 0, waypoints: [],
      ratings: makeRatings({
        spd: 90, acc: 91, agi: 89, str: 78,
        cov_man: 83, cov_zone: 91, play_rec: 88, catch_contest: 90, ball_hawk: 91, tak_wrap: 88, tak_hit_power: 89
      }),
      scouting: {
        ovr: 80, jersey: 27, height: "5'11\"", weightLbs: 202, armLengthIn: 31.25,
        fortyYdDash: 4.65, tenYdSplit: 1.62, ngsMaxSpeedMph: 20.6,
        ngsMetricLabel: 'Super Bowl LVIII interception',
        scoutingReport: 'Opportunistic free safety with nose for the football in crucial moments.'
      }
    },
  ];
}

export interface MatchupPreset {
  id: MatchupPresetId;
  label: string;
  offenseName: string;
  defenseName: string;
  getOffense: () => PlayerConfig[];
  getDefense: () => PlayerConfig[];
  primaryDefCall: DefensiveCall;
  primaryDefFront: DefFront;
  tacticalBrief: string;
}

export const MATCHUP_PRESETS: Record<string, MatchupPreset> = {
  PHI_VS_JAX: {
    id: 'PHI_VS_JAX',
    label: 'PHI vs JAX (Baseline)',
    offenseName: 'Philadelphia Eagles',
    defenseName: 'Jacksonville Jaguars',
    getOffense: createEaglesOffense,
    getDefense: createJaguarsDefense,
    primaryDefCall: 'MIXED',
    primaryDefFront: 'OVER',
    tacticalBrief: 'Eagles elite trench line and Saquon/A.J. Brown face Hines-Allen and Campbell in a balanced matchup.',
  },
  PHI_VS_KC: {
    id: 'PHI_VS_KC',
    label: 'PHI vs KC (Super Bowl Rematch)',
    offenseName: 'Philadelphia Eagles',
    defenseName: 'Kansas City Chiefs',
    getOffense: createEaglesOffense,
    getDefense: createChiefsDefense,
    primaryDefCall: 'FIRE_ZONE_3',
    primaryDefFront: 'OVER',
    tacticalBrief: 'Steve Spagnuolo\'s exotic simulated pressures and Trent McDuffie test Hurts against Chris Jones.',
  },
  PHI_VS_BAL: {
    id: 'PHI_VS_BAL',
    label: 'PHI vs BAL (Heavyweight Clash)',
    offenseName: 'Philadelphia Eagles',
    defenseName: 'Baltimore Ravens',
    getOffense: createEaglesOffense,
    getDefense: createRavensDefense,
    primaryDefCall: 'COV4_QUARTERS',
    primaryDefFront: 'UNDER',
    tacticalBrief: 'Kyle Hamilton and Roquan Smith disguise coverages to challenge RPOs and intermediate dig routes.',
  },
  DET_VS_SF: {
    id: 'DET_VS_SF',
    label: 'DET vs SF (NFC Championship Rematch)',
    offenseName: 'Detroit Lions',
    defenseName: 'San Francisco 49ers',
    getOffense: createLionsOffense,
    getDefense: create49ersDefense,
    primaryDefCall: 'COV3_SKY',
    primaryDefFront: 'WIDE_9',
    tacticalBrief: 'Ben Johnson\'s play-action timing and Amon-Ra St. Brown meet Fred Warner and Nick Bosa\'s Wide-9 rush.',
  },
};

// ============================================================================
// CALL SHEET MATRIX EVALUATION
// ============================================================================
export interface CallSheetMatrixEntry {
  conceptId: OffensiveConceptId;
  conceptName: string;
  scheme: DefensiveCall;
  meanEpa: number;
  medianEpa: number;
  goalRate: number;
  epaSuccessRate: number;
  compRate: number;
  sackRate: number;
  pressureRate: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export function evaluateCallSheetMatrix(
  offense: PlayerConfig[],
  defense: PlayerConfig[],
  situation: SituationSpec,
  front: DefFront = 'OVER'
): CallSheetMatrixEntry[] {
  const schemes: DefensiveCall[] = [
    'COV3_SKY',
    'COV1_ROBBER',
    'COV2_TAMPA',
    'COV4_QUARTERS',
    'COV6_SPLIT',
    'FIRE_ZONE_3',
    'ZERO_BLITZ',
  ];

  const results: CallSheetMatrixEntry[] = [];
  const conceptIds = Object.keys(OFFENSIVE_CONCEPTS) as OffensiveConceptId[];

  for (const conceptId of conceptIds) {
    const concept = OFFENSIVE_CONCEPTS[conceptId];
    const offCopy = clonePlay(offense);
    const dropback = applyOffensiveConcept(offCopy, conceptId);

    for (const scheme of schemes) {
      const summary = runMonteCarloBatch(
        offCopy,
        defense,
        scheme,
        situation,
        60, // 60 fast snaps per cell for interactive matrix
        1000 + conceptIds.indexOf(conceptId) * 100,
        false,
        concept.recommendedMotion,
        front,
        0.55,
        'WLB',
        dropback
      );

      let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
      if (summary.meanEpa >= 0.25 && summary.goalSuccessRate >= 55) grade = 'A+';
      else if (summary.meanEpa >= 0.12 && summary.goalSuccessRate >= 48) grade = 'A';
      else if (summary.meanEpa >= 0.00 && summary.goalSuccessRate >= 42) grade = 'B';
      else if (summary.meanEpa >= -0.15) grade = 'C';
      else if (summary.meanEpa >= -0.30) grade = 'D';
      else grade = 'F';

      results.push({
        conceptId,
        conceptName: concept.name,
        scheme,
        meanEpa: summary.meanEpa,
        medianEpa: summary.medianEpa,
        goalRate: summary.goalSuccessRate,
        epaSuccessRate: summary.epaSuccessRate,
        compRate: summary.completionRate,
        sackRate: summary.sackRate,
        pressureRate: summary.pressureRate,
        grade,
      });
    }
  }

  return results;
}
