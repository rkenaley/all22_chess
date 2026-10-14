// ============================================================================
// src/engine.ts
// 20 Hz Time-Explicit 2D Anisotropic Kinematics, Trench Contact Mechanics,
// Coverage State Machines, Situational EPA/Variance, and Evolutionary Mutator
// ============================================================================

export type BodyArchetype = 'HEAVY_TRENCH' | 'POWER_HYBRID' | 'BALANCED_SKILL' | 'LEAN_SPEED';
export type OffensiveRole = 'QB' | 'OL' | 'ROUTE' | 'CHIP_RELEASE' | 'PASS_BLOCK';
export type DefensiveCall = 'COV3' | 'COV1' | 'COV2' | 'BLITZ' | 'MIXED';
export type SituationId = '1st_10' | '3rd_3' | '3rd_10';

export interface Vec2 {
  x: number; // Yards from center of field (-26.65 to +26.65)
  y: number; // Yards from Line of Scrimmage (y = 0 is LOS, +y is downfield)
}

export interface PlayerRatings {
  spd: number; // Straight-line top velocity (40-99)
  acc: number; // Tangential acceleration burst (40-99)
  agi: number; // Centripetal lateral force limit & braking (40-99)
  str: number; // Contact momentum & bull-rush anchor (40-99)
  rr_thp: number; // Route Running (WR/TE/RB) or Throw Power (QB)
  pbk_tha: number; // Pass Block (OL/TE/RB) or Throw Accuracy (QB)
  bsh_tak: number; // Block Shedding (DL/LB) or Open-field Tackling (Def)
  btk_cov: number; // Break Tackle (Off) or Coverage Recognition (Def)
}

export interface PlayerConfig {
  id: string;
  label: string;
  team: 'OFF' | 'DEF';
  archetype: BodyArchetype;
  eligible: boolean;
  startPos: Vec2;
  role: OffensiveRole;
  readOrder: number; // 1..5 for eligible receivers
  waypoints: Vec2[]; // Relative or field coordinates (stored in field coords)
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

// Runtime state of a single player at tick t
export interface AgentRuntime {
  id: string;
  label: string;
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
  // Trench & Route interaction states
  engagedWith: number | null; // Index of opponent in agents array
  leverageAngle: number;      // Accumulated shed angle phi_{ij}(t)
  stunTimer: number;          // Recovery stun after shed or missed tackle
  chipTimer: number;          // Time spent chipping edge rusher before releasing
  cutReactionTimer: number;   // Defender delay after receiver breaks route stem
  lastTargetVelDir: Vec2;     // Used by man defender to detect route cuts
  lungeLockTimer: number;     // Tackle lunge steering lock (0.20s)
  assignType: 'RUSH' | 'MAN' | 'ZONE_DEEP' | 'ZONE_UNDER' | 'SPY';
  manTargetIdx: number;
  zoneAnchor: Vec2;
}

export interface TickSnapshot {
  tick: number;
  time: number;
  qbReadOrder: number;
  pocketPressure: number;
  ballState: 'HELD' | 'IN_FLIGHT' | 'CAUGHT' | 'DEAD';
  ballPos: Vec2;
  ballTargetPos: Vec2;
  carrierIdx: number | null;
  agents: {
    id: string;
    label: string;
    team: 'OFF' | 'DEF';
    archetype: BodyArchetype;
    x: number;
    y: number;
    vx: number;
    vy: number;
    heading: number;
    engaged: boolean;
    shedBurst: boolean;
  }[];
}

export interface PlaySimResult {
  outcome: 'COMPLETE' | 'INCOMPLETE' | 'SACK' | 'INTERCEPTION';
  yardsGained: number;
  epa: number;
  goalSuccess: boolean;
  timeToThrow: number;
  targetedPlayerId: string | null;
  targetedReadOrder: number;
  catchPos: Vec2 | null;
  brokenTackles: number;
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
  avgYards: number;
  avgTimeToThrow: number;
  primaryReadShare: number;
  epaSamples: number[];
  scatterPoints: { x: number; y: number; outcome: PlaySimResult['outcome']; yards: number }[];
}

// ============================================================================
// DETERMINISTIC PRNG (Mulberry32) + Box-Muller Gaussian FOR REPRODUCIBLE SIMS
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
// KINEMATIC RATING CURVES (Decoupled Speed, Acceleration, and Agility)
// ============================================================================
export function getMaxSpeedYdsPerSec(spd: number): number {
  // 50 SPD -> 6.3 yds/s | 85 SPD -> 9.2 yds/s | 99 SPD -> 10.55 yds/s
  const norm = Math.max(0, Math.min(1, (spd - 45) / 54));
  return 6.1 + 4.45 * Math.pow(norm, 1.15);
}

export function getMaxTangentialAccel(acc: number): number {
  // yds/s^2 forward burst
  const norm = Math.max(0, Math.min(1, (acc - 45) / 54));
  return 5.4 + 5.6 * norm;
}

export function getMaxLateralCentripetalAccel(agi: number, rrBonus = 0): number {
  // Controls minimum turning radius R_min = v^2 / a_{perp,max}
  const effectiveAgi = Math.min(99, agi * 0.82 + rrBonus * 0.18);
  const norm = Math.max(0, Math.min(1, (effectiveAgi - 45) / 54));
  return 5.8 + 13.5 * Math.pow(norm, 1.45);
}

export function getMaxBrakingDecel(agi: number): number {
  // Ability to sink hips and decelerate before a sharp break node
  const norm = Math.max(0, Math.min(1, (agi - 45) / 54));
  return 6.5 + 10.5 * Math.pow(norm, 1.3);
}

// ============================================================================
// EMPIRICAL NFL EXPECTED POINTS (EP) & SITUATIONAL EPA MODEL
// ============================================================================
export function computeExpectedPoints(down: number, distance: number, yardline: number): number {
  if (yardline >= 100) return 6.95; // Touchdown
  if (yardline <= 0) return -2.0;   // Safety

  // Base field-position EP curve (-1.45 at Own 1 to +6.2 at Opp 1)
  const baseEp = -1.55 + 0.068 * yardline + 0.00012 * Math.max(0, yardline - 50) ** 2;

  // Down and distance penalties
  const downDiscount =
    down === 1 ? 0.0 :
    down === 2 ? -0.42 :
    down === 3 ? -1.15 :
    -2.35; // 4th down

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

  if (outcome === 'INTERCEPTION') {
    // Opponent takes over going the other way
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
      // Turnover on downs
      const oppEp = computeExpectedPoints(1, 10, 100 - newYardline);
      epAfter = -oppEp;
    } else if (nextDown === 4) {
      // Blend punt/FG expectation vs 4th down value
      const fgProb = newYardline >= 63 ? Math.min(0.92, (newYardline - 52) * 0.025) : 0;
      const puntNet = Math.max(20, Math.min(95, 100 - (newYardline + 38)));
      const puntVal = -computeExpectedPoints(1, 10, puntNet);
      const kickOrPuntEp = fgProb > 0 ? fgProb * 3.0 + (1 - fgProb) * puntVal : puntVal;
      epAfter = Math.max(kickOrPuntEp, computeExpectedPoints(4, nextDist, newYardline));
    } else {
      epAfter = computeExpectedPoints(nextDown, nextDist, newYardline);
    }
  }

