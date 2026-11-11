import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

interface PlayGifConfig {
  team: 'ARGON' | 'HYDRA';
  playId: string;
  playNumber: number;
  slug: string;
  shortTitle: string;
  personnel: string;
  featuredDefense: string;
}

const PLAY_CONFIGS: PlayGifConfig[] = [
  // ==========================================================================
  // GOOGLE ARGON 2027 PLAYBOOK (8 PLAYS)
  // ==========================================================================
  {
    team: 'ARGON',
    playId: 'ARGON_CHIRAL_JET_LEFT',
    playNumber: 1,
    slug: 'argon_play1_chiral_jet_left.gif',
    shortTitle: 'CHIRAL JET-LEFT OPTION CONTINUUM',
    personnel: '21 ARGON',
    featuredDefense: 'vs. 4-2-5 NICKEL OVER // COVER 3 SKY',
  },
  {
    team: 'ARGON',
    playId: 'ARGON_REACTOR_SWEEP_RIGHT',
    playNumber: 2,
    slug: 'argon_play2_reactor_sweep_right.gif',
    shortTitle: '11-ON-11 RIGHT REACTOR SWEEP',
    personnel: '22 ARGON',
    featuredDefense: 'vs. 3-4 BEAR TITE // QUARTERS MATCH',
  },
  {
    team: 'ARGON',
    playId: 'ARGON_NOBLE_KINETIC_RELAY',
    playNumber: 3,
    slug: 'argon_play3_noble_kinetic_relay.gif',
    shortTitle: 'NOBLE KINETIC RELAY (4.21 PITCH)',
    personnel: '12 ARGON',
    featuredDefense: 'vs. 4-1-6 DIME PALMS // QUARTERS MATCH',
  },
  {
    team: 'ARGON',
    playId: 'ARGON_DISPLACED_NODE_LASER',
    playNumber: 4,
    slug: 'argon_play4_displaced_node_laser.gif',
    shortTitle: 'DISPLACED LAUNCH-NODE LASER',
    personnel: '12 ARGON',
    featuredDefense: 'vs. 3-2-6 MUG // CROSS-DOG C0 BLITZ',
  },
  {
    team: 'ARGON',
    playId: 'ARGON_WILDCAT_TRIPLE_PITCH',
    playNumber: 5,
    slug: 'argon_play5_wildcat_triple_pitch.gif',
    shortTitle: '256-LB WILDCAT-TE TRIPLE PITCH',
    personnel: '22 WILDCAT',
    featuredDefense: 'vs. 3-4 BEAR TITE // 8-MAN FRONT',
  },
  {
    team: 'ARGON',
    playId: 'ARGON_2MIN_BOUNDARY_LASER',
    playNumber: 6,
    slug: 'argon_play6_2min_boundary_laser.gif',
    shortTitle: '2-MIN DIRECT SPRINT-OUT LASER',
    personnel: '12 ARGON',
    featuredDefense: 'vs. 4-1-6 DIME PALMS // QUARTERS MATCH',
  },
  {
    team: 'ARGON',
    playId: 'ARGON_4MIN_LEFT_MONOLITH',
    playNumber: 7,
    slug: 'argon_play7_4min_left_monolith.gif',
    shortTitle: '4-MIN CHIRAL LEFT MONOLITH SWEEP',
    personnel: '22 ARGON',
    featuredDefense: 'vs. 3-4 BEAR TITE // 8-MAN FRONT',
  },
  {
    team: 'ARGON',
    playId: 'ARGON_GOALLINE_CYCLOTRON',
    playNumber: 8,
    slug: 'argon_play8_goalline_cyclotron.gif',
    shortTitle: 'GOAL-LINE +4y PYLON CYCLOTRON',
    personnel: '22 ARGON',
    featuredDefense: 'vs. 6-2 GOAL-LINE PINCH // COVER 0',
  },

  // ==========================================================================
  // HYDRA VANGUARD 2027 PLAYBOOK (8 PLAYS)
  // ==========================================================================
  {
    team: 'HYDRA',
    playId: 'HYDRA_JET_DOUBLE_OPTION',
    playNumber: 1,
    slug: 'hydra_play1_jet_double_option.gif',
    shortTitle: 'WR JET SWEEP DOUBLE OPTION',
    personnel: '21 HYDRA',
    featuredDefense: 'vs. 4-2-5 NICKEL OVER // COVER 3 SKY',
  },
  {
    team: 'HYDRA',
    playId: 'HYDRA_HOOK_AND_LATERAL',
    playNumber: 2,
    slug: 'hydra_play2_hook_and_lateral.gif',
    shortTitle: 'HOOK & LATERAL CATCH-PITCH OPTION',
    personnel: '11 HYDRA',
    featuredDefense: 'vs. 4-1-6 DIME PALMS // QUARTERS MATCH',
  },
  {
    team: 'HYDRA',
    playId: 'HYDRA_PONY_SPLIT_BASH',
    playNumber: 3,
    slug: 'hydra_play3_pony_split_bash.gif',
    shortTitle: 'PONY SPLIT-ZONE BASH READ',
    personnel: '20 HYDRA',
    featuredDefense: 'vs. 3-4 BEAR TITE // QUARTERS MATCH',
  },
  {
    team: 'HYDRA',
    playId: 'HYDRA_BACKWARD_DOUBLE_PASS',
    playNumber: 4,
    slug: 'hydra_play4_backward_double_pass.gif',
    shortTitle: 'SHADOW POCKET BACKWARD PASS',
    personnel: '11 HYDRA',
    featuredDefense: 'vs. 3-2-6 MUG // CROSS-DOG C0 BLITZ',
  },
  {
    team: 'HYDRA',
    playId: 'HYDRA_6OL_ELIGIBLE_SEAM',
    playNumber: 5,
    slug: 'hydra_play5_6ol_eligible_seam.gif',
    shortTitle: '6-OL JUMBO REPORT-ELIGIBLE SEAM',
    personnel: '22 JUMBO',
    featuredDefense: 'vs. 4-3 OVER // COVER 1 ROBBER',
  },
  {
    team: 'HYDRA',
    playId: 'HYDRA_2MIN_SIDELINE_CHOICE',
    playNumber: 6,
    slug: 'hydra_play6_2min_sideline_choice.gif',
    shortTitle: '2-MIN NO-HUDDLE BOUNDARY CHOICE',
    personnel: '11 HYDRA',
    featuredDefense: 'vs. 4-1-6 DIME PALMS // QUARTERS MATCH',
  },
  {
    team: 'HYDRA',
    playId: 'HYDRA_4MIN_BULLDOZER_SWEEP',
    playNumber: 7,
    slug: 'hydra_play7_4min_bulldozer_sweep.gif',
    shortTitle: '4-MIN BULLDOZER CLOCK SWEEP',
    personnel: '22 HYDRA',
    featuredDefense: 'vs. 3-4 BEAR TITE // 8-MAN FRONT',
  },
  {
    team: 'HYDRA',
    playId: 'HYDRA_GOALLINE_PHILLY_SPECIAL',
    playNumber: 8,
    slug: 'hydra_play8_goalline_special.gif',
    shortTitle: 'GOAL-LINE +4y HYDRA SPECIAL',
    personnel: '21 HYDRA',
    featuredDefense: 'vs. 6-2 GOAL-LINE PINCH // COVER 0',
  },
];

