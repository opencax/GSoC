// ─── OpenSCAD STEP Export – Geometry Module ──────────────────────────────────
// Provides Vec3, Matrix4, Face, Solid types and all primitive constructors,
// transforms, CSG boolean mesh operations, convex hull, and linear extrude.

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
    if (values.length === 0) return [0, 0, 0];
    let sum: Vec3 = [0, 0, 0];
    for (const value of values) {
        sum = addVec3(sum, value);
    }
    return scaleVec3(sum, 1 / values.length);
}

// ─── Face / Solid helpers ────────────────────────────────────────────────────

export function cloneFace(face: Face): Face {
    return { vertices: face.vertices.map(cloneVec3) };
}

export function cloneSolid(solid: Solid): Solid {
    return { name: solid.name, faces: solid.faces.map(cloneFace) };
}

export function cloneScene(solids: Solid[]): Solid[] {
    return solids.map(cloneSolid);
}

export function faceCentroid(face: Face): Vec3 {
    return averageVec3(face.vertices);
}

export function faceNormal(face: Face): Vec3 {
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < face.vertices.length; i++) {
        const current = face.vertices[i]!;
        const next = face.vertices[(i + 1) % face.vertices.length]!;
        nx += (current[1] - next[1]) * (current[2] + next[2]);
        ny += (current[2] - next[2]) * (current[0] + next[0]);
        nz += (current[0] - next[0]) * (current[1] + next[1]);
    }
    return [nx, ny, nz];
}

export function solidCentroid(solid: Solid): Vec3 {
    const vertices: Vec3[] = [];
    for (const face of solid.faces) {
        for (const vertex of face.vertices) vertices.push(vertex);
    }
    return averageVec3(vertices);
}

export function orientSolidFacesOutward(solid: Solid): Solid {
    const centroid = solidCentroid(solid);
    return {
        name: solid.name,
        faces: solid.faces
            .filter((f) => f.vertices.length >= 3)
            .map((face) => {
                const normal = faceNormal(face);
                if (lengthVec3(normal) === 0) return cloneFace(face);
                const outward = subVec3(faceCentroid(face), centroid);
                if (dotVec3(normal, outward) >= 0) return cloneFace(face);
                return { vertices: [...face.vertices].reverse().map(cloneVec3) };
            }),
    };
}

// ─── Matrix4 helpers ─────────────────────────────────────────────────────────

export function identityMatrix4(): Matrix4 {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function multiplyMatrix4(left: Matrix4, right: Matrix4): Matrix4 {
    const v = new Array<number>(16).fill(0);
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const idx = r * 4 + c;
            for (let k = 0; k < 4; k++) {
                v[idx] = v[idx]! + left[r * 4 + k]! * right[k * 4 + c]!;
            }
        }
    }
    return v as Matrix4;
}

export function applyMatrix4(matrix: Matrix4, value: Vec3): Vec3 {
    const [x, y, z] = value;
    const tx = matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3];
    const ty = matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7];
    const tz = matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11];
    const tw = matrix[12] * x + matrix[13] * y + matrix[14] * z + matrix[15];
    if (tw === 0) throw new Error('Non-affine transformation: tw=0');
    return [tx / tw, ty / tw, tz / tw];
}

export function translationMatrix(offset: Vec3): Matrix4 {
    return [1, 0, 0, offset[0], 0, 1, 0, offset[1], 0, 0, 1, offset[2], 0, 0, 0, 1];
}

export function scalingMatrix(scale: Vec3): Matrix4 {
    return [scale[0], 0, 0, 0, 0, scale[1], 0, 0, 0, 0, scale[2], 0, 0, 0, 0, 1];
}

function degreesToRadians(angle: number): number {
    return (angle * Math.PI) / 180;
}

export function rotationXMatrix(deg: number): Matrix4 {
    const a = degreesToRadians(deg), c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
}

export function rotationYMatrix(deg: number): Matrix4 {
    const a = degreesToRadians(deg), c = Math.cos(a), s = Math.sin(a);
    return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
}

