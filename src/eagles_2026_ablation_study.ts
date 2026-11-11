import {
  All22KinematicEngine,
  SimAgent,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
} from './engine';

const engine = new All22KinematicEngine();

// ============================================================================
// 2026 PHILADELPHIA EAGLES ABLATION PROFILE
// - Compromised OL (lost Kelce, Mailata/Lane degraded, leaky interior anchor)
// - No Saquon Barkley (replacement/practice squad RBs: poor blitz pick-up, low YAC)
// - No AJ Brown (DeVonta Smith is WR1; WR2/WR3 lack separation)
// - No blocking TEs (flex/receiving TEs cannot seal C-gap)
// - Jalen Hurts: Elite deep ball touch, elite QB power runner, slow processor, won't throw into tight windows
// ============================================================================

interface SystemResult {
  systemName: string;
  category: 'PASS' | 'RUN';
  playName: string;
  front: string;
  runs: number;
  meanEpa: number;
  successRate: number;
  meanYards: number;
  sackRate?: number;
  pressureRate?: number;
  meanTimeToThrow?: number;
  stuffRate?: number;
  explosiveRate?: number;
  scrambleRate?: number;
}

function createAblatedEaglesOffense(
  scheme:
    | 'CONV_DROPBACK_DAGGER'
    | 'CONV_DROPBACK_MESH'
    | 'CONV_HB_INSIDE_ZONE'
    | 'CONV_HB_DUO'
    | 'UNDER_CENTER_STRETCH'
    | 'UNDER_CENTER_BOOT'
    | 'OPT_QB_COUNTER_BASH'
    | 'OPT_QB_POWER_INSERT'
    | 'OPT_7MAN_MAX_DEEP_SHOT'
    | 'OPT_JET_RPO_GLANCE'
): SimAgent[] {
  // Compromised OL: Power 72-74, Finesse 70-74 (down from 90+)
  const ol = (id: string, pos: string, x: number, y: number, role: BlockRoleType, gap: GapOrSetCode, t1: string | null = null, t2: string | null = null, lev: LeverageBias = 'INSIDE_OUT', wps: any[] = []) => ({
    id, label: pos, side: 'OFF' as const, pos,
    startX: x, startY: y, x, y, vx: 0, vy: 0, fx: 0, fy: 0,
    engagedWithId: null, leverageScore: 0,
    ratings: { speed: 68, accel: 72, power: 73, finesse: 71, awareness: 75 }, // Leaky 2026 OL
    assignment: { role, primaryTargetId: t1, secondaryTargetId: t2, gapOrSet: gap, leverage: lev, climbOrChipDelaySec: 0.65, waypoints: wps }
  });

  // Replacement RB: low power (70), low speed (82), poor pass pro
  const rb = (x: number, y: number, role: BlockRoleType, gap: GapOrSetCode, t1: string | null = null, t2: string | null = null, levOrWps?: LeverageBias | any[], maybeWps?: any[]) => {
    let leverage: LeverageBias = 'INSIDE_OUT';
    let waypoints: any[] = [];
    if (typeof levOrWps === 'string') {
      leverage = levOrWps as LeverageBias;
      waypoints = Array.isArray(maybeWps) ? maybeWps : [];
    } else if (Array.isArray(levOrWps)) {
      waypoints = levOrWps;
    }
    return {
      id: 'RB', label: 'RB', side: 'OFF' as const, pos: 'RB',
      startX: x, startY: y, x, y, vx: 0, vy: 0, fx: 0, fy: 0,
      engagedWithId: null, leverageScore: 0,
      ratings: { speed: 82, accel: 82, power: 70, finesse: 72, awareness: 70 }, // Practice squad RB
      assignment: { role, primaryTargetId: t1, secondaryTargetId: t2, gapOrSet: gap, leverage, climbOrChipDelaySec: 0, waypoints }
    };
  };

  // Flex TE: detached pass catcher, cannot block defensive ends (power 64)
  const te = (x: number, y: number, role: BlockRoleType, gap: GapOrSetCode, t1: string | null = null, t2: string | null = null, levOrWps?: LeverageBias | any[], maybeWps?: any[]) => {
    let leverage: LeverageBias = 'OUTSIDE_IN';
    let waypoints: any[] = [];
    if (typeof levOrWps === 'string') {
      leverage = levOrWps as LeverageBias;
      waypoints = Array.isArray(maybeWps) ? maybeWps : [];
    } else if (Array.isArray(levOrWps)) {
      waypoints = levOrWps;
    }
    return {
      id: 'TE', label: 'TE', side: 'OFF' as const, pos: 'TE',
      startX: x, startY: y, x, y, vx: 0, vy: 0, fx: 0, fy: 0,
      engagedWithId: null, leverageScore: 0,
      ratings: { speed: 84, accel: 84, power: 64, finesse: 78, awareness: 82 }, // Poor blocking TE
      assignment: { role, primaryTargetId: t1, secondaryTargetId: t2, gapOrSet: gap, leverage, climbOrChipDelaySec: 0.65, waypoints }
    };
  };

  // DeVonta Smith (WR1): elite boundary separator, deep ball tracker
  const devonta = (x: number, y: number, wps: any[]) => ({
    id: 'WR1', label: 'WR', name: 'DeVonta Smith', side: 'OFF' as const, pos: 'WR',
    startX: x, startY: y, x, y, vx: 0, vy: 0, fx: 0, fy: 0,
    engagedWithId: null, leverageScore: 0,
    ratings: { speed: 92, accel: 92, power: 58, finesse: 93, awareness: 90 },
    assignment: { role: 'ROUTE' as const, primaryTargetId: null, secondaryTargetId: null, gapOrSet: 'VERTICAL_DEEP' as const, leverage: 'NEUTRAL' as const, climbOrChipDelaySec: 0, waypoints: wps }
  });

  // WR2 / Slot (Dotson / Covey): average separation, no AJ Brown
  const wr2 = (id: string, pos: string, x: number, y: number, wps: any[]) => ({
    id, label: pos, side: 'OFF' as const, pos,
    startX: x, startY: y, x, y, vx: 0, vy: 0, fx: 0, fy: 0,
    engagedWithId: null, leverageScore: 0,
    ratings: { speed: 88, accel: 88, power: 60, finesse: 76, awareness: 78 },
    assignment: { role: 'ROUTE' as const, primaryTargetId: null, secondaryTargetId: null, gapOrSet: 'VERTICAL_DEEP' as const, leverage: 'NEUTRAL' as const, climbOrChipDelaySec: 0, waypoints: wps }
  });

  // Jalen Hurts: Elite vertical touch (90), elite QB power runner (power 92), slow processor (68)
  const hurts = (role: 'QB_DROP' | 'BALL_CARRIER', wps: any[]) => ({
    id: 'QB', label: 'QB', name: 'Jalen Hurts', side: 'OFF' as const, pos: 'QB',
    startX: 0.0, startY: -4.5, x: 0.0, y: -4.5, vx: 0, vy: 0, fx: 0, fy: 0,
    engagedWithId: null, leverageScore: 0,
    ratings: { speed: 86, accel: 88, power: 92, finesse: 84, awareness: 68 }, // High leg drive, slow processor
    assignment: { role, primaryTargetId: null, secondaryTargetId: null, gapOrSet: 'VERTICAL_DEEP' as const, leverage: 'NEUTRAL' as const, climbOrChipDelaySec: 0, waypoints: wps }
  });

  // ==========================================================================
  // PHILOSOPHY 1: CONVENTIONAL DROPBACK SPREAD (5-MAN PROTECTION)
  // ==========================================================================
  if (scheme === 'CONV_DROPBACK_DAGGER') {
    return [
      ol('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
      ol('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
      ol('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
      ol('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
      ol('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
      te(4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, [{ x: 5.5, y: 12.0 }, { x: 9.0, y: 14.0 }]), // Seam/Out
      devonta(-14.0, -0.3, [{ x: -14.0, y: 16.0 }, { x: -4.0, y: 16.5 }]), // 16y Dig (requires tight window throw)
      wr2('SL', 'SL', -7.0, -0.9, [{ x: -7.0, y: 22.0 }]), // Clearout
      wr2('WR2', 'WR', 14.0, -0.3, [{ x: 14.0, y: 5.0 }, { x: 4.0, y: 6.0 }]), // Shallow cross
      rb(1.8, -4.6, 'PASS_SET', 'B_RIGHT', '3T', null), // 6-man pass pro with replacement RB
      hurts('QB_DROP', [{ x: 0.0, y: -6.5 }])
    ];
  }

  if (scheme === 'CONV_DROPBACK_MESH') {
    return [
      ol('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
      ol('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
      ol('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
      ol('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
      ol('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
      te(4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, [{ x: 4.8, y: 5.5 }, { x: -8.0, y: 6.0 }]), // Shallow cross L
      devonta(-14.0, -0.3, [{ x: -14.0, y: 14.0 }, { x: -14.0, y: 24.0 }]), // Deep post/rail
      wr2('SL', 'SL', -7.0, -0.9, [{ x: -7.0, y: 5.0 }, { x: 8.0, y: 5.5 }]), // Shallow cross R (Mesh)
      wr2('WR2', 'WR', 14.0, -0.3, [{ x: 14.0, y: 12.0 }, { x: 16.0, y: 14.0 }]), // Speed out
      rb(1.8, -4.6, 'ROUTE', 'VERTICAL_DEEP', null, null, [{ x: 6.0, y: -2.0 }, { x: 10.0, y: 3.0 }]), // Wheel
      hurts('QB_DROP', [{ x: 0.0, y: -6.0 }])
    ];
  }

  if (scheme === 'CONV_HB_INSIDE_ZONE') {
    return [
      ol('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'OUTSIDE_IN'),
      ol('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      ol('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL'),
      ol('RG', 'RG', 1.6, -0.3, 'MAN_BLOCK', 'B_RIGHT', '3T', null, 'INSIDE_OUT'),
      ol('RT', 'RT', 3.2, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
      te(4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'OUTSIDE_IN'), // Poor blocking TE on edge
      devonta(-14.0, -0.3, [{ x: -14.0, y: 8.0 }]),
      wr2('SL', 'SL', -7.0, -0.9, [{ x: -7.0, y: 8.0 }]),
      wr2('WR2', 'WR', 14.0, -0.3, [{ x: 14.0, y: 8.0 }]),
      hurts('QB_DROP', [{ x: 0.0, y: -4.5 }]),
      rb(1.8, -4.8, 'BALL_CARRIER', 'A_LEFT', null, null, [
        { x: -0.5, y: -1.0 },
        { x: -0.8, y: 3.5 },
        { x: -1.0, y: 12.0 }
      ])
    ];
  }

  // ==========================================================================
  // PHILOSOPHY 2: UNDER-CENTER OUTSIDE ZONE & NAKED BOOT
  // ==========================================================================
  if (scheme === 'UNDER_CENTER_STRETCH') {
    return [
      ol('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'C_LEFT', 'RDE', null, 'OUTSIDE_IN'),
      ol('LG', 'LG', -1.6, -0.3, 'GAP_ZONE', 'B_LEFT', 'NT', null, 'OUTSIDE_IN'),
      ol('C', 'C', 0.0, -0.2, 'GAP_ZONE', 'A_LEFT', 'NT', null, 'OUTSIDE_IN'),
      ol('RG', 'RG', 1.6, -0.3, 'GAP_ZONE', 'B_RIGHT', '3T', null, 'OUTSIDE_IN'),
      ol('RT', 'RT', 3.2, -0.4, 'GAP_ZONE', 'C_RIGHT', 'LDE', null, 'OUTSIDE_IN'),
      te(-4.8, -0.4, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'OUTSIDE_IN'), // TE reach block (fails against 270lb EDGE)
      devonta(-14.0, -0.3, [{ x: -14.0, y: 12.0 }]),
      wr2('SL', 'FB', 0.0, -2.8, 'MAN_BLOCK', 'C_LEFT', 'WILL', null, 'OUTSIDE_IN'),
      wr2('WR2', 'WR', 14.0, -0.3, [{ x: 14.0, y: 12.0 }]),
      hurts('QB_DROP', [{ x: 0.0, y: -2.0 }]),
      rb(0.0, -4.8, 'BALL_CARRIER', 'C_LEFT', null, null, [
        { x: -3.8, y: -2.0 },
        { x: -6.2, y: 1.5 },
        { x: -7.5, y: 10.0 }
      ])
    ];
  }

  // ==========================================================================
  // PHILOSOPHY 3: ASYMMETRIC QB-CENTRIC POWER & MAX-PROTECT DEEP CHOICE
  // - Hurts is primary runner (+1 blocker math beats degraded OL)
  // - 7-Man Max Protection guarantees 3.2s+ pocket for elite deep ball
  // - Continuous Jet Motion forces pre-snap Man/Zone tell
  // ==========================================================================
  if (scheme === 'OPT_QB_COUNTER_BASH') {
    // QB Counter Bash: RB fakes perimeter sweep left; LG + TE pull right; Hurts runs counter right!
    return [
      ol('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
      ol('LG', 'LG', -1.6, -0.3, 'PULL_TRAP', 'B_RIGHT', '3T', null, 'OUTSIDE_IN', [
        { x: -0.5, y: -1.5 },
        { x: 1.8, y: -0.5 },
        { x: 2.2, y: 2.0 }
      ]),
      ol('C', 'C', 0.0, -0.2, 'MAN_BLOCK', 'A_LEFT', 'NT', null, 'OUTSIDE_IN'),
      ol('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'INSIDE_OUT'),
      ol('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
      // TE (H-Back alignment): pulls and wraps around RT as second lead blocker!
      te(-2.4, -1.8, 'PULL_LEAD', 'C_RIGHT', 'WILL', null, 'OUTSIDE_IN', [
        { x: 0.0, y: -2.2 },
        { x: 2.8, y: -1.2 },
        { x: 3.6, y: 3.5 }
      ]),
      devonta(14.0, -0.3, [{ x: 14.0, y: 8.0 }]), // Deep stalk block
      wr2('SL', 'WR', -14.0, -0.3, [{ x: -14.0, y: 8.0 }]),
      wr2('WR2', 'WR', 7.5, -0.8, [{ x: 7.5, y: 8.0 }]),
      // RB: Jet sweep decoy left (freezes backside defensive end and WILL)
      rb(1.8, -4.5, 'BALL_CARRIER', 'D_ALLEY', null, null, [
        { x: -4.5, y: -3.5 },
        { x: -12.0, y: 0.5 }
      ]),
      // HURTS: PRIMARY BALL CARRIER! Delays 0.25s then cuts behind pulling LG + H-Back!
      hurts('BALL_CARRIER', [
        { x: 0.0, y: -4.5 },
        { x: 1.5, y: -2.0 },
        { x: 3.2, y: 2.5 },
        { x: 3.8, y: 12.0 }
      ])
    ];
  }

  if (scheme === 'OPT_7MAN_MAX_DEEP_SHOT') {
    // 7-Man Max Protection Deep Choice:
    // 5 OL + TE chip/block + RB scan lock pocket for 3.4s!
    // DeVonta Smith runs Deep Post-Corner choice; Slot runs deep crossing alert.
    // Built-in scramble lane for Hurts if covered!
    return [
      ol('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'ANGLE_45', 'RDE', null, 'OUTSIDE_IN'),
      ol('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', 'NT', null, 'INSIDE_OUT'),
      ol('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', 'NT', 'MIKE', 'NEUTRAL'),
      ol('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', '3T', null, 'INSIDE_OUT'),
      ol('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', 'LDE', null, 'OUTSIDE_IN'),
      // TE: Heavy pass pro seal on Edge
      te(4.8, -0.4, 'PASS_SET', 'C_RIGHT', 'LDE', null, 'OUTSIDE_IN'),
      // RB: Scan protection on interior A/B gap
      rb(-1.8, -4.5, 'MAX_PROTECT_SCAN', 'A_LEFT', 'MIKE', 'WILL'),
      // DeVonta Smith: Deep Boundary Post (90 Deep Ball bucket throw!)
      devonta(14.0, -0.3, [
        { x: 14.0, y: 14.0 },
        { x: 4.0, y: 26.0 } // 26y Deep Post
      ]),
      // Slot: Deep Over / Crosser
      wr2('SL', 'SL', -7.5, -0.8, [
        { x: -7.5, y: 12.0 },
        { x: 12.0, y: 15.0 } // 15y Sail Cross
      ]),
      wr2('WR2', 'WR', -14.0, -0.3, [{ x: -14.0, y: 28.0 }]), // Deep clearout streak
      // Hurts: QB Drop with 3.4s deep release window or wide open B-gap scramble!
      hurts('QB_DROP', [{ x: 0.0, y: -7.0 }])
    ];
  }

  if (scheme === 'OPT_JET_RPO_GLANCE') {
    // Jet Motion RPO Glance:
    // Slot goes in 5.8 yd/s jet motion to confirm coverage.
    // If Man: DeVonta on single-coverage glance slant.
    // If Zone: Hurts keeps on QB Power behind C/RG!
    const slotAgent = wr2('SL', 'SL', -8.5, -1.6, [{ x: 12.0, y: 2.0 }]);
    slotAgent.preSnapMotion = {
      enabled: true,
      type: 'JET_RIGHT' as const,
      speed: 5.8,
      dirX: 1.0,
      dirY: 0.0,
      originX: -8.5,
      originY: -1.6,
      snapX: -0.6,
      snapY: -1.5
    };

    return [
      ol('LT', 'LT', -3.2, -0.4, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
      ol('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'INSIDE_OUT'),
      ol('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
      ol('RG', 'RG', 1.6, -0.3, 'MAN_BLOCK', 'B_RIGHT', '3T', null, 'INSIDE_OUT'),
      ol('RT', 'RT', 3.2, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'OUTSIDE_IN'),
      te(4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'OUTSIDE_IN'),
      slotAgent,
      devonta(-14.0, -0.3, [{ x: -14.0, y: 6.0 }, { x: -8.0, y: 9.0 }]), // Quick glance route
      wr2('WR2', 'WR', 14.0, -0.3, [{ x: 14.0, y: 15.0 }]),
      rb(1.8, -4.5, 'BALL_CARRIER', 'B_RIGHT', null, null, [{ x: 4.0, y: 1.0 }]),
      hurts('BALL_CARRIER', [
        { x: 0.0, y: -4.5 },
        { x: -0.8, y: -1.0 },
        { x: -0.5, y: 5.0 },
        { x: 0.0, y: 14.0 }
      ])
    ];
  }

  return [];
}

// 5 Canonical NFL Defenses
function createDefense(front: string): SimAgent[] {
  const d = (id: string, pos: string, x: number, y: number, role: any, tx: number, ty: number, man?: string) => ({
    id, label: pos, side: 'DEF' as const, pos,
    startX: x, startY: y, x, y, vx: 0, vy: 0, fx: 0, fy: 0,
    engagedWithId: null, leverageScore: 0,
    ratings: { speed: 85, accel: 87, power: 88, finesse: 86, awareness: 86 },
    assignment: { role: 'MAN_BLOCK' as const, primaryTargetId: null, secondaryTargetId: null, gapOrSet: 'VERTICAL_DEEP' as const, leverage: 'NEUTRAL' as const, climbOrChipDelaySec: 0, waypoints: [] },
    defAssignment: { role, targetX: tx, targetY: ty, manTargetId: man }
  });

  switch (front) {
    case 'NICKEL_OVER_C3':
      return [
        d('RDE', 'DE', -4.4, 0.6, 'CONTAIN_EDGE', -3.8, -5.0),
        d('NT', 'NT', -1.2, 0.5, 'RUSH_GAP', -0.8, -4.0),
        d('3T', 'DT', 1.8, 0.5, 'RUSH_GAP', 1.5, -4.0),
        d('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
        d('WILL', 'WILL', -2.2, 4.2, 'HOOK_CURL', -2.5, 3.5),
        d('MIKE', 'MIKE', 1.5, 4.2, 'HOOK_CURL', 1.8, 3.5),
        d('NCB', 'NI', -7.0, 3.0, 'CURL_FLAT', -7.5, 4.5),
        d('CB1', 'CB', -14.0, 6.0, 'DEEP_THIRD', -14.0, 16.0),
        d('CB2', 'CB', 14.0, 6.0, 'DEEP_THIRD', 14.0, 16.0),
        d('SS', 'SS', 5.5, 5.0, 'CURL_FLAT', 7.5, 4.8),
        d('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
      ];

    case 'NICKEL_UNDER_C1':
      return [
        d('LDE', 'DE', -4.4, 0.6, 'CONTAIN_EDGE', -3.8, -5.0),
        d('3T', 'DT', -2.1, 0.5, 'RUSH_GAP', -1.8, -4.0),
        d('NT', 'NT', 0.8, 0.5, 'RUSH_GAP', 0.5, -4.0),
        d('RDE', 'EDGE', 5.2, 0.6, 'BLITZ_EDGE', 4.0, -5.0),
        d('WILL', 'WILL', -1.2, 4.2, 'HOOK_CURL', -1.5, 3.5),
        d('MIKE', 'MIKE', 2.2, 4.2, 'HOOK_CURL', 2.0, 3.5),
        d('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL'),
        d('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1'),
        d('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2'),
        d('SS', 'SS', 0.0, 6.0, 'ROBBER', 0.0, 6.5),
        d('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0),
      ];

    case 'BASE_34_BEAR_C4':
      return [
        d('LOLB', 'EDGE', -5.0, 0.6, 'CONTAIN_EDGE', -4.2, -5.0),
        d('4i_L', 'DE', -2.2, 0.5, 'RUSH_GAP', -1.9, -4.0),
        d('0T_NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0),
        d('4i_R', 'DE', 2.2, 0.5, 'RUSH_GAP', 1.9, -4.0),
        d('ROLB', 'EDGE', 5.4, 0.6, 'CONTAIN_EDGE', 4.5, -5.0),
        d('WILL', 'ILB', -1.2, 4.5, 'HOOK_CURL', -1.5, 3.8),
        d('MIKE', 'ILB', 1.2, 4.5, 'HOOK_CURL', 1.5, 3.8),
        d('CB1', 'CB', -14.0, 7.0, 'QUARTERS_MATCH', -14.0, 15.0),
        d('CB2', 'CB', 14.0, 7.0, 'QUARTERS_MATCH', 14.0, 15.0),
        d('FS', 'FS', -5.0, 10.5, 'QUARTERS_MATCH', -6.0, 16.0),
        d('SS', 'SS', 5.0, 10.5, 'QUARTERS_MATCH', 6.0, 16.0),
      ];

    case 'DIME_MUG_C0':
      return [
        d('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0),
        d('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0),
        d('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0),
        d('WILL', 'WILL', -0.8, 1.1, 'BLITZ_A', -0.5, -4.5),
        d('MIKE', 'MIKE', 0.8, 1.1, 'BLITZ_A', 0.5, -4.5),
        d('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL'),
        d('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1'),
        d('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2'),
        d('SS', 'SS', 5.8, 2.8, 'MAN_COV', 5.0, 1.5, 'TE'),
        d('FS', 'FS', -2.5, 3.2, 'MAN_COV', -2.0, 1.5, 'RB'),
        d('DIME', 'DB', 5.2, 4.0, 'BLITZ_EDGE', 4.5, -5.0),
      ];

    case 'NICKEL_SIM_C2':
    default:
      return [
        d('LDE', 'DE', -4.2, 0.6, 'CURL_FLAT', -5.5, 3.8),
        d('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0),
        d('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0),
        d('RDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
        d('NCB', 'NI', -6.8, 2.5, 'BLITZ_EDGE', -3.5, -4.5),
        d('WILL', 'WILL', -2.5, 4.2, 'HOOK_CURL', -3.0, 4.0),
        d('MIKE', 'MIKE', 0.0, 4.2, 'HOOK_CURL', 0.0, 11.0),
        d('CB1', 'CB', -14.2, 4.5, 'CURL_FLAT', -13.5, 4.5),
        d('CB2', 'CB', 14.2, 4.5, 'CURL_FLAT', 13.5, 4.5),
        d('FS', 'FS', -7.5, 12.5, 'DEEP_HALF', -8.5, 17.0),
        d('SS', 'SS', 7.5, 12.5, 'DEEP_HALF', 8.5, 17.0),
      ];
  }
}

async function runAblationStudy() {
  console.log('========================================================================================');
  console.log('2026 PHILADELPHIA EAGLES PHILOSOPHICAL RE-ARCHITECTURE & ROSTER ABLATION STUDY');
  console.log('Evaluating 3 Offensive Philosophies across 5 Defensive Fronts (N=50 Snaps/Cell = 1,500 Snaps)');
  console.log('Roster Ablations: Leaky OL (Power 73), No Saquon, No AJ Brown, No Blocking TE, Jalen Hurts');
  console.log('========================================================================================\n');

  const testMatrix: Array<{
    system: string;
    scheme: Parameters<typeof createAblatedEaglesOffense>[0];
    category: 'PASS' | 'RUN';
    label: string;
  }> = [
    // 1. Philosophy 1: Conventional Dropback Spread
    { system: '1. CONV DROPBACK SPREAD', scheme: 'CONV_DROPBACK_DAGGER', category: 'PASS', label: '5-MAN PRO DAGGER' },
    { system: '1. CONV DROPBACK SPREAD', scheme: 'CONV_DROPBACK_MESH', category: 'PASS', label: 'SPREAD MESH (5-OUT)' },
    { system: '1. CONV DROPBACK SPREAD', scheme: 'CONV_HB_INSIDE_ZONE', category: 'RUN', label: 'HB INSIDE ZONE (BACKUP RB)' },

    // 2. Philosophy 2: Under-Center West Coast Run
    { system: '2. UC WEST COAST RUN', scheme: 'UNDER_CENTER_STRETCH', category: 'RUN', label: 'WIDE ZONE STRETCH' },

    // 3. Philosophy 3: Asymmetric QB-Centric Heavy Gun-Tite & Deep Choice
    { system: '3. QB-CENTRIC GUN-TITE', scheme: 'OPT_QB_COUNTER_BASH', category: 'RUN', label: 'QB COUNTER BASH (+1 RUN)' },
    { system: '3. QB-CENTRIC GUN-TITE', scheme: 'OPT_7MAN_MAX_DEEP_SHOT', category: 'PASS', label: '7-MAN MAX DEEP SHOT' },
    { system: '3. QB-CENTRIC GUN-TITE', scheme: 'OPT_JET_RPO_GLANCE', category: 'RUN', label: 'JET RPO QB KEEPER' },
  ];

  const fronts = [
    'NICKEL_OVER_C3',
    'NICKEL_UNDER_C1',
    'BASE_34_BEAR_C4',
    'DIME_MUG_C0',
    'NICKEL_SIM_C2',
  ];

  const results: SystemResult[] = [];
  const N_RUNS = 40; // 40 snaps per cell * 7 concepts * 5 fronts = 1,400 total snaps

  for (const item of testMatrix) {
    for (const f of fronts) {
      let sumEpa = 0;
      let sumYds = 0;
      let successes = 0;
      let sacks = 0;
      let pressures = 0;
      let stuffs = 0;
      let explosives = 0;
      let sumTtt = 0;

      for (let r = 0; r < N_RUNS; r++) {
        const off = createAblatedEaglesOffense(item.scheme);
        const def = createDefense(f);
        const agents = [...off, ...def];

        const traj = engine.simulatePlay(agents, 1.0);
        const term = traj.find((s) => s.playOver) || traj[traj.length - 1];

        sumEpa += term.expectedEpa;
        const yds = term.carrierTackledYards ?? 0;
        sumYds += yds;

        if (item.category === 'PASS') {
          if (term.terminationReason === 'SACK') sacks++;
          const minPocket = Math.min(...traj.map((s) => s.pocketIntegrity));
          if (minPocket < 45 || term.terminationReason === 'SACK') pressures++;
          sumTtt += term.timeToThrowOrGapSec ?? term.timeSec;
          const isSuccess = term.terminationReason !== 'SACK' && term.terminationReason !== 'INCOMPLETE' && term.expectedEpa > 0;
          if (isSuccess) successes++;
        } else {
          if (yds <= 0.0) stuffs++;
          if (yds >= 10.0) explosives++;
          if (term.expectedEpa > 0 || yds >= 4.0) successes++;
        }
      }

      results.push({
        systemName: item.system,
        category: item.category,
        playName: item.label,
        front: f,
        runs: N_RUNS,
        meanEpa: +(sumEpa / N_RUNS).toFixed(2),
        successRate: +((successes / N_RUNS) * 100).toFixed(1),
        meanYards: +(sumYds / N_RUNS).toFixed(1),
        sackRate: item.category === 'PASS' ? +((sacks / N_RUNS) * 100).toFixed(1) : undefined,
        pressureRate: item.category === 'PASS' ? +((pressures / N_RUNS) * 100).toFixed(1) : undefined,
        meanTimeToThrow: item.category === 'PASS' ? +(sumTtt / N_RUNS).toFixed(2) : undefined,
        stuffRate: item.category === 'RUN' ? +((stuffs / N_RUNS) * 100).toFixed(1) : undefined,
        explosiveRate: item.category === 'RUN' ? +((explosives / N_RUNS) * 100).toFixed(1) : undefined,
      });
    }
  }

  console.log('-------------------------------------------------------------------------------------------------------------');
  console.log('SYSTEM BREAKDOWN BY DEFENSIVE FRONT:');
  console.log('-------------------------------------------------------------------------------------------------------------');
  for (const r of results) {
    if (r.category === 'PASS') {
      console.log(
        `${r.systemName.padEnd(24)} | ${r.playName.padEnd(20)} | ${r.front.padEnd(17)} | EPA: ${String(r.meanEpa).padStart(5)} | SR: ${String(r.successRate + '%').padStart(6)} | Press: ${String(r.pressureRate + '%').padStart(6)} | Sack: ${String(r.sackRate + '%').padStart(5)} | TTT: ${r.meanTimeToThrow}s`
      );
    } else {
      console.log(
        `${r.systemName.padEnd(24)} | ${r.playName.padEnd(20)} | ${r.front.padEnd(17)} | EPA: ${String(r.meanEpa).padStart(5)} | SR: ${String(r.successRate + '%').padStart(6)} | YPC: ${String(r.meanYards + 'y').padStart(6)} | Stuff: ${String(r.stuffRate + '%').padStart(5)} | Expl: ${String(r.explosiveRate + '%').padStart(5)}`
      );
    }
  }

  // Aggregate by System
  console.log('\n========================================================================================');
  console.log('PHILOSOPHICAL AGGREGATE SUMMARY COMPARISON (2026 EAGLES ABLATION):');
  console.log('========================================================================================');

  const systems = ['1. CONV DROPBACK SPREAD', '2. UC WEST COAST RUN', '3. QB-CENTRIC GUN-TITE'];

  for (const sys of systems) {
    const sysRows = results.filter((r) => r.systemName === sys);
    const passRows = sysRows.filter((r) => r.category === 'PASS');
    const runRows = sysRows.filter((r) => r.category === 'RUN');

    const avgPassEpa = passRows.length > 0 ? +(passRows.reduce((a, b) => a + b.meanEpa, 0) / passRows.length).toFixed(2) : 0;
    const avgPassSr = passRows.length > 0 ? +(passRows.reduce((a, b) => a + b.successRate, 0) / passRows.length).toFixed(1) : 0;
    const avgSack = passRows.length > 0 ? +(passRows.reduce((a, b) => a + (b.sackRate || 0), 0) / passRows.length).toFixed(1) : 0;
    const avgPress = passRows.length > 0 ? +(passRows.reduce((a, b) => a + (b.pressureRate || 0), 0) / passRows.length).toFixed(1) : 0;
    const avgTtt = passRows.length > 0 ? +(passRows.reduce((a, b) => a + (b.meanTimeToThrow || 0), 0) / passRows.length).toFixed(2) : 0;

    const avgRunEpa = runRows.length > 0 ? +(runRows.reduce((a, b) => a + b.meanEpa, 0) / runRows.length).toFixed(2) : 0;
    const avgRunSr = runRows.length > 0 ? +(runRows.reduce((a, b) => a + b.successRate, 0) / runRows.length).toFixed(1) : 0;
    const avgYpc = runRows.length > 0 ? +(runRows.reduce((a, b) => a + b.meanYards, 0) / runRows.length).toFixed(2) : 0;
    const avgStuff = runRows.length > 0 ? +(runRows.reduce((a, b) => a + (b.stuffRate || 0), 0) / runRows.length).toFixed(1) : 0;
    const avgExpl = runRows.length > 0 ? +(runRows.reduce((a, b) => a + (b.explosiveRate || 0), 0) / runRows.length).toFixed(1) : 0;

    console.log(`\n>>> ${sys}:`);
    if (passRows.length > 0) {
      console.log(`  PASSING: Mean EPA=${avgPassEpa}, Success Rate=${avgPassSr}%, Pressure=${avgPress}%, Sack=${avgSack}%, TTT=${avgTtt}s`);
    }
    if (runRows.length > 0) {
      console.log(`  RUSHING: Mean EPA=${avgRunEpa}, Success Rate=${avgRunSr}%, YPC=${avgYpc}y, Stuff=${avgStuff}%, Explosive=${avgExpl}%`);
    }
  }
  console.log('========================================================================================\n');
}

runAblationStudy().catch(console.error);
