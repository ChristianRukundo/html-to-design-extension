import type { TextStyle as IrTextStyle } from '@h2f/schema';
/** Pure value mappings for text properties. */
export declare function toLineHeight(lineHeight: number | null): LineHeight;
export declare function toLetterSpacing(letterSpacing: number): LetterSpacing;
/**
 * The style properties that apply to a whole node or a range, in the order they
 * must be applied.
 *
 * Order matters: `setRangeFontName` resets nothing, but changing the font after
 * a size or spacing has been set can reflow the layer, so the font always goes
 * first.
 */
export interface ResolvedTextStyle {
    fontName: FontName;
    fontSize: number;
    lineHeight: LineHeight;
    letterSpacing: LetterSpacing;
    textDecoration: TextDecoration;
    textCase: TextCase;
}
export declare function resolveStyle(style: IrTextStyle, fontName: FontName): ResolvedTextStyle;
/**
 * Merge a segment's partial style over the node's base style.
 *
 * Segments only carry the properties that differ, which keeps capture files
 * small but means the base has to be filled back in before the values can be
 * used.
 */
export declare function mergeStyle(base: IrTextStyle, partial: Partial<IrTextStyle>): IrTextStyle;
//# sourceMappingURL=text.d.ts.map