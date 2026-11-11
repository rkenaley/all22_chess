import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

interface PlayCardConfig {
  cardIndex: number; // 4..11
  playNumber: number; // 1..8
  fileSlug: string;
  playId: string;
  shortTitle: string;
  subtitle: string;
  personnel: string;
  menuTags: string[];
  featuredDefenseLabel: string;
  legalBadge: string;
  branchA: { label: string; pct: number; detail: string; color: string };
  branchB: { label: string; pct: number; detail: string; color: string };
  explainer280: string; // Strictly <= 280 chars!
  tweetCopy280: string; // Ready-to-paste <= 280 char tweet text!
}

const ARTIFACT_DIR = 'C:\\Users\\Ryan\\.gemini\\antigravity\\brain\\5470698e-5a8f-4ced-9ee8-b85f6baec4e8';
const WORKSPACE_OUT_DIR = path.join(process.cwd(), 'docs', 'twitter_cards');

const PLAY_CARD_CONFIGS: PlayCardConfig[] = [
  {
    cardIndex: 4,
    playNumber: 1,
    fileSlug: 'card_04_play1_jet_double_option.png',
    playId: 'HYDRA_JET_DOUBLE_OPTION',
    shortTitle: 'WR JET SWEEP DOUBLE OPTION',
    subtitle: 'Converted-QB WR Jakobi Meyers • Eli Stowers (BLK 82) Edge Seal + Fields Weakside Boot Freeze',
    personnel: '21 HYDRA',
    menuTags: ['OPEN FIELD (0.6% NASH)', 'ANTI-C1 (+0.39 EPA)'],
    featuredDefenseLabel: 'vs. 4-2-5 NICKEL OVER // COVER 3 SKY',
    legalBadge: '7 ON LOS • -0.5y BACKWARD TOSS (0.9% FUM) • OL <= +0.85y',
    branchA: {
      label: 'WR OPTION PASS',
      pct: 75.3,
      detail: '75.3% (+10.2y avg)',
      color: '#3fb950',
    },
    branchB: {
      label: 'JET TUCK & SWEEP',
      pct: 24.7,
      detail: '24.7% (0.0y avg)',
      color: '#f59e0b',
    },
    explainer280:
      'Fields tosses backward (-0.5y, 0.9% fumble) to former college QB Meyers behind pulling C Brewer & 239lb TE/QB hybrid Eli Stowers (BLK 82) while Fields runs a weakside boot fake. Beats 4-3 C1 (+0.39 EPA, +0.12 vs Nash DC), while 3-4 Bear C4 counters the edge (-1.14 EPA).',
    tweetCopy280:
      '4/11 PLAY 1: WR Jet Sweep Double Option. Fields tosses (-0.5y, 0.9% fum) to former QB Jakobi Meyers behind pulling C Brewer & 239lb TE/QB hybrid Eli Stowers (BLK 82). Beats 4-3 C1 (+0.39 EPA, +0.12 vs Nash DC); countered by 3-4 Bear C4 (-1.14 EPA).',
  },
  {
    cardIndex: 5,
    playNumber: 2,
    fileSlug: 'card_05_play2_hook_and_lateral.png',
    playId: 'HYDRA_HOOK_AND_LATERAL',
    shortTitle: 'HOOK & LATERAL CATCH-PITCH OPTION',
    subtitle: 'Disciplined Gated Pitch: Meyers (+8.2y) -> 4.33 Shaheed (17.7% Nash Weight vs Quarters)',
    personnel: '11 HYDRA',
    menuTags: ['17.7% NASH MIX', 'VS QUARTERS (+0.59 EPA)', '3RD & 9 STICKS'],
    featuredDefenseLabel: 'vs. 4-1-6 DIME PALMS // QUARTERS MATCH',
    legalBadge: 'GATED PITCH (SEP >=3.25y) • 0.7% FUM (0.4% LOST) • BACKWARD (-1.4y)',
    branchA: {
      label: 'GATED PITCH (SHAHEED)',
      pct: 61.9,
      detail: '61.9% (+33.1y avg!)',
      color: '#06b6d4',
    },
    branchB: {
      label: 'HOOK KEEP (TRAFFIC GATE)',
      pct: 38.1,
      detail: '38.1% (+18.0y avg)',
      color: '#3fb950',
    },
    explainer280:
      'Forcing downfield pitches in traffic is ruinous (13.4% fumble/pitch, -4.35 EPA turnover). Gating Meyers to pitch ONLY when DBs collapse AND trailing 4.33 Shaheed has >=3.25y separation cuts fumbles to 0.7% (0.4% lost) and destroys Dime Quarters (+0.59 EPA, +0.153 vs Nash DC).',
    tweetCopy280:
      '5/11 PLAY 2: Disciplined Hook & Lateral (17.7% Nash Mix). Reckless downfield laterals fumble 13.4%/pitch (-4.35 EPA). Gating Meyers to pitch ONLY when Shaheed has >=3.25y separation cuts fumbles to 0.7% (0.4% lost) & crushes Dime Quarters (+0.59 EPA)!',
  },
  {
    cardIndex: 6,
    playNumber: 3,
    fileSlug: 'card_06_play3_pony_split_bash.png',
    playId: 'HYDRA_PONY_SPLIT_BASH',
    shortTitle: '2-QB SPLIT-PONY PIN-PULL & OPTION',
    subtitle: 'Eagles Hybrid Backfield • Stowers (BLK 82) Split-Flow Seal, Fields Boot Fake, Payton Option',
    personnel: '21 HYDRA',
    menuTags: ['ANTI-BEAR (+0.35 EPA)', '+0.124 ALL-FRONT EPA'],
    featuredDefenseLabel: 'vs. 3-4 BEAR TITE // QUARTERS MATCH',
    legalBadge: 'NO QB BLOCKING DE • STOWERS (BLK 82) SEAL • 2.2% FUM (0.2% LOST)',
    branchA: {
      label: 'QB2 PAYTON OPTION PASS',
      pct: 89.8,
      detail: '89.8% (+9.3y avg)',
      color: '#3fb950',
    },
    branchB: {
      label: 'QB2 PIN-PULL SWEEP KEEP',
      pct: 10.2,
      detail: '10.2% (+9.3y avg)',
      color: '#f59e0b',
    },
    explainer280:
      'Asking a QB to block a DE 1v1 is suicidal (-0.41 EPA, 62% stuff). Instead, 239lb TE/QB hybrid Eli Stowers (BLK 82) executes the split-flow edge block while Fields runs an unblocked weakside option fake and 232lb lefty QB2 Cole Payton sweeps/throws (+9.27y, +0.124 All-Front EPA).',
    tweetCopy280:
      '6/11 PLAY 3: 2-QB Split-Pony Option (Cole Payton + Eli Stowers). Asking a QB to block a DE 1v1 fails (-0.41 EPA). Instead, 239lb TE/QB Eli Stowers (BLK 82) seals the edge, Fields fakes weakside boot & 232lb QB2 Cole Payton sweeps/throws (+9.27y, +0.35 EPA vs Bear)!',
  },
  {
    cardIndex: 7,
    playNumber: 4,
    fileSlug: 'card_07_play4_backward_double_pass.png',
    playId: 'HYDRA_BACKWARD_DOUBLE_PASS',
    shortTitle: 'BACKWARD SCREEN DOUBLE PASS',
    subtitle: '3rd & Long Anti-Mug Specialist • High Lateral Risk (6.7% Muff) vs 0.0% Cover-0 Sacks',
    personnel: '11 HYDRA',
    menuTags: ['3RD & 9 BLITZ SPECIALIST', '0% OPEN-FIELD NASH'],
    featuredDefenseLabel: 'vs. 3-2-6 MUG // CROSS-DOG COVER-0 BLITZ',
    legalBadge: 'WIDE -5.4y BACKWARD PASS (6.7% MUFF / 2.0% LOST) • 0.0% SACKS',
    branchA: {
      label: 'DOUBLE PASS DOWNFIELD',
      pct: 86.2,
      detail: '86.2% (+8.3y avg)',
      color: '#3fb950',
    },
    branchB: {
      label: 'SCREEN TUCK / MUFF RISK',
      pct: 13.8,
      detail: '13.8% (6.7% Muff / 2.0% TO)',
      color: '#f87171',
    },
    explainer280:
      'Wide -5.4y backward passes carry real live-ball danger: 6.7% muff rate (2.0% lost fumble at -4.85 EPA, 4.7% recovered at -9.6y), giving it 0% open-field Nash weight (-0.18 EPA). Kept strictly as a 3rd & 9 anti-Mug-Cover-0 specialist (+0.12 EPA vs Cross-Dog, 0.0% sacks).',
    tweetCopy280:
      '7/11 PLAY 4: Backward Screen Double Pass (Honest Fumble Audit). Wide -5.4y backward passes carry a 6.7% live-ball muff rate (2.0% lost at -4.85 EPA), so open-field Nash weight is 0%. Reserved strictly for 3rd & 9 Mug Cover-0 blitzes (+0.12 EPA, 0.0% sacks)!',
  },
  {
    cardIndex: 8,
    playNumber: 5,
    fileSlug: 'card_08_play5_6ol_eligible_seam.png',
    playId: 'HYDRA_6OL_ELIGIBLE_SEAM',
    shortTitle: '6th-OL ELIGIBLE SEAM LEAK',
    subtitle: "6'7\" 275-lb Washington (BLK 91) + 239-lb Stowers (BLK 82) • Play-Action Shot vs Creeper C2",
    personnel: '22 HYDRA',
    menuTags: ['ANTI-SIM C2 (+0.17 EPA)', 'HEAVY PA SHOT'],
    featuredDefenseLabel: 'vs. 4-2-5 NICKEL // CREEPER SIM TAMPA-2',
    legalBadge: '7 ON LOS • WASHINGTON (BLK 91) + STOWERS (BLK 82) • 0.0% FUM',
    branchA: {
      label: 'VS CREEPER SIM C2 (TARGET)',
      pct: 68.0,
      detail: '+13.82y avg (+0.171 EPA)',
      color: '#38bdf8',
    },
    branchB: {
      label: 'VS MUG C0 BLITZ (COUNTER)',
      pct: 32.0,
      detail: '-2.59y (-1.66 EPA Sack Risk)',
      color: '#f87171',
    },
    explainer280:
      '275lb TE Washington (BLK 91) & 239lb TE/QB Stowers (BLK 82) handle heavy protection while QB2 Payton runs a weakside split-flow fake. Punishes Sim-Pressure Tampa-2 (+13.82y, +0.17 EPA) when LBs bite on run action, but gets sacked by 6-man Mug Cover-0 (-1.66 EPA).',
    tweetCopy280:
      '8/11 PLAY 5: 6th-OL Eligible Seam Leak. 275lb Washington (BLK 91) & 239lb Stowers (BLK 82) protect while Payton fakes weakside split-flow. Rips Sim-Pressure Tampa-2 (+13.82y, +0.17 EPA), but vulnerable to 6-man Mug Cover-0 (-1.66 EPA)—hence a tendency breaker!',
  },
  {
    cardIndex: 9,
    playNumber: 6,
    fileSlug: 'card_09_play6_2min_sideline_choice.png',
    playId: 'HYDRA_2MIN_SIDELINE_CHOICE',
    shortTitle: '2-MIN NO-SUB EMPTY SIDELINE CHOICE',
    subtitle: 'Zero-Sub Chameleon Shift to 5-Wide • 5.1% Open-Field Nash Weight (+0.144 EPA vs Nash DC)',
    personnel: '20 EMPTY',
    menuTags: ['2-MINUTE DRILL', '5.1% NASH MIX', 'VS C3/C2 (+0.45 EPA)'],
    featuredDefenseLabel: 'vs. 4-2-5 NICKEL OVER // COVER 3 SKY',
    legalBadge: 'ZERO SUBSTITUTIONS • 0.0% FUMBLE • OOB CLOCK STOP (|X|>=25.85y)',
    branchA: {
      label: '2-MIN DRILL TD WIN RATE',
      pct: 46.3,
      detail: '46.3% TD Win (3.32 OOB/drv)',
      color: '#06b6d4',
    },
    branchB: {
      label: 'SACK AVOIDANCE RATE',
      pct: 99.5,
      detail: 'Only 0.5% Sacks (1.58 yd/s)',
      color: '#3fb950',
    },
    explainer280:
      'Without substituting, heavy Hydra flexes 4.56-spd Payton & 90-SPD TE/QB Stowers into 5-wide empty—trapping base LBs on the field. Punishes Cover-3 (+0.45 EPA) & Sim C2 (+0.43 EPA) with +0.144 EPA vs the Nash DC, 3.32 OOB clock stops/drive, and 0.5% sacks.',
    tweetCopy280:
      '9/11 PLAY 6: 2-Min No-Sub Empty Sideline Choice (5.1% Nash Mix). Flexes QB2 Cole Payton & 90-SPD TE/QB Eli Stowers into 5-wide empty without subbing. Punishes Cover-3 (+0.45 EPA) & Sim C2 (+0.43 EPA), logging 3.32 OOB stops/drv & 0.5% sacks!',
  },
  {
    cardIndex: 10,
    playNumber: 7,
    fileSlug: 'card_10_play7_4min_bulldozer_sweep.png',
    playId: 'HYDRA_4MIN_BULLDOZER_SWEEP',
    shortTitle: '4-MIN 11-ON-11 BULLDOZER SWEEP',
    subtitle: 'Direct Snap to 228-lb Fields • Stowers (BLK 82) Lead + Becton/Brewer + Payton Option Freeze',
    personnel: '22 HYDRA',
    menuTags: ['76.6% NASH ANCHOR', 'POSITIVE EPA VS ALL 10 DEFENSES!'],
    featuredDefenseLabel: 'vs. 3-4 BEAR TITE // 8-MAN LOADED RUN BOX',
    legalBadge: 'STOWERS (BLK 82) LEAD • PAYTON FREEZES DE • 0.0% FUMBLE',
    branchA: {
      label: 'POSITIVE / UNSTUFFED RUNS',
      pct: 96.7,
      detail: '96.7% Unstuffed (+9.12y, +0.39 EPA)',
      color: '#3fb950',
    },
    branchB: {
      label: 'STUFF RATE (<= 0.5y)',
      pct: 3.3,
      detail: 'Only 3.3% Stuffed (88.5% 4-Min Seal)',
      color: '#f59e0b',
    },
    explainer280:
      'Dominates the Nash Equilibrium (76.6% weight) with POSITIVE EPA against all 10 defenses (+0.391 All-Front EPA). Direct snap to Fields puts 239lb TE/QB Stowers (BLK 82), 363lb Becton, 275lb Washington & C Brewer at the POA while Payton freezes the weakside DE unblocked.',
    tweetCopy280:
      '10/11 PLAY 7: 11-on-11 Bulldozer Sweep (76.6% Nash Anchor). Direct snap to 228lb Fields puts 239lb TE/QB Eli Stowers (BLK 82), 363lb Becton, 275lb Washington & C Brewer at the POA while Cole Payton freezes the backside DE: POSITIVE EPA vs all 10 NFL defenses!',
  },
  {
    cardIndex: 11,
    playNumber: 8,
    fileSlug: 'card_11_play8_goalline_special.png',
    playId: 'HYDRA_GOALLINE_PHILLY_SPECIAL',
    shortTitle: 'GOAL-LINE +4y "PHILLY HYDRA SPECIAL"',
    subtitle: "232-lb Lefty Cole Payton Sweep/Pass • Stowers (BLK 82) Seal + 6'7\" Washington End-Zone Pop",
    personnel: '22 GOAL',
    menuTags: ['GOAL LINE (+4.0y)', '74.8% 1ST-SNAP TD', '94.7% 4-DN TD'],
    featuredDefenseLabel: 'vs. 6-2 HEAVY JUMBO // GOAL-LINE PINCH & JAM',
    legalBadge: '7 ON LOS • BACKWARD TOSS (2.0% FUM / 0.7% LOST) • OL <= +0.85y',
    branchA: {
      label: 'END-ZONE POP / CROSS PASS',
      pct: 97.3,
      detail: '97.3% Trigger (74.8% 1st-Snap TD!)',
      color: '#06b6d4',
    },
    branchB: {
      label: '4-DOWN TD CONVERSION',
      pct: 94.7,
      detail: '94.7% 4-Down TD (6.59 Exp Pts)',
      color: '#3fb950',
    },
    explainer280:
      'Inside the +4y, Fields tosses right (-0.5y, 0.7% lost fumble) to 232lb Eagles QB2 Cole Payton behind pulling RG Puni & sealing TE/QB Eli Stowers (BLK 82) while Fields boot-fakes left. 6\'7" Washington chips 0.48s & pops into the end zone: 74.8% 1st-snap TD & 94.7% 4-dn TD!',
    tweetCopy280:
      '11/11 PLAY 8: Goal-Line +4y "Philly Hydra Special". Fields tosses to 232lb Eagles QB2 Cole Payton behind RG Puni & sealing TE/QB Eli Stowers (BLK 82). Edge crashes? Payton lofts a pop pass to 6\'7" Washington: 74.8% 1st-snap TD (2-Pt eq.) & 94.7% 4-down TD!',
  },
];

