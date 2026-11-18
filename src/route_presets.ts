import { LeverageBias, SimAgent, Waypoint2D } from './engine';

export type RoutePresetId =
  | 'SLANT'
  | 'SHALLOW'
  | 'HITCH'
  | 'OUT'
  | 'WHIP'
  | 'POST'
  | 'CORNER'
  | 'WHEEL'
  | 'GO'
  | 'DIG'
  | 'COMEBACK'
  | 'CURL'
  | 'ZIG'
  | 'FADE'
  | 'GLANCE'
  | 'SWING';

export interface RoutePresetSpec {
  id: RoutePresetId;
  label: string;
  group: 'QUICK' | 'INTERMEDIATE_DEEP' | 'DOUBLE_MOVE_RPO' | 'BACKFIELD';
  recommendedLeverage: LeverageBias;
  buildWaypoints: (startX: number, startY: number, insideDir: number, outsideDir: number) => Waypoint2D[];
}

const SIDELINE_BOUND_X = 25.0;

function clampFieldX(x: number): number {
  return +Math.max(-SIDELINE_BOUND_X, Math.min(SIDELINE_BOUND_X, x)).toFixed(2);
}

function pt(x: number, y: number): Waypoint2D {
  return { x: clampFieldX(x), y: +y.toFixed(2) };
}

/**
 * Canonical 16-route tree library (15 core receiver routes + RB Swing checkdown).
 * Used both by the UI Route Tree inspector menu and as structural seeds during play mutation.
 */
export const ROUTE_PRESETS: readonly RoutePresetSpec[] = [
  // Row 1: Quick / Underneath
  {
    id: 'SLANT',
    label: 'Slant — Quick 3-Step (3.5y stem -> 45° in)',
    group: 'QUICK',
    recommendedLeverage: 'INSIDE_OUT',
    buildWaypoints: (x0, _y0, inside) => [pt(x0, 3.5), pt(x0 + inside * 6.5, 7.5)],
  },
  {
    id: 'SHALLOW',
    label: 'Shallow — Underneath Drag Cross (2y -> across)',
    group: 'QUICK',
    recommendedLeverage: 'NEUTRAL',
    buildWaypoints: (x0, _y0, inside) => [
      pt(x0 + inside * 2.5, 2.2),
      pt(x0 + inside * 11.5, 3.4),
      pt(x0 + inside * 19.0, 3.8),
    ],
  },
  {
    id: 'HITCH',
    label: 'Hitch — 5-Yard Quick Stop & Hook In',
    group: 'QUICK',
    recommendedLeverage: 'NEUTRAL',
    buildWaypoints: (x0, _y0, inside) => [pt(x0, 5.5), pt(x0 + inside * 0.8, 4.6)],
  },
  {
    id: 'OUT',
    label: 'Out — 5-Yard Speed Out (5y stem -> 90° out)',
    group: 'QUICK',
    recommendedLeverage: 'OUTSIDE_IN',
    buildWaypoints: (x0, _y0, _inside, outside) => [pt(x0, 5.0), pt(x0 + outside * 6.5, 5.2)],
  },
  {
    id: 'WHIP',
    label: 'Whip — Outside Jab -> Whip Return Inside',
    group: 'QUICK',
    recommendedLeverage: 'INSIDE_OUT',
    buildWaypoints: (x0, _y0, inside, outside) => [
      pt(x0, 3.5),
      pt(x0 + outside * 2.2, 4.6),
      pt(x0 + inside * 7.5, 5.0),
    ],
  },

  // Row 2: Intermediate / Vertical & Deep Breaks
  {
    id: 'POST',
    label: 'Post — 13-Yard Deep Post (45° to MOF)',
    group: 'INTERMEDIATE_DEEP',
    recommendedLeverage: 'INSIDE_OUT',
    buildWaypoints: (x0, _y0, inside) => [pt(x0, 13.0), pt(x0 + inside * 9.5, 23.0)],
  },
  {
    id: 'CORNER',
    label: 'Corner — 10-Yard Flag / Corner (45° out)',
    group: 'INTERMEDIATE_DEEP',
    recommendedLeverage: 'OUTSIDE_IN',
    buildWaypoints: (x0, _y0, _inside, outside) => [pt(x0, 10.0), pt(x0 + outside * 8.0, 18.0)],
  },
  {
    id: 'WHEEL',
    label: 'Wheel — Flat Release -> Vertical Up Sideline',
    group: 'INTERMEDIATE_DEEP',
    recommendedLeverage: 'OUTSIDE_IN',
    buildWaypoints: (x0, y0, _inside, outside) =>
      y0 < -2.0
        ? [pt(x0 + outside * 5.0, -0.8), pt(x0 + outside * 9.0, 3.5), pt(x0 + outside * 9.5, 19.0)]
        : [pt(x0 + outside * 3.5, 1.2), pt(x0 + outside * 6.0, 4.8), pt(x0 + outside * 6.5, 19.5)],
  },
  {
    id: 'GO',
    label: 'Go — 9-Route Vertical Seam (to +25.5y)',
    group: 'INTERMEDIATE_DEEP',
    recommendedLeverage: 'NEUTRAL',
    buildWaypoints: (x0) => [pt(x0, 12.0), pt(x0, 25.5)],
  },
  {
    id: 'DIG',
    label: 'Dig — 12-Yard Hard In-Cut (90° inside)',
    group: 'INTERMEDIATE_DEEP',
    recommendedLeverage: 'INSIDE_OUT',
    buildWaypoints: (x0, _y0, inside) => [pt(x0, 12.0), pt(x0 + inside * 11.0, 12.0)],
  },

  // Row 3: Double-Moves, Stemmed Hooks & RPO
  {
    id: 'COMEBACK',
    label: 'Comeback — 14-Yard Stem -> 45° Back Outside',
    group: 'DOUBLE_MOVE_RPO',
    recommendedLeverage: 'OUTSIDE_IN',
    buildWaypoints: (x0, _y0, _inside, outside) => [pt(x0, 14.0), pt(x0 + outside * 4.2, 10.5)],
  },
  {
    id: 'CURL',
    label: 'Curl — 10-Yard Stem -> Hook Back Inside',
    group: 'DOUBLE_MOVE_RPO',
    recommendedLeverage: 'INSIDE_OUT',
    buildWaypoints: (x0, _y0, inside) => [pt(x0, 10.5), pt(x0 + inside * 1.6, 8.6)],
  },
  {
    id: 'ZIG',
    label: 'Zig — Inside Jab -> Whip Out to Sideline',
    group: 'DOUBLE_MOVE_RPO',
    recommendedLeverage: 'OUTSIDE_IN',
    buildWaypoints: (x0, _y0, inside, outside) => [
      pt(x0, 3.5),
      pt(x0 + inside * 2.2, 4.6),
      pt(x0 + outside * 7.5, 5.0),
    ],
  },
  {
    id: 'FADE',
    label: 'Fade — Outside-Release Vertical Stack (+25y)',
    group: 'DOUBLE_MOVE_RPO',
    recommendedLeverage: 'OUTSIDE_IN',
    buildWaypoints: (x0, _y0, _inside, outside) => [
      pt(x0 + outside * 1.8, 3.5),
      pt(x0 + outside * 3.4, 12.5),
      pt(x0 + outside * 4.0, 25.0),
    ],
  },
  {
    id: 'GLANCE',
    label: 'Glance — 6-Yard Skinny RPO Post (behind LBs)',
    group: 'DOUBLE_MOVE_RPO',
    recommendedLeverage: 'INSIDE_OUT',
    buildWaypoints: (x0, _y0, inside) => [pt(x0, 6.0), pt(x0 + inside * 7.0, 13.0)],
  },

  // Backfield Checkdown
  {
    id: 'SWING',
    label: 'Swing — RB Wide Boundary Checkdown Arc',
    group: 'BACKFIELD',
    recommendedLeverage: 'OUTSIDE_IN',
    buildWaypoints: (x0, _y0, _inside, outside) => [
      pt(x0 + outside * 6.0, -2.0),
      pt(x0 + outside * 12.0, 3.5),
    ],
  },
] as const;

