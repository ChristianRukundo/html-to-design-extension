import { fromBase64 } from './base64.js';
/**
 * Decode a `data:` URL.
 *
 * The capture side hands these straight through instead of resolving them, so
 * every host has to be able to unpack one. Both the base64 and the
 * percent-encoded forms occur in the wild — the latter mostly for inline SVG.
 */
export function decodeDataUrl(url) {
    const comma = url.indexOf(',');
    if (comma < 0)
        throw new Error('malformed data URL');
    const header = url.slice(5, comma);
    const payload = url.slice(comma + 1);
    const contentType = header.split(';')[0] ?? '';
    const bytes = header.includes('base64')
        ? fromBase64(payload)
        : new TextEncoder().encode(decodeURIComponent(payload));
    return { bytes, contentType };
}
export function looksLikeSvg(bytes) {
    const head = decodeUtf8(bytes.subarray(0, 256)).trimStart();
    return head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'));
}
export function decodeUtf8(bytes) {
    return new TextDecoder().decode(bytes);
}
//# sourceMappingURL=data-url.js.map