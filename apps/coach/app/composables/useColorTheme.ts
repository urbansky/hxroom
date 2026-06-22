export interface ColorThemeVariant {
  id: string
  label: string
  description: string
  light: {
    sidebarBg: string
    bg: string
    bgMuted: string
    bgElevated: string
    bgAccented: string
    border: string
    borderMuted: string
    borderAccented: string
  }
  dark: {
    sidebarBg: string
    bg: string
    bgMuted: string
    bgElevated: string
    bgAccented: string
    border: string
    borderMuted: string
    borderAccented: string
  }
}

export const COLOR_THEMES: ColorThemeVariant[] = [
  {
    id: 'warm-cream',
    label: 'Warm Cream',
    description: 'Sanftes Beige mit organischer Wärme',
    light: {
      sidebarBg: '#ede9e0',
      bg: '#faf8f4',
      bgMuted: '#f2efe8',
      bgElevated: '#eae6de',
      bgAccented: '#e2ddd4',
      border: 'rgba(0,0,0,0.08)',
      borderMuted: 'rgba(0,0,0,0.05)',
      borderAccented: 'rgba(0,0,0,0.12)',
    },
    dark: {
      sidebarBg: '#0f130f',
      bg: '#141814',
      bgMuted: '#1A1E1A',
      bgElevated: '#1E231E',
      bgAccented: '#232823',
      border: 'rgba(255,255,255,0.06)',
      borderMuted: 'rgba(255,255,255,0.04)',
      borderAccented: 'rgba(255,255,255,0.10)',
    },
  },
  {
    id: 'warm-cream-2',
    label: 'Warm Cream 2',
    description: 'Wie Warm Cream, aber Karten sind weiß',
    light: {
      sidebarBg: '#ede9e0',
      bg: '#faf8f4',
      bgMuted: '#f2efe8',
      bgElevated: '#ffffff',
      bgAccented: '#f5f5f5',
      border: 'rgba(0,0,0,0.08)',
      borderMuted: 'rgba(0,0,0,0.05)',
      borderAccented: 'rgba(0,0,0,0.12)',
    },
    dark: {
      sidebarBg: '#0f130f',
      bg: '#141814',
      bgMuted: '#1A1E1A',
      bgElevated: '#242924',
      bgAccented: '#2c322c',
      border: 'rgba(255,255,255,0.06)',
      borderMuted: 'rgba(255,255,255,0.04)',
      borderAccented: 'rgba(255,255,255,0.10)',
    },
  },
  {
    id: 'warm-cream-3',
    label: 'Warm Cream 3',
    description: 'Cream-Sidebar, weißer Content und weiße Karten',
    light: {
      sidebarBg: '#faf7f2',
      bg: '#ffffff',
      bgMuted: '#f7f7f7',
      bgElevated: '#ffffff',
      bgAccented: '#f0f0f0',
      border: 'rgba(0,0,0,0.08)',
      borderMuted: 'rgba(0,0,0,0.05)',
      borderAccented: 'rgba(0,0,0,0.12)',
    },
    dark: {
      sidebarBg: '#0f130f',
      bg: '#141814',
      bgMuted: '#1A1E1A',
      bgElevated: '#242924',
      bgAccented: '#2c322c',
      border: 'rgba(255,255,255,0.06)',
      borderMuted: 'rgba(255,255,255,0.04)',
      borderAccented: 'rgba(255,255,255,0.10)',
    },
  },
  {
    id: 'pure-white',
    label: 'Pure White',
    description: 'Klares Weiß, minimalistische Reinheit',
    light: {
      sidebarBg: '#e6e6e6',
      bg: '#ffffff',
      bgMuted: '#f7f7f7',
      bgElevated: '#f0f0f0',
      bgAccented: '#e8e8e8',
      border: 'rgba(0,0,0,0.08)',
      borderMuted: 'rgba(0,0,0,0.05)',
      borderAccented: 'rgba(0,0,0,0.12)',
    },
    dark: {
      sidebarBg: '#0a0a0a',
      bg: '#111111',
      bgMuted: '#181818',
      bgElevated: '#1f1f1f',
      bgAccented: '#272727',
      border: 'rgba(255,255,255,0.07)',
      borderMuted: 'rgba(255,255,255,0.04)',
      borderAccented: 'rgba(255,255,255,0.11)',
    },
  },
  {
    id: 'cool-slate',
    label: 'Cool Slate',
    description: 'Kühle Blau-Grau-Töne, sachlich und modern',
    light: {
      sidebarBg: '#c8d2e6',
      bg: '#f8f9fc',
      bgMuted: '#f0f2f8',
      bgElevated: '#e6eaf4',
      bgAccented: '#dde2ee',
      border: 'rgba(60,80,140,0.10)',
      borderMuted: 'rgba(60,80,140,0.06)',
      borderAccented: 'rgba(60,80,140,0.15)',
    },
    dark: {
      sidebarBg: '#0c0e18',
      bg: '#12141e',
      bgMuted: '#191c28',
      bgElevated: '#1f2333',
      bgAccented: '#262b3e',
      border: 'rgba(120,140,220,0.08)',
      borderMuted: 'rgba(120,140,220,0.05)',
      borderAccented: 'rgba(120,140,220,0.12)',
    },
  },
  {
    id: 'warm-stone',
    label: 'Warm Stone',
    description: 'Warmes Steingrau, klassisch und geerdet',
    light: {
      sidebarBg: '#d8d0c6',
      bg: '#faf9f7',
      bgMuted: '#f3f0eb',
      bgElevated: '#ebe6df',
      bgAccented: '#e3ddd5',
      border: 'rgba(80,60,30,0.09)',
      borderMuted: 'rgba(80,60,30,0.05)',
      borderAccented: 'rgba(80,60,30,0.13)',
    },
    dark: {
      sidebarBg: '#130f0c',
      bg: '#1a1714',
      bgMuted: '#211e1a',
      bgElevated: '#28241f',
      bgAccented: '#312c26',
      border: 'rgba(255,220,160,0.07)',
      borderMuted: 'rgba(255,220,160,0.04)',
      borderAccented: 'rgba(255,220,160,0.11)',
    },
  },
  {
    id: 'sage-mist',
    label: 'Sage Mist',
    description: 'Subtiler Grün-Schimmer passend zur Primary-Farbe',
    light: {
      sidebarBg: '#c4d4c4',
      bg: '#f6faf6',
      bgMuted: '#edf4ed',
      bgElevated: '#e2ece2',
      bgAccented: '#d7e5d7',
      border: 'rgba(40,90,40,0.09)',
      borderMuted: 'rgba(40,90,40,0.05)',
      borderAccented: 'rgba(40,90,40,0.13)',
    },
    dark: {
      sidebarBg: '#0c130c',
      bg: '#111a11',
      bgMuted: '#172017',
      bgElevated: '#1c271c',
      bgAccented: '#212e21',
      border: 'rgba(120,180,120,0.07)',
      borderMuted: 'rgba(120,180,120,0.04)',
      borderAccented: 'rgba(120,180,120,0.11)',
    },
  },
  {
    id: 'warm-rose',
    label: 'Warm Rose',
    description: 'Zartes Rosé, sanft und einladend',
    light: {
      sidebarBg: '#decccd',
      bg: '#fdf8f8',
      bgMuted: '#f5edee',
      bgElevated: '#ece1e2',
      bgAccented: '#e4d5d6',
      border: 'rgba(140,60,70,0.09)',
      borderMuted: 'rgba(140,60,70,0.05)',
      borderAccented: 'rgba(140,60,70,0.13)',
    },
    dark: {
      sidebarBg: '#130c0e',
      bg: '#1a1213',
      bgMuted: '#221819',
      bgElevated: '#2a1e20',
      bgAccented: '#332527',
      border: 'rgba(220,140,150,0.07)',
      borderMuted: 'rgba(220,140,150,0.04)',
      borderAccented: 'rgba(220,140,150,0.11)',
    },
  },
  {
    id: 'sage-white-cards',
    label: 'Sage & White',
    description: 'Grüner Hintergrund, weiße Karten – klarer Kontrast',
    light: {
      sidebarBg: '#b4c8b4',
      bg: '#e8ede8',
      bgMuted: '#dfe6df',
      bgElevated: '#ffffff',
      bgAccented: '#f5f5f5',
      border: 'rgba(40,90,40,0.10)',
      borderMuted: 'rgba(40,90,40,0.06)',
      borderAccented: 'rgba(40,90,40,0.15)',
    },
    dark: {
      sidebarBg: '#0d130d',
      bg: '#141a14',
      bgMuted: '#1a221a',
      bgElevated: '#242e24',
      bgAccented: '#2c382c',
      border: 'rgba(120,180,120,0.08)',
      borderMuted: 'rgba(120,180,120,0.05)',
      borderAccented: 'rgba(120,180,120,0.12)',
    },
  },
  {
    id: 'stone-white-cards',
    label: 'Stone & White',
    description: 'Warmer Stein-Hintergrund, weiße Karten',
    light: {
      sidebarBg: '#c6bdb2',
      bg: '#e9e5df',
      bgMuted: '#dfd9d2',
      bgElevated: '#ffffff',
      bgAccented: '#f5f5f5',
      border: 'rgba(80,60,30,0.11)',
      borderMuted: 'rgba(80,60,30,0.07)',
      borderAccented: 'rgba(80,60,30,0.16)',
    },
    dark: {
      sidebarBg: '#130f0a',
      bg: '#1c1814',
      bgMuted: '#241f1a',
      bgElevated: '#2e2820',
      bgAccented: '#38312a',
      border: 'rgba(200,180,140,0.08)',
      borderMuted: 'rgba(200,180,140,0.05)',
      borderAccented: 'rgba(200,180,140,0.12)',
    },
  },
  {
    id: 'slate-white-cards',
    label: 'Slate & White',
    description: 'Kühler Blau-Grau-Hintergrund, weiße Karten',
    light: {
      sidebarBg: '#b4c0d4',
      bg: '#dde2ee',
      bgMuted: '#d4dae8',
      bgElevated: '#ffffff',
      bgAccented: '#f5f5f5',
      border: 'rgba(60,80,140,0.12)',
      borderMuted: 'rgba(60,80,140,0.07)',
      borderAccented: 'rgba(60,80,140,0.17)',
    },
    dark: {
      sidebarBg: '#0c0e1a',
      bg: '#141620',
      bgMuted: '#1b1e2d',
      bgElevated: '#22263a',
      bgAccented: '#2a2f47',
      border: 'rgba(120,140,220,0.09)',
      borderMuted: 'rgba(120,140,220,0.05)',
      borderAccented: 'rgba(120,140,220,0.14)',
    },
  },
]

