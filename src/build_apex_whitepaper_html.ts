import * as fs from 'fs';
import * as path from 'path';
import { APEX_2027_PLAYBOOK } from './apex_2027_playbook';

interface GifMeta {
  playId: string;
  playNumber: number;
  slug: string;
  filmDefense: string;
  filmDefenseLabel: string;
  filmOutcome: string;
  situationTag: string;
}

const GIF_META: GifMeta[] = [
  {
    playId: 'APEX_ORBIT_GLANCE_FLOOD',
    playNumber: 1,
    slug: 'apex_play1_orbit_glance_flood.gif',
    filmDefense: 'NICKEL_OVER_C3',
    filmDefenseLabel: '4-2-5 Nickel Over (Cover 3 Sky)',
    filmOutcome: 'COMPLETE +13.5y',
    situationTag: '1st & 10 // Orbit Glance Triangle',
  },
  {
    playId: 'APEX_DUO_WING_PIN_PULL',
    playNumber: 2,
    slug: 'apex_play2_duo_wing_pin_pull.gif',
    filmDefense: 'BASE_34_BEAR_C4',
    filmDefenseLabel: '3-4 Bear Tite (Quarters Match)',
    filmOutcome: 'TACKLED +6.6y',
    situationTag: 'Early-Down / 4-Min // Edge Run',
  },
  {
    playId: 'APEX_SHORT_MESH_PA_BOOT',
    playNumber: 3,
    slug: 'apex_play3_short_mesh_pa_boot.gif',
    filmDefense: 'NICKEL_OVER_C3',
    filmDefenseLabel: '4-2-5 Nickel Over (Cover 3 Sky)',
    filmOutcome: 'COMPLETE +16.1y',
    situationTag: '1st & 10 // 0.68s Short-Mesh PA Boot',
  },
  {
    playId: 'APEX_SWITCH_MESH_STICKS',
    playNumber: 4,
    slug: 'apex_play4_switch_mesh_sticks.gif',
    filmDefense: 'VIKINGS_MUG_CROSSDOG_C0',
    filmDefenseLabel: '3-2-6 Mug Cross-Dog (Cover 0)',
    filmOutcome: 'COMPLETE +16.1y',
    situationTag: '3rd & 9 // Sticks & Dual Hot Relief',
  },
  {
    playId: 'APEX_TWOMIN_BOUNDARY_OOB',
    playNumber: 5,
    slug: 'apex_play5_twomin_boundary_oob.gif',
    filmDefense: 'DIME_QUARTERS_MATCH',
    filmDefenseLabel: '2-3-6 Dime (Quarters Match)',
    filmOutcome: 'OUT_OF_BOUNDS +16.2y',
    situationTag: '2-Minute Drill // Sideline Stop-Clock',
  },
  {
    playId: 'APEX_DISPLACED_WING_OPTION',
    playNumber: 6,
    slug: 'apex_play6_displaced_wing_option.gif',
    filmDefense: 'NICKEL_SIM_C2',
    filmDefenseLabel: 'Nickel Sim Pressure (Cover 2)',
    filmOutcome: 'COMPLETE +19.5y',
    situationTag: '21-Pers // Backward-Toss Option Pass',
  },
  {
    playId: 'APEX_EAGLES_RHINO_COUNTER',
    playNumber: 7,
    slug: 'apex_play7_eagles_rhino_counter.gif',
    filmDefense: 'BASE_43_OVER_C1',
    filmDefenseLabel: '4-3 Over (8-Man C1 Robber)',
    filmOutcome: 'TACKLED +9.3y',
    situationTag: '4-Minute / Heavy Box // 11v11 QB Counter',
  },
  {
    playId: 'APEX_GOALLINE_SPRINT_SMASH',
    playNumber: 8,
    slug: 'apex_play8_goalline_sprint_smash.gif',
    filmDefense: 'GOAL_LINE_62_PINCH',
    filmDefenseLabel: '6-2 Goal-Line Pinch (Cover 0)',
    filmOutcome: 'TOUCHDOWN +4.0y',
    situationTag: '1st & Goal (+4.0y) // Sprint-Boot Pop',
  },
];

interface DefenseGuide {
  id: string;
  label: string;
  bucket: string;
  alignmentTell: string;
  hardAvoidNote: string;
  postSnapKey: string;
}

const DEFENSE_GUIDES: DefenseGuide[] = [
  {
    id: 'NICKEL_OVER_C3',
    label: '4-2-5 Nickel Over (Cover 3 Sky)',
    bucket: '1-High Zone Shell',
    alignmentTell: '1-High FS at 12.5y; CBs soft at 6.0y; SS curl-flat at 5.0y; NCB apex 3.2y.',
    hardAvoidNote: 'Avoid EAGLES_RHINO_COUNTER (-0.216) and DUO_WING_PIN_PULL (-0.155) into fast C3 flat support.',
    postSnapKey: '0.46s RB flash pulls WILL/MIKE downhill (-1.7y); hit WR1 11.4y Cross or TE1 5.0y chip-flat on PA Boot (+0.403).',
  },
  {
    id: 'NICKEL_UNDER_C1',
    label: '4-2-5 Nickel Under (Cover 1 Man)',
    bucket: '1-High Tight Man',
    alignmentTell: '1-High FS at 14y; CBs pressed 2.5y; NCB locked tight on SL; SS manned onto TE.',
    hardAvoidNote: 'Avoid SHORT_MESH_PA_BOOT (-0.537) and SWITCH_MESH_STICKS (-0.197).',
    postSnapKey: 'Orbit motion right clears man trail; SL hits TE1 seam-corner > 3.10y sep on Wing Option (+0.580) or CAN Rhino (+0.463).',
  },
  {
    id: 'NICKEL_SIM_C2',
    label: 'Nickel Sim Pressure (Cover 2)',
    bucket: 'Split 2-High Tight',
    alignmentTell: 'Split FS/SS at 12.5y; CBs 4.5y; LDE drops curl/hook while NCB (2.5y) brings simulated edge pressure.',
    hardAvoidNote: 'No negative plays in portfolio (+0.121 to +0.767 positive across all 8 concepts!).',
    postSnapKey: 'Simulated edge blitzer vacates C-gap for Rhino (+0.767), or hit WR1/WR2 Flood seams behind curled corners on PA Boot (+0.754).',
  },
  {
    id: 'BASE_34_BEAR_C4',
    label: '3-4 Bear Tite (Quarters Match)',
    bucket: '5-Down Bear Front',
    alignmentTell: '0T Nose + dual 4i DEs + LOLB/ROLB covering all 5 OL; FS/SS split at 10.5y.',
    hardAvoidNote: 'Avoid all 5-man dropback passes (-0.202 to -0.407) vs. 5-on-5 covered trenches.',
    postSnapKey: 'CAN to Rhino Left (+0.271) or Pin-Pull Edge (+0.036): TE1 seals ROLB/4i while LG + TE2 out-flank the Bear box.',
  },
  {
    id: 'BASE_43_OVER_C1',
    label: '4-3 Over (Cover 1 Robber)',
    bucket: '1-High 8-Man Box',
    alignmentTell: 'SAM forced near LOS (1.5y); SS Robber crept to 4.8y; CBs pressed 2.0y; 1-High FS 14y.',
    hardAvoidNote: 'Hard avoid SHORT_MESH_PA_BOOT (-1.038) and DUO_WING_PIN_PULL (-0.519).',
    postSnapKey: 'Attack Robber eye discipline with 11v11 Rhino Left (+0.494) or Displaced Wing Option (+0.434) / Orbit Glance (+0.386).',
  },
  {
    id: 'DIME_MUG_C0',
    label: 'Dime Mug (Cover 0)',
    bucket: 'Double A-Gap Mug',
    alignmentTell: '3-DL front with WILL & MIKE mugged tight in both A-gaps (1.1y); FS manned on RB (3.2y).',
    hardAvoidNote: 'Avoid static early-down dropbacks (-0.467 to -0.728) and slow-developing Pin-Pull (-0.715).',
    postSnapKey: 'CAN immediately to Eagles Rhino Counter (+0.835): RB dive fake pins both muggers straight inside while QB1 sweeps left edge.',
  },
  {
    id: 'DIME_QUARTERS_MATCH',
    label: '2-3-6 Dime (Quarters Match)',
    bucket: 'Split 2-High Soft 6-DB',
    alignmentTell: '4-DL, 1 MLB, 6 DBs with soft 6.8y corners, 3.5y apex overhangs, split safeties 11.0y.',
    hardAvoidNote: 'Avoid EAGLES_RHINO_COUNTER (-0.259) and WING_OPTION (-0.152) vs. wide Dime force overhangs.',
    postSnapKey: 'Attack soft intermediate zones via Orbit Glance (+0.418), Boundary Out (+0.262), or 3rd&9 Sticks Fin (+0.175).',
  },
  {
    id: 'VIKINGS_MUG_CROSSDOG_C0',
    label: '3-2-6 Mug Cross-Dog (Cover 0)',
    bucket: 'Double A-Gap Mug',
    alignmentTell: 'WILL & MIKE mugged at 1.1y cross-dog + SS edge blitz threat (2.2y); 0 deep safeties.',
    hardAvoidNote: 'Avoid ORBIT_GLANCE_FLOOD (-0.856) and TWOMIN_BOUNDARY_OOB (-0.823).',
    postSnapKey: 'CAN Rhino Counter (+0.847) or Pin-Pull (+0.544) past committed cross-doggers; on 3rd & 9 check Switch-Mesh (+0.152).',
  },
  {
    id: 'VIKINGS_SAFETY_BLITZ_C1',
    label: 'Nickel Safety Blitz (Cover 1 Robber)',
    bucket: '1-High Edge Safety Blitz',
    alignmentTell: 'Strong safety SS crept tight on edge (1.2y BLITZ_EDGE_CRASH); MIKE drops Robber (4.2y).',
    hardAvoidNote: 'Hard avoid SWITCH_MESH_STICKS (-1.015) and SHORT_MESH_PA_BOOT (-0.745).',
    postSnapKey: 'Pin-Pull (+0.409), Wing Option away from crash (+0.368), or GL Sprint Smash (+0.371) punishes edge safety vacate.',
  },
  {
    id: 'GOAL_LINE_62_PINCH',
    label: '6-2 Goal-Line Pinch (Cover 0)',
    bucket: 'Goal-Line +4y Box',
    alignmentTell: '6 down linemen across LOS + 2 ILBs at 3.2y + FS Robber at 6.5y.',
    hardAvoidNote: 'Avoid open-field spread drops (2-Min OOB -1.917, Orbit Glance -1.572).',
    postSnapKey: 'Marry perimeter Pin-Pull (+0.496) & Rhino (+0.403) with 0.36s Sprint-Boot Option Pop to 6\'5" TE1 pylon (+0.351).',
  },
];

