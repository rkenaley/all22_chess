import { SimAgent, PlayTickSnapshot, GAP_X_COORDS } from './engine';
import { CanvasSkinTokens } from './theme';

export interface MonteCarloRunTrace {
  kind: 'LATERAL' | 'PASS_COMP' | 'RUN_GAIN' | 'FAIL';
  points: { x: number; y: number }[];
  endX: number;
  endY: number;
  yards: number;
}

export interface MonteCarloOverlayData {
  runs: number;
  meanYards: number;
  meanEpa: number;
  successRatePct: number;
  explosiveRatePct: number;
  traces: MonteCarloRunTrace[];
  buckets: { label: string; pct: number; color: string }[];
}

export interface RenderOptions {
  showForceVectors: boolean;
  showPocketPoly: boolean;
  showLeverageCones: boolean;
  showDefenseAssignments?: boolean;
  showMotionTrails?: boolean;
  trailSnapshots?: PlayTickSnapshot[];
  firstDownYards?: number;
  yardLineToGoal?: number;
  selectedAgentId: string | null;
  hoveredAgentId: string | null;
  designatedMikeId?: string | null;
  monteCarloOverlay?: MonteCarloOverlayData | null;
  activeDragLine: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    isComboShift: boolean;
  } | null;
}

export class BroadcastRenderPipeline {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Offscreen static turf/grid cache at >=1080p native backing resolution
  private fieldCacheCanvas: HTMLCanvasElement;
  private fieldCacheCtx: CanvasRenderingContext2D;
  private fieldCacheKey = '';

  private cssWidth = 1280;
  private cssHeight = 760;
  private backingWidth = 1920;
  private backingHeight = 1080;

  // Field world bounds: X in [-26.67, +26.67] yards, Y in [-9.5, +24.5] yards
  private readonly viewWidthYards = 55.6; // Slight sideline apron visibility
  private readonly minY = -9.5;
  private readonly maxY = 23.5;

  // Interactive camera zoom & pan
  private zoom = 1.0;
  private panX = 0.0; // world yards offset
  private panY = 0.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('2D Canvas context unavailable');
    this.ctx = context;

