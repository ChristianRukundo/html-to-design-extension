/**
 * Read intrinsic image dimensions straight from the file header.
 *
 * The alternative is decoding every asset in the browser, which for a
 * media-heavy page means hundreds of round trips through `page.evaluate` and a
 * base64 copy of every image in both directions. Parsing the handful of bytes
 * that actually carry the size keeps that path reserved for formats this cannot
 * read (AVIF, HEIC) and for images that genuinely need downscaling.
 *
 * Typed as `Uint8Array` rather than `Buffer` so the extension's service worker
 * can use it unchanged. A `Buffer` is a `Uint8Array`, so Node callers are
 * unaffected.
 */
export interface ImageSize {
    width: number;
    height: number;
    mimeType: string;
}
export declare function readImageSize(bytes: Uint8Array): ImageSize | null;
//# sourceMappingURL=image-size.d.ts.map