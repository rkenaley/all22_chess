export type BlockRoleType =
  | 'PASS_SET'
  | 'MAN_BLOCK'
  | 'GAP_ZONE'
  | 'COMBO_CLIMB'
  | 'PULL_LEAD'
  | 'PULL_TRAP'
  | 'CHIP_RELEASE'
  | 'MAX_PROTECT_SCAN'
  | 'ROUTE'
  | 'BALL_CARRIER'
  | 'QB_DROP';

export type GapOrSetCode =
  | 'VERTICAL_DEEP'
  | 'ANGLE_45'
  | 'JUMP_SET'
  | 'A_LEFT'
  | 'A_RIGHT'
  | 'B_LEFT'
  | 'B_RIGHT'
  | 'C_LEFT'
  | 'C_RIGHT'
  | 'D_ALLEY';

export type LeverageBias = 'INSIDE_OUT' | 'NEUTRAL' | 'OUTSIDE_IN';

export interface Waypoint2D {
  x: number; // Lateral field coordinate in yards (-26.67 to +26.67)
  y: number; // Depth relative to LOS in yards (+ downfield, - backfield)
}

export interface PlayActionConfig {
  enabled: boolean;
  meshDurationSec: number;       // Fake handoff duration (e.g. 1.15 to 1.30s)
  fakeCarrierId: string;         // e.g. 'RB'
  fakeGap?: GapOrSetCode;        // e.g. 'A_LEFT' or 'C_LEFT'
  isBootleg?: boolean;           // QB rolls out opposite the run fake
  bootDirection?: 'LEFT' | 'RIGHT' | 'POCKET';
}

export interface BackwardTossConfig {
  enabled: boolean;
  tossTimeSec: number;           // Seconds post-snap to pitch backward (e.g. 0.25s jet touch-toss, 0.50s lateral screen)
  recipientId: string;           // Target back/motion WR behind passer
  postTossRole?: BlockRoleType;  // Role passer adopts after pitching (e.g. 'MAN_BLOCK', 'PULL_LEAD', 'ROUTE')
  postTossWaypoints?: Waypoint2D[];
  executed?: boolean;
}

export interface OptionPassConfig {
  enabled: boolean;
  throwerRating: number;          // Passing accuracy/touch (40-99) for converted-QB WR or Pony QB2
  decisionWindowStartSec: number; // Start of run-or-pass read window behind LOS
  decisionWindowEndSec: number;   // End of read window (tucks & runs if no receiver open)
  primaryReceiverId: string;      // Primary conflict receiver
  secondaryReceiverId?: string;   // Optional 2nd progression for QB2
  separationThresholdYds: number; // Required DB separation (yds) to trigger pass; otherwise tuck & run
  decidedRun?: boolean;
}

export interface LateralConfig {
  enabled: boolean;
  pitchTargetId: string;          // Trailing pitch option teammate ID
  gatherDelaySec?: number;        // Seconds after catch/possession before pitch allowed (default 0.15s)
  defenderCollapseRadius?: number;// Max dist of defender converging on carrier to trigger pitch (default 4.4y)
  maxPitchDist?: number;          // Maximum safe lateral toss distance (default 9.0y)
  minTargetSeparation?: number;   // Minimum open space around trailing teammate (default 2.3y)
  executed?: boolean;
}

export type DefRoleType =
  | 'RUSH_GAP'
  | 'CONTAIN_EDGE'
  | 'BLITZ_A'
  | 'BLITZ_EDGE'
  | 'BLITZ_RUN_GAP'
  | 'CROSS_DOG'
  | 'BLITZ_EDGE_CRASH'
  | 'SPILL'
  | 'FORCE_ALLEY'
  | 'READ_RUN_PASS'
  | 'DEEP_ZONE'
  | 'CURL_FLAT'
  | 'HOOK_CURL'
  | 'DEEP_HALF'
  | 'DEEP_THIRD'
  | 'QUARTERS_MATCH'
  | 'ROBBER'
  | 'MAN_COV';

export interface DefResponsibilityOption {
  role: DefRoleType;
  weight: number;
  targetX?: number;
  targetY?: number;
  gap?: GapOrSetCode;
  stuntCrossTargetX?: number;
  manTargetId?: string;
}

export interface SimFieldContext {
  yardLineToGoal?: number;        // Yards from LOS to opponent goal line (e.g. 4 on Goal Line, 65 open field)
  sidelineObjective?: 'NORMAL' | 'STOP_CLOCK_OOB' | 'STAY_INBOUNDS';
  extendedMaxTicks?: number;      // Optional tick cap override for multi-phase downfield plays
  cappedYacSweep?: boolean;       // Symmetric capped open-field YAC cap for sweeps/runs in NO_FC mode
}

export interface BlockerAssignment {
  role: BlockRoleType;
  primaryTargetId: string | null;   // Down-lineman / Edge target (e.g., 'LDE', 'NT', '3T')
  secondaryTargetId: string | null; // Second-level LB/DB climb target (e.g., 'MIKE', 'WILL')
  gapOrSet: GapOrSetCode;
  leverage: LeverageBias;
  climbOrChipDelaySec: number;      // Duration before detaching to LB or releasing to route
  waypoints: Waypoint2D[];          // Used for PULL_LEAD, PULL_TRAP, ROUTE, or BALL_CARRIER
}

export interface PreSnapMotionConfig {
  enabled: boolean;
  type: 'JET_RIGHT' | 'JET_LEFT' | 'ORBIT';
  speed: number;       // Lateral sprint speed in yd/s (NFL jet motion baseline 5.5 - 6.2 yd/s)
  dirX: number;        // Direction: +1 for Left-to-Right, -1 for Right-to-Left
  dirY: number;        // Depth angle (0 for parallel to LOS, -0.1 to +0.2)
  originX: number;     // Starting pre-snap alignment coordinate
  originY: number;     // Starting pre-snap depth
  snapX: number;       // Position at the exact instant of the snap
  snapY: number;       // Depth at the snap
}

export interface SimAgent {
  id: string;
  label: string;
  name?: string;
  jersey?: number;
  side: 'OFF' | 'DEF';
  pos: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number; // Net trench contact force X
  fy: number; // Net trench contact force Y
  engagedWithId: string | null;
  leverageScore: number; // [-1.0 defender winning .. +1.0 blocker winning]
  ratings: {
    speed: number;      // 40-99
    accel: number;      // 40-99
    power: number;      // Ballcarrier leg drive or trench block power
    finesse: number;    // Footwork / hand usage / pass-rush move
    awareness: number;  // Scan & combo timing
  };
  blockRating?: number; // Explicit contact/trench blocking skill & mass leverage (40-99), separated from ballcarrier power
  assignment: BlockerAssignment;
  defAssignment?: {
    role: DefRoleType;
    targetX: number;
    targetY: number;
    gap?: GapOrSetCode;
    stuntCrossTargetX?: number;
    manTargetId?: string;
    probabilityWeights?: DefResponsibilityOption[];
    disguiseLabel?: string;
  };
  // Pre-snap motion and protection declarations
  preSnapMotion?: PreSnapMotionConfig;
  playAction?: PlayActionConfig;
  backwardToss?: BackwardTossConfig;
  optionPass?: OptionPassConfig;
  lateralConfig?: LateralConfig;
  designatedMikeId?: string | null;
  // Dynamic runtime telemetry
  readOrder?: number;
  facingAngle?: number;
  engagedDuration?: number;
  shedCooldown?: number;
  recoveryDelay?: number;
  tackleContactTicks?: number;
  stallTicks?: number;
  isShedding?: boolean;
  repBonus?: number; // Snap-level execution / jump-timing modifier
  chosenLaneOffset?: number; // Ball carrier hysteresis lane offset
  caughtAtTimeSec?: number;
  waypointOriginX?: number;
  waypointOriginY?: number;
  waypointResetTimeSec?: number;
}

export interface BallState {
  x: number;
  y: number;
  z: number; // Height above turf in yards
  state: 'HELD' | 'IN_FLIGHT' | 'CAUGHT' | 'INCOMPLETE' | 'DEAD';
  carrierId: string | null;
  targetReceiverId: string | null;
  launchX?: number;
  launchY?: number;
  targetX?: number;
  targetY?: number;
  throwTimeSec?: number;
  flightDurationSec?: number;
  isLateral?: boolean;
  forwardPassThrown?: boolean;
  completedPass?: boolean;
  passerId?: string | null;
  lateralCount?: number;
  throwerSkill?: number;
  pressuredAtRelease?: boolean;
}

export interface PlayTickSnapshot {
  tick: number;
  timeSec: number;
  agents: SimAgent[];
  pocketIntegrity: number; // 0..100%
  trenchNetYards: number;
  expectedEpa: number;
  phase: 'PRE-SNAP' | 'TRENCH_INIT' | 'POCKET_CLIMB' | 'CONCEPT_RESOLUTION' | 'PLAY_ACTION_MESH';
  playOver?: boolean;
  terminationReason?:
    | 'SACK'
    | 'TACKLED'
    | 'COMPLETE'
    | 'INCOMPLETE'
    | 'INTERCEPTION'
    | 'TOUCHDOWN'
    | 'OUT_OF_BOUNDS'
    | 'FUMBLE_LOST'
    | 'FUMBLE_RECOVERED'
    | 'WHISTLE'
    | null;
  carrierTackledYards?: number | null;
  ball?: BallState;
  targetedReceiverId?: string | null;
  timeToThrowOrGapSec?: number | null;
  completionProbability?: number | null;
  exoticEvent?: 'OPTION_PASS' | 'OPTION_RUN_KEEP' | 'HOOK_AND_LATERAL' | 'BACKWARD_TOSS' | string | null;
  appliedDefDisguise?: string | null;
}

export const GAP_X_COORDS: Record<GapOrSetCode, { dx: number; dy: number }> = {
  VERTICAL_DEEP: { dx: 0.0, dy: -2.2 },
  ANGLE_45: { dx: -0.6, dy: -1.4 },
  JUMP_SET: { dx: 0.0, dy: 0.35 },
  A_LEFT: { dx: -0.9, dy: 0.6 },
  A_RIGHT: { dx: 0.9, dy: 0.6 },
  B_LEFT: { dx: -2.3, dy: 0.6 },
  B_RIGHT: { dx: 2.3, dy: 0.6 },
  C_LEFT: { dx: -3.9, dy: 0.6 },
  C_RIGHT: { dx: 3.9, dy: 0.6 },
  D_ALLEY: { dx: 5.5, dy: 1.2 },
};

export class All22KinematicEngine {
  public readonly dt = 0.05; // 20 Hz explicit integration step (50ms)
  public readonly maxTicks = 120; // 6.0 seconds (calibrated to BDB 2027 play durations)

  // Biomechanical turf cleat friction & acceleration limits
  private readonly maxLateralGs = 0.88; // ~8.6 m/s^2 = 9.4 yds/s^2 (matching 10 Hz active-play p99)
  private readonly maxTurnRateRadSec = 4.6; // maximum high-speed angular velocity on turf

  /**
   * Maps player position mass tier + speed/accel ratings to empirical NFL Combine / BDB 2027 10 Hz
   * peak sprint speed (yd/s) and burst acceleration (yd/s^2).
   */
  private getPositionalKinematics(agent: SimAgent): {
    maxSpeedYps: number;
    maxLinearAccelYps2: number;
    footworkAccelYps2: number;
  } {
    const pos = agent.pos.toUpperCase();
    const isHeavyTrench = [
      'LT', 'LG', 'C', 'RG', 'RT', 'OL', 'OT', 'OG', 'DT', 'NT', 'DT1', 'DT2',
    ].includes(pos);
    if (isHeavyTrench) {
      return {
        maxSpeedYps: 4.9 + (agent.ratings.speed / 100) * 2.0,
        maxLinearAccelYps2: 3.8 + (agent.ratings.accel / 100) * 1.9,
        footworkAccelYps2: 5.4,
      };
    }

    const isMediumHybrid = [
      'DE', 'LDE', 'RDE', 'EDGE', 'EDGE1', 'EDGE2', 'OLB', 'LOLB', 'ROLB',
      'LB', 'ILB', 'MLB', 'WLB', 'SLB', 'WILL', 'MIKE', 'SAM', 'TE', 'FB', 'QB',
    ].includes(pos);
    if (isMediumHybrid) {
      return {
        maxSpeedYps: 4.6 + (agent.ratings.speed / 100) * 4.4,
        maxLinearAccelYps2: 4.7 + (agent.ratings.accel / 100) * 2.2,
        footworkAccelYps2: 6.6,
      };
    }

    return {
      maxSpeedYps: 4.5 + (agent.ratings.speed / 100) * 5.65,
      maxLinearAccelYps2: 5.3 + (agent.ratings.accel / 100) * 2.7,
      footworkAccelYps2: 7.6,
    };
  }

