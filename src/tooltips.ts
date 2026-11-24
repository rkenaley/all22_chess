export interface TooltipEntry {
  title: string;
  body: string;
  badge?: string;
}

export const TOOLTIP_GLOSSARY: Record<string, TooltipEntry> = {
  // ---- Topbar Modes & Overlays ----
  'mode-select': {
    title: 'Select & Move Tool [V]',
    badge: 'TOOL',
    body: 'Click any of the 22 players to open their Nested 5-Level Designer. At T=0.00s pre-snap, drag any player or any numbered waypoint knob (L1, L2...) directly on the field.',
  },
  'mode-block': {
    title: 'Block Assignment Tool [B]',
    badge: 'TOOL',
    body: 'Click an offensive blocker and drag onto a defender to lock MAN_BLOCK (hold Shift for COMBO_CLIMB 2nd-level target), or drag to open turf to draw a PULL_LEAD path.',
  },
  'mode-route': {
    title: 'Route / Path Stem Tool [R]',
    badge: 'TOOL',
    body: 'Click open turf anywhere downfield to append sequential route breakpoints (for WR/TE/RB) or pull landmarks (for OL) to the currently selected offensive player.',
  },
  'toggle-def-shell': {
    title: 'Defense Shell & Voronoi Overlay [D]',
    badge: 'LAYER',
    body: 'Displays Voronoi-complete pass zone cells (1/3, 1/2, 1/4, H/C, C/F), dashed Man/Spy/Bracket lock lines, rush lanes, and role micro-tags (SPY, BRK, BLZ, FRC).',
  },
  'toggle-vectors': {
    title: 'Velocity & Force Vectors [F]',
    badge: 'LAYER',
    body: 'Shows real-time player velocity vectors colored Emerald when winning trench leverage, Rose when losing, or crisp white when running free.',
  },
  'toggle-pocket': {
    title: 'Pocket Integrity Polygon [P]',
    badge: 'LAYER',
    body: 'Shades the live protective perimeter formed by non-route pass protectors around the passer (Cyan >=75% clean, Amber 45-75%, Rose <45% collapsing).',
  },
  'toggle-leverage': {
    title: 'Hat-on-Hat Leverage Rings [L]',
    badge: 'LAYER',
    body: 'Draws glowing contact rings around engaged offensive blockers: Emerald when leverageScore >= 0 (winning block), Rose when losing toward the quarterback or ball carrier.',
  },
  'toggle-trails': {
    title: 'Comet Motion Trails [T]',
    badge: 'LAYER',
    body: 'Renders tapered multi-tick movement ribbons over the last 0.5 seconds so route stem timing, pull arcs, and pursuit angles are unmistakable.',
  },
  'mc-batch': {
    title: 'Monte Carlo Simulation (N=100) [M]',
    badge: 'SIM',
    body: 'Executes 100 stochastic 20 Hz snaps with realistic human reaction variance and rush win/loss sampling, plotting outcome traces and gain distributions on the field.',
  },
  'undo-redo': {
    title: 'Undo / Redo Play Design [Ctrl+Z / Ctrl+Y]',
    badge: 'HISTORY',
    body: 'Reverts or replays any alignment shift, route draw, rating slider change, blocking assignment, or exotic mechanic edit (up to 40 snapshots).',
  },

  // ---- Audibles & Context ----
  'flip-play': {
    title: 'Flip Play Left / Right [X]',
    badge: 'AUDIBLE',
    body: 'Mirror-flips skill alignments, waypoints, gaps (e.g. B_LEFT <-> B_RIGHT), Read-3 void X, fake directions, and pre-snap motion horizontally across X=0.',
  },
  'jet-motion': {
    title: 'Pre-Snap Motion Shift [J]',
    badge: 'AUDIBLE',
    body: 'Cycles JET_RIGHT -> JET_LEFT -> ORBIT -> OFF on a motion slot/TE, probing defense shell alignment before the snap.',
  },
  'cycle-mike': {
    title: 'Declare the "Mike" Linebacker [I]',
    badge: 'PROTECTION',
    body: 'Locks the center of 50/51 Half-Slide pass protection and RB dual-read blitz scanning onto a chosen second-level box defender.',
  },
  'legality-pill': {
    title: 'Live NFL Formation Legality Check',
    badge: 'RULES',
    body: 'Verifies NFL alignment legality every edit: exactly 7 offensive players on the LOS (Y >= -0.75y) and both outermost LOS ends must be eligible receivers (WR/TE/SL/RB/QB).',
  },

  // ---- Nested Level 1 ----
  'lvl1-identity': {
    title: 'Level 1: Identity, Alignment & Core Role',
    badge: 'DESIGN',
    body: 'Controls pre-snap coordinates (X lateral -26.67..+26.67y, Y depth <= -0.2y), primary assignment mode, QB read progression order, and 2-QB Split-Gun direct snap ownership.',
  },
  'field-x': {
    title: 'Pre-Snap Lateral X (Yards from Ball)',
    badge: 'ALIGN',
    body: 'Negative X is Offense Left (-26.67 sideline); Positive X is Offense Right (+26.67 sideline). NFL hash marks sit at -3.08y and +3.08y.',
  },
  'field-y': {
    title: 'Pre-Snap Depth Y (Yards Behind LOS)',
    badge: 'ALIGN',
    body: 'Y >= -0.75y counts as ON the Line of Scrimmage (NFL requires 7). Y < -0.75y is Off-LOS / backfield. Shotgun QBs typically align at -4.5y to -5.5y.',
  },
  'off-role': {
    title: 'Offensive Assignment Mode',
    badge: 'ROLE',
    body: 'Determines deterministic 20 Hz steering: PASS_SET (drop/hinge), MAN_BLOCK (lock target), GAP_ZONE (sector block), COMBO_CLIMB (double DL then LB), PULL_LEAD/TRAP (follow waypoints then block), CHIP_RELEASE (chip edge then run route), MAX_PROTECT_SCAN (RB blitz pickup), ROUTE, BALL_CARRIER, or QB_DROP.',
  },
  'def-role': {
    title: 'Defensive Responsibility Mode',
    badge: 'DEFENSE',
    body: 'All 20 engine defensive AI roles: pass rushers (RUSH_GAP, CONTAIN_EDGE), blitzes (BLITZ_A, BLITZ_EDGE, BLITZ_RUN_GAP, CROSS_DOG, BLITZ_EDGE_CRASH), run fits (SPILL, FORCE_ALLEY, READ_RUN_PASS), zones (DEEP_ZONE/HALF/THIRD/QUARTERS/CURL_FLAT/HOOK_CURL/ROBBER), MAN_COV, QB_SPY, and BRACKET_TOP.',
  },
  'read-order': {
    title: 'QB Progression Read Order (1..5)',
    badge: 'PASSING',
    body: 'Determines the sequence the QB scans open receivers at runtime. Plays with Designed Scramble Read #3 evaluate Read 1 & Read 2 first, check the grass void, and fall back to Read #4 if plugged.',
  },
  'snap-recipient': {
    title: 'Direct Snap Recipient (2-QB Split-Gun)',
    badge: 'CHIRAL 2QB',
    body: 'Explicitly designates which QB receives the shotgun snap at T=0.00s. Checking this clears other snap recipients — enabling mirrored left/right 2-QB Split-Shotgun packages.',
  },
  'action-family': {
    title: 'Married Play Action Family Tag',
    badge: 'MEMORY',
    body: 'Links Real setup runs/passes to married Fake counters inside the Defensive Memory engine: PERIMETER_PITCH_TOSS, SPLIT_GUN_EXCHANGE, INSIDE_MESH_FAKE, or JET_ORBIT_SWEEP.',
  },

  // ---- Nested Level 2 ----
  'lvl2-targets': {
    title: 'Level 2: Targets, Leverage & Waypoint Path',
    badge: 'DESIGN',
    body: 'Fine-tune blocking targets, gap/pass-set technique, hat leverage bias, climb/chip timing, and exact interactive X/Y waypoint coordinates.',
  },
  'target-primary': {
    title: 'Primary Defender Target',
    badge: 'BLOCKING',
    body: 'Locks MAN_BLOCK, COMBO_CLIMB, CHIP_RELEASE, PULL_TRAP, or MAX_PROTECT_SCAN onto a specific defensive player ID (or click "Pick on Field").',
  },
  'target-secondary': {
    title: 'Second-Level Climb Target',
    badge: 'COMBO',
    body: 'Used by COMBO_CLIMB, PULL_LEAD, and PASS_SET centers to identify which linebacker or safety to climb onto once the down lineman is neutralized.',
  },
  'gap-set': {
    title: 'Gap Sector / Pass Set Depth',
    badge: 'TECHNIQUE',
    body: 'Controls pass-set kick/slide trajectory (VERTICAL_DEEP -2.2y, ANGLE_45 -1.4y, JUMP_SET +0.3y) or the specific run gap responsibility (A/B/C/D_ALLEY).',
  },
  'hat-leverage': {
    title: 'Hat-on-Hat Contact Leverage',
    badge: 'PHYSICS',
    body: 'INSIDE_OUT seals inside penetration; OUTSIDE_IN reaches outside shoulders to pin edge force; NEUTRAL stays square head-up.',
  },
  'climb-delay': {
    title: 'Combo Climb / Chip Delay (Seconds)',
    badge: 'TIMING',
    body: 'How long a COMBO_CLIMB blocker stays double-teaming before climbing to the LB, or how long a CHIP_RELEASE TE/RB collides with an edge rusher before leaking into their route.',
  },
  'route-tree': {
    title: '16-Seed Canonical Route Tree',
    badge: 'PRESETS',
    body: 'Applies NFL-standard stemmed route geometries (Slant, Shallow, Hitch, Out, Whip, Post, Corner, Wheel, Go, Dig, Comeback, Curl, Zig, Fade, Glance, Swing) relative to player alignment.',
  },
  'def-man-target': {
    title: 'Man / Spy / Bracket Target (OFF ID)',
    badge: 'COVERAGE',
    body: 'For MAN_COV (tight press/off tracking), QB_SPY (mirrors QB laterally & triggers full pursuit if QB exits pocket), or BRACKET_TOP (safety double-team roof over elite WR1).',
  },
  'def-landmark': {
    title: 'Zone Landmark / Blitz Target (X, Y)',
    badge: 'COVERAGE',
    body: 'For zone defenders, defines their Voronoi tessellation anchor point and drop depth; for blitzers and force defenders, defines their gap/crash attack coordinate.',
  },
  'def-stunt': {
    title: 'Stunt Cross Target X (Yards)',
    badge: 'BLITZ',
    body: 'Used by CROSS_DOG loopers to delay 0.20s and loop across behind the penetrating A-gap partner.',
  },

  // ---- Nested Level 3 ----
  'lvl3-motion': {
    title: 'Level 3: Pre-Snap Motion Config',
    badge: 'MOTION',
    body: 'Configures JET_RIGHT, JET_LEFT, or ORBIT motion across the snap instant — dynamically shifting initial position, velocity vector (5-6.2 yd/s), and probing defense reaction.',
  },

  // ---- Nested Level 4 Sub-Drawers ----
  'lvl4-mechanics': {
    title: 'Level 4: Advanced 20 Hz Play Mechanics',
    badge: 'OPTIONALITY',
    body: 'Full nested control over Play-Action meshes, Fake Pitch/Exchange eye-conflict vectors, IF/THEN Designed Scramble Read #3 corridors, Option-Pass/RPO windows, Backward Tosses, and Hook & Laterals.',
  },
  'mech-pa': {
    title: 'Play-Action Mesh (playAction)',
    badge: 'PA MESH',
    body: 'Rides a fake handoff mesh for meshDurationSec to freeze reading LBs downhill, enable OL hinge pass-pro protection, or trigger an outside bootleg rollout (isBootleg).',
  },
  'mech-fake': {
    title: 'Fake Pitch / Exchange Eye-Conflict (fakeAction)',
    badge: 'FAKES',
    body: 'Pays an honest 0.22s offensive fake-sell slowdown while pulling FORCE_ALLEY, CONTAIN_EDGE, reading LBs, and 2-QB QB_SPY (when affectsSpy=true) toward the decoy based on Defensive Memory Priming.',
  },
  'mech-fake-spy': {
    title: 'Affects QB Spy (2-QB Split-Gun Only)',
    badge: 'PHYSICS',
    body: 'Allows authentic 2-QB exchanges (when the decoy has pos==="QB" and priming > +0.10) to freeze or laterally misdirect a dedicated QB_SPY.',
  },
  'mech-read3': {
    title: 'Designed Scramble as Read #3 (IF/THEN Void)',
    badge: 'READ #3',
    body: 'Evaluates Read 1 & Read 2 first; if covered after minDecisionTimeSec, scans the rectangular grass corridor [centerX +- halfWidthX, 0..maxY] using observable kinematics. IF clear -> burst along scrambleWaypoints; ELSE -> immediately throw Read #4 fallback outlet!',
  },
  'mech-rpo': {
    title: 'Option-Pass / Run-Pass Read Window (optionPass)',
    badge: 'RPO',
    body: 'During [decisionWindowStartSec, EndSec], evaluates DB separation on Primary/Secondary targets against separationThresholdYds; throws if open, otherwise tucks and runs aggressively.',
  },
  'mech-toss': {
    title: 'Backward Pitch / Touch Toss (backwardToss)',
    badge: 'TOSS',
    body: 'Executes a timed backward toss at tossTimeSec to a trailing teammate, optionally reassigning the original passer to block or leak into a route (postTossRole).',
  },
  'mech-lateral': {
    title: 'Downfield Hook & Lateral (lateralConfig)',
    badge: 'LATERAL',
    body: 'After catching the ball and gathering (gatherDelaySec), pitches backward to trailing pitchTargetId whenever a tackler collapses within defenderCollapseRadius.',
  },

  // ---- Nested Level 5 ----
  'lvl5-ratings': {
    title: 'Level 5: Combine & Skill Ratings (40-99)',
    badge: 'RATINGS',
    body: 'Directly drives continuous 20 Hz physics: max speed curve, burst acceleration, contact trench/leg-drive power, route/rush finesse, awareness (pass/PA/bracket speed), and dedicated blockRating.',
  },
  'block-rating': {
    title: 'Dedicated Trench Block Rating (40-99)',
    badge: 'OL/TE/RB',
    body: 'Separates real contact blocking leverage from ballcarrier leg drive so mobile QBs (e.g. BLK 46) cannot pancak-block NFL edge rushers 1v1 while elite Ts/TEs dominate.',
  },

  // ---- Defensive Memory Lab ----
  'mem-lab': {
    title: 'Live Defensive Memory & Priming Simulator',
    badge: 'SEQ LAB',
    body: 'Simulates DC & defender memory across consecutive snaps: +1.0 Primed = defenders saw Real plays and over-bite on married Fakes; -1.0 Burned = back-to-back fakes ignored; Real Anticipation = sharpens fits when real plays are spammed.',
  },
  'mem-pitch': {
    title: 'PERIMETER_PITCH_TOSS Priming [-1.0..+1.0]',
    badge: 'MEMORY',
    body: 'Controls how aggressively Force Alley, Edge Contain, Reading LBs, and 2-QB Spy bite on Chiral Pitch/Sweep fakes (-1.0 burned -> +1.0 heavily primed).',
  },
  'mem-exchange': {
    title: 'SPLIT_GUN_EXCHANGE Priming [-1.0..+1.0]',
    badge: 'MEMORY',
    body: 'Controls defender eye-conflict bite on inside Split-Gun exchange bootlegs and PA seam fakes (-1.0 burned -> +1.0 primed).',
  },
  'mem-antic': {
    title: 'Real Play Spam Anticipation [0.0..1.0]',
    badge: 'MEMORY',
    body: 'Models defender recognition when the offense spams the same real play family: accelerates run-key trigger, off-ball scrape lead, edge widen speed, Spy pursuit, and deep safety alleys.',
  },

  // ---- Telemetry Strip ----
  'tel-epa': {
    title: 'Expected Points Added (EPA)',
    badge: 'METRIC',
    body: 'Situation-adjusted NFL Expected Points Added calibrated against 2022-2024 nflverse pass & rush distributions.',
  },
  'tel-pocket': {
    title: 'Pocket Integrity (%)',
    badge: 'METRIC',
    body: 'Geometric pass-protection hull stability score around the quarterback (100% clean pocket, <45% heavy interior/edge collapse).',
  },
  'tel-leverage': {
    title: 'Trench Net Yards / Leverage',
    badge: 'METRIC',
    body: 'Aggregate blocker vs defender displacement across active trench engagements.',
  },
  'tel-ttt': {
    title: 'Time to Throw / Cross LOS (Sec)',
    badge: 'METRIC',
    body: 'Elapsed seconds from snap to ball release (pass/RPO) or ball carrier crossing Y=0.0 (run).',
  },
  'tel-sr': {
    title: 'Success Rate / Outcome',
    badge: 'METRIC',
    body: 'NFL Success threshold (positive EPA or required down-distance yardage without turnover/sack).',
  },
  'tel-pressure': {
    title: 'Pressure / Stuff Diagnostic',
    badge: 'METRIC',
    body: 'Pass plays track CLEAN POCKET / PRESSURED / SACKED; run plays track STUFFED / CLEAN FIT / EXPLOSIVE.',
  },
};

