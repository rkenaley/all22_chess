import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

interface ApexGifConfig {
  badgeLabel: string;
  badgeBg: string;
  badgeColor: string;
  playId: string;
  regime: 'OPEN_FIELD_1ST_10' | 'GOAL_LINE_4YD' | 'TWO_MIN_OOB' | 'FOUR_MIN_INBOUNDS';
  slug: string;
  shortTitle: string;
  personnel: string;
  defCall: string;
  featuredDefense: string;
}

const APEX_GIF_CONFIGS: ApexGifConfig[] = [
  {
    badgeLabel: 'APEX PLAY 1 // 1ST & 10',
    badgeBg: 'rgba(0, 76, 84, 0.45)',
    badgeColor: '#5eead4',
    playId: 'APEX_ORBIT_GLANCE_FLOOD',
    regime: 'OPEN_FIELD_1ST_10',
    slug: 'apex_play1_orbit_glance_flood.gif',
    shortTitle: 'ORBIT GLANCE-SAIL TRIANGLE',
    personnel: '11 APEX ($122.9M)',
    defCall: 'NICKEL_OVER_C3',
    featuredDefense: 'vs. 4-2-5 NICKEL OVER // COVER 3 SKY',
  },
  {
    badgeLabel: 'APEX PLAY 2 // EDGE RUN',
    badgeBg: 'rgba(16, 185, 129, 0.25)',
    badgeColor: '#34d399',
    playId: 'APEX_DUO_WING_PIN_PULL',
    regime: 'OPEN_FIELD_1ST_10',
    slug: 'apex_play2_duo_wing_pin_pull.gif',
    shortTitle: '12-PERS WING PIN-AND-PULL EDGE',
    personnel: '12 APEX ($120.2M)',
    defCall: 'BASE_34_BEAR_C4',
    featuredDefense: 'vs. 3-4 BEAR TITE // QUARTERS MATCH',
  },
  {
    badgeLabel: 'APEX PLAY 3 // PA BOOT',
    badgeBg: 'rgba(56, 189, 248, 0.25)',
    badgeColor: '#38bdf8',
    playId: 'APEX_SHORT_MESH_PA_BOOT',
    regime: 'OPEN_FIELD_1ST_10',
    slug: 'apex_play3_short_mesh_pa_boot.gif',
    shortTitle: '0.68s HALF-ROLL PA BOOT FLOOD',
    personnel: '12 APEX ($120.2M)',
    defCall: 'NICKEL_OVER_C3',
    featuredDefense: 'vs. 4-2-5 NICKEL OVER // COVER 3 SKY',
  },
  {
    badgeLabel: 'APEX PLAY 4 // 3RD & 9',
    badgeBg: 'rgba(234, 179, 8, 0.24)',
    badgeColor: '#facc15',
    playId: 'APEX_SWITCH_MESH_STICKS',
    regime: 'OPEN_FIELD_1ST_10',
    slug: 'apex_play4_switch_mesh_sticks.gif',
    shortTitle: '3RD & 9 SWITCH-MESH & STICKS FIN',
    personnel: '11 APEX ($122.9M)',
    defCall: 'VIKINGS_MUG_CROSSDOG_C0',
    featuredDefense: 'vs. 3-2-6 MUG // CROSS-DOG C0 BLITZ',
  },
  {
    badgeLabel: 'APEX PLAY 5 // 2-MINUTE',
    badgeBg: 'rgba(244, 63, 94, 0.24)',
    badgeColor: '#fb7185',
    playId: 'APEX_TWOMIN_BOUNDARY_OOB',
    regime: 'TWO_MIN_OOB',
    slug: 'apex_play5_twomin_boundary_oob.gif',
    shortTitle: '2-MIN BOUNDARY OUT-STRETCH (OOB)',
    personnel: '11 APEX ($122.9M)',
    defCall: 'DIME_QUARTERS_MATCH',
    featuredDefense: 'vs. 2-3-6 DIME // QUARTERS MATCH',
  },
  {
    badgeLabel: 'APEX PLAY 6 // OPTION PASS',
    badgeBg: 'rgba(168, 85, 247, 0.25)',
    badgeColor: '#c084fc',
    playId: 'APEX_DISPLACED_WING_OPTION',
    regime: 'OPEN_FIELD_1ST_10',
    slug: 'apex_play6_displaced_wing_option.gif',
    shortTitle: 'DISPLACED WING OPTION-PASS',
    personnel: '21 APEX ($122.5M)',
    defCall: 'NICKEL_SIM_C2',
    featuredDefense: 'vs. NICKEL SIM PRESSURE // COVER 2',
  },
  {
    badgeLabel: 'APEX PLAY 7 // 4-MIN CLOCK',
    badgeBg: 'rgba(16, 185, 129, 0.28)',
    badgeColor: '#6ee7b7',
    playId: 'APEX_EAGLES_RHINO_COUNTER',
    regime: 'FOUR_MIN_INBOUNDS',
    slug: 'apex_play7_eagles_rhino_counter.gif',
    shortTitle: '11v11 EAGLES RHINO QB SWEEP LEFT',
    personnel: '12 APEX ($120.2M)',
    defCall: 'BASE_43_OVER_C1',
    featuredDefense: 'vs. 4-3 OVER // 8-MAN C1 ROBBER BOX',
  },
  {
    badgeLabel: 'APEX PLAY 8 // GL +4Y',
    badgeBg: 'rgba(239, 68, 68, 0.28)',
    badgeColor: '#f87171',
    playId: 'APEX_GOALLINE_SPRINT_SMASH',
    regime: 'GOAL_LINE_4YD',
    slug: 'apex_play8_goalline_sprint_smash.gif',
    shortTitle: 'GL +4y SPRINT-BOOT OPTION POP',
    personnel: '12 APEX ($120.2M)',
    defCall: 'GOAL_LINE_62_PINCH',
    featuredDefense: 'vs. 6-2 GOAL-LINE PINCH // COVER 0',
  },
];

