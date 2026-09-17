import { AssetRegistry, resolveUrl } from './assets.js';
import { inferLayout } from './layout.js';
import { nameFor } from './naming.js';
import { parseBackground } from './styles/background.js';
import { parseBorder, parseCorners } from './styles/border.js';
import { toPixels } from './styles/css-values.js';
import { parseEffects } from './styles/effects.js';
import { isItalic, parseFontWeight } from './styles/font.js';
import { analyzeTransform } from './styles/transform.js';
import { extractText, readMaxLines, readTextAlign, readTextStyle, readVerticalAlign, } from './text.js';
import { parseColor, isTransparent } from './styles/color.js';
export const DEFAULT_WALK_OPTIONS = {
    autoLayout: true,
    maxNodes: 20000,
    maxDepth: 64,
};
/** Marks elements the host has to screenshot; read back by the CLI. */
export const RASTER_ATTRIBUTE = 'data-h2f-raster';
/** Tags that never produce a visible box. */
const SKIPPED_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'LINK',
    'META',
    'HEAD',
    'TITLE',
    'NOSCRIPT',
    'TEMPLATE',
    'BASE',
    'PARAM',
    'SOURCE',
    'TRACK',
    'MAP',
    'AREA',
]);
const BLEND_MODES = {
    normal: 'NORMAL',
    multiply: 'MULTIPLY',
    screen: 'SCREEN',
    overlay: 'OVERLAY',
    darken: 'DARKEN',
    lighten: 'LIGHTEN',
    'color-dodge': 'COLOR_DODGE',
    'color-burn': 'COLOR_BURN',
    'hard-light': 'HARD_LIGHT',
    'soft-light': 'SOFT_LIGHT',
    difference: 'DIFFERENCE',
    exclusion: 'EXCLUSION',
    hue: 'HUE',
    saturation: 'SATURATION',
    color: 'COLOR',
    luminosity: 'LUMINOSITY',
};
const DEFAULT_SIZING = { horizontal: 'FIXED', vertical: 'FIXED' };
export class Walker {
    constructor(options) {
        this.options = options;
        this.assets = new AssetRegistry();
        this.warnings = [];
        this.fonts = new Map();
        this.nodeCount = 0;
        this.idCounter = 0;
    }
    fontList() {
        return [...this.fonts.values()];
    }
    /**
     * Build the root frame for the current document.
     *
     * The root takes its background from `<html>`/`<body>` — CSS propagates the
     * body background to the canvas, so reading it off `<body>` alone would leave
     * the page transparent in Figma for a large share of real sites.
     */
    walkRoot(viewportWidth) {
        const html = document.documentElement;
        const body = document.body;
        const width = Math.max(html.scrollWidth, viewportWidth);
        const height = Math.max(html.scrollHeight, body?.scrollHeight ?? 0, window.innerHeight, ...Array.from(document.querySelectorAll('*')).map((element) => {
            const rect = element.getBoundingClientRect();
            return rect.bottom + window.scrollY;
        }));
        const rootRect = { x: 0, y: 0, width, height };
        const htmlStyle = window.getComputedStyle(html);
        const bodyStyle = body ? window.getComputedStyle(body) : htmlStyle;
        const canvasSource = hasOwnBackground(htmlStyle) ? htmlStyle : bodyStyle;
        const background = parseBackground(canvasSource, { width, height }, this.assets);
        const children = [];
        if (body) {
            const node = this.walkElement(body, rootRect, 0);
            if (node)
                children.push(node);
        }
        return {
            kind: 'ROOT',
            id: this.nextId(),
            name: `${viewportWidth}px`,
            viewportWidth,
            rect: rootRect,
            opacity: 1,
            blendMode: 'NORMAL',
            rotation: 0,
            sizing: { ...DEFAULT_SIZING },
            fills: background.paints,
            stroke: null,
            corners: [0, 0, 0, 0],
            effects: [],
            clipsContent: true,
            layout: { mode: 'ABSOLUTE' },
            children,
        };
    }
    // -------------------------------------------------------------------------
    walkElement(element, parentRect, depth) {
        if (this.nodeCount >= this.options.maxNodes)
            return null;
        if (depth > this.options.maxDepth) {
            this.warn('depth.exceeded', `Stopped at depth ${depth}`, nameFor(element));
            return null;
        }
        if (SKIPPED_TAGS.has(element.tagName))
            return null;
        const style = window.getComputedStyle(element);
        if (style.display === 'none')
            return null;
        // `display: contents` boxes generate no geometry of their own; their
        // children participate in the parent's layout directly.
        if (style.display === 'contents')
            return null;
        const geometry = this.measure(element, style, parentRect);
        if (!geometry)
            return null;
        this.nodeCount++;
        const { rect, docRect, transform } = geometry;
        // A leaf with no size and nothing to paint is not worth a layer.
        if (rect.width < 0.5 && rect.height < 0.5 && element.childElementCount === 0)
            return null;
        // Screen-reader-only content ("Previous slide", icon labels) is visually
        // hidden in the browser but would come out as plain visible text in Figma,
        // overlapping whatever the sighted layout shows instead.
        if (isVisuallyHidden(element, style, rect))
            return null;
        const raster = this.rasterReason(element, style, transform);
        if (raster) {
            return this.rasterNode(element, style, rect, raster);
        }
        const special = this.specialElement(element, style, rect);
        if (special)
            return special;
        const text = this.textNode(element, style, rect);
        if (text)
            return text;
        return this.elementNode(element, style, rect, docRect, depth);
    }
    // -------------------------------------------------------------------------
    // Geometry
    // -------------------------------------------------------------------------
    measure(element, style, parentRect) {
        const box = element.getBoundingClientRect();
        if (!Number.isFinite(box.width) || !Number.isFinite(box.height))
            return null;
        const transform = analyzeTransform(style.transform);
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        let width = box.width;
        let height = box.height;
        let left = box.left + scrollX;
        let top = box.top + scrollY;
        if (transform.kind === 'ROTATE') {
            // `getBoundingClientRect` returns the axis-aligned bounds of the
            // *transformed* box, which is larger than the element for any rotation.
            // The layout size comes from `offsetWidth`/`offsetHeight`, which ignore
            // transforms, and the centre of the AABB is the image of the element's
            // centre under any affine map — so the two together recover the real box.
            const layoutWidth = element.offsetWidth || box.width;
            const layoutHeight = element.offsetHeight || box.height;
            width = layoutWidth * transform.scaleX;
            height = layoutHeight * transform.scaleY;
            left = box.left + scrollX + box.width / 2 - width / 2;
            top = box.top + scrollY + box.height / 2 - height / 2;
        }
        const docRect = { x: left, y: top, width, height };
        const rect = {
            x: round(left - parentRect.x),
            y: round(top - parentRect.y),
            width: round(Math.max(0, width)),
            height: round(Math.max(0, height)),
        };
        return { rect, docRect, transform };
    }
    // -------------------------------------------------------------------------
    // Rasterization
    // -------------------------------------------------------------------------
    /**
     * Decide whether an element has to be flattened to a bitmap.
     *
     * This is the escape hatch that keeps the rest of the converter honest: CSS
     * that genuinely has no Figma equivalent produces a correct-looking image
     * rather than a silently wrong vector.
     */
    rasterReason(element, style, transform) {
        if (transform.kind === 'UNSUPPORTED')
            return 'transform';
        // Rotation is representable, but only on a leaf: a rotated container's
        // descendants would all be measured in the rotated frame and come out
        // doubly transformed.
        if (transform.kind === 'ROTATE' && Math.abs(transform.rotation) > 0.01) {
            if (element.childElementCount > 0)
                return 'transform.rotatedContainer';
        }
        const mask = style.getPropertyValue('mask-image') || style.getPropertyValue('-webkit-mask-image');
        if (mask && mask !== 'none')
            return 'mask';
        if (style.clipPath && style.clipPath !== 'none')
            return 'clip-path';
        const { unsupportedFilters } = parseEffects(style);
        if (unsupportedFilters.length > 0)
            return `filter:${unsupportedFilters.join(',')}`;
        if (element.tagName === 'IFRAME' && !isSameOriginFrame(element)) {
            return 'iframe.crossOrigin';
        }
        return null;
    }
    rasterNode(element, style, rect, reason) {
        const id = this.nextId();
        // The host locates the element by this attribute to screenshot it.
        element.setAttribute(RASTER_ATTRIBUTE, id);
        this.warn(`rasterized.${reason.split(':')[0]}`, `Flattened to an image because of ${reason}`, nameFor(element));
        return {
            kind: 'ELEMENT',
            id,
            name: nameFor(element),
            rect,
            opacity: opacityOf(style),
            blendMode: blendModeOf(style),
            rotation: 0,
            sizing: { ...DEFAULT_SIZING },
            fills: [],
            stroke: null,
            corners: [0, 0, 0, 0],
            effects: [],
            clipsContent: false,
            layout: { mode: 'ABSOLUTE' },
            rasterize: this.assets.addRasterPlaceholder(id, Math.ceil(rect.width), Math.ceil(rect.height)),
            children: [],
        };
    }
    // -------------------------------------------------------------------------
    // Replaced elements
    // -------------------------------------------------------------------------
    specialElement(element, style, rect) {
        const tag = element.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            return this.formControlNode(element, style, rect);
        }
        if (tag === 'IMG') {
            return this.imageNode(element, style, rect);
        }
        if (tag === 'svg') {
            return this.svgNode(element, style, rect);
        }
        if (tag === 'CANVAS') {
            return this.canvasNode(element, style, rect);
        }
        if (tag === 'VIDEO') {
            const poster = element.poster;
            if (poster) {
                const ref = this.assets.addPending(poster, Math.ceil(rect.width), Math.ceil(rect.height));
                if (ref)
                    return this.makeImageNode(element, style, rect, ref, 'FILL', 'video poster');
            }
            this.warn('video.noPoster', 'Video has no poster frame; captured as an empty box', nameFor(element));
            return null;
        }
        return null;
    }
    /**
     * Form controls hold their content in `value`, not in text nodes, so the
     * generic walk captures them as empty boxes. The value (or placeholder)
     * becomes a text child; controls the browser paints natively (checkbox,
     * radio, range, color, file) are screenshotted instead, because their look
     * exists nowhere in CSS.
     */
    formControlNode(element, style, rect) {
        const tag = element.tagName;
        const type = (element.getAttribute('type') ?? 'text').toLowerCase();
        const NATIVE_WIDGETS = new Set(['checkbox', 'radio', 'range', 'color', 'file']);
        if (tag === 'INPUT' && NATIVE_WIDGETS.has(type)) {
            // `appearance: none` means the page styles it like any other element.
            const appearance = style.getPropertyValue('appearance') || style.getPropertyValue('-webkit-appearance');
            if (appearance !== 'none') {
                return this.rasterNode(element, style, rect, 'nativeControl');
            }
            return null;
        }
        let value = '';
        let placeholderStyle = null;
        if (tag === 'SELECT') {
            const select = element;
            value = select.options[select.selectedIndex]?.text ?? '';
        }
        else {
            const field = element;
            value = field.value ?? '';
            if (tag === 'INPUT' && type === 'password')
                value = '•'.repeat(value.length);
            if (value === '' && 'placeholder' in field && field.placeholder) {
                value = field.placeholder;
                try {
                    placeholderStyle = window.getComputedStyle(element, '::placeholder');
                }
                catch {
                    placeholderStyle = null;
                }
            }
        }
        value = value.replace(/\s+/g, tag === 'TEXTAREA' ? '$&' : ' ').trim();
        if (value === '')
            return null;
        const base = readTextStyle(style, value);
        if (placeholderStyle) {
            const color = parseColor(placeholderStyle.color);
            if (!isTransparent(color))
                base.fills = [{ kind: 'SOLID', color, opacity: 1 }];
        }
        this.recordFont(base.family, base.weight, base.italic);
        const { corners } = parseCorners(style, rect.width, rect.height);
        const { stroke } = parseBorder(style);
        const { effects } = parseEffects(style);
        const background = parseBackground(style, rect, this.assets);
        const inset = contentInset(style);
        const contentWidth = Math.max(0, round(rect.width - inset.left - inset.right));
        const contentHeight = Math.max(0, round(rect.height - inset.top - inset.bottom));
        const text = {
            kind: 'TEXT',
            id: this.nextId(),
            name: nameFor(element, value),
            rect: { x: round(inset.left), y: round(inset.top), width: contentWidth, height: contentHeight },
            opacity: 1,
            blendMode: 'NORMAL',
            rotation: 0,
            sizing: { ...DEFAULT_SIZING },
            characters: value,
            base,
            segments: [],
            align: readTextAlign(style),
            // Single-line controls centre their value vertically; multi-line ones
            // start at the top like the browser does.
            verticalAlign: tag === 'TEXTAREA' ? 'TOP' : 'CENTER',
            maxLines: tag === 'TEXTAREA' ? null : 1,
            fills: [],
            stroke: null,
            corners: [0, 0, 0, 0],
            effects: [],
        };
        return {
            kind: 'ELEMENT',
            id: this.nextId(),
            name: nameFor(element),
            rect,
            opacity: opacityOf(style),
            blendMode: blendModeOf(style),
            rotation: 0,
            sizing: { ...DEFAULT_SIZING },
            fills: visibilityOf(style) ? background.paints : [],
            stroke: visibilityOf(style) ? stroke : null,
            corners,
            effects,
            clipsContent: true,
            layout: this.paddedWrapperLayout(inset),
            children: [text],
        };
    }
    imageNode(element, style, rect) {
        // `currentSrc` is what the browser actually picked out of `srcset`, so the
        // capture inherits the correct responsive variant for the viewport.
        const src = element.currentSrc || element.src;
        if (!src)
            return null;
        const ref = this.assets.addPending(src, Math.max(element.naturalWidth, Math.ceil(rect.width)), Math.max(element.naturalHeight, Math.ceil(rect.height)));
        if (!ref)
            return null;
        return this.makeImageNode(element, style, rect, ref, objectFitToScaleMode(style.objectFit), element.alt);
    }
    svgNode(element, style, rect) {
        let markup;
        try {
            markup = serializeSvg(element, rect);
        }
        catch {
            return null;
        }
        return {
            kind: 'SVG',
            id: this.nextId(),
            name: nameFor(element),
            rect,
            opacity: opacityOf(style),
            blendMode: blendModeOf(style),
            rotation: 0,
            sizing: { ...DEFAULT_SIZING },
            asset: this.assets.addSvg(markup, Math.ceil(rect.width), Math.ceil(rect.height)),
        };
    }
    canvasNode(element, style, rect) {
        let dataUrl;
        try {
            // Throws for a canvas tainted by cross-origin drawing.
            dataUrl = element.toDataURL('image/png');
        }
        catch {
            this.warn('canvas.tainted', 'Canvas is cross-origin tainted and could not be read', nameFor(element));
            return null;
        }
        const ref = this.assets.addPending(dataUrl, element.width, element.height);
        if (!ref)
            return null;
        return this.makeImageNode(element, style, rect, ref, 'FILL', 'canvas');
    }
    makeImageNode(element, style, rect, asset, scaleMode, alt) {
        const { corners } = parseCorners(style, rect.width, rect.height);
        const { stroke } = parseBorder(style);
        const { effects } = parseEffects(style);
        return {
            kind: 'IMAGE',
            id: this.nextId(),
            name: nameFor(element, alt || undefined),
            rect,
            opacity: opacityOf(style),
            blendMode: blendModeOf(style),
            rotation: 0,
            sizing: { ...DEFAULT_SIZING },
            asset,
            scaleMode,
            corners,
            stroke,
            effects,
            alt,
        };
    }
    // -------------------------------------------------------------------------
    // Text
    // -------------------------------------------------------------------------
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
    textNode(element, style, rect) {
        if (!isTextContainer(element))
            return null;
        // Text the browser does not paint: `visibility: hidden` and the classic
        // image-replacement `text-indent: -9999px` both leave the glyphs out of
        // the render while keeping them in the DOM.
        if (!visibilityOf(style))
            return null;
        if ((Number.parseFloat(style.textIndent) || 0) <= -999)
            return null;
        const sample = element.textContent ?? '';
        const base = readTextStyle(style, sample);
        const content = extractText(element, base);
        if (!content)
            return null;
        this.recordFont(base.family, base.weight, base.italic);
        for (const segment of content.segments) {
            this.recordFont(segment.style.family ?? base.family, segment.style.weight ?? base.weight, segment.style.italic ?? base.italic);
        }
        const { corners } = parseCorners(style, rect.width, rect.height);
        const { stroke } = parseBorder(style);
        const { effects } = parseEffects(style);
        const background = parseBackground(style, rect, this.assets);
        const inset = contentInset(style);
        const padded = inset.top + inset.right + inset.bottom + inset.left > 0.5;
        const painted = background.paints.length > 0 || stroke !== null || effects.length > 0;
        const contentWidth = Math.max(0, round(rect.width - inset.left - inset.right));
        const contentHeight = Math.max(0, round(rect.height - inset.top - inset.bottom));
        const text = {
            kind: 'TEXT',
            id: this.nextId(),
            name: nameFor(element, content.characters),
            rect: padded
                ? {
                    // Relative to the wrapper when there is one, otherwise still
                    // relative to this element's own parent.
                    x: painted ? round(inset.left) : round(rect.x + inset.left),
                    y: painted ? round(inset.top) : round(rect.y + inset.top),
                    width: contentWidth,
                    height: contentHeight,
                }
                : rect,
            opacity: painted ? 1 : opacityOf(style),
            blendMode: painted ? 'NORMAL' : blendModeOf(style),
            rotation: 0,
            sizing: { ...DEFAULT_SIZING },
            characters: content.characters,
            base,
            segments: content.segments,
            align: readTextAlign(style),
            verticalAlign: readVerticalAlign(style),
            maxLines: readMaxLines(style),
            // Box decoration moves to the wrapper when there is one.
            fills: painted ? [] : background.paints,
            stroke: painted ? null : stroke,
            corners: painted ? [0, 0, 0, 0] : corners,
            effects: painted ? [] : effects,
        };
        if (!painted || !padded)
            return text;
        return {
            kind: 'ELEMENT',
            id: this.nextId(),
            name: nameFor(element),
            rect,
            opacity: opacityOf(style),
            blendMode: blendModeOf(style),
            rotation: 0,
            sizing: { ...DEFAULT_SIZING },
            fills: background.paints,
            stroke,
            corners,
            effects,
            clipsContent: clipsContent(style),
            layout: this.paddedWrapperLayout(inset),
            children: [text],
        };
    }
    /** Auto-layout carrying the padding, unless auto-layout is disabled. */
    paddedWrapperLayout(inset) {
        if (!this.options.autoLayout)
            return { mode: 'ABSOLUTE' };
        return {
            mode: 'VERTICAL',
            gap: 0,
            counterGap: 0,
            padding: inset,
            wrap: false,
            primaryAlign: 'MIN',
            counterAlign: 'MIN',
        };
    }
    // -------------------------------------------------------------------------
    // Generic elements
    // -------------------------------------------------------------------------
    elementNode(element, style, rect, docRect, depth) {
        const id = this.nextId();
        const transform = analyzeTransform(style.transform);
        const children = [];
        const layoutChildren = [];
        for (const child of childNodesOf(element)) {
            // A mixed-content element (`<i><b>1</b>1.41</i>`, `<a><img>Label</a>`)
            // keeps text in bare text nodes between its child elements. They are not
            // reachable through `children`, so without this branch that text
            // silently vanishes from the capture.
            if (child.nodeType === Node.TEXT_NODE) {
                const node = this.looseTextNode(child, style, docRect);
                if (!node)
                    continue;
                children.push(node);
                layoutChildren.push({ rect: node.rect, outOfFlow: false, grow: 0, stretches: false });
                continue;
            }
            const node = this.walkElement(child, docRect, depth + 1);
            if (!node)
                continue;
            children.push(node);
            const childStyle = window.getComputedStyle(child);
            layoutChildren.push({
                rect: node.rect,
                outOfFlow: isOutOfFlow(childStyle.position),
                grow: Number.parseFloat(childStyle.flexGrow) || 0,
                stretches: childStyle.alignSelf === 'stretch' || style.alignItems === 'stretch',
            });
        }
        for (const pseudo of this.pseudoNodes(element, style, rect)) {
            // Pseudo-elements paint before and after the element's own children, but
            // their geometry is approximate, so they never take part in layout
            // inference — a wrong guess there would move real content.
            children.unshift(pseudo);
            layoutChildren.length = 0;
        }
        const { layout, sizing } = inferLayout(style, layoutChildren, { width: rect.width, height: rect.height }, this.options.autoLayout && layoutChildren.length === children.length);
        for (let i = 0; i < children.length && i < sizing.length; i++) {
            children[i].sizing = sizing[i];
        }
        const background = parseBackground(style, rect, this.assets);
        for (const unsupported of background.unsupported) {
            this.warn('background.unsupported', `Could not convert background "${unsupported}"`, nameFor(element));
        }
        const { stroke, mixedColors } = parseBorder(style);
        if (mixedColors) {
            this.warn('border.mixedColors', 'Border sides use different colours; Figma supports only one stroke colour', nameFor(element));
        }
        const { corners, elliptical } = parseCorners(style, rect.width, rect.height);
        if (elliptical) {
            this.warn('corner.elliptical', 'Elliptical corner radius approximated', nameFor(element));
        }
        const { effects } = parseEffects(style);
        return {
            kind: 'ELEMENT',
            id,
            name: nameFor(element),
            rect,
            opacity: opacityOf(style),
            blendMode: blendModeOf(style),
            rotation: transform.kind === 'ROTATE' ? transform.rotation : 0,
            sizing: { ...DEFAULT_SIZING },
            fills: visibilityOf(style) ? background.paints : [],
            stroke: visibilityOf(style) ? stroke : null,
            corners,
            effects,
            clipsContent: clipsContent(style),
            layout,
            children,
        };
    }
    /**
     * A bare text node inside a mixed-content element, measured through a Range
     * — text nodes have no box of their own. Styling is inherited, so the
     * parent's computed style is the text's style.
     */
    looseTextNode(text, parentStyle, parentRect) {
        if (this.nodeCount >= this.options.maxNodes)
            return null;
        if (!visibilityOf(parentStyle))
            return null;
        if ((Number.parseFloat(parentStyle.textIndent) || 0) <= -999)
            return null;
        const characters = (text.nodeValue ?? '').replace(/\s+/g, ' ').trim();
        if (characters === '')
            return null;
        const range = document.createRange();
        range.selectNodeContents(text);
        const box = range.getBoundingClientRect();
        if (box.width < 0.5 || box.height < 0.5)
            return null;
        const rect = {
            x: round(box.left + window.scrollX - parentRect.x),
            y: round(box.top + window.scrollY - parentRect.y),
            width: round(box.width),
            height: round(box.height),
        };
        const base = readTextStyle(parentStyle, characters);
        this.recordFont(base.family, base.weight, base.italic);
        this.nodeCount++;
        return {
            kind: 'TEXT',
            id: this.nextId(),
            name: truncateName(characters),
            rect,
            opacity: 1,
            blendMode: 'NORMAL',
            rotation: 0,
            sizing: { ...DEFAULT_SIZING },
            characters,
            base,
            segments: [],
            align: 'LEFT',
            verticalAlign: 'TOP',
            maxLines: null,
            fills: [],
            stroke: null,
            corners: [0, 0, 0, 0],
            effects: [],
        };
    }
    // -------------------------------------------------------------------------
    // Pseudo-elements
    // -------------------------------------------------------------------------
    /**
     * Reconstruct `::before` and `::after`.
     *
     * These have no DOM node, so no rect can be measured for them — the geometry
     * here is derived from their computed size and the parent's padding box. It
     * is good enough for the overwhelmingly common cases (icon chips, decorative
     * bars, overlay scrims) and every one is flagged as approximate.
     */
    *pseudoNodes(element, parentStyle, parentRect) {
        for (const selector of ['::before', '::after']) {
            let style;
            try {
                style = window.getComputedStyle(element, selector);
            }
            catch {
                continue;
            }
            const content = style.content;
            if (!content || content === 'none' || content === 'normal')
                continue;
            if (style.display === 'none')
                continue;
            const width = toPixels(style.width, parentRect.width) ?? 0;
            const height = toPixels(style.height, parentRect.height) ?? 0;
            const background = parseBackground(style, { width, height }, this.assets);
            const hasPaint = background.paints.length > 0 || style.borderStyle !== 'none';
            // Text-bearing pseudo-elements would need font metrics we cannot measure;
            // only decorative boxes are reconstructed.
            if (!hasPaint || width <= 0 || height <= 0)
                continue;
            const borderLeft = toPixels(parentStyle.borderLeftWidth, 0) ?? 0;
            const borderTop = toPixels(parentStyle.borderTopWidth, 0) ?? 0;
            const isAbsolute = isOutOfFlow(style.position);
            const x = isAbsolute ? (toPixels(style.left, parentRect.width) ?? borderLeft) : borderLeft;
            const y = isAbsolute ? (toPixels(style.top, parentRect.height) ?? borderTop) : borderTop;
            const rect = { x: round(x), y: round(y), width: round(width), height: round(height) };
            const { corners } = parseCorners(style, width, height);
            const { stroke } = parseBorder(style);
            const { effects } = parseEffects(style);
            this.warn('pseudo.approximate', `${selector} reconstructed from computed styles; position is approximate`, nameFor(element));
            yield {
                kind: 'ELEMENT',
                id: this.nextId(),
                name: `${nameFor(element)}${selector}`,
                rect,
                opacity: opacityOf(style),
                blendMode: blendModeOf(style),
                rotation: 0,
                sizing: { ...DEFAULT_SIZING },
                fills: background.paints,
                stroke,
                corners,
                effects,
                clipsContent: false,
                layout: { mode: 'ABSOLUTE' },
                children: [],
            };
        }
    }
    // -------------------------------------------------------------------------
    recordFont(family, weight, italic) {
        const key = `${family}|${weight}|${italic}`;
        if (!this.fonts.has(key))
            this.fonts.set(key, { family, weight, italic });
    }
    warn(code, message, nodeName) {
        // Warnings are per-node but the UI shows them grouped; cap the raw list so
        // a page with a thousand rotated icons does not produce a thousand lines.
        if (this.warnings.length >= 500)
            return;
        this.warnings.push(nodeName ? { code, message, nodeName } : { code, message });
    }
    nextId() {
        return `n${this.idCounter++}`;
    }
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Children to walk, accounting for shadow DOM.
 *
 * Slotted light-DOM children are rendered at their `<slot>` position, so they
 * are walked through the shadow tree and skipped in the light tree — otherwise
 * every slotted element would appear twice.
 */
