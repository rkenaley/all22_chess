// ============================================================================
// src/engine.ts
// 20 Hz Time-Explicit 2D Anisotropic Kinematics, Trench Mechanics,
// Madden Defensive Library, Pre-Snap Motion & Tells, Contested Catch,
// Downfield Laterals, Situational EPA, and Evolutionary Play Mutator
// ============================================================================

export type BodyArchetype = 'HEAVY_TRENCH' | 'POWER_HYBRID' | 'BALANCED_SKILL' | 'LEAN_SPEED';
export type OffensiveRole = 'QB' | 'OL' | 'ROUTE' | 'CHIP_RELEASE' | 'PASS_BLOCK' | 'RUN_BLOCK';

// Granular Defensive System Types (Madden Playbook Library)
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

// Legacy compatibility for simple dropdown
export type DefensiveCall = 'MIXED' | 'COV3' | 'COV1' | 'COV2' | 'BLITZ' | DefScheme;

// Offense Formations, Personnel Groupings, and Pre-Snap Motion
export type OffPersonnelId = '11_PERSONNEL' | '12_PERSONNEL' | '21_PERSONNEL' | 'EMPTY_5W';
export type OffFormationId =
  | 'GUN_TRIPS_RIGHT'
  | 'GUN_DOUBLES'
  | 'GUN_BUNCH_RIGHT'
  | 'SINGLEBACK_ACE'
  | 'EMPTY_QUADS';

export type PreSnapMotionId =
  | 'NONE'
  | 'JET_R_TO_L'
  | 'JET_L_TO_R'
  | 'ORBIT_RETURN'
  | 'RB_FLAP_OUT'
  | 'TE_SIFT';

export type SituationId = '1st_10' | '3rd_3' | '3rd_10';

export interface Vec2 {
  x: number; // Yards from center of field (-26.65 to +26.65)
  y: number; // Yards from Line of Scrimmage (y = 0 is LOS, +y is downfield)
}

// ============================================================================
// GRANULAR PLAYER RATINGS (Physical, Trench, Skill, Coverage & Processing)
// ============================================================================
export interface PlayerRatings {
  // Athletic Foundation
  spd: number; // Straight-line top velocity (40-99)
  acc: number; // Tangential acceleration burst (40-99)
  agi: number; // Centripetal lateral force limit & braking (40-99)
  str: number; // Physical mass / momentum & contact leverage (40-99)

  // Granular Trench & Blocking Traits
  pbk_anchor: number;  // Pass Block Anchor: Resisting bull rush & vertical pocket push
  pbk_lateral: number; // Pass Block Lateral: Mirror footwork vs speed rush & spin/rip
  rbk_power: number;    // Run Block Power: Vertical displacement drive
  rbk_reach: number;    // Run Block Reach: Lateral seal / perimeter hook

  // Granular Pass Rush & Front Defense Traits
  rush_power: number;   // Bull Rush / Vertical Pocket Push (speed-to-power)
  rush_speed: number;   // Speed Rush / Dip & Rip lateral edge bend
  bsh_shed: number;     // Shedding torque / hand technique / disengagement rate

  // Granular Passing & QB Processing
  thp: number;          // Throw Power (max release velocity & deep trajectory zip)
  tha_short: number;    // Throw Accuracy Short (<12 yds)
  tha_deep: number;     // Throw Accuracy Deep (>20 yds)
  tup_pressure: number; // Poise / penalty reduction under pocket pressure
  qb_read_speed: number;// Processing speed (dwell timer per read: 0.20s - 0.45s)
  pre_snap_read: number;// Pre-snap recognition: ability to decipher man/zone tells

  // Granular Receiver & Ballcarrier Traits
  rr_short: number;     // Short route cut sharpness & braking (0-10 yds)
  rr_deep: number;      // Deep stem break & separation (15+ yds)
  catch_traffic: number;// Contested catch / hands in traffic vs incoming hit
  catch_radius: number; // Reach buffer for adjusting to off-target throws
  btk_power: number;    // Break tackle power (trucking/stiff-arm vs wrap-up)
  elusiveness: number;  // Elusiveness / juking / slipping glancing arm tackles
  lateral_vision: number;// Downfield pitch decision IQ & backward lateral accuracy

  // Granular Coverage & Tackling Traits
  press_jam: number;    // Press disruption at the Line of Scrimmage
  cov_man: number;      // Man-to-man mirror, hip swivel & cut reaction
  cov_zone: number;     // Zone landmark discipline, pattern-matching & capping
  catch_contest: number;// Playing the receiver's hands / rake / pass breakup
  tak_wrap: number;     // Form wrap-up tackling efficiency (low miss rate)
  tak_hit_power: number;// Hit power (jarring loose catches, causing fumbles/stuns)

  // Backward compatibility convenience getters
  rr_thp?: number;
  pbk_tha?: number;
  bsh_tak?: number;
  btk_cov?: number;
}

export function makeRatings(base: Partial<PlayerRatings>): PlayerRatings {
  const spd = base.spd ?? 75;
  const acc = base.acc ?? 75;
  const agi = base.agi ?? 75;
  const str = base.str ?? 75;
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
    thp: base.thp ?? (base.rr_thp ?? 75),
    tha_short: base.tha_short ?? (base.pbk_tha ?? 75),
    tha_deep: base.tha_deep ?? (base.pbk_tha ?? 75),
    tup_pressure: base.tup_pressure ?? 75,
    qb_read_speed: base.qb_read_speed ?? 75,
    pre_snap_read: base.pre_snap_read ?? 75,
    rr_short: base.rr_short ?? (base.rr_thp ?? agi),
    rr_deep: base.rr_deep ?? (base.rr_thp ?? spd),
    catch_traffic: base.catch_traffic ?? 75,
    catch_radius: base.catch_radius ?? 75,
    btk_power: base.btk_power ?? (base.btk_cov ?? str),
    elusiveness: base.elusiveness ?? agi,
    lateral_vision: base.lateral_vision ?? 75,
    press_jam: base.press_jam ?? str,
    cov_man: base.cov_man ?? (base.btk_cov ?? agi),
    cov_zone: base.cov_zone ?? (base.btk_cov ?? 80),
    catch_contest: base.catch_contest ?? 75,
    tak_wrap: base.tak_wrap ?? (base.bsh_tak ?? 80),
    tak_hit_power: base.tak_hit_power ?? str,
    rr_thp: base.rr_thp ?? base.thp ?? 75,
    pbk_tha: base.pbk_tha ?? base.tha_short ?? 75,
    bsh_tak: base.bsh_tak ?? base.bsh_shed ?? 75,
    btk_cov: base.btk_cov ?? base.cov_man ?? 75,
  };
}

export interface PlayerConfig {
  id: string;
  label: string;
  name: string; // Real player name (e.g., 'Jalen Hurts', 'A.J. Brown')
  team: 'OFF' | 'DEF';
  archetype: BodyArchetype;
  eligible: boolean;
  startPos: Vec2;
  role: OffensiveRole;
  readOrder: number; // 1..5 for eligible receivers
  waypoints: Vec2[]; // Route nodes in field coordinates
  ratings: PlayerRatings;
}

export interface SituationSpec {
  id: SituationId;
  down: number;
  distance: number;
  yardline: number; // Yards from own goal (e.g. 25 = Own 25, 62 = Opp 38)
  goalYards: number; // Yards required for Situational Goal Success
}

export const SITUATIONS: Record<SituationId, SituationSpec> = {
  '1st_10': { id: '1st_10', down: 1, distance: 10, yardline: 25, goalYards: 4.5 },
  '3rd_3':  { id: '3rd_3',  down: 3, distance: 3,  yardline: 62, goalYards: 3.0 },
  '3rd_10': { id: '3rd_10', down: 3, distance: 10, yardline: 40, goalYards: 10.0 },
};

// ============================================================================
// PRE-SNAP MOTION & RECOGNITION TELL INTERFACES
// ============================================================================
export interface MotionSpec {
  id: PreSnapMotionId;
  playerId: string;
  path: Vec2[];
  duration: number; // Duration in seconds (e.g. 1.2s)
}

export interface PreSnapTell {
  motionReaction: 'MAN_TRAIL' | 'ZONE_BUMP' | 'NONE';
  trailingDefenderName: string | null;
  manConfidence: number;  // 0 - 100%
  zoneConfidence: number; // 0 - 100%
  safetyShell: 'MOFC_1_HIGH' | 'MOFO_2_HIGH' | 'ZERO_HIGH';
  boxCount: number; // Defender count in tackle box
  qbInfoBonus: number; // Processing speed boost (-0.08s dwell time)
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
  heading: number; // Radians
  role: OffensiveRole;
  readOrder: number;
  waypoints: Vec2[];
  wpIndex: number;
  ratings: PlayerRatings;

  // Trench & Block interaction states
  blockType: 'PASS_ANCHOR' | 'PASS_MIRROR' | 'RUN_DRIVE' | 'CHIP_RELEASE';
  engagedWith: number | null; // Opponent index
  leverageAngle: number;      // Accumulated shed angle
  stunTimer: number;          // Recovery stun after shed or missed tackle
  chipTimer: number;          // Chip edge rusher countdown
  cutReactionTimer: number;   // Defender delay after receiver route cut
  lastTargetVelDir: Vec2;     // Used to detect receiver cuts
  lungeLockTimer: number;     // Tackle lunge commitment (0.20s)