  private gaussianRandom(): number {
    const u1 = Math.max(1e-6, Math.random());
    const u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  public simulatePlay(
    initialAgents: SimAgent[],
    stochasticNoise = 0.0,
    fieldContext?: SimFieldContext
  ): PlayTickSnapshot[] {
    const effectiveMaxTicks = fieldContext?.extendedMaxTicks ?? this.maxTicks;
    const maxFieldY = fieldContext?.yardLineToGoal
      ? Math.max(35.0, fieldContext.yardLineToGoal + 5.0)
      : 35.0;

    let readCounter = 1;
    const agents: SimAgent[] = initialAgents.map((a) => {
      const isRoute = a.side === 'OFF' && (a.assignment.role === 'ROUTE' || a.assignment.role === 'CHIP_RELEASE');
      const assignedRead = a.readOrder ?? (isRoute ? readCounter++ : undefined);
      // Coherent snap-level rep execution modifier (jump timing, hand placement, pad level)
      const repBonus = stochasticNoise > 0 ? this.gaussianRandom() * 7.5 * stochasticNoise : 0;

      // Pre-snap motion resolution & entering momentum
      let initX = a.startX;
      let initY = a.startY;
      let initVx = a.vx ?? 0;
      let initVy = a.vy ?? 0;

      if (a.preSnapMotion?.enabled) {
        initX = a.preSnapMotion.snapX;
        initY = a.preSnapMotion.snapY;
        initVx = a.preSnapMotion.speed * a.preSnapMotion.dirX;
        initVy = a.preSnapMotion.speed * (a.preSnapMotion.dirY ?? 0);
      } else if (a.side === 'DEF' && a.defAssignment?.manTargetId) {
        // If assigned man-to-man against an offensive motion player, trail motion across formation
        const assignedTarget = initialAgents.find((o) => o.id === a.defAssignment!.manTargetId);
        if (assignedTarget?.preSnapMotion?.enabled) {
          const m = assignedTarget.preSnapMotion;
          initX = a.startX + (m.snapX - assignedTarget.startX) * 0.65;
          initY = Math.max(1.8, a.startY);
          initVx = m.speed * m.dirX * 0.70; // Trailing velocity at snap
        }
      }

      return {
        ...a,
        x: initX,
        y: initY,
        vx: initVx,
        vy: initVy,
        fx: 0,
        fy: 0,
        engagedWithId: null,
        leverageScore: 0,
        readOrder: assignedRead,
        facingAngle: a.side === 'OFF' ? Math.PI / 2 : -Math.PI / 2,
        engagedDuration: 0,
        shedCooldown: 0,
        recoveryDelay: 0,
        tackleContactTicks: 0,
        stallTicks: 0,
        isShedding: false,
        repBonus,
        chosenLaneOffset: 0,
        caughtAtTimeSec: undefined,
        waypointOriginX: undefined,
        waypointOriginY: undefined,
        waypointResetTimeSec: undefined,
        ratings: { ...a.ratings },
        preSnapMotion: a.preSnapMotion ? { ...a.preSnapMotion } : undefined,
        playAction: a.playAction ? { ...a.playAction } : undefined,
        backwardToss: a.backwardToss
          ? {
              ...a.backwardToss,
              postTossWaypoints: a.backwardToss.postTossWaypoints
                ? a.backwardToss.postTossWaypoints.map((w) => ({ ...w }))
                : undefined,
              executed: false,
            }
          : undefined,
        optionPass: a.optionPass ? { ...a.optionPass, decidedRun: false } : undefined,
        lateralConfig: a.lateralConfig ? { ...a.lateralConfig, executed: false } : undefined,
        designatedMikeId: a.designatedMikeId,
        assignment: {
          ...a.assignment,
          waypoints: Array.isArray(a.assignment.waypoints)
            ? a.assignment.waypoints.map((w) => ({ ...w }))
            : [],
        },
        defAssignment: a.defAssignment
          ? {
              ...a.defAssignment,
              probabilityWeights: a.defAssignment.probabilityWeights
                ? a.defAssignment.probabilityWeights.map((opt) => ({ ...opt }))
                : undefined,
            }
          : undefined,
      };
    });

    const appliedDefDisguise = this.applyDefensivePsychologyAndTendencies(
      agents,
      stochasticNoise,
      fieldContext
    );

    const history: PlayTickSnapshot[] = [];
    let playTerminated = false;
    let termReason: PlayTickSnapshot['terminationReason'] = null;
    let finalTackledYards: number | null = null;
    let timeToThrowOrGapSec: number | null = null;
    let lastCompProb: number | null = null;
    let releasePocketIntegrity: number | null = null;
    let lastExoticEvent: PlayTickSnapshot['exoticEvent'] = null;

    const qbInit = agents.find((a) => a.side === 'OFF' && a.pos === 'QB');
    const rbCarrierInit = agents.find((a) => a.side === 'OFF' && a.assignment.role === 'BALL_CARRIER');

    const ballState: BallState = {
      x: rbCarrierInit ? rbCarrierInit.x : qbInit ? qbInit.x : 0,
      y: rbCarrierInit ? rbCarrierInit.y : qbInit ? qbInit.y : -4.5,
      z: 1.8,
      state: 'HELD',
      carrierId: rbCarrierInit ? rbCarrierInit.id : qbInit ? qbInit.id : null,
      targetReceiverId: null,
      isLateral: false,
      forwardPassThrown: false,
      completedPass: false,
      passerId: null,
      lateralCount: 0,
    };

    const hardTickCap = effectiveMaxTicks + 40;
    for (let tick = 0; tick <= hardTickCap; tick++) {
      const timeSec = +(tick * this.dt).toFixed(2);
      if (tick >= effectiveMaxTicks && !playTerminated && ballState.state === 'HELD') {
        const activeCarrier = agents.find(
          (a) =>
            a.side === 'OFF' &&
            (a.id === ballState.carrierId || a.assignment.role === 'BALL_CARRIER')
        );
        if (activeCarrier && activeCarrier.assignment.role === 'BALL_CARRIER') {
          playTerminated = true;
          termReason = ballState.completedPass ? 'COMPLETE' : 'TACKLED';
          finalTackledYards = +activeCarrier.y.toFixed(2);
        }
      }
      const metrics = this.evaluateFrameMetrics(
        agents,
        timeSec,
        playTerminated,
        termReason,
        finalTackledYards,
        ballState,
        releasePocketIntegrity
      );
      if (ballState.state === 'HELD' && !ballState.completedPass) {
        releasePocketIntegrity = metrics.pocketIntegrity;
      }

      history.push({
        tick,
        timeSec,
        agents: JSON.parse(JSON.stringify(agents)),
        pocketIntegrity: metrics.pocketIntegrity,
        trenchNetYards: metrics.trenchNetYards,
        expectedEpa: metrics.expectedEpa,
        playOver: playTerminated,
        terminationReason: termReason,
        carrierTackledYards: finalTackledYards,
        ball: { ...ballState },
        targetedReceiverId: ballState.targetReceiverId,
        timeToThrowOrGapSec,
        completionProbability: lastCompProb,
        exoticEvent: lastExoticEvent,
        appliedDefDisguise,
        phase:
          tick === 0
            ? 'PRE-SNAP'
            : (qbInit?.playAction?.enabled && timeSec < (qbInit.playAction.meshDurationSec ?? 1.25))
            ? 'PLAY_ACTION_MESH'
            : timeSec < 0.75
            ? 'TRENCH_INIT'
            : timeSec < 1.85
            ? 'POCKET_CLIMB'
            : 'CONCEPT_RESOLUTION',
      });

      if (tick >= effectiveMaxTicks && (playTerminated || ballState.state !== 'IN_FLIGHT')) {
        break;
      }

      if (tick < hardTickCap) {
        if (!playTerminated) {
          const stepResult = this.stepPhysics(
            agents,
            timeSec,
            stochasticNoise,
            ballState,
            fieldContext,
            maxFieldY
          );
          if (stepResult.timeToEventSec !== undefined && timeToThrowOrGapSec === null) {
            timeToThrowOrGapSec = stepResult.timeToEventSec;
          }
          if (stepResult.compProb !== undefined && stepResult.compProb !== null) {
            lastCompProb = stepResult.compProb;
          }
          if (stepResult.exoticEvent) {
            lastExoticEvent = stepResult.exoticEvent;
          }
          if (stepResult.terminated) {
            playTerminated = true;
            termReason = stepResult.reason;
            finalTackledYards = stepResult.tackledYards;
          }
        } else {
          // Play terminated early (Sack, Tackle, Complete, or Incomplete): physically decelerate players to halt
          for (const a of agents) {
            a.engagedWithId = null;
            a.isShedding = false;
            const spd = Math.hypot(a.vx, a.vy);
            if (spd > 0.05) {
              const brakeDv = Math.min(spd, 14.0 * this.dt);
              a.vx -= (a.vx / spd) * brakeDv;
              a.vy -= (a.vy / spd) * brakeDv;
              a.x = Math.max(-26.2, Math.min(26.2, a.x + a.vx * this.dt));
              a.y = Math.max(-12.0, Math.min(maxFieldY, a.y + a.vy * this.dt));
            } else {
              a.vx = 0;
              a.vy = 0;
            }
            a.fx = 0;
            a.fy = 0;
          }
          this.separateShoulderCylinders(agents, maxFieldY, null, false);
        }
      }
    }

    return history;
  }

  /**
   * Pre-snap and post-snap defensive responsibility distributions, strength checks,
   * motion banjo/rock responses, safety shell disguise rotations, and simulated pressures.
   * Only randomizes when noiseAmp > 0 so deterministic single-frame probes stay repeatable.
   */
  private applyDefensivePsychologyAndTendencies(
    agents: SimAgent[],
    noiseAmp: number,
    fieldContext?: SimFieldContext
  ): string | null {
    if (noiseAmp <= 0) return null;

    const defs = agents.filter((a) => a.side === 'DEF');
    const offs = agents.filter((a) => a.side === 'OFF');
    const noiseScale = Math.min(1.0, noiseAmp);
    const tags: string[] = [];

    // 1. Sample explicit per-defender probabilityWeights if provided
    const motionAgent = offs.find((o) => o.preSnapMotion?.enabled);
    for (const def of defs) {
      const opts = def.defAssignment?.probabilityWeights;
      if (!opts || opts.length === 0) continue;
      const totalW = opts.reduce((s, o) => s + Math.max(0, o.weight), 0);
      if (totalW <= 0) continue;
      let pick = Math.random() * totalW;
      let chosen = opts[opts.length - 1];
      for (const o of opts) {
        pick -= Math.max(0, o.weight);
        if (pick <= 0) {
          chosen = o;
          break;
        }
      }
      def.defAssignment = {
        ...def.defAssignment!,
        role: chosen.role,
        targetX: chosen.targetX ?? def.defAssignment!.targetX,
        targetY: chosen.targetY ?? def.defAssignment!.targetY,
        gap: chosen.gap ?? def.defAssignment!.gap,
        stuntCrossTargetX: chosen.stuntCrossTargetX ?? def.defAssignment!.stuntCrossTargetX,
        manTargetId: chosen.manTargetId ?? def.defAssignment!.manTargetId,
      };
      if (chosen.role === 'MAN_COV' && chosen.manTargetId && motionAgent?.id === chosen.manTargetId) {
        const m = motionAgent.preSnapMotion!;
        def.x = def.startX + (m.snapX - motionAgent.startX) * 0.65;
        def.y = Math.max(1.8, def.startY);
        def.vx = m.speed * m.dirX * 0.70;
      }
    }

    // 2. Reactive Strength / Heavy-Surface Box Adjustment
    const isShortGoalLine =
      (fieldContext?.yardLineToGoal !== undefined && fieldContext.yardLineToGoal <= 7.0) ||
      defs.filter((d) => d.startY <= 2.2).length >= 7;

    let leftHeavy = 0;
    let rightHeavy = 0;
    for (const o of offs) {
      if (['TE', 'FB'].includes(o.pos) || (['LT', 'LG', 'RG', 'RT', 'T', 'G'].includes(o.pos) && Math.abs(o.startX) >= 4.0)) {
        if (o.startX < -2.2) leftHeavy++;
        else if (o.startX > 2.2) rightHeavy++;
      }
    }
    const surfaceBias = Math.sign(rightHeavy - leftHeavy);
    if (surfaceBias !== 0 && !isShortGoalLine) {
      for (const def of defs) {
        const da = def.defAssignment;
        if (!da || da.role === 'MAN_COV') continue;
        if (['MIKE', 'WILL', 'SAM', 'MLB', 'ILB', 'OLB'].includes(def.pos) || (def.pos === 'SS' && def.startY <= 6.5)) {
          const shiftX = surfaceBias * 0.45;
          def.x = Math.max(-10.0, Math.min(10.0, def.x + shiftX));
          if (['HOOK_CURL', 'READ_RUN_PASS', 'ROBBER'].includes(da.role)) {
            da.targetX += shiftX;
          }
        }
      }
    }

    // 3. Pre-Snap Motion Uncertainty (72% Trail vs 28% Man Banjo-Swap; 22% Zone Rock-and-Roll Buzz)
    if (motionAgent?.preSnapMotion?.enabled) {
      const m = motionAgent.preSnapMotion;
      const manFollower = defs.find((d) => d.defAssignment?.manTargetId === motionAgent.id);
      if (manFollower && Math.random() < 0.28 * noiseScale) {
        manFollower.x = manFollower.startX;
        manFollower.y = manFollower.startY;
        manFollower.vx = 0;
        manFollower.defAssignment = {
          ...manFollower.defAssignment!,
          role: 'CURL_FLAT',
          manTargetId: undefined,
          targetX: manFollower.startX,
          targetY: Math.max(4.5, manFollower.startY),
        };
        const swapHelper = defs.find(
          (d) =>
            d.id !== manFollower.id &&
            ['SS', 'FS', 'NI', 'CB1', 'CB2'].includes(d.pos) &&
            Math.sign(d.startX || 1) === Math.sign(m.snapX || -m.dirX || 1)
        );
        if (swapHelper?.defAssignment) {
          swapHelper.defAssignment.role = 'MAN_COV';
          swapHelper.defAssignment.manTargetId = motionAgent.id;
        }
        tags.push('MOTION_BANJO_SWAP');
      } else if (!manFollower && Math.random() < 0.22 * noiseScale) {
        const zoneSpinner = defs.find(
          (d) =>
            ['NI', 'SS', 'FS', 'OLB', 'WILL'].includes(d.pos) &&
            d.startY >= 2.0 &&
            d.startY <= 11.0 &&
            d.defAssignment &&
            !['BLITZ_A', 'CROSS_DOG', 'BLITZ_RUN_GAP'].includes(d.defAssignment.role)
        );
        if (zoneSpinner) {
          zoneSpinner.x = zoneSpinner.startX + (m.snapX - m.originX) * 0.45;
          zoneSpinner.vx = m.speed * m.dirX * 0.40;
          if (zoneSpinner.defAssignment) {
            zoneSpinner.defAssignment.targetX += Math.sign(m.dirX) * 4.5;
          }
          tags.push('ZONE_ROCK_MOTION');
        }
      }
    }

    // 4. Safety Shell Disguise & Post-Snap Rotation (keeps pre-snap tick-0 alignment disguised!)
    if (!isShortGoalLine) {
      const deepSafeties = defs.filter(
        (d) =>
          d.startY >= 7.0 &&
          d.defAssignment &&
          ['DEEP_HALF', 'QUARTERS_MATCH', 'DEEP_THIRD', 'DEEP_ZONE'].includes(d.defAssignment.role)
      );
      if (deepSafeties.length >= 2 && Math.random() < 0.26 * noiseScale) {
        const dropIdx = Math.random() < 0.5 ? 0 : 1;
        const dropper = deepSafeties[dropIdx];
        const postSafety = deepSafeties[1 - dropIdx];
        if (dropper.defAssignment && postSafety.defAssignment) {
          dropper.defAssignment.role = surfaceBias !== 0 && Math.sign(dropper.startX) === surfaceBias ? 'FORCE_ALLEY' : 'ROBBER';
          dropper.defAssignment.targetX = Math.max(-7.5, Math.min(7.5, dropper.startX * 0.65));
          dropper.defAssignment.targetY = dropper.defAssignment.role === 'FORCE_ALLEY' ? 3.5 : 5.5;
          postSafety.defAssignment.role = 'DEEP_THIRD';
          postSafety.defAssignment.targetX = 0.0;
          postSafety.defAssignment.targetY = 16.5;
          tags.push('2HIGH_SPIN_1HIGH');
        }
      } else if (deepSafeties.length === 1 && Math.random() < 0.22 * noiseScale) {
        const postSafety = deepSafeties[0];
        const offSafety = defs.find(
          (d) =>
            d.id !== postSafety.id &&
            ['SS', 'FS', 'NI'].includes(d.pos) &&
            d.startY >= 3.0 &&
            d.startY < 7.0 &&
            d.defAssignment &&
            !['BLITZ_EDGE_CRASH', 'BLITZ_A', 'CROSS_DOG'].includes(d.defAssignment.role)
        );
        if (offSafety?.defAssignment && postSafety.defAssignment) {
          const postSide = offSafety.startX >= 0 ? -1 : 1;
          postSafety.defAssignment.role = 'DEEP_HALF';
          postSafety.defAssignment.targetX = postSide * 9.5;
          postSafety.defAssignment.targetY = 13.5;
          offSafety.defAssignment.role = 'DEEP_HALF';
          offSafety.defAssignment.targetX = -postSide * 9.5;
          offSafety.defAssignment.targetY = 13.5;
          tags.push('1HIGH_INVERT_2HIGH');
        }
      }

      // 5. Simulated Pressure / Mug-and-Drop Creeper Exchange & Edge Spill vs Contain Distribution
      const boxBlitzers = defs.filter(
        (d) =>
          d.defAssignment &&
          ['BLITZ_A', 'CROSS_DOG', 'BLITZ_RUN_GAP'].includes(d.defAssignment.role) &&
          ['MIKE', 'WILL', 'SAM', 'MLB', 'ILB', 'OLB', 'NI'].includes(d.pos)
      );
      const hookLbs = defs.filter(
        (d) =>
          d.defAssignment &&
          ['HOOK_CURL', 'READ_RUN_PASS', 'CURL_FLAT'].includes(d.defAssignment.role) &&
          ['MIKE', 'WILL', 'SAM', 'MLB', 'ILB', 'OLB'].includes(d.pos)
      );
      if (boxBlitzers.length >= 1 && Math.random() < 0.16 * noiseScale) {
        const bailer = boxBlitzers[Math.floor(Math.random() * boxBlitzers.length)];
        if (bailer.defAssignment) {
          bailer.defAssignment.role = 'HOOK_CURL';
          bailer.defAssignment.stuntCrossTargetX = undefined;
          bailer.defAssignment.targetX = bailer.startX * 1.15;
          bailer.defAssignment.targetY = 5.2;
          if (hookLbs.length > 0 && hookLbs[0].defAssignment) {
            hookLbs[0].defAssignment.role = Math.random() < 0.5 ? 'BLITZ_A' : 'BLITZ_RUN_GAP';
            hookLbs[0].defAssignment.targetX = hookLbs[0].startX * 0.4;
            hookLbs[0].defAssignment.targetY = -4.0;
          }
          tags.push('SIM_PRESSURE_CREEPER');
        }
      } else if (boxBlitzers.length === 0 && hookLbs.length >= 2 && Math.random() < 0.07 * noiseScale) {
        const adder = hookLbs[Math.floor(Math.random() * hookLbs.length)];
        if (adder.defAssignment) {
          adder.defAssignment.role = Math.random() < 0.5 ? 'BLITZ_A' : 'BLITZ_RUN_GAP';
          adder.defAssignment.targetX = adder.startX >= 0 ? 0.9 : -0.9;
          adder.defAssignment.targetY = -4.2;
          tags.push('LATE_LB_PRESSURE');
        }
      }

      for (const edge of defs) {
        if (
          edge.defAssignment &&
          (edge.defAssignment.role === 'CONTAIN_EDGE' || edge.defAssignment.role === 'SPILL') &&
          Math.random() < 0.20 * noiseScale
        ) {
          edge.defAssignment.role =
            edge.defAssignment.role === 'CONTAIN_EDGE' ? 'SPILL' : 'CONTAIN_EDGE';
        }
      }
    }

    return tags.length > 0 ? tags.join('|') : null;
  }

  private stepPhysics(
    agents: SimAgent[],
    timeSec: number,
    noiseAmp: number,
    ballState: BallState,
    fieldContext?: SimFieldContext,
    maxFieldY = 35.0
  ): {
    terminated: boolean;
    reason: PlayTickSnapshot['terminationReason'];
    tackledYards: number | null;
    timeToEventSec?: number;
    compProb?: number | null;
    exoticEvent?: PlayTickSnapshot['exoticEvent'];
  } {
    // Record pre-tick engagement & velocities so EVERY unengaged frame (including early returns) obeys <= 1.46G
    const prevEngagedMap = new Map<string, string | null>();
    const preTickVelMap = new Map<string, { vx: number; vy: number }>();
    for (const a of agents) {
      prevEngagedMap.set(a.id, a.engagedWithId);
      preTickVelMap.set(a.id, { vx: a.vx, vy: a.vy });
    }
    const res = this.stepPhysicsCore(
      agents,
      timeSec,
      noiseAmp,
      ballState,
      prevEngagedMap,
      fieldContext,
      maxFieldY
    );
    this.clampUnengagedBiomechanics(agents, preTickVelMap, prevEngagedMap);
    return res;
  }

  private separateShoulderCylinders(
    agents: SimAgent[],
    maxFieldY: number,
    ballCarrier: SimAgent | null | undefined,
    deflectCarrier = true
  ): void {
    // Multi-pass shoulder-cylinder relaxation guarantees zero body-stacking across active and post-whistle ticks
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const a = agents[i];
          const b = agents[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          const minSep = a.side === b.side ? 0.68 : 0.62;
          if (d < minSep) {
            const overlap = (minSep - d) * 0.52;
            const ux = d > 1e-4 ? dx / d : i % 2 === 0 ? 1 : -1;
            const uy = d > 1e-4 ? dy / d : 0;
            a.x = Math.max(-26.2, Math.min(26.2, a.x - ux * overlap));
            a.y = Math.max(-12.0, Math.min(maxFieldY, a.y - uy * overlap));
            b.x = Math.max(-26.2, Math.min(26.2, b.x + ux * overlap));
            b.y = Math.max(-12.0, Math.min(maxFieldY, b.y + uy * overlap));

            if (deflectCarrier && pass === 0 && ballCarrier && (a.id === ballCarrier.id || b.id === ballCarrier.id)) {
              const other = a.id === ballCarrier.id ? b : a;
              const pushSign = a.id === ballCarrier.id ? -1 : 1;
              const targetBcVx = ballCarrier.vx * 0.85 + pushSign * ux * 0.8;
              const targetBcVy =
                other.side === 'DEF'
                  ? ballCarrier.vy * 0.85 + pushSign * uy * 0.7
                  : ballCarrier.vy;
              this.applyVelocityImpulse(ballCarrier, targetBcVx, targetBcVy, 14.5);
            }
          }
        }
      }
    }
  }

  private clampUnengagedBiomechanics(
    agents: SimAgent[],
    preTickVelMap: Map<string, { vx: number; vy: number }>,
    prevEngagedMap: Map<string, string | null>
  ): void {
    const maxUnengagedDv = 15.6 * this.dt; // <= 1.455G (strictly < 1.60G audit threshold)
    for (const a of agents) {
      if (a.engagedWithId || prevEngagedMap.get(a.id)) continue;
      const pre = preTickVelMap.get(a.id);
      if (!pre) continue;
      const dvx = a.vx - pre.vx;
      const dvy = a.vy - pre.vy;
      const dv = Math.hypot(dvx, dvy);
      if (dv > maxUnengagedDv) {
        const scale = maxUnengagedDv / dv;
        a.vx = pre.vx + dvx * scale;
        a.vy = pre.vy + dvy * scale;
      }
    }
  }

  private stepPhysicsCore(
    agents: SimAgent[],
    timeSec: number,
    noiseAmp: number,
    ballState: BallState,
    prevEngagedMap: Map<string, string | null>,
    fieldContext?: SimFieldContext,
    maxFieldY = 35.0
  ): {
    terminated: boolean;
    reason: PlayTickSnapshot['terminationReason'];
    tackledYards: number | null;
    timeToEventSec?: number;
    compProb?: number | null;
    exoticEvent?: PlayTickSnapshot['exoticEvent'];
  } {
    const offAgents = agents.filter((a) => a.side === 'OFF');
    const defAgents = agents.filter((a) => a.side === 'DEF');
    const qb = offAgents.find((a) => a.pos === 'QB');
    const ballCarrier = offAgents.find((a) => a.assignment.role === 'BALL_CARRIER');

    for (const a of agents) {
      // Clear active engagement flags at start of tick (re-established only if physical contact persists)
      a.engagedWithId = null;
      a.leverageScore *= 0.65;
      a.fx = 0;
      a.fy = 0;
      a.isShedding = false;
      if (a.shedCooldown && a.shedCooldown > 0) {
        a.shedCooldown = Math.max(0, a.shedCooldown - this.dt);
      }
      if (a.recoveryDelay && a.recoveryDelay > 0) {
        a.recoveryDelay = Math.max(0, a.recoveryDelay - this.dt);
      }
    }

    // Identify combo-climb partners sharing the same primary target so only ONE climbs and ONE overtakes
    const comboClimberDesignated = new Set<string>();
    const comboGroups = new Map<string, SimAgent[]>();
    for (const off of offAgents) {
      if (off.assignment.role === 'COMBO_CLIMB') {
        const tgt = this.resolveRunBlockTarget(off, defAgents, 'PRIMARY');
        if (tgt) {
          const grp = comboGroups.get(tgt.id) || [];
          grp.push(off);
          comboGroups.set(tgt.id, grp);
        }
      }
    }
    for (const [, grp] of comboGroups.entries()) {
      if (grp.length >= 2) {
        // Choose the blocker closer to the secondary LB target to be the climber; the other overtakes the DL
        const secTgt = this.resolveRunBlockTarget(grp[0], defAgents, 'SECONDARY');
        if (secTgt) {
          grp.sort(
            (a, b) =>
              Math.hypot(a.x - secTgt.x, a.y - secTgt.y) -
              Math.hypot(b.x - secTgt.x, b.y - secTgt.y)
          );
        }
        comboClimberDesignated.add(grp[0].id);
      } else if (grp.length === 1) {
        // Solo combo assignment only climbs if no down lineman is in his immediate face
        comboClimberDesignated.add(grp[0].id);
      }
    }

    // 1. Compute desired velocity vector for each Offensive player based on Assignment
    for (const off of offAgents) {
      const asg = off.assignment;
      const { maxSpeedYps } = this.getPositionalKinematics(off);
      let goalX = off.x;
      let goalY = off.y;
      let locomotionMode: 'SPRINT' | 'FOOTWORK' = 'SPRINT';
      let speedCap = maxSpeedYps;

      switch (asg.role) {
        case 'QB_DROP': {
          locomotionMode = 'FOOTWORK';
          speedCap = Math.min(maxSpeedYps * 0.78, 6.0);
          const wp =
            asg.waypoints.length > 1 && !off.playAction?.enabled
              ? this.followWaypoints(off, timeSec, speedCap)
              : asg.waypoints[0] || { x: off.startX, y: -6.0 };
          goalX = wp.x;
          goalY = wp.y;

          if (off.playAction?.enabled && timeSec < off.playAction.meshDurationSec) {
            // QB rides mesh with the fake ball carrier behind center
            const fakeCarrier = offAgents.find((a) => a.id === off.playAction!.fakeCarrierId);
            if (fakeCarrier) {
              const fakeProgress = timeSec / Math.max(0.1, off.playAction.meshDurationSec);
              goalX = off.startX + (fakeCarrier.startX - off.startX) * 0.45 * fakeProgress;
              const meshGoalY = off.startY + (fakeCarrier.startY - off.startY) * 0.35 * fakeProgress;
              if (off.startY > -3.5) {
                // Under-center play-action rapidly reverses out to full mesh depth (~-4.5y) instead of stalling behind Center
                const ucDropProgress = Math.min(
                  1.0,
                  timeSec / Math.max(0.55, off.playAction.meshDurationSec * 0.65)
                );
                goalY = Math.min(meshGoalY, off.startY - 2.9 * ucDropProgress);
                locomotionMode = 'SPRINT';
                speedCap = maxSpeedYps * 0.85;
              } else {
                goalY = meshGoalY;
              }
            }
          } else if (off.playAction?.enabled && off.playAction.isBootleg) {
            // Bootleg rollout: sprint to final boot landmark outside after mesh
            locomotionMode = 'SPRINT';
            speedCap = maxSpeedYps * 0.95;
            const bootTarget = asg.waypoints[asg.waypoints.length - 1] || wp;
            goalX = bootTarget.x;
            goalY = bootTarget.y;
          } else if (!ballCarrier && timeSec >= 1.10) {
            let nearestThreat: SimAgent | null = null;
            let minThreatDist = 3.2;
            for (const d of defAgents) {
              if (d.y < 1.5) {
                const dist = Math.hypot(d.x - off.x, d.y - off.y);
                const effDist = prevEngagedMap.get(d.id) ? dist + 0.9 : dist;
                if (effDist < minThreatDist) {
                  minThreatDist = effDist;
                  nearestThreat = d;
                }
              }
            }
            if (nearestThreat) {
              // Slide away laterally and step up into clean pocket space if edge rush is behind QB
              const awayX = off.x >= nearestThreat.x ? 0.9 : -0.9;
              const stepUpY = nearestThreat.y <= off.y + 0.8 ? 0.8 : -0.2;
              goalX = Math.max(-4.5, Math.min(4.5, wp.x + awayX));
              goalY = Math.max(-8.0, Math.min(-3.2, wp.y + stepUpY));
            }
          }
          break;
        }

        case 'PASS_SET': {
          locomotionMode = 'FOOTWORK';
          speedCap = Math.min(maxSpeedYps * 0.72, 4.6);

          // On play-action plays, linemen punch low-hat briefly (0.25s) to sell the run without conceding pass-set anchor
          if (qb?.playAction?.enabled && timeSec < 0.25) {
            locomotionMode = 'SPRINT';
            speedCap = maxSpeedYps * 0.65;
            goalX = off.startX;
            goalY = off.startY + 0.15;
            break;
          }
          const offset = GAP_X_COORDS[asg.gapOrSet] || GAP_X_COORDS.VERTICAL_DEEP;
          const posUp = off.pos.toUpperCase();
          const defaultSetDy =
            asg.gapOrSet === 'JUMP_SET'
              ? -0.95
              : ['LT', 'RT', 'T', 'OT'].includes(posUp)
              ? -3.1
              : ['LG', 'RG', 'G', 'OG'].includes(posUp)
              ? -2.2
              : -2.0;
          const setX = off.startX + offset.dx * (off.startX < 0 ? 1 : -1);
          const setY =
            off.startY +
            (asg.gapOrSet === 'VERTICAL_DEEP' || asg.gapOrSet === 'ANGLE_45' || asg.gapOrSet === 'JUMP_SET'
              ? defaultSetDy
              : offset.dy);

          const targetDef = this.resolveBlockerTarget(off, defAgents, prevEngagedMap);
          const posKickScale = ['LT', 'RT', 'T', 'OT'].includes(posUp)
            ? 1.15
            : ['C', 'OC'].includes(posUp)
            ? 0.95
            : 0.80;
          const desiredKickY = Math.max(setY, off.startY - 0.95 * posKickScale * Math.pow(timeSec, 1.45));
          if (targetDef && Math.hypot(targetDef.x - off.x, targetDef.y - off.y) < 6.8) {
            const biasShift =
              asg.leverage === 'INSIDE_OUT'
                ? -Math.sign(targetDef.x || 1) * 0.30
                : asg.leverage === 'OUTSIDE_IN'
                ? Math.sign(targetDef.x || 1) * 0.30
                : 0;
            // Mirror rusher laterally within pass-pro sector while kick-sliding to pass set depth
            const lateralIntercept =
              targetDef.x > 0
                ? Math.min(targetDef.x + biasShift, off.startX + 2.4)
                : Math.max(targetDef.x + biasShift, off.startX - 2.4);
            goalX = lateralIntercept;
            // Kick back naturally along pass-pro depth instead of stepping forward into LOS
            goalY =
              asg.gapOrSet === 'JUMP_SET'
                ? Math.min(off.startY + 0.15, Math.max(setY, targetDef.y - 0.75))
                : Math.min(off.startY - 0.15, Math.max(setY, Math.min(desiredKickY, targetDef.y - 0.85)));
          } else {
            goalX = setX;
            goalY = desiredKickY;
          }
          break;
        }

        case 'MAN_BLOCK': {
          const isPassOrPaMan = !ballCarrier || Boolean(qb?.playAction?.enabled);
          if (isPassOrPaMan) {
            locomotionMode = 'FOOTWORK';
            speedCap = Math.min(maxSpeedYps * 0.68, 4.8);
          }
          const targetDef = this.resolveRunBlockTarget(off, defAgents, 'PRIMARY');
          if (targetDef) {
            const biasShift =
              asg.leverage === 'INSIDE_OUT'
                ? -0.25
                : asg.leverage === 'OUTSIDE_IN'
                ? 0.25
                : 0;
            goalX = targetDef.x + biasShift;
            goalY = isPassOrPaMan ? Math.min(0.15, targetDef.y - 0.30) : targetDef.y - 0.30;
          }
          break;
        }

        case 'COMBO_CLIMB': {
          const primaryDef = this.resolveRunBlockTarget(off, defAgents, 'PRIMARY');
          const secondaryDef = this.resolveRunBlockTarget(off, defAgents, 'SECONDARY');
          const isDesignatedClimber = comboClimberDesignated.has(off.id);
          const climbing =
            timeSec >= asg.climbOrChipDelaySec &&
            isDesignatedClimber &&
            secondaryDef !== null;

          const targetDef = climbing ? secondaryDef : primaryDef || secondaryDef;
          if (targetDef) {
            goalX = targetDef.x + targetDef.vx * 0.20;
            goalY = targetDef.y - 0.25;
          }
          break;
        }

        case 'GAP_ZONE': {
          const gapCoord = GAP_X_COORDS[asg.gapOrSet] || GAP_X_COORDS.B_RIGHT;
          const reachDir = Math.sign(gapCoord.dx - off.startX) || (asg.leverage === 'OUTSIDE_IN' ? -1 : 1);
          const isPlayActionHinge = Boolean(qb?.playAction?.enabled);
          if (timeSec < 0.35) {
            // Lateral zone reach step (PA sells run step while keeping torso at LOS)
            goalX = off.startX + reachDir * (isPlayActionHinge ? 0.75 : 1.1);
            goalY = isPlayActionHinge ? Math.min(0.15, off.startY + 0.35) : off.startY + 0.35;
          } else {
            const nearestInSector = this.findNearestDefenderNear(
              defAgents,
              off.x + reachDir * 0.6,
              off.y + 0.6,
              2.8
            );
            if (isPlayActionHinge) {
              // Play-action hinge: anchor pass-pro wall strictly behind/at LOS (never illegal man downfield)
              if (nearestInSector) {
                goalX = nearestInSector.x + reachDir * 0.20;
                goalY = Math.min(0.45, nearestInSector.y - 0.25);
              } else {
                goalX = off.startX + reachDir * 0.45;
                goalY = Math.max(-1.05, off.startY - 0.35);
              }
            } else if (nearestInSector) {
              goalX = nearestInSector.x + reachDir * 0.25;
              goalY = nearestInSector.y - 0.20;
            } else {
              goalX = gapCoord.dx;
              goalY = off.y + 1.2;
            }
          }
          break;
        }

        case 'PULL_LEAD':
        case 'PULL_TRAP': {
          const wpTarget = this.followWaypoints(off, timeSec, maxSpeedYps * 0.92);
          // Only look to kick out / lead block once the puller clears the center/guard exchange
          const clearedTrenchExchange = timeSec > 0.45 && Math.abs(off.x - off.startX) > 1.6;
          if (clearedTrenchExchange) {
            const explicitTgt = asg.primaryTargetId
              ? defAgents.find((d) => d.id === asg.primaryTargetId)
              : null;
            // Prioritize explicit target if near, or nearest UNBLOCKED defender in the alley/hole
            let kickTarget: SimAgent | null = null;
            if (explicitTgt && Math.hypot(explicitTgt.x - off.x, explicitTgt.y - off.y) < 3.4) {
              kickTarget = explicitTgt;
            } else {
              const unblockedDefs = defAgents.filter(
                (d) => !prevEngagedMap.get(d.id) && d.y >= -1.2 && d.y <= 5.0
              );
              kickTarget = this.findNearestDefenderNear(
                unblockedDefs,
                off.x,
                off.y + 0.6,
                asg.role === 'PULL_TRAP' ? 2.6 : 3.2
              );
            }
            if (kickTarget) {
              goalX = kickTarget.x + kickTarget.vx * 0.15;
              goalY = kickTarget.y - 0.20;
            } else {
              goalX = wpTarget.x;
              goalY = wpTarget.y;
            }
          } else {
            goalX = wpTarget.x;
            goalY = wpTarget.y;
          }
          break;
        }

        case 'CHIP_RELEASE': {
          if (
            ballState.state === 'IN_FLIGHT' &&
            ballState.targetReceiverId === off.id &&
            ballState.targetX !== undefined &&
            ballState.targetY !== undefined
          ) {
            goalX = ballState.targetX;
            goalY = ballState.targetY;
          } else if (timeSec < asg.climbOrChipDelaySec) {
            const chipDef =
              defAgents.find((d) => d.id === asg.primaryTargetId) ||
              this.findNearestDefenderNear(defAgents, off.x, 0.4, 3.2);
            if (chipDef) {
              goalX = chipDef.x;
              goalY = chipDef.y - 0.2;
            }
          } else {
            const wp = this.followWaypoints(
              off,
              timeSec - asg.climbOrChipDelaySec,
              maxSpeedYps
            );
            goalX = wp.x;
            goalY = wp.y;
          }
          break;
        }

        case 'MAX_PROTECT_SCAN': {
          locomotionMode = 'FOOTWORK';

          // On play-action plays where RB is fake carrier, execute mesh run track first
          if (qb?.playAction?.enabled && off.id === qb.playAction.fakeCarrierId && timeSec < (qb.playAction.meshDurationSec ?? 1.25) + 0.20 && asg.waypoints.length > 0) {
            locomotionMode = 'SPRINT';
            const wp = this.followWaypoints(off, timeSec, maxSpeedYps * 0.85);
            goalX = wp.x;
            goalY = wp.y;
            break;
          }

          const qbRef = qb || offAgents[0];
          const coverageRoles = [
            'HOOK_CURL',
            'CURL_FLAT',
            'DEEP_ZONE',
            'DEEP_THIRD',
            'DEEP_HALF',
            'QUARTERS_MATCH',
            'ROBBER',
          ];
          const designatedMike = asg.primaryTargetId || off.designatedMikeId || qbRef.designatedMikeId;
          // Scan for unblocked rushers or declared blitzers actively attacking the pocket
          const urgentThreats = defAgents
            .filter((d) => {
              if (d.defAssignment && coverageRoles.includes(d.defAssignment.role)) return false;
              if (d.defAssignment?.role === 'MAN_COV' && d.y > 1.2) return false;
              const isDeclared = d.id === designatedMike || d.id === asg.secondaryTargetId;
              const isActiveBlitzThreat =
                d.defAssignment &&
                ['BLITZ_A', 'BLITZ_EDGE', 'BLITZ_RUN_GAP', 'CROSS_DOG', 'BLITZ_EDGE_CRASH', 'RUSH_GAP', 'CONTAIN_EDGE'].includes(
                  d.defAssignment.role
                ) &&
                Math.abs(d.x - qbRef.x) <= 6.5;
              const maxScanDepth = isDeclared || isActiveBlitzThreat ? 4.8 : 2.2;
              if (d.y > maxScanDepth || d.y < -6.5) return false;
              const isHeld = prevEngagedMap.get(d.id) && d.leverageScore < 0.18;
              return !isHeld;
            })
            .sort((a, b) => {
              // Priority 1: Declared Mike / Primary Target
              if (designatedMike) {
                if (a.id === designatedMike) return -1;
                if (b.id === designatedMike) return 1;
              }
              // Priority 2: Secondary Dual-Read Target (e.g. Will / Overhang blitzer)
              const secTgt = asg.secondaryTargetId;
              if (secTgt) {
                if (a.id === secTgt) return -1;
                if (b.id === secTgt) return 1;
              }
              return (
                Math.hypot(a.x - qbRef.x, a.y - qbRef.y) -
                Math.hypot(b.x - qbRef.x, b.y - qbRef.y)
              );
            });

          if (
            ballState.state === 'IN_FLIGHT' &&
            ballState.targetReceiverId === off.id &&
            ballState.targetX !== undefined &&
            ballState.targetY !== undefined
          ) {
            locomotionMode = 'SPRINT';
            goalX = ballState.targetX;
            goalY = ballState.targetY;
          } else if (urgentThreats.length > 0) {
            const threat = urgentThreats[0];
            speedCap = maxSpeedYps * 0.90;
            goalX = threat.x * 0.75 + qbRef.x * 0.25;
            goalY = Math.max(qbRef.y + 0.9, Math.min(-0.4, threat.y - 0.45));
          } else if (timeSec >= 1.65 && asg.waypoints.length > 0) {
            // Check-release to outlet route if no blitzers threaten the pocket
            locomotionMode = 'SPRINT';
            const wp = this.followWaypoints(off, timeSec - 1.65, maxSpeedYps);
            goalX = wp.x;
            goalY = wp.y;
          } else {
            // Hold scan depth in the pocket in front of QB without clogging the OL trench
            goalX = off.startX;
            goalY = Math.min(-2.6, qbRef.y + 1.6);
          }
          break;
        }

        case 'BALL_CARRIER': {
          // Multi-Lane Daylight Vision (Bang / Bend / Bounce) with Hysteresis
          const baseWp = this.followWaypoints(off, timeSec, maxSpeedYps);

          if (off.y > -3.6 && off.y < 6.0) {
            const candidateOffsets = [-2.4, -1.2, 0.0, 1.2, 2.4];
            let bestOffset = off.chosenLaneOffset || 0;
            let bestLaneScore = -999;

            for (const candOffset of candidateOffsets) {
              const candX = Math.max(-22.0, Math.min(22.0, baseWp.x + candOffset));
              const probeY = off.y + 1.6;
              let minUnblockedDist = 8.0;
              let minBlockedDist = 8.0;

              for (const d of defAgents) {
                if (d.y < off.y - 0.5) continue; // Ignore defenders behind the runner
                const dist = Math.hypot((d.x - candX) * 1.15, d.y - probeY);
                const isPinned = prevEngagedMap.get(d.id) && d.leverageScore < 0.20;
                if (isPinned) {
                  if (dist < minBlockedDist) minBlockedDist = dist;
                } else {
                  if (dist < minUnblockedDist) minUnblockedDist = dist;
                }
              }

              // Prefer open daylight away from unblocked defenders, with smooth continuity (hysteresis)
              const designPenalty = Math.abs(candOffset) * 0.28;
              const hysteresisPenalty = Math.abs(candOffset - (off.chosenLaneOffset || 0)) * 0.45;
              const score =
                minUnblockedDist * 1.45 +
                minBlockedDist * 0.40 -
                designPenalty -
                hysteresisPenalty;

              if (score > bestLaneScore) {
                bestLaneScore = score;
                bestOffset = candOffset;
              }
            }

            off.chosenLaneOffset =
              (off.chosenLaneOffset || 0) * 0.65 + bestOffset * 0.35;
            goalX = baseWp.x + off.chosenLaneOffset;
            goalY = Math.max(off.y + 1.5, baseWp.y);
          } else {
            goalX = baseWp.x;
            goalY = baseWp.y;
          }
          break;
        }

        case 'ROUTE': {
          // If ball is in flight toward this receiver, adjust to catch point
          if (
            ballState.state === 'IN_FLIGHT' &&
            ballState.targetReceiverId === off.id &&
            ballState.targetX !== undefined &&
            ballState.targetY !== undefined
          ) {
            goalX = ballState.targetX;
            goalY = ballState.targetY;
          } else {
            const wp = this.followWaypoints(off, timeSec, maxSpeedYps);
            goalX = wp.x;
            goalY = wp.y;
            const lastWp = asg.waypoints[asg.waypoints.length - 1];
            if (
              lastWp &&
              timeSec > 0.6 &&
              Math.hypot(wp.x - lastWp.x, wp.y - lastWp.y) < 1e-4 &&
              Math.hypot(off.x - lastWp.x, off.y - lastWp.y) <= 1.8
            ) {
              locomotionMode = 'FOOTWORK';
            }
          }
          break;
        }
      }

      // Enforce NFL 1-yard ineligible downfield buffer for OL while a run-pass option remains live
      const hasPendingOptionPass =
        !ballState.forwardPassThrown &&
        offAgents.some(
          (o) =>
            o.optionPass?.enabled &&
            !o.optionPass.decidedRun &&
            o.y <= 0.0 &&
            timeSec <= o.optionPass.decisionWindowEndSec
        );
      if (hasPendingOptionPass && ['LT', 'LG', 'C', 'RG', 'RT'].includes(off.pos)) {
        goalY = Math.min(0.85, goalY);
      }

      // 4-Minute Drill clock discipline: runner steers inside the numbers/sideline buffer
      if (asg.role === 'BALL_CARRIER' && fieldContext?.sidelineObjective === 'STAY_INBOUNDS') {
        goalX = Math.max(-21.0, Math.min(21.0, goalX));
      }

      this.steerAgentToward(off, goalX, goalY, speedCap, locomotionMode, Math.PI / 2, timeSec);
    }

    // 2. Steer Defenders (Pass Rush, Edge Contain, Reactive Zone Match, Man Cov)
    const activeSkillReceivers = offAgents.filter(
      (o) => o.assignment.role === 'ROUTE' || (o.assignment.role === 'CHIP_RELEASE' && timeSec >= o.assignment.climbOrChipDelaySec)
    );
    const runnerCrossedLos = ballCarrier ? ballCarrier.y > -0.2 : false;
    const optionPassThreatActive = Boolean(
      ballCarrier?.optionPass?.enabled &&
        !ballCarrier.optionPass.decidedRun &&
        ballCarrier.y <= -0.10 &&
        !ballState.forwardPassThrown
    );

    // Voronoi-Complete Zone Responsibility Partitioning
    const isZoneCoverageRole = (role?: string) =>
      role === 'DEEP_ZONE' ||
      role === 'DEEP_THIRD' ||
      role === 'DEEP_HALF' ||
      role === 'QUARTERS_MATCH' ||
      role === 'CURL_FLAT' ||
      role === 'HOOK_CURL' ||
      role === 'ROBBER' ||
      role === 'READ_RUN_PASS';

    const activeZoneDefenders = defAgents.filter(
      (d) => d.defAssignment && isZoneCoverageRole(d.defAssignment.role)
    );

    const receiverVoronoiOwner = new Map<string, SimAgent>();
    if (activeZoneDefenders.length > 0) {
      for (const rec of activeSkillReceivers) {
        let bestDef: SimAgent | null = null;
        let bestDistSq = Infinity;
        for (const zd of activeZoneDefenders) {
          const da = zd.defAssignment!;
          const dx = rec.x - da.targetX;
          const dy = rec.y - da.targetY;
          const distSq = dx * dx + dy * dy;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestDef = zd;
          }
        }
        if (bestDef) {
          receiverVoronoiOwner.set(rec.id, bestDef);
        }
      }
    }

    // Quarterback-half Quarters/Match key map (outside-in #1/#2 threats by hash side)
    const leftMatchRecs = activeSkillReceivers
      .filter((r) => r.x < 0)
      .sort((a, b) => a.startX - b.startX);
    const rightMatchRecs = activeSkillReceivers
      .filter((r) => r.x >= 0)
      .sort((a, b) => b.startX - a.startX);

    for (const def of defAgents) {
      const { maxSpeedYps } = this.getPositionalKinematics(def);
      const da = def.defAssignment;
      const rushCarrier = ballCarrier || qb;
      let goalX = def.x;
      let goalY = def.y;
      let defLocomotion: 'SPRINT' | 'FOOTWORK' = 'SPRINT';

      // When forward pass is in the air, coverage defenders react after realistic key/vision latency
      const elapsedPassFlight =
        ballState.state === 'IN_FLIGHT' && !ballState.isLateral
          ? timeSec - (ballState.throwTimeSec ?? timeSec)
          : -1;
      const isManRole = da?.role === 'MAN_COV';
      const passReactDelaySec = (isManRole ? 0.24 : 0.16) + (100 - def.ratings.awareness) * 0.0020;
      if (
        ballState.state === 'IN_FLIGHT' &&
        !ballState.isLateral &&
        ballState.targetX !== undefined &&
        ballState.targetY !== undefined &&
        elapsedPassFlight >= passReactDelaySec &&
        da &&
        !['RUSH_GAP', 'CONTAIN_EDGE', 'BLITZ_A', 'BLITZ_EDGE', 'BLITZ_RUN_GAP', 'CROSS_DOG', 'BLITZ_EDGE_CRASH', 'SPILL', 'FORCE_ALLEY'].includes(da.role) &&
        Math.hypot(def.x - ballState.targetX, def.y - ballState.targetY) <= 13.5
      ) {
        goalX = ballState.targetX;
        goalY = ballState.targetY;
        this.steerAgentToward(def, goalX, goalY, maxSpeedYps, 'SPRINT', -Math.PI / 2, timeSec);
        continue;
      }

      if (!da) {
        if (rushCarrier) {
          goalX = rushCarrier.x;
          goalY = rushCarrier.y;
        }
      } else if (da.role === 'RUSH_GAP' || da.role === 'BLITZ_A') {
        // True Gap-Attack Discipline: attack assigned gap/landmark first before bending on runner/QB
        const gapX = da.gap && GAP_X_COORDS[da.gap] ? GAP_X_COORDS[da.gap].dx : da.targetX;
        const isRunPlay = Boolean(ballCarrier);
        if (
          def.y > (isRunPlay ? -0.35 : 0.0) &&
          timeSec < (isRunPlay ? 0.48 : 0.32)
        ) {
          defLocomotion = 'SPRINT';
          goalX = gapX;
          goalY = isRunPlay ? -1.2 : -0.3;
        } else if (rushCarrier) {
          goalX = rushCarrier.x;
          goalY = rushCarrier.y;
        }
      } else if (da.role === 'BLITZ_RUN_GAP') {
        // Dedicated gap-shooting run blitz (e.g. Brian Flores A/B gap knife)
        // Sprints straight through the designated gap at 100% speed, completely ignoring run/pass fakes
        defLocomotion = 'SPRINT';
        if (def.y > -0.6) {
          goalX = da.targetX;
          goalY = da.targetY || -1.5;
        } else if (rushCarrier) {
          goalX = rushCarrier.x;
          goalY = rushCarrier.y;
        }
      } else if (da.role === 'CROSS_DOG') {
        // Brian Flores Double A-Gap Cross-Dog Stunt
        defLocomotion = 'SPRINT';
        const isLooper = da.stuntCrossTargetX !== undefined;
        if (isLooper && timeSec < 0.20) {
          defLocomotion = 'FOOTWORK';
          goalX = def.startX;
          goalY = def.startY;
        } else if (isLooper && def.y > -0.6) {
          goalX = da.stuntCrossTargetX ?? (da.targetX > 0 ? -0.8 : 0.8);
          goalY = -1.5;
        } else if (def.y > -0.6) {
          goalX = da.targetX;
          goalY = -1.5;
        } else if (rushCarrier) {
          goalX = rushCarrier.x;
          goalY = rushCarrier.y;
        }
      } else if (da.role === 'BLITZ_EDGE_CRASH') {
        // Edge blitzer / creeping safety crash (attack landmark first before flattening)
        defLocomotion = 'SPRINT';
        if (def.y > 0.0 && timeSec < 0.40) {
          goalX = da.targetX;
          goalY = Math.min(-0.8, da.targetY);
        } else if (rushCarrier) {
          goalX = rushCarrier.x;
          goalY = rushCarrier.y;
        }
      } else if (da.role === 'SPILL') {
        // Attack inside shoulder of pulling blocker/tight end to spill runs to perimeter
        defLocomotion = 'SPRINT';
        if (ballCarrier) {
          goalX = def.startX > 0 ? ballCarrier.x + 0.65 : ballCarrier.x - 0.65;
          goalY = Math.max(-0.6, ballCarrier.y + 0.15);
        } else if (rushCarrier) {
          goalX = rushCarrier.x;
          goalY = rushCarrier.y;
        }
      } else if (da.role === 'FORCE_ALLEY') {
        // Overhang / boundary safety playing outside-in force with closing pursuit angle on corner turns
        if (ballCarrier) {
          const dist = Math.hypot(ballCarrier.x - def.x, ballCarrier.y - def.y);
          const leadSec = Math.min(0.45, dist / 9.5);
          const projX = ballCarrier.x + ballCarrier.vx * leadSec;
          const projY = ballCarrier.y + Math.max(0, ballCarrier.vy * leadSec * 0.75);
          const isLeftSide = def.startX < 0;
          const turningCorner = ballCarrier.vy > 2.0 && Math.abs(ballCarrier.x - def.x) < 2.6;
          if (turningCorner || ballCarrier.y > def.y - 0.5) {
            goalX = projX;
            goalY = projY;
          } else {
            const margin = ballCarrier.y > 1.5 ? 1.0 : 1.7;
            goalX = isLeftSide ? projX - margin : projX + margin;
            goalY = Math.max(-0.5, projY);
          }
        } else {
          goalX = da.targetX;
          goalY = da.targetY;
        }
      } else if (da.role === 'CONTAIN_EDGE' || da.role === 'BLITZ_EDGE') {
        const isEdgePauseOnPA =
          qb?.playAction?.enabled &&
          da.role === 'BLITZ_EDGE' &&
          timeSec < 0.25 &&
          def.y > 0.2;
        if (isEdgePauseOnPA) {
          defLocomotion = 'FOOTWORK';
          goalX = def.startX * 0.9;
          goalY = Math.max(0.2, def.startY - 0.8);
        } else if (ballCarrier && ballCarrier.y < -0.8 && timeSec < 0.55) {
          // Squeeze C/D-gap outside shoulder at LOS while reading RB mesh instead of running past the tackle telepathically
          defLocomotion = 'FOOTWORK';
          goalX = def.startX * 0.92;
          goalY = -0.25;
        } else if (rushCarrier) {
          const isLeftSide = def.startX < 0;
          if (def.y > rushCarrier.y + 0.8) {
            goalX = isLeftSide
              ? Math.min(rushCarrier.x - 2.1, def.startX * 0.85)
              : Math.max(rushCarrier.x + 2.1, def.startX * 0.85);
            goalY = rushCarrier.y - 0.4;
          } else {
            goalX = rushCarrier.x;
            goalY = rushCarrier.y;
          }
        }
      } else if (da.role === 'MAN_COV' && da.manTargetId) {
        // In Man Coverage, defenders have eyes locked on their man (not the backfield mesh);
        // they only peel off to pursue the run once the runner clears the LOS (y > 0.65) or after 1.15s!
        // When a behind-LOS option pass threat is active, man defenders stay plastered on vertical eligibles.
        const peelToCarrier =
          ballCarrier &&
          (optionPassThreatActive
            ? ballCarrier.y > 0.45 || da.manTargetId === ballCarrier.id
            : ballCarrier.y > 0.65 || timeSec >= 1.15);
        if (peelToCarrier && ballCarrier) {
          const leadTime = Math.min(0.30, Math.max(0.05, Math.hypot(def.x - ballCarrier.x, def.y - ballCarrier.y) / 9.0));
          goalX = ballCarrier.x + ballCarrier.vx * leadTime;
          goalY = ballCarrier.y + Math.max(0, ballCarrier.vy * leadTime);
        } else {
          const rec = offAgents.find((o) => o.id === da.manTargetId);
          if (rec) {
            // Check if the assigned man target is staying in to block behind the LOS
            const isTargetBlockingInBackfield =
              rec.y <= 0.4 &&
              ['PASS_SET', 'MAX_PROTECT_SCAN', 'MAN_BLOCK', 'COMBO_CLIMB', 'GAP_ZONE', 'PULL_LEAD', 'PULL_TRAP'].includes(
                rec.assignment.role
              );
            if (isTargetBlockingInBackfield) {
              // Do NOT sprint into the offensive line pile!
              // Hold low-hole / robber read depth (+2.2y) mirroring the RB/TE laterally in case of delayed release
              defLocomotion = 'FOOTWORK';
              goalX = rec.x;
              goalY = Math.max(2.0, Math.min(3.5, def.startY * 0.75));
            } else {
              // Man-to-man coverage: press jam at LOS vs off-man pedal/cushion (never sprint blindly downhill past verticals)
              const leverageOffset = rec.x > 0 ? -0.22 : 0.22;
              const initialCushion = def.startY - rec.startY;
              const breakLagX =
                Math.abs(rec.vx) > 3.2 && rec.y > 2.0 ? -Math.sign(rec.vx) * 0.08 : 0;

              if (initialCushion <= 1.65 && timeSec < 0.25) {
                defLocomotion = 'FOOTWORK';
                goalX = rec.x + leverageOffset + breakLagX;
                goalY = Math.max(def.startY - 0.05, rec.y + 0.55);
              } else if (initialCushion > 1.65 && def.y - rec.y > 2.80 && rec.y < 1.8) {
                // Off-man cushion pedal upfield (+vy) maintaining dynamic cushion before phase-turn
                defLocomotion = 'FOOTWORK';
                goalX = rec.x + leverageOffset + breakLagX;
                goalY = Math.max(def.y + 0.10, rec.y + 1.85 + Math.max(0, rec.vy) * 0.10);
              } else {
                // Phase-turn hip-to-hip carry with top leverage on vertical/breaking routes
                defLocomotion = 'SPRINT';
                goalX = rec.x + rec.vx * 0.16 + leverageOffset + breakLagX;
                goalY =
                  rec.vy >= 1.5
                    ? Math.max(def.y - 0.10, rec.y + rec.vy * 0.16 + 0.35)
                    : rec.y + 0.30;
              }
            }
          } else {
            goalX = da.targetX;
            goalY = da.targetY;
          }
        }
      } else {
        // Reactive Zone Coverage & Dynamic Run Fits (including READ_RUN_PASS)
        const isReadingLB = da.role === 'READ_RUN_PASS' || ['HOOK_CURL', 'CURL_FLAT', 'ROBBER'].includes(da.role);
        const isPA = Boolean(qb?.playAction?.enabled);
        const inPAMesh = isPA && timeSec < (qb?.playAction?.meshDurationSec ?? 1.25);
        const inPARecovery =
          isPA &&
          timeSec >= (qb?.playAction?.meshDurationSec ?? 1.25) &&
          timeSec < (qb?.playAction?.meshDurationSec ?? 1.25) + 0.5;
        const isZoneOrDbCoverage =
          ['CB', 'CB1', 'CB2', 'NI', 'NCB', 'DB', 'FS', 'SS'].includes(def.pos) ||
          (isZoneCoverageRole(da.role) && da.role !== 'READ_RUN_PASS');
        const isDownLinemanRunKey =
          def.startY <= 1.2 && ['DE', 'DT', 'NT', 'EDGE', 'LOLB', 'ROLB'].includes(def.pos);

        if (ballCarrier && !(optionPassThreatActive && isZoneOrDbCoverage)) {
          const isBoxDefender = def.startY <= 5.2;
          const isDeepSafety = def.startY > 5.2;

          if (timeSec < (isDownLinemanRunKey ? 0.05 : 0.25)) {
            defLocomotion = 'FOOTWORK';
            goalX = da.targetX;
            goalY = da.targetY;
          } else if (isBoxDefender) {
            const leadSec = runnerCrossedLos ? 0.15 : 0.22;
            goalX = ballCarrier.x + ballCarrier.vx * leadSec;
            goalY = runnerCrossedLos
              ? ballCarrier.y + Math.max(-0.2, ballCarrier.vy * 0.12)
              : Math.max(0.2, ballCarrier.y + ballCarrier.vy * leadSec);
          } else if (isDeepSafety) {
            const leadTime = Math.min(0.35, Math.max(0.08, (def.y - ballCarrier.y) / 8.5));
            goalX = ballCarrier.x + ballCarrier.vx * leadTime;
            goalY = ballCarrier.y + Math.max(0, ballCarrier.vy * leadTime);
          } else {
            goalX = da.targetX;
            goalY = da.targetY;
          }
        } else if (inPAMesh && isReadingLB) {
          // Play-Action Mesh: Reading LBs BITE downhill on the low-hat run fake!
          // Take 1-2 aggressive false steps (+1.5y forward toward LOS)
          defLocomotion = 'SPRINT';
          const fakeX = qb?.playAction?.fakeGap ? GAP_X_COORDS[qb.playAction.fakeGap]?.dx ?? 0 : 0;
          goalX = def.startX * 0.7 + fakeX * 0.3;
          goalY = Math.max(1.2, def.startY - 1.8);
        } else if (inPARecovery && isReadingLB) {
          // Play-Action Recovery: QB pulled the ball, LB frantic hip flip & pedal to zone landmark
          defLocomotion = 'FOOTWORK';
          goalX = da.targetX;
          goalY = da.targetY;
        } else {
          // Pass Play: Match-Quarters Rules & Seam-Aware Zone Coverage
          const cellThreats = activeSkillReceivers.filter(
            (r) => receiverVoronoiOwner.get(r.id) === def
          );

          if (da.role === 'QUARTERS_MATCH' && timeSec >= 0.25) {
            const sideRecs = def.startX < 0 ? leftMatchRecs : rightMatchRecs;
            const r1 = sideRecs[0];
            const r2 = sideRecs[1];
            const isOutsideCorner = Math.abs(def.startX) >= 10.5;

            if (isOutsideCorner && r1) {
              // MOD/MEG Quarters CB: match #1 vertically on vertical stem or rally with outside leverage
              const isVert1 = r1.y > 4.0 || r1.vy > 2.2;
              defLocomotion = isVert1 ? 'SPRINT' : 'FOOTWORK';
              goalX = r1.x + (r1.x >= 0 ? 0.35 : -0.35);
              goalY = Math.max(def.y - 0.15, r1.y + 0.90 + Math.max(0, r1.vy) * 0.12);
            } else if (!isOutsideCorner) {
              // Quarters Safety: match #2 vertically if #2 pushes seam > 4.2y; else rob/bracket #1 Dig/Post inside!
              const r2Vert = r2 && (r2.y > 4.2 || r2.vy > 2.0) && Math.abs(r2.x - def.startX) < 11.5;
              if (r2Vert && r2) {
                defLocomotion = r2.vy > 2.0 ? 'SPRINT' : 'FOOTWORK';
                goalX = r2.x + (r2.x >= 0 ? -0.35 : 0.35);
                goalY = Math.max(def.y - 0.20, r2.y + 1.15);
              } else if (r1 && Math.abs(r1.x) < 12.5 && r1.y > 5.0) {
                defLocomotion = 'SPRINT';
                goalX = r1.x + (r1.x >= 0 ? -0.4 : 0.4);
                goalY = Math.max(10.0, r1.y + 0.85);
              } else {
                defLocomotion = 'FOOTWORK';
                goalX = da.targetX;
                goalY = Math.min(13.5, da.targetY);
              }
            } else {
              defLocomotion = 'FOOTWORK';
              goalX = da.targetX;
              goalY = da.targetY;
            }
          } else if (timeSec < 0.25) {
            // Initial key read & pedal toward zone landmark
            defLocomotion = 'FOOTWORK';
            goalX = da.targetX;
            goalY = da.targetY;
          } else if (cellThreats.length > 0) {
            // Match and squeeze threat(s) partitioned into this defender's Voronoi cell
            if (cellThreats.length === 1) {
              const matchedThreat = cellThreats[0];
              const isDeep = da.role.includes('DEEP') || da.role === 'QUARTERS_MATCH';

              if (isDeep) {
                // Deep zone leverage: protect deep landmark roof first; never charge downhill toward shallow stems
                const verticalPush = matchedThreat.vy > 1.5 || matchedThreat.y > def.y - 4.0;
                defLocomotion = verticalPush ? 'SPRINT' : 'FOOTWORK';
                goalX =
                  matchedThreat.y > 4.0
                    ? matchedThreat.x + (matchedThreat.x > def.x ? 0.25 : -0.25)
                    : da.targetX * 0.5 + matchedThreat.x * 0.5;
                const roofFloor =
                  matchedThreat.y >= 4.0
                    ? Math.min(da.targetY - 2.0, 11.5)
                    : Math.min(da.targetY, def.startY + 3.5);
                goalY = Math.max(roofFloor, matchedThreat.y + 0.90);
              } else if (da.role === 'CURL_FLAT') {
                // Sink-funnel under #1 vertical up to ~10.5y in Cover-2/Cloud unless flat route threatens outside
                const dist = Math.hypot(matchedThreat.x - def.x, matchedThreat.y - def.y);
                defLocomotion = dist > 1.2 ? 'SPRINT' : 'FOOTWORK';
                const maxSinkY = def.pos === 'CB' ? 10.8 : 9.2;
                goalX = matchedThreat.x + (matchedThreat.x >= 0 ? 0.35 : -0.35);
                goalY = Math.min(maxSinkY, Math.max(da.targetY, matchedThreat.y + 0.30));
              } else if (da.role === 'HOOK_CURL') {
                // Wall crossers & carry Tampa-2 / middle seam threats to 11-14y intermediate depth
                const dist = Math.hypot(matchedThreat.x - def.x, matchedThreat.y - def.y);
                defLocomotion = dist > 1.2 ? 'SPRINT' : 'FOOTWORK';
                goalX = matchedThreat.x + (matchedThreat.x >= 0 ? -0.30 : 0.30);
                goalY = Math.min(14.0, Math.max(da.targetY, matchedThreat.y + 0.35));
              } else {
                // ROBBER / READ_RUN_PASS direct mirror
                const dist = Math.hypot(matchedThreat.x - def.x, matchedThreat.y - def.y);
                defLocomotion = dist > 1.2 ? 'SPRINT' : 'FOOTWORK';
                goalX = matchedThreat.x;
                goalY = matchedThreat.y + 0.3;
              }
            } else {
              // Multiple threats in Voronoi cell (e.g. Smash, Flood, Mills, Dagger)
              cellThreats.sort((a, b) => b.y - a.y);
              const deepThreat = cellThreats[0];
              const shallowThreat = cellThreats[1];
              const isDeep = da.role.includes('DEEP') || da.role === 'QUARTERS_MATCH';

              if (isDeep) {
                // Stay over the top of the deepest route, shading between hi-lo threats
                defLocomotion = 'SPRINT';
                goalX = deepThreat.x * 0.72 + shallowThreat.x * 0.28;
                goalY = Math.max(deepThreat.y + 1.05, Math.min(da.targetY, deepThreat.y + 2.2));
              } else {
                // Underneath defender sinks underneath the deeper seam/dig while keeping vision on shallow route
                const maxUnderY = da.role === 'HOOK_CURL' ? 13.5 : 10.2;
                defLocomotion = 'SPRINT';
                goalX = shallowThreat.x * 0.32 + deepThreat.x * 0.68;
                goalY = Math.min(maxUnderY, shallowThreat.y * 0.25 + deepThreat.y * 0.75);
              }
            }
          } else {
            // Zone cell clear: expand/rob adjacent seam or intermediate crosser within 10.5y (closes Cover 2/3 dig void)
            let nearThreat: SimAgent | null = null;
            let nearDist = 10.5;
            for (const rec of activeSkillReceivers) {
              const d = Math.hypot(rec.x - def.x, rec.y - def.y);
              if (d < nearDist) {
                nearDist = d;
                nearThreat = rec;
              }
            }

            if (nearThreat && timeSec >= 0.30) {
              defLocomotion = nearDist > 1.5 ? 'SPRINT' : 'FOOTWORK';
              const weightNear = da.role.includes('DEEP') ? 0.72 : 0.78;
              goalX = da.targetX * (1 - weightNear) + nearThreat.x * weightNear;
              const seamCeiling = da.role === 'HOOK_CURL' ? 13.4 : da.role === 'CURL_FLAT' ? 10.2 : 22.0;
              goalY = Math.min(seamCeiling, da.targetY * (1 - weightNear) + (nearThreat.y + 0.30) * weightNear);
            } else {
              // Settle at Voronoi landmark reading the quarterback
              defLocomotion = 'FOOTWORK';
              const qbRef = qb || offAgents[0];
              if (qbRef) {
                goalX = da.targetX + (qbRef.x - da.targetX) * 0.15;
                goalY = da.targetY + (qbRef.y - da.targetY) * 0.08;
              } else {
                goalX = da.targetX;
                goalY = da.targetY;
              }
            }
          }
        }
      }

      this.steerAgentToward(def, goalX, goalY, maxSpeedYps, defLocomotion, -Math.PI / 2, timeSec);
    }

    // 3. Resolve Trench & Open-Field Blocking Contact Impulses with Shed Dynamics
    const blockerRoles: BlockRoleType[] = [
      'PASS_SET',
      'MAN_BLOCK',
      'GAP_ZONE',
      'COMBO_CLIMB',
      'PULL_LEAD',
      'PULL_TRAP',
      'CHIP_RELEASE',
      'MAX_PROTECT_SCAN',
    ];

    const defenderBlockerCount = new Map<string, SimAgent[]>();

    for (const off of offAgents) {
      if (!blockerRoles.includes(off.assignment.role)) continue;
      if (
        off.assignment.role === 'CHIP_RELEASE' &&
        timeSec >= off.assignment.climbOrChipDelaySec
      ) {
        continue;
      }
      if (
        off.assignment.role === 'MAX_PROTECT_SCAN' &&
        timeSec >= 1.65 &&
        off.assignment.waypoints.length > 0 &&
        off.y > -1.0
      ) {
        continue;
      }
      if (off.recoveryDelay && off.recoveryDelay > 0) {
        continue; // Blocker recovering from shed move cannot instantly latch back on
      }

      let targetDef: SimAgent | null = null;
      if (off.assignment.role === 'PASS_SET') {
        targetDef = this.resolveBlockerTarget(off, defAgents, prevEngagedMap);
      } else if (off.assignment.role === 'COMBO_CLIMB') {
        const isClimber = comboClimberDesignated.has(off.id);
        const climbing = timeSec >= off.assignment.climbOrChipDelaySec && isClimber;
        targetDef = this.resolveRunBlockTarget(
          off,
          defAgents,
          climbing ? 'SECONDARY' : 'PRIMARY'
        );
      } else if (off.assignment.role === 'MAN_BLOCK') {
        targetDef = this.resolveRunBlockTarget(off, defAgents, 'PRIMARY');
      } else if (off.assignment.primaryTargetId) {
        targetDef = defAgents.find((d) => d.id === off.assignment.primaryTargetId) || null;
      }

      let closestDef: SimAgent | null = null;
      const isPass = off.assignment.role === 'PASS_SET' || off.assignment.role === 'MAX_PROTECT_SCAN';
      const reachRadius = isPass ? 1.22 : 1.28;

      if (targetDef && Math.hypot(targetDef.x - off.x, targetDef.y - off.y) <= reachRadius) {
        closestDef = targetDef;
      } else {
        const coverageRoles = [
          'HOOK_CURL',
          'CURL_FLAT',
          'DEEP_ZONE',
          'DEEP_THIRD',
          'DEEP_HALF',
          'QUARTERS_MATCH',
          'ROBBER',
        ];
        let minDist = 1.25;
        for (const def of defAgents) {
          if (isPass && def.defAssignment && coverageRoles.includes(def.defAssignment.role)) continue;
          if (isPass && def.defAssignment?.role === 'MAN_COV' && def.y > 1.2) continue;
          const d = Math.hypot(def.x - off.x, def.y - off.y);
          if (d < minDist) {
            minDist = d;
            closestDef = def;
          }
        }
      }

      if (closestDef) {
        const list = defenderBlockerCount.get(closestDef.id) || [];
        list.push(off);
        defenderBlockerCount.set(closestDef.id, list);
      }
    }

    // Apply pairwise, double-team (Combo), and SHED dynamics
    for (const [defId, blockers] of defenderBlockerCount.entries()) {
      const def = defAgents.find((d) => d.id === defId);
      if (!def) continue;

      const isComboDouble = blockers.length >= 2;
      const comboBonus = isComboDouble ? 1.28 : 1.0;

      // Maintain continuous engagement timer only if defender was engaged last tick
      if (prevEngagedMap.get(def.id)) {
        def.engagedDuration = (def.engagedDuration || 0) + this.dt;
      } else {
        def.engagedDuration = this.dt;
      }

      for (const blk of blockers) {
        const dx = def.x - blk.x;
        const dy = def.y - blk.y;
        const dist = Math.max(0.25, Math.hypot(dx, dy));
        const nx = dx / dist;
        const ny = dy / dist;

        let hatBonus = 0;
        const isPassBlock =
          blk.assignment.role === 'PASS_SET' ||
          blk.assignment.role === 'MAX_PROTECT_SCAN' ||
          (blk.assignment.role === 'CHIP_RELEASE' && !ballCarrier) ||
          (blk.assignment.role === 'GAP_ZONE' && Boolean(qb?.playAction?.enabled)) ||
          (blk.assignment.role === 'MAN_BLOCK' && (!ballCarrier || Boolean(qb?.playAction?.enabled)));

        if (blk.assignment.leverage === 'INSIDE_OUT' && Math.abs(blk.x) < Math.abs(def.x)) {
          hatBonus = isPassBlock ? 0.04 : 0.11;
        } else if (
          blk.assignment.leverage === 'OUTSIDE_IN' &&
          Math.abs(blk.x) > Math.abs(def.x)
        ) {
          hatBonus = isPassBlock ? 0.04 : 0.11;
        } else if (blk.assignment.role === 'PULL_TRAP' || blk.assignment.role === 'PULL_LEAD') {
          hatBonus = 0.22;
        }

        const blkRep = blk.repBonus || 0;
        const defRep = def.repBonus || 0;
        const isPerimeterStalk = ['WR', 'SL'].includes(blk.pos) && blk.blockRating === undefined;
        const effBlockPwr = blk.blockRating !== undefined ? blk.blockRating : blk.ratings.power;
        const offBase = isPerimeterStalk
          ? blk.ratings.finesse * 0.65 + effBlockPwr * 0.35
          : effBlockPwr * 0.58 + blk.ratings.finesse * 0.42;

        // Biomechanical & Positional Blocking Mismatch Physics:
        // Pure QBs (pos === 'QB' or blockRating < 58) lack pad level, mass (215-232 lbs vs 270-lb DE),
        // and punch technique to block DL/Edge rushers or downhill LBs 1v1!
        const isQbBlocker = blk.pos === 'QB' || (blk.blockRating !== undefined && blk.blockRating < 58);
        const isDlOrEdgeDef = ['DT', 'NT', 'DE', 'EDGE'].includes(def.pos);
        const isLbDef = ['MLB', 'ILB', 'MIKE', 'WILL', 'SAM', 'OLB'].includes(def.pos);
        let positionalMismatchPenalty = 0;
        if (isQbBlocker) {
          if (isDlOrEdgeDef) {
            positionalMismatchPenalty = -42; // Suicidal 1v1 QB-on-DE/DL block: immediate ragdoll collapse
          } else if (isLbDef) {
            positionalMismatchPenalty = -28; // Severe mismatch vs downhill LB
          } else {
            positionalMismatchPenalty = -12; // Stalking DB in space
          }
        } else if (['WR', 'SL'].includes(blk.pos) && isDlOrEdgeDef && effBlockPwr < 80) {
          // Standard WR (as opposed to a 240-lb TE/H-Back hybrid with blockRating >= 80) vs 270-lb DE
          positionalMismatchPenalty = -22;
        } else if (['WR', 'SL'].includes(blk.pos) && isLbDef && effBlockPwr < 72 && !isComboDouble) {
          positionalMismatchPenalty = -8;
        } else if (blk.pos === 'TE' && isDlOrEdgeDef && effBlockPwr < 82 && !isComboDouble) {
          // Move TEs under 82 blockRating struggle 1v1 against 270-310lb DL/Edge
          positionalMismatchPenalty = -Math.round((84 - effBlockPwr) * 0.40);
        }

        const offScore = (offBase + positionalMismatchPenalty + blkRep) * comboBonus * (1 + hatBonus);
        const defScore = def.ratings.power * 0.55 + def.ratings.finesse * 0.45 + defRep;
        const tickNoise = noiseAmp > 0 ? (Math.random() - 0.5) * noiseAmp * 14 : 0;

        const rushRatingBias = isPassBlock && !isComboDouble ? -3.5 : 0;
        const netAdv = Math.max(
          -1,
          Math.min(1, (offScore - defScore + rushRatingBias + tickNoise) / 32)
        );

        blk.engagedWithId = def.id;
        def.engagedWithId = blk.id;
        blk.leverageScore = +netAdv.toFixed(2);
        def.leverageScore = +(-netAdv).toFixed(2);

        // ---------------------------------------------------------------------
        // SHEDDING DYNAMICS (Swim / Rip / Bull Disengagement)
        // Calibrated to empirical NFL pocket sustain (~2.35s base pass / ~1.15s run)
        // with finite late pass-rush double-team split (~1.80s) so 3-4 man rushes still converge
        // ---------------------------------------------------------------------
        const rawBaseShedTime = isPassBlock ? 1.06 : 1.15;
        const baseShedTime =
          isQbBlocker && isDlOrEdgeDef
            ? 0.16
            : isQbBlocker && isLbDef
            ? 0.32
            : rawBaseShedTime;
        const leverageAccel = Math.max(0.32, 1.0 - Math.max(0, def.leverageScore) * 0.65);
        const shedDurationThreshold =
          (baseShedTime + ((100 - def.ratings.finesse) / 100) * (isPassBlock ? 0.56 : 0.40)) *
          leverageAccel;
        const singleShed =
          !isComboDouble &&
          def.leverageScore >= (isPassBlock ? 0.08 : 0.05) &&
          (def.engagedDuration || 0) >= shedDurationThreshold;
        const lateDoubleTeamShed =
          isComboDouble &&
          isPassBlock &&
          def.leverageScore >= 0.0 &&
          (def.engagedDuration || 0) >= 1.80;
        const canShed =
          (!def.shedCooldown || def.shedCooldown === 0) && (singleShed || lateDoubleTeamShed);

        if (canShed) {
          blk.engagedWithId = null;
          def.engagedWithId = null;
          def.engagedDuration = 0;
          def.shedCooldown = 0.85;
          blk.recoveryDelay = isQbBlocker ? 0.85 : 0.45;
          def.isShedding = true;

          const targetCarrier = ballCarrier || qb;
          const slipSign =
            targetCarrier && Math.abs(targetCarrier.x - blk.x) > 0.4
              ? Math.sign(targetCarrier.x - blk.x)
              : def.x >= blk.x
              ? 1
              : -1;
          const shedLateral = slipSign * 2.5;
          const shedVy = isPassBlock ? -3.4 : targetCarrier && targetCarrier.y > def.y ? 2.8 : -3.2;
          this.applyVelocityImpulse(def, shedLateral, shedVy, 16.0);

          def.fx = shedLateral * 1.5;
          def.fy = shedVy;
          blk.fx = -shedLateral * 0.8;
          blk.fy = -shedVy * 0.5;
          continue;
        }

        // PULL/TRAP MOMENTUM TRANSFER: pulling blocker kicks out defender ONLY if blocker wins leverage!
        if (
          (blk.assignment.role === 'PULL_TRAP' || blk.assignment.role === 'PULL_LEAD') &&
          !isQbBlocker &&
          netAdv >= 0.04 &&
          Math.hypot(blk.vx, blk.vy) > 2.5
        ) {
          const isForceOrSpill =
            def.defAssignment?.role === 'SPILL' || def.defAssignment?.role === 'FORCE_ALLEY';
          const kickScale = Math.max(
            0.30,
            Math.min(0.85, (0.58 + netAdv * 0.40) * (isForceOrSpill ? 0.78 : 1.0))
          );
          const targetDefVx = blk.vx * 0.58 * kickScale + nx * 1.25 * kickScale;
          const targetDefVy = blk.vy * 0.58 * kickScale + ny * 1.25 * kickScale;
          def.vx = targetDefVx;
          def.vy = targetDefVy;
          blk.vx *= 0.58;
          blk.vy *= 0.58;
          def.leverageScore = +(-0.48 * kickScale).toFixed(2);
          blk.leverageScore = +(0.48 * kickScale).toFixed(2);
          continue;
        }

        if (isPassBlock) {
          // -------------------------------------------------------------------
          // PASS PROTECTION POCKET ANCHOR VS BULL-RUSH COMPRESSION
          // Never drive pass rushers +1.5y downfield illegally; anchor or give pocket ground!
          // Direct pad-collision momentum transfer applies while blk.engagedWithId !== null.
          // -------------------------------------------------------------------
          const qbRef = qb || offAgents[0];
          const toQbX = qbRef.x - def.x;
          const toQbY = qbRef.y - def.y;
          const toQbLen = Math.max(0.5, Math.hypot(toQbX, toQbY));
          const qx = toQbX / toQbLen;
          const qy = toQbY / toQbLen; // Negative (-Y), pointing into pocket
          const washSign = def.x >= qbRef.x ? 1 : -1;

          const posUp = blk.pos.toUpperCase();
          const anchorY =
            blk.startY +
            (blk.assignment.gapOrSet === 'JUMP_SET'
              ? -0.95
              : ['LT', 'RT', 'T', 'OT'].includes(posUp)
              ? -3.2
              : -2.35);
          const depthRem = Math.max(0, blk.y - anchorY);

          if (netAdv >= 0) {
            const kickSinkY =
              depthRem > 0.15
                ? -Math.min(1.65, 0.55 + depthRem * 0.55)
                : -0.35 * (1.0 - netAdv * 0.55);
            const washVx = washSign * (0.45 + 0.65 * netAdv);
            def.vx = def.vx * 0.25 + washVx;
            def.vy = def.vy * 0.25 + kickSinkY;
            blk.vx = def.vx * 0.90;
            blk.vy = def.vy * 0.90;
          } else {
            const bullSpeed = Math.max(
              depthRem > 0.20 ? 0.95 : 0.65,
              0.85 + 1.55 * Math.abs(netAdv)
            );
            def.vx = def.vx * 0.25 + qx * bullSpeed;
            def.vy = def.vy * 0.25 + qy * bullSpeed;
            blk.vx = def.vx * 0.92;
            blk.vy = def.vy * 0.92;
          }

          // Keep physical chest-to-chest standoff between blocker and rusher
          const targetStandoff = 0.72;
          if (dist < targetStandoff) {
            const corr = (targetStandoff - dist) * 0.4;
            blk.x -= nx * corr;
            blk.y -= ny * corr;
            def.x += nx * corr;
            def.y += ny * corr;
          }

          blk.fx = nx * (0.6 + netAdv);
          blk.fy = ny * (0.6 + netAdv);
          def.fx = -blk.fx;
          def.fy = -blk.fy;
        } else {
          // -------------------------------------------------------------------
          // RUN BLOCKING DRIVE & LATERAL ZONE SEAL TORQUE
          // -------------------------------------------------------------------
          const pushRate = 1.48 * netAdv;
          let reachTorqueX = 0;
          if (blk.assignment.role === 'GAP_ZONE') {
            const gapCoord = GAP_X_COORDS[blk.assignment.gapOrSet] || GAP_X_COORDS.B_RIGHT;
            const reachDir = Math.sign(gapCoord.dx - blk.startX) || 1;
            reachTorqueX = reachDir * 0.85 * Math.max(0.1, 0.55 + netAdv);
          }

          def.vx = def.vx * 0.25 + nx * pushRate + reachTorqueX;
          def.vy = def.vy * 0.25 + ny * pushRate;
          blk.vx = blk.vx * 0.25 + nx * Math.max(-1.0, pushRate * 0.78) + reachTorqueX;
          blk.vy = blk.vy * 0.25 + ny * Math.max(-1.0, pushRate * 0.78);

          blk.fx = nx * (0.8 + netAdv);
          blk.fy = ny * (0.8 + netAdv);
          def.fx = -blk.fx;
          def.fy = -blk.fy;
        }
      }
    }

    // Reset engagedDuration for defenders who are no longer engaged with any blocker
    for (const d of defAgents) {
      if (!d.engagedWithId) {
        d.engagedDuration = 0;
      }
    }

    // 4. Explicit Euler Position Integration with Biomechanical Bound Limits
    for (const a of agents) {
      a.x = Math.max(-26.2, Math.min(26.2, a.x + a.vx * this.dt));
      a.y = Math.max(-12.0, Math.min(maxFieldY, a.y + a.vy * this.dt));
    }

    // 5. Universal Shoulder-Cylinder Collision Separation (Multi-pass relaxation prevents multi-body stacking)
    this.separateShoulderCylinders(agents, maxFieldY, ballCarrier, true);

    // Strict NFL 1.0-yard Ineligible Receiver Downfield coaching buffer for OL while an option-pass threat is live
    if (
      !ballState.forwardPassThrown &&
      offAgents.some((o) => o.optionPass?.enabled && !o.optionPass.decidedRun && o.y <= 0.0)
    ) {
      for (const ol of offAgents) {
        if (['LT', 'LG', 'C', 'RG', 'RT'].includes(ol.pos) && ol.y > 0.85) {
          ol.y = 0.85;
          if (ol.vy > 0) ol.vy = 0;
        }
      }
    }

    // 6. Update Ball Position & Check Play Termination (Sacks, Pass Flight, Laterals, Option Passes & Tackles)
    if (ballState.state === 'IN_FLIGHT') {
      const elapsedFlight = timeSec - (ballState.throwTimeSec || timeSec);
      const totalFlight = ballState.flightDurationSec || 0.35;
      const u = Math.max(0, Math.min(1, elapsedFlight / totalFlight));

      const passerRef =
        offAgents.find((o) => o.id === ballState.passerId) || qb || offAgents[0];
      const lx = ballState.launchX ?? passerRef.x;
      const ly = ballState.launchY ?? passerRef.y;
      const tx = ballState.targetX ?? lx;
      const ty = ballState.targetY ?? ly + 8.0;

      ballState.x = lx + (tx - lx) * u;
      ballState.y = ly + (ty - ly) * u;
      const arcScale = ballState.isLateral ? 0.05 : 0.14;
      const apexZ = (ballState.isLateral ? 1.65 : 2.0) + Math.hypot(tx - lx, ty - ly) * arcScale;
      ballState.z = 1.9 * (1 - u) + 1.5 * u + 4.0 * (apexZ - 1.7) * u * (1 - u);

      if (u >= 1.0) {
        const targetRec =
          offAgents.find((o) => o.id === ballState.targetReceiverId) || offAgents[0];
        let minDbDist = 12.0;
        let nearestDef: SimAgent | null = null;
        for (const d of defAgents) {
          const dDist = Math.hypot(d.x - targetRec.x, d.y - targetRec.y);
          if (dDist < minDbDist) {
            minDbDist = dDist;
            nearestDef = d;
          }
        }

        if (ballState.isLateral) {
          // Honest NFL Lateral / Pitch Exchange Physics:
          // A backward pass that hits the turf is NEVER an incomplete dead ball — it is a LIVE FREE BALL (FUMBLE)!
          const latDist = Math.hypot(tx - lx, ty - ly);
          const isDownfieldLateral = ly >= -0.2;
          let pitchProb: number;
          if (isDownfieldLateral) {
            // Downfield Catch-Pitch / Hook-and-Lateral:
            // In traffic (<2.4y separation), turnaround downfield laterals have a ruinous 20%-42% live-ball fumble rate!
            // Only when rehearsed and pitched to an uncovered trailer (>=3.2y separation) does muff risk drop to ~3.8%-5.2%.
            const distRisk = Math.max(0, latDist - 3.2) * 0.009;
            const trafficRisk =
              minDbDist < 1.50 ? 0.36 : minDbDist < 2.40 ? 0.21 : minDbDist < 3.20 ? 0.085 : 0.0;
            const baseMuffRate = 0.036 + distRisk + trafficRisk;
            pitchProb = Math.max(0.40, Math.min(0.958, 1.0 - baseMuffRate));
          } else {
            // Rehearsed Behind-LOS Backfield Toss / Lateral Screen
            const distRisk = Math.max(0, latDist - 2.8) * 0.0055;
            const trafficRisk =
              minDbDist < 0.95 ? 0.28 : minDbDist < 1.65 ? 0.11 : minDbDist < 2.40 ? 0.035 : 0.0;
            const baseMuffRate = 0.018 + distRisk + trafficRisk; // ~2.2% short clean toss, ~5.5% wide lateral screen
            pitchProb = Math.max(0.55, Math.min(0.982, 1.0 - baseMuffRate));
          }

          const roll = noiseAmp > 0 ? Math.random() : 0.35;
          if (roll < pitchProb) {
            ballState.state = 'HELD';
            ballState.isLateral = false;
            ballState.carrierId = targetRec.id;
            ballState.x = targetRec.x;
            ballState.y = targetRec.y;
            ballState.z = 1.4;
            ballState.lateralCount = (ballState.lateralCount || 0) + 1;

            targetRec.assignment.role = 'BALL_CARRIER';
            targetRec.caughtAtTimeSec = timeSec;
            targetRec.tackleContactTicks = 0;
            targetRec.stallTicks = 0;

            const wps = targetRec.assignment.waypoints;
            const lastWp = wps.length > 0 ? wps[wps.length - 1] : null;
            const oobDrive = fieldContext?.sidelineObjective === 'STOP_CLOCK_OOB';
            if (
              !lastWp ||
              lastWp.y <= targetRec.y + 4.5 ||
              (oobDrive && Math.abs(targetRec.x) >= 8.0 && targetRec.y > 1.0)
            ) {
              targetRec.waypointOriginX = targetRec.x;
              targetRec.waypointOriginY = targetRec.y;
              targetRec.waypointResetTimeSec = timeSec;
              const isDownfieldHookPitch = targetRec.y > 1.5;
              if (isDownfieldHookPitch && !oobDrive) {
                const alleyX = Math.max(
                  -22.5,
                  Math.min(22.5, targetRec.x + Math.sign(targetRec.x || 1) * 2.2)
                );
                targetRec.facingAngle = Math.PI / 2;
                this.applyVelocityImpulse(
                  targetRec,
                  targetRec.vx * 0.45,
                  Math.max(targetRec.vy, 5.2),
                  15.8
                );
                targetRec.assignment.waypoints = [
                  { x: alleyX, y: targetRec.y + 9.0 },
                  { x: alleyX, y: maxFieldY },
                ];
              } else {
                const sideX =
                  oobDrive && Math.abs(targetRec.x) >= 6.0
                    ? Math.sign(targetRec.x) * 26.1
                    : Math.max(-23.5, Math.min(23.5, targetRec.x + targetRec.vx * 0.6));
                targetRec.assignment.waypoints = [
                  { x: sideX, y: targetRec.y + 8.0 },
                  { x: oobDrive ? Math.sign(sideX || 1) * 26.2 : sideX, y: maxFieldY },
                ];
              }
            }

            return {
              terminated: false,
              reason: null,
              tackledYards: null,
              exoticEvent: targetRec.y > 0.2 ? 'HOOK_AND_LATERAL' : 'BACKWARD_TOSS',
            };
          } else {
            // LIVE-BALL LATERAL FUMBLE ON TURF!
            ballState.state = 'DEAD';
            const bounceBack = isDownfieldLateral ? 3.2 : 4.2;
            const muffSpot = +(Math.min(targetRec.y, ly) - bounceBack).toFixed(2);
            const defRecoverProb = isDownfieldLateral
              ? minDbDist < 2.2
                ? 0.76
                : 0.65
              : minDbDist < 1.8
              ? 0.58
              : minDbDist < 3.0
              ? 0.44
              : 0.34;
            const recRoll = noiseAmp > 0 ? Math.random() : 0.5;
            const lostTurnover = recRoll < defRecoverProb;
            return {
              terminated: true,
              reason: lostTurnover ? 'FUMBLE_LOST' : 'FUMBLE_RECOVERED',
              tackledYards: muffSpot,
            };
          }
        }

        // Forward Pass Arrival -> Evaluate Calibrated Logistic Completion & Interception Model
        const isPressured = Boolean(ballState.pressuredAtRelease);

        let secondDbDist = 12.0;
        for (const d of defAgents) {
          const dDist = Math.hypot(d.x - targetRec.x, d.y - targetRec.y);
          if (dDist > minDbDist + 1e-4 && dDist < secondDbDist) secondDbDist = dDist;
        }

        const isManPrimary = nearestDef?.defAssignment?.role === 'MAN_COV';
        const isGoalLineCompressed =
          fieldContext?.yardLineToGoal !== undefined && fieldContext.yardLineToGoal <= 7.0;
        const airDepth = Math.max(0, targetRec.y);
        const depthCompPenalty =
          Math.max(0, (airDepth - 5.5) * 0.0085) +
          Math.max(0, (airDepth - 14.5) * 0.008);
        const doubleCovPenalty = secondDbDist < 2.0 ? 0.095 : secondDbDist < 3.1 ? 0.040 : 0.0;
        const manPbuBase = Math.max(0.022, Math.min(0.095, 0.125 - minDbDist * 0.018));
        const manPbuPenalty = isManPrimary ? (isPressured ? manPbuBase * 0.65 : manPbuBase) : 0.0;
        const goalLineCompPenalty = isGoalLineCompressed ? 0.045 : 0.0;
        const rawProb =
          1.0 / (1.0 + Math.exp(-0.82 * (minDbDist - 1.38))) -
          depthCompPenalty -
          doubleCovPenalty -
          manPbuPenalty -
          goalLineCompPenalty;
        const pressurePenalty = isPressured ? 0.85 : 1.0;
        const throwerSkill =
          ballState.throwerSkill ??
          (passerRef.optionPass?.enabled
            ? passerRef.optionPass.throwerRating
            : passerRef.ratings.finesse);
        const nonQbPenalty = passerRef.pos !== 'QB' && !passerRef.optionPass?.enabled ? -0.10 : 0.0;
        const qbSkillMod = (throwerSkill - 84) * 0.0028 + nonQbPenalty;
        const compProb = Math.max(
          0.10,
          Math.min(isManPrimary ? 0.80 : 0.84, rawProb * pressurePenalty + qbSkillMod)
        );

        const roll = noiseAmp > 0 ? Math.random() : 0.48;
        const isComplete = roll < compProb;

        if (isComplete) {
          if (
            fieldContext?.yardLineToGoal !== undefined &&
            targetRec.y >= fieldContext.yardLineToGoal
          ) {
            ballState.state = 'CAUGHT';
            ballState.completedPass = true;
            ballState.carrierId = targetRec.id;
            ballState.x = targetRec.x;
            ballState.y = targetRec.y;
            ballState.z = 1.5;
            return {
              terminated: true,
              reason: 'TOUCHDOWN',
              tackledYards: +fieldContext.yardLineToGoal.toFixed(2),
              compProb: +compProb.toFixed(3),
            };
          }

          // Live post-catch YAC + Hook & Lateral continuation when lateralConfig or fieldContext is active
          const hasLiveContinuation = Boolean(
            targetRec.lateralConfig?.enabled || fieldContext !== undefined
          );
          if (hasLiveContinuation) {
            ballState.state = 'HELD';
            ballState.completedPass = true;
            ballState.carrierId = targetRec.id;
            ballState.x = targetRec.x;
            ballState.y = targetRec.y;
            ballState.z = 1.4;

            targetRec.assignment.role = 'BALL_CARRIER';
            targetRec.caughtAtTimeSec = timeSec;
            targetRec.tackleContactTicks = 0;
            targetRec.stallTicks = 0;
            // Realistic catch-gather deceleration & hip orientation on non-vertical hooks/curls/digs
            if (targetRec.vy <= 1.2) {
              targetRec.facingAngle = -Math.PI / 2;
              this.applyVelocityImpulse(targetRec, targetRec.vx * 0.35, targetRec.vy * 0.35, 15.8);
            } else {
              this.applyVelocityImpulse(targetRec, targetRec.vx * 0.72, targetRec.vy * 0.72, 15.8);
            }
            targetRec.waypointOriginX = targetRec.x;
            targetRec.waypointOriginY = targetRec.y;
            targetRec.waypointResetTimeSec = timeSec;

            const oobDrive = fieldContext?.sidelineObjective === 'STOP_CLOCK_OOB';
            if (oobDrive && Math.abs(targetRec.x) >= 7.2) {
              targetRec.assignment.waypoints = [
                { x: Math.sign(targetRec.x) * 26.2, y: targetRec.y + 4.5 },
              ];
            } else {
              targetRec.assignment.waypoints = [
                { x: targetRec.x, y: maxFieldY },
              ];
            }

            return {
              terminated: false,
              reason: null,
              tackledYards: null,
              compProb: +compProb.toFixed(3),
            };
          }

          // Standard instant YAC resolution (preserves exact NFL 2,500-snap calibration baseline)
          ballState.state = 'CAUGHT';
          ballState.carrierId = targetRec.id;
          ballState.x = targetRec.x;
          ballState.y = targetRec.y;
          ballState.z = 1.5;

          const catchY =
            ballState.targetY !== undefined
              ? targetRec.y * 0.35 + ballState.targetY * 0.65
              : targetRec.y;
          const depthYacDamp = Math.max(0.55, 1.0 - Math.max(0, catchY - 7.0) * 0.025);
          const yac = Math.max(
            0.3,
            Math.min(
              5.8,
              ((minDbDist - 0.35) * 0.96 + Math.max(0, targetRec.ratings.speed - 84) * 0.05) * depthYacDamp
            )
          );
          const totalGain = Math.max(0.5, catchY + yac);
          return {
            terminated: true,
            reason: 'COMPLETE',
            tackledYards: +totalGain.toFixed(2),
            compProb: +compProb.toFixed(3),
          };
        } else {
          // Contested pass interception check on incompletion (driven by window, zone QB-vision undercut, bracket, pressure, and thrower rating)
          const intWindow = isManPrimary ? 2.40 : 3.20;
          const tightFactor = Math.max(0, (intWindow - minDbDist) / intWindow);
          const bracketBonus = secondDbDist < 2.6 ? 0.032 : secondDbDist < 3.6 ? 0.014 : 0.0;
          const pressureBonus = isPressured ? 0.022 : 0.0;
          const zoneEyesBonus = !isManPrimary ? (minDbDist <= 4.2 ? 0.018 : 0.010) : 0.0;
          const skillIntPenalty = Math.max(0, (84 - throwerSkill) * 0.0028);
          const deepAirHazard = Math.min(0.020, Math.max(0, targetRec.y - 9.0) * 0.0015);
          const intProb = Math.min(
            0.24,
            (isManPrimary ? 0.012 : 0.018) +
              tightFactor * (isManPrimary ? 0.068 : 0.052) +
              bracketBonus +
              pressureBonus +
              zoneEyesBonus +
              skillIntPenalty +
              deepAirHazard
          );
          const intRoll = noiseAmp > 0 ? Math.random() : 0.50;

          if (intRoll < intProb) {
            ballState.state = 'DEAD';
            return {
              terminated: true,
              reason: 'INTERCEPTION',
              tackledYards: 0.0,
              compProb: +compProb.toFixed(3),
            };
          }

          ballState.state = 'INCOMPLETE';
          ballState.z = 0.1;
          return {
            terminated: true,
            reason: 'INCOMPLETE',
            tackledYards: 0.0,
            compProb: +compProb.toFixed(3),
          };
        }
      }
      return { terminated: false, reason: null, tackledYards: null };
    }

    if (ballCarrier) {
      ballState.x = ballCarrier.x;
      ballState.y = ballCarrier.y;
      ballState.z = 1.4;
      ballState.state = 'HELD';
      ballState.carrierId = ballCarrier.id;

      const crossedLosTime =
        ballCarrier.y >= 0.0 ? timeSec : undefined;

      // A. Goal-Line Touchdown Plane Check
      if (
        fieldContext?.yardLineToGoal !== undefined &&
        ballCarrier.y >= fieldContext.yardLineToGoal
      ) {
        ballState.state = 'DEAD';
        return {
          terminated: true,
          reason: 'TOUCHDOWN',
          tackledYards: +fieldContext.yardLineToGoal.toFixed(2),
          timeToEventSec: crossedLosTime ?? timeSec,
        };
      }

      // B. Sideline Out-of-Bounds Check (Clock Stoppage in 2-Minute Drill)
      if (
        (fieldContext !== undefined ||
          (ballState.lateralCount || 0) > 0 ||
          ballState.completedPass) &&
        Math.abs(ballCarrier.x) >= 25.85
      ) {
        ballState.state = 'DEAD';
        return {
          terminated: true,
          reason: 'OUT_OF_BOUNDS',
          tackledYards: +ballCarrier.y.toFixed(2),
          timeToEventSec: crossedLosTime ?? timeSec,
        };
      }

      // C. Backfield Backward Toss Option on a Ball Carrier (e.g. Dual-QB Pony Pitch)
      if (
        ballCarrier.backwardToss?.enabled &&
        !ballCarrier.backwardToss.executed &&
        timeSec >= ballCarrier.backwardToss.tossTimeSec &&
        ballCarrier.y <= 0.0
      ) {
        const rec = offAgents.find((o) => o.id === ballCarrier.backwardToss!.recipientId);
        if (rec && rec.y <= ballCarrier.y + 0.05) {
          const dist = Math.max(1.2, Math.hypot(rec.x - ballCarrier.x, rec.y - ballCarrier.y));
          const flightDur = Math.max(0.10, Math.min(0.45, dist / 15.5));
          const leadX = Math.max(-25.2, Math.min(25.2, rec.x + rec.vx * flightDur * 0.70));
          const leadY = Math.min(ballCarrier.y - 0.12, rec.y + rec.vy * flightDur * 0.55);

          ballCarrier.backwardToss.executed = true;
          ballState.state = 'IN_FLIGHT';
          ballState.isLateral = true;
          ballState.carrierId = null;
          ballState.passerId = ballCarrier.id;
          ballState.targetReceiverId = rec.id;
          ballState.launchX = ballCarrier.x;
          ballState.launchY = ballCarrier.y;
          ballState.targetX = leadX;
          ballState.targetY = leadY;
          ballState.throwTimeSec = timeSec;
          ballState.flightDurationSec = flightDur;

          ballCarrier.assignment.role = ballCarrier.backwardToss.postTossRole || 'PULL_LEAD';
          if (ballCarrier.backwardToss.postTossWaypoints) {
            ballCarrier.waypointOriginX = ballCarrier.x;
            ballCarrier.waypointOriginY = ballCarrier.y;
            ballCarrier.waypointResetTimeSec = timeSec;
            ballCarrier.assignment.waypoints = ballCarrier.backwardToss.postTossWaypoints.map((w) => ({ ...w }));
          }
          return {
            terminated: false,
            reason: null,
            tackledYards: null,
            exoticEvent: 'BACKWARD_TOSS',
          };
        }
      }

      // D. Non-QB / Dual-QB Run-Pass Double Option Behind LOS (e.g. WR Jet Sweep Double Option)
      if (
        ballCarrier.optionPass?.enabled &&
        !ballCarrier.optionPass.decidedRun &&
        !ballState.forwardPassThrown
      ) {
        const opt = ballCarrier.optionPass;
        if (ballCarrier.y > -0.10 || timeSec > opt.decisionWindowEndSec) {
          opt.decidedRun = true;
        } else if (timeSec >= opt.decisionWindowStartSec) {
          let closestThreatToThrower = 10.0;
          for (const d of defAgents) {
            const dist = Math.hypot(d.x - ballCarrier.x, d.y - ballCarrier.y);
            if (dist < closestThreatToThrower) closestThreatToThrower = dist;
          }

          const isOptionPressured = closestThreatToThrower <= 1.55;
          if (closestThreatToThrower <= 0.88) {
            // Defender hits option passer before tuck or throw
            ballState.state = 'DEAD';
            return {
              terminated: true,
              reason: 'TACKLED',
              tackledYards: +ballCarrier.y.toFixed(2),
              timeToEventSec: crossedLosTime ?? timeSec,
            };
          }

          if (closestThreatToThrower > 1.50) {
            const candidateIds = [opt.primaryReceiverId, opt.secondaryReceiverId].filter(
              (id): id is string => Boolean(id)
            );
            let chosenRec: SimAgent | null = null;
            let bestSep = 0;

            const estBallSpeed = 18.0 + (opt.throwerRating / 100) * 4.5;
            for (const cid of candidateIds) {
              const rec = offAgents.find(
                (o) =>
                  o.id === cid &&
                  (o.assignment.role === 'ROUTE' ||
                    (o.assignment.role === 'CHIP_RELEASE' &&
                      timeSec >= o.assignment.climbOrChipDelaySec))
              );
              if (!rec || rec.y <= ballCarrier.y + 0.5) continue;

              let minDbNow = 15.0;
              let minDbLead = 15.0;
              const estFlight = Math.max(0.18, Math.min(0.75, Math.hypot(rec.x - ballCarrier.x, rec.y - ballCarrier.y) / estBallSpeed));
              const projX = rec.x + rec.vx * estFlight * 0.8;
              const projY = rec.y + rec.vy * estFlight * 0.8;

              for (const d of defAgents) {
                const dNow = Math.hypot(d.x - rec.x, d.y - rec.y);
                const dLead = Math.hypot(d.x + d.vx * estFlight * 0.65 - projX, d.y + d.vy * estFlight * 0.65 - projY);
                if (dNow < minDbNow) minDbNow = dNow;
                if (dLead < minDbLead) minDbLead = dLead;
              }

              const effSep = Math.min(minDbNow, minDbLead * 1.05);
              if (effSep >= opt.separationThresholdYds && effSep > bestSep) {
                bestSep = effSep;
                chosenRec = rec;
              }
            }

            if (chosenRec) {
              // Option throw with realistic air-distance flight & on-the-run/off-platform accuracy penalty
              const passDist = Math.max(3.0, Math.hypot(chosenRec.x - ballCarrier.x, chosenRec.y - ballCarrier.y));
              const flightDuration = this.computePassFlightDuration(passDist, opt.throwerRating, ballCarrier.pos !== 'QB');
              const leadScale = Math.min(0.85, flightDuration * 0.72);
              const leadX = Math.max(-25.4, Math.min(25.4, chosenRec.x + chosenRec.vx * leadScale));
              const leadY = Math.max(0.5, Math.min(maxFieldY - 1.0, chosenRec.y + chosenRec.vy * leadScale));

              const runnerSpd = Math.hypot(ballCarrier.vx, ballCarrier.vy);
              const movePenalty = runnerSpd > 2.0 ? Math.min(22, (runnerSpd - 2.0) * 3.2) : 0;
              const nonQbAccPenalty = ballCarrier.pos !== 'QB' ? 6 : 0;

              opt.decidedRun = true;
              ballState.state = 'IN_FLIGHT';
              ballState.isLateral = false;
              ballState.forwardPassThrown = true;
              ballState.carrierId = null;
              ballState.passerId = ballCarrier.id;
              ballState.targetReceiverId = chosenRec.id;
              ballState.launchX = ballCarrier.x;
              ballState.launchY = ballCarrier.y;
              ballState.targetX = leadX;
              ballState.targetY = leadY;
              ballState.throwTimeSec = timeSec;
              ballState.flightDurationSec = flightDuration;
              ballState.pressuredAtRelease = isOptionPressured;
              ballState.throwerSkill = Math.max(
                42,
                opt.throwerRating - (isOptionPressured ? 14 : 0) - movePenalty - nonQbAccPenalty
              );

              ballCarrier.assignment.role = 'QB_DROP';
              ballCarrier.waypointOriginX = ballCarrier.x;
              ballCarrier.waypointOriginY = ballCarrier.y;
              ballCarrier.waypointResetTimeSec = timeSec;
              ballCarrier.assignment.waypoints = [{ x: ballCarrier.x, y: ballCarrier.y }];

              return {
                terminated: false,
                reason: null,
                tackledYards: null,
                timeToEventSec: timeSec,
                exoticEvent: 'OPTION_PASS',
              };
            } else if (isOptionPressured) {
              // Forced panicked tuck while rusher closes in: lose momentum cleanly and commit to run
              opt.decidedRun = true;
              this.applyVelocityImpulse(ballCarrier, ballCarrier.vx * 0.62, ballCarrier.vy * 0.62, 15.8);
            }
          } else {
            // Rusher in face (0.88..1.05y): abort cock & absorb hit speed penalty
            opt.decidedRun = true;
            this.applyVelocityImpulse(ballCarrier, ballCarrier.vx * 0.58, ballCarrier.vy * 0.58, 15.8);
          }
        }
      }

      // E. Downfield Catch-Pitch Option / Hook & Lateral Exchange (Strictly Backward Legal Lateral)
      if (
        ballCarrier.lateralConfig?.enabled &&
        !ballCarrier.lateralConfig.executed &&
        (ballCarrier.tackleContactTicks || 0) <= 2
      ) {
        const lat = ballCarrier.lateralConfig;
        const sincePossession = timeSec - (ballCarrier.caughtAtTimeSec ?? 0);
        if (sincePossession >= (lat.gatherDelaySec ?? 0.15)) {
          const trailer = offAgents.find((o) => o.id === lat.pitchTargetId);
          if (trailer && trailer.id !== ballCarrier.id) {
            const dist = Math.hypot(trailer.x - ballCarrier.x, trailer.y - ballCarrier.y);
            const maxPitch = lat.maxPitchDist ?? 9.5;
            const dyDrop = ballCarrier.y - trailer.y;
            if (dist >= 1.1 && dist <= maxPitch && dyDrop >= 0.12 && dyDrop <= 3.2) {
              const flightDur = Math.max(0.12, Math.min(0.45, dist / 14.8));
              const leadX = Math.max(-25.2, Math.min(25.2, trailer.x + trailer.vx * flightDur * 0.72));
              const leadY = Math.min(ballCarrier.y - 0.12, trailer.y + trailer.vy * flightDur * 0.55);

              // Check defender convergence on hook carrier vs open leverage on trailing speedster
              let minDefCarrier = 15.0;
              let minDefTrailer = 15.0;
              let pitchLaneBlocked = false;

              const segDx = leadX - ballCarrier.x;
              const segDy = leadY - ballCarrier.y;
              const segLenSq = Math.max(0.5, segDx * segDx + segDy * segDy);

              for (const d of defAgents) {
                const dc = Math.hypot(d.x - ballCarrier.x, d.y - ballCarrier.y);
                const dt = Math.hypot(d.x - leadX, d.y - leadY);
                if (dc < minDefCarrier) minDefCarrier = dc;
                if (dt < minDefTrailer) minDefTrailer = dt;

                // Raycast pitch corridor for lurking defenders
                const tProj = ((d.x - ballCarrier.x) * segDx + (d.y - ballCarrier.y) * segDy) / segLenSq;
                if (tProj > 0.12 && tProj < 0.88) {
                  const px = ballCarrier.x + tProj * segDx;
                  const py = ballCarrier.y + tProj * segDy;
                  if (Math.hypot(d.x - px, d.y - py) < 1.25) {
                    pitchLaneBlocked = true;
                  }
                }
              }

              const collapseRad = lat.defenderCollapseRadius ?? 4.6;
              const minTrailerSep = lat.minTargetSeparation ?? 2.25;
              const isRecklessThreshold = minTrailerSep < 1.8;

              if (
                (!pitchLaneBlocked || isRecklessThreshold) &&
                minDefCarrier <= collapseRad &&
                minDefTrailer >= minTrailerSep &&
                (isRecklessThreshold || minDefTrailer >= minDefCarrier + 0.55)
              ) {
                lat.executed = true;
                ballState.state = 'IN_FLIGHT';
                ballState.isLateral = true;
                ballState.carrierId = null;
                ballState.passerId = ballCarrier.id;
                ballState.targetReceiverId = trailer.id;
                ballState.launchX = ballCarrier.x;
                ballState.launchY = ballCarrier.y;
                ballState.targetX = leadX;
                ballState.targetY = leadY;
                ballState.throwTimeSec = timeSec;
                ballState.flightDurationSec = flightDur;

                // Pitcher immediately turns into a lead blocker sealing the collapsing defender!
                ballCarrier.assignment.role = 'MAN_BLOCK';
                ballCarrier.assignment.primaryTargetId = null;

                return {
                  terminated: false,
                  reason: null,
                  tackledYards: null,
                  exoticEvent: 'HOOK_AND_LATERAL',
                };
              }
            }
          }
        }
      }

      // Run / YAC Play Tackle Resolution with Acceleration-Bounded Wrap & Leg Drive
      let defendersInContact = 0;
      let closeContact = 0;
      let soloDef: SimAgent | null = null;
      for (const d of defAgents) {
        const dist = Math.hypot(d.x - ballCarrier.x, d.y - ballCarrier.y);
        // Engaged defenders held by blockers cannot tackle outside their grasp
        if (d.engagedWithId && d.leverageScore < 0.28 && dist > 0.88) {
          continue;
        }
        if (dist < 1.22) {
          defendersInContact++;
          if (!soloDef) soloDef = d;
          if (dist < 0.85) closeContact++;
        }
      }

      if (defendersInContact > 0) {
        ballCarrier.tackleContactTicks = (ballCarrier.tackleContactTicks || 0) + 1;
        const btkPower = (ballCarrier.ratings.power * 0.55 + ballCarrier.ratings.finesse * 0.45) / 100;
        const soloPower = soloDef ? soloDef.ratings.power : 82;
        const isLightDbSolo =
          defendersInContact === 1 &&
          Boolean(soloDef && ['CB', 'CB1', 'CB2', 'NI', 'NCB', 'DB', 'FS', 'SS'].includes(soloDef.pos));
        const powerAdvantage = Math.max(
          0.75,
          Math.min(1.45, (ballCarrier.ratings.power + (isLightDbSolo ? 16 : 6)) / Math.max(55, soloPower))
        );
        const breakTackleRoll = noiseAmp > 0 ? Math.random() : 0.50;
        const deepBackfield = ballCarrier.y <= -0.35;
        const atLos = ballCarrier.y > -0.35 && ballCarrier.y <= 0.35;

        if (
          defendersInContact === 1 &&
          ballCarrier.tackleContactTicks === 2 &&
          breakTackleRoll < (deepBackfield ? 0.14 : atLos ? 0.24 : 0.32) * btkPower * powerAdvantage
        ) {
          // Runner breaks solo arm tackle with biomechanical acceleration cap
          ballCarrier.tackleContactTicks = 0;
          this.applyVelocityImpulse(
            ballCarrier,
            ballCarrier.vx,
            ballCarrier.vy + (deepBackfield ? 0.9 : 1.50) * btkPower,
            15.6
          );
        } else {
          const dragFactor = deepBackfield
            ? 0.50
            : atLos
            ? 0.72
            : defendersInContact >= 2
            ? 0.54
            : isLightDbSolo
            ? 0.88
            : 0.84;
          const legDrive = deepBackfield
            ? 0.0
            : atLos
            ? 0.55 * btkPower * powerAdvantage
            : defendersInContact >= 2
            ? 0.22 * btkPower
            : 0.90 * btkPower * powerAdvantage;
          this.applyVelocityImpulse(
            ballCarrier,
            ballCarrier.vx * dragFactor,
            ballCarrier.vy * dragFactor + legDrive,
            15.6
          );

          for (const d of defAgents) {
            const dist = Math.hypot(d.x - ballCarrier.x, d.y - ballCarrier.y);
            if (dist < 1.22 && (!d.engagedWithId || d.leverageScore >= 0.28 || dist <= 0.88)) {
              this.applyVelocityImpulse(d, ballCarrier.vx * 0.72, ballCarrier.vy * 0.72, 15.6);
            }
          }

          const wrapTicksNeeded =
            defendersInContact >= 2 ? 2 : deepBackfield ? 2 : atLos ? 3 : isLightDbSolo ? 6 : 5;
          if (
            (closeContact >= 2 && ballCarrier.tackleContactTicks >= 2) ||
            ballCarrier.tackleContactTicks >= wrapTicksNeeded
          ) {
            ballState.state = 'DEAD';
            return {
              terminated: true,
              reason: ballState.completedPass ? 'COMPLETE' : 'TACKLED',
              tackledYards: +ballCarrier.y.toFixed(2),
              timeToEventSec: crossedLosTime,
            };
          }
        }
      } else {
        ballCarrier.tackleContactTicks = 0;

        // Symmetric Capped YAC NO_FC Model for Runs & Sweeps once runner clears box (y >= 5.8) into open field
        if (
          (fieldContext === undefined ||
            fieldContext.cappedYacSweep ||
            fieldContext.sidelineObjective === 'STAY_INBOUNDS') &&
          !fieldContext?.yardLineToGoal &&
          !ballState.completedPass &&
          ballCarrier.y >= 5.8
        ) {
          let nearestPursuit = 14.0;
          let safetyWallCount = 0;
          for (const d of defAgents) {
            if (d.engagedWithId && d.leverageScore < 0.25) continue;
            const dDist = Math.hypot(d.x - ballCarrier.x, d.y - ballCarrier.y);
            if (d.y >= ballCarrier.y - 3.0 && dDist < nearestPursuit) nearestPursuit = dDist;
            if (d.y >= ballCarrier.y + 1.5 && Math.abs(d.x - ballCarrier.x) < 12.0) {
              safetyWallCount++;
            }
          }
          const isStdDesignedRush =
            !fieldContext?.cappedYacSweep &&
            (ballState.lateralCount || 0) === 0 &&
            ballCarrier.pos !== 'QB';
          const btkSkill =
            (ballCarrier.ratings.power * 0.55 + ballCarrier.ratings.finesse * 0.45) / 100;
          const baseCap = isStdDesignedRush
            ? safetyWallCount >= 2
              ? 2.5
              : safetyWallCount === 1
              ? 3.5
              : 4.8
            : safetyWallCount >= 1
            ? 2.9
            : 5.2;
          const baseExtra = Math.max(
            0.30,
            Math.min(
              baseCap,
              (nearestPursuit - 0.8) * 0.58 + (btkSkill - 0.72) * 1.8
            )
          );
          let breakawayBonus = 0;
          const breakawayThresh = isStdDesignedRush ? 1.45 : 1.55;
          if (noiseAmp > 0 && nearestPursuit >= breakawayThresh) {
            const missProb =
              (safetyWallCount >= 2 ? 0.04 : safetyWallCount === 1 ? 0.08 : 0.14) *
              (btkSkill / 0.80);
            if (Math.random() < missProb) {
              breakawayBonus = isStdDesignedRush
                ? 4.2 + Math.random() * 8.2
                : 3.8 + Math.random() * 4.2;
            }
          }
          const extraYac = Math.min(isStdDesignedRush ? 13.5 : 11.5, baseExtra + breakawayBonus);
          ballState.state = 'DEAD';
          return {
            terminated: true,
            reason: 'TACKLED',
            tackledYards: +(ballCarrier.y + extraYac).toFixed(2),
            timeToEventSec: crossedLosTime ?? timeSec,
          };
        }
      }

      // Forward progress stoppage rule (never whistle an untouched option-passer setting feet behind LOS)
      const settingFeetToPass =
        Boolean(
          ballCarrier.optionPass?.enabled &&
            !ballCarrier.optionPass.decidedRun &&
            !ballState.forwardPassThrown &&
            defendersInContact === 0
        );
      if (timeSec >= 0.55 && !settingFeetToPass) {
        if (Math.hypot(ballCarrier.vx, ballCarrier.vy) < 0.75) {
          ballCarrier.stallTicks = (ballCarrier.stallTicks || 0) + 1;
          if (ballCarrier.stallTicks >= 4) {
            ballState.state = 'DEAD';
            return {
              terminated: true,
              reason: ballState.completedPass ? 'COMPLETE' : 'TACKLED',
              tackledYards: +ballCarrier.y.toFixed(2),
              timeToEventSec: crossedLosTime,
            };
          }
        } else {
          ballCarrier.stallTicks = 0;
        }
      }

      return { terminated: false, reason: null, tackledYards: null, timeToEventSec: crossedLosTime };
    } else if (qb && ballState.state === 'HELD') {
      // PASS PLAY (OR BACKWARD TOSS TRIGGER FROM QB): Ball currently HELD by QB
      ballState.x = qb.x;
      ballState.y = qb.y;
      ballState.z = 1.9;
      ballState.carrierId = qb.id;

      // 0. Check for Scheduled Backward Toss / Lateral Screen Behind LOS (e.g. Jet Touch-Toss or Double-Pass Screen)
      if (
        qb.backwardToss?.enabled &&
        !qb.backwardToss.executed &&
        timeSec >= qb.backwardToss.tossTimeSec
      ) {
        const rec = offAgents.find((o) => o.id === qb.backwardToss!.recipientId);
        if (rec) {
          const dist = Math.max(1.0, Math.hypot(rec.x - qb.x, rec.y - qb.y));
          const flightDur = Math.max(0.10, Math.min(0.50, dist / 16.0));
          const leadX = Math.max(-25.2, Math.min(25.2, rec.x + rec.vx * flightDur * 0.75));
          // Strictly enforce NFL backward pass vector (targetY <= launchY - 0.12)
          const leadY = Math.min(qb.y - 0.12, rec.y + rec.vy * flightDur * 0.55);

          qb.backwardToss.executed = true;
          ballState.state = 'IN_FLIGHT';
          ballState.isLateral = true;
          ballState.carrierId = null;
          ballState.passerId = qb.id;
          ballState.targetReceiverId = rec.id;
          ballState.launchX = qb.x;
          ballState.launchY = qb.y;
          ballState.targetX = leadX;
          ballState.targetY = leadY;
          ballState.throwTimeSec = timeSec;
          ballState.flightDurationSec = flightDur;

          if (qb.backwardToss.postTossRole) {
            qb.assignment.role = qb.backwardToss.postTossRole;
          }
          if (qb.backwardToss.postTossWaypoints) {
            qb.waypointOriginX = qb.x;
            qb.waypointOriginY = qb.y;
            qb.waypointResetTimeSec = timeSec;
            qb.assignment.waypoints = qb.backwardToss.postTossWaypoints.map((w) => ({ ...w }));
          }

          return {
            terminated: false,
            reason: null,
            tackledYards: null,
            exoticEvent: 'BACKWARD_TOSS',
          };
        }
      }

      // 1. Check for Physical Sack on QB before throw
      for (const d of defAgents) {
        const dist = Math.hypot(d.x - qb.x, d.y - qb.y);
        if (dist < 0.88 && (!d.engagedWithId || d.leverageScore >= 0.22 || dist < 0.68)) {
          ballState.state = 'DEAD';
          return {
            terminated: true,
            reason: 'SACK',
            tackledYards: +qb.y.toFixed(2),
            timeToEventSec: timeSec,
          };
        }
      }

      // 2. Evaluate Read Progression & Pass Launch Timing
      const routes = offAgents.filter(
        (a) =>
          a.assignment.role === 'ROUTE' ||
          (a.assignment.role === 'CHIP_RELEASE' && timeSec >= a.assignment.climbOrChipDelaySec) ||
          (a.assignment.role === 'MAX_PROTECT_SCAN' && timeSec >= 1.70 && a.assignment.waypoints.length > 0)
      );

      if (routes.length > 0) {
        const designedHookLateralTarget = routes.find((r) => r.lateralConfig?.enabled);
        const isPA = Boolean(qb.playAction?.enabled);
        const meshDur = qb.playAction?.meshDurationSec ?? 1.25;
        const isGoalLine =
          fieldContext?.yardLineToGoal !== undefined && fieldContext.yardLineToGoal <= 7;
        const maxConceptDepth = Math.max(
          0,
          ...routes.flatMap((r) => r.assignment.waypoints.map((w) => w.y))
        );
        const isQuickConcept = maxConceptDepth <= 6.8;

        const rushRoles = new Set([
          'RUSH_GAP',
          'CONTAIN_EDGE',
          'BLITZ_A',
          'BLITZ_EDGE',
          'BLITZ_RUN_GAP',
          'CROSS_DOG',
          'BLITZ_EDGE_CRASH',
          'SPILL',
        ]);
        const rushIntentCount = defAgents.filter((d) => {
          const role = d.defAssignment?.role;
          return (
            Boolean(role && rushRoles.has(role)) ||
            (role === 'MAN_COV' && d.defAssignment?.manTargetId === 'QB')
          );
        }).length;
        const isBlitzLook = rushIntentCount >= 5;

        const effectiveMeshDur = isBlitzLook ? Math.min(meshDur, 0.72) : Math.min(meshDur, 0.88);
        const inPAMesh = isPA && timeSec < effectiveMeshDur;
        const paMinReady = isPA ? effectiveMeshDur + 0.25 : 0;

        const getRouteReadyTime = (r: SimAgent): number => {
          if (r.lateralConfig?.enabled) return 1.65;
          const depth = Math.max(0, ...r.assignment.waypoints.map((w) => w.y));
          let depthReady =
            depth <= 7.0
              ? 1.95
              : depth <= 12.5
              ? 2.35
              : depth <= 16.5
              ? 2.70
              : 3.00;
          if (isQuickConcept) {
            depthReady = depth <= 7.0 ? 1.48 : 1.85;
          } else if (isGoalLine) {
            depthReady = Math.min(1.65, depthReady);
          } else if (isBlitzLook) {
            depthReady = Math.max(1.45, depthReady - 0.22);
          }
          const readStep = isQuickConcept || isGoalLine ? 0.25 : isBlitzLook ? 0.28 : 0.46;
          const readBase = isQuickConcept ? 1.45 : isGoalLine ? 1.68 : isBlitzLook ? 1.72 : 2.25;
          const readSeqFloor = readBase + Math.max(0, (r.readOrder ?? 3) - 1) * readStep;
          return Math.max(paMinReady, depthReady, readSeqFloor);
        };

        const routeReadyTimes = routes.map(getRouteReadyTime);
        const maxRouteReady = Math.max(...routeReadyTimes);
        const maxProgressionTime = designedHookLateralTarget
          ? Math.max(paMinReady, 1.85)
          : isQuickConcept
          ? Math.min(2.15, maxRouteReady + 0.20)
          : isGoalLine
          ? Math.min(2.35, Math.max(paMinReady + 0.25, maxRouteReady + 0.15))
          : isBlitzLook
          ? Math.min(2.65, Math.max(paMinReady + 0.35, maxRouteReady + 0.20))
          : Math.min(3.55, Math.max(2.90, maxRouteReady + 0.45));

        let closestRusherDist = 10.0;
        for (const d of defAgents) {
          if (d.y < 2.5) {
            const dist = Math.hypot(d.x - qb.x, d.y - qb.y);
            if (dist < closestRusherDist) closestRusherDist = dist;
          }
        }

        // Case A: SACK DURING PLAY-ACTION MESH
        if (inPAMesh && closestRusherDist < 0.85 && timeSec >= 0.65) {
          ballState.state = 'DEAD';
          return {
            terminated: true,
            reason: 'SACK',
            tackledYards: +qb.y.toFixed(2),
            timeToEventSec: timeSec,
          };
        }

        if (inPAMesh) {
          return {
            terminated: false,
            reason: null,
            tackledYards: null,
            timeToEventSec: timeSec,
          };
        }

        // Case B: Dropback or post-mesh pass execution
        const imminentSack =
          closestRusherDist < (isPA ? 1.15 : isBlitzLook ? 1.18 : 1.24) &&
          timeSec >= (isPA ? Math.max(1.45, effectiveMeshDur + 0.55) : 1.15);
        const hasQuickOutlet = routes.some(
          (r) =>
            r.lateralConfig?.enabled ||
            Math.max(0, ...r.assignment.waypoints.map((w) => w.y)) <= 10.0
        );
        const awScale = qb.ratings.awareness / 100;
        // Per-tick (20 Hz) hot-throw probability; kept calibrated against multi-tick compound hazard
        const hotThrowChance = isPA
          ? hasQuickOutlet
            ? awScale * 0.26
            : awScale * 0.14
          : isGoalLine
          ? awScale * 0.12
          : isBlitzLook
          ? hasQuickOutlet
            ? awScale * 0.13
            : awScale * 0.06
          : hasQuickOutlet
          ? awScale * 0.04
          : awScale * 0.025;
        const imminentEscapeChance = isPA
          ? hasQuickOutlet
            ? awScale * 0.48
            : awScale * 0.28
          : isGoalLine
          ? awScale * 0.18
          : isBlitzLook
          ? hasQuickOutlet
            ? awScale * 0.24
            : awScale * 0.11
          : awScale * 0.05;
        const throwRoll = noiseAmp > 0 ? Math.random() : 0.5;

        if (imminentSack && throwRoll >= imminentEscapeChance) {
          ballState.state = 'DEAD';
          return {
            terminated: true,
            reason: 'SACK',
            tackledYards: +qb.y.toFixed(2),
            timeToEventSec: timeSec,
          };
        }

        const hotPressureThrow =
          !imminentSack &&
          hasQuickOutlet &&
          throwRoll < hotThrowChance &&
          (isPA
            ? closestRusherDist < 1.85 && timeSec >= Math.max(paMinReady * 0.85, 1.05)
            : isBlitzLook || isGoalLine
            ? closestRusherDist < 1.80 && timeSec >= Math.max(paMinReady, 1.25)
            : closestRusherDist < 1.38 && timeSec >= Math.max(paMinReady, 2.25));

        const throwHot = (imminentSack && throwRoll < imminentEscapeChance) || hotPressureThrow;

        let hasCleanRhythmOpen = false;
        let hasReadyHookLateral = false;
        let rhythmTarget: SimAgent | null = null;
        if (!throwHot) {
          const orderedRouteIdx = routes
            .map((rec, i) => ({ rec, i, order: rec.readOrder ?? 3 }))
            .sort((a, b) => a.order - b.order);
          for (const { rec, i } of orderedRouteIdx) {
            if (timeSec < routeReadyTimes[i]) continue;
            let minDbDist = 12.0;
            for (const d of defAgents) {
              const dDist = Math.hypot(d.x - rec.x, d.y - rec.y);
              if (dDist < minDbDist) minDbDist = dDist;
            }
            if (rec.lateralConfig?.enabled && minDbDist >= 1.85) {
              hasReadyHookLateral = true;
              if (!rhythmTarget) rhythmTarget = rec;
            }
            const cleanThresh = isBlitzLook || isQuickConcept || isGoalLine ? 2.15 : 2.90;
            if (minDbDist >= cleanThresh) {
              hasCleanRhythmOpen = true;
              if (!rhythmTarget) rhythmTarget = rec;
            }
          }
        }

        if (timeSec >= maxProgressionTime || hasCleanRhythmOpen || hasReadyHookLateral || throwHot) {
          let bestRec = routes[0];
          if (!throwHot && rhythmTarget) {
            bestRec = rhythmTarget;
          } else {
            let bestTargetScore = -999;

            for (let i = 0; i < routes.length; i++) {
              const rec = routes[i];
              let minDbDist = 12.0;
              for (const d of defAgents) {
                const dDist = Math.hypot(d.x - rec.x, d.y - rec.y);
                if (dDist < minDbDist) minDbDist = dDist;
              }
              const routeDepth = Math.max(0, ...rec.assignment.waypoints.map((w) => w.y));
              const deepDiffPenalty = -Math.max(0, (rec.y - 8.0) * 0.10);
              const hookPriorityBonus =
                rec.lateralConfig?.enabled && minDbDist >= 1.85 ? 8.50 : 0.0;
              const hotOutletBonus =
                throwHot && (rec.lateralConfig?.enabled || routeDepth <= 10.5) ? 2.25 : 0.0;
              const notYetReadyPenalty =
                !throwHot && timeSec < routeReadyTimes[i] ? -1.40 : 0.0;
              const readOrd = rec.readOrder ?? 3;
              const readBonus =
                (readOrd === 1
                  ? 1.90
                  : readOrd === 2
                  ? 1.05
                  : readOrd >= 4 && throwHot
                  ? 0.70
                  : 0.35) + hookPriorityBonus;
              const targetScore =
                minDbDist + readBonus + deepDiffPenalty + hotOutletBonus + notYetReadyPenalty;
              if (targetScore > bestTargetScore) {
                bestTargetScore = targetScore;
                bestRec = rec;
              }
            }
          }

          const passDist = Math.max(3.0, Math.hypot(bestRec.x - qb.x, bestRec.y - qb.y));
          const flightDuration = this.computePassFlightDuration(passDist, qb.ratings.finesse, qb.pos !== 'QB');
          const lastWp = bestRec.assignment.waypoints[bestRec.assignment.waypoints.length - 1];
          const nearFinalWp =
            Boolean(lastWp) && Math.hypot(bestRec.x - lastWp.x, bestRec.y - lastWp.y) <= 2.2;
          const leadScale = nearFinalWp
            ? Math.min(0.20, flightDuration * 0.22)
            : Math.min(0.55, flightDuration * 0.50);
          const leadX = Math.max(-25.5, Math.min(25.5, bestRec.x + bestRec.vx * leadScale));
          const leadY = Math.max(-4.0, Math.min(maxFieldY - 1.0, bestRec.y + bestRec.vy * leadScale));

          let pressuredAtThrow = false;
          for (const d of defAgents) {
            const role = d.defAssignment?.role;
            if (
              role &&
              ['HOOK_CURL', 'CURL_FLAT', 'DEEP_ZONE', 'DEEP_THIRD', 'DEEP_HALF', 'QUARTERS_MATCH', 'ROBBER'].includes(role)
            ) {
              continue;
            }
            if (role === 'MAN_COV' && d.defAssignment?.manTargetId !== 'QB') continue;
            if (d.y < 3.0) {
              const dist = Math.hypot(d.x - qb.x, d.y - qb.y);
              if (dist < 1.65 || ((!d.engagedWithId || d.leverageScore >= 0.30) && dist < 2.35)) {
                pressuredAtThrow = true;
                break;
              }
            }
          }

          ballState.state = 'IN_FLIGHT';
          ballState.isLateral = false;
          ballState.forwardPassThrown = true;
          ballState.carrierId = null;
          ballState.passerId = qb.id;
          ballState.targetReceiverId = bestRec.id;
          ballState.launchX = qb.x;
          ballState.launchY = qb.y;
          ballState.targetX = leadX;
          ballState.targetY = leadY;
          ballState.throwTimeSec = timeSec;
          ballState.flightDurationSec = flightDuration;
          ballState.throwerSkill = qb.ratings.finesse;
          ballState.pressuredAtRelease = pressuredAtThrow;

          return {
            terminated: false,
            reason: null,
            tackledYards: null,
            timeToEventSec: timeSec,
          };
        }
      }
    }

    return { terminated: false, reason: null, tackledYards: null };
  }

  private resolveRunBlockTarget(
    off: SimAgent,
    defAgents: SimAgent[],
    level: 'PRIMARY' | 'SECONDARY'
  ): SimAgent | null {
    const explicitId =
      level === 'PRIMARY'
        ? off.assignment.primaryTargetId
        : off.assignment.secondaryTargetId;

    if (explicitId) {
      const explicit = defAgents.find((d) => d.id === explicitId);
      // Only use explicit target if he is actually aligned in or near the blocker's lateral sector
      // (Prevents crossover X-blocking when defensive fronts flip NT and 3T!)
      const maxSectorSpan = level === 'PRIMARY' ? 2.6 : 4.2;
      if (explicit && Math.abs(explicit.startX - off.startX) <= maxSectorSpan) {
        return explicit;
      }
    }

    if (level === 'PRIMARY') {
      // Find nearest 1st-level down lineman / edge defender in the blocker's sector
      const firstLevel = defAgents.filter(
        (d) => d.startY <= 2.2 && Math.abs(d.startX - off.startX) <= 2.6
      );
      if (firstLevel.length > 0) {
        firstLevel.sort(
          (a, b) =>
            Math.hypot(a.x - off.x, a.y - off.y) - Math.hypot(b.x - off.x, b.y - off.y)
        );
        return firstLevel[0];
      }
      return this.findNearestDefenderNear(defAgents, off.x, off.y + 0.6, 3.2);
    } else {
      // Find nearest 2nd-level linebacker / box safety in the blocker's climb corridor
      const secondLevel = defAgents.filter(
        (d) => d.startY > 1.0 && d.startY <= 6.5 && Math.abs(d.startX - off.startX) <= 4.2
      );
      if (secondLevel.length > 0) {
        secondLevel.sort(
          (a, b) =>
            Math.hypot(a.x - off.x, a.y - off.y) - Math.hypot(b.x - off.x, b.y - off.y)
        );
        return secondLevel[0];
      }
      return null;
    }
  }

  private resolveBlockerTarget(
    off: SimAgent,
    defAgents: SimAgent[],
    prevEngagedMap?: Map<string, string | null>
  ): SimAgent | null {
    if (off.assignment.primaryTargetId) {
      const explicit = defAgents.find((d) => d.id === off.assignment.primaryTargetId);
      if (explicit && Math.abs(explicit.x - off.x) <= 3.5) {
        if (off.assignment.role === 'PASS_SET') {
          const eng = prevEngagedMap ? prevEngagedMap.get(explicit.id) : explicit.engagedWithId;
          const alreadyBlockedByTeammate = Boolean(eng && eng !== off.id);
          const threateningFreeRusher = defAgents.find((d) => {
            if (d.id === explicit.id) return false;
            const role = d.defAssignment?.role;
            if (
              role &&
              ['HOOK_CURL', 'CURL_FLAT', 'DEEP_ZONE', 'DEEP_THIRD', 'DEEP_HALF', 'QUARTERS_MATCH', 'ROBBER'].includes(role)
            ) {
              return false;
            }
            if (role === 'MAN_COV' && d.defAssignment?.manTargetId !== 'QB') return false;
            const dEng = prevEngagedMap ? prevEngagedMap.get(d.id) : d.engagedWithId;
            if (dEng && dEng !== off.id) return false;
            return Math.abs(d.x - off.x) <= 2.35 && d.y <= 3.5 && d.y > -7.5;
          });
          if (!alreadyBlockedByTeammate || !threateningFreeRusher) {
            return explicit;
          }
        } else {
          return explicit;
        }
      }
    }

    if (off.assignment.role === 'PASS_SET') {
      const isLT = off.pos === 'LT' || off.startX < -2.4;
      const isRT = off.pos === 'RT' || off.startX > 2.4;
      const isLG = off.pos === 'LG' || (off.startX >= -2.4 && off.startX < -0.8);
      const isRG = off.pos === 'RG' || (off.startX <= 2.4 && off.startX > 0.8);
      const isC = off.pos === 'C' || Math.abs(off.startX) <= 0.8;

      const coverageRoles = [
        'HOOK_CURL',
        'CURL_FLAT',
        'DEEP_ZONE',
        'DEEP_THIRD',
        'DEEP_HALF',
        'QUARTERS_MATCH',
        'ROBBER',
      ];

      const activeRushers = defAgents.filter((d) => {
        if (d.defAssignment && coverageRoles.includes(d.defAssignment.role)) return false;
        if (d.defAssignment?.role === 'MAN_COV' && d.defAssignment?.manTargetId !== 'QB') return false;
        return d.y < 3.2 && d.y > -7.5;
      });

      const isFreeOrMine = (d: SimAgent) => {
        const eng = prevEngagedMap ? prevEngagedMap.get(d.id) : d.engagedWithId;
        return !eng || eng === off.id;
      };

      if (isLT || isRT) {
        const flankRushers = activeRushers.filter((d) =>
          isLT
            ? d.x <= off.startX + 0.6 && d.x >= -8.5
            : d.x >= off.startX - 0.6 && d.x <= 8.5
        );
        flankRushers.sort((a, b) => Math.abs(b.x) - Math.abs(a.x));
        const unblockedFlank = flankRushers.find(isFreeOrMine);
        if (unblockedFlank) return unblockedFlank;
        if (flankRushers.length > 0) return flankRushers[0];
      }

      if (isLG) {
        const leftInterior = activeRushers.filter((d) => d.x >= -3.2 && d.x <= -0.3);
        const unblocked = leftInterior.find(isFreeOrMine);
        if (unblocked) return unblocked;
        if (leftInterior.length > 0) return leftInterior[0];
      }

      if (isRG) {
        const rightInterior = activeRushers.filter((d) => d.x >= 0.3 && d.x <= 3.2);
        const unblocked = rightInterior.find(isFreeOrMine);
        if (unblocked) return unblocked;
        if (rightInterior.length > 0) return rightInterior[0];
      }

      if (isC) {
        const aGapRushers = activeRushers.filter((d) => Math.abs(d.x) <= 1.5);
        const unblocked = aGapRushers.find(isFreeOrMine);
        if (unblocked) return unblocked;
        const anyInterior = activeRushers.filter((d) => Math.abs(d.x) <= 2.6);
        if (anyInterior.length > 0) {
          anyInterior.sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
          return anyInterior[0];
        }
      }

      const nearbyRushers = activeRushers.filter(
        (d) => Math.hypot(d.x - off.x, d.y - off.y) <= 3.8
      );
      const unblockedNearby = nearbyRushers.find(isFreeOrMine);
      if (unblockedNearby) return unblockedNearby;
      if (nearbyRushers.length > 0) return nearbyRushers[0];
    }

    return this.findNearestDefenderNear(defAgents, off.x, off.y + 0.8, 3.5);
  }

  private findNearestDefenderNear(
    defAgents: SimAgent[],
    x: number,
    y: number,
    maxRadius: number
  ): SimAgent | null {
    let best: SimAgent | null = null;
    let bestDist = maxRadius;
    for (const d of defAgents) {
      const dist = Math.hypot(d.x - x, d.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }

  private computePassFlightDuration(passDist: number, throwerArm: number, isNonQb = false): number {
    const armFactor = 1.0 - ((throwerArm - 80) / 100) * 0.12 + (isNonQb ? 0.06 : 0.0);
    return Math.max(
      0.35,
      Math.min(2.60, (0.36 + passDist * 0.032 + passDist * passDist * 0.00038) * armFactor)
    );
  }

  private computeScrimmageGainEpa(gain: number, isTouchdown: boolean): number {
    let epa: number;
    if (gain <= 0) {
      epa = -0.55 - 0.19 * Math.abs(gain);
    } else if (gain <= 3.0) {
      epa = -0.55 + gain * 0.083;
    } else if (gain <= 5.0) {
      epa = -0.30 + (gain - 3.0) * 0.14;
    } else if (gain <= 8.0) {
      epa = -0.02 + (gain - 5.0) * 0.163;
    } else if (gain <= 12.0) {
      epa = 0.47 + (gain - 8.0) * 0.0675;
    } else if (gain <= 19.0) {
      epa = 0.74 + (gain - 12.0) * 0.060;
    } else {
      epa = 1.16 + (gain - 19.0) * 0.062;
    }
    if (isTouchdown) {
      epa += 0.65;
    }
    return +Math.max(-2.20, Math.min(isTouchdown ? 3.50 : 2.80, epa)).toFixed(2);
  }

  private followWaypoints(
    agent: SimAgent,
    elapsedSec: number,
    speedYps: number
  ): Waypoint2D {
    const wps = agent.assignment.waypoints;
    if (!wps || wps.length === 0) {
      return { x: agent.x, y: agent.y };
    }
    const effElapsed = Math.max(0, elapsedSec - (agent.waypointResetTimeSec || 0));
    const moveStartDelay = agent.preSnapMotion?.enabled || (agent.waypointResetTimeSec ?? 0) > 0 ? 0.0 : 0.16;
    const runT = Math.max(0, effElapsed - moveStartDelay);
    let remDist = runT <= 0 ? 0 : speedYps * (runT - 0.24 * (1.0 - Math.exp(-runT / 0.24)));
    let curX = agent.waypointOriginX ?? agent.startX;
    let curY = agent.waypointOriginY ?? agent.startY;

    for (const wp of wps) {
      const segLen = Math.hypot(wp.x - curX, wp.y - curY);
      if (remDist <= segLen || segLen < 1e-4) {
        const t = segLen < 1e-4 ? 1 : remDist / segLen;
        return {
          x: curX + (wp.x - curX) * t,
          y: curY + (wp.y - curY) * t,
        };
      }
      remDist -= segLen;
      curX = wp.x;
      curY = wp.y;
    }
    return wps[wps.length - 1];
  }

  private steerAgentToward(
    agent: SimAgent,
    goalX: number,
    goalY: number,
    maxSpeed: number,
    mode: 'SPRINT' | 'FOOTWORK' = 'SPRINT',
    defaultFacingAngle = Math.PI / 2,
    timeSec = 1.0
  ): void {
    const dx = goalX - agent.x;
    const dy = goalY - agent.y;
    const dist = Math.hypot(dx, dy);

    let snapScale = 1.0;
    if (timeSec < 0.50) {
      const isStaticOff = agent.side === 'OFF' && !agent.preSnapMotion?.enabled;
      const isDefRusher =
        agent.side === 'DEF' &&
        Boolean(
          agent.defAssignment &&
            ['RUSH_GAP', 'CONTAIN_EDGE', 'BLITZ_A', 'BLITZ_EDGE', 'BLITZ_RUN_GAP', 'CROSS_DOG', 'BLITZ_EDGE_CRASH', 'SPILL'].includes(
              agent.defAssignment.role
            )
        );
      const reactLatency = isStaticOff ? 0.18 : isDefRusher ? 0.18 : agent.side === 'DEF' ? 0.20 : 0.0;
      if (reactLatency > 0 && timeSec < reactLatency + 0.16) {
        snapScale = Math.max(0.12, Math.min(1.0, (timeSec - reactLatency + 0.08) / 0.24));
      }
    }
    const effMaxSpeed = maxSpeed * snapScale;

    if (dist < 0.08) {
      const spd = Math.hypot(agent.vx, agent.vy);
      if (spd > 0.05) {
        const brakeDv = Math.min(spd, 10.5 * this.dt);
        agent.vx -= (agent.vx / spd) * brakeDv;
        agent.vy -= (agent.vy / spd) * brakeDv;
      } else {
        agent.vx = 0;
        agent.vy = 0;
      }
      return;
    }

    if (mode === 'FOOTWORK') {
      // Athletic Backpedal / Kick-Slide / Pocket Drop:
      // Player translates directly toward goal with critical-damping arrival while keeping eyes facing the play!
      agent.facingAngle = defaultFacingAngle;
      const desiredSpeed = Math.min(effMaxSpeed, dist * 5.2);
      const desVx = (dx / dist) * desiredSpeed;
      const desVy = (dy / dist) * desiredSpeed;

      const { footworkAccelYps2 } = this.getPositionalKinematics(agent);
      const dvx = desVx - agent.vx;
      const dvy = desVy - agent.vy;
      const dv = Math.hypot(dvx, dvy);
      const maxAccel = footworkAccelYps2 * snapScale;
      const maxDv = maxAccel * this.dt;

      if (dv > maxDv && dv > 1e-4) {
        agent.vx += (dvx / dv) * maxDv;
        agent.vy += (dvy / dv) * maxDv;
      } else {
        agent.vx = desVx;
        agent.vy = desVy;
      }
      return;
    }

    // SPRINT / TURN-AND-RUN MODE:
    const targetAngle = Math.atan2(dy, dx);
    const currentSpeed = Math.hypot(agent.vx, agent.vy);
    const dotMotion = agent.vx * dx + agent.vy * dy;
    if (agent.facingAngle === undefined) {
      agent.facingAngle = targetAngle;
    } else if (currentSpeed >= 1.5 && dotMotion > 0) {
      let velDiff = Math.atan2(agent.vy, agent.vx) - agent.facingAngle;
      while (velDiff > Math.PI) velDiff -= Math.PI * 2;
      while (velDiff < -Math.PI) velDiff += Math.PI * 2;
      if (Math.abs(velDiff) > Math.PI * 0.55) {
        // Transitioning out of backward-facing FOOTWORK while already moving toward goal: align hips with momentum
        agent.facingAngle = Math.atan2(agent.vy, agent.vx);
      }
    }

    let angleDiff = targetAngle - agent.facingAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // At near-standstill (< 3.0 yd/s), humans pivot their hips in place rapidly without a wide turning radius
    if (currentSpeed < 3.0) {
      const lowSpeedTurnRate = 12.5 * this.dt;
      const clampedDelta = Math.max(-lowSpeedTurnRate, Math.min(lowSpeedTurnRate, angleDiff));
      agent.facingAngle += clampedDelta;
    } else {
      const centripetalMaxTurnRate = 13.5 / Math.max(1.8, currentSpeed);
      const effectiveTurnRate = Math.min(this.maxTurnRateRadSec, centripetalMaxTurnRate);
      const maxDeltaAngle = effectiveTurnRate * this.dt;
      const clampedAngleDelta = Math.max(-maxDeltaAngle, Math.min(maxDeltaAngle, angleDiff));
      agent.facingAngle += clampedAngleDelta;
    }

    const isHipFlip = Math.abs(angleDiff) > Math.PI * 0.70; // > 126 degrees hip flip
    const isSharpCut = Math.abs(angleDiff) > Math.PI * 0.44; // > 79 degrees cut
    const safeTurnSpeed = isHipFlip ? 2.4 : isSharpCut ? Math.min(effMaxSpeed * 0.72, 5.4) : effMaxSpeed;
    const desiredSpeed = Math.min(safeTurnSpeed, dist * 4.8);

    const desVx = Math.cos(agent.facingAngle) * desiredSpeed;
    const desVy = Math.sin(agent.facingAngle) * desiredSpeed;

    const { maxLinearAccelYps2 } = this.getPositionalKinematics(agent);
    const dvx = desVx - agent.vx;
    const dvy = desVy - agent.vy;
    const dv = Math.hypot(dvx, dvy);
    const isBraking = desVx * agent.vx + desVy * agent.vy < 0;
    const speedFrac = Math.min(1.0, currentSpeed / Math.max(1.0, maxSpeed));
    const taperedAccel = maxLinearAccelYps2 * Math.max(0.40, 1.0 - 0.46 * speedFrac);
    const maxLinearAccel = isBraking
      ? Math.min(10.5, maxLinearAccelYps2 + 1.8)
      : taperedAccel * snapScale;
    const maxDv = maxLinearAccel * this.dt;

    if (dv > maxDv && dv > 1e-4) {
      agent.vx += (dvx / dv) * maxDv;
      agent.vy += (dvy / dv) * maxDv;
    } else {
      agent.vx = desVx;
      agent.vy = desVy;
    }
  }

  private applyVelocityImpulse(
    agent: SimAgent,
    targetVx: number,
    targetVy: number,
    maxAccel = 15.2
  ): void {
    const dvx = targetVx - agent.vx;
    const dvy = targetVy - agent.vy;
    const dv = Math.hypot(dvx, dvy);
    const maxDv = maxAccel * this.dt;
    if (dv > maxDv && dv > 1e-4) {
      agent.vx += (dvx / dv) * maxDv;
      agent.vy += (dvy / dv) * maxDv;
    } else {
      agent.vx = targetVx;
      agent.vy = targetVy;
    }
  }

  private evaluateFrameMetrics(
    agents: SimAgent[],
    timeSec: number,
    playTerminated: boolean,
    termReason: PlayTickSnapshot['terminationReason'],
    tackledYards: number | null,
    ballState?: BallState,
    releasePocketIntegrity?: number | null
  ): { pocketIntegrity: number; trenchNetYards: number; expectedEpa: number } {
    const off = agents.filter((a) => a.side === 'OFF');
    const def = agents.filter((a) => a.side === 'DEF');
    const qb = off.find((a) => a.pos === 'QB') || off[0];
    const carrier = off.find((a) => a.assignment.role === 'BALL_CARRIER');

    // -------------------------------------------------------------------------
    // 0. RUINOUS LIVE-BALL LATERAL / BACKFIELD FUMBLE EPA SPIKES
    //    Unclamped negative EPA tail: defensive recovery in own backfield (-4.85 EPA)
    //    or downfield (-4.35 EPA); offensive recovery behind LOS (-2.55 EPA)
    // -------------------------------------------------------------------------
    if (termReason === 'FUMBLE_LOST') {
      const spot = tackledYards ?? 0;
      const lostEpa = spot < 0 ? -4.85 : -4.35;
      return {
        pocketIntegrity: 0.0,
        trenchNetYards: -1.5,
        expectedEpa: lostEpa,
      };
    }

    if (termReason === 'FUMBLE_RECOVERED') {
      const spot = tackledYards ?? -5.0;
      const recEpa =
        spot < 0
          ? Math.max(-2.90, -1.70 - 0.12 * Math.abs(spot))
          : spot < 3.0
          ? -1.45
          : -0.85;
      return {
        pocketIntegrity: 25.0,
        trenchNetYards: -0.8,
        expectedEpa: +recEpa.toFixed(2),
      };
    }

    // -------------------------------------------------------------------------
    // BIFURCATED EVALUATION: RUN PLAY vs PASS PLAY
    // -------------------------------------------------------------------------
    if (carrier && !ballState?.completedPass) {
      const losLinemen = off.filter(
        (a) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.pos) && Math.abs(a.startY) <= 1.5
      );
      const avgTrenchY =
        losLinemen.reduce((acc, a) => {
          const disp = Math.max(-2.5, Math.min(2.5, a.y - a.startY));
          return acc + disp + a.leverageScore * 0.4;
        }, 0) / Math.max(1, losLinemen.length);

      const netGain = (tackledYards !== null ? tackledYards : carrier.y) - 0.0;
      const isTd = termReason === 'TOUCHDOWN';
      return {
        pocketIntegrity: 100.0,
        trenchNetYards: +avgTrenchY.toFixed(2),
        expectedEpa: this.computeScrimmageGainEpa(netGain, isTd),
      };
    }

    // 2. PASS PLAY EVALUATION
    // Pass Pocket integrity: proximity from closest rusher to QB while QB holds the ball
    let pocketIntegrity = releasePocketIntegrity ?? 100.0;
    if (!ballState || ballState.state === 'HELD') {
      let minRushDist = 9.0;
      const coverageRoles = [
        'HOOK_CURL',
        'CURL_FLAT',
        'DEEP_ZONE',
        'DEEP_THIRD',
        'DEEP_HALF',
        'QUARTERS_MATCH',
        'ROBBER',
      ];
      for (const d of def) {
        if (d.defAssignment && coverageRoles.includes(d.defAssignment.role)) continue;
        if (d.defAssignment?.role === 'MAN_COV' && d.y > 1.2) continue;
        if (d.y < 3.5) {
          const dx = (d.x - qb.x) / 1.35;
          const dy = d.y - qb.y;
          const dist = Math.hypot(dx, dy);
          const isHeld = d.engagedWithId && d.leverageScore < 0.34;
          const effectiveDist = isHeld ? dist + 2.30 : dist;
          if (effectiveDist < minRushDist) minRushDist = effectiveDist;
        }
      }
      pocketIntegrity = Math.max(0, Math.min(100, ((minRushDist - 0.72) / 2.20) * 100));
    }

    // OL trench displacement in pass protection (measures pocket depth anchor relative to start)
    const passBlockers = off.filter((a) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.pos));
    const avgPassOlY =
      passBlockers.reduce((acc, a) => acc + (a.y - a.startY + a.leverageScore * 0.45), 0) /
      Math.max(1, passBlockers.length);

    if (termReason === 'SACK') {
      const sackDepth = Math.abs(tackledYards !== null ? tackledYards : qb.y);
      const sackEpa = -(1.15 + sackDepth * 0.065);
      return {
        pocketIntegrity: 0.0,
        trenchNetYards: +avgPassOlY.toFixed(2),
        expectedEpa: +sackEpa.toFixed(2),
      };
    }

    if (termReason === 'INCOMPLETE') {
      return {
        pocketIntegrity: +pocketIntegrity.toFixed(1),
        trenchNetYards: +avgPassOlY.toFixed(2),
        expectedEpa: -0.48,
      };
    }

    if (termReason === 'INTERCEPTION') {
      const spot = ballState?.targetY ?? tackledYards ?? 8.0;
      const intEpa = spot < 8.0 ? -4.95 : spot < 20.0 ? -4.55 : -4.15;
      return {
        pocketIntegrity: +pocketIntegrity.toFixed(1),
        trenchNetYards: +avgPassOlY.toFixed(2),
        expectedEpa: intEpa,
      };
    }

    if (
      termReason === 'COMPLETE' ||
      termReason === 'TOUCHDOWN' ||
      (ballState?.completedPass &&
        (termReason === 'TACKLED' ||
          termReason === 'OUT_OF_BOUNDS' ||
          termReason === 'WHISTLE'))
    ) {
      const gain = tackledYards !== null ? tackledYards : carrier ? carrier.y : 7.0;
      const isTd = termReason === 'TOUCHDOWN';
      return {
        pocketIntegrity: +pocketIntegrity.toFixed(1),
        trenchNetYards: +avgPassOlY.toFixed(2),
        expectedEpa: this.computeScrimmageGainEpa(gain, isTd),
      };
    }

    if (ballState?.completedPass && carrier) {
      return {
        pocketIntegrity: +pocketIntegrity.toFixed(1),
        trenchNetYards: +avgPassOlY.toFixed(2),
        expectedEpa: this.computeScrimmageGainEpa(carrier.y, false),
      };
    }

    // Receiver separation factoring depth window
    const skill = off.filter((a) => a.assignment.role === 'ROUTE');
    let bestSep = 0;
    for (const rec of skill) {
      let nearestDb = 10;
      for (const d of def) {
        const dist = Math.hypot(d.x - rec.x, d.y - rec.y);
        if (dist < nearestDb) nearestDb = dist;
      }
      const depthFactor = Math.max(0.2, (rec.y + 2) / 14);
      bestSep = Math.max(bestSep, nearestDb * depthFactor);
    }

    const expectedEpa = +(
      -0.35 +
      (pocketIntegrity / 100) * 0.55 +
      Math.max(-1.5, Math.min(1.0, avgPassOlY)) * 0.22 +
      Math.min(1.4, bestSep * 0.18)
    ).toFixed(2);

    return {
      pocketIntegrity: +pocketIntegrity.toFixed(1),
      trenchNetYards: +avgPassOlY.toFixed(2),
      expectedEpa,
    };
  }
}