function childElementsOf(element) {
    if (element.shadowRoot) {
        return Array.from(element.shadowRoot.children);
    }
    if (element.tagName === 'SLOT' && 'assignedElements' in element) {
        const assigned = element.assignedElements();
        return assigned.length > 0 ? assigned : Array.from(element.children);
    }
    if (element.tagName === 'IFRAME') {
        const doc = element.contentDocument;
        return doc?.body ? [doc.body] : [];
    }
    const children = Array.from(element.children);
    // A light-DOM child assigned to a slot is drawn inside the shadow tree, not
    // here; `assignedSlot` is how the platform tells us that.
    return children.filter((child) => !child.assignedSlot);
}
/**
 * Children to walk in document order, keeping bare text nodes.
 *
 * Shadow roots, slots and iframes redirect rendering elsewhere, so for those
 * the element list is authoritative and loose text does not apply.
 */
function childNodesOf(element) {
    if (element.shadowRoot || element.tagName === 'SLOT' || element.tagName === 'IFRAME') {
        return childElementsOf(element);
    }
    const nodes = [];
    for (const node of Array.from(element.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            if ((node.nodeValue ?? '').trim() !== '')
                nodes.push(node);
            continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE)
            continue;
        if (node.assignedSlot)
            continue;
        nodes.push(node);
    }
    return nodes;
}
function truncateName(value) {
    return value.length > 40 ? `${value.slice(0, 39)}…` : value;
}
/** An element is a text container when its content is entirely inline. */
function isTextContainer(element) {
    let hasText = false;
    for (const node of Array.from(element.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            if ((node.nodeValue ?? '').trim() !== '')
                hasText = true;
            continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE)
            continue;
        const child = node;
        if (SKIPPED_TAGS.has(child.tagName))
            continue;
        if (child.tagName === 'BR')
            continue;
        const style = window.getComputedStyle(child);
        if (style.display === 'none')
            continue;
        // Any block-level or replaced child means this is a container, not a text
        // run, and its children must become separate layers.
        if (!style.display.startsWith('inline'))
            return false;
        if (child.tagName === 'IMG' || child.tagName === 'svg' || child.tagName === 'CANVAS') {
            return false;
        }
        // An inline child that paints its own box (a count badge, a highlighted
        // pill) cannot be merged into one text layer — the merge would drop its
        // background and padding. Split it into separate layers instead.
        if (paintsOwnBox(style))
            return false;
        if (!isTextContainer(child) && child.childElementCount > 0)
            return false;
        if ((child.textContent ?? '').trim() !== '')
            hasText = true;
    }
    return hasText;
}
function isSameOriginFrame(frame) {
    try {
        return frame.contentDocument !== null;
    }
    catch {
        return false;
    }
}
function isOutOfFlow(position) {
    return position === 'absolute' || position === 'fixed' || position === 'sticky';
}
function hasOwnBackground(style) {
    if (style.backgroundImage && style.backgroundImage !== 'none')
        return true;
    const color = style.backgroundColor;
    return Boolean(color) && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent';
}
function paintsOwnBox(style) {
    if (hasOwnBackground(style))
        return true;
    // `border-style` computes per side ("none solid none none" is possible).
    return (/solid|dashed|dotted|double|groove|ridge|inset|outset/.test(style.borderStyle) &&
        (Number.parseFloat(style.borderTopWidth) || 0) +
            (Number.parseFloat(style.borderRightWidth) || 0) +
            (Number.parseFloat(style.borderBottomWidth) || 0) +
            (Number.parseFloat(style.borderLeftWidth) || 0) >
            0);
}
function clipsContent(style) {
    const overflow = `${style.overflowX} ${style.overflowY}`;
    return (overflow.includes('hidden') ||
        overflow.includes('clip') ||
        overflow.includes('auto') ||
        overflow.includes('scroll'));
}
/**
 * Distance from the border box to the content box, per side.
 *
 * Figma measures a frame's padding from its edge while CSS measures content
 * from inside the border, so the border width belongs in this number.
 */
