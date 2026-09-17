import type { FontUsage } from '@h2f/schema';
/**
 * Web fonts → Figma fonts.
 *
 * Figma addresses a font by family plus a *style name* ("SemiBold Italic"),
 * while CSS addresses it by a numeric weight and a style keyword. There is no
 * canonical mapping between the two, and foundries disagree on spelling
 * ("Semibold", "Semi Bold", "Demi Bold"), so this parses whatever style names
 * the running Figma instance reports and scores them.
 */
export interface ResolvedFont {
    fontName: FontName;
    /** True when the family itself had to be substituted. */
    substituted: boolean;
}
export declare class FontResolver {
    /** Lower-cased family name → the family name as Figma spells it. */
    private readonly families;
    /** Figma family name → its available styles. */
    private readonly styles;
    private readonly cache;
    private readonly fallback;
    constructor(available: FontName[]);
    resolve(usage: FontUsage): ResolvedFont;
    /** Every font this document will need, deduplicated, for preloading. */
    resolveAll(usages: FontUsage[]): {
        fonts: FontName[];
        missing: string[];
    };
    private pickStyle;
}
export declare function parseStyleName(style: string): {
    weight: number;
    italic: boolean;
};
//# sourceMappingURL=font.d.ts.map