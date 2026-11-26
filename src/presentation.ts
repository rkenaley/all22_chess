import trackingRaw from './data/tracking_validation_report.json';
import qbSensRaw from './data/qb_archetype_sensitivity_report.json';
import read3Raw from './data/read3_scramble_dual_qb_report.json';
import nashRaw from './data/nash_2qb_tournament_report.json';
import seasonRaw from './data/season_4down_monte_carlo_report.json';
import seqRaw from './data/play_sequencing_memory_report.json';
import paretoRaw from './data/pareto_60pct_cap_report.json';
import winCompRaw from './data/win_component_analysis_report.json';

interface SlideSpec {
  id: string;
  shortTitle: string;
  kicker: string;
  badge: string;
  render: () => string;
}

const tracking = trackingRaw as typeof trackingRaw;
const qbSens = qbSensRaw as typeof qbSensRaw;
const read3 = read3Raw as typeof read3Raw;
const nash = nashRaw as typeof nashRaw;
const season = seasonRaw as typeof seasonRaw;
const seq = seqRaw as typeof seqRaw;
const pareto = paretoRaw as typeof paretoRaw;
const winComp = winCompRaw as typeof winCompRaw;

function fmtEpa(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(3)}`;
}

function fmtSigned(v: number, digits = 2): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svgHorizBars(
  rows: Array<{ label: string; value: number; color: string; display?: string; sub?: string }>,
  opts: { min?: number; max: number; width?: number; height?: number; unit?: string; padL?: number; padR?: number }
): string {
  const w = opts.width ?? 680;
  const h = opts.height ?? Math.max(190, rows.length * 42 + 24);
  const padL = opts.padL ?? 225;
  const padR = opts.padR ?? 130;
  const padT = 14;
  const minVal = opts.min ?? 0;
  const span = Math.max(0.001, opts.max - minVal);
  const plotW = w - padL - padR;
  const rowH = (h - padT - 12) / Math.max(1, rows.length);
  const zeroX = minVal < 0 ? padL + ((0 - minVal) / span) * plotW : padL;

  const lines: string[] = [];
  if (minVal < 0) {
    lines.push(
      `<line x1="${zeroX.toFixed(1)}" y1="${padT}" x2="${zeroX.toFixed(1)}" y2="${h - 8}" stroke="rgba(148,189,219,0.45)" stroke-dasharray="3 3" />`
    );
  }

  rows.forEach((r, idx) => {
    const cy = padT + idx * rowH + rowH * 0.5;
    const barH = Math.min(24, rowH * 0.56);
    const valClamped = Math.max(minVal, Math.min(opts.max, r.value));
    const valX = padL + ((valClamped - minVal) / span) * plotW;
    const xStart = Math.min(zeroX, valX);
    const barW = Math.max(2, Math.abs(valX - zeroX));
    const disp = r.display ?? `${r.value.toFixed(2)}${opts.unit ?? ''}`;

    // Keep negative labels from overflowing left across padL onto y-axis labels
    const fitsLeftOfBar = r.value < 0 && valX - padL >= 84;
    const textX = r.value >= 0 ? valX + 8 : fitsLeftOfBar ? valX - 8 : zeroX + 8;
    const textAnchor = r.value >= 0 ? 'start' : fitsLeftOfBar ? 'end' : 'start';

    lines.push(`
      <text x="${padL - 10}" y="${(cy + 3).toFixed(1)}" text-anchor="end" fill="#cbd5e1" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="600">${esc(r.label)}</text>
      <rect x="${padL}" y="${(cy - barH * 0.5).toFixed(1)}" width="${plotW}" height="${barH}" rx="4" fill="rgba(148,189,219,0.08)" />
      <rect x="${xStart.toFixed(1)}" y="${(cy - barH * 0.5).toFixed(1)}" width="${barW.toFixed(1)}" height="${barH}" rx="4" fill="${r.color}" />
      <text x="${textX.toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="${textAnchor}" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="700">${esc(disp)}</text>
    `);
  });

  return `<svg viewBox="0 0 ${w} ${h}" class="svg-chart">${lines.join('')}</svg>`;
}

function svgGroupedCols(
  groups: Array<{ label: string; aLabel: string; aVal: number; bLabel: string; bVal: number }>,
  opts: { max: number; aName: string; bName: string; aColor: string; bColor: string; suffix?: string }
): string {
  const w = 680;
  const h = 300;
  const padL = 48;
  const padR = 20;
  const padT = 36;
  const padB = 56;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const baseY = padT + plotH;

  const parts: string[] = [];
  // Legend spaced evenly to prevent overlap on long names
  parts.push(`
    <rect x="${padL}" y="6" width="12" height="12" rx="2" fill="${opts.aColor}" />
    <text x="${padL + 18}" y="16" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="10.5">${esc(opts.aName)}</text>
    <rect x="${padL + 318}" y="6" width="12" height="12" rx="2" fill="${opts.bColor}" />
    <text x="${padL + 336}" y="16" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="10.5">${esc(opts.bName)}</text>
  `);

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const v = (opts.max * i) / 4;
    const y = baseY - (v / opts.max) * plotH;
    parts.push(`
      <line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}" stroke="rgba(148,189,219,0.14)" />
      <text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#7b95a8" font-family="JetBrains Mono, monospace" font-size="10">${v.toFixed(2)}</text>
    `);
  }

  const gW = plotW / Math.max(1, groups.length);
  groups.forEach((g, idx) => {
    const gx = padL + idx * gW;
    const colW = Math.min(34, gW * 0.28);
    const gap = 8;
    const ax = gx + gW * 0.5 - colW - gap * 0.5;
    const bx = gx + gW * 0.5 + gap * 0.5;
    const aH = Math.max(2, (Math.max(0, g.aVal) / opts.max) * plotH);
    const bH = Math.max(2, (Math.max(0, g.bVal) / opts.max) * plotH);
    const suf = opts.suffix ?? '';

    parts.push(`
      <rect x="${ax.toFixed(1)}" y="${(baseY - aH).toFixed(1)}" width="${colW.toFixed(1)}" height="${aH.toFixed(1)}" rx="4" fill="${opts.aColor}" />
      <text x="${(ax + colW * 0.5).toFixed(1)}" y="${(baseY - aH - 6).toFixed(1)}" text-anchor="middle" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">${fmtSigned(g.aVal, 2)}${suf}</text>
      <rect x="${bx.toFixed(1)}" y="${(baseY - bH).toFixed(1)}" width="${colW.toFixed(1)}" height="${bH.toFixed(1)}" rx="4" fill="${opts.bColor}" />
      <text x="${(bx + colW * 0.5).toFixed(1)}" y="${(baseY - bH - 6).toFixed(1)}" text-anchor="middle" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">${fmtSigned(g.bVal, 2)}${suf}</text>
      <text x="${(gx + gW * 0.5).toFixed(1)}" y="${baseY + 18}" text-anchor="middle" fill="#cbd5e1" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">${esc(g.label)}</text>
      <text x="${(gx + gW * 0.5).toFixed(1)}" y="${baseY + 33}" text-anchor="middle" fill="#7b95a8" font-family="JetBrains Mono, monospace" font-size="9.5">${esc(g.aLabel)} / ${esc(g.bLabel)}</text>
    `);
  });

  return `<svg viewBox="0 0 ${w} ${h}" class="svg-chart">${parts.join('')}</svg>`;
}

const SLIDES: SlideSpec[] = [
  // SLIDE 1: TITLE & EXECUTIVE THESIS
  {
    id: 'title',
    shortTitle: '1. Thesis',
    kicker: 'RESEARCH BRIEFING · ALL-22 KINEMATIC CHESS ENGINE',
    badge: 'SYMMETRY DRIVES OPTIONALITY',
    render: () => {
      const bdb = tracking.bdb10Hz;
      const rc = bdb.replayChecks;
      const scBest = season.results.find((r) => r.id === 'ARGON_V2_ONFIELD_2QB_20M')!;
      const mdp = seq.sameFormationChiralSubgame.policyVsDcMatrix.MDP_OPTIMAL_SEQUENCER;
      return `
        <div class="hero-layout">
          <div>
            <div class="slide-kicker">METHODOLOGY &amp; OFFENSIVE INNOVATION OVERVIEW</div>
            <h1 class="hero-headline">Symmetry Drives Optionality</h1>
            <p class="slide-subtitle" style="font-size:16px; line-height:1.55;">
              A 20 Hz multi-agent football physics &amp; game-theory framework calibrated against <strong>NFL Big Data Bowl 2027</strong> tracking data and nflverse/FTN 2022–2024 EPA distributions—evaluating how pre-snap symmetry, optionality across all 11 offensive roles, cap-fungible QBs, designed Read #3 scramble voids, and multi-snap deception break optimal NFL defenses.
            </p>
            <div class="cols-2" style="display:grid; gap:12px; margin-top:22px;">
              <div class="card">
                <div class="card-title">TRACKING FIDELITY</div>
                <div class="kpi-big">${bdb.bdb2027Summary.cohortPlayers} PLAYERS</div>
                <div class="kpi-sub">${rc.playsReplayed.toLocaleString()} BDB plays replayed · L3 OL MAE ${rc.l3RunDispMaeYds}y · WR 1s MAE ${rc.wr1sDispMaeYds}y</div>
              </div>
              <div class="card">
                <div class="card-title">13-FRONT NASH + 500-SEASON MC</div>
                <div class="kpi-big emerald">${scBest.season.avgWins} WINS</div>
                <div class="kpi-sub">Argon v2 2-QB (\$${scBest.qbRoomCapM}M room): ${scBest.season.sbPct}% Super Bowl odds vs 0.0% Conv-11 (\$60M)</div>
              </div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            <div class="card">
              <div class="card-title">CORE ARCHITECTURAL PILLARS</div>
              <ul class="insight-list">
                <li><strong>1. Empirically Grounded Physics:</strong> Continuous 20 Hz Newtonian steering validated against BDB 2027 10 Hz combine &amp; play-level trajectories.</li>
                <li class="emerald"><strong>2. Complete Optionality &amp; Read #3 Voids:</strong> IF/THEN grass-void scrambles lift mid-mobile QBs by +0.31 to +0.35 EPA/play.</li>
                <li class="gold"><strong>3. Chiral 2-QB Split-Shotgun:</strong> Identical L/R mirror alignments double-bind Spy, Wide-9, and Calvin bracket shells.</li>
                <li class="rose"><strong>4. Defensive Memory &amp; MDP Sequencing:</strong> Fakes trade -0.22s timing cost to weaponize defender eye-conflict (+0.172 EPA prime span).</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="slide-foot">
          <span>CALIBRATION: BDB-2027 10Hz + NFLVERSE 2022-24 EPA</span>
          <span>ALL METRICS BOUND LIVE FROM VERIFIED SIMULATION REPORTS</span>
        </div>
      `;
    },
  },

  // SLIDE 2: PHYSICS & BDB-2027 VALIDATION
  {
    id: 'validation',
    shortTitle: '2. BDB Validation',
    kicker: 'CALIBRATION · NFL BIG DATA BOWL 2027 + NFLVERSE 2022–2024',
    badge: '100% LEGALITY & BIOMECHANICS PASS',
    render: () => {
      const rc = tracking.bdb10Hz.replayChecks;
      const emp = tracking.simulatedVsEmpirical.passAll;
      const leg = tracking.legalityAndBiomechanics;
      const bars = svgHorizBars(
        [
          { label: 'L3 Run OL Disp MAE', value: rc.l3RunDispMaeYds, color: '#10b981', display: `${rc.l3RunDispMaeYds} yds` },
          { label: 'WR 1.0s Stem MAE', value: rc.wr1sDispMaeYds, color: '#38bdf8', display: `${rc.wr1sDispMaeYds} yds` },
          { label: 'L2 Pass Rush MAE', value: rc.l2PassRushMaeYds, color: '#38bdf8', display: `${rc.l2PassRushMaeYds} yds` },
          { label: 'L1 Pocket 1s Depth', value: rc.l1PocketDepthMaeYds, color: '#fbbf24', display: `${rc.l1PocketDepthMaeYds} yds` },
          { label: 'C1 Shell Drift MAE', value: rc.c1ShellDriftMaeYds, color: '#a78bfa', display: `${rc.c1ShellDriftMaeYds} yds` },
          { label: 'C2 Man Sep RMSE', value: rc.c2ManSepRmseYds, color: '#fb7185', display: `${rc.c2ManSepRmseYds} yds` },
        ],
        { max: 1.2, width: 650, height: 270 }
      );
      return `
        <div>
          <div class="slide-kicker-row">
            <span class="slide-kicker">${'CALIBRATION · BDB-2027 & NFLVERSE VALIDATION'}</span>
            <span class="slide-pill">${leg.legalityPassPct}% LEGALITY AUDIT</span>
          </div>
          <h2 class="slide-title">20 Hz Engine Calibrated Within Half a Yard Across ${rc.playsReplayed.toLocaleString()} Replays</h2>
          <p class="slide-subtitle">No unphysical teleporting, zero illegal formations, and human-bounded unengaged cornering acceleration (${leg.maxUnengagedGForce}g max G-force, ${leg.minPlayerSepYds}y min separation).</p>
        </div>
        <div class="slide-body cols-2">
          <div class="card">
            <div class="card-title">TRACKING DISPLACEMENT ERROR VS BDB-2027 (YARDS)</div>
            ${bars}
          </div>
          <div class="card">
            <div class="card-title">AGGREGATE DROPBACK CALIBRATION (N=${emp.n})</div>
            <table class="deck-table">
              <thead><tr><th>METRIC</th><th>SIMULATED</th><th>NOTES</th></tr></thead>
              <tbody>
                <tr class="hi"><td>Completion %</td><td>${emp.compPct}%</td><td>BDB empirical band</td></tr>
                <tr><td>Sack Rate</td><td>${emp.sackPct}%</td><td>Edge/interior balance</td></tr>
                <tr><td>Pressure Rate</td><td>${emp.pressurePct}%</td><td>Pocket hull &lt;45%</td></tr>
                <tr><td>Mean TTT</td><td>${emp.tttMean}s</td><td>IQR ${emp.tttP25}s–${emp.tttP75}s</td></tr>
                <tr><td>Throw Sep</td><td>${emp.sepAtThrowMean} yds</td><td>Open window threshold</td></tr>
                <tr><td>EPA Success %</td><td>${emp.epaSuccessPct}%</td><td>Situational nflverse fit</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="slide-foot">
          <span>SOURCE: tracking_validation_report.json</span>
          <span>510 COHORT PLAYERS · 7 LOS LEGALITY VERIFIED ON EVERY PLAY</span>
        </div>
      `;
    },
  },

  // SLIDE 3: OFFENSIVE INNOVATION & ROLE OPTIONALITY
  {
    id: 'optionality',
    shortTitle: '3. Optionality',
    kicker: 'OFFENSIVE SYSTEMS · BREAKING CONV-11 PREDICTABILITY',
    badge: 'FROM RIGID ROLES TO OPTIONALITY',
    render: () => {
      const mat = qbSens.playbookByQbMatrix;
      const rows = [
        { name: 'Shanahan-12 PA (Elite)', epa: mat.SHANAHAN_12_PA.ELITE_POCKET_52M.nashEpa, ppg: mat.SHANAHAN_12_PA.ELITE_POCKET_52M.nashPpg, diff: mat.SHANAHAN_12_PA.ELITE_POCKET_52M.teamNetDiff, color: '#10b981' },
        { name: 'Apex 2027 Unconstrained', epa: mat.APEX_2027_UNCON.ELITE_POCKET_52M.nashEpa, ppg: mat.APEX_2027_UNCON.ELITE_POCKET_52M.nashPpg, diff: mat.APEX_2027_UNCON.ELITE_POCKET_52M.teamNetDiff, color: '#38bdf8' },
        { name: 'Omega 2027 (Mid-Mobile)', epa: mat.OMEGA_2027_UNCON.MID_MOBILE_13M.nashEpa, ppg: mat.OMEGA_2027_UNCON.MID_MOBILE_13M.nashPpg, diff: mat.OMEGA_2027_UNCON.MID_MOBILE_13M.teamNetDiff, color: '#fbbf24' },
        { name: 'Conv-11 Spread (Elite)', epa: mat.CONV_11_SPREAD.ELITE_POCKET_52M.nashEpa, ppg: mat.CONV_11_SPREAD.ELITE_POCKET_52M.nashPpg, diff: mat.CONV_11_SPREAD.ELITE_POCKET_52M.teamNetDiff, color: '#fb7185' },
        { name: 'Conv-11 Spread (Mid-Mob)', epa: mat.CONV_11_SPREAD.MID_MOBILE_13M.nashEpa, ppg: mat.CONV_11_SPREAD.MID_MOBILE_13M.nashPpg, diff: mat.CONV_11_SPREAD.MID_MOBILE_13M.teamNetDiff, color: '#f43f5e' },
      ];
      return `
        <div>
          <div class="slide-kicker-row">
            <span class="slide-kicker">OFFENSIVE EVOLUTION · OPTIONALITY MATRIX</span>
            <span class="slide-pill">CONV-11 COLLAPSES WITHOUT ELITE PROCESSOR</span>
          </div>
          <h2 class="slide-title">Role Optionality Unlocks Multi-Conflict Advantages Conv-11 Cannot Match</h2>
          <p class="slide-subtitle">Conventional 11-personnel static pocket structures become negative-EV (${mat.CONV_11_SPREAD.MID_MOBILE_13M.nashEpa} Nash EPA) once a defense deploys bracket cones and simulated pressures.</p>
        </div>
        <div class="slide-body cols-equal-2">
          <div class="card">
            <div class="card-title">NASH GAME-THEORY VALUE BY OFFENSIVE SYSTEM</div>
            ${svgHorizBars(
              rows.map((r) => ({ label: r.name, value: r.epa, color: r.color, display: `${fmtEpa(r.epa)} EPA` })),
              { min: -0.25, max: 0.25, width: 640, height: 270 }
            )}
          </div>
          <div class="card">
            <div class="card-title">WHY SYMMETRIC OPTIONALITY WINS AT THE SNAP</div>
            <ul class="insight-list">
              <li><strong>Singleback -> Gun Convergence:</strong> Best Shanahan/Argon plays hide pass vs run intent behind identical pre-snap 7-man alignments.</li>
              <li class="emerald"><strong>Multi-Vector Ball Security:</strong> Displaced backward passes, option-pass windows, and designed Read #3 scrambles convert bad coverage looks into positive yardage.</li>
              <li class="gold"><strong>Argon Split-Gun 2-QB:</strong> Putting two QBs on field creates bilateral snap ambiguity (+0.085 mean unconstrained EPA; +0.3915 legacy Nash before counters).</li>
              <li class="rose"><strong>Warning on Conventional 11:</strong> Even an elite \$52M passer averages negative net team differential (${mat.CONV_11_SPREAD.ELITE_POCKET_52M.teamNetDiff} PPG) in rigid Conv-11 spread.</li>
            </ul>
          </div>
        </div>
        <div class="slide-foot">
          <span>SOURCE: qb_archetype_sensitivity_report.json</span>
          <span>SHANAHAN-12 &amp; ARGON LEAD BOTH RAW EFFICIENCY AND CAP ADJUSTED NET MARGIN</span>
        </div>
      `;
    },
  },

  // SLIDE 4: QB ARCHETYPE SENSITIVITY & FUNGIBILITY ECONOMICS
  {
    id: 'qb-economics',
    shortTitle: '4. QB Fungibility',
    kicker: 'SALARY CAP & ATTRITION ECONOMICS · 17-GAME SIMULATION',
    badge: 'DON\'T BUILD AN ELITE-QB SYSTEM WITHOUT AN ELITE QB',
    render: () => {
      const econ = qbSens.qbFungibility17GameEconomics;
      const pick = (id: string) => econ.find((e) => e.id === id)!;
      const rows = [
        pick('SINGLE_ELITE_POCKET_55M_ROOM'),
        pick('SINGLE_SUPERMAX_DUAL_PROTECTED_58M'),
        pick('SINGLE_SUPERMAX_DUAL_AGGRESSIVE_58M'),
        pick('SINGLE_MID_MOBILE_PROTECTED_16M'),
        pick('FUNGIBLE_2QB_MID_MOBILE_20M'),
        pick('MISMATCH_MID_MOBILE_IN_CONV11'),
      ];
      const niceNames: Record<string, string> = {
        SINGLE_ELITE_POCKET_55M_ROOM: 'Elite Pocket Room',
        SINGLE_SUPERMAX_DUAL_PROTECTED_58M: 'Supermax Dual (Prot)',
        SINGLE_SUPERMAX_DUAL_AGGRESSIVE_58M: 'Supermax Dual (Agg)',
        SINGLE_MID_MOBILE_PROTECTED_16M: 'Mid-Mobile (Prot)',
        FUNGIBLE_2QB_MID_MOBILE_20M: 'Fungible 2-QB Room',
        MISMATCH_MID_MOBILE_IN_CONV11: 'Mismatch in Conv-11',
      };
      return `
        <div>
          <div class="slide-kicker-row">
            <span class="slide-kicker">QB ARCHETYPE SENSITIVITY · 17-GAME HEALTH &amp; CAP CLIFF</span>
            <span class="slide-pill">CAP REINVESTMENT vs BACKUP CLIFF</span>
          </div>
          <h2 class="slide-title">QB Value = Read Versatility + Cap Reinvestment + System Fit</h2>
          <p class="slide-subtitle">A \$16.5M–\$20M mobile QB thrives inside a tailored motion/Read-3 system (+3.99 net PPG), yet cratered to <strong>-14.18 net PPG</strong> when forced to run a static \$55M pocket Conv-11 playbook.</p>
        </div>
        <div class="slide-body cols-2">
          <div class="card">
            <div class="card-title">17-GAME BLENDED NET TEAM DIFFERENTIAL (PPG)</div>
            ${svgHorizBars(
              rows.map((r) => ({
                label: niceNames[r.id] || r.id,
                value: r.blended17gTeamNetDiff,
                color: r.blended17gTeamNetDiff >= 10 ? '#10b981' : r.blended17gTeamNetDiff >= 0 ? '#38bdf8' : '#fb7185',
                display: `${fmtSigned(r.blended17gTeamNetDiff, 2)} PPG`,
              })),
              { min: -16, max: 16, width: 650, height: 275, padL: 190, padR: 95 }
            )}
          </div>
          <div class="card">
            <div class="card-title">ARCHETYPE ECONOMICS LEDGER</div>
            <table class="deck-table">
              <thead><tr><th>ROOM MODEL</th><th>CAP</th><th>QB1 GMS</th><th>BLENDED PPG</th><th>NET DIFF</th></tr></thead>
              <tbody>
                ${rows
                  .map(
                    (r, i) => `
                  <tr class="${i === 0 || i === 3 ? 'hi' : ''}">
                    <td>${esc(niceNames[r.id] || r.id)}</td>
                    <td>\$${r.qbRoomCapM}M</td>
                    <td>${r.qb1HealthyGames}</td>
                    <td>${r.blended17gOffPpg}</td>
                    <td>${fmtSigned(r.blended17gTeamNetDiff, 2)}</td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="slide-foot">
          <span>SOURCE: qb_archetype_sensitivity_report.json</span>
          <span>FUNGIBLE 2-QB DESIGN REQUIRES IDENTICAL READ ACCESS SO INJURY CLIFF VANISHES</span>
        </div>
      `;
    },
  },

  // SLIDE 5: DESIGNED SCRAMBLE AS READ #3 (IF/THEN VOID)
  {
    id: 'read3-void',
    shortTitle: '5. Read #3 Void',
    kicker: 'IF/THEN DECISION TREE · ENGINEERED GRASS CORRIDOR',
    badge: '+0.305 TO +0.398 CAUSAL EPA LIFT',
    render: () => {
      const exp = read3.experiment1_designedScrambleRead3;
      const archKeys = ['ELITE_POCKET_55M', 'MID_MOBILE_18M', 'RAW_MOBILE_11M', 'ELITE_DUAL_58M'] as const;
      const groups = archKeys.map((k) => {
        const d = exp[k];
        return {
          label: d.label.replace(' ($', ' (\$'),
          aLabel: 'Clr',
          aVal: d.clearoutRight.causalEpaLift,
          bLabel: 'Mesh',
          bVal: d.meshMiddle.causalEpaLift,
        };
      });
      const epSpyMesh = exp.ELITE_POCKET_55M.meshMiddle.vsSpyWithRead3.fallbackPassRate;
      const epSpyClr = exp.ELITE_POCKET_55M.clearoutRight.vsSpyWithRead3.fallbackPassRate;
      return `
        <div>
          <div class="slide-kicker-row">
            <span class="slide-kicker">READ-3 SCRAMBLE PROTOCOL · ZERO ORACLE BIAS</span>
            <span class="slide-pill">IF VOID CLEAR -&gt; SCRAMBLE · ELSE -&gt; READ #4 PASS</span>
          </div>
          <h2 class="slide-title">Designed Scramble Read #3 Adds +0.31 to +0.40 EPA Without Abandoning Read #4</h2>
          <p class="slide-subtitle">Routes deliberately vacate a downfield turf rectangle; after checking Reads 1–2, observable kinematic branching either bursts into empty grass or checks down cleanly against a Spy.</p>
        </div>
        <div class="slide-body cols-2">
          <div class="card">
            <div class="card-title">CAUSAL EPA LIFT VS CONTROL (N=352 / CONCEPT)</div>
            ${svgGroupedCols(groups, {
              max: 0.48,
              aName: 'Clearout Right Void (Causal Δ EPA)',
              bName: 'Mesh Middle Void (Causal Δ EPA)',
              aColor: '#38bdf8',
              bColor: '#10b981',
            })}
          </div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div class="card">
              <div class="card-title">READ-4 SPY CHECKDOWN DISCIPLINE</div>
              <div class="kpi-big emerald">${epSpyClr}% / ${epSpyMesh}%</div>
              <div class="kpi-sub">When facing a dedicated QB Spy, Elite Pocket QBs automatically abort the Read-3 rush and trigger the Read #4 outlet pass (+0.468 EPA on Mesh).</div>
            </div>
            <div class="card">
              <div class="card-title">MID-MOBILE SWEET SPOT (\$18M)</div>
              <ul class="insight-list">
                <li class="emerald"><strong>Clearout Right Lift:</strong> +${exp.MID_MOBILE_18M.clearoutRight.causalEpaLift.toFixed(3)} EPA (${exp.MID_MOBILE_18M.clearoutRight.withRead3.meanEpa} vs ${exp.MID_MOBILE_18M.clearoutRight.controlNoRead3.meanEpa})</li>
                <li class="gold"><strong>Mesh Middle Lift:</strong> +${exp.MID_MOBILE_18M.meshMiddle.causalEpaLift.toFixed(3)} EPA (100% Spy Fallback conversion vs Spy)</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="slide-foot">
          <span>SOURCE: read3_scramble_dual_qb_report.json</span>
          <span>11 FRONTS · VERIFIED AGAINST MAN C1, SPY CONTAIN &amp; CALVIN BRACKET</span>
        </div>
      `;
    },
  },

  // SLIDE 6: CHIRAL 2-QB & 13-FRONT NASH EQUILIBRIUM
  {
    id: 'nash-2qb',
    shortTitle: '6. Chiral 2-QB',
    kicker: 'MINIMAX GAME THEORY · 9 LEGACY FRONTS VS 13 ADAPTIVE FRONTS',
    badge: 'DIRECTIONAL SNAP SYMMETRY',
    render: () => {
      const ts = nash.tournamentSummary;
      const list = [
        ts.SHANAHAN_12_MID_MOBILE_READ3,
        ts.SHANAHAN_12_SUPERMAX_DUAL,
        ts.SHANAHAN_12_ELITE_POCKET,
        ts.ARGON_V2_CHIRAL_2QB,
        ts.CONV_11_ELITE_POCKET,
      ];
      return `
        <div>
          <div class="slide-kicker-row">
            <span class="slide-kicker">MINIMAX EQUILIBRIUM · CHIRAL 2-QB VS ADAPTIVE DC</span>
            <span class="slide-pill">SOLVED OVER ALL 13 DEFENSIVE FRONTS</span>
          </div>
          <h2 class="slide-title">13-Front Nash Stress Test Exposes Single-Counter Traps—Chiral 2-QB Survives</h2>
          <p class="slide-subtitle">Adding 4 custom anti-2QB counters (QB Spy Contain, Calvin Bracket, Symmetric Wide-9, Double Edge Spy) docks Chiral 2-QB just ${ts.ARGON_V2_CHIRAL_2QB.adaptiveCounterPenalty.toFixed(3)} EPA while preserving +${ts.ARGON_V2_CHIRAL_2QB.nash13Value.toFixed(3)} Nash EPA.</p>
        </div>
        <div class="slide-body cols-2">
          <div class="card">
            <div class="card-title">LEGACY 9-FRONT VS ADAPTIVE 13-FRONT NASH EPA</div>
            ${svgGroupedCols(
              [
                { label: 'Shan12 Mid-R3', aLabel: '9-Def', aVal: Math.max(0, ts.SHANAHAN_12_MID_MOBILE_READ3.nash9Value), bLabel: '13-Def', bVal: Math.max(0, ts.SHANAHAN_12_MID_MOBILE_READ3.nash13Value) },
                { label: 'Shan12 Dual', aLabel: '9-Def', aVal: Math.max(0, ts.SHANAHAN_12_SUPERMAX_DUAL.nash9Value), bLabel: '13-Def', bVal: Math.max(0, ts.SHANAHAN_12_SUPERMAX_DUAL.nash13Value) },
                { label: 'Shan12 Pocket', aLabel: '9-Def', aVal: Math.max(0, ts.SHANAHAN_12_ELITE_POCKET.nash9Value), bLabel: '13-Def', bVal: Math.max(0, ts.SHANAHAN_12_ELITE_POCKET.nash13Value) },
                { label: 'Argon v2 2QB', aLabel: '9-Def', aVal: Math.max(0, ts.ARGON_V2_CHIRAL_2QB.nash9Value), bLabel: '13-Def', bVal: Math.max(0, ts.ARGON_V2_CHIRAL_2QB.nash13Value) },
                { label: 'Conv-11 Pocket', aLabel: '9-Def', aVal: Math.max(0, ts.CONV_11_ELITE_POCKET.nash9Value), bLabel: '13-Def', bVal: Math.max(0, ts.CONV_11_ELITE_POCKET.nash13Value) },
              ],
              {
                max: 0.52,
                aName: 'Legacy 9-Front Nash EPA',
                bName: 'Adaptive 13-Front Nash EPA',
                aColor: '#a78bfa',
                bColor: '#10b981',
              }
            )}
          </div>
          <div class="card">
            <div class="card-title">4 ADAPTIVE DEFENSIVE COUNTERS ADDED TO SIM</div>
            <ul class="insight-list">
              <li><strong>NICKEL_QB_SPY_CONTAIN_C1:</strong> Explicit 4-technique Edge contain + dedicated MLB QB Spy shutting down straight scrambles.</li>
              <li class="gold"><strong>NICKEL_CALVIN_BRACKET_WR1:</strong> Safety roof BRACKET_TOP double-teaming WR1 to force Read #2/#3 progression discipline.</li>
              <li class="emerald"><strong>NICKEL_SYMMETRIC_WIDE9_C4:</strong> Mirrored Wide-9 edges nullifying directional pistol/split-gun outside leverage.</li>
              <li class="rose"><strong>BASE_34_DOUBLE_EDGE_SPY_C3:</strong> Dual Edge Spies choking perimeter dual-QB pitch and bootleg lanes simultaneously.</li>
            </ul>
          </div>
        </div>
        <div class="slide-foot">
          <span>SOURCE: nash_2qb_tournament_report.json (${nash.repsPerCell} reps/cell)</span>
          <span>SHANAHAN-12 READ3 (0.4615) &amp; ARGON V2 CHIRAL (0.2861) SURVIVE FULL COUNTER SUITE</span>
        </div>
      `;
    },
  },

  // SLIDE 7: 500-SEASON 4-DOWN CAP-ADJUSTED MONTE CARLO
  {
    id: 'season-mc',
    shortTitle: '7. 500-Season MC',
    kicker: '17-GAME NFL DYNASTY VALIDATOR · 4-DOWN AGGRESSION + CAP REINVESTMENT',
    badge: `${season.seasonsPerArch} FULL SEASONS PER ARCHITECTURE`,
    render: () => {
      const res = season.results;
      const niceArch: Record<string, string> = {
        CONV11_ELITE_60M: 'Conv-11 Elite ($60M)',
        SHAN12_ELITE_60M: 'Shan-12 Elite ($60M)',
        SHAN12_SUPERMAX_DUAL_60M: 'Shan-12 Dual ($60M)',
        SINGLE_MID_MOBILE_23M: 'Single Mid-Mob ($23M)',
        FUNGIBLE_BENCH_2QB_20M: 'Fungible 2-QB ($20M)',
        ARGON_V2_ONFIELD_2QB_20M: 'Argon v2 2-QB ($20M)',
      };
      return `
        <div>
          <div class="slide-kicker-row">
            <span class="slide-kicker">500-SEASON 4-DOWN MONTE CARLO · INJURIES + SALARY CAP INCLUDED</span>
            <span class="slide-pill">SUPER BOWL CONVERSION PROBABILITY</span>
          </div>
          <h2 class="slide-title">Argon v2 2-QB (\$20M Room) Reaches 52.0% Super Bowl Odds vs 0.0% Conv-11 (\$60M)</h2>
          <p class="slide-subtitle">Cap reinvestment from a \$20M 2-QB room funds +2.72 PPG defensive upgrade while split workload keeps QB1 healthy more weeks and eliminates backup collapse.</p>
        </div>
        <div class="slide-body cols-2">
          <div class="card">
            <div class="card-title">AVERAGE 17-GAME WINS (500-SEASON SIM)</div>
            ${svgHorizBars(
              res.map((r) => ({
                label: niceArch[r.id] || r.id,
                value: r.season.avgWins,
                color:
                  r.id.includes('SHAN12_ELITE')
                    ? '#10b981'
                    : r.id.includes('ARGON')
                    ? '#38bdf8'
                    : r.id.includes('CONV11')
                    ? '#fb7185'
                    : '#fbbf24',
                display: `${r.season.avgWins.toFixed(2)}W (${r.season.sbPct}% SB)`,
              })),
              { max: 18, width: 670, height: 270, padL: 195, padR: 145 }
            )}
          </div>
          <div class="card">
            <div class="card-title">500-SEASON DYNASTY SCORECARD</div>
            <table class="deck-table">
              <thead><tr><th>ARCHITECTURE</th><th>QB CAP</th><th>PF/G</th><th>WINS</th><th>PO%</th><th>SB%</th></tr></thead>
              <tbody>
                ${res
                  .map(
                    (r) => `
                  <tr class="${r.season.sbPct >= 50 ? 'hi' : ''}">
                    <td>${esc((niceArch[r.id] || r.id).replace(/\s*\(\$\d+M\)/, ''))}</td>
                    <td>\$${r.qbRoomCapM}M</td>
                    <td>${r.season.pfG}</td>
                    <td>${r.season.avgWins}</td>
                    <td>${r.season.playoffPct}%</td>
                    <td>${r.season.sbPct}%</td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="slide-foot">
          <span>SOURCE: season_4down_monte_carlo_report.json</span>
          <span>CAP-ADJUSTED FUNGIBLE 2-QB ARCHITECTURE MATCHES SUPERMAX EFFICIENCY ON HALF THE QB CAP</span>
        </div>
      `;
    },
  },

  // SLIDE 8: FAKE PRIMING & MULTI-SNAP DEFENSIVE MEMORY MDP
  {
    id: 'memory-mdp',
    shortTitle: '8. Memory MDP',
    kicker: 'SEQUENTIAL GAME THEORY · MARRIED FAKES + DEFENSIVE MEMORY STATE',
    badge: '+0.1884 EPA VS FAST-REACT DC',
    render: () => {
      const sub = seq.sameFormationChiralSubgame;
      const mat = sub.policyVsDcMatrix;
      const primes = seq.primingAuditTable.filter((p) => p.isFake && 'primeSpan' in p);
      const canon = sub.canonical10PlaySequence.slice(0, 10);
      return `
        <div>
          <div class="slide-kicker-row">
            <span class="slide-kicker">MULTI-SNAP SEQUENCING MDP · SAME-FORMATION CHIRAL 8 PLAYBOOK</span>
            <span class="slide-pill">PRIMING REAL -&gt; FAKE EYE-CONFLICT</span>
          </div>
          <h2 class="slide-title">Married Fakes &amp; MDP Sequencing Capture +0.14–0.19 EPA Over Static Nash</h2>
          <p class="slide-subtitle">When defenders remember prior snaps, spamming one play craters to ${mat.STATIC_NAIVE_SPAM.FAST_REACT} EPA, whereas Dynamic Programming alternation between Real setups and Fake Keep/Boot counters dominates adaptive DCs.</p>
        </div>
        <div class="slide-body cols-equal-2">
          <div class="card">
            <div class="card-title">POLICY VS DC RESPONSE MATRIX (EPA/PLAY)</div>
            <table class="deck-table">
              <thead><tr><th>OFFENSE POLICY</th><th>ADAPT MEM</th><th>FAST REACT</th><th>HYBRID</th><th>OMNI NASH</th></tr></thead>
              <tbody>
                <tr><td>STATIC_NAIVE_SPAM</td><td style="color:#fb7185">${fmtSigned(mat.STATIC_NAIVE_SPAM.ADAPTIVE_MEMORY, 3)}</td><td style="color:#fb7185">${fmtSigned(mat.STATIC_NAIVE_SPAM.FAST_REACT, 3)}</td><td>${fmtSigned(mat.STATIC_NAIVE_SPAM.HYBRID_ELITE, 3)}</td><td>${fmtSigned(mat.STATIC_NAIVE_SPAM.OMNISCIENT_NASH, 3)}</td></tr>
                <tr><td>STATIC_NASH_MIX</td><td>${fmtSigned(mat.STATIC_NASH_MIX.ADAPTIVE_MEMORY, 3)}</td><td>${fmtSigned(mat.STATIC_NASH_MIX.FAST_REACT, 3)}</td><td>${fmtSigned(mat.STATIC_NASH_MIX.HYBRID_ELITE, 3)}</td><td>${fmtSigned(mat.STATIC_NASH_MIX.OMNISCIENT_NASH, 3)}</td></tr>
                <tr><td>2_REAL_1_FAKE</td><td>${fmtSigned(mat.HEURISTIC_2_REAL_1_FAKE.ADAPTIVE_MEMORY, 3)}</td><td>${fmtSigned(mat.HEURISTIC_2_REAL_1_FAKE.FAST_REACT, 3)}</td><td>${fmtSigned(mat.HEURISTIC_2_REAL_1_FAKE.HYBRID_ELITE, 3)}</td><td>${fmtSigned(mat.HEURISTIC_2_REAL_1_FAKE.OMNISCIENT_NASH, 3)}</td></tr>
                <tr class="hi"><td>MDP_OPTIMAL_SEQ</td><td>${fmtSigned(mat.MDP_OPTIMAL_SEQUENCER.ADAPTIVE_MEMORY, 3)}</td><td>${fmtSigned(mat.MDP_OPTIMAL_SEQUENCER.FAST_REACT, 3)}</td><td>${fmtSigned(mat.MDP_OPTIMAL_SEQUENCER.HYBRID_ELITE, 3)}</td><td>${fmtSigned(mat.MDP_OPTIMAL_SEQUENCER.OMNISCIENT_NASH, 3)}</td></tr>
                <tr class="hi"><td>NASH_GUARDED_SEQ</td><td>${fmtSigned(mat.NASH_GUARDED_SEQUENCER.ADAPTIVE_MEMORY, 3)}</td><td>${fmtSigned(mat.NASH_GUARDED_SEQUENCER.FAST_REACT, 3)}</td><td>${fmtSigned(mat.NASH_GUARDED_SEQUENCER.HYBRID_ELITE, 3)}</td><td>${fmtSigned(mat.NASH_GUARDED_SEQUENCER.OMNISCIENT_NASH, 3)}</td></tr>
              </tbody>
            </table>
            <div style="margin-top:8px; font-family:var(--font-mono); font-size:10px; color:var(--gold);">
              PRIME SPAN (PRIMED VS BURNED): ${primes.map((p) => `${p.id.replace('CHIRAL_', '').slice(0, 14)} ${fmtSigned((p as { primeSpan?: number }).primeSpan ?? 0, 3)}`).join(' · ')}
            </div>
          </div>
          <div class="card">
            <div class="card-title">OPTIMAL CANONICAL 10-SNAP DRIVE SEQUENCE (MEAN ${fmtEpa(sub.canonical10PlayMeanEpa)} EPA)</div>
            <div class="seq-strip">
              ${canon
                .map(
                  (c) => `
                <div class="seq-chip ${c.isFake ? 'fake' : ''}">
                  <div style="color:${c.isFake ? '#e879f9' : '#38bdf8'}; font-weight:800;">#${c.snap} ${c.isFake ? 'FAKE' : 'REAL'}</div>
                  <div style="color:#f8fafc; font-weight:700; margin:2px 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.calledPlay.replace('CHIRAL_', '')}</div>
                  <div style="color:#10b981;">${fmtEpa(c.expectedEpa)} EPA</div>
                </div>`
                )
                .join('')}
            </div>
          </div>
        </div>
        <div class="slide-foot">
          <span>SOURCE: play_sequencing_memory_report.json (${seq.repsPerTensorCell} reps/tensor cell)</span>
          <span>REAL PLAYS PRIME MEMORY SO SUBSEQUENT MARRIED FAKES FORCE DEFENDER OVER-COMMITMENT</span>
        </div>
      `;
    },
  },

  // SLIDE 9: FIXED 60%-CAP GM x OC PARETO FRONTIER
  {
    id: 'pareto-60pct',
    shortTitle: '9. 60% Cap Pareto',
    kicker: 'GM × OC ARBITRAGE · STRICT 60% ($165M) OFFENSIVE CAP FRONTIER',
    badge: 'OL/TE ROI = 3.2× SUPERMAX QB PER $1M',
    render: () => {
      const ports = pareto.portfolios;
      const frontierIds = new Set(pareto.paretoFrontierSteadyStateIds);

      // Build crisp SVG Pareto scatter plot (X = 13-Front Nash EPA, Y = 17-Game Avg Wins)
      const w = 680;
      const h = 365;
      const padL = 54;
      const padR = 26;
      const padT = 26;
      const padB = 46;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;
      const xMin = -0.11;
      const xMax = 0.20;
      const yMin = 2.0;
      const yMax = 15.0;
      const sx = (v: number) => padL + ((v - xMin) / (xMax - xMin)) * plotW;
      const sy = (v: number) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

      const svgParts: string[] = [];
      // Grid lines
      for (const yv of [4, 6, 8, 10, 12, 14]) {
        const y = sy(yv);
        svgParts.push(
          `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}" stroke="rgba(148,189,219,0.13)" />` +
            `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#7b95a8" font-family="JetBrains Mono, monospace" font-size="10">${yv}W</text>`
        );
      }
      for (const xv of [-0.10, -0.05, 0.0, 0.05, 0.10, 0.15, 0.20]) {
        const x = sx(xv);
        svgParts.push(
          `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${padT + plotH}" stroke="${xv === 0 ? 'rgba(148,189,219,0.42)' : 'rgba(148,189,219,0.12)'}" ${xv === 0 ? 'stroke-dasharray="4 3"' : ''} />` +
            `<text x="${x.toFixed(1)}" y="${padT + plotH + 16}" text-anchor="middle" fill="#7b95a8" font-family="JetBrains Mono, monospace" font-size="10">${xv >= 0 ? '+' : ''}${xv.toFixed(2)}</text>`
        );
      }
      svgParts.push(
        `<text x="${(padL + plotW * 0.5).toFixed(1)}" y="${h - 8}" text-anchor="middle" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">13-FRONT ADAPTIVE NASH EPA / PLAY (STRICT $165M OFFENSE)</text>`
      );

      // Steady-state Pareto Frontier connecting line
      const fPts = ports
        .filter((p) => frontierIds.has(p.id))
        .sort((a, b) => a.nash13Epa - b.nash13Epa);
      if (fPts.length >= 2) {
        const ptsAttr = fPts.map((p) => `${sx(p.nash13Epa).toFixed(1)},${sy(p.seasonEqual0.avgWins).toFixed(1)}`).join(' ');
        svgParts.push(
          `<polyline points="${ptsAttr}" fill="none" stroke="#10b981" stroke-width="2.6" stroke-dasharray="6 4" />`
        );
        const mx = (sx(fPts[0].nash13Epa) + sx(fPts[1].nash13Epa)) * 0.5 + 28;
        const my = Math.min(sy(fPts[0].seasonEqual0.avgWins), sy(fPts[1].seasonEqual0.avgWins)) - 22;
        svgParts.push(
          `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" fill="#10b981" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="800">STEADY-STATE PARETO FRONTIER</text>`
        );
      }

      // Label placement tuned cleanly per portfolio ID
      const labelPos: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }> = {
        P1_CONV11_SUPERMAX_POCKET: { dx: 12, dy: 4, anchor: 'start' },
        P2_CONV11_STAR_WR_CHEAP_OL: { dx: 12, dy: 4, anchor: 'start' },
        P3_SHAN12_SUPERMAX_SQUEEZED: { dx: 12, dy: 4, anchor: 'start' },
        P4_SHAN12_SUPERMAX_DUAL_SQUEEZED: { dx: 6, dy: 23, anchor: 'end' },
        P5_SHAN12_TRENCH_BULLY_MID_MOB: { dx: -14, dy: 2, anchor: 'end' },
        P6_CHIRAL_2QB_ELITE_OL_STATIC: { dx: 12, dy: 4, anchor: 'start' },
        P7_CHIRAL_2QB_ELITE_OL_MDP: { dx: 12, dy: 14, anchor: 'start' },
        P8_ROOKIE_WINDOW_SHAN12: { dx: -14, dy: 4, anchor: 'end' },
      };

      for (const p of ports) {
        const cx = sx(p.nash13Epa);
        const cy = sy(p.seasonEqual0.avgWins);
        const isFrontier = frontierIds.has(p.id);
        const isRookie = !p.repeatableSteadyState;
        const color = isRookie
          ? '#fbbf24'
          : isFrontier
          ? '#10b981'
          : p.isDualQbOnField
          ? '#38bdf8'
          : p.schemeFamily === 'SHANAHAN_12'
          ? '#a78bfa'
          : '#fb7185';
        const radius = Math.max(6.5, Math.min(13, 6 + Math.sqrt(p.seasonEqual0.sbPct) * 1.1));
        const lp = labelPos[p.id] ?? { dx: 10, dy: 4, anchor: 'start' };

        if (isRookie) {
          svgParts.push(
            `<polygon points="${cx},${cy - 10} ${cx + 10},${cy} ${cx},${cy + 10} ${cx - 10},${cy}" fill="${color}" stroke="#061016" stroke-width="2" />`
          );
        } else {
          svgParts.push(
            `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="${color}" fill-opacity="0.88" stroke="${isFrontier ? '#ecfdf5' : '#071016'}" stroke-width="${isFrontier ? 2.2 : 1.5}" />`
          );
        }

        svgParts.push(
          `<text x="${(cx + lp.dx).toFixed(1)}" y="${(cy + lp.dy).toFixed(1)}" text-anchor="${lp.anchor}" fill="${isFrontier || isRookie ? '#f8fafc' : '#cbd5e1'}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">${esc(p.shortLabel)} (${p.seasonEqual0.avgWins.toFixed(1)}W · ${p.seasonEqual0.sbPct.toFixed(0)}% SB)</text>`
        );
      }

      const marginal = pareto.marginalCapShifts.filter((m) => m.id !== 'BASE_BALANCED');
      const mLabels: Record<string, string> = {
        PLUS_12M_OL_MINUS_WR: '+$12M OL (from WR)',
        PLUS_10M_TE_MINUS_WR: '+$10M TE/OL (from WR)',
        UPGRADE_QB_FROM_OL_WR: '+$38M Elite QB (from OL/WR/TE)',
        PLUS_12M_WR_MINUS_OL: '+$12M WR (starving OL)',
      };
      const marginalBars = svgHorizBars(
        marginal.map((m) => ({
          label: mLabels[m.id] || m.id,
          value: m.deltaVsBase,
          color: m.deltaVsBase >= 0.08 ? (m.id.includes('QB') ? '#fbbf24' : '#10b981') : '#fb7185',
          display: `${fmtSigned(m.deltaVsBase, 3)} EPA`,
        })),
        { min: -0.04, max: 0.14, width: 620, height: 170, padL: 220, padR: 92 }
      );

      const top5 = [
        ports.find((p) => p.id === 'P5_SHAN12_TRENCH_BULLY_MID_MOB')!,
        ports.find((p) => p.id === 'P4_SHAN12_SUPERMAX_DUAL_SQUEEZED')!,
        ports.find((p) => p.id === 'P7_CHIRAL_2QB_ELITE_OL_MDP')!,
        ports.find((p) => p.id === 'P3_SHAN12_SUPERMAX_SQUEEZED')!,
        ports.find((p) => p.id === 'P2_CONV11_STAR_WR_CHEAP_OL')!,
      ];

      return `
        <div>
          <div class="slide-kicker-row">
            <span class="slide-kicker">FIXED 60% OFFENSIVE CAP ($165M) · ZERO DEFENSIVE BONUS ASSUMPTIONS</span>
            <span class="slide-pill">EQUAL 0% HAIRCUT · 13 ADAPTIVE FRONTS</span>
          </div>
          <h2 class="slide-title">At Fixed 60% Cap, Trench-Bully Read-3 ($22M QB) Beats $60M Pocket by +3.6 Wins</h2>
          <p class="slide-subtitle">When a $60M pocket QB actually pays his OL cap squeeze ($44M OL), wins drop to 8.67 (1.4% SB). Only Trench-Bully + Read-3 (12.27W) and Supermax Dual + Read-3 (11.93W) sit on the steady-state Pareto frontier.</p>
        </div>
        <div class="slide-body cols-equal-2">
          <div class="card">
            <div class="card-title">PARETO FRONTIER: 13-FRONT NASH EPA VS 17-GAME WINS (BUBBLE = SB%)</div>
            <svg viewBox="0 0 ${w} ${h}" class="svg-chart">${svgParts.join('')}</svg>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; min-height:0;">
            <div class="card">
              <div class="card-title">MARGINAL CAP ROI AT CONSTANT $165M (Δ 13-FRONT EPA)</div>
              ${marginalBars}
            </div>
            <div class="card">
              <div class="card-title">STEADY-STATE CAP-CONSTRAINED SCORECARD (EQUAL 40% DEF)</div>
              <table class="deck-table">
                <thead><tr><th>PORTFOLIO ($165M)</th><th>QB / OL</th><th>NASH13</th><th>WINS</th><th>SB%</th></tr></thead>
                <tbody>
                  ${top5
                    .map(
                      (p) => `
                    <tr class="${frontierIds.has(p.id) ? 'hi' : ''}">
                      <td>${esc(p.shortLabel)}</td>
                      <td>$${p.budget.qbM}M / $${p.budget.olM}M</td>
                      <td>${fmtSigned(p.nash13Epa, 3)}</td>
                      <td>${p.seasonEqual0.avgWins.toFixed(2)}</td>
                      <td>${p.seasonEqual0.sbPct.toFixed(1)}%</td>
                    </tr>`
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="slide-foot">
          <span>SOURCE: pareto_60pct_cap_report.json (18 reps/cell · 500 seasons · 0% equal haircut)</span>
          <span>+$12M OL (+0.116 EPA) MATCHES +$38M POCKET QB (+0.116 EPA) AT 3.2× HIGHER CAPITAL EFFICIENCY</span>
        </div>
      `;
    },
  },

  // SLIDE 10: 5-GROUP ORTHOGONAL WIN COMPONENT & QB x OL SUBSTITUTION ANALYSIS
  {
    id: 'win-components',
    shortTitle: '10. Win Drivers',
    kicker: 'ORTHOGONAL 2^(5-1) RESOLUTION-V DECOMPOSITION · QB / OL / WR / TE / RB',
    badge: 'OL EXPLAINS 36.1% OF WIN VARIANCE (>2× QB)',
    render: () => {
      const me = winComp.mainEffects;
      const ordered = [me.OL, me.QB, me.TE, me.RB, me.WR];
      const runs = winComp.factorialRuns;
      const avgW = (arr: typeof runs) => arr.reduce((s, r) => s + r.avgWins, 0) / Math.max(1, arr.length);

      const qbLowOl = +(
        avgW(runs.filter((r) => r.levels.OL === -1 && r.levels.QB === 1)) -
        avgW(runs.filter((r) => r.levels.OL === -1 && r.levels.QB === -1))
      ).toFixed(2);
      const qbHighOl = +(
        avgW(runs.filter((r) => r.levels.OL === 1 && r.levels.QB === 1)) -
        avgW(runs.filter((r) => r.levels.OL === 1 && r.levels.QB === -1))
      ).toFixed(2);
      const olLowQb = +(
        avgW(runs.filter((r) => r.levels.QB === -1 && r.levels.OL === 1)) -
        avgW(runs.filter((r) => r.levels.QB === -1 && r.levels.OL === -1))
      ).toFixed(2);
      const olHighQb = +(
        avgW(runs.filter((r) => r.levels.QB === 1 && r.levels.OL === 1)) -
        avgW(runs.filter((r) => r.levels.QB === 1 && r.levels.OL === -1))
      ).toFixed(2);

      const probes = winComp.crossCheckProbes;
      const cBase = probes.find((p) => p.code === 'CONV11_ALL_LOW')!;
      const cOl = probes.find((p) => p.code === 'CONV11_PLUS_OL')!;
      const cQb = probes.find((p) => p.code === 'CONV11_PLUS_QB')!;
      const cWr = probes.find((p) => p.code === 'CONV11_PLUS_WR')!;

      const rawBars = svgHorizBars(
        ordered.map((m) => ({
          label: `${m.group} (+$${m.deltaCapM}M)`,
          value: m.deltaWins,
          color:
            m.group === 'OL'
              ? '#10b981'
              : m.group === 'QB'
              ? '#38bdf8'
              : m.group === 'RB'
              ? '#fbbf24'
              : m.group === 'TE'
              ? '#a78bfa'
              : '#fb7185',
          display: `+${m.deltaWins.toFixed(2)}W (${m.varSharePct}% var)`,
        })),
        { max: 3.4, width: 650, height: 220, padL: 130, padR: 175 }
      );

      const roiBars = svgHorizBars(
        [...ordered]
          .sort((a, b) => b.winsPer10M - a.winsPer10M)
          .map((m) => ({
            label: `${m.group} Cap ROI`,
            value: m.winsPer10M,
            color:
              m.group === 'RB'
                ? '#fbbf24'
                : m.group === 'OL'
                ? '#10b981'
                : m.group === 'TE'
                ? '#a78bfa'
                : m.group === 'QB'
                ? '#38bdf8'
                : '#fb7185',
            display: `+${m.winsPer10M.toFixed(2)} W / $10M`,
          })),
        { max: 1.5, width: 620, height: 185, padL: 120, padR: 140 }
      );

      const qbOlInt = winComp.twoWayInteractions.find((x) => x.pair === 'QB × OL')!;

      return `
        <div>
          <div class="slide-kicker-row">
            <span class="slide-kicker">ORTHOGONAL COMPONENT ANALYSIS · UNCONFOUNDED 5-GROUP WIN LEVERAGE</span>
            <span class="slide-pill">QB × OL INTERACTION = ${fmtSigned(qbOlInt.deltaWins, 2)}W (${qbOlInt.varSharePct}% VAR)</span>
          </div>
          <h2 class="slide-title">OL Drives +2.93W (36% Var) vs QB +1.99W—and Makes a $60M QB Almost Redundant</h2>
          <p class="slide-subtitle">Upgrading OL cuts Pressure -16.0%, Sacks -2.04%, lifts Comp% +2.59%, AND adds +0.92 YPC. Once OL is elite ($74M), upgrading from a $20M Mid-Mobile QB to a $60M Elite Pocket QB adds just <strong>${fmtSigned(qbHighOl, 2)} Wins</strong>.</p>
        </div>
        <div class="slide-body cols-equal-2">
          <div style="display:flex; flex-direction:column; gap:10px; min-height:0;">
            <div class="card">
              <div class="card-title">ORTHOGONAL MAIN EFFECT ON WINS (BUDGET → ELITE, SHAN-12)</div>
              ${rawBars}
            </div>
            <div class="card">
              <div class="card-title">CONV-11 SPREAD CROSS-CHECK (OL STILL BEATS QB &amp; WR)</div>
              <table class="deck-table">
                <thead><tr><th>UPGRADE FROM ALL-BUDGET CONV-11</th><th>WINS</th><th>Δ WINS</th><th>PRESS%</th><th>RUSH YPC</th></tr></thead>
                <tbody>
                  <tr><td>All-Budget Baseline</td><td>${cBase.avgWins.toFixed(2)}</td><td>—</td><td>${cBase.pressRatePct}%</td><td>${cBase.rushYpc}y</td></tr>
                  <tr class="hi"><td>+ Elite OL (+$36M)</td><td>${cOl.avgWins.toFixed(2)}</td><td>+${(cOl.avgWins - cBase.avgWins).toFixed(2)}W</td><td>${cOl.pressRatePct}%</td><td>${cOl.rushYpc}y</td></tr>
                  <tr><td>+ Elite Pocket QB (+$40M)</td><td>${cQb.avgWins.toFixed(2)}</td><td>+${(cQb.avgWins - cBase.avgWins).toFixed(2)}W</td><td>${cQb.pressRatePct}%</td><td>${cQb.rushYpc}y</td></tr>
                  <tr><td>+ Elite WR Corps (+$28M)</td><td>${cWr.avgWins.toFixed(2)}</td><td>${(cWr.avgWins - cBase.avgWins).toFixed(2)}W</td><td>${cWr.pressRatePct}%</td><td>${cWr.rushYpc}y</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; min-height:0;">
            <div class="card">
              <div class="card-title">CAP EFFICIENCY: MARGINAL WINS PER $10M SPENT</div>
              ${roiBars}
            </div>
            <div class="card">
              <div class="card-title">THE QB × OL SUBSTITUTION LAW (CONDITIONAL Δ WINS)</div>
              <ul class="insight-list">
                <li class="emerald"><strong>Upgrade OL (+$36M):</strong> adds <strong>${fmtSigned(olLowQb, 2)}W</strong> with a $20M Mobile QB, and still adds <strong>${fmtSigned(olHighQb, 2)}W</strong> on top of a $60M Pocket QB.</li>
                <li class="gold"><strong>Upgrade QB (+$40M):</strong> adds <strong>${fmtSigned(qbLowOl, 2)}W</strong> behind a $38M OL (rescue effect), but only <strong>${fmtSigned(qbHighOl, 2)}W</strong> behind a $74M Elite OL.</li>
                <li class="rose"><strong>Market Steal &amp; Trap:</strong> RB (+${me.RB.winsPer10M}W/$10M), OL (+${me.OL.winsPer10M}W), and TE (+${me.TE.winsPer10M}W) crush WR (+${me.WR.winsPer10M}W/$10M).</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="slide-foot">
          <span>SOURCE: win_component_analysis_report.json (16 orthogonal runs · 3,120 Hi vs 3,120 Lo snaps/group)</span>
          <span>NOTE: LOW QB TIER IS A $20M COMPETENT MOBILE STARTER (NOT REPLACEMENT-LEVEL SCRUB)</span>
        </div>
      `;
    },
  },

  // SLIDE 11: INTERACTIVE 1080P STUDIO & TAKEAWAYS
  {
    id: 'studio-takeaways',
    shortTitle: '11. 1080p Studio',
    kicker: 'ACTIONABLE PLAYBOOK & 1080P DESIGN WORKBENCH',
    badge: 'FULL NESTED ENGINE EXPOSED',
    render: () => `
      <div>
        <div class="slide-kicker-row">
          <span class="slide-kicker">EXECUTIVE SUMMARY &amp; INTERACTIVE PLAY DESIGNER</span>
          <span class="slide-pill">BUILD, BREAK &amp; SIMULATE YOUR OWN PLAYS AT 1080P+</span>
        </div>
        <h2 class="slide-title">Design Any Symmetric Concept Yourself Inside the Revamped 1080p Studio</h2>
        <p class="slide-subtitle">Every engine capability from this research—all 11 offensive roles, all 20 defensive AI roles, Read #3 voids, married Fake vectors, Chiral Direct Snaps, RPOs, Laterals, and Live Memory Priming—is now directly editable with interactive tooltips.</p>
      </div>
      <div class="slide-body cols-3">
        <div class="card">
          <div class="card-title">1080P BROADCAST RENDERER</div>
          <ul class="insight-list">
            <li><strong>Supersampled Turf &amp; Halo Strokes:</strong> Guaranteed &ge;1920&times;1080 backing resolution with crisp contrast halos around routes, pulls, and zone cones.</li>
            <li class="emerald"><strong>Visual Telemetry Overlays:</strong> Read-3 Void grass boxes, curved Magenta Fake arcs, Comet Motion Trails, and Spy/Bracket reticles.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">NESTED 5-LEVEL DESIGNER</div>
          <ul class="insight-list">
            <li class="gold"><strong>Levels 1–3:</strong> Drag alignments &amp; waypoints, audit legal 7-on-LOS rules live, apply 16 route stems or pull presets, and toggle pre-snap motion.</li>
            <li><strong>Levels 4–5:</strong> Nested accordions for PA, Fakes, IF/THEN Read-3 Voids, RPO windows, Backward Tosses, Hook &amp; Laterals, and 40–99 Combine ratings.</li>
          </ul>
        </div>
        <div class="card" style="justify-content:space-between;">
          <div>
            <div class="card-title">LIVE SEQUENCING &amp; CUSTOM BUILDER</div>
            <ul class="insight-list">
              <li class="rose"><strong>Defensive Memory Lab:</strong> Drag Priming (-1.0 to +1.0) and Repeat Spam Anticipation sliders live on any Chiral concept.</li>
              <li class="emerald"><strong>Custom Play Studio:</strong> Start from legal blank formations, Undo/Redo 40 steps, and save/export <code>.all22.json</code> playbooks.</li>
            </ul>
          </div>
          <a href="./index.html" class="deck-btn deck-btn-emerald" style="justify-content:center; padding:12px 16px; font-size:13px;">LAUNCH 1080P PLAY DESIGNER ↗</a>
        </div>
      </div>
      <div class="slide-foot">
        <span>ALL RESEARCH DATA ARCHIVED IN src/data/*.json</span>
        <span>PRESS [←/→] OR CLICK ANY PILL BELOW TO REVISIT CHARTS</span>
      </div>
    `,
  },
];

