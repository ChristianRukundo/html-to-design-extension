import type { TextAlign, TextSegment, TextStyle, TextVerticalAlign } from '@h2f/schema';
/** Read the typographic properties of an element into an IR text style. */
export declare function readTextStyle(style: CSSStyleDeclaration, sample: string): TextStyle;
export declare function readTextAlign(style: CSSStyleDeclaration): TextAlign;
export declare function readVerticalAlign(style: CSSStyleDeclaration): TextVerticalAlign;
export declare function readMaxLines(style: CSSStyleDeclaration): number | null;
export interface TextContent {
    characters: string;
    segments: TextSegment[];
}
/**
 * Flatten an element's inline content into a single string plus the style runs
 * that differ from the element's own style.
 *
 * This is what lets `<p>plain <a>link</a> more</p>` become one editable Figma
 * text layer with a styled range, rather than three layers the user has to
 * reassemble by hand.
 */
export declare function extractText(element: Element, baseStyle: TextStyle): TextContent | null;
//# sourceMappingURL=text.d.ts.map