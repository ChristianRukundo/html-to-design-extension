import type { Rgba } from '@h2f/schema';
export declare const TRANSPARENT: Rgba;
/**
 * Parse a CSS color into straight RGBA.
 *
 * `getComputedStyle` already serializes almost everything to `rgb()` /
 * `rgba()`, so the fast path handles the overwhelming majority. Newer colour
 * spaces (`oklch`, `lab`, `color(display-p3 …)`) are serialized as-is by
 * Chromium, so those fall through to `normalizeViaCanvas`, which lets the
 * browser do the conversion for us rather than reimplementing four colour
 * spaces by hand.
 */
export declare function parseColor(input: string | null | undefined): Rgba;
export declare function isTransparent(color: Rgba): boolean;
export declare function clamp01(n: number): number;
//# sourceMappingURL=color.d.ts.map