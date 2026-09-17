/**
 * Minimal CSS value tokenizing helpers.
 *
 * Only what the gradient, shadow and background parsers need: splitting a value
 * list on separators that are not nested inside parentheses. Naive
 * `String.split(',')` corrupts every value that contains an `rgba(...)`, which
 * is most of them.
 */
/** Split on top-level occurrences of `sep`, ignoring anything inside `(...)`. */
export declare function splitTopLevel(value: string, sep?: string): string[];
/** Split on top-level whitespace runs, ignoring anything inside `(...)`. */
export declare function splitWhitespace(value: string): string[];
/** `foo(bar, baz)` → `{ name: 'foo', args: 'bar, baz' }`. */
export declare function parseFunction(value: string): {
    name: string;
    args: string;
} | null;
/** Convert any CSS angle unit to degrees. */
export declare function toDegrees(token: string): number | null;
/**
 * Resolve a CSS length or percentage to pixels.
 *
 * `getComputedStyle` resolves most lengths to px already; percentages survive
 * inside gradient and background-position values, which is why `reference` is
 * required.
 */
export declare function toPixels(token: string, reference: number): number | null;
export declare function isNumeric(token: string): boolean;
//# sourceMappingURL=css-values.d.ts.map