const ARTIFACT_DIR = 'C:\\Users\\Ryan\\.gemini\\antigravity\\brain\\b6f039c4-dcde-4bb9-a27b-ce0635b23638';
const MIME_MAP: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function startDistServer(distDir: string, port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqPath = (req.url || '/').split('?')[0];
      const rel = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
      const fullPath = path.join(distDir, rel);
      if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream' });
      fs.createReadStream(fullPath).pipe(res);
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

class CDPClient {
  private ws!: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();

  async connect(wsUrl: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', (err) => reject(err));
      this.ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(String(ev.data));
        if (msg.id && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
          else p.resolve(msg.result);
        }
      });
    });
  }

  send(method: string, params: Record<string, any> = {}): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close(): void {
    try {
      this.ws.close();
    } catch {}
  }
}

async function launchHeadlessChrome(debugPort: number): Promise<{ proc: ChildProcess; wsUrl: string; tmpProfile: string }> {
  const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const bin = chromeCandidates.find((p) => fs.existsSync(p));
  if (!bin) throw new Error('No Chrome/Edge binary found for headless capture');

  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-gifs-cdp-'));
  const proc = spawn(
    bin,
    [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${tmpProfile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--hide-scrollbars',
      '--window-size=1600,1050',
    ],
    { stdio: 'ignore' }
  );

  let pageWsUrl = '';
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((r) => setTimeout(r, 150));
    try {
      const listResp = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = (await listResp.json()) as any[];
      const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (pageTarget) {
        pageWsUrl = pageTarget.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }
  if (!pageWsUrl) {
    proc.kill();
    throw new Error('Timed out waiting for Chrome DevTools Protocol WebSocket');
  }
  return { proc, wsUrl: pageWsUrl, tmpProfile };
}

function runPythonGifEncoder(
  framesPattern: string,
  outputGif: string,
  fps = 10,
  endPauseSec = 2.0
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pyScript = path.join(process.cwd(), 'src', 'encode_gif.py');
    const pyExe = 'C:\\Users\\Ryan\\AppData\\Local\\Programs\\Python\\Python312\\python.exe';
    const pyProc = spawn(pyExe, [pyScript, framesPattern, outputGif, String(fps), String(endPauseSec)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    pyProc.stderr.on('data', (d) => (stderr += d.toString()));
    pyProc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Python gif encoder exited with code ${code}: ${stderr}`));
    });
  });
}

async function main(): Promise<void> {
  const resultsPath = path.join(process.cwd(), 'src', 'data', 'apex_2027_results.json');
  const resultsJson = fs.existsSync(resultsPath) ? JSON.parse(fs.readFileSync(resultsPath, 'utf8')) : null;
  const telemetryById: Record<string, any> = {};
  if (resultsJson?.apexPlayTelemetry) {
    for (const item of resultsJson.apexPlayTelemetry) telemetryById[item.id] = item;
  }

  console.log(`\n===============================================================================`);
  console.log(`2027 PHILADELPHIA APEX CONTINUUM: 0.5x HALF-SPEED ALL-22 GIF GENERATOR`);
  console.log(`===============================================================================\n`);

  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('dist/index.html missing — run npm run build first');
  }

  const docsOutDir = path.join(process.cwd(), 'docs', 'apex_gifs');
  fs.mkdirSync(docsOutDir, { recursive: true });
  const artifactOutDir = path.join(ARTIFACT_DIR, 'apex_gifs');
  fs.mkdirSync(artifactOutDir, { recursive: true });

  const server = await startDistServer(distDir, 5204);
  const { proc, wsUrl, tmpProfile } = await launchHeadlessChrome(9257);
  const cdp = new CDPClient();

  try {
    await cdp.connect(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5204/' });
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 120));
      const check = await cdp.send('Runtime.evaluate', {
        expression: 'Boolean(window.__all22App)',
        returnByValue: true,
      });
      if (check?.result?.value === true) break;
    }

    let completed = 0;
    const startTime = Date.now();

    for (const cfg of APEX_GIF_CONFIGS) {
      completed++;
      const docsGifPath = path.join(docsOutDir, cfg.slug);
      const artGifPath = path.join(artifactOutDir, cfg.slug);

      const tData = telemetryById[cfg.playId];
      const mcLabel = tData
        ? `MC Avg: ${tData.overallMeanYards >= 0 ? '+' : ''}${tData.overallMeanYards}y | ${tData.overallMeanEpa >= 0 ? '+' : ''}${tData.overallMeanEpa} EPA | ${tData.successRatePct}% Succ`
        : '20 Hz Kinematic Replay';

      console.log(`[${completed}/${APEX_GIF_CONFIGS.length}] Rendering ${cfg.shortTitle} (${cfg.defCall})...`);

      const prepExpr = `(() => {
        const app = window.__all22App;
        const leftDock = document.querySelector('.dock-left');
        if (leftDock) leftDock.style.display = 'none';
        const rightDock = document.querySelector('.dock-right');
        if (rightDock) rightDock.style.display = 'none';
        const topbar = document.querySelector('.topbar');
        if (topbar) topbar.style.display = 'none';
        const statusbar = document.querySelector('.statusbar');
        if (statusbar) statusbar.style.display = 'none';
        const scrubber = document.querySelector('.scrubber-bar');
        if (scrubber) scrubber.style.display = 'none';

        const ws = document.querySelector('.workstation');
        if (ws) {
          ws.style.display = 'block';
          ws.style.width = '1440px';
          ws.style.height = '864px';
          ws.style.margin = '0';
          ws.style.padding = '0';
        }
        const wrap = document.querySelector('.canvas-wrap');
        if (wrap) {
          wrap.style.width = '1440px';
          wrap.style.height = '864px';
          wrap.style.margin = '0';
          wrap.style.padding = '0';
        }
        const tc = document.getElementById('tactical-canvas');
        if (tc) {
          tc.style.width = '1440px';
          tc.style.height = '864px';
        }
        app.renderer.resize();

        const offSel = document.getElementById('off-team-select');
        if (offSel) {
          offSel.value = 'APX';
          offSel.dispatchEvent(new Event('change'));
        }
        app.autoMatchDefense = false;
        app.loadPlayPreset('${cfg.playId}');

        const defSelect = document.getElementById('def-call-select');
        if (defSelect) defSelect.value = '${cfg.defCall}';
        const offOnly = app.agents.filter((a) => a.side === 'OFF');
        app.agents = [...offOnly, ...app.createDefenseFront('${cfg.defCall}')];
        app.applyTeamPersonnel(app.agents);

        if ('${cfg.regime}' === 'GOAL_LINE_4YD') {
          app.customFieldContext = { yardLineToGoal: 4.0, sidelineObjective: 'NORMAL' };
          app.renderOpts.yardLineToGoal = 4.0;
          app.renderOpts.firstDownYards = 4.0;
        } else if ('${cfg.regime}' === 'TWO_MIN_OOB') {
          app.customFieldContext = { sidelineObjective: 'STOP_CLOCK_OOB' };
          app.renderOpts.yardLineToGoal = undefined;
          app.renderOpts.firstDownYards = 10.0;
        } else if ('${cfg.regime}' === 'FOUR_MIN_INBOUNDS') {
          app.customFieldContext = { sidelineObjective: 'STAY_INBOUNDS' };
          app.renderOpts.yardLineToGoal = undefined;
          app.renderOpts.firstDownYards = 10.0;
        } else {
          app.customFieldContext = null;
          app.renderOpts.yardLineToGoal = undefined;
          app.renderOpts.firstDownYards = 10.0;
        }

        let lastSnap = null;
        for (let attempt = 0; attempt < 12; attempt++) {
          app.recomputeSimulation();
          if (attempt > 0) {
            app.snapshots = app.engine.simulatePlay(app.agents, 0.85, app.customFieldContext || undefined);
            app.currentTick = Math.min(app.currentTick, app.snapshots.length - 1);
            app.drawCurrentFrame();
          }
          lastSnap = app.snapshots[app.snapshots.length - 1];
          const reason = lastSnap?.terminationReason || '';
          const yds = lastSnap?.carrierTackledYards ?? 0;
          const isBadClip =
            reason === 'SACK' ||
            reason === 'INTERCEPTION' ||
            reason === 'INCOMPLETE' ||
            (reason === 'TACKLED' && yds < ('${cfg.regime}' === 'GOAL_LINE_4YD' ? 2.5 : 3.5));
          if (!isBadClip) break;
        }
        app.renderOpts.selectedAgentId = null;
        app.renderOpts.hoveredAgentId = null;

        return {
          totalTicks: app.snapshots.length,
          outcome: lastSnap?.terminationReason || 'UNKNOWN',
          yards: lastSnap?.carrierTackledYards ?? 0,
        };
      })()`;

      const prepRes = await cdp.send('Runtime.evaluate', { expression: prepExpr, returnByValue: true });
      const { totalTicks, outcome, yards } = prepRes.result.value as {
        totalTicks: number;
        outcome: string;
        yards: number;
      };
      console.log(`   -> Film clip: ${outcome} (${yards >= 0 ? '+' : ''}${Number(yards).toFixed(1)}y)`);

      const framesTmpDir = path.join(tmpProfile, `frames_${cfg.slug.replace('.gif', '')}`);
      fs.mkdirSync(framesTmpDir, { recursive: true });

      const BATCH = 8;
      for (let start = 0; start < totalTicks; start += BATCH) {
        const end = Math.min(totalTicks, start + BATCH);
        const batchExpr = `(() => {
          const app = window.__all22App;
          const tc = document.getElementById('tactical-canvas');
          const snaps = app.snapshots;
          const W = 1440;
          const FIELD_H = 864;
          const TOP_H = 64;
          const BOT_H = 48;
          const H = TOP_H + FIELD_H + BOT_H;

          const expCanvas = document.createElement('canvas');
          expCanvas.width = W;
          expCanvas.height = H;
          const ctx = expCanvas.getContext('2d');
          const frames = [];

          for (let t = ${start}; t < ${end}; t++) {
            app.currentTick = t;
            app.drawCurrentFrame();
            const snap = snaps[t];

            ctx.fillStyle = '#060810';
            ctx.fillRect(0, 0, W, H);
            ctx.drawImage(tc, 0, TOP_H, W, FIELD_H);

            ctx.fillStyle = '#070b14';
            ctx.fillRect(0, 0, W, TOP_H);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, TOP_H);
            ctx.lineTo(W, TOP_H);
            ctx.stroke();

            ctx.fillStyle = '${cfg.badgeBg}';
            ctx.strokeStyle = '${cfg.badgeColor}';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.roundRect(14, 13, 195, 38, 5);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '${cfg.badgeColor}';
            ctx.font = 'bold 12.5px "Segoe UI", sans-serif';
            ctx.fillText('${cfg.badgeLabel}', 24, 37);

            ctx.fillStyle = 'rgba(0, 76, 84, 0.35)';
            ctx.strokeStyle = '#a5acaf';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(218, 13, 152, 38, 5);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 12.5px "Segoe UI", sans-serif';
            ctx.fillText('PHILLY APEX 2027', 231, 37);

            ctx.fillStyle = '#ffffff';
            ctx.font = '900 15.5px "Segoe UI", sans-serif';
            ctx.fillText('${cfg.shortTitle.replace(/'/g, "\\'")}', 382, 37);

            ctx.fillStyle = 'rgba(6, 182, 212, 0.16)';
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(W - 585, 13, 160, 38, 5);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 12.5px "Cascadia Mono", monospace';
            ctx.fillText('${cfg.personnel}', W - 575, 37);

            ctx.fillStyle = '#111728';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(W - 415, 13, 400, 38, 5);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 12.5px "Cascadia Mono", monospace';
            ctx.fillText('${cfg.featuredDefense.replace(/'/g, "\\'")}', W - 405, 37);

            ctx.fillStyle = '#070b14';
            ctx.fillRect(0, H - BOT_H, W, BOT_H);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, H - BOT_H);
            ctx.lineTo(W, H - BOT_H);
            ctx.stroke();

            ctx.fillStyle = '#5eead4';
            ctx.font = 'bold 13.5px "Cascadia Mono", monospace';
            const tSec = snap.timeSec !== undefined ? snap.timeSec.toFixed(2) : (t * 0.05).toFixed(2);
            ctx.fillText(\`T=\${tSec}s (TICK \${String(t).padStart(2, '0')}/\${snaps.length - 1}) [0.5x]\`, 18, H - 18);

            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 12.5px "Cascadia Mono", monospace';
            ctx.fillText('${mcLabel}', 340, H - 18);

            if (snap.exoticEvent) {
              ctx.fillStyle = '#fbbf24';
              ctx.font = 'bold 13px "Cascadia Mono", monospace';
              ctx.fillText(\`⚡ \${snap.exoticEvent}\`, 790, H - 18);
            }

            const ydsStr = snap.carrierTackledYards !== null && snap.carrierTackledYards !== undefined
              ? \` (\${snap.carrierTackledYards >= 0 ? '+' : ''}\${snap.carrierTackledYards.toFixed(1)}y)\`
              : '';
            const phaseText = snap.playOver && snap.terminationReason
              ? \`\${snap.phase} [\${snap.terminationReason}\${ydsStr}]\`
              : snap.phase;
            ctx.fillStyle = snap.playOver
              ? (snap.terminationReason === 'TOUCHDOWN' ? '#fbbf24' : '#34d399')
              : '#94a3b8';
            ctx.font = 'bold 13.5px "Cascadia Mono", monospace';
            const phaseW = ctx.measureText(phaseText).width;
            ctx.fillText(phaseText, W - phaseW - 18, H - 18);

            frames.push(expCanvas.toDataURL('image/png'));
          }
          return frames;
        })()`;

        const batchRes = await cdp.send('Runtime.evaluate', { expression: batchExpr, returnByValue: true });
        const dataUrls = batchRes.result.value as string[];
        for (let i = 0; i < dataUrls.length; i++) {
          const tick = start + i;
          const b64 = dataUrls[i].replace(/^data:image\/png;base64,/, '');
          fs.writeFileSync(path.join(framesTmpDir, `frame_${String(tick).padStart(3, '0')}.png`), Buffer.from(b64, 'base64'));
        }
      }

      const pat = path.join(framesTmpDir, 'frame_*.png');
      await runPythonGifEncoder(pat, docsGifPath, 10, 2.0);
      fs.copyFileSync(docsGifPath, artGifPath);
      const szMb = (fs.statSync(docsGifPath).size / (1024 * 1024)).toFixed(2);
      console.log(`   -> Created ${cfg.slug} (${szMb} MB, ${totalTicks} frames @ 10 fps)`);
      fs.rmSync(framesTmpDir, { recursive: true, force: true });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n===============================================================================`);
    console.log(`SUCCESS: All ${APEX_GIF_CONFIGS.length} Philadelphia APEX GIFs Generated in ${elapsed}s!`);
    console.log(`  - Docs Directory:     ${docsOutDir}`);
    console.log(`  - Artifact Directory: ${artifactOutDir}`);
    console.log(`===============================================================================\n`);
  } finally {
    cdp.close();
    proc.kill();
    server.close();
  }
}

main().catch((err) => {
  console.error('APEX GIF generation failed:', err);
  process.exit(1);
});
