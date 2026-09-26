// Church Dynamic Theme & Brand Accent Utility
// Maps selected church brand accent colors to Tailwind CSS variables so the entire app
// immediately reflects the selected theme palette across all components, buttons, badges, and icons.
// Also manages dynamic Light Mode, Dark Mode, and System Theme switching.

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemePalette {
  hex: string;
  name: string;
  shades: Record<string, string>;
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  '#f59e0b': {
    hex: '#f59e0b',
    name: 'Amber Gold',
    shades: {
      '50': 'oklch(98.7% 0.022 95.277)',
      '100': 'oklch(96.2% 0.059 95.617)',
      '200': 'oklch(92.4% 0.12 95.746)',
      '300': 'oklch(87.9% 0.169 91.605)',
      '400': 'oklch(82.8% 0.189 84.429)',
      '500': 'oklch(76.9% 0.188 70.08)',
      '600': 'oklch(66.6% 0.179 58.318)',
      '700': 'oklch(55.5% 0.163 48.998)',
      '800': 'oklch(47.3% 0.137 46.201)',
      '900': 'oklch(41.4% 0.112 45.904)',
      '950': 'oklch(27.9% 0.077 45.635)',
    },
  },
  '#10b981': {
    hex: '#10b981',
    name: 'Emerald Green',
    shades: {
      '50': 'oklch(97.9% 0.021 166.113)',
      '100': 'oklch(95% 0.052 163.051)',
      '200': 'oklch(90.5% 0.093 164.15)',
      '300': 'oklch(84.5% 0.143 164.978)',
      '400': 'oklch(76.5% 0.177 163.223)',
      '500': 'oklch(69.6% 0.17 162.48)',
      '600': 'oklch(59.6% 0.145 163.225)',
      '700': 'oklch(50.8% 0.118 165.612)',
      '800': 'oklch(43.2% 0.095 166.913)',
      '900': 'oklch(37.8% 0.077 168.94)',
      '950': 'oklch(26.2% 0.051 172.552)',
    },
  },
  '#0284c7': {
    hex: '#0284c7',
    name: 'Sky Blue',
    shades: {
      '50': 'oklch(97.7% 0.013 236.62)',
      '100': 'oklch(95.1% 0.026 236.824)',
      '200': 'oklch(90.1% 0.058 230.902)',
      '300': 'oklch(82.8% 0.111 230.318)',
      '400': 'oklch(74.6% 0.16 232.661)',
      '500': 'oklch(68.5% 0.169 237.323)',
      '600': 'oklch(58.8% 0.158 241.966)',
      '700': 'oklch(50% 0.134 242.749)',
      '800': 'oklch(44.3% 0.11 240.79)',
      '900': 'oklch(39.1% 0.09 240.876)',
      '950': 'oklch(29.3% 0.066 243.157)',
    },
  },
  '#6366f1': {
    hex: '#6366f1',
    name: 'Indigo Royal',
    shades: {
      '50': 'oklch(96.2% 0.018 272.314)',
      '100': 'oklch(93% 0.034 272.788)',
      '200': 'oklch(87% 0.065 274.039)',
      '300': 'oklch(78.5% 0.115 274.713)',
      '400': 'oklch(67.3% 0.182 276.935)',
      '500': 'oklch(58.5% 0.233 277.117)',
      '600': 'oklch(51.1% 0.262 276.966)',
      '700': 'oklch(45.7% 0.24 277.023)',
      '800': 'oklch(39.8% 0.195 277.366)',
      '900': 'oklch(35.9% 0.144 278.697)',
      '950': 'oklch(25.7% 0.09 281.288)',
    },
  },
  '#8b5cf6': {
    hex: '#8b5cf6',
    name: 'Purple Spirit',
    shades: {
      '50': 'oklch(97.7% 0.014 308.299)',
      '100': 'oklch(94.6% 0.033 307.174)',
      '200': 'oklch(90.2% 0.063 306.703)',
      '300': 'oklch(82.7% 0.119 306.383)',
      '400': 'oklch(71.4% 0.203 305.504)',
      '500': 'oklch(62.7% 0.265 303.9)',
      '600': 'oklch(55.8% 0.288 302.321)',
      '700': 'oklch(49.6% 0.265 301.924)',
      '800': 'oklch(43.8% 0.218 303.724)',
      '900': 'oklch(38.1% 0.176 304.987)',
      '950': 'oklch(29.1% 0.149 302.717)',
    },
  },
  '#f43f5e': {
    hex: '#f43f5e',
    name: 'Rose Red',
    shades: {
      '50': 'oklch(96.9% 0.015 12.422)',
      '100': 'oklch(94.1% 0.03 12.58)',
      '200': 'oklch(89.2% 0.058 10.001)',
      '300': 'oklch(81% 0.117 11.638)',
      '400': 'oklch(71.2% 0.194 13.428)',
      '500': 'oklch(64.5% 0.246 16.439)',
      '600': 'oklch(58.6% 0.253 17.585)',
      '700': 'oklch(51.4% 0.222 16.935)',
      '800': 'oklch(45.5% 0.188 13.697)',
      '900': 'oklch(41% 0.159 10.272)',
      '950': 'oklch(27.1% 0.105 12.094)',
    },
  },
  '#0d9488': {
    hex: '#0d9488',
    name: 'Teal Grace',
    shades: {
      '50': 'oklch(98.4% 0.014 180.72)',
      '100': 'oklch(95.3% 0.051 180.801)',
      '200': 'oklch(91% 0.096 180.426)',
      '300': 'oklch(85.5% 0.138 181.071)',
      '400': 'oklch(77.7% 0.152 181.912)',
      '500': 'oklch(70.4% 0.14 182.503)',
      '600': 'oklch(60% 0.118 184.704)',
      '700': 'oklch(51.1% 0.096 186.391)',
      '800': 'oklch(43.7% 0.078 188.216)',
      '900': 'oklch(38.6% 0.063 188.416)',
      '950': 'oklch(27.7% 0.046 192.524)',
    },
  },
  '#475569': {
    hex: '#475569',
    name: 'Slate Gray',
    shades: {
      '50': 'oklch(98.4% 0.003 247.858)',
      '100': 'oklch(96.8% 0.007 247.896)',
      '200': 'oklch(92.9% 0.013 255.508)',
      '300': 'oklch(86.9% 0.022 252.894)',
      '400': 'oklch(70.4% 0.04 256.788)',
      '500': 'oklch(55.4% 0.046 257.417)',
      '600': 'oklch(44.6% 0.043 257.281)',
      '700': 'oklch(37.2% 0.044 257.287)',
      '800': 'oklch(27.9% 0.041 260.031)',
      '900': 'oklch(20.8% 0.042 265.755)',
      '950': 'oklch(12.9% 0.042 264.695)',
    },
  },
};