export const ROUTE_PRESET_MAP: ReadonlyMap<RoutePresetId, RoutePresetSpec> = new Map(
  ROUTE_PRESETS.map((r) => [r.id, r])
);

export const RECEIVER_EVOLUTION_SEEDS: readonly RoutePresetId[] = ROUTE_PRESETS.filter(
  (r) => r.id !== 'SWING'
).map((r) => r.id);

export const BACKFIELD_EVOLUTION_SEEDS: readonly RoutePresetId[] = [
  'SWING',
  'WHEEL',
  'SHALLOW',
  'OUT',
  'HITCH',
  'ZIG',
  'WHIP',
];

export function buildRouteWaypoints(
  presetId: RoutePresetId,
  startX: number,
  startY: number
): Waypoint2D[] | null {
  const spec = ROUTE_PRESET_MAP.get(presetId);
  if (!spec) return null;
  const insideDir = startX < 0 ? 1 : -1;
  const outsideDir = -insideDir;
  return spec.buildWaypoints(startX, startY, insideDir, outsideDir);
}

/**
 * Applies a canonical route tree stem to an offensive agent, updating waypoints and leverage.
 * Keeps RB 'BALL_CARRIER' if already designated as the rushing carrier, otherwise assigns 'ROUTE'.
 */
export function applyRoutePresetToAgent(agent: SimAgent, presetId: RoutePresetId): boolean {
  const spec = ROUTE_PRESET_MAP.get(presetId);
  if (!spec || agent.side !== 'OFF') return false;
  const wps = buildRouteWaypoints(presetId, agent.startX, agent.startY);
  if (!wps) return false;

  if (agent.pos !== 'RB' || agent.assignment.role !== 'BALL_CARRIER') {
    agent.assignment.role = 'ROUTE';
  }
  agent.assignment.leverage = spec.recommendedLeverage;
  agent.assignment.waypoints = wps;
  return true;
}