export function tipAttr(key: string): string {
  return `data-tip-key="${key}"`;
}

export function helpIcon(key: string, extraClass = ''): string {
  return `<span class="help-badge ${extraClass}" data-tip-key="${key}" tabindex="0" aria-label="Help">?</span>`;
}

export function initTooltips(): void {
  let tipEl = document.getElementById('all22-tooltip') as HTMLDivElement | null;
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'all22-tooltip';
    tipEl.className = 'all22-tooltip hidden';
    document.body.appendChild(tipEl);
  }

  let showTimer: number | null = null;
  let activeTrigger: HTMLElement | null = null;

  const hideTooltip = () => {
    if (showTimer !== null) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }
    activeTrigger = null;
    tipEl?.classList.add('hidden');
  };

  const positionTooltip = (anchor: HTMLElement) => {
    if (!tipEl) return;
    const rect = anchor.getBoundingClientRect();
    const tw = tipEl.offsetWidth || 280;
    const th = tipEl.offsetHeight || 90;
    const pad = 12;

    let left = rect.left + rect.width * 0.5 - tw * 0.5;
    if (left + tw > window.innerWidth - pad) left = window.innerWidth - tw - pad;
    if (left < pad) left = pad;

    let top = rect.bottom + 8;
    if (top + th > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - th - 8);
    }

    tipEl.style.left = `${Math.round(left)}px`;
    tipEl.style.top = `${Math.round(top)}px`;
  };

  const showFor = (el: HTMLElement) => {
    if (!tipEl) return;
    const key = el.dataset.tipKey;
    const entry = key ? TOOLTIP_GLOSSARY[key] : undefined;
    const title = entry?.title || el.dataset.tipTitle || '';
    const body = entry?.body || el.dataset.tipBody || '';
    const badge = entry?.badge || el.dataset.tipBadge || '';
    if (!title && !body) return;

    tipEl.innerHTML = `
      <div class="tip-head">
        <span class="tip-title">${escapeHtml(title)}</span>
        ${badge ? `<span class="tip-badge">${escapeHtml(badge)}</span>` : ''}
      </div>
      ${body ? `<div class="tip-body">${escapeHtml(body)}</div>` : ''}
    `;
    tipEl.classList.remove('hidden');
    positionTooltip(el);
  };

  const findTipTarget = (node: EventTarget | null): HTMLElement | null => {
    if (!(node instanceof HTMLElement)) return null;
    return node.closest('[data-tip-key], [data-tip-title]') as HTMLElement | null;
  };

  document.addEventListener('pointerover', (e) => {
    const target = findTipTarget(e.target);
    if (!target) return;
    if (target === activeTrigger) return;
    if (showTimer !== null) window.clearTimeout(showTimer);
    activeTrigger = target;
    showTimer = window.setTimeout(() => showFor(target), 120);
  });

  document.addEventListener('pointerout', (e) => {
    const target = findTipTarget(e.target);
    if (!target || target !== activeTrigger) return;
    const rel = findTipTarget(e.relatedTarget);
    if (rel === target) return;
    hideTooltip();
  });

  document.addEventListener('focusin', (e) => {
    const target = findTipTarget(e.target);
    if (target) {
      activeTrigger = target;
      showFor(target);
    }
  });

  document.addEventListener('focusout', () => {
    hideTooltip();
  });

  window.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('mousedown', hideTooltip);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