// Validate all 280-char constraints upfront!
for (const cfg of PLAY_CARD_CONFIGS) {
  if (cfg.explainer280.length > 280) {
    throw new Error(`${cfg.playId} explainer exceeds 280 chars (${cfg.explainer280.length})`);
  }
  if (cfg.tweetCopy280.length > 280) {
    throw new Error(`${cfg.playId} tweetCopy exceeds 280 chars (${cfg.tweetCopy280.length})`);
  }
}

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
    } catch {
      // ignore
    }
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

  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'hydra-cdp-'));
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
      '--window-size=1600,960',
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
    } catch {
      // wait for startup
    }
  }
  if (!pageWsUrl) {
    proc.kill();
    throw new Error('Timed out waiting for Chrome DevTools Protocol WebSocket');
  }
  return { proc, wsUrl: pageWsUrl, tmpProfile };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================================
// HTML TEMPLATES FOR ALL 11 SELF-CONTAINED 1600x900 TWITTER/X CARDS
// ============================================================================
const SHARED_CARD_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1600px;
    height: 900px;
    overflow: hidden;
    background: #06090e;
    color: #f0f6fc;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .card-shell {
    position: relative;
    width: 1600px;
    height: 900px;
    padding: 28px 34px 24px 34px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background:
      radial-gradient(circle at 14% 12%, rgba(56, 189, 248, 0.11), transparent 42%),
      radial-gradient(circle at 88% 85%, rgba(63, 185, 80, 0.09), transparent 40%),
      linear-gradient(180deg, #070b11 0%, #090e16 100%);
    border: 2px solid #1c2736;
  }
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }
  .z1 { position: relative; z-index: 1; }
  .mono { font-family: 'Cascadia Mono', 'Consolas', 'Courier New', monospace; }
  .top-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid #1e293b;
  }
  .eyebrow-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12.5px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .pill-cyan { background: rgba(6, 182, 212, 0.18); color: #22d3ee; border: 1px solid rgba(34, 211, 238, 0.45); }
  .pill-blue { background: rgba(47, 129, 247, 0.20); color: #79c0ff; border: 1px solid rgba(56, 139, 253, 0.45); }
  .pill-green { background: rgba(63, 185, 80, 0.18); color: #56d364; border: 1px solid rgba(63, 185, 80, 0.45); }
  .pill-amber { background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.45); }
  .pill-purple { background: rgba(163, 113, 247, 0.18); color: #d2a8ff; border: 1px solid rgba(163, 113, 247, 0.45); }
  .thread-badge {
    padding: 6px 13px;
    background: #111927;
    border: 1px solid #304156;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 800;
    color: #93c5fd;
    letter-spacing: 0.07em;
    white-space: nowrap;
  }
  .footer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 10px;
    border-top: 1px solid #1b2534;
    font-size: 13px;
    color: #8b9bb0;
  }
`;

function buildPhilosophyCardHtml(results: any): string {
  const benchmarks = results.fullGameBenchmarks as any[];
  const drills = results.situationalDrills;

  const orderedBench = [
    benchmarks[0], // Hydra
    benchmarks[2], // Shanahan
    benchmarks[1], // Conv 11
    benchmarks[3], // Supermax
  ];

  const nashMap: Record<string, number> = {
    '2027 Hydra Vanguard ($85.5M Moneyball)': results.nashEquilibrium.hydraNashEpa,
    'Shanahan/McVay 12-Pers Play-Action ($146.0M Cap)': results.nashEquilibrium.baselinesNashEpa.SHANAHAN_12_PA,
    'Conventional 11-Pers Dropback Spread ($138.5M Cap)': results.nashEquilibrium.baselinesNashEpa.CONV_11_SPREAD,
    'Top-Heavy Supermax Stars / Cap-Starved OL ($172.0M Cap)': results.nashEquilibrium.baselinesNashEpa.SUPERMAX_STARS,
  };

  const benchRows = orderedBench
    .map((b, idx) => {
      const isHydra = idx === 0;
      const barPct = Math.min(100, (b.ppgStandardDc / 38.0) * 100);
      const nash = nashMap[b.philosophyName] ?? 0;
      const netSign = b.projectedTeamNetDiffPerGame >= 0 ? '+' : '';
      return `
        <div style="padding:10px 13px; border-radius:8px; background:${isHydra ? 'rgba(6,182,212,0.13)' : '#0d141f'}; border:1px solid ${isHydra ? '#22d3ee' : '#1f2b3d'}; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:15.5px; font-weight:${isHydra ? '800' : '700'}; color:${isHydra ? '#f0f6fc' : '#c9d4e2'};">
              ${isHydra ? '★ ' : ''}${escapeHtml(b.philosophyName)}
            </span>
            <div class="mono" style="display:flex; gap:12px; font-size:13.5px; font-weight:700;">
              <span style="color:${nash >= 0 ? '#56d364' : '#f87171'};">Nash EPA: ${nash >= 0 ? '+' : ''}${nash.toFixed(3)}</span>
              <span style="color:${b.projectedTeamNetDiffPerGame >= 0 ? '#22d3ee' : '#f87171'};">Team Net: ${netSign}${b.projectedTeamNetDiffPerGame.toFixed(2)}/g</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="flex:1; height:14px; background:#070a0f; border-radius:4px; overflow:hidden; border:1px solid #1d2838;">
              <div style="width:${barPct.toFixed(1)}%; height:100%; background:${isHydra ? 'linear-gradient(90deg, #06b6d4, #3fb950)' : '#3b4c63'};"></div>
            </div>
            <span class="mono" style="font-size:18px; font-weight:800; color:${isHydra ? '#56d364' : '#cbd5e1'}; min-width:105px; text-align:right;">
              ${b.ppgStandardDc.toFixed(2)} PPG
            </span>
          </div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${SHARED_CARD_CSS}</style></head><body>
    <div class="card-shell">
      <div class="grid-bg"></div>
      <div class="top-header z1">
        <div>
          <div class="eyebrow-row">
            <span class="pill pill-cyan">2027 NFL OFFENSIVE VANGUARD</span>
            <span class="pill pill-green">$85.5M MONEYBALL CAP (COLE PAYTON + ELI STOWERS)</span>
            <span class="pill pill-amber">REALISTIC LATERAL FUMBLES &amp; QB/TE BLOCK PHYSICS</span>
          </div>
          <h1 style="font-size:37px; font-weight:900; letter-spacing:-0.02em; color:#ffffff;">
            THE 2027 "HYDRA" OFFENSE IN A NUTSHELL
          </h1>
          <p style="font-size:17px; color:#9fb0c3; margin-top:3px;">
            "22-Hydra / Philly Hybrid Chameleon" — 5 Simultaneous Passers, 239-lb TE/QB Lead Blocking &amp; Non-Cherry-Picked Nash Dominance
          </p>
        </div>
        <div class="thread-badge mono">THREAD 01 / 11</div>
      </div>

      <!-- 3 CORE PILLARS -->
      <div class="z1" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-top:2px;">
        <div style="background:#0d141f; border:1px solid #243449; border-top:3px solid #22d3ee; border-radius:9px; padding:15px 17px;">
          <div class="mono" style="font-size:13px; font-weight:800; color:#22d3ee; margin-bottom:5px;">PILLAR 01 // 5-NODE PASSING &amp; GATED PITCHES</div>
          <div style="font-size:19.5px; font-weight:800; color:#ffffff; margin-bottom:6px;">5 Passers + Disciplined Laterals</div>
          <p style="font-size:15px; line-height:1.42; color:#b3c2d4;">
            <strong>Fields + Cole Payton + Eli Stowers + Meyers + Jennings</strong> (all 79–85 Throw). Downfield pitches gate on <code>&gt;=3.25y</code> separation to avoid ruinous <code>-4.35 EPA</code> fumbles (0.4% lost).
          </p>
        </div>
        <div style="background:#0d141f; border:1px solid #243449; border-top:3px solid #3fb950; border-radius:9px; padding:15px 17px;">
          <div class="mono" style="font-size:13px; font-weight:800; color:#56d364; margin-bottom:5px;">PILLAR 02 // PHILLY HYBRID BLOCKING MATH</div>
          <div style="font-size:19.5px; font-weight:800; color:#ffffff; margin-bottom:6px;">No QB Blocking DEs: Stowers + Washington</div>
          <p style="font-size:15px; line-height:1.42; color:#b3c2d4;">
            QBs blocking DEs 1v1 is suicidal (<code>-0.41 EPA</code>). Instead, <strong>239lb TE/QB Eli Stowers (BLK 82) &amp; 275lb TE Washington (BLK 91)</strong> lead-block while Fields/Payton freeze DEs via option fakes.
          </p>
        </div>
        <div style="background:#0d141f; border:1px solid #243449; border-top:3px solid #f59e0b; border-radius:9px; padding:15px 17px;">
          <div class="mono" style="font-size:13px; font-weight:800; color:#fbbf24; margin-bottom:5px;">PILLAR 03 // ROOKIE-SCALE CAP ARBITRAGE</div>
          <div style="font-size:19.5px; font-weight:800; color:#ffffff; margin-bottom:6px;">$85.5M Active 11 (+$60.5M Saved)</div>
          <p style="font-size:15px; line-height:1.42; color:#b3c2d4;">
            Eagles 2026 rookies <strong>Cole Payton ($1.1M) &amp; Eli Stowers ($1.9M)</strong> cut active cap to $85.5M—delivering <strong>3.92 PPG/$10M</strong> and a <strong>+14.92 pts/g</strong> team net differential.
          </p>
        </div>
      </div>

      <!-- BOTTOM EMPIRICAL BENCHMARKS: PPG + 4 SITUATIONAL MENUS -->
      <div class="z1" style="display:grid; grid-template-columns: 1.18fr 0.82fr; gap:18px; align-items:stretch;">
        <div style="background:#0a0f18; border:1px solid #1e2b3c; border-radius:10px; padding:15px 18px; display:flex; flex-direction:column; justify-content:space-between;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="mono" style="font-size:13.5px; font-weight:800; color:#79c0ff;">FULL-SEASON PPG &amp; ADVERSARIAL NASH BENCHMARK (44,000 DRIVES)</span>
            <span class="mono" style="font-size:12.5px; color:#8b9bb0;">N=1,000 NFL GAMES / SCHEME</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${benchRows}
          </div>
        </div>

        <div style="background:#0a0f18; border:1px solid #1e2b3c; border-radius:10px; padding:15px 18px; display:flex; flex-direction:column; justify-content:space-between;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="mono" style="font-size:13.5px; font-weight:800; color:#fbbf24;">4-FOR-4 SITUATIONAL MENU SWEEP</span>
            <span class="mono" style="font-size:12.5px; color:#8b9bb0;">N=1,000 TRIALS EACH</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; flex:1;">
            <div style="background:#0e1623; border:1px solid #233246; border-radius:8px; padding:12px;">
              <div class="mono" style="font-size:12px; font-weight:800; color:#22d3ee;">2-MINUTE DRILL (NO-SUB)</div>
              <div class="mono" style="font-size:30px; font-weight:900; color:#ffffff; margin:4px 0;">${drills.twoMinute.hydra.tdWinPct}%</div>
              <div style="font-size:13.5px; color:#9fb0c3;">TD Win (1.58 yd/s vs 1.05)<br/><strong style="color:#56d364;">3.32 OOB/drv • 0.5% Sack</strong></div>
            </div>
            <div style="background:#0e1623; border:1px solid #233246; border-radius:8px; padding:12px;">
              <div class="mono" style="font-size:12px; font-weight:800; color:#56d364;">4-MINUTE DRILL (SEAL)</div>
              <div class="mono" style="font-size:30px; font-weight:900; color:#ffffff; margin:4px 0;">${drills.fourMinute.hydra.gameSealPct}%</div>
              <div style="font-size:13.5px; color:#9fb0c3;">Seal vs 52.0% Shanahan<br/><strong style="color:#56d364;">218.0s Bled • 3.17 1st Dns</strong></div>
            </div>
            <div style="background:#0e1623; border:1px solid #233246; border-radius:8px; padding:12px;">
              <div class="mono" style="font-size:12px; font-weight:800; color:#fbbf24;">GOAL LINE (+4.0y / 2-PT)</div>
              <div class="mono" style="font-size:30px; font-weight:900; color:#ffffff; margin:4px 0;">${drills.goalLine.hydra.fourDownTdPct}%</div>
              <div style="font-size:13.5px; color:#9fb0c3;">4-Dn TD vs 59.0% Shanahan<br/><strong style="color:#22d3ee;">${drills.goalLine.hydra.singleSnapTdPct}% 1st-Snap (2-Pt Eq.)</strong></div>
            </div>
            <div style="background:#0e1623; border:1px solid #233246; border-radius:8px; padding:12px;">
              <div class="mono" style="font-size:12px; font-weight:800; color:#d2a8ff;">3RD &amp; 9 "STICKS TRAP"</div>
              <div class="mono" style="font-size:30px; font-weight:900; color:#ffffff; margin:4px 0;">${drills.thirdAndNine.hydra.conversionPct}%</div>
              <div style="font-size:13.5px; color:#9fb0c3;">Conv vs 34.2% Dropback<br/><strong style="color:#56d364;">+0.099 EPA • 0.0% Sacks</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar z1 mono">
        <span>ALL-22 CHESS // 20Hz CONTINUOUS KINEMATIC ENGINE &amp; REGRET-MATCHING NASH SOLVER</span>
        <span style="color:#56d364;">AUDITED: 4,000 SNAPS • 100.0% 7-ON-LOS • 100.0% 1-YD OL BUFFER • REALISTIC LATERAL FUMBLES</span>
      </div>
    </div>
  </body></html>`;
}

function buildSimulatorCardHtml(fullWorkstationBase64: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${SHARED_CARD_CSS}</style></head><body>
    <div class="card-shell">
      <div class="grid-bg"></div>
      <div class="top-header z1">
        <div>
          <div class="eyebrow-row">
            <span class="pill pill-blue">SIMULATION ENGINE ARCHITECTURE</span>
            <span class="pill pill-cyan">20 Hz EXPLICIT PHYSICS (dt = 50ms)</span>
            <span class="pill pill-purple">ANTI-CHERRY-PICKING NASH LAB</span>
          </div>
          <h1 style="font-size:35px; font-weight:900; letter-spacing:-0.02em; color:#ffffff;">
            HOW WE TESTED IT: ALL-22 20Hz KINEMATIC SIMULATOR
          </h1>
          <p style="font-size:16.5px; color:#9fb0c3; margin-top:3px;">
            Positional Blocking Mismatch Physics, Live-Ball Lateral Fumbles (-4.35 to -4.85 EPA) &amp; 8x10 Zero-Sum Nash Solver
          </p>
        </div>
        <div class="thread-badge mono">THREAD 02 / 11</div>
      </div>

      <div class="z1" style="display:grid; grid-template-columns: 1.12fr 0.88fr; gap:20px; align-items:stretch; flex:1; min-height:0; margin: 12px 0;">
        <!-- LEFT: LIVE WORKSTATION SCREENSHOT -->
        <div style="background:#0a0f18; border:1px solid #26364b; border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:8px; min-height:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0 4px;">
            <span class="mono" style="font-size:12.5px; font-weight:800; color:#22d3ee;">● LIVE WORKSTATION CAPTURE // MONTE CARLO N=100 FAN &amp; 20Hz HUD</span>
            <span class="mono" style="font-size:12px; color:#8b9bb0;">3-DOCK ALL-22 TACTICAL UI</span>
          </div>
          <div style="flex:1; min-height:0; position:relative; border-radius:7px; overflow:hidden; border:1px solid #1e2a3a; background:#080a0d;">
            <img src="data:image/png;base64,${fullWorkstationBase64}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; display:block;" />
          </div>
        </div>

        <!-- RIGHT: 4 TECHNICAL MODULES + BENCHMARK SCALE -->
        <div style="display:flex; flex-direction:column; justify-content:space-between; gap:11px;">
          <div style="background:#0d141f; border:1px solid #223246; border-left:4px solid #38bdf8; border-radius:8px; padding:13px 16px;">
            <div class="mono" style="font-size:12.5px; font-weight:800; color:#38bdf8;">01 // POSITIONAL BLOCKING MISMATCH PHYSICS (QB vs TE/OL)</div>
            <p style="font-size:15px; line-height:1.4; color:#cbd5e1; margin-top:4px;">
              Separates runner leg-drive from <code>blockRating</code>. Asking a QB (<code>BLK 48</code>) to block a DE 1v1 incurs a <strong>-42 rating penalty &amp; 0.16s blow-by</strong> (-0.41 EPA, 62.2% stuff), whereas 239lb TE/QB hybrid <strong>Eli Stowers (BLK 82)</strong> anchors at +0.36 EPA.
            </p>
          </div>

          <div style="background:#0d141f; border:1px solid #223246; border-left:4px solid #3fb950; border-radius:8px; padding:13px 16px;">
            <div class="mono" style="font-size:12.5px; font-weight:800; color:#56d364;">02 // LIVE-BALL LATERAL FUMBLE &amp; NEGATIVE EPA SPIKES</div>
            <p style="font-size:15px; line-height:1.4; color:#cbd5e1; margin-top:4px;">
              Every dropped backward toss or downfield lateral is a live free ball: <strong>-4.35 to -4.85 EPA on defensive recovery</strong> and <strong>-1.45 to -2.55 EPA on offensive recovery</strong>. Reckless traffic pitches fumble 13.4%/pitch vs 0.7% when gated.
            </p>
          </div>

          <div style="background:#0d141f; border:1px solid #223246; border-left:4px solid #f59e0b; border-radius:8px; padding:13px 16px;">
            <div class="mono" style="font-size:12.5px; font-weight:800; color:#fbbf24;">03 // 2026 NFL MOTION LEGALITY (NO CFL FORWARD START)</div>
            <p style="font-size:15px; line-height:1.4; color:#cbd5e1; margin-top:4px;">
              Enforces 2026 Rule 7-4-7 (<strong>vy &lt;= 0</strong> parallel/backward motion at the snap; "running start" screens plant at 1.45G after snap), <strong>7+ on LOS</strong>, and <strong>&lt;= 0.85y OL buffer</strong> on option passes.
            </p>
          </div>

          <div style="background:#0d141f; border:1px solid #223246; border-left:4px solid #a371f7; border-radius:8px; padding:13px 16px;">
            <div class="mono" style="font-size:12.5px; font-weight:800; color:#d2a8ff;">04 // ZERO-CHERRY-PICKING 8x10 NASH EQUILIBRIUM AUDIT</div>
            <p style="font-size:15px; line-height:1.4; color:#cbd5e1; margin-top:4px;">
              Every play is evaluated across all <strong>10 modern NFL defenses</strong> (450 snaps/play) + a <strong>12,000-iter Regret-Matching Nash DC</strong>, reporting both Best Matchup and Worst DC Counter.
            </p>
          </div>

          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
            <div style="background:#090e16; border:1px solid #1f2d3f; border-radius:7px; padding:9px; text-align:center;">
              <div class="mono" style="font-size:21px; font-weight:900; color:#22d3ee;">44,000</div>
              <div class="mono" style="font-size:11px; color:#8b9bb0;">DRIVES SIMMED</div>
            </div>
            <div style="background:#090e16; border:1px solid #1f2d3f; border-radius:7px; padding:9px; text-align:center;">
              <div class="mono" style="font-size:21px; font-weight:900; color:#56d364;">+0.153</div>
              <div class="mono" style="font-size:11px; color:#8b9bb0;">NASH MINIMAX EPA</div>
            </div>
            <div style="background:#090e16; border:1px solid #1f2d3f; border-radius:7px; padding:9px; text-align:center;">
              <div class="mono" style="font-size:21px; font-weight:900; color:#fbbf24;">+0.771</div>
              <div class="mono" style="font-size:11px; color:#8b9bb0;">TE vs QB BLK EPA</div>
            </div>
            <div style="background:#090e16; border:1px solid #1f2d3f; border-radius:7px; padding:9px; text-align:center;">
              <div class="mono" style="font-size:21px; font-weight:900; color:#d2a8ff;">8 x 10</div>
              <div class="mono" style="font-size:11px; color:#8b9bb0;">PAYOFF MATRIX</div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar z1 mono">
        <span>ALL-22 CHESS WORKSTATION // STOCHASTIC MONTE CARLO + CONTINUOUS KINEMATICS</span>
        <span style="color:#79c0ff;">EVERY HYDRA PLAY AUDITED FOR BOTH BEST MATCHUP &amp; WORST DEFENSIVE COUNTER</span>
      </div>
    </div>
  </body></html>`;
}

function buildRosterSkillsCardHtml(results: any): string {
  const players = results.rosterPlayers as any[];

  const shortHookMap: Record<string, string> = {
    'Justin Fields': '4.44 Power Runner + Deep Shot Trigger (BLK 46: Never Blocks DEs)',
    'Cole Payton': 'Eagles 5th-Rd Lefty 232lb Pony QB2 (SPD 89, ARM 82, Option Freeze)',
    'Jakobi Meyers': 'Converted NC State QB: Option-Pass & Gated Hook-Lateral Trigger',
    'Jauan Jennings': 'Heavy-Slot Enforcer (BLK 76, PWR 81) + Former QB (SB LVIII TD Pass)',
    'Rashid Shaheed': '4.33 Lid-Lifter (96 SPD) & +33.1y Hook-and-Lateral Trailer',
    'Darnell Washington': '6\'7" 275lb Eligible 6th OT (BLK 91, PWR 90) & Goal-Line Pop Threat',
    'Eli Stowers': 'Eagles 2nd-Rd 239lb TE/QB Hybrid (BLK 82 Lead Blocker + ARM 79, SPD 90)',
    'Bernhard Raimann': 'Converted-TE Blindside Tackle (BLK 87): Screen & Sweep Agility',
    'Mekhi Becton': '363lb Tackle-to-Guard Mauler (BLK 93, PWR 92): Erases DBs in Space',
    'Aaron Brewer': '4.95-Speed Center (SPD 80, BLK 84): Outruns LBs on Pin-Pull Sweeps',
    'Dominick Puni': 'Rookie-Scale $1.4M Surplus Guard (BLK 86): Combo-Climb & Pull',
    'Spencer Brown': '6\'8" 311lb 10.0-RAS Wall (BLK 90) Next to 6\'7" Washington',
  };

  const rolePillMap: Record<string, { label: string; color: string }> = {
    'Justin Fields': { label: 'QB1', color: '#22d3ee' },
    'Cole Payton': { label: 'QB2 / PONY', color: '#22d3ee' },
    'Jakobi Meyers': { label: 'WR1 / QB-ARM', color: '#22d3ee' },
    'Jauan Jennings': { label: 'SL / QB-ARM', color: '#22d3ee' },
    'Rashid Shaheed': { label: 'WR2 / JET', color: '#3fb950' },
    'Darnell Washington': { label: 'TE1 / 6th OT', color: '#fbbf24' },
    'Eli Stowers': { label: 'TE2 / QB-HYB', color: '#22d3ee' },
    'Bernhard Raimann': { label: 'LT (PULL)', color: '#a371f7' },
    'Mekhi Becton': { label: 'LG (363 LB)', color: '#a371f7' },
    'Aaron Brewer': { label: 'C (4.95 SPD)', color: '#a371f7' },
    'Dominick Puni': { label: 'RG (ROOKIE)', color: '#a371f7' },
    'Spencer Brown': { label: 'RT (6\'8")', color: '#a371f7' },
  };

  function statColor(val: number, isArm = false, isBlk = false): string {
    if (isArm && val >= 78) return '#22d3ee';
    if (isBlk && val < 58) return '#f87171';
    if (val >= 90) return '#3fb950';
    if (val >= 82) return '#58a6ff';
    if (val >= 74) return '#fbbf24';
    return '#4b5563';
  }

  const playerCardsHtml = players
    .map((p) => {
      const rp = rolePillMap[p.name] || { label: p.pos, color: '#58a6ff' };
      const stats: [string, number, boolean, boolean][] = [
        ['SPD', p.ratings.speed, false, false],
        ['ACC', p.ratings.accel, false, false],
        ['PWR', p.ratings.power, false, false],
        ['BLK', p.blockRating ?? 70, false, true],
        ['AWR', p.ratings.awareness, false, false],
        ['ARM', p.throwerRating, true, false],
      ];
      const isPasser = p.throwerRating >= 78;

      const barsHtml = stats
        .map(([lbl, val, isArm, isBlk]) => {
          const col = statColor(val, isArm, isBlk);
          return `
            <div style="display:flex; flex-direction:column; gap:3px;">
              <div class="mono" style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:800;">
                <span style="color:#8b9bb0;">${lbl}</span>
                <span style="color:${isArm && val >= 78 ? '#22d3ee' : isBlk && val < 58 ? '#f87171' : '#f0f6fc'};">${val}</span>
              </div>
              <div style="height:6px; background:#070a0f; border-radius:3px; overflow:hidden; border:1px solid #1b2534;">
                <div style="width:${val}%; height:100%; background:${col};"></div>
              </div>
            </div>
          `;
        })
        .join('');

      return `
        <div style="background:#0d141f; border:1px solid ${isPasser ? 'rgba(34,211,238,0.45)' : '#212f42'}; border-radius:9px; padding:12px 14px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <div style="display:flex; align-items:center; gap:7px;">
                <span class="mono" style="padding:2px 7px; border-radius:4px; font-size:11.5px; font-weight:900; background:rgba(255,255,255,0.07); color:${rp.color}; border:1px solid ${rp.color}55;">
                  ${escapeHtml(rp.label)}
                </span>
                <span style="font-size:17px; font-weight:800; color:#ffffff;">${escapeHtml(p.name)}</span>
              </div>
              <span class="mono" style="padding:2px 8px; border-radius:4px; background:rgba(63,185,80,0.16); border:1px solid rgba(63,185,80,0.4); color:#56d364; font-size:13px; font-weight:800;">
                $${p.capHitM.toFixed(1)}M
              </span>
            </div>
            <div style="font-size:13px; color:#a9b9cc; margin-top:5px; line-height:1.3;">
              ${escapeHtml(shortHookMap[p.name] || p.archetype)}
            </div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:7px 10px; padding-top:4px; border-top:1px solid #1a2433;">
            ${barsHtml}
          </div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${SHARED_CARD_CSS}</style></head><body>
    <div class="card-shell">
      <div class="grid-bg"></div>
      <div class="top-header z1">
        <div>
          <div class="eyebrow-row">
            <span class="pill pill-green">$85.5M ACTIVE 11-STARTER CAP</span>
            <span class="pill pill-cyan">5 SIMULTANEOUS PASSERS (ARM 79-85)</span>
            <span class="pill pill-amber">PHILLY HYBRIDS: COLE PAYTON ($1.1M) &amp; ELI STOWERS ($1.9M)</span>
          </div>
          <h1 style="font-size:35px; font-weight:900; letter-spacing:-0.02em; color:#ffffff;">
            2027 HYDRA MONEYBALL ROSTER &amp; BLOCKING / PASSING MATRIX
          </h1>
          <p style="font-size:16px; color:#9fb0c3; margin-top:2px;">
            Notice BLK vs. PWR: QBs Fields (BLK 46) &amp; Payton (BLK 48) Never Block DEs — 239-lb TE/QB Eli Stowers (BLK 82) &amp; 275-lb Washington (BLK 91) Handle Contact
          </p>
        </div>
        <div class="thread-badge mono">THREAD 03 / 11</div>
      </div>

      <div class="z1" style="display:grid; grid-template-columns:repeat(4, 1fr); grid-template-rows:repeat(3, 1fr); gap:12px; flex:1; margin: 12px 0;">
        ${playerCardsHtml}
      </div>

      <div class="footer-bar z1 mono">
        <span>CYAN BORDER = LIVE THROWING NODE (5 ON FIELD) • $60.5M-$86.5M SAVED VS CONVENTIONAL OFFENSES</span>
        <span style="color:#56d364;">REINVESTED CAP FUNDS TOP-5 DEFENSE (+14.92 PTS/G TEAM NET DIFFERENTIAL)</span>
      </div>
    </div>
  </body></html>`;
}

function buildPlayCardHtml(cfg: PlayCardConfig, telemetry: any, mcScreenshotBase64: string): string {
  const meanYdsStr = `${telemetry.meanYds >= 0 ? '+' : ''}${telemetry.meanYds.toFixed(2)}y`;
  const nashEpaVal = telemetry.epaVsNashDc ?? telemetry.meanEpa;
  const nashEpaStr = `${nashEpaVal >= 0 ? '+' : ''}${nashEpaVal.toFixed(2)}`;
  const allFrontEpaStr = `${telemetry.meanEpa >= 0 ? '+' : ''}${telemetry.meanEpa.toFixed(2)}`;
  const explStr = `${telemetry.explosivePct.toFixed(1)}%`;
  const fumTot = telemetry.fumbleTotalPct ?? 0;
  const fumLost = telemetry.fumbleLostPct ?? 0;
  const fumStr = `${fumTot.toFixed(1)}% (${fumLost.toFixed(1)}% TO)`;

  const bestDef = telemetry.bestMatchup ? `${telemetry.bestMatchup.def} (${telemetry.bestMatchup.epa >= 0 ? '+' : ''}${telemetry.bestMatchup.epa.toFixed(2)})` : 'N/A';
  const worstDef = telemetry.worstCounter ? `${telemetry.worstCounter.def} (${telemetry.worstCounter.epa >= 0 ? '+' : ''}${telemetry.worstCounter.epa.toFixed(2)})` : 'N/A';

  const menuPills = cfg.menuTags
    .map((t) => `<span class="pill pill-amber">${escapeHtml(t)}</span>`)
    .join('');

  const totalPct = Math.max(1, cfg.branchA.pct + cfg.branchB.pct);
  const wA = ((cfg.branchA.pct / totalPct) * 100).toFixed(1);
  const wB = ((cfg.branchB.pct / totalPct) * 100).toFixed(1);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${SHARED_CARD_CSS}</style></head><body>
    <div class="card-shell">
      <div class="grid-bg"></div>
      <div class="top-header z1">
        <div>
          <div class="eyebrow-row">
            <span class="pill pill-cyan">PLAY ${cfg.playNumber} OF 8 // 2027 HYDRA CALL SHEET</span>
            <span class="pill pill-blue">${escapeHtml(cfg.personnel)}</span>
            ${menuPills}
          </div>
          <h1 style="font-size:36px; font-weight:900; letter-spacing:-0.02em; color:#ffffff;">
            ${escapeHtml(cfg.shortTitle)}
          </h1>
          <p style="font-size:16.5px; color:#9fb0c3; margin-top:2px;">
            ${escapeHtml(cfg.subtitle)}
          </p>
        </div>
        <div class="thread-badge mono">THREAD ${String(cfg.cardIndex).padStart(2, '0')} / 11</div>
      </div>

      <div class="z1" style="display:grid; grid-template-columns: 1.16fr 0.84fr; gap:20px; align-items:stretch; flex:1; min-height:0; margin: 11px 0;">
        <!-- LEFT: REAL SIMULATOR MONTE CARLO SCREENSHOT -->
        <div style="background:#0a0f18; border:1px solid #26364b; border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:7px; min-height:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0 4px;">
            <span class="mono" style="font-size:12.5px; font-weight:800; color:#22d3ee;">● SIMULATOR MONTE CARLO (N=100) // 20Hz FIELD CAPTURE</span>
            <span class="mono" style="font-size:12px; color:#fbbf24; font-weight:700;">${escapeHtml(cfg.featuredDefenseLabel)}</span>
          </div>
          <div style="flex:1; min-height:0; border-radius:7px; overflow:hidden; border:1px solid #1e2a3a; background:#080a0d; position:relative;">
            <img src="data:image/png;base64,${mcScreenshotBase64}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center top; display:block;" />
          </div>
        </div>

        <!-- RIGHT: TELEMETRY + OPTIONALITY SPLITS + <=280 CHAR EXPLAINER -->
        <div style="display:flex; flex-direction:column; justify-content:space-between; gap:8px; min-height:0;">
          <!-- 4 KPI TILES + ANTI-CHERRY-PICKING MATCHUP STRIP -->
          <div style="background:#0d141f; border:1px solid #223246; border-radius:10px; padding:9px 13px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span class="mono" style="font-size:11.5px; font-weight:800; color:#79c0ff;">NON-CHERRY-PICKED 10-FRONT &amp; NASH DC AUDIT</span>
              <span class="mono" style="font-size:11px; color:#56d364; font-weight:800;">NASH WT: ${(telemetry.nashWeightPct ?? 0).toFixed(1)}%</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:7px;">
              <div style="background:#080c13; border:1px solid #1d2a3b; border-radius:7px; padding:6px 5px; text-align:center;">
                <div class="mono" style="font-size:10px; color:#8b9bb0; font-weight:700;">MEAN YARDS</div>
                <div class="mono" style="font-size:20px; font-weight:900; color:#56d364; margin-top:2px;">${meanYdsStr}</div>
              </div>
              <div style="background:#080c13; border:1px solid #1d2a3b; border-radius:7px; padding:6px 5px; text-align:center;">
                <div class="mono" style="font-size:10px; color:#8b9bb0; font-weight:700;">NASH / ALL EPA</div>
                <div class="mono" style="font-size:17px; font-weight:900; color:${nashEpaVal >= 0 ? '#22d3ee' : '#cbd5e1'}; margin-top:4px;">${nashEpaStr} / ${allFrontEpaStr}</div>
              </div>
              <div style="background:#080c13; border:1px solid #1d2a3b; border-radius:7px; padding:6px 5px; text-align:center;">
                <div class="mono" style="font-size:10px; color:#8b9bb0; font-weight:700;">${cfg.playId === 'HYDRA_GOALLINE_PHILLY_SPECIAL' ? 'TD RATE' : 'EXPL 15y+'}</div>
                <div class="mono" style="font-size:20px; font-weight:900; color:#fbbf24; margin-top:2px;">${explStr}</div>
              </div>
              <div style="background:#080c13; border:1px solid #1d2a3b; border-radius:7px; padding:6px 5px; text-align:center;">
                <div class="mono" style="font-size:10px; color:#8b9bb0; font-weight:700;">FUMBLE (LOST)</div>
                <div class="mono" style="font-size:15.5px; font-weight:900; color:${fumLost <= 0.7 ? '#56d364' : '#f87171'}; margin-top:5px;">${fumStr}</div>
              </div>
            </div>
            <div class="mono" style="display:flex; justify-content:space-between; font-size:10.5px; margin-top:6px; padding-top:5px; border-top:1px solid #192536;">
              <span style="color:#56d364;">▲ BEST: ${escapeHtml(bestDef)}</span>
              <span style="color:#f87171;">▼ COUNTER: ${escapeHtml(worstDef)}</span>
            </div>
          </div>

          <!-- POST-SNAP OPTIONALITY SPLIT BAR -->
          <div style="background:#0d141f; border:1px solid #223246; border-radius:10px; padding:9px 13px;">
            <div class="mono" style="font-size:11.5px; font-weight:800; color:#22d3ee; margin-bottom:6px;">
              POST-SNAP OPTIONALITY &amp; EMPIRICAL BRANCH SPLIT
            </div>
            <div style="height:13px; width:100%; background:#070a0f; border-radius:6px; overflow:hidden; display:flex; border:1px solid #1e2b3c; margin-bottom:7px;">
              <div style="width:${wA}%; height:100%; background:${cfg.branchA.color};"></div>
              <div style="width:${wB}%; height:100%; background:${cfg.branchB.color};"></div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div style="background:#080c13; border-left:3px solid ${cfg.branchA.color}; padding:5px 8px; border-radius:4px;">
                <div class="mono" style="font-size:10.5px; font-weight:800; color:${cfg.branchA.color};">${escapeHtml(cfg.branchA.label)}</div>
                <div class="mono" style="font-size:13.5px; font-weight:800; color:#ffffff; margin-top:1px;">${escapeHtml(cfg.branchA.detail)}</div>
              </div>
              <div style="background:#080c13; border-left:3px solid ${cfg.branchB.color}; padding:5px 8px; border-radius:4px;">
                <div class="mono" style="font-size:10.5px; font-weight:800; color:${cfg.branchB.color};">${escapeHtml(cfg.branchB.label)}</div>
                <div class="mono" style="font-size:13.5px; font-weight:800; color:#ffffff; margin-top:1px;">${escapeHtml(cfg.branchB.detail)}</div>
              </div>
            </div>
          </div>

          <!-- <= 280 CHAR HOW & WHY EXPLAINER -->
          <div style="background:linear-gradient(180deg, rgba(14,23,38,0.98) 0%, rgba(10,16,27,0.98) 100%); border:1px solid #2e4360; border-left:4px solid #22d3ee; border-radius:10px; padding:11px 15px; flex:1; min-height:0; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <span class="mono" style="font-size:11.5px; font-weight:900; color:#22d3ee;">HOW &amp; WHY IT WORKS (280-CHAR BRIEF)</span>
                <span class="mono" style="font-size:10.5px; padding:2px 7px; border-radius:4px; background:rgba(34,211,238,0.14); color:#79c0ff; font-weight:700;">
                  ${cfg.explainer280.length} / 280 CHARS
                </span>
              </div>
              <p style="font-size:15.5px; line-height:1.38; color:#f0f6fc; font-weight:500;">
                ${escapeHtml(cfg.explainer280)}
              </p>
            </div>
            <div class="mono" style="font-size:10.5px; color:#56d364; font-weight:800; padding-top:6px; border-top:1px solid #1b283a; margin-top:4px;">
              AUDIT: ${escapeHtml(cfg.legalBadge)}
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar z1 mono">
        <span>2027 HYDRA VANGUARD ($85.5M PHILLY HYBRID CAP) // 33.52 PPG • +0.153 NASH EPA • +14.92 NET PTS/G</span>
        <span style="color:#79c0ff;">ALL-22 CHESS 20Hz KINEMATIC ENGINE</span>
      </div>
    </div>
  </body></html>`;
}

async function main(): Promise<void> {
  const resultsPath = path.join(process.cwd(), 'src', 'data', 'vanguard_2027_results.json');
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

  fs.mkdirSync(WORKSPACE_OUT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('dist/index.html missing — run npm run build first');
  }

  console.log('[1/3] Starting production All-22 Simulator server & Headless Chrome (2x Retina)...');
  const server = await startDistServer(distDir, 5188);
  const { proc, wsUrl, tmpProfile } = await launchHeadlessChrome(9239);
  const cdp = new CDPClient();

  try {
    await cdp.connect(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // Set 1660x920 @ 2x DPI for live simulator Monte Carlo captures
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1660,
      height: 920,
      deviceScaleFactor: 2,
      mobile: false,
    });

    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5188/' });
    // Wait until window.__all22App is initialized
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 120));
      const check = await cdp.send('Runtime.evaluate', {
        expression: 'Boolean(window.__all22App)',
        returnByValue: true,
      });
      if (check?.result?.value === true) break;
    }

    console.log('[2/3] Running live N=100 Monte Carlo batches & capturing 20 Hz screenshots for all 8 Hydra plays...');
    const mcScreenshots: Record<string, string> = {};
    let fullWorkstationBase64 = '';

    for (const cfg of PLAY_CARD_CONFIGS) {
      // Configure play in live simulator, trigger N=100 Monte Carlo batch, and scrub to signature action tick
      const prepExpr = `(() => {
        const app = window.__all22App;
        const offSel = document.getElementById('off-team-select');
        if (offSel) { offSel.value = 'HYD'; offSel.dispatchEvent(new Event('change')); }
        app.autoMatchDefense = true;
        app.loadPlayPreset('${cfg.playId}');
        app.renderOpts.selectedAgentId = null;
        app.renderOpts.hoveredAgentId = null;

        // Pick the signature mid-action tick showing pass/lateral flight or convoy block
        const snaps = app.snapshots;
        let bestTick = Math.min(28, snaps.length - 1);
        const playId = '${cfg.playId}';

        if (playId === 'HYDRA_HOOK_AND_LATERAL') {
          const latFlight = snaps.findIndex((s) => s.exoticEvent === 'HOOK_AND_LATERAL' && s.ball && s.ball.state === 'IN_FLIGHT' && s.ball.isLateral);
          const latAny = snaps.findIndex((s) => s.exoticEvent === 'HOOK_AND_LATERAL');
          bestTick = latFlight > 0 ? latFlight : latAny > 0 ? Math.min(snaps.length - 1, latAny + 4) : 48;
        } else if (playId === 'HYDRA_4MIN_BULLDOZER_SWEEP') {
          bestTick = Math.min(34, snaps.length - 1);
        } else {
          const optPassFlight = snaps.findIndex((s) => s.exoticEvent === 'OPTION_PASS' && s.ball && s.ball.state === 'IN_FLIGHT' && !s.ball.isLateral);
          const fwdFlight = snaps.findIndex((s) => s.ball && s.ball.state === 'IN_FLIGHT' && !s.ball.isLateral);
          if (optPassFlight > 0) bestTick = Math.min(snaps.length - 1, optPassFlight + 2);
          else if (fwdFlight > 0) bestTick = Math.min(snaps.length - 1, fwdFlight + 2);
        }

        app.currentTick = bestTick;
        // Click the real Monte Carlo button to execute N=100 stochastic runs & render fan + HUD
        document.getElementById('btn-monte-carlo').click();
        app.currentTick = bestTick;
        app.drawCurrentFrame();
        app.syncInspectorAndMatrix();

        const canvasRect = document.getElementById('tactical-canvas').getBoundingClientRect();
        return { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height, tick: bestTick };
      })()`;

      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: prepExpr,
        returnByValue: true,
      });
      const rect = evalRes.result.value as { x: number; y: number; width: number; height: number; tick: number };
      await new Promise((r) => setTimeout(r, 80));

      // Capture All-22 Tactical Canvas w/ MC N=100 Fan & HUD cleanly
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        clip: {
          x: Math.max(0, rect.x),
          y: Math.max(0, rect.y),
          width: rect.width,
          height: rect.height,
          scale: 1,
        },
      });
      mcScreenshots[cfg.playId] = shot.data;
      console.log(`   -> Captured ${cfg.playId} (MC N=100 @ tick ${rect.tick})`);

      // Also capture full 3-dock workstation on Hook & Lateral for Card 02 (Simulator Summary Card)
      if (cfg.playId === 'HYDRA_HOOK_AND_LATERAL') {
        const fullShot = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          clip: { x: 0, y: 0, width: 1660, height: 920, scale: 1 },
        });
        fullWorkstationBase64 = fullShot.data;
      }
    }

    // Switch viewport to exact 1600x900 @ 2x Retina (3200x1800 physical px) to render all 11 Twitter cards!
    console.log('[3/3] Rendering all 11 self-contained 1600x900 (3200x1800 Retina) Twitter/X Infographic Cards...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    const cardsToRender: { filename: string; html: string }[] = [
      {
        filename: 'card_01_hydra_philosophy.png',
        html: buildPhilosophyCardHtml(results),
      },
      {
        filename: 'card_02_simulator_summary.png',
        html: buildSimulatorCardHtml(fullWorkstationBase64),
      },
      {
        filename: 'card_03_player_skills_roster.png',
        html: buildRosterSkillsCardHtml(results),
      },
      ...PLAY_CARD_CONFIGS.map((cfg) => ({
        filename: cfg.fileSlug,
        html: buildPlayCardHtml(
          cfg,
          results.hydraPlayTelemetry[cfg.playId],
          mcScreenshots[cfg.playId]
        ),
      })),
    ];

    const tmpHtmlPath = path.join(tmpProfile, 'render_card.html');
    const tmpHtmlUrl = 'file:///' + tmpHtmlPath.replace(/\\/g, '/');

    for (const card of cardsToRender) {
      fs.writeFileSync(tmpHtmlPath, card.html, 'utf8');
      await cdp.send('Page.navigate', { url: tmpHtmlUrl });
      // Wait for complete layout & embedded PNG decode
      for (let w = 0; w < 25; w++) {
        await new Promise((r) => setTimeout(r, 60));
        const ready = await cdp.send('Runtime.evaluate', {
          expression: `document.readyState === 'complete' && Array.from(document.images).every((img) => img.complete)`,
          returnByValue: true,
        });
        if (ready?.result?.value === true) break;
      }
      await new Promise((r) => setTimeout(r, 60));

      const png = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 0, y: 0, width: 1600, height: 900, scale: 1 },
      });
      const buf = Buffer.from(png.data, 'base64');

      const wsFile = path.join(WORKSPACE_OUT_DIR, card.filename);
      const artFile = path.join(ARTIFACT_DIR, card.filename);
      fs.writeFileSync(wsFile, buf);
      fs.writeFileSync(artFile, buf);
      console.log(`   [OK] Saved ${card.filename} (${(buf.length / 1024).toFixed(0)} KB)`);
    }

    console.log(`\nAll 11 Twitter/X infographic cards written to:\n  - ${WORKSPACE_OUT_DIR}\n  - ${ARTIFACT_DIR}`);
  } finally {
    cdp.close();
    proc.kill();
    server.close();
  }
}

main().catch((err) => {
  console.error('Card generation failed:', err);
  process.exit(1);
});
