export type SkinId =
  | 'all22-pro'
  | 'coach-chalkboard'
  | 'broadcast-analytics'
  | 'retro-16bit'
  | 'paper-playbook';

export interface CanvasSkinTokens {
  fieldBgPrimary: string;
  fieldBgAlt: string;
  yardLineMajor: string;
  yardLineMinor: string;
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
  ballColor: string;
  routeStroke: string;
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
  'all22-pro': {
    id: 'all22-pro',
    label: 'ALL-22 TELEMETRY PRO',
    cssVars: {
      '--bg-0': '#080a0d',
      '--bg-1': '#0e1217',
      '--bg-2': '#151b22',
      '--bg-3': '#1d2530',
      '--fg-0': '#e6edf3',
      '--fg-1': '#9da7b3',
      '--fg-2': '#636e7b',
      '--border-hairline': '#212832',
      '--accent-primary': '#2f81f7',
      '--accent-secondary': '#d29922',
      '--accent-Positive': '#3fb950',
      '--accent-danger': '#f85149',
      '--accent-block': '#f0883e',
      '--accent-combo': '#a371f7',
    },
    canvas: {
      fieldBgPrimary: '#0b0f14',
      fieldBgAlt: '#0d1218',
      yardLineMajor: 'rgba(157, 167, 179, 0.22)',
      yardLineMinor: 'rgba(157, 167, 179, 0.08)',
      hashMarkColor: 'rgba(157, 167, 179, 0.28)',
      losColor: '#2f81f7',
      firstDownColor: '#d29922',
      pocketPolyFill: 'rgba(47, 129, 247, 0.09)',
      pocketPolyStroke: 'rgba(47, 129, 247, 0.45)',
      offenseFill: '#111820',
      offenseStroke: '#58a6ff',
      offenseText: '#e6edf3',
      blockerHighlight: '#f0883e',
      defenseFill: '#1a0f12',
      defenseStroke: '#f85149',
      defenseText: '#ffdcd7',
      ballColor: '#d29922',
      routeStroke: '#58a6ff',
      blockPassSetStroke: '#8b949e',
      blockManStroke: '#f0883e',
      blockComboStroke: '#a371f7',
      blockPullStroke: '#3fb950',
      blockChipStroke: '#d29922',
      forceVectorWin: '#3fb950',
      forceVectorLoss: '#f85149',
      fontFamilyCanvas: '"JetBrains Mono", monospace',
      pixelSnap: false,
      scanlines: false,
    },
  },

  'coach-chalkboard': {
    id: 'coach-chalkboard',
    label: 'BELICHICK CHALKBOARD',
    cssVars: {
      '--bg-0': '#0d1612',
      '--bg-1': '#121f19',
      '--bg-2': '#182921',
      '--bg-3': '#20362c',
      '--fg-0': '#f2efe9',
      '--fg-1': '#b8c4bc',
      '--fg-2': '#798c80',
      '--border-hairline': '#294035',
      '--accent-primary': '#e3b341',
      '--accent-secondary': '#f2efe9',
      '--accent-Positive': '#7ee787',
      '--accent-danger': '#ffa198',
      '--accent-block': '#f2cc60',
      '--accent-combo': '#d2a8ff',
    },
    canvas: {
      fieldBgPrimary: '#111d17',
      fieldBgAlt: '#13211a',
      yardLineMajor: 'rgba(242, 239, 233, 0.25)',
      yardLineMinor: 'rgba(242, 239, 233, 0.10)',
      hashMarkColor: 'rgba(242, 239, 233, 0.30)',
      losColor: 'rgba(242, 239, 233, 0.70)',
      firstDownColor: '#f2cc60',
      pocketPolyFill: 'rgba(242, 239, 233, 0.06)',
      pocketPolyStroke: 'rgba(242, 239, 233, 0.35)',
      offenseFill: '#111d17',
      offenseStroke: '#f2efe9',
      offenseText: '#f2efe9',
      blockerHighlight: '#f2cc60',
      defenseFill: '#111d17',
      defenseStroke: '#ffa198',
      defenseText: '#ffa198',
      ballColor: '#f2cc60',
      routeStroke: '#f2efe9',
      blockPassSetStroke: '#b8c4bc',
      blockManStroke: '#f2cc60',
      blockComboStroke: '#d2a8ff',
      blockPullStroke: '#7ee787',
      blockChipStroke: '#ffa198',
      forceVectorWin: '#7ee787',
      forceVectorLoss: '#ffa198',
      fontFamilyCanvas: '"JetBrains Mono", monospace',
      pixelSnap: false,
      scanlines: false,
    },
  },