const STYLE_TAG_ID = 'church-theme-brand-accent-style';
const THEME_MODE_STORAGE_KEY = 'cms_theme_mode_preference';

let systemMediaListener: ((e: MediaQueryListEvent) => void) | null = null;
let systemMediaQuery: MediaQueryList | null = null;

/**
 * Returns the stored theme mode ('light', 'dark', or 'system'). Defaults to 'dark'.
 */
export const getStoredThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (err) {
    console.warn('Could not read theme mode from localStorage:', err);
  }
  return 'dark';
};

/**
 * Returns the explicitly stored theme mode preference from localStorage,
 * or null if no preference has been saved on this device yet.
 */
export const getStoredThemePreference = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored as ThemeMode;
    }
  } catch (err) {
    console.warn('Could not read theme mode from localStorage:', err);
  }
  return null;
};

/**
 * Resolves whether the mode actually renders as 'dark' or 'light'.
 */
export const getResolvedTheme = (mode: ThemeMode): 'dark' | 'light' => {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return mode;
};

/**
 * Applies the specified theme mode ('light' | 'dark' | 'system') to document.documentElement.
 */
export const applyThemeMode = (mode: ThemeMode = 'dark'): 'dark' | 'light' => {
  if (typeof document === 'undefined') return 'dark';

  const resolved = getResolvedTheme(mode);
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;

  // Persist preference
  try {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch (err) {
    console.warn('Could not save theme mode to localStorage:', err);
  }

  // Handle OS dynamic changes when in 'system' mode
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (!systemMediaQuery) {
      systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    }

    if (systemMediaListener && systemMediaQuery) {
      systemMediaQuery.removeEventListener('change', systemMediaListener);
      systemMediaListener = null;
    }

    if (mode === 'system' && systemMediaQuery) {
      systemMediaListener = (e: MediaQueryListEvent) => {
        const newResolved = e.matches ? 'dark' : 'light';
        if (newResolved === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.remove('dark');
          root.classList.add('light');
        }
        root.setAttribute('data-theme', newResolved);
        root.style.colorScheme = newResolved;
      };
      systemMediaQuery.addEventListener('change', systemMediaListener);
    }
  }

  return resolved;
};

/**
 * Toggles between light and dark modes and applies immediately.
 */
export const toggleThemeMode = (): ThemeMode => {
  const current = getStoredThemeMode();
  const currentResolved = getResolvedTheme(current);
  const nextMode: ThemeMode = currentResolved === 'dark' ? 'light' : 'dark';
  applyThemeMode(nextMode);
  return nextMode;
};

/**
 * Dynamically applies the chosen church accent color across the whole DOM
 * by overriding Tailwind v4's CSS variables on :root.
 */
export const applyChurchAccentTheme = (hexOrKey?: string): void => {
  if (typeof document === 'undefined') return;

  const hex = (hexOrKey || '#f59e0b').toLowerCase();
  let styleEl = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;

  // If default Amber Gold, remove the override style element to return to native theme
  if (hex === '#f59e0b') {
    if (styleEl) {
      styleEl.remove();
    }
    document.documentElement.style.removeProperty('--brand-accent');
    return;
  }

  const palette = THEME_PALETTES[hex];

  let cssRules = '';
  if (palette) {
    const shadeEntries = Object.entries(palette.shades)
      .map(([shade, val]) => `  --color-amber-${shade}: ${val} !important;`)
      .join('\n');

    cssRules = `
:root {
${shadeEntries}
  --brand-accent: ${palette.hex} !important;
  --brand-accent-glow: ${palette.hex}40 !important;
}
`;
  } else {
    // Custom hex fallback
    cssRules = `
:root {
  --color-amber-500: ${hex} !important;
  --color-amber-400: ${hex} !important;
  --color-amber-600: ${hex} !important;
  --brand-accent: ${hex} !important;
  --brand-accent-glow: ${hex}40 !important;
}
`;
  }

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_TAG_ID;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = cssRules;
  document.documentElement.style.setProperty('--brand-accent', hex);
};
