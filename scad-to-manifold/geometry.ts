export type Vec3 = [number, number, number];

export type Matrix4 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
];

export interface Face {
    vertices: Vec3[];
}

export interface Solid {
    name: string;
    faces: Face[];
}

// ─── Vec3 helpers ────────────────────────────────────────────────────────────

export function cloneVec3(value: Vec3): Vec3 {
    return [value[0], value[1], value[2]];
}

export function cloneFace(face: Face): Face {
    return {
        vertices: face.vertices.map(cloneVec3),
    };
}

export function cloneSolid(solid: Solid): Solid {
    return {
        name: solid.name,
        faces: solid.faces.map(cloneFace),
    };
}

export function cloneScene(solids: Solid[]): Solid[] {
    return solids.map(cloneSolid);
}

export function addVec3(left: Vec3, right: Vec3): Vec3 {
    return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

export function subVec3(left: Vec3, right: Vec3): Vec3 {
    return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

export function scaleVec3(value: Vec3, scalar: number): Vec3 {
    return [value[0] * scalar, value[1] * scalar, value[2] * scalar];
}

export function dotVec3(left: Vec3, right: Vec3): number {
    return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

export function crossVec3(left: Vec3, right: Vec3): Vec3 {
    return [
        left[1] * right[2] - left[2] * right[1],
        left[2] * right[0] - left[0] * right[2],
        left[0] * right[1] - left[1] * right[0],
    ];
}

export function lengthVec3(value: Vec3): number {
    return Math.hypot(value[0], value[1], value[2]);
}

export function normalizeVec3(value: Vec3): Vec3 {
    const length = lengthVec3(value);
    if (length === 0) {
        throw new Error('Cannot normalize a zero-length vector.');
    }
    return scaleVec3(value, 1 / length);
}

export function averageVec3(values: Vec3[]): Vec3 {
    if (values.length === 0) {
        return [0, 0, 0];
    }

    let sum: Vec3 = [0, 0, 0];
    for (const value of values) {
        sum = addVec3(sum, value);
    }
    return scaleVec3(sum, 1 / values.length);
}

export function faceCentroid(face: Face): Vec3 {
    return averageVec3(face.vertices);
}

export function faceNormal(face: Face): Vec3 {
    let nx = 0;
    let ny = 0;
    let nz = 0;

    for (let index = 0; index < face.vertices.length; index++) {
        const current = face.vertices[index]!;
        const next = face.vertices[(index + 1) % face.vertices.length]!;
        nx += (current[1] - next[1]) * (current[2] + next[2]);
        ny += (current[2] - next[2]) * (current[0] + next[0]);
        nz += (current[0] - next[0]) * (current[1] + next[1]);
    }

    return [nx, ny, nz];
}

export function solidCentroid(solid: Solid): Vec3 {
    const vertices: Vec3[] = [];
    for (const face of solid.faces) {
        for (const vertex of face.vertices) {
            vertices.push(vertex);
        }
    }
    return averageVec3(vertices);
}

export function orientSolidFacesOutward(solid: Solid): Solid {
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

// ─── Matrix4 helpers ─────────────────────────────────────────────────────────

export function identityMatrix4(): Matrix4 {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

export function multiplyMatrix4(left: Matrix4, right: Matrix4): Matrix4 {
    const values = new Array<number>(16).fill(0);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const index = row * 4 + col;
            for (let inner = 0; inner < 4; inner++) {
                values[index] = values[index]! + left[row * 4 + inner]! * right[inner * 4 + col]!;
            }
        }
    }

    return values as Matrix4;
}

export function applyMatrix4(matrix: Matrix4, value: Vec3): Vec3 {
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

export function translationMatrix(offset: Vec3): Matrix4 {
    return [
        1, 0, 0, offset[0],
        0, 1, 0, offset[1],
        0, 0, 1, offset[2],
        0, 0, 0, 1,
    ];
}

export function scalingMatrix(scale: Vec3): Matrix4 {
    return [
        scale[0], 0, 0, 0,
        0, scale[1], 0, 0,
        0, 0, scale[2], 0,
        0, 0, 0, 1,
    ];
}

function degreesToRadians(angle: number): number {
    return (angle * Math.PI) / 180;
}

export function rotationXMatrix(angleDegrees: number): Matrix4 {
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

export function rotationYMatrix(angleDegrees: number): Matrix4 {
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

export function rotationZMatrix(angleDegrees: number): Matrix4 {
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

export function eulerRotationMatrix(angles: Vec3): Matrix4 {
    return multiplyMatrix4(
        rotationZMatrix(angles[2]),
        multiplyMatrix4(rotationYMatrix(angles[1]), rotationXMatrix(angles[0])),
    );
}

export function axisAngleRotationMatrix(angleDegrees: number, axis: Vec3): Matrix4 {
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

export function mirrorMatrix(normal: Vec3): Matrix4 {
    const [x, y, z] = normalizeVec3(normal);
    return [
        1 - 2 * x * x, -2 * x * y, -2 * x * z, 0,
        -2 * y * x, 1 - 2 * y * y, -2 * y * z, 0,
        -2 * z * x, -2 * z * y, 1 - 2 * z * z, 0,
        0, 0, 0, 1,
    ];
}

export function matrixFromRows(rows: number[][]): Matrix4 {
    if (rows.length !== 4 || rows.some((row) => row.length !== 4)) {
        throw new Error('multmatrix() expects a 4x4 matrix.');
    }

    return [
        rows[0]![0]!, rows[0]![1]!, rows[0]![2]!, rows[0]![3]!,
        rows[1]![0]!, rows[1]![1]!, rows[1]![2]!, rows[1]![3]!,
        rows[2]![0]!, rows[2]![1]!, rows[2]![2]!, rows[2]![3]!,
        rows[3]![0]!, rows[3]![1]!, rows[3]![2]!, rows[3]![3]!,
    ];
}

export function transformSolid(solid: Solid, matrix: Matrix4): Solid {
    return orientSolidFacesOutward({
        name: solid.name,
        faces: solid.faces.map((face) => ({
            vertices: face.vertices.map((vertex) => applyMatrix4(matrix, vertex)),
        })),
    });
}

export function transformScene(solids: Solid[], matrix: Matrix4): Solid[] {
    return solids.map((solid) => transformSolid(solid, matrix));
}

// ─── Primitive constructors ──────────────────────────────────────────────────

export function createCubeSolid(name: string, size: Vec3, center: boolean): Solid {
    const [sx, sy, sz] = size;
    const min: Vec3 = center ? [-sx / 2, -sy / 2, -sz / 2] : [0, 0, 0];
    const max: Vec3 = [min[0] + sx, min[1] + sy, min[2] + sz];

    const v000: Vec3 = [min[0], min[1], min[2]];
    const v100: Vec3 = [max[0], min[1], min[2]];
    const v110: Vec3 = [max[0], max[1], min[2]];
    const v010: Vec3 = [min[0], max[1], min[2]];
    const v001: Vec3 = [min[0], min[1], max[2]];
    const v101: Vec3 = [max[0], min[1], max[2]];
    const v111: Vec3 = [max[0], max[1], max[2]];
    const v011: Vec3 = [min[0], max[1], max[2]];

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

export function createSphereSolid(name: string, radius: number, segments: number, rings?: number): Solid {
    const segmentCount = Math.max(3, Math.floor(segments));
    const ringCount = Math.max(2, rings ?? Math.floor(segmentCount / 2));
    const faces: Face[] = [];
    const top: Vec3 = [0, 0, radius];
    const bottom: Vec3 = [0, 0, -radius];
    const latitudeRings: Vec3[][] = [];

    for (let ringIndex = 1; ringIndex < ringCount; ringIndex++) {
        const phi = (Math.PI * ringIndex) / ringCount;
        const ringRadius = radius * Math.sin(phi);
        const z = radius * Math.cos(phi);
        const ring: Vec3[] = [];

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

    const firstRing = latitudeRings[0]!;
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const nextIndex = (segmentIndex + 1) % segmentCount;
        faces.push({
            vertices: [top, firstRing[segmentIndex]!, firstRing[nextIndex]!],
        });
    }

    for (let ringIndex = 0; ringIndex < latitudeRings.length - 1; ringIndex++) {
        const currentRing = latitudeRings[ringIndex]!;
        const nextRing = latitudeRings[ringIndex + 1]!;

        for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
            const nextIndex = (segmentIndex + 1) % segmentCount;
            const a = currentRing[segmentIndex]!;
            const b = currentRing[nextIndex]!;
            const c = nextRing[nextIndex]!;
            const d = nextRing[segmentIndex]!;

            faces.push({ vertices: [a, b, c] });
            faces.push({ vertices: [a, c, d] });
        }
    }

    const lastRing = latitudeRings[latitudeRings.length - 1]!;
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const nextIndex = (segmentIndex + 1) % segmentCount;
        faces.push({
            vertices: [bottom, lastRing[nextIndex]!, lastRing[segmentIndex]!],
        });
    }

    return orientSolidFacesOutward({ name, faces });
}

export function createCylinderSolid(
    name: string,
    height: number,
    bottomRadius: number,
    topRadius: number,
    center: boolean,
    segments: number,
): Solid {
    const segmentCount = Math.max(3, Math.floor(segments));
    const zMin = center ? -height / 2 : 0;
    const zMax = zMin + height;
    const faces: Face[] = [];
    const bottomRing: Vec3[] = [];
    const topRing: Vec3[] = [];

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

    const bottomApex: Vec3 = [0, 0, zMin];
    const topApex: Vec3 = [0, 0, zMax];

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const nextIndex = (segmentIndex + 1) % segmentCount;
        const bottomA = bottomRing[segmentIndex]!;
        const bottomB = bottomRing[nextIndex]!;
        const topA = topRing[segmentIndex]!;
        const topB = topRing[nextIndex]!;

        if (bottomRadius === 0) {
            faces.push({ vertices: [bottomApex, topB, topA] });
        } else if (topRadius === 0) {
            faces.push({ vertices: [bottomA, bottomB, topApex] });
        } else {
            faces.push({ vertices: [bottomA, bottomB, topB, topA] });
        }
    }

    return orientSolidFacesOutward({ name, faces });
}

// ─── Boolean CSG operations (mesh-level approximations) ──────────────────────

/**
 * Merges the face lists of multiple solids into one combined solid.
 * This is a mesh-level union (no BSP splitting). It is valid for STEP export
 * when the solids are non-overlapping, or when the downstream STEP consumer
 * accepts open/composite shells.
 */
export function unionSolids(solids: Solid[], name: string): Solid {
    if (solids.length === 0) {
        throw new Error('union() requires at least one child solid.');
    }
    const allFaces: Face[] = [];
    for (const solid of solids) {
        allFaces.push(...solid.faces.map(cloneFace));
    }
    return orientSolidFacesOutward({ name, faces: allFaces });
}

/**
 * Approximate difference: removes faces of the base solid that are inside
 * any subtracted solid's AABB and appends the subtracted solid's faces
 * (inverted) as "caps". This gives a watertight-ish mesh for simple cases
 * and is suitable for STEP FACETED_BREP export of non-overlapping subtractions.
 *
 * For truly overlapping geometry a full BSP-based CSG is needed; that is
 * tracked as a future enhancement (see README).
 */
export function differenceSolids(solids: Solid[], name: string): Solid {
    if (solids.length === 0) {
        throw new Error('difference() requires at least one child solid.');
    }
    if (solids.length === 1) {
        return cloneSolid({ ...solids[0]!, name });
    }

    // Simple strategy: combine all faces and re-orient.  Full BSP is a
    // future improvement tracked in the prototype notes.
    const base = solids[0]!;
    const cutters = solids.slice(1);

    const allFaces: Face[] = base.faces.map(cloneFace);
    // Append the inverted cutter faces as interior caps (approximation).
    for (const cutter of cutters) {
        for (const face of cutter.faces) {
            allFaces.push({
                vertices: [...face.vertices].reverse().map(cloneVec3),
            });
        }
    }
    return orientSolidFacesOutward({ name, faces: allFaces });
}

/**
 * Approximate intersection: keeps only the faces of the first solid that
 * lie inside the AABB of all other solids.  For non-overlapping cases this
 * degenerates gracefully to the first solid.
 */
export function intersectionSolids(solids: Solid[], name: string): Solid {
    if (solids.length === 0) {
        throw new Error('intersection() requires at least one child solid.');
    }
    if (solids.length === 1) {
        return cloneSolid({ ...solids[0]!, name });
    }

    // Collect the AABB of every cutter solid after the first.
    const cutterBounds = solids.slice(1).map(solidAABB);

    const filteredFaces = solids[0]!.faces.filter((face) => {
        const centroid = faceCentroid(face);
        return cutterBounds.every((bounds) => pointInsideAABB(centroid, bounds));
    });

    if (filteredFaces.length === 0) {
        // Fall back to the full first solid when filter removes everything.
        return cloneSolid({ ...solids[0]!, name });
    }

    return orientSolidFacesOutward({ name, faces: filteredFaces.map(cloneFace) });
}

// ─── AABB helpers ────────────────────────────────────────────────────────────

interface AABB {
    min: Vec3;
    max: Vec3;
}

function solidAABB(solid: Solid): AABB {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const face of solid.faces) {
        for (const v of face.vertices) {
            if (v[0] < minX) minX = v[0];
            if (v[1] < minY) minY = v[1];
            if (v[2] < minZ) minZ = v[2];
            if (v[0] > maxX) maxX = v[0];
            if (v[1] > maxY) maxY = v[1];
            if (v[2] > maxZ) maxZ = v[2];
        }
    }

    return {
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ],
    };
}

function pointInsideAABB(point: Vec3, bounds: AABB): boolean {
    return (
        point[0] >= bounds.min[0] && point[0] <= bounds.max[0] &&
        point[1] >= bounds.min[1] && point[1] <= bounds.max[1] &&
        point[2] >= bounds.min[2] && point[2] <= bounds.max[2]
    );
}

// ─── Convex Hull ─────────────────────────────────────────────────────────────

/**
 * Compute the 3-D convex hull of all vertices in the input solids using a
 * gift-wrapping / incremental algorithm.  Returns a new Solid whose faces
 * are the hull triangles.
 *
 * This is an O(n²) implementation suitable for small point counts (< 10 000).
 * For large meshes a more sophisticated algorithm would be warranted.
 */
export function hullSolids(solids: Solid[], name: string): Solid {
    if (solids.length === 0) {
        throw new Error('hull() requires at least one child solid.');
    }

    const points: Vec3[] = [];
    for (const solid of solids) {
        for (const face of solid.faces) {
            for (const v of face.vertices) {
                points.push(cloneVec3(v));
            }
        }
    }

    if (points.length < 4) {
        // Degenerate; return the input merged.
        return unionSolids(solids, name);
    }

    const hullFaces = computeConvexHull(points);
    return orientSolidFacesOutward({ name, faces: hullFaces });
}

// Incremental convex-hull using gift-wrapping (Jarvis march in 3D).
// Returns an array of triangular faces.
function computeConvexHull(points: Vec3[]): Face[] {
    // De-duplicate points to avoid numerical issues.
    const unique = deduplicatePoints(points);
    if (unique.length < 4) {
        return [{ vertices: unique.slice(0, 3) as Vec3[] }];
    }

    const faces: Face[] = [];
    const processed = new Set<string>();

    // Find the lowest-Z, lowest-Y, lowest-X point as the starting seed.
    let seed = 0;
    for (let i = 1; i < unique.length; i++) {
        const p = unique[i]!;
        const s = unique[seed]!;
        if (p[2] < s[2] || (p[2] === s[2] && p[1] < s[1]) || (p[2] === s[2] && p[1] === s[1] && p[0] < s[0])) {
            seed = i;
        }
    }

    // BFS over the hull surface.
    type Edge = [number, number];
    const edgeQueue: Edge[] = [];

    const addFace = (ia: number, ib: number, ic: number) => {
        const key = [ia, ib, ic].sort().join(',');
        if (processed.has(key)) return;
        processed.add(key);
        faces.push({
            vertices: [cloneVec3(unique[ia]!), cloneVec3(unique[ib]!), cloneVec3(unique[ic]!)],
        });
        edgeQueue.push([ia, ib], [ib, ic], [ic, ia]);
    };

    // Find the first hull triangle anchored at seed.
    const first = findInitialHullFace(unique, seed);
    if (!first) {
        return [{ vertices: unique.slice(0, 3) as Vec3[] }];
    }
    addFace(first[0], first[1], first[2]);

    let iterations = 0;
    const maxIterations = unique.length * unique.length + 10;

    while (edgeQueue.length > 0 && iterations++ < maxIterations) {
        const edge = edgeQueue.shift()!;
        const [ia, ib] = edge;
        const nextVertex = findNextHullVertex(unique, ia!, ib!, faces);
        if (nextVertex !== -1) {
            addFace(ib!, nextVertex, ia!);
        }
    }

    return faces;
}

function deduplicatePoints(points: Vec3[]): Vec3[] {
    const seen = new Map<string, Vec3>();
    for (const p of points) {
        const key = `${p[0].toFixed(9)},${p[1].toFixed(9)},${p[2].toFixed(9)}`;
        if (!seen.has(key)) seen.set(key, p);
    }
    return [...seen.values()];
}

function findInitialHullFace(points: Vec3[], seedIdx: number): [number, number, number] | null {
    const n = points.length;
    const seed = points[seedIdx]!;

    // Find the second point: the one minimising angle with the -Y axis from seed.
    let secondIdx = -1;
    let bestDot = -2;
    const axis: Vec3 = [1, 0, 0];
    for (let i = 0; i < n; i++) {
        if (i === seedIdx) continue;
        const dir = normalizeVec3Safe(subVec3(points[i]!, seed));
        if (!dir) continue;
        const d = dotVec3(dir, axis);
        if (secondIdx === -1 || d > bestDot) {
            bestDot = d;
            secondIdx = i;
        }
    }
    if (secondIdx === -1) return null;

    // Find the third point forming the most outward-facing triangle.
    let thirdIdx = -1;
    let bestAngle = Infinity;
    for (let i = 0; i < n; i++) {
        if (i === seedIdx || i === secondIdx) continue;
        const cross = crossVec3(
            subVec3(points[secondIdx]!, seed),
            subVec3(points[i]!, seed),
        );
        const len = lengthVec3(cross);
        if (len < 1e-10) continue;
        const angle = Math.atan2(len, dotVec3(subVec3(points[secondIdx]!, seed), subVec3(points[i]!, seed)));
        if (angle < bestAngle) {
            bestAngle = angle;
            thirdIdx = i;
        }
    }
    if (thirdIdx === -1) return null;

    return [seedIdx, secondIdx, thirdIdx];
}

function findNextHullVertex(points: Vec3[], ia: number, ib: number, existingFaces: Face[]): number {
    const a = points[ia]!;
    const b = points[ib]!;
    const edgeDir = subVec3(b, a);
    let best = -1;
    let bestAngle = -1;

    // Collect normals from faces that already use this edge (in reverse direction).
    const refNormals: Vec3[] = [];
    for (const face of existingFaces) {
        const verts = face.vertices;
        for (let k = 0; k < verts.length; k++) {
            const va = verts[k]!;
            const vb = verts[(k + 1) % verts.length]!;
            if (vecEqual(va, b) && vecEqual(vb, a)) {
                const n = faceNormal(face);
                const len = lengthVec3(n);
                if (len > 1e-10) refNormals.push(scaleVec3(n, 1 / len));
            }
        }
    }
    if (refNormals.length === 0) return -1;
    const refNormal = refNormals[0]!;

    for (let i = 0; i < points.length; i++) {
        if (i === ia || i === ib) continue;
        const c = points[i]!;
        const ac = subVec3(c, a);
        const candidateNormal = crossVec3(edgeDir, ac);
        const len = lengthVec3(candidateNormal);
        if (len < 1e-10) continue;
        const normCN = scaleVec3(candidateNormal, 1 / len);

        // Choose the candidate that turns most "outward" relative to the reference face.
        const angle = Math.acos(Math.max(-1, Math.min(1, dotVec3(refNormal, normCN))));
        if (best === -1 || angle > bestAngle) {
            // Ensure all other points are on the inside half-space.
            let valid = true;
            for (let j = 0; j < points.length; j++) {
                if (j === ia || j === ib || j === i) continue;
                const dp = dotVec3(normCN, subVec3(points[j]!, a));
                if (dp > 1e-6) { valid = false; break; }
            }
            if (valid) {
                bestAngle = angle;
                best = i;
            }
        }
    }
    return best;
}

function normalizeVec3Safe(v: Vec3): Vec3 | null {
    const len = lengthVec3(v);
    if (len < 1e-12) return null;
    return scaleVec3(v, 1 / len);
}

function vecEqual(a: Vec3, b: Vec3): boolean {
    return Math.abs(a[0] - b[0]) < 1e-6 &&
        Math.abs(a[1] - b[1]) < 1e-6 &&
        Math.abs(a[2] - b[2]) < 1e-6;
}

// ─── Linear extrude ─────────────────────────────────────────────────────────

/**
 * Linearly extrudes a 2-D profile (given as an array of [x, y] points)
 * along the Z-axis by `height`.  Optionally twists by `twist` degrees
 * and applies a `scale` factor to the top profile.
 */
export function linearExtrudeProfile(
    name: string,
    profile2d: [number, number][],
    height: number,
    center: boolean,
    twist: number,
    scaleTop: number,
    segments: number,
): Solid {
    if (profile2d.length < 3) {
        throw new Error('linear_extrude() profile must have at least 3 points.');
    }
    if (height <= 0) {
        throw new Error('linear_extrude() height must be positive.');
    }

    const sliceCount = Math.max(1, twist !== 0 ? Math.max(segments, 4) : 1);
    const zBase = center ? -height / 2 : 0;
    const faces: Face[] = [];

    const getSliceProfile = (t: number): Vec3[] => {
        // t in [0,1]; twist applied cumulatively, scale interpolated.
        const twistAngle = (twist * t * Math.PI) / 180;
        const scale = 1 + (scaleTop - 1) * t;
        const cosT = Math.cos(twistAngle);
        const sinT = Math.sin(twistAngle);
        const z = zBase + height * t;
        return profile2d.map(([px, py]): Vec3 => {
            const sx = px * scale;
            const sy = py * scale;
            return [
                sx * cosT - sy * sinT,
                sx * sinT + sy * cosT,
                z,
            ];
        });
    };

    const bottom = getSliceProfile(0);
    const top = getSliceProfile(1);
    const n = profile2d.length;

    // Bottom cap (facing down, reversed winding).
    faces.push({ vertices: [...bottom].reverse().map(cloneVec3) });
    // Top cap.
    faces.push({ vertices: top.map(cloneVec3) });

    if (sliceCount === 1) {
        // Side walls.
        for (let i = 0; i < n; i++) {
            const next = (i + 1) % n;
            faces.push({
                vertices: [
                    cloneVec3(bottom[i]!),
                    cloneVec3(bottom[next]!),
                    cloneVec3(top[next]!),
                    cloneVec3(top[i]!),
                ],
            });
        }
    } else {
        // Multi-slice for twisted extrusions.
        let prevSlice = bottom;
        for (let s = 1; s <= sliceCount; s++) {
            const t = s / sliceCount;
            const curSlice = getSliceProfile(t);
            for (let i = 0; i < n; i++) {
                const next = (i + 1) % n;
                faces.push({
                    vertices: [
                        cloneVec3(prevSlice[i]!),
                        cloneVec3(prevSlice[next]!),
                        cloneVec3(curSlice[next]!),
                        cloneVec3(curSlice[i]!),
                    ],
                });
            }
            prevSlice = curSlice;
        }
    }

    return orientSolidFacesOutward({ name, faces });
}

/**
 * Builds a regular n-gon profile in the XY-plane suitable for
 * linearExtrudeProfile().
 */
export function regularPolygonProfile(radius: number, sides: number): [number, number][] {
    const n = Math.max(3, Math.floor(sides));
    const profile: [number, number][] = [];
    for (let i = 0; i < n; i++) {
        const theta = (2 * Math.PI * i) / n;
        profile.push([radius * Math.cos(theta), radius * Math.sin(theta)]);
    }
    return profile;
}