function esc(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtSigned(v: number, digits = 3): string {
  const s = v.toFixed(digits);
  return v >= 0 ? `+${s}` : s;
}

function epaCellStyle(v: number): string {
  if (v >= 0.45) return 'background: rgba(16, 185, 129, 0.28); color: #6ee7b7; font-weight: 700;';
  if (v >= 0.15) return 'background: rgba(16, 185, 129, 0.14); color: #a7f3d0; font-weight: 600;';
  if (v >= 0.0) return 'background: rgba(56, 189, 248, 0.12); color: #bae6fd;';
  if (v >= -0.30) return 'background: rgba(251, 191, 36, 0.10); color: #fde68a;';
  return 'background: rgba(244, 63, 94, 0.22); color: #fda4af; font-weight: 600;';
}

function renderHtml(results: any, embedBase64: boolean, gifsDir: string): string {
  const pbById = new Map(APEX_2027_PLAYBOOK.map((p) => [p.id, p]));
  const teleById = new Map<string, any>(results.apexPlayTelemetry.map((p: any) => [p.id, p]));
  const shortDefNames: Record<string, string> = {
    NICKEL_OVER_C3: 'Nkl Over C3',
    NICKEL_UNDER_C1: 'Nkl Under C1',
    NICKEL_SIM_C2: 'Nkl Sim C2',
    BASE_34_BEAR_C4: '3-4 Bear C4',
    BASE_43_OVER_C1: '4-3 Over C1',
    DIME_MUG_C0: 'Dime Mug C0',
    DIME_QUARTERS_MATCH: 'Dime Qtrs',
    VIKINGS_MUG_CROSSDOG_C0: 'Cross-Dog C0',
    VIKINGS_SAFETY_BLITZ_C1: 'S-Blitz C1',
    GOAL_LINE_62_PINCH: 'GL 6-2 Pinch',
  };

  const gifSrcMap: Record<string, string> = {};
  for (const gm of GIF_META) {
    if (embedBase64) {
      const buf = fs.readFileSync(path.join(gifsDir, gm.slug));
      gifSrcMap[gm.playId] = `data:image/gif;base64,${buf.toString('base64')}`;
    } else {
      gifSrcMap[gm.playId] = `./apex_gifs/${gm.slug}`;
    }
  }

  // Compute exact observable & oracle decision tree weighted EPAs on the 9 open-field fronts
  const stdOpenW: Record<string, number> = {
    NICKEL_OVER_C3: 0.20,
    NICKEL_UNDER_C1: 0.12,
    NICKEL_SIM_C2: 0.14,
    BASE_34_BEAR_C4: 0.12,
    BASE_43_OVER_C1: 0.10,
    DIME_MUG_C0: 0.08,
    DIME_QUARTERS_MATCH: 0.11,
    VIKINGS_MUG_CROSSDOG_C0: 0.07,
    VIKINGS_SAFETY_BLITZ_C1: 0.06,
  };
  const observableMap: Record<string, string> = {
    DIME_MUG_C0: 'APEX_EAGLES_RHINO_COUNTER',
    VIKINGS_MUG_CROSSDOG_C0: 'APEX_EAGLES_RHINO_COUNTER',
    BASE_34_BEAR_C4: 'APEX_EAGLES_RHINO_COUNTER',
    BASE_43_OVER_C1: 'APEX_DISPLACED_WING_OPTION',
    VIKINGS_SAFETY_BLITZ_C1: 'APEX_DISPLACED_WING_OPTION',
    NICKEL_UNDER_C1: 'APEX_DISPLACED_WING_OPTION',
    NICKEL_SIM_C2: 'APEX_ORBIT_GLANCE_FLOOD',
    DIME_QUARTERS_MATCH: 'APEX_ORBIT_GLANCE_FLOOD',
    NICKEL_OVER_C3: 'APEX_SHORT_MESH_PA_BOOT',
  };
  const openFrontIds = Object.keys(stdOpenW);
  const nashMix = results.nashEquilibrium.apexMix as Record<string, number>;
  let blindUniform = 0;
  let blindNashStd = 0;
  let obsTreeEpa = 0;
  let oracleEpa = 0;

  for (const df of openFrontIds) {
    const w = stdOpenW[df];
    const allVals = results.apexPlayTelemetry.map((p: any) => p.epaByDefense[df] as number);
    blindUniform += w * (allVals.reduce((a: number, b: number) => a + b, 0) / allVals.length);
    let nashRow = 0;
    for (const p of results.apexPlayTelemetry) {
      nashRow += (p.epaByDefense[df] as number) * ((nashMix[p.id] || 0) / 100);
    }
    blindNashStd += w * nashRow;
    obsTreeEpa += w * (teleById.get(observableMap[df]).epaByDefense[df] as number);
    oracleEpa += w * Math.max(...allVals);
  }
  const obs30DisguiseEpa = 0.7 * obsTreeEpa + 0.3 * blindNashStd;

  // Build interactive JSON data for Defense Explorer
  const explorerData = DEFENSE_GUIDES.map((dg) => {
    const ranked = results.apexPlayTelemetry
      .map((p: any) => ({
        id: p.id,
        short: p.id.replace('APEX_', ''),
        name: p.name,
        epa: p.epaByDefense[dg.id] as number,
      }))
      .sort((a: any, b: any) => b.epa - a.epa);
    return { ...dg, ranked };
  });

  const audit = results.legalityAndBiomechanicsAudit;
  const sd = results.situationalDrills;

  const rosterRows = results.rosterPlayers
    .map((p: any) => {
      const r = p.ratings;
      const statsStr =
        p.slotKey === 'QB'
          ? `SPD ${r.speed} / ACC ${r.accel} / PWR ${r.power} / THA ${p.throwerRating} / AWR ${r.awareness}`
          : ['LT', 'LG', 'C', 'RG', 'RT'].includes(p.slotKey)
          ? `BLK ${p.blockRating} / PWR ${r.power} / FIN ${r.finesse} / AWR ${r.awareness} / SPD ${r.speed}`
          : p.slotKey === 'SL'
          ? `SPD ${r.speed} / ACC ${r.accel} / AWR ${r.awareness} / BLK ${p.blockRating} / ARM ${p.throwerRating}`
          : `SPD ${r.speed} / ACC ${r.accel} / FIN ${r.finesse} / AWR ${r.awareness} / BLK ${p.blockRating}`;
      return `<tr>
        <td><span class="tag-pos">${esc(p.slotKey)}</span></td>
        <td><strong>${esc(p.name)}</strong> <span class="muted">#${esc(p.jersey)}</span></td>
        <td class="num"><strong>$${Number(p.capHitM).toFixed(1)}M</strong></td>
        <td class="mono small">${esc(statsStr)}</td>
        <td class="small">${esc(p.scoutingNotes)}<div class="thesis-note">${esc(p.howieValueThesis)}</div></td>
      </tr>`;
    })
    .join('\n');

  const playCardsHtml = GIF_META.map((gm) => {
    const t = teleById.get(gm.playId);
    const pb = pbById.get(gm.playId)!;
    const rankedDefs = Object.entries(t.epaByDefense as Record<string, number>).sort((a, b) => b[1] - a[1]);
    const best3 = rankedDefs
      .slice(0, 3)
      .map(([d, v]) => `<span class="chip chip-good">${esc(shortDefNames[d] || d)} ${fmtSigned(v)}</span>`)
      .join(' ');
    const worst2 = rankedDefs
      .slice(-2)
      .reverse()
      .map(([d, v]) => `<span class="chip chip-bad">${esc(shortDefNames[d] || d)} ${fmtSigned(v)}</span>`)
      .join(' ');

    return `<article class="play-card" id="play-${gm.playNumber}">
      <div class="play-card-head">
        <div>
          <span class="badge-num">PLAY ${gm.playNumber} // ${esc(t.personnel)}</span>
          <span class="badge-cat">${esc(gm.situationTag)}</span>
          <h3>${esc(t.name)}</h3>
        </div>
        <div class="clip-pill">Film Clip (${esc(gm.filmDefenseLabel)}): <strong>${esc(gm.filmOutcome)}</strong></div>
      </div>

      <div class="gif-frame">
        <img src="${gifSrcMap[gm.playId]}" alt="Play ${gm.playNumber}: ${esc(t.name)} All-22 Animation" />
      </div>

      <div class="metric-strip">
        <div class="metric-box"><span class="m-lbl">Mean Yards</span><span class="m-val">${fmtSigned(t.overallMeanYards, 2)}y</span></div>
        <div class="metric-box"><span class="m-lbl">Mean EPA/P</span><span class="m-val">${fmtSigned(t.overallMeanEpa, 3)}</span></div>
        <div class="metric-box"><span class="m-lbl">Success%</span><span class="m-val">${t.successRatePct}%</span></div>
        <div class="metric-box"><span class="m-lbl">Explosive%</span><span class="m-val">${t.explosiveRatePct}%</span></div>
        <div class="metric-box"><span class="m-lbl">Sack%</span><span class="m-val">${t.sackRatePct}%</span></div>
        <div class="metric-box"><span class="m-lbl">Turnover%</span><span class="m-val">${t.turnoverRatePct}%</span></div>
      </div>

      <div class="play-body">
        <p><strong>First-Principles Mechanism:</strong> ${esc(pb.firstPrinciplesThesis)}</p>
        <p><strong>Roster Flaw Insulated:</strong> ${esc(pb.protectsFlawNote)}</p>
        <div class="matchup-row">
          <div><span class="m-sub">Top Counters:</span> ${best3}</div>
          <div><span class="m-sub">Watch / Check Away:</span> ${worst2}</div>
        </div>
      </div>
    </article>`;
  }).join('\n');

  const matrixHeaders = DEFENSE_GUIDES.map((d) => `<th>${esc(shortDefNames[d.id])}</th>`).join('');
  const matrixRows = results.apexPlayTelemetry
    .map((p: any) => {
      const cells = DEFENSE_GUIDES.map((d) => {
        const val = p.epaByDefense[d.id] as number;
        return `<td class="num mono" style="${epaCellStyle(val)}">${fmtSigned(val, 2)}</td>`;
      }).join('');
      return `<tr><td class="mono small"><strong>${esc(p.id.replace('APEX_', ''))}</strong></td>${cells}</tr>`;
    })
    .join('\n');

  const nashRows = [
    { name: '2027 Philadelphia APEX ($122.9M Non-All-Star)', cap: '$122.9M', epa: results.nashEquilibrium.apexNashEpa, note: 'Our candidate architecture; 1 option-pass + balanced 11/12/21 staples' },
    { name: '2027 Google Argon Continuum ($81.1M Moneyball)', cap: '$81.1M', epa: results.nashEquilibrium.argonNashEpa, note: 'Extreme backward-toss Moneyball lab benchmark (0% sacks)' },
    { name: '2027 Hydra Vanguard ($85.5M Moneyball)', cap: '$85.5M', epa: results.nashEquilibrium.hydraNashEpa, note: 'Ultra-low-cap option/specialty benchmark' },
    { name: 'Conventional 11-Pers Dropback Spread', cap: '$138.5M', epa: results.nashEquilibrium.baselinesNashEpa.CONV_11_SPREAD, note: 'Standard NFL spread attack' },
    { name: 'Shanahan / McVay 12-Pers Play-Action', cap: '$146.0M', epa: results.nashEquilibrium.baselinesNashEpa.SHANAHAN_12_PA, note: 'Premium-cap vet pocket & PA machine' },
    { name: 'Top-Heavy Supermax Stars / Thin OL', cap: '$172.0M', epa: results.nashEquilibrium.baselinesNashEpa.SUPERMAX_STARS, note: 'Max-contract QB/WR/RB stars behind thin interior OL' },
  ]
    .map((r, idx) => {
      const cls = idx === 0 ? ' class="row-apex"' : '';
      return `<tr${cls}><td><strong>${esc(r.name)}</strong></td><td class="num mono">${esc(r.cap)}</td><td class="num mono"><strong>${fmtSigned(r.epa, 3)}</strong></td><td class="small muted">${esc(r.note)}</td></tr>`;
    })
    .join('\n');

  const fullGameRows = results.fullGameBenchmarks
    .map((b: any, idx: number) => {
      const cls = idx === 0 ? ' class="row-apex"' : '';
      return `<tr${cls}>
        <td><strong>${esc(b.philosophyName)}</strong></td>
        <td class="num mono">$${Number(b.offCapM).toFixed(1)}M</td>
        <td class="num mono"><strong>${b.ppgStandardDc.toFixed(2)}</strong></td>
        <td class="num mono">${b.ppgAdversarialNashDc.toFixed(2)}</td>
        <td class="num mono">${b.ppdStandard.toFixed(2)}</td>
        <td class="num mono">${b.tdDrivePct.toFixed(1)}%</td>
        <td class="num mono">${b.turnoverDrivePct.toFixed(1)}%</td>
        <td class="num mono">${b.explosiveRatePct.toFixed(1)}%</td>
        <td class="num mono">${b.ppgPer10MCap.toFixed(2)}</td>
        <td class="num mono"><strong>+${b.projectedTeamNetDiffPerGame.toFixed(2)}</strong></td>
      </tr>`;
    })
    .join('\n');

  const decisionMatrixRows = explorerData
    .map((d) => {
      const p1 = d.ranked[0];
      const p2 = d.ranked[1];
      const avoid = d.ranked[d.ranked.length - 1];
      return `<tr>
        <td><strong>${esc(d.label)}</strong><div class="muted small">${esc(d.bucket)}</div></td>
        <td class="small">${esc(d.alignmentTell)}</td>
        <td class="mono small" style="color:#6ee7b7"><strong>${esc(p1.short)}</strong> (${fmtSigned(p1.epa, 3)})</td>
        <td class="mono small" style="color:#bae6fd">${esc(p2.short)} (${fmtSigned(p2.epa, 3)})</td>
        <td class="mono small" style="color:#fda4af">${esc(avoid.short)} (${fmtSigned(avoid.epa, 3)})</td>
        <td class="small">${esc(d.postSnapKey)}</td>
      </tr>`;
    })
    .join('\n');

  const explorerJson = JSON.stringify(explorerData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>2027 Philadelphia APEX Continuum — Eagles Head Coach Pitch &amp; Tactical Whitepaper</title>
<style>
  :root {
    --bg: #070d10;
    --bg-card: #0d181d;
    --bg-elev: #122128;
    --border: #1d353e;
    --teal: #004c54;
    --mint: #5eead4;
    --emerald: #34d399;
    --gold: #fbbf24;
    --rose: #fb7185;
    --sky: #38bdf8;
    --silver: #a5acaf;
    --text: #e6eef2;
    --muted: #93a7b2;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: radial-gradient(circle at top center, #0c2126 0%, var(--bg) 52%);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
    line-height: 1.65;
  }
  .mono { font-family: "Cascadia Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; }
  .small { font-size: 0.87rem; }
  .muted { color: var(--muted); }
  .num { text-align: right; white-space: nowrap; }
  .top-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(7, 13, 16, 0.92);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
  }
  .top-nav-inner {
    max-width: 1180px;
    margin: 0 auto;
    padding: 12px 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: center;
    justify-content: space-between;
  }
  .brand { font-weight: 800; letter-spacing: 0.04em; color: var(--mint); font-size: 0.95rem; }
  .nav-links { display: flex; flex-wrap: wrap; gap: 14px; font-size: 0.85rem; }
  .nav-links a { color: var(--silver); text-decoration: none; font-weight: 600; }
  .nav-links a:hover { color: var(--mint); }
  .container { max-width: 1180px; margin: 0 auto; padding: 34px 24px 80px; }
  .hero {
    background: linear-gradient(135deg, rgba(0, 76, 84, 0.42), rgba(13, 24, 29, 0.95));
    border: 1px solid #1e4b52;
    border-radius: 16px;
    padding: 36px 34px;
    margin-bottom: 32px;
  }
  .hero-kicker {
    display: inline-block;
    background: rgba(94, 234, 212, 0.14);
    border: 1px solid rgba(94, 234, 212, 0.35);
    color: var(--mint);
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    margin-bottom: 12px;
  }
  h1 { margin: 0 0 12px; font-size: clamp(1.9rem, 3.2vw, 2.75rem); line-height: 1.18; color: #ffffff; }
  h2 {
    margin: 44px 0 14px;
    font-size: 1.55rem;
    color: #ffffff;
    border-bottom: 2px solid var(--teal);
    padding-bottom: 8px;
  }
  h3 { margin: 14px 0 10px; font-size: 1.15rem; color: #f1f5f9; }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    margin-top: 22px;
  }
  .kpi {
    background: rgba(7, 13, 16, 0.72);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 15px 17px;
  }
  .kpi-label { font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); font-weight: 700; }
  .kpi-value { font-size: 1.55rem; font-weight: 800; color: var(--mint); margin: 4px 0; }
  .kpi-sub { font-size: 0.82rem; color: var(--silver); }
  .callout {
    background: var(--bg-card);
    border-left: 4px solid var(--mint);
    border-top: 1px solid var(--border);
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 20px;
    margin: 18px 0;
  }
  .callout-gold { border-left-color: var(--gold); }
  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg-card);
    margin: 16px 0 26px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.91rem; }
  th {
    background: #0a151a;
    color: var(--silver);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: left;
    padding: 11px 12px;
    border-bottom: 1px solid var(--border);
  }
  td { padding: 10px 12px; border-bottom: 1px solid rgba(29, 53, 62, 0.55); vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .row-apex { background: rgba(0, 76, 84, 0.28); }
  .tag-pos {
    display: inline-block;
    min-width: 38px;
    text-align: center;
    padding: 2px 7px;
    border-radius: 6px;
    background: rgba(56, 189, 248, 0.16);
    border: 1px solid rgba(56, 189, 248, 0.35);
    color: var(--sky);
    font-weight: 700;
    font-size: 0.78rem;
  }
  .thesis-note { margin-top: 4px; color: var(--mint); font-size: 0.82rem; }
  .play-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 22px;
    margin: 24px 0;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  }
  .play-card-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 14px;
  }
  .play-card-head h3 { margin: 8px 0 0; font-size: 1.24rem; color: #ffffff; }
  .badge-num {
    display: inline-block;
    background: rgba(0, 76, 84, 0.55);
    border: 1px solid var(--mint);
    color: var(--mint);
    font-size: 0.76rem;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 6px;
    margin-right: 6px;
  }
  .badge-cat {
    display: inline-block;
    background: rgba(148, 163, 184, 0.12);
    border: 1px solid var(--border);
    color: var(--silver);
    font-size: 0.76rem;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 6px;
  }
  .clip-pill {
    background: rgba(52, 211, 153, 0.12);
    border: 1px solid rgba(52, 211, 153, 0.35);
    color: var(--emerald);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.82rem;
    font-family: "Cascadia Code", monospace;
  }
  .gif-frame {
    border: 1px solid #24424d;
    border-radius: 10px;
    overflow: hidden;
    background: #05090d;
  }
  .gif-frame img { display: block; width: 100%; height: auto; }
  .metric-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(125px, 1fr));
    gap: 10px;
    margin: 14px 0;
  }
  .metric-box {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 11px;
    display: flex;
    flex-direction: column;
  }
  .m-lbl { font-size: 0.72rem; text-transform: uppercase; color: var(--muted); font-weight: 700; }
  .m-val { font-size: 1.05rem; font-weight: 800; color: #ffffff; font-family: "Cascadia Code", monospace; }
  .matchup-row { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
  .m-sub { font-size: 0.82rem; font-weight: 700; color: var(--silver); margin-right: 6px; }
  .chip {
    display: inline-block;
    font-size: 0.77rem;
    font-family: "Cascadia Code", monospace;
    padding: 3px 8px;
    border-radius: 6px;
    margin: 2px 3px 2px 0;
  }
  .chip-good { background: rgba(16, 185, 129, 0.16); border: 1px solid rgba(16, 185, 129, 0.35); color: #6ee7b7; }
  .chip-bad { background: rgba(244, 63, 94, 0.16); border: 1px solid rgba(244, 63, 94, 0.35); color: #fda4af; }
  .regime-bars {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px 20px;
    margin: 18px 0;
  }
  .bar-row { display: grid; grid-template-columns: 290px 1fr 85px; gap: 12px; align-items: center; margin: 10px 0; font-size: 0.88rem; }
  .bar-track { height: 14px; background: #071014; border-radius: 999px; overflow: hidden; border: 1px solid var(--border); position: relative; }
  .bar-fill { height: 100%; border-radius: 999px; }
  .def-btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
  .def-btn {
    background: var(--bg-elev);
    color: var(--silver);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 12px;
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 700;
  }
  .def-btn:hover { border-color: var(--mint); color: #ffffff; }
  .def-btn.active { background: var(--teal); border-color: var(--mint); color: #ffffff; }
  .explorer-panel {
    background: var(--bg-card);
    border: 1px solid #244c54;
    border-radius: 12px;
    padding: 18px 20px;
    margin-bottom: 20px;
  }
  .drill-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; }
  .svg-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; overflow-x: auto; margin: 16px 0; }
  @media (max-width: 720px) {
    .bar-row { grid-template-columns: 1fr; gap: 4px; }
  }
</style>
</head>
<body>

<nav class="top-nav">
  <div class="top-nav-inner">
    <div class="brand">PHILLY APEX 2027 // HC INTERVIEW DOSSIER</div>
    <div class="nav-links">
      <a href="#roster">Roster &amp; Cap</a>
      <a href="#playbook">8-Play GIF Film</a>
      <a href="#nash">Nash &amp; 6-Way Benchmark</a>
      <a href="#decision-tree">10-Defense Decision Tree</a>
      <a href="#situational">4 Stress Drills</a>
      <a href="#roadmap">GM Roadmap</a>
    </div>
  </div>
</nav>

<main class="container">
  <header class="hero">
    <span class="hero-kicker">HEAD COACH INTERVIEW WHITEPAPER // FOR JEFFREY LURIE &amp; HOWIE ROSEMAN</span>
    <h1>The 2027 Philadelphia APEX Continuum</h1>
    <p class="muted" style="font-size:1.05rem; margin: 0;">
      A first-principles, cap-arbitrage offense engineered on calibrated 20 Hz Newtonian All-22 physics (<code>SYMMETRIC</code> capped-YAC <code>NO_FC</code>, reactive pre-snap defense psychology, strict 4-rule NFL legality) — beating league baselines without an All-Star payroll.
    </p>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Active Offensive Cap</div>
        <div class="kpi-value">$120.2M–$122.9M</div>
        <div class="kpi-sub">Only 2 $20M+ cornerstones; saves $23.1M vs. Shanahan 12 &amp; $49.1M vs. Supermax</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">NFL Legality &amp; 20 Hz Audit</div>
        <div class="kpi-value">100.00% Legal</div>
        <div class="kpi-sub">${audit.snapsAudited.toLocaleString()} snaps | 0 G-force &gt;1.60G (peak ${audit.peakUnengagedGForce}G) | 0 overlap &lt;0.20y</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">1,000-Game Standard Scoring</div>
        <div class="kpi-value">43.52 PPG</div>
        <div class="kpi-sub">+22.62 Team Net +/- | 29.8% Explosive | 3.54 PPG/$10M Cap</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Decision Tree / Minimax Lift</div>
        <div class="kpi-value">${fmtSigned(obsTreeEpa, 3)} EPA/p</div>
        <div class="kpi-sub">Pre-snap check efficiency vs. ${fmtSigned(blindNashStd, 3)} blind std &amp; ${fmtSigned(results.nashEquilibrium.apexNashEpa, 3)} worst-case Nash</div>
      </div>
    </div>
  </header>

  <section id="roster">
    <h2>I. Howie Roseman Cap Architecture &amp; Honest Starter Accounting</h2>
    <p>
      Instead of buying an imaginary Pro Bowl roster, <strong>APEX</strong> uses only <strong>two <code>$20M+</code> anchors</strong> (<code>LT $24.0M</code> and <code>WR1 $22.5M</code>), pairing them with rookie-scale Day-2/Day-3 starters and deliberate market inefficiencies (<code>$14.5M</code> dual-threat <code>QB1</code>, <code>$7.5M</code> ex-college-QB <code>SL</code>, <code>$4.8M</code> Heavy Wing <code>TE2</code>). Every starter flaw is intentionally sheltered by play geometry:
    </p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Slot</th><th>Archetype</th><th class="num">Cap Hit</th><th>Calibrated Ratings</th><th>Honest Flaw &amp; Scheme Insulation</th></tr>
        </thead>
        <tbody>
          ${rosterRows}
        </tbody>
      </table>
    </div>
    <div class="callout">
      <strong>Personnel Caps:</strong> <code>11 APEX</code> (WR1/WR2/SL/TE1/RB1) = <strong>$122.9M</strong> &bull;
      <code>12 APEX</code> (TE2 for SL) = <strong>$120.2M</strong> &bull;
      <code>21 APEX</code> (TE2 for WR2) = <strong>$122.5M</strong> &bull;
      Projected defensive cap-reinvestment suppression = <strong>+1.5 PPG</strong>.
    </div>
  </section>

  <section id="playbook">
    <h2>II. The 8-Play Core Playbook &amp; All-22 Film Study (0.5x Half-Speed GIFs)</h2>
    <p>
      Every play below shows <code>N = 50</code> 20 Hz Monte Carlo trials per defense across all 10 modern 2027 fronts, paired with an inline looping half-speed (<code>10 fps = 0.5x</code>) All-22 simulation clip from our featured schematic matchup.
    </p>
    ${playCardsHtml}
  </section>

  <section id="nash">
    <h2>III. 6-Way Zero-Sum Nash Minimax &amp; 1,000-Game Season Benchmark</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Offensive Philosophy</th><th class="num">Active Cap</th><th class="num">Nash Minimax EPA/P</th><th>Benchmark Context</th></tr>
        </thead>
        <tbody>
          ${nashRows}
        </tbody>
      </table>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Philosophy (N=1,000 NFL Games Each)</th>
            <th class="num">Cap</th>
            <th class="num">PPG (Std)</th>
            <th class="num">PPG (Nash)</th>
            <th class="num">PPD</th>
            <th class="num">TD%</th>
            <th class="num">TO%</th>
            <th class="num">Expl%</th>
            <th class="num">PPG/$10M</th>
            <th class="num">Team Net +/-</th>
          </tr>
        </thead>
        <tbody>
          ${fullGameRows}
        </tbody>
      </table>
    </div>

    <div class="callout callout-gold">
      <h3 style="margin-top:0; color:#fbbf24;">Is <code>${fmtSigned(results.nashEquilibrium.apexNashEpa, 3)}</code> Nash Minimax EPA/Play Actually Strong? (First-Principles Math)</h3>
      <p style="margin-bottom:8px;">
        <strong>Yes — under calibrated engine physics without automated QB audibles, <code>-0.027</code> Minimax EPA/play is highly competitive on a <code>$122.9M</code> non-All-Star cap:</strong>
      </p>
      <ul style="margin:0; padding-left:20px;">
        <li><strong>What Minimax Measures:</strong> The solver assumes an omniscient Adversarial DC who knows your exact play-call percentages and forces his single worst-case shell mix (<code>36.4% Nickel Over C3</code> + <code>31.1% 3-4 Bear C4</code> + <code>20.3% Dime Quarters</code> + <code>12.2% Blitz</code>, dropping light Cover-2/Over-C1 to <code>0%</code>) while the offense executes <em>blindly</em> with zero pre-snap checks.</li>
        <li><strong>Harsh Single-Snap EPA Calibration:</strong> In <code>engine.ts</code>, an incompletion scores <code>-0.52</code>, a sack scores roughly <code>-2.4</code>, and an INT scores <code>-3.55 to -4.35</code> — whereas a 5-yard run scores only <code>+0.095</code> and a 10-yard completion scores <code>+0.32</code>. Clearing <code>-0.05</code> against minimax coverage while carrying realistic <code>7.6%–11.8%</code> dropback sack rates requires elite explosive upside (<code>29.8% Expl</code>).</li>
        <li><strong>Full-Game Result:</strong> Even against that worst-case Nash DC, APEX still scores <strong>32.99 PPG</strong> — beating Conventional 11-Pers (<code>-0.136</code>, <code>23.68 PPG</code> on <code>$138.5M</code>) by <strong>+9.31 PPG</strong> and Hydra (<code>26.88 PPG</code>), and coming within <code>0.046</code> EPA/play of <code>$172.0M</code> Supermax Stars (<code>+0.019</code>) while saving <strong>$49.1M</strong>.</li>
      </ul>
      <div class="regime-bars" style="margin-top:14px; background:#091116;">
        <div style="font-weight:700; font-size:0.86rem; color:#e2e8f0; margin-bottom:8px;">APEX Open-Field EPA/Play Across Information Regimes:</div>
        <div class="bar-row">
          <span>1. Adversarial Worst-Case Nash DC (Blind Mix)</span>
          <div class="bar-track"><div class="bar-fill" style="width:12%; background:#fb7185;"></div></div>
          <span class="mono num" style="color:#fda4af;"><strong>${fmtSigned(results.nashEquilibrium.apexNashEpa, 3)}</strong></span>
        </div>
        <div class="bar-row">
          <span>2. Blind Uniform Call Sheet (Standard DC)</span>
          <div class="bar-track"><div class="bar-fill" style="width:20%; background:#fbbf24;"></div></div>
          <span class="mono num" style="color:#fde68a;"><strong>${fmtSigned(blindUniform, 3)}</strong></span>
        </div>
        <div class="bar-row">
          <span>3. Blind Nash Mix (Standard DC // 43.52 PPG)</span>
          <div class="bar-track"><div class="bar-fill" style="width:36%; background:#38bdf8;"></div></div>
          <span class="mono num" style="color:#bae6fd;"><strong>${fmtSigned(blindNashStd, 3)}</strong></span>
        </div>
        <div class="bar-row">
          <span>4. Pre-Snap Tree w/ 30% Disguise Uncertainty</span>
          <div class="bar-track"><div class="bar-fill" style="width:74%; background:#2dd4bf;"></div></div>
          <span class="mono num" style="color:#99f6e4;"><strong>${fmtSigned(obs30DisguiseEpa, 3)}</strong></span>
        </div>
        <div class="bar-row">
          <span>5. Observable Pre-Snap Decision Tree (No Cheats)</span>
          <div class="bar-track"><div class="bar-fill" style="width:94%; background:#34d399;"></div></div>
          <span class="mono num" style="color:#6ee7b7;"><strong>${fmtSigned(obsTreeEpa, 3)}</strong></span>
        </div>
      </div>
    </div>
  </section>

  <section id="decision-tree">
    <h2>IV. Pre-Snap &rarr; Post-Snap Decision Tree: How to Attack Every 2027 Defense</h2>
    <p>
      Instead of calling plays blindly into bad matchups (<code>PA Boot -1.038</code> vs. Cover 1 Robber), <code>QB1</code> executes a simple, non-oracle alignment check inside the <strong><code>12 APEX</code> No-Huddle CAN</strong> package (zero substitution tell) and the <strong><code>11 / 21 APEX</code> Orbit Motion</strong> check:
    </p>

    <div class="svg-wrap">
      <svg viewBox="0 0 1080 420" width="100%" role="img" aria-label="APEX Pre-Snap Decision Tree Flowchart">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#5eead4" />
          </marker>
        </defs>
        <rect x="0" y="0" width="1080" height="420" rx="10" fill="#081217" />
        <!-- Root -->
        <rect x="20" y="170" width="185" height="76" rx="10" fill="#004c54" stroke="#5eead4" stroke-width="1.6" />
        <text x="112" y="200" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="800">PRE-SNAP SCAN</text>
        <text x="112" y="218" text-anchor="middle" fill="#ccfbf1" font-size="11">Box Front + Safety Shell</text>
        <text x="112" y="234" text-anchor="middle" fill="#ccfbf1" font-size="11">+ Orbit Motion Tell</text>

        <!-- Branches -->
        <path d="M205 185 L270 50" stroke="#5eead4" stroke-width="1.6" marker-end="url(#arr)" />
        <path d="M205 196 L270 130" stroke="#5eead4" stroke-width="1.6" marker-end="url(#arr)" />
        <path d="M205 208 L270 210" stroke="#5eead4" stroke-width="1.6" marker-end="url(#arr)" />
        <path d="M205 220 L270 295" stroke="#5eead4" stroke-width="1.6" marker-end="url(#arr)" />
        <path d="M205 232 L270 375" stroke="#5eead4" stroke-width="1.6" marker-end="url(#arr)" />

        <!-- Condition 1: Goal Line / 6-2 -->
        <rect x="275" y="18" width="270" height="58" rx="8" fill="#13262e" stroke="#38bdf8" />
        <text x="410" y="42" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="700">1. Goal Line +4y / 6-2 Pinch</text>
        <text x="410" y="60" text-anchor="middle" fill="#93a7b2" font-size="11">6 DL (|x| &lt;= 5y) + 2 ILBs tight</text>
        <path d="M545 47 L600 47" stroke="#5eead4" stroke-width="1.6" marker-end="url(#arr)" />
        <rect x="605" y="18" width="455" height="58" rx="8" fill="rgba(16,185,129,0.16)" stroke="#34d399" />
        <text x="620" y="42" fill="#6ee7b7" font-size="12" font-weight="800">CALL: 12 APEX PIN-PULL (+0.496) / RHINO (+0.403) / GL SMASH (+0.351)</text>
        <text x="620" y="60" fill="#cbd5e1" font-size="11">96.3% 4-Down TD | Flood right sprint edge behind TE2 vs. compressed 6-2 box</text>

        <!-- Condition 2: Double A-Gap Mug -->
        <rect x="275" y="98" width="270" height="58" rx="8" fill="#13262e" stroke="#38bdf8" />
        <text x="410" y="122" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="700">2. Double A-Gap Mug Look</text>
        <text x="410" y="140" text-anchor="middle" fill="#93a7b2" font-size="11">WILL &amp; MIKE mugged @ 1.1y (C0 threat)</text>
        <path d="M545 127 L600 127" stroke="#5eead4" stroke-width="1.6" marker-end="url(#arr)" />
        <rect x="605" y="98" width="455" height="58" rx="8" fill="rgba(16,185,129,0.16)" stroke="#34d399" />
        <text x="620" y="122" fill="#6ee7b7" font-size="12" font-weight="800">CAN: EAGLES RHINO COUNTER (+0.835 Dime Mug / +0.847 Cross-Dog)</text>
        <text x="620" y="140" fill="#cbd5e1" font-size="11">On 3rd &amp; 9 Check -&gt; Switch-Mesh (+0.152 vs Cross-Dog) w/ TE1 scan + dual hots</text>

        <!-- Condition 3: Bear 5-Down -->
        <rect x="275" y="178" width="270" height="58" rx="8" fill="#13262e" stroke="#38bdf8" />
        <text x="410" y="202" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="700">3. 5-Down 3-4 Bear Front</text>
        <text x="410" y="220" text-anchor="middle" fill="#93a7b2" font-size="11">0T + 4i/4i + OLBs covering all 5 OL</text>
        <path d="M545 207 L600 207" stroke="#5eead4" stroke-width="1.6" marker-end="url(#arr)" />
        <rect x="605" y="178" width="455" height="58" rx="8" fill="rgba(16,185,129,0.16)" stroke="#34d399" />
        <text x="620" y="202" fill="#6ee7b7" font-size="12" font-weight="800">KILL PASSES -&gt; RHINO COUNTER (+0.271) or WING PIN-PULL (+0.036)</text>
        <text x="620" y="220" fill="#cbd5e1" font-size="11">Never expose C (PWR 82) / RG to 5-man Bear dropbacks (-0.20 to -0.41 EPA)</text>

        <!-- Condition 4: Split 2-High -->
        <rect x="275" y="258" width="270" height="58" rx="8" fill="#13262e" stroke="#38bdf8" />
        <text x="410" y="282" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="700">4. Split 2-High Safeties (11-12.5y)</text>
        <text x="410" y="300" text-anchor="middle" fill="#93a7b2" font-size="11">Dime Quarters (6.8y CB) vs. Sim C2 (4.5y CB)</text>
        <path d="M545 287 L600 287" stroke="#5eead4" stroke-width="1.6" marker-end="url(#arr)" />
        <rect x="605" y="258" width="455" height="58" rx="8" fill="rgba(56,189,248,0.14)" stroke="#38bdf8" />
        <text x="620" y="282" fill="#7dd3fc" font-size="12" font-weight="800">SAFE DUAL-BEATER: ORBIT GLANCE-SAIL (+0.418 Qtrs / +0.630 Sim C2)</text>
        <text x="620" y="300" fill="#cbd5e1" font-size="11">If confirm tight Sim C2 corners (4.5y) -&gt; Rhino (+0.767) or 0.68s PA Boot (+0.754)</text>

        <!-- Condition 5: 1-High Man vs Zone -->
        <rect x="275" y="338" width="270" height="62" rx="8" fill="#13262e" stroke="#38bdf8" />
        <text x="410" y="362" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="700">5. 1-High Box (C3 Sky vs. C1/S-Blitz)</text>
        <text x="410" y="380" text-anchor="middle" fill="#93a7b2" font-size="11">Soft C3 (CB @6y/SS @5y) vs. Press Man / SS @1.2y</text>
        <path d="M545 369 L600 369" stroke="#5eead4" stroke-width="1.6" marker-end="url(#arr)" />
        <rect x="605" y="338" width="455" height="62" rx="8" fill="rgba(251,191,36,0.14)" stroke="#fbbf24" />
        <text x="620" y="362" fill="#fde68a" font-size="12" font-weight="800">SOFT C3 -&gt; 0.68s PA BOOT (+0.403) / SWITCH (+0.361)</text>
        <text x="620" y="381" fill="#fde68a" font-size="12" font-weight="800">TIGHT C1 / S-BLITZ -&gt; WING OPTION (+0.368 to +0.580) / PIN-PULL (+0.409)</text>
      </svg>
    </div>

    <div class="explorer-panel">
      <div style="font-size:0.85rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--mint); font-weight:800;">
        Interactive Defensive Counter Inspector (Click Any 2027 Front)
      </div>
      <div class="def-btn-row" id="def-btn-row"></div>
      <div id="def-explorer-output"></div>
    </div>

    <h3>Complete 8 &times; 10 Calibrated EPA/Play Heatmap Matrix</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>APEX Concept</th>${matrixHeaders}</tr>
        </thead>
        <tbody>
          ${matrixRows}
        </tbody>
      </table>
    </div>

    <h3>Play-Caller Quick Reference Across All 10 Defenses</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Defensive Call</th><th>Pre-Snap Alignment Tell</th><th>Primary Attack</th><th>Secondary Attack</th><th>Hard Avoid</th><th>Post-Snap Progression Key</th></tr>
        </thead>
        <tbody>
          ${decisionMatrixRows}
        </tbody>
      </table>
    </div>
  </section>

  <section id="situational">
    <h2>V. Championship Situational Football (4 Audited Stress Drills)</h2>
    <div class="drill-grid">
      <div class="table-wrap">
        <div style="padding:12px 14px; font-weight:800; background:#0a151a; color:var(--mint);">1) 2-Minute Drill (Own 35, 1:50, 1 TO — OOB Stop)</div>
        <table>
          <thead><tr><th>Offense</th><th class="num">TD Win%</th><th class="num">Yds/Sec</th><th class="num">OOB/Drv</th><th class="num">Sack%</th></tr></thead>
          <tbody>
            <tr class="row-apex"><td><strong>2027 APEX ($122.9M)</strong></td><td class="num mono"><strong>${sd.twoMinute.apex.tdWinPct}%</strong></td><td class="num mono">${sd.twoMinute.apex.ydsPerClockSec}</td><td class="num mono">${sd.twoMinute.apex.oobStopsPerDrive}</td><td class="num mono">${sd.twoMinute.apex.sackRatePct}%</td></tr>
            <tr><td>2027 Argon ($81.1M)</td><td class="num mono">${sd.twoMinute.argon.tdWinPct}%</td><td class="num mono">${sd.twoMinute.argon.ydsPerClockSec}</td><td class="num mono">${sd.twoMinute.argon.oobStopsPerDrive}</td><td class="num mono">${sd.twoMinute.argon.sackRatePct}%</td></tr>
            <tr><td>Supermax ($172M)</td><td class="num mono">${sd.twoMinute.supermax.tdWinPct}%</td><td class="num mono">${sd.twoMinute.supermax.ydsPerClockSec}</td><td class="num mono">${sd.twoMinute.supermax.oobStopsPerDrive}</td><td class="num mono">${sd.twoMinute.supermax.sackRatePct}%</td></tr>
            <tr><td>Conv. 11 ($138.5M)</td><td class="num mono">${sd.twoMinute.conv11.tdWinPct}%</td><td class="num mono">${sd.twoMinute.conv11.ydsPerClockSec}</td><td class="num mono">${sd.twoMinute.conv11.oobStopsPerDrive}</td><td class="num mono">${sd.twoMinute.conv11.sackRatePct}%</td></tr>
          </tbody>
        </table>
      </div>

      <div class="table-wrap">
        <div style="padding:12px 14px; font-weight:800; background:#0a151a; color:var(--mint);">2) 4-Minute Drill (Own 30, 4:00, Opp 2 TOs — Bleed Clock)</div>
        <table>
          <thead><tr><th>Offense</th><th class="num">Seal%</th><th class="num">Clock Bled</th><th class="num">1st Downs</th><th class="num">Clock-Gift%</th></tr></thead>
          <tbody>
            <tr class="row-apex"><td><strong>2027 APEX (Rhino/Pin-Pull)</strong></td><td class="num mono"><strong>${sd.fourMinute.apex.gameSealPct}%</strong></td><td class="num mono"><strong>${sd.fourMinute.apex.meanClockBledSec}s</strong></td><td class="num mono">${sd.fourMinute.apex.firstDownsPerDrive}</td><td class="num mono">${sd.fourMinute.apex.clockGiftMistakePct}%</td></tr>
            <tr><td>2027 Argon ($81.1M)</td><td class="num mono">${sd.fourMinute.argon.gameSealPct}%</td><td class="num mono">${sd.fourMinute.argon.meanClockBledSec}s</td><td class="num mono">${sd.fourMinute.argon.firstDownsPerDrive}</td><td class="num mono">${sd.fourMinute.argon.clockGiftMistakePct}%</td></tr>
            <tr><td>Shanahan 12 ($146M)</td><td class="num mono">${sd.fourMinute.shanahan12.gameSealPct}%</td><td class="num mono">${sd.fourMinute.shanahan12.meanClockBledSec}s</td><td class="num mono">${sd.fourMinute.shanahan12.firstDownsPerDrive}</td><td class="num mono">${sd.fourMinute.shanahan12.clockGiftMistakePct}%</td></tr>
            <tr><td>Conv. 11 ($138.5M)</td><td class="num mono">${sd.fourMinute.conv11.gameSealPct}%</td><td class="num mono">${sd.fourMinute.conv11.meanClockBledSec}s</td><td class="num mono">${sd.fourMinute.conv11.firstDownsPerDrive}</td><td class="num mono">${sd.fourMinute.conv11.clockGiftMistakePct}%</td></tr>
          </tbody>
        </table>
      </div>

      <div class="table-wrap">
        <div style="padding:12px 14px; font-weight:800; background:#0a151a; color:var(--mint);">3) Low Red Zone / Goal Line (1st &amp; Goal at +4.0y)</div>
        <table>
          <thead><tr><th>Offense</th><th class="num">4-Down TD%</th><th class="num">1st-Snap TD%</th><th class="num">Expected Pts</th></tr></thead>
          <tbody>
            <tr class="row-apex"><td><strong>2027 APEX (Sprint Smash)</strong></td><td class="num mono"><strong>${sd.goalLine.apex.fourDownTdPct}%</strong></td><td class="num mono"><strong>${sd.goalLine.apex.singleSnapTdPct}%</strong></td><td class="num mono"><strong>${sd.goalLine.apex.expectedGoalLinePts}</strong></td></tr>
            <tr><td>2027 Argon (Cyclotron)</td><td class="num mono">${sd.goalLine.argon.fourDownTdPct}%</td><td class="num mono">${sd.goalLine.argon.singleSnapTdPct}%</td><td class="num mono">${sd.goalLine.argon.expectedGoalLinePts}</td></tr>
            <tr><td>Shanahan 12 ($146M)</td><td class="num mono">${sd.goalLine.shanahan12.fourDownTdPct}%</td><td class="num mono">${sd.goalLine.shanahan12.singleSnapTdPct}%</td><td class="num mono">${sd.goalLine.shanahan12.expectedGoalLinePts}</td></tr>
            <tr><td>Conv. 11 ($138.5M)</td><td class="num mono">${sd.goalLine.conv11.fourDownTdPct}%</td><td class="num mono">${sd.goalLine.conv11.singleSnapTdPct}%</td><td class="num mono">${sd.goalLine.conv11.expectedGoalLinePts}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="table-wrap">
        <div style="padding:12px 14px; font-weight:800; background:#0a151a; color:var(--mint);">4) 3rd &amp; 9 "Sticks Trap" (vs. Quarters &amp; Dime Mug C0)</div>
        <table>
          <thead><tr><th>Offense</th><th class="num">Conv%</th><th class="num">Expl 18+y%</th><th class="num">Sack%</th><th class="num">Mean EPA</th></tr></thead>
          <tbody>
            <tr class="row-apex"><td><strong>2027 APEX (Switch/OOB)</strong></td><td class="num mono"><strong>${sd.thirdAndNine.apex.conversionPct}%</strong></td><td class="num mono">${sd.thirdAndNine.apex.explosive18Pct}%</td><td class="num mono"><strong>${sd.thirdAndNine.apex.sackPct}%</strong></td><td class="num mono">${fmtSigned(sd.thirdAndNine.apex.meanEpa, 3)}</td></tr>
            <tr><td>2027 Argon ($81.1M)</td><td class="num mono">${sd.thirdAndNine.argon.conversionPct}%</td><td class="num mono">${sd.thirdAndNine.argon.explosive18Pct}%</td><td class="num mono">${sd.thirdAndNine.argon.sackPct}%</td><td class="num mono">${fmtSigned(sd.thirdAndNine.argon.meanEpa, 3)}</td></tr>
            <tr><td>Supermax ($172M)</td><td class="num mono">${sd.thirdAndNine.supermax.conversionPct}%</td><td class="num mono">${sd.thirdAndNine.supermax.explosive18Pct}%</td><td class="num mono">${sd.thirdAndNine.supermax.sackPct}%</td><td class="num mono">${fmtSigned(sd.thirdAndNine.supermax.meanEpa, 3)}</td></tr>
            <tr><td>Conv. 11 ($138.5M)</td><td class="num mono">${sd.thirdAndNine.conv11.conversionPct}%</td><td class="num mono">${sd.thirdAndNine.conv11.explosive18Pct}%</td><td class="num mono">${sd.thirdAndNine.conv11.sackPct}%</td><td class="num mono">${fmtSigned(sd.thirdAndNine.conv11.meanEpa, 3)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section id="roadmap">
    <h2>VI. Honest Trade-Offs &amp; GM-Coach Year 1–2 Partnership Roadmap</h2>
    <div class="callout">
      <ul style="margin:0; padding-left:20px;">
        <li><strong>Honest Blind-Nash Ceiling Gap:</strong> Under static blind minimax, <code>Shanahan 12 ($146.0M)</code> achieves <code>+0.173</code> EPA/play by spending <code>$23.1M</code> more across OL/QB processing, and <code>Argon ($81.1M)</code> hits <code>+0.290</code> by chaining multiple backward-toss option plays simultaneously. APEX caps itself intentionally at <strong>one</strong> backward-toss option play alongside traditional dropback, pin-pull, and PA concepts — which is why pre-snap identification (<code>+0.508</code> EPA/play) unlocks APEX's true ceiling.</li>
        <li><strong>Priority #1 Draft/FA Target — Upgrade Day-3 RG (<code>AWR 82</code>, <code>BLK 83</code>):</strong> Elevating RG processing directly closes A/B-gap pressure leakage in <code>Switch-Mesh</code> and <code>Orbit Glance</code> vs. Cover-0 mug fronts.</li>
        <li><strong>Priority #2 — Sub-<code>$10M</code> Day-2 Route Separator #2:</strong> Pairing one sharp man-beating separator across from <code>WR1</code> unlocks symmetric outside threat against <code>BASE_43_OVER_C1</code> without paying a third <code>$20M+</code> contract.</li>
      </ul>
    </div>
  </section>
</main>

<script>
const EXPLORER_DATA = ${explorerJson};
const PLAY_ID_TO_ANCHOR = {
  APEX_ORBIT_GLANCE_FLOOD: '#play-1',
  APEX_DUO_WING_PIN_PULL: '#play-2',
  APEX_SHORT_MESH_PA_BOOT: '#play-3',
  APEX_SWITCH_MESH_STICKS: '#play-4',
  APEX_TWOMIN_BOUNDARY_OOB: '#play-5',
  APEX_DISPLACED_WING_OPTION: '#play-6',
  APEX_EAGLES_RHINO_COUNTER: '#play-7',
  APEX_GOALLINE_SPRINT_SMASH: '#play-8'
};
const rowEl = document.getElementById('def-btn-row');
const outEl = document.getElementById('def-explorer-output');
function fmt(v) { return (v >= 0 ? '+' : '') + v.toFixed(3); }
function selectDef(defId) {
  const item = EXPLORER_DATA.find((x) => x.id === defId) || EXPLORER_DATA[0];
  document.querySelectorAll('.def-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-id') === item.id);
  });
  const top3 = item.ranked.slice(0, 3).map((r) =>
    '<a href="' + (PLAY_ID_TO_ANCHOR[r.id] || '#playbook') + '" class="chip chip-good" style="text-decoration:none;">' +
    r.short + ' (' + fmt(r.epa) + ' EPA) &rarr; Film</a>'
  ).join(' ');
  const bad = item.ranked.slice(-2).reverse().map((r) =>
    '<span class="chip chip-bad">' + r.short + ' (' + fmt(r.epa) + ' EPA)</span>'
  ).join(' ');
  outEl.innerHTML =
    '<div style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:10px; align-items:center;">' +
      '<h3 style="margin:0; color:#fff;">' + item.label + '</h3>' +
      '<span class="badge-cat">' + item.bucket + '</span>' +
    '</div>' +
    '<p style="margin:8px 0;"><strong>Pre-Snap Tell:</strong> ' + item.alignmentTell + '</p>' +
    '<p style="margin:8px 0;"><strong>Top Play-Calls:</strong> ' + top3 + '</p>' +
    '<p style="margin:8px 0;"><strong>Avoid List:</strong> ' + bad + ' &mdash; <span class="muted small">' + item.hardAvoidNote + '</span></p>' +
    '<p style="margin:8px 0 0;"><strong>Post-Snap Key:</strong> ' + item.postSnapKey + '</p>';
}
EXPLORER_DATA.forEach((d) => {
  const btn = document.createElement('button');
  btn.className = 'def-btn';
  btn.setAttribute('data-id', d.id);
  btn.textContent = d.id;
  btn.onclick = () => selectDef(d.id);
  rowEl.appendChild(btn);
});
selectDef('NICKEL_OVER_C3');
</script>
</body>
</html>
`;
}

function main(): void {
  const resultsPath = path.join(process.cwd(), 'src', 'data', 'apex_2027_results.json');
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const docsDir = path.join(process.cwd(), 'docs');
  const gifsDir = path.join(docsDir, 'apex_gifs');

  const pagesHtml = renderHtml(results, false, gifsDir);
  const indexPath = path.join(docsDir, 'index.html');
  fs.writeFileSync(indexPath, pagesHtml, 'utf8');

  const standaloneHtml = renderHtml(results, true, gifsDir);
  const standalonePath = path.join(docsDir, 'EAGLES_APEX_2027_WHITEPAPER.html');
  fs.writeFileSync(standalonePath, standaloneHtml, 'utf8');

  console.log(`Built GitHub Pages HTML:     ${indexPath} (${(Buffer.byteLength(pagesHtml) / 1024).toFixed(1)} KB)`);
  console.log(`Built Self-Contained HTML:   ${standalonePath} (${(Buffer.byteLength(standaloneHtml) / (1024 * 1024)).toFixed(2)} MB, inline Base64 GIFs)`);
}

main();