// ============================================================================
// MACRO FORMATION & PERSONNEL ROCK-PAPER-SCISSORS (TEMPORALLY PRIOR MATCHUP)
// ============================================================================

export interface MacroRPSAnalysis {
  offPersonnel: string;
  defPersonnel: string;
  offConceptCategory: 'PASS' | 'RUN' | 'PLAY_ACTION';
  boxDefendersCount: number;
  blockersCount: number;
  boxDifferential: number; // blockers - boxDefenders (>0: Offense Run Advantage)
  verdict:
    | 'FAVORABLE_OFFENSE'
    | 'NEUTRAL'
    | 'FAVORABLE_DEFENSE'
    | 'SEVERE_DEFENSE_COUNTER'
    | 'EXPLOSIVE_OFFENSE_COUNTER';
  headline: string;
  tacticalDetail: string;
  recommendedAudible: string;
}

export function evaluateMacroMatchup(
  offPersonnel: string,
  offPlayId: string,
  offCategory: 'PASS' | 'RUN' | 'PLAY_ACTION',
  defCall: string,
  agents: SimAgent[]
): MacroRPSAnalysis {
  const defs = agents.filter((a) => a.side === 'DEF');
  const offs = agents.filter((a) => a.side === 'OFF');

  // Determine Defensive Personnel
  let defPersonnel = '4-2-5 NICKEL';
  if (defCall.startsWith('BASE_34_')) {
    defPersonnel = '3-4 BASE';
  } else if (defCall.startsWith('BASE_43_')) {
    defPersonnel = '4-3 BASE HEAVY';
  } else if (defCall.startsWith('DIME_') || defCall.includes('MUG') || defCall.includes('CROSSDOG')) {
    defPersonnel = '3-2-6 DIME / MUG';
  } else if (defCall.startsWith('GOAL_LINE_')) {
    defPersonnel = '6-2 GOAL LINE';
  } else if (defCall.startsWith('NICKEL_') || defCall.includes('SAFETY_BLITZ')) {
    defPersonnel = '4-2-5 NICKEL';
  }

  // Box Count (defenders within +/- 4.8 yards laterally and within 5.2 yards of LOS)
  const boxDefendersCount = defs.filter(
    (d) => Math.abs(d.startX) <= 4.8 && d.startY <= 5.2
  ).length;

  // Offensive Box Blockers (offensive line, tight ends, blocking backs in the tackle box)
  const blockerRoles: BlockRoleType[] = [
    'PASS_SET',
    'MAX_PROTECT_SCAN',
    'CHIP_RELEASE',
    'MAN_BLOCK',
    'GAP_ZONE',
    'COMBO_CLIMB',
    'PULL_LEAD',
    'PULL_TRAP',
  ];
  const boxBlockersCount = offs.filter(
    (o) => blockerRoles.includes(o.assignment.role) && Math.abs(o.startX) <= 5.2
  ).length;
  const boxDifferential = boxBlockersCount - boxDefendersCount;

  // Detect Play-Action
  const isPlayAction =
    offCategory === 'PLAY_ACTION' ||
    offPlayId.startsWith('PA_') ||
    offPlayId.includes('_BOOT') ||
    offs.some((a) => a.playAction?.enabled);

  const effectiveCategory: 'PASS' | 'RUN' | 'PLAY_ACTION' = isPlayAction
    ? 'PLAY_ACTION'
    : offCategory === 'RUN'
    ? 'RUN'
    : 'PASS';

  // 1. Play-Action vs Brian Flores Heavy Run Blitz (Cross-Dog, Edge Safety Crash, House Blitz)
  const isRunBlitzDef =
    defCall === 'VIKINGS_MUG_CROSSDOG_C0' ||
    defCall === 'VIKINGS_SAFETY_BLITZ_C1' ||
    defCall === 'DIME_MUG_C0';

  if (effectiveCategory === 'PLAY_ACTION' && isRunBlitzDef) {
    return {
      offPersonnel,
      defPersonnel,
      offConceptCategory: effectiveCategory,
      boxDefendersCount,
      blockersCount: boxBlockersCount,
      boxDifferential,
      verdict: 'SEVERE_DEFENSE_COUNTER',
      headline: '⚠️ VIKINGS RUN BLITZ SMOKES PLAY-ACTION AT MESH POINT',
      tacticalDetail:
        'Predetermined gap-shooting blitzer ignores play-action fake, arriving at QB in 1.15s while his back is turned in the mesh. Immediate sack & turnover hazard!',
      recommendedAudible:
        'Check out of Play-Action! Audible to Quick 3-Step Slant, Hot Bubble Screen, or 7-Man Max Protect.',
    };
  }

  // 2. Play-Action vs Reading Zone Linebackers
  const isReadingZoneDef =
    defCall === 'NICKEL_OVER_C3' ||
    defCall === 'NICKEL_UNDER_C1' ||
    defCall === 'BASE_34_BEAR_C4' ||
    defCall === 'NICKEL_WIDE9_C3' ||
    defCall === 'BASE_43_OVER_C1';

  if (effectiveCategory === 'PLAY_ACTION' && isReadingZoneDef) {
    return {
      offPersonnel,
      defPersonnel,
      offConceptCategory: effectiveCategory,
      boxDefendersCount,
      blockersCount: boxBlockersCount,
      boxDifferential,
      verdict: 'EXPLOSIVE_OFFENSE_COUNTER',
      headline: '🎯 PLAY-ACTION BAITS READING LBs DOWNHILL',
      tacticalDetail:
        'Zone linebackers bite 1.8y forward on low-hat run fake, opening a massive 12-18y intermediate void for Sail and Deep Crossers!',
      recommendedAudible:
        'Execute Play-Action! Primary intermediate receiver has isolated two-way leverage against retreating safeties.',
    };
  }

  // 3. Hot Quick Game / Slant vs Cover 0 House Blitz
  const isQuickHotPass =
    offPlayId.includes('QUICK_SLANT') ||
    offPlayId.includes('HOT') ||
    offPlayId.includes('SCREEN') ||
    offPlayId.includes('EVO_RUB_QUICK') ||
    offPlayId.includes('GLANCE') ||
    offPlayId.includes('RPO');

  if (isQuickHotPass && (defCall === 'DIME_MUG_C0' || defCall === 'VIKINGS_MUG_CROSSDOG_C0')) {
    return {
      offPersonnel,
      defPersonnel,
      offConceptCategory: effectiveCategory,
      boxDefendersCount,
      blockersCount: boxBlockersCount,
      boxDifferential,
      verdict: 'EXPLOSIVE_OFFENSE_COUNTER',
      headline: '⚡ HOT QUICK GAME EXPLOITS ZERO COVERAGE',
      tacticalDetail:
        'House blitz brings 6+ rushers, vacating underneath zones. Quick release at 1.65s hits receiver in stride against off-leverage for big YAC!',
      recommendedAudible:
        'Trust the hot route! Deliver ball on primary hitch with zero delay.',
    };
  }

  // 4. Heavy Run (12/21 Pers) vs Light Box (Dime / Sim / 5-Man Box)
  const isHeavyPersonnel =
    offPersonnel === '12 PERS' || offPersonnel === '21 PERS' || offPersonnel === '22 PERS';

  if (effectiveCategory === 'RUN' && isHeavyPersonnel && (defPersonnel.includes('DIME') || boxDefendersCount <= 5)) {
    return {
      offPersonnel,
      defPersonnel,
      offConceptCategory: effectiveCategory,
      boxDefendersCount,
      blockersCount: boxBlockersCount,
      boxDifferential,
      verdict: 'EXPLOSIVE_OFFENSE_COUNTER',
      headline: `💪 +${boxDifferential} BOX BLOCKER OVERMATCH`,
      tacticalDetail: `${boxBlockersCount} offensive blockers out-mass ${boxDefendersCount}-man light box. Double-teams easily displace down linemen and climb to second level.`,
      recommendedAudible:
        'Keep ball on ground! Power Duo / Inside Zone between the tackles has massive leverage.',
    };
  }

  // 5. Run into 8+ Man Loaded Box (Goal Line / 4-3 Heavy / Bear)
  if (effectiveCategory === 'RUN' && (boxDefendersCount >= 8 || boxDifferential <= -2)) {
    return {
      offPersonnel,
      defPersonnel,
      offConceptCategory: effectiveCategory,
      boxDefendersCount,
      blockersCount: boxBlockersCount,
      boxDifferential,
      verdict: 'FAVORABLE_DEFENSE',
      headline: `🛑 -${Math.abs(boxDifferential)} LOADED BOX DEFICIT`,
      tacticalDetail:
        'Defense commits 8+ men into the box. Unblocked free hitter will meet running back at or behind the line of scrimmage.',
      recommendedAudible:
        'Check to RPO Glance, Bubble Screen, or 1-on-1 Outside Fade.',
    };
  }

  // 6. 5-Man Pro Slow Dropback vs Double A-Gap Mug Blitz
  const isSlowDropback =
    effectiveCategory === 'PASS' &&
    (offPlayId.includes('DAGGER') ||
      offPlayId.includes('FOUR_VERTS') ||
      offPlayId.includes('MESH'));

  if (isSlowDropback && (defCall === 'DIME_MUG_C0' || defCall === 'VIKINGS_MUG_CROSSDOG_C0')) {
    return {
      offPersonnel,
      defPersonnel,
      offConceptCategory: effectiveCategory,
      boxDefendersCount,
      blockersCount: boxBlockersCount,
      boxDifferential,
      verdict: 'FAVORABLE_DEFENSE',
      headline: '⚠️ 5-MAN PROTECTION POCKET COLLAPSE',
      tacticalDetail:
        'Double A-gap mug overloads 5-man slide protection. Rusher arrives in 2.1s before deep stems can break.',
      recommendedAudible:
        'Audible to 50/51 Half-Slide with RB Max Protect, or check to 3-step Quick Slant.',
    };
  }

  // 7. General Hat Count Advantage / Disadvantage
  if (effectiveCategory === 'RUN') {
    if (boxDifferential > 0) {
      return {
        offPersonnel,
        defPersonnel,
        offConceptCategory: effectiveCategory,
        boxDefendersCount,
        blockersCount: boxBlockersCount,
        boxDifferential,
        verdict: 'FAVORABLE_OFFENSE',
        headline: `✅ +${boxDifferential} RUN BOX ADVANTAGE`,
        tacticalDetail: `Offense has ${boxBlockersCount} blockers against ${boxDefendersCount} in the box. Mathematical numbers advantage for ground game.`,
        recommendedAudible: 'Run according to primary play-side gap.',
      };
    } else if (boxDifferential < 0) {
      return {
        offPersonnel,
        defPersonnel,
        offConceptCategory: effectiveCategory,
        boxDefendersCount,
        blockersCount: boxBlockersCount,
        boxDifferential,
        verdict: 'FAVORABLE_DEFENSE',
        headline: `⚠️ ${boxDifferential} DEFENSIVE BOX OVERLOAD`,
        tacticalDetail: `Defense commits ${boxDefendersCount} defenders against ${boxBlockersCount} blockers. Unblocked defender present in run fits.`,
        recommendedAudible: 'Check to play-action or edge RPO.',
      };
    }
  }

  return {
    offPersonnel,
    defPersonnel,
    offConceptCategory: effectiveCategory,
    boxDefendersCount,
    blockersCount: boxBlockersCount,
    boxDifferential,
    verdict: 'NEUTRAL',
    headline: '⚖️ BALANCED FORMATION MATCHUP',
    tacticalDetail: `${offPersonnel} vs ${defPersonnel} with ${boxDefendersCount}-man box. Execution and individual leverage determine play outcome.`,
    recommendedAudible: 'Execute base concept as called.',
  };
}