export function rotationZMatrix(deg: number): Matrix4 {
    const a = degreesToRadians(deg), c = Math.cos(a), s = Math.sin(a);
    return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function eulerRotationMatrix(angles: Vec3): Matrix4 {
    return multiplyMatrix4(
        rotationZMatrix(angles[2]),
        multiplyMatrix4(rotationYMatrix(angles[1]), rotationXMatrix(angles[0])),
    );
}

export function axisAngleRotationMatrix(deg: number, axis: Vec3): Matrix4 {
    const [x, y, z] = normalizeVec3(axis);
    const a = degreesToRadians(deg), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [
        t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0,
        t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0,
        t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0,
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
    if (rows.length !== 4 || rows.some((r) => r.length !== 4))
        throw new Error('multmatrix() expects a 4×4 matrix.');
    return [
        rows[0]![0]!, rows[0]![1]!, rows[0]![2]!, rows[0]![3]!,
        rows[1]![0]!, rows[1]![1]!, rows[1]![2]!, rows[1]![3]!,
        rows[2]![0]!, rows[2]![1]!, rows[2]![2]!, rows[2]![3]!,
        rows[3]![0]!, rows[3]![1]!, rows[3]![2]!, rows[3]![3]!,
    ];
}

// ─── Scene transforms ────────────────────────────────────────────────────────

export function transformSolid(solid: Solid, matrix: Matrix4): Solid {
    return orientSolidFacesOutward({
        name: solid.name,
        faces: solid.faces.map((f) => ({
            vertices: f.vertices.map((v) => applyMatrix4(matrix, v)),
        })),
    });
}

export function transformScene(solids: Solid[], matrix: Matrix4): Solid[] {
    return solids.map((s) => transformSolid(s, matrix));
}

// ─── Primitive constructors ──────────────────────────────────────────────────

export function createCubeSolid(name: string, size: Vec3, center: boolean): Solid {
    const [sx, sy, sz] = size;
    const min: Vec3 = center ? [-sx / 2, -sy / 2, -sz / 2] : [0, 0, 0];
    const max: Vec3 = [min[0] + sx, min[1] + sy, min[2] + sz];

    const v = (x: number, y: number, z: number): Vec3 => [x, y, z];
    const v000 = v(min[0], min[1], min[2]), v100 = v(max[0], min[1], min[2]);
    const v110 = v(max[0], max[1], min[2]), v010 = v(min[0], max[1], min[2]);
    const v001 = v(min[0], min[1], max[2]), v101 = v(max[0], min[1], max[2]);
    const v111 = v(max[0], max[1], max[2]), v011 = v(min[0], max[1], max[2]);

    return orientSolidFacesOutward({
        name,
        faces: [
            { vertices: [v000, v010, v110, v100] },   // bottom
            { vertices: [v001, v101, v111, v011] },   // top
            { vertices: [v000, v100, v101, v001] },   // front
            { vertices: [v010, v011, v111, v110] },   // back
            { vertices: [v000, v001, v011, v010] },   // left
            { vertices: [v100, v110, v111, v101] },   // right
        ],
    });
}

export function createSphereSolid(name: string, radius: number, segments: number, rings?: number): Solid {
    const seg = Math.max(3, Math.floor(segments));
    const rng = Math.max(2, rings ?? Math.floor(seg / 2));
    const faces: Face[] = [];
    const top: Vec3 = [0, 0, radius];
    const bottom: Vec3 = [0, 0, -radius];
    const latRings: Vec3[][] = [];

    for (let ri = 1; ri < rng; ri++) {
        const phi = (Math.PI * ri) / rng;
        const rr = radius * Math.sin(phi), z = radius * Math.cos(phi);
        const ring: Vec3[] = [];
        for (let si = 0; si < seg; si++) {
            const theta = (2 * Math.PI * si) / seg;
            ring.push([rr * Math.cos(theta), rr * Math.sin(theta), z]);
        }
        latRings.push(ring);
    }

    const first = latRings[0]!;
    for (let si = 0; si < seg; si++) {
        faces.push({ vertices: [top, first[si]!, first[(si + 1) % seg]!] });
    }
    for (let ri = 0; ri < latRings.length - 1; ri++) {
        const cur = latRings[ri]!, nxt = latRings[ri + 1]!;
        for (let si = 0; si < seg; si++) {
            const ni = (si + 1) % seg;
            faces.push({ vertices: [cur[si]!, cur[ni]!, nxt[ni]!] });
            faces.push({ vertices: [cur[si]!, nxt[ni]!, nxt[si]!] });
        }
    }
    const last = latRings[latRings.length - 1]!;
    for (let si = 0; si < seg; si++) {
        faces.push({ vertices: [bottom, last[(si + 1) % seg]!, last[si]!] });
    }
    return orientSolidFacesOutward({ name, faces });
}

export function createCylinderSolid(
    name: string, height: number, bottomRadius: number, topRadius: number,
    center: boolean, segments: number,
): Solid {
    const seg = Math.max(3, Math.floor(segments));
    const zMin = center ? -height / 2 : 0, zMax = zMin + height;
    const faces: Face[] = [];
    const bRing: Vec3[] = [], tRing: Vec3[] = [];

    for (let si = 0; si < seg; si++) {
        const theta = (2 * Math.PI * si) / seg;
        bRing.push([bottomRadius * Math.cos(theta), bottomRadius * Math.sin(theta), zMin]);
        tRing.push([topRadius * Math.cos(theta), topRadius * Math.sin(theta), zMax]);
    }

    if (bottomRadius > 0) faces.push({ vertices: bRing.map(cloneVec3) });
    if (topRadius > 0) faces.push({ vertices: [...tRing].reverse().map(cloneVec3) });

    const bApex: Vec3 = [0, 0, zMin], tApex: Vec3 = [0, 0, zMax];
    for (let si = 0; si < seg; si++) {
        const ni = (si + 1) % seg;
        if (bottomRadius === 0) faces.push({ vertices: [bApex, tRing[ni]!, tRing[si]!] });
        else if (topRadius === 0) faces.push({ vertices: [bRing[si]!, bRing[ni]!, tApex] });
        else faces.push({ vertices: [bRing[si]!, bRing[ni]!, tRing[ni]!, tRing[si]!] });
    }
    return orientSolidFacesOutward({ name, faces });
}

// ─── Boolean CSG operations (mesh-level approximations) ──────────────────────

/** Merge all solids into one combined shell. */
export function unionSolids(solids: Solid[], name: string): Solid {
    if (solids.length === 0) throw new Error('union() requires at least one child.');
    const allFaces: Face[] = [];
    for (const s of solids) allFaces.push(...s.faces.map(cloneFace));
    return orientSolidFacesOutward({ name, faces: allFaces });
}

/**
 * Approximate CSG difference: combines the base faces with the inverted
 * cutter faces.  This is a mesh-level approximation suitable for FACETED_BREP
 * export; a full BSP tree is tracked as future work.
 */
export function differenceSolids(solids: Solid[], name: string): Solid {
    if (solids.length === 0) throw new Error('difference() requires at least one child.');
    if (solids.length === 1) return cloneSolid({ ...solids[0]!, name });
    const allFaces: Face[] = solids[0]!.faces.map(cloneFace);
    for (const cutter of solids.slice(1)) {
        for (const f of cutter.faces) {
            allFaces.push({ vertices: [...f.vertices].reverse().map(cloneVec3) });
        }
    }
    return orientSolidFacesOutward({ name, faces: allFaces });
}

/**
 * Approximate CSG intersection: keeps faces of the first solid whose
 * centroid lies inside the AABB of every other solid.
 */
export function intersectionSolids(solids: Solid[], name: string): Solid {
    if (solids.length === 0) throw new Error('intersection() requires at least one child.');
    if (solids.length === 1) return cloneSolid({ ...solids[0]!, name });
    const bounds = solids.slice(1).map(solidAABB);
    const kept = solids[0]!.faces.filter((f) => {
        const c = faceCentroid(f);
        return bounds.every((b) => pointInsideAABB(c, b));
    });
    if (kept.length === 0) return cloneSolid({ ...solids[0]!, name });
    return orientSolidFacesOutward({ name, faces: kept.map(cloneFace) });
}

// ─── AABB helpers ────────────────────────────────────────────────────────────

interface AABB { min: Vec3; max: Vec3; }

export function solidAABB(solid: Solid): AABB {
    let mnx = Infinity, mny = Infinity, mnz = Infinity;
    let mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
    for (const f of solid.faces) {
        for (const v of f.vertices) {
            if (v[0] < mnx) mnx = v[0]; if (v[1] < mny) mny = v[1]; if (v[2] < mnz) mnz = v[2];
            if (v[0] > mxx) mxx = v[0]; if (v[1] > mxy) mxy = v[1]; if (v[2] > mxz) mxz = v[2];
        }
    }
    return { min: [mnx, mny, mnz], max: [mxx, mxy, mxz] };
}

function pointInsideAABB(p: Vec3, b: AABB): boolean {
    return p[0] >= b.min[0] && p[0] <= b.max[0] &&
           p[1] >= b.min[1] && p[1] <= b.max[1] &&
           p[2] >= b.min[2] && p[2] <= b.max[2];
}

// ─── Convex hull (3-D) ──────────────────────────────────────────────────────

/**
 * Computes the 3-D convex hull of all vertices from the input solids.
 * Uses a simplified incremental algorithm. O(n²) — fine for small meshes.
 */
export function hullSolids(solids: Solid[], name: string): Solid {
    if (solids.length === 0) throw new Error('hull() requires at least one child.');
    const points: Vec3[] = [];
    for (const s of solids) for (const f of s.faces) for (const v of f.vertices) points.push(cloneVec3(v));
    if (points.length < 4) return unionSolids(solids, name);
    const unique = deduplicateVec3(points);
    if (unique.length < 4) return unionSolids(solids, name);
    const faces = incrementalConvexHull3D(unique);
    return orientSolidFacesOutward({ name, faces });
}

function deduplicateVec3(pts: Vec3[]): Vec3[] {
    const seen = new Map<string, Vec3>();
    for (const p of pts) {
        const key = `${p[0].toFixed(9)},${p[1].toFixed(9)},${p[2].toFixed(9)}`;
        if (!seen.has(key)) seen.set(key, p);
    }
    return [...seen.values()];
}

/**
 * Incremental convex-hull algorithm: start with a tetrahedron, then add
 * each remaining point by removing visible faces and connecting new ones.
 */
function incrementalConvexHull3D(points: Vec3[]): Face[] {
    // Find 4 non-coplanar seed points.
    const [seed, rest] = findTetrahedronSeed(points);
    if (!seed) {
        // Degenerate (coplanar points) — return triangle fan.
        return [{ vertices: points.slice(0, 3) }];
    }

    type HullFace = { a: number; b: number; c: number };
    let hullFaces: HullFace[] = [
        { a: seed[0], b: seed[1], c: seed[2] },
        { a: seed[0], b: seed[2], c: seed[3] },
        { a: seed[0], b: seed[3], c: seed[1] },
        { a: seed[1], b: seed[3], c: seed[2] },
    ];

    // Orient each seed face outward from the tetrahedron centroid.
    const tetCenter = scaleVec3(
        addVec3(addVec3(points[seed[0]]!, points[seed[1]]!), addVec3(points[seed[2]]!, points[seed[3]]!)),
        0.25,
    );
    hullFaces = hullFaces.map((f) => {
        const n = triangleNormal(points[f.a]!, points[f.b]!, points[f.c]!);
        const outward = subVec3(faceCentroidOf3(points[f.a]!, points[f.b]!, points[f.c]!), tetCenter);
        if (dotVec3(n, outward) < 0) return { a: f.a, b: f.c, c: f.b };
        return f;
    });

    for (const idx of rest) {
        const p = points[idx]!;
        // Find all faces visible from p.
        const visible: boolean[] = hullFaces.map((f) => {
            const n = triangleNormal(points[f.a]!, points[f.b]!, points[f.c]!);
            return dotVec3(n, subVec3(p, points[f.a]!)) > 1e-10;
        });
        if (!visible.some(Boolean)) continue;     // inside hull

        // Collect horizon edges (edges shared with exactly one visible face).
        const edgeCount = new Map<string, { a: number; b: number; count: number }>();
        const edgeKey = (a: number, b: number) => `${Math.min(a, b)},${Math.max(a, b)}`;
        for (let fi = 0; fi < hullFaces.length; fi++) {
            if (!visible[fi]) continue;
            const f = hullFaces[fi]!;
            for (const [ea, eb] of [[f.a, f.b], [f.b, f.c], [f.c, f.a]] as [number, number][]) {
                const k = edgeKey(ea, eb);
                const entry = edgeCount.get(k);
                if (entry) entry.count++;
                else edgeCount.set(k, { a: ea, b: eb, count: 1 });
            }
        }

        // Remove visible faces.
        hullFaces = hullFaces.filter((_, fi) => !visible[fi]);

        // Add new faces connecting horizon edges to p.
        for (const [, edge] of edgeCount) {
            if (edge.count !== 1) continue;
            const newFace: HullFace = { a: edge.a, b: edge.b, c: idx };
            const n = triangleNormal(points[newFace.a]!, points[newFace.b]!, points[newFace.c]!);
            const center = faceCentroidOf3(points[newFace.a]!, points[newFace.b]!, points[newFace.c]!);
            const outward = subVec3(center, tetCenter);
            if (dotVec3(n, outward) < 0) {
                newFace.a = edge.b; newFace.b = edge.a;
            }
            hullFaces.push(newFace);
        }
    }

    return hullFaces.map((f) => ({
        vertices: [cloneVec3(points[f.a]!), cloneVec3(points[f.b]!), cloneVec3(points[f.c]!)],
    }));
}

function findTetrahedronSeed(points: Vec3[]): [[number, number, number, number], number[]] | [null, number[]] {
    const n = points.length;
    const remaining: number[] = [];
    // p0: first point. p1: farthest from p0. p2: farthest from line p0-p1.
    // p3: farthest from plane p0-p1-p2.
    const p0 = 0;
    let p1 = -1, bestDist = -1;
    for (let i = 1; i < n; i++) {
        const d = lengthVec3(subVec3(points[i]!, points[p0]!));
        if (d > bestDist) { bestDist = d; p1 = i; }
    }
    if (p1 === -1) return [null, Array.from({ length: n }, (_, i) => i)];

    const line = normalizeVec3(subVec3(points[p1]!, points[p0]!));
    let p2 = -1; bestDist = -1;
    for (let i = 0; i < n; i++) {
        if (i === p0 || i === p1) continue;
        const v = subVec3(points[i]!, points[p0]!);
        const proj = scaleVec3(line, dotVec3(v, line));
        const d = lengthVec3(subVec3(v, proj));
        if (d > bestDist) { bestDist = d; p2 = i; }
    }
    if (p2 === -1 || bestDist < 1e-10) return [null, Array.from({ length: n }, (_, i) => i)];

    const planeNormal = crossVec3(subVec3(points[p1]!, points[p0]!), subVec3(points[p2]!, points[p0]!));
    const planeLen = lengthVec3(planeNormal);
    if (planeLen < 1e-10) return [null, Array.from({ length: n }, (_, i) => i)];
    const nrm = scaleVec3(planeNormal, 1 / planeLen);

    let p3 = -1; bestDist = -1;
    for (let i = 0; i < n; i++) {
        if (i === p0 || i === p1 || i === p2) continue;
        const d = Math.abs(dotVec3(nrm, subVec3(points[i]!, points[p0]!)));
        if (d > bestDist) { bestDist = d; p3 = i; }
    }
    if (p3 === -1 || bestDist < 1e-10) return [null, Array.from({ length: n }, (_, i) => i)];

    const used = new Set([p0, p1, p2, p3]);
    for (let i = 0; i < n; i++) { if (!used.has(i)) remaining.push(i); }
    return [[p0, p1, p2, p3], remaining];
}

function triangleNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
    return crossVec3(subVec3(b, a), subVec3(c, a));
}

function faceCentroidOf3(a: Vec3, b: Vec3, c: Vec3): Vec3 {
    return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
}

// ─── 2D convex hull (for linear_extrude profile) ────────────────────────────

export function deduplicateXY(pts: [number, number][]): [number, number][] {
    const seen = new Set<string>();
    const result: [number, number][] = [];
    for (const [x, y] of pts) {
        const k = `${x.toFixed(9)},${y.toFixed(9)}`;
        if (!seen.has(k)) { seen.add(k); result.push([x, y]); }
    }
    return result;
}

/** 2-D convex hull using Andrew's monotone-chain algorithm. */
export function convexHull2D(pts: [number, number][]): [number, number][] {
    const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length <= 2) return sorted;
    const cross2d = (o: [number, number], a: [number, number], b: [number, number]) =>
        (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower: [number, number][] = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross2d(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper: [number, number][] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i]!;
        while (upper.length >= 2 && cross2d(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
        upper.push(p);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
}

// ─── Linear extrude ─────────────────────────────────────────────────────────

/**
 * Extrudes a 2D profile (points in XY) along Z by height.
 * Supports twist (in degrees) and scaling of the top profile.
 */
export function linearExtrudeProfile(
    name: string, profile2d: [number, number][], height: number,
    center: boolean, twist: number, scaleTop: number, segments: number,
): Solid {
    if (profile2d.length < 3) throw new Error('linear_extrude() profile must have ≥ 3 points.');
    if (height <= 0) throw new Error('linear_extrude() height must be positive.');

    const sliceCount = Math.max(1, twist !== 0 ? Math.max(segments, 4) : 1);
    const zBase = center ? -height / 2 : 0;
    const faces: Face[] = [];
    const n = profile2d.length;

    const sliceAt = (t: number): Vec3[] => {
        const angle = (twist * t * Math.PI) / 180;
        const sc = 1 + (scaleTop - 1) * t;
        const ct = Math.cos(angle), st = Math.sin(angle);
        const z = zBase + height * t;
        return profile2d.map(([px, py]): Vec3 => {
            const sx = px * sc, sy = py * sc;
            return [sx * ct - sy * st, sx * st + sy * ct, z];
        });
    };

    const bottom = sliceAt(0), top = sliceAt(1);
    faces.push({ vertices: [...bottom].reverse().map(cloneVec3) });
    faces.push({ vertices: top.map(cloneVec3) });

    let prev = bottom;
    for (let s = 1; s <= sliceCount; s++) {
        const cur = sliceAt(s / sliceCount);
        for (let i = 0; i < n; i++) {
            const ni = (i + 1) % n;
            faces.push({ vertices: [cloneVec3(prev[i]!), cloneVec3(prev[ni]!), cloneVec3(cur[ni]!), cloneVec3(cur[i]!)] });
        }
        prev = cur;
    }

    return orientSolidFacesOutward({ name, faces });
}

/** Regular n-gon in XY for linearExtrudeProfile(). */
export function regularPolygonProfile(radius: number, sides: number): [number, number][] {
    const n = Math.max(3, Math.floor(sides));
    const profile: [number, number][] = [];
    for (let i = 0; i < n; i++) {
        const theta = (2 * Math.PI * i) / n;
        profile.push([radius * Math.cos(theta), radius * Math.sin(theta)]);
    }
    return profile;
}
