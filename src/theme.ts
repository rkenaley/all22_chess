export type SkinId =
  | 'broadcast-analytics'
  | 'all22-pro'
  | 'coach-chalkboard'
  | 'retro-16bit'
  | 'paper-playbook';

export interface CanvasSkinTokens {
  fieldBgPrimary: string;
  fieldBgAlt: string;
  fieldApronBg: string;
  fieldVignette: string;
  yardLineMajor: string;
  yardLineMinor: string;
  yardNumberColor: string;
  hashMarkColor: string;
  losColor: string;
  firstDownColor: string;
  pocketPolyFill: string;
  pocketPolyStroke: string;
  offenseFill: string;
  offenseStroke: string;
  offenseText: string;
  blockerHighlight: string;
  defenseFill: string;
  defenseStroke: string;
  defenseText: string;
  defBadgeBg: string;
  ballColor: string;
  routeStroke: string;
  routeFakeStroke: string;
  motionStroke: string;
  voidCorridorFill: string;
  voidCorridorStroke: string;
  haloStroke: string;
  blockPassSetStroke: string;
  blockManStroke: string;
  blockComboStroke: string;
  blockPullStroke: string;
  blockChipStroke: string;
  forceVectorWin: string;
  forceVectorLoss: string;
  fontFamilyCanvas: string;
  pixelSnap: boolean;
  scanlines: boolean;
}

export interface UIThemeDefinition {
  id: SkinId;
  label: string;
  cssVars: Record<string, string>;
  canvas: CanvasSkinTokens;
}

