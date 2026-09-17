/** Pure value mappings for text properties. */
export function toLineHeight(lineHeight) {
    if (lineHeight === null || lineHeight <= 0)
        return { unit: 'AUTO' };
    return { value: lineHeight, unit: 'PIXELS' };
}
export function toLetterSpacing(letterSpacing) {
    return { value: letterSpacing, unit: 'PIXELS' };
}
export function resolveStyle(style, fontName) {
    return {
        fontName,
        // Figma rejects a font size below 1; CSS happily renders 0.
        fontSize: Math.max(1, style.size),
        lineHeight: toLineHeight(style.lineHeight),
        letterSpacing: toLetterSpacing(style.letterSpacing),
        textDecoration: style.decoration,
        textCase: style.textCase,
    };
}
/**
 * Merge a segment's partial style over the node's base style.
 *
 * Segments only carry the properties that differ, which keeps capture files
 * small but means the base has to be filled back in before the values can be
 * used.
 */
export function mergeStyle(base, partial) {
    return {
        family: partial.family ?? base.family,
        weight: partial.weight ?? base.weight,
        italic: partial.italic ?? base.italic,
        size: partial.size ?? base.size,
        lineHeight: partial.lineHeight !== undefined ? partial.lineHeight : base.lineHeight,
        letterSpacing: partial.letterSpacing ?? base.letterSpacing,
        fills: partial.fills ?? base.fills,
        decoration: partial.decoration ?? base.decoration,
        textCase: partial.textCase ?? base.textCase,
    };
}
//# sourceMappingURL=text.js.map