function contentInset(style) {
    const side = (name) => Math.max(0, (toPixels(style.getPropertyValue(`padding-${name}`), 0) ?? 0) +
        (toPixels(style.getPropertyValue(`border-${name}-width`), 0) ?? 0));
    return { top: side('top'), right: side('right'), bottom: side('bottom'), left: side('left') };
}
function opacityOf(style) {
    const value = Number.parseFloat(style.opacity);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}
/**
 * Detect the screen-reader-only idioms: a zero-area `clip` rect on an
 * absolutely positioned box, or a box squashed to a pixel with its overflow
 * clipped. Both hide the subtree completely in the browser, so it is dropped
 * whole. A bare 1px box with no content survives — that is how hairline
 * dividers are drawn.
 */
function isVisuallyHidden(element, style, rect) {
    if (isOutOfFlow(style.position) && /^rect\((0(?:px)?(?:,\s*|\s+)){3}0(?:px)?\)$/.test(style.clip)) {
        return true;
    }
    if ((rect.width <= 1 || rect.height <= 1) && clipsContent(style)) {
        const hasContent = element.childElementCount > 0 || (element.textContent ?? '').trim() !== '';
        if (hasContent)
            return true;
    }
    return false;
}
function visibilityOf(style) {
    return style.visibility === 'visible';
}
function blendModeOf(style) {
    return BLEND_MODES[style.mixBlendMode] ?? 'NORMAL';
}
function objectFitToScaleMode(objectFit) {
    switch (objectFit) {
        case 'contain':
        case 'scale-down':
            return 'FIT';
        case 'none':
            return 'CROP';
        default:
            return 'FILL';
    }
}
/**
 * Serialize an inline `<svg>` for `figma.createNodeFromSvg`.
 *
 * Figma's SVG importer needs explicit dimensions; many inline SVGs rely on CSS
 * for sizing and would otherwise import at their intrinsic or zero size.
 */
function serializeSvg(element, rect) {
    const clone = element.cloneNode(true);
    clone.setAttribute('width', String(Math.max(1, Math.round(rect.width))));
    clone.setAttribute('height', String(Math.max(1, Math.round(rect.height))));
    if (!clone.getAttribute('viewBox')) {
        const box = element.getAttribute('viewBox');
        if (box)
            clone.setAttribute('viewBox', box);
    }
    if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    // `currentColor` resolves against the element's computed colour, which is
    // lost once the markup leaves the page.
    const color = window.getComputedStyle(element).color;
    return clone.outerHTML.replace(/currentColor/g, color);
}
function round(value) {
    return Math.round(value * 100) / 100;
}
//# sourceMappingURL=walk.js.map