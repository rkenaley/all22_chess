import {
  BlockRoleType,
  DefRoleType,
  FakeActionFamily,
  GapOrSetCode,
  LeverageBias,
  PlayTickSnapshot,
  SimAgent,
} from './engine';
import { applyRoutePresetToAgent, RoutePresetId, ROUTE_PRESETS } from './route_presets';
import { helpIcon, tipAttr } from './tooltips';

const OFF_ROLES: { value: BlockRoleType; label: string }[] = [
  { value: 'PASS_SET', label: 'PASS_SET — Pocket Drop / Hinge' },
  { value: 'MAN_BLOCK', label: 'MAN_BLOCK — Lock Target Defender' },
  { value: 'GAP_ZONE', label: 'GAP_ZONE — Step & Seal Gap' },
  { value: 'COMBO_CLIMB', label: 'COMBO_CLIMB — Double DL -> LB' },
  { value: 'PULL_LEAD', label: 'PULL_LEAD — Pull Waypoints -> Lead' },
  { value: 'PULL_TRAP', label: 'PULL_TRAP — Pull & Kick-Out EMOL' },
  { value: 'CHIP_RELEASE', label: 'CHIP_RELEASE — Chip Edge -> Route' },
  { value: 'MAX_PROTECT_SCAN', label: 'MAX_PROTECT_SCAN — RB Blitz Pickup' },
  { value: 'ROUTE', label: 'ROUTE — Pass Stem / Decoy Pattern' },
  { value: 'BALL_CARRIER', label: 'BALL_CARRIER — Designed Run Path' },
  { value: 'QB_DROP', label: 'QB_DROP — Pocket Drop / Rollout' },
];

const DEF_ROLES: { value: DefRoleType; label: string }[] = [
  { value: 'RUSH_GAP', label: 'RUSH_GAP — Interior Gap Pass Rush' },
  { value: 'CONTAIN_EDGE', label: 'CONTAIN_EDGE — Disciplined Edge Contain' },
  { value: 'BLITZ_A', label: 'BLITZ_A — A-Gap Pressure' },
  { value: 'BLITZ_EDGE', label: 'BLITZ_EDGE — Edge / Slot Blitz' },
  { value: 'BLITZ_RUN_GAP', label: 'BLITZ_RUN_GAP — Ignore Fake Knife Blitz' },
  { value: 'CROSS_DOG', label: 'CROSS_DOG — Double A-Gap Stunt Loop' },
  { value: 'BLITZ_EDGE_CRASH', label: 'BLITZ_EDGE_CRASH — Safety Edge Crash' },
  { value: 'SPILL', label: 'SPILL — Wrong-Arm Puller Inside Out' },
  { value: 'FORCE_ALLEY', label: 'FORCE_ALLEY — Outside-In Alley Force' },
  { value: 'READ_RUN_PASS', label: 'READ_RUN_PASS — Box Read / Run-Pass Fit' },
  { value: 'HOOK_CURL', label: 'HOOK_CURL — Underneath Hook-Curl Zone' },
  { value: 'CURL_FLAT', label: 'CURL_FLAT — Curl / Flat Cloud Zone' },
  { value: 'ROBBER', label: 'ROBBER — Midfield Robber Spy/Hole' },
  { value: 'DEEP_THIRD', label: 'DEEP_THIRD — Cover 3 Deep Third' },
  { value: 'DEEP_HALF', label: 'DEEP_HALF — Cover 2 Deep Half' },
  { value: 'QUARTERS_MATCH', label: 'QUARTERS_MATCH — Match Quarters Roof' },
  { value: 'DEEP_ZONE', label: 'DEEP_ZONE — Single-High Free Post' },
  { value: 'MAN_COV', label: 'MAN_COV — Lock Man-to-Man Coverage' },
  { value: 'QB_SPY', label: 'QB_SPY — Dedicated Mobile QB Spy' },
  { value: 'BRACKET_TOP', label: 'BRACKET_TOP — Safety Cone Double-Team' },
];

const GAP_OPTIONS: { value: GapOrSetCode; label: string }[] = [
  { value: 'VERTICAL_DEEP', label: 'VERTICAL_DEEP (-2.2y Kick)' },
  { value: 'ANGLE_45', label: 'ANGLE_45 (Half-Slide)' },
  { value: 'JUMP_SET', label: 'JUMP_SET (+0.3y Quick)' },
  { value: 'A_LEFT', label: 'A_LEFT (C/LG Gap)' },
  { value: 'A_RIGHT', label: 'A_RIGHT (C/RG Gap)' },
  { value: 'B_LEFT', label: 'B_LEFT (LG/LT Gap)' },
  { value: 'B_RIGHT', label: 'B_RIGHT (RG/RT Gap)' },
  { value: 'C_LEFT', label: 'C_LEFT (Outside LT)' },
  { value: 'C_RIGHT', label: 'C_RIGHT (Outside RT)' },
  { value: 'D_ALLEY', label: 'D_ALLEY (Perimeter/Force)' },
];

export interface InspectorCallbacks {
  getAllAgents: () => SimAgent[];
  getCurrentSnapshot: () => PlayTickSnapshot | undefined;
  isRouteDrawMode: () => boolean;
  onMutate: (label: string, resetTickZero?: boolean) => void;
  onSetRouteDrawMode: () => void;
  onPickDefTarget: () => void;
}

export class NestedPlayerInspector {
  private root: HTMLElement;
  private cb: InspectorCallbacks;
  private openLevels = new Set<string>(['lvl1', 'lvl2']);

  constructor(root: HTMLElement, callbacks: InspectorCallbacks) {
    this.root = root;
    this.cb = callbacks;
  }

