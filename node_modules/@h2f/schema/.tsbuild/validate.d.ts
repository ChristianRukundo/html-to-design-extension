/**
 * Structural validation of a capture document.
 *
 * Hand-rolled rather than schema-library based on purpose: this module is
 * bundled into the Figma plugin, where every kilobyte is shipped to the user,
 * and the plugin needs a trustworthy answer before it starts mutating a
 * document. It checks shape and invariants the builder relies on, not every
 * field.
 */
export interface ValidationResult {
    ok: boolean;
    errors: string[];
}
export declare function validateCapture(input: unknown): ValidationResult;
//# sourceMappingURL=validate.d.ts.map