  // Defensive scheme attributes
  assignType: 'RUSH' | 'MAN' | 'ZONE_DEEP' | 'ZONE_UNDER' | 'ROBBER' | 'SPY';
  manTargetIdx: number;
  zoneAnchor: Vec2;
  zoneCapY: number; // Deepest-of-the-deep ceiling coordinate
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
  }[];
}

export interface PlaySimResult {
  outcome: 'COMPLETE' | 'INCOMPLETE' | 'SACK' | 'INTERCEPTION' | 'FUMBLE';
  yardsGained: number;
  epa: number;
  goalSuccess: boolean;
  timeToThrow: number;
  targetedPlayerId: string | null;
  targetedReadOrder: number;
  catchPos: Vec2 | null;
  brokenTackles: number;
  lateralsAttempted: number;
  lateralsCompleted: number;
  preSnapTell: PreSnapTell;
  commentary: string;
  snapshots: TickSnapshot[];
}

export interface MonteCarloSummary {
  snaps: number;
  meanEpa: number;
  stdEpa: number;
  varEpa: number;
  cvar10Epa: number;
  goalSuccessRate: number;
  completionRate: number;
  sackRate: number;
  intRate: number;
  fumbleRate: number;
  avgYards: number;
  avgTimeToThrow: number;
  primaryReadShare: number;
  lateralSuccessShare: number;
  epaSamples: number[];
  scatterPoints: { x: number; y: number; outcome: PlaySimResult['outcome']; yards: number }[];
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
// KINEMATIC RATING CURVES (Speed, Tangential Burst & Centripetal Steering)
// ============================================================================
export function getMaxSpeedYdsPerSec(spd: number): number {
  // 50 SPD -> 6.3 yds/s | 85 SPD -> 9.15 yds/s | 99 SPD -> 10.45 yds/s
  const norm = Math.max(0, Math.min(1, (spd - 45) / 54));
  return 6.1 + 4.35 * Math.pow(norm, 1.15);
}

export function getMaxTangentialAccel(acc: number): number {
  const norm = Math.max(0, Math.min(1, (acc - 45) / 54));
  return 5.4 + 5.5 * norm;
}

export function getMaxLateralCentripetalAccel(agi: number, rrBonus = 0): number {
  const effectiveAgi = Math.min(99, agi * 0.82 + rrBonus * 0.18);
  const norm = Math.max(0, Math.min(1, (effectiveAgi - 45) / 54));
  return 5.8 + 13.5 * Math.pow(norm, 1.45);
}

export function getMaxBrakingDecel(agi: number): number {
  const norm = Math.max(0, Math.min(1, (agi - 45) / 54));
  return 6.5 + 10.5 * Math.pow(norm, 1.3);
}

// ============================================================================
// EXPECTED POINTS (EP) & SITUATIONAL EPA MODEL
// ============================================================================
export function computeExpectedPoints(down: number, distance: number, yardline: number): number {
  if (yardline >= 100) return 6.95; // Touchdown
  if (yardline <= 0) return -2.0;   // Safety

  const baseEp = -1.55 + 0.068 * yardline + 0.00012 * Math.max(0, yardline - 50) ** 2;
  const downDiscount =
    down === 1 ? 0.0 :
    down === 2 ? -0.42 :
    down === 3 ? -1.15 : -2.35;
  const distPenalty = -0.085 * (distance - (down === 1 ? 10 : 5));
  return baseEp + downDiscount + distPenalty;
}

export function evaluateSnapEPA(
  sit: SituationSpec,
  outcome: PlaySimResult['outcome'],
  yardsGained: number
): { epa: number; goalSuccess: boolean } {
  const epBefore = computeExpectedPoints(sit.down, sit.distance, sit.yardline);
  const newYardline = Math.max(1, Math.min(100, sit.yardline + yardsGained));

  if (outcome === 'INTERCEPTION' || outcome === 'FUMBLE') {
    const oppYardline = Math.max(1, Math.min(99, 100 - newYardline));
    const oppEp = computeExpectedPoints(1, 10, oppYardline);
    return { epa: -oppEp - epBefore, goalSuccess: false };
  }

  if (newYardline >= 100) {
    return { epa: 6.95 - epBefore, goalSuccess: true };
  }

  const achievedFirstDown = yardsGained >= sit.distance;
  let epAfter = 0;

  if (achievedFirstDown) {
    epAfter = computeExpectedPoints(1, Math.min(10, 100 - newYardline), newYardline);
  } else {
    const nextDown = sit.down + 1;
    const nextDist = sit.distance - yardsGained;
    if (nextDown > 4) {
      const oppEp = computeExpectedPoints(1, 10, 100 - newYardline);
      epAfter = -oppEp;
    } else if (nextDown === 4) {
      const fgProb = newYardline >= 63 ? Math.min(0.92, (newYardline - 52) * 0.025) : 0;
      const puntNet = Math.max(20, Math.min(95, 100 - (newYardline + 38)));
      const puntVal = -computeExpectedPoints(1, 10, puntNet);
      const kickOrPuntEp = fgProb > 0 ? fgProb * 3.0 + (1 - fgProb) * puntVal : puntVal;
      epAfter = Math.max(kickOrPuntEp, computeExpectedPoints(4, nextDist, newYardline));
    } else {
      epAfter = computeExpectedPoints(nextDown, nextDist, newYardline);
    }
  }

  const sackPenalty = outcome === 'SACK' ? -0.28 : 0.0;
  const epa = epAfter - epBefore + sackPenalty;
  const goalSuccess =
    outcome === 'COMPLETE' && (yardsGained >= sit.goalYards || (sit.down === 1 && epa > 0));

  return { epa, goalSuccess };
}

// ============================================================================
// 2D ANISOTROPIC STEERING STEP (20 Hz, dt = 0.05s)
// ============================================================================
function stepAnisotropicAgent(
  agent: AgentRuntime,
  targetPos: Vec2,
  nextWaypointAfterTarget: Vec2 | null,
  dt: number
): void {
  if (agent.stunTimer > 0) {
    agent.stunTimer = Math.max(0, agent.stunTimer - dt);
    agent.vel.x *= 0.72;
    agent.vel.y *= 0.72;
    agent.pos.x += agent.vel.x * dt;
    agent.pos.y += agent.vel.y * dt;
    return;
  }

  const dx = targetPos.x - agent.pos.x;
  const dy = targetPos.y - agent.pos.y;
  const distToTarget = Math.hypot(dx, dy);
  if (distToTarget < 1e-4) return;

  const dirToTargetX = dx / distToTarget;
  const dirToTargetY = dy / distToTarget;

  const speed = Math.hypot(agent.vel.x, agent.vel.y);
  const vMax = getMaxSpeedYdsPerSec(agent.ratings.spd);
  const aTangentialMax = getMaxTangentialAccel(agent.ratings.acc);
  const aLateralMax = getMaxLateralCentripetalAccel(agent.ratings.agi, agent.ratings.rr_short);
  const aBrakeMax = getMaxBrakingDecel(agent.ratings.agi);

  let desiredSpeed = vMax;
  if (nextWaypointAfterTarget && distToTarget < 4.5) {
    const leg2x = nextWaypointAfterTarget.x - targetPos.x;
    const leg2y = nextWaypointAfterTarget.y - targetPos.y;
    const leg2Len = Math.hypot(leg2x, leg2y);
    if (leg2Len > 0.1) {
      const dot = Math.max(-1, Math.min(1, dirToTargetX * (leg2x / leg2Len) + dirToTargetY * (leg2y / leg2Len)));
      const cutAngle = Math.acos(dot);
      if (cutAngle > 0.35) {
        const tightRadius = 1.15 + 1.4 * (1 - agent.ratings.rr_short / 100);
        const safeTurnSpeed = Math.sqrt(aLateralMax * tightRadius) / (1 + 0.55 * (cutAngle / Math.PI));
        const reqBrakeDist = Math.max(0, (speed * speed - safeTurnSpeed * safeTurnSpeed) / (2 * aBrakeMax));
        if (distToTarget <= reqBrakeDist + 0.65) {
          desiredSpeed = Math.max(2.8, safeTurnSpeed);
        }
      }
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
    const hillLimit = aTangentialMax * Math.max(0.05, 1.0 - speed / vMax);
    const turnLoad = Math.min(0.85, Math.abs(aPerp) / aLateralMax);
    aPar = Math.min(aPar, hillLimit * (1.0 - 0.45 * turnLoad * turnLoad));
  } else {
    const remFraction = Math.sqrt(Math.max(0.04, 1.0 - Math.pow(aPerp / aLateralMax, 2)));
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

  agent.pos.x = Math.max(-26.0, Math.min(26.0, agent.pos.x + agent.vel.x * dt));
  agent.pos.y = agent.pos.y + agent.vel.y * dt;

  if (newSpd > 0.3) {
    agent.heading = Math.atan2(agent.vel.y, agent.vel.x);
  }
}

// ============================================================================
// MADDEN DEFENSIVE PLAYBOOK: ALIGNMENT & ASSIGNMENT BUILDER (Jacksonville Jaguars)
// ============================================================================
export function buildDefenseSchemeAgents(
  offConfigs: PlayerConfig[],
  defRoster: PlayerConfig[],
  scheme: DefScheme,
  front: DefFront = 'OVER'
): AgentRuntime[] {
  const eligibles = offConfigs
    .map((p, idx) => ({ p, idx }))
    .filter((item) => item.p.eligible)
    .sort((a, b) => a.p.startPos.x - b.p.startPos.x);

  return defRoster.map((d, dIdx) => {
    let pos = { x: d.startPos.x, y: d.startPos.y };
    let assignType: AgentRuntime['assignType'] = 'RUSH';
    let manTargetIdx = -1;
    let zoneAnchor: Vec2 = { x: pos.x, y: pos.y + 6 };
    let zoneCapY = 22.0;

    // 1. FRONT ALIGNMENTS (DL indices 0..3: LDE, DT1, DT2, RDE)
    if (dIdx < 4) {
      assignType = 'RUSH';
      if (front === 'WIDE_9') {
        if (dIdx === 0) pos = { x: -6.4, y: 0.8 }; // Wide-9 Edge
        if (dIdx === 1) pos = { x: -1.8, y: 0.6 }; // 2i/3-tech
        if (dIdx === 2) pos = { x: 1.8,  y: 0.6 };
        if (dIdx === 3) pos = { x: 6.4,  y: 0.8 };
      } else if (front === 'UNDER') {
        if (dIdx === 0) pos = { x: -4.8, y: 0.7 };
        if (dIdx === 1) pos = { x: -2.2, y: 0.6 }; // 3-tech weak
        if (dIdx === 2) pos = { x: 0.8,  y: 0.6 }; // 1-tech strong
        if (dIdx === 3) pos = { x: 4.2,  y: 0.7 };
      } else if (front === 'MUG_A') {
        if (dIdx === 0) pos = { x: -4.2, y: 0.7 };
        if (dIdx === 1) pos = { x: -2.0, y: 0.6 };
        if (dIdx === 2) pos = { x: 2.0,  y: 0.6 };
        if (dIdx === 3) pos = { x: 4.5,  y: 0.7 };
      }
    } else {
      // 2. COVERAGE & SECONDARY SCHEMES
      // dIdx 4=CB1, 5=CB2, 6=NCB, 7=WLB, 8=MLB, 9=SS, 10=FS
      switch (scheme) {
        case 'COV1_ROBBER': {
          // Cover 1 Man Free + Robber in the hole
          const manSlots = [4, 5, 6, 7]; // 4 tight man defenders
          const slot = manSlots.indexOf(dIdx);
          if (slot !== -1 && eligibles[slot]) {
            assignType = 'MAN';
            manTargetIdx = eligibles[slot].idx;
            const tStart = eligibles[slot].p.startPos;
            pos = { x: tStart.x, y: Math.max(2.5, tStart.y + 4.5) };
          } else if (dIdx === 8) {
            // MLB Robber (hole defender underneath jumping crossers)
            assignType = 'ROBBER';
            pos = { x: 0.0, y: 5.5 };
            zoneAnchor = { x: 0.0, y: 7.5 };
          } else if (dIdx === 9) {
            // SS Blitzes or covers RB
            if (eligibles[4]) {
              assignType = 'MAN';
              manTargetIdx = eligibles[4].idx;
              pos = { x: eligibles[4].p.startPos.x, y: 3.5 };
            } else {
              assignType = 'RUSH';
              pos = { x: 3.2, y: 2.5 };
            }
          } else {
            // FS: Single-High Deep Middle (Capping deepest vertical)
            assignType = 'ZONE_DEEP';
            pos = { x: 0.0, y: 14.5 };
            zoneAnchor = { x: 0.0, y: 18.0 };
            zoneCapY = 28.0;
          }
          break;
        }

        case 'COV2_TAMPA': {
          // Tampa 2: 2-High safeties (SS & FS), deep middle MLB, flat corners
          if (dIdx === 4 || dIdx === 5) {
            assignType = 'ZONE_UNDER'; // Flat corners jam & sink
            pos = { x: dIdx === 4 ? -16.0 : 16.0, y: 3.5 };
            zoneAnchor = { x: dIdx === 4 ? -14.5 : 14.5, y: 6.5 };
          } else if (dIdx === 6 || dIdx === 7) {
            assignType = 'ZONE_UNDER'; // Hook/Curl
            pos = { x: dIdx === 6 ? -5.5 : 5.5, y: 4.5 };
            zoneAnchor = { x: dIdx === 6 ? -6.5 : 6.5, y: 8.5 };
          } else if (dIdx === 8) {
            // Tampa 2 MLB drops deep middle pole
            assignType = 'ZONE_DEEP';
            pos = { x: 0.0, y: 4.8 };
            zoneAnchor = { x: 0.0, y: 15.0 };
            zoneCapY = 22.0;
          } else {
            // Safeties deep halves
            assignType = 'ZONE_DEEP';
            pos = { x: dIdx === 9 ? -10.0 : 10.0, y: 12.5 };
            zoneAnchor = { x: dIdx === 9 ? -11.5 : 11.5, y: 18.0 };
            zoneCapY = 28.0;
          }
          break;
        }

        case 'COV4_QUARTERS': {
          // Match Quarters: 4 deep defenders (CB1, CB2, SS, FS) each responsible for a 1/4 deep
          if (dIdx === 4 || dIdx === 5) {
            assignType = 'ZONE_DEEP';
            pos = { x: dIdx === 4 ? -16.5 : 16.5, y: 7.5 };
            zoneAnchor = { x: dIdx === 4 ? -15.0 : 15.0, y: 18.5 };
            zoneCapY = 30.0;
          } else if (dIdx === 9 || dIdx === 10) {
            assignType = 'ZONE_DEEP';
            pos = { x: dIdx === 9 ? -6.5 : 6.5, y: 11.5 };
            zoneAnchor = { x: dIdx === 9 ? -7.0 : 7.0, y: 18.5 };
            zoneCapY = 30.0;
          } else {
            assignType = 'ZONE_UNDER';
            const underX = [-11.0, 0.0, 11.0];
            const uSlot = (dIdx - 6) % 3;
            pos = { x: underX[uSlot], y: 4.5 };
            zoneAnchor = { x: underX[uSlot], y: 8.0 };
          }
          break;
        }

        case 'ZERO_BLITZ': {
          // Cover 0 Blitz: 6 rushers, 5 tight man defenders, zero deep help
          if (dIdx === 4 || dIdx === 5) {
            assignType = 'RUSH';
            pos = { x: dIdx === 4 ? -5.5 : 5.5, y: 2.0 };
          } else {
            const slot = dIdx - 6; // 6,7,8,9,10
            if (eligibles[slot]) {
              assignType = 'MAN';
              manTargetIdx = eligibles[slot].idx;
              const tStart = eligibles[slot].p.startPos;
              pos = { x: tStart.x, y: Math.max(1.8, tStart.y + 3.0) }; // Press look
            }
          }
          break;
        }

        case 'COV6_SPLIT': {
          // Cover 6 (Quarter-Quarter-Half): Cov 4 to right/passing strength, Cov 2 to weak
          if (dIdx === 4) {
            // Weak corner plays flat
            assignType = 'ZONE_UNDER';
            pos = { x: -16.0, y: 4.0 };
            zoneAnchor = { x: -14.5, y: 6.5 };
          } else if (dIdx === 5) {
            // Strong corner plays deep quarter
            assignType = 'ZONE_DEEP';
            pos = { x: 16.5, y: 7.5 };
            zoneAnchor = { x: 15.0, y: 19.0 };
            zoneCapY = 30.0;
          } else if (dIdx === 9) {
            // Weak safety plays deep half
            assignType = 'ZONE_DEEP';
            pos = { x: -9.5, y: 12.0 };
            zoneAnchor = { x: -11.0, y: 18.5 };
            zoneCapY = 28.0;
          } else if (dIdx === 10) {
            // Strong safety plays deep quarter
            assignType = 'ZONE_DEEP';
            pos = { x: 6.5, y: 11.5 };
            zoneAnchor = { x: 6.5, y: 18.5 };
            zoneCapY = 30.0;
          } else {
            assignType = 'ZONE_UNDER';
            pos = { x: (dIdx === 6 ? -7.0 : dIdx === 7 ? 0 : 7.0), y: 4.5 };
            zoneAnchor = { x: pos.x, y: 8.0 };
          }
          break;
        }

        default: {
          // Default COV3_SKY: 3 Deep (CB1, CB2, FS), 4 Underneath (Curl/Flat & Hook)
          if (dIdx === 4 || dIdx === 5) {
            assignType = 'ZONE_DEEP';
            pos = { x: dIdx === 4 ? -16.5 : 16.5, y: 7.5 };
            zoneAnchor = { x: dIdx === 4 ? -15.0 : 15.0, y: 18.0 };
            zoneCapY = 29.0;
          } else if (dIdx === 10) {
            assignType = 'ZONE_DEEP'; // Single-High FS
            pos = { x: 0.0, y: 13.5 };
            zoneAnchor = { x: 0.0, y: 18.5 };
            zoneCapY = 30.0;
          } else {
            assignType = 'ZONE_UNDER';
            const underX = [-11.5, -4.0, 4.0, 11.5];
            const slot = dIdx - 6;
            pos = { x: underX[slot] || 0, y: 4.5 };
            zoneAnchor = { x: underX[slot] || 0, y: 7.8 };
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
      cutReactionTimer: 0,
      lastTargetVelDir: { x: 0, y: 1 },
      lungeLockTimer: 0,
      assignType,
      manTargetIdx,
      zoneAnchor,
      zoneCapY,
    };
  });
}

// ============================================================================
// PRE-SNAP MOTION & DEFENSIVE REACTION ENGINE (Calculates QB Pre-Snap Read)
// ============================================================================
export function evaluatePreSnapMotion(
  offConfigs: PlayerConfig[],
  defAgents: AgentRuntime[],
  motionId: PreSnapMotionId,
  scheme: DefScheme
): PreSnapTell {
  const isManScheme = scheme === 'COV1_ROBBER' || scheme === 'ZERO_BLITZ';
  const is2High = scheme === 'COV2_TAMPA' || scheme === 'COV4_QUARTERS' || scheme === 'COV6_SPLIT';

  // Calculate defenders in box (within |x| <= 4.8 and y <= 5.5)
  const boxCount = defAgents.filter((d) => Math.abs(d.pos.x) <= 4.8 && d.pos.y <= 5.8).length;

  if (motionId === 'NONE') {
    return {
      motionReaction: 'NONE',
      trailingDefenderName: null,
      manConfidence: isManScheme ? 65 : 35,
      zoneConfidence: isManScheme ? 35 : 65,
      safetyShell: is2High ? 'MOFO_2_HIGH' : scheme === 'ZERO_BLITZ' ? 'ZERO_HIGH' : 'MOFC_1_HIGH',
      boxCount,
      qbInfoBonus: 0,
      summaryText: `Static Formation. Box Count: ${boxCount}. Shell: ${is2High ? '2-High (MOFO)' : '1-High (MOFC)'}.`,
    };
  }

  // Pre-snap motion occurred!
  // Find player in motion (e.g. SLOT or RB)
  const motionTarget = offConfigs.find(
    (p) =>
      p.id === 'SLOT' ||
      (motionId === 'RB_FLAP_OUT' && p.id === 'RB') ||
      (motionId === 'TE_SIFT' && p.id === 'TE')
  ) || offConfigs[7];

  if (isManScheme) {
    // In Man coverage: Defender assigned to motion receiver trails across!
    const trackingDef = defAgents.find((d) => d.assignType === 'MAN' && d.manTargetIdx >= 0) || defAgents[6];
    return {
      motionReaction: 'MAN_TRAIL',
      trailingDefenderName: trackingDef.name,
      manConfidence: 94,
      zoneConfidence: 6,
      safetyShell: is2High ? 'MOFO_2_HIGH' : 'MOFC_1_HIGH',
      boxCount,
      qbInfoBonus: 0.10, // QB recognizes man coverage early, accelerating throw decision
      summaryText: `[MAN TELL] ${trackingDef.name} locked on & trailed ${motionTarget.name} across formation (94% Man Confidence).`,
    };
  } else {
    // In Zone coverage: CB stays home! Apex defender/safety slides leverage
    return {
      motionReaction: 'ZONE_BUMP',
      trailingDefenderName: null,
      manConfidence: 11,
      zoneConfidence: 89,
      safetyShell: is2High ? 'MOFO_2_HIGH' : 'MOFC_1_HIGH',
      boxCount,
      qbInfoBonus: 0.08,
      summaryText: `[ZONE TELL] Corners stayed home; defense bumped apex leverage (89% Zone Confidence).`,
    };
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
  allowLaterals = true,
  motionId: PreSnapMotionId = 'NONE',
  front: DefFront = 'OVER'
): PlaySimResult {
  const dt = 0.05; // 20 Hz
  const maxTicks = 100; // 5.0 seconds

  // Resolve defensive call into concrete Madden Scheme
  let activeScheme: DefScheme = 'COV3_SKY';
  if (defCallInput === 'MIXED') {
    const r = rng.next();
    if (r < 0.35) activeScheme = 'COV3_SKY';
    else if (r < 0.60) activeScheme = 'COV1_ROBBER';
    else if (r < 0.80) activeScheme = 'COV2_TAMPA';
    else if (r < 0.92) activeScheme = 'COV4_QUARTERS';
    else activeScheme = 'ZERO_BLITZ';
  } else if (defCallInput === 'COV3') activeScheme = 'COV3_SKY';
  else if (defCallInput === 'COV1') activeScheme = 'COV1_ROBBER';
  else if (defCallInput === 'COV2') activeScheme = 'COV2_TAMPA';
  else if (defCallInput === 'BLITZ') activeScheme = 'ZERO_BLITZ';
  else activeScheme = defCallInput;

  // Build offensive agents
  const offAgents: AgentRuntime[] = offConfigs.map((c) => ({
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
    waypoints: c.waypoints.map((w) => ({ x: w.x, y: w.y })),
    wpIndex: 0,
    ratings: { ...c.ratings },
    blockType: c.role === 'OL' ? 'PASS_ANCHOR' : 'PASS_MIRROR',
    engagedWith: null,
    leverageAngle: 0,
    stunTimer: 0,
    chipTimer: c.role === 'CHIP_RELEASE' ? 0.45 : 0,
    cutReactionTimer: 0,
    lastTargetVelDir: { x: 0, y: 1 },
    lungeLockTimer: 0,
    assignType: 'RUSH',
    manTargetIdx: -1,
    zoneAnchor: { x: 0, y: 0 },
    zoneCapY: 25.0,
  }));

  const defAgents = buildDefenseSchemeAgents(offConfigs, defConfigs, activeScheme, front);
  const qb = offAgents[0];

  // Evaluate Pre-Snap Motion and QB Information Tell
  const preSnapTell = evaluatePreSnapMotion(offConfigs, defAgents, motionId, activeScheme);

  // If motion occurred, shift the motion man to their final pre-snap spot
  if (motionId === 'JET_R_TO_L') {
    const slot = offAgents.find((p) => p.id === 'SLOT');
    if (slot) {
      slot.pos.x = -slot.pos.x;
      slot.waypoints.forEach((w) => (w.x = -w.x));
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
  let flightTimer = 0;
  let targetedOffIdx: number | null = null;
  let carrierOffIdx: number | null = null;
  let pitcherOffIdx: number | null = null;
  let timeToThrow = 0;
  let brokenTackles = 0;
  let lateralsAttempted = 0;
  let lateralsCompleted = 0;
  let commentary = '';

  const snapshots: TickSnapshot[] = [];

  for (let tick = 0; tick < maxTicks; tick++) {
    const t = tick * dt;

    // ------------------------------------------------------------------------
    // 1. POCKET PRESSURE FIELD & QB MOVEMENT
    // ------------------------------------------------------------------------
    let pocketPressure = 0;
    let pressGradX = 0;
    let pressGradY = 0;

    if (ballState === 'HELD') {
      for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
        const def = defAgents[dIdx];
        if (def.assignType !== 'RUSH' && def.engagedWith === null) continue;
        const dx = qb.pos.x - def.pos.x;
        const dy = qb.pos.y - def.pos.y;
        const distSq = dx * dx + dy * dy;
        const sigmaSq = 2 * 3.1 * 3.1;
        const weight = def.engagedWith === null ? 1.45 : 0.52;
        const contrib = weight * Math.exp(-distSq / sigmaSq);
        pocketPressure += contrib;
        pressGradX += (dx / sigmaSq) * contrib;
        pressGradY += (dy / sigmaSq) * contrib;
      }

      // QB Dropback (first 1.15s to y = -5.8) then climb/slide away from pressure
      const dropTarget: Vec2 =
        t < 1.15
          ? { x: 0, y: -5.8 }
          : {
              x: Math.max(-4.5, Math.min(4.5, qb.pos.x + pressGradX * 2.2)),
              y: Math.max(-7.5, Math.min(-3.0, qb.pos.y + pressGradY * 2.2 + 0.3)),
            };
      stepAnisotropicAgent(qb, dropTarget, null, dt);
      ballPos = { x: qb.pos.x, y: qb.pos.y };
    }

    // ------------------------------------------------------------------------
    // 2. GRANULAR TRENCH MECHANICS (Anchor vs Lateral Mirror vs Vertical Push)
    // ------------------------------------------------------------------------
    for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
      const off = offAgents[oIdx];
      const isActiveBlocker =
        off.role === 'OL' ||
        off.role === 'PASS_BLOCK' ||
        (off.role === 'CHIP_RELEASE' && off.chipTimer > 0);

      if (!isActiveBlocker) continue;

      if (off.role === 'CHIP_RELEASE') {
        off.chipTimer = Math.max(0, off.chipTimer - dt);
        if (off.chipTimer <= 0 && off.engagedWith !== null) {
          defAgents[off.engagedWith].engagedWith = null;
          off.engagedWith = null;
          continue;
        }
      }

      if (off.engagedWith === null && off.stunTimer <= 0) {
        let bestDefIdx = -1;
        let bestDist = off.role === 'CHIP_RELEASE' ? 3.2 : 2.4;
        for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
          const def = defAgents[dIdx];
          if (def.assignType !== 'RUSH') continue;
          const d = Math.hypot(def.pos.x - off.pos.x, def.pos.y - off.pos.y);
          if (d < bestDist && (def.engagedWith === null || off.role === 'CHIP_RELEASE')) {
            bestDist = d;
            bestDefIdx = dIdx;
          }
        }

        if (bestDefIdx !== -1) {
          const rusher = defAgents[bestDefIdx];
          if (off.role === 'CHIP_RELEASE') {
            rusher.vel.x *= 0.35;
            rusher.vel.y *= 0.35;
            rusher.stunTimer = Math.max(rusher.stunTimer, 0.18);
          } else {
            off.engagedWith = bestDefIdx;
            rusher.engagedWith = oIdx;
            rusher.leverageAngle = 0;
          }
        } else {
          // Blocker pass-set arc
          const arcDepth = -1.8 - 0.12 * Math.abs(off.pos.x);
          stepAnisotropicAgent(off, { x: off.pos.x * 0.96, y: arcDepth }, null, dt);
        }
      }
    }

    // Step engaged DL/OL contacts
    for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
      const def = defAgents[dIdx];
      if (def.assignType !== 'RUSH') continue;

      if (def.engagedWith !== null) {
        const blk = offAgents[def.engagedWith];
        const toQbX = qb.pos.x - def.pos.x;
        const toQbY = qb.pos.y - def.pos.y;
        const toQbLen = Math.max(0.1, Math.hypot(toQbX, toQbY));
        const nx = toQbX / toQbLen;
        const ny = toQbY / toQbLen;

        // Granular Contest: Rusher Power & Speed vs Blocker Anchor & Lateral
        const rusherPowerDrive = 0.60 * def.ratings.rush_power + 0.40 * def.ratings.str;
        const blockerAnchor = 0.60 * blk.ratings.pbk_anchor + 0.40 * blk.ratings.str;
        const pushSpeed = Math.max(
          -0.20,
          Math.min(1.85, 0.38 + 0.038 * (rusherPowerDrive - blockerAnchor))
        );

        def.vel.x = nx * pushSpeed;
        def.vel.y = ny * pushSpeed;
        def.pos.x += def.vel.x * dt;
        def.pos.y += def.vel.y * dt;

        blk.pos.x = def.pos.x + nx * 0.75;
        blk.pos.y = def.pos.y + ny * 0.75;

        // Move disengagement / Shed rate
        const shedSkillDiff = (def.ratings.bsh_shed - blk.ratings.pbk_lateral) / 100;
        const shedDrift = (0.35 + 0.35 * shedSkillDiff) * dt;
        const shedNoise = 0.20 * Math.sqrt(dt) * rng.gaussian();
        def.leverageAngle += shedDrift + Math.abs(shedNoise);

        if (def.leverageAngle >= 1.0) {
          // Block Shed! Swim / rip move
          blk.engagedWith = null;
          blk.stunTimer = 0.36;
          def.engagedWith = null;
          def.leverageAngle = 0;
          def.pos.x += nx * 0.50;
          def.pos.y += ny * 0.50;
        }
      } else {
        // Free rusher pursuits QB or ballcarrier
        const pursuitTarget =
          (ballState === 'CAUGHT' || ballState === 'LATERAL_FLIGHT') && carrierOffIdx !== null
            ? offAgents[carrierOffIdx].pos
            : qb.pos;
        stepAnisotropicAgent(def, pursuitTarget, null, dt);

        if (ballState === 'HELD') {
          const distToQb = Math.hypot(def.pos.x - qb.pos.x, def.pos.y - qb.pos.y);
          if (distToQb <= 1.25) {
            const escapeProb =
              1 / (1 + Math.exp(-0.06 * (qb.ratings.btk_power + qb.ratings.str * 0.4 - def.ratings.bsh_shed * 1.15 - 12)));
            if (rng.next() > escapeProb) {
              ballState = 'DEAD';
              timeToThrow = t;
              const yardsLost = Math.round(qb.pos.y * 10) / 10;
              const evalRes = evaluateSnapEPA(situation, 'SACK', yardsLost);
              commentary = `[SACK at t=${t.toFixed(2)}s] ${def.name} (${def.label}) collapsed pocket on ${qb.name} at ${yardsLost.toFixed(1)} yds (${evalRes.epa.toFixed(2)} EPA).`;
              if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, currentReadSlot + 1, pocketPressure, ballState, ballPos, ballTargetPos, null, null, offAgents, defAgents));
              return {
                outcome: 'SACK',
                yardsGained: yardsLost,
                epa: evalRes.epa,
                goalSuccess: false,
                timeToThrow,
                targetedPlayerId: null,
                targetedReadOrder: currentReadSlot + 1,
                catchPos: { ...qb.pos },
                brokenTackles: 0,
                lateralsAttempted: 0,
                lateralsCompleted: 0,
                preSnapTell,
                commentary,
                snapshots,
              };
            } else {
              def.stunTimer = 0.35;
            }
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // 3. OFFENSIVE ROUTE RUNNERS (Cuts & Waypoint Progression)
    // ------------------------------------------------------------------------
    for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
      const off = offAgents[oIdx];
      if (off.role === 'OL' || off.role === 'PASS_BLOCK') continue;
      if (off.role === 'CHIP_RELEASE' && off.chipTimer > 0) continue;

      if (ballState === 'CAUGHT' && carrierOffIdx === oIdx) {
        // Ballcarrier YAC steering
        let avoidX = 0;
        for (const def of defAgents) {
          const dx = off.pos.x - def.pos.x;
          const dy = off.pos.y - def.pos.y;
          const d = Math.hypot(dx, dy);
          if (d < 5.5 && dy > -1.5) {
            avoidX += (dx / (d * d + 0.4)) * 3.5;
          }
        }
        const yacTarget: Vec2 = {
          x: Math.max(-24.5, Math.min(24.5, off.pos.x + avoidX)),
          y: off.pos.y + 12.0,
        };
        stepAnisotropicAgent(off, yacTarget, null, dt);
      } else if (ballState === 'CAUGHT' && carrierOffIdx !== oIdx && allowLaterals) {
        // Trailing route runners form lateral pitch relations
        const carrier = offAgents[carrierOffIdx!];
        const pitchTrailTarget: Vec2 = {
          x: carrier.pos.x + (off.pos.x > carrier.pos.x ? 3.5 : -3.5),
          y: carrier.pos.y - 1.8, // Stay strictly backward
        };
        stepAnisotropicAgent(off, pitchTrailTarget, null, dt);
      } else if (ballState === 'IN_FLIGHT' && targetedOffIdx === oIdx) {
        stepAnisotropicAgent(off, ballTargetPos, null, dt);
      } else if (off.waypoints.length > 0) {
        const wp = off.waypoints[off.wpIndex];
        const distToWp = Math.hypot(wp.x - off.pos.x, wp.y - off.pos.y);

        if (distToWp < 0.85 && off.wpIndex + 1 < off.waypoints.length) {
          off.wpIndex++;
        }
        const activeWp = off.waypoints[off.wpIndex];
        const lookaheadWp =
          off.wpIndex + 1 < off.waypoints.length ? off.waypoints[off.wpIndex + 1] : null;
        stepAnisotropicAgent(off, activeWp, lookaheadWp, dt);
      }
    }

    // ------------------------------------------------------------------------
    // 4. DEFENSIVE SECONDARY (Deep Safety Capping & Granular Man/Zone)
    // ------------------------------------------------------------------------
    for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
      const def = defAgents[dIdx];
      if (def.assignType === 'RUSH') continue;

      if ((ballState === 'CAUGHT' || ballState === 'LATERAL_FLIGHT') && carrierOffIdx !== null) {
        // Rally to ballcarrier
        const carrier = offAgents[carrierOffIdx];
        if (def.lungeLockTimer > 0) {
          def.lungeLockTimer = Math.max(0, def.lungeLockTimer - dt);
          def.pos.x += def.vel.x * dt;
          def.pos.y += def.vel.y * dt;
        } else {
          const leadT = Math.min(0.45, Math.hypot(carrier.pos.x - def.pos.x, carrier.pos.y - def.pos.y) / 9.5);
          const pursuitPt: Vec2 = {
            x: carrier.pos.x + carrier.vel.x * leadT,
            y: carrier.pos.y + carrier.vel.y * leadT,
          };
          stepAnisotropicAgent(def, pursuitPt, null, dt);
        }
        continue;
      }

      if (ballState === 'IN_FLIGHT') {
        stepAnisotropicAgent(def, ballTargetPos, null, dt);
        continue;
      }

      if (def.assignType === 'MAN' && def.manTargetIdx >= 0) {
        const rec = offAgents[def.manTargetIdx];
        const recSpd = Math.hypot(rec.vel.x, rec.vel.y);
        const curDir =
          recSpd > 0.5 ? { x: rec.vel.x / recSpd, y: rec.vel.y / recSpd } : def.lastTargetVelDir;

        const dot = curDir.x * def.lastTargetVelDir.x + curDir.y * def.lastTargetVelDir.y;
        if (dot < 0.78 && def.cutReactionTimer <= 0 && t > 0.45) {
          const skillDiff = (rec.ratings.rr_short - def.ratings.cov_man) / 100;
          def.cutReactionTimer = Math.max(0.04, 0.18 + 0.20 * skillDiff + 0.04 * rng.gaussian());
        }
        def.lastTargetVelDir = curDir;

        if (def.cutReactionTimer > 0) {
          def.cutReactionTimer = Math.max(0, def.cutReactionTimer - dt);
          const driftTarget: Vec2 = {
            x: def.pos.x + def.vel.x * 0.35,
            y: def.pos.y + def.vel.y * 0.35,
          };
          stepAnisotropicAgent(def, driftTarget, null, dt);
        } else {
          // Maintain top-shoulder leverage so corner isn't easily stacked
          const leverageOffset = rec.pos.x > 0 ? -0.35 : 0.35;
          const manAim: Vec2 = {
            x: rec.pos.x + rec.vel.x * 0.18 + leverageOffset,
            y: Math.max(rec.pos.y + 0.85, rec.pos.y + rec.vel.y * 0.20),
          };
          stepAnisotropicAgent(def, manAim, null, dt);
        }
      } else {
        // ZONE_DEEP or ZONE_UNDER with Deepest-of-the-Deep CAPPING RULE
        let matchTarget: Vec2 = { ...def.zoneAnchor };

        if (def.assignType === 'ZONE_DEEP') {
          // Find deepest route runner threatening this deep sector
          let deepestY = def.zoneAnchor.y;
          let sectorReceiver: AgentRuntime | null = null;

          for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
            const rec = offAgents[oIdx];
            if (rec.role === 'OL' || rec.role === 'PASS_BLOCK') continue;
            // Check if receiver is in this safety's half/third
            const inSector = Math.abs(rec.pos.x - def.zoneAnchor.x) < 14.0;
            if (inSector && rec.pos.y > deepestY - 4.0) {
              deepestY = Math.max(deepestY, rec.pos.y);
              sectorReceiver = rec;
            }
          }

          // CAPPING RULE: Safety drops at least 2.5 yds deeper than deepest receiver!
          if (sectorReceiver) {
            matchTarget = {
              x: 0.30 * def.zoneAnchor.x + 0.70 * (sectorReceiver.pos.x + sectorReceiver.vel.x * 0.3),
              y: Math.max(def.zoneAnchor.y, sectorReceiver.pos.y + 2.5),
            };
          }
        } else {
          // ZONE_UNDER: Underneath landmark pattern matching
          let bestDist = 7.0;
          for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
            const rec = offAgents[oIdx];
            if (rec.role === 'OL' || rec.role === 'PASS_BLOCK') continue;
            const d = Math.hypot(rec.pos.x - def.zoneAnchor.x, rec.pos.y - def.zoneAnchor.y);
            if (d < bestDist) {
              bestDist = d;
              matchTarget = {
                x: 0.40 * def.zoneAnchor.x + 0.60 * (rec.pos.x + rec.vel.x * 0.22),
                y: 0.40 * def.zoneAnchor.y + 0.60 * (rec.pos.y + rec.vel.y * 0.22) + 0.5,
              };
            }
          }
        }
        stepAnisotropicAgent(def, matchTarget, null, dt);
      }
    }

    // ------------------------------------------------------------------------
    // 5. QUARTERBACK PROGRESSION CLOCK & ANTICIPATORY THROW
    // ------------------------------------------------------------------------
    if (ballState === 'HELD' && t >= 1.10 && readProgressionIndices.length > 0) {
      readDwellTimer += dt;
      const activeRecIdx =
        readProgressionIndices[Math.min(currentReadSlot, readProgressionIndices.length - 1)];
      const rec = offAgents[activeRecIdx];

      const throwDist = Math.hypot(rec.pos.x - qb.pos.x, rec.pos.y - qb.pos.y);
      const isDeepPass = throwDist > 16.0;

      // Realistic deep pass hang time (ball loft arc: passes over 15y take longer in air)
      const baseBallSpeed = 19.5 + 8.0 * ((qb.ratings.thp - 50) / 49);
      const flightTime = isDeepPass
        ? throwDist / 18.0 + 0.32
        : throwDist / baseBallSpeed;

      const leadPos: Vec2 = {
        x: Math.max(-25.2, Math.min(25.2, rec.pos.x + rec.vel.x * flightTime * 0.88)),
        y: rec.pos.y + rec.vel.y * flightTime * 0.88,
      };

      let minDefSep = 99;
      let laneCongestion = 0;

      for (const def of defAgents) {
        if (def.assignType === 'RUSH') continue;
        const defPredX = def.pos.x + def.vel.x * flightTime * 0.82;
        const defPredY = def.pos.y + def.vel.y * flightTime * 0.82;
        const sep = Math.hypot(defPredX - leadPos.x, defPredY - leadPos.y);
        if (sep < minDefSep) minDefSep = sep;

        // Obstruction ray
        const qbToRecX = leadPos.x - qb.pos.x;
        const qbToRecY = leadPos.y - qb.pos.y;
        const segLenSq = qbToRecX * qbToRecX + qbToRecY * qbToRecY;
        const proj =
          segLenSq > 0.1
            ? ((def.pos.x - qb.pos.x) * qbToRecX + (def.pos.y - qb.pos.y) * qbToRecY) / segLenSq
            : 0;
        if (proj > 0.25 && proj < 0.90) {
          const lineX = qb.pos.x + proj * qbToRecX;
          const lineY = qb.pos.y + proj * qbToRecY;
          if (Math.hypot(def.pos.x - lineX, def.pos.y - lineY) < 1.60) {
            laneCongestion += 1.0;
          }
        }
      }

      const isFinalCheckdown = currentReadSlot >= readProgressionIndices.length - 1;
      const reqSep = isFinalCheckdown
        ? 1.15
        : Math.max(1.40, 2.10 - 0.18 * currentReadSlot - 0.20 * pocketPressure);

      const forcePanicThrow = pocketPressure > 1.75 && t > 1.90;
      const dwellThreshold = Math.max(0.24, 0.38 - preSnapTell.qbInfoBonus);

      if ((minDefSep >= reqSep && laneCongestion === 0) || forcePanicThrow || (isFinalCheckdown && t > 2.80)) {
        // Scatter scaled by accuracy trait (Short vs Deep) and pocket pressure
        const accRating = isDeepPass ? qb.ratings.tha_deep : qb.ratings.tha_short;
        const accNorm = (accRating - 50) / 49;
        const pressurePenalty = Math.max(0, pocketPressure * (1.1 - qb.ratings.tup_pressure / 100));
        const scatterSigma = 0.30 + 0.85 * (1 - accNorm) + 0.45 * pressurePenalty;

        ballTargetPos = {
          x: Math.max(-25.8, Math.min(25.8, leadPos.x + rng.gaussian() * scatterSigma)),
          y: leadPos.y + rng.gaussian() * scatterSigma,
        };

        flightTimer = Math.max(0.18, flightTime);
        ballVel = {
          x: (ballTargetPos.x - qb.pos.x) / flightTimer,
          y: (ballTargetPos.y - qb.pos.y) / flightTimer,
        };
        ballState = 'IN_FLIGHT';
        targetedOffIdx = activeRecIdx;
        timeToThrow = t;
      } else if (readDwellTimer >= dwellThreshold && currentReadSlot < readProgressionIndices.length - 1) {
        currentReadSlot++;
        readDwellTimer = 0;
      }
    }

    // ------------------------------------------------------------------------
    // 6. BALL FLIGHT & GRANULAR CONTESTED CATCH RESOLUTION
    // ------------------------------------------------------------------------
    if (ballState === 'IN_FLIGHT' && targetedOffIdx !== null) {
      ballPos.x += ballVel.x * dt;
      ballPos.y += ballVel.y * dt;
      flightTimer -= dt;

      if (flightTimer <= 0) {
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

        // Interception check
        if (minDefDist < 1.35 && minDefDist < recDistToBall - 0.15) {
          const intProb = 0.22 + 0.40 * (closestDef.ratings.catch_contest / 100);
          if (rng.next() < intProb) {
            ballState = 'DEAD';
            const intYards = Math.round(ballTargetPos.y * 10) / 10;
            const evalRes = evaluateSnapEPA(situation, 'INTERCEPTION', intYards);
            commentary = `[INTERCEPTION at t=${t.toFixed(2)}s] Pass to ${rec.name} (Read #${rec.readOrder}) picked off by ${closestDef.name} (${closestDef.label}) at +${intYards.toFixed(1)} yds (${evalRes.epa.toFixed(2)} EPA).`;
            if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, rec.readOrder, pocketPressure, ballState, ballPos, ballTargetPos, null, null, offAgents, defAgents));
            return {
              outcome: 'INTERCEPTION',
              yardsGained: intYards,
              epa: evalRes.epa,
              goalSuccess: false,
              timeToThrow,
              targetedPlayerId: rec.id,
              targetedReadOrder: rec.readOrder,
              catchPos: { ...ballTargetPos },
              brokenTackles: 0,
              lateralsAttempted: 0,
              lateralsCompleted: 0,
              preSnapTell,
              commentary,
              snapshots,
            };
          }
        }

        // Catch vs Contested PBU / Jarring Hit Check
        const catchRadiusBonus = (rec.ratings.catch_radius - 70) * 0.025;
        const withinRadius = recDistToBall <= (1.95 + catchRadiusBonus);

        if (withinRadius) {
          // If defender is within contact range (1.6y), evaluate contested collision
          let catchProbability = 0.88;
          if (minDefDist < 1.65) {
            const receiverContest = 0.65 * rec.ratings.catch_traffic + 0.35 * rec.ratings.str;
            const defenderDisrupt = 0.60 * closestDef.ratings.catch_contest + 0.40 * closestDef.ratings.tak_hit_power;
            const contestMargin = receiverContest - defenderDisrupt;
            catchProbability = 1 / (1 + Math.exp(-0.065 * contestMargin));
          }

          if (rng.next() <= catchProbability) {
            ballState = 'CAUGHT';
            carrierOffIdx = targetedOffIdx;
            rec.pos.x = ballTargetPos.x;
            rec.pos.y = ballTargetPos.y;
          } else {
            // Pass broken up / Jarred loose by hit
            ballState = 'DEAD';
            const evalRes = evaluateSnapEPA(situation, 'INCOMPLETE', 0);
            commentary = `[INCOMPLETE at t=${t.toFixed(2)}s] ${closestDef.name} jarred ball loose from ${rec.name} (Read #${rec.readOrder}) (${evalRes.epa.toFixed(2)} EPA).`;
            if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, rec.readOrder, pocketPressure, ballState, ballPos, ballTargetPos, null, null, offAgents, defAgents));
            return {
              outcome: 'INCOMPLETE',
              yardsGained: 0,
              epa: evalRes.epa,
              goalSuccess: false,
              timeToThrow,
              targetedPlayerId: rec.id,
              targetedReadOrder: rec.readOrder,
              catchPos: { ...ballTargetPos },
              brokenTackles: 0,
              lateralsAttempted: 0,
              lateralsCompleted: 0,
              preSnapTell,
              commentary,
              snapshots,
            };
          }
        } else {
          // Overthrown / Underthrown out of catch radius
          ballState = 'DEAD';
          const evalRes = evaluateSnapEPA(situation, 'INCOMPLETE', 0);
          commentary = `[INCOMPLETE at t=${t.toFixed(2)}s] Pass to ${rec.name} sailed out of catch radius (${evalRes.epa.toFixed(2)} EPA).`;
          if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, rec.readOrder, pocketPressure, ballState, ballPos, ballTargetPos, null, null, offAgents, defAgents));
          return {
            outcome: 'INCOMPLETE',
            yardsGained: 0,
            epa: evalRes.epa,
            goalSuccess: false,
            timeToThrow,
            targetedPlayerId: rec.id,
            targetedReadOrder: rec.readOrder,
            catchPos: { ...ballTargetPos },
            brokenTackles: 0,
            lateralsAttempted: 0,
            lateralsCompleted: 0,
            preSnapTell,
            commentary,
            snapshots,
          };
        }
      }
    }

    // ------------------------------------------------------------------------
    // 7. DOWNFIELD LATERALS (Hook-and-Ladder / Backyard Pitch Physics)
    // ------------------------------------------------------------------------
    if (ballState === 'LATERAL_FLIGHT' && pitcherOffIdx !== null && carrierOffIdx !== null) {
      ballPos.x += ballVel.x * dt;
      ballPos.y += ballVel.y * dt;
      flightTimer -= dt;

      if (flightTimer <= 0) {
        const trailer = offAgents[carrierOffIdx];
        const d = Math.hypot(trailer.pos.x - ballTargetPos.x, trailer.pos.y - ballTargetPos.y);

        if (d < 1.65) {
          // Lateral successfully caught!
          ballState = 'CAUGHT';
          lateralsCompleted++;
          trailer.pos.x = ballTargetPos.x;
          trailer.pos.y = ballTargetPos.y;
        } else {
          // Errant pitch / live fumble!
          ballState = 'DEAD';
          const evalRes = evaluateSnapEPA(situation, 'FUMBLE', Math.round(trailer.pos.y * 10) / 10);
          commentary = `[FUMBLE on Lateral at t=${t.toFixed(2)}s] Backward pitch to ${trailer.name} hit the turf! (${evalRes.epa.toFixed(2)} EPA).`;
          if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, 0, pocketPressure, ballState, ballPos, ballTargetPos, null, null, offAgents, defAgents));
          return {
            outcome: 'FUMBLE',
            yardsGained: Math.round(trailer.pos.y * 10) / 10,
            epa: evalRes.epa,
            goalSuccess: false,
            timeToThrow,
            targetedPlayerId: trailer.id,
            targetedReadOrder: trailer.readOrder,
            catchPos: { ...trailer.pos },
            brokenTackles,
            lateralsAttempted,
            lateralsCompleted,
            preSnapTell,
            commentary,
            snapshots,
          };
        }
      }
    }

    // ------------------------------------------------------------------------
    // 8. OPEN-FIELD TACKLING, TACKLE BREAKING & LATERAL DECISION
    // ------------------------------------------------------------------------
    if (ballState === 'CAUGHT' && carrierOffIdx !== null) {
      const carrier = offAgents[carrierOffIdx];
      ballPos = { x: carrier.pos.x, y: carrier.pos.y };

      // Touchdown or Out of Bounds
      if (situation.yardline + carrier.pos.y >= 100 || Math.abs(carrier.pos.x) >= 25.9) {
        ballState = 'DEAD';
        const gain = Math.round(carrier.pos.y * 10) / 10;
        const evalRes = evaluateSnapEPA(situation, 'COMPLETE', gain);
        commentary = `[COMPLETE +${gain.toFixed(1)} yds] ${carrier.name} scored/finished run (${brokenTackles} broken tackles | ${evalRes.epa >= 0 ? '+' : ''}${evalRes.epa.toFixed(2)} EPA).`;
        if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, carrier.readOrder, pocketPressure, ballState, ballPos, ballTargetPos, carrierOffIdx, null, offAgents, defAgents));
        return {
          outcome: 'COMPLETE',
          yardsGained: gain,
          epa: evalRes.epa,
          goalSuccess: evalRes.goalSuccess,
          timeToThrow,
          targetedPlayerId: carrier.id,
          targetedReadOrder: carrier.readOrder,
          catchPos: { ...carrier.pos },
          brokenTackles,
          lateralsAttempted,
          lateralsCompleted,
          preSnapTell,
          commentary,
          snapshots,
        };
      }

      // Check for incoming defenders & possible downfield lateral
      for (const def of defAgents) {
        if (def.stunTimer > 0) continue;
        const dx = carrier.pos.x - def.pos.x;
        const dy = carrier.pos.y - def.pos.y;
        const dist = Math.hypot(dx, dy);

        // Imminent tackle envelope: evaluate downfield lateral pitch option
        if (dist < 1.45 && allowLaterals && lateralsAttempted === 0 && carrier.ratings.lateral_vision > 70) {
          // Scan for valid trailing teammate: strictly backward or flat (dy_pitch <= -0.5)
          let bestTrailerIdx = -1;
          let bestTrailerDist = 99;

          for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
            if (oIdx === carrierOffIdx) continue;
            const tr = offAgents[oIdx];
            if (tr.role === 'OL' || tr.role === 'PASS_BLOCK') continue;
            const pitchDy = tr.pos.y - carrier.pos.y;
            const pitchDist = Math.hypot(tr.pos.x - carrier.pos.x, pitchDy);

            if (pitchDy <= -0.5 && pitchDist >= 2.2 && pitchDist <= 8.5) {
              if (pitchDist < bestTrailerDist) {
                bestTrailerDist = pitchDist;
                bestTrailerIdx = oIdx;
              }
            }
          }

          if (bestTrailerIdx !== -1 && rng.next() < 0.65) {
            // EXECUTE DOWNFIELD LATERAL!
            const trailer = offAgents[bestTrailerIdx];
            pitcherOffIdx = carrierOffIdx;
            carrierOffIdx = bestTrailerIdx;
            lateralsAttempted++;

            const pitchSpeed = 16.0;
            const pFlightTime = bestTrailerDist / pitchSpeed;
            ballTargetPos = {
              x: trailer.pos.x + trailer.vel.x * pFlightTime * 0.75,
              y: trailer.pos.y + trailer.vel.y * pFlightTime * 0.75,
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

        if (dist <= 1.15) {
          // Granular Tackle Interaction
          const defSpd = Math.max(0.5, Math.hypot(def.vel.x, def.vel.y));
          const cosPsi = Math.max(-1, Math.min(1, (def.vel.x * dx + def.vel.y * dy) / (defSpd * dist)));
          const sinPsi = Math.sqrt(Math.max(0, 1 - cosPsi * cosPsi));
          const impactB = dist * sinPsi; // 0 = square wrap hit, 1.0 = glancing arm reach

          // Form wrap-up tackling vs broken tackle power & elusiveness
          const runnerEscape =
            0.50 * carrier.ratings.btk_power +
            0.30 * carrier.ratings.elusiveness +
            0.20 * carrier.ratings.str;
          const tacklerWrap =
            (0.65 * def.ratings.tak_wrap + 0.35 * def.ratings.str) *
            Math.max(0.40, 1.0 - 0.50 * impactB);

          // Calibrated to realistic NFL standard: solo wrap tackles succeed ~85% of time
          const breakProb = 1 / (1 + Math.exp(-0.065 * (runnerEscape - tacklerWrap - 15)));

          if (rng.next() < breakProb) {
            brokenTackles++;
            def.stunTimer = 0.45;
            carrier.vel.x *= 0.72;
            carrier.vel.y *= 0.72;
          } else {
            // Tackled down in bounds!
            ballState = 'DEAD';
            const forwardProgress = Math.round((carrier.pos.y + 0.25) * 10) / 10;
            const evalRes = evaluateSnapEPA(situation, 'COMPLETE', forwardProgress);
            commentary = `[COMPLETE +${forwardProgress.toFixed(1)} yds] ${carrier.name} tackled by ${def.name} (${def.label}) (${brokenTackles} broken tackles | ${evalRes.epa >= 0 ? '+' : ''}${evalRes.epa.toFixed(2)} EPA).`;
            if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, carrier.readOrder, pocketPressure, ballState, ballPos, ballTargetPos, carrierOffIdx, null, offAgents, defAgents));
            return {
              outcome: 'COMPLETE',
              yardsGained: forwardProgress,
              epa: evalRes.epa,
              goalSuccess: evalRes.goalSuccess,
              timeToThrow,
              targetedPlayerId: carrier.id,
              targetedReadOrder: carrier.readOrder,
              catchPos: { ...carrier.pos },
              brokenTackles,
              lateralsAttempted,
              lateralsCompleted,
              preSnapTell,
              commentary,
              snapshots,
            };
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
          defAgents
        )
      );
    }
  }

  // Play whistle
  const finalYards =
    ballState === 'CAUGHT' && carrierOffIdx !== null
      ? Math.round(offAgents[carrierOffIdx].pos.y * 10) / 10
      : 0;
  const finalOutcome = ballState === 'CAUGHT' ? 'COMPLETE' : 'INCOMPLETE';
  const evalRes = evaluateSnapEPA(situation, finalOutcome, finalYards);

  return {
    outcome: finalOutcome,
    yardsGained: finalYards,
    epa: evalRes.epa,
    goalSuccess: evalRes.goalSuccess,
    timeToThrow: timeToThrow || 4.9,
    targetedPlayerId: targetedOffIdx !== null ? offAgents[targetedOffIdx].id : null,
    targetedReadOrder: currentReadSlot + 1,
    catchPos: null,
    brokenTackles,
    lateralsAttempted,
    lateralsCompleted,
    preSnapTell,
    commentary: `[PLAY WHISTLE] Outcome: ${finalOutcome} (${finalYards.toFixed(1)} yds, ${evalRes.epa.toFixed(2)} EPA).`,
    snapshots,
  };
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
  defAgents: AgentRuntime[]
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
  allowLaterals = true,
  motionId: PreSnapMotionId = 'NONE',
  front: DefFront = 'OVER'
): MonteCarloSummary {
  const rng = new PRNG(baseSeed);
  const epaSamples: number[] = [];
  const scatterPoints: MonteCarloSummary['scatterPoints'] = [];

  let goals = 0;
  let comps = 0;
  let sacks = 0;
  let ints = 0;
  let fumbles = 0;
  let totalYards = 0;
  let totalTtt = 0;
  let primaryTargets = 0;
  let passAttempts = 0;
  let totalLaterals = 0;
  let completedLaterals = 0;

  for (let i = 0; i < snaps; i++) {
    const res = simulateSingleSnap(offConfigs, defConfigs, defCall, situation, rng, false, allowLaterals, motionId, front);
    epaSamples.push(res.epa);
    if (res.goalSuccess) goals++;
    if (res.outcome === 'COMPLETE') comps++;
    if (res.outcome === 'SACK') sacks++;
    if (res.outcome === 'INTERCEPTION') ints++;
    if (res.outcome === 'FUMBLE') fumbles++;
    totalYards += res.yardsGained;
    totalTtt += res.timeToThrow;
    totalLaterals += res.lateralsAttempted;
    completedLaterals += res.lateralsCompleted;

    if (res.outcome !== 'SACK') {
      passAttempts++;
      if (res.targetedReadOrder === 1) primaryTargets++;
    }
    if (res.catchPos && scatterPoints.length < 180) {
      scatterPoints.push({
        x: res.catchPos.x,
        y: res.catchPos.y,
        outcome: res.outcome,
        yards: res.yardsGained,
      });
    }
  }

  const meanEpa = epaSamples.reduce((a, b) => a + b, 0) / snaps;
  const varEpa =
    epaSamples.reduce((acc, v) => acc + (v - meanEpa) * (v - meanEpa), 0) / Math.max(1, snaps - 1);
  const stdEpa = Math.sqrt(varEpa);

  const sortedEpa = [...epaSamples].sort((a, b) => a - b);
  const tailCount = Math.max(1, Math.floor(snaps * 0.1));
  const cvar10Epa = sortedEpa.slice(0, tailCount).reduce((a, b) => a + b, 0) / tailCount;

  return {
    snaps,
    meanEpa,
    stdEpa,
    varEpa,
    cvar10Epa,
    goalSuccessRate: (goals / snaps) * 100,
    completionRate: (comps / Math.max(1, passAttempts)) * 100,
    sackRate: (sacks / snaps) * 100,
    intRate: (ints / snaps) * 100,
    fumbleRate: (fumbles / snaps) * 100,
    avgYards: totalYards / snaps,
    avgTimeToThrow: totalTtt / snaps,
    primaryReadShare: (primaryTargets / Math.max(1, passAttempts)) * 100,
    lateralSuccessShare: totalLaterals > 0 ? (completedLaterals / totalLaterals) * 100 : 0,
    epaSamples,
    scatterPoints,
  };
}

