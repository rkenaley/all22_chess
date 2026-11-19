import {
  All22KinematicEngine,
  SimAgent,
  SimFieldContext,
  PlayTickSnapshot,
  BlockRoleType,
  GapOrSetCode,
  LeverageBias,
  evaluateMacroMatchup,
  MacroRPSAnalysis,
} from './engine';
import { ThemeManager, SkinId } from './theme';
import { TacticalRenderer, RenderOptions, MonteCarloRunTrace } from './renderer';
import {
  RoutePresetId,
  RECEIVER_EVOLUTION_SEEDS,
  BACKFIELD_EVOLUTION_SEEDS,
  applyRoutePresetToAgent,
} from './route_presets';
import {
  HYDRA_2027_TEAM_ENTRY,
  HYDRA_2027_PLAYBOOK,
} from './vanguard_2027_playbook';
import {
  ARGON_2027_TEAM_ENTRY,
  ARGON_2027_PLAYBOOK,
} from './argon_2027_playbook';
import {
  KBC_2027_TEAM_ENTRY,
  KBC_2027_PLAYBOOK,
  detectDefensiveAttractor,
} from './bistable_packaged_playbook';
import { APEX_2027_TEAM_ENTRY, APEX_2027_PLAYBOOK } from './apex_2027_playbook';

import nflTeamsRaw from './data/nfl_teams_32.json';
import evolvedPassesRaw from './data/evolved_plays_catalog.json';
import evolvedRunsRaw from './data/evolved_running_schemes.json';

type InteractionMode = 'SELECT' | 'BLOCK' | 'ROUTE';

export type DownDistanceSituation = '1ST_10' | '3RD_SHORT' | '3RD_LONG' | 'RED_ZONE';

interface PlayPreset {
  id: string;
  name: string;
  category: 'PASS' | 'RUN';
  personnel: string;
  situations: DownDistanceSituation[];
  situationBadge?: string;
  buildOffense: () => SimAgent[];
}

class All22WorkstationApp {
  private engine = new All22KinematicEngine();
  private themeManager = new ThemeManager();
  private renderer!: TacticalRenderer;

  private agents: SimAgent[] = [];
  private snapshots: PlayTickSnapshot[] = [];
  private currentTick = 0;
  private isPlaying = false;
  private rafId: number | null = null;
  private lastStepTime = 0;

  private mode: InteractionMode = 'SELECT';
  private awaitingCanvasTargetPick = false;
  private isMonteCarloView = false;
  private activeSituationFilter: 'ALL' | DownDistanceSituation = 'ALL';
  private motionMode: 'OFF' | 'JET_RIGHT' | 'JET_LEFT' | 'ORBIT' = 'OFF';
  private declaredMikeId: string | null = null;
  private autoMatchDefense = true;
  public customFieldContext: SimFieldContext | null = null;

  private renderOpts: RenderOptions = {
    showForceVectors: true,
    showPocketPoly: true,
    showLeverageCones: true,
    showDefenseAssignments: true,
    selectedAgentId: 'LT',
    hoveredAgentId: null,
    designatedMikeId: null,
    activeDragLine: null,
    firstDownYards: 10.0,
  };

  private dragSourceAgent: SimAgent | null = null;
  private isDraggingPosition = false;
  private draggingWaypointIndex: number | null = null;

  private presets: PlayPreset[] = [];
  private activePresetId = '';
  private teamsMap: Record<string, any> = {};