const ARTIFACT_DIR = 'C:\\Users\\Ryan\\.gemini\\antigravity\\brain\\f8bdc538-a9a7-4bd6-9a14-a746fa2f2eaf';
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

  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'all22-gifs-cdp-'));
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
      '--window-size=1600,900',
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
  fps = 20,
  endPauseSec = 1.2
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
  const args = process.argv.slice(2);
  const targetFilter = args.find((a) => a === 'ARGON' || a === 'HYDRA');

  const configsToRun = targetFilter
    ? PLAY_CONFIGS.filter((c) => c.team === targetFilter)
    : PLAY_CONFIGS;

  console.log(`\n===============================================================================`);
  console.log(`ALL-22 CONTINUOUS GAME-THEORY SIMULATOR: PLAY GIF GENERATOR`);
  console.log(`Generating 20 Hz Animated GIFs for ${configsToRun.length} Plays (Argon & Hydra)...`);
  console.log(`===============================================================================\n`);

  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('dist/index.html missing — run npm run build first');
  }

  const argonOutDir = path.join(process.cwd(), 'docs', 'argon_gifs');
  const hydraOutDir = path.join(process.cwd(), 'docs', 'hydra_gifs');
  fs.mkdirSync(argonOutDir, { recursive: true });
  fs.mkdirSync(hydraOutDir, { recursive: true });

  const argonArtifactDir = path.join(ARTIFACT_DIR, 'argon_gifs');
  const hydraArtifactDir = path.join(ARTIFACT_DIR, 'hydra_gifs');
  fs.mkdirSync(argonArtifactDir, { recursive: true });
  fs.mkdirSync(hydraArtifactDir, { recursive: true });

  const server = await startDistServer(distDir, 5198);
  const { proc, wsUrl, tmpProfile } = await launchHeadlessChrome(9252);
  const cdp = new CDPClient();

  try {
    await cdp.connect(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 860,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5198/' });
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

    for (const cfg of configsToRun) {
      completed++;
      const isArgon = cfg.team === 'ARGON';
      const outDir = isArgon ? argonOutDir : hydraOutDir;
      const artDir = isArgon ? argonArtifactDir : hydraArtifactDir;
      const finalGifPath = path.join(outDir, cfg.slug);
      const artGifPath = path.join(artDir, cfg.slug);

      console.log(`[${completed}/${configsToRun.length}] Processing ${cfg.team} Play ${cfg.playNumber}: ${cfg.shortTitle}...`);

      const prepExpr = `(() => {
        const app = window.__all22App;
        const offSel = document.getElementById('off-team-select');
        if (offSel) {
          offSel.value = '${isArgon ? 'ARG' : 'HYD'}';
          offSel.dispatchEvent(new Event('change'));
        }
        app.autoMatchDefense = true;
        app.loadPlayPreset('${cfg.playId}');
        app.renderOpts.selectedAgentId = null;
        app.renderOpts.hoveredAgentId = null;
        return {
          totalTicks: app.snapshots.length,
          firstDownYards: app.renderOpts.firstDownYards || 10.0,
        };
      })()`;

      const prepRes = await cdp.send('Runtime.evaluate', { expression: prepExpr, returnByValue: true });
      const { totalTicks } = prepRes.result.value as { totalTicks: number };

      const framesTmpDir = path.join(tmpProfile, `frames_${cfg.playId}`);
      fs.mkdirSync(framesTmpDir, { recursive: true });

      const BATCH = 12;
      for (let start = 0; start < totalTicks; start += BATCH) {
        const end = Math.min(totalTicks, start + BATCH);
        const batchExpr = `(() => {
          const app = window.__all22App;
          const tc = document.getElementById('tactical-canvas');
          const snaps = app.snapshots;

          const W = 960;
          const H = 570;
          const TOP_H = 44;
          const BOT_H = 34;

          const expCanvas = document.createElement('canvas');
          expCanvas.width = W;
          expCanvas.height = H;
          const ctx = expCanvas.getContext('2d');

          const frames = [];

          for (let t = ${start}; t < ${end}; t++) {
            app.currentTick = t;
            app.drawCurrentFrame();
            const snap = snaps[t];

            // 1. Stadium background
            ctx.fillStyle = '#060810';
            ctx.fillRect(0, 0, W, H);

            // 2. Field Canvas scaled into main area
            ctx.drawImage(tc, 0, TOP_H, W, H - TOP_H - BOT_H);

            // 3. Top HUD Header Strip
            ctx.fillStyle = '#090d18';
            ctx.fillRect(0, 0, W, TOP_H);
            ctx.strokeStyle = '#222842';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, TOP_H);
            ctx.lineTo(W, TOP_H);
            ctx.stroke();

            // Brand Badge
            const isArg = '${cfg.team}' === 'ARGON';
            ctx.fillStyle = isArg ? 'rgba(168, 85, 247, 0.22)' : 'rgba(16, 185, 129, 0.20)';
            ctx.strokeStyle = isArg ? '#c084fc' : '#34d399';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(14, 9, 114, 25, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = isArg ? '#d8b4fe' : '#6ee7b7';
            ctx.font = 'bold 11px "Segoe UI", sans-serif';
            ctx.fillText(isArg ? 'GOOGLE ARGON' : 'HYDRA VANGUARD', 22, 25);

            // Play Title
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 14px "Segoe UI", sans-serif';
            ctx.fillText('PLAY ${cfg.playNumber}: ${cfg.shortTitle.replace(/'/g, "\\'")}', 138, 26);

            // Personnel Pill
            ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
            ctx.strokeStyle = '#22d3ee';
            ctx.beginPath();
            ctx.roundRect(W - 425, 9, 82, 25, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 11px "Cascadia Mono", monospace';
            ctx.fillText('${cfg.personnel}', W - 418, 25);

            // Defense Matchup
            ctx.fillStyle = '#111728';
            ctx.strokeStyle = '#38bdf8';
            ctx.beginPath();
            ctx.roundRect(W - 335, 9, 321, 25, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 11px "Cascadia Mono", monospace';
            ctx.fillText('${cfg.featuredDefense.replace(/'/g, "\\'")}', W - 327, 25);

            // 4. Bottom HUD Scrubber & Result Strip
            ctx.fillStyle = '#090d18';
            ctx.fillRect(0, H - BOT_H, W, BOT_H);
            ctx.strokeStyle = '#222842';
            ctx.beginPath();
            ctx.moveTo(0, H - BOT_H);
            ctx.lineTo(W, H - BOT_H);
            ctx.stroke();

            // Time & Tick Readout
            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 12.5px "Cascadia Mono", monospace';
            const tSec = snap.timeSec !== undefined ? snap.timeSec.toFixed(2) : (t * 0.05).toFixed(2);
            ctx.fillText(\`T = \${tSec}s (TICK \${String(t).padStart(2, '0')}/\${snaps.length - 1})\`, 14, H - 12);

            // Exotic Event Badge (Center)
            if (snap.exoticEvent) {
              ctx.fillStyle = '#fbbf24';
              ctx.font = 'bold 11.5px "Cascadia Mono", monospace';
              ctx.fillText(\`⚡ \${snap.exoticEvent}\`, 270, H - 12);
            }

            // Outcome & Gain Readout (Right)
            const ydsStr = snap.carrierTackledYards !== null && snap.carrierTackledYards !== undefined
              ? \` (\${snap.carrierTackledYards >= 0 ? '+' : ''}\${snap.carrierTackledYards.toFixed(1)}y)\`
              : '';
            const phaseText = snap.playOver && snap.terminationReason
              ? \`\${snap.phase} [\${snap.terminationReason}\${ydsStr}]\`
              : snap.phase;

            ctx.fillStyle = snap.playOver ? '#34d399' : '#94a3b8';
            ctx.font = 'bold 12.5px "Cascadia Mono", monospace';
            const phaseW = ctx.measureText(phaseText).width;
            ctx.fillText(phaseText, W - phaseW - 14, H - 12);

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

      // Encode with Python Pillow
      const pat = path.join(framesTmpDir, 'frame_*.png');
      await runPythonGifEncoder(pat, finalGifPath, 20, 1.4);
      fs.copyFileSync(finalGifPath, artGifPath);

      const szMb = (fs.statSync(finalGifPath).size / (1024 * 1024)).toFixed(2);
      console.log(`   -> Created ${cfg.slug} (${szMb} MB, ${totalTicks} frames)`);

      // Clean up temp frames for this play
      fs.rmSync(framesTmpDir, { recursive: true, force: true });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n===============================================================================`);
    console.log(`SUCCESS: All ${configsToRun.length} Play Simulation GIFs Generated in ${elapsed}s!`);
    console.log(`Outputs:`);
    console.log(`  - Argon GIFs:  ${argonOutDir}`);
    console.log(`  - Hydra GIFs:  ${hydraOutDir}`);
    console.log(`  - Artifacts:   ${path.join(ARTIFACT_DIR, 'argon_gifs')} & hydra_gifs`);
    console.log(`===============================================================================\n`);
  } finally {
    cdp.close();
    proc.kill();
    server.close();
  }
}

main().catch((err) => {
  console.error('Play GIF generation failed:', err);
  process.exit(1);
});
