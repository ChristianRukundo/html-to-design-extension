export declare function parseFontWeight(value: string | null | undefined): number;
export declare function isItalic(value: string | null | undefined): boolean;
/**
 * Work out which family in a font stack actually rendered the given text.
 *
 * The computed `font-family` is the whole stack, and only the browser knows
 * which entry won. `document.fonts.check` asks it directly, per family, which
 * is far more accurate than assuming the first entry — a page listing
 * `"Custom Font", Arial, sans-serif` where the webfont failed to load would
 * otherwise be captured with the wrong family everywhere.
 */
export declare function resolveFamily(stack: string | null | undefined, weight: number, italic: boolean, size: number, sample: string): string;
//# sourceMappingURL=font.d.ts.map