  constructor() {
    const canvas = document.getElementById('tactical-canvas') as HTMLCanvasElement;
    this.renderer = new TacticalRenderer(canvas);

    this.initTeamSelectors();
    this.initPlayPresets();
    this.bindUIEvents(canvas);

    this.themeManager.applySkin('broadcast-analytics');
    this.loadPlayPreset(this.presets[0].id);

    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.drawCurrentFrame();
    });
    this.renderer.resize();
    this.drawCurrentFrame();
    (window as any).__all22App = this;
  }

  private initTeamSelectors(): void {
    const offSel = document.getElementById('off-team-select') as HTMLSelectElement;
    const defSel = document.getElementById('def-team-select') as HTMLSelectElement;

    if (nflTeamsRaw && typeof nflTeamsRaw === 'object' && !Array.isArray(nflTeamsRaw)) {
      this.teamsMap = {
        APX: APEX_2027_TEAM_ENTRY,
        KBC: KBC_2027_TEAM_ENTRY,
        ARG: ARGON_2027_TEAM_ENTRY,
        HYD: HYDRA_2027_TEAM_ENTRY,
        ...(nflTeamsRaw as Record<string, any>),
      };
    } else if (Array.isArray(nflTeamsRaw)) {
      this.teamsMap['APX'] = APEX_2027_TEAM_ENTRY;
      this.teamsMap['KBC'] = KBC_2027_TEAM_ENTRY;
      this.teamsMap['ARG'] = ARGON_2027_TEAM_ENTRY;
      this.teamsMap['HYD'] = HYDRA_2027_TEAM_ENTRY;
      for (const t of nflTeamsRaw) {
        const code = t.id || t.abbr;
        if (code) this.teamsMap[code] = t;
      }
    }

    const codes = Object.keys(this.teamsMap);
    const teamList =
      codes.length > 0
        ? codes.map((code) => ({
            code,
            name: this.teamsMap[code].fullName || `${this.teamsMap[code].city || ''} ${this.teamsMap[code].name || code}`.trim(),
          }))
        : [
            { code: 'PHI', name: 'Philadelphia Eagles' },
            { code: 'BAL', name: 'Baltimore Ravens' },
            { code: 'SF', name: 'San Francisco 49ers' },
            { code: 'KC', name: 'Kansas City Chiefs' },
            { code: 'DET', name: 'Detroit Lions' },
          ];

    offSel.innerHTML = '';
    defSel.innerHTML = '';

    const defaultOff = teamList.findIndex((t) => t.code === 'PHI');
    const defaultDef = teamList.findIndex((t) => t.code === 'BAL');

    teamList.forEach((t, i) => {
      const label = `${t.code} — ${t.name}`;
      const isOff = defaultOff >= 0 ? i === defaultOff : i === 0;
      const isDef = defaultDef >= 0 ? i === defaultDef : i === 1;
      offSel.add(new Option(label, t.code, isOff, isOff));
      defSel.add(new Option(label, t.code, isDef, isDef));
    });
  }

  private applyTeamPersonnel(agents: SimAgent[]): void {
    const offCode = (document.getElementById('off-team-select') as HTMLSelectElement)?.value || 'PHI';
    const defCode = (document.getElementById('def-team-select') as HTMLSelectElement)?.value || 'BAL';
    const offTeam = this.teamsMap[offCode];
    const defTeam = this.teamsMap[defCode];
    const isCustomVanguardPresetWithMatchingTeam =
      (offCode === 'APX' && this.activePresetId.startsWith('APEX_')) ||
      (offCode === 'KBC' && this.activePresetId.startsWith('KBC_')) ||
      (offCode === 'HYD' && this.activePresetId.startsWith('HYDRA_')) ||
      (offCode === 'ARG' && this.activePresetId.startsWith('ARGON_'));

    if (offTeam && Array.isArray(offTeam.offense) && !isCustomVanguardPresetWithMatchingTeam) {
      for (const a of agents.filter((x) => x.side === 'OFF')) {
        const match =
          offTeam.offense.find((p: any) => p.id === a.id) ||
          (a.id === 'SL' ? offTeam.offense.find((p: any) => p.id === 'SLOT') : null) ||
          offTeam.offense.find((p: any) => p.label === a.pos);

        if (match) {
          a.name = match.name || a.id;
          a.jersey = match.scouting?.jersey ?? undefined;
          const r = match.ratings || {};
          const isOl = ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.pos);
          a.ratings = {
            speed: r.spd ?? a.ratings.speed,
            accel: r.acc ?? a.ratings.accel,
            power: isOl
              ? Math.round(((r.str ?? 88) * 0.4 + (r.pbk_anchor ?? 86) * 0.3 + (r.rbk_power ?? 86) * 0.3))
              : Math.round(((r.str ?? 76) * 0.5 + (r.btk_power ?? r.rbk_power ?? 78) * 0.5)),
            finesse: isOl
              ? Math.round(((r.agi ?? 74) * 0.3 + (r.pbk_lateral ?? 85) * 0.35 + (r.rbk_reach ?? 85) * 0.35))
              : Math.round(((r.agi ?? 86) * 0.45 + (r.rr_short ?? r.elusiveness ?? r.tha_short ?? 85) * 0.55)),
            awareness: r.pre_snap_read ?? match.scouting?.ovr ?? 86,
          };
        }
      }
    }

    if (defTeam && Array.isArray(defTeam.defense)) {
      const defRoster: any[] = defTeam.defense;
      const mapDefId = (agent: SimAgent): any => {
        const direct = defRoster.find((p) => p.id === agent.id || p.label === agent.id);
        if (direct) return direct;
        if (agent.id === 'NT' || agent.id === '0T_NT' || agent.id === '4i_L') {
          return defRoster.find((p) => p.id === 'DT1') || defRoster[1];
        }
        if (agent.id === '3T' || agent.id === '4i_R') {
          return defRoster.find((p) => p.id === 'DT2') || defRoster[2];
        }
        if (agent.id === 'LOLB') {
          return defRoster.find((p) => p.id === 'LDE') || defRoster[0];
        }
        if (agent.id === 'ROLB') {
          return defRoster.find((p) => p.id === 'RDE') || defRoster[3];
        }
        if (agent.id === 'WILL') {
          return defRoster.find((p) => p.id === 'WLB') || defRoster[4];
        }
        if (agent.id === 'MIKE') {
          return defRoster.find((p) => p.id === 'MLB') || defRoster[5];
        }
        if (agent.id === 'DIME') {
          return defRoster.find((p) => p.id === 'NCB') || defRoster[6];
        }
        return null;
      };

      for (const d of agents.filter((x) => x.side === 'DEF')) {
        const match = mapDefId(d);
        if (match) {
          d.name = match.name || d.id;
          d.jersey = match.scouting?.jersey ?? undefined;
          const r = match.ratings || {};
          const isFront = ['DE', 'DT', 'NT', 'EDGE'].includes(d.pos);
          d.ratings = {
            speed: r.spd ?? d.ratings.speed,
            accel: r.acc ?? d.ratings.accel,
            power: isFront
              ? Math.round(((r.str ?? 86) * 0.45 + (r.rush_power ?? 86) * 0.55))
              : Math.round(((r.str ?? 74) * 0.45 + (r.tak_hit_power ?? 82) * 0.55)),
            finesse: isFront
              ? Math.round(((r.rush_speed ?? 84) * 0.5 + (r.bsh_shed ?? 85) * 0.5))
              : Math.round(((r.cov_man ?? 82) * 0.5 + (r.cov_zone ?? 84) * 0.5)),
            awareness: r.play_rec ?? match.scouting?.ovr ?? 85,
          };
        }
      }
    }
  }

  private initPlayPresets(): void {
    this.presets = [
      // 5 CANONICAL PASS CONCEPTS
      {
        id: 'DAGGER_HALF_SLIDE',
        name: 'GUN TRIPS // DAGGER (50 HALF-SLIDE)',
        category: 'PASS',
        personnel: '11 PERS',
        situations: ['1ST_10', '3RD_LONG'],
        situationBadge: 'DEEP DIG',
        buildOffense: () => this.createStandardOffense('PASS_HALF_SLIDE'),
      },
      {
        id: 'PA_MAX_CHIP_FLOOD',
        name: 'GUN BUNCH // PA FLOOD (CHIP & RELEASE)',
        category: 'PASS',
        personnel: '11 PERS',
        situations: ['1ST_10', '3RD_LONG', 'RED_ZONE'],
        situationBadge: 'SAIL/FLOOD',
        buildOffense: () => this.createStandardOffense('PASS_CHIP_FLOOD'),
      },
      {
        id: 'PA_UNDER_CENTER_BOOT',
        name: 'UNDER CENTER 12P // PA WIDE ZONE BOOT (SAIL/CROSS)',
        category: 'PASS',
        personnel: '12 PERS',
        situations: ['1ST_10', 'RED_ZONE'],
        situationBadge: 'PA BOOTLEG',
        buildOffense: () => this.createStandardOffense('PASS_UC_BOOT'),
      },
      {
        id: 'QUICK_SLANT_FLAT',
        name: 'GUN SPREAD // QUICK SLANT-FLAT (3-STEP)',
        category: 'PASS',
        personnel: '11 PERS',
        situations: ['3RD_SHORT', 'RED_ZONE'],
        situationBadge: '3-STEP QUICK',
        buildOffense: () => this.createStandardOffense('PASS_QUICK_SLANT'),
      },
      {
        id: 'MESH_RAIL_CONCEPT',
        name: 'GUN EMPTY/ACE // SHALLOW MESH + WHEEL',
        category: 'PASS',
        personnel: '11 PERS',
        situations: ['3RD_SHORT', '3RD_LONG', 'RED_ZONE'],
        situationBadge: 'RUB/WHEEL',
        buildOffense: () => this.createStandardOffense('PASS_MESH'),
      },
      {
        id: 'FOUR_VERTS_SEAM',
        name: 'GUN 2x2 // FOUR VERTICALS SEAM BENDER',
        category: 'PASS',
        personnel: '11 PERS',
        situations: ['1ST_10', '3RD_LONG'],
        situationBadge: 'SEAM BENDER',
        buildOffense: () => this.createStandardOffense('PASS_FOUR_VERTS'),
      },
      // 5 CANONICAL RUN CONCEPTS
      {
        id: 'DUO_COMBO_CLIMB',
        name: 'SINGLEBACK ACE // DUO DOUBLE-CLIMB',
        category: 'RUN',
        personnel: '12 PERS',
        situations: ['1ST_10', '3RD_SHORT'],
        situationBadge: 'POWER DUO',
        buildOffense: () => this.createStandardOffense('RUN_DUO_COMBO'),
      },
      {
        id: 'POWER_O_PULL_LG',
        name: 'I-FORM HEAVY // POWER O (LG PULL + KICK)',
        category: 'RUN',
        personnel: '21 PERS',
        situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
        situationBadge: 'PULL/KICK',
        buildOffense: () => this.createStandardOffense('RUN_POWER_PULL'),
      },
      {
        id: 'INSIDE_ZONE_SPLIT',
        name: 'GUN SPLIT // INSIDE ZONE (COMBO + TE INSERT)',
        category: 'RUN',
        personnel: '11 PERS',
        situations: ['1ST_10', '3RD_SHORT'],
        situationBadge: 'COMBO INSERT',
        buildOffense: () => this.createStandardOffense('RUN_INSIDE_ZONE'),
      },
      {
        id: 'OUTSIDE_ZONE_STRETCH',
        name: 'UNDER CENTER // WIDE ZONE LEFT (REACH)',
        category: 'RUN',
        personnel: '11 PERS',
        situations: ['1ST_10', 'RED_ZONE'],
        situationBadge: 'WIDE REACH',
        buildOffense: () => this.createStandardOffense('RUN_OUTSIDE_ZONE'),
      },
      {
        id: 'PIN_PULL_SWEEP',
        name: 'GUN ACE // PIN & PULL SWEEP RIGHT (C+LG PULL)',
        category: 'RUN',
        personnel: '12 PERS',
        situations: ['1ST_10', '3RD_SHORT', 'RED_ZONE'],
        situationBadge: 'PIN & PULL',
        buildOffense: () => this.createStandardOffense('RUN_PIN_PULL'),
      },
    ];

    // Also ingest genuine evolved passing plays with their actual evolved route waypoints
    const passArr = Array.isArray(evolvedPassesRaw) ? evolvedPassesRaw.slice(0, 4) : [];
    passArr.forEach((p: any, idx: number) => {
      const label = p.initialPlayName
        ? `EVO PASS // ${p.initialPlayName} (${p.defCall || 'MOFC'})`
        : `EVOLVED PASS CONCEPT #${idx + 1}`;
      const evoPassSituations: DownDistanceSituation[] =
        idx === 0
          ? ['1ST_10', '3RD_LONG']
          : idx === 1
          ? ['3RD_SHORT', 'RED_ZONE']
          : idx === 2
          ? ['1ST_10', '3RD_LONG']
          : ['3RD_SHORT', 'RED_ZONE'];
      const evoBadge = idx === 0 ? 'EVO PA' : idx === 1 ? 'EVO QUICK' : idx === 2 ? 'EVO DIG' : 'EVO MESH';

      this.presets.push({
        id: `EVOLVED_PASS_${idx}`,
        name: label,
        category: 'PASS',
        personnel: '11 PERS',
        situations: evoPassSituations,
        situationBadge: evoBadge,
        buildOffense: () => this.buildEvolvedPassOffense(p),
      });
    });

    // Ingest evolved running schemes mapped to their actual conceptId
    const runArr = Array.isArray(evolvedRunsRaw) ? evolvedRunsRaw.slice(0, 4) : [];
    const seenRunConcepts = new Set<string>();
    runArr.forEach((r: any, idx: number) => {
      const cid: string = r.conceptId || `RUN_${idx}`;
      if (seenRunConcepts.has(cid)) return;
      seenRunConcepts.add(cid);
      const schemeMap: Record<string, Parameters<typeof this.createStandardOffense>[0]> = {
        RUN_PIN_PULL: 'RUN_PIN_PULL',
        RUN_POWER_O: 'RUN_POWER_PULL',
        RUN_INSIDE_ZONE: 'RUN_INSIDE_ZONE',
        RUN_OUTSIDE_ZONE: 'RUN_OUTSIDE_ZONE',
        RUN_DUO: 'RUN_DUO_COMBO',
      };
      const mapped = schemeMap[cid] || 'RUN_PIN_PULL';
      const evoRunSituations: DownDistanceSituation[] = cid.includes('PIN_PULL') || cid.includes('POWER')
        ? ['1ST_10', '3RD_SHORT', 'RED_ZONE']
        : ['1ST_10', '3RD_SHORT'];
      const evoBadge = cid.includes('PIN_PULL')
        ? 'EVO PIN/PULL'
        : cid.includes('POWER')
        ? 'EVO POWER'
        : cid.includes('DUO')
        ? 'EVO DUO'
        : 'EVO ZONE';

      this.presets.push({
        id: `EVOLVED_RUN_${idx}`,
        name: `EVO RUN // ${(r.conceptName || cid).toUpperCase().slice(0, 32)}`,
        category: 'RUN',
        personnel: '12 PERS',
        situations: evoRunSituations,
        situationBadge: evoBadge,
        buildOffense: () => this.createStandardOffense(mapped),
      });
    });

    // Ingest 2027 Kinetic Bistable Continuum (KBC), Google Argon & Hydra Vanguard Menus
    // Place right after the 11 canonical plays so default boot preset stays unchanged
    const kbcItems: PlayPreset[] = KBC_2027_PLAYBOOK.map((kp) => ({
      id: kp.id,
      name: kp.name,
      category: kp.category,
      personnel: kp.personnel,
      situations: kp.situations,
      situationBadge: kp.situationBadge,
      buildOffense: () => kp.buildBaseOffense(),
    }));
    const argonItems: PlayPreset[] = ARGON_2027_PLAYBOOK.map((ap) => ({
      id: ap.id,
      name: ap.name,
      category: ap.category,
      personnel: ap.personnel,
      situations: ap.situations,
      situationBadge: ap.situationBadge,
      buildOffense: () => ap.buildOffense(),
    }));
    const apexItems: PlayPreset[] = APEX_2027_PLAYBOOK.map((ap) => ({
      id: ap.id,
      name: ap.name,
      category: ap.category,
      personnel: ap.personnel,
      situations: ap.situations,
      situationBadge: ap.situationBadge,
      buildOffense: () => ap.buildOffense(),
    }));
    const hydraItems: PlayPreset[] = HYDRA_2027_PLAYBOOK.map((hp) => ({
      id: hp.id,
      name: hp.name,
      category: hp.category,
      personnel: hp.personnel,
      situations: hp.situations,
      situationBadge: hp.situationBadge,
      buildOffense: () => hp.buildOffense(),
    }));
    this.presets.splice(11, 0, ...kbcItems, ...apexItems, ...argonItems, ...hydraItems);

    this.renderPlaybookList();
  }

  private renderPlaybookList(): void {
    const listEl = document.getElementById('playbook-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const filtered = this.presets.filter((p) => {
      if (this.activeSituationFilter === 'ALL') return true;
      return p.situations && p.situations.includes(this.activeSituationFilter);
    });

    for (const preset of filtered) {
      const row = document.createElement('div');
      row.className = 'play-item';
      if (preset.id === this.activePresetId) {
        row.classList.add('active');
      }
      row.dataset.id = preset.id;
      const badgeColor = preset.category === 'PASS' ? 'var(--accent-primary)' : 'var(--accent-positive)';
      const sitBadgeHtml = preset.situationBadge
        ? `<span class="sit-badge">${preset.situationBadge}</span>`
        : '';

      row.innerHTML = `
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:6px;">${preset.name}</span>
        <span class="play-meta">
          ${sitBadgeHtml}
          <span style="color:${badgeColor}; font-weight:700;">${preset.category}</span>
        </span>
      `;
      row.addEventListener('click', () => this.loadPlayPreset(preset.id));
      listEl.appendChild(row);
    }
  }

  private buildEvolvedPassOffense(evoPlay: any): SimAgent[] {
    const base = this.createStandardOffense(
      evoPlay.optimizedBlocking === 'MAX_PROTECT' ? 'PASS_CHIP_FLOOD' : 'PASS_HALF_SLIDE'
    );
    const routesObj = evoPlay.routes || {};
    for (const agent of base) {
      const rKey = agent.id === 'SL' ? 'SLOT' : agent.id;
      const rData = routesObj[rKey];
      if (rData && Array.isArray(rData.waypoints) && rData.waypoints.length > 0) {
        agent.assignment.role = 'ROUTE';
        agent.readOrder = rData.readOrder || agent.readOrder;
        agent.assignment.waypoints = rData.waypoints.map((w: any) => ({
          x: +Number(w.x).toFixed(2),
          y: +Number(w.y).toFixed(2),
        }));
      }
    }
    return base;
  }

  private createStandardOffense(
    scheme:
      | 'PASS_HALF_SLIDE'
      | 'PASS_CHIP_FLOOD'
      | 'PASS_UC_BOOT'
      | 'PASS_QUICK_SLANT'
      | 'PASS_MESH'
      | 'PASS_FOUR_VERTS'
      | 'RUN_DUO_COMBO'
      | 'RUN_POWER_PULL'
      | 'RUN_INSIDE_ZONE'
      | 'RUN_OUTSIDE_ZONE'
      | 'RUN_PIN_PULL'
  ): SimAgent[] {
    const makeAgent = (
      id: string,
      pos: string,
      x: number,
      y: number,
      role: BlockRoleType,
      gapOrSet: GapOrSetCode,
      primaryTargetId: string | null = null,
      secondaryTargetId: string | null = null,
      leverage: LeverageBias = 'INSIDE_OUT',
      waypoints: Array<{ x: number; y: number }> = [],
      readOrder?: number
    ): SimAgent => ({
      id,
      label: pos,
      side: 'OFF',
      pos,
      startX: x,
      startY: y,
      x,
      y,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      engagedWithId: null,
      leverageScore: 0,
      readOrder,
      ratings: { speed: 78, accel: 82, power: 88, finesse: 86, awareness: 88 },
      assignment: {
        role,
        primaryTargetId,
        secondaryTargetId,
        gapOrSet,
        leverage,
        climbOrChipDelaySec: 0.65,
        waypoints,
      },
    });

    if (scheme === 'RUN_DUO_COMBO') {
      return [
        makeAgent('LT', 'LT', -3.2, -0.4, 'MAN_BLOCK', 'C_LEFT', 'RDE', null, 'INSIDE_OUT'),
        makeAgent('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'NEUTRAL'),
        makeAgent('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        makeAgent('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'NEUTRAL'),
        makeAgent('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
        makeAgent('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        makeAgent('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
        makeAgent('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
        makeAgent('SL', 'SL', -6.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'OUTSIDE_IN'),
        makeAgent('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.4, y: -4.8 }]),
        makeAgent('RB', 'RB', -1.2, -4.8, 'BALL_CARRIER', 'B_RIGHT', null, null, 'NEUTRAL', [
          { x: 0.8, y: -1.5 },
          { x: 2.1, y: 4.0 },
          { x: 2.4, y: 14.0 },
        ]),
      ];
    }

    if (scheme === 'RUN_POWER_PULL') {
      return [
        makeAgent('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'),
        makeAgent('LG', 'LG', -1.6, -0.3, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
          { x: -0.5, y: -1.4 },
          { x: 2.8, y: -1.1 },
          { x: 3.4, y: 3.8 },
        ]),
        makeAgent('C', 'C', 0.0, -0.2, 'MAN_BLOCK', 'A_LEFT', 'NT', null, 'OUTSIDE_IN'),
        makeAgent('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
        makeAgent('RT', 'RT', 3.2, -0.4, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'WILL', 'INSIDE_OUT'),
        makeAgent('TE', 'TE', 4.8, -0.4, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
          { x: 4.2, y: 0.4 },
          { x: 4.9, y: 1.4 },
        ]),
        makeAgent('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14, y: 12 }]),
        makeAgent('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
        makeAgent('SL', 'FB', 0.0, -3.2, 'PULL_TRAP', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT', [
          { x: 3.6, y: -0.5 },
          { x: 4.5, y: 1.2 },
        ]),
        makeAgent('QB', 'QB', 0.0, -1.8, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: -3.5 }]),
        makeAgent('RB', 'RB', 0.0, -5.2, 'BALL_CARRIER', 'C_RIGHT', null, null, 'NEUTRAL', [
          { x: 2.8, y: -1.0 },
          { x: 3.5, y: 6.0 },
          { x: 4.2, y: 15.0 },
        ]),
      ];
    }

    if (scheme === 'RUN_INSIDE_ZONE') {
      return [
        makeAgent('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'OUTSIDE_IN'),
        makeAgent('LG', 'LG', -1.6, -0.3, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        makeAgent('C', 'C', 0.0, -0.2, 'COMBO_CLIMB', 'A_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        makeAgent('RG', 'RG', 1.6, -0.3, 'COMBO_CLIMB', 'B_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
        makeAgent('RT', 'RT', 3.2, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        makeAgent('TE', 'TE', 4.5, -1.2, 'PULL_TRAP', 'C_LEFT', 'RDE', null, 'INSIDE_OUT', [
          { x: 0.0, y: -1.2 },
          { x: -3.6, y: 0.2 },
          { x: -4.2, y: 1.5 },
        ]),
        makeAgent('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'INSIDE_OUT'),
        makeAgent('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
        makeAgent('SL', 'SL', -7.0, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN'),
        makeAgent('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.0, y: -4.8 }]),
        makeAgent('RB', 'RB', -1.4, -4.6, 'BALL_CARRIER', 'A_RIGHT', null, null, 'NEUTRAL', [
          { x: 0.4, y: -1.2 },
          { x: 1.2, y: 4.5 },
          { x: 1.5, y: 15.0 },
        ]),
      ];
    }

    if (scheme === 'RUN_OUTSIDE_ZONE') {
      return [
        makeAgent('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'C_LEFT', 'RDE', null, 'OUTSIDE_IN'),
        makeAgent('LG', 'LG', -1.6, -0.3, 'GAP_ZONE', 'B_LEFT', 'NT', 'WILL', 'OUTSIDE_IN'),
        makeAgent('C', 'C', 0.0, -0.2, 'GAP_ZONE', 'A_LEFT', 'NT', 'MIKE', 'OUTSIDE_IN'),
        makeAgent('RG', 'RG', 1.6, -0.3, 'GAP_ZONE', 'A_RIGHT', '3T', 'MIKE', 'OUTSIDE_IN'),
        makeAgent('RT', 'RT', 3.2, -0.4, 'GAP_ZONE', 'B_RIGHT', 'LDE', null, 'OUTSIDE_IN'),
        makeAgent('TE', 'TE', -4.8, -0.4, 'GAP_ZONE', 'D_ALLEY', 'RDE', null, 'OUTSIDE_IN'),
        makeAgent('WR1', 'WR', -14.0, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB1', null, 'OUTSIDE_IN'),
        makeAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 14.5, y: 10.0 }]),
        makeAgent('SL', 'SL', -7.2, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN'),
        makeAgent('QB', 'QB', 0.0, -2.0, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 2.5, y: -4.2 }]),
        makeAgent('RB', 'RB', 0.0, -5.2, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: -3.8, y: -1.5 },
          { x: -6.2, y: 2.5 },
          { x: -7.5, y: 14.0 },
        ]),
      ];
    }

    if (scheme === 'RUN_PIN_PULL') {
      return [
        makeAgent('LT', 'LT', -3.2, -0.4, 'GAP_ZONE', 'B_LEFT', 'RDE', null, 'INSIDE_OUT'),
        makeAgent('LG', 'LG', -1.6, -0.3, 'PULL_LEAD', 'D_ALLEY', 'NCB', null, 'OUTSIDE_IN', [
          { x: 1.0, y: -1.4 },
          { x: 6.2, y: -0.8 },
          { x: 8.2, y: 3.5 },
        ]),
        makeAgent('C', 'C', 0.0, -0.2, 'PULL_LEAD', 'C_RIGHT', 'MIKE', null, 'OUTSIDE_IN', [
          { x: 2.0, y: -1.2 },
          { x: 5.0, y: -0.5 },
          { x: 6.2, y: 3.0 },
        ]),
        makeAgent('RG', 'RG', 1.6, -0.3, 'MAN_BLOCK', 'A_RIGHT', '3T', null, 'INSIDE_OUT'),
        makeAgent('RT', 'RT', 3.2, -0.4, 'MAN_BLOCK', 'B_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        makeAgent('TE', 'TE', 4.8, -0.4, 'MAN_BLOCK', 'C_RIGHT', 'LDE', null, 'INSIDE_OUT'),
        makeAgent('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -14.0, y: 10.0 }]),
        makeAgent('WR2', 'WR', 14.5, -0.3, 'MAN_BLOCK', 'D_ALLEY', 'CB2', null, 'INSIDE_OUT'),
        makeAgent('SL', 'SL', 7.5, -0.8, 'MAN_BLOCK', 'D_ALLEY', 'SS', null, 'INSIDE_OUT'),
        makeAgent('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: -1.5, y: -4.8 }]),
        makeAgent('RB', 'RB', 1.2, -4.6, 'BALL_CARRIER', 'D_ALLEY', null, null, 'OUTSIDE_IN', [
          { x: 5.2, y: -1.4 },
          { x: 7.5, y: 2.8 },
          { x: 8.8, y: 14.0 },
        ]),
      ];
    }

    if (scheme === 'PASS_QUICK_SLANT') {
      return [
        makeAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
        makeAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
        makeAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'JUMP_SET', null, null, 'NEUTRAL'),
        makeAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
        makeAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'JUMP_SET', null, null, 'INSIDE_OUT'),
        makeAgent('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 5.2, y: 4.5 },
          { x: 9.0, y: 5.0 },
        ], 3),
        makeAgent('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -14.2, y: 3.2 },
          { x: -7.5, y: 7.0 },
        ], 1),
        makeAgent('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -10.5, y: 2.5 },
          { x: -14.5, y: 4.0 },
        ], 2),
        makeAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 14.2, y: 3.2 },
          { x: 8.0, y: 7.0 },
        ], 2),
        makeAgent('QB', 'QB', 0.0, -4.2, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -5.2 }]),
        makeAgent('RB', 'RB', -1.5, -4.5, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [
          { x: -5.0, y: 1.5 },
        ], 4),
      ];
    }

    if (scheme === 'PASS_MESH') {
      return [
        makeAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
        makeAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
        makeAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
        makeAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
        makeAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
        makeAgent('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 2.0, y: 4.2 },
          { x: -8.5, y: 4.8 },
        ], 2),
        makeAgent('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -14.5, y: 10.0 },
          { x: -7.5, y: 10.0 },
        ], 3),
        makeAgent('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -2.0, y: 3.8 },
          { x: 9.0, y: 4.5 },
        ], 1),
        makeAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 14.5, y: 12.0 },
          { x: 18.5, y: 15.5 },
        ], 3),
        makeAgent('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.0 }]),
        makeAgent('RB', 'RB', 1.5, -4.6, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 8.5, y: -1.0 },
          { x: 12.5, y: 8.0 },
        ], 4),
      ];
    }

    if (scheme === 'PASS_FOUR_VERTS') {
      return [
        makeAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
        makeAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
        makeAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
        makeAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
        makeAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
        makeAgent('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 4.8, y: 10.0 },
          { x: 2.0, y: 18.0 },
        ], 2),
        makeAgent('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -14.5, y: 18.5 },
        ], 1),
        makeAgent('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -7.0, y: 17.5 },
        ], 2),
        makeAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 14.5, y: 18.5 },
        ], 3),
        makeAgent('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [{ x: 0.0, y: -6.5 }]),
        makeAgent('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [
          { x: 0.0, y: 3.2 },
        ], 4),
      ];
    }

    if (scheme === 'PASS_UC_BOOT') {
      const qbAgent = makeAgent('QB', 'QB', 0.0, -1.8, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 4.8, y: -6.5 },
      ]);
      qbAgent.playAction = {
        enabled: true,
        meshDurationSec: 1.25,
        fakeCarrierId: 'RB',
        fakeGap: 'C_LEFT',
        isBootleg: true,
        bootDirection: 'RIGHT',
      };

      const rbAgent = makeAgent('RB', 'RB', 0.0, -4.5, 'MAX_PROTECT_SCAN', 'C_LEFT', null, null, 'OUTSIDE_IN', [
        { x: -3.5, y: -2.5 },
        { x: -5.8, y: 0.5 },
      ], 4);

      return [
        makeAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
        makeAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
        makeAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
        makeAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
        makeAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
        // Inline TE Right: Primary 12y Sail Out
        makeAgent('TE', 'TE', 4.8, -0.4, 'ROUTE', 'VERTICAL_DEEP', null, null, 'OUTSIDE_IN', [
          { x: 4.8, y: 10.0 },
          { x: 12.5, y: 12.0 },
        ], 1),
        // Flex TE2 Left: Leaks into play-side flat
        makeAgent('SL', 'TE', -4.8, -0.6, 'ROUTE', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT', [
          { x: 0.0, y: -1.5 },
          { x: 7.5, y: 3.5 },
        ], 3),
        // Boundary WR1: Deep Crossing Over Route
        makeAgent('WR1', 'WR', -14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: -14.0, y: 8.0 },
          { x: 6.0, y: 16.5 },
        ], 2),
        // Field WR2: Clearout Post
        makeAgent('WR2', 'WR', 14.0, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
          { x: 14.0, y: 24.0 },
        ], 3),
        qbAgent,
        rbAgent,
      ];
    }

    // Default: Pass Half-Slide (Dagger) or Chip Flood
    const isChip = scheme === 'PASS_CHIP_FLOOD';
    const qbAgent = makeAgent('QB', 'QB', 0.0, -4.5, 'QB_DROP', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
      { x: 0.0, y: -6.2 },
    ]);
    if (isChip) {
      qbAgent.playAction = {
        enabled: true,
        meshDurationSec: 1.15,
        fakeCarrierId: 'RB',
        fakeGap: 'A_LEFT',
      };
    }
    return [
      makeAgent('LT', 'LT', -3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
      makeAgent('LG', 'LG', -1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
      makeAgent('C', 'C', 0.0, -0.2, 'PASS_SET', 'ANGLE_45', null, null, 'NEUTRAL'),
      makeAgent('RG', 'RG', 1.6, -0.3, 'PASS_SET', 'ANGLE_45', null, null, 'INSIDE_OUT'),
      makeAgent('RT', 'RT', 3.2, -0.4, 'PASS_SET', 'VERTICAL_DEEP', null, null, 'INSIDE_OUT'),
      makeAgent(
        'TE',
        'TE',
        4.8,
        -0.4,
        isChip ? 'CHIP_RELEASE' : 'PASS_SET',
        'C_RIGHT',
        null,
        null,
        'OUTSIDE_IN',
        [
          { x: 5.5, y: 4.0 },
          { x: 12.5, y: 5.5 },
        ],
        3
      ),
      makeAgent('WR1', 'WR', -14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -14.5, y: 11.0 },
        { x: -6.0, y: 11.0 },
      ], 1),
      makeAgent('SL', 'SL', -7.5, -0.9, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: -7.5, y: 16.0 },
      ], 2),
      makeAgent('WR2', 'WR', 14.5, -0.3, 'ROUTE', 'VERTICAL_DEEP', null, null, 'NEUTRAL', [
        { x: 14.5, y: 14.0 },
        { x: 19.0, y: 17.0 },
      ], 2),
      qbAgent,
      makeAgent('RB', 'RB', -1.5, -4.6, 'MAX_PROTECT_SCAN', 'A_LEFT', null, null, 'INSIDE_OUT', [
        { x: -4.0, y: 2.0 },
      ], 4),
    ];
  }

  private createDefenseFront(call: string): SimAgent[] {
    const def = (
      id: string,
      pos: string,
      x: number,
      y: number,
      role: any,
      targetX: number,
      targetY: number,
      manTargetId?: string,
      ratings = { speed: 84, accel: 86, power: 86, finesse: 85, awareness: 85 }
    ): SimAgent => ({
      id,
      label: pos,
      side: 'DEF',
      pos,
      startX: x,
      startY: y,
      x,
      y,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      engagedWithId: null,
      leverageScore: 0,
      ratings,
      assignment: {
        role: 'MAN_BLOCK',
        primaryTargetId: null,
        secondaryTargetId: null,
        gapOrSet: 'VERTICAL_DEEP',
        leverage: 'NEUTRAL',
        climbOrChipDelaySec: 0,
        waypoints: [],
      },
      defAssignment: { role, targetX, targetY, manTargetId },
    });

    switch (call) {
      case 'NICKEL_UNDER_C1': {
        return [
          def('LDE', 'DE', -4.4, 0.6, 'CONTAIN_EDGE', -3.8, -5.0),
          def('3T', 'DT', -2.1, 0.5, 'RUSH_GAP', -1.8, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 85, awareness: 85 }),
          def('NT', 'NT', 0.8, 0.5, 'RUSH_GAP', 0.5, -4.0, undefined, { speed: 72, accel: 80, power: 92, finesse: 78, awareness: 85 }),
          def('RDE', 'EDGE', 5.2, 0.6, 'BLITZ_EDGE', 4.0, -5.0, undefined, { speed: 87, accel: 88, power: 84, finesse: 89, awareness: 86 }),
          def('WILL', 'WILL', -1.2, 4.2, 'HOOK_CURL', -1.5, 3.5),
          def('MIKE', 'MIKE', 2.2, 4.2, 'HOOK_CURL', 2.0, 3.5),
          def('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL', { speed: 91, accel: 90, power: 68, finesse: 82, awareness: 88 }),
          def('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 93, accel: 92, power: 65, finesse: 85, awareness: 88 }),
          def('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, accel: 91, power: 65, finesse: 85, awareness: 88 }),
          def('SS', 'SS', 0.0, 6.0, 'ROBBER', 0.0, 6.5, undefined, { speed: 88, accel: 88, power: 78, finesse: 80, awareness: 90 }),
          def('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0, undefined, { speed: 91, accel: 89, power: 68, finesse: 82, awareness: 89 }),
        ];
      }

      case 'NICKEL_WIDE9_C3': {
        // Jim Schwartz Wide-9 Cover 3: Wide DEs penetrate upfield, LBs fill B-gaps
        return [
          def('RDE', 'EDGE', -5.8, 0.6, 'CONTAIN_EDGE', -5.2, -5.0, undefined, { speed: 87, accel: 88, power: 84, finesse: 88, awareness: 85 }),
          def('3T', 'DT', -1.8, 0.5, 'RUSH_GAP', -1.5, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 84, awareness: 85 }),
          def('2i', 'DT', 1.8, 0.5, 'RUSH_GAP', 1.5, -4.0, undefined, { speed: 74, accel: 82, power: 91, finesse: 80, awareness: 85 }),
          def('LDE', 'EDGE', 5.8, 0.6, 'CONTAIN_EDGE', 5.2, -5.0, undefined, { speed: 88, accel: 89, power: 85, finesse: 89, awareness: 86 }),
          def('WILL', 'WILL', -1.5, 4.2, 'HOOK_CURL', -5.5, 4.5),
          def('MIKE', 'MIKE', 1.5, 4.2, 'HOOK_CURL', 5.5, 4.5),
          def('NCB', 'NI', -7.2, 3.2, 'CURL_FLAT', -17.5, 5.0),
          def('CB1', 'CB', -14.2, 6.0, 'DEEP_THIRD', -17.0, 16.0),
          def('CB2', 'CB', 14.2, 6.0, 'DEEP_THIRD', 17.0, 16.0),
          def('SS', 'SS', 5.8, 5.0, 'CURL_FLAT', 17.5, 5.0),
          def('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
        ];
      }

      case 'NICKEL_SPLIT_C6': {
        // Split-Field Cover 6: Quarters to field/trips (left), Cover 2 cloud to boundary (right)
        return [
          def('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
          def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0),
          def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0),
          def('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
          def('WILL', 'WILL', -2.2, 4.2, 'HOOK_CURL', -5.0, 4.5),
          def('MIKE', 'MIKE', 1.2, 4.2, 'HOOK_CURL', 5.0, 4.5),
          def('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -16.0, 5.0),
          def('CB1', 'CB', -14.2, 6.5, 'QUARTERS_MATCH', -18.5, 15.0),
          def('FS', 'FS', -5.5, 11.5, 'QUARTERS_MATCH', -6.0, 16.0),
          def('CB2', 'CB', 14.2, 4.2, 'CURL_FLAT', 18.5, 4.5), // Cloud corner
          def('SS', 'SS', 7.5, 12.5, 'DEEP_HALF', 12.0, 17.0),
        ];
      }

      case 'NICKEL_FIRE_ZONE': {
        // 5-Man Zone Blitz: 3-Under 3-Deep Fire Zone (Dick LeBeau)
        return [
          def('RDE', 'EDGE', -4.4, 0.6, 'BLITZ_EDGE', -3.8, -5.0, undefined, { speed: 87, accel: 88, power: 85, finesse: 88, awareness: 85 }),
          def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0),
          def('3T', 'DT', 1.8, 0.5, 'RUSH_GAP', 1.5, -4.0),
          def('WILL', 'WILL', -1.5, 4.2, 'BLITZ_A', -0.8, -4.5, undefined, { speed: 88, accel: 90, power: 82, finesse: 84, awareness: 86 }),
          def('LDE', 'DE', 4.8, 0.6, 'CURL_FLAT', 16.0, 4.5), // Dropping DE
          def('MIKE', 'MIKE', 0.8, 4.2, 'HOOK_CURL', 0.0, 4.5),
          def('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -16.0, 4.5),
          def('CB1', 'CB', -14.2, 6.5, 'DEEP_THIRD', -17.0, 16.0),
          def('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
          def('CB2', 'CB', 14.2, 6.5, 'DEEP_THIRD', 17.0, 16.0),
          def('SS', 'SS', 5.5, 5.0, 'HOOK_CURL', 0.0, 8.5),
        ];
      }

      case 'VIKINGS_MUG_CROSSDOG_C0': {
        // Brian Flores Signature Double A-Gap Cross-Dog Run Blitz vs Play-Action / Run Meta
        return [
          def('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0, undefined, { speed: 84, accel: 86, power: 88, finesse: 86, awareness: 86 }),
          def('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 76, accel: 82, power: 92, finesse: 80, awareness: 86 }),
          def('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0, undefined, { speed: 84, accel: 86, power: 88, finesse: 86, awareness: 86 }),
          // Penetrating A-gap blitzer (WILL shoots left A-gap at 100% sprint)
          def('WILL', 'WILL', -0.7, 1.1, 'BLITZ_RUN_GAP', -0.6, -1.5, undefined, { speed: 90, accel: 92, power: 84, finesse: 86, awareness: 88 }),
          // Looping Cross-Dog blitzer (MIKE delays 0.2s then crosses behind WILL into left A-gap)
          def('MIKE', 'MIKE', 0.7, 1.1, 'CROSS_DOG', 0.6, -1.5, undefined, { speed: 89, accel: 91, power: 84, finesse: 86, awareness: 88 }),
          // Creeping Safety Edge Crash
          def('SS', 'SS', 5.2, 2.2, 'BLITZ_EDGE_CRASH', 3.5, -5.0, undefined, { speed: 90, accel: 90, power: 78, finesse: 84, awareness: 90 }),
          // Man-to-Man Zero Coverage Press Locks
          def('NCB', 'NI', -6.8, 1.8, 'MAN_COV', -7.5, 1.5, 'SL', { speed: 91, accel: 90, power: 68, finesse: 82, awareness: 88 }),
          def('CB1', 'CB', -14.2, 1.8, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 93, accel: 92, power: 65, finesse: 85, awareness: 88 }),
          def('CB2', 'CB', 14.2, 1.8, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, accel: 91, power: 65, finesse: 85, awareness: 88 }),
          def('FS', 'FS', -2.5, 2.8, 'MAN_COV', -2.0, 1.5, 'RB', { speed: 91, accel: 89, power: 68, finesse: 82, awareness: 89 }),
          def('DIME', 'DB', 5.8, 2.2, 'MAN_COV', 5.0, 1.5, 'TE', { speed: 89, accel: 88, power: 78, finesse: 80, awareness: 88 }),
        ];
      }

      case 'VIKINGS_A_GAP_SIM_C3': {
        // Shows Double A-gap mug pre-snap, then WILL & MIKE bail to zones while 4 rush into Cover 3
        return [
          def('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0),
          def('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0),
          def('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0),
          def('WILL', 'WILL', -0.7, 1.1, 'HOOK_CURL', -2.2, 4.0), // Bail from mug
          def('MIKE', 'MIKE', 0.7, 1.1, 'HOOK_CURL', 2.2, 4.0),  // Bail from mug
          def('SS', 'SS', 5.2, 1.8, 'BLITZ_EDGE', 4.0, -5.0, undefined, { speed: 90, accel: 90, power: 78, finesse: 84, awareness: 90 }), // 4th rusher
          def('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -7.5, 4.5),
          def('CB1', 'CB', -14.2, 6.0, 'DEEP_THIRD', -14.0, 16.0),
          def('CB2', 'CB', 14.2, 6.0, 'DEEP_THIRD', 14.0, 16.0),
          def('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
          def('DIME', 'DB', 5.8, 4.2, 'CURL_FLAT', 7.5, 4.8),
        ];
      }

      case 'VIKINGS_SAFETY_BLITZ_C1': {
        // Harrison Smith boundary edge crash run blitz in Cover 1
        return [
          def('LDE', 'DE', -4.4, 0.6, 'CONTAIN_EDGE', -3.8, -5.0),
          def('3T', 'DT', -2.1, 0.5, 'RUSH_GAP', -1.8, -4.0),
          def('NT', 'NT', 0.8, 0.5, 'RUSH_GAP', 0.5, -4.0),
          def('RDE', 'DE', 4.5, 0.6, 'SPILL', 3.8, -1.0), // Spilling DE
          def('SS', 'SS', 5.6, 1.2, 'BLITZ_EDGE_CRASH', 3.5, -5.0, undefined, { speed: 91, accel: 92, power: 80, finesse: 85, awareness: 92 }), // Safety knife
          def('WILL', 'WILL', -1.2, 4.2, 'MAN_COV', -1.5, 1.5, 'RB'),
          def('MIKE', 'MIKE', 2.2, 4.2, 'ROBBER', 0.0, 6.0),
          def('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL'),
          def('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1'),
          def('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2'),
          def('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0),
        ];
      }

      case 'BASE_34_BEAR_C4': {
        return [
          def('LOLB', 'EDGE', -5.0, 0.6, 'CONTAIN_EDGE', -4.2, -5.0, undefined, { speed: 85, accel: 87, power: 84, finesse: 88, awareness: 85 }),
          def('4i_L', 'DE', -2.2, 0.5, 'RUSH_GAP', -1.9, -4.0, undefined, { speed: 75, accel: 80, power: 90, finesse: 82, awareness: 85 }),
          def('0T_NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 70, accel: 76, power: 94, finesse: 74, awareness: 86 }),
          def('4i_R', 'DE', 2.2, 0.5, 'RUSH_GAP', 1.9, -4.0, undefined, { speed: 75, accel: 80, power: 90, finesse: 82, awareness: 85 }),
          def('ROLB', 'EDGE', 5.4, 0.6, 'CONTAIN_EDGE', 4.5, -5.0, undefined, { speed: 86, accel: 88, power: 84, finesse: 88, awareness: 85 }),
          def('WILL', 'ILB', -1.2, 4.5, 'READ_RUN_PASS', -1.5, 3.8),
          def('MIKE', 'ILB', 1.2, 4.5, 'READ_RUN_PASS', 1.5, 3.8),
          def('CB1', 'CB', -14.0, 7.0, 'QUARTERS_MATCH', -14.0, 15.0, undefined, { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
          def('CB2', 'CB', 14.0, 7.0, 'QUARTERS_MATCH', 14.0, 15.0, undefined, { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
          def('FS', 'FS', -5.0, 10.5, 'QUARTERS_MATCH', -6.0, 16.0, undefined, { speed: 90, accel: 88, power: 70, finesse: 80, awareness: 88 }),
          def('SS', 'SS', 5.0, 10.5, 'QUARTERS_MATCH', 6.0, 16.0, undefined, { speed: 89, accel: 87, power: 74, finesse: 80, awareness: 88 }),
        ];
      }

      case 'BASE_34_OKIE_C2': {
        // Classic 3-4 Okie 2-Gap Cover 2: 2-gapping DL, edge OLBs, deep half safeties
        return [
          def('LOLB', 'OLB', -5.2, 0.6, 'CONTAIN_EDGE', -4.5, -5.0),
          def('4T_L', 'DE', -2.4, 0.5, 'RUSH_GAP', -2.0, -4.0, undefined, { speed: 74, accel: 78, power: 92, finesse: 78, awareness: 86 }),
          def('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 68, accel: 74, power: 96, finesse: 72, awareness: 88 }),
          def('4T_R', 'DE', 2.4, 0.5, 'RUSH_GAP', 2.0, -4.0, undefined, { speed: 74, accel: 78, power: 92, finesse: 78, awareness: 86 }),
          def('ROLB', 'OLB', 5.2, 0.6, 'CONTAIN_EDGE', 4.5, -5.0),
          def('WILL', 'ILB', -1.5, 4.5, 'HOOK_CURL', -6.5, 4.0),
          def('MIKE', 'ILB', 1.5, 4.5, 'HOOK_CURL', 6.5, 4.0),
          def('CB1', 'CB', -14.2, 4.2, 'CURL_FLAT', -18.5, 4.5),
          def('CB2', 'CB', 14.2, 4.2, 'CURL_FLAT', 18.5, 4.5),
          def('FS', 'FS', -7.5, 12.5, 'DEEP_HALF', -12.0, 17.0),
          def('SS', 'SS', 7.5, 12.5, 'DEEP_HALF', 12.0, 17.0),
        ];
      }

      case 'BASE_43_OVER_C1': {
        // Base 4-3 Over Heavy: 4 down linemen, Sam/Mike/Will LBs, 8-man box vs 12/21 personnel
        return [
          def('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
          def('NT', 'NT', -1.0, 0.5, 'RUSH_GAP', -0.6, -4.0, undefined, { speed: 72, accel: 78, power: 93, finesse: 76, awareness: 85 }),
          def('3T', 'DT', 1.8, 0.5, 'RUSH_GAP', 1.5, -4.0, undefined, { speed: 76, accel: 84, power: 91, finesse: 84, awareness: 86 }),
          def('LDE', 'DE', 4.5, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
          def('WILL', 'WLB', -2.5, 4.5, 'READ_RUN_PASS', -2.5, 3.8),
          def('MIKE', 'MLB', 0.5, 4.5, 'READ_RUN_PASS', 2.5, 3.8),
          def('SAM', 'SLB', 5.2, 1.5, 'FORCE_ALLEY', 5.0, 2.5), // Sam on line of scrimmage outside TE
          def('SS', 'SS', 4.8, 4.8, 'ROBBER', 0.0, 5.5),        // SS down in 8-man box
          def('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1'),
          def('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2'),
          def('FS', 'FS', 0.0, 14.0, 'DEEP_ZONE', 0.0, 18.0),
        ];
      }

      case 'DIME_MUG_C0': {
        return [
          def('LDE', 'DE', -3.8, 0.6, 'RUSH_GAP', -3.0, -5.0),
          def('NT', 'NT', 0.0, 0.5, 'RUSH_GAP', 0.0, -4.0, undefined, { speed: 74, accel: 82, power: 91, finesse: 80, awareness: 85 }),
          def('RDE', 'DE', 3.8, 0.6, 'RUSH_GAP', 3.0, -5.0),
          def('WILL', 'WILL', -0.8, 1.1, 'BLITZ_A', -0.5, -4.5, undefined, { speed: 88, accel: 90, power: 82, finesse: 84, awareness: 86 }),
          def('MIKE', 'MIKE', 0.8, 1.1, 'BLITZ_A', 0.5, -4.5, undefined, { speed: 88, accel: 90, power: 84, finesse: 84, awareness: 86 }),
          def('NCB', 'NI', -6.8, 2.2, 'MAN_COV', -7.5, 1.5, 'SL', { speed: 91, accel: 90, power: 68, finesse: 82, awareness: 88 }),
          def('CB1', 'CB', -14.2, 2.0, 'MAN_COV', -14.2, 1.5, 'WR1', { speed: 93, accel: 92, power: 65, finesse: 85, awareness: 88 }),
          def('CB2', 'CB', 14.2, 2.0, 'MAN_COV', 14.2, 1.5, 'WR2', { speed: 92, accel: 91, power: 65, finesse: 85, awareness: 88 }),
          def('SS', 'SS', 5.8, 2.8, 'MAN_COV', 5.0, 1.5, 'TE', { speed: 89, accel: 88, power: 78, finesse: 80, awareness: 88 }),
          def('FS', 'FS', -2.5, 3.2, 'MAN_COV', -2.0, 1.5, 'RB', { speed: 91, accel: 89, power: 68, finesse: 82, awareness: 89 }),
          def('DIME', 'DB', 5.2, 4.0, 'BLITZ_EDGE', 4.5, -5.0, undefined, { speed: 90, accel: 90, power: 72, finesse: 80, awareness: 86 }),
        ];
      }

      case 'DIME_QUARTERS_MATCH': {
        // 4-1-6 Dime Palms Match: Lone LB in middle, 6 DBs bracket 4 Verts and Trips
        return [
          def('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
          def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0),
          def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0),
          def('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
          def('MIKE', 'MLB', 0.0, 4.2, 'HOOK_CURL', 0.0, 4.5),
          def('NCB', 'NI', -6.5, 3.5, 'CURL_FLAT', -16.0, 5.0),
          def('DIME', 'DB', 6.5, 3.5, 'CURL_FLAT', 16.0, 5.0),
          def('CB1', 'CB', -14.2, 6.8, 'QUARTERS_MATCH', -18.5, 15.0),
          def('CB2', 'CB', 14.2, 6.8, 'QUARTERS_MATCH', 18.5, 15.0),
          def('FS', 'FS', -5.5, 11.0, 'QUARTERS_MATCH', -6.0, 16.0),
          def('SS', 'SS', 5.5, 11.0, 'QUARTERS_MATCH', 6.0, 16.0),
        ];
      }

      case 'DIME_CORNER_CAT_C2': {
        // Steve Spagnuolo Corner Cat Blitz: Boundary CB blitzes edge, safety rolls to Invert Cover 2
        return [
          def('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
          def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0),
          def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0),
          def('LDE', 'EDGE', 4.5, 0.6, 'RUSH_GAP', 3.8, -5.0),
          def('CB2', 'CB', 14.2, 2.5, 'BLITZ_EDGE_CRASH', 5.5, -5.0, undefined, { speed: 92, accel: 92, power: 65, finesse: 85, awareness: 88 }), // Boundary CB blitz!
          def('WILL', 'WILL', -2.2, 4.2, 'HOOK_CURL', -8.0, 4.5),
          def('MIKE', 'MIKE', 1.2, 4.2, 'HOOK_CURL', 0.0, 10.0),
          def('NCB', 'NI', -6.8, 3.5, 'CURL_FLAT', -16.0, 5.0),
          def('CB1', 'CB', -14.2, 4.5, 'CURL_FLAT', -18.5, 4.5),
          def('FS', 'FS', -6.5, 12.5, 'DEEP_HALF', -12.0, 17.0),
          def('SS', 'SS', 7.5, 12.0, 'DEEP_HALF', 12.0, 17.0), // Invert roll to cover CB's void
        ];
      }

      case 'GOAL_LINE_62_PINCH': {
        // 6-2 Heavy Jumbo: 6 down linemen pinching all gaps, 2 stacked LBs, goal line jam
        return [
          def('DE_L', 'DE', -4.8, 0.5, 'CONTAIN_EDGE', -4.2, -3.5, undefined, { speed: 76, accel: 80, power: 90, finesse: 80, awareness: 85 }),
          def('DT_L', 'DT', -2.8, 0.5, 'SPILL', -2.0, -1.0, undefined, { speed: 72, accel: 78, power: 93, finesse: 76, awareness: 85 }),
          def('NT_L', 'NT', -0.9, 0.5, 'RUSH_GAP', -0.5, -2.5, undefined, { speed: 70, accel: 76, power: 95, finesse: 74, awareness: 85 }),
          def('NT_R', 'NT', 0.9, 0.5, 'RUSH_GAP', 0.5, -2.5, undefined, { speed: 70, accel: 76, power: 95, finesse: 74, awareness: 85 }),
          def('DT_R', 'DT', 2.8, 0.5, 'SPILL', 2.0, -1.0, undefined, { speed: 72, accel: 78, power: 93, finesse: 76, awareness: 85 }),
          def('DE_R', 'DE', 4.8, 0.5, 'CONTAIN_EDGE', 4.2, -3.5, undefined, { speed: 76, accel: 80, power: 90, finesse: 80, awareness: 85 }),
          def('WILL', 'ILB', -1.5, 3.2, 'READ_RUN_PASS', -1.2, 1.8, undefined, { speed: 84, accel: 86, power: 86, finesse: 82, awareness: 86 }),
          def('MIKE', 'ILB', 1.5, 3.2, 'READ_RUN_PASS', 1.2, 1.8, undefined, { speed: 84, accel: 86, power: 86, finesse: 82, awareness: 86 }),
          def('CB1', 'CB', -13.5, 1.5, 'MAN_COV', -13.5, 1.0, 'WR1', { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
          def('CB2', 'CB', 13.5, 1.5, 'MAN_COV', 13.5, 1.0, 'WR2', { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
          def('FS', 'FS', 0.0, 6.5, 'ROBBER', 0.0, 5.0, undefined, { speed: 89, accel: 88, power: 76, finesse: 80, awareness: 88 }),
        ];
      }

      case 'NICKEL_SIM_C2': {
        return [
          def('LDE', 'DE', -4.2, 0.6, 'HOOK_CURL', -8.0, 4.5, undefined, { speed: 80, accel: 82, power: 85, finesse: 82, awareness: 85 }),
          def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 72, accel: 80, power: 92, finesse: 76, awareness: 85 }),
          def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 84, awareness: 85 }),
          def('RDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0, undefined, { speed: 86, accel: 88, power: 85, finesse: 88, awareness: 86 }),
          def('NCB', 'NI', -6.8, 2.5, 'BLITZ_EDGE', -3.5, -4.5, undefined, { speed: 91, accel: 92, power: 70, finesse: 82, awareness: 88 }),
          def('WILL', 'WILL', -2.5, 4.2, 'HOOK_CURL', 8.0, 4.5),
          def('MIKE', 'MIKE', 0.0, 4.2, 'HOOK_CURL', 0.0, 10.0, undefined, { speed: 87, accel: 88, power: 84, finesse: 82, awareness: 90 }),
          def('CB1', 'CB', -14.2, 4.5, 'CURL_FLAT', -18.5, 4.5, undefined, { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
          def('CB2', 'CB', 14.2, 4.5, 'CURL_FLAT', 18.5, 4.5, undefined, { speed: 92, accel: 90, power: 65, finesse: 85, awareness: 88 }),
          def('FS', 'FS', -7.5, 12.5, 'DEEP_HALF', -12.0, 17.0, undefined, { speed: 91, accel: 89, power: 68, finesse: 82, awareness: 89 }),
          def('SS', 'SS', 7.5, 12.5, 'DEEP_HALF', 12.0, 17.0, undefined, { speed: 89, accel: 87, power: 76, finesse: 80, awareness: 89 }),
        ];
      }

      case 'NICKEL_OVER_C3':
      default: {
        return [
          def('RDE', 'DE', -4.2, 0.6, 'CONTAIN_EDGE', -3.5, -5.0),
          def('NT', 'NT', -0.8, 0.5, 'RUSH_GAP', -0.5, -4.0, undefined, { speed: 72, accel: 80, power: 92, finesse: 76, awareness: 85 }),
          def('3T', 'DT', 2.1, 0.5, 'RUSH_GAP', 1.8, -4.0, undefined, { speed: 76, accel: 84, power: 90, finesse: 84, awareness: 85 }),
          def('LDE', 'EDGE', 4.8, 0.6, 'CONTAIN_EDGE', 4.0, -5.0),
          def('WILL', 'WILL', -2.2, 4.2, 'HOOK_CURL', -5.5, 4.5),
          def('MIKE', 'MIKE', 1.2, 4.2, 'HOOK_CURL', 5.5, 4.5),
          def('NCB', 'NI', -6.8, 3.2, 'CURL_FLAT', -17.5, 5.0),
          def('CB1', 'CB', -14.2, 6.0, 'DEEP_THIRD', -17.0, 16.0),
          def('CB2', 'CB', 14.2, 6.0, 'DEEP_THIRD', 17.0, 16.0),
          def('SS', 'SS', 5.8, 5.0, 'CURL_FLAT', 17.5, 5.0),
          def('FS', 'FS', 0.0, 12.5, 'DEEP_THIRD', 0.0, 18.0),
        ];
      }
    }
  }

  private loadPlayPreset(presetId: string): void {
    const preset = this.presets.find((p) => p.id === presetId) || this.presets[0];
    this.activePresetId = preset.id;
    this.motionMode = 'OFF';
    const btnMotion = document.getElementById('btn-jet-motion');
    if (btnMotion) btnMotion.innerHTML = `MOTION SHIFT <span class="kbd-hint">J</span>`;

    document.querySelectorAll('.play-item').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.id === preset.id);
    });
    document.getElementById('personnel-badge')!.textContent = preset.personnel;

    // Auto-select KBC / HYD / ARG Moneyball roster when clicking modern concepts
    if (preset.id.startsWith('KBC_')) {
      const offSelect = document.getElementById('off-team-select') as HTMLSelectElement | null;
      if (offSelect && offSelect.value !== 'KBC') {
        offSelect.value = 'KBC';
      }
      if (preset.id === 'KBC_REDZONE_BISTABLE_HAMMER') {
        this.renderOpts.firstDownYards = 6.0;
      } else if (this.activeSituationFilter === 'ALL' && this.renderOpts.firstDownYards === 6.0) {
        this.renderOpts.firstDownYards = 10.0;
      }
    } else if (preset.id.startsWith('HYDRA_')) {
      const offSelect = document.getElementById('off-team-select') as HTMLSelectElement | null;
      if (offSelect && offSelect.value !== 'HYD') {
        offSelect.value = 'HYD';
      }
      if (preset.id === 'HYDRA_GOALLINE_PHILLY_SPECIAL') {
        this.renderOpts.firstDownYards = 4.0;
      } else if (this.activeSituationFilter === 'ALL' && this.renderOpts.firstDownYards === 4.0) {
        this.renderOpts.firstDownYards = 10.0;
      }
    } else if (preset.id.startsWith('APEX_')) {
      const offSelect = document.getElementById('off-team-select') as HTMLSelectElement | null;
      if (offSelect && offSelect.value !== 'APX') {
        offSelect.value = 'APX';
      }
      if (preset.id === 'APEX_GOALLINE_SPRINT_SMASH') {
        this.renderOpts.firstDownYards = 4.0;
      } else if (this.activeSituationFilter === 'ALL' && this.renderOpts.firstDownYards === 4.0) {
        this.renderOpts.firstDownYards = 10.0;
      }
    } else if (preset.id.startsWith('ARGON_')) {
      const offSelect = document.getElementById('off-team-select') as HTMLSelectElement | null;
      if (offSelect && offSelect.value !== 'ARG') {
        offSelect.value = 'ARG';
      }
      if (preset.id === 'ARGON_GOALLINE_CYCLOTRON') {
        this.renderOpts.firstDownYards = 4.0;
      } else if (this.activeSituationFilter === 'ALL' && this.renderOpts.firstDownYards === 4.0) {
        this.renderOpts.firstDownYards = 10.0;
      }
    }

    // Temporally Prior Formation Matching: Auto-match defense to offense personnel/formation
    if (this.autoMatchDefense) {
      const defSelect = document.getElementById('def-call-select') as HTMLSelectElement;
      if (defSelect) {
        let matched = 'NICKEL_OVER_C3';
        if (
          preset.id === 'KBC_REDZONE_BISTABLE_HAMMER' ||
          preset.id === 'HYDRA_GOALLINE_PHILLY_SPECIAL' ||
          preset.id === 'ARGON_GOALLINE_CYCLOTRON' ||
          preset.id === 'APEX_GOALLINE_SPRINT_SMASH'
        ) {
          matched = 'GOAL_LINE_62_PINCH';
        } else if (
          preset.id === 'KBC_THIRD_DOWN_LAUNCH_DISPLACER' ||
          preset.id === 'HYDRA_BACKWARD_DOUBLE_PASS' ||
          preset.id === 'ARGON_DISPLACED_NODE_LASER'
        ) {
          matched = 'VIKINGS_MUG_CROSSDOG_C0';
        } else if (
          preset.id === 'KBC_BULLDOZER_MONOLITH_POWER' ||
          preset.id === 'KBC_4MIN_CLOCK_BLEEDER'
        ) {
          matched = 'BASE_34_BEAR_C4';
        } else if (preset.id === 'KBC_TWOMIN_BOUNDARY_CONTINUUM') {
          matched = 'DIME_QUARTERS_MATCH';
        } else if (
          preset.id === 'HYDRA_HOOK_AND_LATERAL' ||
          preset.id === 'ARGON_NOBLE_KINETIC_RELAY' ||
          preset.id === 'ARGON_2MIN_BOUNDARY_LASER' ||
          preset.id === 'APEX_TWOMIN_BOUNDARY_OOB' ||
          preset.id === 'APEX_SWITCH_MESH_STICKS'
        ) {
          matched = 'DIME_QUARTERS_MATCH';
        } else if (preset.id === 'HYDRA_BACKWARD_DOUBLE_PASS' || preset.id === 'ARGON_DISPLACED_NODE_LASER') {
          matched = 'VIKINGS_MUG_CROSSDOG_C0';
        } else if (
          preset.personnel === '22 HYDRA' ||
          preset.personnel === '22 ARGON' ||
          preset.personnel === '22 WILDCAT'
        ) {
          matched = 'BASE_34_BEAR_C4';
        } else if (preset.personnel === '21 HYDRA' || preset.personnel === '21 ARGON') {
          matched = 'NICKEL_OVER_C3';
        } else if (preset.personnel === '11 HYDRA' || preset.personnel === '11 ARGON') {
          matched = 'NICKEL_SIM_C2';
        } else if (preset.personnel === '12 PERS') {
          matched = preset.id === 'PA_UNDER_CENTER_BOOT' ? 'VIKINGS_MUG_CROSSDOG_C0' : 'BASE_34_BEAR_C4';
        } else if (preset.personnel === '21 PERS') {
          matched = 'BASE_43_OVER_C1';
        } else if (preset.personnel === '11 PERS') {
          if (preset.id === 'FOUR_VERTS_SEAM') matched = 'DIME_QUARTERS_MATCH';
          else if (preset.id === 'QUICK_SLANT_FLAT') matched = 'VIKINGS_MUG_CROSSDOG_C0';
          else if (preset.id === 'PA_MAX_CHIP_FLOOD') matched = 'VIKINGS_SAFETY_BLITZ_C1';
          else matched = 'NICKEL_OVER_C3';
        }
        defSelect.value = matched;
      }
    }

    const defCall = (document.getElementById('def-call-select') as HTMLSelectElement).value;
    const offAgents = preset.buildOffense();
    const defAgents = this.createDefenseFront(defCall);

    this.agents = [...offAgents, ...defAgents];
    this.applyTeamPersonnel(this.agents);
    this.autoDesignateDefaultMike();
    this.currentTick = 0;
    this.recomputeSimulation();
    this.populateDefenderDropdowns();
    this.syncInspectorAndMatrix();
  }

  private getActiveFieldContext(): SimFieldContext | undefined {
    if (this.customFieldContext) {
      return this.customFieldContext;
    }
    if (
      this.activePresetId === 'KBC_REDZONE_BISTABLE_HAMMER'
    ) {
      return { yardLineToGoal: 6.0, sidelineObjective: 'NORMAL' };
    }
    if (
      this.activePresetId === 'HYDRA_GOALLINE_PHILLY_SPECIAL' ||
      this.activePresetId === 'ARGON_GOALLINE_CYCLOTRON' ||
      this.activePresetId === 'APEX_GOALLINE_SPRINT_SMASH'
    ) {
      return { yardLineToGoal: 4.0, sidelineObjective: 'NORMAL' };
    }
    if (
      this.activePresetId === 'KBC_TWOMIN_BOUNDARY_CONTINUUM' ||
      this.activePresetId === 'HYDRA_2MIN_SIDELINE_CHOICE' ||
      this.activePresetId === 'ARGON_2MIN_BOUNDARY_LASER' ||
      this.activePresetId === 'APEX_TWOMIN_BOUNDARY_OOB'
    ) {
      return { sidelineObjective: 'STOP_CLOCK_OOB' };
    }
    if (
      this.activePresetId === 'KBC_4MIN_CLOCK_BLEEDER' ||
      this.activePresetId === 'HYDRA_4MIN_BULLDOZER_SWEEP' ||
      this.activePresetId === 'ARGON_4MIN_LEFT_MONOLITH' ||
      this.activePresetId === 'APEX_EAGLES_RHINO_COUNTER'
    ) {
      return { sidelineObjective: 'STAY_INBOUNDS' };
    }
    return undefined;
  }

  public recomputeSimulation(): void {
    this.isMonteCarloView = false;
    this.renderOpts.monteCarloOverlay = null;
    document.getElementById('mc-sample-label')!.textContent = 'SINGLE RUN';
    const fCtx = this.getActiveFieldContext();
    this.renderOpts.yardLineToGoal = fCtx?.yardLineToGoal;
    this.renderOpts.firstDownYards = fCtx?.yardLineToGoal ? Math.min(10.0, fCtx.yardLineToGoal) : 10.0;

    // Reactive Pre-Snap Audible Execution for Kinetic Bistable Continuum (Peyton Manning Effect)
    let kbcAudibleEvent: string | null = null;
    if (this.activePresetId.startsWith('KBC_')) {
      const kbcPlay = KBC_2027_PLAYBOOK.find((p) => p.id === this.activePresetId);
      if (kbcPlay) {
        const defSelect = document.getElementById('def-call-select') as HTMLSelectElement | null;
        const defCall = defSelect ? defSelect.value : 'NICKEL_OVER_C3';
        const attractorResult = detectDefensiveAttractor(this.agents, defCall);
        const auditedOffense = kbcPlay.buildAuditedOffense(attractorResult.attractor);
        const defOnly = this.agents.filter((a) => a.side === 'DEF');
        this.agents = [...auditedOffense, ...defOnly];
        this.applyTeamPersonnel(this.agents);

        const branch =
          attractorResult.attractor === 'ATTRACTOR_ALPHA_MAN_BLITZ'
            ? kbcPlay.packagedBranches.branchAlpha
            : attractorResult.attractor === 'ATTRACTOR_GAMMA_GOALLINE_PINCH' && kbcPlay.packagedBranches.branchGamma
            ? kbcPlay.packagedBranches.branchGamma
            : kbcPlay.packagedBranches.branchBeta;

        kbcAudibleEvent = branch.title;
      }
    }

    this.snapshots = this.engine.simulatePlay(this.agents, 0.0, fCtx);

    if (kbcAudibleEvent && this.snapshots.length > 0) {
      for (let i = 0; i < Math.min(30, this.snapshots.length); i++) {
        if (!this.snapshots[i].exoticEvent) {
          this.snapshots[i].exoticEvent = kbcAudibleEvent;
        }
      }
    }

    this.currentTick = Math.min(this.currentTick, this.snapshots.length - 1);
    this.updateQBPreSnapIntel();
    this.drawCurrentFrame();
  }

  private getFrontSevenDefenders(): SimAgent[] {
    const defs = this.agents.filter((a) => a.side === 'DEF');
    // Box defenders within 6 yards of LOS and lateral box limits
    return defs.filter((d) => d.startY <= 5.8 && Math.abs(d.startX) <= 6.8);
  }

  private autoDesignateDefaultMike(): void {
    const boxDefs = this.getFrontSevenDefenders();
    // Default Mike is the middle linebacker or defender with label 'MIKE' / 'ILB'
    const namedMike = boxDefs.find(
      (d) => d.id === 'MIKE' || d.label === 'MIKE' || d.pos === 'MIKE' || d.pos === 'ILB'
    );
    if (namedMike) {
      this.applyMikeDeclaration(namedMike.id);
      return;
    }
    // Fallback: second-level defender closest to center (apex)
    const secondLevel = boxDefs.filter((d) => d.startY >= 2.5);
    if (secondLevel.length > 0) {
      secondLevel.sort((a, b) => Math.abs(a.startX) - Math.abs(b.startX));
      this.applyMikeDeclaration(secondLevel[0].id);
      return;
    }
    if (boxDefs.length > 0) {
      this.applyMikeDeclaration(boxDefs[0].id);
    }
  }

  private cycleDeclaredMike(): void {
    const boxDefs = this.getFrontSevenDefenders();
    if (boxDefs.length === 0) return;
    const currIdx = boxDefs.findIndex((d) => d.id === this.declaredMikeId);
    const nextIdx = (currIdx + 1) % boxDefs.length;
    this.applyMikeDeclaration(boxDefs[nextIdx].id);
  }

  private applyMikeDeclaration(mikeId: string): void {
    this.declaredMikeId = mikeId;
    this.renderOpts.designatedMikeId = mikeId;

    const mikeDef = this.agents.find((a) => a.id === mikeId);
    if (!mikeDef) return;

    // Update UI Button text
    const labelEl = document.getElementById('mike-id-label');
    if (labelEl) {
      const jersey = mikeDef.jersey ? `#${mikeDef.jersey} ` : '';
      labelEl.textContent = `${jersey}${mikeDef.label}`;
    }

    // Assign designatedMikeId to all offensive agents
    for (const a of this.agents.filter((x) => x.side === 'OFF')) {
      a.designatedMikeId = mikeId;
    }

    // Orient Pass Protection Half-Slide & Running Back Dual-Read
    const off = this.agents.filter((a) => a.side === 'OFF');
    const byPos = (p: string) => off.find((a) => a.pos === p);
    const rb = byPos('RB');
    const center = byPos('C');

    // Only reconfigure line protection if offensive line is actively in pass protection (PASS_SET)
    const isPassPlay = off.some(
      (a) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.pos) && a.assignment.role === 'PASS_SET'
    );
    const hasPullingPassWall = off.some(
      (a) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.pos) && a.assignment.role === 'PULL_LEAD'
    );
    if (isPassPlay && !hasPullingPassWall && center) {
      if (mikeDef.startX < -0.3) {
        // Declared Mike is left: Slide Line Left, RB dual-reads Mike to weakside right
        byPos('LT') && Object.assign(byPos('LT')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: 'RDE', leverage: 'OUTSIDE_IN' });
        byPos('LG') && Object.assign(byPos('LG')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: 'NT', leverage: 'INSIDE_OUT' });
        byPos('C') && Object.assign(byPos('C')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: 'NT', secondaryTargetId: mikeId });
        byPos('RG') && Object.assign(byPos('RG')!.assignment, { role: 'MAN_BLOCK', gapOrSet: 'B_RIGHT', primaryTargetId: '3T', leverage: 'INSIDE_OUT' });
        byPos('RT') && Object.assign(byPos('RT')!.assignment, { role: 'MAN_BLOCK', gapOrSet: 'C_RIGHT', primaryTargetId: 'LDE', leverage: 'INSIDE_OUT' });

        if (rb && (rb.assignment.role === 'MAX_PROTECT_SCAN' || rb.assignment.role === 'PASS_SET')) {
          rb.assignment.primaryTargetId = mikeId;
          rb.assignment.secondaryTargetId = '3T';
        }
      } else {
        // Declared Mike is right: Slide Line Right, RB dual-reads Mike to weakside left
        byPos('LT') && Object.assign(byPos('LT')!.assignment, { role: 'MAN_BLOCK', gapOrSet: 'C_LEFT', primaryTargetId: 'RDE', leverage: 'INSIDE_OUT' });
        byPos('LG') && Object.assign(byPos('LG')!.assignment, { role: 'MAN_BLOCK', gapOrSet: 'B_LEFT', primaryTargetId: 'NT', leverage: 'INSIDE_OUT' });
        byPos('C') && Object.assign(byPos('C')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: '3T', secondaryTargetId: mikeId });
        byPos('RG') && Object.assign(byPos('RG')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: '3T', leverage: 'INSIDE_OUT' });
        byPos('RT') && Object.assign(byPos('RT')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: 'LDE', leverage: 'OUTSIDE_IN' });

        if (rb && (rb.assignment.role === 'MAX_PROTECT_SCAN' || rb.assignment.role === 'PASS_SET')) {
          rb.assignment.primaryTargetId = mikeId;
          rb.assignment.secondaryTargetId = 'NT';
        }
      }
    }

    this.currentTick = 0;
    this.recomputeSimulation();
    this.syncInspectorAndMatrix();
  }

  private updateQBPreSnapIntel(): void {
    const defs = this.agents.filter((a) => a.side === 'DEF');
    const off = this.agents.filter((a) => a.side === 'OFF');

    // 1. Coverage Shell Tell (Safety Alignment)
    const deepSafeties = defs.filter((d) => d.startY >= 7.0);
    const covEl = document.getElementById('intel-coverage-tell');
    if (covEl) {
      covEl.className = 'intel-tag';
      if (deepSafeties.length === 0) {
        covEl.textContent = 'ALERT: ZERO-HIGH BLITZ (COVER 0)';
        covEl.classList.add('tell-blitz');
      } else if (deepSafeties.length === 1) {
        covEl.textContent = 'READ: MOFC / 1-HIGH (COVER 1/3)';
        covEl.classList.add('tell-zone');
      } else {
        covEl.textContent = 'READ: MOFO / 2-HIGH (COVER 2/4)';
        covEl.classList.add('tell-zone');
      }
    }

    // 2. Observable Alignment / Motion Probe Tell (No hidden manTargetId x-ray oracle)
    const motionEl = document.getElementById('intel-motion-reaction');
    const motionAgent = off.find((a) => a.preSnapMotion?.enabled);
    const cbs = defs.filter((d) => ['CB', 'CB1', 'CB2', 'NI'].includes(d.pos));
    const pressed = cbs.filter((cb) => cb.startY <= 3.0);
    const losMug = defs.filter((d) => Math.abs(d.startX) <= 2.4 && d.startY >= 0.8 && d.startY <= 2.6);
    if (motionEl) {
      motionEl.className = 'intel-tag';
      if (motionAgent) {
        if (deepSafeties.length === 0 || (deepSafeties.length === 1 && pressed.length >= 2) || losMug.length >= 2) {
          motionEl.textContent = 'PROBE TELL: PRESS / MUG LOOK (DISGUISE RISK)';
          motionEl.classList.add('tell-man');
        } else {
          motionEl.textContent = 'PROBE TELL: OFF-SHELL / ZONE LOOK (ROTATION RISK)';
          motionEl.classList.add('tell-zone');
        }
      } else {
        if (pressed.length >= 2) {
          motionEl.textContent = 'ALIGN: PRESS LOOK (MAN/TRAP TELL)';
          motionEl.classList.add('tell-man');
        } else {
          motionEl.textContent = 'ALIGN: OFF-CUSHION (ZONE/DISGUISE TELL)';
          motionEl.classList.add('tell-zone');
        }
      }
    }

    // 3. Box Count & Run/Pass Advantage Tell
    const boxEl = document.getElementById('intel-box-count');
    if (boxEl) {
      boxEl.className = 'intel-tag';
      const boxDefs = defs.filter((d) => Math.abs(d.startX) <= 4.8 && d.startY <= 5.2);
      const count = boxDefs.length;
      if (count <= 5) {
        boxEl.textContent = `BOX: ${count}-MAN (RUN ADVANTAGE +1)`;
        boxEl.classList.add('tell-box');
      } else if (count === 6) {
        boxEl.textContent = `BOX: ${count}-MAN (BALANCED 6v6)`;
        boxEl.classList.add('tell-box');
      } else if (count === 7) {
        boxEl.textContent = `BOX: ${count}-MAN (LOADED +1)`;
        boxEl.classList.add('tell-man');
      } else {
        boxEl.textContent = `BOX: ${count}-MAN (BEAR / PASS ADVANTAGE)`;
        boxEl.classList.add('tell-blitz');
      }
    }

    // 4. Macro Rock-Paper-Scissors & Bistable Packaged Play Analysis
    const activePreset = this.presets.find((p) => p.id === this.activePresetId) || this.presets[0];
    const defSelect = document.getElementById('def-call-select') as HTMLSelectElement;
    const defCall = defSelect ? defSelect.value : 'NICKEL_OVER_C3';

    const isKbc = this.activePresetId.startsWith('KBC_');
    const kbcPlay = isKbc ? KBC_2027_PLAYBOOK.find((p) => p.id === this.activePresetId) : null;
    const kbcAttractor = kbcPlay ? detectDefensiveAttractor(this.agents, defCall) : null;

    const rps = evaluateMacroMatchup(
      activePreset.personnel,
      activePreset.id,
      activePreset.category,
      defCall,
      this.agents
    );

    // Update QB Intel Strip Pill
    const rpsTellEl = document.getElementById('intel-rps-tell');
    if (rpsTellEl) {
      rpsTellEl.className = 'intel-tag';
      if (kbcPlay && kbcAttractor) {
        const branch =
          kbcAttractor.attractor === 'ATTRACTOR_ALPHA_MAN_BLITZ'
            ? kbcPlay.packagedBranches.branchAlpha
            : kbcAttractor.attractor === 'ATTRACTOR_GAMMA_GOALLINE_PINCH' && kbcPlay.packagedBranches.branchGamma
            ? kbcPlay.packagedBranches.branchGamma
            : kbcPlay.packagedBranches.branchBeta;

        rpsTellEl.textContent = `⚡ PEYTON: ${branch.title.replace('AUDIBLE: ', '')}`;
        rpsTellEl.classList.add(kbcAttractor.attractor === 'ATTRACTOR_ALPHA_MAN_BLITZ' ? 'tell-blitz' : 'tell-box');
      } else if (rps.verdict === 'SEVERE_DEFENSE_COUNTER') {
        rpsTellEl.textContent = `RPS: DANGER (${rps.headline})`;
        rpsTellEl.classList.add('tell-blitz');
      } else if (rps.verdict === 'EXPLOSIVE_OFFENSE_COUNTER' || rps.verdict === 'FAVORABLE_OFFENSE') {
        rpsTellEl.textContent = `RPS: ADVANTAGE (${rps.headline})`;
        rpsTellEl.classList.add('tell-box');
      } else if (rps.verdict === 'FAVORABLE_DEFENSE') {
        rpsTellEl.textContent = `RPS: MISMATCH (${rps.headline})`;
        rpsTellEl.classList.add('tell-man');
      } else {
        rpsTellEl.textContent = `RPS: BALANCED (${rps.headline})`;
        rpsTellEl.classList.add('tell-zone');
      }
    }

    // Update Macro RPS Card in Inspector
    const badgeEl = document.getElementById('macro-rps-badge');
    const headlineEl = document.getElementById('macro-rps-headline');
    const detailEl = document.getElementById('macro-rps-detail');
    const audibleEl = document.getElementById('macro-rps-audible');

    if (badgeEl) {
      badgeEl.className = 'macro-rps-badge';
      if (kbcPlay && kbcAttractor) {
        badgeEl.textContent = 'PEYTON AUDIBLE ACTIVE';
        badgeEl.classList.add('badge-success');
      } else if (rps.verdict === 'SEVERE_DEFENSE_COUNTER') {
        badgeEl.textContent = 'CRITICAL COUNTER';
        badgeEl.classList.add('badge-danger');
      } else if (rps.verdict === 'FAVORABLE_DEFENSE') {
        badgeEl.textContent = 'DEFENSE EDGE';
        badgeEl.classList.add('badge-warning');
      } else if (rps.verdict === 'EXPLOSIVE_OFFENSE_COUNTER') {
        badgeEl.textContent = 'EXPLOSIVE COUNTER';
        badgeEl.classList.add('badge-success');
      } else if (rps.verdict === 'FAVORABLE_OFFENSE') {
        badgeEl.textContent = 'OFFENSE ADVANTAGE';
        badgeEl.classList.add('badge-success');
      } else {
        badgeEl.textContent = 'NEUTRAL / BALANCED';
        badgeEl.classList.add('badge-neutral');
      }
    }

    if (headlineEl) {
      if (kbcPlay && kbcAttractor) {
        const attractorName =
          kbcAttractor.attractor === 'ATTRACTOR_ALPHA_MAN_BLITZ'
            ? 'ATTRACTOR α (MAN PRESSURE)'
            : kbcAttractor.attractor === 'ATTRACTOR_GAMMA_GOALLINE_PINCH'
            ? 'ATTRACTOR γ (GOAL-LINE PINCH)'
            : 'ATTRACTOR β (VORONOI ZONE MATCH)';
        headlineEl.textContent = `BISTABLE COLLAPSE // ${attractorName}`;
      } else {
        headlineEl.textContent = rps.headline;
      }
    }
    if (detailEl) {
      if (kbcPlay && kbcAttractor) {
        detailEl.textContent = `${kbcPlay.philosophy} (${kbcAttractor.reason})`;
      } else {
        detailEl.textContent = rps.tacticalDetail;
      }
    }
    if (audibleEl) {
      if (kbcPlay && kbcAttractor) {
        const branch =
          kbcAttractor.attractor === 'ATTRACTOR_ALPHA_MAN_BLITZ'
            ? kbcPlay.packagedBranches.branchAlpha
            : kbcAttractor.attractor === 'ATTRACTOR_GAMMA_GOALLINE_PINCH' && kbcPlay.packagedBranches.branchGamma
            ? kbcPlay.packagedBranches.branchGamma
            : kbcPlay.packagedBranches.branchBeta;

        audibleEl.innerHTML = `<strong>PEYTON MANNING LAST-MOVER AUDIBLE:</strong> ${branch.title}<br/><span style="color: #38bdf8; font-size: 11px;">[TELL: ${kbcAttractor.reason}] &rarr; ${branch.rationale}</span>`;
      } else {
        audibleEl.innerHTML = `<strong>OC AUDIBLE TIP:</strong> ${rps.recommendedAudible || 'Execute play as scripted.'}`;
      }
    }
  }

  private flipPlayLeftRight(): void {
    const swapGap: Partial<Record<GapOrSetCode, GapOrSetCode>> = {
      A_LEFT: 'A_RIGHT',
      A_RIGHT: 'A_LEFT',
      B_LEFT: 'B_RIGHT',
      B_RIGHT: 'B_LEFT',
      C_LEFT: 'C_RIGHT',
      C_RIGHT: 'C_LEFT',
    };

    for (const a of this.agents.filter((x) => x.side === 'OFF')) {
      if (!['LT', 'LG', 'C', 'RG', 'RT'].includes(a.pos)) {
        a.startX = +(-a.startX).toFixed(2);
        a.x = a.startX;
      }
      a.assignment.waypoints = a.assignment.waypoints.map((wp) => ({
        x: +(-wp.x).toFixed(2),
        y: wp.y,
      }));
      if (swapGap[a.assignment.gapOrSet]) {
        a.assignment.gapOrSet = swapGap[a.assignment.gapOrSet]!;
      }
    }

    // Mirror pre-snap motion vectors
    const sl = this.agents.find((a) => a.side === 'OFF' && a.preSnapMotion?.enabled);
    if (sl && sl.preSnapMotion) {
      sl.preSnapMotion.originX = +(-sl.preSnapMotion.originX).toFixed(2);
      sl.preSnapMotion.snapX = +(-sl.preSnapMotion.snapX).toFixed(2);
      sl.preSnapMotion.dirX = -sl.preSnapMotion.dirX;
      sl.vx = -sl.vx;
      if (sl.preSnapMotion.type === 'JET_RIGHT') {
        sl.preSnapMotion.type = 'JET_LEFT';
        this.motionMode = 'JET_LEFT';
      } else if (sl.preSnapMotion.type === 'JET_LEFT') {
        sl.preSnapMotion.type = 'JET_RIGHT';
        this.motionMode = 'JET_RIGHT';
      }
      const btn = document.getElementById('btn-jet-motion');
      if (btn) {
        btn.innerHTML = `MOTION: ${this.motionMode === 'JET_RIGHT' ? 'JET R' : 'JET L'} (5.8y/s) <span class="kbd-hint">J</span>`;
      }
    }

    this.currentTick = 0;
    this.recomputeSimulation();
    this.syncInspectorAndMatrix();
  }

  private togglePreSnapMotion(): void {
    const sl =
      this.agents.find((a) => a.side === 'OFF' && (a.id === 'SL' || a.pos === 'SL' || a.pos === 'FB')) ||
      this.agents.find((a) => a.side === 'OFF' && a.id === 'WR1');
    if (!sl) return;

    const btn = document.getElementById('btn-jet-motion');

    if (this.motionMode === 'OFF') {
      this.motionMode = 'JET_RIGHT';
      sl.preSnapMotion = {
        enabled: true,
        type: 'JET_RIGHT',
        speed: 5.8,
        dirX: 1.0,
        dirY: 0.0,
        originX: -8.5,
        originY: -1.6,
        snapX: -0.6,
        snapY: -1.5,
      };
      sl.startX = -0.6;
      sl.startY = -1.5;
      sl.x = -0.6;
      sl.y = -1.5;
      sl.vx = 5.8;
      sl.vy = 0;
      sl.assignment.role = 'ROUTE';
      sl.assignment.waypoints = [
        { x: 4.5, y: -0.8 },
        { x: 11.5, y: 1.8 },
        { x: 14.5, y: 7.5 },
      ];
      if (btn) btn.innerHTML = `MOTION: JET R (5.8y/s) <span class="kbd-hint">J</span>`;
    } else if (this.motionMode === 'JET_RIGHT') {
      this.motionMode = 'JET_LEFT';
      sl.preSnapMotion = {
        enabled: true,
        type: 'JET_LEFT',
        speed: 5.8,
        dirX: -1.0,
        dirY: 0.0,
        originX: 8.5,
        originY: -1.6,
        snapX: 0.6,
        snapY: -1.5,
      };
      sl.startX = 0.6;
      sl.startY = -1.5;
      sl.x = 0.6;
      sl.y = -1.5;
      sl.vx = -5.8;
      sl.vy = 0;
      sl.assignment.role = 'ROUTE';
      sl.assignment.waypoints = [
        { x: -4.5, y: -0.8 },
        { x: -11.5, y: 1.8 },
        { x: -14.5, y: 7.5 },
      ];
      if (btn) btn.innerHTML = `MOTION: JET L (5.8y/s) <span class="kbd-hint">J</span>`;
    } else if (this.motionMode === 'JET_LEFT') {
      this.motionMode = 'ORBIT';
      sl.preSnapMotion = {
        enabled: true,
        type: 'ORBIT',
        speed: 5.2,
        dirX: 1.0,
        dirY: 0.2,
        originX: -6.5,
        originY: -1.8,
        snapX: 0.0,
        snapY: -3.2,
      };
      sl.startX = 0.0;
      sl.startY = -3.2;
      sl.x = 0.0;
      sl.y = -3.2;
      sl.vx = 5.2;
      sl.vy = 0.8;
      sl.assignment.role = 'ROUTE';
      sl.assignment.waypoints = [
        { x: 8.5, y: -1.0 },
        { x: 13.5, y: 3.5 },
      ];
      if (btn) btn.innerHTML = `MOTION: ORBIT (5.2y/s) <span class="kbd-hint">J</span>`;
    } else {
      this.motionMode = 'OFF';
      sl.preSnapMotion = undefined;
      sl.startX = -6.5;
      sl.startY = -0.8;
      sl.x = -6.5;
      sl.y = -0.8;
      sl.vx = 0;
      sl.vy = 0;
      sl.assignment.role = 'ROUTE';
      sl.assignment.waypoints = [
        { x: -6.5, y: 12.0 },
      ];
      if (btn) btn.innerHTML = `MOTION SHIFT <span class="kbd-hint">J</span>`;
    }

    this.currentTick = 0;
    this.recomputeSimulation();
    this.syncInspectorAndMatrix();
  }

  private applyProtectionMacro(macro: string): void {
    const off = this.agents.filter((a) => a.side === 'OFF');
    const byPos = (p: string) => off.find((a) => a.pos === p);

    switch (macro) {
      case 'HALF_SLIDE_L': {
        byPos('LT') && Object.assign(byPos('LT')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: 'RDE', leverage: 'OUTSIDE_IN' });
        byPos('LG') && Object.assign(byPos('LG')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: 'NT', leverage: 'INSIDE_OUT' });
        byPos('C') && Object.assign(byPos('C')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: 'NT', secondaryTargetId: 'WILL' });
        byPos('RG') && Object.assign(byPos('RG')!.assignment, { role: 'MAN_BLOCK', gapOrSet: 'B_RIGHT', primaryTargetId: '3T', leverage: 'INSIDE_OUT' });
        byPos('RT') && Object.assign(byPos('RT')!.assignment, { role: 'MAN_BLOCK', gapOrSet: 'C_RIGHT', primaryTargetId: 'LDE', leverage: 'INSIDE_OUT' });
        break;
      }
      case 'HALF_SLIDE_R': {
        byPos('LT') && Object.assign(byPos('LT')!.assignment, { role: 'MAN_BLOCK', gapOrSet: 'C_LEFT', primaryTargetId: 'RDE', leverage: 'INSIDE_OUT' });
        byPos('LG') && Object.assign(byPos('LG')!.assignment, { role: 'MAN_BLOCK', gapOrSet: 'B_LEFT', primaryTargetId: 'NT', leverage: 'INSIDE_OUT' });
        byPos('C') && Object.assign(byPos('C')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: '3T', secondaryTargetId: 'MIKE' });
        byPos('RG') && Object.assign(byPos('RG')!.assignment, { role: 'PASS_SET', gapOrSet: 'ANGLE_45', primaryTargetId: '3T', leverage: 'INSIDE_OUT' });
        byPos('RT') && Object.assign(byPos('RT')!.assignment, { role: 'PASS_SET', gapOrSet: 'VERTICAL_DEEP', primaryTargetId: 'LDE', leverage: 'OUTSIDE_IN' });
        break;
      }
      case 'MAX_PROTECT': {
        ['LT', 'LG', 'C', 'RG', 'RT'].forEach((p) => {
          const a = byPos(p);
          if (a) a.assignment.role = 'PASS_SET';
        });
        if (byPos('TE')) {
          Object.assign(byPos('TE')!.assignment, {
            role: 'CHIP_RELEASE',
            primaryTargetId: 'LDE',
            climbOrChipDelaySec: 0.75,
          });
        }
        if (byPos('RB')) {
          Object.assign(byPos('RB')!.assignment, {
            role: 'MAX_PROTECT_SCAN',
            primaryTargetId: 'MIKE',
          });
        }
        break;
      }
      case 'INSIDE_ZONE_R': {
        byPos('LT') && Object.assign(byPos('LT')!.assignment, { role: 'GAP_ZONE', gapOrSet: 'B_LEFT', leverage: 'OUTSIDE_IN' });
        byPos('LG') && Object.assign(byPos('LG')!.assignment, { role: 'COMBO_CLIMB', primaryTargetId: 'NT', secondaryTargetId: 'WILL', climbOrChipDelaySec: 0.6 });
        byPos('C') && Object.assign(byPos('C')!.assignment, { role: 'COMBO_CLIMB', primaryTargetId: 'NT', secondaryTargetId: 'WILL', climbOrChipDelaySec: 0.6 });
        byPos('RG') && Object.assign(byPos('RG')!.assignment, { role: 'COMBO_CLIMB', primaryTargetId: '3T', secondaryTargetId: 'MIKE', climbOrChipDelaySec: 0.65 });
        byPos('RT') && Object.assign(byPos('RT')!.assignment, { role: 'MAN_BLOCK', primaryTargetId: 'LDE', leverage: 'INSIDE_OUT' });
        break;
      }
      case 'OUTSIDE_ZONE_L': {
        ['LT', 'LG', 'C', 'RG', 'RT'].forEach((p, idx) => {
          const a = byPos(p);
          if (a) {
            Object.assign(a.assignment, {
              role: 'GAP_ZONE',
              gapOrSet: idx < 2 ? 'C_LEFT' : 'A_LEFT',
              leverage: 'OUTSIDE_IN',
            });
          }
        });
        break;
      }
      case 'POWER_PULL_G': {
        if (byPos('LG')) {
          Object.assign(byPos('LG')!.assignment, {
            role: 'PULL_LEAD',
            primaryTargetId: 'MIKE',
            waypoints: [
              { x: -0.4, y: -1.3 },
              { x: 2.6, y: -1.1 },
              { x: 3.3, y: 3.5 },
            ],
          });
        }
        break;
      }
      case 'PIN_AND_PULL': {
        if (byPos('LG')) {
          Object.assign(byPos('LG')!.assignment, {
            role: 'PULL_LEAD',
            primaryTargetId: 'CB2',
            waypoints: [
              { x: 1.0, y: -1.4 },
              { x: 6.2, y: -0.8 },
              { x: 8.5, y: 3.5 },
            ],
          });
        }
        if (byPos('C')) {
          Object.assign(byPos('C')!.assignment, {
            role: 'PULL_LEAD',
            primaryTargetId: 'MIKE',
            waypoints: [
              { x: 2.0, y: -1.2 },
              { x: 5.0, y: -0.5 },
              { x: 6.2, y: 3.0 },
            ],
          });
        }
        break;
      }
    }

    this.currentTick = 0;
    this.recomputeSimulation();
    this.syncInspectorAndMatrix();
  }

  private populateDefenderDropdowns(): void {
    const defs = this.agents.filter((a) => a.side === 'DEF');
    const sel1 = document.getElementById('insp-target-1') as HTMLSelectElement;
    const sel2 = document.getElementById('insp-target-2') as HTMLSelectElement;
    sel1.innerHTML = '<option value="">-- AUTO SECTOR / ZONE --</option>';
    sel2.innerHTML = '<option value="">-- AUTO 2ND LEVEL --</option>';

    for (const d of defs) {
      const nameTag = d.name ? ` — ${d.name}` : '';
      sel1.add(new Option(`${d.id} (${d.pos})${nameTag}`, d.id));
      sel2.add(new Option(`${d.id} (${d.pos})${nameTag}`, d.id));
    }
  }

  private syncInspectorAndMatrix(): void {
    const snap = this.snapshots[this.currentTick];
    const activeAgents = snap ? snap.agents : this.agents;
    const selected =
      activeAgents.find((a) => a.id === this.renderOpts.selectedAgentId) ||
      activeAgents.find((a) => a.side === 'OFF')!;

    const jerseyStr = selected.jersey !== undefined ? ` #${selected.jersey}` : '';
    document.getElementById('selected-entity-badge')!.textContent = `${selected.id}${jerseyStr} (${selected.side})`;

    // Update Scouting & Live Telemetry Banner
    const nameEl = document.getElementById('insp-player-name');
    const ratingsEl = document.getElementById('insp-player-ratings');
    const liveEl = document.getElementById('insp-player-live');
    if (nameEl && ratingsEl && liveEl) {
      const fullName = selected.name || selected.id;
      nameEl.textContent = `${selected.pos}${jerseyStr} — ${fullName} [${selected.side}]`;
      const r = selected.ratings;
      ratingsEl.textContent = `SPD ${r.speed} | ACC ${r.accel} | PWR ${r.power} | FIN ${r.finesse} | AWR ${r.awareness}`;

      const spdYps = Math.hypot(selected.vx, selected.vy).toFixed(1);
      if (selected.engagedWithId) {
        const winLoss = selected.leverageScore >= 0.08 ? 'WINNING' : selected.leverageScore <= -0.08 ? 'LOSING' : 'STALEMATE';
        liveEl.style.color =
          selected.leverageScore >= 0.08
            ? 'var(--accent-Positive)'
            : selected.leverageScore <= -0.08
            ? 'var(--accent-danger)'
            : 'var(--accent-secondary)';
        liveEl.textContent = `ENGAGED vs ${selected.engagedWithId} (${winLoss} | LEV ${selected.leverageScore >= 0 ? '+' : ''}${selected.leverageScore.toFixed(2)})`;
      } else if (selected.side === 'DEF' && selected.defAssignment) {
        liveEl.style.color = 'var(--accent-primary)';
        liveEl.textContent = `DEF ROLE: ${selected.defAssignment.role} | V=${spdYps} y/s`;
      } else {
        liveEl.style.color = 'var(--fg-1)';
        liveEl.textContent = `ROLE: ${selected.assignment.role} | V=${spdYps} y/s | XY=(${selected.x.toFixed(1)}, ${selected.y.toFixed(1)})`;
      }
    }

    const roleSel = document.getElementById('insp-role-type') as HTMLSelectElement;
    const tgt1Sel = document.getElementById('insp-target-1') as HTMLSelectElement;
    const tgt2Sel = document.getElementById('insp-target-2') as HTMLSelectElement;
    const gapSel = document.getElementById('insp-gap-set') as HTMLSelectElement;
    const levSel = document.getElementById('insp-leverage') as HTMLSelectElement;
    const delayInp = document.getElementById('insp-delay-sec') as HTMLInputElement;

    const isOff = selected.side === 'OFF';
    [roleSel, tgt1Sel, tgt2Sel, gapSel, levSel, delayInp].forEach((el) => {
      el.disabled = !isOff;
    });

    if (isOff) {
      roleSel.value = selected.assignment.role;
      tgt1Sel.value = selected.assignment.primaryTargetId || '';
      tgt2Sel.value = selected.assignment.secondaryTargetId || '';
      gapSel.value = selected.assignment.gapOrSet;
      levSel.value = selected.assignment.leverage;
      delayInp.value = String(selected.assignment.climbOrChipDelaySec);
    }

    // Update Landmark & Route Stem Inspector Controls
    const rowRoute = document.getElementById('row-route-preset');
    const rowPull = document.getElementById('row-pull-preset');
    const landmarksText = document.getElementById('insp-landmarks-text');
    const landmarksHint = document.getElementById('insp-landmarks-hint');
    const btnDrawRoute = document.getElementById('btn-draw-route') as HTMLButtonElement | null;
    const btnAddLm = document.getElementById('btn-add-landmark') as HTMLButtonElement | null;
    const btnPopLm = document.getElementById('btn-pop-landmark') as HTMLButtonElement | null;
    const btnClearWp = document.getElementById('btn-clear-waypoints') as HTMLButtonElement | null;

    if (isOff) {
      const isOL = ['LT', 'LG', 'C', 'RG', 'RT'].includes(selected.pos);
      if (rowPull) rowPull.style.display = isOL ? 'grid' : 'none';
      if (rowRoute) rowRoute.style.display = 'grid';

      if (btnDrawRoute) {
        btnDrawRoute.disabled = false;
        btnDrawRoute.innerHTML = isOL
          ? `DRAW PULL <span class="kbd-hint">R</span>`
          : `DRAW ROUTE <span class="kbd-hint">R</span>`;
        btnDrawRoute.classList.toggle('active', this.mode === 'ROUTE');
      }
      if (btnAddLm) btnAddLm.disabled = false;
      if (btnPopLm) btnPopLm.disabled = selected.assignment.waypoints.length === 0;
      if (btnClearWp) btnClearWp.disabled = false;

      const wps = selected.assignment.waypoints;
      if (landmarksText && landmarksHint) {
        if (wps.length === 0) {
          landmarksText.textContent = `LANDMARKS: None (0 nodes)`;
          landmarksHint.textContent = `Click [+ ADD LANDMARK] or [DRAW ROUTE]`;
        } else {
          const wpListStr = wps
            .map((w, idx) => `L${idx + 1}: ${w.x >= 0 ? '+' : ''}${w.x.toFixed(1)}, ${w.y >= 0 ? '+' : ''}${w.y.toFixed(1)}y`)
            .join(' → ');
          landmarksText.textContent = `LANDMARKS: ${wps.length} node${wps.length > 1 ? 's' : ''} (${wpListStr})`;
          landmarksHint.textContent = `Drag nodes on field`;
        }
      }
    } else {
      if (rowPull) rowPull.style.display = 'none';
      if (rowRoute) rowRoute.style.display = 'none';
      if (btnDrawRoute) btnDrawRoute.disabled = true;
      if (btnAddLm) btnAddLm.disabled = true;
      if (btnPopLm) btnPopLm.disabled = true;
      if (btnClearWp) btnClearWp.disabled = true;
      if (landmarksText) landmarksText.textContent = `DEFENDER (No Offensive Route Stem)`;
      if (landmarksHint) landmarksHint.textContent = '';
    }

    // Populate 11-player offensive assignment matrix with live matchup grades
    const tbody = document.getElementById('assignment-matrix-body')!;
    tbody.innerHTML = '';

    for (const off of activeAgents.filter((a) => a.side === 'OFF')) {
      const tr = document.createElement('tr');
      if (off.id === selected.id) tr.classList.add('selected');
      const asg = off.assignment;
      const wpSummary =
        asg.waypoints.length > 0 ? `${asg.waypoints.length} pts` : asg.secondaryTargetId || '-';

      let levCell = asg.leverage.slice(0, 3);
      let levColor = 'var(--fg-1)';
      if (off.engagedWithId) {
        const grade = off.leverageScore >= 0.08 ? 'WIN' : off.leverageScore <= -0.08 ? 'LOSS' : 'EVEN';
        levCell = `${grade} (${off.engagedWithId})`;
        levColor =
          grade === 'WIN'
            ? 'var(--accent-Positive)'
            : grade === 'LOSS'
            ? 'var(--accent-danger)'
            : 'var(--accent-secondary)';
      } else if (snap && snap.targetedReceiverId === off.id) {
        levCell = 'TARGET';
        levColor = 'var(--accent-secondary)';
      }

      const shortName = off.name ? off.name.split(' ').slice(-1)[0] : off.pos;
      tr.innerHTML = `
        <td style="font-weight:700" title="${off.name || off.pos}">${off.pos} <span style="color:var(--fg-2);font-weight:400;">${shortName}</span></td>
        <td>${asg.role}</td>
        <td>${asg.primaryTargetId || asg.gapOrSet}</td>
        <td>${wpSummary}</td>
        <td style="color:${levColor}; font-weight:700;">${levCell}</td>
      `;
      tr.addEventListener('click', () => {
        this.renderOpts.selectedAgentId = off.id;
        this.syncInspectorAndMatrix();
        this.drawCurrentFrame();
      });
      tbody.appendChild(tr);
    }
  }

  private setMode(m: InteractionMode): void {
    this.mode = m;
    document.getElementById('mode-select')?.classList.toggle('active', m === 'SELECT');
    document.getElementById('mode-block')?.classList.toggle('active', m === 'BLOCK');
    document.getElementById('mode-route')?.classList.toggle('active', m === 'ROUTE');
    document.getElementById('btn-draw-route')?.classList.toggle('active', m === 'ROUTE');
    document.getElementById('status-mode')!.textContent = `MODE: ${m}`;

    if (m === 'ROUTE') {
      const sel = this.agents.find((a) => a.id === this.renderOpts.selectedAgentId);
      const isOL = sel && ['LT', 'LG', 'C', 'RG', 'RT'].includes(sel.pos);
      const targetName = sel ? `${sel.pos} ${sel.name || ''}` : 'selected player';
      document.getElementById('status-hint')!.textContent = isOL
        ? `PULL DRAW ACTIVE: Click anywhere on field to add pull landmarks for ${targetName}...`
        : `ROUTE DRAW ACTIVE: Click anywhere on field to add route landmarks for ${targetName}...`;
    } else if (m === 'BLOCK') {
      document.getElementById('status-hint')!.textContent =
        'TIP: Press [B] then drag from any OL/TE/RB to a Defender (Man/Combo) or open field (Pull Path)';
    } else {
      document.getElementById('status-hint')!.textContent =
        'TIP: Select players to view assignments, or drag to shift pre-snap alignments';
    }
  }

  private bindUIEvents(canvas: HTMLCanvasElement): void {
    // Mode buttons
    document.getElementById('mode-select')!.addEventListener('click', () => this.setMode('SELECT'));
    document.getElementById('mode-block')!.addEventListener('click', () => this.setMode('BLOCK'));
    document.getElementById('mode-route')!.addEventListener('click', () => this.setMode('ROUTE'));

    // Overlay toggles
    document.getElementById('toggle-vectors')!.addEventListener('click', (e) => {
      this.renderOpts.showForceVectors = !this.renderOpts.showForceVectors;
      (e.currentTarget as HTMLElement).classList.toggle('active', this.renderOpts.showForceVectors);
      this.drawCurrentFrame();
    });
    document.getElementById('toggle-pocket')!.addEventListener('click', (e) => {
      this.renderOpts.showPocketPoly = !this.renderOpts.showPocketPoly;
      (e.currentTarget as HTMLElement).classList.toggle('active', this.renderOpts.showPocketPoly);
      this.drawCurrentFrame();
    });
    document.getElementById('toggle-leverage')!.addEventListener('click', (e) => {
      this.renderOpts.showLeverageCones = !this.renderOpts.showLeverageCones;
      (e.currentTarget as HTMLElement).classList.toggle('active', this.renderOpts.showLeverageCones);
      this.drawCurrentFrame();
    });
    document.getElementById('toggle-def-shell')?.addEventListener('click', (e) => {
      this.renderOpts.showDefenseAssignments = !this.renderOpts.showDefenseAssignments;
      (e.currentTarget as HTMLElement).classList.toggle('active', !!this.renderOpts.showDefenseAssignments);
      this.drawCurrentFrame();
    });

    // Skin selector
    const skinSel = document.getElementById('skin-select') as HTMLSelectElement;
    skinSel.addEventListener('change', () => {
      const id = skinSel.value as SkinId;
      this.themeManager.applySkin(id);
      document.getElementById('skin-indicator')!.textContent = `SKIN: ${id.toUpperCase()}`;
      this.drawCurrentFrame();
    });

    // Team Selectors (Offense & Defense 32-Team NFL Rosters)
    const onTeamChange = () => {
      this.applyTeamPersonnel(this.agents);
      this.recomputeSimulation();
      this.populateDefenderDropdowns();
      this.syncInspectorAndMatrix();
    };
    document.getElementById('off-team-select')!.addEventListener('change', onTeamChange);
    document.getElementById('def-team-select')!.addEventListener('change', onTeamChange);

    // Down & Distance Situation Selector & Situational Call Sheet Tab Handlers
    const sitSel = document.getElementById('situation-select') as HTMLSelectElement | null;
    const callTabs = document.querySelectorAll('.call-tab');

    callTabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const sit = (target.dataset.situation || 'ALL') as 'ALL' | DownDistanceSituation;
        this.activeSituationFilter = sit;

        callTabs.forEach((t) => t.classList.remove('active'));
        target.classList.add('active');

        if (sitSel) {
          if (sit === '1ST_10') sitSel.value = '10';
          else if (sit === '3RD_SHORT') sitSel.value = '3';
          else if (sit === '3RD_LONG') sitSel.value = '8';
          else if (sit === 'RED_ZONE') sitSel.value = '5';
          this.renderOpts.firstDownYards = parseFloat(sitSel.value) || 10.0;
        }

        this.renderPlaybookList();
        this.drawCurrentFrame();
      });
    });

    if (sitSel) {
      sitSel.addEventListener('change', () => {
        this.renderOpts.firstDownYards = parseFloat(sitSel.value) || 10.0;
        const val = sitSel.value;
        const mapValToSit: Record<string, DownDistanceSituation> = {
          '10': '1ST_10',
          '3': '3RD_SHORT',
          '8': '3RD_LONG',
          '5': 'RED_ZONE',
        };
        const matched = mapValToSit[val];
        if (matched) {
          this.activeSituationFilter = matched;
          callTabs.forEach((t) => {
            t.classList.toggle('active', (t as HTMLElement).dataset.situation === matched);
          });
          this.renderPlaybookList();
        }
        this.drawCurrentFrame();
      });
    }

    // Coordinator Audibles: Flip Play, Pre-Snap Motion & Mike ID
    document.getElementById('btn-flip-play')?.addEventListener('click', () => this.flipPlayLeftRight());
    document.getElementById('btn-jet-motion')?.addEventListener('click', () => this.togglePreSnapMotion());
    document.getElementById('btn-cycle-mike')?.addEventListener('click', () => this.cycleDeclaredMike());

    // Transport Controls
    document.getElementById('btn-reset')!.addEventListener('click', () => {
      this.pause();
      this.currentTick = 0;
      this.drawCurrentFrame();
      this.syncInspectorAndMatrix();
    });
    document.getElementById('btn-step')!.addEventListener('click', () => {
      this.pause();
      this.currentTick = Math.min(this.snapshots.length - 1, this.currentTick + 1);
      this.drawCurrentFrame();
      this.syncInspectorAndMatrix();
    });
    document.getElementById('btn-play')!.addEventListener('click', () => {
      if (this.isPlaying) this.pause();
      else this.play();
    });
    document.getElementById('btn-monte-carlo')!.addEventListener('click', () => {
      this.runMonteCarloBatch(100);
    });

    const slider = document.getElementById('timeline-slider') as HTMLInputElement;
    slider.addEventListener('input', () => {
      this.pause();
      this.currentTick = parseInt(slider.value, 10);
      this.drawCurrentFrame();
      this.syncInspectorAndMatrix();
    });

    // Protection Macro buttons
    document.querySelectorAll('[data-prot-macro]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const macro = (btn as HTMLElement).dataset.protMacro!;
        this.applyProtectionMacro(macro);
      });
    });

    // Auto Match Defense Toggle Button
    const btnAutoMatch = document.getElementById('btn-toggle-auto-match');
    btnAutoMatch?.addEventListener('click', () => {
      this.autoMatchDefense = !this.autoMatchDefense;
      if (this.autoMatchDefense) {
        btnAutoMatch.classList.add('active');
        btnAutoMatch.textContent = 'AUTO MATCH: ON';
        this.loadPlayPreset(this.activePresetId);
      } else {
        btnAutoMatch.classList.remove('active');
        btnAutoMatch.textContent = 'AUTO MATCH: OFF';
      }
    });

    // Defense shell change
    document.getElementById('def-call-select')!.addEventListener('change', (e) => {
      // If user manually modifies defensive look, toggle auto-match off
      this.autoMatchDefense = false;
      if (btnAutoMatch) {
        btnAutoMatch.classList.remove('active');
        btnAutoMatch.textContent = 'AUTO MATCH: OFF';
      }
      const val = (e.target as HTMLSelectElement).value;
      const offOnly = this.agents.filter((a) => a.side === 'OFF');
      this.agents = [...offOnly, ...this.createDefenseFront(val)];
      this.applyTeamPersonnel(this.agents);
      this.autoDesignateDefaultMike();
      this.updateQBPreSnapIntel();
      this.recomputeSimulation();
      this.populateDefenderDropdowns();
      this.syncInspectorAndMatrix();
    });

    // Evolutionary Play + Protection Mutator
    document.getElementById('btn-mutate-play')!.addEventListener('click', () => {
      this.mutateCurrentPlayAndProtection();
    });

    // Inspector Field Listeners
    const updateSelectedAssignment = () => {
      const sel = this.agents.find((a) => a.id === this.renderOpts.selectedAgentId);
      if (!sel || sel.side !== 'OFF') return;
      sel.assignment.role = (document.getElementById('insp-role-type') as HTMLSelectElement).value as BlockRoleType;
      sel.assignment.primaryTargetId = (document.getElementById('insp-target-1') as HTMLSelectElement).value || null;
      sel.assignment.secondaryTargetId = (document.getElementById('insp-target-2') as HTMLSelectElement).value || null;
      sel.assignment.gapOrSet = (document.getElementById('insp-gap-set') as HTMLSelectElement).value as GapOrSetCode;
      sel.assignment.leverage = (document.getElementById('insp-leverage') as HTMLSelectElement).value as LeverageBias;
      sel.assignment.climbOrChipDelaySec = parseFloat(
        (document.getElementById('insp-delay-sec') as HTMLInputElement).value
      ) || 0.65;

      this.recomputeSimulation();
      this.syncInspectorAndMatrix();
    };

    ['insp-role-type', 'insp-target-1', 'insp-target-2', 'insp-gap-set', 'insp-leverage', 'insp-delay-sec'].forEach(
      (id) => document.getElementById(id)!.addEventListener('change', updateSelectedAssignment)
    );

    // DRAW ROUTE / PATH BUTTON
    document.getElementById('btn-draw-route')?.addEventListener('click', () => {
      const sel = this.agents.find((a) => a.id === this.renderOpts.selectedAgentId);
      if (!sel || sel.side !== 'OFF') return;

      this.setMode('ROUTE');
      if (['LT', 'LG', 'C', 'RG', 'RT'].includes(sel.pos)) {
        if (!['PULL_LEAD', 'PULL_TRAP'].includes(sel.assignment.role)) {
          sel.assignment.role = 'PULL_LEAD';
        }
      } else if (sel.pos === 'RB') {
        if (sel.assignment.role !== 'BALL_CARRIER' && sel.assignment.role !== 'ROUTE') {
          sel.assignment.role = 'BALL_CARRIER';
        }
      } else {
        sel.assignment.role = 'ROUTE';
      }

      this.syncInspectorAndMatrix();
      this.drawCurrentFrame();
    });

    // + ADD LANDMARK BUTTON
    document.getElementById('btn-add-landmark')?.addEventListener('click', () => {
      const sel = this.agents.find((a) => a.id === this.renderOpts.selectedAgentId);
      if (!sel || sel.side !== 'OFF') return;

      const isOL = ['LT', 'LG', 'C', 'RG', 'RT'].includes(sel.pos);
      const wps = sel.assignment.waypoints;

      if (wps.length === 0) {
        if (isOL) {
          sel.assignment.role = 'PULL_LEAD';
          const dir = sel.startX < 0 ? 1 : -1;
          wps.push({ x: +(sel.startX + dir * 2.2).toFixed(2), y: +(sel.startY - 1.4).toFixed(2) });
        } else if (sel.pos === 'RB') {
          sel.assignment.role = 'BALL_CARRIER';
          const dir = sel.startX < 0 ? -1 : 1;
          wps.push({ x: +(sel.startX + dir * 3.5).toFixed(2), y: +(sel.startY + 2.5).toFixed(2) });
        } else {
          sel.assignment.role = 'ROUTE';
          wps.push({ x: +sel.startX.toFixed(2), y: +(Math.max(5.0, sel.startY + 6.0)).toFixed(2) });
        }
      } else {
        const last = wps[wps.length - 1];
        if (wps.length === 1) {
          const insideDir = sel.startX < 0 ? 1 : -1;
          if (isOL) {
            wps.push({ x: +(last.x + insideDir * 3.0).toFixed(2), y: +(last.y + 2.0).toFixed(2) });
          } else {
            wps.push({ x: +(last.x + insideDir * 4.5).toFixed(2), y: +(last.y + 3.5).toFixed(2) });
          }
        } else {
          const prev = wps[wps.length - 2];
          const dx = last.x - prev.x;
          const dy = last.y - prev.y;
          const len = Math.hypot(dx, dy) || 1;
          const extDist = 4.0;
          wps.push({
            x: +(last.x + (dx / len) * extDist).toFixed(2),
            y: +(last.y + (dy / len) * extDist).toFixed(2),
          });
        }
      }

      this.recomputeSimulation();
      this.syncInspectorAndMatrix();
      this.drawCurrentFrame();
    });

    // - POP LANDMARK BUTTON
    document.getElementById('btn-pop-landmark')?.addEventListener('click', () => {
      const sel = this.agents.find((a) => a.id === this.renderOpts.selectedAgentId);
      if (!sel || sel.side !== 'OFF') return;
      if (sel.assignment.waypoints.length > 0) {
        sel.assignment.waypoints.pop();
        this.recomputeSimulation();
        this.syncInspectorAndMatrix();
        this.drawCurrentFrame();
      }
    });

    // ROUTE TREE PRESETS DROPDOWN
    const routePresetSel = document.getElementById('insp-route-preset') as HTMLSelectElement | null;
    routePresetSel?.addEventListener('change', () => {
      const val = routePresetSel.value as RoutePresetId | '';
      if (!val) return;
      const sel = this.agents.find((a) => a.id === this.renderOpts.selectedAgentId);
      if (!sel || sel.side !== 'OFF') return;

      applyRoutePresetToAgent(sel, val);

      routePresetSel.value = '';
      this.recomputeSimulation();
      this.syncInspectorAndMatrix();
      this.drawCurrentFrame();
    });

    // PULL / TRAP SCHEME PRESETS DROPDOWN
    const pullPresetSel = document.getElementById('insp-pull-preset') as HTMLSelectElement | null;
    pullPresetSel?.addEventListener('change', () => {
      const val = pullPresetSel.value;
      if (!val) return;
      const sel = this.agents.find((a) => a.id === this.renderOpts.selectedAgentId);
      if (!sel || sel.side !== 'OFF') return;

      const x0 = sel.startX;
      const toRight = x0 < 0;
      const dir = toRight ? 1 : -1;

      if (val === 'PULL_KICK') {
        sel.assignment.role = 'PULL_TRAP';
        sel.assignment.waypoints = [
          { x: +(x0 + dir * 1.5).toFixed(2), y: -1.6 },
          { x: +(dir * 5.2).toFixed(2), y: 0.5 },
        ];
      } else if (val === 'PULL_WRAP') {
        sel.assignment.role = 'PULL_LEAD';
        sel.assignment.waypoints = [
          { x: +(x0 + dir * 2.0).toFixed(2), y: -1.8 },
          { x: +(dir * 4.2).toFixed(2), y: 1.8 },
          { x: +(dir * 4.5).toFixed(2), y: 4.5 },
        ];
      } else if (val === 'BACKSIDE_TRAP') {
        sel.assignment.role = 'PULL_TRAP';
        sel.assignment.waypoints = [
          { x: +(x0 + dir * 1.2).toFixed(2), y: -1.2 },
          { x: +(dir * 1.8).toFixed(2), y: 0.2 },
        ];
      } else if (val === 'PIN_PULL_SWEEP') {
        sel.assignment.role = 'PULL_LEAD';
        sel.assignment.waypoints = [
          { x: +(x0 + 2.5).toFixed(2), y: -1.6 },
          { x: 7.2, y: -0.5 },
          { x: 8.5, y: 3.5 },
        ];
      }

      pullPresetSel.value = '';
      this.recomputeSimulation();
      this.syncInspectorAndMatrix();
      this.drawCurrentFrame();
    });

    document.getElementById('btn-clear-waypoints')!.addEventListener('click', () => {
      const sel = this.agents.find((a) => a.id === this.renderOpts.selectedAgentId);
      if (sel && sel.side === 'OFF') {
        sel.assignment.waypoints = [];
        this.recomputeSimulation();
        this.syncInspectorAndMatrix();
        this.drawCurrentFrame();
      }
    });

    document.getElementById('btn-pick-target-canvas')!.addEventListener('click', () => {
      this.awaitingCanvasTargetPick = true;
      document.getElementById('status-hint')!.textContent =
        'TARGET PICK ACTIVE: Click any Defender on the field to lock as Target (Hold Shift for 2nd-Level Climb Target)';
    });

    // Canvas Mouse Interaction
    canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e, canvas));
    canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e, canvas));
    window.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e, canvas));

    // Power-user keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      const k = e.key.toLowerCase();
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.isPlaying) this.pause();
        else this.play();
      } else if (k === 's') {
        this.pause();
        this.currentTick = Math.min(this.snapshots.length - 1, this.currentTick + 1);
        this.drawCurrentFrame();
        this.syncInspectorAndMatrix();
      } else if (k === 'v') {
        this.setMode('SELECT');
      } else if (k === 'b') {
        this.setMode('BLOCK');
      } else if (k === 'r') {
        this.setMode('ROUTE');
      } else if (k === 'm') {
        this.runMonteCarloBatch(100);
      } else if (k === 'd') {
        document.getElementById('toggle-def-shell')?.click();
      } else if (k === 'f') {
        document.getElementById('toggle-vectors')?.click();
      } else if (k === 'p') {
        document.getElementById('toggle-pocket')?.click();
      } else if (k === 'l') {
        document.getElementById('toggle-leverage')?.click();
      } else if (k === 'x') {
        this.flipPlayLeftRight();
      } else if (k === 'j') {
        this.togglePreSnapMotion();
      } else if (k === 'i') {
        this.cycleDeclaredMike();
      } else if (k === '?') {
        window.open('explainer.html', '_blank');
      }
    });
  }

  private onCanvasMouseDown(e: MouseEvent, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const { wx, wy } = this.renderer.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const snapAgents = this.snapshots[this.currentTick]?.agents || this.agents;

    // 1. Check if clicking on an existing landmark node of the selected player to drag it
    const sel = this.agents.find((a) => a.id === this.renderOpts.selectedAgentId);
    if (sel && sel.side === 'OFF' && sel.assignment.waypoints.length > 0) {
      for (let i = 0; i < sel.assignment.waypoints.length; i++) {
        const wp = sel.assignment.waypoints[i];
        if (Math.hypot(wp.x - wx, wp.y - wy) < 1.35) {
          this.draggingWaypointIndex = i;
          this.dragSourceAgent = sel;
          return;
        }
      }
    }

    // 2. Find clicked agent
    const clicked = snapAgents.find((a) => Math.hypot(a.x - wx, a.y - wy) < 1.35);

    if (this.awaitingCanvasTargetPick && clicked && clicked.side === 'DEF') {
      if (sel && sel.side === 'OFF') {
        if (e.shiftKey) {
          sel.assignment.role = 'COMBO_CLIMB';
          sel.assignment.secondaryTargetId = clicked.id;
        } else {
          if (!['COMBO_CLIMB', 'CHIP_RELEASE', 'PULL_LEAD', 'PULL_TRAP'].includes(sel.assignment.role)) {
            sel.assignment.role = 'MAN_BLOCK';
          }
          sel.assignment.primaryTargetId = clicked.id;
        }
        this.awaitingCanvasTargetPick = false;
        this.recomputeSimulation();
        this.syncInspectorAndMatrix();
        return;
      }
    }

    if (clicked) {
      // Allow inspecting BOTH Offensive and Defensive players when clicked!
      this.renderOpts.selectedAgentId = clicked.id;
      this.syncInspectorAndMatrix();

      const baseAgent = this.agents.find((a) => a.id === clicked.id)!;
      this.dragSourceAgent = baseAgent;

      if (this.mode === 'SELECT') {
        this.isDraggingPosition = true;
      } else if (this.mode === 'BLOCK' && baseAgent.side === 'OFF') {
        this.renderOpts.activeDragLine = {
          fromX: baseAgent.startX,
          fromY: baseAgent.startY,
          toX: wx,
          toY: wy,
          isComboShift: e.shiftKey,
        };
      }
      this.drawCurrentFrame();
      return;
    }

    // 3. Clicked open field in BLOCK or ROUTE mode -> append landmark to selected offensive player
    if (sel && sel.side === 'OFF') {
      if (this.mode === 'BLOCK') {
        if (!['PULL_LEAD', 'PULL_TRAP', 'CHIP_RELEASE'].includes(sel.assignment.role)) {
          sel.assignment.role = 'PULL_LEAD';
        }
        sel.assignment.waypoints.push({ x: +wx.toFixed(2), y: +wy.toFixed(2) });
        this.recomputeSimulation();
        this.syncInspectorAndMatrix();
        this.drawCurrentFrame();
      } else if (this.mode === 'ROUTE') {
        if (['LT', 'LG', 'C', 'RG', 'RT'].includes(sel.pos)) {
          if (!['PULL_LEAD', 'PULL_TRAP'].includes(sel.assignment.role)) {
            sel.assignment.role = 'PULL_LEAD';
          }
        } else if (sel.pos === 'RB') {
          if (sel.assignment.role !== 'BALL_CARRIER' && sel.assignment.role !== 'ROUTE') {
            sel.assignment.role = 'BALL_CARRIER';
          }
        } else {
          sel.assignment.role = 'ROUTE';
        }
        sel.assignment.waypoints.push({ x: +wx.toFixed(2), y: +wy.toFixed(2) });
        this.recomputeSimulation();
        this.syncInspectorAndMatrix();
        this.drawCurrentFrame();
      }
    }
  }

  private onCanvasMouseMove(e: MouseEvent, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const { wx, wy } = this.renderer.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    document.getElementById('cursor-coords')!.textContent = `FIELD XY: (${wx.toFixed(1)}y, ${wy >= 0 ? '+' : ''}${wy.toFixed(1)}y)`;

    const snapAgents = this.snapshots[this.currentTick]?.agents || this.agents;
    const hovered = snapAgents.find((a) => Math.hypot(a.x - wx, a.y - wy) < 1.35);
    this.renderOpts.hoveredAgentId = hovered ? hovered.id : null;

    if (this.draggingWaypointIndex !== null && this.dragSourceAgent) {
      this.dragSourceAgent.assignment.waypoints[this.draggingWaypointIndex] = {
        x: +wx.toFixed(2),
        y: +wy.toFixed(2),
      };
      this.recomputeSimulation();
      this.syncInspectorAndMatrix();
      this.drawCurrentFrame();
      return;
    }

    if (this.isDraggingPosition && this.dragSourceAgent && this.currentTick === 0) {
      this.dragSourceAgent.startX = +wx.toFixed(2);
      this.dragSourceAgent.startY = +(
        this.dragSourceAgent.side === 'OFF' ? Math.min(-0.2, wy) : Math.max(0.3, wy)
      ).toFixed(2);
      this.recomputeSimulation();
      return;
    }

    if (this.renderOpts.activeDragLine) {
      this.renderOpts.activeDragLine.toX = wx;
      this.renderOpts.activeDragLine.toY = wy;
      this.renderOpts.activeDragLine.isComboShift = e.shiftKey;
    }

    this.drawCurrentFrame();
  }

  private onCanvasMouseUp(e: MouseEvent, canvas: HTMLCanvasElement): void {
    if (this.draggingWaypointIndex !== null) {
      this.draggingWaypointIndex = null;
      this.recomputeSimulation();
      this.syncInspectorAndMatrix();
      this.drawCurrentFrame();
      return;
    }

    if (this.renderOpts.activeDragLine && this.dragSourceAgent) {
      const rect = canvas.getBoundingClientRect();
      const { wx, wy } = this.renderer.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const targetDef = this.agents.find(
        (a) => a.side === 'DEF' && Math.hypot(a.startX - wx, a.startY - wy) < 1.6
      );

      if (targetDef) {
        if (e.shiftKey && this.dragSourceAgent.assignment.primaryTargetId) {
          this.dragSourceAgent.assignment.role = 'COMBO_CLIMB';
          this.dragSourceAgent.assignment.secondaryTargetId = targetDef.id;
        } else {
          this.dragSourceAgent.assignment.role = 'MAN_BLOCK';
          this.dragSourceAgent.assignment.primaryTargetId = targetDef.id;
        }
      } else if (Math.hypot(wx - this.dragSourceAgent.startX, wy - this.dragSourceAgent.startY) > 1.5) {
        this.dragSourceAgent.assignment.role = 'PULL_LEAD';
        this.dragSourceAgent.assignment.waypoints = [{ x: +wx.toFixed(2), y: +wy.toFixed(2) }];
      }

      this.renderOpts.activeDragLine = null;
      this.recomputeSimulation();
      this.syncInspectorAndMatrix();
    }

    this.isDraggingPosition = false;
    this.dragSourceAgent = null;
  }

  private mutateCurrentPlayAndProtection(): void {
    let bestAgents = JSON.parse(JSON.stringify(this.agents)) as SimAgent[];
    const fieldCtx = this.getActiveFieldContext();
    let bestEpa = this.snapshots[this.snapshots.length - 1]?.expectedEpa ?? 0;

    const leverages: LeverageBias[] = ['INSIDE_OUT', 'NEUTRAL', 'OUTSIDE_IN'];
    for (let i = 0; i < 16; i++) {
      const candidate = JSON.parse(JSON.stringify(bestAgents)) as SimAgent[];
      const routeCandidates = candidate.filter(
        (x) =>
          x.side === 'OFF' &&
          x.assignment.role === 'ROUTE' &&
          !x.optionPass?.enabled &&
          !x.lateralConfig?.enabled &&
          !x.backwardToss?.enabled
      );

      // Seed structural route stems from the canonical 16-route tree in later mutation trials
      if (i >= 4 && routeCandidates.length > 0) {
        const seedTarget = routeCandidates[Math.floor(Math.random() * routeCandidates.length)];
        const pool = seedTarget.pos === 'RB' ? BACKFIELD_EVOLUTION_SEEDS : RECEIVER_EVOLUTION_SEEDS;
        const chosenPreset = pool[Math.floor(Math.random() * pool.length)];
        applyRoutePresetToAgent(seedTarget, chosenPreset);
      }

      for (const a of candidate.filter((x) => x.side === 'OFF')) {
        if (Math.random() < 0.35) {
          a.assignment.leverage = leverages[Math.floor(Math.random() * leverages.length)];
        }
        const jitterSpan = i >= 4 ? 1.2 : 1.8;
        for (const wp of a.assignment.waypoints) {
          const nextX = wp.x + (Math.random() - 0.5) * jitterSpan;
          wp.x = +Math.max(-25.2, Math.min(25.2, nextX)).toFixed(2);
          wp.y = +(wp.y + (Math.random() - 0.5) * jitterSpan).toFixed(2);
        }
      }
      const sim = this.engine.simulatePlay(candidate, 0.0, fieldCtx);
      const term = sim.find((s) => s.playOver) || sim[sim.length - 1];
      if (term.expectedEpa > bestEpa) {
        bestEpa = term.expectedEpa;
        bestAgents = candidate;
      }
    }

    this.agents = bestAgents;
    this.recomputeSimulation();
    this.syncInspectorAndMatrix();
  }

  private runMonteCarloBatch(runs: number): void {
    let sumEpa = 0;
    let sumYards = 0;
    let sumPocket = 0;
    let sumLev = 0;
    let sumTime = 0;
    let successes = 0;
    let explosives = 0;
    let pressuresOrStuffs = 0;
    const traces: MonteCarloRunTrace[] = [];
    const bucketCounts = [0, 0, 0, 0, 0]; // [<=0y, 1-4y, 5-9y, 10-14y, 15y+/TD]

    const isRunPlay = this.agents.some((a) => a.side === 'OFF' && a.assignment.role === 'BALL_CARRIER');
    const toGo = this.renderOpts.firstDownYards ?? 10.0;

    for (let i = 0; i < runs; i++) {
      const traj = this.engine.simulatePlay(this.agents, 1.0, this.getActiveFieldContext());
      const termIdx = traj.findIndex((s) => s.playOver);
      const activeEndIdx = termIdx >= 0 ? termIdx : traj.length - 1;
      const termFrame = traj[activeEndIdx];
      sumEpa += termFrame.expectedEpa;
      sumPocket += termFrame.pocketIntegrity;
      sumLev += termFrame.trenchNetYards;
      sumTime += termFrame.timeToThrowOrGapSec ?? termFrame.timeSec;

      const yds = termFrame.carrierTackledYards ?? 0;
      sumYards += yds;
      const isTurnover =
        termFrame.terminationReason === 'FUMBLE_LOST' ||
        termFrame.terminationReason === 'INTERCEPTION';
      if (!isTurnover && (yds >= 15.0 || termFrame.terminationReason === 'TOUCHDOWN')) explosives++;

      if (
        yds <= 0.0 ||
        termFrame.terminationReason === 'INCOMPLETE' ||
        termFrame.terminationReason === 'INTERCEPTION' ||
        termFrame.terminationReason === 'SACK' ||
        termFrame.terminationReason === 'FUMBLE_LOST' ||
        termFrame.terminationReason === 'FUMBLE_RECOVERED'
      ) {
        bucketCounts[0]++;
      } else if (yds < 4.5) {
        bucketCounts[1]++;
      } else if (yds < 9.5) {
        bucketCounts[2]++;
      } else if (yds < 15.0 && termFrame.terminationReason !== 'TOUCHDOWN') {
        bucketCounts[3]++;
      } else {
        bucketCounts[4]++;
      }

      const pts: { x: number; y: number }[] = [];
      for (let t = 0; t <= activeEndIdx; t += 2) {
        const b = traj[t].ball;
        if (b) pts.push({ x: b.x, y: b.y });
      }
      const endBall = termFrame.ball;
      const endX = endBall ? endBall.x : 0;
      const endY =
        termFrame.terminationReason === 'INCOMPLETE' || termFrame.terminationReason === 'INTERCEPTION'
          ? endBall?.targetY ?? endBall?.y ?? 0
          : yds;

      const hadHookLateral = traj.some((s) => s.exoticEvent === 'HOOK_AND_LATERAL');
      const hadPassComp =
        termFrame.terminationReason === 'COMPLETE' ||
        termFrame.terminationReason === 'TOUCHDOWN' ||
        Boolean(termFrame.ball?.completedPass);
      const isFail =
        termFrame.terminationReason === 'INCOMPLETE' ||
        termFrame.terminationReason === 'INTERCEPTION' ||
        termFrame.terminationReason === 'SACK' ||
        termFrame.terminationReason === 'FUMBLE_LOST' ||
        termFrame.terminationReason === 'FUMBLE_RECOVERED' ||
        yds < 0;

      const kind: MonteCarloRunTrace['kind'] = isFail
        ? 'FAIL'
        : hadHookLateral
        ? 'LATERAL'
        : hadPassComp
        ? 'PASS_COMP'
        : 'RUN_GAIN';

      if (pts.length > 0 && !isFail) {
        pts.push({ x: endX, y: endY });
      }
      traces.push({ kind, points: pts, endX, endY, yards: yds });

      const converted = toGo <= 4.0 ? yds >= toGo : yds >= toGo * 0.45;
      if (
        (termFrame.expectedEpa > 0 || converted) &&
        termFrame.terminationReason !== 'SACK' &&
        termFrame.terminationReason !== 'INCOMPLETE' &&
        termFrame.terminationReason !== 'INTERCEPTION' &&
        termFrame.terminationReason !== 'FUMBLE_LOST' &&
        termFrame.terminationReason !== 'FUMBLE_RECOVERED'
      ) {
        successes++;
      }

      if (isRunPlay) {
        if (yds <= 0.5) pressuresOrStuffs++;
      } else {
        const minPocket = Math.min(...traj.map((s) => s.pocketIntegrity));
        if (minPocket < 45 || termFrame.terminationReason === 'SACK') pressuresOrStuffs++;
      }
    }

    this.isMonteCarloView = true;
    this.renderOpts.monteCarloOverlay = {
      runs,
      meanYards: sumYards / runs,
      meanEpa: sumEpa / runs,
      successRatePct: (successes / runs) * 100,
      explosiveRatePct: (explosives / runs) * 100,
      traces,
      buckets: [
        { label: '<= 0y', pct: (bucketCounts[0] / runs) * 100, color: '#f85149' },
        { label: '1-4y', pct: (bucketCounts[1] / runs) * 100, color: '#d29922' },
        { label: '5-9y', pct: (bucketCounts[2] / runs) * 100, color: '#58a6ff' },
        { label: '10-14y', pct: (bucketCounts[3] / runs) * 100, color: '#3fb950' },
        { label: '15y+/TD', pct: (bucketCounts[4] / runs) * 100, color: '#06b6d4' },
      ],
    };

    if (this.currentTick === 0) {
      const actionIdx = this.snapshots.findIndex(
        (s) =>
          s.exoticEvent === 'HOOK_AND_LATERAL' ||
          s.exoticEvent === 'OPTION_PASS' ||
          s.playOver
      );
      if (actionIdx > 0) {
        this.currentTick = actionIdx;
      }
    }

    document.getElementById('mc-sample-label')!.textContent = `MC BATCH (N=${runs})`;
    document.getElementById('val-epa')!.textContent = `${sumEpa / runs >= 0 ? '+' : ''}${(sumEpa / runs).toFixed(2)}`;
    document.getElementById('val-pocket')!.textContent = `${(sumPocket / runs).toFixed(1)}%`;
    document.getElementById('val-leverage')!.textContent = `${sumLev / runs >= 0 ? '+' : ''}${(sumLev / runs).toFixed(2)} yds`;
    document.getElementById('val-ttt')!.textContent = `${(sumTime / runs).toFixed(2)}s`;
    document.getElementById('val-sr')!.textContent = `${((successes / runs) * 100).toFixed(1)}%`;
    document.getElementById('val-pressure')!.textContent = `${((pressuresOrStuffs / runs) * 100).toFixed(1)}%`;

    this.drawCurrentFrame();
    this.syncInspectorAndMatrix();
  }

  private play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    document.getElementById('btn-play')!.textContent = 'PAUSE';
    if (this.currentTick >= this.snapshots.length - 1) {
      this.currentTick = 0;
    }
    this.lastStepTime = performance.now();
    const loop = (now: number) => {
      if (!this.isPlaying) return;
      if (now - this.lastStepTime >= 50) {
        this.lastStepTime = now;
        this.currentTick++;
        if (this.currentTick >= this.snapshots.length) {
          this.currentTick = this.snapshots.length - 1;
          this.pause();
          this.syncInspectorAndMatrix();
          return;
        }
        this.drawCurrentFrame();
        this.syncInspectorAndMatrix();
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private pause(): void {
    this.isPlaying = false;
    document.getElementById('btn-play')!.textContent = 'RUN 20Hz';
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private drawCurrentFrame(): void {
    const snap = this.snapshots[this.currentTick];
    if (!snap) return;

    this.renderer.render(snap, this.themeManager.getTheme().canvas, this.renderOpts);

    const sliderEl = document.getElementById('timeline-slider') as HTMLInputElement;
    sliderEl.max = String(Math.max(1, this.snapshots.length - 1));
    sliderEl.value = String(this.currentTick);
    document.getElementById('clock-readout')!.textContent = `T = ${snap.timeSec.toFixed(2)}s (TICK ${String(snap.tick).padStart(2, '0')} / ${this.snapshots.length - 1})`;
    const ydsStr =
      snap.carrierTackledYards !== null && snap.carrierTackledYards !== undefined
        ? ` (${snap.carrierTackledYards >= 0 ? '+' : ''}${snap.carrierTackledYards.toFixed(1)}y)`
        : '';
    const phaseText = snap.playOver && snap.terminationReason
      ? `PHASE: ${snap.phase} [${snap.terminationReason}${ydsStr}]`
      : `PHASE: ${snap.phase}`;
    document.getElementById('phase-readout')!.textContent = phaseText;

    if (!this.isMonteCarloView) {
      document.getElementById('val-epa')!.textContent = `${snap.expectedEpa >= 0 ? '+' : ''}${snap.expectedEpa.toFixed(2)}`;
      document.getElementById('val-pocket')!.textContent = `${snap.pocketIntegrity.toFixed(1)}%`;
      document.getElementById('val-leverage')!.textContent = `${snap.trenchNetYards >= 0 ? '+' : ''}${snap.trenchNetYards.toFixed(2)} yds`;

      // Compute Single-Run Dynamic Telemetry for Cells 4, 5, 6
      const termSnap = this.snapshots.find((s) => s.playOver) || this.snapshots[this.snapshots.length - 1];
      const launchSnap = this.snapshots.find((s) => s.ball?.state === 'IN_FLIGHT');
      const losCrossSnap = this.snapshots.find((s) => {
        const bc = s.agents.find((a) => a.assignment.role === 'BALL_CARRIER');
        return bc && bc.y >= 0.0;
      });

      const isRun = snap.agents.some((a) => a.assignment.role === 'BALL_CARRIER');
      if (isRun) {
        const crossSec = losCrossSnap ? losCrossSnap.timeSec : termSnap.timeSec;
        document.getElementById('val-ttt')!.textContent = `${crossSec.toFixed(2)}s LOS`;
      } else {
        const tttSec = launchSnap ? launchSnap.timeSec : termSnap.timeSec;
        document.getElementById('val-ttt')!.textContent = `${tttSec.toFixed(2)}s TTT`;
      }

      const finalYds = termSnap.carrierTackledYards ?? 0;
      const toGo = this.renderOpts.firstDownYards ?? 10.0;
      const isSuccess =
        termSnap.terminationReason !== 'SACK' &&
        termSnap.terminationReason !== 'INCOMPLETE' &&
        termSnap.terminationReason !== 'INTERCEPTION' &&
        termSnap.terminationReason !== 'FUMBLE_LOST' &&
        (termSnap.expectedEpa > 0 || finalYds >= toGo);
      document.getElementById('val-sr')!.textContent = isSuccess
        ? `WIN (${finalYds >= 0 ? '+' : ''}${finalYds.toFixed(1)}y)`
        : `LOSS (${finalYds >= 0 ? '+' : ''}${finalYds.toFixed(1)}y)`;

      if (isRun) {
        document.getElementById('val-pressure')!.textContent = finalYds <= 0.5 ? 'STUFFED' : finalYds >= 10.0 ? 'EXPLOSIVE' : 'CLEAN FIT';
      } else {
        const minPocket = Math.min(...this.snapshots.map((s) => s.pocketIntegrity));
        document.getElementById('val-pressure')!.textContent =
          termSnap.terminationReason === 'SACK'
            ? 'SACKED'
            : minPocket < 45
            ? 'PRESSURED'
            : 'CLEAN POCKET';
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new All22WorkstationApp();
});