const STORAGE_KEY = 'hxroom-coach-color-theme'

export function useColorTheme() {
  const colorMode = useColorMode()

  const activeThemeId = useState<string>('colorThemeId', () => {
    if (import.meta.client) {
      return localStorage.getItem(STORAGE_KEY) ?? 'warm-cream'
    }
    return 'warm-cream'
  })

  const activeTheme = computed(
    () => COLOR_THEMES.find(t => t.id === activeThemeId.value) ?? COLOR_THEMES[0]!,
  )

  function applyTheme(theme: ColorThemeVariant) {
    if (!import.meta.client) return
    const isDark = colorMode.value === 'dark'
    const vars = isDark ? theme.dark : theme.light
    const root = document.documentElement

    root.style.setProperty('--ui-sidebar-bg', vars.sidebarBg)
    root.style.setProperty('--ui-bg', vars.bg)
    root.style.setProperty('--ui-bg-muted', vars.bgMuted)
    root.style.setProperty('--ui-bg-elevated', vars.bgElevated)
    root.style.setProperty('--ui-bg-accented', vars.bgAccented)
    root.style.setProperty('--ui-border', vars.border)
    root.style.setProperty('--ui-border-muted', vars.borderMuted)
    root.style.setProperty('--ui-border-accented', vars.borderAccented)
  }

  function selectTheme(themeId: string) {
    activeThemeId.value = themeId
    localStorage.setItem(STORAGE_KEY, themeId)
    const theme = COLOR_THEMES.find(t => t.id === themeId) ?? COLOR_THEMES[0]!
    applyTheme(theme)
  }

  function initTheme() {
    if (!import.meta.client) return
    const saved = localStorage.getItem(STORAGE_KEY) ?? 'warm-cream'
    activeThemeId.value = saved
    const theme = COLOR_THEMES.find(t => t.id === saved) ?? COLOR_THEMES[0]!
    applyTheme(theme)
  }

  // Re-apply when color mode changes
  watch(
    () => colorMode.value,
    () => applyTheme(activeTheme.value),
  )

  return {
    themes: COLOR_THEMES,
    activeThemeId,
    activeTheme,
    selectTheme,
    initTheme,
  }
}