  // Extra penalty for sack fumbles / drive kill risk
  const sackDrivePenalty = outcome === 'SACK' ? -0.28 : 0.0;
  const epa = epAfter - epBefore + sackDrivePenalty;
  const goalSuccess =
    outcome === 'COMPLETE' && (yardsGained >= sit.goalYards || (sit.down === 1 && epa > 0));

  return { epa, goalSuccess };
}

// ============================================================================
// ANISOTROPIC NON-HOLONOMIC STEERING STEP (20 Hz, dt = 0.05s)
// ============================================================================
function stepAnisotropicAgent(
  agent: AgentRuntime,
  targetPos: Vec2,
  nextWaypointAfterTarget: Vec2 | null,
  dt: number
): void {
  if (agent.stunTimer > 0) {
    agent.stunTimer = Math.max(0, agent.stunTimer - dt);
    agent.vel.x *= 0.75;
    agent.vel.y *= 0.75;
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
  const aLateralMax = getMaxLateralCentripetalAccel(agent.ratings.agi, agent.ratings.rr_thp);
  const aBrakeMax = getMaxBrakingDecel(agent.ratings.agi);

  // Determine lookahead braking speed if approaching a sharp route cut
  let desiredSpeed = vMax;
  if (nextWaypointAfterTarget && distToTarget < 4.5) {
    const leg2x = nextWaypointAfterTarget.x - targetPos.x;
    const leg2y = nextWaypointAfterTarget.y - targetPos.y;
    const leg2Len = Math.hypot(leg2x, leg2y);
    if (leg2Len > 0.1) {
      const dot = Math.max(-1, Math.min(1, dirToTargetX * (leg2x / leg2Len) + dirToTargetY * (leg2y / leg2Len)));
      const cutAngle = Math.acos(dot); // 0 = straight, pi/2 = 90 deg cut, pi = 180 hitch
      if (cutAngle > 0.35) {
        // Tighter desired turn radius requires lower entry speed v_turn = sqrt(a_perp * R_des)
        const tightRadius = 1.15 + 1.4 * (1 - agent.ratings.rr_thp / 100);
        const safeTurnSpeed = Math.sqrt(aLateralMax * tightRadius) / (1 + 0.55 * (cutAngle / Math.PI));
        // Calculate stopping distance needed to reach safeTurnSpeed at the node
        const reqBrakeDist = Math.max(0, (speed * speed - safeTurnSpeed * safeTurnSpeed) / (2 * aBrakeMax));
        if (distToTarget <= reqBrakeDist + 0.65) {
          desiredSpeed = Math.max(2.8, safeTurnSpeed);
        }
      }
    }
  }

  // Current unit velocity vector u_hat (or direction to target if standing still)
  const ux = speed > 0.25 ? agent.vel.x / speed : dirToTargetX;
  const uy = speed > 0.25 ? agent.vel.y / speed : dirToTargetY;
  // Normal vector n_hat perpendicular to u_hat
  const nx = -uy;
  const ny = ux;

  // Desired velocity vector
  const vDesX = dirToTargetX * desiredSpeed;
  const vDesY = dirToTargetY * desiredSpeed;

  // Required acceleration decomposed into tangential (a_par) and normal/centripetal (a_perp)
  const reqAx = (vDesX - agent.vel.x) / dt;
  const reqAy = (vDesY - agent.vel.y) / dt;

  let aPar = reqAx * ux + reqAy * uy;
  let aPerp = reqAx * nx + reqAy * ny;

  // Clamp normal/centripetal acceleration by Agility limit (produces realistic rounding when fast!)
  if (Math.abs(aPerp) > aLateralMax) {
    aPerp = Math.sign(aPerp) * aLateralMax;
  }

  // Enforce Hill-type sprint limit or traction-ellipse braking limit
  if (aPar >= 0) {
    const hillLimit = aTangentialMax * Math.max(0.05, 1.0 - speed / vMax);
    // Lateral turning consumes part of forward drive
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

  // Clamp to absolute vMax and keep within sidelines (-26.2 to +26.2)
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
// DEFENSIVE DEPLOYMENT & ALIGNMENT GENERATOR FOR SPECIFIC CALLS
// ============================================================================
function buildDefenseAgents(
  offConfigs: PlayerConfig[],
  defRoster: PlayerConfig[],
  call: Exclude<DefensiveCall, 'MIXED'>
): AgentRuntime[] {
  // Identify eligible receivers sorted left-to-right by startPos.x
  const eligibles = offConfigs
    .map((p, idx) => ({ p, idx }))
    .filter((item) => item.p.eligible)
    .sort((a, b) => a.p.startPos.x - b.p.startPos.x);

  return defRoster.map((d, dIdx) => {
    const pos = { x: d.startPos.x, y: d.startPos.y };
    let assignType: AgentRuntime['assignType'] = 'RUSH';
    let manTargetIdx = -1;
    let zoneAnchor: Vec2 = { x: pos.x, y: pos.y + 6 };

    if (dIdx < 4) {
      // 4 Down Linemen (LDE, DT1, DT2, RDE)
      assignType = 'RUSH';
      if (call === 'BLITZ') {
        // Shift line slightly to overload weak side
        pos.x -= 0.7;
      }
    } else if (call === 'COV1') {
      // Cover 1 Man Free: 5 man-coverage defenders + 1 blitzing LB + 1 Deep Free Safety
      const manSlots = [4, 5, 6, 7, 8]; // 5 defenders assigned to 5 eligibles
      const slotPos = manSlots.indexOf(dIdx);
      if (slotPos !== -1 && eligibles[slotPos]) {
        assignType = 'MAN';
        manTargetIdx = eligibles[slotPos].idx;
        const targetStart = eligibles[slotPos].p.startPos;
        pos.x = targetStart.x + (targetStart.x > 0 ? -0.4 : 0.4); // Inside leverage
        pos.y = Math.max(2.2, targetStart.y + (Math.abs(targetStart.x) > 10 ? 4.5 : 5.5));
      } else if (dIdx === 9) {
        // Blitzing LB
        assignType = 'RUSH';
        pos.x = 3.2;
        pos.y = 3.0;
      } else {
        // Free Safety (dIdx === 10)
        assignType = 'ZONE_DEEP';
        pos.x = 0.0;
        pos.y = 14.5;
        zoneAnchor = { x: 0.0, y: 17.5 };
      }
    } else if (call === 'BLITZ') {
      // Nickel Overload Blitz: 6 rushers (4 DL + 2 LBs on left edge), 5 tight man defenders
      if (dIdx === 4 || dIdx === 5) {
        assignType = 'RUSH';
        pos.x = dIdx === 4 ? -6.2 : -4.4;
        pos.y = 1.8;
      } else {
        const manSlot = dIdx - 6; // 6,7,8,9,10 -> 0..4
        if (eligibles[manSlot]) {
          assignType = 'MAN';
          manTargetIdx = eligibles[manSlot].idx;
          const targetStart = eligibles[manSlot].p.startPos;
          pos.x = targetStart.x;
          pos.y = Math.max(2.0, targetStart.y + 4.2);
        }
      }
    } else if (call === 'COV2') {
      // Cover 2 Tampa: Corners jam flats (y=6), MLB drops deep middle (y=16), 2 Safeties deep halves
      if (dIdx === 4 || dIdx === 5) {
        // Outside Flat Corners
        assignType = 'ZONE_UNDER';
        pos.x = dIdx === 4 ? -15.5 : 15.5;
        pos.y = 3.5;
        zoneAnchor = { x: dIdx === 4 ? -14.0 : 14.0, y: 6.5 };
      } else if (dIdx === 6 || dIdx === 7) {
        // Hook/Curl LBs
        assignType = 'ZONE_UNDER';
        pos.x = dIdx === 6 ? -5.0 : 5.0;
        pos.y = 4.5;
        zoneAnchor = { x: dIdx === 6 ? -6.5 : 6.5, y: 8.5 };
      } else if (dIdx === 8) {
        // Tampa 2 MLB Deep Hole
        assignType = 'ZONE_DEEP';
        pos.x = 0.0;
        pos.y = 4.8;
        zoneAnchor = { x: 0.0, y: 15.5 };
      } else {
        // 2 High Safeties
        assignType = 'ZONE_DEEP';
        pos.x = dIdx === 9 ? -9.5 : 9.5;
        pos.y = 12.5;
        zoneAnchor = { x: dIdx === 9 ? -11.5 : 11.5, y: 18.0 };
      }
    } else {
      // Default COV3 Sky: 3 Deep (2 Corners + FS), 4 Underneath (Curl/Flat + Hook)
      if (dIdx === 4 || dIdx === 5) {
        // Deep 1/3 Corners
        assignType = 'ZONE_DEEP';
        pos.x = dIdx === 4 ? -16.0 : 16.0;
        pos.y = 6.5;
        zoneAnchor = { x: dIdx === 4 ? -14.5 : 14.5, y: 16.5 };
      } else if (dIdx === 10) {
        // Center Field Free Safety
        assignType = 'ZONE_DEEP';
        pos.x = 0.0;
        pos.y = 13.5;
        zoneAnchor = { x: 0.0, y: 18.0 };
      } else {
        // 4 Underneath Zone Defenders (dIdx 6, 7, 8, 9)
        assignType = 'ZONE_UNDER';
        const anchorsX = [-12.0, -4.2, 4.2, 12.0];
        const slot = dIdx - 6;
        pos.x = anchorsX[slot] * 0.75;
        pos.y = 4.5;
        zoneAnchor = { x: anchorsX[slot], y: 7.5 };
      }
    }

    return {
      id: d.id,
      label: d.label,
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
    };
  });
}

// ============================================================================
// CORE 20 Hz SINGLE-PLAY TIME-EXPLICIT KINEMATIC SIMULATION
// ============================================================================
export function simulateSingleSnap(
  offConfigs: PlayerConfig[],
  defConfigs: PlayerConfig[],
  defCallInput: DefensiveCall,
  situation: SituationSpec,
  rng: PRNG,
  recordSnapshots: boolean
): PlaySimResult {
  const dt = 0.05; // 20 Hz time-explicit step
  const maxTicks = 100; // 5.0 seconds max play duration

  // Resolve MIXED defense call using DC tendency weights
  let activeCall: Exclude<DefensiveCall, 'MIXED'> = 'COV3';
  if (defCallInput === 'MIXED') {
    const r = rng.next();
    if (r < 0.40) activeCall = 'COV3';
    else if (r < 0.70) activeCall = 'COV1';
    else if (r < 0.90) activeCall = 'COV2';
    else activeCall = 'BLITZ';
  } else {
    activeCall = defCallInput;
  }

  // Instantiate Offensive Agents (indices 0..10, index 0 is QB)
  const offAgents: AgentRuntime[] = offConfigs.map((c) => ({
    id: c.id,
    label: c.label,
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
  }));

  const defAgents = buildDefenseAgents(offConfigs, defConfigs, activeCall);
  const qb = offAgents[0];

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
  let timeToThrow = 0;
  let brokenTackles = 0;
  let commentary = '';

  const snapshots: TickSnapshot[] = [];

  for (let tick = 0; tick < maxTicks; tick++) {
    const t = tick * dt;

    // ------------------------------------------------------------------------
    // 1. POCKET PRESSURE FIELD & QB / BLOCKER / RUSHER KINEMATICS
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
        const weight = def.engagedWith === null ? 1.35 : 0.55;
        const contrib = weight * Math.exp(-distSq / sigmaSq);
        pocketPressure += contrib;
        pressGradX += (dx / sigmaSq) * contrib;
        pressGradY += (dy / sigmaSq) * contrib;
      }

      // QB Dropback (first 1.15s to y = -6.2) then climb/slide away from pressure gradient
      const dropTarget: Vec2 =
        t < 1.15
          ? { x: 0, y: -6.2 }
          : {
              x: Math.max(-4.5, Math.min(4.5, qb.pos.x + pressGradX * 2.2)),
              y: Math.max(-7.8, Math.min(-3.2, qb.pos.y + pressGradY * 2.2 + 0.35)),
            };
      stepAnisotropicAgent(qb, dropTarget, null, dt);
      ballPos = { x: qb.pos.x, y: qb.pos.y };
    }

    // ------------------------------------------------------------------------
    // 2. TRENCH BLOCKING & CHIP-RELEASE ENGAGEMENTS (Viscoelastic + Torque Shed)
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

      // If unengaged, scan for nearest unengaged rusher threatening the pocket
      if (off.engagedWith === null && off.stunTimer <= 0) {
        let bestDefIdx = -1;
        let bestDist = off.role === 'CHIP_RELEASE' ? 3.2 : 2.35;
        for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
          const def = defAgents[dIdx];
          if (def.assignType !== 'RUSH') continue;
          const d = Math.hypot(def.pos.x - off.pos.x, def.pos.y - off.pos.y);
          // Allow double teams or fresh blocks
          if (d < bestDist && (def.engagedWith === null || off.role === 'CHIP_RELEASE')) {
            bestDist = d;
            bestDefIdx = dIdx;
          }
        }

        if (bestDefIdx !== -1) {
          const rusher = defAgents[bestDefIdx];
          if (off.role === 'CHIP_RELEASE') {
            // Apply instantaneous chip impulse slowing edge rusher & resetting leverage
            rusher.vel.x *= 0.35;
            rusher.vel.y *= 0.35;
            rusher.leverageAngle *= 0.4;
            rusher.stunTimer = Math.max(rusher.stunTimer, 0.16);
          } else {
            off.engagedWith = bestDefIdx;
            rusher.engagedWith = oIdx;
            rusher.leverageAngle = 0;
          }
        } else {
          // Pass-set drop to protect pocket depth arc
          const arcDepth = -1.8 - 0.14 * Math.abs(off.pos.x);
          stepAnisotropicAgent(off, { x: off.pos.x * 0.96, y: arcDepth }, null, dt);
        }
      }
    }

    // Step engaged OL/DL contact constraints and free rushers
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

        // 1. Bull-Rush Linear Pocket Push Velocity (STR + BSH vs STR + PBK)
        const rusherDrive = 0.55 * def.ratings.str + 0.45 * def.ratings.bsh_tak;
        const blockerAnchor = 0.50 * blk.ratings.str + 0.50 * blk.ratings.pbk_tha;
        const pushSpeed = Math.max(
          -0.25,
          Math.min(1.85, 0.42 + 0.042 * (rusherDrive - blockerAnchor))
        );

        def.vel.x = nx * pushSpeed;
        def.vel.y = ny * pushSpeed;
        def.pos.x += def.vel.x * dt;
        def.pos.y += def.vel.y * dt;

        // Keep blocker locked 0.75 yds inside between rusher and QB
        blk.pos.x = def.pos.x + nx * 0.75;
        blk.pos.y = def.pos.y + ny * 0.75;
        blk.vel.x = def.vel.x;
        blk.vel.y = def.vel.y;

        // 2. Rotational Torque & Drift-Diffusion Block Shedding
        const shedDrift = (0.38 + 0.022 * (def.ratings.bsh_tak - blk.ratings.pbk_tha)) * dt;
        const shedNoise = 0.24 * Math.sqrt(dt) * rng.gaussian();
        def.leverageAngle += shedDrift + Math.abs(shedNoise);

        if (def.leverageAngle >= 1.0) {
          // Block Shed! Rip/Swim burst past blocker's outside shoulder
          blk.engagedWith = null;
          blk.stunTimer = 0.35;
          def.engagedWith = null;
          def.leverageAngle = 0;
          def.pos.x += nx * 0.45;
          def.pos.y += ny * 0.45;
        }
      } else {
        // Free rusher pursuits QB or ballcarrier
        const pursuitTarget =
          ballState === 'CAUGHT' && carrierOffIdx !== null
            ? offAgents[carrierOffIdx].pos
            : qb.pos;
        stepAnisotropicAgent(def, pursuitTarget, null, dt);

        // Check for Sack if QB still holds ball
        if (ballState === 'HELD') {
          const distToQb = Math.hypot(def.pos.x - qb.pos.x, def.pos.y - qb.pos.y);
          if (distToQb <= 1.25) {
            // Sack vs Break-Sack check
            const escapeProb =
              1 / (1 + Math.exp(-0.06 * (qb.ratings.btk_cov + qb.ratings.str * 0.4 - def.ratings.bsh_tak * 1.15 - 12)));
            if (rng.next() > escapeProb) {
              ballState = 'DEAD';
              timeToThrow = t;
              const yardsLost = Math.round(qb.pos.y * 10) / 10;
              const evalRes = evaluateSnapEPA(situation, 'SACK', yardsLost);
              commentary = `[SACK at t=${t.toFixed(2)}s] ${def.label} shed block & sacked QB at ${yardsLost.toFixed(1)} yds (${evalRes.epa.toFixed(2)} EPA).`;
              if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, currentReadSlot + 1, pocketPressure, ballState, ballPos, ballTargetPos, null, offAgents, defAgents));
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
                commentary,
                snapshots,
              };
            } else {
              // QB spins out of sack attempt!
              def.stunTimer = 0.35;
            }
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // 3. OFFENSIVE ROUTE RUNNERS (Waypoints + Anisotropic Cut Physics)
    // ------------------------------------------------------------------------
    for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
      const off = offAgents[oIdx];
      if (off.role === 'OL' || off.role === 'PASS_BLOCK') continue;
      if (off.role === 'CHIP_RELEASE' && off.chipTimer > 0) continue;

      if (ballState === 'CAUGHT' && carrierOffIdx === oIdx) {
        // Ballcarrier YAC steering: head upfield while shading away from nearest defender
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
      } else if (ballState === 'IN_FLIGHT' && targetedOffIdx === oIdx) {
        // Adjust to ball landing spot
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
    // 4. DEFENSIVE COVERAGE AGENTS (Man Cut-Delay & Pattern-Matching Zones)
    // ------------------------------------------------------------------------
    for (let dIdx = 0; dIdx < defAgents.length; dIdx++) {
      const def = defAgents[dIdx];
      if (def.assignType === 'RUSH') continue;

      if (ballState === 'CAUGHT' && carrierOffIdx !== null) {
        // Rally to ballcarrier with pursuit angle lead
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
        // Converge on ball target point when pass is in the air
        stepAnisotropicAgent(def, ballTargetPos, null, dt);
        continue;
      }

      if (def.assignType === 'MAN' && def.manTargetIdx >= 0) {
        const rec = offAgents[def.manTargetIdx];
        const recSpd = Math.hypot(rec.vel.x, rec.vel.y);
        const curDir =
          recSpd > 0.5 ? { x: rec.vel.x / recSpd, y: rec.vel.y / recSpd } : def.lastTargetVelDir;

        // Detect sharp route break via velocity direction change
        const dot = curDir.x * def.lastTargetVelDir.x + curDir.y * def.lastTargetVelDir.y;
        if (dot < 0.78 && def.cutReactionTimer <= 0 && t > 0.45) {
          // Reaction delay governed by Receiver Route Running vs Defender Coverage
          const skillDiff = (rec.ratings.rr_thp - def.ratings.btk_cov) / 100;
          def.cutReactionTimer = Math.max(0.05, 0.22 + 0.22 * skillDiff + 0.04 * rng.gaussian());
        }
        def.lastTargetVelDir = curDir;

        if (def.cutReactionTimer > 0) {
          // Defender temporarily drifts along previous vector before flipping hips!
          def.cutReactionTimer = Math.max(0, def.cutReactionTimer - dt);
          const driftTarget: Vec2 = {
            x: def.pos.x + def.vel.x * 0.35,
            y: def.pos.y + def.vel.y * 0.35,
          };
          stepAnisotropicAgent(def, driftTarget, null, dt);
        } else {
          // Aim for trail/inside leverage pocket on receiver
          const leverageOffset = rec.pos.x > 0 ? -0.35 : 0.35;
          const manAim: Vec2 = {
            x: rec.pos.x + rec.vel.x * 0.18 + leverageOffset,
            y: rec.pos.y + rec.vel.y * 0.18 + 0.55,
          };
          stepAnisotropicAgent(def, manAim, null, dt);
        }
      } else {
        // ZONE_UNDER or ZONE_DEEP: Drop to zone landmark, pattern-match nearest receiver in zone radius
        let matchTarget: Vec2 = { ...def.zoneAnchor };
        let bestRecDist = def.assignType === 'ZONE_DEEP' ? 9.5 : 6.8;

        for (let oIdx = 1; oIdx < offAgents.length; oIdx++) {
          const rec = offAgents[oIdx];
          if (rec.role === 'OL' || rec.role === 'PASS_BLOCK') continue;
          const dToAnchor = Math.hypot(rec.pos.x - def.zoneAnchor.x, rec.pos.y - def.zoneAnchor.y);
          if (dToAnchor < bestRecDist) {
            bestRecDist = dToAnchor;
            matchTarget = {
              x: 0.35 * def.zoneAnchor.x + 0.65 * (rec.pos.x + rec.vel.x * 0.25),
              y: 0.35 * def.zoneAnchor.y + 0.65 * (rec.pos.y + rec.vel.y * 0.25) + 0.6,
            };
          }
        }
        stepAnisotropicAgent(def, matchTarget, null, dt);
      }
    }

    // ------------------------------------------------------------------------
    // 5. QUARTERBACK READ PROGRESSION CLOCK & THROW DECISION
    // ------------------------------------------------------------------------
    if (ballState === 'HELD' && t >= 1.10 && readProgressionIndices.length > 0) {
      readDwellTimer += dt;
      const activeRecIdx =
        readProgressionIndices[Math.min(currentReadSlot, readProgressionIndices.length - 1)];
      const rec = offAgents[activeRecIdx];

      // Evaluate receiver readiness & projected separation at ball arrival
      const throwDist = Math.hypot(rec.pos.x - qb.pos.x, rec.pos.y - qb.pos.y);
      const ballSpeed = 19.5 + 8.5 * ((qb.ratings.rr_thp - 50) / 49); // 19.5 to 28 yds/s
      const flightTime = throwDist / ballSpeed;

      // Predict receiver position at t + flightTime
      const leadPos: Vec2 = {
        x: Math.max(-25.2, Math.min(25.2, rec.pos.x + rec.vel.x * flightTime * 0.88)),
        y: rec.pos.y + rec.vel.y * flightTime * 0.88,
      };

      // Compute nearest defender distance at lead position & underneath lane congestion
      let minDefSep = 99;
      let laneCongestion = 0;

      for (const def of defAgents) {
        if (def.assignType === 'RUSH') continue;
        const defPredX = def.pos.x + def.vel.x * flightTime * 0.78;
        const defPredY = def.pos.y + def.vel.y * flightTime * 0.78;
        const sep = Math.hypot(defPredX - leadPos.x, defPredY - leadPos.y);
        if (sep < minDefSep) minDefSep = sep;

        // Check if defender is sitting directly in the throwing lane between QB and receiver
        const qbToRecX = leadPos.x - qb.pos.x;
        const qbToRecY = leadPos.y - qb.pos.y;
        const segLenSq = qbToRecX * qbToRecX + qbToRecY * qbToRecY;
        const proj =
          segLenSq > 0.1
            ? ((def.pos.x - qb.pos.x) * qbToRecX + (def.pos.y - qb.pos.y) * qbToRecY) / segLenSq
            : 0;
        if (proj > 0.25 && proj < 0.92) {
          const lineX = qb.pos.x + proj * qbToRecX;
          const lineY = qb.pos.y + proj * qbToRecY;
          const perpDist = Math.hypot(def.pos.x - lineX, def.pos.y - lineY);
          if (perpDist < 1.65) laneCongestion += 1.0;
        }
      }

      // Required separation threshold lowers on later reads or under heavy pocket pressure
      const isFinalCheckdown = currentReadSlot >= readProgressionIndices.length - 1;
      const reqSep = isFinalCheckdown
        ? 1.15
        : Math.max(1.45, 2.05 - 0.18 * currentReadSlot - 0.22 * pocketPressure);

      const forcePanicThrow = pocketPressure > 1.75 && t > 1.95;

      if ((minDefSep >= reqSep && laneCongestion === 0) || forcePanicThrow || (isFinalCheckdown && t > 2.85)) {
        // Trigger Throw! Apply bivariate normal placement error scaled by THA & Pressure
        const accNorm = (qb.ratings.pbk_tha - 50) / 49;
        const distPenalty = Math.max(0, (throwDist - (14 + 18 * accNorm)) * 0.045);
        const scatterSigma =
          (0.32 + 0.95 * (1 - accNorm) + distPenalty + 0.55 * pocketPressure) *
          (forcePanicThrow ? 1.35 : 1.0);

        ballTargetPos = {
          x: Math.max(-25.8, Math.min(25.8, leadPos.x + rng.gaussian() * scatterSigma)),
          y: leadPos.y + rng.gaussian() * scatterSigma,
        };

        flightTimer = Math.max(0.15, flightTime);
        ballVel = {
          x: (ballTargetPos.x - qb.pos.x) / flightTimer,
          y: (ballTargetPos.y - qb.pos.y) / flightTimer,
        };
        ballState = 'IN_FLIGHT';
        targetedOffIdx = activeRecIdx;
        timeToThrow = t;
      } else if (readDwellTimer >= 0.35 && currentReadSlot < readProgressionIndices.length - 1) {
        // Step QB eyes to next read in progression
        currentReadSlot++;
        readDwellTimer = 0;
      }
    }

    // ------------------------------------------------------------------------
    // 6. BALL FLIGHT & CATCH / INTERCEPTION / PASS BREAKUP RESOLUTION
    // ------------------------------------------------------------------------
    if (ballState === 'IN_FLIGHT' && targetedOffIdx !== null) {
      ballPos.x += ballVel.x * dt;
      ballPos.y += ballVel.y * dt;
      flightTimer -= dt;

      if (flightTimer <= 0) {
        const rec = offAgents[targetedOffIdx];
        const recDistToBall = Math.hypot(rec.pos.x - ballTargetPos.x, rec.pos.y - ballTargetPos.y);

        // Find closest coverage defender at arrival moment
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

        // Check for Interception if defender undercuts ball with tight proximity
        if (minDefDist < 1.35 && minDefDist < recDistToBall - 0.15) {
          const intProb = 0.28 + 0.45 * (closestDef.ratings.btk_cov / 100);
          if (rng.next() < intProb) {
            ballState = 'DEAD';
            const intYards = Math.round(ballTargetPos.y * 10) / 10;
            const evalRes = evaluateSnapEPA(situation, 'INTERCEPTION', intYards);
            commentary = `[INTERCEPTION at t=${t.toFixed(2)}s] Pass to ${rec.label} (Read #${rec.readOrder}) undercut by ${closestDef.label} at +${intYards.toFixed(1)} yds (${evalRes.epa.toFixed(2)} EPA).`;
            if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, rec.readOrder, pocketPressure, ballState, ballPos, ballTargetPos, null, offAgents, defAgents));
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
              commentary,
              snapshots,
            };
          }
        }

        // Completion probability based on ball placement error & defender contest window
        const contestPenalty =
          minDefDist < 1.85 ? (1.85 - minDefDist) * (0.55 + 0.006 * closestDef.ratings.btk_cov) : 0;
        const offCatchSkill = 0.012 * (rec.ratings.rr_thp - 70);
        const catchLogit = 2.45 - 1.35 * recDistToBall - 1.45 * contestPenalty + offCatchSkill;
        const catchProb = recDistToBall > 2.45 ? 0.02 : 1 / (1 + Math.exp(-catchLogit));

        if (rng.next() <= catchProb) {
          ballState = 'CAUGHT';
          carrierOffIdx = targetedOffIdx;
          rec.pos.x = ballTargetPos.x;
          rec.pos.y = ballTargetPos.y;
        } else {
          ballState = 'DEAD';
          const evalRes = evaluateSnapEPA(situation, 'INCOMPLETE', 0);
          commentary = `[INCOMPLETE at t=${t.toFixed(2)}s] Pass to ${rec.label} (Read #${rec.readOrder}, sep ${minDefDist.toFixed(1)}y) broken up / off-target (${evalRes.epa.toFixed(2)} EPA).`;
          if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, rec.readOrder, pocketPressure, ballState, ballPos, ballTargetPos, null, offAgents, defAgents));
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
            commentary,
            snapshots,
          };
        }
      }
    }

    // ------------------------------------------------------------------------
    // 7. OPEN-FIELD TACKLING vs. TACKLE-BREAKING PHYSICS (YAC Phase)
    // ------------------------------------------------------------------------
    if (ballState === 'CAUGHT' && carrierOffIdx !== null) {
      const carrier = offAgents[carrierOffIdx];
      ballPos = { x: carrier.pos.x, y: carrier.pos.y };

      // Check Touchdown or Sideline Out-of-Bounds
      if (situation.yardline + carrier.pos.y >= 100 || Math.abs(carrier.pos.x) >= 25.9) {
        ballState = 'DEAD';
        const gain = Math.round(carrier.pos.y * 10) / 10;
        const evalRes = evaluateSnapEPA(situation, 'COMPLETE', gain);
        commentary = `[COMPLETE +${gain.toFixed(1)} yds] ${carrier.label} (Read #${carrier.readOrder}) caught pass & finished run (${brokenTackles} broken tackles | ${evalRes.epa >= 0 ? '+' : ''}${evalRes.epa.toFixed(2)} EPA).`;
        if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, carrier.readOrder, pocketPressure, ballState, ballPos, ballTargetPos, carrierOffIdx, offAgents, defAgents));
        return {
          outcome: 'COMPLETE',
          yardsGained: gain,
          epa: evalRes.epa,
          goalSuccess: evalRes.goalSuccess,
          timeToThrow,
          targetedPlayerId: carrier.id,
          targetedReadOrder: carrier.readOrder,
          catchPos: { ...ballTargetPos },
          brokenTackles,
          commentary,
          snapshots,
        };
      }

      // Check 2D tackle collisions with defenders
      for (const def of defAgents) {
        if (def.stunTimer > 0) continue;
        const dx = carrier.pos.x - def.pos.x;
        const dy = carrier.pos.y - def.pos.y;
        const dist = Math.hypot(dx, dy);

        // Initiate tackle lunge when entering 1.65 yd envelope
        if (dist < 1.65 && def.lungeLockTimer <= 0) {
          def.lungeLockTimer = 0.20;
        }

        if (dist <= 1.15) {
          // Compute impact parameter b = dist * |sin(psi)| between defender velocity and vector to carrier
          const defSpd = Math.max(0.5, Math.hypot(def.vel.x, def.vel.y));
          const cosPsi = Math.max(-1, Math.min(1, (def.vel.x * dx + def.vel.y * dy) / (defSpd * dist)));
          const sinPsi = Math.sqrt(Math.max(0, 1 - cosPsi * cosPsi));
          const impactParamB = dist * sinPsi; // 0 = dead-on square hit, ~1.0 = glancing arm reach

          const runnerPower = 0.50 * carrier.ratings.btk_cov + 0.30 * carrier.ratings.agi + 0.20 * carrier.ratings.str;
          const tacklerPower = (0.60 * def.ratings.bsh_tak + 0.40 * def.ratings.str) * Math.max(0.35, 1.0 - 0.55 * impactParamB);

          const breakProb = 1 / (1 + Math.exp(-0.055 * (runnerPower - tacklerPower - 8)));

          if (rng.next() < breakProb) {
            // Broken arm tackle or juke! Defender stunned, runner loses partial momentum
            brokenTackles++;
            def.stunTimer = 0.45;
            carrier.vel.x *= 0.68;
            carrier.vel.y *= 0.68;
          } else {
            // Tackled down in bounds!
            ballState = 'DEAD';
            const forwardProgress = Math.round((carrier.pos.y + 0.25) * 10) / 10;
            const evalRes = evaluateSnapEPA(situation, 'COMPLETE', forwardProgress);
            commentary = `[COMPLETE +${forwardProgress.toFixed(1)} yds] ${carrier.label} (Read #${carrier.readOrder}) tackled by ${def.label} (${brokenTackles} broken tackles | ${evalRes.epa >= 0 ? '+' : ''}${evalRes.epa.toFixed(2)} EPA).`;
            if (recordSnapshots) snapshots.push(captureSnapshot(tick, t, carrier.readOrder, pocketPressure, ballState, ballPos, ballTargetPos, carrierOffIdx, offAgents, defAgents));
            return {
              outcome: 'COMPLETE',
              yardsGained: forwardProgress,
              epa: evalRes.epa,
              goalSuccess: evalRes.goalSuccess,
              timeToThrow,
              targetedPlayerId: carrier.id,
              targetedReadOrder: carrier.readOrder,
              catchPos: { ...ballTargetPos },
              brokenTackles,
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
          offAgents,
          defAgents
        )
      );
    }
  }

  // Play clock expired (throwaway or tackled at whistle)
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
    agents: all.map((a) => ({
      id: a.id,
      label: a.label,
      team: a.team,
      archetype: a.archetype,
      x: a.pos.x,
      y: a.pos.y,
      vx: a.vel.x,
      vy: a.vel.y,
      heading: a.heading,
      engaged: a.engagedWith !== null,
      shedBurst: a.stunTimer > 0,
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
  baseSeed = 42069
): MonteCarloSummary {
  const rng = new PRNG(baseSeed);
  const epaSamples: number[] = [];
  const scatterPoints: MonteCarloSummary['scatterPoints'] = [];

  let goals = 0;
  let comps = 0;
  let sacks = 0;
  let ints = 0;
  let totalYards = 0;
  let totalTtt = 0;
  let primaryTargets = 0;
  let passAttempts = 0;

  for (let i = 0; i < snaps; i++) {
    const res = simulateSingleSnap(offConfigs, defConfigs, defCall, situation, rng, false);
    epaSamples.push(res.epa);
    if (res.goalSuccess) goals++;
    if (res.outcome === 'COMPLETE') comps++;
    if (res.outcome === 'SACK') sacks++;
    if (res.outcome === 'INTERCEPTION') ints++;
    totalYards += res.yardsGained;
    totalTtt += res.timeToThrow;
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
    avgYards: totalYards / snaps,
    avgTimeToThrow: totalTtt / snaps,
    primaryReadShare: (primaryTargets / Math.max(1, passAttempts)) * 100,
    epaSamples,
    scatterPoints,
  };
}

// ============================================================================
// EVOLUTIONARY PLAY MUTATOR (Roster-Aware Mean-Variance Optimizer)
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
    // Risk-aware objective: Mean EPA + Situational Goal bonus - Variance penalty
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

    if (mutationRoll < 0.26 && (targetRec.id === 'TE' || targetRec.id === 'RB')) {
      // Mutate protection / chip role for TE or RB
      const roles: OffensiveRole[] = ['ROUTE', 'CHIP_RELEASE', 'PASS_BLOCK'];
      const nextRole = roles[Math.floor(rng.next() * roles.length)];
      targetRec.role = nextRole;
      desc = `Switched ${targetRec.label} protection role to [${nextRole}]`;
    } else if (mutationRoll < 0.68 && targetRec.waypoints.length >= 2) {
      // Mutate stem depth or break angle on route nodes
      const wp0 = targetRec.waypoints[0];
      const wp1 = targetRec.waypoints[1];
      const deltaStemY = (rng.next() - 0.48) * 3.6;
      const deltaBreakX = (rng.next() - 0.5) * 5.2;
      const deltaBreakY = (rng.next() - 0.48) * 3.5;

      wp0.y = Math.max(1.5, Math.min(18.0, wp0.y + deltaStemY));
      wp1.x = Math.max(-24.5, Math.min(24.5, wp1.x + deltaBreakX));
      wp1.y = Math.max(-2.0, Math.min(28.0, wp1.y + deltaBreakY));
      desc = `Adjusted ${targetRec.label} stem break to (${wp0.x.toFixed(1)}, ${wp0.y.toFixed(1)}y) -> (${wp1.x.toFixed(1)}, ${wp1.y.toFixed(1)}y)`;
    } else if (mutationRoll < 0.85) {
      // Mutate pre-snap horizontal formation split
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
      desc = `Shifted ${targetRec.label} pre-snap split to x=${targetRec.startPos.x.toFixed(1)}y`;
    } else {
      // Swap QB read progression order between two eligible receivers
      const a = eligibles[Math.floor(rng.next() * eligibles.length)];
      const b = eligibles[Math.floor(rng.next() * eligibles.length)];
      if (a.id !== b.id) {
        const tmp = a.readOrder;
        a.readOrder = b.readOrder;
        b.readOrder = tmp;
        desc = `Swapped QB Read Progression: ${a.label} (Read #${a.readOrder}) <-> ${b.label} (Read #${b.readOrder})`;
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

  // Final high-precision 400-snap verification rollout
  const finalSummary = runMonteCarloBatch(bestPlay, defConfigs, defCall, situation, 400, 42069);
  return { optimizedOffense: bestPlay, logs, finalSummary };
}
