import { colorTokens, cssVars, hex, palette } from './tokens';

describe('tokens', () => {
  it('defines every color token in both schemes', () => {
    for (const scheme of ['dark', 'light'] as const) {
      expect(Object.keys(palette[scheme]).sort()).toEqual([...colorTokens].sort());
    }
  });

  it('keeps text pairs at WCAG AA contrast', () => {
    const lum = (rgb: readonly number[]) => {
      const [r, g, b] = rgb.map((c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: readonly number[], b: readonly number[]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const scheme of ['dark', 'light'] as const) {
      const p = palette[scheme];
      expect(ratio(p.foreground, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p['muted-foreground'], p.background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p['muted-foreground'], p['surface-raised'])).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p['on-primary'], p.primary)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p['primary-text'], p.background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p['destructive-text'], p['surface-raised'])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('formats hex and css variable values', () => {
    expect(hex('dark', 'primary')).toBe('#0071e3');
    expect(cssVars('light')['--color-surface']).toBe('255 255 255');
  });
});