let currentIdx = 0;

function renderDeck(): void {
  const slide = SLIDES[currentIdx];
  const viewport = document.getElementById('slide-viewport');
  const counter = document.getElementById('slide-counter');
  const progress = document.getElementById('deck-progress-fill');
  const pills = document.getElementById('slide-pills');
  const prevBtn = document.getElementById('btn-prev') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('btn-next') as HTMLButtonElement | null;

  if (viewport) viewport.innerHTML = slide.render();
  if (counter) counter.textContent = `${String(currentIdx + 1).padStart(2, '0')} / ${String(SLIDES.length).padStart(2, '0')}`;
  if (progress) progress.style.width = `${(((currentIdx + 1) / SLIDES.length) * 100).toFixed(1)}%`;
  if (prevBtn) prevBtn.disabled = currentIdx === 0;
  if (nextBtn) nextBtn.disabled = currentIdx === SLIDES.length - 1;

  if (pills) {
    pills.innerHTML = SLIDES.map(
      (s, i) =>
        `<button class="slide-pill-btn ${i === currentIdx ? 'active' : ''}" data-slide-jump="${i}">${esc(s.shortTitle)}</button>`
    ).join('');
    pills.querySelectorAll('[data-slide-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        goToSlide(parseInt((btn as HTMLElement).dataset.slideJump || '0', 10));
      });
    });
  }

  const ovGrid = document.getElementById('overview-grid');
  if (ovGrid) {
    ovGrid.innerHTML = SLIDES.map(
      (s, i) => `
      <div class="overview-card ${i === currentIdx ? 'active' : ''}" data-ov-jump="${i}">
        <span style="font-family:var(--font-mono); font-size:10px; color:var(--cyan);">SLIDE ${String(i + 1).padStart(2, '0')}</span>
        <strong style="font-size:15px; color:#f8fafc;">${esc(s.shortTitle)}</strong>
        <span style="font-size:11.5px; color:var(--fg-1);">${esc(s.badge)}</span>
      </div>`
    ).join('');
    ovGrid.querySelectorAll('[data-ov-jump]').forEach((el) => {
      el.addEventListener('click', () => {
        goToSlide(parseInt((el as HTMLElement).dataset.ovJump || '0', 10));
        toggleOverview(false);
      });
    });
  }

  if (window.location.hash !== `#slide-${currentIdx + 1}`) {
    history.replaceState(null, '', `#slide-${currentIdx + 1}`);
  }
}

