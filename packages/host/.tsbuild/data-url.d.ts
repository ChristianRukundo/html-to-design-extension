export interface RawBytes {
    bytes: Uint8Array;
    contentType: string;
}
/**
 * Decode a `data:` URL.
 *
 * The capture side hands these straight through instead of resolving them, so
 * every host has to be able to unpack one. Both the base64 and the
 * percent-encoded forms occur in the wild — the latter mostly for inline SVG.
 */
export declare function decodeDataUrl(url: string): RawBytes;
export declare function looksLikeSvg(bytes: Uint8Array): boolean;
export declare function decodeUtf8(bytes: Uint8Array): string;
//# sourceMappingURL=data-url.d.ts.map