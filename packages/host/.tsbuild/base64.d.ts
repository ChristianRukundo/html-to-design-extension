/**
 * Base64 over `Uint8Array`, implemented by hand.
 *
 * Every host has a faster native path — `Buffer` in Node, `atob`/`btoa` in a
 * browser — but they are different paths, and this package is the half of the
 * host logic that both share. Node's global `atob` is also marked legacy, so
 * reaching for it would trade a platform split for a deprecation. The cost is
 * a few tens of milliseconds per megabyte, against network fetches measured in
 * hundreds.
 */
export declare function toBase64(bytes: Uint8Array): string;
export declare function fromBase64(text: string): Uint8Array;
//# sourceMappingURL=base64.d.ts.map