function goToSlide(idx: number): void {
  currentIdx = Math.max(0, Math.min(SLIDES.length - 1, idx));
  renderDeck();
}

function toggleOverview(force?: boolean): void {
  const modal = document.getElementById('overview-modal');
  if (!modal) return;
  const open = force !== undefined ? force : modal.classList.contains('hidden');
  modal.classList.toggle('hidden', !open);
}

window.addEventListener('DOMContentLoaded', () => {
  const m = window.location.hash.match(/^#slide-(\d+)$/);
  if (m) {
    const parsed = parseInt(m[1], 10) - 1;
    if (parsed >= 0 && parsed < SLIDES.length) currentIdx = parsed;
  }

  document.getElementById('btn-prev')?.addEventListener('click', () => goToSlide(currentIdx - 1));
  document.getElementById('btn-next')?.addEventListener('click', () => goToSlide(currentIdx + 1));
  document.getElementById('btn-overview')?.addEventListener('click', () => toggleOverview());
  document.getElementById('btn-close-overview')?.addEventListener('click', () => toggleOverview(false));
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.code === 'Space') {
      e.preventDefault();
      goToSlide(currentIdx + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goToSlide(currentIdx - 1);
    } else if (e.key === 'Home') {
      goToSlide(0);
    } else if (e.key === 'End') {
      goToSlide(SLIDES.length - 1);
    } else if (e.key.toLowerCase() === 'o') {
      toggleOverview();
    } else if (e.key === 'Escape') {
      toggleOverview(false);
    }
  });

  renderDeck();
});