    this.fieldCacheCanvas = document.createElement('canvas');
    const cacheCtx = this.fieldCacheCanvas.getContext('2d', { alpha: false });
    if (!cacheCtx) throw new Error('Offscreen 2D Canvas context unavailable');
    this.fieldCacheCtx = cacheCtx;
  }

  public getZoom(): number {
    return this.zoom;
  }

  public setZoom(nextZoom: number): void {
    this.zoom = Math.max(0.85, Math.min(2.25, +nextZoom.toFixed(2)));
    this.fieldCacheKey = '';
  }

  public nudgePan(dxWorld: number, dyWorld: number): void {
    this.panX = Math.max(-18, Math.min(18, this.panX + dxWorld));
    this.panY = Math.max(-10, Math.min(14, this.panY + dyWorld));
    this.fieldCacheKey = '';
  }

  public resetView(): void {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.fieldCacheKey = '';
  }

  public getBackingResolution(): { width: number; height: number } {
    return { width: this.backingWidth, height: this.backingHeight };
  }

  public resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (!rect || rect.width < 10 || rect.height < 10) return;

    const cssW = Math.round(rect.width);
    const cssH = Math.round(rect.height);
    const aspect = cssW / Math.max(1, cssH);
    const dpr = Math.max(window.devicePixelRatio || 1, 2);

    // Guarantee >= 1920x1080 supersampled backing store regardless of viewport size
    let backingW = Math.max(1920, Math.round(cssW * dpr));
    let backingH = Math.round(backingW / Math.max(0.25, aspect));
    if (backingH < 1080) {
      backingH = 1080;
      backingW = Math.round(backingH * aspect);
    }

    this.cssWidth = cssW;
    this.cssHeight = cssH;
    this.backingWidth = backingW;
    this.backingHeight = backingH;

    this.canvas.width = backingW;
    this.canvas.height = backingH;
    this.fieldCacheCanvas.width = backingW;
    this.fieldCacheCanvas.height = backingH;

    const scaleX = backingW / cssW;
    const scaleY = backingH / cssH;
    this.ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    this.fieldCacheCtx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    this.fieldCacheKey = '';
  }

  private getBaseScale(): number {
    const scaleX = this.cssWidth / this.viewWidthYards;
    const scaleY = this.cssHeight / (this.maxY - this.minY);
    return Math.min(scaleX, scaleY) * 0.94 * this.zoom;
  }

  public worldToScreen(wx: number, wy: number): { sx: number; sy: number; scale: number } {
    const scale = this.getBaseScale();
    const cx = this.cssWidth * 0.5;
    const losScreenY = this.cssHeight * 0.70;
    return {
      sx: cx + (wx - this.panX) * scale,
      sy: losScreenY - (wy - this.panY) * scale,
      scale,
    };
  }

  public screenToWorld(sx: number, sy: number): { wx: number; wy: number } {
    const scale = this.getBaseScale();
    const cx = this.cssWidth * 0.5;
    const losScreenY = this.cssHeight * 0.70;
    return {
      wx: +((sx - cx) / scale + this.panX).toFixed(2),
      wy: +((losScreenY - sy) / scale + this.panY).toFixed(2),
    };
  }

  public render(snapshot: PlayTickSnapshot, skin: CanvasSkinTokens, opts: RenderOptions): void {
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;
    if (w < 10 || h < 10) return;

    // LAYER 0: Static Broadcast Turf & Field Grid (Offscreen Cached at >=1080p)
    const firstDownYards = opts.firstDownYards ?? 10;
    const cacheKey = `${w}x${h}|${this.backingWidth}x${this.backingHeight}|${this.zoom}|${this.panX}|${this.panY}|${skin.fieldBgPrimary}|${skin.losColor}|${firstDownYards}|${opts.yardLineToGoal ?? 'open'}`;
    if (this.fieldCacheKey !== cacheKey) {
      this.renderFieldCache(this.fieldCacheCtx, w, h, skin, firstDownYards, opts.yardLineToGoal);
      this.fieldCacheKey = cacheKey;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.fieldCacheCanvas, 0, 0);
    ctx.restore();

    // LAYER 1: Strategic Overlays (Voronoi Coverage, Pocket Hull, Scramble Void, Fake Arcs, MC Fan)
    if (opts.monteCarloOverlay) {
      this.drawMonteCarloFan(ctx, opts.monteCarloOverlay);
    }
    if (opts.showPocketPoly) {
      this.drawPocketPolygon(ctx, snapshot, skin);
    }
    if (opts.showDefenseAssignments) {
      this.drawDefensiveAssignments(ctx, snapshot.agents, skin, opts);
    }
    this.drawScrambleVoidAndExotics(ctx, snapshot.agents, skin, opts);

    // LAYER 2: Schematic Vectors & Motion Trails (Halo-Cased Paths)
    if (opts.showMotionTrails && opts.trailSnapshots && opts.trailSnapshots.length > 1) {
      this.drawMotionTrails(ctx, opts.trailSnapshots, skin);
    }
    this.drawAssignments(ctx, snapshot.agents, skin, opts);

    if (opts.activeDragLine) {
      this.drawActiveDragLine(ctx, opts.activeDragLine, skin);
    }
    if (opts.showForceVectors || opts.showLeverageCones) {
      this.drawTrenchTelemetry(ctx, snapshot.agents, skin, opts);
    }

    // LAYER 3: High-Contrast Player Tokens & Airborne Ball Parabola
    for (const agent of snapshot.agents) {
      this.drawAgent(ctx, agent, snapshot, skin, opts);
    }
    if (snapshot.ball) {
      this.drawBallAndPassArc(ctx, snapshot, skin);
    }

    // LAYER 4: Broadcast HUD Banners & Compact Legend
    if (snapshot.playOver && snapshot.terminationReason) {
      this.drawTerminationBanner(ctx, w, snapshot, skin);
    }
    if (opts.monteCarloOverlay) {
      this.drawMonteCarloHud(ctx, opts.monteCarloOverlay, skin);
    }
    this.drawCompactLegend(ctx, w, h, skin);

    if (skin.scanlines) {
      this.drawScanlines(ctx, w, h);
    }
  }

  // ==========================================================================
  // LAYER 0: OFFSCREEN CACHED FIELD & BROADCAST NUMERAL ARTWORK
  // ==========================================================================
  private renderFieldCache(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    skin: CanvasSkinTokens,
    firstDownYards: number,
    yardLineToGoal?: number
  ): void {
    ctx.fillStyle = skin.fieldApronBg;
    ctx.fillRect(0, 0, w, h);

    const fieldLeft = this.worldToScreen(-26.67, 0).sx;
    const fieldRight = this.worldToScreen(26.67, 0).sx;
    const fieldW = fieldRight - fieldLeft;

    // Clipped inner turf area
    ctx.save();
    ctx.beginPath();
    ctx.rect(fieldLeft, 0, fieldW, h);
    ctx.clip();

    ctx.fillStyle = skin.fieldBgPrimary;
    ctx.fillRect(fieldLeft, 0, fieldW, h);

    // 5-yard mown bands & 1-yard tick laser lines
    for (let y = -12; y <= 32; y += 1) {
      const pL = this.worldToScreen(-26.67, y);
      const pR = this.worldToScreen(26.67, y);

      if (y % 5 === 0 && y < 32) {
        const pNext = this.worldToScreen(26.67, y + 5);
        if (Math.abs(Math.floor(y / 5)) % 2 === 1) {
          ctx.fillStyle = skin.fieldBgAlt;
          ctx.fillRect(fieldLeft, pNext.sy, fieldW, pL.sy - pNext.sy);
        }
      }

      ctx.strokeStyle = y % 5 === 0 ? skin.yardLineMajor : skin.yardLineMinor;
      ctx.lineWidth = y % 5 === 0 ? 1.5 : 0.7;
      ctx.beginPath();
      ctx.moveTo(pL.sx, pL.sy);
      ctx.lineTo(pR.sx, pR.sy);
      ctx.stroke();

      // Hash marks at +-3.08y + sideline short ticks
      const hL1 = this.worldToScreen(-3.38, y);
      const hL2 = this.worldToScreen(-2.78, y);
      const hR1 = this.worldToScreen(2.78, y);
      const hR2 = this.worldToScreen(3.38, y);
      const tL2 = this.worldToScreen(-26.0, y);
      const tR1 = this.worldToScreen(26.0, y);
      ctx.strokeStyle = skin.hashMarkColor;
      ctx.lineWidth = y % 5 === 0 ? 1.5 : 1.05;
      ctx.beginPath();
      ctx.moveTo(hL1.sx, hL1.sy);
      ctx.lineTo(hL2.sx, hL2.sy);
      ctx.moveTo(hR1.sx, hR1.sy);
      ctx.lineTo(hR2.sx, hR2.sy);
      ctx.moveTo(fieldLeft, pL.sy);
      ctx.lineTo(tL2.sx, tL2.sy);
      ctx.moveTo(tR1.sx, tR1.sy);
      ctx.lineTo(fieldRight, pR.sy);
      ctx.stroke();

      // Translucent Broadcast Field Depth Numbers every 5 yards
      if (y % 5 === 0 && y !== 0 && y >= -5 && y <= 20) {
        const label = `${y > 0 ? '+' : ''}${y}`;
        const nL = this.worldToScreen(-19.2, y);
        const nR = this.worldToScreen(19.2, y);
        ctx.fillStyle = skin.yardNumberColor;
        ctx.font = `800 18px ${skin.fontFamilyCanvas}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, nL.sx, nL.sy - 11);
        ctx.fillText(label, nR.sx, nR.sy - 11);
      }
    }

    // End zone hatching when inside 18-yard line
    if (yardLineToGoal !== undefined && yardLineToGoal <= 18) {
      const gl = this.worldToScreen(-26.67, yardLineToGoal);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
      ctx.fillRect(fieldLeft, 0, fieldW, gl.sy);

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.14)';
      ctx.lineWidth = 6;
      for (let sx = fieldLeft - 300; sx < fieldRight + 300; sx += 26) {
        ctx.beginPath();
        ctx.moveTo(sx, gl.sy);
        ctx.lineTo(sx + 180, 0);
        ctx.stroke();
      }
    }

    // Subtle Broadcast Lighting Vignette
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.52, Math.min(w, h) * 0.18, w * 0.5, h * 0.52, Math.max(w, h) * 0.72);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, skin.fieldVignette);
    ctx.fillStyle = grad;
    ctx.fillRect(fieldLeft, 0, fieldW, h);

    // Glowing Line of Scrimmage (Y = 0)
    const losL = this.worldToScreen(-26.67, 0);
    const losR = this.worldToScreen(26.67, 0);
    ctx.save();
    ctx.strokeStyle = skin.losColor;
    ctx.shadowColor = skin.losColor;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(losL.sx, losL.sy);
    ctx.lineTo(losR.sx, losR.sy);
    ctx.stroke();
    ctx.restore();

    // LOS Pill Badge
    this.drawEdgeMarkerPill(ctx, fieldLeft + 8, losL.sy, 'LOS 0Y', skin.losColor, '#040a0e', skin);

    // Goal Line OR First Down Laser
    if (yardLineToGoal !== undefined && yardLineToGoal <= 18) {
      const glL = this.worldToScreen(-26.67, yardLineToGoal);
      const glR = this.worldToScreen(26.67, yardLineToGoal);
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(glL.sx, glL.sy);
      ctx.lineTo(glR.sx, glR.sy);
      ctx.stroke();
      ctx.restore();
      this.drawEdgeMarkerPill(ctx, fieldRight - 108, glR.sy, `GOAL +${yardLineToGoal.toFixed(0)}Y`, '#fbbf24', '#0b1014', skin);
    } else {
      const fdL = this.worldToScreen(-26.67, firstDownYards);
      const fdR = this.worldToScreen(26.67, firstDownYards);
      ctx.save();
      ctx.strokeStyle = skin.firstDownColor;
      ctx.shadowColor = skin.firstDownColor;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(fdL.sx, fdL.sy);
      ctx.lineTo(fdR.sx, fdR.sy);
      ctx.stroke();
      ctx.restore();
      this.drawEdgeMarkerPill(ctx, fieldRight - 96, fdR.sy, `1ST +${firstDownYards.toFixed(0)}Y`, skin.firstDownColor, '#0b1014', skin);
    }

    ctx.restore();

    // Double Broadcast Sidelines
    ctx.save();
    ctx.strokeStyle = skin.yardLineMajor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(fieldLeft, 0);
    ctx.lineTo(fieldLeft, h);
    ctx.moveTo(fieldRight, 0);
    ctx.lineTo(fieldRight, h);
    ctx.stroke();
    ctx.restore();
  }

  private drawEdgeMarkerPill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    bg: string,
    fg: string,
    skin: CanvasSkinTokens
  ): void {
    ctx.save();
    ctx.font = `800 9.5px ${skin.fontFamilyCanvas}`;
    const tw = ctx.measureText(text).width;
    const pw = tw + 12;
    const ph = 16;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y - ph - 3, pw, ph, 3);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 6, y - ph * 0.5 - 3);
    ctx.restore();
  }

  // ==========================================================================
  // LAYER 1: VORONOI CELLS, POCKET POLYGON, READ-3 VOID & EXOTIC ARCS
  // ==========================================================================
  private drawPocketPolygon(
    ctx: CanvasRenderingContext2D,
    snapshot: PlayTickSnapshot,
    skin: CanvasSkinTokens
  ): void {
    const agents = snapshot.agents;
    const protectors = agents
      .filter(
        (a) =>
          a.side === 'OFF' &&
          ['LT', 'LG', 'C', 'RG', 'RT', 'TE', 'RB'].includes(a.pos) &&
          a.assignment.role !== 'ROUTE' &&
          a.assignment.role !== 'BALL_CARRIER'
      )
      .sort((a, b) => a.x - b.x);
    const qb = agents.find((a) => a.isSnapRecipient || a.pos === 'QB');
    if (protectors.length < 3 || !qb) return;

    const integrity = snapshot.pocketIntegrity ?? 100;
    const fillCol =
      integrity >= 75
        ? skin.pocketPolyFill
        : integrity >= 45
        ? 'rgba(251, 191, 36, 0.14)'
        : 'rgba(244, 63, 94, 0.16)';
    const strokeCol =
      integrity >= 75
        ? skin.pocketPolyStroke
        : integrity >= 45
        ? 'rgba(251, 191, 36, 0.75)'
        : 'rgba(244, 63, 94, 0.80)';

    ctx.save();
    ctx.fillStyle = fillCol;
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    const first = this.worldToScreen(protectors[0].x, protectors[0].y);
    ctx.moveTo(first.sx, first.sy);
    for (let i = 1; i < protectors.length; i++) {
      const pt = this.worldToScreen(protectors[i].x, protectors[i].y);
      ctx.lineTo(pt.sx, pt.sy);
    }
    const qbPt = this.worldToScreen(qb.x, qb.y - 1.2);
    ctx.lineTo(qbPt.sx, qbPt.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawScrambleVoidAndExotics(
    ctx: CanvasRenderingContext2D,
    agents: SimAgent[],
    skin: CanvasSkinTokens,
    opts: RenderOptions
  ): void {
    const agentMap = new Map(agents.map((a) => [a.id, a]));
    const offAgents = agents.filter((a) => a.side === 'OFF');

    for (const a of offAgents) {
      // 1. Designed Scramble Read #3 Grass Void Corridor
      if (a.designedScrambleRead?.enabled) {
        const cfg = a.designedScrambleRead;
        const xMin = cfg.voidCorridorCenterX - cfg.voidCorridorHalfWidthX;
        const xMax = cfg.voidCorridorCenterX + cfg.voidCorridorHalfWidthX;
        const topLeft = this.worldToScreen(xMin, cfg.voidCorridorMaxY);
        const botRight = this.worldToScreen(xMax, 0);

        ctx.save();
        ctx.fillStyle = cfg.voidPlugged ? 'rgba(244, 63, 94, 0.14)' : skin.voidCorridorFill;
        ctx.strokeStyle = cfg.voidPlugged ? 'rgba(244, 63, 94, 0.85)' : skin.voidCorridorStroke;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.roundRect(topLeft.sx, topLeft.sy, botRight.sx - topLeft.sx, botRight.sy - topLeft.sy, 4);
        ctx.fill();
        ctx.stroke();

        // Burst Scramble Waypoints
        if (cfg.scrambleWaypoints.length > 0) {
          this.drawHaloChain(
            ctx,
            a.x,
            a.y,
            cfg.scrambleWaypoints,
            '#34d399',
            skin.haloStroke,
            false,
            skin,
            opts.selectedAgentId === a.id,
            [7, 4]
          );
        }

        // Fallback Read #4 Connector
        if (cfg.fallbackReceiverId) {
          const fb = agentMap.get(cfg.fallbackReceiverId);
          if (fb) {
            const p0 = this.worldToScreen(a.x, a.y);
            const p1 = this.worldToScreen(fb.x, fb.y);
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.72)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();
          }
        }

        // Callout pill painted on top so dashed scramble vectors never obscure text
        ctx.setLineDash([]);
        const vLabel = cfg.voidPlugged ? 'VOID PLUGGED -> READ #4' : 'READ-3 SCRAMBLE VOID';
        ctx.font = `800 9px ${skin.fontFamilyCanvas}`;
        const vtw = ctx.measureText(vLabel).width + 10;
        const vx = Math.max(topLeft.sx, (topLeft.sx + botRight.sx) * 0.5 - vtw * 0.5);
        const vy = topLeft.sy - 8;
        ctx.fillStyle = 'rgba(6, 18, 14, 0.94)';
        ctx.strokeStyle = cfg.voidPlugged ? '#fb7185' : '#34d399';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(vx, vy - 7, vtw, 14, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = cfg.voidPlugged ? '#fb7185' : '#34d399';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(vLabel, vx + vtw * 0.5, vy);
        ctx.restore();
      }

      // 2. Fake Pitch / Split-Gun Exchange Vector
      if (a.fakeAction?.enabled) {
        const fc = a.fakeAction;
        const decoy = agentMap.get(fc.fakeTargetId);
        const start = this.worldToScreen(a.x, a.y);
        const endWorldX = fc.fakeDirectionX ?? decoy?.x ?? a.x - 4;
        const endWorldY = fc.fakeDirectionY ?? decoy?.y ?? a.y;
        const end = this.worldToScreen(endWorldX, endWorldY);

        ctx.save();
        const ctrlX = (start.sx + end.sx) * 0.5;
        const ctrlY = Math.max(start.sy, end.sy) + 34;

        ctx.strokeStyle = skin.haloStroke;
        ctx.lineWidth = 4.5;
        ctx.setLineDash([7, 4]);
        ctx.beginPath();
        ctx.moveTo(start.sx, start.sy);
        ctx.quadraticCurveTo(ctrlX, ctrlY, end.sx, end.sy);
        ctx.stroke();

        ctx.strokeStyle = skin.routeFakeStroke;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(start.sx, start.sy);
        ctx.quadraticCurveTo(ctrlX, ctrlY, end.sx, end.sy);
        ctx.stroke();
        ctx.setLineDash([]);
        this.drawArrowHead(ctx, ctrlX, ctrlY, end.sx, end.sy, 8, skin.routeFakeStroke);

        // Decoy pulse ring & Fake Pill anchored at lower Bezier apex away from player SNAP badges
        if (decoy) {
          const dp = this.worldToScreen(decoy.x, decoy.y);
          ctx.strokeStyle = skin.routeFakeStroke;
          ctx.lineWidth = 2.0;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.arc(dp.sx, dp.sy, 17, 0, Math.PI * 2);
          ctx.stroke();
        }

        const pillX = 0.25 * start.sx + 0.5 * ctrlX + 0.25 * end.sx;
        const pillY = 0.25 * start.sy + 0.5 * ctrlY + 0.25 * end.sy + 11;
        ctx.font = `800 9px ${skin.fontFamilyCanvas}`;
        const label = fc.family === 'PERIMETER_PITCH_TOSS' ? 'FAKE PITCH' : 'FAKE EXCH';
        const tw = ctx.measureText(label).width + 10;
        ctx.fillStyle = 'rgba(20, 8, 24, 0.90)';
        ctx.strokeStyle = skin.routeFakeStroke;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.roundRect(pillX - tw * 0.5, pillY - 7, tw, 14, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = skin.routeFakeStroke;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, pillX, pillY);
        ctx.restore();
      }

      // 3. Option-Pass / Backward Toss / Lateral Connectors
      const drawConnector = (targetId: string | undefined, tag: string, color: string) => {
        if (!targetId) return;
        const t = agentMap.get(targetId);
        if (!t) return;
        const p0 = this.worldToScreen(a.x, a.y);
        const p1 = this.worldToScreen(t.x, t.y);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(p0.sx, p0.sy);
        ctx.lineTo(p1.sx, p1.sy);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = `800 8.5px ${skin.fontFamilyCanvas}`;
        ctx.textAlign = 'center';
        ctx.fillText(tag, (p0.sx + p1.sx) * 0.5, (p0.sy + p1.sy) * 0.5 - 5);
        ctx.restore();
      };

      if (a.optionPass?.enabled) drawConnector(a.optionPass.primaryReceiverId, 'RPO READ', '#fbbf24');
      if (a.backwardToss?.enabled) drawConnector(a.backwardToss.recipientId, 'TOSS', '#06b6d4');
      if (a.lateralConfig?.enabled) drawConnector(a.lateralConfig.pitchTargetId, 'HOOK-LAT', '#22d3ee');
    }
  }

  private drawDefensiveAssignments(
    ctx: CanvasRenderingContext2D,
    agents: SimAgent[],
    skin: CanvasSkinTokens,
    opts: RenderOptions
  ): void {
    const offMap = new Map(agents.filter((a) => a.side === 'OFF').map((o) => [o.id, o]));
    const defAgents = agents.filter((a) => a.side === 'DEF');

    const isZoneRole = (role?: string) =>
      role === 'DEEP_ZONE' ||
      role === 'DEEP_THIRD' ||
      role === 'DEEP_HALF' ||
      role === 'QUARTERS_MATCH' ||
      role === 'CURL_FLAT' ||
      role === 'HOOK_CURL' ||
      role === 'ROBBER' ||
      role === 'READ_RUN_PASS';

    const zoneDefs = defAgents.filter((d) => d.defAssignment && isZoneRole(d.defAssignment.role));
    const nonZoneDefs = defAgents.filter((d) => d.defAssignment && !isZoneRole(d.defAssignment.role));

    if (zoneDefs.length > 0) {
      const bounds = { minX: -26.67, maxX: 26.67, minY: 0.0, maxY: 26.0 };

      for (let i = 0; i < zoneDefs.length; i++) {
        const defA = zoneDefs[i];
        const daA = defA.defAssignment!;
        const pA = { x: daA.targetX, y: daA.targetY };

        let poly: { x: number; y: number }[] = [
          { x: bounds.minX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.maxY },
          { x: bounds.minX, y: bounds.maxY },
        ];

        for (let j = 0; j < zoneDefs.length; j++) {
          if (i === j) continue;
          const pB = { x: zoneDefs[j].defAssignment!.targetX, y: zoneDefs[j].defAssignment!.targetY };
          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;
          if (dx * dx + dy * dy < 1e-4) continue;
          const mx = (pA.x + pB.x) * 0.5;
          const my = (pA.y + pB.y) * 0.5;

          const nextPoly: { x: number; y: number }[] = [];
          for (let k = 0; k < poly.length; k++) {
            const cur = poly[k];
            const prev = poly[(k + poly.length - 1) % poly.length];
            const curDist = (cur.x - mx) * dx + (cur.y - my) * dy;
            const prevDist = (prev.x - mx) * dx + (prev.y - my) * dy;
            const curIn = curDist <= 1e-5;
            const prevIn = prevDist <= 1e-5;

            if (curIn) {
              if (!prevIn) {
                const denom = (cur.x - prev.x) * dx + (cur.y - prev.y) * dy;
                if (Math.abs(denom) > 1e-6) {
                  const t = -prevDist / denom;
                  nextPoly.push({ x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) });
                }
              }
              nextPoly.push(cur);
            } else if (prevIn) {
              const denom = (cur.x - prev.x) * dx + (cur.y - prev.y) * dy;
              if (Math.abs(denom) > 1e-6) {
                const t = -prevDist / denom;
                nextPoly.push({ x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) });
              }
            }
          }
          poly = nextPoly;
        }

        if (poly.length >= 3) {
          const isDeep = daA.role.includes('DEEP') || daA.role === 'QUARTERS_MATCH';
          const isRobber = daA.role === 'ROBBER' || daA.role === 'READ_RUN_PASS';
          const isSelected = opts.selectedAgentId === defA.id;

          ctx.save();
          ctx.beginPath();
          const p0 = this.worldToScreen(poly[0].x, poly[0].y);
          ctx.moveTo(p0.sx, p0.sy);
          for (let v = 1; v < poly.length; v++) {
            const pv = this.worldToScreen(poly[v].x, poly[v].y);
            ctx.lineTo(pv.sx, pv.sy);
          }
          ctx.closePath();

          ctx.fillStyle = isDeep
            ? 'rgba(167, 139, 250, 0.08)'
            : isRobber
            ? 'rgba(56, 189, 248, 0.07)'
            : 'rgba(251, 191, 36, 0.07)';
          ctx.fill();

          ctx.strokeStyle = isDeep
            ? 'rgba(167, 139, 250, 0.42)'
            : isRobber
            ? 'rgba(56, 189, 248, 0.42)'
            : 'rgba(251, 191, 36, 0.42)';
          ctx.lineWidth = isSelected ? 2.4 : 1.3;
          ctx.setLineDash([6, 4]);
          ctx.stroke();

          const startPt = this.worldToScreen(defA.startX, defA.startY);
          const zonePt = this.worldToScreen(daA.targetX, daA.targetY);
          ctx.beginPath();
          ctx.moveTo(startPt.sx, startPt.sy);
          ctx.lineTo(zonePt.sx, zonePt.sy);
          ctx.stroke();

          const shortZone =
            daA.role === 'DEEP_THIRD' ? '1/3'
            : daA.role === 'DEEP_HALF' ? '1/2'
            : daA.role === 'QUARTERS_MATCH' ? '1/4'
            : daA.role === 'DEEP_ZONE' ? 'POST'
            : daA.role === 'ROBBER' ? 'ROB'
            : daA.role === 'READ_RUN_PASS' ? 'READ'
            : daA.role === 'CURL_FLAT' ? 'C/F'
            : 'H/C';

          const badgeW = 32;
          const badgeH = 16;
          ctx.setLineDash([]);
          ctx.fillStyle = skin.defBadgeBg;
          ctx.strokeStyle = isDeep ? 'rgba(167, 139, 250, 0.9)' : isRobber ? 'rgba(56, 189, 248, 0.9)' : 'rgba(251, 191, 36, 0.9)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.roundRect(zonePt.sx - badgeW / 2, zonePt.sy - badgeH / 2, badgeW, badgeH, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isDeep ? '#e9d5ff' : isRobber ? '#bae6fd' : '#fef08a';
          ctx.font = `800 9.5px ${skin.fontFamilyCanvas}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(shortZone, zonePt.sx, zonePt.sy);
          ctx.restore();
        }
      }
    }

    for (const def of nonZoneDefs) {
      const da = def.defAssignment;
      if (!da) continue;
      const startPt = this.worldToScreen(def.x, def.y);
      const isSelected = opts.selectedAgentId === def.id;

      ctx.save();
      ctx.lineWidth = isSelected ? 2.8 : 1.7;

      if ((da.role === 'MAN_COV' || da.role === 'QB_SPY' || da.role === 'BRACKET_TOP') && da.manTargetId) {
        const rec = offMap.get(da.manTargetId);
        if (rec) {
          const recPt = this.worldToScreen(rec.x, rec.y);
          ctx.strokeStyle =
            da.role === 'QB_SPY'
              ? 'rgba(34, 211, 238, 0.72)'
              : da.role === 'BRACKET_TOP'
              ? 'rgba(192, 132, 252, 0.72)'
              : 'rgba(251, 113, 133, 0.58)';
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(startPt.sx, startPt.sy);
          ctx.lineTo(recPt.sx, recPt.sy);
          ctx.stroke();
        }
      } else {
        const targetX = da.stuntCrossTargetX ?? da.targetX;
        const targetY = da.role === 'SPILL' ? Math.max(-1.0, da.targetY) : Math.max(-4.5, da.targetY);
        const endPt = this.worldToScreen(targetX, targetY);
        const isBlitz = da.role.includes('BLITZ') || da.role === 'CROSS_DOG';
        ctx.strokeStyle = isBlitz
          ? 'rgba(244, 63, 94, 0.90)'
          : da.role === 'SPILL'
          ? 'rgba(251, 191, 36, 0.85)'
          : da.role === 'FORCE_ALLEY'
          ? 'rgba(56, 189, 248, 0.85)'
          : 'rgba(251, 113, 133, 0.48)';
        if (isBlitz) ctx.setLineDash([5, 2.5]);
        else if (da.role === 'FORCE_ALLEY') ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(startPt.sx, startPt.sy);
        ctx.lineTo(endPt.sx, endPt.sy);
        ctx.stroke();
        this.drawArrowHead(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, 7.5, ctx.strokeStyle);
      }
      ctx.restore();
    }
  }

  // ==========================================================================
  // LAYER 2: HALO-CASED VECTORS, MOTION TRAILS & DRAG KNOBS
  // ==========================================================================
  private drawMotionTrails(
    ctx: CanvasRenderingContext2D,
    trailSnaps: PlayTickSnapshot[],
    skin: CanvasSkinTokens
  ): void {
    if (trailSnaps.length < 2) return;
    const latest = trailSnaps[trailSnaps.length - 1];
    ctx.save();
    for (const a of latest.agents) {
      const pts: { sx: number; sy: number }[] = [];
      for (const s of trailSnaps) {
        const match = s.agents.find((x) => x.id === a.id);
        if (match) pts.push(this.worldToScreen(match.x, match.y));
      }
      if (pts.length < 2) continue;
      const d = Math.hypot(pts[pts.length - 1].sx - pts[0].sx, pts[pts.length - 1].sy - pts[0].sy);
      if (d < 4) continue;

      ctx.strokeStyle = a.side === 'OFF' ? 'rgba(56, 189, 248, 0.24)' : 'rgba(251, 113, 133, 0.20)';
      ctx.lineWidth = a.assignment.role === 'BALL_CARRIER' ? 3.2 : 2.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
      ctx.stroke();
    }
    ctx.restore();
  }

  private resolveSchematicTarget(
    off: SimAgent,
    defs: SimAgent[],
    defMap: Map<string, SimAgent>,
    level: 'PRIMARY' | 'SECONDARY'
  ): SimAgent | null {
    const explicitId = level === 'PRIMARY' ? off.assignment.primaryTargetId : off.assignment.secondaryTargetId;
    if (explicitId) {
      const explicit = defMap.get(explicitId);
      const maxSpan = level === 'PRIMARY' ? 4.2 : 6.0;
      if (explicit && Math.abs(explicit.startX - off.startX) <= maxSpan) return explicit;
    }
    if (level === 'PRIMARY' && off.engagedWithId) return defMap.get(off.engagedWithId) || null;
    const candidates = defs.filter((d) =>
      level === 'PRIMARY'
        ? d.startY <= 2.5 && Math.abs(d.startX - off.startX) <= 2.8
        : d.startY > 1.0 && d.startY <= 6.5 && Math.abs(d.startX - off.startX) <= 4.2
    );
    if (candidates.length > 0) {
      candidates.sort((a, b) => Math.hypot(a.x - off.x, a.y - off.y) - Math.hypot(b.x - off.x, b.y - off.y));
      return candidates[0];
    }
    return null;
  }

  private drawAssignments(
    ctx: CanvasRenderingContext2D,
    agents: SimAgent[],
    skin: CanvasSkinTokens,
    opts: RenderOptions
  ): void {
    const defs = agents.filter((a) => a.side === 'DEF');
    const defMap = new Map(defs.map((d) => [d.id, d]));

    for (const off of agents.filter((a) => a.side === 'OFF')) {
      const asg = off.assignment;
      const startPt = this.worldToScreen(off.x, off.y);
      const isSelected = opts.selectedAgentId === off.id;
      ctx.save();

      switch (asg.role) {
        case 'PASS_SET': {
          const offset = GAP_X_COORDS[asg.gapOrSet] || GAP_X_COORDS.VERTICAL_DEEP;
          const setWorldX = off.startX + offset.dx * (off.startX < 0 ? 1 : -1);
          const setWorldY = off.startY + offset.dy;
          const endPt = this.worldToScreen(setWorldX, setWorldY);
          this.strokeHaloSegment(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, skin.blockPassSetStroke, skin.haloStroke, isSelected ? 2.8 : 2.0);
          this.drawPerpBlockBar(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, 9, skin.blockPassSetStroke);
          break;
        }
        case 'MAN_BLOCK': {
          const tgt = this.resolveSchematicTarget(off, defs, defMap, 'PRIMARY');
          if (tgt) {
            const endPt = this.worldToScreen(tgt.x, tgt.y);
            this.strokeHaloSegment(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, skin.blockManStroke, skin.haloStroke, isSelected ? 2.8 : 2.1);
            this.drawPerpBlockBar(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, 9.5, skin.blockManStroke);
          }
          break;
        }
        case 'COMBO_CLIMB': {
          const tgt1 = this.resolveSchematicTarget(off, defs, defMap, 'PRIMARY');
          const tgt2 = this.resolveSchematicTarget(off, defs, defMap, 'SECONDARY');
          if (tgt1) {
            const p1 = this.worldToScreen(tgt1.x, tgt1.y);
            this.strokeHaloSegment(ctx, startPt.sx, startPt.sy, p1.sx, p1.sy, skin.blockComboStroke, skin.haloStroke, isSelected ? 2.8 : 2.1);
            this.drawPerpBlockBar(ctx, startPt.sx, startPt.sy, p1.sx, p1.sy, 8, skin.blockComboStroke);
            if (tgt2) {
              const p2 = this.worldToScreen(tgt2.x, tgt2.y);
              ctx.setLineDash([5, 3]);
              this.strokeHaloSegment(ctx, p1.sx, p1.sy, p2.sx, p2.sy, skin.blockComboStroke, skin.haloStroke, isSelected ? 2.5 : 1.8);
              ctx.setLineDash([]);
              this.drawArrowHead(ctx, p1.sx, p1.sy, p2.sx, p2.sy, 7, skin.blockComboStroke);
            }
          }
          break;
        }
        case 'GAP_ZONE': {
          const gap = GAP_X_COORDS[asg.gapOrSet] || GAP_X_COORDS.B_RIGHT;
          const endPt = this.worldToScreen(gap.dx, gap.dy);
          this.strokeHaloSegment(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, skin.blockManStroke, skin.haloStroke, isSelected ? 2.8 : 2.1);
          this.drawPerpBlockBar(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, 9, skin.blockManStroke);
          break;
        }
        case 'PULL_LEAD':
        case 'PULL_TRAP': {
          this.drawHaloChain(ctx, off.startX, off.startY, asg.waypoints, skin.blockPullStroke, skin.haloStroke, true, skin, isSelected);
          break;
        }
        case 'CHIP_RELEASE': {
          const chipTgt = this.resolveSchematicTarget(off, defs, defMap, 'PRIMARY');
          if (chipTgt) {
            const chipPt = this.worldToScreen(chipTgt.x, chipTgt.y);
            this.strokeHaloSegment(ctx, startPt.sx, startPt.sy, chipPt.sx, chipPt.sy, skin.blockChipStroke, skin.haloStroke, isSelected ? 2.8 : 2.1);
            this.drawPerpBlockBar(ctx, startPt.sx, startPt.sy, chipPt.sx, chipPt.sy, 8, skin.blockChipStroke);
          }
          this.drawHaloChain(ctx, off.startX, off.startY, asg.waypoints, skin.routeStroke, skin.haloStroke, false, skin, isSelected, [5, 3]);
          break;
        }
        case 'ROUTE':
        case 'BALL_CARRIER':
        case 'QB_DROP': {
          if (off.preSnapMotion?.enabled) {
            const m = off.preSnapMotion;
            const origPt = this.worldToScreen(m.originX, m.originY);
            const snapPt = this.worldToScreen(m.snapX, m.snapY);
            ctx.save();
            ctx.setLineDash([5, 3]);
            this.strokeHaloSegment(ctx, origPt.sx, origPt.sy, snapPt.sx, snapPt.sy, skin.motionStroke, skin.haloStroke, 2.4);
            ctx.setLineDash([]);
            ctx.strokeStyle = skin.motionStroke;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(origPt.sx, origPt.sy, 4.5, 0, Math.PI * 2);
            ctx.stroke();
            this.drawArrowHead(ctx, origPt.sx, origPt.sy, snapPt.sx, snapPt.sy, 8, skin.motionStroke);

            ctx.font = `800 9px ${skin.fontFamilyCanvas}`;
            ctx.fillStyle = skin.motionStroke;
            ctx.textAlign = 'center';
            ctx.fillText(`MOT ${m.speed.toFixed(1)}y/s`, (origPt.sx + snapPt.sx) * 0.5, Math.min(origPt.sy, snapPt.sy) - 6);
            ctx.restore();
          }

          const sx0 = off.preSnapMotion?.enabled ? off.preSnapMotion.snapX : off.startX;
          const sy0 = off.preSnapMotion?.enabled ? off.preSnapMotion.snapY : off.startY;
          const strokeCol =
            asg.role === 'BALL_CARRIER'
              ? skin.blockChipStroke
              : asg.role === 'QB_DROP'
              ? 'rgba(148, 163, 184, 0.72)'
              : skin.routeStroke;
          this.drawHaloChain(ctx, sx0, sy0, asg.waypoints, strokeCol, skin.haloStroke, false, skin, isSelected);
          break;
        }
      }
      ctx.restore();
    }
  }

  private strokeHaloSegment(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    fg: string,
    halo: string,
    width: number
  ): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = halo;
    ctx.lineWidth = width + 2.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    ctx.strokeStyle = fg;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  private drawHaloChain(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    waypoints: Array<{ x: number; y: number }>,
    color: string,
    halo: string,
    endAsBlockBar: boolean,
    skin: CanvasSkinTokens,
    isSelected: boolean,
    dash?: number[]
  ): void {
    if (!waypoints || waypoints.length === 0) return;
    const lineW = isSelected ? 3.2 : 2.3;
    const p0 = this.worldToScreen(startX, startY);
    const pts = waypoints.map((wp) => this.worldToScreen(wp.x, wp.y));

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);

    ctx.strokeStyle = halo;
    ctx.lineWidth = lineW + 2.8;
    ctx.beginPath();
    ctx.moveTo(p0.sx, p0.sy);
    pts.forEach((pt) => ctx.lineTo(pt.sx, pt.sy));
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.moveTo(p0.sx, p0.sy);
    pts.forEach((pt) => ctx.lineTo(pt.sx, pt.sy));
    ctx.stroke();

    ctx.setLineDash([]);
    const prev = pts.length > 1 ? pts[pts.length - 2] : p0;
    const last = pts[pts.length - 1];
    if (endAsBlockBar) {
      this.drawPerpBlockBar(ctx, prev.sx, prev.sy, last.sx, last.sy, 10.5, color);
    } else {
      this.drawArrowHead(ctx, prev.sx, prev.sy, last.sx, last.sy, 9.5, color);
    }

    // Waypoint control knobs
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      ctx.fillStyle = isSelected ? color : 'rgba(255, 255, 255, 0.90)';
      ctx.strokeStyle = halo;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, isSelected ? 6.0 : 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, 9.5, 0, Math.PI * 2);
        ctx.stroke();

        const wp = waypoints[i];
        const tag = `L${i + 1} (${wp.y >= 0 ? '+' : ''}${wp.y.toFixed(0)}y)`;
        ctx.font = `800 9.5px ${skin.fontFamilyCanvas}`;
        const tw = ctx.measureText(tag).width + 8;
        ctx.fillStyle = 'rgba(6, 12, 16, 0.88)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.roundRect(pt.sx - tw * 0.5, pt.sy - 25, tw, 14, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tag, pt.sx, pt.sy - 18);
      }
    }
    ctx.restore();
  }

  private drawActiveDragLine(
    ctx: CanvasRenderingContext2D,
    drag: NonNullable<RenderOptions['activeDragLine']>,
    skin: CanvasSkinTokens
  ): void {
    const p0 = this.worldToScreen(drag.fromX, drag.fromY);
    const p1 = this.worldToScreen(drag.toX, drag.toY);
    const col = drag.isComboShift ? skin.blockComboStroke : skin.blockManStroke;
    ctx.save();
    ctx.setLineDash([6, 4]);
    this.strokeHaloSegment(ctx, p0.sx, p0.sy, p1.sx, p1.sy, col, skin.haloStroke, 2.6);
    ctx.setLineDash([]);
    this.drawArrowHead(ctx, p0.sx, p0.sy, p1.sx, p1.sy, 9, col);
    ctx.restore();
  }

  private drawPerpBlockBar(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    halfWidth: number,
    color: string
  ): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.max(1, Math.hypot(dx, dy));
    const px = (-dy / len) * halfWidth;
    const py = (dx / len) * halfWidth;
    ctx.save();
    ctx.setLineDash([]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1 - px, y1 - py);
    ctx.lineTo(x1 + px, y1 + py);
    ctx.stroke();
    ctx.restore();
  }

  private drawArrowHead(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    size: number,
    color: string
  ): void {
    const angle = Math.atan2(y1 - y0, x1 - x0);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - size * Math.cos(angle - Math.PI / 6), y1 - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x1 - size * Math.cos(angle + Math.PI / 6), y1 - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawTrenchTelemetry(
    ctx: CanvasRenderingContext2D,
    agents: SimAgent[],
    skin: CanvasSkinTokens,
    opts: RenderOptions
  ): void {
    for (const a of agents) {
      const pt = this.worldToScreen(a.x, a.y);
      if (opts.showForceVectors && (Math.abs(a.vx) > 0.25 || Math.abs(a.vy) > 0.25)) {
        const endPt = this.worldToScreen(a.x + a.vx * 0.28, a.y + a.vy * 0.28);
        const col = a.engagedWithId
          ? a.leverageScore >= 0
            ? skin.forceVectorWin
            : skin.forceVectorLoss
          : 'rgba(255,255,255,0.42)';
        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth = a.engagedWithId ? 2.4 : 1.4;
        ctx.beginPath();
        ctx.moveTo(pt.sx, pt.sy);
        ctx.lineTo(endPt.sx, endPt.sy);
        ctx.stroke();
        ctx.restore();
      }
      if (opts.showLeverageCones && a.side === 'OFF' && a.engagedWithId) {
        ctx.save();
        ctx.strokeStyle = a.leverageScore >= 0 ? skin.forceVectorWin : skin.forceVectorLoss;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, 17, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ==========================================================================
  // LAYER 3: HIGH-CONTRAST PLAYER TOKENS & AIRBORNE BALL PARABOLA
  // ==========================================================================
  private drawAgent(
    ctx: CanvasRenderingContext2D,
    agent: SimAgent,
    snapshot: PlayTickSnapshot,
    skin: CanvasSkinTokens,
    opts: RenderOptions
  ): void {
    const pt = this.worldToScreen(agent.x, agent.y);
    const sx = skin.pixelSnap ? Math.round(pt.sx) : pt.sx;
    const sy = skin.pixelSnap ? Math.round(pt.sy) : pt.sy;
    const radius = 13.5;
    const isSelected = opts.selectedAgentId === agent.id;
    const isHovered = opts.hoveredAgentId === agent.id;
    const isPassTarget = snapshot.targetedReceiverId === agent.id;

    ctx.save();

    if (isSelected || isHovered) {
      ctx.strokeStyle = skin.blockerHighlight;
      ctx.lineWidth = isSelected ? 3.0 : 2.2;
      ctx.shadowColor = skin.blockerHighlight;
      ctx.shadowBlur = isSelected ? 10 : 5;
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (opts.designatedMikeId && agent.id === opts.designatedMikeId) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 5.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = `800 9.5px ${skin.fontFamilyCanvas}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('MIKE [ID]', sx, sy - radius - 6);
      ctx.restore();
    }

    if (isPassTarget) {
      ctx.save();
      ctx.strokeStyle = skin.ballColor;
      ctx.lineWidth = 2.6;
      ctx.setLineDash([4, 2.5]);
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (agent.isShedding) {
      ctx.save();
      ctx.strokeStyle = skin.forceVectorWin;
      ctx.lineWidth = 2.8;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Subtle ground drop shadow under token
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + radius * 0.72, radius * 0.85, radius * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    if (agent.side === 'OFF') {
      const isTrench = ['LT', 'LG', 'C', 'RG', 'RT'].includes(agent.pos);
      ctx.fillStyle = skin.offenseFill;
      ctx.strokeStyle = isSelected ? skin.blockerHighlight : skin.offenseStroke;
      ctx.lineWidth = isSelected ? 2.8 : 2.1;

      if (isTrench) {
        ctx.beginPath();
        ctx.roundRect(sx - radius, sy - radius * 0.86, radius * 2, radius * 1.72, 4);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = skin.offenseText;
      ctx.font = `800 11px ${skin.fontFamilyCanvas}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(agent.pos, sx, sy + 0.5);

      // Direct Snap Recipient Badge (2-QB Split-Gun clarity)
      if (agent.isSnapRecipient) {
        ctx.fillStyle = skin.ballColor;
        ctx.beginPath();
        ctx.roundRect(sx - 15, sy + radius + 2, 30, 12, 3);
        ctx.fill();
        ctx.fillStyle = '#060c0f';
        ctx.font = `800 8px ${skin.fontFamilyCanvas}`;
        ctx.fillText('SNAP', sx, sy + radius + 8.5);
      }

      // Route Read-Order Badge (1, 2, 3, 4)
      if (agent.readOrder && (agent.assignment.role === 'ROUTE' || agent.assignment.role === 'CHIP_RELEASE')) {
        const bx = sx + radius * 0.82;
        const by = sy - radius * 0.82;
        ctx.fillStyle = isPassTarget ? skin.ballColor : skin.offenseStroke;
        ctx.strokeStyle = skin.haloStroke;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(bx, by, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#040a0e';
        ctx.font = `800 9px ${skin.fontFamilyCanvas}`;
        ctx.fillText(String(agent.readOrder), bx, by + 0.5);
      }
    } else {
      ctx.fillStyle = skin.defenseFill;
      ctx.strokeStyle = isSelected ? skin.blockerHighlight : skin.defenseStroke;
      ctx.lineWidth = isSelected ? 2.8 : 2.1;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = skin.defenseText;
      ctx.font = `800 10.5px ${skin.fontFamilyCanvas}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(agent.pos, sx, sy + 0.5);

      if (opts.showDefenseAssignments && agent.defAssignment) {
        const dr = agent.defAssignment.role;
        const defTag =
          dr === 'QB_SPY' ? 'SPY'
          : dr === 'BRACKET_TOP' ? 'BRK'
          : dr === 'FORCE_ALLEY' ? 'FRC'
          : dr.includes('BLITZ') || dr === 'CROSS_DOG' ? 'BLZ'
          : dr === 'SPILL' ? 'SPL'
          : null;
        if (defTag) {
          ctx.fillStyle = skin.defBadgeBg;
          ctx.strokeStyle = dr === 'QB_SPY' ? '#22d3ee' : dr === 'BRACKET_TOP' ? '#c084fc' : skin.defenseStroke;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.roundRect(sx - 13, sy + radius + 2, 26, 11, 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          ctx.font = `800 7.5px ${skin.fontFamilyCanvas}`;
          ctx.fillText(defTag, sx, sy + radius + 8);
        }
      }
    }

    ctx.restore();
  }

  private drawBallAndPassArc(
    ctx: CanvasRenderingContext2D,
    snapshot: PlayTickSnapshot,
    skin: CanvasSkinTokens
  ): void {
    const ball = snapshot.ball;
    if (!ball) return;

    ctx.save();
    const ballPt = this.worldToScreen(ball.x, ball.y);

    if (
      (ball.state === 'IN_FLIGHT' || ball.state === 'CAUGHT' || ball.state === 'INCOMPLETE') &&
      ball.launchX !== undefined &&
      ball.launchY !== undefined &&
      ball.targetX !== undefined &&
      ball.targetY !== undefined
    ) {
      const launchPt = this.worldToScreen(ball.launchX, ball.launchY);
      const targetPt = this.worldToScreen(ball.targetX, ball.targetY);
      const arcColor = ball.isLateral ? '#22d3ee' : skin.ballColor;

      ctx.setLineDash(ball.isLateral ? [6, 3] : [5, 3]);
      this.strokeHaloSegment(ctx, launchPt.sx, launchPt.sy, targetPt.sx, targetPt.sy, arcColor, skin.haloStroke, 2.6);
      ctx.setLineDash([]);

      if (ball.isLateral) {
        ctx.font = `800 10px ${skin.fontFamilyCanvas}`;
        ctx.fillStyle = '#22d3ee';
        ctx.textAlign = 'center';
        ctx.fillText('BACKWARD LATERAL', (launchPt.sx + targetPt.sx) * 0.5, Math.min(launchPt.sy, targetPt.sy) - 10);
      }

      ctx.strokeStyle = ball.state === 'INCOMPLETE' ? skin.forceVectorLoss : arcColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(targetPt.sx, targetPt.sy, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(targetPt.sx - 23, targetPt.sy);
      ctx.lineTo(targetPt.sx - 12, targetPt.sy);
      ctx.moveTo(targetPt.sx + 12, targetPt.sy);
      ctx.lineTo(targetPt.sx + 23, targetPt.sy);
      ctx.moveTo(targetPt.sx, targetPt.sy - 23);
      ctx.lineTo(targetPt.sx, targetPt.sy - 12);
      ctx.moveTo(targetPt.sx, targetPt.sy + 12);
      ctx.lineTo(targetPt.sx, targetPt.sy + 23);
      ctx.stroke();
    }

    if (ball.state === 'IN_FLIGHT' && ball.z > 1.8) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.50)';
      ctx.beginPath();
      ctx.ellipse(ballPt.sx, ballPt.sy + 7, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const zScale = ball.state === 'IN_FLIGHT' ? 1.0 + Math.max(0, ball.z - 1.5) * 0.09 : 1.0;
    const offsetX = ball.state === 'HELD' ? 10 : 0;
    const offsetY = ball.state === 'HELD' ? -7 : -Math.max(0, ball.z - 1.5) * 2.4;

    ctx.translate(ballPt.sx + offsetX, ballPt.sy + offsetY);
    ctx.scale(zScale, zScale);
    ctx.fillStyle = skin.ballColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.0, 4.2, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ==========================================================================
  // LAYER 4: BROADCAST TERMINATION HUD & LEGEND
  // ==========================================================================
  private drawTerminationBanner(
    ctx: CanvasRenderingContext2D,
    w: number,
    snapshot: PlayTickSnapshot,
    skin: CanvasSkinTokens
  ): void {
    ctx.save();
    const reason = snapshot.terminationReason;
    const tgtInfo = snapshot.targetedReceiverId ? ` -> ${snapshot.targetedReceiverId}` : '';
    let tag = 'WHISTLE: PLAY STOP';
    let accent = '#fbbf24';

    if (reason === 'SACK') {
      tag = 'WHISTLE: SACK';
      accent = '#f43f5e';
    } else if (reason === 'TOUCHDOWN') {
      tag = `TOUCHDOWN${tgtInfo}`;
      accent = '#10b981';
    } else if (reason === 'OUT_OF_BOUNDS') {
      tag = `OUT OF BOUNDS (CLOCK STOP)${tgtInfo}`;
      accent = '#38bdf8';
    } else if (reason === 'TACKLED') {
      tag = snapshot.ball?.completedPass ? `CATCH + YAC TACKLED${tgtInfo}` : 'WHISTLE: RUN STOP / TACKLED';
      accent = snapshot.ball?.completedPass ? '#10b981' : '#fbbf24';
    } else if (reason === 'COMPLETE') {
      tag = `PASS COMPLETE${tgtInfo}`;
      accent = '#10b981';
    } else if (reason === 'INTERCEPTION') {
      tag = `INTERCEPTION (TURNOVER)${tgtInfo}`;
      accent = '#f43f5e';
    } else if (reason === 'INCOMPLETE') {
      tag = `INCOMPLETE PASS${tgtInfo}`;
      accent = '#94a3b8';
    }

    const exoticTag = snapshot.exoticEvent
      ? ` // ${snapshot.exoticEvent.replace(/_/g, ' ')}`
      : (snapshot.ball?.lateralCount ?? 0) > 0
      ? ` // LATERAL x${snapshot.ball!.lateralCount}`
      : '';
    const ydsStr =
      snapshot.carrierTackledYards !== null && snapshot.carrierTackledYards !== undefined
        ? ` (${snapshot.carrierTackledYards >= 0 ? '+' : ''}${snapshot.carrierTackledYards.toFixed(1)}y)`
        : '';
    const text = `${tag}${exoticTag}${ydsStr} @ T=${snapshot.timeSec.toFixed(2)}s`;

    ctx.font = `800 12.5px ${skin.fontFamilyCanvas}`;
    const boxW = ctx.measureText(text).width + 36;
    const boxH = 30;
    const boxX = (w - boxW) * 0.5;
    const boxY = 14;

    ctx.fillStyle = 'rgba(7, 13, 18, 0.90)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(boxX + 14, boxY + boxH * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w * 0.5 + 4, boxY + boxH * 0.5);
    ctx.restore();
  }

  private drawMonteCarloFan(ctx: CanvasRenderingContext2D, mc: MonteCarloOverlayData): void {
    ctx.save();
    for (const tr of mc.traces) {
      if (tr.points.length < 2) continue;
      ctx.strokeStyle =
        tr.kind === 'LATERAL'
          ? 'rgba(34, 211, 238, 0.36)'
          : tr.kind === 'PASS_COMP'
          ? 'rgba(16, 185, 129, 0.30)'
          : tr.kind === 'RUN_GAIN'
          ? 'rgba(251, 191, 36, 0.32)'
          : 'rgba(244, 63, 94, 0.20)';
      ctx.lineWidth = tr.kind === 'LATERAL' ? 2.0 : 1.4;
      ctx.beginPath();
      const p0 = this.worldToScreen(tr.points[0].x, tr.points[0].y);
      ctx.moveTo(p0.sx, p0.sy);
      for (let i = 1; i < tr.points.length; i++) {
        const pi = this.worldToScreen(tr.points[i].x, tr.points[i].y);
        ctx.lineTo(pi.sx, pi.sy);
      }
      ctx.stroke();
    }

    for (const tr of mc.traces) {
      const clampedY = Math.max(this.minY + 0.4, Math.min(this.maxY - 0.5, tr.endY));
      const pt = this.worldToScreen(tr.endX, clampedY);
      ctx.fillStyle =
        tr.kind === 'LATERAL'
          ? '#22d3ee'
          : tr.kind === 'PASS_COMP'
          ? '#10b981'
          : tr.kind === 'RUN_GAIN'
          ? '#fbbf24'
          : '#f43f5e';
      ctx.strokeStyle = 'rgba(6, 10, 14, 0.90)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, tr.kind === 'FAIL' ? 2.8 : 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawMonteCarloHud(
    ctx: CanvasRenderingContext2D,
    mc: MonteCarloOverlayData,
    skin: CanvasSkinTokens
  ): void {
    const x = 14;
    const y = 14;
    const w = 286;
    const h = 132;

    ctx.save();
    ctx.fillStyle = 'rgba(7, 13, 18, 0.92)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = `800 10px ${skin.fontFamilyCanvas}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`MONTE CARLO SIM // N=${mc.runs} RUNS`, x + 12, y + 10);

    const ydsSign = mc.meanYards >= 0 ? '+' : '';
    const epaSign = mc.meanEpa >= 0 ? '+' : '';
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 10.5px ${skin.fontFamilyCanvas}`;
    ctx.fillText(
      `MEAN ${ydsSign}${mc.meanYards.toFixed(1)}y  |  EPA ${epaSign}${mc.meanEpa.toFixed(2)}  |  EXPL ${mc.explosiveRatePct.toFixed(0)}%`,
      x + 12,
      y + 26
    );

    const barTop = y + 45;
    const labelW = 50;
    const maxBarW = 166;
    mc.buckets.forEach((b, idx) => {
      const rowY = barTop + idx * 14;
      ctx.fillStyle = '#9fb7c9';
      ctx.font = `700 9px ${skin.fontFamilyCanvas}`;
      ctx.fillText(b.label, x + 12, rowY);

      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.fillRect(x + 12 + labelW, rowY + 1, maxBarW, 9);

      const fillW = Math.max(2, (Math.min(100, b.pct) / 100) * maxBarW);
      ctx.fillStyle = b.color;
      ctx.fillRect(x + 12 + labelW, rowY + 1, fillW, 9);

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`${b.pct.toFixed(0)}%`, x + 18 + labelW + maxBarW, rowY);
    });

    const legY = y + h - 16;
    const legendItems: [string, string][] = [
      ['#10b981', 'PASS/TD'],
      ['#22d3ee', 'LATERAL'],
      ['#fbbf24', 'RUN'],
      ['#f43f5e', 'FAIL'],
    ];
    let lx = x + 12;
    ctx.font = `700 8.5px ${skin.fontFamilyCanvas}`;
    for (const [col, txt] of legendItems) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(lx + 4, legY + 4, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(txt, lx + 11, legY);
      lx += txt.length * 6 + 20;
    }
    ctx.restore();
  }

  private drawCompactLegend(
    ctx: CanvasRenderingContext2D,
    _w: number,
    h: number,
    skin: CanvasSkinTokens
  ): void {
    const items: [string, string][] = [
      [skin.routeStroke, 'ROUTE'],
      [skin.blockChipStroke, 'RUN / CHIP'],
      [skin.blockPullStroke, 'PULL'],
      [skin.blockComboStroke, 'COMBO'],
      [skin.routeFakeStroke, 'FAKE'],
      ['#34d399', 'READ-3 VOID'],
    ];
    const x = 12;
    const y = h - 28;
    const pillW = 396;

    ctx.save();
    ctx.fillStyle = 'rgba(6, 12, 16, 0.80)';
    ctx.strokeStyle = 'rgba(148, 189, 219, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, pillW, 20, 4);
    ctx.fill();
    ctx.stroke();

    let cx = x + 10;
    ctx.font = `700 8.5px ${skin.fontFamilyCanvas}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    for (const [col, txt] of items) {
      ctx.fillStyle = col;
      ctx.fillRect(cx, y + 7, 8, 6);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(txt, cx + 12, y + 10.5);
      cx += txt.length * 5.3 + 22;
    }
    ctx.restore();
  }

  private drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.restore();
  }
}