// ============================================================================
// EVOLUTIONARY PLAY MUTATOR (Optimizes Play For Active Roster)
// ============================================================================
export interface MutationGenerationLog {
  generation: number;
  objectiveScore: number;
  meanEpa: number;
  stdEpa: number;
  goalRate: number;
  sackRate: number;
  changeDescription: string;
}

export function mutatePlayForRoster(
  initialOffense: PlayerConfig[],
  defConfigs: PlayerConfig[],
  defCall: DefensiveCall,
  situation: SituationSpec,
  generations = 18,
  rolloutsPerCandidate = 120
): { optimizedOffense: PlayerConfig[]; logs: MutationGenerationLog[]; finalSummary: MonteCarloSummary } {
  const clonePlay = (cfg: PlayerConfig[]): PlayerConfig[] =>
    cfg.map((p) => ({
      ...p,
      startPos: { ...p.startPos },
      waypoints: p.waypoints.map((w) => ({ ...w })),
      ratings: { ...p.ratings },
    }));

  const scoreSummary = (s: MonteCarloSummary): number => {
    return s.meanEpa + 0.85 * (s.goalSuccessRate / 100) - 0.22 * s.stdEpa;
  };

  let bestPlay = clonePlay(initialOffense);
  let bestSummary = runMonteCarloBatch(bestPlay, defConfigs, defCall, situation, rolloutsPerCandidate, 9001);
  let bestScore = scoreSummary(bestSummary);

  const logs: MutationGenerationLog[] = [
    {
      generation: 0,
      objectiveScore: bestScore,
      meanEpa: bestSummary.meanEpa,
      stdEpa: bestSummary.stdEpa,
      goalRate: bestSummary.goalSuccessRate,
      sackRate: bestSummary.sackRate,
      changeDescription: `Baseline Play Design evaluated across ${rolloutsPerCandidate} snaps.`,
    },
  ];

  const rng = new PRNG(777111);

  for (let gen = 1; gen <= generations; gen++) {
    const candidate = clonePlay(bestPlay);
    const eligibles = candidate.filter((p) => p.eligible);
    const targetRec = eligibles[Math.floor(rng.next() * eligibles.length)];
    let desc = '';

    const mutationRoll = rng.next();

    if (mutationRoll < 0.25 && (targetRec.id === 'TE' || targetRec.id === 'RB')) {
      const roles: OffensiveRole[] = ['ROUTE', 'CHIP_RELEASE', 'PASS_BLOCK'];
      const nextRole = roles[Math.floor(rng.next() * roles.length)];
      targetRec.role = nextRole;
      desc = `Switched ${targetRec.name} (${targetRec.label}) protection role to [${nextRole}]`;
    } else if (mutationRoll < 0.68 && targetRec.waypoints.length >= 2) {
      const wp0 = targetRec.waypoints[0];
      const wp1 = targetRec.waypoints[1];
      const deltaStemY = (rng.next() - 0.48) * 3.6;
      const deltaBreakX = (rng.next() - 0.5) * 5.2;
      const deltaBreakY = (rng.next() - 0.48) * 3.5;

      wp0.y = Math.max(1.5, Math.min(18.0, wp0.y + deltaStemY));
      wp1.x = Math.max(-24.5, Math.min(24.5, wp1.x + deltaBreakX));
      wp1.y = Math.max(-2.0, Math.min(28.0, wp1.y + deltaBreakY));
      desc = `Adjusted ${targetRec.name} stem break to (${wp0.x.toFixed(1)}, ${wp0.y.toFixed(1)}y) -> (${wp1.x.toFixed(1)}, ${wp1.y.toFixed(1)}y)`;
    } else if (mutationRoll < 0.85) {
      const sign = Math.sign(targetRec.startPos.x) || 1;
      const deltaSplit = (rng.next() - 0.5) * 3.5;
      const oldX = targetRec.startPos.x;
      targetRec.startPos.x = Math.max(-23.5, Math.min(23.5, oldX + deltaSplit));
      if (Math.abs(targetRec.startPos.x) < 3.5 && targetRec.id !== 'RB') {
        targetRec.startPos.x = sign * 4.0;
      }
      const shift = targetRec.startPos.x - oldX;
      targetRec.waypoints.forEach((w) => {
        w.x = Math.max(-24.5, Math.min(24.5, w.x + shift));
      });
      desc = `Shifted ${targetRec.name} pre-snap split to x=${targetRec.startPos.x.toFixed(1)}y`;
    } else {
      const a = eligibles[Math.floor(rng.next() * eligibles.length)];
      const b = eligibles[Math.floor(rng.next() * eligibles.length)];
      if (a.id !== b.id) {
        const tmp = a.readOrder;
        a.readOrder = b.readOrder;
        b.readOrder = tmp;
        desc = `Swapped QB Read: ${a.name} (Read #${a.readOrder}) <-> ${b.name} (Read #${b.readOrder})`;
      } else {
        continue;
      }
    }

    const candSummary = runMonteCarloBatch(
      candidate,
      defConfigs,
      defCall,
      situation,
      rolloutsPerCandidate,
      9001 + gen * 17
    );
    const candScore = scoreSummary(candSummary);

    if (candScore > bestScore + 0.012) {
      bestPlay = candidate;
      bestSummary = candSummary;
      bestScore = candScore;
      logs.push({
        generation: gen,
        objectiveScore: bestScore,
        meanEpa: bestSummary.meanEpa,
        stdEpa: bestSummary.stdEpa,
        goalRate: bestSummary.goalSuccessRate,
        sackRate: bestSummary.sackRate,
        changeDescription: `ACCEPTED: ${desc}`,
      });
    }
  }

  const finalSummary = runMonteCarloBatch(bestPlay, defConfigs, defCall, situation, 400, 42069);
  return { optimizedOffense: bestPlay, logs, finalSummary };
}