  public render(selectedId: string | null): void {
    const allBase = this.cb.getAllAgents();
    const base =
      allBase.find((a) => a.id === selectedId) ||
      allBase.find((a) => a.side === 'OFF');
    if (!base) {
      this.root.innerHTML = `<div class="empty-msg">No active player selected.</div>`;
      return;
    }

    const snap = this.cb.getCurrentSnapshot();
    const live = snap?.agents.find((a) => a.id === base.id) || base;
    const isOff = base.side === 'OFF';
    const isOL = ['LT', 'LG', 'C', 'RG', 'RT'].includes(base.pos);
    const defs = allBase.filter((a) => a.side === 'DEF');
    const offs = allBase.filter((a) => a.side === 'OFF');

    // Badge Update
    const badgeEl = document.getElementById('selected-entity-badge');
    if (badgeEl) {
      const jerseyStr = base.jersey !== undefined ? ` #${base.jersey}` : '';
      badgeEl.textContent = `${base.id}${jerseyStr} (${base.side})`;
    }

    const r = base.ratings;
    const spdYps = Math.hypot(live.vx, live.vy).toFixed(1);
    let liveText = isOff
      ? `ROLE: ${base.assignment.role} | V=${spdYps} y/s | XY=(${live.x.toFixed(1)}, ${live.y.toFixed(1)})`
      : `DEF: ${base.defAssignment?.role ?? 'READ'} | V=${spdYps} y/s | XY=(${live.x.toFixed(1)}, ${live.y.toFixed(1)})`;
    let liveColor = isOff ? 'var(--fg-1)' : 'var(--accent-primary)';
    if (live.engagedWithId) {
      const winLoss = live.leverageScore >= 0.08 ? 'WINNING' : live.leverageScore <= -0.08 ? 'LOSING' : 'EVEN';
      liveColor =
        live.leverageScore >= 0.08
          ? 'var(--accent-Positive)'
          : live.leverageScore <= -0.08
          ? 'var(--accent-danger)'
          : 'var(--accent-secondary)';
      liveText = `ENGAGED vs ${live.engagedWithId} (${winLoss} | LEV ${live.leverageScore >= 0 ? '+' : ''}${live.leverageScore.toFixed(2)})`;
    }

    // Active mechanic summary pills
    const pills: string[] = [];
    if (base.isSnapRecipient) pills.push(`<span class="mech-pill pill-gold">SNAP</span>`);
    if (base.preSnapMotion?.enabled) pills.push(`<span class="mech-pill pill-amber">MOT</span>`);
    if (base.playAction?.enabled) pills.push(`<span class="mech-pill pill-cyan">PA</span>`);
    if (base.fakeAction?.enabled) pills.push(`<span class="mech-pill pill-fake">FAKE</span>`);
    if (base.designedScrambleRead?.enabled) pills.push(`<span class="mech-pill pill-emerald">R3-VOID</span>`);
    if (base.optionPass?.enabled) pills.push(`<span class="mech-pill pill-gold">RPO</span>`);
    if (base.backwardToss?.enabled) pills.push(`<span class="mech-pill pill-cyan">TOSS</span>`);
    if (base.lateralConfig?.enabled) pills.push(`<span class="mech-pill pill-cyan">LAT</span>`);

    const defRole = base.defAssignment?.role ?? 'READ_RUN_PASS';

    this.root.innerHTML = `
      <!-- SCOUTING SUMMARY BANNER -->
      <div class="insp-hero">
        <div class="insp-hero-top">
          <div>
            <div class="insp-player-name">${esc(base.pos)}${base.jersey !== undefined ? ` #${base.jersey}` : ''} — ${esc(base.name || base.id)}</div>
            <div class="insp-player-ratings">SPD ${r.speed} · ACC ${r.accel} · PWR ${r.power} · FIN ${r.finesse} · AWR ${r.awareness}${base.blockRating !== undefined ? ` · BLK ${base.blockRating}` : ''}</div>
          </div>
          <span class="side-chip ${isOff ? 'chip-off' : 'chip-def'}">${base.side}</span>
        </div>
        <div class="insp-player-live" style="color:${liveColor};">${esc(liveText)}</div>
        ${pills.length ? `<div class="insp-pill-strip">${pills.join('')}</div>` : ''}
      </div>

      <!-- LEVEL 1: IDENTITY, PRE-SNAP ALIGNMENT & CORE ROLE -->
      ${this.renderAccordion(
        'lvl1',
        'LEVEL 1 · ALIGNMENT & CORE ROLE',
        'lvl1-identity',
        isOff ? base.assignment.role : defRole,
        true,
        `
        <div class="insp-grid-2">
          <label class="insp-cell" ${tipAttr('field-x')}>
            <span class="lbl">ALIGN X (YDS) ${helpIcon('field-x')}</span>
            <input id="nd-startX" type="number" step="0.25" min="-26.5" max="26.5" value="${base.startX}" class="num-input" />
          </label>
          <label class="insp-cell" ${tipAttr('field-y')}>
            <span class="lbl">ALIGN Y (YDS) ${helpIcon('field-y')}</span>
            <input id="nd-startY" type="number" step="0.25" min="-9.0" max="22.0" value="${base.startY}" class="num-input" />
          </label>
        </div>
        ${
          isOff
            ? `<div class="insp-btn-row">
                <button id="nd-snap-los" class="btn btn-xs" title="Set Y = -0.35y (On Line of Scrimmage)">SNAP TO LOS (-0.35y)</button>
                <button id="nd-step-off" class="btn btn-xs" title="Set Y = -1.15y (Off LOS / Backfield eligible)">STEP OFF LOS (-1.15y)</button>
              </div>`
            : ''
        }
        <label class="insp-row-full" ${tipAttr(isOff ? 'off-role' : 'def-role')}>
          <span class="lbl">${isOff ? 'OFFENSIVE ROLE' : 'DEFENSIVE ROLE'} ${helpIcon(isOff ? 'off-role' : 'def-role')}</span>
          <select id="nd-role" class="select-input">
            ${(isOff ? OFF_ROLES : DEF_ROLES)
              .map(
                (o) =>
                  `<option value="${o.value}" ${(isOff ? base.assignment.role : defRole) === o.value ? 'selected' : ''}>${esc(o.label)}</option>`
              )
              .join('')}
          </select>
        </label>
        ${
          isOff
            ? `
            <div class="insp-grid-2">
              <label class="insp-cell" ${tipAttr('read-order')}>
                <span class="lbl">READ ORDER ${helpIcon('read-order')}</span>
                <select id="nd-readOrder" class="select-input">
                  <option value="" ${!base.readOrder ? 'selected' : ''}>None (Non-Read)</option>
                  ${[1, 2, 3, 4, 5]
                    .map((n) => `<option value="${n}" ${base.readOrder === n ? 'selected' : ''}>Read #${n}</option>`)
                    .join('')}
                </select>
              </label>
              <label class="insp-cell" ${tipAttr('action-family')}>
                <span class="lbl">PLAY FAMILY ${helpIcon('action-family')}</span>
                <select id="nd-actionFamily" class="select-input">
                  <option value="" ${!base.actionFamily ? 'selected' : ''}>Neutral (None)</option>
                  ${(['PERIMETER_PITCH_TOSS', 'SPLIT_GUN_EXCHANGE', 'INSIDE_MESH_FAKE', 'JET_ORBIT_SWEEP'] as FakeActionFamily[])
                    .map((f) => `<option value="${f}" ${base.actionFamily === f ? 'selected' : ''}>${f.replace(/_/g, ' ')}</option>`)
                    .join('')}
                </select>
              </label>
            </div>
            <label class="insp-switch-row" ${tipAttr('snap-recipient')}>
              <input id="nd-snapRecipient" type="checkbox" ${base.isSnapRecipient ? 'checked' : ''} />
              <span>Direct Shotgun Snap Recipient (2-QB Chiral Owner) ${helpIcon('snap-recipient')}</span>
            </label>
          `
            : ''
        }
      `
      )}

      <!-- LEVEL 2: TARGETS, TECHNIQUE & WAYPOINT CHAIN -->
      ${
        isOff
          ? this.renderOffLevel2(base, defs, isOL)
          : this.renderDefLevel2(base, offs)
      }

      <!-- LEVEL 3: PRE-SNAP MOTION (OFFENSE ONLY) -->
      ${isOff ? this.renderMotionLevel3(base) : ''}

      <!-- LEVEL 4: NESTED ADVANCED MECHANICS (6 SUB-DRAWERS, OFFENSE ONLY) -->
      ${isOff ? this.renderMechanicsLevel4(base, offs) : ''}

      <!-- LEVEL 5: PLAYER RATINGS & ARCHETYPE SLIDERS -->
      ${this.renderRatingsLevel5(base)}
    `;

    this.bindEvents(base, allBase);
  }

  private renderOffLevel2(base: SimAgent, defs: SimAgent[], isOL: boolean): string {
    const asg = base.assignment;
    const wps = asg.waypoints;
    const summary = wps.length > 0 ? `${wps.length} nodes` : asg.primaryTargetId || asg.gapOrSet;

    return this.renderAccordion(
      'lvl2',
      'LEVEL 2 · ASSIGNMENT & PATH NODES',
      'lvl2-targets',
      summary,
      true,
      `
      <div class="insp-grid-2">
        <label class="insp-cell" ${tipAttr('target-primary')}>
          <span class="lbl">1ST TARGET DEF ${helpIcon('target-primary')}</span>
          <select id="nd-tgt1" class="select-input">
            <option value="">-- Auto Sector --</option>
            ${defs
              .map(
                (d) =>
                  `<option value="${d.id}" ${asg.primaryTargetId === d.id ? 'selected' : ''}>${d.id} (${d.pos})</option>`
              )
              .join('')}
          </select>
        </label>
        <label class="insp-cell" ${tipAttr('target-secondary')}>
          <span class="lbl">2ND CLIMB TGT ${helpIcon('target-secondary')}</span>
          <select id="nd-tgt2" class="select-input">
            <option value="">-- Auto 2nd Lvl --</option>
            ${defs
              .map(
                (d) =>
                  `<option value="${d.id}" ${asg.secondaryTargetId === d.id ? 'selected' : ''}>${d.id} (${d.pos})</option>`
              )
              .join('')}
          </select>
        </label>
      </div>

      <div class="insp-grid-3">
        <label class="insp-cell" ${tipAttr('gap-set')}>
          <span class="lbl">GAP / SET ${helpIcon('gap-set')}</span>
          <select id="nd-gapSet" class="select-input">
            ${GAP_OPTIONS.map((g) => `<option value="${g.value}" ${asg.gapOrSet === g.value ? 'selected' : ''}>${g.label}</option>`).join('')}
          </select>
        </label>
        <label class="insp-cell" ${tipAttr('hat-leverage')}>
          <span class="lbl">LEVERAGE ${helpIcon('hat-leverage')}</span>
          <select id="nd-leverage" class="select-input">
            <option value="INSIDE_OUT" ${asg.leverage === 'INSIDE_OUT' ? 'selected' : ''}>INSIDE-OUT</option>
            <option value="NEUTRAL" ${asg.leverage === 'NEUTRAL' ? 'selected' : ''}>NEUTRAL</option>
            <option value="OUTSIDE_IN" ${asg.leverage === 'OUTSIDE_IN' ? 'selected' : ''}>OUTSIDE-IN</option>
          </select>
        </label>
        <label class="insp-cell" ${tipAttr('climb-delay')}>
          <span class="lbl">CLIMB/CHIP (s) ${helpIcon('climb-delay')}</span>
          <input id="nd-delay" type="number" min="0.10" max="2.50" step="0.05" value="${asg.climbOrChipDelaySec.toFixed(2)}" class="num-input" />
        </label>
      </div>

      <label class="insp-row-full" ${tipAttr('route-tree')}>
        <span class="lbl">APPLY ROUTE TREE (16 STEMS) ${helpIcon('route-tree')}</span>
        <select id="nd-routePreset" class="select-input">
          <option value="">-- Quick Apply Route Tree Stem --</option>
          ${ROUTE_PRESETS.map((rp) => `<option value="${rp.id}">${esc(rp.label)}</option>`).join('')}
        </select>
      </label>

      ${
        isOL
          ? `<label class="insp-row-full">
              <span class="lbl">OL PULL / TRAP PRESET</span>
              <select id="nd-pullPreset" class="select-input">
                <option value="">-- Quick Apply Pull / Trap Arc --</option>
                <option value="PULL_KICK">Pull & Kick-Out EMOL</option>
                <option value="PULL_WRAP">Pull & Wrap Upfield Alley</option>
                <option value="BACKSIDE_TRAP">Backside Guard Short Trap</option>
                <option value="PIN_PULL_SWEEP">Frontside Pin & Pull Sweep</option>
              </select>
            </label>`
          : ''
      }

      <div class="insp-btn-row">
        <button id="nd-draw-route" class="btn btn-xs ${this.cb.isRouteDrawMode() ? 'active' : ''}" ${tipAttr('mode-route')}>
          ${isOL ? 'DRAW PULL [R]' : 'DRAW ROUTE [R]'}
        </button>
        <button id="nd-add-wp" class="btn btn-xs">+ ADD NODE</button>
        <button id="nd-pop-wp" class="btn btn-xs" ${wps.length === 0 ? 'disabled' : ''}>- POP</button>
        <button id="nd-clear-wp" class="btn btn-xs" ${wps.length === 0 ? 'disabled' : ''}>CLEAR</button>
        <button id="nd-pick-def" class="btn btn-xs">PICK DEF</button>
      </div>

      <div class="wp-list">
        ${
          wps.length === 0
            ? `<div class="wp-empty">0 path nodes — click [DRAW ROUTE] then click on turf, or [+ ADD NODE].</div>`
            : wps
                .map(
                  (w, idx) => `
                <div class="wp-row">
                  <span class="wp-tag">L${idx + 1}</span>
                  <input type="number" step="0.5" min="-26.5" max="26.5" value="${w.x}" data-wp-axis="x" data-wp-idx="${idx}" class="num-input wp-num" title="X lateral (yds)" />
                  <input type="number" step="0.5" min="-9.0" max="30.0" value="${w.y}" data-wp-axis="y" data-wp-idx="${idx}" class="num-input wp-num" title="Y depth (yds)" />
                  <button type="button" data-wp-del="${idx}" class="btn btn-xs wp-del" title="Remove L${idx + 1}">×</button>
                </div>`
                )
                .join('')
        }
      </div>
    `
    );
  }

  private renderDefLevel2(base: SimAgent, offs: SimAgent[]): string {
    const da = base.defAssignment ?? { role: 'READ_RUN_PASS' as DefRoleType, targetX: base.startX, targetY: base.startY };
    return this.renderAccordion(
      'lvl2',
      'LEVEL 2 · DEFENSIVE COVERAGE & LANDMARK',
      'def-role',
      da.manTargetId ? `TGT:${da.manTargetId}` : `(${da.targetX.toFixed(1)}, ${da.targetY.toFixed(1)})`,
      true,
      `
      <label class="insp-row-full" ${tipAttr('def-man-target')}>
        <span class="lbl">MAN / SPY / BRACKET OFF TARGET ${helpIcon('def-man-target')}</span>
        <select id="nd-defManTarget" class="select-input">
          <option value="">-- None (Zone / Gap Assignment) --</option>
          ${offs
            .map((o) => `<option value="${o.id}" ${da.manTargetId === o.id ? 'selected' : ''}>${o.id} (${o.pos} ${o.name || ''})</option>`)
            .join('')}
        </select>
      </label>
      <div class="insp-grid-3" ${tipAttr('def-landmark')}>
        <label class="insp-cell">
          <span class="lbl">TARGET X ${helpIcon('def-landmark')}</span>
          <input id="nd-defTgtX" type="number" step="0.5" min="-26.5" max="26.5" value="${da.targetX}" class="num-input" />
        </label>
        <label class="insp-cell">
          <span class="lbl">TARGET Y</span>
          <input id="nd-defTgtY" type="number" step="0.5" min="-8.0" max="26.0" value="${da.targetY}" class="num-input" />
        </label>
        <label class="insp-cell" ${tipAttr('def-stunt')}>
          <span class="lbl">CROSS X ${helpIcon('def-stunt')}</span>
          <input id="nd-defCrossX" type="number" step="0.5" min="-15" max="15" value="${da.stuntCrossTargetX ?? ''}" placeholder="-" class="num-input" />
        </label>
      </div>
      <div class="insp-btn-row">
        <button id="nd-def-preset-spy" class="btn btn-xs">ASSIGN QB SPY</button>
        <button id="nd-def-preset-brk" class="btn btn-xs">BRACKET WR1</button>
        <button id="nd-def-preset-edge" class="btn btn-xs">EDGE CONTAIN</button>
        <button id="nd-def-preset-mug" class="btn btn-xs">A-GAP BLITZ</button>
      </div>
    `
    );
  }

  private renderMotionLevel3(base: SimAgent): string {
    const m = base.preSnapMotion;
    const enabled = Boolean(m?.enabled);
    return this.renderAccordion(
      'lvl3',
      'LEVEL 3 · PRE-SNAP MOTION SHIFT',
      'lvl3-motion',
      enabled ? `${m!.type} ${m!.speed}y/s` : 'OFF',
      false,
      `
      <label class="insp-switch-row">
        <input id="nd-motEnabled" type="checkbox" ${enabled ? 'checked' : ''} />
        <span>Enable Pre-Snap Motion Vector</span>
      </label>
      ${
        enabled && m
          ? `
          <div class="insp-grid-2">
            <label class="insp-cell">
              <span class="lbl">MOTION TYPE</span>
              <select id="nd-motType" class="select-input">
                <option value="JET_RIGHT" ${m.type === 'JET_RIGHT' ? 'selected' : ''}>JET RIGHT</option>
                <option value="JET_LEFT" ${m.type === 'JET_LEFT' ? 'selected' : ''}>JET LEFT</option>
                <option value="ORBIT" ${m.type === 'ORBIT' ? 'selected' : ''}>ORBIT RETURN</option>
              </select>
            </label>
            <label class="insp-cell">
              <span class="lbl">SPEED (Y/S)</span>
              <input id="nd-motSpeed" type="number" step="0.2" min="3.0" max="8.0" value="${m.speed}" class="num-input" />
            </label>
          </div>
          <div class="insp-grid-2">
            <label class="insp-cell"><span class="lbl">ORIGIN X</span><input id="nd-motOrigX" type="number" step="0.5" value="${m.originX}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">ORIGIN Y</span><input id="nd-motOrigY" type="number" step="0.5" value="${m.originY}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">SNAP X</span><input id="nd-motSnapX" type="number" step="0.5" value="${m.snapX}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">SNAP Y</span><input id="nd-motSnapY" type="number" step="0.5" value="${m.snapY}" class="num-input" /></label>
          </div>`
          : ''
      }
    `
    );
  }

  private renderMechanicsLevel4(base: SimAgent, offs: SimAgent[]): string {
    const offOpts = (cur?: string) =>
      offs
        .filter((o) => o.id !== base.id)
        .map((o) => `<option value="${o.id}" ${cur === o.id ? 'selected' : ''}>${o.id} (${o.pos})</option>`)
        .join('');

    const pa = base.playAction;
    const fk = base.fakeAction;
    const r3 = base.designedScrambleRead;
    const rpo = base.optionPass;
    const bt = base.backwardToss;
    const lat = base.lateralConfig;

    const activeCount = [pa?.enabled, fk?.enabled, r3?.enabled, rpo?.enabled, bt?.enabled, lat?.enabled].filter(Boolean).length;

    return this.renderAccordion(
      'lvl4',
      'LEVEL 4 · ADVANCED PLAY MECHANICS',
      'lvl4-mechanics',
      activeCount > 0 ? `${activeCount} ACTIVE` : 'NONE',
      false,
      `
      <!-- 4A. PLAY-ACTION MESH -->
      ${this.renderSubDrawer(
        'sub-pa',
        'Play-Action Mesh',
        'mech-pa',
        Boolean(pa?.enabled),
        `
        <label class="insp-switch-row"><input id="nd-paEnabled" type="checkbox" ${pa?.enabled ? 'checked' : ''} /><span>Enable Play-Action Mesh</span></label>
        ${
          pa?.enabled
            ? `
          <div class="insp-grid-2">
            <label class="insp-cell"><span class="lbl">MESH SEC</span><input id="nd-paDur" type="number" step="0.05" min="0.2" max="1.6" value="${pa.meshDurationSec}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">FAKE CARRIER</span><select id="nd-paCarrier" class="select-input">${offOpts(pa.fakeCarrierId)}</select></label>
            <label class="insp-cell"><span class="lbl">FAKE GAP</span><select id="nd-paGap" class="select-input">${GAP_OPTIONS.map((g) => `<option value="${g.value}" ${(pa.fakeGap || 'B_LEFT') === g.value ? 'selected' : ''}>${g.value}</option>`).join('')}</select></label>
            <label class="insp-cell"><span class="lbl">BOOT DIR</span><select id="nd-paBootDir" class="select-input">${(['POCKET', 'LEFT', 'RIGHT'] as const).map((b) => `<option value="${b}" ${(pa.bootDirection || 'POCKET') === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
          </div>
          <label class="insp-switch-row"><input id="nd-paBoot" type="checkbox" ${pa.isBootleg ? 'checked' : ''} /><span>Rollout Bootleg Outside Mesh (isBootleg)</span></label>`
            : ''
        }`
      )}

      <!-- 4B. FAKE PITCH / EXCHANGE EYE-CONFLICT -->
      ${this.renderSubDrawer(
        'sub-fake',
        'Fake Pitch / Exchange',
        'mech-fake',
        Boolean(fk?.enabled),
        `
        <label class="insp-switch-row"><input id="nd-fkEnabled" type="checkbox" ${fk?.enabled ? 'checked' : ''} /><span>Enable Eye-Conflict Fake Action</span></label>
        ${
          fk?.enabled
            ? `
          <div class="insp-grid-2">
            <label class="insp-cell"><span class="lbl">FAMILY</span><select id="nd-fkFamily" class="select-input">${(['PERIMETER_PITCH_TOSS', 'SPLIT_GUN_EXCHANGE', 'INSIDE_MESH_FAKE', 'JET_ORBIT_SWEEP'] as FakeActionFamily[]).map((f) => `<option value="${f}" ${fk.family === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
            <label class="insp-cell"><span class="lbl">DECOY TGT</span><select id="nd-fkTarget" class="select-input">${offOpts(fk.fakeTargetId)}</select></label>
            <label class="insp-cell"><span class="lbl">START SEC</span><input id="nd-fkStart" type="number" step="0.02" min="0" max="1.0" value="${fk.fakeStartSec}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">DURATION S</span><input id="nd-fkDur" type="number" step="0.02" min="0.15" max="1.4" value="${fk.fakeDurationSec}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">DIR X (YDS)</span><input id="nd-fkDirX" type="number" step="0.5" min="-25" max="25" value="${fk.fakeDirectionX ?? -6}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">DIR Y (YDS)</span><input id="nd-fkDirY" type="number" step="0.5" min="-10" max="5" value="${fk.fakeDirectionY ?? -2.5}" class="num-input" /></label>
          </div>
          <label class="insp-switch-row" ${tipAttr('mech-fake-spy')}><input id="nd-fkSpy" type="checkbox" ${fk.affectsSpy ? 'checked' : ''} /><span>Can Pull 2-QB Spy (requires decoy pos=QB) ${helpIcon('mech-fake-spy')}</span></label>`
            : ''
        }`
      )}

      <!-- 4C. DESIGNED SCRAMBLE READ #3 -->
      ${this.renderSubDrawer(
        'sub-read3',
        'Designed Scramble Read #3',
        'mech-read3',
        Boolean(r3?.enabled),
        `
        <label class="insp-switch-row"><input id="nd-r3Enabled" type="checkbox" ${r3?.enabled ? 'checked' : ''} /><span>Enable IF/THEN Engineered Grass Void Scramble</span></label>
        ${
          r3?.enabled
            ? `
          <div class="insp-btn-row">
            <button id="nd-r3-mid" class="btn btn-xs">MIDDLE VOID</button>
            <button id="nd-r3-right" class="btn btn-xs">RIGHT ALLEY</button>
            <button id="nd-r3-left" class="btn btn-xs">LEFT ALLEY</button>
          </div>
          <div class="insp-grid-2">
            <label class="insp-cell"><span class="lbl">AFTER READ #</span><input id="nd-r3After" type="number" step="1" min="1" max="3" value="${r3.afterReadOrder ?? 2}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">MIN CHECK SEC</span><input id="nd-r3MinT" type="number" step="0.05" min="1.2" max="3.0" value="${r3.minDecisionTimeSec}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">VOID CENTER X</span><input id="nd-r3CX" type="number" step="0.5" min="-20" max="20" value="${r3.voidCorridorCenterX}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">HALF WIDTH X</span><input id="nd-r3HW" type="number" step="0.2" min="1.5" max="8" value="${r3.voidCorridorHalfWidthX}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">MAX DEPTH Y</span><input id="nd-r3MaxY" type="number" step="0.5" min="4" max="15" value="${r3.voidCorridorMaxY}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">ELSE FALLBACK</span><select id="nd-r3Fallback" class="select-input"><option value="">None</option>${offOpts(r3.fallbackReceiverId)}</select></label>
          </div>`
            : ''
        }`
      )}

      <!-- 4D. OPTION-PASS / RPO -->
      ${this.renderSubDrawer(
        'sub-rpo',
        'Option-Pass / RPO',
        'mech-rpo',
        Boolean(rpo?.enabled),
        `
        <label class="insp-switch-row"><input id="nd-rpoEnabled" type="checkbox" ${rpo?.enabled ? 'checked' : ''} /><span>Enable Run/Pass Conflict Window</span></label>
        ${
          rpo?.enabled
            ? `
          <div class="insp-grid-2">
            <label class="insp-cell"><span class="lbl">WIN START S</span><input id="nd-rpoStart" type="number" step="0.05" min="0.4" max="2.5" value="${rpo.decisionWindowStartSec}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">WIN END S</span><input id="nd-rpoEnd" type="number" step="0.05" min="0.6" max="3.0" value="${rpo.decisionWindowEndSec}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">PRIMARY REC</span><select id="nd-rpoRec1" class="select-input">${offOpts(rpo.primaryReceiverId)}</select></label>
            <label class="insp-cell"><span class="lbl">SECOND REC</span><select id="nd-rpoRec2" class="select-input"><option value="">None</option>${offOpts(rpo.secondaryReceiverId)}</select></label>
            <label class="insp-cell"><span class="lbl">SEP THRESH Y</span><input id="nd-rpoSep" type="number" step="0.1" min="1.5" max="6.0" value="${rpo.separationThresholdYds}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">THROW RATING</span><input id="nd-rpoArm" type="number" step="1" min="40" max="99" value="${rpo.throwerRating}" class="num-input" /></label>
          </div>`
            : ''
        }`
      )}

      <!-- 4E. BACKWARD TOSS / TOUCH PITCH -->
      ${this.renderSubDrawer(
        'sub-toss',
        'Backward Toss / Pitch',
        'mech-toss',
        Boolean(bt?.enabled),
        `
        <label class="insp-switch-row"><input id="nd-btEnabled" type="checkbox" ${bt?.enabled ? 'checked' : ''} /><span>Enable Timed Backward Pitch</span></label>
        ${
          bt?.enabled
            ? `
          <div class="insp-grid-2">
            <label class="insp-cell"><span class="lbl">TOSS TIME S</span><input id="nd-btTime" type="number" step="0.05" min="0.1" max="1.2" value="${bt.tossTimeSec}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">RECIPIENT</span><select id="nd-btRec" class="select-input">${offOpts(bt.recipientId)}</select></label>
            <label class="insp-cell"><span class="lbl">POST ROLE</span><select id="nd-btPostRole" class="select-input">${OFF_ROLES.map((r2) => `<option value="${r2.value}" ${(bt.postTossRole || 'ROUTE') === r2.value ? 'selected' : ''}>${r2.value}</option>`).join('')}</select></label>
          </div>`
            : ''
        }`
      )}

      <!-- 4F. DOWNFIELD HOOK & LATERAL -->
      ${this.renderSubDrawer(
        'sub-lat',
        'Hook & Lateral',
        'mech-lateral',
        Boolean(lat?.enabled),
        `
        <label class="insp-switch-row"><input id="nd-latEnabled" type="checkbox" ${lat?.enabled ? 'checked' : ''} /><span>Enable Catch-and-Pitch Lateral</span></label>
        ${
          lat?.enabled
            ? `
          <div class="insp-grid-2">
            <label class="insp-cell"><span class="lbl">PITCH TRAILER</span><select id="nd-latRec" class="select-input">${offOpts(lat.pitchTargetId)}</select></label>
            <label class="insp-cell"><span class="lbl">TRIGGER RAD Y</span><input id="nd-latRad" type="number" step="0.2" min="2.0" max="8.0" value="${lat.defenderCollapseRadius ?? 4.4}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">MAX PITCH Y</span><input id="nd-latDist" type="number" step="0.5" min="3.0" max="14.0" value="${lat.maxPitchDist ?? 9.0}" class="num-input" /></label>
            <label class="insp-cell"><span class="lbl">MIN SEP Y</span><input id="nd-latSep" type="number" step="0.2" min="1.0" max="5.0" value="${lat.minTargetSeparation ?? 2.3}" class="num-input" /></label>
          </div>`
            : ''
        }`
      )}
    `
    );
  }

  private renderRatingsLevel5(base: SimAgent): string {
    const r = base.ratings;
    const isOff = base.side === 'OFF';
    const sliders: { id: keyof SimAgent['ratings']; label: string; val: number }[] = [
      { id: 'speed', label: 'Speed', val: r.speed },
      { id: 'accel', label: 'Burst / Accel', val: r.accel },
      { id: 'power', label: 'Power / Drive', val: r.power },
      { id: 'finesse', label: 'Finesse / Route', val: r.finesse },
      { id: 'awareness', label: 'Awareness / IQ', val: r.awareness },
    ];

    return this.renderAccordion(
      'lvl5',
      'LEVEL 5 · RATINGS & ARCHETYPE',
      'lvl5-ratings',
      `OVR~${Math.round((r.speed + r.accel + r.power + r.finesse + r.awareness) / 5)}`,
      false,
      `
      <div class="insp-btn-row">
        ${
          isOff
            ? `<button id="nd-arch-pocket" class="btn btn-xs">ELITE POCKET QB</button>
               <button id="nd-arch-mobile" class="btn btn-xs">MOBILE DUAL QB</button>
               <button id="nd-arch-burner" class="btn btn-xs">4.33 WR</button>
               <button id="nd-arch-te" class="btn btn-xs">275LB TE</button>`
            : `<button id="nd-arch-edge" class="btn btn-xs">ALL-PRO EDGE</button>
               <button id="nd-arch-cb" class="btn btn-xs">LOCKDOWN CB</button>`
        }
      </div>
      <div class="rating-sliders">
        ${sliders
          .map(
            (s) => `
          <div class="rating-row">
            <span class="r-lbl">${s.label}</span>
            <input type="range" min="40" max="99" step="1" value="${s.val}" data-rating-key="${s.id}" class="r-slider" />
            <span class="r-val" id="nd-rval-${s.id}">${s.val}</span>
          </div>`
          )
          .join('')}
        ${
          isOff
            ? `<div class="rating-row" ${tipAttr('block-rating')}>
                <span class="r-lbl">Block Rating ${helpIcon('block-rating')}</span>
                <input type="range" min="40" max="99" step="1" value="${base.blockRating ?? r.power}" id="nd-blockRating" class="r-slider" />
                <span class="r-val" id="nd-rval-blockRating">${base.blockRating ?? r.power}</span>
              </div>`
            : ''
        }
      </div>
    `
    );
  }

  private renderAccordion(
    id: string,
    title: string,
    tipKey: string,
    statusText: string,
    defaultOpen: boolean,
    bodyHtml: string
  ): string {
    if (!this.openLevels.has(id) && !this.openLevels.has(`__init_${id}`)) {
      this.openLevels.add(`__init_${id}`);
      if (defaultOpen) this.openLevels.add(id);
    }
    const isOpen = this.openLevels.has(id);
    return `
      <section class="acc-section ${isOpen ? 'open' : ''}">
        <div class="acc-header" data-acc-toggle="${id}">
          <div class="acc-title-wrap">
            <span class="acc-chevron">${isOpen ? '▾' : '▸'}</span>
            <span class="acc-title">${title}</span>
            ${helpIcon(tipKey)}
          </div>
          <span class="acc-status">${esc(statusText)}</span>
        </div>
        <div class="acc-body">${bodyHtml}</div>
      </section>
    `;
  }

  private renderSubDrawer(
    id: string,
    title: string,
    tipKey: string,
    isActive: boolean,
    bodyHtml: string
  ): string {
    const isOpen = this.openLevels.has(id);
    return `
      <div class="sub-drawer ${isOpen ? 'open' : ''}">
        <div class="sub-header" data-acc-toggle="${id}">
          <div class="acc-title-wrap">
            <span class="acc-chevron">${isOpen ? '▾' : '▸'}</span>
            <span class="sub-title">${title}</span>
            ${helpIcon(tipKey)}
          </div>
          <span class="sub-badge ${isActive ? 'is-on' : ''}">${isActive ? 'ACTIVE' : 'OFF'}</span>
        </div>
        <div class="sub-body">${bodyHtml}</div>
      </div>
    `;
  }

  private bindEvents(base: SimAgent, allAgents: SimAgent[]): void {
    // Accordion toggles
    this.root.querySelectorAll('[data-acc-toggle]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.help-badge')) return;
        const id = (el as HTMLElement).dataset.accToggle!;
        if (this.openLevels.has(id)) this.openLevels.delete(id);
        else this.openLevels.add(id);
        this.render(base.id);
      });
    });

    const valOf = (id: string) => (this.root.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | null)?.value;
    const numOf = (id: string, fallback: number) => {
      const v = parseFloat(valOf(id) ?? '');
      return Number.isFinite(v) ? v : fallback;
    };
    const checkedOf = (id: string) => Boolean((this.root.querySelector(`#${id}`) as HTMLInputElement | null)?.checked);

    // Level 1: Alignment + Core Role + Snap Recipient + Read Order + Family
    this.root.querySelector('#nd-startX')?.addEventListener('change', () => {
      base.startX = +Math.max(-26.5, Math.min(26.5, numOf('nd-startX', base.startX))).toFixed(2);
      base.x = base.startX;
      this.cb.onMutate('Update Start X', true);
    });
    this.root.querySelector('#nd-startY')?.addEventListener('change', () => {
      base.startY = +Math.max(-9.0, Math.min(22.0, numOf('nd-startY', base.startY))).toFixed(2);
      base.y = base.startY;
      this.cb.onMutate('Update Start Y', true);
    });
    this.root.querySelector('#nd-snap-los')?.addEventListener('click', () => {
      base.startY = -0.35;
      base.y = -0.35;
      this.cb.onMutate('Snap Player to LOS', true);
    });
    this.root.querySelector('#nd-step-off')?.addEventListener('click', () => {
      base.startY = -1.15;
      base.y = -1.15;
      this.cb.onMutate('Step Player Off LOS', true);
    });

    this.root.querySelector('#nd-role')?.addEventListener('change', () => {
      if (base.side === 'OFF') {
        base.assignment.role = (valOf('nd-role') as BlockRoleType) || base.assignment.role;
      } else {
        if (!base.defAssignment) {
          base.defAssignment = { role: 'READ_RUN_PASS', targetX: base.startX, targetY: base.startY };
        }
        base.defAssignment.role = (valOf('nd-role') as DefRoleType) || base.defAssignment.role;
      }
      this.cb.onMutate('Change Role', true);
    });

    this.root.querySelector('#nd-readOrder')?.addEventListener('change', () => {
      const v = valOf('nd-readOrder');
      base.readOrder = v ? parseInt(v, 10) : undefined;
      this.cb.onMutate('Change Read Order', true);
    });

    this.root.querySelector('#nd-actionFamily')?.addEventListener('change', () => {
      const v = valOf('nd-actionFamily');
      base.actionFamily = v ? (v as FakeActionFamily) : undefined;
      this.cb.onMutate('Change Play Family', true);
    });

    this.root.querySelector('#nd-snapRecipient')?.addEventListener('change', () => {
      const on = checkedOf('nd-snapRecipient');
      if (on) {
        allAgents.filter((a) => a.side === 'OFF').forEach((o) => {
          o.isSnapRecipient = false;
        });
      }
      base.isSnapRecipient = on;
      this.cb.onMutate('Set Direct Snap Recipient', true);
    });

    // Level 2 OFF
    if (base.side === 'OFF') {
      ['nd-tgt1', 'nd-tgt2', 'nd-gapSet', 'nd-leverage', 'nd-delay'].forEach((id) => {
        this.root.querySelector(`#${id}`)?.addEventListener('change', () => {
          base.assignment.primaryTargetId = valOf('nd-tgt1') || null;
          base.assignment.secondaryTargetId = valOf('nd-tgt2') || null;
          base.assignment.gapOrSet = (valOf('nd-gapSet') as GapOrSetCode) || base.assignment.gapOrSet;
          base.assignment.leverage = (valOf('nd-leverage') as LeverageBias) || base.assignment.leverage;
          base.assignment.climbOrChipDelaySec = numOf('nd-delay', base.assignment.climbOrChipDelaySec);
          this.cb.onMutate('Update Assignment', false);
        });
      });

      this.root.querySelector('#nd-routePreset')?.addEventListener('change', () => {
        const val = valOf('nd-routePreset') as RoutePresetId | '';
        if (!val) return;
        applyRoutePresetToAgent(base, val);
        this.cb.onMutate(`Apply Route Preset ${val}`, false);
      });

      this.root.querySelector('#nd-pullPreset')?.addEventListener('change', () => {
        const val = valOf('nd-pullPreset');
        if (!val) return;
        const x0 = base.startX;
        const dir = x0 < 0 ? 1 : -1;
        if (val === 'PULL_KICK') {
          base.assignment.role = 'PULL_TRAP';
          base.assignment.waypoints = [{ x: +(x0 + dir * 1.5).toFixed(2), y: -1.6 }, { x: +(dir * 5.2).toFixed(2), y: 0.5 }];
        } else if (val === 'PULL_WRAP') {
          base.assignment.role = 'PULL_LEAD';
          base.assignment.waypoints = [{ x: +(x0 + dir * 2.0).toFixed(2), y: -1.8 }, { x: +(dir * 4.2).toFixed(2), y: 1.8 }, { x: +(dir * 4.5).toFixed(2), y: 4.5 }];
        } else if (val === 'BACKSIDE_TRAP') {
          base.assignment.role = 'PULL_TRAP';
          base.assignment.waypoints = [{ x: +(x0 + dir * 1.2).toFixed(2), y: -1.2 }, { x: +(dir * 1.8).toFixed(2), y: 0.2 }];
        } else if (val === 'PIN_PULL_SWEEP') {
          base.assignment.role = 'PULL_LEAD';
          base.assignment.waypoints = [{ x: +(x0 + 2.5).toFixed(2), y: -1.6 }, { x: 7.2, y: -0.5 }, { x: 8.5, y: 3.5 }];
        }
        this.cb.onMutate(`Apply Pull Preset ${val}`, false);
      });

      this.root.querySelector('#nd-draw-route')?.addEventListener('click', () => {
        if (['LT', 'LG', 'C', 'RG', 'RT'].includes(base.pos)) {
          if (!['PULL_LEAD', 'PULL_TRAP'].includes(base.assignment.role)) base.assignment.role = 'PULL_LEAD';
        } else if (base.pos !== 'RB' || base.assignment.role !== 'BALL_CARRIER') {
          base.assignment.role = 'ROUTE';
        }
        this.cb.onSetRouteDrawMode();
      });

      this.root.querySelector('#nd-add-wp')?.addEventListener('click', () => {
        const isOL = ['LT', 'LG', 'C', 'RG', 'RT'].includes(base.pos);
        const wps = base.assignment.waypoints;
        if (wps.length === 0) {
          if (isOL) {
            base.assignment.role = 'PULL_LEAD';
            const dir = base.startX < 0 ? 1 : -1;
            wps.push({ x: +(base.startX + dir * 2.2).toFixed(2), y: +(base.startY - 1.4).toFixed(2) });
          } else {
            if (base.pos !== 'RB' || base.assignment.role !== 'BALL_CARRIER') base.assignment.role = 'ROUTE';
            wps.push({ x: +base.startX.toFixed(2), y: +Math.max(4.5, base.startY + 6.0).toFixed(2) });
          }
        } else {
          const last = wps[wps.length - 1];
          const insideDir = base.startX < 0 ? 1 : -1;
          wps.push({ x: +(last.x + insideDir * 3.0).toFixed(2), y: +(last.y + 4.0).toFixed(2) });
        }
        this.cb.onMutate('Add Waypoint', false);
      });

      this.root.querySelector('#nd-pop-wp')?.addEventListener('click', () => {
        if (base.assignment.waypoints.length > 0) {
          base.assignment.waypoints.pop();
          this.cb.onMutate('Pop Waypoint', false);
        }
      });

      this.root.querySelector('#nd-clear-wp')?.addEventListener('click', () => {
        base.assignment.waypoints = [];
        this.cb.onMutate('Clear Waypoints', false);
      });

      this.root.querySelector('#nd-pick-def')?.addEventListener('click', () => {
        this.cb.onPickDefTarget();
      });

      this.root.querySelectorAll('[data-wp-axis]').forEach((inp) => {
        inp.addEventListener('change', (e) => {
          const el = e.currentTarget as HTMLInputElement;
          const idx = parseInt(el.dataset.wpIdx!, 10);
          const axis = el.dataset.wpAxis as 'x' | 'y';
          const v = parseFloat(el.value);
          if (Number.isFinite(v) && base.assignment.waypoints[idx]) {
            base.assignment.waypoints[idx][axis] = +v.toFixed(2);
            this.cb.onMutate(`Edit Waypoint L${idx + 1}`, false);
          }
        });
      });

      this.root.querySelectorAll('[data-wp-del]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.wpDel!, 10);
          base.assignment.waypoints.splice(idx, 1);
          this.cb.onMutate(`Delete Waypoint L${idx + 1}`, false);
        });
      });
    } else {
      // Level 2 DEF
      ['nd-defManTarget', 'nd-defTgtX', 'nd-defTgtY', 'nd-defCrossX'].forEach((id) => {
        this.root.querySelector(`#${id}`)?.addEventListener('change', () => {
          if (!base.defAssignment) base.defAssignment = { role: 'READ_RUN_PASS', targetX: base.startX, targetY: base.startY };
          base.defAssignment.manTargetId = valOf('nd-defManTarget') || undefined;
          base.defAssignment.targetX = numOf('nd-defTgtX', base.defAssignment.targetX);
          base.defAssignment.targetY = numOf('nd-defTgtY', base.defAssignment.targetY);
          const cx = valOf('nd-defCrossX');
          base.defAssignment.stuntCrossTargetX = cx !== '' && cx !== undefined ? parseFloat(cx) : undefined;
          this.cb.onMutate('Update Defender Assignment', false);
        });
      });

      this.root.querySelector('#nd-def-preset-spy')?.addEventListener('click', () => {
        const qb = allAgents.find((a) => a.side === 'OFF' && (a.isSnapRecipient || a.pos === 'QB'))?.id || 'QB';
        base.defAssignment = { role: 'QB_SPY', targetX: 0, targetY: 4.0, manTargetId: qb };
        this.cb.onMutate('Assign QB Spy', false);
      });
      this.root.querySelector('#nd-def-preset-brk')?.addEventListener('click', () => {
        base.defAssignment = { role: 'BRACKET_TOP', targetX: -12.0, targetY: 14.5, manTargetId: 'WR1' };
        this.cb.onMutate('Assign Calvin Bracket WR1', false);
      });
      this.root.querySelector('#nd-def-preset-edge')?.addEventListener('click', () => {
        base.defAssignment = { role: 'CONTAIN_EDGE', targetX: base.startX >= 0 ? 4.8 : -4.8, targetY: -4.5 };
        this.cb.onMutate('Assign Edge Contain', false);
      });
      this.root.querySelector('#nd-def-preset-mug')?.addEventListener('click', () => {
        base.defAssignment = { role: 'BLITZ_A', targetX: base.startX >= 0 ? 0.6 : -0.6, targetY: -4.5 };
        this.cb.onMutate('Assign A-Gap Blitz', false);
      });
    }

    // Level 3 Motion
    this.root.querySelector('#nd-motEnabled')?.addEventListener('change', () => {
      if (checkedOf('nd-motEnabled')) {
        base.preSnapMotion = {
          enabled: true,
          type: 'JET_RIGHT',
          speed: 5.8,
          dirX: 1,
          dirY: 0,
          originX: -8.5,
          originY: -1.5,
          snapX: base.startX,
          snapY: Math.min(-1.1, base.startY),
        };
      } else {
        base.preSnapMotion = undefined;
      }
      this.cb.onMutate('Toggle Pre-Snap Motion', true);
    });
    ['nd-motType', 'nd-motSpeed', 'nd-motOrigX', 'nd-motOrigY', 'nd-motSnapX', 'nd-motSnapY'].forEach((id) => {
      this.root.querySelector(`#${id}`)?.addEventListener('change', () => {
        if (!base.preSnapMotion) return;
        const tp = (valOf('nd-motType') as 'JET_RIGHT' | 'JET_LEFT' | 'ORBIT') || base.preSnapMotion.type;
        base.preSnapMotion.type = tp;
        base.preSnapMotion.dirX = tp === 'JET_LEFT' ? -1 : 1;
        base.preSnapMotion.speed = numOf('nd-motSpeed', base.preSnapMotion.speed);
        base.preSnapMotion.originX = numOf('nd-motOrigX', base.preSnapMotion.originX);
        base.preSnapMotion.originY = numOf('nd-motOrigY', base.preSnapMotion.originY);
        base.preSnapMotion.snapX = numOf('nd-motSnapX', base.preSnapMotion.snapX);
        base.preSnapMotion.snapY = numOf('nd-motSnapY', base.preSnapMotion.snapY);
        this.cb.onMutate('Update Pre-Snap Motion', true);
      });
    });

    // Level 4 Sub-Drawers
    this.root.querySelector('#nd-paEnabled')?.addEventListener('change', () => {
      base.playAction = checkedOf('nd-paEnabled')
        ? { enabled: true, meshDurationSec: 0.78, fakeCarrierId: 'RB', fakeGap: 'B_LEFT', isBootleg: false, bootDirection: 'POCKET' }
        : undefined;
      this.openLevels.add('sub-pa');
      this.cb.onMutate('Toggle Play-Action', true);
    });
    ['nd-paDur', 'nd-paCarrier', 'nd-paGap', 'nd-paBootDir', 'nd-paBoot'].forEach((id) => {
      this.root.querySelector(`#${id}`)?.addEventListener('change', () => {
        if (!base.playAction) return;
        base.playAction.meshDurationSec = numOf('nd-paDur', base.playAction.meshDurationSec);
        base.playAction.fakeCarrierId = valOf('nd-paCarrier') || base.playAction.fakeCarrierId;
        base.playAction.fakeGap = (valOf('nd-paGap') as GapOrSetCode) || base.playAction.fakeGap;
        base.playAction.bootDirection = (valOf('nd-paBootDir') as 'LEFT' | 'RIGHT' | 'POCKET') || 'POCKET';
        base.playAction.isBootleg = checkedOf('nd-paBoot');
        this.cb.onMutate('Update Play-Action', true);
      });
    });

    this.root.querySelector('#nd-fkEnabled')?.addEventListener('change', () => {
      const decoy = allAgents.find((a) => a.side === 'OFF' && a.id !== base.id && (a.pos === 'QB' || a.pos === 'RB'))?.id || 'QB';
      base.fakeAction = checkedOf('nd-fkEnabled')
        ? { enabled: true, family: base.actionFamily || 'PERIMETER_PITCH_TOSS', fakeTargetId: decoy, fakeStartSec: 0.12, fakeDurationSec: 0.65, fakeDirectionX: -7.5, fakeDirectionY: -2.8, affectsSpy: true }
        : undefined;
      this.openLevels.add('sub-fake');
      this.cb.onMutate('Toggle Fake Action', true);
    });
    ['nd-fkFamily', 'nd-fkTarget', 'nd-fkStart', 'nd-fkDur', 'nd-fkDirX', 'nd-fkDirY', 'nd-fkSpy'].forEach((id) => {
      this.root.querySelector(`#${id}`)?.addEventListener('change', () => {
        if (!base.fakeAction) return;
        base.fakeAction.family = (valOf('nd-fkFamily') as FakeActionFamily) || base.fakeAction.family;
        base.fakeAction.fakeTargetId = valOf('nd-fkTarget') || base.fakeAction.fakeTargetId;
        base.fakeAction.fakeStartSec = numOf('nd-fkStart', base.fakeAction.fakeStartSec);
        base.fakeAction.fakeDurationSec = numOf('nd-fkDur', base.fakeAction.fakeDurationSec);
        base.fakeAction.fakeDirectionX = numOf('nd-fkDirX', base.fakeAction.fakeDirectionX ?? -7.5);
        base.fakeAction.fakeDirectionY = numOf('nd-fkDirY', base.fakeAction.fakeDirectionY ?? -2.8);
        base.fakeAction.affectsSpy = checkedOf('nd-fkSpy');
        this.cb.onMutate('Update Fake Action', true);
      });
    });

    this.root.querySelector('#nd-r3Enabled')?.addEventListener('change', () => {
      const fallback = allAgents.find((a) => a.side === 'OFF' && (a.pos === 'TE' || a.pos === 'RB'))?.id;
      base.designedScrambleRead = checkedOf('nd-r3Enabled')
        ? {
            enabled: true,
            afterReadOrder: 2,
            minDecisionTimeSec: 1.95,
            voidCorridorCenterX: 0.5,
            voidCorridorHalfWidthX: 3.2,
            voidCorridorMaxY: 8.5,
            maxDefendersInVoid: 0,
            fallbackReceiverId: fallback,
            scrambleWaypoints: [{ x: 0.8, y: -1.0 }, { x: 1.5, y: 6.0 }, { x: 2.0, y: 18.0 }],
          }
        : undefined;
      this.openLevels.add('sub-read3');
      this.cb.onMutate('Toggle Read-3 Scramble', true);
    });
    const setVoidPreset = (cx: number) => {
      if (!base.designedScrambleRead) return;
      base.designedScrambleRead.voidCorridorCenterX = cx;
      base.designedScrambleRead.scrambleWaypoints = [
        { x: cx, y: -1.0 },
        { x: cx * 1.15, y: 6.0 },
        { x: cx * 1.25, y: 18.0 },
      ];
      this.cb.onMutate('Apply Read-3 Void Preset', true);
    };
    this.root.querySelector('#nd-r3-mid')?.addEventListener('click', () => setVoidPreset(0.4));
    this.root.querySelector('#nd-r3-right')?.addEventListener('click', () => setVoidPreset(7.5));
    this.root.querySelector('#nd-r3-left')?.addEventListener('click', () => setVoidPreset(-7.5));
    ['nd-r3After', 'nd-r3MinT', 'nd-r3CX', 'nd-r3HW', 'nd-r3MaxY', 'nd-r3Fallback'].forEach((id) => {
      this.root.querySelector(`#${id}`)?.addEventListener('change', () => {
        if (!base.designedScrambleRead) return;
        base.designedScrambleRead.afterReadOrder = numOf('nd-r3After', base.designedScrambleRead.afterReadOrder ?? 2);
        base.designedScrambleRead.minDecisionTimeSec = numOf('nd-r3MinT', base.designedScrambleRead.minDecisionTimeSec);
        base.designedScrambleRead.voidCorridorCenterX = numOf('nd-r3CX', base.designedScrambleRead.voidCorridorCenterX);
        base.designedScrambleRead.voidCorridorHalfWidthX = numOf('nd-r3HW', base.designedScrambleRead.voidCorridorHalfWidthX);
        base.designedScrambleRead.voidCorridorMaxY = numOf('nd-r3MaxY', base.designedScrambleRead.voidCorridorMaxY);
        base.designedScrambleRead.fallbackReceiverId = valOf('nd-r3Fallback') || undefined;
        this.cb.onMutate('Update Read-3 Scramble', true);
      });
    });

    this.root.querySelector('#nd-rpoEnabled')?.addEventListener('change', () => {
      const rec = allAgents.find((a) => a.side === 'OFF' && a.assignment.role === 'ROUTE')?.id || 'WR2';
      base.optionPass = checkedOf('nd-rpoEnabled')
        ? { enabled: true, throwerRating: base.ratings.finesse, decisionWindowStartSec: 1.15, decisionWindowEndSec: 1.65, primaryReceiverId: rec, separationThresholdYds: 3.5 }
        : undefined;
      this.openLevels.add('sub-rpo');
      this.cb.onMutate('Toggle Option-Pass', true);
    });
    ['nd-rpoStart', 'nd-rpoEnd', 'nd-rpoRec1', 'nd-rpoRec2', 'nd-rpoSep', 'nd-rpoArm'].forEach((id) => {
      this.root.querySelector(`#${id}`)?.addEventListener('change', () => {
        if (!base.optionPass) return;
        base.optionPass.decisionWindowStartSec = numOf('nd-rpoStart', base.optionPass.decisionWindowStartSec);
        base.optionPass.decisionWindowEndSec = numOf('nd-rpoEnd', base.optionPass.decisionWindowEndSec);
        base.optionPass.primaryReceiverId = valOf('nd-rpoRec1') || base.optionPass.primaryReceiverId;
        base.optionPass.secondaryReceiverId = valOf('nd-rpoRec2') || undefined;
        base.optionPass.separationThresholdYds = numOf('nd-rpoSep', base.optionPass.separationThresholdYds);
        base.optionPass.throwerRating = numOf('nd-rpoArm', base.optionPass.throwerRating);
        this.cb.onMutate('Update Option-Pass', true);
      });
    });

    this.root.querySelector('#nd-btEnabled')?.addEventListener('change', () => {
      const rec = allAgents.find((a) => a.side === 'OFF' && a.id !== base.id)?.id || 'RB';
      base.backwardToss = checkedOf('nd-btEnabled')
        ? { enabled: true, tossTimeSec: 0.28, recipientId: rec, postTossRole: 'ROUTE' }
        : undefined;
      this.openLevels.add('sub-toss');
      this.cb.onMutate('Toggle Backward Toss', true);
    });
    ['nd-btTime', 'nd-btRec', 'nd-btPostRole'].forEach((id) => {
      this.root.querySelector(`#${id}`)?.addEventListener('change', () => {
        if (!base.backwardToss) return;
        base.backwardToss.tossTimeSec = numOf('nd-btTime', base.backwardToss.tossTimeSec);
        base.backwardToss.recipientId = valOf('nd-btRec') || base.backwardToss.recipientId;
        base.backwardToss.postTossRole = (valOf('nd-btPostRole') as BlockRoleType) || 'ROUTE';
        this.cb.onMutate('Update Backward Toss', true);
      });
    });

    this.root.querySelector('#nd-latEnabled')?.addEventListener('change', () => {
      const rec = allAgents.find((a) => a.side === 'OFF' && a.id !== base.id)?.id || 'WR2';
      base.lateralConfig = checkedOf('nd-latEnabled')
        ? { enabled: true, pitchTargetId: rec, gatherDelaySec: 0.15, defenderCollapseRadius: 4.4, maxPitchDist: 9.0, minTargetSeparation: 2.3 }
        : undefined;
      this.openLevels.add('sub-lat');
      this.cb.onMutate('Toggle Hook & Lateral', true);
    });
    ['nd-latRec', 'nd-latRad', 'nd-latDist', 'nd-latSep'].forEach((id) => {
      this.root.querySelector(`#${id}`)?.addEventListener('change', () => {
        if (!base.lateralConfig) return;
        base.lateralConfig.pitchTargetId = valOf('nd-latRec') || base.lateralConfig.pitchTargetId;
        base.lateralConfig.defenderCollapseRadius = numOf('nd-latRad', base.lateralConfig.defenderCollapseRadius ?? 4.4);
        base.lateralConfig.maxPitchDist = numOf('nd-latDist', base.lateralConfig.maxPitchDist ?? 9.0);
        base.lateralConfig.minTargetSeparation = numOf('nd-latSep', base.lateralConfig.minTargetSeparation ?? 2.3);
        this.cb.onMutate('Update Hook & Lateral', true);
      });
    });

    // Level 5 Ratings & Archetypes
    this.root.querySelectorAll('[data-rating-key]').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const el = e.currentTarget as HTMLInputElement;
        const k = el.dataset.ratingKey as keyof SimAgent['ratings'];
        const val = parseInt(el.value, 10);
        base.ratings[k] = val;
        const lbl = this.root.querySelector(`#nd-rval-${k}`);
        if (lbl) lbl.textContent = String(val);
      });
      inp.addEventListener('change', () => {
        this.cb.onMutate('Adjust Player Rating', false);
      });
    });
    const brEl = this.root.querySelector('#nd-blockRating') as HTMLInputElement | null;
    brEl?.addEventListener('input', () => {
      const v = parseInt(brEl.value, 10);
      base.blockRating = v;
      const lbl = this.root.querySelector('#nd-rval-blockRating');
      if (lbl) lbl.textContent = String(v);
    });
    brEl?.addEventListener('change', () => this.cb.onMutate('Adjust Block Rating', false));

    const applyArch = (ratings: SimAgent['ratings'], blockRating?: number) => {
      base.ratings = { ...ratings };
      if (blockRating !== undefined) base.blockRating = blockRating;
      this.cb.onMutate('Apply Player Archetype', false);
    };
    this.root.querySelector('#nd-arch-pocket')?.addEventListener('click', () => applyArch({ speed: 74, accel: 76, power: 78, finesse: 94, awareness: 95 }, 42));
    this.root.querySelector('#nd-arch-mobile')?.addEventListener('click', () => applyArch({ speed: 92, accel: 93, power: 88, finesse: 85, awareness: 82 }, 46));
    this.root.querySelector('#nd-arch-burner')?.addEventListener('click', () => applyArch({ speed: 98, accel: 97, power: 60, finesse: 88, awareness: 85 }, 54));
    this.root.querySelector('#nd-arch-te')?.addEventListener('click', () => applyArch({ speed: 83, accel: 85, power: 90, finesse: 82, awareness: 85 }, 90));
    this.root.querySelector('#nd-arch-edge')?.addEventListener('click', () => applyArch({ speed: 88, accel: 91, power: 91, finesse: 92, awareness: 90 }));
    this.root.querySelector('#nd-arch-cb')?.addEventListener('click', () => applyArch({ speed: 94, accel: 94, power: 70, finesse: 91, awareness: 90 }));
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
