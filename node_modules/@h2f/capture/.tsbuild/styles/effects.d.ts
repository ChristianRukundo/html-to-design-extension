import type { Effect, ShadowEffect } from '@h2f/schema';
export interface EffectResult {
    effects: Effect[];
    /** Filter functions with no Figma equivalent, e.g. `saturate`, `hue-rotate`. */
    unsupportedFilters: string[];
}
/**
 * Convert `box-shadow`, `filter` and `backdrop-filter` into IR effects.
 *
 * Figma applies effects in list order, same as CSS, so the order is preserved.
 * Filters that have no equivalent are reported rather than silently dropped —
 * the caller decides whether to rasterize the element or accept the loss.
 */
export declare function parseEffects(style: CSSStyleDeclaration): EffectResult;
export declare function parseBoxShadow(value: string | null | undefined): ShadowEffect[];
//# sourceMappingURL=effects.d.ts.map