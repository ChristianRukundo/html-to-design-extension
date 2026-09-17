import type { FontUsage, RootNode, Warning } from '@h2f/schema';
import { AssetRegistry } from './assets.js';
export interface WalkOptions {
    /** Infer auto-layout, or emit everything absolutely positioned. */
    autoLayout: boolean;
    /** Hard ceiling so a pathological page cannot hang the capture. */
    maxNodes: number;
    maxDepth: number;
}
export declare const DEFAULT_WALK_OPTIONS: WalkOptions;
/** Marks elements the host has to screenshot; read back by the CLI. */
export declare const RASTER_ATTRIBUTE = "data-h2f-raster";
export declare class Walker {
    private readonly options;
    readonly assets: AssetRegistry;
    readonly warnings: Warning[];
    private readonly fonts;
    private nodeCount;
    private idCounter;
    constructor(options: WalkOptions);
    fontList(): FontUsage[];
    /**
     * Build the root frame for the current document.
     *
     * The root takes its background from `<html>`/`<body>` — CSS propagates the
     * body background to the canvas, so reading it off `<body>` alone would leave
     * the page transparent in Figma for a large share of real sites.
     */
    walkRoot(viewportWidth: number): RootNode;
    private walkElement;
    private measure;
    /**
     * Decide whether an element has to be flattened to a bitmap.
     *
     * This is the escape hatch that keeps the rest of the converter honest: CSS
     * that genuinely has no Figma equivalent produces a correct-looking image
     * rather than a silently wrong vector.
     */
    private rasterReason;
    private rasterNode;
    private specialElement;
    /**
     * Form controls hold their content in `value`, not in text nodes, so the
     * generic walk captures them as empty boxes. The value (or placeholder)
     * becomes a text child; controls the browser paints natively (checkbox,
     * radio, range, color, file) are screenshotted instead, because their look
     * exists nowhere in CSS.
     */
    private formControlNode;
    private imageNode;
    private svgNode;
    private canvasNode;
    private makeImageNode;
    /**
     * Build a text layer, wrapping it in a frame when the element is padded.
     *
     * Figma text nodes have no padding. A button styled with
     * `padding: 10px 20px` and a background therefore cannot be one text layer:
     * the glyphs would sit flush against the corner of the coloured box. When
     * there is padding *and* something painted, the element becomes a frame whose
     * auto-layout padding reproduces the inset — which is also what a designer
     * would have drawn by hand. With padding but nothing painted, insetting the
     * text layer to the content box is enough.
     */
    private textNode;
    /** Auto-layout carrying the padding, unless auto-layout is disabled. */
    private paddedWrapperLayout;
    private elementNode;
    /**
     * A bare text node inside a mixed-content element, measured through a Range
     * — text nodes have no box of their own. Styling is inherited, so the
     * parent's computed style is the text's style.
     */
    private looseTextNode;
    /**
     * Reconstruct `::before` and `::after`.
     *
     * These have no DOM node, so no rect can be measured for them — the geometry
     * here is derived from their computed size and the parent's padding box. It
     * is good enough for the overwhelmingly common cases (icon chips, decorative
     * bars, overlay scrims) and every one is flagged as approximate.
     */
    private pseudoNodes;
    private recordFont;
    private warn;
    private nextId;
}
//# sourceMappingURL=walk.d.ts.map