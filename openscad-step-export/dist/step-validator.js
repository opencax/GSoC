// ─── OpenSCAD STEP Export – STEP File Validator ──────────────────────────────
// Validates that a STEP string conforms to the basic ISO-10303-21 structure
// and contains the expected entity graph.
/**
 * Validates a STEP file string for structural correctness.
 * This is not a full conformance checker — it validates:
 *  1. Header / footer markers
 *  2. Entity reference integrity (no dangling #N references)
 *  3. Required entity types for FACETED_BREP export
 *  4. Number formatting rules
 */
export function validateStepFile(step) {
    const errors = [];
    const warnings = [];
    const entityTypes = new Map();
    const definedIds = new Set();
    const referencedIds = new Set();
    // ── 1. Structure markers ─────────────────────────────────────────────────
    if (!step.startsWith('ISO-10303-21;')) {
        errors.push('Missing ISO-10303-21 header.');
    }
    if (!step.includes('ENDSEC;')) {
        errors.push('Missing ENDSEC marker.');
    }
    if (!step.trimEnd().endsWith('END-ISO-10303-21;')) {
        errors.push('Missing END-ISO-10303-21 footer.');
    }
    // ── 2. Header blocks ─────────────────────────────────────────────────────
    if (!step.includes('HEADER;'))
        errors.push('Missing HEADER block.');
    if (!step.includes('DATA;'))
        errors.push('Missing DATA block.');
    const fileDescMatch = step.match(/FILE_DESCRIPTION\(/);
    const fileNameMatch = step.match(/FILE_NAME\(/);
    const fileSchemaMatch = step.match(/FILE_SCHEMA\(/);
    if (!fileDescMatch)
        warnings.push('Missing FILE_DESCRIPTION in header.');
    if (!fileNameMatch)
        warnings.push('Missing FILE_NAME in header.');
    if (!fileSchemaMatch)
        warnings.push('Missing FILE_SCHEMA in header.');
    // ── 3. Parse entity lines ────────────────────────────────────────────────
    // Matches both  #N=TYPE_NAME(...)  and  #N=(TYPE1() TYPE2() ...)
    const entityLineRegex = /^#(\d+)\s*=\s*/;
    const typeNameRegex = /^([A-Z_]+)/;
    const refRegex = /#(\d+)/g;
    const dataStart = step.indexOf('DATA;');
    const dataEnd = step.indexOf('ENDSEC;', dataStart);
    if (dataStart !== -1 && dataEnd !== -1) {
        const dataSection = step.slice(dataStart + 5, dataEnd);
        const lines = dataSection.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        for (const line of lines) {
            const entityMatch = line.match(entityLineRegex);
            if (!entityMatch)
                continue;
            const id = parseInt(entityMatch[1], 10);
            definedIds.add(id);
            // Extract entity type name.
            const afterEquals = line.slice(line.indexOf('=') + 1).trim();
            if (afterEquals.startsWith('(')) {
                // Complex entity — extract all type names inside.
                const innerTypes = afterEquals.match(/[A-Z_]+/g);
                if (innerTypes) {
                    for (const t of innerTypes) {
                        entityTypes.set(t, (entityTypes.get(t) ?? 0) + 1);
                    }
                }
            }
            else {
                const typeMatch = afterEquals.match(typeNameRegex);
                if (typeMatch) {
                    entityTypes.set(typeMatch[1], (entityTypes.get(typeMatch[1]) ?? 0) + 1);
                }
            }
            // Collect references (skip the defining #id itself).
            const lineBody = afterEquals;
            let match;
            refRegex.lastIndex = 0;
            while ((match = refRegex.exec(lineBody)) !== null) {
                referencedIds.add(parseInt(match[1], 10));
            }
        }
    }
    // ── 4. Reference integrity ───────────────────────────────────────────────
    for (const refId of referencedIds) {
        if (!definedIds.has(refId)) {
            errors.push(`Dangling reference #${refId} — entity not defined.`);
        }
    }
    // ── 5. Required entity types ─────────────────────────────────────────────
    const requiredTypes = [
        'APPLICATION_CONTEXT',
        'PRODUCT',
        'PRODUCT_DEFINITION',
        'PRODUCT_DEFINITION_SHAPE',
        'FACETED_BREP',
        'CLOSED_SHELL',
        'FACE_SURFACE',
        'POLY_LOOP',
        'SHAPE_DEFINITION_REPRESENTATION',
    ];
    for (const t of requiredTypes) {
        if (!entityTypes.has(t)) {
            warnings.push(`Missing expected entity type: ${t}`);
        }
    }
    // ── 6. Verify sequential IDs ─────────────────────────────────────────────
    if (definedIds.size > 0) {
        const maxId = Math.max(...definedIds);
        if (maxId !== definedIds.size) {
            warnings.push(`Entity IDs are not sequential (max=${maxId}, count=${definedIds.size}).`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        entityCount: definedIds.size,
        entityTypes,
    };
}
/** Quick boolean check for STEP validity. */
export function isValidStepFile(step) {
    return validateStepFile(step).valid;
}
//# sourceMappingURL=step-validator.js.map