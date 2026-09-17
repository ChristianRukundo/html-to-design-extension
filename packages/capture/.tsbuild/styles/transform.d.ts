/**
 * CSS transform analysis.
 *
 * The IR can express rotation and scale but not skew or perspective. This
 * module decides which bucket a computed transform falls into so the walker can
 * either reproduce it faithfully or fall back to rasterizing the element.
 */
export type TransformKind = 
/** Identity, or a pure translation already reflected in the measured rect. */
'NONE'
/** Rotation and/or scale — representable. */
 | 'ROTATE'
/** Skew, perspective or a mirror — not representable. */
 | 'UNSUPPORTED';
export interface TransformInfo {
    kind: TransformKind;
    /** Degrees clockwise, matching CSS. */
    rotation: number;
    scaleX: number;
    scaleY: number;
}
export declare function analyzeTransform(value: string | null | undefined): TransformInfo;
//# sourceMappingURL=transform.d.ts.map