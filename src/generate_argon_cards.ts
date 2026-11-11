import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

interface ArgonPlayCardConfig {
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
  buildBranches: (telemetry: any, drills: any) => {
    branchA: { label: string; pct: number; detail: string; color: string };
    branchB: { label: string; pct: number; detail: string; color: string };
  };
  explainer280: string; // Strictly <= 280 chars
  tweetCopy280: string; // Strictly <= 280 chars
}

const ARTIFACT_DIR = 'C:\\Users\\Ryan\\.gemini\\antigravity\\brain\\facfa020-4db6-4926-8efd-a7ab83050bc3';
const WORKSPACE_OUT_DIR = path.join(process.cwd(), 'docs', 'argon_cards');
const fmtYds = (v: number): string => `${v >= 0 ? '+' : ''}${v.toFixed(1)}y`;

const PLAY_CARD_CONFIGS: ArgonPlayCardConfig[] = [
  {
    cardIndex: 4,
    playNumber: 1,
    fileSlug: 'card_04_play1_chiral_jet_left.png',
    playId: 'ARGON_CHIRAL_JET_LEFT',
    shortTitle: 'CHIRAL JET-LEFT OPTION CONTINUUM',
    subtitle: 'Former Wildcat QB WR Khalil Shakir (ARM 79) • 250-lb TE2 Tremble (BLK 86) + Barton/Bortolini Convoy',
    personnel: '21 ARGON',
    menuTags: ['OPEN FIELD', '2-MINUTE', 'CHIRAL LEFT'],
    featuredDefenseLabel: 'vs. 4-2-5 NICKEL OVER // COVER 3 SKY',
    legalBadge: 'STRICT 7 ON LOS (UNCOVERED ENDS) • -0.55y TOSS • OL <= +0.85y • 0.2% FUM LOST',
    buildBranches: (t) => {
      const passPct = t.branchStats?.passRate ?? 97.1;
      const passYds = t.branchStats?.passYds ?? 9.9;
      const keepPct = t.branchStats?.keepRate ?? +(100 - passPct).toFixed(1);
      const keepYds = t.branchStats?.keepYds ?? 0.1;
      return {
        branchA: {
          label: 'SHAKIR JET-LEFT OPTION PASS',
          pct: passPct,
          detail: `${passPct.toFixed(1)}% (${fmtYds(passYds)} avg)`,
          color: '#22d3ee',
        },
        branchB: {
          label: 'CONVOY TUCK / FUMBLE LOST',
          pct: Math.max(1.5, keepPct),
          detail: `Tuck ${keepPct.toFixed(1)}% • Fum Lost ${(t.fumbleLostPct ?? 0.2).toFixed(1)}%`,
          color: '#a855f7',
        },
      };
    },
    explainer280:
      'Richardson tosses backward (-0.55y) at t=0.18s to Jet-Left WR Khalil Shakir (ARM 79) behind 250lb TE2 Tremble (BLK 86) + sub-4.95 pullers Barton & Bortolini while Richardson boots weakside right (zero QB blocking!). Overhang crashes? Shakir lasers 4.31 Samuel on the boundary.',
    tweetCopy280:
      '4/11 PLAY 1: Chiral Jet-Left Option Continuum. Richardson pitches backward to former Wildcat-QB WR Khalil Shakir behind 250lb TE2 Tremble (BLK 86) + 4.85 Barton & 4.94 Bortolini while Richardson boots weakside. Flat DB crashes? Boundary strike to 4.31 Samuel (0.2% fum lost)!',
  },
  {
    cardIndex: 5,
    playNumber: 2,
    fileSlug: 'card_05_play2_reactor_sweep_right.png',
    playId: 'ARGON_REACTOR_SWEEP_RIGHT',
    shortTitle: '11-ON-11 RIGHT REACTOR SWEEP',
    subtitle: 'Direct Snap to 244-lb Anthony Richardson (SPD 92) • 250-lb TE2 Tremble (BLK 86) Lead + Milton Freeze',
    personnel: '22 ARGON',
    menuTags: ['OPEN FIELD', '4-MINUTE', '11-ON-11 MATH'],
    featuredDefenseLabel: 'vs. 3-4 BEAR TITE // QUARTERS MATCH',
    legalBadge: 'STRICT 7 ON LOS (UNCOVERED ENDS) • ZERO QB BLOCKING • 0.0% FUMBLE',
    buildBranches: (t) => {
      const unstuffed = t.branchStats?.unstuffedPct ?? 95.6;
      const stuffed = t.branchStats?.stuffPct ?? +(100 - unstuffed).toFixed(1);
      return {
        branchA: {
          label: 'CLEAN / EXPLOSIVE 11v11 RUNS',
          pct: unstuffed,
          detail: `${unstuffed.toFixed(1)}% Unstuffed (+${t.meanYds.toFixed(2)}y, +${t.meanEpa.toFixed(2)} EPA)`,
          color: '#34d399',
        },
        branchB: {
          label: 'STUFF RATE (<= 0.5y)',
          pct: Math.max(0.5, stuffed),
          detail: `Only ${stuffed.toFixed(1)}% Stuffed (0.0% Fumble/Sack)`,
          color: '#f59e0b',
        },
      };
    },
    explainer280:
      'True 11-on-11 hat superiority with zero QB-on-DL/LB contact and 0.0% lateral fumble risk: 244lb Richardson takes direct snap behind 250lb H-Back Tremble (BLK 86), 256lb TE1 Warren (BLK 88), LG Brown & C Barton while QB2 Milton freezes backside edge with a weakside boot fake.',
    tweetCopy280:
      '5/11 PLAY 2: 11-on-11 Right Reactor Sweep. Direct snap to 244lb 4.43-spd Anthony Richardson behind 250lb TE2 Tremble (BLK 86), 256lb TE1 Warren (BLK 88), Evan Brown & 4.85-spd C Barton while QB2 Joe Milton freezes backside contain via option boot: +10.7y & 0.0% fumble!',
  },
  {
    cardIndex: 6,
    playNumber: 3,
    fileSlug: 'card_06_play3_noble_kinetic_relay.png',
    playId: 'ARGON_NOBLE_KINETIC_RELAY',
    shortTitle: 'NOBLE KINETIC RELAY (4.21 PITCH)',
    subtitle: 'Zone-Void Sail to 256-lb Tyler Warren (+8.5y) -> Disciplined (>=3.25y Sep) Pitch to 4.21 Xavier Worthy',
    personnel: '12 ARGON',
    menuTags: ['3RD & 9 STICKS', 'OPEN FIELD', 'BEAR KILLER'],
    featuredDefenseLabel: 'vs. 4-1-6 DIME PALMS // QUARTERS MATCH',
    legalBadge: 'STRICT 7 ON LOS • >=3.25y PITCH SEPARATION GATE • 0.9% FUM LOST',
    buildBranches: (t) => {
      const pitchPct = t.branchStats?.pitchRateOnCatch ?? 28.3;
      const latYds = t.branchStats?.latMeanYds ?? 33.7;
      const keepPct = +(100 - pitchPct).toFixed(1);
      const keepYds = t.branchStats?.keepMeanYds ?? 33.3;
      return {
        branchA: {
          label: 'DISCIPLINED PITCH TO 4.21 WORTHY',
          pct: pitchPct,
          detail: `${pitchPct.toFixed(1)}% (+${latYds.toFixed(1)}y avg on pitches!)`,
          color: '#22d3ee',
        },
        branchB: {
          label: '256-LB WARREN SEAM KEEP',
          pct: keepPct,
          detail: `${keepPct.toFixed(1)}% (+${keepYds.toFixed(1)}y avg • 0% pitch risk)`,
          color: '#34d399',
        },
      };
    },
    explainer280:
      'Shatters 3-4 Bear Quarters & Dime Palms with disciplined lateral physics: Richardson hits 256lb Warren (+8.5y) while 4.21 Worthy orbits strictly behind. Warren ONLY pitches when a DB collapses (<5.4y) AND Worthy has >=3.25y separation (0% traffic risk!); else Warren keeps.',
    tweetCopy280:
      '6/11 PLAY 3: Noble Kinetic Relay. Richardson hits 256lb Tyler Warren in the +8.5y zone void while 4.21 Xavier Worthy loops strictly behind. Disciplined >=3.25y separation gate means Warren only pitches when Worthy is wide open (+33.7y) and rumbles upfield when covered!',
  },
  {
    cardIndex: 7,
    playNumber: 4,
    fileSlug: 'card_07_play4_displaced_node_laser.png',
    playId: 'ARGON_DISPLACED_NODE_LASER',
    shortTitle: 'DISPLACED LAUNCH-NODE LASER',
    subtitle: 'Noble-Gas Pressure Immunity • C Barton + TE2 Tremble (BLK 86) Shield +8.6y Milton Node -> Worthy',
    personnel: '12 ARGON',
    menuTags: ['3RD & 9 BLITZ', 'OPEN FIELD', '0.0% SACK'],
    featuredDefenseLabel: 'vs. 3-2-6 MUG // CROSS-DOG COVER-0 BLITZ',
    legalBadge: 'STRICT 7 ON LOS • PASS #1 BACKWARD (-4.9y < -3.9y) • 0.2% FUM LOST',
    buildBranches: (t) => {
      const passPct = t.branchStats?.passRate ?? 98.7;
      const passYds = t.branchStats?.passYds ?? 12.5;
      const keepPct = t.branchStats?.keepRate ?? 0.0;
      return {
        branchA: {
          label: 'DISPLACED NODE LASER (MILTON)',
          pct: passPct,
          detail: `${passPct.toFixed(1)}% (${fmtYds(passYds)} avg • 0.0% Sack)`,
          color: '#a855f7',
        },
        branchB: {
          label: 'TUCK / FUMBLE LOST RATE',
          pct: Math.max(1.3, 100 - passPct),
          detail: `Fum Lost ${(t.fumbleLostPct ?? 0.2).toFixed(1)}% • 0.0% Sack`,
          color: '#34d399',
        },
      };
    },
    explainer280:
      'Neutralizes 6-man Double-A-Gap Mug Cover-0 with 0.0% sacks & 0.2% lost fumbles: C Barton anchors the A-gap and 250lb TE2 Tremble (BLK 86) stonewalls the right edge while Richardson\'s compact t=0.18s backward pitch shifts the launch point +8.6y outside to QB2 Milton (ARM 84).',
    tweetCopy280:
      '7/11 PLAY 4: Displaced Launch-Node Laser. C Barton anchors the A-gap & 250lb TE2 Tremble (BLK 86) seals the edge while Richardson\'s compact t=0.18s pitch shifts the launch node +8.6y outside to QB2 Joe Milton (ARM 84): 0.0% sacks, 0.2% lost fumbles & +12.2y vs Mug C0!',
  },
  {
    cardIndex: 8,
    playNumber: 5,
    fileSlug: 'card_08_play5_wildcat_triple_pitch.png',
    playId: 'ARGON_WILDCAT_TRIPLE_PITCH',
    shortTitle: '256-LB WILDCAT-TE TRIPLE PITCH',
    subtitle: "6'6\" 256-lb Tyler Warren Direct Snap • 3 Pulling OL (Brown/Barton/Tom) + >=3.25y Worthy Pitch",
    personnel: '22 WILDCAT',
    menuTags: ['OPEN FIELD', 'SHORT YARDAGE', 'RED ZONE'],
    featuredDefenseLabel: 'vs. 3-4 BEAR TITE // 8-MAN HEAVY FRONT',
    legalBadge: 'STRICT 7 ON LOS • ZERO QB BLOCKING • >=3.25y PITCH GATE • 0.2% FUM LOST',
    buildBranches: (t) => {
      const keepPct = t.branchStats?.keepRate ?? 91.6;
      const keepYds = t.branchStats?.keepYds ?? 6.1;
      const pitchPct = t.branchStats?.pitchRate ?? 8.4;
      const pitchYds = t.branchStats?.pitchYds ?? 35.1;
      return {
        branchA: {
          label: '256-LB WARREN ALLEY TRUCK',
          pct: keepPct,
          detail: `${keepPct.toFixed(1)}% (+${keepYds.toFixed(1)}y behind 3 OL pullers)`,
          color: '#34d399',
        },
        branchB: {
          label: 'DISCIPLINED PITCH TO 4.21 WORTHY',
          pct: pitchPct,
          detail: `${pitchPct.toFixed(1)}% (+${pitchYds.toFixed(1)}y • 0.2% Fum Lost)`,
          color: '#22d3ee',
        },
      };
    },
    explainer280:
      '6\'6" 256lb Wildcat-TE Tyler Warren takes the direct snap behind 3 pulling OL (Brown on SS, Barton on MIKE, Tom on WILL) + TE2 Tremble (LDE) + Samuel (CB2) while Richardson fakes weakside bootleg. Warren only pitches when 4.21 Worthy has >=3.25y separation (0.2% fum lost!).',
    tweetCopy280:
      '8/11 PLAY 5: 256-lb Wildcat-TE Triple Pitch. 6\'6" 256lb Tyler Warren takes the direct snap behind 3 pulling OL (Brown, Barton, Tom) + TE2 Tremble (BLK 86) & Samuel (BLK 74), pitching to 4.21 Xavier Worthy (+35.1y) only when separation >=3.25y (0.2% fumble lost)!',
  },
  {
    cardIndex: 9,
    playNumber: 6,
    fileSlug: 'card_09_play6_2min_boundary_laser.png',
    playId: 'ARGON_2MIN_BOUNDARY_LASER',
    shortTitle: '2-MIN DIRECT SPRINT-OUT LASER',
    subtitle: 'Direct Snap to QB2 Milton (0.0% Fumble!) • 4.21 Worthy Clears CB2 Inside -> Warren Boundary Out',
    personnel: '12 ARGON',
    menuTags: ['2-MINUTE DRILL', 'OOB CLOCK STOP', '0.0% FUMBLE'],
    featuredDefenseLabel: 'vs. 4-1-6 DIME PALMS // QUARTERS MATCH',
    legalBadge: 'STRICT 7 ON LOS • DIRECT SNAP SPRINT-OUT • 0.0% FUMBLE • 0.0% SACK',
    buildBranches: (_t, drills) => {
      const tdWin = drills?.twoMinute?.argon?.tdWinPct ?? 74.7;
      const oob = drills?.twoMinute?.argon?.oobStopsPerDrive ?? 4.19;
      const sackRate = drills?.twoMinute?.argon?.sackRatePct ?? 0.0;
      return {
        branchA: {
          label: '2-MIN DRILL TD WIN RATE',
          pct: tdWin,
          detail: `${tdWin.toFixed(1)}% TD Win (${oob.toFixed(2)} OOB/drv)`,
          color: '#22d3ee',
        },
        branchB: {
          label: 'SACK & FUMBLE IMMUNITY',
          pct: +(100 - sackRate).toFixed(1),
          detail: `${sackRate.toFixed(1)}% Sack • 0.0% Fumble (${drills?.twoMinute?.argon?.ydsPerClockSec ?? 2.44} yd/s)`,
          color: '#34d399',
        },
      };
    },
    explainer280:
      'Eliminates backfield lateral fumble risk (0.0%!) in the 2-Minute Drill: QB2 Milton takes the direct shotgun snap and sprints right behind Barton + Bortolini + 250lb TE2 Tremble (BLK 86) while 4.21 Worthy clears CB2 inside-deep and Warren catches a +10.8y boundary out in stride.',
    tweetCopy280:
      '9/11 PLAY 6: 2-Min Direct Sprint-Out Boundary Laser. Direct shotgun snap to QB2 Joe Milton eliminates backfield toss risk (0.0% fumble, 0.0% sack!) while 4.21 Worthy clears CB2 inside-deep, freeing 256lb Tyler Warren for a +10.8y sideline laser (74.7% 2-Min TD Win)!',
  },
  {
    cardIndex: 10,
    playNumber: 7,
    fileSlug: 'card_10_play7_4min_left_monolith.png',
    playId: 'ARGON_4MIN_LEFT_MONOLITH',
    shortTitle: '4-MIN CHIRAL LEFT MONOLITH SWEEP',
    subtitle: 'Bilateral Symmetry Anchor • Richardson Left Behind 256-lb Warren (BLK 88) + Barton + Bortolini',
    personnel: '22 ARGON',
    menuTags: ['4-MINUTE DRILL', 'CHIRAL SYMMETRY', 'MUG KILLER'],
    featuredDefenseLabel: 'vs. 3-4 BEAR TITE // 8-MAN LOADED RUN BOX',
    legalBadge: 'STRICT 7 ON LOS (UNCOVERED ENDS) • ZERO QB BLOCKING • 0.0% FUMBLE',
    buildBranches: (t, drills) => {
      const unstuffed = t.branchStats?.unstuffedPct ?? 93.6;
      const sealPct = drills?.fourMinute?.argon?.gameSealPct ?? 87.1;
      const bled = drills?.fourMinute?.argon?.meanClockBledSec ?? 199.6;
      return {
        branchA: {
          label: 'UNSTUFFED CHIRAL LEFT RUNS',
          pct: unstuffed,
          detail: `${unstuffed.toFixed(1)}% Unstuffed (+${t.meanYds.toFixed(2)}y, +${t.meanEpa.toFixed(2)} EPA)`,
          color: '#34d399',
        },
        branchB: {
          label: '4-MIN DRILL GAME-SEAL RATE',
          pct: sealPct,
          detail: `${sealPct.toFixed(1)}% Game-Seal (${bled.toFixed(1)}s Bled!)`,
          color: '#a855f7',
        },
      };
    },
    explainer280:
      'Chiral left mirror of Play 2 with zero QB blocking & 0.0% fumble risk: 244lb Richardson checks away from right-edge safety blitzes and runs left behind 256lb H-Back Warren (BLK 88), 250lb TE2 Tremble (BLK 86) & sub-4.95 pullers Barton + Bortolini as Milton boots weakside.',
    tweetCopy280:
      '10/11 PLAY 7: 4-Min Chiral Left Monolith. Chiral left mirror of Play 2 runs 244lb Richardson behind 256lb TE1 Warren (BLK 88), 250lb TE2 Tremble (BLK 86), 4.85 Barton & 4.94 Bortolini while Milton fakes weakside right: 87.1% 4-Min Game-Seal & 0.0% clock-gift mistakes!',
  },
  {
    cardIndex: 11,
    playNumber: 8,
    fileSlug: 'card_11_play8_goalline_cyclotron.png',
    playId: 'ARGON_GOALLINE_CYCLOTRON',
    shortTitle: 'GOAL-LINE +4y PYLON CYCLOTRON',
    subtitle: "246-lb Milton Right Pylon Sweep -> 6'6\" 256-lb Tyler Warren 0.44s Chip & +5.0y End-Zone Pop",
    personnel: '22 GOAL',
    menuTags: ['GOAL LINE (+4.0y)', '2-PT CONVERSION'],
    featuredDefenseLabel: 'vs. 6-2 HEAVY JUMBO // GOAL-LINE PINCH & JAM',
    legalBadge: 'STRICT 7 ON LOS (UNCOVERED ENDS) • 1.8y COMPACT TOSS • 0.0% FUM LOST',
    buildBranches: (t, drills) => {
      const firstSnapTd = drills?.goalLine?.argon?.singleSnapTdPct ?? t.explosivePct ?? 78.4;
      const fourDownTd = drills?.goalLine?.argon?.fourDownTdPct ?? 98.4;
      const expPts = drills?.goalLine?.argon?.expectedGoalLinePts ?? 6.85;
      return {
        branchA: {
          label: '1ST-SNAP TD (2-PT CONVERSION EQ.)',
          pct: firstSnapTd,
          detail: `${firstSnapTd.toFixed(1)}% 1st-Snap TD (0.0% Fum Lost!)`,
          color: '#22d3ee',
        },
        branchB: {
          label: '4-DOWN GOAL-LINE TD RATE',
          pct: fourDownTd,
          detail: `${fourDownTd.toFixed(1)}% 4-Down TD (${expPts.toFixed(2)} Exp Pts)`,
          color: '#34d399',
        },
      };
    },
    explainer280:
      'At +4.0y vs 6-2 Goal-Line Pinch, Richardson executes a compact 1.8y backward pitch (t=0.18s, 0.0% lost fumbles!) to 246lb QB2 Milton sweeping behind Barton + Bortolini while Richardson leaks left. 256lb Warren (BLK 88) chips DE_R 0.44s then pops +5.0y for an easy TD!',
    tweetCopy280:
      '11/11 PLAY 8: Goal-Line +4y Pylon Cyclotron. Compact 1.8y pitch to 246lb QB2 Milton sweeping right while 6\'6" 256lb Tyler Warren (BLK 88) chips DE_R for 0.44s then pops +5.0y into the end zone: 78.4% 1st-snap TD (2-Pt eq.), 98.4% 4-down TD & 0.0% lost fumbles!',
  },
];

