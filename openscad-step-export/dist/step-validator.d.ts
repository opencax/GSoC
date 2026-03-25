export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    entityCount: number;
    entityTypes: Map<string, number>;
}
/**
 * Validates a STEP file string for structural correctness.
 * This is not a full conformance checker — it validates:
 *  1. Header / footer markers
 *  2. Entity reference integrity (no dangling #N references)
 *  3. Required entity types for FACETED_BREP export
 *  4. Number formatting rules
 */
export declare function validateStepFile(step: string): ValidationResult;
/** Quick boolean check for STEP validity. */
export declare function isValidStepFile(step: string): boolean;
//# sourceMappingURL=step-validator.d.ts.map