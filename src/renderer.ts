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

export class TacticalRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Viewport world bounds: X in [-27, +27] yards, Y in [-10, +24] yards
  private readonly viewWidthYards = 53.33;
  private readonly minY = -9.5;
  private readonly maxY = 22.5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D Canvas context unavailable');
    this.ctx = context;
  }

  public resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public worldToScreen(wx: number, wy: number): { sx: number; sy: number; scale: number } {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const scaleX = w / this.viewWidthYards;
    const scaleY = h / (this.maxY - this.minY);
    const scale = Math.min(scaleX, scaleY) * 0.94;

    const cx = w * 0.5;
    // Place Y=0 (LOS) around 68% down the screen so downfield (+Y) goes UP
    const losScreenY = h * 0.68;

    return {
      sx: cx + wx * scale,
      sy: losScreenY - wy * scale,
      scale,
    };
  }

  public screenToWorld(sx: number, sy: number): { wx: number; wy: number } {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const scaleX = w / this.viewWidthYards;
    const scaleY = h / (this.maxY - this.minY);
    const scale = Math.min(scaleX, scaleY) * 0.94;

    const cx = w * 0.5;
    const losScreenY = h * 0.68;

    return {
      wx: +((sx - cx) / scale).toFixed(2),
      wy: +((losScreenY - sy) / scale).toFixed(2),
    };
  }

  public render(
    snapshot: PlayTickSnapshot,
    skin: CanvasSkinTokens,
    opts: RenderOptions
  ): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. Field Turf & Laser Yardage Grid
    this.drawFieldGrid(ctx, w, h, skin, opts.firstDownYards ?? 10, opts.yardLineToGoal);

    // 1b. Stochastic Monte Carlo (N=100) Trajectory Fan & Terminal Spot Cloud
    if (opts.monteCarloOverlay) {
      this.drawMonteCarloFan(ctx, opts.monteCarloOverlay);
    }

    // 2. Pocket Integrity Polygon (Connects Pass Protectors around QB)
    if (opts.showPocketPoly) {
      this.drawPocketPolygon(ctx, snapshot.agents, skin);
    }

    // 3. Optional Defensive Shell / Zone / Blitz Schematic Overlay
    if (opts.showDefenseAssignments) {
      this.drawDefensiveAssignments(ctx, snapshot.agents, skin, opts);
    }

    // 4. Pre-Snap / Active Blocker & Route Assignment Vectors
    this.drawAssignments(ctx, snapshot.agents, skin, opts);

    // 5. Active Drag Line when re-assigning a Blocker on Canvas
    if (opts.activeDragLine) {
      const p0 = this.worldToScreen(opts.activeDragLine.fromX, opts.activeDragLine.fromY);
      const p1 = this.worldToScreen(opts.activeDragLine.toX, opts.activeDragLine.toY);
      ctx.save();
      ctx.strokeStyle = opts.activeDragLine.isComboShift
        ? skin.blockComboStroke
        : skin.blockManStroke;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(p0.sx, p0.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Trench Contact Force Vectors & Leverage Cones
    if (opts.showForceVectors || opts.showLeverageCones) {
      this.drawTrenchTelemetry(ctx, snapshot.agents, skin, opts);
    }

    // 7. Render All 22 Agents
    for (const agent of snapshot.agents) {
      this.drawAgent(ctx, agent, snapshot, skin, opts);
    }

    // 8. Render Football, Pass Flight Trajectory & Target Reticle
    if (snapshot.ball) {
      this.drawBallAndPassArc(ctx, snapshot, skin);
    }

    // 9. Tactical Play Termination Banner (SACK / TACKLE / COMPLETE / INCOMPLETE)
    if (snapshot.playOver && snapshot.terminationReason) {
      this.drawTerminationBanner(ctx, w, h, snapshot, skin);
    }

    // 9b. Monte Carlo N=100 Outcome Distribution HUD Badge
    if (opts.monteCarloOverlay) {
      this.drawMonteCarloHud(ctx, opts.monteCarloOverlay, skin);
    }

    // 10. Optional 16-Bit Scanline Overlay
    if (skin.scanlines) {
      this.drawScanlines(ctx, w, h);
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
    const w = this.canvas.clientWidth;

    // 1. Render Voronoi-Complete Coverage Cells (Pass Defense Space Tessellation)
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
          const defB = zoneDefs[j];
          const daB = defB.defAssignment!;
          const pB = { x: daB.targetX, y: daB.targetY };

          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 1e-4) continue;

          const mx = (pA.x + pB.x) * 0.5;
          const my = (pA.y + pB.y) * 0.5;

          const nextPoly: { x: number; y: number }[] = [];
          if (poly.length === 0) break;

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
                  nextPoly.push({
                    x: prev.x + t * (cur.x - prev.x),
                    y: prev.y + t * (cur.y - prev.y),
                  });
                }
              }
              nextPoly.push(cur);
            } else if (prevIn) {
              const denom = (cur.x - prev.x) * dx + (cur.y - prev.y) * dy;
              if (Math.abs(denom) > 1e-6) {
                const t = -prevDist / denom;
                nextPoly.push({
                  x: prev.x + t * (cur.x - prev.x),
                  y: prev.y + t * (cur.y - prev.y),
                });
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

          const isHiRes = w >= 1200;
          ctx.fillStyle = isDeep
            ? 'rgba(163, 113, 247, 0.08)'
            : isRobber
            ? 'rgba(56, 189, 248, 0.07)'
            : 'rgba(210, 153, 34, 0.08)';
          ctx.fill();

          ctx.strokeStyle = isDeep
            ? 'rgba(163, 113, 247, 0.40)'
            : isRobber
            ? 'rgba(56, 189, 248, 0.40)'
            : 'rgba(210, 153, 34, 0.40)';
          ctx.lineWidth = isSelected ? (isHiRes ? 2.6 : 2.0) : (isHiRes ? 1.5 : 1.0);
          ctx.setLineDash(isHiRes ? [6, 4] : [4, 3]);
          ctx.stroke();

          // Drop line from defender start to zone landmark
          const startPt = this.worldToScreen(defA.startX, defA.startY);
          const zonePt = this.worldToScreen(daA.targetX, daA.targetY);
          ctx.beginPath();
          ctx.moveTo(startPt.sx, startPt.sy);
          ctx.lineTo(zonePt.sx, zonePt.sy);
          ctx.stroke();

          // Zone badge label
          const shortZone =
            daA.role === 'DEEP_THIRD'
              ? '1/3'
              : daA.role === 'DEEP_HALF'
              ? '1/2'
              : daA.role === 'QUARTERS_MATCH'
              ? '1/4'
              : daA.role === 'DEEP_ZONE'
              ? 'POST'
              : daA.role === 'ROBBER'
              ? 'ROB'
              : daA.role === 'READ_RUN_PASS'
              ? 'READ'
              : daA.role === 'CURL_FLAT'
              ? 'C/F'
              : 'H/C';

          const badgeW = isHiRes ? 28 : 20;
          const badgeH = isHiRes ? 16 : 12;
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = isDeep
            ? 'rgba(163, 113, 247, 0.85)'
            : isRobber
            ? 'rgba(56, 189, 248, 0.85)'
            : 'rgba(210, 153, 34, 0.85)';
          ctx.lineWidth = isHiRes ? 1.4 : 1;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(zonePt.sx - badgeW / 2, zonePt.sy - badgeH / 2, badgeW, badgeH, 3);
          } else {
            ctx.rect(zonePt.sx - badgeW / 2, zonePt.sy - badgeH / 2, badgeW, badgeH);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isDeep
            ? 'rgba(216, 180, 254, 0.95)'
            : isRobber
            ? 'rgba(186, 230, 253, 0.95)'
            : 'rgba(253, 230, 138, 0.95)';
          ctx.font = isHiRes ? `800 10px ${skin.fontFamilyCanvas}` : `700 8px ${skin.fontFamilyCanvas}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(shortZone, zonePt.sx, zonePt.sy);

          ctx.restore();
        }
      }
    }

    // 2. Render Non-Zone Defenders (Man Coverage & Pass Rushers / Blitzers)
    for (const def of nonZoneDefs) {
      const da = def.defAssignment;
      if (!da) continue;
      const startPt = this.worldToScreen(def.x, def.y);
      const isSelected = opts.selectedAgentId === def.id;
      const isHiRes = (this.canvas.clientWidth || 960) >= 1200;

      ctx.save();
      ctx.lineWidth = isSelected ? (isHiRes ? 2.8 : 2.0) : (isHiRes ? 1.8 : 1.2);

      if (da.role === 'MAN_COV' && da.manTargetId) {
        const rec = offMap.get(da.manTargetId);
        if (rec) {
          const recPt = this.worldToScreen(rec.x, rec.y);
          ctx.strokeStyle = 'rgba(248, 81, 73, 0.55)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(startPt.sx, startPt.sy);
          ctx.lineTo(recPt.sx, recPt.sy);
          ctx.stroke();
        }
      } else {
        const targetX = da.stuntCrossTargetX ?? da.targetX;
        const targetY = da.role === 'SPILL' ? Math.max(-1.0, da.targetY) : Math.max(-4.5, da.targetY);
        const endPt = this.worldToScreen(targetX, targetY);
        const isRunBlitz = da.role.includes('BLITZ') || da.role === 'CROSS_DOG';
        ctx.strokeStyle = isRunBlitz
          ? 'rgba(255, 68, 68, 0.90)'
          : da.role === 'SPILL'
          ? 'rgba(245, 158, 11, 0.85)'
          : da.role === 'FORCE_ALLEY'
          ? 'rgba(56, 189, 248, 0.85)'
          : 'rgba(248, 81, 73, 0.45)';
        if (isRunBlitz) ctx.setLineDash([4, 2]);
        else if (da.role === 'FORCE_ALLEY') ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(startPt.sx, startPt.sy);
        ctx.lineTo(endPt.sx, endPt.sy);
        ctx.stroke();
        this.drawArrowHead(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, isHiRes ? 8 : 6, ctx.strokeStyle);
      }

      ctx.restore();
    }
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

      // Draw pass or backward lateral trajectory arc line
      const isHiRes = (this.canvas.clientWidth || 960) >= 1200;
      const arcColor = ball.isLateral ? '#06b6d4' : skin.ballColor;
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = ball.isLateral ? (isHiRes ? 2.8 : 2.2) : (isHiRes ? 2.4 : 1.8);
      ctx.setLineDash(ball.isLateral ? [6, 3] : [4, 3]);
      ctx.beginPath();
      ctx.moveTo(launchPt.sx, launchPt.sy);
      ctx.lineTo(targetPt.sx, targetPt.sy);
      ctx.stroke();
      ctx.setLineDash([]);

      if (ball.isLateral) {
        ctx.font = isHiRes ? `800 10.5px ${skin.fontFamilyCanvas}` : `700 9px ${skin.fontFamilyCanvas}`;
        ctx.fillStyle = '#06b6d4';
        ctx.textAlign = 'center';
        ctx.fillText(
          'BACKWARD LATERAL',
          (launchPt.sx + targetPt.sx) * 0.5,
          Math.min(launchPt.sy, targetPt.sy) - (isHiRes ? 10 : 8)
        );
      }

      // Draw target window reticle at catch point
      ctx.strokeStyle =
        ball.state === 'INCOMPLETE' ? skin.forceVectorLoss : arcColor;
      ctx.lineWidth = isHiRes ? 2.2 : 1.6;
      ctx.beginPath();
      ctx.arc(targetPt.sx, targetPt.sy, isHiRes ? 16 : 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(targetPt.sx - (isHiRes ? 22 : 18), targetPt.sy);
      ctx.lineTo(targetPt.sx - (isHiRes ? 12 : 10), targetPt.sy);
      ctx.moveTo(targetPt.sx + (isHiRes ? 12 : 10), targetPt.sy);
      ctx.lineTo(targetPt.sx + (isHiRes ? 22 : 18), targetPt.sy);
      ctx.moveTo(targetPt.sx, targetPt.sy - (isHiRes ? 22 : 18));
      ctx.lineTo(targetPt.sx, targetPt.sy - (isHiRes ? 12 : 10));
      ctx.moveTo(targetPt.sx, targetPt.sy + (isHiRes ? 12 : 10));
      ctx.lineTo(targetPt.sx, targetPt.sy + (isHiRes ? 22 : 18));
      ctx.stroke();
    }

    // Ground shadow when ball is airborne
    if (ball.state === 'IN_FLIGHT' && ball.z > 1.8) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(ballPt.sx, ballPt.sy + 6, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw pigskin oval (scaled slightly by altitude z)
    const isHiRes = (this.canvas.clientWidth || 960) >= 1200;
    const zScale = ball.state === 'IN_FLIGHT' ? 1.0 + Math.max(0, ball.z - 1.5) * 0.09 : 1.0;
    const offsetX = ball.state === 'HELD' ? 8 : 0;
    const offsetY = ball.state === 'HELD' ? -6 : -Math.max(0, ball.z - 1.5) * 2.2;

    ctx.translate(ballPt.sx + offsetX, ballPt.sy + offsetY);
    ctx.scale(zScale, zScale);
    ctx.fillStyle = skin.ballColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = isHiRes ? 1.5 : 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, isHiRes ? 6.2 : 5.2, isHiRes ? 3.8 : 3.2, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawTerminationBanner(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    snapshot: PlayTickSnapshot,
    skin: CanvasSkinTokens
  ): void {
    ctx.save();
    const reason = snapshot.terminationReason;
    const tgtInfo = snapshot.targetedReceiverId ? ` -> ${snapshot.targetedReceiverId}` : '';
    let tag = 'WHISTLE: PLAY STOP';
    let bgColor = 'rgba(210, 153, 34, 0.92)';

    if (reason === 'SACK') {
      tag = 'WHISTLE: SACK';
      bgColor = 'rgba(248, 81, 73, 0.92)';
    } else if (reason === 'TOUCHDOWN') {
      tag = `TOUCHDOWN${tgtInfo}`;
      bgColor = 'rgba(16, 185, 129, 0.95)';
    } else if (reason === 'OUT_OF_BOUNDS') {
      tag = `OUT OF BOUNDS (CLOCK STOP)${tgtInfo}`;
      bgColor = 'rgba(14, 165, 233, 0.94)';
    } else if (reason === 'TACKLED') {
      tag = snapshot.ball?.completedPass
        ? `CATCH + YAC TACKLED${tgtInfo}`
        : 'WHISTLE: RUN STOP / TACKLED';
      bgColor = snapshot.ball?.completedPass
        ? 'rgba(46, 160, 67, 0.92)'
        : 'rgba(210, 153, 34, 0.92)';
    } else if (reason === 'COMPLETE') {
      tag = `PASS COMPLETE${tgtInfo}`;
      bgColor = 'rgba(46, 160, 67, 0.92)';
    } else if (reason === 'INCOMPLETE') {
      tag = `INCOMPLETE PASS${tgtInfo}`;
      bgColor = 'rgba(110, 118, 129, 0.92)';
    }

    const exoticTag = snapshot.exoticEvent
      ? ` // ${snapshot.exoticEvent.replace(/_/g, ' ')}`
      : (snapshot.ball?.lateralCount ?? 0) > 0
      ? ` // LATERAL x${snapshot.ball!.lateralCount}`
      : '';

    const yardsText =
      snapshot.carrierTackledYards !== null && snapshot.carrierTackledYards !== undefined
        ? ` (${snapshot.carrierTackledYards >= 0 ? '+' : ''}${snapshot.carrierTackledYards.toFixed(1)}y)`
        : '';
    const text = `[ ${tag}${exoticTag}${yardsText} @ T=${snapshot.timeSec.toFixed(2)}s ]`;

    const isHiRes = w >= 1200;
    ctx.font = isHiRes ? `800 13px ${skin.fontFamilyCanvas}` : `700 11px ${skin.fontFamilyCanvas}`;
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + (isHiRes ? 32 : 24);
    const boxH = isHiRes ? 30 : 24;
    const boxX = (w - boxW) * 0.5;
    const boxY = isHiRes ? 16 : 14;

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = isHiRes ? 1.6 : 1.2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w * 0.5, boxY + boxH * 0.5);
    ctx.restore();
  }

  private drawFieldGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    skin: CanvasSkinTokens,
    firstDownYards = 10,
    yardLineToGoal?: number
  ): void {
    ctx.fillStyle = skin.fieldBgPrimary;
    ctx.fillRect(0, 0, w, h);

    // 5-yard alternating bands & 1-yard minor laser lines
    for (let y = -10; y <= 25; y += 1) {
      const pLeft = this.worldToScreen(-26.67, y);
      const pRight = this.worldToScreen(26.67, y);

      if (y % 5 === 0 && y < 25) {
        const pNext = this.worldToScreen(26.67, y + 5);
        if (Math.abs(y / 5) % 2 === 1) {
          ctx.fillStyle = skin.fieldBgAlt;
          ctx.fillRect(pLeft.sx, pNext.sy, pRight.sx - pLeft.sx, pLeft.sy - pNext.sy);
        }
      }

      ctx.strokeStyle = y % 5 === 0 ? skin.yardLineMajor : skin.yardLineMinor;
      ctx.lineWidth = y % 5 === 0 ? 1.2 : 0.6;
      ctx.beginPath();
      ctx.moveTo(pLeft.sx, pLeft.sy);
      ctx.lineTo(pRight.sx, pRight.sy);
      ctx.stroke();

      // NFL Hash Marks (-3.08y and +3.08y)
      const hL1 = this.worldToScreen(-3.3, y);
      const hL2 = this.worldToScreen(-2.8, y);
      const hR1 = this.worldToScreen(2.8, y);
      const hR2 = this.worldToScreen(3.3, y);
      ctx.strokeStyle = skin.hashMarkColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hL1.sx, hL1.sy);
      ctx.lineTo(hL2.sx, hL2.sy);
      ctx.moveTo(hR1.sx, hR1.sy);
      ctx.lineTo(hR2.sx, hR2.sy);
      ctx.stroke();

      // Yardage depth labels along sideline
      if (y % 5 === 0 && y !== 0) {
        ctx.fillStyle = skin.yardLineMajor;
        ctx.font = `600 10px ${skin.fontFamilyCanvas}`;
        ctx.fillText(`${y > 0 ? '+' : ''}${y}Y`, pLeft.sx + 6, pLeft.sy - 4);
      }
    }

    // Line of Scrimmage (Y = 0) & Dynamic First Down Marker (Y = +firstDownYards)
    const losL = this.worldToScreen(-26.67, 0);
    const losR = this.worldToScreen(26.67, 0);
    ctx.strokeStyle = skin.losColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(losL.sx, losL.sy);
    ctx.lineTo(losR.sx, losR.sy);
    ctx.stroke();

    if (yardLineToGoal !== undefined && yardLineToGoal <= 12) {
      // Goal line & End Zone
      const glL = this.worldToScreen(-26.67, yardLineToGoal);
      const glR = this.worldToScreen(26.67, yardLineToGoal);

      // Shaded End Zone beyond Goal Line
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.fillRect(0, 0, w, glL.sy);

      // Solid Gold Goal Line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(glL.sx, glL.sy);
      ctx.lineTo(glR.sx, glR.sy);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold 10px ${skin.fontFamilyCanvas}`;
      ctx.fillText(`GOAL LINE (+${yardLineToGoal.toFixed(0)}Y) // END ZONE`, glR.sx - 150, glR.sy - 5);
    } else {
      const fdL = this.worldToScreen(-26.67, firstDownYards);
      const fdR = this.worldToScreen(26.67, firstDownYards);
      ctx.strokeStyle = skin.firstDownColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(fdL.sx, fdL.sy);
      ctx.lineTo(fdR.sx, fdR.sy);
      ctx.stroke();

      ctx.fillStyle = skin.firstDownColor;
      ctx.font = `700 9px ${skin.fontFamilyCanvas}`;
      ctx.fillText(`1ST DOWN (+${firstDownYards}Y)`, fdR.sx - 92, fdR.sy - 4);
    }
  }

  private drawPocketPolygon(
    ctx: CanvasRenderingContext2D,
    agents: SimAgent[],
    skin: CanvasSkinTokens
  ): void {
    const protectors = agents
      .filter(
        (a) =>
          a.side === 'OFF' &&
          ['LT', 'LG', 'C', 'RG', 'RT', 'TE', 'RB'].includes(a.pos) &&
          a.assignment.role !== 'ROUTE' &&
          a.assignment.role !== 'BALL_CARRIER'
      )
      .sort((a, b) => a.x - b.x);

    const qb = agents.find((a) => a.pos === 'QB');
    if (protectors.length < 3 || !qb) return;

    ctx.save();
    ctx.fillStyle = skin.pocketPolyFill;
    ctx.strokeStyle = skin.pocketPolyStroke;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([3, 3]);

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

  private resolveSchematicTarget(
    off: SimAgent,
    defs: SimAgent[],
    defMap: Map<string, SimAgent>,
    level: 'PRIMARY' | 'SECONDARY'
  ): SimAgent | null {
    const explicitId =
      level === 'PRIMARY'
        ? off.assignment.primaryTargetId
        : off.assignment.secondaryTargetId;
    if (explicitId) {
      const explicit = defMap.get(explicitId);
      const maxSpan = level === 'PRIMARY' ? 3.2 : 4.5;
      if (explicit && Math.abs(explicit.startX - off.startX) <= maxSpan) {
        return explicit;
      }
    }
    if (level === 'PRIMARY' && off.engagedWithId) {
      return defMap.get(off.engagedWithId) || null;
    }
    const candidates = defs.filter((d) =>
      level === 'PRIMARY'
        ? d.startY <= 2.5 && Math.abs(d.startX - off.startX) <= 2.8
        : d.startY > 1.0 && d.startY <= 6.5 && Math.abs(d.startX - off.startX) <= 4.2
    );
    if (candidates.length > 0) {
      candidates.sort(
        (a, b) =>
          Math.hypot(a.x - off.x, a.y - off.y) - Math.hypot(b.x - off.x, b.y - off.y)
      );
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
      ctx.lineWidth = isSelected ? 2.2 : 1.4;

      switch (asg.role) {
        case 'PASS_SET': {
          const offset = GAP_X_COORDS[asg.gapOrSet] || GAP_X_COORDS.VERTICAL_DEEP;
          const setWorldX = off.startX + offset.dx * (off.startX < 0 ? 1 : -1);
          const setWorldY = off.startY + offset.dy;
          const endPt = this.worldToScreen(setWorldX, setWorldY);

          ctx.strokeStyle = skin.blockPassSetStroke;
          ctx.beginPath();
          ctx.moveTo(startPt.sx, startPt.sy);
          ctx.lineTo(endPt.sx, endPt.sy);
          ctx.stroke();

          this.drawPerpBlockBar(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, 8, skin.blockPassSetStroke);
          break;
        }

        case 'MAN_BLOCK': {
          const tgt = this.resolveSchematicTarget(off, defs, defMap, 'PRIMARY');
          if (tgt) {
            const endPt = this.worldToScreen(tgt.x, tgt.y);
            ctx.strokeStyle = skin.blockManStroke;
            ctx.beginPath();
            ctx.moveTo(startPt.sx, startPt.sy);
            ctx.lineTo(endPt.sx, endPt.sy);
            ctx.stroke();
            this.drawPerpBlockBar(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, 9, skin.blockManStroke);
          }
          break;
        }

        case 'COMBO_CLIMB': {
          const tgt1 = this.resolveSchematicTarget(off, defs, defMap, 'PRIMARY');
          const tgt2 = this.resolveSchematicTarget(off, defs, defMap, 'SECONDARY');
          ctx.strokeStyle = skin.blockComboStroke;

          if (tgt1) {
            const p1 = this.worldToScreen(tgt1.x, tgt1.y);
            ctx.beginPath();
            ctx.moveTo(startPt.sx, startPt.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();
            this.drawPerpBlockBar(ctx, startPt.sx, startPt.sy, p1.sx, p1.sy, 7, skin.blockComboStroke);

            if (tgt2) {
              const p2 = this.worldToScreen(tgt2.x, tgt2.y);
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.moveTo(p1.sx, p1.sy);
              ctx.lineTo(p2.sx, p2.sy);
              ctx.stroke();
              this.drawArrowHead(ctx, p1.sx, p1.sy, p2.sx, p2.sy, 6, skin.blockComboStroke);
            }
          }
          break;
        }

        case 'GAP_ZONE': {
          const gap = GAP_X_COORDS[asg.gapOrSet] || GAP_X_COORDS.B_RIGHT;
          const endPt = this.worldToScreen(gap.dx, gap.dy);
          ctx.strokeStyle = skin.blockManStroke;
          ctx.beginPath();
          ctx.moveTo(startPt.sx, startPt.sy);
          ctx.lineTo(endPt.sx, endPt.sy);
          ctx.stroke();
          this.drawPerpBlockBar(ctx, startPt.sx, startPt.sy, endPt.sx, endPt.sy, 8, skin.blockManStroke);
          break;
        }

        case 'PULL_LEAD':
        case 'PULL_TRAP': {
          ctx.strokeStyle = skin.blockPullStroke;
          this.drawWaypointChain(ctx, off.startX, off.startY, asg.waypoints, skin.blockPullStroke, true, skin, isSelected);
          break;
        }

        case 'CHIP_RELEASE': {
          const chipTgt = this.resolveSchematicTarget(off, defs, defMap, 'PRIMARY');
          if (chipTgt) {
            const chipPt = this.worldToScreen(chipTgt.x, chipTgt.y);
            ctx.strokeStyle = skin.blockChipStroke;
            ctx.beginPath();
            ctx.moveTo(startPt.sx, startPt.sy);
            ctx.lineTo(chipPt.sx, chipPt.sy);
            ctx.stroke();
            this.drawPerpBlockBar(ctx, startPt.sx, startPt.sy, chipPt.sx, chipPt.sy, 7, skin.blockChipStroke);
          }
          ctx.setLineDash([4, 2]);
          this.drawWaypointChain(ctx, off.startX, off.startY, asg.waypoints, skin.routeStroke, false, skin, isSelected);
          break;
        }

        case 'ROUTE':
        case 'BALL_CARRIER': {
          if (off.preSnapMotion?.enabled) {
            const m = off.preSnapMotion;
            const origPt = this.worldToScreen(m.originX, m.originY);
            const snapPt = this.worldToScreen(m.snapX, m.snapY);

            ctx.save();
            ctx.strokeStyle = '#f59e0b';
            ctx.fillStyle = '#f59e0b';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 3]);

            ctx.beginPath();
            ctx.moveTo(origPt.sx, origPt.sy);
            ctx.lineTo(snapPt.sx, snapPt.sy);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(origPt.sx, origPt.sy, 3.5, 0, Math.PI * 2);
            ctx.stroke();

            this.drawArrowHead(ctx, origPt.sx, origPt.sy, snapPt.sx, snapPt.sy, 7, '#f59e0b');

            const fontName = skin?.fontFamilyCanvas || '"JetBrains Mono", monospace';
            ctx.font = `700 8.5px ${fontName}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(
              `MOTION ${m.speed}y/s`,
              (origPt.sx + snapPt.sx) / 2,
              Math.min(origPt.sy, snapPt.sy) - 4
            );
            ctx.restore();
          }

          const startX = off.preSnapMotion?.enabled ? off.preSnapMotion.snapX : off.startX;
          const startY = off.preSnapMotion?.enabled ? off.preSnapMotion.snapY : off.startY;
          this.drawWaypointChain(ctx, startX, startY, asg.waypoints, skin.routeStroke, false, skin, isSelected);
          break;
        }
      }

      ctx.restore();
    }
  }

  private drawWaypointChain(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    waypoints: Array<{ x: number; y: number }>,
    color: string,
    endAsBlockBar: boolean,
    skin?: CanvasSkinTokens,
    isSelected = false
  ): void {
    if (!waypoints || waypoints.length === 0) return;
    const isHiRes = (this.canvas.clientWidth || 960) >= 1200;
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? (isHiRes ? 2.8 : 2.0) : (isHiRes ? 2.2 : 1.4);
    const p0 = this.worldToScreen(startX, startY);
    ctx.beginPath();
    ctx.moveTo(p0.sx, p0.sy);

    let prev = p0;
    for (let i = 0; i < waypoints.length; i++) {
      const pt = this.worldToScreen(waypoints[i].x, waypoints[i].y);
      ctx.lineTo(pt.sx, pt.sy);
      if (i === waypoints.length - 1) {
        ctx.stroke();
        if (endAsBlockBar) {
          this.drawPerpBlockBar(ctx, prev.sx, prev.sy, pt.sx, pt.sy, isHiRes ? 10 : 8, color);
        } else {
          this.drawArrowHead(ctx, prev.sx, prev.sy, pt.sx, pt.sy, isHiRes ? 8 : 6, color);
        }
      }
      prev = pt;
    }

    // Render tactile landmark control nodes along the route/pull path
    for (let i = 0; i < waypoints.length; i++) {
      const pt = this.worldToScreen(waypoints[i].x, waypoints[i].y);
      ctx.save();
      ctx.setLineDash([]);
      ctx.fillStyle = isSelected ? color : 'rgba(255, 255, 255, 0.85)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSelected ? 1.6 : 1.0;
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, isSelected ? (isHiRes ? 5.5 : 4.5) : (isHiRes ? 3.8 : 3.0), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isSelected) {
        // Subtle outer targeting ring for selected player's landmark node
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, isHiRes ? 9.0 : 7.5, 0, Math.PI * 2);
        ctx.stroke();

        // Landmark label badge (L1, L2, ...)
        ctx.fillStyle = '#ffffff';
        const fontName = skin?.fontFamilyCanvas || '"JetBrains Mono", monospace';
        ctx.font = isHiRes ? `800 10px ${fontName}` : `700 8.5px ${fontName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`L${i + 1}`, pt.sx, pt.sy - (isHiRes ? 10 : 8));
      }
      ctx.restore();
    }
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

    const isHiRes = (this.canvas.clientWidth || 960) >= 1200;
    ctx.save();
    ctx.setLineDash([]);
    ctx.strokeStyle = color;
    ctx.lineWidth = isHiRes ? 3.2 : 2.4;
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

      if (opts.showForceVectors && (Math.abs(a.vx) > 0.2 || Math.abs(a.vy) > 0.2)) {
        const endPt = this.worldToScreen(a.x + a.vx * 0.28, a.y + a.vy * 0.28);
        ctx.save();
        ctx.strokeStyle =
          a.engagedWithId
            ? a.leverageScore >= 0
              ? skin.forceVectorWin
              : skin.forceVectorLoss
            : 'rgba(255,255,255,0.35)';
        ctx.lineWidth = a.engagedWithId ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(pt.sx, pt.sy);
        ctx.lineTo(endPt.sx, endPt.sy);
        ctx.stroke();
        ctx.restore();
      }

      if (opts.showLeverageCones && a.side === 'OFF' && a.engagedWithId) {
        ctx.save();
        ctx.strokeStyle = a.leverageScore >= 0 ? skin.forceVectorWin : skin.forceVectorLoss;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

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
    const isHiRes = (this.canvas.clientWidth || 960) >= 1200;
    const radius = isHiRes ? 12.5 : 10.5;
    const isSelected = opts.selectedAgentId === agent.id;
    const isHovered = opts.hoveredAgentId === agent.id;
    const isPassTarget = snapshot.targetedReceiverId === agent.id;

    ctx.save();

    if (isSelected || isHovered) {
      ctx.strokeStyle = skin.blockerHighlight;
      ctx.lineWidth = isHiRes ? 2.6 : 2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (opts.designatedMikeId && agent.id === opts.designatedMikeId) {
      // Declared Mike LB targeting reticle
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = isHiRes ? 2.4 : 2.0;
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 4.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      const fontName = skin?.fontFamilyCanvas || '"JetBrains Mono", monospace';
      ctx.font = isHiRes ? `800 10px ${fontName}` : `800 8.5px ${fontName}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('MIKE [ID]', sx, sy - radius - (isHiRes ? 5 : 4));
      ctx.restore();
    }

    if (isPassTarget) {
      ctx.strokeStyle = skin.ballColor;
      ctx.lineWidth = isHiRes ? 2.6 : 2.2;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (agent.isShedding) {
      ctx.strokeStyle = skin.forceVectorWin;
      ctx.lineWidth = isHiRes ? 3.0 : 2.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (agent.side === 'OFF') {
      const isTrench = ['LT', 'LG', 'C', 'RG', 'RT', 'TE', 'FB'].includes(agent.pos);
      ctx.fillStyle = skin.offenseFill;
      ctx.strokeStyle = isSelected ? skin.blockerHighlight : skin.offenseStroke;
      ctx.lineWidth = isSelected ? (isHiRes ? 2.6 : 2.2) : (isHiRes ? 1.8 : 1.6);

      if (isTrench) {
        ctx.beginPath();
        ctx.roundRect(sx - radius, sy - radius * 0.85, radius * 2, radius * 1.7, 3);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = skin.offenseText;
      ctx.font = isHiRes ? `800 10.5px ${skin.fontFamilyCanvas}` : `700 9px ${skin.fontFamilyCanvas}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(agent.pos, sx, sy);

      // Draw QB Read Progression Badge (1, 2, 3, C) on eligible route runners
      if (agent.readOrder && (agent.assignment.role === 'ROUTE' || agent.assignment.role === 'CHIP_RELEASE')) {
        const bx = sx + radius * 0.85;
        const by = sy - radius * 0.85;
        const badgeR = isHiRes ? 6.5 : 5.5;
        ctx.fillStyle = isPassTarget ? skin.ballColor : skin.offenseStroke;
        ctx.beginPath();
        ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#080a0d';
        ctx.font = isHiRes ? `800 8.5px ${skin.fontFamilyCanvas}` : `700 7.5px ${skin.fontFamilyCanvas}`;
        ctx.fillText(agent.readOrder <= 3 ? String(agent.readOrder) : 'C', bx, by + 0.5);
      }
    } else {
      ctx.fillStyle = skin.defenseFill;
      ctx.strokeStyle = isSelected ? skin.blockerHighlight : skin.defenseStroke;
      ctx.lineWidth = isSelected ? (isHiRes ? 2.6 : 2.2) : (isHiRes ? 1.8 : 1.6);
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = skin.defenseText;
      ctx.font = isHiRes ? `800 10.5px ${skin.fontFamilyCanvas}` : `700 9px ${skin.fontFamilyCanvas}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(agent.pos, sx, sy);
    }

    ctx.restore();
  }

  private drawMonteCarloFan(
    ctx: CanvasRenderingContext2D,
    mc: MonteCarloOverlayData
  ): void {
    ctx.save();
    for (const tr of mc.traces) {
      if (tr.points.length < 2) continue;
      ctx.strokeStyle =
        tr.kind === 'LATERAL'
          ? 'rgba(6, 182, 212, 0.34)'
          : tr.kind === 'PASS_COMP'
          ? 'rgba(63, 185, 80, 0.28)'
          : tr.kind === 'RUN_GAIN'
          ? 'rgba(245, 158, 11, 0.30)'
          : 'rgba(248, 81, 73, 0.18)';
      ctx.lineWidth = tr.kind === 'LATERAL' ? 1.8 : 1.35;
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
          ? '#06b6d4'
          : tr.kind === 'PASS_COMP'
          ? '#3fb950'
          : tr.kind === 'RUN_GAIN'
          ? '#f59e0b'
          : '#f85149';
      ctx.strokeStyle = 'rgba(8, 10, 13, 0.85)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, tr.kind === 'FAIL' ? 2.6 : 3.6, 0, Math.PI * 2);
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
    const x = 12;
    const y = 12;
    const w = 264;
    const h = 124;
    const fontName = skin?.fontFamilyCanvas || '"JetBrains Mono", monospace';

    ctx.save();
    ctx.fillStyle = 'rgba(8, 11, 16, 0.90)';
    ctx.strokeStyle = 'rgba(56, 139, 253, 0.65)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#58a6ff';
    ctx.font = `800 9.5px ${fontName}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`MONTE CARLO SIM // N=${mc.runs} RUNS`, x + 10, y + 8);

    const ydsSign = mc.meanYards >= 0 ? '+' : '';
    const epaSign = mc.meanEpa >= 0 ? '+' : '';
    ctx.fillStyle = '#e6edf3';
    ctx.font = `700 10px ${fontName}`;
    ctx.fillText(
      `MEAN ${ydsSign}${mc.meanYards.toFixed(1)}y  |  EPA ${epaSign}${mc.meanEpa.toFixed(2)}  |  EXPL ${mc.explosiveRatePct.toFixed(0)}%`,
      x + 10,
      y + 23
    );

    const barTop = y + 40;
    const labelW = 46;
    const maxBarW = 152;
    mc.buckets.forEach((b, idx) => {
      const rowY = barTop + idx * 13;
      ctx.fillStyle = '#9da7b3';
      ctx.font = `700 8.5px ${fontName}`;
      ctx.fillText(b.label, x + 10, rowY);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 10 + labelW, rowY + 1, maxBarW, 8);

      const fillW = Math.max(1.5, (Math.min(100, b.pct) / 100) * maxBarW);
      ctx.fillStyle = b.color;
      ctx.fillRect(x + 10 + labelW, rowY + 1, fillW, 8);

      ctx.fillStyle = '#e6edf3';
      ctx.fillText(`${b.pct.toFixed(0)}%`, x + 16 + labelW + maxBarW, rowY);
    });

    const legY = y + h - 14;
    const legendItems: [string, string][] = [
      ['#3fb950', 'PASS/TD'],
      ['#06b6d4', 'LATERAL'],
      ['#f59e0b', 'RUN/KEEP'],
      ['#f85149', 'INC/SACK'],
    ];
    let lx = x + 10;
    ctx.font = `700 8px ${fontName}`;
    for (const [col, txt] of legendItems) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(lx + 3, legY + 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9d1d9';
      ctx.fillText(txt, lx + 9, legY);
      lx += txt.length * 5.2 + 18;
    }

    ctx.restore();
  }

  private drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.restore();
  }
}