// Validate all 280-char constraints upfront
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

  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'argon-cdp-'));
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
// GOOGLE ARGON NOBLE-GAS PLASMA PALETTE & 1600x900 (2x RETINA) CARD TEMPLATES
// ============================================================================
const SHARED_CARD_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1600px;
    height: 900px;
    overflow: hidden;
    background: #05070e;
    color: #f3f6fc;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .card-shell {
    position: relative;
    width: 1600px;
    height: 900px;
    padding: 25px 34px 22px 34px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background:
      radial-gradient(circle at 12% 14%, rgba(168, 85, 247, 0.14), transparent 44%),
      radial-gradient(circle at 86% 84%, rgba(6, 182, 212, 0.12), transparent 42%),
      linear-gradient(180deg, #060811 0%, #090d19 100%);
    border: 2px solid #262246;
  }
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(168, 85, 247, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 211, 238, 0.035) 1px, transparent 1px);
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
    padding-bottom: 12px;
    border-bottom: 1px solid #232942;
  }
  .eyebrow-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
    flex-wrap: wrap;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    padding: 3.5px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .pill-argon { background: rgba(168, 85, 247, 0.22); color: #d8b4fe; border: 1px solid rgba(192, 132, 252, 0.55); }
  .pill-cyan { background: rgba(6, 182, 212, 0.19); color: #22d3ee; border: 1px solid rgba(34, 211, 238, 0.48); }
  .pill-green { background: rgba(16, 185, 129, 0.19); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.48); }
  .pill-amber { background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.48); }
  .pill-blue { background: rgba(59, 130, 246, 0.20); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.48); }
  .thread-badge {
    padding: 6px 13px;
    background: #121328;
    border: 1px solid #3c3468;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 800;
    color: #d8b4fe;
    letter-spacing: 0.07em;
    white-space: nowrap;
  }
  .footer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 9px;
    border-top: 1px solid #1e2438;
    font-size: 12.5px;
    color: #94a3b8;
  }