  'broadcast-analytics': {
    id: 'broadcast-analytics',
    label: 'NEXT-GEN BROADCAST',
    cssVars: {
      '--bg-0': '#07110b',
      '--bg-1': '#0b1810',
      '--bg-2': '#112419',
      '--bg-3': '#183323',
      '--fg-0': '#f0f6fc',
      '--fg-1': '#9ecbff',
      '--fg-2': '#587a65',
      '--border-hairline': '#1d3b29',
      '--accent-primary': '#00d4ff',
      '--accent-secondary': '#ffcc00',
      '--accent-Positive': '#00ff88',
      '--accent-danger': '#ff3366',
      '--accent-block': '#ff9900',
      '--accent-combo': '#c084fc',
    },
    canvas: {
      fieldBgPrimary: '#0e2918',
      fieldBgAlt: '#11301d',
      yardLineMajor: 'rgba(255, 255, 255, 0.35)',
      yardLineMinor: 'rgba(255, 255, 255, 0.14)',
      hashMarkColor: 'rgba(255, 255, 255, 0.42)',
      losColor: '#00d4ff',
      firstDownColor: '#ffcc00',
      pocketPolyFill: 'rgba(0, 212, 255, 0.14)',
      pocketPolyStroke: 'rgba(0, 212, 255, 0.65)',
      offenseFill: '#071726',
      offenseStroke: '#00d4ff',
      offenseText: '#ffffff',
      blockerHighlight: '#ffcc00',
      defenseFill: '#2b0912',
      defenseStroke: '#ff3366',
      defenseText: '#ffffff',
      ballColor: '#ffcc00',
      routeStroke: '#00d4ff',
      blockPassSetStroke: '#9ecbff',
      blockManStroke: '#ff9900',
      blockComboStroke: '#c084fc',
      blockPullStroke: '#00ff88',
      blockChipStroke: '#ffcc00',
      forceVectorWin: '#00ff88',
      forceVectorLoss: '#ff3366',
      fontFamilyCanvas: '"JetBrains Mono", monospace',
      pixelSnap: false,
      scanlines: false,
    },
  },

  'retro-16bit': {
    id: 'retro-16bit',
    label: '16-BIT CRT ARCADE',
    cssVars: {
      '--bg-0': '#000000',
      '--bg-1': '#101018',
      '--bg-2': '#1c1c2e',
      '--bg-3': '#282842',
      '--fg-0': '#fcfcfc',
      '--fg-1': '#a4e4fc',
      '--fg-2': '#7c7c9c',
      '--border-hairline': '#38385c',
      '--accent-primary': '#3cbcfc',
      '--accent-secondary': '#f8b800',
      '--accent-Positive': '#00e800',
      '--accent-danger': '#f83800',
      '--accent-block': '#fca044',
      '--accent-combo': '#d880fc',
    },
    canvas: {
      fieldBgPrimary: '#007800',
      fieldBgAlt: '#006800',
      yardLineMajor: '#fcfcfc',
      yardLineMinor: 'rgba(252, 252, 252, 0.45)',
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
      ballColor: '#fca044',
      routeStroke: '#fcfcfc',
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
      '--bg-0': '#e8e4db',
      '--bg-1': '#f4f1ea',
      '--bg-2': '#eae6dd',
      '--bg-3': '#dcd6c8',
      '--fg-0': '#141618',
      '--fg-1': '#3d4349',
      '--fg-2': '#6e7680',
      '--border-hairline': '#c6bfb0',
      '--accent-primary': '#0b5cab',
      '--accent-secondary': '#9e5400',
      '--accent-Positive': '#1a7f37',
      '--accent-danger': '#cf222e',
      '--accent-block': '#bc4c00',
      '--accent-combo': '#6639ba',
    },
    canvas: {
      fieldBgPrimary: '#f7f4ed',
      fieldBgAlt: '#f0ece1',
      yardLineMajor: 'rgba(20, 22, 24, 0.30)',
      yardLineMinor: 'rgba(20, 22, 24, 0.12)',
      hashMarkColor: 'rgba(20, 22, 24, 0.35)',
      losColor: '#0b5cab',
      firstDownColor: '#bc4c00',
      pocketPolyFill: 'rgba(11, 92, 171, 0.08)',
      pocketPolyStroke: 'rgba(11, 92, 171, 0.45)',
      offenseFill: '#ffffff',
      offenseStroke: '#141618',
      offenseText: '#141618',
      blockerHighlight: '#bc4c00',
      defenseFill: '#ebe7de',
      defenseStroke: '#cf222e',
      defenseText: '#cf222e',
      ballColor: '#9e5400',
      routeStroke: '#0b5cab',
      blockPassSetStroke: '#57606a',
      blockManStroke: '#bc4c00',
      blockComboStroke: '#6639ba',
      blockPullStroke: '#1a7f37',
      blockChipStroke: '#9e5400',
      forceVectorWin: '#1a7f37',
      forceVectorLoss: '#cf222e',
      fontFamilyCanvas: '"JetBrains Mono", monospace',
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