export const BUILTIN_THEMES: Record<SkinId, UIThemeDefinition> = {
  'broadcast-analytics': {
    id: 'broadcast-analytics',
    label: 'NEXT-GEN BROADCAST',
    cssVars: {
      '--bg-0': '#060c0f',
      '--bg-1': '#0b141a',
      '--bg-2': '#111e27',
      '--bg-3': '#192b38',
      '--surface-glass': 'rgba(10, 18, 25, 0.88)',
      '--fg-0': '#f1f7fb',
      '--fg-1': '#9fb7c9',
      '--fg-2': '#627c8f',
      '--fg-muted': '#7b95a8',
      '--border-hairline': 'rgba(148, 189, 219, 0.14)',
      '--border-subtle': 'rgba(148, 189, 219, 0.24)',
      '--border-focus': '#38bdf8',
      '--accent-primary': '#38bdf8',
      '--accent-secondary': '#fbbf24',
      '--accent-Positive': '#10b981',
      '--accent-danger': '#f43f5e',
      '--accent-block': '#fb923c',
      '--accent-combo': '#a78bfa',
      '--accent-fake': '#e879f9',
    },
    canvas: {
      fieldBgPrimary: '#0e2c1c',
      fieldBgAlt: '#113422',
      fieldApronBg: '#071710',
      fieldVignette: 'rgba(2, 10, 8, 0.42)',
      yardLineMajor: 'rgba(235, 248, 240, 0.42)',
      yardLineMinor: 'rgba(235, 248, 240, 0.13)',
      yardNumberColor: 'rgba(235, 248, 240, 0.20)',
      hashMarkColor: 'rgba(235, 248, 240, 0.48)',
      losColor: '#38bdf8',
      firstDownColor: '#fbbf24',
      pocketPolyFill: 'rgba(56, 189, 248, 0.13)',
      pocketPolyStroke: 'rgba(56, 189, 248, 0.65)',
      offenseFill: '#0b2239',
      offenseStroke: '#38bdf8',
      offenseText: '#f8fafc',
      blockerHighlight: '#fbbf24',
      defenseFill: '#330c18',
      defenseStroke: '#fb7185',
      defenseText: '#fff1f2',
      defBadgeBg: 'rgba(24, 9, 16, 0.90)',
      ballColor: '#fbbf24',
      routeStroke: '#38bdf8',
      routeFakeStroke: '#e879f9',
      motionStroke: '#fbbf24',
      voidCorridorFill: 'rgba(16, 185, 129, 0.16)',
      voidCorridorStroke: 'rgba(52, 211, 153, 0.85)',
      haloStroke: 'rgba(5, 18, 12, 0.88)',
      blockPassSetStroke: '#94a3b8',
      blockManStroke: '#fb923c',
      blockComboStroke: '#c084fc',
      blockPullStroke: '#34d399',
      blockChipStroke: '#fbbf24',
      forceVectorWin: '#10b981',
      forceVectorLoss: '#f43f5e',
      fontFamilyCanvas: '"JetBrains Mono", "Cascadia Mono", Consolas, monospace',
      pixelSnap: false,
      scanlines: false,
    },
  },

  'all22-pro': {
    id: 'all22-pro',
    label: 'ALL-22 TELEMETRY PRO',
    cssVars: {
      '--bg-0': '#07090d',
      '--bg-1': '#0d1117',
      '--bg-2': '#141a23',
      '--bg-3': '#1d2633',
      '--surface-glass': 'rgba(13, 17, 23, 0.90)',
      '--fg-0': '#eef4fa',
      '--fg-1': '#9aa8b8',
      '--fg-2': '#627080',
      '--fg-muted': '#7a8898',
      '--border-hairline': 'rgba(148, 163, 184, 0.14)',
      '--border-subtle': 'rgba(148, 163, 184, 0.25)',
      '--border-focus': '#58a6ff',
      '--accent-primary': '#58a6ff',
      '--accent-secondary': '#e3b341',
      '--accent-Positive': '#3fb950',
      '--accent-danger': '#f85149',
      '--accent-block': '#f0883e',
      '--accent-combo': '#a371f7',
      '--accent-fake': '#f472b6',
    },
    canvas: {
      fieldBgPrimary: '#0b1017',
      fieldBgAlt: '#0e141d',
      fieldApronBg: '#06090e',
      fieldVignette: 'rgba(2, 5, 10, 0.45)',
      yardLineMajor: 'rgba(157, 173, 194, 0.28)',
      yardLineMinor: 'rgba(157, 173, 194, 0.09)',
      yardNumberColor: 'rgba(157, 173, 194, 0.14)',
      hashMarkColor: 'rgba(157, 173, 194, 0.34)',
      losColor: '#58a6ff',
      firstDownColor: '#e3b341',
      pocketPolyFill: 'rgba(88, 166, 255, 0.10)',
      pocketPolyStroke: 'rgba(88, 166, 255, 0.55)',
      offenseFill: '#111c2b',
      offenseStroke: '#58a6ff',
      offenseText: '#f0f6fc',
      blockerHighlight: '#f0883e',
      defenseFill: '#241016',
      defenseStroke: '#f85149',
      defenseText: '#ffe4e6',
      defBadgeBg: 'rgba(22, 10, 14, 0.90)',
      ballColor: '#e3b341',
      routeStroke: '#58a6ff',
      routeFakeStroke: '#f472b6',
      motionStroke: '#e3b341',
      voidCorridorFill: 'rgba(63, 185, 80, 0.15)',
      voidCorridorStroke: 'rgba(63, 185, 80, 0.80)',
      haloStroke: 'rgba(7, 9, 13, 0.90)',
      blockPassSetStroke: '#8b949e',
      blockManStroke: '#f0883e',
      blockComboStroke: '#a371f7',
      blockPullStroke: '#3fb950',
      blockChipStroke: '#e3b341',
      forceVectorWin: '#3fb950',
      forceVectorLoss: '#f85149',
      fontFamilyCanvas: '"JetBrains Mono", "Cascadia Mono", Consolas, monospace',
      pixelSnap: false,
      scanlines: false,
    },
  },

  'coach-chalkboard': {
    id: 'coach-chalkboard',
    label: 'COACH CHALKBOARD',
    cssVars: {
      '--bg-0': '#0b1410',
      '--bg-1': '#111e18',
      '--bg-2': '#172921',
      '--bg-3': '#20382d',
      '--surface-glass': 'rgba(15, 28, 22, 0.90)',
      '--fg-0': '#f4f1ea',
      '--fg-1': '#bcc8bf',
      '--fg-2': '#7a9083',
      '--fg-muted': '#8ea597',
      '--border-hairline': 'rgba(218, 226, 219, 0.14)',
      '--border-subtle': 'rgba(218, 226, 219, 0.25)',
      '--border-focus': '#f2cc60',
      '--accent-primary': '#f2cc60',
      '--accent-secondary': '#f4f1ea',
      '--accent-Positive': '#7ee787',
      '--accent-danger': '#ff948b',
      '--accent-block': '#f2cc60',
      '--accent-combo': '#d2a8ff',
      '--accent-fake': '#f9a8d4',
    },
    canvas: {
      fieldBgPrimary: '#12211a',
      fieldBgAlt: '#15261e',
      fieldApronBg: '#0b1510',
      fieldVignette: 'rgba(5, 11, 8, 0.35)',
      yardLineMajor: 'rgba(244, 241, 234, 0.30)',
      yardLineMinor: 'rgba(244, 241, 234, 0.10)',
      yardNumberColor: 'rgba(244, 241, 234, 0.16)',
      hashMarkColor: 'rgba(244, 241, 234, 0.34)',
      losColor: 'rgba(244, 241, 234, 0.80)',
      firstDownColor: '#f2cc60',
      pocketPolyFill: 'rgba(244, 241, 234, 0.07)',
      pocketPolyStroke: 'rgba(244, 241, 234, 0.45)',
      offenseFill: '#14241d',
      offenseStroke: '#f4f1ea',
      offenseText: '#f4f1ea',
      blockerHighlight: '#f2cc60',
      defenseFill: '#241818',
      defenseStroke: '#ff948b',
      defenseText: '#ffe4e1',
      defBadgeBg: 'rgba(24, 15, 15, 0.90)',
      ballColor: '#f2cc60',
      routeStroke: '#f4f1ea',
      routeFakeStroke: '#f9a8d4',
      motionStroke: '#f2cc60',
      voidCorridorFill: 'rgba(126, 231, 135, 0.14)',
      voidCorridorStroke: 'rgba(126, 231, 135, 0.80)',
      haloStroke: 'rgba(10, 18, 14, 0.85)',
      blockPassSetStroke: '#b8c4bc',
      blockManStroke: '#f2cc60',
      blockComboStroke: '#d2a8ff',
      blockPullStroke: '#7ee787',
      blockChipStroke: '#ffa198',
      forceVectorWin: '#7ee787',
      forceVectorLoss: '#ff948b',
      fontFamilyCanvas: '"JetBrains Mono", "Cascadia Mono", Consolas, monospace',
      pixelSnap: false,
      scanlines: false,
    },
  },

  'retro-16bit': {
    id: 'retro-16bit',
    label: '16-BIT CRT ARCADE',
    cssVars: {
      '--bg-0': '#05050a',
      '--bg-1': '#10101c',
      '--bg-2': '#1a1a2e',
      '--bg-3': '#262642',
      '--surface-glass': 'rgba(16, 16, 28, 0.92)',
      '--fg-0': '#fcfcfc',
      '--fg-1': '#a4e4fc',
      '--fg-2': '#7c7c9c',
      '--fg-muted': '#8a8aae',
      '--border-hairline': '#38385c',
      '--border-subtle': '#4c4c7a',
      '--border-focus': '#3cbcfc',
      '--accent-primary': '#3cbcfc',
      '--accent-secondary': '#f8b800',
      '--accent-Positive': '#00e800',
      '--accent-danger': '#f83800',
      '--accent-block': '#fca044',
      '--accent-combo': '#d880fc',
      '--accent-fake': '#ff66cc',
    },
    canvas: {
      fieldBgPrimary: '#007800',
      fieldBgAlt: '#006800',
      fieldApronBg: '#004800',
      fieldVignette: 'rgba(0, 0, 0, 0.22)',
      yardLineMajor: '#fcfcfc',
      yardLineMinor: 'rgba(252, 252, 252, 0.42)',
      yardNumberColor: 'rgba(252, 252, 252, 0.32)',
      hashMarkColor: '#fcfcfc',
      losColor: '#3cbcfc',
      firstDownColor: '#f8b800',
      pocketPolyFill: 'rgba(248, 184, 0, 0.18)',
      pocketPolyStroke: '#f8b800',
      offenseFill: '#0040a8',
      offenseStroke: '#fcfcfc',
      offenseText: '#fcfcfc',
      blockerHighlight: '#f8b800',
      defenseFill: '#a81000',
      defenseStroke: '#fcfcfc',
      defenseText: '#fcfcfc',
      defBadgeBg: 'rgba(16, 16, 28, 0.90)',
      ballColor: '#fca044',
      routeStroke: '#fcfcfc',
      routeFakeStroke: '#ff66cc',
      motionStroke: '#f8b800',
      voidCorridorFill: 'rgba(88, 248, 88, 0.22)',
      voidCorridorStroke: '#58f858',
      haloStroke: 'rgba(0, 24, 0, 0.90)',
      blockPassSetStroke: '#a4e4fc',
      blockManStroke: '#f8b800',
      blockComboStroke: '#d880fc',
      blockPullStroke: '#58f858',
      blockChipStroke: '#fca044',
      forceVectorWin: '#58f858',
      forceVectorLoss: '#f83800',
      fontFamilyCanvas: '"Courier New", monospace',
      pixelSnap: true,
      scanlines: true,
    },
  },

  'paper-playbook': {
    id: 'paper-playbook',
    label: 'WEST COAST VELLUM',
    cssVars: {
      '--bg-0': '#e6e1d7',
      '--bg-1': '#f5f2eb',
      '--bg-2': '#ece8df',
      '--bg-3': '#dfd9cc',
      '--surface-glass': 'rgba(247, 244, 237, 0.94)',
      '--fg-0': '#14171a',
      '--fg-1': '#3d444c',
      '--fg-2': '#6a737d',
      '--fg-muted': '#57606a',
      '--border-hairline': 'rgba(20, 23, 26, 0.14)',
      '--border-subtle': 'rgba(20, 23, 26, 0.24)',
      '--border-focus': '#0b5cab',
      '--accent-primary': '#0b5cab',
      '--accent-secondary': '#b45309',
      '--accent-Positive': '#15803d',
      '--accent-danger': '#be123c',
      '--accent-block': '#c2410c',
      '--accent-combo': '#6d28d9',
      '--accent-fake': '#a21caf',
    },
    canvas: {
      fieldBgPrimary: '#f8f5ee',
      fieldBgAlt: '#f0ebe0',
      fieldApronBg: '#e4ded0',
      fieldVignette: 'rgba(20, 22, 24, 0.05)',
      yardLineMajor: 'rgba(20, 23, 26, 0.30)',
      yardLineMinor: 'rgba(20, 23, 26, 0.11)',
      yardNumberColor: 'rgba(20, 23, 26, 0.14)',
      hashMarkColor: 'rgba(20, 23, 26, 0.36)',
      losColor: '#0b5cab',
      firstDownColor: '#c2410c',
      pocketPolyFill: 'rgba(11, 92, 171, 0.09)',
      pocketPolyStroke: 'rgba(11, 92, 171, 0.50)',
      offenseFill: '#ffffff',
      offenseStroke: '#0b5cab',
      offenseText: '#0f172a',
      blockerHighlight: '#c2410c',
      defenseFill: '#fef2f2',
      defenseStroke: '#be123c',
      defenseText: '#9f1239',
      defBadgeBg: 'rgba(255, 255, 255, 0.92)',
      ballColor: '#b45309',
      routeStroke: '#0b5cab',
      routeFakeStroke: '#a21caf',
      motionStroke: '#b45309',
      voidCorridorFill: 'rgba(21, 128, 61, 0.12)',
      voidCorridorStroke: 'rgba(21, 128, 61, 0.75)',
      haloStroke: 'rgba(248, 245, 238, 0.95)',
      blockPassSetStroke: '#57606a',
      blockManStroke: '#c2410c',
      blockComboStroke: '#6d28d9',
      blockPullStroke: '#15803d',
      blockChipStroke: '#b45309',
      forceVectorWin: '#15803d',
      forceVectorLoss: '#be123c',
      fontFamilyCanvas: '"JetBrains Mono", "Cascadia Mono", Consolas, monospace',
      pixelSnap: false,
      scanlines: false,
    },
  },
};

export class ThemeManager {
  private currentSkin: UIThemeDefinition = BUILTIN_THEMES['broadcast-analytics'];
  private listeners: Array<(theme: UIThemeDefinition) => void> = [];

  public applySkin(id: SkinId | UIThemeDefinition): void {
    const theme = typeof id === 'string' ? BUILTIN_THEMES[id] : id;
    if (!theme) return;
    this.currentSkin = theme;
    const root = document.documentElement;
    root.setAttribute('data-skin', theme.id);
    for (const [k, v] of Object.entries(theme.cssVars)) {
      root.style.setProperty(k, v);
    }
    this.listeners.forEach((cb) => cb(theme));
  }

  public getTheme(): UIThemeDefinition {
    return this.currentSkin;
  }

  public onChange(cb: (theme: UIThemeDefinition) => void): void {
    this.listeners.push(cb);
  }
}