`;

function buildPhilosophyCardHtml(results: any): string {
  const benchmarks = results.fullGameBenchmarks as any[];
  const drills = results.situationalDrills;
  const argonBench = benchmarks.find((b) => b.philosophyName.includes('Argon')) || benchmarks[0];
  const hydraBench = benchmarks.find((b) => b.philosophyName.includes('Hydra')) || benchmarks[1];

  const orderedBench = [...benchmarks].sort((a, b) => b.ppgAdversarialNashDc - a.ppgAdversarialNashDc);
  const maxPpg = Math.max(38.0, ...orderedBench.map((b) => Math.max(b.ppgStandardDc, b.ppgAdversarialNashDc)));

  const resolveNashEpa = (name: string): number => {
    if (name.includes('Argon')) return results.nashEquilibrium.argonNashEpa;
    if (name.includes('Hydra')) return results.nashEquilibrium.hydraNashEpa;
    if (name.includes('Shanahan')) return results.nashEquilibrium.baselinesNashEpa.SHANAHAN_12_PA;
    if (name.includes('11-Pers')) return results.nashEquilibrium.baselinesNashEpa.CONV_11_SPREAD;
    return results.nashEquilibrium.baselinesNashEpa.SUPERMAX_STARS;
  };

  const benchRows = orderedBench
    .map((b) => {
      const isArgon = b.philosophyName.includes('Argon');
      const isHydra = b.philosophyName.includes('Hydra');
      const barPct = Math.min(100, (b.ppgStandardDc / maxPpg) * 100);
      const nash = resolveNashEpa(b.philosophyName);
      const netSign = b.projectedTeamNetDiffPerGame >= 0 ? '+' : '';
      return `
        <div style="padding:7.5px 11px; border-radius:7px; background:${isArgon ? 'rgba(168,85,247,0.16)' : isHydra ? 'rgba(6,182,212,0.08)' : '#0c111e'}; border:1px solid ${isArgon ? '#c084fc' : isHydra ? '#1e4e63' : '#1d263b'}; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:14px; font-weight:${isArgon ? '800' : '700'}; color:${isArgon ? '#ffffff' : isHydra ? '#bae6fd' : '#cbd5e1'};">
              ${isArgon ? '★ ' : ''}${escapeHtml(b.philosophyName)}
            </span>
            <div class="mono" style="display:flex; gap:10px; font-size:12px; font-weight:700;">
              <span style="color:${nash >= 0 ? '#34d399' : '#f87171'};">Nash: ${nash >= 0 ? '+' : ''}${nash.toFixed(3)}</span>
              <span style="color:${isArgon ? '#d8b4fe' : '#93c5fd'};"> Nash PPG: ${b.ppgAdversarialNashDc.toFixed(1)}</span>
              <span style="color:${b.projectedTeamNetDiffPerGame >= 0 ? '#22d3ee' : '#f87171'};">Net: ${netSign}${b.projectedTeamNetDiffPerGame.toFixed(1)}/g</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="flex:1; height:11px; background:#060911; border-radius:4px; overflow:hidden; border:1px solid #1c2436;">
              <div style="width:${barPct.toFixed(1)}%; height:100%; background:${isArgon ? 'linear-gradient(90deg, #a855f7, #22d3ee, #34d399)' : isHydra ? '#0891b2' : '#3b4963'};"></div>
            </div>
            <span class="mono" style="font-size:16px; font-weight:800; color:${isArgon ? '#34d399' : isHydra ? '#38bdf8' : '#cbd5e1'}; min-width:96px; text-align:right;">
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
            <span class="pill pill-argon">GOOGLE ARGON AUTONOMOUS R&amp;D</span>
            <span class="pill pill-green">$81.1M MONEYBALL CAP (-$4.4M vs HYDRA)</span>
            <span class="pill pill-cyan">100.0% 4-RULE LEGAL • HONEST FUMBLE &amp; BLOCKING PHYSICS</span>
          </div>
          <h1 style="font-size:36px; font-weight:900; letter-spacing:-0.02em; color:#ffffff;">
            THE 2027 GOOGLE ARGON OFFENSE ("NOBLE-GAS CONTINUUM")
          </h1>
          <p style="font-size:16px; color:#a5b4cc; margin-top:2px;">
            First-Principles Co-Evolution Beyond Hydra: Chiral Bilateral 11-on-11 Symmetry, Displaced Launch Nodes &amp; 4.21 Kinetic Relays
          </p>
        </div>
        <div class="thread-badge mono">ARGON 01 / 11</div>
      </div>

      <!-- 3 FIRST-PRINCIPLES ARGON LAWS -->
      <div class="z1" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:14px;">
        <div style="background:#0c111e; border:1px solid #28274a; border-top:3px solid #a855f7; border-radius:9px; padding:13px 15px;">
          <div class="mono" style="font-size:12px; font-weight:800; color:#d8b4fe; margin-bottom:4px;">LAW 01 // CHIRAL BILATERAL 11v11</div>
          <div style="font-size:18px; font-weight:800; color:#ffffff; margin-bottom:5px;">Zero QB Blocking &amp; Chiral Symmetry</div>
          <p style="font-size:14px; line-height:1.38; color:#b8c5d9;">
            Never asks a QB to block a DE/LB: <strong>256lb TE1 Warren (BLK 88) &amp; 250lb TE2 Tremble (BLK 86)</strong> lead alongside <strong>4.85 Barton &amp; 4.94 Bortolini</strong> while QB2 Milton freezes backside contain via option boot.
          </p>
        </div>
        <div style="background:#0c111e; border:1px solid #28274a; border-top:3px solid #22d3ee; border-radius:9px; padding:13px 15px;">
          <div class="mono" style="font-size:12px; font-weight:800; color:#22d3ee; margin-bottom:4px;">LAW 02 // DISCIPLINED LATERAL GATES</div>
          <div style="font-size:18px; font-weight:800; color:#ffffff; margin-bottom:5px;">&gt;=3.25y Pitch Gate &amp; 9.8% Drive TO%</div>
          <p style="font-size:14px; line-height:1.38; color:#b8c5d9;">
            <strong>4 passers (Richardson, Milton, Shakir, 256lb Warren)</strong> enforce <strong>&gt;=3.25y separation gates</strong> on pitches to <strong>4.21 Worthy</strong>—yielding the lowest turnover rate of all 5 offenses (<strong>9.8% vs 14.3% Hydra</strong>)!
          </p>
        </div>
        <div style="background:#0c111e; border:1px solid #28274a; border-top:3px solid #34d399; border-radius:9px; padding:13px 15px;">
          <div class="mono" style="font-size:12px; font-weight:800; color:#34d399; margin-bottom:4px;">LAW 03 // $81.1M CAP ARBITRAGE</div>
          <div style="font-size:18px; font-weight:800; color:#ffffff; margin-bottom:5px;">${argonBench.ppgPer10MCap.toFixed(2)} PPG/$10M (+$${(146.0 - 81.1).toFixed(1)}M Saved)</div>
          <p style="font-size:14px; line-height:1.38; color:#b8c5d9;">
            Zero overlap with Hydra, zero deals &gt;$13.0M. Saves <strong>$4.4M vs Hydra &amp; $90.9M vs Supermax</strong>—funding an elite defense for a <strong>+${argonBench.projectedTeamNetDiffPerGame.toFixed(2)} pts/g</strong> team net differential!
          </p>
        </div>
      </div>

      <!-- BOTTOM 5-WAY BENCHMARK + 4 SITUATIONAL DRILLS -->
      <div class="z1" style="display:grid; grid-template-columns: 1.18fr 0.82fr; gap:16px; align-items:stretch;">
        <div style="background:#090d18; border:1px solid #202940; border-radius:10px; padding:12px 15px; display:flex; flex-direction:column; justify-content:space-between;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="mono" style="font-size:12.5px; font-weight:800; color:#d8b4fe;">5-WAY FULL-SEASON &amp; ADVERSARIAL NASH BENCHMARK (55,000 DRIVES)</span>
            <span class="mono" style="font-size:11.5px; color:#94a3b8;">SORTED BY NASH DC PPG</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${benchRows}
          </div>
        </div>

        <div style="background:#090d18; border:1px solid #202940; border-radius:10px; padding:12px 15px; display:flex; flex-direction:column; justify-content:space-between;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="mono" style="font-size:12.5px; font-weight:800; color:#22d3ee;">4 SITUATIONAL DRILLS (ARGON vs HYDRA &amp; NFL)</span>
            <span class="mono" style="font-size:11.5px; color:#94a3b8;">N=1,000 TRIALS EACH</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:9px; flex:1;">
            <div style="background:#0d1323; border:1px solid #25314d; border-radius:8px; padding:10px 11px;">
              <div class="mono" style="font-size:11.5px; font-weight:800; color:#22d3ee;">2-MINUTE DRILL (TD REQ)</div>
              <div class="mono" style="font-size:27px; font-weight:900; color:#ffffff; margin:3px 0;">${drills.twoMinute.argon.tdWinPct}%</div>
              <div style="font-size:12.5px; color:#a5b4cc;">vs ${drills.twoMinute.hydra.tdWinPct}% Hydra / ${drills.twoMinute.conv11.tdWinPct}% Spread<br/><strong style="color:#34d399;">${drills.twoMinute.argon.oobStopsPerDrive} OOB/drv • ${drills.twoMinute.argon.sackRatePct}% Sack</strong></div>
            </div>
            <div style="background:#0d1323; border:1px solid #25314d; border-radius:8px; padding:10px 11px;">
              <div class="mono" style="font-size:11.5px; font-weight:800; color:#34d399;">4-MINUTE DRILL (SEAL)</div>
              <div class="mono" style="font-size:27px; font-weight:900; color:#ffffff; margin:3px 0;">${drills.fourMinute.argon.gameSealPct}%</div>
              <div style="font-size:12.5px; color:#a5b4cc;">vs ${drills.fourMinute.hydra.gameSealPct}% Hydra / ${drills.fourMinute.shanahan12.gameSealPct}% Shan.<br/><strong style="color:#34d399;">${drills.fourMinute.argon.meanClockBledSec}s Bled • ${drills.fourMinute.argon.clockGiftMistakePct}% Gift</strong></div>
            </div>
            <div style="background:#0d1323; border:1px solid #25314d; border-radius:8px; padding:10px 11px;">
              <div class="mono" style="font-size:11.5px; font-weight:800; color:#fbbf24;">GOAL LINE (+4.0y / 2-PT)</div>
              <div class="mono" style="font-size:27px; font-weight:900; color:#ffffff; margin:3px 0;">${drills.goalLine.argon.fourDownTdPct}%</div>
              <div style="font-size:12.5px; color:#a5b4cc;">vs ${drills.goalLine.hydra.fourDownTdPct}% Hydra / ${drills.goalLine.shanahan12.fourDownTdPct}% Shan.<br/><strong style="color:#22d3ee;">${drills.goalLine.argon.singleSnapTdPct}% 1st-Snap TD (2-Pt)</strong></div>
            </div>
            <div style="background:#0d1323; border:1px solid #25314d; border-radius:8px; padding:10px 11px;">
              <div class="mono" style="font-size:11.5px; font-weight:800; color:#d8b4fe;">3RD &amp; 9 "STICKS TRAP"</div>
              <div class="mono" style="font-size:27px; font-weight:900; color:#ffffff; margin:3px 0;">${drills.thirdAndNine.argon.conversionPct}%</div>
              <div style="font-size:12.5px; color:#a5b4cc;">vs ${drills.thirdAndNine.hydra.conversionPct}% Hydra / ${drills.thirdAndNine.conv11.conversionPct}% Drop<br/><strong style="color:#34d399;">+${drills.thirdAndNine.argon.meanEpa} EPA • ${drills.thirdAndNine.argon.sackPct}% Sacks</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar z1 mono">
        <span>GOOGLE ARGON R&amp;D // UNMODIFIED 20Hz KINEMATIC ENGINE &amp; 12,000-ITER REGRET-MATCHING NASH SOLVER</span>
        <span style="color:#34d399;">AUDITED: ${results.legalityAudit.snapsAudited.toLocaleString()} SNAPS • 100.0% 7-ON-LOS • 100.0% UNCOVERED ENDS • 100.0% OL BUFFER • 100.0% BACKWARD PITCHES</span>
      </div>
    </div>
  </body></html>`;
}

function buildSimulatorCardHtml(results: any, fullWorkstationBase64: string): string {
  const leg = results.legalityAudit;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${SHARED_CARD_CSS}</style></head><body>
    <div class="card-shell">
      <div class="grid-bg"></div>
      <div class="top-header z1">
        <div>
          <div class="eyebrow-row">
            <span class="pill pill-argon">UNMODIFIED 20Hz PHYSICS ENGINE</span>
            <span class="pill pill-cyan">STRICT 4-RULE NFL LEGALITY</span>
            <span class="pill pill-green">ZERO COVERED-END VIOLATIONS</span>
          </div>
          <h1 style="font-size:35px; font-weight:900; letter-spacing:-0.02em; color:#ffffff;">
            HOW GOOGLE ARGON WAS EVOLVED &amp; STRESS-TESTED
          </h1>
          <p style="font-size:16px; color:#a5b4cc; margin-top:2px;">
            Apples-to-Apples Physics Parity with Hydra &amp; 32 NFL Rosters — Plus Stricter Uncovered-End Eligibility Enforcement
          </p>
        </div>
        <div class="thread-badge mono">ARGON 02 / 11</div>
      </div>

      <div class="z1" style="display:grid; grid-template-columns: 1.12fr 0.88fr; gap:20px; align-items:stretch; flex:1; min-height:0; margin: 11px 0;">
        <!-- LEFT: LIVE WORKSTATION SCREENSHOT -->
        <div style="background:#090d18; border:1px solid #2b2a4c; border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:8px; min-height:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0 4px;">
            <span class="mono" style="font-size:12px; font-weight:800; color:#d8b4fe;">● LIVE ARGON WORKSTATION // MONTE CARLO N=100 FAN &amp; 20Hz TELEMETRY</span>
            <span class="mono" style="font-size:11.5px; color:#22d3ee;">TEAM: ARG ($81.1M)</span>
          </div>
          <div style="flex:1; min-height:0; position:relative; border-radius:7px; overflow:hidden; border:1px solid #20283d; background:#080a0d;">
            <img src="data:image/png;base64,${fullWorkstationBase64}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; display:block;" />
          </div>
        </div>

        <!-- RIGHT: 4 ARCHITECTURAL GUARANTEES -->
        <div style="display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
          <div style="background:#0c111e; border:1px solid #232c45; border-left:4px solid #a855f7; border-radius:8px; padding:12px 15px;">
            <div class="mono" style="font-size:12px; font-weight:800; color:#d8b4fe;">01 // 100% UNMODIFIED 20Hz KINEMATIC ENGINE</div>
            <p style="font-size:14.5px; line-height:1.38; color:#cbd5e1; margin-top:4px;">
              Zero physics tweaks or rigged probabilities: Argon runs on the exact same <strong>dt = 50ms</strong> 1.45G turf-friction, shed-timer, NGS logistic pass, and raycast pitch engine calibrated across 2,500 NFL snaps.
            </p>
          </div>

          <div style="background:#0c111e; border:1px solid #232c45; border-left:4px solid #22d3ee; border-radius:8px; padding:12px 15px;">
            <div class="mono" style="font-size:12px; font-weight:800; color:#22d3ee;">02 // STRICTER 4-RULE NFL OFFICIATING AUDIT</div>
            <p style="font-size:14.5px; line-height:1.38; color:#cbd5e1; margin-top:4px;">
              Auditing Hydra revealed 2 plays with 8 men on LOS covering an eligible TE. Argon enforces <strong>strictly 7 on LOS with uncovered eligible ends (100.0%)</strong>, <strong>&lt;=1.0y OL buffer (100.0%)</strong> &amp; <strong>backward pitches (100.0%)</strong>.
            </p>
          </div>

          <div style="background:#0c111e; border:1px solid #232c45; border-left:4px solid #34d399; border-radius:8px; padding:12px 15px;">
            <div class="mono" style="font-size:12px; font-weight:800; color:#34d399;">03 // 8-FOR-8 POSITIVE-EPA CALL SHEET</div>
            <p style="font-size:14.5px; line-height:1.38; color:#cbd5e1; margin-top:4px;">
              Multi-generation coordinate &amp; timing evolution eliminated dead-weight concepts: <strong>every single Argon play achieves positive mean EPA</strong> across 10 modern 2027 NFL defensive fronts.
            </p>
          </div>

          <div style="background:#0c111e; border:1px solid #232c45; border-left:4px solid #fbbf24; border-radius:8px; padding:12px 15px;">
            <div class="mono" style="font-size:12px; font-weight:800; color:#fbbf24;">04 // ADVERSARIAL ZERO-SUM NASH IMMUNITY</div>
            <p style="font-size:14.5px; line-height:1.38; color:#cbd5e1; margin-top:4px;">
              Solved via <strong>12,000-iteration Regret Matching</strong>: Argon's multi-play chiral mix achieves <strong>+${results.nashEquilibrium.argonNashEpa.toFixed(3)} Nash EPA</strong> (vs Hydra's +${results.nashEquilibrium.hydraNashEpa.toFixed(3)}), defeating omniscient defensive coordinators.
            </p>
          </div>

          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
            <div style="background:#080c16; border:1px solid #222a40; border-radius:7px; padding:8px; text-align:center;">
              <div class="mono" style="font-size:20px; font-weight:900; color:#d8b4fe;">55,000</div>
              <div class="mono" style="font-size:10.5px; color:#94a3b8;">DRIVES SIMMED</div>
            </div>
            <div style="background:#080c16; border:1px solid #222a40; border-radius:7px; padding:8px; text-align:center;">
              <div class="mono" style="font-size:20px; font-weight:900; color:#34d399;">${leg.legalUncoveredEndsPct.toFixed(1)}%</div>
              <div class="mono" style="font-size:10.5px; color:#94a3b8;">4-RULE LEGAL</div>
            </div>
            <div style="background:#080c16; border:1px solid #222a40; border-radius:7px; padding:8px; text-align:center;">
              <div class="mono" style="font-size:20px; font-weight:900; color:#22d3ee;">+${results.nashEquilibrium.argonNashEpa.toFixed(3)}</div>
              <div class="mono" style="font-size:10.5px; color:#94a3b8;">NASH EQ. EPA</div>
            </div>
            <div style="background:#080c16; border:1px solid #222a40; border-radius:7px; padding:8px; text-align:center;">
              <div class="mono" style="font-size:20px; font-weight:900; color:#fbbf24;">$81.1M</div>
              <div class="mono" style="font-size:10.5px; color:#94a3b8;">ACTIVE 11 CAP</div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar z1 mono">
        <span>ALL-22 CHESS WORKSTATION // BOTH ARG ($81.1M) &amp; HYD ($85.5M) LIVE-PLAYABLE SIDE-BY-SIDE</span>
        <span style="color:#d8b4fe;">5 PHILOSOPHIES × 1,000 FULL NFL SEASONS × 10 DEFENSIVE FRONTS</span>
      </div>
    </div>
  </body></html>`;
}

