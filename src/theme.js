import { useEffect, useState } from 'react';

// Track colors, assigned to groups in order. Separate sets keep contrast
// readable on light and dark backgrounds.
const GROUP_PALETTES = {
  dark: ['#F0B454', '#5CC8D1', '#E68498', '#A493F2', '#86CF7F', '#EE9A62', '#7FB0F0', '#D9C35A'],
  light: ['#A8680E', '#127A85', '#B23E58', '#5B48C4', '#2D852A', '#B8561C', '#2A63B5', '#857308'],
};

function isDarkMode() {
  const forcedTheme = document.documentElement.dataset.theme;
  if (forcedTheme) return forcedTheme === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Canvas can't use CSS variables directly, so we read the current values
 * from the stylesheet. That keeps the canvas and the HTML on one palette.
 */
export function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name) => styles.getPropertyValue(name).trim();
  return {
    background: read('--color-background'),
    surface: read('--color-surface'),
    line: read('--color-line'),
    grid: read('--color-grid'),
    text: read('--color-text'),
    mutedText: read('--color-muted'),
    playhead: read('--color-playhead'),
    accent: read('--color-accent'),
    selection: read('--color-selection'),
    groupColors: isDarkMode() ? GROUP_PALETTES.dark : GROUP_PALETTES.light,
  };
}

/** Current theme colors, refreshed when the system or page theme changes. */
export function useThemeColors() {
  const [colors, setColors] = useState(readThemeColors);

  useEffect(() => {
    const refresh = () => setColors(readThemeColors());
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', refresh);
    const themeAttributeObserver = new MutationObserver(refresh);
    themeAttributeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      darkModeQuery.removeEventListener('change', refresh);
      themeAttributeObserver.disconnect();
    };
  }, []);

  return colors;
}

export const colorForGroup = (colors, groupIndex) => colors.groupColors[groupIndex % colors.groupColors.length];
