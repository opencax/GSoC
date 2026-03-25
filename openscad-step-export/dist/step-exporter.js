// ─── OpenSCAD STEP Export – STEP File Writer ─────────────────────────────────
// Converts a Solid[] scene into a valid ISO-10303-21 (AP214) STEP file string.
import { faceNormal, normalizeVec3, orientSolidFacesOutward, subVec3, dotVec3, lengthVec3, crossVec3, scaleVec3, } from './geometry.js';
// ── Internal builder ─────────────────────────────────────────────────────────
class StepBuilder {
    nextId = 1;
    lines = [];
    pointCache = new Map();
    directionCache = new Map();
    add(entity) {
        const id = this.nextId++;
        this.lines.push(`#${id}=${entity};`);
        return id;
    }
    cartesianPoint(point) {
        const key = point.map(formatNumber).join(',');
        const cached = this.pointCache.get(key);
        if (cached !== undefined)
            return cached;
        const id = this.add(`CARTESIAN_POINT('',(${point.map(formatNumber).join(',')}))`);
        this.pointCache.set(key, id);
        return id;
    }
    direction(dir) {
        const n = normalizeVec3(dir);
        const key = n.map(formatNumber).join(',');
        const cached = this.directionCache.get(key);
        if (cached !== undefined)
            return cached;
        const id = this.add(`DIRECTION('',(${n.map(formatNumber).join(',')}))`);
        this.directionCache.set(key, id);
        return id;
    }
    buildDataSection() {
        return this.lines.join('\n');
    }
}
// ── Formatting utilities ─────────────────────────────────────────────────────
function escapeStepString(value) {
    return value.replace(/'/g, "''");
}
function formatNumber(value) {
    if (!Number.isFinite(value)) {
        throw new Error(`Cannot export non-finite number ${value} to STEP.`);
    }
    const normalized = Math.abs(value) < 1e-9 ? 0 : value;
    const fixed = normalized.toFixed(6).replace(/\.?0+$/, '');
    if (fixed === '' || fixed === '-0')
        return '0.';
    return fixed.includes('.') ? fixed : `${fixed}.`;
}
function faceReferenceDirection(face, normal) {
    const origin = face.vertices[0];
    for (let i = 1; i < face.vertices.length; i++) {
        const edge = subVec3(face.vertices[i], origin);
        const projected = subVec3(edge, scaleVec3(normal, dotVec3(edge, normal)));
        if (lengthVec3(projected) > 1e-8)
            return normalizeVec3(projected);
    }
    const fallback = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const perp = crossVec3(normal, fallback);
    if (lengthVec3(perp) > 1e-8)
        return normalizeVec3(perp);
    return [0, 0, 1];
}
// ── Face / Solid exporters ───────────────────────────────────────────────────
function exportFace(builder, face) {
    if (face.vertices.length < 3)
        return null;
    const rawNormal = faceNormal(face);
    if (lengthVec3(rawNormal) < 1e-8)
        return null;
    const normal = normalizeVec3(rawNormal);
    const pointIds = face.vertices.map((v) => builder.cartesianPoint(v));
    const loopId = builder.add(`POLY_LOOP('',(${pointIds.map((id) => `#${id}`).join(',')}))`);
    const boundId = builder.add(`FACE_OUTER_BOUND('',#${loopId},.T.)`);
    const locationId = pointIds[0];
    const normalId = builder.direction(normal);
    const refDirId = builder.direction(faceReferenceDirection(face, normal));
    const placementId = builder.add(`AXIS2_PLACEMENT_3D('',#${locationId},#${normalId},#${refDirId})`);
    const planeId = builder.add(`PLANE('',#${placementId})`);
    return builder.add(`FACE_SURFACE('',(#${boundId}),#${planeId},.T.)`);
}
function exportSolid(builder, solid) {
    const oriented = orientSolidFacesOutward(solid);
    const faceIds = oriented.faces
        .map((f) => exportFace(builder, f))
        .filter((v) => v !== null);
    if (faceIds.length === 0) {
        throw new Error(`Solid "${solid.name}" has no exportable faces.`);
    }
    const shellId = builder.add(`CLOSED_SHELL('',(${faceIds.map((id) => `#${id}`).join(',')}))`);
    return builder.add(`FACETED_BREP('${escapeStepString(oriented.name)}',#${shellId})`);
}
// ── Public API ───────────────────────────────────────────────────────────────
export function exportSolidsToStep(solids, options = {}) {
    if (solids.length === 0)
        throw new Error('Cannot export an empty scene to STEP.');
    const modelName = options.modelName ?? 'OpenSCAD Model';
    const fileName = options.fileName ?? `${modelName.replace(/\s+/g, '_')}.step`;
    const author = options.author ?? 'GSoC 3D-CAD';
    const org = options.organization ?? 'OpenCAx';
    const desc = options.description ?? 'OpenSCAD faceted BREP export';
    const ts = (options.timestamp ?? new Date()).toISOString().replace(/\.\d{3}Z$/, '');
    const builder = new StepBuilder();
    const appCtx = builder.add(`APPLICATION_CONTEXT('configuration controlled 3d designs of mechanical parts and assemblies')`);
    builder.add(`APPLICATION_PROTOCOL_DEFINITION('international standard','config_control_design',1994,#${appCtx})`);
    const designCtx = builder.add(`DESIGN_CONTEXT('',#${appCtx},'design')`);
    const mechCtx = builder.add(`MECHANICAL_CONTEXT('',#${appCtx},'mechanical')`);
    const productId = builder.add(`PRODUCT('${escapeStepString(modelName)}','${escapeStepString(modelName)}','',(#${mechCtx}))`);
    const formation = builder.add(`PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE('','',#${productId},.NOT_KNOWN.)`);
    builder.add(`PRODUCT_RELATED_PRODUCT_CATEGORY('part','',(#${productId}))`);
    const prodDef = builder.add(`PRODUCT_DEFINITION('design','',#${formation},#${designCtx})`);
    const prodShape = builder.add(`PRODUCT_DEFINITION_SHAPE('','',#${prodDef})`);
    const lenUnit = builder.add(`(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.))`);
    const angUnit = builder.add(`(NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.))`);
    const solUnit = builder.add(`(NAMED_UNIT(*) SOLID_ANGLE_UNIT() SI_UNIT($,.STERADIAN.))`);
    const uncert = builder.add(`UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-6),#${lenUnit},'distance_accuracy_value','confusion accuracy')`);
    const reprCtx = builder.add(`(GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#${uncert})) ` +
        `GLOBAL_UNIT_ASSIGNED_CONTEXT((#${lenUnit},#${angUnit},#${solUnit})) ` +
        `REPRESENTATION_CONTEXT('Context #1','3D Context with UNIT and UNCERTAINTY'))`);
    const solidIds = solids.map((solid, i) => exportSolid(builder, { ...solid, name: solid.name || `Solid ${i + 1}` }));
    const reprId = builder.add(`FACETED_BREP_SHAPE_REPRESENTATION('${escapeStepString(modelName)}',` +
        `(${solidIds.map((id) => `#${id}`).join(',')}),#${reprCtx})`);
    builder.add(`SHAPE_DEFINITION_REPRESENTATION(#${prodShape},#${reprId})`);
    return [
        'ISO-10303-21;',
        'HEADER;',
        `FILE_DESCRIPTION(('${escapeStepString(desc)}'),'2;1');`,
        `FILE_NAME('${escapeStepString(fileName)}','${ts}',('${escapeStepString(author)}'),` +
            `('${escapeStepString(org)}'),'openscad-step-export','GSoC STEP exporter','');`,
        "FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));",
        'ENDSEC;',
        'DATA;',
        builder.buildDataSection(),
        'ENDSEC;',
        'END-ISO-10303-21;',
    ].join('\n');
}
//# sourceMappingURL=step-exporter.js.map