function buildRosterSkillsCardHtml(results: any): string {
  const players = results.rosterPlayers as any[];
  const argonBench = (results.fullGameBenchmarks as any[]).find((b) => b.philosophyName.includes('Argon')) || results.fullGameBenchmarks[0];

  const shortHookMap: Record<string, string> = {
    'Anthony Richardson': '6\'4" 244lb 4.43-Spd Reactor QB1 (92 SPD, 89 PWR, -$47M vs Supermax)',
    'Joe Milton III': '6\'5" 246lb QB2 Displaced Node Passer & Option-Boot Freeze (84 ARM, $3.2M)',
    'Khalil Shakir': 'Former Wildcat QB + Elite Contact-Balance Jet Passer (90 FIN, 79 ARM)',
    'Xavier Worthy': '4.21 Combine-Record Laser & Kinetic Relay Finisher (98 SPD, 97 ACC)',
    'Curtis Samuel': '4.31 RB/WR Hybrid Apex Enforcer & Perimeter DB Stalker (95 SPD, 74 BLK)',
    'Tyler Warren': '6\'6" 256lb Wildcat-TE Direct-Snap Truck & H-Back Lead (88 BLK, 81 ARM)',
    'Tommy Tremble': '4.59 Violent 250lb Move-TE / Fullback Alley Lead Blocker (86 SPD, 86 BLK)',
    'Rasheed Walker': 'Former 7th-Rd Blindside Anchor & Gap-Seal Left Tackle (87 BLK, $12.5M)',
    'Evan Brown': 'Center-Converted Pulling Left Guard (77 SPD, 87 BLK, $6.2M)',
    'Graham Barton': '4.85-Speed Tackle-to-Center Puller on Rookie Deal (79 SPD, 88 BLK, $4.2M)',
    'Tanor Bortolini': '9.87-RAS / 4.94-Spd Guard on $1.3M Day-3 Deal (79 SPD, 86 BLK)',
    'Zach Tom': '5-Position Technician Right Tackle Anchor & Puller (89 BLK, 89 FIN, $13.0M)',
  };

  const rolePillMap: Record<string, { label: string; color: string }> = {
    'Anthony Richardson': { label: 'QB1 (244 LB)', color: '#d8b4fe' },
    'Joe Milton III': { label: 'QB2 (246 LB)', color: '#d8b4fe' },
    'Khalil Shakir': { label: 'WR1 / QB-ARM', color: '#22d3ee' },
    'Tyler Warren': { label: 'TE1 / QB-ARM', color: '#22d3ee' },
    'Xavier Worthy': { label: 'WR2 (4.21 SPD)', color: '#34d399' },
    'Curtis Samuel': { label: 'SL / HYBRID', color: '#34d399' },
    'Tommy Tremble': { label: 'TE2 / H-BACK', color: '#fbbf24' },
    'Rasheed Walker': { label: 'LT (ANCHOR)', color: '#93c5fd' },
    'Evan Brown': { label: 'LG (PULL)', color: '#93c5fd' },
    'Graham Barton': { label: 'C (4.85 SPD)', color: '#93c5fd' },
    'Tanor Bortolini': { label: 'RG ($1.3M RAS)', color: '#93c5fd' },
    'Zach Tom': { label: 'RT (TECH)', color: '#93c5fd' },
  };

  function statColor(val: number, isArm = false): string {
    if (isArm && val >= 78) return '#22d3ee';
    if (val >= 90) return '#34d399';
    if (val >= 83) return '#a855f7';
    if (val >= 74) return '#fbbf24';
    return '#475569';
  }

  const playerCardsHtml = players
    .map((p) => {
      const rp = rolePillMap[p.name] || { label: p.pos, color: '#93c5fd' };
      const stats: [string, number, boolean][] = [
        ['SPD', p.ratings.speed, false],
        ['ACC', p.ratings.accel, false],
        ['PWR', p.ratings.power, false],
        ['FIN', p.ratings.finesse, false],
        ['BLK', p.blockRating ?? p.ratings.power, false],
        ['ARM', p.throwerRating, true],
      ];
      const isPasser = p.throwerRating >= 78;

      const barsHtml = stats
        .map(([lbl, val, isArm]) => {
          const col = statColor(val, isArm);
          return `
            <div style="display:flex; flex-direction:column; gap:3px;">
              <div class="mono" style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:800;">
                <span style="color:#94a3b8;">${lbl}</span>
                <span style="color:${isArm && val >= 78 ? '#22d3ee' : '#f3f6fc'};">${val}</span>
              </div>
              <div style="height:6px; background:#060911; border-radius:3px; overflow:hidden; border:1px solid #1c2436;">
                <div style="width:${val}%; height:100%; background:${col};"></div>
              </div>
            </div>
          `;
        })
        .join('');

      return `
        <div style="background:#0c111e; border:1px solid ${isPasser ? 'rgba(192,132,252,0.52)' : '#212b42'}; border-radius:9px; padding:11px 13px; display:flex; flex-direction:column; justify-content:space-between; gap:7px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <div style="display:flex; align-items:center; gap:7px;">
                <span class="mono" style="padding:2px 6px; border-radius:4px; font-size:11px; font-weight:900; background:rgba(255,255,255,0.06); color:${rp.color}; border:1px solid ${rp.color}55;">
                  ${escapeHtml(rp.label)}
                </span>
                <span style="font-size:16.5px; font-weight:800; color:#ffffff;">${escapeHtml(p.name)}</span>
              </div>
              <span class="mono" style="padding:2px 7px; border-radius:4px; background:rgba(16,185,129,0.16); border:1px solid rgba(52,211,153,0.42); color:#34d399; font-size:12.5px; font-weight:800;">
                $${p.capHitM.toFixed(1)}M
              </span>
            </div>
            <div style="font-size:12.5px; color:#b0bfd4; margin-top:4px; line-height:1.28;">
              ${escapeHtml(shortHookMap[p.name] || p.archetype)}
            </div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px 10px; padding-top:4px; border-top:1px solid #1b2336;">
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
            <span class="pill pill-green">$81.1M ACTIVE 11-STARTER CAP</span>
            <span class="pill pill-argon">ZERO OVERLAP WITH HYDRA ROSTER</span>
            <span class="pill pill-cyan">4 LIVE PASSERS (ARM 79-84) • MAX DEAL $13.0M</span>
          </div>
          <h1 style="font-size:35px; font-weight:900; letter-spacing:-0.02em; color:#ffffff;">
            2027 GOOGLE ARGON MONEYBALL ROSTER &amp; SKILL MATRIX
          </h1>
          <p style="font-size:15.5px; color:#a5b4cc; margin-top:2px;">
            490 lbs of Dual-QB Backfield Mass, a 256-lb Wildcat-TE Passer, 4.21 Record Speed &amp; Dual Sub-4.95 Rookie-Contract Interior Pullers
          </p>
        </div>
        <div class="thread-badge mono">ARGON 03 / 11</div>
      </div>

      <div class="z1" style="display:grid; grid-template-columns:repeat(4, 1fr); grid-template-rows:repeat(3, 1fr); gap:11px; flex:1; margin: 11px 0;">
        ${playerCardsHtml}
      </div>

      <div class="footer-bar z1 mono">
        <span>VIOLET BORDER = LIVE PASSING NODE (4 ON FIELD) • SAVES $4.4M vs HYDRA &amp; $64.9M-$90.9M vs NFL BASELINES</span>
        <span style="color:#34d399;">CAP SURPLUS FUNDS TOP-3 DEFENSE (+${argonBench.projectedTeamNetDiffPerGame.toFixed(2)} PTS/G TEAM NET DIFFERENTIAL)</span>
      </div>
    </div>
  </body></html>`;
}

function buildPlayCardHtml(
  cfg: ArgonPlayCardConfig,
  telemetry: any,
  results: any,
  mcScreenshotBase64: string
): string {
  const meanYdsStr = `${telemetry.meanYds >= 0 ? '+' : ''}${telemetry.meanYds.toFixed(2)}y`;
  const meanEpaStr = `${telemetry.meanEpa >= 0 ? '+' : ''}${telemetry.meanEpa.toFixed(2)}`;
  const explStr = `${telemetry.explosivePct.toFixed(1)}%`;
  const negStr = `${telemetry.negativePlayPct.toFixed(1)}%`;

  const { branchA, branchB } = cfg.buildBranches(telemetry, results.situationalDrills);
  const totalPct = Math.max(1, branchA.pct + branchB.pct);
  const wA = ((branchA.pct / totalPct) * 100).toFixed(1);
  const wB = ((branchB.pct / totalPct) * 100).toFixed(1);

  const menuPills = cfg.menuTags
    .map((t) => `<span class="pill pill-amber">${escapeHtml(t)}</span>`)
    .join('');

  const argonBench = (results.fullGameBenchmarks as any[]).find((b) => b.philosophyName.includes('Argon')) || results.fullGameBenchmarks[0];

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${SHARED_CARD_CSS}</style></head><body>
    <div class="card-shell">
      <div class="grid-bg"></div>
      <div class="top-header z1">
        <div>
          <div class="eyebrow-row">
            <span class="pill pill-argon">PLAY ${cfg.playNumber} OF 8 // 2027 GOOGLE ARGON</span>
            <span class="pill pill-cyan">${escapeHtml(cfg.personnel)}</span>
            ${menuPills}
          </div>
          <h1 style="font-size:35px; font-weight:900; letter-spacing:-0.02em; color:#ffffff;">
            ${escapeHtml(cfg.shortTitle)}
          </h1>
          <p style="font-size:16px; color:#a5b4cc; margin-top:2px;">
            ${escapeHtml(cfg.subtitle)}
          </p>
        </div>
        <div class="thread-badge mono">ARGON ${String(cfg.cardIndex).padStart(2, '0')} / 11</div>
      </div>

      <div class="z1" style="display:grid; grid-template-columns: 1.16fr 0.84fr; gap:20px; align-items:stretch; flex:1; min-height:0; margin: 11px 0;">
        <!-- LEFT: REAL SIMULATOR MONTE CARLO SCREENSHOT -->
        <div style="background:#090d18; border:1px solid #2b2a4c; border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:7px; min-height:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0 4px;">
            <span class="mono" style="font-size:12px; font-weight:800; color:#22d3ee;">● SIMULATOR MONTE CARLO (N=100) // 20Hz FIELD CAPTURE</span>
            <span class="mono" style="font-size:11.5px; color:#fbbf24; font-weight:700;">${escapeHtml(cfg.featuredDefenseLabel)}</span>
          </div>
          <div style="flex:1; min-height:0; border-radius:7px; overflow:hidden; border:1px solid #20283d; background:#080a0d; position:relative;">
            <img src="data:image/png;base64,${mcScreenshotBase64}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center top; display:block;" />
          </div>
        </div>

        <!-- RIGHT: TELEMETRY + OPTIONALITY SPLITS + <=280 CHAR EXPLAINER -->
        <div style="display:flex; flex-direction:column; justify-content:space-between; gap:10px; min-height:0;">
          <!-- 4 KPI TILES -->
          <div style="background:#0c111e; border:1px solid #242d46; border-radius:10px; padding:12px 15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="mono" style="font-size:11.5px; font-weight:800; color:#d8b4fe;">EMPIRICAL 20Hz TENSOR (10 DEFENSES)</span>
              <span class="mono" style="font-size:11.5px; color:#34d399; font-weight:800;">✓ FUM LOST: ${(telemetry.fumbleLostPct ?? 0).toFixed(1)}% • 4-RULE LEGAL</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:9px;">
              <div style="background:#070a13; border:1px solid #1e283e; border-radius:7px; padding:9px 6px; text-align:center;">
                <div class="mono" style="font-size:10.5px; color:#94a3b8; font-weight:700;">MEAN YARDS</div>
                <div class="mono" style="font-size:22px; font-weight:900; color:#34d399; margin-top:2px;">${meanYdsStr}</div>
              </div>
              <div style="background:#070a13; border:1px solid #1e283e; border-radius:7px; padding:9px 6px; text-align:center;">
                <div class="mono" style="font-size:10.5px; color:#94a3b8; font-weight:700;">MEAN EPA</div>
                <div class="mono" style="font-size:22px; font-weight:900; color:${telemetry.meanEpa >= 0 ? '#22d3ee' : '#cbd5e1'}; margin-top:2px;">${meanEpaStr}</div>
              </div>
              <div style="background:#070a13; border:1px solid #1e283e; border-radius:7px; padding:9px 6px; text-align:center;">
                <div class="mono" style="font-size:10.5px; color:#94a3b8; font-weight:700;">${cfg.playId === 'ARGON_GOALLINE_CYCLOTRON' ? 'TD RATE' : 'EXPL 15y+'}</div>
                <div class="mono" style="font-size:22px; font-weight:900; color:#fbbf24; margin-top:2px;">${explStr}</div>
              </div>
              <div style="background:#070a13; border:1px solid #1e283e; border-radius:7px; padding:9px 6px; text-align:center;">
                <div class="mono" style="font-size:10.5px; color:#94a3b8; font-weight:700;">NEG / SACK</div>
                <div class="mono" style="font-size:22px; font-weight:900; color:${telemetry.negativePlayPct <= 5 ? '#34d399' : '#f87171'}; margin-top:2px;">${negStr}</div>
              </div>
            </div>
          </div>

          <!-- POST-SNAP OPTIONALITY SPLIT BAR -->
          <div style="background:#0c111e; border:1px solid #242d46; border-radius:10px; padding:12px 15px;">
            <div class="mono" style="font-size:11.5px; font-weight:800; color:#22d3ee; margin-bottom:8px;">
              POST-SNAP CONTINUUM &amp; EMPIRICAL BRANCH SPLIT
            </div>
            <div style="height:15px; width:100%; background:#060911; border-radius:6px; overflow:hidden; display:flex; border:1px solid #1f2940; margin-bottom:9px;">
              <div style="width:${wA}%; height:100%; background:${branchA.color};"></div>
              <div style="width:${wB}%; height:100%; background:${branchB.color};"></div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:9px;">
              <div style="background:#070a13; border-left:3px solid ${branchA.color}; padding:7px 9px; border-radius:4px;">
                <div class="mono" style="font-size:10.5px; font-weight:800; color:${branchA.color};">${escapeHtml(branchA.label)}</div>
                <div class="mono" style="font-size:14px; font-weight:800; color:#ffffff; margin-top:2px;">${escapeHtml(branchA.detail)}</div>
              </div>
              <div style="background:#070a13; border-left:3px solid ${branchB.color}; padding:7px 9px; border-radius:4px;">
                <div class="mono" style="font-size:10.5px; font-weight:800; color:${branchB.color};">${escapeHtml(branchB.label)}</div>
                <div class="mono" style="font-size:14px; font-weight:800; color:#ffffff; margin-top:2px;">${escapeHtml(branchB.detail)}</div>
              </div>
            </div>
          </div>

          <!-- <= 280 CHAR HOW & WHY EXPLAINER -->
          <div style="background:linear-gradient(180deg, rgba(16,18,36,0.98) 0%, rgba(10,14,26,0.98) 100%); border:1px solid #383363; border-left:4px solid #a855f7; border-radius:10px; padding:14px 17px; flex:1; min-height:0; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:7px;">
                <span class="mono" style="font-size:12px; font-weight:900; color:#d8b4fe;">FIRST-PRINCIPLES MECHANISM (280-CHAR BRIEF)</span>
                <span class="mono" style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(168,85,247,0.18); color:#e9d5ff; font-weight:700;">
                  ${cfg.explainer280.length} / 280 CHARS
                </span>
              </div>
              <p style="font-size:17px; line-height:1.43; color:#f3f6fc; font-weight:500;">
                ${escapeHtml(cfg.explainer280)}
              </p>
            </div>
            <div class="mono" style="font-size:11px; color:#34d399; font-weight:800; padding-top:8px; border-top:1px solid #1e273d; margin-top:8px;">
              NFL LEGALITY: ${escapeHtml(cfg.legalBadge)}
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar z1 mono">
        <span>2027 GOOGLE ARGON ($81.1M CAP) // ${argonBench.ppgStandardDc.toFixed(2)} PPG STD • ${argonBench.ppgAdversarialNashDc.toFixed(2)} PPG NASH • +${results.nashEquilibrium.argonNashEpa.toFixed(3)} NASH EPA • +${argonBench.projectedTeamNetDiffPerGame.toFixed(2)} NET PTS/G</span>
        <span style="color:#d8b4fe;">ALL-22 CHESS 20Hz KINEMATIC ENGINE</span>
      </div>
    </div>
  </body></html>`;
}

async function main(): Promise<void> {
  const resultsPath = path.join(process.cwd(), 'src', 'data', 'argon_2027_results.json');
  if (!fs.existsSync(resultsPath)) {
    throw new Error(`Missing ${resultsPath} — run npx tsx src/argon_2027_playtest.ts first`);
  }
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

  fs.mkdirSync(WORKSPACE_OUT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('dist/index.html missing — run npm run build first');
  }

  console.log('[1/3] Starting production All-22 Simulator server & Headless Chrome (2x Retina)...');
  const server = await startDistServer(distDir, 5192);
  const { proc, wsUrl, tmpProfile } = await launchHeadlessChrome(9245);
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

    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5192/' });
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 120));
      const check = await cdp.send('Runtime.evaluate', {
        expression: 'Boolean(window.__all22App)',
        returnByValue: true,
      });
      if (check?.result?.value === true) break;
    }

    console.log('[2/3] Running live N=100 Monte Carlo batches & capturing 20 Hz screenshots for all 8 Argon plays...');
    const mcScreenshots: Record<string, string> = {};
    let fullWorkstationBase64 = '';

    for (const cfg of PLAY_CARD_CONFIGS) {
      const prepExpr = `(() => {
        const app = window.__all22App;
        const offSel = document.getElementById('off-team-select');
        if (offSel) { offSel.value = 'ARG'; offSel.dispatchEvent(new Event('change')); }
        app.autoMatchDefense = true;
        app.loadPlayPreset('${cfg.playId}');
        app.renderOpts.selectedAgentId = null;
        app.renderOpts.hoveredAgentId = null;

        const snaps = app.snapshots;
        let bestTick = Math.min(28, snaps.length - 1);
        const playId = '${cfg.playId}';

        if (playId === 'ARGON_NOBLE_KINETIC_RELAY' || playId === 'ARGON_WILDCAT_TRIPLE_PITCH') {
          const latFlight = snaps.findIndex((s) => s.exoticEvent === 'HOOK_AND_LATERAL' && s.ball && s.ball.state === 'IN_FLIGHT' && s.ball.isLateral);
          const latAny = snaps.findIndex((s) => s.exoticEvent === 'HOOK_AND_LATERAL');
          bestTick = latFlight > 0 ? latFlight : latAny > 0 ? Math.min(snaps.length - 1, latAny + 3) : Math.min(34, snaps.length - 1);
        } else if (playId === 'ARGON_REACTOR_SWEEP_RIGHT' || playId === 'ARGON_4MIN_LEFT_MONOLITH') {
          bestTick = Math.min(32, snaps.length - 1);
        } else {
          const optPassFlight = snaps.findIndex((s) => s.exoticEvent === 'OPTION_PASS' && s.ball && s.ball.state === 'IN_FLIGHT' && !s.ball.isLateral);
          const fwdFlight = snaps.findIndex((s) => s.ball && s.ball.state === 'IN_FLIGHT' && !s.ball.isLateral);
          if (optPassFlight > 0) bestTick = Math.min(snaps.length - 1, optPassFlight + 2);
          else if (fwdFlight > 0) bestTick = Math.min(snaps.length - 1, fwdFlight + 2);
        }

        app.currentTick = bestTick;
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

      if (cfg.playId === 'ARGON_NOBLE_KINETIC_RELAY') {
        const fullShot = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          clip: { x: 0, y: 0, width: 1660, height: 920, scale: 1 },
        });
        fullWorkstationBase64 = fullShot.data;
      }
    }

    console.log('[3/3] Rendering all 11 self-contained 1600x900 (3200x1800 Retina) Google Argon Infographic Cards...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    const cardsToRender: { filename: string; html: string }[] = [
      {
        filename: 'card_01_argon_philosophy.png',
        html: buildPhilosophyCardHtml(results),
      },
      {
        filename: 'card_02_argon_simulator_architecture.png',
        html: buildSimulatorCardHtml(results, fullWorkstationBase64),
      },
      {
        filename: 'card_03_argon_moneyball_roster.png',
        html: buildRosterSkillsCardHtml(results),
      },
      ...PLAY_CARD_CONFIGS.map((cfg) => ({
        filename: cfg.fileSlug,
        html: buildPlayCardHtml(
          cfg,
          results.argonPlayTelemetry[cfg.playId],
          results,
          mcScreenshots[cfg.playId]
        ),
      })),
    ];

    const tmpHtmlPath = path.join(tmpProfile, 'render_argon_card.html');
    const tmpHtmlUrl = 'file:///' + tmpHtmlPath.replace(/\\/g, '/');

    for (const card of cardsToRender) {
      fs.writeFileSync(tmpHtmlPath, card.html, 'utf8');
      await cdp.send('Page.navigate', { url: tmpHtmlUrl });
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

    console.log(`\nAll 11 Google Argon infographic cards written to:\n  - ${WORKSPACE_OUT_DIR}\n  - ${ARTIFACT_DIR}`);
  } finally {
    cdp.close();
    proc.kill();
    server.close();
  }
}

main().catch((err) => {
  console.error('Argon card generation failed:', err);
  process.exit(1);
});
