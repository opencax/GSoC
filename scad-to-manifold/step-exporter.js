import { faceNormal, normalizeVec3, orientSolidFacesOutward, scaleVec3, subVec3, dotVec3, lengthVec3, crossVec3, } from './geometry.js';
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
        if (cached !== undefined) {
            return cached;
        }
        const id = this.add(`CARTESIAN_POINT('',(${point.map(formatNumber).join(',')}))`);
        this.pointCache.set(key, id);
        return id;
    }
    direction(direction) {
        const normalized = normalizeVec3(direction);
        const key = normalized.map(formatNumber).join(',');
        const cached = this.directionCache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const id = this.add(`DIRECTION('',(${normalized.map(formatNumber).join(',')}))`);
        this.directionCache.set(key, id);
        return id;
    }
    buildDataSection() {
        return this.lines.join('\n');
    }
}
function escapeStepString(value) {
    return value.replace(/'/g, "''");
}
function formatNumber(value) {
    if (!Number.isFinite(value)) {
        throw new Error(`Cannot export non-finite number ${value} to STEP.`);
    }
    const normalized = Math.abs(value) < 1e-9 ? 0 : value;
    const fixed = normalized.toFixed(6).replace(/\.?0+$/, '');
    if (fixed === '' || fixed === '-0') {
        return '0.';
    }
    return fixed.includes('.') ? fixed : `${fixed}.`;
}
function faceReferenceDirection(face, normal) {
    const origin = face.vertices[0];
    for (let index = 1; index < face.vertices.length; index++) {
        const edge = subVec3(face.vertices[index], origin);
        const projected = subVec3(edge, scaleVec3(normal, dotVec3(edge, normal)));
        if (lengthVec3(projected) > 1e-8) {
            return normalizeVec3(projected);
        }
    }
    const fallbackAxis = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const perpendicular = crossVec3(normal, fallbackAxis);
    if (lengthVec3(perpendicular) > 1e-8) {
        return normalizeVec3(perpendicular);
    }
    return [0, 0, 1];
}
function exportFace(builder, face) {
    if (face.vertices.length < 3) {
        return null;
    }
    const rawNormal = faceNormal(face);
    if (lengthVec3(rawNormal) < 1e-8) {
        return null;
    }
    const normal = normalizeVec3(rawNormal);
    const pointIds = face.vertices.map((vertex) => builder.cartesianPoint(vertex));
    const loopId = builder.add(`POLY_LOOP('',(${pointIds.map((id) => `#${id}`).join(',')}))`);
    const boundId = builder.add(`FACE_OUTER_BOUND('',#${loopId},.T.)`);
    const locationId = pointIds[0];
    const normalId = builder.direction(normal);
    const refDirectionId = builder.direction(faceReferenceDirection(face, normal));
    const placementId = builder.add(`AXIS2_PLACEMENT_3D('',#${locationId},#${normalId},#${refDirectionId})`);
    const planeId = builder.add(`PLANE('',#${placementId})`);
    return builder.add(`FACE_SURFACE('',(#${boundId}),#${planeId},.T.)`);
}
function exportSolid(builder, solid) {
    const oriented = orientSolidFacesOutward(solid);
    const faceIds = oriented.faces
        .map((face) => exportFace(builder, face))
        .filter((value) => value !== null);
    if (faceIds.length === 0) {
        throw new Error(`Solid "${solid.name}" does not contain any exportable faces.`);
    }
    const shellId = builder.add(`CLOSED_SHELL('',(${faceIds.map((id) => `#${id}`).join(',')}))`);
    return builder.add(`FACETED_BREP('${escapeStepString(oriented.name)}',#${shellId})`);
}
export function exportSolidsToStep(solids, options = {}) {
    if (solids.length === 0) {
        throw new Error('Cannot export an empty scene to STEP.');
    }
    const modelName = options.modelName ?? 'OpenSCAD Model';
    const fileName = options.fileName ?? `${modelName.replace(/\s+/g, '_')}.step`;
    const author = options.author ?? 'OpenAI Codex';
    const organization = options.organization ?? 'GSoC 3D-CAD';
    const description = options.description ?? 'OpenSCAD faceted BREP export';
    const timestamp = (options.timestamp ?? new Date()).toISOString().replace(/\.\d{3}Z$/, '');
    const builder = new StepBuilder();
    const applicationContextId = builder.add(`APPLICATION_CONTEXT('configuration controlled 3d designs of mechanical parts and assemblies')`);
    builder.add(`APPLICATION_PROTOCOL_DEFINITION('international standard','config_control_design',1994,#${applicationContextId})`);
    const designContextId = builder.add(`DESIGN_CONTEXT('',#${applicationContextId},'design')`);
    const mechanicalContextId = builder.add(`MECHANICAL_CONTEXT('',#${applicationContextId},'mechanical')`);
    const productId = builder.add(`PRODUCT('${escapeStepString(modelName)}','${escapeStepString(modelName)}','',(#${mechanicalContextId}))`);
    const formationId = builder.add(`PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE('','',#${productId},.NOT_KNOWN.)`);
    builder.add(`PRODUCT_RELATED_PRODUCT_CATEGORY('part','',(#${productId}))`);
    const productDefinitionId = builder.add(`PRODUCT_DEFINITION('design','',#${formationId},#${designContextId})`);
    const productShapeId = builder.add(`PRODUCT_DEFINITION_SHAPE('','',#${productDefinitionId})`);
    const lengthUnitId = builder.add(`(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.))`);
    const planeAngleUnitId = builder.add(`(NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.))`);
    const solidAngleUnitId = builder.add(`(NAMED_UNIT(*) SOLID_ANGLE_UNIT() SI_UNIT($,.STERADIAN.))`);
    const uncertaintyId = builder.add(`UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-6),#${lengthUnitId},'distance_accuracy_value','confusion accuracy')`);
    const representationContextId = builder.add(`(GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#${uncertaintyId})) ` +
        `GLOBAL_UNIT_ASSIGNED_CONTEXT((#${lengthUnitId},#${planeAngleUnitId},#${solidAngleUnitId})) ` +
        `REPRESENTATION_CONTEXT('Context #1','3D Context with UNIT and UNCERTAINTY'))`);
    const solidIds = solids.map((solid, index) => exportSolid(builder, {
        ...solid,
        name: solid.name || `Solid ${index + 1}`,
    }));
    const representationId = builder.add(`FACETED_BREP_SHAPE_REPRESENTATION('${escapeStepString(modelName)}',` +
        `(${solidIds.map((id) => `#${id}`).join(',')}),#${representationContextId})`);
    builder.add(`SHAPE_DEFINITION_REPRESENTATION(#${productShapeId},#${representationId})`);
    return [
        'ISO-10303-21;',
        'HEADER;',
        `FILE_DESCRIPTION(('${escapeStepString(description)}'),'2;1');`,
        `FILE_NAME('${escapeStepString(fileName)}','${timestamp}',('${escapeStepString(author)}'),` +
            `('${escapeStepString(organization)}'),'scad-to-manifold','Codex STEP exporter','');`,
        "FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));",
        'ENDSEC;',
        'DATA;',
        builder.buildDataSection(),
        'ENDSEC;',
        'END-ISO-10303-21;',
    ].join('\n');
}
//# sourceMappingURL=step-exporter.js.map