// WCAG 2.1 relative-luminance + contrast utilities.
//
// Crossover note: the intuitive "luminance > 0.5 → use dark text" threshold is
// WRONG for WCAG AA (4.5:1 contrast). The empirical crossover where #0B1220
// (TEXT_DARK) and #FFFFFF (TEXT_LIGHT) both meet AA against an arbitrary
// background is ~0.18. Above 0.18 → dark text reads better; below → light text.

function toRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '').trim();
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const int = Number.parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = toRgb(hex);
  const convert = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
}

export const TEXT_DARK = '#0B1220';
export const TEXT_LIGHT = '#FFFFFF';

export function readableOnColor(bgHex: string): typeof TEXT_DARK | typeof TEXT_LIGHT {
  return relativeLuminance(bgHex) > 0.18 ? TEXT_DARK : TEXT_LIGHT;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a) + 0.05;
  const lb = relativeLuminance(b) + 0.05;
  return Math.max(la, lb) / Math.min(la, lb);
}

// Convenience: `true` iff the pair meets WCAG AA for normal text (≥4.5:1).
export function meetsContrastAA(a: string, b: string): boolean {
  return contrastRatio(a, b) >= 4.5;
}
