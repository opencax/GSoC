export function cloneVec3(value) {
    return [value[0], value[1], value[2]];
}
export function cloneFace(face) {
    return {
        vertices: face.vertices.map(cloneVec3),
    };
}
export function cloneSolid(solid) {
    return {
        name: solid.name,
        faces: solid.faces.map(cloneFace),
    };
}
export function cloneScene(solids) {
    return solids.map(cloneSolid);
}
export function addVec3(left, right) {
    return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}
export function subVec3(left, right) {
    return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}
export function scaleVec3(value, scalar) {
    return [value[0] * scalar, value[1] * scalar, value[2] * scalar];
}
export function dotVec3(left, right) {
    return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}
export function crossVec3(left, right) {
    return [
        left[1] * right[2] - left[2] * right[1],
        left[2] * right[0] - left[0] * right[2],
        left[0] * right[1] - left[1] * right[0],
    ];
}
export function lengthVec3(value) {
    return Math.hypot(value[0], value[1], value[2]);
}
export function normalizeVec3(value) {
    const length = lengthVec3(value);
    if (length === 0) {
        throw new Error('Cannot normalize a zero-length vector.');
    }
    return scaleVec3(value, 1 / length);
}
export function averageVec3(values) {
    if (values.length === 0) {
        return [0, 0, 0];
    }
    let sum = [0, 0, 0];
    for (const value of values) {
        sum = addVec3(sum, value);
    }
    return scaleVec3(sum, 1 / values.length);
}
export function faceCentroid(face) {
    return averageVec3(face.vertices);
}
export function faceNormal(face) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let index = 0; index < face.vertices.length; index++) {
        const current = face.vertices[index];
        const next = face.vertices[(index + 1) % face.vertices.length];
        nx += (current[1] - next[1]) * (current[2] + next[2]);
        ny += (current[2] - next[2]) * (current[0] + next[0]);
        nz += (current[0] - next[0]) * (current[1] + next[1]);
    }
    return [nx, ny, nz];
}
export function solidCentroid(solid) {
    const vertices = [];
    for (const face of solid.faces) {
        for (const vertex of face.vertices) {
            vertices.push(vertex);
        }
    }
    return averageVec3(vertices);
}
export function orientSolidFacesOutward(solid) {
    const centroid = solidCentroid(solid);
    return {
        name: solid.name,
        faces: solid.faces
            .filter((face) => face.vertices.length >= 3)
            .map((face) => {
            const normal = faceNormal(face);
            if (lengthVec3(normal) === 0) {
                return cloneFace(face);
            }
            const faceCenter = faceCentroid(face);
            const outward = subVec3(faceCenter, centroid);
            if (dotVec3(normal, outward) >= 0) {
                return cloneFace(face);
            }
            return {
                vertices: [...face.vertices].reverse().map(cloneVec3),
            };
        }),
    };
}
export function identityMatrix4() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}
export function multiplyMatrix4(left, right) {
    const values = new Array(16).fill(0);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const index = row * 4 + col;
            for (let inner = 0; inner < 4; inner++) {
                values[index] = values[index] + left[row * 4 + inner] * right[inner * 4 + col];
            }
        }
    }
    return values;
}
export function applyMatrix4(matrix, value) {
    const x = value[0];
    const y = value[1];
    const z = value[2];
    const tx = matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3];
    const ty = matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7];
    const tz = matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11];
    const tw = matrix[12] * x + matrix[13] * y + matrix[14] * z + matrix[15];
    if (tw === 0) {
        throw new Error('Encountered a non-affine transformation with zero homogeneous coordinate.');
    }
    return [tx / tw, ty / tw, tz / tw];
}
export function translationMatrix(offset) {
    return [
        1, 0, 0, offset[0],
        0, 1, 0, offset[1],
        0, 0, 1, offset[2],
        0, 0, 0, 1,
    ];
}
export function scalingMatrix(scale) {
    return [
        scale[0], 0, 0, 0,
        0, scale[1], 0, 0,
        0, 0, scale[2], 0,
        0, 0, 0, 1,
    ];
}
function degreesToRadians(angle) {
    return (angle * Math.PI) / 180;
}
export function rotationXMatrix(angleDegrees) {
    const angle = degreesToRadians(angleDegrees);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return [
        1, 0, 0, 0,
        0, cosine, -sine, 0,
        0, sine, cosine, 0,
        0, 0, 0, 1,
    ];
}
export function rotationYMatrix(angleDegrees) {
    const angle = degreesToRadians(angleDegrees);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return [
        cosine, 0, sine, 0,
        0, 1, 0, 0,
        -sine, 0, cosine, 0,
        0, 0, 0, 1,
    ];
}
export function rotationZMatrix(angleDegrees) {
    const angle = degreesToRadians(angleDegrees);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return [
        cosine, -sine, 0, 0,
        sine, cosine, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}
export function eulerRotationMatrix(angles) {
    return multiplyMatrix4(rotationZMatrix(angles[2]), multiplyMatrix4(rotationYMatrix(angles[1]), rotationXMatrix(angles[0])));
}
export function axisAngleRotationMatrix(angleDegrees, axis) {
    const [x, y, z] = normalizeVec3(axis);
    const angle = degreesToRadians(angleDegrees);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const oneMinusCosine = 1 - cosine;
    return [
        oneMinusCosine * x * x + cosine,
        oneMinusCosine * x * y - sine * z,
        oneMinusCosine * x * z + sine * y,
        0,
        oneMinusCosine * x * y + sine * z,
        oneMinusCosine * y * y + cosine,
        oneMinusCosine * y * z - sine * x,
        0,
        oneMinusCosine * x * z - sine * y,
        oneMinusCosine * y * z + sine * x,
        oneMinusCosine * z * z + cosine,
        0,
        0, 0, 0, 1,
    ];
}
export function mirrorMatrix(normal) {
    const [x, y, z] = normalizeVec3(normal);
    return [
        1 - 2 * x * x, -2 * x * y, -2 * x * z, 0,
        -2 * y * x, 1 - 2 * y * y, -2 * y * z, 0,
        -2 * z * x, -2 * z * y, 1 - 2 * z * z, 0,
        0, 0, 0, 1,
    ];
}
export function matrixFromRows(rows) {
    if (rows.length !== 4 || rows.some((row) => row.length !== 4)) {
        throw new Error('multmatrix() expects a 4x4 matrix.');
    }
    return [
        rows[0][0], rows[0][1], rows[0][2], rows[0][3],
        rows[1][0], rows[1][1], rows[1][2], rows[1][3],
        rows[2][0], rows[2][1], rows[2][2], rows[2][3],
        rows[3][0], rows[3][1], rows[3][2], rows[3][3],
    ];
}
export function transformSolid(solid, matrix) {
    return orientSolidFacesOutward({
        name: solid.name,
        faces: solid.faces.map((face) => ({
            vertices: face.vertices.map((vertex) => applyMatrix4(matrix, vertex)),
        })),
    });
}
export function transformScene(solids, matrix) {
    return solids.map((solid) => transformSolid(solid, matrix));
}
export function createCubeSolid(name, size, center) {
    const [sx, sy, sz] = size;
    const min = center ? [-sx / 2, -sy / 2, -sz / 2] : [0, 0, 0];
    const max = [min[0] + sx, min[1] + sy, min[2] + sz];
    const v000 = [min[0], min[1], min[2]];
    const v100 = [max[0], min[1], min[2]];
    const v110 = [max[0], max[1], min[2]];
    const v010 = [min[0], max[1], min[2]];
    const v001 = [min[0], min[1], max[2]];
    const v101 = [max[0], min[1], max[2]];
    const v111 = [max[0], max[1], max[2]];
    const v011 = [min[0], max[1], max[2]];
    return orientSolidFacesOutward({
        name,
        faces: [
            { vertices: [v000, v010, v110, v100] },
            { vertices: [v001, v101, v111, v011] },
            { vertices: [v000, v100, v101, v001] },
            { vertices: [v010, v011, v111, v110] },
            { vertices: [v000, v001, v011, v010] },
            { vertices: [v100, v110, v111, v101] },
        ],
    });
}
export function createSphereSolid(name, radius, segments, rings) {
    const segmentCount = Math.max(3, Math.floor(segments));
    const ringCount = Math.max(2, rings ?? Math.floor(segmentCount / 2));
    const faces = [];
    const top = [0, 0, radius];
    const bottom = [0, 0, -radius];
    const latitudeRings = [];
    for (let ringIndex = 1; ringIndex < ringCount; ringIndex++) {
        const phi = (Math.PI * ringIndex) / ringCount;
        const ringRadius = radius * Math.sin(phi);
        const z = radius * Math.cos(phi);
        const ring = [];
        for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
            const theta = (2 * Math.PI * segmentIndex) / segmentCount;
            ring.push([
                ringRadius * Math.cos(theta),
                ringRadius * Math.sin(theta),
                z,
            ]);
        }
        latitudeRings.push(ring);
    }
    const firstRing = latitudeRings[0];
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const nextIndex = (segmentIndex + 1) % segmentCount;
        faces.push({
            vertices: [top, firstRing[segmentIndex], firstRing[nextIndex]],
        });
    }
    for (let ringIndex = 0; ringIndex < latitudeRings.length - 1; ringIndex++) {
        const currentRing = latitudeRings[ringIndex];
        const nextRing = latitudeRings[ringIndex + 1];
        for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
            const nextIndex = (segmentIndex + 1) % segmentCount;
            const a = currentRing[segmentIndex];
            const b = currentRing[nextIndex];
            const c = nextRing[nextIndex];
            const d = nextRing[segmentIndex];
            faces.push({ vertices: [a, b, c] });
            faces.push({ vertices: [a, c, d] });
        }
    }
    const lastRing = latitudeRings[latitudeRings.length - 1];
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const nextIndex = (segmentIndex + 1) % segmentCount;
        faces.push({
            vertices: [bottom, lastRing[nextIndex], lastRing[segmentIndex]],
        });
    }
    return orientSolidFacesOutward({ name, faces });
}
export function createCylinderSolid(name, height, bottomRadius, topRadius, center, segments) {
    const segmentCount = Math.max(3, Math.floor(segments));
    const zMin = center ? -height / 2 : 0;
    const zMax = zMin + height;
    const faces = [];
    const bottomRing = [];
    const topRing = [];
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const theta = (2 * Math.PI * segmentIndex) / segmentCount;
        bottomRing.push([
            bottomRadius * Math.cos(theta),
            bottomRadius * Math.sin(theta),
            zMin,
        ]);
        topRing.push([
            topRadius * Math.cos(theta),
            topRadius * Math.sin(theta),
            zMax,
        ]);
    }
    if (bottomRadius > 0) {
        faces.push({ vertices: bottomRing.map(cloneVec3) });
    }
    if (topRadius > 0) {
        faces.push({ vertices: [...topRing].reverse().map(cloneVec3) });
    }
    const bottomApex = [0, 0, zMin];
    const topApex = [0, 0, zMax];
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const nextIndex = (segmentIndex + 1) % segmentCount;
        const bottomA = bottomRing[segmentIndex];
        const bottomB = bottomRing[nextIndex];
        const topA = topRing[segmentIndex];
        const topB = topRing[nextIndex];
        if (bottomRadius === 0) {
            faces.push({ vertices: [bottomApex, topB, topA] });
        }
        else if (topRadius === 0) {
            faces.push({ vertices: [bottomA, bottomB, topApex] });
        }
        else {
            faces.push({ vertices: [bottomA, bottomB, topB, topA] });
        }
    }
    return orientSolidFacesOutward({ name, faces });
}
//# sourceMappingURL=geometry.js.map